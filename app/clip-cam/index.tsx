// app/clip-cam/index.tsx — Cắt Cam Sân (PickClip): chọn venue (theo QUYỀN) → lưới camera.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { useMyCamClipAccessQuery } from "@/slices/camClipApiSlice";
import { fetchChannels, thumbnailUrl, type Channel } from "@/utils/pickclip";

type Access = {
  venueId: string;
  venueName: string;
  logo?: string;
  piBaseUrl: string;
  source: "admin" | "owner" | "manager" | "manual" | "booking";
  expiresAt: string | null;
};

function accessLabel(a: Access): string {
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

  const { data: access, isLoading: accLoading, isError: accError, refetch } = useMyCamClipAccessQuery();
  const venues: Access[] = Array.isArray(access) ? access : [];

  const [venueIdx, setVenueIdx] = useState(0);
  const venue = venues[Math.min(venueIdx, Math.max(0, venues.length - 1))];

  const [channels, setChannels] = useState<Channel[]>([]);
  const [chLoading, setChLoading] = useState(false);
  const [chErr, setChErr] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [thumbTick, setThumbTick] = useState(0);

  const loadChannels = useCallback(async (v?: Access) => {
    if (!v) { setChannels([]); return; }
    setChErr("");
    setChLoading(true);
    try {
      setChannels(await fetchChannels(v.piBaseUrl));
    } catch (e: any) {
      setChannels([]);
      setChErr(e?.message || "Không tải được danh sách sân");
    } finally {
      setChLoading(false);
    }
  }, []);

  useEffect(() => { loadChannels(venue); }, [venue?.piBaseUrl, loadChannels]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setThumbTick((t) => t + 1);
    await Promise.all([refetch(), loadChannels(venue)]);
    setRefreshing(false);
  }, [refetch, loadChannels, venue]);

  const openCut = (ch: Channel) => {
    if (!venue) return;
    router.push({
      pathname: "/clip-cam/cut",
      params: { base: venue.piBaseUrl, venueName: venue.venueName, chId: String(ch.id), chName: ch.name },
    } as any);
  };

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Cắt Cam Sân", headerShown: true }} />
      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        {accLoading ? (
          <View style={styles.center}><ActivityIndicator color={C.primary} /></View>
        ) : accError ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={C.muted} />
            <Text style={{ color: C.sub, marginTop: 10 }}>Không tải được quyền. Kéo xuống để thử lại.</Text>
          </View>
        ) : venues.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="lock-closed-outline" size={44} color={C.muted} />
            <Text style={[styles.emptyTitle, { color: C.text }]}>Bạn chưa có quyền cắt cam</Text>
            <Text style={{ color: C.sub, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
              Đặt sân qua app để được cắt cam miễn phí 48 giờ sau khi nhận sân, hoặc liên hệ chủ sân để được cấp quyền.
            </Text>
          </View>
        ) : (
          <>
            {/* Chọn venue (nếu có quyền ở nhiều sân) */}
            {venues.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {venues.map((v, i) => {
                  const on = i === venueIdx;
                  return (
                    <Pressable
                      key={v.venueId}
                      onPress={() => setVenueIdx(i)}
                      style={[styles.venueChip, { backgroundColor: on ? C.primary : C.field, borderColor: on ? C.primary : C.border }]}
                    >
                      <Ionicons name="location" size={14} color={on ? C.onPrimary : C.sub} />
                      <Text style={{ color: on ? C.onPrimary : C.text, fontWeight: "700", marginLeft: 6 }}>{v.venueName}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Badge quyền của venue đang chọn */}
            {venue && (
              <View style={[styles.accessBadge, { backgroundColor: C.primarySoft, borderColor: C.primary }]}>
                <Ionicons name="shield-checkmark" size={15} color={C.primary} />
                <Text style={{ color: C.primary, fontWeight: "700", marginLeft: 6 }}>
                  {venue.venueName} · {accessLabel(venue)}
                </Text>
              </View>
            )}

            <View style={styles.hintRow}>
              <Ionicons name="cut-outline" size={16} color={C.primary} />
              <Text style={styles.hint}>Chọn camera sân để xem và cắt highlight (tối đa 30 phút/clip).</Text>
            </View>

            {chLoading ? (
              <View style={styles.center}><ActivityIndicator color={C.primary} /></View>
            ) : chErr ? (
              <View style={styles.center}>
                <Ionicons name="videocam-off-outline" size={40} color={C.muted} />
                <Text style={{ color: C.sub, marginTop: 10, textAlign: "center" }}>{chErr}</Text>
                <Pressable onPress={() => loadChannels(venue)} style={[styles.retryBtn, { borderColor: C.border }]}>
                  <Text style={{ color: C.primary, fontWeight: "700" }}>Thử lại</Text>
                </Pressable>
              </View>
            ) : channels.length === 0 ? (
              <View style={styles.center}>
                <Ionicons name="videocam-off-outline" size={40} color={C.muted} />
                <Text style={{ color: C.sub, marginTop: 10 }}>Chưa có camera nào ở sân này.</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {channels.map((ch) => (
                  <Pressable key={ch.id} onPress={() => openCut(ch)} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                    <View style={styles.thumbWrap}>
                      <Image source={{ uri: `${thumbnailUrl(venue!.piBaseUrl, ch.id)}?t=${thumbTick}` }} style={styles.thumb} resizeMode="cover" />
                      <View style={styles.playBadge}><Ionicons name="cut" size={16} color="#fff" /></View>
                    </View>
                    <Text numberOfLines={1} style={[styles.cardName, { color: C.text }]}>{ch.name}</Text>
                    {!!ch.description && <Text numberOfLines={1} style={[styles.cardDesc, { color: C.sub }]}>{ch.description}</Text>}
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const mkStyles = (C: ThemeTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    venueChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, marginRight: 8 },
    accessBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, marginBottom: 12 },
    hintRow: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 6 },
    hint: { color: C.sub, flex: 1, fontSize: 13 },
    center: { alignItems: "center", justifyContent: "center", paddingVertical: 56, paddingHorizontal: 20 },
    emptyTitle: { fontWeight: "800", fontSize: 16, marginTop: 14 },
    retryBtn: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    card: { width: "48.5%", borderRadius: 14, borderWidth: 1, padding: 8, marginBottom: 12 },
    thumbWrap: { borderRadius: 10, overflow: "hidden", backgroundColor: "#000", aspectRatio: 16 / 10 },
    thumb: { width: "100%", height: "100%" },
    playBadge: { position: "absolute", right: 8, bottom: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 999, padding: 7 },
    cardName: { fontWeight: "700", fontSize: 14, marginTop: 8 },
    cardDesc: { fontSize: 12, marginTop: 2 },
  });
