// The fight itself, with nothing drawn: the hero, the hired men, Lu Qian, what flies and what falls.
// `step(game, input, dt)` moves everything on by one tick and leaves what happened in `game.events`
// for the picture and the sound to answer.
import { BARS, PLACES, edge, settle } from './arena.mjs';
import { FOES, HERO, LOOT, PARTIES } from './tune.mjs';

const TAU = Math.PI * 2;
export const turnTo = (from, to) => {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};
const heading = (dx, dz) => Math.atan2(dx, dz);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** What the player asks for in one tick. Presses are true for the tick they happen in; holds while held. */
export const quiet = () => ({ mx: 0, mz: 0, ax: 0, az: 0, attack: false, guard: false, dodge: false, stars: false, rain: false, drink: false, glide: false });

function makeFoe(game, kind, x, z) {
  const sheet = FOES[kind];
  return {
    id: ++game.serial,
    kind,
    sheet,
    x,
    z,
    face: 0,
    hp: sheet.hp,
    maxHp: sheet.hp,
    state: 'wait', // wait, roam, windup, strike, recover, stagger, down, rage, dead
    t: 0,
    move: null,
    aim: { x: 0, z: 0 },
    lungeLeft: 0,
    freeze: 0,
    hits: 0,
    deflects: 0,
    count: 0,
    pause: 0.6 + game.rand() * 0.8,
    side: game.rand() < 0.5 ? -1 : 1,
    posture: 0,
    postureRest: 0,
    phase: 1,
    repeat: 0,
    shake: 0
  };
}

/** Put one more man on the ground, awake. */
export function spawn(game, kind, x, z) {
  const foe = makeFoe(game, kind, x, z);
  foe.state = 'roam';
  game.foes.push(foe);
  return foe;
}

export function createGame(seed = 7) {
  const game = {
    time: 0,
    serial: 0,
    rand: random(seed),
    stage: 'road', // road, yard, gate, boss, done
    party: -1,
    partyWait: 0,
    bars: { gate: true, court: false },
    checkpoint: 'camp',
    cine: 0,
    slow: 0,
    turn: 0, // which melee man may strike
    turnPause: 0,
    hero: null,
    foes: [],
    shots: [],
    drops: [],
    spears: [],
    events: [],
    bag: { coin: 0, silver: 0, salve: 0, tonic: 0, page: 0 },
    coins: 0,
    resting: false,
    deadFor: 0
  };
  game.hero = {
    x: PLACES.start.x,
    z: PLACES.start.z,
    face: Math.PI,
    hp: HERO.hp,
    stamina: HERO.stamina,
    staminaWait: 0,
    will: 0,
    gourd: HERO.gourd,
    power: 1,
    brisk: 0,
    state: 'free', // free, cut, dodge, guard, hurt, drink, stars, rain, riposte, glide, dead
    t: 0,
    cut: 0,
    comboFor: 0,
    queued: null,
    struck: false,
    lungeLeft: 0,
    target: null,
    vx: 0,
    vz: 0,
    freeze: 0,
    safe: 0,
    counter: 0,
    counterFoe: null,
    slipped: false,
    starsWait: 0,
    moving: false,
    drank: false
  };
  spawnParty(game, 0);
  const lu = makeFoe(game, 'lu', PLACES.court.x, PLACES.court.z - 3);
  lu.face = 0;
  game.foes.push(lu);
  game.boss = lu;
  return game;
}

function spawnParty(game, index) {
  game.party = index;
  for (const place of PARTIES[index]) {
    const foe = makeFoe(game, place.kind, place.x, place.z);
    foe.party = index;
    foe.face = heading(game.hero.x - foe.x, game.hero.z - foe.z);
    if (index > 0) foe.state = 'roam';
    game.foes.push(foe);
  }
}

const emit = (game, type, data = {}) => game.events.push({ type, ...data });
const bars = (game) => Object.keys(BARS).filter((key) => game.bars[key]).map((key) => BARS[key]);
const living = (game) => game.foes.filter((foe) => foe.state !== 'dead' && foe.state !== 'wait');

/** Start the chapter: the opening words, then the road. */
export function begin(game) {
  game.cine = 3.2;
  emit(game, 'cine', { id: 'open', time: 3.2 });
}

// ---- the hero -----------------------------------------------------------------------------

function gain(hero, will) {
  hero.will = clamp(hero.will + will, 0, HERO.will);
}
function spend(hero, amount) {
  hero.stamina = Math.max(0, hero.stamina - amount);
  hero.staminaWait = HERO.staminaDelay;
}
function enter(hero, state) {
  hero.state = state;
  hero.t = 0;
  hero.struck = false;
  hero.lungeLeft = 0;
  hero.target = null;
}

/** Pick whom a cut turns to: near the aim, and not far. */
function pickTarget(game, hero, aim) {
  let best = null,
    score = 1e9;
  for (const foe of living(game)) {
    const dx = foe.x - hero.x,
      dz = foe.z - hero.z,
      d = Math.hypot(dx, dz),
      off = Math.abs(turnTo(aim, heading(dx, dz)));
    if (d > HERO.snapReach || off > 1.25) continue;
    const s = d + off * 3.2;
    if (s < score) (score = s), (best = foe);
  }
  return best;
}

function startCut(game, hero, input) {
  const index = hero.comboFor > 0 ? (hero.cut + 1) % HERO.cuts.length : 0,
    cut = HERO.cuts[index];
  enter(hero, 'cut');
  hero.cut = index;
  hero.queued = null;
  const aim = input.ax || input.az ? heading(input.ax, input.az) : hero.face,
    target = pickTarget(game, hero, aim);
  hero.face = target ? heading(target.x - hero.x, target.z - hero.z) : aim;
  hero.target = target;
  hero.lungeLeft = cut.lunge;
  emit(game, 'swing', { cut: index, x: hero.x, z: hero.z, face: hero.face });
}

