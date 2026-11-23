// app/fanpage/index.tsx — Fanpage: trang tôi quản lý + khám phá + tạo trang mới (+ lối vào duyệt cho admin).
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

import { PageAvatar, RoleBadge, StatusBadge, VerifiedTick } from "@/components/fanpage/FanpageUI";
import { Text } from "@/components/ui/i18nText";
import TextInput from "@/components/ui/i18nTextInput";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import {
  FANPAGE_KIND_LABEL,
  useAdminListFanpagesQuery,
  useFollowFanpageMutation,
  useGetMyFanpagesQuery,
  useListFanpagesQuery,
} from "@/slices/fanpagesApiSlice";

function PageRow({ C, page, right, onPress }: { C: ThemeTokens; page: any; right?: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.row, { borderColor: C.border, backgroundColor: C.card }]}>
      <PageAvatar uri={page.avatar} size={48} C={C} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: C.text, fontWeight: "800", fontSize: 15, flexShrink: 1 }} numberOfLines={1}>
            {page.name}
          </Text>
          {page.verified ? <VerifiedTick size={15} /> : null}
        </View>
        <Text style={{ color: C.sub, fontSize: 12.5 }} numberOfLines={1}>
          {[FANPAGE_KIND_LABEL[page.kind as keyof typeof FANPAGE_KIND_LABEL], page.province, page.status === "approved" ? `${page.followerCount || 0} người theo dõi` : ""]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      {right}
    </Pressable>
  );
}

export default function FanpageHubScreen() {
  const C = useThemeTokens();
  const me = useSelector((s: any) => s?.auth?.userInfo);
  const [q, setQ] = useState("");
  const { data: mine, isLoading: loadingMine } = useGetMyFanpagesQuery(undefined, { skip: !me?._id });
  const { data: list, isFetching } = useListFanpagesQuery({ q: q.trim() });
  const isSiteAdmin = Boolean(mine?.isSiteAdmin);
  const { data: pending } = useAdminListFanpagesQuery("pending", { skip: !isSiteAdmin });
  const [follow] = useFollowFanpageMutation();
  const myPages: any[] = mine?.items || [];
  const pendingCount = pending?.counts?.pending || 0;

  const toggleFollow = async (p: any) => {
    if (!me?._id) return router.push("/login" as any);
    try {
      await follow({ id: String(p._id), follow: !p.isFollowing }).unwrap();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.data?.message || "Vui lòng thử lại.");
    }
  };

  const header = (
    <View style={{ gap: 12 }}>
      {isSiteAdmin ? (
        <Pressable onPress={() => router.push("/fanpage/review" as any)} style={[styles.review, { borderColor: "#F59E0B", backgroundColor: "rgba(245,158,11,0.10)" }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#F59E0B" />
          <Text style={{ flex: 1, color: C.text, fontWeight: "800" }}>Duyệt Fanpage</Text>
          {pendingCount ? (
            <View style={styles.badge}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>{pendingCount}</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={C.sub} />
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => (me?._id ? router.push("/fanpage/create" as any) : router.push("/login" as any))}
        style={[styles.create, { backgroundColor: C.primary }]}
      >
        <Ionicons name="add-circle-outline" size={20} color={C.onPrimary} />
        <Text style={{ color: C.onPrimary, fontWeight: "900", fontSize: 15 }}>Tạo Fanpage mới</Text>
      </Pressable>
      <Text style={{ color: C.sub, fontSize: 12.5, lineHeight: 18 }}>
        Fanpage cho CLB, ban tổ chức, sân hay thương hiệu: nhiều người cùng đăng bài & story dưới tên trang, chia quyền quản lý. Trang mới cần Admin PickleTour duyệt.
      </Text>

      {me?._id ? (
        <>
          <Text style={[styles.section, { color: C.text }]}>Trang của tôi</Text>
          {loadingMine ? <ActivityIndicator color={C.primary} /> : null}
          {!loadingMine && !myPages.length ? <Text style={{ color: C.sub, fontSize: 13 }}>Bạn chưa quản lý Fanpage nào.</Text> : null}
          {myPages.map((p) => (
            <PageRow
              key={String(p._id)}
              C={C}
              page={p}
              onPress={() => router.push(`/fanpage/${p._id}` as any)}
              right={
                <View style={{ alignItems: "flex-end", gap: 5 }}>
                  {p.status !== "approved" ? <StatusBadge status={p.status} /> : null}
                  {p.myRole ? <RoleBadge role={p.myRole} /> : null}
                </View>
              }
            />
          ))}
        </>
      ) : null}

      <Text style={[styles.section, { color: C.text }]}>Khám phá Fanpage</Text>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Tìm Fanpage…"
        placeholderTextColor={C.muted}
        style={[styles.search, { color: C.text, borderColor: C.border, backgroundColor: C.field }]}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: "Fanpage", headerShown: true }} />
      <FlatList
        data={list?.items || []}
        keyExtractor={(p: any) => String(p._id)}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, gap: 10, maxWidth: 680, width: "100%", alignSelf: "center", paddingBottom: 40 }}
        renderItem={({ item: p }) => (
          <PageRow
            C={C}
            page={p}
            onPress={() => router.push(`/fanpage/${p._id}` as any)}
            right={
              <Pressable
                onPress={() => toggleFollow(p)}
                hitSlop={6}
                style={[styles.follow, { backgroundColor: p.isFollowing ? C.field : C.primary, borderColor: p.isFollowing ? C.border : C.primary }]}
              >
                <Text style={{ color: p.isFollowing ? C.text : C.onPrimary, fontWeight: "800", fontSize: 12.5 }}>
                  {p.isFollowing ? "Đang theo dõi" : "Theo dõi"}
                </Text>
              </Pressable>
            }
          />
        )}
        ListFooterComponent={isFetching ? <ActivityIndicator style={{ margin: 16 }} color={C.primary} /> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1 },
  review: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center" },
  create: { height: 50, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  section: { fontSize: 17, fontWeight: "900", marginTop: 6 },
  search: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  follow: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
});
