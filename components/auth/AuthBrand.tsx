import React from "react";
import { ImageBackground, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";

export function useAuthWide() {
  const { width, height } = useWindowDimensions();
  return width >= 640 && width > height;
}

export function AuthBrand({ wide, login = false }: { wide: boolean; login?: boolean }) {
  if (!wide) return <View style={{ alignItems: "center", justifyContent: "center", marginBottom: 8 }}><Image source={require("@/assets/images/logo-v2-badge.png")} style={{ width: 150, height: 135 }} contentFit="contain" /></View>;
  return <ImageBackground source={login ? undefined : require("@/assets/images/referee-court-bg.png")} resizeMode="cover" style={{ width: "42%", minHeight: 400, alignSelf: "stretch", alignItems: "center", justifyContent: "center", overflow: "hidden", borderTopLeftRadius: 20, borderBottomLeftRadius: 20, backgroundColor: login ? "transparent" : "#061c35" }}>
    <Image source={require("@/assets/images/logo-v2-badge.png")} style={{ width: 210, height: 190, maxWidth: "90%" }} contentFit="contain" />
  </ImageBackground>;
}
