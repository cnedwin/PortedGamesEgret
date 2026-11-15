import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { createInput } = await import('../src/input.mjs');

function eventHub() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      const existing = listeners.get(type) ?? [];
      existing.push(listener);
      listeners.set(type, existing);
    },
    dispatch(type, fields = {}) {
      const event = { type, isTrusted: true, preventDefault() {}, ...fields };
      for (const listener of listeners.get(type) ?? []) listener(event);
    },
  };
}

function setup(options = {}, coarse = false) {
  const browser = eventHub();
  const document = eventHub();
  const canvas = eventHub();
  const touch = eventHub();
  const area = eventHub();
  const lock = (element = canvas) => {
    document.pointerLockElement = element;
    document.dispatch('pointerlockchange');
  };
  document.exitPointerLock = () => lock(null);
  const buttons = new Map();
  touch.querySelector = (selector) => {
    if (selector === '.stick i') return touch.nub;
    return buttons.get(selector.split('"')[1]) ?? null;
  };
  touch.nub = { style: { transform: '' } };
  globalThis.addEventListener = browser.addEventListener;
  globalThis.document = document;
  globalThis.matchMedia = () => ({ matches: coarse });
  globalThis.innerWidth = 1000;
  const button = (name) => {
    if (!buttons.has(name)) {
      const element = {
        pressed: 'false',
        dataset: { t: name },
        closest: () => element,
        classList: { toggle() {} },
        setAttribute: (key, value) => { if (key === 'aria-pressed') element.pressed = value; },
      };
      buttons.set(name, element);
    }
    return buttons.get(name);
  };
  const input = createInput(canvas, touch, { ...options, gameArea: area });
  input.setEnabled(true);
  return { input, browser, document, canvas, touch, area, lock, button };
}

const finger = (identifier, clientX = 700, clientY = 300) => ({ identifier, clientX, clientY });

test('keyboard aliases stay held until the last physical key is released', () => {
  let opened = 0;
  const { input, browser } = setup({ onBag: () => opened++ });
  for (const code of ['KeyW', 'ArrowUp', 'KeyE', 'KeyF']) browser.dispatch('keydown', { code });
  for (const code of ['KeyW', 'KeyE']) browser.dispatch('keyup', { code });
  assert.equal(input.sample().moveZ, 1);
  assert.equal(input.sample().interact, true);
  for (const code of ['ArrowUp', 'KeyF']) browser.dispatch('keyup', { code });
  assert.equal(input.sample().moveZ, 0);
  assert.equal(input.sample().interact, false);
  browser.dispatch('keydown', { code: 'Tab' });
  browser.dispatch('keydown', { code: 'Tab', repeat: true });
  assert.equal(opened, 1);
});

test('short taps produce one simulation sample, while interaction must stay held', () => {
  const { input, browser, canvas } = setup();
  input.dragLook = true;
  for (const code of ['KeyQ', 'KeyG', 'KeyR', 'Space', 'KeyF']) {
    browser.dispatch('keydown', { code });
    browser.dispatch('keyup', { code });
  }
  canvas.dispatch('mousedown', { button: 0 });
  browser.dispatch('mouseup', { button: 0 });
  const first = { ...input.sample() };
  for (const key of ['heal', 'grenade', 'reload', 'jump', 'fire', 'firePressed']) assert.equal(first[key], true, key);
  assert.equal(first.interact, false);
  const second = input.sample();
  for (const key of ['heal', 'grenade', 'reload', 'jump', 'fire', 'firePressed']) assert.equal(second[key], false, key);
});

test('touchcancel discards only the canceled unsampled tap', () => {
  const { input, browser, touch, button } = setup();
  touch.dispatch('touchstart', { target: button('fire'), changedTouches: [finger(1)] });
  browser.dispatch('touchcancel', { changedTouches: [finger(1)] });
  touch.dispatch('touchstart', { target: button('reload'), changedTouches: [finger(1)] });
  browser.dispatch('touchend', { changedTouches: [finger(1)] });
  const pressed = { ...input.sample() };
  assert.equal(pressed.fire, false);
  assert.equal(pressed.firePressed, false);
  assert.equal(pressed.reload, true);
  assert.equal(input.sample().reload, false);
});

