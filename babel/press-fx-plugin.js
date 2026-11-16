// Plugin Babel: chuyển `TouchableOpacity` / `Pressable` import từ "react-native" (trong mã nguồn app)
// sang "@/components/ui/PressFx". Ở giao diện V2 hai component này chính là bản gốc của
// React Native (không đổi gì); ở V3 chúng có thêm hiệu ứng nhún khi bấm.
const TARGETS = new Set(["TouchableOpacity", "Pressable"]);
const PRESS_FX = "@/components/ui/PressFx";

module.exports = function pressFxPlugin({ types: t }) {
  return {
    name: "pickletour-press-fx",
    visitor: {
      ImportDeclaration(path, state) {
        const file = String(state.filename || state.file?.opts?.filename || "").replace(/\\/g, "/");
        if (!file || file.includes("/node_modules/") || file.endsWith("/components/ui/PressFx.tsx")) return;
        const node = path.node;
        if (node.source.value !== "react-native" || node.importKind === "type") return;
        const moved = [];
        const kept = [];
        for (const spec of node.specifiers) {
          const name = t.isImportSpecifier(spec) && (spec.imported.name || spec.imported.value);
          if (name && TARGETS.has(name) && spec.importKind !== "type") moved.push(spec);
          else kept.push(spec);
        }
        if (!moved.length) return;
        const pressFxImport = t.importDeclaration(moved, t.stringLiteral(PRESS_FX));
        if (kept.length) {
          node.specifiers = kept;
          path.insertAfter(pressFxImport);
        } else {
          path.replaceWith(pressFxImport);
        }
      },
    },
  };
};
