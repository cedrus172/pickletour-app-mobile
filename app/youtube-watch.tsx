import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import YoutubePlayer from "react-native-youtube-iframe";
import { Ionicons } from "@expo/vector-icons";
import { useThemeTokens } from "@/hooks/useThemeTokens";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";

const fmtViews = (n: any) => {
  const v = Number(n || 0);
  if (!Number.isFinite(v) || v <= 0) return "";
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

export default function YoutubeWatchScreen() {
  const C: any = useThemeTokens();
  const params = useLocalSearchParams();
  const videoId = one(params.videoId);
  const title = one(params.title);
  const channel = one(params.channel);
  const views = one(params.views);
  const published = one(params.published);
  const isLive = one(params.isLive) === "1";

  const { width } = useWindowDimensions();
  const playerHeight = Math.round(width / (16 / 9));

  const [playing, setPlaying] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const playerRef = useRef(null);

  const onStateChange = useCallback((state: string) => {
    if (state === "ended") setPlaying(false);
  }, []);

  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const meta = isLive
    ? "Đang phát trực tiếp"
    : [fmtViews(views) ? fmtViews(views) + " lượt xem" : "", fmtDate(published)]
        .filter(Boolean)
        .join(" · ");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Video", headerShown: true }} />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ width: "100%", height: playerHeight, backgroundColor: "#000", justifyContent: "center" }}>
          {!videoId || error ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <Ionicons name="warning-outline" size={28} color="#fff" />
              <Text style={{ color: "#fff", marginTop: 8, textAlign: "center" }}>
                {!videoId ? "Không tìm thấy video." : "Video này không cho phép phát nhúng."}
              </Text>
              {videoId ? (
                <Pressable
                  onPress={() => Linking.openURL(ytUrl)}
                  style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FF0000", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
                >
                  <Ionicons name="logo-youtube" size={18} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Mở trên YouTube</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              {!ready && (
                <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                  <ActivityIndicator size="large" color={C.primary} />
                </View>
              )}
              <YoutubePlayer
                ref={playerRef}
                width={width}
                height={playerHeight}
                play={playing}
                videoId={videoId}
                onChangeState={onStateChange}
                onReady={() => setReady(true)}
                onError={() => setError(true)}
              />
            </>
          )}
        </View>

        <View style={{ padding: 16, gap: 8 }}>
          {title ? (
            <Text style={{ color: C.text, fontSize: 17, fontWeight: "800", lineHeight: 23 }}>
              {title}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            {isLive ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EF4444", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Ionicons name="ellipse" size={8} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>LIVE</Text>
              </View>
            ) : null}
            {channel ? <Text style={{ color: C.sub, fontSize: 13 }}>{channel}</Text> : null}
          </View>
          {meta ? <Text style={{ color: C.muted, fontSize: 12.5 }}>{meta}</Text> : null}

          <Pressable
            onPress={() => Linking.openURL(ytUrl)}
            style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: C.field, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
          >
            <Ionicons name="logo-youtube" size={16} color="#FF0000" />
            <Text style={{ color: C.text, fontSize: 13, fontWeight: "600" }}>Mở trên YouTube</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
