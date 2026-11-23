// The player's hands: keys, the mouse (held inside the page while fighting), a gamepad and the touch controls, read
// into the one input the fight takes each tick (see sim/fight.mjs).
//
// The line of a blow is the way the mouse last moved: right, left, up (overhead) or down (a thrust); the keypad gives
// a line and strikes on it at once (8 up, 2 down, 4 left, 6 right, the corners to their sides). The guard is held on
// the same line. In the classic scheme the blows take the lines in turn and the guard turns itself to the blow coming.
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

export function createInput(canvas, { settings, onPause = () => {}, onLock = () => {} } = {}) {
  const down = new Set();
  let pressedAttackLine = null,
    pressedGuardLine = null;
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
    touch: { move: [0, 0], attack: false, guard: false, tapAttack: false, tapGuard: false, strikeLine: null },
    pad: null,
    pointerLocked: false,
    lastDevice: 'keys'
  };
  const keys = () => ({ ...DEFAULT_KEYS, ...(settings.keys ?? {}) });

  // ---- mouse -------------------------------------------------------------------------------------------------
  const sens = () => 0.0022 * (settings.sensitivity ?? 1);
  function look(dx, dy) {
    state.yaw -= dx * sens();
    state.pitch = Math.max(-0.35, Math.min(0.75, state.pitch + dy * sens() * (settings.invertY ? -1 : 1)));
    // The line follows the last clear stroke of the mouse.
    state.moved[0] = state.moved[0] * 0.6 + dx;
    state.moved[1] = state.moved[1] * 0.6 + dy;
    const [mx, my] = state.moved;
    if (Math.hypot(mx, my) > 9 && !state.attack) {
      state.line = Math.abs(mx) > Math.abs(my) * 0.9 ? (mx > 0 ? 'R' : 'L') : my < 0 ? 'O' : 'T';
      state.lineAt = performance.now();
    }
  }
  const onMove = (e) => {
    if (!state.pointerLocked) return;
    state.lastDevice = 'mouse';
    // Some browsers report a jump when the pointer is first held; one event never turns more than this.
    const cap = 120;
    look(Math.max(-cap, Math.min(cap, e.movementX)), Math.max(-cap, Math.min(cap, e.movementY)));
  };
  function tryPointerLock() {
    if (!state.wantLock || !document.hasFocus() || document.pointerLockElement === canvas
      || navigator.userActivation?.isActive === false) return;
    // An async scene load or a browser focus change can invalidate the request.
    // Leave the click-to-fight hint visible so the player can try again.
    canvas.requestPointerLock?.()?.catch?.(() => {});
  }
  const onDown = (e) => {
    if (!state.pointerLocked) {
      tryPointerLock();
      return;
    }
    state.lastDevice = 'mouse';
    if (e.button === 0) {
      if (!state.attack) pressedAttackLine = state.line;
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
    if (e.button === 0) state.attack = false;
    if (e.button === 2) state.guard = false;
  };
  function clearMouse() {
    state.attack = state.guard = state.attackWas = false;
    pressedAttackLine = pressedGuardLine = null;
    state.moved[0] = state.moved[1] = 0;
  }
  const onLockChange = () => {
    state.pointerLocked = document.pointerLockElement === canvas;
    if (state.pointerLocked && !state.wantLock) document.exitPointerLock();
    if (!state.pointerLocked) {
      clearMouse();
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
    clearMouse();
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
   * One tick's input for the fight. `camYaw` is the camera's heading; movement is taken relative to it. `threat`
   * is the line of the nearest blow coming, for the classic guard.
   */
  function sample(dt, { threat = null, aim = null, bow = false } = {}) {
    const pad = readPad(dt);
    let mx = (down.has('right') ? 1 : 0) - (down.has('left') ? 1 : 0),
      my = (down.has('down') ? 1 : 0) - (down.has('up') ? 1 : 0);
    if (state.autorun && !my) my = -1;
    if (pad && (pad.move[0] || pad.move[1])) [mx, my] = pad.move;
    if (state.touch.move[0] || state.touch.move[1]) [mx, my] = state.touch.move;
    const l = Math.hypot(mx, my);
    if (l > 1) [mx, my] = [mx / l, my / l];
    // Camera space to world: forward is the way the camera looks.
    const fy = state.yaw;
    const fwd = [Math.sin(fy), Math.cos(fy)],
      right = [-Math.cos(fy), Math.sin(fy)];
    const move = [right[0] * mx - fwd[0] * my, right[1] * mx - fwd[1] * my];
    let attack = state.attack || pressedAttackLine !== null || !!pad?.attack || state.touch.attack || state.touch.tapAttack || !!state.padLine;
    // Continuous attack (B): a held button strikes again as each blow ends, instead of winding up a heavy one.
    if (state.combo && attack && !bow) {
      state.comboBeat = (state.comboBeat + dt) % 0.2;
      attack = state.comboBeat < 0.1;
    } else state.comboBeat = 0;
    const guard = state.guard || pressedGuardLine !== null || !!pad?.guard || state.touch.guard || state.touch.tapGuard;
    const classic = settings.control === 'classic' || state.lastDevice === 'touch';
    let line = state.line;
    // Retain a mouse tap and its line when down/up arrive between two simulation ticks.
    if (attack && !state.attack && pressedAttackLine) line = pressedAttackLine;
    else if (guard && !state.guard && pressedGuardLine) line = pressedGuardLine;
    if (classic && threat && guard) line = threat;
    if (state.padLine) line = state.padLine;
    else if (classic && attack && !state.attackWas) {
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
      sprint: down.has('sprint') || !!pad?.sprint,
      attack,
      guard,
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
    pressedAttackLine = pressedGuardLine = null;
    return input;
  }

  return {
    state,
    sample,
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
      clearMouse();
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
