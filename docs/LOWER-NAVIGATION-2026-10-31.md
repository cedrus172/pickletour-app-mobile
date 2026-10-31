# Hạ thanh navigation — 31/10/2026

- Commit nguồn: `dc1fb5347413cb06e10ee3804f6759eea482cc2c`, nhánh `feat/ui-v2-modern`.
- Theo yêu cầu user, hạ toàn bộ dock xuống thêm 8 px bằng cách đổi đúng một dòng trong `components/tabbar/SportBottomBar.tsx`: paddingBottom từ `Math.max(insets.bottom, 8)` thành `Math.max(insets.bottom - 8, 8)`.
- Khi inset đáy >=16 px, thanh hạ đúng 8 px; inset thấp hơn giữ khoảng cách tối thiểu 8 px với đáy. Không đổi kích thước, cúp nổi, màu, opacity, điều hướng, vùng chạm, nền ngoài trong suốt hoặc absolute overlay của aadff60.
- Hook đuôi cuộn năm tab giữ nguyên khoảng đệm cũ, vì vậy vẫn đủ để cuộn thao tác cuối lên trên dock. Không thêm dependency hoặc đổi native/safe area gốc/reload guard.
- Sáu viewport RN Web dùng bar/wrapper/icon/hook thật: 320×568,375×812,440×956,844×390,1024×768,390×844. Đã xác nhận vị trí mới theo inset, cúp 58 px và căn giữa, năm tab/vùng chạm/focus/opacity/preventDefault, cuộn cuối, khoảng trống cho chạm xuyên và xoay. Native bridge và nội dung trang là fixture; chưa kiểm chứng máy thật. `git diff --check` sạch.
- Backup nhánh đã push `codex/backup-before-lower-navigation-20261031` tại `24e5af0`; nguồn cũ, baseline/release/QA trong `/Users/admin/Projects/Pickletour/backups/2026-10-31-lower-navigation/`.
- Quay lui riêng vị trí: kiểm tra working tree, `git revert --no-edit dc1fb53`, commit/push rồi phát OTA mới hai nền tảng. Không reset hoặc chỉ tắt bundle đã phát. Giữ các thay đổi native local có trước và `.buildlog/`.

## OTA

- iOS: `01a190c7-b85b-772b-bc4d-8a2506283664`; Android: `01a190c8-6f13-7899-aed2-c8ddc7e3cd61`. Kênh production, target 1.1.x, enabled=true, shouldForceUpdate=false.
- Đã build tuần tự ở trạng thái disabled, xác minh commit/hash zip, marker navigation/hook/điều hành trận/chuông/Giải đấu/splash, đủ 20 PNG icon và SHA-256 ảnh nền/logo splash. Sau kích hoạt, metadata và public check từ aadff60 trả UPDATE đúng ID mới; global allowed=true/forceUpdate=false.
- Thời điểm xác minh UTC: 2026-10-31T07:07:52.807Z. Giữ auto reload khi active và ngoài bắt trận; không ép reload màn trọng tài.
