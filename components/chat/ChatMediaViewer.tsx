// components/chat/ChatMediaViewer.tsx — xem ảnh/video trong hội thoại toàn màn hình:
// vuốt qua lại, dải ảnh nhỏ, Lưu về máy / Chia sẻ / Trả lời.
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { Image as ExpoImage } from "expo-image";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppModal from "@/components/ui/AppModal";
import { Text } from "@/components/ui/i18nText";

let mediaLibrary: typeof import("expo-media-library") | null = null;
try {
  mediaLibrary = require("expo-media-library");
} catch {
  /* Bản cài cũ có thể thiếu module native → dùng bảng Chia sẻ. */
}

export type ChatMedia = {
  key: string;
  type: "image" | "video";
  url: string;
  senderName: string;
  timeLabel: string;
  msg: any;
};

const pad = (n: number) => String(n).padStart(2, "0");
export function mediaTimeLabel(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function extOf(m: ChatMedia) {
  const hit = /\.(png|webp|jpe?g|gif|heic|mp4|mov|m4v|webm)(?:[?#]|$)/i.exec(m.url)?.[1];
  if (hit) return hit.toLowerCase();
  return m.type === "video" ? "mp4" : "jpg";
}

async function downloadToCache(m: ChatMedia) {
  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!dir) throw new Error("Không có bộ nhớ tạm để tải tệp.");
  const res = await FileSystem.downloadAsync(m.url, `${dir}pickletour-chat-${Date.now()}.${extOf(m)}`);
  if (res.status < 200 || res.status >= 300) throw new Error("Không tải được tệp.");
  return res.uri;
}

function VideoPage({ url, active, width, height }: { url: string; active: boolean; width: number; height: number }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  useEffect(() => {
    try {
      if (active) player.play();
      else player.pause();
    } catch {}
  }, [active, player]);
  return (
    <View style={{ width, height, justifyContent: "center" }}>
      <VideoView
        player={player}
        style={{ width, height: height * 0.72 }}
        contentFit="contain"
        nativeControls
        allowsPictureInPicture={false}
      />
    </View>
  );
}

function ViewerBody({
  items,
  startIndex,
  onClose,
  onReply,
}: {
  items: ChatMedia[];
  startIndex: number;
  onClose: () => void;
  onReply?: (msg: any) => void;
}) {
  const insets = useSafeAreaInsets(); // đo trong cửa sổ modal (AppModal có SafeAreaProvider riêng)
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(Math.min(Math.max(0, startIndex), Math.max(0, items.length - 1)));
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<FlatList<ChatMedia>>(null);
  const stripRef = useRef<FlatList<ChatMedia>>(null);
  const current = items[index];

  const showToast = useCallback(
    (text: string) => {
      setToast(text);
      toastAnim.setValue(0);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(1700),
        Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setToast(null);
      });
    },
    [toastAnim],
  );

  useEffect(() => {
    if (items.length > 1) {
      try {
        stripRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      } catch {}
    }
  }, [index, items.length]);

  const goTo = (i: number) => {
    setIndex(i);
    try {
      pagerRef.current?.scrollToIndex({ index: i, animated: false });
    } catch {}
  };

  const save = async () => {
    if (!current || busy) return;
    setBusy("save");
    try {
      const uri = await downloadToCache(current);
      let saved = false;
      if (mediaLibrary?.saveToLibraryAsync) {
        try {
          const perm = await mediaLibrary.requestPermissionsAsync(true);
          if (perm.granted) {
            await mediaLibrary.saveToLibraryAsync(uri);
            saved = true;
            showToast(current.type === "video" ? "Đã lưu video vào thư viện" : "Đã lưu vào thư viện ảnh");
          } else if (perm.canAskAgain === false) {
            Alert.alert(
              "Cần quyền truy cập Ảnh",
              "Hãy cho phép PickleTour lưu ảnh trong phần Cài đặt, hoặc chọn \"Lưu\" ở bảng chia sẻ.",
            );
          }
        } catch {
          saved = false;
        }
      }
      if (!saved && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { dialogTitle: "Lưu hoặc chia sẻ" });
      }
    } catch (e: any) {
      Alert.alert("Không lưu được", e?.message || "Vui lòng thử lại.");
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    if (!current || busy) return;
    setBusy("share");
    try {
      const uri = await downloadToCache(current);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { dialogTitle: "Chia sẻ" });
      }
    } catch (e: any) {
      Alert.alert("Không chia sẻ được", e?.message || "Vui lòng thử lại.");
    } finally {
      setBusy(null);
    }
  };

  if (!current) return null;

  return (
    <View style={styles.root}>
      <FlatList
        ref={pagerRef}
        data={items}
        horizontal
        pagingEnabled
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(m) => m.key}
        showsHorizontalScrollIndicator={false}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
          if (i !== index && i >= 0 && i < items.length) setIndex(i);
        }}
        renderItem={({ item, index: i }) =>
          item.type === "video" ? (
            <VideoPage url={item.url} active={i === index} width={width} height={height} />
          ) : (
            <ScrollView
              style={{ width, height }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
              maximumZoomScale={Platform.OS === "ios" ? 4 : 1}
              minimumZoomScale={1}
              centerContent
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              <ExpoImage source={{ uri: item.url }} style={{ width, height: height * 0.78 }} contentFit="contain" />
            </ScrollView>
          )
        }
      />

      {/* Thanh trên */}
      <View style={[styles.top, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <Pressable onPress={onClose} hitSlop={10} style={styles.roundBtn} accessibilityLabel="Đóng">
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }} pointerEvents="none">
          <Text style={styles.topName} numberOfLines={1}>
            {current.senderName}
          </Text>
          <Text style={styles.topTime}>{current.timeLabel}</Text>
          {items.length > 1 ? (
            <Text style={styles.topCount}>
              {index + 1}/{items.length}
            </Text>
          ) : null}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              top: insets.top + 92,
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color="#C5F433" />
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      ) : null}

      {/* Dải ảnh nhỏ + nút */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {items.length > 1 ? (
          <FlatList
            ref={stripRef}
            data={items}
            horizontal
            keyExtractor={(m) => `t-${m.key}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
            getItemLayout={(_, i) => ({ length: 64, offset: 64 * i, index: i })}
            onScrollToIndexFailed={() => {}}
            style={{ marginBottom: 10, flexGrow: 0 }}
            renderItem={({ item, index: i }) => (
              <Pressable onPress={() => goTo(i)} style={[styles.thumb, i === index && styles.thumbOn]}>
                {item.type === "image" ? (
                  <ExpoImage source={{ uri: item.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.thumbVideo]}>
                    <Ionicons name="play" size={18} color="#fff" />
                  </View>
                )}
              </Pressable>
            )}
          />
        ) : null}
        <View style={styles.actions}>
          <Pressable onPress={save} disabled={!!busy} style={styles.action}>
            {busy === "save" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="download-outline" size={24} color="#fff" />
            )}
            <Text style={styles.actionText}>Lưu về máy</Text>
          </Pressable>
          <Pressable onPress={share} disabled={!!busy} style={styles.action}>
            {busy === "share" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="share-social-outline" size={24} color="#fff" />
            )}
            <Text style={styles.actionText}>Chia sẻ</Text>
          </Pressable>
          {onReply ? (
            <Pressable
              onPress={() => {
                onReply(current.msg);
                onClose();
              }}
              style={styles.action}
            >
              <Ionicons name="arrow-undo-outline" size={24} color="#fff" />
              <Text style={styles.actionText}>Trả lời</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function ChatMediaViewer({
  visible,
  items,
  index,
  onClose,
  onReply,
}: {
  visible: boolean;
  items: ChatMedia[];
  index: number;
  onClose: () => void;
  onReply?: (msg: any) => void;
}) {
  return (
    <AppModal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {visible ? <ViewerBody items={items} startIndex={index} onClose={onClose} onReply={onReply} /> : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.3)",
  },
  topName: { color: "#fff", fontSize: 16, fontWeight: "800" },
  topTime: { color: "rgba(255,255,255,0.75)", fontSize: 12.5, marginTop: 1 },
  topCount: { color: "rgba(255,255,255,0.75)", fontSize: 12.5, marginTop: 6, fontWeight: "700" },
  toast: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(10,60,30,0.94)",
    borderWidth: 1,
    borderColor: "rgba(120,220,90,0.55)",
  },
  toastText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 10, backgroundColor: "rgba(0,0,0,0.45)" },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#1b1b1b",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbOn: { borderColor: "#00B2FF" },
  thumbVideo: { alignItems: "center", justifyContent: "center", backgroundColor: "#222" },
  actions: {
    flexDirection: "row",
    marginHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  action: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 3, minHeight: 62 },
  actionText: { color: "#fff", fontSize: 12.5, fontWeight: "600" },
});
