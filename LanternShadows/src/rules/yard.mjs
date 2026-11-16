// The practice yard before the Southern Gate: its ledges, its practice posts, and the count of blows landed in a row.

export const STAGE = { width: 960, height: 540 };
/** The top of the terrace, as a y of the stage. */
export const GROUND = 446;

export const YARD = {
  width: 1920,
  floors: [
    { x: 0, y: GROUND, width: 1920 },
    // Clouds to stand on.
    { x: 742, y: 330, width: 150, cloud: true },
    { x: 1010, y: 236, width: 150, cloud: true },
    { x: 1250, y: 330, width: 150, cloud: true }
  ],
  gate: { x: 1590 },
  start: { x: 250, y: GROUND },
  posts: [
    { x: 520, y: GROUND },
    { x: 1085, y: 236 },
    { x: 1600, y: GROUND }
  ]
};

/** How long the count of blows waits for the next one. */
export const COMBO_SECONDS = 1.9;
const POST = { halfWidth: 20, height: 112 };

export function createYard() {
  return { posts: YARD.posts.map((post, index) => ({ ...post, index, hits: 0 })), combo: 0, best: 0, timer: 0, total: 0 };
}

const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
export const postBox = post => ({ x: post.x - POST.halfWidth, y: post.y - POST.height, width: POST.halfWidth * 2, height: POST.height });

/**
 * A blow sweeps `box`, coming from the side `from` (the striker's x). Returns the posts it met, each with the
 * place it was struck and the side it was struck from (1 when the striker stands to its left).
 */
export function strike(yard, box, from, attack) {
  const met = [];
  for (const post of yard.posts) {
    const target = postBox(post);
    if (!overlaps(box, target)) continue;
    post.hits += attack.power;
    yard.combo += 1;
    yard.total += attack.power;
    yard.best = Math.max(yard.best, yard.combo);
    yard.timer = COMBO_SECONDS;
    const top = Math.max(box.y, target.y),
      bottom = Math.min(box.y + box.height, target.y + target.height);
    met.push({ post, side: from <= post.x ? 1 : -1, at: { x: post.x + (from <= post.x ? -8 : 8), y: (top + bottom) / 2 } });
  }
  return met;
}

/** How near a post he may stand. */
export const POST_ROOM = 58;
/**
 * A post is in the way of anyone on its ledge: he is put back on the side he came from. The cloud roll goes
 * through, which is how he gets behind one.
 */
export function keepApart(hero, yard) {
  if (hero.state === 'dash') return;
  for (const post of yard.posts) {
    if (Math.abs(hero.y - post.y) > 40 || Math.abs(hero.x - post.x) >= POST_ROOM) continue;
    const side = hero.x === post.x ? -hero.facing : Math.sign(hero.x - post.x);
    hero.x = post.x + side * POST_ROOM;
    if (Math.sign(hero.vx) === -side) hero.vx = 0;
  }
}

/** Lets the count lapse. Returns true on the step it does. */
export function stepYard(yard, dt) {
  if (yard.combo === 0) return false;
  yard.timer -= dt;
  if (yard.timer > 0) return false;
  yard.combo = 0;
  return true;
}
