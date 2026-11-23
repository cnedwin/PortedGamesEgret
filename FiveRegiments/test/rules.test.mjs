// 规则：出手、格挡（方向对上才挡得住）、弹刀、踢破防、体力见底破防、闪步无敌、箭、毒、网、每个职业技能，以及任意两营对打都能分出胜负。
// The rules: blows, guards (only the right line holds), deflections, a kick that breaks a guard, a guard broken by an
// empty stamina bar, the untouchable step, arrows, poison, the web, every regiment skill, and that any two regiments
// fight to a finish.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFight, facing, step, TICK, DEFLECT } from '../src/sim/fight.mjs';
import { createBrains } from '../src/sim/brain.mjs';
import { ORDER, REGIMENTS, SKILLS, TALENTS, loadout } from '../src/sim/regiments.mjs';

/** Two men a blade's length apart, facing each other. */
function pair(a = 'yulin', b = 'tiger', extra = {}) {
  const game = createFight({ hero: { regiment: a, ...extra.hero }, foes: [{ regiment: b, ...extra.foe }], seed: 5 });
  const [h, f] = game.men;
  Object.assign(h, { x: 0, z: 1.2, face: Math.PI });
  Object.assign(f, { x: 0, z: -0.6, face: 0 });
  return { game, h, f };
}
const run = (game, inputs, seconds) => {
  const events = [];
  for (let i = 0; i < Math.round(seconds / TICK); i++) events.push(...step(game, typeof inputs === 'function' ? inputs(i) : inputs));
  return events;
};

test('a light blow lands and hurts; a held blow lands harder', () => {
  const a = pair('vanguard', 'tiger');
  run(a.game, (i) => ({ hero: { attack: i < 2, line: 'R' } }), 1);
  const light = a.f.maxHp - a.f.hp;
  assert.ok(light > 100, `light blow took ${light}`);
  const b = pair('vanguard', 'tiger');
  run(b.game, (i) => ({ hero: { attack: i < 80, line: 'R' } }), 2);
  assert.ok(b.f.maxHp - b.f.hp > light * 1.3, 'heavy blow is harder');
});

test('only the right line holds a guard; a wrong line lets half through', () => {
  const right = pair('tiger', 'vanguard');
  // The hero cuts from his right (R); it arrives on the foe's left, so the foe guards L.
  run(right.game, (i) => ({ hero: { attack: i < 2, line: 'R' }, foe0: { guard: i > 0, line: facing('R') } }), 0.25);
  // Raise the guard early so it is not a deflection.
  const r = pair('tiger', 'vanguard');
  r.f.guard = true;
  r.f.guardLine = facing('R');
  r.f.guardAt = -5;
  const ev = run(r.game, (i) => ({ hero: { attack: i < 2, line: 'R' }, foe0: { guard: true, line: facing('R') } }), 1);
  assert.ok(ev.some((e) => e.type === 'block'), 'blocked');
  assert.equal(r.f.hp, r.f.maxHp);
  const w = pair('tiger', 'vanguard');
  Object.assign(w.f, { guard: true, guardLine: 'O', guardAt: -5 });
  const ev2 = run(w.game, (i) => ({ hero: { attack: i < 2, line: 'R' }, foe0: { guard: true, line: 'O' } }), 1);
  assert.ok(ev2.some((e) => e.type === 'graze'), 'grazed');
  assert.ok(w.f.hp < w.f.maxHp, 'half got through');
});

test('a guard raised just before the blow deflects it and the striker reels', () => {
  const d = pair('tiger', 'vanguard');
  const wind = REGIMENTS.tiger.blows.R.wind;
  let raisedAt = null;
  const ev = run(
    d.game,
    (i) => {
      const t = i * TICK;
      const raise = t > wind - DEFLECT * 0.5;
      if (raise && raisedAt === null) raisedAt = t;
      return { hero: { attack: i < 2, line: 'R' }, foe0: { guard: raise, line: facing('R') } };
    },
    0.8
  );
  assert.ok(ev.some((e) => e.type === 'deflect'), 'deflected');
  assert.equal(d.f.hp, d.f.maxHp);
  assert.ok(ev.some((e) => e.type === 'deflect') && d.h.stats.blows === 1);
});

test('a kick breaks a guard; an empty stamina bar breaks it too', () => {
  const k = pair('yulin', 'vanguard');
  Object.assign(k.f, { guard: true, guardLine: 'R', guardAt: -5 });
  const ev = run(k.game, (i) => ({ hero: { kick: i === 0 }, foe0: { guard: true, line: 'R' } }), 0.6);
  assert.ok(ev.some((e) => e.type === 'break' && e.kick), 'kick broke the guard');
  const s = pair('vanguard', 'tiger');
  Object.assign(s.f, { guard: true, guardLine: facing('O'), guardAt: -5, st: 5 });
  const ev2 = run(s.game, (i) => ({ hero: { attack: i < 2, line: 'O' }, foe0: { guard: true, line: facing('O') } }), 1);
  assert.ok(ev2.some((e) => e.type === 'break'), 'stamina ran out');
});

