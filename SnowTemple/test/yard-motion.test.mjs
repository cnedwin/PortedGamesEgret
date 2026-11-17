import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { FOES, HERO } from '../src/rules/tune.mjs';
import { HANDS, YARD_BONES, YARD_GRIPS } from '../src/view/rig.mjs';

// Use the same World3D modules and packs as the browser, with the HTML import map resolved in Node.
const aliases = {
  '@egret/engine/world3d': '../vendor/engine/dist/rendering/world3d/index.js',
  '@egret/runtime': '../vendor/runtime/dist/index.js',
  '@egret/contracts': '../vendor/contracts/dist/index.js',
  '@egret/contracts/resources': '../vendor/contracts/dist/resources/index.js'
};
registerHooks({ resolve(name, context, next) {
  return next(aliases[name] ? new URL(aliases[name], import.meta.url).href : name, context);
} });
const { createFigure, foePose, heroPose, pose } = await import('../src/view/figures.mjs');
const { loadModels, loadStockCharacters } = await import('../src/view/models.mjs');
const realFetch = globalThis.fetch;
let models;
try {
  globalThis.fetch = async (url) => new Response(await readFile(url));
  models = await loadModels('low');
  Object.assign(models, await loadStockCharacters());
} finally {
  globalThis.fetch = realFetch;
}

const DT = 1 / 60;
const world = (node, point) => node.localToWorld([0, 0, 0], point);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const scaled = (point, factor) => point.map((axis) => axis * factor);
const foeState = (kind) => ({ id: 1, kind, sheet: FOES[kind], state: 'roam', t: 0, x: 0, z: 0, face: 0, walking: true });

test('Lin Chong runs at game speed with planted boots and a moving free arm', () => {
  const figure = createFigure('hero', models, 'low');
  const hero = { state: 'ready', x: 0, z: 0, face: 0, moving: true };
  const previous = {}, sliding = [], leftArm = [];
  let contacts = 0;
  for (let i = 1; i <= 240; i++) {
    hero.z = i * DT * HERO.speed;
    const [target, rate] = heroPose(hero, HERO, i * DT, hero.z, 0, figure.gait, DT);
    figure.root.setPosition(0, 0, hero.z);
    pose(figure, target, rate, DT);
    if (i <= 60) continue;
    leftArm.push(figure.angles.armL[0]);
    for (const side of ['L', 'R']) {
      const contact = target['contact' + side];
      const sole = world(figure.joints['foot' + side], [0, -.073, .055]);
      const last = previous[side];
      if (last?.contact < .55 && contact >= .55) contacts++;
      if (last?.contact > .78 && contact > .78) sliding.push(Math.hypot(sole[0] - last.sole[0], sole[2] - last.sole[2]) / DT);
      previous[side] = { contact, sole };
    }
  }
  sliding.sort((a, b) => a - b);
  assert(sliding.length > 20, 'measured planted frames');
  assert(sliding[Math.floor(sliding.length * .95)] < 1.1, 'planted feet stay close to their contact point');
  assert(contacts / 3 < 4, 'full-speed gait has a measured running cadence');
  assert(Math.max(...leftArm) - Math.min(...leftArm) > .12, 'free arm follows the running rhythm');
});

test('Lu Qian does not repeatedly lose the same foot contact at high refresh', () => {
  const figure = createFigure('lu', models, 'low');
  const foe = foeState('lu');
  const dt = 1 / 144;
  const previous = {};
  let count = 0;
  for (let i = 1; i <= 576; i++) {
    foe.z = Math.floor(i * 60 / 144) / 60 * foe.sheet.speed;
    const [target, rate] = foePose(foe, i * dt, foe.z, figure.gait, dt);
    figure.root.setPosition(0, 0, foe.z);
    pose(figure, target, rate, dt);
    if (i <= 144) continue;
    for (const side of ['L', 'R']) {
      const contact = target['contact' + side];
      if (previous[side] < .55 && contact >= .55) count++;
      previous[side] = contact;
    }
  }
  assert(count / 3 < 4.2, 'render frames between simulation ticks do not create extra footfalls');
});

