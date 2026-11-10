// components/clubs/ClubCreateModal.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";

import TextInput from "@/components/ui/TextInput";
import { Chip } from "@/components/ui/Chip";
import Button from "@/components/ui/Button";

import {
  useCreateClubMutation,
  useUpdateClubMutation,
} from "@/slices/clubsApiSlice";
import { useUploadAvatarMutation } from "@/slices/uploadApiSlice";
import { VN_PROVINCES } from "@/constants/provinces";

import { StatusBar } from "expo-status-bar";
import { normalizeUrl } from "@/utils/normalizeUri";
// 1. IMPORT THEME
import { useTheme } from "@react-navigation/native";

import AppModal, { ModalTopInset } from "@/components/ui/AppModal";
type ClubCreateModalProps = {
  visible: boolean;
  onClose: (changed?: boolean) => void;
  onCreated?: (club: any) => void;
  initial?: any;
};

// ... CONSTANTS (Giữ nguyên) ...
const VISIBILITY_OPTIONS = ["public", "private", "hidden"] as const;
const VISIBILITY_LABELS: Record<string, string> = {
  public: "Công khai",
  private: "Riêng tư",
  hidden: "Ẩn (không hiển thị)",
};
const VISIBILITY_HINTS: Record<string, string> = {
  public: "Ai cũng tìm thấy & xem trang CLB.",
  private: "Người lạ chỉ thấy thông tin cơ bản.",
  hidden: "Không hiển thị khi tìm kiếm.",
};
const JOIN_POLICY_OPTIONS = ["open", "approval", "invite_only"] as const;
const JOIN_POLICY_LABELS: Record<string, string> = {
  open: "Tự do",
  approval: "Duyệt tham gia",
  invite_only: "Chỉ mời",
};
const JOIN_POLICY_HINTS: Record<string, string> = {
  open: "Bất kỳ ai cũng có thể vào ngay.",
  approval: "Cần admin duyệt.",
  invite_only: "Chỉ admin mới mời được.",
};
const MEMBER_VIS_OPTIONS = [
  { value: "admins", label: "Chỉ quản trị" },
  { value: "members", label: "Thành viên" },
  { value: "public", label: "Mọi người" },
] as const;

function getAllowedJoinPolicies(visibility: string) {
  if (visibility === "hidden") return ["invite_only"] as const;
  if (visibility === "private") return ["approval", "invite_only"] as const;
  return ["open", "approval", "invite_only"] as const;
}

function getAllowedMemberVis(visibility: string) {
  if (visibility === "hidden") return ["admins"] as const;
  if (visibility === "private") return ["admins", "members"] as const;
  return ["admins", "members", "public"] as const;
}

const pickUrl = (res: any) =>
  res?.url || res?.secure_url || res?.data?.url || res?.path || "";

function extractErrorMessage(err: any) {
  if (!err) return "Lỗi không xác định";
  return (
    (err as any)?.data?.message || (err as any)?.message || "Đã xảy ra lỗi"
  );
}


