// Chia nguồn RTSP đã lưu theo venue, suy từ tên gợi nhớ:
// "Lã Vọng - Sân 1" hoặc "Sân 1 - Thành Nam Ninh Bình" → venue "Lã Vọng" / "Thành Nam Ninh Bình".
// Tên không có " - " (vd "S25 Ultra") trả venue rỗng → caller xếp vào nhóm "Khác".
const isCourtPart = (part: string) => /^sân(\s|\d|$)/i.test(part);

export function splitRtspLabel(label: unknown): { venue: string; court: string } {
  const clean = String(label || "").replace(/\s+/g, " ").trim();
  const parts = clean.split(/\s+-\s+/).filter(Boolean);
  if (parts.length < 2) return { venue: "", court: clean };
  if (isCourtPart(parts[0]) && !isCourtPart(parts[parts.length - 1])) {
    return { venue: parts.slice(1).join(" - "), court: parts[0] };
  }
  return { venue: parts[0], court: parts.slice(1).join(" - ") };
}

const viCompare = (a: string, b: string) => a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" });

// Trả [{ venue, items: [{ source, index, court }] }]; index = vị trí trong danh sách gốc.
export function groupRtspByVenue<T extends { label?: string }>(list: T[] | null | undefined, otherLabel = "Khác") {
  const map = new Map<string, { venue: string; other: boolean; items: { source: T; index: number; court: string }[] }>();
  (list || []).forEach((source, index) => {
    const { venue, court } = splitRtspLabel(source?.label);
    const key = venue.toLowerCase();
    if (!map.has(key)) map.set(key, { venue: venue || otherLabel, other: !venue, items: [] });
    map.get(key)!.items.push({ source, index, court });
  });
  return [...map.values()]
    .sort((a, b) => Number(a.other) - Number(b.other) || viCompare(a.venue, b.venue))
    .map((group) => ({ ...group, items: group.items.sort((x, y) => viCompare(x.court, y.court)) }));
}
