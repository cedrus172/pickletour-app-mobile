import { useFloatingTabBarPadding } from "@/hooks/useFloatingTabBarPadding";
// app/screens/RankingListScreen.jsx
import {
  router,
  useRouter } from "expo-router";
import { useOpenDmMutation } from "@/slices/messagesApiSlice";
import {
  useAcceptFriendMutation,
  useFriendStatusQuery,
  useRemoveFriendMutation,
  useSendFriendRequestMutation,
  } from "@/slices/friendsApiSlice";
import React,
  {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  } from "react";
import {
  ActivityIndicator,
  // ✅ Đã thêm
  Animated,
  Easing,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  TouchableWithoutFeedback,
  useColorScheme,
  DeviceEventEmitter,
  InteractionManager,
  SafeAreaView as RNSafeAreaView,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { useResponsive } from "@/hooks/useResponsive";
import { VN_PROVINCES } from "@/constants/provinces";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "@react-navigation/native";
import ImageViewing from "@/components/ui/ResponsiveImageViewer";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView as EdgeSafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import {
  useGetRankingsListQuery,
  useGetRankingsPodiumAnnouncementsQuery,
  useGetRankingsPodiums30dQuery,
} from "@/slices/rankingsApiSlice";
import { useGetPlayerPositionsQuery } from "@/slices/headtoheadApiSlice";
import { useGetMeQuery } from "@/slices/usersApiSlice";
import { setKeyword } from "@/slices/rankingUiSlice";
import { normalizeUrl } from "@/utils/normalizeUri";
import RankingChart from "@/components/RankingChart";
import AppleLiquidGlassView from "@/components/ui/AppleLiquidGlassView";
import { useLiquidGlassEnabled } from "@/context/GlassAppearanceContext";
import { IOS_26_LIQUID_GLASS_ENABLED } from "@/utils/nativeTabs";
import PlayerNameText from "@/components/PlayerNameText";
import RangeSlider from "@/components/RangeSlider";
import { IS_V3, IS_V3_LIGHT, sk } from "@/hooks/uiVersion";
import {
  PlayerActions,
  PlayerAvatar,
  PlayerBadges,
  PlayerScore,
  PremiumRankingCard,
  RankBadge,
  RankingFilters,
  RankingHeader,
  RankingList,
  RankingPage,
  RankingSearch,
  RANKING_COLORS,
  ScoreRange,
  type PlayerAction,
} from "@/components/rankings/RankingDesign";

/* ================= Config ================= */
const PLACE = "https://dummyimage.com/100x100/cccccc/ffffff&text=?";
const COLORS = {
  gold: sk("#f59e0b", "#E08A00"),
  silver: sk("#C0C0C0", "#7C8CA3"),
  bronze: sk("#CD7F32", "#B8692A"),
  kycVerified: sk("#22c55e", "#16A34A"),
  kycPending: sk("#f59e0b", "#D97706"),
  scoreBlue: "#2563EB",
  scoreRed: sk("#ef4444", "#DC2626"),
  scoreGrey: sk("#94a3b8", "#7C8CA3"),
};
const SCORE_STALE_MONTHS = 4;
const ACHIEVEMENT_VISIBLE_LIMIT = 3;

const ACHIEVEMENT_TONES = {
  yellow: { bg: "#facc15", fg: "#422006", border: "#fde68a" },
  gold: { bg: "#facc15", fg: "#422006", border: "#fde68a" },
  bronze: { bg: "#b45309", fg: "#fff7ed", border: "#fb923c" },
  grey: { bg: "#64748b", fg: "#f8fafc", border: "#cbd5e1" },
  gray: { bg: "#64748b", fg: "#f8fafc", border: "#cbd5e1" },
  blue: { bg: "#2563eb", fg: "#eff6ff", border: "#93c5fd" },
  cyan: { bg: "#0891b2", fg: "#ecfeff", border: "#67e8f9" },
  green: { bg: "#16a34a", fg: "#f0fdf4", border: "#86efac" },
  red: { bg: "#dc2626", fg: "#fef2f2", border: "#fca5a5" },
  purple: { bg: "#7c3aed", fg: "#faf5ff", border: "#c4b5fd" },
  navy: { bg: "#1e3a8a", fg: "#eff6ff", border: "#93c5fd" },
};

const PODIUM_MARQUEE_META = {
  gold: {
    label: "Vô địch",
    action: "vô địch giải",
    icon: "trophy",
    colors: ["#fff7ad", "#facc15", "#f59e0b"],
    text: "#422006",
    accent: "#facc15",
    glow: "rgba(250,204,21,0.34)",
  },
  silver: {
    label: "Hạng nhì",
    action: "đạt hạng nhì tại giải",
    icon: "medal",
    colors: ["#f8fafc", "#cbd5e1", "#94a3b8"],
    text: "#102033",
    accent: "#cbd5e1",
    glow: "rgba(203,213,225,0.3)",
  },
  bronze: {
    label: "Đồng hạng ba",
    action: "đồng hạng ba tại giải",
    icon: "medal-outline",
    colors: ["#78350f", "#b45309", "#f97316"],
    text: "#fff7ed",
    accent: "#fb923c",
    glow: "rgba(251,146,60,0.3)",
  },
};

const fmt3 = (x) => {
  if (x === null) return "***";
  return Number.isFinite(x) ? Number(x).toFixed(3) : "0.000";
};

const CustomImageComponent = (props) => (
  <ExpoImage
    {...props}
    style={{ width: "100%", height: "100%" }}
    contentFit="contain"
    cachePolicy="memory-disk"
    transition={200}
  />
);

/* ================= Theme Hook ================= */
function useThemeColors() {
  const navTheme = useTheme() as any;
  const sysScheme = useColorScheme?.() || "light";
  const v2 = navTheme?.version === "v2" || IS_V3;
  const isDark =
    (v2 && !IS_V3_LIGHT) || (typeof navTheme?.dark === "boolean" ? navTheme.dark : sysScheme === "dark");

  return useMemo(() => {
    const bg = v2 ? RANKING_COLORS.background : isDark ? "#0f1115" : "#F5F7FA";
    const card = v2 ? RANKING_COLORS.surfaceStrong : isDark ? "#181a20" : "#FFFFFF";
    const text = v2 ? RANKING_COLORS.text : isDark ? "#FFFFFF" : "#1A1D1E";
    const subText = v2 ? RANKING_COLORS.textMuted : isDark ? "#848E9C" : "#6B7280";
    const border = v2 ? RANKING_COLORS.border : isDark ? "#262932" : "#E5E7EB";
    const primary = v2 ? RANKING_COLORS.primary : isDark ? "#3B82F6" : "#2563EB";
    const inputBg = v2 ? sk(RANKING_COLORS.surface, "#EEF3FA") : isDark ? "#20232b" : "#F3F4F6";

    return {
      isDark,
      v2,
      bg,
      card,
      text,
      subText,
      border,
      primary,
      inputBg,
      shadow: isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.05)",
    };
  }, [navTheme, isDark, v2]);
}

/* ================= Helpers ================= */
const calcAge = (u) => {
  if (!u) return null;
  const today = new Date();
  const dateStr =
    u.dob || u.dateOfBirth || u.birthday || u.birthdate || u.birth_date;
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d)) {
      let age = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
      return age;
    }
  }
  return null;
};

const genderLabel = (g) =>
  g === "male" ? "Nam" : g === "female" ? "Nữ" : "Khác";

const medalLabel = (m) =>
  m === "gold"
    ? "Nhà vô địch"
    : m === "silver"
    ? "Á quân"
    : m === "bronze"
    ? "Đồng hạng 3"
    : "";

const getMedalColors = (medal) => {
  switch (medal) {
    case "gold":
      return {
        border: COLORS.gold,
        text: COLORS.gold,
        glow1: "rgba(245,158,11,.45)",
        glow2: "rgba(245,158,11,.25)",
      };
    case "silver":
      return {
        border: COLORS.silver,
        text: COLORS.silver,
        glow1: "rgba(192,192,192,.35)",
        glow2: "rgba(192,192,192,.22)",
      };
    case "bronze":
      return {
        border: COLORS.bronze,
        text: COLORS.bronze,
        glow1: "rgba(205,127,50,.35)",
        glow2: "rgba(205,127,50,.22)",
      };
    default:
      return {
        border: "#bbb",
        text: "#555",
        glow1: "rgba(0,0,0,0)",
        glow2: "rgba(0,0,0,0)",
      };
  }
};

const canGradeUser = (me, targetProvince) => {
  if (me?.role === "admin") return true;
  if (!me?.evaluator?.enabled) return false;
  const scopes = me?.evaluator?.gradingScopes?.provinces || [];
  return !!targetProvince && scopes.includes(String(targetProvince).trim());
};

const canViewKycAdmin = (me, status) =>
  me?.role === "admin" && (status === "verified" || status === "pending");

const getVerifyChip = (status, tierColor) => {
  if (status === "verified")
    return {
      label: "Đã xác thực",
      bg: "rgba(34, 197, 94, 0.1)",
      fg: COLORS.kycVerified,
      icon: "checkmark-circle",
    };
  if (status === "pending")
    return {
      label: "Chờ xác thực",
      bg: "rgba(245, 158, 11, 0.1)",
      fg: COLORS.kycPending,
      icon: "time",
    };
  if (tierColor === "red")
    return {
      label: "Tự chấm",
      bg: "rgba(239, 68, 68, 0.1)",
      fg: COLORS.scoreRed,
      icon: "person",
    };
  return {
    label: "Chưa xác thực",
    bg: "rgba(148, 163, 184, 0.1)",
    fg: COLORS.scoreGrey,
    icon: "alert-circle",
  };
};

const hasAnyScore = (r) =>
  [r?.single, r?.double, r?.mix, r?.points].some((v) => Number(v) > 0);

