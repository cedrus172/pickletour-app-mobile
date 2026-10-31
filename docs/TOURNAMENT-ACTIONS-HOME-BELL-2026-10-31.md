# Nút Giải đấu và chuông trang chủ — 31/10/2026

## Trạng thái phát hành

- Commit mã: `7bfb47cbf71f8f8b9668381a956b4a3e556e2a39`, đã push nhánh `feat/ui-v2-modern`.
- iOS production/1.1.x: `01a19056-2a7d-7ab5-9718-2a29f29462bb`.
- Android production/1.1.x: `01a19057-6603-7cbc-974b-16f8eaae2b1f`.
- Cả hai đã bật, shouldForceUpdate=false. Public check từ bản chuông góc trang trước trả UPDATE đúng ID; global allowed=true/forceUpdate=false.
- Build lần lượt ở trạng thái disabled, đối chiếu hash zip/commit/target, đủ 20 PNG theo manifest và marker home-notification-corner/tournament-action-grid/global trong Hermes rồi mới bật.

## Yêu cầu và thay đổi

### Các nút ở trang Giải đấu

- User yêu cầu thiết kế cả Lịch đấu, Chấm trận, Sơ đồ/Xem sơ đồ và Chi tiết cho giải đang diễn ra/đã kết thúc; trước đó nút phụ chỉ là chữ và icon.
- `components/tournaments/TournamentDesign.tsx`: các nút có nền/viền, cùng minHeight 48, bo góc 10, icon và chữ căn giữa. Lịch đấu dùng cyan/navy, Sơ đồ navy xanh, Chi tiết nền dịu có chevron phía sau; giữ gradient cyan cho Đăng ký và cam cho Chấm trận.
- Thêm grid nội bộ đo chiều rộng **của vùng nút** qua onLayout. Bốn nút chia 2×2; ba nút nằm một hàng nếu vùng rộng từ 360 px, thiếu chỗ chia hai hàng với nút cuối đầy hàng; hai nút chia đều, một nút đầy hàng. Vì đo vùng chứa nên hoạt động cả trong thẻ tablet nhiều cột, không dựa chỉ vào kích thước cửa sổ.
- Giữ thứ tự action và các callback/quyền của screens/tournaments.tsx; file dữ liệu này không đổi. Chi tiết vẫn mở đúng giải, không làm nút Đăng ký điều hướng kép. Không ẩn đăng ký của admin ở giải kết thúc hay đăng ký danh sách chờ.

### Chuông bị mất ở trang chủ

- User xác nhận các trang khác đã đúng nhưng trang chủ mất chuông. Home trước dựa vào overlay ở root, trong khi phần lớn trang kia có nút đặt trong header.
- `components/home/HomeDesign.tsx`: đặt NotificationHeaderActions trực tiếp trong HomePage, absolute top=8, right=max(insetRight,16), sau children của page nên nằm trên ScrollView và cố định khi cuộn; không dành thêm hàng ngang.
- `app/(tabs)/index.tsx`: gỡ headerRight cũ đang nằm trong options của tab header bị ẩn. Không đổi hero, logo, nội dung, điều hướng hay query.
- Nút tiếp tục dùng context/query/chấm chưa đọc/router.navigate/tiến trình OTA dưới chuông đã có. Các trang khác không đổi.
- Harness tái hiện được trường hợp callback header ẩn vẫn mounted/đăng ký vị trí khiến root fallback mất: HomePage cũ không có nút nhìn thấy, HomePage mới vẫn có đúng một nút. Đây là tình huống mô phỏng, chưa có log native từ máy user để khẳng định toàn bộ nguyên nhân trên thiết bị.

## File thay đổi

- `components/tournaments/TournamentDesign.tsx`.
- `components/home/HomeDesign.tsx`.
- `app/(tabs)/index.tsx`.

Không thêm dependency, không sửa binary/native project, không sửa logic chấm điểm/bốc thăm/quyền camera/trang Khác/OTA reload. Giữ nav 5 tab, bộ icon và các thay đổi trước.

## Kiểm tra và giới hạn

- ESLint ba file: 0 lỗi, 0 warning; git diff --check sạch. 35/35 kiểm tra hồi quy ngày giờ/OTA/font đạt.
- Screen Giải đấu/component/shell/nav thật trong RN Web harness: các luồng cũ vẫn đạt ở 6 viewport 320×568,375×812,440×956,844×390,834×1194,1024×768.
- Kiểm tra riêng nhóm nút ở 5 viewport 320–1024 px: dữ liệu giải THPT A Trần Hưng Đạo đã kết thúc lấy từ API công khai, role admin mô phỏng; xác minh 3 nội dung đều có grid 2×2, minHeight 48, không tràn ngang, từng nút mở đúng route. Trạng thái đang diễn ra/trọng tài dùng bản sao DTO với status/role fixture, xác minh Chấm trận, không Đăng ký; guest giữ đúng quyền. Có kiểm tra chữ lớn qua CSS trong harness, không coi là xác minh Dynamic Type native.
- HomePage thật với hero/nội dung/router/query/native bridge mô phỏng: tái hiện trước sửa, kiểm tra sau sửa ở 5 viewport 320–1024 px; có header ẩn giữ mounted, chỉ một chuông nhìn thấy, vùng bấm 44×44, safe area, giữ vị trí khi cuộn, chuyển tab rồi về nhiều lần, guest, boot ready và navigate.
- Chưa kiểm tra trên điện thoại thật; fixture HomePage không phải toàn bộ HomeScreen native. Các bản build Hermes không thay thế kiểm tra native layout trên máy user.

## Backup và quay lui

- Baseline: `b2de567`; nhánh đã push `codex/backup-before-tournament-actions-home-bell-20261031`.
- Nguồn trước sửa, ảnh user, baseline/release và QA: `/Users/admin/Projects/Pickletour/backups/2026-10-31-tournament-actions-home-bell/`.
- Đảo toàn bộ: rà soát working tree, git revert --no-edit 7bfb47c rồi phát OTA mới iOS/Android production/1.1.x. Cách này cũng trả phần chuông trang chủ về trạng thái cũ; nếu chỉ muốn trả thiết kế nút thì đảo riêng diff TournamentDesign.tsx và giữ hai file Home.
- Nếu quay lui tiếp 65ba11a/global/icon, phải đảo 7bfb47c trước vì HomeDesign hiện import helper trong GlobalNotificationShell. Không reset toàn repo, không chỉ tắt bundle; thiết bị đã nhận cần gói khôi phục có ID mới.
- Giữ diff native có trước tại ios/Pickletourvn.xcodeproj/project.pbxproj và .buildlog/.
