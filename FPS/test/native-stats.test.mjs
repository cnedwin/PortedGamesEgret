import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../vendor/node-register.mjs';
const {createNativeStats}=await import('../src/native-stats.mjs');

test('native numeric timings preserve legacy status shape without DOM',async()=>{
 const renderer={info:{drawCalls:5,triangles:70}};
 const stats=createNativeStats(renderer);
 assert.deepEqual(stats.average,{frame:0,rules:0,view:0,draw:0});
 stats.begin();stats.lap('rules');stats.lap('view');stats.end(3);
 await Promise.resolve();
 assert.equal(stats.renderer,renderer); assert.equal(stats.enemies,3);
 assert.equal(stats.drawCalls,5);assert.equal(stats.triangles,70);
 assert(stats.average.rules>=0&&stats.average.view>=0&&stats.average.draw>=0);
 await new Promise(resolve=>setTimeout(resolve,4));
 renderer.info={drawCalls:7,triangles:99};
 stats.begin();stats.lap('rules');stats.lap('view');stats.end(2);await Promise.resolve();
 assert(stats.average.frame>0&&stats.slowest>0&&stats.fps>0);
 assert.equal(stats.enemies,2);assert.equal(stats.drawCalls,7);assert.equal(stats.triangles,99);
 stats.dispose();
});
test('disposal cancels an outstanding post-draw sample',async()=>{
 const renderer={info:{drawCalls:1,triangles:10}};
 const stats=createNativeStats(renderer);
 stats.begin();stats.lap('rules');stats.lap('view');stats.end(1);stats.dispose();
 renderer.info=null;
 await Promise.resolve();
 assert.equal(stats.drawCalls,0);
});
