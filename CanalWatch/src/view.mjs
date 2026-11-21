// 画面：水墨地图的画法（由页面画一次，见 src/ground.mjs），以及用引擎的 play 画的塔、水寇、箭石火和闸门；规则的事件
// 变成声音、碎片和飘字。画面只读规则的状态，不改它；每帧按状态把精灵摆到位。
// The view: how the ink-wash map is drawn (painted once by the page, in src/ground.mjs), and the towers, the raiders,
// the arrows, stones and fire and the gates, drawn with the engine's play; the rules' events become sounds, bursts and
// floating numbers. It only reads the state of the rules and never changes it; each frame it puts the sprites where
// the state says.
import { FIELD, GATES, PLOTS, RAIDERS, TOWERS, WIDTH } from './sim/data.mjs';
import { WAYS } from './sim/world.mjs';

export const INK = 0x2b2924,
  PAPER = 0xe6d9b8,
  WATER = 0x8fb0a2,
  WATER_DEEP = 0x5f8579,
  ROAD = 0xc2a777,
  SEAL = 0xb3352b,
  WOOD = 0x7a5534,
  BRONZE = 0xb08a3e,
  FIRE = 0xe0782a,
  STONE = 0x9a948a;

/** A path drawn as one stroke with round corners, along the very line the raiders follow. */
function strokePath(g, points, width, color, alpha) {
  g.lineStyle(width, color, alpha, { joints: 'round', caps: 'round' });
  g.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) g.lineTo(x, y);
  g.lineStyle(0);
}

/**
 * The whole still map: hills, the canal, the towpath, the wall and the plots. `g` is anything with the drawing calls of
 * the engine's Graphics; the page paints it once with src/ground.mjs, under the engine's clear canvas.
 */
export function drawMap(g) {
  {
    // Far hills along the top: two ridges in pale ink wash, the nearer one darker.
    for (const [alpha, ridge] of [
      [0.07, [[0, 46], [90, 18], [170, 40], [260, 8], [350, 34], [470, 14], [560, 38], [660, 6], [760, 30], [850, 12], [960, 36]]],
      [0.06, [[0, 30], [120, 54], [220, 26], [330, 58], [420, 30], [540, 60], [640, 28], [730, 52], [840, 30], [960, 56]]]
    ]) {
      g.beginFill(INK, alpha);
      g.moveTo(0, 0);
      for (let i = 0; i < ridge.length; i++) {
        const [x, y] = ridge[i];
        if (i === 0) g.lineTo(x, y);
        else {
          const [px, py] = ridge[i - 1];
          g.curveTo((px + x) / 2, Math.min(py, y) - 6, x, y);
        }
      }
      g.lineTo(960, 0);
      g.lineTo(0, 0);
      g.endFill();
    }
    // The canal: a dark bank line under the water, and a lighter thread of current along its middle.
    strokePath(g, PATHS_WATER, WIDTH.water + 10, INK, 0.28);
    strokePath(g, PATHS_WATER, WIDTH.water, WATER, 0.9);
    strokePath(g, PATHS_WATER, 6, 0xd9e6df, 0.45);
    // The towpath: packed earth with a worn line along it.
    strokePath(g, PATHS_ROAD, WIDTH.road + 6, INK, 0.18);
    strokePath(g, PATHS_ROAD, WIDTH.road, ROAD, 0.85);
    g.lineStyle(2, INK, 0.18, { dash: [10, 12] });
    g.moveTo(PATHS_ROAD[0][0], PATHS_ROAD[0][1]);
    for (const [x, y] of PATHS_ROAD.slice(1)) g.lineTo(x, y);
    g.lineStyle(0);
    // Reeds along the banks: short strokes leaning one way.
    for (let i = 0; i < 38; i++) {
      const s = ((i * 97) % 1200) + 20,
        p = WAYS.water.at(s),
        side = i % 2 ? 1 : -1,
        nx = -Math.sin(p.angle) * side,
        ny = Math.cos(p.angle) * side,
        x = p.x + nx * (WIDTH.water / 2 + 6),
        y = p.y + ny * (WIDTH.water / 2 + 6);
      g.lineStyle(1.6, INK, 0.35, { caps: 'round' });
      g.moveTo(x, y);
      g.lineTo(x + nx * 9 + 3, y + ny * 9 - 4);
      g.moveTo(x + 4, y + 1);
      g.lineTo(x + 4 + nx * 7 + 4, y + 1 + ny * 7 - 3);
    }
    g.lineStyle(0);
    // Willows: a dark trunk and drooping strokes.
    for (const [x, y] of [
      [60, 200],
      [200, 380],
      [520, 300],
      [690, 380],
      [480, 40],
      [280, 520]
    ]) {
      g.lineStyle(3, INK, 0.5, { caps: 'round' });
      g.moveTo(x, y + 16);
      g.lineTo(x + 2, y - 8);
      g.lineStyle(1.2, INK, 0.3, { caps: 'round' });
      for (let k = -4; k <= 4; k++) {
        g.moveTo(x + 2, y - 8);
        g.curveTo(x + k * 6, y - 14, x + k * 7, y + 8);
      }
    }
    g.lineStyle(0);
    // The city wall on the right, with the water gate and the land gate cut into it.
    g.beginFill(0x4a4740, 0.92).drawRect(936, 0, 24, FIELD.height).endFill();
    for (let y = 6; y < FIELD.height; y += 22) g.beginFill(0x4a4740, 0.92).drawRect(928, y, 10, 12).endFill();
    g.beginFill(WATER_DEEP, 1).drawRect(936, 314, 24, 52).endFill();
    g.beginFill(ROAD, 1).drawRect(936, 428, 24, 34).endFill();
    g.beginFill(SEAL, 0.95).drawRect(942, 290, 12, 18).endFill();
    // The plots: a ring of stones in pale ink. The page's buttons sit on them.
    for (const [x, y] of PLOTS) {
      g.beginFill(PAPER, 0.9).drawCircle(x, y, 20).endFill();
      g.lineStyle(2, INK, 0.35, { dash: [5, 4] }).drawCircle(x, y, 20).lineStyle(0);
    }
    // The posts of the two sluice gates, one on each bank.
    for (const gate of GATES) {
      const p = WAYS.water.at(gate.at),
        nx = -Math.sin(p.angle),
        ny = Math.cos(p.angle),
        reach = WIDTH.water / 2 + 6;
      for (const side of [-1, 1]) g.beginFill(INK, 0.85).drawRect(p.x + nx * reach * side - 5, p.y + ny * reach * side - 5, 10, 10).endFill();
    }
  }
}
const PATHS_WATER = WAYS.water.points,
  PATHS_ROAD = WAYS.road.points;

