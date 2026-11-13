// A fight. Both sides close in and trade moves on their own; the player's
// part is the line-up beforehand and a few orders given while paused.
//
// The fight runs in fixed steps and needs no page, so the same code plays a
// battle on screen, settles a small one in an instant, and runs thousands in
// a row for balance checks.
//
// Damage of one move:
//   (power + weapon) x (1 + attribute/200) x (1 + 0.05 x mastery level)
//     x weapon triangle x side or back bonus x 100/(100 + defence) x 0.95..1.05
import { ART_BY_ID, BEATS, CLASSES, SECT_TUNING, levelOf, passivesOf } from '../data/arts.mjs';
import { GRADES } from '../data/goods.mjs';
import { attackInterval, autoWheel, defense, hpMax, innerDepth, neiMax, staminaMax } from './persons.mjs';
import { clamp, createRng } from './rng.mjs';

export const RULES = {
  step: 0.1,
  /** The field, in metres; the two sides start `gap` apart. */
  width: 44,
  depth: 26,
  gap: 16,
  counterStrong: 1.25,
  counterWeak: 0.8,
  flankSide: 1.15,
  flankBack: 1.3,
  critBase: 0.05,
  critBonus: 1.5,
  /** Both bars refill by this share of their size every second. */
  regen: 0.003,
  /** Below this share of health a fighter slows down. */
  faint: 0.25,
  faintSlow: 1.3,
  /** A fight that runs this long is called for whoever has more health left. */
  timeLimit: 300,
  /** What one move hands the next on the wheel. */
  links: { hit: 0.15, crit: 0.1, power: 0.2, thrift: 0.3 },
  poisonSeconds: 8,
  poisonShare: 0.005,
};

const PLAIN_MOVE = { name: '拳脚', power: 30, nei: 0, stamina: 0 };

/** Turns a person into a fighter on the field. */
function enlist(person, side, index) {
  const wheel = (person.wheel?.length ? person.wheel : autoWheel(person)).filter((slot) => ART_BY_ID[slot.art]);
  const lead = wheel[0] ? ART_BY_ID[wheel[0].art] : null;
  const klass = lead ? CLASSES[lead.klass] : CLASSES.fist;
  const light = Object.entries(person.arts).reduce(
    (best, [id, points]) => (ART_BY_ID[id]?.klass === 'light' ? Math.max(best, ART_BY_ID[id].tier * levelOf(points)) : best),
    0,
  );
  const passive = passivesOf(person);
  return {
    id: person.id,
    name: person.name,
    side,
    passive,
    attackBonus: passive.attack ?? 0,
    regenBonus: passive.regen ?? 0,
    healWait: 3,
    /** Members of a sect fight with its tuning whatever art they use. */
    tuning: SECT_TUNING[person.school] ?? 1,
    index,
    person,
    x: 0,
    y: 0,
    /** Heading in radians; 0 looks along +x. */
    facing: side === 0 ? 0 : Math.PI,
    hp: hpMax(person) * (1 - clamp(person.wounds ?? 0, 0, 0.6)),
    hpMax: hpMax(person),
    nei: neiMax(person),
    neiMax: neiMax(person),
    stamina: staminaMax(person),
    staminaMax: staminaMax(person),
    defense: defense(person) * (1 + (passive.defense ?? 0)),
    interval: attackInterval(person),
    agi: person.stats.agi,
    wit: person.stats.wit,
    speed: 3 + person.stats.agi / 50 + light / 12,
    range: klass.range,
    family: klass.family,
    weapon: person.gear.weapon,
    wheel,
    turn: 0,
    /** Seconds until the next move. */
    wait: 0.3 + index * 0.07,
    link: null,
    target: null,
    poison: 0,
    down: false,
    fled: false,
    dealt: 0,
    healed: 0,
  };
}

/** Stands a side in ranks: short reach in front, long reach behind. */
function deploy(units, side, formation) {
  const order = [...units].sort((a, b) => a.range - b.range);
  const perRank = formation?.width ?? 5;
  order.forEach((unit, i) => {
    const rank = Math.floor(i / perRank),
      file = i % perRank,
      inRank = Math.min(perRank, order.length - rank * perRank);
    const back = RULES.gap / 2 + rank * 2.4;
    unit.x = RULES.width / 2 + (side === 0 ? -back : back);
    unit.y = RULES.depth / 2 + (file - (inRank - 1) / 2) * 2.6;
  });
}

/**
 * Starts a fight.
 * @param options.sides two lists of persons
 * @param options.seed  repeats the same fight
 * @param options.formations optional per-side { width, bonus:{attack,defense,regen} }
 */
