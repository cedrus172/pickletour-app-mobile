// components/story/StoryViewer.tsx — xem story toàn màn hình.
// Chạm phải/trái: sang story sau/trước · giữ: tạm dừng · vuốt xuống hoặc nút ✕: đóng.
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import { AuthorAvatar } from "@/components/social/AuthorAvatar";
import AppModal from "@/components/ui/AppModal";
import { Text } from "@/components/ui/i18nText";
import {
  storiesApiSlice,
  useDeleteStoryMutation,
  useGetStoryViewersQuery,
  useReportStoryMutation,
  useViewStoryMutation,
} from "@/slices/storiesApiSlice";

const IMAGE_MS = 5000;
const TICK_MS = 50;
const nameOf = (u: any) => u?.nickname || u?.name || "Người dùng";
const pad = (n: number) => String(n).padStart(2, "0");

function timeAgo(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} ngày`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function StoryVideo({
  url,
  paused,
  onProgress,
  onEnd,
  onReady,
}: {
  url: string;
  paused: boolean;
  onProgress: (p: number) => void;
  onEnd: () => void;
  onReady: () => void;
}) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.play();
  });
  const endedRef = useRef(false);
  useEffect(() => {
    try {
      if (paused) player.pause();
      else player.play();
    } catch {}
  }, [paused, player]);
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const dur = Number((player as any).duration) || 0;
        const cur = Number((player as any).currentTime) || 0;
        if (dur > 0) {
          onReady();
          onProgress(Math.min(1, cur / dur));
          if (!endedRef.current && cur >= dur - 0.15) {
            endedRef.current = true;
            onEnd();
          }
        }
      } catch {}
    }, 100);
    return () => clearInterval(id);
  }, [player, onProgress, onEnd, onReady]);
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  );
}

function ViewersSheet({ storyId, onClose }: { storyId: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { data, isFetching } = useGetStoryViewersQuery(storyId);
  const items: any[] = data?.items || [];
  return (
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.sheetGrabber} />
        <Text style={styles.sheetTitle}>{`${data?.count ?? 0} người đã xem`}</Text>
        {isFetching && !items.length ? <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} /> : null}
        <FlatList
          data={items}
          keyExtractor={(v, i) => String(v.user?._id || i)}
          style={{ maxHeight: 360 }}
          ListEmptyComponent={
            isFetching ? null : <Text style={styles.sheetEmpty}>Chưa có ai xem story này.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.viewerRow}
              onPress={() => {
                onClose();
                if (item.user?._id) router.push(`/profile/${String(item.user._id)}` as any);
              }}
            >
              <AuthorAvatar user={item.user} size={36} />
              <Text style={styles.viewerName} numberOfLines={1}>
                {nameOf(item.user)}
              </Text>
              <Text style={styles.viewerTime}>{timeAgo(item.at)}</Text>
            </Pressable>
          )}
        />
      </Pressable>
    </Pressable>
  );
}

function ViewerBody({ groups, startIndex, onClose }: { groups: any[]; startIndex: number; onClose: () => void }) {
  const insets = useSafeAreaInsets(); // trong cửa sổ modal (AppModal có SafeAreaProvider riêng)
  const { width, height } = useWindowDimensions();
  const dispatch = useDispatch();
  const me = useSelector((s: any) => s.auth?.userInfo);
  const meId = String(me?._id || "");
  const isAdmin = me?.role === "admin";

  // Chụp danh sách lúc mở để thứ tự không nhảy khi dữ liệu nạp lại
  // (bản sao riêng: dữ liệu trong kho RTK bị đóng băng, không sửa trực tiếp được)
  const frozen = useRef<any[]>(JSON.parse(JSON.stringify(groups || []))).current;
  const [gi, setGi] = useState(Math.min(Math.max(0, startIndex), Math.max(0, frozen.length - 1)));
  const group = frozen[gi];
  const stories: any[] = group?.stories || [];
  const firstUnseen = useCallback((g: any) => {
    const i = (g?.stories || []).findIndex((s: any) => !s.seen);
    return i < 0 ? 0 : i;
  }, []);
  const [si, setSi] = useState(() => (group?.isMine ? 0 : firstUnseen(group)));
  const story = stories[si];
  const isMine = String(group?.author?._id || "") === meId;

  const [held, setHeld] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const paused = held || sheet;

  const [viewStory] = useViewStoryMutation();
  const [deleteStory] = useDeleteStoryMutation();
  const [reportStory] = useReportStoryMutation();

  const next = useCallback(() => {
    if (si < stories.length - 1) {
      setSi(si + 1);
    } else if (gi < frozen.length - 1) {
      const g = frozen[gi + 1];
      setGi(gi + 1);
      setSi(g?.isMine ? 0 : firstUnseen(g));
    } else {
      onClose();
    }
  }, [si, stories.length, gi, frozen, firstUnseen, onClose]);

  const prev = useCallback(() => {
    if (si > 0) {
      setSi(si - 1);
    } else if (gi > 0) {
      const g = frozen[gi - 1];
      setGi(gi - 1);
      setSi(Math.max(0, (g?.stories?.length || 1) - 1));
    } else {
      setProgress(0);
    }
  }, [si, gi, frozen]);

  // Đổi story → đặt lại tiến độ + ghi nhận lượt xem
  const storyId = story?._id ? String(story._id) : "";
  useEffect(() => {
    setProgress(0);
    setLoaded(false);
    if (!storyId || !meId || isMine || story?.seen) return;
    story.seen = true; // bản chụp cục bộ
    viewStory(storyId);
    dispatch(
      (storiesApiSlice.util as any).updateQueryData("getStoryFeed", undefined, (draft: any) => {
        for (const g of draft?.items || []) {
          for (const s of g.stories || []) {
            if (String(s._id) === storyId) s.seen = true;
          }
          if (!g.isMine) g.hasUnseen = (g.stories || []).some((s: any) => !s.seen);
        }
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  // Ảnh: tự chạy 5 giây
  const isVideo = story?.media?.type === "video";
  const nextRef = useRef(next);
  nextRef.current = next;
  useEffect(() => {
    if (!storyId || isVideo || paused || !loaded) return;
    const id = setInterval(() => {
      setProgress((p) => {
        const np = p + TICK_MS / IMAGE_MS;
        if (np >= 1) {
          clearInterval(id);
          setTimeout(() => nextRef.current(), 0);
          return 1;
        }
        return np;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [storyId, isVideo, paused, loaded]);

  const onVideoEnd = useCallback(() => nextRef.current(), []);
  const onVideoReady = useCallback(() => setLoaded(true), []);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 14 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
        onPanResponderRelease: (_e, g) => {
          if (g.dy > 70) onClose();
        },
      }),
    [onClose],
  );

  const openMenu = () => {
    setHeld(true);
    const done = () => setHeld(false);
    const opts: any[] = [];
    if (isMine || isAdmin) {
      opts.push({
        text: "Xoá story",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteStory(storyId).unwrap();
            stories.splice(si, 1);
            if (!stories.length) {
              onClose();
            } else {
              setSi(Math.min(si, stories.length - 1));
              done();
            }
          } catch (e: any) {
            done();
            Alert.alert("Không xoá được", e?.data?.message || "Vui lòng thử lại.");
          }
        },
      });
    }
    if (!isMine && meId) {
      opts.push({
        text: "Báo cáo story",
        style: "destructive",
        onPress: async () => {
          try {
            await reportStory({ id: storyId, reason: "other" }).unwrap();
            Alert.alert("Đã gửi báo cáo", "Cảm ơn bạn. Story này sẽ không hiện với bạn nữa.");
            next();
          } catch (e: any) {
            Alert.alert("Không gửi được", e?.data?.message || "Vui lòng thử lại.");
          } finally {
            done();
          }
        },
      });
    }
    if (!isMine) {
      opts.push({
        text: "Xem trang cá nhân",
        onPress: () => {
          onClose();
          if (group?.author?._id) router.push(`/profile/${String(group.author._id)}` as any);
        },
      });
    }
    opts.push({ text: "Đóng", style: "cancel", onPress: done });
    Alert.alert("Story", undefined, opts, { cancelable: true, onDismiss: done });
  };

  if (!story) return null;

  return (
    <View style={styles.root} {...pan.panHandlers}>
      <View style={StyleSheet.absoluteFill}>
        {isVideo ? (
          <StoryVideo
            key={storyId}
            url={story.media.url}
            paused={paused}
            onProgress={setProgress}
            onEnd={onVideoEnd}
            onReady={onVideoReady}
          />
        ) : (
          <ExpoImage
            key={storyId}
            source={{ uri: story.media?.url }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            cachePolicy="memory-disk"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        )}
        {!loaded ? (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </View>

      {/* Vùng chạm: trái = lùi, phải = tới, giữ = tạm dừng */}
      <View style={[StyleSheet.absoluteFill, { flexDirection: "row" }]}>
        <Pressable
          style={{ width: width * 0.3, height }}
          onPress={prev}
          onLongPress={() => setHeld(true)}
          onPressOut={() => setHeld(false)}
          delayLongPress={180}
        />
        <Pressable
          style={{ flex: 1, height }}
          onPress={next}
          onLongPress={() => setHeld(true)}
          onPressOut={() => setHeld(false)}
          delayLongPress={180}
        />
      </View>

      {/* Trên: thanh tiến độ + người đăng */}
      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0)"]}
        style={[styles.top, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <View style={styles.bars} pointerEvents="none">
          {stories.map((s, i) => (
            <View key={String(s._id)} style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(i < si ? 1 : i === si ? progress : 0) * 100}%` }]} />
            </View>
          ))}
        </View>
        <View style={styles.authorRow} pointerEvents="box-none">
          <Pressable
            style={styles.authorTap}
            onPress={() => {
              onClose();
              if (group?.author?._id) router.push(`/profile/${String(group.author._id)}` as any);
            }}
          >
            <AuthorAvatar user={group.author} size={38} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {isMine ? "Story của bạn" : nameOf(group.author)}
                </Text>
                {group.author?.featured ? <Ionicons name="checkmark-circle" size={15} color="#3EA6FF" /> : null}
              </View>
              <Text style={styles.authorSub} numberOfLines={1}>
                {timeAgo(story.createdAt)}
                {story.permanent ? " · Vĩnh viễn" : ""}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={openMenu} hitSlop={10} style={styles.iconBtn} accessibilityLabel="Tuỳ chọn">
            <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
          </Pressable>
          <Pressable onPress={onClose} hitSlop={10} style={styles.iconBtn} accessibilityLabel="Đóng">
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Dưới: chú thích, liên kết, lượt xem */}
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.72)"]}
        style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}
        pointerEvents="box-none"
      >
        {story.caption ? <Text style={styles.caption}>{story.caption}</Text> : null}
        {story.linkUrl ? (
          <Pressable
            style={styles.linkBtn}
            onPress={() => Linking.openURL(story.linkUrl).catch(() => {})}
          >
            <Ionicons name="link" size={17} color="#0B1B3A" />
            <Text style={styles.linkText} numberOfLines={1}>
              {story.linkLabel || "Xem thêm"}
            </Text>
          </Pressable>
        ) : null}
        {isMine ? (
          <Pressable style={styles.viewsBtn} onPress={() => setSheet(true)}>
            <Ionicons name="eye-outline" size={19} color="#fff" />
            <Text style={styles.viewsText}>{`${story.viewCount || 0} người xem`}</Text>
            <Ionicons name="chevron-up" size={16} color="#fff" />
          </Pressable>
        ) : null}
      </LinearGradient>

      {sheet ? <ViewersSheet storyId={storyId} onClose={() => setSheet(false)} /> : null}
    </View>
  );
}

