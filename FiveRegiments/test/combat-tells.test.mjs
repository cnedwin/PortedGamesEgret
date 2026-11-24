import test from 'node:test';
import assert from 'node:assert/strict';
import { createFight, step, TICK } from '../src/sim/fight.mjs';
import { incomingAttack, opponentSkillLead, telegraphPoseTime } from '../src/sim/combat-tells.mjs';

function facingDuel() {
  const game = createFight({ hero: { regiment: 'vanguard' }, foes: [{ regiment: 'tiger' }] });
  const [hero, foe] = game.men;
  Object.assign(hero, { x: 0, z: 0, face: 0 });
  Object.assign(foe, { x: 0, z: 1.6, face: Math.PI });
  return { game, hero, foe };
}

test('incoming swing shows the defender line and drops out at contact or out of range', () => {
  const { game, hero, foe } = facingDuel();
  foe.act = { kind: 'swing', t: 0.2, wind: 0.4, line: 'L', reach: 2, blow: { arc: 0.7 } };
  assert.deepEqual(incomingAttack(game), { kind: 'swing', id: null, line: 'R', progress: 0.5, who: foe.id });
  hero.face = Math.PI;
  assert.equal(incomingAttack(game).line, null);
  hero.face = 0;
  foe.act.struck = true;
  assert.equal(incomingAttack(game), null);
  foe.act.struck = false;
  foe.z = 12;
  assert.equal(incomingAttack(game), null);
});

test('fast skill warnings start during the lead and use the next strike of a chain', () => {
  const { game, foe } = facingDuel();
  const lead = opponentSkillLead('swing');
  foe.act = { kind: 'skill', id: 'swing', t: 0, lead, leadTotal: lead };
  assert.deepEqual(incomingAttack(game), { kind: 'skill', id: 'swing', line: 'L', progress: 0, who: foe.id });
  foe.act.lead = 0;
  foe.act.t = 0.21;
  assert.equal(incomingAttack(game).line, 'R');
  foe.act.t = 0.65;
  assert.equal(incomingAttack(game), null);
  assert.equal(opponentSkillLead('down'), 0);
  assert.equal(opponentSkillLead('counter'), 0);
});

test('a live ranged warning does not replace the chosen guard line', () => {
  const { game, foe } = facingDuel();
  foe.act = { kind: 'skill', id: 'wave', t: 0.2 };
  assert.equal(incomingAttack(game).kind, 'bow');
  assert.equal(incomingAttack(game).line, null);
});

test('the light opponent swing leaves room to raise the correct guard after the old contact time', () => {
  const { game, hero, foe } = facingDuel();
  const originalHp = hero.hp;
  let defence;
  let firstCue;
  for (let tick = 0; tick < 38 && !defence; tick++) {
    const events = step(game, {
      hero: { face: 0, line: 'L', guard: tick >= 19 },
      [foe.id]: { face: Math.PI, line: 'R', attack: tick === 0, readableAttack: true }
    });
    if (incomingAttack(game)?.line === 'L' && firstCue === undefined) firstCue = game.time;
    defence = events.find((e) => e.type === 'deflect' || e.type === 'block');
  }
  assert.equal(firstCue, TICK);
  assert.ok(defence?.time >= 0.4);
  assert.equal(hero.hp, originalHp);
});

test('a charged opponent cut travels after release before it can deal damage', () => {
  const { game, foe } = facingDuel();
  let released, hit;
  for (let tick = 0; tick < 66 && !hit; tick++) {
    for (const e of step(game, { [foe.id]: { face: Math.PI, line: 'R', attack: tick < 36, readableAttack: true } })) {
      if (e.type === 'swingRelease') released = e.time;
      if (e.type === 'hit') hit = e.time;
    }
  }
  assert.ok(released > 0.4);
  assert.ok(Math.abs(hit - released - 0.1) < 1e-7);
});

test('an opponent short skill extends prep while keeping all Tiger contacts and the active rhythm', () => {
  const simulate = (readableAttack) => {
    const { game, foe } = facingDuel();
    foe.skills = ['swing'];
    const moments = [];
    const pose = [];
    for (let tick = 0; tick < 90; tick++) {
      for (const e of step(game, { [foe.id]: { face: Math.PI, skill: tick === 0 ? 0 : -1, readableAttack } })) {
        if (e.type === 'skillBeat' && e.who === foe.id) moments.push(e.time);
      }
      if (foe.act?.lead > 0) pose.push(telegraphPoseTime(foe.act));
    }
    return { moments, pose };
  };
  const ordinary = simulate(false);
  const readable = simulate(true);
  assert.equal(readable.moments.length, 3);
  assert.ok(readable.moments[0] >= 0.4);
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(readable.moments[i] - ordinary.moments[i] - opponentSkillLead('swing')) < TICK);
  }
  assert.ok(readable.pose.length > 8 && readable.pose.at(-1) > readable.pose[0]);
});
