import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { RULE_FILE_PICKER_HTML, parseRuleFileSelection } from "@/utils/tournamentRuleFiles";
import {
  useGetTournamentRuleFilesQuery, useUploadTournamentRuleFileMutation, useDeleteTournamentRuleFileMutation,
} from "@/slices/tournamentRuleFilesApiSlice";

type RuleFile = { _id: string; name: string; mimeType: string; size: number; url: string };

export default function TournamentRuleFiles({ tournamentId, canManage = false }: { tournamentId: string; canManage?: boolean }) {
  const C = useThemeTokens();
  const { data, error: loadError } = useGetTournamentRuleFilesQuery(tournamentId, { skip: !tournamentId });
  const [upload] = useUploadTournamentRuleFileMutation();
  const [remove, { isLoading: deleting }] = useDeleteTournamentRuleFileMutation();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const reading = useRef(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<RuleFile | null>(null);
  const items: RuleFile[] = data?.items || [];

  const receiveFile = async (message: string) => {
    if (reading.current || !canManage) return;
    reading.current = true;
    let uri: string | undefined;
    try {
      const file = parseRuleFileSelection(message);
      setPicking(false); setBusy(true); setError("");
      if (!FileSystem.cacheDirectory) throw new Error("Không tạo được tệp tạm trên điện thoại.");
      uri = FileSystem.cacheDirectory + "rule-file-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      await FileSystem.writeAsStringAsync(uri, file.base64, { encoding: FileSystem.EncodingType.Base64 });
      await upload({ tournamentId, file: { uri, name: file.name, type: file.mime } }).unwrap();
    } catch (err: any) {
      setPicking(false);
      setError(err?.data?.message || err?.message || "Không tải được tệp điều lệ. Vui lòng thử lại.");
    } finally {
      if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      reading.current = false; setBusy(false);
    }
  };
  const viewFile = async (file: RuleFile) => {
    if (file.mimeType.startsWith("image/")) setPreview(file);
    else {
      try { await Linking.openURL(file.url); }
      catch { setError("Không mở được PDF. Vui lòng thử lại."); }
    }
  };
  const deleteFile = (file: RuleFile) => Alert.alert("Xóa tệp điều lệ?", file.name, [
    { text: "Hủy", style: "cancel" },
    { text: "Xóa", style: "destructive", onPress: async () => {
      setError("");
      try { await remove({ tournamentId, fileId: file._id }).unwrap(); }
      catch (err: any) { setError(err?.data?.message || "Không xóa được tệp điều lệ."); }
    } },
  ]);
  if (!canManage && !items.length) return null;

  return (
    <View testID="tournament-rule-files" style={[styles.panel, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.heading}>
        <Ionicons name="document-attach-outline" size={21} color={C.primary} />
        <Text style={[styles.title, { color: C.text }]}>Tệp điều lệ</Text>
      </View>
      {canManage && <>
        <Text style={[styles.hint, { color: C.sub }]}>Ảnh hoặc PDF · tối đa 10 MB/tệp</Text>
        <Pressable disabled={busy || deleting} onPress={() => { setError(""); setPicking(true); }} accessibilityRole="button" accessibilityLabel={busy ? "Đang tải lên" : "Tải điều lệ lên"}
          style={[styles.upload, { borderColor: C.primary }]}>
          {busy ? <ActivityIndicator color={C.primary} /> : <Ionicons name="cloud-upload-outline" size={21} color={C.primary} />}
          <Text style={{ color: C.primary, fontWeight: "700" }}>{busy ? "Đang tải lên…" : "Tải điều lệ lên"}</Text>
        </Pressable>
      </>}
      {!!(error || (canManage && loadError)) && <Text accessibilityRole="alert" style={styles.error}>{error || "Không tải được danh sách tệp điều lệ."}</Text>}
      {items.map((file) => <View key={file._id} style={[styles.fileRow, { borderColor: C.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Xem ${file.name}`} onPress={() => viewFile(file)} style={styles.openFile}>
          {file.mimeType.startsWith("image/") ? <Image source={{ uri: file.url }} style={styles.thumbnail} contentFit="cover" /> :
            <View style={[styles.thumbnail, styles.pdf]}><Ionicons name="document-text-outline" size={28} color="#FB7185" /><Text style={styles.pdfLabel}>PDF</Text></View>}
          <View style={styles.fileInfo}>
            <Text style={{ color: C.text, fontWeight: "700", fontSize: 13 }}>{file.name}</Text>
            <Text style={{ color: C.sub, fontSize: 12, marginTop: 4 }}>{(file.size / 1024 / 1024).toFixed(1)} MB · {file.mimeType.startsWith("image/") ? "Xem ảnh" : "Mở PDF"}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={C.primary} />
        </Pressable>
        {canManage && <Pressable disabled={busy || deleting} onPress={() => deleteFile(file)} accessibilityRole="button" accessibilityLabel={`Xóa ${file.name}`} style={styles.delete}>
          <Ionicons name="trash-outline" size={19} color="#FB7185" />
        </Pressable>}
      </View>)}
      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: C.bg }]}>
          <View style={styles.modalHeading}>
            <Text style={[styles.title, { color: C.text }]}>Chọn tệp điều lệ</Text>
            <Pressable onPress={() => setPicking(false)} accessibilityLabel="Đóng chọn tệp" accessibilityRole="button" style={styles.delete}><Ionicons name="close" size={25} color={C.text} /></Pressable>
          </View>
          <WebView source={{ html: RULE_FILE_PICKER_HTML }} style={{ flex: 1, backgroundColor: "#0B2035" }}
            originWhitelist={["about:blank"]} javaScriptEnabled
            onShouldStartLoadWithRequest={(request) => request.url === "about:blank"}
            onMessage={(event) => receiveFile(event.nativeEvent.data)} />
        </SafeAreaView>
      </Modal>
      <Modal visible={!!preview} animationType="fade" onRequestClose={() => setPreview(null)}>
        <SafeAreaView style={[styles.modal, { backgroundColor: C.bg }]}>
          <View style={styles.modalHeading}>
            <Text style={[styles.title, { color: C.text, flex: 1 }]}>{preview?.name}</Text>
            <Pressable onPress={() => setPreview(null)} accessibilityLabel="Đóng ảnh điều lệ" accessibilityRole="button" style={styles.delete}><Ionicons name="close" size={25} color={C.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} maximumZoomScale={4} minimumZoomScale={1}>
            {preview && <Image source={{ uri: preview.url }} style={{ flex: 1, minHeight: 500, width: "100%" }} contentFit="contain" />}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 18 },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "800", flexShrink: 1 },
  hint: { fontSize: 12, marginTop: 6, marginBottom: 12 },
  upload: { borderWidth: 1, borderRadius: 12, minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  fileRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, marginTop: 12, overflow: "hidden" },
  openFile: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10, padding: 10 },
  thumbnail: { width: 52, height: 58, borderRadius: 6 },
  pdf: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(251,113,133,.1)" },
  pdfLabel: { fontSize: 10, fontWeight: "800", color: "#FB7185" },
  fileInfo: { flex: 1, minWidth: 0 },
  delete: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  error: { color: "#FB7185", fontSize: 13, marginTop: 10 },
  modal: { flex: 1 },
  modalHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
});
