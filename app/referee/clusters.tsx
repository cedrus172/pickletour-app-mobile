// app/referee/clusters.tsx
// Trọng tài CHỌN CỤM SÂN (thay vì chọn giải) để vào tìm sân/trận chấm.
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { Stack, router, useFocusEffect } from "expo-router";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import {
  useListRefereeClustersQuery,
  useListRefereeClusterStationsQuery,
} from "@/slices/tournamentsApiSlice";
import { buildRefereeMatchRoute } from "@/utils/refereeMatchRoute";
import { usePinnedCourts } from "@/utils/pinnedCourts";
import ClusterCourtCard from "@/components/referee/ClusterCourtCard";

// Các SÂN ĐÃ GHIM của 1 cụm — tự tải trận hiện tại để chấm ngay ở màn ngoài.
function PinnedClusterCourts({ C, clusterId, pinnedIds, onOpenMatch, onTogglePin }) {
  const { data } = useListRefereeClusterStationsQuery(
    { clusterId },
    { skip: !clusterId, pollingInterval: 20000, refetchOnMountOrArgChange: true }
  );
  const clusterName = data?.cluster?.name || "";
  const stations = (Array.isArray(data?.stations) ? data.stations : []).filter(
    (s) => pinnedIds.includes(String(s?._id))
  );
  if (!stations.length) return null;
  return (
    <>
      {stations.map((s) => (
        <ClusterCourtCard
          key={String(s._id)}
          C={C}
          station={s}
          showClusterName
          clusterName={clusterName}
          onOpenMatch={onOpenMatch}
          pinned
          onTogglePin={() => onTogglePin(String(s._id), clusterId)}
        />
      ))}
    </>
  );
}

export default function RefereeClustersScreen() {
  const C = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isFetching, refetch, error } =
    useListRefereeClustersQuery(undefined, { refetchOnMountOrArgChange: true });
  const { pins, toggle } = usePinnedCourts();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const items = Array.isArray(data) ? data : [];

  const pinsByCluster = useMemo(() => {
    const map = {};
    for (const p of pins) {
      if (!p?.clusterId) continue;
      (map[p.clusterId] ||= []).push(String(p.stationId));
    }
    return map;
  }, [pins]);

  const openMatch = useCallback((match) => {
    if (!match?._id) return;
    router.push(buildRefereeMatchRoute(match));
  }, []);

  const goScan = useCallback(() => router.push("/referee/scan"), []);

  const ScanButton = useCallback(
    () => (
      <Pressable
        onPress={goScan}
        hitSlop={10}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 4 })}
      >
        <Ionicons name="qr-code-outline" size={24} color={C.primary} />
      </Pressable>
    ),
    [C.primary, goScan]
  );

  const pinnedClusterIds = useMemo(
    () => Object.keys(pinsByCluster),
    [pinsByCluster]
  );

  const ListHeader = useCallback(
    () => (
      <>
        {pinnedClusterIds.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
              }}
            >
              <MaterialIcons name="push-pin" size={16} color={C.primary} />
              <Text style={{ color: C.text, fontSize: 14, fontWeight: "800" }}>
                Sân đã ghim
              </Text>
            </View>
            {pinnedClusterIds.map((clusterId) => (
              <PinnedClusterCourts
                key={clusterId}
                C={C}
                clusterId={clusterId}
                pinnedIds={pinsByCluster[clusterId]}
                onOpenMatch={openMatch}
                onTogglePin={toggle}
              />
            ))}
          </View>
        )}
        <Pressable
          onPress={goScan}
          style={({ pressed }) => ({
            backgroundColor: C.primarySoft,
            borderColor: C.primary,
            borderWidth: 1,
            borderRadius: 14,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Ionicons name="qr-code-outline" size={22} color={C.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: "800" }}>
              Quét QR trọng tài
            </Text>
            <Text style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>
              Quét mã QR tại sân/cụm để nhận quyền trọng tài.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={C.muted} />
        </Pressable>
      </>
    ),
    [C, goScan, pinnedClusterIds, pinsByCluster, openMatch, toggle]
  );

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
      <Stack.Screen
        options={{ title: "Chấm trận theo cụm sân", headerRight: ScanButton }}
      />
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
          ListHeaderComponent={ListHeader}
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
