// components/registration/AiPosterSheet.tsx
// AI Poster (mobile): chọn Poster cá nhân / cả cặp, tải ảnh theo tên VĐV → backend tạo ảnh
// bằng OpenAI. 3 lượt / VĐV / cặp; admin & BTC không giới hạn (bản web: components/AiPosterDialog.jsx).
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import { normalizeUrl } from "@/utils/normalizeUri";
import AppModal, { useModalTopInset } from "@/components/ui/AppModal";
import {
  useCreateRegistrationAiPosterMutation,
  useGetRegistrationAiPosterQuery,
  useUploadAiPosterTemplateMutation,
} from "@/slices/aiPosterApi";

type Props = {
  open: boolean;
  onClose: () => void;
  tournamentId: string;
  // null = chế độ BTC chỉ quản lý ảnh mẫu AI Poster của giải.
  registration: any;
  templateUrl?: string;
  onTemplateChanged?: () => void;
};

const STATUS_LABEL: Record<string, string> = {
  queued: "Đang chờ",
  processing: "Đang tạo",
  done: "Hoàn tất",
  failed: "Lỗi",
};

async function pickImage() {
  const selection = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  if (selection.canceled) return null;
  const asset = selection.assets[0];
  const longest = Math.max(asset.width || 0, asset.height || 0);
  const edits =
    longest > 2000
      ? [{ resize: (asset.width || 0) >= (asset.height || 0) ? { width: 2000 } : { height: 2000 } }]
      : [];
  const image = await ImageManipulator.manipulateAsync(asset.uri, edits, {
    compress: 0.88,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return image.uri;
}

function Body({ onClose, tournamentId, registration, templateUrl, onTemplateChanged }: Omit<Props, "open">) {
  const dark = useColorScheme() === "dark";
  const C = {
    bg: dark ? "#071226" : "#f8fafc",
    card: dark ? "#0D1B36" : "#ffffff",
    border: dark ? "#1E3560" : "#e2e8f0",
    text: dark ? "#EAF3FF" : "#0f172a",
    sub: dark ? "#8CA6C8" : "#64748b",
    tint: "#F59E0B",
    primary: "#0EA5E9",
  };
  const top = useModalTopInset(12);
  const regId = String(registration?._id || registration?.id || "");
  const [mode, setMode] = useState<"single" | "pair">("single");
  const [slot, setSlot] = useState<"p1" | "p2">("p1");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [useAvatar, setUseAvatar] = useState<Record<string, boolean>>({});
  const [polling, setPolling] = useState(false);
  const { data, isFetching, error, refetch } = useGetRegistrationAiPosterQuery(
    { tournamentId, regId },
    { skip: !tournamentId || !regId, pollingInterval: polling ? 4000 : 0 },
  );
  const [localTemplate, setLocalTemplate] = useState<string>(templateUrl || "");
  useEffect(() => setLocalTemplate(templateUrl || ""), [templateUrl]);
  const [createPoster, { isLoading: submitting }] = useCreateRegistrationAiPosterMutation();
  const [uploadTemplate, { isLoading: uploadingTemplate }] = useUploadAiPosterTemplateMutation();

  const jobs: any[] = data?.jobs || [];
  const pending = jobs.some((j) => j.status === "queued" || j.status === "processing");
  useEffect(() => setPolling(pending), [pending]);

  const players: any[] = data?.players || [];
  const isSingleEvent = Boolean(data?.isSingleEvent);
  const quota = data?.quota;
  const noQuota = quota && quota.remaining !== null && quota.remaining <= 0;
  const neededSlots = mode === "pair" ? players.map((p) => p.slot) : [slot];
  const avatarOf = (sl: string) => String(players.find((p) => p.slot === sl)?.avatarUrl || "");
  const usesAvatar = (sl: string) => Boolean(useAvatar[sl] && avatarOf(sl));
  const ready =
    neededSlots.length > 0 && neededSlots.every((sl) => photos[sl] || usesAvatar(sl));
  const latestDone = jobs.find((j) => j.status === "done");

  const choosePhoto = async (s: string) => {
    try {
      const uri = await pickImage();
      if (uri) {
        setPhotos((prev) => ({ ...prev, [s]: uri }));
        setUseAvatar((prev) => ({ ...prev, [s]: false }));
      }
    } catch {
      Alert.alert("Không chọn được ảnh");
    }
  };

  const submit = async () => {
    try {
      const body = new FormData();
      body.append("mode", mode);
      if (mode === "single") body.append("slot", slot);
      neededSlots.forEach((sl) => {
        if (usesAvatar(sl)) {
          body.append(`useAvatar_${sl}`, "1");
        } else {
          body.append(`photo_${sl}`, { uri: photos[sl], type: "image/jpeg", name: `${sl}.jpg` } as unknown as Blob);
        }
      });
      await createPoster({ tournamentId, regId, body }).unwrap();
      Alert.alert("Đã gửi yêu cầu", "AI đang tạo poster, thường mất 1–2 phút.");
      setPolling(true);
      refetch();
    } catch (e: any) {
      Alert.alert("Chưa gửi được", e?.data?.message || "Vui lòng thử lại.");
    }
  };

  const changeTemplate = async () => {
    try {
      const uri = await pickImage();
      if (!uri) return;
      const body = new FormData();
      body.append("template", { uri, type: "image/jpeg", name: "ai-poster-template.jpg" } as unknown as Blob);
      const res = await uploadTemplate({ tournamentId, body }).unwrap();
      if (res?.aiPosterTemplateUrl) setLocalTemplate(String(res.aiPosterTemplateUrl));
      Alert.alert("Đã lưu ảnh mẫu AI Poster");
      onTemplateChanged?.();
      if (regId) refetch();
    } catch (e: any) {
      Alert.alert("Không tải được ảnh mẫu", e?.data?.message || "Vui lòng thử lại.");
    }
  };

  const savePoster = async (url: string) => {
    try {
      const target = `${FileSystem.cacheDirectory}ai-poster-${regId}-${Date.now()}.png`;
      const downloaded = await FileSystem.downloadAsync(url, target);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloaded.uri, { mimeType: "image/png", dialogTitle: "Lưu / chia sẻ poster" });
      }
    } catch {
      Alert.alert("Không tải được ảnh");
    }
  };

  const Seg = ({ value, label }: { value: "single" | "pair"; label: string }) => {
    const on = mode === value;
    return (
      <TouchableOpacity
        onPress={() => setMode(value)}
        style={[s.seg, { borderColor: on ? C.tint : C.border, backgroundColor: on ? C.tint : "transparent" }]}
      >
        <Text style={{ color: on ? "#111827" : C.text, fontWeight: "800", fontSize: 13 }}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: top }}>
      <View style={[s.header, { borderBottomColor: C.border }]}>
        <Ionicons name="sparkles" size={20} color={C.tint} />
        <Text style={{ flex: 1, color: C.text, fontSize: 18, fontWeight: "800" }}>AI Poster</Text>
        <TouchableOpacity onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={26} color={C.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {!regId ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: C.text, fontWeight: "800", fontSize: 15 }}>Ảnh mẫu AI Poster của giải</Text>
            <Text style={{ color: C.sub, fontSize: 13 }}>
              Tải poster mẫu chừa trống chỗ ảnh VĐV và dòng tên (dưới chữ &quot;VẬN ĐỘNG VIÊN&quot;). Khi có
              ảnh mẫu, VĐV đã xác nhận đăng ký sẽ thấy nút AI Poster (3 lượt/cặp); admin và quản lý giải tạo
              được cho mọi cặp, không giới hạn.
            </Text>
            {localTemplate ? (
              <Image
                source={{ uri: normalizeUrl(localTemplate) }}
                style={[s.result, { borderWidth: 1, borderColor: C.border }]}
                resizeMode="contain"
              />
            ) : (
              <View style={[s.note, { backgroundColor: C.card, borderColor: C.border }]}>
                <Ionicons name="image-outline" size={20} color={C.sub} />
                <Text style={{ color: C.sub, flex: 1 }}>Giải chưa có ảnh mẫu AI Poster.</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={changeTemplate}
              disabled={uploadingTemplate}
              style={[s.btn, { backgroundColor: C.tint, opacity: uploadingTemplate ? 0.6 : 1 }]}
            >
              {uploadingTemplate ? (
                <ActivityIndicator color="#111827" />
              ) : (
                <Ionicons name="cloud-upload-outline" size={18} color="#111827" />
              )}
              <Text style={s.btnText}>{localTemplate ? "Đổi ảnh mẫu" : "Tải ảnh mẫu"}</Text>
            </TouchableOpacity>
          </View>
        ) : isFetching && !data ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={{ color: "#ef4444" }}>
            {(error as any)?.data?.message || "Không tải được thông tin AI Poster"}
          </Text>
        ) : !data?.enabled ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: C.sub }}>Giải đấu chưa có ảnh mẫu AI Poster.</Text>
            {data?.isStaff && (
              <TouchableOpacity onPress={changeTemplate} style={[s.btn, { backgroundColor: C.tint }]}>
                <Text style={s.btnText}>{uploadingTemplate ? "Đang tải..." : "Tải ảnh mẫu AI Poster"}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : !data?.canUse ? (
          <Text style={{ color: C.sub }}>
            Chỉ VĐV trong cặp đăng ký mới tạo được AI Poster.
          </Text>
        ) : (
          <>
            {data?.needsPayment && (
              <View style={[s.note, { backgroundColor: "rgba(245,158,11,0.12)", borderColor: C.tint }]}>
                <Ionicons name="card-outline" size={20} color={C.tint} />
                <Text style={{ color: C.text, flex: 1, fontWeight: "700" }}>
                  Đăng ký của bạn chưa thanh toán lệ phí. Vui lòng thanh toán trước để tạo AI Poster.
                </Text>
              </View>
            )}
            <View style={s.rowBetween}>
              {!isSingleEvent ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Seg value="single" label="Poster cá nhân" />
                  <Seg value="pair" label="Poster cả cặp" />
                </View>
              ) : (
                <Text style={{ color: C.text, fontWeight: "800" }}>Poster cá nhân</Text>
              )}
            </View>
            <Text style={{ color: noQuota ? "#ef4444" : C.sub, fontWeight: "700", fontSize: 12 }}>
              {data?.isStaff
                ? "Admin / BTC: không giới hạn lượt"
                : `Còn ${quota?.remaining ?? 0}/${quota?.limit ?? 3} lượt tạo`}
            </Text>

            {mode === "single" && players.length > 1 && (
              <View style={{ gap: 8 }}>
                <Text style={{ color: C.sub, fontSize: 13 }}>Chọn VĐV trên poster:</Text>
                {players.map((p) => {
                  const on = slot === p.slot;
                  return (
                    <TouchableOpacity
                      key={p.slot}
                      onPress={() => setSlot(p.slot)}
                      style={[s.radio, { borderColor: on ? C.primary : C.border, backgroundColor: C.card }]}
                    >
                      <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={20} color={on ? C.primary : C.sub} />
                      <Text style={{ color: C.text, fontWeight: "700" }}>{p.name || p.slot}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              {neededSlots.map((sl) => {
                const p = players.find((x) => x.slot === sl);
                const shown = usesAvatar(sl) ? avatarOf(sl) : photos[sl];
                return (
                  <View key={sl} style={{ flex: 1, gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => choosePhoto(sl)}
                    disabled={submitting}
                    style={[s.photoBox, { borderColor: shown ? C.primary : C.border, backgroundColor: C.card }]}
                  >
                    {shown ? (
                      <Image source={{ uri: shown }} style={s.photo} />
                    ) : (
                      <View style={[s.photo, { alignItems: "center", justifyContent: "center" }]}>
                        <Ionicons name="image-outline" size={36} color={C.sub} />
                      </View>
                    )}
                    <Text numberOfLines={1} style={{ color: C.text, fontWeight: "800", fontSize: 13 }}>
                      Ảnh {p?.name || sl}
                    </Text>
                    <Text style={{ color: C.sub, fontSize: 11 }}>
                      {usesAvatar(sl) ? "Đang dùng ảnh avatar" : photos[sl] ? "Chạm để đổi ảnh" : "Chạm để chọn ảnh"}
                    </Text>
                  </TouchableOpacity>
                  {avatarOf(sl) ? (
                    <TouchableOpacity
                      onPress={() => setUseAvatar((prev) => ({ ...prev, [sl]: !usesAvatar(sl) }))}
                      disabled={submitting}
                      style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                    >
                      <Ionicons
                        name={usesAvatar(sl) ? "checkbox" : "square-outline"}
                        size={18}
                        color={usesAvatar(sl) ? C.primary : C.sub}
                      />
                      <Text style={{ color: C.text, fontSize: 12, fontWeight: "700" }}>Dùng ảnh avatar</Text>
                    </TouchableOpacity>
                  ) : null}
                  </View>
                );
              })}
            </View>
            <Text style={{ color: C.sub, fontSize: 12 }}>
              Có thể dùng ảnh avatar của VĐV hoặc chọn ảnh khác. Nên dùng ảnh rõ mặt, thấy dáng người (toàn thân hoặc nửa người), ít người khác trong khung.
            </Text>

            <TouchableOpacity
              onPress={submit}
              disabled={!ready || submitting || pending || !!noQuota || !!data?.needsPayment}
              style={[
                s.btn,
                {
                  backgroundColor: C.tint,
                  opacity: !ready || submitting || pending || noQuota || data?.needsPayment ? 0.5 : 1,
                },
              ]}
            >
              {submitting ? <ActivityIndicator color="#111827" /> : <Ionicons name="sparkles" size={18} color="#111827" />}
              <Text style={s.btnText}>{data?.needsPayment ? "Cần thanh toán trước" : "Tạo poster"}</Text>
            </TouchableOpacity>

            {pending && (
              <View style={[s.note, { backgroundColor: C.card, borderColor: C.border }]}>
                <ActivityIndicator color={C.tint} />
                <Text style={{ color: C.text, fontWeight: "700", flex: 1 }}>
                  AI đang tạo poster… thường mất 1–2 phút.
                </Text>
              </View>
            )}

            {latestDone?.resultUrl ? (
              <View style={{ gap: 10 }}>
                <Image source={{ uri: latestDone.resultUrl }} style={s.result} resizeMode="contain" />
                <TouchableOpacity
                  onPress={() => savePoster(latestDone.resultUrl)}
                  style={[s.btn, { backgroundColor: C.primary }]}
                >
                  <Ionicons name="download-outline" size={18} color="#fff" />
                  <Text style={[s.btnText, { color: "#fff" }]}>Lưu / chia sẻ ảnh</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {jobs.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={{ color: C.text, fontWeight: "800" }}>Lịch sử tạo</Text>
                {jobs.map((j) => (
                  <View key={j._id} style={[s.jobRow, { backgroundColor: C.card, borderColor: C.border }]}>
                    {j.status === "done" && j.resultUrl ? (
                      <Image source={{ uri: j.resultUrl }} style={s.thumb} />
                    ) : (
                      <View style={[s.thumb, { alignItems: "center", justifyContent: "center" }]}>
                        {j.status === "failed" ? (
                          <Ionicons name="alert-circle" size={20} color="#ef4444" />
                        ) : (
                          <ActivityIndicator size="small" />
                        )}
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ color: C.text, fontWeight: "700", fontSize: 13 }}>
                        {j.mode === "pair" ? "Poster cả cặp" : "Poster cá nhân"} ·{" "}
                        {(j.inputs || []).map((i: any) => i.name).join(" & ")}
                      </Text>
                      <Text numberOfLines={2} style={{ color: j.status === "failed" ? "#ef4444" : C.sub, fontSize: 11 }}>
                        {j.status === "failed" ? j.error : STATUS_LABEL[j.status] || j.status}
                      </Text>
                    </View>
                    {j.status === "done" && j.resultUrl ? (
                      <TouchableOpacity onPress={() => savePoster(j.resultUrl)} hitSlop={10}>
                        <Ionicons name="share-outline" size={20} color={C.primary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            {data?.isStaff && (
              <TouchableOpacity onPress={changeTemplate} style={{ alignSelf: "center", padding: 8 }}>
                <Text style={{ color: C.sub, textDecorationLine: "underline", fontSize: 12 }}>
                  {uploadingTemplate ? "Đang tải ảnh mẫu..." : "BTC: đổi ảnh mẫu AI Poster"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default function AiPosterSheet({
  open,
  onClose,
  tournamentId,
  registration,
  templateUrl,
  onTemplateChanged,
}: Props) {
  return (
    <AppModal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {open ? (
        <Body
          onClose={onClose}
          tournamentId={tournamentId}
          registration={registration}
          templateUrl={templateUrl}
          onTemplateChanged={onTemplateChanged}
        />
      ) : null}
    </AppModal>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seg: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  radio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  photoBox: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14, padding: 8, gap: 4 },
  photo: { width: "100%", height: 160, borderRadius: 10 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  btnText: { color: "#111827", fontWeight: "800", fontSize: 15 },
  note: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  result: { width: "100%", aspectRatio: 0.9, borderRadius: 12 },
  jobRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 8, borderRadius: 12, borderWidth: 1 },
  thumb: { width: 44, height: 44, borderRadius: 8 },
});
