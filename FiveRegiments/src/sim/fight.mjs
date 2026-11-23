// The fight: men on a round field, their blows, guards, kicks, steps, stamina, regiment skills and talents,
// arrows and the clouds and webs left on the ground. Pure rules: no page, no engine, the same in Node and in
// the browser. The picture reads `fight` every frame and its `events`.
//
// Each man is driven by an input each tick, from the keys or from a brain (brain.mjs):
//   { move: [x, z], face, sprint, attack, guard, kick, step, skill, line, aim, swap }
// `move` is a world direction (length up to 1), `face` the heading he wants (radians, null keeps his own),
// `attack`/`guard`/`sprint` are held buttons, `kick`/`step`/`swap` are held too (a press is read on its
// first tick), `skill` is 0 or 1 while one of his two skill buttons is down (else -1), `line` the line of
// cut he has chosen (L R O T), `aim` an optional { yaw, pitch } for the bow.
//
// Lines are named from the striker's side: L is a cut that starts on his left. It arrives on the other man's
// right, so to guard it he holds his guard on R (`facing(line)`). Overhead and thrust meet themselves.

import { REGIMENTS, SKILLS, loadout } from './regiments.mjs';

export const TICK = 1 / 60;
export const BODY = 0.42;
export const DEFLECT = 0.2;
const GUARD_FRONT = (78 * Math.PI) / 180;
const KICK = { wind: 0.24, recover: 0.34, reach: 1.3, arc: 0.95, damage: 26, cost: 14 };
const STEP = { time: 0.34, distance: 2.7, safe: 0.17, cost: 20 };
const HOLD = 0.85;
const GRAVITY = 9.8;

export const facing = (line) => (line === 'L' ? 'R' : line === 'R' ? 'L' : line);

