import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createContext, useContext } from "react";

export const DuoSideNavigationContext = createContext(false);
export const useDuoSideNavigationActive = () => useContext(DuoSideNavigationContext);
export const DuoTopInsetContext = createContext(0);

/** iOS 27.1 reports the Duo's system-control area as a trailing safe inset. */
export function useDuoSideNavigation() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const topInset = useContext(DuoTopInsetContext);
  const enabled = Platform.OS === "ios" && insets.right >= 70 && insets.top < 16;
  const topEnabled = topInset > 0 && Platform.OS === "ios" && width >= 640 && width < 720 && height > width;
  return { enabled, width: enabled ? insets.right : 0, topEnabled, topInset };
}
