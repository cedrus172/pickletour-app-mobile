// app/referee/cluster/[clusterId].tsx
// Danh sách SÂN trong 1 cụm + trận đang đánh / hàng đợi → bấm để chấm.
// Sân đã GHIM hiện lên đầu.
import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { Text } from "@/components/ui/i18nText";
import { Stack, router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useListRefereeClusterStationsQuery } from "@/slices/tournamentsApiSlice";
import { buildRefereeMatchRoute } from "@/utils/refereeMatchRoute";
import { usePinnedCourts } from "@/utils/pinnedCourts";
import ClusterCourtCard from "@/components/referee/ClusterCourtCard";

export default function RefereeClusterCourtsScreen() {
  const C = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { clusterId } = useLocalSearchParams();
  const cid = String(clusterId || "");
  const { isPinned, toggle } = usePinnedCourts();

  const { data, isLoading, isFetching, refetch, error } =
    useListRefereeClusterStationsQuery(
      { clusterId: cid },
      { skip: !cid, refetchOnMountOrArgChange: true, pollingInterval: 15000 }
    );

  useFocusEffect(
    useCallback(() => {
      if (cid) refetch();
    }, [cid, refetch])
  );

  const clusterName = data?.cluster?.name || "Cụm sân";

  // Sân đã ghim lên đầu (giữ nguyên thứ tự còn lại).
  const stations = useMemo(() => {
    const list = Array.isArray(data?.stations) ? data.stations : [];
    return [...list].sort((a, b) => {
      const pa = isPinned(a?._id) ? 1 : 0;
      const pb = isPinned(b?._id) ? 1 : 0;
      return pb - pa;
    });
  }, [data, isPinned]);

  const openMatch = useCallback((match) => {
    if (!match?._id) return;
    router.push(buildRefereeMatchRoute(match));
  }, []);

  const renderItem = useCallback(
    ({ item }) => (
      <ClusterCourtCard
        C={C}
        station={item}
        onOpenMatch={openMatch}
        pinned={isPinned(item?._id)}
        onTogglePin={() => toggle(String(item?._id), cid)}
      />
    ),
    [C, openMatch, isPinned, toggle, cid]
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: clusterName }} />
      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={stations}
          keyExtractor={(it) => String(it._id)}
          renderItem={renderItem}
          extraData={stations}
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
              <MaterialIcons name="meeting-room" size={48} color={C.muted} />
              <Text
                style={{
                  color: C.sub,
                  fontSize: 15,
                  textAlign: "center",
                  marginTop: 12,
                }}
              >
                {error
                  ? "Không tải được danh sách sân của cụm."
                  : "Cụm này chưa có sân nào."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
