// components/match/MatchScoreChart.tsx
// Biểu đồ diễn biến điểm (worm chart) dựng từ /api/matches/:id/score-timeline.
// Bản RN tương ứng frontend/src/screens/PickleBall/match/MatchScoreChart.jsx (web).
import React, { memo, useMemo, useState } from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";

export const TEAM_A_COLOR = "#0EA5E9";
export const TEAM_B_COLOR = "#F97316";

type Row = {
  game: number;
  kind: "serve" | "point" | "undo" | "finish";
  team?: "A" | "B";
  servingSide?: "A" | "B" | null;
  server?: number | null;
  a: number;
  b: number;
  call?: string;
};

const H = 210;
const PAD = { l: 28, r: 12, t: 30, b: 30 };
const STRIP_H = 36;
const niceStep = (max: number) => (max <= 25 ? 5 : 10);

function buildGame(rows: Row[]) {
  const pts: { team: "A" | "B"; idx: number; a: number; b: number }[] = [];
  rows.forEach((r, idx) => {
    if (r.kind === "point" && r.team) pts.push({ team: r.team, idx, a: r.a, b: r.b });
    else if (r.kind === "undo") pts.pop();
  });
  let best: any = null;
  let run: any = null;
  pts.forEach((p) => {
    if (run && run.team === p.team) {
      run.len += 1;
      run.end = p;
    } else {
      run = { team: p.team, len: 1, end: p };
    }
    if (!best || run.len >= best.len) best = { ...run };
  });
  const last = rows[rows.length - 1] || { a: 0, b: 0 };
  const maxScore = Math.max(5, ...rows.map((r) => Math.max(r.a || 0, r.b || 0)));
  let maxLead = 1;
  rows.forEach((r) => {
    maxLead = Math.max(maxLead, Math.abs((r.a || 0) - (r.b || 0)));
  });
  return { pts, best: best && best.len >= 3 ? best : null, last, maxScore, maxLead };
}

type Props = {
  timeline: Row[];
  dark: boolean;
  textPrimary: string;
  textSecondary: string;
  cardBg: string;
  tint: string;
};

