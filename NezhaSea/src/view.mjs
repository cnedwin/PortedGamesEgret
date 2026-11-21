// 画面：用引擎的 play 画哪吒、水族兵、法宝的出手、珍珠和水弹。所有会动的东西都只用矩形拼成剪纸的样子——每帧移动
// 的矩形在引擎里最省（见 ENGINE-NOTES）；同类的精灵放在池子里反复用。画面只读规则的状态和事件，不改它们。
// The view: Nezha, the sea soldiers, the treasures' strokes, the pearls and the water, drawn with the engine's play.
// Everything that moves is cut from rectangles, like paper cuts — moving rectangles are what the engine draws most
// cheaply (see ENGINE-NOTES) — and sprites of a kind are kept in pools and used again. The view only reads the
// state and the events of the rules, and never changes them.
import { ENEMIES } from './sim/data.mjs';
import { PLAYER, specOf, statsOf } from './sim/world.mjs';

export const RED = 0xd1342b,
  GOLD = 0xe8b84a,
  SKIN = 0xf2d0a4,
  INK = 0x14202b,
  PAPER = 0xf4ecd8,
  SEA = 0x0d2a3a;

/** Rectangles, as `[x, y, width, height, colour, alpha]`. */
const paint = (g, parts) => {
  for (const [x, y, w, h, color, alpha = 1] of parts) g.beginFill(color, alpha).drawRect(x, y, w, h).endFill();
};

/** Nezha, facing right: hair in two buns, a red tunic, the ring at her neck, a wheel under each foot. */
function drawNezha(g) {
  paint(g, [
    [-11, 10, 8, 6, GOLD],
    [3, 10, 8, 6, GOLD],
    [-9, 12, 4, 2, RED],
    [5, 12, 4, 2, RED],
    [-8, -6, 16, 17, RED],
    [-9, -7, 18, 3, GOLD],
    [-7, -18, 14, 12, SKIN],
    [-9, -24, 6, 6, INK],
    [3, -24, 6, 6, INK],
    [-7, -19, 14, 3, INK],
    [2, -13, 2, 2, INK],
    [-3, -10, 3, 1, RED],
    [8, -4, 4, 9, SKIN]
  ]);
}

