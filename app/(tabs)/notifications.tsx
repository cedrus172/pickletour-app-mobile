import { t } from "@/utils/i18n";
// app/notifications/index.tsx — Trung tâm thông báo
import {
  Ionicons } from "@expo/vector-icons";
import { Stack,
  router } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { normalizeNotifUrl } from "@/utils/notifRoute";
import { Image as ExpoImage } from "expo-image";
import { normalizeUrl } from "@/utils/normalizeUri";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import {
  notificationCenterApiSlice,
  useDeleteNotifMutation,
  useListNotifsQuery,
  useMarkAllNotifReadMutation,
  useMarkNotifReadMutation,
  useNotifUnreadCountQuery,
} from "@/slices/notificationCenterApiSlice";
import { socket } from "@/lib/socket";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { IS_V3_LIGHT, sk } from "@/hooks/uiVersion";
import {
  NOTIFICATION_COLORS,
  NotificationSectionHeader,
  NotificationSkeleton,
  NotificationsHeader,
  NotificationsPage,
} from "@/components/notifications/NotificationDesign";

const ICONS: Record<string, any> = {
  FEED_COMMENT_NEW: "chatbubble-outline",
  FEED_REPLY_NEW: "return-down-forward-outline",
  FEED_REACTION_NEW: "heart-outline",
  FEED_MENTION: "at-outline",
  CHAT_MESSAGE_NEW: "chatbubbles-outline",
  FRIEND_REQUEST_NEW: "person-add-outline",
  FRIEND_ACCEPTED: "people-outline",
  TOURNAMENT_UPDATE: "trophy-outline",
  TOURNAMENT_INVITE: "trophy-outline",
  BOOKING_NEW: "calendar-outline",
  COURT_BOOKING_NEW: "calendar-outline",
  PAYMENT_NEW: "card-outline",
  PAYMENT_PROOF_NEW: "receipt-outline",
  ATTACHMENT_NEW: "attach-outline",
  CLUB_UPDATE: "shield-outline",
  CLUB_ACTIVITY: "people-outline",
  BOOKING: "calendar-outline",
  TOURNAMENT_FINISHED: "trophy-outline",
  MARKET_OFFER_NEW: "pricetag-outline",
  MARKET_OFFER_ACCEPTED: "checkmark-circle-outline",
  MARKET_OFFER_REJECTED: "close-circle-outline",
  PLAY_INVITE_JOIN: "person-add-outline",
  PLAY_INVITE_ACCEPTED: "tennisball-outline",
  POKER_INVITE: "game-controller-outline",
  NICKNAME_APPROVED: "checkmark-circle-outline",
  NICKNAME_REJECTED: "close-circle-outline",
  FEED_MENTION_COMMENT: "at-outline",
  SYSTEM: "megaphone-outline",
};

