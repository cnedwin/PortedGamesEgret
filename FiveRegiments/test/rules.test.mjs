// 规则：出手、格挡（方向对上才挡得住）、弹刀、踢破防、体力见底破防、蛮牛冲击、箭、毒、网、每个职业技能、怒气与战技（架枪），以及任意两营对打都能分出胜负。
// The rules: blows, guards (only the right line holds), deflections, a kick that breaks a guard, a guard broken by an
// empty stamina bar, the Bull Charge, arrows, poison, the web, every profession skill, rage and the weapon art (the
// couched ji), and that any two regiments fight to a finish.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFight, facing, recoveryGuardWindow, spinGuardWindow, step, TICK, DEFLECT } from '../src/sim/fight.mjs';
import { createBrains } from '../src/sim/brain.mjs';
import { ARTS, DAMAGE, ORDER, REGIMENTS, SKILLS, TALENTS, loadout, playerLoadout } from '../src/sim/regiments.mjs';

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

test('each foot opponent chooses a reachable thrust from the thrust-only distance', () => {
  for (const regiment of ORDER) {
    const hero = regiment === 'tiger' ? 'yulin' : 'tiger';
    const { game, h, f } = pair(hero, regiment, { foe: { mounted: false } });
    if (regiment === 'archer') f.knife = true;
    f.cool.fill(5);
    f.rage = 0;
    const short = Math.max(f.r.blows.L.reach, f.r.blows.R.reach, f.r.blows.O.reach);
    const reach = f.r.blows.T.reach;
    const brain = createBrains(game, { level: 0.5, rng: () => 0.01 }).foe0;

    f.z = h.z - h.body - (short + reach) * 0.5;
    const atEdge = brain.think(game, TICK);
    assert.ok(atEdge.attack, regiment + ' still has a valid thrust');
    assert.equal(atEdge.line, 'T', regiment + ' should not start a shorter cut');

    f.z = h.z - h.body - reach - 0.1;
    const tooFar = brain.think(game, TICK);
    assert.ok(!tooFar.attack && !tooFar.kick, regiment + ' closes distance when no line can reach');
  }
});

test('a normal foot opponent makes an uncharged reply during the reel it earns with a deflect', () => {
  const { game, h, f } = pair('tiger', 'yulin');
  f.cool.fill(5);
  f.rage = 0;
  const brain = createBrains(game, { level: 0.5, rng: () => 0.2 }).foe0;

  step(game, { hero: { attack: true, line: 'O' } });
  while (h.act.t < 0.315) step(game, {});
  const answer = brain.think(game, TICK);
  assert.equal(answer.guard, true);
  assert.equal(answer.line, 'O');
  step(game, { foe0: answer });
  let contact;
  for (let i = 0; i < 3 && !contact; i++) {
    contact = step(game, { foe0: brain.think(game, TICK) }).find(e => e.type === 'deflect' && e.who === f.id);
  }
  assert.ok(contact, 'the real overhead deflection opens the reply');
  assert.equal(h.stunKind, 'reel');

  let swing;
  while (!swing && game.time - contact.time < 0.16) {
    swing = step(game, { foe0: brain.think(game, TICK) }).find(e => e.type === 'swing' && e.who === f.id);
  }
  assert.ok(swing, 'replies during the opening instead of holding guard for 0.35 seconds');
  assert.ok(swing.time - contact.time >= 4 * TICK, 'keeps a brief guard settle after contact');
  assert.equal(brain.swingHold, 0, 'does not add a heavy charge to the reply');
  assert.equal(f.act.wind, f.act.blow.wind, 'uses ordinary weapon startup');
});

test('a solo Imperial Guard reads a repeated fast cut without reading a new line or an expired pattern', () => {
  function exchanges(lines, { pause = 0, level = 0.5 } = {}) {
    const { game, h, f } = pair('tiger', 'yulin');
    const brain = createBrains(game, { level, rng: () => 0.5 }).foe0;
    const guard = () => {
      const { guard, line, face } = brain.think(game, TICK);
      return { guard, line, face };
    };
    return lines.map((line, index) => {
      // Hold the fixture in range and feed only the brain's defensive decisions into combat.
      Object.assign(h, { x: 0, z: 1.2, face: Math.PI });
      Object.assign(f, { x: 0, z: -0.6, face: 0 });
      if (index === 2 && pause) run(game, () => ({ foe0: guard() }), pause);
      return run(game, i => ({
        hero: { line, meleeLine: line, meleeRelease: true, meleeDown: i === 0, meleeUp: i === 1 },
        foe0: guard()
      }), 0.75).find(e => e.who === 'foe0' && e.by === 'hero' &&
        (e.type === 'hit' || e.type === 'block' || e.type === 'deflect'))?.type;
    });
  }
  assert.deepEqual(exchanges(['R', 'R', 'R']), ['hit', 'hit', 'deflect']);
  assert.deepEqual(exchanges(['R', 'R', 'L']), ['hit', 'hit', 'hit']);
  assert.deepEqual(exchanges(['R', 'R', 'R'], { pause: 2.1 }), ['hit', 'hit', 'hit']);
  assert.deepEqual(exchanges(['R', 'R', 'R'], { level: 0.3 }), ['hit', 'hit', 'hit']);
});

test('a light blow lands and hurts; a held blow lands harder', () => {
  const a = pair('vanguard', 'tiger');
  run(a.game, (i) => ({ hero: { attack: i < 2, line: 'R' } }), 1);
  const light = a.f.maxHp - a.f.hp;
  assert.ok(light > 100, `light blow took ${light}`);
  const b = pair('vanguard', 'tiger');
  run(b.game, (i) => ({ hero: { attack: i < 80, line: 'R' } }), 2);
  assert.ok(b.f.maxHp - b.f.hp > light * 1.3, 'heavy blow is harder');
});

test('all four lines cue the release near contact and keep their matching guards', () => {
  for (const line of ['L', 'R', 'O', 'T']) {
    const { game, f } = pair('tiger', 'vanguard');
    Object.assign(f, { guard: true, guardLine: facing(line), guardAt: -5 });
    const events = run(game, (i) => ({
      hero: { attack: i === 0, line },
      foe0: { guard: true, line: facing(line) }
    }), 1);
    const start = events.find((e) => e.type === 'swing');
    const [release, extra] = events.filter((e) => e.type === 'swingRelease');
    const block = events.find((e) => e.type === 'block');
    assert.ok(release && !extra && block, line);
    assert.equal(release.line, line);
    assert.ok(release.time > start.time && block.time - release.time >= 0 && block.time - release.time <= 2 * TICK + 1e-6, line);
    assert.equal(f.hp, f.maxHp, line);
  }
});

test('a held attack cues once on release, and a feint never cues a release', () => {
  const held = pair('vanguard', 'tiger');
  const events = run(held.game, (i) => ({ hero: { attack: i < 45, line: 'R' } }), 1.5);
  const release = events.filter((e) => e.type === 'swingRelease');
  const hit = events.find((e) => e.type === 'hit');
  assert.equal(release.length, 1);
  assert.ok(release[0].heavy > 0 && hit.time === release[0].time);

  const cancelled = pair('tiger', 'vanguard');
  const feint = run(cancelled.game, (i) => ({ hero: { attack: i === 0, guard: i === 3, line: 'R' } }), 1);
  assert.ok(feint.some((e) => e.type === 'feint'));
  assert.ok(!feint.some((e) => e.type === 'swingRelease' || e.type === 'hit'));
});

function meleeRecovery() {
  const duel = pair('tiger', 'yulin');
  step(duel.game, { hero: { attack: true, line: 'R' } });
  while (!duel.h.act.struck) step(duel.game, {});
  return duel;
}

test('a late combo tap keeps its line through the entire original recovery', () => {
  const { game, h } = meleeRecovery();
  while (h.act.t - h.act.strikeAt < h.act.recover * 0.65) step(game, {});
  const previous = h.act;
  assert.ok(!step(game, { hero: { attack: true, line: 'L' } }).some((e) => e.type === 'swing'));
  assert.equal(h.act, previous);
  step(game, {});
  step(game, { hero: { attack: true, line: 'O' } });
  assert.equal(h.act, previous);
  while (h.act) assert.ok(!step(game, {}).some((e) => e.type === 'swing'));
  assert.ok(previous.t - previous.strikeAt >= previous.recover);
  const finishedAt = game.time;
  const next = step(game, { hero: { line: 'T' } }).find((e) => e.type === 'swing');
  assert.equal(next?.line, 'L');
  assert.ok(Math.abs(next.time - finishedAt - TICK) < 1e-9);
  assert.equal(h.act.wind, h.act.blow.wind);
});