const getLatestScoreActivityAt = (r) => {
  const dates = [
    r?.lastFinishedTourAt,
    r?.lastAssessmentAt,
    r?.lastStaffAssessmentAt,
    r?.lastUpdated,
    r?.updatedAt,
  ]
    .map((v) => (v ? new Date(v) : null))
    .filter((d) => d && Number.isFinite(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return dates[0] || null;
};

const isScoreStale = (r) => {
  if (!hasAnyScore(r)) return false;
  const latest = getLatestScoreActivityAt(r);
  if (!latest) return true;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - SCORE_STALE_MONTHS);
  return latest.getTime() < cutoff.getTime();
};

const getScoreColor = (r, theme) => {
  if (!hasAnyScore(r)) return COLORS.scoreGrey;
  if (isScoreStale(r)) return COLORS.scoreRed;
  const totalTours = Number(r?.totalTours || r?.totalFinishedTours || 0);
  if (totalTours >= 3 || r?.tierColor === "blue") {
    return theme.primary || COLORS.scoreBlue;
  }
  if (totalTours > 0 || r?.hasStaffAssessment || r?.tierColor === "yellow") {
    return COLORS.gold;
  }
  if (r?.tierColor === "red") return COLORS.scoreRed;
  return COLORS.scoreGrey;
};

const toneOfAchievement = (tone) =>
  ACHIEVEMENT_TONES[String(tone || "").toLowerCase()] || ACHIEVEMENT_TONES.grey;

const iconOfAchievement = (item = {}) => {
  const id = String(item.id || "").toLowerCase();
  const category = String(item.category || "").toLowerCase();
  const tone = String(item.tone || "").toLowerCase();
  if (id.includes("gold") || id.includes("champion") || tone === "yellow")
    return "trophy";
  if (id.includes("silver")) return "medal";
  if (id.includes("bronze") || tone === "bronze") return "medal-outline";
  if (id.includes("kyc") || category.includes("xác thực"))
    return "shield-checkmark";
  if (id.includes("tour") || category.includes("thi đấu")) return "flag";
  if (id.includes("score") || category.includes("điểm")) return "speedometer";
  if (tone === "red") return "alert-circle";
  return "sparkles";
};

const normalizeRankingAchievements = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item, index) => ({
      id: String(item?.id || item?._id || `achievement-${index}`),
      label: String(item?.label || item?.title || "").trim(),
      category: String(item?.category || "Chip nổi bật").trim(),
      explain: String(item?.explain || item?.description || "").trim(),
      tone: String(item?.tone || item?.color || "grey").toLowerCase(),
      effect: String(item?.effect || item?.tone || "glow").toLowerCase(),
    }))
    .filter((item) => item.label);

const buildFallbackAchievements = ({ ranking, user, status, podium }) => {
  const out = [];
  const rank = Number(ranking?.globalRank || ranking?.rank || 0);
  const totalTours = Number(
    ranking?.totalTours || ranking?.totalFinishedTours || 0
  );

  if (Number.isFinite(rank) && rank > 0 && rank <= 10) {
    out.push({
      id: "global-top",
      label: rank === 1 ? "Top 1" : `Top ${rank}`,
      category: "Thứ hạng",
      explain: `Đang nằm trong top ${rank} toàn bảng.`,
      tone: rank === 1 ? "yellow" : "blue",
    });
  }
  if (podium?.medal) {
    out.push({
      id: `podium-${podium.medal}`,
      label: medalLabel(podium.medal),
      category: "Huy chương",
      explain: podium.label || "Có thành tích podium gần đây.",
      tone:
        podium.medal === "gold"
          ? "yellow"
          : podium.medal === "bronze"
          ? "bronze"
          : "grey",
    });
  }
  if (status === "verified") {
    out.push({
      id: "kyc-verified",
      label: "Đã KYC",
      category: "Xác thực hồ sơ",
      explain: "Hồ sơ định danh đã được xác thực.",
      tone: "green",
    });
  }
  if (totalTours >= 1) {
    out.push({
      id: `tour-count-${totalTours}`,
      label: totalTours === 1 ? "Đã thi đấu" : `+${totalTours} giải`,
      category: "Kinh nghiệm thi đấu",
      explain: `Đã ghi nhận ${totalTours} giải đã hoàn tất trong dữ liệu ranking.`,
      tone: totalTours >= 10 ? "navy" : "cyan",
    });
  }
  if (hasAnyScore(ranking) && isScoreStale(ranking)) {
    out.push({
      id: "needs-review",
      label: "Cần chấm lại",
      category: "Độ mới điểm",
      explain: "Điểm có dấu hiệu cũ, nên cập nhật hoặc chấm lại.",
      tone: "red",
    });
  }
  if (!hasAnyScore(ranking)) {
    out.push({
      id: "no-score",
      label: "Chưa có điểm",
      category: "Điểm trình",
      explain: "Chưa có điểm đơn, đôi, mix hoặc điểm tích lũy.",
      tone: "grey",
    });
  }

  return out.filter((item) => item.label);
};

const buildMobileAchievements = ({ ranking, user, status, podium }) => {
  const backend = normalizeRankingAchievements(ranking?.achievements);
  if (backend.length) return backend;
  return buildFallbackAchievements({ ranking, user, status, podium });
};

const glassScheme = (theme) => (theme.isDark ? "dark" : "light");
const glassSurfaceTint = (theme, light = 0.58, dark = 0.58) =>
  theme.isDark
    ? `rgba(15, 17, 21, ${dark})`
    : `rgba(255, 255, 255, ${light})`;
