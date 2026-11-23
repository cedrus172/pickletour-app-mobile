// components/fanpage/FanpageUI.tsx — mảnh giao diện dùng chung cho các màn Fanpage.
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert, View } from "react-native";

import { Text } from "@/components/ui/i18nText";
import type { ThemeTokens } from "@/hooks/useThemeTokens";
import { useUploadFeedMediaMutation } from "@/slices/feedApiSlice";
import { FANPAGE_ROLE_LABEL } from "@/slices/fanpagesApiSlice";
import { normalizeUrl } from "@/utils/normalizeUri";

export function PageAvatar({ uri, size, C, ring }: { uri?: string; size: number; C: ThemeTokens; ring?: boolean }) {
  const src = normalizeUrl(uri || "");
  const style = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: C.cardAlt,
    borderWidth: ring ? 3 : 0,
    borderColor: ring ? C.primary : "transparent",
  };
  return src ? (
    <ExpoImage source={{ uri: src }} style={style} contentFit="cover" cachePolicy="memory-disk" />
  ) : (
    <View style={[style, { alignItems: "center", justifyContent: "center" }]}>
      <Ionicons name="flag" size={size * 0.42} color={C.sub} />
    </View>
  );
}

export function VerifiedTick({ size = 16 }: { size?: number }) {
  return <Ionicons name="checkmark-circle" size={size} color="#2F8BFF" />;
}

const STATUS: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  pending: { label: "Chờ duyệt", icon: "time-outline", color: "#F59E0B", bg: "rgba(245,158,11,0.14)" },
  approved: { label: "Đã duyệt", icon: "checkmark-circle", color: "#22C55E", bg: "rgba(34,197,94,0.14)" },
  rejected: { label: "Bị từ chối", icon: "close-circle", color: "#EF4444", bg: "rgba(239,68,68,0.14)" },
  suspended: { label: "Tạm khoá", icon: "lock-closed", color: "#EF4444", bg: "rgba(239,68,68,0.14)" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: s.bg }}>
      <Ionicons name={s.icon} size={12} color={s.color} />
      <Text style={{ color: s.color, fontSize: 11.5, fontWeight: "800" }}>{s.label}</Text>
    </View>
  );
}

const ROLE_COLOR: Record<string, { bg: string; fg: string }> = {
  owner: { bg: "#C5F433", fg: "#0B1B3A" },
  admin: { bg: "#08CDF5", fg: "#04121F" },
  editor: { bg: "#2F8BFF", fg: "#FFFFFF" },
};

export function RoleBadge({ role }: { role: string }) {
  const c = ROLE_COLOR[role] || ROLE_COLOR.editor;
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: c.bg }}>
      <Text style={{ color: c.fg, fontSize: 11.5, fontWeight: "800" }}>
        {FANPAGE_ROLE_LABEL[role as keyof typeof FANPAGE_ROLE_LABEL] || role}
      </Text>
    </View>
  );
}

/** Chọn 1 ảnh từ thư viện → nén → tải lên (dùng chung endpoint ảnh Bảng tin) → trả URL. */
export function useImageUpload() {
  const [uploadMedia] = useUploadFeedMediaMutation();
  const [busy, setBusy] = useState(false);
  const pick = async (opts: { maxWidth?: number; aspect?: [number, number] } = {}): Promise<string | null> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Cần cấp quyền truy cập thư viện ảnh");
      return null;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: Boolean(opts.aspect),
      aspect: opts.aspect,
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.length) return null;
    setBusy(true);
    try {
      const a = res.assets[0];
      const maxW = opts.maxWidth || 1280;
      const m = await ImageManipulator.manipulateAsync(
        a.uri,
        (a.width || 0) > maxW ? [{ resize: { width: maxW } }] : [],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const fd = new FormData();
      fd.append("files", { uri: m.uri, name: `fanpage-${Date.now()}.jpg`, type: "image/jpeg" } as any);
      const up: any = await uploadMedia(fd).unwrap();
      const url = up?.media?.[0]?.url;
      if (!url) throw new Error("Tải ảnh lên thất bại");
      return url;
    } catch (e: any) {
      Alert.alert("Không tải được ảnh", e?.data?.message || e?.message || "Vui lòng thử lại.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { pick, busy };
}