export function createRandom(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Bring a man onto the field. */
function enlist(game, spec, side, index) {
  const load = loadout(spec.regiment, spec);
  const r = REGIMENTS[load.regiment];
  const talents = new Set(load.talents);
  const health = Math.round(r.health * (talents.has('strongWalls') ? 1.1 : 1) * (spec.health ?? 1));
  const at = spec.at ?? [0, 0];
  const man = {
    id: side === 'hero' ? 'hero' : 'foe' + index,
    side,
    regiment: load.regiment,
    r,
    skills: load.skills,
    talents,
    x: at[0],
    z: at[1],
    face: spec.face ?? 0,
    turn: spec.turn ?? 10,
    vx: 0,
    vz: 0,
    hp: health,
    maxHp: health,
    st: 100,
    maxSt: 100,
    rest: 0,
    line: 'R',
    guard: false,
    guardLine: 'R',
    guardAt: -9,
    act: null,
    stun: 0,
    stunKind: null,
    knock: [0, 0],
    cool: [0, 0],
    // Lasting effects: slowed, poisoned, immune to poison, damage taken less, the shout, pinned, bleeding.
    slow: [],
    poison: null,
    immune: 0,
    guardBuff: 0,
    dr: [],
    shout: null,
    pin: 0,
    bleed: null,
    afterStep: 0,
    afterSprint: 0,
    burntWait: 0,
    lastThread: false,
    knife: false,
    draw: null,
    alive: true,
    moving: 0,
    sprinting: false,
    prev: {},
    stats: { blows: 0, hits: 0, deflects: 0, guards: 0, broken: 0, taken: 0, damage: 0 }
  };
  return man;
}

/**
 * A fight: `hero` and `foes` are loadouts ({ regiment, skills, talents }); `place` has the field's radius and its
 * posts ({ x, z, r }) that men and arrows cannot pass.
 */
export function createFight({ hero, foes, place = { radius: 12, posts: [] }, seed = 1, health = 1 }) {
  const game = {
    time: 0,
    rng: createRandom(seed),
    place,
    men: [],
    shots: [],
    clouds: [],
    events: [],
    over: null,
    token: null,
    tokenTime: 0,
    downs: []
  };
  const heroMan = enlist(game, { ...hero, at: hero.at ?? [0, 4.5], face: Math.PI }, 'hero', 0);
  game.men.push(heroMan);
  foes.forEach((spec, i) => {
    const spread = foes.length > 1 ? (i - (foes.length - 1) / 2) * 4.2 : 0;
    game.men.push(enlist(game, { ...spec, health: (spec.health ?? 1) * health, at: spec.at ?? [spread, -4.5], face: 0 }, 'foe', i));
  });
  game.hero = heroMan;
  return game;
}

const emit = (game, type, data) => game.events.push({ type, time: game.time, ...data });
export const enemiesOf = (game, man) => game.men.filter((m) => m.alive && m.side !== man.side);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const bearing = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

/** How fast he may walk now, after slows, pins, guards and what his hands are doing. */
function speedOf(man) {
  let speed = man.r.speed * (man.talents.has('quickFeet') ? 1.08 : 1);
  for (const s of man.slow) speed *= 1 - s.k;
  const act = man.act;
  if (man.guard) speed *= man.r.offhand === 'shield' ? 0.8 : 0.5;
  if (act?.kind === 'swing') speed *= act.t < act.wind ? 0.62 : 0.4;
  if (man.draw) speed *= man.talents.has('swiftWind') ? 0.72 : 0.55;
  if (act?.kind === 'skill') speed *= act.walk ?? 0.35;
  if (act?.kind === 'kick') speed *= 0.3;
  if (man.pin > 0) speed = Math.min(speed, SKILLS.drop.cap);
  return speed;
}

function damageMultiplier(game, man, line) {
  let k = 1;
  if (man.talents.has('valour')) k *= 1.12;
  if (man.talents.has('lastStand')) k *= 1 + 0.3 * (1 - man.hp / man.maxHp);
  if (man.talents.has('oneThrust') && line === 'T') k *= 1.15;
  if (man.talents.has('dragon') && man.afterSprint > 0) {
    k *= 1.2;
    man.afterSprint = 0;
  }
  if (man.regiment === 'archer' && man.knife && man.talents.has('shortKnife')) k *= 1.3;
  return k;
}

function takenMultiplier(man) {
  let k = 1;
  for (const d of man.dr) k *= 1 - d.k;
  if (man.talents.has('cicada') && man.afterStep > 0) k *= 0.65;
  if (man.talents.has('ironHorse') && (man.sprinting || man.act?.charging)) k *= 0.8;
  return k;
}

function spend(man, amount) {
  man.st -= amount;
  man.rest = 0.6;
}

/** Health down, with the talents that answer a wound. */
function wound(game, man, amount, by, info = {}) {
  if (!man.alive || amount <= 0) return 0;
  const was = man.hp;
  amount = Math.round(amount);
  man.hp -= amount;
  if (!info.quiet) man.stats.taken++;
  if (by) by.stats.damage += amount;
  if (!info.quiet && man.talents.has('burntBoats') && man.burntWait <= 0 && game.rng() < 0.3) {
    man.dr.push({ k: 0.2, t: 6 });
    man.burntWait = 30;
    emit(game, 'talent', { who: man.id, id: 'burntBoats' });
  }
  if (man.talents.has('lastThread') && !man.lastThread && was > man.maxHp / 2 && man.hp <= man.maxHp / 2 && man.hp > 0) {
    man.lastThread = true;
    man.hp += Math.round(man.maxHp * 0.15);
    emit(game, 'talent', { who: man.id, id: 'lastThread' });
  }
  emit(game, 'hit', { who: man.id, by: by?.id, damage: amount, ...info });
  if (man.hp <= 0) {
    man.hp = 0;
    man.alive = false;
    man.act = null;
    man.guard = false;
    man.draw = null;
    game.downs.push({ id: man.id, time: game.time });
    emit(game, 'down', { who: man.id, by: by?.id });
  }
  return amount;
}

function stagger(man, time, kind = 'flinch', push = [0, 0]) {
  if (!man.alive) return;
  const k = man.talents.has('steady') ? 0.5 : 1;
  man.stun = Math.max(man.stun, time * k);
  man.stunKind = kind;
  man.knock = [push[0] * k, push[1] * k];
  man.act = null;
  man.draw = null;
  man.guard = false;
}

/** Whether `target` stands within `reach` of `man` and inside the swept half-angle `arc` of his heading. */
function inSweep(man, target, reach, arc, face = man.face) {
  const d = dist(man, target);
  if (d - BODY > reach) return false;
  if (d < 0.01) return true;
  const off = Math.abs(wrap(bearing(man, target) - face));
  return off <= arc + Math.atan2(BODY, d);
}

/**
 * One blow lands. `spec`: { line, damage, reach, arc, heavy (0..1), skill, all (hits everyone in the sweep, else the
 * nearest), unguardable, guardCost (extra), stun, push, crit, slam }.
 * Returns the men it reached.
 */
export function strike(game, man, spec) {
  const targets = enemiesOf(game, man).filter((t) => inSweep(man, t, spec.reach, spec.arc, spec.face ?? man.face));
  if (!spec.all) targets.sort((a, b) => dist(man, a) - dist(man, b)).splice(1);
  if (!targets.length) {
    emit(game, 'whiff', { who: man.id, line: spec.line, skill: spec.skill });
    return [];
  }
  for (const target of targets) resolve(game, man, target, spec);
  return targets;
}

function resolve(game, man, target, spec) {
  const line = spec.line ?? 'R';
  // A step's first instant cannot be touched.
  if (target.act?.kind === 'step' && target.act.t < STEP.safe) {
    emit(game, 'evade', { who: target.id, by: man.id });
    return;
  }
  let damage = spec.damage * damageMultiplier(game, man, line) * (1 + 0.6 * (spec.heavy ?? 0));
  let crit = false;
  if (man.r.crit && spec.crit !== false && game.rng() < man.r.crit.chance) {
    crit = true;
    damage *= man.r.crit.power + (man.talents.has('tenThousand') ? 0.25 : 0);
  }
  const toward = bearing(target, man);
  const front = Math.abs(wrap(toward - target.face)) <= GUARD_FRONT;
  const counter = target.act?.kind === 'skill' && target.act.id === 'counter' && target.act.t < SKILLS.counter.hold;
  if (counter && front && !spec.unguardable) {
    // The counter takes the blow on the shield and cuts back at once.
    target.act.answered = true;
    target.act.t = SKILLS.counter.hold;
    emit(game, 'deflect', { who: target.id, by: man.id, line, counter: true });
    target.stats.deflects++;
    const back = target.r.blows.R.damage * SKILLS.counter.damage;
    wound(game, man, back * takenMultiplier(man), target, { line: 'R', skill: 'counter' });
    stagger(man, SKILLS.counter.stun, 'stun');
    return;
  }
  const guarding = target.guard && front && !spec.unguardable && target.st > 0;
  const exact = guarding && target.guardLine === facing(line);
  // A shield covers the lines it can whichever way the guard is set, but only the right line can be deflected.
  const covered = exact || (guarding && (target.r.shield?.lines.includes(facing(line)) ?? false));
  const fatal = man.talents.has('fatal') && game.rng() < 0.15;
  if (covered && !fatal) {
    // A full two-handed blow is too heavy to turn aside; it can only be stopped.
    const tooHeavy = man.r.heft && (spec.heavy ?? 0) > 0.5;
    if (exact && game.time - target.guardAt <= DEFLECT && !spec.slam && !tooHeavy) {
      // Caught in the first instant of the guard: the blow is turned aside and the striker reels.
      target.stats.deflects++;
      emit(game, 'deflect', { who: target.id, by: man.id, line });
      stagger(man, spec.heavy ? 0.85 : 0.65, 'reel');
      return;
    }
    // A shield taken on the wrong line still lets some of the blow through to the arm behind it.
    if (!exact) wound(game, target, damage * 0.25 * takenMultiplier(target), man, { line, graze: true, skill: spec.skill });
    if (!target.alive) return;
    let cost = damage * target.r.guardCost * (exact ? 1 : 1.2) * (target.talents.has('ironWall') ? 0.7 : 1) * (man.talents.has('shieldBreaker') ? 1.4 : 1) * (spec.guardCost ?? man.r.heft ?? 1);
    spend(target, cost);
    target.stats.guards++;
    emit(game, 'block', { who: target.id, by: man.id, line, heavy: spec.heavy ?? 0 });
    if (target.talents.has('recoil')) spend(man, 14);
    if (target.st <= 0) {
      target.st = 0;
      target.stats.broken++;
      emit(game, 'break', { who: target.id, by: man.id });
      stagger(target, 1.0, 'break');
      wound(game, target, damage * 0.35 * takenMultiplier(target), man, { line, broke: true, skill: spec.skill });
    } else {
      stagger(man, spec.heavy ? 0.12 : 0.22, 'recoil');
      if (spec.push) target.knock = [Math.sin(man.face) * spec.push * 0.4, Math.cos(man.face) * spec.push * 0.4];
    }
    return;
  }
  if (guarding && !fatal) {
    // The wrong line: half of it gets through, and the guard takes a jolt.
    spend(target, damage * 0.2);
    damage *= 0.5;
    emit(game, 'graze', { who: target.id, by: man.id, line });
  }
  const dealt = wound(game, target, damage * takenMultiplier(target), man, { line, crit, heavy: spec.heavy ?? 0, skill: spec.skill });
  man.stats.hits++;
  if (!target.alive) return;
  const armoured = target.talents.has('unstoppable') && target.act?.kind === 'swing' && target.act.held > 0.15;
  const push = spec.push ?? (spec.heavy ? 0.9 : 0.35);
  if (!armoured) stagger(target, spec.stun ?? (spec.heavy ? 0.55 : 0.32), spec.stun > 0.8 ? 'down' : 'flinch', [Math.sin(man.face) * push, Math.cos(man.face) * push]);
  if (man.talents.has('bloodThirst')) man.hp = Math.min(man.maxHp, man.hp + Math.round(man.maxHp * 0.03));
  if (man.talents.has('venom') && !spec.skill) poison(game, target, 10, 3);
  if (man.talents.has('bloodletting')) target.bleed = { t: 1, x: target.x, z: target.z, by: man.id };
  if (spec.pin && target.moving > 1.5) {
    target.pin = SKILLS.drop.pin;
    emit(game, 'pin', { who: target.id });
  }
  return dealt;
}

function poison(game, man, dps, time) {
  if (man.immune > 0 || !man.alive) return;
  if (!man.poison) emit(game, 'poison', { who: man.id });
  man.poison = { dps: Math.max(dps, man.poison?.dps ?? 0), t: Math.max(time, man.poison?.t ?? 0) };
}

// ---- arrows and things thrown ----------------------------------------------------------------------------

function loose(game, man, { yaw, pitch = 0.04, power = 1, damage, kind = 'arrow', blast = 0, web = false, speed }) {
  const v = (speed ?? man.r.bow?.speed ?? 40) * (0.62 + 0.38 * power);
  game.shots.push({
    kind,
    by: man.id,
    side: man.side,
    x: man.x + Math.sin(yaw) * 0.6,
    y: 1.45,
    z: man.z + Math.cos(yaw) * 0.6,
    vx: Math.sin(yaw) * Math.cos(pitch) * v,
    vy: Math.sin(pitch) * v,
    vz: Math.cos(yaw) * Math.cos(pitch) * v,
    from: [man.x, man.z],
    damage,
    blast,
    web,
    life: 2.4
  });
  emit(game, 'loose', { who: man.id, kind });
}

/** The heading and lift that put an arrow on `target` (leading him a little). */
export function aimAt(man, target, speed) {
  const d = dist(man, target);
  const t = d / Math.max(1, speed);
  const x = target.x + target.vx * t * 0.8,
    z = target.z + target.vz * t * 0.8;
  const flat = Math.hypot(x - man.x, z - man.z);
  const yaw = Math.atan2(x - man.x, z - man.z);
  const pitch = Math.atan2(0.5 * GRAVITY * 0.5 * (flat / speed) ** 2 - 0.25, flat);
  return { yaw, pitch };
}

function flyShots(game, dt) {
  for (const shot of game.shots) {
    if (shot.done) continue;
    if (shot.kind === 'wave') {
      // A blade wave runs level along the ground; whom it cuts is settled in groundEffects.
      shot.x += shot.vx * dt;
      shot.z += shot.vz * dt;
      if ((shot.life -= dt) <= 0) {
        shot.done = true;
        shot.keep = 0;
      }
      continue;
    }
    const ox = shot.x,
      oz = shot.z;
    shot.vy -= GRAVITY * 0.5 * dt;
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.z += shot.vz * dt;
    shot.life -= dt;
    // Posts stop arrows.
    for (const post of game.place.posts ?? []) {
      if (Math.hypot(shot.x - post.x, shot.z - post.z) < post.r) {
        land(game, shot);
        break;
      }
    }
    if (shot.done) continue;
    for (const man of game.men) {
      if (!man.alive || man.side === shot.side) continue;
      // The segment of this tick against his body, a standing cylinder.
      const ax = ox - man.x,
        az = oz - man.z,
        bx = shot.x - man.x,
        bz = shot.z - man.z;
      const dx = bx - ax,
        dz = bz - az,
        len = dx * dx + dz * dz;
      const k = len > 0 ? clamp(-(ax * dx + az * dz) / len, 0, 1) : 0;
      const near = Math.hypot(ax + dx * k, az + dz * k);
      if (near < BODY && shot.y > 0 && shot.y < 1.95) {
        arrowHit(game, shot, man);
        break;
      }
    }
    if (!shot.done && (shot.y <= 0 || shot.life <= 0 || Math.hypot(shot.x, shot.z) > game.place.radius + 6)) land(game, shot);
  }
  game.shots = game.shots.filter((s) => !s.done || s.keep > 0);
  for (const s of game.shots) if (s.done) s.keep -= dt;
}

function land(game, shot) {
  shot.done = true;
  shot.keep = 3;
  shot.y = Math.max(0, shot.y);
  emit(game, 'land', { kind: shot.kind, at: [shot.x, shot.y, shot.z] });
  burst(game, shot);
}

function burst(game, shot) {
  const by = game.men.find((m) => m.id === shot.by);
  if (shot.blast) {
    emit(game, 'blast', { at: [shot.x, shot.z], radius: shot.blast });
    for (const man of game.men) {
      if (!man.alive || man.side === shot.side) continue;
      const d = Math.hypot(man.x - shot.x, man.z - shot.z);
      if (d < shot.blast + BODY) {
        wound(game, man, shot.damage * (1 - 0.4 * (d / shot.blast)) * takenMultiplier(man), by, { skill: 'blast' });
        if (man.alive) stagger(man, 0.5, 'flinch', [(man.x - shot.x) * 0.5, (man.z - shot.z) * 0.5]);
      }
    }
  }
  if (shot.web) {
    const s = SKILLS.web;
    game.clouds.push({ kind: 'web', x: shot.x, z: shot.z, radius: s.radius, t: s.last, side: shot.side, by: shot.by });
    emit(game, 'web', { at: [shot.x, shot.z], radius: s.radius });
  }
}

function arrowHit(game, shot, man) {
  shot.done = true;
  shot.keep = 0;
  shot.stuck = man.id;
  const by = game.men.find((m) => m.id === shot.by);
  if (shot.blast || shot.web) {
    // A blast arrow on a man bursts where he stands.
    shot.x = man.x;
    shot.z = man.z;
    shot.y = 1;
    emit(game, 'land', { kind: shot.kind, at: [shot.x, shot.y, shot.z], on: man.id });
    if (shot.blast) wound(game, man, shot.damage * 0.4 * takenMultiplier(man), by, { skill: 'blast', arrow: true });
    burst(game, shot);
    return;
  }
  const toward = Math.atan2(shot.from[0] - man.x, shot.from[1] - man.z);
  const off = Math.abs(wrap(toward - man.face));
  let damage = shot.damage;
  if (by?.talents.has('hundredPaces')) {
    const far = Math.hypot(shot.from[0] - man.x, shot.from[1] - man.z);
    damage *= far > 20 ? 1.5 : far > 12 ? 1.3 : 1;
  }
  if (man.guard && man.st > 0) {
    const shield = man.r.shield;
    const arc = shield ? (man.talents.has('againstStream') ? (100 * Math.PI) / 180 : shield.arrowArc) : (40 * Math.PI) / 180;
    if (off <= arc) {
      const through = by?.talents.has('piercing') ? 0.5 : 0;
      const kept = shield ? 1 : 0.5;
      spend(man, 6);
      emit(game, 'block', { who: man.id, by: shot.by, arrow: true });
      man.stats.guards++;
      const rest = damage * (1 - kept * (1 - through));
      if (rest > 1) wound(game, man, rest * takenMultiplier(man), by, { arrow: true });
      return;
    }
  }
  if (man.act?.kind === 'step' && man.act.t < STEP.safe) {
    emit(game, 'evade', { who: man.id, by: shot.by });
    shot.done = false;
    return;
  }
  wound(game, man, damage * takenMultiplier(man), by, { arrow: true });
  if (by) by.stats.hits++;
  if (man.alive && damage > 80 && !man.act) stagger(man, 0.16, 'flinch', [shot.vx * 0.004, shot.vz * 0.004]);
}

// ---- what a man does ---------------------------------------------------------------------------------------

const canAct = (man) => man.alive && man.stun <= 0 && !man.act;

function startSwing(game, man, line, quick = false) {
  const blow = man.r.blows[line];
  if (!blow) return;
  if (man.st < 4) return;
  const reach = blow.reach + (man.talents.has('longArm') ? 0.4 : 0);
  man.act = { kind: 'swing', line, t: 0, wind: blow.wind * (quick ? 0.55 : man.chain > 0 ? 0.85 : 1), held: 0, struck: false, blow, reach, recover: blow.recover };
  man.chain = 0;
  man.guard = false;
  man.stats.blows++;
  emit(game, 'swing', { who: man.id, line });
}

function startKick(game, man) {
  if (man.st < 6) return;
  man.act = { kind: 'kick', t: 0 };
  man.guard = false;
  spend(man, KICK.cost);
  emit(game, 'kick', { who: man.id });
}

function startStep(game, man, input) {
  if (man.st < 8) return;
  let [mx, mz] = input.move ?? [0, 0];
  if (Math.hypot(mx, mz) < 0.2) [mx, mz] = [-Math.sin(man.face), -Math.cos(man.face)];
  const len = Math.hypot(mx, mz);
  man.act = { kind: 'step', t: 0, dx: mx / len, dz: mz / len };
  man.guard = false;
  man.draw = null;
  spend(man, STEP.cost);
  emit(game, 'step', { who: man.id });
}

function nearestFoe(game, man) {
  let best = null,
    bd = Infinity;
  for (const t of enemiesOf(game, man)) {
    const d = dist(man, t);
    if (d < bd) [best, bd] = [t, d];
  }
  return best;
}

function startSkill(game, man, slot, input) {
  const id = man.skills[slot];
  const s = SKILLS[id];
  if (!s || man.cool[slot] > 0 || man.st < s.cost * 0.5) return;
  if ((id === 'gale' || id === 'fan' || id === 'blast' || id === 'web' || id === 'backStep') && man.knife) man.knife = false;
  man.cool[slot] = s.cool;
  spend(man, s.cost);
  man.guard = false;
  man.draw = null;
  const target = nearestFoe(game, man);
  man.act = { kind: 'skill', id, t: 0, slot, hits: 0, aim: input.aim ?? (target ? { yaw: bearing(man, target), pitch: 0.03 } : { yaw: man.face, pitch: 0.03 }) };
  if (target && ['leap', 'drop', 'boar', 'bull', 'spin'].includes(id)) man.face = bearing(man, target);
  if (id === 'flowers') man.act.walk = 1 - s.slow;
  if (id === 'whirl') man.act.walk = 0.5;
  if (id === 'shout' || id === 'mist' || id === 'counter') man.act.walk = 0.25;
  emit(game, 'skill', { who: man.id, id });
}

/** Advance a regiment skill: where it carries him and when it strikes. */
function runSkill(game, man, act, dt) {
  const s = SKILLS[act.id];
  const base = man.r.blows.R.damage;
  const fwd = [Math.sin(man.face), Math.cos(man.face)];
  const at = (time) => act.t - dt < time && act.t >= time;
  const dash = (speed) => {
    man.vx = fwd[0] * speed;
    man.vz = fwd[1] * speed;
    act.moving = true;
  };
  switch (act.id) {
    case 'counter':
      man.guard = true;
      man.guardLine = man.line;
      if (act.t >= s.hold + 0.25) man.act = null;
      break;
    case 'bull': {
      const run = 0.62;
      act.charging = act.t < run;
      if (act.t < run && !act.met) {
        dash(s.range / run);
        const hit = enemiesOf(game, man).find((t) => inSweep(man, t, 1.05, 0.7));
        if (hit) {
          act.met = true;
          strike(game, man, { line: 'T', damage: base * s.damage, reach: 1.2, arc: 0.7, push: 2.4, stun: s.knock, skill: 'bull' });
        }
      }
      if (act.t > run + 0.35) man.act = null;
      break;
    }
    case 'turning':
      if (at(0.28)) strike(game, man, { line: 'R', damage: base * s.damage, reach: s.reach, arc: Math.PI, all: true, skill: 'turning', push: 0.8 });
      if (act.t > 0.7) man.act = null;
      break;
    case 'moon':
      if (at(0.22)) strike(game, man, { line: 'L', damage: base * s.damage, reach: s.reach, arc: (100 * Math.PI) / 180, all: true, skill: 'moon', push: 0.9 });
      if (act.t > 0.68) man.act = null;
      break;
    case 'swing':
      for (const [k, time] of [0.18, 0.38, 0.58].entries()) {
        if (at(time)) strike(game, man, { line: k % 2 ? 'L' : 'R', damage: base * s.damage, reach: s.reach, arc: 0.95, skill: 'swing', stun: 0.28 });
      }
      if (act.t > 0.92) man.act = null;
      break;
    case 'spin': {
      const run = 0.46;
      if (act.t < run) {
        dash(s.dash / run);
        act.through = true;
        for (const t of enemiesOf(game, man)) {
          if (!act.cut?.includes(t.id) && dist(man, t) < 1.25) {
            (act.cut ??= []).push(t.id);
            resolve(game, man, t, { line: 'R', damage: base * s.damage, skill: 'spin', stun: 0.4 });
          }
        }
      } else if (!act.turned) {
        act.turned = true;
        man.face = wrap(man.face + Math.PI);
      }
      if (act.t > run + 0.3) man.act = null;
      break;
    }
    case 'mist':
      if (at(0.32)) {
        game.clouds.push({ kind: 'mist', x: man.x + fwd[0] * 2.2, z: man.z + fwd[1] * 2.2, radius: s.radius, t: s.last, side: man.side, by: man.id });
        emit(game, 'mist', { at: [man.x + fwd[0] * 2.2, man.z + fwd[1] * 2.2], radius: s.radius });
      }
      if (act.t > 0.6) man.act = null;
      break;
    case 'whirl':
      for (let k = 0; k < s.hits; k++) {
        if (at(0.25 + k * 0.3)) strike(game, man, { line: k % 2 ? 'L' : 'R', damage: base * s.damage, reach: s.reach, arc: Math.PI, all: true, skill: 'whirl', stun: 0.22 });
      }
      if (act.t > 0.25 + s.hits * 0.3 + 0.2) man.act = null;
      break;
    case 'wave':
      if (at(0.38)) {
        game.shots.push({ kind: 'wave', by: man.id, side: man.side, x: man.x + fwd[0], y: 0.9, z: man.z + fwd[1], vx: fwd[0] * s.speed, vy: 0, vz: fwd[1] * s.speed, from: [man.x, man.z], damage: base * s.damage, life: s.range / s.speed, hit: [] });
        emit(game, 'loose', { who: man.id, kind: 'wave' });
      }
      if (act.t > 0.75) man.act = null;
      break;
    case 'down':
      if (at(0.72)) strike(game, man, { line: 'O', damage: base * s.damage, reach: s.reach, arc: 0.42, skill: 'down', guardCost: 2, stun: 0.7, push: 1.2 });
      if (act.t > 1.3) man.act = null;
      break;
    case 'leap': {
      const target = nearestFoe(game, man);
      const run = 0.5;
      if (act.t < run) {
        const room = target ? Math.max(0, dist(man, target) - 1.5) : s.dash;
        dash(Math.min(s.dash, room) / run);
        act.air = Math.sin((act.t / run) * Math.PI) * 1.1;
      } else act.air = 0;
      if (at(run + 0.06)) strike(game, man, { line: 'O', damage: base * s.damage, reach: s.reach, arc: 0.6, skill: 'leap', stun: 0.5 });
      if (act.t > run + 0.55) man.act = null;
      break;
    }
    case 'shout':
      if (at(0.5)) {
        man.shout = { t: s.last, next: s.every };
        emit(game, 'shout', { who: man.id });
      }
      if (act.t > 0.9) man.act = null;
      break;
    case 'flowers':
      for (let k = 0; k < s.hits; k++) {
        if (at(0.16 + k * 0.17)) strike(game, man, { line: 'T', damage: man.r.blows.T.damage * s.damage, reach: s.reach + (man.talents.has('longArm') ? 0.4 : 0), arc: 0.26, skill: 'flowers', stun: 0.2, push: 0.2 });
      }
      if (act.t > 0.16 + s.hits * 0.17 + 0.25) man.act = null;
      break;
    case 'boar': {
      const run = 0.42;
      act.charging = act.t < run + 0.2;
      if (act.t < run) {
        dash((s.dash * 0.75) / run);
        if (!act.met) {
          const hit = enemiesOf(game, man).find((t) => inSweep(man, t, 1.1, 0.6));
          if (hit) {
            act.met = true;
            resolve(game, man, hit, { line: 'T', damage: man.r.blows.T.damage * s.damage[0], skill: 'boar', stun: 0.35, push: 0.8 });
          }
        }
      }
      if (at(run + 0.18)) {
        dash(5);
        strike(game, man, { line: 'T', damage: man.r.blows.T.damage * s.damage[1], reach: 3.3, arc: 0.24, skill: 'boar', stun: 0.6, push: 1.6 });
      }
      if (act.t > run + 0.6) man.act = null;
      break;
    }
    case 'drop': {
      const target = nearestFoe(game, man);
      const run = 0.52;
      if (act.t < run) {
        const room = target ? Math.max(0, dist(man, target) - 0.8) : 3;
        dash(Math.min(4, room) / run);
        act.air = Math.sin((act.t / run) * Math.PI) * 1.4;
      } else act.air = 0;
      if (at(run)) {
        emit(game, 'slam', { who: man.id, at: [man.x + fwd[0] * 0.8, man.z + fwd[1] * 0.8], radius: s.radius });
        strike(game, man, { line: 'O', damage: man.r.blows.O.damage * s.damage, reach: s.radius, arc: Math.PI, all: true, skill: 'drop', slam: true, pin: true, stun: 0.45 });
      }
      if (act.t > run + 0.5) man.act = null;
      break;
    }
    case 'gale':
    case 'fan':
    case 'backStep':
    case 'blast':
    case 'web':
      runBowSkill(game, man, act, s, dt, at);
      break;
  }
}

function runBowSkill(game, man, act, s, dt, at) {
  const bow = man.r.bow;
  const target = nearestFoe(game, man);
  const aimed = () => (target ? aimAt(man, target, bow.speed) : act.aim);
  if (target) man.face = bearing(man, target);
  if (act.id === 'gale') {
    for (let k = 0; k < s.shots; k++) {
      if (at(0.3 + k * s.gap)) {
        const a = aimed();
        loose(game, man, { yaw: a.yaw + (game.rng() - 0.5) * 0.03, pitch: a.pitch, power: 0.9, damage: bow.full * s.damage });
      }
    }
    if (act.t > 0.3 + s.shots * s.gap + 0.3) man.act = null;
  } else if (act.id === 'fan') {
    if (at(0.42)) {
      const a = aimed();
      for (let k = 0; k < s.shots; k++) loose(game, man, { yaw: a.yaw + (k / (s.shots - 1) - 0.5) * s.spread, pitch: a.pitch, power: 0.9, damage: bow.full * s.damage });
    }
    if (act.t > 0.8) man.act = null;
  } else if (act.id === 'backStep') {
    const run = 0.36;
    if (act.t < run) {
      man.vx = -Math.sin(man.face) * (s.dash / run);
      man.vz = -Math.cos(man.face) * (s.dash / run);
      act.moving = true;
      act.air = Math.sin((act.t / run) * Math.PI) * 0.45;
    } else act.air = 0;
    if (at(0.26)) {
      const a = aimed();
      loose(game, man, { yaw: a.yaw, pitch: a.pitch, power: 1, damage: bow.full * s.damage });
    }
    if (act.t > run + 0.22) man.act = null;
  } else if (act.id === 'blast') {
    if (at(0.55)) {
      const a = aimed();
      loose(game, man, { yaw: a.yaw, pitch: a.pitch, power: 1, damage: bow.full * s.damage, kind: 'blast', blast: s.radius });
    }
    if (act.t > 0.9) man.act = null;
  } else if (act.id === 'web') {
    if (at(0.36)) {
      const a = aimed();
      loose(game, man, { yaw: a.yaw, pitch: a.pitch, power: 1, damage: 0, kind: 'web', web: true });
    }
    if (act.t > 0.7) man.act = null;
  }
}

function runSwing(game, man, act, input, dt) {
  const holding = input.attack;
  if (act.t < act.wind) {
    // A guard raised early in the wind-up takes the blow back: a feint.
    if (input.guard && !man.prev.guard && act.t < act.wind * 0.75) {
      man.act = { kind: 'recover', t: 0, time: 0.12 };
      spend(man, 5);
      emit(game, 'feint', { who: man.id });
      return;
    }
    return;
  }
  if (!act.struck) {
    if (holding && act.held < HOLD && !act.quick) {
      act.held += dt;
      if (act.held > 0.15 && !act.heavyAnnounced) {
        act.heavyAnnounced = true;
        emit(game, 'heavy', { who: man.id, line: act.line });
      }
      return;
    }
    act.struck = true;
    act.strikeAt = act.t;
    const heavy = act.held > 0.15 ? Math.min(1, act.held / HOLD) : 0;
    spend(man, act.blow.cost * (1 + heavy * 0.6));
    act.heavy = heavy;
    strike(game, man, {
      line: act.line,
      damage: act.blow.damage,
      reach: act.reach,
      arc: act.blow.arc,
      heavy,
      all: act.line === 'L' || act.line === 'R'
    });
    return;
  }
  if (act.t - act.strikeAt >= act.recover) man.act = null;
  else if (act.t - act.strikeAt > act.recover * 0.55 && input.attack && !man.prev.attack) {
    man.chain = 1;
    man.act = null;
  }
}

function runBow(game, man, input, dt) {
  const bow = man.r.bow;
  const drawTime = bow.draw * (man.talents.has('pearls') ? 0.75 : 1);
  if (man.draw) {
    man.draw.t += dt;
    if (!input.attack) {
      const power = clamp(man.draw.t / drawTime, 0.15, 1);
      let { yaw, pitch } = input.aim ?? { yaw: man.face, pitch: 0.04 };
      // Held long at full draw the arm shakes, unless he has the steady bow.
      const over = Math.max(0, man.draw.t - drawTime - 1.1);
      const sway = (man.talents.has('steadyBow') ? 0 : Math.min(1, over / 1.5) * 0.05) + (1 - power) * 0.035;
      yaw += (game.rng() - 0.5) * 2 * sway;
      pitch += (game.rng() - 0.5) * sway;
      spend(man, bow.cost);
      loose(game, man, { yaw, pitch, power, damage: bow.least + (bow.full - bow.least) * power ** 1.2 });
      man.draw = null;
      man.act = { kind: 'recover', t: 0, time: 0.22 };
    }
  } else if (input.attack && !man.prev.attack && canAct(man) && man.st > 4) {
    man.draw = { t: 0 };
    emit(game, 'draw', { who: man.id });
  }
}

/** One tick for one man, with his input. */
function stepMan(game, man, input, dt) {
  const pressed = (key) => input[key] && !man.prev[key];
  // ---- what wears off and what keeps working --------------------------------------------------------------
  man.cool = man.cool.map((c) => Math.max(0, c - dt));
  man.slow = man.slow.filter((s) => (s.t -= dt) > 0);
  man.dr = man.dr.filter((d) => (d.t -= dt) > 0);
  man.immune = Math.max(0, man.immune - dt);
  man.burntWait = Math.max(0, man.burntWait - dt);
  man.pin = Math.max(0, man.pin - dt);
  man.afterStep = Math.max(0, man.afterStep - dt);
  man.afterSprint = Math.max(0, man.afterSprint - dt);
  if (man.poison) {
    wound(game, man, man.poison.dps * dt, game.men.find((m) => m.side !== man.side), { poison: true, quiet: true });
    if ((man.poison.t -= dt) <= 0) {
      man.poison = null;
      man.immune = SKILLS.mist.immune;
    }
  }
  if (man.shout) {
    man.shout.t -= dt;
    man.shout.next -= dt;
    if (man.shout.next <= 0) {
      man.shout.next += SKILLS.shout.every;
      const mend = Math.round((man.maxHp - man.hp) * SKILLS.shout.mend);
      man.hp = Math.min(man.maxHp, man.hp + mend);
      emit(game, 'mend', { who: man.id, amount: mend });
    }
    if (man.shout.t <= 0) man.shout = null;
  }
  if (man.bleed) {
    man.bleed.t -= dt;
    if (Math.hypot(man.x - man.bleed.x, man.z - man.bleed.z) > 0.6) {
      const by = game.men.find((m) => m.id === man.bleed.by);
      man.bleed = null;
      wound(game, man, 95, by, { bleed: true });
    } else if (man.bleed.t <= 0) man.bleed = null;
  }
  if (!man.alive) return;

  // ---- the line he has chosen, and his guard --------------------------------------------------------------
  if (input.line) man.line = input.line;
  if (input.aim) man.aim = input.aim;
  if (man.stun > 0) {
    man.stun -= dt;
    man.vx = man.knock[0] * 3;
    man.vz = man.knock[1] * 3;
    man.knock = [man.knock[0] * 0.9, man.knock[1] * 0.9];
    if (man.stun <= 0) man.stunKind = null;
  } else {
    if (man.regiment === 'archer' && pressed('swap') && canAct(man)) {
      man.knife = !man.knife;
      man.draw = null;
      emit(game, 'swap', { who: man.id, knife: man.knife });
    }
    const bowOut = man.regiment === 'archer' && !man.knife;
    const wantsGuard = input.guard && !bowOut && man.st > 0;
    if (wantsGuard && !man.guard && (!man.act || man.act.kind === 'recover')) {
      man.guard = true;
      man.guardAt = game.time;
      man.act = null;
    } else if (!wantsGuard && man.guard && man.act?.id !== 'counter') man.guard = false;
    if (man.guard) {
      if (man.guardLine !== man.line) man.guardAt = Math.max(man.guardAt, game.time - DEFLECT * 0.5);
      man.guardLine = man.line;
    }

    // ---- starting something ------------------------------------------------------------------------------
    const free = !man.act || man.act.kind === 'recover';
    if (pressed('step') && free) startStep(game, man, input);
    else if (input.skill >= 0 && man.prev.skill !== input.skill && free && !man.draw) startSkill(game, man, input.skill, input);
    else if (pressed('kick') && free && !man.draw) startKick(game, man);
    else if (bowOut) runBow(game, man, input, dt);
    else if (input.attack && (!man.prev.attack || man.chain) && free) {
      const quick = man.talents.has('turningSpear') && man.afterStep > 0.6;
      startSwing(game, man, quick ? 'T' : man.line, quick);
      if (quick) man.act.quick = true;
    }

    // ---- what is under way --------------------------------------------------------------------------------
    const act = man.act;
    if (act) {
      act.t += dt;
      act.moving = false;
      if (act.kind === 'swing') runSwing(game, man, act, input, dt);
      else if (act.kind === 'kick') {
        if (act.t - dt < KICK.wind && act.t >= KICK.wind) {
          const bash = man.talents.has('shieldBash');
          const hit = enemiesOf(game, man).filter((t) => inSweep(man, t, KICK.reach, KICK.arc)).sort((a, b) => dist(man, a) - dist(man, b))[0];
          if (hit) {
            if (hit.act?.kind === 'step' && hit.act.t < STEP.safe) emit(game, 'evade', { who: hit.id, by: man.id });
            else {
              const push = [Math.sin(man.face) * 1.3, Math.cos(man.face) * 1.3];
              if (hit.guard) {
                hit.stats.broken++;
                emit(game, 'break', { who: hit.id, by: man.id, kick: true });
                stagger(hit, bash ? 1.3 : 0.9, 'break', push);
              } else stagger(hit, 0.38, 'flinch', push);
              wound(game, hit, (bash ? 45 : KICK.damage) * takenMultiplier(hit), man, { kick: true });
            }
          } else emit(game, 'whiff', { who: man.id, kick: true });
        }
        if (act.t >= KICK.wind + KICK.recover) man.act = null;
      } else if (act.kind === 'step') {
        const speed = STEP.distance / STEP.time;
        man.vx = act.dx * speed;
        man.vz = act.dz * speed;
        act.moving = true;
        if (act.t >= STEP.time) {
          man.act = null;
          man.afterStep = 1;
        }
      } else if (act.kind === 'skill') runSkill(game, man, act, dt);
      else if (act.kind === 'recover' && act.t >= act.time) man.act = null;
    }
  }

  // ---- feet ---------------------------------------------------------------------------------------------
  const busyFeet = man.stun > 0 || man.act?.moving;
  if (!busyFeet) {
    const [mx, mz] = input.move ?? [0, 0];
    const want = Math.min(1, Math.hypot(mx, mz));
    const canSprint = input.sprint && want > 0.5 && man.st > 2 && !man.guard && !man.draw && !man.act && man.pin <= 0;
    man.sprinting = canSprint;
    if (canSprint) {
      spend(man, 13 * dt);
      man.afterSprint = 0.9;
    }
    // Backing away is slower than walking on: three tenths slower straight back, a little slower to the side.
    const along = want > 0.01 ? (mx * Math.sin(man.face) + mz * Math.cos(man.face)) / Math.hypot(mx, mz) : 1;
    const backing = along < 0 ? 1 + 0.3 * along : 1 - 0.08 * (1 - along);
    const speed = speedOf(man) * (canSprint ? 1.6 : 1) * backing;
    const tx = want > 0.01 ? (mx / Math.hypot(mx, mz)) * want * speed : 0,
      tz = want > 0.01 ? (mz / Math.hypot(mx, mz)) * want * speed : 0;
    const k = 1 - Math.exp(-dt * 12);
    man.vx += (tx - man.vx) * k;
    man.vz += (tz - man.vz) * k;
  } else man.sprinting = false;
  if (man.act?.kind === 'skill' && !man.act.moving && man.act.walk === undefined) {
    man.vx *= 0.8;
    man.vz *= 0.8;
  }
  man.x += man.vx * dt;
  man.z += man.vz * dt;
  man.moving = Math.hypot(man.vx, man.vz);

  // ---- heading --------------------------------------------------------------------------------------------
  if (input.face !== undefined && input.face !== null && man.stun <= 0) {
    const act = man.act;
    let rate = man.turn;
    if (act?.kind === 'swing') rate = act.struck ? 1.2 : act.t < act.wind ? 4 : 2;
    if (act?.kind === 'skill' && !['flowers', 'whirl', 'counter', 'gale'].includes(act.id)) rate = 1.5;
    const d = wrap(input.face - man.face);
    man.face = wrap(man.face + clamp(d, -rate * dt, rate * dt));
  }

  // ---- breath ---------------------------------------------------------------------------------------------
  man.rest -= dt;
  if (man.rest <= 0 && !man.sprinting) {
    const still = man.moving < 0.3 && !man.guard && !man.act && !man.draw;
    const regain = man.guard ? 5 : still ? 26 : 15;
    man.st = Math.min(man.maxSt, man.st + regain * dt);
  }
  if (man.st < 0) man.st = 0;
  man.prev = { attack: input.attack, guard: input.guard, kick: input.kick, step: input.step, swap: input.swap, skill: input.skill ?? -1 };
}

/** Keep men apart from each other, off the posts and inside the field. */
function settle(game) {
  const men = game.men.filter((m) => m.alive);
  for (let i = 0; i < men.length; i++) {
    for (let j = i + 1; j < men.length; j++) {
      const a = men[i],
        b = men[j];
      if (a.act?.through || b.act?.through) continue;
      const dx = b.x - a.x,
        dz = b.z - a.z,
        d = Math.hypot(dx, dz),
        need = BODY * 2;
      if (d < need && d > 1e-4) {
        const push = (need - d) / 2;
        a.x -= (dx / d) * push;
        a.z -= (dz / d) * push;
        b.x += (dx / d) * push;
        b.z += (dz / d) * push;
      }
    }
  }
  for (const m of men) {
    for (const post of game.place.posts ?? []) {
      const dx = m.x - post.x,
        dz = m.z - post.z,
        d = Math.hypot(dx, dz),
        need = post.r + BODY;
      if (d < need && d > 1e-4) {
        m.x = post.x + (dx / d) * need;
        m.z = post.z + (dz / d) * need;
      }
    }
    const r = Math.hypot(m.x, m.z),
      edge = game.place.radius - BODY;
    if (r > edge) {
      m.x *= edge / r;
      m.z *= edge / r;
    }
  }
}

function groundEffects(game, dt) {
  for (const cloud of game.clouds) {
    cloud.t -= dt;
    for (const man of game.men) {
      if (!man.alive || man.side === cloud.side) continue;
      if (Math.hypot(man.x - cloud.x, man.z - cloud.z) > cloud.radius) continue;
      if (cloud.kind === 'mist') poison(game, man, SKILLS.mist.dps, SKILLS.mist.last);
      if (cloud.kind === 'web' && !man.slow.some((s) => s.web)) man.slow.push({ k: SKILLS.web.slow, t: 0.25, web: true });
      else if (cloud.kind === 'web') man.slow.find((s) => s.web).t = 0.25;
    }
  }
  game.clouds = game.clouds.filter((c) => c.t > 0);
  // Blade waves cut through everyone in their path once.
  for (const shot of game.shots) {
    if (shot.kind !== 'wave' || shot.done) continue;
    for (const man of game.men) {
      if (!man.alive || man.side === shot.side || shot.hit.includes(man.id)) continue;
      if (Math.hypot(man.x - shot.x, man.z - shot.z) < 1.1) {
        shot.hit.push(man.id);
        const by = game.men.find((m) => m.id === shot.by);
        const face = Math.atan2(-shot.vx, -shot.vz);
        resolve(game, { ...by, face: wrap(face + Math.PI), x: shot.x - shot.vx * 0.05, z: shot.z - shot.vz * 0.05, act: null, talents: by.talents, r: by.r, stats: by.stats, afterSprint: 0 }, man, { line: 'R', damage: shot.damage, skill: 'wave', stun: 0.35 });
      }
    }
  }
}

/** Advance the fight by `dt` with one input per man (by id). Returns the events of this step. */
export function step(game, inputs, dt = TICK) {
  game.events = [];
  if (game.over) return game.events;
  game.time += dt;
  for (const man of game.men) stepMan(game, man, inputs[man.id] ?? {}, dt);
  flyShots(game, dt);
  groundEffects(game, dt);
  settle(game);
  if (!game.hero.alive) {
    game.over = 'lost';
    emit(game, 'lost', {});
  } else if (!game.men.some((m) => m.side === 'foe' && m.alive)) {
    game.over = 'won';
    const foes = game.men.filter((m) => m.side === 'foe');
    const double = foes.length > 1;
    const close = double && game.downs.length >= 2 && game.downs.at(-1).time - game.downs.at(-2).time < 6;
    emit(game, 'won', { double, close });
  }
  return game.events;
}
