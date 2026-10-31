const MAIN_NOTIFICATION_PATHS = new Set([
  "",
  "feed",
  "tournaments",
  "rankings",
  "more",
  "tournament/stack",
  "rankings/stack",
]);

/** Chỉ hiện chuông ở trang chính; hai route stack là cùng màn danh sách mở từ lối tắt. */
export function isMainNotificationRoute(segments: readonly string[] | null | undefined): boolean {
  if (!segments?.length) return false;
  const route = segments.filter((segment) => !/^\(.*\)$/.test(segment));
  if (!route.length) return segments.includes("(tabs)");
  if (route[route.length - 1] === "index") route.pop();
  if (!route.length) return segments.includes("(tabs)") || (segments.length === 1 && segments[0] === "index");
  return MAIN_NOTIFICATION_PATHS.has(route.join("/"));
}