/** What each kind of tower looks like, drawn about its middle; `level` adds a storey and pips. */
export function drawTower(g, kind, level) {
  g.clear();
  g.beginFill(INK, 0.22).drawEllipse(-18, 8, 36, 14).endFill();
  if (kind === 'crossbow') {
    g.beginFill(WOOD).drawRect(-11, -14, 22, 24).endFill();
    g.beginFill(INK).moveTo(-16, -14).lineTo(0, -26 - level * 3).lineTo(16, -14).lineTo(-16, -14).endFill();
    g.beginFill(PAPER, 0.8).drawRect(-4, -8, 8, 8).endFill();
  } else if (kind === 'trebuchet') {
    g.lineStyle(4, WOOD, 1, { caps: 'round' }).moveTo(-13, 10).lineTo(0, -14).lineTo(13, 10).lineStyle(0);
    g.beginFill(STONE).drawRect(-14, 6, 28, 6).endFill();
  } else if (kind === 'fire') {
    g.beginFill(0x5a3b28).drawRect(-12, -4, 24, 14).endFill();
    g.beginFill(FIRE).moveTo(-8, -4).curveTo(-6, -18 - level * 2, 0, -24 - level * 3).curveTo(6, -18, 8, -4).lineTo(-8, -4).endFill();
    g.beginFill(0xf6c453).drawCircle(0, -9, 4).endFill();
  } else {
    g.lineStyle(3, WOOD, 1).moveTo(-12, 10).lineTo(-12, -16).lineTo(12, -16).lineTo(12, 10).lineStyle(0);
    g.beginFill(BRONZE).drawCircle(0, -3, 9 + level).endFill();
    g.beginFill(0x7d6128).drawCircle(0, -3, 3).endFill();
  }
  // One vermilion pip for each level.
  for (let i = 0; i <= level; i++) g.beginFill(SEAL).drawCircle(-6 + i * 6, 15, 2.4).endFill();
}

