import React from "react";
import { ImageBackground, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { IS_V3 } from "@/hooks/uiVersion";

// V3 Fresh: logo ngang mới (tỉ lệ 900×191) trên nền sáng.
const LOGO_V3 = require("@/assets/images/v3/logo-lockup.png");
const LOGO_V3_ASPECT = 900 / 191;

export function useAuthWide() {
  const { width, height } = useWindowDimensions();
  return width >= 640 && width > height;
}

export function AuthBrand({ wide, login = false }: { wide: boolean; login?: boolean }) {
  if (IS_V3) {
    if (!wide) return <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 18, marginTop: 6 }}><Image source={LOGO_V3} style={{ width: 236, height: 236 / LOGO_V3_ASPECT }} contentFit="contain" accessibilityLabel="PickleTour" /></View>;
    return <LinearGradient colors={login ? ["transparent", "transparent"] : ["#FFFFFF", "#E4EEFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: "42%", minHeight: 400, alignSelf: "stretch", alignItems: "center", justifyContent: "center", overflow: "hidden", borderTopLeftRadius: 20, borderBottomLeftRadius: 20 }}>
      <Image source={LOGO_V3} style={{ width: 260, height: 260 / LOGO_V3_ASPECT, maxWidth: "88%" }} contentFit="contain" accessibilityLabel="PickleTour" />
    </LinearGradient>;
  }
  if (!wide) return <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 8 }}><Image source={require("@/assets/images/logo-v2-badge.png")} style={{ width: 150, height: 135 }} contentFit="contain" /></View>;
  return <ImageBackground source={login ? undefined : require("@/assets/images/referee-court-bg.png")} resizeMode="cover" style={{ width: "42%", minHeight: 400, alignSelf: "stretch", alignItems: "center", justifyContent: "center", overflow: "hidden", borderTopLeftRadius: 20, borderBottomLeftRadius: 20, backgroundColor: login ? "transparent" : "#061c35" }}>
    <Image source={require("@/assets/images/logo-v2-badge.png")} style={{ width: 210, height: 190, maxWidth: "90%" }} contentFit="contain" />
  </ImageBackground>;
}
