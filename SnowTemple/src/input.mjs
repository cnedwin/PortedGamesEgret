// Hands: keyboard and mouse, or a thumb-stick and buttons on glass. Whatever is used ends up as the
// same small record the rules read each tick.
import { quiet } from './rules/game.mjs';

export const DEEDS = ['attack', 'guard', 'stars', 'rain', 'dodge', 'glide', 'drink'];
export const DEFAULT_KEYS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', attack: 'Mouse0', guard: 'Mouse2', stars: 'KeyF', rain: 'KeyQ', dodge: 'Space', glide: 'ShiftLeft', drink: 'KeyE', bag: 'KeyB' };
const HELD = new Set(['up', 'down', 'left', 'right', 'guard', 'glide']);
const BUTTON_MASK = [1, 4, 2, 8, 16, 32];
const desktopPointer = ({ pointerType }) => pointerType === 'mouse' || pointerType === 'pen';

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
  // Tab is used to reach the settings and title buttons. Recover older
  // assignments without moving any other action to a different key.
  const configurable = Object.keys(DEFAULT_KEYS);
  const occupied = new Set(configurable.map(action => keys[action]));
  for (const action of configurable) {
    if (keys[action] !== 'Tab') continue;
    const preferred = DEFAULT_KEYS[action];
    const available = occupied.has(preferred) ? Object.values(DEFAULT_KEYS).find(code => !occupied.has(code)) : preferred;
    keys[action] = available;
    occupied.add(available);
  }
  const keyboard = new Set(),
    touch = new Set(),
    canvasPointers = new Map(),
    pressed = new Set(),
    pointer = { x: 0.5, y: 0.5, seen: false },
    stick = { x: 0, z: 0 },
    listeners = { bag: () => {}, any: () => {}, reset: () => {} };
  let asking = null, enabled = true;

  const actionOf = (code) => code === 'Tab' ? undefined : Object.keys(keys).find((action) => keys[action] === code);
  function held(action) {
    if (keyboard.has(action) || touch.has(action)) return true;
    for (const owner of canvasPointers.values()) {
      for (const buttonAction of owner.buttons.values()) if (buttonAction === action) return true;
    }
    return false;
  }
  function press(code, event, owner) {
    if (asking) {
      const { commit, cancel } = asking;
      asking = null;
      // Let Tab move focus naturally from the row after leaving the prompt.
      if (code === 'Tab') return void cancel?.(code);
      event?.preventDefault();
      if (code === 'Escape') cancel?.(code);
      else commit(code);
      return;
    }
    if (!enabled) return;
    const action = actionOf(code) ?? { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[code];
    if (!action) return;
    event?.preventDefault();
    if (!held(action)) pressed.add(action);
    if (owner) owner.buttons.set(event.button, action);
    else keyboard.add(action);
    if (action === 'bag') listeners.bag();
  }
  function release(code) {
    const action = actionOf(code) ?? { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[code];
    if (action) keyboard.delete(action);
  }
  addEventListener('keydown', (event) => {
    if (event.repeat) return void (actionOf(event.code) && event.preventDefault());
    listeners.any(event.code, event);
    press(event.code, event);
  });
  addEventListener('keyup', (event) => release(event.code));
  function reset() {
    keyboard.clear();
    touch.clear();
    canvasPointers.clear();
    pressed.clear();
    stick.x = stick.z = 0;
    pointer.seen = false;
    asking = null;
    listeners.reset();
  }
  addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  canvas.addEventListener('pointerdown', (event) => {
    if (!desktopPointer(event)) return;
    canvas.focus();
    pointer.seen = true;
    const owner = { type: event.pointerType, buttons: new Map() };
    canvasPointers.set(event.pointerId, owner);
    const code = 'Mouse' + event.button;
    listeners.any(code, event);
    press(code, event, owner);
  });
  // A chord only sends pointerup for the last button. Reconcile the actual
  // button mask even if the pointer now lies over a dialog or toolbar.
  function reconcilePointer(event, cancelled = false) {
    const owner = canvasPointers.get(event.pointerId);
    if (!owner || owner.type !== event.pointerType) return;
    for (const [button, action] of owner.buttons) {
      if (cancelled || !(event.buttons & BUTTON_MASK[button])) {
        owner.buttons.delete(button);
        if (cancelled && !held(action)) pressed.delete(action);
      }
    }
    if (cancelled || !event.buttons) canvasPointers.delete(event.pointerId);
    else return owner;
  }
  addEventListener('pointerup', (event) => reconcilePointer(event), true);
  addEventListener('pointercancel', (event) => reconcilePointer(event, true), true);
  addEventListener('pointermove', (event) => {
    if (!desktopPointer(event)) return;
    pointer.x = event.clientX / innerWidth;
    pointer.y = event.clientY / innerHeight;
    pointer.seen = true;
    const owner = reconcilePointer(event);
    if (owner && event.target === canvas && (event.buttons & BUTTON_MASK[event.button]) !== 0 && !owner.buttons.has(event.button)) {
      press('Mouse' + event.button, event, owner);
    }
  });

  return {
    keys,
    pointer,
    reset,
    setEnabled(on) {
      enabled = on;
      reset();
    },
    on: (name, call) => (listeners[name] = call),
    /** Capture the next key or clear the prompt when the row is redrawn. */
    ask: (commit, cancel) => (asking = commit ? { commit, cancel } : null),
    /** The stick and the buttons on glass feed the same state. */
    setStick(x, z) {
      if (!enabled) return;
      stick.x = x;
      stick.z = z;
    },
    hold(action, on) {
      if (!enabled) return;
      if (on) {
        if (!held(action)) pressed.add(action);
        touch.add(action);
      } else touch.delete(action);
    },
    /** What is asked for this tick. `aim` is the ground point under the mouse, if a mouse is in use. */
    sample(hero, aim) {
      const input = quiet();
      input.mx = (held('right') ? 1 : 0) - (held('left') ? 1 : 0) + stick.x;
      input.mz = (held('down') ? 1 : 0) - (held('up') ? 1 : 0) + stick.z;
      if (aim && pointer.seen) {
        input.ax = aim[0] - hero.x;
        input.az = aim[1] - hero.z;
      } else {
        input.ax = input.mx;
        input.az = input.mz;
      }
      for (const action of DEEDS) input[action] = HELD.has(action) ? held(action) : pressed.has(action);
      // The attack kept down gathers the heavy blow.
      input.charge = held('attack');
      pressed.clear();
      return input;
    }
  };
}

/** A control belongs to one pointer until it ends or the whole input is reset. */
export function createPointerOwner() {
  let id = null;
  return {
    claim(next) { if (id !== null) return false; id = next; return true; },
    owns(next) { return id !== null && id === next; },
    release(next) { if (id !== next || id === null) return false; id = null; return true; },
    reset() { id = null; }
  };
}
