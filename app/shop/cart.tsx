// app/shop/cart.tsx — Giỏ hàng + đặt hàng Gian hàng GOATWIN (giao tận nơi / nhận tại giải · COD / chuyển khoản QR)
import React, { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { Text } from "@/components/ui/i18nText";
import TextInput from "@/components/ui/i18nTextInput";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { useCreateShopOrderMutation, useShopInfo } from "@/slices/shopApiSlice";
import { useShopCart } from "@/hooks/useShopCart";
import { GW_RED, fmtVnd } from "@/components/shop/ShopUi";

function Seg({ C, value, options, onChange }: { C: ThemeTokens; value: string; options: { k: string; label: string; icon: any }[]; onChange: (k: string) => void }) {
  return (
    <View style={[styles.seg, { borderColor: C.border }]}>
      {options.map((o) => {
        const on = value === o.k;
        return (
          <Pressable key={o.k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.k)} style={[styles.segItem, on && { backgroundColor: C.primary }]}>
            <Ionicons name={o.icon} size={16} color={on ? C.onPrimary : C.text} />
            <Text style={{ color: on ? C.onPrimary : C.text, fontWeight: "800", fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ShopCartScreen() {
  const C = useThemeTokens();
  const userInfo = useSelector((s: any) => s?.auth?.userInfo);
  const cart = useShopCart();
  const { data: shop } = useShopInfo();
  const [createOrder, { isLoading }] = useCreateShopOrderMutation();
  const [name, setName] = useState(String(userInfo?.name || ""));
  const [phone, setPhone] = useState(String(userInfo?.phone || ""));
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [delivery, setDelivery] = useState<"ship" | "tournament">("ship");
  const [tourId, setTourId] = useState("");
  const [tourOpen, setTourOpen] = useState(false);
  const [payment, setPayment] = useState<"cod" | "qr">("cod");
  const tours: any[] = shop?.tournaments || [];
  const tourName = tours.find((t) => t._id === tourId)?.name || "";
  const input = [styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.field }];

  const submit = async () => {
    if (!userInfo?._id) {
      return Alert.alert("Cần đăng nhập", "Đăng nhập PickleTour để đặt hàng và theo dõi đơn.", [
        { text: "Để sau", style: "cancel" },
        { text: "Đăng nhập", onPress: () => router.push("/login" as any) },
      ]);
    }
    if (!cart.count) return;
    if (name.trim().length < 2) return Alert.alert("Thiếu thông tin", "Vui lòng nhập họ tên người nhận.");
    if (!/^(0|\+84)\d{9}$/.test(phone.replace(/\s/g, ""))) return Alert.alert("Thiếu thông tin", "Số điện thoại không hợp lệ.");
    if (delivery === "ship" && address.trim().length < 8) return Alert.alert("Thiếu thông tin", "Vui lòng nhập địa chỉ nhận hàng.");
    if (delivery === "tournament" && !tourId) return Alert.alert("Thiếu thông tin", "Vui lòng chọn giải để nhận hàng.");
    try {
      const o: any = await createOrder({
        items: cart.items.map((it) => ({ productId: it.productId, qty: it.qty, color: it.color })),
        customer: { name: name.trim(), phone: phone.replace(/\s/g, ""), address: address.trim(), note: note.trim() },
        delivery,
        tournamentId: delivery === "tournament" ? tourId : undefined,
        payment,
      }).unwrap();
      cart.clear();
      router.replace(`/shop/orders/${o._id}` as any);
    } catch (e: any) {
      Alert.alert("Không đặt được hàng", e?.data?.message || e?.message || "Vui lòng thử lại.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Giỏ hàng", headerShown: true }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120, maxWidth: 720, width: "100%", alignSelf: "center" }} keyboardShouldPersistTaps="handled">
          {!cart.count ? (
            <View style={{ alignItems: "center", gap: 10, marginTop: 40 }}>
              <Ionicons name="cart-outline" size={44} color={C.sub} />
              <Text style={{ color: C.sub }}>Giỏ hàng trống</Text>
              <Pressable accessibilityRole="button" onPress={() => router.replace("/shop" as any)}>
                <Text style={{ color: C.primary, fontWeight: "800" }}>Xem sản phẩm GOATWIN</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {cart.items.map((it) => (
                <View key={`${it.productId}:${it.color}`} style={[styles.item, { borderColor: C.border, backgroundColor: C.card }]}>
                  <View style={styles.thumb}>{it.image ? <ExpoImage source={{ uri: it.image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: C.text, fontWeight: "800" }} numberOfLines={2}>
                      {it.name}
                    </Text>
                    {it.color ? <Text style={{ color: C.sub, fontSize: 12.5 }}>Màu: {it.color}</Text> : null}
                    <Text style={{ color: GW_RED, fontWeight: "900" }}>{fmtVnd(it.price)}</Text>
                  </View>
                  <View style={[styles.stepper, { borderColor: C.border }]}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Giảm" hitSlop={6} onPress={() => cart.setQty(it.productId, it.color, it.qty - 1)} style={styles.stepBtn}>
                      <Ionicons name={it.qty <= 1 ? "trash-outline" : "remove"} size={16} color={C.text} />
                    </Pressable>
                    <Text style={{ color: C.text, fontWeight: "900", minWidth: 18, textAlign: "center" }}>{it.qty}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="Tăng" hitSlop={6} onPress={() => cart.setQty(it.productId, it.color, it.qty + 1)} style={styles.stepBtn}>
                      <Ionicons name="add" size={16} color={C.text} />
                    </Pressable>
                  </View>
                </View>
              ))}

              <Text style={[styles.section, { color: C.text }]}>Người nhận</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Họ và tên" placeholderTextColor={C.sub} style={input} />
              <TextInput value={phone} onChangeText={setPhone} placeholder="Số điện thoại" keyboardType="phone-pad" placeholderTextColor={C.sub} style={input} />

              <Text style={[styles.section, { color: C.text }]}>Nhận hàng</Text>
              <Seg
                C={C}
                value={delivery}
                onChange={(k) => setDelivery(k as any)}
                options={[
                  { k: "ship", label: "Giao tận nơi", icon: "car-outline" },
                  { k: "tournament", label: "Nhận tại giải", icon: "trophy-outline" },
                ]}
              />
              {delivery === "ship" ? (
                <>
                  <TextInput value={address} onChangeText={setAddress} placeholder="Địa chỉ nhận hàng (số nhà, đường, phường/xã, tỉnh)" placeholderTextColor={C.sub} multiline style={[...input, { minHeight: 64 }]} />
                  {shop?.shippingNote ? <Text style={{ color: C.sub, fontSize: 12.5 }}>{shop.shippingNote}</Text> : null}
                </>
              ) : (
                <View style={[styles.card, { borderColor: C.border, backgroundColor: C.card }]}>
                  <Pressable accessibilityRole="button" onPress={() => setTourOpen((x) => !x)} style={styles.row}>
                    <Ionicons name="trophy-outline" size={18} color={C.primary} />
                    <Text style={{ color: tourName ? C.text : C.sub, flex: 1, fontWeight: "700" }} numberOfLines={1}>
                      {tourName || "Chọn giải nhận hàng"}
                    </Text>
                    <Ionicons name={tourOpen ? "chevron-up" : "chevron-down"} size={18} color={C.sub} />
                  </Pressable>
                  {tourOpen
                    ? tours.map((t) => (
                        <Pressable
                          key={t._id}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: tourId === t._id }}
                          onPress={() => {
                            setTourId(t._id);
                            setTourOpen(false);
                          }}
                          style={[styles.row, { borderTopWidth: 1, borderTopColor: C.border }]}
                        >
                          <Text style={{ color: C.text, flex: 1 }} numberOfLines={2}>
                            {t.name}
                          </Text>
                          {tourId === t._id ? <Ionicons name="checkmark-circle" size={18} color={C.primary} /> : null}
                        </Pressable>
                      ))
                    : null}
                  {tourOpen && !tours.length ? <Text style={{ color: C.sub, padding: 12 }}>Chưa có giải sắp diễn ra.</Text> : null}
                </View>
              )}

              <Text style={[styles.section, { color: C.text }]}>Thanh toán</Text>
              <Seg
                C={C}
                value={payment}
                onChange={(k) => setPayment(k as any)}
                options={[
                  { k: "cod", label: "Khi nhận hàng", icon: "cash-outline" },
                  ...(shop?.qrEnabled ? [{ k: "qr", label: "Chuyển khoản QR", icon: "qr-code-outline" }] : []),
                ]}
              />
              <TextInput value={note} onChangeText={setNote} placeholder="Ghi chú cho gian hàng (tuỳ chọn)" placeholderTextColor={C.sub} style={input} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {cart.count ? (
        <View style={[styles.bar, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.sub, fontSize: 12.5 }}>Tạm tính · {cart.count} sản phẩm</Text>
            <Text style={{ color: GW_RED, fontWeight: "900", fontSize: 19 }}>{fmtVnd(cart.total)}</Text>
          </View>
          <Pressable accessibilityRole="button" disabled={isLoading} onPress={submit} style={[styles.order, { backgroundColor: C.primary }]}>
            {isLoading ? <ActivityIndicator color={C.onPrimary} /> : <Text style={{ color: C.onPrimary, fontWeight: "900", fontSize: 15 }}>Đặt hàng</Text>}
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, borderWidth: 1 },
  thumb: { width: 64, height: 64, borderRadius: 10, overflow: "hidden", backgroundColor: "#05080F" },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, height: 36 },
  stepBtn: { width: 30, height: 36, alignItems: "center", justifyContent: "center" },
  section: { fontWeight: "900", fontSize: 15, marginTop: 6 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 },
  seg: { flexDirection: "row", gap: 4, padding: 3, borderRadius: 12, borderWidth: 1 },
  segItem: { flex: 1, minHeight: 40, borderRadius: 9, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, minHeight: 48 },
  bar: { position: "absolute", left: 12, right: 12, bottom: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, borderWidth: 1 },
  order: { height: 48, minWidth: 130, paddingHorizontal: 22, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
