// app/fanpage/review.tsx — Admin hệ thống duyệt Fanpage ngay trong app (giống trang admin.pickletour.vn/admin/fanpages).
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { Stack, router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PageAvatar, StatusBadge } from "@/components/fanpage/FanpageUI";
import AppModal from "@/components/ui/AppModal";
import { Text } from "@/components/ui/i18nText";
import TextInput from "@/components/ui/i18nTextInput";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { FANPAGE_KIND_LABEL, useAdminListFanpagesQuery, useAdminReviewFanpageMutation } from "@/slices/fanpagesApiSlice";
import { normalizeUrl } from "@/utils/normalizeUri";

const TABS: { key: string; label: string }[] = [
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Từ chối" },
  { key: "suspended", label: "Tạm khoá" },
];

export default function FanpageReviewScreen() {
  const C = useThemeTokens();
  const [tab, setTab] = useState("pending");
  const { data, isFetching, error } = useAdminListFanpagesQuery(tab);
  const [review, { isLoading: saving }] = useAdminReviewFanpageMutation();
  const [noteFor, setNoteFor] = useState<{ page: any; status: "rejected" | "suspended" } | null>(null);
  const [note, setNote] = useState("");
  const counts = data?.counts || {};

  const doReview = async (id: string, body: any) => {
    try {
      await review({ id, ...body }).unwrap();
    } catch (e: any) {
      Alert.alert("Không lưu được", e?.data?.message || "Vui lòng thử lại.");
    }
  };

  if ((error as any)?.status === 403) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <Stack.Screen options={{ title: "Duyệt Fanpage", headerShown: true }} />
        <Text style={{ color: C.sub }}>Chỉ admin PickleTour mới vào được mục này.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: "Duyệt Fanpage", headerShown: true }} />
      <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingTop: 10 }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, { backgroundColor: on ? C.primary : C.field, borderColor: on ? C.primary : C.border }]}>
              <Text style={{ color: on ? C.onPrimary : C.text, fontWeight: "800", fontSize: 12.5 }} numberOfLines={1}>
                {`${t.label} ${counts[t.key] || 0}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        data={data?.items || []}
        keyExtractor={(p: any) => String(p._id)}
        contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 40, maxWidth: 720, width: "100%", alignSelf: "center" }}
        ListEmptyComponent={
          isFetching ? <ActivityIndicator style={{ margin: 24 }} color={C.primary} /> : <Text style={{ color: C.sub, textAlign: "center", margin: 24 }}>Không có Fanpage nào.</Text>
        }
        renderItem={({ item: p }) => (
          <View style={[styles.card, { borderColor: C.border, backgroundColor: C.card }]}>
            {p.cover ? <ExpoImage source={{ uri: normalizeUrl(p.cover) }} style={styles.cover} contentFit="cover" /> : null}
            <View style={{ padding: 12, gap: 8 }}>
              <Pressable onPress={() => router.push(`/fanpage/${p._id}` as any)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <PageAvatar uri={p.avatar} size={48} C={C} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: C.text, fontWeight: "900", fontSize: 15.5 }} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12 }} numberOfLines={1}>
                    {[`@${p.slug}`, FANPAGE_KIND_LABEL[p.kind as keyof typeof FANPAGE_KIND_LABEL], p.province].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <StatusBadge status={p.status} />
              </Pressable>
              {p.description ? (
                <Text style={{ color: C.text, fontSize: 13.5 }} numberOfLines={4}>
                  {p.description}
                </Text>
              ) : null}
              <Text style={{ color: C.sub, fontSize: 12 }}>
                {`Người tạo: ${p.createdBy?.nickname || p.createdBy?.name || "—"} · ${new Date(p.createdAt).toLocaleString("vi-VN")}`}
                {p.phone ? ` · ${p.phone}` : ""}
              </Text>
              {p.verifyDocs?.length ? (
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {p.verifyDocs.map((d: string) => (
                    <Pressable key={d} onPress={() => Linking.openURL(normalizeUrl(d)).catch(() => {})}>
                      <ExpoImage source={{ uri: normalizeUrl(d) }} style={[styles.doc, { borderColor: C.border }]} contentFit="cover" />
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {p.reviewNote ? <Text style={{ color: "#EF4444", fontSize: 12.5 }}>{`Ghi chú: ${p.reviewNote}`}</Text> : null}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: C.text, fontSize: 13, fontWeight: "700" }}>Dấu tích xanh</Text>
                <Switch value={Boolean(p.verified)} disabled={p.isOfficial || saving} onValueChange={(v) => doReview(String(p._id), { verified: v })} />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {p.status !== "approved" ? (
                  <Pressable onPress={() => doReview(String(p._id), { status: "approved" })} style={[styles.act, { backgroundColor: "#22C55E" }]} disabled={saving}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.actText}>{p.status === "pending" ? "Duyệt" : "Mở lại"}</Text>
                  </Pressable>
                ) : null}
                {p.status === "pending" ? (
                  <Pressable onPress={() => { setNote(""); setNoteFor({ page: p, status: "rejected" }); }} style={[styles.act, { backgroundColor: "#EF4444" }]} disabled={saving}>
                    <Ionicons name="close" size={16} color="#fff" />
                    <Text style={styles.actText}>Từ chối</Text>
                  </Pressable>
                ) : null}
                {p.status === "approved" && !p.isOfficial ? (
                  <Pressable onPress={() => { setNote(""); setNoteFor({ page: p, status: "suspended" }); }} style={[styles.act, { backgroundColor: "#64748B" }]} disabled={saving}>
                    <Ionicons name="lock-closed" size={15} color="#fff" />
                    <Text style={styles.actText}>Tạm khoá</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        )}
      />

      {noteFor ? (
        <AppModal visible transparent animationType="fade" onRequestClose={() => setNoteFor(null)}>
          <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={[styles.dialog, { backgroundColor: C.card }]}>
              <Text style={{ color: C.text, fontWeight: "900", fontSize: 16 }}>
                {noteFor.status === "rejected" ? "Lý do từ chối" : "Lý do tạm khoá"}
              </Text>
              <Text style={{ color: C.sub, fontSize: 12.5 }}>{`Gửi tới người quản lý ${noteFor.page.name}.`}</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={500}
                autoFocus
                placeholder="VD: Tên trang trùng CLB khác, cần thêm giấy tờ xác minh…"
                placeholderTextColor={C.muted}
                style={[styles.noteInput, { color: C.text, borderColor: C.border, backgroundColor: C.field }]}
              />
              <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
                <Pressable onPress={() => setNoteFor(null)} style={[styles.act, { backgroundColor: C.field, flex: 0, paddingHorizontal: 16 }]}>
                  <Text style={[styles.actText, { color: C.text }]}>Huỷ</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (note.trim().length < 3) return Alert.alert("Cần nhập lý do");
                    await doReview(String(noteFor.page._id), { status: noteFor.status, note: note.trim() });
                    setNoteFor(null);
                  }}
                  style={[styles.act, { backgroundColor: "#EF4444", flex: 0, paddingHorizontal: 16 }]}
                >
                  <Text style={styles.actText}>Xác nhận</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </AppModal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tab: { flex: 1, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cover: { width: "100%", height: 110 },
  doc: { width: 64, height: 64, borderRadius: 8, borderWidth: 1 },
  act: { flex: 1, height: 40, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  actText: { color: "#fff", fontWeight: "800", fontSize: 13.5 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 440, borderRadius: 18, padding: 16, gap: 10 },
  noteInput: { minHeight: 90, borderRadius: 12, borderWidth: 1, padding: 10, fontSize: 14.5, textAlignVertical: "top" },
});
