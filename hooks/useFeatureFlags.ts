// Cờ bật/tắt hiển thị tính năng do admin đặt (Cài đặt hệ thống → Tính năng). Chưa tải xong / lỗi = bật.
import { useGetFeatureFlagsQuery } from "@/slices/varApiSlice";

export type FeatureKey =
  | "highlightVar"
  | "photoAlbum"
  | "albumFaceSearch"
  | "albumIdentify"
  | "minigame"
  | "heroBanner"
  | "guestRegistration"
  | "spcFaceLookup";

export function useFeatureFlags() {
  const { data } = useGetFeatureFlagsQuery(undefined, { refetchOnMountOrArgChange: 300 });
  return (key: FeatureKey) => (data as any)?.[key] !== false;
}

export function useFeature(key: FeatureKey) {
  return useFeatureFlags()(key);
}
