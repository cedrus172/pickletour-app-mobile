const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../utils/clipCameraCache.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const scope = { userId: 'user-a', base: 'https://court.test', cameras: [0, 1] };
const channels = [0, 1, 2].map(id => ({ id, name: `Sân ${id}`, description: '' }));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function fixture(shared = {}) {
  const storage = shared.storage || new Map(), files = shared.files || new Map();
  const state = { list: channels, listCalls: 0, calls: [], mode: 'ok', gate: null, running: 0, maxRunning: 0, cancelled: 0, writesFail: false };
  const AsyncStorage = { getItem: async key => storage.get(key) || null, setItem: async (key, value) => { if(state.writesFail) throw Error('Disk full'); storage.set(key, value); }, getAllKeys: async () => [...storage.keys()], multiGet: async keys => keys.map(key => [key, storage.get(key)]), removeItem: async key => storage.delete(key) };
  const FileSystem = {
    documentDirectory: 'file:///documents/', FileSystemSessionType: { FOREGROUND: 0 },
    getInfoAsync: async uri => ({ exists: files.has(uri), size: files.has(uri) ? 10 : 0 }), makeDirectoryAsync: async () => {},
    moveAsync: async ({from, to}) => { if(!files.has(from)) throw Error('Missing file'); files.set(to, files.get(from)); files.delete(from); },
    deleteAsync: async uri => { for (const key of files.keys()) if(key === uri || key.startsWith(uri.endsWith('/') ? uri : uri + '/')) files.delete(key); },
    createDownloadResumable: (url, uri) => {
      state.calls.push(url); let cancelled = false;
      return {
        cancelAsync: async () => { cancelled = true; state.cancelled++; state.gate?.resolve(); },
        downloadAsync: async () => {
          state.running++; state.maxRunning = Math.max(state.maxRunning, state.running);
          try {
            if(state.gate) await state.gate.promise;
            if(cancelled || state.mode === 'offline') throw Error('Offline');
            if(state.mode === '503') return { status: 503, headers: {'Retry-After': '5'} };
            files.set(uri, state.mode === 'corrupt' ? 'broken' : 'jpeg');
            return { status: 200, mimeType: 'image/jpeg', headers: state.mode === 'legacy' ? {} : {'X-Snapshot-Captured-At': '2026-01-01T10:00:00Z', 'X-Snapshot-Stale': 'true'} };
          } finally { state.running--; }
        },
      };
    },
  };
  const mocks = {
    '@react-native-async-storage/async-storage': { default: AsyncStorage }, 'expo-file-system/legacy': FileSystem,
    'expo-crypto': { CryptoDigestAlgorithm: {SHA256:'SHA256'}, digestStringAsync: async (_, value) => crypto.createHash('sha256').update(value).digest('hex') },
    'react-native': { Image: { getSize: (uri, ok, fail) => files.get(uri) === 'jpeg' ? ok(854, 480) : fail(Error('Invalid JPEG')) } },
    './pickclip': { fetchChannels: async () => { state.listCalls++; if(state.mode === 'list-offline') throw Error('Network'); return state.list; }, thumbnailUrl: (base, id) => base + '/api/public/channels/' + id + '/thumbnail' },
  };
  const module = { exports: {} };
  new Function('module', 'exports', 'require', 'setTimeout', compiled)(module, module.exports, name => { assert(name in mocks, name); return mocks[name]; }, (fn, ms) => setTimeout(fn, state.mode === 'timeout' && ms === 12000 ? 5 : ms));
  return { ...module.exports, state, storage, files };
}
async function until(predicate) { for(let i=0;i<100;i++) { if(predicate()) return; await new Promise(r => setImmediate(r)); } assert.fail('Operation did not start'); }

