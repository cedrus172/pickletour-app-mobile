import React, { memo, type ReactNode } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type FlatListProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { G, Path } from "react-native-svg";

import { Text } from "@/components/ui/i18nText";
import { TextInput } from "@/components/ui/i18nTextInput";
import { normalizeUrl } from "@/utils/normalizeUri";
import { tournamentDateLabel, tournamentDateParts } from "@/utils/tournamentPresentation";
import { NotificationHeaderActions } from "@/components/GlobalNotificationShell";

export const TOURNAMENT_COLORS = {
  background: "#041021",
  backgroundAlt: "#051A2D",
  surface: "#071D31",
  surfaceStrong: "#082139",
  primary: "#08CDF5",
  secondary: "#1677FF",
  success: "#22D879",
  text: "#FFFFFF",
  textSoft: "#DCEBFA",
  textMuted: "#91AECE",
  border: "rgba(80,170,230,0.25)",
} as const;

export type TournamentFilterKey = "upcoming" | "ongoing" | "finished";
export type TournamentAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  warning?: boolean;
};

export const TournamentPage = memo(function TournamentPage({ children }: { children: ReactNode }) {
  return (
    <LinearGradient colors={[TOURNAMENT_COLORS.background, TOURNAMENT_COLORS.backgroundAlt]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.page}>
      {children}
    </LinearGradient>
  );
});

export const TournamentHeader = memo(function TournamentHeader({ isBack, onBack }: { isBack?: boolean; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      <Svg pointerEvents="none" width={118} height={94} viewBox="0 0 118 94" style={styles.heroArtwork} accessible={false} focusable={false}>
        <G stroke="#08CDF5" fill="none">
          <Path d="m6 93 89-89M24 94 111 7M48 94l69-69" strokeWidth={7} opacity={0.06} />
          <Path d="M68 22h27v15c0 11-5 17-13.5 17S68 48 68 37Zm0 4H57v6c0 11 7 15 14 15m24-21h11v6c0 11-7 15-14 15M82 54v14m-10 5h20v5H72Z" strokeWidth={2.4} strokeLinejoin="round" />
        </G>
      </Svg>
      <View style={styles.headerTitleRow}>
        {isBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
          </Pressable>
        ) : null}
        <Text accessibilityRole="header" style={styles.title}>Giải đấu</Text>
        <View style={{ marginLeft: "auto", paddingLeft: 8 }}><NotificationHeaderActions /></View>
      </View>
      <Text style={styles.subtitle}>Tìm giải đấu, chinh phục thử thách</Text>
    </View>
  );
});

export const TournamentSearch = memo(function TournamentSearch({ value, onChangeText, onClear, onFilter }: {
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
  onFilter?: () => void;
}) {
  return (
    <View style={styles.search}>
      <Ionicons name="search-outline" size={23} color="#A0BEDF" />
      <TextInput testID="tournament-search" accessibilityLabel="Tìm kiếm giải đấu" value={value} onChangeText={onChangeText} returnKeyType="search" placeholder="Tìm kiếm giải đấu..." placeholderTextColor={TOURNAMENT_COLORS.textMuted} style={styles.searchInput} />
      {value.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" onPress={onClear} style={styles.searchClear}>
          <Ionicons name="close-circle" size={19} color={TOURNAMENT_COLORS.textMuted} />
        </Pressable>
      ) : null}
      {onFilter ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Lọc theo ngày" onPress={onFilter} style={styles.searchFilter}>
          <Ionicons name="options-outline" size={22} color="#A0BEDF" />
        </Pressable>
      ) : null}
    </View>
  );
});

const FILTERS: { key: TournamentFilterKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "upcoming", label: "Sắp diễn ra", icon: "calendar-outline" },
  { key: "ongoing", label: "Đang diễn ra", icon: "play-circle-outline" },
  { key: "finished", label: "Đã kết thúc", icon: "trophy-outline" },
];

