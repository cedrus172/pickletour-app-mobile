# Rà soát icon sau OTA — 31/10/2026

## Triệu chứng và nguyên nhân

User báo icon Chiến thắng ở hồ sơ và icon Thu phí ở Đăng ký thành dấu hỏi ngay sau OTA. Cả hai component dùng FontAwesome5 (`trophy` U+F091 và `coins` U+F51E), chỉ có trong style solid.

Pipeline trước chỉ cách ly sáu bộ AntDesign/Feather/Ionicons/MaterialCommunityIcons/MaterialIcons/Octicons. FontAwesome còn tên chung; FontAwesome5 không có trong APP_ICON_FONTS, nên không qua font gate/copy bền vững trước khi mở màn hình. Đây là lỗ hổng bao phủ cùng nhóm lỗi font sau bridge reload đã xử lý trước đó.

Một chi tiết quan trọng: createMultiStyleIconSet của Expo dựng public `.font` từ descriptor gốc, còn child factory mới nhận tên cách ly từ Metro. Vì vậy không spread trực tiếp FontAwesome5.font; phải lấy `.StyledIconSet(style).font` để preload đúng alias mà component thật sử dụng.

## Sửa — source 6dbb27f

- Generator thêm FontAwesome và ba TTF FontAwesome5 Regular/Solid/Brands; Light dùng chung Regular, không nhân đôi file.
- Manifest ánh xạ đúng FontAwesome5Free-Regular/Light/Solid/Brand. Có 10 file font cách ly, 11 khóa family đầu vào; alias Light/Regular gộp thành một font thực tế.
- APP_ICON_FONTS nạp FontAwesome5 qua child factories regular/light/solid/brand. Cơ chế copy font vào documentDirectory/icon-fonts-v1 và alias mới mỗi JS boot giữ nguyên.
- app/schedule/index.tsx đổi import MaterialCommunityIcons từ react-native-vector-icons sang Expo để cùng đi qua resolver/preload. Tất cả tên icon hiện hữu trong file đã đối chiếu có trong glyph map Expo.
- app/contact.tsx sửa AntDesign facebook-square (không tồn tại) thành facebook. Không đổi bố cục/nút/handler.
- Không thay icon ở trang Hồ sơ/Đăng ký, không đổi glyph table, số liệu, quyền, UI, âm thanh, trọng tài/bốc thăm hay chính sách OTA. Không thêm dependency/native module.

Mười file source/asset: app/contact.tsx; app/schedule/index.tsx; utils/iconFonts.ts; scripts/generate-isolated-icon-fonts.cjs; scripts/test-isolated-icon-fonts.cjs; assets/fonts/icons/index.ts; bốn TTF FontAwesome, FontAwesome5_Regular, FontAwesome5_Solid, FontAwesome5_Brands.

## Bằng chứng kiểm tra

- Test mới thất bại trên pipeline cũ vì thiếu asset/nạp FontAwesome5; sau sửa 13/13 test font đạt. Bao gồm checksum SFNT, glyph/metrics byte-identical, native name riêng, Metro web/native, preload đủ 10 font qua child factory, copy bền vững, dùng lại file và alias khác sau JS boot.
- 47/47 test tổng font/OTA/route thông báo/ngày giờ đạt. ESLint source sửa 0 lỗi; 8 cảnh báo cũ ở Lịch cá nhân và Liên hệ.
- Audit 211 file có import icon: tám bộ icon đang dùng; 1.441 tên icon literal/nhánh điều kiện tĩnh đều hợp lệ sau sửa Facebook. Có 100 vị trí tên động không thể kết luận mọi giá trị chỉ bằng quét tĩnh; chúng được bảo vệ ở cấp font family. Không tuyên bố đã chạy mọi trạng thái của mọi page.
- CoreText/UIKit trên iOS Simulator: 23.950 lượt glyph ở chín kích cỡ và đăng ký lại khi UIFont còn giữ; không thiếu glyph mới ở bốn font bổ sung, gồm trophy/coins. Kiểm tra nguồn Expo trước: upstream font-awesome-logo-full U+F4E6 không có glyph trong ba file FontAwesome5 gốc; loại riêng trường hợp sẵn có đó khi so sánh, không sửa vendor. Không có tên literal này trong app.
- Các lần đăng ký font gốc trùng tên với bản native trả 305; font cách ly đăng ký thành công, đăng ký lại cùng file trả 105 (đã đăng ký). Đây là harness font, không phải tái hiện đầy đủ bridge reload trên iPhone user.
- Giữ nguyên diff local ios/Pickletourvn.xcodeproj/project.pbxproj và .buildlog/. Không sửa native binary; bản vá dùng JS + asset với expo-font đã có.

## Backup và quay lại

Nhánh codex/backup-before-icon-font-coverage-20261031 tại 6637cad, đã push. Thư mục /Users/admin/Projects/Pickletour/backups/2026-10-31-icon-font-coverage/ chứa nguồn trước sửa, baseline, audit, test/log/native harness, metadata và gói phát hành. Quay lại riêng bản vá: rà working tree rồi git revert --no-edit 6dbb27f, kiểm tra/phát OTA mới cả hai nền tảng. Không reset repo hoặc chỉ tắt bundle; giữ giao diện giải đấu 4f5ae6c và Tổng quan 28c1129. Không coi đây là sửa lỗi hiếm tự đóng trọng tài khi xoay.

## Phát hành

Đã build/upload iOS rồi Android ở trạng thái disabled, kiểm tra hash zip local/file server/metadata và SHA-256 của đủ 10 TTF cách ly trong từng gói, đủ 20 PNG icon/splash/logo và marker các màn trước. Sau khi đạt mới kích hoạt; đọc lại metadata và public check từ OTA 4f5ae6c trả UPDATE đúng ID mới. Global allowed=true/forceUpdate=false.

| Nền tảng | Bundle ID | Kênh | Target | Bật | Bắt buộc |
|---|---|---|---|---|---|
| ios | `01a1920c-eaaa-7425-ac2e-e991ef765e7d` | `production` | `1.1.x` | `true` | `false` |
| android | `01a1920e-07e0-7d4f-9d64-175df2b03532` | `production` | `1.1.x` | `true` | `false` |

Xác minh UTC: `2026-10-31T13:04:40.486Z`. Giữ auto reload ngoài màn bắt trận; đang bắt trận chờ rời màn. Không yêu cầu force-quit làm cách xử lý icon mặc định. Thiết bị phải chạy đúng bundle mới; cần user kiểm tra ngay sau OTA warm reload để xác nhận trường hợp thực tế.

