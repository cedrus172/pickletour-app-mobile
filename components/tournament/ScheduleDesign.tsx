import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/i18nText";
import OverviewHeroArt from "./OverviewHeroArt";
import { sk } from "@/hooks/uiVersion";

// V3: khối hero giữ chữ trắng trên gradient xanh dương; icon nhấn chuyển xanh chanh cho nổi.
const HERO_ICON = sk("#12C8EC", "#C5F433");

/** Tách đúng các cặp điểm đang hiển thị, không cộng điểm giữa các game. */
export function scheduleScoreColumns(score: string) {
  const games = score.trim().split(/\s*,\s*/);
  const pairs = games.map((game) => game.match(/^(\d+)\s*[-–:]\s*(\d+)$/));
  if (!score.trim() || pairs.some((pair) => !pair)) return null;
  return { A: pairs.map((pair) => pair![1]), B: pairs.map((pair) => pair![2]) };
}

export function ScheduleMatchTeams({ teamA, teamB, score, winnerSide }: {
  teamA: string; teamB: string; score: string; winnerSide: string | null;
}) {
  const columns = scheduleScoreColumns(score);
  return <View testID="schedule-match-teams" style={S.teams}>
    {(["A", "B"] as const).map((side) => {
      const won = winnerSide === side;
      return <View key={side} style={S.teamRow}>
        <View style={S.winner}>
          {won ? <Ionicons name="checkmark-circle" color={sk("#12C8EC", "#1466F2")} size={20} /> : null}
        </View>
        <Text style={[S.teamName, won && S.winnerText]}>{side === "A" ? teamA : teamB}</Text>
        {columns ? <View style={S.gameScores}>
          {columns[side].map((value, i) => <Text key={i} style={[S.score, won && S.winnerText]}>{value}</Text>)}
        </View> : null}
      </View>;
    })}
    {!columns && <Text style={S.rawScore}>{score || "vs"}</Text>}
  </View>;
}

export function ScheduleHero({ name, matchCount, courtCount, liveCount }: {
  name?: string; matchCount: number; courtCount: number; liveCount: number;
}) {
  return <LinearGradient testID="tournament-schedule-hero" colors={sk(["#093453", "#041329"], ["#1E73F5", "#0B3FB8"])} style={S.hero}>
    <OverviewHeroArt />
    <Text style={S.heroTitle}>{name || "Lịch thi đấu"}</Text>
    <View style={S.summary}>
      {[
        { icon: <Ionicons name="calendar-outline" size={23} color={HERO_ICON} />, value: matchCount, label: "trận" },
        { icon: <MaterialCommunityIcons name="stadium" size={23} color={HERO_ICON} />, value: courtCount, label: "sân" },
        { icon: <Ionicons name="radio-outline" size={23} color={HERO_ICON} />, value: liveCount, label: "Live" },
      ].map((item) => <View key={item.label} style={S.stat}>
        {item.icon}<View><Text style={S.statValue}>{item.value}</Text><Text style={S.statLabel}>{item.label}</Text></View>
      </View>)}
    </View>
  </LinearGradient>;
}

const S = StyleSheet.create({
  hero: { borderWidth: 1, borderColor: sk("#174A6C", "rgba(255,255,255,0.18)"), borderRadius: 18, padding: 16, overflow: "hidden", gap: 18 },
  heroTitle: { fontSize: 23, lineHeight: 31, fontWeight: "900", color: "#F0F6FF", textTransform: "uppercase" },
  summary: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  stat: { flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  statValue: { fontSize: 22, fontWeight: "800", color: "#F0F6FF" },
  statLabel: { fontSize: 12, color: sk("#94B3D0", "rgba(255,255,255,0.82)") },
  teams: { gap: 9, paddingVertical: 6 },
  teamRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  winner: { width: 20 },
  teamName: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 22, fontWeight: "700", color: sk("#A9C2D9", "#243450") },
  gameScores: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8, maxWidth: "44%" },
  score: { minWidth: 24, textAlign: "right", fontSize: 23, lineHeight: 29, fontWeight: "900", color: sk("#A9C2D9", "#243450"), fontVariant: ["tabular-nums"] },
  winnerText: { color: sk("#12C8EC", "#1466F2") },
  rawScore: { color: sk("#F0F6FF", "#0B1B3A"), fontWeight: "800", fontSize: 16, textAlign: "right" },
});
