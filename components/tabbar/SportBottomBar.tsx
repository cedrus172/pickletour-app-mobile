import { FLOATING_TAB_BAR_HEIGHT } from "@/hooks/useFloatingTabBarPadding";
import React, { useId, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Text } from "@/components/ui/i18nText";
import SportTabIcon from "./SportTabIcon";

type Props = BottomTabBarProps & { visibleRoutes: BottomTabBarProps["state"]["routes"] };

export default function SportBottomBar({ state, descriptors, navigation, visibleRoutes }: Props) {
  const insets = useSafeAreaInsets();
  const [dockWidth, setDockWidth] = useState(0);
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const tournamentIndex = visibleRoutes.findIndex((route) => route.name === "tournaments");
  const center = dockWidth * (tournamentIndex + 0.5) / Math.max(visibleRoutes.length, 1);
  // Khoét cong theo cột Giải đấu thực tế, không dùng chiều rộng màn hình cũ.
  const notch = tournamentIndex >= 0
    ? `H${center - 47} C${center - 35} 1 ${center - 38} 43 ${center} 43 C${center + 38} 43 ${center + 35} 1 ${center + 47} 1`
    : "";
  const dockPath = `M23 1 ${notch} H${dockWidth - 23} Q${dockWidth - 1} 1 ${dockWidth - 1} 23 V41 Q${dockWidth - 1} 63 ${dockWidth - 23} 63 H23 Q1 63 1 41 V23 Q1 1 23 1 Z`;
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
