// app/clip-cam/cut.tsx — xem trực tiếp + cắt clip 1 camera (PickClip).
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
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
  pollClip,
  QUICK_MINUTES,
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
    p.play();
  });
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
const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Dòng thời gian kéo-tua (như DMSS): kéo con trỏ tới giờ bất kỳ trong cửa sổ. */
function Timeline({
  C, winStart, winMs, scrubTime, onScrub, onCommit,
}: {
  C: ThemeTokens; winStart: Date; winMs: number; scrubTime: Date;
  onScrub: (t: Date) => void; onCommit: (t: Date) => void;
}) {
  const [w, setW] = useState(0);
  const wRef = useRef(0);
  const winRef = useRef({ s: winStart.getTime(), ms: winMs });
  winRef.current = { s: winStart.getTime(), ms: winMs };
  const onScrubRef = useRef(onScrub); onScrubRef.current = onScrub;
  const onCommitRef = useRef(onCommit); onCommitRef.current = onCommit;

  const xToTime = (x: number) => {
    const ww = Math.max(1, wRef.current);
    return new Date(winRef.current.s + (clampN(x, 0, ww) / ww) * winRef.current.ms);
  };
  const timeToX = (t: Date) => {
    if (w <= 0) return 0;
    return clampN(((t.getTime() - winStart.getTime()) / winMs) * w, 0, w);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => onScrubRef.current(xToTime(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => onScrubRef.current(xToTime(e.nativeEvent.locationX)),
      onPanResponderRelease: (e) => onCommitRef.current(xToTime(e.nativeEvent.locationX)),
    }),
  ).current;

  // Vạch giờ.
  const ticks: Date[] = [];
  const first = new Date(winStart); first.setMinutes(0, 0, 0);
  if (first.getTime() < winStart.getTime()) first.setTime(first.getTime() + 3600000);
  for (let t = first.getTime(); t <= winStart.getTime() + winMs; t += 3600000) ticks.push(new Date(t));

  return (
    <View
      onLayout={(e) => { const width = e.nativeEvent.layout.width; wRef.current = width; setW(width); }}
      style={{ height: 72, borderRadius: 12, borderWidth: 1, overflow: "hidden", backgroundColor: C.field, borderColor: C.border }}
      {...pan.panHandlers}
    >
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: timeToX(scrubTime), backgroundColor: C.primarySoft }} />
      {ticks.map((tk) => {
        const x = timeToX(tk);
        return (
          <View key={+tk} style={{ position: "absolute", top: 0, bottom: 0, left: x, width: 1, alignItems: "center" }} pointerEvents="none">
            <View style={{ position: "absolute", top: 0, width: 1, height: 10, backgroundColor: C.line }} />
            <Text style={{ position: "absolute", bottom: 6, fontSize: 10, width: 40, textAlign: "center", marginLeft: -20, color: C.muted }}>{hhmm(tk)}</Text>
          </View>
        );
      })}
      <View style={{ position: "absolute", top: 0, bottom: 0, left: timeToX(scrubTime), width: 2.5, marginLeft: -1.25, backgroundColor: C.primary }} pointerEvents="none" />
    </View>
  );
}

type Phase = "idle" | "creating" | "running" | "done" | "error";

