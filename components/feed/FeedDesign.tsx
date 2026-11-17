import { NotificationHeaderActions } from "@/components/GlobalNotificationShell";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/i18nText";
import { IS_V3_LIGHT, sk } from "@/hooks/uiVersion";

const FEED_COLORS_V2 = {
  background: "#020B1C",
  backgroundAlt: "#06152B",
  surface: "rgba(6,25,49,0.94)",
  surfaceStrong: "rgba(7,30,57,0.98)",
  primary: "#08BDF5",
  secondary: "#1677FF",
  success: "#22D879",
  warning: "#FFB000",
  event: "#F62962",
  text: "#FFFFFF",
  textSoft: "#DCEBFA",
  textMuted: "#8FAAC8",
  border: "rgba(90,180,230,0.25)",
} as const;

type FeedColors = { [K in keyof typeof FEED_COLORS_V2]: string };

// V3 Fresh: cùng bộ khoá màu nhưng trên nền sáng.
const FEED_COLORS_V3: FeedColors = {
  background: "#F7FAFF",
  backgroundAlt: "#EEF4FC",
  surface: "#FFFFFF",
  surfaceStrong: "#FFFFFF",
  primary: "#1466F2",
  secondary: "#2F8BFF",
  success: "#16A34A",
  warning: "#D97706",
  event: "#E11D54",
  text: "#0B1B3A",
  textSoft: "#243450",
  textMuted: "#5F6F8A",
  border: "rgba(16,42,92,0.10)",
};

export const FEED_COLORS: FeedColors = IS_V3_LIGHT ? FEED_COLORS_V3 : FEED_COLORS_V2;

export const FeedPage = memo(function FeedPage({ children }: { children: ReactNode }) {
  return (
    <LinearGradient
      colors={[FEED_COLORS.background, FEED_COLORS.backgroundAlt]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.page}
    >
      <View pointerEvents="none" style={styles.ambientTop} />
      <View pointerEvents="none" style={styles.ambientSide} />
      {children}
    </LinearGradient>
  );
});

export const FeedHeader = memo(function FeedHeader() {
  return (
    <View style={styles.header}>
      <View pointerEvents="none" style={styles.heroDecoration}>
        <View style={styles.heroBeam} />
        <View style={styles.paddleHandle} />
        <LinearGradient
          colors={sk<[string, string]>(["#0A416D", "#06162B"], ["#DCEBFF", "#F4F8FF"])}
          style={styles.paddleFace}
        >
          <View style={styles.paddleInset} />
        </LinearGradient>
        <View style={styles.ball}>
          <View style={[styles.ballHole, styles.ballHoleOne]} />
          <View style={[styles.ballHole, styles.ballHoleTwo]} />
          <View style={[styles.ballHole, styles.ballHoleThree]} />
        </View>
      </View>

      <View style={{ position: "absolute", top: 8, right: 0, zIndex: 3 }}><NotificationHeaderActions /></View>
      <View style={styles.headerCopy}>
        <View style={styles.titleRow}>
          <Text style={styles.titleWhite}>Bảng </Text>
          <Text style={styles.titleAccent}>tin</Text>
        </View>
        <Text style={styles.subtitle}>Kết nối cộng đồng pickleball Việt Nam</Text>
      </View>
    </View>
  );
});

