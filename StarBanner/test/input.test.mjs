import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { createInput } = await import('../src/input.mjs');

function listeners() {
  const handlers = new Map();
  return {
    addEventListener(type, handle) {
      const list = handlers.get(type) ?? [];
      list.push(handle);
      handlers.set(type, list);
    },
    send(type, values = {}) {
      const event = {
        type, target: this, pointerId: 1, pointerType: 'mouse', clientX: 35, clientY: 40, button: 0, buttons: 0,
        preventDefault() { this.defaultPrevented = true; }, ...values
      };
      for (const handler of handlers.get(type) ?? []) handler(event);
      return event;
    }
  };
}

function inputFixture(run) {
  const windowEvents = listeners(), frame = listeners(), canvas = listeners(), control = {};
  frame.contains = (target) => [canvas, control].includes(target);
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0 });
  canvas.focus = () => {};
  canvas.clientHeight = 80;
  canvas.classList = { add() {}, remove() {} };
  let boardEnabled = true;
  const previous = { addEventListener: globalThis.addEventListener, document: globalThis.document };
  const calls = [];
  globalThis.addEventListener = windowEvents.addEventListener;
  globalThis.document = { elementFromPoint: (x) => x < 80 ? canvas : control };
  try {
    createInput(canvas, {
      frame, canNavigate: () => boardEnabled,
      on: (action) => calls.push(action),
      tap: (...args) => calls.push(['tap', ...args]),
      point: () => {},
      pan: (...args) => calls.push(['pan', ...args]),
      zoom: (...args) => calls.push(['zoom', ...args])
    });
    run({ windowEvents, frame, canvas, control, calls, setBoardEnabled: (on) => { boardEnabled = on; } });
  } finally {
    globalThis.addEventListener = previous.addEventListener;
    globalThis.document = previous.document;
  }
}

test('the frame suppresses native context menus and a right click cancels once', () => {
  inputFixture(({ frame, windowEvents, canvas, control, calls }) => {
    assert.equal(frame.send('contextmenu', { target: control }).defaultPrevented, true);
    assert.deepEqual(calls, []);
    frame.send('pointerdown', { target: control, button: 2 });
    windowEvents.send('pointerup', { target: control, button: 2 });
    windowEvents.send('pointerup', { target: control, button: 2 });
    frame.send('pointerdown', { target: canvas, button: 2 });
    canvas.send('pointerdown', { button: 2 });
    canvas.send('pointermove', { buttons: 2, clientX: 58 });
    windowEvents.send('pointerup', { target: canvas, button: 2, clientX: 58 });
    frame.send('pointerdown', { target: canvas, button: 2 });
    windowEvents.send('pointerup', { target: {}, button: 2 });
    assert.deepEqual(calls, ['cancel']);
  });
});

test('mouse picks, camera drags and off-board releases stay separate', () => {
  inputFixture(({ canvas, calls }) => {
    for (const button of [1, 4]) {
      canvas.send('pointerdown', { button });
      canvas.send('pointerup', { button });
    }
    canvas.send('pointerdown', { button: 1 });
    canvas.send('pointermove', { clientX: 63, buttons: 4 });
    canvas.send('pointerup', { clientX: 63, button: 1 });
    canvas.send('pointerdown', { clientX: 78 });
    canvas.send('pointerup', { clientX: 81 });
    canvas.send('pointerdown');
    canvas.send('pointerup', { button: 2 });
    canvas.send('pointerdown');
    canvas.send('lostpointercapture');
    canvas.send('pointerup');
    canvas.send('pointerdown');
    canvas.send('pointerup');
    canvas.send('pointerdown', { pointerType: 'touch' });
    canvas.send('pointerup', { pointerType: 'touch' });
    assert.deepEqual(calls, [['pan', 28, 0], ['tap', 35, 40, { device: 'mouse' }], ['tap', 35, 40, { device: 'touch' }]]);
  });
});

test('only a vertical board wheel event zooms, anchored at the pointer', () => {
  inputFixture(({ canvas, calls, setBoardEnabled }) => {
    assert.equal(canvas.send('wheel', { deltaX: 25, deltaY: 0 }).defaultPrevented, undefined);
    assert.equal(canvas.send('wheel', { deltaY: -4, deltaMode: 1 }).defaultPrevented, true);
    setBoardEnabled(false);
    assert.equal(canvas.send('wheel', { deltaY: 35 }).defaultPrevented, undefined);
    canvas.send('pointerdown');
    canvas.send('pointerup');
    assert.deepEqual(calls, [['zoom', Math.exp(64 * 0.0012), [35, 40]]]);
  });
});
