# Khôi phục trang sau OTA

## OTA khôi phục trang — 04/11/2026

Mobile source `48aa021`, production/1.1.x: iOS `01a1a26c-1353-7825-ad36-85373452c344`, Android `01a1a26d-a02d-7bef-89c3-2749075d003a`, enabled=true, force=false. Trước reload, lưu đường dẫn và tham số điều hướng cho phép vào SecureStore, kèm thời gian, bundle đích và ID tài khoản; sau khởi động chỉ khôi phục một lần trong 2 phút khi đúng bundle/tài khoản và không có deep link khởi động. Không lưu dữ liệu biểu mẫu hoặc token. Nếu người dùng chuyển trang hoặc vào màn trọng tài trong lúc lưu, hoãn reload và kiểm tra lại. WebView shell không áp dụng. Không khôi phục dữ liệu nhập, vị trí cuộn, modal hay toàn bộ lịch sử điều hướng; deep link/thông báo ưu tiên theo luồng điều hướng hiện có. Lần OTA đầu đưa chức năng này lên chưa lưu được trang trước đó; chỉ lần OTA tiếp theo mới dùng được.

50 bài kiểm tra tự động đạt (bao gồm bảo vệ màn trọng tài và race khi lưu trang), lint không lỗi; iOS bundle khởi động trên giả lập, chưa kiểm tra toàn bộ vòng OTA/khôi phục trên thiết bị thật hoặc Android. TSC dự án còn lỗi cũ. Metadata bundle cũ không thay đổi, hash local/server/metadata và 20 icon/10 font đã đối chiếu. Backup `/Users/admin/Projects/Pickletour/backups/2026-11-04-ota-route`. Cần kiểm tra thực tế deep link/notification và trạng thái nhập trước khi khẳng định mọi màn được khôi phục.

Quay lui thay đổi bằng revert 48aa021 và phát OTA mới, sau khi kiểm tra các bản mới hơn; không reset hoặc xóa bản OTA đã phát.
