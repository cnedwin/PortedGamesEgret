// Keep animated townsfolk, effects and selection in the same world coordinates
// as the painting. The engine still renders at three-quarters of viewport size.
import { LAYOUT, MAP } from './paint.mjs';

const SCALE = 0.75;
const CLOTHES = [0xc6584a, 0x5f7481, 0x7ea87a, 0xe2b45a, 0x9c7bb0, 0x6aa2b8, 0xd98a6a];

export function createView(game) {
  const root = game.sprite(() => {}, game.world);
  root.scaleX = root.scaleY = SCALE;
  const walkLayer = game.sprite(() => {}, root),
    skyLayer = game.sprite(() => {}, root),
    fxLayer = game.sprite(() => {}, root);
  const random = Math.random;
  function setCamera(x, y, zoom = 1) {
    root.scaleX = root.scaleY = SCALE * zoom;
    root.x = -x * root.scaleX;
    root.y = -y * root.scaleY;
  }

  // ——— People ———
  const walkers = [];
  const rows = LAYOUT.roads.rows;
  function route() {
    const fromRow = rows[Math.floor(random() * rows.length)],
      toRow = rows[Math.floor(random() * rows.length)];
    const street = LAYOUT.roads.spines[Math.floor(random() * LAYOUT.roads.spines.length)];
    const x1 = 182 + random() * (MAP.width - 364),
      x2 = 182 + random() * (MAP.width - 364);
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
      g.beginFill(0x626f56, .18).drawEllipse(-5, -2, 12, 4).endFill();
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
    const hull = game.sprite((g) => {
      g.beginFill(0xb8d6c8, .55).drawEllipse(-29, 2, 57, 6).endFill();
      g.beginFill(0x8c674c).moveTo(-22, -5).curveTo(-15, 5, 19, 2).lineTo(26, -5)
        .curveTo(15, -1, -22, -5).endFill();
      g.beginFill(0x574c3f).drawRect(-1, -21, 1.5, 19).endFill();
      g.beginFill(0xf2e9ca).moveTo(.5, -22).curveTo(12, -18, 17, -7).lineTo(.5, -8)
        .curveTo(4, -13, .5, -22).endFill();
    }, walkLayer);
    hull.x = 260 + i * 850;
    hull.y = LAYOUT.river.y + 48 + i * 36;
    hull.scaleX = i ? -1 : 1;
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
      s.x = random() * MAP.width;
      s.y = 110 + random() * (MAP.height - 110);
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
  const outline = game.sprite(() => {}, fxLayer);
  function focus(rect) {
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
      if (b.hull.x > MAP.width + 30) b.hull.x = -30;
      if (b.hull.x < -30) b.hull.x = MAP.width + 30;
      // The static bridge is in front of boats crossing its shadow.
      b.hull.alpha = Math.min(1, Math.max(0, (Math.abs(b.hull.x - LAYOUT.roads.street) - 20) / 35));
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
      if (f.s.y > MAP.height) (f.s.y = 110), (f.s.x = random() * MAP.width);
      if (f.s.x > MAP.width) f.s.x = 0;
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
  function scatter(x, y, count, color, span) {
    if (game.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.4, distance = span * (.42 + .58 * random());
      const dot = game.sprite((g) => g.beginFill(color, .84).drawCircle(0, 0, 2 + i % 3).endFill(), fxLayer);
      dot.x = x;
      dot.y = y;
      game.tween(dot).to({
        x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance - span * .28, alpha: 0
      }, .64 + random() * .24, 'quadOut').call(() => game.remove(dot));
    }
  }
  function coins(x, y, count = 16) {
    scatter(x, y, count, 0xe2b45a, 66);
  }
  function built(rect) {
    scatter(rect.x + rect.w / 2, rect.y + rect.h / 2, 18, 0xfff1c8, 45);
  }
  /** A small raid on the gate, won or lost; resolves when it is over. */
  async function raid(won, side = 0) {
    if (game.reducedMotion) return;
    const gate = LAYOUT.gates[side] ?? LAYOUT.gates[0];
    const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][side] ?? [0, -1];
    const x = gate.x + gate.w / 2, y = gate.y + gate.h / 2;
    const foes = [];
    for (let i = 0; i < 9; i++) {
      const f = game.rect(0, -6, 8, 12, 0x3d3f46, fxLayer);
      game.rect(4, -8, 2, 14, 0xc6584a, f);
      const stagger = (i - 4) * 16;
      f.x = x + dx * 116 - dy * stagger;
      f.y = y + dy * 116 + dx * stagger;
      foes.push(f);
      game.tween(f).to({ x: x + dx * 26 - dy * stagger * .5, y: y + dy * 26 + dx * stagger * .5 }, 2.2 + random() * 0.6, 'quadInOut');
    }
    for (let k = 0; k < 10; k++) {
      game.after(0.6 + k * 0.18, () => {
        const arrow = game.rect(0, 0, 12, 2, 0x4c5a5c, fxLayer);
        const offset = (random() - .5) * 57;
        arrow.x = x - dy * offset;
        arrow.y = y + dx * offset;
        arrow.rotation = Math.atan2(dy, dx) * 180 / Math.PI;
        game.tween(arrow).to({ x: arrow.x + dx * 78, y: arrow.y + dy * 78 }, 0.5).call(() => game.remove(arrow));
      });
    }
    await game.wait(3);
    scatter(x, y, 30, won ? 0xe2b45a : 0xc6584a, 80);
    if (!won) game.flash(0xc6584a, 0.2);
    const travel = won ? 115 : -105;
    for (const f of foes) game.tween(f).to({ x: f.x + dx * travel, y: f.y + dy * travel, alpha: 0 }, 1.2, 'quadIn').call(() => game.remove(f));
    await game.wait(1.3);
  }

  return { update, setCamera, setPeople, setWeather, focus, float, coins, built, raid };
}