function startRiposte(game, hero) {
  const foe = hero.counterFoe;
  enter(hero, 'riposte');
  hero.counter = 0;
  hero.safe = HERO.riposte.time + 0.2;
  if (foe && foe.state !== 'dead') {
    // Step in to stand before him.
    const d = Math.hypot(foe.x - hero.x, foe.z - hero.z) || 1,
      stand = foe.sheet.radius + 1.9;
    hero.face = heading(foe.x - hero.x, foe.z - hero.z);
    const from = { x: hero.x, z: hero.z };
    hero.x = foe.x - ((foe.x - hero.x) / d) * stand;
    hero.z = foe.z - ((foe.z - hero.z) / d) * stand;
    settle(hero, HERO.radius, bars(game));
    emit(game, 'riposte', { x: hero.x, z: hero.z, fromX: from.x, fromZ: from.z, face: hero.face });
  } else emit(game, 'riposte', { x: hero.x, z: hero.z, fromX: hero.x, fromZ: hero.z, face: hero.face });
  hero.target = foe;
  game.slow = Math.max(game.slow, 0.28);
}

function startRain(game, hero) {
  enter(hero, 'rain');
  hero.will = 0;
  hero.safe = HERO.rain.time + 0.3;
  const rain = HERO.rain,
    foes = living(game);
  game.spears = [];
  for (let i = 0; i < rain.spears; i++) {
    const at = rain.from + ((rain.to - rain.from) * i) / (rain.spears - 1);
    let x, z;
    const near = foes.filter((foe) => Math.hypot(foe.x - hero.x, foe.z - hero.z) < rain.radius + 1);
    if (near.length && i % 3 !== 2) {
      const foe = near[i % near.length];
      x = foe.x + (game.rand() - 0.5) * 2.2;
      z = foe.z + (game.rand() - 0.5) * 2.2;
    } else {
      const a = game.rand() * TAU,
        r = Math.sqrt(game.rand()) * rain.radius;
      x = hero.x + Math.sin(a) * r;
      z = hero.z + Math.cos(a) * r;
    }
    game.spears.push({ at, x, z, lean: (game.rand() - 0.5) * 0.7, turn: game.rand() * TAU, done: false });
  }
  emit(game, 'rain', { x: hero.x, z: hero.z, spears: game.spears });
}

function heroCutHits(game, hero, cut, damage, riposte = false) {
  let any = false;
  for (const foe of living(game)) {
    const dx = foe.x - hero.x,
      dz = foe.z - hero.z,
      d = Math.hypot(dx, dz);
    if (d - foe.sheet.radius > cut.range) continue;
    if (d > 0.6 && Math.abs(turnTo(hero.face, heading(dx, dz))) > cut.arc / 2 + 0.25) continue;
    any = hurtFoe(game, foe, damage, { heavy: !!cut.heavy || riposte, push: cut.push, source: riposte ? 'riposte' : 'cut' }) || any;
  }
  // Arrows in the way of the blade are cut down.
  for (const shot of game.shots) {
    if (shot.from !== 'foe' || shot.dead) continue;
    const dx = shot.x - hero.x,
      dz = shot.z - hero.z;
    if (Math.hypot(dx, dz) < cut.range * 0.95 && Math.abs(turnTo(hero.face, heading(dx, dz))) < cut.arc / 2 + 0.35) {
      shot.dead = true;
      gain(hero, HERO.gains.cutArrow);
      emit(game, 'cutArrow', { x: shot.x, z: shot.z });
    }
  }
  return any;
}

