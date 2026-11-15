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
const CAPTURE_TIMEOUT_MS = 1800;

/**
 * `canvas` takes the mouse; `touchRoot` holds the on-screen controls built
 * by the HUD. `options.onPause` is called when the player asks to pause or
 * the mouse capture is lost; `onTouch` and `onMouse` report device switches.
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
    enabled = false,
    captureRequest,
    ownsLock = false,
    tryRaw = true;
  const input = {
    sensitivity: 1,
    adsSensitivity: AIM_DRAG_SCALE,
    invertY: false,
    dragLook: false,
    /** Handheld browsers start with controls. A touchscreen can still take over on hybrids. */
    touchMode: matchMedia('(pointer: coarse)').matches,
    get locked() {
      return document.pointerLockElement === canvas;
    },
    get capturePending() {
      return Boolean(captureRequest && !captureRequest.canceled);
    },
    /** The native request starts during the calling gesture. Resolve only after checking the actual lock. */
    async capture() {
      if (input.touchMode || !canvas.requestPointerLock) return false;
      let request = captureRequest;
      if (request?.canceled) return false;
      if (!request) {
        if (input.locked) return ownsLock;
        request = { canceled: false, legacy: false };
        request.result = new Promise(resolve => { request.resolve = resolve; });
        captureRequest = request;
        request.timer = setTimeout(() => finishCapture(request, input.locked), CAPTURE_TIMEOUT_MS);
        requestLock(request);
      }
      return (await request.result) && ownsLock && input.locked;
    },
    release() {
      ownsLock = false;
      if (captureRequest && !captureRequest.canceled) {
        // Keep the abandoned request until it settles so a late lock cannot satisfy a newer attempt.
        captureRequest.canceled = true;
        captureRequest.resolve(false);
      }
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

  function finishCapture(request, acquired) {
    if (captureRequest !== request) return;
    clearTimeout(request.timer);
    captureRequest = undefined;
    ownsLock = acquired && !request.canceled && !input.touchMode && input.locked;
    if (!ownsLock && input.locked) document.exitPointerLock?.();
    request.resolve(ownsLock);
  }

  function requestLock(request) {
    const raw = tryRaw;
    const failed = (error) => {
      if (captureRequest !== request) return;
      // Denials keep their original result. Only lack of raw support permits retrying.
      if (!request.canceled && raw && (error?.name === 'NotSupportedError' || error?.name === 'TypeError')) {
        tryRaw = false;
        requestLock(request);
      } else finishCapture(request, false);
    };
    try {
      const result = raw ? canvas.requestPointerLock({ unadjustedMovement: true }) : canvas.requestPointerLock();
      request.legacy = typeof result?.then !== 'function';
      if (request.legacy) {
        if (input.locked) finishCapture(request, true);
      } else {
        Promise.resolve(result).then(() => {
          if (input.locked) finishCapture(request, true);
        }, failed);
      }
    } catch (error) {
      failed(error);
    }
  }

  function loseFocus() {
    const wasPlaying = enabled && !input.touchMode && (ownsLock || input.locked || input.dragLook);
    input.cancel();
    input.release();
    if (wasPlaying) options.onPause?.('released');
  }

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
  addEventListener('blur', loseFocus);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) loseFocus();
  });

  // ---- mouse -------------------------------------------------------------------------------
  const RADIANS_PER_PIXEL = 0.0022;
  addEventListener('mousemove', (event) => {
    if (!enabled || input.touchMode || (!input.locked && (!input.dragLook || !mouseButtons.size))) return;
    const scale = RADIANS_PER_PIXEL * input.sensitivity * (mouseButtons.has(2) ? input.adsSensitivity : 1);
    lookX += event.movementX * scale;
    lookY += event.movementY * scale;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (!enabled || input.touchMode || (!input.locked && !input.dragLook)) return;
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
    if (input.locked) {
      if (captureRequest) finishCapture(captureRequest, true);
      else if (!ownsLock) document.exitPointerLock?.();
    } else if (ownsLock) {
      ownsLock = false;
      input.cancel();
      if (enabled && !input.touchMode) options.onPause?.('released');
    }
  });
  document.addEventListener('pointerlockerror', () => {
    if (captureRequest?.legacy) finishCapture(captureRequest, false);
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
  const gameArea = options.gameArea ?? canvas;
  gameArea.addEventListener('pointerdown', (event) => {
    if (!event.isTrusted) return;
    if (event.pointerType === 'touch') startTouch();
    else if (event.pointerType === 'mouse' && input.touchMode) {
      input.cancel();
      input.touchMode = false;
      options.onMouse?.(event);
    }
  }, true);
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
      if (!event.isTrusted) return;
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
        if (!event.isTrusted) return;
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
