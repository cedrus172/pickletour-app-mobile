// components/ui/AppModal.tsx
// Modal toàn màn hình AN TOÀN với tai thỏ / Dynamic Island.
//
// GlobalNotificationShell đã đệm vùng status bar và đưa context safe-area top = 0
// cho màn hình bên trong. <Modal> mở cửa sổ native RIÊNG (không có đệm đó), nên
// useSafeAreaInsets().top đọc từ màn cha luôn = 0 → header/nút Back nằm dưới
// Dynamic Island. AppModal bọc nội dung bằng SafeAreaProvider riêng để đo đúng
// vùng an toàn của chính cửa sổ modal.
//
// Dùng:
//   - Thay `Modal` của react-native bằng AppModal (cùng props).
//   - Đệm top BÊN TRONG modal: <SafeAreaView edges={["top"]}> hoặc useModalTopInset()
//     trong component con. KHÔNG dùng insets.top lấy từ hook ở component cha.
// Kiểm tra tự động: node scripts/test-modal-safe-area.cjs
import React from "react";
import { Modal, type ModalProps } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

export default function AppModal({ children, ...props }: ModalProps) {
  return (
    <Modal {...props}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: "transparent" }}>{children}</SafeAreaProvider>
    </Modal>
  );
}

// Top inset của cửa sổ modal — chỉ gọi trong component nằm BÊN TRONG AppModal.
export function useModalTopInset(min = 0) {
  return Math.max(useSafeAreaInsets().top, min);
}

// Render-prop cho chỗ không tách được component con.
export function ModalTopInset({ min = 0, children }: { min?: number; children: (top: number) => React.ReactNode }) {
  const top = useModalTopInset(min);
  return <>{children(top)}</>;
}