export const FeedFilters = memo(function FeedFilters({
  active,
  onChange,
}: {
  active: "all" | "following";
  onChange: (tab: "all" | "following") => void;
}) {
  const tabs = [
    { key: "all" as const, label: "Tất cả", icon: "apps-outline" as const },
    { key: "following" as const, label: "Đang theo dõi", icon: "people-outline" as const },
  ];

  return (
    <View style={styles.filters}>
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [
              styles.filterPressable,
              pressed && styles.pressed,
            ]}
          >
            {selected ? (
              <LinearGradient
                colors={sk<[string, string]>([FEED_COLORS.primary, FEED_COLORS.secondary], ["#2F8BFF", "#1466F2"])}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterActive}
              >
                <Ionicons name={tab.icon} size={16} color="#FFFFFF" />
                <Text style={styles.filterActiveText}>{tab.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.filterInactive}>
                <Ionicons name={tab.icon} size={16} color={FEED_COLORS.textMuted} />
                <Text style={styles.filterInactiveText}>{tab.label}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
      <View style={styles.filterSpacer} />
      <View accessibilityElementsHidden style={styles.filterMark}>
        <Ionicons name="options-outline" size={20} color={FEED_COLORS.primary} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  page: { flex: 1, overflow: "hidden" },
  ambientTop: {
    position: "absolute",
    top: -140,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: sk("rgba(8,189,245,0.09)", "rgba(20,102,242,0.07)"),
  },
  ambientSide: {
    position: "absolute",
    top: 560,
    left: -170,
    width: 310,
    height: 310,
    borderRadius: 155,
    backgroundColor: sk("rgba(22,119,255,0.05)", "rgba(197,244,51,0.10)"),
  },
  header: {
    height: 166,
    marginHorizontal: 16,
    overflow: "hidden",
    justifyContent: "center",
  },
  headerCopy: { zIndex: 2, maxWidth: "82%", paddingTop: 8 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  titleWhite: {
    color: FEED_COLORS.text,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  titleAccent: {
    color: FEED_COLORS.primary,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "900",
    letterSpacing: -1.2,
    textShadowColor: sk("rgba(8,189,245,0.3)", "transparent"),
    textShadowRadius: sk(9, 0),
  },
  subtitle: {
    color: FEED_COLORS.textSoft,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 5,
  },
  heroDecoration: {
    position: "absolute",
    top: 8,
    right: -4,
    width: 174,
    height: 150,
    opacity: sk(0.62, 0.9),
  },
  heroBeam: {
    position: "absolute",
    top: 36,
    right: 7,
    width: 146,
    height: 2,
    borderRadius: 2,
    backgroundColor: FEED_COLORS.primary,
    shadowColor: FEED_COLORS.primary,
    shadowOpacity: sk(0.8, 0.25),
    shadowRadius: 10,
    transform: [{ rotate: "-17deg" }],
  },
  paddleFace: {
    position: "absolute",
    top: 25,
    right: 17,
    width: 94,
    height: 107,
    borderRadius: 43,
    borderWidth: 2,
    borderColor: sk("rgba(8,189,245,0.7)", "rgba(20,102,242,0.55)"),
    transform: [{ rotate: "24deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  paddleInset: {
    width: 73,
    height: 84,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: sk("rgba(143,170,200,0.22)", "rgba(20,102,242,0.18)"),
  },
  paddleHandle: {
    position: "absolute",
    right: 2,
    bottom: 3,
    width: 23,
    height: 58,
    borderRadius: 9,
    backgroundColor: sk("#071426", "#0B2A6B"),
    borderWidth: 1,
    borderColor: sk("rgba(8,189,245,0.48)", "rgba(20,102,242,0.45)"),
    transform: [{ rotate: "-38deg" }],
  },
  ball: {
    position: "absolute",
    right: 1,
    bottom: 27,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: sk("#A6E92E", "#C5F433"),
    shadowColor: sk("#75D20B", "#8FCB10"),
    shadowOpacity: sk(0.45, 0.35),
    shadowRadius: 10,
  },
  ballHole: { position: "absolute", width: 7, height: 7, borderRadius: 4, backgroundColor: sk("#315E13", "#5E9C00") },
  ballHoleOne: { top: 9, left: 16 },
  ballHoleTwo: { top: 22, right: 8 },
  ballHoleThree: { bottom: 8, left: 11 },
  filters: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  filterPressable: { borderRadius: 999, overflow: "hidden" },
  filterActive: {
    minHeight: 42,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 999,
  },
  filterInactive: {
    minHeight: 42,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 999,
    backgroundColor: sk("rgba(7,29,55,0.86)", "#FFFFFF"),
    borderWidth: 1,
    borderColor: FEED_COLORS.border,
  },
  filterActiveText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  filterInactiveText: { color: FEED_COLORS.textMuted, fontSize: 13, fontWeight: "700" },
  filterSpacer: { flex: 1 },
  filterMark: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: sk("rgba(7,29,55,0.86)", "#FFFFFF"),
    borderWidth: 1,
    borderColor: sk("rgba(8,189,245,0.35)", "rgba(20,102,242,0.20)"),
  },
  pressed: { opacity: 0.84 },
});
