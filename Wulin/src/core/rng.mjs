// A small seeded random source. The whole simulation draws from one of these,
// so a seed plus the player's choices replays a game exactly, and a save can
// store the generator's position as a single number.

/**
 * @param {number} seed any integer
 * @returns {{next():number, range(a:number,b:number):number, int(a:number,b:number):number,
 *   chance(p:number):boolean, pick<T>(list:T[]):T, state:number}}
 */
export function createRng(seed) {
  const rng = {
    /** The generator's position; assign it to continue from a saved game. */
    state: seed >>> 0 || 1,
    /** A number in [0, 1). */
    next() {
      // mulberry32
      let t = (rng.state = (rng.state + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** A number in [a, b). */
    range(a, b) {
      return a + (b - a) * rng.next();
    },
    /** An integer in [a, b], both ends included. */
    int(a, b) {
      return a + Math.floor(rng.next() * (b - a + 1));
    },
    chance(p) {
      return rng.next() < p;
    },
    pick(list) {
      return list[Math.floor(rng.next() * list.length)];
    },
  };
  return rng;
}

/** Keeps a value inside [low, high]. */
export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
