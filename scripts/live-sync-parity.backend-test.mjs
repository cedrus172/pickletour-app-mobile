// So khớp bộ tính điểm trên máy trọng tài (utils/liveSyncReducer.js) với server
// (backend/services/matchLiveSync.service.js). PHẢI chạy lại mỗi khi sửa một trong hai bên,
// vì chế độ "chấm trên máy trước" dựa vào việc hai bên tính giống nhau.
// Cách chạy (từ thư mục backend của repo web):
//   cp <mobile>/utils/liveSyncReducer.js ./_client-reducer.tmp.mjs
//   cp <mobile>/scripts/live-sync-parity.backend-test.mjs ./_parity.tmp.test.mjs
//   SEED=1 RUNS=1200 node ./_parity.tmp.test.mjs ; rm -f ./_client-reducer.tmp.mjs ./_parity.tmp.test.mjs
import assert from "node:assert/strict";
import { applyLiveSyncEvent } from "./services/matchLiveSync.service.js";
import { applyLiveSyncEventLocally } from "./_client-reducer.tmp.mjs";

function setPath(target, path, value) {
  const parts = String(path || "").split(".").filter(Boolean);
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!cursor[parts[i]] || typeof cursor[parts[i]] !== "object") cursor[parts[i]] = {};
    cursor = cursor[parts[i]];
  }
  cursor[parts.at(-1)] = value;
}
let seed = Number(process.env.SEED || 12345);
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

function baseState(single) {
  return {
    status: "scheduled",
    eventType: single ? "single" : "double",
    rules: {
      bestOf: pick([1, 3]),
      pointsToWin: pick([11, 15, 21]),
      winByTwo: pick([true, false]),
      cap: pick([{ mode: "none", points: null }, { mode: "hard", points: 15 }, { mode: "soft", points: 17 }]),
    },
    gameScores: [],
    currentGame: 0,
    serve: { side: pick(["A", "B"]), server: 2, opening: true },
    liveLog: [],
    liveVersion: 0,
    meta: {},
    slots: { base: single ? { A: { a1: 1 }, B: { b1: 1 } } : { A: { a1: 1, a2: 2 }, B: { b1: 1, b2: 2 } } },
    pairA: { player1: { user: "a1" }, player2: single ? null : { user: "a2" } },
    pairB: { player1: { user: "b1" }, player2: single ? null : { user: "b2" } },
  };
}
const view = (m) => JSON.parse(JSON.stringify({
  status: m.status,
  winner: m.winner || "",
  currentGame: m.currentGame,
  gameScores: (m.gameScores || []).map((g) => ({ a: g.a, b: g.b })),
  serve: m.serve ? { side: m.serve.side, server: m.serve.server, serverId: m.serve.serverId || null, opening: !!m.serve.opening } : null,
  slotsBase: m.slots?.base || null,
  slotsServerId: m.slots?.serverId ?? null,
  layout: m.meta?.refereeLayout || null,
  log: (m.liveLog || []).map((e) => ({ type: e.type, team: e.payload?.team, step: e.payload?.step, prevServe: e.payload?.prevServe || null, nextServe: e.payload?.nextServe || null, prevBase: e.payload?.prevBase || null })),
  liveVersion: m.liveVersion,
}));

function randomEvent(single) {
  const r = rnd();
  if (r < 0.03) return { type: "start", payload: {} };
  if (r < 0.62) return { type: "point", payload: { team: pick(["A", "B"]), step: 1 } };
  if (r < 0.74) {
    const side = pick(["A", "B"]);
    const ids = side === "A" ? ["a1", "a2"] : ["b1", "b2"];
    return { type: "serve", payload: { side, server: pick([1, 2]), serverId: pick([null, ids[0], single ? ids[0] : ids[1]]), opening: pick([false, false, true, undefined]) } };
  }
  if (r < 0.80 && !single) {
    const swapA = rnd() < 0.5, swapB = rnd() < 0.5;
    const withServe = rnd() < 0.5;
    return { type: "slots", payload: {
      base: { A: swapA ? { a1: 2, a2: 1 } : { a1: 1, a2: 2 }, B: swapB ? { b1: 2, b2: 1 } : { b1: 1, b2: 2 } },
      layout: pick([null, { left: "B", right: "A" }, { left: "A", right: "B" }]),
      serve: withServe ? { side: pick(["A", "B"]), server: pick([1, 2]), serverId: null, opening: false } : null } };
  }
  if (r < 0.965) return { type: "undo", payload: {} };
  if (r < 0.972) return { type: "__break" };
  if (r < 0.977) return { type: "forfeit", payload: { winner: pick(["A", "B"]), reason: "forfeit" } };
  return { type: "finish", payload: { winner: pick(["A", "B"]) } };
}

let total = 0, rejected = 0;
const RUNS = Number(process.env.RUNS || 400);
for (let run = 0; run < RUNS; run += 1) {
  const single = rnd() < 0.25;
  const init = baseState(single);
  const server = { ...JSON.parse(JSON.stringify(init)), set(path, value) { setPath(this, path, value); }, markModified() {} };
  let client = JSON.parse(JSON.stringify(init));
  server.status = "live"; client.status = "live";
  server.gameScores = [{ a: 0, b: 0 }]; client.gameScores = [{ a: 0, b: 0 }];
  if (single) { server.serve = { side: init.serve.side, server: 1, opening: false }; client.serve = { ...server.serve }; }
  for (let step = 0; step < 140; step += 1) {
    const ev = { ...randomEvent(single), clientEventId: `e${run}-${step}` };
    if (ev.type === "__break") {
      const on = !(server.isBreak && server.isBreak.active);
      server.isBreak = { active: on }; client = { ...client, isBreak: { active: on } };
      continue;
    }
    const before = view(server);
    const res = applyLiveSyncEvent(server, ev, null);
    const next = applyLiveSyncEventLocally(client, ev);
    total += 1;
    if (!res.ok) {
      rejected += 1;
      // Server từ chối → bản trên máy cũng phải giữ nguyên (không nhảy điểm ảo).
      try { assert.deepEqual(view(next), view(client)); }
      catch (e) { console.log("LỆCH (server từ chối, máy vẫn đổi):", JSON.stringify({ run, step, ev, code: res.code, before: view(client), after: view(next) }).slice(0, 900)); process.exit(1); }
      assert.deepEqual(view(server), before);
      continue;
    }
    client = next;
    try { assert.deepEqual(view(client), view(server)); }
    catch (e) { console.log("LỆCH:", JSON.stringify({ run, step, ev, client: view(client), server: view(server) }).slice(0, 1600)); process.exit(1); }
    // sang ván mới như server (op nextGame) khi ván đã xong — ngoài phạm vi reducer
    const g = server.gameScores[server.currentGame];
    if (server.status === "live" && rnd() < 0.5) {
      const r = server.rules; const base = r.pointsToWin; const d = Math.abs(g.a - g.b);
      const capHit = (r.cap.mode !== "none" && r.cap.points && (g.a >= r.cap.points || g.b >= r.cap.points) && g.a !== g.b);
      const done = capHit || ((g.a >= base || g.b >= base) && (r.winByTwo ? d >= 2 : d >= 1));
      if (done && server.gameScores.length < r.bestOf) {
        for (const m of [server, client]) { m.gameScores.push({ a: 0, b: 0 }); m.currentGame += 1; }
      }
    }
  }
}
console.log(`KHỚP: ${RUNS} trận ngẫu nhiên, ${total} thao tác (${rejected} thao tác server từ chối)`);
process.exit(0);
