// utils/refereeTrainingSteps.js — các bước tập huấn trọng tài (giải bật refereeTraining).
// Hàm thuần: nhận trạng thái trận + "bộ nhớ" quan sát → danh sách bước và bước hiện tại.

export function isTrainingMatch(match) {
  return match?.tournament?.refereeTraining?.enabled === true;
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Tóm tắt trạng thái trận cần cho việc dò bước. */
export function trainingSnapshot(match) {
  const gs = Array.isArray(match?.gameScores) ? match.gameScores : [];
  const cur = gs[Math.max(0, gs.length - 1)] || {};
  const a = num(cur.a);
  const b = num(cur.b);
  const status = String(match?.status || "").toLowerCase();
  const serve = match?.serve || {};
  return {
    status,
    started: status === "live" || status === "finished",
    finished: status === "finished" || !!String(match?.winner || "").trim(),
    a,
    b,
    total: gs.reduce((s, g) => s + num(g?.a) + num(g?.b), 0),
    serveKey: `${serve.side === "B" ? "B" : "A"}${num(serve.order ?? serve.server) === 2 ? 2 : 1}`,
    pointsToWin: num(match?.rules?.pointsToWin) || 11,
  };
}

/**
 * Cập nhật "bộ nhớ" từ lần quan sát trước sang lần này (đổi giao, hoàn tác…).
 * memo: { prevTotal, prevServe, serveChanged, undoUsed, maxTotal }
 */
export function observeTraining(memo, snap) {
  const m = { ...(memo || {}) };
  if (snap.started) {
    if (m.prevServe && m.prevServe !== snap.serveKey) m.serveChanged = true;
    if (typeof m.prevTotal === "number" && snap.total < m.prevTotal) m.undoUsed = true;
    m.prevServe = snap.serveKey;
  }
  m.prevTotal = snap.total;
  m.maxTotal = Math.max(m.maxTotal || 0, snap.total);
  return m;
}

export function trainingSteps(snap, memo = {}, ack = {}) {
  const half = Math.ceil(snap.pointsToWin / 2);
  const reachedHalf = Math.max(snap.a, snap.b) >= half;
  const steps = [
    {
      key: "check",
      title: "Kiểm tra trận trước khi đấu",
      body:
        "Xem đúng sân, tên 2 đội và thể thức (1 game 11 điểm, cách 2). Đứng ở vị trí trọng tài, bên trái màn hình là đội phía tay trái bạn — bấm biểu tượng đổi bên nếu bị ngược.",
      done: !!ack.check || snap.started,
      manual: true,
    },
    {
      key: "serve",
      title: "Chọn đội giao trước",
      body:
        "Tung đồng xu / bốc thăm. Chạm vào đội giao bóng trước và người giao. Trận đôi mở màn gọi \"0-0-2\": đội giao đầu chỉ có 1 lượt giao.",
      done: !!ack.serve || snap.started,
      manual: true,
    },
    {
      key: "start",
      title: "Bấm \"Bắt đầu trận\"",
      body: "Khi hai đội sẵn sàng, bấm nút Bắt đầu trận ở dưới cùng. Từ lúc này mọi thao tác được ghi lại và phát trực tiếp.",
      done: snap.started,
    },
    {
      key: "point",
      title: "Đội giao thắng pha → cộng điểm",
      body:
        "Chỉ đội ĐANG GIAO mới được điểm. Đội giao thắng pha bóng thì bấm vào ô điểm của đội đó (+1). Người giao đổi ô sau mỗi điểm.",
      done: snap.started && snap.total > 0,
    },
    {
      key: "sideout",
      title: "Đội đỡ thắng pha → Đổi tay / Đổi giao",
      body:
        "Đội đỡ thắng pha thì KHÔNG cộng điểm. Bấm nút giữa: \"Đổi tay\" (chuyển sang người giao thứ 2) hoặc \"Đổi giao\" (side-out, quyền giao sang đội kia).",
      done: !!memo.serveChanged,
    },
    {
      key: "undo",
      title: "Bấm nhầm? Dùng Hoàn tác",
      body: "Nút Hoàn tác (mũi tên quay lại) xoá thao tác gần nhất. Thử cộng nhầm 1 điểm rồi bấm Hoàn tác để làm quen.",
      done: !!memo.undoUsed || !!ack.undo,
      manual: true,
    },
    {
      key: "half",
      title: `Đổi sân khi một đội chạm ${half} điểm`,
      body:
        `Ở game quyết định, khi một đội đạt ${half} điểm app sẽ nhắc đổi sân. Xác nhận để hai bên trên màn hình đổi theo vị trí thật của VĐV.`,
      done: reachedHalf || snap.finished,
    },
    {
      key: "finish",
      title: "Kết thúc trận",
      body:
        `Một đội đạt ${snap.pointsToWin} điểm và hơn đối thủ ít nhất 2 điểm thì bấm "Kết thúc trận" và xác nhận đội thắng. Kiểm tra tỉ số với VĐV trước khi xác nhận.`,
      done: snap.finished,
    },
    {
      key: "next",
      title: "Sang trận kế tiếp",
      body:
        "Xong! Trận kế tiếp của giải tập huấn sẽ tự vào sân này sau vài giây. Quay lại danh sách sân để mở trận mới.",
      done: false,
    },
  ];
  let current = steps.findIndex((s) => !s.done);
  if (current < 0) current = steps.length - 1;
  return { steps, current, doneCount: steps.filter((s) => s.done).length };
}

/** Hướng dẫn chung khi vào giải tập huấn (trang giải). */
export const TRAINING_INTRO_STEPS = [
  {
    title: "Nhận quyền chấm",
    body: "Quét mã QR cụm sân tập huấn do ban tổ chức đưa (More → Quét QR trọng tài), hoặc được admin thêm vào danh sách trọng tài cụm.",
  },
  {
    title: "Mở danh sách sân",
    body: "Vào \"Chấm trận theo cụm sân\" → Cụm sân Tập huấn trọng tài. Có 9 sân, mỗi sân luôn có sẵn 1 trận đang chờ.",
  },
  {
    title: "Chọn sân và mở trận",
    body: "Bấm vào thẻ sân để mở màn chấm điểm. Có thể ghim sân mình phụ trách lên đầu danh sách.",
  },
  {
    title: "Làm theo thẻ hướng dẫn",
    body: "Trong màn chấm điểm có thẻ \"Tập huấn\" chỉ từng bước: chọn giao, bắt đầu, cộng điểm, đổi giao, hoàn tác, đổi sân, kết thúc.",
  },
  {
    title: "Trận kế tiếp tự vào sân",
    body: "Kết thúc trận xong, trận tiếp theo (Playoff rồi Knockout) tự gán vào đúng sân vừa trống.",
  },
  {
    title: "Giải tự làm mới mỗi ngày",
    body: "00:05 mỗi ngày giải được dựng lại từ đầu với cặp đấu mới. Đây là dữ liệu giả lập, không tính điểm trình.",
  },
];
