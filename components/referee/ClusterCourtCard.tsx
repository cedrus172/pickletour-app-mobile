// Thẻ 1 SÂN trong cụm: trạng thái + trận hiện tại + nút Chấm + nút Ghim.
import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/i18nText";
import { MaterialIcons } from "@expo/vector-icons";

const STATUS_META: Record<string, { label: string; color: string }> = {
  live: { label: "Đang live", color: "#ef4444" },
  assigned: { label: "Đã gán", color: "#f59e0b" },
  idle: { label: "Trống", color: "#64748b" },
  maintenance: { label: "Bảo trì", color: "#64748b" },
};

function scoreText(match: any) {
  const s = match?.score;
  if (s && (s.a != null || s.b != null)) return `${s.a ?? 0} - ${s.b ?? 0}`;
  return "";
}

export default function ClusterCourtCard({
  C,
  station,
  onOpenMatch,
  pinned = false,
  onTogglePin,
  showClusterName = false,
  clusterName = "",
}: {
  C: any;
  station: any;
  onOpenMatch: (match: any) => void;
  pinned?: boolean;
  onTogglePin?: () => void;
  showClusterName?: boolean;
  clusterName?: string;
}) {
  const st =
    STATUS_META[String(station?.status || "idle").toLowerCase()] ||
    STATUS_META.idle;
  const cm = station?.currentMatch || null;
  const aName = cm?.pairA?.name || cm?.teamAName || "Đội A";
  const bName = cm?.pairB?.name || cm?.teamBName || "Đội B";
  const queueCount = Array.isArray(station?.assignmentQueue?.items)
    ? station.assignmentQueue.items.length
    : 0;

  return (
    <View
      style={{
        backgroundColor: C.card,
        borderColor: pinned ? C.primary : C.border,
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
          gap: 8,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          {showClusterName && clusterName ? (
            <Text
              numberOfLines={1}
              style={{ color: C.sub, fontSize: 11, marginBottom: 2 }}
            >
              {clusterName}
            </Text>
          ) : null}
          <Text
            numberOfLines={1}
            style={{ color: C.text, fontSize: 15, fontWeight: "800" }}
          >
            {station?.name || "Sân"}
            {station?.code ? ` · ${station.code}` : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
          {onTogglePin ? (
            <Pressable
              onPress={onTogglePin}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <MaterialIcons
                name="push-pin"
                size={22}
                color={pinned ? C.primary : C.muted}
                style={{ opacity: pinned ? 1 : 0.6 }}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {cm ? (
        <Pressable
          onPress={() => onOpenMatch(cm)}
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
                style={{
                  color: C.text,
                  fontSize: 14,
                  fontWeight: "700",
                  marginTop: 3,
                }}
              >
                {bName}
              </Text>
            </View>
            {scoreText(cm) ? (
              <Text style={{ color: C.primary, fontSize: 18, fontWeight: "900" }}>
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
}
