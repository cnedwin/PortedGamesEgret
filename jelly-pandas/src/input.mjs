// Keyboard, mouse, gamepad and the native touch controls feed the same play state.
// The 3D canvas retains its relative mouse and right-side look drag; visible
// touch buttons belong exclusively to the engine's overlay pointer stream.
const KEYS = {
  forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space'], slam: ['ControlLeft', 'ControlRight', 'KeyQ'], roll: ['ShiftLeft', 'ShiftRight', 'KeyE'],
};
const clamp = v => Math.max(-1, Math.min(1, v));

export function createInput(canvas) {
  const down = new Set(), listeners = [];
  const touchPressed = new Set(), touchTaps = new Set();
  let enabled = true, touchEnabled = false, resetNativeTouch;
  let lookX = 0, lookY = 0, zoom = 0, slamQueued = false, mouseButtons = 0, dragging = false;
  let mouseLastX = 0, mouseLastY = 0;
  let touchForward = 0, touchRight = 0, sampledTouchJump = false;
  let lookOwner, lastX, lastY, touchLookX = 0, touchLookY = 0, releasedLookX = 0, releasedLookY = 0;
  let previousPad = new Set(), gamepadMode = false;
  const padNeedsRelease = new Set();
  const input = {
    forward: 0, right: 0, jump: false, slam: false, roll: false, lookX: 0, lookY: 0, zoom: 0,
    onCommand: undefined, onJumpCancel: undefined, commandMode: 'play',
    touchMode: window.matchMedia('(pointer: coarse)').matches,
    get captured() { return document.pointerLockElement === canvas; },
    get gamepadMode() { return gamepadMode; },
    get enabled() { return enabled; },
    set enabled(next) {
      next = !!next;
      if (next === enabled) return;
      enabled = next;
      if (!enabled) clearGameplay();
    },
  };
  const on = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    listeners.push([target, type, handler, options]);
  };
  const held = name => KEYS[name].some(code => down.has(code));

  /** The native controls keep contact ownership; the game only consumes their movement and action state. */
  input.bindTouchReset = reset => {
    resetNativeTouch = reset;
    return () => { if (resetNativeTouch === reset) resetNativeTouch = undefined; };
  };
  input.touchMovement = (x, y) => {
    if (touchEnabled && (x || y)) gamepadMode = false;
    touchRight = touchEnabled ? x : 0;
    touchForward = touchEnabled ? -y : 0;
  };
  input.touchAction = (action, pressed) => {
    if (pressed && touchEnabled) {
      gamepadMode = false;
      touchPressed.add(action);
      touchTaps.add(action); // A quick press and release between two frames still counts.
    } else touchPressed.delete(action);
  };
  input.cancelTouchAction = action => {
    const cancelJump = action === 'jump' &&
      (sampledTouchJump || touchPressed.has(action) || touchTaps.has(action));
    touchPressed.delete(action);
    touchTaps.delete(action);
    if (cancelJump) {
      sampledTouchJump = false;
      input.onJumpCancel?.();
    }
  };

  function releaseLook(canceled) {
    if (lookOwner === undefined) return;
    const id = lookOwner;
    lookOwner = undefined;
    if (!canceled) {
      releasedLookX += touchLookX; releasedLookY += touchLookY;
    }
    touchLookX = touchLookY = 0;
    if (canvas.hasPointerCapture?.(id)) {
      try { canvas.releasePointerCapture?.(id); } catch { /* Native contact may already be released. */ }
    }
  }
  function clearTouch() {
    const cancelJump = sampledTouchJump || touchPressed.has('jump') || touchTaps.has('jump');
    sampledTouchJump = false;
    touchPressed.clear(); touchTaps.clear();
    touchForward = touchRight = 0;
    releaseLook(true);
    releasedLookX = releasedLookY = touchLookX = touchLookY = 0;
    resetNativeTouch?.();
    if (cancelJump) input.onJumpCancel?.();
    return cancelJump;
  }
  function clearGameplay() {
    const cancelOtherJump = input.jump || held('jump');
    for (const button of previousPad) padNeedsRelease.add(button);
    down.clear(); mouseButtons = 0; dragging = false; slamQueued = false;
    lookX = lookY = zoom = 0;
    if (!clearTouch() && cancelOtherJump) input.onJumpCancel?.();
    Object.assign(input, { forward: 0, right: 0, jump: false, slam: false, roll: false, lookX: 0, lookY: 0, zoom: 0 });
  }
  input.setTouchEnabled = next => {
    next = !!next;
    if (touchEnabled === next) return;
    touchEnabled = next;
    if (!next) clearTouch();
  };

  on(window, 'keydown', event => {
    // The engine's focused menu control may already have consumed this key.
    if (!event.repeat) gamepadMode = false;
    if (event.repeat || event.defaultPrevented || event.target?.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName ?? '')) return;
    if (input.commandMode !== 'play' && /^Arrow(Up|Down|Left|Right)$/.test(event.code)) {
      if (input.onCommand?.(event.code.slice(5).toLowerCase()) === true) event.preventDefault();
      return;
    }
    if (/^Digit[1-3]$/.test(event.code)) input.onCommand?.('pick' + event.code.slice(5));
    else if (event.code === 'KeyR') input.onCommand?.('reroll');
    else if (event.code === 'Escape' || event.code === 'KeyP') input.onCommand?.('menu');
    if (!enabled) return;
    down.add(event.code);
    if (KEYS.slam.includes(event.code)) slamQueued = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  on(window, 'keyup', event => down.delete(event.code));
  on(window, 'blur', clearGameplay);
  on(document, 'visibilitychange', () => { if (document.hidden) clearGameplay(); });

  function buttons(event, canSlam) {
    let next = event.buttons;
    if (!Number.isInteger(next)) {
      const bit = event.button === 0 ? 1 : event.button === 2 ? 2 : 0;
      next = event.type === 'pointerup' ? mouseButtons & ~bit : mouseButtons | bit;
    }
    if (canSlam && (next & 1) && !(mouseButtons & 1)) slamQueued = true;
    mouseButtons = next;
  }
  on(canvas, 'pointerdown', event => {
    gamepadMode = false;
    if (!enabled) return;
    if (event.pointerType === 'touch') {
      // Only the open right part of the 3D surface starts a look gesture; the engine
      // overlay never passes a touch owned by one of its visible controls here.
      const box = canvas.getBoundingClientRect();
      if (!touchEnabled || lookOwner !== undefined || event.button !== 0 ||
          event.clientX < box.left + box.width * 0.45) return;
      lookOwner = event.pointerId; lastX = event.clientX; lastY = event.clientY;
      try { canvas.setPointerCapture?.(lookOwner); } catch { /* DOM-copy or unsupported native capture: use the window route. */ }
      event.preventDefault();
      return;
    }
    if (!input.captured) {
      dragging = true;
      mouseLastX = event.clientX; mouseLastY = event.clientY;
      canvas.requestPointerLock?.()?.catch?.(() => {});
      return;
    }
    buttons(event, true);
  });
  on(canvas, 'lostpointercapture', event => { if (event.pointerId === lookOwner) releaseLook(true); });
  on(window, 'pointermove', event => {
    if (event.pointerId === lookOwner) {
      touchLookX += event.clientX - lastX; touchLookY += event.clientY - lastY;
      lastX = event.clientX; lastY = event.clientY;
      return;
    }
    if (!enabled || event.pointerType === 'touch' || !(input.captured || dragging)) return;
    if (input.captured) {
      buttons(event, true); // Mouse chords change buttons on pointermove, not just pointerdown/up.
      lookX += event.movementX || 0; lookY += event.movementY || 0;
    } else {
      // The overlay's forwarded DOM copy may omit movementX/Y; a free drag is
      // measured from client coordinates, not from a fabricated relative event.
      lookX += event.clientX - mouseLastX; lookY += event.clientY - mouseLastY;
      mouseLastX = event.clientX; mouseLastY = event.clientY;
    }
  });
  on(window, 'pointerup', event => {
    if (event.pointerId === lookOwner) { releaseLook(false); return; }
    if (event.pointerType === 'touch') return;
    dragging = false; buttons(event, false);
  });
  on(window, 'pointercancel', event => {
    if (event.pointerId === lookOwner) releaseLook(true);
    if (event.pointerType !== 'touch') { mouseButtons = 0; dragging = false; }
  });
  on(canvas, 'wheel', event => {
    if (!enabled) return;
    zoom += Math.sign(event.deltaY); event.preventDefault();
  }, { passive: false });
  on(canvas, 'contextmenu', event => event.preventDefault());
  on(document, 'pointerlockchange', () => { mouseButtons = 0; dragging = false; });

  /** Sample devices once per frame. Menu commands stay available while play input is cleared. */
  input.poll = () => {
    const gamepad = Array.from(navigator.getGamepads?.() ?? []).find(entry => entry?.connected);
    const pad = new Set();
    if (gamepad) gamepad.buttons.forEach((button, i) => { if (button.pressed) pad.add(i); });
    const edge = i => pad.has(i) && !previousPad.has(i);
    if (!gamepad) gamepadMode = false;
    else if (pad.size || gamepad.axes.some(value => Math.abs(value) >= 0.18)) gamepadMode = true;
    const mode = input.commandMode;
    for (const button of padNeedsRelease) if (!pad.has(button)) padNeedsRelease.delete(button);
    if (mode !== 'play') for (const button of pad) padNeedsRelease.add(button);
    const playButton = button => mode === 'play' && !padNeedsRelease.has(button) && pad.has(button);
    // Preserve direct card picks; other menus use standard directional focus and A/B.
    if (edge(9)) input.onCommand?.('menu');
    else if (mode === 'cards') {
      if (edge(14)) input.onCommand?.('pick1');
      else if (edge(12)) input.onCommand?.('pick2');
      else if (edge(15)) input.onCommand?.('pick3');
      else if (edge(3)) input.onCommand?.('reroll');
      else if (edge(1)) input.onCommand?.('back');
      else if (edge(0)) input.onCommand?.('confirm');
    } else if (mode === 'menu') {
      for (const [button, command] of [[12,'up'],[13,'down'],[14,'left'],[15,'right'],[0,'confirm'],[1,'back']]) {
        if (edge(button)) { input.onCommand?.(command); break; }
      }
    }
    let forward = (held('forward') ? 1 : 0) - (held('back') ? 1 : 0) + touchForward;
    let right = (held('right') ? 1 : 0) - (held('left') ? 1 : 0) + touchRight;
    sampledTouchJump = touchPressed.has('jump') || touchTaps.has('jump');
    let jump = held('jump') || sampledTouchJump || playButton(0),
      roll = held('roll') || !!(mouseButtons & 2) || touchPressed.has('roll') || touchTaps.has('roll') || playButton(2),
      slam = slamQueued || touchTaps.has('slam') || (playButton(1) && edge(1));
    if (gamepad && enabled && mode === 'play') {
      const dead = v => Math.abs(v) < 0.18 ? 0 : v;
      right += dead(gamepad.axes[0] ?? 0); forward -= dead(gamepad.axes[1] ?? 0);
      lookX += dead(gamepad.axes[2] ?? 0) * 14; lookY += dead(gamepad.axes[3] ?? 0) * 9;
    }
    previousPad = pad;
    input.forward = enabled ? clamp(forward) : 0;
    input.right = enabled ? clamp(right) : 0;
    input.jump = enabled && jump; input.roll = enabled && roll; input.slam = enabled && slam;
    input.lookX = enabled ? lookX + touchLookX + releasedLookX : 0;
    input.lookY = enabled ? lookY + touchLookY + releasedLookY : 0;
    input.zoom = enabled ? zoom : 0;
    touchTaps.clear(); slamQueued = false;
    lookX = lookY = zoom = touchLookX = touchLookY = releasedLookX = releasedLookY = 0;
    return input;
  };
  input.release = () => {
    clearGameplay();
    if (input.captured) document.exitPointerLock?.();
  };
  input.dispose = () => {
    clearGameplay();
    for (const [target, type, handler, options] of listeners) target.removeEventListener(type, handler, options);
  };
  return input;
}
