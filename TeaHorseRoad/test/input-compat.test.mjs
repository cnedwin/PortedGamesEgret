import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { createDriveInput } = await import('../src/play/input.mjs');

function browserWithNavigator(navigator = {}) {
  const eventTarget = new EventTarget();
  const keys = {
    navigator: { value: navigator, configurable: true },
    addEventListener: { value: eventTarget.addEventListener.bind(eventTarget), configurable: true },
    removeEventListener: { value: eventTarget.removeEventListener.bind(eventTarget), configurable: true },
  };
  const previous = Object.fromEntries(Object.keys(keys).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperties(globalThis, keys);
  return () => {
    for (const key of Object.keys(keys)) {
      if (previous[key]) Object.defineProperty(globalThis, key, previous[key]);
      else delete globalThis[key];
    }
  };
}

test('touch and keyboard driving work without the optional Gamepad API', () => {
  const restore = browserWithNavigator();
  let input;
  try {
    input = createDriveInput();
    Object.assign(input.touch, { steer: 0.4, throttle: 0.75, brake: 0.2 });
    let state = input.poll(1 / 60, 10);
    assert.equal(state.steer, 0.4);
    assert.equal(state.throttle, 0.75);
    assert.equal(state.brake, 0.2);
    assert.equal(state.usingPad, false);
    input.actions.press('Key:KeyH');
    assert.equal(input.pressed('horn'), true);
    input.endFrame();
    assert.equal(input.pressed('horn'), false);
    assert.doesNotThrow(() => input.rumble());
    assert.doesNotThrow(() => input.dispose());
    input = undefined;
  } finally {
    input?.dispose();
    restore();
  }
});

test('a browser with a Gamepad API still polls native pads', () => {
  let reads = 0;
  const restore = browserWithNavigator({ getGamepads() { ++reads; return []; } });
  let input;
  try {
    input = createDriveInput();
    assert.ok(input.pads);
    assert.equal(input.poll(1 / 60, 20).usingPad, false);
    assert.ok(reads > 0);
  } finally {
    input?.dispose();
    restore();
  }
});
