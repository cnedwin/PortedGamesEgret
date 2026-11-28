// A small render-only quaternion inertia channel. It reads the authored pose, never the rules
// or event clock. Reusable storage avoids allocating a new array on every displayed frame.
export function createDecorativePoseTransition({ response = 26, lagLimit = .22 } = {}) {
  const current = new Float64Array(4);
  let ready = false;
  return {
    reset() { ready = false; },
    update(target, dt, limit = lagLimit) {
      if (!ready) { current.set(target); ready = true; return target; }
      if (!(dt > 0)) return current;
      let dot = 0;
      for (let i = 0; i < 4; i++) dot += current[i] * target[i];
      const sign = dot < 0 ? -1 : 1;
      const half = Math.acos(Math.min(1, Math.abs(dot)));
      if (half < 1e-7) { current.set(target); return target; }
      // A bounded lag preserves the target's authored expression and lets large changes
      // catch up without a long trailing head pose.
      const blend = Math.max(1 - Math.exp(-response * dt), 1 - Math.max(0, limit) / (2 * half));
      const sin = Math.sin(half);
      const a = sin > 1e-6 ? Math.sin((1 - blend) * half) / sin : 1 - blend;
      const b = (sin > 1e-6 ? Math.sin(blend * half) / sin : blend) * sign;
      let length = 0;
      for (let i = 0; i < 4; i++) { current[i] = a * current[i] + b * target[i]; length += current[i] * current[i]; }
      length = Math.sqrt(length) || 1;
      for (let i = 0; i < 4; i++) current[i] /= length;
      return current;
    }
  };
}