export default function ClubCreateModal({
  visible,
  onClose,
  onCreated,
  initial,
}: ClubCreateModalProps) {
  // 2. SETUP THEME
  const theme = useTheme();
  const isDark = theme.dark;

  const colors = useMemo(
    () => ({
      bg: "#03172d",
      card: "#0a2943",
      text: "#FFF",
      subText: "#a9bfd6",
      border: "#31536e",
      placeholder: "#91a9bf",
      inputBg: "#0a2139",
      switchOff: isDark ? "#444" : "#d1d5db",
      sheetHandle: isDark ? "#444" : "#e5e7eb",
      divider: isDark ? "#333" : "#eee",
      logoBorder: isDark ? "#1E1E1E" : "#fff",
    }),
    [isDark]
  );


  const isEdit = !!initial?._id;
  const [focusField, setFocusField] = useState<string | null>(null);
  const [form, setForm] = useState<any>(() => ({
    name: initial?.name || "",
    description: initial?.description || "",
    sportTypes: initial?.sportTypes || ["pickleball"],
    visibility: initial?.visibility || "public",
    joinPolicy: initial?.joinPolicy || "approval",
    memberVisibility: initial?.memberVisibility || "admins",
    showRolesToMembers: !!initial?.showRolesToMembers,
    requireVerifiedPhoneToJoin: !!initial?.requireVerifiedPhoneToJoin,
    province: initial?.province || "",
    city: initial?.city || "",
    shortCode: initial?.shortCode || "",
    logoUrl: initial?.logoUrl || "",
    coverUrl: initial?.coverUrl || "",
  }));

  useEffect(() => {
    if (!visible) return;
    setForm({
      name: initial?.name || "",
      description: initial?.description || "",
      sportTypes: initial?.sportTypes || ["pickleball"],
      visibility: initial?.visibility || "public",
      joinPolicy: initial?.joinPolicy || "approval",
      memberVisibility: initial?.memberVisibility || "admins",
      showRolesToMembers: !!initial?.showRolesToMembers,
      province: initial?.province || "",
      city: initial?.city || "",
      shortCode: initial?.shortCode || "",
      logoUrl: initial?.logoUrl || "",
      coverUrl: initial?.coverUrl || "",
    });
  }, [visible, initial]);

  const [createClub, { isLoading: creating }] = useCreateClubMutation();
  const [updateClub, { isLoading: updating }] = useUpdateClubMutation();
  const [uploadAvatar, { isLoading: uploading }] = useUploadAvatarMutation();

  const canSubmit = useMemo(
    () => (form.name || "").trim().length >= 3,
    [form.name]
  );

  const allowedJoinPolicies = useMemo(
    () => getAllowedJoinPolicies(form.visibility),
    [form.visibility]
  );
  useEffect(() => {
    if (!allowedJoinPolicies.includes(form.joinPolicy)) {
      setForm((f: any) => ({ ...f, joinPolicy: allowedJoinPolicies[0] }));
    }
  }, [allowedJoinPolicies, form.joinPolicy]);

  const allowedMemberVis = useMemo(
    () => getAllowedMemberVis(form.visibility),
    [form.visibility]
  );
  useEffect(() => {
    if (!allowedMemberVis.includes(form.memberVisibility)) {
      setForm((f: any) => ({ ...f, memberVisibility: allowedMemberVis[0] }));
    }
  }, [allowedMemberVis, form.memberVisibility]);

  const pickImage = async (field: "logoUrl" | "coverUrl") => {
    if (Platform.OS !== "android") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
    }
    const rs = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsMultipleSelection: false,
    });
    if (rs.canceled || !rs.assets?.[0]) return;
    const asset = rs.assets[0];
    const file: any = {
      uri: asset.uri,
      name: (asset as any).fileName || `${field}-${Date.now()}.jpg`,
      type: asset.mimeType || "image/jpeg",
    };
    try {
      const res: any = await uploadAvatar(file).unwrap();
      const url = pickUrl(res);
      if (!url) throw new Error("Server không trả URL ảnh");
      setForm((f: any) => ({ ...f, [field]: url }));
    } catch (e) {
      console.warn("Upload error", e);
    }
  };

  const onSubmit = async () => {
    if (!canSubmit || uploading) return;
    const body = { ...form };
    try {
      const res: any = isEdit
        ? await updateClub({ id: initial._id, ...body }).unwrap()
        : await createClub(body).unwrap();
      onCreated?.(res);
      onClose?.(true);
    } catch (err) {
      console.warn("Save club error", extractErrorMessage(err));
    }
  };

  const [showProvincePicker, setShowProvincePicker] = useState(false);

  const scrollRef = useRef<Animated.ScrollView | null>(null);
  const ensureVisible = useCallback(() => {
    // @ts-ignore
    scrollRef.current?.getNode?.()?.scrollToEnd?.({ animated: true });
  }, []);

  return (
    <AppModal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => onClose?.(false)}
    >
