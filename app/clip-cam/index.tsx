// app/clip-cam/index.tsx — Cắt Cam Sân (PickClip): danh sách SÂN (card ảnh+tên+địa chỉ,
// như tab Đặt sân) theo QUYỀN → chạm vào sân có quyền để xem/cắt camera.
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { fetchChannels, thumbnailUrl, type Channel } from "@/utils/pickclip";

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

/** Khung camera của 1 venue (dùng ở pane phải khi màn lớn — two-pane master-detail). */
function CamerasPane({ base, venueName, C }: { base: string; venueName: string; C: ThemeTokens }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr(""); setLoading(true);
    try { setChannels(await fetchChannels(base)); }
    catch (e: any) { setChannels([]); setErr(e?.message || "Không tải được camera"); }
    finally { setLoading(false); }
  }, [base]);
  useEffect(() => { load(); }, [load]);

  const open = (ch: Channel) =>
    router.push({ pathname: "/clip-cam/cut", params: { base, venueName, chId: String(ch.id), chName: ch.name } } as any);

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: C.text, fontWeight: "800", fontSize: 16, marginBottom: 10 }}>{venueName}</Text>
      {loading ? (
        <View style={{ paddingVertical: 48, alignItems: "center" }}><ActivityIndicator color={C.primary} /></View>
      ) : err ? (
        <View style={{ paddingVertical: 36, alignItems: "center" }}>
          <Ionicons name="videocam-off-outline" size={36} color={C.muted} />
          <Text style={{ color: C.sub, marginTop: 8 }}>{err}</Text>
        </View>
      ) : channels.length === 0 ? (
        <View style={{ paddingVertical: 36, alignItems: "center" }}>
          <Ionicons name="videocam-off-outline" size={36} color={C.muted} />
          <Text style={{ color: C.sub, marginTop: 8 }}>Chưa có camera.</Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {channels.map((ch) => (
            <Pressable key={ch.id} onPress={() => open(ch)} style={{ width: "48.5%", borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, padding: 8, marginBottom: 12 }}>
              <View style={{ borderRadius: 10, overflow: "hidden", backgroundColor: "#000", aspectRatio: 16 / 10 }}>
                <Image source={{ uri: thumbnailUrl(base, ch.id) }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                <View style={{ position: "absolute", right: 8, bottom: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 999, padding: 7 }}>
                  <Ionicons name="cut" size={16} color="#fff" />
                </View>
              </View>
              <Text numberOfLines={1} style={{ color: C.text, fontWeight: "700", fontSize: 14, marginTop: 8 }}>{ch.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ClipCamScreen() {
  const C = useThemeTokens();
  const styles = useMemo(() => mkStyles(C), [C]);
  const rsp = useResponsive();
  const { data, isLoading, isError, refetch, isFetching } = useMyCamClipAccessQuery(undefined);
  const venues: Access[] = Array.isArray(data) ? data : [];
  const twoPane = rsp.isLarge; // iPhone Duo mở / iPad: hiện venue | camera cạnh nhau

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedVenue = venues.find((v) => v.venueId === selectedId) || null;
  // Màn lớn: tự chọn sân có quyền đầu tiên để pane phải không trống.
  useEffect(() => {
    if (twoPane && !selectedId) {
      const first = venues.find((v) => v.hasAccess);
      if (first) setSelectedId(first.venueId);
    }
  }, [twoPane, selectedId, venues]);

  const onPress = useCallback((v: Access) => {
    if (!v.hasAccess) {
      Alert.alert(
        "Chưa có quyền cắt cam",
        "Đặt sân qua app để được cắt cam miễn phí 48 giờ sau khi nhận sân, hoặc liên hệ chủ sân để được cấp quyền.",
        [{ text: "Để sau", style: "cancel" }, { text: "Đặt sân ngay", onPress: () => router.push("/courts" as any) }],
      );
      return;
    }
    if (twoPane) {
      setSelectedId(v.venueId); // chọn → hiện camera ở pane phải (không chuyển màn)
    } else {
      router.push({ pathname: "/clip-cam/channels", params: { base: v.piBaseUrl, venueName: v.venueName } } as any);
    }
  }, [twoPane]);

  const venueScroll = (
      <ScrollView
        contentContainerStyle={[{ padding: 14, paddingBottom: 32 }, rsp.isWide && !twoPane && { maxWidth: rsp.contentMaxWidth, alignSelf: "center", width: "100%" }]}
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
              <Pressable key={v.venueId} onPress={() => onPress(v)} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }, twoPane && selectedId === v.venueId && { borderColor: C.primary, borderWidth: 2 }]}>
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
  );

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Cắt Cam Sân", headerShown: true }} />
      {twoPane && venues.length > 0 ? (
        <View style={{ flexDirection: "row", flex: 1 }}>
          <View style={{ width: 400, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: C.border }}>{venueScroll}</View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18 }}>
            {selectedVenue?.hasAccess ? (
              <CamerasPane base={selectedVenue.piBaseUrl} venueName={selectedVenue.venueName} C={C} />
            ) : (
              <View style={styles.center}>
                <Ionicons name="videocam-outline" size={44} color={C.muted} />
                <Text style={{ color: C.sub, marginTop: 10 }}>Chọn một sân (có quyền) để xem camera</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        venueScroll
      )}
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
