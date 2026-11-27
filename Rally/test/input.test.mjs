import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const { createEngine, DisplayObjectContainer } = await import('@egret/engine');
const { createPointerInput } = await import('@egret/engine/input');
const { createInput } = await import('../src/input.mjs');
const { bindRaceAction } = await import('../src/ui/race-touch.mjs');

async function setup(t, enabled = true) {
  const browser = new EventTarget(), page = new EventTarget(), devices = { getGamepads: () => [] };
  const input = createInput({ browser, page, devices });
  const engine = await createEngine({ host: {
    surface: {}, start() {}, stop() {}, async close() {}, setTimeout() { return () => {}; },
  } });
  const scope = engine.createScope();
  const pointer = createPointerInput({ engine, scope, width: 360, height: 100, capacity: 8 });
  const buttons = {}, targets = {}, locations = {}, commands = [];
  const host = { pointer, scope, metrics: () => ({ scale: 1 }) };
  for (const [index, name] of ['left', 'right', 'drift', 'brake', 'item', 'pause'].entries()) {
    const target = scope.use(new DisplayObjectContainer());
    target.x = index * 60;
    target.hitArea = { x: 0, y: 0, width: 48, height: 48 };
    engine.stage.addChild(target);
    targets[name] = target;
    locations[name] = target.x + 24;
    buttons[name] = bindRaceAction(host, target, {
      name, pause: name === 'pause', onHeld: input.setTouchControl,
      onActivate: () => { if (name === 'pause') { commands.push('pause'); input.onCommand?.('pause'); } },
    });
  }
  const setEnabled = on => {
    input.setTouchEnabled(on);
    Object.values(buttons).forEach(button => button.setAvailable(on));
  };
  input.onClearTouch = () => Object.values(buttons).forEach(button => button.release());
  setEnabled(enabled);
  let time = 0;
  const begin = (name, id, x = locations[name], y = 24) => pointer.begin({
    pointerId: id, pointerType: 'touch', globalX: x, globalY: y, buttons: 1, timestamp: ++time * 10,
  });
  const move = (contact, x = 358, y = 80) => pointer.move(contact, { globalX: x, globalY: y, buttons: 1, timestamp: ++time * 10 });
  const end = (contact, x = 358, y = 80) => pointer.end(contact, { globalX: x, globalY: y, buttons: 1, timestamp: ++time * 10 });
  const cancel = (contact, reason = 'lostcapture') => pointer.cancel(contact, reason);
  const key = (type, code) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, 'code', { value: code });
    browser.dispatchEvent(event);
  };
  t.after(async () => { input.dispose(); pointer.dispose(); await engine.dispose(); });
  return { input, buttons, targets, setEnabled, browser, page, devices, begin, move, end, cancel, locations, commands, key };
}

test('native Drift stays with its owner outside the control while Left holds separately', async t => {
  const { input, buttons, begin, move, end } = await setup(t);
  const first = begin('left', 1), second = begin('drift', 2);
  assert.equal(input.poll(0.2).steer, -1);
  assert.equal(input.poll(0.2).drift, true);
  move(second);
  assert.equal(buttons.drift.held, true);
  end(second);
  assert.equal(buttons.drift.held, false);
  assert.equal(input.poll(0.2).drift, false);
  assert.equal(input.poll(0.2).steer, -1);
  end(first);
});

test('outside release and cancellation end independent controls and restore auto-throttle', async t => {
  const { input, buttons, begin, move, end, cancel } = await setup(t);
  const left = begin('left', 1), brake = begin('brake', 2);
  move(left); move(brake);
  assert.equal(input.poll(.2).throttle, 0);
  end(left);
  assert.equal(input.poll(.2).steer, 0);
  assert.equal(input.poll(.2).brake, 1);
  cancel(brake);
  assert.equal(input.poll(.2).brake, 0);
  assert.equal(input.poll(.2).throttle, 1);
  assert.equal(buttons.brake.held, false);
});

