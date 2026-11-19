// app/organize/mine.tsx — Yêu cầu tổ chức giải của tôi (trạng thái admin cập nhật).
import React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useGetMyOrganizeRequestsQuery } from "@/slices/organizeApiSlice";

const COLOR: Record<string, string> = { new: "#F59E0B", contacted: "#0EA5E9", organizing: "#6366F1", done: "#16A34A", cancelled: "#94A3B8" };

export default function MyOrganizeRequestsScreen() {
  const C = useThemeTokens();
  const { data, isLoading, isFetching, refetch } = useGetMyOrganizeRequestsQuery(undefined);
  const list: any[] = data?.requests || [];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Yêu cầu tổ chức giải", headerShown: true }} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, maxWidth: 640, width: "100%", alignSelf: "center" }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 30 }} />
        ) : list.length ? (
          list.map((r) => (
            <View key={r._id} style={[styles.card, { borderColor: C.border, backgroundColor: C.card }]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ color: C.sub, fontWeight: "800" }}>{r.code}</Text>
                <View style={[styles.pill, { borderColor: COLOR[r.status] || C.border }]}>
                  <Text style={{ color: COLOR[r.status] || C.sub, fontWeight: "800", fontSize: 12 }}>{r.statusLabel}</Text>
                </View>
              </View>
              <Text style={{ color: C.text, fontWeight: "900", fontSize: 16 }}>{r.name}</Text>
              <Text style={{ color: C.sub, fontSize: 13 }}>
                📍 {r.location}
                {r.timeText ? `  ·  🗓 ${r.timeText}` : ""}
              </Text>
              {r.events?.length ? <Text style={{ color: C.sub, fontSize: 13 }}>{r.events.join(" · ")}</Text> : null}
              <Text style={{ color: C.sub, fontSize: 12 }}>Gửi lúc {new Date(r.createdAt).toLocaleString("vi-VN")}</Text>
            </View>
          ))
        ) : (
          <View style={{ alignItems: "center", gap: 10, marginTop: 40 }}>
            <Ionicons name="trophy-outline" size={42} color={C.sub} />
            <Text style={{ color: C.sub }}>Bạn chưa gửi yêu cầu nào.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace("/organize" as any)}>
              <Text style={{ color: C.primary, fontWeight: "800" }}>Gửi yêu cầu tổ chức giải</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 16, borderWidth: 1, gap: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
});
