# Trang Giải đấu theo ảnh duyệt — 31/10/2026

> Bản tiếp theo `7bfb47c` hoàn thiện các nút Lịch đấu, Chấm trận, Sơ đồ và Chi tiết, giữ logic/quyền hiện có; xem [TOURNAMENT-ACTIONS-HOME-BELL-2026-10-31.md](TOURNAMENT-ACTIONS-HOME-BELL-2026-10-31.md).

> Bản phát hành sau `65ba11a` giữ giao diện này và chuyển chuông vào header/góc trang, bỏ hàng chuông riêng; xem [NOTIFICATION-CORNER-2026-10-31.md](NOTIFICATION-CORNER-2026-10-31.md). Các ID bên dưới là đợt phát `d75b0ca`.

## Trạng thái phát hành

- Commit giao diện: `d75b0ca0bb158ff06ef03b78a47f85722e93315b`, đã push nhánh `feat/ui-v2-modern`.
- iOS: `01a1900f-7872-7971-abf3-f2e7f0e59e33`.
- Android: `01a19011-ea04-7c0a-a40f-949ef22f7830`.
- Cả hai đã bật trên production, target `1.1.x`, `shouldForceUpdate=false`. Public check từ bundle chuông toàn app trước trả UPDATE đúng ID. Chính sách toàn cục đọc lại: `allowed=true`, `forceUpdate=false`.
- Build lần lượt ở trạng thái disabled, xác minh SHA-256 zip khớp metadata, marker giao diện Giải đấu và chuông toàn app trong Hermes, đủ 20 icon PNG theo manifest rồi mới bật cùng một commit metadata.

## Phạm vi đã triển khai

- Nền navy, tiêu đề trắng kèm cúp/vạch chéo, ô tìm kiếm có nút lọc, ba tab trạng thái gạch cyan, lọc ngày ở bên phải.
- Poster có badge ngày/tháng, tên giải viết hoa, thông tin ngày giờ/địa điểm/số nội dung và đội. Các nội dung thi đấu chia bằng đường mảnh, có số đội, tiến trình, Đăng ký và Chi tiết; hàng Nhóm Zalo phía dưới.
- Dùng ảnh poster và dữ liệu API hiện có; không nhúng giải mẫu, giờ mẫu hay ảnh minh họa vào sản phẩm. Poster cắt giữa, bấm mở ảnh đầy đủ. Địa điểm trên thẻ rút gọn phần địa chỉ; chi tiết/nhãn trợ năng giữ địa điểm gốc.
- Giờ theo `Asia/Ho_Chi_Minh`: API giải Ý Yên trả **07:30 ngày 15/11/2026**, nên hiển thị 07:30; không chép 08:00 trong mockup. Ngày không hợp lệ không hiện NaN/badge giả.
- Giữ tìm kiếm debounce, ba trạng thái, modal lọc khoảng ngày, nhóm/thu gọn/mở rộng, refresh, poster, Zalo và route hiện có. Giữ quyền Đăng ký, Chấm trận, Lịch đấu, Sơ đồ; không thay logic đăng ký khi đủ chỗ/danh sách chờ.
- Giữ chuông toàn app, navigation 5 tab, icon trang chủ, trang Khác, quyền camera, bảng trọng tài và chính sách OTA tải ngầm/tự reload ngoài bảng trọng tài.
- Safe area của trang dùng `EdgeSafeAreaView` với top/left/right, tương thích provider của shell chung. Không thêm thư viện, không sửa native project.

## File mã nguồn

- `components/tournaments/TournamentDesign.tsx`: component hiển thị, thêm `TournamentEventRow`, giữ API export và thêm prop tùy chọn.
- `screens/tournaments.tsx`: nối component với dữ liệu/handler/quyền hiện có.
- `utils/tournamentPresentation.ts`: chuẩn hóa ngày giờ Việt Nam và khoảng ngày.
- `scripts/test-tournament-presentation.cjs`: bốn kiểm tra dữ liệu ngày giờ thực, chuyển ngày/năm, dữ liệu thiếu/sai và khoảng ngày.

## Kiểm tra và giới hạn

- 35/35 test ngày giờ, OTA và font đạt. ESLint bốn file thay đổi: 0 lỗi, 0 warning; `git diff --check` sạch.
- Tsc toàn project vẫn có lỗi cũ; không có diagnostic tại component trình bày/helper mới. Không coi toàn repo đã typecheck sạch.
- Harness render **TournamentDashboardScreen và component/shell/navigation thật**, mô phỏng native bridge, router, query và modal/calendar; fixture lấy từ API công khai. Sáu viewport: 320×568, 375×812, 440×956, 844×390, 834×1194, 1024×768; không tràn ngang.
- Đạt: tìm kiếm/xóa/không kết quả; ba tab; lọc hai ngày/áp dụng/xóa; mở/thu nhóm; đăng ký và chi tiết đúng route, không điều hướng kép; poster; handler Zalo được chặn để không mở/tham gia nhóm thật.
- Đạt các tình huống trọng tài/admin, Lịch đấu/Sơ đồ, badge MLP, đủ chỗ, không giới hạn, ngày lỗi, loading và lỗi API. Kiểm tra chuông đúng một nút và navigation vẫn 5 tab.
- Chưa kiểm tra layout native trên điện thoại thật. Kết quả harness không đồng nghĩa đã xác minh toàn bộ màn hình/luồng native của app.

## Backup và khôi phục

- Baseline trước sửa: `0227708e59db82519f9025874dd385ae2bce4680`.
- Nhánh backup đã push: `codex/backup-before-tournament-redesign-20261031`.
- Bản sao nguồn, ảnh duyệt, baseline/release metadata và QA: `/Users/admin/Projects/Pickletour/backups/2026-10-31-tournament-redesign/`.
- Chỉ quay lại trang Giải đấu cũ: rà soát working tree, `git revert --no-edit d75b0ca`, rồi phát lại OTA iOS và Android production target `1.1.x`. Giữ chuông/nav và phần native local có trước. Sau các thay đổi tương lai cần xử lý diff/conflict có chọn lọc.
- Không reset cả repo, không chỉ tắt bundle mới: thiết bị đã cài cần bundle khôi phục có ID mới. Không bật force update toàn cục.
- Giữ nguyên thay đổi local có trước tại `ios/Pickletourvn.xcodeproj/project.pbxproj` và `.buildlog/`; không stage chúng cùng giao diện/tài liệu.