export default function StoryViewer({
  visible,
  groups,
  startIndex,
  onClose,
}: {
  visible: boolean;
  groups: any[];
  startIndex: number;
  onClose: () => void;
}) {
  return (
    <AppModal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {visible ? <ViewerBody groups={groups} startIndex={startIndex} onClose={onClose} /> : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 10, paddingBottom: 28 },
  bars: { flexDirection: "row", gap: 4 },
  barTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)", overflow: "hidden" },
  barFill: { height: 3, borderRadius: 2, backgroundColor: "#fff" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  authorTap: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  authorName: { color: "#fff", fontSize: 15, fontWeight: "800", flexShrink: 1 },
  authorSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 1 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 44, gap: 12 },
  caption: { color: "#fff", fontSize: 15.5, lineHeight: 22, textAlign: "center" },
  linkBtn: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "86%",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#C5F433",
  },
  linkText: { color: "#0B1B3A", fontSize: 14.5, fontWeight: "800", flexShrink: 1 },
  viewsBtn: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  viewsText: { color: "#fff", fontSize: 13.5, fontWeight: "700" },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#101826",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  sheetGrabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.25)", marginBottom: 12 },
  sheetTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 8 },
  sheetEmpty: { color: "rgba(255,255,255,0.6)", textAlign: "center", paddingVertical: 28 },
  viewerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  viewerName: { flex: 1, color: "#fff", fontSize: 15, fontWeight: "600" },
  viewerTime: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
});
