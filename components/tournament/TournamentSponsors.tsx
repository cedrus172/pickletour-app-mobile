import { useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/i18nText";
import { apiSlice } from "@/slices/apiSlice";
import { normalizeUrl } from "@/utils/normalizeUri";

type Sponsor = { _id: string; name: string; logoUrl?: string; description?: string; websiteUrl?: string; refLink?: string };
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
  const [width, setWidth] = useState(0);
  if (!Array.isArray(sponsors) || !sponsors.length) return null;
  const cardWidth = width > 0 ? Math.min(360, width - (sponsors.length > 1 ? 24 : 0)) : 250;
  return (
    <View style={{ marginHorizontal: 16, marginTop: 16, gap: 10 }}>
      <Text style={{ color: colors.title, fontSize: 17, fontWeight: "800" }}>Nhà tài trợ</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={sponsors.length > 1}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        snapToInterval={cardWidth + 10} decelerationRate="fast" contentContainerStyle={{ gap: 10 }}>
        {sponsors.map((sponsor) => {
          const candidate = String(sponsor.websiteUrl || sponsor.refLink || "").trim();
          const url = /^https?:\/\//i.test(candidate) ? candidate : null;
          return (
            <Pressable key={sponsor._id} disabled={!url} accessibilityRole={url ? "link" : undefined}
              onPress={() => { if (url) void Linking.openURL(url).catch(() => {}); }}
              style={{ width: cardWidth, flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 16 }}>
              {sponsor.logoUrl ? <Image source={{ uri: normalizeUrl(sponsor.logoUrl) }} contentFit="contain"
                style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: "#fff" }} /> : null}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.title, fontWeight: "800" }} numberOfLines={2}>{sponsor.name}</Text>
                {!!sponsor.description && <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={3}>{sponsor.description}</Text>}
              </View>
              {url && <Ionicons name="open-outline" size={17} color={colors.accent} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
