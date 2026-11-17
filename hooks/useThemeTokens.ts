// hooks/useThemeTokens.ts
// Bộ token màu sáng/tối dùng chung cho toàn app (mở rộng từ pal() của utils/courtFormat).
// Theo theme đang áp dụng ở app/_layout (system / light / dark) qua ThemeProvider của react-navigation.
//
// Quy ước: KHÔNG hardcode màu slate (#fff, #0F172A, #64748B, #E2E8F0, #F1F5F9…) trong màn hình;
// dùng `const C = useThemeTokens();` rồi C.card / C.text / C.sub / C.border / C.field …
// StyleSheet.create có màu → chuyển thành `const mkStyles = (C: ThemeTokens) => StyleSheet.create({...})`
// và trong component: `const styles = useMemo(() => mkStyles(C), [C]);`
import { useMemo } from "react";
import { pal } from "@/utils/courtFormat";
import { IS_V3_LIGHT, V2, V3 } from "@/hooks/uiVersion";

/** Token cho giao diện V2 Modern (navy/cyan/volt theo logo). */
const themeTokensV2 = () => {
  const p = pal(true);
  return {
    ...p,
    bg: V2.navyDeep,
    card: V2.navy,
    field: "rgba(255,255,255,0.055)",
    cardAlt: V2.navyAlt,
    pressed: "rgba(92,180,255,0.12)",
    border: V2.border,
    line: V2.line,
    text: V2.ink,
    text2: V2.ink2,
    text3: V2.sub,
    sub: V2.sub,
    muted: V2.muted,
    overlay: "rgba(2,8,20,0.72)",
    primary: V2.cyan,
    primarySoft: "rgba(18,182,243,0.16)",
    unreadBg: "rgba(18,182,243,0.12)",
    amberSoft: "rgba(205,232,24,0.16)",
    amberText: V2.volt,
    greenSoft: "rgba(34,197,94,0.16)",
    greenText: "#4ade80",
    redSoft: "rgba(239,68,68,0.18)",
    redText: "#fb7185",
    purpleSoft: "rgba(124,58,237,0.2)",
    onPrimary: "#04121f",
    statusBar: "light" as "light" | "dark",
    // Token riêng V2 (không dùng ở V1)
    brandCyan: V2.cyan,
    brandCyanBright: V2.cyanBright,
    volt: V2.volt,
    isV2: true,
    isV3: false,
  };
};

export type ThemeTokens = ReturnType<typeof themeTokensV2>;

/** Token cho giao diện V3 Fresh (nền sáng, xanh dương + xanh chanh). */
const themeTokensV3 = (): ThemeTokens => {
  const p = pal(false);
  return {
    ...p,
    bg: V3.bg,
    card: V3.card,
    field: V3.field,
    cardAlt: V3.cardAlt,
    pressed: "rgba(20,102,242,0.08)",
    border: V3.border,
    line: V3.line,
    text: V3.ink,
    text2: V3.ink2,
    text3: V3.sub,
    sub: V3.sub,
    muted: V3.muted,
    overlay: "rgba(11,27,58,0.45)",
    primary: V3.blue,
    primarySoft: "rgba(20,102,242,0.10)",
    unreadBg: "rgba(20,102,242,0.07)",
    amberSoft: "rgba(245,158,11,0.14)",
    amberText: "#B45309",
    greenSoft: "rgba(22,163,74,0.12)",
    greenText: "#15803D",
    redSoft: "rgba(239,68,68,0.10)",
    redText: "#DC2626",
    purpleSoft: "rgba(124,58,237,0.10)",
    onPrimary: "#FFFFFF",
    statusBar: "dark" as "light" | "dark",
    brandCyan: V3.blue,
    brandCyanBright: V3.blueBright,
    volt: V3.limeDeep,
    isV2: false,
    isV3: true,
  };
};

export const themeTokens: () => ThemeTokens = IS_V3_LIGHT ? themeTokensV3 : themeTokensV2;

export function useThemeTokens(): ThemeTokens {
  return useMemo(themeTokens, []);
}

export default useThemeTokens;
