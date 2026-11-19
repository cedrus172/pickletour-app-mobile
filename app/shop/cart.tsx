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

const fmtDay = (d?: string) => (d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "");
/** Một giải nhận hàng: poster + tên + ngày + địa điểm (định nghĩa ngoài màn để không remount). */
function TourRow({ C, t, selected, onPress, action }: { C: ThemeTokens; t: any; selected?: boolean; onPress: () => void; action?: string }) {
  const days = [fmtDay(t.startDate), fmtDay(t.endDate)].filter(Boolean);
  const when = days.length === 2 && days[0] !== days[1] ? `${days[0]} – ${days[1]}` : days[0] || "";
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: !!selected }} onPress={onPress} style={styles.tourRow}>
      <View style={[styles.poster, { backgroundColor: C.field }]}>
        {t.image ? <ExpoImage source={{ uri: t.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : <Ionicons name="trophy" size={22} color={C.sub} />}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={{ color: C.text, fontWeight: "800", fontSize: 14 }} numberOfLines={2}>
          {t.name}
        </Text>
        {when ? (
          <View style={styles.meta}>
            <Ionicons name="calendar-outline" size={13} color={C.sub} />
            <Text style={{ color: C.sub, fontSize: 12.5 }}>{when}</Text>
          </View>
        ) : null}
        {t.location ? (
          <View style={styles.meta}>
            <Ionicons name="location-outline" size={13} color={C.sub} />
            <Text style={{ color: C.sub, fontSize: 12.5, flex: 1 }} numberOfLines={1}>
              {t.location}
            </Text>
          </View>
        ) : null}
      </View>
      {action ? (
        <Text style={{ color: C.primary, fontWeight: "800" }}>{action}</Text>
      ) : (
        <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={22} color={selected ? C.primary : C.border} />
      )}
    </Pressable>
  );
}

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
  const tourSel = tours.find((t) => t._id === tourId) || null;
  // Phí ship: mọi sản phẩm freeship → miễn phí; còn lại thu khi nhận hàng (COD)
  const allFree = cart.items.length > 0 && cart.items.every((it) => it.freeShip);
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
                  <View style={[styles.shipNote, { borderColor: allFree ? "#16A34A" : C.border }]}>
                    <Ionicons name={allFree ? "gift-outline" : "cash-outline"} size={16} color={allFree ? "#16A34A" : C.primary} />
                    <Text style={{ color: allFree ? "#16A34A" : C.text, fontSize: 13, fontWeight: "700", flex: 1 }}>
                      {allFree ? "Miễn phí vận chuyển" : "Phí ship: thu khi nhận hàng (COD)"}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={[styles.card, { borderColor: tourId ? C.primary : C.border, backgroundColor: C.card }]}>
                  {tourSel && !tourOpen ? (
                    <TourRow C={C} t={tourSel} selected onPress={() => setTourOpen(true)} action="Đổi" />
                  ) : (
                    <Pressable accessibilityRole="button" onPress={() => setTourOpen((x) => !x)} style={styles.row}>
                      <Ionicons name="trophy-outline" size={18} color={C.primary} />
                      <Text style={{ color: C.sub, flex: 1, fontWeight: "700" }}>Chọn giải nhận hàng</Text>
                      <Ionicons name={tourOpen ? "chevron-up" : "chevron-down"} size={18} color={C.sub} />
                    </Pressable>
                  )}
                  {tourOpen
                    ? tours.map((t) => (
                        <View key={t._id} style={{ borderTopWidth: 1, borderTopColor: C.border }}>
                          <TourRow
                            C={C}
                            t={t}
                            selected={tourId === t._id}
                            onPress={() => {
                              setTourId(t._id);
                              setTourOpen(false);
                            }}
                          />
                        </View>
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
  shipNote: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  tourRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10 },
  poster: { width: 56, height: 74, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  bar: { position: "absolute", left: 12, right: 12, bottom: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, borderWidth: 1 },
  order: { height: 48, minWidth: 130, paddingHorizontal: 22, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
