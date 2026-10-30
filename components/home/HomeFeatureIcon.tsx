import React from "react";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";

const cyan = "#12C9EE";
const blue = "#087EB6";
const lime = "#C6F52B";
const white = "#E9FAFF";
const navy = "#071B34";

function Ball({ cx, cy, r = 6 }: { cx: number; cy: number; r?: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={lime} />
      <Circle cx={cx - r * 0.28} cy={cy - r * 0.2} r="1" fill={navy} />
      <Circle cx={cx + r * 0.27} cy={cy - r * 0.1} r="1" fill={navy} />
      <Circle cx={cx} cy={cy + r * 0.27} r="1" fill={navy} />
    </G>
  );
}

function Paddle({ x = 0, y = 0, rotate = 0, fill = blue }: { x?: number; y?: number; rotate?: number; fill?: string }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${rotate} 32 32)`}>
      <Rect x="24" y="8" width="16" height="25" rx="7" fill={fill} stroke={cyan} strokeWidth="2.5" />
      <Path d="M32 33v18" stroke={cyan} strokeWidth="5" strokeLinecap="round" />
      <Path d="M29 49h6" stroke={lime} strokeWidth="3" strokeLinecap="round" />
    </G>
  );
}

function IconDrawing({ id }: { id: number }) {
  switch (id) {
    case 21: // Đặt sân
      return <G stroke={cyan} strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round">
        <Path d="M8 49 15 25h33l8 24Z" fill={blue} />
        <Path d="M12 39h40M32 25v24" />
        <Path d="M41 13a8 8 0 0 1 16 0c0 6-8 15-8 15s-8-9-8-15Z" fill={lime} stroke={navy} />
        <Circle cx="49" cy="13" r="2.8" fill={navy} stroke="none" />
      </G>;
    case 42: // Cắt Cam Sân
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Rect x="8" y="13" width="39" height="29" rx="6" fill={cyan} />
        <Path d="m47 21 10-6v25l-10-6Z" fill={cyan} />
        <Path d="m16 53 27-27M24 32l19 21" stroke={white} strokeWidth="3.5" />
        <Circle cx="16" cy="53" r="4" fill={lime} stroke={navy} strokeWidth="2" />
        <Circle cx="43" cy="53" r="4" fill={lime} stroke={navy} strokeWidth="2" />
      </G>;
    case 1: // Lịch thi đấu
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Rect x="9" y="12" width="46" height="42" rx="6" fill={white} stroke={cyan} strokeWidth="3" />
        <Path d="M9 24h46M20 7v10M44 7v10" stroke={cyan} strokeWidth="4" />
        <Path d="M18 32h8M18 40h8M34 32h8" stroke={blue} strokeWidth="3" />
        <Ball cx={44} cy={44} r={9} />
      </G>;
    case 2: // Bảng xếp hạng
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Path d="M19 10h26v17c0 10-6 16-13 16S19 37 19 27Z" fill={cyan} />
        <Path d="M19 15H9v8c0 8 6 12 12 12M45 15h10v8c0 8-6 12-12 12" stroke={cyan} strokeWidth="3.5" />
        <Path d="m32 17 2.3 4.6 5 .7-3.6 3.5.9 5-4.6-2.4-4.6 2.4.9-5-3.6-3.5 5-.7Z" fill={lime} />
        <Path d="M32 43v8M21 55h22" stroke={cyan} strokeWidth="4" />
      </G>;
    case 3: // Thống kê
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Rect x="9" y="38" width="9" height="17" rx="2" fill={cyan} />
        <Rect x="23" y="31" width="9" height="24" rx="2" fill={cyan} />
        <Rect x="37" y="22" width="9" height="33" rx="2" fill={cyan} />
        <Path d="m9 29 15-9 11 3 18-13M45 10h8v8" stroke={lime} strokeWidth="4" />
      </G>;
    case 4: // Hướng dẫn
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Path d="M32 18c-7-5-15-6-24-3v34c9-3 17-2 24 3 7-5 15-6 24-3V15c-9-3-17-2-24 3Z" fill={white} stroke={cyan} strokeWidth="3" />
        <Path d="M32 18v34M15 23h10M15 30h10M15 37h8" stroke={blue} strokeWidth="2.5" />
        <Ball cx={45} cy={33} r={7} />
      </G>;
    case 5: // Tin tức
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Rect x="10" y="12" width="42" height="43" rx="4" fill={white} stroke={cyan} strokeWidth="3" />
        <Path d="M52 20h5v29c0 4-2 6-5 6" stroke={cyan} strokeWidth="3" />
        <Rect x="16" y="19" width="14" height="13" rx="2" fill={blue} />
        <Path d="M35 21h10M35 27h10M16 38h29M16 45h29" stroke={blue} strokeWidth="2.7" />
      </G>;
    case 6: // Live
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Rect x="7" y="18" width="39" height="29" rx="6" fill={cyan} />
        <Path d="m46 26 10-6v25l-10-6Z" fill={cyan} />
        <Circle cx="17" cy="39" r="4" fill={lime} />
        <Path d="M54 14c4 3 6 7 6 12M50 17c3 2 4 5 4 8" stroke={lime} strokeWidth="2.8" />
      </G>;
    case 8: // Câu lạc bộ
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Path d="M32 7 52 14v17c0 13-8 21-20 27C20 52 12 44 12 31V14Z" fill={blue} stroke={cyan} strokeWidth="3.5" />
        <Path d="M25 35 19 25l6-6 8 9M39 35l6-10-6-6-8 9" fill={cyan} stroke={navy} strokeWidth="2" />
        <Ball cx={32} cy={40} r={6} />
      </G>;
    case 9: // Trận đấu
      return <G>
        <Paddle x={-10} y={0} rotate={-34} />
        <Paddle x={10} y={0} rotate={34} />
        <Ball cx={32} cy={43} r={6} />
      </G>;
    case 10: // Hỗ trợ / Góp ý
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Path d="M10 16a8 8 0 0 1 8-8h28a8 8 0 0 1 8 8v25a8 8 0 0 1-8 8H25L14 57v-8a8 8 0 0 1-4-8Z" fill={cyan} />
        <Path d="M27 22a6 6 0 1 1 9 5c-3 2-4 3-4 6" stroke={white} strokeWidth="4" />
        <Circle cx="32" cy="40" r="2.5" fill={lime} />
      </G>;
    case 11: // Quanh đây
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="32" cy="32" r="25" stroke={cyan} strokeWidth="3" />
        <Circle cx="32" cy="32" r="17" stroke={blue} strokeWidth="2.5" />
        <Circle cx="32" cy="32" r="7" stroke={blue} strokeWidth="2" />
        <Path d="M32 7v50M7 32h50" stroke={blue} strokeWidth="2" />
        <Circle cx="32" cy="32" r="3" fill={cyan} />
        <Path d="M40 19a6 6 0 0 1 12 0c0 4-6 11-6 11s-6-7-6-11Z" fill={lime} />
      </G>;
    case 12: // Đối đầu
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 16c-5 4-5 11 0 16l13 9 10-10-12-14c-3-4-8-4-11-1Z" fill={blue} stroke={cyan} strokeWidth="3" />
        <Path d="M52 16c5 4 5 11 0 16l-13 9-10-10 12-14c3-4 8-4 11-1Z" fill={lime} stroke={cyan} strokeWidth="3" />
        <Path d="m27 38-8 12m18-12 8 12" stroke={cyan} strokeWidth="4" />
        <Ball cx={32} cy={37} r={6} />
      </G>;
    case 13: // Bảng tin
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Rect x="13" y="14" width="38" height="41" rx="4" fill={blue} />
        <Rect x="8" y="8" width="38" height="41" rx="4" fill={white} stroke={cyan} strokeWidth="2.5" />
        <Path d="M15 17h24M15 24h24M15 43h18" stroke={blue} strokeWidth="2.7" />
        <Rect x="15" y="29" width="18" height="9" rx="2" fill={cyan} />
        <Path d="M46 37c-3-4-10-1-7 4l7 8 7-8c3-5-4-8-7-4Z" fill={lime} />
      </G>;
    case 16: // Thông báo
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Path d="M32 10c-9 0-14 7-14 16v10c0 4-3 7-6 10h40c-3-3-6-6-6-10V26c0-9-5-16-14-16Z" fill={cyan} />
        <Path d="M26 51c1 4 3 6 6 6s5-2 6-6" fill={lime} />
        <Path d="m11 15-4-4m46 4 4-4" stroke={lime} strokeWidth="3" />
      </G>;
    case 14: // Nhắn tin
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Path d="M23 18h28a7 7 0 0 1 7 7v19a7 7 0 0 1-7 7h-8l-8 7v-7H23a7 7 0 0 1-7-7V25a7 7 0 0 1 7-7Z" fill={lime} />
        <Path d="M13 8h30a7 7 0 0 1 7 7v22a7 7 0 0 1-7 7H24l-10 8v-8h-1a7 7 0 0 1-7-7V15a7 7 0 0 1 7-7Z" fill={cyan} />
        <Circle cx="20" cy="27" r="2.6" fill={white} /><Circle cx="28" cy="27" r="2.6" fill={white} /><Circle cx="36" cy="27" r="2.6" fill={white} />
      </G>;
    case 15: // Bạn bè
      return <G>
        <Circle cx="25" cy="19" r="9" fill={cyan} />
        <Path d="M9 52c0-11 6-18 16-18s16 7 16 18v4H9Z" fill={cyan} />
        <Circle cx="45" cy="24" r="7" fill={lime} />
        <Path d="M38 55V51c0-7-2-11-5-14 4-4 8-5 12-5 9 0 14 7 14 17v6Z" fill={lime} />
      </G>;
    case 17: // Huấn luyện viên
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Rect x="29" y="10" width="28" height="43" rx="3" fill={navy} stroke={cyan} strokeWidth="3" />
        <Path d="M35 21h14M36 33l7 5 8-12M35 46h14" stroke={lime} strokeWidth="2.7" />
        <Path d="M7 33h17l5 11-7 7H11l-5-7Z" fill={cyan} />
        <Circle cx="16" cy="40" r="4.5" fill={navy} />
      </G>;
    case 19: // Chợ Mua bán
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 20h40l-3 37H15Z" fill={cyan} />
        <Path d="M22 23v-7a10 10 0 0 1 20 0v7" stroke={lime} strokeWidth="4" />
        <Ball cx={32} cy={40} r={8} />
      </G>;
    case 20: // Tìm bạn đánh
      return <G strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="29" cy="28" r="20" stroke={cyan} strokeWidth="5" />
        <Path d="m44 44 14 14" stroke={cyan} strokeWidth="7" />
        <Path d="M27 18c-4-2-8 1-8 6 0 7 6 11 12 10l7-10c-2-5-6-8-11-6Z" fill={lime} />
        <Path d="m31 34 5 7" stroke={lime} strokeWidth="4" />
      </G>;
    default:
      return <Ball cx={32} cy={32} r={13} />;
  }
}

export default function HomeFeatureIcon({ id, size = 58 }: { id: number; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="" focusable={false}>
      <IconDrawing id={id} />
    </Svg>
  );
}
