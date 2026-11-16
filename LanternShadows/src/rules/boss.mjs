// Nezha, who comes down on his wheels of wind and fire to bar the gate. He fights in three phases: with the
// fire-tipped spear alone, then throwing the Universe Ring as well, then with three heads and six arms, riding
// his wheels through the court and leaving the ground burning behind them. Nothing here draws.
//
// The boss is `{ x, y, rise, facing, state, move, time, health, phase, ring, fires, ... }`: `y` is the ground
// under him and `rise` how far above it he hangs. `state` is one of `wait` (not yet come), `enter`, `idle`,
// `windup`, `attack`, `roar` (between phases), `stun` and `flee`.

export const BOSS = {
  health: 54,
  halfWidth: 26,
  height: 150,
  /** For each phase: the strength at which it ends, how fast he glides, his pause between moves, and his moves in turn. */
  phases: [
    { until: 36, pace: 150, rest: 1.15, turn: ['thrust'] },
    { until: 18, pace: 185, rest: 0.95, turn: ['ring', 'thrust'] },
    { until: 0, pace: 230, rest: 0.8, turn: ['charge', 'ring', 'thrust'] }
  ],
  /** Nearer than `near` he sweeps, between his other moves; `keep` is as near as he troubles to come. */
  near: 140,
  keep: 230,
  /**
   * The moves. `windup` is the warning and `seconds` the move's length; a blow can land between `from` and
   * `until`. A `box` is measured from the ground under him, x forward and y up. The lengths agree with the
   * puppet's animations in tools/puppets/nezha.mjs, and the sizes with the puppet as the stage shows it, a
   * quarter larger than it is drawn.
   */
  thrust: { windup: 0.5, seconds: 0.62, from: 0.04, until: 0.3, speed: 1150, range: 460, box: { x: 10, y: 52, width: 185, height: 40 } },
  sweep: { windup: 0.4, seconds: 0.5, from: 0.09, until: 0.22, box: { x: -24, y: 0, width: 205, height: 175 } },
  /** The ring leaves his hand at `at`, flies `reach` at `speed`, and comes back; struck by the staff it comes back faster. */
  ring: { windup: 0.45, seconds: 0.4, at: 0.1, speed: 720, reach: 520, back: 860, struck: 1250, height: 70, radius: 19, rebound: 3 },
  /** He rises by `rise`, rides to the end of the court at `speed`, and the ground burns for `fire` after. */
  charge: { windup: 0.6, speed: 1050, rise: 100, halfWidth: 66, height: 80, fire: 0.9, after: 1.9 },
  /** In the last phase every warning is this much shorter. */
  quick: 0.8,
  enter: { seconds: 1.5, from: 430 },
  roar: 1.3,
  stun: 1.2,
  /** After he has been staggered, how long before he can be again. */
  steady: 2.6,
  flee: 1.8
};

export function createBoss(x, y, arena) {
  return { kind: 'nezha', x, y, home: x, arena, vx: 0, facing: -1, rise: BOSS.enter.from, state: 'wait', move: null, time: 0, health: BOSS.health, phase: 0, rest: 0, turn: 0, steady: 0, struck: false, last: null, ring: null, fires: [], serial: 0, gone: false };
}

const begin = (boss, state, move = null) => Object.assign(boss, { state, move, time: 0, struck: false, serial: boss.serial + 1 });
const slow = (value, amount) => (value > 0 ? Math.max(0, value - amount) : Math.min(0, value + amount));
const riding = boss => boss.state === 'attack' && boss.move === 'charge';
const windupOf = boss => BOSS[boss.move].windup * (boss.phase === 2 ? BOSS.quick : 1);

/** Whether he is on the stage and the fight is on. */
export const present = boss => boss.state !== 'wait' && !boss.gone;
/** Whether the staff can find him now: not while he arrives, rages or is carried off. */
export const open = boss => boss.state === 'idle' || boss.state === 'windup' || boss.state === 'attack' || boss.state === 'stun';

/** The room he takes up, as a rectangle of the stage: low and long while he rides his wheels through. */
export function bossBox(boss) {
  const { halfWidth, height } = riding(boss) ? BOSS.charge : BOSS;
  return { x: boss.x - halfWidth, y: boss.y - boss.rise - height, width: halfWidth * 2, height };
}

/** Where he would hurt at this moment, as a rectangle of the stage; nothing if no blow of his is landing. */
export function bossReach(boss) {
  if (boss.state !== 'attack') return null;
  if (boss.move === 'charge') return bossBox(boss);
  const move = BOSS[boss.move];
  if (!move.box || boss.time < move.from || boss.time > move.until) return null;
  const { x, y, width, height } = move.box;
  return { x: boss.facing > 0 ? boss.x + x : boss.x - x - width, y: boss.y - y - height, width, height };
}

