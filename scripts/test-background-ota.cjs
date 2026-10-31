const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { transformSync } = require('esbuild');
const source = fs.readFileSync(path.join(__dirname, '../app/_layout.tsx'), 'utf8');
const flow = source.slice(source.indexOf('  const scheduleHotUpdateReload ='), source.indexOf('  React.useEffect(() => {\n    if (isExpoGo || !HotUpdater) return;', source.indexOf('  const checkForHotUpdate =')));
const notify = source.slice(source.indexOf('const handleHotUpdateNotifyTelemetry ='), source.indexOf('const publishHotUpdateNotify ='));
const code = transformSync(flow + '\n' + notify + '\nreturn { startHotUpdate, checkForHotUpdate, scheduleHotUpdateReload, handleHotUpdateNotifyTelemetry };', { loader: 'ts' }).code;
const policyModule = { exports: {} };
new Function('module', 'exports', transformSync(fs.readFileSync(path.join(__dirname, '../utils/hotUpdateReloadPolicy.ts'), 'utf8'), { loader: 'ts', format: 'cjs' }).code)(policyModule, policyModule.exports);
const { isRefereeScoringRoute } = policyModule.exports;

function fixture(options = {}) {
  const state = { visible: false, blocking: false, progress: 0, status: '', pending: options.pending || null, applied: '', recovered: '', reports: [], alerts: [], reloads: 0, events: [], timers: [], downloads: 0, effects: [], listeners: [] };
  const update = { id: '0003', channel: 'production', status: 'UPDATE', currentBundleId: '0001', updateBundle: async () => { state.downloads++; return true; }, ...options.update };
  const env = {
    React: { useCallback: f => f, useEffect: f => state.effects.push(f) },
    HotUpdater: { checkForUpdate: async () => update, getBundleId: () => options.current || '0001', getCrashHistory: () => options.crashed || [], reload: async () => { state.reloads++; if (options.reloadError) throw new Error('Reload failed'); } },
    AppState: { currentState: options.appState || 'active', addEventListener: (_event, f) => { state.listeners.push(f); return { remove() { state.listeners = state.listeners.filter(x => x !== f); } }; } },
    isRefereeScoringScreen: !!options.protected,
    otaReloadProtectedRef: { current: !!options.protected }, otaReadyPayloadRef: { current: null }, otaReloadInProgressRef: { current: false },
    isExpoGo: false, Platform: { OS: 'ios' },
    otaCheckInFlightRef: { current: false }, otaLastCheckAtRef: { current: 0 }, otaIgnoredUpdateIdRef: { current: null }, otaCompletionTimerRef: { current: null },
    setHotUpdateVisible: v => state.visible = v, setHotUpdateBlocking: v => state.blocking = v, setHotUpdateProgress: v => state.progress = v, setHotUpdateStatus: v => state.status = v, setHotUpdateMessage: v => state.message = v,
    savePendingHotUpdate: async p => state.pending = p, getPendingHotUpdate: async () => state.pending, clearPendingHotUpdate: async () => state.pending = null,
    saveAppliedHotUpdateBundle: async id => state.applied = id, getAppliedHotUpdateBundle: async () => state.applied, clearAppliedHotUpdateBundle: async () => state.applied = '',
    saveRecoveredHotUpdateBundle: async id => state.recovered = id, getRecoveredHotUpdateBundle: async () => state.recovered, clearRecoveredHotUpdateBundle: async () => state.recovered = '',
    reportHotUpdateTelemetry: p => { state.reports.push(p); return options.hungTelemetry ? new Promise(() => {}) : Promise.resolve(true); },
    getHotUpdateAppVersion: () => '1.1.14', otaDiag: v => state.diag = v,
    buildApiUrl: () => 'https://example.invalid', HOT_UPDATE_API_BASE_URL: '', fetch: async () => ({ ok: true, json: async () => ({ allowed: options.allowed !== false, forceUpdate: options.remoteForce === true }) }),
    Alert: { alert: (...a) => state.alerts.push(a) }, DeviceEventEmitter: { emit: e => state.events.push(e) }, HOT_UPDATE_RELOAD_KEY: '__test_reload__', HOT_UPDATE_RELOAD_EVENT: 'test:reload',
    setTimeout: (f, ms) => { const timer = { f, ms }; state.timers.push(timer); return timer; }, clearTimeout: t => state.timers = state.timers.filter(x => x !== t),
    __DEV__: false, console: { error() {}, warn() {}, log() {} },
  };
  const api = new Function(...Object.keys(env), code)(...Object.values(env));
  const cleanups = state.effects.map(f => f());
  const changeAppState = next => { env.AppState.currentState = next; state.listeners.forEach(f => f(next)); };
  const changeRoute = segments => { env.otaReloadProtectedRef.current = isRefereeScoringRoute(segments); api.scheduleHotUpdateReload(); };
  return { ...api, state, update, env, cleanups, changeAppState, changeRoute };
}

