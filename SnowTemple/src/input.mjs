// Hands: keyboard and mouse, or a thumb-stick and buttons on glass. Whatever is used ends up as the
// same small record the rules read each tick.
import { quiet } from './rules/game.mjs';

export const DEEDS = ['attack', 'guard', 'stars', 'rain', 'dodge', 'glide', 'drink'];
export const DEFAULT_KEYS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', attack: 'Mouse0', guard: 'Mouse2', stars: 'KeyF', rain: 'KeyQ', dodge: 'Space', glide: 'ShiftLeft', drink: 'KeyE', bag: 'KeyB' };
const HELD = new Set(['up', 'down', 'left', 'right', 'guard', 'glide']);

/** How a key is written on screen. */
export function keyName(code) {
  const names = { Mouse0: '左键', Mouse1: '中键', Mouse2: '右键', Space: '空格', ShiftLeft: 'Shift', ShiftRight: '右Shift', Enter: '回车', ControlLeft: 'Ctrl', AltLeft: 'Alt', Tab: 'Tab', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
  if (names[code]) return names[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return '小键盘' + code.slice(6);
  return code;
}

export function createInput(canvas, keys) {
  const down = new Set(),
    pressed = new Set(),
    pointer = { x: 0.5, y: 0.5, seen: false },
    stick = { x: 0, z: 0 },
    listeners = { bag: () => {}, any: () => {} };
  let asking = null;

  const actionOf = (code) => Object.keys(keys).find((action) => keys[action] === code);
  function press(code, event) {
    if (asking) {
      // The next key or button pressed becomes the binding being asked for.
      event?.preventDefault();
      if (code !== 'Escape') asking(code);
      asking = null;
      return;
    }
    const action = actionOf(code) ?? { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[code];
    if (!action) return;
    event?.preventDefault();
    if (!down.has(action)) pressed.add(action);
    down.add(action);
    if (action === 'bag') listeners.bag();
  }
  function release(code) {
    const action = actionOf(code) ?? { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[code];
    if (action) down.delete(action);
  }
  addEventListener('keydown', (event) => {
    if (event.repeat) return void (actionOf(event.code) && event.preventDefault());
    listeners.any(event.code);
    press(event.code, event);
  });
  addEventListener('keyup', (event) => release(event.code));
  addEventListener('blur', () => down.clear());
  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    canvas.focus();
    pointer.seen = true;
    listeners.any('Mouse' + event.button);
    press('Mouse' + event.button, event);
  });
  addEventListener('pointerup', (event) => event.pointerType !== 'touch' && release('Mouse' + event.button));
  addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    pointer.x = event.clientX / innerWidth;
    pointer.y = event.clientY / innerHeight;
    pointer.seen = true;
  });

  return {
    keys,
    pointer,
    on: (name, call) => (listeners[name] = call),
    /** Ask for the next key pressed, for rebinding. */
    ask: (call) => (asking = call),
    /** The stick and the buttons on glass feed the same state. */
    setStick(x, z) {
      stick.x = x;
      stick.z = z;
    },
    hold(action, on) {
      if (on) {
        if (!down.has(action)) pressed.add(action);
        down.add(action);
      } else down.delete(action);
    },
    /** What is asked for this tick. `aim` is the ground point under the mouse, if a mouse is in use. */
    sample(hero, aim) {
      const input = quiet();
      input.mx = (down.has('right') ? 1 : 0) - (down.has('left') ? 1 : 0) + stick.x;
      input.mz = (down.has('down') ? 1 : 0) - (down.has('up') ? 1 : 0) + stick.z;
      if (aim && pointer.seen) {
        input.ax = aim[0] - hero.x;
        input.az = aim[1] - hero.z;
      } else {
        input.ax = input.mx;
        input.az = input.mz;
      }
      for (const action of DEEDS) input[action] = HELD.has(action) ? down.has(action) : pressed.has(action);
      pressed.clear();
      return input;
    }
  };
}
