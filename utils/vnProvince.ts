// utils/vnProvince.ts — đoán tỉnh/thành từ chuỗi địa điểm giải (tournament.location) để lọc "Khu vực".
const PROVINCES = [
  "Hà Nội", "Hồ Chí Minh", "Hải Phòng", "Đà Nẵng", "Cần Thơ", "Huế", "Ninh Bình", "Nam Định", "Hà Nam", "Thái Bình", "Hưng Yên",
  "Hải Dương", "Bắc Ninh", "Bắc Giang", "Vĩnh Phúc", "Phú Thọ", "Thái Nguyên", "Quảng Ninh", "Lạng Sơn", "Cao Bằng", "Hà Giang",
  "Tuyên Quang", "Yên Bái", "Lào Cai", "Lai Châu", "Điện Biên", "Sơn La", "Hoà Bình", "Thanh Hoá", "Nghệ An", "Hà Tĩnh",
  "Quảng Bình", "Quảng Trị", "Quảng Nam", "Quảng Ngãi", "Bình Định", "Phú Yên", "Khánh Hoà", "Ninh Thuận", "Bình Thuận",
  "Kon Tum", "Gia Lai", "Đắk Lắk", "Đắk Nông", "Lâm Đồng", "Bình Phước", "Tây Ninh", "Bình Dương", "Đồng Nai", "Bà Rịa - Vũng Tàu",
  "Long An", "Tiền Giang", "Bến Tre", "Trà Vinh", "Vĩnh Long", "Đồng Tháp", "An Giang", "Kiên Giang", "Hậu Giang", "Sóc Trăng",
  "Bạc Liêu", "Cà Mau", "Bắc Kạn",
];
const fold = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
const KEYS = PROVINCES.map((p) => ({ p, k: fold(p).replace(/ - /g, " ") }));
const ALIASES: [RegExp, string][] = [
  [/\b(tp\.?\s*)?hcm\b|sai gon|saigon/, "Hồ Chí Minh"],
  [/\bhn\b|ha noi/, "Hà Nội"],
  [/vung tau/, "Bà Rịa - Vũng Tàu"],
  [/thanh hoa/, "Thanh Hoá"],
  [/hoa binh/, "Hoà Bình"],
  [/khanh hoa|nha trang/, "Khánh Hoà"],
];

/** "Cụm 9 sân Thành Nam Club, Nam Định" → "Nam Định"; không đoán được → "". */
export function provinceOf(location?: string | null): string {
  const f = fold(location || "");
  if (!f) return "";
  // ưu tiên tên tỉnh xuất hiện muộn nhất trong chuỗi (thường là phần cuối địa chỉ)
  let best = "";
  let at = -1;
  for (const { p, k } of KEYS) {
    const i = f.lastIndexOf(k);
    if (i > at) {
      at = i;
      best = p;
    }
  }
  if (best) return best;
  for (const [re, p] of ALIASES) if (re.test(f)) return p;
  return "";
}
