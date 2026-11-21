// components/chat/StickerPanel.tsx — bảng chọn sticker / emoji nằm dưới ô soạn tin.
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { Text } from "@/components/ui/i18nText";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { sk } from "@/hooks/uiVersion";
import {
  EMOJI_GRID,
  STICKER_PACKS,
  loadRecentStickers,
  type Sticker,
} from "./stickers";

type TabKey = "recent" | "emoji" | string;

export const STICKER_PANEL_HEIGHT = 312;

function StickerPanelBase({
  bottomInset,
  recentVersion,
  onPickSticker,
  onPickEmoji,
}: {
  bottomInset: number;
  /** đổi giá trị → nạp lại danh sách "gần đây" */
  recentVersion: number;
  onPickSticker: (s: Sticker) => void;
  onPickEmoji: (e: string) => void;
}) {
  const C = useThemeTokens();
  const styles = useMemo(() => mk_styles(C), [C]);
  const [tab, setTab] = useState<TabKey>(STICKER_PACKS[0].id);
  const [recent, setRecent] = useState<Sticker[]>([]);
  const accent = sk("#00B2FF", "#1466F2");
  // Số cột theo bề rộng: điện thoại 4 cột sticker / 8 cột emoji; màn rộng (máy gập mở, tablet) nhiều cột hơn
  const { width } = useWindowDimensions();
  const stickerCols = Math.min(8, Math.max(4, Math.floor(width / 96)));
  const emojiCols = Math.min(14, Math.max(7, Math.floor(width / 46)));

  useEffect(() => {
    let alive = true;
    loadRecentStickers().then((list) => {
      if (alive) setRecent(list);
    });
    return () => {
      alive = false;
    };
  }, [recentVersion]);

  const pack = STICKER_PACKS.find((p) => p.id === tab);
  const title =
    tab === "recent" ? "Dùng gần đây" : tab === "emoji" ? "Biểu tượng cảm xúc" : pack?.name || "";
  const stickers = tab === "recent" ? recent : pack?.stickers || [];

  const tabs: { key: TabKey; node: (active: boolean) => React.ReactNode }[] = [
    {
      key: "recent",
      node: (active) => <Ionicons name="time-outline" size={24} color={active ? accent : C.muted} />,
    },
    {
      key: STICKER_PACKS[0].id,
      node: () => (
        <ExpoImage source={{ uri: STICKER_PACKS[0].stickers[1].url }} style={styles.tabImg} contentFit="contain" />
      ),
    },
    {
      key: "emoji",
      node: (active) => <Ionicons name="happy-outline" size={24} color={active ? accent : C.muted} />,
    },
    ...STICKER_PACKS.slice(1).map((p) => ({
      key: p.id,
      node: () => <ExpoImage source={{ uri: p.stickers[0].url }} style={styles.tabImg} contentFit="contain" />,
    })),
  ];

  return (
    <View style={[styles.wrap, { height: STICKER_PANEL_HEIGHT + bottomInset, paddingBottom: bottomInset }]}>
      <View style={styles.grabber} />
      <View style={styles.tabs}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tab} hitSlop={4}>
              {t.node(active)}
              <View style={[styles.tabLine, active && { backgroundColor: accent }]} />
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.title}>{title}</Text>
      {tab === "emoji" ? (
        <FlatList
          key={`emoji-${emojiCols}`}
          data={EMOJI_GRID}
          numColumns={emojiCols}
          keyExtractor={(e) => e}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.gridPad}
          renderItem={({ item }) => (
            <Pressable onPress={() => onPickEmoji(item)} style={[styles.emojiCell, { width: `${100 / emojiCols}%` }]}>
              <Text style={styles.emoji}>{item}</Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          key={`stickers-${stickerCols}`}
          data={stickers}
          numColumns={stickerCols}
          keyExtractor={(s) => s.id}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.gridPad}
          ListEmptyComponent={
            <Text style={styles.empty}>Sticker bạn gửi gần đây sẽ hiện ở đây.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPickSticker(item)}
              style={({ pressed }) => [styles.cell, { width: `${100 / stickerCols}%` }, pressed && styles.cellPressed]}
              accessibilityLabel={`Sticker ${item.label}`}
            >
              <ExpoImage
                source={{ uri: item.url }}
                style={styles.sticker}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={120}
              />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

export default React.memo(StickerPanelBase);

const mk_styles = (C: ThemeTokens) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: C.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: C.border,
    },
    grabber: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.line,
      marginTop: 6,
    },
    tabs: {
      flexDirection: "row",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.border,
    },
    tab: { flex: 1, alignItems: "center", paddingTop: 8 },
    tabImg: { width: 28, height: 28 },
    tabLine: { marginTop: 6, height: 3, width: 44, borderRadius: 2, backgroundColor: "transparent" },
    title: { fontSize: 15, fontWeight: "800", color: C.text, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
    gridPad: { paddingHorizontal: 8, paddingBottom: 10 },
    cell: { width: "25%", aspectRatio: 1, padding: 5, borderRadius: 14 },
    cellPressed: { backgroundColor: C.field, transform: [{ scale: 0.94 }] },
    sticker: { width: "100%", height: "100%" },
    emojiCell: { width: "12.5%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
    emoji: { fontSize: 27 },
    empty: { textAlign: "center", color: C.muted, fontSize: 13, paddingVertical: 36, paddingHorizontal: 24 },
  });
