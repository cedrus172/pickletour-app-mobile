// app/tournament/[id]/album.tsx — Album ảnh giải đấu (ảnh lấy từ thư mục Google Drive BTC gắn vào giải).
// Lưới ảnh nhỏ tải dần → chạm xem toàn màn, vuốt qua lại → lưu ảnh (bản 2048px có logo) vào thư viện / chia sẻ.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useSelector } from "react-redux";
import PlayerSelector from "@/components/PlayerSelector";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/i18nText";
import AppModal from "@/components/ui/AppModal";
import { normalizeUrl } from "@/utils/normalizeUri";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import {
  useGetTournamentAlbumsQuery,
  useGetTournamentQuery,
  useLazyGetTournamentAlbumPhotosQuery,
  useSearchAlbumFacesMutation,
  useLazyGetAlbumPhotoFacesQuery,
  useSetAlbumPhotoAvatarMutation,
  useIdentifyAlbumFaceMutation,
} from "@/slices/tournamentsApiSlice";

let MediaLibrary: typeof import("expo-media-library") | null = null;
try {
  MediaLibrary = require("expo-media-library");
} catch {
  /* bản cài cũ thiếu module native → dùng chia sẻ */
}

type Photo = { id: string; name: string; thumb: string; full: string; download: string };
type Folder = { id: string; name: string };
const PAGE_SIZE = 60;

