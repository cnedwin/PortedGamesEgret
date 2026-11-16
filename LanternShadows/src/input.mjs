// What the player asks for, from the keyboard, a gamepad and the buttons on a touch screen, as one answer a step:
// `{ move, jump, jumpHeld, attack, dash, special }`. A press is reported on one step only, however long it is held.
import { createBrowserGamepadInput } from '@egret/engine/web/gamepad';

const KEYS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['Space', 'KeyK', 'ArrowUp', 'KeyW'],
  attack: ['KeyJ', 'KeyZ'],
  dash: ['KeyL', 'ShiftLeft', 'ShiftRight', 'KeyX'],
  special: ['KeyI', 'KeyC']
};
const ACTION_OF = Object.fromEntries(Object.entries(KEYS).flatMap(([action, codes]) => codes.map(code => [code, action])));
const PAD = { jump: 'a', attack: 'x', dash: 'b', special: 'y' };

export function createInput(target = window) {
  const held = { left: false, right: false, jump: false, attack: false, dash: false, special: false },
    pressed = { jump: false, attack: false, dash: false, special: false },
    pad = { jump: false, attack: false, dash: false, special: false };
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

  // Thumbs working the buttons must not zoom or slide the page. A touch on the stage or on the game's own buttons
  // is kept from the browser altogether; elsewhere a second tap close on the first, which a browser reads as a
  // request to zoom, is refused, as is a pinch.
  const onStage = event => event.target instanceof Element && event.target.closest('canvas, .pads') !== null;
  let lastTap = 0;
  const refuse = { passive: false };
  document.addEventListener('touchstart', event => (onStage(event) || event.touches.length > 1) && event.preventDefault(), refuse);
  document.addEventListener('touchmove', event => event.preventDefault(), refuse);
  document.addEventListener(
    'touchend',
    event => {
      const now = event.timeStamp,
        double = now - lastTap < 350;
      lastTap = now;
      if (onStage(event) || double) event.preventDefault();
    },
    refuse
  );
  for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) document.addEventListener(type, event => event.preventDefault(), refuse);

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
      const out = { move, jump: pressed.jump, jumpHeld, attack: pressed.attack, dash: pressed.dash, special: pressed.special };
      pressed.jump = pressed.attack = pressed.dash = pressed.special = false;
      return out;
    },
    /** Holds an action down or lets it go, as a key would: for a check that plays the game by itself. */
    hold(action, down) {
      if (action in held) set(action, down);
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
