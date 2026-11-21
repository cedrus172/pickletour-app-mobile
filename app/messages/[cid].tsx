import TournamentPaymentProofCard from "@/components/tournament/TournamentPaymentProofCard";
import { NotificationHeaderActions } from "@/components/GlobalNotificationShell";
// app/messages/[cid].tsx — Chat window (Messenger-like)
import {
  Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Clipboard from "expo-clipboard";
import { formatPrice } from "@/constants/market";
import { formatPlayTime,
  skillLabel } from "@/constants/play";
import { Stack,
  router,
  useLocalSearchParams } from "expo-router";
import { useVideoPlayer,
  VideoView } from "expo-video";
import {
  useAudioRecorder,
  useAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React,
  { useCallback,
  useEffect,
  useMemo,
  useRef,
  useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { TextInput } from "@/components/ui/i18nTextInput";
import { Text } from "@/components/ui/i18nText";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useChatKeyboard } from "@/hooks/useChatKeyboard";
import { useDispatch, useSelector } from "react-redux";

import { AuthorAvatar } from "@/components/social/AuthorAvatar";
import { UserActionsMenu } from "@/components/social/UserActionsMenu";
import { CallButton } from "@/components/social/CallButton";
import { MentionText } from "@/components/feed/MentionText";
import { useLazySearchUserQuery } from "@/slices/usersApiSlice";
import { useLazySearchTournamentsQuery } from "@/slices/tournamentsApiSlice";

import {
  useGetConversationQuery,
  useListMessagesQuery,
  useMarkReadMutation,
  useSendDmMessageMutation,
  useUploadChatMediaMutation,
  useDeleteMessageMutation,
  useReactMessageMutation,
  usePinMessageMutation,
  usePatchConversationMutation,
  useTypingMutation,
  messagesApiSlice,
} from "@/slices/messagesApiSlice";
import ChatMediaViewer, { mediaTimeLabel, type ChatMedia } from "@/components/chat/ChatMediaViewer";
import StickerPanel from "@/components/chat/StickerPanel";
import {
  isJumboEmoji,
  isStickerAttachment,
  pushRecentSticker,
  stickerOf,
  type Sticker,
} from "@/components/chat/stickers";
import { socket } from "@/lib/socket";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { sk } from "@/hooks/uiVersion";

const authorName = (u?: any) => u?.nickname || u?.name || "Người dùng";

const MS_5MIN = 5 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");
const _sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// Màu nhấn + dải màu của bong bóng tin mình gửi (V3 sáng dùng xanh dương đậm hơn)
const ACCENT = () => sk("#1E9BFF", "#1466F2");
const GRAD = () => sk(["#00B2FF", "#1677FF"], ["#2F8BFF", "#1466F2"]) as [string, string];

function replySnippet(rt: any): string {
  if (!rt) return "";
  if (rt.deletedAt) return "(tin nhắn đã xoá)";
  if (rt.content) return rt.content;
  const a = (rt.attachments || [])[0];
  if (a?.type === "image") return "📷 Ảnh";
  if (a?.type === "video") return "🎬 Video";
  if (a?.type === "audio") return "🎤 Tin thoại";
  if (a?.type) return "📎 Tệp";
  return "…";
}

// Format ngày dd/MM/yyyy hoặc range dd/MM - dd/MM/yyyy
function fmtDateRange(startIso?: string, endIso?: string) {
  if (!startIso) return "";
  const s = new Date(startIso);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}/${d.getFullYear()}`;
  if (!endIso || endIso === startIso) return fmt(s);
  const e = new Date(endIso);
  if (
    s.getMonth() === e.getMonth() &&
    s.getFullYear() === e.getFullYear() &&
    s.getDate() !== e.getDate()
  ) {
    return `${String(s.getDate()).padStart(2, "0")}–${fmt(e)}`;
  }
  return `${fmt(s)} → ${fmt(e)}`;
}

function ListingChatCardRN({ listing, isMine }: { listing: any; isMine: boolean }) {
  const C = useThemeTokens();
  if (!listing) return null;
  const img = listing.images?.[0]?.url || listing.images?.[0] || "";
  const sold = listing.status === "sold";
  return (
    <Pressable
      onPress={() =>
        listing._id && router.push(`/marketplace/${listing._id}` as any)
      }
      style={{
        marginTop: 6,
        width: 236,
        maxWidth: "100%",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: isMine ? "rgba(255,255,255,0.15)" : C.card,
        borderWidth: 1,
        borderColor: isMine ? "rgba(255,255,255,0.35)" : C.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 8 }}>
        <View style={{ width: 50, height: 50, borderRadius: 8, overflow: "hidden", backgroundColor: C.field }}>
          {img ? (
            <Image source={{ uri: img }} style={{ width: "100%", height: "100%" }} />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 22 }}>🛍️</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 10.5, fontWeight: "700", color: isMine ? "rgba(255,255,255,0.9)" : sk("#0066FF", "#1466F2") }}>
            🛍️ Sản phẩm trên Chợ
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "700", color: isMine ? "#fff" : C.text }}>
            {listing.title}
          </Text>
          <Text style={{ fontSize: 13.5, fontWeight: "900", color: isMine ? "#fff" : sk("#0066FF", "#1466F2") }}>
            {sold ? "Đã bán" : formatPrice(listing.price, listing.type)}
          </Text>
        </View>
      </View>
      <View
        style={{
          paddingVertical: 6,
          alignItems: "center",
          backgroundColor: isMine ? "rgba(255,255,255,0.25)" : sk("#0066FF", "#1466F2"),
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Xem sản phẩm →</Text>
      </View>
    </Pressable>
  );
}

function PlayChatCardRN({ play, isMine }: { play: any; isMine: boolean }) {
  const C = useThemeTokens();
  if (!play) return null;
  const slotsLeft = Math.max(0, (play.slots || 0) - (play.acceptedCount || 0));
  return (
    <Pressable
      onPress={() => play._id && router.push(`/play/${play._id}` as any)}
      style={{
        marginTop: 6,
        width: 240,
        maxWidth: "100%",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: isMine ? "rgba(255,255,255,0.15)" : C.card,
        borderWidth: 1,
        borderColor: isMine ? "rgba(255,255,255,0.35)" : C.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: isMine ? "rgba(255,255,255,0.2)" : "#16a34a" }}>
        <Text style={{ fontSize: 12 }}>🏓</Text>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Kèo giao lưu</Text>
      </View>
      <View style={{ padding: 10 }}>
        <Text numberOfLines={1} style={{ fontWeight: "700", fontSize: 13.5, color: isMine ? "#fff" : C.text }}>
          {play.title || play.courtName || "Kèo pickleball"}
        </Text>
        <Text style={{ fontSize: 12, color: isMine ? "rgba(255,255,255,0.85)" : C.sub }}>🕒 {formatPlayTime(play.playAt)}</Text>
        <Text numberOfLines={1} style={{ fontSize: 12, color: isMine ? "rgba(255,255,255,0.85)" : C.sub }}>
          {skillLabel(play.skillMin, play.skillMax)} · thiếu {slotsLeft}
        </Text>
        <View style={{ marginTop: 6, alignItems: "center", paddingVertical: 5, borderRadius: 8, backgroundColor: isMine ? "rgba(255,255,255,0.25)" : "#16a34a" }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{play.status === "open" ? "Tham gia →" : "Xem kèo →"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// Thẻ "Mời vào Game Hot": bấm "Vào phòng" → mở Game Hot và vào thẳng sân/phòng của người mời.
function ArcadeInviteCardRN({ invite, isMine }: { invite: any; isMine: boolean }) {
  const C = useThemeTokens();
  if (!invite?.courtId) return null;
  const expired = !!invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now();
  const disabled = isMine || expired;
  return (
    <Pressable
      disabled={disabled}
      onPress={() => router.push({ pathname: "/game-hot", params: { invite: String(invite.courtId) } } as any)}
      style={{
        marginTop: 6,
        width: 240,
        maxWidth: "100%",
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: isMine ? "rgba(255,255,255,0.15)" : C.card,
        borderWidth: 1,
        borderColor: isMine ? "rgba(255,255,255,0.35)" : C.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: isMine ? "rgba(255,255,255,0.2)" : "#0e7490" }}>
        <Text style={{ fontSize: 12 }}>🎮</Text>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Mời vào Game Hot</Text>
      </View>
      <View style={{ padding: 10 }}>
        <Text numberOfLines={1} style={{ fontWeight: "700", fontSize: 13.5, color: isMine ? "#fff" : C.text }}>{invite.label}</Text>
        <Text style={{ fontSize: 12, color: isMine ? "rgba(255,255,255,0.85)" : C.sub }}>
          {invite.mode === "doubles" ? "Đánh đôi" : "Đánh đơn"} · PickleTour Arcade 3D
        </Text>
        <View style={{ marginTop: 6, alignItems: "center", paddingVertical: 5, borderRadius: 8, backgroundColor: disabled ? "rgba(127,127,127,0.35)" : "#0e7490" }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{isMine ? "Đã gửi lời mời" : expired ? "Lời mời đã hết hạn" : "Vào phòng →"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function TournamentBubbleCard({ tour, isMine }: { tour: any; isMine: boolean }) {
  const C = useThemeTokens();
  const styles = useMemo(() => mk_styles(C), [C]);
  const dateStr = fmtDateRange(tour?.startDate, tour?.endDate);
  const regCount = Number(tour?.registrationCount || 0);
  const maxPairs = Number(tour?.maxPairs || 0);
  const labelColor = isMine ? "#FEF3C7" : C.amberText;
  const textColor = isMine ? "#fff" : C.text;
  const subColor = isMine ? "rgba(255,255,255,0.85)" : C.sub;
  return (
    <Pressable
      onPress={() => router.push(`/tournament/${tour._id}` as any)}
      style={[
        styles.msgTournamentCard,
        isMine && styles.msgTournamentCardMine,
      ]}
    >
      {tour.image ? (
        <Image source={{ uri: tour.image }} style={styles.msgTournamentImg} />
      ) : (
        <View
          style={[styles.msgTournamentImg, styles.msgTournamentImgFallback]}
        >
          <Ionicons name="trophy" size={22} color="#F59E0B" />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.msgTournamentLabel, { color: labelColor }]}>
          Giải đấu
        </Text>
        <Text
          style={[styles.msgTournamentName, { color: textColor }]}
          numberOfLines={2}
        >
          {tour.name}
        </Text>
        {tour.location ? (
          <View style={styles.tourInfoRow}>
            <Ionicons name="location-outline" size={12} color={subColor} />
            <Text
              style={[styles.tourInfoText, { color: subColor }]}
              numberOfLines={1}
            >
              {tour.location}
            </Text>
          </View>
        ) : null}
        {dateStr ? (
          <View style={styles.tourInfoRow}>
            <Ionicons name="calendar-outline" size={12} color={subColor} />
            <Text style={[styles.tourInfoText, { color: subColor }]}>
              {dateStr}
            </Text>
          </View>
        ) : null}
        {(regCount > 0 || maxPairs > 0) && (
          <View style={styles.tourInfoRow}>
            <Ionicons name="people-outline" size={12} color={subColor} />
            <Text style={[styles.tourInfoText, { color: subColor }]}>
              {regCount} cặp{maxPairs > 0 ? ` / ${maxPairs}` : ""} đã đăng ký
            </Text>
          </View>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={isMine ? "#DBEAFE" : C.muted}
      />
    </Pressable>
  );
}

// Thanh sóng âm giả lập (cố định theo URL) cho tin thoại
function waveOf(url: string, n = 26) {
  let h = 2166136261;
  for (let i = 0; i < url.length; i += 1) h = Math.imul(h ^ url.charCodeAt(i), 16777619) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    out.push(0.25 + ((h >>> 8) % 100) / 133);
  }
  return out;
}

function AudioMessage({ url, durationSec, isMine }: { url: string; durationSec?: number; isMine: boolean }) {
  const C = useThemeTokens();
  const player = useAudioPlayer(url);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const bars = useMemo(() => waveOf(url), [url]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      try {
        const p: any = player;
        const dur = Number(p?.duration) || Number(durationSec) || 0;
        if (dur > 0) setProgress(Math.min(1, (Number(p?.currentTime) || 0) / dur));
        if (p?.playing === false) {
          setPlaying(false);
          setProgress(0);
        }
      } catch {}
    }, 200);
    return () => clearInterval(id);
  }, [player, playing, durationSec]);
  const toggle = () => {
    try {
      if (playing) {
        player.pause();
        setPlaying(false);
      } else {
        player.seekTo(0);
        player.play();
        setPlaying(true);
      }
    } catch {}
  };
  const secs = Number(durationSec) || 0;
  const on = isMine ? "#fff" : ACCENT();
  const off = isMine ? "rgba(255,255,255,0.45)" : C.line;
  return (
    <Pressable onPress={toggle} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 2, minWidth: 190 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isMine ? "#fff" : ACCENT(),
        }}
      >
        <Ionicons name={playing ? "pause" : "play"} size={18} color={isMine ? ACCENT() : "#fff"} style={playing ? undefined : { marginLeft: 2 }} />
      </View>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 2, height: 28 }}>
        {bars.map((b, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: Math.max(4, b * 26),
              borderRadius: 2,
              backgroundColor: i / bars.length < progress ? on : playing ? off : isMine ? "rgba(255,255,255,0.8)" : C.muted,
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 12.5, fontWeight: "600", color: isMine ? "#EAF4FF" : C.text3 }}>
        {secs > 0 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : "🎤"}
      </Text>
    </Pressable>
  );
}

const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
function fmtDayPill(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (_sameDay(d, now)) return "Hôm nay";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (_sameDay(d, y)) return "Hôm qua";
  const dm = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  return d.getFullYear() === now.getFullYear()
    ? `${WEEKDAYS[d.getDay()]}, ${dm}`
    : `${dm}/${d.getFullYear()}`;
}
const fmtClock = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const senderIdOf = (m: any) => String(m?.sender?._id || m?.sender || "");
// Hai tin cùng cụm: cùng người gửi, cùng ngày, cách nhau ≤ 5 phút, không phải tin hệ thống
function sameCluster(a?: any, b?: any) {
  if (!a || !b || a.systemKind || b.systemKind) return false;
  if (senderIdOf(a) !== senderIdOf(b)) return false;
  const ta = new Date(a.createdAt);
  const tb = new Date(b.createdAt);
  if (!_sameDay(ta, tb)) return false;
  return Math.abs(ta.getTime() - tb.getTime()) <= MS_5MIN;
}

const MEDIA_W = Math.min(Dimensions.get("window").width * 0.64, 250);

type RowProps = {
  item: any;
  older?: any;
  newer?: any;
  meId: string;
  isGroup: boolean;
  /** DM: id người kia để hiện dấu "đã xem" */
  peerId: string;
  mountAt: number;
  onLongPress: (m: any) => void;
  onReact: (mid: string, emoji: string) => void;
  onOpenMedia: (m: any, url: string) => void;
};

const MessageRow = React.memo(function MessageRow({
  item,
  older,
  newer,
  meId,
  isGroup,
  peerId,
  mountAt,
  onLongPress,
  onReact,
  onOpenMedia,
}: RowProps) {
  const C = useThemeTokens();
  const styles = useMemo(() => mk_styles(C), [C]);
  const isMine = senderIdOf(item) === meId;
  const isFirst = !sameCluster(item, older); // đầu cụm (phía trên)
  const isLast = !sameCluster(item, newer); // cuối cụm (phía dưới)
  const dayChanged = !older?.createdAt || !_sameDay(new Date(item.createdAt), new Date(older.createdAt));

  // Tin mới tới sau khi mở màn → hiện dần
  const isNew = useRef(new Date(item.createdAt || 0).getTime() > mountAt).current;
  const appear = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  useEffect(() => {
    if (!isNew) return;
    Animated.spring(appear, { toValue: 1, useNativeDriver: true, friction: 8, tension: 90 }).start();
  }, [appear, isNew]);

  const dayPill = dayChanged ? (
    <View style={styles.dayPillWrap}>
      <Text style={styles.dayPill}>{fmtDayPill(item.createdAt)}</Text>
    </View>
  ) : null;

  if (item.systemKind) {
    return (
      <View>
        {dayPill}
        <View style={styles.systemBar}>
          <Text style={styles.systemText}>{item.content}</Text>
        </View>
      </View>
    );
  }

  const R = 20;
  const r = 6;
  const radius = isMine
    ? { borderTopLeftRadius: R, borderBottomLeftRadius: R, borderTopRightRadius: isFirst ? R : r, borderBottomRightRadius: isLast ? R : r }
    : { borderTopRightRadius: R, borderBottomRightRadius: R, borderTopLeftRadius: isFirst ? R : r, borderBottomLeftRadius: isLast ? R : r };

  const avatarSlot = !isMine ? (
    isLast ? (
      <Pressable
        onPress={() => {
          const uid = senderIdOf(item);
          if (uid) router.push(`/profile/${uid}` as any);
        }}
        hitSlop={6}
      >
        <AuthorAvatar user={item.sender} size={30} />
      </Pressable>
    ) : (
      <View style={{ width: 30 }} />
    )
  ) : null;

  const peerRead =
    isMine && !!peerId && (item.readBy || []).some((u: any) => String(u?._id || u) === peerId);
  const meta = isLast ? (
    <View style={[styles.metaRow, { justifyContent: isMine ? "flex-end" : "flex-start", marginLeft: isMine ? 0 : 38 }]}>
      <Text style={styles.bubbleTime}>{fmtClock(item.createdAt)}</Text>
      {isMine && !item.deletedAt ? (
        <Ionicons
          name={peerRead ? "checkmark-done" : "checkmark"}
          size={14}
          color={peerRead ? ACCENT() : C.muted}
        />
      ) : null}
    </View>
  ) : null;

  let body: React.ReactNode;
  if (item.deletedAt) {
    body = (
      <View style={[styles.bubble, styles.bubbleGhost, radius]}>
        <Text style={{ color: C.muted, fontStyle: "italic", fontSize: 14 }}>Tin nhắn đã bị xoá</Text>
      </View>
    );
  } else {
    const atts: any[] = item.attachments || [];
    const sticker = stickerOf(item);
    const hasCards = !!(item.linkedTournament || item.linkedListing || item.linkedPlay || item.arcadeInvite || item.tournamentPaymentProof);
    const jumbo = !atts.length && !hasCards && !item.replyTo && isJumboEmoji(item.content);
    const visual = atts.filter((a) => a.type === "image" || a.type === "video");
    const others = atts.filter((a) => a.type !== "image" && a.type !== "video");
    const mediaOnly = visual.length > 0 && !others.length && !item.content && !hasCards && !item.replyTo;

    const mediaGrid = visual.length ? (
      <View style={[styles.mediaGrid, { width: MEDIA_W }]}>
        {visual.map((a, i) => {
          const single = visual.length === 1;
          const w = single ? MEDIA_W : (MEDIA_W - 4) / 2;
          const ratio = single && a.width && a.height ? Math.min(1.5, Math.max(0.62, a.height / a.width)) : 1;
          const h = single ? w * ratio : w;
          return a.type === "image" ? (
            <Pressable key={i} onPress={() => onOpenMedia(item, a.url)} onLongPress={() => onLongPress(item)} delayLongPress={250}>
              <ExpoImage source={{ uri: a.url }} style={{ width: w, height: h, backgroundColor: C.field }} contentFit="cover" cachePolicy="memory-disk" transition={150} />
            </Pressable>
          ) : (
            <ChatVideoThumb key={i} url={a.url} width={w} height={h} onPress={() => a.url && onOpenMedia(item, a.url)} />
          );
        })}
      </View>
    ) : null;

    if (sticker) {
      body = <ExpoImage source={{ uri: sticker.url }} style={styles.stickerMsg} contentFit="contain" cachePolicy="memory-disk" />;
    } else if (jumbo) {
      body = <Text style={styles.jumbo}>{String(item.content).trim()}</Text>;
    } else if (mediaOnly) {
      body = <View style={[styles.mediaOnly, radius]}>{mediaGrid}</View>;
    } else {
      const inner = (
        <>
          {isGroup && !isMine && isFirst ? (
            <Text numberOfLines={1} style={styles.senderName}>
              {item.sender?.nickname || item.sender?.name || "Thành viên"}
            </Text>
          ) : null}
          {item.replyTo ? (
            <View style={[styles.quote, isMine ? styles.quoteMine : { borderLeftColor: ACCENT(), backgroundColor: C.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
              <Text style={{ fontSize: 11.5, fontWeight: "800", color: isMine ? "#EAF4FF" : ACCENT() }} numberOfLines={1}>
                {item.replyTo.sender?.nickname || item.replyTo.sender?.name || "Trả lời"}
              </Text>
              <Text style={{ fontSize: 12.5, color: isMine ? "#EAF4FF" : C.text3 }} numberOfLines={1}>
                {replySnippet(item.replyTo)}
              </Text>
            </View>
          ) : null}
          {mediaGrid ? <View style={{ borderRadius: 12, overflow: "hidden", marginBottom: item.content ? 6 : 2 }}>{mediaGrid}</View> : null}
          {others.map((a, i) =>
            a.type === "audio" ? (
              <AudioMessage key={i} url={a.url} durationSec={a.durationSec} isMine={isMine} />
            ) : (
              <View key={i} style={styles.fileChip}>
                <Ionicons name="document-outline" size={20} color={isMine ? "#fff" : C.text} />
                <Text style={{ color: isMine ? "#fff" : C.text, marginLeft: 6, flexShrink: 1 }} numberOfLines={1}>
                  {a.name || "Tệp đính kèm"}
                </Text>
              </View>
            ),
          )}
          {item.content ? (
            <MentionText
              content={item.content}
              mentions={item.mentions}
              style={[styles.msgText, { color: isMine ? "#fff" : C.text }]}
              mentionColor={isMine ? "#EAF4FF" : ACCENT()}
            />
          ) : null}
          {item.linkedTournament ? <TournamentBubbleCard tour={item.linkedTournament} isMine={isMine} /> : null}
          {item.linkedListing ? <ListingChatCardRN listing={item.linkedListing} isMine={isMine} /> : null}
          {item.linkedPlay ? <PlayChatCardRN play={item.linkedPlay} isMine={isMine} /> : null}
          {item.tournamentPaymentProof ? <TournamentPaymentProofCard id={item.tournamentPaymentProof} /> : null}
          {item.arcadeInvite ? <ArcadeInviteCardRN invite={item.arcadeInvite} isMine={isMine} /> : null}
        </>
      );
      body = isMine ? (
        <LinearGradient colors={GRAD()} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, radius]}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleTheir, radius]}>{inner}</View>
      );
    }
  }

  const reactList: any[] = item.deletedAt ? [] : item.reactions || [];
  const groups: { emoji: string; count: number; mine: boolean }[] = [];
  for (const rr of reactList) {
    if (!rr?.emoji) continue;
    let g = groups.find((x) => x.emoji === rr.emoji);
    if (!g) {
      g = { emoji: rr.emoji, count: 0, mine: false };
      groups.push(g);
    }
    g.count += 1;
    if (String(rr.user) === meId) g.mine = true;
  }

  return (
    <View>
      {dayPill}
      <Animated.View
        style={{
          opacity: appear,
          transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
          marginTop: isFirst ? 8 : 2,
        }}
      >
        <Pressable
          onLongPress={item.deletedAt ? undefined : () => onLongPress(item)}
          delayLongPress={250}
          style={[styles.bubbleRow, isMine ? styles.rowMine : styles.rowTheir]}
        >
          {avatarSlot}
          {body}
        </Pressable>
        {groups.length > 0 ? (
          <View style={[styles.reactRow, { justifyContent: isMine ? "flex-end" : "flex-start", marginLeft: isMine ? 0 : 44, marginRight: isMine ? 6 : 0 }]}>
            {groups.map((g) => (
              <Pressable
                key={g.emoji}
                onPress={() => onReact(String(item._id), g.emoji)}
                style={[styles.reactChip, g.mine && { borderColor: ACCENT() }]}
              >
                <Text style={{ fontSize: 13 }}>{g.emoji}</Text>
                <Text style={{ fontSize: 11.5, fontWeight: "800", color: C.text2 }}>{g.count}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {meta}
      </Animated.View>
    </View>
  );
});

function extractErr(err: any): string {
  if (err?.data?.message) return String(err.data.message);
  if (err?.message) return String(err.message);
  return "Lỗi không xác định";
}

export default function ChatWindow() {
  const C = useThemeTokens();
  const styles = useMemo(() => mk_styles(C), [C]);
  const insets = useSafeAreaInsets();
  const { paneRef, measurePane, keyboardOpen, keyboardOverlap } = useChatKeyboard();
  const { cid } = useLocalSearchParams<{ cid: string }>();
  const me = useSelector((s: any) => s.auth?.userInfo);
  const dispatch = useDispatch();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [linkedTournament, setLinkedTournament] = useState<any>(null);
  // Trình xem ảnh/video toàn màn hình (vuốt, lưu, chia sẻ).
  const [viewer, setViewer] = useState<{ visible: boolean; items: ChatMedia[]; index: number }>({
    visible: false,
    items: [],
    index: 0,
  });
  const [panelOpen, setPanelOpen] = useState(false); // bảng sticker
  const [plusOpen, setPlusOpen] = useState(false); // bảng "+"
  const [recentVersion, setRecentVersion] = useState(0);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingOffRef = useRef<any>(null);
  const lastTypingPingRef = useRef(0);
  const mountAt = useRef(Date.now()).current;
  const itemsRef = useRef<any[]>([]);
  const replyRef = useRef<any>(null);
  const [tournamentPickerOpen, setTournamentPickerOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionRange, setMentionRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<
    Array<{ _id: string; display: string }>
  >([]);
  const mentionDebRef = useRef<any>(null);
  const [triggerUserSearch] = useLazySearchUserQuery();
  const flatRef = useRef<FlatList<any>>(null);
  const cidStr = String(cid);

  const onChangeText = (v: string) => {
    setText(v);
    // Báo "đang nhập" cho người kia (tối đa 1 lần / 2,5 giây)
    if (v && Date.now() - lastTypingPingRef.current > 2500) {
      lastTypingPingRef.current = Date.now();
      try {
        (sendTyping(cidStr) as any)?.unwrap?.().catch(() => {});
      } catch {}
    }
    const caret = v.length;
    const before = v.slice(0, caret);
    const m = before.match(
      /(^|\s)@([\p{L}\p{N}._-]+(?: [\p{L}\p{N}._-]+){0,2})$/u
    );
    if (m) {
      const q = m[2];
      setMentionQuery(q);
      setMentionRange({ start: before.length - q.length - 1, end: caret });
    } else {
      setMentionQuery(null);
      setMentionRange(null);
      setMentionResults([]);
    }
  };

  useEffect(() => {
    if (mentionQuery == null) return;
    if (mentionDebRef.current) clearTimeout(mentionDebRef.current);
    mentionDebRef.current = setTimeout(async () => {
      if (!mentionQuery) {
        setMentionResults([]);
        return;
      }
      try {
        const r: any = await triggerUserSearch(mentionQuery).unwrap();
        const list = Array.isArray(r) ? r : r?.items || r?.data || [];
        setMentionResults(list.slice(0, 6));
      } catch {
        setMentionResults([]);
      }
    }, 250);
    return () => {
      if (mentionDebRef.current) clearTimeout(mentionDebRef.current);
    };
  }, [mentionQuery, triggerUserSearch]);

  const insertMention = (u: any) => {
    if (!mentionRange || !u?._id) return;
    const nick = u?.nickname || u?.name || "";
    if (!nick) return;
    const before = text.slice(0, mentionRange.start);
    const after = text.slice(mentionRange.end);
    setText(`${before}@${nick} ${after}`);
    setSelectedMentions((prev) =>
      prev.some((m) => m._id === String(u._id))
        ? prev
        : [...prev, { _id: String(u._id), display: nick }]
    );
    setMentionQuery(null);
    setMentionRange(null);
    setMentionResults([]);
  };

  const { data: conv } = useGetConversationQuery(cidStr, { skip: !cid });
  const [patchConv] = usePatchConversationMutation();
  const [sendTyping] = useTypingMutation();
  const convMuted = !!(conv as any)?.muted;
  const toggleConvMute = async () => {
    try {
      await patchConv({ cid: cidStr, muted: !convMuted } as any).unwrap();
    } catch {}
  };
  const { data: msgs, isFetching } = useListMessagesQuery(
    { cid: cidStr },
    { skip: !cid }
  );
  const [sendMessage, { isLoading: sending }] = useSendDmMessageMutation();
  const [uploadMedia] = useUploadChatMediaMutation();
  const [markRead] = useMarkReadMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [reactMessage] = useReactMessageMutation();
  const [pinMessage] = usePinMessageMutation();
  // Ghi âm tin nhắn thoại
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const recTimerRef = useRef<any>(null);
  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Cần quyền micro", "Vui lòng cấp quyền micro để ghi âm.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecording(true);
      setRecSecs(0);
      recTimerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
    } catch (e: any) {
      Alert.alert("Không ghi âm được", extractErr(e));
    }
  };
  const cancelRecording = async () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setRecording(false);
    try {
      await audioRecorder.stop();
    } catch {}
  };
  const stopAndSendRecording = async () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setRecording(false);
    const secs = recSecs;
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri || secs < 1) return;
      const fd = new FormData();
      fd.append("files", {
        uri,
        name: `voice_${Date.now()}.m4a`,
        type: "audio/m4a",
      } as any);
      const r: any = await uploadMedia(fd).unwrap();
      const att = (r.attachments || [])[0];
      if (!att) return;
      await sendMessage({
        cid: cidStr,
        content: "",
        attachments: [{ ...att, durationSec: secs }],
      } as any).unwrap();
      flatRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (e: any) {
      Alert.alert("Gửi tin thoại thất bại", extractErr(e));
    }
  };
  const [replyTarget, setReplyTarget] = useState<any>(null);
  replyRef.current = replyTarget;
  const [actionMsg, setActionMsg] = useState<any>(null); // long-press action sheet
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  useEffect(() => {
    setPinnedMessages((conv as any)?.pinnedMessages || []);
  }, [(conv as any)?.pinnedMessages]);
  const pinnedIdSet = useMemo(
    () => new Set(pinnedMessages.map((p) => String(p?._id || p))),
    [pinnedMessages]
  );
  const handlePin = async (msg: any, pin: boolean) => {
    setActionMsg(null);
    try {
      const r: any = await pinMessage({
        cid: cidStr,
        messageId: msg._id,
        pin,
      }).unwrap();
      setPinnedMessages(r.pinnedMessages || []);
    } catch (err: any) {
      Alert.alert("Ghim thất bại", extractErr(err));
    }
  };

  const handleReact = useCallback(async (mid: string, emoji: string) => {
    setActionMsg(null);
    dispatch(
      messagesApiSlice.util.updateQueryData(
        "listMessages",
        { cid: cidStr },
        (draft: any) => {
          const m = draft?.items?.find((x: any) => String(x._id) === String(mid));
          if (!m) return;
          const list = m.reactions || [];
          const idx = list.findIndex(
            (r: any) => String(r.user) === String(me?._id)
          );
          if (idx >= 0 && list[idx].emoji === emoji) {
            m.reactions = list.filter((_: any, i: number) => i !== idx);
          } else if (idx >= 0) {
            list[idx].emoji = emoji;
            m.reactions = [...list];
          } else {
            m.reactions = [...list, { user: String(me?._id), emoji }];
          }
        }
      )
    );
    try {
      await reactMessage({ mid, emoji }).unwrap();
    } catch {
      /* socket đồng bộ lại nếu lệch */
    }
  }, [cidStr, dispatch, me?._id, reactMessage]);

  // Subscribe socket room + patch cache khi có message mới
  useEffect(() => {
    if (!cid) return;
    const subscribe = () => {
      try {
        socket.emit("chat:subscribe", { conversationId: cidStr });
      } catch {}
    };
    // Subscribe ngay lập tức (nếu socket đang connect) + re-subscribe mỗi lần
    // socket connect/reconnect (mất mạng chớp → socket id mới → BE không còn
    // socket cũ trong room chat:${cid} → miss messages cho tới khi user refresh)
    subscribe();
    socket.on("connect", subscribe);
    try {
      markRead(cidStr);
    } catch {}
    const onNew = (payload: any) => {
      if (String(payload?.conversationId) !== cidStr) return;
      const newMsg = payload.message;
      if (!newMsg) return;
      // patch list cache
      dispatch(
        messagesApiSlice.util.updateQueryData(
          "listMessages",
          { cid: cidStr },
          (draft: any) => {
            if (!draft?.items) return;
            if (draft.items.find((m: any) => String(m._id) === String(newMsg._id)))
              return;
            draft.items.unshift(newMsg);
          }
        )
      );
      setPeerTyping(false);
      // mark read khi đang mở
      markRead(cidStr);
    };
    const onDeleted = (payload: any) => {
      if (String(payload?.conversationId) !== cidStr) return;
      dispatch(
        messagesApiSlice.util.updateQueryData(
          "listMessages",
          { cid: cidStr },
          (draft: any) => {
            if (!draft?.items) return;
            const i = draft.items.findIndex(
              (m: any) => String(m._id) === String(payload.messageId)
            );
            if (i >= 0) draft.items[i].deletedAt = new Date().toISOString();
          }
        )
      );
    };
    const onReaction = (payload: any) => {
      if (String(payload?.conversationId) !== cidStr) return;
      dispatch(
        messagesApiSlice.util.updateQueryData(
          "listMessages",
          { cid: cidStr },
          (draft: any) => {
            const m = draft?.items?.find(
              (x: any) => String(x._id) === String(payload.messageId)
            );
            if (m) m.reactions = payload.reactions || [];
          }
        )
      );
    };
    const onPinned = (payload: any) => {
      if (String(payload?.conversationId) !== cidStr) return;
      setPinnedMessages(payload.pinnedMessages || []);
    };
    // Người kia đã xem → đánh dấu vào readBy để hiện dấu tích đôi
    const onRead = (payload: any) => {
      if (String(payload?.conversationId) !== cidStr) return;
      const uid = String(payload?.userId || "");
      if (!uid || uid === String(me?._id)) return;
      dispatch(
        messagesApiSlice.util.updateQueryData(
          "listMessages",
          { cid: cidStr },
          (draft: any) => {
            for (const m of draft?.items || []) {
              const list = (m.readBy = m.readBy || []);
              if (!list.some((u: any) => String(u?._id || u) === uid)) list.push(uid);
            }
          }
        )
      );
    };
    const onTyping = (payload: any) => {
      if (String(payload?.conversationId) !== cidStr) return;
      if (String(payload?.userId || "") === String(me?._id)) return;
      setPeerTyping(true);
      if (typingOffRef.current) clearTimeout(typingOffRef.current);
      typingOffRef.current = setTimeout(() => setPeerTyping(false), 3500);
    };
    socket.on("chat:read", onRead);
    socket.on("chat:typing", onTyping);
    socket.on("chat:message:new", onNew);
    socket.on("chat:message:deleted", onDeleted);
    socket.on("chat:message:reaction", onReaction);
    socket.on("chat:pinned:updated", onPinned);
    return () => {
      try {
        socket.emit("chat:unsubscribe", { conversationId: cidStr });
      } catch {}
      socket.off("connect", subscribe);
      socket.off("chat:read", onRead);
      socket.off("chat:typing", onTyping);
      if (typingOffRef.current) clearTimeout(typingOffRef.current);
      socket.off("chat:message:new", onNew);
      socket.off("chat:message:deleted", onDeleted);
      socket.off("chat:message:reaction", onReaction);
      socket.off("chat:pinned:updated", onPinned);
    };
  }, [cid, cidStr, dispatch, markRead, me?._id]);

  const items = useMemo(() => msgs?.items || [], [msgs?.items]);
  itemsRef.current = items;
  const isGroup = conv?.type === "club" || conv?.type === "tournament" || conv?.type === "venue";
  const title = useMemo(() => {
    if (!conv) return "Nhắn tin";
    if (conv.type === "tournament")
      return `BTC · ${conv.tournament?.name || "Giải đấu"}`;
    if (conv.type === "club")
      return `CLB · ${conv.club?.name || "Câu lạc bộ"}`;
    if (conv.type === "venue")
      return `Sân · ${conv.venue?.name || "Cụm sân"}`;
    const other = conv.otherParticipants?.[0];
    return authorName(other);
  }, [conv]);

  const pickMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.6,
      videoMaxDuration: 240, // 4 phút
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium as any,
    });
    if (res.canceled || !res.assets?.length) return;

    // Client-side check dung lượng + thời lượng trước khi upload
    // Limit: ảnh 10MB, video 100MB / 4 phút
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
    const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
    const MAX_VIDEO_DURATION_MS = 240 * 1000;
    const rejected: string[] = [];
    const ok: typeof res.assets = [];
    for (const a of res.assets) {
      const isVideo = a.type === "video";
      const size = Number(a.fileSize || 0);
      const duration = Number(a.duration || 0); // ms
      if (isVideo) {
        if (size && size > MAX_VIDEO_BYTES) {
          rejected.push(
            `Video "${a.fileName || "video"}" ${(size / 1024 / 1024).toFixed(1)}MB > 100MB`
          );
          continue;
        }
        if (duration && duration > MAX_VIDEO_DURATION_MS) {
          rejected.push(
            `Video "${a.fileName || "video"}" ${(duration / 1000).toFixed(0)}s > 4 phút`
          );
          continue;
        }
      } else {
        if (size && size > MAX_IMAGE_BYTES) {
          rejected.push(
            `Ảnh "${a.fileName || "ảnh"}" ${(size / 1024 / 1024).toFixed(1)}MB > 10MB`
          );
          continue;
        }
      }
      ok.push(a);
    }
    if (rejected.length) {
      Alert.alert(
        "Một số file quá lớn",
        rejected.join("\n") +
          "\n\nCác file còn lại sẽ được tải lên như bình thường."
      );
    }
    if (!ok.length) return;

    // Placeholder uploading — hiện ngay trong preview với spinner
    const batchKey = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tempItems = ok.map((a, idx) => ({
      _temp: true,
      _batch: batchKey,
      _key: `${batchKey}-${idx}`,
      type: a.type === "video" ? "video" : "image",
      tempUri: a.uri,
    })) as any[];
    setAttachments((prev) => [...prev, ...tempItems].slice(0, 10));

    const fd = new FormData();
    for (const a of ok) {
      let uri = a.uri;
      const isVideo = a.type === "video";
      if (!isVideo) {
        try {
          const r = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1600 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          uri = r.uri;
        } catch {}
      }
      const name = a.fileName || uri.split("/").pop() || "upload";
      const type = a.mimeType || (isVideo ? "video/mp4" : "image/jpeg");
      fd.append("files", { uri, name, type } as any);
    }
    try {
      const r: any = await uploadMedia(fd).unwrap();
      setAttachments((prev) =>
        [
          ...prev.filter((m: any) => m._batch !== batchKey),
          ...(r.attachments || []),
        ].slice(0, 10)
      );
    } catch (err: any) {
      setAttachments((prev) => prev.filter((m: any) => m._batch !== batchKey));
      Alert.alert("Upload thất bại", extractErr(err));
    }
  };

  const submit = async () => {
    if (!text.trim() && !attachments.length && !linkedTournament) return;
    if (attachments.some((m: any) => m._temp)) {
      Alert.alert("Vui lòng chờ tải xong", "Có file đang được tải lên.");
      return;
    }
    const stillPresent = selectedMentions
      .filter((m) => text.includes(`@${m.display}`))
      .map((m) => m._id);
    try {
      await sendMessage({
        cid: cidStr,
        content: text.trim(),
        attachments,
        mentions: stillPresent,
        linkedTournament: linkedTournament?._id || null,
        replyTo: replyTarget?._id || null,
      } as any).unwrap();
      setText("");
      setAttachments([]);
      setLinkedTournament(null);
      setSelectedMentions([]);
      setReplyTarget(null);
      // scroll về đầu (FlatList inverted → offset 0)
      flatRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (err: any) {
      Alert.alert("Gửi thất bại", extractErr(err));
    }
  };

  const handleDelete = (mid: string) => {
    Alert.alert("Xoá tin nhắn?", undefined, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMessage(mid).unwrap();
          } catch (err: any) {
            Alert.alert("Lỗi", extractErr(err));
          }
        },
      },
    ]);
  };

  const dmPeer =
    conv?.type === "dm" ? conv?.otherParticipants?.[0] : null;
  const meId = String(me?._id || "");
  const peerId = dmPeer?._id ? String(dmPeer._id) : "";

  // ── Sticker / emoji ──
  const sendSticker = useCallback(
    async (s: Sticker) => {
      try {
        Haptics.selectionAsync().catch(() => {});
      } catch {}
      const reply = replyRef.current;
      setReplyTarget(null);
      pushRecentSticker(s).then(() => setRecentVersion((v) => v + 1));
      try {
        await sendMessage({
          cid: cidStr,
          content: "",
          attachments: [
            { type: "image", url: s.url, name: s.label, mime: "image/webp", width: 400, height: 400, sticker: true },
          ],
          replyTo: reply?._id || null,
        } as any).unwrap();
        flatRef.current?.scrollToOffset({ offset: 0, animated: true });
      } catch (err: any) {
        Alert.alert("Gửi sticker thất bại", extractErr(err));
      }
    },
    [cidStr, sendMessage],
  );
  const addEmoji = useCallback((e: string) => setText((t) => `${t}${e}`), []);
  const togglePanel = () => {
    if (panelOpen) {
      setPanelOpen(false);
      return;
    }
    Keyboard.dismiss();
    setPanelOpen(true);
  };
  useEffect(() => {
    if (!panelOpen) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setPanelOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [panelOpen]);

  // ── Xem ảnh / video toàn màn hình ──
  const openMedia = useCallback((msg: any, url: string) => {
    const list: ChatMedia[] = [];
    const all = itemsRef.current || [];
    for (let i = all.length - 1; i >= 0; i -= 1) {
      const m = all[i];
      if (!m || m.deletedAt) continue;
      (m.attachments || []).forEach((a: any, j: number) => {
        if (!a?.url || (a.type !== "image" && a.type !== "video") || isStickerAttachment(a)) return;
        list.push({
          key: `${m._id}-${j}`,
          type: a.type,
          url: a.url,
          senderName: authorName(m.sender),
          timeLabel: mediaTimeLabel(m.createdAt),
          msg: m,
        });
      });
    }
    const idx = list.findIndex((x) => String(x.msg._id) === String(msg._id) && x.url === url);
    Keyboard.dismiss();
    setViewer({ visible: true, items: list, index: Math.max(0, idx) });
  }, []);
  const openActions = useCallback((m: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
    setActionMsg(m);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <MessageRow
        item={item}
        older={items[index + 1]}
        newer={items[index - 1]}
        meId={meId}
        isGroup={isGroup}
        peerId={peerId}
        mountAt={mountAt}
        onLongPress={openActions}
        onReact={handleReact}
        onOpenMedia={openMedia}
      />
    ),
    [items, meId, isGroup, peerId, mountAt, openActions, handleReact, openMedia],
  );

  const headerAvatarUri =
    conv?.type === "club"
      ? conv?.club?.logoUrl
      : conv?.type === "tournament"
        ? conv?.tournament?.image
        : conv?.type === "venue"
          ? conv?.venue?.images?.[0]
          : "";
  const memberCount = Number((conv as any)?.memberCount || conv?.participants?.length || 0);
  const subtitle = peerTyping
    ? "Đang nhập…"
    : dmPeer
      ? convMuted
        ? "Đã tắt thông báo"
        : "Nhấn để xem trang cá nhân"
      : memberCount > 0
        ? `${memberCount} thành viên`
        : "";
  const actionMediaUrl: string =
    (actionMsg?.attachments || []).find(
      (a: any) => a?.url && (a.type === "image" || a.type === "video") && !isStickerAttachment(a)
    )?.url || "";
  const canSend = !!text.trim() || attachments.length > 0 || !!linkedTournament;
  const bottomPad = keyboardOpen ? keyboardOverlap : panelOpen ? 0 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false, title }} />

      {/* Đầu trang */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/" as any))}
          hitSlop={8}
          style={styles.headBtn}
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Pressable
          disabled={!dmPeer?._id}
          onPress={() => dmPeer?._id && router.push(`/profile/${String(dmPeer._id)}` as any)}
          style={styles.headPeer}
        >
          {dmPeer ? (
            <AuthorAvatar user={dmPeer} size={40} />
          ) : headerAvatarUri ? (
            <ExpoImage source={{ uri: headerAvatarUri }} style={styles.headAvatar} contentFit="cover" />
          ) : (
            <View style={[styles.headAvatar, styles.headAvatarFallback]}>
              <Ionicons name={conv?.type === "tournament" ? "trophy" : "people"} size={20} color="#fff" />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headName} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.headSub, peerTyping && { color: ACCENT(), fontWeight: "700" }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <NotificationHeaderActions>
          {dmPeer?._id ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CallButton phone={dmPeer?.phone} userName={dmPeer?.nickname || dmPeer?.name} appearance="chat" />
              <UserActionsMenu
                userId={String(dmPeer._id)}
                userName={dmPeer?.nickname || dmPeer?.name}
                appearance="chat"
                extraActions={[
                  {
                    text: convMuted ? "Bật thông báo" : "Tắt thông báo",
                    onPress: toggleConvMute,
                  },
                ]}
              />
            </View>
          ) : null}
        </NotificationHeaderActions>
      </View>

      <View
        ref={paneRef}
        collapsable={false}
        onLayout={measurePane}
        style={{ flex: 1, paddingBottom: bottomPad }}
      >
        {isFetching && !items.length && (
          <ActivityIndicator style={{ marginTop: 20 }} />
        )}
        {pinnedMessages.length > 0 && (
          <View style={styles.pinBar}>
            {pinnedMessages.map((pm: any) => (
              <View key={pm._id} style={styles.pinRow}>
                <Ionicons name="pin" size={13} color="#F59E0B" />
                <Text style={{ fontSize: 11.5, fontWeight: "800", color: C.text3 }}>
                  {pm.sender?.nickname || pm.sender?.name || ""}:
                </Text>
                <Text style={{ fontSize: 12.5, color: C.sub, flex: 1 }} numberOfLines={1}>
                  {replySnippet(pm)}
                </Text>
                <Pressable onPress={() => handlePin(pm, false)} hitSlop={8}>
                  <Ionicons name="close" size={14} color={C.muted} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <FlatList
          ref={flatRef}
          data={items}
          keyExtractor={(m: any) => String(m._id)}
          inverted
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => panelOpen && setPanelOpen(false)}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 }}
          renderItem={renderItem}
          initialNumToRender={14}
          maxToRenderPerBatch={10}
          windowSize={11}
          removeClippedSubviews={Platform.OS === "android"}
        />

        {/* Ô soạn tin */}
        <View style={styles.composer}>
          {replyTarget && (
            <View style={styles.replyBar}>
              <Ionicons name="arrow-undo" size={16} color={ACCENT()} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 11.5, fontWeight: "800", color: ACCENT() }} numberOfLines={1}>
                  Đang trả lời {replyTarget.sender?.nickname || replyTarget.sender?.name || ""}
                </Text>
                <Text style={{ fontSize: 12.5, color: C.text3 }} numberOfLines={1}>
                  {replySnippet(replyTarget)}
                </Text>
              </View>
              <Pressable onPress={() => setReplyTarget(null)} hitSlop={8}>
                <Ionicons name="close" size={18} color={C.sub} />
              </Pressable>
            </View>
          )}
          {attachments.length > 0 && (
            <View style={styles.attachPreviewRow}>
              {attachments.map((a: any, i) => {
                const isTemp = !!a._temp;
                return (
                  <View key={a._key || i} style={styles.attachPreview}>
                    {a.type === "image" ? (
                      <Image source={{ uri: isTemp ? a.tempUri : a.url }} style={styles.previewImg} />
                    ) : (
                      <View style={[styles.previewImg, styles.attachVideo]}>
                        <Ionicons name="videocam" size={18} color="#fff" />
                      </View>
                    )}
                    {isTemp && (
                      <View style={styles.previewLoading} pointerEvents="none">
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={{ color: "#fff", fontSize: 9, fontWeight: "600" }}>Đang tải…</Text>
                      </View>
                    )}
                    {!isTemp && (
                      <Pressable
                        style={styles.previewRemove}
                        onPress={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <Ionicons name="close" size={12} color="#fff" />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          {linkedTournament && (
            <View style={styles.chatTournamentChip}>
              <Ionicons name="trophy" size={14} color="#F59E0B" />
              <Text style={styles.chatTournamentText} numberOfLines={1}>
                {linkedTournament.name}
              </Text>
              <Pressable onPress={() => setLinkedTournament(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={C.sub} />
              </Pressable>
            </View>
          )}
          {mentionQuery != null && mentionResults.length > 0 && (
            <View style={styles.mentionList}>
              {mentionResults.map((u) => (
                <Pressable
                  key={u._id}
                  onPress={() => insertMention(u)}
                  style={({ pressed }) => [styles.mentionItem, pressed && { backgroundColor: C.field }]}
                >
                  <AuthorAvatar user={u} size={28} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mentionNick} numberOfLines={1}>
                      @{u.nickname || u.name}
                    </Text>
                    {!!u.name && u.name !== u.nickname && (
                      <Text style={styles.mentionName} numberOfLines={1}>
                        {u.name}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
          {recording ? (
            <View style={[styles.composerRow, { alignItems: "center" }]}>
              <Pressable onPress={cancelRecording} hitSlop={8} style={styles.plusBtn}>
                <Ionicons name="trash-outline" size={21} color="#EF4444" />
              </Pressable>
              <View style={[styles.inputPill, { alignItems: "center", paddingVertical: 11 }]}>
                <View style={styles.recDot} />
                <Text style={{ color: C.text, fontWeight: "700", fontSize: 15 }}>
                  Đang ghi âm · {Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, "0")}
                </Text>
              </View>
              <Pressable onPress={stopAndSendRecording}>
                <LinearGradient colors={GRAD()} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendBtn}>
                  <Ionicons name="send" size={18} color="#fff" />
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <View style={styles.composerRow}>
              <Pressable onPress={() => setPlusOpen(true)} style={styles.plusBtn} accessibilityLabel="Thêm đính kèm">
                <Ionicons name="add" size={24} color={C.text} />
              </Pressable>
              <View style={styles.inputPill}>
                <TextInput
                  style={styles.input}
                  placeholder="Nhắn tin…"
                  value={text}
                  onChangeText={onChangeText}
                  onFocus={() => setPanelOpen(false)}
                  multiline
                  placeholderTextColor={C.muted}
                />
                <Pressable onPress={togglePanel} hitSlop={8} style={styles.smileBtn} accessibilityLabel="Sticker">
                  <Ionicons
                    name={panelOpen ? "happy" : "happy-outline"}
                    size={24}
                    color={panelOpen ? ACCENT() : C.sub}
                  />
                </Pressable>
              </View>
              {canSend ? (
                <Pressable onPress={submit} disabled={sending} style={sending && { opacity: 0.5 }}>
                  <LinearGradient colors={GRAD()} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendBtn}>
                    <Ionicons name="send" size={18} color="#fff" />
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable onPress={startRecording}>
                  <LinearGradient colors={GRAD()} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendBtn}>
                    <Ionicons name="mic" size={20} color="#fff" />
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          )}
        </View>
        {panelOpen ? (
          <StickerPanel
            bottomInset={insets.bottom}
            recentVersion={recentVersion}
            onPickSticker={sendSticker}
            onPickEmoji={addEmoji}
          />
        ) : null}
      </View>

      <ChatTournamentPickerModal
        visible={tournamentPickerOpen}
        onClose={() => setTournamentPickerOpen(false)}
        onPick={(t) => {
          setLinkedTournament(t);
          setTournamentPickerOpen(false);
        }}
      />

      {/* Ảnh / video toàn màn hình: vuốt, lưu về máy, chia sẻ, trả lời */}
      <ChatMediaViewer
        visible={viewer.visible}
        items={viewer.items}
        index={viewer.index}
        onClose={() => setViewer((v) => ({ ...v, visible: false }))}
        onReply={setReplyTarget}
      />

      {/* Bảng "+" : đính kèm */}
      <Modal visible={plusOpen} transparent animationType="fade" onRequestClose={() => setPlusOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPlusOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: 18 + insets.bottom }]}>
            <View style={styles.sheetGrabber} />
            <View style={{ flexDirection: "row", gap: 12, paddingVertical: 6 }}>
              <Pressable
                style={styles.plusTile}
                onPress={() => {
                  setPlusOpen(false);
                  setTimeout(pickMedia, Platform.OS === "ios" ? 350 : 50);
                }}
              >
                <View style={[styles.plusIcon, { backgroundColor: "rgba(30,155,255,0.16)" }]}>
                  <Ionicons name="images" size={24} color="#1E9BFF" />
                </View>
                <Text style={styles.plusLabel}>Ảnh & video</Text>
              </Pressable>
              <Pressable
                style={styles.plusTile}
                onPress={() => {
                  setPlusOpen(false);
                  setTimeout(() => setTournamentPickerOpen(true), Platform.OS === "ios" ? 350 : 50);
                }}
              >
                <View style={[styles.plusIcon, { backgroundColor: "rgba(245,158,11,0.16)" }]}>
                  <Ionicons name="trophy" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.plusLabel}>Gắn giải đấu</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bảng thao tác khi giữ lâu tin nhắn */}
      <Modal visible={!!actionMsg} transparent animationType="fade" onRequestClose={() => setActionMsg(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setActionMsg(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: 14 + insets.bottom }]}>
            <View style={styles.sheetGrabber} />
            <View style={styles.emojiBar}>
              {QUICK_EMOJIS.map((e) => (
                <Pressable key={e} onPress={() => actionMsg && handleReact(String(actionMsg._id), e)} hitSlop={6}>
                  <Text style={{ fontSize: 30 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => {
                setReplyTarget(actionMsg);
                setActionMsg(null);
              }}
              style={styles.sheetRow}
            >
              <Ionicons name="arrow-undo-outline" size={22} color={C.text} />
              <Text style={styles.sheetRowText}>Trả lời</Text>
            </Pressable>
            {!!actionMsg?.content && (
              <Pressable
                onPress={async () => {
                  const t = String(actionMsg.content || "");
                  setActionMsg(null);
                  try {
                    await Clipboard.setStringAsync(t);
                    Alert.alert("Đã sao chép", "Đã sao chép tin nhắn.");
                  } catch {
                    Alert.alert("Lỗi", "Không sao chép được.");
                  }
                }}
                style={styles.sheetRow}
              >
                <Ionicons name="copy-outline" size={22} color={C.text} />
                <Text style={styles.sheetRowText}>Sao chép</Text>
              </Pressable>
            )}
            {actionMsg && actionMediaUrl ? (
              <Pressable
                onPress={() => {
                  const m = actionMsg;
                  setActionMsg(null);
                  setTimeout(() => openMedia(m, actionMediaUrl), Platform.OS === "ios" ? 350 : 50);
                }}
                style={styles.sheetRow}
              >
                <Ionicons name="download-outline" size={22} color={C.text} />
                <Text style={styles.sheetRowText}>Xem & lưu về máy</Text>
              </Pressable>
            ) : null}
            {actionMsg && (
              <Pressable
                onPress={() => handlePin(actionMsg, !pinnedIdSet.has(String(actionMsg._id)))}
                style={styles.sheetRow}
              >
                <Ionicons name="pin-outline" size={22} color={C.text} />
                <Text style={styles.sheetRowText}>
                  {pinnedIdSet.has(String(actionMsg._id)) ? "Bỏ ghim" : "Ghim tin nhắn"}
                </Text>
              </Pressable>
            )}
            {actionMsg &&
              (senderIdOf(actionMsg) === meId || (me as any)?.role === "admin") && (
                <Pressable
                  onPress={() => {
                    const mid = String(actionMsg._id);
                    setActionMsg(null);
                    handleDelete(mid);
                  }}
                  style={styles.sheetRow}
                >
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                  <Text style={[styles.sheetRowText, { color: "#EF4444" }]}>Xoá tin nhắn</Text>
                </Pressable>
              )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ChatVideoThumb({
  url,
  width,
  height,
  onPress,
}: {
  url?: string | null;
  width: number;
  height: number;
  onPress: () => void;
}) {
  const player = useVideoPlayer(url || "", (p) => {
    try {
      p.muted = true;
      p.loop = false;
      p.pause();
    } catch {}
  });
  return (
    <Pressable onPress={onPress}>
      <View style={{ width, height, backgroundColor: "#111", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {url ? (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            nativeControls={false}
            allowsPictureInPicture={false}
          />
        ) : null}
        <View
          style={[StyleSheet.absoluteFillObject, { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.2)" }]}
          pointerEvents="none"
        >
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="play" size={24} color="#fff" style={{ marginLeft: 3 }} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function ChatTournamentPickerModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (t: any) => void;
}) {
  const C = useThemeTokens();
  const styles = useMemo(() => mk_styles(C), [C]);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggerSearch] = useLazySearchTournamentsQuery();
  const debRef = useRef<any>(null);

  useEffect(() => {
    if (!visible) return;
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r: any = await triggerSearch({ q, limit: 20 }).unwrap();
        const list = Array.isArray(r) ? r : r?.items || r?.data || [];
        setItems(list);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debRef.current) clearTimeout(debRef.current);
    };
  }, [q, visible, triggerSearch]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={["top", "bottom"]}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Gắn giải đấu</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={C.text} />
          </Pressable>
        </View>
        <View style={styles.pickerSearchBox}>
          <Ionicons name="search" size={18} color={C.muted} />
          <TextInput
            style={styles.pickerSearchInput}
            placeholder="Tìm giải theo tên…"
            placeholderTextColor={C.muted}
            value={q}
            onChangeText={setQ}
            autoFocus
          />
        </View>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(t: any) => String(t._id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onPick(item)}
                style={({ pressed }) => [
                  styles.pickerRow,
                  pressed && { backgroundColor: C.field },
                ]}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.pickerThumb} />
                ) : (
                  <View style={[styles.pickerThumb, styles.pickerThumbFallback]}>
                    <Ionicons name="trophy" size={20} color="#F59E0B" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerName} numberOfLines={2}>
                    {item.name}
                  </Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text
                style={{
                  padding: 24,
                  color: C.muted,
                  textAlign: "center",
                }}
              >
                {q ? "Không tìm thấy giải" : "Gõ tên để tìm giải đấu…"}
              </Text>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const { width: SW } = Dimensions.get("window");

const mk_styles = (C: ThemeTokens) => StyleSheet.create({
  // ── Đầu trang ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  headBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.field,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  headPeer: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  headAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.field },
  headAvatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#1E9BFF" },
  headName: { fontSize: 16.5, fontWeight: "800", color: C.text },
  headSub: { fontSize: 12, color: C.sub, marginTop: 1 },
  pinBar: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  pinRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  // ── Tin nhắn ──
  dayPillWrap: { alignItems: "center", marginTop: 14, marginBottom: 6 },
  dayPill: {
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11.5,
    fontWeight: "700",
    color: C.sub,
    backgroundColor: C.field,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3, marginHorizontal: 6 },
  bubbleTime: { fontSize: 10.5, color: C.muted },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  rowMine: { justifyContent: "flex-end" },
  rowTheir: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: Math.min(SW * 0.76, 520),
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleTheir: {
    backgroundColor: C.field,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  bubbleGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
  },
  senderName: { fontSize: 11.5, fontWeight: "800", color: sk("#1E9BFF", "#1466F2"), marginBottom: 2 },
  quote: {
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 4,
    marginBottom: 6,
  },
  quoteMine: { borderLeftColor: "rgba(255,255,255,0.8)", backgroundColor: "rgba(255,255,255,0.16)" },
  msgText: { fontSize: 15.5, lineHeight: 21 },
  jumbo: { fontSize: 46, lineHeight: 56 },
  stickerMsg: { width: 138, height: 138 },
  mediaOnly: { overflow: "hidden" },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  fileChip: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  reactRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: -7, zIndex: 2 },
  reactChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  systemBar: { alignItems: "center", marginVertical: 8 },
  systemText: {
    fontSize: 12,
    color: C.muted,
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  // ── Thẻ giải đấu trong tin ──
  msgTournamentCard: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: C.amberSoft,
    borderWidth: 1,
    borderColor: C.dark ? "rgba(245,158,11,0.4)" : "#FDE68A",
    // Giữ thẻ đủ rộng khi nội dung tin ngắn (bong bóng tối đa 76% màn hình).
    minWidth: Math.min(SW * 0.62, 300),
    alignSelf: "stretch",
  },
  msgTournamentCardMine: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.3)",
  },
  msgTournamentImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: C.amberSoft,
    flexShrink: 0,
  },
  msgTournamentImgFallback: { alignItems: "center", justifyContent: "center" },
  msgTournamentLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: C.amberText,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  msgTournamentName: { fontSize: 14, fontWeight: "700", color: C.text, marginTop: 2, lineHeight: 18 },
  tourInfoRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  tourInfoText: { fontSize: 12, flexShrink: 1, lineHeight: 16 },
  // ── Ô soạn tin ──
  container: { flex: 1, backgroundColor: C.bg },
  composer: {
    backgroundColor: C.bg,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
  },
  composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  plusBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.field,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  inputPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    minHeight: 44,
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 8,
    backgroundColor: C.field,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingTop: 11,
    paddingBottom: 11,
    paddingHorizontal: 0,
    fontSize: 15.5,
    color: C.text,
  },
  smileBtn: { width: 34, height: 44, alignItems: "center", justifyContent: "center" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444", marginRight: 4 },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderLeftWidth: 3,
    borderLeftColor: sk("#1E9BFF", "#1466F2"),
    backgroundColor: C.field,
    borderRadius: 10,
    marginBottom: 8,
  },
  attachPreviewRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingBottom: 8 },
  attachPreview: { width: 64, height: 64, borderRadius: 12, overflow: "hidden", position: "relative" },
  attachVideo: { backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  previewImg: { width: "100%", height: "100%" },
  previewLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  previewRemove: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  chatTournamentChip: {
    marginBottom: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: C.amberSoft,
    borderWidth: 1,
    borderColor: C.dark ? "rgba(245,158,11,0.4)" : "#FED7AA",
    maxWidth: "90%",
  },
  chatTournamentText: { fontSize: 13, fontWeight: "600", color: C.amberText, flexShrink: 1 },
  mentionList: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.card,
    overflow: "hidden",
  },
  mentionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  mentionNick: { fontSize: 14, fontWeight: "700", color: C.text },
  mentionName: { fontSize: 12, color: C.sub },
  // ── Bảng trượt (đính kèm, thao tác tin nhắn) ──
  sheetBackdrop: { flex: 1, backgroundColor: C.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  sheetGrabber: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 99,
    backgroundColor: C.line,
    marginBottom: 12,
  },
  emojiBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    marginBottom: 6,
    borderRadius: 999,
    backgroundColor: C.field,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  sheetRowText: { fontSize: 16, color: C.text },
  plusTile: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: C.field,
  },
  plusIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  plusLabel: { fontSize: 13.5, fontWeight: "700", color: C.text },
  // ── Bảng chọn giải ──
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  pickerTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  pickerSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.field,
  },
  pickerSearchInput: { flex: 1, fontSize: 14, color: C.text, padding: 0 },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  pickerThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: C.field },
  pickerThumbFallback: { alignItems: "center", justifyContent: "center", backgroundColor: C.amberSoft },
  pickerName: { fontSize: 14, fontWeight: "700", color: C.text },
});