function Chip({ label, active, onPress, icon, C }: any) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? C.primary : C.border, backgroundColor: active ? C.primary : C.card },
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? "#fff" : C.sub} /> : null}
      <Text style={[styles.chipText, { color: active ? "#fff" : C.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function TournamentAlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const C = useThemeTokens();
  const { width, height } = useWindowDimensions();
  const cols = width >= 900 ? 6 : width >= 600 ? 4 : 3;
  const gap = 3;
  const cell = Math.floor((width - 16 * 2 - gap * (cols - 1)) / cols);

  const { data: tour } = useGetTournamentQuery(id);
  const { data: albumsRes, isLoading: albumsLoading } = useGetTournamentAlbumsQuery(id);
  const albums = albumsRes?.albums || [];
  const [fetchPage] = useLazyGetTournamentAlbumPhotosQuery();

  const [albumIndex, setAlbumIndex] = useState(0);
  const [folder, setFolder] = useState("");
  const [rootFolders, setRootFolders] = useState<Folder[]>([]);
  const [rootHasPhotos, setRootHasPhotos] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [info, setInfo] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState(-1);
  const reqRef = useRef(0);
  // "Tìm ảnh của tôi": kết quả theo khuôn mặt (null = xem album bình thường)
  const me: any = useSelector((st: any) => st?.auth?.userInfo || null);
  const isAdmin = !!(me?.isAdmin || ["admin", "superadmin", "superuser"].includes(String(me?.role || "").toLowerCase()));
  const [faceResult, setFaceResult] = useState<any>(null);
  const [searchFaces, { isLoading: searching }] = useSearchAlbumFacesMutation();

  const runFaceSearch = useCallback(
    async (mode: "avatar" | "camera" | "library") => {
      try {
        let file: any = null;
        if (mode !== "avatar") {
          const opts: any = { mediaTypes: ["images"], quality: 1, cameraType: ImagePicker.CameraType.front };
          if (mode === "camera") {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) return Alert.alert("Cần quyền camera", "Hãy cho phép PickleTour dùng camera để chụp ảnh selfie.");
          }
          const sel = mode === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
          if (sel.canceled) return;
          const img = await ImageManipulator.manipulateAsync(sel.assets[0].uri, [{ resize: { width: 1080 } }], {
            compress: 0.85,
            format: ImageManipulator.SaveFormat.JPEG,
          });
          file = { uri: img.uri, name: "selfie.jpg", type: "image/jpeg" };
        }
        const res: any = await searchFaces({ id, index: albumIndex, file }).unwrap();
        setFaceTarget("");
        setViewer(-1);
        setFaceResult(res);
        if (!res?.index?.ready)
          Alert.alert("Album đang được phân tích", `Đã phân tích ${res?.index?.done || 0}/${res?.index?.total || "?"} ảnh — kết quả sẽ đầy đủ hơn khi xong.`);
      } catch (e: any) {
        Alert.alert("Không tìm được ảnh", e?.data?.message || e?.message || "Vui lòng thử lại.");
      }
    },
    [searchFaces, id, albumIndex],
  );
  // Tìm tất cả ảnh có mặt một người trong ảnh đang xem (nhiều mặt → cho chọn mặt)
  const [faceTarget, setFaceTarget] = useState(""); // ảnh nhỏ khuôn mặt đang tìm (hiển thị ở đầu kết quả)
  const searchByAlbumFace = useCallback(
    async (fileId: string, face: number, thumb?: string) => {
      try {
        const res: any = await searchFaces({ id, index: albumIndex, pick: { fileId, face } }).unwrap();
        setViewer(-1);
        setFaceTarget(thumb || "");
        setFaceResult(res);
      } catch (e: any) {
        Alert.alert("Không tìm được ảnh", e?.data?.message || e?.message || "Vui lòng thử lại.");
      }
    },
    [searchFaces, id, albumIndex],
  );

  const askFaceSearch = () => {
    if (!me?._id) return Alert.alert("Cần đăng nhập", "Vui lòng đăng nhập để tìm ảnh của bạn.");
    Alert.alert("Tìm ảnh của tôi", "So khuôn mặt của bạn với ảnh trong album. Ảnh bạn chọn chỉ dùng để tìm, không được lưu.", [
      { text: "Dùng ảnh đại diện", onPress: () => runFaceSearch("avatar") },
      { text: "Chụp ảnh selfie", onPress: () => runFaceSearch("camera") },
      { text: "Chọn ảnh có sẵn", onPress: () => runFaceSearch("library") },
      { text: "Huỷ", style: "cancel" },
    ]);
  };
  const shownPhotos: Photo[] = faceResult ? faceResult.photos : photos;

  const load = useCallback(
    async (nextPage: number, reset = false) => {
      const req = ++reqRef.current;
      setLoading(true);
      setError("");
      try {
        const res: any = await fetchPage({ id, index: albumIndex, folder, page: nextPage, limit: PAGE_SIZE }, true).unwrap();
        if (req !== reqRef.current) return;
        setInfo(res);
        setPage(res.page);
        if (res.folder?.isRoot) {
          setRootFolders(res.folders || []);
          setRootHasPhotos(res.total > 0);
        }
        setPhotos((prev) => (reset ? res.photos : [...prev, ...res.photos]));
      } catch (e: any) {
        if (req === reqRef.current) setError(e?.data?.message || "Không tải được ảnh từ Google Drive");
      } finally {
        if (req === reqRef.current) setLoading(false);
      }
    },
    [fetchPage, id, albumIndex, folder],
  );

  useEffect(() => {
    if (!albums.length) return;
    setPhotos([]);
    setInfo(null);
    load(1, true);
  }, [albums.length, load]);

  // Thư mục gốc chỉ chứa thư mục con (vd. 4.4 / 4.8) → mở thư mục trùng tên nội dung giải, không có thì thư mục đầu.
  useEffect(() => {
    if (folder || !info?.folder?.isRoot || info.total || !info.folders?.length) return;
    const name = String(tour?.name || "").toLowerCase();
    const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = info.folders.find((f: Folder) => {
      const n = String(f.name || "").trim().toLowerCase();
      return !!n && new RegExp(`(^|[^0-9a-z.])${esc(n)}($|[^0-9a-z])`, "i").test(name);
    });
    setFolder((match || info.folders[0]).id);
  }, [folder, info, tour?.name]);

  const hasMore = !faceResult && !!info && page < info.pages;
  const loadMore = () => {
    if (hasMore && !loading) load(page + 1);
  };

  const title = useMemo(() => albums[albumIndex]?.title || "Album ảnh", [albums, albumIndex]);

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <Stack.Screen options={{ headerShown: true, title: "Album ảnh", headerBackTitle: "Quay lại" }} />
      {albumsLoading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : !albums.length ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={48} color={C.sub} />
          <Text style={{ color: C.sub, marginTop: 10 }}>Giải này chưa có album ảnh.</Text>
        </View>
      ) : (
        <FlatList
          data={shownPhotos}
          key={`grid-${cols}`}
          numColumns={cols}
          keyExtractor={(p) => p.id}
          columnWrapperStyle={{ gap }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap }}
          initialNumToRender={cols * 6}
          maxToRenderPerBatch={cols * 4}
          windowSize={7}
          onEndReachedThreshold={0.6}
          onEndReached={loadMore}
          ListHeaderComponent={
            <View style={{ paddingTop: 12, paddingBottom: 6, gap: 8 }}>
              <Text style={[styles.title, { color: C.text }]} numberOfLines={2}>
                {tour?.name || title}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Pressable
                  testID="album-face-search"
                  accessibilityRole="button"
                  onPress={askFaceSearch}
                  disabled={searching}
                  style={[styles.faceBtn, { backgroundColor: faceResult ? C.card : C.primary, borderColor: C.primary }]}
                >
                  {searching ? (
                    <ActivityIndicator color={faceResult ? C.primary : "#fff"} />
                  ) : (
                    <Ionicons name="scan-outline" size={17} color={faceResult ? C.primary : "#fff"} />
                  )}
                  <Text style={{ color: faceResult ? C.primary : "#fff", fontWeight: "800" }}>Tìm ảnh của tôi</Text>
                </Pressable>
                {faceResult ? (
                  <Pressable accessibilityRole="button" onPress={() => { setFaceResult(null); setFaceTarget(""); setViewer(-1); }} style={styles.faceBack}>
                    <Text style={{ color: C.primary, fontWeight: "700" }}>← Xem tất cả ảnh</Text>
                  </Pressable>
                ) : null}
              </View>
              {faceResult ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {faceTarget ? <ExpoImage source={{ uri: faceTarget }} style={{ width: 34, height: 34, borderRadius: 17 }} contentFit="cover" /> : null}
                <Text style={{ color: C.sub, fontSize: 13, flex: 1 }}>
                  {faceResult.total
                    ? faceResult.source === "albumFace"
                      ? `Tìm thấy ${faceResult.total} ảnh có người này`
                      : `Tìm thấy ${faceResult.total} ảnh có bạn (${faceResult.source === "avatar" ? "theo ảnh đại diện" : "theo ảnh bạn chọn"})`
                    : "Chưa tìm thấy ảnh nào có bạn."}
                  {!faceResult.index?.ready ? ` · đang phân tích ${faceResult.index?.done || 0}/${faceResult.index?.total || "?"} ảnh` : ""}
                </Text>
                </View>
              ) : null}
              {!faceResult && albums.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {albums.map((a: any) => (
                    <Chip
                      key={a.index}
                      C={C}
                      icon="images-outline"
                      label={`${a.title}${a.photoCount ? ` · ${a.photoCount}` : ""}`}
                      active={a.index === albumIndex}
                      onPress={() => {
                        setAlbumIndex(a.index);
                        setFolder("");
                        setRootFolders([]);
                      }}
                    />
                  ))}
                </ScrollView>
              ) : null}
              {!faceResult && rootFolders.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {rootHasPhotos ? (
                    <Chip C={C} icon="images-outline" label="Chung" active={!folder} onPress={() => setFolder("")} />
                  ) : null}
                  {rootFolders.map((f) => (
                    <Chip key={f.id} C={C} icon="folder-outline" label={f.name} active={folder === f.id} onPress={() => setFolder(f.id)} />
                  ))}
                </ScrollView>
              ) : null}
              {!faceResult ? (
                <Text style={{ color: C.sub, fontSize: 13 }}>
                  {info ? `${info.folder?.name ? `${info.folder.name} · ` : ""}${info.total} ảnh` : " "}
                </Text>
              ) : null}
              {error ? <Text style={{ color: "#ef4444" }}>{error}</Text> : null}
            </View>
          }
          renderItem={({ item, index }) => (
            <Pressable accessibilityRole="imagebutton" accessibilityLabel={item.name} onPress={() => setViewer(index)}>
              <ExpoImage
                source={{ uri: item.thumb }}
                style={{ width: cell, height: cell, borderRadius: 6, backgroundColor: C.card }}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={item.id}
                transition={120}
              />
            </Pressable>
          )}
          ListFooterComponent={loading ? <ActivityIndicator color={C.primary} style={{ marginVertical: 20 }} /> : null}
        />
      )}

      <PhotoViewer
        photos={shownPhotos}
        index={viewer}
        total={faceResult ? faceResult.total : info?.total || photos.length}
        isAdmin={isAdmin}
        loggedIn={!!me?._id}
        searching={searching}
        onFindPerson={searchByAlbumFace}
        tournamentId={String(id)}
        albumIndex={albumIndex}
        width={width}
        height={height}
        onIndex={(i: number) => {
          setViewer(i);
          if (!faceResult && i >= photos.length - 3) loadMore();
        }}
        onClose={() => setViewer(-1)}
      />
    </View>
  );
}

