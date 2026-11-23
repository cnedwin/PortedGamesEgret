import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemoryScenes } from '../src/memory-scenes.mjs';
import { newGame, serialize } from '../src/sim.mjs';
import { offerFirstEvening } from '../src/first-evening.mjs';

function setup() {
  const storage = new Map();
  const open = () => createMemoryScenes(key => storage.get(key), (key, value) => storage.set(key, value));
  return { storage, open };
}

test('scene snapshots survive while replay mutations stay isolated from saved terms and branches', () => {
  const { storage, open } = setup();
  const term = newGame();
  const original = serialize(term);
  storage.set('love-elective-save-v1', original);
  storage.set('love-elective-qingge-branch-v1', original);
  const scenes = open();
  term.flags.qingge_honest = true;
  scenes.unlock('qingge-review', term);
  const replay = open().read('qingge-review');
  replay.flags.qingge_honest = false;
  replay.hero.wear.top = null;
  assert.equal(open().read('qingge-review').flags.qingge_honest, true);
  assert.equal(open().read('qingge-rehearsal'), null);
  assert.equal(storage.get('love-elective-save-v1'), original);
  assert.equal(storage.get('love-elective-qingge-branch-v1'), original);
});

test('previous saves only unlock scenes proved completed, without claiming any lines were read', () => {
  const { open } = setup();
  const old = newGame();
  old.flags.qingge_honest = true;
  old.girls.bailu.chapter = 2;
  old.bailuZero.stage = 5;
  offerFirstEvening(old);
  old.firstEvening.completed = true;
  const scenes = open();
  const original = serialize(old);
  scenes.importCompleted(old);
  assert.ok(scenes.read('bailu-zero'));
  assert.ok(scenes.read('linxia-first-evening'));
  assert.equal(scenes.read('qingge-review'), null);
  assert.equal(scenes.track('linxia-first-evening').has('3', 'Opening'), false);
  assert.equal(serialize(old), original);
});

test('read history is shared only by the same scene, step and dialogue variant', () => {
  const { open } = setup();
  open().track('bailu-zero-1').mark('7.choice0.0', 'One answer');
  const scenes = open();
  const reader = scenes.track('bailu-zero-1');
  assert.equal(reader.has('7.choice0.0', 'One answer'), true);
  assert.equal(reader.has('7.choice0.0', 'Changed localization'), false);
  assert.equal(reader.has('7.choice1.0', 'One answer'), false);
  assert.equal(scenes.track('bailu-zero-2').has('7.choice0.0', 'One answer'), false);
});