function MatchScoreChart({ timeline, dark, textPrimary, textSecondary, cardBg, tint }: Props) {
  const [W, setW] = useState(0);
  const games = useMemo(
    () => [...new Set((timeline || []).map((t) => t.game))],
    [timeline],
  );
  const [picked, setPicked] = useState<number | null>(null);
  const [showCalls, setShowCalls] = useState(false);
  const game = picked != null && games.includes(picked) ? picked : games[games.length - 1];
  const rows = useMemo(
    () => (timeline || []).filter((t) => t.game === game && t.kind !== "finish"),
    [timeline, game],
  );
  const info = useMemo(() => buildGame(rows), [rows]);
  if (!games.length || !rows.length) return null;

  const grid = dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const n = rows.length;
  const step = niceStep(info.maxScore);
  const yMax = Math.ceil(info.maxScore / step) * step;
  const iw = Math.max(W - PAD.l - PAD.r, 1);
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (i / Math.max(n, 1)) * iw;
  const y = (v: number) => PAD.t + ih - (v / yMax) * ih;

  const stepPath = (key: "a" | "b") => {
    let d = `M ${x(0)} ${y(0)}`;
    let prev = 0;
    rows.forEach((r, i) => {
      const v = r[key] || 0;
      if (v !== prev) {
        d += ` H ${x(i + 1)} V ${y(v)}`;
        prev = v;
      }
    });
    return `${d} H ${x(n)}`;
  };

  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += step) yTicks.push(v);
  const xStep = n <= 30 ? 5 : n <= 80 ? 20 : 40;
  const xTicks: number[] = [];
  for (let i = 0; i <= n; i += xStep) xTicks.push(i);

  const best = info.best;
  const bestColor = best?.team === "B" ? TEAM_B_COLOR : TEAM_A_COLOR;
  const bestText = best ? `${best.team} ghi ${best.len} điểm liên tiếp` : "";
  const bestX = best ? x(best.end.idx + 1) : 0;
  const bestY = best ? y(best.team === "A" ? best.end.a : best.end.b) : 0;
  const labelW = bestText.length * 6 + 16;
  const labelX = Math.min(Math.max(bestX - labelW / 2, PAD.l), W - PAD.r - labelW);

  const mid = STRIP_H / 2;
  const scale = (mid - 3) / info.maxLead;
  const bw = iw / Math.max(n, 1);

  return (
    <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      <View style={styles.headRow}>
        <Text style={[styles.title, { color: textPrimary }]}>
          Diễn biến điểm · Ván {game} · {info.last.a}–{info.last.b}
        </Text>
        {games.length > 1 && (
          <View style={styles.tabs}>
            {games.map((g) => {
              const on = g === game;
              return (
                <TouchableOpacity
                  key={g}
                  onPress={() => setPicked(g)}
                  style={[
                    styles.tab,
                    { borderColor: on ? tint : grid, backgroundColor: on ? tint : "transparent" },
                  ]}
                >
                  <Text style={{ color: on ? "#fff" : textSecondary, fontSize: 12, fontWeight: "700" }}>
                    Ván {g}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {W > 0 && (
        <>
          <Svg width={W} height={H}>
            {yTicks.map((v) => (
              <G key={`y${v}`}>
                <Line
                  x1={PAD.l}
                  x2={W - PAD.r}
                  y1={y(v)}
                  y2={y(v)}
                  stroke={grid}
                  strokeDasharray={v ? "4 4" : undefined}
                />
                <SvgText x={PAD.l - 6} y={y(v) + 4} fontSize={10} fill={textSecondary} textAnchor="end">
                  {String(v)}
                </SvgText>
              </G>
            ))}
            {xTicks.map((i) => (
              <SvgText key={`x${i}`} x={x(i)} y={H - PAD.b + 14} fontSize={10} fill={textSecondary} textAnchor="middle">
                {String(i)}
              </SvgText>
            ))}
            <SvgText x={PAD.l + iw / 2} y={H - 4} fontSize={10} fill={textSecondary} textAnchor="middle">
              Pha bóng
            </SvgText>
            <Path d={stepPath("b")} fill="none" stroke={TEAM_B_COLOR} strokeWidth={2.5} strokeLinejoin="round" />
            <Path d={stepPath("a")} fill="none" stroke={TEAM_A_COLOR} strokeWidth={2.5} strokeLinejoin="round" />
            {info.pts.map((p) => (
              <Circle
                key={`p${p.idx}`}
                cx={x(p.idx + 1)}
                cy={y(p.team === "A" ? p.a : p.b)}
                r={3}
                fill={p.team === "B" ? TEAM_B_COLOR : TEAM_A_COLOR}
                stroke={cardBg}
                strokeWidth={1}
              />
            ))}
            {best && (
              <G>
                <Circle cx={bestX} cy={bestY} r={7} fill="none" stroke={bestColor} strokeWidth={1.5} strokeDasharray="3 2" />
                <Rect x={labelX} y={3} width={labelW} height={20} rx={10} fill={cardBg} stroke={bestColor} />
                <SvgText x={labelX + labelW / 2} y={17} fontSize={11} fontWeight="700" fill={bestColor} textAnchor="middle">
                  {bestText}
                </SvgText>
              </G>
            )}
          </Svg>

          <View style={styles.legend}>
            {[
              ["Đội A", TEAM_A_COLOR],
              ["Đội B", TEAM_B_COLOR],
            ].map(([label, color]) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendBar, { backgroundColor: color }]} />
                <Text style={{ color: textPrimary, fontSize: 12, fontWeight: "600" }}>{label}</Text>
              </View>
            ))}
          </View>

          <Text style={{ color: textSecondary, fontSize: 11, marginTop: 6 }}>
            Chênh lệch điểm theo từng pha
          </Text>
          <Svg width={W} height={STRIP_H}>
            <Line x1={PAD.l} x2={W - PAD.r} y1={mid} y2={mid} stroke={grid} />
            <SvgText x={PAD.l - 6} y={10} fontSize={9} fill={textSecondary} textAnchor="end">A</SvgText>
            <SvgText x={PAD.l - 6} y={STRIP_H - 2} fontSize={9} fill={textSecondary} textAnchor="end">B</SvgText>
            {rows.map((r, i) => {
              const d = (r.a || 0) - (r.b || 0);
              if (!d) return null;
              const h = Math.max(1.5, Math.abs(d) * scale);
              return (
                <Rect
                  key={i}
                  x={PAD.l + i * bw + bw * 0.12}
                  y={d > 0 ? mid - h : mid}
                  width={Math.max(bw * 0.76, 1)}
                  height={h}
                  fill={d > 0 ? TEAM_A_COLOR : TEAM_B_COLOR}
                  opacity={0.85}
                />
              );
            })}
          </Svg>
        </>
      )}

      <TouchableOpacity onPress={() => setShowCalls((v) => !v)} style={styles.moreBtn} activeOpacity={0.7}>
        <Text style={{ color: tint, fontWeight: "700", fontSize: 13 }}>
          {showCalls ? "Ẩn chi tiết từng pha" : "Xem chi tiết từng pha"}
        </Text>
        <MaterialIcons name={showCalls ? "expand-less" : "expand-more"} size={18} color={tint} />
      </TouchableOpacity>

      {showCalls && (
        <View>
          <Text style={{ color: textSecondary, fontSize: 11, marginBottom: 6 }}>
            Kiểu &quot;giao-nhận-tay giao&quot;. Chip đặc = đội ghi điểm; chip viền = đổi tay giao / sideout.
          </Text>
          <View style={styles.chips}>
            {rows.map((p, i) => {
              const isPoint = p.kind === "point";
              const isUndo = p.kind === "undo";
              const color = p.team === "B" ? TEAM_B_COLOR : TEAM_A_COLOR;
              const serveColor = p.servingSide === "B" ? TEAM_B_COLOR : TEAM_A_COLOR;
              return (
                <View
                  key={i}
                  style={[
                    styles.callChip,
                    isPoint
                      ? { backgroundColor: color, borderColor: color }
                      : isUndo
                        ? { backgroundColor: "#6b7280", borderColor: "#6b7280", opacity: 0.5 }
                        : { borderColor: serveColor, borderStyle: "dashed" },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: isPoint || isUndo ? "#fff" : serveColor,
                    }}
                  >
                    {p.call}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

export default memo(MatchScoreChart);

const styles = StyleSheet.create({
  headRow: { gap: 8, marginBottom: 6 },
  title: { fontSize: 15, fontWeight: "800" },
  tabs: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 18, marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendBar: { width: 16, height: 4, borderRadius: 2 },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 8,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  callChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
});