/** Each soldier, facing right, by kind. */
const SOLDIERS = {
  shrimp: (g) =>
    paint(g, [
      [-17, -6, 5, 12, 0x2f8f86],
      [-12, -4, 8, 8, 0x46b3a8],
      [-4, -5, 8, 10, 0x46b3a8],
      [4, -4, 7, 8, 0x5cc8bc],
      [10, -6, 10, 1, PAPER, 0.8],
      [10, 5, 10, 1, PAPER, 0.8],
      [7, -3, 2, 2, INK]
    ]),
  crab: (g) =>
    paint(g, [
      [-16, -12, 4, 2, 0x2a5f62],
      [-16, 10, 4, 2, 0x2a5f62],
      [-18, -4, 4, 2, 0x2a5f62],
      [-18, 3, 4, 2, 0x2a5f62],
      [-12, -9, 24, 18, 0x2f6f73],
      [-9, -7, 18, 4, 0x3f8a8e],
      [12, -15, 8, 8, 0x3f8a8e],
      [12, 7, 8, 8, 0x3f8a8e],
      [7, -4, 3, 3, PAPER],
      [7, 2, 3, 3, PAPER]
    ]),
  jelly: (g) =>
    paint(g, [
      [-10, -11, 20, 12, 0x9ad1d4, 0.9],
      [-7, -14, 14, 4, 0xc5e8ea, 0.9],
      [-8, 1, 2, 10, 0x9ad1d4, 0.75],
      [-3, 1, 2, 13, 0x9ad1d4, 0.75],
      [2, 1, 2, 11, 0x9ad1d4, 0.75],
      [7, 1, 2, 8, 0x9ad1d4, 0.75]
    ]),
  shark: (g) =>
    paint(g, [
      [-22, -8, 6, 16, 0x2f4766],
      [-16, -6, 28, 12, 0x3d5a80],
      [12, -4, 7, 8, 0x3d5a80],
      [-5, -13, 9, 7, 0x2f4766],
      [-12, 2, 22, 4, 0x98a8c0],
      [9, -3, 2, 2, PAPER]
    ]),
  puffer: (g) =>
    paint(g, [
      [-12, -12, 24, 24, 0xc9d66b],
      [-8, 2, 16, 8, 0xe9edb8],
      [-16, -2, 4, 4, 0x8e9b3c],
      [12, -2, 4, 4, 0x8e9b3c],
      [-2, -16, 4, 4, 0x8e9b3c],
      [-2, 12, 4, 4, 0x8e9b3c],
      [-13, -13, 3, 3, 0x8e9b3c],
      [10, -13, 3, 3, 0x8e9b3c],
      [4, -6, 3, 3, INK]
    ]),
  conch: (g) =>
    paint(g, [
      [-11, -8, 22, 18, 0xd8c3a5],
      [-7, -14, 14, 7, 0xe7d7bd],
      [-3, -19, 6, 6, 0xf2e6d0],
      [-9, 0, 10, 8, 0xb89b74],
      [8, -2, 6, 4, 0xb89b74]
    ]),
  yaksha: (g) =>
    paint(g, [
      [22, -44, 3, 74, GOLD],
      [16, -46, 15, 3, GOLD],
      [16, -52, 3, 7, GOLD],
      [28, -52, 3, 7, GOLD],
      [-18, -18, 36, 40, 0x4a2c5e],
      [-14, -12, 28, 6, 0x6b4a85],
      [-12, -34, 24, 17, 0x3b6ea5],
      [-12, -42, 5, 9, PAPER],
      [7, -42, 5, 9, PAPER],
      [-6, -29, 4, 4, GOLD],
      [3, -29, 4, 4, GOLD],
      [-5, -21, 10, 2, PAPER],
      [-20, 22, 12, 6, 0x2c1a38],
      [8, 22, 12, 6, 0x2c1a38]
    ]),
  aoBing: (g) =>
    paint(g, [
      [-22, -16, 40, 32, 0xdfeaf2],
      [-18, -12, 32, 6, 0xffffff],
      [14, -10, 12, 20, 0xdfeaf2],
      [-16, -28, 4, 14, GOLD],
      [8, -28, 4, 14, GOLD],
      [-20, -32, 6, 4, GOLD],
      [10, -32, 6, 4, GOLD],
      [24, 4, 18, 2, GOLD],
      [24, -6, 18, 2, GOLD],
      [6, -6, 5, 5, 0x3b6ea5],
      [20, -2, 6, 4, 0x8aa2b8]
    ])
};
const UPRIGHT = new Set(['crab', 'jelly', 'puffer', 'conch', 'yaksha']);
const BODY = (g) => paint(g, [[-13, -13, 26, 26, 0xdfeaf2], [-9, -9, 18, 18, 0xc9dbe8], [-3, -16, 6, 5, GOLD]]);

