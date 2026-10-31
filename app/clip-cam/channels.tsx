// Camera của sân được cấp quyền; cache ảnh không thay đổi luồng xem/cắt clip.
import React, { useCallback } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { cameraAccessActive, useClipCameraAccess, useClipCameraPreviews } from "@/hooks/useClipCameraPreviews";
import CameraPreviewGrid, { cameraPreviewColors } from "@/components/clipCam/CameraPreviewGrid";
import type { Channel } from "@/utils/pickclip";

export default function ClipCamChannelsScreen() {
  const C = useThemeTokens(), P = cameraPreviewColors(C);
  const { base, venueName, venueId } = useLocalSearchParams<{ base: string; venueName: string; venueId?: string; cams?: string }>();
  const baseUrl = String(base || "");
  const access = useClipCameraAccess();
  const venue = access.venues.find((v) => venueId ? v.venueId === String(venueId) : v.piBaseUrl.replace(/\/+$/, "") === baseUrl.replace(/\/+$/, ""));
  const allowed = !!venue && cameraAccessActive(venue, access.now);
  const scope = allowed ? { userId: access.userId, base: venue.piBaseUrl, cameras: venue.cameras } : null;
  const state = useClipCameraPreviews(scope);
  const { refetch, userId } = access;
  const { refresh: refreshImages } = state;
  const refresh = useCallback(() => userId ? Promise.allSettled([refetch(), refreshImages()]) : Promise.resolve(), [userId, refetch, refreshImages]);
  const openCut = (ch: Channel) => {
    if (!venue || !cameraAccessActive(venue)) return;
    router.push({ pathname: "/clip-cam/cut", params: { base: venue.piBaseUrl, venueName: venue.venueName || String(venueName || ""), chId: String(ch.id), chName: ch.name } } as any);
  };
  const headerButton = { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: P.border, alignItems: "center" as const, justifyContent: "center" as const };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.bg }} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{
        title: venue?.venueName || String(venueName || "Cắt Cam Sân"), headerShown: true,
        headerStyle: { backgroundColor: P.card }, headerTintColor: P.text, headerTitleAlign: "center",
        headerTitleStyle: { fontSize: 17, fontWeight: "700" }, headerShadowVisible: false,
        ...(C.isV2 ? { headerBackVisible: false, headerLeft: () => <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={headerButton}><Ionicons name="chevron-back" size={24} color={P.text} /></Pressable> } : {}),
        headerRight: () => <Pressable accessibilityRole="button" accessibilityLabel="Làm mới camera" onPress={refresh} disabled={state.refreshing || access.isFetching || !access.userId} style={headerButton}>{state.refreshing ? <ActivityIndicator size="small" color={P.primary} /> : <Ionicons name="refresh-outline" size={23} color={P.text} />}</Pressable>,
      }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28, width: "100%", maxWidth: 1180, alignSelf: "center" }} refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={refresh} tintColor={P.primary} />}>
        {allowed ? <CameraPreviewGrid C={C} state={state} onOpen={openCut} onRefresh={refresh} /> : (
          <View style={{ paddingVertical: 50, alignItems: "center", gap: 12 }}>
            {access.isLoading ? <ActivityIndicator color={P.primary} /> : <Ionicons name="lock-closed-outline" size={35} color={P.sub} />}
            <Text style={{ color: P.sub, textAlign: "center" }}>{access.isLoading ? "Đang kiểm tra quyền camera…" : !access.userId ? "Đăng nhập để xem camera được cấp quyền." : access.isError ? "Chưa kiểm tra được quyền camera. Kéo xuống để thử lại." : "Bạn chưa có quyền hoặc quyền camera đã hết hạn."}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
