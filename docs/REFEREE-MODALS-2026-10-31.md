# Modal trọng tài theo ảnh duyệt — 31/10/2026

## Phạm vi và yêu cầu mới nhất

- Commit nguồn: `0640080846408bbb1983497a4987fb0d573a569a`, nhánh `feat/ui-v2-modern`.
- User duyệt hai ảnh thiết kế rồi yêu cầu OTA, sau đó chốt: làm các modal theo ảnh nhưng **giữ Bốc thăm như cũ**. Phần Bốc thăm trong bảng ảnh không phải yêu cầu triển khai cuối cùng.
- Ảnh modal đổi bên: exec-eaff108e-4b0d-4072-adda-dccc10c77935.png; bảng Cấu hình/Gán sân/Bốc thăm/CCCD: exec-b85e141a-cd31-4c64-82ce-5662af7121b2.png. Đã sao lưu hai ảnh trong thư mục backup bên dưới.
- Chỉ đổi bốn giao diện V2: xác nhận đổi bên, Cấu hình trận, Gán sân và CCCD. Không sửa dữ liệu mẫu của mockup vào sản phẩm, không thêm dependency. Giá trị/sân/thông tin VĐV tiếp tục dùng dữ liệu thật như trước.

## Thay đổi

- components/match/RefereeModalSurface.tsx (mới): palette navy/cyan, khung có viền mảnh, header/nút chạm lớn, SafeAreaProvider/SafeAreaView riêng trong cửa sổ native để đo lại khi xoay. Modal đổi bên mới có icon hai chiều, nguyên nội dung/điểm giữa game động, hai nút Để sau/Đổi bên, thân cuộn khi thiếu chiều cao. Không thêm lựa chọn hay nút đóng khác.
- components/match/RefereeScorePanel.native.tsx: chỉ nối prompt V2 mới và style Gán sân, truyền refereeDesign cho CCCD. Danh sách sân thành hàng có khung, sân hiện tại viền cyan/check; có cuộn để danh sách dài không che footer Bỏ gán sân/Đóng. Bấm sân vẫn gán trực tiếp; giữ load includeBusy=false, refresh/loading/error/empty và callbacks gán/bỏ gán.
- components/match/MatchSettingsModal.tsx: chỉ V2 dùng khung mới và hàng điều khiển số có nút +/-44 px, nhãn có thể bọc hàng, vùng thân cuộn, header Lưu/Đóng luôn tách khỏi thân. Giữ sáu trường số + switch Cách 2, tất cả nhãn/helper/bounds/step, nhập số và payload cũ. Không thêm tab hoặc bỏ thiết lập. V1 giữ theme và kiểu cũ.
- components/CCCDModal.native.tsx: prop refereeDesign mặc định false, chỉ bật từ panel V2 hiện tại. Họ tên/số CCCD trong khối thông tin, ảnh Mặt trước/Mặt sau chứa trọn ảnh với contentFit contain; dọc xếp chồng, ngang hai cột và cuộn được. Giữ trạng thái thiếu số/thiếu ảnh, chỉ đọc và đóng, không thêm upload/chỉnh sửa/xác minh. Caller cũ không bật prop vẫn giữ kiểu cũ.

## Những phần được giữ nguyên theo đối chiếu nguồn

- Toàn bộ ColorCoinToss, ServeDrawPanel, JSX của modal Bốc thăm, style s của panel, ServeDrawVisuals, useServeDrawSounds và route app/match/[id]/referee.tsx. Không đổi animation, âm thanh, màu xanh/đỏ, mặt đồng xu, vòng quay hai đội, nút Áp dụng hoặc cơ chế xác nhận kết quả.
- AST đối chiếu: 16 declaration của panel (gồm draw, tải/gán/bỏ gán sân, đổi bên, Back, Start, Undo, Finish, timeout/y tế/Tiếp tục, giao bóng), tám declaration cấu hình (clamp, giá trị khởi tạo, save/close/refresh/nhập số/+/-), ba helper CCCD giống baseline. Không đổi logic chấm điểm/quyền/API hoặc navigation.
- Không sửa vấn đề tự đóng lúc xoay ngang đang được điều tra trong lượt trước. Không được ghi bản modal này là bản sửa lỗi native POP/orientation. Báo cáo điều tra riêng: /Users/admin/Projects/Pickletour/backups/2026-10-31-referee-entry-investigation/INVESTIGATION.md.
- Giữ hạ navigation dc1fb53, nền ngoài trong suốt aadff60, điều hành trận 91e067e, splash b537f64, chuông màn chính b10b061, font, tải ngầm và guard không tự reload trong màn bắt trận.

