// components/var/VarUi.tsx — thành phần dùng chung cho Highlight & VAR (theo mockup docs/mockups/highlight-var-*.png)
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import type { ThemeTokens } from "@/hooks/useThemeTokens";

export const VOLT = "#C5F433";
export const ORANGE = "#F59E0B";
export const RED = "#EF4444";

export const STEPS = ["Tải video", "Tìm bóng", "Soi chân", "Dựng video", "Nén"] as const;

/** Bước hiện tại (0–4) từ status/stage của job. */
export function stepOf(job: any): number {
  if (!job) return 0;
  if (job.status === "preparing") return 0;
  if (job.status === "finishing" || job.status === "done") return 4;
  const s = String(job.stage || "");
  if (["download", "trim", "court", "upload", ""].includes(s)) return 0;
  if (s === "detect" || s === "review" || s === "learn") return 1;
  if (s === "feet" || s === "check") return 2;
  if (s === "render") return 3;
  return 4;
}

export function etaText(job: any): string {
  if (!job) return "";
  if (job.status === "preparing") return "Đang chuyển video sang máy phân tích…";
  if (job.status === "finishing") return "Đang tải kết quả và dựng highlight…";
  if (job.status === "queued") return job.queuePos ? `Đang chờ · thứ ${job.queuePos} trong hàng` : "Đang chờ máy phân tích";
  if (job.stage === "learn") return "Máy đang tự học sân mới · thêm khoảng 30–60 phút";
  const dur = Number(job.durationSec) || 120;
  const left = Math.max(1, Math.ceil((dur * 1.6 * (1 - (Number(job.progress) || 0))) / 60));
  // Sân mới, video từ 2,5 phút: máy phân tích tự học sân ngay trong lần chạy (API 1.9+).
  const learning = job.source?.newCourt && dur >= 150 && ["download", "trim", "court", "detect", "review", ""].includes(String(job.stage || ""));
  return learning ? `Còn khoảng ${left} phút (+30–60 phút để máy học sân mới)` : `Còn khoảng ${left} phút`;
}

/** Độ tin cậy máy tự chấm (result.confidence / summary.confidence): good / check / poor. */
export function confidenceStyle(level?: string): { bg: string; color: string; label: string } | null {
  if (level === "good") return { bg: "#16A34A", color: "#fff", label: "Tin cậy tốt" };
  if (level === "check") return { bg: ORANGE, color: "#1F1300", label: "Cần xem lại" };
  if (level === "poor") return { bg: RED, color: "#fff", label: "Không đáng tin" };
  return null;
}

