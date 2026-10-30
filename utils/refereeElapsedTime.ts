/** Match duration uses match timestamps; it never displays local wall-clock time. */
export function matchTimestamp(value: unknown): number {
  if (value == null || value === "") return 0;
  const timestamp = typeof value === "number" ? value : new Date(value as string).getTime();
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
}

export function formatMatchElapsed(startedAt: unknown, endAt: unknown): string {
  const start = matchTimestamp(startedAt);
  const end = matchTimestamp(endAt);
  const seconds = start && end ? Math.max(0, Math.floor((end - start) / 1000)) : 0;
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((value) => String(value).padStart(2, "0")).join(":");
}
