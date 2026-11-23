// components/fanpage/PostAsPicker.tsx — chọn "Đăng dưới tên": Cá nhân / PickleTour (admin) / Fanpage mình quản lý.
// Ẩn hẳn khi người dùng không quản lý trang nào → giao diện đăng bài của đa số người dùng không đổi.
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSelector } from "react-redux";

import { Text } from "@/components/ui/i18nText";
import { normalizeUrl } from "@/utils/normalizeUri";
import { FANPAGE_ROLE_LABEL, useGetMyFanpagesQuery } from "@/slices/fanpagesApiSlice";

export type PostAsPage = {
  _id: string;
  name: string;
  avatar?: string;
  verified?: boolean;
  isOfficial?: boolean;
  myRole?: string;
};

/** Trang đăng được của người dùng hiện tại (đã duyệt). */
export function usePostablePages(): PostAsPage[] {
  const me = useSelector((s: any) => s.auth?.userInfo);
  const { data } = useGetMyFanpagesQuery(undefined, { skip: !me?._id });
  return (data?.postable || []) as PostAsPage[];
}

function Avatar({ uri, size, round = true }: { uri?: string; size: number; round?: boolean }) {
  const src = normalizeUrl(uri || "");
  return src ? (
    <ExpoImage source={{ uri: src }} style={{ width: size, height: size, borderRadius: round ? size / 2 : 8, backgroundColor: "#0B2540" }} contentFit="cover" />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#16324F", alignItems: "center", justifyContent: "center" }}>
      <Ionicons name="person" size={size * 0.55} color="#9EBAD5" />
    </View>
  );
}

type Palette = { text: string; sub: string; card: string; border: string; accent: string; selBg: string };
const DARK: Palette = {
  text: "#FFFFFF",
  sub: "rgba(255,255,255,0.7)",
  card: "rgba(0,0,0,0.55)",
  border: "rgba(255,255,255,0.22)",
  accent: "#08CDF5",
  selBg: "rgba(8,205,245,0.16)",
};

export default function PostAsPicker({
  value,
  onChange,
  pages,
  palette,
}: {
  value: string | null;
  onChange: (pageId: string | null, page: PostAsPage | null) => void;
  pages: PostAsPage[];
  palette?: Partial<Palette>;
}) {
  const me = useSelector((s: any) => s.auth?.userInfo);
  const [open, setOpen] = useState(false);
  if (!pages.length) return null;
  const P = { ...DARK, ...(palette || {}) };
  const selected = pages.find((p) => String(p._id) === String(value)) || null;
  const meName = me?.nickname || me?.name || "Cá nhân";

  const Row = ({ page }: { page: PostAsPage | null }) => {
    const on = page ? String(page._id) === String(value) : !value;
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: on }}
        onPress={() => {
          onChange(page ? String(page._id) : null, page);
          setOpen(false);
        }}
        style={[styles.row, { borderColor: on ? P.accent : "transparent", backgroundColor: on ? P.selBg : "transparent" }]}
      >
        <Avatar uri={page ? page.avatar : me?.avatar} size={34} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text numberOfLines={1} style={[styles.rowName, { color: P.text }]}>
              {page ? page.name : `Cá nhân · ${meName}`}
            </Text>
            {page && (page.verified || page.isOfficial) ? <Ionicons name="checkmark-circle" size={15} color="#2F8BFF" /> : null}
          </View>
          {page ? (
            <Text numberOfLines={1} style={[styles.rowSub, { color: P.sub }]}>
              {page.isOfficial ? "Trang chính thức" : `Fanpage · ${FANPAGE_ROLE_LABEL[page.myRole as keyof typeof FANPAGE_ROLE_LABEL] || ""}`}
            </Text>
          ) : null}
        </View>
        <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={20} color={on ? P.accent : P.sub} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.box, { backgroundColor: P.card, borderColor: P.border }]}>
      <Pressable accessibilityRole="button" onPress={() => setOpen((v) => !v)} style={styles.head} hitSlop={4}>
        <Text style={[styles.label, { color: P.sub }]}>Đăng dưới tên</Text>
        <Avatar uri={selected ? selected.avatar : me?.avatar} size={22} />
        <Text numberOfLines={1} style={[styles.current, { color: P.text }]}>
          {selected ? selected.name : meName}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={P.sub} />
      </Pressable>
      {open ? (
        <View style={{ gap: 4, marginTop: 6 }}>
          <Row page={null} />
          {pages.map((p) => (
            <Row key={String(p._id)} page={p} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 30 },
  label: { fontSize: 12.5, fontWeight: "600" },
  current: { flex: 1, fontSize: 14, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 12, borderWidth: 1 },
  rowName: { flexShrink: 1, fontSize: 14, fontWeight: "800" },
  rowSub: { fontSize: 11.5, marginTop: 1 },
});
