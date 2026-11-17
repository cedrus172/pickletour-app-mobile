// components/tabbar/FreshBottomBar.tsx
// Thanh tab đáy của giao diện V3 Fresh: dock trắng nổi, tab đang chọn có viên thuốc xanh dương,
// nút "Giải đấu" tròn màu xanh chanh nhô lên ở giữa.
import { FLOATING_TAB_BAR_HEIGHT } from "@/hooks/useFloatingTabBarPadding";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { G, Path, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Text } from "@/components/ui/i18nText";
import { IS_V3_DARK, V3 } from "@/hooks/uiVersion";

type Props = BottomTabBarProps & { visibleRoutes: BottomTabBarProps["state"]["routes"] };

/** Biểu tượng tab vẽ bằng SVG: nét mảnh khi chưa chọn, tô đặc khi đang chọn. */
export function FreshTabIcon({ name, color, size = 24, filled = false }: { name: string; color: string; size?: number; filled?: boolean }) {
  let drawing;
  switch (name) {
    case "index":
      drawing = filled ? (
        <Path d="M16 3.2 3.4 13.8c-.9.8-.4 2.2.8 2.2H7v11a2 2 0 0 0 2 2h4.2v-7.4h5.6V29H23a2 2 0 0 0 2-2V16h2.8c1.2 0 1.7-1.4.8-2.2Z" fill={color} />
      ) : (
        <Path d="M4.5 14.5 16 4.6l11.5 9.9M7.5 12.6V27h6v-7.6h5V27h6V12.6" fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
      );
      break;
    case "feed":
      drawing = (
        <G fill="none" stroke={color} strokeWidth={2.1} strokeLinejoin="round" strokeLinecap="round">
          <Path d="M9 6V4h19v21a3 3 0 0 1-3 3" />
          <Rect x={4} y={8} width={19} height={20} rx={2.5} fill={filled ? color : "none"} />
          <Path d="M8.5 13h10M8.5 23h10M14.5 18h4" stroke={filled ? V3.blue : color} />
          <Rect x={8.5} y={16.4} width={3.4} height={3.4} rx={0.6} stroke={filled ? V3.blue : color} />
        </G>
      );
      break;
    case "tournaments":
      // Vợt pickleball nghiêng
      drawing = (
        <G transform="rotate(35 16 16)" stroke={color} strokeLinejoin="round" strokeLinecap="round">
          <Rect x={9} y={0.8} width={14} height={18.4} rx={4.6} fill="none" strokeWidth={2.3} />
          <Path d="M13.4 19.2 14.6 22h2.8l1.2-2.8" fill="none" strokeWidth={2} />
          <Rect x={14.1} y={22} width={3.8} height={8.6} rx={1.6} fill={color} strokeWidth={1.4} />
        </G>
      );
      break;
    case "rankings":
      drawing = (
        <G fill={color}>
          <Rect x={4} y={18} width={6} height={10} rx={1.6} opacity={filled ? 1 : 0.85} />
          <Rect x={13} y={11} width={6} height={17} rx={1.6} opacity={filled ? 1 : 0.85} />
          <Rect x={22} y={4} width={6} height={24} rx={1.6} opacity={filled ? 1 : 0.85} />
        </G>
      );
      break;
    default:
      drawing = (
        <G fill={filled ? color : "none"} stroke={color} strokeWidth={2.2}>
          <Rect x={4} y={4} width={10} height={10} rx={3} />
          <Rect x={18} y={4} width={10} height={10} rx={3} />
          <Rect x={4} y={18} width={10} height={10} rx={3} />
          <Rect x={18} y={18} width={10} height={10} rx={3} />
        </G>
      );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false} focusable={false}>
      {drawing}
    </Svg>
  );
}

function FreshTab({
  name,
  label,
  focused,
  onPress,
  onLongPress,
  accessibilityLabel,
}: {
  name: string;
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
}) {
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      speed: 22,
      bounciness: focused ? 9 : 0,
    }).start();
  }, [anim, focused]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel || label}
      testID={`sport-tab-${name}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tab}
    >
      <View style={styles.iconSlot}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            {
              opacity: anim,
              transform: [{ scaleX: anim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }],
            },
          ]}
        >
          <LinearGradient colors={V3.gradBlue} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <FreshTabIcon name={name} color={focused ? V3.onBlue : V3.tabIdle} size={focused ? 22 : 23} filled={focused} />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.2}
        style={[styles.label, focused ? styles.labelActive : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function FreshBottomBar({ state, descriptors, navigation, visibleRoutes }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      testID="fresh-bottom-navigation"
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom - 10, 8),
          paddingLeft: insets.left + 10,
          paddingRight: insets.right + 10,
        },
      ]}
    >
      <View pointerEvents="box-none" style={styles.items}>
        <View pointerEvents="none" style={styles.dock} />
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = state.routes[state.index]?.key === route.key;
          const tournament = route.name === "tournaments";
          const label = typeof options.tabBarLabel === "string" ? options.tabBarLabel : options.title || route.name;
          const onPress = () => {
            if (Platform.OS === "ios") void Haptics.selectionAsync().catch(() => {});
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          const onLongPress = () => navigation.emit({ type: "tabLongPress", target: route.key });

          if (tournament) {
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.tabBarAccessibilityLabel || label}
                testID={`sport-tab-${route.name}`}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.centerTab}
              >
                <View testID="raised-tournament-button" style={styles.centerRing}>
                  <LinearGradient colors={V3.gradLime} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.centerButton}>
                    <FreshTabIcon name="tournaments" color={V3.onLime} size={32} />
                  </LinearGradient>
                </View>
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.label, styles.centerLabel, focused ? { color: V3.blue } : null]}>
                  {label}
                </Text>
              </Pressable>
            );
          }

          return (
            <FreshTab
              key={route.key}
              name={route.name}
              label={String(label)}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityLabel={options.tabBarAccessibilityLabel}
            />
          );
        })}
      </View>
    </View>
  );
}

const DOCK_TOP = 22;
const DOCK_HEIGHT = FLOATING_TAB_BAR_HEIGHT - DOCK_TOP;

const styles = StyleSheet.create({
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 1, backgroundColor: "transparent" },
  items: { flexDirection: "row", height: FLOATING_TAB_BAR_HEIGHT },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    top: DOCK_TOP,
    height: DOCK_HEIGHT,
    borderRadius: 26,
    backgroundColor: V3.card,
    borderWidth: 1,
    borderColor: IS_V3_DARK ? V3.line : "rgba(16,42,92,0.06)",
    shadowColor: V3.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  tab: { flex: 1, minWidth: 0, height: DOCK_HEIGHT, marginTop: DOCK_TOP, alignItems: "center", justifyContent: "center", gap: 3 },
  iconSlot: { width: 58, height: 32, alignItems: "center", justifyContent: "center" },
  pill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 16, overflow: "hidden" },
  label: { width: "100%", paddingHorizontal: 2, textAlign: "center", fontSize: 11, lineHeight: 15, fontWeight: "500", color: V3.tabIdle },
  labelActive: { color: V3.blue, fontWeight: "800" },
  centerTab: { flex: 1, minWidth: 0, height: FLOATING_TAB_BAR_HEIGHT, alignItems: "center" },
  centerRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 4,
    backgroundColor: V3.card,
    shadowColor: "#6FA800",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 14,
  },
  centerButton: { flex: 1, borderRadius: 28, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  centerLabel: { position: "absolute", bottom: 9, color: V3.ink, fontWeight: "800" },
});
