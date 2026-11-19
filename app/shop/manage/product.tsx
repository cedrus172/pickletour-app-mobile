// app/shop/manage/product.tsx — Thêm / sửa sản phẩm Gian hàng GOATWIN (người quản lý gian hàng)
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
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
import { BASE_URL } from "@/slices/apiSlice";
import { useDeleteManageProductMutation, useGetManageProductsQuery, useSaveManageProductMutation } from "@/slices/shopApiSlice";

const CATS = [
  { key: "tui-vot", label: "Túi vợt" },
  { key: "bong", label: "Bóng" },
  { key: "quan-can", label: "Quấn cán" },
  { key: "phu-kien", label: "Phụ kiện" },
  { key: "qua-tang", label: "Quà tặng" },
];
const PALETTE = ["#111111", "#FFFFFF", "#7A1C2C", "#C62828", "#C2185B", "#F48FB1", "#1A237E", "#8CB8DA", "#2E7D32", "#5B6B3A", "#F9A825", "#757575"];

function Label({ C, children }: { C: ThemeTokens; children: React.ReactNode }) {
  return <Text style={{ color: C.sub, fontWeight: "700", fontSize: 12.5, marginTop: 6 }}>{children}</Text>;
}

export default function ShopProductEditScreen() {
  const C = useThemeTokens();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const token = useSelector((s: any) => s?.auth?.userInfo?.token);
  const { data } = useGetManageProductsQuery(undefined, { skip: !id });
  const [save, { isLoading: saving }] = useSaveManageProductMutation();
  const [del] = useDeleteManageProductMutation();
  const [f, setF] = useState<any>({ name: "", category: "phu-kien", price: "", compareAtPrice: "", images: [], colors: [], description: "", exclusive: true, freeShip: false, active: true, sold: "0", rating: "0", sort: "0" });
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    const p = (data?.products || []).find((x: any) => x._id === id);
    if (p && !loaded) {
      setF({ ...p, price: String(p.price || ""), compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : "", sold: String(p.sold || 0), rating: String(p.rating || 0), sort: String(p.sort || 0) });
      setLoaded(true);
    }
  }, [data, id, loaded]);

  const set = (k: string) => (v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const input = [styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.field }];

  // Chọn + tải 1 ảnh lên máy chủ → URL (null nếu huỷ / lỗi).
  const pickAndUpload = async (): Promise<string | null> => {
    const sel = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9, allowsEditing: true, aspect: [1, 1] });
    if (sel.canceled) return null;
    setUploading(true);
    try {
      const r = await FileSystem.uploadAsync(`${BASE_URL}/api/shop/manage/upload`, sel.assets[0].uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "image",
        mimeType: sel.assets[0].mimeType || "image/jpeg",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = JSON.parse(r.body || "{}");
      if (r.status >= 300 || !body.url) throw new Error(body.message || "Tải ảnh thất bại");
      return String(body.url);
    } catch (e: any) {
      Alert.alert("Không tải được ảnh", e?.message || "Vui lòng thử lại.");
      return null;
    } finally {
      setUploading(false);
    }
  };
  const addImage = async () => {
    const url = await pickAndUpload();
    if (url) setF((x: any) => ({ ...x, images: [...(x.images || []), url] }));
  };
  // Ảnh riêng của một màu: khách chọn màu này thì trang sản phẩm đổi sang ảnh này.
  const setColorImage = async (i: number) => {
    const url = await pickAndUpload();
    if (url) setF((x: any) => ({ ...x, colors: x.colors.map((c: any, k: number) => (k === i ? { ...c, image: url } : c)) }));
  };

  const submit = async () => {
    if (String(f.name).trim().length < 2) return Alert.alert("Thiếu tên sản phẩm");
    if (!(Number(f.price) > 0)) return Alert.alert("Giá bán không hợp lệ");
    try {
      await save({
        _id: id || undefined,
        ...f,
        price: Number(f.price),
        compareAtPrice: Number(f.compareAtPrice) || 0,
        sold: Number(f.sold) || 0,
        rating: Number(f.rating) || 0,
        sort: Number(f.sort) || 0,
        colors: (f.colors || []).filter((c: any) => String(c.name || "").trim()),
      }).unwrap();
      router.back();
    } catch (e: any) {
      Alert.alert("Không lưu được", e?.data?.message || "Vui lòng thử lại.");
    }
  };

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <Stack.Screen options={{ title: "Sửa sản phẩm", headerShown: true }} />
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: id ? "Sửa sản phẩm" : "Thêm sản phẩm", headerShown: true }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 60, maxWidth: 720, width: "100%", alignSelf: "center" }} keyboardShouldPersistTaps="handled">
          <Label C={C}>Ảnh sản phẩm (ảnh đầu là ảnh đại diện)</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {(f.images || []).map((u: string, i: number) => (
              <View key={u + i} style={styles.img}>
                <ExpoImage source={{ uri: u }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <Pressable accessibilityRole="button" accessibilityLabel="Xoá ảnh" hitSlop={6} onPress={() => set("images")(f.images.filter((_: any, k: number) => k !== i))} style={styles.imgDel}>
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
            <Pressable accessibilityRole="button" onPress={addImage} disabled={uploading} style={[styles.img, styles.imgAdd, { borderColor: C.border }]}>
              {uploading ? <ActivityIndicator color={C.primary} /> : <Ionicons name="camera-outline" size={26} color={C.primary} />}
            </Pressable>
          </ScrollView>

          <Label C={C}>Tên sản phẩm *</Label>
          <TextInput value={f.name} onChangeText={set("name")} placeholderTextColor={C.sub} style={input} />
          <Label C={C}>Danh mục</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CATS.map((c) => (
              <Pressable key={c.key} accessibilityRole="radio" accessibilityState={{ selected: f.category === c.key }} onPress={() => set("category")(c.key)} style={[styles.chip, { borderColor: f.category === c.key ? C.primary : C.border, backgroundColor: f.category === c.key ? C.primary : "transparent" }]}>
                <Text style={{ color: f.category === c.key ? C.onPrimary : C.text, fontWeight: "700" }}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Label C={C}>Giá bán (đ) *</Label>
              <TextInput value={String(f.price)} onChangeText={set("price")} keyboardType="number-pad" placeholderTextColor={C.sub} style={input} />
            </View>
            <View style={{ flex: 1 }}>
              <Label C={C}>Giá gốc (gạch ngang)</Label>
              <TextInput value={String(f.compareAtPrice)} onChangeText={set("compareAtPrice")} keyboardType="number-pad" placeholder="Bỏ trống nếu không giảm" placeholderTextColor={C.sub} style={input} />
            </View>
          </View>

          <Label C={C}>Phí ship</Label>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { v: true, label: "Freeship", icon: "gift-outline" },
              { v: false, label: "Thu phí (COD)", icon: "cash-outline" },
            ].map((o) => {
              const on = !!f.freeShip === o.v;
              return (
                <Pressable
                  key={o.label}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => set("freeShip")(o.v)}
                  style={[styles.chip, { flex: 1, flexDirection: "row", gap: 6, borderColor: on ? C.primary : C.border, backgroundColor: on ? C.primary : "transparent" }]}
                >
                  <Ionicons name={o.icon as any} size={16} color={on ? C.onPrimary : C.text} />
                  <Text style={{ color: on ? C.onPrimary : C.text, fontWeight: "700" }}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ color: C.sub, fontSize: 11.5 }}>
            {f.freeShip ? "Miễn phí vận chuyển cho khách." : "Khách trả phí ship khi nhận hàng (COD)."}
          </Text>

          <Label C={C}>Màu sắc (khách phải chọn khi mua)</Label>
          {(f.colors || []).map((c: any, i: number) => (
            <View key={i} style={{ gap: 6, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ảnh màu ${c.name || i + 1}`}
                  disabled={uploading}
                  onPress={() => setColorImage(i)}
                  onLongPress={() => c.image && set("colors")(f.colors.map((x: any, k: number) => (k === i ? { ...x, image: "" } : x)))}
                  style={[styles.colorImg, { borderColor: c.image ? C.primary : C.border }]}
                >
                  {c.image ? (
                    <ExpoImage source={{ uri: c.image }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <>
                      <View style={[styles.sw, { width: 18, height: 18, backgroundColor: c.hex || "#888" }]} />
                      <Ionicons name="camera-outline" size={14} color={C.primary} />
                    </>
                  )}
                </Pressable>
                <TextInput
                  value={c.name}
                  onChangeText={(t: string) => set("colors")(f.colors.map((x: any, k: number) => (k === i ? { ...x, name: t } : x)))}
                  placeholder="Tên màu (vd. Đỏ đô)"
                  placeholderTextColor={C.sub}
                  style={[...input, { flex: 1 }]}
                />
                <Pressable accessibilityRole="button" accessibilityLabel="Xoá màu" hitSlop={6} onPress={() => set("colors")(f.colors.filter((_: any, k: number) => k !== i))}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </Pressable>
              </View>
              <Text style={{ color: C.sub, fontSize: 11.5 }}>
                {c.image ? "Ảnh riêng của màu này — chạm để đổi, giữ để bỏ" : "Chạm ô ảnh bên trái để thêm ảnh riêng cho màu này"}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {PALETTE.map((h) => (
                  <Pressable key={h} accessibilityRole="button" accessibilityLabel={h} onPress={() => set("colors")(f.colors.map((x: any, k: number) => (k === i ? { ...x, hex: h } : x)))} style={[styles.sw, { backgroundColor: h, borderWidth: c.hex === h ? 3 : 1, borderColor: c.hex === h ? C.primary : C.border }]} />
                ))}
              </View>
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={() => set("colors")([...(f.colors || []), { name: "", hex: "#111111", image: "" }])} style={{ paddingVertical: 6 }}>
            <Text style={{ color: C.primary, fontWeight: "800" }}>+ Thêm màu</Text>
          </Pressable>

          <Label C={C}>Mô tả (mỗi dòng một ý)</Label>
          <TextInput value={f.description} onChangeText={set("description")} multiline placeholderTextColor={C.sub} style={[...input, { minHeight: 100, textAlignVertical: "top", paddingTop: 10 }]} />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Label C={C}>Đã bán</Label>
              <TextInput value={String(f.sold)} onChangeText={set("sold")} keyboardType="number-pad" style={input} />
            </View>
            <View style={{ flex: 1 }}>
              <Label C={C}>Đánh giá (0–5)</Label>
              <TextInput value={String(f.rating)} onChangeText={set("rating")} keyboardType="decimal-pad" style={input} />
            </View>
            <View style={{ flex: 1 }}>
              <Label C={C}>Thứ tự</Label>
              <TextInput value={String(f.sort)} onChangeText={set("sort")} keyboardType="number-pad" style={input} />
            </View>
          </View>
          <View style={styles.switchRow}>
            <Text style={{ color: C.text, fontWeight: "700", flex: 1 }}>Nhãn &quot;Độc quyền&quot;</Text>
            <Switch value={f.exclusive !== false} onValueChange={set("exclusive")} />
          </View>
          <View style={styles.switchRow}>
            <Text style={{ color: C.text, fontWeight: "700", flex: 1 }}>Đang bán (tắt = ẩn khỏi cửa hàng)</Text>
            <Switch value={f.active !== false} onValueChange={set("active")} />
          </View>

          <Pressable accessibilityRole="button" disabled={saving} onPress={submit} style={[styles.save, { backgroundColor: C.primary }]}>
            {saving ? <ActivityIndicator color={C.onPrimary} /> : <Text style={{ color: C.onPrimary, fontWeight: "900", fontSize: 15 }}>Lưu sản phẩm</Text>}
          </Pressable>
          {id ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Alert.alert("Xoá sản phẩm?", "Đơn cũ vẫn giữ thông tin. Muốn tạm ngừng bán thì tắt 'Đang bán'.", [
                  { text: "Huỷ", style: "cancel" },
                  {
                    text: "Xoá",
                    style: "destructive",
                    onPress: async () => {
                      await del(String(id)).unwrap().catch(() => {});
                      router.back();
                    },
                  },
                ])
              }
              style={{ alignItems: "center", paddingVertical: 12 }}
            >
              <Text style={{ color: "#EF4444", fontWeight: "800" }}>Xoá sản phẩm</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 },
  img: { width: 96, height: 96, borderRadius: 12, overflow: "hidden", backgroundColor: "#05080F" },
  imgAdd: { borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  imgDel: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" },
  chip: { paddingHorizontal: 12, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  colorImg: { width: 52, height: 52, borderRadius: 10, borderWidth: 1.5, overflow: "hidden", alignItems: "center", justifyContent: "center", gap: 2 },
  sw: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "rgba(127,127,127,0.4)" },
  switchRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  save: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 10 },
});
