import { useContext } from "react";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const FLOATING_TAB_BAR_HEIGHT = 88;

/** Chừa đuôi cuộn cho dock nổi; không đổi màn sâu/alias hoặc giao diện V1. */
export function useFloatingTabBarPadding(fallback: number): number {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const theme = useTheme() as ReturnTypeTheme;
  const { bottom } = useSafeAreaInsets();
  return theme.version === "v2" && tabBarHeight !== undefined
    ? Math.max(fallback, FLOATING_TAB_BAR_HEIGHT + Math.max(bottom, 8) + 12)
    : fallback;
}

type ReturnTypeTheme = ReturnType<typeof useTheme> & { version?: string };
