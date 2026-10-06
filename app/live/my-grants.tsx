// app/live/my-grants.tsx — Operator xem Quyền Livestream của mình (giải + sân được cấp)
// và hướng dẫn mở app live desktop. Nút quét QR để nhận quyền mới.
import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useTheme } from "@react-navigation/native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  useMyLiveGrantsQuery,
  useMyLiveSessionsQuery,
  useStopMyLiveSessionMutation,
} from "@/slices/liveGrantsApiSlice";

export default function MyLiveGrantsScreen() {
  const theme = useTheme() as any;
  const isDark = theme.dark;
  const router = useRouter();
  const C = {
    bg: isDark ? theme.colors.background : "#F8FAFC",
    card: isDark ? "#111827" : "#FFFFFF",
    border: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0",
    text: theme.colors.text,
    sub: isDark ? "#94A3B8" : "#64748B",
    primary: "#0EA5E9",
    danger: "#EF4444",
  };
  const { data: grants = [], isLoading, isFetching, refetch } = useMyLiveGrantsQuery(undefined);
  const { data: mySessions = [], isFetching: loadingSessions, refetch: refetchSessions } =
    useMyLiveSessionsQuery(undefined, { pollingInterval: 15000 });
  const [stopMine, { isLoading: stopping }] = useStopMyLiveSessionMutation();

  const confirmStopMine = (s: any) => {
    Alert.alert("Dừng luồng", `Dừng luồng live của bạn${s.court?.name ? ` (sân ${s.court.name})` : ""}?`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Dừng",
        style: "destructive",
        onPress: async () => {
          try {
            await stopMine({ id: s._id }).unwrap();
          } catch (e: any) {
            Alert.alert("Lỗi", e?.data?.message || "Không dừng được.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["left", "right"]}>
      <Stack.Screen options={{ title: "Quyền Livestream của tôi" }} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching || loadingSessions}
            onRefresh={() => { refetch(); refetchSessions(); }}
            tintColor={C.primary}
          />
        }
      >
        <TouchableOpacity
          style={[styles.scanBtn, { backgroundColor: C.primary }]}
          onPress={() => router.push("/live/claim-scan" as any)}
        >
          <Ionicons name="qr-code-outline" size={20} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Quét QR nhận quyền live</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.scanBtn, { backgroundColor: "#EF4444", marginTop: 10 }]}
          onPress={() => router.push("/admin/live-control" as any)}
        >
          <Ionicons name="game-controller-outline" size={20} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Điều khiển máy live của tôi</Text>
        </TouchableOpacity>

        {mySessions.length > 0 && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, marginBottom: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.danger }} />
              <Text style={{ color: C.text, fontWeight: "800" }}>Luồng của bạn đang chạy ({mySessions.length})</Text>
            </View>
            {mySessions.map((s: any) => (
              <View key={s._id} style={[styles.row, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: C.text, fontWeight: "700" }} numberOfLines={1}>
                    {s.tournament?.name || "—"}{s.court?.name ? ` · Sân ${s.court.name}` : ""}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>
                    <View style={[styles.chip, { backgroundColor: s.status === "error" ? "#EF444422" : s.online ? "#22C55E22" : (isDark ? "#1E293B" : "#EEF2F7") }]}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: s.status === "error" ? C.danger : s.online ? "#16A34A" : C.sub }}>
                        {s.status === "error" ? "Lỗi" : s.status === "reconnecting" ? "Kết nối lại" : s.online ? "Online" : "Mất kết nối"}
                      </Text>
                    </View>
                    {(s.destinations || []).filter((d: any) => d.watchUrl).map((d: any, i: number) => (
                      <TouchableOpacity key={i} onPress={() => Linking.openURL(d.watchUrl)}>
                        <Text style={{ color: C.primary, fontWeight: "700", fontSize: 13 }}>
                          {d.type === "youtube" ? "YouTube ↗" : `${d.pageName || "FB"} ↗`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TouchableOpacity onPress={() => confirmStopMine(s)} disabled={stopping} style={{ padding: 4, opacity: stopping ? 0.5 : 1 }}>
                  <MaterialIcons name="stop-circle" size={30} color={C.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        <View style={[styles.guide, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={{ color: C.text, fontWeight: "700", marginBottom: 6 }}>Cách live trên máy của bạn</Text>
          <Text style={{ color: C.sub, lineHeight: 20 }}>
            1. Cài app PickleTour Live (desktop) do ban tổ chức cung cấp.{"\n"}
            2. Mở app, đăng nhập bằng chính tài khoản này.{"\n"}
            3. Chọn giải và sân được cấp quyền rồi bắt đầu live.
          </Text>
        </View>

        <Text style={{ color: C.sub, fontWeight: "700", marginTop: 18, marginBottom: 8 }}>
          GIẢI ĐƯỢC CẤP QUYỀN ({grants.length})
        </Text>

        {isLoading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
        ) : grants.length === 0 ? (
          <View style={[styles.empty, { borderColor: C.border }]}>
            <MaterialIcons name="live-tv" size={40} color={C.border} />
            <Text style={{ color: C.sub, marginTop: 10, textAlign: "center" }}>
              Bạn chưa được cấp Quyền Livestream cho giải nào. Nhờ chủ giải gửi link/QR mời rồi quét ở trên.
            </Text>
          </View>
        ) : (
          grants.map((g: any) => (
            <View key={g.tournament._id} style={[styles.row, { backgroundColor: C.card, borderColor: C.border }]}>
              <MaterialIcons name="emoji-events" size={22} color={C.primary} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: C.text, fontWeight: "700" }} numberOfLines={2}>
                  {g.tournament.name}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {g.allCourts ? (
                    <View style={[styles.chip, { backgroundColor: "#22C55E22" }]}>
                      <Text style={{ color: "#16A34A", fontSize: 12, fontWeight: "700" }}>Toàn giải</Text>
                    </View>
                  ) : (
                    (g.courts || []).map((c: any) => (
                      <View key={c._id} style={[styles.chip, { backgroundColor: isDark ? "#1E293B" : "#EEF2F7" }]}>
                        <Text style={{ color: C.text, fontSize: 12, fontWeight: "600" }}>Sân {c.name || c.code}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: 14 },
  guide: { marginTop: 14, padding: 14, borderRadius: 14, borderWidth: 1 },
  empty: { alignItems: "center", padding: 28, borderWidth: 1, borderStyle: "dashed", borderRadius: 14 },
  row: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
});
