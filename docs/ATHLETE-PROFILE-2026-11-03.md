# Hồ sơ vận động viên — 03/11/2026

## Đã phát hành

- Source: 49437835cb2161617afe3b053543a29b0b1181bb trên nhánh feat/ui-v2-modern, đã push.
- iOS: 01a1a0a4-58dd-73fb-bfd3-7c46de7a5f90
- Android: 01a1a0b4-9164-706c-9e87-43ca76a00e12
- production / 1.1.x; enabled=true, shouldForceUpdate=false. Public endpoint từ OTA trước trả UPDATE đúng ID. Chính sách toàn cục allowed=true, forceUpdate=false.
- Build từ adf5887, giữ nguyên toàn bộ commit Claude: 8712d65 (crosspost), 892d42b (giải nổi bật/gom nhóm), 4a1c45e (tiến trình đăng ký), adf5887 (dung sai điểm đăng ký). Kiểm tra ancestry và diff chỉ bốn file giao diện; metadata các OTA cũ không thay đổi.

## Giao diện theo ảnh duyệt

- Trang sâu /profile/[id]: thanh tiêu đề/quay lại/chia sẻ, hồ sơ gọn, avatar/tên thật, xác thực và SC.
- Các nút xã hội, đối đầu, chấm trình và KYC giữ handler/quyền; thêm appearance=profile chỉ tại trang này.
- Thống kê lưới 2×2, điểm đơn/đôi tách dòng có nhãn, số không bị chia vụn.
- Tab gạch dưới, lịch sử có huy hiệu kết quả, ngày và tiêu đề riêng; giữ đủ hai đội/tỉ số, thay đổi điểm và điều hướng chi tiết.
- Không đổi API/query/mutation, công thức thống kê, dependency, native, font, camera hoặc guard OTA. Không gán dữ liệu mẫu trong app.

## Kiểm tra

- ESLint bốn file: 0 lỗi, 18 warning (chủ yếu có sẵn trong màn hồ sơ; có helper màu không còn dùng).
- 34 test OTA/camera + 13 test font đạt.
- RN Web harness dùng màn hồ sơ và ba component xã hội thật, fixture API/native sheet: 320/390/440 px, lưới hai cột, không tràn ngang, lịch sử/chi tiết, sheet điểm, kết bạn/nhắn, route chấm trình.
- Gói iOS/Android: hash local/metadata/file server khớp; đủ 10 TTF, 20 icon PNG, splash và marker giao diện trước/sau.
- Native diff có trước giữ nguyên SHA-256 d14c4d8f055950124373b2393c8ea51e06e2554a8c4e6e48f04e9266f38be4b7; .buildlog/ giữ nguyên.
- Chưa xác minh trên điện thoại thật sau OTA; harness thay native/API bằng fixture. Màn mặc định vẫn ở tab Hồ sơ như trước.

## Sao lưu và quay lui

- Nhánh backup đã push: codex/backup-before-athlete-profile-20261103 tại adf5887.
- Thư mục backup: /Users/admin/Projects/Pickletour/backups/2026-11-03-athlete-profile
- Có nguồn cũ, ảnh duyệt, hai gói OTA cũ/mới, metadata, hash, QA và diff native có trước; không sao chép deploy key.
- Quay lại riêng giao diện: rà working tree rồi git revert --no-edit 4943783 và phát OTA mới hai nền tảng; không reset repo, không tắt/xóa các OTA cũ và không đảo các commit Claude.
- Giữ tải ngầm/tự reload ngoài màn bắt trận; guard trọng tài không sửa.

Xác minh UTC: 2026-11-03T09:55:08.388Z.
