// components/shop/OrderDetailView.tsx — chi tiết đơn GOATWIN, dùng chung cho khách (xem, QR thanh toán, mã đơn để quét, huỷ)
// và người quản lý gian hàng (đổi trạng thái, xác nhận đã thanh toán, sửa tổng tiền, ghi chú).
import React, { useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import TextInput from "@/components/ui/i18nTextInput";
import TicketQrRN from "@/components/courts/TicketQrRN";
import type { ThemeTokens } from "@/hooks/useThemeTokens";
import { GW_RED, ORDER_STATUS, StatusPill, fmtVnd } from "./ShopUi";

const NEXT: Record<string, { status: string; label: string; icon: any }[]> = {
  pending: [{ status: "confirmed", label: "Xác nhận đơn", icon: "checkmark-circle-outline" }],
  confirmed: [
    { status: "shipping", label: "Đang giao", icon: "car-outline" },
    { status: "done", label: "Đã giao / khách đã nhận", icon: "bag-check-outline" },
  ],
  shipping: [{ status: "done", label: "Đã giao / khách đã nhận", icon: "bag-check-outline" }],
};

function Row({ C, icon, label, value, onPress }: { C: ThemeTokens; icon: any; label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.row}>
      <Ionicons name={icon} size={17} color={C.primary} />
      <Text style={{ color: C.sub, width: 92 }}>{label}</Text>
      <Text style={{ color: onPress ? C.primary : C.text, flex: 1, fontWeight: "700" }}>{value}</Text>
    </Pressable>
  );
}

