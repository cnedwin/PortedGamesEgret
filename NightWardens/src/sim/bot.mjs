// 替身玩家：一个简单的守城人，用来在 Node 里整夜整夜地跑，量一夜多长、城墙掉多少、哪一夜守不住。
// 它不是人：它找出坏掉的规则和失控的数值，手感和难度还要真人来试。
// A stand-in player: a plain warden used to play whole nights in Node and measure how long a night runs, how much of
// the wall is lost and which nights fall. It is not a person: it finds broken rules and runaway numbers, while feel and
// difficulty still need people to play.
import { HAUNTS } from './data.mjs';
import { FIELD, choose, thunderReady } from './world.mjs';

/** The order a careless but sensible player takes wards in, best first. `skill` 0..1 is how well it moves. */
const LIKES = ['volley', 'haste', 'cinnabar', 'pierce', 'chain', 'fire', 'crit', 'mirror', 'ink', 'wall', 'frost', 'thunder'];

export function createBot(world, { skill = 0.7 } = {}) {
  return {
    /** What the bot does this step: it may choose a ward, and returns the input for `step`. */
    think() {
      if (world.offer) {
        const pick = [...world.offer].sort((a, b) => LIKES.indexOf(a) - LIKES.indexOf(b))[0];
        choose(world, pick);
      }
      // Stand under the greatest danger: the haunt nearest the wall, one spitting fire, or the warden.
      let goal = FIELD.width / 2,
        lowest = -Infinity;
      for (const haunt of world.haunts) {
        const danger = haunt.y + (HAUNTS[haunt.kind].shoot ? 260 : 0);
        if (danger > lowest) {
          lowest = danger;
          goal = haunt.x;
        }
      }
      if (world.boss && world.boss.y > lowest - 120) goal = world.boss.x;
      const gap = goal - world.turret.x,
        move = Math.abs(gap) < 12 ? 0 : Math.sign(gap) * skill;
      const crowd = world.haunts.filter((h) => h.y > 200).length;
      return { move, thunder: thunderReady(world) && (crowd >= 14 || (world.boss && world.boss.y > 200)) };
    }
  };
}
