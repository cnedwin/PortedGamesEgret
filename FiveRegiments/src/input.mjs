// The player's hands: keys, the mouse (held inside the page while fighting), a gamepad and the touch controls, read
// into the one input the fight takes each tick (see sim/fight.mjs).
//
// The line of a blow is the way the mouse last moved: right, left, up (overhead) or down (a thrust). A single
// mouse melee attack locks that line on press and commits on release. The keypad gives a line and strikes on
// it at once. In the classic scheme the alternate controls take the lines in turn and the guard follows the threat.
// The camera turns with the mouse in both.
//
// The keys are the sandbox-war PC layout: WASD, left Shift to sprint, Space to jump, F to kick, X for the main-hand weapon
// art and Z for the off-hand one (the shield's), R and T for the two profession skills, B for single or continuous
// attack, 1 to 0 for the bar (weapons, bandages), E to get on
// or off the horse, U to call it, V for the view, the wheel for nearer or further, Tab to hide the panels, Ctrl+H for
// the key hints, Esc for the menu. The middle button locks the camera on a foe.

import { createGamepadInput } from '@egret/engine/input/gamepad';

export const DEFAULT_KEYS = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  sprint: 'ShiftLeft',
  step: 'Space',
  kick: 'KeyF',
  skill0: 'KeyR',
  skill1: 'KeyT',
  art: 'KeyX',
  offArt: 'KeyZ',
  combo: 'KeyB',
  mount: 'KeyE',
  call: 'KeyU',
  view: 'KeyV',
  autorun: 'Equal',
  hide: 'Tab',
  pause: 'Escape'
};

/** The bar along the bottom: 1 and 2 take up a weapon, 3 is a wound dressing. */
const SLOT_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];
/** The keypad's lines: up overhead, down a thrust, the sides and corners to their own side. */
const PAD_LINES = { Numpad8: 'O', Numpad2: 'T', Numpad4: 'L', Numpad6: 'R', Numpad7: 'L', Numpad1: 'L', Numpad9: 'R', Numpad3: 'R' };

const LINE_ORDER = ['R', 'L', 'O', 'T'];
const MOUSE_STROKE_PX = 9;
const MOUSE_STROKE_IDLE_MS = 90;

