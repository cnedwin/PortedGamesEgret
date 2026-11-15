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
      const event = { type, preventDefault() {}, ...fields };
      for (const listener of listeners.get(type) ?? []) listener(event);
    },
  };
}

function setup(options = {}) {
  const browser = eventHub();
  const document = eventHub();
  const canvas = eventHub();
  const touch = eventHub();
  const buttons = new Map();
  touch.querySelector = (selector) => {
    if (selector === '.stick i') return touch.nub;
    return buttons.get(selector.split('"')[1]) ?? null;
  };
  touch.nub = { style: { transform: '' } };
  globalThis.addEventListener = browser.addEventListener;
  globalThis.document = document;
  globalThis.matchMedia = () => ({ matches: false });
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
  const input = createInput(canvas, touch, options);
  input.setEnabled(true);
  return { input, browser, document, canvas, touch, button };
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
