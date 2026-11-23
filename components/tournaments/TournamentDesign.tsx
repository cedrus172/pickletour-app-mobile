import React, { memo, useState, type ReactNode } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
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
import { IS_V3_LIGHT, sk } from "@/hooks/uiVersion";

const TOURNAMENT_COLORS_V2 = {
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

type TournamentColors = { [K in keyof typeof TOURNAMENT_COLORS_V2]: string };

// V3 Fresh: cùng bộ khoá màu nhưng trên nền sáng.
const TOURNAMENT_COLORS_V3: TournamentColors = {
  background: "#F7FAFF",
  backgroundAlt: "#EEF4FC",
  surface: "#FFFFFF",
  surfaceStrong: "#FFFFFF",
  primary: "#1466F2",
  secondary: "#2F8BFF",
  success: "#16A34A",
  text: "#0B1B3A",
  textSoft: "#243450",
  textMuted: "#5F6F8A",
  border: "rgba(16,42,92,0.10)",
};

export const TOURNAMENT_COLORS: TournamentColors = IS_V3_LIGHT ? TOURNAMENT_COLORS_V3 : TOURNAMENT_COLORS_V2;

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

export const TournamentHeader = memo(function TournamentHeader({ isBack, onBack, onOrganize }: { isBack?: boolean; onBack?: () => void; onOrganize?: () => void }) {
  // Màn hẹp (điện thoại nhỏ, Z Fold lúc gập): nút "Tổ chức giải" chỉ còn biểu tượng để không đè tiêu đề và chuông
  const { width: winW } = useWindowDimensions();
  const compact = winW < 340;
  return (
    <View style={styles.header}>
      {onOrganize ? null : (
      <Svg pointerEvents="none" width={118} height={94} viewBox="0 0 118 94" style={styles.heroArtwork} accessible={false} focusable={false}>
        <G stroke={sk("#08CDF5", "#1466F2")} fill="none">
          <Path d="m6 93 89-89M24 94 111 7M48 94l69-69" strokeWidth={7} opacity={0.06} />
          <Path d="M68 22h27v15c0 11-5 17-13.5 17S68 48 68 37Zm0 4H57v6c0 11 7 15 14 15m24-21h11v6c0 11-7 15-14 15M82 54v14m-10 5h20v5H72Z" strokeWidth={2.4} strokeLinejoin="round" />
        </G>
      </Svg>
      )}
      <View style={styles.headerTitleRow}>
        {isBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={23} color={sk("#FFFFFF", "#0B1B3A")} />
          </Pressable>
        ) : null}
        <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { flexShrink: 1 }]}>Giải đấu</Text>
        <View style={{ marginLeft: "auto", paddingLeft: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
          {onOrganize ? (
            // Mockup docs/mockups/to-chuc-giai-1-nut-A.png: nút "Tổ chức giải" cạnh chuông
            <Pressable testID="tournament-organize" accessibilityRole="button" accessibilityLabel="Tổ chức giải đấu cùng PickleTour" onPress={onOrganize} style={({ pressed }) => [styles.organizeWrap, pressed && styles.pressed]}>
              <LinearGradient colors={[TOURNAMENT_COLORS.primary, TOURNAMENT_COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.organizeBtn}>
                <View>
                  <Ionicons name="trophy-outline" size={18} color="#FFFFFF" />
                  <View style={styles.organizePlus}><Ionicons name="add" size={9} color={TOURNAMENT_COLORS.secondary} /></View>
                </View>
                {compact ? null : <Text numberOfLines={1} style={styles.organizeText}>Tổ chức giải</Text>}
              </LinearGradient>
            </Pressable>
          ) : null}
          <NotificationHeaderActions />
        </View>
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
      <Ionicons name="search-outline" size={23} color={sk("#A0BEDF", "#5F6F8A")} />
      <TextInput testID="tournament-search" accessibilityLabel="Tìm kiếm giải đấu" value={value} onChangeText={onChangeText} returnKeyType="search" placeholder="Tìm kiếm giải đấu..." placeholderTextColor={TOURNAMENT_COLORS.textMuted} style={styles.searchInput} />
      {value.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" onPress={onClear} style={styles.searchClear}>
          <Ionicons name="close-circle" size={19} color={TOURNAMENT_COLORS.textMuted} />
        </Pressable>
      ) : null}
      {onFilter ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Lọc theo ngày" onPress={onFilter} style={styles.searchFilter}>
          <Ionicons name="options-outline" size={22} color={sk("#A0BEDF", "#5F6F8A")} />
        </Pressable>
      ) : null}
    </View>
  );
});