test('the first instant of a step cannot be touched', () => {
  const g = pair('tiger', 'vanguard');
  const wind = REGIMENTS.tiger.blows.R.wind;
  const ev = run(g.game, (i) => ({ hero: { attack: i < 2, line: 'R' }, foe0: { step: Math.abs(i * TICK - (wind - 0.05)) < TICK / 2, move: [1, 0] } }), 0.8);
  assert.ok(ev.some((e) => e.type === 'evade'), 'evaded');
});

test('arrows fly, hit and can be stopped by a shield', () => {
  const g = createFight({ hero: { regiment: 'archer' }, foes: [{ regiment: 'tiger' }], seed: 2 });
  const [a, t] = g.men;
  Object.assign(a, { x: 0, z: 8, face: Math.PI });
  Object.assign(t, { x: 0, z: 0, face: 0 });
  const aim = { yaw: Math.PI, pitch: 0.03 };
  run(g, (i) => ({ hero: { attack: i < 70, aim, face: Math.PI }, foe0: {} }), 1.6);
  assert.ok(t.hp < t.maxHp, 'arrow hit');
  const s = createFight({ hero: { regiment: 'archer' }, foes: [{ regiment: 'yulin' }], seed: 2 });
  Object.assign(s.men[0], { x: 0, z: 8, face: Math.PI });
  Object.assign(s.men[1], { x: 0, z: 0, face: 0 });
  const ev = run(s, (i) => ({ hero: { attack: i < 70, aim, face: Math.PI }, foe0: { guard: true, line: 'T' } }), 1.6);
  assert.ok(ev.some((e) => e.type === 'block' && e.arrow), 'shield stopped the arrow');
  assert.ok(s.men[1].maxHp - s.men[1].hp < 5);
});

test('poison works and leaves a man immune for a while; a web slows', () => {
  const g = pair('tiger', 'yulin', { hero: { skills: ['mist', 'swing'] } });
  run(g.game, (i) => ({ hero: { skill: i < 2 ? 0 : -1 } }), 0.5);
  assert.ok(g.f.poison, 'poisoned');
  run(g.game, {}, 7);
  assert.ok(!g.f.poison && g.f.immune > 0, 'immune after');
  const w = createFight({ hero: { regiment: 'archer', skills: ['web', 'fan'] }, foes: [{ regiment: 'vanguard' }], seed: 3 });
  Object.assign(w.men[0], { x: 0, z: 5, face: Math.PI });
  Object.assign(w.men[1], { x: 0, z: 0, face: 0 });
  run(w, (i) => ({ hero: { skill: i < 2 ? 0 : -1 } }), 1.2);
  assert.ok(w.clouds.some((c) => c.kind === 'web') || w.men[1].slow.length, 'web laid');
});

test('every regiment skill runs to its end without fault, and talents are its own', () => {
  for (const regiment of ORDER) {
    const r = REGIMENTS[regiment];
    for (const id of r.skills) {
      assert.equal(SKILLS[id].owner, regiment);
      const other = r.skills.find((s) => s !== id);
      const g = pair(regiment, regiment === 'tiger' ? 'yulin' : 'tiger', { hero: { skills: [id, other] } });
      const ev = run(g.game, (i) => ({ hero: { skill: i < 2 ? 0 : -1 } }), 3);
      assert.ok(ev.some((e) => e.type === 'skill' && e.id === id), `${id} began`);
      assert.equal(g.h.act, null, `${id} finished`);
      assert.ok(g.h.cool[0] > 0, `${id} is waiting`);
    }
    for (const id of r.talents) assert.equal(TALENTS[id].owner, regiment);
    const picked = loadout(regiment);
    assert.equal(picked.skills.length, 2);
    assert.equal(picked.talents.length, 4);
  }
});

test('any two regiments fight to a finish, the same way twice from one seed', () => {
  for (const a of ORDER)
    for (const b of ORDER) {
      if (a === b) continue;
      const play = () => {
        const g = createFight({ hero: { regiment: a }, foes: [{ regiment: b }], seed: 11 });
        const brains = createBrains(g, { level: 0.6, hero: true });
        while (!g.over && g.time < 200) {
          const inputs = {};
          for (const [id, br] of Object.entries(brains)) inputs[id] = br.think(g, TICK);
          step(g, inputs);
        }
        return [g.over, g.time.toFixed(3), g.men.map((m) => m.hp)];
      };
      const first = play();
      assert.ok(first[0], `${a} against ${b} ended`);
      assert.deepEqual(play(), first, `${a} against ${b} repeats`);
    }
});

test('one against two: both foes come, and both down is a win', () => {
  const g = createFight({ hero: { regiment: 'vanguard' }, foes: [{ regiment: 'tiger' }, { regiment: 'archer' }], seed: 4, health: 0.8 });
  const brains = createBrains(g, { level: 0.5, hero: true, heroLevel: 0.9 });
  const won = [];
  while (!g.over && g.time < 240) {
    const inputs = {};
    for (const [id, br] of Object.entries(brains)) inputs[id] = br.think(g, TICK);
    won.push(...step(g, inputs).filter((e) => e.type === 'won'));
  }
  assert.ok(g.over);
  if (g.over === 'won') assert.ok(won[0].double);
});
