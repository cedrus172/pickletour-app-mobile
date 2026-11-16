module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["./babel/press-fx-plugin.js", "react-native-reanimated/plugin", "hot-updater/babel-plugin"],
  };
};