export function createBattle({ sides, seed = 1, formations = [] }) {
  const rng = createRng(seed);
  const units = [];
  sides.forEach((people, side) => {
    const group = people.map((person, index) => enlist(person, side, index));
    deploy(group, side, formations[side]);
    // The side's formation and anyone whose art lifts the whole side.
    const bonus = formations[side]?.bonus ?? {};
    const rally = Math.max(0, ...group.map((unit) => unit.passive.rally ?? 0)) + (bonus.attack ?? 0);
    const ward = Math.max(0, ...group.map((unit) => unit.passive.ward ?? 0)) + (bonus.defense ?? 0);
    for (const unit of group) {
      unit.defense *= 1 + ward;
      unit.attackBonus += rally;
      unit.regenBonus += bonus.regen ?? 0;
    }
    units.push(...group);
  });

  const battle = {
    units,
    time: 0,
    done: false,
    /** 0 or 1 once the fight is over; -1 for a draw. */
    winner: undefined,
    /** What happened since the caller last emptied the list. */
    events: [],
    orders: [{ focus: null, retreat: false }, { focus: null, retreat: false }],
    update,
    /** Tells a side to gang up on one enemy, or clears the order with null. */
    focus(side, targetId) {
      battle.orders[side].focus = targetId;
    },
    /** Tells a side to break off; it loses the fight but saves who can get away. */
    retreat(side) {
      battle.orders[side].retreat = true;
    },
    alive: (side) => units.filter((unit) => unit.side === side && !unit.down && !unit.fled),
  };

  function pickTarget(unit) {
    const foes = battle.alive(1 - unit.side);
    if (!foes.length) return null;
    const ordered = battle.orders[unit.side].focus;
    const focused = ordered != null && foes.find((foe) => foe.id === ordered);
    if (focused) return focused;
    if (unit.target && !unit.target.down && !unit.target.fled && rng.chance(0.85)) return unit.target;
    let best = null,
      bestScore = Infinity;
    for (const foe of foes) {
      // Nearest first, with a lean towards the wounded.
      const score = Math.hypot(foe.x - unit.x, foe.y - unit.y) * (0.6 + 0.4 * (foe.hp / foe.hpMax));
      if (score < bestScore) (best = foe), (bestScore = score);
    }
    return best;
  }

  function strike(unit, foe) {
    let slot = unit.wheel.length ? unit.wheel[unit.turn % unit.wheel.length] : null;
    unit.turn++;
    let art = slot ? ART_BY_ID[slot.art] : null;
    let move = art ? art.moves[slot.move] : PLAIN_MOVE;
    let thrift = unit.link === 'thrift' ? 1 - RULES.links.thrift : 1;
    // Out of breath: fall back to the art's first move, then to bare hands.
    if (unit.nei < move.nei * thrift || unit.stamina < move.stamina * thrift) {
      const first = art?.moves[0];
      move = first && unit.nei >= first.nei && unit.stamina >= first.stamina ? first : PLAIN_MOVE;
      if (move === PLAIN_MOVE) art = null;
      thrift = 1;
    }
    unit.nei -= move.nei * thrift;
    unit.stamina -= move.stamina * thrift;
    unit.facing = Math.atan2(foe.y - unit.y, foe.x - unit.x);

    const linked = unit.link;
    unit.link = slot?.link ?? null;
    const hitChance = clamp(0.85 + (unit.agi - foe.agi) / 400 + (linked === 'hit' ? RULES.links.hit : 0) - (foe.passive.dodge ?? 0), 0.3, 0.98);
    if (!rng.chance(hitChance)) {
      battle.events.push({ type: 'miss', time: battle.time, from: unit.id, to: foe.id, move: move.name });
      return;
    }
    const klass = art ? CLASSES[art.klass] : CLASSES.fist;
    const attribute = klass.attrs.reduce((sum, key) => sum + unit.person.stats[key], 0) / klass.attrs.length;
    const mastery = art ? levelOf(unit.person.arts[art.id] ?? 0) : 0;
    // A weapon only helps the arts made for it.
    const weapon = art && unit.weapon && unit.weapon.slot === klass.weapon ? GRADES[unit.weapon.grade].attack : 0;
    let counter = 1;
    if (klass.family && foe.family) {
      if (BEATS[klass.family] === foe.family) counter = RULES.counterStrong;
      else if (BEATS[foe.family] === klass.family) counter = RULES.counterWeak;
    }
    // Where the blow lands relative to the way the target is looking.
    const bearing = Math.atan2(unit.y - foe.y, unit.x - foe.x);
    const off = Math.abs(Math.atan2(Math.sin(bearing - foe.facing), Math.cos(bearing - foe.facing)));
    const flank = off < Math.PI / 3 ? 1 : off < (2 * Math.PI) / 3 ? RULES.flankSide : RULES.flankBack;
    const guard = foe.defense * (foe.stamina <= 0 ? 0.5 : 1);
    let damage =
      (move.power * (linked === 'power' ? 1 + RULES.links.power : 1) + weapon) *
      (1 + attribute / 200) *
      (1 + 0.05 * mastery) *
      (1 + unit.attackBonus) *
      unit.tuning *
      counter *
      flank *
      (100 / (100 + guard)) *
      rng.range(0.95, 1.05);
    const crit = rng.chance(RULES.critBase + unit.wit / 2000 + (linked === 'crit' ? RULES.links.crit : 0));
    if (crit) damage *= RULES.critBonus;
    damage = Math.round(damage);
    foe.hp -= damage;
    unit.dealt += damage;
    if (unit.passive.venom && art?.klass === 'dart' && !foe.passive.immune) foe.poison = RULES.poisonSeconds * unit.passive.venom;
    if (unit.passive.drain) foe.nei = Math.max(0, foe.nei - damage * unit.passive.drain);
    if (foe.passive.reflect && !foe.down) {
      const back = Math.round(damage * foe.passive.reflect);
      unit.hp -= back;
      foe.dealt += back;
      if (unit.hp <= 0) (unit.hp = 0), (unit.down = true), battle.events.push({ type: 'down', time: battle.time, id: unit.id, by: foe.id });
    }
    battle.events.push({ type: 'hit', time: battle.time, from: unit.id, to: foe.id, move: move.name, art: art?.name, damage, crit, flank, counter });
    if (foe.hp <= 0) {
      foe.hp = 0;
      foe.down = true;
      battle.events.push({ type: 'down', time: battle.time, id: foe.id, by: unit.id });
    }
  }

  function update(dt = RULES.step) {
    if (battle.done) return;
    battle.time += dt;
    for (const unit of units) {
      if (unit.down || unit.fled) continue;
      const regen = RULES.regen + unit.regenBonus;
      if (unit.passive.mend) unit.hp = Math.min(unit.hpMax, unit.hp + unit.hpMax * unit.passive.mend * dt);
      if (unit.passive.heal) {
        unit.healWait -= dt;
        if (unit.healWait <= 0) {
          unit.healWait = 3;
          // Tend whoever on the side is worst hurt.
          const hurt = battle.alive(unit.side).sort((a, b) => a.hp / a.hpMax - b.hp / b.hpMax)[0];
          if (hurt && hurt.hp < hurt.hpMax) {
            const amount = Math.min(hurt.hpMax - hurt.hp, unit.hpMax * unit.passive.heal);
            hurt.hp += amount;
            unit.healed += amount;
            battle.events.push({ type: 'heal', time: battle.time, from: unit.id, to: hurt.id, amount: Math.round(amount) });
          }
        }
      }
      unit.nei = Math.min(unit.neiMax, unit.nei + unit.neiMax * regen * dt);
      unit.stamina = Math.min(unit.staminaMax, unit.stamina + unit.staminaMax * regen * dt);
      if (unit.poison > 0) {
        unit.poison -= dt;
        unit.hp -= unit.hpMax * RULES.poisonShare * dt;
        if (unit.hp <= 0) (unit.hp = 0), (unit.down = true), battle.events.push({ type: 'down', time: battle.time, id: unit.id, by: null });
        if (unit.down) continue;
      }
      // A side that was told to break off runs for its own edge of the field.
      if (battle.orders[unit.side].retreat) {
        unit.x += (unit.side === 0 ? -1 : 1) * unit.speed * dt;
        if (unit.x < 0 || unit.x > RULES.width) (unit.fled = true), battle.events.push({ type: 'fled', time: battle.time, id: unit.id });
        continue;
      }
      const foe = (unit.target = pickTarget(unit));
      if (!foe) continue;
      const dx = foe.x - unit.x,
        dy = foe.y - unit.y,
        distance = Math.hypot(dx, dy);
      unit.wait -= dt;
      if (distance > unit.range) {
        const stride = Math.min(unit.speed * dt, distance - unit.range * 0.9);
        unit.x += (dx / distance) * stride;
        unit.y += (dy / distance) * stride;
        unit.facing = Math.atan2(dy, dx);
      } else if (unit.wait <= 0) {
        strike(unit, foe);
        unit.wait = unit.interval * (unit.hp < unit.hpMax * RULES.faint ? RULES.faintSlow : 1);
      }
    }
    const left = [battle.alive(0).length, battle.alive(1).length];
    if (!left[0] || !left[1] || battle.time >= RULES.timeLimit) {
      battle.done = true;
      if (left[0] && left[1]) {
        const health = [0, 1].map((side) => battle.alive(side).reduce((sum, unit) => sum + unit.hp, 0));
        battle.winner = health[0] === health[1] ? -1 : health[0] > health[1] ? 0 : 1;
      } else battle.winner = left[0] ? 0 : left[1] ? 1 : -1;
      // A side that ran has lost even if some of it got away.
      for (const side of [0, 1]) if (battle.orders[side].retreat) battle.winner = 1 - side;
      battle.events.push({ type: 'end', time: battle.time, winner: battle.winner });
    }
  }
  return battle;
}

/** Runs a fight to its end and reports it. */
export function resolveBattle(options) {
  const battle = createBattle(options);
  while (!battle.done) battle.update();
  return summarize(battle);
}

/** The outcome of a finished fight, per fighter. */
export function summarize(battle) {
  return {
    winner: battle.winner,
    time: battle.time,
    fighters: battle.units.map((unit) => ({
      id: unit.id,
      side: unit.side,
      down: unit.down,
      fled: unit.fled,
      hpLeft: unit.hp / unit.hpMax,
      dealt: unit.dealt,
      /** Experience: one point per point of damage dealt. */
      xp: Math.round(unit.dealt + unit.healed * 0.5),
    })),
  };
}

/** Depth of the inner art shows as a calmer fighter; exported for the view's aura. */
export const auraOf = (person) => innerDepth(person);
