import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/i18nText";
import { useThemeTokens } from "@/hooks/useThemeTokens";
import { useApproveTournamentPaymentProofMutation, useGetTournamentPaymentProofQuery } from "@/slices/tournamentPaymentProofApi";

export default function TournamentPaymentProofCard({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [approved, setApproved] = useState(false);
  const C = useThemeTokens();
  const { data, isFetching, isError } = useGetTournamentPaymentProofQuery(id, { skip: !open, refetchOnMountOrArgChange: true });
  const [approve, { isLoading }] = useApproveTournamentPaymentProofMutation();

  function confirm() {
    Alert.alert("Duyệt lệ phí", `Xác nhận đã nhận lệ phí cho mã ${data?.code}?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xác nhận", onPress: async () => {
        try {
          await approve(id).unwrap();
          setApproved(true);
        } catch (error: any) {
          Alert.alert("Chưa duyệt được biên lai", error?.data?.message);
        }
      } },
    ]);
  }

  return (
    <View style={{ gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}
        style={{ minHeight: 44, justifyContent: "center" }}>
        <Text style={{ color: C.text, fontWeight: "800" }}>{open ? "Ẩn biên lai" : "Xem biên lai"}</Text>
      </Pressable>
      {open && (isFetching ? <Text style={{ color: C.text }}>Đang tải biên lai…</Text>
        : isError ? <Text style={{ color: C.text }}>Không mở được biên lai.</Text>
          : data && <>
            <Image source={{ uri: data.image }} style={{ height: 260, width: "100%", minWidth: 180 }} cachePolicy="none"
              contentFit="contain" accessible accessibilityLabel="Biên lai chuyển khoản" />
            <Text style={{ color: C.text }}>{approved || data.status === "approved" ? "Đã duyệt lệ phí"
              : data.status === "pending" ? "Chờ duyệt" : "Đăng ký không còn tồn tại"}</Text>
            {data.canApprove && !approved &&
              <Pressable accessibilityRole="button" disabled={isLoading} onPress={confirm}
                style={{ backgroundColor: "#116CA3", borderRadius: 8, minHeight: 44, justifyContent: "center", padding: 8 }}>
                <Text style={{ color: "#fff", fontWeight: "800" }}>{isLoading ? "Đang duyệt…" : "Xác nhận đã thu lệ phí"}</Text>
              </Pressable>}
          </>)}
    </View>
  );
}