test('ordinary update downloads without alert or blocking UI, then automatically reloads', async () => {
  const f = fixture(); await f.checkForHotUpdate();
  assert.equal(f.state.downloads, 1); assert.equal(f.state.alerts.length, 0); assert.equal(f.state.blocking, false);
  assert.equal(f.state.pending.bundleId, '0003'); assert.equal(f.state.reloads, 0); assert.equal(f.state.events.length, 0);
  assert.equal(f.state.status, 'done'); assert.equal(f.env.otaCheckInFlightRef.current, false);
  assert.equal(f.state.timers[0].ms, 700); f.state.timers[0].f(); assert.equal(f.state.reloads, 1); assert.deepEqual(f.state.events, ['test:reload']);
});
test('hung telemetry does not delay download completion', async () => {
  const f = fixture({ hungTelemetry: true }); await f.checkForHotUpdate(); assert.equal(f.state.status, 'done'); assert.equal(f.state.pending.bundleId, '0003');
});
test('a queued update prevents repeated downloads and replacements in the current session', async () => {
  const f = fixture({ pending: { bundleId: '0002' } }); await f.checkForHotUpdate(); assert.equal(f.state.downloads, 0); assert.equal(f.state.pending.bundleId, '0002');
});
test('failed background download remains non-blocking, releases flight guard, and preserves telemetry', async () => {
  const f = fixture({ update: { updateBundle: async () => false } }); await f.checkForHotUpdate();
  assert.equal(f.state.visible, false); assert.equal(f.state.blocking, false); assert.equal(f.state.reloads, 0); assert.equal(f.state.pending, null);
  assert.equal(f.env.otaCheckInFlightRef.current, false); assert(f.state.reports.some(p => p.status === 'failed'));
});
for (const force of ['server', 'remote']) {
  test(`${force} forced updates preserve explicit confirmation and reload flow`, async () => {
    const f = fixture({ remoteForce: force === 'remote', update: { shouldForceUpdate: force === 'server' } }); await f.checkForHotUpdate();
    assert.equal(f.state.alerts.length, 1); assert.equal(f.state.downloads, 0);
    f.state.alerts[0][2][0].onPress(); await new Promise(r => setImmediate(r));
    assert.equal(f.state.blocking, true); assert.equal(f.state.timers[0].ms, 700);
    f.state.timers[0].f(); assert.equal(f.state.reloads, 1); assert.deepEqual(f.state.events, ['test:reload']);
  });
}
test('remote kill switch still prevents updates', async () => {
  const f = fixture({ allowed: false }); await f.checkForHotUpdate(); assert.equal(f.state.downloads, 0); assert.equal(f.state.alerts.length, 0);
});
test('crashed bundles remain blocked', async () => {
  const f = fixture({ crashed: ['0003'] }); await f.checkForHotUpdate(); assert.equal(f.state.downloads, 0); assert.equal(f.state.alerts.length, 0);
});
test('a staged bundle is not reported as applied by the previous runtime', async () => {
  const f = fixture({ pending: { bundleId: '0003' } }); await f.handleHotUpdateNotifyTelemetry({ status: 'STABLE' });
  assert.equal(f.state.applied, ''); assert.equal(f.state.pending.bundleId, '0003'); assert.equal(f.state.reports.length, 0);
});
test('next runtime marks the staged bundle applied and clears pending', async () => {
  const f = fixture({ current: '0003', pending: { bundleId: '0003' } }); await f.handleHotUpdateNotifyTelemetry({ status: 'PROMOTED' });
  assert.equal(f.state.applied, '0003'); assert.equal(f.state.pending, null); assert(f.state.reports.some(p => p.status === 'promoted'));
});
test('rollback recovery still reports and clears the pending bundle', async () => {
  const f = fixture({ pending: { bundleId: '0003' } }); await f.handleHotUpdateNotifyTelemetry({ status: 'RECOVERED', crashedBundleId: '0003' });
  assert.equal(f.state.recovered, '0003'); assert.equal(f.state.pending, null); assert(f.state.reports.some(p => p.status === 'recovered'));
});

