// Ví PCoin — số dư và lịch sử cộng/trừ (dùng cho Highlight & VAR).
import React from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useGetMyPcoinQuery } from "@/slices/varApiSlice";

const TYPE: Record<string, { label: string; icon: any }> = {
  topup: { label: "Nạp PCoin", icon: "add-circle" },
  deduct: { label: "Admin điều chỉnh", icon: "remove-circle" },
  spend: { label: "Tạo video Highlight & VAR", icon: "videocam" },
  refund: { label: "Hoàn PCoin", icon: "arrow-undo-circle" },
};

const fmtDate = (d: string) => {
  const x = new Date(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(x.getHours())}:${p(x.getMinutes())} · ${p(x.getDate())}/${p(x.getMonth() + 1)}/${x.getFullYear()}`;
};

export default function PcoinWalletScreen() {
  const C = useThemeTokens();
  const loggedIn = !!useSelector((st: any) => st?.auth?.userInfo?._id);
  const { data, isLoading, isFetching, refetch, error } = useGetMyPcoinQuery(undefined as any, { skip: !loggedIn });
  const txs: any[] = data?.transactions || [];
  const price = Number(data?.prices?.highlightVar ?? 0);

  const header = (
    <View style={{ gap: 12, marginBottom: 4 }}>
      <View style={[styles.hero, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={[styles.coin, { backgroundColor: "rgba(245,158,11,0.16)" }]}>
          <Ionicons name="logo-bitcoin" size={28} color="#f59e0b" />
        </View>
        <Text style={{ color: C.sub, fontWeight: "700" }}>Số dư hiện tại</Text>
        <Text style={{ color: C.text, fontSize: 36, fontWeight: "900" }}>{Number(data?.balance || 0).toLocaleString("vi-VN")}</Text>
        <Text style={{ color: "#f59e0b", fontWeight: "800" }}>PCoin</Text>
      </View>
      <View style={[styles.note, { backgroundColor: C.card, borderColor: C.border }]}>
        <Ionicons name="information-circle-outline" size={18} color={C.primary} />
        <Text style={{ color: C.text, flex: 1, fontSize: 13.5, lineHeight: 19 }}>
          {price > 0 ? `Mỗi video Highlight & VAR tốn ${price} PCoin. Phân tích lỗi hoặc huỷ trước khi máy bắt đầu chạy sẽ được hoàn lại. ` : "Highlight & VAR đang miễn phí. "}
          Liên hệ admin PickleTour để nạp thêm PCoin.
        </Text>
      </View>
      <Text style={{ color: C.text, fontSize: 17, fontWeight: "900", marginTop: 4 }}>Lịch sử</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Ví PCoin", headerShown: true }} />
      {!loggedIn ? (
        <View style={styles.center}>
          <Text style={{ color: C.text, fontWeight: "800" }}>Đăng nhập để xem ví PCoin</Text>
        </View>
      ) : isLoading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : error && !data ? (
        <View style={styles.center}>
          <Text style={{ color: C.text, fontWeight: "800", textAlign: "center" }}>{(error as any)?.data?.message || "Không tải được ví PCoin"}</Text>
          <Text onPress={refetch} style={{ color: C.primary, fontWeight: "700", marginTop: 8 }}>
            Thử lại
          </Text>
        </View>
      ) : (
        <FlatList
          data={txs}
          keyExtractor={(t) => String(t._id)}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.primary} />}
          ListEmptyComponent={<Text style={{ color: C.sub, textAlign: "center", marginTop: 12 }}>Chưa có giao dịch nào</Text>}
          renderItem={({ item: t }) => {
            const plus = t.amount > 0;
            const meta = TYPE[t.type] || { label: t.type, icon: "ellipse" };
            return (
              <View style={[styles.row, { backgroundColor: C.card, borderColor: C.border }]}>
                <Ionicons name={meta.icon} size={24} color={plus ? "#22c55e" : C.sub} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: C.text, fontWeight: "800" }}>{meta.label}</Text>
                  {t.note && t.note !== meta.label ? (
                    <Text style={{ color: C.sub, fontSize: 12.5 }} numberOfLines={2}>
                      {t.note}
                    </Text>
                  ) : null}
                  <Text style={{ color: C.sub, fontSize: 12 }}>{fmtDate(t.createdAt)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: plus ? "#22c55e" : C.redText, fontWeight: "900", fontSize: 16 }}>
                    {plus ? "+" : "−"}
                    {Math.abs(t.amount).toLocaleString("vi-VN")}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 11.5 }}>Số dư {Number(t.balanceAfter).toLocaleString("vi-VN")}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  hero: { borderWidth: 1, borderRadius: 20, padding: 20, alignItems: "center", gap: 2 },
  coin: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  note: { flexDirection: "row", gap: 8, borderWidth: 1, borderRadius: 14, padding: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
});
