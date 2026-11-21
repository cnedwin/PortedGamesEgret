// 可动场景：将规则坐标与事件画成塔、敌船、闸门和战斗反馈。
// The moving scene: place the towers, raiders, gates and feedback from the simulation.
import { GATES, PLOTS, RAIDERS, TOWERS, WIDTH } from './sim/data.mjs';
import { WAYS } from './sim/world.mjs';
import { createCombatEffects } from './combat-fx.mjs';
import { poseFall, poseGate, poseRaider, poseShot, poseTower } from './motion.mjs';

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

function drawCrossbow(g, y) {
  strokePath(g, [[-8, y + 2], [9, y]], 4.4, SOOT, 1);
  strokePath(g, [[-8, y + 2], [9, y]], 2.2, SILK, 1);
  g.lineStyle(2, JADE, 1, { caps: 'round' }).moveTo(3, y - 4).curveTo(10, y - 3, 9, y)
    .curveTo(10, y + 3, 3, y + 4).lineStyle(0);
  strokePath(g, [[3, y - 4], [-1, y + 1], [3, y + 4]], 1, LIME, 1);
}

function drawWatchtower(g, level, rigged) {
  polygon(g, SOOT, [[-15, 11], [-13, -22], [13, -22], [15, 11]]);
  g.beginFill(0x655245).drawRect(-11, -21, 22, 30).endFill();
  g.beginFill(0x3d3630).drawRect(4, -21, 7, 30).endFill();
  g.beginFill(SOOT).drawRect(-8, -16, 16, 10).endFill();
  g.beginFill(LAMP).drawRect(-3, 0, 6, 8).endFill();
  roof(g, -4, 17, 9, 0x365c55);
  roof(g, -19, 14, 9 + level * 2, 0x4e756c);
  if (!rigged) drawCrossbow(g, -10.5);
  if (level) {
    strokePath(g, [[10, -9], [10, 7]], 2.5, LACQUER, 1);
    g.beginFill(LAMP).drawCircle(10, 6, 2.3).endFill();
  }
}

function drawThrowerArm(g, level, y) {
  const tip = y - 14 - level * 3;
  strokePath(g, [[-14, y + 11], [17, tip]], 6, SOOT, 1);
  strokePath(g, [[-14, y + 10], [17, tip]], 2.8, SILK, 1);
  strokePath(g, [[17, tip], [20, tip + 8], [16, tip + 12]], 1.8, BRASS, 1);
  g.beginFill(SOOT).drawRoundRect(-19, y + 7, 11, 13, 3).endFill();
  g.beginFill(LACQUER).drawRect(-17, y + 9, 7, 5).endFill();
  g.beginFill(BRASS).drawCircle(0, y, 4).endFill();
  g.beginFill(SOOT).drawCircle(0, y, 1.8).endFill();
}

function drawThrower(g, level, rigged) {
  g.beginFill(0x786858).drawRect(-17, 5, 34, 7).endFill();
  g.beginFill(LIME).drawRect(-16, 6, 11, 3).drawRect(2, 6, 13, 3).endFill();
  strokePath(g, [[-15, 7], [-5, -15], [6, -15], [15, 7]], 6, SOOT, 1);
  strokePath(g, [[-15, 7], [-5, -15], [6, -15], [15, 7]], 2.8, 0xa5794f, 1);
  strokePath(g, [[-10, 4], [6, -9], [14, 5]], 2.1, LIME, 1);
  if (!rigged) drawThrowerArm(g, level, -14);
}

function drawBlaze(g, level) {
  g.beginFill(0xf4793f, .2).drawCircle(0, -19, 16).endFill();
  g.beginFill(0xf28145).moveTo(-10, -12).curveTo(-15, -23, -5, -25)
    .curveTo(-2, -29, -5, -33 - level * 2).curveTo(6, -32, 7, -21)
    .lineTo(10, -25).curveTo(15, -15, 7, -10).lineTo(-10, -12).endFill();
  g.beginFill(LAMP).moveTo(-6, -12).curveTo(-7, -18, 2, -23).curveTo(7, -18, 6, -12).lineTo(-6, -12).endFill();
  g.beginFill(0xffedbd).drawCircle(8, -34 - level, 1.5).drawCircle(-8, -29, 1.2).endFill();
}

