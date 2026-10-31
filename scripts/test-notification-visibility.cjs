/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../utils/notificationVisibility.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const fixture = { exports: {} };
new Function('module', 'exports', compiled)(fixture, fixture.exports);
const { isMainNotificationRoute } = fixture.exports;

test('chuông hiện trên năm tab chính, kể cả route index lồng', () => {
  for (const route of [['(tabs)'], ['(tabs)', 'index'], ['index'], ['(tabs)', 'feed'], ['(tabs)', 'tournaments'], ['(tabs)', 'rankings'], ['(tabs)', 'more'], ['(tabs)', 'more', 'index']]) {
    assert.equal(isMainNotificationRoute(route), true, route.join('/'));
  }
});

test('màn danh sách mở từ lối tắt giữ chuông như tab tương ứng', () => {
  assert.equal(isMainNotificationRoute(['tournament', 'stack']), true);
  assert.equal(isMainNotificationRoute(['rankings', 'stack']), true);
});

test('chi tiết giải, quản lý và bắt trận đều không có chuông', () => {
  for (const route of [['tournament', 'abc'], ['tournament', 'abc', 'home'], ['tournament', 'abc', 'manage'], ['tournament', 'abc', 'schedule'], ['tournament', 'abc', 'referee'], ['match', 'abc', 'referee'], ['match', 'user-match', 'abc', 'live'], ['admin'], ['admin', 'home'], ['admin', 'adhoc-referee']]) {
    assert.equal(isMainNotificationRoute(route), false, route.join('/'));
  }
});

test('màn con trong tab Khác và tab ẩn không được nhận quyền từ route cha', () => {
  for (const route of [['(tabs)', 'more', 'profile'], ['(tabs)', 'more', 'chat'], ['(tabs)', 'more', 'my_tournament'], ['(tabs)', 'profile'], ['(tabs)', 'notifications'], ['(tabs)', 'chat'], ['(tabs)', 'my_tournament']]) {
    assert.equal(isMainNotificationRoute(route), false, route.join('/'));
  }
});

test('route group không đổi kết quả và không dùng so khớp tiền tố', () => {
  assert.equal(isMainNotificationRoute(['(app)', '(tabs)', 'more', 'index']), true);
  for (const route of [['(app)', 'admin', 'home'], ['tournaments', 'abc'], ['rankings', 'abc'], ['tournament', 'stack', 'register'], ['more', 'settings'], ['feed', 'abc'], ['feed-settings']]) {
    assert.equal(isMainNotificationRoute(route), false, route.join('/'));
  }
});

test('chưa xác định route hoặc màn khác không nháy chuông', () => {
  for (const route of [undefined, null, [], ['(auth)'], ['(auth)', 'index'], ['login'], ['owner'], ['courts'], ['live', 'home'], ['notifications'], ['unknown']]) {
    assert.equal(isMainNotificationRoute(route), false);
  }
});
