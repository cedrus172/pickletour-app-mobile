# Modal video và gán trọng tài

## OTA sửa modal video và gán trọng tài — 04/11/2026

Mobile `f3bae78`: modal Thêm video trên trang quản lý trận có nền đặc theo sáng/tối và tránh vùng an toàn đáy; bảng Gán trọng tài dùng RN Modal sheet hiện có, đóng đúng state và mở lại được. Query tự làm mới khi mở, tránh refetch trước khởi tạo và không tiền chọn danh sách rỗng trước khi tải xong. iOS `01a1a278-355b-748a-b04d-19de67fe4464`, Android `01a1a279-c731-7d0d-b5d9-27578c1876a4`, production/1.1.x, enabled=true, force=false. Giữ các bản cũ và chức năng khôi phục trang sau OTA.

50 test OTA/font đạt; harness dùng sheet thật và đoạn modal video với API giả lập kiểm tra mở, nhập/lưu, chọn trọng tài/lưu/đóng/mở lại ở 320/390/768px sáng/tối. iOS bundle khởi động trên giả lập; chưa kiểm tra hai luồng bằng tài khoản thật trên điện thoại hoặc API thật. Lint có 11 lỗi có sẵn tương tự baseline. Hash gói/metadata/server, 20 icon/10 font và UPDATE đã kiểm tra. Backup `/Users/admin/Projects/Pickletour/backups/2026-11-04-ref-video`.

Quay lui riêng bằng revert f3bae78 và OTA mới, sau khi kiểm tra các bản phát hành mới hơn.
