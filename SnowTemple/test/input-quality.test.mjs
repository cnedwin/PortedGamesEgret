import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createInput, DEFAULT_KEYS } from '../src/input.mjs';
import { createGame, begin, quiet, step } from '../src/rules/game.mjs';

test('analogue movement keeps thumb magnitude while diagonal keyboard movement stays capped', () => {
  function distance(mx, mz = 0) {
    const game = createGame(); begin(game); game.cine = 0;
    const { x, z } = game.hero;
    step(game, { ...quiet(), mx, mz }, 1 / 60);
    return Math.hypot(game.hero.x - x, game.hero.z - z);
  }
  assert.ok(Math.abs(distance(.25) / distance(1) - .25) < 1e-8);
  assert.ok(Math.abs(distance(1, 1) - distance(1)) < 1e-8);
});

for (const interrupt of ['blur', 'hidden']) test(`${interrupt} clears stick, held actions and pending taps`, () => {
  const oldAdd = globalThis.addEventListener, oldDocument = globalThis.document;
  const windowEvents = {}, documentEvents = {};
  globalThis.addEventListener = (name, fn) => { windowEvents[name] = fn; };
  globalThis.document = { hidden: false, addEventListener(name, fn) { documentEvents[name] = fn; } };
  try {
    const input = createInput({ addEventListener() {} }, { ...DEFAULT_KEYS });
    input.setStick(.5, -.3); input.hold('attack', true); input.hold('guard', true);
    if (interrupt === 'hidden') { document.hidden = true; documentEvents.visibilitychange?.(); }
    else windowEvents.blur();
    assert.deepEqual(input.sample({ x: 0, z: 0 }, null), quiet());
  } finally { globalThis.addEventListener = oldAdd; globalThis.document = oldDocument; }
});

test('view receives the configured shadow map size rather than silently forcing high quality', () => {
  const source = readFileSync(new URL('../src/view/view.mjs', import.meta.url), 'utf8');
  // Wiring regression: this view imports the browser engine, so its rendering is checked separately.
  assert.match(source, /shadowSize\s*=\s*2048/);
  assert.match(source, /mapSize:\s*shadowSize/);
});

test('settings input suppression drops taps and resumes with a clean state, but rebinding still works', () => {
  const oldAdd = globalThis.addEventListener, oldDocument = globalThis.document;
  const events = {};
  globalThis.addEventListener = (name, fn) => { events[name] = fn; };
  globalThis.document = { hidden: false, addEventListener() {} };
  try {
    const input = createInput({ addEventListener() {} }, { ...DEFAULT_KEYS });
    input.hold('attack', true);
    input.setEnabled(false);
    input.hold('attack', true); input.setStick(1, 0);
    events.keydown({ code: 'Space', preventDefault() {} });
    assert.deepEqual(input.sample({x: 0, z: 0}, null), quiet());
    let rebound;
    input.ask(code => { rebound = code; });
    events.keydown({ code: 'KeyR', preventDefault() {} });
    assert.equal(rebound, 'KeyR');
    input.setEnabled(true);
    assert.deepEqual(input.sample({x: 0, z: 0}, null), quiet());
    input.hold('attack', true);
    assert.equal(input.sample({x: 0, z: 0}, null).attack, true);
  } finally { globalThis.addEventListener = oldAdd; globalThis.document = oldDocument; }
});

test('a touch control has one owner; another finger cannot steal or release it', async () => {
  const { createPointerOwner } = await import('../src/input.mjs');
  const owner = createPointerOwner();
  assert.equal(owner.claim(1), true);
  assert.equal(owner.claim(2), false);
  assert.equal(owner.owns(1), true);
  assert.equal(owner.release(2), false);
  assert.equal(owner.owns(1), true);
  assert.equal(owner.release(1), true);
  assert.equal(owner.claim(2), true);
  owner.reset();
  assert.equal(owner.owns(2), false);
  assert.equal(owner.claim(3), true);
});