function stepHero(game, input, dt) {
  const hero = game.hero;
  hero.safe = Math.max(0, hero.safe - dt);
  hero.counter = Math.max(0, hero.counter - dt);
  hero.comboFor = Math.max(0, hero.comboFor - dt);
  hero.starsWait = Math.max(0, hero.starsWait - dt);
  hero.brisk = Math.max(0, hero.brisk - dt);
  hero.moving = false;
  if (hero.state === 'dead') return;
  if (hero.freeze > 0) {
    // Held by the blow that just landed; what is pressed meanwhile is kept.
    hero.freeze -= dt;
    if (input.attack) hero.queued = 'cut';
    if (!input.dodge) return;
    hero.freeze = 0;
  }
  hero.staminaWait = Math.max(0, hero.staminaWait - dt);
  if (hero.staminaWait <= 0 && hero.state !== 'guard' && hero.state !== 'glide')
    hero.stamina = Math.min(HERO.stamina, hero.stamina + HERO.staminaRegen * (hero.brisk > 0 ? 1.8 : 1) * dt);

  const still = game.cine > 0,
    wish = Math.hypot(input.mx, input.mz),
    mx = wish > 1e-3 ? input.mx / wish : 0,
    mz = wish > 1e-3 ? input.mz / wish : 0;
  const busy = hero.state === 'hurt' || hero.state === 'rain' || hero.state === 'riposte';

  // A dodge breaks out of anything but being struck, the rain and the riposte.
  if (!still && input.dodge && !busy && hero.state !== 'dodge' && hero.stamina >= HERO.dodge.cost * 0.5) {
    spend(hero, HERO.dodge.cost);
    enter(hero, 'dodge');
    hero.slipped = false;
    const a = wish > 1e-3 ? heading(mx, mz) : hero.face;
    hero.vx = Math.sin(a) * HERO.dodge.speed;
    hero.vz = Math.cos(a) * HERO.dodge.speed;
    hero.face = a;
    emit(game, 'dodge', { x: hero.x, z: hero.z, face: a });
  }

  hero.t += dt;
  switch (hero.state) {
    case 'free':
    case 'guard':
    case 'glide': {
      if (still) {
        hero.state = 'free';
        break;
      }
      if (input.attack || hero.queued === 'cut') {
        if (hero.counter > 0) startRiposte(game, hero);
        else startCut(game, hero, input);
        break;
      }
      hero.queued = null;
      if (input.rain && hero.will >= HERO.will) return startRain(game, hero);
      if (input.stars && hero.starsWait <= 0) {
        enter(hero, 'stars');
        hero.starsWait = HERO.stars.cooldown;
        const aim = input.ax || input.az ? heading(input.ax, input.az) : hero.face,
          target = pickTarget(game, hero, aim);
        hero.face = target ? heading(target.x - hero.x, target.z - hero.z) : aim;
        emit(game, 'starsStart', { x: hero.x, z: hero.z, face: hero.face });
        break;
      }
      if (input.drink && hero.gourd > 0 && hero.hp < HERO.hp) {
        enter(hero, 'drink');
        hero.drank = false;
        emit(game, 'drinkStart', {});
        break;
      }
      if (input.guard && hero.stamina > 0) {
        if (hero.state !== 'guard') {
          enter(hero, 'guard');
          if (input.ax || input.az) hero.face = heading(input.ax, input.az);
          emit(game, 'guardUp', {});
        }
      } else if (input.glide && wish > 1e-3 && hero.stamina > 1) {
        if (hero.state !== 'glide') {
          enter(hero, 'glide');
          emit(game, 'glideStart', {});
        }
      } else if (hero.state !== 'free') hero.state = 'free';

      let speed = HERO.speed;
      if (hero.state === 'guard') speed *= 0.38;
      if (hero.state === 'glide') {
        speed = HERO.glide.speed;
        spend(hero, HERO.glide.cost * dt);
        if (hero.stamina <= 0) hero.state = 'free';
      }
      if (wish > 1e-3) {
        hero.x += mx * speed * dt;
        hero.z += mz * speed * dt;
        hero.moving = true;
        if (hero.state !== 'guard') hero.face += turnTo(hero.face, heading(mx, mz)) * Math.min(1, dt * 14);
      }
      if (hero.state === 'guard' && (input.ax || input.az)) hero.face += turnTo(hero.face, heading(input.ax, input.az)) * Math.min(1, dt * 10);
      break;
    }
    case 'cut': {
      const cut = HERO.cuts[hero.cut];
      if (input.attack && hero.t > 0.05) hero.queued = 'cut';
      // Slide in, but never past the man the cut is meant for.
      if (hero.t < cut.windup + cut.active && hero.lungeLeft > 0) {
        let go = Math.min(hero.lungeLeft, (cut.lunge / (cut.windup + cut.active)) * dt);
        const target = hero.target;
        if (target && target.state !== 'dead') {
          const d = Math.hypot(target.x - hero.x, target.z - hero.z);
          go = Math.min(go, Math.max(0, d - (target.sheet.radius + cut.range * 0.62)));
          hero.face = heading(target.x - hero.x, target.z - hero.z);
        }
        hero.x += Math.sin(hero.face) * go;
        hero.z += Math.cos(hero.face) * go;
        hero.lungeLeft -= go;
      }
      if (!hero.struck && hero.t >= cut.windup) {
        hero.struck = true;
        const hit = heroCutHits(game, hero, cut, cut.damage);
        emit(game, 'slash', { cut: hero.cut, x: hero.x, z: hero.z, face: hero.face, hit });
      }
      const end = cut.windup + cut.active + cut.recover;
      // The next cut may begin a little before this one has fully settled.
      if (hero.queued === 'cut' && hero.t >= end - cut.recover * 0.45) {
        hero.comboFor = hero.cut === HERO.cuts.length - 1 ? 0 : HERO.chain;
        startCut(game, hero, input);
      } else if (hero.t >= end) {
        hero.comboFor = hero.cut === HERO.cuts.length - 1 ? 0 : HERO.chain;
        hero.state = 'free';
      }
      break;
    }
    case 'riposte': {
      if (!hero.struck && hero.t >= HERO.riposte.strike) {
        hero.struck = true;
        const blow = { range: 4.6, arc: 1.1, heavy: true, push: 3.4 };
        heroCutHits(game, hero, blow, HERO.riposte.damage, true);
        emit(game, 'riposteHit', { x: hero.x, z: hero.z, face: hero.face });
      }
      if (hero.t >= HERO.riposte.time) hero.state = 'free';
      break;
    }
    case 'dodge': {
      const k = 1 - hero.t / HERO.dodge.time;
      hero.x += hero.vx * dt * (0.35 + k);
      hero.z += hero.vz * dt * (0.35 + k);
      if (hero.t >= HERO.dodge.time) hero.state = 'free';
      break;
    }
    case 'stars': {
      if (!hero.struck && hero.t >= HERO.stars.release) {
        hero.struck = true;
        for (const spread of [-0.2, 0, 0.2]) {
          const a = hero.face + spread;
          game.shots.push({
            from: 'hero',
            x: hero.x + Math.sin(a) * 1.2,
            z: hero.z + Math.cos(a) * 1.2,
            face: a,
            speed: HERO.stars.speed,
            damage: HERO.stars.damage,
            life: HERO.stars.life,
            id: ++game.serial
          });
        }
        emit(game, 'stars', { x: hero.x, z: hero.z, face: hero.face });
      }
      if (hero.t >= HERO.stars.time) hero.state = 'free';
      break;
    }
    case 'drink': {
      if (wish > 1e-3) {
        hero.x += mx * HERO.speed * 0.35 * dt;
        hero.z += mz * HERO.speed * 0.35 * dt;
        hero.moving = true;
      }
      if (!hero.drank && hero.t >= HERO.drink.at) {
        hero.drank = true;
        hero.gourd--;
        hero.hp = Math.min(HERO.hp, hero.hp + HERO.drink.heal);
        emit(game, 'drink', { x: hero.x, z: hero.z });
      }
      if (hero.t >= HERO.drink.time) hero.state = 'free';
      break;
    }
    case 'rain': {
      const rain = HERO.rain;
      for (const spear of game.spears) {
        if (spear.done || hero.t < spear.at) continue;
        spear.done = true;
        for (const foe of living(game))
          if (Math.hypot(foe.x - spear.x, foe.z - spear.z) < rain.spearRadius + foe.sheet.radius && game.time - (foe.rained ?? -1) > 0.28) {
            foe.rained = game.time;
            hurtFoe(game, foe, rain.damage, { push: 0.6, source: 'rain' });
          }
        emit(game, 'spear', { x: spear.x, z: spear.z });
      }
      if (!hero.struck && hero.t >= rain.burstAt) {
        hero.struck = true;
        for (const foe of living(game))
          if (Math.hypot(foe.x - hero.x, foe.z - hero.z) < rain.radius + foe.sheet.radius) hurtFoe(game, foe, rain.burst, { heavy: true, push: 3, source: 'rain' });
        emit(game, 'burst', { x: hero.x, z: hero.z });
      }
      if (hero.t >= rain.time) hero.state = 'free';
      break;
    }
    case 'hurt':
      hero.x += hero.vx * dt;
      hero.z += hero.vz * dt;
      hero.vx *= Math.exp(-9 * dt);
      hero.vz *= Math.exp(-9 * dt);
      if (hero.t >= hero.staggerFor) hero.state = 'free';
      break;
  }
  settle(hero, HERO.radius, bars(game));
}

