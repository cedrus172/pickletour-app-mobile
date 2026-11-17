// components/feed/FriendSuggestions.tsx
// Khối "Gợi ý kết bạn" ở cột trái Bảng tin khi màn rộng (iPhone Duo mở / xoay ngang):
// lấp khoảng trống dưới ô soạn bài. Dữ liệu từ /api/friends/suggestions (cùng tỉnh, trình gần nhau).
import React, { memo, useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/i18nText";
import { AuthorAvatar } from "@/components/social/AuthorAvatar";
import { FEED_COLORS } from "@/components/feed/FeedDesign";
import { useFriendSuggestionsQuery, useSendFriendRequestMutation } from "@/slices/friendsApiSlice";

type SuggestedUser = {
  _id: string;
  name?: string;
  nickname?: string;
  avatar?: string;
  province?: string;
  score?: { single?: number; double?: number };
};

const fmtScore = (v?: number) => (Number(v) > 0 ? Number(v).toFixed(2).replace(/\.?0+$/, "") : null);

const SuggestionRow = memo(function SuggestionRow({ user, last }: { user: SuggestedUser; last: boolean }) {
  const [sendRequest] = useSendFriendRequestMutation();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const name = user.nickname || user.name || "Người chơi";
  const single = fmtScore(user.score?.single);
  const double = fmtScore(user.score?.double);
  const meta = [user.province, single ? `Đơn ${single}` : null, double ? `Đôi ${double}` : null].filter(Boolean).join(" · ");

  const onAdd = useCallback(async () => {
    if (state === "sending" || state === "sent") return;
    setState("sending");
    try {
      await sendRequest(user._id).unwrap();
      setState("sent");
    } catch {
      setState("error");
    }
  }, [sendRequest, state, user._id]);

  const sent = state === "sent";
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem hồ sơ ${name}`}
        onPress={() => router.push(`/profile/${user._id}` as never)}
        style={styles.who}
      >
        <AuthorAvatar user={user as any} size={42} />
        <View style={styles.whoText}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {meta ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={sent ? "Đã gửi lời mời kết bạn" : `Kết bạn với ${name}`}
        disabled={sent || state === "sending"}
        onPress={onAdd}
        style={[styles.addBtn, sent ? styles.addBtnSent : null]}
      >
        {state === "sending" ? (
          <ActivityIndicator size="small" color={FEED_COLORS.primary} />
        ) : (
          <>
            <Ionicons
              name={sent ? "checkmark" : "person-add-outline"}
              size={15}
              color={sent ? FEED_COLORS.textMuted : FEED_COLORS.primary}
            />
            <Text style={[styles.addText, sent ? styles.addTextSent : null]}>
              {sent ? "Đã gửi" : state === "error" ? "Thử lại" : "Kết bạn"}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
});

function FriendSuggestions({ limit = 6 }: { limit?: number }) {
  const { data, isLoading, isError } = useFriendSuggestionsQuery({ limit });
  const items: SuggestedUser[] = (data as any)?.items || [];
  if (isError || (!isLoading && !items.length)) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="people" size={18} color={FEED_COLORS.primary} />
        <Text style={styles.title}>Gợi ý kết bạn</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push("/friends" as never)}>
          <Text style={styles.more}>Xem bạn bè</Text>
        </Pressable>
      </View>
      {isLoading ? (
        <ActivityIndicator style={{ paddingVertical: 18 }} color={FEED_COLORS.primary} />
      ) : (
        items.map((u, i) => <SuggestionRow key={u._id} user={u} last={i === items.length - 1} />)
      )}
    </View>
  );
}

export default memo(FriendSuggestions);

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    marginHorizontal: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: FEED_COLORS.border,
    backgroundColor: FEED_COLORS.surface,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  title: { flex: 1, color: FEED_COLORS.text, fontSize: 15.5, fontWeight: "800" },
  more: { color: FEED_COLORS.primary, fontSize: 12.5, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: FEED_COLORS.border },
  who: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  whoText: { flex: 1, minWidth: 0 },
  name: { color: FEED_COLORS.text, fontSize: 14, fontWeight: "700" },
  meta: { color: FEED_COLORS.textMuted, fontSize: 12, marginTop: 2 },
  addBtn: {
    minWidth: 92,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: FEED_COLORS.primary,
  },
  addBtnSent: { borderColor: FEED_COLORS.border },
  addText: { color: FEED_COLORS.primary, fontSize: 13, fontWeight: "800" },
  addTextSent: { color: FEED_COLORS.textMuted },
});
