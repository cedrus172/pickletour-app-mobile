import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo, Animated, Button as NativeButton, Platform,
  Pressable as NativePressable, StyleSheet, TouchableOpacity as NativeTouchableOpacity, View,
  type GestureResponderEvent, type PressableProps, type TouchableOpacityProps, type ViewStyle,
} from "react-native";

let reducedMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.().then((value) => { reducedMotion = value; }).catch(() => {});
AccessibilityInfo.addEventListener?.("reduceMotionChanged", (value) => { reducedMotion = value; });

type Wave = { x: number; y: number; diameter: number };

function useButtonRipple(disabled: boolean, externalRef: React.ForwardedRef<any>) {
  const host = useRef<any>(null);
  const mounted = useRef(true);
  const generation = useRef(0);
  const released = useRef(false);
  const [wave, setWave] = useState<Wave | null>(null);
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ref = useCallback((node: any) => {
    host.current = node;
    if (typeof externalRef === "function") externalRef(node);
    else if (externalRef) externalRef.current = node;
  }, [externalRef]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; scale.stopAnimation(); opacity.stopAnimation(); };
  }, [scale, opacity]);
  const finish = useCallback(() => {
    released.current = true;
    Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished && mounted.current) setWave(null);
    });
  }, [opacity]);
  const start = useCallback((event: GestureResponderEvent) => {
    if (disabled || reducedMotion) return;
    const { pageX, pageY, locationX, locationY } = event.nativeEvent;
    const token = ++generation.current;
    released.current = false;
    host.current?.measureInWindow?.((left: number, top: number, width: number, height: number) => {
      if (!mounted.current || generation.current !== token || width <= 0 || height <= 0) return;
      scale.stopAnimation(); opacity.stopAnimation(); scale.setValue(0); opacity.setValue(0.32);
      const x = Number.isFinite(pageX) ? pageX - left : locationX;
      const y = Number.isFinite(pageY) ? pageY - top : locationY;
      setWave({ x: Math.max(0, Math.min(width, x)), y: Math.max(0, Math.min(height, y)), diameter: Math.hypot(width, height) * 2 });
      Animated.timing(scale, { toValue: 1, duration: 420, useNativeDriver: true }).start();
      if (released.current) finish();
    });
  }, [disabled, scale, opacity, finish]);
  const layer = (style?: any) => {
    if (!wave) return null;
    const flat: ViewStyle = StyleSheet.flatten(style) || {};
    const radius = {
      borderRadius: flat.borderRadius,
      borderTopLeftRadius: flat.borderTopLeftRadius,
      borderTopRightRadius: flat.borderTopRightRadius,
      borderBottomLeftRadius: flat.borderBottomLeftRadius,
      borderBottomRightRadius: flat.borderBottomRightRadius,
    };
    return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      testID="button-ripple-layer" style={[StyleSheet.absoluteFill, radius, { overflow: "hidden", zIndex: 100 }]}>
      <Animated.View style={{ position: "absolute", width: wave.diameter, height: wave.diameter,
        left: wave.x - wave.diameter / 2, top: wave.y - wave.diameter / 2, borderRadius: wave.diameter / 2,
        backgroundColor: "#76DFFF", opacity, transform: [{ scale }] }} />
    </View>;
  };
  return { ref, start, finish, layer };
}

export const RippleTouchableOpacity = forwardRef<any, TouchableOpacityProps>(function RippleTouchableOpacity(props, ref) {
  const ripple = useButtonRipple(!!props.disabled, ref);
  return <NativeTouchableOpacity {...props} ref={ripple.ref}
    onPressIn={(event) => { ripple.start(event); props.onPressIn?.(event); }}
    onPressOut={(event) => { ripple.finish(); props.onPressOut?.(event); }}>
    {props.children}{ripple.layer(props.style)}
  </NativeTouchableOpacity>;
});

export const RipplePressable = forwardRef<any, PressableProps>(function RipplePressable(props, ref) {
  const nativeRipple = Platform.OS === "android" && !!props.android_ripple;
  const ripple = useButtonRipple(!!props.disabled || nativeRipple, ref);
  return <NativePressable {...props} ref={ripple.ref}
    onPressIn={(event) => { ripple.start(event); props.onPressIn?.(event); }}
    onPressOut={(event) => { ripple.finish(); props.onPressOut?.(event); }}>
    {(state) => <>
      {typeof props.children === "function" ? props.children(state) : props.children}
      {ripple.layer(typeof props.style === "function" ? props.style(state) : props.style)}
    </>}
  </NativePressable>;
});

export const RippleButton = forwardRef<any, React.ComponentProps<typeof NativeButton>>(function RippleButton(props, ref) {
  const ripple = useButtonRipple(!!props.disabled, ref);
  return <View ref={ripple.ref} onTouchStart={ripple.start} onTouchEnd={ripple.finish} onTouchCancel={ripple.finish}>
    <NativeButton {...props} />{ripple.layer()}
  </View>;
});
