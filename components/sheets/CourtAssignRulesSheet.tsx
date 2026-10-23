// components/sheets/CourtAssignRulesSheet.tsx
// Quản lý luật ràng buộc gán sân (mobile): phạm vi = bảng và/hoặc trận cụ thể →
// chỉ được gán vào các sân đã chọn của một cụm. Lưu qua PUT court-assign-rules;
// backend chặn cứng khi gán nên luật có hiệu lực ở mọi nơi.
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "@/components/ui/i18nText";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetTournamentCourtAssignRulesQuery,
  useUpdateTournamentCourtAssignRulesMutation,
  useGetTournamentCourtClusterOptionsQuery,
  useGetTournamentCourtClusterRuntimeQuery,
} from "@/slices/courtClustersAdminApiSlice";

const sid = (v: any) =>
  v && typeof v === "object" ? String(v._id || v.id || "") : String(v || "");

type MatchOpt = { _id: string; code: string; pool?: string };
type Rule = {
  _id?: string;
  label: string;
  enabled: boolean;
  groups: string[];
  matchIds: string[];
  clusterId: string;
  stationIds: string[];
  _display?: any;
};

const emptyRule = (clusterId = ""): Rule => ({
  _id: "",
  label: "",
  enabled: true,
  groups: [],
  matchIds: [],
  clusterId,
  stationIds: [],
});

