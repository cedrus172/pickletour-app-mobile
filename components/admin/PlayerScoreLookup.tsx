// components/admin/PlayerScoreLookup.tsx — Admin: tra VĐV theo khuôn mặt trong dữ liệu diễn đàn
// (SportConnect / PickleballVN). Điểm PickleTour = điểm ĐÔI; PickleballVN trừ 0.4, SportConnect giữ nguyên.
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import AppModal, { ModalTopInset } from "@/components/ui/AppModal";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useLookupPlayerFaceMutation } from "@/slices/spcFaceApiSlice";
import { useCreateEvaluationMutation } from "@/slices/evaluationsApiSlice";
import { TextInput } from "@/components/ui/i18nTextInput";
import { normalizeUrl } from "@/utils/normalizeUri";

export const SOURCE_COLOR: Record<string, string> = { spc: "#2563EB", pbvn: "#16A34A", pt: "#0891B2" };

/** Ảnh đại diện bấm vào → xem ảnh đầy đủ (nền đen, chạm để đóng). */
export function ZoomAvatar({ uri, size = 48, fallback }: { uri?: string; size?: number; fallback?: React.ReactNode }) {
  const C = useThemeTokens();
  const [open, setOpen] = useState(false);
  const box = { width: size, height: size, borderRadius: size / 2, overflow: "hidden" as const, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: C.field };
  if (!uri) return <View style={box}>{fallback || <Ionicons name="person" size={size * 0.45} color={C.sub} />}</View>;
  return (
    <>
      <Pressable accessibilityRole="imagebutton" accessibilityLabel="Xem ảnh đầy đủ" onPress={() => setOpen(true)} style={box}>
        <ExpoImage source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Pressable>
      <AppModal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)" }} onPress={() => setOpen(false)}>
          <ExpoImage source={{ uri }} style={{ flex: 1 }} contentFit="contain" />
          <ModalTopInset min={12}>
            {(top) => (
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng" hitSlop={12} onPress={() => setOpen(false)} style={{ position: "absolute", top: top + 8, right: 16 }}>
                <Ionicons name="close-circle" size={34} color="#fff" />
              </Pressable>
            )}
          </ModalTopInset>
        </Pressable>
      </AppModal>
    </>
  );
}
const fmt = (v: any) => (v == null || !Number.isFinite(Number(v)) ? "—" : Number(v).toFixed(2).replace(/0$/, ""));

/** Nhãn điểm theo nguồn: "PickleballVN 3.0 → 2.6" / "SportConnect 3.2". */
export function ScoreSourceBadge({ m }: { m: any }) {
  if (!m) return null;
  const label =
    m.double == null
      ? `${m.sourceLabel}: chưa có điểm đôi`
      : m.scoreOffset
        ? `${m.sourceLabel} ${fmt(m.double)} → ${fmt(m.pickletourScore)}`
        : `${m.sourceLabel} ${fmt(m.double)}`;
  return (
    <View style={[styles.badge, { backgroundColor: SOURCE_COLOR[m.source] || "#64748B" }]}>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11.5 }}>{label}</Text>
    </View>
  );
}

