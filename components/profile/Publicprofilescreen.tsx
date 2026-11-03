import { t } from "@/utils/i18n";
/* eslint-disable react/prop-types, react/display-name */
import React, { useMemo, useState, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Share,
  Clipboard,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { TextInput } from "@/components/ui/i18nTextInput";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { useSelector } from "react-redux";
import * as Haptics from "expo-haptics";
import { useTheme } from "@react-navigation/native";
import * as Linking from "expo-linking";
import ImageViewing from "react-native-image-viewing";
import { skipToken } from "@reduxjs/toolkit/query";

import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet";

import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";

import {
  useGetPublicProfileQuery,
  useGetRatingHistoryQuery,
  useGetMatchHistoryQuery,
  useDeleteRatingHistoryMutation,
  useUpdateRatingHistoryMutation,
  useGetUserAchievementsQuery,
} from "@/slices/usersApiSlice";
import { useGetPlayerPositionQuery } from "@/slices/headtoheadApiSlice";
import { useLocalSearchParams, router } from "expo-router";
import { normalizeUrl } from "@/utils/normalizeUri";
import AppleLiquidGlassView from "@/components/ui/AppleLiquidGlassView";
import { IOS_26_LIQUID_GLASS_ENABLED } from "@/utils/nativeTabs";
import { FriendActions } from "@/components/social/FriendActions";
import { OpenMessageButton } from "@/components/social/OpenMessageButton";
import { UserActionsMenu } from "@/components/social/UserActionsMenu";
import { CoachAchievementsMobile } from "./CoachAchievementsMobile";
import PlayerNameText from "@/components/PlayerNameText";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HEADER_HEIGHT = 230;
const AVATAR_SIZE = 88;
const NAVIGATION_HEIGHT = 52;
const TAB_BAR_HEIGHT = 52;

/* ---------- CONSTANTS & UTILS ---------- */
const AVA_PLACE = "https://dummyimage.com/160x160/cccccc/ffffff&text=?";
const tz = { timeZone: "Asia/Bangkok" };

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("vi-VN", tz) : "—";

const fmtDT = (iso) =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", {
        ...tz,
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      })
    : "—";

const fmtShortDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const num = (v, digits = 3) =>
  Number.isFinite(+v) ? Number(v).toFixed(digits) : "—";
const numFloat = (v, digits = 3) =>
  Number.isFinite(+v) ? Number(v).toFixed(digits) : "—";

const getGenderInfo = (g) => {
  if (g === null || g === undefined) return { label: "Khác", color: "#9E9E9E" };
  const s = String(g).toLowerCase().trim();
  if (["1", "male", "m", "nam"].includes(s))
    return { label: "Nam", color: "#2196F3" };
  if (["2", "female", "f", "nu", "nữ"].includes(s))
    return { label: "Nữ", color: "#E91E63" };
  return { label: "Khác", color: "#9E9E9E" };
};

const getKycStatusMeta = (status) => {
  switch (status) {
    case "verified":
      return {
        label: "Đã xác thực",
        color: "#4CAF50",
        icon: "checkmark-circle",
        bgColor: "#E8F5E9",
      };
    case "pending":
      return {
        label: "Đang xác thực",
        color: "#FF9800",
        icon: "time",
        bgColor: "#FFF3E0",
      };
    case "rejected":
      return {
        label: "Bị từ chối",
        color: "#F44336",
        icon: "close-circle",
        bgColor: "#FFEBEE",
      };
    default:
      return {
        label: "Chưa xác thực",
        color: "#9E9E9E",
        icon: "shield-outline",
        bgColor: "#F5F5F5",
      };
  }
};

const calcAge = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age < 0 || age > 120 ? "—" : age;
};

const getHandLabel = (h) => {
  if (!h) return null;
  const s = String(h).toLowerCase();
  if (["left", "trai", "l"].includes(s)) return "Tay trái";
  if (["right", "phai", "r"].includes(s)) return "Tay phải";
  if (["both", "ambi", "2", "hai tay"].includes(s)) return "Hai tay";
  return h;
};

const hasData = (v) => {
  if (v === null || v === undefined) return false;
  if (typeof v === "number") return true;
  const s = String(v).trim();
  return s && s !== "—";
};

function getSPC(base) {
  const s = base?.spc;
  if (!s || typeof s !== "object") return null;
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const m = s.meta || {};
  return {
    single: toNum(s.single),
    double: toNum(s.double),
    meta: {
      sportId: m.sportId ?? null,
      description: m.description ?? null,
      scoredAt: m.scoredAt ?? null,
      joinDate: m.joinDate ?? null,
      source: m.source ?? null,
    },
  };
}

const profileGlassScheme = (colors) => (colors?.isDark ? "dark" : "light");
const profileGlassSurfaceTint = (colors, light = 0.58, dark = 0.54) =>
  colors?.isDark
    ? `rgba(24,26,32,${dark})`
    : `rgba(255,255,255,${light})`;
const profileGlassAccentTint = (colors, alpha = 0.3) =>
  colors?.isDark
    ? `rgba(99,102,241,${alpha})`
    : `rgba(99,102,241,${alpha})`;

const ProfileGlassSurface = React.memo(
  ({
    children,
    colors,
    style,
    effect = "regular",
    tintColor,
    interactive = false,
  }) => (
    <AppleLiquidGlassView
      fallback="view"
      glassColorScheme={profileGlassScheme(colors)}
      glassEffectStyle={effect}
      glassTintColor={tintColor || profileGlassSurfaceTint(colors)}
      isInteractive={interactive}
      style={style}
    >
      {children}
    </AppleLiquidGlassView>
  )
);
ProfileGlassSurface.displayName = "ProfileGlassSurface";

const ProfileCourtBackdrop = React.memo(({ colors }) => (
  <View pointerEvents="none" style={styles.profileCourtBackdrop}>
    <Svg width="100%" height="100%" viewBox="0 0 390 130" preserveAspectRatio="xMidYMid slice">
      <Path
        d="M-40 110 L105 12 L285 30 L405 113 M31 65 L342 85 M78 31 L309 51 M184 20 L178 78"
        stroke={colors.primary}
        strokeWidth={1.2}
        opacity={0.17}
        fill="none"
      />
      <Circle cx={347} cy={39} r={23} fill={colors.primary} opacity={0.08} />
      <Path
        d="M334 25 l3 -1 M348 22 l3 1 M360 31 l1 3 M354 46 l-2 2 M339 45 l-3 -2 M344 34 l2 2"
        stroke={colors.primary}
        strokeWidth={5}
        strokeLinecap="round"
        opacity={0.14}
      />
    </Svg>
  </View>
));
ProfileCourtBackdrop.displayName = "ProfileCourtBackdrop";

const ProfileSection = React.memo(({ children, colors, style }) => (
  <ProfileGlassSurface
    colors={colors}
    interactive
    tintColor={profileGlassSurfaceTint(colors, 0.64, 0.5)}
    style={[
      styles.section,
      { backgroundColor: colors.card, borderColor: colors.border },
      IOS_26_LIQUID_GLASS_ENABLED && styles.profileGlassPanel,
      style,
    ]}
  >
    {children}
  </ProfileGlassSurface>
));
ProfileSection.displayName = "ProfileSection";

const StatsGlassBox = React.memo(({ children, colors, style }) => (
  <ProfileGlassSurface
    colors={colors}
    effect="clear"
    tintColor={profileGlassSurfaceTint(colors, 0.46, 0.36)}
    style={[
      styles.statBox,
      { backgroundColor: colors.bgMuted, borderColor: colors.border },
      IOS_26_LIQUID_GLASS_ENABLED && styles.profileInnerGlass,
      style,
    ]}
  >
    {children}
  </ProfileGlassSurface>
));
StatsGlassBox.displayName = "StatsGlassBox";

const EmptyGlassState = React.memo(({ children, colors }) => (
  <ProfileGlassSurface
    colors={colors}
    tintColor={profileGlassSurfaceTint(colors, 0.62, 0.48)}
    style={[
      styles.emptyGlassState,
      { backgroundColor: colors.card, borderColor: colors.border },
      IOS_26_LIQUID_GLASS_ENABLED && styles.profileGlassPanel,
    ]}
  >
    {children}
  </ProfileGlassSurface>
));
EmptyGlassState.displayName = "EmptyGlassState";

