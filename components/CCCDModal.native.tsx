// app/components/CCCDModal.native.jsx
import React, { useMemo } from "react";
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  View,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import Ripple from "react-native-material-ripple";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useTheme } from "@react-navigation/native";
import { normalizeUrl } from "@/utils/normalizeUri";
import RefereeModalSurface, { modalStyles, refereeModalColors as M } from "./match/RefereeModalSurface";
// import { normalizeUrl } from "@/utils/normalizeUrl";

const textOf = (v) => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return String(v);
  if (typeof v === "object")
    return v.fullName || v.name || v.nickname || v.nick || "";
  return "";
};

const getCccd = (u) => u?.cccd || u?.user?.cccd || "";
const getCccdImages = (u) => {
  const img = u?.cccdImages || u?.user?.cccdImages || {};
  return {
    front: normalizeUrl(img?.front || ""),
    back: normalizeUrl(img?.back || ""),
  };
};

export default function CCCDModal({ visible, onClose, user, refereeDesign = false }) {
  const navTheme = useTheme();
  const { colors, dark } = navTheme;
  const sport = refereeDesign && (navTheme as any).version === "v2";
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const ModalRoot = sport ? View : SafeAreaView;

  // ===== Tokens đơn giản theo theme (fallback an toàn) =====
  const T = useMemo(
    () => ({
      bg: colors?.background ?? (dark ? "#0b1220" : "#ffffff"),
      text: colors?.text ?? (dark ? "#e5e7eb" : "#0f172a"),
      border: colors?.border ?? (dark ? "#334155" : "#e5e7eb"),
      surface: dark ? "#111827" : "#f8fafc",
      card: colors?.card ?? (dark ? "#0f172a" : "#ffffff"),
      muted: colors?.notification /* thường không dùng cho text */
        ? colors.notification
        : dark
        ? "#9CA3AF"
        : "#6b7280",
    }),
    [colors, dark]
  );

  const tokens = useMemo(() => sport ? { ...T, bg: M.surface, text: M.text, border: M.border, surface: M.control, card: M.card, muted: M.muted } : T, [sport, T]);
  const s = useMemo(() => makeStyles(tokens), [tokens]);

  const name = textOf(user) || "Vận động viên";
  const cccd = getCccd(user);
  const imgs = useMemo(() => getCccdImages(user), [user]);
  const hasFront = !!imgs.front;
  const hasBack = !!imgs.back;

  return (
    <Modal
      visible={!!visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      supportedOrientations={[
        "portrait",
        "landscape-left",
        "landscape-right",
        "landscape",
      ]}
    >
      <RefereeModalSurface enabled={sport}>
      <ModalRoot testID="referee-cccd-modal" style={s.wrap}>
        {/* Header */}
        <View style={[s.header, sport && modalStyles.header]}>
          <Text style={[s.title, sport && modalStyles.title]}>CCCD</Text>
          <Ripple
            accessibilityRole="button" accessibilityLabel="Đóng CCCD"
            onPress={onClose}
            style={[s.iconBtn, sport && modalStyles.headerIcon]}
            rippleContainerBorderRadius={8}
          >
            <MaterialIcons name="close" size={22} color={tokens.text} />
          </Ripple>
        </View>

        <ScrollView testID="referee-cccd-scroll" contentContainerStyle={[s.body, sport && { padding: 16 }]}>
          <View style={sport ? { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderWidth: 1, borderColor: M.border, borderRadius: 16, backgroundColor: M.card } : undefined}>
            {sport ? <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: M.outline, backgroundColor: M.control, alignItems: "center", justifyContent: "center" }}><MaterialIcons name="person" size={32} color={M.text} /></View> : null}
            <View style={sport ? { flex: 1, minWidth: 0 } : undefined}>
              <Text style={[s.name, sport && { fontSize: 18, lineHeight: 25 }]}>{name}</Text>
              <View style={[s.row, { marginTop: 8 }]}>
                {!sport ? <MaterialIcons name="badge" size={18} color={tokens.text} /> : null}
                <Text selectable={sport} style={[s.cccdText, sport && { marginLeft: 0, color: M.muted, fontWeight: "400", flexShrink: 1, lineHeight: 21 }]}>{cccd ? `Số CCCD: ${cccd}` : "Không có số CCCD"}</Text>
              </View>
            </View>
          </View>

          {hasFront || hasBack ? (
            <View style={[s.imgGrid, sport && { marginTop: 20, gap: 18, flexDirection: landscape ? "row" : "column" }]}>
              {hasFront ? (
                <View style={[s.imgCard, sport && { flex: landscape ? 1 : undefined, minWidth: 0, padding: 12, borderRadius: 16 }]}>
                  <Text style={[s.label, sport && { fontSize: 16, lineHeight: 22, marginBottom: 10 }]}>Mặt trước</Text>
                  <Image
                    source={{ uri: normalizeUrl(imgs.front) }}
                    style={[s.img, sport && { height: undefined, aspectRatio: 1.586 }]}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={0}
                  />
                </View>
              ) : null}

              {hasBack ? (
                <View style={[s.imgCard, sport && { flex: landscape ? 1 : undefined, minWidth: 0, padding: 12, borderRadius: 16 }]}>
                  <Text style={[s.label, sport && { fontSize: 16, lineHeight: 22, marginBottom: 10 }]}>Mặt sau</Text>
                  <Image
                    source={{ uri: normalizeUrl(imgs.back) }}
                    style={[s.img, sport && { height: undefined, aspectRatio: 1.586 }]}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={0}
                  />
                </View>
              ) : null}
            </View>
          ) : (
            <View style={s.empty}>
              <MaterialIcons
                name="image-not-supported"
                size={22}
                color={tokens.muted}
              />
              <Text style={s.emptyText}>Không có ảnh CCCD</Text>
            </View>
          )}
        </ScrollView>
      </ModalRoot>
      </RefereeModalSurface>
    </Modal>
  );
}

function makeStyles(T) {
  return StyleSheet.create({
    wrap: { flex: 1, backgroundColor: T.bg },
    header: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderColor: T.border,
      backgroundColor: T.card,
    },
    title: { fontSize: 18, fontWeight: "800", color: T.text },
    iconBtn: {
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: T.surface,
    },
    body: { padding: 14 },
    name: { fontSize: 16, fontWeight: "800", color: T.text },
    row: { flexDirection: "row", alignItems: "center", gap: 6 },
    cccdText: { marginLeft: 4, fontWeight: "700", color: T.text },

    imgGrid: { marginTop: 12, gap: 12 },
    imgCard: {
      backgroundColor: T.card,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: T.border,
    },
    label: { fontWeight: "700", color: T.text, marginBottom: 6 },
    img: {
      width: "100%",
      height: 260,
      borderRadius: 8,
      backgroundColor: T.surface,
    },

    empty: {
      marginTop: 16,
      paddingVertical: 18,
      borderWidth: 1,
      borderColor: T.border,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: T.card,
    },
    emptyText: { color: T.muted, fontWeight: "700" },
  });
}
