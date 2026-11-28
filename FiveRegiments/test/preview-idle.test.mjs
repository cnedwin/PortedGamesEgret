import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import '../vendor/node-register.mjs';

const { Scene3D, loadGltf3D } = await import('@egret/engine/world3d');
const { createFigure } = await import('../src/view/figure.mjs');
const { createHorse } = await import('../src/view/horse.mjs');
const { createMotion } = await import('../src/view/motion.mjs');
const { createFight } = await import('../src/sim/fight.mjs');
const assets = new URL('../assets/', import.meta.url);
const expressive = ['spine_01', 'spine_03', 'spine_05', 'neck_01', 'head'];
const planted = ['pelvis', 'thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r'];
const radians = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a.reduce((n, v, i) => n + v * b[i], 0)
  / (Math.hypot(...a) * Math.hypot(...b)))));
const degrees = a => a * 180 / Math.PI;
const rotation = (fig, name) => [...fig.rig.world(name).r];
const pose = (fig, names) => names.map(name => rotation(fig, name));
const gap = (a, b) => Math.max(...a.map((v, i) => degrees(radians(v, b[i]))));

test('the display clock freezes behind other sheets and restarts gently after motion is disabled', async () => {
  const { createPreviewIdleClock } = await import('../src/view/preview-idle.mjs');
  const clock = createPreviewIdleClock();
  assert.equal(clock.update(0), 0);
  assert.equal(clock.update(.1), .1);
  assert.equal(clock.update(.2, { playing: false }), .1);
  assert.equal(clock.update(.1, { still: true }), undefined);
  assert.equal(clock.update(0), 0);
  assert.equal(clock.update(NaN), 0);
  assert.equal(clock.update(.1), .1);
});

test('preview idle offsets are stable for the five contrasting silhouettes', async () => {
  const { previewIdleOffset } = await import('../src/view/preview-idle.mjs');
  const ids = ['yulin', 'tiger', 'vanguard', 'plume', 'archer'];
  const first = ids.map(previewIdleOffset);
  assert.equal(new Set(first).size, ids.length);
  assert(first.every(value => value >= 0 && value < 1));
  assert.deepEqual(ids.map(previewIdleOffset), first);
});

test('the five real preview rigs display a restrained moving idle without advancing their fictional match or changing the planted pose', async t => {
  for (const id of ['yulin', 'tiger', 'vanguard', 'plume', 'archer']) {
    const bin = readFileSync(new URL(`motion/${id}.bin`, assets));
    const motion = createMotion(JSON.parse(readFileSync(new URL(`motion/${id}.json`, assets))), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
    const body = await loadGltf3D(readFileSync(new URL(`characters/${id}-low.glb`, assets)), {
      decodeImage: async () => ({ data: new Uint8Array(4), width: 1, height: 1 })
    });
    const fig = createFigure({ regiment: id, world: new Scene3D(), motion, body });
    try {
      const game = createFight({ hero: { regiment: id }, foes: [{ regiment: 'yulin' }] });
      const man = game.hero;
      Object.assign(man, { mounted: false, guard: false, draw: false, act: null, stun: 0, face: 0 });
      const originalTime = game.time, originalPosition = [man.x, man.z];
      for (let i = 0; i < 90; i++) fig.update(man, game, 1 / 60, { preview: true });
      const still = pose(fig, expressive), feet = pose(fig, planted);
      let previous = still, peak = 0, jump = 0;
      for (let frame = 0; frame < 240; frame++) {
        fig.update(man, game, 1 / 60, { preview: true, previewTime: frame / 60 });
        const current = pose(fig, expressive);
        if (frame === 0) assert(gap(current, still) < .05, `${id}: preview start snapped`);
        peak = Math.max(peak, gap(current, still));
        jump = Math.max(jump, gap(current, previous));
        assert(gap(pose(fig, planted), feet) < .05, `${id}: ground pose changed`);
        previous = current;
      }
      assert(peak > .45, `${id}: preview remains static (${peak.toFixed(3)} degrees)`);
      assert(peak < 18, `${id}: decorative movement exceeds its restrained envelope`);
      assert(jump < 4, `${id}: decorative playback jumps between shown frames`);
      fig.update(man, game, 1 / 60, { preview: true });
      assert(gap(pose(fig, expressive), still) < .05, `${id}: static/reduced-motion pose changed`);
      assert.equal(game.time, originalTime);
      assert.deepEqual([man.x, man.z], originalPosition);
      t.diagnostic(`${id}: max preview pose excursion ${peak.toFixed(2)}°, max delta ${jump.toFixed(2)}°`);
    } finally { fig.dispose(); }
  }
});

test('a seated showcase figure also animates expressively while its seat and lower body remain where they were', async t => {
  const id = 'plume';
  const bin = readFileSync(new URL(`motion/${id}.bin`, assets));
  const motion = createMotion(JSON.parse(readFileSync(new URL(`motion/${id}.json`, assets))), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
  const decodeImage = async () => ({ data: new Uint8Array(4), width: 1, height: 1 });
  const body = await loadGltf3D(readFileSync(new URL(`characters/${id}-low.glb`, assets)), { decodeImage });
  const horseBody = await loadGltf3D(readFileSync(new URL('characters/horse-low.glb', assets)), { decodeImage });
  const world = new Scene3D();
  const fig = createFigure({ regiment: id, world, motion, body });
  const horse = createHorse({ world, body: horseBody });
  try {
    const game = createFight({ hero: { regiment: id }, foes: [{ regiment: 'yulin' }] });
    const man = game.hero;
    assert(man.mounted && man.horse);
    Object.assign(man, { face: 0, guard: false, draw: false, act: null, stun: 0 });
    horse.update(man.horse, 1 / 60);
    const seat = horse.seat(), options = { preview: true, seat };
    for (let i = 0; i < 90; i++) fig.update(man, game, 1 / 60, options);
    const still = pose(fig, expressive), feet = pose(fig, planted);
    const location = [...fig.holder.getWorldPosition()];
    let peak = 0;
    for (let i = 0; i < 240; i++) {
      fig.update(man, game, 1 / 60, { ...options, previewTime: i / 60 });
      peak = Math.max(peak, gap(pose(fig, expressive), still));
      assert(gap(pose(fig, planted), feet) < .05);
      assert.deepEqual([...fig.holder.getWorldPosition()], location);
    }
    assert(peak > .45 && peak < 18);
    assert.equal(game.time, 0);
    fig.update(man, game, 1 / 60, options);
    assert(gap(pose(fig, expressive), still) < .05);
    t.diagnostic(`seated preview pose excursion ${peak.toFixed(2)}°`);
  } finally {
    fig.dispose();
    horse.dispose();
    horseBody.dispose();
  }
});
