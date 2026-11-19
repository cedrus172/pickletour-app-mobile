// components/tournaments/TournamentFilterSheet.tsx — bảng "Tìm & lọc giải đấu" (mockup docs/mockups/giai-dau-loc-2-bang.png):
// ô tìm tên giải + thời gian (Tất cả / Hôm nay / Tuần này / Tháng này / khoảng ngày) + khu vực (tỉnh/thành có giải).
import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/i18nText";
import { TextInput } from "@/components/ui/i18nTextInput";
import AppModal from "@/components/ui/AppModal";
import { TOURNAMENT_COLORS } from "@/components/tournaments/TournamentDesign";

export type TimePreset = "all" | "today" | "week" | "month" | "range";
export type TournamentFilterValue = { keyword: string; time: TimePreset; province: string };

export const TIME_LABEL: Record<TimePreset, string> = { all: "Tất cả", today: "Hôm nay", week: "Tuần này", month: "Tháng này", range: "Khoảng ngày" };

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export default function TournamentFilterSheet({
  visible,
  value,
  provinces,
  rangeLabel,
  countFor,
  onClose,
  onApply,
  onPickRange,
}: {
  visible: boolean;
  value: TournamentFilterValue;
  provinces: string[];
  rangeLabel?: string;
  countFor: (v: TournamentFilterValue) => number;
  onClose: () => void;
  onApply: (v: TournamentFilterValue) => void;
  onPickRange: (draft: TournamentFilterValue) => void;
}) {
  const [draft, setDraft] = useState<TournamentFilterValue>(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);
  const n = countFor(draft);
  return (
    <AppModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Đóng" style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheetWrap} pointerEvents="box-none">
        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text style={styles.title}>Tìm & lọc giải đấu</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng" hitSlop={10} onPress={onClose}>
              <Ionicons name="close" size={24} color={TOURNAMENT_COLORS.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
            <View style={styles.search}>
              <Ionicons name="search-outline" size={20} color={TOURNAMENT_COLORS.textMuted} />
              <TextInput
                testID="tournament-search"
                accessibilityLabel="Tìm kiếm giải đấu"
                value={draft.keyword}
                onChangeText={(t: string) => setDraft((d) => ({ ...d, keyword: t }))}
                placeholder="Tên giải đấu…"
                placeholderTextColor={TOURNAMENT_COLORS.textMuted}
                returnKeyType="search"
                onSubmitEditing={() => onApply(draft)}
                style={styles.searchInput}
              />
              {draft.keyword ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Xoá chữ" hitSlop={8} onPress={() => setDraft((d) => ({ ...d, keyword: "" }))}>
                  <Ionicons name="close-circle" size={19} color={TOURNAMENT_COLORS.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.section}>Thời gian</Text>
            <View style={styles.wrap}>
              {(["all", "today", "week", "month"] as TimePreset[]).map((k) => (
                <Chip key={k} label={TIME_LABEL[k]} on={draft.time === k} onPress={() => setDraft((d) => ({ ...d, time: k }))} />
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={() => onPickRange(draft)} style={[styles.rangeRow, draft.time === "range" && styles.chipOn]}>
              <Ionicons name="calendar-outline" size={18} color={draft.time === "range" ? "#FFFFFF" : TOURNAMENT_COLORS.primary} />
              <Text style={[styles.rangeText, draft.time === "range" && styles.chipTextOn]} numberOfLines={1}>
                {draft.time === "range" && rangeLabel ? rangeLabel : "Chọn khoảng ngày"}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={draft.time === "range" ? "#FFFFFF" : TOURNAMENT_COLORS.textMuted} />
            </Pressable>

            {provinces.length ? (
              <>
                <Text style={styles.section}>Khu vực</Text>
                <View style={styles.wrap}>
                  <Chip label="Tất cả" on={!draft.province} onPress={() => setDraft((d) => ({ ...d, province: "" }))} />
                  {provinces.map((p) => (
                    <Chip key={p} label={p} on={draft.province === p} onPress={() => setDraft((d) => ({ ...d, province: p }))} />
                  ))}
                </View>
              </>
            ) : null}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => setDraft({ keyword: "", time: "all", province: "" })} style={[styles.btn, styles.btnOutline]}>
              <Text style={styles.btnOutlineText}>Xoá lọc</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => onApply(draft)} style={[styles.btn, styles.btnFill]}>
              <Text style={styles.btnFillText}>Áp dụng ({n} giải)</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </AppModal>
  );
}

const C = TOURNAMENT_COLORS;
const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  sheetWrap: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "86%", backgroundColor: C.backgroundAlt, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 8, borderWidth: 1, borderColor: C.border },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: C.border, marginBottom: 8 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { color: C.text, fontSize: 18, fontWeight: "900" },
  search: { flexDirection: "row", alignItems: "center", gap: 8, height: 48, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  searchInput: { flex: 1, color: C.text, fontSize: 15.5 },
  section: { color: C.text, fontWeight: "800", fontSize: 14.5, marginTop: 4 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { color: C.textSoft, fontWeight: "700", fontSize: 13.5 },
  chipTextOn: { color: "#FFFFFF" },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: 10, height: 46, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  rangeText: { flex: 1, color: C.textSoft, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, paddingTop: 12, paddingBottom: 6 },
  btn: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnOutline: { borderWidth: 1.5, borderColor: C.primary },
  btnOutlineText: { color: C.primary, fontWeight: "900", fontSize: 15 },
  btnFill: { backgroundColor: C.primary },
  btnFillText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
});
