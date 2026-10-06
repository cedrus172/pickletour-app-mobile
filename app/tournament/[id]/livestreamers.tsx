// app/tournament/[id]/livestreamers.tsx — Chủ giải: quản lý Quyền Livestream +
// giám sát live từ xa trên điện thoại (Nhóm 2/3/5).
// - Tạo QR/link mời (áp dụng giới hạn sân đang chọn) để người live quét nhận quyền.
// - Danh sách người đã cấp + thu hồi (thu hồi TỨC THÌ dừng luồng của họ).
// - Giám sát phiên đang live: người live, máy, sức khoẻ, link xem, nút dừng từ xa.
import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
  Linking,
  Modal,
  Switch,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import { useTheme } from "@react-navigation/native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import TicketQrRN from "@/components/courts/TicketQrRN";
import {
  useListLivestreamersQuery,
  useGetAutoLiveCourtsQuery,
  useGetLivestreamerGrantOptionsQuery,
  useCreateLiveInviteMutation,
  useUpsertLivestreamerMutation,
  useDeleteLivestreamerMutation,
  useListTournamentLiveSessionsQuery,
  useOwnerStopLiveSessionMutation,
  useListLivestreamAuditQuery,
} from "@/slices/liveGrantsApiSlice";

const AUDIT_LABEL: Record<string, string> = {
  grant: "Cấp quyền",
  revoke: "Thu hồi",
  invite: "Tạo link mời",
  claim: "Nhận quyền",
  remote_stop: "Dừng từ xa",
};

