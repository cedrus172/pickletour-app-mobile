// app/var/create.tsx — Tạo Highlight & VAR (mockup docs/mockups/highlight-var-1-tao-video.png)
// Nguồn: clip camera sân (chỉ người được cấp quyền xem cam / chủ sân) hoặc video tải lên. Tối đa 5 phút.
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useSelector } from "react-redux";
import { Text } from "@/components/ui/i18nText";
import TextInput from "@/components/ui/i18nTextInput";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { useMyCamClipAccessQuery } from "@/slices/camClipApiSlice";
import { useCreateVarJobMutation, useGetMyPcoinQuery } from "@/slices/varApiSlice";
import { BASE_URL } from "@/slices/apiSlice";
import { getHistory, pollClip, thumbnailUrl, type ClipHistoryItem } from "@/utils/pickclip";
import { VOLT, fmtDur } from "@/components/var/VarUi";

const MAX_SEC = 300; // tối đa 5 phút
const CLIP_TTL_MS = 3 * 3600 * 1000;
const SHOW = [
  { key: "scoreboard", label: "Tỉ số" },
  { key: "trail", label: "Đường bóng" },
  { key: "speed", label: "Vận tốc" },
  { key: "minicourt", label: "Mini court" },
  { key: "calls", label: "IN/OUT" },
] as const;
const REPLAY = [
  { key: "close", label: "Sát vạch" },
  { key: "all", label: "Mọi pha" },
  { key: "off", label: "Tắt" },
] as const;

type Source = "camclip" | "recorded" | "upload";
type PickedClip = ClipHistoryItem & { channelId?: number };
type PickedVideo = { uri: string; name: string; type: string; durationSec: number; size?: number };

/** Thanh chọn đoạn (2 đầu kéo). Định nghĩa ngoài màn để không remount khi gõ phím. */
function RangeSlider({ max, value, onChange, C }: { max: number; value: [number, number]; onChange: (v: [number, number]) => void; C: ThemeTokens }) {
  const [w, setW] = useState(1);
  const ref = useRef({ value, w, max, active: 0 as 0 | 1, startX: 0 });
  ref.current.value = value;
  ref.current.w = w;
  ref.current.max = max;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const x = e.nativeEvent.locationX;
          const { value: v, w: W, max: M } = ref.current;
          const xa = (v[0] / M) * W;
          const xb = (v[1] / M) * W;
          ref.current.active = Math.abs(x - xa) <= Math.abs(x - xb) ? 0 : 1;
          ref.current.startX = x;
        },
        onPanResponderMove: (e, g) => {
          const { value: v, w: W, max: M, active, startX } = ref.current;
          const t = Math.max(0, Math.min(M, ((startX + g.dx) / W) * M));
          const next: [number, number] = active === 0 ? [Math.min(t, v[1] - 2), v[1]] : [v[0], Math.max(t, v[0] + 2)];
          onChange([Math.round(Math.max(0, next[0])), Math.round(Math.min(M, next[1]))]);
        },
      }),
    [onChange],
  );
  const a = (value[0] / max) * w;
  const b = (value[1] / max) * w;
  return (
    <View style={[styles.rangeBox, { borderColor: C.border, backgroundColor: C.card }]}>
      <View style={[styles.timeTag, { borderColor: C.border }]}>
        <Text style={{ color: C.text, fontWeight: "700" }}>{fmtDur(value[0])}</Text>
      </View>
      <View style={{ flex: 1, height: 36, justifyContent: "center" }} onLayout={(e) => setW(Math.max(1, e.nativeEvent.layout.width))} {...pan.panHandlers}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: C.border }} />
        <View style={{ position: "absolute", left: a, width: Math.max(0, b - a), height: 4, borderRadius: 2, backgroundColor: C.primary }} />
        <View pointerEvents="none" style={[styles.knob, { left: a - 11, backgroundColor: C.primary }]} />
        <View pointerEvents="none" style={[styles.knob, { left: b - 11, backgroundColor: C.primary }]} />
      </View>
      <View style={[styles.timeTag, { borderColor: C.border }]}>
        <Text style={{ color: C.text, fontWeight: "700" }}>{fmtDur(value[1])}</Text>
      </View>
    </View>
  );
}

