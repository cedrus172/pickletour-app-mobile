const roundOf = (match) => Number(match.round || 1);
const orderOf = (match) => Number(match.order || 0);

const isFinished = (match) =>
  String(match?.status || "").toLowerCase() === "finished" &&
  (match.winner === "A" || match.winner === "B");

const otherSide = (side) => side === "A" ? "B" : "A";

export function getKnockoutPodium({ final, mainMatches, thirdPlaceMatches, thirdPlaceEnabled, getTeam }) {
  if (!isFinished(final)) return [];

  const champion = getTeam(final, final.winner);
  if (!champion) return [];

  const podium = [{ rank: 1, team: champion }];
  const runnerUp = getTeam(final, otherSide(final.winner));
  if (runnerUp) podium.push({ rank: 2, team: runnerUp });

  if (thirdPlaceMatches.length || thirdPlaceEnabled) {
    const bronzeMatch = thirdPlaceMatches
      .filter(isFinished)
      .sort((a, b) => roundOf(b) - roundOf(a) || orderOf(a) - orderOf(b))[0];
    const bronze = bronzeMatch && getTeam(bronzeMatch, bronzeMatch.winner);
    if (bronze) podium.push({ rank: 3, team: bronze });
    return podium;
  }

  const semifinals = mainMatches
    .filter((match) => roundOf(match) === roundOf(final) - 1)
    .sort((a, b) => orderOf(a) - orderOf(b));
  if (semifinals.length !== 2 || !semifinals.every(isFinished)) return podium;

  for (const match of semifinals) {
    const bronze = getTeam(match, otherSide(match.winner));
    if (bronze) podium.push({ rank: 3, team: bronze });
  }
  return podium;
}
