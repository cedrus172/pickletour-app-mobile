import React from "react";
import { View } from "react-native";
import Svg, { Text as SvgText } from "react-native-svg";

/** Render portrait digits without native Text auto-fit, which can collapse after rotation. */
export default function RefereePortraitScore({ left, right, height, color }: {
  left: number; right: number; height: number; color: string;
}) {
  const score = `${left} : ${right}`;
  const fontSize = Math.min(82, 520 / (String(left).length + String(right).length + 2.5));
  return (
    <View
      testID="referee-score-digits"
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Tỉ số ${left} – ${right}`}
      style={{ width: "100%", height, minHeight: height, flexShrink: 0 }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 360 104" preserveAspectRatio="xMidYMid meet" accessible={false}>
        <SvgText testID="referee-portrait-score-text" x="180" y="82" textAnchor="middle" fill={color} fontSize={fontSize} fontWeight="900" letterSpacing="1">
          {score}
        </SvgText>
      </Svg>
    </View>
  );
}
