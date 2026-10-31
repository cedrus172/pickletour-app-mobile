import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Text } from "@/components/ui/i18nText";
import SportTabIcon from "./SportTabIcon";

type Props = BottomTabBarProps & { visibleRoutes: BottomTabBarProps["state"]["routes"] };

export default function SportBottomBar({ state, descriptors, navigation, visibleRoutes }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <Svg pointerEvents="none" width="100%" height={16} viewBox="0 0 390 16" preserveAspectRatio="none" style={styles.topEdge}>
        <Path d="M0 15 12 2H378l12 13" fill="none" stroke="#19577C" strokeWidth={1} />
        <Path d="m0 13 11-11h8M371 2h8l11 11" fill="none" stroke="#12C9EE" strokeWidth={2} />
      </Svg>
      <View style={[styles.items, { paddingLeft: Math.max(insets.left, 6), paddingRight: Math.max(insets.right, 6) }]}>
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = state.routes[state.index]?.key === route.key;
          const color = focused ? "#08CDF5" : "#91AECE";
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
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              {focused ? <View style={styles.activeLine} /> : null}
              <View style={styles.iconWrap}>
                {focused ? (
                  <Svg width={70} height={35} viewBox="0 0 70 35" style={styles.activePlate} accessible={false} focusable={false}>
                    <Defs><LinearGradient id="sportActive" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#07516F" /><Stop offset="1" stopColor="#06283D" /></LinearGradient></Defs>
                    <Path d="M11 1H59L69 21 59 34H11L1 21Z" fill="url(#sportActive)" />
                  </Svg>
                ) : null}
                <View style={styles.glyph}>
                  <SportTabIcon name={route.name} color={color} size={25} />
                </View>
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.2} style={[styles.label, { color, fontWeight: focused ? "800" : "500" }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: "#041629", paddingTop: 3 },
  topEdge: { position: "absolute", top: 0, left: 0, right: 0 },
  items: { flexDirection: "row", paddingTop: 2 },
  tab: { flex: 1, minWidth: 0, minHeight: 64, paddingHorizontal: 2, paddingTop: 7, paddingBottom: 5, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.65 },
  activeLine: { position: "absolute", top: 0, width: "56%", maxWidth: 46, height: 3, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: "#08CDF5" },
  iconWrap: { height: 34, width: "100%", alignItems: "center", justifyContent: "center" },
  activePlate: { position: "absolute", width: "100%", maxWidth: 70 },
  glyph: { zIndex: 1 },
  label: { width: "100%", textAlign: "center", fontSize: 10.5, lineHeight: 15, marginTop: 2 },
});