/** A blow reaches the hero; what comes of it depends on what he is doing. */
function hurtHero(game, amount, from, move, foe) {
  const hero = game.hero;
  if (hero.state === 'dead' || game.cine > 0) return 'none';
  if (hero.state === 'dodge' && hero.t < HERO.dodge.safe) {
    if (!hero.slipped) {
      hero.slipped = true;
      hero.stamina = Math.min(HERO.stamina, hero.stamina + 25);
      gain(hero, HERO.gains.slip);
      game.slow = Math.max(game.slow, 0.35);
      emit(game, 'slip', { x: hero.x, z: hero.z });
    }
    return 'slip';
  }
  if (hero.safe > 0) return 'none';
  const toward = heading(from.x - hero.x, from.z - hero.z);
  if (hero.state === 'guard' && !move.unblockable && Math.abs(turnTo(hero.face, toward)) < HERO.guard.arc) {
    const parry = hero.t <= HERO.guard.parry;
    hero.counterFoe = foe ?? null;
    if (parry) {
      hero.counter = HERO.guard.counterParry;
      gain(hero, HERO.gains.parry);
      if (foe) {
        if (foe.kind === 'lu') {
          addPosture(game, foe, 26);
          if (foe.state !== 'down') stagger(foe, 0.75);
        } else stagger(foe, 1.6);
        foe.freeze = 0.12;
      }
      hero.freeze = 0.1;
      emit(game, 'parry', { x: hero.x, z: hero.z, face: hero.face });
      return 'parry';
    }
    spend(hero, amount * HERO.guard.cost);
    hero.counter = HERO.guard.counter;
    hero.freeze = 0.06;
    emit(game, 'block', { x: hero.x, z: hero.z, face: hero.face });
    if (hero.stamina <= 0) {
      enter(hero, 'hurt');
      hero.staggerFor = 0.9;
      hero.vx = hero.vz = 0;
      hero.counter = 0;
      emit(game, 'guardBreak', { x: hero.x, z: hero.z });
    }
    return 'block';
  }
  hero.hp -= amount;
  hero.comboFor = 0;
  hero.queued = null;
  hero.counter = 0;
  const d = Math.hypot(hero.x - from.x, hero.z - from.z) || 1,
    push = move.heavy ? 7 : 4;
  hero.vx = ((hero.x - from.x) / d) * push;
  hero.vz = ((hero.z - from.z) / d) * push;
  hero.freeze = move.heavy ? 0.1 : 0.06;
  emit(game, 'hurt', { x: hero.x, z: hero.z, heavy: !!move.heavy, amount });
  if (hero.hp <= 0) {
    hero.hp = 0;
    enter(hero, 'dead');
    game.deadFor = 0;
    emit(game, 'fall', { x: hero.x, z: hero.z });
    return 'dead';
  }
  enter(hero, 'hurt');
  hero.staggerFor = move.heavy ? HERO.hurt.stagger * 1.5 : HERO.hurt.stagger;
  hero.safe = HERO.hurt.safe;
  return 'hurt';
}

// ---- the others ---------------------------------------------------------------------------

function stagger(foe, time) {
  foe.state = 'stagger';
  foe.t = 0;
  foe.staggerFor = time;
  foe.move = null;
  foe.lungeLeft = 0;
}

function addPosture(game, foe, amount) {
  if (foe.kind !== 'lu' || foe.state === 'down' || foe.state === 'rage') return;
  foe.posture = Math.min(foe.sheet.posture, foe.posture + amount);
  foe.postureRest = 3;
  if (foe.posture >= foe.sheet.posture) {
    foe.state = 'down';
    foe.t = 0;
    foe.move = null;
    emit(game, 'postureBreak', { x: foe.x, z: foe.z });
  }
}