const glassAccentTint = (color, alpha = 0.22) =>
  `${String(color || "#2563EB")}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;

/* ================= ViewModeToggle (Optimized) ================= */
const ViewModeToggle = memo(({ mode, onToggle, theme }) => {
  // Local state để animation chạy tức thì
  const [localMode, setLocalMode] = useState(mode);
  const animValue = useRef(new Animated.Value(mode === "list" ? 0 : 1)).current;

  // Sync nếu props mode thay đổi từ bên ngoài
  useEffect(() => {
    if (mode !== localMode) {
      animateSwitch(mode);
    }
  }, [mode]);

  const animateSwitch = (targetMode) => {
    setLocalMode(targetMode);
    Animated.spring(animValue, {
      toValue: targetMode === "list" ? 0 : 1,
      useNativeDriver: true,
      tension: 140,
      friction: 12,
    }).start();
  };

  const handlePress = (targetMode) => {
    if (localMode === targetMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 1. Chạy Animation UI ngay lập tức
    animateSwitch(targetMode);

    // 2. Đẩy việc update state nặng ra sau khi tương tác xong
    InteractionManager.runAfterInteractions(() => {
      onToggle(targetMode);
    });
  };

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 32],
  });

  return (
    <AppleLiquidGlassView
      fallback="view"
      glassColorScheme={glassScheme(theme)}
      glassEffectStyle="regular"
      glassTintColor={glassSurfaceTint(theme, 0.52, 0.5)}
      isInteractive
      style={[
        styles.toggleContainer,
        { backgroundColor: theme.inputBg, borderColor: theme.border },
        IOS_26_LIQUID_GLASS_ENABLED && styles.glassControl,
      ]}
    >
      <Animated.View
        style={[
          styles.toggleIndicator,
          {
            backgroundColor: glassAccentTint(theme.primary, 0.18),
            borderColor: theme.primary,
            borderWidth: 1,
            transform: [{ translateX }],
          },
        ]}
      />
      <Pressable
        style={styles.toggleBtn}
        onPress={() => handlePress("list")}
        hitSlop={8}
      >
        <Ionicons
          name="list"
          size={18}
          color={
            localMode === "list" ? theme.primary : theme.subText
          }
        />
      </Pressable>
      <Pressable
        style={styles.toggleBtn}
        onPress={() => handlePress("chart")}
        hitSlop={8}
      >
        <Ionicons
          name="analytics"
          size={18}
          color={
            localMode === "chart" ? theme.primary : theme.subText
          }
        />
      </Pressable>
    </AppleLiquidGlassView>
  );
});
ViewModeToggle.displayName = "ViewModeToggle";

/* ================= Sub-Components ================= */
const InfoTag = memo(({ icon, text, theme }) => (
  <AppleLiquidGlassView
    fallback="view"
    glassColorScheme={glassScheme(theme)}
    glassEffectStyle="clear"
    glassTintColor={glassSurfaceTint(theme, 0.4, 0.42)}
    style={[
      styles.infoTag,
      { backgroundColor: theme.inputBg, borderColor: theme.border },
      IOS_26_LIQUID_GLASS_ENABLED && styles.glassChip,
    ]}
  >
    {icon && (
      <Ionicons
        name={icon}
        size={12}
        color={theme.subText}
        style={{ marginRight: 4 }}
      />
    )}
    <Text style={[styles.infoTagText, { color: theme.text }]}>{text}</Text>
  </AppleLiquidGlassView>
));
InfoTag.displayName = "InfoTag";

const AchievementChip = memo(({ item, theme, onPress, compact = false }) => {
  const tone = toneOfAchievement(item?.tone);
  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress}>
      <LinearGradient
        colors={[tone.bg, tone.border]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.achievementChip,
          compact && styles.achievementChipCompact,
          { borderColor: tone.border, shadowColor: tone.bg },
        ]}
      >
        <Ionicons
          name={iconOfAchievement(item)}
          size={compact ? 12 : 13}
          color={tone.fg}
          style={{ marginRight: 4 }}
        />
        <Text
          style={[styles.achievementChipText, { color: tone.fg }]}
          numberOfLines={1}
        >
          {item?.label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
});
AchievementChip.displayName = "AchievementChip";

const AchievementSummary = memo(({ achievements, theme, onOpen }) => {
  if (!Array.isArray(achievements) || achievements.length === 0) return null;
  const visible = achievements.slice(0, ACHIEVEMENT_VISIBLE_LIMIT);
  const hiddenCount = Math.max(0, achievements.length - visible.length);

  return (
    <View style={styles.achievementRow}>
      {visible.map((item) => (
        <AchievementChip
          key={item.id}
          item={item}
          theme={theme}
          onPress={onOpen}
          compact
        />
      ))}
      {hiddenCount > 0 && (
        <TouchableOpacity activeOpacity={0.86} onPress={onOpen}>
          <View
            style={[
              styles.achievementMoreChip,
              { backgroundColor: theme.inputBg, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.achievementMoreText, { color: theme.text }]}>
              +{hiddenCount}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
});
AchievementSummary.displayName = "AchievementSummary";

const shortTourName = (name) => String(name || "").split(" • ")[0].trim();

// Thẻ "Chúc mừng" dạng viên dẹp: avatar tròn nhỏ của VĐV (chồng nhau) + huy chương + 1 dòng chữ.
const PodiumCelebrationItem = memo(({ item, theme, onPress }) => {
  const meta = PODIUM_MARQUEE_META[item?.medal] || PODIUM_MARQUEE_META.gold;
  const players = (Array.isArray(item?.players) ? item.players : []).slice(0, 2);
  const teamName = item?.teamName || String(item?.teamLabel || "").replace(/^đội\s+/i, "");
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={() => onPress?.(item)}>
      <View
        style={[
          styles.podiumMarqueeItem,
          {
            borderColor: meta.glow,
            backgroundColor: theme.isDark ? "rgba(15,23,42,0.86)" : "#FFFFFF",
          },
        ]}
      >
        <View style={styles.podiumAvatars}>
          {players.length ? (
            players.map((p, i) => (
              <View
                key={i}
                style={[
                  styles.podiumAvatar,
                  { borderColor: meta.accent, marginLeft: i ? -9 : 0, zIndex: 2 - i, backgroundColor: theme.isDark ? "#1e293b" : "#E2E8F0" },
                ]}
              >
                {p?.avatar ? (
                  <ExpoImage source={{ uri: normalizeUrl(p.avatar) }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                  <Text style={{ color: theme.isDark ? "#cbd5e1" : "#475569", fontSize: 11, fontWeight: "900" }}>
                    {String(p?.name || "?").trim().charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
            ))
          ) : null}
          <LinearGradient colors={meta.colors} style={[styles.podiumMedalBadge, players.length ? null : { position: "relative", right: 0, bottom: 0, width: 26, height: 26, borderRadius: 13 }]}>
            <MaterialCommunityIcons name={meta.icon} size={players.length ? 10 : 15} color={meta.text} />
          </LinearGradient>
        </View>
        <Text style={[styles.podiumMessage, { color: theme.isDark ? "#fff" : "#0B1B3A" }]}>
          <Text style={{ color: theme.isDark ? meta.accent : "#B45309", fontWeight: "900" }}>{meta.label}</Text>
          {"  "}
          {teamName}
          <Text style={{ color: theme.isDark ? "#94A3B8" : "#64748B", fontWeight: "600" }}>{`  ·  ${shortTourName(item?.tournamentName)}`}</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
});
PodiumCelebrationItem.displayName = "PodiumCelebrationItem";

const PodiumCelebrationMarquee = memo(({ items = [], theme, onPressItem }) => {
  const base = useMemo(
    () =>
      (Array.isArray(items) ? items : []).filter(
        (item) => item?.teamLabel && item?.tournamentName && item?.medal
      ),
    [items]
  );
  const group = useMemo(() => {
    if (!base.length) return [];
    const repeat = Math.max(2, Math.ceil(8 / base.length));
    return Array.from({ length: repeat }, () => base).flat();
  }, [base]);
  const translateX = useRef(new Animated.Value(0)).current;
  // Thẻ rộng theo nội dung (hiện đủ tên) → đo chiều rộng track (2 bản lặp), chạy đúng nửa.
  const [trackW, setTrackW] = useState(0);

  useEffect(() => {
    if (!group.length || !trackW) return undefined;
    const distance = trackW / 2;
    translateX.setValue(0);
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: -distance,
        duration: Math.max(20000, (distance / 45) * 1000), // ~45px/giây
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [group.length, trackW, translateX]);

  if (!base.length) return null;

  return (
    <View style={styles.podiumMarqueeWrap}>
      {/* ScrollView ngang (khoá cuộn) để thẻ không bị bó theo bề ngang màn hình → hiện đủ tên. */}
      <ScrollView horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: "center" }}>
      <Animated.View
        style={[
          styles.podiumMarqueeTrack,
          { transform: [{ translateX }] },
        ]}
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w && Math.abs(w - trackW) > 2) setTrackW(w);
        }}
      >
        {[...group, ...group].map((item, index) => (
          <PodiumCelebrationItem
            key={`${item?.id || item?.teamLabel}-${index}`}
            item={item}
            theme={theme}
            onPress={onPressItem}
          />
        ))}
      </Animated.View>
      </ScrollView>
      <View
        pointerEvents="none"
        style={[
          styles.podiumMarqueeFadeLeft,
          { backgroundColor: theme.bg },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.podiumMarqueeFadeRight,
          { backgroundColor: theme.bg },
        ]}
      />
    </View>
  );
});
PodiumCelebrationMarquee.displayName = "PodiumCelebrationMarquee";

/* ================= Bục vinh quang Top 3 + dòng xếp hạng gọn (mockup docs/mockups/bxh-bucvinh-v2-A/B.png) ================= */
// Tông sáng = A2, tông tối = B2 (sk(tối, sáng)).
const PODIUM_TONE = {
  1: {
    ring: ["#FFF6C2", "#F7C948", "#C98A0B"],
    score: sk("#FFC83D", "#D18B00"),
    block: sk(["#3B2C08", "#151106"], ["#FFF6D6", "#FBE3A1"]),
    edge: sk("rgba(255,200,61,0.75)", "rgba(217,154,6,0.45)"),
    num: sk("#FFD45E", "#E2A10C"),
    glow: "rgba(255,196,40,0.55)",
  },
  2: {
    ring: ["#FFFFFF", "#CBD5E1", "#8A9BB0"],
    score: sk("#E2E8F0", "#1E3A6E"),
    block: sk(["#1F2C3F", "#0C1522"], ["#F8FAFC", "#E2E8F0"]),
    edge: sk("rgba(203,213,225,0.6)", "rgba(100,116,139,0.35)"),
    num: sk("#E2E8F0", "#94A3B8"),
    glow: "rgba(203,213,225,0.45)",
  },
  3: {
    ring: ["#FFE1C2", "#F09A57", "#A8521E"],
    score: sk("#FF9F5A", "#B5541A"),
    block: sk(["#3A1F0E", "#170C06"], ["#FFF1E6", "#F8D2B4"]),
    edge: sk("rgba(255,159,90,0.6)", "rgba(181,84,26,0.35)"),
    num: sk("#FFAA6B", "#C8682C"),
    glow: "rgba(240,154,87,0.45)",
  },
};
const PODIUM_BLOCK_H = { 1: 92, 2: 68, 3: 56 };

const PodiumColumn = memo(({ r, place, scoreType, onPress }: any) => {
  const tone = PODIUM_TONE[place];
  const u = r?.user || {};
  const big = place === 1;
  const size = big ? 86 : 66;
  const score = scoreType === "single" ? r?.single : r?.double;
  return (
    <Pressable onPress={() => onPress?.(r)} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
      {big ? <MaterialCommunityIcons name="crown" size={30} color="#F7C948" style={{ marginBottom: -4 }} /> : null}
      <View style={{ shadowColor: tone.glow, shadowOpacity: 1, shadowRadius: big ? 18 : 10, shadowOffset: { width: 0, height: 0 } }}>
        <LinearGradient colors={tone.ring} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: sk("#0B1B33", "#E2E8F0") }}>
            <ExpoImage source={{ uri: normalizeUrl(u?.avatar) || PLACE }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
          </View>
        </LinearGradient>
        <LinearGradient colors={tone.ring} style={[styles.podiumRankDot, big && { width: 26, height: 26, borderRadius: 13 }]}>
          <Text style={{ color: place === 2 ? "#334155" : "#3B1D00", fontWeight: "900", fontSize: big ? 14 : 12 }}>{place}</Text>
        </LinearGradient>
      </View>
      <View style={{ alignItems: "center", marginTop: 8, paddingHorizontal: 2, maxWidth: "100%" }}>
        <PlayerNameText user={u} name={u?.nickname || "---"} style={[styles.podiumName, big && { fontSize: 16 }]} numberOfLines={1} />
        {u?.province ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: 1 }}>
            <Ionicons name="location" size={11} color={sk("#8FB8DE", "#5F6F8A")} />
            <Text style={styles.podiumProvince} numberOfLines={1}>{u.province}</Text>
          </View>
        ) : null}
        <Text style={[styles.podiumScore, { color: tone.score }, big && { fontSize: 24 }]}>{fmt3(score)}</Text>
      </View>
      <LinearGradient
        colors={tone.block}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.podiumBlock, { height: PODIUM_BLOCK_H[place], borderColor: tone.edge }]}
      >
        <Text style={[styles.podiumBlockNum, { color: tone.num }, big && { fontSize: 44 }]}>{place}</Text>
      </LinearGradient>
    </Pressable>
  );
});
PodiumColumn.displayName = "PodiumColumn";

const RankingPodium = memo(({ items, scoreType, onPress }: any) => {
  if (!Array.isArray(items) || items.length < 3) return null;
  return (
    <View style={styles.podiumStage}>
      <LinearGradient
        pointerEvents="none"
        colors={sk(["rgba(8,205,245,0)", "rgba(8,205,245,0.07)", "rgba(8,205,245,0)"], ["rgba(120,150,255,0)", "rgba(120,150,255,0.09)", "rgba(120,150,255,0)"])}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.podiumHalo}
      />
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <PodiumColumn r={items[1]} place={2} scoreType={scoreType} onPress={onPress} />
        <PodiumColumn r={items[0]} place={1} scoreType={scoreType} onPress={onPress} />
        <PodiumColumn r={items[2]} place={3} scoreType={scoreType} onPress={onPress} />
      </View>
      <View pointerEvents="none" style={styles.podiumFloor} />
    </View>
  );
});
RankingPodium.displayName = "RankingPodium";

const RankingRow = memo(({ r, rankNo, scoreType, isMe, expanded, onPress }: any) => {
  const u = r?.user || {};
  const kyc = u?.cccdStatus === "verified";
  const main = scoreType === "single" ? "single" : "double";
  return (
    <Pressable
      onPress={() => onPress?.(r)}
      style={({ pressed }) => [styles.rankRow, isMe && styles.rankRowMe, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.rankNoBox, isMe && { backgroundColor: sk("rgba(8,205,245,0.18)", "#E7F9B8") }]}>
        <Text style={styles.rankNoText}>{rankNo}</Text>
      </View>
      <View style={styles.rankAvatar}>
        <ExpoImage source={{ uri: normalizeUrl(u?.avatar) || PLACE }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <PlayerNameText user={u} name={isMe ? `Bạn · ${u?.nickname || ""}` : u?.nickname || "---"} style={styles.rankName} numberOfLines={1} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          {u?.province ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2, flexShrink: 1 }}>
              <Ionicons name="location" size={11} color={sk("#8FB8DE", "#5F6F8A")} />
              <Text style={styles.rankProvince} numberOfLines={1}>{u.province}</Text>
            </View>
          ) : null}
          {kyc ? (
            <View style={styles.rankKyc}>
              <Ionicons name="checkmark-circle" size={11} color="#16A34A" />
              <Text style={styles.rankKycText}>KYC</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.rankScores}>
        {(["double", "single"] as const).map((k) => (
          <View key={k} style={{ alignItems: "center", minWidth: 48 }}>
            <Text style={styles.rankScoreLabel}>{k === "double" ? "Đôi" : "Đơn"}</Text>
            <Text style={[styles.rankScore, k === main ? styles.rankScoreMain : null]}>{fmt3(r?.[k])}</Text>
          </View>
        ))}
      </View>
      <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={sk("#8FA8C7", "#94A3B8")} />
    </Pressable>
  );
});
RankingRow.displayName = "RankingRow";

const AchievementsBottomSheet = memo(
  ({ sheetRef, state, theme, onDismiss }) => {
    const renderBackdrop = useCallback(
      (props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      ),
      []
    );
    const achievements = state?.achievements || [];
    const user = state?.user || {};
    const displayName = user?.nickname || user?.name || "--";

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={["42%", "78%"]}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.card }}
        handleIndicatorStyle={{ backgroundColor: theme.subText }}
        onDismiss={onDismiss}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.achievementSheetContent,
            { backgroundColor: theme.card },
          ]}
        >
          <View style={styles.achievementSheetHeader}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[styles.achievementSheetTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                Chip nổi bật - {displayName}
              </Text>
              <Text style={[styles.achievementSheetSub, { color: theme.subText }]}>
                {achievements.length} chip nổi bật đã được chọn lọc
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => sheetRef.current?.dismiss?.()}
              hitSlop={10}
            >
              <Ionicons name="close" size={22} color={theme.subText} />
            </TouchableOpacity>
          </View>

          {achievements.length ? (
            achievements.map((item) => {
              const tone = toneOfAchievement(item?.tone);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.achievementSheetRow,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.inputBg,
                    },
                  ]}
                >
                  <AchievementChip item={item} theme={theme} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        styles.achievementCategory,
                        { color: tone.border },
                      ]}
                    >
                      {item.category}
                    </Text>
                    <Text
                      style={[
                        styles.achievementExplain,
                        { color: theme.subText },
                      ]}
                    >
                      {item.explain || "Chip nổi bật trên bảng xếp hạng."}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={[styles.achievementExplain, { color: theme.subText }]}>
              Chưa có chip nổi bật phù hợp.
            </Text>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);
AchievementsBottomSheet.displayName = "AchievementsBottomSheet";

const ScoreBlock = memo(({ label, score, color, theme }) => (
  <AppleLiquidGlassView
    fallback="view"
    glassColorScheme={glassScheme(theme)}
    glassEffectStyle="regular"
    glassTintColor={glassSurfaceTint(theme, 0.44, 0.44)}
    style={[
      styles.scoreBlock,
      { backgroundColor: theme.inputBg, borderColor: theme.border },
      IOS_26_LIQUID_GLASS_ENABLED && styles.glassScoreBlock,
    ]}
  >
    <Text style={[styles.scoreLabel, { color: theme.subText }]}>{label}</Text>
    <Text style={[styles.scoreValue, { color: color || theme.text }]}>
      {score}
    </Text>
  </AppleLiquidGlassView>
));
ScoreBlock.displayName = "ScoreBlock";

const LiquidGlassBackdrop = memo(({ theme, active = true }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const liquidGlassEnabled = useLiquidGlassEnabled();

  useEffect(() => {
    if (!IOS_26_LIQUID_GLASS_ENABLED || !liquidGlassEnabled || !active) {
      anim.stopAnimation();
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 2600,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 2600,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, anim, liquidGlassEnabled]);

  if (!IOS_26_LIQUID_GLASS_ENABLED || !liquidGlassEnabled) return null;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 16],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.48],
  });

  return (
    <View pointerEvents="none" style={styles.ambientBackdrop}>
      <Animated.View
        style={[
          styles.ambientBand,
          {
            backgroundColor: theme.isDark
              ? "rgba(59,130,246,0.18)"
              : "rgba(37,99,235,0.14)",
            opacity,
            transform: [{ translateY }, { rotate: "-8deg" }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ambientBand,
          styles.ambientBandAlt,
          {
            backgroundColor: theme.isDark
              ? "rgba(245,158,11,0.12)"
              : "rgba(245,158,11,0.1)",
            opacity,
            transform: [{ translateY }, { rotate: "7deg" }],
          },
        ]}
      />
    </View>
  );
});
LiquidGlassBackdrop.displayName = "LiquidGlassBackdrop";

/* ================= Skeletons & Cards ================= */
const SkeletonCard = memo(() => {
  const theme = useThemeColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const bg = theme.isDark ? "#2a2d36" : "#e1e4e8";
  return (
    <AppleLiquidGlassView
      fallback="view"
      glassColorScheme={glassScheme(theme)}
      glassEffectStyle="regular"
      glassTintColor={glassSurfaceTint(theme, 0.58, 0.56)}
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: IOS_26_LIQUID_GLASS_ENABLED ? 1 : 0,
          elevation: 0,
        },
        IOS_26_LIQUID_GLASS_ENABLED && styles.glassCard,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Animated.View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: bg,
            opacity,
          }}
        />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Animated.View
            style={{
              width: "60%",
              height: 20,
              backgroundColor: bg,
              marginBottom: 8,
              borderRadius: 4,
              opacity,
            }}
          />
          <Animated.View
            style={{
              width: "40%",
              height: 14,
              backgroundColor: bg,
              borderRadius: 4,
              opacity,
            }}
          />
        </View>
      </View>
      <View style={{ marginTop: 20, flexDirection: "row", gap: 10 }}>
        <Animated.View
          style={{
            flex: 1,
            height: 60,
            backgroundColor: bg,
            borderRadius: 12,
            opacity,
          }}
        />
        <Animated.View
          style={{
            flex: 1,
            height: 60,
            backgroundColor: bg,
            borderRadius: 12,
            opacity,
          }}
        />
      </View>
    </AppleLiquidGlassView>
  );
});
SkeletonCard.displayName = "SkeletonCard";

const FlameCard = memo(({ medal, theme, children }) => {
  if (!medal) {
    return (
      <AppleLiquidGlassView
        fallback="view"
        glassColorScheme={glassScheme(theme)}
        glassEffectStyle="regular"
        glassTintColor={glassSurfaceTint(theme, 0.58, 0.56)}
        isInteractive
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
            shadowColor: theme.shadow,
          },
          IOS_26_LIQUID_GLASS_ENABLED && styles.glassCard,
        ]}
      >
        {children}
      </AppleLiquidGlassView>
    );
  }
  return (
    <FlameCardAnimated medal={medal} theme={theme}>
      {children}
    </FlameCardAnimated>
  );
});
FlameCard.displayName = "FlameCard";

const FlameCardAnimated = memo(({ medal, theme, children }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const { border, glow1, glow2 } = getMedalColors(medal);
  const op1 = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.35],
  });
  const op2 = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.25],
  });
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  });

  return (
    <View style={styles.flameCardWrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.cardFlameGlow,
          { backgroundColor: glow1, opacity: op1, transform: [{ scale }] },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.cardFlameGlow, { backgroundColor: glow2, opacity: op2 }]}
      />
      <AppleLiquidGlassView
        fallback="view"
        glassColorScheme={glassScheme(theme)}
        glassEffectStyle="regular"
        glassTintColor={glassSurfaceTint(theme, 0.6, 0.58)}
        isInteractive
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: border,
            borderWidth: 1.5,
            shadowColor: theme.shadow,
          },
          IOS_26_LIQUID_GLASS_ENABLED && styles.glassMedalCard,
        ]}
      >
        {children}
      </AppleLiquidGlassView>
    </View>
  );
});
FlameCardAnimated.displayName = "FlameCardAnimated";

const FlameAvatar = memo(({ uri, medal, theme, onPress }) => {
  if (!medal) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <AppleLiquidGlassView
          fallback="view"
          glassColorScheme={glassScheme(theme)}
          glassEffectStyle="clear"
          glassTintColor={glassSurfaceTint(theme, 0.36, 0.4)}
          style={[
            styles.avatarRingPlain,
            { borderColor: theme.border, backgroundColor: theme.card },
            IOS_26_LIQUID_GLASS_ENABLED && styles.glassAvatarRing,
          ]}
        >
          <ExpoImage
            source={normalizeUrl(uri) || PLACE}
            style={styles.avatarImg}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        </AppleLiquidGlassView>
      </TouchableOpacity>
    );
  }
  return (
    <FlameAvatarAnimated
      uri={uri}
      medal={medal}
      theme={theme}
      onPress={onPress}
    />
  );
});
FlameAvatar.displayName = "FlameAvatar";

const FlameAvatarAnimated = memo(({ uri, medal, theme, onPress }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const { border, glow1, glow2 } = getMedalColors(medal);
  const scale1 = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });
  const scale2 = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.02, 1.1],
  });
  const op1 = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });
  const op2 = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.45],
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View style={styles.flameAvatarWrap}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flameGlow,
            {
              backgroundColor: glow1,
              opacity: op1,
              transform: [{ scale: scale1 }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flameGlow,
            {
              backgroundColor: glow2,
              opacity: op2,
              transform: [{ scale: scale2 }],
            },
          ]}
        />
        <AppleLiquidGlassView
          fallback="view"
          glassColorScheme={glassScheme(theme)}
          glassEffectStyle="regular"
          glassTintColor={glassSurfaceTint(theme, 0.42, 0.42)}
          style={[
            styles.avatarRing,
            { borderColor: border, backgroundColor: theme.card },
            IOS_26_LIQUID_GLASS_ENABLED && styles.glassAvatarRing,
          ]}
        >
          <ExpoImage
            source={normalizeUrl(uri) || PLACE}
            style={styles.avatarImg}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        </AppleLiquidGlassView>
      </View>
    </TouchableOpacity>
  );
});
FlameAvatarAnimated.displayName = "FlameAvatarAnimated";

const RankingCard = memo(
  ({
    item,
    rankNo,
    podium,
    position,
    scorePatch,
    cccdPatch,
    me,
    onOpenZoom,
    onOpenGrade,
    onOpenKyc,
    onGoToTournament,
    onOpenAchievements,
  }) => {
    const theme = useThemeColors();
    const [openDm] = useOpenDmMutation();
    const [sendFriend, { isLoading: sendingFriend }] =
      useSendFriendRequestMutation();
    const [acceptFriend, { isLoading: acceptingFriend }] =
      useAcceptFriendMutation();
    const [removeFriend, { isLoading: removingFriend }] =
      useRemoveFriendMutation();
    const r = item;
    const rankingUser = r?.user;
    const u = useMemo(() => rankingUser || {}, [rankingUser]);
    const isSelf = me?._id && u?._id && String(me._id) === String(u._id);
    const shouldQueryFriend = !!me?._id && !!u?._id && !isSelf;
    const { data: friendStatus } = useFriendStatusQuery(u?._id, {
      skip: !shouldQueryFriend,
    });
    const friendState = friendStatus?.status || "none";
    const friendEdgeId = (friendStatus as any)?.edgeId;
    const friendBusy = sendingFriend || acceptingFriend || removingFriend;

    // Cấu hình icon + label + màu tương ứng trạng thái kết bạn (kiểu Facebook).
    let friendIcon: any = "person-add-outline";
    let friendLabel = "Kết bạn";
    let friendColor = theme.text;
    let friendAction: (() => void) | null = null;
    if (friendState === "none" || friendState === "declined") {
      friendIcon = "person-add-outline";
      friendLabel = "Kết bạn";
      friendColor = theme.text;
      friendAction = async () => {
        if (!u?._id) return;
        try {
          await sendFriend(u._id).unwrap();
        } catch {}
      };
    } else if (friendState === "pending_outgoing") {
      friendIcon = "hourglass-outline";
      friendLabel = "Huỷ lời mời";
      friendColor = theme.subText;
      friendAction = async () => {
        if (!friendEdgeId) return;
        try {
          await removeFriend(friendEdgeId).unwrap();
        } catch {}
      };
    } else if (friendState === "pending_incoming") {
      friendIcon = "checkmark-circle-outline";
      friendLabel = "Chấp nhận";
      friendColor = "#10B981";
      friendAction = async () => {
        if (!friendEdgeId) return;
        try {
          await acceptFriend(friendEdgeId).unwrap();
        } catch {}
      };
    } else if (friendState === "accepted") {
      friendIcon = "people";
      friendLabel = "Bạn bè";
      friendColor = theme.primary;
      friendAction = async () => {
        if (!friendEdgeId) return;
        // Confirm huỷ kết bạn
        const { Alert } = await import("react-native");
        Alert.alert("Huỷ kết bạn?", undefined, [
          { text: "Huỷ", style: "cancel" },
          {
            text: "Huỷ kết bạn",
            style: "destructive",
            onPress: async () => {
              try {
                await removeFriend(friendEdgeId).unwrap();
              } catch {}
            },
          },
        ]);
      };
    }

    const handleOpenChat = async () => {
      if (!u?._id || isSelf) return;
      try {
        const conv = await openDm(u._id).unwrap();
        router.push(`/messages/${conv._id}`);
      } catch {}
    };
    const avatarSrc = u?.avatar || PLACE;
    // Màu huy chương theo THỨ HẠNG bảng (top 3 = vàng/bạc/đồng), ưu tiên podium nếu có.
    const displayMedal =
      podium?.medal ||
      (rankNo === 1
        ? "gold"
        : rankNo === 2
        ? "silver"
        : rankNo === 3
        ? "bronze"
        : null);
    const age = calcAge(u);

    const scoreColor = getScoreColor(r, theme);

    const sp = scorePatch[u?._id || ""] || {};
    const patched = {
      single: sp.single ?? r?.single,
      double: sp.double ?? r?.double,
    };

    const effectiveStatus = cccdPatch[u?._id] || u?.cccdStatus;
    const allowGrade = canGradeUser(me, u?.province);
    const allowKyc = canViewKycAdmin(me, effectiveStatus);
    const verifyChip = getVerifyChip(effectiveStatus, r?.tierColor);
    const achievements = useMemo(
      () =>
        buildMobileAchievements({
          ranking: r,
          user: u,
          status: effectiveStatus,
          podium,
        }),
      [r, u, effectiveStatus, podium]
    );
    const openAchievements = useCallback(() => {
      onOpenAchievements?.(u, achievements);
    }, [achievements, onOpenAchievements, u]);

    const playerActions: PlayerAction[] = [
      {
        key: "profile",
        label: "Hồ sơ",
        icon: "person-circle-outline",
        color: theme.primary,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/profile/${u?._id}`);
        },
      },
      ...(!isSelf && me?._id
        ? [
            {
              key: "message",
              label: "Nhắn tin",
              icon: "chatbubble-outline" as const,
              color: theme.primary,
              onPress: handleOpenChat,
            },
            {
              key: "friend",
              label: friendLabel,
              icon: friendIcon,
              color: friendColor,
              onPress: friendAction || undefined,
              disabled: friendBusy || !friendAction,
            },
          ]
        : []),
      ...(allowKyc
        ? [
            {
              key: "kyc",
              label: "KYC",
              icon: "shield-checkmark-outline" as const,
              color: theme.subText,
              onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onOpenKyc(u);
              },
            },
          ]
        : []),
    ];

    return (
      <PremiumRankingCard medal={displayMedal}>
        <View style={styles.premiumCardHeader}>
          <RankBadge rank={rankNo} medal={displayMedal} />
          <PlayerAvatar
            uri={avatarSrc}
            medal={displayMedal}
            onPress={() => onOpenZoom(avatarSrc)}
          />

          <View style={styles.premiumIdentity}>
            <View style={styles.premiumNameRow}>
            <PlayerNameText
              user={u}
              name={u?.nickname || "---"}
                style={styles.premiumNickname}
              numberOfLines={1}
            />
              {u?.phoneVerified ? (
                <Ionicons
                  name="checkmark-circle"
                  size={17}
                  color={RANKING_COLORS.primary}
                />
              ) : null}
            </View>
            {u?.province ? (
              <View style={styles.premiumLocationRow}>
                <Ionicons name="location" size={14} color={sk("#8FB8DE", "#5F6F8A")} />
                <Text style={styles.premiumProvince} numberOfLines={1}>
                  {u.province}
                </Text>
              </View>
            ) : null}
          </View>

          {allowGrade && (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onOpenGrade(u, r);
              }}
              hitSlop={10}
              style={styles.premiumGradeButton}
              accessibilityLabel="Chấm trình"
            >
              <Ionicons name="chevron-forward" size={20} color={sk("#D7E5F5", "#243450")} />
            </TouchableOpacity>
          )}
        </View>

        <PlayerBadges>
          {podium ? (
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => onGoToTournament(podium.picked)}
              style={[styles.premiumPodiumBadge, { borderColor: COLORS[podium.medal] }]}
            >
              <MaterialCommunityIcons name="trophy" size={13} color={COLORS[podium.medal]} />
              <Text style={[styles.premiumBadgeText, { color: COLORS[podium.medal] }]} numberOfLines={1}>
                {medalLabel(podium.medal)}
              </Text>
            </TouchableOpacity>
          ) : null}
          <View style={[styles.premiumStatusBadge, { borderColor: verifyChip.fg }]}>
            <Ionicons name={verifyChip.icon} size={12} color={verifyChip.fg} />
            <Text style={[styles.premiumBadgeText, { color: verifyChip.fg }]}>
              {verifyChip.label}
            </Text>
          </View>
          {age ? <InfoTag icon="calendar-outline" text={`${age} tuổi`} theme={theme} /> : null}
          <InfoTag icon={u?.gender === "female" ? "female" : "male"} text={genderLabel(u?.gender)} theme={theme} />
          {position?.label ? (
            <InfoTag icon="grid-outline" text={`Sở trường ${position.label}`} theme={theme} />
          ) : null}
        </PlayerBadges>

        <AchievementSummary achievements={achievements} theme={theme} onOpen={openAchievements} />

        <View style={styles.premiumScoreGrid}>
          <PlayerScore
            label="ĐIỂM ĐÔI"
            value={fmt3(patched.double)}
            color={scoreColor}
          />
          <View style={styles.premiumScoreDivider} />
          <PlayerScore
            label="ĐIỂM ĐƠN"
            value={fmt3(patched.single)}
            color={scoreColor}
          />
        </View>
        <PlayerActions actions={playerActions} />
      </PremiumRankingCard>
    );
  },
  (prev, next) => {
    return (
      prev.item === next.item &&
      prev.scorePatch === next.scorePatch &&
      prev.cccdPatch === next.cccdPatch &&
      prev.podium?.medal === next.podium?.medal &&
      prev.podium?.label === next.podium?.label &&
      // So REFERENCE (không chỉ role): nút Chấm trình/KYC còn phụ thuộc
      // me.evaluator.enabled + gradingScopes — chỉ so role sẽ nuốt update
      // của người chấm trình không phải admin.
      prev.me === next.me
    );
  }
);
RankingCard.displayName = "RankingCard";

