// components/home/HomeV3Features.tsx
// Khối "Tính năng PickleTour" của giao diện V3 Fresh: ô tìm kiếm + các nhóm theo mục đích
// (Thi đấu / Sân & Live / Cộng đồng / Tiện ích), dùng một bộ biểu tượng hai tông đồng nhất.
// Game Hot, Đặt sân (đã có banner ở phần trên trang chủ) và Bảng tin (đã có tab) không nằm ở đây.
import React, { memo, useCallback, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/i18nText";
import { TextInput } from "@/components/ui/i18nTextInput";
import { IS_V3_DARK, V3 } from "@/hooks/uiVersion";

export type HomeFeature = { id: number; title: string; link?: string };

// Static require để mọi icon đều nằm trong bundle (kể cả bản OTA).
const ICONS: Record<number, ImageSourcePropType> = {
  1: require("@/assets/images/v3/features/1.png"),
  3: require("@/assets/images/v3/features/3.png"),
  4: require("@/assets/images/v3/features/4.png"),
  5: require("@/assets/images/v3/features/5.png"),
  6: require("@/assets/images/v3/features/6.png"),
  8: require("@/assets/images/v3/features/8.png"),
  9: require("@/assets/images/v3/features/9.png"),
  10: require("@/assets/images/v3/features/10.png"),
  11: require("@/assets/images/v3/features/11.png"),
  12: require("@/assets/images/v3/features/12.png"),
  14: require("@/assets/images/v3/features/14.png"),
  15: require("@/assets/images/v3/features/15.png"),
  17: require("@/assets/images/v3/features/17.png"),
  19: require("@/assets/images/v3/features/19.png"),
  20: require("@/assets/images/v3/features/20.png"),
  42: require("@/assets/images/v3/features/42.png"),
};

// Nhóm theo id trong FEATURES của trang chủ (thứ tự = thứ tự hiển thị).
const GROUPS: { key: string; title: string; icon: keyof typeof Ionicons.glyphMap; ids: number[] }[] = [
  // Bảng xếp hạng không nằm ở đây vì đã có tab riêng trên thanh điều hướng.
  { key: "compete", title: "Thi đấu", icon: "trophy-outline", ids: [1, 9, 12, 3] },
  { key: "courts", title: "Sân & Live", icon: "tv-outline", ids: [42, 6, 11] },
  // Bảng tin không nằm ở đây vì đã có tab riêng trên thanh điều hướng.
  { key: "community", title: "Cộng đồng", icon: "people-outline", ids: [8, 14, 15, 20, 17] },
  // Thông báo không nằm ở đây vì đã có nút chuông ở đầu trang.
  { key: "utils", title: "Tiện ích", icon: "grid-outline", ids: [19, 5, 4, 10] },
];

const TINTS = V3.tints;

/** Bỏ dấu tiếng Việt + viết thường để tìm không phân biệt dấu. */
function fold(text: string) {
  let s = String(text || "").toLowerCase();
  try {
    s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  } catch {}
  return s.replace(/đ/g, "d");
}

const FeatureTile = memo(function FeatureTile({
  feature,
  tint,
  width,
  dense = false,
}: {
  feature: HomeFeature;
  tint: string;
  width: `${number}%`;
  dense?: boolean;
}) {
  const onPress = useCallback(() => {
    const link = feature.link;
    if (!link) return;
    if (link.startsWith("http")) void Linking.openURL(link).catch(() => {});
    else router.push(link as never);
  }, [feature.link]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={feature.title} onPress={onPress} style={[styles.tile, { width }]}>
      <View style={[styles.tileIcon, { backgroundColor: tint }]}>
        <Image source={ICONS[feature.id]} style={styles.tileImage} contentFit="contain" />
      </View>
      <Text style={[styles.tileLabel, dense ? styles.tileLabelDense : null]} numberOfLines={2} maxFontSizeMultiplier={1.15}>
        {feature.title}
      </Text>
    </Pressable>
  );
});

function HomeV3Features({ features }: { features: HomeFeature[] }) {
  const [query, setQuery] = useState("");
  const [innerWidth, setInnerWidth] = useState(0);

  const byId = useMemo(() => {
    const map: Record<number, HomeFeature> = {};
    for (const f of features) if (ICONS[f.id]) map[f.id] = f;
    return map;
  }, [features]);

  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({ ...g, items: g.ids.map((id) => byId[id]).filter(Boolean) as HomeFeature[] })).filter(
        (g) => g.items.length > 0,
      ),
    [byId],
  );
  const total = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);

  const q = fold(query.trim());
  const results = useMemo(
    () => (q ? groups.flatMap((g) => g.items).filter((f) => fold(f.title).includes(q)) : []),
    [groups, q],
  );

  // Số cột của một nhóm: cố xếp cả nhóm trên một hàng như thiết kế; máy hẹp thì 6 mục tách 2 hàng.
  const columnsFor = (count: number) => {
    if (count <= 5) return Math.max(count, 3);
    return innerWidth >= 330 ? count : Math.ceil(count / 2);
  };

  return (
    <View style={styles.section} onLayout={(e) => setInnerWidth(e.nativeEvent.layout.width - 32)}>
      <View style={styles.header}>
        <Ionicons name="flash" size={26} color={V3.limeDeep} />
        <View style={styles.headerCopy}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            Tính năng PickleTour
          </Text>
          <Text style={styles.subtitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            Mọi thứ cho người chơi pickleball — trong một app
          </Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{total} tính năng</Text>
        </View>
      </View>

      <View style={styles.search}>
        <Ionicons name="search" size={19} color={V3.sub} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm tính năng…"
          placeholderTextColor={V3.muted}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Xoá tìm kiếm" hitSlop={10} onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={19} color={V3.muted} />
          </Pressable>
        ) : null}
      </View>

      {q ? (
        <View style={styles.card}>
          {results.length ? (
            <View style={styles.grid}>
              {results.map((f, i) => (
                <FeatureTile key={f.id} feature={f} tint={TINTS[i % TINTS.length]} width="25%" />
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>Không tìm thấy tính năng phù hợp</Text>
          )}
        </View>
      ) : (
        groups.map((group) => {
          const cols = columnsFor(group.items.length);
          const width = `${100 / cols}%` as `${number}%`;
          return (
            <View key={group.key} style={styles.group}>
              <View style={styles.groupHeader}>
                <Ionicons name={group.icon} size={20} color={V3.blue} />
                <Text style={styles.groupTitle}>{group.title}</Text>
              </View>
              <View style={styles.card}>
                <View style={styles.grid}>
                  {group.items.map((f, i) => (
                    <FeatureTile key={f.id} feature={f} tint={TINTS[i % TINTS.length]} width={width} dense={cols >= 6} />
                  ))}
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

export default memo(HomeV3Features);

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, marginTop: 8 },

  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: V3.ink, fontSize: 20, lineHeight: 25, fontWeight: "900" },
  subtitle: { color: V3.sub, fontSize: 12, lineHeight: 16, marginTop: 1 },
  countPill: {
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: V3.blueSoft,
    borderWidth: 1,
    borderColor: V3.blueSoftBorder,
  },
  countText: { color: V3.blue, fontSize: 12, fontWeight: "800" },

  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    height: 46,
    marginTop: 12,
    paddingHorizontal: 15,
    borderRadius: 23,
    backgroundColor: V3.card,
    borderWidth: 1,
    borderColor: V3.border,
    shadowColor: V3.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  searchInput: { flex: 1, minWidth: 0, height: 46, paddingVertical: 0, color: V3.ink, fontSize: 14.5 },

  group: { marginTop: 16 },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, marginLeft: 2 },
  groupTitle: { color: V3.ink, fontSize: 17, lineHeight: 22, fontWeight: "900" },

  card: {
    borderRadius: 22,
    backgroundColor: V3.card,
    paddingHorizontal: 7,
    paddingTop: 10,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: IS_V3_DARK ? V3.border : "rgba(16,42,92,0.05)",
    shadowColor: V3.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  tile: { alignItems: "center", paddingHorizontal: 3, paddingBottom: 8 },
  tileIcon: { width: "100%", height: 52, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  tileImage: { width: 38, height: 38 },
  tileLabel: {
    width: "100%",
    marginTop: 6,
    textAlign: "center",
    color: V3.ink,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  tileLabelDense: { fontSize: 10, lineHeight: 13, letterSpacing: -0.3 },
  empty: { color: V3.sub, fontSize: 13.5, textAlign: "center", paddingVertical: 18 },
});