function drawBeacon(g, level, rigged) {
  polygon(g, SOOT, [[-16, 10], [-14, -12], [14, -12], [16, 10]]);
  g.beginFill(0x7d3c32).drawRect(-13, -10, 26, 17).endFill();
  g.beginFill(LACQUER).drawRect(-14, -7, 4, 16).drawRect(10, -7, 4, 16).endFill();
  g.beginFill(SOOT).drawRect(-7, -9, 14, 12).endFill();
  g.beginFill(LAMP).drawRect(-4, -6, 8, 6).endFill();
  if (!rigged) drawBlaze(g, level);
  polygon(g, BRASS, [[-17, -13], [17, -13], [11, -8], [-11, -8]]);
}

function drawGongDisc(g, y) {
  strokePath(g, [[0, y - 12], [0, y - 7]], 1.5, SILK, .9);
  g.beginFill(SOOT).drawCircle(0, y, 12.7).endFill();
  g.beginFill(SILK).drawCircle(0, y, 10.7).endFill();
  g.beginFill(BRASS).drawCircle(.6, y + .6, 8.6).endFill();
  g.beginFill(0x80532f).drawCircle(1.4, y + 1.1, 5.8).endFill();
  g.beginFill(LAMP).drawCircle(-.7, y - 1.1, 3.2).endFill();
}

function drawGong(g, level, rigged) {
  strokePath(g, [[-14, 9], [-14, -21], [14, -21], [14, 9]], 6, SOOT, 1);
  strokePath(g, [[-14, 7], [-14, -20], [14, -20], [14, 7]], 2.7, LACQUER, 1);
  roof(g, -22, 17, 7 + level, 0x626255);
  strokePath(g, [[-6, -19], [-4, -13], [4, -13], [6, -19]], 1.5, SILK, .85);
  if (!rigged) drawGongDisc(g, -4);
  g.beginFill(LACQUER).drawRect(-16, 6, 4, 4).drawRect(12, 6, 4, 4).endFill();
}

const TOWER_ART = { crossbow: drawWatchtower, trebuchet: drawThrower, fire: drawBeacon, gong: drawGong };

/** A tower shares its plot's centre, with a stone foundation and illuminated rank. */
export function drawTower(g, kind, level) {
  drawTowerBase(g, kind, level, false);
}

function drawTowerBase(g, kind, level, rigged) {
  g.clear();
  g.beginFill(SOOT, .56).drawEllipse(-22, 6, 44, 18).endFill();
  polygon(g, SOOT, [[-19, 6], [18, 6], [21, 14], [15, 19], [-17, 19], [-21, 14]]);
  polygon(g, 0x70685b, [[-18, 7], [17, 7], [20, 13], [-20, 13]]);
  g.beginFill(LIME).drawRect(-15, 11, 30, 2.4).endFill();
  TOWER_ART[kind](g, level, rigged);
  g.beginFill(SOOT).drawRoundRect(-11, 13, 22, 7.5, 3).endFill();
  for (let i = 0; i < 3; i++) g.beginFill(i <= level ? TOWER_LIGHT[kind] : 0x6c6857).drawCircle(-6 + i * 6, 16.7, 2.05).endFill();
}

function drawFootBody(g, armoured) {
  polygon(g, SOOT, [[-8, -4], [5, -5], [9, 8], [3, 11], [-8, 9]]);
  polygon(g, armoured ? 0x586966 : 0x975743, [[-6, -3], [4, -4], [5, 7], [-7, 7]]);
  g.beginFill(SILK).drawCircle(0, -7, 4.4).endFill();
  polygon(g, SOOT, [[-9, -7], [-4, -13], [3, -14], [9, -8], [5, -7]]);
  strokePath(g, [[-5, -4], [5, -4]], 2.3, 0xcf634c, 1);
}

function drawLeg(g, near) {
  strokePath(g, [[0, 0], [near ? 1 : -1, 4], [near ? 2 : -3, 8], [near ? 4 : -1, 8]], 4.4, SOOT, 1);
  strokePath(g, [[0, 0], [near ? 1 : -1, 4], [near ? 2 : -3, 7]], 1.9, near ? 0xb28b66 : SHALE, 1);
}

