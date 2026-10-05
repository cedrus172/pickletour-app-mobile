// Trận tự do — điều khiển từ xa (mobile admin). Tạo trận tự do, chấm điểm trọng tài
// (REST /live), phát overlay lên máy live (live-control proxy → desktop).
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useTheme } from "@react-navigation/native";
import {
  useCreateUserMatchMutation,
  useUpdateUserMatchMutation,
  useUserMatchLiveBootstrapQuery,
  useUserMatchLiveEventMutation,
} from "@/slices/userMatchesApiSlice";
import {
  useGetLiveMachinesQuery,
  useLiveControlCallMutation,
} from "@/slices/liveControlApiSlice";
import { BASE_URL } from "@/slices/apiSlice";

const pairName = (pair: any) => {
  if (!pair) return "—";
  if (pair.teamName) return pair.teamName;
  const n = (p: any) => p?.nickName || p?.fullName || p?.name || "";
  return [n(pair.player1), n(pair.player2)].filter(Boolean).join(" / ") || "—";
};

export default function AdHocRefereeScreen() {
  const { colors } = useTheme() as any;
  const [matchId, setMatchId] = useState("");
  const [title, setTitle] = useState("");
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [b1, setB1] = useState("");
  const [b2, setB2] = useState("");
  const [bestOf, setBestOf] = useState(1);
  const [pointsToWin, setPointsToWin] = useState(11);
  const [machineId, setMachineId] = useState("");
  const [msg, setMsg] = useState("");

  // Cấu hình nguồn + đích NGAY TRÊN MOBILE (không cần đụng máy desktop). Options lấy từ
  // chính máy live qua proxy /api/options.
  const [opt, setOpt] = useState<any>({ cams: [], rtspSources: [], fbPages: [] });
  const [srcType, setSrcType] = useState<"rtsp" | "url" | "imou">("rtsp");
  const [rtspIdx, setRtspIdx] = useState<number | null>(null);
  const [urlText, setUrlText] = useState("");
  const [camIdx, setCamIdx] = useState<number | null>(null);
  const [dests, setDests] = useState<any[]>([]);

  const [createUserMatch, { isLoading: creating }] = useCreateUserMatchMutation();
  const [updateUserMatch] = useUpdateUserMatchMutation();
  const [liveEvent] = useUserMatchLiveEventMutation();
  const [liveControlCall, { isLoading: calling }] = useLiveControlCallMutation();
  const { data: machines } = useGetLiveMachinesQuery(undefined, { pollingInterval: 8000 });
  const { data: boot, refetch } = useUserMatchLiveBootstrapQuery(matchId, {
    skip: !matchId,
    pollingInterval: 1500,
  });
  const match = boot?.match;

  const score = useMemo(() => {
    const gi = Number.isInteger(match?.currentGame) ? match.currentGame : 0;
    const g = match?.gameScores?.[gi] || { a: 0, b: 0 };
    return { a: Number(g.a || 0), b: Number(g.b || 0) };
  }, [match]);
  const serve = match?.serve || {};
  const status = match?.status || "scheduled";
  const machineList: any[] = (machines as any)?.machines || machines || [];

  const toast = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 3000);
  };

  // Link trọng tài công khai (web) để chia sẻ — bắt trận từ xa không cần app.
  const refToken = match?.refereeToken || "";
  const refLink = matchId && refToken ? `${String(BASE_URL || "").replace(/\/$/, "")}/r/${matchId}/${refToken}` : "";

  // Tải options của máy live đã chọn (cam Imou / RTSP lưu / fanpage).
  useEffect(() => {
    if (!machineId) { setOpt({ cams: [], rtspSources: [], fbPages: [] }); return; }
    let alive = true;
    liveControlCall({ machineId, path: "/api/options", method: "GET" })
      .unwrap()
      .then((d: any) => { if (alive) setOpt({ cams: d.cams || [], rtspSources: d.rtspSources || [], fbPages: d.fbPages || [] }); })
      .catch(() => { if (alive) setOpt({ cams: [], rtspSources: [], fbPages: [] }); });
    return () => { alive = false; };
  }, [machineId, liveControlCall]);

  const buildSource = () => {
    if (srcType === "url") {
      const u = urlText.trim();
      if (!u) throw new Error("Nhập link nguồn.");
      return { kind: "url", sourceUrl: u, encoder: "auto" };
    }
    if (srcType === "rtsp") {
      const srcs = opt.rtspSources || [];
      const s = rtspIdx != null ? srcs[rtspIdx] : null;
      if (!s) throw new Error("Chọn nguồn RTSP (hoặc dùng Link).");
      return { kind: "url", sourceUrl: s.url, encoder: "auto" };
    }
    const c = camIdx != null ? (opt.cams || [])[camIdx] : null;
    if (!c) throw new Error("Chọn camera Imou.");
    return { kind: "imou", imouDeviceId: c.deviceId, venueId: c.venueId, encoder: "auto" };
  };
  const toggleFbDest = (p: any) => {
    setDests((arr) => {
      const has = arr.some((d) => d.type === "fb" && d.pageId === p.pageId);
      return has ? arr.filter((d) => !(d.type === "fb" && d.pageId === p.pageId))
        : [...arr, { type: "fb", pageId: p.pageId, pageName: p.pageName, label: p.pageName }];
    });
  };
  const toggleYt = () => setDests((arr) =>
    arr.some((d) => d.type === "youtube")
      ? arr.filter((d) => d.type !== "youtube")
      : [...arr, { type: "youtube", label: "YouTube (tự tạo)" }]);

  const parts = () => {
    const p: any[] = [];
    const push = (side: string, order: number, name: string) => {
      const n = String(name || "").trim();
      if (n) p.push({ side, order, isGuest: true, displayName: n });
    };
    push("A", 1, a1); push("A", 2, a2);
    push("B", 1, b1); push("B", 2, b2);
    return p;
  };

  const doCreate = async () => {
    const participants = parts();
    if (participants.length < 2) return toast("Nhập tên ít nhất 1 VĐV mỗi đội.");
    try {
      const res: any = await createUserMatch({
        title: title.trim() || "Trận tự do",
        participants,
        sportType: "pickleball",
        rules: { bestOf, pointsToWin, winByTwo: true },
      }).unwrap();
      setMatchId(String(res?._id || res?.id));
      toast("Đã tạo trận. Bấm BẮT ĐẦU để chấm điểm.");
    } catch (e: any) {
      toast(e?.data?.message || "Lỗi tạo trận");
    }
  };

  const ev = async (body: any) => {
    if (!matchId) return;
    try {
      await liveEvent({ id: matchId, ...body }).unwrap();
      refetch();
    } catch (e: any) {
      toast(e?.data?.message || "Lỗi thao tác");
    }
  };

  const saveNames = async () => {
    try {
      await updateUserMatch({
        id: matchId,
        participants: parts(),
        title: title.trim() || "Trận tự do",
      }).unwrap();
      refetch();
      toast("Đã cập nhật tên.");
    } catch (e: any) {
      toast(e?.data?.message || "Lỗi cập nhật");
    }
  };

  const streamOn = async () => {
    if (!machineId || !matchId) return toast("Chọn máy live + tạo trận trước.");
    let source: any, destinations: any[];
    try {
      source = buildSource();
      destinations = dests;
      if (!destinations.length) throw new Error("Thêm ít nhất 1 đích (Facebook / YouTube).");
    } catch (e: any) {
      return toast(e.message);
    }
    try {
      await liveControlCall({ machineId, path: "/api/match-start", method: "POST", body: { matchId, source, destinations } }).unwrap();
      toast("Đã yêu cầu máy live phát trận.");
    } catch (e: any) {
      toast(e?.data?.error || e?.data?.message || "Lỗi gọi máy live (máy live đang online?)");
    }
  };
  const streamOff = async () => {
    if (!machineId) return;
    try {
      await liveControlCall({ machineId, path: "/api/match-stop", method: "POST", body: {} }).unwrap();
      toast("Đã dừng phát.");
    } catch (e: any) {
      toast(e?.data?.message || "Lỗi dừng");
    }
  };

  const s = mk(colors);
  const Btn = ({ label, onPress, bg, disabled, flex }: any) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[s.btn, { backgroundColor: disabled ? colors.border : bg || colors.primary, flex: flex || 0 }]}
    >
      <Text style={s.btnTxt}>{label}</Text>
    </Pressable>
  );
  const Seg = ({ value, set, options }: any) => (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {options.map((o: number) => (
        <Pressable
          key={o}
          onPress={() => set(o)}
          style={[s.seg, { backgroundColor: value === o ? colors.primary : colors.card, borderColor: colors.border }]}
        >
          <Text style={{ color: value === o ? "#fff" : colors.text }}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Trận tự do (từ xa)" }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} keyboardShouldPersistTaps="handled">
          {/* Tạo / sửa */}
          <View style={s.card}>
            <Text style={s.h}>{matchId ? "Thông tin trận" : "Tạo trận tự do"}</Text>
            <TextInput style={s.input} placeholder="Tên trận" placeholderTextColor={colors.border} value={title} onChangeText={setTitle} />
            <Text style={s.lbl}>Đội A</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput style={[s.input, { flex: 1 }]} placeholder="VĐV A1" placeholderTextColor={colors.border} value={a1} onChangeText={setA1} />
              <TextInput style={[s.input, { flex: 1 }]} placeholder="VĐV A2" placeholderTextColor={colors.border} value={a2} onChangeText={setA2} />
            </View>
            <Text style={s.lbl}>Đội B</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput style={[s.input, { flex: 1 }]} placeholder="VĐV B1" placeholderTextColor={colors.border} value={b1} onChangeText={setB1} />
              <TextInput style={[s.input, { flex: 1 }]} placeholder="VĐV B2" placeholderTextColor={colors.border} value={b2} onChangeText={setB2} />
            </View>
            <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
              <View><Text style={s.lbl}>Số ván</Text><Seg value={bestOf} set={setBestOf} options={[1, 3, 5]} /></View>
              <View><Text style={s.lbl}>Điểm thắng</Text><Seg value={pointsToWin} set={setPointsToWin} options={[11, 15, 21]} /></View>
            </View>
            <View style={{ marginTop: 12 }}>
              {!matchId ? (
                <Btn label={creating ? "Đang tạo…" : "Tạo trận"} onPress={doCreate} disabled={creating} />
              ) : (
                <Btn label="Lưu tên / tiêu đề" onPress={saveNames} bg={colors.card} />
              )}
            </View>
          </View>

          {/* Phát lên máy live */}
          {matchId ? (
            <View style={s.card}>
              <Text style={s.h}>Phát lên máy live</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {machineList.map((m) => {
                  const id = m.machineId || m._id;
                  return (
                    <Pressable key={id} onPress={() => setMachineId(id)} style={[s.seg, { backgroundColor: machineId === id ? colors.primary : colors.card, borderColor: colors.border }]}>
                      <Text style={{ color: machineId === id ? "#fff" : colors.text }}>
                        {(m.label || id) + (m.online ? " ·on" : " ·off")}
                      </Text>
                    </Pressable>
                  );
                })}
                {!machineList.length ? <Text style={{ color: colors.border }}>Chưa có máy live online</Text> : null}
              </View>

              {machineId ? (
                <View style={{ gap: 8, marginBottom: 8 }}>
                  {/* Nguồn */}
                  <Text style={s.lbl}>Nguồn video</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {([["rtsp", "RTSP"], ["url", "Link"], ["imou", "Imou"]] as const).map(([v, lbl]) => (
                      <Pressable key={v} onPress={() => setSrcType(v)}
                        style={[s.seg, { backgroundColor: srcType === v ? colors.primary : colors.card, borderColor: colors.border }]}>
                        <Text style={{ color: srcType === v ? "#fff" : colors.text }}>{lbl}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {srcType === "url" ? (
                    <TextInput style={s.input} placeholder="rtsp:// hoặc https://…m3u8" placeholderTextColor={colors.border}
                      value={urlText} onChangeText={setUrlText} autoCapitalize="none" />
                  ) : null}
                  {srcType === "rtsp" ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {(opt.rtspSources || []).map((sc: any, i: number) => (
                        <Pressable key={i} onPress={() => setRtspIdx(i)}
                          style={[s.seg, { backgroundColor: rtspIdx === i ? colors.primary : colors.card, borderColor: colors.border }]}>
                          <Text style={{ color: rtspIdx === i ? "#fff" : colors.text }}>{sc.label || sc.url}</Text>
                        </Pressable>
                      ))}
                      {!(opt.rtspSources || []).length ? <Text style={{ color: colors.border }}>(máy chưa lưu nguồn RTSP)</Text> : null}
                    </View>
                  ) : null}
                  {srcType === "imou" ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {(opt.cams || []).map((c: any, i: number) => (
                        <Pressable key={i} onPress={() => setCamIdx(i)}
                          style={[s.seg, { backgroundColor: camIdx === i ? colors.primary : colors.card, borderColor: colors.border }]}>
                          <Text style={{ color: camIdx === i ? "#fff" : colors.text }}>{c.label || c.deviceId}</Text>
                        </Pressable>
                      ))}
                      {!(opt.cams || []).length ? <Text style={{ color: colors.border }}>(máy chưa có cam Imou)</Text> : null}
                    </View>
                  ) : null}

                  {/* Đích */}
                  <Text style={s.lbl}>Đích phát (chạm để chọn)</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    <Pressable onPress={toggleYt}
                      style={[s.seg, { backgroundColor: dests.some((d) => d.type === "youtube") ? colors.primary : colors.card, borderColor: colors.border }]}>
                      <Text style={{ color: dests.some((d) => d.type === "youtube") ? "#fff" : colors.text }}>YouTube</Text>
                    </Pressable>
                    {(opt.fbPages || []).map((p: any) => {
                      const on = dests.some((d) => d.type === "fb" && d.pageId === p.pageId);
                      return (
                        <Pressable key={p.pageId} onPress={() => toggleFbDest(p)}
                          style={[s.seg, { backgroundColor: on ? colors.primary : colors.card, borderColor: colors.border }]}>
                          <Text style={{ color: on ? "#fff" : colors.text }}>FB·{p.pageName || p.pageId}</Text>
                        </Pressable>
                      );
                    })}
                    {!(opt.fbPages || []).length ? <Text style={{ color: colors.border }}>(không có fanpage)</Text> : null}
                  </View>
                </View>
              ) : null}

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Btn label="● Phát" onPress={streamOn} bg="#d32f2f" disabled={!machineId || calling} flex={1} />
                <Btn label="Dừng phát" onPress={streamOff} bg={colors.card} flex={1} />
              </View>
              {refLink ? (
                <View style={{ marginTop: 8, gap: 4 }}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>🔗 Link bắt trận từ xa (không cần app)</Text>
                  <Pressable onPress={() => Linking.openURL(refLink)}>
                    <Text style={{ color: colors.primary }}>{refLink}</Text>
                  </Pressable>
                </View>
              ) : null}
              {Array.isArray(match?.meta?.liveLinks) && match.meta.liveLinks.length ? (
                <View style={{ marginTop: 8, gap: 4 }}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>Link live</Text>
                  {match.meta.liveLinks.map((l: any, i: number) => (
                    <Pressable key={i} onPress={() => Linking.openURL(String(l.url || ""))}>
                      <Text style={{ color: colors.primary }}>
                        {`${l.platform || ""}${l.label ? ` · ${l.label}` : ""}: ${l.url}`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Bảng trọng tài */}
          {matchId ? (
            <View style={s.card}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ color: status === "live" ? "#2e7d32" : colors.text, fontWeight: "700" }}>
                  {status === "live" ? "ĐANG DIỄN RA" : status === "finished" ? "KẾT THÚC" : "CHƯA BẮT ĐẦU"}
                </Text>
                <Text style={{ color: colors.border }}>Giao: Đội {serve?.side || "?"} · {serve?.server || "?"}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginVertical: 8 }}>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ color: colors.text }} numberOfLines={1}>{pairName(match?.pairA)}</Text>
                  <Text style={s.score}>{score.a}</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 28 }}>:</Text>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ color: colors.text }} numberOfLines={1}>{pairName(match?.pairB)}</Text>
                  <Text style={s.score}>{score.b}</Text>
                </View>
              </View>

              {status !== "live" && status !== "finished" ? (
                <Btn label="▶ BẮT ĐẦU TRẬN" onPress={() => ev({ type: "start" })} bg="#2e7d32" />
              ) : null}

              {status === "live" ? (
                <>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <Btn label="+1 Đội A" onPress={() => ev({ type: "point", team: "A" })} flex={1} />
                    <Btn label="+1 Đội B" onPress={() => ev({ type: "point", team: "B" })} flex={1} />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <Btn label="↶ Hoàn tác" onPress={() => ev({ type: "undo" })} bg={colors.card} flex={1} />
                    <Btn label="Giao A" onPress={() => ev({ type: "serve", side: "A", server: serve?.server || 1 })} bg={colors.card} flex={1} />
                    <Btn label="Giao B" onPress={() => ev({ type: "serve", side: "B", server: serve?.server || 1 })} bg={colors.card} flex={1} />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <Btn label="Kết thúc A thắng" onPress={() => ev({ type: "finish", winner: "A" })} bg="#ed6c02" flex={1} />
                    <Btn label="Kết thúc B thắng" onPress={() => ev({ type: "finish", winner: "B" })} bg="#ed6c02" flex={1} />
                  </View>
                </>
              ) : null}
            </View>
          ) : null}

          {msg ? <Text style={{ color: colors.primary, textAlign: "center" }}>{msg}</Text> : null}
          {calling ? <ActivityIndicator /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const mk = (c: any) =>
  StyleSheet.create({
    card: { backgroundColor: c.card, borderRadius: 12, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
    h: { color: c.text, fontWeight: "700", fontSize: 16, marginBottom: 8 },
    lbl: { color: c.border, fontSize: 12, marginTop: 6, marginBottom: 2 },
    input: { borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: c.text, marginTop: 4 },
    btn: { paddingVertical: 12, borderRadius: 10, alignItems: "center" },
    btnTxt: { color: "#fff", fontWeight: "700" },
    seg: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
    score: { color: c.text, fontSize: 44, fontWeight: "800" },
  });
