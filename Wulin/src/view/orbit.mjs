// The camera: it circles a point on the ground. Drag turns it, the wheel or a
// pinch zooms, and two fingers (or the right button) slide the point along the
// ground. It also says where a point of the world falls on the page, which
// places labels over fighters and tells which fighter a tap landed on.
import { projectToViewport3D } from '@egret/engine/world3d';
import { clamp } from '../core/rng.mjs';

/**
 * @param canvas the canvas the player drags on
 * @returns the camera's rig; set its fields, then `apply(camera)` each frame
 */
export function createOrbit(canvas, { game, pointerSurface } = {}) {
  const orbit = {
    target: [0, 0, 0],
    yaw: 0,
    pitch: 0.7,
    distance: 40,
    /** Limits a scene sets for itself. */
    minDistance: 8,
    maxDistance: 120,
    minPitch: 0.25,
    maxPitch: 1.35,
    /** How far the point may slide from the origin. */
    reach: 40,
    /** Radians a second the camera drifts round while nobody touches it. */
    drift: 0,
    /** On a map a plain drag slides the view and the right button turns it; elsewhere it is the other way round. */
    dragPans: false,
    /** Called with page coordinates when the player taps without dragging. */
    onTap: null,
    /** Increments on manual camera gestures, so a scene can yield automatic framing. */
    gestureVersion: 0,
    position: [0, 0, 0],
    set(view) {
      Object.assign(orbit, view);
      idle = 0;
    },
    /** Moves the camera to where the rig says, easing a little so it never jumps. */
    apply(camera, dt = 0.016) {
      idle += dt;
      if (orbit.drift && idle > 4 && !pointers.size) orbit.yaw += orbit.drift * dt;
      const flat = Math.cos(orbit.pitch) * orbit.distance;
      orbit.position = [orbit.target[0] + Math.sin(orbit.yaw) * flat, orbit.target[1] + Math.sin(orbit.pitch) * orbit.distance, orbit.target[2] + Math.cos(orbit.yaw) * flat];
      camera.setPosition(...orbit.position);
      camera.lookAt(...orbit.target);
      appliedCamera = camera;
    },
    /**
     * Where a point of the world is on the canvas, in CSS pixels from its top
     * left corner; `null` when it is behind the camera.
     */
    project(x, y, z) {
      if (!appliedCamera) return null;
      appliedCamera.updateViewMatrices();
      const at = projectToViewport3D(appliedCamera, [x, y, z], canvas.clientWidth, canvas.clientHeight);
      return at.inFront ? at : null;
    },
  };
  let appliedCamera, idle = 0;
  const pointers = new Map();
  let moved = 0,
    pinch = 0,
    twist = null,
    canTap = false;
  const slide = (dx, dy) => {
    const k = orbit.distance / Math.max(300, canvas.clientHeight);
    const cos = Math.cos(orbit.yaw),
      sin = Math.sin(orbit.yaw);
    orbit.target[0] = clamp(orbit.target[0] - (dx * cos + dy * sin) * k, -orbit.reach, orbit.reach);
    orbit.target[2] = clamp(orbit.target[2] - (-dx * sin + dy * cos) * k, -orbit.reach, orbit.reach);
  };
  const turn = (dx, dy) => {
    orbit.yaw -= dx * .006;
    orbit.pitch = clamp(orbit.pitch + dy * .005, orbit.minPitch, orbit.maxPitch);
  };

  // The game uses Play's single routed contact stream. Its recognizers own
  // capture, multi-touch, viewport changes and the cancellation lifecycle.
  // The standalone 3D model tools still work without the Play host below.
  if (game && pointerSurface) {
    const input = game.browser.pointer;
    let enabled = true, tapAllowed = false, alternate = false, pinchStart, secondaryDrag;
    const cssScale = () => {
      const box = game.canvas.getBoundingClientRect();
      const screen = game.browser.screen;
      return { x: box.width / screen.width, y: box.height / screen.height };
    };
    const stopObserving = input?.observe(({kind, target, contact}) => {
      const {session} = contact;
      if (kind === 'begin' && target === pointerSurface && enabled) {
        pointers.set(session.id, contact);
        if (pointers.size === 1) {
          const secondary = session.pointerType === 'mouse' && !!(contact.buttons & 2) && !(contact.buttons & 1);
          alternate = secondary || game.keys.down('shift');
          tapAllowed = !alternate;
          // engine-note: Play gestures intentionally route only primary drags. Keep the
          // secondary camera gesture on the same captured pointer contact stream.
          if (secondary) {
            secondaryDrag = { id: session.id, x: contact.globalX, y: contact.globalY, moved: false };
          }
        } else {
          tapAllowed = false;
          secondaryDrag = null;
        }
        idle = 0;
      } else if (kind === 'move' && enabled && secondaryDrag?.id === session.id) {
        if (!(contact.buttons & 2)) { secondaryDrag = null; return; }
        const dx = contact.globalX - secondaryDrag.x, dy = contact.globalY - secondaryDrag.y;
        // Match the primary gesture recognizer: keep the initial movement until
        // it exceeds its 12 stage-unit slop; then consume successive deltas.
        if (!secondaryDrag.moved && Math.hypot(dx, dy) <= 12) return;
        secondaryDrag.moved = true;
        secondaryDrag.x = contact.globalX;
        secondaryDrag.y = contact.globalY;
        const scale = cssScale();
        if (orbit.dragPans) turn(dx * scale.x, dy * scale.y);
        else slide(dx * scale.x, dy * scale.y);
        orbit.gestureVersion++;
        idle = 0;
      } else if (kind === 'end' || kind === 'cancel') {
        if (secondaryDrag?.id === session.id) secondaryDrag = null;
        if (pointers.delete(session.id) && kind === 'cancel') tapAllowed = false;
      }
    });
    const stopGestures = game.gestures(pointerSurface, {
      drag(drag) {
        if (!enabled || secondaryDrag) return;
        if (drag.phase === 'start' || drag.phase === 'move') {
          const scale = cssScale(), dx = drag.dx * scale.x, dy = drag.dy * scale.y;
          tapAllowed = false;
          idle = 0;
          orbit.gestureVersion++;
          if (alternate !== !!orbit.dragPans) slide(dx, dy);
          else turn(dx, dy);
        }
      },
      pinch(pinch) {
        if (!enabled) return;
        tapAllowed = false;
        if (pinch.phase === 'start') pinchStart = { distance: orbit.distance, yaw: orbit.yaw, x: pinch.x, y: pinch.y };
        else if (pinch.phase === 'move' && pinchStart) {
          const scale = cssScale();
          orbit.distance = clamp(pinchStart.distance / Math.max(.001, pinch.scale), orbit.minDistance, orbit.maxDistance);
          orbit.yaw = pinchStart.yaw - pinch.rotation * Math.PI / 180;
          slide((pinch.x - pinchStart.x) * scale.x, (pinch.y - pinchStart.y) * scale.y);
          pinchStart.x = pinch.x;
          pinchStart.y = pinch.y;
          orbit.gestureVersion++;
          idle = 0;
        } else pinchStart = null;
      },
    });
    game.onTap(pointerSurface, (activation) => {
      if (!enabled || !tapAllowed || pointers.size !== 1 || activation.stageX === undefined) return;
      tapAllowed = false;
      const scale = cssScale(), from = game.canvas.getBoundingClientRect(), to = canvas.getBoundingClientRect();
      orbit.onTap?.(from.left - to.left + activation.stageX * scale.x, from.top - to.top + activation.stageY * scale.y);
    });
    orbit.setInputEnabled = (next) => {
      next = !!next;
      if (enabled === next) return;
      enabled = next;
      if (!enabled) {
        pointerSurface.touchEnabled = false;
        input?.cancelAll('owner');
        pointers.clear();
        tapAllowed = false;
        pinchStart = null;
        secondaryDrag = null;
      } else pointerSurface.touchEnabled = true;
    };
    // Play's wheel value is consumed/reset on its own update, alongside
    // scroll-panel wheel handling. Invoke this from the game's update step.
    orbit.updateNative = () => {
      const wheel = game.pointer.wheel;
      if (!enabled || !wheel) return;
      tapAllowed = false;
      orbit.distance = clamp(orbit.distance * Math.exp(wheel * .12), orbit.minDistance, orbit.maxDistance);
      orbit.gestureVersion++;
      idle = 0;
    };
    orbit.dispose = () => { stopObserving?.(); stopGestures(); };
    return orbit;
  }
  orbit.setInputEnabled = () => {};
  orbit.updateNative = () => {};
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, button: event.button });
    if (pointers.size === 1) moved = 0;
    canTap = pointers.size === 1 && event.button === 0 && !event.shiftKey;
    pinch = 0;
    twist = null;
    idle = 0;
  });
  canvas.addEventListener('pointermove', (event) => {
    const last = pointers.get(event.pointerId);
    if (!last) return;
    const dx = event.clientX - last.x,
      dy = event.clientY - last.y;
    (last.x = event.clientX), (last.y = event.clientY);
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved >= 8 || pointers.size >= 2) orbit.gestureVersion++;
    idle = 0;
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const gap = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) orbit.distance = clamp((orbit.distance * pinch) / Math.max(1, gap), orbit.minDistance, orbit.maxDistance);
      pinch = gap;
      // Turning two fingers about each other turns the view.
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      if (twist !== null) orbit.yaw -= Math.atan2(Math.sin(angle - twist), Math.cos(angle - twist));
      twist = angle;
      slide(dx / 2, dy / 2);
    } else if ((last.button === 2 || event.shiftKey) !== !!orbit.dragPans) slide(dx, dy);
    else {
      orbit.yaw -= dx * 0.006;
      orbit.pitch = clamp(orbit.pitch + dy * 0.005, orbit.minPitch, orbit.maxPitch);
    }
  });
  const lift = (event) => {
    if (!pointers.delete(event.pointerId)) return;
    pinch = 0;
    twist = null;
    if (event.type === 'pointercancel') canTap = false;
    if (event.type === 'pointerup' && canTap && moved < 8 && !pointers.size) {
      const box = canvas.getBoundingClientRect();
      orbit.onTap?.(event.clientX - box.left, event.clientY - box.top);
    }
  };
  canvas.addEventListener('pointerup', lift);
  canvas.addEventListener('pointercancel', lift);
  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      canTap = false;
      orbit.distance = clamp(orbit.distance * Math.exp(event.deltaY * 0.0012), orbit.minDistance, orbit.maxDistance);
      orbit.gestureVersion++;
      idle = 0;
    },
    { passive: false },
  );
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  return orbit;
}
