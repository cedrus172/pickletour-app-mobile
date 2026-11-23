// components/fanpage/NameStylePicker.tsx — chọn màu / gradient tên Fanpage (cùng dạng nameStyle của hiệu ứng tên VĐV).
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import PlayerNameText from "@/components/PlayerNameText";
import { Text } from "@/components/ui/i18nText";
import TextInput from "@/components/ui/i18nTextInput";
import type { ThemeTokens } from "@/hooks/useThemeTokens";

export type NameStyle = { effect: "none" | "solid" | "gradient"; color?: string; colors?: string[]; angle?: number; bold?: boolean } | null;

const SOLIDS: { label: string; color: string }[] = [
  { label: "Xanh PickleTour", color: "#08CDF5" },
  { label: "Xanh dương", color: "#2F8BFF" },
  { label: "Xanh chanh", color: "#C5F433" },
  { label: "Vàng kim", color: "#F5B800" },
  { label: "Cam", color: "#FF8A00" },
  { label: "Đỏ", color: "#EF4444" },
  { label: "Hồng", color: "#EC4899" },
  { label: "Tím", color: "#8B5CF6" },
];

const GRADIENTS: { label: string; colors: string[] }[] = [
  { label: "Đại dương", colors: ["#08CDF5", "#1677FF"] },
  { label: "Neon", colors: ["#C5F433", "#08CDF5"] },
  { label: "Hoàng hôn", colors: ["#FF8A00", "#EC4899"] },
  { label: "Hoàng gia", colors: ["#F5B800", "#FF6A00"] },
  { label: "Mộng tím", colors: ["#8B5CF6", "#EC4899"] },
  { label: "Cầu vồng", colors: ["#EF4444", "#FF8A00", "#F5B800", "#22C55E", "#08CDF5", "#2F8BFF", "#8B5CF6"] },
];

const isHex = (s: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s.trim());
const same = (a?: string[], b?: string[]) => (a || []).join(",").toLowerCase() === (b || []).join(",").toLowerCase();

export default function NameStylePicker({
  C,
  name,
  value,
  onChange,
}: {
  C: ThemeTokens;
  name: string;
  value: NameStyle;
  onChange: (v: NameStyle) => void;
}) {
  const [custom, setCustom] = useState(value?.effect === "solid" && !SOLIDS.some((s) => s.color.toLowerCase() === String(value?.color).toLowerCase()) ? String(value?.color || "") : "");
  const effect = value?.effect || "none";
  const bold = Boolean(value?.bold);
  const set = (v: NameStyle) => onChange(v && v.effect !== "none" ? { ...v, bold } : { effect: "none" });

  const swatch = (on: boolean) => [styles.swatch, { borderColor: on ? C.text : "transparent" }];

  return (
    <View style={{ gap: 10 }}>
      {/* Xem trước */}
      <View style={[styles.preview, { borderColor: C.border, backgroundColor: C.field }]}>
        <Text style={{ color: C.sub, fontSize: 11.5, marginBottom: 4 }}>Xem trước</Text>
        {effect === "none" ? (
          <Text style={{ color: C.text, fontSize: 20, fontWeight: "900" }} numberOfLines={1}>
            {name || "Tên Fanpage"}
          </Text>
        ) : (
          <PlayerNameText
            user={{ _id: "preview", name: name || "Tên Fanpage", nameStyle: value }}
            name={name || "Tên Fanpage"}
            style={{ fontSize: 20, fontWeight: "900", color: C.text }}
            numberOfLines={1}
          />
        )}
      </View>

      <Pressable onPress={() => set({ effect: "none" })} style={[styles.noneBtn, { borderColor: effect === "none" ? C.primary : C.border, backgroundColor: effect === "none" ? C.primarySoft : C.field }]}>
        <Text style={{ color: effect === "none" ? C.primary : C.text, fontWeight: "800", fontSize: 13 }}>Mặc định (không màu)</Text>
      </Pressable>

      <Text style={{ color: C.sub, fontWeight: "700", fontSize: 12.5 }}>Một màu</Text>
      <View style={styles.row}>
        {SOLIDS.map((s) => {
          const on = effect === "solid" && String(value?.color).toLowerCase() === s.color.toLowerCase();
          return (
            <Pressable key={s.color} accessibilityLabel={s.label} onPress={() => { setCustom(""); set({ effect: "solid", color: s.color }); }} style={swatch(on)}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TextInput
          value={custom}
          onChangeText={(t: string) => {
            setCustom(t);
            if (isHex(t)) set({ effect: "solid", color: t.trim() });
          }}
          placeholder="Mã màu tuỳ chỉnh, vd #22D3EE"
          placeholderTextColor={C.muted}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={7}
          style={[styles.hex, { color: C.text, borderColor: C.border, backgroundColor: C.field }]}
        />
        {custom && isHex(custom) ? <View style={[styles.dot, { backgroundColor: custom.trim() }]} /> : null}
      </View>

      <Text style={{ color: C.sub, fontWeight: "700", fontSize: 12.5 }}>Chuyển màu (gradient)</Text>
      <View style={styles.row}>
        {GRADIENTS.map((g) => {
          const on = effect === "gradient" && same(value?.colors, g.colors);
          return (
            <Pressable key={g.label} accessibilityLabel={g.label} onPress={() => set({ effect: "gradient", colors: g.colors, angle: 90 })} style={[styles.gradItem, { borderColor: on ? C.text : C.border }]}>
              <LinearGradient colors={g.colors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradBar} />
              <Text style={{ color: C.text, fontSize: 11.5, fontWeight: "700" }}>{g.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {effect !== "none" ? (
        <Pressable onPress={() => onChange({ ...(value as any), bold: !bold })} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[styles.check, { borderColor: C.primary, backgroundColor: bold ? C.primary : "transparent" }]} />
          <Text style={{ color: C.text, fontSize: 13 }}>In đậm thêm</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { padding: 12, borderRadius: 12, borderWidth: 1 },
  noneBtn: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  dot: { width: 30, height: 30, borderRadius: 15 },
  hex: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, fontSize: 14 },
  gradItem: { width: 96, padding: 6, borderRadius: 10, borderWidth: 1.5, gap: 4, alignItems: "center" },
  gradBar: { width: "100%", height: 16, borderRadius: 8 },
  check: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5 },
});
