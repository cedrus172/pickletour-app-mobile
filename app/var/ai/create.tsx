// app/var/ai/create.tsx — Tạo "Highlight AI phân tích": clip ≤ 1 phút (camera đứng yên) → video dọc phân tích từng cú.
import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useSelector } from "react-redux";
import { Text } from "@/components/ui/i18nText";
import TextInput from "@/components/ui/i18nTextInput";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { useCreateAiHighlightMutation, useGetMyPcoinQuery } from "@/slices/varApiSlice";
import { BASE_URL } from "@/slices/apiSlice";
import { VOLT, fmtDur } from "@/components/var/VarUi";

const MAX_SEC = 15 * 60;
const MIN_SEC = 8;
const MAX_BYTES = 1024 * 1024 * 1024;
const RED = "#ff5468";
const BLUE = "#48b8ff";

type PickedVideo = { uri: string; name: string; type: string; durationSec: number; size?: number };

/** Ô nhập tên VĐV — định nghĩa ngoài màn để bàn phím không đóng mỗi lần gõ. */
function NameField({ label, color, value, onChange, C }: { label: string; color: string; value: string; onChange: (v: string) => void; C: ThemeTokens }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Text style={{ color: C.sub, fontSize: 12.5, fontWeight: "700" }}>{label}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={label}
        placeholderTextColor={C.muted}
        maxLength={40}
        style={[styles.input, { color: C.text, backgroundColor: C.field, borderColor: C.border }]}
      />
    </View>
  );
}

function Step({ icon, text, C }: { icon: any; text: string; C: ThemeTokens }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <Ionicons name={icon} size={18} color={C.primary} style={{ marginTop: 1 }} />
      <Text style={{ color: C.text, fontSize: 13.5, flex: 1, lineHeight: 19 }}>{text}</Text>
    </View>
  );
}