/** A blow reaches one of them. Returns whether it bit. */
function hurtFoe(game, foe, amount, { heavy = false, push = 1, source = 'cut' } = {}) {
  const hero = game.hero;
  if (foe.state === 'dead' || foe.state === 'rage') return false;
  if (foe.state === 'wait') foe.state = 'roam';
  const fromHero = heading(hero.x - foe.x, hero.z - foe.z),
    frontal = Math.abs(turnTo(foe.face, fromHero)) < 1.15;
  // The shield turns light cuts aside, twice; the third breaks through.
  if (foe.kind === 'shield' && source === 'cut' && !heavy && frontal && foe.state !== 'stagger') {
    foe.deflects++;
    if (foe.deflects < 3) {
      hero.freeze = 0.09;
      emit(game, 'deflect', { x: foe.x, z: foe.z, face: foe.face });
      if (foe.state === 'roam' || foe.state === 'recover') startMove(game, foe, 'answer');
      return false;
    }
    foe.deflects = 0;
    heavy = true;
    emit(game, 'shieldBreak', { x: foe.x, z: foe.z });
  }
  let damage = amount * hero.power,
    interrupted = false;
  // Caught late in his windup, his attack is broken.
  if (foe.state === 'windup' && foe.t > foe.move.windup * 0.5 && (foe.kind !== 'lu' || heavy) && !foe.move.self) {
    interrupted = true;
    damage *= 1.5;
  }
  if (foe.state === 'down') damage *= 1.5;
  foe.hp -= damage;
  foe.shake = 0.22;
  foe.freeze = heavy ? 0.12 : 0.075;
  if (source !== 'rain' && source !== 'star') hero.freeze = heavy ? 0.1 : 0.065;
  if (source === 'cut' || source === 'riposte') gain(hero, HERO.gains.hit);
  if (heavy) addPosture(game, foe, source === 'riposte' ? HERO.riposte.posture : 7);
  else addPosture(game, foe, 2.5);
  const d = Math.hypot(foe.x - hero.x, foe.z - hero.z) || 1;
  emit(game, 'hit', { x: foe.x, z: foe.z, face: hero.face, heavy, source, interrupted, amount: damage, id: foe.id });
  if (foe.hp <= 0) {
    foe.hp = 0;
    foe.state = 'dead';
    foe.t = 0;
    foe.vx = ((foe.x - hero.x) / d) * (heavy ? 6 : 3.5);
    foe.vz = ((foe.z - hero.z) / d) * (heavy ? 6 : 3.5);
    if (source !== 'rain') gain(hero, HERO.gains.kill);
    if (game.turn === foe.id) game.turn = 0;
    emit(game, 'death', { x: foe.x, z: foe.z, kind: foe.kind, id: foe.id });
    spill(game, foe);
    return true;
  }
  if (foe.state === 'down') return true;
  foe.hits++;
  if (interrupted) {
    stagger(foe, 1.3);
    emit(game, 'interrupt', { x: foe.x, z: foe.z });
  } else if (heavy || foe.hits >= foe.sheet.poise) {
    if (foe.kind === 'lu') {
      foe.hits = 0; // he only rocks
    } else {
      stagger(foe, heavy ? 0.7 : 0.42);
      foe.hits = 0;
    }
  }
  const shove = foe.kind === 'lu' ? push * 0.25 : push;
  foe.x += ((foe.x - hero.x) / d) * shove * 0.35;
  foe.z += ((foe.z - hero.z) / d) * shove * 0.35;
  return true;
}

function spill(game, foe) {
  const drop = (kind) => {
    const a = game.rand() * TAU,
      r = 0.8 + game.rand() * 1.4;
    game.drops.push({ id: ++game.serial, kind, x: foe.x, z: foe.z, toX: foe.x + Math.sin(a) * r, toZ: foe.z + Math.cos(a) * r, fromX: foe.x, fromZ: foe.z, t: 0, landed: false, taken: false });
  };
  if (foe.kind === 'lu') {
    drop('page');
    for (let i = 0; i < 3; i++) drop('silver');
    return;
  }
  drop('coin');
  if (game.rand() < 0.5) drop('coin');
  if (foe.kind === 'shield') drop('page');
  if (game.rand() < 0.35) drop('silver');
  if (game.rand() < (game.hero.gourd < HERO.gourd ? 0.45 : 0.15)) drop('salve');
  if (game.rand() < 0.18) drop('tonic');
}

function startMove(game, foe, name) {
  const hero = game.hero;
  foe.move = foe.sheet.moves[name];
  foe.state = 'windup';
  foe.t = 0;
  foe.face = heading(hero.x - foe.x, hero.z - foe.z);
  foe.aim = foe.move.self ? { x: foe.x, z: foe.z } : { x: hero.x, z: hero.z };
  foe.lungeLeft = foe.move.lunge ?? 0;
  emit(game, 'windup', { id: foe.id, kind: foe.kind, move: foe.move, x: foe.x, z: foe.z, face: foe.face, aim: foe.aim, time: foe.move.windup });
}

function inShape(foe, move, hero, more = 0) {
  const reach = HERO.radius * 0.6 + more;
  if (move.shape === 'disc') return Math.hypot(hero.x - foe.aim.x, hero.z - foe.aim.z) < move.range + reach;
  const dx = hero.x - foe.x,
    dz = hero.z - foe.z;
  if (move.shape === 'arc') return Math.hypot(dx, dz) < move.range + reach && Math.abs(turnTo(foe.face, heading(dx, dz))) < move.arc / 2 + 0.12 + more * 0.4;
  const lines = move.shape === 'lines' ? [-0.42, 0, 0.42] : [0];
  for (const off of lines) {
    const a = foe.strikeFace + off,
      along = dx * Math.sin(a) + dz * Math.cos(a),
      across = Math.abs(dx * Math.cos(a) - dz * Math.sin(a));
    if (along > -0.4 && along < move.range && across < move.width / 2 + reach) return true;
  }
  return false;
}

function land(game, foe) {
  const move = foe.move,
    hero = game.hero;
  emit(game, 'strike', { id: foe.id, kind: foe.kind, move, x: foe.x, z: foe.z, face: foe.face, aim: foe.aim });
  if (foe.kind === 'bow' && move.name === 'shot') {
    game.shots.push({ from: 'foe', owner: foe, x: foe.x + Math.sin(foe.face) * 0.9, z: foe.z + Math.cos(foe.face) * 0.9, face: foe.face, speed: 17, damage: move.damage, life: 1.3, id: ++game.serial });
    return;
  }
  // A dodge that began inside the blow counts as slipping it, even if it has already carried him clear.
  const slipping = hero.state === 'dodge' && hero.t < HERO.dodge.safe;
  if (inShape(foe, move, hero, slipping ? 2.4 : 0)) hurtHero(game, move.damage, move.shape === 'disc' ? foe.aim : foe, move, move.shape === 'disc' && !move.self ? null : foe);
}