export const TournamentFilters = memo(function TournamentFilters({ active, onChange }: { active: TournamentFilterKey; onChange: (key: TournamentFilterKey) => void }) {
  return (
    <View style={styles.filters}>
      {FILTERS.map((filter, index) => {
        const selected = filter.key === active;
        return (
          <Pressable key={filter.key} testID={`tournament-filter-${filter.key}`} accessibilityRole="tab" accessibilityState={{ selected }} aria-selected={selected} onPress={() => onChange(filter.key)} style={({ pressed }) => [styles.filterPressable, pressed && styles.pressed]}>
            <View style={[styles.filterContent, index < FILTERS.length - 1 && styles.filterDivider]}>
              <Ionicons name={filter.icon} size={17} color={selected ? TOURNAMENT_COLORS.primary : TOURNAMENT_COLORS.textMuted} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.filterText, selected && styles.filterTextActive]}>{filter.label}</Text>
            </View>
            {selected ? <View style={styles.filterUnderline} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
});

export const DateFilter = memo(function DateFilter({ label, active, onPress, onClear }: { label: string; active: boolean; onPress: () => void; onClear?: () => void }) {
  return (
    <View style={styles.dateFilterRow}>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.dateFilter, pressed && styles.pressed]}>
        <Ionicons name="calendar-outline" size={18} color={active ? TOURNAMENT_COLORS.primary : TOURNAMENT_COLORS.textMuted} />
        <Text numberOfLines={1} style={[styles.dateFilterText, active && styles.filterTextActive]}>{label}</Text>
      </Pressable>
      {active && onClear ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Xóa lọc theo ngày" onPress={onClear} style={styles.dateClear}>
          <Ionicons name="close-circle" size={19} color={TOURNAMENT_COLORS.primary} />
        </Pressable>
      ) : null}
    </View>
  );
});

export const TournamentCard = memo(function TournamentCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient colors={["#082139", "#051B2D"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, style]}>
      {children}
    </LinearGradient>
  );
});

const STATUS_TONES: Record<string, { color: string; label: string }> = {
  upcoming: { color: "#08CDF5", label: "Sắp diễn ra" },
  ongoing: { color: "#22D879", label: "Đang diễn ra" },
  finished: { color: "#22D879", label: "Đã kết thúc" },
};

export const TournamentStatus = memo(function TournamentStatus({ status }: { status?: string }) {
  const tone = STATUS_TONES[status || "finished"] || STATUS_TONES.finished;
  return <View style={styles.statusBadge}><View style={[styles.statusDot, { backgroundColor: tone.color }]} /><Text style={styles.statusText}>{tone.label}</Text></View>;
});

export const TournamentCover = memo(function TournamentCover({ image, title, status, mode, startDate, onPress, onPressImage }: {
  image?: string | null;
  title: string;
  status?: string;
  mode?: string;
  startDate?: string | Date | null;
  onPress: () => void;
  onPressImage?: () => void;
}) {
  const normalizedMode = String(mode || "").toLowerCase();
  const date = tournamentDateParts(startDate);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`Xem ảnh ${title}`} testID="tournament-cover" onPress={onPressImage || onPress} style={({ pressed }) => pressed && styles.coverPressed}>
        <View style={styles.cover}>
          <ExpoImage source={{ uri: normalizeUrl(image) || "https://dummyimage.com/1200x675/081b33/8faac8&text=Pickletour" }} style={styles.coverImage} contentFit="cover" contentPosition="center" cachePolicy="memory-disk" />
          <LinearGradient pointerEvents="none" colors={["rgba(4,16,33,0)", "rgba(4,16,33,0.12)"]} style={StyleSheet.absoluteFill} />
          <TournamentStatus status={status} />
          {normalizedMode === "mlp" || normalizedMode === "team" ? (
            <View style={styles.modeBadge}><MaterialCommunityIcons name={normalizedMode === "mlp" ? "trophy-award" : "account-group-outline"} size={14} color="#FFE071" /><Text style={styles.modeText}>{normalizedMode === "mlp" ? "MLP" : "Đồng đội"}</Text></View>
          ) : null}
          {date ? <View style={styles.dateBadge} testID="tournament-date-badge"><Text style={styles.dateDay}>{date.day}</Text><Text style={styles.dateMonth}>TH{date.month}</Text></View> : null}
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.titlePressable, pressed && styles.pressed]}>
        <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
      </Pressable>
    </>
  );
});

