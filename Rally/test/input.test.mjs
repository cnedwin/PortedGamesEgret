import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInput } from '../src/input.mjs';

class PointerSurface {
  listeners = new Map();
  captures = new Set();
  classes = new Set();
  classList = {
    add: name => this.classes.add(name),
    remove: name => this.classes.delete(name),
    contains: name => this.classes.has(name),
  };
  constructor(name) {
    this.dataset = { touch: name };
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatch(type, fields = {}) {
    const event = { type, target: this, preventDefault() {}, ...fields };
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
}

function setup(t, enabled = true) {
  const browser = new PointerSurface();
  const document = new PointerSurface();
  const touchRoot = new PointerSurface();
  const elsewhere = new PointerSurface();
  const pause = new PointerSurface();
  const buttons = Object.fromEntries(['left', 'right', 'drift', 'brake', 'item'].map(name => [name, new PointerSurface(name)]));
  touchRoot.querySelectorAll = () => Object.values(buttons);
  const originals = new Map();
  for (const [name, value] of Object.entries({
    window: browser,
    addEventListener: browser.addEventListener.bind(browser),
    document,
    navigator: { getGamepads: () => [] },
    HTMLInputElement: class {},
  })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true });
  }
  t.after(() => {
    for (const [name, original] of originals) {
      if (original) Object.defineProperty(globalThis, name, original);
      else delete globalThis[name];
    }
  });
  const input = createInput(touchRoot, pause);
  if (enabled) input.setTouchEnabled?.(true);
  const pointer = (surface, type, pointerId, clientX = 40, clientY = 40, pointerType = 'touch') => {
    const fields = { pointerId, clientX, clientY, button: 0, pointerType };
    surface.dispatch(type, fields);
    if (surface !== browser) browser.dispatch(type, { ...fields, target: surface });
  };
  return { input, browser, document, buttons, pause, elsewhere, pointer };
}

test('a finger leaving Drift keeps its original control while Left is held separately', t => {
  const { input, buttons, elsewhere, pointer } = setup(t);
  const { left, drift } = buttons;
  drift.setPointerCapture = undefined;
  pointer(left, 'pointerdown', 1);
  pointer(drift, 'pointerdown', 2);
  assert.equal(input.poll(0.2).steer, -1);
  assert.equal(input.poll(0.2).drift, true);
  pointer(drift, 'pointerleave', 2);
  pointer(elsewhere, 'pointermove', 2);
  assert.equal(input.poll(0.2).drift, true);
  assert.equal(drift.classList.contains('held'), true);
  pointer(elsewhere, 'pointerup', 2);
  assert.equal(input.poll(0.2).drift, false);
  assert.equal(input.poll(0.2).steer, -1);
  assert.equal(drift.classList.contains('held'), false);
});

test('known outside release and cancel end the right control when explicit capture fails', t => {
  const { input, buttons, elsewhere, pointer } = setup(t);
  const { left, brake } = buttons;
  left.setPointerCapture = () => { throw new DOMException('Capture refused', 'NotFoundError'); };
  brake.setPointerCapture = undefined;
  pointer(left, 'pointerdown', 1);
  pointer(brake, 'pointerdown', 2);
  assert.equal(input.poll(0.2).steer, -1);
  assert.equal(input.poll(0.2).throttle, 0);
  pointer(elsewhere, 'pointerup', 1);
  assert.equal(input.poll(0.2).steer, 0);
  assert.equal(left.classList.contains('held'), false);
  assert.equal(input.poll(0.2).brake, 1);
  pointer(elsewhere, 'pointercancel', 2);
  assert.equal(input.poll(0.2).brake, 0);
  assert.equal(input.poll(0.2).throttle, 1);
  assert.equal(brake.classList.contains('held'), false);
});

test('two fingers on Drift are independent and a wrong pointer ID cannot release either', t => {
  const { input, buttons, elsewhere, pointer } = setup(t);
  const { drift } = buttons;
  pointer(drift, 'pointerdown', 4);
  pointer(drift, 'pointerdown', 5);
  pointer(drift, 'pointercancel', 90);
  assert.equal(input.poll(0.2).drift, true);
  pointer(drift, 'pointerup', 5);
  assert.equal(input.poll(0.2).drift, true);
  assert.equal(drift.classList.contains('held'), true);
  pointer(elsewhere, 'pointercancel', 4);
  assert.equal(input.poll(0.2).drift, false);
  assert.equal(drift.classList.contains('held'), false);
});