export default function OrderDetailView({
  o,
  C,
  manage,
  busy,
  onUpdate,
  onCancel,
}: {
  o: any;
  C: ThemeTokens;
  manage?: boolean;
  busy?: boolean;
  onUpdate?: (body: any) => Promise<any>;
  onCancel?: () => void;
}) {
  const [total, setTotal] = useState(String(o.total || ""));
  const [note, setNote] = useState(String(o.adminNote || ""));
  const card = [styles.card, { borderColor: C.border, backgroundColor: C.card }];
  const setStatus = (status: string, label: string) =>
    Alert.alert(`${label}?`, `Đơn ${o.code}`, [
      { text: "Huỷ", style: "cancel" },
      { text: "Đồng ý", onPress: () => onUpdate?.({ status }) },
    ]);

  return (
    <View style={{ gap: 12 }}>
      <View style={card}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 18 }}>Đơn {o.code}</Text>
          <StatusPill status={o.status} />
        </View>
        <Text style={{ color: C.sub, marginTop: 2 }}>{new Date(o.createdAt).toLocaleString("vi-VN")}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <View style={[styles.tag, { borderColor: C.border }]}>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: "700" }}>{o.payment === "qr" ? "Chuyển khoản QR" : "Thanh toán khi nhận"}</Text>
          </View>
          <View style={[styles.tag, { borderColor: o.paid ? "#16A34A" : C.border, backgroundColor: o.paid ? "#16A34A" : "transparent" }]}>
            <Text style={{ color: o.paid ? "#fff" : C.sub, fontSize: 12, fontWeight: "800" }}>{o.paid ? "Đã thanh toán" : "Chưa thanh toán"}</Text>
          </View>
        </View>
      </View>

      {/* Mã đơn để nhân viên gian hàng quét khi giao / nhận tại giải */}
      {!manage && o.status !== "cancelled" && o.status !== "done" ? (
        <View style={[...card, { alignItems: "center" }]}>
          <Text style={{ color: C.text, fontWeight: "800", marginBottom: 8 }}>Mã đơn — đưa nhân viên GOATWIN quét khi nhận hàng</Text>
          <TicketQrRN token={o.code} prefix="PTSHOP:" size={180} />
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 18, marginTop: 6, letterSpacing: 1 }}>{o.code}</Text>
        </View>
      ) : null}

      {o.qr && !manage ? (
        <View style={[...card, { alignItems: "center" }]}>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 15 }}>Quét mã để chuyển khoản</Text>
          <ExpoImage source={{ uri: o.qr.image }} style={{ width: 240, height: 290, marginTop: 8, borderRadius: 12, backgroundColor: "#fff" }} contentFit="contain" />
          <Text style={{ color: C.sub, marginTop: 6, textAlign: "center" }}>
            {o.qr.accountName} · {o.qr.accountNo}
            {"\n"}Số tiền <Text style={{ color: GW_RED, fontWeight: "900" }}>{fmtVnd(o.qr.amount)}</Text> · Nội dung <Text style={{ color: C.text, fontWeight: "900" }}>{o.qr.content}</Text>
          </Text>
          <Text style={{ color: C.sub, fontSize: 12, marginTop: 4 }}>Gian hàng xác nhận thanh toán sau khi nhận tiền.</Text>
        </View>
      ) : null}

      <View style={card}>
        {o.items.map((it: any, i: number) => (
          <View key={i} style={[styles.item, i ? { borderTopWidth: 1, borderTopColor: C.border } : null]}>
            <View style={styles.thumb}>{it.image ? <ExpoImage source={{ uri: it.image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: "700" }} numberOfLines={2}>
                {it.name}
              </Text>
              <Text style={{ color: C.sub, fontSize: 12.5 }}>
                {it.color ? `${it.color} · ` : ""}
                {fmtVnd(it.price)} × {it.qty}
              </Text>
            </View>
            <Text style={{ color: C.text, fontWeight: "800" }}>{fmtVnd(it.price * it.qty)}</Text>
          </View>
        ))}
        <View style={[styles.item, { borderTopWidth: 1, borderTopColor: C.border }]}>
          <Text style={{ color: C.text, fontWeight: "900", flex: 1 }}>Tổng cộng</Text>
          <Text style={{ color: GW_RED, fontWeight: "900", fontSize: 18 }}>{fmtVnd(o.total)}</Text>
        </View>
      </View>

      <View style={card}>
        <Row C={C} icon="person-outline" label="Người nhận" value={o.customer?.name || "—"} />
        <Row C={C} icon="call-outline" label="Điện thoại" value={o.customer?.phone || "—"} onPress={manage && o.customer?.phone ? () => Linking.openURL(`tel:${o.customer.phone}`) : undefined} />
        {o.delivery === "tournament" ? (
          <Row C={C} icon="trophy-outline" label="Nhận tại giải" value={o.tournament?.name || "—"} />
        ) : (
          <Row C={C} icon="location-outline" label="Địa chỉ" value={o.customer?.address || "—"} />
        )}
        {o.customer?.note ? <Row C={C} icon="chatbubble-ellipses-outline" label="Ghi chú" value={o.customer.note} /> : null}
        {!manage && o.adminNote ? <Row C={C} icon="storefront-outline" label="Gian hàng" value={o.adminNote} /> : null}
      </View>

      {manage ? (
        <View style={[...card, { gap: 10 }]}>
          <Text style={{ color: C.text, fontWeight: "900", fontSize: 15 }}>Xử lý đơn</Text>
          {(NEXT[o.status] || []).map((a) => (
            <Pressable key={a.status} accessibilityRole="button" disabled={busy} onPress={() => setStatus(a.status, a.label)} style={[styles.action, { backgroundColor: C.primary }]}>
              <Ionicons name={a.icon} size={18} color={C.onPrimary} />
              <Text style={{ color: C.onPrimary, fontWeight: "900" }}>{a.label}</Text>
            </Pressable>
          ))}
          {o.status !== "cancelled" ? (
            <>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onUpdate?.({ paid: !o.paid })}
            style={[styles.action, { borderWidth: 1.5, borderColor: o.paid ? C.border : "#16A34A" }]}
          >
            <Ionicons name={o.paid ? "close-circle-outline" : "cash-outline"} size={18} color={o.paid ? C.sub : "#16A34A"} />
            <Text style={{ color: o.paid ? C.sub : "#16A34A", fontWeight: "900" }}>{o.paid ? "Bỏ xác nhận thanh toán" : "Xác nhận đã thanh toán"}</Text>
          </Pressable>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              value={total}
              onChangeText={setTotal}
              keyboardType="number-pad"
              placeholder="Tổng tiền (đã gồm ship)"
              placeholderTextColor={C.sub}
              style={[styles.input, { flex: 1, color: C.text, borderColor: C.border, backgroundColor: C.field }]}
            />
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => onUpdate?.({ total: Number(String(total).replace(/\D/g, "")) || 0 })} style={[styles.smallBtn, { borderColor: C.primary }]}>
              <Text style={{ color: C.primary, fontWeight: "800" }}>Lưu tổng</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Ghi chú cho khách (phí ship, thời gian giao…)"
              placeholderTextColor={C.sub}
              style={[styles.input, { flex: 1, color: C.text, borderColor: C.border, backgroundColor: C.field }]}
            />
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => onUpdate?.({ adminNote: note })} style={[styles.smallBtn, { borderColor: C.primary }]}>
              <Text style={{ color: C.primary, fontWeight: "800" }}>Lưu</Text>
            </Pressable>
          </View>
            </>
          ) : null}
          {o.status !== "cancelled" && o.status !== "done" ? (
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => setStatus("cancelled", "Huỷ đơn")} style={styles.cancel}>
              <Text style={{ color: "#EF4444", fontWeight: "800" }}>Huỷ đơn</Text>
            </Pressable>
          ) : null}
          {busy ? <ActivityIndicator color={C.primary} /> : null}
        </View>
      ) : o.status === "pending" && onCancel ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            Alert.alert("Huỷ đơn hàng?", `Đơn ${o.code}`, [
              { text: "Không", style: "cancel" },
              { text: "Huỷ đơn", style: "destructive", onPress: onCancel },
            ])
          }
          style={styles.cancel}
        >
          <Text style={{ color: "#EF4444", fontWeight: "800" }}>Huỷ đơn</Text>
        </Pressable>
      ) : null}

      {(o.history || []).length ? (
        <View style={card}>
          <Text style={{ color: C.text, fontWeight: "900", marginBottom: 6 }}>Lịch sử</Text>
          {[...o.history].reverse().map((h: any, i: number) => (
            <Text key={i} style={{ color: C.sub, fontSize: 12.5, lineHeight: 19 }}>
              {new Date(h.at).toLocaleString("vi-VN")} · {ORDER_STATUS[h.status]?.label || h.status}
              {h.note ? ` · ${h.note}` : ""}
              {manage && h.by ? ` · ${h.by}` : ""}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 16, borderWidth: 1 },
  tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  thumb: { width: 48, height: 48, borderRadius: 8, overflow: "hidden", backgroundColor: "#05080F" },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7 },
  action: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46, borderRadius: 12 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14.5 },
  smallBtn: { height: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  cancel: { alignItems: "center", paddingVertical: 12 },
});
