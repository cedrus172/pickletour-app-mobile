// app/var/[id].tsx — Kết quả Highlight & VAR của một video (mockup docs/mockups/highlight-var-3-ket-qua.png)
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useShareToFeed } from "@/components/feed/ShareToFeedModal";
import { useGetVarJobQuery, useRebuildVarHighlightMutation } from "@/slices/varApiSlice";
import { ORANGE, Pill, ScoreChart, VOLT, callLabel, fmtDur } from "@/components/var/VarUi";

let MediaLibrary: typeof import("expo-media-library") | null = null;
try {
  MediaLibrary = require("expo-media-library");
} catch {
  /* bản cài cũ thiếu module native → dùng chia sẻ */
}

type Tab = "highlight" | "rallies" | "var";

/** Trình phát (hook top-level, đổi nguồn bằng replace). */
function Player({ url, seek }: { url: string; seek?: { t: number; n: number } | null }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  useEffect(() => {
    if (!seek) return;
    try {
      player.currentTime = Math.max(0, seek.t);
      player.play();
    } catch {
      /* chưa nạp xong */
    }
  }, [seek, player]);
  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />;
}

export default function VarResultScreen() {
  const C = useThemeTokens();
  const { id, t } = useLocalSearchParams<{ id: string; t?: string }>();
  const [poll, setPoll] = useState(6000);
  const { data: job, isLoading, refetch, error } = useGetVarJobQuery(String(id), {
    pollingInterval: poll,
    skip: !id,
  });
  // Chỉ tự làm mới khi còn đang xử lý / đang dựng highlight.
  useEffect(() => {
    const busy = !job || !["done", "failed", "cancelled"].includes(job.status) || job.highlight?.status === "building";
    setPoll(busy ? 6000 : 0);
  }, [job]);
  const [rebuild, { isLoading: rebuilding }] = useRebuildVarHighlightMutation();
  const { openShare, shareModal } = useShareToFeed();
  const [tab, setTab] = useState<Tab>("highlight");
  const [mode, setMode] = useState<"full" | "highlight">("full");
  const [seek, setSeek] = useState<{ t: number; n: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (t != null && t !== "") {
      setMode("full");
      setSeek({ t: Number(t), n: Date.now() });
    }
  }, [t]);

  const rallies: any[] = job?.result?.rallies || [];
  const nearName = job?.teams?.near || "Đội gần";
  const farName = job?.teams?.far || "Đội xa";
  const teamName = (k?: string | null) => (k === "near" ? nearName : k === "far" ? farName : "Chưa rõ");
  const varRallies = useMemo(() => rallies.filter((r) => (r.replays || []).length || r.check || r.uncertain || (r.foot_faults || []).length), [rallies]);
  const url = mode === "highlight" && job?.highlight?.url ? job.highlight.url : job?.videoUrl || "";

  const download = async () => {
    if (!url || saving) return;
    setSaving(true);
    try {
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const res = await FileSystem.downloadAsync(url, `${dir}var-${job._id}-${mode}.mp4`);
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

  const shareFeed = () => {
    const hl = job?.highlight?.status === "done";
    openShare({
      title: "Đăng lên bảng tin",
      defaultContent: `${job?.title || "Video trận"} · ${job?.summary?.score?.near ?? 0}–${job?.summary?.score?.far ?? 0} 🎾`,
      attachmentLabel: hl ? `Video highlight ${fmtDur(job.highlight.durationSec)}` : "Video phân tích",
      payload: {
        media: [
          {
            type: "video",
            url: hl ? job.highlight.url : job.videoUrl,
            thumbnailUrl: job.thumbUrl || undefined,
            durationMs: Math.round((hl ? job.highlight.durationSec : job.durationSec || 0) * 1000),
            mime: "video/mp4",
          },
        ],
      },
    });
  };

  if (error && !job) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 }}>
        <Stack.Screen options={{ title: "Highlight & VAR", headerShown: true }} />
        <Ionicons name="alert-circle-outline" size={34} color={C.sub} />
        <Text style={{ color: C.text, fontWeight: "800", textAlign: "center" }}>{(error as any)?.data?.message || "Không mở được video này"}</Text>
        <Pressable onPress={() => router.replace("/var" as any)}>
          <Text style={{ color: C.primary, fontWeight: "700" }}>Về danh sách</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading || !job) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <Stack.Screen options={{ title: "Highlight & VAR", headerShown: true }} />
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  if (job.status !== "done") {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 }}>
        <Stack.Screen options={{ title: job.title || "Highlight & VAR", headerShown: true }} />
        {["failed", "cancelled"].includes(job.status) ? (
          <Ionicons name="alert-circle-outline" size={36} color={C.redText} />
        ) : (
          <ActivityIndicator color={C.primary} />
        )}
        <Text style={{ color: C.text, fontWeight: "800", textAlign: "center" }}>
          {job.status === "failed" ? job.error?.message || "Phân tích thất bại" : job.status === "cancelled" ? "Đã huỷ" : "Video đang được xử lý…"}
        </Text>
        {["failed", "cancelled"].includes(job.status) && job.pcoin?.refunded ? (
          <Text style={{ color: C.sub, textAlign: "center" }}>Đã hoàn {job.pcoin.charged} PCoin vào ví của bạn.</Text>
        ) : null}
        <Pressable onPress={() => router.replace("/var" as any)}>
          <Text style={{ color: C.primary, fontWeight: "700" }}>Về danh sách</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: job.title || "Highlight & VAR",
          headerShown: true,
          headerRight: () => (
            <Pressable hitSlop={10} accessibilityLabel="Chia sẻ" onPress={() => Share.share({ message: `${job.title}\n${job.highlight?.url || job.videoUrl}` })}>
              <Ionicons name="share-outline" size={22} color={C.text} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <Text style={{ color: C.sub, textAlign: "center", marginTop: 6, fontSize: 12.5 }}>
          {[job.source?.venueName, job.source?.channelName, new Date(job.createdAt).toLocaleDateString("vi-VN"), job.durationSec ? fmtDur(job.durationSec) : ""]
            .filter(Boolean)
            .join(" · ")}
        </Text>

        <View style={{ marginTop: 10 }}>
          {url ? <Player url={url} seek={seek} /> : <View style={[styles.video, { alignItems: "center", justifyContent: "center" }]}><Text style={{ color: "#fff" }}>Video đã hết hạn lưu</Text></View>}
        </View>

        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 14, marginTop: 12 }}>
          <Pressable accessibilityRole="button" disabled={saving || !url} onPress={download} style={[styles.btn, { backgroundColor: C.primary, borderColor: C.primary }]}>
            {saving ? <ActivityIndicator color={C.onPrimary} /> : <Ionicons name="download-outline" size={17} color={C.onPrimary} />}
            <Text style={{ color: C.onPrimary, fontWeight: "800" }}>Tải video</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => Share.share({ message: `${job.title}\n${job.highlight?.url || job.videoUrl}` })}
            style={[styles.btn, { borderColor: C.border }]}
          >
            <Ionicons name="arrow-redo-outline" size={17} color={C.text} />
            <Text style={{ color: C.text, fontWeight: "800" }}>Chia sẻ</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={!url} onPress={shareFeed} style={[styles.btn, { borderColor: C.border }]}>
            <Ionicons name="newspaper-outline" size={17} color={C.text} />
            <Text style={{ color: C.text, fontWeight: "800" }} numberOfLines={1}>Đăng bảng tin</Text>
          </Pressable>
        </View>

        <View style={[styles.tabs, { borderBottomColor: C.border }]}>
          {[
            { k: "highlight" as const, label: "Highlight" },
            { k: "rallies" as const, label: `Các pha (${rallies.length})` },
            { k: "var" as const, label: `VAR (${varRallies.length})` },
          ].map((x) => (
            <Pressable key={x.k} accessibilityRole="tab" accessibilityState={{ selected: tab === x.k }} onPress={() => setTab(x.k)} style={styles.tabItem}>
              <Text style={{ color: tab === x.k ? VOLT : C.text, fontWeight: "800", fontSize: 15 }}>{x.label}</Text>
              <View style={{ height: 3, alignSelf: "stretch", marginTop: 8, backgroundColor: tab === x.k ? VOLT : "transparent", borderRadius: 2 }} />
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: 14, gap: 12, marginTop: 12 }}>
          {tab === "highlight" ? (
            <>
              <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ color: C.text, fontWeight: "900", fontSize: 16 }}>Video highlight tự động</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={rebuilding || job.highlight?.status === "building"}
                    onPress={() => rebuild(job._id).then(() => refetch())}
                    style={[styles.smallBtn, { borderColor: C.border }]}
                  >
                    <Text style={{ color: C.text, fontWeight: "700", fontSize: 13 }}>Tạo lại</Text>
                  </Pressable>
                </View>
                {job.highlight?.status === "done" ? (
                  <Pressable onPress={() => { setMode("highlight"); setSeek({ t: 0, n: Date.now() }); }} style={{ flexDirection: "row", gap: 12, marginTop: 10, alignItems: "center" }}>
                    <View style={[styles.hlThumb, { backgroundColor: C.field }]}>
                      {job.thumbUrl ? <ExpoImage source={{ uri: job.thumbUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                      <View style={styles.play}><Ionicons name="play" size={18} color="#fff" /></View>
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={{ color: C.sub }}>{`${fmtDur(job.highlight.durationSec)} · ${job.highlight.rallies?.length || 0} pha hay nhất`}</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {["Pha dài nhất", "Cú nhanh nhất", "Quả sát vạch"].map((l) => (
                          <View key={l} style={[styles.tag, { borderColor: C.border }]}>
                            <Text style={{ color: C.text, fontSize: 12 }}>{l}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </Pressable>
                ) : job.highlight?.status === "building" ? (
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginTop: 10 }}>
                    <ActivityIndicator color={C.primary} />
                    <Text style={{ color: C.sub }}>Đang dựng highlight…</Text>
                  </View>
                ) : (
                  <Text style={{ color: C.sub, marginTop: 8 }}>Chưa dựng được highlight (cần ít nhất một pha rõ ràng).</Text>
                )}
                {mode === "highlight" ? (
                  <Pressable onPress={() => setMode("full")} style={{ marginTop: 8 }}>
                    <Text style={{ color: C.primary, fontWeight: "700" }}>Xem video đầy đủ</Text>
                  </Pressable>
                ) : null}
              </View>
              {rallies.length ? (
                <View>
                  <Text style={{ color: C.text, fontWeight: "900", fontSize: 16, marginBottom: 6 }}>Diễn biến tỉ số</Text>
                  <ScoreChart rallies={rallies} C={C} nearName={nearName} farName={farName} />
                </View>
              ) : null}
              {rallies.slice(-3).map((r) => (
                <RallyRow key={r.index} r={r} C={C} teamName={teamName} onPress={() => router.push({ pathname: "/var/rally", params: { id: job._id, index: String(r.index) } } as any)} />
              ))}
            </>
          ) : tab === "rallies" ? (
            rallies.length ? (
              rallies.map((r) => (
                <RallyRow key={r.index} r={r} C={C} teamName={teamName} onPress={() => router.push({ pathname: "/var/rally", params: { id: job._id, index: String(r.index) } } as any)} />
              ))
            ) : (
              <Text style={{ color: C.sub, textAlign: "center" }}>Máy không nhận ra pha bóng nào (cần thấy cú giao bóng từ sau vạch cuối sân).</Text>
            )
          ) : varRallies.length ? (
            varRallies.map((r) => (
              <RallyRow key={r.index} r={r} C={C} teamName={teamName} var onPress={() => router.push({ pathname: "/var/rally", params: { id: job._id, index: String(r.index) } } as any)} />
            ))
          ) : (
            <Text style={{ color: C.sub, textAlign: "center" }}>Không có pha nào cần VAR.</Text>
          )}
          {job.usedAutoCourt ? (
            <Text style={{ color: C.muted, fontSize: 11.5, textAlign: "center" }}>
              Camera chưa được đánh dấu sân — sân do AI tự xác định nên kết luận trong/ngoài với quả sát vạch kém chính xác hơn.
            </Text>
          ) : null}
          <Text style={{ color: C.muted, fontSize: 11.5, textAlign: "center" }}>
            Kết quả ước tính từ một camera, không phải trọng tài điện tử. Video lưu đến {job.expiresAt ? new Date(job.expiresAt).toLocaleDateString("vi-VN") : "—"}.
          </Text>
        </View>
      </ScrollView>
      {shareModal}
    </SafeAreaView>
  );
}

function RallyRow({ r, C, teamName, onPress, var: isVar }: { r: any; C: any; teamName: (k?: string | null) => string; onPress: () => void; var?: boolean }) {
  const lastBounce = (r.bounces || []).filter((b: any) => b.call).slice(-1)[0];
  const cl = callLabel(lastBounce?.call);
  const hasVar = (r.replays || []).length > 0;
  const review = r.uncertain || r.check?.needs_review;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.rally, { backgroundColor: C.card, borderColor: review ? ORANGE : C.border }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: C.text, fontWeight: "800" }} numberOfLines={2}>
          {`Pha ${r.index}`}
          <Text style={{ color: C.sub, fontWeight: "500" }}>{` · ${teamName(r.server)} giao · ${r.reason_text || ""}`}</Text>
        </Text>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {r.top_speed_kmh ? <Pill label={`${Math.round(r.top_speed_kmh)} km/h`} bg={C.field} color={C.text} /> : null}
          {hasVar ? <Pill label="VAR" bg={C.primary} color={C.onPrimary} /> : null}
          {isVar && lastBounce?.call ? <Pill label={cl.text} bg={cl.color} color="#fff" /> : null}
          {review ? <Pill label="Cần xem lại" bg={ORANGE} color="#1F1300" /> : null}
          {r.edited ? <Pill label="Đã sửa" bg={C.field} color={C.sub} /> : null}
        </View>
      </View>
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 18 }}>
        <Text style={{ color: r.winner === "near" ? VOLT : C.text }}>{r.score_after?.near ?? 0}</Text>
        {" – "}
        <Text style={{ color: r.winner === "far" ? C.primary : C.text }}>{r.score_after?.far ?? 0}</Text>
      </Text>
      <Ionicons name="chevron-forward" size={18} color={C.sub} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  video: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
  btn: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", height: 44, borderRadius: 12, borderWidth: 1 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, marginTop: 14 },
  tabItem: { flex: 1, alignItems: "center", paddingTop: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 12 },
  smallBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 32, justifyContent: "center" },
  hlThumb: { width: 124, height: 72, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  play: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)" },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  rally: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 12 },
});
