// Erlang, the god with the third eye, who holds the way out of the orchard with his three-pointed glaive and his
// hound. He fights in three phases: as himself; then changing, between blows, into a hawk that stoops twice and
// is a god again; then grown to the size of the sky, when his leap sends a wave along the ground to either side.
// All the while the hound comes in from behind the Monkey King, and runs the length of the court. Nothing here draws.
//
// He is `{ x, y, rise, size, form, facing, state, move, time, health, phase, waves, hound, ... }`: `y` is the
// ground under him, `rise` how far above it he is, `size` how many times his own size he has grown, and `form`
// is `man` or `hawk`. `state` is one of `wait`, `enter`, `idle`, `windup`, `attack`, `roar`, `stun` and `yield`.

export const ERLANG = {
  health: 60,
  halfWidth: 26,
  height: 156,
  /** For each phase: the strength at which it ends, his pace, his pause between moves, his moves in turn, how often the hound comes, and his size. */
  phases: [
    { until: 40, pace: 150, rest: 1.15, turn: ['slash', 'leap'], hound: 7, size: 1 },
    { until: 20, pace: 170, rest: 1, turn: ['hawk', 'slash', 'leap'], hound: 5.5, size: 1 },
    { until: 0, pace: 130, rest: 1.1, turn: ['leap', 'slash', 'hawk'], hound: 4.5, size: 1.6 }
  ],
  /** Nearer than `near` he slashes, between his other moves; `keep` is as near as he troubles to come. Both grow with him. */
  near: 150,
  keep: 190,
  /** The glaive brought over and down in front of him. A `box` is measured from the ground under him, x forward and y up, at his own size. */
  slash: { windup: 0.5, seconds: 0.56, from: 0.08, until: 0.22, range: 230, box: { x: -16, y: 0, width: 200, height: 176 } },
  /** He leaps to where the Monkey King stands, as far as `reach`, and what is under him when he lands is struck; grown, he sends a wave each way. */
  leap: { windup: 0.4, lift: 900, gravity: 2600, reach: 560, land: 0.14, box: { x: -76, y: 0, width: 152, height: 100 }, wave: { speed: 520, seconds: 0.7, width: 44, height: 46 } },
  /** As a hawk he climbs to `height`, hangs there as a warning, and stoops; and does so `stoops` times before he is a god again. */
  hawk: { windup: 0.5, height: 210, climb: 0.5, hover: 0.45, stoop: 760, stoops: 2, halfWidth: 30, tall: 50, floor: 44 },
  enter: { seconds: 1.4, from: 430 },
  roar: 1.4,
  stun: 1.3,
  steady: 2.6,
  /** Beaten, he kneels for this long before he is gone. */
  yield: 2.2,
  /**
   * The hound: it shows itself at the edge of the court behind the Monkey King for `windup`, runs past him by
   * `past`, and is gone. A blow sends it off at once; after `hits` of them it keeps away for `sulk` longer.
   */
  hound: { windup: 0.6, speed: 740, past: 260, halfWidth: 36, height: 48, hits: 2, sulk: 6, yelp: 0.5 }
};

export function createBoss(x, y, arena) {
  return {
    kind: 'erlang',
    x,
    y,
    home: x,
    arena,
    vx: 0,
    lift: 0,
    facing: -1,
    rise: ERLANG.enter.from,
    size: 1,
    form: 'man',
    state: 'wait',
    move: null,
    step: null,
    time: 0,
    health: ERLANG.health,
    phase: 0,
    rest: 0,
    turn: 0,
    steady: 0,
    last: null,
    stoops: 0,
    landed: 0,
    waves: [],
    hound: { state: 'lurk', x, y, facing: 1, time: 0, wait: ERLANG.phases[0].hound * 0.6, hits: 0, runs: 0, goal: x },
    fires: [],
    serial: 0,
    gone: false
  };
}

const begin = (boss, state, move = null) => Object.assign(boss, { state, move, step: null, time: 0, serial: boss.serial + 1 });
const slow = (value, amount) => (value > 0 ? Math.max(0, value - amount) : Math.min(0, value + amount));
const phaseStart = boss => (boss.phase ? ERLANG.phases[boss.phase - 1].until : ERLANG.health);
const facing = (a, b) => (b >= a ? 1 : -1);

