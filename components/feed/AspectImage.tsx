// components/feed/AspectImage.tsx — Ảnh feed tự đo aspect ratio thực để không
// crop mất nội dung. Backend upload không lưu width/height nên fallback aspect=1
// khiến ảnh panorama bị nén vào ô vuông + resizeMode cover cắt trung tâm — user
// chỉ thấy zoom vào giữa. Dùng Image.getSize ở runtime + cache theo URL để lần
// sau render tức thì.
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleProp, ImageStyle, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { sk } from "@/hooks/uiVersion";

const aspectCache = new Map<string, number>();

export function useImageAspect(
  url?: string | null,
  initialAspect?: number | null
): number {
  const initial = useMemo(() => {
    if (!url) return null;
    const cached = aspectCache.get(url);
    if (cached && cached > 0) return cached;
    if (initialAspect && initialAspect > 0) return initialAspect;
    return null;
  }, [url, initialAspect]);
  const [aspect, setAspect] = useState<number | null>(initial);

  useEffect(() => {
    if (!url) return;
    const cached = aspectCache.get(url);
    if (cached && cached > 0) {
      setAspect(cached);
      return;
    }
    if (aspect && aspect > 0) return;
    let cancelled = false;
    Image.getSize(
      url,
      (w, h) => {
        if (cancelled) return;
        if (w > 0 && h > 0) {
          const a = w / h;
          aspectCache.set(url, a);
          setAspect(a);
        }
      },
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [url, aspect]);

  return aspect && aspect > 0 ? aspect : initialAspect && initialAspect > 0 ? initialAspect : 1;
}

export function AspectImage({
  url,
  width,
  maxHeight = 480,
  minHeight = 120,
  initialAspect,
  borderRadius = 10,
  onPress,
  style,
  blurredBackground = false,
}: {
  url: string;
  width: number;
  maxHeight?: number;
  minHeight?: number;
  initialAspect?: number | null;
  borderRadius?: number;
  onPress?: () => void;
  style?: StyleProp<ImageStyle>;
  blurredBackground?: boolean;
}) {
  // Tỉ lệ ảnh lấy từ chính lần tải ảnh (onLoad của expo-image) thay vì Image.getSize — trước đây mỗi
  // ảnh bị tải 2 lần (1 lần đo kích thước, 1 lần hiển thị). Đã biết tỉ lệ thì lưu cache theo URL.
  const pickAspect = () => {
    const cached = url ? aspectCache.get(url) : undefined;
    if (cached && cached > 0) return cached;
    return initialAspect && initialAspect > 0 ? initialAspect : null;
  };
  const [loadedAspect, setLoadedAspect] = useState<number | null>(pickAspect);
  useEffect(() => {
    setLoadedAspect(pickAspect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, initialAspect]);
  const aspect = loadedAspect && loadedAspect > 0 ? loadedAspect : 1;
  const onLoad = (e: { source?: { width?: number; height?: number } }) => {
    const w = Number(e?.source?.width);
    const hh = Number(e?.source?.height);
    if (!(w > 0 && hh > 0) || !url) return;
    const next = w / hh;
    aspectCache.set(url, next);
    if (!loadedAspect || Math.abs(next - loadedAspect) > 0.01) setLoadedAspect(next);
  };
  const rawH = width / aspect;
  const h = Math.max(minHeight, Math.min(maxHeight, rawH));
  const img = (
    <View style={{ width, height: h, borderRadius, overflow: "hidden", backgroundColor: sk("#0b1220", "#E9F0FA") }}>
      {blurredBackground ? (
        <>
          <ExpoImage source={{ uri: url }} style={{ position: "absolute", width, height: h }} contentFit="cover" blurRadius={24} cachePolicy="memory-disk" recyclingKey={url} />
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)" }} />
        </>
      ) : null}
      <ExpoImage
        source={{ uri: url }}
        style={[{ width, height: h, borderRadius }, style] as any}
        contentFit="contain"
        cachePolicy="memory-disk"
        recyclingKey={url}
        transition={120}
        onLoad={onLoad}
      />
    </View>
  );
  if (onPress) {
    return <Pressable onPress={onPress}>{img}</Pressable>;
  }
  return img;
}
