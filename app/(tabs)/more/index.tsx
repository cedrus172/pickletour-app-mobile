import {
  Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { router,
  Stack } from "expo-router";
import React from "react";
import { useSelector } from "react-redux";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import * as Application from "expo-application";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// Marker bản OTA — dòng này đổi khi hot-update đã về máy.
// Giá trị "baseline" nằm trong BẢN NATIVE (build/archive). Bản OTA trên server
// mang giá trị khác → sau khi OTA áp dụng, dòng này sẽ ĐỔI.
const OTA_TAG = "";

// Chẩn đoán OTA: đọc globalThis.__PT_OTA__ do app/_layout.tsx ghi (flag đã nhúng
// lúc build, module load được không, kết quả check gần nhất). Tự làm mới định kỳ.
const readOtaDiag = () => {
  try {
    const d = (globalThis as any).__PT_OTA__;
    if (!d) return "diag: n/a";
    return `flag=${d.flag} · mod=${d.module} · own=${d.ownership} · ${d.last}`;
  } catch {
    return "diag: err";
  }
};

import AppleLiquidGlassView from "@/components/ui/AppleLiquidGlassView";
import { buildLoginHref } from "@/services/authSession";
import { IOS_26_LIQUID_GLASS_ENABLED } from "@/utils/nativeTabs";
import { t, useLang, setLang } from "@/utils/i18n";
import { useFriendCountsQuery } from "@/slices/friendsApiSlice";
import { useNotifUnreadCountQuery } from "@/slices/notificationCenterApiSlice";
import { useMyLiveGrantsQuery } from "@/slices/liveGrantsApiSlice";
import { useResponsive } from "@/hooks/useResponsive";

const MORE_ITEMS = [
  {
    key: "marketplace",
    title: t("Chợ Mua bán"),
    description: "Mua bán, trao đổi giày, vợt, quần áo pickleball.",
    icon: "storefront-outline" as const,
    route: "/marketplace",
    accent: "#0d6efd",
  },
  {
    key: "play",
    title: t("Tìm bạn đánh"),
    description: "Đăng kèo giao lưu, tìm người chơi cùng trình gần bạn.",
    icon: "tennisball-outline" as const,
    route: "/play",
    accent: "#16a34a",
  },
  {
    key: "live",
    title: "Live",
    description: "Xem livestream các trận đấu đang diễn ra.",
    icon: "radio-outline" as const,
    route: "/live",
    accent: "#EF4444",
  },
  {
    key: "youtube-library",
    title: "Kho clip YouTube",
    description: "Video và livestream từ các kênh YouTube của PickleTour.",
    icon: "logo-youtube" as const,
    route: "/youtube-library",
    accent: "#FF0000",
  },
  {
    key: "clip-cam",
    title: "Cắt Cam Sân",
    description: "Cắt highlight từ camera sân, tải về hoặc chia sẻ ngay.",
    icon: "cut-outline" as const,
    route: "/clip-cam",
    accent: "#06b6d4",
  },
  {
    key: "referee-clusters",
    title: t("Chấm trận theo cụm sân"),
    description: "Chọn cụm sân bạn được chia, vào tìm sân và trận để chấm.",
    icon: "grid-outline" as const,
    route: "/referee/clusters",
    accent: "#12B6F3",
  },
  {
    key: "referee-scan",
    title: t("Quét QR trọng tài"),
    description: "Quét mã QR tại sân/cụm để nhận quyền trọng tài, chấm trận ngay.",
    icon: "qr-code-outline" as const,
    route: "/referee/scan",
    accent: "#0EA5E9",
  },
  {
    key: "messages",
    title: t("Nhắn tin"),
    description: "Trò chuyện với người khác và nhắn cho BTC giải đấu.",
    icon: "chatbubbles-outline" as const,
    route: "/messages",
    accent: "#8B5CF6",
  },
  {
    key: "friends",
    title: t("Bạn bè"),
    description: "Xem danh sách bạn bè và duyệt lời mời kết bạn.",
    icon: "people-outline" as const,
    route: "/friends",
    accent: "#10B981",
  },
  {
    key: "coaches",
    title: t("Huấn luyện viên"),
    description: "Danh sách HLV chính thức, sắp xếp theo điểm trình.",
    icon: "school-outline" as const,
    route: "/coaches",
    accent: "#0EA5E9",
  },
  {
    key: "my_tournament",
    title: t("Giải của tôi"),
    description: "Theo dõi các giải đã tham gia, lịch đấu và kết quả cá nhân.",
    icon: "trophy-outline" as const,
    route: "/more/my_tournament",
    accent: "#F59E0B",
  },
  {
    key: "chat",
    title: t("Trợ lý Pikora"),
    description: "Mở trợ lý AI để hỏi nhanh, tìm luồng và thao tác ngay trong app.",
    icon: "sparkles-outline" as const,
    route: "/more/chat",
    accent: "#10A37F",
  },
  {
    key: "profile",
    title: t("Hồ sơ"),
    description: "Cập nhật hồ sơ, định danh và toàn bộ thông tin tài khoản.",
    icon: "person-circle-outline" as const,
    route: "/more/profile",
    accent: "#8B5CF6",
  },
  {
    key: "courts",
    title: t("Đặt sân"),
    description: "Tìm sân gần bạn, xem giờ trống, đặt sân và thanh toán qua QR.",
    icon: "calendar-outline" as const,
    route: "/courts",
    accent: "#22c55e",
  },
  {
    key: "my-bookings",
    title: t("Lịch đặt sân của tôi"),
    description: "Xem lượt đặt, gửi bill chuyển khoản và vé QR vào sân.",
    icon: "ticket-outline" as const,
    route: "/courts/my-bookings",
    accent: "#f59e0b",
  },
  {
    key: "my-packages",
    title: t("Gói sân của tôi"),
    description: "Gói giờ / thẻ tháng đã mua tại các sân.",
    icon: "card-outline" as const,
    route: "/courts/my-packages",
    accent: "#10B981",
  },
  {
    key: "my-events",
    title: t("Sự kiện của tôi"),
    description: "Vé sự kiện đánh social / giao lưu đã đăng ký.",
    icon: "sparkles-outline" as const,
    route: "/events/my",
    accent: "#e11d48",
  },
  {
    key: "owner",
    title: t("Quản lý sân (chủ sân)"),
    description: "Nhận đặt sân, duyệt thanh toán, quét vé QR, doanh thu. Đăng ký làm chủ sân.",
    icon: "business-outline" as const,
    route: "/owner",
    accent: "#8B5CF6",
  },
  {
    key: "notif-settings",
    title: t("Cài đặt thông báo"),
    description: "Bật/tắt push, tin nhắn, bảng tin và quản lý giải đang theo dõi.",
    icon: "notifications-outline" as const,
    route: "/settings/notifications",
    accent: "#f59e0b",
  },
];

// Gom lối tắt theo nhóm cho gọn (danh sách kiểu iOS Settings). Mỗi nhóm là danh
// sách `key` của MORE_ITEMS theo thứ tự hiển thị; key nào không có (vd mục admin
// khi không phải admin) sẽ tự bỏ qua.
const SECTIONS: { title: string; keys: string[] }[] = [
  { title: "Cá nhân", keys: ["profile", "my_tournament", "my-events", "chat", "messages", "friends"] },
  { title: "Đặt sân", keys: ["courts", "my-bookings", "my-packages"] },
  { title: "Khám phá", keys: ["marketplace", "play", "coaches"] },
  { title: "Xem trực tiếp", keys: ["live", "youtube-library", "clip-cam"] },
  { title: "Trọng tài", keys: ["referee-clusters", "referee-scan"] },
  { title: "Chủ sân & Quản trị", keys: ["owner", "live-control", "fb-to-youtube", "admin-cam-clip", "my-live-grants"] },
];

function MoreGlassSurface({
  children,
  effect = "regular",
  interactive = false,
  style,
  tintColor,
}: {
  children?: React.ReactNode;
  effect?: "regular" | "clear";
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
}) {
  const theme = useTheme();
  const isDark = theme.dark;

  return (
    <AppleLiquidGlassView
      fallback="view"
      glassColorScheme={isDark ? "dark" : "light"}
      glassEffectStyle={effect}
      glassTintColor={
        tintColor ??
        (isDark ? "rgba(18,20,26,0.62)" : "rgba(255,255,255,0.72)")
      }
      isInteractive={interactive}
      style={style}
    >
      {children}
    </AppleLiquidGlassView>
  );
}

export default function MoreIndexScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const userInfo = useSelector((state: any) => state.auth?.userInfo || null);
  const isAdmin = !!(userInfo?.isAdmin || userInfo?.role === "admin" || userInfo?.isSuperAdmin);
  const isCommentator = !!userInfo?.isCommentator;
  const isDark = theme.dark;
  const lang = useLang();
  const isAuthed = Boolean(userInfo?.token || userInfo?._id || userInfo?.email);
  // Operator được cấp Quyền Livestream (không phải admin) → hiện lối tắt "Livestream của tôi".
  const { data: myLiveGrants = [] } = useMyLiveGrantsQuery(undefined, {
    skip: !isAuthed,
  });
  const hasLiveGrants = Array.isArray(myLiveGrants) && myLiveGrants.length > 0;
  // Lối tắt cho người được cấp Quyền Livestream (operator không phải admin).
  const liveGrantItems =
    hasLiveGrants && !isAdmin
      ? [
          {
            key: "my-live-grants",
            title: "Livestream của tôi",
            description: "Giải/sân bạn được cấp quyền live + quét QR nhận quyền.",
            icon: "radio-outline" as const,
            route: "/live/my-grants",
            accent: "#EF4444",
          },
        ]
      : [];
  // Admin: mục Điều khiển Live (đầy đủ). Bình luận viên: chỉ vào bình luận.
  const moreItems = isAdmin
    ? [
        ...MORE_ITEMS,
        {
          key: "live-control",
          title: "Điều khiển Live",
          description: "Điều khiển các luồng live (PC live) từ xa.",
          icon: "videocam-outline" as const,
          route: "/admin/live-control",
          accent: "#0EA5E9",
        },
        {
          key: "fb-to-youtube",
          title: "FB VOD → YouTube",
          description: "Tải VOD live fanpage Facebook → đăng lên YouTube.",
          icon: "logo-youtube" as const,
          route: "/admin/fb-to-youtube",
          accent: "#ff0033",
        },
        {
          key: "admin-cam-clip",
          title: "Quyền Cắt Cam Sân",
          description: "Cấu hình + cấp quyền cắt cam cho mọi sân có camera.",
          icon: "shield-checkmark-outline" as const,
          route: "/admin/cam-clip",
          accent: "#06b6d4",
        },
      ]
    : isCommentator
      ? [
          ...MORE_ITEMS,
          {
            key: "live-control",
            title: "Bình luận Live",
            description: "Vào luồng live đang chạy để bình luận bằng mic.",
            icon: "mic-outline" as const,
            route: "/admin/live-control",
            accent: "#0EA5E9",
          },
          ...liveGrantItems,
        ]
      : [...MORE_ITEMS, ...liveGrantItems];
  // Dòng chẩn đoán OTA ở footer — làm mới mỗi 2s để thấy kết quả check gần nhất.
  const [otaDiagLine, setOtaDiagLine] = React.useState(readOtaDiag);
  React.useEffect(() => {
    const t = setInterval(() => setOtaDiagLine(readOtaDiag()), 2000);
    return () => clearInterval(t);
  }, []);
  const pageBg = isDark ? theme.colors.background : "#F8FAFC";
  const cardBg = isDark ? theme.colors.card : "rgba(255,255,255,0.9)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0";
  const subText = isDark ? "#A1A1AA" : "#64748B";
  const { data: friendCounts } = useFriendCountsQuery(undefined, {
    skip: !isAuthed,
  });
  const { data: notifCount } = useNotifUnreadCountQuery(undefined, {
    skip: !isAuthed,
  });

  // ── Dựng nhóm theo SECTIONS; mục không thuộc nhóm nào dồn vào "Khác" ──────────
  const byKey: Record<string, any> = {};
  for (const it of moreItems) byKey[it.key] = it;
  const usedKeys = new Set<string>(["notif-settings"]);
  for (const s of SECTIONS) for (const k of s.keys) usedKeys.add(k);
  const leftover = moreItems.filter((it) => !usedKeys.has(it.key));
  // Mục ngôn ngữ (đặc biệt: bên phải là nút gạt VI/EN thay cho chevron).
  const langItem = { key: "language", title: "Ngôn ngữ / Language", icon: "language" as const, accent: "#2563EB" };

  // Một hàng trong nhóm. Dùng hàm (không phải component) để tránh remount thừa.
  const renderRow = (item: any, isLast: boolean) => {
    const isLang = item.key === "language";
    const badge =
      item.key === "friends"
        ? friendCounts?.incoming ?? 0
        : item.key === "notifications"
          ? notifCount?.count ?? 0
          : 0;
    return (
      <React.Fragment key={item.key}>
        <Pressable
          accessibilityRole="button"
          onPress={
            isLang
              ? () => setLang(lang === "vi" ? "en" : "vi")
              : () =>
                  router.push(
                    (!isAuthed && item.key === "profile"
                      ? buildLoginHref("/more/profile")
                      : item.route) as any,
                  )
          }
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: `${item.accent}1F` }]}>
              <Ionicons name={item.icon} size={18} color={item.accent} />
            </View>
            <Text style={[styles.rowTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
              </View>
            )}
            {isLang ? (
              <View style={[styles.langPill, { borderColor }]}>
                <Text
                  style={[
                    styles.langSeg,
                    { color: lang === "vi" ? "#fff" : theme.colors.text, backgroundColor: lang === "vi" ? "#2563EB" : "transparent" },
                  ]}
                >
                  VI
                </Text>
                <Text
                  style={[
                    styles.langSeg,
                    { color: lang === "en" ? "#fff" : theme.colors.text, backgroundColor: lang === "en" ? "#2563EB" : "transparent" },
                  ]}
                >
                  EN
                </Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={18} color={isDark ? "#71717A" : "#C4C4CC"} />
            )}
          </View>
        </Pressable>
        {!isLast && <View style={[styles.divider, { backgroundColor: borderColor }]} />}
      </React.Fragment>
    );
  };

  const renderGroup = (title: string, items: any[]) =>
    items.length ? (
      <View style={styles.section} key={title}>
        <Text style={[styles.sectionTitle, { color: subText }]}>{title}</Text>
        <MoreGlassSurface
          effect="clear"
          tintColor={isDark ? "rgba(17,19,24,0.58)" : "rgba(255,255,255,0.66)"}
          style={[styles.groupCard, { backgroundColor: cardBg, borderColor }]}
        >
          {items.map((it, idx) => renderRow(it, idx === items.length - 1))}
        </MoreGlassSurface>
      </View>
    ) : null;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: pageBg }}
      edges={["top", "left", "right"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 14, paddingBottom: insets.bottom + 28 },
          r.isWide && { maxWidth: r.contentMaxWidth, alignSelf: "center", width: "100%" },
        ]}
      >
        {/* Hero gọn */}
        <MoreGlassSurface
          effect="clear"
          tintColor={isDark ? "rgba(17,19,24,0.58)" : "rgba(255,255,255,0.68)"}
          style={[
            styles.heroCard,
            IOS_26_LIQUID_GLASS_ENABLED && [
              styles.heroCardGlass,
              { shadowColor: isDark ? "#8B5CF6" : "#CBD5E1", shadowOpacity: isDark ? 0.2 : 0.16 },
            ],
            { backgroundColor: cardBg, borderColor },
          ]}
        >
          <View style={styles.heroBadge}>
            <Ionicons name="apps-outline" size={15} color={theme.colors.primary} />
            <Text style={[styles.heroBadgeText, { color: theme.colors.primary }]}>Tiện ích bổ sung</Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>Khám phá thêm</Text>
          <Text style={[styles.heroDescription, { color: subText }]}>
            Tất cả tiện ích cá nhân của PickleTour, gom gọn theo nhóm.
          </Text>
        </MoreGlassSurface>

        {SECTIONS.map((s) => renderGroup(s.title, s.keys.map((k) => byKey[k]).filter(Boolean)))}
        {renderGroup("Khác", leftover)}
        {renderGroup("Cài đặt", [langItem, byKey["notif-settings"]].filter(Boolean))}

        <Text
          style={{
            marginTop: 10,
            textAlign: "center",
            fontSize: 12,
            color: isDark ? "#71717A" : "#A1A1AA",
          }}
        >
          {`PickleTour v${Application.nativeApplicationVersion ?? "?"} · ${OTA_TAG}`}
        </Text>
        <Text
          selectable
          style={{
            marginTop: 4,
            textAlign: "center",
            fontSize: 10,
            color: isDark ? "#52525B" : "#CBD5E1",
          }}
        >
          {otaDiagLine}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  heroCardGlass: {
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    overflow: "hidden",
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  heroDescription: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  groupCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 54,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  langPill: {
    flexDirection: "row",
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
  },
  langSeg: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    fontWeight: "800",
    fontSize: 12.5,
  },
});
