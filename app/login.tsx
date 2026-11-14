import React, { useMemo, useState } from "react";
import { useUiVersion } from "@/hooks/uiVersion";
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  useColorScheme,
  // ⬅️ THÊM,
} from "react-native";
import { TextInput } from "@/components/ui/i18nTextInput";
import { Text } from "@/components/ui/i18nText";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, Redirect, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import {
  useLazyGetMyRankQuery,
  useLoginMutation,
} from "@/slices/usersApiSlice";
import { setCredentials } from "@/slices/authSlice";
import { forceCheckpoint } from "@/slices/checkpointUiSlice";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LottieView from "lottie-react-native";
import {
  IOS_26_LIQUID_GLASS_ENABLED,
  normalizeAppRoutePath,
} from "@/utils/nativeTabs";
import { SHOULD_RENDER_NATIVE_LOTTIE } from "@/utils/runtimeSafety";
import AppleLiquidGlassView from "@/components/ui/AppleLiquidGlassView";
import { AuthBrand, useAuthWide } from "@/components/auth/AuthBrand";
import LoginCourtBackground from "@/components/auth/LoginCourtBackground";

/* ---------- Helpers ---------- */
const normEmail = (v) => (typeof v === "string" ? v.trim().toLowerCase() : v);
const normPhone = (v) => {
  if (typeof v !== "string") return v;
  let s = v.trim();
  if (!s) return s;
  if (s.startsWith("+84")) s = "0" + s.slice(3);
  s = s.replace(/[^\d]/g, "");
  return s;
};
const isLikelyPhone = (raw) => {
  if (!raw) return false;
  const s = normPhone(raw);
  return /^0\d{9}$/.test(s);
};

const getLoginErrorMessage = (err) => {
  if (err?.data?.message) return String(err.data.message);
  if (err?.data?.code === "UPGRADE_REQUIRED" || err?.status === 426) {
    return "Phiên bản ứng dụng này đã quá cũ hoặc bị chặn. Vui lòng cập nhật ứng dụng rồi thử lại.";
  }
  if (err?.data?.code === "MAINTENANCE" || err?.status === 503) {
    return "Hệ thống đang bảo trì. Vui lòng thử lại sau.";
  }
  if (err?.status === "FETCH_ERROR") {
    return "Không kết nối được tới máy chủ. Vui lòng kiểm tra mạng hoặc cập nhật ứng dụng.";
  }
  if (err?.status === "PARSING_ERROR") {
    return "Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại sau.";
  }
  if (err?.error) return String(err.error);
  return "Đăng nhập thất bại. Vui lòng kiểm tra lại.";
};

const LOGO_SRC = require("@/assets/images/icon.png");
const LOGO_V2_BADGE = require("@/assets/images/logo-v2-badge.png");
const BG_LOTTIE = require("@/assets/lottie/animated-bg.json");