test('a fresh guard cancels normal follow-through, clears a buffered swing and leaves the next move available', () => {
  const { game, h, f } = meleeRecovery();
  const previous = h.act;
  const cancelInput = { guard: true, skillGuardCancel: true, line: 'R' };
  step(game, { hero: cancelInput });
  assert.equal(h.act, previous, 'the contact has a minimum follow-through');
  while (h.act.t - h.act.strikeAt < h.act.recover * 0.64) {
    const held = step(game, { hero: cancelInput });
    assert.equal(h.act, previous, 'holding a guard early cannot cancel later');
    assert.ok(held.every(e => e.type !== 'recoveryCancel'));
  }
  step(game, { hero: { ...pcMelee({ attack: true, meleeDown: true, meleeLine: 'O' }), recoveryHandoff: true } });
  assert.equal(h.queuedSwing?.line, 'O');
  const health = f.hp;
  const events = step(game, { hero: cancelInput });
  assert.ok(events.some(e => e.type === 'recoveryCancel' && e.from === 'swing' && e.line === 'R'));
  assert.equal(h.act, null);
  assert.equal(h.queuedSwing, null);
  assert.equal(h.guardLine, 'R');
  assert.equal(h.guardAt, game.time);
  assert.equal(f.hp, health, 'the old strike never lands again');
  step(game, { hero: pcMelee({ meleeUp: true, meleeLine: 'O' }) });
  assert.equal(h.act, null, 'old mouse release does not attack after the cancel');
  step(game, { hero: { attack: true, line: 'L' } });
  assert.equal(h.act?.line, 'L');
  assert.equal(h.act?.wind, h.r.blows.L.wind, 'a new strike keeps its full wind-up');
});

test('an early recovery tap does not chain', () => {
  const { game, h } = meleeRecovery();
  const events = step(game, { hero: { attack: true, line: 'L' } });
  while (h.act) events.push(...step(game, {}));
  events.push(...step(game, {}));
  assert.ok(!events.some((e) => e.type === 'swing'));
});

test('a guard, a higher-priority action or a stagger consumes the queued combo', () => {
  for (const interrupt of ['guard', 'kick', 'stun']) {
    const { game, h } = meleeRecovery();
    while (h.act.t - h.act.strikeAt < h.act.recover * 0.65) step(game, {});
    step(game, { hero: { attack: true, line: 'L' } });
    if (interrupt !== 'stun') while (h.act) step(game, {});
    const command = interrupt === 'stun' ? {} : { [interrupt]: true };
    if (interrupt === 'stun') h.stun = 0.2;
    const events = step(game, { hero: command });
    if (interrupt === 'guard') assert.ok(h.guard);
    if (interrupt === 'kick') assert.ok(events.some((e) => e.type === 'kick'));
    events.push(...run(game, {}, 0.8));
    assert.ok(!events.some((e) => e.type === 'swing'), interrupt);
    const next = step(game, { hero: { attack: true, line: 'O' } }).find((e) => e.type === 'swing');
    assert.equal(next?.line, 'O', interrupt);
    assert.equal(h.act.wind, h.act.blow.wind, interrupt);
  }
});

const pcMelee = (fields = {}) => ({ meleeRelease: true, line: 'R', ...fields });

function finishRecoveryNextTick(duel, input = {}) {
  const { game, h } = duel;
  while (h.act.recover - (h.act.t - h.act.strikeAt) > TICK) {
    step(game, { hero: input });
    assert.ok(!h.guard, 'guard is still unavailable during active recovery');
  }
  assert.ok(h.act.t - h.act.strikeAt < h.act.recover);
}

test('a press on the tick crossing natural recovery keeps the normal wind', () => {
  for (const mode of ['legacy', 'tap', 'hold']) {
    const duel = meleeRecovery(), { game, h } = duel;
    finishRecoveryNextTick(duel);
    const press = mode === 'legacy' ? { attack: true, line: 'L' }
      : pcMelee({ attack: true, meleeDown: true, meleeUp: mode === 'tap', meleeLine: 'L', line: 'O' });
    assert.ok(!step(game, { hero: { ...press, recoveryHandoff: true } }).some((e) => e.type === 'swing'));
    assert.equal(h.act, null);
    const next = step(game, { hero: mode === 'hold' ? pcMelee({ attack: true, line: 'T' }) : {} });
    assert.equal(h.act?.line, 'L', mode);
    assert.equal(h.act.wind, h.act.blow.wind, mode);
    assert.equal(Boolean(h.act.awaitingRelease), mode === 'hold');
    if (mode !== 'hold') assert.equal(next.find((e) => e.type === 'swing')?.line, 'L');
    else assert.equal(step(game, { hero: pcMelee({ meleeUp: true }) }).find((e) => e.type === 'swing')?.line, 'L');
  }
});

test('held guard takes over on the natural recovery tick before the next fighter attacks', () => {
  const duel = meleeRecovery(), { game, h, f } = duel;
  const guard = { guard: true, recoveryHandoff: true, line: 'R' };
  finishRecoveryNextTick(duel, guard);
  const blow = f.r.blows.L;
  Object.assign(f, { x: h.x, z: h.z - 1.4, face: 0, stun: 0, act: {
    kind: 'swing', line: 'L', t: blow.wind - TICK * 0.5, wind: blow.wind, held: 0, struck: false, blow, reach: blow.reach, recover: blow.recover
  } });
  const hp = h.hp;
  const events = step(game, { hero: { ...guard, attack: true } });
  assert.equal(h.act, null);
  assert.ok(h.guard);
  assert.equal(h.guardAt, game.time);
  assert.equal(h.guardLine, 'R');
  assert.equal(h.hp, hp);
  assert.ok(events.some((e) => e.type === 'deflect' && e.who === 'hero'));
  assert.ok(!step(game, {}).some((e) => e.type === 'swing'), 'guard takes priority over a simultaneous attack at the edge');
});

test('a touch attack can keep its line separate from a raised or held guard', () => {
  const { game, h } = pair('archer', 'yulin');
  step(game, { hero: { arm: 1 } });
  assert.ok(h.knife);
  step(game, { hero: { guard: true, guardLine: 'R', line: 'O' } });
  assert.equal(h.line, 'O');
  assert.equal(h.guardLine, 'R');
  step(game, { hero: { guard: true, guardLine: 'L', line: 'T' } });
  assert.equal(h.line, 'T');
  assert.equal(h.guardLine, 'L');
  const attack = step(game, { hero: { attack: true, line: 'O' } });
  assert.equal(attack.find(e => e.type === 'swing')?.line, 'O');
  assert.equal(h.guard, false);
});

test('Archer knife guard keeps its assisted line when a swipe shares the recovery handoff', () => {
  const duel = pair('archer', 'yulin'), { game, h, f } = duel;
  step(game, { hero: { arm: 1 } });
  step(game, { hero: { attack: true, line: 'O' } });
  while (!h.act.struck) step(game, {});
  finishRecoveryNextTick(duel, { guard: true, line: 'R', recoveryHandoff: true });
  const blow = f.r.blows.L;
  Object.assign(f, { x: h.x, z: h.z - 1.35, face: 0, stun: 0, act: {
    kind: 'swing', line: 'L', t: blow.wind - TICK * 0.5, wind: blow.wind, held: 0, struck: false, blow, reach: blow.reach, recover: blow.recover
  } });
  const hp = h.hp;
  const events = step(game, { hero: { attack: true, guard: true, line: 'O', guardLine: 'R', recoveryHandoff: true } });
  assert.equal(h.guardLine, 'R');
  assert.equal(h.hp, hp);
  assert.ok(events.some((e) => e.type === 'deflect' && e.who === 'hero'));
  assert.equal(h.queuedSwing, null);
});

test('the natural recovery tick still respects stamina and daze guard restrictions', () => {
  for (const restriction of [{ st: 0 }, { daze: 0.5 }]) {
    const duel = meleeRecovery();
    finishRecoveryNextTick(duel);
    Object.assign(duel.h, restriction);
    step(duel.game, { hero: { guard: true, recoveryHandoff: true } });
    assert.equal(duel.h.act, null);
    assert.equal(duel.h.guard, false);
  }
});

test('commands without the human handoff keep their previous recovery timing', () => {
  const attack = meleeRecovery(), guard = meleeRecovery();
  finishRecoveryNextTick(attack);
  finishRecoveryNextTick(guard);
  step(attack.game, { hero: { attack: true, line: 'L' } });
  step(guard.game, { hero: { guard: true } });
  assert.equal(attack.h.act, null);
  assert.equal(attack.h.queuedSwing, null);
  assert.equal(guard.h.act, null);
  assert.equal(guard.h.guard, false);
  step(guard.game, { hero: { guard: true } });
  assert.ok(guard.h.guard);
});

