// Preserve lazy getters and every other React Native export, including namespace imports.
const native = require("react-native");
const { RippleTouchableOpacity, RipplePressable, RippleButton } = require("../components/ui/RippleButtons");
const descriptors = Object.getOwnPropertyDescriptors(native);
descriptors.TouchableOpacity = { enumerable: true, configurable: true, value: RippleTouchableOpacity };
descriptors.Pressable = { enumerable: true, configurable: true, value: RipplePressable };
descriptors.Button = { enumerable: true, configurable: true, value: RippleButton };
module.exports = Object.defineProperties({}, descriptors);
