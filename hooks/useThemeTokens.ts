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
import { V2 } from "@/hooks/uiVersion";

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
  };
};

export const themeTokens = themeTokensV2;

export type ThemeTokens = ReturnType<typeof themeTokens>;

export function useThemeTokens(): ThemeTokens {
  return useMemo(themeTokens, []);
}

export default useThemeTokens;
