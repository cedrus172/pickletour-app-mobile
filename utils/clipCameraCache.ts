import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";
import { Image } from "react-native";
import { fetchChannels, thumbnailUrl, type Channel } from "./pickclip";

// noPhotos: quyền "chỉ xem lại" — không tải ảnh chụp camera (gần như trực tiếp), chỉ danh sách camera.
export type ClipCameraScope = { userId: string; base: string; cameras?: number[] | null; noPhotos?: boolean };
export type CameraPreview = { uri: string; file: string; previousFile?: string; fetchedAt: number; capturedAt?: number; stale?: boolean };
export type CameraPreviewState = { channels: Channel[]; previews: Record<number, CameraPreview>; errors: Record<number, string>; loading: boolean; refreshing: boolean; error: string };
const PREFIX = "pickclip-camera-previews-v1:";
const ROOT = `${FileSystem.documentDirectory || ""}clip-camera-previews-v1/`;
const FRESH_MS = 25_000;
const MAX_AGE_MS = 7 * 24 * 3600_000;
export const CAMERA_PREVIEW_INTERVAL_MS = 30_000;
const EMPTY: CameraPreviewState = { channels: [], previews: {}, errors: {}, loading: false, refreshing: false, error: "" };
type Entry = { scope: ClipCameraScope; state: CameraPreviewState; listeners: Set<() => void>; active: boolean; cleanup?: Promise<void>; hydrated?: Promise<void>; refresh?: Promise<void>; hash: Promise<string>; writes: Promise<void>; lastList: number; jobs: Map<number, Promise<void>>; cancel: Set<() => void> };
const entries = new Map<string, Entry>();
let running = 0;
const queue: (() => void)[] = [];
let pruning = false;

