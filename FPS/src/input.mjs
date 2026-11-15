// Keyboard, mouse and touch, gathered into the input record the rules read.
// The mouse is captured while playing; losing the capture pauses the game.
import { idleInput } from './sim.mjs';

const KEYS = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'jump',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
  KeyC: 'crouch',
  ControlLeft: 'crouch',
  KeyR: 'reload',
  KeyF: 'interact',
  KeyE: 'interact',
  KeyQ: 'heal',
  KeyG: 'grenade',
};

/**
 * `canvas` takes the mouse; `touchRoot` holds the on-screen controls built
 * by the HUD. `options.onPause` is called when the player asks to pause or
 * the mouse capture is lost; `options.onTouch` when a finger first plays.
 */
export function createInput(canvas, touchRoot, options = {}) {
  const held = {},
    record = idleInput();
  let lookX = 0,
    lookY = 0,
    fire = false,
    aim = false,
    weapon = '',
    enabled = false;
  const input = {
    sensitivity: 1,
    invertY: false,
    /** True once a finger has been used; the HUD then shows the touch controls. */
    touchMode: false,
    get locked() {
      return document.pointerLockElement === canvas;
    },
    /** Ask the browser to capture the mouse. Must be called from a click or key press. */
    capture() {
      if (input.touchMode) return;
      try {
        const asked = canvas.requestPointerLock?.();
        asked?.catch?.(() => {});
      } catch {
        /* the browser refused; drag-to-look still works */
      }
    },
    release() {
      if (input.locked) document.exitPointerLock?.();
    },
    /** Take input while a run is on; let go of everything otherwise. */
    setEnabled(on) {
      enabled = on;
      if (!on) {
        for (const key of Object.keys(held)) held[key] = false;
        fire = aim = false;
        touchState.moveX = touchState.moveZ = 0;
        for (const key of Object.keys(touchHeld)) touchHeld[key] = false;
      }
    },
    /** The input since the last call, ready for `game.update`. */
    sample() {
      const r = record;
      r.moveX = (held.right ? 1 : 0) - (held.left ? 1 : 0) + touchState.moveX;
      r.moveZ = (held.forward ? 1 : 0) - (held.back ? 1 : 0) + touchState.moveZ;
      r.lookYaw = -lookX;
      r.lookPitch = input.invertY ? lookY : -lookY;
      lookX = lookY = 0;
      r.fire = fire || touchHeld.fire;
      r.aim = aim || touchState.aim;
      r.sprint = Boolean(held.sprint) || touchState.moveZ > 0.92;
      r.crouch = Boolean(held.crouch) || touchState.crouch;
      r.jump = Boolean(held.jump) || touchHeld.jump;
      r.reload = Boolean(held.reload) || touchHeld.reload;
      r.interact = Boolean(held.interact) || touchHeld.interact;
      r.heal = Boolean(held.heal) || touchHeld.heal;
      r.grenade = Boolean(held.grenade) || touchHeld.grenade;
      r.weapon = weapon;
      weapon = '';
      return r;
    },
  };

  // ---- keyboard ----------------------------------------------------------------------------
  addEventListener('keydown', (event) => {
    if (event.code === 'Escape' || event.code === 'KeyP') {
      if (enabled) options.onPause?.();
      return;
    }
    if (!enabled) return;
    const name = KEYS[event.code];
    if (name) {
      held[name] = true;
      event.preventDefault();
    } else if (event.code === 'Digit1') weapon = 'rifle';
    else if (event.code === 'Digit2') weapon = 'pistol';
    else if (event.code === 'Digit3') weapon = 'marksman';
    else if (event.code === 'Tab') {
      options.onBag?.();
      event.preventDefault();
    }
  });
  addEventListener('keyup', (event) => {
    const name = KEYS[event.code];
    if (name) held[name] = false;
  });
  addEventListener('blur', () => {
    for (const key of Object.keys(held)) held[key] = false;
    fire = aim = false;
  });

  // ---- mouse -------------------------------------------------------------------------------
  const RADIANS_PER_PIXEL = 0.0022;
  let dragging = false;
  addEventListener('mousemove', (event) => {
    if (!enabled || (!input.locked && !dragging)) return;
    lookX += event.movementX * RADIANS_PER_PIXEL * input.sensitivity * (aim ? 0.62 : 1);
    lookY += event.movementY * RADIANS_PER_PIXEL * input.sensitivity * (aim ? 0.62 : 1);
  });
  canvas.addEventListener('mousedown', (event) => {
    if (!enabled) return;
    // Without capture (a browser may refuse it), holding a button drags the view.
    if (!input.locked) {
      dragging = true;
      input.capture();
    }
    if (event.button === 0) fire = true;
    if (event.button === 2) aim = true;
    event.preventDefault();
  });
  addEventListener('mouseup', (event) => {
    if (event.button === 0) fire = false;
    if (event.button === 2) aim = false;
    dragging = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  canvas.addEventListener(
    'wheel',
    (event) => {
      if (enabled) weapon = event.deltaY > 0 ? 'next' : 'previous';
      event.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener('pointerlockchange', () => {
    // Capture lost while playing means the player pressed Esc or switched away.
    if (!input.locked && enabled && !input.touchMode) options.onPause?.();
  });

  // ---- touch -------------------------------------------------------------------------------
  const touchState = { moveX: 0, moveZ: 0, aim: false, crouch: false },
    touchHeld = {};
  let stickId = -1,
    stickX = 0,
    stickY = 0,
    lookId = -1,
    lookLastX = 0,
    lookLastY = 0;
  const TOUCH_RADIANS_PER_PIXEL = 0.0052;
  const startTouch = () => {
    if (input.touchMode) return;
    input.touchMode = true;
    options.onTouch?.();
  };
  const stickNub = () => touchRoot?.querySelector('.stick i');
  canvas.addEventListener(
    'touchstart',
    (event) => {
      startTouch();
      if (!enabled) return;
      for (const touch of event.changedTouches) {
        if (touch.clientX < innerWidth * 0.4 && stickId < 0) {
          stickId = touch.identifier;
          stickX = touch.clientX;
          stickY = touch.clientY;
        } else if (lookId < 0) {
          lookId = touch.identifier;
          lookLastX = touch.clientX;
          lookLastY = touch.clientY;
        }
      }
      event.preventDefault();
    },
    { passive: false },
  );
  const moveTouch = (event) => {
    for (const touch of event.changedTouches) {
      if (touch.identifier === stickId) {
        const dx = (touch.clientX - stickX) / 56,
          dy = (touch.clientY - stickY) / 56,
          size = Math.max(1, Math.hypot(dx, dy));
        touchState.moveX = dx / size;
        touchState.moveZ = -dy / size;
        const nub = stickNub();
        if (nub) nub.style.transform = `translate(${touchState.moveX * 34}px, ${-touchState.moveZ * 34}px)`;
      } else if (touch.identifier === lookId) {
        lookX += (touch.clientX - lookLastX) * TOUCH_RADIANS_PER_PIXEL * input.sensitivity;
        lookY += (touch.clientY - lookLastY) * TOUCH_RADIANS_PER_PIXEL * input.sensitivity;
        lookLastX = touch.clientX;
        lookLastY = touch.clientY;
      }
    }
  };
  const endTouch = (event) => {
    for (const touch of event.changedTouches) {
      if (touch.identifier === stickId) {
        stickId = -1;
        touchState.moveX = touchState.moveZ = 0;
        const nub = stickNub();
        if (nub) nub.style.transform = '';
      } else if (touch.identifier === lookId) lookId = -1;
    }
  };
  addEventListener('touchmove', moveTouch, { passive: true });
  addEventListener('touchend', endTouch);
  addEventListener('touchcancel', endTouch);
  if (touchRoot) {
    // Buttons: some are held, some toggle. Dragging on the fire button also turns the view.
    touchRoot.addEventListener(
      'touchstart',
      (event) => {
        startTouch();
        const button = event.target.closest('button');
        if (!button) return;
        const name = button.dataset.t;
        if (name === 'pause') options.onPause?.();
        else if (name === 'aim') button.classList.toggle('on', (touchState.aim = !touchState.aim));
        else if (name === 'crouch') button.classList.toggle('on', (touchState.crouch = !touchState.crouch));
        else if (name === 'swap') weapon = 'swap';
        else touchHeld[name] = true;
        if (name === 'fire' && lookId < 0) {
          const touch = event.changedTouches[0];
          lookId = touch.identifier;
          lookLastX = touch.clientX;
          lookLastY = touch.clientY;
        }
        event.preventDefault();
      },
      { passive: false },
    );
    const release = (event) => {
      const button = event.target.closest('button');
      if (button) touchHeld[button.dataset.t] = false;
    };
    touchRoot.addEventListener('touchend', release);
    touchRoot.addEventListener('touchcancel', release);
  }

  return input;
}
