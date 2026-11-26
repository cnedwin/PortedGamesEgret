// A single gameplay stream from the keyboard, gamepad and native engine pointer sessions.
// A press belongs to the first simulation step; a held action can span frames.
import { createBrowserGamepadInput } from '@egret/engine/web/gamepad';
import { createStick } from './joystick.mjs';

const KEYS = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], jump: ['Space'],
  attack: ['KeyJ', 'KeyZ'], dash: ['KeyL', 'ShiftLeft', 'ShiftRight', 'KeyX'], special: ['KeyI', 'KeyC']
};
const ACTION_OF = Object.fromEntries(Object.entries(KEYS).flatMap(([action, codes]) => codes.map(code => [code, action])));
const PAD = { jump: 'a', attack: 'x', dash: 'b', special: 'y' };

export function createInput({ active = () => true, target = window } = {}) {
  const owners = Object.fromEntries(Object.keys(KEYS).map(action => [action, new Set()]));
  const pressed = { jump: false, attack: false, dash: false, special: false };
  const pad = { jump: false, attack: false, dash: false, special: false };
  const contacts = new Map(), stick = createStick();
  let keyboardUi = false;
  const held = action => owners[action].size > 0;
  const set = (action, source, down) => {
    if (down) {
      if (!held(action) && action in pressed) pressed[action] = true;
      owners[action].add(source);
    } else owners[action].delete(source);
  };
  const clear = () => {
    stick.clear(); contacts.clear(); keyboardUi = false;
    for (const sources of Object.values(owners)) sources.clear();
    for (const action in pressed) pressed[action] = false;
  };
  const key = down => event => {
    if (down && event.code === 'Tab') { keyboardUi = true; return; }
    const action = ACTION_OF[event.code];
    if (!action) return;
    if (!down) { set(action, event.code, false); return; }
    if (!active() || event.metaKey || event.ctrlKey || event.altKey) return;
    // Tab explicitly opts into native UI focus. Otherwise Space remains the long/short jump,
    // even when a tool button was most recently clicked.
    if (keyboardUi && action === 'jump') return;
    keyboardUi = false;
    event.preventDefault();
    if (!event.repeat) set(action, event.code, true);
  };
  target.addEventListener('keydown', key(true), true);
  target.addEventListener('keyup', key(false), true);
  target.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });

  let gamepads;
  try { gamepads = createBrowserGamepadInput({ deadZone: 0.28 }); } catch { /* No pad available. */ }

  return {
    get gamepads() { return gamepads; },
    // The engine pointer router retains contact identity beyond the starting control.
    contact({ kind, contact, target }, ui, enabled) {
      const id = contact.session;
      if (kind === 'end' || kind === 'cancel') {
        const action = contacts.get(id);
        if (action === 'stick') stick.end(id);
        else if (action) set(action, id, false);
        contacts.delete(id);
        return;
      }
      if (kind === 'move') {
        if (contacts.get(id) === 'stick') stick.track(id, contact.globalX);
        return;
      }
      if (kind !== 'begin') return;
      keyboardUi = false;
      if (!enabled || !contact.buttons || contacts.has(id)) return;
      const name = ui.touchTarget(target);
      if (name === 'stick') {
        if (stick.begin(id, contact.globalX, ui.rect('stick'))) contacts.set(id, 'stick');
        return;
      }
      const action = name === 'dodge' ? 'dash' : name;
      if (action && action in pressed) { contacts.set(id, action); set(action, id, true); }
    },
    stickState() { return { held: stick.held, axis: stick.move, shift: stick.shift, jumpHeld: held('jump') || pad.jump }; },
    heldActions() { return { jump: held('jump'), attack: held('attack'), dodge: held('dash'), special: held('special') }; },
    read() {
      let move = held('right') || held('left') ? Number(held('right')) - Number(held('left')) : stick.move,
        jumpHeld = held('jump');
      const first = gamepads?.input.pads[0];
      if (first) {
        const axis = first.stick('left').x,
          sideways = (first.pressed('right') ? 1 : 0) - (first.pressed('left') ? 1 : 0);
        if (move === 0) move = sideways || (Math.abs(axis) > 0.3 ? Math.sign(axis) : 0);
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
    hold(action, down) { if (action in owners) set(action, 'check', down); },
    tap(action) { if (action in pressed) pressed[action] = true; },
    clear,
    poll(timestamp) { gamepads?.poll(timestamp); }
  };
}
