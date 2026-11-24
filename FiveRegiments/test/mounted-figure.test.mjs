import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { createFight, TICK } from '../src/sim/fight.mjs';
import { createMotion } from '../src/view/motion.mjs';
import { dot, len, sub, unit } from '../src/view/rig.mjs';

const root = new URL('../', import.meta.url);
const imports = JSON.parse(readFileSync(new URL('vendor/importmap.json', root), 'utf8')).imports;
const hook = registerHooks({
  resolve(specifier, context, next) {
    return next(imports[specifier] ? new URL(imports[specifier], root).href : specifier, context);
  }
});
const [{ Scene3D, loadGltf3D }, { createFigure }, { createHorse }] = await Promise.all([
  import('@egret/engine/world3d'), import('../src/view/figure.mjs'), import('../src/view/horse.mjs')
]);
hook.deregister();

const asset = (path) => readFileSync(new URL('assets/' + path, root));
const loadBody = (name) => loadGltf3D(asset('characters/' + name + '-low.glb'), {
  decodeImage: async () => ({ data: new Uint8Array(4), width: 1, height: 1 })
});

test('a mounted rider turns through the rear seam without snapping his shoulders or head', async () => {
  const [body, horseBody] = await Promise.all([loadBody('plume'), loadBody('horse')]);
  const bin = asset('motion/plume.bin');
  const motion = createMotion(JSON.parse(asset('motion/plume.json')), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
  const world = new Scene3D();
  const figure = createFigure({ regiment: 'plume', world, motion, body });
  const horse = createHorse({ world, body: horseBody });
  try {
    const game = createFight({ hero: { regiment: 'plume' }, foes: [{ regiment: 'tiger' }] });
    const man = game.hero;
    const point = (name) => figure.rig.bone(name).localToWorld([0, 0, 0], [0, 0, 0]);
    function pose(horseYaw, aimYaw) {
      man.face = aimYaw;
      man.horse.face = horseYaw;
      horse.update(man.horse, TICK);
      const seat = horse.seat();
      figure.update(man, game, TICK, { seat });
      figure.holder.updateWorldMatrices(true);
      return { seat: seat.at, shoulder: unit(sub(point('upperarm_l'), point('upperarm_r'))), head: point('head'), hand: point('hand_r') };
    }

    for (let i = 0; i < 30; i++) pose(Math.PI - 0.01, 0);
    const before = pose(Math.PI - 0.01, 0);
    const after = pose(-Math.PI + 0.01, 0);
    assert.ok(len(sub(before.seat, after.seat)) < 0.005, 'the saddle had no position jump');
    assert.ok(dot(before.shoulder, after.shoulder) > Math.cos(0.1), 'the shoulder line snapped across the rear-facing seam');
    assert.ok(len(sub(before.head, after.head)) < 0.04, 'the head jumped across the saddle');
    assert.ok(len(sub(before.hand, after.hand)) < 0.04, 'the weapon hand jumped across the saddle');

    const forward = pose(0, 0);
    const aimed = pose(0, 0.95);
    assert.ok(dot(forward.shoulder, aimed.shoulder) < Math.cos(0.6), 'forward-sector steering still turns the upper body');
  } finally {
    figure.dispose();
    horse.dispose();
    horseBody.dispose();
  }
});