test('scope separates users, venues, permissions; empty scope includes channel 0', () => {
  const f = fixture();
  assert.equal(f.cameraScopeKey({...scope, cameras:[1,0,1], base: scope.base+'/'}), f.cameraScopeKey(scope));
  assert.notEqual(f.cameraScopeKey(scope), f.cameraScopeKey({...scope,userId:'user-b'}));
  assert.notEqual(f.cameraScopeKey(scope), f.cameraScopeKey({...scope,cameras:[1]}));
  assert.deepEqual(f.filterPreviewChannels(channels, []), channels);
  assert.deepEqual(f.filterPreviewChannels(channels, [0]).map(c=>c.id), [0]);
});

test('download validates real image and preserves captured time and stale status', async () => {
  const f = fixture(); await f.refreshCameraPreviews(scope);
  const snapshot=f.getCameraPreviewState(scope);
  assert.deepEqual(snapshot.channels.map(c=>c.id), [0,1]);
  assert.equal(snapshot.previews[0].capturedAt, Date.parse('2026-01-01T10:00:00Z'));
  assert.equal(snapshot.previews[0].stale,true); assert(snapshot.previews[0].fetchedAt > snapshot.previews[0].capturedAt);
  assert.equal(f.state.calls.length,2); assert.equal(f.files.size,2);
  assert.equal(snapshot.loading,false); assert.equal(snapshot.refreshing,false);
});

test('warm cache stays visible while forced refresh is still pending', async () => {
  const f = fixture(); await f.refreshCameraPreviews(scope);
  const old=f.getCameraPreviewState(scope).previews[0].uri;
  f.state.gate=deferred(); const pending=f.refreshCameraPreviews(scope,true);
  await until(()=>f.state.running===2);
  assert.equal(f.getCameraPreviewState(scope).previews[0].uri,old);
  assert.equal(f.getCameraPreviewState(scope).refreshing,true);
  f.state.gate.resolve(); await pending;
  assert.notEqual(f.getCameraPreviewState(scope).previews[0].uri,old);
});

test('cold runtime hydrates persisted files before network completes', async () => {
  const first=fixture(); await first.refreshCameraPreviews(scope);
  const second=fixture(first); second.state.mode='list-offline';
  await second.hydrateCameraPreviews(scope);
  assert.equal(second.state.listCalls,0);
  assert.equal(second.getCameraPreviewState(scope).previews[0].uri,first.getCameraPreviewState(scope).previews[0].uri);
  await second.refreshCameraPreviews(scope);
  assert.equal(second.getCameraPreviewState(scope).channels.length,2);
  assert.equal(Object.keys(second.getCameraPreviewState(scope).previews).length,2);
});

for(const mode of ['offline','503','corrupt']) test(`${mode} never replaces the last successful image`, async () => {
  const f=fixture(); await f.refreshCameraPreviews(scope); const old=f.getCameraPreviewState(scope).previews[0];
  f.state.mode=mode; await f.refreshCameraPreviews(scope,true);
  assert.deepEqual(f.getCameraPreviewState(scope).previews[0],old);
  assert(f.getCameraPreviewState(scope).errors[0]);
  assert([...f.files.keys()].every(key=>key.endsWith('.jpg')));
});

test('prefetch and page share jobs, complete remaining cameras, max two concurrent', async () => {
  const f=fixture(), all={...scope,cameras:[]}; f.state.gate=deferred();
  const prefetch=f.refreshCameraPreviews(all,false,1); await until(()=>f.state.running===1);
  const page=f.refreshCameraPreviews(all); f.state.gate.resolve(); await Promise.all([prefetch,page]);
  assert.equal(f.state.calls.length,3); assert.equal(f.state.listCalls,1);
  assert(f.state.maxRunning<=2); assert.equal(Object.keys(f.getCameraPreviewState(all).previews).length,3);
});

