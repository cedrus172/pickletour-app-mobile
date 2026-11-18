// app/var/rally.tsx — VAR một pha (mockup docs/mockups/highlight-var-4-var-pha.png)
import React, { useEffect } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useCheckVarRallyMutation, useEditVarRallyMutation, useGetVarJobQuery } from "@/slices/varApiSlice";
import { MiniCourt, ORANGE, VOLT, callLabel, fmtDur } from "@/components/var/VarUi";

const cm = (m?: number | null) => (m == null ? "—" : `${Math.round(Math.abs(Number(m)) * 100)} cm`);

/** Phát đoạn video kết quả quanh pha (có đoạn mô phỏng chèn sau pha). */
function Replay({ url, start, end }: { url: string; start: number; end: number }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.muted = true;
  });
  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status }: any) => {
      if (status === "readyToPlay") {
        try {
          player.currentTime = start;
          player.play();
        } catch {
          /* bỏ qua */
        }
      }
    });
    const timer = setInterval(() => {
      try {
        if (player.currentTime > end) player.pause();
      } catch {
        /* bỏ qua */
      }
    }, 300);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [player, start, end]);
  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />;
}

export default function VarRallyScreen() {
  const C = useThemeTokens();
  const { id, index } = useLocalSearchParams<{ id: string; index: string }>();
  const { data: job } = useGetVarJobQuery(String(id), { skip: !id });
  const [check, { isLoading: checking }] = useCheckVarRallyMutation();
  const [edit, { isLoading: editing }] = useEditVarRallyMutation();
  const r = (job?.result?.rallies || []).find((x: any) => String(x.index) === String(index));

  if (!job || !r) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <Stack.Screen options={{ title: `VAR · Pha ${index}`, headerShown: true }} />
        <ActivityIndicator color={C.primary} />
      </View>
    );
  }

  const nearName = job.teams?.near || "Đội gần";
  const farName = job.teams?.far || "Đội xa";
  const teamName = (k?: string | null) => (k === "near" ? nearName : k === "far" ? farName : "Chưa rõ");
  const replay = (r.replays || []).find((x: any) => x.rally_ending) || (r.replays || [])[0];
  const decisive = replay || (r.bounces || []).filter((b: any) => b.call).slice(-1)[0];
  const cl = callLabel(decisive?.call);
  const hasSim = !!replay;
  const playStart = Math.max(0, (r.video_start_s ?? 0) - (hasSim ? 0 : 1));
  const playEnd = (r.video_end_s ?? playStart + 10) + (hasSim ? 4.5 : 1);
  const ai = r.check;
  const feet: any[] = r.foot_faults || [];

  const askAi = async () => {
    try {
      await check({ id: job._id, index: r.index }).unwrap();
    } catch (e: any) {
      Alert.alert("Không soi lại được", e?.data?.message || "Vui lòng thử lại.");
    }
  };

  const editResult = () =>
    Alert.alert("Sửa kết quả pha", "Đội thắng pha này là:", [
      { text: nearName, onPress: () => edit({ id: job._id, index: r.index, winner: "near" }) },
      { text: farName, onPress: () => edit({ id: job._id, index: r.index, winner: "far" }) },
      ...(r.edited ? [{ text: "Khôi phục kết quả máy", onPress: () => edit({ id: job._id, index: r.index, winner: null }) }] : []),
      { text: "Huỷ", style: "cancel" as const },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: `VAR · Pha ${r.index}`, headerShown: true }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <Text style={{ color: C.sub, paddingHorizontal: 16, marginTop: 6 }}>
          {`Tỉ số sau pha: ${r.score_after?.near ?? 0} – ${r.score_after?.far ?? 0} · ${fmtDur(r.start_s)}`}
        </Text>

        <View style={{ marginTop: 10 }}>
          {job.videoUrl ? <Replay url={job.videoUrl} start={hasSim ? Math.max(playStart, (r.video_end_s ?? 0) - 1) : playStart} end={playEnd} /> : null}
          {hasSim ? (
            <View style={styles.simTag}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11 }}>MÔ PHỎNG</Text>
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 14, gap: 12, marginTop: 12 }}>
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, flexDirection: "row", alignItems: "center", gap: 12 }]}>
            <View style={[styles.verdict, { backgroundColor: cl.color }]}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}>{cl.text}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.text, fontWeight: "800" }}>
                {decisive?.margin_m != null ? `Cách vạch ${cm(decisive.margin_m)}` : r.reason_text || ""}
                {replay?.uncertainty_m != null ? ` · Sai số ±${cm(replay.uncertainty_m)}` : ""}
              </Text>
              <Text style={{ color: C.sub, fontSize: 12.5 }}>
                {replay ? (replay.rally_ending ? "Quả kết thúc pha" : "Quả sát vạch giữa pha") : "Quả nảy cuối"}
                {` · ${teamName(r.winner)} thắng pha`}
                {r.edited ? " (đã sửa)" : ""}
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.h, { color: C.text }]}>Đường bóng trong pha</Text>
            <MiniCourt bounces={r.bounces || []} C={C} />
            <Text style={{ color: C.muted, fontSize: 11.5 }}>
              {`${r.shots_count || 0} cú đánh · nhanh nhất ${r.top_speed_kmh ? Math.round(r.top_speed_kmh) : "—"} km/h · ${teamName(r.server)} giao`}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, gap: 8 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.h, { color: C.text, marginBottom: 0 }]}>AI kiểm tra chéo</Text>
              <Ionicons name="sparkles" size={16} color={VOLT} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                {checking ? (
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <ActivityIndicator color={C.primary} />
                    <Text style={{ color: C.sub }}>Đang soi lại… (10–60 giây)</Text>
                  </View>
                ) : ai?.error ? (
                  <Text style={{ color: C.redText }}>{String(ai.error)}</Text>
                ) : ai ? (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name={ai.needs_review ? "alert-circle" : "checkmark-circle"} size={20} color={ai.needs_review ? ORANGE : VOLT} />
                      <Text style={{ color: ai.needs_review ? ORANGE : VOLT, fontWeight: "800" }}>{ai.needs_review ? "Ngược với máy — cần xem lại" : "Đồng ý với máy"}</Text>
                    </View>
                    <Text style={{ color: C.sub, fontSize: 12.5 }}>{ai.claude?.text || ai.review_reason || ""}</Text>
                  </>
                ) : (
                  <Text style={{ color: C.sub, fontSize: 12.5 }}>Chưa soi lại pha này.</Text>
                )}
              </View>
              {job.canCheck ? (
                <Pressable accessibilityRole="button" disabled={checking} onPress={askAi} style={[styles.outline, { borderColor: C.border }]}>
                  <Text style={{ color: C.text, fontWeight: "700", fontSize: 13 }}>Nhờ AI soi lại</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {feet.length ? (
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, gap: 8 }]}>
              <Text style={[styles.h, { color: C.text, marginBottom: 0 }]}>Lỗi chân trong bếp</Text>
              {feet.map((f, i) => (
                <View key={i} style={{ gap: 4 }}>
                  <View style={[styles.flag, { backgroundColor: f.level === "fault" ? "#B91C1C" : "#C2410C" }]}>
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{f.level === "fault" ? "Lỗi" : "Cần xem lại"}</Text>
                  </View>
                  <Text style={{ color: C.sub, fontSize: 12.5 }}>{f.text || `${teamName(f.team)} · mắt cá qua vạch ${cm(f.ankle_past_line_m)}`}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: C.bg }]}>
        <Pressable accessibilityRole="button" disabled={editing} onPress={editResult} style={[styles.footBtn, { borderColor: C.border }]}>
          <Text style={{ color: C.text, fontWeight: "800" }}>Sửa kết quả pha</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate({ pathname: "/var/[id]", params: { id: job._id, t: String(Math.max(0, (r.video_start_s ?? 0) - 1)) } } as any)}
          style={[styles.footBtn, { backgroundColor: C.primary, borderColor: C.primary }]}
        >
          <Text style={{ color: C.onPrimary, fontWeight: "800" }}>Xem trong video</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  video: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
  simTag: { position: "absolute", top: 10, left: 10, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  card: { borderWidth: 1, borderRadius: 16, padding: 12 },
  verdict: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999 },
  h: { fontSize: 15.5, fontWeight: "800", marginBottom: 6 },
  outline: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 38, justifyContent: "center" },
  flag: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 16 },
  footBtn: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
