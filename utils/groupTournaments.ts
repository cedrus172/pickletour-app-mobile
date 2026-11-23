// Gom nhóm giải cùng "sự kiện": cùng TÊN GỐC (trước "•"/"-", chỉ khác nội dung)
// HOẶC cùng CỤM SÂN (location) trong ~2 ngày. Union-find phía client.

function foldStr(s: any): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function baseNameOf(name: any): string {
  const s = String(name || "").trim();
  const parts = s.split(/\s+[•·]\s+|\s+[-–—]\s+/);
  return (parts[0] || s).trim();
}

export function subLabelOf(name: any, base: any): string {
  const s = String(name || "").trim();
  const b = String(base || "").trim();
  if (b && s.toLowerCase().startsWith(b.toLowerCase())) {
    return s.slice(b.length).replace(/^[\s•·\-–—|]+/, "").trim();
  }
  const parts = s.split(/\s+[•·]\s+|\s+[-–—]\s+/);
  return parts.length > 1 ? parts.slice(1).join(" · ").trim() : "";
}

function dayNum(t: any): number {
  const d = new Date(t?.startDate || t?.startAt || t?.createdAt || 0);
  const ms = d.getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 86400000) : 0;
}

export type TGroup = { key: string; title: string; items: any[]; isGroup: boolean };

export function groupTournaments(list: any[]): TGroup[] {
  const arr = Array.isArray(list) ? list : [];
  const n = arr.length;
  if (n <= 1) {
    return arr.map((t) => ({
      key: String(t?._id || Math.random()),
      title: baseNameOf(t?.name),
      items: [t],
      isGroup: false,
    }));
  }
  const parent = arr.map((_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  const base = arr.map((t) => foldStr(baseNameOf(t?.name)));
  const loc = arr.map((t) => foldStr(t?.location));
  const day = arr.map(dayNum);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sameName = base[i] && base[i] === base[j];
      const sameVenueClose =
        loc[i] && loc[i] === loc[j] && Math.abs(day[i] - day[j]) <= 2;
      if (sameName || sameVenueClose) union(i, j);
    }
  }
  const order: number[] = [];
  const map = new Map<number, any[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!map.has(r)) {
      map.set(r, []);
      order.push(r);
    }
    map.get(r)!.push(arr[i]);
  }
  return order.map((r) => {
    const items = map.get(r)!;
    return { key: String(items[0]?._id || r), title: groupTitle(items), items, isGroup: items.length > 1 };
  });
}

function groupTitle(items: any[]): string {
  if (!items?.length) return "";
  const counts = new Map<string, number>();
  for (const t of items) {
    const b = baseNameOf(t?.name);
    counts.set(b, (counts.get(b) || 0) + 1);
  }
  let best = "";
  let bestC = -1;
  for (const [b, c] of counts) {
    if (c > bestC) {
      best = b;
      bestC = c;
    }
  }
  return best || baseNameOf(items[0]?.name);
}

export function groupStatus(items: any[]): string {
  if (items.some((x) => x?.status === "ongoing")) return "ongoing";
  if (items.some((x) => x?.status === "upcoming")) return "upcoming";
  return "finished";
}

// ── Chia nội dung con theo NGÀY THI ĐẤU (giờ địa phương của giải, mặc định VN) — khớp bản web ──
const DEFAULT_TZ = "Asia/Ho_Chi_Minh";
const WEEKDAYS_VI = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const VN_OFFSET_MS = 7 * 3600 * 1000;

type StartParts = { y: number; m: number; d: number; hh: number; mm: number; wd: number; ms: number };

// Mốc bắt đầu theo múi giờ giải. Hermes có Intl đủ timeZone trên iOS/Android mới; lỗi thì tính tay theo UTC+7.
export function localStartParts(t: any): StartParts | null {
  const raw = t?.startDate || t?.startAt;
  const dt = raw ? new Date(raw) : null;
  if (!dt || !Number.isFinite(dt.getTime())) return null;
  const ms = dt.getTime();
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: t?.timezone || DEFAULT_TZ,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
    } as any).formatToParts(dt);
    const g = (k: string) => parts.find((p) => p.type === k)?.value || "";
    const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const y = Number(g("year"));
    if (y && g("weekday") in WD) {
      return { y, m: Number(g("month")), d: Number(g("day")), hh: Number(g("hour")) % 24, mm: Number(g("minute")), wd: WD[g("weekday")], ms };
    }
  } catch {
    /* rơi xuống tính tay */
  }
  const v = new Date(ms + VN_OFFSET_MS);
  return { y: v.getUTCFullYear(), m: v.getUTCMonth() + 1, d: v.getUTCDate(), hh: v.getUTCHours(), mm: v.getUTCMinutes(), wd: v.getUTCDay(), ms };
}

// "07:30"; trả "" nếu giải không đặt giờ (00:00 = chỉ đặt ngày).
export function startTimeLabel(t: any): string {
  const p = localStartParts(t);
  if (!p || (p.hh === 0 && p.mm === 0)) return "";
  return `${String(p.hh).padStart(2, "0")}:${String(p.mm).padStart(2, "0")}`;
}

export type DayGroup = { key: string; dateLabel: string; weekday: string; items: any[] };

/** Gom nội dung theo ngày bắt đầu, xếp ngày tăng dần; trong ngày theo giờ rồi thứ tự gốc. */
export function groupItemsByDay(items: any[]): DayGroup[] {
  const rows = (items || []).map((t, i) => ({ t, i, p: localStartParts(t) }));
  rows.sort((a, b) => (a.p?.ms ?? Infinity) - (b.p?.ms ?? Infinity) || a.i - b.i);
  const out: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();
  for (const r of rows) {
    const key = r.p ? `${r.p.y}-${r.p.m}-${r.p.d}` : "none";
    let g = byKey.get(key);
    if (!g) {
      g = {
        key,
        dateLabel: r.p ? `${String(r.p.d).padStart(2, "0")}/${String(r.p.m).padStart(2, "0")}/${r.p.y}` : "",
        weekday: r.p ? WEEKDAYS_VI[r.p.wd] : "",
        items: [],
      };
      byKey.set(key, g);
      out.push(g);
    }
    g.items.push(r.t);
  }
  return out;
}
