// app/referee/clusters.tsx
// Trọng tài CHỌN CỤM SÂN (thay vì chọn giải) để vào tìm sân/trận chấm.
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { Stack, router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useListRefereeClustersQuery } from "@/slices/tournamentsApiSlice";

export default function RefereeClustersScreen() {
  const C = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isFetching, refetch, error } =
    useListRefereeClustersQuery(undefined, { refetchOnMountOrArgChange: true });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const items = Array.isArray(data) ? data : [];

  const renderItem = useCallback(
    ({ item }) => {
      const dot = item?.color || C.primary;
      return (
        <Pressable
          onPress={() =>
            router.push(`/referee/cluster/${item._id}`)
          }
          style={({ pressed }) => ({
            backgroundColor: C.card,
            borderColor: C.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            opacity: pressed ? 0.85 : 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: C.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="sports-tennis" size={24} color={dot} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ color: C.text, fontSize: 16, fontWeight: "800" }}
            >
              {item?.name || "Cụm sân"}
            </Text>
            {item?.venueName ? (
              <Text
                numberOfLines={1}
                style={{ color: C.sub, fontSize: 13, marginTop: 2 }}
              >
                {item.venueName}
              </Text>
            ) : null}
            <Text style={{ color: C.text3, fontSize: 12, marginTop: 4 }}>
              {Number(item?.stationCount || 0)} sân ·{" "}
              <Text style={{ color: C.primary, fontWeight: "700" }}>
                {Number(item?.liveCount || 0)} đang live
              </Text>
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={C.muted} />
        </Pressable>
      );
    },
    [C]
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: "Chấm trận theo cụm sân" }} />
      {isLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it._id)}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor={C.primary}
            />
          }
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 80,
                paddingHorizontal: 24,
              }}
            >
              <MaterialIcons name="sports-tennis" size={48} color={C.muted} />
              <Text
                style={{
                  color: C.sub,
                  fontSize: 15,
                  textAlign: "center",
                  marginTop: 12,
                }}
              >
                {error
                  ? "Không tải được danh sách cụm sân."
                  : "Bạn chưa được chia cụm sân nào. Hãy nhờ ban tổ chức gán bạn vào cụm hoặc quét mã QR trọng tài cụm."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
