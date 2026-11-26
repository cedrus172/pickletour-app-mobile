// Khung "Giải tập huấn trọng tài" ở trang giải + hướng dẫn từng bước (giải thường → không render).
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/i18nText";
import AppModal, { useModalTopInset } from "@/components/ui/AppModal";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { TRAINING_INTRO_STEPS } from "@/utils/refereeTrainingSteps";

const fmtTime = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}`;
};

function GuideBody({ onClose, onOpenCourts }: { onClose: () => void; onOpenCourts: () => void }) {
  const C = useThemeTokens();
  const top = useModalTopInset(12);
  const ins = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const step = TRAINING_INTRO_STEPS[i];
  const last = i === TRAINING_INTRO_STEPS.length - 1;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: top, paddingLeft: ins.left, paddingRight: ins.right }}>
      <View style={S.modalHead}>
        <Text style={[S.modalTitle, { color: C.text }]}>Hướng dẫn tập huấn trọng tài</Text>
        <Pressable hitSlop={10} onPress={onClose} accessibilityLabel="Đóng">
          <Ionicons name="close" size={24} color={C.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={S.stepper}>
          {TRAINING_INTRO_STEPS.map((_, k) => (
            <Pressable key={k} onPress={() => setI(k)} hitSlop={4} style={{ flex: 1 }}>
              <View style={[S.bar, { backgroundColor: k <= i ? "#22c55e" : C.border }]} />
            </Pressable>
          ))}
        </View>
        <View style={[S.stepCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={S.stepNum}>
            <Text style={S.stepNumText}>{i + 1}</Text>
          </View>
          <Text style={[S.stepTitle, { color: C.text }]}>{step.title}</Text>
          <Text style={[S.stepBody, { color: C.sub }]}>{step.body}</Text>
        </View>

        <Text style={[S.listHead, { color: C.muted }]}>Tất cả các bước</Text>
        {TRAINING_INTRO_STEPS.map((s, k) => (
          <Pressable key={k} onPress={() => setI(k)} style={S.listRow}>
            <Ionicons
              name={k < i ? "checkmark-circle" : k === i ? "radio-button-on" : "ellipse-outline"}
              size={18}
              color={k <= i ? "#22c55e" : C.muted}
            />
            <Text style={[S.listText, { color: k === i ? C.text : C.sub }]}>{s.title}</Text>
          </Pressable>
        ))}

        <View style={S.navRow}>
          <Pressable
            disabled={i === 0}
            onPress={() => setI((x) => Math.max(0, x - 1))}
            style={[S.navBtn, { borderColor: C.border, opacity: i === 0 ? 0.4 : 1 }]}
          >
            <Text style={{ color: C.text, fontWeight: "700" }}>Trước</Text>
          </Pressable>
          <Pressable
            onPress={() => (last ? onOpenCourts() : setI((x) => x + 1))}
            style={[S.navBtn, S.navMain]}
          >
            <Text style={{ color: "#04210f", fontWeight: "800" }}>{last ? "Vào chấm trận" : "Tiếp"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

export default function RefereeTrainingBanner({ tournament, flush = false }: { tournament: any; flush?: boolean }) {
  const C = useThemeTokens();
  const router = useRouter();
  const [guide, setGuide] = useState(false);
  const rt = tournament?.refereeTraining;
  if (rt?.enabled !== true) return null;
  const clusterId = String(rt.clusterId?._id || rt.clusterId || "");
  const openCourts = () => {
    setGuide(false);
    router.push(clusterId ? (`/referee/cluster/${clusterId}` as any) : ("/referee/clusters" as any));
  };
  const resetAt = fmtTime(rt.lastResetAt);

  return (
    <View style={flush ? { marginBottom: 12 } : { paddingHorizontal: 16, marginTop: 14 }}>
      <View style={[S.card, { backgroundColor: C.card, borderColor: "#22c55e" }]}>
        <View style={S.row}>
          <View style={S.icon}>
            <Ionicons name="school" size={20} color="#04210f" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[S.title, { color: C.text }]}>Giải tập huấn trọng tài</Text>
            <Text style={[S.sub, { color: C.sub }]}>
              64 cặp VĐV giả lập · 9 sân · Playoff → Knockout. Trận kế tiếp tự vào sân, giải tự làm mới 00:05 mỗi ngày.
              {resetAt ? ` Làm mới lần cuối: ${resetAt}.` : ""}
            </Text>
          </View>
        </View>
        <View style={S.btnRow}>
          <Pressable onPress={() => setGuide(true)} style={[S.btn, { borderColor: C.border }]}>
            <Ionicons name="list" size={16} color={C.text} />
            <Text style={[S.btnText, { color: C.text }]}>Hướng dẫn từng bước</Text>
          </Pressable>
          <Pressable onPress={openCourts} style={[S.btn, S.btnMain]}>
            <Ionicons name="tennisball" size={16} color="#04210f" />
            <Text style={[S.btnText, { color: "#04210f" }]}>Vào chấm trận</Text>
          </Pressable>
        </View>
      </View>
      <AppModal visible={guide} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setGuide(false)}>
        <GuideBody onClose={() => setGuide(false)} onOpenCourts={openCourts} />
      </AppModal>
    </View>
  );
}

const S = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1.5, padding: 14 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4ade80",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "800" },
  sub: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
  },
  btnMain: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
  btnText: { fontWeight: "700", fontSize: 13 },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", flex: 1 },
  stepper: { flexDirection: "row", gap: 6, marginBottom: 16 },
  bar: { height: 5, borderRadius: 3 },
  stepCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: "#04210f", fontWeight: "900" },
  stepTitle: { fontSize: 17, fontWeight: "800", marginTop: 10 },
  stepBody: { fontSize: 14, lineHeight: 21, marginTop: 6 },
  listHead: { marginTop: 20, marginBottom: 6, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  listRow: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 8 },
  listText: { fontSize: 14, flex: 1 },
  navRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  navBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  navMain: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
});