function move(kind, speedFactor) {
  const foe = foeState(kind);
  const figure = createFigure(kind, models, 'low');
  const step = foe.sheet.speed * speedFactor * DT;
  const knees = [];
  for (let i = 0; i < 150; i++) {
    foe.z += step;
    const [target, smoothing] = foePose(foe, i * DT, foe.z, figure.gait, DT);
    pose(figure, target, smoothing, DT);
    if (i > 20) knees.push(target.shinL[0]);
  }
  return { figure, kneePeak: Math.max(...knees) };
}

for (const kind of ['blade', 'shield', 'bow']) {
  test(`${kind}: its packed ankle and palm bones follow the walk and run within its existing speed`, () => {
    const joints = models[kind].getAttribute('joints').data;
    const used = new Set(joints);
    assert(joints.every((joint) => joint < YARD_BONES.length));
    for (const joint of ['footL', 'footR', 'palmL', 'palmR']) assert(used.has(YARD_BONES.indexOf(joint)));
    const walk = move(kind, 0.42), run = move(kind, 1);
    assert(Math.abs(run.figure.gait.speed - FOES[kind].speed) < 0.001);
    assert(run.kneePeak > walk.kneePeak + 0.2);
  });
}

test('blade and shield use a physical handle and the shield leads during a bash', () => {
  const blade = move('blade', 1).figure;
  const shield = move('shield', 1).figure;
  for (const figure of [blade, shield]) {
    assert(distance(world(figure.joints.palmR, HANDS.R.grip), world(figure.joints.weapon, [0, 0, 0])) < 0.0005);
  }
  const checkShield = () => assert(distance(
    world(shield.joints.palmL, HANDS.L.grip),
    world(shield.joints.off, scaled(YARD_GRIPS.shield, shield.look.offScale))
  ) < 0.0005);
  checkShield();
  const foe = { ...foeState('shield'), move: FOES.shield.moves.bash, walking: false, state: 'strike' };
  const [attack, smoothing] = foePose(foe, 0, 0, shield.gait, DT);
  for (let i = 0; i < 20; i++) pose(shield, attack, smoothing, DT);
  checkShield();
  assert(world(shield.joints.palmL, HANDS.L.grip)[2] > world(shield.joints.palmR, HANDS.R.grip)[2] + 0.25);
});

test('the archer holds the riser and pulls the middle of the cord before release', () => {
  const figure = createFigure('bow', models, 'low');
  const foe = { ...foeState('bow'), move: FOES.bow.moves.shot, walking: false, state: 'windup', t: FOES.bow.moves.shot.windup };
  const [draw, smoothing] = foePose(foe, 0, 0, figure.gait, DT);
  for (let i = 0; i < 30; i++) pose(figure, draw, smoothing, DT);
  const { off, palmL, palmR } = figure.joints;
  assert(distance(world(palmL, HANDS.L.grip), world(off, scaled(YARD_GRIPS.bow, figure.look.offScale))) < 0.0005);
  const pulled = world(palmR, HANDS.R.grip);
  const segment = figure.string[0];
  const endpoints = () => [world(segment, [0, -0.5, 0]), world(segment, [0, 0.5, 0])];
  assert(Math.min(...endpoints().map((point) => distance(point, pulled))) < 0.0005);
  const rest = world(off, [0, 0, YARD_GRIPS.bowTipZ * figure.look.offScale]);
  assert(distance(pulled, rest) > 0.18);

  foe.state = 'strike';
  const [release, releaseSmoothing] = foePose(foe, 0, 0, figure.gait, DT);
  pose(figure, release, releaseSmoothing, DT);
  const slack = world(off, [0, 0, YARD_GRIPS.bowTipZ * figure.look.offScale]);
  assert(Math.min(...endpoints().map((point) => distance(point, slack))) < 0.0005);
});