test('each native button admits one owner and refuses a second contact', async t => {
  const { input, buttons, begin, end, cancel } = await setup(t);
  const a = begin('drift', 4), b = begin('drift', 5);
  end(b);
  assert.equal(buttons.drift.held, true);
  cancel(a);
  assert.equal(input.poll(.2).drift, false);
});

test('lost native capture releases only its owner', async t => {
  const { input, begin, cancel } = await setup(t);
  const a = begin('drift', 1), b = begin('item', 2);
  cancel(a);
  assert.equal(input.poll(.2).drift, false);
  assert.equal(input.poll(.2).item, true);
  cancel(b);
  assert.equal(input.poll(.2).item, false);
});

test('disabled controls and pause/resume reject old contacts without dropping auto-throttle', async t => {
  const { input, buttons, begin, move, end, setEnabled } = await setup(t, false);
  begin('right', 1);
  assert.equal(input.touch, false);
  setEnabled(true);
  const right = begin('right', 2), brake = begin('brake', 3);
  assert.equal(input.poll(.2).steer, 1);
  assert.equal(input.poll(.2).throttle, 0);
  setEnabled(false);
  assert.equal(buttons.right.held, false);
  assert.equal(buttons.brake.held, false);
  setEnabled(true);
  move(right); end(brake);
  assert.deepEqual([input.poll(.2).steer, input.poll(.2).brake, input.poll(.2).throttle], [0, 0, 1]);
});

test('blur and backgrounding clear native held visuals and driving', async t => {
  const { input, buttons, begin, browser, page } = await setup(t);
  begin('drift', 1);
  browser.dispatchEvent(new Event('blur'));
  assert.equal(input.poll(.2).drift, false);
  assert.equal(buttons.drift.held, false);
  begin('brake', 2);
  page.hidden = true;
  page.dispatchEvent(new Event('visibilitychange'));
  assert.equal(buttons.brake.held, false);
  assert.equal(input.poll(.2).brake, 0);
});

test('second-finger pause activates on deliberate release while steering remains held', async t => {
  const { input, begin, end, locations, commands } = await setup(t);
  begin('left', 1);
  const pause = begin('pause', 2);
  input.onCommand = () => assert.equal(input.poll(.2).steer, -1);
  assert.deepEqual(commands, []);
  end(pause, locations.pause + 2, 25);
  assert.deepEqual(commands, ['pause']);
});

test('native pause rejects canceled, outside and swiped contacts', async t => {
  const { begin, end, move, cancel, locations, commands } = await setup(t);
  cancel(begin('pause', 1));
  end(begin('pause', 2, 301), 299, 24);
  const swipe = begin('pause', 3);
  move(swipe, locations.pause - 20, 24); end(swipe, locations.pause, 24);
  assert.deepEqual(commands, []);
  end(begin('pause', 4), locations.pause, 24);
  assert.deepEqual(commands, ['pause']);
});

test('keyboard and gamepad retain their driving curves while touch is disabled', async t => {
  const { input, key, devices } = await setup(t, false);
  key('keydown', 'KeyW'); key('keydown', 'ArrowLeft');
  assert.equal(input.poll(.2).throttle, 1);
  assert.equal(input.poll(.2).steer, -1);
  key('keyup', 'KeyW'); key('keyup', 'ArrowLeft');
  devices.getGamepads = () => [{ connected: true, axes: [.65], buttons: [{ value: 1 }] }];
  assert.equal(input.poll(.2).throttle, 1);
  assert.equal(input.poll(.2).steer, .65);
});

test('native gamepad button edges include vertical menu moves without repeating a held button', async t => {
  const { input, devices } = await setup(t, false);
  const commands = [];
  input.onCommand = (command, detail) => commands.push([command, detail.source]);
  const buttons = Array.from({ length: 16 }, () => ({ value: 0 }));
  devices.getGamepads = () => [{ connected: true, axes: [0], buttons }];
  buttons[12].value = 1;
  input.poll(.2); input.poll(.2);
  buttons[12].value = 0; buttons[13].value = 1;
  input.poll(.2);
  assert.deepEqual(commands, [['up', 'gamepad'], ['down', 'gamepad']]);
});
