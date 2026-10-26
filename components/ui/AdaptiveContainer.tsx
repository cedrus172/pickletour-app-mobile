// components/ui/AdaptiveContainer.tsx
// Căn giữa + giới hạn bề rộng nội dung trên màn lớn (iPhone Duo mở / iPad), để nội
// dung không bị giãn full-width xấu. Màn hẹp (compact) thì render thẳng (no-op).
import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useResponsive } from "@/hooks/useResponsive";

export function AdaptiveContainer({
  children,
  style,
  maxWidth,
  center = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
  center?: boolean;
}) {
  const r = useResponsive();
  if (!r.isWide) return <>{children}</>;
  const cap = maxWidth ?? r.contentMaxWidth;
  return (
    <View style={{ width: "100%", alignItems: center ? "center" : "flex-start" }}>
      <View style={[{ width: "100%", maxWidth: cap }, style]}>{children}</View>
    </View>
  );
}

export default AdaptiveContainer;
