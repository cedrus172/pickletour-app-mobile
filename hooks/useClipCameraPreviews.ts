import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { useMyCamClipAccessQuery } from "@/slices/camClipApiSlice";
import { CAMERA_PREVIEW_INTERVAL_MS, cameraScopeKey, getCameraPreviewState, refreshCameraPreviews, retainCameraPreviewScopes, subscribeCameraPreviews, type ClipCameraScope } from "@/utils/clipCameraCache";

export type CameraVenueAccess = {
  venueId: string; venueName: string; logo?: string; address?: string; province?: string; images?: string[];
  piBaseUrl: string; hasAccess: boolean; source: "admin" | "owner" | "manager" | "manual" | "booking" | null;
  expiresAt: string | null; cameras?: number[] | null;
};

export function cameraAccessActive(venue: CameraVenueAccess, now = Date.now()) {
  return !!venue.hasAccess && !!venue.piBaseUrl && (!venue.expiresAt || Date.parse(venue.expiresAt) > now);
}

function useCameraPageActive() {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setForeground(state === "active"));
    return () => subscription.remove();
  }, []);
  return focused && foreground;
}

/** Quyền từ API là nguồn chính; route params không tự cấp quyền xem ảnh đã lưu. */
export function useClipCameraAccess() {
  const active = useCameraPageActive();
  const userId = useSelector((s: any) => String(s.auth?.userInfo?._id || s.auth?.userInfo?.user?._id || ""));
  const query = useMyCamClipAccessQuery(undefined, { skip: !userId, refetchOnMountOrArgChange: true, pollingInterval: active ? 30_000 : 0 });
  const [now, setNow] = useState(Date.now);
  const venues = useMemo<CameraVenueAccess[]>(() => userId && Array.isArray(query.data) ? query.data : [], [userId, query.data]);
  const scopes = useMemo(() => venues.filter((v) => cameraAccessActive(v, now)).map((v) => ({ userId, base: v.piBaseUrl, cameras: v.cameras })), [userId, venues, now]);

  useEffect(() => {
    const deadlines = venues.map((v) => Date.parse(v.expiresAt || "")).filter((t) => t > now);
    if (!deadlines.length) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(1, Math.min(...deadlines) - Date.now() + 20), 60_000));
    return () => clearTimeout(timer);
  }, [venues, now]);
  useEffect(() => {
    if (!userId || Array.isArray(query.data)) retainCameraPreviewScopes(scopes);
  }, [userId, query.data, scopes]);
  return { ...query, userId, venues, scopes, active, now };
}

export function useClipCameraPreviews(scope: ClipCameraScope | null) {
  const active = useCameraPageActive();
  const key = cameraScopeKey(scope);
  // Khóa chuẩn hóa giúp props cameras mới nhưng cùng phạm vi không khởi động lại timer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableScope = useMemo(() => scope, [key]);
  const subscribe = useCallback((notify: () => void) => subscribeCameraPreviews(stableScope, notify), [stableScope]);
  const snapshot = useCallback(() => getCameraPreviewState(stableScope), [stableScope]);
  const state = useSyncExternalStore(subscribe, snapshot, snapshot);
  const refresh = useCallback(() => stableScope ? refreshCameraPreviews(stableScope, true) : Promise.resolve(), [stableScope]);
  useEffect(() => {
    if (!stableScope || !active) return;
    void refreshCameraPreviews(stableScope);
    const timer = setInterval(() => { void refreshCameraPreviews(stableScope); }, CAMERA_PREVIEW_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [stableScope, active]);
  return { ...state, refresh };
}
