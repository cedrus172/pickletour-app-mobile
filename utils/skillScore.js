// Hiển thị ĐIỂM TRÌNH: làm tròn 2 chữ số thập phân, từ 5 trở lên làm tròn lên (4.555 → 4.56, 4.554 → 4.55).
// Không dùng thẳng toFixed(2): 4.555.toFixed(2) = "4.55" vì sai số dấu phẩy động.
// CHỈ để hiển thị — so trần điểm / lọc vượt điểm vẫn dùng điểm gốc.
// BẢN SAO của frontend/src/utils/skillScore.js (web) — sửa một bên thì sửa cả bên kia.
export function roundScore2(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return NaN;
  const r = Math.round(Number((Math.abs(n) * 100).toPrecision(12))) / 100;
  return n < 0 ? -r : r;
}

/** "4.56" (luôn 2 chữ số) hoặc trim=true → bỏ số 0 thừa ("2.5", "4"). */
export function fmtScore2(v, { trim = false, empty = "—" } = {}) {
  const r = roundScore2(v);
  if (!Number.isFinite(r)) return empty;
  const s = r.toFixed(2);
  return trim ? s.replace(/\.?0+$/, "") : s;
}
