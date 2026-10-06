// app/live/claim-scan.tsx — Quét QR/mở link mời để NHẬN Quyền Livestream.
// Người được chủ giải mời quét mã "PKTLIVE:<token>" hoặc link ".../live-join/<token>"
// → được cấp quyền live giải (+sân). Sau đó tự mở app live desktop trên máy để live.
import React, { useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/i18nText";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useTheme } from "@react-navigation/native";
import { useClaimLiveInviteMutation } from "@/slices/liveGrantsApiSlice";

// Chấp nhận "PKTLIVE:<token>" hoặc link ".../live-join/<token>".
function parseLiveInvite(data: string): string | null {
  const s = String(data || "").trim();
  let m = s.match(/PKTLIVE:([^\s]+)/i);
  if (m) return m[1];
  m = s.match(/\/live-join\/([^\s/?#]+)/);
  if (m) return m[1];
  return null;
}

export default function LiveClaimScanScreen() {
  const { colors } = useTheme() as any;
  const router = useRouter();
  const [perm, requestPermission] = useCameraPermissions();
  const [claim] = useClaimLiveInviteMutation();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const lockRef = useRef(false);

  const onScanned = async ({ data }: { data: string }) => {
    if (lockRef.current || busy) return;
    const token = parseLiveInvite(data);
    if (!token) return;
    lockRef.current = true;
    setBusy(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      const res: any = await claim({ token }).unwrap();
      setResult(res);
    } catch (e: any) {
      setResult({ error: e?.data?.message || "Mã mời không hợp lệ hoặc đã hết hạn" });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    lockRef.current = false;
  };

  if (!perm) {
    return <View style={{ flex: 1, backgroundColor: "#000" }}><Stack.Screen options={{ title: "Nhận Quyền Livestream" }} /></View>;
  }
  if (!perm.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: "Nhận Quyền Livestream" }} />
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={54} color={colors.border} />
          <Text style={{ color: colors.text, fontWeight: "700", marginTop: 12, textAlign: "center" }}>
            Cần quyền camera để quét mã QR mời
          </Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, marginTop: 16 }]} onPress={() => requestPermission()}>
            <Text style={{ color: "#fff", fontWeight: "800" }}>Cho phép camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Stack.Screen options={{ title: "Nhận Quyền Livestream", headerTransparent: true, headerTintColor: "#fff" }} />
      {!result && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={onScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
      )}
      {!result && (
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.frame} />
          <Text style={styles.hint}>Đưa mã QR mời (chủ giải tạo) vào khung để nhận Quyền Livestream</Text>
        </View>
      )}
      {busy && (
        <View style={styles.overlay}><ActivityIndicator color="#fff" size="large" /></View>
      )}

      {result && (
        <View style={[styles.resultWrap, { backgroundColor: colors.background }]}>
          {result.error ? (
            <>
              <Ionicons name="close-circle" size={64} color="#ef4444" />
              <Text style={{ color: "#ef4444", fontSize: 18, fontWeight: "800", marginTop: 10, textAlign: "center" }}>{result.error}</Text>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.card, marginTop: 20 }]} onPress={reset}>
                <Text style={{ color: colors.text, fontWeight: "800" }}>Quét lại</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={72} color="#22c55e" />
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 12, textAlign: "center" }}>
                Đã nhận Quyền Livestream
              </Text>
              {result.tournament?.name ? (
                <Text style={{ color: colors.text, marginTop: 6, textAlign: "center" }}>
                  Giải: {result.tournament.name}
                </Text>
              ) : null}
              <Text style={{ color: colors.border, marginTop: 14, textAlign: "center", paddingHorizontal: 24, lineHeight: 20 }}>
                Mở app PickleTour Live trên máy tính, đăng nhập bằng chính tài khoản này rồi chọn giải/sân để bắt đầu live.
              </Text>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, marginTop: 22, minWidth: 220 }]} onPress={() => router.replace("/live/my-grants" as any)}>
                <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center" }}>Xem quyền của tôi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 12 }} onPress={reset}>
                <Text style={{ color: colors.border, fontWeight: "700" }}>Quét mã khác</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  btn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  frame: { width: 240, height: 240, borderWidth: 3, borderColor: "#fff", borderRadius: 24, backgroundColor: "transparent" },
  hint: { color: "#fff", marginTop: 20, textAlign: "center", paddingHorizontal: 32, fontSize: 15, fontWeight: "600" },
  resultWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
});
