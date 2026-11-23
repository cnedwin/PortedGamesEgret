// The player's hands: keys, the mouse (held inside the page while fighting), a gamepad and the touch controls, read
// into the one input the fight takes each tick (see sim/fight.mjs).
//
// The line of a blow is the way the mouse last moved: right, left, up (overhead) or down (a thrust). The guard is
// held on the same line. In the classic scheme the blows take the lines in turn and the guard turns itself to the
// blow coming. The camera turns with the mouse in both.

import { createGamepadInput } from '@egret/engine/input/gamepad';

export const DEFAULT_KEYS = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  sprint: 'ShiftLeft',
  step: 'Space',
  kick: 'KeyF',
  skill0: 'KeyQ',
  skill1: 'KeyE',
  swap: 'KeyR',
  lock: 'Tab',
  pause: 'Escape'
};

const LINE_ORDER = ['R', 'L', 'O', 'T'];

export function createInput(canvas, { settings, onPause = () => {}, onLock = () => {} } = {}) {
  const down = new Set();
  const state = {
    yaw: 0,
    pitch: 0.12,
    line: 'R',
    lineAt: 0,
    swiped: false,
    attack: false,
    guard: false,
    once: { kick: false, step: false, swap: false, skill0: false, skill1: false },
    classicIndex: 0,
    moved: [0, 0],
    touch: { move: [0, 0], attack: false, guard: false },
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
  const onDown = (e) => {
    if (!state.pointerLocked) {
      if (state.wantLock) canvas.requestPointerLock?.();
      return;
    }
    state.lastDevice = 'mouse';
    if (e.button === 0) state.attack = true;
    if (e.button === 2) state.guard = true;
    if (e.button === 1) onLock();
    e.preventDefault();
  };
  const onUp = (e) => {
    if (e.button === 0) state.attack = false;
    if (e.button === 2) state.guard = false;
  };
  const onLockChange = () => {
    state.pointerLocked = document.pointerLockElement === canvas;
    if (!state.pointerLocked) {
      state.attack = state.guard = false;
      if (state.wantLock) onPause('unlocked');
    }
  };
  const onWheel = (e) => e.preventDefault();

  // ---- keys --------------------------------------------------------------------------------------------------
  const onKey = (e) => {
    const k = keys();
    const name = Object.keys(k).find((n) => k[n] === e.code) ?? (e.code === 'ShiftRight' ? 'sprint' : e.code === 'ArrowUp' ? 'up' : e.code === 'ArrowDown' ? 'down' : e.code === 'ArrowLeft' ? 'left' : e.code === 'ArrowRight' ? 'right' : null);
    if (!name) return;
    if (e.type === 'keydown') {
      if (name === 'pause') return onPause('key');
      if (name === 'lock' && !e.repeat) onLock();
      if (['kick', 'step', 'swap', 'skill0', 'skill1'].includes(name) && !e.repeat) state.once[name] = true;
      down.add(name);
      state.lastDevice = 'keys';
      if (name === 'lock' || name === 'step') e.preventDefault();
    } else down.delete(name);
  };
  const onBlur = () => {
    down.clear();
    state.attack = state.guard = false;
  };

  canvas.addEventListener('mousemove', onMove);
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
    const now = { a: b('a'), b: b('b'), x: b('x'), y: b('y'), lb: b('l1'), rb: b('r1'), lt: pad.value('l2') > 0.3, rt: pad.value('r2') > 0.3, start: b('start'), r3: b('r3') };
    const { x: lx, y: ly } = pad.stick('left'),
      { x: rx, y: ry } = pad.stick('right');
    if (lx || ly || rx || ry || Object.values(now).some(Boolean)) state.lastDevice = 'pad';
    state.yaw -= rx * dt * 2.6 * (settings.sensitivity ?? 1);
    state.pitch = Math.max(-0.35, Math.min(0.75, state.pitch + ry * dt * 1.6));
    if (Math.hypot(rx, ry) > 0.55 && !now.rt) state.line = Math.abs(rx) > Math.abs(ry) ? (rx > 0 ? 'R' : 'L') : ry < 0 ? 'O' : 'T';
    const pressed = (k) => now[k] && !padPrev[k];
    if (pressed('start')) onPause('pad');
    if (pressed('y') || pressed('r3')) onLock();
    if (pressed('x')) state.once.kick = true;
    if (pressed('b')) state.once.step = true;
    if (pressed('lb')) state.once.skill0 = true;
    if (pressed('rb')) state.once.skill1 = true;
    if (pressed('a')) state.once.swap = true;
    padPrev = now;
    return { move: [lx, ly], attack: now.rt, guard: now.lt, sprint: b('l3') };
  }

  /**
   * One tick's input for the fight. `camYaw` is the camera's heading; movement is taken relative to it. `threat`
   * is the line of the nearest blow coming, for the classic guard.
   */
  function sample(dt, { threat = null, aim = null } = {}) {
    const pad = readPad(dt);
    let mx = (down.has('right') ? 1 : 0) - (down.has('left') ? 1 : 0),
      my = (down.has('down') ? 1 : 0) - (down.has('up') ? 1 : 0);
    if (pad && (pad.move[0] || pad.move[1])) [mx, my] = pad.move;
    if (state.touch.move[0] || state.touch.move[1]) [mx, my] = state.touch.move;
    const l = Math.hypot(mx, my);
    if (l > 1) [mx, my] = [mx / l, my / l];
    // Camera space to world: forward is the way the camera looks.
    const fy = state.yaw;
    const fwd = [Math.sin(fy), Math.cos(fy)],
      right = [-Math.cos(fy), Math.sin(fy)];
    const move = [right[0] * mx - fwd[0] * my, right[1] * mx - fwd[1] * my];
    const attack = state.attack || !!pad?.attack || state.touch.attack;
    const guard = state.guard || !!pad?.guard || state.touch.guard;
    const classic = settings.control === 'classic' || state.lastDevice === 'touch';
    let line = state.line;
    if (classic && threat && guard) line = threat;
    if (classic && attack && !state.attackWas) {
      // A swipe on the touch strike button names the line; otherwise the lines come in turn.
      if (state.swiped) line = state.line;
      else {
        line = LINE_ORDER[state.classicIndex++ % 4];
        state.line = line;
      }
      state.swiped = false;
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
      line,
      aim: aim ?? { yaw: state.yaw, pitch: -state.pitch * 0.6 + 0.05 }
    };
    // Presses last one tick; the fight sees them as pressed on that tick only.
    for (const k of Object.keys(state.once)) state.once[k] = false;
    return input;
  }

  return {
    state,
    sample,
    /** Hold the mouse inside the page (on a click) while fighting. */
    capture(on) {
      state.wantLock = on;
      if (on) canvas.requestPointerLock?.();
      else if (document.pointerLockElement === canvas) document.exitPointerLock?.();
    },
    setYaw(y) {
      state.yaw = y;
    },
    clear() {
      down.clear();
      state.attack = state.guard = false;
      for (const k of Object.keys(state.once)) state.once[k] = false;
    },
    dispose() {
      pads.dispose();
      canvas.removeEventListener('mousemove', onMove);
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
