// How a man fights when the keys are not his: one brain per man, reading the fight and answering with the same
// input a player gives. Each regiment keeps its own distance and habits; `level` (0 easy … 1 hard) sets how soon
// he sees a blow coming, how often he reads its line, how often he feints and how cleverly he uses his skills.
//
// A brain sees a blow only after its reaction time has passed since the other man began it, and then guards the
// right line with the chance its level gives. Two brains on the same side share a turn to press in, so that two
// against one come in one after the other, the second circling or shooting meanwhile.
//
// A rider fights in passes: he rides at a point just beside his man, sweeps the ji at the side he is on, rides on,
// wheels round and comes again; with his rage full he couches the ji and passes with his man on the horse's right,
// where the couched point is. When his horse is nearly spent he gets down and fights on foot. A man on foot
// sidesteps a charge and keeps close to a rider, inside the sweep.

import { ARTS, REGIMENTS, SKILLS } from './regiments.mjs';
import { BODY, TICK, aimAt, enemiesOf, facing } from './fight.mjs';

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
  let shieldPattern;

  function threatFrom(game, target) {
    const act = target.act;
    if (!act) return null;
    if (act.kind === 'swing' && !act.struck) {
      const reach = act.reach + BODY + 0.4;
      // After two contacts on the same line, a lone shield fighter can start his usual
      // defence a little earlier. He still waits for the player to commit to that line.
      const repeated = !act.awaitingRelease && act.line !== 'O' && shieldPattern?.line === act.line &&
        shieldPattern.count >= 2 && game.time - shieldPattern.time < 2;
      const reaction = repeated ? Math.min(brain.react, Math.max(0.2, act.wind - 3 * TICK)) : brain.react;
      if (act.t >= reaction && dist(man, target) <= reach) return { line: act.line, act, soon: act.wind - act.t };
    }
    if (act.kind === 'kick' && act.t >= brain.react * 0.8 && dist(man, target) < 1.8) return { kick: true, act };
    if (act.kind === 'lance' && act.t >= brain.react * 0.6 && dist(man, target) < 9) {
      const off = Math.abs(wrap(bearing(target, man) - target.horse.face));
      if (off < 1.2) return { lance: true, act };
    }
    if (act.kind === 'skill' && act.t >= brain.react && dist(man, target) < 3.6 && !['shout', 'mist', 'web', 'gale', 'fan', 'blast', 'backStep'].includes(act.id))
      return { line: ['flowers', 'boar', 'bull', 'charge'].includes(act.id) ? 'T' : ['down', 'leap', 'drop'].includes(act.id) ? 'O' : 'R', act, skill: act.id };
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
      const open = target.stun > 0 || target.daze > 0 || target.act?.kind === 'recover' || (target.act?.kind === 'swing' && target.act.struck);
      const chance = 0.35 + 0.5 * brain.level;
      let want = false;
      switch (id) {
        case 'charge': want = d > 3 && d < 6.5; break;
        case 'counter': want = threat?.line && !threat.kick && d < 3; break;
        case 'bull': want = d > 3.5 && d < 7.5 && (target.mounted || !target.guard || rng() < 0.3); break;
        case 'turning': want = others >= 2 || (d < 2.3 && open); break;
        case 'moon': want = d < 2.7 && (open || !target.guard); break;
        case 'swing': want = d < 2.0 && (open || !target.guard); break;
        case 'spin': want = d < 2.3 && (others >= 2 || open || !target.guard); break;
        case 'mist': want = d < 3.6; break;
        case 'whirl': want = d < 2.4 && (others >= 2 || !target.guard); break;
        case 'wave': want = d > 4.5 && d < 12; break;
        case 'down': want = d < 2.6 && (open || target.st < 35); break;
        case 'leap': want = d > 3.6 && d < 7; break;
        case 'shout': want = man.hp < man.maxHp * 0.7; break;
        case 'stepCut': want = d > 2.0 && d < 4.4 && (open || !target.guard); break;
        case 'flowers': want = d > 1.8 && d < 3.3 && !target.guard; break;
        case 'boar': want = d > 3.8 && d < 8; break;
        case 'drop': want = d > 1.5 && d < 4.4 && (target.moving > 1.6 || open); break;
        case 'gale': want = d > 6; break;
        // The spread hits hardest close in.
        case 'fan': want = d < 9; break;
        case 'backStep': want = d < 3.2; break;
        case 'blast': want = d > 4.5 && d < 16; break;
        case 'web': want = d < 7.5 && target.moving > 1.2 && !target.slow.length; break;
      }
      if (want && rng() < chance * 0.12) return slot;
    }
    return -1;
  }

  /** Which weapon art (X `main` or Z `off`) is worth it now, if any. */
  function chooseArt(game, target, d) {
    const open = target.stun > 0 || target.daze > 0 || target.act?.kind === 'recover';
    for (const [which, id] of [['main', man.r.art], ['off', man.r.offArt]]) {
      const a = ARTS[id];
      if (!a || a.mounted || (man.artCool[id] ?? 0) > 0 || man.rage < a.rage) continue;
      let want = false;
      switch (id) {
        case 'finisher': want = d < 2.6 && (open || target.hp < target.maxHp * 0.3 || !target.guard); break;
        case 'shieldSlam': want = d < 1.9; break;
        case 'axeSmash':
        case 'poleAxeSmash': want = d < a.reach + 0.3 && (open || !target.guard); break;
        case 'volley': want = d > 3.5 && !man.draw; break;
      }
      if (want && rng() < (0.35 + 0.5 * brain.level) * 0.1) return which;
    }
    return null;
  }

  /** Steering a horse at a point: where to put the stick. */
  function steer(at) {
    const dx = at[0] - man.x,
      dz = at[1] - man.z,
      l = Math.hypot(dx, dz) || 1;
    return [dx / l, dz / l];
  }

  /** A rider's feet and blows: passes at his man, the couched charge, and getting down when the horse is spent. */
  function ride(game, dt, input, target, d, toward) {
    const h = man.horse;
    if (h.hp < h.maxHp * 0.3 && (!man.act || man.act.kind === 'recover') && d > 4) {
      input.mount = !man.prev.mount;
      return;
    }
    const pass = (brain.pass ??= { phase: 'in', t: 0, side: rng() < 0.5 ? 1 : -1, out: 1.2 });
    pass.t += dt;
    const off = wrap(toward - h.face);
    // With the ji couched (or rage full to couch it), pass with him on the right, where the point is.
    const couching = man.act?.kind === 'lance' || (ARTS[man.r.mountedArt] && (man.artCool[man.r.mountedArt] ?? 0) <= 0);
    if (couching && pass.phase === 'in') pass.side = 1;
    if (pass.phase === 'in' && (d < 1.9 || (Math.abs(off) > 1.5 && d < 6) || pass.t > 9)) Object.assign(pass, { phase: 'out', t: 0, out: 1.0 + rng() * 0.9 });
    else if (pass.phase === 'out' && pass.t > pass.out && (d > 7 || pass.t > pass.out + 2.5)) Object.assign(pass, { phase: 'in', t: 0, side: rng() < 0.6 ? -pass.side : pass.side });
    let at;
    if (pass.phase === 'in') {
      // A point beside him, so the ji passes over him and the horse does not run into him.
      const lateral = (couching ? 1.7 : Math.min(1.6, d * 0.25)) * pass.side;
      at = [target.x + Math.cos(toward) * lateral, target.z - Math.sin(toward) * lateral];
    } else at = [man.x + Math.sin(h.face) * 6, man.z + Math.cos(h.face) * 6];
    // Wheel away from the edge of the field.
    const r = Math.hypot(man.x, man.z),
      room = game.place.radius - 4;
    if (r > room) at = [at[0] - (man.x / r) * 8, at[1] - (man.z / r) * 8];
    input.move = steer(at);
    input.sprint = h.st > 18 && ((pass.phase === 'in' && d > 4) || (pass.phase === 'out' && pass.t < 0.5));
    input.face = toward;
    // The couched ji (X), when his rage is full and he is lined up and moving.
    if (couching && !man.act && pass.phase === 'in' && d > 4.5 && d < 15 && Math.abs(off) < 0.45 && h.speed > ARTS[man.r.mountedArt].run && rng() < 0.06 + 0.1 * brain.level) {
      input.art = !man.prev.art;
      return;
    }
    if (man.act?.kind === 'lance') return;
    // A sweep at the side he is on, as he comes by.
    const reach = man.r.mounted.L.reach + (target.body ?? BODY);
    if ((!man.act || man.act.kind === 'recover') && man.stun <= 0 && !input.guard && d < reach * 0.95 && man.st > 14 && rng() < 0.25 + 0.3 * brain.level) {
      const side = wrap(toward - man.face);
      input.line = Math.abs(side) < 0.35 ? (rng() < 0.5 ? 'T' : 'O') : side > 0 ? 'L' : 'R';
      input.attack = true;
      brain.swingHold = rng() < 0.3 ? 0.3 : 0;
    }
  }

  function think(game, dt) {
    const input = { move: [0, 0], face: man.face, sprint: false, attack: false, guard: false, kick: false, step: false,
      skill: -1, art: false, line: man.line, swap: false, mount: false, readableAttack: man.side === 'foe' };
    if (!man.alive) return input;
    const foes = enemiesOf(game, man);
    if (!foes.length) return input;
    // The nearest, though a brain keeps to its man unless another comes much closer.
    let target = foes.find((t) => t.id === brain.target);
    const nearest = foes.reduce((a, b) => (dist(man, a) <= dist(man, b) ? a : b));
    if (!target || dist(man, nearest) < dist(man, target) - 2) target = nearest;
    // While a rider is out on his pass, go for the bowman instead.
    const bowman = foes.find((t) => t.regiment === 'archer' && !t.knife);
    if (target.mounted && bowman && dist(man, target) > 5 && dist(man, bowman) < 16 && !man.mounted) target = bowman;
    brain.target = target.id;
    const d = dist(man, target);
    const toward = bearing(man, target);
    input.face = toward;
    const bow = man.regiment === 'archer';
    if (man.regiment === 'yulin' && man.side === 'foe' && level >= 0.5 && game.men.length === 2 && target === game.hero) {
      const contact = game.events.find(e => e.by === target.id && e.who === man.id && e.line &&
        !e.skill && !e.kick && !e.arrow && (e.type === 'hit' || e.type === 'block' || e.type === 'deflect'));
      if (contact && contact.time !== shieldPattern?.time) {
        const continues = shieldPattern?.line === contact.line && contact.time - shieldPattern.time < 2;
        shieldPattern = { line: contact.line, time: contact.time, count: continues ? shieldPattern.count + 1 : 1 };
      }
    }
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
    // Against a rider, keep inside the sweep of his ji, close to the horse.
    if (target.mounted && !bow) range = 1.6;
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
          const ready = man.r.bow.draw * (0.9 + 0.2 * brain.level);
          input.attack = man.draw.t < ready;
        } else {
          // Between arrows he breathes and looks; with a friend at the man already, he waits longer.
          // With a friend in the fight he shoots less often (a man alone against two must have a chance), less again
          // when the friend is at the man already.
          const friends = game.men.filter((m) => m.alive && m.side === man.side && m !== man);
          const friendClose = friends.some((m) => Math.hypot(m.x - target.x, m.z - target.z) < 2.6);
          if (game.time >= (brain.nextShot ?? 0) && d > 2.2 && !cornered && man.st > 15) {
            input.attack = true;
            brain.nextShot = game.time + (friendClose ? 2.6 + rng() * 2 : friends.length ? 1.6 + rng() * 1.4 : 0.5 + rng() * 0.9) * (1.2 - brain.level * 0.4);
          }
        }
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
        else if (threat.lance) brain.answer = rng() < 0.45 + 0.45 * brain.level ? 'step' : 'guard';
        else if (rolled < habit.step * 0.35 * (0.5 + brain.level)) brain.answer = 'step';
        else if (rolled > Math.min(0.97, brain.read * habit.guard + 0.05)) brain.answer = 'wrong';
        if (target.act?.held > 0.2 && rng() < 0.4) brain.answer = 'step';
        brain.guardLine = threat.lance ? 'T' : brain.answer === 'wrong' ? ['L', 'R', 'O', 'T'].filter((l) => l !== facing(threat.line))[Math.floor(rng() * 3)] : facing(threat.line);
      }
      if (brain.answer === 'guard' || brain.answer === 'wrong') {
        input.guard = true;
        input.line = brain.guardLine;
        brain.guardUntil = game.time + 0.35;
      } else if (brain.answer === 'step') {
        // Out of the way of a charge sideways; back and aside from a blow.
        const wait = threat.lance && dist(man, target) > 4.5;
        input.step = !wait && !man.prev.step;
        const away = threat.lance ? wrap(toward + Math.PI / 2 * (brain.side || 1)) : wrap(toward + Math.PI + (rng() < 0.5 ? 0.9 : -0.9));
        input.move = [Math.sin(away), Math.cos(away)];
      }
    } else if (threat && bow && target.mounted) {
      // A bow cannot guard a horseman's sweep: once in a while, step aside from it.
      if (brain.seen !== threat.act) {
        brain.seen = threat.act;
        brain.answer = rng() < 0.3 + 0.45 * brain.level ? 'step' : 'none';
      }
      if (brain.answer === 'step' && man.st > 12) {
        input.step = !man.prev.step;
        const away = wrap(toward + (Math.PI / 2) * (brain.side || 1));
        input.move = [Math.sin(away), Math.cos(away)];
        brain.answer = 'none';
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

    // Dazed, he cannot guard: get out of reach until it passes.
    if (man.daze > 0 && !man.mounted) {
      input.guard = false;
      const away = wrap(toward + Math.PI + 0.7 * brain.side);
      input.move = [Math.sin(away), Math.cos(away)];
      input.sprint = man.st > 10;
      return input;
    }

    // ---- punishing an opening, after a guard or a deflection ----------------------------------------------
    for (const e of game.events) {
      if ((e.type === 'block' || e.type === 'deflect') && e.who === man.id) brain.punish = 0.45;
      if (e.type === 'break' && e.by === man.id) brain.punish = 0.6;
    }
    brain.punish = Math.max(0, brain.punish - dt);

    // ---- skills --------------------------------------------------------------------------------------------
    const free = !man.act || man.act.kind === 'recover';
    if (free && man.stun <= 0 && !man.draw && !man.mounted) {
      const slot = chooseSkill(game, target, d, threat);
      if (slot >= 0 && (holding || bow)) {
        input.skill = slot;
        input.guard = false;
      } else if (holding || bow) {
        const which = chooseArt(game, target, d);
        if (which === 'main' && !man.prev.art) input.art = true;
        if (which === 'off' && !man.prev.offArt) input.offArt = true;
        if (which) input.guard = false;
      }
    }

    // ---- blows ---------------------------------------------------------------------------------------------
    const habit = HABITS[man.regiment];
    const swing = man.act?.kind === 'swing' ? man.act : null;
    const melee = !bow || man.knife;
    if (man.mounted && !swing) {
      ride(game, dt, input, target, d, toward);
      return input;
    }
    if (man.mounted && swing) {
      ride(game, dt, input, target, d, toward);
      if (!swing.struck) input.attack = swing.held < brain.swingHold;
      input.skill = -1;
      return input;
    }
    if (melee && swing) {
      // Holding for a heavy blow, or letting go; a feint now and then.
      if (!swing.struck && swing.t < swing.wind * 0.6 && brain.feintAt === swing && !input.guard) {
        if (swing.t > swing.wind * 0.35) input.guard = true;
      } else if (!swing.struck) input.attack = swing.held < brain.swingHold;
    } else if (melee && free && man.stun <= 0 && input.skill < 0 && !input.guard && !input.step && holding) {
      const reach = man.r.blows.T.reach + (target.body ?? BODY);
      // A rider closes fast: strike where he will be when the blade comes down.
      const closing = target.mounted ? Math.max(0, -((target.x - man.x) * target.vx + (target.z - man.z) * target.vz) / Math.max(d, 0.1)) : 0;
      const inReach = d - closing * man.r.blows.R.wind < reach * 0.98;
      const keen = brain.punish > 0 || target.stun > 0 || target.daze > 0 || target.act?.kind === 'recover' || target.mounted;
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
      // Against a rider: no running after a horse; stand, let him come, and get off his line when he comes fast.
      if (target.mounted) {
        ahead = d > 5 ? 0.25 : d < 2 ? -0.3 : 0;
        strafe *= 0.4;
        if (target.horse.speed > 4 && d < 9 && Math.abs(wrap(bearing(target, man) - target.horse.face)) < 0.5) strafe = brain.side;
      }
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
      input.sprint = (gap > 4.5 || (target.regiment === 'archer' && !target.knife && gap > 0.3)) && man.st > 8 && !bow && !input.guard && !target.mounted;
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
