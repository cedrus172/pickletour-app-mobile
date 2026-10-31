import React from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Path, Rect } from "react-native-svg";
import Ripple from "react-native-material-ripple";
import { Text } from "@/components/ui/i18nText";

export const refereeModalColors = {
  background: "#041329", surface: "#061D31", card: "#0A263E",
  control: "#0B304A", border: "#185677", outline: "#098EC1",
  primary: "#12C8EC", primaryText: "#032139", text: "#F0F6FF", muted: "#A8BFD5",
};

/** Safe area riêng của cửa sổ native, đo lại khi xoay máy. */
export default function RefereeModalSurface({ enabled, children }: {
  enabled: boolean; children: React.ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return <SafeAreaProvider style={{ flex: 1, backgroundColor: refereeModalColors.background }}>
    <SafeAreaView edges={["top", "right", "bottom", "left"]} style={modalStyles.safeArea}>
      <View testID="referee-modal-surface" style={modalStyles.surface}>{children}</View>
    </SafeAreaView>
  </SafeAreaProvider>;
}

export function RefereeCourtIcon() {
  return <Svg width={32} height={36} viewBox="0 0 32 36" accessible={false}>
    <Rect x={3} y={3} width={26} height={30} rx={2} fill="none" stroke={refereeModalColors.text} strokeWidth={2.5} />
    <Path d="M16 3V33M3 18H29" stroke={refereeModalColors.text} strokeWidth={2.5} />
  </Svg>;
}

export function RefereeSideSwitchPrompt({ visible, midPoint, onLater, onConfirm }: {
  visible: boolean; midPoint: number | null; onLater: () => void; onConfirm: () => void;
}) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}
    supportedOrientations={["portrait", "landscape-left", "landscape-right", "landscape"]}>
    <SafeAreaProvider style={{ flex: 1 }}>
      <SafeAreaView edges={["top", "right", "bottom", "left"]} style={modalStyles.promptMask}>
        <View testID="referee-side-switch-prompt" style={modalStyles.promptCard}>
          <View style={modalStyles.promptHeader}>
            <View style={modalStyles.promptIcon}><MaterialIcons name="swap-horiz" size={32} color={refereeModalColors.text} /></View>
            <Text style={modalStyles.promptTitle}>Đổi bên?</Text>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={modalStyles.promptBody}>
            <Text style={modalStyles.promptText}>Một đội vừa chạm {midPoint ?? "—"} điểm (giữa game). Bạn có muốn đổi bên ngay bây giờ không?</Text>
          </ScrollView>
          <View style={modalStyles.promptFooter}>
            <Ripple accessibilityRole="button" accessibilityLabel="Để sau" onPress={onLater} style={[modalStyles.button, modalStyles.outlineButton]} rippleContainerBorderRadius={14}>
              <Text style={modalStyles.buttonText}>Để sau</Text>
            </Ripple>
            <Ripple accessibilityRole="button" accessibilityLabel="Đổi bên" onPress={onConfirm} style={[modalStyles.button, modalStyles.primaryButton]} rippleContainerBorderRadius={14}>
              <MaterialIcons name="swap-horiz" size={22} color={refereeModalColors.primaryText} />
              <Text style={[modalStyles.buttonText, { color: refereeModalColors.primaryText }]}>Đổi bên</Text>
            </Ripple>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  </Modal>;
}

export const modalStyles = StyleSheet.create({
  safeArea: { flex: 1, padding: 8, alignItems: "center" },
  surface: { flex: 1, width: "100%", maxWidth: 1100, minWidth: 0, borderWidth: 1, borderColor: "#0980B2", borderRadius: 20, overflow: "hidden", backgroundColor: refereeModalColors.surface },
  header: { minHeight: 68, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: refereeModalColors.surface, borderBottomWidth: 0 },
  title: { flexShrink: 1, color: refereeModalColors.text, fontSize: 21, lineHeight: 28, fontWeight: "800" },
  headerIcon: { width: 44, height: 44, borderWidth: 1, borderColor: refereeModalColors.border, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: refereeModalColors.card },
  footer: { padding: 16, flexDirection: "row", gap: 10, backgroundColor: refereeModalColors.surface },
  button: { flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  outlineButton: { backgroundColor: refereeModalColors.surface, borderColor: refereeModalColors.outline },
  primaryButton: { backgroundColor: refereeModalColors.primary, borderColor: "#42DDF4" },
  buttonText: { color: refereeModalColors.text, fontSize: 16, lineHeight: 22, fontWeight: "800", textAlign: "center", flexShrink: 1 },
  promptMask: { flex: 1, padding: 16, backgroundColor: "rgba(2,10,22,0.68)", alignItems: "center", justifyContent: "center" },
  promptCard: { width: "100%", maxWidth: 600, maxHeight: "100%", borderRadius: 20, borderWidth: 1.5, borderTopWidth: 3, borderColor: "#099BD0", backgroundColor: "#081F37", overflow: "hidden", shadowColor: "#000C1C", shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  promptHeader: { marginHorizontal: 22, paddingVertical: 20, flexDirection: "row", alignItems: "center", gap: 18, borderBottomWidth: 1, borderColor: "#174361" },
  promptIcon: { width: 54, height: 54, borderRadius: 16, borderWidth: 1.5, borderColor: "#0AB4D3", backgroundColor: "#0C4E62", alignItems: "center", justifyContent: "center" },
  promptTitle: { flex: 1, minWidth: 0, fontSize: 26, lineHeight: 34, fontWeight: "900", color: refereeModalColors.text },
  promptBody: { paddingHorizontal: 22, paddingVertical: 16 },
  promptText: { fontSize: 17, lineHeight: 25, color: refereeModalColors.muted },
  promptFooter: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 22, flexDirection: "row", gap: 12 },
});
