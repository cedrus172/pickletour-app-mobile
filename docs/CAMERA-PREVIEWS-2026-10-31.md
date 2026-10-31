# Camera PickClip — giao diện và cache ảnh gần nhất (31/10/2026)

## Phạm vi

Bản được user duyệt: danh sách camera một cột trên điện thoại, ảnh 16:9, mã camera thực, thời điểm ảnh, tên sân và nút “Xem & cắt”; nền navy/cyan theo ảnh duyệt. Header quay lại/tên sân/làm mới; không có chuông hoặc bottom navigation ở màn sâu này. Grid đổi 2–3 cột theo chiều rộng thực của container, dùng chung cho pane camera trên tablet. Không sửa luồng stream/cắt clip, giới hạn clip, trang danh sách sân hoặc quyền backend.

## Các file

- `app/clip-cam/channels.tsx`: UI theo ảnh duyệt, refresh, xác minh quyền từ API trung tâm trước khi đọc cache; route cũ vẫn được nhận, route mới thêm venueId.
- `app/clip-cam/index.tsx`: prefetch tối đa 2 sân × 6 camera khi trang hoạt động; pane camera dùng chung cache và grid. Pane trái rộng tối đa 360 px / 40% màn hình để pane phải không bị bóp trên màn gập.
- `components/clipCam/CameraPreviewGrid.tsx`: ảnh thật, trạng thái đang tải/chưa có ảnh, timestamp, ảnh cũ khi lỗi, responsive và CTA.
- `hooks/useClipCameraPreviews.ts`: đăng ký cache, tự cập nhật khoảng 30 giây khi màn đang focus và app foreground; xác minh quyền/expiry, không dùng route params để tự cấp quyền.
- `utils/clipCameraCache.ts`: cache bộ nhớ + manifest AsyncStorage + JPEG documentDirectory, scope riêng theo user/base/phạm vi camera; download tối đa 2 đồng thời, timeout 12 giây, kiểm tra decode, đổi file nguyên tử. Ảnh tốt không bị ghi đè khi lỗi/503; hủy và xóa cache scope đã thu hồi. Ảnh còn khi đóng/mở app; cache cũ được dọn theo giới hạn 7 ngày/8 scope không hoạt động. Danh sách camera làm mới tối đa mỗi 60 giây trừ refresh thủ công.
- `scripts/test-clip-camera-cache.cjs`: kiểm tra cache, metadata, quyền, concurrency, timeout và phục hồi.

Không thêm dependency, không sửa native. Giữ nguyên local diff `ios/Pickletourvn.xcodeproj/project.pbxproj` và `.buildlog/` có trước.

## Hợp đồng với Pi

Giữ GET `/api/public/channels` và `/api/public/channels/:id/thumbnail`. App tải JPEG đã tạo sẵn, không mở stream cho thumbnail. Dùng `X-Snapshot-Captured-At` hoặc `Last-Modified` làm thời điểm chụp; thiếu cả hai thì ghi “Đã tải”, không tự nhận là thời điểm chụp. Đọc `X-Snapshot-Stale`; giữ ảnh cũ và hiển thị thời gian cũ. Không dùng ảnh minh họa trong production.

User báo Claude đã sửa `rec_shared.py` và `clipapp.py` trên Lã Vọng: worker 30 giây, concurrency 2, timeout 12 giây, JPEG 854 px, disk cache nguyên tử/persist, 503 Retry-After 5 khi chưa có ảnh, snapshot CGI trước rồi RTSP substream. Không có commit vì repo bên Claude chưa dùng git. Đó là thay đổi do Claude quản lý, không nằm trong repo mobile.

Đã kiểm tra độc lập `https://lavong.pickletour.vn/api/public/channels`: các ID 1, 5, 7 tương ứng Sân 1, 2, 3. Thumbnail camera 1 trả HTTP 200 image/jpeg trong 0,615 giây từ Mac qua Internet, có capturedAt/stale/Last-Modified/ETag đúng hợp đồng. Các ảnh 1/5/7 đã được tải làm fixture QA riêng ngoài source. Không suy ra thời gian này cho mọi mạng/thiết bị. Quang Trung user báo offline, chưa xác minh và chưa xác nhận đã cập nhật; Claude sẽ triển khai khi Pi online. Không tự chạy SSH hoặc deploy Pi từ phiên này.

Ảnh đã cache có thể hiện trước network khi mở lại; lần đầu chưa có ảnh vẫn cần mạng và quyền hiện hành. Chưa xác minh bản native này trên iPhone/Android thật sau OTA.

## Backup / rollback

Nhánh `codex/backup-before-camera-previews-20261031` tại `9a52f8c`. Backup ngoài repo: `/Users/admin/Projects/Pickletour/backups/2026-10-31-camera-previews/` gồm nguồn hai màn trước sửa, baseline/OTA trước, native diff có trước, mockup duyệt và bằng chứng QA. Rollback bằng revert riêng commit source camera rồi build/phát OTA mới; không reset working tree, không gỡ các bản sửa icon/trọng tài/navigation đã có.

## Kiểm tra và phát hành

62/62 test cache/font/OTA/route thông báo/ngày giờ đạt. ESLint 5 file TypeScript sửa không có lỗi/cảnh báo. TypeScript toàn repo còn lỗi cũ ở các màn khác; không có diagnostic thuộc các file camera sửa. Harness React Native Web chạy chính hai màn/hook/cache/grid, mock native filesystem và API quyền: 6 viewport 320×568, 375×812, 440×956, 844×390, 768×1024, 1366×1024; ảnh thật tải thành công, không tràn ngang, route cắt đúng, giữ ảnh khi offline, ẩn khi thu hồi quyền/logout và xoay màn đều đạt. Không thay thế kiểm tra native trên máy thật.

ID OTA được bổ sung sau khi xác minh gói phát hành.
