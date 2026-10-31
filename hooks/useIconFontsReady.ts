import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { APP_ICON_FONTS, loadAppIconFonts } from "@/utils/iconFonts";

const ATTEMPT_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;

type FontState = { ready: boolean; error: string | null };

/** Gate screens on a completed font load on every JS boot, including a warm OTA reload. */
export function useIconFontsReady() {
  const [state, setState] = useState<FontState>({ ready: false, error: null });
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    setState({ ready: false, error: null });

    const report = (status: string, error: string | null = null) => {
      (globalThis as any).__PT_ICON_FONTS__ = {
        status, attempt, families: Object.keys(APP_ICON_FONTS), error,
      };
    };
    const start = () => {
      if (cancelled) return;
      attempt += 1;
      let settled = false;
      report("loading");
      const fail = (reason: unknown) => {
        if (cancelled || settled) return;
        settled = true;
        clearTimeout(deadline);
        const message = reason instanceof Error ? reason.message : String(reason);
        if (attempt < MAX_ATTEMPTS) {
          report("retrying", message);
          retryTimer = setTimeout(start, 300 * attempt);
        } else {
          report("error", message);
          console.warn("[IconFonts] Không thể chuẩn bị font icon:", message);
          setState({ ready: false, error: "Chưa tải được biểu tượng. Vui lòng thử lại." });
        }
      };
      deadline = setTimeout(() => fail(new Error("Quá thời gian tải font icon")), ATTEMPT_TIMEOUT_MS);
      loadAppIconFonts().then(() => {
        if (cancelled || settled) return;
        settled = true;
        clearTimeout(deadline);
        report("ready");
        setState({ ready: true, error: null });
      }).catch(fail);
    };
    start();
    return () => {
      cancelled = true;
      clearTimeout(deadline);
      clearTimeout(retryTimer);
    };
  }, [revision]);

  useEffect(() => {
    if (!state.error) return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") retry();
    });
    return () => subscription.remove();
  }, [state.error, retry]);

  return { fontsReady: state.ready, fontError: state.error, retryFonts: retry };
}