const ProfilePageButton = React.memo(
  ({ children, colors, disabled, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <ProfileGlassSurface
        colors={colors}
        interactive={!disabled}
        tintColor={profileGlassSurfaceTint(colors, 0.52, 0.42)}
        style={[
          styles.pageButton,
          { backgroundColor: colors.card, borderColor: colors.border },
          IOS_26_LIQUID_GLASS_ENABLED && styles.profileGlassPanel,
          disabled && styles.pageButtonDisabled,
        ]}
      >
        {children}
      </ProfileGlassSurface>
    </TouchableOpacity>
  )
);
ProfilePageButton.displayName = "ProfilePageButton";

const ProfileTabPill = React.memo(
  ({ tab, index, activeTab, onPress, colors, sticky = false }) => {
    const active = activeTab === index;
    const textStyle = sticky ? styles.stickyTabText : styles.tabText;
    return (
      <TouchableOpacity
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        style={[
          sticky ? styles.stickyTab : styles.tab,
          index === 1 && styles.historyTab,
          active && { borderBottomColor: colors.primary },
        ]}
        onPress={() => onPress(index)}
        activeOpacity={0.82}
      >
        <Text
          style={[
            textStyle,
            { color: active ? colors.text : colors.tabInactive },
            active && styles.tabTextActive,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {tab}
        </Text>
      </TouchableOpacity>
    );
  }
);
ProfileTabPill.displayName = "ProfileTabPill";

/* ---------- SUB-COMPONENTS ---------- */

const StatCard = React.memo(
  ({ icon, value, label, secondary, details, onPress, colors }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}: ${details ? details.map((row) => `${row.label} ${row.value}`).join(", ") : value}${secondary ? `, ${secondary}` : ""}`}
      activeOpacity={0.8}
      style={styles.statCardButton}
    >
      <View
        style={[
          styles.statCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.statHeading}>
          <View style={[styles.statAccent, { backgroundColor: colors.primary }]} />
          {icon}
          {details && (
            <Text style={[styles.statHeadingText, { color: colors.text }]}>
              {label}
            </Text>
          )}
        </View>
        {details ? (
          <View style={styles.statDetails}>
            {details.map((row, index) => (
              <View
                key={row.label}
                style={[
                  styles.statDetailRow,
                  index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <Text style={[styles.statDetailLabel, { color: colors.subText }]}>
                  {row.label}
                </Text>
                <Text
                  style={[styles.statDetailValue, { color: colors.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <>
            <View style={styles.statValueRow}>
              <Text
                style={[styles.statValue, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {value}
              </Text>
              {secondary && (
                <View style={styles.statSecondaryBadge}>
                  <Text style={styles.statSecondaryText} numberOfLines={1}>
                    {secondary}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.statLabel, { color: colors.subText }]}>{label}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  )
);

const InfoBadge = React.memo(
  ({ icon, text, color = "#666", bgColor, textColor }) => (
    <AppleLiquidGlassView
      fallback="view"
      glassColorScheme="dark"
      glassEffectStyle="clear"
      glassTintColor={bgColor || "rgba(255,255,255,0.18)"}
      style={[
        styles.badge,
        {
          borderColor: bgColor ? "transparent" : color,
          backgroundColor: bgColor || "transparent",
        },
        IOS_26_LIQUID_GLASS_ENABLED && styles.profileHeaderChipGlass,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.badgeText,
          { color: textColor ? textColor : bgColor ? "#FFF" : color },
        ]}
      >
        {text}
      </Text>
    </AppleLiquidGlassView>
  )
);

const KycBadge = React.memo(({ status }) => {
  const meta = getKycStatusMeta(status);
  return (
    <TouchableOpacity activeOpacity={0.7}>
      <AppleLiquidGlassView
        fallback="view"
        glassColorScheme="dark"
        glassEffectStyle="clear"
        glassTintColor={meta.bgColor}
        style={[
          styles.kycBadge,
          { backgroundColor: `${meta.color}14`, borderColor: `${meta.color}88` },
          IOS_26_LIQUID_GLASS_ENABLED && styles.profileHeaderChipGlass,
        ]}
      >
        <Ionicons name={meta.icon} size={14} color={meta.color} />
        <Text style={[styles.kycBadgeText, { color: meta.color }]}>
          {meta.label}
        </Text>
      </AppleLiquidGlassView>
    </TouchableOpacity>
  );
});

/* ======= (RESTORE OLD UI) Match History Components ======= */

const PlayerRowCompact = React.memo(({ player, highlight, colors }) => {
  const up = (player?.delta ?? 0) > 0;
  const name =
    player?.user?.nickname ||
    player?.user?.fullName ||
    player?.nickname ||
    player?.fullName ||
    "N/A";

  const spcObj = player?.spc || player?.user?.spc || {};
  const scS = Number.isFinite(Number(spcObj.single))
    ? Number(spcObj.single)
    : null;
  const scD = Number.isFinite(Number(spcObj.double))
    ? Number(spcObj.double)
    : null;

  return (
    <View style={styles.playerRowCompact}>
      <Image
        source={{ uri: normalizeUrl(player?.avatar) || AVA_PLACE }}
        style={[styles.playerAvatarCompact, { borderColor: colors.card }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
      <View style={styles.playerInfoCompact}>
        <Text
          style={[
            styles.playerNameCompact,
            { color: colors.text },
            highlight && { color: colors.primary, fontWeight: "700" },
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>

        <View style={styles.playerStatsRow}>
          {player?.postScore !== undefined && player?.postScore !== null && (
            <View style={styles.scoreChangeCompact}>
              <Text
                style={[
                  styles.scoreChangeTextCompact,
                  { color: colors.subText },
                ]}
              >
                {num(player.preScore)} → {num(player.postScore)}
              </Text>
              {Number.isFinite(+player.delta) && player.delta !== 0 && (
                <Text
                  style={[
                    styles.deltaTextCompact,
                    { color: up ? "#4CAF50" : "#F44336" },
                  ]}
                >
                  {up ? "+" : ""}
                  {numFloat(player.delta)}
                </Text>
              )}
            </View>
          )}

          {(scS !== null || scD !== null) && (
            <View style={styles.scChipsRow}>
              {scS !== null && (
                <View style={[styles.scChip, { backgroundColor: "#dcfce7" }]}>
                  <Text style={[styles.scChipTxt, { color: "#166534" }]}>
                    S: {num(scS)}
                  </Text>
                </View>
              )}
              {scD !== null && (
                <View style={[styles.scChip, { backgroundColor: "#fef9c3" }]}>
                  <Text style={[styles.scChipTxt, { color: "#854d0e" }]}>
                    D: {num(scD)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

const MatchCard = React.memo(({ match, userId, onPress, colors }) => {
  const winnerA = match.winner === "A";
  const winnerB = match.winner === "B";
  const myInA = match.team1?.some((p) => (p._id || p.id) === userId);
  const myInB = match.team2?.some((p) => (p._id || p.id) === userId);
  const isMyWin = (myInA && winnerA) || (myInB && winnerB);

  return (
    <TouchableOpacity
      style={styles.matchCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <ProfileGlassSurface
        colors={colors}
        interactive
        tintColor={profileGlassSurfaceTint(colors, 0.62, 0.5)}
        style={[
          styles.matchCardContainer,
          { backgroundColor: colors.card, borderColor: colors.border },
          IOS_26_LIQUID_GLASS_ENABLED && styles.profileGlassPanel,
        ]}
      >
        <View style={styles.matchHeader}>
          <View
            style={[
              styles.resultBadge,
              { backgroundColor: isMyWin ? "#2A8C5C" : "#B74651" },
            ]}
          >
            <Text style={styles.resultText}>{isMyWin ? "THẮNG" : "THUA"}</Text>
          </View>
          <View style={styles.matchHeaderRight}>
            <Text style={[styles.matchDate, { color: colors.subText }]}>
              {fmtDT(match.dateTime)}
            </Text>
          </View>
        </View>
        <Text style={[styles.tournamentName, { color: colors.text }]}>
          {match.tournament?.name || "Giao hữu"}
        </Text>

        <View style={styles.teamsVerticalContainer}>
          <ProfileGlassSurface
            colors={colors}
            effect="clear"
            tintColor={profileGlassSurfaceTint(colors, 0.44, 0.36)}
            style={[
              styles.teamSection,
              { backgroundColor: colors.bgMuted, borderColor: colors.border },
              IOS_26_LIQUID_GLASS_ENABLED && styles.profileInnerGlass,
            ]}
          >
            <View style={styles.teamPlayers}>
              {match.team1?.map((p, i) => (
                <PlayerRowCompact
                  key={`t1-${i}`}
                  player={p}
                  highlight={winnerA}
                  colors={colors}
                />
              ))}
            </View>
          </ProfileGlassSurface>

          <View style={styles.scoreDisplayContainer}>
            <Text style={[styles.scoreDisplayText, { color: colors.text }]}>
              {match.scoreText || "VS"}
            </Text>
          </View>

          <ProfileGlassSurface
            colors={colors}
            effect="clear"
            tintColor={profileGlassSurfaceTint(colors, 0.44, 0.36)}
            style={[
              styles.teamSection,
              { backgroundColor: colors.bgMuted, borderColor: colors.border },
              IOS_26_LIQUID_GLASS_ENABLED && styles.profileInnerGlass,
            ]}
          >
            <View style={styles.teamPlayers}>
              {match.team2?.map((p, i) => (
                <PlayerRowCompact
                  key={`t2-${i}`}
                  player={p}
                  highlight={winnerB}
                  colors={colors}
                />
              ))}
            </View>
          </ProfileGlassSurface>
        </View>

        <View style={[styles.matchDetailLink, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.subText, fontSize: 13 }}>Xem chi tiết</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.subText} />
        </View>
        {match.video && (
          <TouchableOpacity
            style={[
              styles.videoButton,
              { borderTopColor: colors.border || "#F0F0F0" },
            ]}
            activeOpacity={0.8}
          >
            <Ionicons name="play-circle" size={18} color="#FF3B30" />
            <Text style={styles.videoText}>Video</Text>
          </TouchableOpacity>
        )}
      </ProfileGlassSurface>
    </TouchableOpacity>
  );
});

/* ======= Rating History Row (keep stable + avoid unused delete mutation) ======= */
const RatingHistoryRow = React.memo(
  ({ item, prevItem, isAdmin, isDeleting, onDelete, onEdit, colors }) => {
    const singleDelta =
      prevItem &&
      Number.isFinite(item.single) &&
      Number.isFinite(prevItem.single)
        ? item.single - prevItem.single
        : 0;
    const doubleDelta =
      prevItem &&
      Number.isFinite(item.double) &&
      Number.isFinite(prevItem.double)
        ? item.double - prevItem.double
        : 0;

    const noteText =
      item?.notes ??
      item?.note ??
      item?.remark ??
      item?.comment ??
      item?.meta?.notes ??
      item?.meta?.note ??
      "";

    return (
      <ProfileGlassSurface
        colors={colors}
        interactive
        tintColor={profileGlassSurfaceTint(colors, 0.62, 0.5)}
        style={[
          styles.ratingRow,
          { backgroundColor: colors.card, borderColor: colors.border },
          IOS_26_LIQUID_GLASS_ENABLED && styles.profileGlassPanel,
        ]}
      >
        {isAdmin && (
          <View style={styles.ratingAdminActions}>
            <TouchableOpacity
              style={styles.editItemButton}
              onPress={onEdit}
              disabled={isDeleting}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="create-outline" size={18} color="#12B6F3" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteItemButton}
              onPress={onDelete}
              disabled={isDeleting}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FF3B30" />
              ) : (
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.ratingLeft}>
          <Text style={[styles.ratingDate, { color: colors.text }]}>
            {fmtDate(item.scoredAt)}
          </Text>

          <Text style={[styles.ratingScorer, { color: colors.subText }]}>
            {item.scorer?.name || "Hệ thống"}
          </Text>

          {hasData(noteText) && (
            <Text
              style={[styles.ratingNote, { color: colors.subText }]}
              numberOfLines={4}
            >
              Ghi chú: {String(noteText)}
            </Text>
          )}
        </View>

        <View style={styles.ratingScores}>
          {Number.isFinite(item.single) && (
            <ProfileGlassSurface
              colors={colors}
              effect="clear"
              tintColor={profileGlassSurfaceTint(colors, 0.46, 0.34)}
              style={[
                styles.ratingScoreBadge,
                { backgroundColor: colors.bgMuted, borderColor: colors.border },
                IOS_26_LIQUID_GLASS_ENABLED && styles.profileInnerGlass,
              ]}
            >
              <Text style={styles.ratingScoreLabel}>Đơn</Text>
              <Text style={styles.ratingScoreValue}>{num(item.single)}</Text>
              {singleDelta !== 0 && (
                <Text
                  style={[
                    styles.ratingDelta,
                    { color: singleDelta > 0 ? "#4CAF50" : "#F44336" },
                  ]}
                >
                  {singleDelta > 0 ? "+" : ""}
                  {numFloat(singleDelta)}
                </Text>
              )}
            </ProfileGlassSurface>
          )}

          {Number.isFinite(item.double) && (
            <ProfileGlassSurface
              colors={colors}
              effect="clear"
              tintColor={profileGlassSurfaceTint(colors, 0.46, 0.34)}
              style={[
                styles.ratingScoreBadge,
                {
                  backgroundColor: colors.isDark ? "#1A2733" : "#E3F2FD",
                  borderColor: colors.border,
                },
                IOS_26_LIQUID_GLASS_ENABLED && styles.profileInnerGlass,
              ]}
            >
              <Text style={[styles.ratingScoreLabel, { color: "#1976D2" }]}>
                Đôi
              </Text>
              <Text style={[styles.ratingScoreValue, { color: "#1976D2" }]}>
                {num(item.double)}
              </Text>
              {doubleDelta !== 0 && (
                <Text
                  style={[
                    styles.ratingDelta,
                    { color: doubleDelta > 0 ? "#4CAF50" : "#F44336" },
                  ]}
                >
                  {doubleDelta > 0 ? "+" : ""}
                  {numFloat(doubleDelta)}
                </Text>
              )}
            </ProfileGlassSurface>
          )}
        </View>
      </ProfileGlassSurface>
    );
  }
);

const InfoItem = React.memo(({ label, value, copyable, onCopy, colors }) => {
  const display =
    value === null || value === undefined || value === "" ? "—" : value;
  return (
    <ProfileGlassSurface
      colors={colors}
      effect="clear"
      tintColor={profileGlassSurfaceTint(colors, 0.44, 0.34)}
      style={[
        styles.infoItem,
        { backgroundColor: colors.bgMuted, borderColor: colors.border },
        IOS_26_LIQUID_GLASS_ENABLED && styles.profileInnerGlass,
      ]}
    >
      <Text style={[styles.infoLabel, { color: colors.subText }]}>{label}</Text>
      <View style={styles.infoValueContainer}>
        <Text
          style={[styles.infoValue, { color: colors.text }]}
          numberOfLines={2}
        >
          {display}
        </Text>
        {copyable && display !== "—" && (
          <TouchableOpacity
            onPress={() => onCopy(display, label)}
            style={styles.copyButton}
          >
            <Ionicons name="copy-outline" size={16} color={colors.subText} />
          </TouchableOpacity>
        )}
      </View>
    </ProfileGlassSurface>
  );
});

const SkeletonItem = React.memo(
  ({ width, height, borderRadius = 4, style, baseColor }) => {
    const animatedValue = useRef(new Animated.Value(0.3)).current;
    React.useEffect(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }, [animatedValue]);
    return (
      <Animated.View
        style={[
          {
            width,
            height,
            borderRadius,
            backgroundColor: baseColor || "#E1E9EE",
            opacity: animatedValue,
          },
          style,
        ]}
      />
    );
  }
);

const ProfileSkeleton = React.memo(({ isDark }) => {
  const skelColor = isDark ? "#333" : "#E1E9EE";
  const bgColor = isDark ? "#121212" : "#F5F7FA";
  const cardColor = isDark ? "#1E1E1E" : "#FFF";
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: bgColor }]}
      edges={["top"]}
    >
      <View
        style={{ height: HEADER_HEIGHT, alignItems: "center", paddingTop: 60 }}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "100%",
            backgroundColor: isDark ? "#2C2C2E" : "#D1D5DB",
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          }}
        />
        <SkeletonItem
          width={AVATAR_SIZE}
          height={AVATAR_SIZE}
          borderRadius={AVATAR_SIZE / 2}
          baseColor={skelColor}
          style={{ borderWidth: 4, borderColor: cardColor, marginBottom: 12 }}
        />
        <SkeletonItem
          width={200}
          height={28}
          borderRadius={8}
          baseColor={skelColor}
          style={{ marginBottom: 8 }}
        />
        <SkeletonItem
          width={120}
          height={20}
          borderRadius={16}
          baseColor={skelColor}
        />
      </View>
    </SafeAreaView>
  );
});

/* ======= (RESTORE OLD UI) Achievements Components ======= */
const getTopStyle = (k) => {
  if (!Number.isFinite(k) || k > 8) return { bg: "#F3F4F6", fg: "#374151" };
  if (k === 1) return { bg: "#DCFCE7", fg: "#166534" };
  if (k === 2) return { bg: "#FEF9C3", fg: "#854D0E" };
  if (k <= 4) return { bg: "#E0E7FF", fg: "#3730A3" };
  return { bg: "#E0F2FE", fg: "#075985" };
};
const fmtRate = (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : "—");

const KpiCard = React.memo(({ title, value, sub, colors }) => (
  <ProfileGlassSurface
    colors={colors}
    interactive
    tintColor={profileGlassSurfaceTint(colors, 0.62, 0.5)}
    style={[
      styles.kpiCard,
      { backgroundColor: colors.card, borderColor: colors.border },
      IOS_26_LIQUID_GLASS_ENABLED && styles.profileGlassPanel,
    ]}
  >
    <Text style={[styles.kpiTitle, { color: colors.text }]} numberOfLines={1}>
      {title}
    </Text>
    <Text style={[styles.kpiValue, { color: colors.primary }]}>{value}</Text>
    {sub ? (
      <Text
        style={[styles.kpiSub, { color: colors.subText }]}
        numberOfLines={1}
      >
        {sub}
      </Text>
    ) : null}
  </ProfileGlassSurface>
));

const AchievementRow = React.memo(({ data, colors }) => {
  const { bg, fg } = getTopStyle(data?.topK);
  return (
    <ProfileGlassSurface
      colors={colors}
      interactive
      tintColor={profileGlassSurfaceTint(colors, 0.62, 0.5)}
      style={[
        styles.achRowCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        IOS_26_LIQUID_GLASS_ENABLED && styles.profileGlassPanel,
      ]}
    >
      <Text style={[styles.achRowTitle, { color: colors.text }]}>
        {data.tournamentName}
      </Text>

      <View style={styles.achRowLine}>
        <Text style={[styles.achRowLabel, { color: colors.subText }]}>
          Bracket
        </Text>
        <Text style={{ color: colors.text, fontWeight: "700" }}>
          {data.bracketName}
        </Text>
      </View>

      <View style={styles.achRowLine}>
        <Text style={[styles.achRowLabel, { color: colors.subText }]}>Top</Text>
        <View style={[styles.achChip, { backgroundColor: bg }]}>
          <Text style={[styles.achChipText, { color: fg }]}>
            {data.positionLabel || (data.topK ? `Top ${data.topK}` : "—")}
          </Text>
        </View>
      </View>

      <View style={styles.achRowLine}>
        <Text style={[styles.achRowLabel, { color: colors.subText }]}>
          W/L/WR
        </Text>
        <Text style={{ color: colors.text }}>
          {data.stats?.wins ?? 0}/{data.stats?.losses ?? 0} •{" "}
          {Number.isFinite(data.stats?.winRate)
            ? `${data.stats.winRate.toFixed(1)}%`
            : "—"}
        </Text>
      </View>

      <View style={styles.achRowLine}>
        <Text style={[styles.achRowLabel, { color: colors.subText }]}>
          Cuối cùng
        </Text>
        <Text style={{ color: colors.text }}>
          {data.lastMatchAt ? fmtDate(data.lastMatchAt) : "—"}
        </Text>
      </View>
    </ProfileGlassSurface>
  );
});

const AchievementsTab = React.memo(({ data, loading, error, colors }) => {
  if (loading)
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  if (error)
    return (
      <View style={styles.centerBox}>
        <Text style={{ color: colors.subText }}>
          Không thể tải dữ liệu thành tích
        </Text>
      </View>
    );

  const sum = data?.summary || {};
  const perT = Array.isArray(data?.perTournament) ? data.perTournament : [];

  return (
    <View style={styles.achTabContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Thống kê tổng quan
      </Text>
      <View style={styles.kpiGrid}>
        <KpiCard
          title="Trận đấu"
          value={sum.totalPlayed ?? 0}
          sub={`${sum.wins ?? 0} Thắng - ${sum.losses ?? 0} Thua`}
          colors={colors}
        />
        <KpiCard
          title="Tỉ lệ thắng"
          value={fmtRate(sum.winRate)}
          sub={`Chuỗi thắng dài nhất: ${sum.longestWinStreak ?? 0}`}
          colors={colors}
        />
        <KpiCard
          title="Danh hiệu"
          value={sum.titles ?? 0}
          sub={`Thành tích tốt nhất: ${sum.careerBestLabel ?? "—"}`}
          colors={colors}
        />
        <KpiCard
          title="Streak hiện tại"
          value={sum.currentStreak ?? 0}
          sub="Trận thắng/thua liên tiếp"
          colors={colors}
        />
      </View>

      <View style={{ height: 16 }} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Thành tích theo giải
      </Text>

      {!perT.length ? (
        <Text
          style={{ color: colors.subText, textAlign: "center", marginTop: 12 }}
        >
          Chưa có dữ liệu giải đấu
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {perT.map((item, idx) => (
            <AchievementRow key={idx} data={item} colors={colors} />
          ))}
        </View>
      )}
    </View>
  );
});

/* ---------- Charts (used by stats sheet) ---------- */
const RatingLineChart = React.memo(({ data, colors, type = "double" }) => {
  const chartData = useMemo(() => {
    const filtered = (data || [])
      .filter((r) => Number.isFinite(type === "single" ? r.single : r.double))
      .slice(0, 10)
      .reverse();
    return filtered.map((r) => ({
      date: fmtShortDate(r.scoredAt),
      value: type === "single" ? r.single : r.double,
    }));
  }, [data, type]);

  if (chartData.length < 2)
    return (
      <View style={styles.noChartData}>
        <Text style={{ color: colors.subText }}>
          Cần ít nhất 2 điểm dữ liệu
        </Text>
      </View>
    );

  const values = chartData.map((d) => d.value);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const padding = (maxVal - minVal) * 0.1 || 0.05;
  const chartMax = maxVal + padding;
  const chartMin = Math.max(0, minVal - padding);
  const range = chartMax - chartMin || 0.1;

  const chartHeight = 140;
  const chartWidth = SCREEN_WIDTH - 100;

  const points = chartData.map((d, i) => ({
    x: (i / (chartData.length - 1)) * chartWidth,
    y: chartHeight - ((d.value - chartMin) / range) * chartHeight,
    value: d.value,
    date: d.date,
  }));

  const gradientColors =
    type === "single" ? ["#10B981", "#059669"] : ["#3B82F6", "#1D4ED8"];

  return (
    <View style={styles.lineChartContainer}>
      <View style={styles.lineChartYAxis}>
        <Text style={[styles.axisLabel, { color: colors.subText }]}>
          {chartMax.toFixed(2)}
        </Text>
        <Text style={[styles.axisLabel, { color: colors.subText }]}>
          {((chartMax + chartMin) / 2).toFixed(2)}
        </Text>
        <Text style={[styles.axisLabel, { color: colors.subText }]}>
          {chartMin.toFixed(2)}
        </Text>
      </View>

      <View
        style={[
          styles.lineChartArea,
          { width: chartWidth, height: chartHeight },
        ]}
      >
        {[0, 0.5, 1].map((ratio, i) => (
          <View
            key={i}
            style={[
              styles.gridLine,
              { top: ratio * chartHeight, backgroundColor: colors.border },
            ]}
          />
        ))}

        {points.map((point, i) => {
          if (i === points.length - 1) return null;
          const nextPoint = points[i + 1];
          const length = Math.sqrt(
            Math.pow(nextPoint.x - point.x, 2) +
              Math.pow(nextPoint.y - point.y, 2)
          );
          const angle =
            (Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180) /
            Math.PI;

          return (
            <View
              key={i}
              style={[
                styles.lineSegment,
                {
                  width: length,
                  left: point.x,
                  top: point.y,
                  transform: [{ rotate: `${angle}deg` }],
                  backgroundColor: gradientColors[0],
                },
              ]}
            />
          );
        })}

        {points.map((point, i) => (
          <View
            key={`p-${i}`}
            style={[
              styles.linePoint,
              {
                left: point.x - 6,
                top: point.y - 6,
                backgroundColor: gradientColors[0],
                borderColor: colors.card,
              },
            ]}
          />
        ))}

        <View style={styles.xAxisLabels}>
          {points
            .filter(
              (_, i) =>
                i === 0 ||
                i === points.length - 1 ||
                i === Math.floor(points.length / 2)
            )
            .map((point, i) => (
              <Text
                key={i}
                style={[
                  styles.xAxisLabel,
                  { color: colors.subText, left: point.x - 15 },
                ]}
              >
                {point.date}
              </Text>
            ))}
        </View>
      </View>
    </View>
  );
});

const SimpleBarChart = React.memo(
  ({ chartData, maxValue, gradient, colors }) => {
    if (!chartData?.length)
      return (
        <View style={styles.noChartData}>
          <Text style={{ color: colors.subText }}>Chưa có dữ liệu</Text>
        </View>
      );

    return (
      <View style={styles.simpleChart}>
        <View style={styles.chartBars}>
          {chartData.map((item, index) => {
            const height = maxValue > 0 ? (item.value / maxValue) * 120 : 0;
            return (
              <View key={index} style={styles.chartBarContainer}>
                <Text style={[styles.chartBarValue, { color: colors.text }]}>
                  {item.value}
                </Text>
                <LinearGradient
                  colors={gradient}
                  style={[styles.chartBar, { height: Math.max(height, 4) }]}
                />
                <Text
                  style={[styles.chartBarLabel, { color: colors.subText }]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }
);

/* ---------- MAIN COMPONENT ---------- */
export default function PublicProfileScreen() {
  const theme = useTheme() as any;
  const insets = useSafeAreaInsets();
  const isDark = theme.dark;
  const v2 = theme?.version === "v2";

  const colors = useMemo(
    () => ({
      isDark,
      primary: v2 ? "#0BBFE7" : theme.colors.primary || "#6366F1",
      bg: v2 ? "#051221" : isDark ? "#0f1115" : "#F5F7FA",
      card: v2 ? "#0B2035" : isDark ? "#181a20" : "#FFFFFF",
      text: v2 ? "#EAF3FF" : isDark ? "#FFFFFF" : "#333333",
      subText: v2 ? "#9DB4CC" : isDark ? "#848E9C" : "#666666",
      border: v2 ? "rgba(103,181,219,0.38)" : isDark ? "#262932" : "#E0E0E0",
      bgMuted: v2 ? "#0B263A" : isDark ? "#20232b" : "#F8F9FA",
      tabActive: v2 ? "#12B6F3" : "#6366F1",
      tabInactive: v2 ? "#8CA6C8" : isDark ? "#A0A0A0" : "#666666",
    }),
    [isDark, v2, theme.colors.primary]
  );

  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState(0);

  const scrollViewRef = useRef(null);
  const [tabBarY, setTabBarY] = useState(0);
  const [isTabBarSticky, setIsTabBarSticky] = useState(false);

  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // bottom sheets
  const shareSheetRef = useRef(null);
  const statsSheetRef = useRef(null);
  const [statsSheetType, setStatsSheetType] = useState(null);
  const shareSnapPoints = useMemo(() => ["45%"], []);
  const statsSnapPoints = useMemo(() => ["55%", "90%"], []);
  const needsMatches =
    activeTab === 1 || statsSheetType === "matches" || statsSheetType === "wins";
  const needsRatings = activeTab === 2 || statsSheetType === "rating";
  const needsAchievements = activeTab === 3;

  // Queries
  const baseQ = useGetPublicProfileQuery(id);
  const rateQ = useGetRatingHistoryQuery(
    needsRatings ? { id, all: 1 } : skipToken
  );
  const matchQ = useGetMatchHistoryQuery(
    needsMatches ? { id, all: 1 } : skipToken
  );
  const achQ = useGetUserAchievementsQuery(needsAchievements ? id : skipToken);

  const [deleteHistory, { isLoading: deleting }] =
    useDeleteRatingHistoryMutation();
  const [deletingId, setDeletingId] = useState(null);
  const [updateHistory, { isLoading: savingRating }] =
    useUpdateRatingHistoryMutation();
  // Modal sửa điểm trình (admin)
  const [editRating, setEditRating] = useState(null); // item đang sửa
  const [editSingle, setEditSingle] = useState("");
  const [editDouble, setEditDouble] = useState("");
  const [editNote, setEditNote] = useState("");

  const base = baseQ.data || {};
  const ratingRaw = Array.isArray(rateQ.data?.history)
    ? rateQ.data.history
    : rateQ.data?.items || [];
  const matchRaw = Array.isArray(matchQ.data)
    ? matchQ.data
    : matchQ.data?.items || [];
  const summaryScore = base?.summary?.score || {};
  const summaryMatches = base?.summary?.matches || {};

  const sc = useMemo(() => getSPC(base), [base]);

  const { userInfo } = useSelector((state) => state.auth || {});
  const baseId = base?._id || "";
  // Vị trí sở trường ô 1 / ô 2 (đánh đôi)
  const { data: positionStat } = useGetPlayerPositionQuery(
    { playerId: baseId },
    { skip: !baseId },
  );
  const viewerId = userInfo?._id || userInfo?.id;
  const isSelf = viewerId && baseId && String(viewerId) === String(baseId);
  const isAdminViewer =
    userInfo?.isAdmin ||
    userInfo?.role === "admin" ||
    (Array.isArray(userInfo?.roles) && userInfo.roles.includes("admin"));
  const canSeeSensitive = isSelf || isAdminViewer;

  const isOnline = base?.isOnline || base?.status === "online";
  const lastSeen = base?.lastSeen;

  const latestSingle = useMemo(() => {
    const fromSummary = Number(summaryScore?.single);
    if (Number.isFinite(fromSummary)) return fromSummary;
    for (const r of ratingRaw) if (Number.isFinite(r.single)) return r.single;
    const fb = base?.levelPoint?.single ?? base?.levelPoint?.score;
    return Number.isFinite(Number(fb)) ? Number(fb) : NaN;
  }, [ratingRaw, summaryScore?.single, base]);

  const latestDouble = useMemo(() => {
    const fromSummary = Number(summaryScore?.double);
    if (Number.isFinite(fromSummary)) return fromSummary;
    for (const r of ratingRaw) if (Number.isFinite(r.double)) return r.double;
    const fb = base?.levelPoint?.double;
    return Number.isFinite(Number(fb)) ? Number(fb) : NaN;
  }, [ratingRaw, summaryScore?.double, base]);

  const uid = base?._id || id;

  const { totalMatches, wins, losses, winRate } = useMemo(() => {
    if (!matchRaw.length) {
      const total = Number(summaryMatches?.total) || 0;
      const w = Number(summaryMatches?.wins) || 0;
      const l = Number(summaryMatches?.losses) || 0;
      const wr = Number(summaryMatches?.winRate);
      return {
        totalMatches: total,
        wins: w,
        losses: l,
        winRate: Number.isFinite(wr)
          ? Math.round(wr)
          : total
          ? Math.round((w / total) * 100)
          : 0,
      };
    }

    let total = 0,
      w = 0,
      l = 0;
    for (const m of matchRaw) {
      const inA = (m?.team1 || []).some((p) => (p?._id || p?.id) === uid);
      const inB = (m?.team2 || []).some((p) => (p?._id || p?.id) === uid);
      if (!inA && !inB) continue;
      total++;
      if ((inA && m?.winner === "A") || (inB && m?.winner === "B")) w++;
      else l++;
    }
    return {
      totalMatches: total,
      wins: w,
      losses: l,
      winRate: total ? Math.round((w / total) * 100) : 0,
    };
  }, [matchRaw, uid, summaryMatches]);

  // Paging
  const [pageMatch, setPageMatch] = useState(1);
  const matchPerPage = 5;
  const matchPaged = useMemo(
    () =>
      matchRaw.slice((pageMatch - 1) * matchPerPage, pageMatch * matchPerPage),
    [matchRaw, pageMatch]
  );

  const [pageRate, setPageRate] = useState(1);
  const ratePerPage = 8;
  const ratePaged = useMemo(
    () => ratingRaw.slice((pageRate - 1) * ratePerPage, pageRate * ratePerPage),
    [ratingRaw, pageRate]
  );

  // Stats sheet data
  const matchStatsData = useMemo(() => {
    if (!matchRaw.length) return null;
    const monthlyMap = {};
    matchRaw.forEach((m) => {
      if (!m.dateTime) return;
      const d = new Date(m.dateTime);
      const k = `${d.getMonth() + 1}/${d.getFullYear()}`;
      monthlyMap[k] = (monthlyMap[k] || 0) + 1;
    });
    const monthlyMatches = Object.entries(monthlyMap)
      .map(([month, count]) => ({ month, count }))
      .slice(-6);

    const thisMonth = new Date();
    const thisMonthKey = `${
      thisMonth.getMonth() + 1
    }/${thisMonth.getFullYear()}`;

    return {
      totalMatches,
      thisMonth: monthlyMap[thisMonthKey] || 0,
      avgPerMonth:
        monthlyMatches.length > 0
          ? monthlyMatches.reduce((s, m) => s + m.count, 0) /
            monthlyMatches.length
          : 0,
      monthlyMatches,
    };
  }, [matchRaw, totalMatches]);

  const winStatsData = useMemo(() => {
    if (!matchRaw.length) {
      return { wins, losses, winRate, streak: 0 };
    }

    let streak = 0,
      lastResult = null;
    for (const m of matchRaw) {
      const inA = (m?.team1 || []).some((p) => (p?._id || p?.id) === uid);
      const inB = (m?.team2 || []).some((p) => (p?._id || p?.id) === uid);
      if (!inA && !inB) continue;

      const isWin = (inA && m?.winner === "A") || (inB && m?.winner === "B");
      if (lastResult === null) {
        lastResult = isWin;
        streak = 1;
      } else if (lastResult === isWin) streak++;
      else break;
    }
    return { wins, losses, winRate, streak: lastResult ? streak : -streak };
  }, [matchRaw, uid, wins, losses, winRate]);

  const ratingStatsData = useMemo(() => {
    if (!ratingRaw.length) return null;
    const singles = ratingRaw
      .filter((r) => Number.isFinite(r.single))
      .map((r) => r.single);
    const doubles = ratingRaw
      .filter((r) => Number.isFinite(r.double))
      .map((r) => r.double);

    const highestDouble = doubles.length ? Math.max(...doubles) : null;
    const lowestDouble = doubles.length ? Math.min(...doubles) : null;
    const firstDouble = doubles.length ? doubles[doubles.length - 1] : null;
    const lastDouble = doubles.length ? doubles[0] : null;

    const doubleChange =
      firstDouble !== null && lastDouble !== null
        ? lastDouble - firstDouble
        : 0;

    return {
      latestSingle,
      latestDouble,
      totalRatings: ratingRaw.length,
      highestDouble,
      lowestDouble,
      doubleChange,
      ratingHistory: ratingRaw,
      hasSingleData: singles.length >= 2,
      hasDoubleData: doubles.length >= 2,
    };
  }, [ratingRaw, latestSingle, latestDouble]);

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const tasks = [baseQ.refetch?.()];
      if (needsRatings && rateQ.refetch) tasks.push(rateQ.refetch());
      if (needsMatches && matchQ.refetch) tasks.push(matchQ.refetch());
      if (needsAchievements && achQ.refetch) tasks.push(achQ.refetch());
      await Promise.all(tasks);
    } catch (e) {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [baseQ, rateQ, matchQ, achQ, needsRatings, needsMatches, needsAchievements]);

  const handleCopy = useCallback((value, label) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Clipboard.setString(String(value));
    Alert.alert("Đã sao chép", `${label}: ${value}`);
  }, []);

  const handleMatchPress = useCallback((matchId) => {
    router.push(`/match/${matchId}/home`);
  }, []);

  const handleDeleteHistory = useCallback(
    (h) => {
      if (!isAdminViewer) return;
      const historyId = h?._id ?? h?.id;
      const targetUid = h?.user?._id || id;
      if (!historyId || !targetUid) {
        Alert.alert("Lỗi", "Thiếu ID, không thể xoá.");
        return;
      }
      Alert.alert(
        "Xoá chấm trình?",
        "Bạn có chắc chắn muốn xoá mục lịch sử điểm trình này? Hành động không thể hoàn tác.",
        [
          { text: "Huỷ", style: "cancel" },
          {
            text: "Xoá",
            style: "destructive",
            onPress: async () => {
              try {
                setDeletingId(historyId);
                await deleteHistory({
                  userId: String(targetUid),
                  historyId: String(historyId),
                }).unwrap();
                setPageRate(1);
                await rateQ.refetch?.();
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
                Alert.alert("Thành công", "Đã xoá một mục lịch sử điểm trình.");
              } catch (e) {
                Alert.alert("Lỗi", "Xoá thất bại. Vui lòng thử lại.");
              } finally {
                setDeletingId(null);
              }
            },
          },
        ]
      );
    },
    [isAdminViewer, id, deleteHistory, rateQ]
  );

  const handleEditHistory = useCallback(
    (h) => {
      if (!isAdminViewer) return;
      const noteText =
        h?.notes ?? h?.note ?? h?.meta?.notes ?? h?.meta?.note ?? "";
      setEditRating(h);
      setEditSingle(
        Number.isFinite(Number(h?.single)) ? String(h.single) : ""
      );
      setEditDouble(
        Number.isFinite(Number(h?.double)) ? String(h.double) : ""
      );
      setEditNote(String(noteText || ""));
    },
    [isAdminViewer]
  );

  const submitEditHistory = useCallback(async () => {
    if (!editRating) return;
    const historyId = editRating?._id ?? editRating?.id;
    const targetUid = editRating?.user?._id || id;
    if (!historyId || !targetUid) {
      Alert.alert("Lỗi", "Thiếu ID, không thể sửa.");
      return;
    }
    const parseScore = (v) => {
      const s = String(v ?? "").trim().replace(",", ".");
      if (s === "") return undefined;
      const n = Number(s);
      return Number.isFinite(n) ? n : undefined;
    };
    try {
      await updateHistory({
        userId: String(targetUid),
        historyId: String(historyId),
        note: editNote,
        single: parseScore(editSingle),
        double: parseScore(editDouble),
      }).unwrap();
      await rateQ.refetch?.();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditRating(null);
    } catch (e) {
      Alert.alert(
        "Lỗi",
        e?.data?.message || "Cập nhật điểm trình thất bại. Vui lòng thử lại."
      );
    }
  }, [editRating, id, editNote, editSingle, editDouble, updateHistory, rateQ]);

  const handleTabPress = useCallback(
    (index) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveTab(index);

      if (index === 0) {
        requestAnimationFrame(() =>
          scrollViewRef.current?.scrollTo({ y: 0, animated: true })
        );
      } else {
        const targetY =
          tabBarY;
        requestAnimationFrame(() =>
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, targetY),
            animated: true,
          })
        );
      }
    },
    [tabBarY]
  );

  // share sheet
  const profileUrl = `https://pickletour.com/user/${id}`;

  const handleOpenShareSheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    shareSheetRef.current?.expand();
  }, []);

  const shareOptions = useMemo(
    () => [
      {
        id: "copy",
        icon: "copy-outline",
        label: "Sao chép liên kết",
        color: "#6366F1",
        onPress: async () => {
          Clipboard.setString(profileUrl);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Đã sao chép");
          shareSheetRef.current?.close();
        },
      },
      {
        id: "share",
        icon: "share-outline",
        label: "Chia sẻ",
        color: "#10B981",
        onPress: async () => {
          try {
            await Share.share({
              message: `Xem hồ sơ của ${
                base?.name || "người chơi"
              } trên PickleTour\n${profileUrl}`,
            });
          } catch (e) {}
          shareSheetRef.current?.close();
        },
      },
      {
        id: "facebook",
        icon: "logo-facebook",
        label: "Facebook",
        color: "#1877F2",
        onPress: async () => {
          await Linking.openURL(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
              profileUrl
            )}`
          );
          shareSheetRef.current?.close();
        },
      },
      {
        id: "messenger",
        icon: "chatbubble-ellipses",
        label: "Messenger",
        color: "#0084FF",
        onPress: async () => {
          const url = `fb-messenger://share?link=${encodeURIComponent(
            profileUrl
          )}`;
          if (await Linking.canOpenURL(url)) await Linking.openURL(url);
          else Alert.alert("Không thể mở Messenger");
          shareSheetRef.current?.close();
        },
      },
      {
        id: "zalo",
        icon: "chatbubbles",
        label: "Zalo",
        color: "#0068FF",
        onPress: async () => {
          await Linking.openURL(
            `https://zalo.me/share?url=${encodeURIComponent(profileUrl)}`
          );
          shareSheetRef.current?.close();
        },
      },
    ],
    [base?.name, profileUrl]
  );

  // stats sheet
  const handleOpenStatsSheet = useCallback((type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatsSheetType(type);
    statsSheetRef.current?.snapToIndex(0);
  }, []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        style={{ zIndex: 1000 }}
      />
    ),
    []
  );

  const renderStatsContent = useCallback(() => {
    const config =
      {
        matches: {
          title: t("Thống kê trận đấu"),
          icon: "tennis",
          gradient: ["#6366F1", "#8B5CF6"],
        },
        wins: {
          title: t("Thống kê chiến thắng"),
          icon: "trophy",
          gradient: ["#F59E0B", "#EF4444"],
        },
        rating: {
          title: t("Biểu đồ điểm trình"),
          icon: "trending-up",
          gradient: ["#10B981", "#059669"],
        },
      }[statsSheetType] || {};

    return (
      <BottomSheetScrollView style={styles.bottomSheetScrollView}>
        <View style={styles.bottomSheetHeader}>
          <LinearGradient
            colors={config.gradient || ["#6366F1", "#8B5CF6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bottomSheetIcon}
          >
            {statsSheetType === "wins" ? (
              <FontAwesome5 name={config.icon} size={20} color="#FFF" />
            ) : (
              <MaterialCommunityIcons
                name={config.icon}
                size={24}
                color="#FFF"
              />
            )}
          </LinearGradient>
          <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
            {config.title}
          </Text>
        </View>

        {statsSheetType === "matches" && (
          <View style={styles.statsContent}>
            <View style={styles.statsRow}>
              <StatsGlassBox colors={colors}>
                <Text style={[styles.statBoxValue, { color: colors.primary }]}>
                  {matchStatsData?.totalMatches || 0}
                </Text>
                <Text style={[styles.statBoxLabel, { color: colors.subText }]}>
                  Tổng trận
                </Text>
              </StatsGlassBox>
              <StatsGlassBox colors={colors}>
                <Text style={[styles.statBoxValue, { color: "#10B981" }]}>
                  {matchStatsData?.thisMonth || 0}
                </Text>
                <Text style={[styles.statBoxLabel, { color: colors.subText }]}>
                  Tháng này
                </Text>
              </StatsGlassBox>
              <StatsGlassBox colors={colors}>
                <Text style={[styles.statBoxValue, { color: "#F59E0B" }]}>
                  {matchStatsData?.avgPerMonth?.toFixed(1) || "0"}
                </Text>
                <Text style={[styles.statBoxLabel, { color: colors.subText }]}>
                  TB/Tháng
                </Text>
              </StatsGlassBox>
            </View>

            <Text style={[styles.chartTitle, { color: colors.text }]}>
              Trận đấu 6 tháng gần nhất
            </Text>
            <SimpleBarChart
              chartData={
                matchStatsData?.monthlyMatches?.map((m) => ({
                  label: m.month,
                  value: m.count,
                })) || []
              }
              maxValue={Math.max(
                ...(matchStatsData?.monthlyMatches?.map((m) => m.count) || [1])
              )}
              gradient={["#6366F1", "#8B5CF6"]}
              colors={colors}
            />
          </View>
        )}

        {statsSheetType === "wins" && (
          <View style={styles.statsContent}>
            <View style={styles.winRateContainer}>
              <View
                style={[styles.winRateCircle, { borderColor: colors.primary }]}
              >
                <Text style={[styles.winRateValue, { color: colors.primary }]}>
                  {winStatsData?.winRate || 0}%
                </Text>
                <Text style={[styles.winRateLabel, { color: colors.subText }]}>
                  Tỷ lệ thắng
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatsGlassBox
                colors={colors}
                style={{ backgroundColor: "#E8F5E9", borderColor: "#BBF7D0" }}
              >
                <Text style={[styles.statBoxValue, { color: "#4CAF50" }]}>
                  {winStatsData?.wins || 0}
                </Text>
                <Text style={[styles.statBoxLabel, { color: "#2E7D32" }]}>
                  Thắng
                </Text>
              </StatsGlassBox>
              <StatsGlassBox
                colors={colors}
                style={{ backgroundColor: "#FFEBEE", borderColor: "#FECACA" }}
              >
                <Text style={[styles.statBoxValue, { color: "#F44336" }]}>
                  {winStatsData?.losses || 0}
                </Text>
                <Text style={[styles.statBoxLabel, { color: "#C62828" }]}>
                  Thua
                </Text>
              </StatsGlassBox>
              <StatsGlassBox colors={colors}>
                <Text style={[styles.statBoxValue, { color: colors.text }]}>
                  {Math.abs(winStatsData?.streak || 0)}
                </Text>
                <Text style={[styles.statBoxLabel, { color: colors.subText }]}>
                  {(winStatsData?.streak || 0) >= 0
                    ? "Chuỗi thắng"
                    : "Chuỗi thua"}
                </Text>
              </StatsGlassBox>
            </View>

            <View style={styles.winLossBarContainer}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>
                Phân bố kết quả
              </Text>
              <View style={styles.winLossBar}>
                <View
                  style={[
                    styles.winBar,
                    {
                      flex: winStatsData?.wins || 1,
                      backgroundColor: "#4CAF50",
                    },
                  ]}
                />
                <View
                  style={[
                    styles.lossBar,
                    {
                      flex: winStatsData?.losses || 1,
                      backgroundColor: "#F44336",
                    },
                  ]}
                />
              </View>
              <View style={styles.winLossLabels}>
                <Text style={{ color: "#4CAF50", fontWeight: "600" }}>
                  {totalMatches > 0
                    ? (
                        ((winStatsData?.wins || 0) / totalMatches) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </Text>
                <Text style={{ color: "#F44336", fontWeight: "600" }}>
                  {totalMatches > 0
                    ? (
                        ((winStatsData?.losses || 0) / totalMatches) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </Text>
              </View>
            </View>
          </View>
        )}

        {statsSheetType === "rating" && ratingStatsData && (
          <View style={styles.statsContent}>
            <View style={styles.statsRow}>
              <StatsGlassBox
                colors={colors}
                style={{ backgroundColor: "#E8F5E9", borderColor: "#BBF7D0" }}
              >
                <Text style={[styles.statBoxValue, { color: "#4CAF50" }]}>
                  {num(ratingStatsData.latestSingle)}
                </Text>
                <Text style={[styles.statBoxLabel, { color: "#2E7D32" }]}>
                  Điểm Đơn
                </Text>
              </StatsGlassBox>

              <StatsGlassBox
                colors={colors}
                style={{ backgroundColor: "#E3F2FD", borderColor: "#BFDBFE" }}
              >
                <Text style={[styles.statBoxValue, { color: "#1976D2" }]}>
                  {num(ratingStatsData.latestDouble)}
                </Text>
                <Text style={[styles.statBoxLabel, { color: "#1565C0" }]}>
                  Điểm Đôi
                </Text>
              </StatsGlassBox>

              <StatsGlassBox colors={colors}>
                <Text style={[styles.statBoxValue, { color: colors.text }]}>
                  {ratingStatsData.totalRatings || 0}
                </Text>
                <Text style={[styles.statBoxLabel, { color: colors.subText }]}>
                  Lượt chấm
                </Text>
              </StatsGlassBox>
            </View>

            {ratingStatsData.hasDoubleData && (
              <>
                <Text style={[styles.chartTitle, { color: colors.text }]}>
                  Biến động điểm Đôi
                </Text>
                <RatingLineChart
                  data={ratingStatsData.ratingHistory}
                  colors={colors}
                  type="double"
                />
              </>
            )}

            {ratingStatsData.hasSingleData && (
              <>
                <Text
                  style={[
                    styles.chartTitle,
                    { color: colors.text, marginTop: 16 },
                  ]}
                >
                  Biến động điểm Đơn
                </Text>
                <RatingLineChart
                  data={ratingStatsData.ratingHistory}
                  colors={colors}
                  type="single"
                />
              </>
            )}

            {!ratingStatsData.hasDoubleData &&
              !ratingStatsData.hasSingleData && (
                <View style={styles.noChartData}>
                  <Text style={{ color: colors.subText }}>
                    Cần ít nhất 2 điểm dữ liệu
                  </Text>
                </View>
              )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </BottomSheetScrollView>
    );
  }, [
    statsSheetType,
    colors,
    matchStatsData,
    winStatsData,
    ratingStatsData,
    totalMatches,
  ]);

  const genderInfo = useMemo(() => getGenderInfo(base?.gender), [base?.gender]);
  const handLabel = useMemo(
    () =>
      getHandLabel(
        base?.playHand || base?.hand || base?.handedness || base?.dominantHand
      ),
    [base]
  );
  const dob = base?.dob || base?.birthday || base?.dateOfBirth;
  const clubName =
    base?.clubName ||
    base?.mainClub?.name ||
    base?.primaryClub?.name ||
    base?.club?.name;

  const handleScroll = useCallback(
    (event) => {
      setIsTabBarSticky(
        tabBarY > 0 && event.nativeEvent.contentOffset.y >= tabBarY
      );
    },
    [tabBarY]
  );

  const onTabBarLayout = useCallback(
    (e) => setTabBarY(e.nativeEvent.layout.y),
    []
  );

  if (baseQ.isLoading) return <ProfileSkeleton isDark={isDark} />;

  if (baseQ.error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#F44336" />
          <Text style={[styles.errorText, { color: colors.subText }]}>
            Không tìm thấy người dùng
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasContactBlock =
    hasData(base?.phone) ||
    hasData(base?.email) ||
    hasData(base?.address || base?.street);
  const avatarUrl = normalizeUrl(base?.avatar) || AVA_PLACE;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["top"]}
    >
      <BottomSheetModalProvider>
        <StatusBar barStyle="light-content" />

        {/* Sticky Tab Bar */}
        {isTabBarSticky && (
          <ProfileGlassSurface
            colors={colors}
            tintColor={profileGlassSurfaceTint(colors, 0.7, 0.58)}
            style={[
              styles.stickyTabBar,
              {
                backgroundColor: colors.card,
                borderBottomColor: colors.border,
              },
              IOS_26_LIQUID_GLASS_ENABLED && styles.profileGlassPanel,
            ]}
          >
            <View style={styles.stickyTabWrapper}>
              {["Hồ sơ", "Lịch sử thi đấu", "Điểm trình", "Thành tích"].map(
                (tab, index) => (
                  <ProfileTabPill
                    key={index}
                    tab={tab}
                    index={index}
                    activeTab={activeTab}
                    onPress={handleTabPress}
                    colors={colors}
                    sticky
                  />
                )
              )}
            </View>
          </ProfileGlassSurface>
        )}

        <View style={[styles.profileNavigation, { backgroundColor: colors.bg }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityLabel="Quay lại"
            accessibilityRole="button"
            style={styles.navigationButton}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={[styles.navigationTitle, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Hồ sơ vận động viên
          </Text>
          <TouchableOpacity
            onPress={handleOpenShareSheet}
            accessibilityLabel="Chia sẻ hồ sơ"
            accessibilityRole="button"
            style={styles.navigationButton}
          >
            <Ionicons name="share-social-outline" size={23} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.profileHero}>
            <ProfileCourtBackdrop colors={colors} />
            <View style={styles.profileIdentity}>
              <View style={styles.avatarContainer}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setIsImageViewVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Xem ảnh đại diện"
                  style={styles.avatarPressable}
                >
                  <View style={[styles.avatarWrapper, { borderColor: colors.primary }]}>
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatar}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={200}
                      onLoadStart={() => setIsAvatarLoading(true)}
                      onLoad={() => setIsAvatarLoading(false)}
                    />
                    {isAvatarLoading && (
                      <View style={styles.avatarLoadingOverlay}>
                        <ActivityIndicator size="small" color={colors.text} />
                      </View>
                    )}
                    <View
                      style={[
                        styles.onlineStatusBadge,
                        {
                          backgroundColor: isOnline ? "#4CAF50" : "#9E9E9E",
                          borderColor: colors.card,
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
                {base?.isAdmin && (
                  <View
                    style={[
                      styles.verifiedBadge,
                      { borderColor: colors.bg, backgroundColor: colors.primary },
                    ]}
                  >
                    <Ionicons name="shield-checkmark" size={14} color="#FFF" />
                  </View>
                )}
              </View>

              <View style={styles.identityDetails}>
                <PlayerNameText
                  user={base}
                  name={base?.name || base?.fullName || "Người dùng"}
                  style={[styles.userName, { color: colors.text }]}
                  numberOfLines={2}
                />
                <View style={styles.nicknameStatusRow}>
                  <Text style={[styles.userNickname, { color: colors.subText }]}>
                    @{base?.nickname || "no_nick"}
                  </Text>
                  <KycBadge status={base?.cccdStatus} />
                </View>
                <View style={styles.quickInfoContainer}>
                  {hasData(base?.province) && (
                    <View style={styles.identityMeta}>
                      <Ionicons name="location" size={14} color={colors.subText} />
                      <Text style={[styles.identityMetaText, { color: colors.subText }]}>
                        {base.province}
                      </Text>
                    </View>
                  )}
                  <View style={styles.identityMeta}>
                    <MaterialCommunityIcons
                      name={genderInfo.label === "Nam" ? "gender-male" : "gender-female"}
                      size={15}
                      color={colors.subText}
                    />
                    <Text style={[styles.identityMetaText, { color: colors.subText }]}>
                      {genderInfo.label}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            {(sc?.single != null || sc?.double != null) && (
              <View style={styles.scSummary}>
                {sc?.single != null && (
                  <InfoBadge
                    text={"SC Đơn " + num(sc.single)}
                    color={colors.primary}
                    textColor={colors.text}
                  />
                )}
                {sc?.double != null && (
                  <InfoBadge
                    text={"SC Đôi " + num(sc.double)}
                    color={colors.primary}
                    textColor={colors.text}
                  />
                )}
              </View>
            )}
          </View>

          {!isSelf && (
            <View style={styles.actionRow}>
              {!!userInfo && (
                <>
                  <View style={styles.socialActionCell}>
                    <FriendActions userId={String(id)} appearance="profile" />
                  </View>
                  <View style={styles.socialActionCell}>
                    <OpenMessageButton userId={String(id)} appearance="profile" />
                  </View>
                </>
              )}
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/head2head",
                    params: {
                      opponentId: String(id),
                      opponentName: base?.nickname || base?.name || "",
                      opponentAvatar: base?.avatar || "",
                    },
                  })
                }
                accessibilityRole="button"
                activeOpacity={0.85}
                style={[styles.profileAction, styles.challengeAction]}
              >
                <MaterialCommunityIcons name="sword-cross" size={20} color="#F5B935" />
                <Text style={[styles.profileActionText, { color: "#F5B935" }]}>
                  Đối đầu
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {(isAdminViewer || (!!userInfo && !isSelf)) && (
            <View style={[styles.actionRow, styles.secondaryActions]}>
              {isAdminViewer && (
                <>
                  <TouchableOpacity
                    onPress={() => router.push(("/user/" + String(id) + "/grade") as any)}
                    accessibilityRole="button"
                    activeOpacity={0.85}
                    style={[styles.profileAction, { borderColor: colors.border }]}
                  >
                    <Ionicons name="ribbon-outline" size={20} color={colors.text} />
                    <Text style={[styles.profileActionText, { color: colors.text }]}>
                      Chấm trình
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push(("/user/" + String(id) + "/kyc") as any)}
                    accessibilityRole="button"
                    activeOpacity={0.85}
                    style={[styles.profileAction, { borderColor: colors.border }]}
                  >
                    <Ionicons name="card-outline" size={20} color={colors.text} />
                    <Text style={[styles.profileActionText, { color: colors.text }]}>
                      CCCD / KYC
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              <UserActionsMenu
                userId={String(id)}
                userName={base?.nickname || base?.name}
                appearance="profile"
              />
            </View>
          )}

          <View style={styles.statsContainer}>
            <StatCard
              icon={<MaterialCommunityIcons name="tennis" size={25} color={colors.text} />}
              value={totalMatches}
              label="Tổng trận"
              colors={colors}
              onPress={() => handleOpenStatsSheet("matches")}
            />
            <StatCard
              icon={<FontAwesome5 name="trophy" size={23} color={colors.text} />}
              value={wins}
              secondary={String(winRate) + "%"}
              label="Chiến thắng"
              colors={colors}
              onPress={() => handleOpenStatsSheet("wins")}
            />
            <StatCard
              icon={<Ionicons name="trending-up" size={25} color={colors.text} />}
              details={[
                { label: "Đơn", value: num(latestSingle) },
                { label: "Đôi", value: num(latestDouble) },
              ]}
              label="Điểm trình"
              colors={colors}
              onPress={() => handleOpenStatsSheet("rating")}
            />
            {positionStat?.label ? (
              <StatCard
                icon={<Ionicons name="grid-outline" size={25} color={colors.text} />}
                value={positionStat.label}
                label="Sở trường"
                colors={colors}
              />
            ) : null}
          </View>

          {/* Coach achievements — hiển thị nếu là HLV hoặc chính chủ (để có
              nút "Bổ sung thành tích" ngay cả khi chưa có ai duyệt). */}
          {(base?.isCoach || isSelf) && (baseId || id) ? (
            <CoachAchievementsMobile
              userId={baseId || id}
              isSelf={!!isSelf}
              isCoach={!!base?.isCoach}
              isAdminViewer={!!isAdminViewer}
            />
          ) : null}

          {/* Tab Navigation */}
          <View style={styles.tabContainer} onLayout={onTabBarLayout}>
            <View
              style={[
                styles.tabWrapper,
                { backgroundColor: colors.bg, borderBottomColor: colors.border },
              ]}
            >
              {["Hồ sơ", "Lịch sử thi đấu", "Điểm trình", "Thành tích"].map(
                (tab, index) => (
                  <ProfileTabPill
                    key={index}
                    tab={tab}
                    index={index}
                    activeTab={activeTab}
                    onPress={handleTabPress}
                    colors={colors}
                  />
                )
              )}
            </View>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {/* TAB 0 */}
            {activeTab === 0 && (
              <View style={styles.profileTab}>
                <ProfileSection colors={colors}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Giới thiệu
                  </Text>
                  <Text style={[styles.bioText, { color: colors.subText }]}>
                    {base?.bio || "Chưa có thông tin."}
                  </Text>
                </ProfileSection>

                <ProfileSection colors={colors}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Thông tin cơ bản
                  </Text>
                  <View style={styles.infoGrid}>
                    {hasData(base?.name || base?.fullName) && (
                      <InfoItem
                        label="Họ và tên"
                        value={base?.name || base?.fullName}
                        colors={colors}
                      />
                    )}
                    {hasData(base?.nickname) && (
                      <InfoItem
                        label="Nickname"
                        value={base?.nickname}
                        copyable
                        onCopy={handleCopy}
                        colors={colors}
                      />
                    )}
                    {hasData(genderInfo.label) && (
                      <InfoItem
                        label="Giới tính"
                        value={genderInfo.label}
                        colors={colors}
                      />
                    )}
                    {hasData(base?.province) && (
                      <InfoItem
                        label="Tỉnh thành"
                        value={base?.province}
                        colors={colors}
                      />
                    )}
                    {hasData(dob) && (
                      <InfoItem
                        label="Ngày sinh"
                        value={fmtDate(dob)}
                        colors={colors}
                      />
                    )}
                    {hasData(calcAge(dob)) && (
                      <InfoItem
                        label="Tuổi"
                        value={`${calcAge(dob)} tuổi`}
                        colors={colors}
                      />
                    )}
                    {hasData(handLabel) && (
                      <InfoItem
                        label="Tay thuận"
                        value={handLabel}
                        colors={colors}
                      />
                    )}
                  </View>
                </ProfileSection>

                <ProfileSection colors={colors}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Thông tin thi đấu
                  </Text>
                  <View style={styles.infoGrid}>
                    {hasData(clubName) && (
                      <InfoItem
                        label="CLB chính"
                        value={clubName}
                        colors={colors}
                      />
                    )}
                    <InfoItem
                      label="Điểm đơn"
                      value={num(latestSingle)}
                      colors={colors}
                    />
                    <InfoItem
                      label="Điểm đôi"
                      value={num(latestDouble)}
                      colors={colors}
                    />
                    <InfoItem
                      label="Tổng trận"
                      value={`${totalMatches || 0} trận`}
                      colors={colors}
                    />
                    <InfoItem
                      label="Thắng / Tỷ lệ"
                      value={`${wins || 0} (${winRate}%)`}
                      colors={colors}
                    />
                  </View>
                </ProfileSection>

                {canSeeSensitive && hasContactBlock && (
                  <ProfileSection colors={colors}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Thông tin liên hệ
                    </Text>
                    <View style={styles.infoGrid}>
                      {hasData(base?.phone) && (
                        <InfoItem
                          label="Số điện thoại"
                          value={base?.phone}
                          copyable
                          onCopy={handleCopy}
                          colors={colors}
                        />
                      )}
                      {hasData(base?.email) && (
                        <InfoItem
                          label="Email"
                          value={base?.email}
                          copyable
                          onCopy={handleCopy}
                          colors={colors}
                        />
                      )}
                      {hasData(base?.address || base?.street) && (
                        <InfoItem
                          label="Địa chỉ"
                          value={base?.address || base?.street}
                          colors={colors}
                        />
                      )}
                    </View>
                  </ProfileSection>
                )}
              </View>
            )}

            {/* TAB 1 (RESTORED OLD UI) */}
            {activeTab === 1 && (
              <View style={styles.matchTab}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                  Lịch sử thi đấu
                </Text>
                {matchQ.isLoading || (matchQ.isFetching && !matchRaw.length) ? (
                  <EmptyGlassState colors={colors}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.emptyText, { color: colors.subText }]}>
                      Đang tải dữ liệu trận đấu...
                    </Text>
                  </EmptyGlassState>
                ) : matchPaged.length === 0 ? (
                  <EmptyGlassState colors={colors}>
                    <MaterialCommunityIcons
                      name="tennis-ball"
                      size={64}
                      color={isDark ? "#333" : "#E0E0E0"}
                    />
                    <Text style={[styles.emptyText, { color: colors.subText }]}>
                      Chưa có dữ liệu trận đấu
                    </Text>
                  </EmptyGlassState>
                ) : (
                  <>
                    {matchPaged.map((match) => (
                      <MatchCard
                        key={match._id || match.id || match.code}
                        match={match}
                        userId={uid}
                        colors={colors}
                        onPress={() =>
                          handleMatchPress(match._id || match.id || match.code)
                        }
                      />
                    ))}

                    {matchRaw.length > matchPerPage && (
                      <View style={styles.pagination}>
                        <ProfilePageButton
                          colors={colors}
                          disabled={pageMatch === 1}
                          onPress={() => {
                            setPageMatch((p) => Math.max(1, p - 1));
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light
                            );
                            const targetY =
                              tabBarY;
                            requestAnimationFrame(() => {
                              scrollViewRef.current?.scrollTo({
                                y: Math.max(0, targetY),
                                animated: true,
                              });
                            });
                          }}
                        >
                          <Ionicons
                            name="chevron-back"
                            size={20}
                            color={colors.subText}
                          />
                        </ProfilePageButton>

                        <Text style={[styles.pageText, { color: colors.text }]}>
                          {pageMatch} /{" "}
                          {Math.ceil(matchRaw.length / matchPerPage)}
                        </Text>

                        <ProfilePageButton
                          colors={colors}
                          disabled={
                            pageMatch >=
                            Math.ceil(matchRaw.length / matchPerPage)
                          }
                          onPress={() => {
                            setPageMatch((p) =>
                              Math.min(
                                Math.ceil(matchRaw.length / matchPerPage),
                                p + 1
                              )
                            );
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light
                            );
                            const targetY =
                              tabBarY;
                            requestAnimationFrame(() => {
                              scrollViewRef.current?.scrollTo({
                                y: Math.max(0, targetY),
                                animated: true,
                              });
                            });
                          }}
                        >
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={colors.subText}
                          />
                        </ProfilePageButton>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* TAB 2 */}
            {activeTab === 2 && (
              <View style={styles.ratingTab}>
                {rateQ.isLoading || (rateQ.isFetching && !ratingRaw.length) ? (
                  <EmptyGlassState colors={colors}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.emptyText, { color: colors.subText }]}>
                      Đang tải lịch sử điểm trình...
                    </Text>
                  </EmptyGlassState>
                ) : ratePaged.length === 0 ? (
                  <EmptyGlassState colors={colors}>
                    <Ionicons
                      name="stats-chart"
                      size={64}
                      color={isDark ? "#333" : "#E0E0E0"}
                    />
                    <Text style={[styles.emptyText, { color: colors.subText }]}>
                      Chưa có lịch sử điểm
                    </Text>
                  </EmptyGlassState>
                ) : (
                  <>
                    {ratePaged.map((item, index) => {
                      const prevItem =
                        index < ratePaged.length - 1
                          ? ratePaged[index + 1]
                          : null;
                      return (
                        <RatingHistoryRow
                          key={item._id || item.id}
                          item={item}
                          prevItem={prevItem}
                          isAdmin={isAdminViewer}
                          colors={colors}
                          isDeleting={
                            deleting && deletingId === (item._id || item.id)
                          }
                          onDelete={() => handleDeleteHistory(item)}
                          onEdit={() => handleEditHistory(item)}
                        />
                      );
                    })}

                    {ratingRaw.length > ratePerPage && (
                      <View style={styles.pagination}>
                        <ProfilePageButton
                          colors={colors}
                          disabled={pageRate === 1}
                          onPress={() => {
                            setPageRate((p) => Math.max(1, p - 1));
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light
                            );
                            const targetY =
                              tabBarY;
                            requestAnimationFrame(() => {
                              scrollViewRef.current?.scrollTo({
                                y: Math.max(0, targetY),
                                animated: true,
                              });
                            });
                          }}
                        >
                          <Ionicons
                            name="chevron-back"
                            size={20}
                            color={colors.subText}
                          />
                        </ProfilePageButton>

                        <Text style={[styles.pageText, { color: colors.text }]}>
                          {pageRate} /{" "}
                          {Math.ceil(ratingRaw.length / ratePerPage)}
                        </Text>

                        <ProfilePageButton
                          colors={colors}
                          disabled={
                            pageRate >=
                            Math.ceil(ratingRaw.length / ratePerPage)
                          }
                          onPress={() => {
                            setPageRate((p) =>
                              Math.min(
                                Math.ceil(ratingRaw.length / ratePerPage),
                                p + 1
                              )
                            );
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light
                            );
                            const targetY =
                              tabBarY;
                            requestAnimationFrame(() => {
                              scrollViewRef.current?.scrollTo({
                                y: Math.max(0, targetY),
                                animated: true,
                              });
                            });
                          }}
                        >
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={colors.subText}
                          />
                        </ProfilePageButton>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* TAB 3 (RESTORED OLD UI) */}
            {activeTab === 3 && (
              <AchievementsTab
                data={achQ.data}
                loading={achQ.isLoading}
                error={achQ.error}
                colors={colors}
              />
            )}
          </View>
        </Animated.ScrollView>

        {/* Avatar Viewer */}
        <ImageViewing
          images={[{ uri: avatarUrl }]}
          imageIndex={0}
          visible={isImageViewVisible}
          onRequestClose={() => setIsImageViewVisible(false)}
          swipeToCloseEnabled
          doubleTapToZoomEnabled
          backgroundColor={isDark ? "#000000" : "#FFFFFF"}
          FooterComponent={() => (
            <View
              style={{ padding: 20, alignItems: "center", marginBottom: 20 }}
            >
              <Text
                style={{
                  color: isDark ? "#FFF" : "#333",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {base?.name || "Ảnh đại diện"}
              </Text>
              {!isOnline && lastSeen && (
                <Text
                  style={{
                    color: isDark ? "#A0A0A0" : "#666",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  Truy cập lần cuối: {fmtDT(lastSeen)}
                </Text>
              )}
            </View>
          )}
        />

        {/* Admin: Modal sửa điểm trình của 1 dòng lịch sử */}
        <Modal
          visible={Boolean(editRating)}
          transparent
          animationType="fade"
          onRequestClose={() => setEditRating(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.editModalOverlay}
          >
            <View
              style={[
                styles.editModalCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.editModalTitle, { color: colors.text }]}>
                Sửa điểm trình
              </Text>
              <Text style={[styles.editModalSub, { color: colors.subText }]}>
                {fmtDate(editRating?.scoredAt)} ·{" "}
                {editRating?.scorer?.name || "Hệ thống"}
              </Text>

              <View style={styles.editModalRow}>
                <View style={styles.editModalField}>
                  <Text
                    style={[styles.editModalLabel, { color: colors.subText }]}
                  >
                    Điểm Đơn
                  </Text>
                  <TextInput
                    value={editSingle}
                    onChangeText={setEditSingle}
                    keyboardType="decimal-pad"
                    placeholder="VD: 4.50"
                    placeholderTextColor={colors.subText}
                    style={[
                      styles.editModalInput,
                      {
                        backgroundColor: colors.bgMuted,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />
                </View>
                <View style={styles.editModalField}>
                  <Text
                    style={[styles.editModalLabel, { color: colors.subText }]}
                  >
                    Điểm Đôi
                  </Text>
                  <TextInput
                    value={editDouble}
                    onChangeText={setEditDouble}
                    keyboardType="decimal-pad"
                    placeholder="VD: 4.30"
                    placeholderTextColor={colors.subText}
                    style={[
                      styles.editModalInput,
                      {
                        backgroundColor: colors.bgMuted,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />
                </View>
              </View>

              <Text style={[styles.editModalLabel, { color: colors.subText }]}>
                Lý do (ghi chú)
              </Text>
              <TextInput
                value={editNote}
                onChangeText={setEditNote}
                placeholder="Lý do điều chỉnh…"
                placeholderTextColor={colors.subText}
                multiline
                textAlignVertical="top"
                maxLength={500}
                style={[
                  styles.editModalTextArea,
                  {
                    backgroundColor: colors.bgMuted,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

              <Text style={[styles.editModalHint, { color: colors.subText }]}>
                Chỉ sửa dòng lịch sử này. Điểm hiện tại của VĐV không đổi.
              </Text>

              <View style={styles.editModalActions}>
                <TouchableOpacity
                  style={[
                    styles.editModalBtn,
                    { backgroundColor: colors.bgMuted },
                  ]}
                  onPress={() => setEditRating(null)}
                  disabled={savingRating}
                >
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    Huỷ
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.editModalBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={submitEditHistory}
                  disabled={savingRating}
                >
                  {savingRating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                      Lưu
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Share Bottom Sheet */}
        <BottomSheet
          ref={shareSheetRef}
          index={-1}
          snapPoints={shareSnapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={[
            styles.sheetBackground,
            {
              backgroundColor: IOS_26_LIQUID_GLASS_ENABLED
                ? profileGlassSurfaceTint(colors, 0.7, 0.58)
                : colors.card,
              borderColor: colors.border,
            },
          ]}
          handleIndicatorStyle={{ backgroundColor: colors.border }}
          containerStyle={{ zIndex: 1000 }}
        >
          <BottomSheetView style={styles.sheetContainer}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              Chia sẻ hồ sơ
            </Text>

            <ProfileGlassSurface
              colors={colors}
              tintColor={profileGlassSurfaceTint(colors, 0.66, 0.54)}
              style={[
                styles.shareList,
                { backgroundColor: colors.card, borderColor: colors.border },
                IOS_26_LIQUID_GLASS_ENABLED && styles.profileGlassPanel,
              ]}
            >
              {shareOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.shareRow,
                    { borderBottomColor: colors.border },
                  ]}
                  activeOpacity={0.8}
                  onPress={opt.onPress}
                >
                  <ProfileGlassSurface
                    colors={colors}
                    effect="clear"
                    tintColor={`${opt.color}26`}
                    style={[
                      styles.shareIconWrap,
                      { backgroundColor: `${opt.color}1A` },
                      IOS_26_LIQUID_GLASS_ENABLED && styles.profileInnerGlass,
                    ]}
                  >
                    <Ionicons name={opt.icon} size={18} color={opt.color} />
                  </ProfileGlassSurface>
                  <Text style={[styles.shareLabel, { color: colors.text }]}>
                    {opt.label}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.subText}
                  />
                </TouchableOpacity>
              ))}
            </ProfileGlassSurface>
          </BottomSheetView>
        </BottomSheet>

        {/* Stats Bottom Sheet */}
        <BottomSheet
          ref={statsSheetRef}
          index={-1}
          snapPoints={statsSnapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={[
            styles.sheetBackground,
            {
              backgroundColor: IOS_26_LIQUID_GLASS_ENABLED
                ? profileGlassSurfaceTint(colors, 0.7, 0.58)
                : colors.card,
              borderColor: colors.border,
            },
          ]}
          handleIndicatorStyle={{ backgroundColor: colors.border }}
          containerStyle={{ zIndex: 1000 }}
        >
          {renderStatsContent()}
        </BottomSheet>
      </BottomSheetModalProvider>
    </SafeAreaView>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  profileAmbientBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  profileAmbientBand: {
    position: "absolute",
    top: 380,
    left: -42,
    right: -42,
    height: 126,
    borderRadius: 30,
  },
  profileAmbientBandAlt: {
    top: 560,
    height: 94,
  },
  profileGlassPanel: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  profileInnerGlass: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  profileHeaderChipGlass: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },

  centerBox: { padding: 20, justifyContent: "center", alignItems: "center" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: { fontSize: 16, textAlign: "center", marginTop: 16 },

  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  headerGradient: {
    height: HEADER_HEIGHT,
    paddingTop: 60,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  headerCircle1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerCircle2: {
    position: "absolute",
    bottom: -20,
    left: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  avatarContainer: { position: "relative", marginBottom: 12 },
  avatarPressable: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarWrapper: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    overflow: "hidden",
    position: "relative",
  },
  avatar: { width: "100%", height: "100%" },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  onlineStatusBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    zIndex: 5,
  },

  userName: { fontSize: 23, fontWeight: "800", color: "#FFF", marginBottom: 8, flexShrink: 1 },
  nicknameContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  userNickname: { fontSize: 15, fontWeight: "600", color: "#FFF" },

  quickInfoContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },

  kycBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  kycBadgeText: { fontSize: 12, fontWeight: "700" },

  shareButton: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerButtonGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 4, paddingBottom: 40 },

  profileNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
    paddingHorizontal: 8,
  },
  navigationButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  navigationTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
  },

  profileHero: {
    position: "relative",
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
  },
  profileCourtBackdrop: { ...StyleSheet.absoluteFillObject },
  profileIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  identityDetails: { flex: 1, minWidth: 0 },
  nicknameStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  identityMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  identityMetaText: { fontSize: 13, fontWeight: "600" },
  scSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  secondaryActions: { alignItems: "center" },
  socialActionCell: { flex: 1, minWidth: 0 },
  profileAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  challengeAction: {
    borderColor: "rgba(245,185,53,0.55)",
    backgroundColor: "rgba(245,185,53,0.12)",
  },
  profileActionText: { fontSize: 13, fontWeight: "700", flexShrink: 1 },

  statCardButton: { flexGrow: 1, flexBasis: "47%", minWidth: 0 },
  statHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  statAccent: { width: 3, height: 16, borderRadius: 2 },
  statHeadingText: { fontSize: 12, fontWeight: "700" },
  statDetails: { alignSelf: "stretch" },
  statDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  statDetailLabel: { fontSize: 12, fontWeight: "600" },
  statDetailValue: {
    fontSize: 21,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    marginLeft: 6,
    flexShrink: 1,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
  },
  statSecondaryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(76,175,80,0.18)",
  },
  statSecondaryText: { fontSize: 11, fontWeight: "700", color: "#4CAF50" },

  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statsContainerSmall: { flexDirection: "column" },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    minHeight: 116,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardGlass: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  statGradientWash: {
    opacity: 0.74,
  },
  statCardSmall: { width: "100%", alignSelf: "stretch" },
  statIconContainer: { marginBottom: 8 },
  statValue: {
    fontSize: 30,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
    color: "#FFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    textAlign: "left",
    fontWeight: "600",
  },
  statCardTapHint: { position: "absolute", right: 10, top: 10, opacity: 0.9 },

  stickyTabBar: {
    position: "absolute",
    top: NAVIGATION_HEIGHT,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
    paddingTop: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  stickyTabWrapper: {
    flexDirection: "row",
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  stickyTab: {
    flex: 1,
    minWidth: 0,
    height: TAB_BAR_HEIGHT,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 0,
  },
  stickyTabActive: { backgroundColor: "#6366F1" },
  stickyTabText: { fontSize: 12, fontWeight: "600" },
  stickyTabTextActive: { color: "#FFF" },
  profileActiveTabGlass: {
    width: "100%",
    minHeight: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  tabContainer: { marginBottom: 20, paddingHorizontal: 16 },
  tabWrapper: {
    flexDirection: "row",
    borderBottomWidth: 1,
    padding: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { backgroundColor: "#6366F1" },
  historyTab: { flex: 1.5 },
  tabText: { fontSize: 12, fontWeight: "600" },
  tabTextActive: { fontWeight: "800" },

  tabContent: { paddingHorizontal: 16 },
  profileTab: { gap: 20 },

  section: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  bioText: { fontSize: 14, lineHeight: 22 },

  infoGrid: { gap: 16 },
  infoItem: {
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  infoValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoValue: { fontSize: 15, fontWeight: "500", flex: 1 },
  copyButton: { padding: 4 },

  /* ===== match tab (old UI) ===== */
  matchTab: { gap: 16 },
  matchCard: { borderRadius: 16, overflow: "hidden", marginBottom: 12 },
  matchCardContainer: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  resultText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  matchHeaderRight: { flex: 1, alignItems: "flex-end" },
  matchDate: { fontSize: 11, marginBottom: 2 },
  tournamentName: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  matchDetailLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  teamsVerticalContainer: { gap: 12 },
  teamSection: { borderRadius: 12, padding: 12 },
  teamPlayers: { gap: 8 },
  scoreDisplayContainer: { alignItems: "center", paddingVertical: 8 },
  scoreDisplayText: { fontSize: 20, fontWeight: "900", letterSpacing: 2 },
  videoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  videoText: { fontSize: 12, fontWeight: "600", color: "#FF3B30" },

  playerRowCompact: { flexDirection: "row", alignItems: "center", gap: 10 },
  playerAvatarCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  playerInfoCompact: { flex: 1, minWidth: 0 },
  playerNameCompact: { fontSize: 13, fontWeight: "500" },
  playerStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
    flexWrap: "wrap",
  },
  scoreChangeCompact: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  scoreChangeTextCompact: { fontSize: 11 },
  deltaTextCompact: { fontSize: 10, fontWeight: "700" },
  scChipsRow: { flexDirection: "row", gap: 4 },
  scChip: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  scChipTxt: { fontSize: 10, fontWeight: "700" },

  /* rating tab */
  ratingTab: { gap: 12 },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: "relative",
  },
  ratingAdminActions: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editItemButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "rgba(18,182,243,0.12)",
  },
  deleteItemButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,59,48,0.1)",
  },
  ratingLeft: { flex: 1, paddingRight: 64 },
  editModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  editModalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  editModalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  editModalSub: { fontSize: 12, marginBottom: 16 },
  editModalRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  editModalField: { flex: 1 },
  editModalLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  editModalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  editModalTextArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 72,
  },
  editModalHint: { fontSize: 12, marginTop: 10 },
  editModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 18,
  },
  editModalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingDate: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  ratingScorer: { fontSize: 12 },
  ratingScores: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  ratingScoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 70,
  },
  ratingScoreLabel: {
    fontSize: 10,
    color: "#9C27B0",
    fontWeight: "600",
    marginBottom: 4,
  },
  ratingScoreValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#9C27B0",
    marginBottom: 2,
  },
  ratingDelta: { fontSize: 10, fontWeight: "700" },
  ratingNote: { fontSize: 12, marginTop: 6, lineHeight: 16 },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyGlassState: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 34,
  },
  emptyText: { fontSize: 16, marginTop: 16 },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 20,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pageButtonDisabled: { opacity: 0.3 },
  pageText: { fontSize: 14, fontWeight: "600" },

  /* achievements tab (old UI) */
  achTabContainer: { gap: 16 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpiCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  kpiTitle: { fontWeight: "700", fontSize: 13 },
  kpiValue: { fontSize: 22, fontWeight: "800" },
  kpiSub: { fontSize: 11 },

  achRowCard: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  achRowTitle: { fontWeight: "700", fontSize: 15, marginBottom: 4 },
  achRowLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  achRowLabel: { width: 80, fontSize: 12 },
  achChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  achChipText: { fontSize: 11, fontWeight: "700" },

  /* BottomSheet - share */
  sheetContainer: { paddingHorizontal: 16, paddingTop: 6 },
  sheetBackground: {
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", marginBottom: 12 },
  shareList: { borderRadius: 12, overflow: "hidden" },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  shareIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  shareLabel: { flex: 1, fontSize: 14, fontWeight: "700" },

  /* BottomSheet - stats */
  bottomSheetScrollView: { paddingHorizontal: 16 },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    marginBottom: 12,
  },
  bottomSheetIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetTitle: { fontSize: 16, fontWeight: "800" },

  statsContent: { paddingBottom: 8 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statBox: { flex: 1, borderRadius: 14, padding: 12, alignItems: "center" },
  statBoxValue: { fontSize: 20, fontWeight: "900" },
  statBoxLabel: { fontSize: 11, marginTop: 2, fontWeight: "700" },

  chartTitle: { fontSize: 13, fontWeight: "800", marginBottom: 10 },

  simpleChart: { paddingVertical: 8 },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  chartBarContainer: { width: 44, alignItems: "center" },
  chartBarValue: { fontSize: 12, fontWeight: "800", marginBottom: 6 },
  chartBar: { width: 18, borderRadius: 9 },
  chartBarLabel: { fontSize: 10, marginTop: 6, textAlign: "center" },

  winRateContainer: { alignItems: "center", marginBottom: 14 },
  winRateCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  winRateValue: { fontSize: 26, fontWeight: "900" },
  winRateLabel: { fontSize: 12, fontWeight: "700", marginTop: 2 },

  winLossBarContainer: { marginTop: 10 },
  winLossBar: {
    height: 14,
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "row",
  },
  winBar: { height: 14 },
  lossBar: { height: 14 },
  winLossLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },

  /* Line chart */
  noChartData: { paddingVertical: 18, alignItems: "center" },
  lineChartContainer: { flexDirection: "row", gap: 10, marginBottom: 12 },
  lineChartYAxis: { width: 56, justifyContent: "space-between" },
  axisLabel: { fontSize: 10, fontWeight: "700" },
  lineChartArea: { position: "relative" },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.6,
  },
  lineSegment: { position: "absolute", height: 2, transformOrigin: "left" },
  linePoint: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  xAxisLabels: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -16,
    height: 16,
  },
  xAxisLabel: { position: "absolute", fontSize: 10, fontWeight: "700" },
});
