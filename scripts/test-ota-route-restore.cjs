const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildOtaRoute, validOtaSnapshot } = require('../utils/otaRouteRestore.cjs');
test('giữ đường dẫn và tham số điều hướng, bỏ dữ liệu nhạy cảm', () => {
  assert.equal(buildOtaRoute('/tournament/123/register', { tab: 'verify', token: 'secret', phone: '0900' }), '/tournament/123/register?tab=verify');
  assert.equal(buildOtaRoute('/profile', { tab: 'xác minh' }), '/profile?tab=x%C3%A1c%20minh');
});
test('bỏ qua đường dẫn không an toàn và màn xác thực', () => {
  for (const p of ['//evil', '/login', '/reset-password', '/checkout', '/test?token=x', '/test\\evil']) assert.equal(buildOtaRoute(p, {}), null);
});
test('chỉ khôi phục bản OTA mới cho cùng tài khoản trong thời gian ngắn', () => {
  const s = { route: '/tournament/123', bundleId: 'new', userId: 'user', createdAt: 1000 };
  assert.equal(validOtaSnapshot(s, { now: 2000, bundleId: 'new', userId: 'user' }), true);
  assert.equal(validOtaSnapshot(s, { now: 2000, bundleId: 'old', userId: 'user' }), false);
  assert.equal(validOtaSnapshot(s, { now: 2000, bundleId: 'new', userId: 'other' }), false);
  assert.equal(validOtaSnapshot(s, { now: 130000, bundleId: 'new', userId: 'user' }), false);
});