<ModalTopInset>{(modalTop) => (<>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View style={[styles.modalRoot, { backgroundColor: colors.bg }]}>
        <View style={{ paddingTop: Math.max(modalTop, 12), paddingHorizontal: 16, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => onClose?.(false)} accessibilityRole="button" accessibilityLabel="Đóng">
            <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { flex: 1 }]}>{isEdit ? "Sửa câu lạc bộ" : "Tạo câu lạc bộ"}</Text>
        </View>

        {/* === BODY CONTENT === */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Animated.ScrollView
            ref={scrollRef as any}
            contentContainerStyle={{
              paddingTop: 12,
              paddingHorizontal: 16,
              paddingBottom: 40,
            }}
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* NAME */}
            <TextInput
              placeholder="Tên CLB *"
              value={form.name}
              onChangeText={(v: string) =>
                setForm((f: any) => ({ ...f, name: v }))
              }
              onFocus={() => setFocusField("name")}
              onBlur={() => setFocusField(null)}
              // Dynamic Theme
              placeholderTextColor={colors.placeholder}
              style={{ color: colors.text }}
              containerStyle={[
                styles.inputContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
                focusField === "name" && styles.inputFocus,
                { marginBottom: 12 },
              ]}
            />

            {/* DESCRIPTION */}
            <TextInput
              placeholder="Mô tả"
              value={form.description}
              onChangeText={(v: string) =>
                setForm((f: any) => ({ ...f, description: v }))
              }
              multiline
              numberOfLines={4}
              onFocus={() => setFocusField("description")}
              onBlur={() => setFocusField(null)}
              // Dynamic Theme
              placeholderTextColor={colors.placeholder}
              style={{ color: colors.text }}
              containerStyle={[
                styles.inputContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
                focusField === "description" && styles.inputFocus,
                { marginBottom: 12 },
              ]}
            />

            {/* Configs */}
            <FieldLabel
              title="Hiển thị"
              subtitle={VISIBILITY_HINTS[form.visibility]}
              colors={colors}
            />
            <View style={styles.rowWrap}>
              {VISIBILITY_OPTIONS.map((v) => (
                <Chip
                  key={v}
                  label={VISIBILITY_LABELS[v]}
                  selected={form.visibility === v}
                  onPress={() => setForm((f: any) => ({ ...f, visibility: v }))}
                  style={styles.chip}
                  // Chip usually handles theme internally if implemented correctly,
                  // or you can pass style overrides here.
                />
              ))}
            </View>

            <FieldLabel
              title="Chính sách gia nhập"
              subtitle={JOIN_POLICY_HINTS[form.joinPolicy]}
              colors={colors}
            />
            <View style={styles.rowWrap}>
              {JOIN_POLICY_OPTIONS.map((jp) => (
                <Chip
                  key={jp}
                  label={JOIN_POLICY_LABELS[jp]}
                  disabled={!allowedJoinPolicies.includes(jp as any)}
                  selected={form.joinPolicy === jp}
                  onPress={() =>
                    allowedJoinPolicies.includes(jp as any) &&
                    setForm((f: any) => ({ ...f, joinPolicy: jp }))
                  }
                  style={styles.chip}
                />
              ))}
            </View>

            <FieldLabel title="Ai được xem thành viên" colors={colors} />
            <View style={styles.rowWrap}>
              {MEMBER_VIS_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  disabled={!allowedMemberVis.includes(opt.value as any)}
                  selected={form.memberVisibility === opt.value}
                  onPress={() =>
                    allowedMemberVis.includes(opt.value as any) &&
                    setForm((f: any) => ({ ...f, memberVisibility: opt.value }))
                  }
                  style={styles.chip}
                />
              ))}
            </View>

            <View style={[styles.rowBetween, { marginBottom: 14 }]}>
              <Text style={[styles.fieldTitle, { color: colors.text }]}>
                Hiện nhãn Admin/Owner
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setForm((f: any) => ({
                    ...f,
                    showRolesToMembers: !f.showRolesToMembers,
                  }))
                }
                style={[
                  styles.switchBtn,
                  { backgroundColor: colors.switchOff }, // Dynamic off color
                  form.showRolesToMembers && styles.switchOn,
                ]}
              >
                <View
                  style={[
                    styles.switchDot,
                    form.showRolesToMembers && styles.switchDotOn,
                  ]}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.rowBetween, { marginBottom: 14 }]}>
              <Text style={[styles.fieldTitle, { color: colors.text, flex: 1, marginRight: 10 }]}>
                Chỉ nhận thành viên đã kích hoạt SĐT (Zalo)
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setForm((f: any) => ({
                    ...f,
                    requireVerifiedPhoneToJoin: !f.requireVerifiedPhoneToJoin,
                  }))
                }
                style={[
                  styles.switchBtn,
                  { backgroundColor: colors.switchOff },
                  form.requireVerifiedPhoneToJoin && styles.switchOn,
                ]}
              >
                <View
                  style={[
                    styles.switchDot,
                    form.requireVerifiedPhoneToJoin && styles.switchDotOn,
                  ]}
                />
              </TouchableOpacity>
            </View>

            {/* Address */}
            <FieldLabel title="Địa chỉ" colors={colors} />
            <TouchableOpacity
              onPress={() => setShowProvincePicker(true)}
              activeOpacity={0.8}
              style={{ marginBottom: 10 }}
            >
              <View
                style={[
                  styles.selectInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={
                    form.province
                      ? [styles.selectValue, { color: colors.text }]
                      : [
                          styles.selectPlaceholder,
                          { color: colors.placeholder },
                        ]
                  }
                >
                  {form.province || "Tỉnh/Thành"}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color={colors.placeholder}
                />
              </View>
            </TouchableOpacity>

            <TextInput
              placeholder="Quận/Huyện"
              value={form.city}
              onChangeText={(v: string) =>
                setForm((f: any) => ({ ...f, city: v }))
              }
              onFocus={() => {
                setFocusField("city");
                ensureVisible();
              }}
              onBlur={() => setFocusField(null)}
              // Dynamic Theme
              placeholderTextColor={colors.placeholder}
              style={{ color: colors.text }}
              containerStyle={[
                styles.inputContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
                focusField === "city" && styles.inputFocus,
                { marginBottom: 12 },
              ]}
            />

            <TextInput
              placeholder="Mã ngắn (VD: PBC)"
              value={form.shortCode}
              onChangeText={(v: string) =>
                setForm((f: any) => ({ ...f, shortCode: v }))
              }
              onFocus={() => {
                setFocusField("shortCode");
                ensureVisible();
              }}
              onBlur={() => setFocusField(null)}
              autoCapitalize="characters"
              // Dynamic Theme
              placeholderTextColor={colors.placeholder}
              style={{ color: colors.text }}
              containerStyle={[
                styles.inputContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
                focusField === "shortCode" && styles.inputFocus,
              ]}
            />

            <Text style={[styles.fieldTitle, { color: colors.text, marginTop: 18 }]}>Ảnh câu lạc bộ</Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              {(["logoUrl", "coverUrl"] as const).map((field) => (
                <TouchableOpacity key={field} onPress={() => pickImage(field)} disabled={uploading} style={{ flex: 1, height: 110, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", borderRadius: 14, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: colors.card }}>
                  {form[field] ? <Image source={{ uri: normalizeUrl(form[field]) }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <MaterialCommunityIcons name="image-plus" size={28} color="#a9bfd6" />}
                  {!form[field] && <Text style={{ color: colors.text, marginTop: 8 }}>{field === "logoUrl" ? "Chọn ảnh đại diện" : "Chọn ảnh bìa"}</Text>}
                </TouchableOpacity>
              ))}
            </View>
            {uploading && <Text style={{ color: colors.subText, marginTop: 8 }}>Đang tải ảnh...</Text>}

            <Button
              title={isEdit ? "Lưu" : "Tạo CLB"}
              label={isEdit ? "Lưu" : "Tạo CLB"}
              onPress={onSubmit}
              disabled={!canSubmit || creating || updating || uploading}
              style={{ marginTop: 18, marginBottom: 24 }}
            />
          </Animated.ScrollView>
        </KeyboardAvoidingView>

        {/* Modal Province */}
        <Modal
          visible={showProvincePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowProvincePicker(false)}
        >
          <View style={styles.sheetRoot}>
            <TouchableOpacity
              style={styles.sheetBackdrop}
              onPress={() => setShowProvincePicker(false)}
            />
            <View
              style={[
                styles.sheetCard,
                { backgroundColor: colors.card }, // Dynamic sheet bg
              ]}
            >
              <View
                style={[
                  styles.sheetHandle,
                  { backgroundColor: colors.sheetHandle },
                ]}
              />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                Chọn Tỉnh/Thành
              </Text>
              <Animated.ScrollView
                contentContainerStyle={{ paddingBottom: 12 }}
              >
                <TouchableOpacity
                  style={[
                    styles.sheetItem,
                    { borderBottomColor: colors.divider },
                  ]}
                  onPress={() => {
                    setForm((f: any) => ({ ...f, province: "" }));
                    setShowProvincePicker(false);
                  }}
                >
                  <Text style={[styles.sheetItemText, { color: colors.text }]}>
                    — Chọn —
                  </Text>
                </TouchableOpacity>
                {VN_PROVINCES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.sheetItem,
                      { borderBottomColor: colors.divider },
                      form.province === p && {
                        backgroundColor: isDark ? "#333" : "#eef2ff", // Highlight item
                      },
                    ]}
                    onPress={() => {
                      setForm((f: any) => ({ ...f, province: p }));
                      setShowProvincePicker(false);
                      ensureVisible();
                    }}
                  >
                    <Text
                      style={[
                        styles.sheetItemText,
                        { color: colors.text },
                        form.province === p && styles.sheetItemTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                    {form.province === p && (
                      <MaterialCommunityIcons
                        name="check"
                        size={18}
                        color="#667eea"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </Animated.ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </>)}</ModalTopInset>
</AppModal>
  );
}

// Updated FieldLabel to accept colors
function FieldLabel({
  title,
  subtitle,
  colors,
}: {
  title: string;
  subtitle?: string;
  colors: any;
}) {
  return (
    <View style={{ marginBottom: subtitle ? 6 : 10 }}>
      <Text style={[styles.fieldTitle, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.fieldHint, { color: colors.subText }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },

  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    zIndex: 10,
    backgroundColor: "#667eea",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    zIndex: 20,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.2)",
  },

  coverImg: { width: "100%", height: "100%" },
  coverPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  coverHelp: { color: "#fff", marginTop: 8, fontWeight: "500" },
  uploadMask: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 15,
  },

  logoWrap: {
    position: "absolute",
    left: 20,
    bottom: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    backgroundColor: "#e0e7ff",
    zIndex: 25,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  logoImg: { width: "100%", height: "100%" },
  logoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#667eea",
  },

  fieldTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  fieldHint: { fontSize: 12 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { marginRight: 6, marginBottom: 6 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchBtn: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 3,
    alignItems: "flex-start",
  },
  switchOn: { backgroundColor: "#667eea" },
  switchDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  switchDotOn: { alignSelf: "flex-end" },
  selectInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  selectPlaceholder: {},
  selectValue: { fontWeight: "600" },
  sheetRoot: { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0008" },
  sheetCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
    paddingBottom: 8,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 6,
  },
  sheetTitle: {
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
    paddingVertical: 8,
  },
  sheetItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetItemText: { fontSize: 14 },
  sheetItemTextActive: { color: "#4f46e5", fontWeight: "700" },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 48,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  inputFocus: {
    borderColor: "#667eea",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
});
