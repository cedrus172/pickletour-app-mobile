# Tổng quan giải đấu — 31/10/2026

## Trạng thái

- User duyệt thiết kế và chốt: **“Ok làm đi nhưng chưa ota luôn”**.
- Đã triển khai source `28c1129a15f8e603e99b5e0f147eaf10c044213e` trên `feat/ui-v2-modern`. **CHƯA OTA**: không build/upload/kích hoạt bundle trong lượt này. Chỉ phát khi user yêu cầu tiếp.
- OTA gần nhất đã xác minh ở lượt trước vẫn là modal trọng tài `0640080846408bbb1983497a4987fb0d573a569a`: iOS `01a190e3-c379-7032-8b7a-e38b400d42c7`, Android `01a190e5-2b4a-7f59-9b87-bac053757282`. Không đọc lại server trong lượt này.

## Phạm vi source

1. `app/tournament/[id]/index.tsx`: bố cục V2 theo ảnh duyệt.
2. `components/tournament/OverviewHeroArt.tsx`: minh họa sân/lưới/bóng bằng react-native-svg đang có và helper tách nhãn từ tên hiện hữu.

Giữ header quay lại, không thêm chuông hoặc bottom navigation vào màn sâu. Hero navy/cyan, nhãn loại giải và đếm ngược; tên giải, nhãn nội dung riêng khi tên có sẵn dấu phân cách ` · ` hoặc ` • `; ngày và địa điểm. Không tự thêm dữ liệu giải.

Sáu lối tắt xếp 3×2: Lịch, Sơ đồ, Đăng ký, Nhóm Zalo, Đánh giá, Theo dõi. Đăng ký nền cyan; giữ trạng thái đang theo dõi và điểm đánh giá. MLP vẫn có nút thứ bảy và bracket ảo riêng. Giữ route, quyền, query, mutation và payload.

Bốn ô thống kê giữ số liệu thật, đăng ký là **đã thanh toán / tổng đăng ký**, không phải sức chứa. Giữ tiến độ, sân, bracket, hạn đăng ký, trận live/sắp tới, viewer, danh sách bracket và ba thao tác nhanh. V1 giữ fallback. Không thêm dependency, không sửa native, trọng tài, bốc thăm, font, OTA hay các trang khác.

## Lỗi khởi tạo bracket đã sửa

Bản cũ đọc `bracketsCount` trong useMemo thống kê trước khi khai báo biến. Harness chạy bản cũ tái hiện `Cannot access 'bracketsCount' before initialization`; dạng hạ cấp biến có thể hiện undefined. Chuyển nguyên callback thống kê xuống sau tính bracket và đổi dependency sang `bracketsCount`. AST callback không đổi. V2 hiển thị “Chưa có bracket” khi bằng 0.

## Kiểm tra

- Sáu viewport RN Web: 320×568, 375×812, 440×956, 844×390, 1024×768, 568×320. Có fixture safe inset và xoay.
- Render screen/SVG thật với fixture dữ liệu; kiểm tra grid 3×2, vùng chạm, không tràn ngang, tên dài, cuộn tới thao tác cuối, toàn bộ lối tắt, theo dõi/bỏ theo dõi/guest, dữ liệu rỗng/có trận, MLP và viewer wiring, V1/V2.
- Đối chiếu AST: 36 khai báo logic giữ nguyên; callback thống kê giữ nguyên.
- 41/41 regression test đạt: notification visibility, tournament presentation, isolated icon fonts, background OTA.
- ESLint: 0 lỗi/7 cảnh báo có sẵn, không diagnostic mới (baseline 0 lỗi/8 cảnh báo). Parse TSX và git diff --check đạt.
- Native header/bridge, safe area, query/mutation và viewer internals được mô phỏng. **Chưa thử điện thoại thật**, không khẳng định đã kiểm chứng UIKit/Dynamic Island hoặc API production.
- Không liên quan lỗi hiếm tự đóng màn trọng tài khi xoay; lỗi đó vẫn đang điều tra.

## Backup và quay lại

- Baseline `3452686bb1694428f944bd00c0234c89cffc8f8b`.
- Nhánh `codex/backup-before-tournament-overview-20261031`.
- Thư mục `/Users/admin/Projects/Pickletour/backups/2026-10-31-tournament-overview`: nguồn trước sửa, ảnh duyệt, baseline, kết quả QA, screenshot và bản bàn giao.
- Muốn bỏ thay đổi này: kiểm tra working tree rồi revert `28c1129a15f8e603e99b5e0f147eaf10c044213e`; không reset toàn repo. Vì chưa phát OTA, không cần thay production để quay lại source cũ.
- Giữ nguyên diff local `ios/Pickletourvn.xcodeproj/project.pbxproj` và `.buildlog/` có trước; không stage chúng.
