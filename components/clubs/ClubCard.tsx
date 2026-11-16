import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/i18nText";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { Chip } from "@/components/ui/Chip";
import type { Club } from "@/types/club.types";
import { Image as ExpoImage } from "expo-image";
import { normalizeUrl } from "@/utils/normalizeUri";
import { sk } from "@/hooks/uiVersion";
// 1. Import Theme Hook

interface ClubCardProps {
  club: Club;
  onPress: () => void;
}

export default function ClubCard({ club, onPress }: ClubCardProps) {
  const colors = {
    cardBg: sk("#0b2842", "#FFFFFF"),
    textPrimary: sk("#fff", "#0B1B3A"),
    textSecondary: sk("#b0c5dc", "#5F6F8A"),
    textTertiary: sk("#d2e6f7", "#243450"),
    badgeBg: sk("#123b57", "rgba(20,102,242,0.10)"),
    avatarBorder: sk("#0b2842", "#FFFFFF"),
  };

  const cover =
    club.coverUrl || club.logoUrl || "https://via.placeholder.com/400x200";
  const logo = club.logoUrl || "https://via.placeholder.com/80";
  const memberCount = club.stats?.memberCount || 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.card, { backgroundColor: colors.cardBg }]} // Áp dụng màu nền dynamic
      >
        {/* Cover Image with Gradient Overlay */}
        <View style={styles.coverContainer}>
          <ExpoImage
            source={{ uri: normalizeUrl(cover) }}
            style={styles.cover}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            recyclingKey={`cover-${cover}`}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.4)"]}
            style={styles.coverGradient}
          />

          {/* Verified Badge */}
          {club.isVerified && (
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons
                name="check-decagram"
                size={20}
                color="#fff"
              />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Logo Avatar */}
          <View style={styles.avatarContainer}>
            <ExpoImage
              source={{ uri: normalizeUrl(logo) }}
              style={[
                styles.avatar,
                {
                  backgroundColor: colors.cardBg, // Nền avatar trùng nền card
                  borderColor: colors.avatarBorder, // Viền avatar trùng nền card
                },
              ]}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
              recyclingKey={`logo-${logo}`}
            />
            {club.isVerified && (
              <View
                style={[
                  styles.avatarBadge,
                  { backgroundColor: colors.avatarBorder }, // Nền badge trùng nền card
                ]}
              >
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color="#4CAF50"
                />
              </View>
            )}
          </View>

          {/* Club Info */}
          <View style={styles.info}>
            <Text
              style={[styles.clubName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {club.name}
            </Text>

            {/* Location */}
            {(club.province || club.city) && (
              <View style={styles.locationRow}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.location, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {club.city ? `${club.city}, ` : ""}
                  {club.province || ""}
                </Text>
              </View>
            )}

            {/* Sport Types */}
            {club.sportTypes && club.sportTypes.length > 0 && (
              <View style={styles.sportsContainer}>
                {club.sportTypes.slice(0, 2).map((sport) => (
                  <Chip
                    key={sport}
                    label={sport}
                    style={styles.sportChip}
                    // Nếu Chip component hỗ trợ prop theme/color thì truyền vào đây
                    // Ví dụ: textColor={colors.textSecondary}
                  />
                ))}
                {club.sportTypes.length > 2 && (
                  <Text
                    style={[styles.moreSports, { color: colors.textSecondary }]}
                  >
                    +{club.sportTypes.length - 2}
                  </Text>
                )}
              </View>
            )}

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={16}
                  color={sk("#0bd2ec", "#1466F2")}
                />
                <Text style={[styles.statText, { color: colors.textTertiary }]}>
                  {memberCount} thành viên
                </Text>
              </View>

              {club.shortCode && (
                <View
                  style={[
                    styles.shortCodeBadge,
                    { backgroundColor: colors.badgeBg },
                  ]}
                >
                  <Text style={styles.shortCodeText}>{club.shortCode}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Bottom Gradient Accent */}
        <LinearGradient
          colors={sk<[string, string]>(
            ["rgba(102, 126, 234, 0)", "rgba(102, 126, 234, 0.1)"],
            ["rgba(20,102,242,0)", "rgba(20,102,242,0.08)"]
          )}
          style={styles.bottomAccent}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    // backgroundColor: handle inline
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    elevation: sk(4, 3),
    shadowColor: sk("#000", "#1B3A7A"),
    shadowOffset: { width: 0, height: sk(2, 5) },
    shadowOpacity: 0.1,
    shadowRadius: sk(8, 14),
    ...sk({}, { borderWidth: 1, borderColor: "rgba(16,42,92,0.08)" }),
  },
  coverContainer: {
    width: "100%",
    height: 140,
    backgroundColor: sk("#e0e0e0", "#E9F0FA"),
  },
  cover: {
    width: "100%",
    height: "100%",
  },
  coverGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  verifiedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(76, 175, 80, 0.9)",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 16,
    paddingTop: 40,
  },
  avatarContainer: {
    position: "absolute",
    top: -32,
    left: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    // backgroundColor & borderColor: handle inline
    borderWidth: 3,
    elevation: 3,
  },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    // backgroundColor: handle inline
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    gap: 8,
  },
  clubName: {
    fontSize: 18,
    fontWeight: "bold",
    // color: handle inline
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 13,
    // color: handle inline
    flex: 1,
  },
  sportsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  sportChip: {
    height: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  moreSports: {
    fontSize: 11,
    // color: handle inline
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
    // color: handle inline
    fontWeight: "500",
  },
  shortCodeBadge: {
    // backgroundColor: handle inline
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  shortCodeText: {
    fontSize: 11,
    color: sk("#667eea", "#1466F2"),
    fontWeight: "600",
  },
  bottomAccent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
});
