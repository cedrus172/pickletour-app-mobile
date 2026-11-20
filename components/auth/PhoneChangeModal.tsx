// components/auth/PhoneChangeModal.tsx
// Đổi số điện thoại ĐÃ xác minh — 2 bước OTP Zalo:
//   1) OTP về số CŨ: POST /phone/change/request-old-otp → verify-old-otp {otp} → oldPhoneToken
//   2) Số MỚI: POST /phone/request-otp {phone, oldPhoneToken} → POST /phone/verify-otp {otp}
// 403 code "old_phone_otp_required" → quay lại bước 1. 429 → gửi quá nhiều.
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import AppModal from "@/components/ui/AppModal";
import { Text } from "@/components/ui/i18nText";
import { TextInput } from "@/components/ui/i18nTextInput";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { setCredentials } from "@/slices/authSlice";
import {
  useRequestOldPhoneChangeOtpMutation,
  useRequestPhoneOtpMutation,
  useVerifyOldPhoneChangeOtpMutation,
  useVerifyPhoneActivationOtpMutation,
} from "@/slices/usersApiSlice";
import { t as tr } from "@/utils/i18n";

const RESEND_SECONDS = 60;
const OTP_LENGTH = 6;

type Step = "old-send" | "old-otp" | "new-phone" | "new-otp";

const normPhone = (v: string) => {
  let s = String(v || "").trim();
  if (s.startsWith("+84")) s = "0" + s.slice(3);
  return s.replace(/[^\d]/g, "");
};

function errorText(e: any, fallback: string) {
  if (e?.status === 429) {
    return String(
      e?.data?.message || tr("Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau."),
    );
  }
  return String(e?.data?.message || e?.error || fallback);
}

