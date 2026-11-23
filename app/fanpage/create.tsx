// app/fanpage/create.tsx — Tạo Fanpage mới (chờ admin duyệt) / sửa Fanpage (?id=).
// Mockup: docs/mockups/fanpage-3-tao-quan-ly.png (bên trái).
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

import { PageAvatar, useImageUpload } from "@/components/fanpage/FanpageUI";
import { Text } from "@/components/ui/i18nText";
import TextInput from "@/components/ui/i18nTextInput";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import {
  FANPAGE_KIND_LABEL,
  useCreateFanpageMutation,
  useGetFanpageQuery,
  useUpdateFanpageMutation,
} from "@/slices/fanpagesApiSlice";
import { normalizeUrl } from "@/utils/normalizeUri";

const KINDS: { key: string; icon: any }[] = [
  { key: "club", icon: "people" },
  { key: "organizer", icon: "megaphone-outline" },
  { key: "venue", icon: "grid-outline" },
  { key: "brand", icon: "pricetag-outline" },
  { key: "community", icon: "chatbubbles-outline" },
];

function Label({ C, text, required }: { C: ThemeTokens; text: string; required?: boolean }) {
  return (
    <Text style={{ color: C.sub, fontWeight: "700", fontSize: 13 }}>
      {text}
      {required ? <Text style={{ color: "#EF4444" }}> *</Text> : null}
    </Text>
  );
}

