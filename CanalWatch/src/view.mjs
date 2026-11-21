// 可动场景：将规则坐标与事件画成塔、敌船、闸门和战斗反馈。
// The moving scene: place the towers, raiders, gates and feedback from the simulation.
import { GATES, PLOTS, RAIDERS, TOWERS, WIDTH } from './sim/data.mjs';
import { WAYS } from './sim/world.mjs';

/** Draw one connected stroke with rounded corners. */
function strokePath(g, points, width, color, alpha) {
  g.lineStyle(width, color, alpha, { joints: 'round', caps: 'round' });
  g.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) g.lineTo(x, y);
  g.lineStyle(0);
}

const SOOT = 0x142526,
  SHALE = 0x354643,
  LIME = 0xb7a68c,
  SILK = 0xe8d9b4,
  LAMP = 0xffcd82,
  LACQUER = 0xa54436,
  JADE = 0x85bbac,
  BRASS = 0xc99854;
const TOWER_LIGHT = { crossbow: JADE, trebuchet: SILK, fire: 0xee9a68, gong: 0xe8bd73 };

function polygon(g, color, points) {
  const [x, y] = points[0];
  g.beginFill(color).moveTo(x, y);
  for (let i = 1; i < points.length; i++) g.lineTo(...points[i]);
  g.lineTo(x, y).endFill();
}

/** Upturned eaves with a dark underside and a wet ridge. */
function roof(g, y, half, peak, color) {
  const ridge = y - peak;
  g.beginFill(SOOT).moveTo(-half - 3, y - 6)
    .curveTo(-half * .65, y + 1, -half * .3, ridge + 2).lineTo(0, ridge - 2)
    .lineTo(half * .3, ridge + 2).curveTo(half * .7, y + 1, half + 3, y - 6)
    .lineTo(half + 1, y + 2).lineTo(-half + 1, y + 2).lineTo(-half - 3, y - 6).endFill();
  g.beginFill(color).moveTo(-half, y - 4)
    .curveTo(-half * .6, y, -half * .3, ridge + 3).lineTo(0, ridge)
    .lineTo(half * .3, ridge + 3).curveTo(half * .7, y, half, y - 4)
    .lineTo(half - 1, y - 1).lineTo(-half + 2, y - 1).lineTo(-half, y - 4).endFill();
  strokePath(g, [[-half + 4, y + 1], [half - 3, y + 1]], 1.3, LIME, .85);
}

function drawWatchtower(g, level) {
  polygon(g, SOOT, [[-15, 11], [-13, -22], [13, -22], [15, 11]]);
  g.beginFill(0x655245).drawRect(-11, -21, 22, 30).endFill();
  g.beginFill(0x3d3630).drawRect(4, -21, 7, 30).endFill();
  g.beginFill(SOOT).drawRect(-8, -16, 16, 10).endFill();
  g.beginFill(JADE).drawRect(-5, -13, 10, 2.6).endFill();
  g.beginFill(LAMP).drawRect(-3, 0, 6, 8).endFill();
  roof(g, -4, 17, 9, 0x365c55);
  roof(g, -19, 14, 9 + level * 2, 0x4e756c);
  if (level) {
    strokePath(g, [[10, -9], [10, 7]], 2.5, LACQUER, 1);
    g.beginFill(LAMP).drawCircle(10, 6, 2.3).endFill();
  }
}

function drawThrower(g, level) {
  g.beginFill(0x786858).drawRect(-17, 5, 34, 7).endFill();
  g.beginFill(LIME).drawRect(-16, 6, 11, 3).drawRect(2, 6, 13, 3).endFill();
  strokePath(g, [[-15, 7], [-5, -15], [6, -15], [15, 7]], 6, SOOT, 1);
  strokePath(g, [[-15, 7], [-5, -15], [6, -15], [15, 7]], 2.8, 0xa5794f, 1);
  strokePath(g, [[-10, 4], [6, -9], [14, 5]], 2.1, LIME, 1);
  const tip = -28 - level * 3;
  strokePath(g, [[-14, -3], [17, tip]], 6, SOOT, 1);
  strokePath(g, [[-14, -4], [17, tip]], 2.8, SILK, 1);
  strokePath(g, [[17, tip], [20, tip + 8], [16, tip + 12]], 1.8, BRASS, 1);
  g.beginFill(SOOT).drawRoundRect(-19, -7, 11, 13, 3).endFill();
  g.beginFill(LACQUER).drawRect(-17, -5, 7, 5).endFill();
  g.beginFill(BRASS).drawCircle(0, -14, 4).endFill();
  g.beginFill(SOOT).drawCircle(0, -14, 1.8).endFill();
}

