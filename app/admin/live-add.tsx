// Thêm sân live / Hẹn giờ từ app (admin) — gửi qua backend proxy tới control-server desktop.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Text } from "@/components/ui/i18nText";
import { TextInput } from "@/components/ui/i18nTextInput";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, Redirect, router, useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import { useTheme } from "@react-navigation/native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useLiveControlCallMutation, useSetScoreboardScaleMutation } from "@/slices/liveControlApiSlice";

const SB_SCALE_PRESETS = [0.7, 0.85, 1, 1.2, 1.4, 1.6];
const OV_CORNERS: [string, string][] = [
  ["top-left", "T·Trái"],
  ["top-right", "T·Phải"],
  ["bottom-left", "D·Trái"],
  ["bottom-right", "D·Phải"],
];
const OV_SLOTS: [string, string][] = [
  ["scoreboard", "Bảng điểm"],
  ["brand", "Logo"],
  ["sponsor", "Tài trợ"],
];
const DEFAULT_LAYOUT: any = { scoreboard: "top-left", brand: "top-right", sponsor: "bottom-right" };
import { useMyLiveGrantsQuery } from "@/slices/liveGrantsApiSlice";
import { useUploadImageToFolderMutation } from "@/slices/uploadApiSlice";
import { prepareSupportImageForUpload } from "@/utils/supportImageUpload";