// Thông báo loại chung (SYSTEM / BOOKING…) → icon theo data.kind, rồi theo đường dẫn, rồi theo tiêu đề.
type Visual = { icon: any; color: string };
const V = (icon: string, color: string): Visual => ({ icon, color });
const KIND_VISUAL: Record<string, Visual> = {
  shop_order: V("bag-handle-outline", "#E11D2A"),
  shop_order_new: V("cart-outline", "#E11D2A"),
  var_done: V("sparkles-outline", "#84CC16"),
  var_failed: V("alert-circle-outline", "#F59E0B"),
  AI_POSTER: V("image-outline", "#8B5CF6"),
  clip_ready: V("videocam-outline", "#16A34A"),
  clip_approved: V("videocam-outline", "#16A34A"),
  clip_failed: V("videocam-off-outline", "#EF4444"),
  clip_rejected: V("videocam-off-outline", "#EF4444"),
  clip_approval_request: V("videocam-outline", "#0EA5E9"),
  package_purchased: V("ticket-outline", "#1466F2"),
  package_activated: V("ticket-outline", "#16A34A"),
  recurring_renewed: V("repeat-outline", "#1466F2"),
  staff_assigned: V("id-card-outline", "#0EA5E9"),
  venue_review: V("star-outline", "#D97706"),
  event_register: V("calendar-number-outline", "#1466F2"),
  event_proof: V("receipt-outline", "#0284C7"),
  event_cancelled: V("calendar-clear-outline", "#EF4444"),
  user_match: V("tennisball-outline", "#84CC16"),
  live: V("radio-outline", "#EF4444"),
  organize_request: V("trophy-outline", "#D97706"),
  organize_request_new: V("megaphone-outline", "#D97706"),
};
const URL_VISUAL: [RegExp, Visual][] = [
  [/^\/shop/, V("bag-handle-outline", "#E11D2A")],
  [/^\/var/, V("sparkles-outline", "#84CC16")],
  [/aiPoster|poster/i, V("image-outline", "#8B5CF6")],
  [/^\/tournament|^\/pickle-ball\/tournament/, V("trophy-outline", "#D97706")],
  [/^\/(courts|booking|bookings|venue)/, V("calendar-outline", "#1466F2")],
  [/clip/, V("videocam-outline", "#16A34A")],
  [/live/, V("radio-outline", "#EF4444")],
  [/match/, V("tennisball-outline", "#84CC16")],
  [/^\/(feed|post)/, V("newspaper-outline", "#0066FF")],
  [/^\/club/, V("people-outline", "#16A34A")],
  [/pcoin|wallet/, V("wallet-outline", "#D97706")],
  [/^\/(chat|messages)/, V("chatbubbles-outline", "#8B5CF6")],
  [/^\/market/, V("pricetag-outline", "#0EA5E9")],
  [/^\/play/, V("people-outline", "#10B981")],
  [/^\/owner/, V("storefront-outline", "#1466F2")],
  [/^\/(profile|user)/, V("person-outline", "#0EA5E9")],
];
const TITLE_VISUAL: [RegExp, Visual][] = [
  [/poster/i, V("image-outline", "#8B5CF6")],
  [/pcoin/i, V("wallet-outline", "#D97706")],
  [/live|trực tiếp/i, V("radio-outline", "#EF4444")],
  [/đơn /i, V("bag-handle-outline", "#E11D2A")],
  [/giải|trận/i, V("trophy-outline", "#D97706")],
  [/sân|đặt chỗ|booking/i, V("calendar-outline", "#1466F2")],
  [/cccd|kyc|xác thực/i, V("id-card-outline", "#0EA5E9")],
  [/biệt danh/i, V("person-outline", "#0EA5E9")],
];
function notifVisual(n: any): Visual {
  const kind = String(n?.data?.kind || "");
  if (KIND_VISUAL[kind]) return KIND_VISUAL[kind];
  const generic = !n?.type || n.type === "SYSTEM" || n.type === "BOOKING";
  if (!generic && ICONS[n.type]) return V(ICONS[n.type], COLORS[n.type] || "#0066FF");
  const url = String(n?.url || n?.data?.url || "");
  for (const [re, v] of URL_VISUAL) if (re.test(url)) return v;
  const title = String(n?.title || "");
  for (const [re, v] of TITLE_VISUAL) if (re.test(title)) return v;
  if (ICONS[n?.type]) return V(ICONS[n.type], COLORS[n.type] || "#0EA5E9");
  return V("notifications-outline", "#0EA5E9");
}
const COLORS: Record<string, string> = {
  FEED_COMMENT_NEW: "#0066FF",
  FEED_REPLY_NEW: "#0066FF",
  FEED_REACTION_NEW: "#EF4444",
  FEED_MENTION: "#8B5CF6",
  CHAT_MESSAGE_NEW: "#8B5CF6",
  FRIEND_REQUEST_NEW: "#10B981",
  FRIEND_ACCEPTED: "#10B981",
  TOURNAMENT_UPDATE: sk("#F59E0B", "#D97706"),
  TOURNAMENT_INVITE: sk("#F59E0B", "#D97706"),
  BOOKING_NEW: sk("#08BDF5", "#1466F2"),
  COURT_BOOKING_NEW: sk("#08BDF5", "#1466F2"),
  PAYMENT_NEW: sk("#16B8FF", "#0284C7"),
  PAYMENT_PROOF_NEW: sk("#16B8FF", "#0284C7"),
  ATTACHMENT_NEW: "#8B5CF6",
  CLUB_UPDATE: sk("#22D879", "#16A34A"),
  SYSTEM: "#64748B",
};

