// Trận tự do — điều khiển từ xa (mobile admin). Tạo trận tự do, chấm điểm trọng tài
// (REST /live), phát overlay lên máy live (live-control proxy → desktop).
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
    try {
      await liveControlCall({ machineId, path: "/api/match-start", method: "POST", body: { matchId } }).unwrap();
      toast("Đã yêu cầu máy live phát trận.");
    } catch (e: any) {
      toast(e?.data?.message || e?.error || "Lỗi gọi máy live");
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
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Btn label="● Phát" onPress={streamOn} bg="#d32f2f" disabled={!machineId || calling} flex={1} />
                <Btn label="Dừng phát" onPress={streamOff} bg={colors.card} flex={1} />
              </View>
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
