// app/fb-auth.tsx
// Đích redirect của luồng web-auth Facebook (pickletourapp://fb-auth?fb=...).
// openAuthSessionAsync tự nhận URL này; nhưng Android có thể mở app qua deep link
// và router đẩy tới đây → KHÔNG hiện trang lỗi, chỉ quay về trang trước / trang chủ.
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, Stack } from "expo-router";
import { useThemeTokens } from "@/hooks/useThemeTokens";

export default function FacebookAuthRedirect() {
  const C = useThemeTokens();

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (router.canGoBack()) router.back();
        else router.replace("/");
      } catch {
        router.replace("/");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: "none" }} />
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: C.bg,
        }}
      >
        <ActivityIndicator color={C.primary} />
      </View>
    </>
  );
}