export const TournamentInfo = memo(function TournamentInfo({ date, location, registration, contentCount, startDate, endDate }: {
  date: string;
  location: string;
  registration: string;
  contentCount?: number;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}) {
  const [venue, ...address] = location.split(/\s*[•·]\s*/);
  const area = address.join(" · ").split(",").slice(-2).map((part) => part.trim()).join(", ");
  return (
    <View style={styles.info}>
      <View style={styles.infoFields}>
        <View style={[styles.infoField, styles.dateField]}><Ionicons name="calendar-outline" size={20} color={TOURNAMENT_COLORS.primary} /><Text style={styles.dateValue}>{tournamentDateLabel(startDate, endDate) || date}</Text></View>
        <View style={[styles.infoField, styles.locationField]} accessible accessibilityLabel={location}>
          <Ionicons name="location" size={20} color={TOURNAMENT_COLORS.primary} />
          <View style={styles.locationCopy}><Text style={styles.locationValue} numberOfLines={2}>{venue}</Text>{area ? <Text style={styles.locationArea} numberOfLines={2}>{area}</Text> : null}</View>
        </View>
      </View>
      <View style={styles.infoSummary}>
        {typeof contentCount === "number" ? <><View style={styles.summaryItem}><Ionicons name="people-outline" size={16} color={TOURNAMENT_COLORS.textMuted} /><Text style={styles.summaryText}>{contentCount} nội dung</Text></View><View style={styles.summaryDivider} /></> : null}
        <View style={styles.summaryItem}><Ionicons name="people" size={16} color={TOURNAMENT_COLORS.textMuted} /><Text style={styles.summaryText}>{registration}</Text></View>
      </View>
    </View>
  );
});

function TournamentActionButton({ action }: { action: TournamentAction }) {
  return (
    <Pressable accessibilityRole="button" testID={`tournament-action-${action.key}`} onPress={action.onPress} style={({ pressed }) => [styles.actionPressable, pressed && styles.pressed]}>
      {action.primary ? (
        <LinearGradient colors={action.warning ? ["#FFB547", "#F59E0B"] : ["#11D3F3", "#00C3E8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionPrimary}>
          <Ionicons name={action.icon} size={18} color="#031526" /><Text style={styles.actionTextPrimary}>{action.label}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.actionSecondary}><Ionicons name={action.icon} size={16} color={TOURNAMENT_COLORS.textMuted} /><Text style={styles.actionText}>{action.label}</Text></View>
      )}
    </Pressable>
  );
}

export const TournamentActions = memo(function TournamentActions({ actions }: { actions: TournamentAction[] }) {
  if (!actions.length) return null;
  return <View style={styles.actions}>{actions.map((action) => <TournamentActionButton key={action.key} action={action} />)}</View>;
});

export const TournamentEventRow = memo(function TournamentEventRow({ id, title, kind, registered, capacity, actions, onDetails }: {
  id: string;
  title: string;
  kind: string;
  registered: number;
  capacity: number;
  actions: TournamentAction[];
  onDetails: () => void;
}) {
  const full = capacity > 0 && registered >= capacity;
  const pct = capacity > 0 ? Math.max(0, Math.min(100, (registered / capacity) * 100)) : 0;
  return (
    <View style={styles.eventRow} testID={`tournament-event-${id}`}>
      <View style={styles.eventHeading}>
        <Pressable accessibilityRole="button" onPress={onDetails} style={styles.eventTitleTouch}>
          <Text style={styles.eventTitle}>{title}</Text>
          <View style={styles.eventKindRow}><Text style={styles.eventKind}>{kind}</Text>{full ? <Text style={styles.fullLabel}>Đã đầy</Text> : null}</View>
        </Pressable>
        <Text style={styles.capacity}><Text style={full ? styles.capacityFull : styles.capacityCurrent}>{registered}</Text>{capacity > 0 ? `/${capacity}` : ""}<Text style={styles.capacityUnit}> {kind === "Đấu đơn" ? "VĐV" : "đội"}</Text></Text>
      </View>
      {capacity > 0 ? <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: capacity, now: Math.min(registered, capacity) }} aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={Math.min(registered, capacity)} style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: full ? "#FF7781" : TOURNAMENT_COLORS.primary }]} /></View> : null}
      <View style={styles.eventActions}>
        {actions.map((action) => <TournamentActionButton key={action.key} action={action} />)}
        <Pressable accessibilityRole="button" accessibilityLabel={`Chi tiết ${title}`} onPress={onDetails} style={({ pressed }) => [styles.details, pressed && styles.pressed]}><Text style={styles.detailsText}>Chi tiết</Text><Ionicons name="chevron-forward" size={18} color={TOURNAMENT_COLORS.textMuted} /></Pressable>
      </View>
    </View>
  );
});

