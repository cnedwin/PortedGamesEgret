import test from 'node:test';
import assert from 'node:assert/strict';
import { button, col, text, field, choice, compile } from '../src/ui/native-kit.mjs';
test('descriptions preserve actions, names, disabled state and native paragraphs',()=>{
  let seen;
  const {root,bind}=compile(col([text('story',{lines:2}),button('Start','new',{page:'seat'},{disabled:true}),field('Name','own-name',''),choice('Rank',null,{id:'rank'},1,[[1,'First'],[2,'Second']])]),{dispatch:(...args)=>seen=args});
  assert.equal(root.children[0].paragraph.maxLines,2);
  assert.equal(root.children[1].type,'button');
  assert.equal(bind[root.children[1].name].disabled(),true);
  bind[root.children[2].name].tap({},null);
  assert.equal(seen[0],'@field');assert.equal(seen[1].id,'own-name');
  bind[root.children[3].name].tap({},null);
  assert.deepEqual(seen[1].options,[[1,'First'],[2,'Second']]);
  assert.equal(new Set(root.children.map(x=>x.name)).size,4);
});
