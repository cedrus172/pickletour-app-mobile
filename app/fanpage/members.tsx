// app/fanpage/members.tsx?id= — Thành viên & phân quyền Fanpage (mockup fanpage-3-tao-quan-ly.png, bên phải).
// Chủ sở hữu: toàn quyền (thêm/đổi/gỡ mọi quyền, chuyển quyền sở hữu) · Quản trị viên: đăng bài, thêm/gỡ Biên tập viên ·
// Biên tập viên: đăng bài & story.
import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

import { PageAvatar, RoleBadge, StatusBadge } from "@/components/fanpage/FanpageUI";
import { AuthorAvatar } from "@/components/social/AuthorAvatar";
import AppModal from "@/components/ui/AppModal";
import { Text } from "@/components/ui/i18nText";
import TextInput from "@/components/ui/i18nTextInput";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import {
  FANPAGE_ROLE_LABEL,
  useAddFanpageMemberMutation,
  useGetFanpageMembersQuery,
  useGetFanpageQuery,
  useRemoveFanpageMemberMutation,
  useUpdateFanpageMemberMutation,
} from "@/slices/fanpagesApiSlice";
import { useLazySearchUserQuery } from "@/slices/usersApiSlice";

const nameOf = (u: any) => u?.nickname || u?.name || "Người dùng";

function AddMemberModal({ pageId, myRole, onClose }: { pageId: string; myRole: string; onClose: () => void }) {
  const C = useThemeTokens();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [role, setRole] = useState<"editor" | "admin">("editor");
  const [search, { isFetching }] = useLazySearchUserQuery();
  const [add, { isLoading }] = useAddFanpageMemberMutation();
  const t = useRef<any>(null);

  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    t.current = setTimeout(async () => {
      try {
        const r: any = await search(q.trim()).unwrap();
        setResults((Array.isArray(r) ? r : r?.items || r?.data || []).slice(0, 12));
      } catch {
        setResults([]);
      }
    }, 300);
    return () => t.current && clearTimeout(t.current);
  }, [q, search]);

  const pickUser = (u: any) => {
    Alert.alert("Thêm người quản lý", `Thêm ${nameOf(u)} làm ${FANPAGE_ROLE_LABEL[role]}?`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Thêm",
        onPress: async () => {
          try {
            await add({ id: pageId, userId: String(u._id), role }).unwrap();
            onClose();
          } catch (e: any) {
            Alert.alert("Không thêm được", e?.data?.message || "Vui lòng thử lại.");
          }
        },
      },
    ]);
  };

  return (
    <AppModal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: "900" }}>Mời thành viên</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Đóng">
            <Ionicons name="close" size={26} color={C.text} />
          </Pressable>
        </View>
        {myRole === "owner" ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["editor", "admin"] as const).map((r) => (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                style={[styles.roleOpt, { borderColor: role === r ? C.primary : C.border, backgroundColor: role === r ? C.primarySoft : C.field }]}
              >
                <Text style={{ color: role === r ? C.primary : C.text, fontWeight: "800" }}>{FANPAGE_ROLE_LABEL[r]}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={{ color: C.sub, fontSize: 12.5 }}>Quản trị viên chỉ thêm được Biên tập viên.</Text>
        )}
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Tìm theo tên, nickname hoặc SĐT…"
          placeholderTextColor={C.muted}
          autoFocus
          style={[styles.search, { color: C.text, borderColor: C.border, backgroundColor: C.field }]}
        />
        {isFetching ? <ActivityIndicator color={C.primary} /> : null}
        <FlatList
          data={results}
          keyExtractor={(u: any) => String(u._id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable onPress={() => pickUser(item)} style={[styles.row, { borderColor: C.border, backgroundColor: C.card }]} disabled={isLoading}>
              <AuthorAvatar user={item} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: "800" }}>{nameOf(item)}</Text>
                {item.name && item.name !== item.nickname ? <Text style={{ color: C.sub, fontSize: 12 }}>{item.name}</Text> : null}
              </View>
              <Ionicons name="add-circle" size={24} color={C.primary} />
            </Pressable>
          )}
        />
      </View>
    </AppModal>
  );
}

