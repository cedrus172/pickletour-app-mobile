// app/shop/index.tsx — Gian hàng độc quyền GOATWIN (mockup docs/mockups/goatwin-2-cua-hang.png)
import React, { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useGetShopProductsQuery, useShopInfo } from "@/slices/shopApiSlice";
import { useShopCart } from "@/hooks/useShopCart";
import { CartButton, GW_RED, ProductCard, fmtVnd } from "@/components/shop/ShopUi";

export default function ShopScreen() {
  const C = useThemeTokens();
  const { width } = useWindowDimensions();
  const [cat, setCat] = useState("");
  const { data: shop, isLoading: loadingShop } = useShopInfo();
  const { data, isFetching, refetch } = useGetShopProductsQuery(cat, { skip: !shop?.enabled });
  const cart = useShopCart();
  const products: any[] = data?.products || [];
  const cardW = Math.floor((Math.min(width, 720) - 16 * 2 - 12) / 2);

  const header = (
    <Stack.Screen
      options={{
        title: "Gian hàng GOATWIN",
        headerShown: true,
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            {shop?.isManager ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Quản lý gian hàng" hitSlop={10} onPress={() => router.push("/shop/manage" as any)}>
                <Ionicons name="settings-outline" size={22} color={C.text} />
              </Pressable>
            ) : null}
            <CartButton count={cart.count} color={C.text} onPress={() => router.push("/shop/cart" as any)} />
          </View>
        ),
      }}
    />
  );

  if (loadingShop) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        {header}
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }
  if (!shop?.enabled) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {header}
        <Ionicons name="storefront-outline" size={42} color={C.sub} />
        <Text style={{ color: C.text, fontWeight: "800", marginTop: 10 }}>Gian hàng chưa mở</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: cart.count ? 110 : 30, gap: 14, maxWidth: 720, width: "100%", alignSelf: "center" }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.primary} />}
      >
        {shop.heroImage ? (
          <View style={styles.heroImgBox}>
            <ExpoImage source={{ uri: shop.heroImage }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="left center" transition={200} />
            <View style={styles.heroCopy}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14.5 }} numberOfLines={2}>
                {shop.partnerText}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                {["Chính hãng 100%", "Giao toàn quốc", "Nhận tại giải"].map((t) => (
                  <View key={t} style={styles.chipSm}>
                    <Text style={{ color: "#fff", fontSize: 10.5, fontWeight: "700" }}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.hero, { borderColor: "rgba(225,29,42,0.55)" }]}>
          {shop.logo ? <ExpoImage source={{ uri: shop.logo }} style={{ width: 96, height: 48 }} contentFit="contain" /> : null}
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14.5 }}>{shop.partnerText}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {["Chính hãng 100%", "Giao toàn quốc", "Nhận tại giải"].map((t) => (
                <View key={t} style={styles.chipSm}>
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[{ key: "", label: "Tất cả" }, ...(shop.categories || [])].map((c: any) => {
            const on = cat === c.key;
            return (
              <Pressable
                key={c.key || "all"}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setCat(c.key)}
                style={[styles.cat, { borderColor: on ? GW_RED : C.border, backgroundColor: on ? GW_RED : "transparent" }]}
              >
                <Text style={{ color: on ? "#fff" : C.text, fontWeight: "700", fontSize: 13.5 }}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isFetching && !products.length ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 30 }} />
        ) : products.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {products.map((p) => (
              <ProductCard
                key={p._id}
                p={p}
                C={C}
                width={cardW}
                onPress={() => router.push(`/shop/${p._id}` as any)}
                onAdd={() =>
                  p.colors?.length
                    ? router.push(`/shop/${p._id}` as any)
                    : cart.add({ productId: p._id, name: p.name, image: p.images?.[0] || "", price: p.price, color: "", freeShip: !!p.freeShip })
                }
              />
            ))}
          </View>
        ) : (
          <Text style={{ color: C.sub, textAlign: "center", marginTop: 30 }}>Chưa có sản phẩm trong mục này.</Text>
        )}

        <Pressable accessibilityRole="button" onPress={() => router.push("/shop/orders" as any)} style={[styles.ordersLink, { borderColor: C.border }]}>
          <Ionicons name="receipt-outline" size={18} color={C.primary} />
          <Text style={{ color: C.text, fontWeight: "700", flex: 1 }}>Đơn hàng của tôi</Text>
          <Ionicons name="chevron-forward" size={18} color={C.sub} />
        </Pressable>
      </ScrollView>

      {cart.count ? (
        <View style={[styles.cartBar, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontWeight: "900", fontSize: 16 }}>Giỏ hàng</Text>
            <Text style={{ color: C.sub }}>
              {cart.count} sản phẩm · <Text style={{ color: GW_RED, fontWeight: "900" }}>{fmtVnd(cart.total)}</Text>
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push("/shop/cart" as any)} style={[styles.checkout, { backgroundColor: C.primary }]}>
            <Text style={{ color: C.onPrimary, fontWeight: "900", fontSize: 15 }}>Thanh toán</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 18, borderWidth: 1, backgroundColor: "#0A0A0E" },
  heroImgBox: { aspectRatio: 2.56, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(225,29,42,0.55)", backgroundColor: "#0A0A0E", justifyContent: "center" },
  heroCopy: { position: "absolute", left: "44%", right: 10, gap: 6 },
  chipSm: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", backgroundColor: "rgba(0,0,0,0.35)" },
  cat: { paddingHorizontal: 16, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  ordersLink: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  cartBar: { position: "absolute", left: 12, right: 12, bottom: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, borderWidth: 1 },
  checkout: { height: 46, paddingHorizontal: 22, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
