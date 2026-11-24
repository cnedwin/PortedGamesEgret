import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { createFight, step, TICK } from '../src/sim/fight.mjs';
import { createMotion } from '../src/view/motion.mjs';

const root = new URL('../', import.meta.url);
const bytes = name => readFileSync(new URL(name, root));
const { imports } = JSON.parse(bytes('vendor/importmap.json'));
const hook = registerHooks({ resolve(name, context, next) {
  return next(imports[name] ? new URL(imports[name], root).href : name, context);
} });
const [{ Scene3D, loadGltf3D }, { createFigure }] = await Promise.all([
  import('@egret/engine/world3d'), import('../src/view/figure.mjs')
]);
hook.deregister();
const point = (node, p = [0, 0, 0]) => Array.from(node.localToWorld([0, 0, 0], p));
const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));

test('the two archer hands, arrow and flexible bow agree through a live shot', async () => {
  const body = await loadGltf3D(bytes('assets/characters/archer-low.glb'), {
    decodeImage: async () => ({ data: new Uint8Array(4), width: 1, height: 1 })
  });
  const bin = bytes('assets/motion/archer.bin');
  const motion = createMotion(JSON.parse(bytes('assets/motion/archer.json')), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
  const figure = createFigure({ regiment: 'archer', body, motion, world: new Scene3D() });
  try {
    const game = createFight({ hero: { regiment: 'archer', at: [0, 0] },
      foes: [{ regiment: 'yulin', at: [0, -9] }], place: { radius: 20, posts: [] } });
    const { rig, held } = figure;
    const arrow = figure.holder.children.find(node => node.name === 'arrow');
    const bone = name => point(rig.bone(name));
    const pinch = () => bone('index_03_r').map((x, i) => 0.5 * (x + bone('middle_03_r')[i]));
    const tick = (attack) => {
      const events = step(game, { hero: { attack, face: Math.PI, aim: { yaw: Math.PI, pitch: 0.04 } } });
      figure.update(game.hero, game, TICK);
      return events;
    };
    for (let i = 0; i < 12; i++) tick(false);
    const restSpan = distance(...held.bow.nocks);
    for (let i = 0; i < 65; i++) tick(true);
    assert.ok(arrow.visible);
    const tail = point(arrow, [0, -0.72, 0]);
    assert.ok(distance(pinch(), tail) < 0.025, 'nock is held by the fingers');
    assert.ok(distance(bone('hand_r'), tail) > 0.06, 'the string is clear of the wrist');
    assert.ok(distance(bone('head'), tail) > 0.075, 'the string stays outside the face');
    assert.ok(distance(...held.bow.nocks) < restSpan - 0.09, 'the limb tips trace the bend');
    assert.ok(distance(point(held.bow.node), point(rig.bone('hand_l'), rig.hands.l.grip)) < 0.002, 'left palm stays on the actual bow grip');
    const hand = bone('hand_r');
    const release = tick(false);
    assert.equal(release.filter(event => event.type === 'loose').length, 1);
    assert.equal(arrow.visible, false);
    assert.ok(distance(hand, bone('hand_r')) < 0.06, 'first release frame keeps the draw hand near his cheek');
    for (let i = 0; i < 3; i++) tick(false);
    assert.ok(bone('hand_r')[2] > hand[2] + 0.012, 'the draw hand follows back from the string');
    assert.ok(distance(...held.bow.nocks) > restSpan - 0.04, 'the bow limbs spring back promptly');
  } finally {
    figure.dispose();
  }
});
