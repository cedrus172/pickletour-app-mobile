import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { t } from "@/utils/i18n";
import HomeFeatureIcon from "./HomeFeatureIcon";
import HotUpdateIndicator from "@/components/HotUpdateIndicator";
import { Ionicons } from "@expo/vector-icons";
import { IS_V3, sk } from "@/hooks/uiVersion";

export type NotificationUpdate = { visible: boolean; progress: number; status: "downloading" | "done" | "error" };

export default function HomeNotificationButton({ unreadCount, update }: { unreadCount: number; update?: NotificationUpdate }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("Thông báo")}${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
      testID="home-notifications"
      onPress={() => router.navigate("/notifications")}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {IS_V3 ? <Ionicons name="notifications-outline" size={24} color="#0B1B3A" /> : <HomeFeatureIcon id={16} size={30} />}
      {unreadCount > 0 ? <View testID="notification-unread-dot" style={styles.dot} /> : null}
      {update ? <HotUpdateIndicator {...update} inline isDark={!IS_V3} accentColor={sk("#08CDF5", "#1466F2")} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: sk(
    { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: "rgba(18,201,238,0.55)", backgroundColor: "#061B30", alignItems: "center", justifyContent: "center" },
    { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: "rgba(16,42,92,0.06)", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#1B3A7A", shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  ),
  pressed: { opacity: 0.7 },
  dot: sk(
    { position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: "#FF584C", borderWidth: 1.5, borderColor: "#061B30" },
    { position: "absolute", top: 8, right: 9, width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF3B3B", borderWidth: 1.5, borderColor: "#FFFFFF" },
  ),
});
