const ACTIONS = {
  INC_POINT: "INC_POINT",
  SIDE_OUT: "SIDE_OUT",
  TOGGLE_SERVER: "TOGGLE_SERVER",
  SWAP_SIDES: "SWAP_SIDES",
  UNDO: "UNDO",
  TIMEOUT: "TIMEOUT",
  MEDICAL: "MEDICAL",
  CONTINUE: "CONTINUE",
  START_MATCH: "START_MATCH",
  START_NEXT_GAME: "START_NEXT_GAME",
  FINISH_MATCH: "FINISH_MATCH",
};

const PHRASES = {
  sideOut: [
    "doi giao",
    "mat giao",
    "side out",
    "change serve",
    "chuyen giao",
  ],
  toggleServer: [
    "doi tay",
    "tay hai",
    "tay 2",
    "server hai",
    "server 2",
    "second server",
  ],
  swapSides: [
    "chuyen ben",
    "swap side",
    "swap sides",
    "doi san",
  ],
  undo: [
    "hoan tac",
    "hoan tat",
    "undo",
    "nham roi",
    "sai roi",
    "bam nham",
    "quay lai",
    "tro lai",
    "huy diem",
    "bo diem",
  ],
  timeout: ["timeout", "time out", "xin timeout", "tam dung", "het gio", "nghi"],
  medical: ["y te", "y ta", "medical", "injury", "chan thuong"],
  continue: ["tiep tuc", "choi tiep", "het nghi", "resume", "continue"],
  startMatch: [
    "bat dau tran",
    "bat tran",
    "vao tran",
    "start match",
    "start game",
  ],
  startNextGame: [
    "bat game tiep",
    "game tiep",
    "van tiep",
    "set tiep",
    "next game",
    "game moi",
  ],
  finishMatch: [
    "ket thuc tran",
    "ket tran",
    "chot tran",
    "dong tran",
    "finish match",
    "end match",
  ],
  scoreStrong: [
    "ghi diem",
    "them diem",
    "point",
    "score point",
    "co diem",
    "duoc diem",
  ],
};

// iOS nhận dạng tiếng Việt hay nghe "điểm" thành: dấm/dím/diễm/giem... →
// chuẩn hoá về: dam/dim/diem/giem. Thêm biến thể + khớp mờ (edit distance ≤1).
const SCORE_SHORT_TOKENS = new Set([
  "diem", "point", "yes",
  "dam", "dim", "diam", "deim", "giem", "diemm", "gdiem", "ziem", "dziem",
]);
const SCORE_AMBIGUOUS_TOKENS = new Set(["co", "vao", "duoc"]);

// Levenshtein nhỏ gọn để bắt các biến thể gần "diem"/"dam".
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 1) return 2;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function isScoreToken(token) {
  if (!token) return false;
  if (SCORE_SHORT_TOKENS.has(token)) return true;
  if (token.length >= 3 && token.length <= 5) {
    if (editDistance(token, "diem") <= 1) return true;
    if (editDistance(token, "dam") <= 1) return true;
  }
  return false;
}

function fuzzyEq(a, b, maxD = 1) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > maxD) return false;
  return editDistance(a, b) <= maxD;
}

function hasFuzzyToken(tokens, target, maxD = 1) {
  return tokens.some((t) => fuzzyEq(t, target, maxD));
}

// Nhóm lệnh "ĐỔI ..." — iOS hay nghe SAI TỪ THỨ HAI: giao→rau/dao/rao, tay→tai, bên→benh.
// "đổi/đội/đôi/dỗi" đều chuẩn hoá về "doi". Phân biệt theo từ sau; mặc định "đổi <gì đó>"
// = ĐỔI GIAO (lệnh dùng nhiều nhất của trọng tài).
function parseDoiCommand(tokens) {
  const i = tokens.indexOf("doi");
  if (i === -1) return null;
  const next = tokens[i + 1] || "";
  if (!next) return null;
  if (fuzzyEq(next, "tay") || fuzzyEq(next, "tai")) {
    return makeCommand(ACTIONS.TOGGLE_SERVER, "Đổi tay", { confidence: 0.9 });
  }
  if (fuzzyEq(next, "ben") || fuzzyEq(next, "san")) {
    return makeCommand(ACTIONS.SWAP_SIDES, "Đổi bên", { confidence: 0.9 });
  }
  // còn lại: đổi giao / đổi rau / đổi dao / đổi rao / đổi giầu / đổi gao ...
  return makeCommand(ACTIONS.SIDE_OUT, "Đổi giao", { confidence: 0.85 });
}