test('route policy protects match scoring with route groups, actual IDs and the admin scoring screen', () => {
  for (const segments of [['match','[id]','referee'],['match','123','referee'],['(app)','match','123','referee'],['admin','adhoc-referee']]) assert.equal(isRefereeScoringRoute(segments), true);
  for (const segments of [[],['(tabs)'],['tournament','123','referee'],['referee','clusters'],['match','123','home'],['profile','123']]) assert.equal(isRefereeScoringRoute(segments), false);
});
test('download on referee scoring waits without any reload event, then reloads on leaving', async () => {
  const f = fixture({ protected: true }); await f.checkForHotUpdate();
  assert.equal(f.state.timers[0].ms, 2000); f.state.timers[0].f(); assert.equal(f.state.reloads, 0); assert.equal(f.state.events.length, 0);
  f.changeRoute(['(tabs)']); assert.equal(f.state.timers[0].ms, 700); f.state.timers[0].f(); assert.equal(f.state.reloads, 1);
});
test('entering scoring before reload cancels the timer; even an old callback cannot reload', async () => {
  const f = fixture(); await f.checkForHotUpdate(); const oldTimer = f.state.timers[0];
  f.changeRoute(['match','[id]','referee']); assert.equal(f.state.timers.length, 0); oldTimer.f();
  assert.equal(f.state.reloads, 0); assert.equal(f.state.events.length, 0);
});
test('download starts outside scoring but finishes inside: latest route wins', async () => {
  let resolve; const f = fixture({ update: { updateBundle: () => new Promise(r => resolve = r) } });
  const pending = f.checkForHotUpdate(); await new Promise(r => setImmediate(r)); f.changeRoute(['match','123','referee']); resolve(true); await pending;
  assert.equal(f.state.timers[0].ms, 2000); f.state.timers[0].f(); assert.equal(f.state.reloads, 0);
});
test('leaving then quickly returning to scoring keeps the downloaded update queued', async () => {
  const f = fixture({ protected: true }); await f.checkForHotUpdate(); f.changeRoute(['(tabs)']); const timer = f.state.timers[0];
  f.changeRoute(['match','456','referee']); timer.f(); assert.equal(f.state.reloads, 0); assert.equal(f.state.pending.bundleId, '0003');
});
test('background completion waits for foreground; scoring still blocks foreground reload', async () => {
  const f = fixture({ appState: 'background' }); await f.checkForHotUpdate(); assert.equal(f.state.timers.length, 0);
  f.changeRoute(['match','123','referee']); f.changeAppState('active'); assert.equal(f.state.timers.length, 0);
  f.changeRoute(['(tabs)']); f.state.timers[0].f(); assert.equal(f.state.reloads, 1);
});
test('becoming inactive before reload cancels it until the app is active again', async () => {
  const f = fixture(); await f.checkForHotUpdate(); const timer = f.state.timers[0]; f.changeAppState('inactive'); timer.f();
  assert.equal(f.state.reloads, 0); f.changeAppState('active'); f.state.timers[0].f(); assert.equal(f.state.reloads, 1);
});
test('forced update cannot reload or block scoring either', async () => {
  const f = fixture({ protected: true }); await f.startHotUpdate(f.update, true);
  assert.equal(f.state.blocking, false); f.state.timers[0].f(); assert.equal(f.state.reloads, 0);
  f.changeRoute(['(tabs)']); f.state.timers[0].f(); assert.equal(f.state.reloads, 1);
});
test('repeated scheduling cannot trigger duplicate reloads', async () => {
  const f = fixture(); await f.checkForHotUpdate(); f.scheduleHotUpdateReload(); const timer = f.state.timers[0]; timer.f(); timer.f(); f.scheduleHotUpdateReload();
  assert.equal(f.state.reloads, 1); assert.equal(f.state.events.length, 1);
});
test('reload failure retains pending for cold start and does not loop', async () => {
  const f = fixture({ reloadError: true }); await f.checkForHotUpdate(); f.state.timers[0].f(); await new Promise(r => setImmediate(r));
  assert.equal(f.state.pending.bundleId, '0003'); assert.equal(f.env.otaReadyPayloadRef.current, null); f.scheduleHotUpdateReload(); assert.equal(f.state.reloads, 1);
});
test('unmount removes the app-state listener and cancels scheduled reload', async () => {
  const f = fixture(); await f.checkForHotUpdate(); f.cleanups.forEach(f => f?.()); assert.equal(f.state.timers.length, 0); assert.equal(f.state.listeners.length, 0);
});
