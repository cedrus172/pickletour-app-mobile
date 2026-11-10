import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppModal from "@/components/ui/AppModal";
let mediaLibrary: typeof import("expo-media-library") | null = null;
try { mediaLibrary = require("expo-media-library"); } catch { /* Bản cài cũ có thể thiếu module native. */ }

export default function ResponsiveImageViewer({ images, imageIndex, visible, onRequestClose, FooterComponent }: any) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const uri = images?.[imageIndex]?.uri;
  const headers = images?.[imageIndex]?.headers;

  const save = async () => {
    if (!uri || saving) return;
    setSaving(true);
    try {
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!dir) throw new Error("Không có bộ nhớ tạm để tải ảnh.");
      const extension = /\.(png|webp|jpeg|jpg)(?:[?#]|$)/i.exec(uri)?.[1] || "jpg";
      const result = await FileSystem.downloadAsync(uri, `${dir}pickletour-image-${Date.now()}.${extension}`, { headers });
      if (result.status < 200 || result.status >= 300) throw new Error("Không tải được ảnh.");
      if (mediaLibrary?.saveToLibraryAsync) {
        const permission = await mediaLibrary.requestPermissionsAsync(true);
        if (!permission.granted) { Alert.alert("Cần quyền truy cập Ảnh", "Hãy cho phép PickleTour lưu ảnh trong phần Cài đặt."); return; }
        await mediaLibrary.saveToLibraryAsync(result.uri);
        Alert.alert("Đã lưu", "Ảnh đã được lưu vào thư viện ảnh.");
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { dialogTitle: "Lưu hoặc chia sẻ ảnh" });
      } else {
        Alert.alert("Không thể lưu ảnh", "Phiên bản ứng dụng này chưa hỗ trợ lưu ảnh vào thư viện.");
      }
    } catch (error: any) {
      Alert.alert("Không thể lưu ảnh", error?.message || "Vui lòng thử lại.");
    } finally { setSaving(false); }
  };

  return (
    <AppModal visible={visible} animationType="fade" onRequestClose={onRequestClose} presentationStyle="fullScreen" supportedOrientations={["portrait", "portrait-upside-down", "landscape", "landscape-left", "landscape-right"]}>
      <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} maximumZoomScale={Platform.OS === "ios" ? 4 : 1} minimumZoomScale={1} centerContent>
          <Image source={{ uri, headers }} resizeMode="contain" style={{ width, height }} />
        </ScrollView>
        <SafeAreaView edges={["top", "right"]} style={{ position: "absolute", top: 0, right: 0, padding: 12, flexDirection: "row", gap: 10 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Lưu ảnh" disabled={saving} onPress={save} style={{ backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 22, padding: 10 }}>
            {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="download-outline" size={24} color="#fff" />}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onRequestClose} style={{ backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 22, padding: 10 }}><Ionicons name="close" size={24} color="#fff" /></Pressable>
        </SafeAreaView>
        {FooterComponent ? <View pointerEvents="box-none" style={{ position: "absolute", bottom: insets.bottom, left: 0, right: 0 }}><FooterComponent imageIndex={imageIndex} /></View> : null}
      </View>
      </SafeAreaProvider>
    </AppModal>
  );
}
