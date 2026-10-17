// Bốc thăm phá hoà điểm vòng bảng (mobile): xếp thứ tự các cặp BẰNG ĐIỂM.
// 2 cách: "Bốc thăm" (random, hiệu ứng quay số lần lượt ra hạng) hoặc "Gán tay".
import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";

type Team = { id: string; name: string };

export default function TiebreakDrawSheetRN({
  visible,
  onClose,
  groupKey,
  pts,
  teams = [],
  onConfirm,
  saving,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  groupKey?: string;
  pts?: number;
  teams: Team[];
  onConfirm: (orderIds: string[], method: "online" | "manual") => void;
  saving?: boolean;
  isDark?: boolean;
}) {
  const [mode, setMode] = useState<"random" | "manual">("random");
  const [order, setOrder] = useState<Team[]>(teams); // manual
  const [revealed, setRevealed] = useState<Team[]>([]); // random result
  const [remaining, setRemaining] = useState<Team[]>(teams);
  const [flash, setFlash] = useState<string | null>(null); // id đang nhấp nháy
  const [spinning, setSpinning] = useState(false);
  const timers = useRef<any[]>([]);

  const clearTimers = () => {
    timers.current.forEach((tt) => clearTimeout(tt));
    timers.current = [];
  };
  const reset = () => {
    clearTimers();
    setOrder(teams);
    setRevealed([]);
    setRemaining(teams);
    setFlash(null);
    setSpinning(false);
  };
  useEffect(() => {
    if (visible) reset();
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, groupKey]);

  const C = {
    bg: isDark ? "#0b1220" : "#fff",
    card: isDark ? "#1e293b" : "#f1f5f9",
    text: isDark ? "#e2e8f0" : "#0f172a",
    sub: isDark ? "#94a3b8" : "#64748b",
    primary: "#2563eb",
    amber: "#f59e0b",
  };

  const spinOne = () => {
    if (spinning || remaining.length === 0) return;
    if (remaining.length === 1) {
      const last = remaining[0];
      setRevealed((r) => [...r, last]);
      setRemaining([]);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
      return;
    }
    setSpinning(true);
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    // nhấp nháy ngẫu nhiên ~1.2s rồi chốt pick
    let ticks = 14;
    const tick = () => {
      const rnd = remaining[Math.floor(Math.random() * remaining.length)];
      setFlash(rnd.id);
      try { Haptics.selectionAsync(); } catch (e) {}
      ticks -= 1;
      if (ticks > 0) {
        timers.current.push(setTimeout(tick, 60 + (14 - ticks) * 8));
      } else {
        setFlash(pick.id);
        timers.current.push(
          setTimeout(() => {
            setRevealed((r) => [...r, pick]);
            setRemaining((rm) => rm.filter((x) => x.id !== pick.id));
            setFlash(null);
            setSpinning(false);
            try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
          }, 350)
        );
      }
    };
    tick();
  };

  const move = (idx: number, dir: number) => {
    setOrder((o) => {
      const a = [...o];
      const j = idx + dir;
      if (j < 0 || j >= a.length) return a;
      [a[idx], a[j]] = [a[j], a[idx]];
      return a;
    });
  };

  const randomDone = mode === "random" && revealed.length === teams.length && teams.length > 0;
  const canSave = mode === "random" ? randomDone : order.length === teams.length;
  const confirm = () => {
    const finalOrder = mode === "random" ? revealed : order;
    if (finalOrder.length !== teams.length) return;
    onConfirm(finalOrder.map((x) => x.id), mode === "random" ? "online" : "manual");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: C.bg }]}>
          <Text style={[styles.title, { color: C.text }]}>
            🎲 Bốc thăm phân hạng — Bảng {groupKey}
          </Text>
          <Text style={{ color: C.sub, marginBottom: 10 }}>
            {teams.length} cặp bằng {Number.isFinite(pts) ? pts : ""} điểm — bốc thăm xếp thứ tự.
          </Text>

          <View style={styles.tabs}>
            {(["random", "manual"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.tab, { borderColor: C.primary, backgroundColor: mode === m ? C.primary : "transparent" }]}
              >
                <Text style={{ color: mode === m ? "#fff" : C.primary, fontWeight: "700" }}>
                  {m === "random" ? "Bốc thăm" : "Gán tay"}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView style={{ maxHeight: 320 }}>
            {mode === "random" ? (
              <>
                {remaining.length > 0 && (
                  <View style={{ marginBottom: 10 }}>
                    {remaining.map((tt) => (
                      <View
                        key={tt.id}
                        style={[
                          styles.row,
                          {
                            backgroundColor: flash === tt.id ? C.amber : C.card,
                          },
                        ]}
                      >
                        <Text style={{ color: flash === tt.id ? "#fff" : C.text, fontWeight: "700" }}>{tt.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {revealed.map((tt, i) => (
                  <View key={tt.id} style={[styles.row, { backgroundColor: C.card }]}>
                    <View style={[styles.rankChip, { backgroundColor: C.primary }]}>
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Hạng {i + 1}</Text>
                    </View>
                    <Text style={{ color: C.text, fontWeight: "700", flex: 1 }}>{tt.name}</Text>
                  </View>
                ))}
              </>
            ) : (
              order.map((tt, i) => (
                <View key={tt.id} style={[styles.row, { backgroundColor: C.card }]}>
                  <View style={[styles.rankChip, { backgroundColor: C.sub }]}>
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Hạng {i + 1}</Text>
                  </View>
                  <Text style={{ color: C.text, fontWeight: "700", flex: 1 }}>{tt.name}</Text>
                  <Pressable onPress={() => move(i, -1)} disabled={i === 0} style={styles.arrow}>
                    <Text style={{ color: i === 0 ? C.sub : C.text, fontSize: 18 }}>▲</Text>
                  </Pressable>
                  <Pressable onPress={() => move(i, 1)} disabled={i === order.length - 1} style={styles.arrow}>
                    <Text style={{ color: i === order.length - 1 ? C.sub : C.text, fontSize: 18 }}>▼</Text>
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>

          {mode === "random" && !randomDone && (
            <Pressable
              onPress={spinOne}
              disabled={spinning}
              style={[styles.bigBtn, { backgroundColor: C.primary, opacity: spinning ? 0.6 : 1 }]}
            >
              <Text style={styles.bigBtnText}>
                {spinning ? "Đang quay…" : `🎲 Quay hạng ${revealed.length + 1}`}
              </Text>
            </Pressable>
          )}

          <View style={styles.footer}>
            {mode === "random" && revealed.length > 0 && !randomDone && (
              <Pressable onPress={reset} style={styles.textBtn}>
                <Text style={{ color: C.sub, fontWeight: "700" }}>Làm lại</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable onPress={onClose} style={styles.textBtn}>
              <Text style={{ color: C.sub, fontWeight: "700" }}>Đóng</Text>
            </Pressable>
            <Pressable
              onPress={confirm}
              disabled={!canSave || saving}
              style={[styles.saveBtn, { backgroundColor: C.primary, opacity: !canSave || saving ? 0.5 : 1 }]}
            >
              <Text style={styles.bigBtnText}>{saving ? "Đang lưu…" : "Lưu kết quả"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 28 },
  title: { fontSize: 17, fontWeight: "800" },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginBottom: 6 },
  rankChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  arrow: { paddingHorizontal: 8, paddingVertical: 2 },
  bigBtn: { marginTop: 10, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  bigBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  footer: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  textBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
});