function PhotoViewer({ photos, index, total, width, height, onIndex, onClose, isAdmin, tournamentId, albumIndex, loggedIn, searching, onFindPerson }: any) {
  // "Tìm ảnh người này": lấy các khuôn mặt trong ảnh; 1 mặt → tìm ngay, nhiều mặt → cho chọn
  const [getFaces, { isFetching: loadingFaces }] = useLazyGetAlbumPhotoFacesQuery();
  const [pickFaces, setPickFaces] = useState<any[] | null>(null);
  const [pickMode, setPickMode] = useState<"search" | "identify">("search");
  // "Đây là ai?": đoán tài khoản VĐV của khuôn mặt (so với ảnh đại diện VĐV đã đăng ký giải)
  const [identifyFace, { isLoading: identifying }] = useIdentifyAlbumFaceMutation();
  const [who, setWho] = useState<any>(null); // { fileId, face, loading, matches, candidates, complete }
  const runIdentify = async (fileId: string, face: any) => {
    setPickFaces(null);
    setWho({ fileId, face, loading: true, matches: [] });
    try {
      const res: any = await identifyFace({ id: tournamentId, index: albumIndex, fileId, face: face.index }).unwrap();
      setWho({ fileId, face, ...res });
    } catch (e: any) {
      setWho(null);
      Alert.alert("Không nhận diện được", e?.data?.message || "Vui lòng thử lại.");
    }
  };
  const findPerson = async (mode: "search" | "identify" = "search") => {
    const cur = photos[index];
    if (!cur) return;
    if (!loggedIn) return Alert.alert("Cần đăng nhập", mode === "identify" ? "Vui lòng đăng nhập để nhận diện VĐV." : "Vui lòng đăng nhập để tìm ảnh.");
    try {
      const res: any = await getFaces({ id: tournamentId, index: albumIndex, fileId: cur.id }, true).unwrap();
      const faces = res?.faces || [];
      if (!faces.length) return Alert.alert("Không thấy khuôn mặt", "Ảnh này không có khuôn mặt đủ rõ.");
      if (faces.length === 1) {
        return mode === "identify" ? runIdentify(cur.id, faces[0]) : onFindPerson(cur.id, faces[0].index, faces[0].thumb);
      }
      setPickMode(mode);
      setPickFaces(faces);
    } catch (e: any) {
      Alert.alert("Chưa đọc được khuôn mặt", e?.data?.message || "Vui lòng thử lại.");
    }
  };
  const [saving, setSaving] = useState(false);
  // Admin: đặt ảnh đang xem làm ảnh đại diện VĐV
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [setAvatar, { isLoading: settingAvatar }] = useSetAlbumPhotoAvatarMutation();
  const T = useThemeTokens();
  const confirmAvatar = async () => {
    const cur = photos[index];
    if (!cur || !player?._id) return;
    try {
      const res: any = await setAvatar({ id: tournamentId, index: albumIndex, fileId: cur.id, userId: player._id }).unwrap();
      Alert.alert(
        "Đã đổi ảnh đại diện",
        `${player.nickname || player.name || "VĐV"} đã có ảnh đại diện mới${res?.faceFound ? "." : " (không thấy mặt, đã cắt giữa ảnh)."}`,
      );
      setAvatarOpen(false);
      setPlayer(null);
    } catch (e: any) {
      Alert.alert("Không đổi được ảnh đại diện", e?.data?.message || "Vui lòng thử lại.");
    }
  };
  const visible = index >= 0 && !!photos[index];
  const current: Photo | undefined = photos[index];

  const save = async () => {
    if (!current || saving) return;
    setSaving(true);
    try {
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!dir) throw new Error("Không có bộ nhớ tạm để tải ảnh.");
      const safe = String(current.name || `pickletour-${current.id}.jpg`).replace(/[^\w.-]+/g, "_");
      const res = await FileSystem.downloadAsync(current.download, `${dir}${Date.now()}-${safe}`);
      if (res.status < 200 || res.status >= 300) throw new Error("Không tải được ảnh.");
      // Lưu thẳng vào thư viện ảnh; bản cài cũ thiếu khai báo quyền (NSPhotoLibraryAddUsageDescription)
      // hoặc thiếu module → mở bảng Chia sẻ của hệ thống (có sẵn "Lưu hình ảnh", không cần quyền riêng).
      let saved = false;
      if (MediaLibrary?.saveToLibraryAsync) {
        try {
          const perm = await MediaLibrary.requestPermissionsAsync(true);
          if (perm.granted) {
            await MediaLibrary.saveToLibraryAsync(res.uri);
            saved = true;
            Alert.alert("Đã lưu", "Ảnh (có logo PickleTour) đã được lưu vào thư viện ảnh.");
          } else if (perm.canAskAgain === false) {
            Alert.alert("Cần quyền truy cập Ảnh", "Hãy cho phép PickleTour lưu ảnh trong phần Cài đặt, hoặc chọn \"Lưu hình ảnh\" ở bảng chia sẻ.");
          }
        } catch {
          saved = false;
        }
      }
      if (!saved && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(res.uri, { mimeType: "image/jpeg", UTI: "public.jpeg", dialogTitle: "Lưu hoặc chia sẻ ảnh" });
      }
    } catch (e: any) {
      Alert.alert("Không thể lưu ảnh", e?.message || "Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    if (!current) return;
    try {
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const res = await FileSystem.downloadAsync(current.full, `${dir}${Date.now()}-${current.id}.jpg`);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res.uri, { dialogTitle: "Chia sẻ ảnh" });
    } catch (e: any) {
      Alert.alert("Không thể chia sẻ", e?.message || "Vui lòng thử lại.");
    }
  };

  return (
    <AppModal visible={visible} animationType="fade" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {visible ? (
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              initialScrollIndex={index}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              keyExtractor={(p: Photo) => p.id}
              showsHorizontalScrollIndicator={false}
              windowSize={3}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              onMomentumScrollEnd={(e) => onIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }: { item: Photo }) => (
                <ScrollView
                  style={{ width, height }}
                  contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
                  maximumZoomScale={4}
                  minimumZoomScale={1}
                  centerContent
                >
                  <ExpoImage
                    source={{ uri: item.full }}
                    placeholder={{ uri: item.thumb }}
                    style={{ width, height }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                </ScrollView>
              )}
            />
          ) : null}
          {/* safe-area-ok: SafeAreaView đọc inset bên trong modal */}
          <SafeAreaView edges={["top", "left", "right"]} style={styles.viewerTop}>
            <Text style={{ color: "rgba(255,255,255,0.85)", flex: 1 }} numberOfLines={1}>
              {index + 1}/{total} · {current?.name || ""}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Tìm ảnh người này" disabled={loadingFaces || searching} onPress={() => findPerson("search")} style={[styles.viewerBtn, { backgroundColor: "rgba(34,197,94,0.85)" }]}>
              {loadingFaces || searching ? <ActivityIndicator color="#fff" /> : <Ionicons name="scan" size={22} color="#fff" />}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Đây là ai?" disabled={loadingFaces || identifying} onPress={() => findPerson("identify")} style={[styles.viewerBtn, { backgroundColor: "rgba(20,102,242,0.85)" }]}>
              {identifying ? <ActivityIndicator color="#fff" /> : <Ionicons name="person-outline" size={22} color="#fff" />}
            </Pressable>
            {isAdmin ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Đặt làm ảnh đại diện VĐV" onPress={() => setAvatarOpen(true)} style={styles.viewerBtn}>
                <Ionicons name="person-circle-outline" size={22} color="#fff" />
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Chia sẻ ảnh" onPress={share} style={styles.viewerBtn}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Lưu ảnh" disabled={saving} onPress={save} style={styles.viewerBtn}>
              {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="download-outline" size={22} color="#fff" />}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={styles.viewerBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </SafeAreaView>
          {pickFaces && current ? (
            <Pressable style={styles.avatarOverlay} onPress={() => !searching && setPickFaces(null)}>
              {/* safe-area-ok: SafeAreaView đọc inset bên trong modal */}
              <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
                <Pressable style={[styles.avatarSheet, { backgroundColor: T.card, borderColor: T.border }]} onPress={() => {}}>
                  <Text style={[styles.avatarTitle, { color: T.text }]}>{pickMode === "identify" ? "Chọn người cần nhận diện" : "Chọn người cần tìm"}</Text>
                  <Text style={{ color: T.sub, fontSize: 13 }}>
                    Ảnh có {pickFaces.length} khuôn mặt — chạm vào người {pickMode === "identify" ? "bạn muốn biết là VĐV nào." : "bạn muốn tìm tất cả ảnh."}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                    {pickFaces.map((f: any) => (
                      <Pressable
                        key={f.index}
                        accessibilityRole="button"
                        accessibilityLabel={`Khuôn mặt ${f.index + 1}`}
                        disabled={searching}
                        onPress={async () => {
                          if (pickMode === "identify") return runIdentify(current.id, f);
                          await onFindPerson(current.id, f.index, f.thumb);
                          setPickFaces(null);
                        }}
                      >
                        <ExpoImage source={{ uri: f.thumb }} style={styles.faceThumb} contentFit="cover" />
                      </Pressable>
                    ))}
                  </View>
                  {searching ? <ActivityIndicator color={T.primary} /> : null}
                  <Pressable accessibilityRole="button" onPress={() => setPickFaces(null)} style={[styles.sheetBtn, { backgroundColor: T.field || T.border, alignSelf: "flex-end" }]}>
                    <Text style={{ color: T.text, fontWeight: "800" }}>Đóng</Text>
                  </Pressable>
                </Pressable>
              </SafeAreaView>
            </Pressable>
          ) : null}
          {who ? (
            <Pressable style={styles.avatarOverlay} onPress={() => !who.loading && setWho(null)}>
              {/* safe-area-ok: SafeAreaView đọc inset bên trong modal */}
              <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
                <Pressable style={[styles.avatarSheet, { backgroundColor: T.card, borderColor: T.border }]} onPress={() => {}}>
                  <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                    {who.face?.thumb ? <ExpoImage source={{ uri: who.face.thumb }} style={{ width: 52, height: 52, borderRadius: 26 }} contentFit="cover" /> : null}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.avatarTitle, { color: T.text }]}>Đây là ai?</Text>
                      <Text style={{ color: T.sub, fontSize: 12.5, lineHeight: 17 }}>
                        So với ảnh đại diện của VĐV đã đăng ký giải{who.candidates ? ` (${who.candidates} người)` : ""}.
                      </Text>
                    </View>
                  </View>
                  {who.loading ? (
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 8 }}>
                      <ActivityIndicator color={T.primary} />
                      <Text style={{ color: T.sub, flex: 1, fontSize: 13 }}>Đang so khuôn mặt… lần đầu có thể mất khoảng 30 giây.</Text>
                    </View>
                  ) : who.matches?.length ? (
                    <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
                      {who.matches.map((m: any) => (
                        <Pressable
                          key={m._id}
                          accessibilityRole="button"
                          onPress={() => {
                            setWho(null);
                            onClose();
                            setTimeout(() => router.push(`/profile/${m._id}` as any), 250);
                          }}
                          style={[styles.whoRow, { borderColor: m.likely ? "#22C55E" : T.border }]}
                        >
                          {m.avatar ? (
                            <ExpoImage source={{ uri: normalizeUrl(m.avatar) }} style={styles.whoAvatar} contentFit="cover" />
                          ) : (
                            <View style={[styles.whoAvatar, { backgroundColor: T.field || T.border, alignItems: "center", justifyContent: "center" }]}>
                              <Ionicons name="person" size={20} color={T.sub} />
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: T.text, fontWeight: "800" }} numberOfLines={1}>{m.nickname || m.name}</Text>
                            {m.nickname && m.name ? <Text style={{ color: T.sub, fontSize: 12.5 }} numberOfLines={1}>{m.name}</Text> : null}
                          </View>
                          <View style={[styles.whoBadge, { backgroundColor: m.likely ? "#22C55E" : T.field || T.border }]}>
                            <Text style={{ color: m.likely ? "#fff" : T.text, fontWeight: "800", fontSize: 12 }}>
                              {m.likely ? "Khớp" : "Có thể"} · {Math.round(m.similarity * 100)}%
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={{ color: T.sub, fontSize: 13, lineHeight: 18 }}>
                      Chưa tìm thấy VĐV nào có ảnh đại diện giống khuôn mặt này
                      {!who.complete ? " — hệ thống vẫn đang phân tích ảnh đại diện, hãy thử lại sau ít phút." : "."}
                    </Text>
                  )}
                  {!who.loading && who.matches?.length && !who.complete ? (
                    <Text style={{ color: T.sub, fontSize: 12 }}>Chưa so hết ảnh đại diện — thử lại sau ít phút để có kết quả đầy đủ.</Text>
                  ) : null}
                  <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
                    {!who.loading ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          const w = who;
                          setWho(null);
                          onFindPerson(w.fileId, w.face.index, w.face.thumb);
                        }}
                        style={[styles.sheetBtn, { backgroundColor: "#22C55E" }]}
                      >
                        <Text style={{ color: "#fff", fontWeight: "800" }}>Tìm ảnh người này</Text>
                      </Pressable>
                    ) : null}
                    <Pressable accessibilityRole="button" onPress={() => setWho(null)} style={[styles.sheetBtn, { backgroundColor: T.field || T.border }]}>
                      <Text style={{ color: T.text, fontWeight: "800" }}>Đóng</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </SafeAreaView>
            </Pressable>
          ) : null}
          {avatarOpen && current ? (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.avatarOverlay}>
              {/* safe-area-ok: SafeAreaView đọc inset bên trong modal */}
              <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, justifyContent: "flex-start" }}>
                <View style={[styles.avatarSheet, { backgroundColor: T.card, borderColor: T.border }]}>
                  <Text style={[styles.avatarTitle, { color: T.text }]}>Đặt làm ảnh đại diện VĐV</Text>
                  <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                    <ExpoImage source={{ uri: current.thumb }} style={{ width: 64, height: 64, borderRadius: 10 }} contentFit="cover" />
                    <Text style={{ flex: 1, color: T.sub, fontSize: 13, lineHeight: 18 }}>
                      Ảnh sẽ được tự cắt vuông quanh khuôn mặt của VĐV và thay ảnh đại diện hiện tại.
                    </Text>
                  </View>
                  <PlayerSelector label="Tìm vận động viên" appearance="tournament" placeholder="Tên / biệt danh / SĐT" onChange={setPlayer} />
                  {player?._id ? (
                    <Text style={{ color: T.text, fontWeight: "700" }}>Đã chọn: {player.nickname || player.name}</Text>
                  ) : null}
                  <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
                    <Pressable accessibilityRole="button" onPress={() => setAvatarOpen(false)} disabled={settingAvatar} style={[styles.sheetBtn, { backgroundColor: T.field || T.border }]}>
                      <Text style={{ color: T.text, fontWeight: "800" }}>Huỷ</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={confirmAvatar}
                      disabled={!player?._id || settingAvatar}
                      style={[styles.sheetBtn, { backgroundColor: player?._id ? "#1466F2" : "#9DB4D8" }]}
                    >
                      {settingAvatar ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800" }}>Đổi ảnh đại diện</Text>}
                    </Pressable>
                  </View>
                </View>
              </SafeAreaView>
            </KeyboardAvoidingView>
          ) : null}
        </View>
      </SafeAreaProvider>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 18, fontWeight: "800", lineHeight: 24 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "700", maxWidth: 220 },
  viewerTop: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 6 },
  viewerBtn: { backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 22, padding: 10 },
  faceBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1 },
  faceBack: { paddingHorizontal: 10, height: 38, justifyContent: "center" },
  avatarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  avatarSheet: { margin: 14, marginTop: 60, padding: 16, borderRadius: 18, borderWidth: 1, gap: 12 },
  avatarTitle: { fontSize: 17, fontWeight: "900", color: "#0B1B3A" },
  faceThumb: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: "#22C55E" },
  whoRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, borderWidth: 1 },
  whoAvatar: { width: 42, height: 42, borderRadius: 21 },
  whoBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  sheetBtn: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