test('PC melee waits at full charge and releases exactly once on the locked line', () => {
  const { game, h, f } = pair('tiger', 'yulin');
  const held = run(game, (i) => ({ hero: pcMelee({ attack: true, meleeDown: i === 0, line: i === 0 ? 'R' : 'O' }) }), 3);
  assert.equal(h.act?.awaitingRelease, true);
  assert.equal(h.act.line, 'R');
  assert.equal(h.act.t, h.act.prepCap);
  const wind = h.act.wind;
  assert.equal(f.hp, f.maxHp);
  assert.ok(!held.some((e) => ['swing', 'swingRelease', 'hit', 'whiff'].includes(e.type)));
  const released = step(game, { hero: pcMelee({ meleeUp: true, line: 'T' }) });
  assert.equal(h.act.awaitingRelease, false);
  assert.ok(Math.abs(h.act.releaseAt - h.act.prepCap) < 1e-9);
  assert.deepEqual(released.map((e) => e.type), ['swing']);
  const after = run(game, { hero: pcMelee() }, 0.6);
  assert.deepEqual(after.filter((e) => ['swing', 'swingRelease', 'hit'].includes(e.type)).map((e) => e.type), ['swingRelease', 'hit']);
  const hit = after.find((e) => e.type === 'hit');
  assert.ok(hit.time - released[0].time >= wind - h.r.blows.R.wind * 0.72 - TICK);
  assert.equal(after.find((e) => e.type === 'swingRelease').heavy, 1);
  assert.equal(hit.line, 'R');
  assert.equal(hit.heavy, 1);
  assert.equal(h.stats.blows, 1);
  const normal = pair('tiger', 'yulin');
  const normalHit = run(normal.game, { hero: { attack: true, line: 'R' } }, 1.6).find((e) => e.type === 'hit');
  assert.equal(hit.damage, normalHit.damage);
});

test('a same-tick PC click respects the original wind and damage', () => {
  const ordinary = pair('tiger', 'yulin'), desktop = pair('tiger', 'yulin');
  const previous = run(ordinary.game, (i) => ({ hero: { attack: i === 0, line: 'R' } }), 1);
  const current = run(desktop.game, (i) => ({ hero: pcMelee({ attack: i === 0, meleeDown: i === 0, meleeUp: i === 0 }) }), 1);
  assert.deepEqual(current, previous);
});

test('a PC melee press keeps its own line when guard assist supplies the incoming line', () => {
  const { game, h } = pair('tiger', 'yulin');
  step(game, { hero: { guard: true, line: 'L' } });
  assert.equal(h.guardLine, 'L');
  step(game, { hero: pcMelee({ guard: true, line: 'L', meleeLine: 'R', attack: true, meleeDown: true }) });
  assert.equal(h.act?.line, 'R');
  const release = step(game, { hero: pcMelee({ line: 'O', meleeUp: true }) });
  assert.equal(release.find(e => e.type === 'swing')?.line, 'R');
});

test('guard cancels armed PC melee at full charge and stale release cannot attack', () => {
  const { game, h } = pair('tiger', 'yulin');
  run(game, (i) => ({ hero: pcMelee({ attack: true, meleeDown: i === 0 }) }), 2);
  const cancelled = step(game, { hero: pcMelee({ attack: true, guard: true, guardLine: 'O' }) });
  assert.ok(cancelled.some((e) => e.type === 'feint'));
  assert.ok(h.guard);
  assert.equal(h.guardLine, 'O', 'the same guard press supplies its defensive line');
  const released = step(game, { hero: pcMelee({ meleeUp: true }) });
  assert.equal(h.guard, false, 'a short press does not keep guarding after release');
  assert.ok(!released.some((e) => e.type === 'swing' || e.type === 'hit'));
});

test('an armed touch drag chooses its new line without committing or keeping the old reach', () => {
  const { game, h } = pair('tiger', 'yulin');
  run(game, (i) => ({ hero: pcMelee({ attack: true, meleeDown: i === 0 }) }), 0.7);
  assert.equal(h.act.line, 'R');
  const events = run(game, { hero: pcMelee({ attack: true, meleeAim: 'T' }) }, 1.6);
  assert.equal(h.act.line, 'T');
  assert.equal(h.act.blow, h.r.blows.T);
  assert.equal(h.act.reach, h.r.blows.T.reach);
  assert.equal(h.act.wind, h.r.blows.T.wind);
  assert.equal(h.act.recover, h.r.blows.T.recover);
  assert.ok(h.act.held >= 0.84 && h.act.awaitingRelease);
  assert.equal(events.length, 0, 'changing the line does not play attack sounds or strike');
  const released = step(game, { hero: pcMelee({ meleeUp: true }) });
  assert.equal(released.find(e => e.type === 'swing')?.line, 'T');
  const after = run(game, {}, 1);
  assert.deepEqual(after.filter(e => e.type === 'swingRelease').map(e => e.line), ['T']);
});

test('explicit PC cancellation discards preparation and a new down can arm again', () => {
  const { game, h } = pair('tiger', 'yulin');
  step(game, { hero: pcMelee({ attack: true, meleeDown: true }) });
  const cancelled = step(game, { hero: pcMelee({ attack: true, meleeUp: true, meleeCancel: true }) });
  assert.equal(h.act, null);
  assert.deepEqual(cancelled, []);
  step(game, { hero: pcMelee({ attack: true, meleeDown: true, line: 'T' }) });
  assert.equal(h.act?.awaitingRelease, true);
  assert.equal(h.act.line, 'T');
});

test('released PC melee retains the ordinary early feint window', () => {
  const { game } = pair('tiger', 'yulin');
  const events = run(game, (i) => ({ hero: pcMelee({ attack: i === 0, meleeDown: i === 0, meleeUp: i === 0, guard: i === 3 }) }), 1);
  assert.ok(events.some((e) => e.type === 'feint'));
  assert.ok(!events.some((e) => e.type === 'swingRelease' || e.type === 'hit'));
});

test('a PC combo remembers tap release and its accepted line across the recovery tick', () => {
  for (const releaseTick of [0, 1, 2]) {
    const { game, h } = meleeRecovery();
    while (h.act.t - h.act.strikeAt < h.act.recover * 0.65) step(game, {});
    step(game, { hero: pcMelee({ attack: true, meleeDown: true, meleeUp: releaseTick === 0, line: 'O', meleeLine: 'L' }) });
    const pending = pcMelee({ attack: releaseTick === 2, line: 'O' });
    assert.ok(!step(game, { hero: { ...pending, meleeUp: releaseTick === 1 } }).some((e) => e.type === 'swing'));
    while (h.act) assert.ok(!step(game, { hero: pending }).some((e) => e.type === 'swing'));
    const prepared = step(game, { hero: pending });
    assert.equal(h.act?.line, 'L');
    assert.equal(h.act.awaitingRelease, releaseTick === 2);
    const release = step(game, { hero: pcMelee({ meleeUp: releaseTick === 2, line: 'T' }) });
    const [swing, extra] = [...prepared, ...release].filter((e) => e.type === 'swing');
    assert.equal(swing?.line, 'L');
    assert.equal(extra, undefined);
    assert.equal(h.act.wind, h.act.blow.wind);
  }
});

test('repeated basic presses leave each strike at least a full wind and recovery apart', () => {
  const { game, h, f } = pair('tiger', 'yulin');
  f.z = h.z - 6;
  const { wind, recover } = h.r.blows.R;
  const events = run(game, (i) => ({ hero: { attack: i % 2 === 0, line: 'R', recoveryHandoff: true } }), 3.4);
  const contacts = events.filter(e => e.type === 'whiff' && e.who === 'hero');
  assert.ok(contacts.length >= 5);
  for (let i = 1; i < contacts.length; i++) assert.ok(contacts[i].time - contacts[i - 1].time >= wind + recover - 1e-9);
});

test('ordinary light hit stun ends before the next buffered basic attack lands', () => {
  const { game, f } = pair('tiger', 'yulin');
  let first = null, canGuardAt = null, second = null;
  for (let i = 0; i < 90 && !second; i++) {
    const events = step(game, { hero: { attack: i % 2 === 0, line: 'R', recoveryHandoff: true }, foe0: { guard: !!first, line: 'L' } });
    if (first === null) {
      first = events.find(e => e.type === 'hit' && e.by === 'hero') ?? null;
      if (first) assert.ok(f.stun > 0);
    } else {
      if (f.guard) canGuardAt ??= game.time;
      second = events.find(e => e.by === 'hero' && (e.type === 'block' || e.type === 'deflect' || e.type === 'hit')) ?? null;
    }
  }
  assert.ok(first && second && canGuardAt > first.time && canGuardAt < second.time);
  assert.match(second.type, /^(deflect|block)$/);
});

test('PC releasing a press rejected in early recovery cannot start a later swing', () => {
  const { game, h } = meleeRecovery();
  const held = run(game, (i) => ({ hero: pcMelee({ attack: true, meleeDown: i === 0 }) }), 0.8);
  assert.equal(h.act, null);
  const released = step(game, { hero: pcMelee({ meleeUp: true }) });
  assert.ok(![...held, ...released].some((e) => e.type === 'swing'));
});

function tigerSpin(distance = 1.8) {
  const duel = pair('tiger', 'yulin', { hero: { skills: ['spin', 'swing'] } });
  duel.f.z = duel.h.z - distance;
  const events = step(duel.game, { hero: { skill: 0 } });
  assert.equal(events[0]?.id, 'spin');
  return { ...duel, events };
}

function waitForSpin(duel, at) {
  while (duel.h.act?.id === 'spin' && duel.h.act.t < at) duel.events.push(...step(duel.game, {}));
  assert.equal(duel.h.act?.id, 'spin');
}

