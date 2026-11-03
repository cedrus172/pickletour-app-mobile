# Giao diện tài khoản — bàn giao

## OTA giao diện tài khoản — 04/11/2026

Mobile `450cfda`: cập nhật bố cục biểu mẫu Hồ sơ gọn hơn; mục Xác minh có thẻ giới thiệu, vùng quét QR; các thẻ Cài đặt có biểu tượng, giữ toàn bộ tùy chọn, xác minh và thao tác hiện có. Kế thừa tổng quan/CCCD `f182c07`, các bản Claude và bản sửa crash. OTA production/1.1.x: iOS `01a1a259-7caf-7c4d-999c-648af75e2811`, Android `01a1a25a-fccf-7e7e-82a5-ed00f8002d04`, enabled=true, force=false. Metadata bản cũ không thay đổi.

43 test OTA/font đạt, lint không lỗi (6 warning có sẵn). Bundle iOS release khởi động và báo sẵn sàng trên giả lập; chưa kiểm thử ba tab với tài khoản thực hoặc Android/iPhone vật lý. 20 icon, 10 font, marker tính năng trước, hash local/server/metadata và public UPDATE đã đối chiếu. Backup trước phát hành `/Users/admin/Projects/Pickletour/backups/2026-11-03-account-tabs`. Ripple mobile vẫn tạm tắt do lỗi cũ.

Quay lui riêng bằng revert commit 450cfda rồi phát OTA mới, giữ các commit Claude và dữ liệu hiện có; kiểm tra lại phiên bản đang phát trước khi thao tác.
