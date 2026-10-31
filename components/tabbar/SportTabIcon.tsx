import React from "react";
import Svg, { G, Path, Rect } from "react-native-svg";

// Code-drawn navigation glyphs stay sharp at every density and need no font reload.
export default function SportTabIcon({ name, color, size = 25 }: { name: string; color: string; size?: number }) {
  const cut = "#061B30";
  let drawing;
  switch (name) {
    case "index":
      drawing = <G><Path d="M3 14 16 2l13 12-3 3L16 8 6 17Z" fill={color} /><Path d="M8 16 16 9l8 7v13h-6V19h-4v10H8Z" fill={color} /></G>;
      break;
    case "feed":
      drawing = <G><Path d="M8 3h21v25H8Z" fill={color} opacity={0.5} /><Path d="M3 9 8 5h16v25H3Z" fill={color} /><Path d="M7 10h13M7 13h13M15 17h5M15 21h5M7 26h13" stroke={cut} strokeWidth={1.5} /><Rect x={7} y={17} width={5} height={6} fill={cut} /></G>;
      break;
    case "tournaments":
      drawing = <G><Path d="M9 4h14v9c0 6-3 9-7 9s-7-3-7-9Z" fill={color} /><Path d="M9 7H3v5c0 5 4 8 9 8M23 7h6v5c0 5-4 8-9 8" fill="none" stroke={color} strokeWidth={2.3} /><Path d="M14 21h4v6h5v3H9v-3h5Z" fill={color} /></G>;
      break;
    case "rankings":
      drawing = <G fill={color}><Path d="m3 22 6-4v12H3Z" opacity={0.7} /><Path d="m13 15 6-4v19h-6Z" opacity={0.85} /><Path d="m23 6 6-4v28h-6Z" /></G>;
      break;
    default:
      drawing = <G fill={color}><Rect x={3} y={3} width={11} height={11} rx={2.5} /><Rect x={18} y={3} width={11} height={11} rx={2.5} /><Rect x={3} y={18} width={11} height={11} rx={2.5} /><Rect x={18} y={18} width={11} height={11} rx={2.5} /></G>;
  }
  return <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false} focusable={false}>{drawing}</Svg>;
}
