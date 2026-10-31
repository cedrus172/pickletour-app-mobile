import React, { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";

/** Chỉ tách nhãn nội dung đã có trong tên; không suy đoán dữ liệu giải. */
export function overviewHeading(name: unknown) {
  const text = String(name || "Giải đấu");
  const parts = text.match(/^(.*)\s+[·•]\s+([^·•]+)$/);
  return parts ? { title: parts[1], category: parts[2] } : { title: text, category: "" };
}

export default function OverviewHeroArt() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return <View testID="tournament-overview-art" pointerEvents="none" accessible={false} style={styles.art}>
    <Svg width="100%" height="100%" viewBox="0 0 420 300" accessible={false}>
      <Defs>
        <RadialGradient id={`ball${id}`} cx="30%" cy="22%" r="80%">
          <Stop offset="0" stopColor="#53B9EB" /><Stop offset="0.5" stopColor="#237CAF" /><Stop offset="1" stopColor="#0A365B" />
        </RadialGradient>
        <LinearGradient id={`court${id}`} x1="0" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#2586BE" stopOpacity="0.6" /><Stop offset="1" stopColor="#0C335B" stopOpacity="0.1" />
        </LinearGradient>
      </Defs>
      <Path d="M0 246L272 110L453 190M35 300L260 155L420 230M0 208L270 66L420 123M136 300L323 189M213 300L373 216" fill="none" stroke={`url(#court${id})`} strokeWidth={3} />
      <Path d="M270 66V151L420 211V123Z" fill="#04192C" stroke="#1B638D" strokeWidth={2} />
      {Array.from({ length: 15 }, (_, i) => <Path key={`v${i}`} d={`M${277 + i * 10} ${69 + i * 3.8}V${153 + i * 4}`} stroke="#17456A" strokeWidth={1} />)}
      {Array.from({ length: 7 }, (_, i) => <Path key={`h${i}`} d={`M270 ${77 + i * 10}L420 ${134 + i * 10}`} stroke="#17456A" strokeWidth={1} />)}
      <Path d="M270 66L420 123M270 64V155" fill="none" stroke="#3389B6" strokeWidth={5} />
      <Ellipse cx={314} cy={255} rx={45} ry={9} fill="#02182B" opacity={0.5} />
      <Circle cx={312} cy={212} r={42} fill={`url(#ball${id})`} />
      <Ellipse cx={298} cy={183} rx={9} ry={5} transform="rotate(-18 298 183)" fill="#0B3C5C" />
      <Ellipse cx={278} cy={204} rx={4} ry={9} transform="rotate(18 278 204)" fill="#083956" />
      <Ellipse cx={305} cy={207} rx={8} ry={10} transform="rotate(-20 305 207)" fill="#073B60" />
      <Ellipse cx={330} cy={191} rx={6} ry={8} transform="rotate(-30 330 191)" fill="#083858" />
      <Ellipse cx={341} cy={221} rx={5} ry={9} transform="rotate(15 341 221)" fill="#072E4E" />
      <Ellipse cx={316} cy={238} rx={8} ry={7} transform="rotate(15 316 238)" fill="#072E4E" />
      <Ellipse cx={289} cy={231} rx={5} ry={8} transform="rotate(-30 289 231)" fill="#073452" />
    </Svg>
  </View>;
}
const styles = StyleSheet.create({ art: { position: "absolute", top: 24, right: -62, width: 360, height: 270, opacity: 0.58 } });
