// Phiên bản giao diện của ứng dụng.
//  - "v2": V2 Modern (nền navy tối, cyan/volt) — mặc định.
//  - "v3": V3 Fresh (bố cục mới: trang chủ, thanh tab, khối tính năng…). V3 có hai tông:
//      + "light" (mặc định): nền sáng, xanh dương + xanh chanh.
//      + "dark": vẫn bố cục V3 nhưng dùng bảng màu V2 (navy tối, cyan/volt).
// Phiên bản được đọc ĐỒNG BỘ một lần lúc khởi động (SecureStore) và cố định suốt phiên chạy:
// đổi phiên bản = lưu lựa chọn rồi nạp lại app (applyUiVersion). Nhờ vậy StyleSheet khai báo ở
// cấp module vẫn dùng được `sk(v2, v3)` mà không cần viết lại thành hook.
import * as SecureStore from "expo-secure-store";

export type UiVersion = "v2" | "v3";

export const UI_VERSION_KEY = "PREF_UI_VERSION";

function readBootUiVersion(): UiVersion {
  // Chỉ khi phát triển: ép phiên bản để thử nhanh trên simulator
  //   EXPO_PUBLIC_FORCE_UI_VERSION=v3 npx expo start
  if (__DEV__) {
    const forced = process.env.EXPO_PUBLIC_FORCE_UI_VERSION;
    if (forced === "v2" || forced === "v3") return forced;
  }
  try {
    return SecureStore.getItem(UI_VERSION_KEY) === "v3" ? "v3" : "v2";
  } catch {
    return "v2";
  }
}

export type UiTheme = "light" | "dark";

export const UI_THEME_KEY = "PREF_UI_V3_THEME";

