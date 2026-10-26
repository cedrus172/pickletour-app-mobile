// app/admin/cam-clip.tsx — ADMIN: tìm venue → mở màn cấu hình + cấp quyền Cắt Cam Sân.
// Tái dùng màn quản lý /owner/venue/[id]/clip-cam (backend cho admin qua canManageVenue).
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/i18nText";
import I18nTextInput from "@/components/ui/i18nTextInput";
import { useThemeTokens, type ThemeTokens } from "@/hooks/useThemeTokens";
import { useAdminCamClipVenuesQuery } from "@/slices/camClipApiSlice";

export default function AdminCamClipScreen() {
  const C = useThemeTokens();
  const styles = useMemo(() => mkStyles(C), [C]);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  // Debounce 400ms cho ô tìm.
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching } = useAdminCamClipVenuesQuery(debounced);
  const venues = Array.isArray(data) ? data : [];

  const open = (venueId: string) => {
    router.push({ pathname: "/owner/venue/[id]/clip-cam", params: { id: venueId } } as any);
  };

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Quyền Cắt Cam Sân (Admin)", headerShown: true }} />
      <View style={{ padding: 14 }}>
        <View style={[styles.search, { backgroundColor: C.field, borderColor: C.border }]}>
          <Ionicons name="search" size={18} color={C.muted} />
          <I18nTextInput
            value={q}
            onChangeText={setQ}
            placeholder="Tìm sân theo tên… (để trống: sân đã bật)"
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            style={{ flex: 1, marginLeft: 8, color: C.text, fontSize: 15 }}
          />
          {isFetching && <ActivityIndicator color={C.primary} size="small" />}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 32 }}>
        {venues.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="business-outline" size={40} color={C.muted} />
            <Text style={{ color: C.sub, marginTop: 10, textAlign: "center" }}>
              {debounced ? "Không tìm thấy sân." : "Chưa có sân nào bật Cắt Cam Sân. Gõ tên sân để tìm và bật."}
            </Text>
          </View>
        ) : (
          venues.map((v: any) => (
            <Pressable key={v.venueId} onPress={() => open(v.venueId)} style={[styles.row, { backgroundColor: C.card, borderColor: C.border }]}>
              <Ionicons name="videocam" size={22} color={v.enabled ? C.primary : C.muted} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text numberOfLines={1} style={{ color: C.text, fontWeight: "700" }}>{v.venueName}</Text>
                <Text style={{ color: C.sub, fontSize: 12 }}>
                  {v.enabled ? "Đã bật" : "Chưa bật"}{v.grantCount ? ` · ${v.grantCount} người được cấp` : ""}
                </Text>
              </View>
              {v.enabled && <View style={[styles.dot, { backgroundColor: C.greenText }]} />}
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const mkStyles = (C: ThemeTokens) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    search: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
    center: { alignItems: "center", justifyContent: "center", paddingVertical: 56, paddingHorizontal: 20 },
    row: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  });
