// 可种子化随机。
//
// 棋盘掉落、抽牌、敌人行动全走这一个源。带上种子就能把一局复现出来——
// 手感调到一半发现"这个连锁不对劲"，没有种子就只能靠运气再碰一次。

/** mulberry32：三十二位状态，够快，分布够好，不需要依赖。 */
export function createRng(seed = 1) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    seed,
    /** [0, 1) */
    next,
    /** [0, n) 的整数 */
    int: (n) => Math.floor(next() * n),
    /** 从数组里取一个 */
    pick: (list) => list[Math.floor(next() * list.length)],
    /** 按权重取一个下标；权重不必归一 */
    weighted(weights) {
      let total = 0;
      for (const weight of weights) total += weight;
      if (!(total > 0)) return 0;
      let roll = next() * total;
      for (let i = 0; i < weights.length; i += 1) {
        roll -= weights[i];
        if (roll < 0) return i;
      }
      return weights.length - 1;
    },
    /** 原地洗牌，返回同一个数组 */
    shuffle(list) {
      for (let i = list.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    },
    /** 存一份状态，用于回放 */
    snapshot: () => state,
  };
}
