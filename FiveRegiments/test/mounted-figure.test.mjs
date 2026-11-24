import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { createFight, step, TICK } from '../src/sim/fight.mjs';
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

async function mountedFixture() {
  const [body, horseBody] = await Promise.all([loadBody('plume'), loadBody('horse')]);
  const bin = asset('motion/plume.bin');
  const motion = createMotion(JSON.parse(asset('motion/plume.json')), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
  const world = new Scene3D();
  const figure = createFigure({ regiment: 'plume', world, motion, body });
  const horse = createHorse({ world, body: horseBody });
  return {
    figure, horse,
    dispose() {
      figure.dispose();
      horse.dispose();
      horseBody.dispose();
    }
  };
}

test('a mounted rider turns through the rear seam without snapping his shoulders or head', async () => {
  const { figure, horse, dispose } = await mountedFixture();
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
    dispose();
  }
});

test('mounted right melee stays outboard while turning and rejoins the attack direction on release', async () => {
  const { figure, horse, dispose } = await mountedFixture();
  try {
    const game = createFight({ hero: { regiment: 'plume', at: [0, 0] }, foes: [{ regiment: 'tiger', at: [6.75, 7.5] }] });
    const man = game.hero;
    man.face = man.horse.face = 0;
    const reins = { throttle: 0.9, turn: 0.18 };
    const tick = (input = {}) => {
      const events = step(game, { hero: { face: 0, ...input } });
      horse.update(man.horse, TICK);
      figure.update(man, game, TICK, { seat: horse.seat() });
      return events;
    };
    for (let i = 0; i < 67; i++) tick();
    for (let i = 0; i < 21; i++) tick({ reins });
    const gesture = (i) => ({ reins, face: Math.min(0.72, i * 0.041), line: 'R', meleeLine: 'R', meleeRelease: true,
      meleeDown: i === 0, meleeUp: i === 29 });
    const angleFrom = (heading) => {
      const [base, tip] = figure.blade();
      const [x, , z] = sub(tip, base);
      return Math.atan2(x * Math.cos(heading) - z * Math.sin(heading), x * Math.sin(heading) + z * Math.cos(heading));
    };
    const checkGrip = () => {
      const weapon = figure.held.ji;
      const support = weapon.node.localToWorld([0, 0, 0], weapon.second);
      const palm = figure.rig.bone('hand_l').localToWorld([0, 0, 0], figure.rig.hands.l.grip);
      assert.ok(len(sub(palm, support)) < 0.005, 'support palm stays on the actual haft');
    };
    const events = [];
    for (let i = 0; i < 29; i++) events.push(...tick(gesture(i)));
    assert.ok(man.act.awaitingRelease && !man.act.struck);
    assert.equal(man.act.t, man.act.prepCap);
    assert.ok(!events.some(e => e.type === 'swing' || e.type === 'hit'));
    assert.ok(angleFrom(man.horse.face) < -1.2, 'right wind-up extends toward the side of the horse');
    checkGrip();

    for (let i = 29; i < 50 && !man.act.struck; i++) events.push(...tick(gesture(i)));
    assert.ok(man.act.struck && !man.act.awaitingRelease);
    assert.equal(events.filter(e => e.type === 'swing' && e.who === man.id).length, 1);
    assert.ok(Math.abs(angleFrom(man.face)) < 0.22, 'strike follows the selected attack direction');
    checkGrip();
  } finally {
    dispose();
  }
});

test('Bull Charge carries the rendered rider from the saddle onto his side and back up', async () => {
  const { figure, horse, dispose } = await mountedFixture();
  try {
    const game = createFight({ hero: { regiment: 'plume', at: [0, 3.5] },
      foes: [{ regiment: 'yulin', skills: ['bull', 'charge'], at: [0, 0] }], seed: 3,
      place: { radius: 20, posts: [] } });
    const man = game.hero;
    const point = name => Array.from(figure.rig.bone(name).localToWorld([0, 0, 0], [0, 0, 0]));
    const tracked = ['head', 'pelvis', 'lowerarm_l', 'lowerarm_r', 'hand_l', 'hand_r', 'calf_l', 'calf_r', 'ball_l', 'ball_r'];
    let previousHip, impact = -1, frame = 0, maxHipStep = 0, gotUp = false;
    for (; frame < 150; frame++) {
      const events = step(game, { hero: { mount: frame === 25 }, foe0: { skill: frame === 0 ? 0 : -1 } });
      for (const e of events) {
        if (e.type === 'thrown') impact = frame;
        if (e.type === 'hit' && e.who === man.id) figure.struck(e.heavy ?? 0, 0);
      }
      horse.update(man.horse, TICK);
      figure.update(man, game, TICK, { seat: horse.seat() });
      const hip = point('pelvis');
      if (impact >= 0) {
        const age = (frame - impact) * TICK;
        if (age < 0.4) maxHipStep = Math.max(maxHipStep, len(sub(hip, previousHip)));
        if (age < 1.55) {
          assert.equal(man.mounted, false);
          assert.ok(tracked.every(name => point(name)[1] >= -0.02), 'the rendered joints clear the floor');
        }
        if (age > 0.48 && age < 0.95) assert.ok(point('head')[1] < 0.68, 'the rider has actually landed');
        if (age > 1.5 && point('head')[1] > 1.35) gotUp = true;
      }
      previousHip = hip;
    }
    assert.ok(impact >= 0, 'actual Bull Charge knocked a living rider off his horse');
    assert.ok(maxHipStep < 0.32, `the saddle-to-ground pose jumped ${maxHipStep.toFixed(3)}m in one frame`);
    assert.ok(gotUp, 'the rider visibly gets up when he can move again');
  } finally {
    dispose();
  }
});
