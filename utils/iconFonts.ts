import * as Font from "expo-font";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { AntDesign, Feather, FontAwesome, FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons, Octicons } from "@expo/vector-icons";

// Use the families owned by the icon classes, not aliases derived from their filenames.
// Loading the same native font under extra aliases can race across an OTA bridge reload.
export const APP_ICON_FONTS = {
  ...Ionicons.font,
  ...Feather.font,
  ...MaterialIcons.font,
  ...MaterialCommunityIcons.font,
  ...AntDesign.font,
  ...FontAwesome.font,
  // Multi-style .font still describes the original families. Load the actual
  // child factories so solid-only icons and brands use isolated boot aliases.
  ...Object.assign({}, ...["regular", "light", "solid", "brand"].map(
    (style) => FontAwesome5.StyledIconSet(style).font
  )),
  ...Octicons.font,
};

export async function loadAppIconFonts(): Promise<void> {
  let fonts: Record<string, Font.FontSource> = APP_ICON_FONTS;
  if (Platform.OS !== "web") {
    // CoreText retains registered font URLs across warm reloads. HotUpdater can
    // remove old bundle directories, so never register from an OTA asset URL.
    const directory = `${FileSystem.documentDirectory}icon-fonts-v1/`;
    if (!FileSystem.documentDirectory) throw new Error("Không tìm thấy thư mục lưu font icon");
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    fonts = Object.fromEntries(await Promise.all(Object.entries(APP_ICON_FONTS).map(async ([family, source]) => {
      const asset = Asset.fromModule(source);
      await asset.downloadAsync();
      if (!asset.localUri) throw new Error(`Không tìm thấy file font: ${family}`);
      const destination = `${directory}${asset.hash || asset.name}.${asset.type || "ttf"}`;
      const info = await FileSystem.getInfoAsync(destination);
      if (!info.exists || info.size === 0) {
        const temporary = `${destination}.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
        await FileSystem.copyAsync({ from: asset.localUri, to: temporary });
        await FileSystem.moveAsync({ from: temporary, to: destination });
      }
      return [family, destination];
    })));
  }
  await Font.loadAsync(fonts);
  const missing = Object.keys(APP_ICON_FONTS).filter((family) => !Font.isLoaded(family));
  if (missing.length) throw new Error(`Chưa nạp được font icon: ${missing.join(", ")}`);
}
