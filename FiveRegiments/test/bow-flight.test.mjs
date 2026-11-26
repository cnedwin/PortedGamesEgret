import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const { imports } = JSON.parse(readFileSync(new URL('vendor/importmap.json', root), 'utf8'));
const hook = registerHooks({
  resolve(name, context, next) {
    return next(imports[name] ? new URL(imports[name], root).href : name, context);
  }
});
const [{ Scene3D }, { createEffects }] = await Promise.all([
  import('@egret/engine/world3d'), import('../src/view/effects.mjs')
]);
hook.deregister();

globalThis.OffscreenCanvas ??= class {
  getContext() {
    return {
      fillRect() {}, beginPath() {}, ellipse() {}, fill() {},
      createRadialGradient() { return { addColorStop() {} }; },
      getImageData() { return { data: new Uint8ClampedArray(64 * 64 * 4) }; }
    };
  }
};

test('the visible arrow leaves the nocked pose and quickly rejoins its unmodified flight', () => {
  const scene = new Scene3D();
  const fx = createEffects(scene);
  const shot = { by: 'hero', kind: 'arrow', x: 0, y: 1.45, z: 1.25, vx: 0, vy: 0, vz: 39 };
  const game = { shots: [shot] };
  const launch = { at: [0.27, 1.61, 0.92], direction: [0.3, 0, Math.sqrt(0.91)] };
  const dt = 1 / 60;
  let callbacks = 0;
  fx.update(dt, game, (id) => {
    assert.equal(id, 'hero');
    callbacks++;
    return launch;
  });
  const arrow = scene.children.find(node => node.name === 'arrow');
  const near = (a, b) => Math.hypot(...b.map((value, i) => value - a[i])) < 0.0001;
  const forward = () => [...arrow.localToWorld([0, 0, 0], [0, 1, 0])].map((n, i) => n - arrow.position[i]);
  assert.ok(near(arrow.position, launch.at));
  assert.ok(near(forward(), launch.direction));
  assert.deepEqual(shot, { by: 'hero', kind: 'arrow', x: 0, y: 1.45, z: 1.25, vx: 0, vy: 0, vz: 39 });
  for (let i = 0; i < 3; i++) {
    shot.z += shot.vz * dt;
    fx.update(dt, game, () => callbacks++);
  }
  assert.ok(near(arrow.position, [shot.x, shot.y, shot.z]));
  assert.ok(near(forward(), [0, 0, 1]));
  assert.equal(callbacks, 1);
});
