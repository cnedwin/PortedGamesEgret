// Laozi, in whose furnace room the third act is played. He does not fight as the others do. His Diamond Snare
// takes whatever weapon is raised against it: strike it, and the staff is gone until it is found again where he
// flings it. His whisk sweeps away whoever comes close, and his fan sends flame along the floor. When two thirds
// of his strength are spent he shuts the Monkey King in the Eight Trigrams Furnace: the walls of the court burn
// and close, fire falls from above, and there is nothing to do but last it out. Who comes out of that furnace has
// eyes of fire, and strikes twice as hard. Nothing here draws.
//
// He is `{ x, y, rise, facing, state, move, time, health, phase, ring, staff, walls, drops, ... }`. `state` is one
// of `wait`, `enter`, `idle`, `windup`, `attack`, `roar`, `furnace` (he is outside it, and cannot be reached),
// `stun` and `yield`.

export const LAOZI = {
  health: 54,
  halfWidth: 24,
  height: 140,
  /** For each phase: the strength at which it ends, his pace, his pause between moves, and his moves in turn. */
  phases: [
    { until: 36, pace: 120, rest: 1.2, turn: ['snare'] },
    { until: 18, pace: 130, rest: 1.05, turn: ['fan', 'snare'] },
    { until: 0, pace: 150, rest: 0.85, turn: ['fan', 'snare'] }
  ],
  near: 150,
  keep: 260,
  /** The whisk swept across in front of him. A `box` is measured from the ground under him, x forward and y up. */
  whisk: { windup: 0.5, seconds: 0.56, from: 0.08, until: 0.22, box: { x: -10, y: 0, width: 176, height: 150 } },
  /** The snare leaves his hand at `at`, flies `reach`, and comes back; a weapon that strikes it is taken. */
  snare: { windup: 0.5, seconds: 0.56, at: 0.11, speed: 560, reach: 560, back: 700, height: 66, radius: 19 },
  /** The fan sends `count` tongues of flame along the floor, `every` apart. */
  fan: { windup: 0.5, seconds: 1.1, at: 0.11, count: 3, every: 0.34, speed: 400, life: 1.5, from: 30 },
  /** A weapon the snare has taken is flung to the far end of the court, and lies there after `flight`. */
  staff: { flight: 0.8, reach: 34 },
  enter: { seconds: 1.4, from: 430 },
  roar: 1.4,
  /**
   * The furnace: it lasts `seconds`; its walls close for `closing` until only `room` is left between them; and
   * fire falls every `every`, shown on the floor for `warn` before it comes down at `speed`.
   */
  furnace: { seconds: 14, closing: 3, room: 470, wall: 40, every: 0.72, warn: 0.6, speed: 900, from: 470, width: 36, height: 64 },
  /** He is staggered this long when the furnace is broken out of, and by the blow that ends the combination. */
  broken: 3,
  stun: 1.2,
  steady: 2.6,
  yield: 2.2
};

export function createBoss(x, y, arena) {
  return { kind: 'laozi', x, y, home: x, arena, vx: 0, facing: -1, rise: LAOZI.enter.from, state: 'wait', move: null, time: 0, health: LAOZI.health, phase: 0, rest: 0, turn: 0, steady: 0, struck: 0, last: null, ring: null, staff: null, drops: [], dropped: 0, fires: [], serial: 0, gone: false };
}

const begin = (boss, state, move = null) => Object.assign(boss, { state, move, time: 0, struck: 0, serial: boss.serial + 1 });
const slow = (value, amount) => (value > 0 ? Math.max(0, value - amount) : Math.min(0, value + amount));
const phaseStart = boss => (boss.phase ? LAOZI.phases[boss.phase - 1].until : LAOZI.health);

export const present = boss => boss.state !== 'wait' && !boss.gone;
/** Whether the staff can find him now: not while he arrives or rages, nor while the furnace is shut. */
export const open = boss => boss.state === 'idle' || boss.state === 'windup' || boss.state === 'attack' || boss.state === 'stun';
/** Whether the Monkey King is shut in the furnace. */
export const shut = boss => boss.state === 'furnace';