export default function LiveAddScreen() {
  const theme = useTheme();
  const isDark = theme.dark;
  const userInfo = useSelector((s: any) => s.auth?.userInfo);
  const isAdmin = !!(userInfo?.isAdmin || userInfo?.role === "admin" || userInfo?.isSuperAdmin);
  const { data: myLiveGrants = [] } = useMyLiveGrantsQuery(undefined, { skip: !userInfo });
  const hasLiveGrant = Array.isArray(myLiveGrants) && myLiveGrants.length > 0;
  const { machineId, editSid } = useLocalSearchParams<{ machineId: string; editSid?: string }>();
  const editMode = !!editSid;

  const C = useMemo(
    () => ({
      bg: isDark ? theme.colors.background : "#F8FAFC",
      card: isDark ? "#111827" : "#FFFFFF",
      border: isDark ? "rgba(255,255,255,0.12)" : "#E2E8F0",
      text: theme.colors.text,
      sub: isDark ? "#94A3B8" : "#64748B",
      primary: "#0EA5E9",
      field: isDark ? "#0b1220" : "#F1F5F9",
    }),
    [isDark, theme],
  );

  const [callMut] = useLiveControlCallMutation();
  const [setScoreboardScaleMut] = useSetScoreboardScaleMutation();
  const [uploadImg] = useUploadImageToFolderMutation();
  const [logoUploading, setLogoUploading] = useState(false);
  const call = useCallback(
    (path: string, method = "GET", body?: any) =>
      callMut({ machineId: String(machineId), path, method, body }).unwrap(),
    [machineId, callMut]
  );

  const [opt, setOpt] = useState<any>({ tournaments: [], cams: [], rtspSources: [], fbPages: [], encoders: [] });
  const [loading, setLoading] = useState(true);

  // Form state
  const [tour, setTour] = useState<any>(null);
  const [courts, setCourts] = useState<any[]>([]);
  const [court, setCourt] = useState<any>(null);
  const [tourQuery, setTourQuery] = useState("");
  const [srcType, setSrcType] = useState<"rtsp" | "url" | "imou">("rtsp");
  const [rtspIdx, setRtspIdx] = useState<number>(-1);
  const [urlText, setUrlText] = useState("");
  const [camIdx, setCamIdx] = useState<number>(-1);
  const [destType, setDestType] = useState<"fb" | "youtube">("fb");
  const [fbPage, setFbPage] = useState<any>(null);
  const [crosspost, setCrosspost] = useState<string[]>([]);
  const [perMatch, setPerMatch] = useState(false);
  const [split, setSplit] = useState(false);
  const [recordClips, setRecordClips] = useState(false);
  const [hideTs, setHideTs] = useState(false);
  const [title, setTitle] = useState("");
  const [encoder, setEncoder] = useState("auto");
  const [overlayStyle, setOverlayStyle] = useState("classic");
  const [sbScale, setSbScale] = useState(1);
  const [ovLayout, setOvLayout] = useState<any>(DEFAULT_LAYOUT);
  const [browserOverlayUrl, setBrowserOverlayUrl] = useState("");
  const [showTicker, setShowTicker] = useState(true);
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [schedAt, setSchedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  // Modal picker
  const [picker, setPicker] = useState<{ title: string; items: { label: string; value: any }[]; onPick: (v: any) => void } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await call("/api/options");
        setOpt({
          tournaments: d.tournaments || [], cams: d.cams || [],
          rtspSources: d.rtspSources || [], fbPages: d.fbPages || [],
          encoders: d.encoders || [],
        });
      } catch (e: any) {
        Alert.alert("Lỗi", e?.data?.message || e?.message || "Không tải được tuỳ chọn (máy offline?)");
      } finally {
        setLoading(false);
      }
    })();
  }, [call]);

  // Chế độ SỬA: nạp cấu hình phiên đang live để prefill (chỉ 1 lần, sau khi có options).
  const [prefilled, setPrefilled] = useState(false);
  const origCfgRef = useRef<any>(null);
  const origLayoutRef = useRef<any>(null);
  useEffect(() => {
    if (!editMode || prefilled || loading) return;
    (async () => {
      try {
        const st = await call("/api/state");
        const sess = (st?.sessions || []).find((s: any) => s.sid === editSid);
        const cfg = sess?.config;
        origCfgRef.current = cfg || null;
        if (sess?.layout) {
          const L = { ...DEFAULT_LAYOUT, ...sess.layout };
          setOvLayout(L);
          origLayoutRef.current = L;
        }
        if (!cfg) {
          Alert.alert("Lưu ý", "Phiên này chưa có cấu hình để sửa (app desktop cần bản mới). Bạn vẫn chọn lại nguồn/sân được.");
          setPrefilled(true);
          return;
        }
        if (cfg.tournamentId) {
          try {
            const d = await call(`/api/options?tournamentId=${encodeURIComponent(cfg.tournamentId)}`);
            const cs = d.courts || [];
            setCourts(cs);
            setTour({ _id: cfg.tournamentId, name: sess?.tournament || "" });
            if (cfg.courtStationId) setCourt(cs.find((c: any) => c._id === cfg.courtStationId) || { _id: cfg.courtStationId, name: sess?.court || "" });
          } catch {}
        }
        const src = cfg.source || {};
        if (src.imouDeviceId) {
          setSrcType("imou");
          const idx = (opt.cams || []).findIndex((c: any) => c.deviceId === src.imouDeviceId);
          if (idx >= 0) setCamIdx(idx);
        } else if (src.sourceUrl) {
          const idx = (opt.rtspSources || []).findIndex((s: any) => s.url === src.sourceUrl);
          if (idx >= 0) { setSrcType("rtsp"); setRtspIdx(idx); }
          else { setSrcType("url"); setUrlText(src.sourceUrl); }
        }
        const d0 = (cfg.destinations || [])[0];
        if (d0?.type === "youtube") setDestType("youtube");
        else if (d0?.pageId) {
          setDestType("fb");
          setFbPage((opt.fbPages || []).find((p: any) => p.pageId === d0.pageId) || { pageId: d0.pageId, pageName: d0.pageName || d0.label || d0.pageId });
        }
        if (cfg.title) setTitle(cfg.title);
        if (cfg.overlayStyle) setOverlayStyle(cfg.overlayStyle);
        if (cfg.browserOverlayUrl) setBrowserOverlayUrl(cfg.browserOverlayUrl);
        if (cfg.scoreboardScale) setSbScale(Number(cfg.scoreboardScale) || 1);
      } catch (e: any) {
        Alert.alert("Lỗi", e?.data?.message || e?.message || "Không nạp được cấu hình phiên.");
      } finally {
        setPrefilled(true);
      }
    })();
  }, [editMode, prefilled, loading, call, editSid, opt.cams, opt.rtspSources, opt.fbPages]);

  const searchTours = useCallback(async (q: string) => {
    try {
      const d = await call(`/api/options?q=${encodeURIComponent(q)}`);
      setOpt((o: any) => ({ ...o, tournaments: d.tournaments || [] }));
    } catch {}
  }, [call]);

  const pickTournament = async (t: any) => {
    setTour(t); setCourt(null); setCourts([]);
    try {
      const d = await call(`/api/options?tournamentId=${encodeURIComponent(t._id)}`);
      setCourts(d.courts || []);
    } catch {}
  };

  const pickLogo = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.95 });
      if (r.canceled || !r.assets?.[0]) return;
      setLogoUploading(true);
      const file = await prepareSupportImageForUpload({ uri: r.assets[0].uri }, "logo");
      const res: any = await uploadImg({ folder: "overlay-logos", file, options: { format: "png", quality: 92 } }).unwrap();
      const url = res?.url || res?.data?.url;
      if (url) setBrandLogoUrl(url);
      else throw new Error("Không nhận được URL");
    } catch (e: any) {
      Alert.alert("Lỗi", "Tải logo thất bại: " + (e?.message || e));
    } finally {
      setLogoUploading(false);
    }
  };

  const buildPayload = () => {
    if (!tour) throw new Error("Chọn giải đấu");
    if (!court) throw new Error("Chọn sân");
    let source: any = {};
    if (srcType === "rtsp") { const s = opt.rtspSources[rtspIdx]; if (!s) throw new Error("Chọn nguồn RTSP"); source = { sourceUrl: s.url }; }
    else if (srcType === "url") { if (!urlText.trim()) throw new Error("Nhập link nguồn"); source = { sourceUrl: urlText.trim() }; }
    else { const c = opt.cams[camIdx]; if (!c) throw new Error("Chọn camera Imou"); source = { imouDeviceId: c.deviceId, venueId: c.venueId }; }
    let destinations: any[] = [];
    if (destType === "fb") {
      if (!fbPage) throw new Error("Chọn Facebook Page");
      const dest: any = { type: "fb", pageId: fbPage.pageId, pageName: fbPage.pageName, label: fbPage.pageName };
      const cp = crosspost.filter((id) => id && id !== fbPage.pageId);
      if (cp.length) { dest.crosspostPageIds = cp; dest.crosspostNames = cp.map((id) => opt.fbPages.find((x: any) => x.pageId === id)?.pageName || id); }
      destinations = [dest];
    } else destinations = [{ type: "youtube", label: "YouTube (tự tạo qua API)" }];
    const payload: any = {
      tournamentId: tour._id, tournamentName: tour.name,
      courtStationId: court._id, courtName: court.name,
      source, destinations,
      perMatchLive: perMatch, recordClips, splitPerTournament: split,
      title: title.trim(), encoder, overlayStyle, noTicker: !showTicker,
      scoreboardScale: sbScale, layout: ovLayout,
      advanced: { resolutionH: 1080, fps: 0, videoBitrateKbps: 4500 },
    };
    if (hideTs) payload.hideTimestamp = true;
    if (overlayStyle === "url") {
      if (!browserOverlayUrl.trim()) throw new Error("Nhập URL scoreboard");
      payload.browserOverlayUrl = browserOverlayUrl.trim();
    }
    if (brandLogoUrl.trim()) payload.brandLogoUrl = brandLogoUrl.trim();
    return payload;
  };

  const doStart = async () => {
    setBusy(true);
    try {
      await call("/api/start", "POST", buildPayload());
      Alert.alert("OK", "Đã bắt đầu live.");
      router.back();
    } catch (e: any) { Alert.alert("Lỗi", e?.data?.error || e?.data?.detail || e?.data?.message || e?.message || "Thử lại"); }
    finally { setBusy(false); }
  };
  const needsRestartForChange = (p: any) => {
    const o = origCfgRef.current;
    if (!o) return true;
    const os = o.source || {};
    const srcChanged =
      String(os.sourceUrl || "") !== String(p.source?.sourceUrl || "") ||
      String(os.imouDeviceId || "") !== String(p.source?.imouDeviceId || "");
    const od = (o.destinations || [])[0] || {};
    const nd = (p.destinations || [])[0] || {};
    const destChanged =
      String(od.type || "") !== String(nd.type || "") ||
      String(od.pageId || "") !== String(nd.pageId || "");
    const courtChanged = String(o.courtStationId || "") !== String(p.courtStationId || "");
    return srcChanged || destChanged || courtChanged;
  };

  const doReconfigure = async () => {
    setBusy(true);
    try {
      const p = buildPayload();
      if (!needsRestartForChange(p)) {
        if (Number(origCfgRef.current?.scoreboardScale || 1) !== Number(sbScale)) {
          try { await setScoreboardScaleMut({ sid: editSid, scale: sbScale }).unwrap(); } catch {}
        }
        const ol = origLayoutRef.current || DEFAULT_LAYOUT;
        if (ol.scoreboard !== ovLayout.scoreboard || ol.brand !== ovLayout.brand || ol.sponsor !== ovLayout.sponsor) {
          try { await call("/api/set-layout", "POST", { sid: editSid, layout: ovLayout }); } catch {}
        }
        const res: any = await call("/api/set-overlay", "POST", {
          sid: editSid,
          overlayStyle: p.overlayStyle,
          browserOverlayUrl: p.browserOverlayUrl || "",
          title: p.title,
        });
        if (!res?.needsRestart) {
          Alert.alert("OK", "Đã cập nhật overlay — không gián đoạn.");
          router.back();
          return;
        }
      }
      await call("/api/reconfigure", "POST", {
        sid: editSid,
        courtStationId: p.courtStationId,
        courtName: p.courtName,
        source: p.source,
        destinations: p.destinations,
        title: p.title,
        overlayStyle: p.overlayStyle,
        browserOverlayUrl: p.browserOverlayUrl,
      });
      Alert.alert("OK", "Đã cập nhật — luồng đang khởi động lại.");
      router.back();
    } catch (e: any) { Alert.alert("Lỗi", e?.data?.error || e?.data?.detail || e?.data?.message || e?.message || "Thử lại"); }
    finally { setBusy(false); }
  };
  const doSchedule = async () => {
    try {
      if (!schedAt) throw new Error("Chọn ngày giờ hẹn");
      if (schedAt.getTime() < Date.now() + 30000) throw new Error("Thời điểm hẹn phải ở tương lai");
      setBusy(true);
      await call("/api/schedule", "POST", { ...buildPayload(), startAt: schedAt.getTime() });
      Alert.alert("OK", "Đã hẹn giờ live lúc " + schedAt.toLocaleString("vi-VN"));
      router.back();
    } catch (e: any) { Alert.alert("Lỗi", e?.data?.error || e?.data?.detail || e?.data?.message || e?.message || "Thử lại"); }
    finally { setBusy(false); }
  };

  const openDateTime = () => {
    const base = schedAt || new Date(Date.now() + 3600000);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: base, mode: "date", onChange: (_e, d) => {
          if (!d) return;
          DateTimePickerAndroid.open({
            value: d, mode: "time", is24Hour: true, onChange: (_e2, t) => {
              if (!t) return;
              const out = new Date(d); out.setHours(t.getHours(), t.getMinutes(), 0, 0);
              setSchedAt(out);
            },
          });
        },
      });
    } else { setIosPicker(base); }
  };
  const [iosPicker, setIosPicker] = useState<Date | null>(null);

  // Giữ identity ổn định (useCallback) để gõ TextInput không bị remount → mất focus/đóng bàn phím.
  const Row = useCallback(
    ({ label, children }: any) => (
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: C.sub, fontSize: 13, marginBottom: 5 }}>{label}</Text>
        {children}
      </View>
    ),
    [C],
  );
  const SelectBtn = useCallback(
    ({ text, onPress }: any) => (
      <Pressable onPress={onPress} style={[styles.select, { backgroundColor: C.field, borderColor: C.border }]}>
        <Text style={{ color: text ? C.text : C.sub }}>{text || "— Chọn —"}</Text>
      </Pressable>
    ),
    [C],
  );
  const Seg = useCallback(
    ({ options, value, onChange }: any) => (
      <View style={styles.seg}>
        {options.map((o: any) => (
          <Pressable key={o.v} onPress={() => onChange(o.v)} style={[styles.segItem, { backgroundColor: value === o.v ? C.primary : C.field, borderColor: C.border }]}>
            <Text style={{ color: value === o.v ? "#fff" : C.text, fontWeight: "600", fontSize: 13 }}>{o.l}</Text>
          </Pressable>
        ))}
      </View>
    ),
    [C],
  );
  const Toggle = useCallback(
    ({ label, value, onValueChange }: any) => (
      <View style={[styles.toggleRow]}>
        <Text style={{ color: C.text, flex: 1 }}>{label}</Text>
        <Switch value={value} onValueChange={onValueChange} />
      </View>
    ),
    [C],
  );

  if (!isAdmin && !hasLiveGrant) return <Redirect href="/(tabs)/more" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { borderColor: C.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={{ color: C.primary, fontSize: 16 }}>‹ Quay lại</Text></Pressable>
        <Text style={[styles.h1, { color: C.text }]}>{editMode ? "Sửa phiên live" : "Thêm sân live"}</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 30 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          <Row label="Giải đấu">
            <TextInput
              value={tourQuery}
              onChangeText={(v: string) => { setTourQuery(v); searchTours(v); }}
              placeholder="Tìm tên giải…"
              placeholderTextColor={C.sub}
              style={[styles.input, { backgroundColor: C.field, borderColor: C.border, color: C.text }]}
            />
            <View style={{ height: 6 }} />
            <SelectBtn text={tour?.name} onPress={() => setPicker({ title: "Chọn giải", items: opt.tournaments.map((t: any) => ({ label: t.name, value: t })), onPick: pickTournament })} />
          </Row>

          {!!tour && (
            <Row label="Sân">
              <SelectBtn text={court ? `${court.name}${court.hasMatch ? " · (đang có trận)" : ""}` : ""} onPress={() => setPicker({ title: "Chọn sân", items: courts.map((c: any) => ({ label: `${c.name}${c.hasMatch ? " · (đang có trận)" : ""}`, value: c })), onPick: setCourt })} />
            </Row>
          )}

          <Row label="Nguồn">
            <Seg options={[{ v: "rtsp", l: "RTSP lưu" }, { v: "url", l: "Link" }, { v: "imou", l: "Imou" }]} value={srcType} onChange={setSrcType} />
            <View style={{ height: 8 }} />
            {srcType === "rtsp" && <SelectBtn text={opt.rtspSources[rtspIdx]?.label} onPress={() => setPicker({ title: "Nguồn RTSP", items: opt.rtspSources.map((s: any, i: number) => ({ label: s.label, value: i })), onPick: setRtspIdx })} />}
            {srcType === "url" && <TextInput value={urlText} onChangeText={setUrlText} placeholder="rtsp:// hoặc m3u8…" placeholderTextColor={C.sub} style={[styles.input, { backgroundColor: C.field, borderColor: C.border, color: C.text }]} />}
            {srcType === "imou" && <SelectBtn text={opt.cams[camIdx]?.label} onPress={() => setPicker({ title: "Camera Imou", items: opt.cams.map((c: any, i: number) => ({ label: c.label, value: i })), onPick: setCamIdx })} />}
          </Row>

          <Row label="Điểm đến">
            <Seg options={[{ v: "fb", l: "Facebook" }, { v: "youtube", l: "YouTube" }]} value={destType} onChange={setDestType} />
            {destType === "fb" && (
              <>
                <View style={{ height: 8 }} />
                <SelectBtn text={fbPage?.pageName} onPress={() => setPicker({ title: "Facebook Page", items: opt.fbPages.map((p: any) => ({ label: p.pageName, value: p })), onPick: setFbPage })} />
                <Pressable
                  onPress={() => setPicker({
                    title: "Crosspost (chọn nhiều)", multi: true, selected: crosspost,
                    items: opt.fbPages.filter((p: any) => p.pageId !== fbPage?.pageId).map((p: any) => ({ label: p.pageName, value: p.pageId })),
                    onPick: setCrosspost,
                  } as any)}
                  style={[styles.select, { backgroundColor: C.field, borderColor: C.border, marginTop: 6 }]}
                >
                  <Text style={{ color: crosspost.length ? C.text : C.sub }}>
                    {crosspost.length ? `Crosspost: ${crosspost.length} page` : "Crosspost (tuỳ chọn)"}
                  </Text>
                </Pressable>
              </>
            )}
          </Row>

          <Row label="Tiêu đề (để trống = Tên giải - Tên sân)">
            <TextInput value={title} onChangeText={setTitle} placeholder="Tiêu đề live…" placeholderTextColor={C.sub} style={[styles.input, { backgroundColor: C.field, borderColor: C.border, color: C.text }]} />
          </Row>

          {opt.encoders?.length ? (
            <Row label="Encoder">
              <SelectBtn text={encoder === "auto" ? "Tự động (GPU)" : (opt.encoders.find((e: any) => e.value === encoder)?.label || encoder)} onPress={() => setPicker({ title: "Encoder", items: [{ label: "Tự động (GPU)", value: "auto" }, ...opt.encoders.map((e: any) => ({ label: e.label, value: e.value }))], onPick: setEncoder })} />
            </Row>
          ) : null}

          <Row label="Kiểu overlay bảng điểm">
            <SelectBtn
              text={{ classic: "Classic (mặc định)", A: "A · Broadcast Pro", B: "B · Aurora Glass", C: "C · Minimal Clean", D: "D · Neon Volt", E: "E · Court Vision", F: "F · Championship Gold", G: "G · Carbon Sport", H: "H · Sunset Smash", I: "I · Ocean Deep", J: "J · Midnight Pro", K: "K · Clean Light", L: "L · Royal Purple", M: "M · Esports Volt", N: "N · Pickle Fresh", url: "Scoreboard từ URL" }[overlayStyle] || "Classic (mặc định)"}
              onPress={() => setPicker({ title: "Kiểu overlay", items: [
                { label: "Classic (mặc định)", value: "classic" },
                { label: "A · Broadcast Pro", value: "A" },
                { label: "B · Aurora Glass", value: "B" },
                { label: "C · Minimal Clean", value: "C" },
                { label: "D · Neon Volt", value: "D" },
                { label: "E · Court Vision", value: "E" },
                { label: "F · Championship Gold", value: "F" },
                { label: "G · Carbon Sport", value: "G" },
                { label: "H · Sunset Smash", value: "H" },
                { label: "I · Ocean Deep", value: "I" },
                { label: "J · Midnight Pro", value: "J" },
                { label: "K · Clean Light", value: "K" },
                { label: "L · Royal Purple", value: "L" },
                { label: "M · Esports Volt", value: "M" },
                { label: "N · Pickle Fresh", value: "N" },
                { label: "Scoreboard từ URL (tuỳ chỉnh)", value: "url" },
              ], onPick: setOverlayStyle })}
            />
            {overlayStyle === "url" && (
              <TextInput
                value={browserOverlayUrl}
                onChangeText={setBrowserOverlayUrl}
                placeholder="https://… (trang overlay HTML của bạn)"
                placeholderTextColor={C.sub}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { backgroundColor: C.field, borderColor: C.border, color: C.text, marginTop: 8 }]}
              />
            )}
          </Row>

          <Row label="Cỡ bảng điểm (overlay)">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SB_SCALE_PRESETS.map((v) => {
                const active = Math.abs(sbScale - v) < 0.001;
                return (
                  <Pressable key={v} onPress={() => setSbScale(v)}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: active ? C.primary : C.field }}>
                    <Text style={{ color: active ? "#fff" : C.text, fontWeight: "700", fontSize: 13 }}>{Math.round(v * 100)}%</Text>
                  </Pressable>
                );
              })}
            </View>
          </Row>

          <Row label="Vị trí overlay (ghi nhớ cho sân)">
            <View style={{ gap: 8 }}>
              {OV_SLOTS.map(([slot, label]) => (
                <View key={slot} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ color: C.sub, width: 72, fontSize: 13 }}>{label}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1 }}>
                    {OV_CORNERS.map(([c, cl]) => {
                      const active = (ovLayout[slot] || DEFAULT_LAYOUT[slot]) === c;
                      return (
                        <Pressable key={c} onPress={() => setOvLayout((m: any) => ({ ...m, [slot]: c }))}
                          style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: active ? C.primary : C.field }}>
                          <Text style={{ color: active ? "#fff" : C.text, fontWeight: "700", fontSize: 12 }}>{cl}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </Row>

          <Row label="Logo overlay (trống = logo PickleTour)">
            <TextInput
              value={brandLogoUrl}
              onChangeText={setBrandLogoUrl}
              placeholder="https://… hoặc bấm Tải ảnh lên"
              placeholderTextColor={C.sub}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { backgroundColor: C.field, borderColor: C.border, color: C.text }]}
            />
            <Pressable onPress={pickLogo} disabled={logoUploading} style={[styles.select, { backgroundColor: C.field, borderColor: C.border, marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8 }]}>
              {logoUploading ? <ActivityIndicator size="small" color={C.primary} /> : null}
              <Text style={{ color: C.text }}>{logoUploading ? "Đang tải…" : "📷 Tải ảnh lên"}</Text>
            </Pressable>
            {!!brandLogoUrl && (
              <Image source={{ uri: brandLogoUrl }} resizeMode="contain" style={{ height: 48, width: 120, marginTop: 8, alignSelf: "flex-start" }} />
            )}
          </Row>

          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Toggle label="Chữ chạy cuối màn hình (ticker)" value={showTicker} onValueChange={setShowTicker} />
            <Toggle label="Live riêng từng trận" value={perMatch} onValueChange={setPerMatch} />
            <Toggle label="Tách live theo giải (đổi giải → live mới)" value={split} onValueChange={setSplit} />
            <Toggle label="Ghi + cắt clip lên Drive" value={recordClips} onValueChange={setRecordClips} />
            <Toggle label="Ẩn ngày giờ camera (làm mờ)" value={hideTs} onValueChange={setHideTs} />
          </View>

          {editMode ? (
            <>
              <Pressable onPress={doReconfigure} disabled={busy} style={[styles.bigBtn, { backgroundColor: "#F59E0B", opacity: busy ? 0.6 : 1 }]}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>● Cập nhật</Text>
              </Pressable>
              <Text style={{ color: C.sub, fontSize: 12, marginTop: 10 }}>
                Đổi giữa các kiểu nâng cao A–N, cỡ/vị trí overlay, link overlay hoặc tiêu đề → áp ngay, không gián đoạn. Chuyển Classic ↔ A–N (thêm/bớt lớp overlay) hoặc đổi sân / nguồn / điểm đến → bắt buộc dừng & live lại (gián đoạn vài giây; đổi điểm đến tạo link xem mới).
              </Text>
            </>
          ) : (
            <>
              <Row label="Hẹn giờ (để trống = live ngay)">
                <SelectBtn text={schedAt ? schedAt.toLocaleString("vi-VN") : ""} onPress={openDateTime} />
                {!!schedAt && <Pressable onPress={() => setSchedAt(null)} style={{ marginTop: 6 }}><Text style={{ color: C.sub }}>Xoá hẹn giờ</Text></Pressable>}
              </Row>

              <Pressable onPress={doStart} disabled={busy} style={[styles.bigBtn, { backgroundColor: C.primary, opacity: busy ? 0.6 : 1 }]}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>● Bắt đầu live ngay</Text>
              </Pressable>
              {!!schedAt && (
                <Pressable onPress={doSchedule} disabled={busy} style={[styles.bigBtnOutline, { borderColor: C.primary, opacity: busy ? 0.6 : 1 }]}>
                  <Text style={{ color: C.primary, fontWeight: "800", fontSize: 16 }}>⏰ Hẹn giờ live</Text>
                </Pressable>
              )}
              <Text style={{ color: C.sub, fontSize: 12, marginTop: 10 }}>
                Vị trí overlay dùng mặc định — chỉnh được ngay khi đang live ở màn Điều khiển Live.
              </Text>
            </>
          )}
        </ScrollView>
      )}

      {/* iOS datetime modal */}
      {Platform.OS === "ios" && iosPicker != null && (
        <Modal transparent animationType="slide" onRequestClose={() => setIosPicker(null)}>
          <Pressable style={styles.modalBg} onPress={() => setIosPicker(null)}>
            <Pressable style={[styles.sheet, { backgroundColor: C.card }]} onPress={(e) => e.stopPropagation()}>
              <DateTimePicker value={iosPicker} mode="datetime" display="spinner" onChange={(_e, d) => d && setIosPicker(d)} themeVariant={isDark ? "dark" : "light"} />
              <Pressable onPress={() => { setSchedAt(iosPicker); setIosPicker(null); }} style={[styles.bigBtn, { backgroundColor: C.primary }]}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Chọn</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Picker modal */}
      {picker && (
        <Modal transparent animationType="slide" onRequestClose={() => setPicker(null)}>
          <Pressable style={styles.modalBg} onPress={() => setPicker(null)}>
            <Pressable style={[styles.sheet, { backgroundColor: C.card, maxHeight: "70%" }]} onPress={(e) => e.stopPropagation()}>
              <Text style={{ color: C.text, fontWeight: "800", fontSize: 16, marginBottom: 10 }}>{(picker as any).title}</Text>
              <ScrollView>
                {(picker.items || []).length === 0 && <Text style={{ color: C.sub }}>(trống)</Text>}
                {(picker.items || []).map((it, i) => {
                  const multi = (picker as any).multi;
                  const sel = multi ? ((picker as any).selected || []).includes(it.value) : false;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => {
                        if (multi) {
                          const cur = (picker as any).selected || [];
                          const next = cur.includes(it.value) ? cur.filter((x: any) => x !== it.value) : [...cur, it.value];
                          (picker as any).selected = next;
                          setPicker({ ...(picker as any) });
                          picker.onPick(next);
                        } else { picker.onPick(it.value); setPicker(null); }
                      }}
                      style={[styles.pickItem, { borderColor: C.border }]}
                    >
                      <Text style={{ color: C.text }}>{it.label}</Text>
                      {multi && sel ? <Text style={{ color: C.primary, fontWeight: "700" }}>✓</Text> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable onPress={() => setPicker(null)} style={[styles.bigBtnOutline, { borderColor: C.border, marginTop: 8 }]}>
                <Text style={{ color: C.text, fontWeight: "700" }}>Đóng</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {busy && <View style={styles.busy}><ActivityIndicator color="#fff" size="large" /></View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  h1: { fontSize: 18, fontWeight: "800" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  select: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  seg: { flexDirection: "row", gap: 8 },
  segItem: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  bigBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  bigBtnOutline: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8, borderWidth: 1.5 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  pickItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1 },
  busy: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" },
});
