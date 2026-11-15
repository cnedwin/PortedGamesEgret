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
 * `data-touch` of left, right, drift, item or brake). The optional
 * `pauseButton` also accepts a second finger. `poll()` returns the current
 * controls; steering is -1 (left) to 1 (right).
 */
export function createInput(touchRoot, pauseButton) {
  const down = new Set(),
    contacts = new Map(),
    padHeld = new Set();
  const input = { onCommand: undefined, touch: false };
  let rumblePad, touchEnabled = false;
  /** Shake the gamepad, where it can: `strength` 0 to 1 for `seconds`. */
  input.rumble = (strength, seconds) => {
    rumblePad?.vibrationActuator
      ?.playEffect?.('dual-rumble', { duration: seconds * 1000, strongMagnitude: strength, weakMagnitude: strength * 0.6 })
      ?.catch?.(() => {});
  };
  const controls = { throttle: 0, brake: 0, steer: 0, drift: false, item: false, lookBack: false };
  const held = (name) => KEYS[name].some((code) => down.has(code));
  function touchHeld(name, button) {
    for (const owner of contacts.values()) if (owner.name === name && (!button || owner.button === button)) return true;
    return false;
  }
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
    clearTouch();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTouch();
  });

  // Touch buttons: a contact keeps the control where it started until release or cancellation.
  const movedTooFar = (owner, event) => Math.hypot(event.clientX - owner.x, event.clientY - owner.y) > 12;
  function releaseTouch(id, canceled, event) {
    const owner = contacts.get(id);
    if (!owner) return;
    contacts.delete(id);
    const { button, name } = owner;
    if (!touchHeld(name, button)) button.classList.remove('held');
    try {
      if (button.hasPointerCapture?.(id)) button.releasePointerCapture?.(id);
    } catch {
      // Native capture may have ended before this event was delivered.
    }
    if (name !== 'pause' || canceled || owner.swiped || movedTooFar(owner, event)) return;
    const { left, top, width, height } = button.getBoundingClientRect();
    const { clientX: x, clientY: y } = event;
    if (x >= left && x < left + width && y >= top && y < top + height) input.onCommand?.('pause');
  }
  function clearTouch() {
    const steering = touchHeld('left') || touchHeld('right');
    for (const id of contacts.keys()) releaseTouch(id, true);
    if (steering && !held('left') && !held('right')) keySteer = 0;
  }
  input.setTouchEnabled = (enabled) => {
    if (touchEnabled && !enabled) clearTouch();
    touchEnabled = enabled;
  };

  function bindTouch(button, name) {
    const pause = name === 'pause';
    button.addEventListener('pointerdown', (event) => {
      if (!touchEnabled || event.button !== 0 || contacts.has(event.pointerId)) return;
      if (pause && ((event.pointerType !== 'touch' && event.pointerType !== 'pen') || touchHeld(name))) return;
      contacts.set(event.pointerId, { button, name, x: event.clientX, y: event.clientY, swiped: false });
      if (!pause) input.touch = true;
      button.classList.add('held');
      try {
        button.setPointerCapture?.(event.pointerId);
      } catch {
        // The window still tracks this contact by ID if capture is unavailable.
      }
      event.preventDefault();
    });
    button.addEventListener('lostpointercapture', (event) => {
      if (event.target === button && contacts.get(event.pointerId)?.button === button) releaseTouch(event.pointerId, true);
    });
  }
  touchRoot?.addEventListener('contextmenu', (event) => event.preventDefault());
  for (const button of touchRoot?.querySelectorAll('[data-touch]') ?? []) bindTouch(button, button.dataset.touch);
  if (pauseButton) bindTouch(pauseButton, 'pause');
  addEventListener('pointermove', (event) => {
    const owner = contacts.get(event.pointerId);
    if (owner?.name === 'pause') owner.swiped ||= movedTooFar(owner, event);
  });
  addEventListener('pointerup', (event) => releaseTouch(event.pointerId, false, event));
  addEventListener('pointercancel', (event) => releaseTouch(event.pointerId, true));

  /** Read the devices. `dt` eases keyboard steering so taps make small corrections. */
  input.poll = (dt) => {
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