test('firing touches release independently and suppress only the joystick sprint', () => {
  const { input, browser, canvas, touch, button } = setup();
  canvas.dispatch('touchstart', { changedTouches: [finger(1, 200)] });
  browser.dispatch('touchmove', { changedTouches: [finger(1, 200, 233)] });
  assert.equal(input.sample().sprint, true);
  const target = button('fire');
  touch.dispatch('touchstart', { target, changedTouches: [finger(2), finger(3)] });
  assert.equal(input.sample().firePressed, true);
  assert.equal(input.sample().sprint, false);
  assert.equal(input.sample().fire, true);
  assert.equal(input.sample().firePressed, false);
  browser.dispatch('keydown', { code: 'ShiftLeft' });
  assert.equal(input.sample().sprint, true);
  browser.dispatch('keyup', { code: 'ShiftLeft' });
  browser.dispatch('touchend', { target, changedTouches: [finger(2)] });
  assert.equal(input.sample().fire, true);
  browser.dispatch('touchcancel', { target, changedTouches: [finger(3)] });
  assert.equal(input.sample().fire, false);
  assert.equal(input.sample().sprint, true);
});

test('aim moderates touch look, and blur and pause clear movement, holds and toggles', () => {
  const { input, browser, document, canvas, touch, button } = setup();
  canvas.dispatch('touchstart', { changedTouches: [finger(1, 200), finger(2, 700)] });
  browser.dispatch('touchmove', { changedTouches: [finger(2, 740)] });
  const normal = input.sample().lookYaw;
  touch.dispatch('touchstart', { target: button('aim'), changedTouches: [finger(3)] });
  browser.dispatch('touchmove', { changedTouches: [finger(2, 780)] });
  assert.ok(Math.abs(input.sample().lookYaw / normal - 0.62) < 1e-10);
  browser.dispatch('touchmove', { changedTouches: [finger(1, 200, 240), finger(2, 800)] });
  touch.dispatch('touchstart', { target: button('interact'), changedTouches: [finger(4)] });
  browser.dispatch('blur');
  const neutral = input.sample();
  assert.equal(neutral.moveZ, 0);
  assert.equal(Math.abs(neutral.lookYaw), 0);
  assert.equal(neutral.interact, false);
  assert.equal(neutral.aim, false);
  assert.equal(button('aim').pressed, 'false');
  touch.dispatch('touchstart', { target: button('crouch'), changedTouches: [finger(5)] });
  assert.equal(input.sample().crouch, true);
  input.setEnabled(false);
  input.setEnabled(true);
  assert.equal(input.sample().crouch, false);
  assert.equal(button('crouch').pressed, 'false');
  browser.dispatch('keydown', { code: 'KeyG' });
  document.hidden = true;
  document.dispatch('visibilitychange');
  assert.equal(input.sample().grenade, false);
});

test('direct weapon selection and swap queue only while accepting game input', () => {
  const { input, touch, button } = setup();
  input.selectWeapon('marksman');
  assert.equal(input.sample().weapon, 'marksman');
  assert.equal(input.sample().weapon, '');
  input.selectWeapon('invalid');
  assert.equal(input.sample().weapon, '');
  touch.dispatch('touchstart', { target: button('swap'), changedTouches: [finger(2)] });
  assert.equal(input.sample().weapon, 'swap');
  input.setEnabled(false);
  input.selectWeapon('pistol');
  assert.equal(input.sample().weapon, '');
});

test('captures raw mouse during the calling gesture and remembers typed unsupported fallback', async () => {
  const { input, canvas, lock } = setup();
  const calls = [];
  canvas.requestPointerLock = (...args) => {
    calls.push(args);
    if (args.length) return Promise.reject(new DOMException('Raw mouse unavailable', 'NotSupportedError'));
    lock();
    return Promise.resolve();
  };
  const entered = input.capture();
  assert.deepEqual(calls, [[{ unadjustedMovement: true }]]);
  assert.equal(input.capturePending, true);
  assert.equal(await entered, true);
  assert.equal(input.capturePending, false);
  input.release();
  assert.equal(await input.capture(), true);
  assert.deepEqual(calls, [[{ unadjustedMovement: true }], [], []]);
});