/** The ring in flight, as a rectangle of the stage. */
export const ringBox = ring => ({ x: ring.x - BOSS.ring.radius, y: ring.y - BOSS.ring.radius, width: BOSS.ring.radius * 2, height: BOSS.ring.radius * 2 });

/** The strength he has at the start of the phase he is in. */
const phaseStart = boss => (boss.phase ? BOSS.phases[boss.phase - 1].until : BOSS.health);

/**
 * A blow lands on him. He does not flinch from a light one; the last blow of the combination staggers him, unless
 * he was staggered a moment ago or is in the middle of a blow of his own. He cannot be taken below the end of
 * his phase at a stroke. Returns what happened: `boss-hurt`, `boss-stun`, `boss-phase` or `boss-down`.
 */
export function hitBoss(boss, attack) {
  const floor = BOSS.phases[boss.phase].until;
  boss.health = Math.max(floor, boss.health - attack.power);
  if (boss.health === floor) {
    Object.assign(boss, { ring: null, fires: [], vx: 0 });
    if (floor === 0) return begin(boss, 'flee'), [{ type: 'boss-down' }];
    // Each phase opens with the move that is new to it.
    boss.phase++;
    boss.turn = 0;
    boss.last = 'sweep';
    return begin(boss, 'roar'), [{ type: 'boss-phase', phase: boss.phase }];
  }
  const staggers = attack.kind === 'ring' ? !riding(boss) : attack.kind === 'slam' && boss.steady === 0 && (boss.state === 'idle' || (boss.state === 'windup' && boss.move !== 'charge'));
  if (!staggers) return [{ type: 'boss-hurt' }];
  begin(boss, 'stun');
  boss.steady = BOSS.stun + BOSS.steady;
  boss.vx = -boss.facing * 120;
  return [{ type: 'boss-stun' }];
}

/** He comes down into the court. */
export function wakeBoss(boss) {
  begin(boss, 'enter');
  boss.rise = BOSS.enter.from;
  return [{ type: 'boss-enter' }];
}

/** Puts the fight back to the start of the phase it had reached: for when the Monkey King has fallen. */
export function restoreBoss(boss) {
  Object.assign(boss, { x: boss.home, vx: 0, rise: 0, facing: -1, health: phaseStart(boss), rest: 1.4, turn: 0, last: null, steady: 0, ring: null, fires: [] });
  begin(boss, 'idle');
}

/**
 * One step. `hero` is who he is fighting (`{ x, y, state }`). Returns what happened: `boss-ready`, `boss-windup`
 * and `boss-strike` (each with the move), `ring` (thrown), `ring-caught`, `boss-halt` (the end of a ride), and
 * `boss-gone`; and whatever `hitBoss` reports when his own ring is knocked back into him.
 */
