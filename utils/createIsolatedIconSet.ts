import createIconSet from '@expo/vector-icons/build/createIconSet';
import { ISOLATED_ICON_ASSETS } from '../assets/fonts/icons';

export * from '@expo/vector-icons/build/createIconSet';

// Native aliases survive a bridge reload. A new alias avoids Expo unregistering
// a font still used by the previous bridge. The font's PostScript name is stable.
const bootId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export default function createIsolatedIconSet(
  ...args: Parameters<typeof createIconSet>
): ReturnType<typeof createIconSet> {
  const asset = ISOLATED_ICON_ASSETS[args[1] as keyof typeof ISOLATED_ICON_ASSETS];
  if (!asset) return createIconSet(...args);
  return createIconSet(args[0], `${asset.postScriptName}-${bootId}`, asset.source, args[3]);
}