test('a multi-hit skill keeps all three releases before a fresh post-skill guard can cancel', () => {
  const { game, h, f } = pair('tiger', 'yulin', { hero: { skills: ['swing', 'spin'] } });
  f.z = h.z - 5;
  const seen = step(game, { hero: { skill: 0 } });
  while (h.act.t < 0.43) seen.push(...step(game, {}));
  seen.push(...step(game, { hero: { guard: true, skillGuardCancel: true } }));
  assert.equal(h.act?.id, 'swing');
  while (h.act.t < 0.76) seen.push(...step(game, { hero: { guard: true, skillGuardCancel: true } }));
  assert.deepEqual(seen.filter(e => e.type === 'skillBeat').map(e => e.part), [0, 1, 2]);
  assert.ok(!h.guard && !seen.some(e => e.type === 'recoveryCancel'));
  step(game, {});
  const remaining = h.cool[0];
  const events = step(game, { hero: { guard: true, skillGuardCancel: true, skill: 1, line: 'T' } });
  assert.ok(events.some(e => e.type === 'recoveryCancel' && e.from === 'skill' && e.id === 'swing'));
  assert.equal(h.act, null, 'guard beats a same-tick attempt to chain');
  assert.equal(h.guardLine, 'T');
  assert.ok(Math.abs(h.cool[0] - (remaining - TICK)) < 1e-12);
  assert.equal(h.cool[1], 0);
  step(game, {});
  step(game, { hero: { skill: 1 } });
  assert.equal(h.act?.id, 'spin');
});

test('a drop cannot be guard-cancelled in the air but can settle into guard after landing', () => {
  const { game, h, f } = pair('plume', 'yulin', { hero: { mounted: false, skills: ['drop', 'boar'] } });
  f.z = h.z - 5;
  step(game, { hero: { skill: 0 } });
  while (h.act.t < 0.32) step(game, {});
  assert.ok(h.act.air > 0.4);
  const air = step(game, { hero: { guard: true, skillGuardCancel: true } });
  assert.equal(h.act?.id, 'drop');
  assert.ok(air.every(e => e.type !== 'recoveryCancel'));
  const releases = [];
  while (h.act.t < 0.73) releases.push(...step(game, {}));
  assert.equal(releases.filter(e => e.type === 'slam' && e.skill === 'drop').length, 1);
  const guard = step(game, { hero: { guard: true, skillGuardCancel: true } });
  assert.ok(guard.some(e => e.type === 'recoveryCancel' && e.id === 'drop'));
  assert.ok(h.guard);
});

test('guard after a skill release leaves its projectile live and respects guard restrictions', () => {
  const { game, h, f } = pair('vanguard', 'yulin', { hero: { skills: ['wave', 'down'] } });
  f.z = h.z - 9;
  step(game, { hero: { skill: 0 } });
  while (h.act && !recoveryGuardWindow(h)) step(game, {});
  assert.equal(h.act?.id, 'wave');
  assert.ok(recoveryGuardWindow(h));
  for (const unavailable of [{ alive: false }, { stun: TICK }, { daze: TICK }, { st: 0 }, { regiment: 'archer', knife: false }]) {
    assert.ok(!recoveryGuardWindow({ ...h, ...unavailable }));
  }
  const [wave] = game.shots;
  assert.equal(wave?.kind, 'wave');
  step(game, { hero: { guard: true, skillGuardCancel: true } });
  assert.equal(h.act, null);
  assert.equal(game.shots[0], wave);
  run(game, {}, 0.6);
  assert.ok(f.hp < f.maxHp, 'the launched wave still reaches its target');
});

test('Tiger Step keeps its contact and natural recovery when guard is untouched', () => {
  const duel = tigerSpin();
  while (duel.h.act) duel.events.push(...step(duel.game, {}));
  const contacts = duel.events.filter((e) => e.type === 'hit' && e.skill === 'spin');
  assert.equal(contacts.length, 1);
  assert.ok(Math.abs(contacts[0].time - 0.3) < TICK);
  assert.ok(duel.game.time > 0.62 && duel.game.time <= 0.62 + TICK);
  assert.ok(!duel.h.guard && !duel.events.some((e) => e.type === 'skillCancel'));
});

test('Tiger Step does not buffer a guard held from before the follow-through', () => {
  const duel = tigerSpin();
  waitForSpin(duel, 0.34);
  assert.ok(!spinGuardWindow(duel.h));
  while (duel.h.act?.id === 'spin') {
    const events = step(duel.game, { hero: { guard: true, skillGuardCancel: true, line: 'R' } });
    assert.ok(!duel.h.guard && !events.some((e) => e.type === 'skillCancel'));
  }
  assert.ok(duel.game.time > 0.62);
  step(duel.game, { hero: { guard: true, skillGuardCancel: true } });
  assert.ok(duel.h.guard);
});

test('a fresh Tiger Step guard cancels after follow-through without changing the strike', () => {
  const reference = tigerSpin(), duel = tigerSpin();
  waitForSpin(reference, 0.43);
  waitForSpin(duel, 0.43);
  assert.ok(spinGuardWindow(duel.h));
  for (const unavailable of [{ alive: false }, { stun: TICK }, { daze: TICK }, { st: 0 }]) {
    assert.ok(!spinGuardWindow({ ...duel.h, ...unavailable }));
  }
  const elapsed = duel.h.act.t, before = duel.h.st;
  const events = step(duel.game, { hero: { guard: true, skillGuardCancel: true, line: 'L', skill: 1 } });
  const cancel = events.find((e) => e.type === 'skillCancel');
  assert.deepEqual(cancel, { type: 'skillCancel', time: duel.game.time, who: 'hero', id: 'spin', into: 'guard', elapsed });
  assert.equal(duel.h.act, null);
  assert.equal(duel.h.guardLine, 'L');
  assert.equal(duel.h.guardAt, duel.game.time);
  assert.equal(duel.h.st, before);
  assert.equal(duel.h.cool[1], 0);
  assert.deepEqual(duel.events, reference.events);
  assert.equal(duel.f.hp, reference.f.hp);
});

test('Tiger Step can deflect on the guard tick then start the normal three-hit Swing Slash', () => {
  const duel = tigerSpin(4);
  waitForSpin(duel, 0.43);
  const blow = duel.f.r.blows.L;
  duel.f.z = duel.h.z - 1.4;
  duel.f.act = { kind: 'swing', line: 'L', t: blow.wind - TICK * 0.5, wind: blow.wind, held: 0, struck: false, blow, reach: blow.reach, recover: blow.recover };
  const block = step(duel.game, { hero: { guard: true, skillGuardCancel: true, line: 'R' } });
  assert.ok(block.some((e) => e.type === 'skillCancel') && block.some((e) => e.type === 'deflect' && e.who === 'hero'));
  assert.equal(duel.h.hp, duel.h.maxHp);
  const before = duel.h.st;
  const cast = step(duel.game, { hero: { skill: 1 } }).find((e) => e.type === 'skill');
  assert.equal(cast?.id, 'swing');
  assert.equal(duel.h.cool[1], SKILLS.swing.cool);
  assert.equal(before - duel.h.st, SKILLS.swing.cost);
  const hits = run(duel.game, {}, 0.98).filter((e) => e.type === 'hit' && e.skill === 'swing');
  assert.equal(hits.length, 3);
  [0.18, 0.38, 0.58].forEach((at, i) => assert.ok(Math.abs(hits[i].time - cast.time - at) < TICK));
});

test('recovery cancellation requires the player opt-in flag and gives no advantage to an AI fighter', () => {
  const passive = tigerSpin();
  waitForSpin(passive, 0.45);
  step(passive.game, { hero: { guard: true } });
  assert.equal(passive.h.act?.id, 'spin');

  const opponent = pair('yulin', 'tiger', { foe: { skills: ['spin', 'swing'] } });
  step(opponent.game, { foe0: { skill: 0 } });
  run(opponent.game, {}, 0.45);
  assert.ok(recoveryGuardWindow(opponent.f));
  const events = step(opponent.game, { foe0: { guard: true, skillGuardCancel: true } });
  assert.equal(opponent.f.act?.id, 'spin');
  assert.ok(!events.some(e => e.type === 'recoveryCancel' || e.type === 'skillCancel'));
});

function spearDuel(distance, mounted = false) {
  const duel = pair('plume', 'yulin', { hero: { mounted, skills: ['returnSpear', 'boar'] } });
  duel.f.z = duel.h.z - distance;
  return duel;
}

test('Silver Wing gets Returning Spear and Boar Rush by default only as a player', () => {
  assert.deepEqual(playerLoadout('plume').skills, ['returnSpear', 'boar']);
  assert.deepEqual(loadout('plume').skills, ['stepCut', 'boar']);
  assert.deepEqual(playerLoadout('plume', { skills: ['stepCut', 'boar'] }).skills, ['stepCut', 'boar']);
  for (const regiment of ORDER.filter((id) => id !== 'plume')) assert.deepEqual(playerLoadout(regiment), loadout(regiment));
});

