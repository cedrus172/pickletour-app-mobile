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
import { Stack, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { useResponsive } from "@/hooks/useResponsive";
import CameraPlayback, { type CameraPlaybackHandle } from "@/components/clipCam/CameraPlayback";
import { useClipCameraAccess } from "@/hooks/useClipCameraPreviews";
import { cameraCutRange, cameraHistoryTitle, cameraSeekTarget } from "@/utils/clipPlayback";
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

const pad2 = (n: number) => String(n).padStart(2, "0");
const hhmm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const hhmmss = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Dòng thời gian kéo-tua + chụm-để-zoom (như DMSS). */
function Timeline({
  C, winStart, winMs, scrubTime, rangeEnd, onScrub, onCommit, onZoom,
}: {
  C: ThemeTokens; winStart: Date; winMs: number; scrubTime: Date; rangeEnd: Date;
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
        style={{ height: 78, borderRadius: 12, borderWidth: 1, overflow: "hidden", backgroundColor: C.field, borderColor: C.border }}
      >
        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: timeToX(scrubTime), backgroundColor: C.primarySoft }} />
        <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: timeToX(scrubTime), width: Math.max(0, timeToX(rangeEnd) - timeToX(scrubTime)), backgroundColor: C.primarySoft, borderLeftWidth: 1, borderLeftColor: C.primary }} />
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
  const tokens = useThemeTokens();
  const C = useMemo(() => tokens.isV2 ? { ...tokens, bg: "#041329", card: "#082138", field: "#09263C", border: "#174A6C", line: "#24506A", primary: "#12C8EC", primarySoft: "rgba(18,200,236,0.14)", text: "#F0F6FF", sub: "#94B3D0", muted: "#829DB8", onPrimary: "#041329" } : tokens, [tokens]);
  const styles = useMemo(() => mkStyles(C), [C]);
  const rsp = useResponsive();
  const { base, venueName, chId, chName } = useLocalSearchParams<{
    base: string; venueName: string; chId: string; chName: string;
  }>();
  const baseUrl = String(base || "");
  const channelId = Number(chId || 0);
  const channelName = String(chName || "Sân");
  // Đầu thu Hikvision: xem lại (tua) được nhưng cắt theo khoảng thời gian ra file hỏng →
  // ẩn phần chọn khoảng cắt, ghi hình chỉ theo trực tiếp.
  const { venues: accessVenues } = useClipCameraAccess();
  const venueAccess = accessVenues.find((v) => v.piBaseUrl.replace(/\/+$/, "") === baseUrl.replace(/\/+$/, ""));
  const noRangeCut = venueAccess?.nvrVendor === "hikvision";
  // Quyền "chỉ xem lại": không xem/ghi trực tiếp; mọi mốc thời gian bị chặn ở (hiện tại − N phút).
  const replayDelayMin = venueAccess?.replayOnly ? Math.max(1, venueAccess.replayDelayMin || 60) : 0;
  const replayOnly = replayDelayMin > 0;
  const nowCap = useCallback(() => Date.now() - replayDelayMin * 60000, [replayDelayMin]);

  // ── Xem trước (live / phát lại đoạn cắt) ────────────────────────────────────
  const [manifest, setManifest] = useState<string>("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewMode, setPreviewMode] = useState<"live" | "playback">("live");
  const [playbackOrigin, setPlaybackOrigin] = useState(Date.now);
  const [autoPlay, setAutoPlay] = useState(true);
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<CameraPlaybackHandle>(null);
  const streamRef = useRef<StreamSession | null>(null);
  const previewRequest = useRef(0);

  // Chỉ kết quả yêu cầu mới nhất được mở player; session trả về muộn phải được dọn.
  const launchPreview = useCallback(async (mode: "live" | "playback", origin: Date, range?: { start: string; end: string }, play = true) => {
    if (replayOnly && mode === "live") return;
    const request = ++previewRequest.current;
    const previous = streamRef.current; streamRef.current = null;
    setManifest(""); setPlaying(false); setPreviewBusy(true);
    if (previous) void stopStream(baseUrl, previous.session_id);
    try {
      const session = await startStream(baseUrl, channelId, mode, range);
      if (request !== previewRequest.current) { void stopStream(baseUrl, session.session_id); return; }
      streamRef.current = session; setPreviewMode(mode); setPlaybackOrigin(origin.getTime()); setAutoPlay(play);
      setManifest(streamManifestUrl(baseUrl, session));
    } catch (error: any) {
      if (request === previewRequest.current) Alert.alert(mode === "live" ? "Không xem được" : "Không phát lại được", error?.message || "Camera tạm thời không phản hồi.");
    } finally {
      if (request === previewRequest.current) setPreviewBusy(false);
    }
  }, [baseUrl, channelId, replayOnly]);

  const startPreview = useCallback(() => {
    if (!previewBusy) void launchPreview("live", new Date());
  }, [previewBusy, launchPreview]);

  const stopPreview = useCallback(() => {
    previewRequest.current++;
    const session = streamRef.current; streamRef.current = null;
    setManifest(""); setPlaying(false); setPreviewBusy(false);
    if (session) void stopStream(baseUrl, session.session_id);
  }, [baseUrl]);

  useEffect(() => () => {
    previewRequest.current++;
    const session = streamRef.current; streamRef.current = null;
    if (session) void stopStream(baseUrl, session.session_id);
  }, [baseUrl, channelId]);

  // ── Chọn khoảng cắt ───────────────────────────────────────────────────────
  const [quickSec, setQuickSec] = useState<number>(300); // mặc định 5 phút
  const [useCustom, setUseCustom] = useState(false);
  const [start, setStart] = useState<Date>(() => new Date(Date.now() - 5 * 60 * 1000));
  const [end, setEnd] = useState<Date>(() => new Date());
  const [picker, setPicker] = useState<null | "start" | "end">(null);

  // ── Dòng thời gian (tua như DMSS) ───────────────────────────────────────────
  const TL_MIN_MS = 5 * 60 * 1000;        // zoom tối đa: cửa sổ 5 phút
  const TL_MAX_MS = 12 * 60 * 60 * 1000;  // zoom tối thiểu: 12 giờ
  const [winMs, setWinMs] = useState<number>(3 * 60 * 60 * 1000); // cửa sổ 3 giờ
  const [winStart, setWinStart] = useState<Date>(() => new Date(Date.now() - 3 * 60 * 60 * 1000));
  const [scrubTime, setScrubTime] = useState<Date>(() => new Date(Date.now() - 5 * 60000));


  const customMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const customParts = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (MAX_CLIP_MINUTES * 60000)));
  const customAfterCap = replayOnly && end.getTime() > nowCap() + 1000;
  const customValid = useCustom ? end > start && customMinutes <= MAX_RANGE_MINUTES && !customAfterCap : true;
  // Thông báo cụ thể lý do (tránh gộp chung gây khó hiểu).
  const customMsg = !useCustom
    ? ""
    : end <= start
      ? "Giờ kết thúc phải sau giờ bắt đầu."
      : customAfterCap
        ? `Bạn chỉ được xem lại video cũ hơn ${replayDelayMin} phút — chọn giờ kết thúc sớm hơn.`
      : customMinutes > MAX_RANGE_MINUTES
        ? `Khoảng cắt ${customMinutes} phút — tối đa ${MAX_RANGE_MINUTES} phút, hãy chọn ngắn lại.`
        : customParts > 1
          ? `Độ dài ${customMinutes} phút — sẽ chia thành ${customParts} file, mỗi file tối đa ${MAX_CLIP_MINUTES} phút.`
          : `Độ dài: ${customMinutes} phút`;

  // Tóm tắt, xem trước và cắt luôn dùng chung mốc đã chọn trên timeline.
  const selectedRange = useCallback(() => useCustom ? { start, end } : cameraCutRange(scrubTime, quickSec, nowCap()), [useCustom, start, end, scrubTime, quickSec, nowCap]);
  const startRangePreview = useCallback(() => {
    if (useCustom && !customValid) { Alert.alert("Thời gian không hợp lệ", customMsg); return; }
    if (previewBusy) return;
    const range = selectedRange();
    if (range.end <= range.start) { Alert.alert("Chưa có dữ liệu", "Chọn thời điểm trước hiện tại để xem lại."); return; }
    void launchPreview("playback", range.start, { start: fmtClipTime(range.start), end: fmtClipTime(range.end) });
  }, [useCustom, customValid, customMsg, previewBusy, selectedRange, launchPreview]);

  // Zoom (pinch) → đổi độ rộng cửa sổ, giữ tâm.
  const onZoom = useCallback((centerMs: number, newMs: number) => {
    const ms = Math.max(TL_MIN_MS, Math.min(TL_MAX_MS, newMs));
    const maxStart = nowCap() - ms * 0.5;
    setWinMs(ms);
    setWinStart(new Date(Math.min(centerMs - ms / 2, maxStart)));
  }, [TL_MIN_MS, TL_MAX_MS, nowCap]);

  const startPlaybackAt = useCallback((time: Date, play = true) => {
    const now = nowCap();
    let target = new Date(cameraSeekTarget(time.getTime(), 0, now));
    if (!replayOnly && now - target.getTime() <= 1000) { setScrubTime(target); void launchPreview("live", new Date(now), undefined, play); return; }
    // Chỉ xem lại: cần ít nhất 1 phút video trước mốc giới hạn.
    if (replayOnly && now - target.getTime() < 60_000) target = new Date(now - 60_000);
    setScrubTime(target);
    const range = cameraCutRange(target, 30 * 60, now);
    void launchPreview("playback", target, { start: fmtClipTime(range.start), end: fmtClipTime(range.end) }, play);
  }, [launchPreview, nowCap, replayOnly]);

  const jumpPlayback = useCallback((seconds: number) => {
    if (previewBusy) return;
    const current = playerRef.current?.currentTimeMs() ?? scrubTime.getTime();
    const target = cameraSeekTarget(current, seconds, nowCap());
    setScrubTime(new Date(target));
    setWinStart((left) => target < left.getTime() || target > left.getTime() + winMs ? new Date(target - winMs / 2) : left);
    if (!playerRef.current?.seekToTime(target)) startPlaybackAt(new Date(target), manifest ? playing : true);
  }, [previewBusy, scrubTime, winMs, startPlaybackAt, manifest, playing, nowCap]);

  // Nút phát / ảnh xem trước: quyền chỉ xem lại thì phát lại tại mốc đang chọn thay vì trực tiếp.
  const openPreview = useCallback(() => {
    if (replayOnly) { if (!previewBusy) startPlaybackAt(scrubTime); } else startPreview();
  }, [replayOnly, previewBusy, startPlaybackAt, scrubTime, startPreview]);

  // Vừa biết là quyền chỉ xem lại: đưa mốc chọn, dòng thời gian và khoảng tuỳ chọn về trước giới hạn.
  useEffect(() => {
    if (!replayOnly) return;
    const cap = nowCap();
    setScrubTime((t) => (t.getTime() > cap - 60_000 ? new Date(cap - 5 * 60000) : t));
    setWinStart((w) => (w.getTime() + winMs * 0.5 > cap ? new Date(cap - winMs * 0.75) : w));
    setEnd((e) => (e.getTime() > cap ? new Date(cap) : e));
    setStart((st) => (st.getTime() > cap - 60_000 ? new Date(cap - 5 * 60000) : st));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayOnly, replayDelayMin]);

  const shiftWin = useCallback((frac: number) => {
    setWinStart((w) => {
      const next = w.getTime() + winMs * frac;
      const maxStart = nowCap() - winMs * 0.5; // không trôi quá tương lai (hoặc quá giới hạn xem lại)
      return new Date(Math.min(next, maxStart));
    });
  }, [winMs, nowCap]);

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
    // Quyền chỉ xem lại: không cắt đoạn mới hơn (hiện tại − N phút).
    if (replayOnly && range.end.getTime() > nowCap() + 1000) {
      Alert.alert("Chưa xem được đoạn này", `Bạn chỉ được xem lại video cũ hơn ${replayDelayMin} phút.`); return;
    }
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
  }, [phase, useCustom, start, end, quickSec, cutOneSegment, replayOnly, nowCap, replayDelayMin]);

  // Cắt từ vị trí đang tua trên dòng thời gian (quickSec giây kể từ đó).
  const cutFromScrub = useCallback(() => {
    void onCut(selectedRange());
  }, [selectedRange, onCut]);

  // ── Ghi hình trực tiếp (như nút record DMSS) ────────────────────────────────
  const [recId, setRecId] = useState<string | null>(null);
  const [recSec, setRecSec] = useState(0);
  const [recBusy, setRecBusy] = useState(false);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Đang XEM LẠI → ghi theo mốc thời gian đang xem (không phải giờ hiện tại):
  // bấm ghi lưu mốc đầu, bấm dừng lấy mốc cuối rồi cắt đoạn đó từ đầu ghi.
  const recPlayStartRef = useRef<number | null>(null);

  const toggleRecord = useCallback(async () => {
    if (recBusy) return;
    if (recId === "playback") {
      if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
      const startMs = recPlayStartRef.current ?? Date.now();
      const nowPos = playerRef.current?.currentTimeMs();
      const endMs = nowPos && nowPos > startMs ? nowPos : startMs + Math.max(1, recSec) * 1000;
      recPlayStartRef.current = null;
      setRecId(null);
      setRecSec(0);
      void onCut({ start: new Date(startMs), end: new Date(endMs) });
      return;
    }
    if (!recId && !noRangeCut && previewMode === "playback" && manifest) {
      const pos = playerRef.current?.currentTimeMs();
      if (!pos) { Alert.alert("Chưa sẵn sàng", "Đợi video xem lại chạy rồi bấm ghi."); return; }
      recPlayStartRef.current = pos;
      setRecId("playback");
      setRecSec(0);
      recTimerRef.current = setInterval(() => setRecSec((s) => s + 1), 1000);
      return;
    }
    // Hikvision đang xem lại: chuyển về trực tiếp rồi ghi (không cắt đoạn cũ).
    if (!recId && noRangeCut && previewMode === "playback") void launchPreview("live", new Date());
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
  }, [recBusy, recId, recSec, baseUrl, channelId, previewMode, manifest, onCut, noRangeCut, launchPreview]);

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
      if (!dir) throw new Error("Không có bộ nhớ tạm để tải clip.");
      const task = FileSystem.createDownloadResumable(clipDownloadUrl(baseUrl, clipId), `${dir}${safe}`, {}, (p) => {
        if (p.totalBytesExpectedToWrite > 0) setDlPct(Math.min(100, Math.round(p.totalBytesWritten / p.totalBytesExpectedToWrite * 100)));
      });
      const dl = await task.downloadAsync();
      if (!dl || dl.status < 200 || dl.status >= 300) throw new Error("Không tải được clip (có thể đã quá hạn).");
      // Thử lưu thẳng album; nếu module native thiếu/hỏng (bản app cũ) → fallback share.
      if (MediaLibrary?.saveToLibraryAsync) {
        try {
          const perm = MediaLibrary.requestPermissionsAsync ? await MediaLibrary.requestPermissionsAsync(true) : { granted: true };
          if (!perm?.granted) { Alert.alert("Cần quyền", "Cho phép truy cập Ảnh để lưu clip vào máy."); return; }
          await MediaLibrary.saveToLibraryAsync(dl.uri);
          Alert.alert("Đã lưu", "Clip đã lưu vào thư viện ảnh.");
          return;
        } catch { /* native không khả dụng → rơi xuống share */ }
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri, { mimeType: "video/mp4", UTI: "public.mpeg-4", dialogTitle: "Lưu / chia sẻ clip" });
      } else {
        Alert.alert("Không thể lưu clip", "Phiên bản ứng dụng này chưa hỗ trợ lưu vào thư viện ảnh.");
      }
    } catch (e: any) {
      Alert.alert("Lỗi lưu clip", e?.message || "Không lưu được clip (có thể đã quá hạn).");
    } finally {
      setSharing(false);
      setDlPct(0);
    }
  }, [baseUrl, sharing]);

  // ── Lịch sử (clip của camera này) ──────────────────────────────────────────
  const [history, setHistory] = useState<ClipHistoryItem[]>([]);
  useEffect(() => {
    getHistory().then((all) => setHistory(all.filter((x) => x.baseUrl === baseUrl && x.channelName === channelName)));
  }, [baseUrl, channelName]);

  const busy = phase === "creating" || phase === "running";
  const range = selectedRange();
  const selectedSeconds = Math.max(0, Math.round((range.end.getTime() - range.start.getTime()) / 1000));

  return (
    <SafeAreaView style={styles.root} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: channelName, headerShown: true, headerStyle: { backgroundColor: C.card }, headerTintColor: C.text, headerShadowVisible: false,
        ...(C.isV2 ? { headerBackVisible: false, headerTitleAlign: "center", headerLeft: () => <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.headerBack}><Ionicons name="chevron-back" size={24} color={C.text} /></Pressable>, headerTitle: () => <View style={{ alignItems: "center", maxWidth: Math.max(150, rsp.width - 145) }}><Text numberOfLines={1} style={{ color: C.text, fontSize: 18, fontWeight: "800" }}>{channelName}</Text><Text numberOfLines={1} style={{ color: C.sub, fontSize: 12, marginTop: 3 }}>{String(venueName || "")}</Text></View> } : {}),
      }} />
      <ScrollView testID="camera-cut-scroll" contentContainerStyle={[styles.content, rsp.isWide && { maxWidth: rsp.contentMaxWidth }]}>
        {manifest ? <CameraPlayback key={manifest} ref={playerRef} uri={manifest} mode={previewMode} originMs={playbackOrigin} autoPlay={autoPlay} C={C} onPlayingChange={setPlaying} /> : (
          <Pressable accessibilityRole="button" accessibilityLabel={replayOnly ? "Xem lại camera" : "Xem trực tiếp camera"} onPress={openPreview} disabled={previewBusy} style={styles.thumbWrap}>
            {!replayOnly && <Image source={{ uri: thumbnailUrl(baseUrl, channelId) }} style={styles.thumb} resizeMode="cover" />}
            <View style={styles.previewOverlay}>{previewBusy ? <ActivityIndicator color="#fff" /> : <><Ionicons name={replayOnly ? "play-back-circle" : "play-circle"} size={48} color="#fff" /><Text style={{ color: "#fff", marginTop: 6, fontWeight: "700" }}>{replayOnly ? `Xem lại lúc ${hhmmss(scrubTime)}` : "Xem trực tiếp"}</Text>{replayOnly && <Text style={{ color: "#fff", marginTop: 4, fontSize: 12, opacity: 0.85 }}>{`Chỉ xem được video cũ hơn ${replayDelayMin} phút`}</Text>}</>}</View>
          </Pressable>
        )}
        <View testID="camera-playback-controls" style={styles.playbackControls}>
          <Pressable accessibilityRole="button" accessibilityLabel="Lùi 30 giây" disabled={previewBusy} onPress={() => jumpPlayback(-30)} style={[styles.jumpControl, { opacity: previewBusy ? 0.45 : 1 }]}><View style={styles.jumpCircle}><Ionicons name="refresh-outline" size={36} color={C.text} style={{ transform: [{ scaleX: -1 }] }} /><Text style={styles.jumpNumber}>30</Text></View><Text style={styles.jumpLabel}>Lùi 30 giây</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={manifest ? playing ? "Tạm dừng video" : "Tiếp tục phát video" : "Phát camera"} disabled={previewBusy} onPress={() => manifest ? playerRef.current?.toggle() : openPreview()} style={[styles.playControl, { opacity: previewBusy ? 0.5 : 1 }]}>{previewBusy ? <ActivityIndicator color={C.onPrimary} /> : <Ionicons name={manifest && playing ? "pause" : "play"} size={30} color={C.onPrimary} />}</Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Tiến 30 giây" disabled={previewBusy} onPress={() => jumpPlayback(30)} style={[styles.jumpControl, { opacity: previewBusy ? 0.45 : 1 }]}><View style={styles.jumpCircle}><Ionicons name="refresh-outline" size={36} color={C.text} /><Text style={styles.jumpNumber}>30</Text></View><Text style={styles.jumpLabel}>Tiến 30 giây</Text></Pressable>
        </View>
        {(manifest || previewBusy) && <Pressable accessibilityRole="button" accessibilityLabel="Dừng xem" onPress={stopPreview} style={[styles.ghostBtn, { marginTop: 10 }]}><Ionicons name="stop-circle-outline" size={18} color={C.redText} /><Text style={{ color: C.redText, fontWeight: "700", marginLeft: 7 }}>Dừng xem</Text></Pressable>}

        {!replayOnly && <>
        <Pressable accessibilityRole="button" onPress={toggleRecord} disabled={recBusy} style={[styles.recBtn, { backgroundColor: recId ? C.redSoft : C.isV2 ? "#FF6C86" : C.redText, borderColor: C.redText, opacity: recBusy ? 0.6 : 1 }]}>
          {recBusy ? <ActivityIndicator color={recId ? C.redText : C.onPrimary} size="small" /> : <View style={[styles.recDot, { backgroundColor: recId ? C.redText : "#fff" }]} />}
          <Text style={{ color: recId ? C.redText : C.onPrimary, fontWeight: "800", marginLeft: 8 }}>{recId ? `Dừng ghi · ${pad2(Math.floor(recSec / 60))}:${pad2(recSec % 60)}` : "Ghi hình trực tiếp"}</Text>
        </Pressable>
        <Text style={styles.hint}>{noRangeCut ? "Camera sân này ghi hình theo trực tiếp · " : ""}Bấm để ghi · Bấm lại để dừng và lưu</Text>
        </>}

        <View style={styles.tlHeaderRow}><Text style={[styles.sectionTitle, { marginVertical: 0, fontSize: 15 }]}>Tua theo dòng thời gian</Text><View style={styles.timeTools}>
          <Pressable accessibilityRole="button" accessibilityLabel="Phóng to dòng thời gian" onPress={() => onZoom(winStart.getTime() + winMs / 2, winMs / 2)} style={styles.tlNav}><Ionicons name="add" size={20} color={C.text} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Thu nhỏ dòng thời gian" onPress={() => onZoom(winStart.getTime() + winMs / 2, winMs * 2)} style={styles.tlNav}><Ionicons name="remove" size={20} color={C.text} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Dịch dòng thời gian về trước" onPress={() => shiftWin(-0.5)} style={styles.tlNav}><Ionicons name="chevron-back" size={20} color={C.text} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Dịch dòng thời gian về sau" onPress={() => shiftWin(0.5)} style={styles.tlNav}><Ionicons name="chevron-forward" size={20} color={C.text} /></Pressable>
        </View></View>
        <View style={styles.timeRow}><Text testID="camera-selected-time" style={{ color: C.primary, fontWeight: "800", fontSize: 23 }}>{hhmmss(scrubTime)}</Text><View style={styles.dateChip}><Ionicons name="calendar-outline" size={15} color={C.sub} /><Text style={{ color: C.sub, fontSize: 12 }}>{pad2(scrubTime.getDate())}/{pad2(scrubTime.getMonth() + 1)}</Text></View></View>
        <Timeline C={C} winStart={winStart} winMs={winMs} scrubTime={scrubTime} rangeEnd={range.end} onScrub={(d: Date) => setScrubTime(new Date(Math.min(d.getTime(), nowCap())))} onCommit={startPlaybackAt} onZoom={onZoom} />
        <Text style={styles.hint}>Kéo để tua · Chụm 2 ngón để phóng to/thu nhỏ · {Math.round(winMs / 60000)} phút</Text>

        {!noRangeCut && <>
        <Text style={styles.sectionTitle}>Chọn khoảng cắt</Text>
        <View style={styles.chipsRow}>{QUICK_SECONDS.map((seconds) => {
          const selected = !useCustom && quickSec === seconds;
          return <Pressable key={seconds} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { setUseCustom(false); setQuickSec(seconds); }} style={[styles.chip, { backgroundColor: selected ? C.primary : C.field, borderColor: selected ? C.primary : C.border }]}><Text style={{ color: selected ? C.onPrimary : C.text, fontWeight: "700" }}>{quickLabel(seconds)}</Text></Pressable>;
        })}<Pressable accessibilityRole="button" accessibilityLabel="Tùy chọn" accessibilityState={{ selected: useCustom }} onPress={() => setUseCustom(true)} style={[styles.chip, { backgroundColor: useCustom ? C.primary : C.field, borderColor: useCustom ? C.primary : C.border }]}><Ionicons name="time-outline" size={15} color={useCustom ? C.onPrimary : C.text} /><Text style={{ color: useCustom ? C.onPrimary : C.text, fontWeight: "700", marginLeft: 4 }}>Tùy chọn</Text></Pressable></View>
        {useCustom && <View style={{ marginTop: 10 }}><View style={styles.rangeRow}><DateBtn C={C} label="Bắt đầu" value={start} onPress={() => setPicker("start")} /><DateBtn C={C} label="Kết thúc" value={end} onPress={() => setPicker("end")} /></View><Text style={{ color: customValid ? C.sub : C.redText, marginTop: 6, fontSize: 12 }}>{customMsg}</Text></View>}
        <View testID="camera-cut-range" style={styles.rangeSummary}><Ionicons name="time-outline" size={18} color={C.sub} /><Text style={{ color: C.text, fontSize: 13, fontWeight: "600", textAlign: "center", flexShrink: 1 }}>{hhmmss(range.start)} → {hhmmss(range.end)} <Text style={{ color: C.sub, fontWeight: "400" }}>({quickLabel(selectedSeconds)})</Text></Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Xem trước đoạn cắt" onPress={startRangePreview} disabled={previewBusy || (useCustom && !customValid) || selectedSeconds <= 0} style={[styles.previewBtn, { opacity: previewBusy || (useCustom && !customValid) || selectedSeconds <= 0 ? 0.5 : 1 }]}>{previewBusy ? <ActivityIndicator color={C.primary} size="small" /> : <Ionicons name="eye-outline" size={21} color={C.primary} />}<Text style={{ color: C.primary, fontWeight: "700", marginLeft: 8 }}>Xem trước đoạn cắt</Text></Pressable>
        <Pressable testID="camera-cut-submit" accessibilityRole="button" onPress={cutFromScrub} disabled={busy || !customValid || selectedSeconds <= 0} style={[styles.cutBtn, { backgroundColor: C.primary, opacity: busy || !customValid || selectedSeconds <= 0 ? 0.5 : 1 }]}>{busy ? <ActivityIndicator color={C.onPrimary} /> : <Ionicons name="cut-outline" size={21} color={C.onPrimary} />}<Text style={{ color: C.onPrimary, fontWeight: "800", fontSize: 16, marginLeft: 8 }}>{busy ? "Đang cắt…" : useCustom ? "Cắt clip" : `Cắt clip ${quickLabel(quickSec)}`}</Text></Pressable>
        </>}
        {!!retentionHuman && <Text style={styles.hint}>Clip tự xóa sau {retentionHuman} · Nhớ tải/chia sẻ sớm.</Text>}

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
              <Pressable accessibilityRole="button" onPress={() => saveToAlbum(results[0].clipId, results[0].name)} disabled={sharing} style={[styles.resBtn, { backgroundColor: C.primary }]}>
                <Ionicons name="download-outline" size={16} color={C.onPrimary} />
                <Text style={{ color: C.onPrimary, fontWeight: "700", marginLeft: 6 }}>Lưu vào Ảnh</Text>
              </Pressable>
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
                <Pressable accessibilityRole="button" accessibilityLabel={`Lưu ${r.name} vào Ảnh`} onPress={() => saveToAlbum(r.clipId, r.name)} disabled={sharing} style={[styles.shareBtn, { backgroundColor: C.primary, marginRight: 8 }]}>
                  <Ionicons name="download-outline" size={15} color={C.onPrimary} />
                  <Text style={{ color: C.onPrimary, fontWeight: "700", marginLeft: 5 }}>Lưu</Text>
                </Pressable>
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
            <Text style={styles.sectionTitle}>Clip gần đây</Text>
            {history.map((h) => (
              <HistoryRow key={h.clipId} C={C} item={h} onShare={() => shareClip(h.clipId, h.name)} onSave={() => saveToAlbum(h.clipId, h.name)} />
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
        maximumDate={new Date(nowCap())}
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
        <Text style={{ color: C.text, fontWeight: "600", marginLeft: 8, flexShrink: 1 }}>{s}</Text>
      </View>
    </Pressable>
  );
}

function HistoryRow({ C, item, onShare, onSave }: { C: ThemeTokens; item: ClipHistoryItem; onShare: () => void; onSave: () => void }) {
  const [alive, setAlive] = useState<boolean | null>(null);
  useEffect(() => { isClipAlive(item).then(setAlive); }, [item]);
  const mins = Math.max(0, Math.round((Date.now() - item.createdAt) / 60000));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", padding: 14, borderWidth: 1, borderRadius: 13, borderColor: C.border, backgroundColor: C.card, marginBottom: 8, gap: 10 }}>
      <Ionicons name="film-outline" size={23} color={C.sub} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text accessibilityLabel={item.name} numberOfLines={1} style={{ color: C.text, fontWeight: "600", fontSize: 13 }}>{cameraHistoryTitle(item.name, item.channelName)}</Text>
        <Text style={{ color: C.muted, fontSize: 11 }}>{mins < 60 ? `${mins} phút trước` : `${Math.round(mins / 60)} giờ trước`}{item.size ? ` · ${humanSize(item.size)}` : ""}</Text>
      </View>
      {alive === false ? (
        <Text style={{ color: C.muted, fontSize: 12 }}>Đã hết hạn</Text>
      ) : (
        <><Pressable accessibilityRole="button" accessibilityLabel={`Lưu ${item.name} vào Ảnh`} onPress={onSave} hitSlop={10} style={{ padding: 8 }}><Ionicons name="download-outline" size={20} color={C.primary} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Tải / chia sẻ ${item.name}`} onPress={onShare} hitSlop={10} style={{ padding: 8 }}>
          <Ionicons name="share-social-outline" size={20} color={C.primary} />
        </Pressable></>
      )}
    </View>
  );
}

const mkStyles = (C: ThemeTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { padding: 14, paddingBottom: 32, width: "100%", alignSelf: "center" },
    headerBack: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    playbackControls: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 13, paddingVertical: 10, paddingHorizontal: 6, marginTop: 10, gap: 6 },
    jumpControl: { flex: 1, alignItems: "center", minHeight: 74, justifyContent: "center" },
    jumpCircle: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    jumpNumber: { position: "absolute", top: 23, fontSize: 12, fontWeight: "800", color: C.text },
    jumpLabel: { color: C.text, fontSize: 12, fontWeight: "700", marginTop: 5, textAlign: "center" },
    playControl: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
    hint: { color: C.muted, fontSize: 11.5, textAlign: "center", marginTop: 7, lineHeight: 17 },
    timeTools: { flexDirection: "row", alignItems: "center", gap: 4 },
    timeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    dateChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, paddingVertical: 6, paddingHorizontal: 10 },
    rangeSummary: { marginTop: 12, borderRadius: 13, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 13, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9 },
    thumbWrap: { borderRadius: 12, overflow: "hidden", backgroundColor: "#000", aspectRatio: 16 / 9 },
    thumb: { width: "100%", height: "100%" },
    previewOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.28)" },
    ghostBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
    previewBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.primary, marginTop: 12 },
    pbTag: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, marginBottom: 8 },
    recBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, marginTop: 18 },
    recDot: { width: 12, height: 12, borderRadius: 6 },
    tlHeaderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 10 },
    tlNav: { width: 34, height: 36, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    sectionTitle: { color: C.text, fontWeight: "800", fontSize: 17, marginTop: 18, marginBottom: 10 },
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { flexDirection: "row", alignItems: "center", justifyContent: "center", minHeight: 42, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
    rangeRow: { flexDirection: "row", gap: 12 },
    cutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, borderRadius: 14, marginTop: 10 },
    progressCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 16 },
    track: { height: 8, borderRadius: 999, backgroundColor: "rgba(127,127,127,0.25)", overflow: "hidden" },
    bar: { height: 8, borderRadius: 999 },
    resultCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 16 },
    resBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: 10 },
    dlOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,6,23,0.55)", alignItems: "center", justifyContent: "center" },
    dlCard: { borderRadius: 16, paddingVertical: 26, paddingHorizontal: 32, alignItems: "center", minWidth: 220 },
    shareBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  });
