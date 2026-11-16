// What the player asks for, from the keyboard, a gamepad and the buttons on a touch screen, as one answer a step:
// `{ move, jump, jumpHeld, attack, dash }`. A press is reported on one step only, however long it is held.
import { createBrowserGamepadInput } from '@egret/engine/web/gamepad';

const KEYS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['Space', 'KeyK', 'ArrowUp', 'KeyW'],
  attack: ['KeyJ', 'KeyZ'],
  dash: ['KeyL', 'ShiftLeft', 'ShiftRight', 'KeyX']
};
const ACTION_OF = Object.fromEntries(Object.entries(KEYS).flatMap(([action, codes]) => codes.map(code => [code, action])));
const PAD = { jump: 'a', attack: 'x', dash: 'b' };

export function createInput(target = window) {
  const held = { left: false, right: false, jump: false, attack: false, dash: false },
    pressed = { jump: false, attack: false, dash: false },
    pad = { jump: false, attack: false, dash: false };
  const set = (action, down) => {
    if (down && !held[action] && action in pressed) pressed[action] = true;
    held[action] = down;
  };
  const key = down => event => {
    const action = ACTION_OF[event.code];
    if (!action || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof HTMLButtonElement && event.code === 'Space') return;
    event.preventDefault();
    if (!event.repeat) set(action, down);
  };
  target.addEventListener('keydown', key(true));
  target.addEventListener('keyup', key(false));
  target.addEventListener('blur', () => Object.keys(held).forEach(action => (held[action] = false)));

  // Touch buttons carry the action they stand for in `data-hold`.
  for (const button of document.querySelectorAll('[data-hold]')) {
    const action = button.dataset.hold,
      lift = () => (set(action, false), button.classList.remove('is-held'));
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      set(action, true);
      button.classList.add('is-held');
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, lift);
    button.addEventListener('contextmenu', event => event.preventDefault());
  }

  let gamepads;
  try {
    gamepads = createBrowserGamepadInput({ deadZone: 0.28 });
  } catch {
    gamepads = undefined;
  }

  return {
    /** The gamepad in use, for a rumble. */
    get gamepads() {
      return gamepads;
    },
    /** Reads this step's input. Call once a step: it uses up the presses. */
    read() {
      let move = (held.right ? 1 : 0) - (held.left ? 1 : 0),
        jumpHeld = held.jump;
      const first = gamepads?.input.pads[0];
      if (first) {
        const stick = first.stick('left').x,
          sideways = (first.pressed('right') ? 1 : 0) - (first.pressed('left') ? 1 : 0);
        if (move === 0) move = sideways || (Math.abs(stick) > 0.3 ? Math.sign(stick) : 0);
        for (const [action, button] of Object.entries(PAD)) {
          const down = first.pressed(button);
          if (down && !pad[action]) pressed[action] = true;
          pad[action] = down;
        }
        jumpHeld ||= pad.jump;
      }
      const out = { move, jump: pressed.jump, jumpHeld, attack: pressed.attack, dash: pressed.dash };
      pressed.jump = pressed.attack = pressed.dash = false;
      return out;
    },
    /** Presses an action once, as a key would: for a check, or for a button of the page's own. */
    tap(action) {
      if (action in pressed) pressed[action] = true;
    },
    /** Looks at the gamepads; once a frame. */
    poll(timestamp) {
      gamepads?.poll(timestamp);
    }
  };
}