/* ================= MEMOIZED VIEWS ================= */

// View List: Chỉ render lại khi data thay đổi
const MemoizedListView = memo(
  ({
    data,
    renderItem,
    header,
    footer,
    onLoadMore,
    isRefreshing,
    onRefresh,
    theme,
    scrollRef,
    wideStyle,
    numColumns,
    colWrap,
  }) => {
    const bottomPadding = useFloatingTabBarPadding(80);
    return (
      <RankingList
        ref={scrollRef}
        data={data}
        numColumns={numColumns}
        columnWrapperStyle={colWrap}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={[{ paddingBottom: bottomPadding }, wideStyle]}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListFooterComponent={footer}
      />
    );
  },
  (prev, next) => {
    return (
      prev.data === next.data &&
      prev.isRefreshing === next.isRefreshing &&
      prev.theme.isDark === next.theme.isDark &&
      prev.header === next.header &&
      // BẮT BUỘC so renderItem: closure chứa `me` (quyền admin/evaluator).
      // Thiếu dòng này thì khi me về muộn, list bị memo chặn re-render và
      // FlatList giữ renderItem cũ (me=undefined) → mất nút Chấm trình/KYC
      // cho tới khi kéo refresh làm data đổi.
      prev.renderItem === next.renderItem
    );
  }
);
MemoizedListView.displayName = "MemoizedListView";