/** Whether he is on the stage and the fight is on. */
export const present = boss => boss.state !== 'wait' && !boss.gone;
/** Whether the staff can find him now: not while he arrives, rages or kneels. */
export const open = boss => boss.state === 'idle' || boss.state === 'windup' || boss.state === 'attack' || boss.state === 'stun';

/** The room he takes up, as a rectangle of the stage: grown with him, and small about the hawk when he is one. */
export function bossBox(boss) {
  if (boss.form === 'hawk') return { x: boss.x - ERLANG.hawk.halfWidth, y: boss.y - boss.rise - ERLANG.hawk.tall / 2, width: ERLANG.hawk.halfWidth * 2, height: ERLANG.hawk.tall };
  const half = ERLANG.halfWidth * boss.size,
    tall = ERLANG.height * boss.size;
  return { x: boss.x - half, y: boss.y - boss.rise - tall, width: half * 2, height: tall };
}

const reaching = (boss, { x, y, width, height }) => {
  const s = boss.size;
  return { x: boss.facing > 0 ? boss.x + x * s : boss.x - (x + width) * s, y: boss.y - (y + height) * s, width: width * s, height: height * s };
};

/** Where he would hurt at this moment, as a rectangle of the stage; nothing if no blow of his is landing. */
export function bossReach(boss) {
  if (boss.state !== 'attack') return null;
  if (boss.move === 'slash') return boss.time >= ERLANG.slash.from && boss.time <= ERLANG.slash.until ? reaching(boss, ERLANG.slash.box) : null;
  if (boss.move === 'leap') return boss.landed > 0 ? reaching(boss, ERLANG.leap.box) : null;
  return boss.step === 'stoop' ? bossBox(boss) : null;
}

/** The room the hound takes up. */
export const houndBox = hound => ({ x: hound.x - ERLANG.hound.halfWidth, y: hound.y - ERLANG.hound.height, width: ERLANG.hound.halfWidth * 2, height: ERLANG.hound.height });
/** Whether the hound is where the staff can find it. */
export const houndOut = hound => hound.state === 'windup' || hound.state === 'run';

/**
 * Everything of his besides himself that hurts at this moment, each as `{ box, from }`: the hound as it runs,
 * and the waves along the ground.
 */
export function bossHazards(boss) {
  const hurts = boss.waves.map(wave => ({ box: { x: wave.x - ERLANG.leap.wave.width / 2, y: boss.y - ERLANG.leap.wave.height, width: ERLANG.leap.wave.width, height: ERLANG.leap.wave.height }, from: wave.x - wave.vx }));
  if (boss.hound.state === 'run') hurts.push({ box: houndBox(boss.hound), from: boss.hound.x - boss.hound.facing * 40 });
  return hurts;
}

/** The staff finds the hound: it yelps and backs away, and after enough of that it keeps away for a while. */
export function hitHound(boss) {
  const hound = boss.hound;
  if (!houndOut(hound)) return [];
  Object.assign(hound, { state: 'yelp', time: 0, hits: hound.hits + 1 });
  return [{ type: 'hound-yelp', hound }];
}

/**
 * A blow lands on him. As a hawk, any blow knocks him out of the air and into his own shape, staggered. As
 * himself a light blow does not move him, and the last of the combination staggers him unless he was staggered
 * a moment ago or is in a blow of his own. He cannot be taken below the end of his phase at a stroke. Returns
 * `boss-hurt`, `boss-stun` (with `boss-change` before it if he was a hawk), `boss-phase` or `boss-down`.
 */