function drawGear(g, armoured) {
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

const BOATS = {
  skiff: { length: 16, beam: 5.7, oar: 11, sails: [] },
  junk: { length: 23, beam: 7.6, oar: 13, sails: [[-8, -3, 14, 18, SILK]] },
  flagship: { length: 32, beam: 9.5, oar: 16, sails: [[-8, -4, 16, 24, 0xb35e4c], [11, -3, 12, 16, SILK]] }
};

function drawWake(g, { length, beam }) {
  for (const side of [-1, 1]) {
    g.lineStyle(1.8, JADE, .86, { caps: 'round' }).moveTo(-length - 16, side * (beam + 7))
      .curveTo(-length / 2, side * (beam + 1), length / 2, side * (beam + 2)).lineStyle(0);
    strokePath(g, [[-length - 21, side * (beam + 3)], [-length - 14, side * beam], [-length - 9, side * (beam - 1)]], 1.4, SILK, .5);
  }
}

function drawOar(g, length) {
  strokePath(g, [[0, -2], [-1, length]], 3, SOOT, 1);
  strokePath(g, [[0, -1], [-1, length - 1]], 1.7, BRASS, 1);
  polygon(g, SILK, [[-2.5, length - 3], [.7, length - 3], [1, length + 2], [-3.2, length + 1]]);
}

/** Hulls are laid out along local X so bows and wakes follow the canal. */
function drawHull(g, kind, { length, beam }) {
  const small = kind === 'skiff', leader = kind === 'flagship';
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
    if (leader) {
      polygon(g, LACQUER, [[-24, -18], [-13, -17], [-17, -12], [-23, -13]]);
      strokePath(g, [[-24, -20], [-24, -2]], 1.6, BRASS, 1);
    }
  }
}

function buildRaiderRig(game, anchor, kind) {
  const boat = BOATS[kind];
  if (!boat) {
    game.sprite((g) => g.beginFill(SOOT, .5).drawEllipse(-12, 5, 24, 9).endFill(), anchor);
    const visual = game.sprite(undefined, anchor);
    const legs = [-3, 2.3].map((x, i) => {
      const leg = game.sprite((g) => drawLeg(g, i === 1), visual);
      leg.x = x;
      leg.y = 5;
      return leg;
    });
    const armoured = kind === 'shield';
    game.sprite((g) => drawFootBody(g, armoured), visual);
    const gear = game.sprite((g) => drawGear(g, armoured), visual);
    return { visual, legs, gear };
  }
  const wake = game.sprite((g) => drawWake(g, boat), anchor);
  const visual = game.sprite(undefined, anchor);
  const oars = [-1, 1].map((side) => {
    const oar = game.sprite((g) => drawOar(g, boat.oar), visual);
    oar.x = -boat.length * .15;
    oar.y = side * boat.beam;
    oar.scaleY = side;
    return [side, oar];
  });
  game.sprite((g) => drawHull(g, kind, boat), visual);
  const sails = boat.sails.map(([x, y, width, height, color]) => {
    const sail = game.sprite((g) => drawSail(g, 0, -height, width, height, color), visual);
    sail.x = x;
    sail.y = y;
    return sail;
  });
  return { visual, wake, oars, sails };
}

function drawSluiceLeaf(g, side) {
  const reach = WIDTH.water / 2 + 4;
  const start = side < 0 ? 0 : -reach;
  g.beginFill(SOOT).drawRoundRect(-7, start, 14, reach, 3).endFill();
  g.beginFill(0x673f34).drawRect(-4.7, start + 2, 9.4, reach - 4).endFill();
  for (let y = start + 5; y < start + reach - 2; y += 7) {
    g.beginFill(0x995a40).drawRect(-4.5, y, 8.8, 3.3).endFill();
    g.beginFill(BRASS).drawCircle(2.3, y + 1, 1.2).endFill();
  }
  strokePath(g, [[-5, start + 1], [-5, start + reach - 1]], 1.6, LAMP, .85);
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
    strokePath(g, [[-25, 1], [-16, 1], [-6, 0]], 3.4, SOOT, .74);
    strokePath(g, [[-23, 1], [-14, 1], [-8, 0]], 1.8, SILK, .6);
    polygon(g, SOOT, [[-6, -3], [-2, -6], [5, -5], [7, 0], [3, 6], [-5, 4]]);
    polygon(g, LIME, [[-4, -2], [-1, -5], [4, -4], [5, 0], [-2, 1]]);
    strokePath(g, [[-8, -1], [-15, 2]], 2.3, SILK, .7);
  } else if (type === 'fire') {
    strokePath(g, [[-30, 3], [-21, -2], [-13, 1]], 3.6, LACQUER, .7);
    strokePath(g, [[-26, 2], [-19, 0], [-12, 0]], 1.7, LAMP, .83);
    polygon(g, 0xcd5239, [[-14, 1], [-7, -4], [3, -4], [7, 0], [3, 4], [-7, 3]]);
    polygon(g, LAMP, [[-10, 0], [2, -2], [7, 0], [2, 2]]);
    g.beginFill(0xffeac1).drawCircle(3, 0, 1.6).endFill();
  } else {
    strokePath(g, [[-24, 0], [-12, 0]], 1.5, JADE, .73);
    strokePath(g, [[-10, 0], [7, 0]], 3.4, SOOT, 1);
    strokePath(g, [[-7, 0], [5, 0]], 1.65, SILK, 1);
    polygon(g, JADE, [[3, -3], [9, 0], [3, 3]]);
  }
}

