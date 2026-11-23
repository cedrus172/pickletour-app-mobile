// components/story/StoryComposer.tsx — xem trước + đăng story (ảnh/video đã chọn).
// Người dùng thường: story hiện 24 giờ. Tài khoản được cấp quyền: chọn thêm "Vĩnh viễn" + gắn liên kết.
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppModal from "@/components/ui/AppModal";
import { Text } from "@/components/ui/i18nText";
import { TextInput } from "@/components/ui/i18nTextInput";
import { useUploadFeedMediaMutation } from "@/slices/feedApiSlice";
import { useCreateStoryMutation } from "@/slices/storiesApiSlice";
import PostAsPicker, { usePostablePages, type PostAsPage } from "@/components/fanpage/PostAsPicker";

export type PickedStoryMedia = {
  uri: string;
  type: "image" | "video";
  width?: number;
  height?: number;
  durationSec?: number;
  mime?: string;
  fileName?: string;
};

function PreviewVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
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

function ComposerBody({
  media,
  canPermanent: canPermanentSelf,
  onClose,
  onPosted,
}: {
  media: PickedStoryMedia;
  canPermanent: boolean;
  onClose: () => void;
  onPosted: () => void;
}) {
  const insets = useSafeAreaInsets(); // trong cửa sổ modal
  // Đăng dưới tên Fanpage (admin: trang PickleTour). Trang chính thức / có dấu tích được đăng vĩnh viễn.
  const pages = usePostablePages();
  const [asPage, setAsPage] = useState<PostAsPage | null>(null);
  const canPermanent = canPermanentSelf || Boolean(asPage?.isOfficial || asPage?.verified);
  const [caption, setCaption] = useState("");
  const [permanent, setPermanent] = useState(canPermanent);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [kb, setKb] = useState(false);
  const [uploadMedia] = useUploadFeedMediaMutation();
  const [createStory] = useCreateStoryMutation();

  useEffect(() => {
    const a = Keyboard.addListener("keyboardDidShow", () => setKb(true));
    const b = Keyboard.addListener("keyboardDidHide", () => setKb(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    Keyboard.dismiss();
    try {
      let uri = media.uri;
      let width = media.width;
      let height = media.height;
      let mime = media.mime || (media.type === "video" ? "video/mp4" : "image/jpeg");
      if (media.type === "image") {
        try {
          const r = await ImageManipulator.manipulateAsync(
            uri,
            (media.width || 0) > 1440 ? [{ resize: { width: 1440 } }] : [],
            { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
          );
          uri = r.uri;
          width = r.width;
          height = r.height;
          mime = "image/jpeg";
        } catch {}
      }
      const fd = new FormData();
      const ext = media.type === "video" ? (mime.includes("quicktime") ? "mov" : "mp4") : "jpg";
      fd.append("files", { uri, name: media.fileName || `story-${Date.now()}.${ext}`, type: mime } as any);
      const up: any = await uploadMedia(fd).unwrap();
      const m = (up?.media || [])[0];
      if (!m?.url) throw new Error("Tải tệp lên thất bại.");
      await createStory({
        media: { type: media.type, url: m.url, mime: m.mime || mime, width, height, durationSec: media.durationSec },
        caption: caption.trim(),
        permanent: canPermanent && permanent,
        linkUrl: canPermanent ? linkUrl.trim() : "",
        linkLabel: canPermanent ? linkLabel.trim() : "",
        asPage: asPage?._id || undefined,
      }).unwrap();
      onPosted();
    } catch (e: any) {
      Alert.alert("Không đăng được story", e?.data?.message || e?.message || "Vui lòng thử lại.");
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss}>
        {media.type === "video" ? (
          <PreviewVideo uri={media.uri} />
        ) : (
          <ExpoImage source={{ uri: media.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
        )}
      </Pressable>

      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0)"]}
        style={[styles.top, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <Pressable onPress={onClose} disabled={busy} hitSlop={10} style={styles.roundBtn} accessibilityLabel="Huỷ">
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Story mới</Text>
        <View style={{ width: 42 }} />
      </LinearGradient>

      {/* Khối nhập liệu KHÔNG đặt absolute để KeyboardAvoidingView đẩy được lên trên bàn phím */}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        pointerEvents="box-none"
      >
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.82)"]}
        style={[styles.bottom, { paddingBottom: kb ? 12 : Math.max(insets.bottom, 14) + 6 }]}
      >
        <PostAsPicker pages={pages} value={asPage?._id || null} onChange={(_id, page) => setAsPage(page)} />
        {canPermanent ? (
          <View style={styles.durRow}>
            <Text style={styles.durLabel}>Thời gian hiển thị</Text>
            <View style={styles.seg}>
              <Pressable style={[styles.segItem, !permanent && styles.segOn]} onPress={() => setPermanent(false)}>
                <Text style={[styles.segText, !permanent && styles.segTextOn]}>24 giờ</Text>
              </Pressable>
              <Pressable style={[styles.segItem, permanent && styles.segOn]} onPress={() => setPermanent(true)}>
                <Text style={[styles.segText, permanent && styles.segTextOn]}>Vĩnh viễn</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.hintRow}>
            <Ionicons name="time-outline" size={15} color="rgba(255,255,255,0.85)" />
            <Text style={styles.hint}>Story sẽ tự ẩn sau 24 giờ</Text>
          </View>
        )}
        {canPermanent ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1.6 }]}
              placeholder="Liên kết (không bắt buộc)"
              placeholderTextColor="rgba(255,255,255,0.55)"
              value={linkUrl}
              onChangeText={setLinkUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Chữ trên nút"
              placeholderTextColor="rgba(255,255,255,0.55)"
              value={linkLabel}
              onChangeText={setLinkLabel}
              maxLength={40}
            />
          </View>
        ) : null}
        <View style={styles.captionRow}>
          <TextInput
            style={[styles.input, styles.caption]}
            placeholder="Viết chú thích…"
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={caption}
            onChangeText={setCaption}
            maxLength={300}
            multiline
          />
          <Pressable onPress={submit} disabled={busy} style={[styles.postBtn, busy && { opacity: 0.7 }]}>
            {busy ? (
              <ActivityIndicator color="#0B1B3A" />
            ) : (
              <>
                <Text style={styles.postText}>Đăng</Text>
                <Ionicons name="send" size={16} color="#0B1B3A" />
              </>
            )}
          </Pressable>
        </View>
        {busy ? <Text style={styles.busy}>Đang tải lên, vui lòng giữ nguyên màn hình…</Text> : null}
      </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function StoryComposer({
  media,
  canPermanent,
  onClose,
  onPosted,
}: {
  media: PickedStoryMedia | null;
  canPermanent: boolean;
  onClose: () => void;
  onPosted: () => void;
}) {
  return (
    <AppModal
      visible={!!media}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {media ? (
        <ComposerBody media={media} canPermanent={canPermanent} onClose={onClose} onPosted={onPosted} />
      ) : null}
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 26,
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },
  kav: { flex: 1, justifyContent: "flex-end" },
  bottom: { paddingHorizontal: 14, paddingTop: 40, gap: 10 },
  durRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  durLabel: { color: "#fff", fontSize: 13.5, fontWeight: "700" },
  seg: { flexDirection: "row", padding: 3, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)" },
  segItem: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  segOn: { backgroundColor: "#fff" },
  segText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  segTextOn: { color: "#0B1B3A" },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  hint: { color: "rgba(255,255,255,0.85)", fontSize: 12.5 },
  input: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    fontSize: 15,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
  },
  captionRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  caption: { flex: 1, maxHeight: 110 },
  postBtn: {
    height: 44,
    minWidth: 92,
    paddingHorizontal: 16,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#C5F433",
  },
  postText: { color: "#0B1B3A", fontSize: 15, fontWeight: "800" },
  busy: { color: "rgba(255,255,255,0.8)", fontSize: 12, textAlign: "center" },
});