export const bossBox = boss => ({ x: boss.x - LAOZI.halfWidth, y: boss.y - boss.rise - LAOZI.height, width: LAOZI.halfWidth * 2, height: LAOZI.height });

/** Where he would hurt at this moment: only the sweep of the whisk. */
export function bossReach(boss) {
  if (boss.state !== 'attack' || boss.move !== 'whisk' || boss.time < LAOZI.whisk.from || boss.time > LAOZI.whisk.until) return null;
  const { x, y, width, height } = LAOZI.whisk.box;
  return { x: boss.facing > 0 ? boss.x + x : boss.x - x - width, y: boss.y - y - height, width, height };
}

/** Where the furnace's two walls of fire stand at this moment, as the x of each one's inner face; nothing if it is not shut. */
export function furnaceWalls(boss) {
  if (!shut(boss)) return null;
  const { left, right } = boss.arena,
    spec = LAOZI.furnace,
    middle = (left + right) / 2,
    closed = Math.min(1, boss.time / spec.closing),
    half = (right - left) / 2 - 44 - ((right - left) / 2 - 44 - spec.room / 2) * closed * closed * (3 - 2 * closed);
  return { left: middle - half, right: middle + half };
}

/** Everything of his besides himself that hurts at this moment, each as `{ box, from }`: the furnace's walls and its falling fire. */
export function bossHazards(boss) {
  const walls = furnaceWalls(boss);
  if (!walls) return [];
  const spec = LAOZI.furnace,
    hurts = [
      { box: { x: walls.left - spec.wall, y: boss.y - 540, width: spec.wall, height: 540 }, from: walls.left - 60 },
      { box: { x: walls.right, y: boss.y - 540, width: spec.wall, height: 540 }, from: walls.right + 60 }
    ];
  for (const drop of boss.drops) if (drop.warn <= 0) hurts.push({ box: { x: drop.x - spec.width / 2, y: drop.y - spec.height, width: spec.width, height: spec.height }, from: drop.x });
  return hurts;
}

/**
 * A blow lands on him. A light one does not move him; the last of the combination staggers him, unless he was
 * staggered a moment ago or is in a move of his own. He cannot be taken below the end of his phase at a stroke,
 * and at the end of his second he shuts the furnace. Returns `boss-hurt`, `boss-stun`, `boss-phase`,
 * `furnace-shut` or `boss-down`.
 */
export function hitBoss(boss, attack) {
  const floor = LAOZI.phases[boss.phase].until;
  boss.health = Math.max(floor, boss.health - attack.power);
  if (boss.health === floor) {
    Object.assign(boss, { ring: null, vx: 0 });
    if (floor === 0) return begin(boss, 'yield'), [{ type: 'boss-down' }];
    boss.phase++;
    boss.turn = 0;
    boss.last = 'whisk';
    if (boss.phase === 2) return begin(boss, 'furnace'), Object.assign(boss, { drops: [], dropped: 0 }), [{ type: 'furnace-shut' }];
    return begin(boss, 'roar'), [{ type: 'boss-phase', phase: boss.phase }];
  }
  if (!(attack.kind === 'slam' && boss.steady === 0 && (boss.state === 'idle' || boss.state === 'windup'))) return [{ type: 'boss-hurt' }];
  begin(boss, 'stun');
  boss.stunned = LAOZI.stun;
  boss.steady = LAOZI.stun + LAOZI.steady;
  boss.vx = -boss.facing * 120;
  return [{ type: 'boss-stun' }];
}

export function wakeBoss(boss) {
  begin(boss, 'enter');
  boss.rise = LAOZI.enter.from;
  return [{ type: 'boss-enter' }];
}

/**
 * Puts the fight back to the start of the phase it had reached. A furnace he had shut is not shut again: whoever
 * fell in it comes back to face him without the eyes of fire.
 */