const MECHANISM_ART = {
  crossbow: (g) => drawCrossbow(g, 0),
  trebuchet: (g, level) => drawThrowerArm(g, level, 0),
  fire: drawBlaze,
  gong: (g) => drawGongDisc(g, 8)
};

/**
 * Place stable anchors from simulation state. Legs, oars, machinery and transient reactions
 * move in the visual layers only.
 */
export function createView(game, { sound }) {
  // Layers, back to front, so a tower built late is still behind the raiders and the shots.
  const reach = game.sprite(), landing = game.sprite(),
    layers = { gates: game.sprite(), towers: game.sprite(), status: game.sprite(), raiders: game.sprite(),
      bars: game.sprite(), shots: game.sprite(), accents: game.sprite(), words: game.sprite() };
  reach.visible = landing.visible = false;
  let reachKey = '', landingKey = '';
  const towers = new Map(), raiders = new Map(), shots = new Map();
  const alive = new Set(), flying = new Set();
  const effects = createCombatEffects(game, { sound, layers });
  let previousTime;
  const gates = GATES.map((gate) => {
    const p = WAYS.water.at(gate.at);
    const anchor = game.sprite(undefined, layers.gates);
    anchor.x = p.x;
    anchor.y = p.y;
    anchor.rotation = p.angle * 180 / Math.PI;
    anchor.visible = false;
    const leaves = [-1, 1].map((side) => {
      const leaf = game.sprite((g) => drawSluiceLeaf(g, side), anchor);
      leaf.y = side * (WIDTH.water / 2 + 4);
      return [side, leaf];
    });
    const marker = game.sprite(undefined, anchor);
    return { anchor, leaves, marker, status: '', pose: 0, target: 0, start: 0, changedAt: -Infinity };
  });

  function towerSprite(tower) {
    let entry = towers.get(tower.plot);
    if (!entry || entry.kind !== tower.kind) {
      if (entry) game.remove(entry.sprite);
      const sprite = game.sprite(undefined, layers.towers);
      const work = game.sprite(undefined, sprite);
      sprite.x = tower.x;
      sprite.y = tower.y;
      entry = { kind: tower.kind, level: -1, sprite, work, firedAt: -Infinity, nextGong: 0 };
      if (tower.kind === 'gong') {
        entry.mallet = game.sprite((g) => {
          strokePath(g, [[0, 0], [10, -6]], 3.5, SOOT, 1);
          strokePath(g, [[0, 0], [10, -6]], 1.8, LIME, 1);
          g.beginFill(LACQUER).drawCircle(10, -6, 3.2).endFill();
        }, sprite);
        entry.mallet.x = -15;
        entry.mallet.y = 4;
      }
      towers.set(tower.plot, entry);
    }
    if (entry.level !== tower.level) {
      drawTowerBase(entry.sprite.graphics, tower.kind, tower.level, true);
      entry.work.graphics.clear();
      MECHANISM_ART[tower.kind](entry.work.graphics, tower.level);
      entry.level = tower.level;
    }
    return entry;
  }

  function raiderSprite(raider) {
    let entry = raiders.get(raider.id);
    if (!entry) {
      const body = game.sprite(undefined, layers.raiders);
      const rig = buildRaiderRig(game, body, raider.kind);
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
      entry = { body, rig, back, bar, flame, slow, radius, boat: raider.way === 'water',
        distance: raider.s, drive: 1, hp: raider.max, hitAt: -Infinity, fellAt: null };
      raiders.set(raider.id, entry);
    }
    return entry;
  }

  function removeRaider(entry) {
    for (const part of [entry.body, entry.back, entry.bar, entry.flame, entry.slow]) game.remove(part);
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
      const time = world.time, reducedMotion = game.reducedMotion;
      const dt = previousTime === undefined ? 0 : Math.max(0, time - previousTime);
      previousTime = time;

      // Towers: made when built, drawn again when raised, removed when sold.
      for (const [plot, entry] of towers)
        if (!world.towers[plot]) {
          game.remove(entry.sprite);
          towers.delete(plot);
        }
      for (const tower of world.towers) if (tower) towerSprite(tower);

      let hits, fallen, visualEvents = events;
      for (const event of events) {
        if (event.type === 'shot') {
          const entry = towers.get(event.from);
          if (entry) entry.firedAt = time;
        } else if (event.type === 'hit') {
          (hits ??= []).push(event);
        } else if (event.type === 'kill') {
          (fallen ??= new Map()).set(event.id, event);
        }
      }
      for (const tower of world.towers) {
        if (!tower) continue;
        const entry = towers.get(tower.plot);
        if (tower.kind === 'gong' && time >= entry.nextGong) {
          const range = TOWERS.gong.levels[tower.level].range;
          if (world.raiders.some((raider) => raider.hp > 0 &&
              (raider.x - tower.x) ** 2 + (raider.y - tower.y) ** 2 <= range ** 2)) {
            entry.firedAt = time;
            entry.nextGong = time + 1.65;
            if (visualEvents === events) visualEvents = events.slice();
            visualEvents.push({ type: 'gong', x: tower.x, y: tower.y, radius: range });
          } else {
            entry.nextGong = time + 0.18;
          }
        }
        poseTower(entry, tower, time, reducedMotion);
      }

      // Each anchor follows the rules' place while its child rig animates locally.
      alive.clear();
      for (const raider of world.raiders) {
        alive.add(raider.id);
        const entry = raiderSprite(raider);
        entry.body.x = raider.x;
        entry.body.y = raider.y;
        entry.body.rotation = entry.boat ? (raider.angle * 180) / Math.PI : 0;
        if (entry.hp > raider.hp && hits?.some((event) => {
          if (event.id === raider.id) return true;
          const reach = event.splash + entry.radius;
          return event.splash && (event.x - raider.x) ** 2 + (event.y - raider.y) ** 2 <= reach ** 2;
        })) entry.hitAt = time;
        entry.hp = raider.hp;
        poseRaider(entry, raider, time, dt, WAYS[raider.way].length, reducedMotion);
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
          const sway = reducedMotion ? 0 : Math.sin(time * 15 + raider.id);
          entry.flame.x = raider.x + sway * 1.8;
          entry.flame.y = raider.y - 6 - Math.abs(sway) * 2.1;
        }
      }
      for (const [id, entry] of raiders) {
        if (alive.has(id)) continue;
        const terminal = fallen?.get(id);
        if (!reducedMotion && terminal) {
          entry.body.x = terminal.x;
          entry.body.y = terminal.y;
          entry.fellAt = time;
          entry.back.visible = entry.bar.visible = entry.flame.visible = entry.slow.visible = false;
        }
        if (!reducedMotion && entry.fellAt !== null && poseFall(entry, time)) continue;
        removeRaider(entry);
        raiders.delete(id);
      }

      // Projectile bodies and trails share the tangent of the same flight.
      flying.clear();
      for (const shot of world.shots) {
        flying.add(shot.id);
        let sprite = shots.get(shot.id);
        if (!sprite) {
          sprite = game.sprite((g) => drawShot(g, shot.type), layers.shots);
          shots.set(shot.id, sprite);
        }
        poseShot(sprite, shot, reducedMotion);
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
          drawGateMarker(entry.marker.graphics, status);
          entry.anchor.visible = true;
        }
        poseGate(entry, status === 'closed', time, reducedMotion);
      });
      effects.show(world, visualEvents);
    },

    /** Every sprite of the moving part taken away, for a new game. */
    clear() {
      for (const entry of towers.values()) game.remove(entry.sprite);
      for (const entry of raiders.values()) removeRaider(entry);
      for (const sprite of shots.values()) game.remove(sprite);
      towers.clear();
      raiders.clear();
      shots.clear();
      previousTime = undefined;
      reach.visible = landing.visible = false;
      for (const entry of gates) {
        entry.anchor.visible = false;
        entry.status = '';
        entry.pose = entry.target = entry.start = 0;
        entry.changedAt = -Infinity;
      }
      effects.clear();
    }
  };
}
