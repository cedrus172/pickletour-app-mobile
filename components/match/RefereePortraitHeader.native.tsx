import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Ripple from "react-native-material-ripple";
import { Text } from "@/components/ui/i18nText";

export default function RefereePortraitHeader({ code, detail, utilities, clock, onBack, onUndo, onSwap, onCourt, preStart, undoDisabled, undoBusy, courtLabel, colors }: {
  code: string; detail: string; utilities: React.ReactNode; clock: React.ReactNode;
  onBack: () => void; onUndo: () => void; onSwap: () => void; onCourt?: () => void;
  preStart: boolean; undoDisabled: boolean; undoBusy: boolean; courtLabel: string;
  colors: { text: string; card: string; border: string };
}) {
  return <View style={{ gap: 6 }} testID="referee-portrait-header">
    <View style={styles.row}>
      <Ripple onPress={onBack} accessibilityLabel="Quay lại" style={[styles.back, { borderColor: "#1b557f", backgroundColor: colors.card }]}><MaterialIcons name="chevron-left" size={24} color={colors.text} /></Ripple>
      <View style={[styles.code, { backgroundColor: colors.card }]}>
        <Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2} style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>{code}</Text>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ color: "#91bde0", fontSize: 10, fontWeight: "700" }}>{detail}</Text>
      </View>
      {utilities}
    </View>
    <View style={styles.row}>
      {!preStart ? <Ripple onPress={onUndo} disabled={undoDisabled} style={[styles.action, { backgroundColor: "#835315", borderColor: "#efbc43", opacity: undoDisabled ? 0.5 : 1 }]}>
        {undoBusy ? <ActivityIndicator size="small" color="#fff1bf" /> : <MaterialIcons name="undo" size={16} color="#fff1bf" />}
        <Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3} style={[styles.label, { color: "#fff1bf" }]}>Hoàn tác</Text>
      </Ripple> : onCourt ? <Ripple onPress={onCourt} style={[styles.action, { backgroundColor: colors.card, borderColor: "#1b557f" }]}>
        <MaterialIcons name="edit-location" size={16} color={colors.text} /><Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3} style={[styles.label, { color: colors.text }]}>{courtLabel}</Text>
      </Ripple> : null}
      <Ripple onPress={onSwap} style={[styles.action, { backgroundColor: colors.card, borderColor: "#0995cf" }]}>
        <MaterialIcons name="swap-horiz" size={16} color="#8fcbf5" /><Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3} style={[styles.label, { color: "#8fcbf5" }]}>Đổi bên</Text>
      </Ripple>
      {clock}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  back: { width: 34, height: 40, borderWidth: 1, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  code: { flex: 1, minWidth: 0, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: "#1b557f", paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  action: { flex: 1, minWidth: 0, height: 40, borderRadius: 11, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 5, gap: 4 },
  label: { fontSize: 13, fontWeight: "800", flexShrink: 1 },
});