export type TournamentKind = "tournament" | "minigame";

const KINDS: { key: TournamentKind; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { key: "tournament", label: "Giải đấu", icon: "trophy-outline" },
  { key: "minigame", label: "Minigame", icon: "gamepad-variant-outline" },
];

/** Công tắc hai nửa đầu tab Giải đấu: giải chính thức ↔ minigame (giải nhỏ, không tính điểm trình). */
export const TournamentKindSwitch = memo(function TournamentKindSwitch({ active, onChange, liveCount = 0 }: { active: TournamentKind; onChange: (key: TournamentKind) => void; liveCount?: number }) {
  return (
    <View style={styles.kindWrap}>
      <View style={styles.kindSwitch}>
        {KINDS.map((kind) => {
          const selected = kind.key === active;
          const color = selected ? "#FFFFFF" : TOURNAMENT_COLORS.textMuted;
          return (
            <Pressable key={kind.key} testID={`tournament-kind-${kind.key}`} accessibilityRole="tab" accessibilityState={{ selected }} aria-selected={selected} onPress={() => onChange(kind.key)} style={({ pressed }) => [styles.kindItem, pressed && styles.pressed]}>
              {selected ? <LinearGradient colors={[TOURNAMENT_COLORS.primary, TOURNAMENT_COLORS.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
              <MaterialCommunityIcons name={kind.icon} size={19} color={color} />
              <Text numberOfLines={1} style={[styles.kindText, { color }, selected && styles.kindTextActive]}>{kind.label}</Text>
              {kind.key === "minigame" && liveCount > 0 ? (
                <View style={styles.kindBadge}><Text style={styles.kindBadgeText}>{liveCount > 9 ? "9+" : liveCount}</Text></View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {active === "minigame" ? (
        <View style={styles.kindHint}>
          <Ionicons name="information-circle" size={16} color={TOURNAMENT_COLORS.primary} />
          <Text style={styles.kindHintText}>Giải nhỏ · Kết quả không tính điểm trình</Text>
        </View>
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

const SHORT_TABS: { key: TournamentFilterKey; label: string }[] = [
  { key: "upcoming", label: "Sắp" },
  { key: "ongoing", label: "Đang" },
  { key: "finished", label: "Đã xong" },
];

/** Hàng tab gọn (mockup docs/mockups/giai-dau-loc-1.png): Sắp / Đang / Đã xong kèm số giải + một nút lọc (tìm kiếm + lọc). */
export const TournamentTabsBar = memo(function TournamentTabsBar({ active, onChange, counts, filterActive, onFilter }: {
  active: TournamentFilterKey;
  onChange: (key: TournamentFilterKey) => void;
  counts: Partial<Record<TournamentFilterKey, number>>;
  filterActive?: boolean;
  onFilter: () => void;
}) {
  return (
    <View style={styles.tabsBar}>
      {SHORT_TABS.map((t) => {
        const selected = t.key === active;
        const n = counts[t.key] ?? 0;
        return (
          <Pressable key={t.key} testID={`tournament-filter-${t.key}`} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onChange(t.key)} style={({ pressed }) => [styles.tabsItem, pressed && styles.pressed]}>
            <View style={styles.tabsItemRow}>
              <Text numberOfLines={1} style={[styles.tabsText, selected && styles.filterTextActive]}>{t.label}</Text>
              <View style={styles.tabsCount}><Text style={styles.tabsCountText}>{n > 999 ? "999+" : n}</Text></View>
            </View>
            {selected ? <View style={styles.tabsUnderline} /> : null}
          </Pressable>
        );
      })}
      <Pressable testID="tournament-filter-open" accessibilityRole="button" accessibilityLabel="Tìm và lọc giải đấu" onPress={onFilter} style={({ pressed }) => [styles.tabsFilterBtn, pressed && styles.pressed]}>
        <Ionicons name="options-outline" size={21} color={filterActive ? TOURNAMENT_COLORS.primary : TOURNAMENT_COLORS.textMuted} />
        {filterActive ? <View style={styles.tabsFilterDot} /> : null}
      </Pressable>
    </View>
  );
});

/** Chip các lọc đang bật dưới hàng tab, bấm ✕ để bỏ từng lọc. */
export const ActiveFilterChips = memo(function ActiveFilterChips({ chips }: { chips: { key: string; label: string; onRemove: () => void }[] }) {
  if (!chips.length) return null;
  return (
    <View style={styles.chipsRow}>
      {chips.map((c) => (
        <Pressable key={c.key} accessibilityRole="button" accessibilityLabel={`Bỏ lọc ${c.label}`} onPress={c.onRemove} style={({ pressed }) => [styles.activeChip, pressed && styles.pressed]}>
          <Text numberOfLines={1} style={styles.activeChipText}>{c.label}</Text>
          <Ionicons name="close" size={14} color={TOURNAMENT_COLORS.textMuted} />
        </Pressable>
      ))}
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
    <LinearGradient colors={sk(["#082139", "#051B2D"], ["#FFFFFF", "#FFFFFF"])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, style]}>
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

type DisplayAction = TournamentAction & { accessibilityLabel?: string };

function TournamentActionButton({ action, columns }: { action: DisplayAction; columns: number }) {
  const isDetails = action.key === "details";
  const isBracket = action.key === "bracket";
  const iconColor = isDetails ? sk("#9EBAD5", "#5F6F8A") : isBracket ? sk("#A6CDFF", "#2F8BFF") : sk("#38D4F3", "#1466F2");
  // V3: nút chính nền xanh dương → chữ trắng; nút cảnh báo (nền vàng) giữ chữ tối.
  const primaryInk = action.warning ? "#031526" : sk("#031526", "#FFFFFF");
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={action.accessibilityLabel || action.label} testID={`tournament-action-${action.key}`} onPress={action.onPress} style={({ pressed }) => [styles.actionPressable, columns === 3 ? styles.actionThird : columns === 1 ? styles.actionFull : styles.actionHalf, pressed && styles.pressed]}>
      {action.primary ? (
        <LinearGradient colors={action.warning ? ["#FFB547", "#F59E0B"] : sk(["#11D3F3", "#00C3E8"], ["#2F8BFF", "#1466F2"])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.actionPrimary, { borderColor: action.warning ? "#FFD17C" : sk("#54E0F5", "#1466F2") }]}>
          <Ionicons name={action.icon} size={18} color={primaryInk} /><Text numberOfLines={2} style={[styles.actionTextPrimary, { color: primaryInk }]}>{action.label}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.actionSecondary, isBracket && styles.actionBracket, isDetails && styles.actionDetails]}>
          {!isDetails ? <Ionicons name={action.icon} size={18} color={iconColor} /> : null}
          <Text numberOfLines={2} style={[styles.actionText, isDetails && styles.actionDetailsText]}>{action.label}</Text>
          {isDetails ? <Ionicons name={action.icon} size={18} color={iconColor} /> : null}
        </View>
      )}
    </Pressable>
  );
}

function TournamentActionGrid({ actions }: { actions: DisplayAction[] }) {
  const [wide, setWide] = useState(false);
  if (!actions.length) return null;
  const columns = actions.length === 3 && wide ? 3 : Math.min(2, actions.length);
  return (
    <View testID="tournament-action-grid" onLayout={({ nativeEvent }) => setWide(nativeEvent.layout.width >= 360)} style={styles.actionGrid}>
      {actions.map((action) => <TournamentActionButton key={action.key} action={action} columns={columns} />)}
    </View>
  );
}

export const TournamentActions = memo(function TournamentActions({ actions }: { actions: TournamentAction[] }) {
  if (!actions.length) return null;
  return <View style={styles.actions}><TournamentActionGrid actions={actions} /></View>;
});

// Tiêu đề NGÀY trong thẻ gom nhóm: vạch màu + "Thứ Bảy · 28/11/2026" + số nội dung, kèm hàng cột Giờ | Nội dung | Đội.
export const TournamentDayHeader = memo(function TournamentDayHeader({ weekday, dateLabel, count }: { weekday: string; dateLabel: string; count: number }) {
  return (
    <View testID="tournament-day-header">
      <View style={styles.dayHead}>
        <View style={styles.dayBar} />
        <Text numberOfLines={1} style={styles.dayTitle}>{dateLabel ? `${weekday} · ${dateLabel}` : "Chưa có ngày"}</Text>
        <View style={styles.dayCount}><Text style={styles.dayCountText}>{count} nội dung</Text></View>
      </View>
      <View style={styles.dayCols}>
        <Text style={[styles.dayColText, styles.dayColTime]}>Giờ</Text>
        <Text style={[styles.dayColText, { flex: 1 }]}>Nội dung</Text>
        <Text style={styles.dayColText}>Đội</Text>
      </View>
    </View>
  );
});

export const TournamentEventRow = memo(function TournamentEventRow({ id, title, kind, registered, capacity, actions, onDetails, time }: {
  id: string;
  title: string;
  kind: string;
  registered: number;
  capacity: number;
  actions: TournamentAction[];
  onDetails: () => void;
  /** Có truyền (kể cả "") = hiện cột giờ bên trái như bảng theo ngày; "" = chưa đặt giờ → "—". */
  time?: string;
}) {
  const full = capacity > 0 && registered >= capacity;
  const pct = capacity > 0 ? Math.max(0, Math.min(100, (registered / capacity) * 100)) : 0;
  if (time !== undefined) {
    return (
      <View style={[styles.eventRow, styles.eventRowTimed]} testID={`tournament-event-${id}`}>
        <View style={styles.eventTime}>
          <Text style={styles.eventTimeText}>{time || "—"}</Text>
          {time ? <Ionicons name="time-outline" size={15} color={TOURNAMENT_COLORS.primary} /> : null}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.eventHeading}>
            <Pressable accessibilityRole="button" onPress={onDetails} style={styles.eventTitleTouch}>
              <Text style={styles.eventTitle}>{title}</Text>
              {full ? <View style={styles.eventKindRow}><Text style={styles.fullLabel}>Đã đầy</Text></View> : null}
            </Pressable>
            <Text style={styles.capacity}><Text style={full ? styles.capacityFull : styles.capacityCurrent}>{registered}</Text>{capacity > 0 ? `/${capacity}` : ""}</Text>
          </View>
          {capacity > 0 ? <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: capacity, now: Math.min(registered, capacity) }} style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: full ? sk("#FF7781", "#DC2626") : TOURNAMENT_COLORS.primary }]} /></View> : null}
          <TournamentActionGrid actions={[...actions, { key: "details", label: "Chi tiết", accessibilityLabel: `Chi tiết ${title}`, icon: "chevron-forward", onPress: onDetails }]} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.eventRow} testID={`tournament-event-${id}`}>
      <View style={styles.eventHeading}>
        <Pressable accessibilityRole="button" onPress={onDetails} style={styles.eventTitleTouch}>
          <Text style={styles.eventTitle}>{title}</Text>
          <View style={styles.eventKindRow}><Text style={styles.eventKind}>{kind}</Text>{full ? <Text style={styles.fullLabel}>Đã đầy</Text> : null}</View>
        </Pressable>
        <Text style={styles.capacity}><Text style={full ? styles.capacityFull : styles.capacityCurrent}>{registered}</Text>{capacity > 0 ? `/${capacity}` : ""}<Text style={styles.capacityUnit}> {kind === "Đấu đơn" ? "VĐV" : "đội"}</Text></Text>
      </View>
      {capacity > 0 ? <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: capacity, now: Math.min(registered, capacity) }} aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={Math.min(registered, capacity)} style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: full ? sk("#FF7781", "#DC2626") : TOURNAMENT_COLORS.primary }]} /></View> : null}
      <TournamentActionGrid actions={[...actions, { key: "details", label: "Chi tiết", accessibilityLabel: `Chi tiết ${title}`, icon: "chevron-forward", onPress: onDetails }]} />
    </View>
  );
});