export const ZaloButton = memo(function ZaloButton({ onPress }: { onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Nhóm Zalo" onPress={onPress} style={({ pressed }) => [styles.zaloButton, pressed && styles.pressed]}><View style={styles.zaloMark}><Text style={styles.zaloMarkText}>Zalo</Text></View><Text style={styles.zaloText}>Nhóm Zalo</Text><Ionicons name="chevron-forward" size={20} color={TOURNAMENT_COLORS.textMuted} /></Pressable>;
});

export const TournamentList = React.forwardRef<FlatList<any>, FlatListProps<any>>(function TournamentList(props, ref) {
  return <FlatList ref={ref} {...props} />;
});

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { minHeight: 90, paddingTop: 5, paddingBottom: 10, justifyContent: "center" },
  heroArtwork: { position: "absolute", top: 0, right: 48 },
  headerTitleRow: { flexDirection: "row", alignItems: "center" },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: 4 },
  title: { color: "#FFFFFF", fontSize: 34, lineHeight: 43, fontWeight: "900", letterSpacing: -0.9 },
  subtitle: { color: TOURNAMENT_COLORS.textMuted, fontSize: 13, lineHeight: 19, marginTop: 2, paddingRight: 35 },
  search: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9, paddingLeft: 14, borderRadius: 12, borderWidth: 1, borderColor: "#285171", backgroundColor: "#061B30", marginBottom: 10 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 48, paddingVertical: 8, color: TOURNAMENT_COLORS.text, fontSize: 14.5 },
  searchClear: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  searchFilter: { width: 48, minHeight: 44, borderLeftWidth: 1, borderLeftColor: "#163C57", alignItems: "center", justifyContent: "center" },
  filters: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#204661" },
  filterPressable: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: "center", paddingVertical: 8 },
  filterContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 5 },
  filterDivider: { borderRightWidth: 1, borderRightColor: "#173A52" },
  filterText: { color: TOURNAMENT_COLORS.textMuted, fontSize: 13, fontWeight: "600", flexShrink: 1 },
  filterTextActive: { color: TOURNAMENT_COLORS.primary, fontWeight: "800" },
  filterUnderline: { position: "absolute", bottom: -1, left: 0, right: 8, height: 2.5, backgroundColor: TOURNAMENT_COLORS.primary, borderRadius: 2 },
  dateFilterRow: { flexDirection: "row", alignSelf: "flex-end", maxWidth: "100%", alignItems: "center", marginBottom: 3 },
  dateFilter: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7, maxWidth: "100%", flexShrink: 1 },
  dateFilterText: { color: TOURNAMENT_COLORS.textMuted, fontSize: 13, flexShrink: 1 },
  dateClear: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 17, overflow: "hidden" },
  cover: { position: "relative", width: "100%", aspectRatio: 2.55, backgroundColor: "#081B33" },
  coverImage: { width: "100%", height: "100%" },
  coverPressed: { opacity: 0.92 },
  statusBadge: { position: "absolute", top: 10, left: 10, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 18, backgroundColor: "rgba(2,11,28,0.78)" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  modeBadge: { position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 14, backgroundColor: "rgba(35,26,2,0.8)" },
  modeText: { color: "#FFE071", fontSize: 11, fontWeight: "800" },
  dateBadge: { position: "absolute", bottom: 5, left: 12, minWidth: 48, alignItems: "center", paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: "#276486", borderLeftWidth: 3, borderLeftColor: TOURNAMENT_COLORS.primary, borderRadius: 7, backgroundColor: "#071F34" },
  dateDay: { color: "#FFFFFF", fontSize: 24, lineHeight: 28, fontWeight: "900" },
  dateMonth: { color: "#A0BEDF", fontSize: 10, lineHeight: 13, fontWeight: "700" },
  titlePressable: { paddingHorizontal: 14, paddingTop: 13, paddingBottom: 9 },
  cardTitle: { color: "#FFFFFF", fontSize: 24, lineHeight: 29, fontWeight: "900", letterSpacing: -0.4, textTransform: "uppercase" },
  info: { paddingHorizontal: 14, paddingBottom: 11 },
  infoFields: { flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 8 },
  infoField: { flexDirection: "row", alignItems: "flex-start", gap: 7, flexGrow: 1, minWidth: 0 },
  dateField: { flexBasis: 145 },
  locationField: { flexBasis: 175, flexShrink: 1 },
  dateValue: { flex: 1, color: TOURNAMENT_COLORS.textSoft, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  locationCopy: { flex: 1, minWidth: 0 },
  locationValue: { color: TOURNAMENT_COLORS.textSoft, fontSize: 11.5, lineHeight: 16, fontWeight: "700" },
  locationArea: { color: TOURNAMENT_COLORS.textMuted, fontSize: 11, lineHeight: 15, marginTop: 1 },
  infoSummary: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 10 },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  summaryText: { color: TOURNAMENT_COLORS.textMuted, fontSize: 12, lineHeight: 17 },
  summaryDivider: { width: 1, height: 15, backgroundColor: "#25465D" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 14, paddingBottom: 8 },
  actionPressable: { minHeight: 44 },
  actionPrimary: { minHeight: 44, paddingHorizontal: 15, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10 },
  actionSecondary: { minHeight: 44, paddingHorizontal: 6, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  actionTextPrimary: { color: "#031526", fontSize: 13.5, lineHeight: 18, fontWeight: "800" },
  actionText: { color: TOURNAMENT_COLORS.textMuted, fontSize: 12.5, lineHeight: 18, fontWeight: "600" },
  eventRow: { marginHorizontal: 14, paddingHorizontal: 6, paddingTop: 12, paddingBottom: 11, borderTopWidth: 1, borderTopColor: "#21475F" },
  eventHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventTitleTouch: { flex: 1, minHeight: 44, minWidth: 0, justifyContent: "center" },
  eventTitle: { color: "#FFFFFF", fontSize: 16, lineHeight: 21, fontWeight: "800" },
  eventKindRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  eventKind: { color: TOURNAMENT_COLORS.textMuted, fontSize: 11.5, lineHeight: 16 },
  fullLabel: { color: "#FF8891", fontSize: 11.5, lineHeight: 16, fontWeight: "700" },
  capacity: { color: "#BCD2EB", fontSize: 14, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  capacityCurrent: { color: TOURNAMENT_COLORS.primary, fontWeight: "900", fontSize: 16 },
  capacityFull: { color: "#FF8891", fontWeight: "900", fontSize: 16 },
  capacityUnit: { color: TOURNAMENT_COLORS.textMuted, fontSize: 11, fontWeight: "500" },
  track: { height: 5, borderRadius: 3, backgroundColor: "#203C52", overflow: "hidden", marginTop: 8, marginBottom: 8 },
  fill: { height: "100%", borderRadius: 3 },
  eventActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  details: { marginLeft: "auto", minHeight: 44, paddingLeft: 6, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  detailsText: { color: "#A3BFE0", fontSize: 13, lineHeight: 18, fontWeight: "600" },
  zaloButton: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#21475F" },
  zaloMark: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#168AFF" },
  zaloMarkText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900", letterSpacing: -0.4 },
  zaloText: { flex: 1, color: "#FFFFFF", fontSize: 14, lineHeight: 19, fontWeight: "700" },
  pressed: { opacity: 0.78 },
});
