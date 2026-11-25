// components/home/HomeV3.tsx
// Các khối trang chủ của giao diện V3 Fresh (nền sáng, xanh dương + xanh chanh).
import React, { memo, useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/i18nText";
import AppModal from "@/components/ui/AppModal";
import PlayerNameText from "@/components/PlayerNameText";
import { NotificationHeaderActions } from "@/components/GlobalNotificationShell";
import { useDuoSideNavigation } from "@/hooks/useDuoSideNavigation";
import { IS_V3_DARK, V3 } from "@/hooks/uiVersion";
import { useGetMyRankQuery } from "@/slices/usersApiSlice";
import { useShopInfo } from "@/slices/shopApiSlice";
import { normalizeUrl } from "@/utils/normalizeUri";
import {
  formatRatingScore,
  getBestRatingScore,
  getRankNoFromPayload,
  isValidRankNo,
} from "@/utils/rankUtils";

import StoryBar from "@/components/story/StoryBar";

const HERO_COURT = require("@/assets/images/v3/hero-court.jpg");
const ARCADE_BANNER = require("@/assets/images/v3/arcade-banner.jpg");


/* ------------------------------------------------------------------ */
/* Nền trang                                                           */
/* ------------------------------------------------------------------ */
export const HomeV3Page = memo(function HomeV3Page({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={V3.gradPage} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.page}>
      {children}
    </LinearGradient>
  );
});

/* ------------------------------------------------------------------ */
/* Hero: ảnh sân + avatar/tên/điểm người dùng + chuông thông báo       */
/* ------------------------------------------------------------------ */
export const HomeV3Hero = memo(function HomeV3Hero({ width }: { width: number }) {
  const insets = useSafeAreaInsets();
  const sideNavigation = useDuoSideNavigation();
  const heroHeight = Math.round(Math.min(Math.max(width * 0.5, 180), 300));
  return (
    <View style={{ height: heroHeight }}>
      <Image source={HERO_COURT} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="right center" transition={200} />
      {/* Tông tối: phủ một lớp navy để ảnh sân sáng không chói trên nền tối */}
      {IS_V3_DARK ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: V3.heroScrim }]} /> : null}
      {/* Hoà mép trên/dưới của ảnh vào nền trang */}
      <LinearGradient pointerEvents="none" colors={[V3.gradPage[0], V3.fade0]} style={styles.heroFadeTop} />
      <LinearGradient pointerEvents="none" colors={[V3.fade0, V3.gradPage[0]]} style={styles.heroFadeBottom} />
      <View pointerEvents="box-none" style={styles.heroUser}>
        <HomeV3UserCard variant="hero" />
      </View>
      {/* Story người dùng đăng ở Bảng tin — nằm ở khoảng trống dưới thẻ người dùng */}
      <View pointerEvents="box-none" style={styles.heroStories}>
        <StoryBar variant="hero" />
      </View>
      <View
        pointerEvents="box-none"
        testID="home-notification-corner"
        style={[styles.heroBell, { right: sideNavigation.enabled ? 16 : Math.max(insets.right, 16) }]}
      >
        <NotificationHeaderActions />
      </View>
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Thẻ người dùng                                                      */
/* ------------------------------------------------------------------ */
function roleLabel(role?: string) {
  switch (role) {
    case "admin":
      return "Admin";
    case "referee":
      return "Trọng tài";
    case "user":
      return "Vận động viên";
    default:
      return "Khách";
  }
}

