# Nền quanh navigation trong suốt — 31/10/2026

## Mã và phạm vi

- Commit nguồn: `aadff6012fba930575d981cb8a274e305dae0d86`, nhánh `feat/ui-v2-modern`. User báo vùng đen quanh dock chiếm diện tích và yêu cầu làm trong suốt.
- Nguyên nhân: bản thân SportBottomBar đã có backgroundColor transparent nhưng vẫn nằm trong luồng flex của BottomTabView. Ở viewport 440×956 với inset đáy 34, bar dành riêng 122 px khiến màn nội dung chỉ còn cao 834 px; phần này lộ nền navigator. Chỉ đổi màu nền không xử lý được.
- Chuyển bar thành absolute overlay ở đáy, nội dung sử dụng đủ chiều cao và chạy phía sau dock. Root/items dùng pointerEvents box-none để khoảng trống ngoài nút không chặn thao tác. Ô chạm bốn tab thường cao 64 px, bắt đầu sau khoảng nhô 24 px; ô Giải đấu vẫn cao 88 px và bấm được phần nhô.
- Giữ nguyên vị trí màn hình của icon/label, hình dáng và nền bên trong dock, nút cúp cyan 58 px, năm tab, màu và opacity bốn nút thường (.78 chưa chọn/.9 đã chọn), opacity nút Giải đấu 1. Giữ tabPress, preventDefault, tabLongPress, route/params, selected/accessibility và lời gọi haptic cũ.
- Hook useFloatingTabBarPadding chỉ dùng với giao diện V2 nằm trong tab navigator: max(padding cũ, 88 + max(inset đáy,8) +12). BottomTabBarHeightContext dùng để xác định màn nằm trong tab navigator; không dùng giá trị chiều cao mặc định của thư viện vì custom bar không báo kích thước qua API đó.
- Áp dụng vào phần đuôi nội dung cuộn của cả năm tab, gồm skeleton/loading và chart xếp hạng. Đây là padding cuộn cuối trang để thao tác cuối có thể cuộn lên trên dock, không phải vùng nền cố định. V1 và các alias/màn sâu ngoài tab giữ fallback cũ.
- Không thêm dependency, không đổi API/quyền/dữ liệu, root safe area hay logic reload OTA. Giữ điều hành trận 91e067e, splash b537f64, phạm vi chuông b10b061, giao diện trọng tài, icon/font và mọi tính năng trước đó.

## Đúng các file nguồn đã sửa

- components/tabbar/SportBottomBar.tsx
- hooks/useFloatingTabBarPadding.ts (mới)
- app/(tabs)/index.tsx
- app/(tabs)/feed.tsx
- app/(tabs)/more/index.tsx
- screens/tournaments.tsx
- screens/rankings.tsx
- components/RankingChart.tsx

## Kiểm tra và giới hạn

- Reproduction trước sửa: content cao 834/956 px, regressionPasses=false. Sau sửa: nội dung đủ chiều cao, không dành dải nền 122 px. Ảnh mid-scroll cho thấy nội dung đi phía sau khoảng trống quanh dock.
- RN Web harness dùng BottomNavigation, SportBottomBar, SportTabIcon và hook thật; mô phỏng native navigation/theme/safe area/haptic/Reanimated, nội dung trang là fixture. Sáu viewport: 320×568,375×812,440×956,844×390,1024×768 và 390×844 (inset đáy 48). Kiểm tra đủ chiều cao, trong suốt/click xuyên khoảng trống, cuộn thao tác cuối lên trên thanh và bấm được, padding năm tab/alias, năm tab/focus/opacity, route ẩn, vùng chạm tối thiểu 44 px, phần cúp nhô, preventDefault, xoay không tràn và V1.
- 41/41 test hồi quy route chuông/ngày giải/font/OTA đạt. ESLint các file thay đổi: 0 lỗi,14 warning cũ, không có diagnostic mới. git diff --check sạch.
- Chưa kiểm chứng trên điện thoại thật hoặc mọi trang native với dữ liệu production. Không suy diễn kết quả fixture thành kiểm chứng đầy đủ các màn hoặc haptic native.
- Diff native local ios/Pickletourvn.xcodeproj/project.pbxproj được giữ nguyên từng byte so với backup; .buildlog/ giữ nguyên, không stage/commit.

## Backup / quay lui

- Baseline d31137ec834c15c293db9dd9748212d70c0b85d5; đã push codex/backup-before-transparent-navigation-20261031.
- Nguồn cũ, ảnh user báo lỗi, baseline/release/QA/scripts: /Users/admin/Projects/Pickletour/backups/2026-10-31-transparent-navigation/.
- Khôi phục riêng thay đổi này: rà soát working tree, git revert --no-edit aadff60 rồi phát OTA mới iOS/Android production/1.1.x. Không reset repo hoặc chỉ tắt bundle đã phát; giữ điều hành trận 91e067e và các phần trước. Nếu có commit sau sửa cùng đoạn, rà soát conflict trước khi phát.

## OTA

- iOS production/1.1.x: `01a190c2-150d-73b7-91f4-b04108156301`.
- Android production/1.1.x: `01a190c3-3648-73c8-a82c-5412df3d6cc7`.
- enabled=true, shouldForceUpdate=false cả hai; global allowed=true/forceUpdate=false. Đã đọc lại metadata sau kích hoạt, public check từ bản điều hành trận 91e067e trả UPDATE đúng ID mới.
- Build tuần tự ở trạng thái disabled. Trước kích hoạt đã xác minh commit/hash zip, marker useFloatingTabBarPadding và toàn bộ marker điều hành trận/navigation/chuông/Giải đấu/splash giữ lại, SHA-256 background/logo splash và đủ 20 PNG icon. Activation applied=2. Thời điểm xác minh UTC: 2026-10-31T07:02:44.075Z.
- Giữ tải ngầm và tự reload khi active, ngoài màn bắt trận; trong màn bắt trận đợi rời màn theo guard cũ. Metadata thành công không đồng nghĩa mọi điện thoại đã tải/chạy bundle.
