module.exports = function (api) {
  api.cache.using(() => process.env.BUILD_OUT_DIR || "");
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin", "hot-updater/babel-plugin"],
  };
};