test('Returning Spear sidesteps before the pivot and lands a single directional thrust', () => {
  const { game, h, f } = spearDuel(2);
  const [x, z, stamina] = [h.x, h.z, h.st];
  const cast = step(game, { hero: { skill: 0 } });
  assert.ok(cast.some((e) => e.type === 'skill' && e.id === 'returnSpear'));
  assert.equal(h.st, stamina - 18);
  assert.equal(h.cool[0], 10);
  assert.equal(h.act?.stepSide, 1);
  const sideStep = run(game, {}, 0.25);
  assert.ok(h.x > x + 0.8 && h.z > z + 0.24);
  assert.equal(f.hp, f.maxHp);
  assert.ok(sideStep.some((e) => e.type === 'skillBeat' && e.id === 'returnSpear' && e.part === -1));
  const turnAndHit = run(game, {}, 0.4);
  const contacts = turnAndHit.filter((e) => e.type === 'hit');
  assert.equal(contacts.length, 1);
  const [hit] = contacts;
  assert.equal(hit.skill, 'returnSpear');
  assert.equal(hit.line, 'T');
  assert.ok(Math.abs(hit.time - 0.55) < TICK);
  assert.ok(turnAndHit.some((e) => e.type === 'skillBeat' && e.id === 'returnSpear' && e.part === 0 && e.time === hit.time));
  assert.equal(f.maxHp - f.hp, hit.damage);
  assert.equal(h.act?.id, 'returnSpear');
  assert.ok(!run(game, {}, 0.3).some((e) => e.type === 'hit'));
  assert.equal(h.act, null);
});

test('Returning Spear mirrors its step from cast input and thrusts toward the point read on cast', () => {
  const { game, h, f } = spearDuel(2);
  const x = h.x;
  step(game, { hero: { skill: 0, move: [-1, 0] } });
  assert.equal(h.act?.stepSide, -1);
  Object.assign(f, { x: 1.35, z: -0.3 });
  run(game, {}, 0.26);
  assert.ok(h.x < x - 0.8);
  const events = run(game, {}, 0.6);
  assert.ok(events.some((e) => e.type === 'whiff' && e.skill === 'returnSpear'));
  assert.equal(f.hp, f.maxHp);
});

test('Returning Spear uses ordinary thrust range and directional guard', () => {
  const guarded = spearDuel(2);
  Object.assign(guarded.f, { guard: true, guardAt: -5, guardLine: 'T' });
  const blocked = run(guarded.game, (i) => ({ hero: { skill: i === 0 ? 0 : -1 }, foe0: { guard: true, line: 'T' } }), 1);
  assert.ok(blocked.some((e) => e.type === 'block' && e.who === 'foe0' && e.line === 'T'));
  assert.equal(guarded.f.hp, guarded.f.maxHp);

  const far = spearDuel(6);
  const whiff = run(far.game, (i) => ({ hero: { skill: i === 0 ? 0 : -1 } }), 1);
  assert.ok(whiff.some((e) => e.type === 'whiff' && e.skill === 'returnSpear' && e.line === 'T'));
  assert.equal(far.f.hp, far.f.maxHp);
});

test('Returning Spear can be interrupted by a hit during its sidestep', () => {
  const { game, h, f } = spearDuel(1.2);
  const cast = step(game, { hero: { skill: 0 } });
  assert.ok(cast.some((e) => e.type === 'skill' && e.id === 'returnSpear'));
  const blow = f.r.blows.O;
  f.act = { kind: 'swing', line: 'O', t: blow.wind - TICK * 0.5, wind: blow.wind, held: 0, struck: false, blow, reach: blow.reach, recover: blow.recover };
  const hit = step(game, {}).find((e) => e.type === 'hit' && e.who === 'hero');
  assert.ok(hit?.damage > 0);
  assert.equal(h.act, null);
  assert.ok(!run(game, {}, 1).some((e) => e.type === 'hit' && e.skill === 'returnSpear'));
});

