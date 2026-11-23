// app/fanpage/[id].tsx — trang Fanpage (id hoặc slug). Mockup: docs/mockups/fanpage-2-trang-fanpage.png
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

import { MemoPostCard } from "@/app/(tabs)/feed";
import { PageAvatar, StatusBadge, VerifiedTick } from "@/components/fanpage/FanpageUI";
import StoryViewer from "@/components/story/StoryViewer";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useListFeedQuery } from "@/slices/feedApiSlice";
import {
  FANPAGE_KIND_LABEL,
  useDeleteFanpageMutation,
  useFollowFanpageMutation,
  useGetFanpageQuery,
} from "@/slices/fanpagesApiSlice";
import { useGetStoryFeedQuery } from "@/slices/storiesApiSlice";
import { normalizeUrl } from "@/utils/normalizeUri";

const WEB = "https://pickletour.vn";
const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",")}K` : String(n || 0));

export default function FanpageScreen() {
  const C = useThemeTokens();
  const insets = useSafeAreaInsets();
  const me = useSelector((s: any) => s?.auth?.userInfo);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: page, isLoading, error, refetch } = useGetFanpageQuery(String(id));
  const pageId = page?._id ? String(page._id) : "";
  const [tab, setTab] = useState<"posts" | "about">("posts");
  const [cursor, setCursor] = useState<string | null>(null);
  const { data: feed, isFetching: loadingPosts, refetch: refetchPosts } = useListFeedQuery(
    { page: pageId, cursor, limit: 10 },
    { skip: !pageId || page?.status !== "approved" },
  );
  const { data: storyData } = useGetStoryFeedQuery(pageId, { skip: !pageId || page?.status !== "approved" });
  const storyGroups = useMemo(() => (storyData?.items || []).filter((g: any) => String(g.author?._id) === pageId), [storyData, pageId]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [follow, { isLoading: following }] = useFollowFanpageMutation();
  const [deletePage] = useDeleteFanpageMutation();

  const myRole: string | null = page?.myRole || null;
  const canEdit = myRole === "owner" || myRole === "admin";

  const toggleFollow = async () => {
    if (!me?._id) return router.push("/login" as any);
    try {
      await follow({ id: pageId, follow: !page?.isFollowing }).unwrap();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.data?.message || "Vui lòng thử lại.");
    }
  };

  const share = () => {
    const url = `${WEB}/fanpage/${page?.slug || pageId}`;
    Share.share({ title: page?.name, message: `${page?.name} · PickleTour\n${url}`, url }).catch(() => {});
  };

  const manage = () => {
    const opts: any[] = [];
    if (canEdit) opts.push({ text: "Sửa thông tin", onPress: () => router.push(`/fanpage/create?id=${pageId}` as any) });
    if (myRole && !page?.isOfficial) opts.push({ text: "Thành viên & phân quyền", onPress: () => router.push(`/fanpage/members?id=${pageId}` as any) });
    if (myRole === "owner") {
      opts.push({
        text: "Xoá Fanpage",
        style: "destructive",
        onPress: () =>
          Alert.alert("Xoá Fanpage?", "Trang và danh sách người theo dõi sẽ bị xoá. Bài viết đã đăng sẽ không còn hiện tên trang.", [
            { text: "Huỷ", style: "cancel" },
            {
              text: "Xoá",
              style: "destructive",
              onPress: async () => {
                try {
                  await deletePage(pageId).unwrap();
                  router.back();
                } catch (e: any) {
                  Alert.alert("Không xoá được", e?.data?.message || "Vui lòng thử lại.");
                }
              },
            },
          ]),
      });
    }
    opts.push({ text: "Đóng", style: "cancel" });
    Alert.alert(page?.name || "Fanpage", undefined, opts);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }
  if (!page || error) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
        <Stack.Screen options={{ headerShown: true, title: "Fanpage" }} />
        <Ionicons name="flag-outline" size={42} color={C.sub} />
        <Text style={{ color: C.text, fontWeight: "800", fontSize: 16 }}>Fanpage không tồn tại hoặc chưa được duyệt</Text>
      </View>
    );
  }

  const posts = feed?.items || [];
  const approved = page.status === "approved";

  const header = (
    <View>
      <View style={{ height: 190 + insets.top, backgroundColor: C.cardAlt }}>
        {page.cover ? (
          <ExpoImage source={{ uri: normalizeUrl(page.cover) }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: C.primarySoft }]} />
        )}
        <View style={[styles.topBar, { top: insets.top + 6, left: 12 + insets.left, right: 12 + insets.right }]}>
          <Pressable onPress={() => router.back()} style={styles.roundBtn} hitSlop={8} accessibilityLabel="Quay lại">
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {myRole || canEdit ? (
              <Pressable onPress={manage} style={styles.roundBtn} hitSlop={8} accessibilityLabel="Quản lý Fanpage">
                <Ionicons name="settings-outline" size={20} color="#fff" />
              </Pressable>
            ) : null}
            <Pressable onPress={share} style={styles.roundBtn} hitSlop={8} accessibilityLabel="Chia sẻ">
              <Ionicons name="share-outline" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: -46, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
          <Pressable onPress={() => storyGroups.length && setViewerOpen(true)} disabled={!storyGroups.length}>
            <View style={[styles.avatarWrap, { borderColor: storyGroups.length ? C.primary : C.bg, backgroundColor: C.bg }]}>
              <PageAvatar uri={page.avatar} size={92} C={C} />
            </View>
          </Pressable>
          {!approved ? <StatusBadge status={page.status} /> : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: C.text, fontSize: 22, fontWeight: "900", flexShrink: 1 }}>{page.name}</Text>
          {page.verified ? <VerifiedTick size={20} /> : null}
        </View>
        <Text style={{ color: C.sub, fontSize: 13.5 }}>
          {["Fanpage", FANPAGE_KIND_LABEL[page.kind as keyof typeof FANPAGE_KIND_LABEL], page.province].filter(Boolean).join(" · ")}
        </Text>
        {approved ? (
          <Text style={{ color: C.sub, fontSize: 13.5 }}>
            <Text style={{ color: C.primary, fontWeight: "900" }}>{fmtCount(page.followerCount)}</Text> người theo dõi ·{" "}
            <Text style={{ color: C.primary, fontWeight: "900" }}>{fmtCount(page.postCount)}</Text> bài viết
          </Text>
        ) : (
          <View style={[styles.pendingBox, { borderColor: C.border, backgroundColor: C.field }]}>
            <Text style={{ color: C.text, fontSize: 13 }}>
              {page.status === "pending"
                ? "Fanpage đang chờ Admin PickleTour duyệt. Bạn sẽ nhận thông báo khi có kết quả."
                : page.status === "rejected"
                  ? `Fanpage chưa được duyệt${page.reviewNote ? `: ${page.reviewNote}` : "."} Hãy sửa thông tin để gửi duyệt lại.`
                  : `Fanpage đang bị tạm khoá${page.reviewNote ? `: ${page.reviewNote}` : "."}`}
            </Text>
          </View>
        )}

        {approved ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={toggleFollow}
              disabled={following}
              style={[
                styles.btn,
                { flex: 1, backgroundColor: page.isFollowing ? C.field : C.primary, borderColor: page.isFollowing ? C.border : C.primary },
              ]}
            >
              <Ionicons name={page.isFollowing ? "checkmark" : "person-add"} size={17} color={page.isFollowing ? C.text : C.onPrimary} />
              <Text style={{ color: page.isFollowing ? C.text : C.onPrimary, fontWeight: "900", fontSize: 14.5 }}>
                {page.isFollowing ? "Đang theo dõi" : "Theo dõi"}
              </Text>
            </Pressable>
            {myRole ? (
              <Pressable onPress={() => router.push("/(tabs)/feed" as any)} style={[styles.btn, { flex: 1, borderColor: C.border, backgroundColor: C.field }]}>
                <Ionicons name="create-outline" size={17} color={C.text} />
                <Text style={{ color: C.text, fontWeight: "800", fontSize: 14 }}>Đăng bài</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {storyGroups.length ? (
          <View style={{ gap: 8, marginTop: 4 }}>
            <Text style={{ color: C.text, fontWeight: "800", fontSize: 15 }}>Story</Text>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              {storyGroups[0].stories.slice(0, 8).map((s: any) => (
                <Pressable key={String(s._id)} onPress={() => setViewerOpen(true)} style={[styles.storyThumb, { borderColor: s.seen ? C.border : C.primary }]}>
                  <ExpoImage
                    source={{ uri: normalizeUrl(s.media?.type === "image" ? s.media.url : page.avatar) }}
                    style={{ width: "100%", height: "100%", borderRadius: 30 }}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.tabs, { borderColor: C.border }]}>
          {(["posts", "about"] as const).map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && { borderBottomColor: C.primary }]}>
              <Text style={{ color: tab === k ? C.primary : C.sub, fontWeight: "800", fontSize: 14.5 }}>
                {k === "posts" ? "Bài viết" : "Giới thiệu"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  const about = (
    <View style={{ padding: 16, gap: 12 }}>
      {page.description ? <Text style={{ color: C.text, fontSize: 14.5, lineHeight: 21 }}>{page.description}</Text> : null}
      {page.province ? (
        <View style={styles.aboutRow}>
          <Ionicons name="location-outline" size={18} color={C.primary} />
          <Text style={{ color: C.text }}>{page.province}</Text>
        </View>
      ) : null}
      {page.phone ? (
        <Pressable style={styles.aboutRow} onPress={() => Linking.openURL(`tel:${page.phone}`)}>
          <Ionicons name="call-outline" size={18} color={C.primary} />
          <Text style={{ color: C.primary, fontWeight: "700" }}>{page.phone}</Text>
        </Pressable>
      ) : null}
      {page.website ? (
        <Pressable style={styles.aboutRow} onPress={() => Linking.openURL(page.website).catch(() => {})}>
          <Ionicons name="globe-outline" size={18} color={C.primary} />
          <Text style={{ color: C.primary, fontWeight: "700", flexShrink: 1 }} numberOfLines={1}>
            {page.website}
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.aboutRow}>
        <Ionicons name="calendar-outline" size={18} color={C.primary} />
        <Text style={{ color: C.sub }}>{`Tạo ngày ${new Date(page.createdAt).toLocaleDateString("vi-VN")}`}</Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={tab === "posts" && approved ? posts : []}
        keyExtractor={(p: any) => String(p._id)}
        renderItem={({ item }) => <MemoPostCard post={item} me={me} />}
        ListHeaderComponent={header}
        ListFooterComponent={
          tab === "about" ? (
            about
          ) : loadingPosts ? (
            <ActivityIndicator style={{ margin: 20 }} color={C.primary} />
          ) : approved && !posts.length ? (
            <Text style={{ color: C.sub, textAlign: "center", margin: 24 }}>Fanpage chưa có bài viết nào.</Text>
          ) : null
        }
        onEndReached={() => {
          if (tab === "posts" && feed?.hasMore && feed?.nextCursor && !loadingPosts) setCursor(feed.nextCursor);
        }}
        onEndReachedThreshold={0.4}
        refreshing={false}
        onRefresh={() => {
          setCursor(null);
          refetch();
          if (pageId && approved) refetchPosts();
        }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      />
      <StoryViewer visible={viewerOpen} groups={storyGroups} startIndex={0} onClose={() => setViewerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: "absolute", left: 12, right: 12, flexDirection: "row", justifyContent: "space-between" },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  avatarWrap: { borderRadius: 52, borderWidth: 4, padding: 2 },
  pendingBox: { padding: 12, borderRadius: 12, borderWidth: 1 },
  btn: { height: 44, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  storyThumb: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, padding: 2 },
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, marginTop: 6 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: "transparent" },
  aboutRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
