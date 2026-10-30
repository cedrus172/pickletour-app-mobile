// app/clip-cam/cut.tsx — xem trực tiếp + cắt clip 1 camera (PickClip).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { setAudioModeAsync } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { useResponsive } from "@/hooks/useResponsive";
import {
  addHistory,
  clipDownloadUrl,
  computeProgress,
  createClip,
  fetchRetention,
  fmtClipTime,
  getHistory,
  humanSize,
  isClipAlive,
  MAX_CLIP_MINUTES,
  MAX_RANGE_MINUTES,
  pollClip,
  quickLabel,
  QUICK_SECONDS,
  splitRange,
  startRecord,
  stopRecord,
  startStream,
  stopStream,
  streamManifestUrl,
  thumbnailUrl,
  type ClipHistoryItem,
  type ClipStatus,
  type StreamSession,
} from "@/utils/pickclip";

// Lưu vào album cần module native expo-media-library. Bản app cũ (chỉ nhận OTA) chưa
// có native module → require lỗi → MediaLibrary=null → tự fallback sang share sheet.
let MediaLibrary: any = null;
try { MediaLibrary = require("expo-media-library"); } catch { /* bản chưa build native */ }

/** Trình phát HLS (expo-video). Tách riêng vì useVideoPlayer là hook top-level. */
function LivePreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
    p.play();
  });
  // Phát tiếng cả khi iPhone bật gạt im lặng (nếu không sẽ không nghe thấy).
  useEffect(() => { setAudioModeAsync({ playsInSilentMode: true }).catch(() => {}); }, []);
  return (
    <VideoView
      player={player}
      style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: "#000" }}
      nativeControls
      contentFit="contain"
    />
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const hhmm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const hhmmss = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Dòng thời gian kéo-tua + chụm-để-zoom (như DMSS). */
function Timeline({
  C, winStart, winMs, scrubTime, onScrub, onCommit, onZoom,
}: {
  C: ThemeTokens; winStart: Date; winMs: number; scrubTime: Date;
  onScrub: (t: Date) => void; onCommit: (t: Date) => void;
  onZoom: (centerMs: number, newMs: number) => void;
}) {
  const [w, setW] = useState(0);
  const wRef = useRef(0);
  const winRef = useRef({ s: winStart.getTime(), ms: winMs });
  winRef.current = { s: winStart.getTime(), ms: winMs };
  const onScrubRef = useRef(onScrub); onScrubRef.current = onScrub;
  const onCommitRef = useRef(onCommit); onCommitRef.current = onCommit;
  const onZoomRef = useRef(onZoom); onZoomRef.current = onZoom;
  const baseRef = useRef({ ms: winMs, center: winStart.getTime() + winMs / 2 });

  const xToTimeMs = (x: number) => {
    const ww = Math.max(1, wRef.current);
    return winRef.current.s + (clampN(x, 0, ww) / ww) * winRef.current.ms;
  };
  const timeToX = (t: Date) => {
    if (w <= 0) return 0;
    return clampN(((t.getTime() - winStart.getTime()) / winMs) * w, 0, w);
  };

  const doScrub = (x: number, commit: boolean) => {
    const t = new Date(xToTimeMs(x));
    onScrubRef.current(t);
    if (commit) onCommitRef.current(t);
  };
  const pinchBegin = () => { baseRef.current = { ms: winRef.current.ms, center: winRef.current.s + winRef.current.ms / 2 }; };
  const pinchUpdate = (scale: number) => { onZoomRef.current(baseRef.current.center, baseRef.current.ms / (scale || 1)); };

  const panG = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .onUpdate((e) => runOnJS(doScrub)(e.x, false))
    .onEnd((e) => runOnJS(doScrub)(e.x, true));
  const tapG = Gesture.Tap().maxDuration(400).onEnd((e) => runOnJS(doScrub)(e.x, true));
  const pinchG = Gesture.Pinch()
    .onBegin(() => runOnJS(pinchBegin)())
    .onUpdate((e) => runOnJS(pinchUpdate)(e.scale));
  const gesture = Gesture.Simultaneous(pinchG, Gesture.Race(panG, tapG));

  // Vạch thời gian: theo giờ nếu cửa sổ rộng, theo 10 phút nếu zoom sâu.
  const stepMs = winMs <= 30 * 60000 ? 5 * 60000 : winMs <= 90 * 60000 ? 10 * 60000 : 3600000;
  const ticks: Date[] = [];
  const first = Math.ceil(winStart.getTime() / stepMs) * stepMs;
  for (let t = first; t <= winStart.getTime() + winMs; t += stepMs) ticks.push(new Date(t));

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={(e) => { const width = e.nativeEvent.layout.width; wRef.current = width; setW(width); }}
        style={{ height: 72, borderRadius: 12, borderWidth: 1, overflow: "hidden", backgroundColor: C.field, borderColor: C.border }}
      >
        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: timeToX(scrubTime), backgroundColor: C.primarySoft }} />
        {ticks.map((tk) => {
          const x = timeToX(tk);
          return (
            <View key={+tk} style={{ position: "absolute", top: 0, bottom: 0, left: x, width: 1, alignItems: "center" }} pointerEvents="none">
              <View style={{ position: "absolute", top: 0, width: 1, height: 10, backgroundColor: C.line }} />
              <Text style={{ position: "absolute", bottom: 6, fontSize: 10, width: 44, textAlign: "center", marginLeft: -22, color: C.muted }}>{hhmm(tk)}</Text>
            </View>
          );
        })}
        <View style={{ position: "absolute", top: 0, bottom: 0, left: timeToX(scrubTime), width: 2.5, marginLeft: -1.25, backgroundColor: C.primary }} pointerEvents="none" />
      </View>
    </GestureDetector>
  );
}