/** A raider of `kind`, drawn facing right about its middle. */
function drawRaider(g, kind) {
  if (kind === 'raider') {
    g.beginFill(INK).drawCircle(0, 0, 7).endFill();
    g.beginFill(SEAL).drawRect(-7, -3, 14, 3).endFill();
  } else if (kind === 'shield') {
    g.beginFill(INK).drawCircle(-2, 0, 8).endFill();
    g.beginFill(0x8a6a3a).drawRoundRect(4, -9, 6, 18, 3).endFill();
  } else {
    const size = { skiff: 1, junk: 1.7, flagship: 2.4 }[kind];
    g.beginFill(0x5a3b28)
      .moveTo(-14 * size, -5 * size)
      .lineTo(10 * size, -5 * size)
      .lineTo(16 * size, 0)
      .lineTo(10 * size, 5 * size)
      .lineTo(-14 * size, 5 * size)
      .lineTo(-14 * size, -5 * size)
      .endFill();
    if (kind !== 'skiff') {
      g.beginFill(PAPER, 0.95).drawRect(-6 * size, -13 * size, 8 * size, 10 * size).endFill();
      g.lineStyle(1, INK, 0.6).moveTo(-2 * size, -14 * size).lineTo(-2 * size, 4 * size).lineStyle(0);
    } else g.beginFill(INK).drawCircle(0, 0, 3).endFill();
    if (kind === 'flagship') {
      g.beginFill(PAPER, 0.95).drawRect(4, -12 * size, 6 * size, 8 * size).endFill();
      g.beginFill(SEAL).drawRect(-14 * size, -18 * size, 10, 7).endFill();
    }
  }
}

/**
 * The moving part of the view. `show(world, events, seconds)` is called each frame: it makes and moves the sprites for
 * what the world holds, and plays what the events say.
 */
