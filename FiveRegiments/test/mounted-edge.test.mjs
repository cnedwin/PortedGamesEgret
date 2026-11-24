import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { mountedContactPoint } from '../src/view/mounted-contact.mjs';

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

// Only sprite generation needs a canvas. The scene, cue pool and mesh are the real renderer objects.
globalThis.OffscreenCanvas ??= class {
  getContext() {
    return {
      fillRect() {}, beginPath() {}, ellipse() {}, fill() {},
      createRadialGradient() { return { addColorStop() {} }; },
      getImageData() { return { data: new Uint8ClampedArray(64 * 64 * 4) }; }
    };
  }
};

const blade = [[0, 2.09, 0.45], [0, 1.48, 1.65]];
const where = (id) => id === 'hero' ? [0, 2.15, 0] : [0, 1.3, 3];
const distance = (a, b) => Math.hypot(...Array.from(a, (value, i) => value - b[i]));
function hitAt(x, z, extra) {
  const mountedImpact = { at: [x, z], from: [0, 0], air: 0, mounted: false };
  return { type: 'hit', by: 'hero', who: 'foe0', line: 'R', time: 1.2, damage: 263, mountedImpact, ...extra };
}

function fixture() {
  const scene = new Scene3D();
  const fx = createEffects(scene, { particles: 0.5, blood: false });
  const queue = (event, edge = blade) => fx.event(event, where, () => edge);
  const draw = () => fx.update(1 / 60, null);
  const visible = () => scene.children.filter(node => node.visible && node.name === 'mounted-edge-bridge');
  return { scene, fx, queue, draw, visible };
}

function measure(mesh) {
  const positions = mesh.geometry.getAttribute('position').data;
  const centers = [], widths = [];
  for (let i = 0; i < positions.length; i += 6) {
    const a = mesh.localToWorld([0, 0, 0], positions.slice(i, i + 3));
    const b = mesh.localToWorld([0, 0, 0], positions.slice(i + 3, i + 6));
    centers.push(Array.from(a, (value, j) => (value + b[j]) * 0.5));
    widths.push(distance(a, b));
  }
  return { centers, widths };
}

test('a mounted right-cut bridge follows the blade and exact contact point and expires in place', () => {
  const { scene, fx, queue, draw, visible } = fixture();
  const nodes = scene.children.length;
  const hit = hitAt(0, 3);
  const contact = mountedContactPoint(hit.mountedImpact);
  assert.ok(distance(contact, blade[1]) > 1.12);
  queue(hit);
  draw();
  assert.equal(visible().length, 1);
  const { centers, widths } = measure(visible()[0]);
  assert.ok(distance(centers[0], blade[1]) < 0.001);
  assert.ok(distance(centers.at(-1), contact) < 0.001);
  assert.ok(widths[0] < 0.005 && widths.at(-1) < 0.005 && Math.max(...widths) < 0.12);
  assert.ok(Math.max(...centers.map(point => Math.abs(point[0]))) > 0.04);
  assert.equal(scene.children.length, nodes);
  fx.update(0.15, null);
  assert.equal(visible().length, 0);
});

test('one mounted bridge goes to the closest actual contact regardless of event order', () => {
  const { fx, queue, draw, visible } = fixture();
  const hit = hitAt(0, 3);
  const farther = hitAt(0.3, 3.3, { who: 'foe1' });
  for (const events of [[farther, hit], [hit, farther]]) {
    events.forEach(event => queue(event));
    draw();
    assert.equal(visible().length, 1);
    assert.ok(distance(measure(visible()[0]).centers.at(-1), mountedContactPoint(hit.mountedImpact)) < 0.001);
    fx.clear();
  }
  queue(farther);
  queue(hitAt(0, 2.04));
  draw();
  assert.equal(visible().length, 0, 'a farther foe does not grow an extension past an already close hit');
});

test('near hits, distant gaps, guards and misses retain their normal presentation', () => {
  const { fx, queue, draw, visible } = fixture();
  const hits = [hitAt(0, 2.04), hitAt(0, 4), hitAt(0, 3, { type: 'block' }), hitAt(0, 3, { type: 'whiff' }),
    hitAt(0, 3, { line: 'L' }), hitAt(0, 3, { graze: true }), hitAt(0, 3, { broke: true }),
    hitAt(0, 3, { mountedImpact: undefined })];
  for (const event of hits) {
    queue(event);
    draw();
    assert.equal(visible().length, 0);
    fx.clear();
  }
  queue(hitAt(0, 3));
  fx.clear();
  draw();
  assert.equal(visible().length, 0, 'teardown drops an impact still waiting to be drawn');
});
