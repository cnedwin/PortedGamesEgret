// An act of the play: the ground, the Monkey King, the soldiers and the posts in his way, the arrows in the air,
// and the count that is kept of how he does. One call steps all of it and says what happened.
import { FOES, createFoe, foeBox, hitFoe, standing, stepFoe } from './foes.mjs';
import { ATTACKS, bodyOf, canBeHurt, createHero, hurtHero, reviveHero, stepHero } from './hero.mjs';
import { moveBody, overlaps, solidAt } from './level.mjs';

/** How long the count of blows waits for the next one, and how long he lies fallen before he is stood up again. */
export const COMBO_SECONDS = 1.9,
  REVIVE_SECONDS = 1.4;
const POST = { halfWidth: 20, height: 112 };
/** How near a post he may stand. */
export const POST_ROOM = 58;

export function createAct(level) {
  const of = type => level.things.filter(thing => thing.type === type);
  const [spawn] = of('spawn'),
    [gate] = of('gate');
  return {
    level,
    hero: createHero(spawn.x, spawn.y),
    foes: [...of('spearman'), ...of('archer')].sort((a, b) => a.x - b.x).map((thing, id) => createFoe(thing.type, thing.x, thing.y, id)),
    posts: of('post').map((thing, index) => ({ x: thing.x, y: thing.y, index, hits: 0 })),
    checkpoints: of('checkpoint').map(thing => ({ x: thing.x, y: thing.y, reached: false })),
    gate: gate ? { x: gate.x, y: gate.y, barred: false } : null,
    arrows: [],
    resting: { x: spawn.x, y: spawn.y },
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

/** How well the act was played, from S down to C. */
export function rankOf({ time, falls, wounds }) {
  if (falls === 0 && wounds <= 1 && time <= 110) return 'S';
  if (falls === 0 && (wounds <= 3 || time <= 150)) return 'A';
  return falls <= 2 ? 'B' : 'C';
}

/** The soldiers still standing. */
export const remaining = act => act.foes.filter(standing).length;

/**
 * One step of the act. Returns what happened: everything `stepHero` and `stepFoe` report, and besides `met`
 * (a blow that landed, with what it struck and where), `deflect` (an arrow knocked out of the air), `stuck` (an
 * arrow spent), `lapse` (the count of blows let go), `checkpoint`, `revive`, `barred` (the gate reached with
 * soldiers still standing) and `clear` (with the result).
 */
export function stepAct(act, input, dt) {
  if (act.state !== 'play') return [];
  const { hero, level } = act,
    events = [];
  act.time += dt;

  // He lies where he fell for a moment, and is stood up again where he last rested.
  if (hero.state === 'down') {
    act.reviveIn -= dt;
    if (act.reviveIn <= 0) {
      reviveHero(hero, act.resting.x, act.resting.y);
      act.arrows.length = 0;
      events.push({ type: 'revive' });
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
      events.push({ type: 'met', attack, foe, side: side(foe), at: where(foe, rect) }, ...hitFoe(foe, attack, side(foe)));
      if (!standing(foe)) act.felled++;
    }
    for (const arrow of act.arrows)
      if (arrow.life > 0 && overlaps(box, { x: arrow.x - 20, y: arrow.y - 6, width: 40, height: 12 })) {
        arrow.life = 0;
        events.push({ type: 'deflect', arrow, attack });
      }
    if (landed) {
      act.combo += landed;
      act.best = Math.max(act.best, act.combo);
      act.timer = COMBO_SECONDS;
    }
  }
  keepApart(hero, act.posts);

  for (const foe of act.foes) {
    if (foe.gone) continue;
    for (const event of stepFoe(foe, hero, dt, level)) {
      events.push(event);
      if (event.type === 'arrow') act.arrows.push(event.arrow);
      else if (event.type === 'foe-strike' && overlaps(event.box, bodyOf(hero))) wound(foe.x);
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
        act.state = 'cleared';
        act.result = { time: act.time, best: act.best, falls: act.falls, wounds: act.wounds, felled: act.felled, rank: rankOf(act) };
        events.push({ type: 'clear', result: act.result });
      } else if (!act.gate.barred) {
        act.gate.barred = true;
        events.push({ type: 'barred', left: remaining(act) });
      }
    } else if (act.gate && hero.x < act.gate.x - 120) act.gate.barred = false;
  }
  return events;
}

export { ATTACKS, FOES, moveBody };
