# Chuông Thông báo ở góc trang — 31/10/2026

> Bản kế tiếp `7bfb47c` giữ cách bố trí này và gắn chuông trực tiếp vào HomePage để sửa lỗi mất nút trang chủ; đồng thời hoàn thiện các nút Giải đấu. Xem [TOURNAMENT-ACTIONS-HOME-BELL-2026-10-31.md](TOURNAMENT-ACTIONS-HOME-BELL-2026-10-31.md). Hướng dẫn revert `65ba11a` bên dưới áp dụng cho thời điểm bản này; từ `7bfb47c` phải đảo `7bfb47c` trước vì HomeDesign đã import helper trong shell.

## Trạng thái

- Commit giao diện: `65ba11ad308130236b3945d7a14fbb4946f34d93`, đã push nhánh `feat/ui-v2-modern`.
- iOS production/1.1.x: `01a19048-815f-71ee-a5fe-f377ab8e984e`.
- Android production/1.1.x: `01a19049-7c32-7139-8c71-ae987800e4e9`.
- Hai bundle đã bật, không force update; public check từ bản Giải đấu trước trả đúng UPDATE. Chính sách toàn cục giữ allowed=true/forceUpdate=false.
- Build lần lượt ở trạng thái disabled, kiểm tra hash zip với metadata, marker góc chuông/header/Giải đấu trong Hermes và đủ 20 PNG theo SHA-256 rồi mới bật.

## Yêu cầu và cách triển khai

- User yêu cầu chuông nằm ở góc phải từng trang, như vị trí khoanh trên nền hero trang chủ; **không dành một hàng ngang riêng phía trên**. Yêu cầu này thay cách bố trí hàng 52 px của `9817013`/`7aa07d0`.
- `GlobalNotificationShell` chỉ dành top inset hệ thống, không cộng 52 px. Provider native đo vùng sau status area, JS context top=0; giữ các inset khác để không đệm top hai lần.
- Trang không có vị trí chuông trong header dùng overlay góc phải: top=topInset+8, right=max(rightInset,16), chỉ nút 44×44 bắt chạm; nền/chiều cao nội dung không bị đẩy xuống bởi một hàng hành động.
- `NotificationHeaderActions` gắn vào header sẵn có của Giải đấu, Bảng tin, Xếp hạng, Khác, trình duyệt và bảng trọng tài; `withNotificationHeader` ghép các action native cũ với chuông bên phải. Các Stack dùng chung có default này, các page đã khai báo headerRight riêng được bọc để không mất action/quyền/handler.
- Context dùng chung query chưa đọc (poll 30s, skip guest/boot). Chỉ vị trí của trang đang focus hiện chuông. Đăng ký/dọn vị trí qua useFocusEffect để blur vẫn giải phóng góc khi màn cũ bị freezeOnBlur. Khi chưa có vị trí trong header đang focus, overlay dùng chung hiện; không có hai chuông cùng lúc trên trang đang mở.
- Trang chủ giữ nền hero/layout hiện có, bỏ renderer chuông legacy riêng trong options để không trùng khi native header được bật lại. Bấm chuông vẫn router.navigate('/notifications'), không push lặp.
- Giải đấu: chỉ chuyển hình cúp trang trí sang trái một chút để chừa chỗ chuông. Xếp hạng: tiêu đề co đồng đều theo chiều rộng còn lại cạnh action/chuông, tránh cắt chữ trên máy nhỏ. Trọng tài dọc: nút xoay chuyển xuống cạnh đồng hồ để giữ chỗ cho chuông trong hàng action đầu; ngang vẫn trong nhóm tiện ích. Không đổi điểm, quyền, timeout, đồng hồ hay logic bốc thăm.
- Thanh tải OTA thu thành vạch tiến trình 3 px dưới nút chuông; không còn hộp chữ đè header. `HotUpdateIndicator.inline` tùy chọn, mặc định giữ API cũ; root dùng chỉ báo đầy đủ khi shell chưa sẵn sàng. Cơ chế tải ngầm và tự reload ngoài bảng trọng tài giữ nguyên.
- Không thêm dependency, không sửa native project/binary. Giữ navigation 5 tab, 20 PNG, trang Giải đấu mới `d75b0ca`, trang Khác theo nhóm và quyền camera.

## Kiểm tra và giới hạn