export default function ClipCutScreen() {
  const C = useThemeTokens();
  const styles = useMemo(() => mkStyles(C), [C]);
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
  const [quickMin, setQuickMin] = useState<number>(5);
  const [useCustom, setUseCustom] = useState(false);
  const [start, setStart] = useState<Date>(() => new Date(Date.now() - 5 * 60 * 1000));
  const [end, setEnd] = useState<Date>(() => new Date());
  const [picker, setPicker] = useState<null | "start" | "end">(null);

  const customMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const customValid = useCustom ? end > start && customMinutes <= MAX_CLIP_MINUTES : true;
  // Thông báo cụ thể lý do (tránh gộp chung gây khó hiểu).
  const customMsg = !useCustom
    ? ""
    : end <= start
      ? "Giờ kết thúc phải sau giờ bắt đầu."
      : customMinutes > MAX_CLIP_MINUTES
        ? `Khoảng cắt ${customMinutes} phút — tối đa ${MAX_CLIP_MINUTES} phút/clip, hãy chọn ngắn lại.`
        : `Độ dài: ${customMinutes} phút`;

  // Khoảng thời gian đang chọn → {start,end} dạng chuỗi cho API.
  const selectedRange = useCallback(() => {
    if (useCustom) return { start: fmtClipTime(start), end: fmtClipTime(end) };
    const now = new Date();
    return { start: fmtClipTime(new Date(now.getTime() - quickMin * 60000)), end: fmtClipTime(now) };
  }, [useCustom, start, end, quickMin]);

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
  const TL_WIN_MS = 3 * 60 * 60 * 1000; // cửa sổ 3 giờ
  const [winStart, setWinStart] = useState<Date>(() => new Date(Date.now() - TL_WIN_MS));
  const [scrubTime, setScrubTime] = useState<Date>(() => new Date(Date.now() - 5 * 60000));

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

  const shiftWin = useCallback((deltaMs: number) => {
    setWinStart((w) => {
      const next = new Date(w.getTime() + deltaMs);
      const maxStart = Date.now() - TL_WIN_MS * 0.5; // không trôi quá tương lai
      return new Date(Math.min(next.getTime(), maxStart));
    });
  }, [TL_WIN_MS]);

  // ── Cắt + poll ───────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("idle");
  const [pct, setPct] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<{ clipId: string; name: string; size?: number } | null>(null);
  const pollingRef = useRef<{ stop: boolean }>({ stop: false });
  const lastCutRef = useRef(0);
  const [retentionHuman, setRetentionHuman] = useState("");

  useEffect(() => {
    fetchRetention(baseUrl).then((r) => setRetentionHuman(r.ttl_human || "")).catch(() => {});
    return () => { pollingRef.current.stop = true; };
  }, [baseUrl]);

  const onCut = useCallback(async (override?: { start: Date; end: Date }) => {
    if (phase === "creating" || phase === "running") return;
    const now = Date.now();
    if (now - lastCutRef.current < 2000) return; // debounce 2s
    lastCutRef.current = now;
    if (override) {
      const mins = Math.round((override.end.getTime() - override.start.getTime()) / 60000);
      if (override.end <= override.start || mins > MAX_CLIP_MINUTES) {
        Alert.alert("Không cắt được", `Đoạn phải hợp lệ và tối đa ${MAX_CLIP_MINUTES} phút.`);
        return;
      }
    } else if (useCustom && !customValid) {
      Alert.alert("Thời gian không hợp lệ", customMsg);
      return;
    }
    setPhase("creating");
    setPct(0);
    setResult(null);
    setStatusText("Đang tạo yêu cầu…");
    try {
      const body = override
        ? { channel_id: channelId, start: fmtClipTime(override.start), end: fmtClipTime(override.end) }
        : useCustom
          ? { channel_id: channelId, start: fmtClipTime(start), end: fmtClipTime(end) }
          : { channel_id: channelId, quick_min: quickMin };
      const { clip_id, name } = await createClip(baseUrl, body);
      setPhase("running");
      pollingRef.current = { stop: false };
      const deadline = Date.now() + 20 * 60 * 1000; // timeout 20 phút
      // Vòng poll 1.5s.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (pollingRef.current.stop) return;
        if (Date.now() > deadline) throw new Error("Quá thời gian xử lý, thử lại.");
        await new Promise((r) => setTimeout(r, 1500));
        let s: ClipStatus;
        try { s = await pollClip(baseUrl, clip_id); } catch { continue; }
        if (s.status === "done") {
          setPct(100);
          setPhase("done");
          setResult({ clipId: clip_id, name: s.name || name, size: s.size });
          setStatusText("");
          const item: ClipHistoryItem = {
            clipId: clip_id, name: s.name || name, baseUrl, venueName: String(venueName || ""),
            channelName, createdAt: Date.now(), size: s.size,
          };
          addHistory(item);
          setHistory((h) => [item, ...h.filter((x) => x.clipId !== clip_id)]);
          return;
        }
        if (s.status === "error") throw new Error(s.err || "Cắt clip thất bại");
        setPct(computeProgress(s));
        setStatusText(
          s.phase === "fast_download" ? "Đang tải nhanh từ đầu ghi…"
            : s.phase === "rtsp_fallback" ? `Đang ghi lại (×${(s.progress?.speed || 0).toFixed(2)})…`
              : "Đang xử lý…",
        );
      }
    } catch (e: any) {
      setPhase("error");
      setStatusText(e?.message || "Có lỗi, vui lòng thử lại.");
    }
  }, [phase, useCustom, customValid, customMsg, channelId, start, end, quickMin, baseUrl, venueName, channelName]);

  // Cắt từ vị trí đang tua trên dòng thời gian (quickMin phút kể từ đó).
  const cutFromScrub = useCallback(() => {
    const s = new Date(scrubTime);
    const e = new Date(Math.min(s.getTime() + quickMin * 60000, Date.now()));
    onCut({ start: s, end: e });
  }, [scrubTime, quickMin, onCut]);

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
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
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

        {/* Dòng thời gian — tua xem như DMSS */}
        <View style={styles.tlHeaderRow}>
          <Text style={[styles.sectionTitle, { color: C.text, marginTop: 20 }]}>Tua theo dòng thời gian</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Pressable onPress={() => shiftWin(-TL_WIN_MS / 2)} style={[styles.tlNav, { borderColor: C.border }]}>
              <Ionicons name="chevron-back" size={16} color={C.text} />
            </Pressable>
            <Pressable onPress={() => shiftWin(TL_WIN_MS / 2)} style={[styles.tlNav, { borderColor: C.border }]}>
              <Ionicons name="chevron-forward" size={16} color={C.text} />
            </Pressable>
          </View>
        </View>
        <Text style={{ color: C.primary, fontWeight: "800", fontSize: 15, marginBottom: 6 }}>
          {hhmm(scrubTime)}  <Text style={{ color: C.sub, fontWeight: "500", fontSize: 12 }}>· {pad2(scrubTime.getDate())}/{pad2(scrubTime.getMonth() + 1)}</Text>
        </Text>
        <Timeline C={C} winStart={winStart} winMs={TL_WIN_MS} scrubTime={scrubTime} onScrub={setScrubTime} onCommit={(t) => { setScrubTime(t); startPlaybackAt(t); }} />
        <Pressable onPress={cutFromScrub} disabled={busy} style={[styles.previewBtn, { borderColor: C.primary, marginTop: 12, opacity: busy ? 0.6 : 1 }]}>
          <Ionicons name="cut" size={17} color={C.primary} />
          <Text style={{ color: C.primary, fontWeight: "700", marginLeft: 8 }}>Cắt {quickMin} phút từ {hhmm(scrubTime)}</Text>
        </Pressable>

        {/* Chọn khoảng cắt */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>Chọn khoảng cắt</Text>
        <View style={styles.chipsRow}>
          {QUICK_MINUTES.map((m) => {
            const on = !useCustom && quickMin === m;
            return (
              <Pressable
                key={m}
                onPress={() => { setUseCustom(false); setQuickMin(m); }}
                style={[styles.chip, { backgroundColor: on ? C.primary : C.field, borderColor: on ? C.primary : C.border }]}
              >
                <Text style={{ color: on ? C.onPrimary : C.text, fontWeight: "700" }}>{m} phút</Text>
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
        {phase === "done" && result && (
          <View style={[styles.resultCard, { backgroundColor: C.greenSoft, borderColor: C.greenText }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="checkmark-circle" size={22} color={C.greenText} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text numberOfLines={1} style={{ color: C.text, fontWeight: "700" }}>{result.name}</Text>
                {!!result.size && <Text style={{ color: C.sub, fontSize: 12 }}>{humanSize(result.size)}</Text>}
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              {/* Nút "Lưu vào máy" tạm ẩn — cần build native (expo-media-library) mới bật. */}
              <Pressable onPress={() => shareClip(result.clipId, result.name)} disabled={sharing} style={[styles.resBtn, { backgroundColor: C.primary }]}>
                {sharing ? <ActivityIndicator color={C.onPrimary} size="small" /> : <Ionicons name="share-social" size={16} color={C.onPrimary} />}
                <Text style={{ color: C.onPrimary, fontWeight: "700", marginLeft: 6 }}>Tải / Chia sẻ</Text>
              </Pressable>
            </View>
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
