/* eslint-disable react/prop-types */
// ModernMergedBracketRN.tsx
// Sơ đồ GỘP Playoff (Round Elimination / Pre-Qualifying) + Knockout trên cùng một trang:
// vòng playoff (1, 2…) nối thẳng sang knockout (vòng tiếp theo → chung kết).
// Bản RN tương ứng web frontend/src/screens/PickleBall/ModernMergedBracket.jsx.

import React, { useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import { Text } from "@/components/ui/i18nText";
import {
  ElbowConnector,
  ModernSeedCard,
  ModernRoundChip,
  MODERN_CARD_W,
  MODERN_CARD_MIN_H,
  rgba,
  type ResolveSideLabel,
} from "./ModernBracketShared";

const CARD_W = MODERN_CARD_W;
const CARD_H = MODERN_CARD_MIN_H + 8;
const COL_GAP = 60;
const SECTION_GAP = 120;
const ROW_GAP = 24;
const HEADER_H = 48;
const SEED_PAD_X = 4;

// Khoảng cách từ mép thẻ đích tới đoạn dọc của đường nối góc vuông (= giữa khe cột thường).
const ELBOW_BACK = (COL_GAP + SEED_PAD_X * 2) / 2;
const ELBOW_RADIUS = 10;
const STUB_LEN = 18;

export const PLAYOFF_ACCENT = "#06b6d4";
export const KNOCKOUT_ACCENT = "#8b5cf6";
export const FINAL_ACCENT = "#f59e0b";

export type MergedSection = {
  kind: "playoff" | "knockout";
  stage: number;
  baseRoundStart: number;
  championMatchId?: string | null;
  rounds: { title?: string; seeds: any[] }[];
};

const SOURCE_TYPES = new Set(["stageMatchLoser", "stageMatchWinner", "matchLoser", "matchWinner"]);

// Đường nối góc vuông bo tròn (kiểu sơ đồ loại trực tiếp cổ điển).
function elbowPath(x1: number, y1: number, x2: number, y2: number, midX: number) {
  const dy = y2 - y1;
  if (Math.abs(dy) < 1) return `M ${x1} ${y1} H ${x2}`;
  const dir = dy > 0 ? 1 : -1;
  const r = Math.max(0, Math.min(ELBOW_RADIUS, Math.abs(dy) / 2, midX - x1, x2 - midX));
  return (
    `M ${x1} ${y1} H ${midX - r} Q ${midX} ${y1} ${midX} ${y1 + dir * r} ` +
    `V ${y2 - dir * r} Q ${midX} ${y2} ${midX + r} ${y2} H ${x2}`
  );
}

function knockoutRoundName(seedCount: number) {
  if (seedCount <= 1) return "Chung kết";
  if (seedCount === 2) return "Bán kết";
  if (seedCount <= 4) return "Tứ kết";
  return `Vòng 1/${seedCount}`;
}

type Ref = { key: string; matchId: string; isLoser: boolean };

function sourceRefsOf(seed: any, stage: number): Ref[] {
  const m = seed?.__match;
  if (!m) return [];
  const out: Ref[] = [];
  [
    [m.seedA, m.previousA],
    [m.seedB, m.previousB],
  ].forEach(([source, prev]) => {
    const type = String(source?.type || "");
    const prevId = String(prev?._id || prev || "");
    if (!SOURCE_TYPES.has(type)) {
      if (prevId) out.push({ key: "", matchId: prevId, isLoser: false });
      return;
    }
    const round = Number(source?.ref?.round);
    const order = Number(source?.ref?.order);
    const refStage = Number(source?.ref?.stage ?? source?.ref?.stageIndex);
    const st = type.startsWith("stage") && Number.isFinite(refStage) ? refStage : stage;
    out.push({
      key: Number.isFinite(round) && Number.isFinite(order) ? `${st}:${round}:${order}` : "",
      matchId: prevId,
      isLoser: type.toLowerCase().includes("loser"),
    });
  });
  return out;
}

function buildMergedLayout(sections: MergedSection[]) {
  const byKey = new Map<string, any>();
  const byMatchId = new Map<string, any>();
  const columns: any[] = [];
  const connectors: any[] = [];
  const dividers: number[] = [];
  let x = 0;
  let maxBottom = HEADER_H + CARD_H;
  const findSource = (ref: Ref) =>
    (ref.key && byKey.get(ref.key)) || (ref.matchId && byMatchId.get(ref.matchId)) || null;

  sections.forEach((section, sectionIndex) => {
    const isPlayoff = section.kind === "playoff";
    const stage = Number(section.stage) || sectionIndex + 1;
    const rounds = section.rounds || [];
    if (sectionIndex > 0) dividers.push(x - SECTION_GAP / 2);

    rounds.forEach((round, roundIndex) => {
      const seeds = Array.isArray(round?.seeds) ? round.seeds : [];
      const isFinal = !isPlayoff && roundIndex === rounds.length - 1;
      const accent = isPlayoff ? PLAYOFF_ACCENT : isFinal ? FINAL_ACCENT : KNOCKOUT_ACCENT;
      const roundNo = (section.baseRoundStart || 1) + roundIndex;
      const title = `Vòng ${roundNo} · ${isPlayoff ? "Playoff" : knockoutRoundName(seeds.length)}`;
      const firstOfLaterSection = sectionIndex > 0 && roundIndex === 0;
      const spanH = Math.max(maxBottom - HEADER_H, seeds.length * (CARD_H + ROW_GAP));
      const pitch = firstOfLaterSection
        ? Math.max(CARD_H + ROW_GAP, spanH / Math.max(seeds.length, 1))
        : CARD_H + ROW_GAP;

      let prevBottom = -Infinity;
      const nodes = seeds.map((seed: any, seedIndex: number) => {
        const mr = Number(seed?.__match?.round ?? roundIndex + 1);
        const mo = Number(seed?.__match?.order ?? seedIndex);
        const key = `${stage}:${mr}:${mo}`;
        // Knockout từ vòng 2: nối theo vị trí chuẩn (2n, 2n+1) — tham chiếu seed có thể cũ.
        const refs: Ref[] =
          !isPlayoff && roundIndex > 0
            ? [mo * 2, mo * 2 + 1].map((o) => ({ key: `${stage}:${mr - 1}:${o}`, matchId: "", isLoser: false }))
            : sourceRefsOf(seed, stage);
        let centerY = HEADER_H + seedIndex * pitch + pitch / 2;
        if (!firstOfLaterSection && roundIndex > 0) {
          let centers = refs.map((r) => findSource(r)?.centerY).filter((v) => Number.isFinite(v));
          if (!centers.length) {
            centers = [`${stage}:${mr - 1}:${mo * 2}`, `${stage}:${mr - 1}:${mo * 2 + 1}`]
              .map((k) => byKey.get(k)?.centerY)
              .filter((v) => Number.isFinite(v));
          }
          if (centers.length) centerY = centers.reduce((s: number, v: number) => s + v, 0) / centers.length;
        }
        const y = Math.max(HEADER_H, centerY - CARD_H / 2, prevBottom + ROW_GAP);
        prevBottom = y + CARD_H;
        const node = {
          key,
          seed,
          refs,
          order: seedIndex,
          x,
          y,
          centerY: y + CARD_H / 2,
          accent,
          roundIndex,
          colIndex: columns.length,
          baseRoundStart: section.baseRoundStart || 1,
          championMatchId: section.championMatchId || null,
        };
        byKey.set(key, node);
        const mid = String(seed?.__match?._id || "");
        if (mid) byMatchId.set(mid, node);
        maxBottom = Math.max(maxBottom, y + CARD_H);
        return node;
      });

      columns.push({ key: `${stage}:${roundIndex}`, title, accent, isFinal, x, nodes });
      x += CARD_W + (roundIndex === rounds.length - 1 ? SECTION_GAP : COL_GAP);
    });
  });

  // Gom đường nối theo cặp cột (nguồn → đích). Nhóm "gọn" = hai cột liền nhau và các chùm
  // (mỗi trận đích + các trận nguồn của nó) không chồng lấn theo chiều dọc → vẽ góc vuông bo tròn.
  // Nhóm còn lại (nhảy cột, hoặc đội thắng playoff đổ rải rác sang knockout) nếu vẽ đủ sẽ đan
  // chéo nhau rất rối → chỉ vẽ mẩu nối ngắn ở hai đầu, đường đầy đủ hiện khi bật công tắc.
  const groups = new Map<string, { source: any; target: any; isLoser: boolean }[]>();
  columns.forEach((column) => {
    column.nodes.forEach((target: any) => {
      target.refs.forEach((ref: Ref) => {
        const source = findSource(ref);
        if (!source || source.x >= target.x) return;
        const groupKey = `${source.colIndex}->${target.colIndex}`;
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey)!.push({ source, target, isLoser: !!ref.isLoser });
      });
    });
  });

  groups.forEach((links) => {
    let tidy = links[0].target.colIndex === links[0].source.colIndex + 1;
    if (tidy) {
      const spans = new Map<string, { min: number; max: number }>();
      links.forEach(({ source, target }) => {
        const span = spans.get(target.key) || { min: target.centerY, max: target.centerY };
        span.min = Math.min(span.min, source.centerY);
        span.max = Math.max(span.max, source.centerY);
        spans.set(target.key, span);
      });
      const sorted = [...spans.values()].sort((p, q) => p.min - q.min);
      tidy = sorted.every((span, i) => i === 0 || span.min > sorted[i - 1].max + 4);
    }
    links.forEach(({ source, target, isLoser }) => {
      const startX = source.x + CARD_W - SEED_PAD_X;
      const endX = target.x + SEED_PAD_X;
      const midX = (startX + endX) / 2;
      connectors.push({
        key: `${source.key}->${target.key}`,
        jump: !tidy,
        d: tidy
          ? elbowPath(startX, source.centerY, endX, target.centerY, endX - ELBOW_BACK)
          : `M ${startX} ${source.centerY} C ${midX} ${source.centerY}, ${midX} ${target.centerY}, ${endX} ${target.centerY}`,
        isLoser,
        x1: startX,
        y1: source.centerY,
        x2: endX,
        y2: target.centerY,
        fromColor: source.accent,
        toColor: target.accent,
      });
    });
  });

  return {
    columns,
    connectors,
    dividers,
    width: Math.max(CARD_W, x - SECTION_GAP),
    height: maxBottom + ROW_GAP,
  };
}