export const HomeV3UserCard = memo(function HomeV3UserCard({ variant = "card" }: { variant?: "card" | "hero" }) {
  const hero = variant === "hero";
  const userInfo = useSelector((s: any) => s.auth?.userInfo);
  const storedRawRankNo = getRankNoFromPayload(userInfo);
  const hasStoredRankNo = isValidRankNo(storedRawRankNo);
  const shouldFetchMyRank = !!userInfo?.token && !hasStoredRankNo;
  const { data: myRankData, isFetching } = useGetMyRankQuery(undefined, { skip: !shouldFetchMyRank });
  const rawRankNo = hasStoredRankNo ? storedRawRankNo : getRankNoFromPayload(myRankData);
  const rankNo = Number(rawRankNo);
  const hasRankNo = isValidRankNo(rawRankNo);
  // Giống V2: chỉ hiện điểm trình khi đã được chấm.
  const isRated = hasRankNo || Boolean(myRankData?.rated);
  const ratingScore = isRated ? getBestRatingScore(myRankData) : null;
  const hideRank = !!userInfo && !hasRankNo && ratingScore === null && isFetching;

  let rankText = "Chưa xếp hạng";
  let rankIcon: keyof typeof MaterialIcons.glyphMap = "star-border";
  if (hasRankNo) {
    rankText = rankNo <= 100 ? `TOP ${rankNo}` : `Hạng ${rankNo}`;
    rankIcon = rankNo <= 100 ? "emoji-events" : "military-tech";
  } else if (ratingScore !== null) {
    rankText = `${formatRatingScore(ratingScore)} điểm`;
    rankIcon = "trending-up";
  }

  const name = userInfo?.nickname || userInfo?.nickName || userInfo?.name || "Người dùng";
  const avatarUrl = normalizeUrl(userInfo?.avatar);
  const onPress = useCallback(() => router.push((userInfo ? "/profile/stack" : "/login") as never), [userInfo]);

  return (
    <View style={hero ? undefined : styles.userWrap}>
      <Pressable accessibilityRole="button" onPress={onPress} style={hero ? styles.userHero : styles.userCard}>
        <LinearGradient colors={[V3.lime, V3.blueBright]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={hero ? styles.avatarRingHero : styles.avatarRing}>
          <View style={styles.avatarInner}>
            {userInfo && avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={300} />
            ) : (
              <Ionicons name="person" size={30} color={V3.muted} />
            )}
          </View>
        </LinearGradient>

        <View style={hero ? styles.userInfoHero : styles.userInfo}>
          {userInfo ? (
            <PlayerNameText user={userInfo} name={name} style={[styles.userName, hero && styles.userNameHero]} numberOfLines={1} />
          ) : (
            <Text style={[styles.userName, hero && styles.userNameHero]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              Bắt đầu hành trình
            </Text>
          )}
          <View style={styles.roleRow}>
            <View style={styles.roleBadge}>
              <Ionicons name="star" size={9} color={V3.onBlue} />
            </View>
            <Text style={[styles.roleText, hero && styles.roleTextHero]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {userInfo ? roleLabel(userInfo?.role) : "Cùng PickleTour"}
            </Text>
            {/* Viên kính (mockup home-ten-vdv-C): điểm nằm cùng dòng với vai trò */}
            {hero ? (
              userInfo ? (
                hideRank ? null : (
                  <>
                    <Text style={styles.heroDot}>·</Text>
                    <MaterialIcons name={rankIcon} size={13} color={V3.blue} />
                    <Text style={styles.heroRank} numberOfLines={1}>
                      {rankText}
                    </Text>
                  </>
                )
              ) : (
                <>
                  <Text style={styles.heroDot}>·</Text>
                  <Text style={[styles.heroRank, { color: V3.blue }]}>Đăng nhập</Text>
                </>
              )
            ) : null}
          </View>
        </View>

        {hero ? (
          <Ionicons name="chevron-forward" size={18} color={IS_V3_DARK ? "rgba(255,255,255,0.8)" : V3.sub} />
        ) : userInfo ? (
          hideRank ? null : (
            <View style={styles.rankRow}>
              <View style={styles.rankPill}>
                <MaterialIcons name={rankIcon} size={17} color={V3.blue} />
                <Text style={styles.rankText} numberOfLines={1}>
                  {rankText}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={V3.blue} />
            </View>
          )
        ) : (
          <LinearGradient colors={V3.gradBlue} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.loginPill}>
            <Text style={styles.loginText}>Đăng nhập</Text>
          </LinearGradient>
        )}
      </Pressable>
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Thẻ Gian hàng độc quyền GOATWIN (chỉ hiện khi gian hàng mở cho người xem) */
/* ------------------------------------------------------------------ */
export const HomeV3ShopCard = memo(function HomeV3ShopCard({ belowBanner = false }: { belowBanner?: boolean }) {
  const { data: shop } = useShopInfo();
  if (!shop?.enabled) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shop.title}
      onPress={() => router.push("/shop" as never)}
      // Có banner xem live phía trên → banner đè lên ảnh đầu trang, thẻ này đứng ngay dưới (không đè -30).
      style={[styles.shopPress, belowBanner && { marginTop: 12 }]}
    >
      <LinearGradient colors={["#070709", "#2A0709", "#4A0B10"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.shopCard}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {shop.logo ? <Image source={{ uri: shop.logo }} style={styles.shopLogo} contentFit="contain" /> : null}
            <View style={styles.shopBadge}>
              <Text style={styles.shopBadgeText}>ĐỘC QUYỀN</Text>
            </View>
          </View>
          <Text style={styles.shopTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {shop.title}
          </Text>
          <Text style={styles.shopSub} numberOfLines={1}>
            {[shop.subtitle, shop.promoLabel].filter(Boolean).join(" · ")}
          </Text>
        </View>
        {shop.cardImage ? <Image source={{ uri: shop.cardImage }} style={styles.shopImg} contentFit="contain" transition={200} /> : null}
        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
      </LinearGradient>
    </Pressable>
  );
});

/* ------------------------------------------------------------------ */
/* 4 ô lối tắt chính                                                   */
/* ------------------------------------------------------------------ */
const QUICK_TILES: {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: [string, string];
  route: string;
}[] = [
  { key: "courts", title: "Đặt sân", description: "Tìm sân & giữ chỗ", icon: "calendar-clear-outline", color: "#1E88F5", bg: ["#E6F1FF", "#F3F8FF"], route: "/courts" },
  { key: "tournaments", title: "Giải đấu", description: "Tham gia & thi đấu", icon: "trophy-outline", color: "#2FB52A", bg: ["#EAF8E1", "#F5FCEF"], route: "/tournament/stack" },
  { key: "rankings", title: "Bảng xếp hạng", description: "Cập nhật thứ hạng", icon: "stats-chart", color: "#6A4DF5", bg: ["#EEEAFF", "#F7F5FF"], route: "/rankings/stack" },
  { key: "schedule", title: "Lịch thi đấu", description: "Theo dõi trận đấu", icon: "time-outline", color: "#F57C1F", bg: ["#FFF0E2", "#FFF8F1"], route: "/schedule" },
];

/** "#RRGGBB" → rgba với độ trong suốt cho trước (nền ô ở tông tối). */
function hexAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export const HomeV3QuickTiles = memo(function HomeV3QuickTiles() {
  return (
    <View style={styles.tilesRow}>
      {QUICK_TILES.map((tile) => (
        <Pressable key={tile.key} accessibilityRole="button" onPress={() => router.push(tile.route as never)} style={styles.tilePress}>
          <LinearGradient
            colors={IS_V3_DARK ? [hexAlpha(tile.color, 0.24), hexAlpha(tile.color, 0.08)] : tile.bg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tile}
          >
            <Ionicons name={tile.icon} size={30} color={tile.color} />
            <Text style={styles.tileTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>
              {tile.title}
            </Text>
            <Text style={styles.tileDesc} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
              {tile.description}
            </Text>
          </LinearGradient>
        </Pressable>
      ))}
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Banner PickleTour Arcade                                            */
/* ------------------------------------------------------------------ */
export const HomeV3ArcadeBanner = memo(function HomeV3ArcadeBanner() {
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push("/game-hot" as never)} style={styles.arcadePress}>
      <View style={styles.arcadeCard}>
        <Image source={ARCADE_BANNER} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="right center" transition={200} />
        <View style={styles.arcadeCopy}>
          <Text style={styles.arcadeBrand} numberOfLines={1}>
            PickleTour
          </Text>
          <Text style={styles.arcadeTitle} numberOfLines={1}>
            Arcade
          </Text>
          <Text style={styles.arcadeSub} numberOfLines={1}>
            Chơi pickleball 3D trực tuyến
          </Text>
          <LinearGradient colors={V3.gradLime} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.arcadeCta}>
            <Ionicons name="game-controller" size={17} color={V3.onLime} />
            <Text style={styles.arcadeCtaText}>Chơi ngay</Text>
            <Ionicons name="chevron-forward" size={16} color={V3.onLime} />
          </LinearGradient>
        </View>
      </View>
    </Pressable>
  );
});

/* ------------------------------------------------------------------ */
/* Tiêu đề mục                                                         */
/* ------------------------------------------------------------------ */
export const HomeV3SectionTitle = memo(function HomeV3SectionTitle({
  title,
  actionLabel,
  actionIcon,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <Ionicons name="flash" size={24} color={V3.limeDeep} />
      <Text style={styles.sectionTitle} numberOfLines={1}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction} style={styles.sectionAction}>
          {actionIcon ? <Ionicons name={actionIcon} size={17} color={V3.blue} /> : null}
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Lối tắt của bạn (tuỳ chỉnh được)                                    */
/* ------------------------------------------------------------------ */
type Shortcut = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; route: string };

const ALL_SHORTCUTS: Shortcut[] = [
  { key: "qr", label: "Vé QR Check-in", icon: "scan-outline", route: "/courts/my-bookings" },
  { key: "friends", label: "Bạn đồng hành", icon: "people-outline", route: "/friends" },
  { key: "live", label: "Xem Live", icon: "play-circle-outline", route: "/live/home" },
  { key: "news", label: "Tin tức", icon: "newspaper-outline", route: "/news" },
  { key: "shop", label: "Cửa hàng", icon: "storefront-outline", route: "/marketplace" },
  { key: "clipcam", label: "Cắt Cam Sân", icon: "cut-outline", route: "/clip-cam" },
  { key: "play", label: "Tìm bạn đánh", icon: "tennisball-outline", route: "/play" },
  { key: "clubs", label: "Câu lạc bộ", icon: "people-circle-outline", route: "/clubs" },
  { key: "stats", label: "Thống kê", icon: "stats-chart-outline", route: "/stats/user" },
  { key: "matches", label: "Trận đấu", icon: "flag-outline", route: "/match/stack" },
  { key: "h2h", label: "Đối đầu", icon: "git-compare-outline", route: "/head2head" },
  { key: "radar", label: "Quanh đây", icon: "locate-outline", route: "/radar" },
  { key: "messages", label: "Nhắn tin", icon: "chatbubbles-outline", route: "/messages" },
  { key: "coaches", label: "Huấn luyện viên", icon: "school-outline", route: "/coaches" },
  { key: "guide", label: "Hướng dẫn", icon: "book-outline", route: "/guide" },
  { key: "support", label: "Hỗ trợ / Góp ý", icon: "chatbox-ellipses-outline", route: "/support" },
];
const DEFAULT_SHORTCUTS = ["qr", "friends", "live", "news", "shop"];
const SHORTCUTS_KEY = "HOME_V3_SHORTCUTS";
const MAX_SHORTCUTS = 10;

function readShortcuts(): string[] {
  try {
    const raw = SecureStore.getItem(SHORTCUTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((k) => ALL_SHORTCUTS.some((s) => s.key === k));
      if (valid.length) return valid;
    }
  } catch {}
  return DEFAULT_SHORTCUTS;
}

export const HomeV3Shortcuts = memo(function HomeV3Shortcuts() {
  const [selected, setSelected] = useState<string[]>(readShortcuts);
  const [editing, setEditing] = useState(false);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const items = useMemo(
    () => selected.map((k) => ALL_SHORTCUTS.find((s) => s.key === k)).filter(Boolean) as Shortcut[],
    [selected],
  );

  const toggle = useCallback((key: string) => {
    setSelected((current) => {
      let next: string[];
      if (current.includes(key)) {
        if (current.length <= 1) return current;
        next = current.filter((k) => k !== key);
      } else {
        if (current.length >= MAX_SHORTCUTS) return current;
        next = [...current, key];
      }
      try {
        SecureStore.setItem(SHORTCUTS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return (
    <View style={styles.shortcutsSection}>
      <HomeV3SectionTitle title="Lối tắt của bạn" actionLabel="Tùy chỉnh" actionIcon="options-outline" onAction={() => setEditing(true)} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutsRow}>
        {items.map((item) => (
          <Pressable key={item.key} accessibilityRole="button" onPress={() => router.push(item.route as never)} style={styles.shortcut}>
            <Ionicons name={item.icon} size={25} color={V3.blue} />
            <Text style={styles.shortcutLabel} numberOfLines={2}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <AppModal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <View style={styles.sheetRoot}>
          <Pressable accessibilityLabel="Đóng" style={StyleSheet.absoluteFill} onPress={() => setEditing(false)} />
          <View style={[styles.sheet, { maxHeight: height * 0.78, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetGrabber} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Tùy chỉnh lối tắt</Text>
                <Text style={styles.sheetSub}>Chọn tối đa {MAX_SHORTCUTS} lối tắt hiện ở trang chủ</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={styles.sheetDone}>
                <Text style={styles.sheetDoneText}>Xong</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
              {ALL_SHORTCUTS.map((item) => {
                const on = selected.includes(item.key);
                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => toggle(item.key)}
                    style={[styles.sheetItem, on ? styles.sheetItemOn : null]}
                  >
                    <View style={[styles.sheetIcon, on ? styles.sheetIconOn : null]}>
                      <Ionicons name={item.icon} size={21} color={on ? V3.onBlue : V3.blue} />
                    </View>
                    <Text style={styles.sheetItemLabel} numberOfLines={1}>
                      {item.label}
                    </Text>
                    <Ionicons name={on ? "checkmark-circle" : "ellipse-outline"} size={24} color={on ? V3.blue : V3.muted} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </AppModal>
    </View>
  );
});

const CARD_SHADOW = {
  shadowColor: V3.shadow,
  shadowOpacity: 0.1,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  page: { flex: 1, overflow: "hidden" },

  heroFadeTop: { position: "absolute", left: 0, right: 0, top: 0, height: 26 },
  heroFadeBottom: { position: "absolute", left: 0, right: 0, bottom: 0, height: 46 },
  heroBell: { position: "absolute", top: 8, zIndex: 10 },

  userWrap: { paddingHorizontal: 16, marginTop: -44 },
  heroUser: { position: "absolute", left: 14, top: 10, right: 76 },
  heroStories: { position: "absolute", left: 0, right: 0, top: 78 },
  // Phương án C: một viên kính ngang (avatar · tên · vai trò + điểm · mũi tên)
  userHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    maxWidth: "100%",
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: IS_V3_DARK ? "rgba(8,20,40,0.78)" : "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: IS_V3_DARK ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.95)",
    ...CARD_SHADOW,
  },
  avatarRingHero: { width: 50, height: 50, borderRadius: 25, padding: 2.5 },
  heroDot: { color: V3.sub, fontSize: 12, fontWeight: "900", marginHorizontal: 1 },
  heroRank: { flexShrink: 1, color: IS_V3_DARK ? "#FFFFFF" : V3.ink, fontSize: 12, fontWeight: "800" },
  userInfoHero: { flexShrink: 1, minWidth: 0 },
  // Chữ trên ảnh đầu trang: tông tối = chữ trắng đổ bóng; tông sáng = chữ đậm màu mực + viền sáng cho dễ đọc.
  userNameHero: { fontSize: 17.5, lineHeight: 22, color: IS_V3_DARK ? "#FFFFFF" : V3.ink },
  roleTextHero: { flexShrink: 0, fontSize: 11, letterSpacing: 0.6, color: V3.sub },
  rankPillHero: { alignSelf: "flex-start", height: 32, marginTop: 6, borderWidth: 1, borderColor: V3.cardEdge },
  shopPress: { marginHorizontal: 16, marginTop: -30, borderRadius: 20, ...CARD_SHADOW, shadowColor: "#E11D2A", shadowOpacity: 0.35 },
  shopCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 96,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(225,29,42,0.75)",
    overflow: "hidden",
  },
  shopLogo: { width: 64, height: 26 },
  shopBadge: { backgroundColor: "#C5F433", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  shopBadgeText: { color: "#132000", fontSize: 10.5, fontWeight: "900", letterSpacing: 0.3 },
  shopTitle: { color: "#FFFFFF", fontSize: 16.5, fontWeight: "900", marginTop: 6 },
  shopSub: { color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 2 },
  shopImg: { width: 104, height: 70 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 24,
    backgroundColor: V3.cardGlass,
    borderWidth: 1,
    borderColor: V3.cardEdge,
    ...CARD_SHADOW,
  },
  avatarRing: { width: 60, height: 60, borderRadius: 30, padding: 3 },
  avatarInner: {
    flex: 1,
    borderRadius: 27,
    backgroundColor: V3.field,
    borderWidth: 2,
    borderColor: V3.cardEdge,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { color: V3.ink, fontSize: 18, lineHeight: 23, fontWeight: "900" },
  roleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  roleBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: V3.blue, alignItems: "center", justifyContent: "center" },
  roleText: { flexShrink: 1, color: V3.sub, fontSize: 11.5, fontWeight: "800", letterSpacing: 0.9, textTransform: "uppercase" },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 2, flexShrink: 0 },
  rankPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 19,
    backgroundColor: V3.chip,
  },
  rankText: { color: V3.ink, fontSize: 14.5, fontWeight: "900" },
  loginPill: { height: 38, paddingHorizontal: 16, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  loginText: { color: V3.onBlue, fontSize: 14, fontWeight: "800" },

  tilesRow: { flexDirection: "row", gap: 7, paddingHorizontal: 16, marginTop: 14 },
  tilePress: { flex: 1, minWidth: 0, borderRadius: 18 },
  tile: {
    minHeight: 104,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: V3.tileEdge,
  },
  tileTitle: { width: "100%", textAlign: "center", color: V3.ink, fontSize: 12, lineHeight: 16, fontWeight: "900", letterSpacing: -0.2, marginTop: 8 },
  tileDesc: { width: "100%", textAlign: "center", color: V3.sub, fontSize: 10, lineHeight: 14, marginTop: 1 },

  arcadePress: { marginHorizontal: 16, marginTop: 14, borderRadius: 22, ...CARD_SHADOW, shadowOpacity: 0.22 },
  arcadeCard: { aspectRatio: 2.62, borderRadius: 22, overflow: "hidden", backgroundColor: V3.navy, justifyContent: "center" },
  arcadeCopy: { paddingLeft: 18, width: "64%" },
  arcadeBrand: { color: "#FFFFFF", fontSize: 21, lineHeight: 24, fontWeight: "900", fontStyle: "italic" },
  arcadeTitle: { color: V3.lime, fontSize: 30, lineHeight: 32, fontWeight: "900", fontStyle: "italic" },
  arcadeSub: { color: "rgba(255,255,255,0.92)", fontSize: 12.5, lineHeight: 17, marginTop: 4 },
  arcadeCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    marginTop: 9,
  },
  arcadeCtaText: { color: V3.onLime, fontSize: 13.5, fontWeight: "900" },

  sectionRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, paddingRight: 16 },
  sectionTitle: { flex: 1, color: V3.ink, fontSize: 19, lineHeight: 25, fontWeight: "900" },
  sectionAction: { flexDirection: "row", alignItems: "center", gap: 5 },
  sectionActionText: { color: V3.sub, fontSize: 13, fontWeight: "600" },

  shortcutsSection: { paddingLeft: 16, marginTop: 20 },
  shortcutsRow: { gap: 8, paddingRight: 16, paddingBottom: 4 },
  shortcut: {
    width: 78,
    minHeight: 76,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: V3.iconWell,
  },
  shortcutLabel: { color: V3.ink, fontSize: 11.5, lineHeight: 14, fontWeight: "600", textAlign: "center" },

  sheetRoot: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(11,27,58,0.42)" },
  sheet: { backgroundColor: V3.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 8 },
  sheetGrabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: IS_V3_DARK ? V3.line : "#D5DDEA", marginBottom: 10 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, marginBottom: 10 },
  sheetTitle: { color: V3.ink, fontSize: 18, fontWeight: "900" },
  sheetSub: { color: V3.sub, fontSize: 12.5, marginTop: 2 },
  sheetDone: { height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: V3.blue, alignItems: "center", justifyContent: "center" },
  sheetDoneText: { color: V3.onBlue, fontSize: 14, fontWeight: "800" },
  sheetList: { paddingHorizontal: 14, paddingBottom: 8, gap: 6 },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: V3.cardAlt,
  },
  sheetItemOn: { backgroundColor: V3.selected },
  sheetIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: V3.card, alignItems: "center", justifyContent: "center" },
  sheetIconOn: { backgroundColor: V3.blue },
  sheetItemLabel: { flex: 1, color: V3.ink, fontSize: 14.5, fontWeight: "700" },
});