test('Returning Spear needs a fresh skill press on foot after dismount', () => {
  const { game, h } = spearDuel(4, true);
  assert.ok(step(game, { hero: { skill: 0 } }).some((e) => e.type === 'onFoot'));
  assert.equal(h.cool[0], 0);
  step(game, { hero: { mount: true } });
  const waiting = run(game, { hero: { skill: 0 } }, 1);
  assert.ok(waiting.some((e) => e.type === 'dismounted'));
  assert.ok(!h.mounted && !waiting.some((e) => e.type === 'skill'));
  step(game, {});
  assert.ok(step(game, { hero: { skill: 0 } }).some((e) => e.type === 'skill' && e.id === 'returnSpear'));
  assert.equal(h.skills[1], 'boar');
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

test('Bull Charge telegraphs before point-blank contact and keeps the full running window', () => {
  const close = pair('yulin', 'tiger', { hero: { skills: ['bull'] } });
  close.f.z = close.h.z - 1.12;
  const before = close.f.hp;
  const cast = step(close.game, { hero: { skill: 0 } });
  assert.equal(cast.find(e => e.type === 'skill')?.id, 'bull');
  assert.equal(close.f.hp, before);
  assert.equal(close.h.vz, 0);
  const contact = run(close.game, {}, 0.35).find(e => e.type === 'hit' && e.skill === 'bull');
  assert.ok(contact && contact.time - cast[0].time >= SKILLS.bull.wind - TICK);

  const late = pair('yulin', 'tiger', { hero: { skills: ['bull'] } });
  late.f.z = late.h.z - 8.9;
  const events = run(late.game, i => ({ hero: { skill: i === 0 ? 0 : -1 } }), 0.85);
  const hits = events.filter(e => e.type === 'hit' && e.skill === 'bull');
  assert.equal(hits.length, 1);
  assert.ok(hits[0].time > SKILLS.bull.wind + 0.5 && hits[0].time < SKILLS.bull.wind + 0.62);
  assert.equal(late.h.act?.metAt, hits[0].time);
});

test('a Bull Charge leaves a man unable to attack or defend for 4 s (2 s if he guarded), and unhorses a rider', () => {
  const g = pair('yulin', 'tiger', { hero: { skills: ['bull', 'charge'] } });
  Object.assign(g.f, { z: -3 });
  const ev = run(g.game, (i) => ({ hero: { skill: i < 2 ? 0 : -1 } }), 0.8);
  assert.ok(ev.some((e) => e.type === 'daze' && e.who === 'foe0'), 'dazed');
  assert.ok(g.f.daze > 3, `dazed for ${g.f.daze}`);
  // Dazed, he cannot raise a guard or strike.
  run(g.game, { foe0: { guard: true, attack: true, line: 'R' } }, 0.5);
  assert.equal(g.f.guard, false);
  assert.equal(g.f.stats.blows, 0);
  const guarded = pair('yulin', 'tiger', { hero: { skills: ['bull', 'charge'] } });
  Object.assign(guarded.f, { z: -3, guard: true, guardLine: 'T', guardAt: -5 });
  run(guarded.game, (i) => ({ hero: { skill: i < 2 ? 0 : -1 }, foe0: { guard: true, line: 'T' } }), 0.8);
  assert.ok(guarded.f.daze > 1 && guarded.f.daze <= SKILLS.bull.dazeGuarded, `guarded: ${guarded.f.daze}`);
  const rider = pair('yulin', 'plume', { hero: { skills: ['bull', 'charge'] } });
  Object.assign(rider.f, { z: -3.5 });
  Object.assign(rider.f.horse, { x: rider.f.x, z: -3.5 });
  const ev3 = run(rider.game, (i) => ({ hero: { skill: i < 2 ? 0 : -1 } }), 0.8);
  assert.ok(ev3.some((e) => e.type === 'thrown'), 'unhorsed');
  assert.equal(rider.f.mounted, false);
});

test('only a timely exact deflect of Bull Charge keeps the rider mounted', () => {
  for (const [line, fresh] of [['T', true], ['T', false], ['R', true], [null, false]]) {
    const { game, h, f } = pair('yulin', 'plume', { hero: { skills: ['bull'] } });
    f.z = h.z - 1.3;
    Object.assign(f.horse, { x: f.x, z: f.z });
    if (line) Object.assign(f, { guard: true, guardLine: line, guardAt: fresh ? 0 : -1 });

    const contact = run(game, (i) => ({ hero: { skill: i === 0 ? 0 : -1 }, foe0: { guard: Boolean(line), line } }), 0.3);
    const deflected = line === 'T' && fresh;
    assert.equal(contact.some(e => e.type === 'deflect' && e.skill === 'bull'), deflected);
    assert.equal(contact.some(e => e.type === 'thrown' && e.who === f.id), !deflected);
    assert.equal(contact.some(e => e.type === 'daze' && e.who === f.id), !deflected);
    assert.equal(f.mounted, deflected);
    if (deflected) {
      assert.equal(f.daze, 0);
      assert.equal(f.hp, f.maxHp);
      assert.equal(f.horse.hp, f.horse.maxHp);
    } else if (line === 'T') {
      assert.ok(contact.some(e => e.type === 'block' && e.skill === 'bull'));
      assert.equal(f.hp, f.maxHp, 'ordinary exact guard still stops direct damage');
    } else assert.ok(contact.some(e => e.type === 'hit' && e.skill === 'bull' && e.damage > 0));
  }
});

test('a single mount press after Bull Charge waits through the fall and remounts a living horse', () => {
  const { game, h, f } = pair('plume', 'yulin', { foe: { skills: ['bull', 'charge'] } });
  Object.assign(h, { x: 0, z: 3.5 });
  Object.assign(h.horse, { x: h.x, z: h.z });
  Object.assign(f, { x: 0, z: 0 });
  const charge = run(game, (i) => ({ foe0: { skill: i === 0 ? 0 : -1 } }), 0.8);
  assert.ok(charge.some((e) => e.type === 'thrown' && e.who === 'hero'));
  assert.equal(h.stunKind, 'thrown');
  assert.ok(h.horse.alive);
  assert.ok(Math.hypot(h.horse.x - h.x, h.horse.z - h.z) <= h.r.horse.near);

  const pressed = step(game, { hero: { mount: true } });
  assert.ok(pressed.some((e) => e.type === 'mountOnRecovery' && e.who === 'hero'));
  assert.equal(h.mounted, false);
  assert.equal(h.act, null, 'mounting cannot begin while the rider is down');

  const recovered = run(game, {}, 1.35);
  assert.equal(recovered.filter((e) => e.type === 'mount').length, 1);
  assert.equal(h.act?.kind, 'mount');
  assert.ok(h.daze > 0, 'daze still lasts for its normal duration');
  const finished = run(game, {}, 1.5);
  assert.equal(finished.filter((e) => e.type === 'mounted' && e.who === 'hero').length, 1);
  assert.ok(!finished.some((e) => e.type === 'dismount'));
  assert.equal(h.mounted, true);
});

test('the archer can move a little more at full draw without sprinting or outrunning a chaser', () => {
  const footing = (move, attack, sprint = false) => {
    const game = createFight({
      hero: { regiment: 'archer', at: [0, 3] },
      foes: [{ regiment: 'tiger', at: [0, -6] }],
      place: { radius: 40, posts: [] }
    });
    run(game, { hero: { attack, move, sprint }, foe0: { move: [0, 1] } }, 1.2);
    return { game, hero: game.hero };
  };
  const walking = footing([0, 1], false);
  const aiming = footing([0, 1], true, true);
  const sidestepping = footing([1, 0], true);
  assert.ok(aiming.hero.draw.t >= aiming.hero.r.bow.draw);
  assert.ok(!aiming.hero.sprinting);
  assert.ok(Math.abs(aiming.hero.moving / walking.hero.moving - 0.6) < 0.001);
  assert.ok(Math.abs(sidestepping.hero.moving - sidestepping.hero.r.speed * 0.92 * 0.6) < 0.001);
  assert.ok(aiming.hero.moving < aiming.game.men[1].moving * 0.42);
  assert.equal(aiming.game.shots.length, 0, 'a full draw waits for release');
  const [shot, duplicate] = step(aiming.game, {}).filter(e => e.type === 'loose');
  assert.equal(shot?.power, 1);
  assert.equal(duplicate, undefined);
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

test('the mist poisons for 240 a second, passes to a friend close by, and then leaves a man immune for 8 s; a web slows', () => {
  const g = createFight({ hero: { regiment: 'tiger', skills: ['mist', 'swing'] }, foes: [{ regiment: 'yulin' }, { regiment: 'vanguard' }], seed: 5 });
  const [h, a, b] = g.men;
  Object.assign(h, { x: 0, z: 1.2, face: Math.PI });
  Object.assign(a, { x: 0, z: -1, face: 0 });
  // The other is out of the cloud, but walks up beside his friend.
  Object.assign(b, { x: 6, z: -1, face: 0 });
  run(g, (i) => ({ hero: { skill: i < 2 ? 0 : -1 } }), 0.5);
  assert.ok(a.poison && !b.poison, 'poisoned');
  const hp = a.hp;
  b.x = 1.2;
  run(g, {}, 1);
  assert.ok(b.poison, 'caught it from his friend');
  run(g, {}, SKILLS.mist.last);
  assert.ok(!a.poison && a.immune > 0 && a.immune <= SKILLS.mist.immune, 'immune after');
  assert.ok(Math.abs(hp - a.hp - (SKILLS.mist.total * (SKILLS.mist.last - 0.18)) / SKILLS.mist.last) < 60, `poison took ${hp - a.hp}`);
  const w = createFight({ hero: { regiment: 'archer', skills: ['web', 'fan'] }, foes: [{ regiment: 'vanguard' }], seed: 3 });
  Object.assign(w.men[0], { x: 0, z: 5, face: Math.PI });
  Object.assign(w.men[1], { x: 0, z: 0, face: 0 });
  run(w, (i) => ({ hero: { skill: i < 2 ? 0 : -1 } }), 1.2);
  assert.ok(w.clouds.some((c) => c.kind === 'web') || w.men[1].slow.length, 'web laid');
});

test('rage fills in the fight; each weapon art (X, and Z for the shield) wants its rage, lands, and waits its cooldown', () => {
  const g = pair('vanguard', 'tiger');
  run(g.game, (i) => ({ hero: { attack: i < 2, line: 'R' } }), 1);
  assert.ok(g.h.rage > 0 && g.f.rage > 0, 'landing and taking a blow both rouse');
  for (const regiment of ORDER) {
    for (const [key, which] of [['art', 'main'], ['offArt', 'off']]) {
      const id = which === 'off' ? REGIMENTS[regiment].offArt : REGIMENTS[regiment].art;
      if (!id) continue;
      const a = ARTS[id];
      const p = pair(regiment, regiment === 'tiger' ? 'yulin' : 'tiger', { hero: { mounted: false } });
      if (regiment === 'archer') Object.assign(p.f, { z: -8 });
      assert.ok(run(p.game, (i) => ({ hero: { [key]: i < 2 } }), 0.2).some((e) => e.type === 'noRage'), `${id} not without rage`);
      p.h.rage = p.h.rageMax;
      assert.ok(p.h.rageMax >= a.rage, `${regiment}'s bar holds ${id}`);
      const hp = p.f.hp;
      const ev = run(p.game, (i) => ({ hero: { [key]: i < 2 } }), 2);
      assert.ok(ev.some((e) => e.type === 'skill' && e.art && e.id === id), `${id} began`);
      assert.ok(p.f.hp < hp, `${id} landed`);
      assert.equal(p.h.act, null, `${id} finished`);
      assert.ok(Math.abs(p.h.rage - (p.h.rageMax - a.rage)) < 12, `${id} spent its rage`);
      assert.ok(p.h.artCool[id] > a.cool - 2.1, `${id} is waiting`);
    }
  }
  // The shield slam knocks the first man down; a finishing strike that kills is ready again with rage given back.
  const s = pair('yulin', 'tiger');
  s.h.rage = s.h.rageMax;
  run(s.game, (i) => ({ hero: { offArt: i < 2 } }), 0.3);
  assert.equal(s.f.stunKind, 'down');
  const k = pair('tiger', 'archer');
  k.h.rage = k.h.rageMax;
  k.f.hp = 500;
  const kill = run(k.game, (i) => ({ hero: { art: i < 2 } }), 0.6);
  assert.ok(kill.some((e) => e.type === 'refund'), 'refunded');
  assert.equal(k.h.artCool.finisher, 0);
});

test('every regiment skill runs to its end without fault, and talents are its own', () => {
  for (const regiment of ORDER) {
    const r = REGIMENTS[regiment];
    for (const id of r.skills) {
      assert.equal(SKILLS[id].owner, regiment);
      const other = r.skills.find((s) => s !== id);
      const g = pair(regiment, regiment === 'tiger' ? 'yulin' : 'tiger', { hero: { skills: [id, other], mounted: false } });
      const ev = run(g.game, (i) => ({ hero: { skill: i < 2 ? 0 : -1 } }), 3);
      assert.ok(ev.some((e) => e.type === 'skill' && e.id === id), `${id} began`);
      assert.equal(g.h.act, null, `${id} finished`);
      assert.ok(g.h.cool[0] > 0, `${id} is waiting`);
    }
    for (const id of r.talents) assert.equal(TALENTS[id].owner, regiment);
    const picked = loadout(regiment);
    assert.equal(picked.skills.length, 2);
    assert.equal(picked.talents.length, Math.min(4, r.talents.length));
  }
});

test('a fan volley keeps all five arrows and announces one release on their spawn tick', () => {
  const { game, h, f } = pair('archer', 'tiger', { hero: { skills: ['fan', 'gale'] } });
  f.z = -12;
  step(game, { hero: { skill: 0 } });
  let events;
  do {
    events = step(game, {});
  } while (h.act?.id === 'fan' && !events.some((e) => e.type === 'loose'));
  assert.deepEqual(events.filter((e) => e.type === 'loose').map((e) => e.skill), ['fan']);
  assert.equal(game.shots.filter((shot) => shot.skill === 'fan').length, 5);
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

test('the Silver Plume rides: the horse gathers pace and gallops on its wind, and turns wide at speed', () => {
  const game = createFight({ hero: { regiment: 'plume' }, foes: [{ regiment: 'yulin', at: [0, -14] }], seed: 2, place: { radius: 30, posts: [] } });
  const h = game.hero;
  assert.equal(h.mounted, true);
  assert.ok(h.body > 0.8, 'a horse takes room');
  Object.assign(h, { x: 0, z: 0, face: 0 });
  Object.assign(h.horse, { x: 0, z: 0, face: 0 });
  run(game, { hero: { move: [0, 1] } }, 2.5);
  const canter = h.horse.speed;
  assert.ok(canter > REGIMENTS.plume.horse.canter * 0.9 && canter <= REGIMENTS.plume.horse.canter + 0.01, `canter ${canter}`);
  run(game, { hero: { move: [0, 1], sprint: true } }, 1.5);
  assert.ok(h.horse.speed > REGIMENTS.plume.horse.canter + 1, 'sprinting gallops');
  assert.ok(h.horse.st < 100, 'a gallop spends the horse');
  // A hard turn at a gallop comes round slowly.
  const before = h.horse.face;
  run(game, { hero: { move: [1, 0], sprint: true } }, 0.5);
  const turned = Math.abs(h.horse.face - before);
  assert.ok(turned < 0.9 && turned > 0.3, `turned ${turned}`);
});

test('on horseback X couches the ji; R and T wait for his feet; E gets down and up again; U calls the horse', () => {
  const g = pair('plume', 'yulin');
  const ev = run(g.game, (i) => ({ hero: { skill: i < 2 ? 1 : -1 } }), 0.3);
  assert.ok(ev.some((e) => e.type === 'onFoot'), 'a skill from the saddle is refused');
  assert.ok(run(g.game, (i) => ({ hero: { art: i < 2 } }), 0.2).some((e) => e.type === 'needRun'), 'the couch wants a running horse');
  Object.assign(g.h, { x: 0, z: 10 });
  Object.assign(g.h.horse, { x: 0, z: 10, face: Math.PI });
  g.h.face = Math.PI;
  const lance = run(g.game, (i) => ({ hero: { move: [0, -1], sprint: true, art: i === 105 } }), 1.9);
  assert.ok(lance.some((e) => e.type === 'lance'), 'X couches the ji, and spends no rage');
  run(g.game, {}, 4);
  const down = run(g.game, (i) => ({ hero: { mount: i < 2 } }), 1.2);
  assert.ok(down.some((e) => e.type === 'dismounted'));
  assert.equal(g.h.mounted, false);
  const skill = run(g.game, (i) => ({ hero: { skill: i < 2 ? 1 : -1 } }), 0.2);
  assert.ok(skill.some((e) => e.type === 'skill'), 'on foot his skills work');
  run(g.game, {}, 3);
  // Walk away, call the horse, and get up again.
  g.h.x += 8;
  run(g.game, (i) => ({ hero: { call: i < 2 } }), 3);
  assert.ok(Math.hypot(g.h.horse.x - g.h.x, g.h.horse.z - g.h.z) < 2.2, 'the horse came');
  const up = run(g.game, (i) => ({ hero: { mount: i < 2 } }), 1.4);
  assert.ok(up.some((e) => e.type === 'mounted'));
  assert.equal(g.h.mounted, true);
});

function lanceDuel() {
  const game = createFight({ hero: { regiment: 'plume', at: [0, 0] }, foes: [{ regiment: 'tiger', at: [35, 0] }], seed: 3, place: { radius: 75, posts: [] } });
  const [h, f] = game.men;
  Object.assign(h, { x: 0, z: 0, face: 0 });
  Object.assign(h.horse, { x: 0, z: 0, face: 0, speed: 8 });
  return { game, h, f };
}

function atLancePoint(h, f) {
  const yaw = h.horse.face + ARTS.couch.aim;
  Object.assign(f, { x: h.x + 1.65 * Math.sin(yaw), z: h.z + 1.65 * Math.cos(yaw) });
}

const gallop = { move: [0, 1], sprint: true };

const reins = (throttle, turn = 0) => ({ reins: { throttle, turn }, sprint: throttle > 0 });

test('mounted reins brake to zero before reversing, independently of camera-space movement', () => {
  const { game, h } = lanceDuel();
  const horse = h.horse;
  horse.speed = 6.2;
  const back = { ...reins(-1), move: [1, 0], face: Math.PI / 2 };
  let before = horse.speed;
  let sawStop = false;
  for (let i = 0; i < 100; i++) {
    step(game, { hero: back });
    assert.ok(horse.speed <= before, 'braking and reversing should never advance the throttle');
    assert.equal(horse.face, 0, 'looking away must not steer the horse');
    if (horse.speed < 0) assert.ok(sawStop, 'the horse stopped before moving backward');
    if (horse.speed === 0) sawStop = true;
    before = horse.speed;
  }
  assert.equal(horse.speed, -1.3);
  assert.equal(h.x, 0);
  const beforeTurn = horse.face;
  step(game, { hero: reins(-1, 1) });
  assert.ok(horse.face > beforeTurn, 'a rein turn steers around the horse heading');
  const speed = horse.speed;
  step(game, { hero: reins(0) });
  assert.ok(horse.speed > speed, 'releasing the throttle slows a reversing horse');
});

test('a running horse bowls over infantry once until both bodies separate, without damaging them', () => {
  const { game, h, f } = lanceDuel();
  Object.assign(f, { x: 0, z: 1.45 });
  const hp = f.hp;
  const [ram] = step(game, { hero: reins(1) }).filter((e) => e.type === 'horseRam');
  assert.ok(ram);
  assert.equal(ram.who, f.id);
  assert.equal(ram.by, h.id);
  assert.ok(ram.at.every(Number.isFinite) && ram.speed >= 7.2);
  assert.equal(f.stunKind, 'down');
  assert.equal(f.hp, hp);
  assert.ok(run(game, { hero: reins(1) }, 0.85).every((e) => e.type !== 'horseRam'));
  Object.assign(f, { x: 0, z: 25, stun: 0, stunKind: null, vx: 0, vz: 0 });
  step(game, { hero: reins(1) });
  Object.assign(f, { x: 0, z: h.z + 1.45 });
  assert.ok(step(game, { hero: reins(1) }).some((e) => e.type === 'horseRam'), 'a separated rider can make a new pass');
});

test('a canter, reversing, a side brush and a committed lance do not knock an opponent down', () => {
  for (const [speed, x, z, command] of [
    [6.2, 0, 1.4, { reins: { throttle: 1, turn: 0 } }],
    [-1.3, 0, -1.385, reins(-1)],
    [8, 1.32, 0.5, reins(1)],
    [8, 0, 1.4, { ...reins(1), art: true }],
    [8, 0, 1.4, { ...reins(1), attack: true, line: 'R' }]
  ]) {
    const { game, h, f } = lanceDuel();
    h.horse.speed = speed;
    Object.assign(f, { x, z });
    const events = step(game, { hero: command });
    assert.ok(events.every((e) => e.type !== 'horseRam'), JSON.stringify({ speed, x, z, command }));
    assert.equal(f.stunKind, null);
  }
});

test('a mount can hit infantry crossing its path within a tick, even with clear endpoints', () => {
  const { game, f } = lanceDuel();
  Object.assign(f, { x: -1.5, z: 1.4, vx: 86 });
  assert.ok(step(game, { hero: reins(1), [f.id]: { move: [1, 0], sprint: true } }, 0.12)
    .some((e) => e.type === 'horseRam'));
  assert.equal(f.stunKind, 'down');
});

test('couching checks forward speed, rather than the magnitude of a reversing horse', () => {
  const { game, h } = lanceDuel();
  h.horse.speed = -8;
  const events = step(game, { hero: { ...reins(-1), art: true } });
  assert.ok(events.some((e) => e.type === 'needRun'));
  assert.ok(events.every((e) => e.type !== 'lance'));
});

test('an already-couched lance cannot acquire a hit while backing and resumes with forward motion', () => {
  const { game, h, f } = lanceDuel();
  const cast = step(game, { hero: { ...reins(1), art: true } });
  assert.ok(cast.some((e) => e.type === 'lance'));
  run(game, { hero: reins(-1) }, 1.5);
  assert.ok(h.horse.speed < 0);
  atLancePoint(h, f);
  const hp = f.hp;
  const backward = step(game, { hero: reins(-1) });
  assert.ok(backward.every((e) => e.skill !== 'couch'));
  assert.equal(f.hp, hp);
  assert.equal(h.act?.kind, 'lance');
  assert.equal(h.act.charging, false);

  while (h.horse.speed <= 0) step(game, { hero: reins(1) });
  atLancePoint(h, f);
  assert.ok(step(game, { hero: reins(1) }).some((e) => e.type === 'hit' && e.skill === 'couch'));
});

test('the couched ji has a brief wind-up while the horse keeps moving', () => {
  const { game, h, f } = lanceDuel();
  atLancePoint(h, f);
  const hp = f.hp;
  const cast = step(game, { hero: { ...gallop, art: true } });
  assert.ok(cast.some(e => e.type === 'lance'));
  assert.equal(f.hp, hp);
  assert.ok(h.z > 0);
  const hit = run(game, { hero: gallop }, 0.22).find(e => e.type === 'hit' && e.skill === 'couch');
  assert.ok(hit && hit.time - cast[0].time >= ARTS.couch.wind - TICK);
  assert.ok(h.act?.metAt >= ARTS.couch.wind);
});

test('the couched ji settles after a late valid hit and cannot strike during the whiff tail', () => {
  const art = ARTS.couch;
  const activeEnd = art.wind + art.last;
  for (const hitLate of [true, false]) {
    const { game, h, f } = lanceDuel();
    step(game, { hero: { ...gallop, art: true } });
    const at = activeEnd + (hitLate ? -0.04 : 0.03);
    while (h.act?.t < at) step(game, { hero: gallop });
    assert.equal(h.act?.kind, 'lance');
    atLancePoint(h, f);
    const hp = f.hp;
    const contact = step(game, { hero: gallop });
    const hit = contact.find(e => e.type === 'hit' && e.skill === 'couch');
    if (hitLate) {
      assert.ok(hit && h.act?.metAt > activeEnd - art.hitRecover);
      assert.equal(h.act.t, h.act.metAt);
      while (h.act) step(game, { hero: gallop });
      assert.ok(Math.abs(game.time - hit.time - art.hitRecover) <= TICK + 1e-9);
    } else {
      assert.equal(hit, undefined);
      while (h.act) step(game, { hero: gallop });
      assert.equal(f.hp, hp);
      assert.ok(Math.abs(game.time - activeEnd - art.recover) <= TICK + 1e-9);
    }
  }
});

test('the couched ji takes a man off the horse’s right front, not one dead ahead; a blow on a rider is shared with the horse; a dead horse throws him', () => {
  assert.equal(ARTS.couch.rage, 0);
  // Dead ahead: the couched point passes him by.
  const ahead = createFight({ hero: { regiment: 'plume' }, foes: [{ regiment: 'tiger', at: [0, 14] }], seed: 3, place: { radius: 30, posts: [] } });
  Object.assign(ahead.men[0], { x: 0, z: -10, face: 0 });
  Object.assign(ahead.men[0].horse, { x: 0, z: -10, face: 0 });
  Object.assign(ahead.men[1], { x: 0, z: 14, face: Math.PI });
  assert.ok(!run(ahead, (i) => ({ hero: { move: [0, 1], sprint: true, art: i === 150 } }), 4).some((e) => e.type === 'hit' && e.skill === 'couch'), 'not dead ahead');
  // On the right (a man's right is at heading − π/2: −x for heading 0).
  const game = createFight({ hero: { regiment: 'plume' }, foes: [{ regiment: 'tiger', at: [0, 14] }], seed: 3, place: { radius: 30, posts: [] } });
  const [h, f] = game.men;
  Object.assign(h, { x: 0, z: -10, face: 0 });
  Object.assign(h.horse, { x: 0, z: -10, face: 0 });
  Object.assign(f, { x: -1.7, z: 14, face: Math.PI });
  let hit = null;
  run(game, (i) => {
    if (!hit && f.hp < f.maxHp) hit = { hp: f.hp, stun: f.stunKind };
    return { hero: { move: [0, 1], face: 0, sprint: true, art: i === 150 } };
  }, 4);
  assert.ok(hit, 'the charge met him');
  assert.ok(f.maxHp - hit.hp > 150, `a heavy blow: ${f.maxHp - hit.hp}`);
  assert.equal(hit.stun, 'down');
  // Now he strikes back at the rider.
  const g = pair('tiger', 'plume');
  const horse = g.f.horse.hp,
    rider = g.f.hp;
  run(g.game, (i) => ({ hero: { attack: i < 2, line: 'R' } }), 1);
  assert.ok(g.f.horse.hp < horse && g.f.hp < rider, 'both took it');
  assert.ok(Math.abs(horse - g.f.horse.hp - (rider - g.f.hp)) <= 1, 'in equal shares');
  g.f.horse.hp = 5;
  const ev = run(g.game, (i) => ({ hero: { attack: i < 2, line: 'L' } }), 1);
  assert.ok(ev.some((e) => e.type === 'horseDown') && ev.some((e) => e.type === 'thrown'));
  assert.equal(g.f.mounted, false);
  assert.equal(g.f.stunKind, 'thrown');
  const rejected = step(g.game, { foe0: { mount: true } });
  assert.ok(rejected.some((e) => e.type === 'noHorse' && e.who === 'foe0' && e.dead));
  const recovery = run(g.game, {}, 2.5);
  assert.ok(!recovery.some((e) => e.type === 'mount' || e.type === 'mounted'));
  assert.equal(g.f.mounted, false);
});

test('the Cavalry and Centaur talents work only on horseback; Full Vigour above 85% health', () => {
  const blowOn = (talents, mounted, hp = 1) => {
    const g = pair('tiger', 'plume', { foe: { talents, mounted } });
    g.f.hp = Math.round(g.f.maxHp * hp);
    if (mounted) Object.assign(g.f.horse, { x: g.f.x, z: g.f.z });
    const was = g.f.hp + (g.f.horse?.hp ?? 0);
    run(g.game, (i) => ({ hero: { attack: i < 2, line: 'R' } }), 0.8);
    // Undo the curve that bends big blows, to compare what was dealt.
    const taken = was - g.f.hp - (g.f.horse?.hp ?? 0);
    return taken / (1 - taken / (g.f.maxHp * DAMAGE.cap));
  };
  const plain = blowOn(['equipped'], true);
  const cavalry = blowOn(['cavalry', 'equipped'], true);
  assert.ok(Math.abs(cavalry / plain - (1 - TALENTS.cavalry.less)) < 0.01, `cavalry ${cavalry} / ${plain}`);
  assert.equal(blowOn(['cavalry', 'equipped'], false, 0.8), blowOn(['equipped'], false, 0.8), 'not on foot');
  const vigour = blowOn(['vigour', 'equipped'], false, 1);
  const tired = blowOn(['vigour', 'equipped'], false, 0.8);
  assert.ok(Math.abs(vigour / tired - (1 - TALENTS.vigour.less)) < 0.01, `vigour ${vigour} / ${tired}`);
});

test('the damage formula: an ordinary blow takes a real share, and no single blow fells a man at full health', () => {
  for (const a of ORDER)
    for (const d of ORDER) {
      if (a === d) continue;
      const g = pair(a, d, { hero: { mounted: false }, foe: { mounted: false } });
      if (a === 'archer') Object.assign(g.f, { z: -6 });
      const hits = [];
      // Ordinary blows (or arrows), then the biggest things he has, his rage full.
      const drive = (i) => (a === 'archer' ? { hero: { attack: i % 90 < 70, aim: { yaw: Math.PI, pitch: 0.03 }, face: Math.PI } } : { hero: { attack: i % 50 < 2, line: 'R' } });
      for (const e of run(g.game, drive, 3)) if (e.type === 'hit' && e.who === 'foe0' && !e.glance) hits.push(e.damage / g.f.maxHp);
      assert.ok(hits.length && Math.min(...hits) > 0.04 && Math.max(...hits) < 0.2, `${a} on ${d}: ordinary ${hits.map((h) => h.toFixed(3))}`);
    }
  // Even the dearest art, critical, on the frailest man, leaves him standing.
  let worst = 0;
  for (let seed = 0; seed < 30; seed++) {
    const t = pair('vanguard', 'archer');
    t.game.rng = () => (seed % 2 ? 0.01 : 0.99);
    t.h.rage = t.h.rageMax;
    run(t.game, (i) => ({ hero: { art: i < 2 } }), 1.2);
    worst = Math.max(worst, 1 - t.f.hp / t.f.maxHp);
  }
  assert.ok(worst > 0.2 && worst < DAMAGE.cap, `the biggest blow took ${worst.toFixed(3)}`);
});

test('a bandage mends a fifth of his health, twice a fight', () => {
  const g = pair('yulin', 'tiger');
  g.h.hp = 500;
  const ev = run(g.game, (i) => ({ hero: { heal: i < 2 } }), 1.6);
  assert.ok(ev.some((e) => e.type === 'mend' && e.dressing));
  assert.equal(g.h.hp, 500 + Math.round(g.h.maxHp * 0.2));
  run(g.game, (i) => ({ hero: { heal: i < 2 } }), 1.6);
  run(g.game, (i) => ({ hero: { heal: i < 2 } }), 1.6);
  assert.equal(g.h.dressings, 0);
  assert.equal(g.h.hp, 500 + 2 * Math.round(g.h.maxHp * 0.2));
});