const LEFT_PHRASES = ["ben trai", "doi trai", "trai", "left", "team left"];
const RIGHT_PHRASES = ["ben phai", "doi phai", "phai", "right", "team right"];
const TEAM_A_PHRASES = ["doi a", "ben a", "team a"];
const TEAM_B_PHRASES = ["doi b", "ben b", "team b"];
const ACTIVE_SIDE_PHRASES = ["doi giao", "ben giao", "server", "dang giao"];

const HINT_WORDS = [
  "diem",
  "point",
  "doi",
  "timeout",
  "y te",
  "medical",
  "undo",
  "hoan tac",
  "start",
  "bat",
  "ket thuc",
  "tiep",
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPhrase(text, phrase) {
  if (!text || !phrase) return false;
  return text === phrase || text.includes(phrase);
}

function hasAnyPhrase(text, phrases = []) {
  return phrases.some((phrase) => hasPhrase(text, phrase));
}

function hasToken(text, token) {
  if (!text || !token) return false;
  const tokens = text.split(/\s+/);
  return tokens.includes(token);
}

function normalizeContext(context = {}) {
  const leftSide = context.leftSide === "B" ? "B" : "A";
  const rightSide =
    context.rightSide === "A" || context.rightSide === "B"
      ? context.rightSide
      : leftSide === "A"
        ? "B"
        : "A";
  const activeSide = context.activeSide === "B" ? "B" : "A";
  return {
    activeSide,
    leftSide,
    rightSide,
    localBreak: Boolean(context.localBreak),
    canUndo: Boolean(context.canUndo),
    ctaLabel: normalizeText(context.ctaLabel || ""),
  };
}

function resolveUiSide(text, context) {
  const hasLeft =
    hasAnyPhrase(text, LEFT_PHRASES) ||
    hasAnyPhrase(text, ["doi ben trai", "doi trai", "left side"]);
  const hasRight =
    hasAnyPhrase(text, RIGHT_PHRASES) ||
    hasAnyPhrase(text, ["doi ben phai", "doi phai", "right side"]);

  if (hasLeft && !hasRight) return "left";
  if (hasRight && !hasLeft) return "right";

  if (hasAnyPhrase(text, ACTIVE_SIDE_PHRASES)) {
    return context.activeSide === context.leftSide ? "left" : "right";
  }

  return "";
}

function resolveTeamKey(text, context, uiSide = "") {
  if (hasAnyPhrase(text, TEAM_A_PHRASES)) return "A";
  if (hasAnyPhrase(text, TEAM_B_PHRASES)) return "B";
  if (uiSide === "left") return context.leftSide;
  if (uiSide === "right") return context.rightSide;
  if (hasToken(text, "a")) return "A";
  if (hasToken(text, "b")) return "B";
  if (hasAnyPhrase(text, ACTIVE_SIDE_PHRASES)) return context.activeSide;
  return "";
}

function resolveCommandTeamKey(text, context, uiSide = "") {
  if (uiSide === "left") return context.leftSide;
  if (uiSide === "right") return context.rightSide;
  return resolveTeamKey(text, context, uiSide);
}

function buildSideFeedback(prefix, teamKey, uiSide, context) {
  if (uiSide === "left") return `${prefix} bên trái`;
  if (uiSide === "right") return `${prefix} bên phải`;
  if (teamKey === "A" && context.leftSide === "A") return `${prefix} bên trái`;
  if (teamKey === "B" && context.leftSide === "B") return `${prefix} bên trái`;
  if (teamKey === "A" || teamKey === "B") return `${prefix} bên phải`;
  return prefix;
}

function makeCommand(action, feedback, extras = {}) {
  return {
    action,
    feedback,
    confidence: Number(extras.confidence || 0.95),
    ...extras,
  };
}

function parseScoreCommand(text, context) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const hasStrongPhrase = hasAnyPhrase(text, PHRASES.scoreStrong);
  const hasShortScoreToken = tokens.some(isScoreToken);
  const hasAmbiguousScoreToken =
    tokens.length <= 3 &&
    tokens.some((token) => SCORE_AMBIGUOUS_TOKENS.has(token));

  if (!hasStrongPhrase && !hasShortScoreToken && !hasAmbiguousScoreToken) {
    return null;
  }

  const uiSide = resolveUiSide(text, context);
  const teamKey = resolveCommandTeamKey(text, context, uiSide) || context.activeSide;

  return makeCommand(
    ACTIONS.INC_POINT,
    buildSideFeedback("Điểm", teamKey, uiSide, context),
    {
      confidence: hasAmbiguousScoreToken ? 0.72 : 0.97,
      teamKey,
      teamUiSide: uiSide || undefined,
    }
  );
}

