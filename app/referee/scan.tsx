// app/referee/scan.tsx — Quét mã QR tại SÂN để tự nhận quyền trọng tài sân đó.
// Bất kỳ user đã đăng nhập: quét QR (admin hiện ở Quản lý sân) → được thêm vào trọng
// tài sân, vào thẳng màn chấm trận của giải đang chạy trên sân. Không cần admin add.
import React, { useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/i18nText";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useTheme } from "@react-navigation/native";
import { useClaimCourtRefereeMutation } from "@/slices/tournamentsApiSlice";

// Chấp nhận QR dạng "PKTREF:<stationId>:<token>" hoặc link ".../rj/<stationId>/<token>".
function parseCourtQr(data: string): { stationId: string; token: string } | null {
  const s = String(data || "").trim();
  let m = s.match(/PKTREF:([a-fA-F0-9]{24}):([a-fA-F0-9]+)/);
  if (m) return { stationId: m[1], token: m[2] };
  m = s.match(/\/rj\/([a-fA-F0-9]{24})\/([a-fA-F0-9]+)/);
  if (m) return { stationId: m[1], token: m[2] };
  return null;
}

export default function RefereeScanScreen() {
  const { colors } = useTheme() as any;
  const router = useRouter();
  const [perm, requestPermission] = useCameraPermissions();
  const [claim] = useClaimCourtRefereeMutation();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null); // { ok, stationName, tournamentId } | { error }
  const lockRef = useRef(false);

  const onScanned = async ({ data }: { data: string }) => {
    if (lockRef.current || busy) return;
    const parsed = parseCourtQr(data);
    if (!parsed) return; // không phải QR sân → bỏ qua, tiếp tục quét
    lockRef.current = true;
    setBusy(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      const res: any = await claim({ stationId: parsed.stationId, token: parsed.token }).unwrap();
      setResult(res);
    } catch (e: any) {
      setResult({ error: e?.data?.message || "Mã QR không hợp lệ hoặc đã hết hạn" });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    lockRef.current = false;
  };

  const goReferee = () => {
    if (result?.tournamentId) {
      router.replace(`/tournament/${result.tournamentId}/referee` as any);
    } else {
      router.back();
    }
  };

  if (!perm) {
    return <View style={{ flex: 1, backgroundColor: "#000" }}><Stack.Screen options={{ title: "Quét QR trọng tài" }} /></View>;
  }
  if (!perm.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: "Quét QR trọng tài" }} />
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={54} color={colors.border} />
          <Text style={{ color: colors.text, fontWeight: "700", marginTop: 12, textAlign: "center" }}>
            Cần quyền camera để quét mã QR sân
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
      <Stack.Screen options={{ title: "Quét QR trọng tài", headerTransparent: true, headerTintColor: "#fff" }} />
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
          <Text style={styles.hint}>Đưa mã QR dán tại sân vào khung để nhận quyền trọng tài</Text>
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
                Đã nhận quyền trọng tài
              </Text>
              <Text style={{ color: colors.text, marginTop: 6, textAlign: "center" }}>
                Sân: {result.stationName || "—"}
                {result.tournamentName ? `\nGiải: ${result.tournamentName}` : ""}
              </Text>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, marginTop: 22, minWidth: 220 }]} onPress={goReferee}>
                <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center" }}>
                  {result.tournamentId ? "Vào chấm trận" : "Xong"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 12 }} onPress={reset}>
                <Text style={{ color: colors.border, fontWeight: "700" }}>Quét sân khác</Text>
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
