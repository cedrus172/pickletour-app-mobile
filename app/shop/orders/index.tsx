// app/shop/orders/index.tsx — Đơn hàng của tôi (Gian hàng GOATWIN)
import React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useGetMyShopOrdersQuery } from "@/slices/shopApiSlice";
import { GW_RED, StatusPill, fmtVnd } from "@/components/shop/ShopUi";

export default function MyShopOrdersScreen() {
  const C = useThemeTokens();
  const { data, isLoading, isFetching, refetch } = useGetMyShopOrdersQuery(undefined);
  const orders: any[] = data?.orders || [];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Đơn hàng của tôi", headerShown: true }} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, maxWidth: 720, width: "100%", alignSelf: "center" }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 30 }} />
        ) : orders.length ? (
          orders.map((o) => (
            <Pressable key={o._id} accessibilityRole="button" onPress={() => router.push(`/shop/orders/${o._id}` as any)} style={[styles.card, { borderColor: C.border, backgroundColor: C.card }]}>
              <View style={styles.thumb}>{o.items?.[0]?.image ? <ExpoImage source={{ uri: o.items[0].image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <Text style={{ color: C.text, fontWeight: "900" }}>Đơn {o.code}</Text>
                  <StatusPill status={o.status} />
                </View>
                <Text style={{ color: C.sub, fontSize: 12.5 }} numberOfLines={1}>
                  {o.items.map((it: any) => `${it.name} ×${it.qty}`).join(", ")}
                </Text>
                <Text style={{ color: C.sub, fontSize: 12.5 }}>
                  {new Date(o.createdAt).toLocaleDateString("vi-VN")} · <Text style={{ color: GW_RED, fontWeight: "900" }}>{fmtVnd(o.total)}</Text>
                  {o.paid ? " · Đã thanh toán" : ""}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={{ color: C.sub, textAlign: "center", marginTop: 30 }}>Bạn chưa có đơn hàng nào.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: "center" },
  thumb: { width: 60, height: 60, borderRadius: 10, overflow: "hidden", backgroundColor: "#05080F" },
});
