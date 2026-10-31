import React from "react";
import { Image, type ImageSourcePropType } from "react-native";

// Static requires keep every approved icon in both native OTA asset bundles.
const ICONS: Record<number, ImageSourcePropType> = {
  21: require("@/assets/images/home-premium-v1/court.png"),
  42: require("@/assets/images/home-premium-v1/camera-cut.png"),
  1: require("@/assets/images/home-premium-v1/calendar.png"),
  2: require("@/assets/images/home-premium-v1/trophy.png"),
  3: require("@/assets/images/home-premium-v1/statistics.png"),
  4: require("@/assets/images/home-premium-v1/guide.png"),
  5: require("@/assets/images/home-premium-v1/news.png"),
  6: require("@/assets/images/home-premium-v1/live.png"),
  8: require("@/assets/images/home-premium-v1/club.png"),
  9: require("@/assets/images/home-premium-v1/match.png"),
  10: require("@/assets/images/home-premium-v1/support.png"),
  11: require("@/assets/images/home-premium-v1/nearby.png"),
  12: require("@/assets/images/home-premium-v1/head-to-head.png"),
  13: require("@/assets/images/home-premium-v1/feed.png"),
  16: require("@/assets/images/home-premium-v1/notifications.png"),
  14: require("@/assets/images/home-premium-v1/chat.png"),
  15: require("@/assets/images/home-premium-v1/friends.png"),
  17: require("@/assets/images/home-premium-v1/coach.png"),
  19: require("@/assets/images/home-premium-v1/market.png"),
  20: require("@/assets/images/home-premium-v1/find-player.png"),
};

export default function HomeFeatureIcon({ id, size = 58 }: { id: number; size?: number }) {
  return (
    <Image
      source={ICONS[id] ?? ICONS[1]}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessible={false}
      fadeDuration={0}
    />
  );
}