export default function AiHighlightCreateScreen() {
  const C = useThemeTokens();
  const token = useSelector((s: any) => s?.auth?.userInfo?.token);
  const { data: wallet, refetch: refetchWallet } = useGetMyPcoinQuery(undefined as any, { skip: !token });
  const [createJob] = useCreateAiHighlightMutation();
  const price = Number(wallet?.prices?.aiHighlight ?? 10);
  const balance = Number(wallet?.balance ?? 0);
  const lacking = !!wallet && price > 0 && balance < price;

  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [start, setStart] = useState(0);
  const [title, setTitle] = useState("");
  const [names, setNames] = useState(["", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [upPct, setUpPct] = useState<number | null>(null);

  const dur = video?.durationSec || 0;
  const long = dur > MAX_SEC + 1;
  const segEnd = long ? Math.min(dur, start + MAX_SEC) : dur;
  const setName = (i: number) => (v: string) => setNames((n) => n.map((x, k) => (k === i ? v : x)));
  const moveStart = (d: number) => setStart((s) => Math.max(0, Math.min(Math.max(0, dur - MAX_SEC), s + d)));

  const pickVideo = async () => {
    const sel = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 1 });
    if (sel.canceled) return;
    const a = sel.assets[0];
    const d = Math.round((Number(a.duration) || 0) / 1000);
    if (a.fileSize && a.fileSize > MAX_BYTES) return Alert.alert("Video quá lớn", "Tối đa 1GB / video.");
    if (d && d < MIN_SEC) return Alert.alert("Video quá ngắn", `Cần tối thiểu ${MIN_SEC} giây.`);
    if (d > 60 * 60) return Alert.alert("Video quá dài", "Hãy cắt còn dưới 1 giờ rồi chọn lại (Highlight AI dùng tối đa 15 phút trong đó).");
    setVideo({ uri: a.uri, name: a.fileName || `video-${Date.now()}.mp4`, type: a.mimeType || "video/mp4", durationSec: d || MAX_SEC, size: a.fileSize });
    setStart(0);
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
    if (!token) return router.push("/login" as any);
    if (!video) return Alert.alert("Chưa chọn video", "Chọn video pickleball dài tối đa 15 phút.");
    if (lacking) {
      return Alert.alert("Không đủ PCoin", `Mỗi video cần ${price} PCoin, số dư của bạn còn ${balance}. Liên hệ admin PickleTour để nạp thêm PCoin.`, [
        { text: "Đóng", style: "cancel" },
        { text: "Xem ví PCoin", onPress: () => router.push("/var/pcoin" as any) },
      ]);
    }
    setBusy(true);
    try {
      const uploadId = await uploadVideo(video);
      setUpPct(null);
      const job: any = await createJob({
        uploadId,
        fileName: video.name,
        title: title.trim(),
        players: names.map((n) => n.trim()),
        trim: long ? { start_s: start, end_s: segEnd } : undefined,
      }).unwrap();
      router.replace(`/var/ai/${job._id}` as any);
    } catch (e: any) {
      if (e?.status === 402 || e?.data?.code === "pcoin_insufficient") refetchWallet();
      Alert.alert(e?.status === 402 ? "Không đủ PCoin" : "Không tạo được", e?.data?.message || e?.message || "Vui lòng thử lại.");
    } finally {
      setBusy(false);
      setUpPct(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Highlight AI", headerShown: true }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.hero, { borderColor: C.border, backgroundColor: C.card }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="sparkles" size={20} color={VOLT} />
              <Text style={{ color: C.text, fontSize: 18, fontWeight: "900" }}>Highlight AI phân tích</Text>
            </View>
            <Text style={{ color: C.sub, fontSize: 13.5, lineHeight: 19 }}>
              AI xem từng cú đánh: ai đánh, loại cú, tốc độ ước lượng, đường bóng, sơ đồ sân, quay chậm cú quyết định — tự chọn những pha hay nhất. Ra
              video dọc 1080×1920 sẵn đăng TikTok / Reels. Clip 1 phút mất khoảng 5 phút; clip 15 phút khoảng 30 phút.
            </Text>
          </View>

          <Text style={[styles.section, { color: C.text }]}>1. Chọn video (tối đa 15 phút)</Text>
          <Pressable accessibilityRole="button" onPress={pickVideo} disabled={busy} style={[styles.pick, { borderColor: video ? C.primary : C.border, backgroundColor: C.card }]}>
            <Ionicons name={video ? "videocam" : "cloud-upload-outline"} size={24} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: "800" }} numberOfLines={1}>
                {video ? video.name : "Chọn video từ thư viện"}
              </Text>
              <Text style={{ color: C.sub, fontSize: 12.5 }}>
                {video ? `${fmtDur(dur)}${video.size ? ` · ${Math.round(video.size / 1048576)}MB` : ""}` : "Camera sân hoặc điện thoại đặt chân máy"}
              </Text>
            </View>
            <Text style={{ color: C.primary, fontWeight: "700" }}>{video ? "Đổi" : "Chọn"}</Text>
          </Pressable>
          {long ? (
            <View style={[styles.card, { borderColor: C.border, backgroundColor: C.card, gap: 10 }]}>
              <Text style={{ color: C.text, fontWeight: "800" }}>
                Video dài {fmtDur(dur)} — chọn đoạn 15 phút: {fmtDur(start)} → {fmtDur(segEnd)}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[-60, -10, 10, 60].map((d) => (
                  <Pressable key={d} accessibilityRole="button" onPress={() => moveStart(d)} style={[styles.stepBtn, { borderColor: C.border, backgroundColor: C.field }]}>
                    <Text style={{ color: C.text, fontWeight: "800" }}>{d > 0 ? `+${d}s` : `${d}s`}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={[styles.card, { borderColor: C.border, backgroundColor: C.card, gap: 10 }]}>
            <Text style={{ color: C.text, fontWeight: "800" }}>Để AI phân tích chính xác</Text>
            <Step icon="camera-outline" text="Camera đứng yên suốt clip (camera sân, hoặc điện thoại trên chân máy sau vạch cuối sân)." C={C} />
            <Step icon="scan-outline" text="Thấy rõ các vạch sân và cả 4 người chơi (đánh đôi)." C={C} />
            <Step icon="tennisball-outline" text="Clip có pha bóng đang diễn ra — AI tự cắt bỏ thời gian chết." C={C} />
          </View>

          <Text style={[styles.section, { color: C.text }]}>2. Tên giải / trận (tuỳ chọn)</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Để trống: AI đọc tên sân trên clip"
            placeholderTextColor={C.muted}
            maxLength={80}
            style={[styles.input, { color: C.text, backgroundColor: C.field, borderColor: C.border }]}
          />

          <Text style={[styles.section, { color: C.text }]}>3. Tên vận động viên (tuỳ chọn)</Text>
          <Text style={{ color: C.sub, fontSize: 12.5, marginTop: -6 }}>
            Mỗi đội: người đứng bên TRÁI (nhìn từ camera, đầu clip) nhập ô đầu. Để trống sẽ hiện VĐV 1–4.
          </Text>
          <Text style={{ color: RED, fontWeight: "800", fontSize: 13 }}>Đội A · nửa sân gần camera</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <NameField label="VĐV 1" color={RED} value={names[0]} onChange={setName(0)} C={C} />
            <NameField label="VĐV 2" color={RED} value={names[1]} onChange={setName(1)} C={C} />
          </View>
          <Text style={{ color: BLUE, fontWeight: "800", fontSize: 13 }}>Đội B · nửa sân xa camera</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <NameField label="VĐV 3" color={BLUE} value={names[2]} onChange={setName(2)} C={C} />
            <NameField label="VĐV 4" color={BLUE} value={names[3]} onChange={setName(3)} C={C} />
          </View>

          <View style={[styles.card, { borderColor: C.border, backgroundColor: C.card, flexDirection: "row", alignItems: "center", gap: 10 }]}>
            <Ionicons name="logo-bitcoin" size={20} color="#f59e0b" />
            <Text style={{ color: C.text, flex: 1 }}>
              {price > 0 ? `${price} PCoin / video · số dư ${balance.toLocaleString("vi-VN")}` : "Đang miễn phí"}
            </Text>
            <Text style={{ color: C.sub, fontSize: 12 }}>Lỗi được hoàn</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={submit}
            disabled={busy}
            style={[styles.submit, { backgroundColor: lacking ? C.field : C.primary, opacity: busy ? 0.7 : 1 }]}
          >
            {busy ? <ActivityIndicator color={C.onPrimary} /> : <Ionicons name="sparkles" size={18} color={lacking ? C.sub : C.onPrimary} />}
            <Text style={{ color: lacking ? C.sub : C.onPrimary, fontWeight: "900", fontSize: 16 }}>
              {upPct != null ? `Đang tải lên ${Math.round(upPct * 100)}%` : busy ? "Đang gửi…" : price > 0 ? `Tạo Highlight AI · ${price} PCoin` : "Tạo Highlight AI"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12 },
  section: { fontSize: 16, fontWeight: "900" },
  pick: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 14, padding: 14 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 46, fontSize: 15 },
  stepBtn: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  submit: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 54, borderRadius: 16, marginTop: 4 },
});