export function restoreBoss(boss) {
  Object.assign(boss, { x: boss.home, vx: 0, rise: 0, facing: -1, health: phaseStart(boss), rest: 1.4, turn: 0, last: null, steady: 0, ring: null, staff: null, drops: [], dropped: 0 });
  begin(boss, 'idle');
}

/** The snare has met a weapon: it carries it off, and he flings it to the end of the court furthest from its owner. */
export function takeStaff(boss, hero) {
  const ring = boss.ring;
  if (!ring || ring.taken) return [];
  Object.assign(ring, { taken: true, back: true, owner: hero.x });
  return [{ type: 'staff-taken', at: { x: ring.x, y: ring.y } }];
}

/** Numbers that look like chance and are the same every time. */
const scatter = n => ((Math.imul(n + 7, 2654435761) >>> 0) / 4294967296) * 2 - 1;

/**
 * One step. `hero` is who he is fighting (`{ x, y, state }`). Returns what happened: `boss-ready`, `boss-windup`
 * and `boss-strike` (each with the move), `ring`, `ring-caught`, `arrow` (a tongue of flame, with the arrow),
 * `staff-thrown`, `drop` and `drop-landed` in the furnace, `furnace-broken`, and `boss-gone`.
 */
export function stepBoss(boss, hero, dt) {
  const events = [];
  if (!present(boss)) return events;
  const phase = LAOZI.phases[boss.phase],
    dx = hero.x - boss.x,
    { left, right } = boss.arena;
  boss.time += dt;
  boss.rest = Math.max(0, boss.rest - dt);
  boss.steady = Math.max(0, boss.steady - dt);
  if (boss.staff && boss.staff.wait > 0) boss.staff.wait -= dt;

  if (boss.state === 'enter') {
    const still = Math.max(0, 1 - boss.time / LAOZI.enter.seconds);
    boss.rise = LAOZI.enter.from * still * still;
    boss.facing = dx >= 0 ? 1 : -1;
    if (boss.time >= LAOZI.enter.seconds) (begin(boss, 'idle'), (boss.rest = 0.8), (boss.rise = 0), events.push({ type: 'boss-ready' }));
  } else if (boss.state === 'furnace') {
    // He stands outside it. Inside, fire is shown on the floor and then falls there: now where the Monkey King
    // stands, now somewhere else between the walls.
    const spec = LAOZI.furnace,
      walls = furnaceWalls(boss);
    if (boss.time >= (boss.dropped + 1) * spec.every && boss.time < spec.seconds - 1) {
      const n = boss.dropped++,
        x = n % 2 ? hero.x : (walls.left + walls.right) / 2 + (scatter(n) * (walls.right - walls.left - 80)) / 2;
      boss.drops.push({ x: Math.min(walls.right - 30, Math.max(walls.left + 30, x)), y: boss.y - spec.from, warn: spec.warn });
      events.push({ type: 'drop', drop: boss.drops.at(-1) });
    }
    for (const drop of boss.drops) {
      if (drop.warn > 0) drop.warn -= dt;
      else if ((drop.y += spec.speed * dt) >= boss.y) ((drop.done = true), events.push({ type: 'drop-landed', at: { x: drop.x, y: boss.y } }));
    }
    boss.drops = boss.drops.filter(drop => !drop.done);
    if (boss.time >= spec.seconds) {
      // He breaks out, and the one who shut him in is thrown back on his heels.
      Object.assign(boss, { x: boss.home, drops: [] });
      begin(boss, 'stun');
      boss.stunned = LAOZI.broken;
      boss.steady = LAOZI.broken + LAOZI.steady;
      events.push({ type: 'furnace-broken' });
    }
  } else if (boss.state === 'roar' || boss.state === 'stun' || boss.state === 'yield') {
    boss.vx = slow(boss.vx, 300 * dt);
    if (boss.state === 'yield') {
      if (boss.time >= LAOZI.yield) ((boss.gone = true), events.push({ type: 'boss-gone' }));
    } else if (boss.time >= (boss.state === 'roar' ? LAOZI.roar : boss.stunned)) (begin(boss, 'idle'), (boss.rest = 0.5));
  } else if (boss.state === 'windup') {
    boss.vx = 0;
    if (boss.time >= LAOZI[boss.move].windup) (begin(boss, 'attack', boss.move), events.push({ type: 'boss-strike', move: boss.move }));
  } else if (boss.state === 'attack') {
    const move = LAOZI[boss.move];
    if (boss.move === 'snare' && !boss.struck && boss.time >= move.at) {
      boss.struck = 1;
      boss.ring = { x: boss.x + boss.facing * 30, y: boss.y - move.height, vx: boss.facing * move.speed, from: boss.x, back: false, taken: false };
      events.push({ type: 'ring', ring: boss.ring });
    } else if (boss.move === 'fan' && boss.struck < move.count && boss.time >= move.at + boss.struck * move.every) {
      boss.struck++;
      events.push({ type: 'arrow', arrow: { kind: 'ember', x: boss.x + boss.facing * 40, y: boss.y - move.from, vx: boss.facing * move.speed, vy: 0, life: move.life } });
    }
    if (boss.time >= move.seconds) (begin(boss, 'idle'), (boss.rest = phase.rest));
  } else {
    // Free to act: he faces the Monkey King and keeps a fair way off, and when he has rested he makes his next move.
    boss.facing = dx >= 0 ? 1 : -1;
    const gap = Math.abs(dx),
      want = gap > LAOZI.keep + 40 ? boss.facing : 0;
    boss.vx += Math.max(-900 * dt, Math.min(900 * dt, want * phase.pace - boss.vx));
    if (boss.rest === 0 && !boss.ring && hero.state !== 'down') {
      // Whoever crowds him is swept away, but not twice running: his other moves still take their turn.
      const crowded = gap < LAOZI.near && boss.last !== 'whisk',
        next = crowded ? 'whisk' : phase.turn[boss.turn % phase.turn.length];
      if (!crowded) boss.turn++;
      begin(boss, 'windup', next);
      boss.last = next;
      boss.vx = 0;
      events.push({ type: 'boss-windup', move: next });
    }
  }
  boss.x = Math.min(right - LAOZI.halfWidth * 2, Math.max(left + LAOZI.halfWidth * 2, boss.x + boss.vx * dt));

  // The snare flies out, turns, and comes home to his hand, with whatever it has taken.
  const ring = boss.ring;
  if (ring) {
    if (!ring.back && (Math.abs(ring.x - ring.from) >= LAOZI.snare.reach || ring.x <= left + 20 || ring.x >= right - 20)) ring.back = true;
    if (ring.back) ring.vx = Math.sign(boss.x - ring.x || 1) * LAOZI.snare.back;
    ring.x += ring.vx * dt;
    if (ring.back && Math.abs(ring.x - boss.x) <= Math.abs(ring.vx) * dt + 24) {
      boss.ring = null;
      events.push({ type: 'ring-caught' });
      if (ring.taken) {
        boss.staff = { x: ring.owner < (left + right) / 2 ? right - 110 : left + 110, y: boss.y, wait: LAOZI.staff.flight, from: { x: boss.x, y: boss.y - 80 } };
        events.push({ type: 'staff-thrown', staff: boss.staff });
      }
    }
  }
  return events;
}

/** The animation that shows what he is doing, whether it goes round, and a number that changes when it should start again. */
export function bossAnimation(boss) {
  if (boss.state === 'windup') return { name: 'windup', loop: false, key: boss.serial };
  if (boss.state === 'attack') return { name: 'attack', loop: false, key: boss.serial };
  if (boss.state === 'roar' || boss.state === 'stun') return { name: boss.state, loop: false, key: boss.serial };
  if (boss.state === 'yield') return { name: 'down', loop: false, key: boss.serial };
  return { name: Math.abs(boss.vx) > 40 ? 'walk' : 'idle', loop: true, key: 0 };
}
