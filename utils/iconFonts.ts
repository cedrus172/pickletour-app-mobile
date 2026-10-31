import * as Font from "expo-font";
import { AntDesign, Feather, FontAwesome, Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

// Use the families owned by the icon classes, not aliases derived from their filenames.
// Loading the same native font under extra aliases can race across an OTA bridge reload.
export const APP_ICON_FONTS = {
  ...Ionicons.font,
  ...Feather.font,
  ...MaterialIcons.font,
  ...MaterialCommunityIcons.font,
  ...AntDesign.font,
  ...FontAwesome.font,
};

export async function loadAppIconFonts(): Promise<void> {
  await Font.loadAsync(APP_ICON_FONTS);
  const missing = Object.keys(APP_ICON_FONTS).filter((family) => !Font.isLoaded(family));
  if (missing.length) throw new Error(`Chưa nạp được font icon: ${missing.join(", ")}`);
}