type Phase = "idle" | "creating" | "running" | "done" | "error";

export default function ClipCutScreen() {
  const C = useThemeTokens();
  const styles = useMemo(() => mkStyles(C), [C]);
  const rsp = useResponsive();
  const { base, venueName, chId, chName } = useLocalSearchParams<{
    base: string; venueName: string; chId: string; chName: string;
  }>();
  const baseUrl = String(base || "");
  const channelId = Number(chId || 0);
  const channelName = String(chName || "Sân");

  // ── Xem trước (live / phát lại đoạn cắt) ────────────────────────────────────
  const [manifest, setManifest] = useState<string>("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewMode, setPreviewMode] = useState<"live" | "playback">("live");
  const streamRef = useRef<StreamSession | null>(null);

  const startPreview = useCallback(async () => {
    if (manifest || previewBusy) return;
    setPreviewBusy(true);
    try {
      const s = await startStream(baseUrl, channelId, "live");
      streamRef.current = s;
      setPreviewMode("live");
      setManifest(streamManifestUrl(baseUrl, s));
    } catch (e: any) {
      Alert.alert("Không xem được", e?.message || "Camera tạm thời không phản hồi.");
    } finally {
      setPreviewBusy(false);
    }
  }, [baseUrl, channelId, manifest, previewBusy]);

  const stopPreview = useCallback(() => {
    const s = streamRef.current;
    streamRef.current = null;
    setManifest("");
    if (s) stopStream(baseUrl, s.session_id);
  }, [baseUrl]);

  // Dừng session stream khi rời màn (tiết kiệm CPU Pi).
  useEffect(() => () => {
    const s = streamRef.current;
    if (s) stopStream(baseUrl, s.session_id);
  }, [baseUrl]);

  // ── Chọn khoảng cắt ───────────────────────────────────────────────────────
  const [quickSec, setQuickSec] = useState<number>(300); // mặc định 5 phút
  const [useCustom, setUseCustom] = useState(false);
  const [start, setStart] = useState<Date>(() => new Date(Date.now() - 5 * 60 * 1000));
  const [end, setEnd] = useState<Date>(() => new Date());
  const [picker, setPicker] = useState<null | "start" | "end">(null);

  const customMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const customParts = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (MAX_CLIP_MINUTES * 60000)));
  const customValid = useCustom ? end > start && customMinutes <= MAX_RANGE_MINUTES : true;
  // Thông báo cụ thể lý do (tránh gộp chung gây khó hiểu).
  const customMsg = !useCustom
    ? ""
    : end <= start
      ? "Giờ kết thúc phải sau giờ bắt đầu."
      : customMinutes > MAX_RANGE_MINUTES
        ? `Khoảng cắt ${customMinutes} phút — tối đa ${MAX_RANGE_MINUTES} phút, hãy chọn ngắn lại.`
        : customParts > 1
          ? `Độ dài ${customMinutes} phút — sẽ chia thành ${customParts} file, mỗi file tối đa ${MAX_CLIP_MINUTES} phút.`
          : `Độ dài: ${customMinutes} phút`;

  // Khoảng thời gian đang chọn → {start,end} dạng chuỗi cho API (dùng để xem trước).
  const selectedRange = useCallback(() => {
    if (useCustom) return { start: fmtClipTime(start), end: fmtClipTime(end) };
    const now = new Date();
    return { start: fmtClipTime(new Date(now.getTime() - quickSec * 1000)), end: fmtClipTime(now) };
  }, [useCustom, start, end, quickSec]);

  // Xem trước (phát lại) đoạn sắp cắt — tua được để kiểm tra đúng đoạn rồi mới cắt.
  const startRangePreview = useCallback(async () => {
    if (useCustom && !customValid) { Alert.alert("Thời gian không hợp lệ", customMsg); return; }
    if (previewBusy) return;
    const prev = streamRef.current;
    streamRef.current = null;
    setManifest("");
    if (prev) stopStream(baseUrl, prev.session_id);
    setPreviewBusy(true);
    try {
      const s = await startStream(baseUrl, channelId, "playback", selectedRange());
      streamRef.current = s;
      setPreviewMode("playback");
      setManifest(streamManifestUrl(baseUrl, s));
    } catch (e: any) {
      Alert.alert("Không xem trước được", e?.message || "Không phát lại được đoạn này.");
    } finally {
      setPreviewBusy(false);
    }
  }, [useCustom, customValid, customMsg, previewBusy, baseUrl, channelId, selectedRange]);

  // ── Dòng thời gian (tua như DMSS) ───────────────────────────────────────────
  const TL_MIN_MS = 5 * 60 * 1000;        // zoom tối đa: cửa sổ 5 phút
  const TL_MAX_MS = 12 * 60 * 60 * 1000;  // zoom tối thiểu: 12 giờ
  const [winMs, setWinMs] = useState<number>(3 * 60 * 60 * 1000); // cửa sổ 3 giờ
  const [winStart, setWinStart] = useState<Date>(() => new Date(Date.now() - 3 * 60 * 60 * 1000));
  const [scrubTime, setScrubTime] = useState<Date>(() => new Date(Date.now() - 5 * 60000));

  // Zoom (pinch) → đổi độ rộng cửa sổ, giữ tâm.
  const onZoom = useCallback((centerMs: number, newMs: number) => {
    const ms = Math.max(TL_MIN_MS, Math.min(TL_MAX_MS, newMs));
    const maxStart = Date.now() - ms * 0.5;
    setWinMs(ms);
    setWinStart(new Date(Math.min(centerMs - ms / 2, maxStart)));
  }, []);

  const startPlaybackAt = useCallback(async (t: Date) => {
    if (t.getTime() > Date.now()) t = new Date(Date.now() - 1000);
    const prev = streamRef.current;
    streamRef.current = null;
    setManifest("");
    if (prev) stopStream(baseUrl, prev.session_id);
    setPreviewBusy(true);
    try {
      const endT = new Date(Math.min(t.getTime() + 30 * 60000, Date.now()));
      const end = endT.getTime() > t.getTime() + 60000 ? endT : new Date(t.getTime() + 60000);
      const s = await startStream(baseUrl, channelId, "playback", { start: fmtClipTime(t), end: fmtClipTime(end) });
      streamRef.current = s;
      setPreviewMode("playback");
      setManifest(streamManifestUrl(baseUrl, s));
    } catch (e: any) {
      Alert.alert("Không phát lại được", e?.message || "Không có dữ liệu ghi ở thời điểm này.");
    } finally {
      setPreviewBusy(false);
    }
  }, [baseUrl, channelId]);

  const shiftWin = useCallback((frac: number) => {
    setWinStart((w) => {
      const next = w.getTime() + winMs * frac;
      const maxStart = Date.now() - winMs * 0.5; // không trôi quá tương lai
      return new Date(Math.min(next, maxStart));
    });
  }, [winMs]);

  // ── Cắt + poll ───────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("idle");
  const [pct, setPct] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [results, setResults] = useState<{ clipId: string; name: string; size?: number }[]>([]);
  const pollingRef = useRef<{ stop: boolean }>({ stop: false });
  const lastCutRef = useRef(0);
  const [retentionHuman, setRetentionHuman] = useState("");

  useEffect(() => {
    fetchRetention(baseUrl).then((r) => setRetentionHuman(r.ttl_human || "")).catch(() => {});
    return () => { pollingRef.current.stop = true; };
  }, [baseUrl]);

  // Cắt 1 đoạn (≤5 phút) → tạo clip + poll tới khi xong. Trả về kết quả hoặc ném lỗi.
  const cutOneSegment = useCallback(async (
    seg: { start: Date; end: Date }, idx: number, total: number,
  ): Promise<{ clipId: string; name: string; size?: number }> => {
    const prefix = total > 1 ? `File ${idx}/${total} · ` : "";
    const { clip_id, name } = await createClip(baseUrl, {
      channel_id: channelId, start: fmtClipTime(seg.start), end: fmtClipTime(seg.end),
    });
    const deadline = Date.now() + 20 * 60 * 1000; // timeout 20 phút / file
    // Vòng poll 1.5s.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (pollingRef.current.stop) throw new Error("__stop__");
      if (Date.now() > deadline) throw new Error("Quá thời gian xử lý, thử lại.");
      await new Promise((r) => setTimeout(r, 1500));
      let s: ClipStatus;
      try { s = await pollClip(baseUrl, clip_id); } catch { continue; }
      if (s.status === "done") {
        const item: ClipHistoryItem = {
          clipId: clip_id, name: s.name || name, baseUrl, venueName: String(venueName || ""),
          channelName, createdAt: Date.now(), size: s.size,
        };
        addHistory(item);
        setHistory((h) => [item, ...h.filter((x) => x.clipId !== clip_id)]);
        return { clipId: clip_id, name: s.name || name, size: s.size };
      }
      if (s.status === "error") throw new Error(s.err || "Cắt clip thất bại");
      setPct(computeProgress(s));
      setStatusText(
        prefix + (s.phase === "fast_download" ? "Đang tải nhanh từ đầu ghi…"
          : s.phase === "rtsp_fallback" ? `Đang ghi lại (×${(s.progress?.speed || 0).toFixed(2)})…`
            : "Đang xử lý…"),
      );
    }
  }, [baseUrl, channelId, venueName, channelName]);

  const onCut = useCallback(async (override?: { start: Date; end: Date }) => {
    if (phase === "creating" || phase === "running") return;
    const now = Date.now();
    if (now - lastCutRef.current < 2000) return; // debounce 2s
    lastCutRef.current = now;

    // Xác định khoảng cắt tổng [s,e].
    const range = override
      ? { start: new Date(override.start), end: new Date(override.end) }
      : useCustom
        ? { start: new Date(start), end: new Date(end) }
        : { start: new Date(now - quickSec * 1000), end: new Date(now) };
    const totalMin = Math.round((range.end.getTime() - range.start.getTime()) / 60000);
    if (range.end <= range.start) {
      Alert.alert("Thời gian không hợp lệ", "Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }
    if (totalMin > MAX_RANGE_MINUTES) {
      Alert.alert("Không cắt được", `Khoảng cắt tối đa ${MAX_RANGE_MINUTES} phút.`);
      return;
    }

    // Chia thành các đoạn ≤ 5 phút (mỗi đoạn = 1 file).
    const segs = splitRange(range.start, range.end);
    setPhase("creating");
    setPct(0);
    setResults([]);
    setStatusText(segs.length > 1 ? `Đang tạo ${segs.length} file…` : "Đang tạo yêu cầu…");
    pollingRef.current = { stop: false };
    const acc: { clipId: string; name: string; size?: number }[] = [];
    try {
      setPhase("running");
      for (let i = 0; i < segs.length; i++) {
        if (pollingRef.current.stop) return;
        setPct(0);
        const r = await cutOneSegment(segs[i], i + 1, segs.length);
        acc.push(r);
        setResults([...acc]);
      }
      setPct(100);
      setPhase("done");
      setStatusText("");
    } catch (e: any) {
      if (e?.message === "__stop__") return;
      // Đã xong một số file trước đó → vẫn giữ kết quả, chỉ báo lỗi phần còn lại.
      if (acc.length > 0) {
        setResults([...acc]);
        setPhase("done");
        setStatusText("");
        Alert.alert("Cắt chưa trọn", `Đã cắt được ${acc.length}/${segs.length} file. Phần còn lại lỗi: ${e?.message || "thử lại."}`);
      } else {
        setPhase("error");
        setStatusText(e?.message || "Có lỗi, vui lòng thử lại.");
      }
    }
  }, [phase, useCustom, start, end, quickSec, cutOneSegment]);

  // Cắt từ vị trí đang tua trên dòng thời gian (quickSec giây kể từ đó).
  const cutFromScrub = useCallback(() => {
    const s = new Date(scrubTime);
    const e = new Date(Math.min(s.getTime() + quickSec * 1000, Date.now()));
    onCut({ start: s, end: e });
  }, [scrubTime, quickSec, onCut]);

  // ── Ghi hình trực tiếp (như nút record DMSS) ────────────────────────────────
  const [recId, setRecId] = useState<string | null>(null);
  const [recSec, setRecSec] = useState(0);
  const [recBusy, setRecBusy] = useState(false);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleRecord = useCallback(async () => {
    if (recBusy) return;
    if (recId) {
      // Dừng ghi → nhận clip.
      setRecBusy(true);
      if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
      try {
        const r = await stopRecord(baseUrl, recId);
        setRecId(null);
        setRecSec(0);
        if (r.status === "done") {
          setPhase("done");
          setResults([{ clipId: r.clip_id, name: r.name, size: r.size }]);
          setStatusText("");
        } else {
          Alert.alert("Ghi hình lỗi", "Không lưu được bản ghi, thử lại.");
        }
      } catch (e: any) {
        Alert.alert("Lỗi dừng ghi", e?.message || "Thử lại.");
      } finally {
        setRecBusy(false);
      }
    } else {
      // Bắt đầu ghi.
      setRecBusy(true);
      try {
        const r = await startRecord(baseUrl, channelId);
        setRecId(r.record_id);
        setRecSec(0);
        recTimerRef.current = setInterval(() => setRecSec((s) => s + 1), 1000);
      } catch (e: any) {
        Alert.alert("Không ghi được", e?.message || "Camera tạm thời không phản hồi.");
      } finally {
        setRecBusy(false);
      }
    }
  }, [recBusy, recId, baseUrl, channelId]);

  // Dọn timer + dừng bản ghi khi rời màn.
  useEffect(() => () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
  }, []);

  // ── Tải / chia sẻ ──────────────────────────────────────────────────────────
  // Clip khá nặng (vài chục–vài trăm MB) → tải có % tiến trình. Spinner CHỈ hiện lúc
  // tải; mở share sheet xong tắt ngay (không chờ shareAsync resolve — trên iOS promise
  // này có thể không trả về sau khi lưu → tránh "xoay mãi").
  const [sharing, setSharing] = useState(false);
  const [dlPct, setDlPct] = useState(0);
  const shareClip = useCallback(async (clipId: string, name: string) => {
    if (sharing) return;
    setSharing(true);
    setDlPct(0);
    try {
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const safe = (name || `clip-${clipId}.mp4`).replace(/[^\w.\-]+/g, "_");
      const task = FileSystem.createDownloadResumable(
        clipDownloadUrl(baseUrl, clipId),
        `${dir}${safe}`,
        {},
        (p) => {
          const total = p.totalBytesExpectedToWrite;
          if (total > 0) setDlPct(Math.min(100, Math.round((p.totalBytesWritten / total) * 100)));
        },
      );
      const out = await task.downloadAsync();
      setSharing(false);
      setDlPct(0);
      if (out?.uri && (await Sharing.isAvailableAsync())) {
        Sharing.shareAsync(out.uri, { mimeType: "video/mp4", UTI: "public.mpeg-4", dialogTitle: "Chia sẻ / lưu clip" }).catch(() => {});
      } else if (out?.uri) {
        Alert.alert("Đã tải", "Clip đã được tải về máy.");
      }
    } catch (e: any) {
      setSharing(false);
      setDlPct(0);
      Alert.alert("Lỗi tải clip", e?.message || "Không tải được clip (có thể đã quá hạn).");
    }
  }, [baseUrl, sharing]);

  // Lưu THẲNG vào album (thư viện ảnh). Cần module native expo-media-library (bản
  // build mới); bản cũ chưa có → tự fallback sang share sheet (vẫn có "Lưu video").
  const saveToAlbum = useCallback(async (clipId: string, name: string) => {
    if (sharing) return;
    setSharing(true);
    try {
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const safe = (name || `clip-${clipId}.mp4`).replace(/[^\w.\-]+/g, "_");
      const dl = await FileSystem.downloadAsync(clipDownloadUrl(baseUrl, clipId), `${dir}${safe}`);
      // Thử lưu thẳng album; nếu module native thiếu/hỏng (bản app cũ) → fallback share.
      if (MediaLibrary?.saveToLibraryAsync) {
        try {
          const perm = MediaLibrary.requestPermissionsAsync ? await MediaLibrary.requestPermissionsAsync() : { granted: true };
          if (!perm?.granted) { Alert.alert("Cần quyền", "Cho phép truy cập Ảnh để lưu clip vào máy."); return; }
          await MediaLibrary.saveToLibraryAsync(dl.uri);
          Alert.alert("Đã lưu", "Clip đã lưu vào thư viện ảnh.");
          return;
        } catch { /* native không khả dụng → rơi xuống share */ }
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri, { mimeType: "video/mp4", UTI: "public.mpeg-4", dialogTitle: "Lưu / chia sẻ clip" });
      } else {
        Alert.alert("Đã tải", "Clip đã được tải về máy.");
      }
    } catch (e: any) {
      Alert.alert("Lỗi lưu clip", e?.message || "Không lưu được clip (có thể đã quá hạn).");
    } finally {
      setSharing(false);
    }
  }, [baseUrl, sharing]);

  // ── Lịch sử (clip của camera này) ──────────────────────────────────────────
  const [history, setHistory] = useState<ClipHistoryItem[]>([]);
  useEffect(() => {
    getHistory().then((all) => setHistory(all.filter((x) => x.baseUrl === baseUrl && x.channelName === channelName)));
  }, [baseUrl, channelName]);

  const busy = phase === "creating" || phase === "running";

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <Stack.Screen options={{ title: channelName, headerShown: true }} />
      <ScrollView contentContainerStyle={[{ padding: 14, paddingBottom: 40 }, rsp.isWide && { maxWidth: rsp.contentMaxWidth, alignSelf: "center", width: "100%" }]}>
        {/* Preview / thumbnail */}
        {manifest ? (
          <View>
            {previewMode === "playback" && (
              <View style={[styles.pbTag, { backgroundColor: C.primarySoft, borderColor: C.primary }]}>
                <Ionicons name="play-back" size={13} color={C.primary} />
                <Text style={{ color: C.primary, fontWeight: "700", fontSize: 12, marginLeft: 5 }}>Đang xem lại đoạn cắt — kéo thanh thời gian để tua</Text>
              </View>
            )}
            <LivePreview uri={manifest} />
            <Pressable onPress={stopPreview} style={[styles.ghostBtn, { borderColor: C.border, marginTop: 8 }]}>
              <Ionicons name="stop-circle-outline" size={18} color={C.redText} />
              <Text style={{ color: C.redText, fontWeight: "700", marginLeft: 6 }}>Dừng xem</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={startPreview} disabled={previewBusy} style={styles.thumbWrap}>
            <Image source={{ uri: thumbnailUrl(baseUrl, channelId) }} style={styles.thumb} resizeMode="cover" />
            <View style={styles.previewOverlay}>
              {previewBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={48} color="#fff" />
                  <Text style={{ color: "#fff", marginTop: 6, fontWeight: "700" }}>Xem trực tiếp</Text>
                </>
              )}
            </View>
          </Pressable>
        )}

        {/* Ghi hình trực tiếp */}
        <Pressable
          onPress={toggleRecord}
          disabled={recBusy}
          style={[styles.recBtn, { backgroundColor: recId ? C.redSoft : C.redText, borderColor: C.redText, opacity: recBusy ? 0.6 : 1 }]}
        >
          {recBusy ? (
            <ActivityIndicator color={recId ? C.redText : C.onPrimary} size="small" />
          ) : (
            <View style={[styles.recDot, { backgroundColor: recId ? C.redText : "#fff" }]} />
          )}
          <Text style={{ color: recId ? C.redText : C.onPrimary, fontWeight: "800", marginLeft: 8 }}>
            {recId ? `Dừng ghi · ${pad2(Math.floor(recSec / 60))}:${pad2(recSec % 60)}` : "Ghi hình trực tiếp"}
          </Text>
        </Pressable>
        <Text style={{ color: C.muted, fontSize: 11.5, textAlign: "center", marginTop: 6 }}>
          Ghi lại camera theo thời gian thực — bấm lại để dừng và lưu.
        </Text>

        {/* Dòng thời gian — tua xem như DMSS */}
        <View style={styles.tlHeaderRow}>
          <Text style={[styles.sectionTitle, { color: C.text, marginTop: 20 }]}>Tua theo dòng thời gian</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Pressable onPress={() => onZoom(winStart.getTime() + winMs / 2, winMs / 2)} style={[styles.tlNav, { borderColor: C.border }]}>
              <Ionicons name="add" size={16} color={C.text} />
            </Pressable>
            <Pressable onPress={() => onZoom(winStart.getTime() + winMs / 2, winMs * 2)} style={[styles.tlNav, { borderColor: C.border }]}>
              <Ionicons name="remove" size={16} color={C.text} />
            </Pressable>
            <Pressable onPress={() => shiftWin(-0.5)} style={[styles.tlNav, { borderColor: C.border }]}>
              <Ionicons name="chevron-back" size={16} color={C.text} />
            </Pressable>
            <Pressable onPress={() => shiftWin(0.5)} style={[styles.tlNav, { borderColor: C.border }]}>
              <Ionicons name="chevron-forward" size={16} color={C.text} />
            </Pressable>
          </View>
        </View>
        <Text style={{ color: C.primary, fontWeight: "800", fontSize: 18 }}>
          {hhmmss(scrubTime)}  <Text style={{ color: C.sub, fontWeight: "500", fontSize: 12 }}>· {pad2(scrubTime.getDate())}/{pad2(scrubTime.getMonth() + 1)}</Text>
        </Text>
        <Timeline C={C} winStart={winStart} winMs={winMs} scrubTime={scrubTime} onScrub={setScrubTime} onCommit={(t) => { setScrubTime(t); startPlaybackAt(t); }} onZoom={onZoom} />
        <Text style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 4 }}>
          Kéo để tua · chụm 2 ngón để phóng to/thu nhỏ · {Math.round(winMs / 60000)} phút
        </Text>
        <Pressable onPress={cutFromScrub} disabled={busy} style={[styles.previewBtn, { borderColor: C.primary, marginTop: 12, opacity: busy ? 0.6 : 1 }]}>
          <Ionicons name="cut" size={17} color={C.primary} />
          <Text style={{ color: C.primary, fontWeight: "700", marginLeft: 8 }}>Cắt {quickLabel(quickSec)} từ {hhmmss(scrubTime)}</Text>
        </Pressable>

        {/* Chọn khoảng cắt */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>Chọn khoảng cắt</Text>
        <View style={styles.chipsRow}>
          {QUICK_SECONDS.map((sec) => {
            const on = !useCustom && quickSec === sec;
            return (
              <Pressable
                key={sec}
                onPress={() => { setUseCustom(false); setQuickSec(sec); }}
                style={[styles.chip, { backgroundColor: on ? C.primary : C.field, borderColor: on ? C.primary : C.border }]}
              >
                <Text style={{ color: on ? C.onPrimary : C.text, fontWeight: "700" }}>{quickLabel(sec)}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setUseCustom(true)}
            style={[styles.chip, { backgroundColor: useCustom ? C.primary : C.field, borderColor: useCustom ? C.primary : C.border }]}
          >
            <Ionicons name="time-outline" size={15} color={useCustom ? C.onPrimary : C.text} />
            <Text style={{ color: useCustom ? C.onPrimary : C.text, fontWeight: "700", marginLeft: 4 }}>Tuỳ chọn</Text>
          </Pressable>
        </View>

        {useCustom && (
          <View style={{ marginTop: 10 }}>
            <View style={styles.rangeRow}>
              <DateBtn C={C} label="Bắt đầu" value={start} onPress={() => setPicker("start")} />
              <DateBtn C={C} label="Kết thúc" value={end} onPress={() => setPicker("end")} />
            </View>
            <Text style={{ color: customValid ? C.sub : C.redText, marginTop: 6, fontSize: 12 }}>
              {customMsg}
            </Text>
          </View>
        )}

        {/* Xem trước đoạn cắt (phát lại, tua được) */}
        <Pressable
          onPress={startRangePreview}
          disabled={previewBusy || (useCustom && !customValid)}
          style={[styles.previewBtn, { borderColor: C.primary, opacity: previewBusy || (useCustom && !customValid) ? 0.6 : 1 }]}
        >
          {previewBusy ? <ActivityIndicator color={C.primary} size="small" /> : <Ionicons name="eye-outline" size={18} color={C.primary} />}
          <Text style={{ color: C.primary, fontWeight: "700", marginLeft: 8 }}>Xem trước đoạn cắt</Text>
        </Pressable>
        <Text style={{ color: C.muted, fontSize: 11.5, textAlign: "center", marginTop: 6 }}>
          Phát lại đoạn đã chọn để kiểm tra đúng chưa, rồi hãy cắt.
        </Text>

        {/* Nút cắt */}
        <Pressable
          onPress={() => onCut()}
          disabled={busy || (useCustom && !customValid)}
          style={[styles.cutBtn, { backgroundColor: C.primary, opacity: busy || (useCustom && !customValid) ? 0.6 : 1, marginTop: 12 }]}
        >
          {busy ? <ActivityIndicator color={C.onPrimary} /> : <Ionicons name="cut" size={18} color={C.onPrimary} />}
          <Text style={{ color: C.onPrimary, fontWeight: "800", fontSize: 16, marginLeft: 8 }}>
            {busy ? "Đang cắt…" : "Cắt clip"}
          </Text>
        </Pressable>
        {!!retentionHuman && (
          <Text style={{ color: C.muted, fontSize: 12, textAlign: "center", marginTop: 8 }}>
            Clip tự xoá sau {retentionHuman} — nhớ tải/chia sẻ sớm.
          </Text>
        )}

        {/* Tiến trình */}
        {busy && (
          <View style={[styles.progressCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${Math.max(4, pct)}%`, backgroundColor: C.primary }]} />
            </View>
            <Text style={{ color: C.sub, marginTop: 8, fontSize: 13 }}>{statusText} {pct > 0 ? `· ${pct}%` : ""}</Text>
          </View>
        )}

        {/* Kết quả */}
        {phase === "done" && results.length === 1 && (
          <View style={[styles.resultCard, { backgroundColor: C.greenSoft, borderColor: C.greenText }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="checkmark-circle" size={22} color={C.greenText} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text numberOfLines={1} style={{ color: C.text, fontWeight: "700" }}>{results[0].name}</Text>
                {!!results[0].size && <Text style={{ color: C.sub, fontSize: 12 }}>{humanSize(results[0].size)}</Text>}
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              {/* Nút "Lưu vào máy" tạm ẩn — cần build native (expo-media-library) mới bật. */}
              <Pressable onPress={() => shareClip(results[0].clipId, results[0].name)} disabled={sharing} style={[styles.resBtn, { backgroundColor: C.primary }]}>
                {sharing ? <ActivityIndicator color={C.onPrimary} size="small" /> : <Ionicons name="share-social" size={16} color={C.onPrimary} />}
                <Text style={{ color: C.onPrimary, fontWeight: "700", marginLeft: 6 }}>Tải / Chia sẻ</Text>
              </Pressable>
            </View>
          </View>
        )}
        {phase === "done" && results.length > 1 && (
          <View style={[styles.resultCard, { backgroundColor: C.greenSoft, borderColor: C.greenText }]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="checkmark-circle" size={22} color={C.greenText} />
              <Text style={{ color: C.text, fontWeight: "800", marginLeft: 10 }}>Đã cắt {results.length} file (mỗi file tối đa {MAX_CLIP_MINUTES} phút)</Text>
            </View>
            {results.map((r, i) => (
              <View key={r.clipId} style={{ flexDirection: "row", alignItems: "center", paddingTop: i === 0 ? 0 : 10, marginTop: i === 0 ? 0 : 10, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: C.border }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text numberOfLines={1} style={{ color: C.text, fontWeight: "700", fontSize: 13 }}>{r.name}</Text>
                  {!!r.size && <Text style={{ color: C.sub, fontSize: 12 }}>{humanSize(r.size)}</Text>}
                </View>
                <Pressable onPress={() => shareClip(r.clipId, r.name)} disabled={sharing} style={[styles.shareBtn, { backgroundColor: C.primary }]}>
                  <Ionicons name="share-social" size={15} color={C.onPrimary} />
                  <Text style={{ color: C.onPrimary, fontWeight: "700", marginLeft: 5 }}>Tải</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {phase === "error" && (
          <View style={[styles.resultCard, { backgroundColor: C.redSoft, borderColor: C.redText, flexDirection: "row", alignItems: "center" }]}>
            <Ionicons name="alert-circle" size={22} color={C.redText} />
            <Text style={{ color: C.text, flex: 1, marginLeft: 10 }}>{statusText}</Text>
          </View>
        )}

        {/* Lịch sử clip camera này */}
        {history.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Clip gần đây</Text>
            {history.map((h) => (
              <HistoryRow key={h.clipId} C={C} item={h} onShare={() => shareClip(h.clipId, h.name)} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Overlay tiến trình tải (clip nặng) */}
      {sharing && (
        <View style={styles.dlOverlay}>
          <View style={[styles.dlCard, { backgroundColor: C.card }]}>
            <ActivityIndicator color={C.primary} size="large" />
            <Text style={{ color: C.text, fontWeight: "800", marginTop: 12 }}>Đang tải clip… {dlPct}%</Text>
            <Text style={{ color: C.sub, fontSize: 12, marginTop: 4 }}>Clip có thể nặng, vui lòng đợi.</Text>
          </View>
        </View>
      )}

      <DateTimePickerModal
        isVisible={!!picker}
        mode="datetime"
        date={picker === "end" ? end : start}
        maximumDate={new Date()}
        is24Hour
        onConfirm={(d) => {
          if (picker === "start") { setStart(d); if (end <= d) setEnd(new Date(d.getTime() + 5 * 60000)); }
          else setEnd(d);
          setPicker(null);
        }}
        onCancel={() => setPicker(null)}
      />
    </SafeAreaView>
  );
}

function DateBtn({ C, label, value, onPress }: { C: ThemeTokens; label: string; value: Date; onPress: () => void }) {
  const p = (n: number) => String(n).padStart(2, "0");
  const s = `${p(value.getDate())}/${p(value.getMonth() + 1)} ${p(value.getHours())}:${p(value.getMinutes())}`;
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <Text style={{ color: C.sub, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <View style={{ backgroundColor: C.field, borderColor: C.border, borderWidth: 1, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, flexDirection: "row", alignItems: "center" }}>
        <Ionicons name="calendar-outline" size={15} color={C.sub} />
        <Text style={{ color: C.text, fontWeight: "600", marginLeft: 8 }}>{s}</Text>
      </View>
    </Pressable>
  );
}

function HistoryRow({ C, item, onShare }: { C: ThemeTokens; item: ClipHistoryItem; onShare: () => void }) {
  const [alive, setAlive] = useState<boolean | null>(null);
  useEffect(() => { isClipAlive(item).then(setAlive); }, [item]);
  const mins = Math.max(0, Math.round((Date.now() - item.createdAt) / 60000));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }}>
      <Ionicons name="film-outline" size={18} color={C.sub} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text numberOfLines={1} style={{ color: C.text, fontWeight: "600", fontSize: 13 }}>{item.name}</Text>
        <Text style={{ color: C.muted, fontSize: 11 }}>{mins < 60 ? `${mins} phút trước` : `${Math.round(mins / 60)} giờ trước`}{item.size ? ` · ${humanSize(item.size)}` : ""}</Text>
      </View>
      {alive === false ? (
        <Text style={{ color: C.muted, fontSize: 12 }}>Đã hết hạn</Text>
      ) : (
        <Pressable onPress={onShare} hitSlop={10} style={{ padding: 8 }}>
          <Ionicons name="share-social-outline" size={20} color={C.primary} />
        </Pressable>
      )}
    </View>
  );
}

const mkStyles = (C: ThemeTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    thumbWrap: { borderRadius: 12, overflow: "hidden", backgroundColor: "#000", aspectRatio: 16 / 9 },
    thumb: { width: "100%", height: "100%" },
    previewOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.28)" },
    ghostBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
    previewBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, marginTop: 18 },
    pbTag: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, marginBottom: 8 },
    recBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, marginTop: 18 },
    recDot: { width: 12, height: 12, borderRadius: 6 },
    tlHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    tlNav: { width: 34, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    sectionTitle: { fontWeight: "800", fontSize: 15, marginTop: 20, marginBottom: 10 },
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
    rangeRow: { flexDirection: "row", gap: 12 },
    cutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, borderRadius: 14, marginTop: 22 },
    progressCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 16 },
    track: { height: 8, borderRadius: 999, backgroundColor: "rgba(127,127,127,0.25)", overflow: "hidden" },
    bar: { height: 8, borderRadius: 999 },
    resultCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 16 },
    resBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: 10 },
    dlOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,6,23,0.55)", alignItems: "center", justifyContent: "center" },
    dlCard: { borderRadius: 16, paddingVertical: 26, paddingHorizontal: 32, alignItems: "center", minWidth: 220 },
    shareBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  });
