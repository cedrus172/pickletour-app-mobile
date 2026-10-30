// app/owner/venue/[id]/clip-cam.tsx — Chủ sân/admin quản lý QUYỀN Cắt Cam Sân:
// bật/tắt + đặt Pi base URL; cấp/thu hồi quyền cho user (1 tuần/tháng/năm/vĩnh viễn).
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/i18nText";
import PtInput from "@/components/ui/PtInput";
import I18nTextInput from "@/components/ui/i18nTextInput";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import {
  useCamClipGrantsQuery,
  useCamClipCamerasQuery,
  useSetCamClipConfigMutation,
  useAddCamClipGrantMutation,
  useUpdateCamClipGrantMutation,
  useRemoveCamClipGrantMutation,
} from "@/slices/camClipApiSlice";

const DURATIONS = [
  { label: "1 tuần", days: 7 },
  { label: "1 tháng", days: 30 },
  { label: "1 năm", days: 365 },
  { label: "Vĩnh viễn", days: 0 },
];

function expiryLabel(expiresAt: string | null, expired?: boolean): string {
  if (expired) return "Hết hạn";
  if (!expiresAt) return "Vĩnh viễn";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Hết hạn";
  const h = Math.floor(ms / 3600000);
  if (h < 24) return `Còn ${h} giờ`;
  return `Còn ${Math.floor(h / 24)} ngày`;
}

