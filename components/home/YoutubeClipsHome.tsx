import React, { useMemo } from "react";
import { FlatList, Image, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import { HOME_COLORS } from "@/components/home/HomeDesign";
import { useYoutubeLibraryQuery } from "@/slices/youtubeLibraryApiSlice";

type Video = {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  durationSec: number;
  viewCount: number;
  isLive: boolean;
  publishedAt: string | null;
};

const fmtDur = (s: number) => {
  const n = Math.max(0, Math.round(Number(s) || 0));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const ss = n % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${m}:${String(ss).padStart(2, "0")}`;
};

function openClip(v: Video) {
  router.push({
    pathname: "/youtube-watch",
    params: {
      videoId: v.videoId,
      title: v.title,
      channel: v.channelTitle,
      views: String(v.viewCount || 0),
      published: v.publishedAt || "",
      isLive: v.isLive ? "1" : "0",
    },
  });
}

const CARD_W = 232;

function ClipCard({ v }: { v: Video }) {
  return (
    <Pressable onPress={() => openClip(v)} style={styles.card}>
      <View style={styles.thumbWrap}>
        <Image source={{ uri: v.thumbnail }} style={styles.thumb} resizeMode="cover" />
        <View style={styles.playOverlay} pointerEvents="none">
          <Ionicons name="play-circle" size={38} color="rgba(255,255,255,0.92)" />
        </View>
        {v.isLive ? (
          <View style={styles.liveBadge}>
            <Ionicons name="ellipse" size={7} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        ) : v.durationSec ? (
          <View style={styles.durBadge}>
            <Text style={styles.durText}>{fmtDur(v.durationSec)}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={styles.title}>
        {v.title}
      </Text>
      <Text numberOfLines={1} style={styles.channel}>
        {v.channelTitle}
      </Text>
    </Pressable>
  );
}

export default function YoutubeClipsHome() {
  const { data } = useYoutubeLibraryQuery({});
  const videos: Video[] = data?.videos || [];

  // Live lên đầu, sau đó clip mới nhất; lấy tối đa 10.
  const items = useMemo(() => {
    const live = videos.filter((v) => v.isLive);
    const vod = videos.filter((v) => !v.isLive);
    return [...live, ...vod].slice(0, 10);
  }, [videos]);

  if (!data?.enabled || items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.accent} />
          <Ionicons name="logo-youtube" size={18} color="#FF4D4D" />
          <Text style={styles.sectionTitle}>Kho clip YouTube</Text>
        </View>
        <Pressable onPress={() => router.push("/youtube-library")} style={styles.viewAll} hitSlop={8}>
          <Text style={styles.viewAllText}>Xem tất cả</Text>
          <Ionicons name="chevron-forward" size={14} color={HOME_COLORS.primary} />
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(v) => v.videoId}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        renderItem={({ item }) => <ClipCard v={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 14 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  accent: { width: 4, height: 19, borderRadius: 2, backgroundColor: "#FF4D4D" },
  sectionTitle: {
    color: HOME_COLORS.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
    letterSpacing: -0.35,
  },
  viewAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewAllText: { color: HOME_COLORS.primary, fontSize: 13, fontWeight: "700" },
  card: { width: CARD_W },
  thumbWrap: {
    width: CARD_W,
    height: Math.round((CARD_W / 16) * 9),
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: HOME_COLORS.border,
  },
  thumb: { width: "100%", height: "100%" },
  playOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  liveBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  durBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.82)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  durText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  title: {
    color: HOME_COLORS.textSoft,
    fontSize: 13.5,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 8,
  },
  channel: { color: HOME_COLORS.textMuted, fontSize: 11.5, marginTop: 2 },
});
