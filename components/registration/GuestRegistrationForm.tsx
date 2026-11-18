// components/registration/GuestRegistrationForm.tsx
// Admin đăng ký VĐV NGOÀI HỆ THỐNG: SĐT, họ tên, biệt danh (bắt buộc), điểm trình (mặc định 0), ảnh (tuỳ chọn).
// SĐT đã có tài khoản → dùng tài khoản đó; chưa có → tạo tài khoản khách. VĐV đăng ký app bằng đúng SĐT
// sau này sẽ nhận lại tài khoản kèm dữ liệu thi đấu.
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import { Text } from "@/components/ui/i18nText";
import { TextInput } from "@/components/ui/i18nTextInput";
import { useUploadAvatarMutation } from "@/slices/uploadApiSlice";
import { useCreateGuestRegistrationMutation } from "@/slices/tournamentsApiSlice";
import { normalizeUrl } from "@/utils/normalizeUri";
import PlayerSelector from "@/components/PlayerSelector";

// hasAccount: VĐV đã có tài khoản → chọn từ hệ thống (user); chưa có → nhập tay (tạo tài khoản khách).
type GuestPlayer = { hasAccount: boolean; user: any; phone: string; name: string; nickname: string; score: string; avatar: string };
const EMPTY: GuestPlayer = { hasAccount: false, user: null, phone: "", name: "", nickname: "", score: "0", avatar: "" };

type Colors = { textPrimary: string; textSecondary: string; border: string; inputBg: string; tint: string; cardBg?: string };

function Field({ label, value, onChangeText, C, keyboardType, required }: any) {
  return (
    <View style={{ flex: 1, minWidth: 140 }}>
      <Text style={[styles.label, { color: C.textSecondary }]}>
        {label}
        {required ? <Text style={{ color: "#EF4444" }}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType ? "none" : "words"}
        autoCorrect={false}
        placeholderTextColor={C.textSecondary}
        style={[styles.input, { color: C.textPrimary, borderColor: C.border, backgroundColor: C.inputBg }]}
      />
    </View>
  );
}

