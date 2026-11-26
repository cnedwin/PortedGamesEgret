// An act of the play: the ground, the Monkey King, the soldiers and the posts in his way, the arrows in the air,
// whoever bars the gate at the end, and the count that is kept of how he does. One call steps all of it and says
// what happened.
import * as nezha from './boss.mjs';
import * as erlang from './erlang.mjs';
import * as laozi from './laozi.mjs';
import { HAIRS, createClones, out, stepClones } from './clones.mjs';
import { FOES, createFoe, foeBox, hitFoe, standing, stepFoe } from './foes.mjs';
import { ATTACKS, TUNE, bodyOf, canBeHurt, conjure, createHero, hurtHero, reviveHero, stepHero } from './hero.mjs';
import { CELL, groundUnder, moveBody, overlaps, solidAt } from './level.mjs';

/** How long the count of blows waits for the next one, and how long he lies fallen before he is stood up again. */
export const COMBO_SECONDS = 1.9,
  REVIVE_SECONDS = 1.4;
const POST = { halfWidth: 20, height: 112 };
/** How near a post he may stand. */
export const POST_ROOM = 58;

// Whoever bars the gate is one of two, and each has his own rules under the same names.
const { present, ringBox } = nezha,
  way = boss => ({ erlang, laozi })[boss.kind] ?? nezha,
  bossBox = boss => way(boss).bossBox(boss),
  bossReach = boss => way(boss).bossReach(boss),
  hitBoss = (boss, attack) => way(boss).hitBoss(boss, attack),
  open = boss => way(boss).open(boss),
  restoreBoss = boss => way(boss).restoreBoss(boss),
  stepBoss = (boss, hero, dt) => way(boss).stepBoss(boss, hero, dt),
  wakeBoss = boss => way(boss).wakeBoss(boss);

/** A peach of the orchard: how much room it takes, and how fast it falls once it is knocked from its bough. */
const PEACH = { half: 16, fall: 2200 };
export const peachBox = peach => ({ x: peach.x - PEACH.half, y: peach.y - PEACH.half, width: PEACH.half * 2, height: PEACH.half * 2 });

/** A grate in the floor breathes fire by turns: quiet, then sputtering as a warning for `warn`, then alight for `on`. */
export const VENT = { period: 2.8, warn: 0.5, on: 1, width: 44, height: 150 };
/** What a grate is doing at a time in the act: `off`, `warn` or `on`. */
export function ventState(vent, time) {
  const at = (time + vent.offset) % VENT.period;
  return at < VENT.period - VENT.on - VENT.warn ? 'off' : at < VENT.period - VENT.on ? 'warn' : 'on';
}
/**
 * A furnace knocked over spills its fire along the floor, away from whoever struck it, for `spill` and for
 * `seconds`; every `every`, whoever of the household stands in it is burned as by a light blow.
 */
export const FURNACE = { halfWidth: 30, height: 100, spill: 230, seconds: 2.6, every: 0.5 };
export const furnaceBox = furnace => ({ x: furnace.x - FURNACE.halfWidth, y: furnace.y - FURNACE.height, width: FURNACE.halfWidth * 2, height: FURNACE.height });
const BURN = { name: 'burn', kind: 'hit', power: 1, stop: 0, shake: 0.1 };
/** Whether a place on the floor is in a furnace's spilled fire. */
const inSpill = (furnace, x, y) => furnace.life > 0 && Math.abs(y - furnace.y) < 12 && (x - furnace.x) * furnace.side > -10 && (x - furnace.x) * furnace.side < FURNACE.spill;

/** How far behind its pennant the court before the gate begins, and how far into it he walks before he is met. */
const COURT = { behind: 48, within: 200, edge: 44 };
/** How long the gate takes to open once whoever barred it is gone. */
export const GATE_SECONDS = 1.2;

/**
 * An act on a level. `from: 'boss'` begins it at the court before the gate with the soldiers already cleared
 * away, for whoever only wants to meet the one who bars it. `clones` is how many a tuft makes;
 * `solo` disables the special for the optional staff trial.
 */