function rgbaFromHex(color, alpha) {
  const hex = String(color || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return color;
  const value = parseInt(hex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function AuthGlassSurface({
  children,
  isDark,
  style,
  tintColor,
  effect = "clear",
  interactive = false,
}) {
  return (
    <AppleLiquidGlassView
      fallback="view"
      glassColorScheme={isDark ? "dark" : "light"}
      glassEffectStyle={effect}
      glassTintColor={
        tintColor ??
        (isDark ? "rgba(22,24,29,0.62)" : "rgba(255,255,255,0.76)")
      }
      isInteractive={interactive}
      style={style}
    >
      {children}
    </AppleLiquidGlassView>
  );
}

export default function LoginScreen() {
  const authWide = useAuthWide();
  const params = useLocalSearchParams<{
    returnTo?: string | string[];
    redirectTo?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? "light";
  const v2 = useUiVersion() === "v2";
  const isDark = v2 || scheme === "dark";
  const tint = v2 ? "#12B6F3" : isDark ? "#7cc0ff" : "#0a84ff";
  const textPrimary = v2 ? "#EAF3FF" : isDark ? "#fff" : "#111";
  const textSecondary = v2 ? "#8CA6C8" : isDark ? "#c9c9c9" : "#444";
  const border = v2 ? "rgba(92,180,255,0.16)" : isDark ? "#2e2f33" : "#dfe3ea";
  const logoBg = v2 ? "#0E2244" : isDark ? "#202329" : "#f3f5f9";

  const dispatch = useDispatch();
  const userInfo = useSelector((s) => s.auth?.userInfo);
  const [login, { isLoading }] = useLoginMutation();
  const [refreshMyRank] = useLazyGetMyRankQuery();
  const returnTo = useMemo(() => {
    const rawReturnTo = Array.isArray(params.returnTo)
      ? params.returnTo[0]
      : params.returnTo;
    const rawRedirectTo = Array.isArray(params.redirectTo)
      ? params.redirectTo[0]
      : params.redirectTo;
    const raw = String(rawReturnTo || rawRedirectTo || "/").trim();

    return normalizeAppRoutePath(raw || "/");
  }, [params.redirectTo, params.returnTo]);

  // State
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"login" | "password" | null>(null);
  const passwordInputRef = React.useRef<TextInput>(null);

  const kind = useMemo(() => {
    const v = (loginId || "").trim();
    if (v.includes("@")) return "email";
    if (isLikelyPhone(v)) return "phone";
    return "nickname";
  }, [loginId]);

  const kbType = useMemo(
    () =>
      kind === "email"
        ? "email-address"
        : kind === "phone" || /^[+\d\s().-]+$/.test((loginId || "").trim())
        ? "phone-pad"
        : "default",
    [kind, loginId]
  );

  const onSubmit = async () => {
    const id = (loginId || "").trim();
    const pass = typeof password === "string" ? password : "";

    if (!id || pass.length === 0) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tài khoản và mật khẩu.");
      return;
    }

    const payload =
      kind === "email"
        ? { email: normEmail(id), password: pass }
        : kind === "phone"
        ? { phone: normPhone(id), password: pass }
        : { nickname: id, password: pass };

    try {
      const res = await login(payload).unwrap();
      if (res?.checkpointRequired && res?.checkpoint?.token) {
        dispatch(
          forceCheckpoint({
            checkpoint: res.checkpoint,
            mandate: res.mandate || null,
            returnTo,
            source: "login",
          }),
        );
        return;
      }

      if (res?.checkpointRequired) {
        Alert.alert(
          "Cần xác minh",
          "Tài khoản cần checkpoint nhưng máy chủ chưa trả token xác minh. Vui lòng thử lại.",
        );
        return;
      }

      const normalized = res?.user ? { ...res.user, token: res.token } : res;

      dispatch(setCredentials(normalized));
      void refreshMyRank()
        .unwrap()
        .catch(() => {});

      router.replace(returnTo as any);
    } catch (err) {
      console.log("[login] auth failed", err);
      Alert.alert("Lỗi", getLoginErrorMessage(err));
    }
  };

  const shouldRedirect = !!userInfo;

  return shouldRedirect ? (
    <Redirect href={returnTo as any} />
  ) : (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: "#031429" }}>
        <LoginCourtBackground />
        {false && SHOULD_RENDER_NATIVE_LOTTIE ? (
          <LottieView
            source={BG_LOTTIE}
            autoPlay
            loop
            resizeMode="cover"
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
        ) : null}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: "transparent",
            },
          ]}
        />

        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: undefined })}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={[
                styles.scroll,
                {
                  flexDirection: authWide ? "row" : "column",
                  alignItems: authWide ? "stretch" : "center",
                  justifyContent: authWide ? "center" : "flex-start",
                  paddingTop: authWide ? 16 : 84,
                  paddingBottom: insets.bottom + 24,
                },
              ]}
              keyboardShouldPersistTaps="handled"
            >
              <AuthBrand wide={authWide} login />
              <AuthGlassSurface
                isDark={isDark}
                effect="regular"
                tintColor={
                  isDark ? "rgba(22,24,29,0.68)" : "rgba(255,255,255,0.82)"
                }
                style={[
                  styles.card,
                  IOS_26_LIQUID_GLASS_ENABLED && styles.glassPanel,
                  { backgroundColor: "#08223c", borderColor: "#215477", borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8, overflow: "hidden", width: authWide ? "54%" : "100%", maxWidth: authWide ? 520 : 460, alignSelf: "center" },
                ]}
              >
                <LinearGradient pointerEvents="none" colors={["#103c5b", "#071d35", "#06172d"]} style={StyleSheet.absoluteFillObject} />
                <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 24, right: 24, height: 2, backgroundColor: "#24c8ee", opacity: 0.8 }} />
                {false && <AuthGlassSurface
                  isDark={isDark}
                  tintColor={
                    isDark ? "rgba(32,35,41,0.7)" : "rgba(243,245,249,0.86)"
                  }
                  style={[
                    styles.logoWrap,
                    IOS_26_LIQUID_GLASS_ENABLED && styles.glassControl,
                    v2
                      ? {
                          backgroundColor: "transparent",
                          borderWidth: 0,
                          width: 190,
                          height: 160,
                          borderRadius: 0,
                          shadowOpacity: 0,
                        }
                      : { backgroundColor: logoBg, borderColor: border },
                  ]}
                >
                  <Image
                    source={v2 ? LOGO_V2_BADGE : LOGO_SRC}
                    style={v2 ? styles.logoV2 : styles.logo}
                    contentFit="contain"
                    transition={150}
                    cachePolicy="memory-disk"
                  />
                </AuthGlassSurface>}

                <Text style={[styles.title, { color: textPrimary }]}>
                  Đăng nhập
                </Text>

                <View style={styles.form}>
                  <Text style={[styles.label, { color: textSecondary }]}>
                    Email / Số điện thoại
                  </Text>
                  <AuthGlassSurface
                    isDark={isDark}
                    interactive
                    tintColor={
                      isDark
                        ? "rgba(32,35,41,0.62)"
                        : "rgba(255,255,255,0.78)"
                    }
                    style={[
                      styles.inputShell,
                      IOS_26_LIQUID_GLASS_ENABLED && styles.glassInput,
                      { borderColor: focusedField === "login" ? "#16c5ed" : "#285475", backgroundColor: "#061a30" },
                    ]}
                  >
                    <TextInput
                      value={loginId}
                      onChangeText={setLoginId}
                      onFocus={() => setFocusedField("login")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Email / Số điện thoại"
                      placeholderTextColor="#9aa0a6"
                      style={[styles.inputInside, { color: textPrimary }]}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType={kbType}
                      textContentType="username"
                      autoComplete="username"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                    />
                  </AuthGlassSurface>

                  <Text
                    style={[
                      styles.label,
                      { color: textSecondary, marginTop: 12 },
                    ]}
                  >
                    Mật khẩu
                  </Text>
                  <AuthGlassSurface
                    isDark={isDark}
                    interactive
                    tintColor={
                      isDark
                        ? "rgba(32,35,41,0.62)"
                        : "rgba(255,255,255,0.78)"
                    }
                    style={[
                      styles.inputShell,
                      IOS_26_LIQUID_GLASS_ENABLED && styles.glassInput,
                      { borderColor: focusedField === "password" ? "#16c5ed" : "#285475", backgroundColor: "#061a30" },
                    ]}
                  >
                    <TextInput
                      ref={passwordInputRef}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="••••••••"
                      placeholderTextColor="#9aa0a6"
                      style={[styles.inputInside, { color: textPrimary, paddingRight: 48 }]}
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      autoComplete="password"
                      returnKeyType="done"
                      onSubmitEditing={onSubmit}
                    />
                    <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onPress={() => setShowPassword((value) => !value)} style={{ position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center", paddingHorizontal: 6 }}><Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={textSecondary} /></Pressable>
                  </AuthGlassSurface>

                  <Pressable
                    onPress={onSubmit}
                    disabled={isLoading}
                    style={({ pressed }) => [
                      { opacity: isLoading ? 0.7 : 1, transform: [{ translateY: pressed ? 3 : 0 }, { scale: pressed ? 0.985 : 1 }] },
                    ]}
                  >
                    <AuthGlassSurface
                      isDark={isDark}
                      interactive={!isLoading}
                      tintColor={rgbaFromHex(tint, isDark ? 0.72 : 0.62)}
                      style={[
                        styles.btnSolid,
                        IOS_26_LIQUID_GLASS_ENABLED && styles.glassPrimaryBtn,
                        { backgroundColor: tint, borderBottomWidth: 4, borderBottomColor: "#087da6", shadowColor: "#00c8ff", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
                      ]}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.btnTextWhite}>Đăng nhập</Text>
                      )}
                    </AuthGlassSurface>
                  </Pressable>

                  <Pressable
                    onPress={() => router.push("/forgot-password")}
                    style={{ alignSelf: "center", marginTop: 10 }}
                  >
                    <Text
                      style={{
                        color: textPrimary,
                        fontWeight: "700",
                      }}
                    >
                      Quên mật khẩu?
                    </Text>
                  </Pressable>
                </View>
          <View style={{ marginTop: 24, gap: 10 }}>
            <Pressable
              onPress={() => router.replace("/")}
              style={({ pressed }) => [
                styles.btnOutlinePill,
                {
                  borderColor: border,
                  opacity: pressed ? 0.92 : 1,
                  backgroundColor: "#0a2944",
                  borderBottomWidth: pressed ? 1 : 3,
                  transform: [{ translateY: pressed ? 2 : 0 }],
                },
              ]}
            >
              <Text style={[styles.btnOutlineText, { color: textPrimary }]}>
                Trang chủ
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/register")}
              style={({ pressed }) => [
                styles.btnOutlinePill,
                {
                  borderColor: tint,
                  opacity: pressed ? 0.92 : 1,
                  marginTop: 0,
                  backgroundColor: "#083249",
                  borderBottomWidth: pressed ? 1 : 3,
                  transform: [{ translateY: pressed ? 2 : 0 }],
                },
              ]}
            >
              <Text style={[styles.btnOutlineText, { color: tint }]}>
                Đăng ký
              </Text>
            </Pressable>
          </View>
              </AuthGlassSurface>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>


      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 16, justifyContent: "center" },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  glassPanel: {
    borderColor: "rgba(255,255,255,0.24)",
    overflow: "hidden",
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  logoWrap: {
    alignSelf: "center",
    width: 110,
    height: 110,
    borderRadius: 60,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  glassControl: {
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  logo: { width: 88, height: 88, borderRadius: 18 },
  logoV2: { width: 168, height: 148 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  form: { marginTop: 4 },
  label: { fontSize: 13, marginBottom: 6 },
  inputShell: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  glassInput: {
    borderColor: "rgba(255,255,255,0.24)",
  },
  inputInside: {
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    fontSize: 16,
  },
  btnSolid: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  glassPrimaryBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
    shadowColor: "#0a84ff",
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  btnTextWhite: { color: "#fff", fontWeight: "700", fontSize: 16 },
  bottomActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  bottomActionsGlass: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.26)",
    overflow: "hidden",
  },
  btnOutlinePill: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutlineText: { fontWeight: "700", fontSize: 16 },
});
