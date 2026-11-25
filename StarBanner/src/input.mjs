// 操作：把键盘、鼠标、触屏和手柄都翻成同一组指令（光标移动、确定、取消、转视角、下一个单位、威胁范围、菜单），
// 再加上直接指向某一格的点按。按住方向键会先停一下再连续移动，手柄摇杆同理。
// Input: keys, mouse, touch and gamepad all become one set of commands (move the cursor, confirm, cancel, turn the
// view, next unit, threat, menu), plus pointing straight at a tile. A held direction waits a moment and then repeats;
// the gamepad stick does the same.
import { createGamepadInput } from '@egret/engine/input/gamepad';

const KEYS = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Enter: 'confirm',
  Space: 'confirm',
  KeyZ: 'confirm',
  NumpadEnter: 'confirm',
  Escape: 'cancel',
  Backspace: 'cancel',
  KeyX: 'cancel',
  KeyQ: 'turnLeft',
  KeyE: 'turnRight',
  Tab: 'next',
  KeyR: 'threat',
  KeyM: 'menu',
  KeyF: 'endTurn',
  Equal: 'zoomIn',
  NumpadAdd: 'zoomIn',
  Minus: 'zoomOut',
  NumpadSubtract: 'zoomOut'
};
const DIRS = ['up', 'right', 'down', 'left'];

/**
 * Listens on `canvas` and the window. `on(command, detail)` is told each command; `point(px, py)` and `tap(px, py,
 * button)` carry the pointer in CSS pixels of the canvas; `pan(dx, dy)` and `zoom(f)` the view gestures. `active()`
 * says whether the game wants the keys now (menus handle their own).
 */
export function createInput(canvas, { on, point, tap, pan, zoom, active = () => true }) {
  const held = new Map();
  let lastDevice = 'mouse';
  const onKey = (e) => {
    const command = KEYS[e.code];
    if (!command || !active()) return;
    // Enter and Space on a focused button press it the browser's way; everything else is ours.
    if (command === 'confirm' && e.target && e.target !== document.body && e.target !== canvas && e.target.closest?.('button, input, select')) return;
    e.preventDefault();
    lastDevice = 'keys';
    if (e.type === 'keyup') {
      held.delete(command);
      return;
    }
    if (e.repeat) return;
    if (DIRS.includes(command)) held.set(command, { since: performance.now(), next: performance.now() + 260 });
    on(command, { device: 'keys', reverse: e.shiftKey });
  };
  addEventListener('keydown', onKey);
  addEventListener('keyup', onKey);

  // ---- pointer: hover, click, drag to pan, wheel and pinch to zoom ----
  const pointers = new Map();
  let drag = null,
    pinch = null;
  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const release = () => {
    held.clear();
    for (const id of pointers.keys()) {
      if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
    }
    pointers.clear();
    drag = null;
    pinch = null;
  };
  addEventListener('blur', release);
  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus({ preventScroll: true });
    lastDevice = e.pointerType === 'touch' ? 'touch' : 'mouse';
    pointers.set(e.pointerId, local(e));
    canvas.setPointerCapture?.(e.pointerId);
    if (pointers.size === 1) drag = { start: local(e), last: local(e), moved: false, button: e.button };
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) };
      drag = null;
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = local(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch.d > 0) zoom(d / pinch.d);
      pinch.d = d;
      return;
    }
    if (drag) {
      const dx = p[0] - drag.last[0],
        dy = p[1] - drag.last[1];
      if (!drag.moved && Math.hypot(p[0] - drag.start[0], p[1] - drag.start[1]) > (e.pointerType === 'touch' ? 14 : 8)) drag.moved = true;
      if (drag.moved) pan(dx, dy);
      drag.last = p;
      return;
    }
    if (e.pointerType !== 'touch') {
      lastDevice = 'mouse';
      point(p[0], p[1]);
    }
  });
  const up = (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (drag && !drag.moved && active()) tap(p[0], p[1], drag.button);
    if (pointers.size === 0) drag = null;
  };
  canvas.addEventListener('pointerup', up);
  const cancelPointer = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    drag = null;
    pinch = null;
  };
  canvas.addEventListener('pointercancel', cancelPointer);
  canvas.addEventListener('lostpointercapture', cancelPointer);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12);
    },
    { passive: false }
  );

  // ---- gamepad ----
  const pads = createGamepadInput({ deadZone: 0.3, maxPads: 1 });
  let padClock = 0,
    padPrev = {},
    stickHeld = null;
  const clamp = (v, least) => Math.max(least, Math.min(1, Number.isFinite(v) ? v : 0));
  function readPad(seconds) {
    const found = Array.from(navigator.getGamepads?.() ?? []).filter((p) => p?.connected).slice(0, 1);
    padClock += seconds * 1000;
    pads.sample(
      found.map((p) => ({ index: p.index, id: p.id, mapping: p.mapping, buttons: [...p.buttons].slice(0, 64).map((b) => ({ pressed: !!b.pressed, value: clamp(b.value, 0) })), axes: [...p.axes].slice(0, 16).map((v) => clamp(v, -1)) })),
      padClock
    );
    const pad = pads.pads[0];
    if (!pad?.standard) return;
    const b = (n) => pad.pressed(n);
    const now = { a: b('a'), b: b('b'), x: b('x'), y: b('y'), lb: b('l1'), rb: b('r1'), start: b('start'), select: b('select'), up: b('up'), down: b('down'), left: b('left'), right: b('right') };
    const fresh = (k) => now[k] && !padPrev[k];
    const map = { a: 'confirm', b: 'cancel', x: 'threat', y: 'next', lb: 'turnLeft', rb: 'turnRight', start: 'menu', select: 'endTurn' };
    if (active()) {
      for (const [k, command] of Object.entries(map))
        if (fresh(k)) {
          lastDevice = 'pad';
          on(command, { device: 'pad' });
        }
      for (const d of DIRS)
        if (fresh(d)) {
          lastDevice = 'pad';
          held.set(d, { since: performance.now(), next: performance.now() + 260, pad: true });
          on(d, { device: 'pad' });
        } else if (!now[d] && held.get(d)?.pad) held.delete(d);
      const { x, y } = pad.stick('left');
      const dir = Math.hypot(x, y) < 0.5 ? null : Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
      if (dir !== stickHeld) {
        if (stickHeld) held.delete(stickHeld);
        stickHeld = dir;
        if (dir) {
          lastDevice = 'pad';
          held.set(dir, { since: performance.now(), next: performance.now() + 260, pad: true });
          on(dir, { device: 'pad' });
        }
      }
      const r = pad.stick('right');
      if (Math.hypot(r.x, r.y) > 0.3) pan(-r.x * seconds * 600, -r.y * seconds * 600);
    }
    padPrev = now;
  }

  return {
    /** Each frame: repeats held directions, reads the gamepad. */
    update(seconds) {
      readPad(seconds);
      const now = performance.now();
      for (const [command, h] of held)
        if (now >= h.next) {
          h.next = now + 85;
          if (active()) on(command, { device: h.pad ? 'pad' : 'keys', repeat: true });
        }
    },
    get lastDevice() {
      return lastDevice;
    },
    release
  };
}