export default function PhoneChangeModal({
  visible,
  currentPhone,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  currentPhone?: string;
  onClose: () => void;
  onSuccess?: (phone: string) => void;
}) {
  const C = useThemeTokens();
  const styles = useMemo(() => mk_styles(C), [C]);
  const dispatch = useDispatch();
  const userInfo: any = useSelector((s: any) => s.auth?.userInfo);

  const [requestOld, { isLoading: sendingOld }] = useRequestOldPhoneChangeOtpMutation();
  const [verifyOld, { isLoading: verifyingOld }] = useVerifyOldPhoneChangeOtpMutation();
  const [requestNew, { isLoading: sendingNew }] = useRequestPhoneOtpMutation();
  const [verifyNew, { isLoading: verifyingNew }] = useVerifyPhoneActivationOtpMutation();

  const [step, setStep] = useState<Step>("old-send");
  const [otp, setOtp] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [phoneMasked, setPhoneMasked] = useState("");
  const [oldPhoneToken, setOldPhoneToken] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");

  // Mở lại modal → bắt đầu từ đầu.
  useEffect(() => {
    if (!visible) return;
    setStep("old-send");
    setOtp("");
    setNewPhone("");
    setPhoneMasked("");
    setOldPhoneToken("");
    setCooldown(0);
    setError("");
  }, [visible]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const backToOldStep = (msg?: string) => {
    setStep("old-send");
    setOtp("");
    setOldPhoneToken("");
    setCooldown(0);
    setError(
      msg ||
        tr("Phiên xác minh số cũ đã hết hạn. Vui lòng xác minh lại số hiện tại."),
    );
  };

  const handleError = (e: any, fallback: string) => {
    if (e?.status === 403 && e?.data?.code === "old_phone_otp_required") {
      backToOldStep(e?.data?.message);
      return;
    }
    setError(errorText(e, fallback));
  };

  const sendOld = async () => {
    setError("");
    try {
      const res: any = await requestOld(undefined).unwrap();
      setPhoneMasked(res?.phoneMasked || "");
      setOtp("");
      setStep("old-otp");
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      handleError(e, tr("Gửi OTP thất bại"));
    }
  };

  const confirmOld = async () => {
    if (otp.length < OTP_LENGTH) return;
    setError("");
    try {
      const res: any = await verifyOld({ otp }).unwrap();
      if (!res?.oldPhoneToken) throw { data: { message: tr("Xác thực thất bại") } };
      setOldPhoneToken(String(res.oldPhoneToken));
      setOtp("");
      setCooldown(0);
      setStep("new-phone");
    } catch (e) {
      handleError(e, tr("Xác thực thất bại"));
    }
  };

  const phone = normPhone(newPhone);
  const phoneValid = /^0\d{9}$/.test(phone);
  const samePhone = !!phone && phone === normPhone(currentPhone || "");

  const sendNew = async () => {
    if (!phoneValid) {
      setError(tr("Số điện thoại không hợp lệ"));
      return;
    }
    if (samePhone) {
      setError(tr("Số mới phải khác số hiện tại"));
      return;
    }
    setError("");
    try {
      const res: any = await requestNew({ phone, oldPhoneToken }).unwrap();
      setPhoneMasked(res?.phoneMasked || phone);
      setOtp("");
      setStep("new-otp");
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      handleError(e, tr("Gửi OTP thất bại"));
    }
  };

  const confirmNew = async () => {
    if (otp.length < OTP_LENGTH) return;
    setError("");
    try {
      const res: any = await verifyNew({ otp }).unwrap();
      const finalPhone = String(res?.phone || phone);
      // Giữ token cũ, chỉ thay SĐT.
      dispatch(
        setCredentials({ ...userInfo, phone: finalPhone, phoneVerified: true }),
      );
      onSuccess?.(finalPhone);
      onClose();
    } catch (e) {
      handleError(e, tr("Xác thực thất bại"));
    }
  };

  const isOtpStep = step === "old-otp" || step === "new-otp";
  const busy = sendingOld || verifyingOld || sendingNew || verifyingNew;

  return (
    <AppModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.backdrop}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Text style={styles.title}>Đổi số điện thoại</Text>
              <Text style={styles.stepLabel}>
                {step === "old-send" || step === "old-otp"
                  ? "Bước 1/2 · Xác minh số hiện tại"
                  : "Bước 2/2 · Xác minh số mới"}
              </Text>

              {step === "old-send" ? (
                <>
                  <Text style={styles.body}>
                    Gửi mã OTP qua Zalo tới số hiện tại:{" "}
                    <Text style={styles.bold}>{currentPhone || ""}</Text>
                  </Text>
                  <Pressable
                    style={[styles.btnPrimary, busy && styles.btnDisabled]}
                    disabled={busy}
                    onPress={sendOld}
                  >
                    {sendingOld ? (
                      <ActivityIndicator color={C.onPrimary} />
                    ) : (
                      <Text style={styles.btnPrimaryText}>Gửi mã OTP</Text>
                    )}
                  </Pressable>
                </>
              ) : null}

              {step === "new-phone" ? (
                <>
                  <Text style={styles.body}>
                    Nhập số điện thoại mới. Mã OTP sẽ gửi qua Zalo tới số này.
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={newPhone}
                    onChangeText={(v) => setNewPhone(v.replace(/[^\d+]/g, ""))}
                    placeholder="0987654321"
                    placeholderTextColor={C.muted}
                    keyboardType="phone-pad"
                    maxLength={12}
                    autoFocus
                  />
                  <Pressable
                    style={[
                      styles.btnPrimary,
                      (busy || !phoneValid) && styles.btnDisabled,
                    ]}
                    disabled={busy || !phoneValid}
                    onPress={sendNew}
                  >
                    {sendingNew ? (
                      <ActivityIndicator color={C.onPrimary} />
                    ) : (
                      <Text style={styles.btnPrimaryText}>Gửi mã OTP</Text>
                    )}
                  </Pressable>
                </>
              ) : null}

              {isOtpStep ? (
                <>
                  <Text style={styles.body}>
                    Nhập mã OTP đã gửi tới{" "}
                    <Text style={styles.bold}>{phoneMasked}</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    value={otp}
                    onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                    placeholder="••••••"
                    placeholderTextColor={C.muted}
                    keyboardType="number-pad"
                    systemKeyboard
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                    maxLength={OTP_LENGTH}
                    autoFocus
                  />
                  <View style={styles.row}>
                    {step === "new-otp" ? (
                      <Pressable
                        onPress={() => {
                          setStep("new-phone");
                          setOtp("");
                          setError("");
                        }}
                        disabled={busy}
                      >
                        <Text style={styles.link}>Đổi số khác</Text>
                      </Pressable>
                    ) : (
                      <View />
                    )}
                    <Pressable
                      onPress={step === "old-otp" ? sendOld : sendNew}
                      disabled={busy || cooldown > 0}
                    >
                      <Text
                        style={[styles.link, cooldown > 0 && { color: C.muted }]}
                      >
                        {cooldown > 0
                          ? `${tr("Gửi lại mã")} (${cooldown}s)`
                          : "Gửi lại mã"}
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable
                    style={[
                      styles.btnPrimary,
                      (busy || otp.length < OTP_LENGTH) && styles.btnDisabled,
                    ]}
                    disabled={busy || otp.length < OTP_LENGTH}
                    onPress={step === "old-otp" ? confirmOld : confirmNew}
                  >
                    {verifyingOld || verifyingNew ? (
                      <ActivityIndicator color={C.onPrimary} />
                    ) : (
                      <Text style={styles.btnPrimaryText}>Xác nhận</Text>
                    )}
                  </Pressable>
                </>
              ) : null}

              {!!error && <Text style={styles.error}>{error}</Text>}

              <Pressable style={styles.cancel} onPress={onClose}>
                <Text style={styles.cancelText}>Huỷ</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </AppModal>
  );
}

const mk_styles = (C: ThemeTokens) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: C.overlay },
    scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
    card: { backgroundColor: C.card, borderRadius: 16, padding: 20 },
    title: { fontSize: 18, fontWeight: "800", color: C.text, marginBottom: 4 },
    stepLabel: { fontSize: 12, fontWeight: "700", color: C.primary, marginBottom: 12 },
    body: { fontSize: 14, color: C.text2, marginBottom: 10, lineHeight: 20 },
    bold: { fontWeight: "700", color: C.text },
    input: {
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: C.text,
      marginBottom: 10,
    },
    otpInput: { letterSpacing: 6, textAlign: "center", fontSize: 20 },
    row: { flexDirection: "row", justifyContent: "space-between" },
    link: { color: C.primary, fontWeight: "600", fontSize: 13, marginBottom: 10 },
    btnPrimary: {
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: "center",
      marginTop: 6,
    },
    btnPrimaryText: { color: C.onPrimary, fontWeight: "700", fontSize: 15 },
    btnDisabled: { opacity: 0.5 },
    error: { color: C.redText, fontSize: 13, marginTop: 10 },
    cancel: { alignItems: "center", marginTop: 14 },
    cancelText: { color: C.sub, fontWeight: "600" },
  });
