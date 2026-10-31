const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const sets = ['AntDesign', 'Feather', 'Ionicons', 'MaterialCommunityIcons', 'MaterialIcons', 'Octicons'];
function tables(font) {
  const result = {};
  for (let i = 0; i < font.readUInt16BE(4); i++) {
    const at = 12 + i * 16;
    const start = font.readUInt32BE(at + 8);
    result[font.toString('ascii', at, at + 4)] = font.subarray(start, start + font.readUInt32BE(at + 12));
  }
  return result;
}
function postscript(table) {
  for (let i = 0; i < table.readUInt16BE(2); i++) {
    const at = 6 + i * 12;
    if (table.readUInt16BE(at + 6) !== 6 || table.readUInt16BE(at) !== 3) continue;
    const start = table.readUInt16BE(4) + table.readUInt16BE(at + 10);
    return Buffer.from(table.subarray(start, start + table.readUInt16BE(at + 8))).swap16().toString('utf16le');
  }
  throw new Error('Missing PostScript name');
}
for (const set of sets) {
  test(`${set}: isolated native name, identical glyphs and metrics, valid SFNT checksum`, () => {
    const original = fs.readFileSync(path.join(root, 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts', set + '.ttf'));
    const generated = fs.readFileSync(path.join(root, 'assets/fonts/icons', set + '.ttf'));
    const before = tables(original), after = tables(generated);
    assert.notEqual(postscript(before.name), postscript(after.name));
    assert.match(postscript(after.name), new RegExp(`^PTour${set}-[a-f0-9]{12}$`));
    assert.deepEqual(Object.keys(after), Object.keys(before));
    for (const tag of Object.keys(before)) {
      if (tag === 'name') continue;
      const a = Buffer.from(before[tag]), b = Buffer.from(after[tag]);
      if (tag === 'head') { a.writeUInt32BE(0, 8); b.writeUInt32BE(0, 8); }
      assert.deepEqual(b, a, `${set}: unexpected change in ${tag}`);
    }
    let sum = 0;
    for (let at = 0; at < generated.length; at += 4) sum = (sum + generated.readUInt32BE(at)) >>> 0;
    assert.equal(sum, 0xb1b0afba);
  });
}

test('Metro isolates native icon factories while preserving the original factory and web', () => {
  const config = require('../metro.config.cjs');
  const original = require.resolve('@expo/vector-icons/build/createIconSet');
  const isolated = path.join(root, 'utils/createIsolatedIconSet.ts');
  const resolveRequest = () => ({ type: 'sourceFile', filePath: original });
  for (const platform of ['ios', 'android']) {
    const context = { originModulePath: path.join(path.dirname(original), 'Ionicons.js'), resolveRequest };
    assert.equal(config.resolver.resolveRequest(context, './createIconSet', platform).filePath, isolated);
    assert.equal(config.resolver.resolveRequest({ ...context, originModulePath: isolated }, '@expo/vector-icons/build/createIconSet', platform).filePath, original);
    assert.equal(config.resolver.resolveRequest(context, './createIconSet', 'web').filePath, original);
  }
});
