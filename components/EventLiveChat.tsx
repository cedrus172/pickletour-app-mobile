// components/EventLiveChat.tsx
// Bình luận realtime trên trang xem live event (React Native)
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { EmitterSubscription } from "react-native";
import { useSelector } from "react-redux";
import { useSocket } from "@/context/SocketContext";
import {
  useGetEventLiveCommentsQuery,
  usePostEventLiveCommentMutation,
} from "@/slices/eventLiveApiSlice";
import { sk } from "@/hooks/uiVersion";

const MAX_LEN = 500;
const HEARTBEAT_INTERVAL = 30_000;

interface Comment {
  _id: string;
  user?: {
    _id: string;
    name?: string;
    fullName?: string;
    nickname?: string;
    nickName?: string;
    avatar?: string;
  };
  content: string;
  platform?: string;
  createdAt: string;
}

const fmtTime = (d: string) => {
  try {
    return new Date(d).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const getUserName = (u?: Comment["user"]) =>
  u?.nickName || u?.nickname || u?.fullName || u?.name || "Ẩn danh";

export default function EventLiveChat() {
  const socket = useSocket();
  const user = useSelector((s: any) => s.auth?.userInfo);
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data: initial } = useGetEventLiveCommentsQuery({ limit: 30 });
  const [postComment] = usePostEventLiveCommentMutation();

  // Hydrate initial comments
  useEffect(() => {
    if (initial?.comments) {
      setComments(initial.comments);
    }
  }, [initial]);

  // Socket.IO
  useEffect(() => {
    if (!socket) return;

    socket.emit("event-live:chat:subscribe");
    socket.emit("event-live:viewer:join", { platform: Platform.OS });

    const onNew = (c: Comment) => {
      setComments((prev) => {
        if (prev.some((x) => x._id === c._id)) return prev;
        return [...prev, c];
      });
    };
    const onDeleted = ({ _id }: { _id: string }) => {
      setComments((prev) => prev.filter((c) => c._id !== _id));
    };

    socket.on("event-live:comment:new", onNew);
    socket.on("event-live:comment:deleted", onDeleted);

    const hb = setInterval(() => {
      socket.emit("event-live:viewer:ping");
    }, HEARTBEAT_INTERVAL);

    return () => {
      socket.emit("event-live:viewer:leave");
      socket.emit("event-live:chat:unsubscribe");
      socket.off("event-live:comment:new", onNew);
      socket.off("event-live:comment:deleted", onDeleted);
      clearInterval(hb);
    };
  }, [socket]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (comments.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [comments.length]);

  // Scroll to end when keyboard appears
  useEffect(() => {
    const sub: EmitterSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 150);
      },
    );
    return () => sub.remove();
  }, []);

  const doSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);

    try {
      if (socket?.connected) {
        await new Promise<void>((resolve, reject) => {
          socket.emit(
            "event-live:comment:send",
            { content: text, platform: Platform.OS },
            (ack: any) => {
              if (ack?.ok) resolve();
              else reject(new Error(ack?.error || "failed"));
            },
          );
          setTimeout(() => reject(new Error("timeout")), 5000);
        });
      } else {
        await postComment({ content: text, platform: Platform.OS }).unwrap();
      }
      setInput("");
    } catch {
      try {
        await postComment({ content: text, platform: Platform.OS }).unwrap();
        setInput("");
      } catch {
        /* best effort */
      }
    }
    setSending(false);
  }, [input, sending, socket, postComment]);

  const renderItem = useCallback(
    ({ item }: { item: Comment }) => (
      <View style={styles.msgRow}>
        {item.user?.avatar ? (
          <Image
            source={{ uri: item.user.avatar }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {(item.user?.name || "?")[0]}
            </Text>
          </View>
        )}
        <View style={styles.msgBody}>
          <View style={styles.msgHeader}>
            <Text style={styles.userName}>{getUserName(item.user)}</Text>
            <Text style={styles.time}>{fmtTime(item.createdAt)}</Text>
          </View>
          <Text style={styles.content}>{item.content}</Text>
        </View>
      </View>
    ),
    [],
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>💬 Bình luận trực tiếp</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={comments}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      />

      {/* Input */}
      <View style={styles.inputRow}>
        {user ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nhập bình luận…"
              placeholderTextColor={sk("rgba(255,255,255,0.4)", "#97A3B8")}
              value={input}
              onChangeText={(t) => setInput(t.length <= MAX_LEN ? t : t.slice(0, MAX_LEN))}
              onSubmitEditing={doSend}
              returnKeyType="send"
              editable={!sending}
              maxLength={MAX_LEN}
            />
            <Pressable
              onPress={doSend}
              disabled={!input.trim() || sending}
              style={[
                styles.sendBtn,
                (!input.trim() || sending) && styles.sendBtnDisabled,
              ]}
            >
              <Text style={styles.sendBtnText}>
                {sending ? "…" : "Gửi"}
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.loginHint}>Đăng nhập để bình luận</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: sk("rgba(0,0,0,0.3)", "#FFFFFF"),
    borderRadius: 12,
    overflow: "hidden",
    ...sk({}, { borderWidth: 1, borderColor: "rgba(16,42,92,0.08)" }),
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: sk("rgba(255,255,255,0.1)", "rgba(16,42,92,0.10)"),
  },
  headerText: { color: sk("#fff", "#0B1B3A"), fontWeight: "700", fontSize: 14 },
  list: { flex: 1 },
  listContent: { padding: 10, paddingBottom: 4 },
  msgRow: { flexDirection: "row", marginBottom: 8, gap: 8 },
  avatar: { width: 26, height: 26, borderRadius: 13, marginTop: 2 },
  avatarPlaceholder: {
    backgroundColor: sk("rgba(255,255,255,0.15)", "rgba(20,102,242,0.12)"),
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: sk("#fff", "#1466F2"), fontSize: 12, fontWeight: "700" },
  msgBody: { flex: 1 },
  msgHeader: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  userName: { color: sk("#4dd0e1", "#1466F2"), fontWeight: "700", fontSize: 12 },
  time: { color: sk("rgba(255,255,255,0.35)", "#97A3B8"), fontSize: 10 },
  content: {
    color: sk("rgba(255,255,255,0.9)", "#243450"),
    fontSize: 13,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: sk("rgba(255,255,255,0.1)", "rgba(16,42,92,0.10)"),
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: sk("rgba(255,255,255,0.08)", "#EEF3FA"),
    color: sk("#fff", "#0B1B3A"),
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: sk("rgba(255,255,255,0.15)", "rgba(16,42,92,0.10)"),
  },
  sendBtn: {
    backgroundColor: sk("#4dd0e1", "#1466F2"),
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: sk("#000", "#FFFFFF"), fontWeight: "700", fontSize: 13 },
  loginHint: {
    color: sk("rgba(255,255,255,0.5)", "#5F6F8A"),
    textAlign: "center",
    flex: 1,
    fontSize: 13,
  },
});