function drawBeacon(g, level) {
  polygon(g, SOOT, [[-16, 10], [-14, -12], [14, -12], [16, 10]]);
  g.beginFill(0x7d3c32).drawRect(-13, -10, 26, 17).endFill();
  g.beginFill(LACQUER).drawRect(-14, -7, 4, 16).drawRect(10, -7, 4, 16).endFill();
  g.beginFill(SOOT).drawRect(-7, -9, 14, 12).endFill();
  g.beginFill(LAMP).drawRect(-4, -6, 8, 6).endFill();
  g.beginFill(0xf4793f, .2).drawCircle(0, -19, 16).endFill();
  g.beginFill(0xf28145).moveTo(-10, -12).curveTo(-15, -23, -5, -25)
    .curveTo(-2, -29, -5, -33 - level * 2).curveTo(6, -32, 7, -21)
    .lineTo(10, -25).curveTo(15, -15, 7, -10).lineTo(-10, -12).endFill();
  g.beginFill(LAMP).moveTo(-6, -12).curveTo(-7, -18, 2, -23).curveTo(7, -18, 6, -12).lineTo(-6, -12).endFill();
  polygon(g, BRASS, [[-17, -13], [17, -13], [11, -8], [-11, -8]]);
  g.beginFill(0xffedbd).drawCircle(8, -34 - level, 1.5).drawCircle(-8, -29, 1.2).endFill();
}

function drawGong(g, level) {
  strokePath(g, [[-14, 9], [-14, -21], [14, -21], [14, 9]], 6, SOOT, 1);
  strokePath(g, [[-14, 7], [-14, -20], [14, -20], [14, 7]], 2.7, LACQUER, 1);
  roof(g, -22, 17, 7 + level, 0x626255);
  strokePath(g, [[-6, -19], [-4, -13], [4, -13], [6, -19]], 1.5, SILK, .85);
  g.beginFill(SOOT).drawCircle(0, -4, 12.7).endFill();
  g.beginFill(SILK).drawCircle(0, -4, 10.7).endFill();
  g.beginFill(BRASS).drawCircle(.6, -3.4, 8.6).endFill();
  g.beginFill(0x80532f).drawCircle(1.4, -2.9, 5.8).endFill();
  g.beginFill(LAMP).drawCircle(-.7, -5.1, 3.2).endFill();
  g.beginFill(LACQUER).drawRect(-16, 6, 4, 4).drawRect(12, 6, 4, 4).endFill();
}

const TOWER_ART = { crossbow: drawWatchtower, trebuchet: drawThrower, fire: drawBeacon, gong: drawGong };

/** A tower shares its plot's centre, with a stone foundation and illuminated rank. */
export function drawTower(g, kind, level) {
  g.clear();
  g.beginFill(SOOT, .56).drawEllipse(-22, 6, 44, 18).endFill();
  polygon(g, SOOT, [[-19, 6], [18, 6], [21, 14], [15, 19], [-17, 19], [-21, 14]]);
  polygon(g, 0x70685b, [[-18, 7], [17, 7], [20, 13], [-20, 13]]);
  g.beginFill(LIME).drawRect(-15, 11, 30, 2.4).endFill();
  TOWER_ART[kind](g, level);
  g.beginFill(SOOT).drawRoundRect(-11, 13, 22, 7.5, 3).endFill();
  for (let i = 0; i < 3; i++) g.beginFill(i <= level ? TOWER_LIGHT[kind] : 0x6c6857).drawCircle(-6 + i * 6, 16.7, 2.05).endFill();
}

