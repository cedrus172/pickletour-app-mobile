# Giao diện V3 Fresh (nền sáng) — hướng dẫn cho người sửa code

App có 2 phiên bản giao diện, chọn ở **Khác → Cài đặt → Giao diện** (lưu SecureStore `PREF_UI_VERSION`,
đổi xong app tự nạp lại). Phiên bản là **hằng số suốt phiên chạy** nên dùng được ở cấp module.

```ts
import { IS_V3, sk, V3 } from "@/hooks/uiVersion";
sk(giáTrịV2, giáTrịV3)   // chọn theo phiên bản — dùng được trong StyleSheet.create ở cấp module
IS_V3                    // boolean hằng
V3.blue / V3.lime / V3.ink / V3.bg …   // bảng màu V3
```

Thử nhanh trên simulator: `EXPO_PUBLIC_FORCE_UI_VERSION=v3 EXPO_PUBLIC_HIDE_LOGBOX=1 npx expo start`.

## Nguyên tắc

1. **V2 phải giữ nguyên 100%**: mọi giá trị V2 đang có là tham số đầu của `sk(...)`, không sửa/xoá.
2. **V3 = bố cục của V2 + bảng màu sáng.** Chỗ nào code rẽ nhánh `v2` để chọn *bố cục* thì V3 đi theo
   nhánh V2; chỗ nào `v2` dùng để chọn *màu tối* thì V3 lấy màu sáng.
   - `const v2 = useUiVersion() === "v2"` → `const v2 = useUiVersion() === "v2" || IS_V3;`
     (tương tự với `theme.version === "v2"`).
   - `const isDark = v2 || scheme === "dark"` → `const isDark = (v2 && !IS_V3_LIGHT) || scheme === "dark";`
3. Màn dùng `useThemeTokens()` / `pal()` / `useTheme()` đã tự sáng ở V3 — chỉ cần sửa màu viết cứng.
4. Lớp phủ tối trên ảnh/video, chữ trắng trên ảnh, bảng điểm trọng tài, bàn game, màn camera/live studio:
   **giữ nguyên** (tối có chủ đích).
5. Hiệu ứng bấm nút: `TouchableOpacity`/`Pressable` import từ `react-native` đã tự có hiệu ứng nhún ở V3
   (plugin `babel/press-fx-plugin.js` → `components/ui/PressFx.tsx`). Không cần tự thêm.

## Bảng quy đổi màu V2 (tối) → V3 (sáng)

| Vai trò | V2 (ví dụ) | V3 |
|---|---|---|
| Nền trang | `#020B1C` `#041021` `#041329` `#040E20` `#06152B` | `#F2F6FC` (gradient: `#F7FAFF → #EEF4FC`) |
| Thẻ / bề mặt | `#071D31` `#082138` `#0A1B34` `#061B33` `rgba(7,27,52,.9)` | `#FFFFFF` |
| Bề mặt phụ / ô nhập | `#0C2945` `#0E2244` `#0B3554` `rgba(255,255,255,.04–.10)` | `#F5F8FD` / `#EEF3FA` |
| Viền | `#174A6C` `rgba(80,170,230,.25)` `rgba(92,180,255,.2)` | `rgba(16,42,92,0.10)` (đậm: `0.16`) |
| Chữ chính | `#FFFFFF` `#F0F6FF` `#EAF3FF` (trên nền tối) | `#0B1B3A` |
| Chữ phụ | `#DCEBFA` `#C4D6EC` | `#243450` |
| Chữ mờ | `#91AECE` `#8FAAC8` `#A9C2D9` `#94B3D0` | `#5F6F8A` (rất mờ: `#97A3B8`) |
| Màu nhấn | cyan `#08CDF5` `#12B6F3` `#12C8EC` `#13D5EE` `#08BDF5` | `#1466F2` (sáng hơn: `#2F8BFF`) |
| Nền nhấn nhạt | `rgba(8,189,245,.10–.16)` | `rgba(20,102,242,0.08–0.12)` |
| Chữ trên nền nhấn | `#04121f` `#042139` | `#FFFFFF` |
| Xanh chanh | volt `#CDE818` | nền: `#C5F433` + chữ `#12300A`; chữ/icon trên nền sáng: `#5E9C00` |
| Thành công / cảnh báo / lỗi | `#22D879` / `#FFB000` / `#FF584C` | `#16A34A` / `#D97706` / `#DC2626` |
| Gradient hero navy | `#06142B → #0B4C8C` … | khối hero giữ chữ trắng: `#2F8BFF → #1466F2`; khối thường: nền trắng + chữ `#0B1B3A` |
| Bóng thẻ | (không có / đen) | `shadowColor "#1B3A7A"`, opacity `0.08–0.12`, radius `12–16`, offset y `4–6`, elevation `3` |

Nút chính V3: nền gradient `#2F8BFF → #1466F2` (hoặc `#1466F2`), chữ trắng. Nút nổi bật phụ: nền xanh chanh
`#C5F433`, chữ `#0B1B3A`.

## Tông sáng / tối của V3

V3 có hai tông, chọn ở **Khác → Giao diện** (V2 / Sáng / Tối) hoặc Hồ sơ → Cài đặt. Lựa chọn lưu ở SecureStore
`PREF_UI_V3_THEME`, đổi xong app tự nạp lại (`applyUiAppearance(version, theme)`).

- **V3 Sáng**: nền sáng, xanh dương + xanh chanh.
- **V3 Tối** (mặc định của app — máy chưa từng chọn giao diện sẽ chạy tông này): vẫn bố cục V3 (trang chủ mới, thanh tab mới, hiệu ứng bấm/chuyển trang) nhưng dùng **màu của V2**.

Quy ước khi viết mã:

| Cần gì | Dùng |
| --- | --- |
| Rẽ nhánh theo **bố cục** V3 (thành phần chỉ có ở V3, hiệu ứng) | `IS_V3` |
| Rẽ nhánh theo **màu sáng** (nền trắng, chữ đậm, bóng đổ nhạt…) | `IS_V3_LIGHT` — không dùng `IS_V3` |
| Giá trị màu/kiểu V2 ↔ V3 sáng | `sk(v2, v3)` — V3 tối tự nhận giá trị V2 |
| Màu của thành phần chỉ có ở V3 (HomeV3*, FreshBottomBar, banner V3) | token trong bảng `V3` (tự đổi `V3_LIGHT` / `V3_DARK`) |

Thêm màu mới cho thành phần chỉ có ở V3 thì thêm token vào **cả** `V3_LIGHT` và `V3_DARK` trong `hooks/uiVersion.ts`,
đừng viết cứng mã màu sáng. Thử nhanh trên simulator: `EXPO_PUBLIC_FORCE_UI_VERSION=v3 EXPO_PUBLIC_FORCE_UI_THEME=dark`.

