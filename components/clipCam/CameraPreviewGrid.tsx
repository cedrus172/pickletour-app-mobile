import React, { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import type { ThemeTokens } from "@/hooks/useThemeTokens";
import type { CameraPreview, CameraPreviewState } from "@/utils/clipCameraCache";
import type { Channel } from "@/utils/pickclip";

export function cameraPreviewColors(C: ThemeTokens) {
  return C.isV2 ? { bg: "#041329", card: "#082138", border: "#174A6C", primary: "#12C8EC", text: "#F0F6FF", sub: "#94B3D0" } : C;
}

export function cameraPreviewTime(preview: CameraPreview, now = Date.now()) {
  const time = preview.capturedAt || preview.fetchedAt;
  const date = new Date(time), today = new Date(now);
  const sameDay = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${preview.capturedAt ? "Ảnh lúc" : "Đã tải"} ${sameDay ? "" : `${pad(date.getDate())}/${pad(date.getMonth() + 1)} `}${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function CameraCard({ channel, preview, error, C, width, onOpen, replayDelayMin = 0 }: { channel: Channel; preview?: CameraPreview; error?: string; C: ThemeTokens; width: number | `${number}%`; onOpen: (channel: Channel) => void; replayDelayMin?: number }) {
  const P = cameraPreviewColors(C);
  const [failedUri, setFailedUri] = useState("");
  const replayOnly = replayDelayMin > 0;
  const showImage = !replayOnly && !!preview && preview.uri !== failedUri;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${channel.name}, xem camera và cắt highlight`} onPress={() => onOpen(channel)} style={({ pressed }) => [styles.card, { width, backgroundColor: P.card, borderColor: P.border, opacity: pressed ? 0.82 : 1 }]}>
      <View style={[styles.imageWrap, { backgroundColor: P.bg }]}>
        {replayOnly ? (
          <View style={styles.placeholder}>
            <Ionicons name="play-back-circle-outline" size={34} color={P.sub} />
            <Text style={{ color: P.sub, marginTop: 10, fontSize: 13, textAlign: "center" }}>{`Chỉ xem lại video cũ hơn ${replayDelayMin} phút`}</Text>
          </View>
        ) : showImage ? <Image source={{ uri: preview.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailedUri(preview.uri)} /> : (
          <View style={styles.placeholder}>
            {error || failedUri ? <Ionicons name="image-outline" size={32} color={P.sub} /> : <ActivityIndicator color={P.primary} />}
            <Text style={{ color: P.sub, marginTop: 10, fontSize: 13 }}>{error || failedUri ? "Chưa có ảnh xem trước" : "Đang lấy ảnh gần nhất…"}</Text>
          </View>
        )}
        <View style={[styles.imagePill, styles.cameraPill]}><Text style={styles.pillText}>{`CAMERA${String(channel.id).padStart(2, "0")}`}</Text></View>
        {showImage && <View style={[styles.imagePill, styles.timePill]}><Ionicons name="time-outline" size={15} color="#F0F6FF" /><Text style={styles.pillText}>{cameraPreviewTime(preview)}</Text></View>}
        {showImage && (!!error || preview.stale || (preview.capturedAt && Date.now() - preview.capturedAt > 90_000)) && <View style={[styles.imagePill, styles.oldPill]}><Text style={[styles.pillText, { fontSize: 11 }]}>Đang giữ ảnh gần nhất</Text></View>}
      </View>
      <View style={styles.cardFooter}>
        <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={{ color: P.text, fontWeight: "800", fontSize: 19 }}>{channel.name}</Text><Text style={{ color: P.sub, fontSize: 13, marginTop: 4 }}>{replayOnly ? "Chạm để xem lại" : "Chạm để xem camera"}</Text></View>
        <View style={[styles.openButton, { borderColor: P.primary }]}><Ionicons name="cut-outline" size={19} color={P.primary} /><Text style={{ color: P.primary, fontWeight: "700", fontSize: 14 }}>Xem & cắt</Text><Ionicons name="chevron-forward" size={16} color={P.primary} /></View>
      </View>
    </Pressable>
  );
}

export default function CameraPreviewGrid({ state, C, onOpen, onRefresh, replayDelayMin = 0 }: { state: CameraPreviewState; C: ThemeTokens; onOpen: (channel: Channel) => void; onRefresh: () => void; replayDelayMin?: number }) {
  const P = cameraPreviewColors(C);
  const [width, setWidth] = useState(0);
  const columns = width >= 1040 ? 3 : width >= 640 ? 2 : 1;
  const cardWidth = width ? (width - (columns - 1) * 14) / columns : "100%";
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.heading}><Ionicons name="cut-outline" size={23} color={P.primary} /><View style={{ flex: 1 }}><Text style={{ color: P.text, fontWeight: "800", fontSize: 21 }}>Chọn camera</Text><Text style={{ color: P.sub, fontSize: 14, marginTop: 6 }}>Xem lại trận đấu và cắt highlight.</Text></View><Text style={{ color: P.sub, fontSize: 13 }}>{state.channels.length} camera</Text></View>
      <View style={[styles.info, { backgroundColor: P.card, borderColor: P.border }]}><Ionicons name={replayDelayMin > 0 ? "play-back-outline" : "image-outline"} size={20} color={P.sub} /><Text style={{ color: P.sub, fontSize: 13, flex: 1 }}>{replayDelayMin > 0 ? `Quyền chỉ xem lại · video cũ hơn ${replayDelayMin} phút` : "Ảnh gần nhất · Tự làm mới"}</Text>{state.refreshing && <ActivityIndicator size="small" color={P.primary} />}</View>
      {!!state.error && <Pressable accessibilityRole="button" onPress={onRefresh} style={{ paddingBottom: 14 }}><Text style={{ color: P.sub, fontSize: 13 }}>{state.channels.length ? "Chưa cập nhật được camera. " : "Không tải được danh sách camera. "}<Text style={{ color: P.primary }}>Thử lại</Text></Text></Pressable>}
      {state.loading && !state.channels.length ? <View style={styles.empty}><ActivityIndicator color={P.primary} /><Text style={{ color: P.sub, marginTop: 12 }}>Đang tải camera…</Text></View> : !state.channels.length && !state.error ? <View style={styles.empty}><Ionicons name="videocam-off-outline" size={36} color={P.sub} /><Text style={{ color: P.sub, marginTop: 12 }}>Chưa có camera nào ở sân này.</Text></View> : null}
      <View style={styles.grid}>{state.channels.map((channel) => <CameraCard key={channel.id} channel={channel} preview={state.previews[channel.id]} error={state.errors[channel.id]} C={C} width={cardWidth} onOpen={onOpen} replayDelayMin={replayDelayMin} />)}</View>
      {!!state.channels.length && replayDelayMin <= 0 && <View style={styles.disclaimer}><Ionicons name="information-circle-outline" size={19} color={P.sub} /><Text style={{ color: P.sub, flex: 1, fontSize: 12 }}>Ảnh xem trước không phải video trực tiếp.</Text></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 18 },
  info: { borderWidth: 1, borderRadius: 12, minHeight: 40, paddingHorizontal: 13, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  card: { borderWidth: 1, borderRadius: 14, padding: 3, overflow: "hidden" },
  imageWrap: { aspectRatio: 16 / 9, borderRadius: 11, overflow: "hidden" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: 15 },
  imagePill: { position: "absolute", backgroundColor: "rgba(2,14,29,0.78)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 5 },
  cameraPill: { left: 8, top: 8 }, timePill: { left: 8, bottom: 8 }, oldPill: { right: 8, top: 8 },
  pillText: { color: "#F0F6FF", fontSize: 12 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 12 },
  openButton: { minHeight: 44, paddingHorizontal: 11, borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 6 },
  empty: { paddingVertical: 50, alignItems: "center" },
  disclaimer: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
});
