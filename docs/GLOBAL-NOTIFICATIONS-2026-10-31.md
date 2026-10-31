# Chuông Thông báo toàn app — 31/10/2026

> Ghi chép phát hành lịch sử `9817013`/`7aa07d0`. User đã yêu cầu bỏ hàng riêng; bố trí hiện tại là góc trang/header ở `65ba11a`, xem [NOTIFICATION-CORNER-2026-10-31.md](NOTIFICATION-CORNER-2026-10-31.md). Khi revert bản này từ trạng thái mới nhất cần đảo `7bfb47c` rồi `65ba11a` trước để gỡ import helper trong các page header.

## Trạng thái

- Code: `9817013` (bao gồm `7aa07d0`), nhánh `feat/ui-v2-modern`, đã push.
- iOS production/1.1.x: `01a18ff4-b7c5-749d-80c2-c3ec421218f4`.
- Android production/1.1.x: `01a18ff5-b89a-7582-8d9b-63839e8efb85`.
- Cả hai enabled=true, shouldForceUpdate=false; public check từ bản icon/navigation trước trả UPDATE đúng ID. Global allowed=true, forceUpdate=false.

## Phạm vi

- `components/GlobalNotificationShell.tsx` được gắn ngay dưới SafeAreaProvider gốc trong `app/_layout.tsx`, bao quanh root SafeAreaView/Stack; không lọc route, không giới hạn tab hay V2. Chuông chỉ chờ font và cấu hình shell sẵn sàng, không xuất hiện trên màn loading trước khi app sẵn sàng.
- Vùng chuông cao 52 logical px + top inset, nút 44×44 ở góc phải. Đây là hàng dành riêng ngoài vùng nội dung, không phải overlay lên search/settings/camera của màn hình. Nội dung được flex theo phần còn lại; không đổi thứ tự các section.
- Header dùng top safe area đúng một lần. Provider native lồng trong vùng content đo lại frame sau hàng chuông, kèm SafeAreaInsetsContext top=0 cho hook JS; giữ inset left/right/bottom. Chỉ ghi đè JS context là chưa đủ vì native SafeAreaView đọc nearest native provider.
- `HomeNotificationButton` giữ style/icon cũ nhưng dùng router.navigate('/notifications') để bấm khi đã ở trung tâm thông báo không push thêm cùng route.
- Query chưa đọc chuyển khỏi HomeScreen sang shell dùng chung, polling 30 giây; bỏ qua khi khách/chưa sẵn sàng, khách không hiện chấm số của tài khoản trước. Gỡ nút/query riêng ở trang chủ.
- `HotUpdateIndicator` thêm rightOffset mặc định 0; root dùng 56 khi có chuông để thanh tiến trình nằm bên trái, không chồng lên nút.
- Giữ bộ 20 icon PNG và navigation 5 tab ở `116fe35`. Bản chuông `9817013` chưa bao gồm trang Giải đấu mới; sau khi user duyệt, giao diện đó đã được triển khai ở `d75b0ca` và phát OTA riêng, xem [TOURNAMENTS-2026-10-31.md](TOURNAMENTS-2026-10-31.md). Không sửa logic chấm điểm hay cơ chế reload bảo vệ màn bắt trận.
- Đây là nút trong shell điều hướng của app. Native modal/permission/splash/force-update là các lớp cửa sổ riêng cao hơn shell, không chèn chuông lên các lớp đó.

## Kiểm tra

- 31/31 regression OTA/font đạt sau sửa root. ESLint 0 lỗi (7 warning root có sẵn); component mới 0 warning. Tsc toàn project vẫn còn lỗi cũ, không phát sinh lỗi ở các component thay đổi.
- RN Web harness render shell/nút/indicator thật, mô phỏng native bridge/query/router. 5 viewport: 320×568, 375×812, 440×956, 844×390, 1024×768. Dùng 11 giá trị route trong fixture để kiểm tra shell không phụ thuộc tab; đây không phải render 55 page thật.
- Kiểm tra đúng một chuông, content bên dưới hàng chuông, không chồng action mô phỏng/indicator, safe inset, boot hidden/visible không mất state của child, đăng nhập/khách, navigate và không overflow. Kết quả tại thư mục qa/ trong backup.
- Cả hai gói build Hermes thành công ở trạng thái disabled; SHA-256 zip khớp metadata, bytecode có marker global-notification-bar/content, đủ 20 ảnh icon cũ theo checksum. Bật phát hành sau kiểm tra rồi đọc public update endpoint.
- Chưa xác nhận native layout trên điện thoại thật. Referee hiện dùng viewport onLayout và ScrollView cho nội dung, sẽ nhận chiều cao còn lại sau hàng chung; cần user kiểm tra cảm nhận không gian trên máy.
- Không thêm dependency, không sửa binary/native project. ios/Pickletourvn.xcodeproj/project.pbxproj và .buildlog/ là phần local có trước, giữ nguyên.

## Backup / quay lui

- Trước sửa: `6d9a1f24a6f3b9378368558a86b5672d24c998af`.
- Nhánh dự phòng đã push: `codex/backup-before-global-notifications-20261031`.
- Backup nguồn, baseline.json, release.json, QA: `/Users/admin/Projects/Pickletour/backups/2026-10-31-global-notifications`.
- Chỉ bỏ chuông toàn app, giữ icon/navigation mới: rà soát working tree rồi `git revert --no-edit 9817013 7aa07d0`; phát lại iOS/Android production target 1.1.x, không force update.
- Nếu quay về cả icon/navigation cũ ở 259f8b7, đảo các commit global trước rồi 116fe35: `git revert --no-edit 9817013 7aa07d0 116fe35`. Không chỉ revert 116fe35 khi shell global còn import nút đã bị xóa.
- Sau các thay đổi tương lai, xử lý diff/conflict có chọn lọc trước khi revert; không reset cả repo. Không chỉ tắt metadata OTA vì thiết bị đã nhận bản mới cần bundle khôi phục có ID mới.