export default function FanpageCreateScreen() {
  const C = useThemeTokens();
  const me = useSelector((s: any) => s?.auth?.userInfo);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(id);
  const { data: page, isLoading: loadingPage } = useGetFanpageQuery(String(id || ""), { skip: !editing });
  const [create, { isLoading: creating }] = useCreateFanpageMutation();
  const [update, { isLoading: updating }] = useUpdateFanpageMutation();
  const { pick, busy: uploading } = useImageUpload();

  const [name, setName] = useState("");
  const [kind, setKind] = useState("club");
  const [avatar, setAvatar] = useState("");
  const [cover, setCover] = useState("");
  const [description, setDescription] = useState("");
  const [province, setProvince] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [docs, setDocs] = useState<string[]>([]);

  useEffect(() => {
    if (!page) return;
    setName(page.name || "");
    setKind(page.kind === "official" ? "club" : page.kind || "club");
    setAvatar(page.avatar || "");
    setCover(page.cover || "");
    setDescription(page.description || "");
    setProvince(page.province || "");
    setPhone(page.phone || "");
    setWebsite(page.website || "");
    setDocs(page.verifyDocs || []);
  }, [page]);

  const input = [styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.field }];
  const busy = creating || updating;

  const submit = async () => {
    if (!me?._id) {
      router.push("/login" as any);
      return;
    }
    if (name.trim().length < 3) return Alert.alert("Thiếu thông tin", "Tên Fanpage cần ít nhất 3 ký tự.");
    if (!avatar) return Alert.alert("Thiếu thông tin", "Vui lòng tải lên logo Fanpage.");
    if (description.trim().length < 10) return Alert.alert("Thiếu thông tin", "Hãy mô tả ngắn về Fanpage (ít nhất 10 ký tự).");
    const body = {
      name: name.trim(),
      kind,
      avatar,
      cover,
      description: description.trim(),
      province: province.trim(),
      phone: phone.trim(),
      website: website.trim(),
      verifyDocs: docs,
    };
    try {
      if (editing) {
        const r: any = await update({ id: String(id), ...body }).unwrap();
        Alert.alert("Đã lưu", r?.status === "pending" ? "Fanpage đã được gửi duyệt lại." : "Đã cập nhật thông tin Fanpage.");
        router.back();
      } else {
        const r: any = await create(body).unwrap();
        Alert.alert(
          "Đã gửi yêu cầu",
          "Fanpage sẽ hiển thị sau khi Admin PickleTour duyệt (thường trong 24 giờ). Bạn sẽ nhận thông báo khi có kết quả.",
        );
        router.replace(`/fanpage/${r._id}` as any);
      }
    } catch (e: any) {
      Alert.alert("Không gửi được", e?.data?.message || e?.message || "Vui lòng thử lại.");
    }
  };

  if (editing && loadingPage) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <Stack.Screen options={{ title: "Sửa Fanpage", headerShown: true }} />
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: editing ? "Sửa Fanpage" : "Tạo Fanpage mới", headerShown: true }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, maxWidth: 640, width: "100%", alignSelf: "center", paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: "row", gap: 14 }}>
            <View style={{ gap: 6, alignItems: "center" }}>
              <Label C={C} text="Logo Fanpage" required />
              <Pressable
                accessibilityLabel="Tải lên logo"
                onPress={async () => {
                  const u = await pick({ maxWidth: 640, aspect: [1, 1] });
                  if (u) setAvatar(u);
                }}
                style={[styles.logoBox, { borderColor: C.primary }]}
              >
                {avatar ? <PageAvatar uri={avatar} size={92} C={C} /> : <Ionicons name="camera-outline" size={30} color={C.primary} />}
              </Pressable>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Label C={C} text="Ảnh bìa" />
              <Pressable
                accessibilityLabel="Tải lên ảnh bìa"
                onPress={async () => {
                  const u = await pick({ maxWidth: 1600, aspect: [16, 9] });
                  if (u) setCover(u);
                }}
                style={[styles.coverBox, { borderColor: C.primary }]}
              >
                {cover ? (
                  <ExpoImage source={{ uri: normalizeUrl(cover) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <Ionicons name="image-outline" size={30} color={C.primary} />
                )}
              </Pressable>
            </View>
          </View>
          {uploading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={{ color: C.sub, fontSize: 12.5 }}>Đang tải ảnh lên…</Text>
            </View>
          ) : null}

          <View style={{ gap: 6 }}>
            <Label C={C} text="Tên Fanpage" required />
            <TextInput style={input} value={name} onChangeText={setName} maxLength={80} placeholder="VD: Thành Nam Pickleball Club" placeholderTextColor={C.muted} />
          </View>

          <View style={{ gap: 6 }}>
            <Label C={C} text="Loại" required />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {KINDS.map((k) => {
                const on = kind === k.key;
                return (
                  <Pressable
                    key={k.key}
                    onPress={() => setKind(k.key)}
                    style={[styles.kind, { borderColor: on ? C.primary : C.border, backgroundColor: on ? C.primarySoft : C.field }]}
                  >
                    <Ionicons name={k.icon} size={17} color={on ? C.primary : C.sub} />
                    <Text style={{ color: on ? C.primary : C.text, fontWeight: "700", fontSize: 13 }}>
                      {FANPAGE_KIND_LABEL[k.key as keyof typeof FANPAGE_KIND_LABEL]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Label C={C} text="Mô tả" required />
            <TextInput
              style={[input, { minHeight: 96, textAlignVertical: "top" }]}
              value={description}
              onChangeText={setDescription}
              maxLength={1000}
              multiline
              placeholder="Giới thiệu ngắn về CLB / ban tổ chức / sân…"
              placeholderTextColor={C.muted}
            />
            <Text style={{ color: C.muted, fontSize: 11.5, textAlign: "right" }}>{`${description.length}/1000`}</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Label C={C} text="Tỉnh / thành" />
              <TextInput style={input} value={province} onChangeText={setProvince} maxLength={60} placeholder="VD: Ninh Bình" placeholderTextColor={C.muted} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Label C={C} text="Số điện thoại" />
              <TextInput style={input} value={phone} onChangeText={setPhone} maxLength={15} keyboardType="phone-pad" placeholder="09…" placeholderTextColor={C.muted} />
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Label C={C} text="Website / Facebook" />
            <TextInput style={input} value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" placeholder="https://…" placeholderTextColor={C.muted} />
          </View>

          <View style={{ gap: 6 }}>
            <Label C={C} text="Giấy tờ xác minh (tuỳ chọn)" />
            <Text style={{ color: C.muted, fontSize: 12 }}>Giấy phép ĐKKD, quyết định thành lập CLB… giúp admin duyệt nhanh hơn. Chỉ admin và người quản lý trang xem được.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {docs.map((d, i) => (
                <View key={d} style={[styles.doc, { borderColor: C.border }]}>
                  <ExpoImage source={{ uri: normalizeUrl(d) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <Pressable onPress={() => setDocs((x) => x.filter((_, j) => j !== i))} style={styles.docX} hitSlop={8}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {docs.length < 5 ? (
                <Pressable
                  onPress={async () => {
                    const u = await pick({ maxWidth: 1600 });
                    if (u) setDocs((x) => [...x, u]);
                  }}
                  style={[styles.doc, { borderColor: C.primary, borderStyle: "dashed", alignItems: "center", justifyContent: "center" }]}
                >
                  <Ionicons name="cloud-upload-outline" size={22} color={C.primary} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {!editing || page?.status !== "approved" ? (
            <View style={[styles.note, { borderColor: "#C5F433", backgroundColor: "rgba(197,244,51,0.08)" }]}>
              <Ionicons name="time-outline" size={20} color={C.isV3 ? "#4D7C0F" : "#C5F433"} />
              <Text style={{ flex: 1, color: C.text, fontSize: 13 }}>
                Fanpage sẽ hiển thị sau khi Admin PickleTour duyệt (thường trong 24 giờ).
              </Text>
            </View>
          ) : null}

          <Pressable onPress={submit} disabled={busy || uploading} style={[styles.submit, { backgroundColor: C.primary, opacity: busy || uploading ? 0.7 : 1 }]}>
            {busy ? (
              <ActivityIndicator color={C.onPrimary} />
            ) : (
              <Text style={{ color: C.onPrimary, fontWeight: "900", fontSize: 15.5 }}>
                {editing ? "Lưu thay đổi" : "Gửi yêu cầu duyệt"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  logoBox: { width: 96, height: 96, borderRadius: 48, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  coverBox: { height: 96, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  kind: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  doc: { width: 72, height: 72, borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  docX: { position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  note: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  submit: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
});
