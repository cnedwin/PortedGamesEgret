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

test('Tab remains focus navigation and canceling a rebind notifies its settings row', () => {
  const oldAdd = globalThis.addEventListener, oldDocument = globalThis.document;
  const events = {};
  globalThis.addEventListener = (type, listener) => { events[type] = listener; };
  globalThis.document = { hidden: false, addEventListener() {} };
  const keydown = (code) => {
    const event = { code, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    events.keydown(event);
    return event;
  };
  try {
    const keys = { ...DEFAULT_KEYS, attack: 'Tab', guard: 'Mouse0', stars: 'KeyR' };
    const input = createInput({ addEventListener() {} }, keys);
    assert.equal(keys.attack, 'Mouse2');
    assert.equal(keys.guard, 'Mouse0');
    assert.equal(keys.stars, 'KeyR');
    assert.equal(keydown('Tab').defaultPrevented, false);
    assert.equal(input.sample({ x: 0, z: 0 }, null).attack, false);

    input.setEnabled(false);
    const commits = [], cancels = [];
    const ask = () => input.ask(code => commits.push(code), code => cancels.push(code));
    ask();
    assert.equal(keydown('Tab').defaultPrevented, false);
    keydown('KeyT');
    ask();
    assert.equal(keydown('Escape').defaultPrevented, true);
    keydown('KeyT');
    assert.deepEqual(cancels, ['Tab', 'Escape']);
    assert.deepEqual(commits, []);
    ask();
    keydown('KeyT');
    assert.deepEqual(commits, ['KeyT']);

    let observed;
    input.on('any', (code, event) => { if (code === 'F3') observed = event; });
    const event = keydown('F3');
    assert.equal(observed, event);
    assert.equal(event.defaultPrevented, false);
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

test('native overlay rebind consumes its next mouse press without producing a strike', () => {
  const oldAdd = globalThis.addEventListener, oldDocument = globalThis.document, events = {};
  globalThis.addEventListener = (name, call) => { events[name] = call; };
  globalThis.document = { hidden: false, addEventListener() {} };
  try {
    const input = createInput({ addEventListener() {} }, { ...DEFAULT_KEYS });
    input.setEnabled(false);
    let code, stopped = false, prevented = false;
    input.ask(value => { code = value; });
    events.pointerdown({ pointerType: 'touch', button: 0 });
    assert.equal(input.asking, true);
    events.pointerdown({
      pointerType: 'mouse', button: 2,
      stopImmediatePropagation() { stopped = true; },
      preventDefault() { prevented = true; }
    });
    assert.equal(code, 'Mouse2');
    assert.ok(stopped && prevented);
    assert.equal(input.asking, false);
    input.setEnabled(true);
    assert.deepEqual(input.sample({ x: 0, z: 0 }, null), quiet());
  } finally {
    globalThis.addEventListener = oldAdd;
    globalThis.document = oldDocument;
  }
});

test('losing focus while rebinding sends one cancellation to the native settings row', () => {
  const oldAdd = globalThis.addEventListener, oldDocument = globalThis.document, events = {};
  globalThis.addEventListener = (name, call) => { events[name] = call; };
  globalThis.document = { hidden: false, addEventListener() {} };
  try {
    const input = createInput({ addEventListener() {} }, { ...DEFAULT_KEYS });
    const cancelled = [];
    input.ask(() => assert.fail('interrupted rebind committed'), code => cancelled.push(code));
    events.blur();
    events.blur();
    assert.equal(input.asking, false);
    assert.deepEqual(cancelled, ['InputReset']);
  } finally {
    globalThis.addEventListener = oldAdd;
    globalThis.document = oldDocument;
  }
});

test('focused native UI confirms without dodging, while world keys still reach combat', () => {
  const oldAdd = globalThis.addEventListener, oldDocument = globalThis.document, events = {};
  globalThis.addEventListener = (name, call) => { events[name] = call; };
  globalThis.document = { hidden: false, addEventListener() {} };
  try {
    const canvas = { addEventListener() {} };
    const input = createInput(canvas, { ...DEFAULT_KEYS }, {
      uiOwnsKey: event => event.target !== canvas && event.code === 'Space'
    });
    events.keydown({ code: 'Space', target: {}, preventDefault() {} });
    assert.equal(input.sample({ x: 0, z: 0 }, null).dodge, false);
    events.keydown({ code: 'Space', target: canvas, preventDefault() {} });
    assert.equal(input.sample({ x: 0, z: 0 }, null).dodge, true);
  } finally {
    globalThis.addEventListener = oldAdd;
    globalThis.document = oldDocument;
  }
});

test('releasing a canvas pointer over an overlay clears only its matching hold', () => {
  const oldAdd = globalThis.addEventListener, oldDocument = globalThis.document;
  const oldWidth = globalThis.innerWidth, oldHeight = globalThis.innerHeight;
  const windowEvents = {}, canvasEvents = {};
  globalThis.addEventListener = (type, listener) => { windowEvents[type] = listener; };
  globalThis.document = { hidden: false, addEventListener() {} };
  globalThis.innerWidth = globalThis.innerHeight = 100;
  const pointer = (pointerType, pointerId, button, buttons, target) => ({
    pointerType, pointerId, button, buttons, target, clientX: 50, clientY: 50, preventDefault() {}
  });
  try {
    const canvas = { focus() {}, addEventListener(type, listener) { canvasEvents[type] = listener; } };
    const input = createInput(canvas, { ...DEFAULT_KEYS });
    const read = () => input.sample({ x: 0, z: 0 }, null);
    // The spear-page overlay is a sibling of the canvas, so its pointerup
    // reaches the window without passing through the canvas.
    canvasEvents.pointerdown(pointer('mouse', 1, 2, 2));
    assert.equal(read().guard, true, 'the canvas press starts guarding');
    windowEvents.pointerup?.(pointer('touch', 1, 2, 0));
    windowEvents.pointerup?.(pointer('mouse', 2, 2, 0));
    assert.equal(read().guard, true, 'touch and unrelated mouse release leave this guard held');
    windowEvents.pointerup?.(pointer('mouse', 1, 2, 0));
    assert.equal(read().guard, false, 'release on the page unwinds this mouse guard');
    canvasEvents.pointerdown(pointer('mouse', 1, 2, 2, canvas));
    windowEvents.pointermove(pointer('mouse', 1, 0, 3, canvas));
    const chord = read();
    assert.equal(chord.guard, true);
    assert.equal(chord.attack, true, 'the second button can press on the canvas');
    assert.equal(chord.charge, true);
    windowEvents.pointermove(pointer('mouse', 1, 2, 1, {}));
    const inPage = read();
    assert.equal(inPage.guard, false, 'releasing the first chord button over the page only ends guard');
    assert.equal(inPage.charge, true);
    windowEvents.pointerup(pointer('mouse', 1, 0, 0));
    assert.equal(read().charge, false);
    windowEvents.keydown({ code: 'KeyW', preventDefault() {} });
    input.hold('guard', true);
    canvasEvents.pointerdown(pointer('mouse', 1, 2, 2));
    windowEvents.pointerup?.(pointer('mouse', 1, 2, 0));
    assert.equal(read().guard, true);
    input.hold('guard', false);
    canvasEvents.pointerdown(pointer('pen', 3, 0, 1));
    assert.equal(read().charge, true);
    windowEvents.pointercancel?.(pointer('pen', 3, -1, 0));
    const after = read();
    assert.equal(after.charge, false);
    assert.equal(after.guard, false);
    assert.equal(after.mz, -1);
    windowEvents.keyup({ code: 'KeyW' });
    assert.equal(read().mz, 0);
  } finally {
    globalThis.addEventListener = oldAdd; globalThis.document = oldDocument;
    globalThis.innerWidth = oldWidth; globalThis.innerHeight = oldHeight;
  }
});
