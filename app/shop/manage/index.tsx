// app/shop/manage/index.tsx — Quản lý gian hàng GOATWIN trong app (admin hoặc người được admin cấp quyền):
// đơn hàng (lọc trạng thái, tìm, quét mã đơn) + sản phẩm (thêm / sửa / ẩn).
import React, { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import TextInput from "@/components/ui/i18nTextInput";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useGetManageOrdersQuery, useGetManageProductsQuery } from "@/slices/shopApiSlice";
import { GW_RED, ORDER_STATUS, StatusPill, fmtVnd } from "@/components/shop/ShopUi";

const FILTERS = ["", "pending", "confirmed", "shipping", "done", "cancelled"];

export default function ShopManageScreen() {
  const C = useThemeTokens();
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");
  const orders = useGetManageOrdersQuery({ status, q }, { skip: tab !== "orders", pollingInterval: 30000 });
  const products = useGetManageProductsQuery(undefined, { skip: tab !== "products" });
  const counts = orders.data?.counts || {};
  const err: any = orders.error || products.error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Quản lý gian hàng",
          headerShown: true,
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Quét mã đơn" hitSlop={10} onPress={() => router.push("/shop/manage/scan" as any)}>
              <Ionicons name="scan-outline" size={24} color={C.text} />
            </Pressable>
          ),
        }}
      />
      <View style={[styles.tabs, { borderColor: C.border }]}>
        {[
          { k: "orders", label: "Đơn hàng" },
          { k: "products", label: "Sản phẩm" },
        ].map((t) => (
          <Pressable key={t.k} accessibilityRole="tab" accessibilityState={{ selected: tab === t.k }} onPress={() => setTab(t.k as any)} style={[styles.tab, tab === t.k && { backgroundColor: C.primary }]}>
            <Text style={{ color: tab === t.k ? C.onPrimary : C.text, fontWeight: "800" }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {err?.status === 403 ? (
        <Text style={{ color: C.sub, textAlign: "center", marginTop: 30, paddingHorizontal: 24 }}>{err?.data?.message || "Bạn chưa được cấp quyền quản lý gian hàng."}</Text>
      ) : tab === "orders" ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 10, maxWidth: 720, width: "100%", alignSelf: "center" }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={orders.isFetching} onRefresh={orders.refetch} tintColor={C.primary} />}
        >
          <Pressable accessibilityRole="button" onPress={() => router.push("/shop/manage/scan" as any)} style={[styles.scan, { backgroundColor: C.primary }]}>
            <Ionicons name="qr-code-outline" size={20} color={C.onPrimary} />
            <Text style={{ color: C.onPrimary, fontWeight: "900" }}>Quét mã đơn của khách</Text>
          </Pressable>
          <TextInput value={q} onChangeText={setQ} placeholder="Tìm mã đơn, tên, SĐT…" placeholderTextColor={C.sub} style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.field }]} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FILTERS.map((f) => {
              const on = status === f;
              const n = f ? counts[f]?.n || 0 : Object.values(counts).reduce((a: number, c: any) => a + (c?.n || 0), 0);
              return (
                <Pressable key={f || "all"} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setStatus(f)} style={[styles.chip, { borderColor: on ? C.primary : C.border, backgroundColor: on ? C.primary : "transparent" }]}>
                  <Text style={{ color: on ? C.onPrimary : C.text, fontWeight: "700", fontSize: 13 }}>
                    {f ? ORDER_STATUS[f].label : "Tất cả"} ({n})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {orders.isLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
          ) : (orders.data?.orders || []).length ? (
            orders.data.orders.map((o: any) => (
              <Pressable key={o._id} accessibilityRole="button" onPress={() => router.push(`/shop/manage/orders/${o._id}` as any)} style={[styles.card, { borderColor: C.border, backgroundColor: C.card }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <Text style={{ color: C.text, fontWeight: "900" }}>{o.code}</Text>
                  <StatusPill status={o.status} />
                </View>
                <Text style={{ color: C.text, marginTop: 4 }} numberOfLines={1}>
                  {o.customer?.name} · {o.customer?.phone}
                </Text>
                <Text style={{ color: C.sub, fontSize: 12.5 }} numberOfLines={1}>
                  {o.delivery === "tournament" ? `Nhận tại ${o.tournament?.name || "giải"}` : o.customer?.address}
                </Text>
                <Text style={{ color: C.sub, fontSize: 12.5, marginTop: 2 }}>
                  {new Date(o.createdAt).toLocaleString("vi-VN")} · {o.items.reduce((n: number, it: any) => n + it.qty, 0)} sp ·{" "}
                  <Text style={{ color: GW_RED, fontWeight: "900" }}>{fmtVnd(o.total)}</Text> · {o.payment === "qr" ? "QR" : "COD"}
                  {o.paid ? " · Đã TT" : ""}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={{ color: C.sub, textAlign: "center", marginTop: 20 }}>Không có đơn.</Text>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 10, maxWidth: 720, width: "100%", alignSelf: "center" }}
          refreshControl={<RefreshControl refreshing={products.isFetching} onRefresh={products.refetch} tintColor={C.primary} />}
        >
          <Pressable accessibilityRole="button" onPress={() => router.push("/shop/manage/product" as any)} style={[styles.scan, { backgroundColor: C.primary }]}>
            <Ionicons name="add-circle-outline" size={20} color={C.onPrimary} />
            <Text style={{ color: C.onPrimary, fontWeight: "900" }}>Thêm sản phẩm</Text>
          </Pressable>
          {products.isLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
          ) : (
            (products.data?.products || []).map((p: any) => (
              <Pressable
                key={p._id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: "/shop/manage/product", params: { id: p._id } } as any)}
                style={[styles.card, { flexDirection: "row", gap: 12, alignItems: "center", borderColor: C.border, backgroundColor: C.card, opacity: p.active ? 1 : 0.55 }]}
              >
                <View style={styles.thumb}>{p.images?.[0] ? <ExpoImage source={{ uri: p.images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: "800" }} numberOfLines={2}>
                    {p.name}
                  </Text>
                  <Text style={{ color: GW_RED, fontWeight: "900" }}>{fmtVnd(p.price)}</Text>
                  <Text style={{ color: C.sub, fontSize: 12 }}>
                    {p.active ? "Đang bán" : "Đang ẩn"} · đã bán {p.sold || 0}
                  </Text>
                </View>
                <Ionicons name="create-outline" size={20} color={C.sub} />
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 4, margin: 16, marginBottom: 0, padding: 3, borderRadius: 12, borderWidth: 1 },
  tab: { flex: 1, height: 40, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  scan: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", height: 48, borderRadius: 14 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14.5 },
  chip: { paddingHorizontal: 12, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  card: { padding: 12, borderRadius: 16, borderWidth: 1 },
  thumb: { width: 60, height: 60, borderRadius: 10, overflow: "hidden", backgroundColor: "#05080F" },
});
