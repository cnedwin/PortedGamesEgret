import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
import { HERO, FOES } from '../src/rules/tune.mjs';
import { HANDS } from '../src/view/rig.mjs';
import { attackTiming, sampleCombat } from '../src/view/combat-motion.mjs';

// The engine is found under the names the page uses: the vendored copy brings its own Node loader.
const { createFigure, heroPose, foePose, pose } = await import('../src/view/figures.mjs');
const { loadModels, loadStockCharacters } = await import('../src/view/models.mjs');
const fetchStock = globalThis.fetch;
let models;
try {
  globalThis.fetch = async (url) => new Response(await readFile(url));
  models = await loadModels('low');
  Object.assign(models, await loadStockCharacters());
} finally {
  globalThis.fetch = fetchStock;
}

const dt = 1 / 120;
const distance = (a, b) => Math.hypot(...a.map((value, axis) => value - b[axis]));
const sample = (figure, target, rate) => {
  pose(figure, target, rate, dt);
  const { hand, palmR, head, weapon } = figure.joints;
  return {
    right: palmR.localToWorld([], HANDS.R.grip),
    handle: weapon?.localToWorld([], [0,0,0]) ?? hand.getWorldPosition(),
    blade: weapon?.localToWorld([], [0,0,1]),
    head: head.getWorldPosition()[1]
  };
};

test('captured attack and dodge phase are clamped and hit the selected take marker at contact', () => {
  const marks = attackTiming(.11, .1, .27);
  const cache = sampleCombat('thrust', -1, marks);
  assert.equal(cache.phase, 0);
  const arm = cache.armR;
  assert.equal(sampleCombat('thrust', .11, marks, cache), cache);
  assert.equal(cache.phase, .5);
  assert.equal(cache.armR, arm);
  assert.equal(sampleCombat('thrust', .48, marks, cache).phase, 1);
  const lunge = FOES.lu.moves.lunge;
  const contact = lunge.windup + lunge.active * .5;
  assert.equal(sampleCombat('thrust', contact, attackTiming(lunge.windup, lunge.active, lunge.recover, contact)).phase, .5);
});

test('Lin Chong gathers, extends on the existing hit frame and follows through without dropping the spear', () => {
  for (const [index, cut] of HERO.cuts.entries()) {
    const figure = createFigure('hero', models, 'low');
    const state = { state: 'free', t: 0, moving: false };
    const [idle] = heroPose(state, HERO, 0, 0, 0, figure.gait, dt);
    state.state = 'cut';
    state.cut = index;
    const frames = [];
    const end = cut.windup + cut.active + cut.recover;
    for (let i = 0; i * dt <= end; i++) {
      state.t = i * dt;
      const [target, rate] = heroPose(state, HERO, state.t, 0, 0, figure.gait, dt);
      frames.push({ target, ...sample(figure, target, rate) });
    }
    assert(distance(idle.spine, frames[0].target.spine) < .10, 'preparation starts near the ready pose');
    assert(distance(frames[0].target.armR, frames[Math.floor(cut.windup / dt)].target.armR) > .26, 'real progression through preparation');
    const impact = frames[Math.ceil(cut.windup / dt)];
    assert(distance(impact.right, impact.handle) < .001, 'primary hand remains attached at impact');
    assert(impact.blade[2] - impact.handle[2] > .37, 'attack reads forward when the game checks damage');
    assert(distance(frames.at(-1).target.spine, idle.spine) < .12, 'recovery returns to ready');
  }
});

test('Lin Chong lowers then lifts his head within the existing dodge window', () => {
  const figure = createFigure('hero', models, 'low');
  const heights = Array.from({ length: Math.floor(HERO.dodge.time / dt) + 1 }, (_, index) => {
    const t = index * dt;
    const [target, rate] = heroPose({ state: 'dodge', t }, HERO, t, 0, 0, figure.gait, dt);
    return sample(figure, target, rate).head;
  });
  const lowest = Math.min(...heights);
  assert(heights[0] > lowest + .2 && heights.at(-1) > lowest + .16);
});

test('heavy stroke and dodge keep the rendered spear and boots out of the ground', () => {
  for (const state of [{ state: 'cut', cut: 2, end: .74 }, { state: 'dodge', end: HERO.dodge.time }]) {
    const figure = createFigure('hero', models, 'low');
    for (let i = 0; i * dt < state.end; i++) {
      const t = i * dt;
      const [target, rate] = heroPose({ ...state, t }, HERO, t, 0, 0, figure.gait, dt);
      pose(figure, target, rate, dt);
      const { weapon, footL, footR } = figure.joints;
      const lowerEnd = Math.min(...[-1.23, 1.85].map(z => weapon.localToWorld([], [0, 0, z])[1]));
      const lowerBoot = Math.min(...[footL, footR].flatMap(foot => [-.052, .15].map(z => foot.localToWorld([], [0, -.073, z])[1])));
      assert(lowerEnd > .012, state.state + ' keeps the spear above ground');
      assert(lowerBoot > -.017, state.state + ' keeps the sole out of the ground');
    }
  }
});

test('Lu Qian extends before the midpoint of the lunge strike while retaining the heavy blade', () => {
  const figure = createFigure('lu', models, 'low');
  const move = FOES.lu.moves.lunge;
  const foe = {
    id: 2, kind: 'lu', sheet: FOES.lu, state: 'windup', move, walking: false, face: 0, x: 0, z: 0
  };
  const contact = move.windup + move.active * .5;
  const frames = [];
  for (let i = 0; i <= Math.ceil(contact / dt); i++) {
    const t = i * dt;
    foe.state = t < move.windup ? 'windup' : 'strike';
    foe.t = foe.state === 'windup' ? t : t - move.windup;
    const [target, rate] = foePose(foe, t, 0, figure.gait, dt);
    frames.push({ target, ...sample(figure, target, rate) });
  }
  assert(distance(frames[0].target.spine, frames.at(-1).target.spine) > .2);
  assert(frames.at(-1).blade[2] - frames.at(-1).handle[2] > .55);
});
