import { createGamepadInput } from '@egret/engine/input/gamepad';

// The native UI owns each touch contact. Only held driving intentions are
// merged here; physics, steering easing, auto-throttle and button indices are unchanged.
const KEYS = {
  throttle: ['KeyW', 'ArrowUp'], brake: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  drift: ['Space', 'ShiftRight'], item: ['KeyE', 'KeyX', 'ShiftLeft'], lookBack: ['KeyC'],
};
const COMMANDS = {
  Escape: 'menu', KeyP: 'menu', Enter: 'confirm', NumpadEnter: 'confirm', KeyM: 'mute',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', ArrowDown: 'down', Backspace: 'back',
};
const PAD_COMMANDS = { 9: 'menu', 0: 'confirm', 1: 'back', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
const DRIVE_TOUCH = new Set(['left', 'right', 'drift', 'item', 'brake']);

export function createInput({ browser = globalThis, page = globalThis.document, devices = globalThis.navigator } = {}) {
  const down = new Set(), touches = new Set();
  const input = { onCommand: undefined, onClearTouch: undefined, touch: false };
  let rumblePad, touchEnabled = false, keySteer = 0, stamp = 0;
  const controls = { throttle: 0, brake: 0, steer: 0, drift: false, item: false, lookBack: false };
  const held = name => KEYS[name].some(code => down.has(code));
  const touchHeld = name => touches.has(name);

  // The engine supplies standard button edge detection for menus; raw analog values
  // below preserve the original driving curve and trigger behavior.
  const gamepad = createGamepadInput({
    onButton(event) {
      const command = PAD_COMMANDS[event.index];
      if (event.pressed && command) input.onCommand?.(command, { source: 'gamepad', event });
    },
  });
  input.gamepad = gamepad;
  input.rumble = (strength, seconds) => {
    rumblePad?.vibrationActuator
      ?.playEffect?.('dual-rumble', { duration: seconds * 1000, strongMagnitude: strength, weakMagnitude: strength * 0.6 })
      ?.catch?.(() => {});
  };
  input.setTouchControl = (name, pressed) => {
    if (!DRIVE_TOUCH.has(name)) return;
    if (pressed && touchEnabled) {
      input.touch = true;
      touches.add(name);
    } else touches.delete(name);
  };
  function clearTouch() {
    const steering = touchHeld('left') || touchHeld('right');
    touches.clear();
    if (steering && !held('left') && !held('right')) keySteer = 0;
    input.onClearTouch?.();
  }
  input.setTouchEnabled = enabled => {
    const was = touchEnabled;
    touchEnabled = Boolean(enabled);
    if (was && !touchEnabled) clearTouch();
  };
  input.clearTouch = clearTouch;
  const keyDown = event => {
    if (event.target?.tagName === 'INPUT') return;
    if (event.repeat) return;
    down.add(event.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      // The native keyboard may already have consumed the command.
      // Keep its defaultPrevented state available to the menu dispatcher.
      const taken = event.defaultPrevented;
      event.preventDefault();
      const command = COMMANDS[event.code];
      if (command) input.onCommand?.(command, { source: 'keyboard', event, taken });
    } else {
      const command = COMMANDS[event.code];
      if (command) input.onCommand?.(command, { source: 'keyboard', event, taken: event.defaultPrevented });
    }
  };
  const keyUp = event => down.delete(event.code);
  const clear = () => {
    down.clear();
    clearTouch();
    gamepad.release();
  };
  const visibility = () => { if (page?.hidden) clear(); };
  browser.addEventListener('keydown', keyDown);
  browser.addEventListener('keyup', keyUp);
  browser.addEventListener('blur', clear);
  page?.addEventListener('visibilitychange', visibility);
  input.dispose = () => {
    clear();
    browser.removeEventListener('keydown', keyDown);
    browser.removeEventListener('keyup', keyUp);
    browser.removeEventListener('blur', clear);
    page?.removeEventListener('visibilitychange', visibility);
    gamepad.dispose();
  };

  input.poll = dt => {
    const wanted = (held('right') || touchHeld('right') ? 1 : 0) - (held('left') || touchHeld('left') ? 1 : 0);
    keySteer += Math.max(-dt * 7, Math.min(dt * 7, wanted - keySteer));
    if (wanted === 0 && Math.abs(keySteer) < 0.05) keySteer = 0;
    controls.steer = keySteer;
    const touchBrake = touchHeld('brake');
    controls.throttle = held('throttle') || (input.touch && !touchBrake) ? 1 : 0;
    controls.brake = held('brake') || touchBrake ? 1 : 0;
    controls.drift = held('drift') || touchHeld('drift');
    controls.item = held('item') || touchHeld('item');
    controls.lookBack = held('lookBack');

    const pad = [...(devices?.getGamepads?.() ?? [])].find(candidate => candidate?.connected);
    if (pad) {
      const button = index => pad.buttons[index]?.value ?? 0,
        stick = Math.abs(pad.axes[0]) > 0.15 ? pad.axes[0] : 0;
      if (stick) controls.steer = stick;
      controls.throttle = Math.max(controls.throttle, button(0), button(7));
      controls.brake = Math.max(controls.brake, button(1), button(6));
      controls.drift ||= button(5) > 0.5 || button(2) > 0.5;
      controls.item ||= button(4) > 0.5 || button(3) > 0.5;
      controls.lookBack ||= button(10) > 0.5 || button(11) > 0.5;
    }
    stamp += Math.max(dt, 0) * 1000;
    gamepad.sample(pad ? [{
      index: pad.index ?? 0, id: pad.id ?? '', mapping: pad.mapping ?? 'standard',
      buttons: Array.from(pad.buttons, button => ({ value: button.value, pressed: button.value > 0.5 })),
      axes: Array.from(pad.axes),
    }] : [], stamp);
    rumblePad = pad;
    return controls;
  };
  input.heldTouches = () => [...touches];
  return input;
}
