// utils/pickclip.ts
// Client gọi PickClip Public API của từng Pi (base URL theo venue). Không qua backend
// trung tâm — fetch thẳng. Spec: PiTailscale/docs/API.md.
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Channel = { id: number; name: string; description: string };

export type ClipProgress = {
  out_time_sec?: number;
  fps?: number;
  speed?: number;
  size?: number;
  bitrate?: string;
};
export type ClipStatus = {
  id?: string;
  name?: string;
  status: "running" | "done" | "error";
  phase?: "init" | "fast_download" | "rtsp_fallback" | "done";
  downloaded?: number;
  expected_sec?: number;
  progress?: ClipProgress;
  size?: number;
  err?: string;
  download_url?: string;
};
export type Retention = { ttl_secs: number; ttl_human: string };

export const QUICK_MINUTES = [5, 10, 15, 30] as const;
export const MAX_CLIP_MINUTES = 30;

const trimBase = (b: string) => (b || "").replace(/\/+$/, "");

async function jfetch<T>(url: string, init?: RequestInit, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    let data: any;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok) {
      const msg = data?.error || mapStatus(res.status);
      const e: any = new Error(msg);
      e.status = res.status;
      throw e;
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

function mapStatus(code: number): string {
  if (code === 400) return "Nhập thời gian hợp lệ, tối đa 30 phút";
  if (code === 404) return "Sân không tồn tại";
  if (code === 410) return "Clip đã quá hạn, hãy cắt lại";
  if (code === 500) return "NVR tạm thời không phản hồi, thử lại sau";
  if (code === 502) return "Mất kết nối với sân, thử lại";
  return `Lỗi (${code})`;
}

// ── Endpoints ────────────────────────────────────────────────────────────────
export function thumbnailUrl(baseUrl: string, channelId: number): string {
  return `${trimBase(baseUrl)}/api/public/channels/${channelId}/thumbnail`;
}
export function clipDownloadUrl(baseUrl: string, clipId: string): string {
  return `${trimBase(baseUrl)}/clips/${clipId}`;
}

export function fetchChannels(baseUrl: string): Promise<Channel[]> {
  return jfetch<Channel[]>(`${trimBase(baseUrl)}/api/public/channels`);
}
export function fetchRetention(baseUrl: string): Promise<Retention> {
  return jfetch<Retention>(`${trimBase(baseUrl)}/api/public/retention`);
}

export type StreamSession = { session_id: string; manifest: string };
export function startStream(
  baseUrl: string,
  channelId: number,
  mode: "live" | "playback" = "live",
  range?: { start: string; end: string },
): Promise<StreamSession> {
  return jfetch<StreamSession>(`${trimBase(baseUrl)}/api/public/stream/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel_id: channelId, mode, ...(range || {}) }),
  });
}
export function stopStream(baseUrl: string, sessionId: string): Promise<any> {
  return jfetch(`${trimBase(baseUrl)}/api/public/stream/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  }, 6000).catch(() => ({}));
}
export function streamManifestUrl(baseUrl: string, s: StreamSession): string {
  return `${trimBase(baseUrl)}${s.manifest}`;
}

export type CreateClipBody =
  | { channel_id: number; quick_min: number }
  | { channel_id: number; start: string; end: string };
export function createClip(baseUrl: string, body: CreateClipBody): Promise<{ clip_id: string; name: string }> {
  return jfetch(`${trimBase(baseUrl)}/api/public/clip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
export function pollClip(baseUrl: string, clipId: string): Promise<ClipStatus> {
  return jfetch<ClipStatus>(`${trimBase(baseUrl)}/api/public/clips/${clipId}`);
}

// Ghi hình trực tiếp từ camera (Pi ghi live RTSP → MP4).
export function startRecord(baseUrl: string, channelId: number): Promise<{ record_id: string; name: string }> {
  return jfetch(`${trimBase(baseUrl)}/api/public/record/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel_id: channelId }),
  });
}
export function stopRecord(baseUrl: string, recordId: string): Promise<{ status: string; clip_id: string; name: string; size: number; download_url: string }> {
  return jfetch(`${trimBase(baseUrl)}/api/public/record/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ record_id: recordId }),
  }, 30000);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
/** Định dạng "YYYY-MM-DD HH:MM:SS" theo giờ máy (backend nhận local time của NVR). */
export function fmtClipTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** % tiến trình (ước lượng). Trả 0-99 khi đang chạy. */
export function computeProgress(s: ClipStatus): number {
  if (s.phase === "fast_download") {
    const expectedBytes = Math.max(1, (s.expected_sec || 0) * 128 * 1024);
    return Math.min(99, Math.round(((s.downloaded || 0) / expectedBytes) * 100));
  }
  if (s.phase === "rtsp_fallback") {
    const es = s.expected_sec || 0;
    return es > 0 ? Math.min(99, Math.round(((s.progress?.out_time_sec || 0) / es) * 100)) : 0;
  }
  return s.status === "done" ? 100 : 0;
}

export function humanSize(bytes?: number): string {
  if (!bytes) return "";
  const mb = bytes / 1048576;
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

// ── Lịch sử cục bộ (clip tự xoá sau ~3h trên Pi) ──────────────────────────────
export type ClipHistoryItem = {
  clipId: string;
  name: string;
  baseUrl: string;
  venueName: string;
  channelName: string;
  createdAt: number;
  size?: number;
};
const HISTORY_KEY = "pickclip_history_v1";
const HISTORY_MAX = 40;

export async function getHistory(): Promise<ClipHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const arr: ClipHistoryItem[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
export async function addHistory(item: ClipHistoryItem): Promise<void> {
  try {
    const cur = await getHistory();
    const next = [item, ...cur.filter((x) => x.clipId !== item.clipId)].slice(0, HISTORY_MAX);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* bỏ qua */
  }
}
/** Clip còn tải được không (TTL ~3h + HEAD check). */
export async function isClipAlive(item: ClipHistoryItem, ttlMs = 3 * 3600 * 1000): Promise<boolean> {
  if (Date.now() - item.createdAt > ttlMs) return false;
  try {
    const r = await fetch(clipDownloadUrl(item.baseUrl, item.clipId), { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}
