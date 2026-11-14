#!/usr/bin/env node
// Chặn lỗi header/nút Back nằm dưới tai thỏ / Dynamic Island trong Modal toàn màn hình.
//
// Vì sao: GlobalNotificationShell tự đệm vùng status bar rồi đưa context safe-area
// top = 0 cho toàn bộ màn hình bên trong. <Modal> toàn màn hình mở CỬA SỔ native
// riêng (không có đệm đó) → mọi useSafeAreaInsets().top đọc từ màn cha = 0 → nội
// dung modal chui lên dưới Dynamic Island, không bấm được.
//
// Quy tắc (script này kiểm tra):
//   1. Modal toàn màn hình (không transparent, không pageSheet/formSheet) phải dùng
//      AppModal (components/ui/AppModal.tsx) thay vì Modal của react-native.
//   2. Trong thân AppModal không dùng `insets.top` lấy từ hook ở component cha —
//      đọc top inset BÊN TRONG modal (SafeAreaView edges top / useModalTopInset).
// Ngoại lệ có chủ đích: thêm comment `safe-area-ok:` ngay trên thẻ <Modal.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIRS = ["app", "components"];
const exts = new Set([".tsx", ".ts", ".jsx", ".js"]);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (exts.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

// Đọc thẻ mở JSX từ vị trí `<Tag`, tôn trọng {…} lồng nhau và chuỗi.
function readOpeningTag(src, start) {
  let depth = 0;
  let quote = null;
  for (let i = start + 1; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === "\\") { i++; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (depth > 0 && (ch === '"' || ch === "'" || ch === "`")) { quote = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) {
      const selfClosing = src[i - 1] === "/";
      return { attrs: src.slice(start, i + 1), end: i + 1, selfClosing };
    }
  }
  return null;
}

function isFullScreen(attrs) {
  const transparent = /\btransparent(\s*=\s*\{\s*true\s*\})?(?=[\s/>])/.test(attrs) && !/transparent\s*=\s*\{\s*false\s*\}/.test(attrs);
  if (transparent) return false;
  if (/presentationStyle\s*=\s*["{'`]*\s*["'`]?(pageSheet|formSheet)/.test(attrs)) return false;
  if (/\{\s*\.\.\./.test(attrs)) return null; // prop spread → không suy được
  return true;
}

const problems = [];
let checked = 0;
for (const file of DIRS.flatMap((d) => walk(path.join(ROOT, d), []))) {
  const src = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file);
  const importsRnModal = /import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*["']react-native["']/.test(src);
  for (const tagName of ["Modal", "AppModal"]) {
    const re = new RegExp(`<${tagName}(?=[\\s>])`, "g");
    let m;
    while ((m = re.exec(src))) {
      const tag = readOpeningTag(src, m.index);
      if (!tag) continue;
      const line = src.slice(0, m.index).split("\n").length;
      const lineStart = src.lastIndexOf("\n", m.index) + 1;
      const lead = src.slice(lineStart, m.index).trim();
      if (lead.startsWith("//") || lead.startsWith("*") || lead.startsWith("/*")) continue; // trong comment
      const before = src.slice(Math.max(0, m.index - 300), m.index);
      if (/safe-area-ok:/.test(before.split("\n").slice(-4).join("\n"))) continue;
      if (tagName === "Modal") {
        if (!importsRnModal) continue;
        const full = isFullScreen(tag.attrs);
        if (full === true) {
          checked++;
          problems.push(`${rel}:${line} — Modal toàn màn hình phải dùng AppModal (components/ui/AppModal.tsx)`);
        }
        continue;
      }
      // AppModal: không dùng insets.top của hook ở component cha bên trong thân modal.
      checked++;
      const close = src.indexOf(`</${tagName}>`, tag.end);
      const body = src.slice(tag.end, close > 0 ? close : tag.end);
      if (/\binsets\??\.top\b/.test(body) || /StatusBar\.currentHeight/.test(body)) {
        problems.push(`${rel}:${line} — thân AppModal đang dùng insets.top/StatusBar.currentHeight của màn cha (luôn 0) → dùng SafeAreaView edges top hoặc useModalTopInset() bên trong modal`);
      }
    }
  }
}

if (problems.length) {
  console.error(`✗ ${problems.length} lỗi safe-area trong Modal:\n  ` + problems.join("\n  "));
  process.exit(1);
}
console.log(`✓ modal safe-area: ${checked} modal toàn màn hình đều an toàn`);
