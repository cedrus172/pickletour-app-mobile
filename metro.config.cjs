const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const blockDir = (relativePath) => {
  const absolutePath = path.join(projectRoot, relativePath);
  return new RegExp(`${escapeRegExp(absolutePath)}(?:[/\\\\].*)?$`);
};

const generatedAndCacheDirs = [
  ".android-user",
  ".build-tmp",
  ".gradle-user-home",
  ".hot-updater",
  ".npm-cache",
  ".yarn-cache",
  "abcdk-",
  "android",
  "dist",
  "dist-android",
  "dist-ios",
  "ios",
  "ios 2",
  "ios copy",
  "ios copy 2",
  "ios3",
  "logs",
  "ota-build",
];

const existingBlockList = config.resolver.blockList
  ? Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList]
  : [];

config.resolver.blockList = [
  ...existingBlockList,
  ...generatedAndCacheDirs.map(blockDir),
];

// Both installed icon libraries include different fonts with identical native
// PostScript names. Isolate the Expo copies without changing screen imports.
const expoIconFactory = require.resolve('@expo/vector-icons/build/createIconSet');
const isolatedIconFactory = path.join(projectRoot, 'utils/createIsolatedIconSet.ts');
const rippleNative = path.join(projectRoot, 'utils/rippleNative.cjs');
const rippleButtons = path.join(projectRoot, 'components/ui/RippleButtons.tsx');
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Only app-owned imports are wrapped. Native internals and dependencies keep
  // their original exports, and the wrapper itself must never resolve recursively.
  if (platform !== 'web' && moduleName === 'react-native' &&
      context.originModulePath.startsWith(projectRoot + path.sep) &&
      !context.originModulePath.includes(path.sep + 'node_modules' + path.sep) &&
      ![rippleNative, rippleButtons].includes(context.originModulePath)) {
    return { type: 'sourceFile', filePath: rippleNative };
  }
  const resolved = resolveRequest
    ? resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
  if (
    platform !== 'web' &&
    resolved.type === 'sourceFile' &&
    resolved.filePath === expoIconFactory &&
    context.originModulePath !== isolatedIconFactory
  ) {
    return { type: 'sourceFile', filePath: isolatedIconFactory };
  }
  return resolved;
};

module.exports = config;
