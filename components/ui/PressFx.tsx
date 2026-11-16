// components/ui/PressFx.tsx
// Hiệu ứng bấm nút cho giao diện V3 Fresh.
// babel/press-fx-plugin.js tự chuyển mọi `TouchableOpacity` / `Pressable` import từ "react-native"
// (trong mã nguồn app) về file này, nên không cần sửa từng màn hình.
//  - V2: xuất nguyên bản của React Native → không thay đổi gì.
//  - V3: thêm hiệu ứng nhún (scale lò xo) khi nhấn/thả. Vùng bấm quá lớn (nền mờ modal, khung bao
//    cả trang…) hoặc nút cố ý tắt phản hồi (activeOpacity = 1) thì bỏ qua để không bị "co cả màn".
import React from "react";
import {
  Animated,
  Pressable as RNPressable,
  StyleSheet,
  TouchableOpacity as RNTouchableOpacity,
} from "react-native";
import { IS_V3 } from "@/hooks/uiVersion";

const MAX_FX_HEIGHT = 230; // cao hơn mức này coi như khung chứa, không nhún
const MAX_FX_AREA = 82000;

function scaleFor(width: number, height: number) {
  if (!(width > 0) || !(height > 0)) return 0.96;
  if (height > MAX_FX_HEIGHT || width * height > MAX_FX_AREA) return 1;
  // Nút càng rộng nhún càng nhẹ (co tối đa ~10pt chiều ngang).
  return Math.max(0.93, Math.min(0.975, 1 - 10 / width));
}

function usePressScale(onPressIn?: (e: any) => void, onPressOut?: (e: any) => void, enabled = true) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const size = React.useRef({ w: 0, h: 0 });

  const handleLayout = React.useCallback((e: any) => {
    const l = e?.nativeEvent?.layout;
    if (l) size.current = { w: l.width, h: l.height };
  }, []);

  const handlePressIn = React.useCallback(
    (e: any) => {
      if (enabled) {
        const to = scaleFor(size.current.w, size.current.h);
        if (to < 1) {
          Animated.spring(scale, {
            toValue: to,
            useNativeDriver: true,
            speed: 60,
            bounciness: 0,
          }).start();
        }
      }
      onPressIn?.(e);
    },
    [enabled, onPressIn, scale],
  );

  const handlePressOut = React.useCallback(
    (e: any) => {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 16,
        bounciness: 10,
      }).start();
      onPressOut?.(e);
    },
    [onPressOut, scale],
  );

  return { scale, handleLayout, handlePressIn, handlePressOut };
}

/** Ghép transform sẵn có của style với scale; trả null nếu style dùng transform dạng chuỗi. */
function withScale(style: any, scale: Animated.Value) {
  const flat: any = StyleSheet.flatten(style) || {};
  if (flat.transform != null && !Array.isArray(flat.transform)) return null;
  return [style, { transform: [...(flat.transform || []), { scale }] }];
}

const V3TouchableOpacity = React.forwardRef<any, any>(function V3TouchableOpacity(props, ref) {
  const { style, onPressIn, onPressOut, onLayout, activeOpacity, ...rest } = props;
  const interactive = !!(rest.onPress || rest.onLongPress) && !rest.disabled && activeOpacity !== 1;
  const { scale, handleLayout, handlePressIn, handlePressOut } = usePressScale(onPressIn, onPressOut, interactive);
  const layoutCb = React.useCallback(
    (e: any) => {
      handleLayout(e);
      onLayout?.(e);
    },
    [handleLayout, onLayout],
  );
  const scaled = interactive ? withScale(style, scale) : null;
  if (!scaled) {
    return (
      <RNTouchableOpacity
        ref={ref}
        {...rest}
        activeOpacity={activeOpacity}
        style={style}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onLayout={onLayout}
      />
    );
  }
  return (
    <RNTouchableOpacity
      ref={ref}
      {...rest}
      activeOpacity={activeOpacity ?? 0.82}
      style={scaled}
      onLayout={layoutCb}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    />
  );
});

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

const V3Pressable = React.forwardRef<any, any>(function V3Pressable(props, ref) {
  const { style, onPressIn, onPressOut, onLayout, ...rest } = props;
  const interactive = !!(rest.onPress || rest.onLongPress) && !rest.disabled;
  const [pressed, setPressed] = React.useState(false);
  const styleIsFn = typeof style === "function";
  const pressIn = React.useCallback(
    (e: any) => {
      if (styleIsFn) setPressed(true);
      onPressIn?.(e);
    },
    [onPressIn, styleIsFn],
  );
  const pressOut = React.useCallback(
    (e: any) => {
      if (styleIsFn) setPressed(false);
      onPressOut?.(e);
    },
    [onPressOut, styleIsFn],
  );
  const { scale, handleLayout, handlePressIn, handlePressOut } = usePressScale(pressIn, pressOut, interactive);
  const layoutCb = React.useCallback(
    (e: any) => {
      handleLayout(e);
      onLayout?.(e);
    },
    [handleLayout, onLayout],
  );
  if (!interactive) {
    return <RNPressable ref={ref} {...props} />;
  }
  const resolved = styleIsFn ? style({ pressed, hovered: false }) : style;
  const scaled = withScale(resolved, scale);
  if (!scaled) {
    return <RNPressable ref={ref} {...props} />;
  }
  return (
    <AnimatedPressable
      ref={ref}
      {...rest}
      style={scaled}
      onLayout={layoutCb}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    />
  );
});

export const TouchableOpacity: typeof RNTouchableOpacity = IS_V3
  ? (V3TouchableOpacity as any)
  : RNTouchableOpacity;

export const Pressable: typeof RNPressable = IS_V3 ? (V3Pressable as any) : RNPressable;
