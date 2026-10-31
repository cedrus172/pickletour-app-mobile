/** Calendar presentation only; API timestamps and registration logic are unchanged. */
export function tournamentDateParts(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  const day = part("day");
  const month = part("month");
  const dateLabel = `${day}/${month}/${part("year")}`;
  const time = `${part("hour")}:${part("minute")}`;
  return { day, month, date: dateLabel, time, label: `${time} · ${dateLabel}` };
}

export function tournamentDateLabel(start?: string | Date | null, end?: string | Date | null) {
  const first = tournamentDateParts(start);
  if (!first) return null;
  const last = tournamentDateParts(end);
  return last && last.date !== first.date ? `${first.label}\n– ${last.date}` : first.label;
}