export function fmtDur(sec?: number | null): string {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Pill({ label, bg, color, icon }: { label: string; bg: string; color: string; icon?: any }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} /> : null}
      <Text style={{ color, fontWeight: "800", fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export function StageStepper({ job, C }: { job: any; C: ThemeTokens }) {
  const cur = stepOf(job);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      {STEPS.map((label, i) => {
        const done = i < cur;
        const on = i === cur;
        return (
          <View key={label} style={{ flex: 1, alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", width: "100%" }}>
              <View style={{ flex: 1, height: 2, backgroundColor: i === 0 ? "transparent" : i <= cur ? C.primary : C.border }} />
              <View
                style={[
                  styles.dot,
                  {
                    borderColor: done || on ? C.primary : C.border,
                    backgroundColor: done ? C.primary : on ? "rgba(18,182,243,0.25)" : "transparent",
                  },
                ]}
              >
                {done ? <Ionicons name="checkmark" size={12} color={C.onPrimary} /> : on ? <View style={[styles.inner, { backgroundColor: C.primary }]} /> : null}
              </View>
              <View style={{ flex: 1, height: 2, backgroundColor: i === STEPS.length - 1 ? "transparent" : i < cur ? C.primary : C.border }} />
            </View>
            <Text style={{ color: on ? C.text : C.sub, fontSize: 10.5, marginTop: 4, fontWeight: on ? "800" : "600" }} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Biểu đồ bậc thang diễn biến tỉ số của hai đội. */
export function ScoreChart({ rallies, C, nearName, farName }: { rallies: any[]; C: ThemeTokens; nearName: string; farName: string }) {
  const W = 300;
  const H = 120;
  const pad = 18;
  const n = Math.max(1, rallies.length);
  const maxScore = Math.max(1, ...rallies.map((r) => Math.max(r.score_after?.near || 0, r.score_after?.far || 0)));
  const x = (i: number) => pad + ((W - pad * 2) * i) / n;
  const y = (v: number) => H - pad - ((H - pad * 2) * v) / maxScore;
  const steps = (team: "near" | "far") => {
    const pts: string[] = [`${x(0)},${y(0)}`];
    let prev = 0;
    rallies.forEach((r, i) => {
      const v = r.score_after?.[team] ?? prev;
      pts.push(`${x(i + 1)},${y(prev)}`, `${x(i + 1)},${y(v)}`);
      prev = v;
    });
    return { pts: pts.join(" "), last: prev };
  };
  const a = steps("far");
  const b = steps("near");
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 14, marginBottom: 6 }}>
        <Legend color={C.primary} label={farName} C={C} />
        <Legend color={VOLT} label={nearName} C={C} />
      </View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={C.border} strokeWidth={1} />
        <Polyline points={a.pts} fill="none" stroke={C.primary} strokeWidth={2.2} />
        <Polyline points={b.pts} fill="none" stroke={VOLT} strokeWidth={2.2} />
        <SvgText x={W - pad + 2} y={y(a.last) + 4} fill={C.primary} fontSize={11} fontWeight="bold">
          {a.last}
        </SvgText>
        <SvgText x={W - pad + 2} y={y(b.last) - 2} fill={VOLT} fontSize={11} fontWeight="bold">
          {b.last}
        </SvgText>
      </Svg>
    </View>
  );
}

function Legend({ color, label, C }: { color: string; label: string; C: ThemeTokens }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: color }} />
      <Text style={{ color: C.text, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/**
 * Sân nhìn từ trên (ngang): x_m 0–6.10 (biên trái→phải theo camera), y_m 0–13.41 (cuối sân xa→gần).
 * Vẽ các điểm nảy theo thứ tự, điểm cuối tô đỏ nếu ngoài sân.
 */
export function MiniCourt({ bounces, C }: { bounces: any[]; C: ThemeTokens }) {
  const W = 320;
  const H = 150;
  const m = 14;
  const L = 13.41;
  const Wd = 6.1;
  // Xoay ngang: trục dài của sân theo chiều ngang khung.
  const px = (yM: number) => m + ((W - 2 * m) * yM) / L;
  const py = (xM: number) => m + ((H - 2 * m) * xM) / Wd;
  const kitchen = 2.13;
  const net = L / 2;
  const pts = (bounces || []).filter((b) => Number.isFinite(b.x_m) && Number.isFinite(b.y_m));
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Rect x={px(0)} y={py(0)} width={px(L) - px(0)} height={py(Wd) - py(0)} fill="#123A7A" stroke="#E5EEF8" strokeWidth={1.5} />
      <Rect x={px(net - kitchen)} y={py(0)} width={px(net + kitchen) - px(net - kitchen)} height={py(Wd) - py(0)} fill="#2C5FA8" />
      <Line x1={px(0)} y1={py(Wd / 2)} x2={px(net - kitchen)} y2={py(Wd / 2)} stroke="#E5EEF8" strokeWidth={1} />
      <Line x1={px(net + kitchen)} y1={py(Wd / 2)} x2={px(L)} y2={py(Wd / 2)} stroke="#E5EEF8" strokeWidth={1} />
      <Line x1={px(net)} y1={py(0) - 4} x2={px(net)} y2={py(Wd) + 4} stroke="#FFFFFF" strokeWidth={2.5} />
      {pts.length > 1 ? (
        <Polyline points={pts.map((b) => `${px(b.y_m)},${py(b.x_m)}`).join(" ")} fill="none" stroke="#7DD3FC" strokeWidth={1.2} />
      ) : null}
      {pts.map((b, i) => {
        const out = b.call === "out" || b.call === "net";
        const last = i === pts.length - 1;
        return (
          <React.Fragment key={i}>
            <Circle cx={px(b.y_m)} cy={py(b.x_m)} r={8} fill={out ? RED : b.call === "unsure" ? ORANGE : C.primary} stroke={last ? "#fff" : "none"} strokeWidth={1.5} />
            <SvgText x={px(b.y_m)} y={py(b.x_m) + 3.5} fill="#fff" fontSize={9} fontWeight="bold" textAnchor="middle">
              {i + 1}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export function callLabel(call?: string | null) {
  if (call === "out") return { text: "NGOÀI SÂN", color: RED };
  if (call === "in") return { text: "TRONG SÂN", color: "#22C55E" };
  if (call === "net") return { text: "BÓNG LƯỚI", color: RED };
  if (call === "unsure") return { text: "SÁT VẠCH", color: ORANGE };
  return { text: "CHƯA RÕ", color: "#64748B" };
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  inner: { width: 9, height: 9, borderRadius: 5 },
});
