// Phiên bản giao diện của ứng dụng.
//  - "v2": V2 Modern (nền navy tối, cyan/volt) — mặc định.
//  - "v3": V3 Fresh (nền sáng, xanh dương + xanh chanh theo logo mới).
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

export const UI_VERSION: UiVersion = readBootUiVersion();
export const IS_V3 = UI_VERSION === "v3";

/** Chọn giá trị theo phiên bản giao diện đang chạy: sk(giá trị V2, giá trị V3). */
export function sk<T>(v2: T, v3: T): T {
  return IS_V3 ? v3 : v2;
}

/** Bảng màu thương hiệu V2 (lấy từ logo PickleTour). */
export const V2 = {
  cyan: "#12B6F3",
  cyanBright: "#5CD6FF",
  cyanDeep: "#045DA0",
  navy: "#0A1B34",
  navyDeep: "#040E20",
  navyAlt: "#0E2244",
  volt: "#CDE818",
  voltDeep: "#9BB80C",
  ink: "#EAF3FF",
  ink2: "#C4D6EC",
  sub: "#8CA6C8",
  muted: "#5F7BA0",
  border: "rgba(92,180,255,0.16)",
  line: "rgba(92,180,255,0.26)",
  gradHero: ["#06142B", "#0A2A55", "#0B4C8C"] as [string, string, string],
  gradCyan: ["#045DA0", "#12B6F3"] as [string, string],
  gradCard: ["#0E2244", "#0A1B34"] as [string, string],
};

/** Bảng màu V3 Fresh: nền sáng, xanh dương đậm + xanh chanh. */
export const V3 = {
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
};

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
  fonts: undefined,
};

export const AppV3NavTheme: any = {
  dark: false,
  version: "v3" as UiVersion,
  colors: {
    primary: V3.blue,
    background: V3.bg,
    card: V3.card,
    text: V3.ink,
    border: V3.border,
    notification: V3.red,
  },
  fonts: undefined,
};

export const AppNavTheme: any = IS_V3 ? AppV3NavTheme : AppV2NavTheme;

export function useUiVersion(): UiVersion {
  return UI_VERSION;
}

/**
 * Lưu phiên bản giao diện mới rồi nạp lại ứng dụng để áp dụng.
 * Trả về false nếu không đổi (đang ở đúng phiên bản đó hoặc lưu lỗi).
 */
export async function applyUiVersion(next: UiVersion): Promise<boolean> {
  if (next === UI_VERSION) return false;
  try {
    SecureStore.setItem(UI_VERSION_KEY, next);
  } catch {
    try {
      await SecureStore.setItemAsync(UI_VERSION_KEY, next);
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