export function createView(game, { sound }) {
  // Layers, back to front, so a tower built late is still behind the raiders and the shots.
  const reach = game.sprite(),
    layers = { gates: game.sprite(), towers: game.sprite(), raiders: game.sprite(), bars: game.sprite(), shots: game.sprite(), words: game.sprite() };
  reach.visible = false;
  const towers = new Map(),
    raiders = new Map(),
    shots = new Map();
  const gates = GATES.map((gate) => {
    const p = WAYS.water.at(gate.at);
    const leaf = game.sprite((g) => g.beginFill(INK, 0.9).drawRect(-4, -(WIDTH.water / 2 + 4), 8, WIDTH.water + 8).endFill(), layers.gates);
    leaf.x = p.x;
    leaf.y = p.y;
    leaf.rotation = (p.angle * 180) / Math.PI;
    leaf.visible = false;
    return leaf;
  });
  let floating = 0;

  function towerSprite(tower) {
    let entry = towers.get(tower.plot);
    if (!entry || entry.kind !== tower.kind) {
      if (entry) game.remove(entry.sprite);
      entry = { kind: tower.kind, level: -1, sprite: game.sprite(undefined, layers.towers) };
      entry.sprite.x = tower.x;
      entry.sprite.y = tower.y;
      towers.set(tower.plot, entry);
    }
    if (entry.level !== tower.level) {
      drawTower(entry.sprite.graphics, tower.kind, tower.level);
      entry.level = tower.level;
    }
    return entry;
  }

  function raiderSprite(raider) {
    let entry = raiders.get(raider.id);
    if (!entry) {
      const body = game.sprite((g) => drawRaider(g, raider.kind), layers.raiders);
      const radius = RAIDERS[raider.kind].radius;
      const back = game.rect(0, 0, radius * 2, 3, INK, layers.bars);
      const bar = game.rect(0, 0, radius * 2, 3, SEAL, layers.bars);
      const flame = game.circle(0, 0, 4, FIRE, layers.bars);
      back.alpha = 0.5;
      flame.visible = false;
      entry = { body, back, bar, flame, radius, boat: raider.way === 'water' };
      raiders.set(raider.id, entry);
    }
    return entry;
  }

  function float(x, y, words, color) {
    if (floating > 14) return;
    floating++;
    const label = game.text(words, { x, y: y - 18, size: 14, color, align: 'center', bold: true, layer: layers.words });
    game
      .tween(label)
      .to({ y: y - (game.reducedMotion ? 22 : 44), alpha: 0 }, 0.9, 'quadOut')
      .onFinish(() => {
        floating--;
        game.remove(label);
      });
  }

  return {
    /** Show the reach of the tower on `plot` (or of `kind` were it built there); null hides it. */
    showReach(plot, kind, level = 0) {
      if (plot === null || plot === undefined || !kind) {
        reach.visible = false;
        return;
      }
      const spec = TOWERS[kind].levels[Math.min(level, 2)],
        [x, y] = PLOTS[plot],
        radius = spec.range;
      reach.graphics.clear().beginFill(SEAL, 0.07).drawCircle(0, 0, radius).endFill().lineStyle(2, SEAL, 0.55, { dash: [8, 6] }).drawCircle(0, 0, radius).lineStyle(0);
      if (spec.minRange) reach.graphics.lineStyle(1.5, SEAL, 0.4, { dash: [4, 5] }).drawCircle(0, 0, spec.minRange).lineStyle(0);
      reach.x = x;
      reach.y = y;
      reach.visible = true;
    },

    show(world, events) {
      // Towers: made when built, drawn again when raised, removed when sold.
      for (const [plot, entry] of towers)
        if (!world.towers[plot]) {
          game.remove(entry.sprite);
          towers.delete(plot);
        }
      for (const tower of world.towers) if (tower) towerSprite(tower);

      // Raiders: each follows the rules' place; boats turn with the canal, men do not.
      const alive = new Set();
      for (const raider of world.raiders) {
        alive.add(raider.id);
        const entry = raiderSprite(raider);
        entry.body.x = raider.x;
        entry.body.y = raider.y;
        entry.body.rotation = entry.boat ? (raider.angle * 180) / Math.PI : 0;
        entry.body.alpha = raider.slow > 0 ? 0.75 : 1;
        const top = raider.y - entry.radius - 8;
        entry.back.x = entry.bar.x = raider.x;
        entry.back.y = entry.bar.y = top;
        const share = Math.max(0, raider.hp / raider.max);
        entry.bar.scaleX = share;
        entry.bar.x = raider.x - entry.radius * (1 - share);
        entry.back.visible = entry.bar.visible = share < 1;
        entry.flame.visible = raider.burnLeft > 0;
        if (entry.flame.visible) {
          entry.flame.x = raider.x + Math.sin(world.time * 17 + raider.id) * 2;
          entry.flame.y = raider.y - 4 - Math.abs(Math.sin(world.time * 11 + raider.id)) * 3;
        }
      }
      for (const [id, entry] of raiders)
        if (!alive.has(id)) {
          for (const part of [entry.body, entry.back, entry.bar, entry.flame]) game.remove(part);
          raiders.delete(id);
        }

      // Shots: an arrow is a short stroke, a stone flies in an arc, a fire arrow is a spark.
      const flying = new Set();
      for (const shot of world.shots) {
        flying.add(shot.id);
        let sprite = shots.get(shot.id);
        if (!sprite) {
          sprite = game.sprite((g) => {
            if (shot.type === 'blast') g.beginFill(STONE).drawCircle(0, 0, 5).endFill();
            else if (shot.type === 'fire') g.beginFill(FIRE).drawCircle(0, 0, 3.5).endFill().beginFill(0xf6c453).drawCircle(0, 0, 1.6).endFill();
            else g.lineStyle(2, INK, 0.9, { caps: 'round' }).moveTo(-7, 0).lineTo(5, 0).lineStyle(0);
          }, layers.shots);
          shots.set(shot.id, sprite);
        }
        const k = Math.min(1, shot.t / shot.flight);
        sprite.x = shot.x0 + (shot.x - shot.x0) * k;
        sprite.y = shot.y0 + (shot.y - shot.y0) * k - (shot.type === 'blast' ? Math.sin(k * Math.PI) * 60 : 0);
        sprite.rotation = (Math.atan2(shot.y - shot.y0, shot.x - shot.x0) * 180) / Math.PI;
      }
      for (const [id, sprite] of shots)
        if (!flying.has(id)) {
          game.remove(sprite);
          shots.delete(id);
        }

      world.gates.forEach((gate, index) => (gates[index].visible = gate.shutLeft > 0));

      // What happened: sounds, bursts, floating numbers and a shake for what reached the wall.
      let shotSounds = 0;
      for (const event of events) {
        if (event.type === 'shot' && shotSounds++ < 2) sound('shot', event.tower);
        else if (event.type === 'hit' && event.splash) {
          game.burst(event.x, event.y, { color: STONE, count: 8, speed: 90, life: 0.35, size: 2 });
          sound('crash');
        } else if (event.type === 'kill') {
          game.burst(event.x, event.y, { color: RAIDERS[event.kind].way === 'water' ? WATER_DEEP : INK, count: event.kind === 'flagship' ? 40 : 10, speed: 110, life: 0.45, size: 2.4 });
          float(event.x, event.y, `+${event.bounty}`, 0x6b4e12);
          sound(event.kind === 'flagship' || event.kind === 'junk' ? 'sink' : 'down');
        } else if (event.type === 'leak') {
          game.shake(5, 0.2);
          game.flash(SEAL, 0.18);
          sound('leak');
        } else if (event.type === 'gate' && event.open) sound('gate');
      }
    },

    /** Every sprite of the moving part taken away, for a new game. */
    clear() {
      for (const entry of towers.values()) game.remove(entry.sprite);
      for (const entry of raiders.values()) for (const part of [entry.body, entry.back, entry.bar, entry.flame]) game.remove(part);
      for (const sprite of shots.values()) game.remove(sprite);
      towers.clear();
      raiders.clear();
      shots.clear();
      reach.visible = false;
      for (const leaf of gates) leaf.visible = false;
    }
  };
}
