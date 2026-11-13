// Keyboard, gamepad and touch, merged into one set of driving controls.
// One-off presses (pause, confirm, back, sideways in menus, mute) are passed
// to `onCommand`.

const KEYS = {
  throttle: ['KeyW', 'ArrowUp'],
  brake: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  drift: ['Space', 'ShiftRight'],
  item: ['KeyE', 'KeyX', 'ShiftLeft'],
  lookBack: ['KeyC'],
};
const COMMANDS = {
  Escape: 'menu',
  KeyP: 'menu',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  KeyM: 'mute',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Backspace: 'back',
};
/** Standard gamepad buttons to commands. */
const PAD_COMMANDS = { 9: 'menu', 0: 'confirm', 1: 'back', 14: 'left', 15: 'right' };

/**
 * Listen for input. `touchRoot` holds the on-screen buttons (elements with a
 * `data-touch` of left, right, drift, item or brake). `poll()` returns the
 * current controls; steering is -1 (left) to 1 (right).
 */
export function createInput(touchRoot) {
  const down = new Set(),
    touch = new Set(),
    padHeld = new Set();
  const input = { onCommand: undefined, touch: false };
  let rumblePad;
  /** Shake the gamepad, where it can: `strength` 0 to 1 for `seconds`. */
  input.rumble = (strength, seconds) => {
    rumblePad?.vibrationActuator
      ?.playEffect?.('dual-rumble', { duration: seconds * 1000, strongMagnitude: strength, weakMagnitude: strength * 0.6 })
      ?.catch?.(() => {});
  };
  const controls = { throttle: 0, brake: 0, steer: 0, drift: false, item: false, lookBack: false };
  const held = (name) => KEYS[name].some((code) => down.has(code));
  let keySteer = 0;

  addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return;
    // Keep the page from scrolling under the game.
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    down.add(event.code);
    const command = COMMANDS[event.code];
    if (command) input.onCommand?.(command);
  });
  addEventListener('keyup', (event) => down.delete(event.code));
  addEventListener('blur', () => {
    down.clear();
    touch.clear();
  });

  // Touch buttons: the kart accelerates by itself while any touch control is in use.
  touchRoot?.addEventListener('contextmenu', (event) => event.preventDefault());
  for (const button of touchRoot?.querySelectorAll('[data-touch]') ?? []) {
    const name = button.dataset.touch;
    const press = (event) => {
      event.preventDefault();
      input.touch = true;
      touch.add(name);
      button.classList.add('held');
    };
    const release = (event) => {
      event.preventDefault();
      touch.delete(name);
      button.classList.remove('held');
    };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
  }

  /** Read the devices. `dt` eases keyboard steering so taps make small corrections. */
  input.poll = (dt) => {
    const wanted = (held('right') || touch.has('right') ? 1 : 0) - (held('left') || touch.has('left') ? 1 : 0);
    keySteer += Math.max(-dt * 7, Math.min(dt * 7, wanted - keySteer));
    if (wanted === 0 && Math.abs(keySteer) < 0.05) keySteer = 0;
    controls.steer = keySteer;
    controls.throttle = held('throttle') || (input.touch && !touch.has('brake')) ? 1 : 0;
    controls.brake = held('brake') || touch.has('brake') ? 1 : 0;
    controls.drift = held('drift') || touch.has('drift');
    controls.item = held('item') || touch.has('item');
    controls.lookBack = held('lookBack');

    const pad = [...(navigator.getGamepads?.() ?? [])].find((candidate) => candidate?.connected);
    if (pad) {
      const button = (index) => pad.buttons[index]?.value ?? 0,
        stick = Math.abs(pad.axes[0]) > 0.15 ? pad.axes[0] : 0;
      if (stick) controls.steer = stick;
      controls.throttle = Math.max(controls.throttle, button(0), button(7));
      controls.brake = Math.max(controls.brake, button(1), button(6));
      controls.drift ||= button(5) > 0.5 || button(2) > 0.5;
      controls.item ||= button(4) > 0.5 || button(3) > 0.5;
      controls.lookBack ||= button(10) > 0.5 || button(11) > 0.5;
      for (const [index, command] of Object.entries(PAD_COMMANDS)) {
        const pressed = button(Number(index)) > 0.5;
        if (pressed && !padHeld.has(index)) input.onCommand?.(command);
        if (pressed) padHeld.add(index);
        else padHeld.delete(index);
      }
    }
    rumblePad = pad;
    return controls;
  };
  return input;
}
