import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const {ISLAND,createIslandGeometry,groundHeight}=await import('../src/island.mjs');

test('the painted toy trail reads warmer than surrounding mint grass, without changing the ground mesh',()=>{
  const geometry=createIslandGeometry(), stride=ISLAND.cells+1;
  const pos=geometry.getAttribute('position').data, colour=geometry.getAttribute('color').data, index=geometry.index.data;
  const at=(x,z)=>(z+ISLAND.half)*stride+x+ISLAND.half;
  for(const [x,z] of [[0,0],[18,0],[20,3],[-13,13],[34,0]]) {
    const k=at(x,z)*3;
    assert.deepEqual(Array.from(pos.slice(k,k+3)),[x,groundHeight(x,z),z]);
    assert.ok(colour.slice(k,k+3).every(v=>v>=0&&v<=1));
  }
  const pavement=at(18,0)*3, grass=at(24,4)*3;
  assert.ok(colour[pavement]>colour[grass]*1.6,'a warm trail separates land regions');
  assert.equal(index.length,ISLAND.cells*ISLAND.cells*6);
  assert.deepEqual(Array.from(index.slice(0,6)),[0,stride,1,1,stride,stride+1]);
});
