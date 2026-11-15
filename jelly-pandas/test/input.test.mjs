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
  const event = Object.assign(new Event(type, { bubbles: true, cancelable: true }), { pointerId, clientX, clientY, pointerType, button: 0 });
  surface.dispatchEvent(event);
  // Standalone EventTargets do not have the real document's event path.
  if (surface !== window) window.dispatchEvent(event);
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
  const canvas = new PointerSurface(), joystick = new PointerSurface(), pause = new PointerSurface();
  const actions = Object.fromEntries(['jump', 'slam', 'roll'].map(action => [action, new PointerSurface()]));
  const input = createInput(canvas, { joystick, actions, pause });
  t.after(() => {
    input.dispose();
    for (const [name, original] of originals) {
      if (original) Object.defineProperty(globalThis, name, original);
      else delete globalThis[name];
    }
  });
  input.setTouchEnabled(true);
  return { input, canvas, joystick, actions, pause };
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

test('a refused capture preserves the owner and outside motion or release, independently for each contact', t => {
  const { input, canvas, joystick, actions } = setup(t);
  const elsewhere = new PointerSurface();
  canvas.setPointerCapture = () => { throw new DOMException('Contact cannot be captured', 'NotFoundError'); };
  joystick.setPointerCapture = undefined;
  joystick.hasPointerCapture = undefined;
  joystick.releasePointerCapture = undefined;
  actions.roll.setPointerCapture = () => {};

  pointer(canvas, 'pointerdown', 1, 60, 40);
  pointer(joystick, 'pointerdown', 2, 50, 50);
  pointer(actions.roll, 'pointerdown', 3, 20, 20);
  pointer(elsewhere, 'pointermove', 1, 86, 51);
  pointer(elsewhere, 'pointermove', 2, 50, 18);
  let frame = input.poll();
  assert.deepEqual([frame.lookX, frame.lookY, frame.forward, frame.roll], [26, 11, 1, true]);

  pointer(elsewhere, 'pointerup', 1, 86, 51);
  pointer(elsewhere, 'pointercancel', 2, 50, 18);
  pointer(elsewhere, 'pointermove', 1, 95, 58);
  frame = input.poll();
  assert.deepEqual([frame.lookX, frame.lookY, frame.forward, frame.roll], [0, 0, 0, true]);
  pointer(elsewhere, 'pointerup', 3, 22, 18);
  assert.equal(input.poll().roll, false);
});

test('outside cancellation discards only the canceled unsampled look gesture', t => {
  const { input, canvas } = setup(t);
  const elsewhere = new PointerSurface();
  canvas.setPointerCapture = () => {};
  pointer(canvas, 'pointerdown', 1, 62, 40);
  pointer(canvas, 'pointermove', 1, 71, 50);
  pointer(canvas, 'pointerup', 1, 71, 50);
  pointer(canvas, 'pointerdown', 2, 66, 36);
  pointer(canvas, 'pointermove', 2, 90, 55);
  pointer(elsewhere, 'pointercancel', 2, 90, 55);
  const { lookX, lookY } = input.poll();
  assert.deepEqual([lookX, lookY], [9, 10]);
  pointer(canvas, 'pointerdown', 3, 68, 37);
  pointer(elsewhere, 'pointermove', 3, 74, 37);
  assert.equal(input.poll().lookX, 6);
});

test('lost native capture and pause discard old input without accepting a stale pointer', t => {
  const { input, canvas, joystick } = setup(t);
  const elsewhere = new PointerSurface();
  pointer(canvas, 'pointerdown', 10, 60, 40);
  pointer(canvas, 'pointermove', 10, 72, 46);
  assert.equal(canvas.hasPointerCapture(10), true);
  canvas.captures.delete(10);
  pointer(canvas, 'lostpointercapture', 10, 72, 46);
  assert.equal(input.poll().lookX, 0);
  pointer(elsewhere, 'pointermove', 10, 84, 51);
  assert.equal(input.poll().lookX, 0);

  pointer(canvas, 'pointerdown', 11, 62, 40);
  pointer(joystick, 'pointerdown', 12, 50, 18);
  input.setTouchEnabled(false);
  input.setTouchEnabled(true);
  pointer(elsewhere, 'pointermove', 11, 78, 50);
  pointer(elsewhere, 'pointermove', 12, 50, 15);
  const { lookX, forward } = input.poll();
  assert.deepEqual([lookX, forward], [0, 0]);
  assert.equal(canvas.hasPointerCapture(11), false);
  assert.equal(joystick.hasPointerCapture(12), false);
});

test('a second finger can pause while the joystick contact is still down', t => {
  const { input, joystick, pause } = setup(t);
  const commands = [];
  input.onCommand = (command) => {
    assert.ok(input.poll().forward > 0.5, 'the movement finger has not lifted');
    commands.push(command);
    input.setTouchEnabled(false);
  };
  pointer(joystick, 'pointerdown', 1, 50, 20);
  pointer(pause, 'pointerdown', 2, 30, 20);
  assert.deepEqual(commands, []);
  pointer(pause, 'pointerup', 2, 32, 21);
  pointer(joystick, 'pointerup', 1, 50, 20);
  assert.deepEqual(commands, ['menu']);
  assert.equal(input.poll().forward, 0);
});

test('canceled, outside and swiped pause contacts do not open the menu', t => {
  const { input, pause } = setup(t);
  const commands = [];
  input.onCommand = command => commands.push(command);
  pointer(pause, 'pointerdown', 1, 30, 20);
  pointer(pause, 'pointercancel', 1, 30, 20);
  pointer(pause, 'pointerdown', 2, 3, 20);
  pointer(pause, 'pointerup', 2, -1, 20);
  pointer(pause, 'pointerdown', 3, 30, 20);
  pointer(pause, 'pointermove', 3, 50, 20);
  pointer(pause, 'pointerup', 3, 30, 20);
  assert.deepEqual(commands, []);
  pointer(pause, 'pointerdown', 4, 30, 20);
  pointer(pause, 'pointerup', 4, 30, 20);
  assert.deepEqual(commands, ['menu']);
});

test('desktop mouse still requests pointer lock', t => {
  const { canvas } = setup(t, false);
  pointer(canvas, 'pointerdown', 1, 50, 20, 'mouse');
  assert.equal(canvas.lockRequests, 1);
});
