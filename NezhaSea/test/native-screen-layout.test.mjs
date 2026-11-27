import test from 'node:test';
import assert from 'node:assert/strict';
import { viewSpace, showView } from '../src/ui-layout.mjs';

test('native view space and variants use the engine scale and safe area without mapping part units', () => {
  let captured;
  const safe = {x: 40, y: 50, width: 640, height: 1200};
  const game = { safe, uiScale: 2, show(description, options) { captured = {description, options}; return 123; } };
  assert.deepEqual(viewSpace(game), {width: 320, height: 600, safe, factor: 2});
  const root = {type:'panel', width: 100, height: 44, children: [{type:'button', name:'ok', width:44, height:44}]};
  const portrait = {...root, anchor:'bottom'};
  const tablet = {...root, width:200};
  const tabletPortrait = {...portrait, width:200};
  assert.equal(showView(game, 'test', {root, portrait, tablet, tabletPortrait}, {modal:true}), 123);
  assert.deepEqual(captured.description.root, root);
  assert.equal(captured.description.portrait, portrait);
  assert.equal(captured.description.tablet, tablet);
  assert.equal(captured.description.tabletPortrait, tabletPortrait);
  assert.equal(captured.description.area, 'safe');
  assert.equal(captured.description.modal, true);
});
