// app/shop/manage/scan.tsx — Quét mã QR đơn hàng của khách (PTSHOP:GW123456) hoặc nhập mã → mở màn xử lý đơn
import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { Stack, router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/i18nText";
import TextInput from "@/components/ui/i18nTextInput";
import { useScanManageOrderMutation } from "@/slices/shopApiSlice";

const parse = (s: string) => {
  const m = String(s || "").trim().toUpperCase().match(/(?:PTSHOP:)?(GW\d{6})/);
  return m ? m[1] : null;
};

export default function ShopScanScreen() {
  const [perm, requestPermission] = useCameraPermissions();
  const [scan, { isLoading }] = useScanManageOrderMutation();
  const [code, setCode] = useState("");
  const lock = useRef(false);

  const open = async (raw: string) => {
    const c = parse(raw);
    if (!c || lock.current) return;
    lock.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      const o: any = await scan(c).unwrap();
      router.replace(`/shop/manage/orders/${o._id}` as any);
    } catch (e: any) {
      Alert.alert("Không tìm thấy đơn", e?.data?.message || "Mã đơn không đúng.", [{ text: "OK", onPress: () => (lock.current = false) }]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Stack.Screen options={{ title: "Quét mã đơn", headerTransparent: true, headerTintColor: "#fff" }} />
      {perm?.granted ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" onBarcodeScanned={({ data }) => open(data)} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
          <Text style={{ color: "#fff", textAlign: "center" }}>Cần quyền camera để quét mã đơn của khách.</Text>
          <Pressable accessibilityRole="button" onPress={requestPermission} style={styles.btn}>
            <Text style={{ color: "#04121f", fontWeight: "900" }}>Cho phép camera</Text>
          </Pressable>
        </View>
      )}
      {perm?.granted ? (
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.frame} />
          <Text style={styles.hint}>Đưa mã QR trên màn hình đơn hàng của khách vào khung</Text>
        </View>
      ) : null}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.manual}>
        <View style={styles.manualBox}>
          <TextInput value={code} onChangeText={setCode} placeholder="Hoặc nhập mã đơn (GW123456)" placeholderTextColor="#9AA6B8" autoCapitalize="characters" style={styles.input} />
          <Pressable accessibilityRole="button" disabled={isLoading} onPress={() => (parse(code) ? open(code) : Alert.alert("Mã không hợp lệ", "Mã đơn có dạng GW + 6 số."))} style={styles.btn}>
            {isLoading ? <ActivityIndicator color="#04121f" /> : <Text style={{ color: "#04121f", fontWeight: "900" }}>Mở</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 16 },
  frame: { width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: "#C5F433" },
  hint: { color: "#fff", fontWeight: "700", textAlign: "center", paddingHorizontal: 32 },
  manual: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 34 },
  manualBox: { flexDirection: "row", gap: 8, padding: 8, borderRadius: 16, backgroundColor: "rgba(10,18,32,0.92)" },
  input: { flex: 1, minHeight: 46, borderRadius: 12, paddingHorizontal: 12, color: "#fff", backgroundColor: "rgba(255,255,255,0.08)", fontSize: 15 },
  btn: { minWidth: 64, height: 46, borderRadius: 12, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#13B5EA" },
});
