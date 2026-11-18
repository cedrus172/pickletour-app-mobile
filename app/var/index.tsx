// app/var/index.tsx — Highlight & VAR: danh sách video đang xử lý / đã xong (mockup highlight-var-2-danh-sach.png)
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useCancelVarJobMutation, useDeleteVarJobMutation, useListVarJobsQuery } from "@/slices/varApiSlice";
import { ORANGE, Pill, StageStepper, VOLT, etaText, fmtDur } from "@/components/var/VarUi";

export default function VarListScreen() {
  const C = useThemeTokens();
  const [tab, setTab] = useState<"active" | "done">("active");
  const loggedIn = !!useSelector((st: any) => st?.auth?.userInfo?._id);
  const { data: all, isFetching, refetch, error } = useListVarJobsQuery(undefined, { pollingInterval: 8000, skip: !loggedIn });
  const [cancelJob] = useCancelVarJobMutation();
  const [deleteJob] = useDeleteVarJobMutation();
  const jobs: any[] = all?.jobs || [];
  const activeStatuses = ["preparing", "queued", "running", "finishing"];
  const active = jobs.filter((j) => activeStatuses.includes(j.status));
  const done = jobs.filter((j) => !activeStatuses.includes(j.status));
  const recentDone = done.slice(0, 5);
  const shown = tab === "active" ? active : done;

  const Thumb = ({ j, small }: { j: any; small?: boolean }) => (
    <View style={[styles.thumb, small && { width: 112, height: 72 }, { backgroundColor: C.field, borderColor: C.border }]}>
      {j.thumbUrl ? <ExpoImage source={{ uri: j.thumbUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Ionicons name="videocam-outline" size={26} color={C.sub} />}
      {j.status === "done" ? (
        <>
          <View style={styles.play}>
            <Ionicons name="play" size={20} color="#fff" />
          </View>
          {j.durationSec ? (
            <View style={styles.dur}>
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{fmtDur(j.durationSec)}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );

  const DoneCard = ({ j }: { j: any }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => (j.status === "done" ? router.push(`/var/${j._id}` as any) : null)}
      onLongPress={() =>
        Alert.alert("Xoá video?", j.title, [
          { text: "Huỷ", style: "cancel" },
          { text: "Xoá", style: "destructive", onPress: () => deleteJob(j._id) },
        ])
      }
      style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}
    >
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Thumb j={j} small />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={[styles.title, { color: C.text }]} numberOfLines={2}>{j.title}</Text>
          {j.status === "done" ? (
            <>
              <Text style={{ color: C.sub, fontSize: 12.5 }} numberOfLines={1}>
                {`${j.summary?.score?.near ?? 0} – ${j.summary?.score?.far ?? 0} · ${j.summary?.rallies || 0} pha`}
                {j.summary?.topSpeedKmh ? ` · Nhanh nhất ${j.summary.topSpeedKmh} km/h` : ""}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {j.highlight?.status === "done" ? <Pill label={`Highlight ${fmtDur(j.highlight.durationSec)}`} bg={VOLT} color="#0B1B3A" /> : null}
                {j.summary?.varCount ? <Pill label={`VAR ${j.summary.varCount} pha`} bg={C.primary} color={C.onPrimary} /> : null}
                {j.summary?.reviewCount ? <Pill label={`${j.summary.reviewCount} pha cần xem lại`} bg={ORANGE} color="#1F1300" /> : null}
              </View>
            </>
          ) : (
            <Text style={{ color: j.status === "failed" ? C.redText : C.sub, fontSize: 12.5 }}>
              {j.status === "failed" ? j.error?.message || "Phân tích thất bại" : "Đã huỷ"}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Highlight & VAR", headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} refreshControl={<RefreshControl refreshing={isFetching && !!all} onRefresh={refetch} tintColor={C.primary} />}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
            {[
              { k: "active" as const, label: `Đang xử lý (${all?.counts?.active ?? active.length})` },
              { k: "done" as const, label: `Đã xong (${all?.counts?.done ?? done.length})` },
            ].map((t) => (
              <Pressable
                key={t.k}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t.k }}
                onPress={() => setTab(t.k)}
                style={[styles.tab, { borderColor: tab === t.k ? C.primary : C.border, backgroundColor: tab === t.k ? C.primary : "transparent" }]}
              >
                <Text style={{ color: tab === t.k ? C.onPrimary : C.text, fontWeight: "800", fontSize: 13 }}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={() => (loggedIn ? router.push("/var/create" as any) : router.push("/login" as any))} style={[styles.newBtn, { backgroundColor: C.primary }]}>
            <Ionicons name="add" size={18} color={C.onPrimary} />
            <Text style={{ color: C.onPrimary, fontWeight: "800" }}>Tạo mới</Text>
          </Pressable>
        </View>

        {!all && isFetching ? <ActivityIndicator color={C.primary} style={{ marginTop: 30 }} /> : null}
        {!loggedIn || (error && !all) ? (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, alignItems: "center", gap: 10 }]}>
            <Ionicons name={loggedIn ? "cloud-offline-outline" : "person-circle-outline"} size={30} color={C.primary} />
            <Text style={{ color: C.text, fontWeight: "800", textAlign: "center" }}>
              {loggedIn ? (error as any)?.data?.message || "Không tải được danh sách" : "Đăng nhập để dùng Highlight & VAR"}
            </Text>
            {!loggedIn ? (
              <Pressable accessibilityRole="button" onPress={() => router.push("/login" as any)} style={[styles.newBtn, { backgroundColor: C.primary, alignSelf: "center" }]}>
                <Text style={{ color: C.onPrimary, fontWeight: "800" }}>Đăng nhập</Text>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" onPress={refetch}>
                <Text style={{ color: C.primary, fontWeight: "700" }}>Thử lại</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {tab === "active" ? (
          <>
            {active.length === 0 && all ? (
              <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, alignItems: "center", gap: 8 }]}>
                <Ionicons name="sparkles-outline" size={28} color={C.primary} />
                <Text style={{ color: C.text, fontWeight: "800" }}>Chưa có video nào đang xử lý</Text>
                <Text style={{ color: C.sub, fontSize: 13, textAlign: "center" }}>
                  Chọn clip camera sân hoặc tải video trận (tối đa 5 phút) để AI dựng highlight và soi VAR.
                </Text>
              </View>
            ) : null}
            {active.map((j) => (
              <View key={j._id} style={[styles.card, { backgroundColor: C.card, borderColor: C.border, gap: 12 }]}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Thumb j={j} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Text style={[styles.title, { color: C.text }]} numberOfLines={2}>{j.title}</Text>
                    {j.status === "queued" ? (
                      <View style={[styles.wait, { backgroundColor: C.field, borderColor: C.border }]}>
                        <Text style={{ color: C.sub, fontSize: 12.5 }}>{etaText(j)}</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={[styles.bar, { backgroundColor: C.field }]}>
                          <View style={{ width: `${Math.round((j.progress || 0) * 100)}%`, height: "100%", borderRadius: 4, backgroundColor: C.primary }} />
                        </View>
                        <Text style={{ color: C.primary, fontWeight: "800", fontSize: 12.5 }}>{Math.round((j.progress || 0) * 100)}%</Text>
                      </View>
                    )}
                  </View>
                </View>
                {j.status !== "queued" ? <StageStepper job={j} C={C} /> : null}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: C.sub, fontSize: 12.5 }}>{j.status === "queued" ? "Sẽ báo khi xong" : etaText(j)}</Text>
                  {j.status !== "finishing" ? (
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() =>
                        Alert.alert("Huỷ phân tích?", j.title, [
                          { text: "Không", style: "cancel" },
                          { text: "Huỷ", style: "destructive", onPress: () => cancelJob(j._id) },
                        ])
                      }
                    >
                      <Text style={{ color: C.text, fontWeight: "700" }}>Huỷ</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
            {recentDone.length ? <Text style={[styles.section, { color: C.text }]}>Vừa xong</Text> : null}
            {recentDone.map((j) => (
              <DoneCard key={j._id} j={j} />
            ))}
          </>
        ) : (
          <>
            {shown.length === 0 && all ? <Text style={{ color: C.sub, textAlign: "center", marginTop: 24 }}>Chưa có video nào.</Text> : null}
            {shown.map((j) => (
              <DoneCard key={j._id} j={j} />
            ))}
            {shown.length ? <Text style={{ color: C.muted, fontSize: 11.5, textAlign: "center" }}>Nhấn giữ để xoá video.</Text> : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 12 },
  title: { fontSize: 15.5, fontWeight: "800" },
  section: { fontSize: 18, fontWeight: "900", marginTop: 6 },
  thumb: { width: 128, height: 82, borderRadius: 10, overflow: "hidden", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  play: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)" },
  dur: { position: "absolute", left: 6, bottom: 6, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  tab: { paddingHorizontal: 12, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, height: 38, borderRadius: 12 },
  bar: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  wait: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
});
