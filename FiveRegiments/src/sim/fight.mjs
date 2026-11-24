// The fight: men on a round field, their blows, guards, kicks, steps, stamina, regiment skills and talents,
// arrows and the clouds and webs left on the ground. Pure rules: no page, no engine, the same in Node and in
// the browser. The picture reads `fight` every frame and its `events`.
//
// Each man is driven by an input each tick, from the keys or from a brain (brain.mjs):
//   { move: [x, z], face, sprint, attack, guard, kick, step, skill, art, line, aim, swap, arm, mount, call, heal }
// `move` is a world direction (length up to 1), `face` the heading he wants (radians, null keeps his own),
// `attack`/`guard`/`sprint` are held buttons, `kick`/`step`/`swap` are held too (a press is read on its
// first tick), `skill` is 0 or 1 while one of his two skill buttons (R, T) is down (else -1), `art` his weapon art (X),
// used when his rage is full, `line` the line of
// cut he has chosen (L R O T), `aim` an optional { yaw, pitch } for the bow, `arm` the weapon he takes up (0 his first,
// 1 his second), `mount` gets on or off his horse, `call` brings the horse to him, `heal` puts on a bandage.
//
// The Silver Wing Guard rides: on horseback the horse carries him (steered toward `move`, galloping with `sprint`),
// his blows are the saddle's, X (`art`) couches the ji when his rage is full, and his profession skills wait until he
// is on foot. A blow on a rider is shared with the horse; a horse killed under him throws him down.
//
// Lines are named from the striker's side: L is a cut that starts on his left. It arrives on the other man's
// right, so to guard it he holds his guard on R (`facing(line)`). Overhead and thrust meet themselves.
// The PC primary melee gesture sends `meleeRelease` with `meleeDown`, `meleeUp` and `meleeCancel` edges.
// Human controls set `recoveryHandoff` to carry a fresh command across the tick that completes a swing.
// Player controls can set `skillGuardCancel` to take over a settled attack or skill recovery with a fresh guard.
// An overlapping touch guard and attack can supply a separate `guardLine` for the ordinary guard.
// Mounted player controls use `reins: { throttle, turn }`. The brain still steers toward its world-space move.
//
// Headings: 0 looks along +z, and a man's right hand is at heading − π/2.

import { ARMOUR, ARTS, CRIT, DAMAGE, RAGE, REGIMENTS, SKILLS, TALENTS, loadout, rageOf } from './regiments.mjs';
import { CHARGED_RELEASE, facing, OPPONENT_WIND, opponentSkillLead } from './combat-tells.mjs';

export const TICK = 1 / 60;
export const BODY = 0.42;
export const DEFLECT = 0.2;
const GUARD_FRONT = (78 * Math.PI) / 180;
const KICK = { wind: 0.24, recover: 0.34, reach: 1.45, arc: 0.95, damage: 300, cost: 14 };
// Space: a jump the way he is moving.
const STEP = { time: 0.34, distance: 2.7, cost: 20 };
// A bandage: two to a fight, a second and a half to put on, a fifth of his health back.
const DRESSING = { count: 2, time: 1.4, mend: 0.2 };
// Knocked off his horse: how long he is down.
const THROWN = 1.6;
// Alone against two (the finale), a man fights above himself: this demo's setting.
export const LONE = { dealt: 1.5, taken: 0.5 };
const HOLD = 0.85;
const RELEASE_PREP_FRACTION = 0.72;
const SPIN_GUARD_AT = 0.43;
const SKILL_GUARD_DELAY = 0.12;
const GRAVITY = 9.8;

export { facing };

/** Whether a Spin is far enough through its follow-through for a fresh player guard. */
export function spinGuardWindow(man) {
  return Boolean(man?.alive && man.stun <= 0 && man.daze <= 0 && man.st > 0 &&
    man.act?.kind === 'skill' && man.act.id === 'spin' && man.act.t >= SPIN_GUARD_AT);
}

/** Whether a fresh player guard can take over this action's follow-through. */
export function recoveryGuardWindow(man) {
  const act = man?.act;
  if (!act || !man.alive || man.stun > 0 || man.daze > 0 || man.st <= 0 || act.air > 0 ||
    (man.regiment === 'archer' && !man.knife)) return false;
  if (act.kind === 'swing') return act.struck && act.t - act.strikeAt >= Math.max(0.09, act.recover * 0.35);
  if (act.kind === 'lance') {
    const last = act.met ? act.metAt : ARTS.couch.wind + ARTS.couch.last;
    return man.mounted && act.t >= last + SKILL_GUARD_DELAY;
  }
  if (act.kind !== 'skill') return false;
  if (act.id === 'spin') return spinGuardWindow(man);
  if (act.id === 'counter') return act.t >= (act.answeredAt ?? SKILLS.counter.hold) + SKILL_GUARD_DELAY;
  return act.recoveryAt !== undefined && act.t >= act.recoveryAt;
}

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
  const health = Math.round(r.health * (spec.health ?? 1));
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
    queuedSwing: null,
    guard: false,
    guardLine: 'R',
    guardAt: -9,
    act: null,
    stun: 0,
    stunKind: null,
    knock: [0, 0],
    cool: [0, 0],
    // Lasting effects: slowed, poisoned, immune to poison, damage taken less, the shout, pinned, dazed (no attack and
    // no guard).
    slow: [],
    poison: null,
    immune: 0,
    dr: [],
    shout: null,
    pin: 0,
    daze: 0,
    knife: false,
    draw: null,
    body: BODY,
    dressings: DRESSING.count,
    horse: null,
    mounted: false,
    mountOnRecovery: false,
    // Each weapon art's wait, by id; his rage, and how much his bar holds (as much as his dearest art).
    artCool: {},
    rage: 0,
    rageMax: rageOf(r),
    alive: true,
    moving: 0,
    sprinting: false,
    prev: {},
    stats: { blows: 0, hits: 0, deflects: 0, guards: 0, broken: 0, taken: 0, damage: 0 }
  };
  if (r.horse) {
    const hp = Math.round(r.horse.health * (spec.health ?? 1));
    man.horse = { hp, maxHp: hp, x: man.x, z: man.z, face: man.face, speed: 0, st: 100, alive: true, called: false, galloping: false, contacts: new Set() };
    if (spec.mounted !== false) setMounted(man, true);
  }
  return man;
}

/** Rage toward his weapon arts (X, Z): it fills as blows land, are taken, guarded and deflected. */
function rouse(man, amount) {
  if (!man?.alive) return;
  man.rage = clamp(man.rage + amount, 0, man.rageMax);
}

/** On or off his horse: his size on the field follows. */
function setMounted(man, on) {
  man.mounted = on;
  man.body = on ? man.r.horse.body : BODY;
  man.horse.contacts.clear();
}

/** The blows he has now: the saddle's on horseback. */
const blowsOf = (man) => (man.mounted ? man.r.mounted : man.r.blows);

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
  heroMan.lone = foes.length > 1;
  return game;
}

const emit = (game, type, data) => game.events.push({ type, time: game.time, ...data });
export const enemiesOf = (game, man) => game.men.filter((m) => m.alive && m.side !== man.side);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const bearing = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

/** How fast he may walk now, after slows, pins, guards and what his hands are doing. */
function speedOf(man) {
  let speed = man.r.speed;
  for (const s of man.slow) speed *= 1 - s.k;
  const act = man.act;
  if (man.guard) speed *= man.r.offhand === 'shield' ? 0.8 : 0.5;
  if (act?.kind === 'swing') speed *= act.t < act.wind ? 0.62 : 0.4;
  // Keep some room for the archer to reposition at full draw while keeping a clear pursuit advantage.
  if (man.draw) speed *= 0.6;
  if (act?.kind === 'skill') speed *= act.walk ?? 0.35;
  if (act?.kind === 'kick') speed *= 0.3;
  if (act?.kind === 'mend') speed *= 0.4;
  if (man.pin > 0) speed = Math.min(speed, SKILLS.drop.cap);
  return speed;
}

function damageMultiplier(game, man, target) {
  // Alone against two, a man fights above himself (this demo's setting for the finale).
  let k = man.lone ? LONE.dealt : 1;
  if (man.mounted && man.talents.has('centaur')) k *= 1 + TALENTS.centaur.more;
  if (target?.r.armour === 'heavy') {
    if (man.talents.has('heavyBane')) k *= 1 + TALENTS.heavyBane.more;
    if (man.talents.has('armourBane')) k *= 1 + TALENTS.armourBane.more;
  }
  return k;
}

function takenMultiplier(man) {
  let k = man.lone ? LONE.taken : 1;
  for (const d of man.dr) k *= 1 - d.k;
  if (man.mounted && man.talents.has('cavalry')) k *= 1 - TALENTS.cavalry.less;
  if (man.talents.has('vigour') && man.hp > man.maxHp * TALENTS.vigour.above) k *= 1 - TALENTS.vigour.less;
  return k;
}

/**
 * The damage formula (DAMAGE in regiments.mjs): what a blow of `raw` damage (weapon scale) of `kind` (cut, thrust,
 * blunt) on `part` (head, body) takes from him, after the power of levels, his armour (light armour may deflect it to
 * half), the talents and settings that lessen what he takes, and the curve that keeps one blow under CAP of his
 * health. Returns { amount, deflected }.
 */
