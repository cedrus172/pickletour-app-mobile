/** Dimensions use the scoreboard viewport after the toolbar and safe areas. */
export function getRefereeBoardLayout(width: number, height: number, fontScale = 1, portrait = false, preStart = false) {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const stacked = portrait || width < 540;
  const breakStacked = !portrait && stacked && width < 420;
  const scale = portrait ? clamp(width / 390, 0.82, 1.35) : clamp(Math.min(width / (stacked ? 600 : 900), height / (stacked ? 600 : 300)), 0.72, 1.35);
  const textScale = clamp(fontScale, 1, 1.3);
  const px = (value: number, min = 0) => Math.max(min, Math.round(value * scale));
  const gap = px(8, 6);
  const padding = px(8, 6);
  const titleFont = px(portrait ? 14 : 16, 12);
  const sideFont = px(11, 10);
  const titleLine = Math.ceil(titleFont * 1.25);
  const sideLine = Math.ceil(sideFont * 1.25);
  const avatarSize = px(portrait ? 28 : 32, 24);
  const playerFont = px(portrait ? 13 : 16, 11);
  const badgeHeight = Math.max(40, avatarSize + 8, Math.ceil(playerFont * 1.3 * textScale) + 10);
  const swapHeight = Math.max(36, px(34), Math.ceil(px(13, 11) * 1.3 * textScale) + 12);
  const breakFont = px(13, 11);
  const breakCountFont = px(18, 14);
  const breakLine = Math.ceil(breakFont * 1.2);
  const breakCountLine = Math.ceil(breakCountFont * 1.2);
  const breakHeight = Math.max(44, Math.ceil((breakLine + breakCountLine) * textScale) + 10);
  const headerHeight = portrait ? Math.max(34, swapHeight) : Math.ceil((titleLine + sideLine) * textScale) + px(8, 6);
  const stackHeight = portrait ? badgeHeight : badgeHeight * 2 + swapHeight + gap * 2;
  const teamMinHeight = padding * 2 + 8 + headerHeight + stackHeight + (breakStacked ? breakHeight * 2 + gap : breakHeight) + gap * 2;
  const ballSize = px(32, 24);
  const chipFont = px(12, 10);
  const chipHeight = Math.ceil(chipFont * 1.3 * textScale) + 6;
  const calloutFont = px(11, 10);
  const calloutLine = Math.ceil(calloutFont * 1.3);
  const resultFont = px(20, 16);
  const resultLine = Math.ceil(resultFont * 1.2);
  const resultLabelFont = px(10, 9);
  const resultLabelLine = Math.ceil(resultLabelFont * 1.3);
  const resultHeight = Math.ceil((resultLine + resultLabelLine) * 2 * textScale) + gap;
  const centerFixedHeight = padding * 2 + 4 + ballSize + chipHeight * 2 + Math.ceil(calloutLine * textScale) + resultHeight + 5 * 3;
  const scoreFont = portrait ? px(68, 54) : Math.round(clamp(((stacked ? height / 2 : height) - centerFixedHeight) / (1.1 * textScale), 42, px(86)));
  const scoreLine = Math.ceil(scoreFont * 1.1);
  const centerMinHeight = portrait ? Math.ceil((preStart ? 226 : 194) * scale * textScale) : centerFixedHeight + Math.ceil(scoreLine * textScale);
  const minHeight = portrait ? teamMinHeight * 2 + centerMinHeight + gap * 2 : stacked ? teamMinHeight + centerMinHeight + gap : Math.max(teamMinHeight, centerMinHeight);
  return { scale, portrait, stacked, breakStacked, teamMinHeight, centerMinHeight, gap, padding, titleFont, titleLine, sideFont, sideLine, headerHeight,
    avatarSize, badgeHeight, playerFont, swapHeight, breakFont, breakCountFont,
    breakLine, breakCountLine, breakHeight, stackHeight, ballSize, chipFont,
    chipHeight, calloutFont, calloutLine, resultFont, resultLine, resultLabelFont,
    resultLabelLine, scoreFont, scoreLine, minHeight };
}

export type RefereeBoardLayout = ReturnType<typeof getRefereeBoardLayout>;
