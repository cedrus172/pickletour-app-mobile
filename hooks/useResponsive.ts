// hooks/useResponsive.ts
// Breakpoint thích ứng cho iPhone Duo (gập) + iPad + xoay ngang.
// - compact: màn bìa khi gập / iPhone thường (width < 600)
// - medium : mở hé / iPhone ngang / iPad nhỏ (600–839)
// - expanded: mở hẳn màn lớn / iPad (>= 840)
// Dùng: const r = useResponsive(); r.isWide, r.featureColumns, r.contentMaxWidth, r.gutter…
import { useWindowDimensions } from "react-native";

export type DeviceClass = "compact" | "medium" | "expanded";

export interface Responsive {
  width: number;
  height: number;
  shortest: number;
  isLandscape: boolean;
  /** >= 600pt: dùng bố cục rộng (2 cột / grid nhiều cột). */
  isWide: boolean;
  /** >= 840pt: màn rất lớn (iPhone Duo mở hẳn / iPad). */
  isLarge: boolean;
  deviceClass: DeviceClass;
  /** Số cột cho lưới tính năng / thẻ. */
  featureColumns: number;
  /** Số cột cho lưới thẻ lớn (feed, chợ, clip…). */
  gridColumns: number;
  /** Bề rộng nội dung tối đa (căn giữa trên màn lớn để khỏi giãn xấu). */
  contentMaxWidth: number;
  /** Lề ngang gợi ý. */
  gutter: number;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const shortest = Math.min(width, height);
  const isLandscape = width > height;
  const isWide = width >= 600;
  const isLarge = width >= 840;

  const deviceClass: DeviceClass = width >= 840 ? "expanded" : width >= 600 ? "medium" : "compact";

  const featureColumns = width >= 1040 ? 8 : width >= 860 ? 6 : width >= 680 ? 5 : 4;
  const gridColumns = width >= 1040 ? 4 : width >= 760 ? 3 : width >= 560 ? 2 : 1;
  const contentMaxWidth = width >= 1100 ? 1040 : width >= 840 ? 820 : width >= 600 ? 680 : width;
  const gutter = width >= 840 ? 24 : width >= 600 ? 20 : 16;

  return {
    width, height, shortest, isLandscape,
    isWide, isLarge, deviceClass,
    featureColumns, gridColumns, contentMaxWidth, gutter,
  };
}

export default useResponsive;