function PlayerFields({ title, value, onChange, C, eventType }: { title: string; value: GuestPlayer; onChange: (v: GuestPlayer) => void; C: Colors; eventType: "single" | "double" }) {
  const [uploadAvatar, { isLoading: uploading }] = useUploadAvatarMutation();
  const set = (k: keyof GuestPlayer) => (t: string) => onChange({ ...value, [k]: t });

  const pickPhoto = async () => {
    try {
      const sel = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, allowsEditing: true, aspect: [1, 1] });
      if (sel.canceled) return;
      const asset = sel.assets[0];
      const img = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: { width: 800 } }], {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      const res: any = await uploadAvatar({ uri: img.uri, name: "avatar.jpg", type: "image/jpeg" } as any).unwrap();
      onChange({ ...value, avatar: res?.url || "" });
    } catch (e: any) {
      Alert.alert("Không tải được ảnh", e?.data?.message || e?.message || "Vui lòng thử lại.");
    }
  };

  return (
    <View style={[styles.player, { borderColor: C.border }]}>
      <Text style={[styles.playerTitle, { color: C.textPrimary }]}>{title}</Text>
      <View style={[styles.seg, { borderColor: C.border }]}>
        {[
          { v: true, label: "Có tài khoản" },
          { v: false, label: "Chưa có tài khoản" },
        ].map((o) => {
          const on = value.hasAccount === o.v;
          return (
            <Pressable
              key={o.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onChange({ ...value, hasAccount: o.v })}
              style={[styles.segItem, on && { backgroundColor: C.tint }]}
            >
              <Text style={{ color: on ? "#fff" : C.textSecondary, fontWeight: "800", fontSize: 12.5 }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {value.hasAccount ? (
        <View style={{ gap: 6 }}>
          <PlayerSelector
            label="Tìm VĐV trong hệ thống"
            appearance="tournament"
            eventType={eventType}
            onChange={(u) => onChange({ ...value, user: u })}
          />
          {value.user?._id ? (
            <Text style={{ color: C.textPrimary, fontWeight: "700" }}>
              Đã chọn: {value.user.nickname || value.user.nickName || value.user.name}
            </Text>
          ) : null}
        </View>
      ) : (
      <>
      <View style={styles.avatarRow}>
        <View style={[styles.avatar, { backgroundColor: C.inputBg, borderColor: C.border }]}>
          {value.avatar ? (
            <ExpoImage source={{ uri: normalizeUrl(value.avatar) }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Ionicons name="person" size={26} color={C.textSecondary} />
          )}
        </View>
        <Pressable accessibilityRole="button" onPress={pickPhoto} disabled={uploading} style={[styles.photoBtn, { borderColor: C.border }]}>
          {uploading ? <ActivityIndicator color={C.tint} /> : <Ionicons name="camera-outline" size={16} color={C.tint} />}
          <Text style={{ color: C.tint, fontWeight: "700", fontSize: 13 }}>{value.avatar ? "Đổi ảnh" : "Thêm ảnh (không bắt buộc)"}</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        <Field C={C} required label="Số điện thoại" value={value.phone} onChangeText={set("phone")} keyboardType="phone-pad" />
        <Field C={C} required label="Họ và tên" value={value.name} onChangeText={set("name")} />
      </View>
      <View style={styles.grid}>
        <Field C={C} required label="Biệt danh" value={value.nickname} onChangeText={set("nickname")} />
        <Field C={C} label="Điểm trình (mặc định 0)" value={value.score} onChangeText={set("score")} keyboardType="decimal-pad" />
      </View>
      </>
      )}
    </View>
  );
}

export default function GuestRegistrationForm({
  tournamentId,
  singles,
  C,
  onDone,
}: {
  tournamentId: string;
  singles: boolean;
  C: Colors;
  onDone?: () => void;
}) {
  const [p1, setP1] = useState<GuestPlayer>(EMPTY);
  const [p2, setP2] = useState<GuestPlayer>(EMPTY);
  const [createGuest, { isLoading }] = useCreateGuestRegistrationMutation();

  const validate = (p: GuestPlayer, label: string) => {
    if (p.hasAccount) return p.user?._id ? "" : `${label}: hãy tìm và chọn VĐV trong hệ thống`;
    const phone = p.phone.replace(/[\s.-]/g, "");
    if (!/^0\d{9}$/.test(phone)) return `${label}: số điện thoại phải có 10 số, bắt đầu bằng 0`;
    if (p.name.trim().length < 2) return `${label}: vui lòng nhập họ và tên`;
    if (!p.nickname.trim()) return `${label}: vui lòng nhập biệt danh`;
    return "";
  };

  const submit = async () => {
    const err = validate(p1, singles ? "VĐV" : "VĐV 1") || (!singles ? validate(p2, "VĐV 2") : "");
    if (err) return Alert.alert("Thiếu thông tin", err);
    try {
      const toBody = (p: GuestPlayer) =>
        p.hasAccount ? { userId: p.user._id } : { phone: p.phone, name: p.name, nickname: p.nickname, score: p.score, avatar: p.avatar };
      const res: any = await createGuest({ id: tournamentId, players: (singles ? [p1] : [p1, p2]).map(toBody) }).unwrap();
      const created = (res?.players || []).filter((x: any) => x.createdGuest).length;
      const reused = (res?.players || []).filter((x: any) => x.existingAccount).length;
      Alert.alert(
        "Đã đăng ký",
        [created ? `Tạo ${created} tài khoản khách.` : "", reused ? `${reused} VĐV đã có tài khoản sẵn.` : ""].filter(Boolean).join(" ") ||
          undefined,
      );
      setP1(EMPTY);
      setP2(EMPTY);
      onDone?.();
    } catch (e: any) {
      Alert.alert("Đăng ký thất bại", e?.data?.message || "Vui lòng thử lại.");
    }
  };

  return (
    <View>
      <View style={[styles.note, { borderColor: C.border }]}>
        <Ionicons name="information-circle" size={18} color={C.tint} />
        <Text style={{ color: C.textSecondary, flex: 1, fontSize: 12.5, lineHeight: 18 }}>
          Mỗi VĐV chọn "Có tài khoản" (tìm trong hệ thống) hoặc "Chưa có tài khoản" (nhập tay, tạo tài khoản khách theo SĐT).
          Khi VĐV tự đăng ký app bằng đúng SĐT này sẽ có sẵn dữ liệu thi đấu.
        </Text>
      </View>
      <PlayerFields title={singles ? "Vận động viên" : "Vận động viên 1"} value={p1} onChange={setP1} C={C} eventType={singles ? "single" : "double"} />
      {!singles ? <PlayerFields title="Vận động viên 2" value={p2} onChange={setP2} C={C} eventType="double" /> : null}
      <TouchableOpacity
        testID="guest-registration-submit"
        accessibilityRole="button"
        onPress={submit}
        disabled={isLoading}
        style={[styles.submit, { backgroundColor: isLoading ? C.textSecondary : C.tint }]}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="person-add" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800" }}>Đăng ký</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: "row", gap: 8, padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  player: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12, gap: 10 },
  playerTitle: { fontSize: 14, fontWeight: "800" },
  seg: { flexDirection: "row", gap: 4, padding: 3, borderRadius: 10, borderWidth: 1 },
  segItem: { flex: 1, minHeight: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, borderWidth: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 4 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  submit: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, borderRadius: 14, marginTop: 4 },
});