export default function ClipCamGrantsScreen() {
  const C = useThemeTokens();
  const styles = useMemo(() => mkStyles(C), [C]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const venueId = String(id || "");

  const { data, isLoading, refetch } = useCamClipGrantsQuery(venueId, { skip: !venueId });
  const { data: camData } = useCamClipCamerasQuery(venueId, { skip: !venueId });
  const [setConfig, { isLoading: savingCfg }] = useSetCamClipConfigMutation();
  const [addGrant, { isLoading: adding }] = useAddCamClipGrantMutation();
  const [updateGrant, { isLoading: updating }] = useUpdateCamClipGrantMutation();
  const [removeGrant] = useRemoveCamClipGrantMutation();

  // Cấu hình
  const [enabled, setEnabled] = useState(false);
  const [piBaseUrl, setPiBaseUrl] = useState("");
  useEffect(() => {
    if (data?.config) {
      setEnabled(!!data.config.enabled);
      setPiBaseUrl(data.config.piBaseUrl || "");
    }
  }, [data?.config]);

  // Cấp quyền mới / sửa quyền đã cấp (editingId != null → đang sửa)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [phone, setPhone] = useState("");
  const [days, setDays] = useState<number>(30); // -1 = giữ nguyên hạn (chỉ khi sửa)
  const [note, setNote] = useState("");
  const [camMode, setCamMode] = useState<"all" | "pick">("all");
  const [picked, setPicked] = useState<number[]>([]);
  const cameras: { id: number; name: string }[] = camData?.cameras || [];
  const camName = (camId: number) => cameras.find((c) => c.id === camId)?.name || `Camera ${camId}`;
  const togglePick = (camId: number) =>
    setPicked((prev) => (prev.includes(camId) ? prev.filter((x) => x !== camId) : [...prev, camId]));

  const onSaveConfig = async () => {
    try {
      await setConfig({ venueId, enabled, piBaseUrl: piBaseUrl.trim() }).unwrap();
      Alert.alert("Đã lưu", "Cấu hình Cắt Cam Sân đã cập nhật.");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.data?.message || e?.message || "Không lưu được.");
    }
  };

  const resetForm = () => {
    setEditingId(null); setEditingName(""); setPhone(""); setDays(30);
    setNote(""); setCamMode("all"); setPicked([]);
  };

  // Nạp quyền đã cấp vào form để sửa (phạm vi camera, ghi chú, hạn).
  const startEdit = (g: any) => {
    setEditingId(g._id);
    setEditingName(g.user?.name || g.user?.nickname || g.user?.phone || "Người dùng");
    setPhone(g.user?.phone || "");
    setNote(g.note || "");
    const cams: number[] = Array.isArray(g.cameras) ? g.cameras : [];
    setCamMode(cams.length ? "pick" : "all");
    setPicked(cams);
    setDays(-1); // mặc định giữ nguyên hạn khi sửa
  };

  const onSubmit = async () => {
    if (camMode === "pick" && picked.length === 0) {
      Alert.alert("Chưa chọn camera", "Chọn ít nhất một camera hoặc đổi sang Tất cả camera."); return;
    }
    const cameras = camMode === "pick" ? picked : [];
    try {
      if (editingId) {
        await updateGrant({
          id: editingId,
          venueId,
          cameras,
          note: note.trim(),
          // days === -1 → bỏ qua, giữ nguyên hạn; ngược lại đặt hạn mới.
          ...(days >= 0 ? { durationDays: days } : {}),
        }).unwrap();
        resetForm();
        Alert.alert("Đã lưu", "Quyền cắt cam đã được cập nhật.");
      } else {
        const p = phone.trim();
        if (!p) { Alert.alert("Thiếu số điện thoại", "Nhập số điện thoại người được cấp quyền."); return; }
        await addGrant({ venueId, phone: p, durationDays: days, note: note.trim(), cameras }).unwrap();
        resetForm();
        Alert.alert("Đã cấp quyền", "Người dùng đã được cấp quyền cắt cam.");
      }
    } catch (e: any) {
      Alert.alert(editingId ? "Không lưu được" : "Không cấp được", e?.data?.message || e?.message || "Vui lòng thử lại.");
    }
  };

  const onRemove = (g: any) => {
    Alert.alert("Thu hồi quyền?", `Thu hồi quyền cắt cam của ${g.user?.name || g.user?.phone || "người này"}?`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Thu hồi", style: "destructive",
        onPress: async () => {
          try { await removeGrant({ id: g._id, venueId }).unwrap(); }
          catch (e: any) { Alert.alert("Lỗi", e?.data?.message || "Không thu hồi được."); }
        },
      },
    ]);
  };

  const grants = data?.grants || [];

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Quyền Cắt Cam Sân", headerShown: true }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {isLoading ? (
            <View style={styles.center}><ActivityIndicator color={C.primary} /></View>
          ) : (
            <>
              {/* Cấu hình */}
              <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[styles.cardTitle, { color: C.text }]}>Cấu hình</Text>
                <View style={styles.rowBetween}>
                  <Text style={{ color: C.text, fontWeight: "600" }}>Bật Cắt Cam Sân</Text>
                  <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: C.primary, false: "#94a3b8" }} thumbColor="#fff" />
                </View>
                <Text style={[styles.label, { color: C.sub }]}>Pi base URL (camera venue)</Text>
                <I18nTextInput
                  value={piBaseUrl}
                  onChangeText={setPiBaseUrl}
                  placeholder="https://quangtrung.pickletour.vn"
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={[styles.input, { backgroundColor: C.field, color: C.text, borderColor: C.border }]}
                />
                <Pressable onPress={onSaveConfig} disabled={savingCfg} style={[styles.primaryBtn, { backgroundColor: C.primary, opacity: savingCfg ? 0.6 : 1 }]}>
                  {savingCfg ? <ActivityIndicator color={C.onPrimary} size="small" /> : <Ionicons name="save-outline" size={16} color={C.onPrimary} />}
                  <Text style={{ color: C.onPrimary, fontWeight: "700", marginLeft: 6 }}>Lưu cấu hình</Text>
                </Pressable>
              </View>

              {/* Cấp quyền / Sửa quyền */}
              <View style={[styles.card, { backgroundColor: C.card, borderColor: editingId ? C.primary : C.border }]}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.cardTitle, { color: C.text, marginBottom: 0 }]}>
                    {editingId ? `Sửa quyền — ${editingName}` : "Cấp quyền cho người dùng"}
                  </Text>
                  {editingId && (
                    <Pressable onPress={resetForm} style={{ padding: 4 }}>
                      <Text style={{ color: C.sub, fontWeight: "700" }}>Huỷ</Text>
                    </Pressable>
                  )}
                </View>
                {editingId ? (
                  <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="person-circle-outline" size={20} color={C.sub} />
                    <Text style={{ color: C.sub, fontSize: 13 }}>{phone || "—"}</Text>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.label, { color: C.sub }]}>Số điện thoại</Text>
                    <PtInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="VD: 0912345678"
                      placeholderTextColor={C.muted}
                      keyboardType="phone-pad"
                      style={[styles.input, { backgroundColor: C.field, color: C.text, borderColor: C.border }]}
                    />
                  </>
                )}
                <Text style={[styles.label, { color: C.sub }]}>Thời hạn</Text>
                <View style={styles.chipsRow}>
                  {(editingId ? [{ label: "Giữ nguyên", days: -1 }, ...DURATIONS] : DURATIONS).map((d) => {
                    const on = days === d.days;
                    return (
                      <Pressable key={d.label} onPress={() => setDays(d.days)} style={[styles.chip, { backgroundColor: on ? C.primary : C.field, borderColor: on ? C.primary : C.border }]}>
                        <Text style={{ color: on ? C.onPrimary : C.text, fontWeight: "700" }}>{d.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.label, { color: C.sub }]}>Phạm vi camera</Text>
                <View style={styles.chipsRow}>
                  {(["all", "pick"] as const).map((m) => {
                    const on = camMode === m;
                    return (
                      <Pressable key={m} onPress={() => setCamMode(m)} style={[styles.chip, { backgroundColor: on ? C.primary : C.field, borderColor: on ? C.primary : C.border }]}>
                        <Text style={{ color: on ? C.onPrimary : C.text, fontWeight: "700" }}>
                          {m === "all" ? "Tất cả camera" : "Chọn camera"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {camMode === "pick" && (
                  cameras.length === 0 ? (
                    <Text style={{ color: C.sub, fontSize: 12, marginTop: 8 }}>
                      {camData?.error || "Chưa tải được camera của sân (kiểm tra Pi base URL và lưu cấu hình)."}
                    </Text>
                  ) : (
                    <View style={[styles.chipsRow, { marginTop: 8 }]}>
                      {cameras.map((c) => {
                        const on = picked.includes(c.id);
                        return (
                          <Pressable key={c.id} onPress={() => togglePick(c.id)} style={[styles.chip, { backgroundColor: on ? C.greenText : C.field, borderColor: on ? C.greenText : C.border }]}>
                            <Text style={{ color: on ? "#fff" : C.text, fontWeight: "700" }}>{c.name}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )
                )}

                <Text style={[styles.label, { color: C.sub }]}>Ghi chú (tuỳ chọn)</Text>
                <I18nTextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="VD: HLV CLB, cộng tác viên…"
                  placeholderTextColor={C.muted}
                  style={[styles.input, { backgroundColor: C.field, color: C.text, borderColor: C.border }]}
                />
                <Pressable onPress={onSubmit} disabled={adding || updating} style={[styles.primaryBtn, { backgroundColor: C.primary, opacity: adding || updating ? 0.6 : 1 }]}>
                  {adding || updating ? <ActivityIndicator color={C.onPrimary} size="small" /> : <Ionicons name={editingId ? "save-outline" : "person-add-outline"} size={16} color={C.onPrimary} />}
                  <Text style={{ color: C.onPrimary, fontWeight: "700", marginLeft: 6 }}>{editingId ? "Lưu thay đổi" : "Cấp quyền"}</Text>
                </Pressable>
              </View>

              {/* Info booking */}
              <View style={[styles.infoBox, { backgroundColor: C.primarySoft, borderColor: C.primary }]}>
                <Ionicons name="information-circle-outline" size={16} color={C.primary} />
                <Text style={{ color: C.text, flex: 1, marginLeft: 8, fontSize: 13, lineHeight: 19 }}>
                  Khách đặt sân qua app tự được quyền cắt cam 48 giờ kể từ lúc nhận sân — không cần cấp thủ công.
                </Text>
              </View>

              {/* Danh sách đã cấp */}
              <Text style={[styles.sectionTitle, { color: C.text }]}>Đã cấp quyền ({grants.length})</Text>
              {grants.length === 0 ? (
                <Text style={{ color: C.sub, paddingVertical: 12 }}>Chưa cấp quyền cho ai.</Text>
              ) : (
                grants.map((g: any) => (
                  <View key={g._id} style={[styles.grantRow, { borderBottomColor: C.border }]}>
                    <Ionicons name="person-circle-outline" size={28} color={C.sub} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text numberOfLines={1} style={{ color: C.text, fontWeight: "700" }}>
                        {g.user?.name || g.user?.nickname || g.user?.phone || "Người dùng"}
                      </Text>
                      <Text style={{ color: C.sub, fontSize: 12 }}>
                        {g.user?.phone || ""}{g.note ? ` · ${g.note}` : ""}
                      </Text>
                      <Text numberOfLines={1} style={{ color: g.cameras?.length ? C.primary : C.sub, fontSize: 11.5, marginTop: 1 }}>
                        {g.cameras?.length ? `📷 ${g.cameras.map(camName).join(", ")}` : "📷 Tất cả camera"}
                      </Text>
                    </View>
                    <Text style={{ color: g.expired ? C.redText : C.greenText, fontSize: 12, fontWeight: "700", marginRight: 6 }}>
                      {expiryLabel(g.expiresAt, g.expired)}
                    </Text>
                    <Pressable onPress={() => startEdit(g)} style={{ padding: 6 }}>
                      <Ionicons name="create-outline" size={18} color={C.primary} />
                    </Pressable>
                    <Pressable onPress={() => onRemove(g)} style={{ padding: 6 }}>
                      <Ionicons name="trash-outline" size={18} color={C.redText} />
                    </Pressable>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const mkStyles = (C: ThemeTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    center: { alignItems: "center", justifyContent: "center", paddingVertical: 56 },
    card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
    cardTitle: { fontWeight: "800", fontSize: 15, marginBottom: 12 },
    rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    label: { fontSize: 12, marginTop: 10, marginBottom: 6 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
    primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, marginTop: 16 },
    infoBox: { flexDirection: "row", alignItems: "flex-start", borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 18 },
    sectionTitle: { fontWeight: "800", fontSize: 15, marginBottom: 6 },
    grantRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  });
