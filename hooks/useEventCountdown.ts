// hooks/useEventCountdown.ts — đếm ngược tới giờ sự kiện bắt đầu (ISO) cho "Xem live giải đấu".
import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

export type Countdown = { active: boolean; days: number; hours: number; minutes: number; seconds: number };

/** "2 ngày 03:12:45" / "03:12:45". */
export function fmtCountdown({ days, hours, minutes, seconds }: Countdown) {
  const hms = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${days} ngày ${hms}` : hms;
}

/** "08:00 · 30/11/2026" theo giờ máy. */
export function fmtStartAt(iso?: string) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** active=false khi không có giờ hoặc đã tới giờ. */
export default function useEventCountdown(target?: string | null): Countdown {
  const t = target ? Date.parse(target) : NaN;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!Number.isFinite(t) || t <= Date.now()) return undefined;
    setNow(Date.now());
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= t) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [t]);
  const left = Number.isFinite(t) ? Math.max(0, t - now) : 0;
  const s = Math.floor(left / 1000);
  return {
    active: left > 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}
