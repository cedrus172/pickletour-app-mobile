// Chỉ lưu đường dẫn và các tham số điều hướng, không lưu dữ liệu biểu mẫu hoặc token.
const SAFE_PARAMS = new Set(['tab', 'view', 'mode', 'filter', 'sort', 'page', 'date', 'eventId', 'tournamentId', 'matchId', 'courtId', 'id']);
const MAX_AGE_MS = 2 * 60 * 1000;
function buildOtaRoute(pathname, params) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//') || pathname.length > 700 || /[?#\\\x00-\x1f]/.test(pathname)) return null;
  if (/\/(?:login|register-account|reset-password|oauth|callback|payment|checkout)(?:\/|$)/i.test(pathname)) return null;
  const query = [];
  for (const [key, raw] of Object.entries(params || {})) {
    if (!SAFE_PARAMS.has(key)) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) if (typeof value === 'string' && value.length <= 120) query.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  const route = pathname + (query.length ? '?' + query.join('&') : '');
  return route.length <= 1200 ? route : null;
}
function validOtaSnapshot(value, { now, bundleId, userId }) {
  if (!value || typeof value !== 'object' || value.bundleId !== bundleId || value.userId !== userId || !Number.isFinite(value.createdAt) || value.createdAt > now || now - value.createdAt > MAX_AGE_MS) return false;
  if (typeof value.route !== 'string' || value.route.length > 1200 || !value.route.startsWith('/') || value.route.startsWith('//') || /[\x00-\x1f\\]/.test(value.route)) return false;
  return true;
}
module.exports = { buildOtaRoute, validOtaSnapshot };
