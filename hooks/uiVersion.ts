// hooks/uiVersion.ts
// Toàn bộ ứng dụng dùng giao diện V2.
export type UiVersion = "v2";

/** Bảng màu V2 Modern — lấy trực tiếp từ logo PickleTour (cyan/navy/volt). */
export const V2 = {
  // Cyan điện (viền sáng logo)
  cyan: "#12B6F3",
  cyanBright: "#5CD6FF",
  cyanDeep: "#045DA0",
  // Navy nền badge
  navy: "#0A1B34",
  navyDeep: "#040E20",
  navyAlt: "#0E2244",
  // Volt/lime (bóng pickleball)
  volt: "#CDE818",
  voltDeep: "#9BB80C",
  // Chữ trên nền tối
  ink: "#EAF3FF",
  ink2: "#C4D6EC",
  sub: "#8CA6C8",
  muted: "#5F7BA0",
  // Viền cyan mờ
  border: "rgba(92,180,255,0.16)",
  line: "rgba(92,180,255,0.26)",
  // Gradient dùng lại nhiều nơi
  gradHero: ["#040E20", "#0A1B34", "#0E2A52", "#05132A"] as const,
  gradCyan: ["#5CD6FF", "#12B6F3", "#045DA0"] as const,
  gradCard: ["#0C2044", "#0A1B34"] as const,
};

/** react-navigation Theme cho V2 (luôn nền tối navy). */
export const AppV2NavTheme: any = {
  dark: true,
  version: "v2",
  colors: {
    primary: V2.cyan,
    background: V2.navyDeep,
    card: V2.navy,
    text: V2.ink,
    border: V2.border,
    notification: V2.cyan,
  },
  fonts: undefined, // sẽ được _layout gán từ DarkTheme.fonts để tương thích RN Navigation
};

/** Giữ API hiện có cho các màn hình dùng giao diện V2. */
export function useUiVersion(): UiVersion {
  return "v2";
}
