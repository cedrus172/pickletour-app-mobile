import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Linking, Pressable, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import { apiSlice } from "@/slices/apiSlice";
import { normalizeUrl } from "@/utils/normalizeUri";

type Sponsor = { _id: string; name: string; logoUrl?: string; description?: string; websiteUrl?: string; refLink?: string };
const SLIDE_DELAY = 6000;
const sponsorsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    tournamentSponsors: builder.query<{ items: Sponsor[] }, string>({
      query: (tournamentId) => ({ url: "/api/sponsors", params: { tournamentId } }),
    }),
  }),
});

export default function TournamentSponsors({ id, colors }: {
  id: string;
  colors: { card: string; border: string; title: string; muted: string; accent: string };
}) {
  const { currentData } = sponsorsApi.useTournamentSponsorsQuery(id, { skip: !id });
  const sponsors = currentData?.items;
  const rail = useRef<ScrollView>(null);
  const activeSlide = useRef(0);
  const lastInteraction = useRef(0);
  const dragging = useRef(false);
  const [width, setWidth] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const count = sponsors?.length || 0;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReducedMotion(enabled);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (count < 2 || !width || paused || reducedMotion) return;
    const timer = setInterval(() => {
      if (dragging.current || Date.now() - lastInteraction.current < SLIDE_DELAY) return;
      const next = (activeSlide.current + 1) % count;
      rail.current?.scrollTo({ x: next * width, animated: next !== 0 });
    }, SLIDE_DELAY);
    return () => clearInterval(timer);
  }, [count, width, paused, reducedMotion, id]);

  if (!sponsors?.length) return null;
  const logoWidth = Math.min(156, Math.max(102, width * 0.37));

  return (
    <View style={{ marginHorizontal: 16, marginTop: 16, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text accessibilityRole="header" style={{ color: colors.title, fontSize: 17, fontWeight: "800", flexShrink: 1 }}>Nhà tài trợ</Text>
        {count > 1 && !reducedMotion && (
          <Pressable accessibilityRole="button"
            accessibilityLabel={paused ? "Bật tự chuyển nhà tài trợ" : "Tạm dừng tự chuyển nhà tài trợ"}
            onPress={() => setPaused((value) => !value)}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
            <Ionicons name={paused ? "play" : "pause"} size={17} color={colors.accent} />
          </Pressable>
        )}
      </View>
      <ScrollView ref={rail} horizontal scrollEnabled={count > 1} showsHorizontalScrollIndicator={count > 1}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        snapToInterval={width || undefined} decelerationRate="fast" scrollEventThrottle={32}
        onScroll={(event) => {
          if (width) activeSlide.current = Math.max(0, Math.min(count - 1, Math.round(event.nativeEvent.contentOffset.x / width)));
        }}
        onScrollBeginDrag={() => {
          dragging.current = true;
          lastInteraction.current = Date.now();
        }}
        onScrollEndDrag={() => {
          dragging.current = false;
          lastInteraction.current = Date.now();
        }}>
        {sponsors.map((sponsor) => {
          const candidate = String(sponsor.websiteUrl || sponsor.refLink || "").trim();
          const url = /^https?:\/\//i.test(candidate) ? candidate : null;
          return (
            <Pressable key={sponsor._id} disabled={!url} accessibilityRole={url ? "link" : undefined}
              onPress={() => { if (url) void Linking.openURL(url).catch(() => {}); }}
              style={{ width: width || 250, flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 16 }}>
              {sponsor.logoUrl ? <Image source={{ uri: normalizeUrl(sponsor.logoUrl) }} contentFit="contain"
                style={{ width: logoWidth, height: Math.round(logoWidth * 0.58), borderRadius: 8, backgroundColor: "#fff" }} /> : null}
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text style={{ color: colors.title, fontWeight: "800" }} numberOfLines={2}>{sponsor.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={3}>{sponsor.description?.trim() || "Đơn vị tài trợ giải đấu"}</Text>
              </View>
              {url && <Ionicons name="open-outline" size={17} color={colors.accent} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
