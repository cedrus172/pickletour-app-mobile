// app/var/ai/[id].tsx — Tiến độ + kết quả "Highlight AI phân tích".
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, View, useWindowDimensions } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { useShareToFeed } from "@/components/feed/ShareToFeedModal";
import { useCancelAiHighlightMutation, useDeleteAiHighlightMutation, useGetAiHighlightQuery } from "@/slices/varApiSlice";
import { Pill, VOLT, fmtDur } from "@/components/var/VarUi";

let MediaLibrary: typeof import("expo-media-library") | null = null;
try {
  MediaLibrary = require("expo-media-library");
} catch {
  /* bản cài cũ thiếu module native → dùng chia sẻ */
}

function Player({ url, width }: { url: string; width: number }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.play();
  });
  const h = Math.min(width * (16 / 9), 620);
  return <VideoView player={player} style={{ width: h * (9 / 16), height: h, alignSelf: "center", borderRadius: 14, backgroundColor: "#000" }} nativeControls contentFit="contain" />;
}

function Stepper({ job, C }: { job: any; C: ThemeTokens }) {
  const stages: string[] = job.stages || [];
  const cur = job.stageIndex || 0;
  return (
    <View style={{ gap: 10 }}>
      {stages.slice(1, -1).map((label, i) => {
        const k = i + 1;
        const done = cur > k;
        const now = cur === k || (cur === 0 && k === 1);
        return (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={[styles.dot, { borderColor: done || now ? C.primary : C.border, backgroundColor: done ? C.primary : "transparent" }]}>
              {done ? <Ionicons name="checkmark" size={14} color={C.onPrimary} /> : now ? <ActivityIndicator size="small" color={C.primary} /> : null}
            </View>
            <Text style={{ color: done || now ? C.text : C.sub, fontWeight: now ? "800" : "600", flex: 1 }}>{label}</Text>
            {now && job.stage === "analyze" && job.varProgress > 0 ? <Text style={{ color: C.primary, fontWeight: "800" }}>{Math.round(job.varProgress * 100)}%</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

export default function AiHighlightScreen() {
  const C = useThemeTokens();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [poll, setPoll] = useState(4000);
  const { data: job, error, refetch } = useGetAiHighlightQuery(id as string, { pollingInterval: poll, skip: !id });
  const [cancelJob] = useCancelAiHighlightMutation();
  const [deleteJob] = useDeleteAiHighlightMutation();
  const { openShare, shareModal } = useShareToFeed();
  const [saving, setSaving] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    setPoll(job && job.status !== "running" ? 0 : 4000);
  }, [job]);

  const title = job?.title || job?.summary?.court || "Highlight AI";

  const download = async () => {
    if (!job?.videoUrl || saving) return;
    setSaving(true);
    try {
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const res = await FileSystem.downloadAsync(job.videoUrl, `${dir}highlight-ai-${job._id}.mp4`);
      if (res.status >= 300) throw new Error("Không tải được video");
      let saved = false;
      if (MediaLibrary?.saveToLibraryAsync) {
        try {
          const perm = await MediaLibrary.requestPermissionsAsync(true);
          if (perm.granted) {
            await MediaLibrary.saveToLibraryAsync(res.uri);
            saved = true;
            Alert.alert("Đã lưu", "Video đã được lưu vào thư viện.");
          }
        } catch {
          saved = false;
        }
      }
      if (!saved && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(res.uri, { mimeType: "video/mp4", UTI: "public.mpeg-4", dialogTitle: "Lưu hoặc chia sẻ video" });
      }
    } catch (e: any) {
      Alert.alert("Không tải được video", e?.message || "Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const shareFeed = () =>
    openShare({
      title: "Đăng lên bảng tin",
      defaultContent: `${title} · ${job?.summary?.shots || 0} cú đánh${job?.summary?.fastestKmh ? ` · nhanh nhất ~${Math.round(job.summary.fastestKmh)} km/h` : ""} 🎾`,
      attachmentLabel: `Video Highlight AI ${fmtDur(job?.videoDurationSec || 0)}`,
      payload: {
        media: [
          {
            type: "video",
            url: job.videoUrl,
            thumbnailUrl: job.thumbUrl || undefined,
            durationMs: Math.round((job.videoDurationSec || 0) * 1000),
            mime: "video/mp4",
          },
        ],
      },
    });

  if (!job) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Stack.Screen options={{ title: "Highlight AI", headerShown: true }} />
        {error ? (
          <>
            <Text style={{ color: C.text, fontWeight: "800" }}>{(error as any)?.data?.message || "Không tải được"}</Text>
            <Pressable onPress={refetch}>
              <Text style={{ color: C.primary, fontWeight: "700" }}>Thử lại</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={C.primary} />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Highlight AI", headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: "900" }} numberOfLines={2}>{title}</Text>

        {job.status === "running" ? (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, gap: 14 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="sparkles" size={18} color={VOLT} />
              <Text style={{ color: C.text, fontWeight: "900", flex: 1 }}>AI đang dựng video</Text>
            </View>
            <Stepper job={job} C={C} />
            <Text style={{ color: C.sub, fontSize: 12.5 }}>Clip 1 phút mất khoảng 5 phút, clip 15 phút khoảng 20–40 phút. Bạn có thể rời màn này — sẽ có thông báo khi xong.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Alert.alert("Huỷ tạo video?", "PCoin sẽ được hoàn lại.", [
                  { text: "Không", style: "cancel" },
                  { text: "Huỷ", style: "destructive", onPress: () => cancelJob(job._id) },
                ])
              }
              style={[styles.btn, { borderColor: C.border, alignSelf: "flex-start" }]}
            >
              <Text style={{ color: C.text, fontWeight: "700" }}>Huỷ</Text>
            </Pressable>
          </View>
        ) : null}

        {job.status === "failed" || job.status === "cancelled" ? (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, gap: 8 }]}>
            <Ionicons name={job.status === "failed" ? "alert-circle-outline" : "close-circle-outline"} size={28} color={job.status === "failed" ? C.redText : C.sub} />
            <Text style={{ color: C.text, fontWeight: "800" }}>{job.status === "failed" ? "Không tạo được video" : "Đã huỷ"}</Text>
            {job.error?.message ? <Text style={{ color: C.sub }}>{job.error.message}</Text> : null}
            {job.pcoin?.refunded ? <Text style={{ color: C.sub, fontSize: 12.5 }}>Đã hoàn {job.pcoin.charged} PCoin.</Text> : null}
            <Pressable accessibilityRole="button" onPress={() => router.replace("/var/ai/create" as any)} style={[styles.btn, { borderColor: C.primary, alignSelf: "flex-start" }]}>
              <Text style={{ color: C.primary, fontWeight: "800" }}>Tạo lại</Text>
            </Pressable>
          </View>
        ) : null}

        {job.status === "done" && job.videoUrl ? (
          <>
            <Player url={job.videoUrl} width={width - 32} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <Pill label={`${job.summary?.rallies || 0} pha bóng`} bg={C.primary} color={C.onPrimary} />
              <Pill label={`${job.summary?.shots || 0} cú đánh`} bg={C.primary} color={C.onPrimary} />
              {job.summary?.fastestKmh ? <Pill label={`Nhanh nhất ~${Math.round(job.summary.fastestKmh)} km/h`} bg={VOLT} color="#0B1B3A" /> : null}
              <Pill label={fmtDur(job.videoDurationSec || 0)} bg={C.field} color={C.text} />
            </View>
            <Text style={{ color: C.muted, fontSize: 11.5 }}>Tốc độ và loại cú là ước lượng từ video một camera.</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable accessibilityRole="button" onPress={download} disabled={saving} style={[styles.action, { backgroundColor: C.primary }]}>
                {saving ? <ActivityIndicator color={C.onPrimary} /> : <Ionicons name="download-outline" size={18} color={C.onPrimary} />}
                <Text style={{ color: C.onPrimary, fontWeight: "800" }}>Lưu video</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={shareFeed} style={[styles.action, { borderWidth: 1, borderColor: C.border }]}>
                <Ionicons name="newspaper-outline" size={18} color={C.text} />
                <Text style={{ color: C.text, fontWeight: "800" }}>Đăng bảng tin</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Chia sẻ" onPress={() => Share.share({ message: `${title}\n${job.videoUrl}` })} style={[styles.icon, { borderColor: C.border }]}>
                <Ionicons name="share-outline" size={20} color={C.text} />
              </Pressable>
            </View>
            {job.notes?.length ? (
              <Pressable accessibilityRole="button" onPress={() => setShowNotes((v) => !v)} style={[styles.card, { backgroundColor: C.card, borderColor: C.border, gap: 6 }]}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ color: C.text, fontWeight: "800", flex: 1 }}>Ghi chú của AI ({job.notes.length})</Text>
                  <Ionicons name={showNotes ? "chevron-up" : "chevron-down"} size={16} color={C.sub} />
                </View>
                {showNotes ? job.notes.map((n: string, i: number) => <Text key={i} style={{ color: C.sub, fontSize: 13 }}>• {n}</Text>) : null}
              </Pressable>
            ) : null}
            {job.expiresAt ? (
              <Text style={{ color: C.muted, fontSize: 11.5, textAlign: "center" }}>
                Video lưu trên PickleTour tới {new Date(job.expiresAt).toLocaleDateString("vi-VN")} — hãy lưu về máy nếu muốn giữ lâu.
              </Text>
            ) : null}
          </>
        ) : null}

        {job.status !== "running" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              Alert.alert("Xoá video?", title, [
                { text: "Không", style: "cancel" },
                {
                  text: "Xoá",
                  style: "destructive",
                  onPress: async () => {
                    await deleteJob(job._id);
                    router.back();
                  },
                },
              ])
            }
            style={{ alignSelf: "center", padding: 8 }}
          >
            <Text style={{ color: C.redText, fontWeight: "700" }}>Xoá video</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      {shareModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  btn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 40, alignItems: "center", justifyContent: "center" },
  action: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 46, borderRadius: 12 },
  icon: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