export function hitBoss(boss, attack) {
  const floor = ERLANG.phases[boss.phase].until,
    events = [];
  boss.health = Math.max(floor, boss.health - attack.power);
  if (boss.form === 'hawk') (boss.form = 'man'), events.push({ type: 'boss-change', form: 'man' });
  if (boss.health === floor) {
    Object.assign(boss, { waves: [], vx: 0, landed: 0 });
    if (floor === 0) {
      boss.hound.state = 'lurk';
      boss.hound.wait = Infinity;
      return begin(boss, 'yield'), [...events, { type: 'boss-down' }];
    }
    boss.phase++;
    boss.turn = 0;
    boss.last = 'slash';
    return begin(boss, 'roar'), [...events, { type: 'boss-phase', phase: boss.phase }];
  }
  const staggers = events.length > 0 || (attack.kind === 'slam' && boss.steady === 0 && (boss.state === 'idle' || (boss.state === 'windup' && boss.move === 'slash')));
  if (!staggers) return [{ type: 'boss-hurt' }];
  begin(boss, 'stun');
  boss.steady = ERLANG.stun + ERLANG.steady;
  boss.vx = -boss.facing * 120;
  return [...events, { type: 'boss-stun' }];
}

/** He comes down into the court. */
export function wakeBoss(boss) {
  begin(boss, 'enter');
  boss.rise = ERLANG.enter.from;
  return [{ type: 'boss-enter' }];
}

/** Puts the fight back to the start of the phase it had reached: for when the Monkey King has fallen. */
export function restoreBoss(boss) {
  Object.assign(boss, { x: boss.home, vx: 0, rise: 0, facing: -1, form: 'man', size: ERLANG.phases[boss.phase].size, health: phaseStart(boss), rest: 1.4, turn: 0, last: null, steady: 0, landed: 0, waves: [] });
  Object.assign(boss.hound, { state: 'lurk', wait: ERLANG.phases[boss.phase].hound, hits: 0 });
  begin(boss, 'idle');
}

/**
 * One step. `hero` is who he is fighting (`{ x, y, state }`). Returns what happened: `boss-ready`, `boss-windup`
 * and `boss-strike` (each with the move), `boss-change` (with the form he takes), `boss-land`, `boss-gone`, and
 * for the hound `hound-windup`, `hound-run` and `hound-gone`.
 */
