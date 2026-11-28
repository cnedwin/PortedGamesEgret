import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../vendor/node-register.mjs';
const {createMoveOwnership,exploreControlDescription}=await import('../web/jyx2/ui/native/explore-controls.mjs');

test('one captured cardinal direction cannot be stolen or cleared by a second contact',()=>{
  const events=[];const move=createMoveOwnership({onDown:(...v)=>events.push(['down',...v]),onUp:(...v)=>events.push(['up',...v])});
  assert.equal(move.press('right','touch'),true);assert.equal(move.press('up','touch'),false);
  assert.equal(move.release('up'),false);assert.equal(move.held,'right');assert.equal(move.release('right'),true);
  assert.deepEqual(events,[['down','right','touch'],['up','right','release']]);
});
test('modal or rotation clears one held contact without double release, then a fresh semantic action pairs',()=>{
  const events=[];const move=createMoveOwnership({onDown:(...v)=>events.push(['down',...v]),onUp:(...v)=>events.push(['up',...v])});
  assert.equal(move.press('left'),true);assert.equal(move.clear('modal'),true);assert.equal(move.release('left'),false);
  assert.equal(move.pulse('down','semantic'),true);assert.equal(move.clear('blur'),false);
  assert.deepEqual(events,[['down','left','pointer'],['up','left','modal'],['down','down','semantic'],['up','down','release']]);
});
test('all four screen variants expose the same named action targets',()=>{
  const description=exploreControlDescription();const names=root=>[...(root.name?[root.name]:[]),...(root.children??[]).flatMap(names)].sort();
  assert.deepEqual(names(description.root),names(description.portrait));assert.deepEqual(names(description.root),names(description.tablet));
  assert.deepEqual(names(description.root),names(description.tabletPortrait));assert.equal(names(description.root).filter(name=>name.startsWith('explore-move-')).length,4);
});
