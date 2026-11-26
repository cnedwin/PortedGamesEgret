// What the player asks for, from the keyboard, a gamepad and the buttons on a touch screen, as one answer a step:
// `{ move, jump, jumpHeld, attack, dash, special }`. A press is reported on one step only, however long it is held.
import { createBrowserGamepadInput } from '@egret/engine/web/gamepad';
import { bindJoystick } from './joystick.mjs';

const KEYS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['Space'],
  attack: ['KeyJ', 'KeyZ'],
  dash: ['KeyL', 'ShiftLeft', 'ShiftRight', 'KeyX'],
  special: ['KeyI', 'KeyC']
};
const ACTION_OF = Object.fromEntries(Object.entries(KEYS).flatMap(([action, codes]) => codes.map(code => [code, action])));
const PAD = { jump: 'a', attack: 'x', dash: 'b', special: 'y' };

export function createInput(target = window) {
  const owners = Object.fromEntries(Object.keys(KEYS).map(action => [action, new Set()]));
  const pressed = { jump: false, attack: false, dash: false, special: false };
  const pad = { jump: false, attack: false, dash: false, special: false };
  const contacts = new Map();
  const joystick = bindJoystick(document.getElementById('move-stick'), target);
  const held = action => owners[action].size > 0;
  const set = (action, source, down) => {
    if (down) {
      if (!held(action) && action in pressed) pressed[action] = true;
      owners[action].add(source);
    } else owners[action].delete(source);
  };
  const clear = () => {
    joystick.clear();
    for (const sources of Object.values(owners)) sources.clear();
    for (const [id, { button }] of contacts) {
      contacts.delete(id);
      button.classList.remove('is-held');
      if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    }
    for (const action in pressed) pressed[action] = false;
  };
  const key = down => event => {
    const action = ACTION_OF[event.code];
    if (!action || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof HTMLButtonElement && event.code === 'Space') return;
    event.preventDefault();
    if (!event.repeat) set(action, event.code, down);
  };
  target.addEventListener('keydown', key(true));
  target.addEventListener('keyup', key(false));
  target.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });

  // Keep the starting button until the contact ends, even outside its bounds.
  const lift = event => {
    const contact = contacts.get(event.pointerId);
    if (!contact) return;
    const { action, button } = contact;
    contacts.delete(event.pointerId);
    set(action, event.pointerId, false);
    if (![...contacts.values()].some(other => other.button === button)) button.classList.remove('is-held');
  };
  for (const type of ['pointerup', 'pointercancel']) target.addEventListener(type, lift);
  for (const button of document.querySelectorAll('[data-hold]')) {
    const action = button.dataset.hold;
    button.addEventListener('pointerdown', event => {
      if ((event.pointerType === 'mouse' && event.button !== 0) || contacts.has(event.pointerId)) return;
      event.preventDefault();
      contacts.set(event.pointerId, { action, button });
      try { button.setPointerCapture?.(event.pointerId); } catch { /* Window listeners still track the release. */ }
      set(action, event.pointerId, true);
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
      let move = held('right') || held('left') ? Number(held('right')) - Number(held('left')) : joystick.move,
        jumpHeld = held('jump');
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
      if (action in owners) set(action, 'check', down);
    },
    /** Presses an action once, as a key would: for a check, or for a button of the page's own. */
    tap(action) {
      if (action in pressed) pressed[action] = true;
    },
    clear,
    /** Looks at the gamepads; once a frame. */
    poll(timestamp) {
      gamepads?.poll(timestamp);
    }
  };
}

/** A second finger can pause even on browsers which suppress its click while movement is held. */
export function bindPlayButton(button, apply) {
  let contact;
  button.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    contact = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false };
    try { button.setPointerCapture?.(event.pointerId); } catch { /* A regular tap will still click. */ }
  });
  const drifted = event => Math.hypot(event.clientX - contact.x, event.clientY - contact.y) > 18;
  button.addEventListener('pointermove', event => {
    if (contact?.id === event.pointerId && drifted(event)) contact.dragged = true;
  });
  button.addEventListener('pointerup', event => {
    if (contact?.id !== event.pointerId) return;
    const inside = button.getBoundingClientRect();
    const tap = !contact.dragged && !drifted(event) && event.clientX >= inside.left && event.clientX <= inside.right &&
      event.clientY >= inside.top && event.clientY <= inside.bottom;
    contact = undefined;
    if (tap) apply();
  });
  for (const type of ['pointercancel', 'lostpointercapture'])
    button.addEventListener(type, event => { if (contact?.id === event.pointerId) contact = undefined; });
  button.addEventListener('click', event => {
    if (event.detail === 0 || !['touch', 'pen'].includes(event.pointerType)) apply();
  });
}
