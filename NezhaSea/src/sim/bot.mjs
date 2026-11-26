// 电脑玩家：躲开近处的兵和水弹、去捡珍珠、离墙远一点；在集市里先买能合成的法宝，再买伤害和血量，能合成就合成；
// 升级时挑伤害、攻速和血量。给平衡脚本和测试用。
// A computer player: it keeps away from soldiers and water near it, goes for pearls and stays off the walls; in the
// market it buys treasures it can merge first, then damage and health, and merges whatever it can; at a level it
// takes damage, speed of attack and health. For the balance script and the tests.
import { DIVINE, FIELD, ITEMS, WEAPONS } from './data.mjs';
import { buy, chooseLevelUp, createRun, merge, mergeResult, nextWave, placeFor, reroll, rerollPrice, step } from './world.mjs';

/** Where to go: away from danger, towards pearls, off the walls. */
export function steer(run, { brave = 1 } = {}) {
  const p = run.player;
  let x = 0,
    y = 0;
  for (const enemy of run.enemies) {
    const dx = p.x - enemy.x,
      dy = p.y - enemy.y,
      d2 = dx * dx + dy * dy;
    if (d2 > 150 * 150) continue;
    const w = 4000 / Math.max(d2, 100);
    x += dx * w * 0.02;
    y += dy * w * 0.02;
  }
  for (const spit of run.spits) {
    const dx = p.x - spit.x,
      dy = p.y - spit.y,
      d2 = dx * dx + dy * dy;
    if (d2 < 90 * 90) {
      x += dx * (3000 / Math.max(d2, 100)) * 0.03;
      y += dy * (3000 / Math.max(d2, 100)) * 0.03;
    }
  }
  let best = null,
    bestD = 260 * brave;
  for (const drop of run.drops) {
    const d = Math.hypot(drop.x - p.x, drop.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = drop;
    }
  }
  if (best && Math.hypot(x, y) < 1.2) {
    x += ((best.x - p.x) / (bestD || 1)) * 0.8;
    y += ((best.y - p.y) / (bestD || 1)) * 0.8;
  }
  // Off the walls, and a little towards the middle, where there is room to turn.
  x += ((FIELD.width / 2 - p.x) / FIELD.width) * 0.9 + (p.x < 70 ? 1 : p.x > FIELD.width - 70 ? -1 : 0);
  y += ((FIELD.height / 2 - p.y) / FIELD.height) * 0.9 + (p.y < 70 ? 1 : p.y > FIELD.height - 70 ? -1 : 0);
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}

const LIKED = ['damage', 'attackSpeed', 'maxHp', 'armor', 'regen', 'lifesteal', 'crit', 'range'];
const worth = (stats) => Object.entries(stats).reduce((sum, [key, value]) => sum + value * (LIKED.includes(key) ? 8 - LIKED.indexOf(key) : 1), 0);

/** Spend the market: merges first, then treasures that will merge, then the best items. */
export function shopAround(run, { greedy = true } = {}) {
  for (let changed = true; changed; ) {
    changed = false;
    for (let a = 0; a < run.weapons.length && !changed; a++)
      for (let b = 0; b < run.weapons.length && !changed; b++) if (a !== b && mergeResult(run, a, b)) changed = merge(run, Math.min(a, b), Math.max(a, b)).ok;
  }
  for (let round = 0; round < 3; round++) {
    const offers = run.shop.offers
      .map((offer, index) => ({ offer, index }))
      .filter(({ offer }) => !offer.sold && offer.price <= run.pearls)
      .map(({ offer, index }) => {
        let score = 0;
        if (offer.type === 'weapon') {
          const place = placeFor(run, offer.kind, offer.tier);
          if (!place) return null;
          const same = run.weapons.some((w) => w.kind === offer.kind && w.tier === offer.tier);
          const pairs = Object.values(DIVINE).some((recipe) => recipe.from.includes(offer.kind) && run.weapons.some((w) => recipe.from.includes(w.kind) && w.kind !== offer.kind));
          score = 30 + (run.weapons.length < 4 ? 40 : 0) + (place.merge || same ? 40 : 0) + (pairs ? 10 : 0) + offer.tier * 15 - offer.price * 0.2 + (WEAPONS[offer.kind].kind === 'orbit' ? 5 : 0);
        } else score = worth(ITEMS[offer.kind].stats) - offer.price * 0.3;
        return { index, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
    if (!offers.length) {
      if (greedy && run.pearls > rerollPrice(run) + 40 && reroll(run).ok) continue;
      break;
    }
    for (const { index } of offers) buy(run, index);
    for (let changed = true; changed; ) {
      changed = false;
      for (let a = 0; a < run.weapons.length && !changed; a++)
        for (let b = 0; b < run.weapons.length && !changed; b++) if (a !== b && mergeResult(run, a, b)) changed = merge(run, Math.min(a, b), Math.max(a, b)).ok;
    }
  }
}

/** Play a whole game. Returns the finished run. */
export function playOut({ seed = 1, hero = 'boy', danger = 0, still = false, shop = true, limit = 3000 } = {}) {
  const run = createRun({ seed, hero, danger });
  const tick = 1 / 30;
  while (run.phase !== 'won' && run.phase !== 'lost' && run.time < limit) {
    if (run.phase === 'wave') step(run, tick, still ? { x: 0, y: 0 } : steer(run));
    else if (run.phase === 'levelUp') {
      const best = run.choices.map((choice, index) => ({ index, score: worth(choice.stats) })).sort((a, b) => b.score - a.score)[0];
      chooseLevelUp(run, best.index);
    } else if (run.phase === 'shop') {
      if (shop) shopAround(run);
      nextWave(run);
    }
  }
  return run;
}