export default function ModernMergedBracketRN({
  sections,
  onOpenMatch,
  resolveSideLabel,
  isDark,
  zoom = 1,
}: {
  sections: MergedSection[];
  onOpenMatch?: (m: any) => void;
  resolveSideLabel?: ResolveSideLabel;
  isDark: boolean;
  zoom?: number;
}) {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const layout = useMemo(() => buildMergedLayout(sections || []), [sections]);
  const scrollRef = useRef<ScrollView>(null);
  const [showJumps, setShowJumps] = useState(false);
  const hasJumps = useMemo(() => layout.connectors.some((c: any) => c.jump), [layout]);
  if (!layout.columns.length) {
    return (
      <View style={{ padding: 20, alignItems: "center" }}>
        <Text style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Chưa có dữ liệu.</Text>
      </View>
    );
  }
  const loserColor = "#f59e0b";
  const textSub = isDark ? "#cbd5e1" : "#64748b";
  const gid = (k: string) => `mg-${k.replace(/[^a-zA-Z0-9]/g, "_")}`;

  return (
    <View>
      {/* Thanh chọn vòng: chạm để cuộn tới vòng đó */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {layout.columns.map((col: any) => (
          <Pressable
            key={`p-${col.key}`}
            onPress={() => scrollRef.current?.scrollTo({ x: Math.max(0, col.x * safeZoom), animated: true })}
            style={[styles.pill, { borderColor: col.accent, backgroundColor: rgba(col.accent, isDark ? 0.14 : 0.1) }]}
          >
            <Text style={{ color: col.accent, fontWeight: "800", fontSize: 12 }}>{col.title}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.legendRow}>
        {[
          ["Playoff", PLAYOFF_ACCENT, false],
          ["Knockout", KNOCKOUT_ACCENT, false],
          ["Thua xuống nhánh", loserColor, true],
        ].map(([label, color, dashed]) => (
          <View key={String(label)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View
              style={{
                width: 16,
                height: 0,
                borderTopWidth: 2,
                borderTopColor: String(color),
                borderStyle: dashed ? "dashed" : "solid",
              }}
            />
            <Text style={{ fontSize: 10, color: textSub }}>{String(label)}</Text>
          </View>
        ))}
        {hasJumps ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: showJumps }}
            hitSlop={8}
            onPress={() => setShowJumps((v) => !v)}
            style={[
              styles.jumpToggle,
              { borderColor: rgba(KNOCKOUT_ACCENT, 0.5), backgroundColor: showJumps ? KNOCKOUT_ACCENT : rgba(KNOCKOUT_ACCENT, 0.1) },
            ]}
          >
            <Text style={{ fontSize: 10.5, fontWeight: "800", color: showJumps ? "#fff" : KNOCKOUT_ACCENT }}>
              {showJumps ? "Ẩn đường nối chéo" : "Hiện đường nối chéo"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8 }}
      >
        <View
          style={{
            width: Math.ceil((layout.width + 24) * safeZoom),
            height: Math.ceil((layout.height + 24) * safeZoom),
          }}
        >
          <View
            style={{
              width: layout.width + 24,
              minHeight: layout.height + 24,
              position: "relative",
              transform: [{ scale: safeZoom }],
              transformOrigin: "top left",
            }}
          >
            {Platform.OS === "android" ? (
              <View
                pointerEvents="none"
                style={{ position: "absolute", left: 0, top: 0, width: layout.width, height: layout.height }}
              >
                {layout.dividers.map((dx: number) => (
                  <View
                    key={`d-${dx}`}
                    style={[
                      {
                        position: "absolute",
                        left: dx,
                        top: HEADER_H - 6,
                        width: 0,
                        height: Math.max(0, layout.height - (HEADER_H - 6)),
                        borderLeftWidth: 1.5,
                        borderStyle: "dashed",
                        borderColor: isDark ? "rgba(203,213,225,0.45)" : "rgba(100,116,139,0.45)",
                      },
                    ]}
                  />
                ))}
                {layout.connectors.map((c: any) => {
                  const color = c.isLoser ? loserColor : c.toColor;
                  if (c.jump && !showJumps) {
                    // Đường nối chéo thu gọn: mẩu ngắn đi ra ở trận nguồn, chấm + mẩu ngắn đi vào ở trận đích.
                    const outColor = c.isLoser ? loserColor : c.fromColor;
                    return (
                      <React.Fragment key={c.key}>
                        <View style={[styles.stub, { left: c.x1, top: c.y1 - 1, backgroundColor: outColor }]} />
                        <View style={[styles.stubDot, { left: c.x1 + STUB_LEN - 3, top: c.y1 - 3, backgroundColor: outColor }]} />
                        <View style={[styles.stub, { left: c.x2 - STUB_LEN, top: c.y2 - 1, backgroundColor: color }]} />
                        <View style={[styles.stubDot, { left: c.x2 - STUB_LEN - 3, top: c.y2 - 3, backgroundColor: color }]} />
                      </React.Fragment>
                    );
                  }
                  // Khe giữa hai phần (playoff → knockout) rộng hơn khe cột thường: kéo một đoạn ngang
                  // tới sát cột đích rồi mới bẻ góc, để đoạn dọc không đè lên vạch chia phần.
                  const elbowStart = Math.max(c.x1, c.x2 - ELBOW_BACK * 2);
                  const lineColor = c.jump ? rgba(color, 0.4) : color;
                  return (
                    <React.Fragment key={c.key}>
                      {!c.jump && elbowStart > c.x1 ? (
                        <View
                          style={[styles.stub, { left: c.x1, top: c.y1 - 1, width: elbowStart - c.x1, backgroundColor: lineColor }]}
                        />
                      ) : null}
                      <ElbowConnector
                        x1={c.jump ? c.x1 : elbowStart}
                        y1={c.y1}
                        x2={c.x2}
                        y2={c.y2}
                        color={lineColor}
                        dashed={!!c.isLoser}
                      />
                    </React.Fragment>
                  );
                })}
              </View>
            ) : (
            <Svg
              width={layout.width}
              height={layout.height}
              style={{ position: "absolute", left: 0, top: 0 }}
              pointerEvents="none"
            >
              <Defs>
                {layout.connectors
                  .filter((c: any) => !c.isLoser)
                  .map((c: any) => (
                    <LinearGradient
                      key={`g-${c.key}`}
                      id={gid(c.key)}
                      x1={c.x1}
                      y1={c.y1}
                      x2={c.x2}
                      y2={c.y2}
                      gradientUnits="userSpaceOnUse"
                    >
                      <Stop offset="0%" stopColor={c.fromColor} stopOpacity={0.6} />
                      <Stop offset="100%" stopColor={c.toColor} stopOpacity={0.9} />
                    </LinearGradient>
                  ))}
              </Defs>
              {layout.dividers.map((dx: number) => (
                <Line
                  key={`d-${dx}`}
                  x1={dx}
                  x2={dx}
                  y1={HEADER_H - 6}
                  y2={layout.height}
                  stroke={isDark ? "rgba(203,213,225,0.45)" : "rgba(100,116,139,0.45)"}
                  strokeWidth={1.5}
                  strokeDasharray="6 6"
                />
              ))}
              {layout.connectors.map((c: any) => {
                if (!c.jump) {
                  return (
                    <Path
                      key={c.key}
                      d={c.d}
                      stroke={c.isLoser ? loserColor : `url(#${gid(c.key)})`}
                      strokeOpacity={c.isLoser ? 0.7 : 1}
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={c.isLoser ? "6 5" : ""}
                      fill="none"
                    />
                  );
                }
                // Đường nối chéo: mẩu ngắn ở hai đầu (mũi tên đi ra, chấm đi vào); đường đầy đủ chỉ
                // vẽ mờ khi bật công tắc "Hiện đường nối chéo".
                const outColor = c.isLoser ? loserColor : c.fromColor;
                const inColor = c.isLoser ? loserColor : c.toColor;
                const tipX = c.x1 + STUB_LEN;
                return (
                  <React.Fragment key={c.key}>
                    {showJumps ? (
                      <Path
                        d={c.d}
                        stroke={c.isLoser ? loserColor : `url(#${gid(c.key)})`}
                        strokeOpacity={0.45}
                        strokeWidth={1.4}
                        strokeLinecap="round"
                        strokeDasharray={c.isLoser ? "5 5" : ""}
                        fill="none"
                      />
                    ) : null}
                    <Path
                      d={`M ${c.x1} ${c.y1} H ${tipX} M ${tipX - 5} ${c.y1 - 4.5} L ${tipX} ${c.y1} L ${tipX - 5} ${c.y1 + 4.5}`}
                      stroke={outColor}
                      strokeOpacity={0.85}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <Path
                      d={`M ${c.x2 - STUB_LEN} ${c.y2} H ${c.x2}`}
                      stroke={inColor}
                      strokeOpacity={0.85}
                      strokeWidth={2}
                      strokeLinecap="round"
                      fill="none"
                    />
                    <Circle cx={c.x2 - STUB_LEN} cy={c.y2} r={3} fill={inColor} fillOpacity={0.85} />
                  </React.Fragment>
                );
              })}
            </Svg>
            )}

            {layout.dividers.map((dx: number) => (
              <View key={`dl-${dx}`} style={[styles.divLabel, { left: dx - 55 }]}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: KNOCKOUT_ACCENT,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: rgba(KNOCKOUT_ACCENT, 0.6),
                    backgroundColor: isDark ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.92)",
                  }}
                >
                  Vào Knockout
                </Text>
              </View>
            ))}

            {layout.columns.map((col: any) => (
              <View
                key={`h-${col.key}`}
                style={{ position: "absolute", left: col.x, top: 4, width: CARD_W, alignItems: "center", zIndex: 2 }}
              >
                <ModernRoundChip title={col.title} count={col.nodes.length} accent={col.accent} isFinal={col.isFinal} />
              </View>
            ))}

            {layout.columns.map((col: any) =>
              col.nodes.map((node: any) => (
                <View
                  key={node.key}
                  style={{ position: "absolute", left: node.x, top: node.y, width: CARD_W, zIndex: 1 }}
                >
                  <ModernSeedCard
                    seed={{ __round: node.roundIndex + 1, __order: node.order, ...node.seed }}
                    onOpenMatch={onOpenMatch}
                    championMatchId={node.championMatchId}
                    resolveSideLabel={resolveSideLabel}
                    baseRoundStart={node.baseRoundStart}
                    accent={node.accent}
                    isDark={isDark}
                    cardWidth={CARD_W}
                    nodeKey={node.key}
                  />
                </View>
              )),
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pills: { gap: 8, paddingHorizontal: 4, paddingVertical: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 14, rowGap: 6, paddingHorizontal: 6, paddingBottom: 4 },
  jumpToggle: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  stub: { position: "absolute", width: STUB_LEN, height: 2, borderRadius: 1 },
  stubDot: { position: "absolute", width: 6, height: 6, borderRadius: 3 },
  divLabel: { position: "absolute", top: 8, width: 110, alignItems: "center", zIndex: 3 },
});