export function stepBoss(boss, hero, dt) {
  const events = [];
  if (!present(boss)) return events;
  const phase = ERLANG.phases[boss.phase],
    dx = hero.x - boss.x,
    { left, right } = boss.arena,
    edge = ERLANG.halfWidth * 2 * boss.size;
  boss.time += dt;
  boss.rest = Math.max(0, boss.rest - dt);
  boss.steady = Math.max(0, boss.steady - dt);
  boss.landed = Math.max(0, boss.landed - dt);
  // He grows, or shrinks, toward the size of his phase.
  boss.size += Math.max(-dt, Math.min(dt, phase.size - boss.size)) * 0.6;
  if (Math.abs(phase.size - boss.size) < 0.01) boss.size = phase.size;

  if (boss.state === 'enter') {
    const still = Math.max(0, 1 - boss.time / ERLANG.enter.seconds);
    boss.rise = ERLANG.enter.from * still * still;
    boss.facing = facing(boss.x, hero.x);
    if (boss.time >= ERLANG.enter.seconds) (begin(boss, 'idle'), (boss.rest = 0.7), (boss.rise = 0), events.push({ type: 'boss-ready' }));
  } else if (boss.state === 'roar' || boss.state === 'stun' || boss.state === 'yield') {
    // Whatever height he was at, he comes down from it.
    boss.rise = Math.max(0, boss.rise - 900 * dt);
    boss.vx = slow(boss.vx, 300 * dt);
    if (boss.state === 'yield') {
      if (boss.time >= ERLANG.yield) ((boss.gone = true), events.push({ type: 'boss-gone' }));
    } else if (boss.time >= ERLANG[boss.state] && boss.rise === 0) {
      const rest = boss.state === 'roar' ? 0.5 : 0.3;
      begin(boss, 'idle');
      boss.rest = rest;
    }
  } else if (boss.state === 'windup') {
    boss.vx = 0;
    if (boss.time >= ERLANG[boss.move].windup) {
      const move = boss.move;
      begin(boss, 'attack', move);
      events.push({ type: 'boss-strike', move });
      if (move === 'leap') {
        // The leap is thrown at where the Monkey King stands now, and comes down where it was thrown.
        const seconds = (2 * ERLANG.leap.lift) / ERLANG.leap.gravity;
        boss.vx = Math.max(-ERLANG.leap.reach, Math.min(ERLANG.leap.reach, dx)) / seconds;
        boss.lift = ERLANG.leap.lift;
      } else if (move === 'hawk') {
        Object.assign(boss, { form: 'hawk', step: 'climb', stoops: ERLANG.hawk.stoops, from: boss.rise });
        events.push({ type: 'boss-change', form: 'hawk' });
      }
    }
  } else if (boss.state === 'attack' && boss.move === 'slash') {
    if (boss.time >= ERLANG.slash.seconds) (begin(boss, 'idle'), (boss.rest = phase.rest));
  } else if (boss.state === 'attack' && boss.move === 'leap') {
    if (boss.lift !== null) {
      boss.rise += boss.lift * dt;
      boss.lift -= ERLANG.leap.gravity * dt;
      if (boss.rise <= 0 && boss.lift < 0) {
        Object.assign(boss, { rise: 0, lift: null, vx: 0, landed: ERLANG.leap.land, time: 0 });
        events.push({ type: 'boss-land' });
        // Grown, his landing sends a wave along the ground to either side.
        if (boss.size > 1.2) for (const side of [-1, 1]) boss.waves.push({ x: boss.x + side * 70, vx: side * ERLANG.leap.wave.speed, life: ERLANG.leap.wave.seconds });
      }
    } else if (boss.time >= 0.5) (begin(boss, 'idle'), (boss.rest = phase.rest));
  } else if (boss.state === 'attack') {
    // The hawk: up to its height, a moment hanging there, and down along a line fixed as the stoop begins.
    const hawk = ERLANG.hawk;
    if (boss.step === 'climb') {
      boss.vx = 0;
      boss.rise = boss.from + (hawk.height - boss.from) * Math.min(1, boss.time / hawk.climb);
      boss.facing = facing(boss.x, hero.x);
      if (boss.time >= hawk.climb) Object.assign(boss, { step: 'hover', time: 0 });
    } else if (boss.step === 'hover') {
      boss.facing = facing(boss.x, hero.x);
      if (boss.time >= hawk.hover) {
        const down = Math.max(60, boss.rise - 50 - (boss.y - hero.y)),
          length = Math.hypot(dx, down) || 1;
        Object.assign(boss, { step: 'stoop', time: 0, vx: (dx / length) * hawk.stoop, lift: -(down / length) * hawk.stoop });
        events.push({ type: 'boss-strike', move: 'stoop' });
      }
    } else {
      boss.rise += boss.lift * dt;
      if (boss.rise <= hawk.floor || boss.time > 1.2) {
        boss.stoops--;
        if (boss.stoops > 0) Object.assign(boss, { step: 'climb', time: 0, from: boss.rise, vx: 0 });
        else {
          // He is himself again where the last stoop ended.
          Object.assign(boss, { form: 'man', rise: 0, vx: 0, lift: null });
          events.push({ type: 'boss-change', form: 'man' });
          begin(boss, 'idle');
          boss.rest = phase.rest;
        }
      }
    }
  } else {
    // Free to act: he faces the Monkey King and comes within reach, and when he has rested he makes his next move.
    boss.facing = facing(boss.x, hero.x);
    const gap = Math.abs(dx),
      want = gap > ERLANG.keep * boss.size + 30 ? boss.facing : 0;
    boss.vx += Math.max(-900 * dt, Math.min(900 * dt, want * phase.pace - boss.vx));
    if (boss.rest === 0 && hero.state !== 'down' && boss.size === phase.size) {
      // Whoever crowds him is cut at, but not twice running: his other moves still take their turn.
      const crowded = gap < ERLANG.near * boss.size && boss.last !== 'slash',
        next = crowded ? 'slash' : phase.turn[boss.turn % phase.turn.length];
      // He does not slash at what the glaive cannot reach; he closes in first.
      if (next !== 'slash' || gap < ERLANG.slash.range * boss.size) {
        if (!crowded) boss.turn++;
        begin(boss, 'windup', next);
        boss.last = next;
        boss.vx = 0;
        events.push({ type: 'boss-windup', move: next });
      }
    }
  }
  boss.x = Math.min(right - edge, Math.max(left + edge, boss.x + boss.vx * dt));

  for (const wave of boss.waves) ((wave.x += wave.vx * dt), (wave.life -= dt));
  boss.waves = boss.waves.filter(wave => wave.life > 0 && wave.x > left && wave.x < right);
  stepHound(boss, hero, dt, events);
  return events;
}

