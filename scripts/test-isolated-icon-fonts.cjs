const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const sets = ['AntDesign', 'Feather', 'Ionicons', 'MaterialCommunityIcons', 'MaterialIcons', 'Octicons', 'FontAwesome', 'FontAwesome5_Regular', 'FontAwesome5_Solid', 'FontAwesome5_Brands'];
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


test('all used font families, including FA5 solid-only trophy/coins, enter the warm-boot font gate', async () => {
  const vm = require('node:vm');
  const ts = require('typescript');
  const loaded = new Set(), copied = [], files = new Map();
  const icons = Object.fromEntries(['AntDesign', 'Feather', 'FontAwesome', 'Ionicons', 'MaterialCommunityIcons', 'MaterialIcons', 'Octicons'].map(name => [name, {font: {[`PTour${name}-boot`]: `/assets/${name}.ttf`}}]));
  const fonts = {
    regular: {'PTourFontAwesome5_Regular-boot': '/assets/FontAwesome5_Regular.ttf'},
    light: {'PTourFontAwesome5_Regular-boot': '/assets/FontAwesome5_Regular.ttf'},
    solid: {'PTourFontAwesome5_Solid-boot': '/assets/FontAwesome5_Solid.ttf'},
    brand: {'PTourFontAwesome5_Brands-boot': '/assets/FontAwesome5_Brands.ttf'},
  };
  // Expo's public .font still contains the original multi-style descriptors.
  icons.FontAwesome5 = { font: {'FontAwesome5Free-Solid': '/unsafe-old-ota/solid.ttf'}, StyledIconSet: style => ({font: fonts[style]}) };
  const disk = {
    documentDirectory: '/documents/',
    makeDirectoryAsync: async () => {},
    getInfoAsync: async uri => ({exists: files.has(uri), size: files.has(uri) ? 100 : 0}),
    copyAsync: async p => {copied.push(p);files.set(p.to, p.from)},
    moveAsync: async p => {files.set(p.to, files.get(p.from));files.delete(p.from)},
  };
  const font = {loadAsync: async data => {Object.keys(data).forEach(key => loaded.add(key))}, isLoaded: key => loaded.has(key)};
  const mocks = {'@expo/vector-icons':icons, 'expo-font':font, 'expo-asset':{Asset:{fromModule: source => ({name:path.basename(source,'.ttf'),type:'ttf',hash:path.basename(source,'.ttf'),localUri:source,downloadAsync:async()=>{}})}}, 'expo-file-system/legacy':disk, 'react-native':{Platform:{OS:'ios'}}};
  const code=ts.transpileModule(fs.readFileSync(path.join(root,'utils/iconFonts.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const context={exports:{},require:name=>{assert(name in mocks,name);return mocks[name]},console};
  vm.runInNewContext(code,context);
  const map=context.exports.APP_ICON_FONTS;
  for(const name of Object.keys(icons).filter(name=>name!=='FontAwesome5'))assert.equal(map[`PTour${name}-boot`],`/assets/${name}.ttf`);
  for(const style of ['regular','solid','brand'])for(const[name,source]of Object.entries(fonts[style]))assert.equal(map[name],source,`${style} missing from bootstrap`);
  assert(!('FontAwesome5Free-Solid' in map),'preload must use child factories, not the raw multi-style .font');
  assert.equal(Object.keys(map).length,10);
  await context.exports.loadAppIconFonts();
  assert.equal(copied.length,10);
  assert(copied.every(p=>p.to.startsWith('/documents/icon-fonts-v1/')));
  await context.exports.loadAppIconFonts();
  assert.equal(copied.length,10,'warm re-entry reuses the persistent copies');
  for(const style of ['solid']){
    const glyphs=require(path.join(root,'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/FontAwesome5Free.json'));
    const meta=require(path.join(root,'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/FontAwesome5Free_meta.json'));
    for(const name of ['trophy','coins'])assert(meta[style].includes(name)&&glyphs[name]>0);
  }
});

test('every generated font is namespaced per JS boot, including FA5 light/regular aliases', () => {
  const vm=require('node:vm'),ts=require('typescript');
  const manifestCode=ts.transpileModule(fs.readFileSync(path.join(root,'assets/fonts/icons/index.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const manifest={exports:{},require:name=>name};vm.runInNewContext(manifestCode,manifest);
  const assets=manifest.exports.ISOLATED_ICON_ASSETS;
  for(const name of ['FontAwesome','FontAwesome5Free-Light','FontAwesome5Free-Regular','FontAwesome5Free-Solid','FontAwesome5Free-Brand'])assert(assets[name],name);
  const create=(_glyphs,family,source,style)=>({font:{[family]:source},family,style});
  const code=ts.transpileModule(fs.readFileSync(path.join(root,'utils/createIsolatedIconSet.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const boot=()=>{const c={exports:{},require:name=>name.includes('createIconSet')?{default:create}:manifest.exports};vm.runInNewContext(code,c);return c.exports.default};
  const a=boot(),b=boot();
  for(const family of Object.keys(assets)){
    const before=a({coins:62750},family,'old-ota.ttf',{}),after=b({coins:62750},family,'old-ota.ttf',{});
    assert(before.family.startsWith(assets[family].postScriptName+'-'));
    assert.notEqual(before.family,after.family,'warm JS boot reuses old native alias');
    assert.equal(Object.values(before.font)[0],assets[family].source);
  }
  assert.equal(a({},'FontAwesome5Free-Light','old.ttf',{}).family,a({},'FontAwesome5Free-Regular','old.ttf',{}).family,'light/regular share the same actual font');
});