test('lost native capture releases only the matching finger', t => {
  const { input, buttons, pointer } = setup(t);
  const { drift } = buttons;
  pointer(drift, 'pointerdown', 4);
  pointer(drift, 'pointerdown', 5);
  assert.equal(drift.hasPointerCapture(4), true);
  assert.equal(drift.hasPointerCapture(5), true);
  drift.captures.delete(4);
  pointer(drift, 'lostpointercapture', 4);
  assert.equal(input.poll(0.2).drift, true);
  drift.captures.delete(5);
  pointer(drift, 'lostpointercapture', 5);
  assert.equal(input.poll(0.2).drift, false);
  assert.equal(drift.classList.contains('held'), false);
});

test('touch controls start disabled and pause/resume rejects old contacts without dropping auto-throttle', t => {
  const { input, buttons, elsewhere, pointer } = setup(t, false);
  const { right, brake } = buttons;
  pointer(right, 'pointerdown', 1);
  assert.equal(input.poll(0.2).steer, 0);
  assert.equal(input.touch, false);
  input.setTouchEnabled(true);
  pointer(right, 'pointerdown', 2);
  pointer(brake, 'pointerdown', 3);
  assert.equal(input.poll(0.2).steer, 1);
  assert.equal(input.poll(0.2).throttle, 0);
  input.setTouchEnabled(false);
  assert.equal(right.classList.contains('held'), false);
  assert.equal(brake.classList.contains('held'), false);
  assert.equal(right.hasPointerCapture(2), false);
  input.setTouchEnabled(true);
  pointer(elsewhere, 'pointermove', 2);
  pointer(elsewhere, 'pointerup', 3);
  const { steer, brake: braking, throttle } = input.poll(0.2);
  assert.deepEqual([steer, braking, throttle], [0, 0, 1]);
  assert.equal(input.touch, true);
});

test('blur and backgrounding clear all touch motion and held visuals', t => {
  const { input, browser, document, buttons, pointer } = setup(t);
  const { drift, brake } = buttons;
  pointer(drift, 'pointerdown', 1);
  browser.dispatch('blur');
  assert.equal(input.poll(0.2).drift, false);
  assert.equal(drift.classList.contains('held'), false);
  pointer(brake, 'pointerdown', 2);
  document.hidden = true;
  document.dispatch('visibilitychange');
  assert.equal(input.poll(0.2).brake, 0);
  assert.equal(brake.classList.contains('held'), false);
});

test('a second-finger pause dispatches on valid release while steering remains held', t => {
  const { input, buttons, pause, pointer } = setup(t);
  const commands = [];
  input.onCommand = command => {
    assert.equal(input.poll(0.2).steer, -1);
    commands.push(command);
  };
  pointer(buttons.left, 'pointerdown', 1);
  pointer(pause, 'pointerdown', 2);
  assert.deepEqual(commands, []);
  pointer(pause, 'pointerup', 2, 42, 41);
  pointer(buttons.left, 'pointerup', 1);
  assert.deepEqual(commands, ['pause']);
});

test('canceled, outside and swiped pauses do not dispatch a menu command', t => {
  const { input, pause, elsewhere, pointer } = setup(t);
  const commands = [];
  input.onCommand = command => commands.push(command);
  pointer(pause, 'pointerdown', 1);
  pointer(elsewhere, 'pointercancel', 1);
  pointer(pause, 'pointerdown', 2, 3, 40);
  pointer(pause, 'pointerup', 2, -1, 40);
  pointer(pause, 'pointerdown', 3);
  pointer(elsewhere, 'pointermove', 3, 61, 40);
  pointer(pause, 'pointerup', 3);
  assert.deepEqual(commands, []);
  pointer(pause, 'pointerdown', 4);
  pointer(pause, 'pointerup', 4);
  assert.deepEqual(commands, ['pause']);
});

test('keyboard and gamepad controls still work while touch controls are disabled', t => {
  const { input, browser } = setup(t, false);
  browser.dispatch('keydown', { code: 'KeyW' });
  browser.dispatch('keydown', { code: 'ArrowLeft' });
  assert.equal(input.poll(0.2).throttle, 1);
  assert.equal(input.poll(0.2).steer, -1);
  browser.dispatch('keyup', { code: 'KeyW' });
  browser.dispatch('keyup', { code: 'ArrowLeft' });
  navigator.getGamepads = () => [{ connected: true, axes: [0.65], buttons: [{ value: 1 }] }];
  assert.equal(input.poll(0.2).throttle, 1);
  assert.equal(input.poll(0.2).steer, 0.65);
});
