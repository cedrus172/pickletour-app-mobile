// components/story/StoryBar.tsx — thanh Story đầu Bảng tin (kiểu Facebook).
// "Story của bạn" (đăng mới) + story của mọi người, gom theo người đăng.
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSelector } from "react-redux";

import { AuthorAvatar } from "@/components/social/AuthorAvatar";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { sk } from "@/hooks/uiVersion";
import { useGetStoryFeedQuery } from "@/slices/storiesApiSlice";
import StoryComposer, { type PickedStoryMedia } from "./StoryComposer";
import StoryViewer from "./StoryViewer";

const AVATAR = 62;
const RING = AVATAR + 10;
const RING_UNSEEN: [string, string] = ["#C5F433", "#22C55E"];

const nameOf = (u: any) => u?.nickname || u?.name || "Người dùng";

function StoryBarBase({ refreshKey = 0 }: { refreshKey?: number }) {
  const C = useThemeTokens();
  const styles = useMemo(() => mk_styles(C), [C]);
  const me = useSelector((s: any) => s.auth?.userInfo);
  const { data, refetch } = useGetStoryFeedQuery(undefined);
  // Nạp lại khi quay lại tab Bảng tin hoặc khi người dùng kéo để làm mới
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );
  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey, refetch]);
  const groups: any[] = useMemo(() => data?.items || [], [data?.items]);
  const mine = useMemo(() => groups.find((g) => g.isMine) || null, [groups]);
  const others = useMemo(() => groups.filter((g) => !g.isMine), [groups]);
  const canPermanent = !!data?.me?.canPermanent;

  const [viewerAt, setViewerAt] = useState<number | null>(null); // vị trí trong groups
  const [picked, setPicked] = useState<PickedStoryMedia | null>(null);

  const startCreate = useCallback(async () => {
    if (!me) {
      router.push("/login" as any);
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Cần quyền truy cập Ảnh", "Hãy cho phép PickleTour truy cập thư viện ảnh để chọn ảnh hoặc video cho story.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: false,
        quality: 0.85,
        videoMaxDuration: 60,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium as any,
      });
      const a = res.canceled ? null : res.assets?.[0];
      if (!a) return;
      const isVideo = a.type === "video";
      if (isVideo && Number(a.duration || 0) > 61000) {
        Alert.alert("Video quá dài", "Story chỉ nhận video tối đa 60 giây.");
        return;
      }
      if (Number(a.fileSize || 0) > 50 * 1024 * 1024) {
        Alert.alert("Tệp quá lớn", "Story chỉ nhận tệp tối đa 50MB.");
        return;
      }
      setPicked({
        uri: a.uri,
        type: isVideo ? "video" : "image",
        width: a.width,
        height: a.height,
        durationSec: isVideo ? Math.round(Number(a.duration || 0) / 1000) : undefined,
        mime: a.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
        fileName: a.fileName || undefined,
      });
    } catch (e: any) {
      Alert.alert("Không mở được thư viện ảnh", e?.message || "Vui lòng thử lại.");
    }
  }, [me]);

  const openGroup = useCallback(
    (g: any) => {
      const i = groups.indexOf(g);
      if (i >= 0) setViewerAt(i);
    },
    [groups],
  );

  // Khách chưa đăng nhập và chưa ai đăng story → không hiện thanh
  if (!me && !others.length) return null;

  return (
    <View style={styles.wrap}>
      <FlatList
        horizontal
        data={others}
        keyExtractor={(g) => String(g.author?._id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          me ? (
            <View style={styles.item}>
              <Pressable onPress={mine ? () => openGroup(mine) : startCreate} accessibilityLabel="Story của bạn">
                {mine ? (
                  <View style={[styles.ring, styles.ringSeen]}>
                    <View style={styles.ringGap}>
                      <AuthorAvatar user={me} size={AVATAR} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.ringNone}>
                    <AuthorAvatar user={me} size={AVATAR} />
                  </View>
                )}
              </Pressable>
              <Pressable onPress={startCreate} hitSlop={8} style={styles.plus} accessibilityLabel="Đăng story mới">
                <Ionicons name="add" size={18} color="#fff" />
              </Pressable>
              <Text style={styles.name} numberOfLines={1}>
                Story của bạn
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item: g }) => (
          <Pressable style={styles.item} onPress={() => openGroup(g)}>
            {g.hasUnseen ? (
              <LinearGradient colors={RING_UNSEEN} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ring}>
                <View style={styles.ringGap}>
                  <AuthorAvatar user={g.author} size={AVATAR} />
                </View>
              </LinearGradient>
            ) : (
              <View style={[styles.ring, styles.ringSeen]}>
                <View style={styles.ringGap}>
                  <AuthorAvatar user={g.author} size={AVATAR} />
                </View>
              </View>
            )}
            {g.author?.featured ? (
              <View style={styles.badge}>
                <Ionicons name="checkmark" size={11} color="#fff" />
              </View>
            ) : null}
            <Text style={[styles.name, g.hasUnseen && styles.nameUnseen]} numberOfLines={1}>
              {nameOf(g.author)}
            </Text>
          </Pressable>
        )}
      />

      <StoryViewer
        visible={viewerAt != null}
        groups={groups}
        startIndex={viewerAt ?? 0}
        onClose={() => {
          setViewerAt(null);
          refetch();
        }}
      />
      <StoryComposer
        media={picked}
        canPermanent={canPermanent}
        onClose={() => setPicked(null)}
        onPosted={() => {
          setPicked(null);
          refetch();
        }}
      />
    </View>
  );
}

export default React.memo(StoryBarBase);

const mk_styles = (C: ThemeTokens) =>
  StyleSheet.create({
    wrap: { marginBottom: 12 },
    list: { paddingHorizontal: 12, gap: 6 },
    item: { width: RING + 14, alignItems: "center" },
    ring: { width: RING, height: RING, borderRadius: RING / 2, alignItems: "center", justifyContent: "center" },
    ringSeen: { backgroundColor: C.line },
    ringNone: { width: RING, height: RING, alignItems: "center", justifyContent: "center" },
    ringGap: {
      width: RING - 5,
      height: RING - 5,
      borderRadius: (RING - 5) / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.bg,
    },
    plus: {
      position: "absolute",
      top: RING - 24,
      right: 2,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: sk("#1E9BFF", "#1466F2"),
      borderWidth: 2.5,
      borderColor: C.bg,
    },
    badge: {
      position: "absolute",
      top: RING - 20,
      right: 6,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: sk("#1E9BFF", "#1466F2"),
      borderWidth: 2,
      borderColor: C.bg,
    },
    name: { marginTop: 6, fontSize: 12, color: C.sub, maxWidth: RING + 12, textAlign: "center" },
    nameUnseen: { color: C.text, fontWeight: "700" },
  });
