// 动作数据与模型：每营的动作文件读得懂、循环片段首尾相接；每个角色模型的骨架里有动作要驱动的每一根骨头；武器、道具和场景文件都在。
// Motion and models: each regiment's motion reads, its loops join end to start; every character's skeleton has every
// bone the motion drives; the weapons' props and the places' files are present.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { createMotion, heavyFootwork, impactWeight, interpolateDirection, swingPhase } from '../src/view/motion.mjs';
import { ORDER } from '../src/sim/regiments.mjs';

const at = (p) => new URL('../' + p, import.meta.url);
function glbJson(path) {
  const b = readFileSync(at(path));
  const n = b.readUInt32LE(12);
  return JSON.parse(b.subarray(20, 20 + n).toString());
}

test('every regiment has a motion set whose loops close', () => {
  for (const r of ORDER) {
    const index = JSON.parse(readFileSync(at(`assets/motion/${r}.json`)));
    const bin = readFileSync(at(`assets/motion/${r}.bin`));
    const motion = createMotion(index, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
    for (const name of ['idle', 'walk', 'run', 'back', 'sideA', 'sideB']) {
      assert.ok(motion.has(name), `${r} ${name}`);
      const a = motion.sample(name, 0, motion.pose());
      const b = motion.sample(name, motion.duration(name), motion.pose());
      let diff = 0;
      for (let i = 0; i < motion.bones.length * 4; i++) diff = Math.max(diff, Math.abs(Math.abs(a[i]) - Math.abs(b[i])));
      assert.ok(diff < 0.2, `${r} ${name} closes (${diff.toFixed(3)})`);
    }
  }
});

test('each character, in every set, carries the bones the motion moves', () => {
  for (const r of ORDER) {
    const bones = JSON.parse(readFileSync(at(`assets/motion/${r}.json`))).bones;
    for (const set of ['high', 'mid', 'low']) {
      const j = glbJson(`assets/characters/${r}-${set}.glb`);
      const names = new Set(j.skins[0].joints.map((i) => j.nodes[i].name));
      for (const b of [...bones, 'hand_r', 'hand_l', 'index_01_r', 'pinky_01_r', 'middle_01_r']) assert.ok(names.has(b), `${r}-${set} has ${b}`);
    }
  }
});

test('the props, skies and materials the places use are all here', async () => {
  const stage = readFileSync(at('src/view/stage.mjs'), 'utf8');
  const props = new Set([...stage.matchAll(/prop: '(\w+)'|ring\('(\w+)'/g)].map((m) => m[1] ?? m[2]));
  for (const p of props) for (const set of ['high', 'mid', 'low']) assert.ok(existsSync(at(`assets/props/${p}-${set}.glb`)), `${p}-${set}`);
  for (const [, sky] of stage.matchAll(/sky: '(\w+)'/g)) assert.ok(existsSync(at(`assets/skies/${sky}.jpg`)), sky);
  for (const [, m] of stage.matchAll(/(?:material: |scanned\()'(\w+)'/g)) for (const k of ['diff', 'nor', 'arm']) assert.ok(existsSync(at(`assets/materials/${m}_${k}.jpg`)), `${m}_${k}`);
});

test('a held attack stays in anticipation until contact, with a weapon-specific follow-through', () => {
  const swing = { t: 0.32, wind: 0.4, held: 0, struck: false, recover: 0.23 };
  const firstHold = { ...swing, t: 0.4, held: 0.01 };
  assert.equal(swingPhase(swing, 'axe', true), 1);
  assert.equal(swingPhase(firstHold, 'axe', true), 1);
  const contact = { ...swing, t: 0.4, struck: true, strikeAt: 0.4 };
  assert.equal(swingPhase(contact, 'axe'), 2);
  const follow = { ...contact, t: 0.4 + swing.recover * 0.45 };
  assert.ok(swingPhase(follow, 'axe') < 3, 'the heavy blade is still following through');
  assert.ok(swingPhase(follow, 'jian') > 3, 'the light blade has started to recover');
  assert.ok(Math.abs(swingPhase({ ...contact, t: 0.4 + swing.recover }, 'axe') - 4) < 1e-9);
});

test('a reversing blade direction stays normalised across the midpoint', () => {
  const first = [0, 0, -1];
  const last = [0, 0, 1];
  const path = [0, 0.24, 0.49, 0.5, 0.51, 0.76, 1].map((time) => interpolateDirection(first, last, time));
  assert.deepEqual(path[0], first);
  assert.deepEqual(path.at(-1), last);
  for (const value of path) assert.ok(Math.abs(Math.hypot(...value) - 1) < 1e-9);
  assert.ok(path[2].reduce((sum, n, i) => sum + n * path[4][i], 0) > 0.99);
});

test('a visual impact builds quickly, then settles instead of oscillating', () => {
  assert.equal(impactWeight(0, 0), 0);
  assert.ok(impactWeight(0.055, 1) > impactWeight(0.055, 0));
  assert.ok(impactWeight(0.1, 0) > impactWeight(0.2, 0));
  assert.equal(impactWeight(0.4, 0), 0);
});

test('long-axe footwork transfers weight across the stance and settles after contact', () => {
  assert.deepEqual(heavyFootwork(0, 'R'), [0, 0, 0]);
  assert.deepEqual(heavyFootwork(4, 'R'), [0, 0, 0]);
  const load = heavyFootwork(1, 'R'), contact = heavyFootwork(2, 'R'), opposite = heavyFootwork(2, 'L');
  assert.ok(load[0] < 0 && load[1] < 0, 'gather over the rear foot');
  assert.ok(contact[0] > 0 && contact[1] > 0 && contact[2] > load[2], 'transfer and settle at contact');
  assert.ok(heavyFootwork(2, 'O')[2] > contact[2], 'overhead puts more weight through the knees');
  assert.equal(contact[0], -opposite[0]);
  assert.deepEqual(contact.slice(1), opposite.slice(1));
});