export function stepBoss(boss, hero, dt) {
  const events = [];
  if (!present(boss)) return events;
  const phase = BOSS.phases[boss.phase],
    dx = hero.x - boss.x,
    { left, right } = boss.arena;
  boss.time += dt;
  boss.rest = Math.max(0, boss.rest - dt);
  boss.steady = Math.max(0, boss.steady - dt);
  let rise = Math.max(0, boss.rise - 500 * dt);

  if (boss.state === 'enter') {
    // He comes down fast and settles slowly.
    const still = Math.max(0, 1 - boss.time / BOSS.enter.seconds);
    rise = BOSS.enter.from * still * still;
    boss.facing = dx >= 0 ? 1 : -1;
    if (boss.time >= BOSS.enter.seconds) (begin(boss, 'idle'), (boss.rest = 0.7), events.push({ type: 'boss-ready' }));
  } else if (boss.state === 'roar') {
    boss.vx = 0;
    if (boss.time >= BOSS.roar) (begin(boss, 'idle'), (boss.rest = 0.5));
  } else if (boss.state === 'stun') {
    boss.vx = slow(boss.vx, 300 * dt);
    if (boss.time >= BOSS.stun) (begin(boss, 'idle'), (boss.rest = 0.3));
  } else if (boss.state === 'flee') {
    // He reels where he is, and then his wheels carry him up and away.
    boss.vx = 0;
    const away = Math.max(0, boss.time - 1);
    rise = away * away * 900;
    if (boss.time >= BOSS.flee) ((boss.gone = true), events.push({ type: 'boss-gone' }));
  } else if (boss.state === 'windup') {
    boss.vx = 0;
    if (boss.move === 'charge') rise = Math.min(BOSS.charge.rise, boss.rise + 260 * dt);
    if (boss.time >= windupOf(boss)) {
      begin(boss, 'attack', boss.move);
      events.push({ type: 'boss-strike', move: boss.move });
      // The ride burns the ground from where it starts.
      if (boss.move === 'charge') boss.fires.push({ from: boss.x, to: boss.x, life: BOSS.charge.fire, live: true });
    }
  } else if (boss.state === 'attack') {
    const move = BOSS[boss.move];
    if (boss.move === 'charge') {
      rise = Math.max(0, boss.rise - 700 * dt);
      boss.vx = boss.facing * move.speed;
      const fire = boss.fires.at(-1),
        end = boss.facing > 0 ? right - move.halfWidth - 30 : left + move.halfWidth + 30;
      if ((end - boss.x) * boss.facing <= boss.vx * boss.facing * dt) {
        boss.x = end;
        boss.vx = 0;
        fire.live = false;
        begin(boss, 'idle');
        boss.rest = move.after;
        events.push({ type: 'boss-halt' });
      }
      fire.to = boss.x;
    } else {
      boss.vx = boss.move === 'thrust' && boss.time >= move.from && boss.time < move.until ? boss.facing * move.speed : slow(boss.vx, 30000 * dt);
      if (boss.move === 'ring' && !boss.struck && boss.time >= move.at) {
        boss.struck = true;
        boss.ring = { x: boss.x + boss.facing * 30, y: boss.y - move.height, vx: boss.facing * move.speed, from: boss.x, back: false, struck: false };
        events.push({ type: 'ring', ring: boss.ring });
      }
      if (boss.time >= move.seconds) (begin(boss, 'idle'), (boss.rest = phase.rest));
    }
  } else {
    // Free to act: he faces the Monkey King and comes within reach, and when he has rested he makes his next move.
    boss.facing = dx >= 0 ? 1 : -1;
    const gap = Math.abs(dx),
      want = gap > BOSS.keep + 30 ? boss.facing : 0;
    boss.vx += Math.max(-900 * dt, Math.min(900 * dt, want * phase.pace - boss.vx));
    if (boss.rest === 0 && !boss.ring && hero.state !== 'down') {
      // Whoever crowds him is swept away, but not twice running: his other moves still take their turn.
      const next = gap < BOSS.near && boss.last !== 'sweep' ? 'sweep' : phase.turn[boss.turn % phase.turn.length];
      // He does not thrust at what the spear cannot reach; he closes in first.
      if (next !== 'thrust' || gap < BOSS.thrust.range) {
        if (next !== 'sweep') boss.turn++;
        begin(boss, 'windup', next);
        boss.last = next;
        boss.vx = 0;
        events.push({ type: 'boss-windup', move: next });
      }
    }
  }
  boss.rise = rise;
  boss.x = Math.min(right - BOSS.halfWidth * 2, Math.max(left + BOSS.halfWidth * 2, boss.x + boss.vx * dt));

  // The ring flies out, turns, and comes home to his hand: or into him, if the staff has sent it.
  const ring = boss.ring;
  if (ring) {
    if (!ring.back && (Math.abs(ring.x - ring.from) >= BOSS.ring.reach || ring.x <= left + 20 || ring.x >= right - 20)) ring.back = true;
    if (ring.back) ring.vx = Math.sign(boss.x - ring.x || 1) * (ring.struck ? BOSS.ring.struck : BOSS.ring.back);
    ring.x += ring.vx * dt;
    if (ring.back && Math.abs(ring.x - boss.x) <= Math.abs(ring.vx) * dt + 24) {
      boss.ring = null;
      if (ring.struck && open(boss)) events.push({ type: 'ring-home', at: { x: boss.x, y: ring.y } }, ...hitBoss(boss, { kind: 'ring', power: BOSS.ring.rebound }));
      else events.push({ type: 'ring-caught' });
    }
  }
  for (const fire of boss.fires) if (!fire.live) fire.life -= dt;
  boss.fires = boss.fires.filter(fire => fire.life > 0);
  return events;
}

/** The animation that shows what he is doing, whether it goes round, and a number that changes when it should start again. */
export function bossAnimation(boss) {
  if (boss.state === 'windup') return { name: boss.move + 'Windup', loop: false, key: boss.serial };
  if (boss.state === 'attack') return { name: boss.move, loop: boss.move === 'charge', key: boss.serial };
  if (boss.state === 'roar' || boss.state === 'stun' || boss.state === 'flee') return { name: boss.state, loop: false, key: boss.serial };
  return { name: Math.abs(boss.vx) > 40 ? 'move' : 'idle', loop: true, key: 0 };
}
