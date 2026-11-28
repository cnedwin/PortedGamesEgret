import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssetDownloads, titleAssetUrls } from '../src/view/asset-downloads.mjs';
import '../vendor/node-register.mjs';
const {describePlace}=await import('../src/view/stage.mjs');
const {REGIMENTS,ORDER}=await import('../src/sim/regiments.mjs');
test('title downloads use the actual county dependencies and selected quality without speculative variants',()=>{
 const root=new URL('https://example.test/game/assets/');
 const plan=titleAssetUrls(root,describePlace('county'),ORDER,REGIMENTS,'high').map(x=>x.pathname);
 assert.equal(new Set(plan).size,34);assert.equal(plan.filter(x=>x.includes('/props/')&&x.endsWith('-high.glb')).length,14);
 assert.equal(plan.filter(x=>x.includes('/characters/')&&x.endsWith('-mid.glb')).length,6);
 assert.equal(plan.filter(x=>x.includes('/motion/')).length,10);
 assert.equal(plan.filter(x=>x.includes('/materials/')||x.includes('/skies/')).length,4);
 const shared=titleAssetUrls(root,describePlace('county'),ORDER,REGIMENTS,'auto').map(x=>x.pathname);
 assert.equal(shared.length,14);assert.ok(shared.every(x=>!x.endsWith('.glb')));
 for(const q of ['low','medium']){const list=titleAssetUrls(root,describePlace('county'),ORDER,REGIMENTS,q);assert.equal(new Set(list.map(String)).size,34)}
});
test('warming downloads shares the in-flight body once, then releases its staging reference',async()=>{
 let calls=0,release;const downloads=createAssetDownloads(async()=>{calls++;await new Promise(r=>{release=r});return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'application/octet-stream'}})});
 const url=new URL('https://example.test/a.glb');downloads.warm([url,url]);const first=downloads.read(url);assert.equal(calls,1);release();const result=await first;
 assert.equal(result.ok,true);assert.deepEqual([...new Uint8Array(result.bytes)],[1,2,3]);assert.equal(result.type,'application/octet-stream');assert.equal(downloads.pending,0);
});
test('failed speculative downloads are evicted and actual requests can retry',async()=>{
 let calls=0;const downloads=createAssetDownloads(async()=>{if(++calls===1)throw Error('offline');return new Response(new Uint8Array([7]));});
 downloads.warm(['https://example.test/retry']);await new Promise(r=>setTimeout(r,0));assert.equal(downloads.pending,0);
 assert.equal((await downloads.read('https://example.test/retry')).ok,true);assert.equal(calls,2);
});