export default function FanpageMembersScreen() {
  const C = useThemeTokens();
  const me = useSelector((s: any) => s?.auth?.userInfo);
  const { id } = useLocalSearchParams<{ id: string }>();
  const pageId = String(id || "");
  const { data: page } = useGetFanpageQuery(pageId, { skip: !pageId });
  const { data, isLoading } = useGetFanpageMembersQuery(pageId, { skip: !pageId });
  const [updateMember] = useUpdateFanpageMemberMutation();
  const [removeMember] = useRemoveFanpageMemberMutation();
  const [adding, setAdding] = useState(false);
  const myRole: string = data?.myRole || "";
  const items: any[] = data?.items || [];
  const myId = String(me?._id || "");

  const act = (m: any) => {
    const uid = String(m.user._id);
    const self = uid === myId;
    const opts: any[] = [];
    const run = (fn: () => Promise<any>) => async () => {
      try {
        await fn();
      } catch (e: any) {
        Alert.alert("Không thực hiện được", e?.data?.message || "Vui lòng thử lại.");
      }
    };
    if (myRole === "owner" && !self) {
      if (m.role !== "admin") opts.push({ text: "Đặt làm Quản trị viên", onPress: run(() => updateMember({ id: pageId, userId: uid, role: "admin" }).unwrap()) });
      if (m.role !== "editor") opts.push({ text: "Đặt làm Biên tập viên", onPress: run(() => updateMember({ id: pageId, userId: uid, role: "editor" }).unwrap()) });
      opts.push({
        text: "Chuyển quyền chủ sở hữu",
        onPress: () =>
          Alert.alert("Chuyển quyền sở hữu?", `${nameOf(m.user)} sẽ thành Chủ sở hữu, bạn trở thành Quản trị viên.`, [
            { text: "Huỷ", style: "cancel" },
            { text: "Chuyển", style: "destructive", onPress: run(() => updateMember({ id: pageId, userId: uid, role: "owner" }).unwrap()) },
          ]),
      });
    }
    const canRemove = !self && m.role !== "owner" && (myRole === "owner" || (myRole === "admin" && m.role === "editor"));
    if (canRemove) {
      opts.push({ text: "Gỡ khỏi Fanpage", style: "destructive", onPress: run(() => removeMember({ id: pageId, userId: uid }).unwrap()) });
    }
    if (self && m.role !== "owner") {
      opts.push({
        text: "Rời Fanpage",
        style: "destructive",
        onPress: run(async () => {
          await removeMember({ id: pageId, userId: uid }).unwrap();
          router.back();
        }),
      });
    }
    if (!opts.length) return;
    opts.push({ text: "Đóng", style: "cancel" });
    Alert.alert(nameOf(m.user), FANPAGE_ROLE_LABEL[m.role as keyof typeof FANPAGE_ROLE_LABEL], opts);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: "Quản lý thành viên", headerShown: true }} />
      <FlatList
        data={items}
        keyExtractor={(m: any) => String(m.user._id)}
        contentContainerStyle={{ padding: 16, gap: 10, maxWidth: 640, width: "100%", alignSelf: "center" }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 4 }}>
            {page ? (
              <View style={[styles.pageCard, { borderColor: C.border, backgroundColor: C.card }]}>
                <PageAvatar uri={page.avatar} size={56} C={C} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: C.text, fontWeight: "900", fontSize: 16 }} numberOfLines={1}>
                    {page.name}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12.5 }}>@{page.slug}</Text>
                </View>
                <StatusBadge status={page.status} />
              </View>
            ) : null}
            <Text style={{ color: C.text, fontWeight: "900", fontSize: 16 }}>{`Thành viên (${items.length})`}</Text>
            {isLoading ? <ActivityIndicator color={C.primary} /> : null}
          </View>
        }
        renderItem={({ item: m }) => (
          <Pressable onPress={() => act(m)} style={[styles.row, { borderColor: C.border, backgroundColor: C.card }]}>
            <AuthorAvatar user={m.user} size={44} />
            <Text style={{ flex: 1, color: C.text, fontWeight: "800", fontSize: 15 }} numberOfLines={1}>
              {nameOf(m.user)}
              {String(m.user._id) === myId ? " (bạn)" : ""}
            </Text>
            <RoleBadge role={m.role} />
            <Ionicons name="ellipsis-vertical" size={18} color={C.sub} />
          </Pressable>
        )}
        ListFooterComponent={
          <View style={{ gap: 12, marginTop: 6 }}>
            {myRole === "owner" || myRole === "admin" ? (
              <Pressable onPress={() => setAdding(true)} style={[styles.addBtn, { borderColor: C.primary }]}>
                <Ionicons name="person-add-outline" size={19} color={C.primary} />
                <Text style={{ color: C.primary, fontWeight: "900", fontSize: 15 }}>Mời thành viên</Text>
              </Pressable>
            ) : null}
            <View style={[styles.info, { borderColor: C.border, backgroundColor: C.field }]}>
              <Ionicons name="information-circle-outline" size={20} color={C.primary} />
              <Text style={{ flex: 1, color: C.sub, fontSize: 12.5, lineHeight: 18 }}>
                Chủ sở hữu: toàn quyền · Quản trị viên: đăng bài, sửa trang, thêm/gỡ biên tập viên · Biên tập viên: đăng bài & story dưới tên trang
              </Text>
            </View>
          </View>
        }
      />
      {adding ? <AddMemberModal pageId={pageId} myRole={myRole} onClose={() => setAdding(false)} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  addBtn: { height: 50, borderRadius: 14, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  info: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  roleOpt: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  search: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
});
