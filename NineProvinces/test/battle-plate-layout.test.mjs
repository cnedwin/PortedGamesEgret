import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutBattlePlates } from '../src/view3d/battle-plate-layout.mjs';

const viewport = { width:873, height:325, obstacles:[] };
const plate = (id, x, y, flags={}) => ({id,x,y,...flags});
const byId = rows => new Map(rows.map(row => [row.id,row]));
const overlap = (a,b) => a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;

test('selected and targetable plates win the shared projection in stable, non-overlapping slots', () => {
  const crowded = [plate(3,430,210),plate(1,430,210,{targetable:true}),plate(2,430,210,{selected:true}),plate(0,430,210)];
  const layout = layoutBattlePlates(crowded,viewport);
  assert.deepEqual(layout,layoutBattlePlates(crowded.slice().reverse(),viewport));
  const rows = byId(layout);
  assert.equal(rows.get(2).mode,'full');
  assert.notEqual(rows.get(1).mode,'hidden');
  const visible = layout.filter(row => row.box);
  assert(visible.some(row => row.mode === 'compact'));
  for (const [i,a] of visible.entries()) for (const b of visible.slice(i+1)) assert(!overlap(a.box,b.box));
});

test('the HUD and the viewport block covered plates without borrowing inaccessible space', () => {
  const obstacles = [{left:0,top:0,right:873,bottom:150},{left:0,top:150,right:250,bottom:325},
    {left:623,top:150,right:873,bottom:325}];
  const entries = [plate(0,40,280,{selected:true}),plate(1,400,147,{targetable:true}),
    plate(2,450,210),plate(3,550,321),plate(4,-2,90),plate(5,460,220,{visible:false})];
  const layout = layoutBattlePlates(entries,{...viewport,obstacles});
  const rows = byId(layout);
  for (const id of [0,4,5]) assert.equal(rows.get(id).mode,'hidden');
  assert(layout.some(row => row.mode !== 'hidden'));
  for (const {box} of layout) if(box) {
    assert(box.left>=0 && box.right<=873 && box.top>=0 && box.bottom<=325);
    assert(!obstacles.some(rect=>overlap(rect,box)));
  }
});

test('high-density projections retain a selected and an aim target and yield the rest in bounded slots', () => {
  const fixtures = Array.from({length:18},(_,i)=>plate(i,320,222,{selected:i===15,targetable:i===17}));
  const rows = byId(layoutBattlePlates(fixtures,{width:667,height:325,obstacles:[
    {left:0,top:0,right:667,bottom:150},{left:0,top:150,right:154,bottom:325},{left:417,top:150,right:667,bottom:325}]}));
  assert.equal(rows.get(15).mode,'full');
  assert.notEqual(rows.get(17).mode,'hidden');
  const visible = [...rows.values()].filter(row=>row.mode!=='hidden');
  assert(visible.length < fixtures.length);
  assert(visible.every(row=>Math.abs(row.dx)<=54 && Math.abs(row.dy)<=54));
});
