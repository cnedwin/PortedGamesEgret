import test from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/input.mjs';

class PointerSurface extends EventTarget {
  constructor() {
    super();
    this.captures = new Set();
    this.style = { setProperty() {} };
    this.classList = { add() {}, remove() {} };
    this.lockRequests = 0;
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  requestPointerLock() { this.lockRequests++; return Promise.resolve(); }
}

function pointer(surface, type, pointerId, clientX, clientY, pointerType = 'touch') {
  surface.dispatchEvent(Object.assign(new Event(type), { pointerId, clientX, clientY, pointerType, button: 0 }));
}

function setup(t, coarse = true) {
  const originals = new Map();
  for (const [name, value] of Object.entries({
    window: Object.assign(new EventTarget(), { matchMedia: () => ({ matches: coarse }) }),
    document: new EventTarget(),
    navigator: { getGamepads: () => [] },
  })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true });
  }
  const canvas = new PointerSurface(), joystick = new PointerSurface();
  const actions = Object.fromEntries(['jump', 'slam', 'roll'].map(action => [action, new PointerSurface()]));
  const input = createInput(canvas, { joystick, actions });
  t.after(() => {
    input.dispose();
    for (const [name, original] of originals) {
      if (original) Object.defineProperty(globalThis, name, original);
      else delete globalThis[name];
    }
  });
  input.setTouchEnabled(true);
  return { input, canvas, joystick, actions };
}

test('touch supports moving and holding an independent roll pointer, then releases both', t => {
  const { input, joystick, actions } = setup(t);
  pointer(joystick, 'pointerdown', 1, 50, 20);
  pointer(actions.roll, 'pointerdown', 2, 20, 20);
  assert.ok(input.poll().forward > 0.5);
  assert.equal(input.poll().roll, true);
  pointer(actions.roll, 'pointercancel', 2, 20, 20);
  assert.equal(input.poll().roll, false);
  assert.ok(input.poll().forward > 0.5);
  input.setTouchEnabled(false);
  assert.equal(input.poll().forward, 0);
  assert.equal(joystick.hasPointerCapture(1), false);
});

test('quick jump taps reach one poll, held jumps persist, and canceled jumps clear', t => {
  const { input, actions } = setup(t);
  pointer(actions.jump, 'pointerdown', 1, 20, 20);
  pointer(actions.jump, 'pointerup', 1, 20, 20);
  assert.equal(input.poll().jump, true);
  assert.equal(input.poll().jump, false);
  pointer(actions.jump, 'pointerdown', 2, 20, 20);
  assert.equal(input.poll().jump, true);
  assert.equal(input.poll().jump, true);
  let canceled = false;
  input.onJumpCancel = () => { canceled = true; };
  window.dispatchEvent(new Event('blur'));
  assert.equal(input.poll().jump, false);
  assert.equal(canceled, true);
});

test('dragging the right canvas changes look without requesting pointer lock or slamming', t => {
  const { input, canvas, actions } = setup(t);
  pointer(canvas, 'pointerdown', 1, 60, 40);
  pointer(canvas, 'pointermove', 1, 80, 50);
  const { lookX, lookY, slam } = input.poll();
  assert.deepEqual([lookX, lookY, slam, canvas.lockRequests], [20, 10, false, 0]);
  pointer(actions.slam, 'pointerdown', 2, 20, 20);
  pointer(actions.slam, 'pointerup', 2, 20, 20);
  assert.equal(input.poll().slam, true);
  assert.equal(input.poll().slam, false);
});

test('desktop mouse still requests pointer lock', t => {
  const { canvas } = setup(t, false);
  pointer(canvas, 'pointerdown', 1, 50, 20, 'mouse');
  assert.equal(canvas.lockRequests, 1);
});
