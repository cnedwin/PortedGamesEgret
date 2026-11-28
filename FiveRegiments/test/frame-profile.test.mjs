import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFrameProfile } from '../src/view/frame-profile.mjs';

test('diagnostic lanes stay independently bounded and preserve order',()=>{
  const p=createFrameProfile(3);
  for(let i=0;i<7;i++)p.record('play',{id:i});
  p.record('world',{id:20});
  const seen=p.snapshot();
  assert.deepEqual(seen.play,{dropped:4,samples:[{id:4},{id:5},{id:6}]});
  assert.deepEqual(seen.world,{dropped:0,samples:[{id:20}]});
  p.record('play',{id:7});
  assert.equal(seen.play.samples.at(-1).id,6);
  assert.deepEqual(p.snapshot().play.samples.map(s=>s.id),[5,6,7]);
});
