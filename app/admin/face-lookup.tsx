// app/admin/face-lookup.tsx — Tra cứu ảnh VĐV (admin)
// Chọn/chụp ảnh → chọn khuôn mặt → tìm VĐV (họ tên, biệt danh, SĐT, điểm) trong dữ liệu SportConnect + PickleballVN bằng cách so
// với ảnh đại diện. Ảnh chỉ dùng để tìm, server không lưu.
import React, { useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Clipboard from "expo-clipboard";

import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useDetectSpcFacesMutation, useGetSpcFaceStatusQuery, useSearchSpcFaceMutation } from "@/slices/spcFaceApiSlice";

type Face = { index: number; thumb: string; emb: string };

export default function FaceLookupScreen() {
  const C = useThemeTokens();
  const [photo, setPhoto] = useState("");
  const [faces, setFaces] = useState<Face[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const { data: status } = useGetSpcFaceStatusQuery(undefined, { pollingInterval: 15000 });
  const [detect, { isLoading: detecting }] = useDetectSpcFacesMutation();
  const [search, { isLoading: searching }] = useSearchSpcFaceMutation();

  const runSearch = async (f: Face) => {
    setPicked(f.index);
    setResult(null);
    try {
      setResult(await search(f.emb).unwrap());
    } catch (e: any) {
      Alert.alert("Không tra cứu được", e?.data?.message || "Vui lòng thử lại.");
    }
  };

  const pick = async (mode: "camera" | "library") => {
    try {
      if (mode === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert("Cần quyền camera", "Hãy cho phép PickleTour dùng camera.");
      }
      const opts: any = { mediaTypes: ["images"], quality: 1 };
      const sel = mode === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (sel.canceled) return;
      const img = await ImageManipulator.manipulateAsync(sel.assets[0].uri, [{ resize: { width: 1800 } }], {
        compress: 0.88,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      setPhoto(img.uri);
      setFaces([]);
      setPicked(null);
      setResult(null);
      const res: any = await detect({ uri: img.uri, name: "lookup.jpg", type: "image/jpeg" } as any).unwrap();
      const list: Face[] = res?.faces || [];
      setFaces(list);
      if (!list.length) Alert.alert("Không thấy khuôn mặt", "Ảnh này không có khuôn mặt đủ rõ.");
      else if (list.length === 1) runSearch(list[0]);
    } catch (e: any) {
      Alert.alert("Không đọc được ảnh", e?.data?.message || e?.message || "Vui lòng thử lại.");
    }
  };

  const pct = status?.total ? Math.round((status.done / status.total) * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Tra cứu ảnh VĐV", headerShown: true }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={{ color: C.sub, fontSize: 13, lineHeight: 19 }}>
          Chọn ảnh có mặt VĐV, chọn khuôn mặt → tìm họ tên và SĐT trong dữ liệu SportConnect và PickleballVN (so với ảnh đại diện). Ảnh chỉ dùng
          để tìm, không được lưu.
        </Text>

        {status && !status.ready ? (
          <View style={[styles.note, { borderColor: C.border, backgroundColor: C.card }]}>
            <Text style={{ color: C.text, fontSize: 13 }}>
              Đang phân tích ảnh đại diện VĐV: {status.done}/{status.total || "?"} ({pct}%). Có thể tra cứu ngay, kết quả đầy
              đủ hơn khi xong.
            </Text>
            <View style={[styles.bar, { backgroundColor: C.field }]}>
              <View style={{ width: `${pct}%`, height: "100%", backgroundColor: C.primary, borderRadius: 3 }} />
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { mode: "library" as const, label: "Chọn ảnh", icon: "images-outline" as const },
            { mode: "camera" as const, label: "Chụp ảnh", icon: "camera-outline" as const },
          ].map((b) => (
            <Pressable
              key={b.mode}
              accessibilityRole="button"
              disabled={detecting}
              onPress={() => pick(b.mode)}
              style={[styles.btn, { backgroundColor: b.mode === "library" ? C.primary : C.card, borderColor: C.border }]}
            >
              <Ionicons name={b.icon} size={18} color={b.mode === "library" ? "#fff" : C.text} />
              <Text style={{ color: b.mode === "library" ? "#fff" : C.text, fontWeight: "800" }}>{b.label}</Text>
            </Pressable>
          ))}
        </View>

        {photo ? (
          <View style={[styles.preview, { borderColor: C.border, backgroundColor: C.card }]}>
            <ExpoImage source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="contain" />
            {detecting ? (
              <View style={styles.previewBusy}>
                <ActivityIndicator color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700" }}>Đang tìm khuôn mặt…</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {faces.length > 1 ? (
          <Text style={{ color: C.sub, fontSize: 13 }}>Ảnh có {faces.length} khuôn mặt — chạm vào người cần tra cứu:</Text>
        ) : null}
        {faces.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {faces.map((f) => (
              <Pressable
                key={f.index}
                accessibilityRole="button"
                accessibilityLabel={`Khuôn mặt ${f.index + 1}`}
                disabled={searching}
                onPress={() => runSearch(f)}
              >
                <ExpoImage
                  source={{ uri: f.thumb }}
                  style={[styles.face, { borderColor: picked === f.index ? C.primary : "transparent" }]}
                  contentFit="cover"
                />
              </Pressable>
            ))}
          </View>
        ) : null}

        {searching ? (
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <ActivityIndicator color={C.primary} />
            <Text style={{ color: C.text }}>Đang so khuôn mặt…</Text>
          </View>
        ) : null}

        {result ? (
          result.matches?.length ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: C.sub, fontSize: 12.5 }}>
                {result.matches.length} VĐV giống nhất (so với {result.searched} ảnh đại diện)
              </Text>
              {result.matches.map((m: any) => (
                <View key={`${m.source || "spc"}:${m.spcId}`} style={[styles.row, { backgroundColor: C.card, borderColor: m.likely ? "#22C55E" : C.border }]}>
                  {m.avatar ? (
                    <ExpoImage source={{ uri: m.avatar }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: C.field, alignItems: "center", justifyContent: "center" }]}>
                      <Ionicons name="person" size={24} color={C.sub} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Text style={{ color: C.text, fontWeight: "800", fontSize: 15 }}>{m.name || m.nickname || `#${m.spcId}`}</Text>
                      <View style={[styles.badge, { backgroundColor: m.source === "pbvn" ? "#16A34A" : "#2563EB" }]}>
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11.5 }}>{m.sourceLabel || "SportConnect"}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: m.likely ? "#22C55E" : C.field }]}>
                        <Text style={{ color: m.likely ? "#fff" : C.text, fontWeight: "800", fontSize: 11.5 }}>
                          {m.likely ? "Khớp" : "Có thể"} · {Math.round(m.similarity * 100)}%
                        </Text>
                      </View>
                    </View>
                    {m.nickname && m.nickname !== m.name ? (
                      <Text style={{ color: C.sub, fontSize: 12.5 }}>Biệt danh: {m.nickname}</Text>
                    ) : null}
                    {m.phone ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`tel:${m.phone}`)} style={styles.phone}>
                          <Ionicons name="call" size={14} color={C.primary} />
                          <Text style={{ color: C.primary, fontWeight: "800" }}>{m.phone}</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Chép số điện thoại"
                          onPress={async () => {
                            await Clipboard.setStringAsync(String(m.phone));
                            Alert.alert("Đã chép", String(m.phone));
                          }}
                          hitSlop={8}
                        >
                          <Ionicons name="copy-outline" size={16} color={C.sub} />
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={{ color: C.sub, fontSize: 12.5 }}>Chưa có SĐT</Text>
                    )}
                    <Text style={{ color: C.sub, fontSize: 11.5 }}>
                      {[
                        m.double != null ? `Đôi ${m.double}` : "",
                        m.single != null ? `Đơn ${m.single}` : "",
                        m.province,
                        m.status,
                        m.code ? `Mã ${m.code}` : "",
                        `ID ${m.spcId}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: C.sub, fontSize: 13, lineHeight: 19 }}>
              Không tìm thấy VĐV nào có ảnh đại diện giống khuôn mặt này
              {result.index && !result.index.ready ? " — dữ liệu vẫn đang được phân tích, thử lại sau." : "."}
            </Text>
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  note: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  bar: { height: 6, borderRadius: 3, overflow: "hidden" },
  btn: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  preview: { width: "100%", aspectRatio: 4 / 3, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  previewBusy: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", gap: 8 },
  face: { width: 76, height: 76, borderRadius: 38, borderWidth: 3 },
  row: { flexDirection: "row", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  phone: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 2 },
});
