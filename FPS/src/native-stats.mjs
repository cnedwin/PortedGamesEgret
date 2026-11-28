// Native World3D timing, but no DOM readout. The game can present the
// existing status shape in its own native HUD or inspect it in diagnostics.
import { createWorld3DStats } from '@egret/engine/webgl2/world3d';

export function createNativeStats(renderer) {
  const native = createWorld3DStats(renderer);
  const average = { frame: 0, rules: 0, view: 0, draw: 0 };
  let enemies = 0, closed = false;
  const sync = key => { average[key] = native.average[key] ?? 0; };
  return {
    renderer, average,
    get drawCalls() { return native.drawCalls; },
    get triangles() { return native.triangles; },
    get slowest() { return native.slowest; },
    get fps() { return native.fps; },
    get enemies() { return enemies; },
    begin() {
      if (closed) return;
      native.begin(); sync('frame');
    },
    lap(name) {
      if (closed) return;
      native.lap(name); sync(name);
    },
    end(count) {
      if (closed) return;
      enemies = count;
      // The World3D view submits immediately after its update callback; this
      // is a CPU-side submit interval, not GPU execution or actual presentation.
      queueMicrotask(() => {
        if (closed) return;
        native.lap('draw'); sync('draw'); native.end();
      });
    },
    dispose() {
      if (closed) return;
      closed = true; native.dispose();
    },
  };
}
export const createStats = createNativeStats;
