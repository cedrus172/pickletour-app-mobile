import React, { createContext, useCallback, useContext, useId, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaInsetsContext, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import type { NativeStackHeaderItemProps } from "@react-navigation/native-stack";
import { useNotifUnreadCountQuery } from "@/slices/notificationCenterApiSlice";
import HomeNotificationButton from "@/components/home/HomeNotificationButton";
import type { NotificationUpdate } from "@/components/home/HomeNotificationButton";

const NotificationContext = createContext<{
  visible: boolean;
  unreadCount: number;
  register: (id: string, active: boolean) => void;
  update?: NotificationUpdate;
}>({
  visible: false,
  unreadCount: 0,
  register: () => {},
});

/** Places the shared action inside an existing page/native header. */
export function NotificationHeaderActions({ children }: { children?: React.ReactNode }) {
  const { visible, unreadCount, register, update } = useContext(NotificationContext);
  const focused = useIsFocused();
  const id = useId();
  // Navigation blur cleans up even when freezeOnBlur suspends the old screen.
  useFocusEffect(useCallback(() => {
    register(id, visible);
    return () => register(id, false);
  }, [id, register, visible]));
  if ((!visible || !focused) && !children) return null;
  return (
    <View style={styles.headerActions} testID="notification-header-actions">
      {children}
      {visible && focused ? <HomeNotificationButton unreadCount={unreadCount} update={update} /> : null}
    </View>
  );
}

/** Keeps each page's existing header actions and appends the bell on the right. */
export function withNotificationHeader(Header?: (props: NativeStackHeaderItemProps) => React.ReactNode) {
  return function HeaderWithNotification(props: NativeStackHeaderItemProps) {
    return <NotificationHeaderActions>{Header ? <Header {...props} /> : null}</NotificationHeaderActions>;
  };
}

/** No action row: page content uses the full safe frame; unanchored pages get a corner overlay. */
export default function GlobalNotificationShell({
  children,
  visible,
  backgroundColor,
  update,
  showButton = true,
}: {
  children: React.ReactNode;
  visible: boolean;
  backgroundColor: string;
  update?: NotificationUpdate;
  showButton?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const buttonVisible = visible && showButton;
  const [anchors, setAnchors] = useState<Set<string>>(() => new Set());
  const register = useCallback((id: string, active: boolean) => {
    setAnchors((current) => {
      if (current.has(id) === active) return current;
      const next = new Set(current);
      if (active) next.add(id); else next.delete(id);
      return next;
    });
  }, []);
  const userInfo = useSelector((state: any) => state.auth?.userInfo);
  const isAuthed = Boolean(userInfo?.token || userInfo?._id || userInfo?.email);
  const { data } = useNotifUnreadCountQuery(undefined, {
    skip: !buttonVisible || !isAuthed,
    pollingInterval: 30000,
  });
  // Consume only the system status area, never a separate notification row.
  // The native provider and JS context both see the remaining content frame.
  const contentInsets = useMemo(
    () => ({ ...insets, top: visible ? 0 : insets.top }),
    [insets, visible],
  );

  const context = useMemo(() => ({ visible: buttonVisible, unreadCount: isAuthed ? Number(data?.count || 0) : 0, register, update }), [buttonVisible, data?.count, isAuthed, register, update]);

  return (
    <NotificationContext.Provider value={context}>
      <View style={[styles.shell, { backgroundColor, paddingTop: visible ? insets.top : 0 }]}>
        <SafeAreaProvider style={styles.content}>
          <SafeAreaInsetsContext.Provider value={contentInsets}>
            <View style={styles.content} testID="global-notification-content">
              {children}
            </View>
          </SafeAreaInsetsContext.Provider>
        </SafeAreaProvider>
        {buttonVisible && anchors.size === 0 ? (
          <View
            pointerEvents="box-none"
            testID="global-notification-corner"
            style={[styles.corner, { top: insets.top + 8, right: Math.max(insets.right, 16) }]}
          >
            <HomeNotificationButton unreadCount={context.unreadCount} update={update} />
          </View>
        ) : null}
      </View>
    </NotificationContext.Provider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  corner: { position: "absolute", zIndex: 10 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  content: { flex: 1, minHeight: 0 },
});
