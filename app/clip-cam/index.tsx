// app/clip-cam/index.tsx — Cắt Cam Sân (PickClip): danh sách SÂN (card ảnh+tên+địa chỉ,
// như tab Đặt sân) theo QUYỀN → chạm vào sân có quyền để xem/cắt camera.
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { useResponsive } from "@/hooks/useResponsive";
import { useMyCamClipAccessQuery } from "@/slices/camClipApiSlice";

type Access = {
  venueId: string;
  venueName: string;
  logo?: string;
  address?: string;
  province?: string;
  images?: string[];
  piBaseUrl: string;
  hasAccess: boolean;
  source: "admin" | "owner" | "manager" | "manual" | "booking" | null;
  expiresAt: string | null;
};

function accessLabel(a: Access): string {
  if (!a.hasAccess) return "Chưa có quyền";
  if (a.source === "owner" || a.source === "manager") return "Chủ sân";
  if (a.source === "admin") return "Admin";
  if (!a.expiresAt) return "Vĩnh viễn";
  const ms = new Date(a.expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Hết hạn";
  const h = Math.floor(ms / 3600000);
  if (h < 24) return `Còn ${h} giờ`;
  return `Còn ${Math.floor(h / 24)} ngày`;
}

export default function ClipCamScreen() {
  const C = useThemeTokens();
  const styles = useMemo(() => mkStyles(C), [C]);
  const rsp = useResponsive();
  const { data, isLoading, isError, refetch, isFetching } = useMyCamClipAccessQuery(undefined);
  const venues: Access[] = Array.isArray(data) ? data : [];

  const onPress = useCallback((v: Access) => {
    if (v.hasAccess) {
      router.push({ pathname: "/clip-cam/channels", params: { base: v.piBaseUrl, venueName: v.venueName } } as any);
    } else {
      Alert.alert(
        "Chưa có quyền cắt cam",
        "Đặt sân qua app để được cắt cam miễn phí 48 giờ sau khi nhận sân, hoặc liên hệ chủ sân để được cấp quyền.",
        [{ text: "Để sau", style: "cancel" }, { text: "Đặt sân ngay", onPress: () => router.push("/courts" as any) }],
      );
    }
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Cắt Cam Sân", headerShown: true }} />
      <ScrollView
        contentContainerStyle={[{ padding: 14, paddingBottom: 32 }, rsp.isWide && { maxWidth: rsp.contentMaxWidth, alignSelf: "center", width: "100%" }]}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={C.primary} />}
      >
        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={C.primary} /></View>
        ) : isError ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={C.muted} />
            <Text style={{ color: C.sub, marginTop: 10 }}>Không tải được. Kéo xuống để thử lại.</Text>
          </View>
        ) : venues.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="videocam-off-outline" size={44} color={C.muted} />
            <Text style={[styles.emptyTitle, { color: C.text }]}>Chưa có sân nào hỗ trợ cắt cam</Text>
            <Text style={{ color: C.sub, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
              Tính năng đang được triển khai tại các sân có hệ thống camera. Vui lòng quay lại sau.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.hintRow}>
              <Ionicons name="cut-outline" size={16} color={C.primary} />
              <Text style={styles.hint}>Các sân có camera. Chọn sân bạn có quyền để cắt highlight.</Text>
            </View>
            {venues.map((v) => (
              <Pressable key={v.venueId} onPress={() => onPress(v)} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                <View>
                  {v.images?.[0] ? (
                    <Image source={{ uri: v.images[0] }} style={styles.cover} />
                  ) : (
                    <LinearGradient colors={C.heroGrad} style={[styles.cover, { alignItems: "center", justifyContent: "center" }]}>
                      <Ionicons name="videocam" size={40} color="rgba(255,255,255,0.6)" />
                    </LinearGradient>
                  )}
                  <LinearGradient colors={["rgba(2,6,23,0)", "rgba(2,6,23,0.8)"]} style={styles.coverShade} />
                  {/* Badge quyền */}
                  <View style={[styles.badge, { backgroundColor: v.hasAccess ? C.primary : "rgba(2,6,23,0.72)" }]}>
                    <Ionicons name={v.hasAccess ? "shield-checkmark" : "lock-closed"} size={12} color="#fff" />
                    <Text style={styles.badgeText}>{accessLabel(v)}</Text>
                  </View>
                  {/* Overlay mờ khi khoá */}
                  {!v.hasAccess && <View style={styles.lockVeil} />}
                  <View style={styles.coverBottom}>
                    <Text style={styles.coverTitle} numberOfLines={1}>{v.venueName}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="location" size={12} color="rgba(255,255,255,0.85)" />
                      <Text style={styles.coverSub} numberOfLines={1}>{[v.address, v.province].filter(Boolean).join(", ") || "—"}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardFoot}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="cut" size={15} color={C.primary} />
                    <Text style={{ color: C.text, fontWeight: "700", fontSize: 13 }}>
                      {v.hasAccess ? "Cắt highlight" : "Chưa có quyền"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.muted} />
                </View>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const mkStyles = (C: ThemeTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    hintRow: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 6 },
    hint: { color: C.sub, flex: 1, fontSize: 13 },
    center: { alignItems: "center", justifyContent: "center", paddingVertical: 56, paddingHorizontal: 20 },
    emptyTitle: { fontWeight: "800", fontSize: 16, marginTop: 14 },
    card: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 14 },
    cover: { width: "100%", height: 160 },
    coverShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 96 },
    lockVeil: { position: "absolute", left: 0, top: 0, right: 0, height: 160, backgroundColor: "rgba(2,6,23,0.35)" },
    coverBottom: { position: "absolute", left: 14, right: 14, bottom: 12 },
    coverTitle: { color: "#fff", fontWeight: "900", fontSize: 18, letterSpacing: -0.3 },
    coverSub: { color: "rgba(255,255,255,0.85)", fontSize: 12.5, flexShrink: 1 },
    badge: { position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    badgeText: { color: "#fff", fontWeight: "800", fontSize: 11.5 },
    cardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 },
  });