function toll(game, man, raw, kind = 'cut', part = 'body') {
  let dealt = raw * DAMAGE.power;
  const a = ARMOUR[man.r.armour];
  let deflected = false;
  if (a) {
    const value = a[part][kind] ?? a[part].cut;
    dealt *= DAMAGE.armourK / (DAMAGE.armourK + value);
    deflected = !!a.deflect && game.rng() < a.deflect.chance;
    if (deflected) dealt *= 1 - a.deflect.less;
  }
  dealt *= takenMultiplier(man);
  const x = dealt / man.maxHp;
  return { amount: (man.maxHp * x) / (1 + x / DAMAGE.cap), deflected };
}
/** The kind of a blow on a line and the part it lands on: a thrust pierces, the rest cut; overhead finds the head. */
const kindOf = (line) => (line === 'T' ? 'thrust' : 'cut');
const partOf = (line) => (line === 'O' ? 'head' : 'body');

/** Whether this blow is a critical one, and what it multiplies. */
function critical(game, man, target) {
  let chance = CRIT.chance;
  if (target.talents.has('lingering') && target.hp < target.maxHp * TALENTS.lingering.below) chance -= TALENTS.lingering.resist;
  if (game.rng() >= chance) return 1;
  let power = CRIT.power;
  if (man.talents.has('solo')) power += TALENTS.solo.crit;
  if (man.talents.has('equipped') && !man.mounted) power += TALENTS.equipped.crit;
  return power;
}

function spend(man, amount) {
  man.st -= amount;
  man.rest = 0.6;
}

/** Health down. */
function wound(game, man, amount, by, info = {}) {
  if (!man.alive || amount <= 0) return 0;
  amount = Math.round(amount);
  man.hp -= amount;
  if (!info.quiet) man.stats.taken++;
  if (by) by.stats.damage += amount;
  emit(game, 'hit', { who: man.id, by: by?.id, damage: amount, ...info });
  if (man.hp <= 0) {
    man.hp = 0;
    man.alive = false;
    man.act = null;
    man.guard = false;
    man.draw = null;
    // A rider falls from the saddle; his horse stands.
    if (man.mounted) {
      setMounted(man, false);
      man.horse.speed = 0;
    }
    game.downs.push({ id: man.id, time: game.time });
    emit(game, 'down', { who: man.id, by: by?.id });
  }
  return amount;
}

function stagger(man, time, kind = 'flinch', push = [0, 0]) {
  if (!man.alive) return;
  man.stun = Math.max(man.stun, time);
  man.stunKind = kind;
  man.knock = [push[0], push[1]];
  man.act = null;
  man.queuedSwing = null;
  man.draw = null;
  man.guard = false;
}

/** Off his horse and onto the ground beside it, down for a moment; the horse stops where it is. */
function unhorse(game, man, by) {
  if (!man.mounted || !man.alive) return;
  const h = man.horse;
  setMounted(man, false);
  man.x += Math.cos(h.face) * 1.1;
  man.z -= Math.sin(h.face) * 1.1;
  h.speed = 0;
  man.act = null;
  man.guard = false;
  stagger(man, THROWN, 'thrown');
  emit(game, 'thrown', { who: man.id, by: by?.id });
}

/** The horse under `man` takes `amount`; killed, it throws him. */
function woundHorse(game, man, amount, by) {
  const h = man.horse;
  if (!h?.alive || amount <= 0) return;
  amount = Math.round(amount);
  h.hp -= amount;
  if (by) by.stats.damage += amount;
  emit(game, 'horseHit', { who: man.id, by: by?.id, damage: amount });
  if (h.hp > 0) return;
  h.hp = 0;
  h.alive = false;
  h.speed = 0;
  emit(game, 'horseDown', { who: man.id, by: by?.id });
  unhorse(game, man, by);
}

/** A wound to whoever stands there: on horseback, the horse takes its share. */
function hurt(game, man, amount, by, info = {}) {
  if (!man.mounted) return wound(game, man, amount, by, info);
  const share = man.r.horse.share;
  woundHorse(game, man, amount * share, by);
  return wound(game, man, amount * (1 - share), by, { ...info, rider: true });
}

/** Whether `target` stands within `reach` of `man` and inside the swept half-angle `arc` of his heading. */
export function inSweep(man, target, reach, arc, face = man.face) {
  const d = dist(man, target),
    body = target.body ?? BODY;
  if (d - body > reach) return false;
  if (d < 0.01) return true;
  const off = Math.abs(wrap(bearing(man, target) - face));
  return off <= arc + Math.atan2(body, d);
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
  // Presentation uses the actual sweep coordinates, before any push or extra tick.
  const contact = man.mounted && !spec.skill && man.act?.kind === 'swing' && line === 'R'
    ? { mountedImpact: { from: [man.x, man.z], at: [target.x, target.z], mounted: target.mounted, air: target.act?.air ?? 0 } }
    : {};
  let damage = spec.damage * damageMultiplier(game, man, target) * (1 + 0.6 * (spec.heavy ?? 0));
  // From the saddle a blow is worth more the faster the horse goes.
  if (man.mounted && man.horse) damage *= 1 + man.r.saddle.momentum * clamp(Math.abs(man.horse.speed) / man.r.horse.gallop, 0, 1);
  const critPower = spec.crit === false ? 1 : critical(game, man, target);
  const crit = critPower > 1;
  damage *= critPower;
  const toward = bearing(target, man);
  const front = Math.abs(wrap(toward - target.face)) <= GUARD_FRONT;
  const counter = target.act?.kind === 'skill' && target.act.id === 'counter' && target.act.t < SKILLS.counter.hold;
  if (counter && front && !spec.unguardable) {
    // The counter takes the blow on the guard and cuts back at once.
    target.act.answered = true;
    target.act.t = SKILLS.counter.hold;
    target.act.answeredAt = target.act.t;
    emit(game, 'deflect', { who: target.id, by: man.id, line, skill: spec.skill, counter: true, ...contact });
    target.stats.deflects++;
    rouse(target, RAGE.deflected);
    const back = target.r.blows.R.damage * SKILLS.counter.damage * critical(game, target, man);
    hurt(game, man, toll(game, man, back).amount, target, { line: 'R', skill: 'counter' });
    if (man.alive && !man.mounted) stagger(man, 0.45, 'flinch');
    return;
  }
  const guarding = target.guard && front && !spec.unguardable && target.st > 0;
  const exact = guarding && target.guardLine === facing(line);
  // A shield covers the lines it can whichever way the guard is set, but only the right line can be deflected.
  const covered = exact || (guarding && (target.r.shield?.lines.includes(facing(line)) ?? false));
  if (covered) {
    // A full two-handed blow is too heavy to turn aside; it can only be stopped.
    const tooHeavy = man.r.heft && (spec.heavy ?? 0) > 0.5;
    if (exact && game.time - target.guardAt <= DEFLECT && !spec.slam && !tooHeavy) {
      // Caught in the first instant of the guard: the blow is turned aside and the striker reels.
      target.stats.deflects++;
      rouse(target, RAGE.deflected);
      emit(game, 'deflect', { who: target.id, by: man.id, line, skill: spec.skill, ...contact });
      stagger(man, spec.heavy ? 0.85 : 0.65, 'reel');
      return;
    }
    // A shield taken on the wrong line still lets some of the blow through to the arm behind it.
    if (!exact) hurt(game, target, toll(game, target, damage * 0.25, spec.kind ?? kindOf(line), partOf(line)).amount, man, { line, graze: true, skill: spec.skill, ...contact });
    if (!target.alive) return;
    // A guard spends stamina by the blow's weight, though no single blow takes more than two fifths of a full breath.
    const cost = Math.min(target.maxSt * 0.4, (damage / 1000) * target.r.guardCost * (exact ? 1 : 1.2) * (spec.guardCost ?? man.r.heft ?? 1));
    spend(target, cost);
    target.stats.guards++;
    rouse(target, RAGE.guarded);
    emit(game, 'block', { who: target.id, by: man.id, line, skill: spec.skill, heavy: spec.heavy ?? 0, ...contact });
    // Heightened Deterrence: a guarded blow costs the striker stamina (the official 8, in this game's stamina).
    if (target.talents.has('deterrence')) spend(man, TALENTS.deterrence.drain * 0.25);
    if (target.st <= 0) {
      target.st = 0;
      target.stats.broken++;
      rouse(man, RAGE.broke);
      emit(game, 'break', { who: target.id, by: man.id });
      stagger(target, 1.0, 'break');
      hurt(game, target, toll(game, target, damage * 0.35, spec.kind ?? kindOf(line), partOf(line)).amount, man, { line, broke: true, skill: spec.skill, ...contact });
    } else {
      stagger(man, spec.heavy ? 0.12 : 0.22, 'recoil');
      if (spec.push) target.knock = [Math.sin(man.face) * spec.push * 0.4, Math.cos(man.face) * spec.push * 0.4];
    }
    return;
  }
  if (guarding) {
    // The wrong line: half of it gets through, and the guard takes a jolt.
    spend(target, (damage / 1000) * 16);
    damage *= 0.5;
    emit(game, 'graze', { who: target.id, by: man.id, line });
    rouse(man, RAGE.graze - RAGE.landed);
  }
  const rode = target.mounted;
  const worn = toll(game, target, damage, spec.kind ?? kindOf(line), partOf(line));
  const dealt = hurt(game, target, worn.amount, man, { line, crit, heavy: spec.heavy ?? 0, skill: spec.skill, glance: worn.deflected, ...contact });
  man.stats.hits++;
  rouse(man, RAGE.landed);
  rouse(target, RAGE.taken);
  if (!target.alive) {
    // An art that kills is ready again at once, and gives some rage back.
    const art = ARTS[spec.skill];
    if (art?.refund !== undefined) {
      man.artCool[spec.skill] = 0;
      rouse(man, art.refund);
      emit(game, 'refund', { who: man.id, id: spec.skill });
    }
    return;
  }
  const push = spec.push ?? (spec.heavy ? 0.9 : 0.35);
  // A horse does not flinch at an ordinary blow; a heavy one, or a skill that knocks down, makes it rear.
  if (rode && target.mounted) {
    if ((spec.heavy ?? 0) > 0.5 || (spec.stun ?? 0) > 0.6) stagger(target, 0.5, 'rear');
  } else if (!(rode && target.stun > 0)) stagger(target, spec.stun ?? (spec.heavy ? 0.55 : 0.32), spec.stun > 0.8 ? 'down' : 'flinch', [Math.sin(man.face) * push, Math.cos(man.face) * push]);
  if (spec.pin && target.moving > 1.5) {
    target.pin = SKILLS.drop.pin;
    emit(game, 'pin', { who: target.id });
  }
  return dealt;
}