export function createInput(canvas, { settings, onPause = () => {}, onLock = () => {} } = {}) {
  const down = new Set();
  let mouseStrokeAt = -Infinity;
  const meleeGestures = [];
  let heldMouseAttack = null,
    heldTouchAttack = null,
    pressedGuardLine = null,
    canceledAttack = false;
  const state = {
    yaw: 0,
    pitch: 0.12,
    line: 'R',
    lineAt: 0,
    attack: false,
    guard: false,
    once: { kick: false, step: false, swap: false, skill0: false, skill1: false, art: false, offArt: false, mount: false, call: false, heal: false },
    arm: null,
    combo: false,
    comboBeat: 0,
    padLine: null,
    view: 'third',
    zoom: 1,
    hidePanels: false,
    keyHints: true,
    autorun: false,
    classicIndex: 0,
    moved: [0, 0],
    touch: { move: [0, 0], attack: false, guard: false, tapAttack: false, tapGuard: false, strikeLine: null, mounted: false },
    pad: null,
    pointerLocked: false,
    lastDevice: 'keys'
  };
  const keys = () => ({ ...DEFAULT_KEYS, ...(settings.keys ?? {}) });

  // ---- mouse -------------------------------------------------------------------------------------------------
  const sens = () => 0.0022 * (settings.sensitivity ?? 1);
  function look(dx, dy, now) {
    state.yaw -= dx * sens();
    state.pitch = Math.max(-0.35, Math.min(0.75, state.pitch + dy * sens() * (settings.invertY ? -1 : 1)));
    if (state.attack && !heldMouseAttack?.release) return;
    // Choose a clear mouse report on its own, or accumulate nearby smaller reports into one stroke.
    const moved = state.moved;
    if (now - mouseStrokeAt > MOUSE_STROKE_IDLE_MS || Math.hypot(dx, dy) > MOUSE_STROKE_PX) moved.fill(0);
    mouseStrokeAt = now;
    moved[0] += dx;
    moved[1] += dy;
    const [mx, my] = moved;
    if (Math.hypot(mx, my) > MOUSE_STROKE_PX) {
      state.line = Math.abs(mx) > Math.abs(my) * 0.9 ? (mx > 0 ? 'R' : 'L') : my < 0 ? 'O' : 'T';
      state.lineAt = now;
      moved.fill(0);
    }
  }
  const onMove = (e) => {
    if (!state.pointerLocked) return;
    state.lastDevice = 'mouse';
    // Some browsers report a jump when the pointer is first held; one event never turns more than this.
    const cap = 120;
    look(Math.max(-cap, Math.min(cap, e.movementX)), Math.max(-cap, Math.min(cap, e.movementY)), e.timeStamp);
  };
  function tryPointerLock() {
    if (!state.wantLock || !document.hasFocus() || document.pointerLockElement === canvas
      || navigator.userActivation?.isActive === false) return;
    // An async scene load or a browser focus change can invalidate the request.
    // Leave the click-to-fight hint visible so the player can try again.
    canvas.requestPointerLock?.()?.catch?.(() => {});
  }
  function startGesture(line, release) {
    const gesture = { line, release, pressed: true, released: false };
    meleeGestures.push(gesture);
    return gesture;
  }
  function releaseGesture(gesture) {
    gesture.released = true;
    // Before a tick, down/up belong to the same gesture. Otherwise queue its release.
    if (!gesture.pressed) meleeGestures.push(gesture);
  }
  const onDown = (e) => {
    if (!state.pointerLocked) {
      tryPointerLock();
      return;
    }
    state.lastDevice = 'mouse';
    if (e.button === 0 && !heldTouchAttack) {
      if (!state.attack) heldMouseAttack = startGesture(state.line, !state.combo);
      state.attack = true;
    }
    if (e.button === 2) {
      if (!state.guard) pressedGuardLine = state.line;
      state.guard = true;
    }
    if (e.button === 1) onLock();
    e.preventDefault();
  };
  const onUp = (e) => {
    if (e.button === 0 && heldMouseAttack) {
      releaseGesture(heldMouseAttack);
      heldMouseAttack = null;
      state.attack = false;
    }
    if (e.button === 2) state.guard = false;
  };
  function clearCombatInput() {
    canceledAttack ||= Boolean(heldMouseAttack?.release || heldTouchAttack || meleeGestures.some((gesture) => gesture.release));
    if (heldTouchAttack) state.touch.attack = false;
    state.attack = state.guard = state.attackWas = false;
    heldMouseAttack = heldTouchAttack = null;
    meleeGestures.length = 0;
    pressedGuardLine = null;
    state.moved.fill(0);
    mouseStrokeAt = -Infinity;
  }
  const onLockChange = () => {
    state.pointerLocked = document.pointerLockElement === canvas;
    if (state.pointerLocked && !state.wantLock) document.exitPointerLock();
    if (!state.pointerLocked) {
      clearCombatInput();
      if (state.wantLock) onPause('unlocked');
    }
  };
  const onWheel = (e) => {
    e.preventDefault();
    state.zoom = Math.max(0.55, Math.min(1.7, state.zoom * (e.deltaY > 0 ? 1.08 : 1 / 1.08)));
  };

  // ---- keys --------------------------------------------------------------------------------------------------
  const onKey = (e) => {
    const k = keys();
    const press = e.type === 'keydown';
    // Ctrl+H: the key hints.
    if (press && e.ctrlKey && e.code === 'KeyH') {
      state.keyHints = !state.keyHints;
      e.preventDefault();
      return;
    }
    // The bar: 1 and 2 are weapons, 3 a wound dressing.
    const slot = SLOT_KEYS.indexOf(e.code);
    if (slot >= 0) {
      if (press && !e.repeat && !e.ctrlKey) {
        if (slot <= 1) state.arm = slot;
        if (slot === 2) state.once.heal = true;
        state.lastDevice = 'keys';
      }
      return;
    }
    // The keypad strikes on its line while held.
    if (PAD_LINES[e.code]) {
      if (press) {
        state.padLine = PAD_LINES[e.code];
        state.line = state.padLine;
      } else if (state.padLine === PAD_LINES[e.code]) state.padLine = null;
      e.preventDefault();
      return;
    }
    const name = Object.keys(k).find((n) => k[n] === e.code) ?? (e.code === 'ShiftRight' ? 'sprint' : e.code === 'ArrowUp' ? 'up' : e.code === 'ArrowDown' ? 'down' : e.code === 'ArrowLeft' ? 'left' : e.code === 'ArrowRight' ? 'right' : null);
    if (!name) return;
    if (press) {
      if (name === 'pause') return onPause('key');
      if (!e.repeat) {
        if (name === 'combo') state.combo = !state.combo;
        if (name === 'view') state.view = state.view === 'third' ? 'first' : 'third';
        if (name === 'hide') state.hidePanels = !state.hidePanels;
        if (name === 'autorun') state.autorun = !state.autorun;
        if (['kick', 'step', 'swap', 'skill0', 'skill1', 'art', 'offArt', 'mount', 'call'].includes(name)) state.once[name] = true;
      }
      if ((name === 'up' || name === 'down') && state.autorun) state.autorun = false;
      down.add(name);
      state.lastDevice = 'keys';
      if (name === 'hide' || name === 'step') e.preventDefault();
    } else down.delete(name);
  };
  const onBlur = () => {
    down.clear();
    clearCombatInput();
  };

  // Pointer-locked moves already bubble from the canvas to the window.
  addEventListener('mousemove', onMove);
  canvas.addEventListener('mousedown', onDown);
  addEventListener('mouseup', onUp);
  document.addEventListener('pointerlockchange', onLockChange);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', onWheel, { passive: false });
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);
  addEventListener('blur', onBlur);

  // ---- gamepad -----------------------------------------------------------------------------------------------
  // The browser's pads are read once a tick into the engine's gamepad input, which keeps the standard layout's names
  // and takes the dead zone off the sticks (pads in another layout are not read).
  const pads = createGamepadInput({ deadZone: 0.18, maxPads: 1 });
  const unit = (v, least) => Math.max(least, Math.min(1, Number.isFinite(v) ? v : 0));
  let padPrev = {},
    padClock = 0;
  function readPad(dt) {
    const found = [...(navigator.getGamepads?.() ?? [])].filter((p) => p && p.connected).slice(0, 1);
    padClock += dt * 1000;
    pads.sample(
      found.map((p) => ({ index: p.index, id: p.id, mapping: p.mapping, buttons: [...p.buttons].slice(0, 64).map((b) => ({ pressed: !!b.pressed, value: unit(b.value, 0) })), axes: [...p.axes].slice(0, 16).map((v) => unit(v, -1)) })),
      padClock
    );
    const pad = pads.pads[0];
    if (!pad?.standard) return null;
    const b = (name) => pad.pressed(name);
    const now = { a: b('a'), b: b('b'), x: b('x'), y: b('y'), lb: b('l1'), rb: b('r1'), lt: pad.value('l2') > 0.3, rt: pad.value('r2') > 0.3, start: b('start'), r3: b('r3'), up: b('up'), down: b('down'), left: b('left'), right: b('right') };
    const { x: lx, y: ly } = pad.stick('left'),
      { x: rx, y: ry } = pad.stick('right');
    if (lx || ly || rx || ry || Object.values(now).some(Boolean)) state.lastDevice = 'pad';
    state.yaw -= rx * dt * 2.6 * (settings.sensitivity ?? 1);
    state.pitch = Math.max(-0.35, Math.min(0.75, state.pitch + ry * dt * 1.6));
    if (Math.hypot(rx, ry) > 0.55 && !now.rt) state.line = Math.abs(rx) > Math.abs(ry) ? (rx > 0 ? 'R' : 'L') : ry < 0 ? 'O' : 'T';
    const pressed = (k) => now[k] && !padPrev[k];
    if (pressed('start')) onPause('pad');
    if (pressed('r3')) onLock();
    if (pressed('y')) state.once.art = true;
    if (pressed('right')) state.once.offArt = true;
    if (pressed('x')) state.once.kick = true;
    if (pressed('b')) state.once.step = true;
    if (pressed('lb')) state.once.skill0 = true;
    if (pressed('rb')) state.once.skill1 = true;
    if (pressed('a')) state.once.swap = true;
    if (pressed('up')) state.once.mount = true;
    if (pressed('down')) state.once.heal = true;
    if (pressed('left')) state.once.call = true;
    padPrev = now;
    return { move: [lx, ly], attack: now.rt, guard: now.lt, sprint: b('l3') };
  }

  /**
   * One tick's input for the fight. Foot movement follows the camera. Mounted reins keep the same
   * forward, brake and turn directions even when the view or target lock turns away from the horse.
   */
  function sample(dt, { threat = null, aim = null, bow = false, mounted = false } = {}) {
    state.touch.mounted = mounted;
    const pad = readPad(dt);
    let mx = (down.has('right') ? 1 : 0) - (down.has('left') ? 1 : 0),
      my = (down.has('down') ? 1 : 0) - (down.has('up') ? 1 : 0);
    if (state.autorun && !my) my = -1;
    if (pad && (pad.move[0] || pad.move[1])) [mx, my] = pad.move;
    const touchMoving = Boolean(state.touch.move[0] || state.touch.move[1]);
    if (touchMoving) [mx, my] = state.touch.move;
    const l = Math.hypot(mx, my);
    if (l > 1) [mx, my] = [mx / l, my / l];
    // Camera space to world: forward is the way the camera looks.
    const fy = state.yaw;
    const fwd = [Math.sin(fy), Math.cos(fy)],
      right = [-Math.cos(fy), Math.sin(fy)];
    const move = [right[0] * mx - fwd[0] * my, right[1] * mx - fwd[1] * my];
    // Release and a new press can share a frame. Sample them in order with each gesture's locked line.
    const gesture = meleeGestures.shift() ?? heldMouseAttack ?? heldTouchAttack;
    const meleeRelease = Boolean(!bow && gesture?.release);
    let attack = state.attack || !!gesture?.pressed || !!pad?.attack || state.touch.attack || state.touch.tapAttack || !!state.padLine;
    // Continuous attack (B): a held button strikes again as each blow ends, instead of winding up a heavy one.
    if (state.combo && attack && !bow && !meleeRelease) {
      state.comboBeat = (state.comboBeat + dt) % 0.2;
      attack = state.comboBeat < 0.1;
    } else state.comboBeat = 0;
    const touchGuard = state.touch.guard || state.touch.tapGuard;
    const guard = state.guard || pressedGuardLine !== null || !!pad?.guard || touchGuard;
    const classic = settings.control === 'classic' || state.lastDevice === 'touch';
    // A swipe and a guard can share a sample. Read the defensive line before choosing the attack line.
    const guardLine = touchGuard && attack ? ((classic || settings.assist) && threat ? threat : state.line) : undefined;
    let line = state.line;
    // Retain the attack and its direction when both edges arrive between ticks.
    if (attack && !state.attack && gesture?.pressed) line = gesture.line;
    else if (guard && !state.guard && pressedGuardLine) line = pressedGuardLine;
    if (classic && threat && guard) line = threat;
    if (state.padLine) line = state.padLine;
    else if (meleeRelease && !guard) line = gesture.line;
    else if (classic && attack && !state.attackWas && !meleeRelease) {
      // A swipe on the touch strike button names the line; otherwise the lines come in turn.
      if (state.touch.tapAttack && state.touch.strikeLine) line = state.line = state.touch.strikeLine;
      else {
        line = LINE_ORDER[state.classicIndex++ % 4];
        state.line = line;
      }
    }
    if (!classic && settings.assist && threat && guard) line = threat;
    state.attackWas = attack;
    const input = {
      move,
      face: state.yaw,
      reins: mounted ? { throttle: -my || 0, turn: -mx || 0 } : undefined,
      sprint: down.has('sprint') || !!pad?.sprint || mounted && touchMoving && my <= -0.92,
      attack,
      meleeRelease,
      meleeLine: meleeRelease ? gesture.line : undefined,
      meleeDown: meleeRelease && gesture.pressed,
      meleeUp: meleeRelease && gesture.released,
      meleeCancel: canceledAttack,
      guard,
      guardLine,
      kick: state.once.kick,
      step: state.once.step,
      swap: state.once.swap,
      skill: state.once.skill0 ? 0 : state.once.skill1 ? 1 : -1,
      art: state.once.art,
      offArt: state.once.offArt,
      mount: state.once.mount,
      call: state.once.call,
      heal: state.once.heal,
      arm: state.arm,
      line,
      aim: aim ?? { yaw: state.yaw, pitch: -state.pitch * 0.6 + 0.05 }
    };
    // Presses last one tick; the fight sees them as pressed on that tick only.
    for (const k of Object.keys(state.once)) state.once[k] = false;
    state.arm = null;
    state.touch.tapAttack = state.touch.tapGuard = false;
    state.touch.strikeLine = null;
    if (gesture) gesture.pressed = gesture.released = false;
    pressedGuardLine = null;
    canceledAttack = false;
    return input;
  }

  return {
    state,
    sample,
    beginMountedTouchAttack(line) {
      if (!state.touch.mounted || heldMouseAttack || heldTouchAttack) return;
      state.line = line ?? LINE_ORDER[state.classicIndex++ % 4];
      heldTouchAttack = startGesture(state.line, true);
    },
    endMountedTouchAttack(commit) {
      const gesture = heldTouchAttack;
      if (!gesture) return;
      heldTouchAttack = null;
      if (commit) releaseGesture(gesture);
      else {
        const pending = meleeGestures.indexOf(gesture);
        if (pending >= 0) meleeGestures.splice(pending, 1);
        else canceledAttack = true;
      }
    },
    /** Hold the mouse inside the page (on a click) while fighting. */
    capture(on) {
      state.wantLock = on;
      if (on) tryPointerLock();
      else if (document.pointerLockElement === canvas) document.exitPointerLock?.();
    },
    setYaw(y) {
      state.yaw = y;
    },
    clear() {
      down.clear();
      clearCombatInput();
      for (const k of Object.keys(state.once)) state.once[k] = false;
    },
    dispose() {
      pads.dispose();
      removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mousedown', onDown);
      removeEventListener('mouseup', onUp);
      document.removeEventListener('pointerlockchange', onLockChange);
      removeEventListener('keydown', onKey);
      removeEventListener('keyup', onKey);
      removeEventListener('blur', onBlur);
    }
  };
}
