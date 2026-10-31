# Lịch thi đấu và Đăng ký giải — 31/10/2026

## Yêu cầu và phạm vi

User duyệt bộ bốn ảnh rồi yêu cầu **“Ok làm và ota đi”**. Hai ảnh form là hai vị trí cuộn của cùng trang Đăng ký. Bản này phát kèm Tổng quan giải đấu `28c1129` đã làm trước đó nhưng chưa OTA.

Source mới: `4f5ae6c07d7891526c2c0fa591b4b3e127f69cf5`, nhánh `feat/ui-v2-modern`.

Bốn file nguồn:

- `app/tournament/[id]/schedule.tsx`
- `app/tournament/[id]/register.tsx`
- `components/PlayerSelector.tsx`
- `components/tournament/ScheduleDesign.tsx` (mới)

## Thiết kế đã triển khai

### Lịch thi đấu

Hero navy/cyan có tên giải và số trận/sân/live từ dữ liệu thật. Dùng lại OverviewHeroArt; không nhúng số liệu hay ảnh mock. Giữ thanh tìm kiếm, toàn bộ thao tác quản lý, tab trạng thái và bộ lọc bracket/vòng dù ảnh duyệt không chụp hết chúng. Các sân trống hiển thị gọn hai cột trên điện thoại, sân có live/hàng chờ giữ đầy đủ nội dung. Cột trái trên tablet có cuộn để hero mới không đẩy các nút ra ngoài vùng chạm.

Mỗi đội một dòng, tên được xuống dòng, điểm ở bên phải, đội thắng cyan. Nhiều game hiển thị riêng từng cột A/B; không cộng điểm giữa game. scoreText không phân tích được vẫn hiện nguyên văn. Giữ mã trận/trạng thái/sân/bracket/nhãn vòng, tương tác viewer và realtime/socket. Không đổi thuật toán tên đội hoặc suy nguồn nhánh đấu.

### Đăng ký và danh sách

Hero sân/lưới/bóng, bốn chỉ số, BTC/điện thoại, form và tiện ích theo tông đã duyệt. Giá trị cap/đăng ký/thanh toán và mọi tên/ngày/địa điểm lấy từ API. RegisterGlassSurface V2 dùng View để không bị Liquid Glass native đổi màu khỏi ảnh; V1 giữ đường cũ. Bỏ ambient backdrop ở V2, không thêm animation mới.

PlayerSelector có prop tùy chọn `appearance="tournament"` chỉ truyền cho hai ô form đăng ký V2; caller khác giữ mặc định. Input navy một lớp khung, có kính tìm kiếm, dropdown/selected preview và debounce/payload cũ. Không sửa cách chọn người chơi. Form giữ chế độ admin/user/guest, đăng ký đơn tìm partner, giải đơn/đôi, lời nhắn, kiểm tra cap và waitlist. Main list có automaticallyAdjustKeyboardInsets và đuôi cuộn theo safe bottom.

Giữ Quản lý/Sơ đồ/Lịch sử đăng ký, tìm kiếm, modal VĐV và bốn bộ lọc. Thẻ đội giữ avatar, sửa VĐV, verified, phone masking theo quyền, màu tier điểm, tổng/cap và mọi trường hợp ghép cặp. Sáu nút có grid 3×2 khi đủ quyền: Poster, Thanh toán, Khiếu nại, Thu phí/Hủy thu, Chờ, Xóa/Hủy. Giữ callbacks, loading/disabled và điều kiện quyền; không mở quyền mới. Nhãn “Chờ” vẫn gọi xác nhận chuyển về danh sách chờ; nhãn thu phí vẫn toggle payment cũ, không gọi cổng thu tiền mới.

MLP vẫn redirect sang trang team; không thay form riêng MLP. Không thêm chuông hoặc bottom navigation cho màn sâu. Không sửa trọng tài, bốc thăm, các modal trọng tài, font, native dependency hay chính sách OTA.

## Kiểm tra và giới hạn

- Screen/component thực qua RN Web harness: 320×568, 375×812, 440×956, 844×390, 1024×768, 568×320; fixture safe inset và xoay. Đạt không tràn ngang, thẻ/điểm nhiều game, viewer wiring, tìm kiếm/tab, grid thao tác, filter/quyền, payload thanh toán và tạo đôi/tìm partner, chọn VĐV thật qua debounce, các route, V1 fallback.
- Kiểm tra thêm: năm trường hợp parse điểm (gồm raw score không hợp lệ), giải đơn, MLP redirect, rỗng, waitlist không tính vào approved, sân live/tên dài.
- AST đối chiếu 158 khai báo/helper/callback tính toán giữ nguyên (79 lịch, 71 đăng ký, 8 selector). Chỉ presentation/helper trình bày mới thay đổi.
- 41/41 regression test thông báo/ngày giờ/font/OTA đạt.
- ESLint 0 lỗi/20 cảnh báo có sẵn (baseline 21), không diagnostic mới sau chuẩn hóa số dòng trong message. Parse TSX và diff check đạt.
- Native header/bridge, API, FlashList và các modal viewer trong harness được mô phỏng; không phải kiểm chứng điện thoại thật, bàn phím iOS/Android hay request production. Không ghi dữ liệu đăng ký production khi QA.
- Lưu ý sẵn có: PlayerSelector giữ selected value nội bộ trong khi parent reset sau submit; chọn lại đúng cùng object ngay sau submit có thể không phát onChange lần nữa. Bản thiết kế này giữ logic cũ, chưa sửa luồng reset đó. Hai ca submit QA chạy ở hai lượt mount riêng. Không coi lỗi hiếm tự đóng trọng tài lúc xoay đã được sửa.

## Backup và rollback

Nhánh backup `codex/backup-before-schedule-registration-20261031` tại `d4eacf5`, đã push. Thư mục `/Users/admin/Projects/Pickletour/backups/2026-10-31-tournament-schedule-registration/`: nguồn cũ, bốn ảnh duyệt, baseline/metadata, QA/scripts/screenshot, hai gói và tài liệu.

Quay lại riêng lịch/đăng ký: rà working tree rồi `git revert --no-edit 4f5ae6c`, kiểm tra và phát OTA mới hai nền tảng. Khi đó Tổng quan `28c1129` vẫn còn. Muốn quay lại cả Tổng quan thì đảo thêm `28c1129`, rà xung đột/import trước khi phát. Không reset toàn repo hoặc chỉ tắt bundle để rollback. Giữ diff native local và `.buildlog/` có trước, không stage.

## Phát hành

Đã build và phát lần lượt iOS/Android ở trạng thái disabled; kiểm tra SHA-256 của file trên server so với zip local và metadata, đủ 20 PNG icon, nền/logo splash và marker mới/cũ trong Hermes rồi mới bật. Đọc lại metadata enabled=true và public check từ OTA modal cũ trả UPDATE đúng hai ID mới; global allowed=true/forceUpdate=false. Không bật forced, không đổi cơ chế reload ngoài trọng tài.

| Nền tảng | Bundle ID | Kênh | Target | Bật | Bắt buộc |
|---|---|---|---|---|---|
| ios | `01a191c7-fbf6-7396-9437-9ec08bfca5f3` | `production` | `1.1.x` | `true` | `false` |
| android | `01a191c9-061a-7c34-9f54-4b333151794f` | `production` | `1.1.x` | `true` | `false` |

Thời điểm xác minh (UTC): `2026-10-31T11:48:55.392Z`.