function chooseBossMove(game, foe, d) {
  const second = foe.phase === 2;
  foe.count++;
  if (d > 6.5) return second && foe.count % 2 ? 'fire' : 'lunge';
  const close = second ? ['sweep', 'wheel', 'twin', 'fire', 'slam', 'twin'] : ['sweep', 'twin', 'slam', 'twin', 'sweep', 'lunge'];
  return close[foe.count % close.length];
}

function stepFoe(game, foe, dt) {
  const hero = game.hero,
    sheet = foe.sheet;
  foe.shake = Math.max(0, foe.shake - dt);
  if (foe.state === 'dead') {
    foe.t += dt;
    foe.x += (foe.vx ?? 0) * dt;
    foe.z += (foe.vz ?? 0) * dt;
    foe.vx *= Math.exp(-6 * dt);
    foe.vz *= Math.exp(-6 * dt);
    return;
  }
  if (foe.freeze > 0) {
    foe.freeze -= dt;
    return;
  }
  const dx = hero.x - foe.x,
    dz = hero.z - foe.z,
    d = Math.hypot(dx, dz) || 1,
    toHero = heading(dx, dz);
  if (foe.kind === 'lu' && foe.postureRest > 0) foe.postureRest -= dt;
  else if (foe.kind === 'lu' && foe.state !== 'down') foe.posture = Math.max(0, foe.posture - 6 * dt);
  foe.t += dt;
  switch (foe.state) {
    case 'wait':
      if (foe.kind !== 'lu' && d < 12.5) {
        for (const other of game.foes) if (other.state === 'wait' && other.kind !== 'lu') other.state = 'roam';
        emit(game, 'alert', { x: foe.x, z: foe.z });
      }
      return;
    case 'rage':
      if (foe.t >= 2.6) {
        foe.state = 'roam';
        foe.pause = 0.3;
      }
      return;
    case 'down':
      if (foe.t >= 3.2) {
        foe.state = 'roam';
        foe.posture = 0;
        foe.pause = 0.4;
        emit(game, 'rise', { id: foe.id });
      }
      return;
    case 'stagger':
      if (foe.t >= foe.staggerFor) {
        foe.state = 'roam';
        foe.pause = Math.max(foe.pause, 0.35);
      }
      return;
    case 'windup': {
      const move = foe.move;
      // He follows the hero for the first part of the windup, then commits.
      if (foe.t < move.windup * 0.6 && !move.self) {
        foe.face += turnTo(foe.face, toHero) * Math.min(1, dt * 7);
        if (move.shape === 'disc') (foe.aim.x = hero.x), (foe.aim.z = hero.z);
      }
      if (foe.t >= move.windup) {
        foe.state = 'strike';
        foe.t = 0;
        foe.strikeFace = foe.face;
        foe.struck = false;
      }
      return;
    }
    case 'strike': {
      const move = foe.move;
      if (foe.lungeLeft > 0) {
        let go = Math.min(foe.lungeLeft, (move.lunge / move.active) * dt);
        if (move.shape === 'arc') go = Math.min(go, Math.max(0, d - (sheet.radius + HERO.radius + 0.9)));
        foe.x += Math.sin(foe.face) * go;
        foe.z += Math.cos(foe.face) * go;
        foe.lungeLeft -= go;
      }
      if (!foe.struck && foe.t >= move.active * 0.5) {
        foe.struck = true;
        land(game, foe);
      }
      if (foe.t >= move.active) {
        if (move.repeat && foe.repeat < move.repeat) {
          foe.repeat++;
          foe.t = 0;
          foe.struck = false;
          foe.state = 'strike';
          foe.t = -0.45; // the second turn of the wheel
          emit(game, 'windup', { id: foe.id, kind: foe.kind, move, x: foe.x, z: foe.z, face: foe.face, aim: foe.aim, time: 0.45 + move.active * 0.5 });
          return;
        }
        foe.repeat = 0;
        foe.state = 'recover';
        foe.t = 0;
      }
      settle(foe, sheet.radius, bars(game));
      return;
    }
    case 'recover': {
      const move = foe.move;
      if (move.next && foe.t >= move.recover * 0.4 && foe.state !== 'stagger' && (foe.kind === 'lu' || game.rand() < 0.65 || foe.chained)) {
        foe.chained = false;
        return startMove(game, foe, move.next);
      }
      if (foe.t >= move.recover) {
        foe.state = 'roam';
        foe.pause = foe.kind === 'lu' ? (foe.phase === 2 ? 0.3 : 0.55) : foe.kind === 'bow' ? 1.2 + game.rand() * 0.9 : 0.5 + game.rand() * 0.6;
        if (game.turn === foe.id) {
          game.turn = 0;
          game.turnPause = 0.3 + game.rand() * 0.4;
        }
      }
      return;
    }
  }
  // roam: find a place to stand, and a moment to strike.
  foe.pause -= dt;
  foe.face += turnTo(foe.face, toHero) * Math.min(1, dt * 6);
  let wantX = 0,
    wantZ = 0;
  const ux = dx / d,
    uz = dz / d;
  if (foe.kind === 'bow') {
    if (d < 6.5) (wantX = -ux), (wantZ = -uz);
    else if (d > 12.5) (wantX = ux), (wantZ = uz);
    else (wantX = -uz * foe.side * 0.5), (wantZ = ux * foe.side * 0.5);
    if (foe.pause <= 0 && d < 15 && hero.state !== 'dead' && game.cine <= 0) {
      foe.count++;
      return startMove(game, foe, foe.count % 3 === 0 ? 'volley' : 'shot');
    }
  } else if (foe.kind === 'lu') {
    if (d > sheet.reach) (wantX = ux), (wantZ = uz);
    if (foe.pause <= 0 && hero.state !== 'dead' && game.cine <= 0) return startMove(game, foe, chooseBossMove(game, foe, d));
  } else {
    const mine = game.turn === foe.id;
    if (!game.turn && game.turnPause <= 0 && foe.pause <= 0 && hero.state !== 'dead') game.turn = foe.id;
    if (mine) {
      if (d > sheet.reach) (wantX = ux), (wantZ = uz);
      else if (game.cine <= 0) return startMove(game, foe, foe.kind === 'shield' ? 'bash' : 'cut');
    } else {
      // The others walk the ring and wait their turn.
      const ring = 4.9,
        pull = clamp((d - ring) * 0.8, -1, 1);
      wantX = ux * pull - uz * foe.side * 0.55;
      wantZ = uz * pull + ux * foe.side * 0.55;
    }
  }
  const w = Math.hypot(wantX, wantZ);
  foe.walking = w > 0.1;
  if (w > 1) (wantX /= w), (wantZ /= w);
  foe.x += wantX * sheet.speed * dt;
  foe.z += wantZ * sheet.speed * dt;
  const before = { x: foe.x, z: foe.z };
  settle(foe, sheet.radius, bars(game));
  // Up against something: walk the ring the other way.
  if (Math.hypot(before.x - foe.x, before.z - foe.z) > sheet.speed * dt * 0.5) foe.side = -foe.side;
}

