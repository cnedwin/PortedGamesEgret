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
 * The frame owns secondary clicks. Only the canvas handles board picks and camera gestures.
 * Point, tap and wheel coordinates are CSS pixels relative to the canvas.
 */
export function createInput(canvas, { frame, bridge, on, point, tap, pan, zoom, canNavigate, active = () => true }) {
  const held = new Map();
  let lastDevice = 'mouse';
  const onKey = (e) => {
    const command = KEYS[e.code];
    if (!command || !active()) return;
    // The engine's registered UI keys get first refusal; don't dispatch them a second time.
    if(e.type==='keyup')held.delete(command);
    if(e.defaultPrevented)return;
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
  let drag = null, pinch = null, secondary = null;
  const local = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const release = () => {
    held.clear();
    for (const id of pointers.keys()) {
      for(const surface of [canvas,bridge])if(surface?.hasPointerCapture?.(id))surface.releasePointerCapture(id);
    }
    pointers.clear();
    drag = null;
    pinch = null;
    secondary = null;
    canvas.classList.remove('panning');
  };
  addEventListener('blur', release);
  // Context menus can come from the board, HUD, dialogs or the title. Right-button release dispatches one Cancel.
  frame.addEventListener('contextmenu', (e) => e.preventDefault(), { capture: true });
  frame.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button === 2) secondary = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }, { capture: true });
  addEventListener('pointerup', (e) => {
    if (secondary?.id !== e.pointerId) return;
    const start = secondary;
    secondary = null;
    if (active() && e.button === 2 && frame.contains(e.target) && Math.hypot(e.clientX - start.x, e.clientY - start.y) <= 7) {
      lastDevice = 'mouse';
      on('cancel', { device: 'mouse' });
    }
  });
  frame.addEventListener('pointercancel', (e) => {
    if (secondary?.id === e.pointerId) secondary = null;
  });
  canvas.addEventListener('pointerdown', (e) => {
    const touch = e.pointerType === 'touch';
    if (!canNavigate() || (!touch && e.button !== 0 && e.button !== 1)) return;
    if (e.button === 1) e.preventDefault();
    canvas.focus({ preventScroll: true });
    lastDevice = touch ? 'touch' : 'mouse';
    const p = local(e);
    pointers.set(e.pointerId, p);
    // A pass-through press is forwarded by the native overlay. Capture on its actual pointer surface.
    try{(e.isTrusted||!bridge?canvas:bridge).setPointerCapture?.(e.pointerId);}catch{}
    if (pointers.size === 1) drag = { id: e.pointerId, start: p, last: p, moved: false, button: e.button, touch };
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) };
      drag = null;
      canvas.classList.remove('panning');
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = local(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (canNavigate() && pinch.d > 0 && d > 0) zoom(d / pinch.d);
      pinch.d = d;
      return;
    }
    if (drag?.id === e.pointerId) {
      const threshold = drag.touch ? 14 : drag.button === 1 ? 2 : 6;
      if (!drag.moved && Math.hypot(p[0] - drag.start[0], p[1] - drag.start[1]) <= threshold) return;
      drag.moved = true;
      if (canNavigate()) {
        if (!drag.touch) canvas.classList.add('panning');
        pan(p[0] - drag.last[0], p[1] - drag.last[1]);
      }
      drag.last = p;
      return;
    }
    if (!e.buttons && e.pointerType !== 'touch' && canNavigate()) {
      lastDevice = 'mouse';
      point(p[0], p[1]);
    }
  });
  const up = (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (drag?.id === e.pointerId) {
      const gesture = drag;
      drag = null;
      canvas.classList.remove('panning');
      const still = Math.hypot(p[0] - gesture.start[0], p[1] - gesture.start[1]) <= (gesture.touch ? 14 : 6);
      const hit=document.elementFromPoint(e.clientX,e.clientY);
      const inside = hit===canvas || (!e.isTrusted&&hit===bridge);
      if (gesture.button === 0 && e.button === 0 && still && !gesture.moved && inside && canNavigate()) {
        tap(p[0], p[1], { device: gesture.touch ? 'touch' : 'mouse' });
      }
    }
  };
  canvas.addEventListener('pointerup', up);
  const cancelPointer = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    drag = null;
    pinch = null;
    canvas.classList.remove('panning');
  };
  canvas.addEventListener('pointercancel', cancelPointer);
  canvas.addEventListener('lostpointercapture', cancelPointer);
  bridge?.addEventListener('lostpointercapture',cancelPointer);
  canvas.addEventListener('auxclick', (e) => {
    if (e.button === 1) e.preventDefault();
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!canNavigate() || !e.deltaY || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const pixels = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canvas.clientHeight : 1);
      zoom(Math.exp(-Math.max(-200, Math.min(200, pixels)) * 0.0012), local(e));
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
      if (canNavigate()&&Math.hypot(r.x, r.y) > 0.3) pan(-r.x * seconds * 600, -r.y * seconds * 600);
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