## Kiểm tra và giới hạn

- RN Web harness dùng MatchSettingsModal, CCCDModal, RefereeModalSurface và prompt thật; Gán sân lấy nguyên function CourtAssignModalFull/useTokens/style của panel. Mô phỏng Modal, safe area, native bridge, theme, image và callback dữ liệu/mutation. Không ghi API production.
- Sáu viewport 320×568,375×812,440×956,844×390,1024×768,568×320, với insets top/bottom/left/right: bốn cửa sổ nằm trong vùng an toàn, không tràn ngang; bước số/bounds và payload lưu đúng, gán trực tiếp/bỏ gán đúng payload, danh sách 12 sân cuộn tới cuối không bị footer che, CCCD chỉ đọc, prompt Để sau không đổi bên/Đổi bên gọi đúng callback, đổi hướng không tràn. Screenshot portrait/landscape lưu ở qa/.
- Trạng thái bổ sung: lỗi lưu vẫn ở modal; đang lưu khóa đóng và lưu lặp; CCCD thiếu số/ảnh; V1 không áp khung V2; danh sách sân rỗng/lỗi hiển thị đúng.
- 41/41 test hồi quy OTA/font/route chuông/ngày giải đạt. ESLint trước/sau: 0 lỗi +10 warning cũ, không có diagnostic mới. git diff --check sạch.
- Chưa kiểm chứng trên điện thoại thật; chưa xác nhận UIKit Modal/orientation, bàn phím số tùy chỉnh native hoặc lỗi tự đóng hiếm gặp. Safe area trong browser là fixture, không phải bằng chứng đã thử Dynamic Island thật.
- Giữ nguyên từng byte diff ios/Pickletourvn.xcodeproj/project.pbxproj có trước và .buildlog/, không stage/commit.

## Backup / quay lui

- Baseline aed1fa3dc8b91707f518f9315551d4492e4dd847; đã push codex/backup-before-referee-modals-20261031.
- Nguồn cũ, hai ảnh duyệt, baseline/release/QA/scripts và handover: /Users/admin/Projects/Pickletour/backups/2026-10-31-referee-modals/.
- Quay lại riêng bộ modal: kiểm tra working tree, git revert --no-edit 0640080 rồi commit/push và phát OTA mới hai nền tảng production/1.1.x. Không reset hoặc chỉ tắt bundle đã phát. Giữ Bốc thăm và các phần trước.

## OTA

- iOS: `01a190e3-c379-7032-8b7a-e38b400d42c7`; Android: `01a190e5-2b4a-7f59-9b87-bac053757282`. Kênh production, target 1.1.x, enabled=true, shouldForceUpdate=false.
- Hai nền tảng build tuần tự ở trạng thái disabled. Đã xác minh commit/hash zip, marker của bốn modal mới và các phần giữ lại, đủ 20 PNG icon, SHA-256 nền/logo splash; sau đó kích hoạt applied=2.
- Đã đọc lại metadata và public check từ bản dc1fb53 trả UPDATE đúng ID mới. Global allowed=true/forceUpdate=false; giữ auto reload khi app active và ngoài bắt trận. Trong màn bắt trận đợi rời màn theo guard cũ.
- Thời điểm xác minh UTC: 2026-10-31T07:39:44.663Z. Không đồng nghĩa mọi thiết bị đã tải/chạy bundle; chưa kiểm chứng trực tiếp trên điện thoại user.
