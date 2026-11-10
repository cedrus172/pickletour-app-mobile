#!/usr/bin/env node
// Deploy OTA an toàn (hot-updater, self-host VPS).
//
// Lý do: hot-updater/babel-plugin nhúng BUNDLE_ID lúc transform. Khi deploy 2 lần
// liền nhau, cache transform của Metro bị dùng lại → bundle mới mang BUNDLE_ID của
// bundle trước → app tự báo là bản cũ, server lại trả UPDATE → tải/reload lặp vô hạn
// (đã xảy ra 03/11 và 04/11/2026).
//
// Quy trình: xoá cache Metro → deploy ở trạng thái TẮT → kiểm tra bundle.zip có đúng
// BUNDLE_ID của chính nó → khớp mới BẬT trên server, lệch thì giữ tắt và báo lỗi.
//
// Dùng (Node 22):
//   node scripts/ota-safe-deploy.mjs -p ios -t "1.1.19" -m "Nội dung cập nhật"
//   node scripts/ota-safe-deploy.mjs -p android -t "1.1.20" -m "..."

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { config } from "dotenv";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
config({ path: path.join(ROOT, ".env.hotupdater") });

const args = process.argv.slice(2);
const opt = (short, long, def) => {
  const i = args.findIndex((a) => a === short || a === long);
  return i >= 0 ? args[i + 1] : def;
};
const platformArg = opt("-p", "--platform", "all");
// Bắt buộc ghi rõ phiên bản đích: iOS và Android có thể khác bản store
// (04/11/2026: iOS store 1.1.19, iOS 1.1.20 = TestFlight build mới; Android store 1.1.20).
const target = opt("-t", "--target-app-version", "");
if (!target) {
  console.error('Cần -t (vd. iOS store: -p ios -t "1.1.19"; Android store: -p android -t "1.1.20")');
  process.exit(1);
}
const message = opt("-m", "--message", "");
const platforms = platformArg === "all" ? ["ios", "android"] : [platformArg];

const BASE = process.env.HOTUPDATER_BASE_URL;
const KEY = process.env.HOTUPDATER_DEPLOY_KEY;
if (!BASE || !KEY) {
  console.error("Thiếu HOTUPDATER_BASE_URL / HOTUPDATER_DEPLOY_KEY trong .env.hotupdater");
  process.exit(1);
}
if (!message) {
  console.error('Cần -m "nội dung cập nhật"');
  process.exit(1);
}
if (Number(process.versions.node.split(".")[0]) < 22) {
  console.error("Cần Node 22 (source ~/.nvm/nvm.sh && nvm use 22)");
  process.exit(1);
}

// Chặn OTA nếu có Modal toàn màn hình để header/nút Back dưới Dynamic Island.
{
  const guard = spawnSync("node", [path.join(ROOT, "scripts", "test-modal-safe-area.cjs")], { stdio: "inherit" });
  if (guard.status !== 0) {
    console.error("Dừng OTA: sửa lỗi safe-area trong Modal ở trên trước (xem components/ui/AppModal.tsx).");
    process.exit(1);
  }
}

const headers = { "content-type": "application/json", "x-hotupdater-key": KEY };

function clearMetroCache() {
  const tmp = os.tmpdir();
  for (const name of fs.readdirSync(tmp)) {
    if (name.startsWith("metro-") || name.startsWith("haste-map")) {
      fs.rmSync(path.join(tmp, name), { recursive: true, force: true });
    }
  }
  fs.rmSync(path.join(ROOT, "node_modules", ".cache"), { recursive: true, force: true });
}

function readZip(zipPath, entry) {
  return execFileSync("unzip", ["-p", zipPath, entry], { maxBuffer: 1 << 30 });
}

async function setEnabled(bundleId) {
  const r = await fetch(`${BASE}/_db/bundles/${bundleId}`, { headers });
  if (!r.ok) throw new Error(`Không đọc được bundle ${bundleId}: ${r.status}`);
  const bundle = (await r.json())?.data;
  if (!bundle?.id) throw new Error(`Server không có bundle ${bundleId}`);
  const c = await fetch(`${BASE}/_db/commit`, {
    method: "POST",
    headers,
    body: JSON.stringify({ changedSets: [{ operation: "update", data: { ...bundle, enabled: true } }] }),
  });
  if (!c.ok) throw new Error(`Bật bundle thất bại: ${c.status} ${await c.text()}`);
}

let failed = false;
for (const platform of platforms) {
  console.log(`\n=== ${platform} (${target}) ===`);
  clearMetroCache();

  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), `ota-${platform}-`));
  const res = spawnSync(
    "npx",
    ["hot-updater", "deploy", "-p", platform, "-t", target, "-m", message, "--disabled", "-o", outDir],
    { cwd: ROOT, stdio: "inherit", env: { ...process.env, CI: "1" } },
  );
  if (res.status !== 0) {
    console.error(`[${platform}] deploy lỗi (exit ${res.status}) — không bật gì.`);
    failed = true;
    continue;
  }

  const zip = [path.join(outDir, "bundle.zip"), path.join(outDir, "bundle", "bundle.zip")].find((p) =>
    fs.existsSync(p),
  );
  if (!zip) {
    console.error(`[${platform}] không thấy bundle.zip trong ${outDir} — giữ TẮT.`);
    failed = true;
    continue;
  }

  const bundleId = readZip(zip, "BUNDLE_ID").toString().trim();
  const js = readZip(zip, `index.${platform}.bundle`);
  const embedded = new Set(
    js.toString("latin1").match(/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}/g) || [],
  );

  if (!embedded.has(bundleId)) {
    console.error(
      `[${platform}] ❌ BUNDLE_ID lệch: gói ${bundleId} nhưng JS nhúng ${[...embedded].join(", ") || "(không có)"} — giữ TẮT.`,
    );
    failed = true;
    continue;
  }

  await setEnabled(bundleId);
  console.log(`[${platform}] ✅ ${bundleId} — BUNDLE_ID khớp, đã BẬT.`);
}

process.exit(failed ? 1 : 0);