/** The moving part of the view, from the engine's play. */
export function createView(game) {
  const layers = { drops: game.sprite(), soldiers: game.sprite(), shots: game.sprite(), hero: game.sprite(), strokes: game.sprite(), words: game.sprite() };
  const pools = new Map();
  const take = (key, make) => {
    const list = pools.get(key) ?? [];
    pools.set(key, list);
    const sprite = list.pop() ?? make();
    sprite.visible = true;
    sprite.alpha = 1;
    sprite.scaleX = sprite.scaleY = 1;
    sprite.rotation = 0;
    return sprite;
  };
  const give = (key, sprite) => {
    sprite.visible = false;
    pools.get(key).push(sprite);
  };

  // Nezha, and the wheels and shadows of her orbiting treasures.
  // Drawn a little larger than the rules' circles, so a phone shows them clearly; the circles stay as they are.
  const LOOK = 1.4;
  const hero = game.sprite(drawNezha, layers.hero);
  hero.scaleY = 1.5;
  const ribbon = game.sprite((g) => paint(g, [[-30, -2, 30, 4, RED, 0.85], [-44, -1, 16, 2, RED, 0.6]]), layers.hero);
  const live = { soldiers: new Map(), drops: new Map(), shots: new Map(), spits: new Map(), wheels: [] };
  const strokes = [];
  const numbers = [];
  const tail = [],
    body = [];
  let tailTime = 0;

  function soldierSprite(enemy) {
    let entry = live.soldiers.get(enemy.id);
    if (!entry) {
      const sprite = take(`soldier:${enemy.kind}`, () => {
        const s = game.sprite(SOLDIERS[enemy.kind], layers.soldiers);
        s.kind = enemy.kind;
        return s;
      });
      entry = { sprite, kind: enemy.kind };
      live.soldiers.set(enemy.id, entry);
    }
    return entry;
  }

  function stroke(make, life, update) {
    const sprite = make();
    strokes.push({ sprite, life, age: 0, update });
  }

  function float(x, y, words, color) {
    if (numbers.length >= 10) return;
    const label = game.text(words, { x, y: y - 16, size: 14, color, align: 'center', bold: true, layer: layers.words });
    numbers.push({ label, age: 0 });
  }

  /** Everything put away, for a new game or the title. */
  function clear() {
    for (const [, entry] of live.soldiers) give(`soldier:${entry.kind}`, entry.sprite);
    live.soldiers.clear();
    for (const [, sprite] of live.drops) give('drop', sprite);
    live.drops.clear();
    for (const [key, map] of [
      ['shots', live.shots],
      ['spits', live.spits]
    ])
      for (const [, entry] of map) give(entry.key, entry.sprite);
    live.shots.clear();
    live.spits.clear();
    for (const s of strokes) game.remove(s.sprite);
    strokes.length = 0;
    for (const n of numbers) game.remove(n.label);
    numbers.length = 0;
    for (const w of live.wheels) w.visible = false;
    for (const s of body) s.visible = false;
    tail.length = 0;
    hero.visible = ribbon.visible = false;
  }

  return {
    clear,
    show(run, events, seconds) {
      const p = run.player;
      hero.visible = ribbon.visible = true;
      hero.x = p.x;
      hero.y = p.y;
      const left = Math.cos(p.facing) < -0.1;
      hero.scaleX = left ? -1.5 : 1.5;
      hero.alpha = p.guard > 0 && Math.floor(run.time * 20) % 2 ? 0.35 : 1;
      ribbon.x = p.x;
      ribbon.y = p.y - 3;
      ribbon.scaleX = ribbon.scaleY = 1.4;
      ribbon.rotation = ((p.facing * 180) / Math.PI) + Math.sin(run.time * 9) * 12;

      // Orbiting treasures: the wheels, drawn where the rules turn them.
      let wheel = 0;
      const range = statsOf(run).range;
      run.weapons.forEach((weapon) => {
        const spec = specOf(weapon);
        if (spec.kind !== 'orbit') return;
        const reach = spec.reach * (1 + range / 100);
        for (let k = 0; k < spec.count; k++, wheel++) {
          let sprite = live.wheels[wheel];
          if (!sprite) {
            sprite = live.wheels[wheel] = game.sprite((g) => paint(g, [[-8, -8, 16, 16, GOLD], [-5, -5, 10, 10, RED], [-2, -2, 4, 4, GOLD]]), layers.shots);
          }
          const a = weapon.angle + (k / spec.count) * Math.PI * 2;
          sprite.visible = true;
          sprite.x = p.x + Math.cos(a) * reach;
          sprite.y = p.y + Math.sin(a) * reach;
          sprite.rotation = (run.time * 720) % 360;
          sprite.scaleX = sprite.scaleY = weapon.divine ? 1.3 : 1;
        }
      });
      for (let i = wheel; i < live.wheels.length; i++) live.wheels[i].visible = false;

      // Soldiers: rising from the water, then moving; the dragon prince trails a body.
      const seen = new Set();
      for (const enemy of run.enemies) {
        seen.add(enemy.id);
        const { sprite } = soldierSprite(enemy);
        sprite.x = enemy.x;
        sprite.y = enemy.y;
        const rising = enemy.rising > 0;
        sprite.alpha = rising ? Math.max(0.15, 1 - enemy.rising / (ENEMIES[enemy.kind].boss ? 1.2 : 0.7)) : 1;
        const grow = LOOK * (rising ? 0.6 + 0.4 * sprite.alpha : enemy.state === 'fuse' ? 1 + (0.75 - enemy.stateLeft) * 0.6 : 1);
        if (UPRIGHT.has(enemy.kind)) {
          sprite.scaleX = (enemy.vx ?? 0) < 0 ? -grow : grow;
          sprite.scaleY = grow;
        } else {
          sprite.scaleX = sprite.scaleY = grow;
          if (!rising && (enemy.vx || enemy.vy)) sprite.rotation = (Math.atan2(enemy.vy, enemy.vx) * 180) / Math.PI;
        }
        if (enemy.state === 'aim' && Math.floor(run.time * 16) % 2) sprite.alpha = 0.5;
        if (enemy.kind === 'aoBing') {
          tailTime += seconds;
          if (tailTime > 0.05) {
            tailTime = 0;
            tail.unshift({ x: enemy.x, y: enemy.y });
            tail.length = Math.min(tail.length, 40);
          }
        }
      }
      for (const [id, entry] of live.soldiers)
        if (!seen.has(id)) {
          give(`soldier:${entry.kind}`, entry.sprite);
          live.soldiers.delete(id);
        }
      // Ao Bing's body: six scales following where his head has been.
      const boss = run.boss?.kind === 'aoBing' ? run.boss : null;
      for (let i = 0; i < 6; i++) {
        const segment = (body[i] ??= game.sprite(BODY, layers.soldiers));
        const at = tail[(i + 1) * 5];
        segment.visible = Boolean(boss && at);
        if (segment.visible) {
          segment.x = at.x;
          segment.y = at.y;
          segment.rotation = 45;
          segment.scaleX = segment.scaleY = 1 - i * 0.08;
        }
      }
      if (!boss) tail.length = 0;

      // Pearls.
      const pearls = new Set();
      for (const drop of run.drops) {
        pearls.add(drop.id);
        let sprite = live.drops.get(drop.id);
        if (!sprite) {
          sprite = take('drop', () => game.sprite((g) => paint(g, [[-4, -4, 8, 8, PAPER], [-2, -2, 4, 4, 0xbfe6ff]]), layers.drops));
          sprite.rotation = 45;
          live.drops.set(drop.id, sprite);
        }
        sprite.x = drop.x;
        sprite.y = drop.y;
      }
      for (const [id, sprite] of live.drops)
        if (!pearls.has(id)) {
          give('drop', sprite);
          live.drops.delete(id);
        }

      // Thrown rings and lobbed bricks.
      const flying = new Set();
      for (const shot of run.shots) {
        flying.add(shot.id);
        let entry = live.shots.get(shot.id);
        if (!entry) {
          const key = shot.type === 'ring' ? 'ring' : 'brick';
          const sprite = take(key, () =>
            game.sprite(
              (g) =>
                key === 'ring'
                  ? paint(g, [[-10, -10, 20, 4, GOLD], [-10, 6, 20, 4, GOLD], [-10, -10, 4, 20, GOLD], [6, -10, 4, 20, GOLD]])
                  : paint(g, [[-10, -6, 20, 12, GOLD], [-10, -6, 20, 3, 0xf7d98a], [-10, 3, 20, 3, 0xb88a2a]]),
              layers.shots
            )
          );
          entry = { sprite, key };
          live.shots.set(shot.id, entry);
        }
        if (shot.type === 'ring') {
          entry.sprite.x = shot.x;
          entry.sprite.y = shot.y;
          entry.sprite.rotation = (run.time * 900) % 360;
        } else {
          const k = Math.min(1, shot.t / shot.flight);
          entry.sprite.x = shot.x0 + (shot.x - shot.x0) * k;
          entry.sprite.y = shot.y0 + (shot.y - shot.y0) * k - Math.sin(k * Math.PI) * 70;
          entry.sprite.rotation = k * 360;
        }
      }
      for (const [id, entry] of live.shots)
        if (!flying.has(id)) {
          give(entry.key, entry.sprite);
          live.shots.delete(id);
        }

      // The soldiers' water, and Ao Bing's ice.
      const wet = new Set();
      for (const spit of run.spits) {
        wet.add(spit.id);
        let entry = live.spits.get(spit.id);
        if (!entry) {
          const key = spit.ice ? 'ice' : 'spit';
          const sprite = take(key, () => game.sprite((g) => paint(g, key === 'ice' ? [[-6, -6, 12, 12, 0xeaf6ff], [-3, -3, 6, 6, 0x9ad1f0]] : [[-5, -5, 10, 10, 0x6fd3e0], [-2, -2, 4, 4, PAPER]]), layers.shots));
          sprite.rotation = 45;
          entry = { sprite, key };
          live.spits.set(spit.id, entry);
        }
        entry.sprite.x = spit.x;
        entry.sprite.y = spit.y;
      }
      for (const [id, entry] of live.spits)
        if (!wet.has(id)) {
          give(entry.key, entry.sprite);
          live.spits.delete(id);
        }

      // What happened this step.
      const reduced = game.reducedMotion;
      let hits = 0;
      for (const event of events) {
        if (event.type === 'sweep') {
          const fan = (event.arc * Math.PI) / 180;
          for (let k = 0; k < 5; k++) {
            const a = event.angle - fan / 2 + (fan * k) / 4;
            stroke(
              () => {
                const s = game.sprite((g) => paint(g, [[0, -3, event.reach, 6, RED, 0.8]]), layers.strokes);
                s.x = event.x;
                s.y = event.y;
                s.rotation = (a * 180) / Math.PI;
                return s;
              },
              0.18
            );
          }
        } else if (event.type === 'thrust') {
          stroke(
            () => {
              const s = game.sprite((g) => paint(g, [[0, -event.width / 4, event.reach, event.width / 2, GOLD, 0.9], [event.reach - 10, -event.width / 2, 12, event.width, RED]]), layers.strokes);
              s.x = event.x;
              s.y = event.y;
              s.rotation = (event.angle * 180) / Math.PI;
              return s;
            },
            0.14
          );
        } else if (event.type === 'nova') {
          stroke(
            () => {
              const s = game.sprite((g) => g.lineStyle(6, 0xff7a3d, 0.9).drawCircle(0, 0, event.reach).lineStyle(0), layers.strokes);
              s.x = event.x;
              s.y = event.y;
              s.scaleX = s.scaleY = 0.4;
              return s;
            },
            0.3,
            (s, k) => (s.scaleX = s.scaleY = 0.4 + 0.6 * k)
          );
        } else if (event.type === 'land') game.burst(event.x, event.y, { color: GOLD, count: 10, speed: 140, life: 0.3, size: 3 });
        else if (event.type === 'burst') game.burst(event.x, event.y, { color: 0xc9d66b, count: 18, speed: 200, life: 0.4, size: 3 });
        else if (event.type === 'kill') game.burst(event.x, event.y, { color: PAPER, count: ENEMIES[event.kind].boss ? 40 : 6, speed: 120, life: 0.35, size: 2.5 });
        else if (event.type === 'hit' && (event.crit || hits++ < 3)) float(event.x, event.y, String(event.damage), event.crit ? GOLD : PAPER);
        else if (event.type === 'hurt') {
          if (!reduced) game.shake(4, 0.15);
          float(event.x, event.y - 10, `-${event.amount}`, 0xff6b5b);
        } else if (event.type === 'level') game.burst(p.x, p.y, { color: GOLD, count: 16, speed: 160, life: 0.5, size: 3 });
      }
      for (let i = strokes.length - 1; i >= 0; i--) {
        const s = strokes[i];
        s.age += seconds;
        const k = Math.min(1, s.age / s.life);
        s.sprite.alpha = 1 - k;
        s.update?.(s.sprite, k);
        if (k >= 1) {
          game.remove(s.sprite);
          strokes.splice(i, 1);
        }
      }
      for (let i = numbers.length - 1; i >= 0; i--) {
        const n = numbers[i];
        n.age += seconds;
        n.label.y -= seconds * (reduced ? 10 : 40);
        n.label.alpha = 1 - n.age / 0.7;
        if (n.age >= 0.7) {
          game.remove(n.label);
          numbers.splice(i, 1);
        }
      }
    }
  };
}

export { PLAYER };