function drawFoot(g, armoured) {
  g.beginFill(SOOT, .5).drawEllipse(-12, 5, 24, 9).endFill();
  polygon(g, SOOT, [[-8, -4], [5, -5], [9, 8], [3, 11], [-8, 9]]);
  polygon(g, armoured ? 0x586966 : 0x975743, [[-6, -3], [4, -4], [5, 7], [-7, 7]]);
  strokePath(g, [[-3, 5], [-6, 11]], 2.8, SOOT, 1);
  strokePath(g, [[2, 5], [4, 11]], 2.8, SOOT, 1);
  g.beginFill(SILK).drawCircle(0, -7, 4.4).endFill();
  polygon(g, SOOT, [[-9, -7], [-4, -13], [3, -14], [9, -8], [5, -7]]);
  strokePath(g, [[-5, -4], [5, -4]], 2.3, 0xcf634c, 1);
  if (armoured) {
    polygon(g, SOOT, [[7, -10], [14, -7], [15, 4], [8, 11], [3, 6], [3, -6]]);
    polygon(g, BRASS, [[7, -7], [11, -5], [12, 3], [8, 7], [5, 3], [5, -4]]);
    strokePath(g, [[8, -3], [8, 3]], 2, SILK, 1);
  } else {
    strokePath(g, [[4, 4], [11, -3]], 2.7, SOOT, 1);
    strokePath(g, [[8, 0], [12, -5]], 1.9, SILK, 1);
  }
}

function drawSail(g, x, top, width, height, color) {
  g.beginFill(SOOT).moveTo(x - 2, top - 2).lineTo(x + width - 1, top + 1)
    .curveTo(x + width + 4, top + height * .65, x + width + 1, top + height + 2)
    .lineTo(x - 3, top + height + 2).lineTo(x - 2, top - 2).endFill();
  g.beginFill(color).moveTo(x, top).lineTo(x + width - 2, top + 2)
    .curveTo(x + width + 2, top + height * .64, x + width, top + height)
    .lineTo(x - 1, top + height).lineTo(x, top).endFill();
  for (const y of [top + height * .37, top + height * .68]) strokePath(g, [[x, y], [x + width, y + 1]], 1.15, 0x684d42, .8);
  strokePath(g, [[x - 1, top - 4], [x - 1, top + height + 5]], 1.8, SHALE, 1);
}

/** Vessels are laid out along local X so bows and wakes follow the canal. */
function drawRaider(g, kind) {
  if (RAIDERS[kind].way === 'road') {
    drawFoot(g, kind === 'shield');
    return;
  }
  const small = kind === 'skiff', leader = kind === 'flagship';
  const length = small ? 16 : leader ? 32 : 23, beam = small ? 5.7 : leader ? 9.5 : 7.6;
  for (const side of [-1, 1]) {
    g.lineStyle(1.3, JADE, .72, { caps: 'round' }).moveTo(-length - 13, side * (beam + 6))
      .curveTo(-length / 2, side * (beam + 1), length / 2, side * (beam + 2)).lineStyle(0);
  }
  polygon(g, SOOT, [[-length - 1, -beam], [length - 6, -beam - 2], [length + 2, -2], [length, 5], [length - 9, beam + 2], [-length + 5, beam + 1]]);
  polygon(g, leader ? 0x8a483d : 0x73503c, [[-length + 2, -beam + 1], [length - 6, -beam], [length, -2], [length - 7, beam - 3], [-length + 4, beam - 1]]);
  strokePath(g, [[-length + 5, beam - 1], [length - 7, beam - 2], [length - 1, 1]], 1.7, LIME, 1);
  if (small) {
    g.beginFill(SOOT).drawRoundRect(-9, -8, 15, 12, 5).endFill();
    g.beginFill(0xb19468).drawRoundRect(-7, -7, 11, 8, 4).endFill();
    strokePath(g, [[-5, -7], [-5, 0]], 1.75, 0x5d4734, 1);
    g.beginFill(LAMP).drawCircle(9, -1, 2).endFill();
  } else {
    g.beginFill(SOOT).drawRoundRect(-length + 4, -beam, 12, beam + 2, 3).endFill();
    g.beginFill(LAMP).drawRect(-length + 6, -3, 4, 3).drawRect(length - 11, -2, 3, 3).endFill();
    drawSail(g, -8, leader ? -28 : -21, leader ? 16 : 14, leader ? 24 : 18, leader ? 0xb35e4c : SILK);
    if (leader) {
      drawSail(g, 11, -19, 12, 16, SILK);
      polygon(g, LACQUER, [[-24, -18], [-13, -17], [-17, -12], [-23, -13]]);
      strokePath(g, [[-24, -20], [-24, -2]], 1.6, BRASS, 1);
    }
  }
}

