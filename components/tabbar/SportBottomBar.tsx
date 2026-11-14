import { FLOATING_TAB_BAR_HEIGHT } from "@/hooks/useFloatingTabBarPadding";
import React, { useId, useState } from "react";
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Text } from "@/components/ui/i18nText";
import SportTabIcon from "./SportTabIcon";
import { useDuoSideNavigation } from "@/hooks/useDuoSideNavigation";
import { NotificationSidebarAction } from "@/components/GlobalNotificationShell";
import { useSelector } from "react-redux";
import { router } from "expo-router";

type Props = BottomTabBarProps & { visibleRoutes: BottomTabBarProps["state"]["routes"] };

export default function SportBottomBar({ state, descriptors, navigation, visibleRoutes }: Props) {
  const insets = useSafeAreaInsets();
  const sideNavigation = useDuoSideNavigation();
  const { height } = useWindowDimensions();
  const userInfo = useSelector((state: any) => state.auth?.userInfo || null);
  const isAdmin = Boolean(userInfo?.isAdmin || userInfo?.role === "admin" || userInfo?.isSuperAdmin);
  const [dockWidth, setDockWidth] = useState(0);
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const tournamentIndex = visibleRoutes.findIndex((route) => route.name === "tournaments");
  const center = dockWidth * (tournamentIndex + 0.5) / Math.max(visibleRoutes.length, 1);
  // Khoét cong theo cột Giải đấu thực tế, không dùng chiều rộng màn hình cũ.
  const notch = tournamentIndex >= 0
    ? `H${center - 47} C${center - 35} 1 ${center - 38} 43 ${center} 43 C${center + 38} 43 ${center + 35} 1 ${center + 47} 1`
    : "";
  const dockPath = `M23 1 ${notch} H${dockWidth - 23} Q${dockWidth - 1} 1 ${dockWidth - 1} 23 V41 Q${dockWidth - 1} 63 ${dockWidth - 23} 63 H23 Q1 63 1 41 V23 Q1 1 23 1 Z`;
  if (sideNavigation.enabled) {
    return (
      <View testID="sport-side-navigation" style={[styles.sideBar, { width: sideNavigation.width, paddingTop: Math.max(150, height * 0.25), paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.sideTab} testID="sport-side-notifications">
          <NotificationSidebarAction />
        </View>
        {isAdmin ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Quản trị" testID="sport-side-admin" onPress={() => router.push("/admin/home")} style={({ pressed }) => [styles.sideTab, pressed && styles.pressed]}>
            <View style={styles.sideIcon}>
              <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}>
                <Path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5L12 2Z" fill="none" stroke="#B4C9E5" strokeWidth={1.8} strokeLinejoin="round" />
                <Path d="M9 12l2 2 4-4" fill="none" stroke="#13D5EE" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={styles.sideLabel}>Quản trị</Text>
          </Pressable>
        ) : null}
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = state.routes[state.index]?.key === route.key;
          const tournament = route.name === "tournaments";
          const label = typeof options.tabBarLabel === "string" ? options.tabBarLabel : options.title || route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel || label}
              testID={`sport-tab-${route.name}`}
              onPress={() => {
                if (Platform.OS === "ios") void Haptics.selectionAsync().catch(() => {});
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              style={({ pressed }) => [styles.sideTab, pressed && styles.pressed]}
            >
              <View style={[styles.sideIcon, focused && styles.sideIconActive, tournament && styles.sideTournament]}>
                <SportTabIcon name={route.name} color={tournament ? "#042139" : focused ? "#13D5EE" : "#B4C9E5"} size={23} />
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.2} style={[styles.sideLabel, focused && { color: "#13D5EE" }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
  if (sideNavigation.topEnabled) {
    return (
      <View testID="sport-top-navigation" style={[styles.topBar, { height: sideNavigation.topInset, paddingRight: 120 }]}>
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = state.routes[state.index]?.key === route.key;
          const tournament = route.name === "tournaments";
          const label = typeof options.tabBarLabel === "string" ? options.tabBarLabel : options.title || route.name;
          return (
            <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={options.tabBarAccessibilityLabel || label} testID={`sport-tab-${route.name}`}
              onPress={() => {
                if (Platform.OS === "ios") void Haptics.selectionAsync().catch(() => {});
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              style={({ pressed }) => [styles.topTab, pressed && styles.pressed]}>
              <View style={[styles.topIcon, tournament && styles.sideTournament, focused && !tournament && styles.sideIconActive]}>
                <SportTabIcon name={route.name} color={tournament ? "#042139" : focused ? "#13D5EE" : "#B4C9E5"} size={21} />
              </View>
              <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.topLabel, focused && { color: "#13D5EE" }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
  return (
    <View pointerEvents="box-none" testID="raised-sport-navigation" style={[styles.bar, {
      paddingBottom: Math.max(insets.bottom - 8, 8),
      paddingLeft: insets.left + 12,
      paddingRight: insets.right + 12,
    }]}>
      <View pointerEvents="box-none" style={styles.items} onLayout={({ nativeEvent: { layout } }) => setDockWidth(layout.width)}>
        {dockWidth > 0 ? (
          <Svg pointerEvents="none" width={dockWidth} height={64} viewBox={`0 0 ${dockWidth} 64`} style={styles.dock} accessible={false}>
            <Defs>
              <LinearGradient id={`dock${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#0D2541" />
                <Stop offset="1" stopColor="#07192B" />
              </LinearGradient>
            </Defs>
            <Path d={dockPath} fill={`url(#dock${gradientId})`} stroke="#34577B" strokeWidth={1} />
          </Svg>
        ) : null}
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = state.routes[state.index]?.key === route.key;
          const tournament = route.name === "tournaments";
          const color = tournament ? "#F4F9FF" : focused ? "#13D5EE" : "#B4C9E5";
          const label = typeof options.tabBarLabel === "string" ? options.tabBarLabel : options.title || route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              aria-selected={focused}
              accessibilityLabel={options.tabBarAccessibilityLabel || label}
              testID={`sport-tab-${route.name}`}
              onPress={() => {
                if (Platform.OS === "ios") void Haptics.selectionAsync().catch(() => {});
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              style={({ pressed }) => [styles.tab, tournament && styles.tournamentTab, pressed && styles.pressed]}
            >
              {tournament ? (
                <View testID="raised-tournament-button" style={styles.tournamentButton}>
                  <Svg pointerEvents="none" width={58} height={58} viewBox="0 0 58 58" style={StyleSheet.absoluteFillObject} accessible={false}>
                    <Defs>
                      <LinearGradient id={`cup${gradientId}`} x1="0" y1="0" x2="0.7" y2="1">
                        <Stop offset="0" stopColor="#43E8F7" />
                        <Stop offset="1" stopColor="#00BCE9" />
                      </LinearGradient>
                    </Defs>
                    <Circle cx={29} cy={29} r={27.5} fill={`url(#cup${gradientId})`} stroke="#73EEFA" strokeWidth={1.5} />
                  </Svg>
                  <View style={styles.tournamentGlyph}>
                    <SportTabIcon name={route.name} color="#042139" size={28} />
                  </View>
                </View>
              ) : null}
              <View testID={`sport-tab-content-${route.name}`} pointerEvents="none" style={[styles.tabContent, !tournament && { opacity: focused ? 0.9 : 0.78 }]}>
                {!tournament ? (
                  <View style={styles.iconWrap}>
                    <SportTabIcon name={route.name} color={color} size={22} />
                  </View>
                ) : null}
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.2} style={[styles.label, tournament && styles.tournamentLabel, { color, fontWeight: tournament || focused ? "700" : "500" }]}>{label}</Text>
                {focused ? <View testID={`sport-tab-active-${route.name}`} style={styles.activeDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, backgroundColor: "#041529" },
  topTab: { flex: 1, minWidth: 0, height: 60, alignItems: "center", justifyContent: "center", gap: 2 },
  topIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  topLabel: { width: "100%", textAlign: "center", color: "#B4C9E5", fontSize: 10, lineHeight: 13, fontWeight: "600" },
  sideBar: { height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#041529" },
  sideTab: { width: "100%", flex: 1, maxHeight: 72, minHeight: 44, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 4 },
  sideIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  sideIconActive: { backgroundColor: "#0B3554" },
  sideTournament: { backgroundColor: "#00C8EB", borderWidth: 1, borderColor: "#73EEFA" },
  sideLabel: { width: "100%", textAlign: "center", color: "#B4C9E5", fontSize: 9, lineHeight: 12, fontWeight: "600" },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 1, backgroundColor: "transparent" },
  dock: { position: "absolute", top: 24, left: 0 },
  items: { flexDirection: "row", height: FLOATING_TAB_BAR_HEIGHT },
  tab: { flex: 1, minWidth: 0, height: 64, marginTop: 24, alignItems: "center" },
  tournamentTab: { height: FLOATING_TAB_BAR_HEIGHT, marginTop: 0 },
  pressed: { opacity: 0.85 },
  tabContent: { ...StyleSheet.absoluteFillObject, alignItems: "center" },
  iconWrap: { position: "absolute", top: 12, height: 24, alignItems: "center", justifyContent: "center" },
  tournamentButton: {
    position: "absolute", top: 4, width: 58, height: 58, borderRadius: 29,
    alignItems: "center", justifyContent: "center", backgroundColor: "#00C8EB",
    shadowColor: "#000C1C", shadowOpacity: 0.35, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  tournamentGlyph: { zIndex: 1 },
  activeDot: { position: "absolute", bottom: 2, width: 3, height: 3, borderRadius: 2, backgroundColor: "#13D5EE" },
  tournamentLabel: { top: 68 },
  label: { position: "absolute", top: 44, width: "100%", paddingHorizontal: 1, textAlign: "center", fontSize: 10.5, lineHeight: 15 },
});
