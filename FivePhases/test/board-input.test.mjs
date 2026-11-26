import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBoardInput } from '../src/view/board-input.mjs';
function fixture() {
  let selected = -1, lock = false;
  const calls = [];
  const target = {};
  const input = createBoardInput({
    cellAt: (x,y) => x<0||x>=300||y<0||y>=300 ? -1 : Math.floor(x/100)+Math.floor(y/100)*3,
    acceptTarget: node => node === target,
    locked: () => lock,
    selected: () => selected,
    select: i => { selected=i; calls.push(['select',i]); },
    clear: () => { selected=-1; calls.push(['clear']); },
    neighbour: (i,dx,dy) => Math.abs(dx)>Math.abs(dy) ? i+(dx>0?1:-1) : i+(dy>0?3:-3),
    adjacent: (a,b) => Math.abs(a%3-b%3)+Math.abs(Math.floor(a/3)-Math.floor(b/3))===1,
    preview: (a,b) => calls.push(['preview',a,b]),
    swap: (a,b) => { selected=-1; calls.push(['swap',a,b]); },
    unlock: () => {},
    reach: 40
  });
  function emit(kind,id,x,y,node=target) { input.contact({kind,target:node,contact:{session:{pointerId:id},globalX:x,globalY:y}}); }
  return {input,calls,emit,setLock:v=>lock=v};
}
test('two taps and an intentional drag each swap exactly once',()=>{
  const {emit,calls}=fixture();
  emit('begin',1,50,50); emit('end',1,50,50);
  emit('begin',2,150,50); emit('end',2,150,50);
  assert.deepEqual(calls.filter(c=>c[0]==='swap'),[['swap',0,1]]);
  emit('begin',3,150,50); emit('move',3,162,50); emit('move',3,205,50); emit('move',3,235,50); emit('end',3,235,50);
  assert.deepEqual(calls.filter(c=>c[0]==='swap'),[['swap',0,1],['swap',1,2]]);
  assert.ok(calls.some(c=>c[0]==='preview'));
});
test('other touches, outside targets, cancellation and locked actions do not leak',()=>{
  const {emit,calls,setLock}=fixture();
  emit('begin',1,50,50,{}); emit('end',1,50,50,{});
  emit('begin',2,50,50); emit('begin',3,50,50); emit('move',3,150,50); emit('end',3,150,50);
  emit('cancel',2,50,50);
  assert.ok(!calls.some(c=>c[0]==='select'||c[0]==='swap'));
  setLock(true); emit('begin',4,50,50); emit('move',4,150,50); emit('end',4,150,50);
  assert.ok(!calls.some(c=>c[0]==='swap'));
  setLock(false); emit('begin',5,50,50); emit('end',5,50,50);
  assert.ok(calls.some(c=>c[0]==='select'));
});