function drawSluice(g) {
  const reach = WIDTH.water / 2 + 4;
  g.beginFill(SOOT).drawRoundRect(-7, -reach, 14, reach * 2, 3).endFill();
  g.beginFill(0x673f34).drawRect(-4.7, -reach + 2, 9.4, reach * 2 - 4).endFill();
  for (let y = -reach + 6; y < reach; y += 8) {
    g.beginFill(0x995a40).drawRect(-4.5, y, 8.8, 3.7).endFill();
    g.beginFill(BRASS).drawCircle(2.3, y + 1, 1.2).endFill();
  }
  strokePath(g, [[-5, -reach + 1], [-5, reach - 1]], 1.6, LAMP, .85);
  for (const side of [-1, 1]) {
    strokePath(g, [[-10, side * 6], [-15, side * 12], [-25, side * 14]], 1.6, JADE, .75);
  }
}

function drawGateMarker(g, status) {
  g.clear();
  const color = status === 'closed' ? 0xf28a66 : status === 'cooling' ? BRASS : JADE;
  const offset = WIDTH.water / 2 + 8;
  for (const side of [-1, 1]) {
    const y = side * offset;
    strokePath(g, [[-13, y + side * 3], [-17, y], [-13, y - side * 3]], 4.4, SOOT, .94);
    strokePath(g, [[-13, y + side * 3], [-17, y], [-13, y - side * 3]], 2, color, 1);
  }
}

function drawShot(g, type) {
  if (type === 'blast') {
    polygon(g, SOOT, [[-6, -3], [-2, -6], [5, -5], [7, 0], [3, 6], [-5, 4]]);
    polygon(g, LIME, [[-4, -2], [-1, -5], [4, -4], [5, 0], [-2, 1]]);
    strokePath(g, [[-8, -1], [-15, 2]], 2.3, SILK, .7);
  } else if (type === 'fire') {
    polygon(g, 0xcd5239, [[-14, 1], [-7, -4], [3, -4], [7, 0], [3, 4], [-7, 3]]);
    polygon(g, LAMP, [[-10, 0], [2, -2], [7, 0], [2, 2]]);
    g.beginFill(0xffeac1).drawCircle(3, 0, 1.6).endFill();
  } else {
    strokePath(g, [[-10, 0], [7, 0]], 3.4, SOOT, 1);
    strokePath(g, [[-7, 0], [5, 0]], 1.65, SILK, 1);
    polygon(g, JADE, [[3, -3], [9, 0], [3, 3]]);
  }
}

function drawAccent(g, style) {
  g.clear();
  if (style === 'blast') {
    g.lineStyle(1.2, SOOT, .8).drawCircle(0, 0, 12).lineStyle(0);
    g.lineStyle(1.4, SILK, .9, { dash: [6, 4] }).drawCircle(0, 0, 10.6).lineStyle(0);
    g.beginFill(BRASS, .26).drawCircle(0, 0, 7).endFill();
  } else if (style === 'gate') {
    for (const y of [-9, 0, 9]) strokePath(g, [[-10, y + 2], [-2, y - 2], [7, y + 1]], 2.3, JADE, .95);
  } else {
    const fire = style === 'fire';
    g.beginFill(fire ? 0xce5138 : JADE, .4).drawCircle(0, 0, 6).endFill();
    g.beginFill(fire ? LAMP : SILK).drawCircle(0, 0, 2.3).endFill();
    const rays = [[[-6, -3], [-3, -2]], [[1, -5], [1, -3]], [[3, 0], [9, 0]], [[2, 3], [4, 5]]];
    for (const ray of rays) strokePath(g, ray, 1.6, fire ? LAMP : JADE, 1);
  }
}

