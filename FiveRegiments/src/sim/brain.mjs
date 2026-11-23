// How a man fights when the keys are not his: one brain per man, reading the fight and answering with the same
// input a player gives. Each regiment keeps its own distance and habits; `level` (0 easy … 1 hard) sets how soon
// he sees a blow coming, how often he reads its line, how often he feints and how cleverly he uses his skills.
//
// A brain sees a blow only after its reaction time has passed since the other man began it, and then guards the
// right line with the chance its level gives. Two brains on the same side share a turn to press in, so that two
// against one come in one after the other, the second circling or shooting meanwhile.

import { REGIMENTS, SKILLS } from './regiments.mjs';
import { BODY, aimAt, enemiesOf, facing } from './fight.mjs';

const HABITS = {
  yulin: { range: 1.75, press: 0.7, guard: 1.1, kick: 0.5, heavy: 0.2, step: 0.15 },
  tiger: { range: 1.55, press: 0.95, guard: 0.8, kick: 0.25, heavy: 0.15, step: 0.45 },
  vanguard: { range: 2.25, press: 0.8, guard: 0.75, kick: 0.35, heavy: 0.45, step: 0.15 },
  plume: { range: 2.75, press: 0.7, guard: 0.85, kick: 0.3, heavy: 0.25, step: 0.35 },
  archer: { range: 10, press: 0.4, guard: 0.6, kick: 0.6, heavy: 0, step: 0.5 }
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const bearing = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createBrain(man, { level = 0.5, rng = Math.random } = {}) {
  const habit = HABITS[man.regiment];
  const brain = {
    level,
    react: 0.42 - 0.24 * level,
    read: 0.45 + 0.45 * level,
    feint: 0.04 + 0.14 * level,
    side: rng() < 0.5 ? 1 : -1,
    sideTime: 0,
    pressing: 0,
    seen: null,
    guardUntil: 0,
    swingHold: 0,
    swingOn: false,
    feintAt: -1,
    punish: 0,
    lastEvents: 0,
    think
  };

  function threatFrom(game, target) {
    const act = target.act;
    if (!act) return null;
    if (act.kind === 'swing' && !act.struck && act.t >= brain.react) {
      const reach = act.reach + BODY + 0.4;
      if (dist(man, target) <= reach) return { line: act.line, act, soon: act.wind - act.t };
    }
    if (act.kind === 'kick' && act.t >= brain.react * 0.8 && dist(man, target) < 1.8) return { kick: true, act };
    if (act.kind === 'skill' && act.t >= brain.react && dist(man, target) < 3.6 && !['shout', 'mist', 'web', 'gale', 'fan', 'blast', 'backStep'].includes(act.id))
      return { line: act.id === 'flowers' || act.id === 'boar' || act.id === 'bull' ? 'T' : act.id === 'down' || act.id === 'leap' || act.id === 'drop' ? 'O' : 'R', act, skill: act.id };
    return null;
  }

  /** Which skill slot is worth using now, or -1. */
  function chooseSkill(game, target, d, threat) {
    for (let slot = 0; slot < man.skills.length; slot++) {
      if (man.cool[slot] > 0) continue;
      const id = man.skills[slot],
        s = SKILLS[id];
      if (man.st < s.cost * 0.6) continue;
      const others = enemiesOf(game, man).filter((t) => dist(man, t) < 2.6).length;
      const open = target.stun > 0 || target.act?.kind === 'recover' || (target.act?.kind === 'swing' && target.act.struck);
      const chance = 0.35 + 0.5 * brain.level;
      let want = false;
      switch (id) {
        case 'counter': want = threat?.line && !threat.kick && d < 3; break;
        case 'bull': want = d > 3.5 && d < 7.5 && !target.guard; break;
        case 'turning': want = others >= 2 || (d < 2.3 && open); break;
        case 'moon': want = d < 2.7 && (open || !target.guard); break;
        case 'swing': want = d < 2.0 && (open || !target.guard); break;
        case 'spin': want = d > 1.6 && d < 3.8 && rng() < 0.4; break;
        case 'mist': want = d < 3.6; break;
        case 'whirl': want = d < 2.4 && (others >= 2 || !target.guard); break;
        case 'wave': want = d > 4.5 && d < 12; break;
        case 'down': want = d < 2.6 && (open || target.st < 35); break;
        case 'leap': want = d > 3.6 && d < 7; break;
        case 'shout': want = man.hp < man.maxHp * 0.7; break;
        case 'flowers': want = d > 1.8 && d < 3.3 && !target.guard; break;
        case 'boar': want = d > 3.8 && d < 8; break;
        case 'drop': want = d > 1.5 && d < 4.4 && (target.moving > 1.6 || open); break;
        case 'gale': want = d > 6; break;
        case 'fan': want = d > 3 && d < 9; break;
        case 'backStep': want = d < 3.2; break;
        case 'blast': want = d > 4.5 && d < 16; break;
        case 'web': want = d < 7.5 && target.moving > 1.2 && !target.slow.length; break;
      }
      if (want && rng() < chance * 0.12) return slot;
    }
    return -1;
  }

  function think(game, dt) {
    const input = { move: [0, 0], face: man.face, sprint: false, attack: false, guard: false, kick: false, step: false, skill: -1, line: man.line, swap: false };
    if (!man.alive) return input;
    const foes = enemiesOf(game, man);
    if (!foes.length) return input;
    // The nearest, though a brain keeps to its man unless another comes much closer.
    let target = foes.find((t) => t.id === brain.target);
    const nearest = foes.reduce((a, b) => (dist(man, a) <= dist(man, b) ? a : b));
    if (!target || dist(man, nearest) < dist(man, target) - 2) target = nearest;
    brain.target = target.id;
    const d = dist(man, target);
    const toward = bearing(man, target);
    input.face = toward;
    const bow = man.regiment === 'archer';
    const threat = threatFrom(game, target);

    // Shared turns: on a side with two, only the one holding the turn presses in; the other circles.
    const allies = game.men.filter((m) => m.alive && m.side === man.side && m !== man && m.regiment !== 'archer');
    if (allies.length && !bow) {
      if (!game.token || !game.men.find((m) => m.id === game.token && m.alive) || game.time - game.tokenTime > 5 + rng() * 2.5) {
        const pool = [man, ...allies];
        game.token = pool[Math.floor(rng() * pool.length)].id;
        game.tokenTime = game.time;
      }
    }
    const holding = !allies.length || bow || game.token === man.id;
    let range = HABITS[man.regiment].range;
    // Against a longer weapon, get inside it rather than trade at its length.
    if (!bow && target.regiment !== 'archer') range = Math.min(range, HABITS[target.regiment].range - 0.5);
    if (!holding) range = 4.8;
    if (bow && man.knife) range = 1.4;

    // ---- the archer: keep away and shoot; draw the knife only when cornered --------------------------
    if (bow) {
      const cornered = d < 2.4 && man.cool.every((c) => c > 0 || true);
      if (!man.knife && d < 2.0 && rng() < 0.03 + 0.04 * brain.level && !man.skills.some((id, i) => (id === 'backStep' || id === 'web') && man.cool[i] <= 0)) input.swap = true;
      if (man.knife && d > 4.5) input.swap = true;
      if (!man.knife) {
        const speed = man.r.bow.speed;
        const aim = aimAt(man, target, speed);
        const err = (1 - brain.level) * 0.06 + 0.03;
        input.aim = { yaw: aim.yaw + (rng() - 0.5) * err, pitch: aim.pitch + (rng() - 0.5) * err * 0.4 };
        input.face = aim.yaw;
        if (man.draw) {
          const ready = man.r.bow.draw * (man.talents.has('pearls') ? 0.75 : 1) * (0.9 + 0.2 * brain.level);
          input.attack = man.draw.t < ready;
        } else input.attack = d > 2.2 && !cornered && man.st > 15 && rng() < 0.2;
      }
    }

    // ---- guarding what is coming -------------------------------------------------------------------------
    if (threat && !(bow && !man.knife)) {
      if (brain.seen !== threat.act) {
        brain.seen = threat.act;
        const habit = HABITS[man.regiment];
        const rolled = rng();
        brain.answer = 'guard';
        if (threat.kick) brain.answer = rng() < 0.35 * brain.level ? 'step' : 'none';
        else if (rolled < habit.step * 0.35 * (0.5 + brain.level)) brain.answer = 'step';
        else if (rolled > Math.min(0.97, brain.read * habit.guard + 0.05)) brain.answer = 'wrong';
        if (target.act?.held > 0.2 && rng() < 0.4) brain.answer = 'step';
        brain.guardLine = brain.answer === 'wrong' ? ['L', 'R', 'O', 'T'].filter((l) => l !== facing(threat.line))[Math.floor(rng() * 3)] : facing(threat.line);
      }
      if (brain.answer === 'guard' || brain.answer === 'wrong') {
        input.guard = true;
        input.line = brain.guardLine;
        brain.guardUntil = game.time + 0.35;
      } else if (brain.answer === 'step') {
        input.step = !man.prev.step;
        const away = wrap(toward + Math.PI + (rng() < 0.5 ? 0.9 : -0.9));
        input.move = [Math.sin(away), Math.cos(away)];
      }
    } else if (game.time < brain.guardUntil) {
      input.guard = true;
      input.line = brain.guardLine ?? man.line;
    }
    // Against an archer, a shield is carried up while walking in, and kept up while the arrow flies.
    if (game.events.some((e) => e.type === 'loose' && e.who === target.id)) brain.shieldUntil = game.time + 0.5;
    if (man.r.offhand === 'shield' && (target.draw || game.time < (brain.shieldUntil ?? 0)) && d > 3) {
      input.guard = true;
      input.line = 'T';
    }

    // ---- punishing an opening, after a guard or a deflection ----------------------------------------------
    for (const e of game.events) {
      if ((e.type === 'block' || e.type === 'deflect') && e.who === man.id) brain.punish = 0.45;
      if (e.type === 'break' && e.by === man.id) brain.punish = 0.6;
    }
    brain.punish = Math.max(0, brain.punish - dt);

    // ---- skills --------------------------------------------------------------------------------------------
    const free = !man.act || man.act.kind === 'recover';
    if (free && man.stun <= 0 && !man.draw) {
      const slot = chooseSkill(game, target, d, threat);
      if (slot >= 0 && (holding || bow)) {
        input.skill = slot;
        input.guard = false;
      }
    }

    // ---- blows ---------------------------------------------------------------------------------------------
    const habit = HABITS[man.regiment];
    const swing = man.act?.kind === 'swing' ? man.act : null;
    const melee = !bow || man.knife;
    if (melee && swing) {
      // Holding for a heavy blow, or letting go; a feint now and then.
      if (!swing.struck && swing.t < swing.wind * 0.6 && brain.feintAt === swing && !input.guard) {
        if (swing.t > swing.wind * 0.35) input.guard = true;
      } else if (!swing.struck) input.attack = swing.t < swing.wind || swing.held < brain.swingHold;
    } else if (melee && free && man.stun <= 0 && input.skill < 0 && !input.guard && !input.step && holding) {
      const reach = man.r.blows.T.reach + BODY;
      const inReach = d < reach * 0.98;
      const keen = brain.punish > 0 || target.stun > 0 || target.act?.kind === 'recover';
      const appetite = (keen ? 0.5 : 0.06 + 0.1 * habit.press) * (man.st > 22 ? 1 : 0.15);
      if (inReach && rng() < appetite) {
        // Pick a line he is not guarding, if the guard is read.
        let lines = ['L', 'R', 'O', 'T'];
        if (target.guard && rng() < brain.read) {
          const covered = new Set([target.guardLine, ...(target.r.shield?.lines ?? [])]);
          lines = lines.filter((l) => !covered.has(facing(l)));
          if (!lines.length || (target.r.shield && rng() < habit.kick)) lines = [];
        }
        if (!lines.length || (target.guard && game.time - target.guardAt > 0.45 && rng() < habit.kick * 0.5)) {
          if (d < 1.5) input.kick = true;
          else input.move = [Math.sin(toward), Math.cos(toward)];
        } else {
          input.line = lines[Math.floor(rng() * lines.length)];
          input.attack = true;
          brain.swingHold = keen && rng() < habit.heavy * 1.6 ? 0.4 + rng() * 0.4 : rng() < habit.heavy * 0.4 ? 0.3 : 0;
          brain.feintAt = null;
          if (!keen && rng() < brain.feint) brain.feintAt = 'next';
        }
      }
    }
    if (brain.feintAt === 'next' && man.act?.kind === 'swing') brain.feintAt = man.act;

    // ---- feet: keep his distance, circle, back off to breathe ----------------------------------------------
    if (!input.step && man.stun <= 0) {
      brain.sideTime -= dt;
      if (brain.sideTime <= 0) {
        brain.side = rng() < 0.5 ? 1 : -1;
        brain.sideTime = 1.2 + rng() * 2;
      }
      // Tired, he backs off to get his breath, though not from a bow: there is no breathing room from arrows.
      const tired = man.st < 22 && !bow && !(target.regiment === 'archer' && !target.knife);
      const want = tired ? range + 2.2 : range;
      const gap = d - want;
      let ahead = Math.max(-1, Math.min(1, gap * 0.9));
      if (bow && !man.knife && d < want) ahead = -1;
      let strafe = (holding ? 0.45 : 0.9) * brain.side;
      // Walking in on a bow: zigzag, and throw in a side step as the string comes back.
      if (!bow && target.draw && d > 3) {
        if (brain.sideTime > 0.9) brain.sideTime = 0.5 + rng() * 0.5;
        strafe = (d > 5.5 ? 1.0 : 0.35) * brain.side;
        ahead = 1;
        const full = target.draw.t > target.r.bow.draw * 0.8;
        if (full && !brain.dodged && rng() < 0.05 + 0.1 * brain.level && man.st > 30) {
          brain.dodged = true;
          input.step = true;
          input.move = [Math.cos(toward) * brain.side, -Math.sin(toward) * brain.side];
        }
      } else brain.dodged = false;
      const dir = [Math.sin(toward) * ahead + Math.cos(toward) * strafe, Math.cos(toward) * ahead - Math.sin(toward) * strafe];
      // Stay off the edge of the field.
      const r = Math.hypot(man.x, man.z),
        edge = game.place.radius - 1.6;
      if (r > edge) {
        dir[0] -= (man.x / r) * 1.4;
        dir[1] -= (man.z / r) * 1.4;
      }
      const len = Math.hypot(dir[0], dir[1]);
      if (len > 0.05 && !(input.move[0] || input.move[1])) input.move = [dir[0] / Math.max(1, len), dir[1] / Math.max(1, len)];
      input.sprint = (gap > 4.5 || (target.regiment === 'archer' && !target.knife && gap > 0.3)) && man.st > 8 && !bow && !input.guard;
    }
    return input;
  }

  return brain;
}

/** Brains for every man on the field but the hero (or for him too, for trials). */
export function createBrains(game, { level = 0.5, hero = false, heroLevel = level, rng = game.rng } = {}) {
  const brains = {};
  for (const man of game.men) {
    if (man.side === 'hero' && !hero) continue;
    brains[man.id] = createBrain(man, { level: man.side === 'hero' ? heroLevel : level, rng });
  }
  return brains;
}

export { REGIMENTS };