/** The hound's part of a step. */
function stepHound(boss, hero, dt, events) {
  const hound = boss.hound,
    spec = ERLANG.hound,
    { left, right } = boss.arena,
    every = ERLANG.phases[boss.phase].hound;
  hound.time += dt;
  if (hound.state === 'lurk') {
    hound.wait -= dt;
    if (hound.wait <= 0 && open(boss) && hero.state !== 'down') {
      // It comes from behind him: from the end of the court that he has his back to when he faces its master.
      const fromLeft = hero.x < boss.x;
      Object.assign(hound, { state: 'windup', time: 0, runs: hound.runs + 1, x: fromLeft ? left + 50 : right - 50, facing: fromLeft ? 1 : -1 });
      events.push({ type: 'hound-windup', hound });
    }
  } else if (hound.state === 'windup') {
    if (hound.time >= spec.windup) {
      Object.assign(hound, { state: 'run', time: 0, goal: Math.min(right - 50, Math.max(left + 50, hero.x + hound.facing * spec.past)) });
      events.push({ type: 'hound-run', hound });
    }
  } else if (hound.state === 'run') {
    hound.x += hound.facing * spec.speed * dt;
    if ((hound.goal - hound.x) * hound.facing <= 0) (Object.assign(hound, { state: 'lurk', wait: every }), events.push({ type: 'hound-gone', hound }));
  } else if (hound.state === 'yelp') {
    hound.x = Math.min(right - 30, Math.max(left + 30, hound.x - hound.facing * 320 * dt));
    if (hound.time >= spec.yelp) {
      // Struck often enough, it keeps away the longer, and then is as bold as before.
      const cowed = hound.hits >= spec.hits;
      Object.assign(hound, { state: 'lurk', wait: every + (cowed ? spec.sulk : 0), hits: cowed ? 0 : hound.hits });
      events.push({ type: 'hound-gone', hound });
    }
  }
}

/** The animation that shows what he is doing, whether it goes round, and a number that changes when it should start again. */
export function bossAnimation(boss) {
  if (boss.form === 'hawk') return boss.step === 'stoop' ? { name: 'dive', loop: true, key: 0 } : boss.step === 'hover' ? { name: 'windup', loop: false, key: boss.serial + boss.stoops * 100 } : { name: 'fly', loop: true, key: 0 };
  if (boss.state === 'windup') return { name: boss.move === 'slash' ? 'windup' : 'crouch', loop: false, key: boss.serial };
  if (boss.state === 'attack') return boss.move === 'leap' && boss.lift !== null ? { name: 'leap', loop: false, key: boss.serial } : { name: 'attack', loop: false, key: boss.serial };
  if (boss.state === 'roar' || boss.state === 'stun') return { name: boss.state, loop: false, key: boss.serial };
  if (boss.state === 'yield') return { name: 'down', loop: false, key: boss.serial };
  return { name: Math.abs(boss.vx) > 40 ? 'walk' : 'idle', loop: true, key: 0 };
}

/** The animation that shows what the hound is doing; nothing while it keeps out of sight. */
export function houndAnimation(hound) {
  if (hound.state === 'lurk') return null;
  return hound.state === 'run' ? { name: 'run', loop: true, key: 0 } : hound.state === 'windup' ? { name: 'crouch', loop: false, key: 'c' + hound.runs } : { name: 'yelp', loop: false, key: `y${hound.runs}.${hound.hits}` };
}