export const ZaloButton = memo(function ZaloButton({ onPress }: { onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Nhóm Zalo" onPress={onPress} style={({ pressed }) => [styles.zaloButton, pressed && styles.pressed]}><View style={styles.zaloMark}><Text style={styles.zaloMarkText}>Zalo</Text></View><Text style={styles.zaloText}>Nhóm Zalo</Text><Ionicons name="chevron-forward" size={20} color={TOURNAMENT_COLORS.textMuted} /></Pressable>;
});

export const TournamentList = React.forwardRef<FlatList<any>, FlatListProps<any>>(function TournamentList(props, ref) {
  // Thẻ giải cao (ảnh bìa + nội dung): dựng ít một lúc để lần đầu hiện nhanh; màn gọi vẫn ghi đè được.
  return (
    <FlatList
      ref={ref}
      initialNumToRender={3}
      maxToRenderPerBatch={4}
      windowSize={9}
      removeClippedSubviews={Platform.OS === "android"}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { minHeight: 90, paddingTop: 5, paddingBottom: 10, justifyContent: "center" },
  heroArtwork: { position: "absolute", top: 0, right: 48 },
  headerTitleRow: { flexDirection: "row", alignItems: "center" },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: 4 },
  title: { color: sk("#FFFFFF", "#0B1B3A"), fontSize: 34, lineHeight: 43, fontWeight: "900", letterSpacing: -0.9 },
  subtitle: { color: TOURNAMENT_COLORS.textMuted, fontSize: 13, lineHeight: 19, marginTop: 2, paddingRight: 35 },
  search: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9, paddingLeft: 14, borderRadius: 12, borderWidth: 1, borderColor: sk("#285171", "rgba(16,42,92,0.10)"), backgroundColor: sk("#061B30", "#FFFFFF"), marginBottom: 10, ...(IS_V3_LIGHT ? { shadowColor: "#1B3A7A", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 } : null) },
  searchInput: { flex: 1, minWidth: 0, minHeight: 48, paddingVertical: 8, color: TOURNAMENT_COLORS.text, fontSize: 14.5 },
  searchClear: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  searchFilter: { width: 48, minHeight: 44, borderLeftWidth: 1, borderLeftColor: sk("#163C57", "rgba(16,42,92,0.10)"), alignItems: "center", justifyContent: "center" },
  kindWrap: { marginBottom: 12 },
  kindSwitch: { flexDirection: "row", padding: 4, gap: 4, borderRadius: 14, borderWidth: 1, borderColor: sk("#285171", "rgba(16,42,92,0.10)"), backgroundColor: sk("#061B30", "#FFFFFF") },
  kindItem: { flex: 1, minWidth: 0, minHeight: 42, borderRadius: 10, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 },
  kindText: { fontSize: 14.5, fontWeight: "700", flexShrink: 1 },
  kindTextActive: { fontWeight: "900" },
  kindBadge: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#C5F433" },
  kindBadgeText: { color: "#0B1B3A", fontSize: 11, fontWeight: "900" },
  kindHint: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingHorizontal: 2 },
  kindHintText: { color: TOURNAMENT_COLORS.textMuted, fontSize: 12.5, flexShrink: 1 },
  organizeWrap: { borderRadius: 999, shadowColor: "#08CDF5", shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  organizeBtn: { flexDirection: "row", alignItems: "center", gap: 7, height: 42, paddingHorizontal: 14, borderRadius: 999 },
  organizePlus: { position: "absolute", right: -5, bottom: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  organizeText: { color: "#FFFFFF", fontSize: 13.5, fontWeight: "900" },
  tabsBar: { flexDirection: "row", alignItems: "center", gap: 4, borderBottomWidth: 1, borderBottomColor: sk("#204661", "rgba(16,42,92,0.10)") },
  tabsItem: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: "center" },
  tabsItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  tabsText: { color: TOURNAMENT_COLORS.textMuted, fontSize: 14.5, fontWeight: "700", flexShrink: 1 },
  tabsCount: { minWidth: 24, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: "#D92D20", alignItems: "center", justifyContent: "center" },
  tabsCountText: { color: "#FFFFFF", fontSize: 11.5, fontWeight: "800" },
  tabsUnderline: { position: "absolute", bottom: -1, left: 6, right: 6, height: 3, borderRadius: 2, backgroundColor: TOURNAMENT_COLORS.primary },
  tabsFilterBtn: { width: 42, height: 42, borderRadius: 21, marginLeft: 4, marginBottom: 3, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: TOURNAMENT_COLORS.border, backgroundColor: TOURNAMENT_COLORS.surface },
  tabsFilterDot: { position: "absolute", top: 7, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: TOURNAMENT_COLORS.primary },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  activeChip: { flexDirection: "row", alignItems: "center", gap: 5, maxWidth: 220, paddingHorizontal: 10, height: 30, borderRadius: 999, borderWidth: 1, borderColor: TOURNAMENT_COLORS.primary, backgroundColor: TOURNAMENT_COLORS.surface },
  activeChipText: { color: TOURNAMENT_COLORS.textSoft, fontSize: 12.5, fontWeight: "700", flexShrink: 1 },
  filters: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: sk("#204661", "rgba(16,42,92,0.10)") },
  filterPressable: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: "center", paddingVertical: 8 },
  filterContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 5 },
  filterDivider: { borderRightWidth: 1, borderRightColor: sk("#173A52", "rgba(16,42,92,0.10)") },
  filterText: { color: TOURNAMENT_COLORS.textMuted, fontSize: 13, fontWeight: "600", flexShrink: 1 },
  filterTextActive: { color: TOURNAMENT_COLORS.primary, fontWeight: "800" },
  filterUnderline: { position: "absolute", bottom: -1, left: 0, right: 8, height: 2.5, backgroundColor: TOURNAMENT_COLORS.primary, borderRadius: 2 },
  dateFilterRow: { flexDirection: "row", alignSelf: "flex-end", maxWidth: "100%", alignItems: "center", marginBottom: 3 },
  dateFilter: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7, maxWidth: "100%", flexShrink: 1 },
  dateFilterText: { color: TOURNAMENT_COLORS.textMuted, fontSize: 13, flexShrink: 1 },
  dateClear: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 17, overflow: "hidden", ...(IS_V3_LIGHT ? { borderWidth: 1, borderColor: "rgba(16,42,92,0.08)", shadowColor: "#1B3A7A", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3 } : null) },
  cover: { position: "relative", width: "100%", aspectRatio: 2.55, backgroundColor: sk("#081B33", "#E9F0FA") },
  coverImage: { width: "100%", height: "100%" },
  coverPressed: { opacity: 0.92 },
  statusBadge: { position: "absolute", top: 10, left: 10, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 18, backgroundColor: "rgba(2,11,28,0.78)" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  modeBadge: { position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 14, backgroundColor: "rgba(35,26,2,0.8)" },
  modeText: { color: "#FFE071", fontSize: 11, fontWeight: "800" },
  dateBadge: { position: "absolute", bottom: 5, left: 12, minWidth: 48, alignItems: "center", paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: sk("#276486", "rgba(16,42,92,0.12)"), borderLeftWidth: 3, borderLeftColor: TOURNAMENT_COLORS.primary, borderRadius: 7, backgroundColor: sk("#071F34", "#FFFFFF") },
  dateDay: { color: sk("#FFFFFF", "#0B1B3A"), fontSize: 24, lineHeight: 28, fontWeight: "900" },
  dateMonth: { color: sk("#A0BEDF", "#5F6F8A"), fontSize: 10, lineHeight: 13, fontWeight: "700" },
  titlePressable: { paddingHorizontal: 14, paddingTop: 13, paddingBottom: 9 },
  cardTitle: { color: sk("#FFFFFF", "#0B1B3A"), fontSize: 24, lineHeight: 29, fontWeight: "900", letterSpacing: -0.4, textTransform: "uppercase" },
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
  summaryDivider: { width: 1, height: 15, backgroundColor: sk("#25465D", "rgba(16,42,92,0.14)") },
  actions: { paddingHorizontal: 14, paddingBottom: 8 },
  actionGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", alignItems: "stretch", gap: 8 },
  actionPressable: { minHeight: 48, minWidth: 0, flexGrow: 1, flexShrink: 1 },
  actionHalf: { flexBasis: "46%" },
  actionThird: { flexBasis: "30%" },
  actionFull: { flexBasis: "100%" },
  actionPrimary: { flex: 1, minHeight: 48, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1 },
  actionSecondary: { flex: 1, minHeight: 48, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1, borderColor: sk("#23667F", "rgba(20,102,242,0.18)"), backgroundColor: sk("#0A2B43", "rgba(20,102,242,0.08)") },
  actionBracket: { borderColor: sk("#365F89", "rgba(16,42,92,0.12)"), backgroundColor: sk("#122D49", "#F5F8FD") },
  actionDetails: { borderColor: sk("#2A4C68", "rgba(16,42,92,0.12)"), backgroundColor: sk("#0A2136", "#FFFFFF") },
  actionTextPrimary: { flexShrink: 1, textAlign: "center", color: "#031526", fontSize: 13.5, lineHeight: 18, fontWeight: "800" },
  actionText: { flexShrink: 1, textAlign: "center", color: sk("#D8ECFC", "#0B2A6B"), fontSize: 13, lineHeight: 18, fontWeight: "700" },
  actionDetailsText: { color: sk("#AEC8E0", "#5F6F8A") },
  dayHead: { flexDirection: "row", alignItems: "center", gap: 9, marginHorizontal: 14, paddingHorizontal: 6, paddingTop: 14, paddingBottom: 8 },
  dayBar: { width: 3, height: 17, borderRadius: 2, backgroundColor: TOURNAMENT_COLORS.primary },
  dayTitle: { flex: 1, minWidth: 0, color: sk("#FFFFFF", "#0B1B3A"), fontSize: 15, fontWeight: "800" },
  dayCount: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: sk("rgba(8,205,245,0.10)", "rgba(20,102,242,0.08)"), borderWidth: 1, borderColor: TOURNAMENT_COLORS.border },
  dayCountText: { color: TOURNAMENT_COLORS.textSoft, fontSize: 11.5, fontWeight: "700" },
  dayCols: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 14, paddingHorizontal: 6, paddingVertical: 6, borderRadius: 8, backgroundColor: sk("rgba(255,255,255,0.04)", "rgba(16,42,92,0.04)") },
  dayColText: { color: TOURNAMENT_COLORS.textMuted, fontSize: 11.5, fontWeight: "600" },
  dayColTime: { width: 46 },
  eventRowTimed: { flexDirection: "row", gap: 10 },
  eventTime: { width: 46, paddingTop: 11, gap: 4, alignItems: "flex-start" },
  eventTimeText: { color: TOURNAMENT_COLORS.primary, fontSize: 14, fontWeight: "800", fontVariant: ["tabular-nums"] },
  eventRow: { marginHorizontal: 14, paddingHorizontal: 6, paddingTop: 12, paddingBottom: 11, borderTopWidth: 1, borderTopColor: sk("#21475F", "rgba(16,42,92,0.10)") },
  eventHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventTitleTouch: { flex: 1, minHeight: 44, minWidth: 0, justifyContent: "center" },
  eventTitle: { color: sk("#FFFFFF", "#0B1B3A"), fontSize: 16, lineHeight: 21, fontWeight: "800" },
  eventKindRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  eventKind: { color: TOURNAMENT_COLORS.textMuted, fontSize: 11.5, lineHeight: 16 },
  fullLabel: { color: sk("#FF8891", "#DC2626"), fontSize: 11.5, lineHeight: 16, fontWeight: "700" },
  capacity: { color: sk("#BCD2EB", "#243450"), fontSize: 14, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  capacityCurrent: { color: TOURNAMENT_COLORS.primary, fontWeight: "900", fontSize: 16 },
  capacityFull: { color: sk("#FF8891", "#DC2626"), fontWeight: "900", fontSize: 16 },
  capacityUnit: { color: TOURNAMENT_COLORS.textMuted, fontSize: 11, fontWeight: "500" },
  track: { height: 5, borderRadius: 3, backgroundColor: sk("#203C52", "#E3EAF5"), overflow: "hidden", marginTop: 8, marginBottom: 8 },
  fill: { height: "100%", borderRadius: 3 },
  zaloButton: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: sk("#21475F", "rgba(16,42,92,0.10)") },
  zaloMark: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#168AFF" },
  zaloMarkText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900", letterSpacing: -0.4 },
  zaloText: { flex: 1, color: sk("#FFFFFF", "#0B1B3A"), fontSize: 14, lineHeight: 19, fontWeight: "700" },
  pressed: { opacity: 0.78 },
});
