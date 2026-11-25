// components/live/EventCountdown.tsx — đồng hồ đếm ngược tới giờ sự kiện bắt đầu, hiện NGAY TRONG khung xem
// video của màn Xem live giải đấu (khi chưa có luồng). fill = phủ kín khung video 16:9.
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/i18nText";
import useEventCountdown, { fmtStartAt } from "@/hooks/useEventCountdown";

const pad = (n: number) => String(n).padStart(2, "0");

export default function EventCountdown({
  startAt,
  eventName,
  fill = false,
}: {
  startAt?: string;
  eventName?: string;
  fill?: boolean;
}) {
  const cd = useEventCountdown(startAt);
  if (!cd.active) return null;
  const cells: [string, string][] = [
    [String(cd.days), "Ngày"],
    [pad(cd.hours), "Giờ"],
    [pad(cd.minutes), "Phút"],
    [pad(cd.seconds), "Giây"],
  ];
  return (
    <LinearGradient
      colors={["#061024", "#0B2A6B", "#0A3D7A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.card, fill && s.fill]}
    >
      <Text style={s.kicker}>SỰ KIỆN SẮP BẮT ĐẦU</Text>
      {eventName ? (
        <Text style={s.name} numberOfLines={1}>
          {eventName}
        </Text>
      ) : null}
      <View style={s.row}>
        {cells.map(([v, label]) => (
          <View key={label} style={s.cell}>
            <Text style={s.num}>{v}</Text>
            <Text style={s.lbl}>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={s.foot} numberOfLines={1}>
        Bắt đầu lúc <Text style={{ color: "#fff", fontWeight: "800" }}>{fmtStartAt(startAt)}</Text>
      </Text>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  fill: { ...StyleSheet.absoluteFillObject, borderRadius: 0 },
  kicker: { color: "#C5F433", fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },
  name: { color: "#fff", fontSize: 15, fontWeight: "800", marginTop: 2, textAlign: "center", maxWidth: "92%" },
  row: { flexDirection: "row", gap: 7, marginTop: 9 },
  cell: {
    minWidth: 58,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
  },
  num: { color: "#fff", fontSize: 24, fontWeight: "900", fontVariant: ["tabular-nums"] },
  lbl: { color: "rgba(255,255,255,0.75)", fontSize: 10.5, fontWeight: "700", marginTop: 2 },
  foot: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 9 },
});
