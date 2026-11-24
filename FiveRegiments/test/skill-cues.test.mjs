import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
import { ORDER, loadout } from '../src/sim/regiments.mjs';

const [{ Scene3D }, { createEffects }] = await Promise.all([
  import('@egret/engine/world3d'), import('../src/view/effects.mjs')
]);

globalThis.OffscreenCanvas ??= class {
  getContext() {
    return {
      fillRect() {}, beginPath() {}, ellipse() {}, fill() {},
      createRadialGradient() { return { addColorStop() {} }; },
      getImageData() { return { data: new Uint8ClampedArray(64 * 64 * 4) }; }
    };
  }
};

const pose = () => [1.6, 1.3, -2.1];
const blade = () => [[1.65, 1.3, -1.7], [1.95, 1.7, -1.1]];
const defaults = ORDER.flatMap(regiment => loadout(regiment, { player: true }).skills);

test('each default cast has a distinct pooled anticipation mark even in the phone profile', () => {
  const scene = new Scene3D();
  const fx = createEffects(scene, { particles: 0.5 });
  const nodeCount = scene.children.length;
  const shapes = new Set();
  for (const id of [...defaults, 'stepCut']) {
    fx.event({ type: 'skill', id, who: 'hero' }, pose, blade);
    const visible = scene.children.filter(node => node.name === 'skill-cue' && node.visible);
    assert.equal(visible.length, 1, id);
    const [cue] = visible;
    assert.ok(!cue.castShadow, 'ground marks do not draw into the shadow map');
    assert.ok(cue.position[1] < 0.12, 'anticipation mark stays underneath its actor');
    assert.equal(scene.children.length, nodeCount);
    shapes.add([...cue.geometry.getAttribute('position').data].join(','));
    fx.clear();
  }
  assert.equal(shapes.size, new Set([...defaults, 'stepCut']).size, 'each skill has its own readable silhouette');
});

test('release and confirmed hits use skill-specific cues without expanding the phone pool', () => {
  const scene = new Scene3D();
  const fx = createEffects(scene, { particles: 0.5 });
  const nodeCount = scene.children.length;
  const shapes = new Set();
  const where = id => id === 'foe0' ? [2.3, 1.27, -0.7] : pose();
  const cues = () => scene.children.filter(node => node.name === 'skill-cue' && node.visible);
  for (const event of [
    { type: 'skillBeat', id: 'charge' }, { type: 'skillBeat', id: 'spin' }, { type: 'skillBeat', id: 'swing', part: 1 },
    { type: 'skillBeat', id: 'returnSpear' }, { type: 'skillBeat', id: 'boar', part: 1 },
    { type: 'loose', skill: 'wave', yaw: 0 }, { type: 'loose', skill: 'fan', yaw: 0 }, { type: 'loose', skill: 'gale', yaw: 0 },
    { type: 'slam', skill: 'down', at: [2.2, -0.8], radius: 2.8 }
  ]) {
    fx.event({ time: 0.55, who: 'hero', ...event }, where, blade);
    assert.equal(cues().length, 1, event.id ?? event.skill);
    shapes.add(cues()[0].geometry);
    fx.clear();
  }
  assert.equal(shapes.size, 9, 'release silhouettes stay distinct');
  fx.event({ type: 'whiff', skill: 'bull', who: 'hero', line: 'T' }, where, blade);
  assert.equal(cues().length, 0, 'missing a body does not show a hit flash');
  fx.event({ type: 'hit', skill: 'bull', who: 'foe0', by: 'hero', line: 'T', damage: 270 }, where, blade);
  assert.equal(cues().length, 1);
  assert.ok(Math.abs(cues()[0].position[1] - 1.27) < 0.25);
  fx.update(0.45, null);
  assert.equal(cues().length, 0);
  assert.equal(scene.children.length, nodeCount);
});