/** Poison: `total` damage spread over `time`; `by` is whose poison it is, and it may pass to the man's friends. */
function poison(game, man, total, time, by, catching = false) {
  if (man.immune > 0 || !man.alive || man.poison) return;
  emit(game, 'poison', { who: man.id });
  man.poison = { dps: total / time, t: time, by, catching };
}

// ---- arrows and things thrown ----------------------------------------------------------------------------

function loose(game, man, { yaw, pitch = 0.04, power = 1, damage, kind = 'arrow', blast = 0, web = false, speed, through = 0, skill, fall = null, group = null, announce = true }) {
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
    // An arrow that goes on through men, taking those within `through` of its flight.
    through,
    // Arrows of one volley share whom they have hit: a man takes a volley once.
    hit: group ?? [],
    skill,
    // Damage that falls off with distance: { near, far, at: [most, least] } as shares of `damage`.
    fall,
    life: 2.4
  });
  if (announce) emit(game, 'loose', { who: man.id, kind, skill, yaw, power });
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
      if (!man.alive || man.side === shot.side || shot.hit.includes(man.id)) continue;
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
      if (near < man.body + shot.through && shot.y > 0 && shot.y < (man.mounted ? 2.75 : 1.95)) {
        arrowHit(game, shot, man);
        if (!shot.through) break;
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
      if (d < shot.blast + man.body) {
        hurt(game, man, toll(game, man, shot.damage * (1 - 0.4 * (d / shot.blast)), 'blunt').amount, by, { skill: 'blast' });
        if (man.alive) stagger(man, 0.5, man.mounted ? 'rear' : 'flinch', man.mounted ? [0, 0] : [(man.x - shot.x) * 0.5, (man.z - shot.z) * 0.5]);
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
  shot.hit.push(man.id);
  if (!shot.through) {
    shot.done = true;
    shot.keep = 0;
    shot.stuck = man.id;
  }
  const by = game.men.find((m) => m.id === shot.by);
  if (shot.blast || shot.web) {
    // A blast or web arrow on a man strikes him and bursts where he stands.
    shot.x = man.x;
    shot.z = man.z;
    shot.y = 1;
    emit(game, 'land', { kind: shot.kind, at: [shot.x, shot.y, shot.z], on: man.id });
    if (shot.web && shot.damage > 0) hurt(game, man, toll(game, man, shot.damage, 'thrust').amount, by, { skill: 'web', arrow: true });
    burst(game, shot);
    return;
  }
  const toward = Math.atan2(shot.from[0] - man.x, shot.from[1] - man.z);
  const off = Math.abs(wrap(toward - man.face));
  let damage = shot.damage;
  if (shot.fall) {
    const far = Math.hypot(shot.from[0] - man.x, shot.from[1] - man.z);
    const k = clamp((far - shot.fall.near) / (shot.fall.far - shot.fall.near), 0, 1);
    damage *= shot.fall.at[0] + (shot.fall.at[1] - shot.fall.at[0]) * k;
  }
  if (by) damage *= critical(game, by, man);
  const part = shot.y > 1.6 ? 'head' : 'body';
  if (man.guard && man.st > 0) {
    const shield = man.r.shield;
    const arc = shield ? shield.arrowArc : (40 * Math.PI) / 180;
    if (off <= arc) {
      const kept = shield ? 1 : 0.5;
      spend(man, 6);
      emit(game, 'block', { who: man.id, by: shot.by, arrow: true });
      man.stats.guards++;
      const rest = damage * (1 - kept);
      if (rest > 1) hurt(game, man, toll(game, man, rest, 'thrust', part).amount, by, { arrow: true });
      return;
    }
  }
  const worn = toll(game, man, damage, 'thrust', part);
  hurt(game, man, worn.amount, by, { arrow: true, skill: shot.skill, glance: worn.deflected });
  if (by) by.stats.hits++;
  rouse(by, RAGE.arrow);
  rouse(man, RAGE.taken);
  if (man.alive && damage > (by?.r.bow?.full ?? 900) * 0.8 && !man.act && !man.mounted) stagger(man, 0.16, 'flinch', [shot.vx * 0.004, shot.vz * 0.004]);
}

// ---- what a man does ---------------------------------------------------------------------------------------

const canAct = (man) => man.alive && man.stun <= 0 && !man.act;

function announceSwing(game, man, act) {
  man.stats.blows++;
  emit(game, 'swing', { who: man.id, line: act.line });
}

function startSwing(game, man, line, { releaseOnly, released, readableAttack }) {
  const blow = blowsOf(man)[line];
  if (!blow) return;
  if (man.st < 4) return;
  const reach = blow.reach;
  const wind = readableAttack ? Math.max(OPPONENT_WIND, blow.wind) : blow.wind;
  const act = { kind: 'swing', line, t: 0, wind, held: 0, struck: false, blow, reach, recover: blow.recover, readableAttack };
  if (releaseOnly) {
    act.releaseOnly = true;
    act.awaitingRelease = !released;
    act.prepCap = act.wind * RELEASE_PREP_FRACTION;
    act.prepareTime = 0;
    if (released) act.releaseAt = 0;
  }
  man.act = act;
  man.guard = false;
  if (!act.awaitingRelease) announceSwing(game, man, act);
}

function startKick(game, man) {
  if (man.st < 6 || man.mounted) return;
  man.act = { kind: 'kick', t: 0 };
  man.guard = false;
  spend(man, KICK.cost);
  emit(game, 'kick', { who: man.id });
}

function startStep(game, man, input) {
  if (man.st < 8 || man.mounted) return;
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
  // His regiment skills need his feet on the ground.
  if (man.mounted) {
    emit(game, 'onFoot', { who: man.id });
    return;
  }
  const id = man.skills[slot];
  const s = SKILLS[id];
  if (!s || man.cool[slot] > 0 || man.st < s.cost * 0.5) return;
  if (['gale', 'fan', 'blast', 'web', 'backStep'].includes(id) && man.knife) man.knife = false;
  // How fresh he is when it begins (the Full Moon Slash reads it).
  const fresh = man.st / man.maxSt;
  man.cool[slot] = s.cool;
  spend(man, s.cost);
  man.guard = false;
  man.draw = null;
  const target = nearestFoe(game, man);
  man.act = { kind: 'skill', id, t: 0, slot, hits: 0, fresh, aim: input.aim ?? (target ? { yaw: bearing(man, target), pitch: 0.03 } : { yaw: man.face, pitch: 0.03 }) };
  if (target && ['leap', 'drop', 'boar', 'bull', 'charge', 'stepCut'].includes(id)) man.face = bearing(man, target);
  if (id === 'returnSpear') {
    const [mx, mz] = input.move ?? [0, 0];
    const rightward = -Math.cos(man.face) * mx + Math.sin(man.face) * mz;
    Object.assign(man.act, { launchFace: man.face, stepSide: rightward < -0.15 ? -1 : 1, turnTarget: target ? [target.x, target.z] : null });
  }
  if (id === 'flowers') man.act.walk = 1 - s.slow;
  if (id === 'whirl') man.act.walk = 0.5;
  if (id === 'shout' || id === 'mist' || id === 'counter') man.act.walk = 0.25;
  emit(game, 'skill', { who: man.id, id });
}

/**
 * X (`main`) or Z (`off`): a weapon art. X is the art of the weapon in his main hand, or from the saddle the mounted
 * art; Z the shield's. Each wants its rage and spends it, then waits its cooldown.
 */
function startArt(game, man, which = 'main') {
  const id = which === 'off' ? man.r.offArt : man.mounted ? man.r.mountedArt : man.r.art;
  const a = ARTS[id];
  if (!a) {
    emit(game, man.mounted && which === 'main' && ARTS[man.r.art] ? 'onFoot' : 'noArt', { who: man.id });
    return;
  }
  if ((man.artCool[id] ?? 0) > 0) return;
  // The couched lance wants the horse at a run.
  if (a.mounted && (man.horse?.speed ?? 0) < a.run) {
    emit(game, 'needRun', { who: man.id });
    return;
  }
  if (man.rage < a.rage) {
    emit(game, 'noRage', { who: man.id });
    return;
  }
  man.rage -= a.rage;
  man.artCool[id] = a.cool;
  man.guard = false;
  man.draw = null;
  if (a.mounted) {
    man.act = { kind: 'lance', t: 0, id };
    emit(game, 'lance', { who: man.id });
    return;
  }
  if (id === 'volley') man.knife = false;
  const target = nearestFoe(game, man);
  if (target && id !== 'volley') man.face = bearing(man, target);
  man.act = { kind: 'skill', id, t: 0, slot: which, art: true, aim: target ? { yaw: bearing(man, target), pitch: 0.03 } : { yaw: man.face, pitch: 0.03 } };
  emit(game, 'skill', { who: man.id, id, art: true });
}

/** The heading the couched ji points along: off the horse's head toward its right. */
export const couchHeading = (man) => wrap((man.horse?.face ?? man.face) + ARTS.couch.aim);

/** The couched ji: held off the horse's right; the first man it meets takes it. */
function runLance(game, man, act) {
  const L = ARTS.couch,
    h = man.horse;
  const activeEnd = L.wind + L.last;
  const advancing = h.speed > 0 && act.t >= L.wind && act.t < activeEnd;
  man.face = h.face;
  if (advancing && !act.met) {
    const hit = enemiesOf(game, man)
      .filter((t) => inSweep(man, t, L.reach, L.arc, couchHeading(man)))
      .sort((a, b) => dist(man, a) - dist(man, b))[0];
    if (hit) {
      act.met = true;
      resolve(game, man, hit, { line: 'T', damage: man.r.mounted.T.damage * L.damage, slam: true, guardCost: 2.5, stun: L.stun, push: 2.2, skill: 'couch', face: couchHeading(man) });
      act.t = Math.max(act.t, activeEnd - L.hitRecover);
      act.metAt = act.t;
    }
  }
  act.charging = advancing && !act.met;
  const end = act.met ? act.metAt + L.hitRecover : activeEnd + L.recover;
  if (act.t >= end || !man.mounted) man.act = null;
}

/** Riding: the horse turns toward where he steers (wide at speed), gathers pace, gallops on its wind and reins back. */
function ride(game, man, input, dt) {
  const h = man.horse,
    R = man.r.horse;
  const [mx, mz] = input.move ?? [0, 0];
  const want = Math.min(1, Math.hypot(mx, mz));
  const busy = man.stun > 0 || man.act?.kind === 'dismount';
  const turnRate = R.turn.slow + (R.turn.fast - R.turn.slow) * clamp(Math.abs(h.speed) / R.gallop, 0, 1);
  let target = 0;
  if (!busy && input.reins) {
    const throttle = clamp(input.reins.throttle ?? 0, -1, 1);
    const turn = clamp(input.reins.turn ?? 0, -1, 1);
    h.face = wrap(h.face + turn * turnRate * dt);
    // Opposing input works as a brake until the horse is at rest.
    if (throttle < -0.1 && h.speed <= 0) target = R.reverse * throttle;
    else if (throttle > 0.1 && h.speed >= 0) {
      target = input.sprint && h.st > 4 ? R.gallop : Math.max(R.walk, R.canter * throttle);
    }
  } else if (!busy && want > 0.1) {
    const off = wrap(Math.atan2(mx, mz) - h.face);
    if (Math.abs(off) > 2.6 && h.speed < 1.2) target = -R.reverse * want;
    else {
      const gallop = input.sprint && h.st > 4 && Math.abs(off) < 1.3;
      target = gallop ? R.gallop : Math.max(R.walk, R.canter * want);
      h.face = wrap(h.face + clamp(off, -turnRate * dt, turnRate * dt));
    }
  }
  for (const s of man.slow) target *= 1 - s.k;
  if (man.pin > 0) target = clamp(target, -SKILLS.drop.cap, SKILLS.drop.cap);
  const rate = Math.abs(target) > Math.abs(h.speed) ? R.accel : R.brake;
  h.speed += clamp(target - h.speed, -rate * dt, rate * dt);
  h.galloping = h.speed > R.canter + 0.3;
  h.st = h.galloping ? Math.max(0, h.st - R.gallopCost * dt) : Math.min(100, h.st + 9 * dt);
  man.vx = Math.sin(h.face) * h.speed;
  man.vz = Math.cos(h.face) * h.speed;
  man.sprinting = h.galloping;
}

/** First contact between two bodies along their relative trajectory before separation runs. */
function sweptContact(dx, dz, vx, vz, radius) {
  const c = dx * dx + dz * dz - radius * radius;
  if (c <= 1e-8) return 0;
  const a = vx * vx + vz * vz, b = dx * vx + dz * vz;
  if (a < 1e-8 || b >= 0) return null;
  const discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const start = (-b - Math.sqrt(discriminant)) / a;
  return start <= 1 ? start : null;
}

/** A clean running pass can bowl over one enemy on foot without dealing damage. */
function mountedContacts(game, origins, dt) {
  for (const [i, man] of game.men.entries()) {
    const start = origins[i], h = man.horse;
    if (!start.mounted || !man.mounted || !man.alive) continue;
    const ram = man.r.horse.ram;
    const mx = man.x - start.x, mz = man.z - start.z;
    const moving = Math.hypot(mx, mz) > 1e-4;
    const ready = moving && h.speed >= ram.speed && !start.busy && !man.act && man.stun <= 0;
    const fx = Math.sin(h.face), fz = Math.cos(h.face);
    let first = null;
    for (const [j, target] of game.men.entries()) {
      if (target.side === man.side) continue;
      const from = origins[j], need = man.body + target.body;
      const dx = from.x - start.x, dz = from.z - start.z;
      if (h.contacts.has(target.id)) {
        if (target.alive && Math.hypot(dx, dz) <= need + ram.reset) continue;
        h.contacts.delete(target.id);
      }
      if (!target.alive || target.mounted || from.mounted || target.act?.through || from.through) continue;
      const vx = target.x - from.x - mx, vz = target.z - from.z - mz;
      if (Math.abs(dx) > need + Math.abs(vx) || Math.abs(dz) > need + Math.abs(vz)) continue;
      const at = sweptContact(dx, dz, vx, vz, need);
      if (at === null) continue;
      h.contacts.add(target.id);
      if (!ready || target.stun > 0 || (target.act?.air ?? 0) > 0.15 || (first && first.at <= at)) continue;
      const nx = dx + vx * at, nz = dz + vz * at, length = Math.hypot(nx, nz);
      if (length < 1e-4 || fx * nx + fz * nz < ram.front * length) continue;
      if (-(vx * nx + vz * nz) < ram.closing * length * dt) continue;
      first = { target, at, nx: nx / length, nz: nz / length };
    }
    if (!first) continue;
    const { target, at, nx, nz } = first;
    stagger(target, ram.stun, 'down', [nx * ram.push, nz * ram.push]);
    emit(game, 'horseRam', { who: target.id, by: man.id, speed: h.speed,
      at: [start.x + mx * at + nx * man.body, start.z + mz * at + nz * man.body] });
  }
}

/** A horse without its rider stands, or comes when he calls. */
function stepHorse(game, man, dt) {
  const h = man.horse;
  if (!h?.alive || man.mounted) return;
  let target = 0;
  if (h.called && man.alive && man.act?.kind !== 'mount') {
    const d = Math.hypot(man.x - h.x, man.z - h.z);
    if (d < 1.8) h.called = false;
    else {
      const off = wrap(Math.atan2(man.x - h.x, man.z - h.z) - h.face);
      h.face = wrap(h.face + clamp(off, -3 * dt, 3 * dt));
      target = Math.min(man.r.horse.call, d * 1.5);
    }
  }
  h.speed += clamp(target - h.speed, -man.r.horse.brake * dt, man.r.horse.accel * dt);
  h.galloping = false;
  h.st = Math.min(100, h.st + 9 * dt);
  h.x += Math.sin(h.face) * h.speed * dt;
  h.z += Math.cos(h.face) * h.speed * dt;
  const r = Math.hypot(h.x, h.z),
    edge = game.place.radius - 0.9;
  if (r > edge) {
    h.x *= edge / r;
    h.z *= edge / r;
  }
}

/** Advance a regiment skill: where it carries him and when it strikes. */
function runSkill(game, man, act, dt) {
  const s = SKILLS[act.id];
  const base = man.r.blows.R.damage;
  const fwd = [Math.sin(man.face), Math.cos(man.face)];
  const at = (time) => act.t - dt < time && act.t >= time;
  // Presentation reads the same ticks as the strike, including when the blade finds no target.
  const beat = (part = 0) => emit(game, 'skillBeat', { who: man.id, id: act.id, part });
  const settle = () => { act.recoveryAt = act.t + SKILL_GUARD_DELAY; };
  const dash = (speed) => {
    man.vx = fwd[0] * speed;
    man.vz = fwd[1] * speed;
    act.moving = true;
  };
  // Everyone within `radius` of a point `ahead` of him.
  const around = (ahead, radius) => {
    const cx = man.x + fwd[0] * ahead,
      cz = man.z + fwd[1] * ahead;
    return enemiesOf(game, man).filter((t) => Math.hypot(t.x - cx, t.z - cz) <= radius + t.body);
  };
  const areaStrike = (ahead, radius, spec) => {
    const hit = around(ahead, radius);
    emit(game, 'slam', { who: man.id, at: [man.x + fwd[0] * ahead, man.z + fwd[1] * ahead], radius, skill: spec.skill });
    if (!hit.length) emit(game, 'whiff', { who: man.id, skill: spec.skill });
    for (const t of hit) resolve(game, man, t, spec);
    settle();
  };
  switch (act.id) {
    // ---- Imperial Guard ----
    case 'charge': {
      // A run at him that stops short, into a thrust.
      const target = nearestFoe(game, man);
      const run = 0.42;
      if (act.t < run && !act.met) {
        const room = target ? Math.max(0, dist(man, target) - 1.5) : s.range;
        dash(Math.min(s.range, room) / Math.max(0.05, run - act.t) * 0.5 + Math.min(s.range, room) * 0.6);
        act.charging = true;
        if (target && dist(man, target) < 1.7) act.met = true;
      }
      if (at(run + 0.06)) {
        beat();
        strike(game, man, { line: 'T', damage: base * s.damage, reach: 2.2, arc: 0.3, skill: 'charge', stun: 0.45, push: 0.8 });
        settle();
      }
      if (act.t > run + 0.5) man.act = null;
      break;
    }
    case 'counter':
      man.guard = true;
      man.guardLine = man.line;
      if (act.t >= s.hold + 0.25) man.act = null;
      break;
    case 'bull': {
      // A barging run; the first man met can neither attack nor defend for a while, and a rider comes off his horse.
      const elapsed = act.t - s.wind;
      act.charging = elapsed >= 0 && elapsed < s.run;
      if (act.charging && !act.met) {
        dash(s.range / s.run);
        const hit = enemiesOf(game, man).find((t) => inSweep(man, t, 1.05, 0.7));
        if (hit) {
          act.met = true;
          act.metAt = act.t;
          const guarded = hit.guard;
          const rider = hit.mounted;
          resolve(game, man, hit, { line: 'T', damage: base * s.damage, push: 1.2, stun: 0.3, skill: 'bull' });
          if (hit.alive) {
            if (rider) unhorse(game, hit, man);
            hit.daze = Math.max(hit.daze, guarded ? s.dazeGuarded : s.daze);
            hit.guard = false;
            emit(game, 'daze', { who: hit.id, time: hit.daze });
          }
        }
      }
      if (at(s.wind + s.run)) settle();
      if (elapsed > s.run + s.recover) man.act = null;
      break;
    }
    case 'turning':
      if (at(0.28)) {
        beat();
        strike(game, man, { line: 'R', damage: base * s.damage, reach: s.reach, arc: Math.PI, all: true, skill: 'turning', push: 0.8 });
        settle();
      }
      if (act.t > 0.7) man.act = null;
      break;
    case 'moon':
      // Worth more the more stamina he had when he began it.
      if (at(0.18)) {
        beat();
        strike(game, man, { line: 'L', damage: base * s.damage * (1 + s.extra * act.fresh), reach: s.reach, arc: (100 * Math.PI) / 180, all: true, skill: 'moon', push: 0.9 });
        settle();
      }
      if (act.t > 0.5) man.act = null;
      break;
    // ---- Tiger Step ----
    case 'swing':
      for (const [k, time] of [0.18, 0.38, 0.58].slice(0, s.hits).entries()) {
        if (at(time)) {
          beat(k);
          strike(game, man, { line: k % 2 ? 'L' : 'R', damage: base * s.damage, reach: s.reach, arc: 0.95, skill: 'swing', stun: 0.28 });
          if (k + 1 === s.hits) settle();
        }
      }
      if (act.t > 0.92) man.act = null;
      break;
    case 'spin':
      // One whirl in place, the blade round at everyone near.
      if (at(0.3)) {
        beat();
        strike(game, man, { line: 'R', damage: base * s.damage, reach: s.reach, arc: Math.PI, all: true, skill: 'spin', stun: 0.4, push: 0.6 });
      }
      if (act.t > 0.62) man.act = null;
      break;
    case 'mist':
      if (at(0.32)) {
        game.clouds.push({ kind: 'mist', x: man.x + fwd[0] * 2.2, z: man.z + fwd[1] * 2.2, radius: s.radius, t: s.cloud, side: man.side, by: man.id });
        emit(game, 'mist', { at: [man.x + fwd[0] * 2.2, man.z + fwd[1] * 2.2], radius: s.radius });
        settle();
      }
      if (act.t > 0.6) man.act = null;
      break;
    // ---- Berserker Battalion ----
    case 'down':
      if (at(0.72)) {
        beat();
        areaStrike(s.ahead, s.radius, { line: 'O', damage: base * s.damage, skill: 'down', guardCost: 2, stun: 0.7, push: 1.2 });
      }
      if (act.t > 1.3) man.act = null;
      break;
    case 'wave':
      if (at(0.38)) {
        game.shots.push({ kind: 'wave', by: man.id, side: man.side, x: man.x + fwd[0], y: 0.9, z: man.z + fwd[1], vx: fwd[0] * s.speed, vy: 0, vz: fwd[1] * s.speed, from: [man.x, man.z], damage: base * s.damage, life: s.range / s.speed, hit: [] });
        emit(game, 'loose', { who: man.id, kind: 'wave', skill: 'wave', yaw: man.face });
        settle();
      }
      if (act.t > 0.75) man.act = null;
      break;
    case 'whirl':
      for (let k = 0; k < s.hits; k++) {
        if (at(0.25 + k * 0.3)) {
          beat(k);
          strike(game, man, { line: k % 2 ? 'L' : 'R', damage: base * s.damage, reach: s.reach, arc: Math.PI, all: true, skill: 'whirl', stun: 0.22 });
          if (k + 1 === s.hits) settle();
        }
      }
      if (act.t > 0.25 + s.hits * 0.3 + 0.2) man.act = null;
      break;
    case 'leap': {
      const target = nearestFoe(game, man);
      const run = 0.5;
      if (act.t < run) {
        const room = target ? Math.max(0, dist(man, target) - 1.2) : s.dash;
        dash(Math.min(s.dash, room) / run);
        act.air = Math.sin((act.t / run) * Math.PI) * 1.1;
      } else act.air = 0;
      if (at(run + 0.06)) areaStrike(0.8, s.radius, { line: 'O', damage: base * s.damage, skill: 'leap', stun: 0.5 });
      if (act.t > run + 0.55) man.act = null;
      break;
    }
    case 'shout':
      if (at(0.5)) {
        man.shout = { t: s.last, next: s.every };
        emit(game, 'shout', { who: man.id });
        settle();
      }
      if (act.t > 0.9) man.act = null;
      break;
    // ---- Silver Wing Guard, on foot ----
    case 'returnSpear': {
      const ease = (elapsed, duration) => {
        const t = clamp(elapsed / duration, 0, 1);
        return t * t * (3 - 2 * t);
      };
      if (act.t - dt < s.stepTime) {
        const { launchFace, stepSide } = act;
        const progress = ease(act.t, s.stepTime);
        const pace = (progress - ease(act.t - dt, s.stepTime)) / dt;
        man.vx = (-Math.cos(launchFace) * stepSide * s.sideDistance - Math.sin(launchFace) * s.backDistance) * pace;
        man.vz = (Math.sin(launchFace) * stepSide * s.sideDistance - Math.cos(launchFace) * s.backDistance) * pace;
        man.face = wrap(launchFace - stepSide * 0.24 * progress);
        act.moving = true;
        if (at(s.stepTime)) beat(-1);
      } else {
        // Turn toward the point read on cast, using the position the sidestep actually reached.
        if (act.pivotFrom === undefined) {
          act.pivotFrom = man.face;
          act.pivotTo = act.turnTarget ? Math.atan2(act.turnTarget[0] - man.x, act.turnTarget[1] - man.z) : act.launchFace;
        }
        const progress = ease(act.t - s.stepTime, s.turnTime - s.stepTime);
        man.face = wrap(act.pivotFrom + wrap(act.pivotTo - act.pivotFrom) * progress);
      }
      if (at(s.release)) {
        beat();
        const thrust = man.r.blows.T;
        strike(game, man, { line: 'T', damage: thrust.damage * s.damage, reach: s.reach, arc: thrust.arc, skill: 'returnSpear' });
        settle();
      }
      if (act.t > s.duration) man.act = null;
      break;
    }
    case 'stepCut': {
      // A step in, then the cut.
      const run = 0.26;
      if (act.t < run) dash(s.step / run);
      if (at(run + 0.12)) {
        beat();
        strike(game, man, { line: 'R', damage: base * s.damage, reach: s.reach, arc: (70 * Math.PI) / 180, all: true, skill: 'stepCut', stun: 0.45, push: 0.9 });
        settle();
      }
      if (act.t > run + 0.6) man.act = null;
      break;
    }
    case 'flowers':
      for (let k = 0; k < s.hits; k++) {
        if (at(0.16 + k * 0.17)) {
          beat(k);
          strike(game, man, { line: 'T', damage: man.r.blows.T.damage * s.damage, reach: s.reach, arc: 0.26, skill: 'flowers', stun: 0.2, push: 0.2 });
          if (k + 1 === s.hits) settle();
        }
      }
      if (act.t > 0.16 + s.hits * 0.17 + 0.25) man.act = null;
      break;
    case 'boar': {
      // Two strikes: the first on the way in, the second driving through.
      const run = 0.42;
      act.charging = act.t < run + 0.2;
      if (act.t < run) {
        dash((s.dash * 0.75) / run);
        if (!act.met) {
          const hit = enemiesOf(game, man).find((t) => inSweep(man, t, 1.1, 0.6));
          if (hit) {
            act.met = true;
            act.firstHitAt = act.t;
            beat();
            resolve(game, man, hit, { line: 'T', damage: man.r.blows.T.damage * s.damage[0], skill: 'boar', stun: 0.35, push: 0.8 });
          }
        }
      }
      if (at(run + 0.18)) {
        beat(1);
        dash(5);
        strike(game, man, { line: 'T', damage: man.r.blows.T.damage * s.damage[1], reach: 3.3, arc: 0.24, skill: 'boar', stun: 0.6, push: 1.6 });
        settle();
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
      if (at(run)) areaStrike(0, s.radius, { line: 'O', damage: man.r.blows.O.damage * s.damage, skill: 'drop', slam: true, pin: true, stun: 0.45 });
      if (act.t > run + 0.5) man.act = null;
      break;
    }
    // ---- Martial Archery Expert ----
    case 'gale':
    case 'fan':
    case 'backStep':
    case 'blast':
    case 'web':
      runBowSkill(game, man, act, s, dt, at);
      break;
    // ---- weapon arts (X, Z) ----
    case 'finisher': {
      // A step and an attack straight ahead.
      const a = ARTS.finisher,
        run = 0.2;
      if (act.t < run) dash(2.2);
      if (at(0.28)) {
        beat();
        strike(game, man, { line: 'T', damage: man.r.blows.T.damage * a.damage, reach: a.reach, arc: 0.35, skill: 'finisher', stun: 0.5, push: 0.8 });
        settle();
      }
      if (act.t > 0.7) man.act = null;
      break;
    }
    case 'shieldSlam': {
      // The shield driven into the first man met: he goes down.
      const a = ARTS.shieldSlam;
      if (at(0.2)) {
        beat();
        const hit = enemiesOf(game, man).filter((t) => inSweep(man, t, a.reach, 0.8)).sort((x, y) => dist(man, x) - dist(man, y))[0];
        if (!hit) emit(game, 'whiff', { who: man.id, skill: 'shieldSlam' });
        else {
          resolve(game, man, hit, { line: 'T', kind: 'blunt', damage: man.r.shield.damage * a.damage, skill: 'shieldSlam', crit: false });
          if (hit.alive && !hit.mounted) stagger(hit, 1.2, 'down', [fwd[0] * 1.4, fwd[1] * 1.4]);
          else if (hit.alive) stagger(hit, 0.5, 'rear');
        }
        settle();
      }
      if (act.t > 0.6) man.act = null;
      break;
    }
    case 'axeSmash':
    case 'poleAxeSmash': {
      // One mighty swing across the front.
      const a = ARTS[act.id];
      if (at(0.55)) {
        beat();
        strike(game, man, { line: 'R', damage: man.r.blows.R.damage * a.damage, reach: a.reach, arc: (75 * Math.PI) / 180, all: true, skill: act.id, stun: 0.6, push: 1.2 });
        settle();
      }
      if (act.t > 1.05) man.act = null;
      break;
    }
    case 'volley': {
      // Three arrows, one after another, with no draw.
      const a = ARTS.volley,
        bow = man.r.bow;
      const target = nearestFoe(game, man);
      if (target) man.face = bearing(man, target);
      for (let k = 0; k < a.shots; k++)
        if (at(0.25 + k * 0.2)) {
          const aim = target ? aimAt(man, target, bow.speed) : act.aim;
          loose(game, man, { yaw: aim.yaw + (game.rng() - 0.5) * 0.02, pitch: aim.pitch, power: 1, damage: bow.full * (a.damage / a.shots), skill: 'volley' });
        }
      if (act.t > 0.25 + a.shots * 0.2 + 0.2) man.act = null;
      break;
    }
  }
}

function runBowSkill(game, man, act, s, dt, at) {
  const bow = man.r.bow;
  const target = nearestFoe(game, man);
  const aimed = () => (target ? aimAt(man, target, bow.speed) : act.aim);
  if (target) man.face = bearing(man, target);
  if (act.id === 'gale') {
    // One arrow that tears on through, taking everyone near its flight.
    if (at(0.42)) {
      const a = aimed();
      loose(game, man, { yaw: a.yaw, pitch: a.pitch, power: 1, damage: bow.full * s.damage, through: s.width, kind: 'gale', skill: 'gale' });
    }
    if (act.t > 0.8) man.act = null;
  } else if (act.id === 'fan') {
    // A spread from one draw; each arrow hits harder the nearer the man.
    if (at(0.42)) {
      const a = aimed();
      const group = [];
      for (let k = 0; k < s.shots; k++)
        loose(game, man, { yaw: a.yaw + (k / (s.shots - 1) - 0.5) * s.spread, pitch: a.pitch, power: 0.9, damage: bow.full, fall: { near: s.near, far: s.far, at: s.damage }, skill: 'fan', group, announce: k === Math.floor(s.shots / 2) });
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
      loose(game, man, { yaw: a.yaw, pitch: a.pitch, power: 1, damage: bow.full * s.damage, skill: 'backStep' });
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
      loose(game, man, { yaw: a.yaw, pitch: a.pitch, power: 1, damage: bow.full * s.damage, kind: 'web', web: true });
    }
    if (act.t > 0.7) man.act = null;
  }
}

function cueSwingRelease(game, man, act, heavy = 0) {
  if (act.releaseAnnounced) return;
  act.releaseAnnounced = true;
  emit(game, 'swingRelease', { who: man.id, line: act.line, heavy });
}

const meleePressed = (man, input) => input.meleeRelease ? input.meleeDown && !input.meleeCancel : input.attack && !man.prev.attack;
const meleeLine = (man, input) => input.meleeRelease ? input.meleeLine ?? man.line : man.line;

function chargeSwing(game, man, act, dt) {
  act.held += dt;
  if (act.held > 0.15 && !act.heavyAnnounced) {
    act.heavyAnnounced = true;
    emit(game, 'heavy', { who: man.id, line: act.line });
  }
}

const swingCharge = (act) => act.held > 0.15 ? Math.min(1, act.held / HOLD) : 0;

function runSwing(game, man, act, input, dt, wantsGuard, guardLine) {
  const holding = input.attack && !act.releaseOnly;
  // A held gesture can be withdrawn any time before release. A committed blow keeps the normal feint window.
  if (input.guard && !man.prev.guard && (act.awaitingRelease || act.t < act.wind * 0.75)) {
    man.act = { kind: 'recover', t: 0, time: 0.12 };
    spend(man, 5);
    emit(game, 'feint', { who: man.id });
    if (act.awaitingRelease && wantsGuard && man.st > 0) raiseGuard(game, man, guardLine);
    return;
  }
  if (act.awaitingRelease) {
    const aimed = input.meleeAim;
    const blow = aimed && aimed !== act.line && blowsOf(man)[aimed];
    if (blow) {
      const wind = act.readableAttack ? Math.max(OPPONENT_WIND, blow.wind) : blow.wind;
      const prepCap = wind * RELEASE_PREP_FRACTION;
      const t = Math.min(1, act.t / act.prepCap) * prepCap;
      Object.assign(act, { line: aimed, blow, wind, prepCap, t, reach: blow.reach, recover: blow.recover });
    }
    if (!input.meleeRelease || !input.meleeUp) {
      // Reserve the last part of the original wind for the blade's travel after release.
      act.t = Math.min(act.t, act.prepCap);
      act.prepareTime += dt;
      if (act.prepareTime >= act.wind && act.held < HOLD) chargeSwing(game, man, act, Math.min(dt, HOLD - act.held));
      return;
    }
    act.awaitingRelease = false;
    act.releaseAt = act.t - dt;
    announceSwing(game, man, act);
  }
  if (act.t < act.wind) {
    // Play the cutting air in the last two ticks of a committed tap, past the feint window.
    if (!holding && act.t >= act.wind * 0.75 && act.t >= act.wind - 2 * TICK) cueSwingRelease(game, man, act, swingCharge(act));
    return;
  }
  if (!act.struck) {
    if (act.driveAt === undefined && holding && act.held < HOLD && !act.quick) {
      chargeSwing(game, man, act, dt);
      return;
    }
    if (act.readableAttack && act.held > 0) {
      // A held NPC blow travels from the loaded pose before it can strike.
      if (act.driveAt === undefined) {
        act.driveAt = act.t;
        cueSwingRelease(game, man, act, swingCharge(act));
      }
      if (act.t - act.driveAt + 1e-7 < CHARGED_RELEASE) return;
    }
    act.struck = true;
    act.strikeAt = act.t;
    const heavy = swingCharge(act);
    spend(man, act.blow.cost * (1 + heavy * 0.6));
    act.heavy = heavy;
    cueSwingRelease(game, man, act, heavy);
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
  const elapsed = act.t - act.strikeAt;
  const recovered = elapsed >= act.recover;
  const requested = (!recovered || input.recoveryHandoff) && elapsed > act.recover * 0.55 && meleePressed(man, input);
  // Keep one late command while the current blow settles through its entire recovery.
  if (requested && !man.queuedSwing) {
    man.queuedSwing = { line: meleeLine(man, input), releaseOnly: input.meleeRelease, released: input.meleeUp };
  }
  if (man.queuedSwing?.releaseOnly && input.meleeRelease) {
    if (input.meleeAim) man.queuedSwing.line = input.meleeAim;
    if (input.meleeUp) man.queuedSwing.released = true;
  }
  if (recovered) man.act = null;
  return recovered;
}

function runBow(game, man, input, dt) {
  const bow = man.r.bow;
  const drawTime = bow.draw;
  if (man.draw) {
    man.draw.t += dt;
    if (!input.attack) {
      const power = clamp(man.draw.t / drawTime, 0.15, 1);
      let { yaw, pitch } = input.aim ?? { yaw: man.face, pitch: 0.04 };
      // Held long at full draw the arm shakes.
      const over = Math.max(0, man.draw.t - drawTime - 1.1);
      const sway = Math.min(1, over / 1.5) * 0.05 + (1 - power) * 0.035;
      yaw += (game.rng() - 0.5) * 2 * sway;
      pitch += (game.rng() - 0.5) * sway;
      spend(man, bow.cost);
      loose(game, man, { yaw, pitch, power, damage: bow.least + (bow.full - bow.least) * power ** 1.2 });
      man.draw = null;
      man.act = { kind: 'recover', t: 0, time: 0.22 };
    }
  } else if (input.attack && canAct(man) && man.st > 4) {
    // A press held through a stagger or a recovery draws as soon as he is free (the shot itself goes on the release).
    man.draw = { t: 0 };
    emit(game, 'draw', { who: man.id });
  }
}

function raiseGuard(game, man, line) {
  man.guard = true;
  man.guardAt = game.time;
  man.guardLine = line;
  man.act = null;
  man.queuedSwing = null;
}

/** One tick for one man, with his input. */
function stepMan(game, man, input, dt) {
  const pressed = (key) => input[key] && !man.prev[key];
  if (man.stun > 0 || (input.meleeCancel && man.queuedSwing?.releaseOnly)) man.queuedSwing = null;
  const recovering = man.act?.kind === 'swing' && man.act.struck;
  const queuedSwing = recovering ? null : man.queuedSwing;
  // The buffered command is consumed on the first free tick, including when another action wins priority.
  if (!recovering) man.queuedSwing = null;
  if (input.meleeCancel && man.act?.awaitingRelease) man.act = null;
  // ---- what wears off and what keeps working --------------------------------------------------------------
  man.cool = man.cool.map((c) => Math.max(0, c - dt));
  for (const id in man.artCool) man.artCool[id] = Math.max(0, man.artCool[id] - dt);
  man.slow = man.slow.filter((s) => (s.t -= dt) > 0);
  man.dr = man.dr.filter((d) => (d.t -= dt) > 0);
  man.immune = Math.max(0, man.immune - dt);
  man.pin = Math.max(0, man.pin - dt);
  man.daze = Math.max(0, man.daze - dt);
  if (man.poison) {
    const p = man.poison;
    const by = game.men.find((m) => m.id === p.by) ?? game.men.find((m) => m.side !== man.side);
    // Whole points of health at a time.
    p.owed = (p.owed ?? 0) + p.dps * Math.min(dt, p.t);
    if (p.owed >= 1) {
      const whole = Math.floor(p.owed);
      p.owed -= whole;
      wound(game, man, whole, by, { poison: true, quiet: true });
    }
    // The mist's poison is catching: a friend who comes close takes it too, for the time it has left.
    if (p.catching && man.alive)
      for (const m of game.men)
        if (m !== man && m.alive && m.side === man.side && !m.poison && m.immune <= 0 && dist(m, man) < SKILLS.mist.spread)
          poison(game, m, p.dps * p.t, p.t, p.by, true);
    if ((p.t -= dt) <= 0) {
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
  if (!man.alive) return;

  // ---- the line he has chosen, and his guard --------------------------------------------------------------
  if (input.line) man.line = input.line;
  if (input.aim) man.aim = input.aim;
  const mountPressed = pressed('mount');
  if (man.stun > 0) {
    if (mountPressed && man.stunKind === 'thrown' && man.horse && !man.mountOnRecovery) {
      const h = man.horse;
      if (h.alive && dist(h, man) <= man.r.horse.near) {
        // Keep one press through the fall. Mounting still needs a living horse in reach on recovery.
        man.mountOnRecovery = true;
        emit(game, 'mountOnRecovery', { who: man.id });
      } else emit(game, 'noHorse', { who: man.id, dead: !h.alive });
    }
    man.stun -= dt;
    man.vx = man.knock[0] * 3;
    man.vz = man.knock[1] * 3;
    man.knock = [man.knock[0] * 0.9, man.knock[1] * 0.9];
    if (man.stun <= 0) man.stunKind = null;
  } else {
    const mountRequested = mountPressed || man.mountOnRecovery;
    man.mountOnRecovery = false;
    // The archer's weapons: R changes over, 1 and 2 take up the bow or the knife.
    const knifeWanted = pressed('swap') ? !man.knife : input.arm === 0 || input.arm === 1 ? input.arm === 1 : man.knife;
    if (man.regiment === 'archer' && knifeWanted !== man.knife && canAct(man)) {
      man.knife = knifeWanted;
      man.draw = null;
      emit(game, 'swap', { who: man.id, knife: man.knife });
    }
    // The horse: E gets on or off, U calls it over.
    if (man.horse && mountRequested && (!man.act || man.act.kind === 'recover') && !man.draw) {
      const h = man.horse;
      if (man.mounted) {
        man.act = { kind: 'dismount', t: 0 };
        man.guard = false;
        emit(game, 'dismount', { who: man.id });
      } else if (h.alive && dist(h, man) <= man.r.horse.near) {
        man.act = { kind: 'mount', t: 0 };
        man.guard = false;
        h.called = false;
        emit(game, 'mount', { who: man.id });
      } else emit(game, 'noHorse', { who: man.id, dead: !h.alive });
    }
    if (man.horse && pressed('call') && !man.mounted && man.horse.alive) {
      man.horse.called = true;
      emit(game, 'call', { who: man.id });
    }
    const bowOut = man.regiment === 'archer' && !man.knife;
    // Dazed (by a Bull Charge) he can neither attack nor defend.
    const dazed = man.daze > 0;
    const wantsGuard = input.guard && !bowOut && man.st > 0 && !dazed;
    const guardLine = input.guardLine ?? man.line;
    const cancelRecovery = wantsGuard && input.skillGuardCancel && man === game.hero && pressed('guard') && recoveryGuardWindow(man);
    if (cancelRecovery) {
      const act = man.act;
      const event = { who: man.id, id: act.id, into: 'guard', elapsed: act.t };
      if (act.id === 'spin') emit(game, 'skillCancel', event);
      else emit(game, 'recoveryCancel', { ...event, from: act.kind, line: guardLine });
      raiseGuard(game, man, guardLine);
    } else if (wantsGuard && !man.guard && (!man.act || man.act.kind === 'recover')) {
      raiseGuard(game, man, guardLine);
    } else if (!wantsGuard && man.guard && man.act?.id !== 'counter') man.guard = false;
    if (man.guard) {
      if (man.guardLine !== guardLine) man.guardAt = Math.max(man.guardAt, game.time - DEFLECT * 0.5);
      man.guardLine = guardLine;
    }

    // ---- starting something ------------------------------------------------------------------------------
    const free = !cancelRecovery && (!man.act || man.act.kind === 'recover');
    const chain = wantsGuard ? null : queuedSwing;
    if (pressed('heal') && free && !man.draw && man.dressings > 0 && man.hp < man.maxHp) {
      man.act = { kind: 'mend', t: 0 };
      man.guard = false;
      emit(game, 'dressing', { who: man.id });
    } else if (pressed('step') && free) startStep(game, man, input);
    else if (dazed) man.draw = null;
    else if (input.skill >= 0 && man.prev.skill !== input.skill && free && !man.draw) startSkill(game, man, input.skill, input);
    else if (pressed('art') && free) startArt(game, man, 'main');
    else if (pressed('offArt') && free) startArt(game, man, 'off');
    else if (pressed('kick') && free && !man.draw) startKick(game, man);
    else if (bowOut) runBow(game, man, input, dt);
    else if (free && (chain || meleePressed(man, input))) {
      const releaseOnly = chain ? chain.releaseOnly : input.meleeRelease;
      startSwing(game, man, chain?.line ?? meleeLine(man, input), {
        releaseOnly,
        released: chain?.released || (input.meleeRelease && input.meleeUp),
        readableAttack: input.readableAttack
      });
    }

    // ---- what is under way --------------------------------------------------------------------------------
    const act = man.act;
    if (act?.t === 0 && act.lead === undefined && input.readableAttack) {
      const lead = act.kind === 'skill' ? opponentSkillLead(act.id)
        : act.kind === 'kick' ? OPPONENT_WIND - KICK.wind
          : act.kind === 'lance' ? OPPONENT_WIND - ARTS.couch.wind : 0;
      if (lead > 0) act.lead = act.leadTotal = lead;
    }
    if (act?.lead > 1e-7) {
      act.lead = Math.max(0, act.lead - dt);
    } else if (act) {
      act.t += dt;
      act.moving = false;
      if (act.kind === 'swing') {
        const recovered = runSwing(game, man, act, input, dt, wantsGuard, guardLine);
        if (recovered && input.recoveryHandoff && wantsGuard && !man.guard) raiseGuard(game, man, guardLine);
      } else if (act.kind === 'kick') {
        if (act.t - dt < KICK.wind && act.t >= KICK.wind) {
          const hit = enemiesOf(game, man).filter((t) => inSweep(man, t, KICK.reach, KICK.arc)).sort((a, b) => dist(man, a) - dist(man, b))[0];
          if (hit) {
            if (hit.mounted) {
              // A kick does not move a horse; it only hurts it.
              woundHorse(game, hit, KICK.damage, man);
              emit(game, 'whiff', { who: man.id, kick: true, horse: true });
            } else {
              const push = [Math.sin(man.face) * 1.3, Math.cos(man.face) * 1.3];
              if (hit.guard) {
                hit.stats.broken++;
                emit(game, 'break', { who: hit.id, by: man.id, kick: true });
                stagger(hit, 0.9, 'break', push);
              } else stagger(hit, 0.38, 'flinch', push);
              wound(game, hit, toll(game, hit, KICK.damage, 'blunt').amount, man, { kick: true });
            }
          } else emit(game, 'whiff', { who: man.id, kick: true });
        }
        if (act.t >= KICK.wind + KICK.recover) man.act = null;
      } else if (act.kind === 'step') {
        // Space: a jump the way he is moving.
        const speed = STEP.distance / STEP.time;
        man.vx = act.dx * speed;
        man.vz = act.dz * speed;
        act.moving = true;
        act.air = Math.sin(Math.min(1, act.t / STEP.time) * Math.PI) * 0.38;
        if (act.t >= STEP.time) {
          man.act = null;
        }
      } else if (act.kind === 'skill') runSkill(game, man, act, dt);
      else if (act.kind === 'lance') runLance(game, man, act);
      else if (act.kind === 'mend') {
        if (act.t >= DRESSING.time) {
          const mend = Math.round(man.maxHp * DRESSING.mend);
          man.hp = Math.min(man.maxHp, man.hp + mend);
          man.dressings--;
          man.act = null;
          emit(game, 'mend', { who: man.id, amount: mend, dressing: true });
        }
      } else if (act.kind === 'mount') {
        const h = man.horse;
        if (!h.alive) man.act = null;
        else {
          // He goes to its side and swings up.
          man.vx = (h.x - man.x) * 5;
          man.vz = (h.z - man.z) * 5;
          act.moving = true;
          if (act.t >= man.r.horse.mount) {
            man.x = h.x;
            man.z = h.z;
            man.vx = man.vz = 0;
            setMounted(man, true);
            man.act = null;
            emit(game, 'mounted', { who: man.id });
          }
        }
      } else if (act.kind === 'dismount') {
        if (act.t >= man.r.horse.dismount) {
          const h = man.horse;
          setMounted(man, false);
          man.x = h.x + Math.cos(h.face) * 1.0;
          man.z = h.z - Math.sin(h.face) * 1.0;
          man.vx = man.vz = 0;
          h.speed = 0;
          man.act = null;
          emit(game, 'dismounted', { who: man.id });
        }
      } else if (act.kind === 'recover' && act.t >= act.time) man.act = null;
    }
  }

  // ---- feet ---------------------------------------------------------------------------------------------
  const busyFeet = man.stun > 0 || man.act?.moving;
  if (man.mounted) ride(game, man, input, dt);
  else if (!busyFeet) {
    const [mx, mz] = input.move ?? [0, 0];
    const want = Math.min(1, Math.hypot(mx, mz));
    const canSprint = input.sprint && want > 0.5 && man.st > 2 && !man.guard && !man.draw && !man.act && man.pin <= 0;
    man.sprinting = canSprint;
    if (canSprint) {
      spend(man, 13 * dt);
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
  if (man.mounted) {
    man.horse.x = man.x;
    man.horse.z = man.z;
  }
  stepHorse(game, man, dt);

  // ---- heading --------------------------------------------------------------------------------------------
  if (input.face !== undefined && input.face !== null && man.stun <= 0) {
    const act = man.act;
    let rate = man.turn;
    if (act?.kind === 'swing') rate = act.struck ? 1.2 : act.t < act.wind ? 4 : 2;
    if (act?.kind === 'skill' && !['flowers', 'whirl', 'counter', 'gale'].includes(act.id)) rate = 1.5;
    if (act?.kind === 'skill' && act.id === 'returnSpear') rate = 0;
    if (man.mounted) rate = act?.kind === 'swing' && act.struck ? 1.5 : 7;
    if (act?.kind === 'lance') rate = 0;
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
  man.prev = { attack: input.attack, guard: input.guard, kick: input.kick, step: input.step, swap: input.swap, mount: input.mount, call: input.call, heal: input.heal, art: input.art, offArt: input.offArt, skill: input.skill ?? -1 };
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
        need = a.body + b.body;
      if (d < need && d > 1e-4) {
        // A horse gives way less than a man on foot.
        const wa = a.mounted ? 0.25 : 1,
          wb = b.mounted ? 0.25 : 1,
          push = (need - d) / (wa + wb);
        a.x -= (dx / d) * push * wa;
        a.z -= (dz / d) * push * wa;
        b.x += (dx / d) * push * wb;
        b.z += (dz / d) * push * wb;
      }
    }
  }
  // A riderless horse stands in the way of everyone but the man getting on it.
  for (const owner of game.men) {
    const h = owner.horse;
    if (!h?.alive || owner.mounted) continue;
    for (const m of men) {
      if (m === owner && m.act?.kind === 'mount') continue;
      const dx = m.x - h.x,
        dz = m.z - h.z,
        d = Math.hypot(dx, dz),
        need = 0.75 + m.body;
      if (d < need && d > 1e-4) {
        m.x = h.x + (dx / d) * need;
        m.z = h.z + (dz / d) * need;
      }
    }
  }
  for (const m of men) {
    for (const post of game.place.posts ?? []) {
      const dx = m.x - post.x,
        dz = m.z - post.z,
        d = Math.hypot(dx, dz),
        need = post.r + m.body;
      if (d < need && d > 1e-4) {
        m.x = post.x + (dx / d) * need;
        m.z = post.z + (dz / d) * need;
      }
    }
    const r = Math.hypot(m.x, m.z),
      edge = game.place.radius - m.body;
    if (r > edge) {
      m.x *= edge / r;
      m.z *= edge / r;
    }
    if (m.mounted) {
      m.horse.x = m.x;
      m.horse.z = m.z;
    }
  }
}

function groundEffects(game, dt) {
  for (const cloud of game.clouds) {
    cloud.t -= dt;
    for (const man of game.men) {
      if (!man.alive || man.side === cloud.side) continue;
      if (Math.hypot(man.x - cloud.x, man.z - cloud.z) > cloud.radius) continue;
      // A cloud poisons each man once; after that he carries it out with him.
      if (cloud.kind === 'mist' && !(cloud.caught ??= []).includes(man.id)) {
        cloud.caught.push(man.id);
        poison(game, man, SKILLS.mist.total, SKILLS.mist.last, cloud.by, true);
      }
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
        resolve(game, { ...by, face: wrap(face + Math.PI), x: shot.x - shot.vx * 0.05, z: shot.z - shot.vz * 0.05, act: null, talents: by.talents, r: by.r, stats: by.stats, mounted: false }, man, { line: 'R', damage: shot.damage, skill: 'wave', stun: 0.35 });
      }
    }
  }
}

/** Advance the fight by `dt` with one input per man (by id). Returns the events of this step. */
export function step(game, inputs, dt = TICK) {
  game.events = [];
  if (game.over) return game.events;
  game.time += dt;
  const origins = game.men.some((m) => m.alive && m.mounted)
    ? game.men.map((m) => ({ x: m.x, z: m.z, mounted: m.mounted, busy: m.stun > 0 || Boolean(m.act), through: m.act?.through })) : null;
  for (const man of game.men) stepMan(game, man, inputs[man.id] ?? {}, dt);
  flyShots(game, dt);
  groundEffects(game, dt);
  if (origins) mountedContacts(game, origins, dt);
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