export function cameraScopeKey(scope: ClipCameraScope | null): string {
  if (!scope?.userId || !scope.base) return "";
  return JSON.stringify([scope.userId, scope.base.replace(/\/+$/, ""), [...new Set(scope.cameras || [])].sort((a, b) => a - b), ...(scope.noPhotos ? ["noPhotos"] : [])]);
}
export function filterPreviewChannels(channels: Channel[], cameras?: number[] | null) {
  return cameras?.length ? channels.filter((ch) => cameras.includes(ch.id)) : channels;
}
function entryFor(scope: ClipCameraScope) {
  const key = cameraScopeKey(scope);
  let e = entries.get(key);
  if (!e) {
    e = { scope, state: { ...EMPTY, loading: true }, listeners: new Set(), active: true, hash: Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key), writes: Promise.resolve(), lastList: 0, jobs: new Map(), cancel: new Set() };
    entries.set(key, e);
  }
  return e;
}
function update(e: Entry, patch: Partial<CameraPreviewState>) {
  if (!e.active) return;
  e.state = { ...e.state, ...patch };
  e.listeners.forEach((notify) => notify());
}
export function getCameraPreviewState(scope: ClipCameraScope | null) { return scope ? entryFor(scope).state : EMPTY; }
export function subscribeCameraPreviews(scope: ClipCameraScope | null, notify: () => void) {
  if (!scope) return () => {};
  const e = entryFor(scope); e.listeners.add(notify);
  return () => { e.listeners.delete(notify); };
}
function fileUri(hash: string, file: string) { return `${ROOT}${hash}/${file}`; }
const validFile = (file: unknown): file is string => typeof file === "string" && /^[a-zA-Z0-9.-]+\.jpg$/.test(file);
async function persist(e: Entry) {
  e.writes = e.writes.catch(() => {}).then(async () => {
    if (!e.active) return;
    const hash = await e.hash;
    const previews = Object.fromEntries(Object.entries(e.state.previews).map(([id, { uri: _uri, ...preview }]) => [id, preview]));
    await AsyncStorage.setItem(PREFIX + hash, JSON.stringify({ hash, updatedAt: Date.now(), channels: e.state.channels, previews }));
  });
  return e.writes;
}
async function prune() {
  if (pruning) return; pruning = true;
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(PREFIX));
    const values = (await AsyncStorage.multiGet(keys)).map(([key, value]) => { try { return { key, data: JSON.parse(value || "{}") }; } catch { return { key, data: {} }; } }).sort((a, b) => (b.data.updatedAt || 0) - (a.data.updatedAt || 0));
    const active = new Set(await Promise.all([...entries.values()].filter((e) => e.listeners.size || e.refresh || e.jobs.size).map((e) => e.hash)));
    for (let i = 0; i < values.length; i++) {
      const { key, data } = values[i];
      if (active.has(data.hash) || (i < 8 && Date.now() - data.updatedAt < MAX_AGE_MS)) continue;
      await AsyncStorage.removeItem(key);
      if (/^[a-f0-9]{64}$/.test(data.hash)) await FileSystem.deleteAsync(`${ROOT}${data.hash}/`, { idempotent: true });
    }
  } catch { /* Cache không được chặn camera khi dung lượng/thư mục lỗi. */ }
  finally { pruning = false; }
}
export function hydrateCameraPreviews(scope: ClipCameraScope): Promise<void> {
  const e = entryFor(scope);
  if (e.hydrated) return e.hydrated;
  e.hydrated = (async () => {
    try {
      const hash = await e.hash;
      const raw = await AsyncStorage.getItem(PREFIX + hash);
      if (!raw || !e.active) return;
      const saved = JSON.parse(raw);
      if (saved.hash !== hash || !Number.isFinite(saved.updatedAt) || Date.now() - saved.updatedAt > MAX_AGE_MS || !Array.isArray(saved.channels)) return;
      const channels = filterPreviewChannels(saved.channels.filter((ch: Channel) => ch && Number.isInteger(ch.id) && typeof ch.name === "string"), scope.cameras);
      const previews: Record<number, CameraPreview> = {};
      await Promise.all(channels.map(async (ch: Channel) => {
        const p = saved.previews?.[ch.id];
        if (!p || !validFile(p.file) || !Number.isFinite(p.fetchedAt)) return;
        const uri = fileUri(hash, p.file), info = await FileSystem.getInfoAsync(uri);
        if (info.exists && (!('size' in info) || info.size > 0)) previews[ch.id] = { file: p.file, fetchedAt: p.fetchedAt, capturedAt: Number.isFinite(p.capturedAt) ? p.capturedAt : undefined, stale: p.stale === true, previousFile: validFile(p.previousFile) ? p.previousFile : undefined, uri };
      }));
      if (e.active) update(e, { channels, previews, loading: false });
    } catch { /* Bỏ cache hỏng, vẫn tải dữ liệu mới. */ }
    finally { void prune(); }
  })();
  return e.hydrated;
}
async function limited<T>(work: () => Promise<T>): Promise<T> {
  if (running >= 2) await new Promise<void>((resolve) => queue.push(resolve));
  else running++;
  try { return await work(); }
  finally { const next = queue.shift(); if (next) next(); else running--; }
}
export function cameraCapturedAt(headers: Record<string, string>): number | undefined {
  const h = Object.fromEntries(Object.entries(headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
  const timestamp = Date.parse(h["x-snapshot-captured-at"] || h["last-modified"] || "");
  return Number.isFinite(timestamp) && timestamp > 0 && timestamp <= Date.now() + 300_000 ? timestamp : undefined;
}
async function refreshPhoto(e: Entry, ch: Channel, force: boolean) {
  if (e.scope.noPhotos) return;
  if (e.jobs.has(ch.id)) return e.jobs.get(ch.id);
  if (!force && Date.now() - (e.state.previews[ch.id]?.fetchedAt || 0) < FRESH_MS) return;
  const job = limited(async () => {
    if (!e.active) return;
    const hash = await e.hash;
    const file = `${ch.id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
    const uri = fileUri(hash, file), temporary = `${uri}.part`;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancel: (() => void) | undefined;
    try {
      if (!FileSystem.documentDirectory) throw new Error("Không có thư mục lưu ảnh");
      await FileSystem.makeDirectoryAsync(`${ROOT}${hash}/`, { intermediates: true });
      const download = FileSystem.createDownloadResumable(`${thumbnailUrl(e.scope.base, ch.id)}?t=${Math.floor(Date.now() / 30_000)}`, temporary, { cache: false, sessionType: FileSystem.FileSystemSessionType.FOREGROUND });
      cancel = () => { void download.cancelAsync().catch(() => {}); }; e.cancel.add(cancel);
      const result = await Promise.race([download.downloadAsync(), new Promise<never>((_, reject) => { timeout = setTimeout(() => { cancel?.(); reject(new Error("Quá thời gian tải ảnh")); }, 12_000); })]);
      if (!result || result.status !== 200) throw new Error("Chưa lấy được ảnh camera");
      const mime = result.mimeType || Object.entries(result.headers || {}).find(([key]) => key.toLowerCase() === "content-type")?.[1] || "";
      if (mime && !/^image\//i.test(mime)) throw new Error("Ảnh camera không hợp lệ");
      await new Promise<void>((resolve, reject) => {
        const decodeTimeout = setTimeout(() => reject(new Error("Không đọc được ảnh")), 5000);
        Image.getSize(temporary, (width, height) => { clearTimeout(decodeTimeout); if (width > 0 && height > 0) resolve(); else reject(new Error("Ảnh rỗng")); }, (error) => { clearTimeout(decodeTimeout); reject(error); });
      });
      if (!e.active || !e.state.channels.some((c) => c.id === ch.id)) return;
      await FileSystem.moveAsync({ from: temporary, to: uri });
      const old = e.state.previews[ch.id], errors = { ...e.state.errors }; delete errors[ch.id];
      const stale = Object.entries(result.headers || {}).some(([key, value]) => key.toLowerCase() === "x-snapshot-stale" && value.toLowerCase() === "true");
      update(e, { previews: { ...e.state.previews, [ch.id]: { uri, file, previousFile: old?.file, fetchedAt: Date.now(), capturedAt: cameraCapturedAt(result.headers), stale } }, errors });
      await persist(e).catch(() => {});
      if (validFile(old?.previousFile)) await FileSystem.deleteAsync(fileUri(hash, old.previousFile), { idempotent: true });
    } catch {
      update(e, { errors: { ...e.state.errors, [ch.id]: "Chưa lấy được ảnh mới" } });
    } finally {
      clearTimeout(timeout); if (cancel) e.cancel.delete(cancel);
      await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => {});
    }
  }).finally(() => { e.jobs.delete(ch.id); });
  e.jobs.set(ch.id, job); return job;
}
export async function refreshCameraPreviews(scope: ClipCameraScope, force = false, prefetchLimit?: number): Promise<void> {
  const previous = entries.get(cameraScopeKey(scope));
  if (previous && !previous.active) {
    await previous.cleanup;
    if (entries.get(cameraScopeKey(scope)) === previous && !previous.active) {
      previous.active = true; previous.cleanup = undefined; previous.hydrated = undefined;
      previous.lastList = 0; previous.refresh = undefined;
      update(previous, { ...EMPTY, loading: true });
    }
  }
  const e = entryFor(scope);
  if (e.refresh) {
    await e.refresh;
    // Trang mở trong lúc prefetch: tải tiếp các camera còn lại, không tải trùng ảnh vừa có.
    if (prefetchLimit === undefined && e.active) await Promise.allSettled(e.state.channels.map((ch) => refreshPhoto(e, ch, false)));
    return;
  }
  e.refresh = (async () => {
    await hydrateCameraPreviews(scope);
    if (!e.active) return;
    update(e, { refreshing: true, error: "" });
    try {
      if (force || Date.now() - e.lastList >= 60_000) {
        const list = await fetchChannels(scope.base);
        if (!e.active) return;
        if (!Array.isArray(list)) throw new Error("Danh sách camera không hợp lệ");
        const channels = filterPreviewChannels(list.filter((ch) => ch && Number.isInteger(ch.id) && typeof ch.name === "string"), scope.cameras);
        const previews = Object.fromEntries(Object.entries(e.state.previews).filter(([id]) => channels.some((ch) => ch.id === Number(id))));
        update(e, { channels, previews, loading: false }); e.lastList = Date.now(); await persist(e).catch(() => {});
      }
      await Promise.allSettled(e.state.channels.slice(0, prefetchLimit ?? e.state.channels.length).map((ch) => refreshPhoto(e, ch, force)));
    } catch (error) {
      update(e, { error: error instanceof Error ? error.message : "Không tải được danh sách camera" });
    } finally { update(e, { loading: false, refreshing: false }); }
  })().finally(() => { e.refresh = undefined; });
  return e.refresh;
}
export async function invalidateCameraPreviews(scope: ClipCameraScope) {
  const key = cameraScopeKey(scope), e = entries.get(key);
  if (!e) return;
  if (e.cleanup) return e.cleanup;
  e.active = false; e.state = { ...EMPTY }; e.listeners.forEach((notify) => notify());
  e.cancel.forEach((cancel) => cancel());
  e.cleanup = (async () => {
    await Promise.allSettled([...e.jobs.values()]);
    await e.refresh?.catch(() => {});
    await e.writes.catch(() => {});
    const hash = await e.hash;
    await AsyncStorage.removeItem(PREFIX + hash).catch(() => {});
    await FileSystem.deleteAsync(`${ROOT}${hash}/`, { idempotent: true }).catch(() => {});
  })();
  return e.cleanup;
}

/** Chỉ giữ các scope còn được API trung tâm cấp quyền; không tái sử dụng ảnh giữa tài khoản. */
export function retainCameraPreviewScopes(scopes: ClipCameraScope[]) {
  const allowed = new Set(scopes.map(cameraScopeKey));
  for (const [key, e] of entries) if (e.active && !allowed.has(key)) void invalidateCameraPreviews(e.scope);
}
