import { StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/i18nText";
import { PlayerAvatar, type BracketPlayer } from "./ModernBracketShared";

export type PodiumTeam = { name: string; players: BracketPlayer[] };
type Placement = { rank: number; team: PodiumTeam };

const medals: Record<number, { label: string; light: string; metal: string; shade: string; height: number }> = {
  1: { label: "Vô địch", light: "#ffe5a0", metal: "#e5ad43", shade: "#8f5b22", height: 46 },
  2: { label: "Hạng nhì", light: "#e2edf8", metal: "#afc4db", shade: "#5e718d", height: 34 },
  3: { label: "Hạng ba", light: "#ffd8b0", metal: "#cc8d5e", shade: "#814d33", height: 29 },
};

export default function KnockoutPodium({ placements }: { placements: Placement[] }) {
  const { width, height } = useWindowDimensions();
  if (!placements.length) return null;

  const wide = width >= 760 && width > height;
  const bronzeCount = placements.filter(({ rank }) => rank === 3).length;
  const champion = placements.filter(({ rank }) => rank === 1);
  const runnerUp = placements.filter(({ rank }) => rank === 2);
  const bronze = placements.filter(({ rank }) => rank === 3);
  const rows = wide
    ? [[...runnerUp, ...champion, ...bronze]]
    : bronzeCount === 1
      ? [champion, [...runnerUp, ...bronze]]
      : [champion, runnerUp, bronze];

  return (
    <LinearGradient colors={["#173555", "#0a1429", "#122440"]} style={styles.stage}>
      <Text accessibilityRole="header" style={styles.title}>Bục trao giải</Text>
      <View style={styles.teams}>
        {rows.filter((row) => row.length).map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map(({ rank, team }, index) => {
              const medal = medals[rank];
              const label = rank === 3 && bronzeCount === 2 ? "Đồng hạng ba" : medal.label;
              const size = rank === 1 ? 50 : 40;
              return (
                <View key={index} style={[styles.team, !wide && row.length === 1 && styles.singleTeam]}>
                  <View style={[styles.label, { borderColor: medal.metal, backgroundColor: `${medal.shade}48` }]}>
                    <Text style={[styles.labelText, { color: medal.light }]}>{label}</Text>
                  </View>
                  {team.players.length > 0 ? (
                    <>
                      <View style={styles.avatars}>
                        {team.players.map((player, playerIndex) => (
                          <PlayerAvatar key={playerIndex} player={player} size={size} borderColor={medal.metal} />
                        ))}
                      </View>
                      {team.players.map((player, playerIndex) => (
                        <Text key={playerIndex} style={styles.name}>{player.name}</Text>
                      ))}
                    </>
                  ) : (
                    <Text style={styles.name}>{team.name}</Text>
                  )}
                  <LinearGradient
                    colors={["#293b55", "#131c2d", "#24334b"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0.4 }}
                    style={[styles.step, { height: medal.height, borderColor: medal.shade }]}
                  >
                    <LinearGradient
                      colors={[medal.shade, medal.light, medal.metal, medal.light, medal.shade]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.stepEdge}
                    />
                    <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.numberWrap}>
                      <Text style={[styles.number, { color: medal.light, fontSize: rank === 1 ? 26 : 17 }]}>
                        {rank}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  stage: {
    borderWidth: 1, borderColor: "#3b5b80", borderRadius: 12,
    marginBottom: 12, padding: 10,
  },
  title: {
    textAlign: "center", color: "#eef6ff", fontSize: 19, fontWeight: "800", marginBottom: 8,
  },
  teams: { gap: 8 },
  row: {
    flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 8,
  },
  team: {
    minWidth: 0, flexBasis: 0, flexGrow: 1, alignItems: "center",
  },
  singleTeam: { maxWidth: "70%" },
  label: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 5,
    maxWidth: "100%",
  },
  labelText: { fontSize: 11, fontWeight: "800", textAlign: "center" },
  avatars: { flexDirection: "row", justifyContent: "center", gap: 5, marginBottom: 3 },
  name: {
    alignSelf: "stretch", color: "#eff6ff", textAlign: "center", fontSize: 12, fontWeight: "700",
  },
  step: {
    overflow: "hidden", marginTop: 5, borderWidth: 1, borderRadius: 4, width: "100%",
  },
  stepEdge: { height: 6 },
  numberWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  number: {
    fontWeight: "900", includeFontPadding: false, textShadowColor: "#030711",
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3,
  },
});
