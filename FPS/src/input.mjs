// Keyboard, mouse and touch, gathered into the input record the rules read.
// The mouse is captured while playing; losing the capture pauses the game.
import { idleInput } from './sim.mjs';

const KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  crouch: ['KeyC', 'ControlLeft'],
  reload: ['KeyR'],
  interact: ['KeyF', 'KeyE'],
  heal: ['KeyQ'],
  grenade: ['KeyG'],
};
const KEY_ACTION = new Map(Object.entries(KEYS).flatMap(([action, codes]) => codes.map((code) => [code, action])));
const WEAPON_KEYS = new Map([['Digit1', 'rifle'], ['Digit2', 'pistol'], ['Digit3', 'marksman']]);
const WEAPON_CHOICES = new Set(WEAPON_KEYS.values());
const TAP_ACTIONS = new Set(['fire', 'jump', 'reload', 'heal', 'grenade']);
const AIM_DRAG_SCALE = 0.62;

/**
 * `canvas` takes the mouse; `touchRoot` holds the on-screen controls built
 * by the HUD. `options.onPause` is called when the player asks to pause or
 * the mouse capture is lost; `options.onTouch` when a finger first plays.
 */
export function createInput(canvas, touchRoot, options = {}) {
  const keys = new Set(),
    mouseButtons = new Set(),
    touches = new Map(),
    taps = new Set(),
    touchTaps = new Set(),
    record = idleInput(),
    touchState = { moveX: 0, moveZ: 0, aim: false, crouch: false };
  const keyDown = (action) => KEYS[action].some((code) => keys.has(code));
  function hasTouchAction(owners, action) {
    for (const owner of owners.values()) if (owner.action === action) return true;
    return false;
  }
  const touchDown = (action) => hasTouchAction(touches, action);
  const tapped = (action) => taps.has(action) || hasTouchAction(touchTaps, action);
  const actionDown = (action) => keyDown(action) || touchDown(action) || tapped(action);
  let lookX = 0,
    lookY = 0,
    weapon = '',
    enabled = false;
  const input = {
    sensitivity: 1,
    invertY: false,
    /** Handheld browsers start with controls. A touchscreen can still take over on hybrids. */
    touchMode: matchMedia('(pointer: coarse)').matches,
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
    selectWeapon(key) {
      if (enabled && WEAPON_CHOICES.has(key)) weapon = key;
    },
    /** Release physical holds and toggle state together, even without a final browser up event. */
    cancel() {
      keys.clear();
      mouseButtons.clear();
      touches.clear();
      taps.clear();
      touchTaps.clear();
      resetTouchMotion();
      setTouchToggle('aim', false);
      setTouchToggle('crouch', false);
      lookX = lookY = 0;
      weapon = '';
    },
    /** Take input while a run is on; let go of everything otherwise. */
    setEnabled(on) {
      enabled = on;
      if (!on) input.cancel();
    },
    /** The input since the last call, ready for `game.update`. */
    sample() {
      const r = record;
      r.moveX = Number(keyDown('right')) - Number(keyDown('left')) + touchState.moveX;
      r.moveZ = Number(keyDown('forward')) - Number(keyDown('back')) + touchState.moveZ;
      r.lookYaw = -lookX;
      r.lookPitch = input.invertY ? lookY : -lookY;
      lookX = lookY = 0;
      r.firePressed = tapped('fire');
      r.fire = mouseButtons.has(0) || touchDown('fire') || r.firePressed;
      r.aim = mouseButtons.has(2) || touchState.aim;
      r.sprint = keyDown('sprint') || (touchState.moveZ > 0.92 && !r.fire);
      r.crouch = keyDown('crouch') || touchState.crouch;
      r.jump = actionDown('jump');
      r.reload = actionDown('reload');
      r.interact = keyDown('interact') || touchDown('interact');
      r.heal = actionDown('heal');
      r.grenade = actionDown('grenade');
      r.weapon = weapon;
      taps.clear();
      touchTaps.clear();
      weapon = '';
      return r;
    },
  };

  // ---- keyboard ----------------------------------------------------------------------------
  addEventListener('keydown', (event) => {
    if (!enabled) return;
    const code = event.code;
    const name = KEY_ACTION.get(code);
    if (name) {
      event.preventDefault();
      if (!event.repeat && !keys.has(code)) {
        keys.add(code);
        if (TAP_ACTIONS.has(name)) taps.add(name);
      }
    } else if (code === 'Escape' || code === 'KeyP') {
      if (!event.repeat) options.onPause?.();
    } else if (code === 'Tab') {
      event.preventDefault();
      if (!event.repeat) options.onBag?.();
    } else if (!event.repeat) {
      input.selectWeapon(WEAPON_KEYS.get(code));
    }
  });
  addEventListener('keyup', (event) => keys.delete(event.code));
  addEventListener('blur', input.cancel);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) input.cancel();
  });

  // ---- mouse -------------------------------------------------------------------------------
  const RADIANS_PER_PIXEL = 0.0022;
  addEventListener('mousemove', (event) => {
    if (!enabled || (!input.locked && !mouseButtons.size)) return;
    const scale = RADIANS_PER_PIXEL * input.sensitivity * (mouseButtons.has(2) ? AIM_DRAG_SCALE : 1);
    lookX += event.movementX * scale;
    lookY += event.movementY * scale;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (!enabled) return;
    // Without capture (a browser may refuse it), holding a button drags the view.
    if (!input.locked) input.capture();
    if (event.button === 0 && !mouseButtons.has(0)) taps.add('fire');
    mouseButtons.add(event.button);
    event.preventDefault();
  });
  addEventListener('mouseup', (event) => mouseButtons.delete(event.button));
  canvas.addEventListener(
    'wheel',
    (event) => {
      if (enabled && event.deltaY) weapon = event.deltaY > 0 ? 'next' : 'previous';
      event.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener('pointerlockchange', () => {
    // Capture lost while playing means the player pressed Esc or switched away.
    if (!input.locked && enabled && !input.touchMode) options.onPause?.();
  });

  // ---- touch -------------------------------------------------------------------------------
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
    input.cancel();
    input.release();
    options.onTouch?.();
  };
  const stickNub = () => touchRoot?.querySelector('.stick i');
  function setTouchToggle(name, pressed) {
    touchState[name] = pressed;
    const button = touchRoot?.querySelector(`[data-t="${name}"]`);
    button?.classList.toggle('on', pressed);
    button?.setAttribute('aria-pressed', String(pressed));
  }
  function resetTouchMotion() {
    stickId = lookId = -1;
    touchState.moveX = touchState.moveZ = 0;
    const nub = stickNub();
    if (nub) nub.style.transform = '';
  }
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
    if (!enabled) return;
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
        const scale = TOUCH_RADIANS_PER_PIXEL * input.sensitivity * (touchState.aim ? AIM_DRAG_SCALE : 1);
        lookX += (touch.clientX - lookLastX) * scale;
        lookY += (touch.clientY - lookLastY) * scale;
        lookLastX = touch.clientX;
        lookLastY = touch.clientY;
      }
    }
  };
  const endTouch = (event) => {
    for (const touch of event.changedTouches) {
      if (event.type === 'touchcancel') touchTaps.delete(touches.get(touch.identifier));
      touches.delete(touch.identifier);
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
        const button = event.target.closest('button[data-t]');
        if (!button || !enabled) return;
        const name = button.dataset.t;
        if (name === 'pause') options.onPause?.();
        else if (name === 'bag') options.onBag?.();
        else if (name === 'aim' || name === 'crouch') setTouchToggle(name, !touchState[name]);
        else if (name === 'swap') weapon = 'swap';
        else {
          const newPress = !touchDown(name) && TAP_ACTIONS.has(name);
          for (const touch of event.changedTouches) {
            const owner = { action: name };
            touches.set(touch.identifier, owner);
            if (newPress) touchTaps.add(owner);
            if (name === 'fire' && lookId < 0) {
              lookId = touch.identifier;
              lookLastX = touch.clientX;
              lookLastY = touch.clientY;
            }
          }
        }
        event.preventDefault();
      },
      { passive: false },
    );
  }

  return input;
}
