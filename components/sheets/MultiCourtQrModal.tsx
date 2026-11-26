// QR trọng tài NHIỀU SÂN (giống web TournamentCourtClusterDialog → MultiCourtQrDialog):
// chọn ≥ 2 sân trong cụm → tạo 1 mã, trọng tài quét một lần nhận quyền ở các sân đã chọn (hiệu lực 24 giờ).
// `inline`: hiện ngay trong khung (dùng trong CourtManagerSheet — BottomSheetModal trên iOS nằm ở cửa sổ
// FullWindowOverlay riêng nên RN <Modal> mở từ màn dưới bị che mất).
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/i18nText";
import TicketQrRN from "@/components/courts/TicketQrRN";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useCreateCourtStationRefereeQrMutation } from "@/slices/courtClustersAdminApiSlice";

const sid = (v: any) => String(v?._id ?? v?.id ?? v ?? "");

type Props = {
  visible: boolean;
  tournamentId: string;
  clusterId: string;
  clusterName?: string;
  stations: any[];
  onClose: () => void;
  inline?: boolean;
};

export default function MultiCourtQrModal({ visible, tournamentId, clusterId, clusterName, stations, onClose, inline = false }: Props) {
  const C = useThemeTokens();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string[]>([]);
  const [qr, setQr] = useState<any>(null);
  const [error, setError] = useState("");
  const [createQr, { isLoading }] = useCreateCourtStationRefereeQrMutation();

  const list = useMemo(
    () => (Array.isArray(stations) ? stations : []).filter((s) => s && s.isActive !== false && sid(s)),
    [stations],
  );
  const allSelected = list.length > 0 && selected.length === list.length;

  const reset = () => {
    setQr(null);
    setError("");
  };
  const close = () => {
    setSelected([]);
    reset();
    onClose();
  };
  const toggle = (id: string) => {
    setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    reset();
  };
  const toggleAll = () => {
    setSelected(allSelected ? [] : list.map((s) => sid(s)));
    reset();
  };

  const create = async () => {
    setError("");
    try {
      const data = await createQr({ tournamentId, clusterId, stationIds: selected }).unwrap();
      if (!data?.qrPayload) throw new Error("Không có dữ liệu mã QR.");
      setQr(data);
    } catch (e: any) {
      setError(e?.data?.message || e?.message || "Không tạo được mã QR. Vui lòng thử lại.");
    }
  };

  const card = (
        <View style={[S.card, inline && S.cardInline, { backgroundColor: C.card, borderColor: inline ? C.primary : C.border }]}>
          <View style={S.head}>
            <View style={{ flex: 1 }}>
              <Text style={[S.title, { color: C.text }]}>QR trọng tài nhiều sân</Text>
              {clusterName ? <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{clusterName}</Text> : null}
            </View>
            <Pressable hitSlop={10} onPress={close} accessibilityLabel="Đóng">
              <MaterialIcons name="close" size={24} color={C.text} />
            </Pressable>
          </View>

          <ScrollView style={{ flexGrow: 0 }} scrollEnabled={!inline} contentContainerStyle={{ paddingBottom: 4 }}>
            <Text style={{ color: C.sub, fontSize: 13, lineHeight: 18 }}>
              Chọn ít nhất hai sân. Trọng tài quét một lần để nhận quyền tại các sân đã chọn.
            </Text>

            {list.length >= 2 ? (
              <Pressable onPress={toggleAll} disabled={isLoading} style={S.allRow}>
                <MaterialIcons
                  name={allSelected ? "check-box" : selected.length ? "indeterminate-check-box" : "check-box-outline-blank"}
                  size={22}
                  color={C.primary}
                />
                <Text style={{ color: C.primary, fontWeight: "700" }}>
                  {allSelected ? "Bỏ chọn tất cả" : `Chọn tất cả (${list.length} sân)`}
                </Text>
              </Pressable>
            ) : null}

            <View style={S.grid}>
              {list.map((s) => {
                const id = sid(s);
                const on = selected.includes(id);
                return (
                  <Pressable
                    key={id}
                    disabled={isLoading}
                    onPress={() => toggle(id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={[
                      S.cell,
                      { borderColor: on ? C.primary : C.border, backgroundColor: on ? C.primarySoft : "transparent" },
                    ]}
                  >
                    <MaterialIcons name={on ? "check-box" : "check-box-outline-blank"} size={20} color={on ? C.primary : C.muted} />
                    <Text numberOfLines={1} style={{ flex: 1, color: C.text, fontWeight: on ? "700" : "500" }}>
                      {s.name || s.code || "Sân"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? (
              <View style={[S.err, { backgroundColor: C.redSoft }]}>
                <Text style={{ color: C.redText }}>{error}</Text>
              </View>
            ) : null}

            {qr?.qrPayload ? (
              <View style={[S.qrBox, { borderColor: C.border }]}>
                <View style={S.qrWhite}>
                  <TicketQrRN token={qr.qrPayload} prefix="" size={196} />
                </View>
                <Text style={{ color: C.text, textAlign: "center", fontWeight: "700" }}>
                  {(qr.stationNames || []).join(" · ")}
                </Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>Mã có hiệu lực trong 24 giờ kể từ khi tạo.</Text>
                <Pressable
                  onPress={async () => {
                    await Clipboard.setStringAsync(qr.joinUrl || qr.qrPayload);
                    Alert.alert("Đã sao chép", "Đã sao chép liên kết trọng tài.");
                  }}
                  style={S.copy}
                >
                  <MaterialIcons name="content-copy" size={18} color={C.primary} />
                  <Text style={{ color: C.primary, fontWeight: "700" }}>Sao chép liên kết</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>

          <View style={S.actions}>
            <Pressable onPress={close} style={[S.btn, { borderColor: C.border, borderWidth: 1 }]}>
              <Text style={{ color: C.text, fontWeight: "700" }}>Đóng</Text>
            </Pressable>
            <Pressable
              onPress={create}
              disabled={selected.length < 2 || isLoading || Boolean(qr)}
              style={[
                S.btn,
                { backgroundColor: C.primary, opacity: selected.length < 2 || isLoading || qr ? 0.5 : 1 },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "800" }}>
                  {`Tạo mã cho ${selected.length} sân`}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
  );

  if (inline) return visible ? card : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} supportedOrientations={["portrait", "landscape"]}>
      <View style={[S.backdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>{card}</View>
    </Modal>
  );
}

const S = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "100%",
    alignSelf: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  cardInline: { maxWidth: undefined, maxHeight: undefined, marginTop: 10 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  title: { fontSize: 17, fontWeight: "800" },
  allRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  err: { borderRadius: 10, padding: 10, marginTop: 12 },
  qrBox: { alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 14 },
  qrWhite: { backgroundColor: "#fff", padding: 8, borderRadius: 8 },
  copy: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});

/** Nút "QR nhiều sân" + khung chọn sân mở ngay tại chỗ (trạng thái giữ trong chính component này). */
export function MultiCourtQrSection(props: Omit<Props, "visible" | "onClose" | "inline">) {
  const C = useThemeTokens();
  const [open, setOpen] = useState(false);
  if (open) {
    return <MultiCourtQrModal {...props} inline visible onClose={() => setOpen(false)} />;
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => setOpen(true)}
      style={({ pressed }) => [S.openBtn, { borderColor: C.primary, opacity: pressed ? 0.8 : 1 }]}
    >
      <MaterialIcons name="qr-code-2" size={20} color={C.primary} />
      <Text style={{ color: C.primary, fontWeight: "800" }}>QR nhiều sân</Text>
    </Pressable>
  );
}
