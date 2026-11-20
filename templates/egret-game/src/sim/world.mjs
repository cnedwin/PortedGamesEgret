// 规则：一块场地、一个可以走动的角色和场地上散落的光点。纯函数，不碰页面也不碰引擎，所以能在 Node 里测、
// 能用同一个种子重放。新游戏把这里换成自己的规则，界面只读这里的状态。
// The rules: a field, one character who walks on it, and points of light scattered over it. Plain functions that
// touch neither the page nor the engine, so they are tested in Node and replayed from one seed. A new game puts its
// own rules here; the view only reads this state.

export const FIELD = { width: 960, height: 540, margin: 40 };
export const SPEED = 220;
export const REACH = 26;

/** A small seeded random generator (mulberry32): the same seed gives the same field. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A new field from `seed`: the character in the middle and `count` lights spread around it. */
export function createWorld(seed = 1, count = 8) {
  const random = seeded(seed),
    lights = [];
  while (lights.length < count) {
    const x = FIELD.margin + random() * (FIELD.width - FIELD.margin * 2),
      y = FIELD.margin + 60 + random() * (FIELD.height - FIELD.margin * 2 - 60);
    // Not on top of the character, and not on top of another light.
    if (Math.hypot(x - FIELD.width / 2, y - FIELD.height / 2) < 80) continue;
    if (lights.some((light) => Math.hypot(light.x - x, light.y - y) < 60)) continue;
    lights.push({ x, y, taken: false });
  }
  return { seed, time: 0, hero: { x: FIELD.width / 2, y: FIELD.height / 2, facing: 1, moving: false }, lights, taken: 0 };
}

/**
 * One step of `seconds`. `move` is where the player pushes, each axis -1..1 (a stick, keys or touch). The character
 * walks at a fixed speed, stays on the field, and takes any light within reach. Returns the lights taken this step.
 */
export function step(world, move, seconds) {
  const length = Math.hypot(move.x, move.y),
    scale = length > 1 ? 1 / length : 1,
    hero = world.hero;
  hero.x = Math.min(FIELD.width - FIELD.margin, Math.max(FIELD.margin, hero.x + move.x * scale * SPEED * seconds));
  hero.y = Math.min(FIELD.height - FIELD.margin, Math.max(FIELD.margin + 40, hero.y + move.y * scale * SPEED * seconds));
  hero.moving = length > 0.05;
  if (Math.abs(move.x) > 0.05) hero.facing = Math.sign(move.x);
  world.time += seconds;
  const taken = [];
  for (const light of world.lights)
    if (!light.taken && Math.hypot(light.x - hero.x, light.y - hero.y) < REACH) {
      light.taken = true;
      world.taken++;
      taken.push(light);
    }
  return taken;
}

/** Whether every light has been taken. */
export const cleared = (world) => world.taken === world.lights.length;
