import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { t } from "@/utils/i18n";
import HomeFeatureIcon from "./HomeFeatureIcon";

export default function HomeNotificationButton({ unreadCount }: { unreadCount: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("Thông báo")}${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
      testID="home-notifications"
      onPress={() => router.push("/notifications")}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <HomeFeatureIcon id={16} size={30} />
      {unreadCount > 0 ? <View testID="notification-unread-dot" style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: "rgba(18,201,238,0.55)", backgroundColor: "#061B30", alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.7 },
  dot: { position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: "#FF584C", borderWidth: 1.5, borderColor: "#061B30" },
});
