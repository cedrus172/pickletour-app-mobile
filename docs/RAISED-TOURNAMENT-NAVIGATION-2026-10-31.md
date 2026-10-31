# Navigation với nút Giải đấu nổi — 31/10/2026

## Yêu cầu và triển khai

- User duyệt ảnh `exec-10cae958-7b20-4249-9fcd-4b49d923c7ee.png`, yêu cầu triển khai và bổ sung độ trong suốt nhẹ cho các nút khác nút Giải đấu.
- Commit mã: `8b1157317b50ef6b1f97451dd99f721bb3f02c7b`, nhánh `feat/ui-v2-modern`.
- Chỉ đổi `components/tabbar/SportBottomBar.tsx` và `components/tabbar/SportTabIcon.tsx`. Không đổi root/router, API, splash, chuông hay màn nội dung; không thêm thư viện.
- Thanh navy bo tròn, khoét cong giữa; nút tròn cyan 58 px, cúp navy 28 px, nhô lên 20 px so với mép trên thân thanh. Thân thanh cao 64 px, chừa khoảng nâng 24 px để nút bấm và hình không nằm ngoài frame. Nút vẫn nổi rõ ngay khi tab khác đang được chọn, giống ảnh duyệt.
- Bốn nút còn lại: icon/chữ opacity 0.78 khi chưa chọn, 0.9 khi chọn; riêng nút Giải đấu và chữ opacity 1.0. Màu cyan + chấm nhỏ đánh dấu tab đang chọn. Vùng bấm không bị giảm theo opacity; mỗi cột ít nhất 44 px trên các kích thước đã kiểm tra.
- Giữ 5 mục đúng thứ tự Trang chủ/Bảng tin/Giải đấu/Xếp hạng/Khác. Không đưa Thông báo về bottom bar; giữ lọc hidden routes ở FacebookTabBar và nav v1 cũ.
- Icon SVG nét đồng bộ, không dùng font icon. Gói SVG nền nút ở dưới glyph có zIndex riêng để không che cúp sau reload. Không vẽ home indicator giả; giữ safe area hệ thống ở dưới.
- Chiều rộng hình nền/notch đo bằng onLayout của thanh thực, không lưu khóa chiều rộng màn hình. Inset hai bên = safe left/right + 12 px, đáy = max(safe bottom, 8). Xoay thiết bị đo lại, tâm notch đi theo vị trí cột tournaments trong visibleRoutes.
- Giữ API SportBottomBar/SportTabIcon, testID sport-tab-*, accessibilityRole tab/selected, tabPress có preventDefault, tabLongPress, không navigate lại tab đang chọn và haptic iOS như cũ. useId tạo ID gradient riêng cho từng instance.

## Kiểm tra và giới hạn

- ESLint hai component 0 lỗi/0 warning, git diff --check sạch. 41/41 test hồi quy OTA/font/phạm vi chuông/ngày giải đạt.
- Harness RN Web dùng BottomNavigation + SportBottomBar/SportTabIcon thật, mô phỏng safe area/haptic/Reanimated cho nhánh legacy. 5 viewport 320×568,375×812,440×956,844×390,1024×768, có inset ngang 47 px: đủ 5 mục, không có notifications/admin/chat, nhãn nằm trong cột, vùng bấm >=44 px, cúp có thể bấm ở phần nhô lên.
- Kiểm tra cả 5 trạng thái chọn, opacity khác/cúp đúng, tabPress không navigate lại tab hiện tại, preventDefault có hiệu lực, quay ngang/dọc căn lại tâm và không tràn, chuyển v1/v2 không lỗi. Kiểm tra ảnh render để phát hiện cúp bị SVG nền che và đã sửa bằng wrapper glyph zIndex=1.
- Không kiểm chứng native trên điện thoại thật, không khẳng định đã test haptic/native touch/độ trong suốt trên máy người dùng. Ảnh QA và script nằm trong backup.
- Không thay guard tải/reload khi đang bắt trận; giữ splash b537f64, chuông chỉ màn chính b10b061, nút Giải đấu/Home 7bfb47c, toàn bộ tính năng camera/quyền/Khác và trọng tài.

## Backup / quay lui

- Baseline `7d947cd`; đã push nhánh `codex/backup-before-raised-tournament-nav-20261031`.
- Backup nguồn hai component, ảnh duyệt, baseline/release và QA: `/Users/admin/Projects/Pickletour/backups/2026-10-31-raised-tournament-navigation/`.
- Khôi phục riêng bottom bar cũ: rà soát working tree, `git revert --no-edit 8b11573`, rồi phát OTA mới iOS/Android production/1.1.x. Không reset repo, không chỉ tắt bundle đã phát. Nếu quay lui UI cũ hơn, đảo navigation này trước, rồi splash b537f64 và commit liên quan sau khi rà soát conflict.
- Giữ nguyên từng byte diff local có trước ở ios/Pickletourvn.xcodeproj/project.pbxproj, giữ .buildlog/; không commit các phần này.

## OTA đã phát

- iOS production/1.1.x: `01a19090-6708-79ce-ab3b-0adbc65aa05d`.
- Android production/1.1.x: `01a19091-dfd8-7311-8707-3c7caab36a18`.
- Hai bundle enabled=true, shouldForceUpdate=false; global allowed=true/forceUpdate=false. Public check từ bản splash b537f64 trả UPDATE đúng ID.
- Build lần lượt ở trạng thái disabled, xác minh commit/hash zip, marker navigation mới và các marker Home/Giải đấu/chuông/splash, SHA-256 background/logo splash và đủ 20 PNG icon trước khi bật; đã đọc lại metadata sau kích hoạt. Không dùng force update hay thay guard trọng tài.
