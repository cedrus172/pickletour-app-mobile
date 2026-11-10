// app/referee/scan.tsx — Quét mã QR tại SÂN để tự nhận quyền trọng tài sân đó.
// Bất kỳ user đã đăng nhập: quét QR (admin hiện ở Quản lý sân) → được thêm vào trọng
// tài sân, vào thẳng màn chấm trận của giải đang chạy trên sân. Không cần admin add.
import React, { useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Text } from "@/components/ui/i18nText";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { CameraView, scanFromURLAsync, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useTheme } from "@react-navigation/native";
import {
  useClaimCourtRefereeMutation,
  useClaimClusterRefereeMutation,
} from "@/slices/tournamentsApiSlice";

// Chấp nhận QR dạng "PKTREF:<stationId>:<token>" hoặc link ".../rj/<stationId>/<token>".
function parseCourtQr(data: string): { stationId: string; token: string } | null {
  const s = String(data || "").trim();
  let m = s.match(/PKTREF:([a-fA-F0-9]{24}):([a-fA-F0-9]+)/);
  if (m) return { stationId: m[1], token: m[2] };
  m = s.match(/\/rj\/([a-fA-F0-9]{24})\/([a-fA-F0-9]+)/);
  if (m) return { stationId: m[1], token: m[2] };
  return null;
}

// Chấp nhận QR CỤM dạng "PKTREFC:<clusterId>:<token>" hoặc link ".../rjc/<clusterId>/<token>".
function parseClusterQr(data: string): { clusterId: string; token: string } | null {
  const s = String(data || "").trim();
  let m = s.match(/PKTREFC:([a-fA-F0-9]{24}):([a-fA-F0-9]+)/);
  if (m) return { clusterId: m[1], token: m[2] };
  m = s.match(/\/rjc\/([a-fA-F0-9]{24})\/([a-fA-F0-9]+)/);
  if (m) return { clusterId: m[1], token: m[2] };
  return null;
}

export default function RefereeScanScreen() {
  const { colors } = useTheme() as any;
  const router = useRouter();
  const [perm, requestPermission] = useCameraPermissions();
  const [claim] = useClaimCourtRefereeMutation();
  const [claimCluster] = useClaimClusterRefereeMutation();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null); // { ok, stationName, tournamentId } | { ok, clusterId } | { error }
  const [manualCode, setManualCode] = useState("");
  const [choosing, setChoosing] = useState(false);
  const lockRef = useRef(false);

  const onScanned = async ({ data }: { data: string }) => {
    if (lockRef.current || busy) return;
    const cluster = parseClusterQr(data);
    const court = cluster ? null : parseCourtQr(data);
    if (!cluster && !court) return; // không phải QR trọng tài → bỏ qua, tiếp tục quét
    lockRef.current = true;
    setBusy(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      if (cluster) {
        const res: any = await claimCluster({
          clusterId: cluster.clusterId,
          token: cluster.token,
        }).unwrap();
        setResult({ ...res, kind: "cluster" });
      } else {
        const res: any = await claim({ stationId: court!.stationId, token: court!.token }).unwrap();
        setResult({ ...res, kind: "court" });
      }
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

  const submitCode = (data: string) => {
    if (!parseClusterQr(data) && !parseCourtQr(data)) {
      Alert.alert("Mã không hợp lệ", "Hãy nhập đầy đủ mã trọng tài hoặc đường dẫn trong mã QR.");
      return;
    }
    void onScanned({ data });
  };

  const chooseQrImage = async () => {
    if (choosing || busy) return;
    setChoosing(true);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false, quality: 1 });
      if (picked.canceled || !picked.assets?.[0]?.uri) return;
      const codes = await scanFromURLAsync(picked.assets[0].uri, ["qr"]);
      const match = codes.find((code) => parseClusterQr(code.data) || parseCourtQr(code.data));
      if (!match) { Alert.alert("Không tìm thấy mã trọng tài", "Hãy chọn ảnh có mã QR trọng tài rõ nét."); return; }
      submitCode(match.data);
    } catch {
      Alert.alert("Không thể đọc ảnh", "Vui lòng thử ảnh khác hoặc nhập mã thủ công.");
    } finally { setChoosing(false); }
  };

  const goReferee = () => {
    if (result?.kind === "cluster" && result?.clusterId) {
      router.replace(`/referee/cluster/${result.clusterId}` as any);
    } else if (result?.tournamentId) {
      router.replace(`/tournament/${result.tournamentId}/referee` as any);
    } else {
      router.back();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Stack.Screen options={{ title: "Quét QR trọng tài", headerTransparent: true, headerTintColor: "#fff" }} />
      {!result && perm?.granted && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={onScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
      )}
      {!result && perm?.granted && (
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.frame} />
          <Text style={styles.hint}>Đưa mã QR dán tại sân vào khung để nhận quyền trọng tài</Text>
        </View>
      )}
      {!result && !perm?.granted && <View style={styles.center}><Ionicons name="camera-outline" size={48} color="#99b5d2" /><Text style={styles.hint}>Cho phép camera để quét, hoặc nhập mã / chọn ảnh bên dưới.</Text><TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, marginTop: 12 }]} onPress={() => requestPermission()}><Text style={{ color: "#fff", fontWeight: "800" }}>Cho phép camera</Text></TouchableOpacity></View>}
      {!result && <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.inputPanel}>
        <TextInput value={manualCode} onChangeText={setManualCode} placeholder="Nhập mã hoặc đường dẫn QR trọng tài" placeholderTextColor="#91a8c4" autoCapitalize="none" autoCorrect={false} style={styles.codeInput} accessibilityLabel="Mã trọng tài" />
        <View style={styles.inputActions}>
          <TouchableOpacity accessibilityRole="button" disabled={busy || choosing} onPress={chooseQrImage} style={[styles.btn, styles.inputButton]}><Text style={{ color: "#fff", fontWeight: "700" }}>{choosing ? "Đang đọc ảnh…" : "Chọn ảnh QR"}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" disabled={busy || choosing} onPress={() => submitCode(manualCode)} style={[styles.btn, styles.inputButton, { backgroundColor: colors.primary }]}><Text style={{ color: "#fff", fontWeight: "800" }}>Nhận quyền</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>}
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
                {result.kind === "cluster"
                  ? `Cụm sân: ${result.clusterName || "—"}`
                  : `Sân: ${result.stationName || "—"}${
                      result.tournamentName ? `\nGiải: ${result.tournamentName}` : ""
                    }`}
              </Text>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, marginTop: 22, minWidth: 220 }]} onPress={goReferee}>
                <Text style={{ color: "#fff", fontWeight: "800", textAlign: "center" }}>
                  {result.kind === "cluster" || result.tournamentId ? "Vào chấm trận" : "Xong"}
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
  inputPanel: { position: "absolute", bottom: 24, left: 16, right: 16, padding: 12, backgroundColor: "rgba(3,19,41,0.94)", borderColor: "#185276", borderWidth: 1, borderRadius: 16, gap: 10 },
  codeInput: { minHeight: 48, borderColor: "#345875", borderWidth: 1, borderRadius: 10, color: "#fff", paddingHorizontal: 12 },
  inputActions: { flexDirection: "row", gap: 8 },
  inputButton: { flex: 1, backgroundColor: "#123550", paddingHorizontal: 8 },
});
