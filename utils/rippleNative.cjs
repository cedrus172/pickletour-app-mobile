// Preserve lazy getters and every other React Native export, including namespace imports.
const native = require("react-native");
const descriptors = Object.getOwnPropertyDescriptors(native);
descriptors.TouchableOpacity = { enumerable: true, configurable: true, get: () => require("../components/ui/RippleButtons").RippleTouchableOpacity };
descriptors.Pressable = { enumerable: true, configurable: true, get: () => require("../components/ui/RippleButtons").RipplePressable };
descriptors.Button = { enumerable: true, configurable: true, get: () => require("../components/ui/RippleButtons").RippleButton };
module.exports = Object.defineProperties({}, descriptors);
