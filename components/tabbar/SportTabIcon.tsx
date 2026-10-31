import React from "react";
import Svg, { G, Path, Rect } from "react-native-svg";

// Code-drawn navigation glyphs stay sharp at every density and need no font reload.
export default function SportTabIcon({ name, color, size = 25 }: { name: string; color: string; size?: number }) {
  let drawing;
  switch (name) {
    case "index":
      drawing = <Path d="M3 14 16 3l13 11h-5v15h-6v-9h-4v9H8V14Z" fill="none" stroke={color} strokeWidth={2.3} strokeLinejoin="round" />;
      break;
    case "feed":
      drawing = <G fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round"><Path d="M8 5V3h21v23h-3M3 8h21v21H3Z" /><Path d="M7 12h13M14 17h6M14 21h6M7 25h13" /><Rect x={7} y={17} width={4} height={4} rx={0.5} /></G>;
      break;
    case "tournaments":
      drawing = <G fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"><Path d="M9 4h14v9c0 6-3 9-7 9s-7-3-7-9ZM9 7H3v5c0 5 4 8 9 8M23 7h6v5c0 5-4 8-9 8M16 22v7M10 29h12" /></G>;
      break;
    case "rankings":
      drawing = <G fill={color}><Path d="m3 22 6-4v12H3Z" /><Path d="m13 15 6-4v19h-6Z" /><Path d="m23 6 6-4v28h-6Z" /></G>;
      break;
    default:
      drawing = <G fill="none" stroke={color} strokeWidth={2.2}><Rect x={3} y={3} width={10} height={10} rx={2.5} /><Rect x={19} y={3} width={10} height={10} rx={2.5} /><Rect x={3} y={19} width={10} height={10} rx={2.5} /><Rect x={19} y={19} width={10} height={10} rx={2.5} /></G>;
  }
  return <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false} focusable={false}>{drawing}</Svg>;
}
