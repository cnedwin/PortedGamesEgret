// 随机数：一个种子决定一整夜（mulberry32）。规则里所有的偶然都从这里来，所以同一个种子、同样的操作，
// 在浏览器和 Node 里走出的一夜完全一样。
// Chance: one seed decides a whole night (mulberry32). Every chance in the rules comes from here, so the same seed and
// the same input play out the same night in a browser and in Node.

/** A seeded generator with the few helpers the rules use. */
export function createChance(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** A number in [min, max). */
    range: (min, max) => min + next() * (max - min),
    /** One of `items`, each as likely as its weight in `weights`. */
    weighted(items, weights) {
      let total = 0;
      for (const w of weights) total += w;
      let roll = next() * total;
      for (let i = 0; i < items.length; i++) {
        roll -= weights[i];
        if (roll < 0) return items[i];
      }
      return items[items.length - 1];
    }
  };
}
