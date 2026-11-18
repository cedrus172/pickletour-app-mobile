// app/tournament/[id]/album.tsx — Album ảnh giải đấu (ảnh lấy từ thư mục Google Drive BTC gắn vào giải).
// Lưới ảnh nhỏ tải dần → chạm xem toàn màn, vuốt qua lại → lưu ảnh gốc vào thư viện / chia sẻ.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/i18nText";
import AppModal from "@/components/ui/AppModal";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import {
  useGetTournamentAlbumsQuery,
  useGetTournamentQuery,
  useLazyGetTournamentAlbumPhotosQuery,
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

  const hasMore = !!info && page < info.pages;
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
          data={photos}
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
              {albums.length > 1 ? (
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
              {rootFolders.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {rootHasPhotos ? (
                    <Chip C={C} icon="images-outline" label="Chung" active={!folder} onPress={() => setFolder("")} />
                  ) : null}
                  {rootFolders.map((f) => (
                    <Chip key={f.id} C={C} icon="folder-outline" label={f.name} active={folder === f.id} onPress={() => setFolder(f.id)} />
                  ))}
                </ScrollView>
              ) : null}
              <Text style={{ color: C.sub, fontSize: 13 }}>
                {info ? `${info.folder?.name ? `${info.folder.name} · ` : ""}${info.total} ảnh` : " "}
              </Text>
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
        photos={photos}
        index={viewer}
        total={info?.total || photos.length}
        width={width}
        height={height}
        onIndex={(i: number) => {
          setViewer(i);
          if (i >= photos.length - 3) loadMore();
        }}
        onClose={() => setViewer(-1)}
      />
    </View>
  );
}

function PhotoViewer({ photos, index, total, width, height, onIndex, onClose }: any) {
  const [saving, setSaving] = useState(false);
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
      if (res.status < 200 || res.status >= 300) throw new Error("Không tải được ảnh gốc.");
      if (MediaLibrary?.saveToLibraryAsync) {
        const perm = await MediaLibrary.requestPermissionsAsync(true);
        if (!perm.granted) {
          Alert.alert("Cần quyền truy cập Ảnh", "Hãy cho phép PickleTour lưu ảnh trong phần Cài đặt.");
          return;
        }
        await MediaLibrary.saveToLibraryAsync(res.uri);
        Alert.alert("Đã lưu", "Ảnh gốc đã được lưu vào thư viện ảnh.");
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri, { dialogTitle: "Lưu hoặc chia sẻ ảnh" });
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
            <Pressable accessibilityRole="button" accessibilityLabel="Chia sẻ ảnh" onPress={share} style={styles.viewerBtn}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Lưu ảnh gốc" disabled={saving} onPress={save} style={styles.viewerBtn}>
              {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="download-outline" size={22} color="#fff" />}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={styles.viewerBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </SafeAreaView>
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
});
