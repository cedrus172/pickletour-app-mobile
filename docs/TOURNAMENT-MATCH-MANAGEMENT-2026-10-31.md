# Trang điều hành trận theo ảnh duyệt — 31/10/2026

## Mã và phạm vi

- Commit: `91e067e05b86bc7a692ff47b76f0d1055acb492b`, nhánh `feat/ui-v2-modern`. User duyệt ảnh `exec-0097524a-426e-48d1-841e-08c8c9ae48a4.png` rồi yêu cầu triển khai.
- Chỉ sửa file sản phẩm `app/tournament/[id]/manage.tsx`. Không thêm dependency, không đổi API/router/root, không sửa trang referee hay bộ tính điểm. Nút Giải đấu nổi và độ trong suốt bốn tab của 8b11573 được giữ nguyên trong OTA này.
- Theme navy/cyan dành riêng trang quản lý V2 qua useManageTheme; V1 vẫn lấy theme gốc. Backdrop dark đổi navy, chip lọc/checkbox tăng tương phản, header Chức năng giữ native stack và wrapper phạm vi chuông hiện có. Trang sâu này không thêm chuông hoặc bottom navigation.
- Tìm trận, sắp xếp/chiều/sân, Hiện BYE và Hiện KO chờ bảng, metadata bracket, tabs, nhóm bracket/stage/count và chọn tất cả vẫn còn. Các chip co/bọc hàng theo chiều rộng; header vẫn đo onLayout và tự ẩn khi cuộn như cũ.
- Thẻ trận có checkbox + mã + status ở trên; đội A/B hai dòng có marker, tên tối đa hai dòng, cảnh báo bận sân còn nguyên. Tỉ số lấy từ scoreText cũ: 1–3 game chia cột theo đội, chưa có điểm hiện gạch ngang. Nhiều hơn 3 game hoặc chuỗi không chuẩn (ví dụ RET) giữ nguyên toàn bộ trong ScorePill có maxWidth 100%, không vứt bỏ điểm hay tính điểm mới. Các alias live/finished/pending dùng normStatus cũ để chọn nhãn/màu trạng thái.
- Metadata còn sân, bảng/vòng, thứ tự, video. Khung live viền emerald, khung khác slate, chọn trận viền cyan.
- ActionButtons chuyển từ cuộn ngang sang grid: Biên bản TT/Gán sân/Gán trọng tài; có video thì Mở video/Sửa video/Xóa video; không có thì Thêm video. Bắt trận cyan nổi rõ, giữ nguyên điều kiện canStart || canManage và route helper. Grid 3 cột khi vùng thật >=330 px, 2 cột khi hẹp hơn; ô lẻ giãn hàng. Handler ô grid stopPropagation để bấm thao tác không mở thêm viewer của thẻ.
- Biên bản, sheet gán sân/ref, mở/sửa/xóa video, batch selection/video/ref, menu chức năng, chế độ tên, socket merge/invalidate và lọc BYE/KO không đổi logic. Thao tác xóa video vẫn mở dialog xác nhận URL rỗng, không xóa trực tiếp.

## Kiểm tra và giới hạn

- 41/41 test hồi quy OTA/font/route chuông/ngày giải đạt. ESLint trước/sau cùng 5 lỗi +16 warning cũ, không có diagnostic mới; không tuyên bố toàn file lint sạch. Duplicate extraData và nợ kiểu có trước không sửa trong task giao diện. git diff --check sạch.
- Đối chiếu AST 20 declaration xử lý nghiệp vụ trước/sau hoàn toàn giống: scoreText/normStatus, nhóm kết thúc, lọc KO, quyền trọng tài/route, HTML biên bản/export, lưu/batch video/ref, refresh, mở sheet, chọn trận, socket queueUpsert, renderMatchRow và pipeline merge/group. 8 case scoreColumns: rỗng/0/nhiều game/dấu ':' và '–'/chuỗi RET/5 game không bị cắt dữ liệu.
- RN Web harness render ManageScreen thật, utils matchDisplay/refereeMatchRoute/labels thật; mô phỏng native stack, theme, API/sockets, insets, font, sheet, Print/FileSystem/Sharing. 5 viewport 320×568,375×812,440×956,844×390,1024×768: action nằm trong card không chồng, điểm 6/3 rõ, chưa có điểm giữ —, 7/5 nút khi có/không video, chọn/batch/viewer, search/sort/check/tabs, xoay không tràn. Socket đổi điểm đơn +3 game phản ánh lên UI.
- Kiểm tra bổ sung bằng mock mutation: sửa/xóa/thêm video gọi đúng matchId và URL; xóa gửi chuỗi rỗng sau xác nhận; tạo HTML biên bản đủ tên đội; menu chế độ tên thay trạng thái; 5 game có summary đủ và nằm trong card. Owner vào được; guest và referee-only vẫn bị chặn trang như gate gốc.
- Chỉ kiểm tra trạng thái menu tên: pipeline mergedAllMatches cũ không có labelOfPair/nameMode trong dependency nên fixture chưa xác nhận tên đổi ngay khi đổi mode mà chưa có snapshot mới. Logic này được giữ nguyên; đây không phải sửa chế độ tên. Không mở rộng phạm vi sửa nghiệp vụ này trong task visual.
- Chưa kiểm chứng trên điện thoại thật; chưa xác nhận safe area/hiệu ứng header/keyboard/Print/haptic native thực tế. Sheet mock xác nhận wiring và matchId, không phải kiểm chứng nội bộ sheet hoặc ghi API production.
- Giữ nguyên từng byte diff native local có trước và .buildlog/, không commit các phần này. Không đổi cơ chế tải/reload OTA và guard màn bắt trận.

## Backup / quay lui

- Baseline `fdfb803`; đã push `codex/backup-before-match-management-20261031`.
- Nguồn cũ, ảnh duyệt, baseline/release/QA/scripts ở `/Users/admin/Projects/Pickletour/backups/2026-10-31-tournament-match-management/`.
- Khôi phục riêng trang này: rà soát working tree, `git revert --no-edit 91e067e`, rồi phát OTA mới iOS/Android production/1.1.x. Không reset repo hoặc chỉ tắt bundle đã phát. Giữ navigation 8b11573, splash b537f64, chuông b10b061 và mọi tính năng trước đó. Nếu quay lui xa hơn, đảo commit mới trước và rà soát conflict.

## OTA đã phát

- iOS production/1.1.x: `01a190ae-d037-7a6e-b428-ed94eea67744`.
- Android production/1.1.x: `01a190b0-af33-7c6f-90b3-b341aafb577d`.
- enabled=true, shouldForceUpdate=false cho cả hai; global allowed=true/forceUpdate=false. Public check từ bản navigation 8b11573 trả UPDATE đúng ID mới.
- Hai nền tảng build lần lượt ở trạng thái disabled; đã xác minh commit/hash zip, marker trang quản lý mới, navigation/chuông/Giải đấu/splash, SHA-256 background/logo splash và đủ 20 PNG icon, sau đó mới bật. Đã đọc lại metadata và public update sau kích hoạt.
