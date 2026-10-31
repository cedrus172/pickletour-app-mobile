import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaInsetsContext, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { useNotifUnreadCountQuery } from "@/slices/notificationCenterApiSlice";
import HomeNotificationButton from "@/components/home/HomeNotificationButton";

/** A reserved app-wide action row, never a floating hit target over screen controls. */
export default function GlobalNotificationShell({
  children,
  visible,
  backgroundColor,
}: {
  children: React.ReactNode;
  visible: boolean;
  backgroundColor: string;
}) {
  const insets = useSafeAreaInsets();
  const userInfo = useSelector((state: any) => state.auth?.userInfo);
  const isAuthed = Boolean(userInfo?.token || userInfo?._id || userInfo?.email);
  const { data } = useNotifUnreadCountQuery(undefined, {
    skip: !visible || !isAuthed,
    pollingInterval: 30000,
  });
  // The shared row consumes the top safe area once. Nested screens retain all
  // other insets and their existing layout, without adding the status-bar gap twice.
  const contentInsets = useMemo(
    () => ({ ...insets, top: visible ? 0 : insets.top }),
    [insets, visible],
  );

  return (
    <View style={[styles.shell, { backgroundColor }]}>
      {visible ? (
        <View
          testID="global-notification-bar"
          style={[
            styles.actions,
            {
              paddingTop: insets.top + 4,
              paddingLeft: Math.max(insets.left, 16),
              paddingRight: Math.max(insets.right, 16),
            },
          ]}
        >
          <HomeNotificationButton unreadCount={isAuthed ? Number(data?.count || 0) : 0} />
        </View>
      ) : null}
      {/* Native SafeAreaView also needs a provider measured below the shared row;
          changing only the JS context would leave its native top padding intact. */}
      <SafeAreaProvider style={styles.content}>
        <SafeAreaInsetsContext.Provider value={contentInsets}>
          <View style={styles.content} testID="global-notification-content">
            {children}
          </View>
        </SafeAreaInsetsContext.Provider>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  actions: { alignItems: "flex-end", paddingBottom: 4, flexShrink: 0 },
  content: { flex: 1, minHeight: 0 },
});
