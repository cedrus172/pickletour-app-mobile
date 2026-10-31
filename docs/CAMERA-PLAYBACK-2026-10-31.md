# Xem camera và cắt clip — thiết kế duyệt + tua 30 giây (31/10/2026)

## Yêu cầu và UI

User duyệt ảnh `exec-d057476d-4669-4401-827b-5d6893986c65.png` và yêu cầu triển khai. Trang `/clip-cam/cut` theo bố cục: header Sân + tên venue, video 16:9 có trạng thái/timecode/toàn màn hình; hàng lùi 30 giây – phát/tạm dừng – tiến 30 giây; Dừng xem; Ghi hình trực tiếp; timeline/zoom/dịch cửa sổ; chip 30 giây/1/2/5 phút/Tùy chọn; tóm tắt khoảng; Xem trước; Cắt clip; kết quả và clip gần đây. Nền navy/cyan đồng bộ trang camera. Các điều khiển xuống dòng trên màn hẹp, không chạm nhau. Không có bell/bottom navigation ở màn sâu.

## Source thay đổi

- `app/clip-cam/cut.tsx`: bố cục theo ảnh duyệt, nối điều khiển player, dùng chung khoảng chọn cho preview và cắt, quản lý yêu cầu stream mới nhất, giữ nguyên phần tạo clip/poll/chia file/ghi hình/tải/chia sẻ.
- `components/clipCam/CameraPlayback.tsx`: expo-video hiện có, điều khiển pause/play, timecode thật theo phiên phát, native fullscreen, handle đọc vị trí và seek VOD. Khi fullscreen dùng native controls; inline dùng controls đã duyệt. Phát tiếng khi iPhone bật gạt im lặng như trước.
- `utils/clipPlayback.ts`: tính thời gian khung hình/seek/giới hạn hiện tại, khoảng nhanh và tên hiển thị history. Tên file và payload tải/chia sẻ không thay đổi.
- `scripts/test-clip-playback.cjs`: 9 test thời gian/tua/range/history.
- Tài liệu này.

Không thêm dependency hoặc sửa native binary. Giữ `ios/Pickletourvn.xcodeproj/project.pbxproj` và `.buildlog/` có trước; không stage chúng. Trang chọn camera/cache/permissions của a5a31ef, font 6dbb27f, trọng tài/bốc thăm và chính sách OTA giữ nguyên.

## Hành vi

- ±30 giây lấy từ vị trí khung hình của player, không lấy mốc timeline cũ khi video đã chạy tiếp.
- VOD có duration hữu hạn và target thuộc file: đặt currentTime trong player. Nguồn live/HLS đang mở hoặc target ngoài file: mở session NVR tại target tuyệt đối; không kẹp lùi ở đầu file. Không yêu cầu thời điểm tương lai; khi tua đến hiện tại chuyển về live.
- Giữ trạng thái pause khi jump phải thay session. Nút Stop/hủy/rời màn tăng request token; response muộn bị bỏ và session trả về được stop. Điều này cần thiết khi người dùng tua liên tiếp.
- HLS có timestamp hợp lệ thì dùng metadata. Playback không tin timestamp wall-clock hiện tại nếu nó lệch quá xa giờ khung hình yêu cầu (một số encoder đóng dấu giờ encode thay giờ ghi). Thiếu metadata dùng origin phiên + currentTime. NVR/keyframe và độ trễ mở session có thể ảnh hưởng thời gian tải thực tế.
- Trước sửa, preview nhanh lấy khoảng gần hiện tại trong khi cắt từ timeline lấy mốc người dùng chọn. Nay tóm tắt, preview và CTA cắt cùng dùng mốc timeline; Tùy chọn vẫn lấy Bắt đầu/Kết thúc. Clip tối đa 5 phút/file, tối đa tổng 60 phút và chia file như trước.
- History chỉ rút gọn tên nếu có timestamp bắt đầu theo định dạng file hiện có; file legacy không đoán giờ, giữ nguyên tên. Giữ trạng thái hết hạn và chia sẻ file còn sống.

## Kiểm tra

- 71/71 test gồm 9 test mới và 62 test cache/font/OTA/thông báo/ngày giờ trước đó.
- ESLint source thay đổi: 0 lỗi; 3 warning có trước ở cut.tsx (require MediaLibrary fallback, directive cũ, saveToAlbum đang ẩn). Không bỏ fallback native để dọn lint.
- TSC toàn repo còn lỗi cũ ngoài phạm vi; không có diagnostic ở cut.tsx/CameraPlayback.tsx/clipPlayback.ts trong lần kiểm tra.
- Harness React Native Web dùng screen/player/helper source thật, mock expo-video native và API. Luồng đầy đủ trên 320/375 px: tua từ currentTime, pause và fallback NVR, fullscreen, range preview/cut, custom 10 phút → 2 file 5 phút, ghi hình và tải/chia sẻ. 375 px kiểm tra request về sai thứ tự và response sau unmount đều stop phiên cũ, không dựng player lại.
- Bố cục kiểm tra 6 viewport 320×568, 375×812, 440×956, 844×390, 768×1024, 1366×1024, xoay và tăng chữ bằng CSS 130%; đây là harness layout, không thay thế native accessibility font scaling hoặc kiểm tra trên iPhone/Android thật.
- Kiểm tra độc lập API thật Lã Vọng camera 5: mở 1 phút playback của khoảng đã ghi, nhận HLS sau 3,637 giây. Playlist TYPE EVENT, không ENDLIST tại lúc đọc, không PROGRAM-DATE-TIME; xác nhận cần fallback origin và hỗ trợ session mới khi tua. Đã gửi stop và nhận `{ok:true}`. Không chỉnh service Pi, không tạo bản ghi/cắt file thật trong kiểm tra này. Quang Trung chưa xác minh do user báo offline.

## Backup / rollback

Nhánh `codex/backup-before-camera-playback-20261031` tại 0e07393. Backup `/Users/admin/Projects/Pickletour/backups/2026-10-31-camera-playback/` chứa cut.tsx trước sửa, ảnh duyệt, baseline, native diff có trước, QA/API proof và các gói phát hành. Revert riêng commit source của đợt này rồi build OTA mới để quay lại; không reset working tree hoặc làm mất cache/icon/những giao diện trước.

## Phát hành

Thông tin source/OTA được bổ sung sau khi kiểm tra gói phát hành.
