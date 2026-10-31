/** Protect the scoring screen, including doubles, user matches and draw modals. */
export function isRefereeScoringRoute(segments: readonly string[]): boolean {
  const route = segments.filter((segment) => !/^\(.*\)$/.test(segment));
  return (
    (route[0] === "match" && Boolean(route[1]) && route[2] === "referee") ||
    (route[0] === "admin" && route[1] === "adhoc-referee")
  );
}
