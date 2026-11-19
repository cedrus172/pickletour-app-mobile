// app/organize/index.tsx — "Tổ chức giải đấu" (mockup docs/mockups/to-chuc-giai-2-form.png + -3-xong.png):
// người dùng gửi tên giải, địa điểm, nội dung, SĐT… → admin PickleTour chủ động liên hệ hỗ trợ tổ chức.
import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { Text } from "@/components/ui/i18nText";
import TextInput from "@/components/ui/i18nTextInput";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { useCreateOrganizeRequestMutation } from "@/slices/organizeApiSlice";

const EVENTS = ["Đôi nam", "Đôi nam nữ", "Đôi nữ", "Đơn nam", "Đơn nữ", "Đồng đội MLP"];

function Field({ C, label, required, icon, children }: { C: ThemeTokens; label: string; required?: boolean; icon?: any; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: C.sub, fontWeight: "700", fontSize: 13 }}>
        {label}
        {required ? <Text style={{ color: "#EF4444" }}> *</Text> : null}
      </Text>
      <View style={[styles.inputBox, { borderColor: C.border, backgroundColor: C.field }]}>
        {icon ? <Ionicons name={icon} size={18} color={C.primary} /> : null}
        {children}
      </View>
    </View>
  );
}

export default function OrganizeScreen() {
  const C = useThemeTokens();
  const userInfo = useSelector((s: any) => s?.auth?.userInfo);
  const [create, { isLoading }] = useCreateOrganizeRequestMutation();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [timeText, setTimeText] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [teams, setTeams] = useState("");
  const [contactName, setContactName] = useState(String(userInfo?.name || ""));
  const [phone, setPhone] = useState(String(userInfo?.phone || ""));
  const [note, setNote] = useState("");
  const [done, setDone] = useState<any>(null);
  const input = [styles.input, { color: C.text }];

  const toggle = (e: string) => setEvents((x) => (x.includes(e) ? x.filter((y) => y !== e) : [...x, e]));

  const submit = async () => {
    if (!userInfo?._id) {
      return Alert.alert("Cần đăng nhập", "Đăng nhập PickleTour để gửi yêu cầu và theo dõi phản hồi.", [
        { text: "Để sau", style: "cancel" },
        { text: "Đăng nhập", onPress: () => router.push("/login" as any) },
      ]);
    }
    if (name.trim().length < 3) return Alert.alert("Thiếu thông tin", "Vui lòng nhập tên giải đấu.");
    if (location.trim().length < 3) return Alert.alert("Thiếu thông tin", "Vui lòng nhập địa điểm tổ chức.");
    if (!/^(0|\+84)\d{9}$/.test(phone.replace(/[\s.]/g, ""))) return Alert.alert("Thiếu thông tin", "Số điện thoại liên hệ không hợp lệ.");
    try {
      const r: any = await create({
        name: name.trim(),
        location: location.trim(),
        timeText: timeText.trim(),
        events: [...events, ...(other.trim() ? [other.trim()] : [])],
        teams: Number(teams) || 0,
        contactName: contactName.trim(),
        phone: phone.replace(/[\s.]/g, ""),
        note: note.trim(),
      }).unwrap();
      setDone(r);
    } catch (e: any) {
      Alert.alert("Không gửi được", e?.data?.message || e?.message || "Vui lòng thử lại.");
    }
  };

  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
        <Stack.Screen options={{ title: "Tổ chức giải đấu", headerShown: true }} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, alignItems: "stretch", maxWidth: 640, width: "100%", alignSelf: "center" }}>
          <View style={{ alignItems: "center", gap: 10, marginTop: 20 }}>
            <View style={styles.okCircle}>
              <Ionicons name="checkmark" size={52} color="#132000" />
            </View>
            <Text style={{ color: C.text, fontWeight: "900", fontSize: 26 }}>Đã gửi yêu cầu!</Text>
            <Text style={{ color: C.sub, textAlign: "center", lineHeight: 21 }}>
              Admin PickleTour sẽ liên hệ với bạn qua số <Text style={{ color: C.primary, fontWeight: "900" }}>{done.phone}</Text> trong vòng 24 giờ.
            </Text>
          </View>
          <View style={[styles.card, { borderColor: C.border, backgroundColor: C.card }]}>
            {[
              ["pricetag-outline", "Mã yêu cầu", done.code],
              ["trophy-outline", "Giải đấu", done.name],
              ["location-outline", "Địa điểm", done.location],
              ...(done.events?.length ? [["people-outline", "Nội dung", done.events.join(", ")]] : []),
            ].map(([icon, label, value]: any, i) => (
              <View key={i} style={[styles.sumRow, i ? { borderTopWidth: 1, borderTopColor: C.border } : null]}>
                <Ionicons name={icon} size={18} color={C.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.sub, fontSize: 12 }}>{label}</Text>
                  <Text style={{ color: C.text, fontWeight: "800" }}>{value}</Text>
                </View>
              </View>
            ))}
            <View style={[styles.sumRow, { borderTopWidth: 1, borderTopColor: C.border }]}>
              <Ionicons name="time-outline" size={18} color={C.primary} />
              <Text style={{ color: C.sub, flex: 1 }}>Trạng thái</Text>
              <View style={styles.pending}>
                <Text style={{ color: "#F59E0B", fontWeight: "800", fontSize: 12.5 }}>{done.statusLabel || "Chờ liên hệ"}</Text>
              </View>
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.replace("/organize/mine" as any)} style={[styles.btn, { backgroundColor: C.primary }]}>
            <Ionicons name="list-outline" size={18} color={C.onPrimary} />
            <Text style={{ color: C.onPrimary, fontWeight: "900" }}>Xem yêu cầu của tôi</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={[styles.btn, { borderWidth: 1.5, borderColor: C.primary }]}>
            <Ionicons name="trophy-outline" size={18} color={C.primary} />
            <Text style={{ color: C.primary, fontWeight: "900" }}>Về trang Giải đấu</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Tổ chức giải đấu",
          headerShown: true,
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Yêu cầu của tôi" hitSlop={10} onPress={() => router.push("/organize/mine" as any)}>
              <Ionicons name="list-outline" size={23} color={C.text} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 110, maxWidth: 640, width: "100%", alignSelf: "center" }} keyboardShouldPersistTaps="handled">
          <View style={[styles.hero, { borderColor: C.border, backgroundColor: C.card }]}>
            <View style={[styles.heroIcon, { backgroundColor: `${C.primary}22` }]}>
              <Ionicons name="trophy" size={34} color={C.primary} />
            </View>
            <Text style={{ color: C.text, flex: 1, lineHeight: 20 }}>
              Bạn muốn tổ chức giải? Điền thông tin, admin PickleTour sẽ chủ động gọi lại hỗ trợ: lập giải, bốc thăm, trọng tài, livestream, poster.
            </Text>
          </View>

          <Field C={C} label="Tên giải đấu" required>
            <TextInput value={name} onChangeText={setName} placeholder="Vd. Giải Pickleball Mở rộng Hà Nam 2026" placeholderTextColor={C.sub} style={input} />
          </Field>
          <Field C={C} label="Địa điểm tổ chức" required icon="location-outline">
            <TextInput value={location} onChangeText={setLocation} placeholder="Tên cụm sân, tỉnh/thành" placeholderTextColor={C.sub} style={input} />
          </Field>
          <Field C={C} label="Thời gian dự kiến" icon="calendar-outline">
            <TextInput value={timeText} onChangeText={setTimeText} placeholder="Vd. 13/12 – 14/12/2026" placeholderTextColor={C.sub} style={input} />
          </Field>

          <View style={{ gap: 8 }}>
            <Text style={{ color: C.sub, fontWeight: "700", fontSize: 13 }}>Nội dung thi đấu mong muốn</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {EVENTS.map((e) => {
                const on = events.includes(e);
                return (
                  <Pressable key={e} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(e)} style={[styles.chip, { borderColor: on ? C.primary : C.border, backgroundColor: on ? C.primary : "transparent" }]}>
                    {on ? <Ionicons name="checkmark-circle" size={16} color={C.onPrimary} /> : null}
                    <Text style={{ color: on ? C.onPrimary : C.text, fontWeight: "700" }}>{e}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={[styles.inputBox, { borderColor: C.border, backgroundColor: C.field }]}>
              <Ionicons name="add-circle-outline" size={18} color={C.primary} />
              <TextInput value={other} onChangeText={setOther} placeholder="Nội dung khác (nếu có)" placeholderTextColor={C.sub} style={input} />
            </View>
          </View>

          <Field C={C} label="Số đội dự kiến" icon="people-outline">
            <TextInput value={teams} onChangeText={(t: string) => setTeams(t.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="Vd. 64" placeholderTextColor={C.sub} style={input} />
          </Field>
          <Field C={C} label="Họ tên người liên hệ" icon="person-outline">
            <TextInput value={contactName} onChangeText={setContactName} placeholder="Họ và tên" placeholderTextColor={C.sub} style={input} />
          </Field>
          <Field C={C} label="Số điện thoại liên hệ" required icon="call-outline">
            <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0xxx xxx xxx" placeholderTextColor={C.sub} style={input} />
          </Field>
          <Field C={C} label="Ghi chú thêm">
            <TextInput value={note} onChangeText={setNote} multiline placeholder="Nhập ghi chú (nếu có)" placeholderTextColor={C.sub} style={[...input, { minHeight: 80, textAlignVertical: "top", paddingTop: 10 }]} />
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.bar, { backgroundColor: C.bg, borderTopColor: C.border }]}>
        <Pressable accessibilityRole="button" disabled={isLoading} onPress={submit} style={[styles.btn, styles.submit]}>
          {isLoading ? <ActivityIndicator color="#132000" /> : <Ionicons name="paper-plane-outline" size={18} color="#132000" />}
          <Text style={{ color: "#132000", fontWeight: "900", fontSize: 15.5 }}>Gửi yêu cầu tổ chức giải</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1 },
  heroIcon: { width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  inputBox: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, minHeight: 46 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 10, borderWidth: 1 },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, paddingBottom: 28, borderTopWidth: 1 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14 },
  submit: { backgroundColor: "#C5F433" },
  okCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#C5F433", alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14 },
  sumRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  pending: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: "#F59E0B" },
});
