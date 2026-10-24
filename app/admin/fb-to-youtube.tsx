import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, Redirect, router } from "expo-router";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import {
  useFbytPagesQuery,
  useFbytLivesQuery,
  useFbytJobsQuery,
  useFbytUploadMutation,
  useFbytRetryMutation,
  useFbytUpdateMetaMutation,
  useFbytDeleteMutation,
} from "@/slices/fbYoutubeApiSlice";

const fmtDur = (s: number) => {
  const n = Math.max(0, Math.round(Number(s) || 0));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const ss = n % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${m}:${String(ss).padStart(2, "0")}`;
};
const fmtDate = (d: any) => (d ? new Date(d).toLocaleString("vi-VN") : "—");

const STATUS: Record<string, string> = {
  pending: "Chờ xử lý",
  downloading: "Đang tải FB",
  uploading: "Đang up YouTube",
  done: "Xong",
  failed: "Lỗi",
  canceled: "Huỷ",
};

export default function FbToYoutubeScreen() {
  const C: any = useThemeTokens();
  const userInfo = useSelector((s: any) => s.auth?.userInfo);
  const isAdmin = !!(userInfo?.isAdmin || userInfo?.role === "admin" || userInfo?.isSuperAdmin);

  const { data: pages = [], isFetching: pagesLoading } = useFbytPagesQuery(undefined, {
    skip: !isAdmin,
  });
  const [pageId, setPageId] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<Record<string, { title?: string; description?: string }>>({});
  const [editJob, setEditJob] = useState("");
  const [editVals, setEditVals] = useState<{ title: string; description: string }>({
    title: "",
    description: "",
  });

  useEffect(() => {
    if (!pageId && pages.length) setPageId(pages[0].pageId);
  }, [pages, pageId]);

  const {
    data: livesData,
    isFetching: livesLoading,
    refetch: refetchLives,
    error: livesError,
  } = useFbytLivesQuery({ pageId }, { skip: !pageId });
  const lives = livesData?.items || [];

  const { data: jobs = [], refetch: refetchJobs } = useFbytJobsQuery(
    { pageId },
    { skip: !pageId, pollingInterval: 5000 },
  );
  const hasRunning = jobs.some((j: any) =>
    ["pending", "downloading", "uploading"].includes(j.status),
  );
  useEffect(() => {
    if (!hasRunning) return;
    const t = setInterval(() => refetchLives(), 7000);
    return () => clearInterval(t);
  }, [hasRunning, refetchLives]);

  const [doUpload, { isLoading: uploading }] = useFbytUploadMutation();
  const [doRetry] = useFbytRetryMutation();
  const [doUpdateMeta, { isLoading: savingMeta }] = useFbytUpdateMetaMutation();
  const [doDelete] = useFbytDeleteMutation();

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  const confirmDelete = (j: any) => {
    const msg =
      j.status === "done" && j.ytVideoId
        ? "Sẽ XOÁ video trên YouTube và bản ghi ở PickleTour (để tải lại được). Tiếp tục?"
        : "Xoá bản ghi clip này ở PickleTour?";
    Alert.alert("Xoá clip?", msg, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: async () => {
          try {
            await doDelete(j._id).unwrap();
            refetchJobs();
            refetchLives();
          } catch (e: any) {
            alert(e?.data?.message || "Xoá thất bại");
          }
        },
      },
    ]);
  };

  if (!isAdmin) return <Redirect href="/(tabs)/more" />;

  const setEdit = (id: string, patch: any) =>
    setEdits((e) => ({ ...e, [id]: { ...(e[id] || {}), ...patch } }));

  const handleUpload = async () => {
    const videos = lives
      .filter((v: any) => selected[v.fbVideoId])
      .map((v: any) => {
        const ed = edits[v.fbVideoId] || {};
        const title = (ed.title ?? v.title ?? "").trim();
        return {
          fbVideoId: v.fbVideoId,
          title: title || v.title || "",
          description: ed.description ?? v.description ?? "",
          permalink: v.permalink,
          createdTime: v.createdTime,
          durationSec: v.durationSec,
          thumbnail: v.thumbnail,
        };
      });
    if (!videos.length) return;
    try {
      await doUpload({ pageId, videos, privacy }).unwrap();
      setSelected({});
      refetchJobs();
      refetchLives();
    } catch (e: any) {
      // eslint-disable-next-line no-alert
      alert(e?.data?.message || "Lỗi xếp hàng upload");
    }
  };

  const saveMeta = async (id: string) => {
    try {
      await doUpdateMeta({ id, title: editVals.title, description: editVals.description }).unwrap();
      setEditJob("");
      refetchJobs();
    } catch (e: any) {
      alert(e?.data?.message || "Cập nhật thất bại");
    }
  };

  const chip = (label: string, on: boolean, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: on ? C.primary : "transparent",
        borderColor: on ? C.primary : C.border,
      }}
    >
      <Text style={{ color: on ? C.onPrimary : C.text, fontWeight: "700", fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );

  const input = (value: string, onChangeText: (t: string) => void, props: any = {}) => (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor={C.muted}
      style={{
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.field,
        color: C.text,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        fontSize: 15,
      }}
      {...props}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4, marginRight: 6 }}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={{ color: C.text, fontWeight: "900", fontSize: 18, flex: 1 }}>
          FB VOD → YouTube
        </Text>
        <Pressable onPress={() => refetchLives()} hitSlop={10} style={{ padding: 4 }}>
          <Ionicons name="refresh" size={22} color={C.primary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <Text style={{ color: C.muted, marginBottom: 10, lineHeight: 19 }}>
            Chọn fanpage → tích VOD của buổi live đã kết thúc → sửa tiêu đề/mô tả nếu cần → Up lên
            YouTube. Lưu ý quota upload ~6 video/ngày.
          </Text>

          <Text style={{ color: C.text2, fontWeight: "800", marginBottom: 6 }}>Fanpage</Text>
          {pagesLoading ? (
            <ActivityIndicator color={C.primary} />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {pages.map((p: any) =>
                chip(`${p.pageName}${p.needsReauth ? " ⚠️" : ""}`, pageId === p.pageId, () => {
                  setPageId(p.pageId);
                  setSelected({});
                }),
              )}
              {!pages.length && <Text style={{ color: C.muted }}>(chưa có fanpage trong pool)</Text>}
            </View>
          )}

          <Text style={{ color: C.text2, fontWeight: "800", marginTop: 8, marginBottom: 6 }}>
            Chế độ video YouTube
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {chip("Công khai", privacy === "public", () => setPrivacy("public"))}
            {chip("Không liệt kê", privacy === "unlisted", () => setPrivacy("unlisted"))}
            {chip("Riêng tư", privacy === "private", () => setPrivacy("private"))}
          </View>

          {selectedIds.length > 0 ? (
            <Pressable
              onPress={handleUpload}
              disabled={uploading}
              style={{
                backgroundColor: C.primary,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
                marginVertical: 10,
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <Text style={{ color: C.onPrimary, fontWeight: "900" }}>
                {uploading ? "Đang xếp hàng…" : `Up ${selectedIds.length} video lên YouTube`}
              </Text>
            </Pressable>
          ) : null}

          {livesError ? (
            <View
              style={{
                backgroundColor: C.redSoft,
                borderRadius: 10,
                padding: 10,
                marginVertical: 8,
              }}
            >
              <Text style={{ color: C.redText }}>
                {(livesError as any)?.data?.message || "Không tải được VOD. Kiểm tra token fanpage."}
              </Text>
            </View>
          ) : null}

          <Text style={{ color: C.text, fontWeight: "900", fontSize: 15, marginTop: 10, marginBottom: 6 }}>
            VOD live đã kết thúc ({lives.length}){livesLoading ? "  …" : ""}
          </Text>
          {!lives.length && !livesLoading ? (
            <Text style={{ color: C.muted }}>Fanpage này chưa có buổi live nào đã kết thúc.</Text>
          ) : null}

          {lives.map((v: any) => {
            const up = v.upload;
            const disabled = up && !["failed", "canceled"].includes(up.status);
            const isSel = !!selected[v.fbVideoId];
            const ed = edits[v.fbVideoId] || {};
            return (
              <View
                key={v.fbVideoId}
                style={{
                  borderWidth: 1,
                  borderColor: isSel ? C.primary : C.border,
                  backgroundColor: C.card,
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: 10,
                }}
              >
                <Pressable
                  onPress={() =>
                    !disabled && setSelected((s) => ({ ...s, [v.fbVideoId]: !s[v.fbVideoId] }))
                  }
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <Ionicons
                    name={isSel ? "checkbox" : "square-outline"}
                    size={22}
                    color={disabled ? C.muted : isSel ? C.primary : C.text2}
                    style={{ marginRight: 8 }}
                  />
                  {v.thumbnail ? (
                    <Image
                      source={{ uri: v.thumbnail }}
                      style={{ width: 84, height: 48, borderRadius: 6, marginRight: 8 }}
                    />
                  ) : (
                    <View
                      style={{ width: 84, height: 48, borderRadius: 6, marginRight: 8, backgroundColor: C.field }}
                    />
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={2} style={{ color: C.text, fontWeight: "700" }}>
                      {v.title || "(không tiêu đề)"}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 12 }}>
                      {fmtDate(v.createdTime)} · {fmtDur(v.durationSec)}
                    </Text>
                  </View>
                </Pressable>

                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                  {v.permalink ? (
                    <Pressable onPress={() => Linking.openURL(v.permalink)} style={{ marginRight: 14 }}>
                      <Text style={{ color: C.primary, fontSize: 12 }}>Xem FB ↗</Text>
                    </Pressable>
                  ) : null}
                  {up ? (
                    <Text
                      style={{
                        color: up.status === "done" ? C.greenText : up.status === "failed" ? C.redText : C.amberText,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {STATUS[up.status] || up.status}
                    </Text>
                  ) : (
                    <Text style={{ color: C.muted, fontSize: 12 }}>Chưa up</Text>
                  )}
                  {up?.ytUrl ? (
                    <Pressable onPress={() => Linking.openURL(up.ytUrl)} style={{ marginLeft: 12 }}>
                      <Text style={{ color: C.primary, fontSize: 12 }}>YouTube ↗</Text>
                    </Pressable>
                  ) : null}
                </View>

                {isSel && !disabled ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ color: C.text2, fontSize: 12, marginBottom: 4 }}>Tiêu đề YouTube</Text>
                    {input(ed.title ?? v.title ?? "", (t) => setEdit(v.fbVideoId, { title: t }), {
                      maxLength: 100,
                    })}
                    <Text style={{ color: C.text2, fontSize: 12, marginTop: 8, marginBottom: 4 }}>
                      Mô tả (trống = tự ghi link nguồn FB)
                    </Text>
                    {input(ed.description ?? v.description ?? "", (t) => setEdit(v.fbVideoId, { description: t }), {
                      multiline: true,
                      numberOfLines: 3,
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}

          <Text style={{ color: C.text, fontWeight: "900", fontSize: 15, marginTop: 16, marginBottom: 6 }}>
            Nhật ký upload
          </Text>
          {!jobs.length ? (
            <Text style={{ color: C.muted }}>Chưa có job nào.</Text>
          ) : (
            jobs.map((j: any) => (
              <View
                key={j._id}
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  backgroundColor: C.card,
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: C.text, fontWeight: "700" }}>
                      {j.ytTitle || j.fbTitle || j.fbVideoId}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 12 }}>
                      {fmtDate(j.updatedAt)}
                      {j.error ? ` · ${j.error}` : ""}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: j.status === "done" ? C.greenText : j.status === "failed" ? C.redText : C.amberText,
                      fontWeight: "800",
                      fontSize: 12,
                      marginLeft: 8,
                    }}
                  >
                    {STATUS[j.status] || j.status}
                    {["downloading", "uploading"].includes(j.status) ? ` ${j.progress || 0}%` : ""}
                  </Text>
                  {j.ytUrl ? (
                    <Pressable onPress={() => Linking.openURL(j.ytUrl)} style={{ marginLeft: 10 }}>
                      <Ionicons name="logo-youtube" size={20} color="#ff0033" />
                    </Pressable>
                  ) : null}
                  {j.status === "done" && j.ytVideoId ? (
                    <Pressable
                      onPress={() => {
                        setEditJob(editJob === j._id ? "" : j._id);
                        setEditVals({
                          title: j.ytTitle || j.fbTitle || "",
                          description: j.fbDescription || "",
                        });
                      }}
                      hitSlop={8}
                      style={{ marginLeft: 12 }}
                    >
                      <Ionicons name="create-outline" size={20} color={C.primary} />
                    </Pressable>
                  ) : null}
                  {["failed", "canceled"].includes(j.status) ? (
                    <Pressable onPress={() => doRetry(j._id)} hitSlop={8} style={{ marginLeft: 12 }}>
                      <Ionicons name="reload" size={20} color={C.primary} />
                    </Pressable>
                  ) : null}
                  {!["pending", "downloading", "uploading"].includes(j.status) ? (
                    <Pressable onPress={() => confirmDelete(j)} hitSlop={8} style={{ marginLeft: 12 }}>
                      <Ionicons name="trash-outline" size={20} color={C.redText} />
                    </Pressable>
                  ) : null}
                </View>

                {editJob === j._id ? (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ color: C.text2, fontSize: 12, marginBottom: 4 }}>Tiêu đề YouTube</Text>
                    {input(editVals.title, (t) => setEditVals((s) => ({ ...s, title: t })), { maxLength: 100 })}
                    <Text style={{ color: C.text2, fontSize: 12, marginTop: 8, marginBottom: 4 }}>Mô tả</Text>
                    {input(editVals.description, (t) => setEditVals((s) => ({ ...s, description: t })), {
                      multiline: true,
                      numberOfLines: 3,
                    })}
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
                      <Pressable onPress={() => setEditJob("")} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                        <Text style={{ color: C.text2, fontWeight: "700" }}>Huỷ</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => saveMeta(j._id)}
                        disabled={savingMeta || !editVals.title.trim()}
                        style={{
                          backgroundColor: C.primary,
                          borderRadius: 10,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          opacity: savingMeta || !editVals.title.trim() ? 0.5 : 1,
                        }}
                      >
                        <Text style={{ color: C.onPrimary, fontWeight: "800" }}>
                          {savingMeta ? "Đang lưu…" : "Lưu lên YouTube"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