test('security denial never opts into drag or retries normal pointer lock', async () => {
  const { input, canvas, browser } = setup();
  let requests = 0;
  canvas.requestPointerLock = () => {
    requests++;
    return Promise.reject(new DOMException('Denied', 'NotAllowedError'));
  };
  assert.equal(await input.capture(), false);
  assert.equal(requests, 1);
  canvas.dispatch('mousedown', { button: 0 });
  browser.dispatch('mousemove', { movementX: 100, movementY: 0 });
  let sampled = input.sample();
  assert.equal(sampled.fire, false);
  assert.equal(Math.abs(sampled.lookYaw), 0);
  assert.equal(requests, 1);
  input.dragLook = true;
  canvas.dispatch('mousedown', { button: 2 });
  input.adsSensitivity = 0.8;
  browser.dispatch('mousemove', { movementX: 100, movementY: 0 });
  sampled = input.sample();
  assert.equal(sampled.aim, true);
  assert.ok(Math.abs(sampled.lookYaw + 0.176) < 1e-10);
  assert.equal(requests, 1);
});

test('legacy void pointer lock waits for change or error and cancels a late lock', async () => {
  const { input, canvas, document, lock } = setup();
  canvas.requestPointerLock = () => {};
  const first = input.capture();
  assert.equal(input.capturePending, true);
  document.dispatch('pointerlockerror');
  assert.equal(await first, false);

  const second = input.capture();
  lock();
  assert.equal(await second, true);
  input.release();

  const canceled = input.capture();
  input.release();
  assert.equal(await canceled, false);
  lock();
  assert.equal(input.locked, false);
  assert.equal(input.capturePending, false);
});

test('legacy silence expires and a lock delivered after the deadline is released', async (t) => {
  const { input, canvas, lock } = setup();
  let expire;
  t.mock.method(globalThis, 'setTimeout', (callback, delay) => {
    assert.ok(delay > 0 && delay <= 2500);
    expire = callback;
    return 1;
  });
  t.mock.method(globalThis, 'clearTimeout', () => {});
  canvas.requestPointerLock = () => {};
  const request = input.capture();
  assert.equal(input.capturePending, true);
  expire();
  assert.equal(await request, false);
  assert.equal(input.capturePending, false);
  lock();
  assert.equal(input.locked, false);
});

test('capture does not report a lock lost before the caller can use it', async () => {
  const { input, canvas, lock } = setup();
  canvas.requestPointerLock = () => {};
  const request = input.capture();
  lock();
  lock(null);
  assert.equal(await request, false);
});

test('only live mouse unlock and desktop blur pause, and trusted contacts can switch back to mouse', async () => {
  const transitions = [];
  const { input, area, canvas, browser, lock } = setup({
    onPause: reason => transitions.push(reason),
    onTouch: () => transitions.push('touch'),
    onMouse: () => transitions.push('mouse'),
  }, true);
  canvas.requestPointerLock = () => { lock(); return Promise.resolve(); };
  area.dispatch('pointerdown', { pointerType: 'mouse', isTrusted: false });
  assert.equal(input.touchMode, true);
  area.dispatch('pointerdown', { pointerType: 'mouse' });
  assert.equal(input.touchMode, false);
  assert.equal(await input.capture(), true);
  area.dispatch('pointerdown', { pointerType: 'touch' });
  assert.equal(input.touchMode, true);
  assert.equal(input.locked, false);
  assert.deepEqual(transitions, ['mouse', 'touch']);
  area.dispatch('pointerdown', { pointerType: 'mouse' });
  assert.equal(await input.capture(), true);
  lock(null);
  assert.deepEqual(transitions, ['mouse', 'touch', 'mouse', 'released']);

  assert.equal(await input.capture(), true);
  browser.dispatch('blur');
  assert.equal(input.locked, false);
  assert.deepEqual(transitions, ['mouse', 'touch', 'mouse', 'released', 'released']);
});
