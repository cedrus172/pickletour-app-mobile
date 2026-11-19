// app/shop/orders/[id].tsx — Chi tiết đơn của khách (QR thanh toán, mã đơn cho nhân viên quét, huỷ khi chờ xác nhận)
import React from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useCancelShopOrderMutation, useGetShopOrderQuery } from "@/slices/shopApiSlice";
import OrderDetailView from "@/components/shop/OrderDetailView";

export default function ShopOrderScreen() {
  const C = useThemeTokens();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: o, isLoading, isFetching, refetch, error } = useGetShopOrderQuery(String(id), { skip: !id });
  const [cancel] = useCancelShopOrderMutation();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: o ? `Đơn ${o.code}` : "Đơn hàng", headerShown: true }} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, maxWidth: 720, width: "100%", alignSelf: "center" }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={C.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 30 }} />
        ) : o ? (
          <OrderDetailView
            o={o}
            C={C}
            onCancel={async () => {
              try {
                await cancel(o._id).unwrap();
              } catch (e: any) {
                Alert.alert("Không huỷ được", e?.data?.message || "Vui lòng thử lại.");
              }
            }}
          />
        ) : (
          <View style={{ alignItems: "center", marginTop: 30 }}>
            <Text style={{ color: C.sub }}>{(error as any)?.data?.message || "Không tìm thấy đơn hàng"}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