function stepShots(game, dt) {
  const hero = game.hero;
  for (const shot of game.shots) {
    if (shot.dead) continue;
    shot.life -= dt;
    if (shot.from === 'hero') {
      // The stars lean toward whoever is nearest ahead.
      let best = null,
        bestOff = 0.9;
      for (const foe of living(game)) {
        const off = Math.abs(turnTo(shot.face, heading(foe.x - shot.x, foe.z - shot.z)));
        if (off < bestOff && Math.hypot(foe.x - shot.x, foe.z - shot.z) < 14) (bestOff = off), (best = foe);
      }
      if (best) shot.face += turnTo(shot.face, heading(best.x - shot.x, best.z - shot.z)) * Math.min(1, dt * 5);
    }
    shot.x += Math.sin(shot.face) * shot.speed * dt;
    shot.z += Math.cos(shot.face) * shot.speed * dt;
    if (shot.life <= 0 || edge(shot.x, shot.z) > 1.5) {
      shot.dead = true;
      continue;
    }
    if (shot.from === 'foe') {
      if (Math.hypot(shot.x - hero.x, shot.z - hero.z) < HERO.radius + 0.35) {
        const result = hurtHero(game, shot.damage, { x: shot.x - Math.sin(shot.face), z: shot.z - Math.cos(shot.face) }, { name: 'arrow' }, null);
        if (result !== 'slip' && result !== 'none') shot.dead = true;
        if (result === 'parry') emit(game, 'cutArrow', { x: shot.x, z: shot.z });
      }
    } else
      for (const foe of living(game))
        if (Math.hypot(shot.x - foe.x, shot.z - foe.z) < foe.sheet.radius + 0.5) {
          shot.dead = true;
          hurtFoe(game, foe, shot.damage, { push: 0.8, source: 'star' });
          emit(game, 'starHit', { x: shot.x, z: shot.z });
          break;
        }
  }
  game.shots = game.shots.filter((shot) => !shot.dead);
}

function take(game, drop) {
  const hero = game.hero;
  let note = LOOT[drop.kind].name;
  game.bag[drop.kind]++;
  switch (drop.kind) {
    case 'coin': {
      const n = 4 + Math.floor(game.rand() * 9);
      game.coins += n;
      note += ` ×${n}`;
      break;
    }
    case 'silver':
      game.coins += 50;
      break;
    case 'salve':
      if (hero.gourd < HERO.gourd) (hero.gourd++, (note += '　酒葫芦 +1'));
      else (hero.hp = Math.min(HERO.hp, hero.hp + 25)), (note += '　气血 +25');
      break;
    case 'tonic':
      hero.stamina = HERO.stamina;
      hero.brisk = 12;
      note += '　气力回满';
      break;
    case 'page':
      hero.power += 0.1;
      gain(hero, 35);
      note += '　枪伤 +10%　枪意 +35';
      break;
  }
  emit(game, 'pickup', { kind: drop.kind, x: drop.x, z: drop.z, note, grade: LOOT[drop.kind].grade });
}

function stepDrops(game, dt) {
  const hero = game.hero;
  for (const drop of game.drops) {
    if (drop.taken) continue;
    drop.t += dt;
    if (!drop.landed) {
      const k = Math.min(1, drop.t / 0.55);
      drop.x = drop.fromX + (drop.toX - drop.fromX) * k;
      drop.z = drop.fromZ + (drop.toZ - drop.fromZ) * k;
      drop.lift = Math.sin(k * Math.PI) * 1.6;
      if (k >= 1) {
        drop.landed = true;
        drop.lift = 0;
        settle(drop, 0.2);
        emit(game, 'dropLand', { kind: drop.kind, x: drop.x, z: drop.z, grade: LOOT[drop.kind].grade });
      }
    } else if (hero.state !== 'dead' && Math.hypot(drop.x - hero.x, drop.z - hero.z) < 2.3) {
      drop.taken = true;
      take(game, drop);
    }
  }
  game.drops = game.drops.filter((drop) => !drop.taken);
}

