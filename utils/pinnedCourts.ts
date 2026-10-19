// Ghim SÂN (per-device, per trọng tài) — lưu local bằng AsyncStorage.
// Trọng tài ghim các sân hay bắt → hiện ở màn ngoài + lên đầu khi vào cụm.
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "referee_pinned_courts_v1";

export type PinnedCourt = { stationId: string; clusterId: string };

let cache: PinnedCourt[] | null = null;
let loading: Promise<PinnedCourt[]> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

async function persist() {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache || []));
  } catch {
    /* ignore */
  }
}

export async function loadPins(): Promise<PinnedCourt[]> {
  if (cache) return cache;
  if (loading) return loading;
  loading = (async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      cache = Array.isArray(parsed)
        ? parsed
            .map((p: any) => ({
              stationId: String(p?.stationId || ""),
              clusterId: String(p?.clusterId || ""),
            }))
            .filter((p) => p.stationId)
        : [];
    } catch {
      cache = [];
    }
    notify();
    return cache;
  })();
  return loading;
}

export function getPins(): PinnedCourt[] {
  return cache || [];
}

export function isPinned(stationId: string | undefined | null): boolean {
  const sid = String(stationId || "");
  return (cache || []).some((p) => p.stationId === sid);
}

export async function togglePin(stationId: string, clusterId: string) {
  if (!cache) await loadPins();
  const sid = String(stationId || "");
  if (!sid) return;
  const exists = (cache || []).some((p) => p.stationId === sid);
  cache = exists
    ? (cache || []).filter((p) => p.stationId !== sid)
    : [...(cache || []), { stationId: sid, clusterId: String(clusterId || "") }];
  notify();
  await persist();
}

export function subscribePins(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Hook: trả về danh sách ghim + helper.
export function usePinnedCourts() {
  const [pins, setPins] = useState<PinnedCourt[]>(getPins());
  useEffect(() => {
    let active = true;
    const sync = () => {
      if (active) setPins([...getPins()]);
    };
    const unsub = subscribePins(sync);
    loadPins().then(sync);
    return () => {
      active = false;
      unsub();
    };
  }, []);
  return {
    pins,
    isPinned: (stationId: string | undefined | null) =>
      pins.some((p) => p.stationId === String(stationId || "")),
    toggle: (stationId: string, clusterId: string) =>
      togglePin(stationId, clusterId),
  };
}
