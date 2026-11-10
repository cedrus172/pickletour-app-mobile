import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, useWindowDimensions, View } from "react-native";

const ball = require("@/assets/images/referee-pickleball.png");

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
      <Image source={require("@/assets/images/login-court-3d.png")} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
      <View style={styles.tint} />
      <Animated.Image source={ball} resizeMode="contain" style={{ position: "absolute", width: size, height: size, left: wide ? "22%" : "58%", bottom: wide ? "6%" : "3%", opacity: 0.92, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.7, size * 0.45] }) }, { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "240deg"] }) }] }} />
      <Animated.Image source={ball} resizeMode="contain" style={{ position: "absolute", width: size * 0.35, height: size * 0.35, left: wide ? "43%" : "82%", top: wide ? "19%" : "16%", opacity: 0.8, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }, { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "80deg"] }) }] }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: "hidden", backgroundColor: "#031429" },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 12, 31, 0.2)" },
});