export default function VarCreateScreen() {
  const C = useThemeTokens();
  const params = useLocalSearchParams<{ base?: string; clipId?: string; chId?: string; chName?: string; venueName?: string }>();
  const token = useSelector((s: any) => s?.auth?.userInfo?.token);
  const { data: access } = useMyCamClipAccessQuery(undefined as any);
  const [createJob] = useCreateVarJobMutation();
  const { data: wallet, refetch: refetchWallet } = useGetMyPcoinQuery(undefined as any, { skip: !token });
  const price = Number(wallet?.prices?.highlightVar ?? 0);
  const balance = Number(wallet?.balance ?? 0);
  const lacking = !!wallet && price > 0 && balance < price;

  const [source, setSource] = useState<Source>("camclip");
  const [clips, setClips] = useState<PickedClip[]>([]);
  const [clip, setClip] = useState<PickedClip | null>(null);
  const [clipDur, setClipDur] = useState<number>(0);
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [title, setTitle] = useState("");
  const [near, setNear] = useState("");
  const [far, setFar] = useState("");
  const [show, setShow] = useState<Record<string, boolean>>({ scoreboard: true, trail: true, speed: true, minicourt: true, calls: true });
  const [replay, setReplay] = useState<"close" | "all" | "off">("close");
  const [footFault, setFootFault] = useState(true);
  const [aiCheck, setAiCheck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [upPct, setUpPct] = useState<number | null>(null);

  const allowedBases = useMemo(
    () => new Set((access || []).filter((v: any) => v.hasAccess && v.piBaseUrl).map((v: any) => String(v.piBaseUrl).replace(/\/+$/, ""))),
    [access],
  );
  const hasCamAccess = allowedBases.size > 0;

  // Clip camera sân: lấy từ lịch sử Cắt Cam Sân (clip còn trên máy của sân ~3 giờ).
  useEffect(() => {
    (async () => {
      const h = (await getHistory()).filter((x) => Date.now() - x.createdAt < CLIP_TTL_MS);
      const list: PickedClip[] = h.filter((x) => allowedBases.has(String(x.baseUrl).replace(/\/+$/, "")));
      if (params.clipId && params.base) {
        const pre: PickedClip = {
          clipId: String(params.clipId),
          name: String(params.clipId),
          baseUrl: String(params.base),
          venueName: String(params.venueName || ""),
          channelName: String(params.chName || ""),
          channelId: params.chId ? Number(params.chId) : undefined,
          createdAt: Date.now(),
        };
        setClip(pre);
        setClips([pre, ...list.filter((x) => x.clipId !== pre.clipId)]);
      } else {
        setClips(list);
        setClip((c) => c || list[0] || null);
      }
    })();
  }, [allowedBases, params.clipId, params.base, params.venueName, params.chName, params.chId]);

  // Độ dài clip (để chọn đoạn).
  useEffect(() => {
    if (!clip) return;
    let off = false;
    pollClip(clip.baseUrl, clip.clipId)
      .then((s) => {
        if (off) return;
        const d = Math.min(MAX_SEC, Math.round(Number(s.expected_sec) || Number(s.progress?.out_time_sec) || MAX_SEC));
        setClipDur(d);
        setRange([0, d]);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [clip]);

  const duration = source === "upload" ? video?.durationSec || 0 : clipDur;

  const pickVideo = async () => {
    const sel = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 1, videoMaxDuration: MAX_SEC });
    if (sel.canceled) return;
    const a = sel.assets[0];
    const dur = Math.round((Number(a.duration) || 0) / 1000);
    if (dur > MAX_SEC + 2) {
      return Alert.alert("Video quá dài", `Video dài ${fmtDur(dur)} — tối đa 5 phút. Hãy cắt ngắn rồi chọn lại.`);
    }
    if (a.fileSize && a.fileSize > 500 * 1024 * 1024) return Alert.alert("Video quá lớn", "Tối đa 500MB.");
    const name = a.fileName || `video-${Date.now()}.mp4`;
    setVideo({ uri: a.uri, name, type: a.mimeType || "video/mp4", durationSec: dur || MAX_SEC, size: a.fileSize });
    setRange([0, dur || MAX_SEC]);
  };

  const uploadVideo = async (v: PickedVideo): Promise<string> => {
    const task = FileSystem.createUploadTask(
      `${BASE_URL}/api/var/uploads`,
      v.uri,
      {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "file",
        mimeType: v.type,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      (p) => setUpPct(p.totalBytesExpectedToSend ? p.totalBytesSent / p.totalBytesExpectedToSend : 0),
    );
    const r = await task.uploadAsync();
    let body: any = {};
    try {
      body = JSON.parse(r?.body || "{}");
    } catch {
      body = {};
    }
    if (!r || r.status >= 300 || !body.uploadId) throw new Error(body?.message || "Tải video lên thất bại");
    return body.uploadId;
  };

  const submit = async () => {
    if (source === "recorded") return;
    if (source === "camclip" && !clip) return Alert.alert("Chưa chọn clip", "Hãy cắt một clip ở Cắt Cam Sân trước.");
    if (source === "upload" && !video) return Alert.alert("Chưa chọn video", "Chọn video trận (tối đa 5 phút).");
    if (lacking) {
      return Alert.alert("Không đủ PCoin", `Mỗi video cần ${price} PCoin, số dư của bạn còn ${balance}. Liên hệ admin PickleTour để nạp thêm PCoin.`, [
        { text: "Đóng", style: "cancel" },
        { text: "Xem ví PCoin", onPress: () => router.push("/var/pcoin" as any) },
      ]);
    }
    setBusy(true);
    try {
      let src: any;
      if (source === "camclip" && clip) {
        src = { type: "camclip", base: clip.baseUrl, clipId: clip.clipId, channelId: clip.channelId, channelName: clip.channelName };
      } else if (video) {
        src = { type: "upload", uploadId: await uploadVideo(video), fileName: video.name };
      }
      const trim = duration && (range[0] > 0 || range[1] < duration) ? { start_s: range[0], end_s: range[1] } : undefined;
      const job: any = await createJob({
        source: src,
        title: title.trim() || undefined,
        teams: { near: near.trim(), far: far.trim() },
        tournamentTitle: title.trim(),
        trim,
        options: {
          hide: SHOW.filter((s) => !show[s.key]).map((s) => s.key),
          replay,
          foot_fault: footFault,
          claude_check: aiCheck,
        },
      }).unwrap();
      router.replace(`/var` as any);
      if (job?._id) Alert.alert("Đã gửi phân tích", "Video đang được xử lý. Bạn sẽ nhận thông báo khi xong.");
    } catch (e: any) {
      if (e?.status === 402 || e?.data?.code === "pcoin_insufficient") refetchWallet();
      Alert.alert(e?.status === 402 ? "Không đủ PCoin" : "Không tạo được", e?.data?.message || e?.message || "Vui lòng thử lại.");
    } finally {
      setBusy(false);
      setUpPct(null);
    }
  };

  const Section = ({ label, hint }: { label: string; hint?: string }) => (
    <Text style={[styles.section, { color: C.text }]}>
      {label}
      {hint ? <Text style={{ color: C.sub, fontWeight: "500" }}> {hint}</Text> : null}
    </Text>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "", headerShown: true }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 10 }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.h1, { color: C.text }]}>Highlight & VAR</Text>
          <Text style={{ color: C.sub, marginTop: -6, marginBottom: 4 }}>Phân tích video trận bằng AI</Text>

          <Section label="Nguồn video" />
          <View style={[styles.seg, { borderColor: C.border }]}>
            {[
              { k: "camclip" as const, label: "Clip camera sân" },
              { k: "recorded" as const, label: "Video đã ghi" },
              { k: "upload" as const, label: "Tải lên" },
            ].map((o) => (
              <Pressable
                key={o.k}
                accessibilityRole="tab"
                accessibilityState={{ selected: source === o.k }}
                onPress={() => (o.k === "recorded" ? Alert.alert("Sắp có", "Phân tích video trận đã ghi sẽ có ở bản sau.") : setSource(o.k))}
                style={[styles.segItem, source === o.k && { backgroundColor: C.primary }]}
              >
                <Text style={{ color: source === o.k ? C.onPrimary : C.text, fontWeight: "700", fontSize: 13.5 }}>{o.label}</Text>
              </Pressable>
            ))}
          </View>

          {source === "camclip" ? (
            !hasCamAccess ? (
              <View style={[styles.card, { borderColor: C.border, backgroundColor: C.card }]}>
                <Text style={{ color: C.text, fontWeight: "700" }}>Bạn chưa có quyền xem camera sân nào</Text>
                <Text style={{ color: C.sub, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                  Nguồn này chỉ dành cho chủ sân hoặc người được cấp quyền xem camera. Bạn vẫn có thể chọn “Tải lên”.
                </Text>
              </View>
            ) : clip ? (
              <View style={[styles.card, { borderColor: C.border, backgroundColor: C.card, flexDirection: "row", gap: 12 }]}>
                <View style={[styles.thumb, { backgroundColor: C.field }]}>
                  {clip.channelId != null ? (
                    <ExpoImage source={{ uri: thumbnailUrl(clip.baseUrl, clip.channelId) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <Ionicons name="videocam-outline" size={26} color={C.sub} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: C.text, fontWeight: "800", fontSize: 15 }} numberOfLines={1}>
                    {[clip.channelName, clip.venueName].filter(Boolean).join(" · ") || "Clip camera sân"}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12.5 }}>
                    {new Date(clip.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    {clipDur ? ` · ${fmtDur(clipDur)}` : ""}
                  </Text>
                  {clips.length > 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        Alert.alert(
                          "Chọn clip",
                          undefined,
                          [
                            ...clips.slice(0, 6).map((c) => ({
                              text: `${c.channelName || "Camera"} · ${new Date(c.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`,
                              onPress: () => setClip(c),
                            })),
                            { text: "Huỷ", style: "cancel" as const },
                          ],
                        )
                      }
                    >
                      <Text style={{ color: C.primary, fontWeight: "700", fontSize: 13 }}>Đổi clip ({clips.length})</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/clip-cam" as any)}
                style={[styles.card, { borderColor: C.border, backgroundColor: C.card, alignItems: "center", gap: 6 }]}
              >
                <Ionicons name="cut-outline" size={24} color={C.primary} />
                <Text style={{ color: C.text, fontWeight: "800" }}>Chưa có clip camera nào</Text>
                <Text style={{ color: C.sub, fontSize: 13, textAlign: "center" }}>Mở Cắt Cam Sân để cắt clip (tối đa 5 phút), rồi quay lại đây.</Text>
              </Pressable>
            )
          ) : source === "upload" ? (
            <Pressable
              accessibilityRole="button"
              onPress={pickVideo}
              style={[styles.card, { borderColor: C.border, backgroundColor: C.card, flexDirection: "row", gap: 12, alignItems: "center" }]}
            >
              <View style={[styles.thumb, { backgroundColor: C.field }]}>
                {video ? <ExpoImage source={{ uri: video.uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="cloud-upload-outline" size={26} color={C.primary} />}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: C.text, fontWeight: "800" }} numberOfLines={1}>{video ? video.name : "Chọn video từ máy"}</Text>
                <Text style={{ color: C.sub, fontSize: 12.5 }}>
                  {video ? `${fmtDur(video.durationSec)}${video.size ? ` · ${Math.round(video.size / 1048576)}MB` : ""}` : "Camera cố định thấy toàn sân · tối đa 5 phút"}
                </Text>
              </View>
            </Pressable>
          ) : null}

          <Section label="Gắn trận" hint="(tuỳ chọn)" />
          <View style={[styles.card, { borderColor: C.border, backgroundColor: C.card, gap: 8 }]}>
            <TextInput value={title} onChangeText={setTitle} placeholder="Tên trận / giải (vd. Chung kết Đôi Nam)" placeholderTextColor={C.sub} style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.field }]} />
            <TextInput value={near} onChangeText={setNear} placeholder="Đội gần camera (vd. Minh / Tuấn)" placeholderTextColor={C.sub} style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.field }]} />
            <TextInput value={far} onChangeText={setFar} placeholder="Đội xa camera (vd. Hoàng / Quân)" placeholderTextColor={C.sub} style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.field }]} />
          </View>

          {duration > 2 ? (
            <>
              <Section label="Đoạn cần phân tích" />
              <RangeSlider max={duration} value={range} onChange={setRange} C={C} />
            </>
          ) : null}

          <Section label="Hiển thị trên video" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SHOW.map((s) => {
              const on = show[s.key];
              return (
                <Pressable
                  key={s.key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => setShow((x) => ({ ...x, [s.key]: !x[s.key] }))}
                  style={[styles.chip, { borderColor: on ? C.primary : C.border }]}
                >
                  <Text style={{ color: C.text, fontWeight: "700", fontSize: 13 }}>{s.label}</Text>
                  <Ionicons name={on ? "checkmark-circle" : "ellipse-outline"} size={18} color={on ? C.primary : C.sub} />
                </Pressable>
              );
            })}
          </View>

          <Section label="VAR" />
          <View style={[styles.card, { borderColor: C.border, backgroundColor: C.card, padding: 0 }]}>
            <View style={[styles.row, { borderBottomColor: C.border, borderBottomWidth: 1 }]}>
              <Text style={{ color: C.text, fontWeight: "700", flex: 1 }}>Mô phỏng điểm chạm</Text>
              <View style={[styles.segSmall, { borderColor: C.border }]}>
                {REPLAY.map((r) => (
                  <Pressable key={r.key} onPress={() => setReplay(r.key)} style={[styles.segSmallItem, replay === r.key && { backgroundColor: C.primary }]}>
                    <Text style={{ color: replay === r.key ? C.onPrimary : C.text, fontSize: 12.5, fontWeight: "700" }}>{r.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={[styles.row, { borderBottomColor: C.border, borderBottomWidth: 1 }]}>
              <Text style={{ color: C.text, fontWeight: "700", flex: 1 }}>Bắt lỗi chân trong bếp</Text>
              <Switch value={footFault} onValueChange={setFootFault} trackColor={{ true: VOLT, false: C.border }} thumbColor="#fff" />
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: "700" }}>AI soi lại pha quyết định</Text>
                <Text style={{ color: C.sub, fontSize: 11.5 }}>Tính phí · tối đa 3 video/ngày</Text>
              </View>
              <Switch value={aiCheck} onValueChange={setAiCheck} trackColor={{ true: VOLT, false: C.border }} thumbColor="#fff" />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: C.bg }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}>
            <Ionicons name="information-circle-outline" size={16} color={VOLT} />
            <Text style={{ color: VOLT, fontSize: 12.5 }}>Xử lý khoảng 3–10 phút · Sẽ báo khi xong</Text>
          </View>
          {wallet && price > 0 ? (
            <Pressable onPress={() => router.push("/var/pcoin" as any)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}>
              <Ionicons name="logo-bitcoin" size={15} color={lacking ? C.redText : "#f59e0b"} />
              <Text style={{ color: lacking ? C.redText : C.sub, fontSize: 12.5, fontWeight: "700" }}>
                Phí {price} PCoin · Số dư {balance.toLocaleString("vi-VN")} PCoin{lacking ? " (không đủ)" : ""}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={busy || source === "recorded"}
            onPress={submit}
            style={[styles.cta, { backgroundColor: busy ? C.border : VOLT }]}
          >
            {busy ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator color="#0B1B3A" />
                <Text style={styles.ctaText}>{upPct != null ? `Đang tải lên ${Math.round(upPct * 100)}%` : "Đang gửi…"}</Text>
              </View>
            ) : (
              <Text style={styles.ctaText}>{price > 0 ? `Bắt đầu phân tích · ${price} PCoin` : "Bắt đầu phân tích"}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: "900" },
  section: { fontSize: 16, fontWeight: "800", marginTop: 8 },
  seg: { flexDirection: "row", borderWidth: 1, borderRadius: 14, padding: 3, gap: 3 },
  segItem: { flex: 1, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: 16, padding: 12 },
  thumb: { width: 132, height: 80, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  rangeBox: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  timeTag: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  knob: { position: "absolute", width: 22, height: 22, borderRadius: 11, top: 7 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, height: 38 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, minHeight: 56 },
  segSmall: { flexDirection: "row", borderWidth: 1, borderRadius: 10, padding: 2 },
  segSmallItem: { paddingHorizontal: 10, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  cta: { height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#0B1B3A", fontSize: 18, fontWeight: "900" },
});
