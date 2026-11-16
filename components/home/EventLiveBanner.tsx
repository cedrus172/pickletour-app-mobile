// components/home/EventLiveBanner.tsx — banner "cực hot" trang chủ -> màn xem live giải.
import {
  Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React,
  { useEffect,
  useRef } from "react";
import { Animated,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/components/ui/i18nText";

import { useGetEventLiveHomeQuery } from "@/slices/eventLiveApiSlice";
import { Image } from "expo-image";
import { IS_V3 } from "@/hooks/uiVersion";

const LIVE_BANNER_V3 = require("@/assets/images/v3/live-banner.jpg");

type HomeEvent = {
  slug?: string;
  eventName?: string;
  bannerImageUrl?: string;
  configured?: boolean;
};

function EventLiveCard({ ev, pulse }: { ev: HomeEvent; pulse: Animated.Value }) {
  const name = ev.eventName || "Giải đấu đang diễn ra";
  const href = ev.slug ? `/live/event/${ev.slug}` : "/live/event";
  if (IS_V3) {
    return (
      <Pressable onPress={() => router.push(href as any)} style={v3.press}>
        <View style={v3.card}>
          <Image source={LIVE_BANNER_V3} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="right center" />
          <View style={v3.liveTag}>
            <Animated.View style={{ opacity: pulse }}>
              <Ionicons name="radio" size={13} color="#fff" />
            </Animated.View>
            <Text style={v3.liveTagText}>LIVE</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={v3.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {name}
            </Text>
            <Text style={v3.sub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              Trực tiếp · Nhiều sân · Nhiều góc quay
            </Text>
          </View>
          <View style={v3.cta}>
            <Ionicons name="play" size={14} color="#EF3B3B" />
            <Text style={v3.ctaText}>Xem ngay</Text>
          </View>
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => router.push(href as any)}
      style={({ pressed }) => [styles.press, pressed && { opacity: 0.92 }]}
    >
      <LinearGradient
        colors={["#0b1220", "#7f1d1d", "#dc2626"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.liveTag}>
          <Animated.View style={[styles.dot, { opacity: pulse }]} />
          <Text style={styles.liveTagText}>LIVE</Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Xem trực tiếp · nhiều sân · nhiều góc camera
          </Text>
        </View>

        <View style={styles.cta}>
          <Ionicons name="play" size={16} color="#dc2626" />
          <Text style={styles.ctaText}>Xem</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function EventLiveBanner() {
  const { data } = useGetEventLiveHomeQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const events: HomeEvent[] = (data?.events || []).filter(
    (e: HomeEvent) => e && e.configured,
  );
  if (!events.length) return null;

  return (
    <View style={styles.wrap}>
      {events.map((ev, i) => (
        <View key={ev.slug || `elv-${i}`} style={i > 0 ? { marginTop: 10 } : undefined}>
          <EventLiveCard ev={ev} pulse={pulse} />
        </View>
      ))}
    </View>
  );
}

const v3 = StyleSheet.create({
  press: {
    borderRadius: 20,
    shadowColor: "#0B2A6B",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    minHeight: 68,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#0A2251",
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: "#EF3B3B",
  },
  liveTagText: { color: "#fff", fontWeight: "900", fontSize: 12, letterSpacing: 0.8 },
  title: { color: "#fff", fontWeight: "900", fontSize: 15.5 },
  sub: { color: "rgba(255,255,255,0.82)", fontSize: 11.5, marginTop: 2 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
  },
  ctaText: { color: "#EF3B3B", fontWeight: "900", fontSize: 12 },
});

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 4, marginTop: IS_V3 ? 14 : 0 },
  press: {
    borderRadius: 16,
    shadowColor: "#dc2626",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ff2d2d" },
  liveTagText: { color: "#fff", fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  title: { color: "#fff", fontWeight: "900", fontSize: 15 },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ctaText: { color: "#dc2626", fontWeight: "900", fontSize: 13 },
});
