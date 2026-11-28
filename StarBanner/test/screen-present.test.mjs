import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createScreenPresentation } from '../src/ui/screen-present.mjs';

function fixture(){
  let renders=0, next=0; const pending=new Map();
  const screen=createScreenPresentation(()=>renders++,{
    schedule(fn,ms){assert.equal(ms,250);pending.set(++next,fn);return next;},
    cancel(id){pending.delete(id);}
  });
  return {screen,pending,flush(){for(const [id,fn] of pending){pending.delete(id);fn();}},get renders(){return renders;}};
}

test('screen transitions invalidate once immediately and coalesce a single finite follow-up',()=>{
  const f=fixture(); f.screen.changed();f.screen.changed();f.screen.changed();
  assert.equal(f.renders,3);assert.equal(f.pending.size,1);f.flush();
  assert.equal(f.renders,4);assert.equal(f.pending.size,0);
});

test('closed overlay removes its follow-up and never invalidates again',()=>{
  const f=fixture();f.screen.changed();f.screen.dispose();f.screen.changed();f.flush();
  assert.equal(f.pending.size,0);assert.equal(f.renders,1);
});
