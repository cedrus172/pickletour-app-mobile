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

  // ── Live preview ────────────────────────────────────────────────────────────
  const [manifest, setManifest] = useState<string>("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const streamRef = useRef<StreamSession | null>(null);

  const startPreview = useCallback(async () => {
    if (manifest || previewBusy) return;
    setPreviewBusy(true);
    try {
      const s = await startStream(baseUrl, channelId, "live");
      streamRef.current = s;
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

  const onCut = useCallback(async () => {
    if (phase === "creating" || phase === "running") return;
    const now = Date.now();
    if (now - lastCutRef.current < 2000) return; // debounce 2s
    lastCutRef.current = now;
    if (useCustom && !customValid) {
      Alert.alert("Thời gian không hợp lệ", `Khoảng cắt phải từ nhỏ hơn đến lớn hơn và tối đa ${MAX_CLIP_MINUTES} phút.`);
      return;
    }
    setPhase("creating");
    setPct(0);
    setResult(null);
    setStatusText("Đang tạo yêu cầu…");
    try {
      const body = useCustom
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
  }, [phase, useCustom, customValid, channelId, start, end, quickMin, baseUrl, venueName, channelName]);

  // ── Tải / chia sẻ ──────────────────────────────────────────────────────────
  const [sharing, setSharing] = useState(false);
  const shareClip = useCallback(async (clipId: string, name: string) => {
    if (sharing) return;
    setSharing(true);
    try {
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const safe = (name || `clip-${clipId}.mp4`).replace(/[^\w.\-]+/g, "_");
      const dest = `${dir}${safe}`;
      const dl = await FileSystem.downloadAsync(clipDownloadUrl(baseUrl, clipId), dest);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri, { mimeType: "video/mp4", UTI: "public.mpeg-4", dialogTitle: "Chia sẻ / lưu clip" });
      } else {
        Alert.alert("Đã tải", "Clip đã được tải về máy.");
      }
    } catch (e: any) {
      Alert.alert("Lỗi tải clip", e?.message || "Không tải được clip (có thể đã quá hạn).");
    } finally {
      setSharing(false);
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
              {customValid ? `Độ dài: ${customMinutes} phút` : `Tối đa ${MAX_CLIP_MINUTES} phút, kết thúc phải sau bắt đầu.`}
            </Text>
          </View>
        )}

        {/* Nút cắt */}
        <Pressable
          onPress={onCut}
          disabled={busy || (useCustom && !customValid)}
          style={[styles.cutBtn, { backgroundColor: C.primary, opacity: busy || (useCustom && !customValid) ? 0.6 : 1 }]}
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
              <Pressable onPress={() => saveToAlbum(result.clipId, result.name)} disabled={sharing} style={[styles.resBtn, { backgroundColor: C.primary }]}>
                {sharing ? <ActivityIndicator color={C.onPrimary} size="small" /> : <Ionicons name="download" size={16} color={C.onPrimary} />}
                <Text style={{ color: C.onPrimary, fontWeight: "700", marginLeft: 6 }}>Lưu vào máy</Text>
              </Pressable>
              <Pressable onPress={() => shareClip(result.clipId, result.name)} disabled={sharing} style={[styles.resBtn, { backgroundColor: C.field, borderWidth: 1, borderColor: C.border }]}>
                <Ionicons name="share-social-outline" size={16} color={C.text} />
                <Text style={{ color: C.text, fontWeight: "700", marginLeft: 6 }}>Chia sẻ</Text>
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
        <Pressable onPress={onShare} disabled={alive === null} style={{ padding: 8 }}>
          <Ionicons name="share-social-outline" size={18} color={alive === null ? C.muted : C.primary} />
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
    shareBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  });
