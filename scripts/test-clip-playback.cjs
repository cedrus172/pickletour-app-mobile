const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const source=fs.readFileSync(path.join(__dirname,'../utils/clipPlayback.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('module','exports',compiled)(mod,mod.exports);
const {cameraFrameTime,cameraSeekTarget,cameraCanSeekLocally,cameraCutRange,cameraHistoryTitle}=mod.exports;
const origin=Date.parse('2026-10-31T11:47:21Z'),now=Date.parse('2026-10-31T12:00:00Z');

test('30-second jumps start at the actual video position, including fractional seconds',()=>{
 const current=cameraFrameTime('playback',origin,42.5,null,null,now);
 assert.equal(cameraSeekTarget(current,-30,now),origin+12500);
 assert.equal(cameraSeekTarget(current,30,now),origin+72500);
});
test('rewind past session start requests an earlier NVR time rather than clamping to zero',()=>{
 const target=cameraSeekTarget(origin+10000,-30,now);
 assert.equal(target,origin-20000);
 assert.equal(cameraCanSeekLocally('playback',false,origin,target,1800),false);
});
test('forward never moves into the future and absolute time never becomes negative',()=>{
 assert.equal(cameraSeekTarget(now-10000,30,now),now);
 assert.equal(cameraSeekTarget(10000,-30,now),0);
});
test('only a finite VOD source can seek directly within its real duration',()=>{
 assert.equal(cameraCanSeekLocally('playback',false,origin,origin+30000,300),true);
 assert.equal(cameraCanSeekLocally('playback',false,origin,origin+300000,300),false);
 for(const duration of [0,NaN,Infinity])assert.equal(cameraCanSeekLocally('playback',false,origin,origin+30000,duration),false);
 assert.equal(cameraCanSeekLocally('playback',true,origin,origin+30000,300),false);
 assert.equal(cameraCanSeekLocally('live',false,origin,origin+30000,300),false);
});
test('live timestamp or live latency is used for live rewind',()=>{
 assert.equal(cameraFrameTime('live',origin,0,now-8000,30,now),now-8000);
 assert.equal(cameraFrameTime('live',origin,0,null,8,now),now-8000);
});
test('live without server timestamps stays on the frame clock even while paused',()=>{
 const frame=origin+12500;
 assert.equal(cameraFrameTime('live',origin,12.5,null,null,now),frame);
 assert.equal(cameraFrameTime('live',origin,12.5,null,null,now+30000),frame);
 assert.equal(cameraSeekTarget(frame,-30,now+30000),origin-17500);
});
test('playback ignores encode wall-clock metadata that describes today instead of the recording',()=>{
 assert.equal(cameraFrameTime('playback',origin,45,now,null,now),origin+45000);
 assert.equal(cameraFrameTime('playback',origin,45,origin+44000,null,now),origin+44000);
 assert.equal(cameraFrameTime('playback',origin,NaN,null,null,now),origin);
});
test('quick preview and cut share a range starting at the selected timeline point',()=>{
 const range=cameraCutRange(new Date(origin),300,now);
 assert.equal(range.start.toISOString(),'2026-10-31T11:47:21.000Z');
 assert.equal(range.end.toISOString(),'2026-10-31T11:52:21.000Z');
});
test('range near live and across midnight retains exact dates without requesting future footage',()=>{
 assert.equal(cameraCutRange(new Date(now-10000),300,now).end.getTime(),now);
 const before=Date.parse('2026-10-31T23:58:30Z');
 assert.equal(cameraCutRange(new Date(before),300,before+3600000).end.toISOString(),'2026-11-01T00:03:30.000Z');
});
test('history display parses a known filename but preserves unknown/legacy names',()=>{
 assert.equal(cameraHistoryTitle('S_n_2_2026-10-29_165837_20261029-222529.mp4','Sân 2'),'Sân 2 · 29/10 · 16:58');
 const legacy='S_n_2_last10min_20261029-221024.mp4';assert.equal(cameraHistoryTitle(legacy,'Sân 2'),legacy);
});