test('revoking scope cancels in-flight jobs and removes disk and manifest', async () => {
  const f=fixture(); await f.refreshCameraPreviews(scope); f.state.gate=deferred();
  const pending=f.refreshCameraPreviews(scope,true); await until(()=>f.state.running===2);
  await f.invalidateCameraPreviews(scope); await pending;
  assert.equal(Object.keys(f.getCameraPreviewState(scope).previews).length,0);
  assert.equal(f.files.size,0); assert.equal(f.storage.size,0); assert.equal(f.state.cancelled,2);
});

test('regrant keeps subscribers attached and gets fresh images', async () => {
  const f=fixture(); await f.refreshCameraPreviews(scope); await f.invalidateCameraPreviews(scope);
  let notifications=0; const off=f.subscribeCameraPreviews(scope,()=>notifications++);
  await f.refreshCameraPreviews(scope); assert(notifications>1); assert(f.getCameraPreviewState(scope).previews[0]); off();
});

test('logout or reduced permission hides old scope; new user cannot hydrate old files', async () => {
  const f=fixture(); await f.refreshCameraPreviews(scope);
  f.retainCameraPreviewScopes([{...scope,cameras:[1]}]);
  assert.equal(f.getCameraPreviewState(scope).channels.length,0);
  const other={...scope,userId:'user-b'}; await f.hydrateCameraPreviews(other);
  assert.equal(Object.keys(f.getCameraPreviewState(other).previews).length,0);
  f.retainCameraPreviewScopes([]);
});

test('storage write errors do not prevent fresh image downloads', async () => {
  const f=fixture(); f.state.writesFail=true; await f.refreshCameraPreviews(scope);
  assert.equal(Object.keys(f.getCameraPreviewState(scope).previews).length,2);
});

test('legacy endpoint leaves captured time unknown; invalid and future dates rejected', async () => {
  const f=fixture(); f.state.mode='legacy'; await f.refreshCameraPreviews(scope);
  assert.equal(f.getCameraPreviewState(scope).previews[0].capturedAt,undefined);
  assert.equal(f.cameraCapturedAt({'Last-Modified':'bad'}),undefined);
  assert.equal(f.cameraCapturedAt({'X-Snapshot-Captured-At':'2099-01-01'}),undefined);
  assert.equal(f.cameraCapturedAt({'last-modified':'Thu, 01 Jan 2026 10:00:00 GMT'}),Date.parse('2026-01-01T10:00:00Z'));
});


test('hung thumbnail request times out, cancels download and releases queue', async () => {
  const f=fixture(); f.state.mode='timeout'; f.state.gate=deferred(); await f.refreshCameraPreviews(scope);
  assert(f.state.cancelled>=1); assert.equal(f.getCameraPreviewState(scope).refreshing,false);
  assert(Object.keys(f.getCameraPreviewState(scope).previews).length<2);
  assert(Object.keys(f.getCameraPreviewState(scope).errors).length>=1);
  f.state.mode='ok'; f.state.gate=null; await f.refreshCameraPreviews(scope,true);
  assert.equal(Object.keys(f.getCameraPreviewState(scope).previews).length,2);
});

test('expired, missing and revoked grants cannot authorize preview cache', () => {
  const hookSource=fs.readFileSync(path.join(__dirname,'../hooks/useClipCameraPreviews.ts'),'utf8');
  const output=ts.transpileModule(hookSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};new Function('module','exports','require',output)(module,module.exports,()=>({}));
  const active=module.exports.cameraAccessActive,now=Date.parse('2026-10-31T15:00:00Z');
  assert.equal(active({hasAccess:true,piBaseUrl:scope.base,expiresAt:null},now),true);
  assert.equal(active({hasAccess:true,piBaseUrl:scope.base,expiresAt:'2026-10-31T16:00:00Z'},now),true);
  for(const venue of [{hasAccess:false,piBaseUrl:scope.base},{hasAccess:true,piBaseUrl:''},{hasAccess:true,piBaseUrl:scope.base,expiresAt:'2026-10-31T14:59:59Z'},{hasAccess:true,piBaseUrl:scope.base,expiresAt:'invalid'}])assert.equal(active(venue,now),false);
});