/** Bodies do not stand inside one another; the dodging or gliding hero passes through. */
function separate(game) {
  const hero = game.hero,
    bodies = living(game),
    through = hero.state === 'dodge' || hero.state === 'glide' || hero.state === 'dead' || hero.state === 'riposte';
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j],
        dx = b.x - a.x,
        dz = b.z - a.z,
        d = Math.hypot(dx, dz) || 0.01,
        over = a.sheet.radius + b.sheet.radius + 0.25 - d;
      if (over > 0) {
        const share = b.kind === 'lu' ? 0 : a.kind === 'lu' ? 1 : 0.5;
        a.x -= (dx / d) * over * (1 - share);
        a.z -= (dz / d) * over * (1 - share);
        b.x += (dx / d) * over * share;
        b.z += (dz / d) * over * share;
      }
    }
    if (through) continue;
    const dx = hero.x - a.x,
      dz = hero.z - a.z,
      d = Math.hypot(dx, dz) || 0.01,
      over = a.sheet.radius + HERO.radius - d;
    if (over > 0) {
      const mine = a.kind === 'lu' ? 1 : 0.6;
      hero.x += (dx / d) * over * mine;
      hero.z += (dz / d) * over * mine;
      a.x -= (dx / d) * over * (1 - mine);
      a.z -= (dz / d) * over * (1 - mine);
    }
  }
}

function rest(game, id) {
  const hero = game.hero;
  game.checkpoint = id;
  hero.hp = HERO.hp;
  hero.gourd = HERO.gourd;
  emit(game, 'rest', { id });
}

/** After a fall: back to the last brazier, and whoever was left stands where he stood. */
export function revive(game) {
  const hero = game.hero,
    at = PLACES[game.checkpoint];
  Object.assign(hero, { x: at.x - 1.4, z: at.z + 1.2, hp: HERO.hp, stamina: HERO.stamina, gourd: HERO.gourd, state: 'free', t: 0, safe: 1.5, counter: 0, freeze: 0, comboFor: 0, queued: null });
  settle(hero, HERO.radius, bars(game));
  game.shots = [];
  game.spears = [];
  game.turn = 0;
  const lu = game.boss;
  if (lu.state !== 'dead') {
    Object.assign(lu, { x: PLACES.court.x, z: PLACES.court.z - 3, hp: lu.maxHp, state: 'wait', face: 0, posture: 0, phase: 1, move: null, count: 0, freeze: 0 });
    if (game.stage === 'boss') game.stage = 'gate';
    game.bars.court = false;
  }
  // The party he was fighting is whole again.
  if (game.stage === 'road' || game.stage === 'yard') {
    game.foes = game.foes.filter((foe) => foe.kind === 'lu');
    game.drops = [];
    spawnParty(game, 0);
    game.stage = 'road';
    game.partyWait = 0;
  }
  emit(game, 'revive', { x: hero.x, z: hero.z });
}

function stepStage(game, dt) {
  const hero = game.hero,
    lu = game.boss,
    others = game.foes.filter((foe) => foe.kind !== 'lu');
  if (game.stage === 'road' && others.some((foe) => foe.state !== 'wait')) {
    game.stage = 'yard';
    emit(game, 'stage', { stage: 'yard' });
  }
  if (game.stage === 'yard' && others.every((foe) => foe.state === 'dead')) {
    if (game.party === 0) {
      game.partyWait += dt;
      if (game.partyWait > 1.6) {
        spawnParty(game, 1);
        emit(game, 'party', {});
      }
    } else {
      game.stage = 'gate';
      game.bars.gate = false;
      emit(game, 'stage', { stage: 'gate' });
    }
  }
  if (game.stage === 'gate' && hero.z < -21.6 && hero.state !== 'dead') {
    game.stage = 'boss';
    game.checkpoint = 'rest';
    game.bars.court = true;
    lu.state = 'roam';
    lu.pause = 1.2;
    game.cine = 5.2;
    emit(game, 'cine', { id: 'meet', time: 5.2 });
    emit(game, 'stage', { stage: 'boss' });
  }
  if (game.stage === 'boss') {
    if (lu.phase === 1 && lu.hp <= lu.maxHp * 0.5 && lu.state !== 'dead') {
      lu.phase = 2;
      lu.state = 'rage';
      lu.t = 0;
      lu.move = null;
      lu.posture = 0;
      game.cine = 2.6;
      game.shots = [];
      emit(game, 'cine', { id: 'rage', time: 2.6, x: lu.x, z: lu.z });
    }
    if (lu.state === 'dead') {
      game.stage = 'done';
      game.bars.court = false;
      game.cine = 6;
      emit(game, 'cine', { id: 'end', time: 6 });
      emit(game, 'stage', { stage: 'done' });
    }
  }
  // Warming his hands at a brazier mends him and fills the gourd.
  const fighting = living(game).some((foe) => foe.kind !== 'lu' || game.stage === 'boss');
  let near = null;
  for (const id of ['camp', 'rest']) if (Math.hypot(hero.x - PLACES[id].x, hero.z - PLACES[id].z) < 2.3) near = id;
  if (near && !fighting && hero.state !== 'dead') {
    if (!game.resting && (game.checkpoint !== near || hero.hp < HERO.hp || hero.gourd < HERO.gourd)) rest(game, near);
    game.resting = true;
  } else game.resting = false;
  game.near = near;
}

/** One tick. `dt` is the time that passes in the fight (already slowed, if the moment is slowed). */
export function step(game, input, dt) {
  game.events.length = 0;
  game.time += dt;
  game.slow = Math.max(0, game.slow - dt);
  game.turnPause = Math.max(0, game.turnPause - dt);
  if (game.cine > 0) game.cine = Math.max(0, game.cine - dt);
  stepHero(game, input, dt);
  for (const foe of game.foes) stepFoe(game, foe, dt);
  separate(game);
  stepShots(game, dt);
  stepDrops(game, dt);
  stepStage(game, dt);
  if (game.hero.state === 'dead') {
    game.deadFor += dt;
    if (game.deadFor > 3.4) revive(game);
  }
  return game.events;
}
