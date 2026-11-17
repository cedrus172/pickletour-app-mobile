import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { FEED_COLORS } from "@/components/feed/FeedDesign";
import { Text } from "@/components/ui/i18nText";
import { IS_V3_LIGHT, sk } from "@/hooks/uiVersion";

export const NOTIFICATION_COLORS = {
  ...FEED_COLORS,
  purple: "#8B5CF6",
  green: sk("#22D879", "#16A34A"),
  gold: sk("#FFB000", "#D97706"),
  coral: sk("#FF4D67", "#EF3B3B"),
} as const;

export const NotificationsPage = memo(function NotificationsPage({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LinearGradient
      colors={[NOTIFICATION_COLORS.background, NOTIFICATION_COLORS.backgroundAlt]}
      start={{ x: 0.12, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.page}
    >
      <View pointerEvents="none" style={styles.ambientTop} />
      <View pointerEvents="none" style={styles.ambientBottom} />
      {children}
    </LinearGradient>
  );
});

export const NotificationsHeader = memo(function NotificationsHeader({
  unreadCount,
}: {
  unreadCount: number;
}) {
  return (
    <View style={styles.header}>
      <View pointerEvents="none" style={styles.heroVisual}>
        <View style={styles.heroHalo} />
        <View style={styles.ball}>
          <View style={[styles.ballHole, styles.ballHoleOne]} />
          <View style={[styles.ballHole, styles.ballHoleTwo]} />
          <View style={[styles.ballHole, styles.ballHoleThree]} />
        </View>
        <LinearGradient
          colors={sk<[string, string, string]>(["#14C9FF", "#2765FF", "#7547E8"], ["#2F8BFF", "#1466F2", "#0B3FB8"])}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bellCircle}
        >
          <Ionicons name="notifications" size={50} color={sk("#EAF8FF", "#FFFFFF")} />
        </LinearGradient>
        {unreadCount > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.headerCopy}>
        <View style={styles.titleRow}>
          <Text style={styles.titleWhite}>Thông </Text>
          <Text style={styles.titleAccent}>báo</Text>
        </View>
        <Text style={styles.subtitle}>
          Không bỏ lỡ bất kỳ hoạt động nào từ cộng đồng
        </Text>
        <Text style={styles.subtitleAccent}>Pickleball Việt Nam</Text>
      </View>
    </View>
  );
});

