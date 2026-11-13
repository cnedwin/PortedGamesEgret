// Keyboard, mouse, gamepad and touch feed the same movement and actions.

const KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  slam: ['ControlLeft', 'ControlRight', 'KeyQ'],
  roll: ['ShiftLeft', 'ShiftRight', 'KeyE'],
};

export function createInput(canvas, touch) {
  const down = new Set(),
    listeners = [];
  const input = {
    // Per-frame values, filled by poll().
    forward: 0,
    right: 0,
    jump: false,
    slam: false,
    roll: false,
    lookX: 0,
    lookY: 0,
    zoom: 0,
    /** Called with 'pick1'..'pick3', 'reroll' or 'menu' when those keys or buttons are pressed. */
    onCommand: undefined,
    enabled: true,
    touchMode: window.matchMedia('(pointer: coarse)').matches,
    onJumpCancel: undefined,
    get captured() {
      return document.pointerLockElement === canvas;
    },
  };
  let lookX = 0,
    lookY = 0,
    zoom = 0,
    slamQueued = false,
    mouseRoll = false,
    dragging = false;
  const pad = { slam: false, menu: false, pick: -1, reroll: false };
  const on = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    listeners.push([target, type, handler, options]);
  };
  const held = (name) => KEYS[name].some((code) => down.has(code));

  let touchEnabled = false,
    touchForward = 0,
    touchRight = 0,
    touchLookX = 0,
    touchLookY = 0,
    sampledTouchJump = false;
  const touchPressed = new Set(), touchTaps = new Set();
  const releaseTouch = [];

  /** Each control owns a single contact, so a second finger can use another control. */
  function bindTouch(element, start, move, finish) {
    let pointer;
    const release = (canceled) => {
      if (pointer === undefined) return;
      const id = pointer;
      pointer = undefined;
      finish?.(canceled);
      if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
    };
    on(element, 'pointerdown', (event) => {
      if (!touchEnabled || pointer !== undefined || event.button !== 0 || !start(event)) return;
      pointer = event.pointerId;
      element.setPointerCapture(pointer);
      event.preventDefault();
    });
    on(element, 'pointermove', (event) => {
      if (event.pointerId === pointer) move?.(event);
    });
    on(element, 'pointerup', (event) => {
      if (event.pointerId === pointer) release(false);
    });
    for (const type of ['pointercancel', 'lostpointercapture']) {
      on(element, type, (event) => {
        if (event.pointerId === pointer) release(true);
      });
    }
    releaseTouch.push(() => release(true));
  }

  if (touch) {
    const { joystick, actions } = touch;
    let centerX, centerY, radius;
    const moveStick = (event) => {
      const x = event.clientX - centerX, y = event.clientY - centerY;
      const distance = Math.hypot(x, y);
      const scale = Math.max(distance, radius);
      const active = distance > radius * 0.12;
      touchRight = active ? x / scale : 0;
      touchForward = active ? -y / scale : 0;
      joystick.style.setProperty('--stick-x', (x / scale) * radius + 'px');
      joystick.style.setProperty('--stick-y', (y / scale) * radius + 'px');
    };
    bindTouch(joystick, (event) => {
      const box = joystick.getBoundingClientRect();
      centerX = box.left + box.width / 2;
      centerY = box.top + box.height / 2;
      radius = Math.min(box.width, box.height) * 0.31;
      moveStick(event);
      joystick.classList.add('held');
      return true;
    }, moveStick, () => {
      touchRight = touchForward = 0;
      joystick.style.setProperty('--stick-x', '0px');
      joystick.style.setProperty('--stick-y', '0px');
      joystick.classList.remove('held');
    });
    for (const [action, button] of Object.entries(actions)) {
      bindTouch(button, () => {
        touchPressed.add(action);
        touchTaps.add(action);
        button.classList.add('held');
        return true;
      }, undefined, (canceled) => {
        touchPressed.delete(action);
        button.classList.remove('held');
        if (canceled) {
          touchTaps.delete(action);
          if (action === 'jump') input.onJumpCancel?.();
        }
      });
    }

    let lastX, lastY;
    bindTouch(canvas, (event) => {
      const box = canvas.getBoundingClientRect();
      if (event.pointerType !== 'touch' || event.clientX < box.left + box.width * 0.45) return false;
      lastX = event.clientX;
      lastY = event.clientY;
      return true;
    }, (event) => {
      touchLookX += event.clientX - lastX;
      touchLookY += event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
    });
  }

  function clearTouch() {
    // A pause or canceled gesture must not release a charged jump into the next run.
    if (sampledTouchJump || touchTaps.has('jump')) input.onJumpCancel?.();
    sampledTouchJump = false;
    for (const release of releaseTouch) release();
    touchTaps.clear();
    touchLookX = touchLookY = 0;
  }
  input.setTouchEnabled = (enabled) => {
    if (touchEnabled && !enabled) clearTouch();
    touchEnabled = enabled;
  };

  on(window, 'keydown', (event) => {
    if (event.repeat) return;
    down.add(event.code);
    if (KEYS.slam.includes(event.code)) slamQueued = true;
    if (/^Digit[1-3]$/.test(event.code)) input.onCommand?.('pick' + event.code.slice(5));
    else if (event.code === 'KeyR') input.onCommand?.('reroll');
    else if (event.code === 'Escape' || event.code === 'KeyP') input.onCommand?.('menu');
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  on(window, 'keyup', (event) => {
    down.delete(event.code);
  });
  on(window, 'blur', () => {
    down.clear();
    mouseRoll = false;
    dragging = false;
    slamQueued = false;
    lookX = lookY = zoom = 0;
    clearTouch();
  });
  on(document, 'visibilitychange', () => {
    if (document.hidden) clearTouch();
  });
  on(canvas, 'pointerdown', (event) => {
    if (!input.enabled || event.pointerType === 'touch') return;
    if (!input.captured) {
      dragging = true;
      canvas.requestPointerLock?.()?.catch?.(() => {});
      return;
    }
    if (event.button === 0) slamQueued = true;
    else if (event.button === 2) mouseRoll = true;
  });
  on(window, 'pointerup', (event) => {
    if (event.pointerType === 'touch') return;
    dragging = false;
    if (event.button === 2) mouseRoll = false;
  });
  on(window, 'pointermove', (event) => {
    if (!input.enabled || event.pointerType === 'touch' || !(input.captured || dragging)) return;
    lookX += event.movementX;
    lookY += event.movementY;
  });
  on(
    canvas,
    'wheel',
    (event) => {
      zoom += Math.sign(event.deltaY);
      event.preventDefault();
    },
    { passive: false },
  );
  on(canvas, 'contextmenu', (event) => event.preventDefault());
  on(document, 'pointerlockchange', () => {
    if (!input.captured) mouseRoll = false;
  });

  /** Read the devices once per frame. */
  input.poll = () => {
    let forward = (held('forward') ? 1 : 0) - (held('back') ? 1 : 0) + touchForward,
      right = (held('right') ? 1 : 0) - (held('left') ? 1 : 0) + touchRight;
    sampledTouchJump = touchPressed.has('jump') || touchTaps.has('jump');
    let jump = held('jump') || sampledTouchJump,
      roll = held('roll') || mouseRoll || touchPressed.has('roll') || touchTaps.has('roll'),
      slam = slamQueued || touchTaps.has('slam');
    touchTaps.clear();
    slamQueued = false;
    const gamepad = navigator.getGamepads?.().find((entry) => entry && entry.connected);
    if (gamepad) {
      const dead = (v) => (Math.abs(v) < 0.18 ? 0 : v),
        buttons = gamepad.buttons;
      right += dead(gamepad.axes[0] ?? 0);
      forward -= dead(gamepad.axes[1] ?? 0);
      lookX += dead(gamepad.axes[2] ?? 0) * 14;
      lookY += dead(gamepad.axes[3] ?? 0) * 9;
      jump ||= !!buttons[0]?.pressed;
      roll ||= !!buttons[2]?.pressed;
      const padSlam = !!buttons[1]?.pressed,
        padMenu = !!buttons[9]?.pressed;
      if (padSlam && !pad.slam) slam = true;
      if (padMenu && !pad.menu) input.onCommand?.('menu');
      // The direction pad picks a card: left, up, right for the first three; Y rerolls.
      const pick = buttons[14]?.pressed ? 1 : buttons[12]?.pressed ? 2 : buttons[15]?.pressed ? 3 : -1,
        padReroll = !!buttons[3]?.pressed;
      if (pick > 0 && pad.pick < 0) input.onCommand?.('pick' + pick);
      if (padReroll && !pad.reroll) input.onCommand?.('reroll');
      pad.slam = padSlam;
      pad.menu = padMenu;
      pad.pick = pick;
      pad.reroll = padReroll;
    }
    input.forward = Math.max(-1, Math.min(1, forward));
    input.right = Math.max(-1, Math.min(1, right));
    input.jump = jump;
    input.roll = roll;
    input.slam = slam;
    input.lookX = lookX + touchLookX;
    input.lookY = lookY + touchLookY;
    touchLookX = touchLookY = 0;
    input.zoom = zoom;
    lookX = 0;
    lookY = 0;
    zoom = 0;
    return input;
  };
  input.release = () => {
    clearTouch();
    if (input.captured) document.exitPointerLock?.();
  };
  input.dispose = () => {
    clearTouch();
    for (const [target, type, handler, options] of listeners) target.removeEventListener(type, handler, options);
  };
  return input;
}
