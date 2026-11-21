// components/chat/stickers.ts — danh mục sticker của tin nhắn.
// Sticker gửi đi như một ảnh đính kèm ({ type: "image", url, sticker: true }) nên bản app/web cũ
// vẫn hiện được dưới dạng ảnh. Ảnh nằm ở web: frontend/public/stickers/<bộ>/<số>.webp.
import AsyncStorage from "@react-native-async-storage/async-storage";

export const STICKER_BASE = "https://pickletour.vn/stickers";

export type Sticker = { id: string; url: string; label: string };
export type StickerPack = { id: string; name: string; stickers: Sticker[] };

const pack = (id: string, name: string, labels: string[]): StickerPack => ({
  id,
  name,
  stickers: labels.map((label, i) => {
    const n = String(i + 1).padStart(2, "0");
    return { id: `${id}-${n}`, url: `${STICKER_BASE}/${id}/${n}.webp`, label };
  }),
});

export const STICKER_PACKS: StickerPack[] = [
  pack("pt", "Sticker PickleTour", [
    "Xin chào!",
    "Quá đỉnh!",
    "Yêu quá",
    "Haha",
    "Ra sân thôi!",
    "Thua kèo này",
    "Cảm ơn nha",
    "Xin lỗi nha",
    "Cay quá!",
    "Dễ ợt",
    "Ngủ ngon",
    "Hmm...",
    "Vô địch!",
    "Ok nha",
    "Ối!",
    "Chiến thôi!",
  ]),
  pack("td", "Thi đấu", [
    "Vô địch",
    "Số 1",
    "Chốt kèo!",
    "Trắng tay",
    "Smash!",
    "Hẹn ra sân",
    "GG",
    "Đợi xíu",
  ]),
];

const ALL = new Map<string, Sticker>();
for (const p of STICKER_PACKS) for (const s of p.stickers) ALL.set(s.id, s);

export const EMOJI_GRID = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎",
  "🤩", "🥳", "😇", "🙂", "😉", "😋", "😜", "🤔",
  "😴", "😭", "😢", "😡", "🤯", "😱", "🥵", "🥶",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "✌️", "👌",
  "❤️", "💙", "💛", "💚", "🔥", "⭐", "🎉", "🏆",
  "🥇", "🥈", "🥉", "🏓", "🎯", "⏰", "📍", "✅",
];

export function isStickerAttachment(a: any): boolean {
  if (!a || a.type !== "image" || typeof a.url !== "string") return false;
  return a.sticker === true || a.url.startsWith(`${STICKER_BASE}/`);
}

/** Tin chỉ gồm 1 sticker (không chữ, không thẻ đính kèm khác) → hiện to, không khung. */
export function stickerOf(msg: any): any | null {
  const atts = msg?.attachments || [];
  if (atts.length !== 1 || msg?.content) return null;
  return isStickerAttachment(atts[0]) ? atts[0] : null;
}

// Chỉ gồm 1–3 emoji (không chữ) → hiện to, không khung.
// (Tự xét theo mã ký tự — Hermes không chắc hỗ trợ \p{Extended_Pictographic}.)
const isPictograph = (cp: number) =>
  (cp >= 0x1f000 && cp <= 0x1faff && !(cp >= 0x1f3fb && cp <= 0x1f3ff)) ||
  (cp >= 0x2600 && cp <= 0x27bf) ||
  (cp >= 0x2300 && cp <= 0x23ff) ||
  (cp >= 0x2b00 && cp <= 0x2bff) ||
  (cp >= 0x2190 && cp <= 0x21ff);
const isEmojiGlue = (cp: number) =>
  cp === 0xfe0f || cp === 0x200d || cp === 0x20e3 || (cp >= 0x1f3fb && cp <= 0x1f3ff);

export function isJumboEmoji(text?: string): boolean {
  const t = String(text || "").trim();
  if (!t || t.length > 32) return false;
  let count = 0;
  let joined = false;
  for (const ch of t) {
    const cp = ch.codePointAt(0) || 0;
    if (ch === " ") continue;
    if (isEmojiGlue(cp)) {
      if (cp === 0x200d) joined = true;
      continue;
    }
    if (!isPictograph(cp)) return false;
    if (!joined) count += 1;
    joined = false;
  }
  return count >= 1 && count <= 3;
}

const RECENT_KEY = "chat.stickers.recent.v1";
const RECENT_MAX = 16;

export async function loadRecentStickers(): Promise<Sticker[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return ids.map((id) => ALL.get(id)).filter(Boolean) as Sticker[];
  } catch {
    return [];
  }
}

export async function pushRecentSticker(s: Sticker): Promise<Sticker[]> {
  const cur = await loadRecentStickers();
  const next = [s, ...cur.filter((x) => x.id !== s.id)].slice(0, RECENT_MAX);
  try {
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next.map((x) => x.id)));
  } catch {}
  return next;
}