function readBootUiTheme(): UiTheme {
  // Chỉ khi phát triển: EXPO_PUBLIC_FORCE_UI_THEME=dark npx expo start
  if (__DEV__) {
    const forced = process.env.EXPO_PUBLIC_FORCE_UI_THEME;
    if (forced === "light" || forced === "dark") return forced;
  }
  try {
    return SecureStore.getItem(UI_THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export const UI_VERSION: UiVersion = readBootUiVersion();
/** Tông sáng/tối của V3 (không có ý nghĩa ở V2 — V2 luôn tối). */
export const UI_THEME: UiTheme = readBootUiTheme();
/** Đang chạy BỐ CỤC V3 (cả sáng lẫn tối): trang chủ mới, thanh tab mới, hiệu ứng bấm/chuyển trang. */
export const IS_V3 = UI_VERSION === "v3";
/** V3 tông tối: bố cục V3 + màu V2. */
export const IS_V3_DARK = IS_V3 && UI_THEME === "dark";
/** V3 tông sáng: mọi lựa chọn MÀU SÁNG phải dựa vào cờ này (không dùng IS_V3). */
export const IS_V3_LIGHT = IS_V3 && !IS_V3_DARK;

/**
 * Chọn giá trị theo màu giao diện đang chạy: sk(giá trị V2, giá trị V3 sáng).
 * V3 tông tối dùng lại giá trị V2 nên các màn đã chuyển đổi tự có bản tối.
 */
export function sk<T>(v2: T, v3: T): T {
  return IS_V3_LIGHT ? v3 : v2;
}

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

/** Bảng màu V3 Fresh tông sáng: nền sáng, xanh dương đậm + xanh chanh. */
export const V3_LIGHT = {
  blue: "#1466F2",
  blueBright: "#2F8BFF",
  blueDeep: "#0B3FB8",
  navy: "#0B2A6B",
  lime: "#C5F433",
  limeDeep: "#8FCB10",
  limeInk: "#12300A",
  bg: "#F2F6FC",
  bgAlt: "#E9F0FA",
  card: "#FFFFFF",
  cardAlt: "#F5F8FD",
  field: "#EEF3FA",
  ink: "#0B1B3A",
  ink2: "#243450",
  sub: "#5F6F8A",
  muted: "#97A3B8",
  border: "rgba(16,42,92,0.08)",
  line: "rgba(16,42,92,0.14)",
  red: "#EF3B3B",
  gradBlue: ["#2F8BFF", "#1466F2"] as [string, string],
  gradDeep: ["#0B2A6B", "#1466F2"] as [string, string],
  gradLime: ["#D6FA4D", "#B4EC1C"] as [string, string],
  gradPage: ["#F7FAFF", "#EEF4FC"] as [string, string],
  shadow: "#1B3A7A",
  // Chữ/biểu tượng đặt trên nền gradBlue.
  onBlue: "#FFFFFF",
  // Chữ/biểu tượng của mục chưa chọn trên thanh tab.
  tabIdle: "#51607B",
  // Nền nhạt cho ô biểu tượng (xanh dương / xanh lá / tím).
  tints: ["#E8F1FF", "#ECF8E1", "#EFEBFF"] as [string, string, string],
  // Nền + viền nhạt cho nhãn màu xanh dương.
  blueSoft: "rgba(20,102,242,0.08)",
  blueSoftBorder: "rgba(20,102,242,0.2)",
  // Chữ/biểu tượng đặt trên nền gradLime.
  onLime: "#0B1B3A",
  // gradPage[0] trong suốt — dùng cho dải mờ dần quanh ảnh đầu trang.
  fade0: "rgba(247,250,255,0)",
  // Lớp phủ lên ảnh đầu trang (bản tối cần làm dịu ảnh sáng).
  heroScrim: "rgba(255,255,255,0)",
  // Thẻ nổi trên ảnh + viền sáng của thẻ/ô.
  cardGlass: "rgba(255,255,255,0.96)",
  cardEdge: "#FFFFFF",
  tileEdge: "rgba(255,255,255,0.9)",
  // Nền nhãn/ô đang chọn và nền ô biểu tượng.
  chip: "#DCEBFF",
  selected: "#E4EEFF",
  iconWell: "#EAF0F9",
};

/** Bảng màu V3 tông tối: cùng tên token với bản sáng nhưng lấy màu của V2 (navy/cyan/volt). */
export const V3_DARK: typeof V3_LIGHT = {
  blue: V2.cyan,
  blueBright: V2.cyanBright,
  blueDeep: V2.cyanDeep,
  navy: V2.navyAlt,
  lime: V2.volt,
  limeDeep: V2.volt,
  limeInk: "#12300A",
  bg: V2.navyDeep,
  bgAlt: "#07152B",
  card: V2.navy,
  cardAlt: V2.navyAlt,
  field: "#0E2244",
  ink: V2.ink,
  ink2: V2.ink2,
  sub: V2.sub,
  muted: V2.muted,
  border: V2.border,
  line: V2.line,
  red: "#FF5A5A",
  gradBlue: [V2.cyanBright, V2.cyan],
  gradDeep: ["#0A1B34", "#0E2A52"],
  gradLime: ["#DDF23A", V2.volt],
  gradPage: [V2.navyDeep, "#061A33"],
  shadow: "#000000",
  onBlue: "#04121F",
  tabIdle: V2.sub,
  tints: ["rgba(18,182,243,0.14)", "rgba(205,232,24,0.12)", "rgba(139,92,246,0.18)"],
  blueSoft: "rgba(18,182,243,0.12)",
  blueSoftBorder: "rgba(18,182,243,0.3)",
  onLime: "#06152B",
  fade0: "rgba(4,14,32,0)",
  heroScrim: "rgba(4,14,32,0.5)",
  cardGlass: "rgba(10,27,52,0.94)",
  cardEdge: "rgba(92,180,255,0.22)",
  tileEdge: "rgba(92,180,255,0.16)",
  chip: "rgba(18,182,243,0.16)",
  selected: "rgba(18,182,243,0.14)",
  iconWell: "#0E2244",
};

/** Bảng màu của các thành phần chỉ có ở V3 (trang chủ, thanh tab…): tự đổi theo tông sáng/tối. */
export const V3: typeof V3_LIGHT = IS_V3_DARK ? V3_DARK : V3_LIGHT;

export const AppV2NavTheme: any = {
  dark: true,
  version: "v2" as UiVersion,
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

export const AppV3NavTheme: any = {
  dark: false,
  version: "v3" as UiVersion,
  colors: {
    primary: V3_LIGHT.blue,
    background: V3_LIGHT.bg,
    card: V3_LIGHT.card,
    text: V3_LIGHT.ink,
    border: V3_LIGHT.border,
    notification: V3_LIGHT.red,
  },
  fonts: undefined,
};

// V3 tông tối dùng theme điều hướng của V2 (cùng bảng màu).
export const AppNavTheme: any = IS_V3_LIGHT ? AppV3NavTheme : AppV2NavTheme;

export function useUiVersion(): UiVersion {
  return UI_VERSION;
}

function saveSecure(key: string, value: string): boolean {
  try {
    SecureStore.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lưu phiên bản + tông sáng/tối rồi nạp lại ứng dụng để áp dụng.
 * Trả về false nếu không đổi gì hoặc lưu lỗi.
 */
export async function applyUiAppearance(version: UiVersion, theme: UiTheme = UI_THEME): Promise<boolean> {
  if (version === UI_VERSION && theme === UI_THEME) return false;
  if (!saveSecure(UI_VERSION_KEY, version)) {
    try {
      await SecureStore.setItemAsync(UI_VERSION_KEY, version);
    } catch {
      return false;
    }
  }
  if (!saveSecure(UI_THEME_KEY, theme)) {
    try {
      await SecureStore.setItemAsync(UI_THEME_KEY, theme);
    } catch {
      return false;
    }
  }
  try {
    const { HotUpdater } = require("@hot-updater/react-native");
    await HotUpdater.reload();
    return true;
  } catch {}
  try {
    const { DevSettings } = require("react-native");
    DevSettings.reload();
  } catch {}
  return true;
}

/** Đổi phiên bản giao diện (giữ nguyên tông sáng/tối đã chọn cho V3). */
export function applyUiVersion(next: UiVersion): Promise<boolean> {
  return applyUiAppearance(next, UI_THEME);
}

/** Đổi tông sáng/tối của V3. */
export function applyUiTheme(next: UiTheme): Promise<boolean> {
  return applyUiAppearance(UI_VERSION, next);
}