// View Chart: Tách biệt
const MemoizedChartView = memo(
  ({ data, theme, onUserPress, onLoadMore, hasMore, isLoadingMore }) => {
    return (
      <RankingChart
        rankings={data}
        theme={theme}
        onUserPress={onUserPress}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
      />
    );
  }
);
MemoizedChartView.displayName = "MemoizedChartView";

/* ================= MAIN SCREEN ================= */
// ===== Lọc điểm trình theo range (thanh kéo) =====
const SCORE_MIN = 2.0;
const SCORE_MAX = 8.0;
const SCORE_TYPES: { value: "single" | "double"; label: string }[] = [
  { value: "single", label: "Đơn" },
  { value: "double", label: "Đôi" },
];

export default function RankingListScreen({ isBack = false }) {
  const bottomPadding = useFloatingTabBarPadding(40);
  const theme = useThemeColors();
  const rsp = useResponsive();
  // iPhone Duo mở (~669pt) / iPad: lưới nhiều cột để hiện nhiều VĐV cùng lúc thay vì 1
  // cột. Dựa trực tiếp vào bề rộng (foldable mở < ngưỡng isLarge=720 nhưng vẫn đủ rộng).
  const cols = rsp.width >= 1024 ? 3 : rsp.width >= 640 ? 2 : 1;
  const wideList: any =
    cols > 1
      ? { alignSelf: "center", width: "100%", maxWidth: cols >= 3 ? 1320 : 1040 }
      : rsp.isWide
      ? { maxWidth: rsp.contentMaxWidth, alignSelf: "center", width: "100%" }
      : null;
  const colWrap: any = cols > 1 ? { gap: 16, paddingHorizontal: 12 } : undefined;
  const dispatch = useDispatch();
  const router = useRouter();

  const { keyword = "" } = useSelector((s) => s?.rankingUi || {});
  const [kw, setKw] = useState(keyword || "");

  // UI State
  const [viewMode, setViewMode] = useState("list");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // ✅ STATE MỚI: Kiểm soát Lazy Loading Chart
  const [hasRenderedChart, setHasRenderedChart] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  // Pagination State
  const [page, setPage] = useState(0);

  // Lọc điểm trình
  const [scoreType, setScoreType] = useState<"single" | "double" | "mix">(
    "double",
  );
  const [range, setRange] = useState<[number, number]>([SCORE_MIN, SCORE_MAX]);
  const [liveRange, setLiveRange] = useState<[number, number]>([
    SCORE_MIN,
    SCORE_MAX,
  ]);
  // Lọc theo giới tính: all (Cả hai) | male (Nam) | female (Nữ)
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">(
    "all",
  );
  const [preferredFilter, setPreferredFilter] = useState<"" | "1" | "2">("");
  const [provinceFilter, setProvinceFilter] = useState<string>("");
  const [provincePickerOpen, setProvincePickerOpen] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState("");
  const rangeActive = range[0] > SCORE_MIN || range[1] < SCORE_MAX;
  const onScoreTypeChange = (v: "single" | "double" | "mix") => {
    setScoreType(v);
    setPage(0);
  };
  const commitRange = (v: [number, number]) => {
    setRange(v);
    setLiveRange(v);
    setPage(0);
  };
  const clearRange = () => {
    setRange([SCORE_MIN, SCORE_MAX]);
    setLiveRange([SCORE_MIN, SCORE_MAX]);
    setPage(0);
  };
  // Có bất kỳ bộ lọc nào đang bật (để tô sáng nút "Bộ lọc" kể cả khi popup đóng).
  const anyFilterActive =
    kw.trim() !== "" ||
    rangeActive ||
    genderFilter !== "all" ||
    preferredFilter !== "" ||
    provinceFilter !== "";
  // Xoá toàn bộ bộ lọc trong popup.
  const resetAllFilters = () => {
    setKw("");
    setRange([SCORE_MIN, SCORE_MAX]);
    setLiveRange([SCORE_MIN, SCORE_MAX]);
    setGenderFilter("all");
    setPreferredFilter("");
    setProvinceFilter("");
    setPage(0);
  };
  const [accumulatedList, setAccumulatedList] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  // API
  const {
    data: listData,
    isLoading: isLoadingList,
    isFetching: isFetchingList,
    error,
    refetch: refetchList,
  } = useGetRankingsListQuery({
    keyword,
    page,
    scoreType: rangeActive ? scoreType : undefined,
    minScore: rangeActive ? range[0] : undefined,
    maxScore: rangeActive ? range[1] : undefined,
    gender: genderFilter !== "all" ? genderFilter : undefined,
    province: provinceFilter || undefined,
    preferred: preferredFilter || undefined,
  });
  const { data: podiumData, refetch: refetchPodiums } =
    useGetRankingsPodiums30dQuery();
  // Vị trí sở trường ô 1/ô 2 cho các VĐV đang hiển thị
  const posUserIds = useMemo(
    () => accumulatedList.map((r) => r?.user?._id).filter(Boolean),
    [accumulatedList],
  );
  const { data: posByUser = {} } = useGetPlayerPositionsQuery(posUserIds, {
    skip: !posUserIds.length,
  });
  const {
    data: podiumAnnouncementData,
    refetch: refetchPodiumAnnouncements,
  } = useGetRankingsPodiumAnnouncementsQuery({ days: 7, limit: 36 });

  const scrollViewRef = useRef(null);
  useEffect(() => {
    const listener = DeviceEventEmitter.addListener(
      "SCROLL_TO_TOP",
      (tabName) => {
        if (tabName === "rankings") {
          scrollViewRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
      }
    );
    return () => listener.remove();
  }, []);

  // Data Logic
  useEffect(() => {
    if (listData?.docs) {
      if (page === 0) {
        setAccumulatedList(listData.docs);
      } else {
        setAccumulatedList((prev) => {
          const existingIds = new Set(prev.map((p) => p._id));
          const newDocs = listData.docs.filter((d) => !existingIds.has(d._id));
          return [...prev, ...newDocs];
        });
      }
      setHasMore(listData.page < listData.totalPages - 1);
    }
  }, [listData, page]);

  // ✅ LOGIC "Double Delay" để chống lag lần đầu mở Chart
  useEffect(() => {
    if (viewMode === "chart") {
      if (!hasRenderedChart) {
        setHasRenderedChart(true);
        // Delay 1: Chờ Animation nút bấm xong
        InteractionManager.runAfterInteractions(() => {
          // Delay 2: Nhường CPU vẽ UI 1 chút rồi mới vẽ Chart
          setTimeout(() => {
            setChartReady(true);
          }, 150);
        });
      }
    }
  }, [viewMode, hasRenderedChart]);

  // Debounce Search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      setHasMore(true);
      dispatch(setKeyword(kw.trim()));
    }, 400);
    return () => clearTimeout(t);
  }, [kw, dispatch]);

  const meQuery = useGetMeQuery(undefined, { refetchOnReconnect: true });
  const me = meQuery.data;
  // Tự hồi phục khi request `me` lỗi lúc khởi động (race token/mạng): tab được
  // giữ mount nên RTK Query không tự retry — không có nhánh này thì quyền
  // admin/evaluator mất tới khi user tự kéo refresh hoặc đăng nhập lại.
  useEffect(() => {
    if (!meQuery.isError || meQuery.isFetching) return undefined;
    const t = setTimeout(() => meQuery.refetch(), 1500);
    return () => clearTimeout(t);
  }, [meQuery.isError, meQuery.isFetching, meQuery.refetch]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const achievementSheetRef = useRef(null);
  const [achievementSheet, setAchievementSheet] = useState({
    open: false,
    user: null,
    achievements: [],
  });

  useEffect(() => {
    if (!achievementSheet.open) return undefined;
    const frame = requestAnimationFrame(() => {
      achievementSheetRef.current?.present?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [achievementSheet.open, achievementSheet.user?._id]);

  // Callbacks
  const openZoom = useCallback((src) => {
    if (src) {
      setViewerImages([{ uri: normalizeUrl(src) || PLACE }]);
      setViewerVisible(true);
    }
  }, []);

  const openGrade = useCallback(
    (u, r) => {
      if (!u?._id) return;
      const s = Number.isFinite(r?.single) ? r.single : u?.ratingSingle;
      const d = Number.isFinite(r?.double) ? r.double : u?.ratingDouble;
      router.push({
        pathname: `/user/${u._id}/grade`,
        params: {
          nickname: u?.nickname || "",
          province: u?.province || "",
          currentSingle: Number.isFinite(s) ? String(s) : "",
          currentDouble: Number.isFinite(d) ? String(d) : "",
        },
      });
    },
    [router]
  );

  const openKyc = useCallback(
    (u) => {
      if (u?._id) router.push(`/user/${u._id}/kyc`);
    },
    [router]
  );

  const openAchievements = useCallback((user, achievements) => {
    setAchievementSheet({
      open: true,
      user: user || null,
      achievements: Array.isArray(achievements) ? achievements : [],
    });
  }, []);

  const closeAchievements = useCallback(() => {
    setAchievementSheet({ open: false, user: null, achievements: [] });
  }, []);

  const goToTournament = useCallback(
    (t) => {
      if (!t) return;
      const id = t?.tournamentId || t?.tournament?._id || t?.tid || t?.id;
      const slug = t?.tournamentSlug || t?.slug;
      const name = t?.tournamentName || t?.name;
      if (id) return router.push(`/tournament/${id}/bracket`);
      if (slug) return router.push(`/tournament/${slug}/bracket`);
      if (name)
        return router.push({
          pathname: "/tournament",
          params: { query: name },
        });
      return router.push("/tournament");
    },
    [router]
  );

  const handleLoadMore = useCallback(() => {
    if (!isFetchingList && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [isFetchingList, hasMore]);

  const clearSearch = () => {
    setKw("");
    Keyboard.dismiss();
  };

  const handleChartUserPress = useCallback(
    (user) => {
      if (user?._id) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/profile/${user._id}`);
      }
    },
    [router]
  );

  // Memoized Data
  const podiumByUser = useMemo(() => {
    const src = podiumData?.podiums30d || podiumData || {};
    const rank = { gold: 3, silver: 2, bronze: 1 };
    const out = {};
    for (const [uid, arr] of Object.entries(src)) {
      if (!Array.isArray(arr) || !arr.length) continue;
      const picked = [...arr].sort((a, b) => {
        const r = (rank[b.medal] || 0) - (rank[a.medal] || 0);
        if (r) return r;
        const tb = new Date(b.finishedAt || 0).getTime();
        const ta = new Date(a.finishedAt || 0).getTime();
        return tb - ta;
      })[0];
      const plusN = Math.max(0, arr.length - 1);
      const title = `${medalLabel(picked.medal)} – ${
        picked.tournamentName || "Giải đấu"
      }${plusN > 0 ? ` (+${plusN} giải khác)` : ""}`;
      out[String(uid)] = { medal: picked.medal, label: title, picked };
    }
    return out;
  }, [podiumData]);

  const podiumAnnouncementItems = useMemo(() => {
    if (Array.isArray(podiumAnnouncementData)) return podiumAnnouncementData;
    return Array.isArray(podiumAnnouncementData?.items)
      ? podiumAnnouncementData.items
      : [];
  }, [podiumAnnouncementData]);

  // Bục vinh quang: top 3 lên bục (khi không tìm theo tên), danh sách gọn từ hạng 4; bấm 1 dòng để bung thẻ đầy đủ.
  const showPodium = !kw.trim() && accumulatedList.length >= 3;
  const podiumItems = useMemo(() => (showPodium ? accumulatedList.slice(0, 3) : []), [showPodium, accumulatedList]);
  const rowList = useMemo(() => (showPodium ? accumulatedList.slice(3) : accumulatedList), [showPodium, accumulatedList]);
  const rankOffset = showPodium ? 4 : 1;
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const rowKey = (r) => String(r?._id || r?.user?._id || "");
  const toggleRow = useCallback((r) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const k = String(r?._id || r?.user?._id || "");
    setExpandedKey((cur) => (cur === k ? null : k));
  }, []);
  const openPodiumProfile = useCallback(
    (r) => {
      if (!r?.user?._id) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/profile/${r.user._id}` as any);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item, index }) => {
      const open = expandedKey === rowKey(item);
      const isMe = !!me?._id && String(me._id) === String(item?.user?._id || "");
      return (
        <View>
          <RankingRow
            r={item}
            rankNo={index + rankOffset}
            scoreType={scoreType}
            isMe={isMe}
            expanded={open}
            onPress={toggleRow}
          />
          {open ? (
            <View style={{ marginBottom: 10 }}>
      <RankingCard
        item={item}
        rankNo={index + rankOffset}
        podium={podiumByUser[item?.user?._id]}
        position={posByUser[item?.user?._id]}
        scorePatch={{}}
        cccdPatch={{}}
        me={me}
        onOpenZoom={openZoom}
        onOpenGrade={openGrade}
        onOpenKyc={openKyc}
        onGoToTournament={goToTournament}
        onOpenAchievements={openAchievements}
      />
            </View>
          ) : null}
        </View>
      );
    },
    [
      expandedKey,
      rankOffset,
      scoreType,
      toggleRow,
      podiumByUser,
      posByUser,
      me,
      openZoom,
      openGrade,
      openKyc,
      goToTournament,
      openAchievements,
    ]
  );

  // Lưới nhiều cột (iPhone Duo mở / iPad): bọc mỗi thẻ flex:1, ô trống cho hàng cuối lẻ.
  const gridRenderItem = useCallback(
    (info: any) => {
      if (info?.item?.__spacer) return <View style={{ flex: 1 }} />;
      return cols > 1 ? <View style={{ flex: 1 }}>{renderItem(info)}</View> : renderItem(info);
    },
    [renderItem, cols]
  );
  const gridList = useMemo(() => {
    if (cols <= 1) return rowList;
    const rem = rowList.length % cols;
    if (rem === 0) return rowList;
    const pad = Array.from({ length: cols - rem }, (_, i) => ({ _id: `__sp-${i}`, __spacer: true }));
    return [...rowList, ...pad];
  }, [rowList, cols]);

  const initialLoading =
    isLoadingList ||
    (isFetchingList && page === 0 && accumulatedList.length === 0);

  const HeaderComponent = useMemo(
    () => (
      <View style={styles.listHeader}>
        <PodiumCelebrationMarquee
          items={podiumAnnouncementItems}
          theme={theme}
          onPressItem={goToTournament}
        />
        <RankingPodium items={podiumItems} scoreType={scoreType} onPress={openPodiumProfile} />
      </View>
    ),
    [goToTournament, podiumAnnouncementItems, theme, podiumItems, scoreType, openPodiumProfile]
  );

  const screenContent = (
    <RankingPage>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.headerArea}>
          <RankingHeader
            isBack={isBack}
            onBack={() => router.back()}
            rightAccessory={
              <ViewModeToggle
                mode={viewMode}
                onToggle={setViewMode}
                theme={theme}
              />
            }
          />
          <RankingFilters
            value={scoreType}
            options={SCORE_TYPES}
            expanded={filtersExpanded || anyFilterActive}
            onChange={onScoreTypeChange}
            onToggleFilters={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFiltersExpanded(true);
            }}
          />
          <Modal
            visible={filtersExpanded}
            animationType="slide"
            transparent
            onRequestClose={() => setFiltersExpanded(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
            >
              <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: "85%", paddingTop: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 }}>
                  <Text style={{ flex: 1, color: theme.text, fontSize: 16, fontWeight: "800" }}>Bộ lọc</Text>
                  <TouchableOpacity onPress={() => setFiltersExpanded(false)} hitSlop={10}>
                    <Ionicons name="close" size={24} color={theme.subText} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
                >
              {/* Tìm kiếm gom vào bộ lọc (chỉ hiện khi mở "Bộ lọc") */}
              <View style={{ marginBottom: 12 }}>
                <RankingSearch value={kw} onChangeText={setKw} onClear={clearSearch} />
              </View>
              <ScoreRange values={liveRange} active={rangeActive} onClear={clearRange}>
                <RangeSlider
                  min={SCORE_MIN}
                  max={SCORE_MAX}
                  step={0.1}
                  values={range}
                  onChange={setLiveRange}
                  onCommit={commitRange}
                  trackColor={sk("rgba(120,180,230,0.28)", "rgba(16,42,92,0.14)")}
                  activeColor={RANKING_COLORS.primary}
                  thumbColor={sk("#F4FBFF", "#FFFFFF")}
                  thumbBorder={RANKING_COLORS.primary}
                />
              </ScoreRange>
              {/* Lọc theo giới tính */}
              <View style={[styles.genderRow, { marginHorizontal: 0 }]}>
                <Text style={[styles.genderLabel, { color: theme.text }]}>
                  Giới tính
                </Text>
                <View style={styles.genderChips}>
                  {[
                    { v: "all", l: "Cả hai" },
                    { v: "male", l: "Nam" },
                    { v: "female", l: "Nữ" },
                  ].map((o) => {
                    const active = genderFilter === (o.v as any);
                    return (
                      <TouchableOpacity
                        key={o.v}
                        activeOpacity={0.85}
                        onPress={() => {
                          setGenderFilter(o.v as any);
                          setPage(0);
                        }}
                        style={[
                          styles.genderChip,
                          {
                            borderColor: active ? theme.primary : theme.border,
                            backgroundColor: active
                              ? theme.primary
                              : "transparent",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.genderChipText,
                            { color: active ? sk("#04121f", "#FFFFFF") : theme.subText },
                          ]}
                        >
                          {o.l}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Lọc theo vị trí sở trường (ô 1 / ô 2) */}
              <View style={[styles.genderRow, { marginHorizontal: 0 }]}>
                <Text style={[styles.genderLabel, { color: theme.text }]}>
                  Sở trường
                </Text>
                <View style={styles.genderChips}>
                  {[
                    { v: "", l: "Tất cả" },
                    { v: "1", l: "Ô 1" },
                    { v: "2", l: "Ô 2" },
                  ].map((o) => {
                    const active = preferredFilter === (o.v as any);
                    return (
                      <TouchableOpacity
                        key={o.v || "all"}
                        activeOpacity={0.85}
                        onPress={() => {
                          setPreferredFilter(o.v as any);
                          setPage(0);
                        }}
                        style={[
                          styles.genderChip,
                          {
                            borderColor: active ? theme.primary : theme.border,
                            backgroundColor: active ? theme.primary : "transparent",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.genderChipText,
                            { color: active ? sk("#04121f", "#FFFFFF") : theme.subText },
                          ]}
                        >
                          {o.l}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Lọc theo tỉnh/thành */}
              <View style={[styles.genderRow, { marginHorizontal: 0 }]}>
                <Text style={[styles.genderLabel, { color: theme.text }]}>
                  Tỉnh/thành
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setProvincePickerOpen(true)}
                  style={[
                    styles.genderChip,
                    {
                      borderColor: provinceFilter ? theme.primary : theme.border,
                      backgroundColor: provinceFilter ? theme.primary : "transparent",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    },
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={provinceFilter ? sk("#04121f", "#FFFFFF") : theme.subText}
                  />
                  <Text
                    style={[
                      styles.genderChipText,
                      { color: provinceFilter ? sk("#04121f", "#FFFFFF") : theme.subText },
                    ]}
                  >
                    {provinceFilter || "Tất cả"}
                  </Text>
                </TouchableOpacity>
                {provinceFilter ? (
                  <TouchableOpacity
                    onPress={() => {
                      setProvinceFilter("");
                      setPage(0);
                    }}
                    hitSlop={10}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.subText} />
                  </TouchableOpacity>
                ) : null}
              </View>
                </ScrollView>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    paddingHorizontal: 16,
                    paddingTop: 10,
                    paddingBottom: 20,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={resetAllFilters}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: "700" }}>Xoá lọc</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setFiltersExpanded(false)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: theme.primary,
                    }}
                  >
                    <Text style={{ color: sk("#04121f", "#FFFFFF"), fontWeight: "800" }}>Xong</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </View>
      </TouchableWithoutFeedback>

      {/* Modal chọn tỉnh/thành */}
      <Modal
        visible={provincePickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setProvincePickerOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: "80%", paddingTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 }}>
              <Text style={{ flex: 1, color: theme.text, fontSize: 16, fontWeight: "800" }}>Chọn tỉnh/thành</Text>
              <TouchableOpacity onPress={() => setProvincePickerOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.subText} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border }}>
              <Ionicons name="search" size={16} color={theme.subText} />
              <TextInput
                value={provinceSearch}
                onChangeText={setProvinceSearch}
                placeholder="Tìm tỉnh/thành…"
                placeholderTextColor={theme.subText}
                style={{ flex: 1, color: theme.text, paddingVertical: 8 }}
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ paddingHorizontal: 8 }}>
              {["", ...VN_PROVINCES]
                .filter((p) =>
                  !provinceSearch
                    ? true
                    : p === ""
                      ? false
                      : p
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[̀-ͯ]/g, "")
                          .includes(
                            provinceSearch
                              .toLowerCase()
                              .normalize("NFD")
                              .replace(/[̀-ͯ]/g, ""),
                          ),
                )
                .map((p) => (
                  <TouchableOpacity
                    key={p || "all"}
                    onPress={() => {
                      setProvinceFilter(p);
                      setPage(0);
                      setProvincePickerOpen(false);
                      setProvinceSearch("");
                    }}
                    style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
                  >
                    <Text style={{ color: provinceFilter === p ? theme.primary : theme.text, fontWeight: provinceFilter === p ? "800" : "500" }}>
                      {p || "Tất cả tỉnh/thành"}
                    </Text>
                  </TouchableOpacity>
                ))}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {error ? (
          <View style={styles.center}>
            <AppleLiquidGlassView
              fallback="view"
              glassColorScheme={glassScheme(theme)}
              glassEffectStyle="regular"
              glassTintColor={glassSurfaceTint(theme, 0.58, 0.52)}
              style={[
                styles.errorGlass,
                { backgroundColor: theme.card, borderColor: theme.border },
                IOS_26_LIQUID_GLASS_ENABLED && styles.glassControl,
              ]}
            >
            <Text style={{ color: theme.subText }}>Có lỗi xảy ra.</Text>
            <TouchableOpacity
              onPress={() => {
                refetchList();
                refetchPodiums();
                refetchPodiumAnnouncements();
              }}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: theme.primary, fontWeight: "700" }}>
                Thử lại
              </Text>
            </TouchableOpacity>
            </AppleLiquidGlassView>
          </View>
        ) : initialLoading ? (
          <FlatList
            ref={scrollViewRef}
            data={Array.from({ length: 6 })}
            keyExtractor={(_, i) => `sk-${i}`}
            renderItem={() => <SkeletonCard />}
            contentContainerStyle={{ paddingBottom: bottomPadding }}
            ListHeaderComponent={HeaderComponent}
          />
        ) : (
          /* ✅ OPTIMIZED STRUCTURE: Keep views alive */
          <View style={{ flex: 1 }}>
            {/* 1. LIST VIEW */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: viewMode === "list" ? 1 : 0,
                  zIndex: viewMode === "list" ? 1 : 0,
                  transform: [{ translateX: viewMode === "list" ? 0 : 9999 }],
                },
              ]}
            >
              <MemoizedListView
                key={`rk-${cols}`}
                scrollRef={scrollViewRef}
                data={gridList}
                numColumns={cols}
                colWrap={colWrap}
                renderItem={gridRenderItem}
                header={HeaderComponent}
                wideStyle={wideList}
                footer={
                  isFetchingList && page > 0 ? (
                    <View style={{ paddingVertical: 10, gap: 16 }}>
                      <SkeletonCard />
                      <SkeletonCard />
                    </View>
                  ) : (
                    <View style={{ height: 20 }} />
                  )
                }
                onLoadMore={handleLoadMore}
                isRefreshing={isFetchingList && page === 0}
                onRefresh={() => {
                  setPage(0);
                  refetchList();
                  refetchPodiums();
                  refetchPodiumAnnouncements();
                }}
                theme={theme}
              />
            </View>

            {/* 2. CHART VIEW: Lazy + Double Delay */}
            {hasRenderedChart && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    opacity: viewMode === "chart" ? 1 : 0,
                    zIndex: viewMode === "chart" ? 1 : 0,
                    transform: [
                      { translateX: viewMode === "chart" ? 0 : 9999 },
                    ],
                  },
                ]}
              >
                {!chartReady ? (
                  // ✅ LOAD NHẸ TRƯỚC
                  <View style={styles.center}>
                    <AppleLiquidGlassView
                      fallback="view"
                      glassColorScheme={glassScheme(theme)}
                      glassEffectStyle="regular"
                      glassTintColor={glassSurfaceTint(theme, 0.58, 0.52)}
                      style={[
                        styles.chartLoadingGlass,
                        { backgroundColor: theme.card, borderColor: theme.border },
                        IOS_26_LIQUID_GLASS_ENABLED && styles.glassControl,
                      ]}
                    >
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text
                      style={{
                        marginTop: 12,
                        color: theme.subText,
                        fontSize: 13,
                      }}
                    >
                      Đang tải biểu đồ...
                    </Text>
                    </AppleLiquidGlassView>
                  </View>
                ) : (
                  // ✅ LOAD NẶNG SAU 150ms
                  <MemoizedChartView
                    data={accumulatedList}
                    theme={theme}
                    onUserPress={handleChartUserPress}
                    onLoadMore={handleLoadMore}
                    hasMore={hasMore}
                    isLoadingMore={isFetchingList && page > 0}
                  />
                )}
              </View>
            )}
          </View>
        )}
      </View>

      <ImageViewing
        images={viewerImages}
        imageIndex={0}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
        ImageComponent={CustomImageComponent}
        backgroundColor={theme.isDark ? "#000" : "#F5F5F5"}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
      />
      <AchievementsBottomSheet
        sheetRef={achievementSheetRef}
        state={achievementSheet}
        theme={theme}
        onDismiss={closeAchievements}
      />
    </RankingPage>
  );

  if (IOS_26_LIQUID_GLASS_ENABLED) {
    return (
      <EdgeSafeAreaView edges={["top"]} style={{ flex: 1 }}>
        {screenContent}
      </EdgeSafeAreaView>
    );
  }

  return (
    <RNSafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {screenContent}
    </RNSafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  ambientBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  ambientBand: {
    position: "absolute",
    top: 70,
    left: -40,
    right: -40,
    height: 120,
    borderRadius: 28,
  },
  ambientBandAlt: {
    top: 190,
    height: 86,
  },
  headerArea: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: Platform.OS === "android" ? 10 : 0,
  },
  listHeader: {
    marginBottom: 14,
  },
  premiumCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 76,
  },
  premiumIdentity: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  premiumNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 0,
  },
  premiumNickname: {
    flexShrink: 1,
    color: sk("#FFFFFF", "#0B1B3A"),
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  premiumLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  premiumProvince: {
    flexShrink: 1,
    color: sk("#9DB8D4", "#5F6F8A"),
    fontSize: 12.5,
    fontWeight: "600",
  },
  premiumGradeButton: {
    width: 34,
    height: 34,
    marginLeft: 7,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: sk("rgba(135,190,232,0.45)", "rgba(16,42,92,0.12)"),
    backgroundColor: sk("rgba(8,31,56,0.7)", "#F5F8FD"),
  },
  premiumPodiumBadge: {
    maxWidth: 142,
    height: 27,
    paddingHorizontal: 9,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,170,0,0.08)",
  },
  premiumStatusBadge: {
    height: 27,
    paddingHorizontal: 9,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(34,216,121,0.08)",
  },
  premiumBadgeText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
  },
  premiumScoreGrid: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sk("rgba(120,180,230,0.18)", "rgba(16,42,92,0.08)"),
    backgroundColor: sk("rgba(255,255,255,0.045)", "#F5F8FD"),
    overflow: "hidden",
  },
  premiumScoreDivider: {
    width: StyleSheet.hairlineWidth,
    height: 45,
    backgroundColor: sk("rgba(120,180,230,0.42)", "rgba(16,42,92,0.14)"),
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleRow: { flexDirection: "row", alignItems: "center" },
  backBtn: { marginRight: 12 },
  backBtnGlass: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0,
  },
  selfBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowOpacity: 0.15,
    elevation: 3,
  },
  selfBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: 11,
    padding: 3,
    position: "relative",
  },
  toggleIndicator: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 32,
    height: 28,
    borderRadius: 8,
  },
  toggleBtn: {
    width: 32,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  glassControl: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  errorGlass: {
    minWidth: 220,
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  chartLoadingGlass: {
    minWidth: 190,
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, height: "100%" },
  legendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, fontWeight: "600" },
  podiumStage: { marginTop: 6, marginBottom: 14, paddingTop: 6, paddingHorizontal: 2 },
  podiumHalo: { position: "absolute", left: -16, right: -16, top: -10, bottom: 0 },
  podiumFloor: { height: 10, marginHorizontal: -4, marginTop: -2, borderRadius: 60, backgroundColor: sk("rgba(8,205,245,0.22)", "rgba(16,42,92,0.07)"), borderWidth: sk(1, 0), borderColor: "rgba(8,205,245,0.55)" },
  podiumRankDot: { position: "absolute", right: 0, bottom: 0, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: sk("#0A1A2E", "#FFFFFF") },
  podiumName: { color: sk("#FFFFFF", "#0B1B3A"), fontSize: 14, fontWeight: "900", textAlign: "center" },
  podiumProvince: { color: sk("#8FB8DE", "#5F6F8A"), fontSize: 11, fontWeight: "600" },
  podiumScore: { fontSize: 19, fontWeight: "900", marginTop: 2, letterSpacing: 0.3 },
  podiumBlock: { alignSelf: "stretch", marginTop: 8, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderWidth: 1, borderBottomWidth: 0, alignItems: "center", justifyContent: "center" },
  podiumBlockNum: { fontSize: 32, fontWeight: "900", opacity: 0.9 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 10, marginBottom: 8, borderRadius: 16, borderWidth: 1, borderColor: sk("rgba(96,170,230,0.22)", "rgba(16,42,92,0.08)"), backgroundColor: sk("rgba(8,26,48,0.78)", "#FFFFFF"), shadowColor: "#1B3A7A", shadowOpacity: sk(0, 0.06), shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  rankRowMe: { borderWidth: 1.5, borderColor: sk("#08CDF5", "#A3D916"), backgroundColor: sk("rgba(8,205,245,0.10)", "#FBFFEF") },
  rankNoBox: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: sk("rgba(255,255,255,0.06)", "#F1F5FB") },
  rankNoText: { color: sk("#E6F1FC", "#0B1B3A"), fontSize: 14, fontWeight: "900" },
  rankAvatar: { width: 40, height: 40, borderRadius: 20, overflow: "hidden", backgroundColor: sk("#0B1B33", "#E2E8F0") },
  rankName: { color: sk("#FFFFFF", "#0B1B3A"), fontSize: 14.5, fontWeight: "800", flexShrink: 1 },
  rankProvince: { color: sk("#8FB8DE", "#5F6F8A"), fontSize: 11.5, fontWeight: "600", flexShrink: 1 },
  rankKyc: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, backgroundColor: sk("rgba(22,163,74,0.16)", "#EAF8EF") },
  rankKycText: { color: "#16A34A", fontSize: 10, fontWeight: "800" },
  rankScores: { flexDirection: "row", gap: 2 },
  rankScoreLabel: { color: sk("#7F9BBE", "#8A97AD"), fontSize: 10, fontWeight: "700" },
  rankScore: { color: sk("#B9CBE0", "#5F6F8A"), fontSize: 14, fontWeight: "800" },
  rankScoreMain: { color: sk("#08CDF5", "#1466F2"), fontSize: 15.5, fontWeight: "900" },
  podiumMarqueeWrap: {
    height: 48,
    marginHorizontal: -16,
    marginTop: -4,
    marginBottom: 10,
    overflow: "hidden",
    justifyContent: "center",
  },
  podiumMarqueeTrack: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  podiumMarqueeItem: {
    height: 38,
    marginHorizontal: 5,
    borderRadius: 19,
    borderWidth: 1,
    paddingLeft: 4,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },
  podiumAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  podiumAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  podiumMedalBadge: {
    position: "absolute",
    right: -4,
    bottom: -3,
    zIndex: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  podiumMessage: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  podiumMarqueeFadeLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 28,
    opacity: 0.94,
  },
  podiumMarqueeFadeRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
    opacity: 0.94,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  glassCard: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
  },
  glassMedalCard: {
    borderWidth: 1.5,
  },
  cardHeader: { flexDirection: "row", marginBottom: 16, alignItems: "flex-start" },
  genderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginHorizontal: 16,
    gap: 10,
  },
  genderLabel: { fontSize: 14, fontWeight: "700" },
  genderChips: { flexDirection: "row", gap: 8, flex: 1 },
  genderChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  genderChipText: { fontSize: 13, fontWeight: "700" },
  ribbonWrap: { alignItems: "center", marginRight: 12, marginTop: 2 },
  ribbonBody: {
    width: 42,
    paddingTop: 7,
    paddingBottom: 9,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  ribbonNum: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ribbonNotch: {
    width: 0,
    height: 0,
    borderLeftWidth: 21,
    borderRightWidth: 21,
    borderTopWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  gradeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glassGradeIconBtn: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: { position: "relative", width: 68, height: 68 },
  avatarBorder: {
    position: "absolute",
    top: -4,
    left: -4,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    opacity: 0.8,
  },
  nickname: { fontSize: 18, fontWeight: "800", maxWidth: "85%" },
  verifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  glassVerifyBadge: {
    borderWidth: 1,
  },
  verifyText: { fontSize: 11, fontWeight: "700" },
  provinceText: { fontSize: 13, marginTop: 4 },
  medalPill: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  glassMedalPill: {
    borderWidth: 1.5,
  },
  medalPillText: {
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  achievementRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  achievementChip: {
    minHeight: 26,
    maxWidth: 180,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  achievementChipCompact: {
    minHeight: 24,
    maxWidth: 136,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  achievementChipText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
  },
  achievementMoreChip: {
    minHeight: 24,
    minWidth: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  achievementMoreText: {
    fontSize: 11,
    fontWeight: "800",
  },
  infoTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  glassChip: {
    borderWidth: 1,
  },
  infoTagText: { fontSize: 11, fontWeight: "600" },
  scoreGrid: { flexDirection: "row", gap: 12, marginBottom: 16 },
  scoreBlock: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 16,
  },
  glassScoreBlock: {
    borderWidth: 1,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  scoreValue: { fontSize: 22, fontWeight: "900" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  glassActionBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  actionText: { fontSize: 13, fontWeight: "600" },
  flameCardWrap: { position: "relative" },
  cardFlameGlow: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: 12,
    borderRadius: 28,
  },
  flameAvatarWrap: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  flameGlow: {
    position: "absolute",
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  avatarRing: {
    padding: 2,
    borderWidth: 2,
    borderRadius: 34,
  },
  avatarRingPlain: {
    padding: 2,
    borderWidth: 1,
    borderRadius: 34,
  },
  glassAvatarRing: {
    borderWidth: 1,
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  achievementSheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  achievementSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 6,
    paddingBottom: 14,
  },
  achievementSheetTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  achievementSheetSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
  },
  achievementSheetRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  achievementCategory: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 3,
  },
  achievementExplain: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
});
