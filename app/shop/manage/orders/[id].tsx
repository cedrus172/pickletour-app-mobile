// app/shop/manage/orders/[id].tsx — Người quản lý gian hàng xử lý một đơn (trạng thái, đã thanh toán, tổng tiền, ghi chú)
import React from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useGetManageOrderQuery, useUpdateManageOrderMutation } from "@/slices/shopApiSlice";
import OrderDetailView from "@/components/shop/OrderDetailView";

export default function ShopManageOrderScreen() {
  const C = useThemeTokens();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: o, isLoading, isFetching, refetch, error } = useGetManageOrderQuery(String(id), { skip: !id });
  const [update, { isLoading: busy }] = useUpdateManageOrderMutation();
  const onUpdate = async (body: any) => {
    try {
      await update({ id: o._id, ...body }).unwrap();
    } catch (e: any) {
      Alert.alert("Không cập nhật được", e?.data?.message || "Vui lòng thử lại.");
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: o ? `Đơn ${o.code}` : "Đơn hàng", headerShown: true }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60, maxWidth: 720, width: "100%", alignSelf: "center" }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.primary} />}
        >
          {isLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 30 }} />
          ) : o ? (
            <OrderDetailView key={`${o._id}:${o.total}:${o.adminNote}`} o={o} C={C} manage busy={busy} onUpdate={onUpdate} />
          ) : (
            <View style={{ alignItems: "center", marginTop: 30 }}>
              <Text style={{ color: C.sub }}>{(error as any)?.data?.message || "Không tìm thấy đơn hàng"}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