const authorName = (u?: any) => u?.nickname || u?.name || "Người dùng";
const fmt = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày`;
  return d.toLocaleDateString("vi-VN");
};

const isToday = (iso?: string) => {
  if (!iso) return false;
  const date = new Date(iso);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

function NotifRow({
  n,
  onPress,
  onDelete,
}: {
  n: any;
  onPress: () => void;
  onDelete: () => void;
}) {
  const C = useThemeTokens();
  const styles = useMemo(() => mk_styles(C), [C]);
  const { icon, color } = notifVisual(n);
  // Ảnh nhỏ: ảnh của thông báo (sản phẩm, video, poster…) hoặc avatar người tạo ra thông báo
  const image = String(n?.data?.image || "") || normalizeUrl(n?.actor?.avatar) || "";
  const roundImage = !n?.data?.image && !!image;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={() =>
        Alert.alert("Thông báo", n.title, [
          { text: "Đóng", style: "cancel" },
          { text: "Xoá", style: "destructive", onPress: onDelete },
        ])
      }
      style={({ pressed }) => [
        styles.row,
        !n.isRead && styles.rowUnread,
        pressed && styles.rowPressed,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          image
            ? { backgroundColor: "transparent", borderWidth: 0 }
            : {
                backgroundColor: `${color}1C`,
                borderColor: `${color}42`,
              },
        ]}
      >
        {image ? (
          <>
            <ExpoImage source={{ uri: image }} style={[styles.thumb, roundImage && { borderRadius: 26 }]} contentFit="cover" transition={150} />
            <View style={[styles.thumbBadge, { backgroundColor: color }]}>
              <Ionicons name={icon} size={12} color="#FFFFFF" />
            </View>
          </>
        ) : (
          <Ionicons name={icon} size={25} color={color} />
        )}
      </View>
      <View style={styles.content}>
        <Text
          style={[styles.title, n.isRead && styles.titleRead]}
          numberOfLines={2}
        >
          {n.actor
            ? `${authorName(n.actor)}${n.title ? " · " + n.title : ""}`
            : n.title}
        </Text>
        <Text style={[styles.body, n.isRead && styles.bodyRead]} numberOfLines={2}>
          {n.body}
        </Text>
        <Text style={styles.time}>{fmt(n.createdAt)}</Text>
      </View>
      <View style={styles.trailing}>
        {!n.isRead && <View style={styles.unreadDot} />}
        {(n.url || n.actor) && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={n.isRead ? sk("#67829F", "#97A3B8") : NOTIFICATION_COLORS.primary}
          />
        )}
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const C = useThemeTokens();
  const styles = useMemo(() => mk_styles(C), [C]);
  const me = useSelector((s: any) => s.auth?.userInfo);
  const dispatch = useDispatch();
  const { data, isFetching, isError, refetch } = useListNotifsQuery(
    {},
    { skip: !me }
  );
  const { data: unreadData } = useNotifUnreadCountQuery(undefined, {
    skip: !me,
  });
  const [markRead] = useMarkNotifReadMutation();
  const [markAllRead] = useMarkAllNotifReadMutation();
  const [deleteNotif] = useDeleteNotifMutation();

  const items = useMemo(() => data?.items || [], [data?.items]);
  const unreadInList = items.filter((item: any) => !item.isRead).length;
  const unreadCount = Number(unreadData?.count || unreadInList || 0);
  const displayItems = useMemo(() => {
    const todayItems = items.filter((item: any) => isToday(item.createdAt));
    const olderItems = items.filter((item: any) => !isToday(item.createdAt));
    const grouped: any[] = [];
    if (todayItems.length > 0) {
      grouped.push({ _id: "section-today", __section: "Hôm nay" });
      grouped.push(...todayItems);
    }
    if (olderItems.length > 0) {
      grouped.push({ _id: "section-older", __section: "Trước đó" });
      grouped.push(...olderItems);
    }
    return grouped;
  }, [items]);

  // Realtime: nghe "notification:new" từ socket → refetch
  useEffect(() => {
    if (!me) return;
    const onNew = () => {
      dispatch(
        notificationCenterApiSlice.util.invalidateTags([
          { type: "Notif", id: "LIST" },
          { type: "NotifCount", id: "ME" },
        ])
      );
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [me, dispatch]);

  if (!me) {
    return (
      <NotificationsPage>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <Stack.Screen options={{ title: t("Thông báo"), headerShown: false }} />
          <NotificationsHeader unreadCount={0} />
          <View style={styles.loginState}>
            <Ionicons
              name="notifications-outline"
              size={34}
              color={NOTIFICATION_COLORS.primary}
            />
            <Text style={styles.loginText}>Đăng nhập để xem thông báo.</Text>
            <Pressable
              onPress={() => router.push("/login")}
              style={styles.loginBtn}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>Đăng nhập</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </NotificationsPage>
    );
  }

  const handleOpen = async (n: any) => {
    if (!n.isRead) {
      try {
        await markRead(n._id).unwrap();
      } catch {}
    }
    const target = normalizeNotifUrl(n.url);
    if (target) router.push(target as any);
    else if (n.url) router.push(n.url as any);
  };

  return (
    <NotificationsPage>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Stack.Screen options={{ title: t("Thông báo"), headerShown: false }} />
        <FlatList
          data={displayItems}
          keyExtractor={(item: any) => String(item._id)}
          ListHeaderComponent={<NotificationsHeader unreadCount={unreadCount} />}
          renderItem={({ item }) =>
            item.__section ? (
              <NotificationSectionHeader
                title={item.__section}
                canMarkAll={item.__section === "Hôm nay" && unreadCount > 0}
                onMarkAll={() => markAllRead(undefined)}
              />
            ) : (
              <NotifRow
                n={item}
                onPress={() => handleOpen(item)}
                onDelete={() => deleteNotif(item._id)}
              />
            )
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && items.length > 0}
              onRefresh={refetch}
              tintColor={NOTIFICATION_COLORS.primary}
            />
          }
          ListEmptyComponent={
            isFetching ? (
              <NotificationSkeleton />
            ) : isError ? (
              <View style={styles.empty}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={42}
                  color={NOTIFICATION_COLORS.coral}
                />
                <Text style={styles.emptyTitle}>Không thể tải thông báo</Text>
                <Text style={styles.emptyText}>Vui lòng kiểm tra kết nối và thử lại.</Text>
                <Pressable onPress={refetch} style={styles.retryButton}>
                  <Ionicons name="refresh" size={17} color="#FFFFFF" />
                  <Text style={styles.retryText}>Thử lại</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons
                  name="notifications-outline"
                  size={46}
                  color={NOTIFICATION_COLORS.primary}
                />
                <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
                <Text style={styles.emptyText}>
                  Khi có hoạt động mới, thông báo sẽ xuất hiện tại đây.
                </Text>
              </View>
            )
          }
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    </NotificationsPage>
  );
}

const mk_styles = (_C: ThemeTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  listContent: { paddingBottom: 116 },
  row: {
    flexDirection: "row",
    minHeight: 92,
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginHorizontal: 12,
    gap: 11,
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: sk("rgba(90,180,230,0.18)", "rgba(16,42,92,0.08)"),
    backgroundColor: sk("rgba(5,25,49,0.82)", "#FFFFFF"),
    // V3 Fresh: thẻ trắng có bóng mềm.
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
  rowUnread: {
    backgroundColor: sk("rgba(7,39,70,0.92)", "#EEF5FF"),
    borderColor: sk("rgba(8,189,245,0.38)", "rgba(20,102,242,0.28)"),
    shadowColor: sk(NOTIFICATION_COLORS.primary as string, "#1466F2"),
    shadowOpacity: sk(0.08, 0.12),
    shadowRadius: sk(10, 12),
    shadowOffset: { width: 0, height: 5 },
  },
  rowPressed: { opacity: 0.78 },
  sep: { height: 8 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  thumb: { width: 52, height: 52, borderRadius: 14 },
  thumbBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: NOTIFICATION_COLORS.background,
  },
  content: { flex: 1, minWidth: 0 },
  title: {
    color: NOTIFICATION_COLORS.text,
    fontWeight: "800",
    fontSize: 15.5,
    lineHeight: 20,
  },
  titleRead: { color: NOTIFICATION_COLORS.textSoft, fontWeight: "700" },
  body: {
    color: sk("#A8BDD5", "#5F6F8A"),
    fontSize: 14,
    lineHeight: 19,
    marginTop: 3,
  },
  bodyRead: { color: sk("#829CB8", "#7A889F") },
  time: {
    color: sk("#6F89A8", "#97A3B8"),
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 4,
  },
  trailing: {
    width: 22,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NOTIFICATION_COLORS.primary,
    shadowColor: NOTIFICATION_COLORS.primary,
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  empty: {
    marginHorizontal: 12,
    padding: 34,
    alignItems: "center",
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: NOTIFICATION_COLORS.border,
    backgroundColor: NOTIFICATION_COLORS.surface,
  },
  emptyTitle: {
    color: NOTIFICATION_COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  emptyText: {
    color: NOTIFICATION_COLORS.textMuted,
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 40,
    marginTop: 6,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    backgroundColor: NOTIFICATION_COLORS.secondary,
  },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  loginState: {
    marginHorizontal: 16,
    padding: 28,
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: NOTIFICATION_COLORS.border,
    backgroundColor: NOTIFICATION_COLORS.surface,
  },
  loginText: { color: NOTIFICATION_COLORS.textSoft, fontSize: 14 },
  loginBtn: {
    backgroundColor: NOTIFICATION_COLORS.secondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
});
