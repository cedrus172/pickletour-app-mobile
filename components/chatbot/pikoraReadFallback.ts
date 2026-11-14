const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

export function getPikoraReadIntent(text: string) {
  const normalized = text.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d")
    .replace(/[?.!]+$/g, "").replace(/\s+/g, " ").trim();
  if (/^(giai (dau )?(nao )?sap dien ra|(?:cac )?giai (?:dau )?sap toi)$/.test(normalized)) return "upcoming";
  if (/^giai (dau )?(nao )?dang dien ra$/.test(normalized)) return "ongoing";
  if (/^(rating|diem trinh) (cua )?(toi|minh)( (la )?bao nhieu)?$/.test(normalized)) return "rating";
  return null;
}

export function formatPikoraTournamentReply(
  tournaments: { name?: string; isTest?: boolean; startDate?: string }[],
  status: "upcoming" | "ongoing",
) {
  const label = status === "upcoming" ? "sắp diễn ra" : "đang diễn ra";
  const items = tournaments.filter((item) => item?.name?.trim() && !item.isTest)
    .slice(0, 3)
    .map(({ name, startDate }) => {
      const date = startDate ? new Date(startDate) : null;
      const start = date && !Number.isNaN(date.getTime()) ? ` — ${dateFormatter.format(date)}` : "";
      return `• ${name?.trim()}${start}`;
    });
  return items.length
    ? `Giải ${label} trên PickleTour:\n\n${items.join("\n")}`
    : `Hiện chưa có giải ${label} trong danh sách công khai của PickleTour.`;
}

export function formatPikoraRatingReply(profile: { score?: { single?: unknown; double?: unknown } }) {
  const score = profile?.score;
  if (!score) return null;
  const format = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value > 0
      ? value.toFixed(2)
      : "Chưa có điểm hiển thị";
  return `Điểm trình trên hồ sơ PickleTour của bạn:\n• Đơn: ${format(score.single)}\n• Đôi: ${format(score.double)}`;
}
