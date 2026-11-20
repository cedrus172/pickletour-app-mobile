// components/profile/FacebookLinkRow.tsx
// Mục "Liên kết Facebook" trong Cài đặt hồ sơ: liên kết tài khoản Facebook để đăng nhập nhanh.
// (KHÁC settings/facebook-pages — đó là kết nối Page để livestream.)
// Luồng web-auth qua expo-web-browser → OTA được, không cần SDK native.
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import {
  useGetFacebookLinkUrlMutation,
  useGetMyFacebookLinkQuery,
  useUnlinkFacebookMutation,
} from "@/slices/usersApiSlice";
import {
  facebookAuthErrorMessage,
  openFacebookAuthSession,
} from "@/utils/facebookAuth";
import { t as tr } from "@/utils/i18n";

const FB_BLUE = "#1877F2";

function formatDate(v: any) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

type Props = {
  /** Khoảng cách phía trên (khi đặt sau một hàng khác trong cùng thẻ). */
  topSpacing?: number;
};

export default function FacebookLinkRow({ topSpacing = 0 }: Props) {
  const C = useThemeTokens();
  const styles = useMemo(() => mk_styles(C), [C]);
  const { data, refetch } = useGetMyFacebookLinkQuery(undefined);
  const [getLinkUrl] = useGetFacebookLinkUrlMutation();
  const [unlink, { isLoading: unlinking }] = useUnlinkFacebookMutation();
  const [linking, setLinking] = useState(false);

  const info: any = data || null;
  const linked = !!info?.linked;
  if (!info || (!info.enabled && !linked)) return null;

  const onLink = async () => {
    if (linking) return;
    setLinking(true);
    try {
      const r: any = await getLinkUrl(undefined).unwrap();
      if (!r?.url) throw new Error(tr("Không lấy được liên kết Facebook."));
      const p = await openFacebookAuthSession(r.url, r.redirect);
      if (!p) return; // tự đóng trình duyệt
      if (p.fb === "linked") {
        Alert.alert(
          "Đã liên kết Facebook",
          p.name ? `Facebook "${p.name}"` : undefined,
        );
        refetch();
        return;
      }
      if (p.fb === "cancel") {
        if (p.msg) Alert.alert("Thông báo", p.msg);
        return;
      }
      Alert.alert("Lỗi", p.msg || "Liên kết Facebook thất bại.");
      refetch();
    } catch (err) {
      Alert.alert("Lỗi", facebookAuthErrorMessage(err, "Liên kết Facebook thất bại."));
    } finally {
      setLinking(false);
    }
  };

  const doUnlink = async () => {
    try {
      await unlink(undefined).unwrap();
      refetch();
      Alert.alert("Đã huỷ liên kết Facebook");
    } catch (err) {
      Alert.alert("Lỗi", facebookAuthErrorMessage(err, "Huỷ liên kết thất bại."));
    }
  };

  const onUnlink = () => {
    Alert.alert(
      "Huỷ liên kết Facebook?",
      "Bạn sẽ không đăng nhập bằng Facebook này được nữa.",
      [
        { text: "Huỷ", style: "cancel" },
        { text: "Huỷ liên kết", style: "destructive", onPress: doUnlink },
      ],
    );
  };

  const linkedAt = formatDate(info?.linkedAt);

  return (
    <View style={[styles.row, topSpacing ? { marginTop: topSpacing } : null]}>
      <View style={styles.left}>
        {linked && info?.picture ? (
          <Image
            source={{ uri: String(info.picture) }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.iconWrap}>
            <Ionicons name="logo-facebook" size={18} color="#fff" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.label} numberOfLines={1}>
            {linked ? info?.name || "Facebook" : "Liên kết Facebook"}
          </Text>
          <Text style={styles.hint} numberOfLines={2}>
            {linked
              ? linkedAt
                ? `${tr("Đã liên kết ngày")} ${linkedAt}`
                : "Đã liên kết Facebook"
              : "Đăng nhập nhanh bằng tài khoản Facebook."}
          </Text>
        </View>
      </View>

      {linked ? (
        <Pressable
          onPress={onUnlink}
          disabled={unlinking}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.btnOutline,
            { opacity: unlinking ? 0.6 : pressed ? 0.8 : 1 },
          ]}
        >
          {unlinking ? (
            <ActivityIndicator size="small" color={C.redText} />
          ) : (
            <Text style={styles.btnOutlineText}>Huỷ liên kết</Text>
          )}
        </Pressable>
      ) : (
        <Pressable
          onPress={onLink}
          disabled={linking}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.btnFb,
            { opacity: linking ? 0.7 : pressed ? 0.85 : 1 },
          ]}
        >
          {linking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.btnFbText}>Liên kết</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const mk_styles = (C: ThemeTokens) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    left: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: FB_BLUE,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.field,
    },
    label: { fontSize: 15, fontWeight: "600", color: C.text },
    hint: { marginTop: 4, fontSize: 12, lineHeight: 16, color: C.sub },
    btnFb: {
      minWidth: 84,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: FB_BLUE,
      alignItems: "center",
      justifyContent: "center",
    },
    btnFbText: { color: "#fff", fontWeight: "700", fontSize: 13 },
    btnOutline: {
      minWidth: 96,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.redText,
      backgroundColor: C.redSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    btnOutlineText: { color: C.redText, fontWeight: "700", fontSize: 13 },
  });
