// app/clip-cam/channels.tsx — lưới camera của 1 venue (đã có quyền) → cắt clip.
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
import { Stack, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { useResponsive } from "@/hooks/useResponsive";
import { fetchChannels, thumbnailUrl, type Channel } from "@/utils/pickclip";

export default function ClipCamChannelsScreen() {
  const C = useThemeTokens();
  const styles = useMemo(() => mkStyles(C), [C]);
  const rsp = useResponsive();
  const camCols = rsp.isLarge ? 4 : rsp.isWide ? 3 : 2;
  const camCardW: any = `${100 / camCols - 1.5}%`;
  const { base, venueName } = useLocalSearchParams<{ base: string; venueName: string }>();
  const baseUrl = String(base || "");

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [thumbTick, setThumbTick] = useState(0);

  const load = useCallback(async () => {
    setErr("");
    try {
      setChannels(await fetchChannels(baseUrl));
    } catch (e: any) {
      setChannels([]);
      setErr(e?.message || "Không tải được danh sách sân");
    }
  }, [baseUrl]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    load().finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setThumbTick((t) => t + 1);
    await load();
    setRefreshing(false);
  }, [load]);

  const openCut = (ch: Channel) => {
    router.push({
      pathname: "/clip-cam/cut",
      params: { base: baseUrl, venueName: String(venueName || ""), chId: String(ch.id), chName: ch.name },
    } as any);
  };

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <Stack.Screen options={{ title: String(venueName || "Cắt Cam Sân"), headerShown: true }} />
      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        <View style={styles.hintRow}>
          <Ionicons name="cut-outline" size={16} color={C.primary} />
          <Text style={styles.hint}>Chọn camera sân để xem và cắt highlight (tối đa 30 phút/clip).</Text>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={C.primary} /></View>
        ) : err ? (
          <View style={styles.center}>
            <Ionicons name="videocam-off-outline" size={40} color={C.muted} />
            <Text style={{ color: C.sub, marginTop: 10, textAlign: "center" }}>{err}</Text>
            <Pressable onPress={load} style={[styles.retryBtn, { borderColor: C.border }]}>
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
              <Pressable key={ch.id} onPress={() => openCut(ch)} style={[styles.card, { backgroundColor: C.card, borderColor: C.border, width: camCardW }]}>
                <View style={styles.thumbWrap}>
                  <Image source={{ uri: `${thumbnailUrl(baseUrl, ch.id)}?t=${thumbTick}` }} style={styles.thumb} resizeMode="cover" />
                  <View style={styles.playBadge}><Ionicons name="cut" size={16} color="#fff" /></View>
                </View>
                <Text numberOfLines={1} style={[styles.cardName, { color: C.text }]}>{ch.name}</Text>
                {!!ch.description && <Text numberOfLines={1} style={[styles.cardDesc, { color: C.sub }]}>{ch.description}</Text>}
              </Pressable>
            ))}
          </View>
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
    center: { alignItems: "center", justifyContent: "center", paddingVertical: 48 },
    retryBtn: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    card: { width: "48.5%", borderRadius: 14, borderWidth: 1, padding: 8, marginBottom: 12 },
    thumbWrap: { borderRadius: 10, overflow: "hidden", backgroundColor: "#000", aspectRatio: 16 / 10 },
    thumb: { width: "100%", height: "100%" },
    playBadge: { position: "absolute", right: 8, bottom: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 999, padding: 7 },
    cardName: { fontWeight: "700", fontSize: 14, marginTop: 8 },
    cardDesc: { fontSize: 12, marginTop: 2 },
  });