export function MatchRow({ m, onUse }: { m: any; onUse?: (m: any) => void }) {
  const C = useThemeTokens();
  return (
    <View style={[styles.row, { borderColor: m.likely ? SOURCE_COLOR[m.source] : C.border, backgroundColor: C.card }]}>
      <ZoomAvatar uri={m.avatar} size={48} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={{ color: C.text, fontWeight: "800" }} numberOfLines={1}>
          {m.name || "—"}
          {m.nickname ? <Text style={{ color: C.sub, fontWeight: "500" }}> · {m.nickname}</Text> : null}
        </Text>
        <Text style={{ color: C.sub, fontSize: 12 }} numberOfLines={1}>
          {[m.phone, m.province, m.code ? `Mã ${m.code}` : "", m.status, m.matchedBy === "cccd" ? "Khớp qua ảnh CCCD" : ""].filter(Boolean).join(" · ") || "—"}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          <ScoreSourceBadge m={m} />
          <View style={[styles.badge, { borderWidth: 1, borderColor: C.border }]}>
            <Text style={{ color: C.sub, fontWeight: "700", fontSize: 11.5 }}>
              Giống {Math.round((m.similarity || 0) * 100)}%{m.likely ? " · khả năng cao" : ""}
            </Text>
          </View>
        </View>
      </View>
      <View style={{ alignItems: "center", minWidth: 58 }}>
        <Text style={{ color: C.sub, fontSize: 10.5 }}>Điểm PT</Text>
        <Text style={{ color: C.text, fontWeight: "900", fontSize: 20 }}>{fmt(m.pickletourScore)}</Text>
        {onUse ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onUse(m)}>
            <Text style={{ color: C.primary, fontWeight: "800", fontSize: 13 }}>{m.source === "pt" ? "Chọn TK" : "Dùng"}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Ảnh có nhiều khuôn mặt → hàng ảnh nhỏ để admin chọn mặt cần tra. */
export function FacePicker({ faces, selected, onSelect, busy }: { faces: any[]; selected: number; onSelect: (i: number) => void; busy?: boolean }) {
  const C = useThemeTokens();
  if (!Array.isArray(faces) || faces.length < 2) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: C.text, fontWeight: "700", fontSize: 13 }}>Ảnh có {faces.length} khuôn mặt — chạm chọn đúng mặt VĐV cần tra</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {faces.map((f, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Chọn khuôn mặt ${i + 1}`}
            accessibilityState={{ selected: i === selected, disabled: !!busy }}
            disabled={busy}
            onPress={() => onSelect(i)}
            style={{ padding: 2, borderRadius: 32, borderWidth: 3, borderColor: i === selected ? C.primary : "transparent", opacity: busy && i !== selected ? 0.5 : 1 }}
          >
            <ExpoImage source={{ uri: f.thumb }} style={{ width: 52, height: 52, borderRadius: 26 }} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const MIN_RATING = 1.6;
const MAX_RATING = 8.0;
const parseRating = (v: string) => {
  const t = String(v ?? "").replace(/,/g, ".").trim();
  return t === "" ? undefined : Number.parseFloat(t);
};
const fmtInput = (v: any) => (v == null || !Number.isFinite(Number(v)) ? "" : String(Number(Number(v).toFixed(2))));

type LookupTarget = { imageUrl: string; name?: string; userId?: string; province?: string; score?: number };

/** "Chấm trình ngay" trong popup Tra điểm: điểm đôi gợi ý từ VĐV khớp, admin sửa rồi gửi
 *  (cùng API chấm trình — cập nhật BXH + điểm trong các đăng ký đang mở). */
function QuickGrade({
  target,
  doubles,
  setDoubles,
  singles,
  setSingles,
  onGraded,
}: {
  target: LookupTarget;
  doubles: string;
  setDoubles: (v: string) => void;
  singles: string;
  setSingles: (v: string) => void;
  onGraded?: () => void;
}) {
  const C = useThemeTokens();
  const [createEvaluation, { isLoading }] = useCreateEvaluationMutation();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => setMsg(null), [target?.userId]);
  const submit = async () => {
    setMsg(null);
    const d = parseRating(doubles);
    const s = parseRating(singles);
    if (d === undefined && s === undefined) return setMsg({ ok: false, text: "Nhập điểm đôi hoặc điểm đơn" });
    const bad = (v?: number) => v !== undefined && !(Number.isFinite(v) && v >= MIN_RATING && v <= MAX_RATING);
    if (bad(d) || bad(s)) return setMsg({ ok: false, text: `Điểm phải trong khoảng ${MIN_RATING} - ${MAX_RATING}` });
    try {
      await createEvaluation({
        targetUser: target.userId,
        province: target.province || "",
        source: "live",
        overall: { singles: s, doubles: d },
        notes: "Chấm từ Tra điểm",
      }).unwrap();
      setMsg({ ok: true, text: `Đã chấm trình${d !== undefined ? ` · Đôi ${d}` : ""}${s !== undefined ? ` · Đơn ${s}` : ""}` });
      onGraded?.();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.data?.message || e?.error || "Không chấm được" });
    }
  };
  const field = [styles.gradeInput, { backgroundColor: C.field, borderColor: C.border, color: C.text }];
  return (
    <View style={[styles.gradeBox, { borderTopColor: C.border, backgroundColor: C.card }]}>
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 14 }}>
        Chấm trình ngay
        {target?.score != null ? <Text style={{ color: C.sub, fontWeight: "500", fontSize: 12.5 }}> · điểm hiện tại {fmtInput(target.score) || "—"}</Text> : null}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <View style={{ width: 84, gap: 3 }}>
          <Text style={{ color: C.sub, fontSize: 11 }}>Điểm đôi</Text>
          <TextInput value={doubles} onChangeText={setDoubles} keyboardType="decimal-pad" placeholder="—" keypadLabel="Điểm đôi" placeholderTextColor={C.sub} style={field} />
        </View>
        <View style={{ width: 84, gap: 3 }}>
          <Text style={{ color: C.sub, fontSize: 11 }}>Điểm đơn</Text>
          <TextInput value={singles} onChangeText={setSingles} keyboardType="decimal-pad" placeholder="—" keypadLabel="Điểm đơn" placeholderTextColor={C.sub} style={field} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chấm trình ngay"
          disabled={isLoading}
          onPress={submit}
          style={[styles.gradeBtn, { backgroundColor: C.primary, opacity: isLoading ? 0.7 : 1 }]}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>Chấm trình ngay</Text>}
        </Pressable>
      </View>
      {msg ? (
        <Text style={{ color: msg.ok ? "#16A34A" : "#EF4444", fontWeight: "700", fontSize: 12.5 }}>{msg.text}</Text>
      ) : (
        <Text style={{ color: C.sub, fontSize: 11.5 }}>Chạm “Dùng” ở VĐV khớp để lấy điểm đôi PickleTour. Chấm xong cập nhật luôn điểm trong các giải đang đăng ký.</Text>
      )}
    </View>
  );
}

/** target = { imageUrl, name, userId?, province?, score? } | null; onGraded() sau khi chấm xong. */
export default function PlayerScoreLookupModal({
  target,
  onClose,
  onGraded,
}: {
  target: LookupTarget | null;
  onClose: () => void;
  onGraded?: () => void;
}) {
  const C = useThemeTokens();
  const [lookup, { data, isLoading, error }] = useLookupPlayerFaceMutation();
  const [searchFace, { isLoading: searching }] = useLookupPlayerFaceMutation();
  const [picked, setPicked] = useState<{ index: number; matches: any[] } | null>(null);
  const url = target?.imageUrl ? normalizeUrl(target.imageUrl) : "";
  // Server ưu tiên ảnh CCCD của VĐV (theo userId), không có mặt rõ mới dùng avatar.
  const uid = target?.userId ? String(target.userId) : "";
  const canLookup = !!(url || uid);
  // Chỉ gọi một lần mỗi khi mở cho một ảnh (reset/lookup của RTK đổi sau mỗi lượt → không đưa vào deps, tránh gọi lặp).
  useEffect(() => {
    setPicked(null);
    if (url || uid) lookup({ imageUrl: url, userId: uid } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, uid]);
  const res: any = data;
  const srcLabel = res?.imageSource === "cccd" ? "ảnh CCCD" : "ảnh đại diện";
  const selected = picked ? picked.index : res?.selected ?? 0;
  const matches: any[] = picked ? picked.matches : res?.matches || [];
  // Ô chấm trình: gợi ý điểm đôi từ VĐV khớp đầu tiên "khả năng cao" (admin chưa sửa tay).
  const [doubles, setDoubles] = useState("");
  const [singles, setSingles] = useState("");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    setDoubles("");
    setSingles("");
    setTouched(false);
  }, [target?.userId, url]);
  const suggested = matches.find((m) => m.likely && m.pickletourScore != null)?.pickletourScore;
  useEffect(() => {
    if (!touched) setDoubles(fmtInput(suggested));
  }, [suggested, touched]);
  const applyMatch = (m: any) => {
    setTouched(true);
    setDoubles(fmtInput(m.pickletourScore));
  };
  const chooseFace = async (i: number) => {
    if (i === selected) return;
    if (i === res?.selected) return setPicked(null);
    try {
      const r: any = await searchFace({ emb: res.faces[i].emb } as any).unwrap();
      setPicked({ index: i, matches: r?.matches || [] });
    } catch {
      setPicked({ index: i, matches: [] });
    }
  };
  return (
    <AppModal visible={!!target} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top", "bottom"]}>
        <View style={[styles.head, { borderBottomColor: C.border }]}>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 17, flex: 1 }} numberOfLines={1}>
            Tra điểm{target?.name ? ` · ${target.name}` : ""}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng" hitSlop={10} onPress={onClose}>
            <Ionicons name="close" size={24} color={C.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
          {!canLookup ? (
            <Text style={{ color: C.sub, textAlign: "center", marginTop: 30 }}>VĐV chưa có ảnh CCCD hay ảnh đại diện để tra khuôn mặt.</Text>
          ) : isLoading ? (
            <View style={{ alignItems: "center", gap: 10, marginTop: 40 }}>
              <ActivityIndicator color={C.primary} />
              <Text style={{ color: C.sub, textAlign: "center" }}>Đang tìm khuôn mặt trong dữ liệu SportConnect và PickleballVN…</Text>
            </View>
          ) : error ? (
            <Text style={{ color: "#EF4444", textAlign: "center", marginTop: 30 }}>{(error as any)?.data?.message || "Không tra được"}</Text>
          ) : res && !res.faceFound ? (
            <Text style={{ color: C.sub, textAlign: "center", marginTop: 30 }}>Không thấy khuôn mặt rõ trong ảnh CCCD hay ảnh đại diện của VĐV này.</Text>
          ) : res ? (
            <>
              {res.faces?.length > 1 ? (
                <>
                  <Text style={{ color: C.sub, fontSize: 12 }}>Tra theo {srcLabel}</Text>
                  <FacePicker faces={res.faces} selected={selected} onSelect={chooseFace} busy={searching} />
                </>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {res.face ? <ExpoImage source={{ uri: res.face }} style={{ width: 52, height: 52, borderRadius: 26 }} /> : null}
                  <Text style={{ color: C.sub, fontSize: 12.5, flex: 1, lineHeight: 17 }}>
                    Tra theo {srcLabel}. Điểm PickleTour = điểm đôi của diễn đàn · PickleballVN trừ 0.4 · SportConnect giữ nguyên.
                  </Text>
                </View>
              )}
              {searching ? (
                <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
              ) : matches.length ? (
                matches.map((m) => (
                  <MatchRow key={`${m.source}:${m.spcId}`} m={m} onUse={target?.userId && m.pickletourScore != null ? applyMatch : undefined} />
                ))
              ) : (
                <Text style={{ color: C.sub, textAlign: "center", marginTop: 20 }}>Không tìm thấy VĐV giống trong dữ liệu diễn đàn.</Text>
              )}
            </>
          ) : null}
        </ScrollView>
        {target?.userId ? (
          <QuickGrade
            target={target}
            doubles={doubles}
            setDoubles={(v) => {
              setTouched(true);
              setDoubles(v);
            }}
            singles={singles}
            setSingles={setSingles}
            onGraded={onGraded}
          />
        ) : null}
      </SafeAreaView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, borderWidth: 1 },
  ava: { width: 48, height: 48, borderRadius: 24, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  gradeBox: { gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6, borderTopWidth: 1 },
  gradeInput: { height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, fontSize: 17, fontWeight: "800", textAlign: "center" },
  gradeBtn: { flex: 1, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
