> Cập nhật tiếp: chuông đã chuyển lên toàn bộ app ở `9817013`/`7aa07d0`. Xem [GLOBAL-NOTIFICATIONS-2026-10-31.md](GLOBAL-NOTIFICATIONS-2026-10-31.md). Nội dung dưới mô tả bản icon/navigation đầu tiên.

# Icon trang chủ và navigation thể thao — 31/10/2026

## Phiên bản

- Commit giao diện: `116fe35`, nhánh `feat/ui-v2-modern`.
- Bản cũ: `259f8b7dc501709ecc215ce789d8f57486731c18`.
- Nhánh dự phòng đã push: `codex/backup-before-premium-icons-sport-nav-20261031`.
- Bản sao file trước khi sửa, hai gói OTA cũ đã tải về/kiểm tra SHA-256, và metadata OTA cũ: `/Users/admin/Projects/Pickletour/backups/2026-10-31-premium-icons-sport-nav`.
- iOS: `01a18fe2-74de-7448-852d-b8ddeb975704`.
- Android: `01a18fe3-2c43-755b-8d96-a11721b64425`.
- Hai OTA: production, target `1.1.x`, enabled=true, shouldForceUpdate=false. Public check từ bundle cũ trả UPDATE đúng ID mới. Global allowed=true, forceUpdate=false.

## Phạm vi đã triển khai

- V2: thay đủ 20 SVG phẳng bằng PNG alpha cyan/bạc theo ảnh duyệt. Asset 256×256, tổng 2.026.958 byte; mỗi ID giữ route và thứ tự cũ. Dùng imagegen tích hợp để tạo sheet theo ảnh duyệt, sau đó tách ô và chuẩn hóa kích thước; nguồn/ảnh duyệt nằm trong thư mục backup.
- V2: navigation sát đáy kiểu thể thao, viền góc vát, nền chọn hình lục giác/trapezoid cyan tối, 5 tab Trang chủ / Bảng tin / Giải đấu / Xếp hạng / Khác. SVG cho glyph navigation, không phụ thuộc font icon.
- Chuông thực sự hiển thị góc phải trên trang chủ, inset.top + 8, nút 44×44; chấm chưa đọc lấy từ notificationCenterApiSlice. Route /notifications và ô Thông báo trong lưới 20 tính năng vẫn giữ.
- Expo Router tiêu thụ href:null trước descriptor: custom bar lọc thêm route notifications khi v2=true. V1 giữ navigation cũ.
- Không đổi header/hero, lối tắt, các section trang chủ khác, trang Khác, quyền camera, trọng tài hay chính sách reload OTA. Không thêm thư viện hoặc thay native binary.

## File

- app/(tabs)/index.tsx: gắn chuông theo safe area, query chưa đọc.
- app/(tabs)/_layout.tsx: ẩn entry tab Thông báo ở V2, giữ route.
- components/home/HomeFeatureIcon.tsx và HomeNotificationButton.tsx.
- components/tabbar/FacebookTabBar.tsx, SportBottomBar.tsx, SportTabIcon.tsx.
- assets/images/home-premium-v1/: 20 PNG và manifest SHA-256 theo ID.

## Kiểm tra và giới hạn

- 31/31 regression OTA/font đạt, ESLint 0 lỗi (3 cảnh báo có sẵn).
- Browser harness dùng component navigation, nút chuông, icon thật và FeatureItem/styles lấy từ mã trang chủ. Chỉ mô phỏng native bridge, router và safe inset; không phải screenshot của toàn app trên iPhone thật.
- 5 viewport: 320×568, 375×812, 440×956, 844×390 có inset ngang, 1024×768. Kiểm tra 5 tab, không tab Thông báo, không tràn ngang, vùng chạm >=44, selected state, tabPress/preventDefault, route chuông, đủ 20 icon + chuông. Không pageerror.
- Cả hai gói native Hermes đã build/upload thành công; đọc zip xác nhận đúng SHA-256 đủ 20 PNG; hash zip trùng metadata. Build ở trạng thái disabled rồi mới bật sau kiểm tra.
- Project tsc vẫn có nhiều lỗi có sẵn (implicit any, Lottie props, native types…); không dùng kết quả toàn project làm bằng chứng typecheck sạch. Các component mới không có lỗi trong lần kiểm tra này.
- Cần người dùng kiểm tra độ đẹp và hành vi native trên điện thoại sau OTA. Bản xem component có header mẫu để kiểm tra khung; không thêm header mẫu vào app thật.
- ios/Pickletourvn.xcodeproj/project.pbxproj và .buildlog/ là thay đổi có trước, giữ nguyên, không đưa vào commit.

## Quay về giao diện cũ

Không reset cứng cả repo. Tạo commit đảo riêng thay đổi giao diện, giữ mọi sửa trọng tài/font/OTA ở baseline:

```sh
git status --short
git revert --no-edit 9817013 7aa07d0 116fe35
npx hot-updater deploy -p ios -t '1.1.x' -c production -m 'Khôi phục icon và navigation trước bản thử thể thao'
npx hot-updater deploy -p android -t '1.1.x' -c production -m 'Khôi phục icon và navigation trước bản thử thể thao'
```

Nếu đã có sửa giao diện tiếp theo, rà soát diff/conflict trước khi revert. Phát mã cũ thành bundle mới giúp cả máy đã nhận bản thử quay về; không chỉ dựa vào việc tắt bundle mới. Không bật forceUpdate toàn cục. File nguồn cũ nằm ở thư mục source/ trong backup, baseline.json giữ ID OTA cũ. Hai file ota-before-ios.zip và ota-before-android.zip đã lưu offline, checksum đối chiếu trong baseline-artifacts-verified.json.