export function createAct(level, { from, clones = HAIRS.count, solo = false } = {}) {
  const of = type => level.things.filter(thing => thing.type === type);
  const [spawn] = of('spawn'),
    [gate] = of('gate'),
    [lair] = [...of('boss'), ...of('erlang'), ...of('laozi')],
    checkpoints = of('checkpoint').map(thing => ({ x: thing.x, y: thing.y, reached: false }));
  // The court runs from the last pennant before him to the end of the level.
  const door = lair && checkpoints.findLast(point => point.x < lair.x),
    boss = lair ? ({ erlang, laozi }[lair.type] ?? nezha).createBoss(lair.x, lair.y, { left: (door?.x ?? lair.x - 500) - COURT.behind, right: level.width }) : null,
    skip = from === 'boss' && boss && door,
    start = skip ? door : spawn;
  if (skip) for (const point of checkpoints) point.reached = point.x <= door.x;
  return {
    level,
    hero: createHero(start.x, start.y),
    foes: level.things.filter(thing => thing.type in FOES).sort((a, b) => a.x - b.x).map((thing, id) => Object.assign(createFoe(thing.type, thing.x, thing.y, id), skip ? { state: 'down', gone: true } : {})),
    posts: of('post').map((thing, index) => ({ x: thing.x, y: thing.y, index, hits: 0 })),
    checkpoints,
    // Peaches hang until they are knocked down or jumped for; each gives back one of his own.
    peaches: of('peach').map((thing, index) => ({ index, x: thing.x, y: thing.y - 24, vy: 0, state: 'hung' })),
    eaten: 0,
    // The palace: grates that breathe fire, furnaces to be knocked over, and pills in the air or lying lit.
    vents: of('vent').map((thing, index) => ({ x: thing.x, y: thing.y, offset: index * 0.9 })),
    furnaces: of('furnace').map((thing, index) => ({ index, x: thing.x, y: thing.y, state: 'stands', side: 0, life: 0, wait: 0 })),
    pills: [],
    /** Whether he has come out of the furnace with eyes of fire, and strikes whoever bars the gate twice as hard. */
    keen: false,
    gate: gate ? { x: gate.x, y: gate.y, barred: false } : null,
    boss,
    from: skip ? 'boss' : undefined,
    solo,
    arrows: [],
    // The hairs: how many blows toward a tuft, the clones that are out, and what is left of their time.
    hairs: 0,
    tuft: clones,
    clones: [],
    crowd: { left: 0, wait: 0, blows: 0, casting: false, casts: 0 },
    resting: { x: start.x, y: start.y },
    reviveIn: 0,
    combo: 0,
    best: 0,
    timer: 0,
    time: 0,
    falls: 0,
    wounds: 0,
    felled: 0,
    state: 'play',
    result: null
  };
}

export const postBox = post => ({ x: post.x - POST.halfWidth, y: post.y - POST.height, width: POST.halfWidth * 2, height: POST.height });

/** A post is in the way of anyone on its ledge; the cloud roll goes through, which is how he gets behind one. */
function keepApart(hero, posts) {
  if (hero.state === 'dash') return;
  for (const post of posts) {
    if (Math.abs(hero.y - post.y) > 40 || Math.abs(hero.x - post.x) >= POST_ROOM) continue;
    const side = hero.x === post.x ? -hero.facing : Math.sign(hero.x - post.x);
    hero.x = post.x + side * POST_ROOM;
    if (Math.sign(hero.vx) === -side) hero.vx = 0;
  }
}

/** How well the act was played, from S down to C. An act with someone barring its gate allows more of everything. */
export function rankOf({ time, falls, wounds, boss }) {
  const more = boss ? 1 : 0;
  if (falls === 0 && wounds <= 1 + more * 2 && time <= 110 + more * 100) return 'S';
  if (falls === 0 && (wounds <= 3 + more * 3 || time <= 150 + more * 120)) return 'A';
  return falls <= 2 ? 'B' : 'C';
}

/** The soldiers still standing. */
export const remaining = act => act.foes.filter(standing).length;

/** Whether he has landed blows enough to pluck a tuft. */
export const tuftReady = act => !act.solo && act.hairs >= HAIRS.need && !act.clones.length && !act.crowd.casting;

