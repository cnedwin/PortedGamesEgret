// The camera: it circles a point on the ground. Drag turns it, the wheel or a
// pinch zooms, and two fingers (or the right button) slide the point along the
// ground. It also says where a point of the world falls on the page, which
// places labels over fighters and tells which fighter a tap landed on.
import { clamp } from '../core/rng.mjs';

/**
 * @param canvas the canvas the player drags on
 * @returns the camera's rig; set its fields, then `apply(camera)` each frame
 */
export function createOrbit(canvas) {
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
    /** Called with page coordinates when the player taps without dragging. */
    onTap: null,
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
      fov = camera.fov;
    },
    /**
     * Where a point of the world is on the canvas, in CSS pixels from its top
     * left corner; `null` when it is behind the camera.
     */
    project(x, y, z) {
      const [px, py, pz] = orbit.position;
      // The camera's forward, right and up directions.
      let fx = orbit.target[0] - px,
        fy = orbit.target[1] - py,
        fz = orbit.target[2] - pz;
      const fl = Math.hypot(fx, fy, fz) || 1;
      (fx /= fl), (fy /= fl), (fz /= fl);
      let rx = -fz,
        rz = fx;
      const rl = Math.hypot(rx, rz) || 1;
      (rx /= rl), (rz /= rl);
      const ux = -rz * fy,
        uy = rz * fx - rx * fz,
        uz = rx * fy;
      const dx = x - px,
        dy = y - py,
        dz = z - pz;
      const depth = dx * fx + dy * fy + dz * fz;
      if (depth < 0.1) return null;
      const width = canvas.clientWidth,
        height = canvas.clientHeight,
        scale = height / 2 / Math.tan((fov * Math.PI) / 360);
      return { x: width / 2 + ((dx * rx + dz * rz) / depth) * scale, y: height / 2 - ((dx * ux + dy * uy + dz * uz) / depth) * scale, depth };
    },
  };
  let fov = 45,
    idle = 0;

  const pointers = new Map();
  let moved = 0,
    pinch = 0;
  const slide = (dx, dy) => {
    const k = orbit.distance / Math.max(300, canvas.clientHeight);
    const cos = Math.cos(orbit.yaw),
      sin = Math.sin(orbit.yaw);
    orbit.target[0] = clamp(orbit.target[0] - (dx * cos + dy * sin) * k, -orbit.reach, orbit.reach);
    orbit.target[2] = clamp(orbit.target[2] - (-dx * sin + dy * cos) * k, -orbit.reach, orbit.reach);
  };
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, button: event.button });
    if (pointers.size === 1) moved = 0;
    pinch = 0;
    idle = 0;
  });
  canvas.addEventListener('pointermove', (event) => {
    const last = pointers.get(event.pointerId);
    if (!last) return;
    const dx = event.clientX - last.x,
      dy = event.clientY - last.y;
    (last.x = event.clientX), (last.y = event.clientY);
    moved += Math.abs(dx) + Math.abs(dy);
    idle = 0;
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const gap = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) orbit.distance = clamp((orbit.distance * pinch) / Math.max(1, gap), orbit.minDistance, orbit.maxDistance);
      pinch = gap;
      slide(dx / 2, dy / 2);
    } else if (last.button === 2 || event.shiftKey) slide(dx, dy);
    else {
      orbit.yaw -= dx * 0.006;
      orbit.pitch = clamp(orbit.pitch + dy * 0.005, orbit.minPitch, orbit.maxPitch);
    }
  });
  const lift = (event) => {
    if (!pointers.delete(event.pointerId)) return;
    pinch = 0;
    if (event.type === 'pointerup' && moved < 8 && !pointers.size) {
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
      orbit.distance = clamp(orbit.distance * Math.exp(event.deltaY * 0.0012), orbit.minDistance, orbit.maxDistance);
      idle = 0;
    },
    { passive: false },
  );
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  return orbit;
}