export const NotificationSectionHeader = memo(function NotificationSectionHeader({
  title,
  canMarkAll,
  onMarkAll,
}: {
  title: string;
  canMarkAll?: boolean;
  onMarkAll?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {canMarkAll && onMarkAll ? (
        <Pressable
          accessibilityRole="button"
          onPress={onMarkAll}
          style={({ pressed }) => [styles.markAllButton, pressed && styles.pressed]}
        >
          <Ionicons
            name="checkmark-done-circle-outline"
            size={17}
            color={NOTIFICATION_COLORS.primary}
          />
          <Text style={styles.markAllText}>Đánh dấu đã đọc tất cả</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

export const NotificationSkeleton = memo(function NotificationSkeleton() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonCopy}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonBody} />
            <View style={styles.skeletonTime} />
          </View>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  page: { flex: 1, overflow: "hidden" },
  ambientTop: {
    position: "absolute",
    top: -130,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: sk("rgba(8,189,245,0.09)", "rgba(20,102,242,0.07)"),
  },
  ambientBottom: {
    position: "absolute",
    left: -180,
    bottom: 80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: sk("rgba(139,92,246,0.04)", "rgba(197,244,51,0.10)"),
  },
  header: {
    height: 196,
    marginHorizontal: 16,
    justifyContent: "center",
    overflow: "hidden",
  },
  headerCopy: { zIndex: 2, maxWidth: "72%", paddingTop: 7 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  titleWhite: {
    color: NOTIFICATION_COLORS.text,
    fontSize: 37,
    lineHeight: 44,
    fontWeight: "900",
    letterSpacing: -1.25,
  },
  titleAccent: {
    color: NOTIFICATION_COLORS.primary,
    fontSize: 37,
    lineHeight: 44,
    fontWeight: "900",
    letterSpacing: -1.25,
    textShadowColor: sk("rgba(8,189,245,0.28)", "transparent"),
    textShadowRadius: sk(9, 0),
  },
  subtitle: {
    color: NOTIFICATION_COLORS.textSoft,
    fontSize: 14.5,
    lineHeight: 20,
    marginTop: 6,
  },
  subtitleAccent: {
    color: NOTIFICATION_COLORS.primary,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: "700",
  },
  heroVisual: {
    position: "absolute",
    right: -2,
    top: 27,
    width: 145,
    height: 145,
  },
  heroHalo: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: sk("rgba(22,119,255,0.13)", "rgba(20,102,242,0.09)"),
    shadowColor: NOTIFICATION_COLORS.primary,
    shadowOpacity: sk(0.38, 0.16),
    shadowRadius: 22,
  },
  bellCircle: {
    position: "absolute",
    right: 6,
    top: 29,
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: sk("rgba(188,235,255,0.48)", "rgba(255,255,255,0.7)"),
    transform: [{ rotate: "9deg" }],
  },
  ball: {
    position: "absolute",
    left: 1,
    bottom: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: sk("#A6E92E", "#C5F433"),
    shadowColor: sk("#75D20B", "#8FCB10"),
    shadowOpacity: sk(0.38, 0.3),
    shadowRadius: 8,
  },
  ballHole: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: sk("#315E13", "#5E9C00"),
  },
  ballHoleOne: { top: 8, left: 16 },
  ballHoleTwo: { top: 23, right: 7 },
  ballHoleThree: { bottom: 7, left: 10 },
  unreadBadge: {
    position: "absolute",
    right: 0,
    top: 17,
    minWidth: 34,
    height: 34,
    paddingHorizontal: 7,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NOTIFICATION_COLORS.coral,
    borderWidth: 2,
    borderColor: sk("#FFB0BD", "#FFFFFF"),
    shadowColor: NOTIFICATION_COLORS.coral,
    shadowOpacity: sk(0.48, 0.28),
    shadowRadius: 8,
  },
  unreadBadgeText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  sectionHeader: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: {
    color: NOTIFICATION_COLORS.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
  },
  markAllButton: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: sk("rgba(8,35,64,0.8)", "#FFFFFF"),
    borderWidth: 1,
    borderColor: sk("rgba(8,189,245,0.28)", "rgba(20,102,242,0.20)"),
  },
  markAllText: {
    color: NOTIFICATION_COLORS.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  pressed: { opacity: 0.78 },
  skeletonList: { paddingHorizontal: 12, gap: 9 },
  skeletonCard: {
    minHeight: 92,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: sk("rgba(90,180,230,0.14)", "rgba(16,42,92,0.08)"),
    backgroundColor: sk("rgba(7,28,53,0.75)", "#FFFFFF"),
    ...(IS_V3_LIGHT
      ? {
          shadowColor: "#1B3A7A",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }
      : null),
  },
  skeletonIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: sk("rgba(92,125,161,0.15)", "rgba(16,42,92,0.08)"),
  },
  skeletonCopy: { flex: 1, gap: 7 },
  skeletonTitle: { width: "64%", height: 12, borderRadius: 6, backgroundColor: sk("rgba(143,170,200,0.2)", "rgba(16,42,92,0.10)") },
  skeletonBody: { width: "88%", height: 10, borderRadius: 5, backgroundColor: sk("rgba(143,170,200,0.13)", "rgba(16,42,92,0.07)") },
  skeletonTime: { width: "28%", height: 8, borderRadius: 4, backgroundColor: sk("rgba(143,170,200,0.1)", "rgba(16,42,92,0.05)") },
});