function Chip({
  label,
  on,
  onPress,
  colors,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        marginRight: 6,
        marginBottom: 6,
        backgroundColor: on ? colors.primary : "transparent",
        borderColor: on ? colors.primary : colors.border,
      }}
    >
      <Text style={{ color: on ? "#fff" : colors.text, fontWeight: "700", fontSize: 12.5 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function RuleEditor({
  tournamentId,
  clusters,
  groups,
  matches,
  value,
  onChange,
  onCancel,
  onDone,
  colors,
}: {
  tournamentId: string;
  clusters: any[];
  groups: string[];
  matches: MatchOpt[];
  value: Rule;
  onChange: (r: Rule) => void;
  onCancel: () => void;
  onDone: () => void;
  colors: any;
}) {
  const clusterId = sid(value.clusterId);
  const { data: runtime, isFetching } = useGetTournamentCourtClusterRuntimeQuery(
    { tournamentId, clusterId },
    { skip: !tournamentId || !clusterId, refetchOnMountOrArgChange: true },
  );
  const stations: any[] = useMemo(() => (runtime as any)?.stations || [], [runtime]);
  const [matchQuery, setMatchQuery] = useState("");
  const matchSet = new Set((value.matchIds || []).map(sid));
  const stationSet = new Set((value.stationIds || []).map(sid));
  const valid = (value.groups.length || value.matchIds.length) && value.stationIds.length;

  const visibleMatches = useMemo(() => {
    const q = matchQuery.trim().toUpperCase();
    const list = q
      ? matches.filter(
          (m) =>
            m.code.toUpperCase().includes(q) ||
            (m.pool || "").toUpperCase() === q,
        )
      : matches;
    // luôn hiện các trận đã chọn + tối đa 40 kết quả
    const chosen = matches.filter((m) => matchSet.has(m._id));
    const rest = list.filter((m) => !matchSet.has(m._id)).slice(0, 40);
    return [...chosen, ...rest];
  }, [matches, matchQuery, value.matchIds]);

  const toggle = (set: Set<string>, id: string, key: "matchIds" | "stationIds") => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange({ ...value, [key]: Array.from(next) } as Rule);
  };

  const label = (s: any) => s?.name || s?.code || "Sân";

  return (
    <View>
      <Text style={[styles.section, { color: colors.text }]}>Tên luật (tuỳ chọn)</Text>
      <TextInput
        value={value.label}
        onChangeText={(v) => onChange({ ...value, label: v })}
        placeholder="VD: Bảng A,B,C đánh tại Quang Trung"
        placeholderTextColor="#8A94A6"
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
      />

      <Text style={[styles.section, { color: colors.text }]}>Phạm vi: bảng</Text>
      <View style={styles.wrap}>
        {groups.map((g) => (
          <Chip
            key={g}
            label={`Bảng ${g}`}
            on={value.groups.includes(g)}
            colors={colors}
            onPress={() =>
              onChange({
                ...value,
                groups: value.groups.includes(g)
                  ? value.groups.filter((x) => x !== g)
                  : [...value.groups, g],
              })
            }
          />
        ))}
        {!groups.length ? (
          <Text style={{ color: "#8A94A6" }}>Giải chưa có bảng.</Text>
        ) : null}
      </View>

      <Text style={[styles.section, { color: colors.text }]}>
        Phạm vi: trận cụ thể ({value.matchIds.length})
      </Text>
      <TextInput
        value={matchQuery}
        onChangeText={setMatchQuery}
        placeholder="Tìm mã trận, VD: V3-T1"
        placeholderTextColor="#8A94A6"
        autoCapitalize="characters"
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
      />
      <View style={styles.wrap}>
        {visibleMatches.map((m) => (
          <Chip
            key={m._id}
            label={m.pool ? `${m.code} (${m.pool})` : m.code}
            on={matchSet.has(m._id)}
            colors={colors}
            onPress={() => toggle(matchSet, m._id, "matchIds")}
          />
        ))}
      </View>

      <Text style={[styles.section, { color: colors.text }]}>Cụm sân</Text>
      <View style={styles.wrap}>
        {clusters.map((c) => {
          const id = sid(c._id || c.id);
          return (
            <Chip
              key={id}
              label={c.name || c.slug || "Cụm sân"}
              on={clusterId === id}
              colors={colors}
              onPress={() => onChange({ ...value, clusterId: id, stationIds: [] })}
            />
          );
        })}
      </View>

      <Text style={[styles.section, { color: colors.text }]}>
        Sân được phép ({value.stationIds.length}/{stations.length})
      </Text>
      {!clusterId ? (
        <Text style={{ color: "#8A94A6" }}>Chọn cụm sân để liệt kê sân.</Text>
      ) : isFetching && !stations.length ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.wrap}>
          {stations.map((s) => {
            const id = sid(s._id);
            return (
              <Chip
                key={id}
                label={label(s)}
                on={stationSet.has(id)}
                colors={colors}
                onPress={() => toggle(stationSet, id, "stationIds")}
              />
            );
          })}
          {!stations.length ? (
            <Text style={{ color: "#8A94A6" }}>Cụm này chưa có sân.</Text>
          ) : null}
        </View>
      )}

      <Pressable
        onPress={() => onChange({ ...value, enabled: !value.enabled })}
        style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}
      >
        <MaterialIcons
          name={value.enabled ? "check-box" : "check-box-outline-blank"}
          size={22}
          color={colors.primary}
        />
        <Text style={{ color: colors.text, marginLeft: 6 }}>Đang áp dụng</Text>
      </Pressable>

      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }}>
        <Pressable onPress={onCancel} style={[styles.btn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontWeight: "700" }}>Huỷ</Text>
        </Pressable>
        <Pressable
          onPress={onDone}
          disabled={!valid}
          style={[
            styles.btn,
            { backgroundColor: colors.primary, borderColor: colors.primary, opacity: valid ? 1 : 0.5 },
          ]}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>Xong</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function CourtAssignRulesSheet({
  open,
  onClose,
  tournamentId,
  groups = [],
  matches = [],
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  tournamentId: string;
  groups?: string[];
  matches?: MatchOpt[];
  onSaved?: () => void;
}) {
  const { colors, dark } = useTheme() as any;
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch } = useGetTournamentCourtAssignRulesQuery(tournamentId, {
    skip: !open || !tournamentId,
    refetchOnMountOrArgChange: true,
  });
  const { data: clusterOptionsData } = useGetTournamentCourtClusterOptionsQuery(tournamentId, {
    skip: !open || !tournamentId,
  });
  const [saveRules, { isLoading: saving }] = useUpdateTournamentCourtAssignRulesMutation();
  const [rules, setRules] = useState<Rule[]>([]);
  const [editing, setEditing] = useState<{ index: number; draft: Rule } | null>(null);

  const clusters: any[] = useMemo(() => {
    const d: any = clusterOptionsData;
    const selectedIds: string[] = Array.isArray(d?.selectedIds) ? d.selectedIds.map(sid) : [];
    const items: any[] = Array.isArray(d?.items) ? d.items : [];
    const sel = items.filter((c) => selectedIds.includes(sid(c?._id || c?.id)));
    return sel.length ? sel : items;
  }, [clusterOptionsData]);

  useEffect(() => {
    if (!open) return;
    const list: any[] = Array.isArray((data as any)?.rules) ? (data as any).rules : [];
    setRules(
      list.map((r) => ({
        _id: sid(r._id),
        label: r.label || "",
        enabled: r.enabled !== false,
        groups: r.groups || [],
        matchIds: (r.matchIds || []).map(sid),
        clusterId: sid(r.clusterId),
        stationIds: (r.stationIds || []).map(sid),
        _display: r,
      })),
    );
    setEditing(null);
  }, [data, open]);

  const describe = (r: Rule) => {
    const d = r._display;
    const scope = [
      ...r.groups.map((g) => `Bảng ${g}`),
      ...r.matchIds.map(
        (id) =>
          d?.matches?.find((m: any) => sid(m._id) === id)?.code ||
          matches.find((m) => m._id === id)?.code ||
          "trận",
      ),
    ].join(", ");
    const cname =
      d?.cluster?.name || clusters.find((c) => sid(c._id || c.id) === r.clusterId)?.name || "Cụm";
    const sts = d?.stations?.length
      ? d.stations.map((s: any) => s.name).join(", ")
      : `${r.stationIds.length} sân`;
    return { scope: scope || "(chưa có phạm vi)", target: `${cname} · ${sts}` };
  };

  const handleSave = async () => {
    try {
      const payload = rules.map(({ _display, ...r }) => r);
      await saveRules({ tournamentId, rules: payload }).unwrap();
      await refetch();
      onSaved?.();
      Alert.alert("Đã lưu", "Luật ràng buộc sân đã được cập nhật.");
      onClose();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.data?.message || e?.message || "Lưu luật thất bại");
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ justifyContent: "flex-end", flex: 1 }}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: dark ? "#0F172A" : "#FFFFFF",
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Ràng buộc gán sân</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <MaterialIcons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: "100%" }}>
            <View
              style={{
                borderWidth: 1,
                borderRadius: 12,
                padding: 10,
                marginBottom: 10,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text }}>
                Trận thuộc phạm vi của luật <Text style={{ fontWeight: "800" }}>chỉ được gán</Text>{" "}
                vào các sân đã chọn — khi gán tay, qua hàng đợi sân hay trên web. Nhiều luật cùng
                khớp một trận thì gộp các sân cho phép.
              </Text>
            </View>

            {isLoading ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null}

            {editing ? (
              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 }}>
                <Text style={[styles.title, { color: colors.text, marginBottom: 6 }]}>
                  {editing.index === -1 ? "Thêm luật" : "Sửa luật"}
                </Text>
                <RuleEditor
                  tournamentId={tournamentId}
                  clusters={clusters}
                  groups={groups}
                  matches={matches}
                  value={editing.draft}
                  colors={colors}
                  onChange={(draft) => setEditing({ ...editing, draft })}
                  onCancel={() => setEditing(null)}
                  onDone={() => {
                    setRules((prev) => {
                      const next = [...prev];
                      const draft = { ...editing.draft, _display: undefined };
                      if (editing.index === -1) next.push(draft);
                      else next[editing.index] = draft;
                      return next;
                    });
                    setEditing(null);
                  }}
                />
              </View>
            ) : (
              <>
                {rules.length === 0 ? (
                  <Text style={{ color: "#8A94A6", marginBottom: 10 }}>
                    Chưa có luật nào — mọi trận đang được gán sân tự do.
                  </Text>
                ) : (
                  rules.map((r, i) => {
                    const { scope, target } = describe(r);
                    return (
                      <View
                        key={r._id || i}
                        style={{
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 12,
                          padding: 10,
                          marginBottom: 8,
                          opacity: r.enabled ? 1 : 0.55,
                          flexDirection: "row",
                          alignItems: "flex-start",
                        }}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: colors.text, fontWeight: "800" }} numberOfLines={1}>
                            {r.label || `Luật ${i + 1}`}
                            {!r.enabled ? " (tắt)" : ""}
                          </Text>
                          <Text style={{ color: colors.text }}>{scope}</Text>
                          <Text style={{ color: "#8A94A6" }}>→ {target}</Text>
                        </View>
                        <Pressable
                          onPress={() => setEditing({ index: i, draft: { ...r } })}
                          hitSlop={8}
                          style={{ marginLeft: 8 }}
                        >
                          <MaterialIcons name="edit" size={20} color={colors.primary} />
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            Alert.alert("Xoá luật?", r.label || `Luật ${i + 1}`, [
                              { text: "Huỷ", style: "cancel" },
                              {
                                text: "Xoá",
                                style: "destructive",
                                onPress: () => setRules((prev) => prev.filter((_, j) => j !== i)),
                              },
                            ])
                          }
                          hitSlop={8}
                          style={{ marginLeft: 10 }}
                        >
                          <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                        </Pressable>
                      </View>
                    );
                  })
                )}
                <Pressable
                  disabled={!clusters.length}
                  onPress={() =>
                    setEditing({
                      index: -1,
                      draft: emptyRule(sid(clusters[0]?._id || clusters[0]?.id)),
                    })
                  }
                  style={[
                    styles.btn,
                    { alignSelf: "flex-start", borderColor: colors.primary, opacity: clusters.length ? 1 : 0.5 },
                  ]}
                >
                  <Text style={{ color: colors.primary, fontWeight: "800" }}>+ Thêm luật</Text>
                </Pressable>
                {!clusters.length ? (
                  <Text style={{ color: "#f59e0b", marginTop: 6 }}>
                    Giải chưa gán cụm sân nào — hãy gán cụm sân cho giải trước.
                  </Text>
                ) : null}
              </>
            )}
          </ScrollView>

          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
            <Pressable onPress={onClose} style={[styles.btn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>Đóng</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving || !!editing}
              style={[
                styles.btn,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                  opacity: saving || editing ? 0.5 : 1,
                },
              ]}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>
                {saving ? "Đang lưu…" : "Lưu luật"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { fontSize: 17, fontWeight: "900" },
  section: { fontWeight: "800", marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15 },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  btn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, marginLeft: 8 },
});
