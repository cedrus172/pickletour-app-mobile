import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";

// Mở trình phát YouTube NGAY TRONG APP (không nhảy ra ngoài).
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
import { Ionicons } from "@expo/vector-icons";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useYoutubeLibraryQuery } from "@/slices/youtubeLibraryApiSlice";

type Video = {
  videoId: string;
  title: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  durationSec: number;
  viewCount: number;
  isLive: boolean;
  publishedAt: string | null;
  url: string;
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
const fmtViews = (n: number) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(v);
};
const fmtDate = (d: any) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("vi-VN");
  } catch {
    return "";
  }
};

function VideoCard({ v, C, width }: { v: Video; C: any; width: number }) {
  return (
    <Pressable
      onPress={() => openClip(v)}
      style={{
        width,
        backgroundColor: C.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        overflow: "hidden",
      }}
    >
      <View style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" }}>
        <Image
          source={{ uri: v.thumbnail }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
        {v.isLive ? (
          <View
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#EF4444",
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 6,
            }}
          >
            <Ionicons name="ellipse" size={8} color="#fff" style={{ marginRight: 4 }} />
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>LIVE</Text>
          </View>
        ) : v.durationSec ? (
          <View
            style={{
              position: "absolute",
              bottom: 6,
              right: 6,
              backgroundColor: "rgba(0,0,0,0.82)",
              paddingHorizontal: 5,
              paddingVertical: 1,
              borderRadius: 4,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
              {fmtDur(v.durationSec)}
            </Text>
          </View>
        ) : null}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
          pointerEvents="none"
        >
          <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
        </View>
      </View>
      <View style={{ padding: 10, gap: 3 }}>
        <Text numberOfLines={2} style={{ color: C.text, fontSize: 13.5, fontWeight: "600", lineHeight: 18 }}>
          {v.title}
        </Text>
        <Text numberOfLines={1} style={{ color: C.sub, fontSize: 11.5 }}>
          {v.channelTitle}
        </Text>
        <Text style={{ color: C.muted, fontSize: 11 }}>
          {v.isLive
            ? "Đang phát trực tiếp"
            : [fmtViews(v.viewCount) + " lượt xem", fmtDate(v.publishedAt)]
                .filter(Boolean)
                .join(" · ")}
        </Text>
      </View>
    </Pressable>
  );
}

export default function YoutubeLibraryScreen() {
  const C: any = useThemeTokens();
  const { width: winW } = useWindowDimensions();
  const { data, isLoading, isFetching, refetch } = useYoutubeLibraryQuery({});
  const [channelId, setChannelId] = useState("all");
  const [q, setQ] = useState("");

  const channels: any[] = data?.channels || [];
  const videos: Video[] = data?.videos || [];

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return videos.filter((v) => {
      if (channelId !== "all" && v.channelId !== channelId) return false;
      if (kw && !String(v.title || "").toLowerCase().includes(kw)) return false;
      return true;
    });
  }, [videos, channelId, q]);

  const liveList = filtered.filter((v) => v.isLive);
  const vodList = filtered.filter((v) => !v.isLive);

  const GAP = 12;
  const PAD = 14;
  const cardW = Math.floor((winW - PAD * 2 - GAP) / 2);
  const liveCardW = Math.min(260, Math.floor(winW * 0.72));

  const notConfigured = !data?.enabled || data?.error === "no_channels";
  const noKey = data?.error === "missing_api_key";

  const Chip = ({ id, label }: { id: string; label: string }) => {
    const active = channelId === id;
    return (
      <Pressable
        onPress={() => setChannelId(id)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: 999,
          marginRight: 8,
          backgroundColor: active ? C.primary : C.field,
          borderWidth: 1,
          borderColor: active ? C.primary : C.border,
        }}
      >
        <Text style={{ color: active ? C.onPrimary : C.text, fontSize: 13, fontWeight: "600" }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const Header = (
    <View style={{ paddingHorizontal: PAD, paddingTop: 12 }}>
      {/* Tìm kiếm */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: C.field,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: C.border,
          paddingHorizontal: 10,
          marginBottom: 12,
        }}
      >
        <Ionicons name="search" size={18} color={C.sub} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Tìm theo tên clip…"
          placeholderTextColor={C.muted}
          style={{ flex: 1, color: C.text, paddingVertical: 9, paddingHorizontal: 8, fontSize: 14 }}
        />
        {q ? (
          <Pressable onPress={() => setQ("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={C.sub} />
          </Pressable>
        ) : null}
      </View>

      {/* Lọc theo kênh */}
      {channels.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 14 }}
          contentContainerStyle={{ paddingRight: PAD }}
        >
          <Chip id="all" label="Tất cả" />
          {channels.map((c) => (
            <Chip key={c.channelId} id={c.channelId} label={c.channelTitle || c.channelId} />
          ))}
        </ScrollView>
      )}

      {/* Đang phát trực tiếp */}
      {liveList.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 6 }}>
            <Ionicons name="ellipse" size={10} color="#EF4444" />
            <Text style={{ color: C.text, fontSize: 15, fontWeight: "800" }}>
              Đang phát trực tiếp
            </Text>
            <Text style={{ color: C.sub, fontSize: 13 }}>({liveList.length})</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {liveList.map((v) => (
              <View key={v.videoId} style={{ marginRight: GAP }}>
                <VideoCard v={v} C={C} width={liveCardW} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {liveList.length > 0 && vodList.length > 0 && (
        <Text style={{ color: C.text, fontSize: 15, fontWeight: "800", marginBottom: 10 }}>
          Video
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Kho clip YouTube", headerShown: true }} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : notConfigured || noKey ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Ionicons name="logo-youtube" size={48} color={C.muted} />
          <Text style={{ color: C.text, fontSize: 16, fontWeight: "700", marginTop: 12, textAlign: "center" }}>
            {noKey ? "Thiếu YouTube API key" : "Chưa cấu hình kênh YouTube"}
          </Text>
          <Text style={{ color: C.sub, fontSize: 13, marginTop: 6, textAlign: "center" }}>
            {noKey
              ? "Quản trị viên cần cấu hình YOUTUBE_API_KEY."
              : "Quản trị viên cần thêm danh sách kênh (YOUTUBE_LIBRARY_CHANNELS) trong Cấu hình hệ thống."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={vodList}
          keyExtractor={(v) => v.videoId}
          numColumns={2}
          ListHeaderComponent={Header}
          columnWrapperStyle={{ paddingHorizontal: PAD, gap: GAP }}
          contentContainerStyle={{ paddingBottom: 28, gap: GAP }}
          renderItem={({ item }) => <VideoCard v={item} C={C} width={cardW} />}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={() => refetch()}
              tintColor={C.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", padding: 32 }}>
              <Text style={{ color: C.sub, fontSize: 14 }}>Không có clip nào.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
