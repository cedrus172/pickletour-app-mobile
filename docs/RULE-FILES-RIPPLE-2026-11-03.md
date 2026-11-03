# Điều lệ ảnh/PDF, ripple và bộ lọc xếp hạng — 03/11/2026

## Cập nhật mới nhất — 03/11/2026: Điều lệ ảnh/PDF và ripple đã phát hành

- Backend/web: commit `8fa74b3d`; mobile: `1fc1486`, xây tiếp từ `143f3df`, giữ hồ sơ `4943783` và toàn bộ commit Claude trước đó.
- Trang Đăng ký giải đấu: tệp điều lệ ảnh/PDF tối đa 10 MB/tệp; chủ giải/admin/đồng quản lý được tải lên và xóa, người xem được mở ảnh/PDF. Nội dung HTML cũ giữ nguyên. Không thêm dependency/native mới.
- Bảng xếp hạng: bỏ lựa chọn Đôi NN, giữ dữ liệu/API điểm cũ. Ripple cho button toàn web và các Pressable/TouchableOpacity/Button trong mã app; giữ handler/quyền, bỏ hiệu ứng khi giảm chuyển động.
- OTA production/1.1.x: iOS `01a1a1f0-5204-7505-b390-82da6d572305`, Android `01a1a1f1-d9ee-7bd5-beae-ff570691c7d7`; enabled=true, force=false. Hash local/server/metadata và public UPDATE đã xác minh. Metadata các OTA trước không đổi.
- Web/API production đã kiểm tra: index/assets khớp build, public list hoạt động, upload không token bị từ chối theo protect hiện tại (403). 43 test JS/font/OTA đạt, 2 suite API trên VPS đạt; harness giao diện thật với transport giả lập đạt 320/390/768 px. Chưa kiểm tra system file picker và ripple native trên điện thoại thật sau OTA.
- Chi tiết: `pickletour-app-mobile/docs/RULE-FILES-RIPPLE-2026-11-03.md`. Backup `/Users/admin/Projects/Pickletour/backups/2026-11-03-rule-files-ripple`; VPS `/abcdk-backups/2026-11-03-rule-files-ripple`. Không reset/revert công việc Claude.


## Mã nguồn và cơ chế

- Root master `8fa74b3dab2b84ec176ec8b258de1e0d5694a370`: 12 file backend/frontend; đã push. Frontend là một phần repo root.
- Mobile feat/ui-v2-modern `1fc14861f151f9b0129d7ae07e9fa2d51d2049b8`: 9 file; đã push.
- Backend thêm collection TournamentRuleFile, router /api/tournaments/:id/rule-files (GET/POST), /:fileId/content (GET), /:fileId (DELETE). Lưu uploads/tournament-rules, kiểm tra loại nội dung thực, chuẩn hóa tên UTF-8, file ngẫu nhiên, kiểm tra quyền trước ghi đĩa. Ảnh HEIC/AVIF dùng sharp hiện có chuyển JPEG. Không đổi Tournament/contentHtml.
- Web TournamentRuleFiles đặt sau nội dung điều lệ trên TournamentRegistration. Mobile components/tournament/TournamentRuleFiles.tsx đặt cùng vị trí ở app/tournament/[id]/register.tsx. API slice riêng trên cả hai.
- Mobile chọn tệp qua WebView HTML input file và base64 bridge rồi FileSystem cache/FormData; không dùng document-picker vì binary chưa có module đó. Kiểm tra dung lượng/base64, xóa cache sau upload. Ảnh mở modal, PDF mở trình duyệt.
- Ripple mobile: Metro chỉ chuyển import react-native của mã app sang utils/rippleNative.cjs. Không chuyển thư viện/native internals hoặc wrapper chính nó. Sao chép descriptor để giữ lazy exports. Ref, function children/style và callback cũ giữ nguyên. Native android_ripple có sẵn không bị vẽ hai lần. Lớp phủ chỉ cắt ripple, không sửa overflow của button.
- Ripple web: frontend/src/utils/buttonRipple.js, passive pointer/keyboard listeners; button trong portal/dialog cũng được phủ. MUI TouchRipple giữ nguyên; không nhân đôi ripple. Không thay kích thước/bố cục.
- Bỏ mix/Đôi NN ở mobile screens/rankings.tsx và hai trang web xếp hạng. Không xóa dữ liệu hoặc khả năng tính điểm mix ở backend.

## Kiểm tra và triển khai

- node --test scripts/test-rule-files-ripple.cjs scripts/test-isolated-icon-fonts.cjs scripts/test-background-ota.cjs: 43 đạt.
- Hai suite backend chạy trên VPS với model/auth giả lập, thư mục tạm và sharp thật; không ghi dữ liệu giải đấu thật. Kiểm tra quyền, IDOR, signature/10 MB, Unicode, upload/list/content/download/delete/cleanup.
- Vite production build thành công; lint file mới không lỗi. TSC toàn app còn lỗi cũ; file mới không xuất hiện trong diagnostics.
- Harness component thật dùng API/native giả lập: mobile 320/390/768 px, web 390 px; callback một lần, disabled, ripple clipping, giảm chuyển động, picker bridge PDF/upload/cleanup, preview/delete/quyền. Không thay cho kiểm tra trên iPhone thật.
- Root VPS giữ nguyên HEAD cũ nhưng copy chọn đúng 12 file của commit mới; không git reset, không ghi đè các thay đổi khác. pm2 reload server rồi đợi API sẵn sàng trước phát web. Index thay cuối cùng; giữ asset hash cũ cho phiên trình duyệt đang mở.
- Hai OTA build disabled, xác minh hash/package/ancestry và metadata cũ, rồi bật cả hai. Giữ 20 PNG, 10 font cô lập và marker camera/nav/splash/trọng tài/hồ sơ.
- Diff native project có sẵn giữ nguyên SHA256 d14c4d8f055950124373b2393c8ea51e06e2554a8c4e6e48f04e9266f38be4b7; .buildlog/ không đổi.

## Sao lưu và quay lui

- Local backup chứa baseline, package/metadata OTA trước, release package/staged/release.json, public-verification.json, web-backend-deploy.json và kết quả QA/test.
- VPS chứa source-before, tournamentRoutes.before.js, web-before.tgz, deployment.json. Các file backend mới từng được stage trước backup; khôi phục route cũ trước nếu cần tắt API. Không xóa collection hoặc tệp upload vì có thể có dữ liệu mới.
- Quay lui riêng thay đổi mobile bằng revert 1fc1486 rồi phát OTA mới; root bằng revert 8fa74b3d và deploy chọn đúng file. Bảo toàn mọi commit mới hơn/Claude, không reset nhánh hay xóa/đổi metadata OTA cũ. Kiểm tra release mới hơn trước khi rollback.
