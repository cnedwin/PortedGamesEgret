import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { enginePackages, makeGameImports } from '../src/browser-imports.mjs';
import { attachGamepadInput } from '../web/gamepad-input.mjs';

const vendor = new URL('../vendor/', import.meta.url);
const manifests = await Promise.all(enginePackages.map(async folder => [
  folder, JSON.parse(await readFile(new URL(`${folder}/package.json`, vendor), 'utf8')),
]));
const imports = makeGameImports(manifests, (folder, target) => new URL(`${folder}/${target}`, vendor).href, name => name);
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(Object.hasOwn(imports, specifier) ? imports[specifier] : specifier, context);
  },
});
const { createBrowserGamepadInput } = await import('@egret/engine/web/gamepad');
hook.deregister();

function releasedButtons() {
  return Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
}

function setup(t, mode = 'map', options = {}) {
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible', hasFocus: () => true });
  const canvas = Object.assign(new EventTarget(), { ownerDocument: document });
  document.activeElement = canvas;
  const pad = { index: 1, id: 'controller', mapping: 'standard', connected: true, axes: [0, 0], buttons: releasedButtons() };
  const window = Object.assign(new EventTarget(), { navigator: { getGamepads: () => [null, pad] } });
  const frames = new Map();
  let nextFrame = 0;
  window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  window.cancelAnimationFrame = id => frames.delete(id);
  document.defaultView = window;
  for (const [name, value] of Object.entries({ navigator: window.navigator, document, window })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, name, original);
      else delete globalThis[name];
    });
  }
  const events = [];
  let focusedId = 'map';
  const keyboard = {
    keyDown: ({ code }) => events.push(['down', code]),
    keyUp: ({ code }) => events.push(['up', code]),
    cancel: reason => { focusedId = undefined; events.push(['cancel', reason]); },
    focus: id => { focusedId = id; events.push(['focus', id]); },
    getSnapshot: () => ({ state: 'active', focusedId }),
  };
  const native = { polls: 0, disposals: 0 };
  const detach = attachGamepadInput(canvas, {
    keyboard,
    getMode: () => mode,
    createInput() {
      const controller = createBrowserGamepadInput();
      return {
        input: controller.input,
        poll(timestamp) { native.polls++; controller.poll(timestamp); },
        dispose() { native.disposals++; controller.dispose(); },
      };
    },
    ...options,
  });
  t.after(detach);
  return {
    canvas, document, window, pad, events, detach, frames, native,
    setMode: value => { mode = value; },
    button: (index, pressed) => { pad.buttons[index] = { pressed, value: Number(pressed) }; },
    clearButtons: () => { pad.buttons = releasedButtons(); },
    poll() {
      const [id, callback] = frames.entries().next().value;
      frames.delete(id);
      callback();
    },
  };
}

test('standard pad polls the engine source and sends dominant map direction and confirmation through Egret', t => {
  const pad = setup(t);
  pad.canvas.addEventListener('keydown', () => assert.fail('Gamepad should stay in the Egret input API.'));
  pad.pad.axes = [0.7, -0.5];
  pad.poll();
  pad.poll();
  pad.pad.axes = [0.2, -0.2];
  pad.button(0, true);
  pad.poll();
  pad.button(0, false);
  pad.poll();
  assert.deepEqual(pad.events, [['down', 'ArrowRight'], ['up', 'ArrowRight'], ['down', 'Enter'], ['up', 'Enter']]);
  pad.detach();
  assert.equal(pad.frames.size, 0);
  assert.deepEqual(pad.native, { polls: 4, disposals: 1 });
});

test('battle maps cursor movement and turn actions, and a held bag button cannot cancel its own menu', t => {
  const pad = setup(t, 'battle', { mapping: { battle: { 5: null, 6: 'KeyI' } } });
  pad.pad.axes = [-0.9, 0.7];
  pad.button(0, true);
  pad.button(2, true);
  pad.button(4, true);
  pad.button(5, true);
  pad.button(6, true);
  pad.button(8, true);
  pad.poll();
  assert.deepEqual(pad.events, [
    ['down', 'KeyA'], ['down', 'KeyS'], ['down', 'Enter'], ['down', 'KeyL'],
    ['down', 'KeyM'], ['down', 'KeyI'], ['down', 'Tab'],
  ]);
  pad.button(6, false);
  pad.poll();
  assert.deepEqual(pad.events.at(-1), ['up', 'KeyI']);
  pad.pad.axes = [0, 0];
  pad.clearButtons();
  pad.button(1, true);
  pad.poll();
  assert.deepEqual(pad.events.at(-1), ['down', 'KeyB']);
  pad.setMode('menu');
  pad.poll();
  pad.poll();
  assert.deepEqual(pad.events.slice(-2), [['cancel', 'rebind'], ['focus', 'map']]);
  pad.button(1, false);
  pad.poll();
  pad.button(0, true);
  pad.poll();
  pad.button(0, false);
  pad.poll();
  assert.deepEqual(pad.events.slice(-2), [['down', 'Enter'], ['up', 'Enter']]);
  pad.detach();
});

test('a disconnected or blurred controller cancels held controls without a confirm key-up', t => {
  const pad = setup(t, 'team');
  pad.button(9, true);
  pad.poll();
  pad.pad.connected = false;
  pad.window.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: pad.pad }));
  assert.deepEqual(pad.events, [['down', 'KeyO'], ['cancel', 'removed'], ['focus', 'map']]);
  pad.pad.connected = true;
  pad.poll();
  assert.equal(pad.events.length, 3);
  pad.button(9, false);
  pad.poll();
  pad.button(0, true);
  pad.poll();
  pad.document.activeElement = undefined;
  pad.canvas.dispatchEvent(new Event('blur'));
  pad.document.activeElement = pad.canvas;
  pad.poll();
  assert.deepEqual(pad.events.slice(-3), [['down', 'Enter'], ['cancel', 'blur'], ['focus', 'map']]);
  pad.detach();
});

test('an unavailable Gamepad API stops polling cleanly', t => {
  const pad = setup(t);
  pad.window.navigator.getGamepads = () => { throw new DOMException('Denied', 'SecurityError'); };
  pad.poll();
  assert.deepEqual(pad.events, []);
  assert.equal(pad.frames.size, 0);
  assert.deepEqual(pad.native, { polls: 1, disposals: 1 });
});
