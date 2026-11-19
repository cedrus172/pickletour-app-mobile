// app/shop/[id].tsx — Chi tiết sản phẩm GOATWIN (mockup docs/mockups/goatwin-3-san-pham.png)
import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, View, useWindowDimensions } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useGetShopProductQuery, useShopInfo } from "@/slices/shopApiSlice";
import { useShopCart } from "@/hooks/useShopCart";
import { CartButton, GW_LIME, GW_RED, discountPct, fmtVnd } from "@/components/shop/ShopUi";

export default function ShopProductScreen() {
  const C = useThemeTokens();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error } = useGetShopProductQuery(String(id), { skip: !id });
  const { data: shop } = useShopInfo();
  const cart = useShopCart();
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);
  const [page, setPage] = useState(0);
  const galleryRef = useRef<ScrollView>(null);
  const p: any = data?.product;
  const related: any[] = data?.related || [];
  const W = Math.min(width, 720);

  const header = (
    <Stack.Screen
      options={{
        title: "",
        headerShown: true,
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            {p ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Chia sẻ" hitSlop={10} onPress={() => Share.share({ message: `${p.name} — ${fmtVnd(p.price)}\nGian hàng GOATWIN trên PickleTour` })}>
                <Ionicons name="share-outline" size={22} color={C.text} />
              </Pressable>
            ) : null}
            <CartButton count={cart.count} color={C.text} onPress={() => router.push("/shop/cart" as any)} />
          </View>
        ),
      }}
    />
  );
  if (isLoading || !p) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        {header}
        {error ? <Text style={{ color: C.sub }}>Không tìm thấy sản phẩm</Text> : <ActivityIndicator color={C.primary} />}
      </View>
    );
  }
  // Màu có ảnh riêng → ảnh đó lên đầu (khách chọn màu nào thấy đúng sản phẩm màu đó).
  const colorImg = (p.colors || []).find((c: any) => c.name === color)?.image || "";
  const gallery: string[] = colorImg ? [colorImg, ...(p.images || []).filter((u: string) => u !== colorImg)] : p.images || [];
  const off = discountPct(p);
  const needColor = (p.colors || []).length > 0;
  const add = (go: boolean) => {
    if (needColor && !color) return Alert.alert("Chọn màu", "Vui lòng chọn màu sắc trước.");
    cart.add({ productId: p._id, name: p.name, image: colorImg || p.images?.[0] || "", price: p.price, color }, qty);
    if (go) router.push("/shop/cart" as any);
    else Alert.alert("Đã thêm vào giỏ", `${p.name}${color ? ` · ${color}` : ""} × ${qty}`);
  };
  const lines = String(p.description || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      {header}
      <ScrollView contentContainerStyle={{ paddingBottom: 110, maxWidth: 720, width: "100%", alignSelf: "center" }}>
        <ScrollView
          ref={galleryRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / W))}
        >
          {(gallery.length ? gallery : [""]).map((u: string, i: number) => (
            <View key={i} style={{ width: W, aspectRatio: 1, backgroundColor: "#05080F" }}>
              {u ? <ExpoImage source={{ uri: u }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
            </View>
          ))}
        </ScrollView>
        {gallery.length > 1 ? (
          <View style={styles.dots}>
            {gallery.map((_: any, i: number) => (
              <View key={i} style={[styles.dot, { backgroundColor: i === page ? C.primary : C.border }]} />
            ))}
          </View>
        ) : null}

        <View style={{ padding: 16, gap: 10 }}>
          {needColor ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: C.sub, fontWeight: "700" }}>Màu sắc{color ? `: ${color}` : ""}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {p.colors.map((c: any) => (
                  <Pressable
                    key={c.name}
                    accessibilityRole="radio"
                    accessibilityLabel={c.name}
                    accessibilityState={{ selected: color === c.name }}
                    onPress={() => {
                      setColor(c.name);
                      // về ảnh đầu (ảnh của màu vừa chọn)
                      galleryRef.current?.scrollTo({ x: 0, animated: false });
                      setPage(0);
                    }}
                    style={[styles.swatch, { borderColor: color === c.name ? C.primary : C.border }]}
                  >
                    {c.image ? (
                      <ExpoImage source={{ uri: c.image }} style={[styles.swatchDot, { width: 26, height: 26, borderRadius: 13 }]} contentFit="cover" />
                    ) : (
                      <View style={[styles.swatchDot, { backgroundColor: c.hex || "#888" }]} />
                    )}
                    <Text style={{ color: C.text, fontSize: 12.5 }}>{c.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <Text style={{ color: C.text, fontWeight: "900", fontSize: 21 }}>{p.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {p.exclusive ? (
              <View style={[styles.badge, { backgroundColor: GW_RED }]}>
                <Ionicons name="star" size={12} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Độc quyền PickleTour</Text>
              </View>
            ) : null}
            {p.rating ? (
              <Text style={{ color: C.sub }}>
                {Number(p.rating).toFixed(1)} ★{p.sold ? ` · Đã bán ${p.sold}` : ""}
              </Text>
            ) : p.sold ? (
              <Text style={{ color: C.sub }}>Đã bán {p.sold}</Text>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ color: GW_RED, fontWeight: "900", fontSize: 26 }}>{fmtVnd(p.price)}</Text>
            {off ? (
              <>
                <Text style={{ color: C.sub, textDecorationLine: "line-through" }}>{fmtVnd(p.compareAtPrice)}</Text>
                <View style={[styles.badge, { backgroundColor: GW_LIME }]}>
                  <Text style={{ color: "#132000", fontWeight: "900", fontSize: 12 }}>-{off}%</Text>
                </View>
              </>
            ) : null}
          </View>

          <View style={[styles.info, { borderColor: C.border, backgroundColor: C.card }]}>
            {[
              { icon: "car-outline", text: shop?.shippingNote || "Giao hàng toàn quốc" },
              { icon: "trophy-outline", text: "Nhận tại giải đấu (chọn khi đặt hàng)" },
              { icon: "qr-code-outline", text: shop?.qrEnabled ? "Thanh toán QR / COD" : "Thanh toán khi nhận hàng (COD)" },
            ].map((r, i) => (
              <View key={i} style={[styles.infoRow, i ? { borderTopWidth: 1, borderTopColor: C.border } : null]}>
                <Ionicons name={r.icon as any} size={18} color={C.primary} />
                <Text style={{ color: C.text, flex: 1, fontSize: 13.5 }}>{r.text}</Text>
              </View>
            ))}
          </View>

          {lines.length ? (
            <View style={{ gap: 4 }}>
              <Text style={{ color: C.text, fontWeight: "900", fontSize: 16 }}>Mô tả</Text>
              {lines.map((l, i) => (
                <Text key={i} style={{ color: C.sub, lineHeight: 20 }}>
                  • {l}
                </Text>
              ))}
            </View>
          ) : null}

          {related.length ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              <Text style={{ color: C.text, fontWeight: "900", fontSize: 16 }}>Thường mua kèm</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {related.map((r) => (
                  <Pressable key={r._id} accessibilityRole="button" onPress={() => router.push(`/shop/${r._id}` as any)} style={[styles.rel, { borderColor: C.border, backgroundColor: C.card }]}>
                    <View style={{ width: "100%", aspectRatio: 1, backgroundColor: "#05080F" }}>
                      {r.images?.[0] ? <ExpoImage source={{ uri: r.images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                    </View>
                    <View style={{ padding: 8 }}>
                      <Text style={{ color: C.text, fontSize: 12.5, fontWeight: "700" }} numberOfLines={2}>
                        {r.name}
                      </Text>
                      <Text style={{ color: GW_RED, fontWeight: "900" }}>{fmtVnd(r.price)}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bar, { backgroundColor: C.bg, borderTopColor: C.border }]}>
        <View style={[styles.stepper, { borderColor: C.border }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Giảm" hitSlop={6} onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.stepBtn}>
            <Ionicons name="remove" size={18} color={C.text} />
          </Pressable>
          <Text style={{ color: C.text, fontWeight: "900", minWidth: 22, textAlign: "center" }}>{qty}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Tăng" hitSlop={6} onPress={() => setQty((q) => Math.min(99, q + 1))} style={styles.stepBtn}>
            <Ionicons name="add" size={18} color={C.text} />
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={() => add(false)} style={[styles.btn, { borderColor: C.primary, borderWidth: 1.5 }]}>
          <Ionicons name="cart-outline" size={18} color={C.primary} />
          <Text style={{ color: C.primary, fontWeight: "900" }} numberOfLines={1}>
            Thêm vào giỏ
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => add(true)} style={[styles.btn, { backgroundColor: C.primary }]}>
          <Text style={{ color: C.onPrimary, fontWeight: "900" }}>Mua ngay</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  swatch: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, height: 36, borderRadius: 18, borderWidth: 1.5 },
  swatchDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  info: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, minHeight: 46 },
  rel: { width: 130, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: 8, padding: 12, paddingBottom: 26, borderTopWidth: 1 },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, height: 46 },
  stepBtn: { width: 34, height: 46, alignItems: "center", justifyContent: "center" },
  btn: { flex: 1, height: 46, borderRadius: 12, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
});