export default function TournamentLivestreamersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tid = String(id || "");
  const theme = useTheme() as any;
  const isDark = theme.dark;
  const C = {
    bg: isDark ? theme.colors.background : "#F8FAFC",
    card: isDark ? "#111827" : "#FFFFFF",
    border: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0",
    text: theme.colors.text,
    sub: isDark ? "#94A3B8" : "#64748B",
    primary: "#0EA5E9",
    danger: "#EF4444",
    ok: "#22C55E",
    chipOff: isDark ? "#1E293B" : "#EEF2F7",
  };

  const { data: grants = [], isFetching: loadingGrants, refetch: refetchGrants } =
    useListLivestreamersQuery(tid, { skip: !tid });
  const { data: courts = [] } = useGetAutoLiveCourtsQuery(tid, { skip: !tid });
  const { data: liveSessions = [], isFetching: loadingLive, refetch: refetchLive } =
    useListTournamentLiveSessionsQuery(tid, { skip: !tid, pollingInterval: 15000 });
  const { data: grantOptions } = useGetLivestreamerGrantOptionsQuery(tid, { skip: !tid });
  const fbPageOptions = grantOptions?.fbPages || [];
  const rtspOptions = grantOptions?.rtspSources || [];
  const [createInvite, { isLoading: inviting }] = useCreateLiveInviteMutation();
  const [upsertGrant, { isLoading: savingGrant }] = useUpsertLivestreamerMutation();
  const [removeGrant] = useDeleteLivestreamerMutation();
  const [stopLive, { isLoading: stopping }] = useOwnerStopLiveSessionMutation();

  const [selCourts, setSelCourts] = useState<string[]>([]); // [] = cả giải
  const [invite, setInvite] = useState<any>(null); // { joinUrl }
  const [showAudit, setShowAudit] = useState(false);
  const { data: auditRows = [] } = useListLivestreamAuditQuery(tid, { skip: !tid || !showAudit });

  // Sửa giới hạn nguồn/điểm đến cho 1 grant.
  const [editGrant, setEditGrant] = useState<any>(null); // grant đang sửa
  const [edPolicy, setEdPolicy] = useState<"all" | "restricted">("all");
  const [edSources, setEdSources] = useState<string[]>([]);
  const [edPages, setEdPages] = useState<string[]>([]);
  const [edYoutube, setEdYoutube] = useState(true);

  const openEdit = (g: any) => {
    setEditGrant(g);
    setEdPolicy(g.sourcePolicy === "restricted" ? "restricted" : "all");
    setEdSources((g.sources || []).map((s: any) => String(s._id)));
    setEdPages((g.destinations || []).filter((d: any) => d.pageId).map((d: any) => String(d.pageId)));
    setEdYoutube(g.allowYoutube !== false);
  };
  const toggleIn = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  const saveEdit = async () => {
    if (!editGrant?.user?._id) return;
    try {
      await upsertGrant({
        tournament: tid,
        userId: editGrant.user._id,
        courts: (editGrant.courts || []).map((c: any) => String(c._id)),
        sourcePolicy: edPolicy,
        sources: edPolicy === "restricted" ? edSources : [],
        destinations: edPages.map((pid) => {
          const p = fbPageOptions.find((x: any) => String(x.pageId) === pid);
          return { type: "fb", pageId: pid, label: p?.pageName || "" };
        }),
        allowYoutube: edYoutube,
      }).unwrap();
      setEditGrant(null);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.data?.message || "Không lưu được.");
    }
  };

  const courtOptions = useMemo(
    () => (courts || []).map((c: any) => ({ _id: String(c._id), label: c.name || c.code || c._id })),
    [courts],
  );

  const toggleCourt = (cid: string) =>
    setSelCourts((prev) => (prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]));

  const makeInvite = async () => {
    try {
      const res: any = await createInvite({ tournament: tid, courts: selCourts }).unwrap();
      setInvite(res);
    } catch (e: any) {
      Alert.alert("Lỗi", e?.data?.message || "Không tạo được link mời.");
    }
  };

  const shareInvite = async () => {
    if (!invite?.joinUrl) return;
    try {
      await Share.share({ message: `Mời bạn làm người live: ${invite.joinUrl}` });
    } catch {}
  };

  const copyInvite = async () => {
    if (!invite?.joinUrl) return;
    await Clipboard.setStringAsync(invite.joinUrl);
    Alert.alert("Đã sao chép", "Đã sao chép link mời vào clipboard.");
  };

  const confirmRevoke = (g: any) => {
    Alert.alert("Thu hồi quyền", `Thu hồi quyền live của ${g.user?.name || "người này"}? Luồng đang live của họ (nếu có) sẽ bị dừng ngay.`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Thu hồi",
        style: "destructive",
        onPress: async () => {
          try {
            await removeGrant({ id: g._id, tournament: tid }).unwrap();
          } catch (e: any) {
            Alert.alert("Lỗi", e?.data?.message || "Không thu hồi được.");
          }
        },
      },
    ]);
  };

  const confirmStop = (s: any) => {
    const who = s.operator?.name || s.operator?.nickname || "người này";
    Alert.alert("Dừng luồng", `Dừng luồng live của ${who}${s.court?.name ? ` (sân ${s.court.name})` : ""}?`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Dừng",
        style: "destructive",
        onPress: async () => {
          try {
            await stopLive({ id: s._id, tournament: tid }).unwrap();
          } catch (e: any) {
            Alert.alert("Lỗi", e?.data?.message || "Không dừng được.");
          }
        },
      },
    ]);
  };

  const statusChip = (s: any) => {
    if (s.status === "error") return { label: "Lỗi", bg: "#EF444422", fg: C.danger };
    if (s.status === "reconnecting") return { label: "Kết nối lại", bg: "#F59E0B22", fg: "#D97706" };
    if (s.status === "paused") return { label: "Tạm dừng", bg: C.chipOff, fg: C.sub };
    if (s.online) return { label: "Online", bg: "#22C55E22", fg: C.ok };
    return { label: "Mất kết nối", bg: C.chipOff, fg: C.sub };
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["left", "right"]}>
      <Stack.Screen options={{ title: "Quyền Livestream" }} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={loadingGrants || loadingLive}
            onRefresh={() => { refetchGrants(); refetchLive(); }}
            tintColor={C.primary}
          />
        }
      >
        {/* Tạo mời */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={{ color: C.text, fontWeight: "800", marginBottom: 4 }}>Mời người live (QR/link)</Text>
          <Text style={{ color: C.sub, fontSize: 13, lineHeight: 19 }}>
            Người được mời quét QR / mở link, đăng nhập là tự có quyền live giải này. Họ tự mở app live trên máy họ — không điều khiển máy bạn.
          </Text>

          {courtOptions.length > 0 && (
            <>
              <Text style={{ color: C.sub, fontWeight: "700", marginTop: 12, marginBottom: 6 }}>
                Giới hạn sân (không chọn = cả giải)
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {courtOptions.map((c: any) => {
                  const on = selCourts.includes(c._id);
                  return (
                    <TouchableOpacity
                      key={c._id}
                      onPress={() => { toggleCourt(c._id); setInvite(null); }}
                      style={[styles.courtChip, { backgroundColor: on ? C.primary : C.chipOff, borderColor: on ? C.primary : C.border }]}
                    >
                      <Text style={{ color: on ? "#fff" : C.text, fontWeight: "700", fontSize: 13 }}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: C.primary, marginTop: 14, opacity: inviting ? 0.6 : 1 }]}
            onPress={makeInvite}
            disabled={inviting}
          >
            {inviting ? <ActivityIndicator color="#fff" /> : <Ionicons name="qr-code-outline" size={18} color="#fff" />}
            <Text style={{ color: "#fff", fontWeight: "800" }}>Tạo QR/link mời</Text>
          </TouchableOpacity>

          {invite?.joinUrl ? (
            <View style={{ alignItems: "center", marginTop: 16 }}>
              <TicketQrRN token={invite.joinUrl} prefix="" size={200} />
              <Text style={{ color: C.sub, fontSize: 12, marginTop: 10, textAlign: "center" }} selectable>
                {invite.joinUrl}
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <TouchableOpacity style={[styles.smallBtn, { borderColor: C.border }]} onPress={copyInvite}>
                  <Ionicons name="copy-outline" size={16} color={C.text} />
                  <Text style={{ color: C.text, fontWeight: "700" }}>Sao chép</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallBtn, { borderColor: C.border }]} onPress={shareInvite}>
                  <Ionicons name="share-social-outline" size={16} color={C.text} />
                  <Text style={{ color: C.text, fontWeight: "700" }}>Chia sẻ</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: C.sub, fontSize: 11, marginTop: 8 }}>Link có hạn 14 ngày.</Text>
            </View>
          ) : null}
        </View>

        {/* Đang live */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, marginBottom: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.danger }} />
          <Text style={{ color: C.text, fontWeight: "800" }}>Đang live ({liveSessions.length})</Text>
          {loadingLive ? <ActivityIndicator size="small" color={C.primary} /> : null}
        </View>
        {liveSessions.length === 0 ? (
          <Text style={{ color: C.sub, marginBottom: 8 }}>Chưa có luồng live nào đang chạy.</Text>
        ) : (
          liveSessions.map((s: any) => {
            const sc = statusChip(s);
            return (
              <View key={s._id} style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginBottom: 10 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: C.text, fontWeight: "700" }} numberOfLines={1}>
                      {s.operator?.name || s.operator?.nickname || "—"}
                      {s.court?.name ? ` · Sân ${s.court.name}` : ""}
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>
                      <View style={[styles.chip, { backgroundColor: sc.bg }]}>
                        <Text style={{ color: sc.fg, fontSize: 12, fontWeight: "700" }}>{sc.label}</Text>
                      </View>
                      {s.runnerLabel ? (
                        <View style={[styles.chip, { backgroundColor: C.chipOff }]}>
                          <Text style={{ color: C.text, fontSize: 12 }}>{s.runnerLabel}</Text>
                        </View>
                      ) : null}
                      {s.speed ? (
                        <View style={[styles.chip, { backgroundColor: C.chipOff }]}>
                          <Text style={{ color: s.speed < 0.95 ? "#D97706" : C.sub, fontSize: 12 }}>
                            {s.bitrateKbps || 0}kbps · {Number(s.speed).toFixed(2)}x
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {s.lastError ? (
                      <Text style={{ color: C.danger, fontSize: 12, marginTop: 4 }}>{s.lastError}</Text>
                    ) : null}
                    {(s.destinations || []).filter((d: any) => d.watchUrl).length > 0 && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
                        {(s.destinations || []).map((d: any, i: number) =>
                          d.watchUrl ? (
                            <TouchableOpacity key={i} onPress={() => Linking.openURL(d.watchUrl)}>
                              <Text style={{ color: C.primary, fontWeight: "700", fontSize: 13 }}>
                                {d.type === "youtube" ? "YouTube ↗" : `${d.pageName || "FB"} ↗`}
                              </Text>
                            </TouchableOpacity>
                          ) : null,
                        )}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.stopBtn, { opacity: stopping ? 0.5 : 1 }]}
                    onPress={() => confirmStop(s)}
                    disabled={stopping}
                  >
                    <MaterialIcons name="stop-circle" size={30} color={C.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Đã cấp */}
        <Text style={{ color: C.text, fontWeight: "800", marginTop: 18, marginBottom: 8 }}>
          Đã cấp quyền ({grants.length})
        </Text>
        {grants.length === 0 ? (
          <Text style={{ color: C.sub }}>Chưa cấp cho ai. Tạo QR/link mời ở trên để mời người live.</Text>
        ) : (
          grants.map((g: any) => (
            <View key={g._id} style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: C.text, fontWeight: "700" }} numberOfLines={1}>
                  {g.user?.name || g.user?.nickname || "—"}
                  {g.user?.phone ? ` · ${g.user.phone}` : ""}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {g.courts?.length ? (
                    g.courts.map((c: any) => (
                      <View key={c._id} style={[styles.chip, { backgroundColor: C.chipOff }]}>
                        <Text style={{ color: C.text, fontSize: 12 }}>Sân {c.name || c.code}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={[styles.chip, { backgroundColor: "#22C55E22" }]}>
                      <Text style={{ color: C.ok, fontSize: 12, fontWeight: "700" }}>Toàn giải</Text>
                    </View>
                  )}
                  {g.sourcePolicy === "restricted" ? (
                    <View style={[styles.chip, { backgroundColor: "#F59E0B22" }]}>
                      <Text style={{ color: "#D97706", fontSize: 12, fontWeight: "700" }}>
                        {g.sources?.length ? `Nguồn: ${g.sources.length} RTSP` : "Nguồn: tự tạo"}
                      </Text>
                    </View>
                  ) : null}
                  {g.destinations?.length ? (
                    <View style={[styles.chip, { backgroundColor: C.chipOff }]}>
                      <Text style={{ color: C.text, fontSize: 12 }}>{g.destinations.length} fanpage</Text>
                    </View>
                  ) : null}
                  {g.allowYoutube === false ? (
                    <View style={[styles.chip, { backgroundColor: "#EF444422" }]}>
                      <Text style={{ color: C.danger, fontSize: 12 }}>Không YouTube</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <TouchableOpacity onPress={() => openEdit(g)} style={{ padding: 6 }}>
                <Ionicons name="options-outline" size={22} color={C.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmRevoke(g)} style={{ padding: 6 }}>
                <Ionicons name="trash-outline" size={22} color={C.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Nhật ký thao tác */}
        <TouchableOpacity
          onPress={() => setShowAudit((v) => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 18, marginBottom: 4 }}
        >
          <Ionicons name="time-outline" size={18} color={C.primary} />
          <Text style={{ color: C.primary, fontWeight: "700" }}>
            {showAudit ? "Ẩn nhật ký thao tác" : "Xem nhật ký thao tác"}
          </Text>
        </TouchableOpacity>
        {showAudit && (
          auditRows.length === 0 ? (
            <Text style={{ color: C.sub }}>Chưa có thao tác nào.</Text>
          ) : (
            auditRows.map((a: any) => (
              <View key={a._id} style={{ paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }}>
                <Text style={{ color: C.text, fontSize: 13 }}>
                  <Text style={{ fontWeight: "700" }}>{AUDIT_LABEL[a.action] || a.action}</Text>
                  {"  "}
                  {a.actorName || "—"}
                  {a.targetName ? ` → ${a.targetName}` : ""}
                  {a.courtLabel ? ` · Sân ${a.courtLabel}` : ""}
                  {a.note ? ` · ${a.note}` : ""}
                </Text>
                <Text style={{ color: C.sub, fontSize: 11, marginTop: 2 }}>
                  {a.createdAt ? new Date(a.createdAt).toLocaleString("vi-VN") : ""}
                </Text>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Modal sửa giới hạn nguồn/điểm đến */}
      <Modal visible={!!editGrant} transparent animationType="slide" onRequestClose={() => setEditGrant(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: "85%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
              <Text style={{ color: C.text, fontWeight: "800", fontSize: 16 }} numberOfLines={1}>
                Giới hạn: {editGrant?.user?.name || editGrant?.user?.nickname || ""}
              </Text>
              <TouchableOpacity onPress={() => setEditGrant(null)}>
                <Ionicons name="close" size={24} color={C.sub} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
              {/* Nguồn */}
              <Text style={{ color: C.sub, fontWeight: "700", marginBottom: 8 }}>NGUỒN CAM/VIDEO</Text>
              {([
                ["all", "Mọi nguồn (như admin: cam Imou/Dahua chung + thư viện RTSP)"],
                ["restricted", "Giới hạn: chỉ nguồn RTSP được cấp + tự tạo (không dùng cam chung)"],
              ] as const).map(([val, label]) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setEdPolicy(val)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}
                >
                  <Ionicons name={edPolicy === val ? "radio-button-on" : "radio-button-off"} size={20} color={C.primary} />
                  <Text style={{ color: C.text, flex: 1 }}>{label}</Text>
                </TouchableOpacity>
              ))}
              {edPolicy === "restricted" && rtspOptions.length > 0 && (
                <View style={{ marginTop: 6, marginBottom: 6 }}>
                  <Text style={{ color: C.sub, fontSize: 12, marginBottom: 6 }}>Nguồn RTSP được cấp (để trống → họ tự tạo):</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {rtspOptions.map((s: any) => {
                      const on = edSources.includes(String(s._id));
                      return (
                        <TouchableOpacity key={s._id} onPress={() => setEdSources((p) => toggleIn(p, String(s._id)))}
                          style={[styles.courtChip, { backgroundColor: on ? C.primary : C.chipOff, borderColor: on ? C.primary : C.border }]}>
                          <Text style={{ color: on ? "#fff" : C.text, fontWeight: "700", fontSize: 13 }}>{s.label || s.url}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Fanpage */}
              <Text style={{ color: C.sub, fontWeight: "700", marginTop: 14, marginBottom: 8 }}>FANPAGE ĐƯỢC PHÉP (để trống = mọi page)</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {fbPageOptions.length === 0 ? (
                  <Text style={{ color: C.sub, fontSize: 13 }}>Chưa có fanpage trong pool.</Text>
                ) : fbPageOptions.map((p: any) => {
                  const on = edPages.includes(String(p.pageId));
                  return (
                    <TouchableOpacity key={p.pageId} onPress={() => setEdPages((pp) => toggleIn(pp, String(p.pageId)))}
                      style={[styles.courtChip, { backgroundColor: on ? C.primary : C.chipOff, borderColor: on ? C.primary : C.border }]}>
                      <Text style={{ color: on ? "#fff" : C.text, fontWeight: "700", fontSize: 13 }}>{p.pageName || p.pageId}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* YouTube */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
                <Text style={{ color: C.text, fontWeight: "600" }}>Cho phép live lên YouTube</Text>
                <Switch value={edYoutube} onValueChange={setEdYoutube} />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: C.primary, marginTop: 20, opacity: savingGrant ? 0.6 : 1 }]}
                onPress={saveEdit}
                disabled={savingGrant}
              >
                {savingGrant ? <ActivityIndicator color="#fff" /> : <Ionicons name="save-outline" size={18} color="#fff" />}
                <Text style={{ color: "#fff", fontWeight: "800" }}>Lưu giới hạn</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 14, borderWidth: 1 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 13, borderRadius: 12 },
  courtChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  stopBtn: { padding: 4 },
});