export function looksLikeVoiceCommand(transcript) {
  const text = normalizeText(transcript);
  if (!text) return false;
  return HINT_WORDS.some((hint) => text.includes(hint));
}

export function parseVoiceCommand(transcript, rawContext = {}) {
  const text = normalizeText(transcript);
  if (!text) return null;

  const context = normalizeContext(rawContext);
  const uiSide = resolveUiSide(text, context);
  const teamKey = resolveCommandTeamKey(text, context, uiSide);

  const tokens = text.split(/\s+/).filter(Boolean);

  // UNDO: hoàn tác / hoàn tất / huỷ / undo / nhầm rồi / sai rồi / quay lại ...
  if (
    hasAnyPhrase(text, PHRASES.undo) ||
    (hasFuzzyToken(tokens, "hoan") &&
      (hasFuzzyToken(tokens, "tac") || hasFuzzyToken(tokens, "tat")))
  ) {
    return makeCommand(ACTIONS.UNDO, "Hoàn tác", { confidence: 0.98 });
  }

  // Nhóm "đổi ..." (đổi giao / đổi tay / đổi bên) — khớp mờ từ thứ hai.
  const doiCmd = parseDoiCommand(tokens);
  if (doiCmd) return doiCmd;

  if (hasAnyPhrase(text, PHRASES.swapSides)) {
    return makeCommand(ACTIONS.SWAP_SIDES, "Đổi bên", { confidence: 0.96 });
  }

  if (hasAnyPhrase(text, PHRASES.toggleServer)) {
    return makeCommand(ACTIONS.TOGGLE_SERVER, "Đổi tay", { confidence: 0.96 });
  }

  if (hasAnyPhrase(text, PHRASES.sideOut)) {
    return makeCommand(ACTIONS.SIDE_OUT, "Đổi giao", { confidence: 0.98 });
  }

  if (hasAnyPhrase(text, PHRASES.finishMatch)) {
    return makeCommand(ACTIONS.FINISH_MATCH, "Kết thúc trận", {
      confidence: 0.98,
    });
  }

  if (hasAnyPhrase(text, PHRASES.startNextGame)) {
    return makeCommand(ACTIONS.START_NEXT_GAME, "Bắt game tiếp", {
      confidence: 0.98,
    });
  }

  if (
    hasAnyPhrase(text, PHRASES.startMatch) ||
    hasPhrase(text, "bat dau") ||
    text === "start"
  ) {
    if (context.ctaLabel === normalizeText("Bắt game tiếp")) {
      return makeCommand(ACTIONS.START_NEXT_GAME, "Bắt game tiếp", {
        confidence: 0.9,
      });
    }
    return makeCommand(ACTIONS.START_MATCH, "Bắt đầu", {
      confidence: 0.96,
    });
  }

  if (hasAnyPhrase(text, PHRASES.continue) || (context.localBreak && text === "tiep")) {
    return makeCommand(ACTIONS.CONTINUE, "Tiếp tục", {
      confidence: 0.96,
    });
  }

  if (hasAnyPhrase(text, PHRASES.medical)) {
    return makeCommand(
      ACTIONS.MEDICAL,
      buildSideFeedback("Y tế", teamKey, uiSide, context),
      {
        confidence: 0.95,
        teamKey: teamKey || undefined,
        teamUiSide: uiSide || undefined,
      }
    );
  }

  if (hasAnyPhrase(text, PHRASES.timeout)) {
    return makeCommand(
      ACTIONS.TIMEOUT,
      buildSideFeedback("Timeout", teamKey, uiSide, context),
      {
        confidence: 0.95,
        teamKey: teamKey || undefined,
        teamUiSide: uiSide || undefined,
      }
    );
  }

  return parseScoreCommand(text, context);
}

export { ACTIONS, normalizeText as normalizeVoiceTranscript };
