// 演出队列。
//
// 所有动画排成一队，一条接一条播。队列非空时锁输入——玩家连点会把演出叠在一起，
// 画面变成一团乱麻，这是同类 demo 最常见的崩坏点（设计文档 10.2）。
//
// 时间单位是毫秒，喂进来的是秒（引擎每帧给的是秒）。

export const ease = {
  linear: (t) => t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inQuad: (t) => t * t,
  inCubic: (t) => t * t * t,
  outBack: (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
  outElastic: (t) => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin(((t - 0.075) * (2 * Math.PI)) / 0.3) + 1),
};

export function createSequence() {
  const items = [];
  let current = null;

  const step = (item) => {
    item.t = 0;
    if (item.ms <= 0) {
      item.update?.(1, 1);
      item.done?.();
      return false;
    }
    item.update?.(0, 0);
    return true;
  };

  return {
    /** 单纯等一段时间。hitstop 也用它——队列停住，画面就定格了。 */
    wait(ms) {
      items.push({ ms, update: null });
      return this;
    },
    /** 一段补间：`update(值, 原始进度)`，值经过缓动。 */
    tween(ms, update, { ease: easing = ease.outQuad, done } = {}) {
      items.push({ ms, update, easing, done });
      return this;
    },
    /** 零时长的回调，用来在队列中间插一句状态变更。 */
    call(done) {
      items.push({ ms: 0, done });
      return this;
    },
    update(seconds) {
      let budget = seconds * 1000;
      let guard = 0;
      while (budget > 0 && guard < 400) {
        guard += 1;
        if (!current) {
          const next = items.shift();
          if (!next) return;
          current = next;
          if (!step(current)) {
            current = null;
            continue;
          }
        }
        const need = current.ms - current.t;
        const used = Math.min(budget, need);
        current.t += used;
        budget -= used;
        const raw = current.t / current.ms;
        current.update?.(current.easing ? current.easing(raw) : raw, raw);
        if (current.t >= current.ms) {
          current.done?.();
          current = null;
        } else break;
      }
    },
    get busy() {
      return current !== null || items.length > 0;
    },
    get pending() {
      return items.length + (current ? 1 : 0);
    },
    clear() {
      items.length = 0;
      current = null;
    },
  };
}

/** 简易状态机式的补间：给一组目标值，返回一个能喂进 tween 的函数。 */
export function tweenTo(target, props) {
  const from = {};
  for (const key of Object.keys(props)) from[key] = target[key];
  return (t) => {
    for (const key of Object.keys(props)) target[key] = from[key] + (props[key] - from[key]) * t;
  };
}