- 35/35 test ngày giờ/OTA/font đạt; git diff --check sạch.
- ESLint đối chiếu 34 file với HEAD trước sửa: không diagnostic mới. Có sẵn 5 lỗi/70 warning ở các file cũ; không sửa ngoài phạm vi chuông. TypeScript toàn repo vẫn có lỗi cũ; đối chiếu chẩn đoán theo file/code/message không có lỗi mới do bản này.
- Harness RN Web dùng shell/nút/indicator và component header thật, mô phỏng navigation focus/query/native bridge. 5 viewport: 320×568,375×812,440×956,844×390,1024×768. Đạt: content bắt đầu sau safe area không có hàng 52 px; chuông nằm trong vùng hero ở fixture trang chủ; đúng một chuông nhìn thấy qua chuyển tab, giữ action, không đè action đã kiểm tra, guest, navigate, boot hidden/visible, unmount và cleanup khi nhận blur trước render.
- Fixture trang chủ và native header trong harness không phải toàn bộ page native thật. Bố cục header trọng tài dùng component thật với tiện ích mô phỏng. Không coi đây là xác nhận mọi page/native modal trên điện thoại thật.
- Màn Giải đấu/component/shell/navigation thật được kiểm tra tiếp 6 viewport 320–1024 px: tìm kiếm, ba tab, lọc ngày, nhóm, đăng ký/chi tiết, poster, handler Zalo, quyền admin/trọng tài, Lịch đấu/Sơ đồ, badge MLP, đầy chỗ/không giới hạn/ngày sai/loading/lỗi; không overflow.
- Chưa kiểm tra trên điện thoại thật; các native modal/permission/splash là cửa sổ riêng, không ép chuông lên trên lớp chặn.

## Backup / quay lui

- Baseline trước sửa: `1acf05b`, nhánh đã push `codex/backup-before-notification-corner-20261031`.
- Nguồn trước sửa, ảnh user đánh dấu, baseline/release metadata và QA: `/Users/admin/Projects/Pickletour/backups/2026-10-31-notification-corner/`.
- Chỉ quay lại hàng chuông cũ nhưng giữ Giải đấu/nav/icon: rà soát working tree, `git revert --no-edit 65ba11a`, rồi phát OTA mới iOS/Android production target 1.1.x. Không reset cả repo hoặc chỉ tắt bundle vì máy đã nhận cần gói khôi phục có ID mới.
- Nếu tiếp tục revert các commit global cũ 9817013/7aa07d0 hoặc icon/nav 116fe35, phải đảo 65ba11a trước vì page header đang import helper trong GlobalNotificationShell; sau thay đổi tương lai cần xử lý diff/conflict có chọn lọc.
- Giữ nguyên thay đổi local có trước tại ios/Pickletourvn.xcodeproj/project.pbxproj và .buildlog/.

## Danh sách file mã nguồn thay đổi

- `app/(tabs)/index.tsx`
- `app/(tabs)/more/_layout.tsx`
- `app/(tabs)/more/index.tsx`
- `app/_layout.tsx`
- `app/browser/index.tsx`
- `app/courts/_layout.tsx`
- `app/courts/index.tsx`
- `app/events/_layout.tsx`
- `app/marketplace/_layout.tsx`
- `app/match/[id]/home.tsx`
- `app/match/stack/index.tsx`
- `app/messages/[cid].tsx`
- `app/news/[slug].tsx`
- `app/news/index.tsx`
- `app/owner/_layout.tsx`
- `app/owner/index.tsx`
- `app/owner/venue/[id]/events.tsx`
- `app/owner/venue/[id]/index.tsx`
- `app/owner/venue/[id]/packages.tsx`
- `app/owner/venue/[id]/products.tsx`
- `app/owner/venue/[id]/staff.tsx`
- `app/play/_layout.tsx`
- `app/referee/clusters.tsx`
- `app/support/index.tsx`
- `app/tournament/[id]/manage.tsx`
- `app/tournament/[id]/referee.tsx`
- `app/tournament/[id]/schedule.tsx`
- `components/GlobalNotificationShell.tsx`
- `components/HotUpdateIndicator.tsx`
- `components/feed/FeedDesign.tsx`
- `components/home/HomeNotificationButton.tsx`
- `components/match/RefereeScorePanel.native.tsx`
- `components/rankings/RankingDesign.tsx`
- `components/tournaments/TournamentDesign.tsx`
