import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Line, Polygon, Rect } from "react-native-svg";
import { IS_V3_LIGHT, sk } from "@/hooks/uiVersion";

const ball = require("@/assets/images/referee-pickleball.png");

// V3 Fresh: nền sáng + nét sân xanh dương nhạt (vẽ bằng SVG, cùng bố cục với ảnh sân của V2:
// lưới ở giữa, vạch bếp ngang, vạch giữa sân chạy xuống đáy, hai đường biên toả ra).
const V3_LINE = "rgba(20,102,242,0.20)";
const V3_LINE_SOFT = "rgba(20,102,242,0.10)";
const V3_NET_COLUMNS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function LoginCourtLinesV3({ width, height, wide }: { width: number; height: number; wide: boolean }) {
  const cx = width / 2;
  const half = wide ? width * 0.36 : Math.max(width * 0.46, 150);
  const netTop = height * (wide ? 0.5 : 0.565);
  const netBottom = height * (wide ? 0.62 : 0.635);
  const kitchenY = height * (wide ? 0.74 : 0.7);
  const spread = (height - netBottom) * (wide ? 1.9 : 1.15);
  const sideX = (y: number) => half + ((y - netBottom) / (height - netBottom)) * spread;
  const kitchenHalf = sideX(kitchenY);
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
      <Polygon points={`${cx - half},${netBottom} ${cx + half},${netBottom} ${cx + half + spread},${height} ${cx - half - spread},${height}`} fill="rgba(20,102,242,0.045)" />
      <Line x1={cx - half} y1={netBottom} x2={cx - half - spread} y2={height} stroke={V3_LINE} strokeWidth={3} />
      <Line x1={cx + half} y1={netBottom} x2={cx + half + spread} y2={height} stroke={V3_LINE} strokeWidth={3} />
      <Line x1={cx - kitchenHalf} y1={kitchenY} x2={cx + kitchenHalf} y2={kitchenY} stroke={V3_LINE} strokeWidth={3} />
      <Polygon points={`${cx - 2},${kitchenY} ${cx + 2},${kitchenY} ${cx + 7},${height} ${cx - 7},${height}`} fill={V3_LINE} />
      <Rect x={cx - half} y={netTop} width={half * 2} height={netBottom - netTop} fill="rgba(255,255,255,0.55)" stroke={V3_LINE_SOFT} strokeWidth={1} />
      {V3_NET_COLUMNS.map((i) => (
        <Line key={i} x1={cx - half + (half * 2 * i) / 12} y1={netTop} x2={cx - half + (half * 2 * i) / 12} y2={netBottom} stroke={V3_LINE_SOFT} strokeWidth={1} />
      ))}
      <Line x1={cx - half} y1={(netTop + netBottom) / 2} x2={cx + half} y2={(netTop + netBottom) / 2} stroke={V3_LINE_SOFT} strokeWidth={1} />
      <Line x1={cx - half} y1={netTop} x2={cx + half} y2={netTop} stroke="rgba(20,102,242,0.38)" strokeWidth={3} strokeLinecap="round" />
      <Line x1={cx - half} y1={netTop - 4} x2={cx - half} y2={netBottom + 3} stroke="rgba(20,102,242,0.38)" strokeWidth={4} strokeLinecap="round" />
      <Line x1={cx + half} y1={netTop - 4} x2={cx + half} y2={netBottom + 3} stroke="rgba(20,102,242,0.38)" strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}

export default function LoginCourtBackground() {
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (reduceMotion) { progress.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(progress, { toValue: 0, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);

  const wide = width >= 640 && width > height;
  const size = Math.min(wide ? height * 0.24 : width * 0.24, 150);
  return (
    <View pointerEvents="none" style={styles.container}>
      {IS_V3_LIGHT ? (
        <>
          <LinearGradient colors={["#FFFFFF", "#F2F6FC", "#E9F0FA"]} style={StyleSheet.absoluteFillObject} />
          <LoginCourtLinesV3 width={width} height={height} wide={wide} />
        </>
      ) : (
        <>
          <Image source={require("@/assets/images/login-court-3d.png")} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
          <View style={styles.tint} />
        </>
      )}
      <Animated.Image source={ball} resizeMode="contain" style={{ position: "absolute", width: size, height: size, left: wide ? "22%" : "58%", bottom: wide ? "6%" : "3%", opacity: 0.92, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.7, size * 0.45] }) }, { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "240deg"] }) }] }} />
      <Animated.Image source={ball} resizeMode="contain" style={{ position: "absolute", width: size * 0.35, height: size * 0.35, left: wide ? "43%" : "82%", top: wide ? "19%" : "16%", opacity: 0.8, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }, { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "80deg"] }) }] }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: "hidden", backgroundColor: sk("#031429", "#F2F6FC") },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 12, 31, 0.2)" },
});