/**
 * The moving part of the view. `show(world, events, seconds)` is called each frame: it makes and moves the sprites for
 * what the world holds, and plays what the events say.
 */
export function createView(game, { sound }) {
  // Layers, back to front, so a tower built late is still behind the raiders and the shots.
  const reach = game.sprite(), landing = game.sprite(),
    layers = { gates: game.sprite(), towers: game.sprite(), status: game.sprite(), raiders: game.sprite(),
      bars: game.sprite(), shots: game.sprite(), accents: game.sprite(), words: game.sprite() };
  reach.visible = landing.visible = false;
  let reachKey = '', landingKey = '';
  const towers = new Map(),
    raiders = new Map(),
    shots = new Map(),
    floats = new Set();
  const gates = GATES.map((gate) => {
    const p = WAYS.water.at(gate.at);
    const leaf = game.sprite(drawSluice, layers.gates);
    const marker = game.sprite(undefined, layers.gates);
    for (const node of [leaf, marker]) {
      node.x = p.x;
      node.y = p.y;
      node.rotation = (p.angle * 180) / Math.PI;
      node.visible = false;
    }
    return { leaf, marker, status: '' };
  });
  const accents = Array.from({ length: 12 }, () => {
    const sprite = game.sprite(undefined, layers.accents);
    sprite.visible = false;
    return { sprite, style: '', until: 0, span: 0 };
  });
  let nextAccent = 0;

  function accent(time, style, x, y, rotation = 0, scale = 1) {
    if (game.reducedMotion) return;
    const entry = accents[nextAccent];
    nextAccent = (nextAccent + 1) % accents.length;
    if (entry.style !== style) {
      drawAccent(entry.sprite.graphics, style);
      entry.style = style;
    }
    entry.span = style === 'blast' ? .36 : .24;
    entry.until = time + entry.span;
    const sprite = entry.sprite;
    sprite.x = x;
    sprite.y = y;
    sprite.rotation = rotation;
    sprite.scaleX = sprite.scaleY = scale;
    sprite.alpha = 1;
    sprite.visible = true;
  }

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
      const back = game.rect(0, 0, radius * 2 + 2, 5.2, SOOT, layers.bars);
      const bar = game.rect(0, 0, radius * 2, 2.7, 0xe38163, layers.bars);
      const slow = game.sprite((g) => {
        g.lineStyle(2.2, JADE, .9).drawEllipse(-radius, 3, radius * 2, 9).lineStyle(0);
      }, layers.status);
      const flame = game.sprite((g) => {
        polygon(g, LACQUER, [[-5, 3], [-5, -2], [-1, -5], [0, -8], [5, -3], [5, 2], [2, 5]]);
        polygon(g, LAMP, [[-3, 3], [-2, -1], [1, -4], [3, 2], [1, 4]]);
      }, layers.bars);
      entry = { body, back, bar, flame, slow, radius, boat: raider.way === 'water' };
      raiders.set(raider.id, entry);
    }
    return entry;
  }

  function float(x, y, words, color) {
    if (floats.size >= 14) return;
    const label = game.text(words, { x, y: y - 21, size: 17, color, align: 'center', bold: true, layer: layers.words });
    floats.add(label);
    game
      .tween(label)
      .to({ y: y - (game.reducedMotion ? 21 : 45), alpha: 0 }, 0.85, 'quadOut')
      .onFinish(() => {
        if (floats.delete(label)) game.remove(label);
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
      const key = `${plot}:${kind}:${level}`;
      if (key !== reachKey) {
        const g = reach.graphics, color = TOWER_LIGHT[kind];
        g.clear().beginFill(color, .065).drawCircle(0, 0, radius).endFill();
        g.lineStyle(3.8, SOOT, .65).drawCircle(0, 0, radius).lineStyle(0);
        g.lineStyle(2, color, .83, { dash: [8, 5] }).drawCircle(0, 0, radius).lineStyle(0);
        if (spec.minRange) {
          g.beginFill(0x572d2c, .26).drawCircle(0, 0, spec.minRange).endFill();
          g.lineStyle(2.2, 0xf49b73, .9, { dash: [3, 5] }).drawCircle(0, 0, spec.minRange).lineStyle(0);
        }
        for (const side of [-1, 1]) for (const top of [-1, 1]) {
          strokePath(g, [[side * 15, top * 21], [side * 21, top * 21], [side * 21, top * 15]], 2.5, color, .96);
        }
        reachKey = key;
      }
      reach.x = x;
      reach.y = y;
      reach.visible = true;
    },

    /** Where this vessel's crew would land if it sank at its current position. */
    showLanding(boat, point) {
      if (!boat || !point) {
        landing.visible = false;
        return;
      }
      const x = Math.round(boat.x), y = Math.round(boat.y);
      const tx = Math.round(point.x), ty = Math.round(point.y);
      const key = `${boat.kind}:${x}:${y}:${tx}:${ty}`;
      if (key !== landingKey) {
        const g = landing.graphics;
        const seafoam = 0x93f1d8;
        const padding = RAIDERS[boat.kind].radius + 6;
        const aim = Math.atan2(ty - y, tx - x);
        const dx = Math.cos(aim), dy = Math.sin(aim);
        const fromX = x + dx * padding, fromY = y + dy * padding;
        const toX = tx - dx * 18, toY = ty - dy * 18;
        g.clear();
        g.lineStyle(5, SOOT, .86).drawCircle(x, y, padding).drawCircle(tx, ty, 19).lineStyle(0);
        if (Math.hypot(tx - x, ty - y) > padding + 22) {
          strokePath(g, [[fromX, fromY], [toX, toY]], 5, SOOT, .84);
          g.lineStyle(2.6, seafoam, .95, { dash: [8, 6], caps: 'round' });
          g.moveTo(fromX, fromY).lineTo(toX, toY).lineStyle(0);
          polygon(g, seafoam, [[toX, toY], [toX - dx * 9 - dy * 5, toY - dy * 9 + dx * 5],
            [toX - dx * 9 + dy * 5, toY - dy * 9 - dx * 5]]);
        }
        g.beginFill(SOOT, .76).drawCircle(tx, ty, 17).endFill();
        g.lineStyle(2.2, seafoam, .98).drawCircle(x, y, padding).drawCircle(tx, ty, 18).lineStyle(0);
        polygon(g, seafoam, [[tx, ty - 8], [tx + 8, ty], [tx, ty + 8], [tx - 8, ty]]);
        landingKey = key;
      }
      landing.visible = true;
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
        entry.slow.visible = raider.slow > 0;
        entry.slow.x = raider.x;
        entry.slow.y = raider.y;
        const top = raider.y - entry.radius - (entry.boat ? 10 : 9);
        entry.back.x = entry.bar.x = raider.x;
        entry.back.y = entry.bar.y = top;
        const share = Math.min(1, Math.max(0, raider.hp / raider.max));
        entry.bar.scaleX = share;
        entry.bar.x = raider.x - entry.radius * (1 - share);
        entry.back.visible = entry.bar.visible = share < 1 || raider.kind === 'flagship';
        entry.flame.visible = raider.burnLeft > 0;
        if (entry.flame.visible) {
          const sway = game.reducedMotion ? 0 : Math.sin(world.time * 15 + raider.id);
          entry.flame.x = raider.x + sway * 1.8;
          entry.flame.y = raider.y - 6 - Math.abs(sway) * 2.1;
        }
      }
      for (const [id, entry] of raiders)
        if (!alive.has(id)) {
          for (const part of [entry.body, entry.back, entry.bar, entry.flame, entry.slow]) game.remove(part);
          raiders.delete(id);
        }

      // Shots: an arrow is a short stroke, a stone flies in an arc, a fire arrow is a spark.
      const flying = new Set();
      for (const shot of world.shots) {
        flying.add(shot.id);
        let sprite = shots.get(shot.id);
        if (!sprite) {
          sprite = game.sprite((g) => drawShot(g, shot.type), layers.shots);
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

      world.gates.forEach((gate, index) => {
        const entry = gates[index];
        const status = gate.shutLeft > 0 ? 'closed' : gate.cooldownLeft > 0 ? 'cooling' : 'ready';
        if (status !== entry.status) {
          entry.status = status;
          entry.leaf.visible = status === 'closed';
          drawGateMarker(entry.marker.graphics, status);
          entry.marker.visible = true;
        }
      });
      for (const entry of accents) if (entry.sprite.visible) {
        const fraction = (entry.until - world.time) / entry.span;
        entry.sprite.visible = !game.reducedMotion && fraction > 0;
        if (entry.sprite.visible) entry.sprite.alpha = Math.sqrt(Math.min(1, fraction));
      }

      // What happened: sounds, bursts, floating numbers and a shake for what reached the wall.
      let shotSounds = 0, bursts = 0;
      for (const event of events) {
        if (event.type === 'shot') {
          if (shotSounds++ < 2) sound('shot', event.tower);
          const tower = world.towers[event.from];
          if (tower) {
            const angle = tower.angle;
            accent(world.time, event.tower === 'fire' ? 'fire' : 'pierce',
              tower.x + Math.cos(angle) * 13, tower.y + Math.sin(angle) * 10 - 5, angle * 180 / Math.PI, .85);
          }
        } else if (event.type === 'hit') {
          const style = TOWERS[event.tower].kind;
          accent(world.time, style, event.x, event.y, 0, event.splash ? Math.min(event.splash, 46) / 12 : 1);
          if (event.splash) {
            if (!game.reducedMotion && bursts++ < 4) game.burst(event.x, event.y, { color: LIME, count: 7, speed: 76, life: .3, size: 2.1 });
            sound('crash');
          }
        } else if (event.type === 'kill') {
          if (!game.reducedMotion && bursts++ < 4) {
            game.burst(event.x, event.y, { color: RAIDERS[event.kind].way === 'water' ? JADE : BRASS, count: event.kind === 'flagship' ? 23 : 7, speed: 91, life: .41, size: 2 });
          }
          float(event.x, event.y, `+${event.bounty}`, LAMP);
          sound(event.kind === 'flagship' || event.kind === 'junk' ? 'sink' : 'down');
        } else if (event.type === 'leak') {
          if (!game.reducedMotion) game.shake(3, .17);
          const water = RAIDERS[event.kind]?.way === 'water';
          accent(world.time, 'fire', 936, water ? 340 : 446, 0, 2.1);
          sound('leak');
        } else if (event.type === 'gate' && event.open) {
          const leaf = gates[event.gate].leaf;
          accent(world.time, 'gate', leaf.x, leaf.y, leaf.rotation, 1.25);
          sound('gate');
        } else if (event.type === 'ashore') {
          accent(world.time, 'gate', event.x, event.y);
        }
      }
    },

    /** Every sprite of the moving part taken away, for a new game. */
    clear() {
      for (const entry of towers.values()) game.remove(entry.sprite);
      for (const entry of raiders.values()) for (const part of [entry.body, entry.back, entry.bar, entry.flame, entry.slow]) game.remove(part);
      for (const sprite of shots.values()) game.remove(sprite);
      for (const label of floats) game.remove(label);
      towers.clear();
      raiders.clear();
      shots.clear();
      floats.clear();
      reach.visible = landing.visible = false;
      for (const entry of gates) {
        entry.leaf.visible = entry.marker.visible = false;
        entry.status = '';
      }
      for (const entry of accents) entry.sprite.visible = false;
    }
  };
}
