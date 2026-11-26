// Thẻ "Tập huấn" nổi trên màn chấm điểm — chỉ hiện khi trận thuộc giải tập huấn trọng tài
// (match.tournament.refereeTraining.enabled). Tự dò bước theo trạng thái trận; trọng tài có thể
// thu gọn thành nút nhỏ, xem lại bước trước/sau.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import {
  isTrainingMatch,
  observeTraining,
  trainingSnapshot,
  trainingSteps,
} from "@/utils/refereeTrainingSteps";

type Props = {
  match: any;
  /** Khoảng cách từ mép trên (tránh thanh tiêu đề của màn chấm). */
  top?: number;
};

export default function RefereeTrainingCoach({ match, top = 8 }: Props) {
  const enabled = isTrainingMatch(match);
  const snap = useMemo(() => trainingSnapshot(match), [match]);
  const memoRef = useRef<any>({});
  const [memo, setMemo] = useState<any>({});
  const [ack, setAck] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(true);
  const [viewIdx, setViewIdx] = useState<number | null>(null);
  const matchId = String(match?._id || "");

  // Trận khác → làm lại từ đầu.
  useEffect(() => {
    memoRef.current = {};
    setMemo({});
    setAck({});
    setViewIdx(null);
    setOpen(true);
  }, [matchId]);

  useEffect(() => {
    const next = observeTraining(memoRef.current, snap);
    memoRef.current = next;
    setMemo(next);
  }, [snap.total, snap.serveKey, snap.status]);

  const { steps, current, doneCount } = useMemo(() => trainingSteps(snap, memo, ack), [snap, memo, ack]);

  // Bước tự chuyển khi trọng tài thao tác đúng → bỏ chế độ xem tay.
  const lastCurrent = useRef(current);
  useEffect(() => {
    if (lastCurrent.current !== current) {
      lastCurrent.current = current;
      setViewIdx(null);
      setOpen(true);
    }
  }, [current]);

  if (!enabled) return null;

  const idx = viewIdx ?? current;
  const step = steps[idx];

  if (!open) {
    return (
      <View pointerEvents="box-none" style={[S.wrap, { top }]}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Mở hướng dẫn tập huấn"
          style={({ pressed }) => [S.pill, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="school" size={14} color="#04210f" />
          <Text style={S.pillText} numberOfLines={1}>
            Tập huấn · Bước {current + 1}/{steps.length}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={[S.wrap, { top }]}>
      <View style={S.card}>
        <View style={S.headRow}>
          <View style={S.badge}>
            <Ionicons name="school" size={12} color="#04210f" />
            <Text style={S.badgeText}>TẬP HUẤN</Text>
          </View>
          <Text style={S.counter}>
            Bước {idx + 1}/{steps.length}
            {step?.done ? "  ✓" : ""}
          </Text>
          <Pressable hitSlop={10} onPress={() => setOpen(false)} accessibilityLabel="Thu gọn hướng dẫn">
            <Ionicons name="chevron-up" size={18} color="#cbd5e1" />
          </Pressable>
        </View>

        <Text style={S.title}>{step?.title}</Text>
        <Text style={S.body}>{step?.body}</Text>

        <View style={S.dots}>
          {steps.map((s, i) => (
            <Pressable key={s.key} hitSlop={4} onPress={() => setViewIdx(i)}>
              <View
                style={[
                  S.dot,
                  s.done && S.dotDone,
                  i === idx && S.dotActive,
                ]}
              />
            </Pressable>
          ))}
          <Text style={S.progress}>
            {doneCount}/{steps.length}
          </Text>
        </View>

        <View style={S.actions}>
          <Pressable
            disabled={idx <= 0}
            onPress={() => setViewIdx(Math.max(0, idx - 1))}
            style={[S.btnGhost, idx <= 0 && { opacity: 0.4 }]}
          >
            <Ionicons name="chevron-back" size={16} color="#e2e8f0" />
          </Pressable>
          {step?.manual && !step.done ? (
            <Pressable
              onPress={() => {
                setAck((a) => ({ ...a, [step.key]: true }));
                setViewIdx(null);
              }}
              style={({ pressed }) => [S.btnMain, pressed && { opacity: 0.85 }]}
            >
              <Text style={S.btnMainText}>Đã hiểu</Text>
            </Pressable>
          ) : viewIdx != null && viewIdx !== current ? (
            <Pressable onPress={() => setViewIdx(null)} style={S.btnMain}>
              <Text style={S.btnMainText}>Về bước hiện tại</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Pressable
            disabled={idx >= steps.length - 1}
            onPress={() => setViewIdx(Math.min(steps.length - 1, idx + 1))}
            style={[S.btnGhost, idx >= steps.length - 1 && { opacity: 0.4 }]}
          >
            <Ionicons name="chevron-forward" size={16} color="#e2e8f0" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 80,
    paddingHorizontal: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#4ade80",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  pillText: { color: "#04210f", fontWeight: "800", fontSize: 12 },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "rgba(6,20,40,0.96)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.55)",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  headRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#4ade80",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: "#04210f", fontWeight: "900", fontSize: 10, letterSpacing: 0.5 },
  counter: { flex: 1, color: "#94a3b8", fontSize: 12, fontWeight: "700" },
  title: { color: "#f8fafc", fontSize: 15, fontWeight: "800", marginTop: 8 },
  body: { color: "#cbd5e1", fontSize: 13, lineHeight: 18, marginTop: 4 },
  dots: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#334155" },
  dotDone: { backgroundColor: "#22c55e" },
  dotActive: { width: 18, backgroundColor: "#4ade80" },
  progress: { marginLeft: "auto", color: "#64748b", fontSize: 11, fontWeight: "700" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  btnGhost: {
    width: 36,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.18)",
  },
  btnMain: {
    flex: 1,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e",
  },
  btnMainText: { color: "#04210f", fontWeight: "800", fontSize: 13 },
});
