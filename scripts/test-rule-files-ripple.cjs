const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { transformSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
const code = transformSync(fs.readFileSync(path.join(root, 'utils/tournamentRuleFiles.ts'), 'utf8'), { loader: 'ts', format: 'cjs' }).code;
const moduleObject = { exports: {} };
new Function('module', 'exports', code)(moduleObject, moduleObject.exports);
const { parseRuleFileSelection, RULE_FILE_PICKER_HTML, MAX_RULE_FILE_BYTES } = moduleObject.exports;
const valid = { kind: 'rule-file', name: 'Điều lệ giải.pdf', mime: 'application/pdf', size: 4, base64: 'AQIDBA==' };

test('native file bridge accepts complete image/PDF data with UTF-8 names', () => {
  assert.equal(parseRuleFileSelection(JSON.stringify(valid)).name, valid.name);
  assert.equal(parseRuleFileSelection(JSON.stringify({ ...valid, mime: 'image/png' })).mime, 'image/png');
});
test('native file bridge rejects non-file messages, SVG, oversize and truncated contents', () => {
  for (const patch of [{ kind: 'other' }, { mime: 'image/svg+xml' }, { size: MAX_RULE_FILE_BYTES + 1 }, { size: 5 }, { base64: 'bad!' }, { base64: '' }]) {
    assert.throws(() => parseRuleFileSelection(JSON.stringify({ ...valid, ...patch })));
  }
});
test('system file picker handles PDFs with missing MIME and prevents oversized reads', () => {
  let change, sent, reads = 0;
  const input = { files: [{ name: 'Điều lệ.pdf', type: '', size: 4 }], addEventListener: (_type, callback) => { change = callback; } };
  const status = {};
  const script = RULE_FILE_PICKER_HTML.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(script, {
    document: { getElementById: (id) => id === 'file' ? input : status },
    FileReader: class { readAsDataURL() { reads++; this.result = 'data:application/pdf;base64,AQIDBA=='; this.onload(); } },
    window: { ReactNativeWebView: { postMessage: (text) => { sent = JSON.parse(text); } } },
  });
  change(); assert.equal(sent.mime, 'application/pdf'); assert.equal(sent.name, 'Điều lệ.pdf');
  input.files = [{ name: 'large.pdf', size: MAX_RULE_FILE_BYTES + 1 }];
  change(); assert.equal(reads, 1); assert.match(status.textContent, /10 MB/);
});
test('ripple adapter preserves native lazy getters and namespace exports', () => {
  let reads = 0; let wrapperLoads = 0;
  const native = { get View() { reads++; return 'NativeView'; }, Pressable: 'OldPressable', TouchableOpacity: 'OldTouchable', Button: 'OldButton' };
  const wrapped = { RipplePressable: 'RipplePressable', RippleTouchableOpacity: 'RippleTouchable', RippleButton: 'RippleButton' };
  const mod = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'utils/rippleNative.cjs'), 'utf8'), {
    module: mod, require: (name) => { if (name === 'react-native') return native; wrapperLoads++; return wrapped; },
  });
  assert.equal(wrapperLoads, 0); assert.equal(reads, 0); assert.equal(mod.exports.View, 'NativeView'); assert.equal(reads, 1);
  assert.equal(wrapperLoads, 0); assert.equal(mod.exports.Pressable, 'RipplePressable'); assert.equal(wrapperLoads, 1); assert.equal(mod.exports.TouchableOpacity, 'RippleTouchable');
  assert.deepEqual(Object.keys(mod.exports), Object.keys(native));
});
test('Metro keeps native imports unchanged and retains isolated icons', () => {
  const mod = { exports: {} };
  const req = (name) => name === 'path' ? path : { getDefaultConfig: () => ({ resolver: {} }) };
  req.resolve = () => '/expo/createIconSet.js';
  vm.runInNewContext(fs.readFileSync(path.join(root, 'metro.config.cjs'), 'utf8'), { require: req, module: mod, __dirname: root });
  const resolve = mod.exports.resolver.resolveRequest;
  const context = (origin, target = '/native/index.js') => ({ originModulePath: origin, resolveRequest: () => ({ type: 'sourceFile', filePath: target }) });
  assert.equal(resolve(context(path.join(root, 'app/test.tsx')), 'react-native', 'ios').filePath, '/native/index.js');
  assert.equal(resolve(context(path.join(root, 'app/test.tsx'), '/expo/createIconSet.js'), 'icon-factory', 'ios').filePath, path.join(root, 'utils/createIsolatedIconSet.ts'));
});
test('ranking filters expose only singles and doubles without deleting stored mixed ratings', () => {
  const source = fs.readFileSync(path.join(root, 'screens/rankings.tsx'), 'utf8');
  const options = source.slice(source.indexOf('const SCORE_TYPES:'), source.indexOf('export default function RankingListScreen'));
  assert.match(options, /value: "single"/); assert.match(options, /value: "double"/); assert(!options.includes('value: "mix"'));
  assert(source.includes('r?.mix'), 'existing mixed rating data must remain intact');
});
