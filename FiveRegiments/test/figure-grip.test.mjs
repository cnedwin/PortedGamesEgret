import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
import { createFight, step } from '../src/sim/fight.mjs';
import { ORDER, SKILLS } from '../src/sim/regiments.mjs';
import { createMotion } from '../src/view/motion.mjs';
import { cross, dot, len, lerp3, sub, unit } from '../src/view/rig.mjs';

const gameRoot = new URL('../', import.meta.url);
const [{ Scene3D, loadGltf3D }, { createFigure }, { ARMS }] = await Promise.all([
  import('@egret/engine/world3d'), import('../src/view/figure.mjs'), import('../src/view/weapons.mjs')
]);

const dt = 1 / 60;
const assetBytes = (path) => readFileSync(new URL('assets/' + path, gameRoot));

async function lowFigure(regiment) {
  const body = await loadGltf3D(assetBytes('characters/' + regiment + '-low.glb'), {
    decodeImage: async () => ({ data: new Uint8Array(4), width: 1, height: 1 })
  });
  const motionPath = 'motion/' + regiment;
  const bin = assetBytes(motionPath + '.bin');
  const motion = createMotion(JSON.parse(assetBytes(motionPath + '.json')), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
  return createFigure({ regiment, motion, body, world: new Scene3D(), height: regiment === 'vanguard' ? 1.86 : 1.8 });
}

function chestFrame(rig) {
  const point = (bone) => rig.toBody(rig.world(bone).t);
  const left = point('upperarm_l'), right = point('upperarm_r');
  const middle = lerp3(left, right, 0.5);
  const up = unit(sub(middle, point('pelvis')));
  const forward = unit(cross(unit(sub(left, right)), up));
  return { point, middle, forward };
}

function checkGrip(figure, label, before = null) {
  const { regiment, rig, held } = figure;
  const frame = chestFrame(rig);
  const handSides = ARMS[regiment].two ? ['r', 'l'] : ['r'];
  const weapon = held[ARMS[regiment].main];
  const joints = {};
  figure.holder.updateWorldMatrices(true);
  for (const side of handSides) {
    const wrist = frame.point('hand_' + side), elbow = frame.point('lowerarm_' + side);
    assert.ok(dot(sub(wrist, frame.middle), frame.forward) >= 0.105, label + ' ' + side + ' wrist behind the chest');
    if (before) {
      assert.ok(len(sub(wrist, before[side].wrist)) < 0.2, label + ' ' + side + ' wrist jump');
      assert.ok(len(sub(elbow, before[side].elbow)) < 0.2, label + ' ' + side + ' elbow jump');
    }
    joints[side] = { wrist, elbow };
    const palm = rig.bone('hand_' + side).localToWorld([0, 0, 0], rig.hands[side].grip);
    const grip = weapon.node.localToWorld([0, 0, 0], side === 'r' ? weapon.grip ?? [0, 0, 0] : weapon.second);
    assert.ok(len(sub(palm, grip)) < 0.004, label + ' ' + side + ' palm separated from the handle');
  }
  return joints;
}

test('all five character rigs keep their wrists and grips seated during a moving four-direction cut', async () => {
  for (const regiment of ORDER) {
    const figure = await lowFigure(regiment);
    try {
      const game = createFight({ hero: { regiment }, foes: [{ regiment: 'tiger' }] });
      const man = game.men[0];
      if (regiment === 'archer') man.knife = true;
      man.vx = 0.9;
      man.vz = 0.62;
      for (const line of ['R', 'L', 'O', 'T']) {
        man.act = null;
        for (let i = 0; i < 30; i++) figure.update(man, game, dt);

        const blow = man.r.blows[line];
        const act = man.act = {
          kind: 'swing', line, t: 0, wind: blow.wind, held: 0, struck: false,
          strikeAt: blow.wind, recover: blow.recover, blow, reach: blow.reach
        };
        let before = null;
        for (let step = 0; step * dt <= blow.wind + blow.recover; step++) {
          man.face = Math.sin(step / 15) * 0.25;
          man.x += man.vx * dt;
          man.z += man.vz * dt;
          act.t = step * dt;
          const contact = !act.struck && act.t >= act.strikeAt;
          act.struck ||= contact;
          figure.update(man, game, dt);
          const label = regiment + ' ' + line + ' ' + step;
          before = checkGrip(figure, label, before);
          if (contact) {
            const [base, tip] = figure.blade();
            const heading = [Math.sin(man.face), 0, Math.cos(man.face)];
            assert.ok(dot(unit(sub(tip, base)), heading) >= 0.85, label + ' strike leaves the forward arc');
          }
        }
      }
    } finally {
      figure.dispose();
    }
  }
});

test('long axe and halberd skills keep both hands in front and on the same weapon', async () => {
  for (const [regiment, id, duration] of [['vanguard', 'wave', 0.75], ['plume', 'returnSpear', SKILLS.returnSpear.duration]]) {
    const figure = await lowFigure(regiment);
    try {
      const game = createFight({ hero: { regiment }, foes: [{ regiment: 'tiger' }] });
      const man = game.men[0];
      man.face = 0;
      man.act = { kind: 'skill', id, t: 0 };
      for (let step = 0; step * dt < duration; step++) {
        man.act.t = step * dt;
        figure.update(man, game, dt);
        checkGrip(figure, regiment + ' ' + id + ' ' + step);
      }
    } finally {
      figure.dispose();
    }
  }
});

test('Tiger Step wraps the four fingers and thumb around the jian handle', async () => {
  const figure = await lowFigure('tiger');
  const game = createFight({ hero: { regiment: 'tiger' }, foes: [{ regiment: 'yulin' }] });
  const man = game.hero;
  const { rig, held } = figure;
  const world = (node, local = [0, 0, 0]) => node.localToWorld([0, 0, 0], local);
  const at = name => world(rig.bone(name));
  function checkPose(label) {
    const handle = world(held.jian.node);
    const axis = unit(sub(world(held.jian.node, [0, 1, 0]), handle));
    for (const finger of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
      const distal = sub(at(finger + '_03_r'), handle);
      const radial = len(cross(distal, axis));
      assert.ok(radial >= 0.014 && radial < 0.045, `${label} ${finger} is ${radial.toFixed(3)}m from the handle center`);
      assert.ok(Math.abs(dot(distal, axis)) < 0.09, `${label} ${finger} crosses the guard or pommel`);
    }
    assert.ok(len(sub(at('hand_l'), handle)) > 0.19, `${label} free hand crowds the weapon hand`);
  }
  try {
    for (let i = 0; i < 30; i++) figure.update(man, game, dt);
    checkPose('ready');
    for (const line of ['R', 'L', 'O', 'T']) {
      man.guard = true;
      man.guardLine = line;
      for (let i = 0; i < 20; i++) figure.update(man, game, dt);
      checkPose('guard ' + line);
      man.guard = false;
      const blow = man.r.blows[line];
      const act = man.act = { kind: 'swing', line, t: 0, wind: blow.wind, strikeAt: blow.wind,
        recover: blow.recover, held: 0, struck: false, blow, reach: blow.reach };
      for (let time = 0; time < act.wind + act.recover; time += dt) {
        act.t = time;
        act.struck = time >= act.wind;
        figure.update(man, game, dt);
        checkPose('cut ' + line);
      }
      man.act = null;
    }
    man.act = { kind: 'skill', id: 'spin', t: 0 };
    for (let time = 0; time <= 0.5; time += dt) {
      man.act.t = time;
      figure.update(man, game, dt);
      checkPose('spin');
    }
  } finally {
    figure.dispose();
  }
});

test('Tiger Step relaxes the wrist without a tip jump after a held left cut', async () => {
  const figure = await lowFigure('tiger');
  const game = createFight({ hero: { regiment: 'tiger', at: [0, 0] }, foes: [{ regiment: 'yulin', at: [0, -9] }] });
  const { rig } = figure;
  const at = name => rig.bone(name).getWorldPosition();
  let peakBend = 0, previousTip, followFrames = 0, releases = 0, contact = false;
  try {
    for (let i = 0; i < 24; i++) figure.update(game.hero, game, dt);
    for (let i = 0; i < 58; i++) {
      const events = step(game, { hero: { line: 'L', meleeLine: 'L', meleeRelease: true,
        meleeDown: i === 0, meleeUp: i === 15, face: Math.PI } });
      releases += events.filter(e => e.type === 'swing' && e.who === 'hero').length;
      const act = game.hero.act;
      figure.update(game.hero, game, dt);
      if (!act?.struck) continue;
      const [base, tip] = figure.blade();
      if (!contact) {
        assert.ok(dot(unit(sub(tip, base)), [0, 0, -1]) > 0.85, 'contact keeps its forward line');
        contact = true;
      }
      if (act.t - act.strikeAt < 0.16) continue;
      const wrist = at('hand_r');
      const forearm = unit(sub(wrist, at('lowerarm_r')));
      const palm = unit(sub(at('middle_01_r'), wrist));
      const wristBend = Math.acos(Math.max(-1, Math.min(1, dot(forearm, palm)))) * 180 / Math.PI;
      peakBend = Math.max(peakBend, wristBend);
      if (previousTip) assert.ok(len(sub(tip, previousTip)) < 0.32, 'sword tip follows a continuous recovery arc');
      previousTip = tip;
      followFrames++;
    }
    assert.equal(releases, 1);
    assert.ok(contact && followFrames > 4);
    assert.ok(peakBend < 96, `wrist reaches ${peakBend.toFixed(1)} degrees during follow-through`);
  } finally {
    figure.dispose();
  }
});
