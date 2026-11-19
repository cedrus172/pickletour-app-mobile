// components/shop/ShopUi.tsx — thành phần dùng chung Gian hàng GOATWIN (mockup docs/mockups/goatwin-*.png).
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import type { ThemeTokens } from "@/hooks/useThemeTokens";

export const GW_RED = "#E11D2A";
export const GW_LIME = "#C5F433";
export const fmtVnd = (n?: number | null) => `${Math.round(Number(n) || 0).toLocaleString("vi-VN")}đ`;
export const discountPct = (p: any) => (p?.compareAtPrice > p?.price ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0);

export const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ xác nhận", color: "#F59E0B" },
  confirmed: { label: "Đã xác nhận", color: "#0EA5E9" },
  shipping: { label: "Đang giao", color: "#6366F1" },
  done: { label: "Hoàn tất", color: "#16A34A" },
  cancelled: { label: "Đã huỷ", color: "#94A3B8" },
};

export function StatusPill({ status }: { status: string }) {
  const s = ORDER_STATUS[status] || { label: status, color: "#94A3B8" };
  return (
    <View style={[styles.pill, { backgroundColor: s.color }]}>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11.5 }}>{s.label}</Text>
    </View>
  );
}

export function Stars({ rating, count, C }: { rating?: number; count?: number; C: ThemeTokens }) {
  if (!rating) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons name="star" size={12} color="#FACC15" />
      <Text style={{ color: C.sub, fontSize: 12 }}>
        {Number(rating).toFixed(1)}
        {count ? ` (${count})` : ""}
      </Text>
    </View>
  );
}

/** Thẻ sản phẩm trong lưới 2 cột. */
export function ProductCard({ p, C, width, onPress, onAdd }: { p: any; C: ThemeTokens; width: number; onPress: () => void; onAdd: () => void }) {
  const off = discountPct(p);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.card, { width, backgroundColor: C.card, borderColor: C.border }]}>
      <View style={{ width: "100%", aspectRatio: 1, backgroundColor: "#05080F" }}>
        {p.images?.[0] ? <ExpoImage source={{ uri: p.images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
        {p.exclusive ? (
          <View style={[styles.tag, { backgroundColor: GW_RED }]}>
            <Text style={styles.tagText}>Độc quyền</Text>
          </View>
        ) : null}
        {off ? (
          <View style={[styles.tag, { left: undefined, right: 8, backgroundColor: GW_LIME }]}>
            <Text style={[styles.tagText, { color: "#132000" }]}>-{off}%</Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: 10, gap: 3 }}>
        <Text style={{ color: C.text, fontWeight: "800", fontSize: 13.5 }} numberOfLines={2}>
          {p.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 6 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: GW_RED, fontWeight: "900", fontSize: 15 }}>{fmtVnd(p.price)}</Text>
            {off ? <Text style={{ color: C.sub, fontSize: 11.5, textDecorationLine: "line-through" }}>{fmtVnd(p.compareAtPrice)}</Text> : null}
            <Stars rating={p.rating} count={p.ratingCount} C={C} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Thêm ${p.name} vào giỏ`} hitSlop={6} onPress={onAdd} style={[styles.add, { backgroundColor: C.primary }]}>
            <Ionicons name="add" size={20} color={C.onPrimary} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

/** Nút giỏ hàng có số lượng. */
export function CartButton({ count, color, onPress }: { count: number; color: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Giỏ hàng" hitSlop={10} onPress={onPress} style={{ padding: 4 }}>
      <Ionicons name="cart-outline" size={25} color={color} />
      {count ? (
        <View style={styles.badge}>
          <Text style={{ color: "#fff", fontSize: 10.5, fontWeight: "900" }}>{count > 99 ? "99+" : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, alignSelf: "flex-start" },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  tag: { position: "absolute", top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tagText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  add: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -2, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: GW_RED, alignItems: "center", justifyContent: "center" },
});
