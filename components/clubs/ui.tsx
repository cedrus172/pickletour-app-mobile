import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
// ✅ dùng Lottie thay icon
import LottieView from "lottie-react-native";
import { SHOULD_RENDER_NATIVE_LOTTIE } from "@/utils/runtimeSafety";
import AppleLiquidGlassView from "@/components/ui/AppleLiquidGlassView";
import { sk } from "@/hooks/uiVersion";
export const Section = ({ title, subtitle, children }: any) => (
  <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {!!subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
    <View style={{ height: 8 }} />
    {children}
  </View>
);

export const GlassCard = ({ children, style }: any) => (
  <View style={[styles.glass, style]}>
    <AppleLiquidGlassView
      intensity={Platform.OS === "ios" ? 30 : 20}
      tint={sk("dark", "light")}
      style={StyleSheet.absoluteFill}
    />
    <LinearGradient
      colors={sk<[string, string]>(["#0b1220AA", "#0b122055"], ["#FFFFFFF2", "#FFFFFFE0"])}
      style={StyleSheet.absoluteFill}
    />
    <View style={{ padding: 12 }}>{children}</View>
  </View>
);

export const PrimaryBtn = ({ title, onPress, small, style, disabled }: any) => (
  <TouchableOpacity
    activeOpacity={0.9}
    disabled={disabled}
    onPress={onPress}
    style={[styles.pBtn, small && styles.pBtnSmall, style]}
  >
    <LinearGradient
      colors={sk<[string, string]>(["#4ECDC4", "#45B7D1"], ["#2F8BFF", "#1466F2"])}
      style={StyleSheet.absoluteFill}
    />
    <Text style={styles.pBtnText}>{title}</Text>
  </TouchableOpacity>
);

export const SecondaryBtn = ({ title, onPress, small, style }: any) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={onPress}
    style={[styles.sBtn, small && styles.sBtnSmall, style]}
  >
    <Text style={styles.sBtnText}>{title}</Text>
  </TouchableOpacity>
);

export const DangerGhostBtn = ({ title, onPress, small, style }: any) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={onPress}
    style={[styles.dBtn, small && styles.dBtnSmall, style]}
  >
    <Text style={styles.dBtnText}>{title}</Text>
  </TouchableOpacity>
);

export const Badge = ({ text }: { text: string }) => (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>{text}</Text>
  </View>
);

export const EmptyState = ({
  label,
  icon, // giữ lại cho tương thích cũ, không dùng nữa
  size = 120,
  speed = 1,
}: {
  label: string;
  icon?: any;
  size?: number;
  speed?: number;
}) => (
  <View
    style={{
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 22,
    }}
  >
    {SHOULD_RENDER_NATIVE_LOTTIE ? (
      <LottieView
        source={require("@/assets/lottie/empty.json")}
        autoPlay
        loop
        speed={speed}
        style={{ width: size, height: size }}
      />
    ) : icon ? (
      <MaterialCommunityIcons
        name={icon as any}
        size={Math.min(size, 96)}
        color={sk("#7f92b3", "#97A3B8")}
      />
    ) : null}
    <Text style={{ color: sk("#7f92b3", "#5F6F8A"), marginTop: 6 }}>{label}</Text>
  </View>
);

export const ProgressBar = ({ progress }: { progress: number }) => (
  <View style={styles.progressWrap}>
    <View
      style={[
        styles.progressFill,
        { width: `${Math.min(100, Math.max(0, progress * 100))}%` },
      ]}
    />
  </View>
);

const styles = StyleSheet.create({
  sectionTitle: { color: sk("#93a9c9", "#0B1B3A"), fontWeight: "800", fontSize: 18 },
  sectionSub: { color: sk("#93a9c9", "#5F6F8A"), marginTop: 2 },
  glass: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: sk("#253046", "rgba(16,42,92,0.10)"),
  },
  pBtn: {
    minWidth: 140,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pBtnSmall: { minWidth: 96, height: 34 },
  pBtnText: { color: sk("#06101a", "#FFFFFF"), fontWeight: "800" },
  sBtn: {
    minWidth: 120,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: sk("#122036", "#EEF3FA"),
    borderWidth: 1,
    borderColor: sk("#263551", "rgba(16,42,92,0.10)"),
    paddingHorizontal: 16,
  },
  sBtnSmall: { minWidth: 96, height: 34 },
  sBtnText: { color: sk("#cce9ff", "#243450"), fontWeight: "700" },
  dBtn: {
    minWidth: 120,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: sk("#2a0f15", "rgba(220,38,38,0.08)"),
    borderWidth: 1,
    borderColor: sk("#652d34", "rgba(220,38,38,0.30)"),
    paddingHorizontal: 16,
  },
  dBtnSmall: { minWidth: 96, height: 34 },
  dBtnText: { color: sk("#ffb4bd", "#DC2626"), fontWeight: "700" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: sk("#0b1220AA", "rgba(20,102,242,0.08)"),
    borderWidth: 1,
    borderColor: sk("#2a3447", "rgba(20,102,242,0.16)"),
  },
  badgeText: { color: sk("#bfe6ff", "#1466F2"), fontSize: 12 },
  progressWrap: {
    height: 6,
    borderRadius: 999,
    backgroundColor: sk("#1a2334", "#E9F0FA"),
    overflow: "hidden",
  },
  progressFill: { height: 6, backgroundColor: sk("#45B7D1", "#1466F2") },
});
