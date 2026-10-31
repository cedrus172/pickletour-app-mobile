# Chuông chỉ ở màn chính — 31/10/2026

## Trạng thái

- Commit mã: `b10b0612d71ffa3df828432975575ba5eb3b7836`, đã push nhánh `feat/ui-v2-modern`.
- iOS production/1.1.x: `01a19065-615c-7905-8c21-8a2398414bc7`.
- Android production/1.1.x: `01a19067-54ff-75d3-80ee-ecd7c22d3b9b`.
- Hai bundle đã bật, shouldForceUpdate=false. Public check từ bản 7bfb47c trả UPDATE đúng ID. Global allowed=true/forceUpdate=false.
- Build lần lượt ở trạng thái disabled, xác minh commit/hash zip/target, đủ 20 PNG theo SHA-256 và marker helper/prop route, Home, nhóm nút Giải đấu và global trước khi bật.

## Yêu cầu hiện tại thay yêu cầu chuông mọi màn

- User chỉ muốn chuông ở các giao diện chính; chi tiết giải, admin, bắt trận trọng tài và màn con không cần chuông. Quy tắc này thay phạm vi mọi màn của 7aa07d0/9817013/65ba11a, giữ vị trí trong trang/header.
- Hiện trên 5 tab Trang chủ/Bảng tin/Giải đấu/Xếp hạng/Khác. Hai route danh sách `/tournament/stack`, `/rankings/stack` mở từ lối tắt cũng là giao diện danh sách tương ứng nên vẫn hiện.
- Ẩn ở mọi route khác: chi tiết/quản lý/lịch giải, trọng tài, admin/adhoc-referee, màn con trong Khác, profile, trung tâm thông báo, login và các màn khác.
- Dùng allowlist khớp chính xác sau khi bỏ route group và index cuối. Không kiểm tra tiền tố more/tournament/rankings để tránh chuông lọt vào màn con; route chưa rõ trả false.

## File mã nguồn

- `utils/notificationVisibility.ts`: helper isMainNotificationRoute và danh sách route chính.
- `app/_layout.tsx`: dùng segments thật tính isMainNotificationScreen, truyền showButton vào shell; chuyển chỉ báo OTA sang dạng compact khi chuông bị ẩn.
- `components/GlobalNotificationShell.tsx`: thêm showButton tùy chọn (mặc định true để giữ tương thích), context/nút fallback/query cùng dùng visible && showButton. Slot không có children trả null khi chuông ẩn, không để khoảng trống 44 px. Các action gốc của header vẫn được render.
- `components/HotUpdateIndicator.tsx`: compact tùy chọn, mặc định false. Khi app sẵn sàng ở màn con, chỉ có vạch 72×3 px ở góc dưới phải theo safe area, pointerEvents=none; không có chuông hoặc hộp chữ che header. Trên màn chính vẫn là vạch dưới chuông, boot giữ chỉ báo cũ.
- `scripts/test-notification-visibility.cjs`: 6 nhóm kiểm tra route chính, alias danh sách, chi tiết/quản lý/trọng tài/admin, tab ẩn/màn con, route group/không prefix, route chưa biết.

**Giữ riêng hai điều kiện:** visible của shell là boot/font/config đã sẵn sàng, vẫn điều khiển top inset; showButton mới là phạm vi route. Không dùng route để tắt visible, vì sẽ làm đổi frame/safe area khi chuyển sang màn con.

Không sửa bố cục nhóm nút Giải đấu, HomePage có chuông ghim khi cuộn, nav 5 tab, icon, quyền camera, trang Khác, điểm/timeout/bốc thăm/đồng hồ trọng tài hay chính sách tải và reload OTA. Query chưa đọc chỉ polling khi chuông được phép hiện và đã đăng nhập; trung tâm thông báo vẫn có query/luồng riêng.

## Kiểm tra và giới hạn

- 41/41 test đạt: 6 nhóm route mới và 35 hồi quy ngày giờ/OTA/font.
- ESLint component/helper/test 0 lỗi/0 warning; root đối chiếu HEAD không có diagnostic mới (7 warning cũ). git diff --check sạch.
- RN Web harness dùng helper/shell/slot/HomePage và header component thật, mô phỏng nội dung trang sâu/navigation/query/native bridge. 5 viewport: 320×568,375×812,440×956,844×390,1024×768.
- 7 route chính/alias có một chuông; 10 route sâu không có chuông hoặc fallback. Query badge skip ở màn sâu/guest, các action header gốc vẫn bấm được.
- Frame nội dung giữ nguyên khi chuyển chính/sâu, không có hàng riêng; state child không mất; trở về Home vẫn có chuông cố định khi cuộn, guest/boot/navigate đúng.
- Màn sâu đang tải OTA có đúng một progressbar 72×3 trong safe area; hết tải thì ẩn. Trên màn chính vạch nằm dưới chuông. Không thay callback/guard reload khi đang bắt trận.
- Đây là kiểm tra component và fixture route, không phải render mọi page native. Chưa kiểm chứng trên điện thoại thật.
- Không thêm dependency/native module, không sửa binary hay diff native local có trước.

## Backup / khôi phục

- Baseline: `f0c2d11`; nhánh đã push `codex/backup-before-main-screen-notifications-20261031`.
- Nguồn trước sửa, baseline/release, README và QA: `/Users/admin/Projects/Pickletour/backups/2026-10-31-main-screen-notifications/`.
- Muốn trở lại phạm vi mọi màn như trước: rà soát working tree, git revert --no-edit b10b061, rồi phát OTA mới iOS/Android production/1.1.x. Vẫn giữ chuông Home/nút Giải đấu của 7bfb47c.
- Nếu quay lui tiếp các commit global cũ, xử lý diff và đảo lần lượt commit mới trước; không reset toàn repo hoặc chỉ tắt bundle. Máy đã nhận cần gói khôi phục có ID mới.
- Giữ thay đổi có trước ở ios/Pickletourvn.xcodeproj/project.pbxproj và .buildlog/.
