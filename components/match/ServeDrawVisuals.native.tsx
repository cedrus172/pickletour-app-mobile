import React from "react";
import { Animated, View } from "react-native";
import { Text } from "@/components/ui/i18nText";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";

export type DrawSide = "left" | "right";
export const DRAW_BLUE = "#10c6f6";
export const DRAW_RED = "#ff526d";
export const DRAW_GOLD = "#ffc45a";

export function CoinFace({ side, size }: { side: DrawSide; size: number }) {
  const heads = side === "left";
  const id = heads ? "coinHeads" : "coinTails";
  return (
    <View testID={`serve-coin-${heads ? "heads" : "tails"}`} accessibilityLabel={heads ? "Mặt ngửa" : "Mặt sấp"} style={{ width: size, height: size }}>
      <Svg width="100%" height="100%" viewBox="0 0 120 120">
        <Defs><LinearGradient id={id} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={heads ? "#a1f6ff" : "#fff2a0"} /><Stop offset="0.45" stopColor={heads ? "#07c3ef" : "#ffc13c"} /><Stop offset="1" stopColor={heads ? "#0366be" : "#b86c0a"} /></LinearGradient></Defs>
        <Circle cx="60" cy="65" r="53" fill={heads ? "#014779" : "#7c410a"} />
        <Circle cx="60" cy="57" r="53" fill={`url(#${id})`} stroke={heads ? "#86edff" : "#ffe99b"} strokeWidth="3" />
        <Circle cx="60" cy="57" r="46" fill="none" stroke={heads ? "#ddfcff" : "#fff6c9"} strokeWidth="1" opacity="0.65" />
        {heads ? [[37, 36], [60, 26], [83, 36], [34, 60], [60, 52], [86, 60]].map(([cx, cy], i) => <Circle key={i} cx={cx} cy={cy} r="6.5" fill="#063252" />) : <Path d="M60 23L67 39L85 41L71 53L75 71L60 61L45 71L49 53L35 41L53 39Z" fill="#8e4d08" stroke="#ffe99b" strokeWidth="1.5" />}
        <SvgText x="60" y="88" textAnchor="middle" fill={heads ? "#032a49" : "#673305"} fontSize="16" fontWeight="900">{heads ? "NGỬA" : "SẤP"}</SvgText>
      </Svg>
    </View>
  );
}

export function DrawCard({ side, code = "", size }: { side: DrawSide; code?: string; size?: number }) {
  const blue = side === "left";
  const id = blue ? "drawBlueCard" : "drawRedCard";
  return (
    <View testID={`serve-color-${blue ? "blue" : "red"}`} accessibilityLabel={blue ? "Thẻ xanh dương" : "Thẻ đỏ"} style={{ width: size ?? "100%", height: size ?? "100%" }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 120">
        <Defs><LinearGradient id={id} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={blue ? "#5cecff" : "#ff96a4"} /><Stop offset="0.45" stopColor={blue ? "#0bb8ef" : "#ed3e60"} /><Stop offset="1" stopColor={blue ? "#0468b9" : "#a81335"} /></LinearGradient></Defs>
        <Rect x="5" y="7" width="90" height="108" rx="13" fill={blue ? "#023e72" : "#7d1430"} />
        <Rect x="5" y="3" width="90" height="108" rx="13" fill={`url(#${id})`} stroke={blue ? "#9af1ff" : "#ffc2ca"} strokeWidth="2.5" />
        <Path d="M15 15H83L15 70Z" fill="#fff" opacity="0.13" />
        <SvgText x="50" y="59" textAnchor="middle" fill="#fff" fontSize="19" fontWeight="900">{blue ? "XANH" : "ĐỎ"}</SvgText>
        {code ? <SvgText x="50" y="81" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800">ĐỘI {code}</SvgText> : null}
      </Svg>
    </View>
  );
}

export function DrawColorPair({ size }: { size: number }) {
  return <View style={{ width: size, height: size }}>
    <View style={{ position: "absolute", left: "36%", top: "3%", width: "57%", height: "85%", transform: [{ rotate: "13deg" }] }}><DrawCard side="right" /></View>
    <View style={{ position: "absolute", left: "7%", top: "12%", width: "57%", height: "85%", transform: [{ rotate: "-10deg" }] }}><DrawCard side="left" /></View>
  </View>;
}

export function TwoTeamWheel({ size, leftCode = "A", rightCode = "B", counterRotation }: {
  size: number; leftCode?: string; rightCode?: string; counterRotation?: Animated.AnimatedInterpolation<string>;
}) {
  return <View testID="serve-two-team-wheel" style={{ width: size, height: size }}>
    <Svg width="100%" height="100%" viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="wheelBlue" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#56e8ff" /><Stop offset="1" stopColor="#047bb8" /></LinearGradient>
        <LinearGradient id="wheelRed" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#ff8c9d" /><Stop offset="1" stopColor="#b31b40" /></LinearGradient>
      </Defs>
      <Circle cx="60" cy="60" r="57" fill="#08243e" stroke="#8bd9ef" strokeWidth="3" />
      <Path testID="serve-wheel-half-left" d="M60 6A54 54 0 0 0 60 114Z" fill="url(#wheelBlue)" />
      <Path testID="serve-wheel-half-right" d="M60 6A54 54 0 0 1 60 114Z" fill="url(#wheelRed)" />
      <Path d="M60 6V114" stroke="#e8f4ff" strokeWidth="1.5" />
      <Circle cx="60" cy="60" r="9" fill="#0a2540" stroke="#e8f4ff" strokeWidth="2" />
    </Svg>
    {size >= 70 ? [leftCode, rightCode].map((code, index) => <View key={index} style={{ position: "absolute", left: index === 0 ? "8%" : "58%", top: "35%", width: "34%", height: "30%", alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ alignItems: "center", transform: counterRotation ? [{ rotate: counterRotation }] : [] }}>
        <Text allowFontScaling={false} style={{ color: "#fff", fontSize: size * 0.075, fontWeight: "800" }}>ĐỘI</Text>
        <Text allowFontScaling={false} style={{ color: "#fff", fontSize: size * 0.15, lineHeight: size * 0.17, fontWeight: "900" }}>{code}</Text>
      </Animated.View>
    </View>) : null}
  </View>;
}