/** Who the clones may go for, nearest to him first: soldiers, whoever bars the gate, and failing those a post. */
function quarry(act) {
  const { hero, boss } = act,
    near = thing => Math.abs(thing.x - hero.x) < HAIRS.sight,
    found = act.foes.filter(foe => standing(foe) && near(foe));
  if (boss && present(boss) && open(boss)) found.push(boss);
  if (!found.length) found.push(...act.posts.filter(near));
  return found.sort((a, b) => Math.abs(a.x - hero.x) - Math.abs(b.x - hero.x));
}

/**
 * One step of the act. Returns what happened: everything `stepHero` and `stepFoe` report, and besides `met`
 * (a blow that landed, with what it struck and where), `deflect` (an arrow knocked out of the air), `stuck` (an
 * arrow spent), `lapse` (the count of blows let go), `checkpoint`, `revive`, `barred` (the gate reached with
 * soldiers still standing) and `clear` (with the result).
 */
export function stepAct(act, input, dt) {
  if (act.state !== 'play') return [];
  const { hero, level, boss } = act,
    events = [];
  act.time += dt;

  // He lies where he fell for a moment, and is stood up again where he last rested.
  if (hero.state === 'down') {
    act.reviveIn -= dt;
    if (act.reviveIn <= 0) {
      reviveHero(hero, act.resting.x, act.resting.y);
      act.arrows.length = 0;
      // The one at the gate takes up the fight again from the start of the phase it had reached.
      if (boss && present(boss)) restoreBoss(boss);
      events.push({ type: 'revive' });
    }
  }
  // The tuft: asked for when the blows are enough, he plucks it, and at the moment he blows the clones are out.
  const { crowd } = act;
  if (input.special && tuftReady(act) && conjure(hero)) {
    act.hairs = 0;
    crowd.casting = true;
    events.push({ type: 'conjure' });
  }
  if (crowd.casting && (hero.state !== 'conjure' || hero.time >= TUNE.conjure.at)) {
    crowd.casting = false;
    if (hero.state === 'conjure') {
      act.clones = createClones(hero, act.tuft, ++crowd.casts);
      Object.assign(crowd, { left: HAIRS.seconds, wait: HAIRS.wave, blows: 0 });
      events.push({ type: 'clones', count: act.clones.length });
    }
  }
  const wound = from => {
    const felt = hurtHero(hero, from);
    if (!felt.length) return false;
    act.wounds++;
    act.combo = 0;
    if (hero.state === 'down') (act.falls++, (act.reviveIn = REVIVE_SECONDS));
    events.push(...felt);
    return true;
  };

  for (const event of stepHero(hero, input, dt, level)) {
    events.push(event);
    if (event.type !== 'strike') continue;
    // The staff meets whatever stands in its sweep: posts, soldiers, and arrows in the air.
    const { box, attack } = event,
      side = target => (hero.x <= target.x ? 1 : -1),
      where = (target, rect) => ({ x: target.x - side(target) * 8, y: (Math.max(box.y, rect.y) + Math.min(box.y + box.height, rect.y + rect.height)) / 2 });
    let landed = 0;
    for (const post of act.posts) {
      const rect = postBox(post);
      if (!overlaps(box, rect)) continue;
      post.hits += attack.power;
      landed++;
      events.push({ type: 'met', attack, post, side: side(post), at: where(post, rect) });
    }
    for (const foe of act.foes) {
      const rect = foeBox(foe);
      if (!standing(foe) || !overlaps(box, rect)) continue;
      landed++;
      const reply = hitFoe(foe, attack, side(foe));
      events.push({ type: 'met', attack, foe, side: side(foe), at: where(foe, rect), blocked: reply.some(event => event.type === 'foe-block') }, ...reply);
      if (!standing(foe)) act.felled++;
    }
    for (const furnace of act.furnaces)
      if (furnace.state === 'stands' && overlaps(box, furnaceBox(furnace))) {
        Object.assign(furnace, { state: 'tipped', side: side(furnace), life: FURNACE.seconds, wait: 0 });
        landed++;
        events.push({ type: 'furnace-tipped', furnace });
      }
    for (const peach of act.peaches)
      if (peach.state === 'hung' && overlaps(box, peachBox(peach))) {
        peach.state = 'falling';
        events.push({ type: 'peach-struck', at: { x: peach.x, y: peach.y } });
      }
    for (const arrow of act.arrows)
      if (arrow.life > 0 && overlaps(box, { x: arrow.x - 20, y: arrow.y - 6, width: 40, height: 12 })) {
        arrow.life = 0;
        events.push({ type: 'deflect', at: { x: arrow.x, y: arrow.y }, attack });
      }
    if (boss && present(boss)) {
      const rect = bossBox(boss);
      if (open(boss) && overlaps(box, rect)) {
        landed++;
        events.push({ type: 'met', attack, boss, side: side(boss), at: where(boss, rect) }, ...hitBoss(boss, act.keen ? { ...attack, power: attack.power * 2 } : attack));
      }
      // The ring can be knocked back the way it came, and then it is his to mind.
      const ring = boss.ring;
      // Laozi's snare takes the weapon that strikes it; Nezha's ring is knocked back the way it came.
      if (boss.kind === 'laozi') {
        if (ring && !hero.bare && overlaps(box, ringBox(ring))) ((hero.bare = true), events.push(...laozi.takeStaff(boss, hero)));
      } else if (ring && !ring.struck && overlaps(box, ringBox(ring))) {
        Object.assign(ring, { struck: true, back: true });
        events.push({ type: 'deflect', at: { x: ring.x, y: ring.y }, attack, ring });
      }
      // Erlang's hound can be struck as it shows itself and as it runs.
      const hound = boss.hound;
      if (hound && erlang.houndOut(hound) && overlaps(box, erlang.houndBox(hound))) {
        landed++;
        events.push({ type: 'met', attack, hound, side: side(hound), at: { x: hound.x, y: hound.y - 30 } }, ...erlang.hitHound(boss));
      }
    }
    if (landed) {
      act.combo += landed;
      act.best = Math.max(act.best, act.combo);
      act.timer = COMBO_SECONDS;
      // Every blow of his own that lands is a hair toward the next tuft; the clones' blows are not.
      if (!act.solo && !act.clones.length && act.hairs < HAIRS.need && (act.hairs = Math.min(HAIRS.need, act.hairs + landed)) === HAIRS.need) events.push({ type: 'hairs-full' });
    }
  }

  if (act.clones.length) {
    // The clones: each crowd's blow lands as a light blow of the staff would, and is counted with his.
    const blows = stepClones(act.clones, quarry(act), hero.x, dt, level, crowd);
    for (const { target, attack } of blows) {
      const side = target.x >= hero.x ? 1 : -1,
        at = { x: target.x, y: target.y - 60 };
      if (target === boss) events.push({ type: 'met', attack, boss, side, at, crowd: true }, ...hitBoss(boss, attack));
      else if ('kind' in target) {
        events.push({ type: 'met', attack, foe: target, side, at, crowd: true }, ...hitFoe(target, attack, side));
        if (!standing(target)) act.felled++;
      } else (target.hits++, events.push({ type: 'met', attack, post: target, side, at, crowd: true }));
    }
    if (blows.length) {
      act.combo += blows.length;
      act.best = Math.max(act.best, act.combo);
      act.timer = COMBO_SECONDS;
    }
    // Their time runs out, or he falls, and they are hairs again.
    if ((crowd.left -= dt) <= 0 || hero.state === 'down') {
      events.push({ type: 'clones-gone', at: act.clones.filter(out).map(clone => ({ x: clone.x, y: clone.y })) });
      act.clones = [];
    }
  }
  keepApart(hero, act.posts);
  // Once he is met in the court there is no leaving it until the matter is settled. Its edges are where the
  // posts of the booth stand, so he is kept clear of them.
  if (boss && present(boss)) {
    const kept = Math.min(boss.arena.right - COURT.edge, Math.max(boss.arena.left + COURT.edge, hero.x));
    if (kept !== hero.x) (hero.x = kept), (hero.vx = 0);
  }

  for (const foe of act.foes) {
    if (foe.gone) continue;
    for (const event of stepFoe(foe, hero, dt, level)) {
      events.push(event);
      if (event.type === 'arrow') act.arrows.push(event.arrow);
      else if (event.type === 'pill') act.pills.push(event.pill);
      else if ((event.type === 'foe-strike' || event.type === 'foe-touch') && overlaps(event.box, bodyOf(hero))) wound(foe.x);
    }
  }
  for (const arrow of act.arrows) {
    if (arrow.life <= 0) continue;
    arrow.life -= dt;
    arrow.x += arrow.vx * dt;
    arrow.y += arrow.vy * dt;
    if (canBeHurt(hero) && overlaps({ x: arrow.x - 14, y: arrow.y - 4, width: 28, height: 8 }, bodyOf(hero))) {
      wound(arrow.x - arrow.vx);
      arrow.life = 0;
    } else if (solidAt(level, arrow.x + Math.sign(arrow.vx) * 20, arrow.y) || arrow.life <= 0) {
      arrow.life = 0;
      events.push({ type: 'stuck', arrow });
    }
  }
  act.arrows = act.arrows.filter(arrow => arrow.life > 0);

  // The wind of a fan pushes back whoever stands before it, unless he is rolling through.
  for (const foe of act.foes) {
    const gust = FOES[foe.kind].gust;
    if (!gust || foe.gust <= 0 || hero.state === 'dash' || hero.state === 'down') continue;
    const ahead = (hero.x - foe.x) * foe.facing;
    if (ahead <= 0 || ahead > gust.reach || Math.abs(hero.y - foe.y) > 80) continue;
    const pushed = { x: hero.x, y: hero.y, vx: foe.facing * gust.push, vy: 0 };
    moveBody(pushed, dt, level, TUNE);
    hero.x = pushed.x;
  }
  // Pills: thrown in an arc at where he stood, they lie lit for a moment and burst.
  for (const pill of act.pills) {
    const spec = FOES.alchemist.pill;
    pill.time += dt;
    if (pill.state === 'fly') {
      const u = Math.min(1, pill.time / spec.seconds);
      pill.x = pill.from.x + (pill.to.x - pill.from.x) * u;
      pill.y = pill.from.y + (pill.to.y - 10 - pill.from.y) * u - spec.arc * 4 * u * (1 - u);
      if (u === 1) {
        // It comes to rest on whatever is under the place it was thrown at.
        while (pill.y < level.height && !groundUnder(level, pill.x, pill.y + 10)) pill.y += 4;
        Object.assign(pill, { state: 'fuse', time: 0 });
      }
    } else if (pill.time >= spec.fuse) {
      pill.state = 'burst';
      events.push({ type: 'burst', at: { x: pill.x, y: pill.y } });
      if (Math.hypot(hero.x - pill.x, hero.y - 50 - pill.y) < spec.radius) wound(pill.x);
    }
  }
  act.pills = act.pills.filter(pill => pill.state !== 'burst');
  // Grates: fire stands over one when its turn comes, and hurts whoever is in it.
  for (const vent of act.vents) {
    const now = ventState(vent, act.time);
    if (now !== vent.state) ((vent.state = now), now === 'on' && events.push({ type: 'vent-on', vent }));
    if (now === 'on' && overlaps({ x: vent.x - VENT.width / 2, y: vent.y - VENT.height, width: VENT.width, height: VENT.height }, bodyOf(hero))) wound(vent.x);
  }
  // Spilled fire: it burns him if he stands in it, and the household as a light blow would, now and then.
  for (const furnace of act.furnaces) {
    if (furnace.life <= 0) continue;
    furnace.life -= dt;
    if (hero.grounded && inSpill(furnace, hero.x, hero.y)) wound(furnace.x);
    if ((furnace.wait -= dt) > 0) continue;
    furnace.wait = FURNACE.every;
    for (const foe of act.foes) {
      if (!standing(foe) || foe.flies || !inSpill(furnace, foe.x, foe.y)) continue;
      events.push({ type: 'met', attack: BURN, foe, side: furnace.side, at: { x: foe.x, y: foe.y - 30 }, crowd: true }, ...hitFoe(foe, BURN, furnace.side));
      if (!standing(foe)) act.felled++;
    }
  }

  // Peaches: one knocked loose falls to whatever is under it, and one he touches when he is short of a peach is eaten.
  for (const peach of act.peaches) {
    if (peach.state === 'eaten') continue;
    if (peach.state === 'falling') {
      peach.vy += PEACH.fall * dt;
      peach.y += peach.vy * dt;
      if (groundUnder(level, peach.x, peach.y + 12)) Object.assign(peach, { y: Math.floor((peach.y + 13) / CELL) * CELL - 12, vy: 0, state: 'ground' });
    }
    if (hero.state !== 'down' && hero.health < TUNE.health && overlaps(peachBox(peach), bodyOf(hero))) {
      peach.state = 'eaten';
      hero.health++;
      act.eaten++;
      events.push({ type: 'peach', at: { x: peach.x, y: peach.y } });
    }
  }

  if (boss && !boss.gone) {
    // He comes down when the Monkey King walks into the court with no soldier left standing.
    if (boss.state === 'wait' && hero.state !== 'down' && remaining(act) === 0 && hero.x > boss.arena.left + COURT.within) events.push(...wakeBoss(boss));
    for (const event of stepBoss(boss, hero, dt)) {
      events.push(event);
      // His rage throws back whoever stands near, without hurting him.
      if (event.type === 'boss-phase' && hero.state !== 'down' && Math.abs(hero.x - boss.x) < 240) Object.assign(hero, { state: 'move', vx: (hero.x >= boss.x ? 1 : -1) * 560, vy: -320, grounded: false, queued: false, grace: 0 });
      else if (event.type === 'boss-gone') (events.push({ type: 'gate-open' }), (act.openAt = act.time + GATE_SECONDS));
      else if (event.type === 'arrow') act.arrows.push(event.arrow);
      else if (event.type === 'furnace-broken') act.keen = true;
    }
    const body = bodyOf(hero),
      blow = bossReach(boss);
    if (blow && overlaps(blow, body)) wound(boss.x);
    for (const hurt of way(boss).bossHazards?.(boss) ?? []) if (overlaps(hurt.box, body)) wound(hurt.from);
    // A staff the snare took lies where it was flung until he walks to it.
    const lost = boss.staff;
    if (lost && lost.wait <= 0 && hero.bare && hero.state !== 'down' && Math.abs(hero.x - lost.x) < laozi.LAOZI.staff.reach && Math.abs(hero.y - lost.y) < 60) {
      hero.bare = false;
      boss.staff = null;
      events.push({ type: 'staff-back' });
    }
    if (boss.ring && overlaps(ringBox(boss.ring), body)) wound(boss.ring.x - boss.ring.vx);
    // Burning ground hurts whoever stands on it; a cloud is clear of it.
    for (const fire of boss.fires) if (hero.grounded && hero.y >= boss.y - 1 && hero.x > Math.min(fire.from, fire.to) - 10 && hero.x < Math.max(fire.from, fire.to) + 10) wound((fire.from + fire.to) / 2);
  }

  if (act.combo > 0 && (act.timer -= dt) <= 0) {
    act.combo = 0;
    events.push({ type: 'lapse' });
  }
  if (hero.state !== 'down' && hero.grounded) {
    for (const point of act.checkpoints)
      if (!point.reached && hero.x >= point.x - 10) {
        point.reached = true;
        act.resting = { x: point.x, y: point.y };
        events.push({ type: 'checkpoint', point });
      }
    if (act.gate && hero.x >= act.gate.x - 40) {
      if (remaining(act) === 0) {
        // With the soldiers down the gate is his to walk through, once whoever bars it has been driven off.
        if (!boss || (boss.gone && act.time >= act.openAt)) {
          act.state = 'cleared';
          act.result = { time: act.time, best: act.best, falls: act.falls, wounds: act.wounds, felled: act.felled, rank: rankOf(act) };
          events.push({ type: 'clear', result: act.result });
        }
      } else if (!act.gate.barred) {
        act.gate.barred = true;
        events.push({ type: 'barred', left: remaining(act) });
      }
    } else if (act.gate && hero.x < act.gate.x - 120) act.gate.barred = false;
  }
  return events;
}

export { ATTACKS, FOES, moveBody };
export { BOSS } from './boss.mjs';
export { ERLANG } from './erlang.mjs';
export { LAOZI } from './laozi.mjs';
export { HAIRS } from './clones.mjs';
