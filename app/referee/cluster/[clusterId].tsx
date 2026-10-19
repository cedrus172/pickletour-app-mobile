// app/referee/cluster/[clusterId].tsx
// Danh sách SÂN trong 1 cụm + trận đang đánh / hàng đợi → bấm để chấm.
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { Stack, useLocalSearchParams, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useListRefereeClusterStationsQuery } from "@/slices/tournamentsApiSlice";
import ResponsiveMatchViewer from "@/components/match/ResponsiveMatchViewer";

const STATUS_META = {
  live: { label: "Đang live", color: "#ef4444" },
  assigned: { label: "Đã gán", color: "#f59e0b" },
  idle: { label: "Trống", color: "#64748b" },
  maintenance: { label: "Bảo trì", color: "#64748b" },
};

function scoreText(match) {
  const s = match?.score;
  if (s && (s.a != null || s.b != null)) return `${s.a ?? 0} - ${s.b ?? 0}`;
  return "";
}

export default function RefereeClusterCourtsScreen() {
  const C = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { clusterId } = useLocalSearchParams();
  const cid = String(clusterId || "");
  const [viewer, setViewer] = useState({ open: false, matchId: null });

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

  const stations = useMemo(
    () => (Array.isArray(data?.stations) ? data.stations : []),
    [data]
  );
  const clusterName = data?.cluster?.name || "Cụm sân";

  const openMatch = useCallback((mid) => {
    if (mid) setViewer({ open: true, matchId: String(mid) });
  }, []);
  const closeMatch = useCallback(
    () => setViewer({ open: false, matchId: null }),
    []
  );

  const renderItem = useCallback(
    ({ item }) => {
      const st =
        STATUS_META[String(item?.status || "idle").toLowerCase()] ||
        STATUS_META.idle;
      const cm = item?.currentMatch || null;
      const aName = cm?.pairA?.name || cm?.teamAName || "Đội A";
      const bName = cm?.pairB?.name || cm?.teamBName || "Đội B";
      const queueCount = Array.isArray(item?.assignmentQueue?.items)
        ? item.assignmentQueue.items.length
        : 0;

      return (
        <View
          style={{
            backgroundColor: C.card,
            borderColor: C.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              numberOfLines={1}
              style={{ color: C.text, fontSize: 15, fontWeight: "800", flex: 1 }}
            >
              {item?.name || "Sân"}
              {item?.code ? ` · ${item.code}` : ""}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: st.color + "22",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: st.color,
                }}
              />
              <Text style={{ color: st.color, fontSize: 11, fontWeight: "700" }}>
                {st.label}
              </Text>
            </View>
          </View>

          {cm ? (
            <Pressable
              onPress={() => openMatch(cm._id)}
              style={({ pressed }) => ({
                marginTop: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                backgroundColor: C.field,
                padding: 12,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              {cm?.tournament?.name ? (
                <Text
                  numberOfLines={1}
                  style={{ color: C.sub, fontSize: 11, marginBottom: 6 }}
                >
                  {cm.tournament.name}
                  {cm?.displayCode || cm?.code
                    ? ` · ${cm.displayCode || cm.code}`
                    : ""}
                </Text>
              ) : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{ color: C.text, fontSize: 14, fontWeight: "700" }}
                  >
                    {aName}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ color: C.text, fontSize: 14, fontWeight: "700", marginTop: 3 }}
                  >
                    {bName}
                  </Text>
                </View>
                {scoreText(cm) ? (
                  <Text
                    style={{ color: C.primary, fontSize: 18, fontWeight: "900" }}
                  >
                    {scoreText(cm)}
                  </Text>
                ) : null}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: C.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                  }}
                >
                  <MaterialIcons name="scoreboard" size={16} color="#fff" />
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>
                    Chấm
                  </Text>
                </View>
              </View>
            </Pressable>
          ) : (
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 10 }}>
              Chưa có trận trên sân này.
            </Text>
          )}

          {queueCount > 0 ? (
            <Text style={{ color: C.text3, fontSize: 12, marginTop: 8 }}>
              {queueCount} trận trong hàng đợi
            </Text>
          ) : null}
        </View>
      );
    },
    [C, openMatch]
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: clusterName }} />
      {isLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={stations}
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

      <ResponsiveMatchViewer
        open={viewer.open}
        matchId={viewer.matchId}
        onClose={closeMatch}
      />
    </View>
  );
}
