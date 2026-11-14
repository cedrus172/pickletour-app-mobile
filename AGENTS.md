# AGENTS.md — pickletour-app-mobile

- Mọi chữ tiếng Việt phải có dấu đầy đủ, mã hoá UTF-8.

## Safe area / Dynamic Island (BẮT BUỘC)

`GlobalNotificationShell` (app/_layout.tsx) đã tự đệm vùng status bar cho mọi màn hình và
đưa context safe-area `top = 0` xuống bên trong. Vì vậy:

- **Màn hình thường**: KHÔNG tự cộng thêm `insets.top` cho header nữa (shell đã đệm).
- **Modal toàn màn hình** (`<Modal>` không `transparent`, không `pageSheet`/`formSheet`) mở cửa
  sổ native riêng, KHÔNG có đệm của shell → `useSafeAreaInsets().top` đọc ở màn cha luôn = 0
  → header/nút Back nằm dưới Dynamic Island, không bấm được.
  - Luôn dùng `AppModal` (`components/ui/AppModal.tsx`) thay cho `Modal` của react-native.
  - Đệm top **bên trong** modal: `<ModalTopInset>{(modalTop) => …}</ModalTopInset>`,
    `useModalTopInset()` trong component con, hoặc `SafeAreaView` có edge `top`.
  - KHÔNG dùng `insets.top` / `StatusBar.currentHeight` của hook ở component cha trong thân modal.
- Kiểm tra: `node scripts/test-modal-safe-area.cjs` (OTA `scripts/ota-safe-deploy.mjs` tự chạy
  và chặn deploy nếu vi phạm). Ngoại lệ có chủ đích: comment `safe-area-ok: <lý do>` ngay trên thẻ.
