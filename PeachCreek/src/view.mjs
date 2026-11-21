// 引擎画的会动的东西：街上走的行人（人口越多越热闹）、溪上的小船、四季的花瓣落叶雪花和夏夜的萤火、收税时飞起的
// 铜钱和数字、建成时的一圈光、来敌攻城的一场小戏，以及当前选中地块的描边。引擎画布是舞台的四分之三大小，由游戏
// 自己的根节点缩放 0.75（见 ENGINE-NOTES）。
// What moves, drawn by the engine: people walking the streets (busier as the county grows), boats on the creek, the
// petals, leaves and snow of each season and summer fireflies, coins and numbers flying up from the yamen, a ring of
// light when something is built, a small play of a raid on the gate, and the outline of the chosen plot. The engine
// canvas is three quarters of the stage; the game's own root is scaled 0.75.
import { LAYOUT, STAGE } from './paint.mjs';

const SCALE = 0.75;
const CLOTHES = [0xc6584a, 0x5f7481, 0x7ea87a, 0xe2b45a, 0x9c7bb0, 0x6aa2b8, 0xd98a6a];

export function createView(game) {
  const root = game.sprite(() => {}, game.world);
  root.scaleX = root.scaleY = SCALE;
  const walkLayer = game.sprite(() => {}, root),
    skyLayer = game.sprite(() => {}, root),
    fxLayer = game.sprite(() => {}, root);
  const toWorld = (x, y) => ({ x: x * SCALE, y: y * SCALE });
  const random = Math.random;

  // ——— People ———
  const walkers = [];
  const street = LAYOUT.roads.street,
    rows = [409, ...LAYOUT.roads.rows.slice(0, 2)];
  function route() {
    const fromRow = rows[Math.floor(random() * rows.length)],
      toRow = rows[Math.floor(random() * rows.length)];
    const x1 = 20 + random() * 680,
      x2 = 20 + random() * 680;
    return [
      { x: x1, y: fromRow },
      { x: street, y: fromRow },
      { x: street, y: toRow },
      { x: x2, y: toRow }
    ];
  }
  function walker() {
    // A little figure: a robe, a face and, for some, a bamboo hat or a carrying pole.
    const robe = CLOTHES[Math.floor(random() * CLOTHES.length)],
      hat = random() < 0.4,
      pole = !hat && random() < 0.3;
    const body = game.sprite((g) => {
      g.beginFill(robe).drawRect(-3, -9, 6, 9).endFill();
      g.beginFill(0xf3dcc0).drawCircle(0, -11.5, 2.6).endFill();
      if (hat) g.beginFill(0xd9c08a).drawRect(-5, -14, 10, 2).endFill().beginFill(0xd9c08a).drawRect(-2, -16, 4, 2).endFill();
      else g.beginFill(0x3f4b4d).drawRect(-2.4, -14.6, 4.8, 1.8).endFill();
      if (pole) {
        g.beginFill(0x8d5f3c).drawRect(-8, -9, 16, 1.4).endFill();
        g.beginFill(0xb98a54).drawRect(-9, -7, 4, 4).endFill().beginFill(0xb98a54).drawRect(5, -7, 4, 4).endFill();
      }
    }, walkLayer);
    const w = { body, path: route(), leg: 0, speed: 14 + random() * 12 };
    body.x = w.path[0].x;
    body.y = w.path[0].y;
    return w;
  }
  function setPeople(count) {
    while (walkers.length < count) walkers.push(walker());
    while (walkers.length > count) game.remove(walkers.pop().body);
  }

  // ——— Boats ———
  const boats = [0, 1].map((i) => {
    // game.rect places a block by its centre.
    const hull = game.rect(0, 0, 28, 6, 0x8d5f3c, walkLayer);
    game.rect(0, -10.5, 2, 15, 0x8d5f3c, hull);
    game.rect(5.5, -10.5, 9, 11, 0xf7f1e2, hull);
    hull.x = 100 + i * 360;
    hull.y = LAYOUT.river.y + 28 + i * 22;
    return { hull, speed: (i ? -1 : 1) * (10 + i * 4) };
  });

  // ——— Weather ———
  const flakes = [];
  let season = 0,
    night = 0;
  function setWeather(nextSeason, nextNight) {
    season = nextSeason;
    night = nextNight;
    const want = game.reducedMotion ? 0 : 22;
    while (flakes.length < want) {
      const s = game.sprite(() => {}, skyLayer);
      s.x = random() * STAGE.width;
      s.y = 110 + random() * 1000;
      flakes.push({ s, phase: random() * 6 });
    }
    while (flakes.length > want) game.remove(flakes.pop().s);
    const color = [0xf4b8c6, 0xf6e27a, 0xe0894f, 0xffffff][season];
    for (const f of flakes) {
      f.s.graphics.clear();
      f.s.graphics.beginFill(color).drawRect(-2, -2, season === 0 ? 5 : 4, season === 0 ? 3 : 4).endFill();
    }
  }

  // ——— Focus ———
  let focusRect = null;
  const outline = game.sprite(() => {}, fxLayer);
  function focus(rect) {
    focusRect = rect;
    outline.visible = Boolean(rect);
    if (!rect) return;
    outline.x = rect.x;
    outline.y = rect.y;
    const g = outline.graphics;
    g.clear();
    // Four bars, a frame round the plot.
    for (const [x, y, w, h] of [[0, 0, rect.w, 3], [0, rect.h - 3, rect.w, 3], [0, 0, 3, rect.h], [rect.w - 3, 0, 3, rect.h]]) g.beginFill(0xe2b45a).drawRect(x, y, w, h).endFill();
  }

  // ——— Each frame ———
  function update(dt) {
    for (const w of walkers) {
      const target = w.path[w.leg + 1];
      if (!target) {
        w.path = route();
        w.leg = 0;
        w.body.x = w.path[0].x;
        w.body.y = w.path[0].y;
        continue;
      }
      const dx = target.x - w.body.x,
        dy = target.y - w.body.y,
        d = Math.hypot(dx, dy),
        step = w.speed * dt;
      if (d <= step) {
        w.body.x = target.x;
        w.body.y = target.y;
        w.leg++;
      } else {
        w.body.x += (dx / d) * step;
        w.body.y += (dy / d) * step + Math.sin(w.body.x / 3) * 0.05;
      }
    }
    for (const b of boats) {
      b.hull.x += b.speed * dt;
      if (b.hull.x > STAGE.width + 30) b.hull.x = -30;
      if (b.hull.x < -30) b.hull.x = STAGE.width + 30;
    }
    for (const f of flakes) {
      f.phase += dt;
      if (season === 1 && night > 0.5) {
        f.s.alpha = 0.4 + 0.6 * Math.abs(Math.sin(f.phase * 2));
        f.s.x += Math.sin(f.phase) * 0.3;
        f.s.y += Math.cos(f.phase * 0.7) * 0.3;
      } else {
        f.s.alpha = season === 1 ? 0 : 0.85;
        f.s.x += Math.sin(f.phase) * 0.4 + 6 * dt;
        f.s.y += (season === 3 ? 18 : 12) * dt;
        f.s.rotation += 40 * dt;
      }
      if (f.s.y > 1170) (f.s.y = 110), (f.s.x = random() * STAGE.width);
      if (f.s.x > STAGE.width) f.s.x = 0;
    }
  }

  // ——— Moments ———
  /** Words rising from a stage point. */
  function float(words, x, y, { color = 0xe2b45a, size = 26 } = {}) {
    const label = game.text(words, { x, y, size, color, align: 'center', baseline: 'middle', bold: true, layer: fxLayer });
    if (game.reducedMotion) {
      game.after(1, () => game.remove(label));
      return;
    }
    game.tween(label).to({ y: y - 60, alpha: 0 }, 1.4, 'quadOut').call(() => game.remove(label));
  }
  function coins(x, y, count = 16) {
    const at = toWorld(x, y);
    game.burst(at.x, at.y, { color: 0xe2b45a, count, speed: 160, life: 0.8, size: 4 });
  }
  function built(rect) {
    const at = toWorld(rect.x + rect.w / 2, rect.y + rect.h / 2);
    game.burst(at.x, at.y, { color: 0xfff1c8, count: 18, speed: 120, life: 0.7, size: 3 });
  }
  /** A small raid on the gate, won or lost; resolves when it is over. */
  async function raid(won) {
    if (game.reducedMotion) return;
    const foes = [];
    for (let i = 0; i < 9; i++) {
      const f = game.rect(0, -6, 8, 12, 0x3d3f46, fxLayer);
      game.rect(4, -8, 2, 14, 0xc6584a, f);
      f.x = 200 + random() * 320;
      f.y = 120 + random() * 40;
      foes.push(f);
      game.tween(f).to({ x: 330 + random() * 60, y: 250 + random() * 20 }, 2.2 + random() * 0.6, 'quadInOut');
    }
    for (let k = 0; k < 10; k++) {
      game.after(0.6 + k * 0.18, () => {
        const tower = LAYOUT.towers[k % 4];
        const arrow = game.rect(0, 0, 12, 2, 0x4c5a5c, fxLayer);
        arrow.x = tower.x + tower.w / 2;
        arrow.y = tower.y + 20;
        game.tween(arrow).to({ x: 340 + random() * 40, y: 240 + random() * 30 }, 0.5).call(() => game.remove(arrow));
      });
    }
    await game.wait(3);
    const at = toWorld(360, 270);
    game.burst(at.x, at.y, { color: won ? 0xe2b45a : 0xc6584a, count: 30, speed: 200, life: 0.8, size: 4 });
    if (!won) game.flash(0xc6584a, 0.2);
    for (const f of foes) game.tween(f).to(won ? { y: 100, alpha: 0 } : { y: 420, alpha: 0 }, 1.2, 'quadIn').call(() => game.remove(f));
    await game.wait(1.3);
  }

  return { update, setPeople, setWeather, focus, float, coins, built, raid };
}
