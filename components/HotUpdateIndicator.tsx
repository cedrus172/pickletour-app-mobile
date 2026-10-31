import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  progress: number;
  status: "downloading" | "done" | "error";
  isDark: boolean;
  accentColor: string;
};

/** Background download status only. Never captures touches or opens a native modal. */
export default function HotUpdateIndicator({ visible, progress, status, isDark, accentColor }: Props) {
  const insets = useSafeAreaInsets();
  if (!visible || status === "error") return null;
  const percentage = Math.round(Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)) * 100);
  return (
    <View
      pointerEvents="none"
      accessibilityRole="progressbar"
      accessibilityLabel={status === "done" ? "Đã tải bản cập nhật" : "Đang tải bản cập nhật"}
      accessibilityValue={{ min: 0, max: 100, now: status === "done" ? 100 : percentage }}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={status === "done" ? 100 : percentage}
      style={[styles.container, {
        top: insets.top + 8,
        right: insets.right + 12,
        backgroundColor: isDark ? "#071b2d" : "#ffffff",
        borderColor: isDark ? "#214563" : "#dbe5ed",
      }]}
    >
      <Text numberOfLines={1} style={[styles.label, { color: isDark ? "#bed0e0" : "#486176" }]}>
        {status === "done" ? "Đã tải cập nhật" : `Tải cập nhật · ${percentage}%`}
      </Text>
      <View style={[styles.track, { backgroundColor: isDark ? "#19364d" : "#e6eef4" }]}>
        <View style={[styles.fill, { width: `${status === "done" ? 100 : percentage}%`, backgroundColor: accentColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", zIndex: 1000, width: 144, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  label: { fontSize: 10, lineHeight: 13, marginBottom: 4 },
  track: { height: 3, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
});
