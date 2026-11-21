// Layered watercolor miniatures. Geometry is drawn once per kind/level/season;
// the town blits small sprites when a map repaint is needed.
import { YAMEN_SIGN } from './i18n.mjs';

const W = 104, H = 88, DETAIL_SCALE = 2;
const MAX_SPRITES = 148;
const sheets = new Map();
const TAU = Math.PI * 2;
const INK = '#53625d';
const WOOD = '#927457';
const GOLD = '#b79653';
const LACQUER = '#ad6154';
const SEASONS = [
  { leaves: '#95ad80', light: '#bdca99', blossom: '#e7a5a9', water: '#91bcb0' },
  { leaves: '#749b7b', light: '#a3bb8e', blossom: '#dbb998', water: '#82b7b3' },
  { leaves: '#bb935e', light: '#d4b180', blossom: '#dba983', water: '#9eb7a7' },
  { leaves: '#9baaa3', light: '#e7ebd9', blossom: '#c5ccd0', water: '#bdcfcc' }
];
const ROOFS = {
  slate: ['#b3bdad', '#78918b', '#506e69'],
  blue: ['#b4c9c4', '#7a969f', '#506f7d'],
  warm: ['#dfbf8b', '#bb8d65', '#8b6655'],
  red: ['#dca18c', '#ab655c', '#865047'],
  olive: ['#c0c09a', '#8d9a73', '#627761']
};

function path(g, points, fill, stroke, width = .65) {
  g.beginPath();
  g.moveTo(...points[0]);
  for (const point of points.slice(1)) g.lineTo(...point);
  if (fill) {
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.lineWidth = width;
    g.strokeStyle = stroke;
    g.stroke();
  }
}
function oval(g, x, y, rx, ry, fill, angle = 0) {
  g.beginPath();
  g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), angle, 0, TAU);
  g.fillStyle = fill;
  g.fill();
}
function tone(g, x1, y1, x2, y2, ...colors) {
  const result = g.createLinearGradient(x1, y1, x2, y2);
  colors.forEach((color, index) => result.addColorStop(index / (colors.length - 1), color));
  return result;
}
function shade(g, x, y, w, h) {
  const ink = g.createRadialGradient(x, y, 0, x, y, w);
  ink.addColorStop(0, 'rgba(69,81,61,.27)');
  ink.addColorStop(.46, 'rgba(91,100,72,.15)');
  ink.addColorStop(1, 'rgba(91,100,72,0)');
  oval(g, x, y, w, h, ink, -.08);
}
function rhythm(index, seed = 1) {
  const value = Math.sin((index + 1.47) * (12.9898 + seed)) * 43758.5453;
  return value - Math.floor(value);
}
function growth(level) {
  const lv = Math.max(1, Math.min(81, Math.floor(level) || 1));
  const stage = [2, 3, 4, 7, 14, 26, 45, 65].filter((at) => lv >= at).length;
  return { level: lv, stage, pace: (lv - 1) / 80, courses: (lv - 1) % 10 };
}

function foliage(g, x, y, size, season, blossoms = false) {
  shade(g, x + size * .5, y + 3, size * 1.45, size * .34);
  path(g, [[x, y + 3], [x + size * .06, y - size * .82], [x - size * .45, y - size * 1.15]], null, '#8b795c', .95);
  path(g, [[x + size * .06, y - size * .4], [x + size * .45, y - size * .97]], null, '#8b795c', .6);
  for (let i = 0; i < 11; i++) {
    const dx = (rhythm(i, x) - .5) * size * 1.7;
    const dy = rhythm(i, y) * size * .9;
    const bloom = blossoms && i % 3 === 0;
    g.globalAlpha = .69;
    oval(g, x + dx, y - size * .65 - dy, size * (.32 + rhythm(i, 5) * .3), size * .36, bloom ? season.blossom : i % 2 ? season.leaves : season.light, dx * .036);
    if (bloom) oval(g, x + dx + .3, y - size * .67 - dy, .8, .7, '#f9dfc0');
  }
  g.globalAlpha = 1;
}

function plinth(g, x, foot, w, depth, step, stone = '#c6b697') {
  shade(g, x + w / 2 + 5, foot, w * .68, depth * .6 + 2);
  path(g, [[x - 2, foot - 4], [x + w + 1, foot - 4], [x + w + depth, foot - depth * .46 - 4], [x + depth, foot - depth * .46 - 4]], '#e1d4b0');
  path(g, [[x - 2, foot - 4], [x + w + 1, foot - 4], [x + w + 1, foot + 1], [x - 2, foot + 1]], stone, '#ac9b7f');
  path(g, [[x + w + 1, foot - 4], [x + w + depth, foot - depth * .46 - 4], [x + w + depth, foot - depth * .46], [x + w + 1, foot + 1]], '#b3ad91', '#a59b83');
  for (let i = 1; i <= 7; i++) {
    const xx = x + i * w / 8;
    path(g, [[xx, foot - 3], [xx + .9, foot + .7]], null, '#9e947c75', .5);
  }
  if (step > 0) {
    const middle = x + w / 2;
    for (let i = 0; i < step; i++) {
      const spread = w * (.09 + i * .055);
      path(g, [[middle - spread, foot - 1 + i * 1.7], [middle + spread, foot - 1 + i * 1.7], [middle + spread + 1.5, foot + .8 + i * 1.7], [middle - spread - 1.5, foot + .8 + i * 1.7]], i % 2 ? '#c1b493' : '#ddd0ad', '#a89a805c', .4);
    }
  }
}

/** Each clay tile row follows the slope and curved eaves. */
function roof(g, x, y, w, rise, colors, stage, winter) {
  const ridgeY = y - rise;
  const left = x + w * .17, right = x + w * .8;
  const ridge = tone(g, x, ridgeY, x + 3, y + 2, ...colors);
  path(g, [[x - 3, y - .9], [left, ridgeY], [right, ridgeY], [x + w + 1, y - 1]], ridge);
  path(g, [[right, ridgeY], [x + w + 5, y - 6], [x + w + 7, y - 1.4], [x + w + 1, y + 1]], colors[2], '#526761');
  g.beginPath();
  g.moveTo(x - 4, y - 2);
  g.quadraticCurveTo(x + w * .08, y + 1.3, left, ridgeY);
  g.lineTo(right, ridgeY);
  g.quadraticCurveTo(x + w * .93, y + 1.5, x + w + 3.8, y - 2);
  g.quadraticCurveTo(x + w * .50, y + 5, x - 4, y - 2);
  g.fillStyle = ridge;
  g.fill();
  const tiles = Math.ceil(w / 4);
  for (let i = 1; i < tiles; i++) {
    const t = i / tiles, tile = x + w * t;
    path(g, [[left + (right - left) * t, ridgeY + 1], [tile + (0.5 - t) * 2, y + .8]], null, i % 3 ? '#f3e7c456' : '#3b565755', .57);
  }
  g.strokeStyle = '#4f645bcc';
  g.lineWidth = 1.25;
  g.beginPath();
  g.moveTo(x - 4, y - 1.6);
  g.quadraticCurveTo(x + w / 2, y + 4.1, x + w + 4, y - 1.6);
  g.stroke();
  path(g, [[left - 2, ridgeY + 1], [left + 1, ridgeY - 1.2], [right, ridgeY - 1.2], [right + 2, ridgeY]], null, stage >= 3 ? '#6e7157' : colors[2], 1.2);
  if (winter) path(g, [[left + .8, ridgeY + .25], [right - .3, ridgeY + .3]], null, '#f8f2ddcb', 1.9);
  if (stage >= 4) {
    oval(g, left, ridgeY - .9, 1.2, 1.1, GOLD);
    oval(g, right, ridgeY - .9, 1.2, 1.1, GOLD);
  }
}

function lattice(g, x, y, w, h, wood = WOOD, curtain = null) {
  g.fillStyle = '#63736a';
  g.fillRect(x, y, w, h);
  g.fillStyle = curtain ?? '#e4caa0';
  g.fillRect(x + .7, y + .7, w - 1.4, h * .53);
  g.strokeStyle = wood;
  g.lineWidth = .48;
  g.strokeRect(x, y, w, h);
  path(g, [[x + w / 2, y], [x + w / 2, y + h]], null, wood, .5);
  path(g, [[x, y + h * .42], [x + w, y + h * .42]], null, wood, .5);
  path(g, [[x, y + h * .7], [x + w, y + h * .7]], null, wood, .5);
}

function lanternglow(g, x, y, color = LACQUER) {
  path(g, [[x, y - 6], [x, y + 3.3]], null, '#986e44', .55);
  oval(g, x, y, 2.15, 2.8, color);
  oval(g, x - .32, y -.25, 1.2, 1.65, '#ecc192');
  path(g, [[x - .8, y - 2.4], [x + .7, y - 2.4]], null, '#81663e', .5);
}
function pottery(g, x, base, radius, color = '#a77456') {
  shade(g, x + 1, base, radius * 1.7, radius * .51);
  oval(g, x, base - radius, radius, radius * .93, color);
  oval(g, x, base - radius * 1.62, radius * .73, radius * .29, '#ceae81');
  oval(g, x, base - radius * 1.68, radius * .53, radius * .17, '#7c654e');
  path(g, [[x - 1.9, base - radius * 1.23], [x - 2.3, base - radius * .65], [x - 1.4, base - radius * .33]], null, '#edd2a994', .55);
}
function flag(g, x, foot, height, color) {
  path(g, [[x, foot], [x, foot - height], [x + 8, foot - height]], null, '#95795c', .85);
  path(g, [[x + 1, foot - height + 1], [x + 7.9, foot - height + 1], [x + 7.7, foot - height + 11], [x + 1, foot - height + 13]], color);
  path(g, [[x + 3, foot - height + 4], [x + 6, foot - height + 4]], null, '#ead6ad', .58);
}

function hall(g, { cx, base, w, h, roofKind = 'slate', plaster = '#f1dec0', post = WOOD, door = true, steps = 0, lanterns = false, upper = false, pitch = 1 }, form, season) {
  const depth = w * .17, x = cx - w / 2, top = base - h;
  plinth(g, x, base, w, depth, steps);
  path(g, [[x + w, top + 2], [x + w + depth, top - depth * .49], [x + w + depth, base - depth * .47 - 1], [x + w, base - 2]], tone(g, x + w, base, x + w + depth, top, '#b7ad8e', '#d2c5a4'), '#8e886c85');
  const sideX = x + w + depth * .49;
  if (depth >= 6) lattice(g, sideX - 1, top + h * .29 - 1.5, Math.min(6, depth * .42), h * .26, '#867761');
  g.fillStyle = tone(g, x, top, x + w, base, plaster, '#dfc99f');
  g.fillRect(x, top, w, h - 2);
  g.fillStyle = post;
  g.fillRect(x, top + 1, w, 1.5);
  g.fillRect(x, base - 3, w, 1.1);
  const bays = w >= 63 ? 5 : 3;
  for (let i = 0; i <= bays; i++) {
    const column = x + w * i / bays;
    g.fillStyle = post;
    g.fillRect(column - .68, top, 1.35, h - 2);
    g.fillStyle = '#f4d9a86e';
    g.fillRect(column -.28, top + 1, .35, h - 3);
  }
  for (let i = 0; i < bays; i++) {
    const col = x + w * (i + .5) / bays;
    const wide = w / bays * .52;
    if (door && i === Math.floor(bays / 2)) {
      g.fillStyle = '#5f6554';
      g.fillRect(col - wide / 2, base - h * .69, wide, h * .67 - 1);
      for (const side of [-1, 1]) path(g, [[col + side * .8, base - h * .62], [col + side * .8, base - 3.1]], null, '#dac69d', .52);
      path(g, [[col - wide * .64, base - h * .71], [col + wide * .64, base - h * .71]], null, '#aa9265', .98);
      if (form.stage >= 2) {
        g.fillStyle = post;
        g.fillRect(col - wide * .51, top + 2.1, wide * 1.02, 2.3);
        path(g, [[col - wide * .28, top + 3.25], [col + wide * .32, top + 3.25]], null, '#e0bd83', .42);
      }
    } else lattice(g, col - wide / 2, top + h * .27, wide, h * .38, post, upper ? '#d4b88b' : null);
  }
  for (let i = 0; i < 13; i++) {
    const px = x + 1 + rhythm(i, w) * (w - 3);
    const yy = base - 3 - rhythm(i, h) * (h - 4);
    path(g, [[px, yy], [px + .7 + rhythm(i, 7), yy - .5]], null, '#a8845657', .45);
  }
  roof(g, x, top + .4, w, (h * .3 + 4) * pitch, ROOFS[roofKind], form.stage, season === SEASONS[3]);
  if (lanterns) {
    lanternglow(g, x + w * .16, top + h * .32);
    lanternglow(g, x + w * .85, top + h * .32);
  }
}

/** Extra courses extend the terrace with tangible paving, not ranks painted onto the sprite. */
function terrace(g, cx, foot, span, form, color = '#d5c49c') {
  const x = cx - span / 2;
  shade(g, cx + 2, foot, span * .67, 8.2);
  path(g, [[x - 1, foot + 2], [x + span + 4, foot + 2], [x + span + 8, foot - 6], [x + 6, foot - 6]], color, '#a5936c69');
  for (let i = 0; i <= form.courses; i++) {
    const px = x + 6.7 + span * (.055 + (i % 5) * .179);
    const py = foot - 2.7 + Math.floor(i / 5) * 3.1;
    path(g, [[px - 2.6, py], [px + 2.5, py], [px + 3.25, py + 2.4], [px - 2.8, py + 2.4]], i % 2 ? '#eee1bd' : '#beac86', '#9f96746c', .45);
  }
}

function court(g, cx, foot, w, h, form, season, { roofKind = 'slate', plaster, post, lanterns = false, wings = false, pitch = 1 } = {}) {
  terrace(g, cx, foot + 2, w + form.stage * 2, form);
  if (wings || form.stage >= 4) hall(g, { cx: cx - w * .39, base: foot - h * .67, w: w * .41, h: h * .66, roofKind, upper: true }, form, season);
  if (form.stage >= 2 && w >= 40) {
    const uw = w * (.50 + form.pace * .11);
    hall(g, { cx: cx + 4, base: foot - h * .84, w: uw, h: h * .55 + form.stage * .25, roofKind, plaster, post, upper: true }, form, season);
  }
  if (form.stage >= 1 && w >= 40) {
    // A low service wing remains readable next to the main roof at map zoom.
    hall(g, { cx: Math.min(86, cx + w * .43 + 8), base: foot - 3, w: w * .27, h: h * .61, roofKind, plaster, post }, form, season);
  }
  hall(g, { cx, base: foot, w, h, roofKind, plaster, post, lanterns, pitch, steps: Math.min(3, Math.floor(form.stage / 2)) }, form, season);
  if (form.stage >= 3 && w >= 40) {
    for (const [x, sign] of [[16, 1], [89, -1]]) {
      path(g, [[x, foot], [x + sign * 5, foot + 4], [x + sign * 16, foot + 4]], null, '#b79367', 2.25);
      path(g, [[x, foot - 3], [x + sign * 5, foot + 1], [x + sign * 16, foot + 1]], null, '#86745b', .67);
      pottery(g, x + sign * 14, foot + 4, 2.5, '#b58a68');
    }
  }
  if (form.stage >= 5) {
    path(g, [[15, foot + 1], [23, foot - 3], [25, foot - 9]], null, '#7c7156', 1);
    path(g, [[80, foot + 1], [85, foot - 3], [88, foot - 9]], null, '#7c7156', 1);
    if (lanterns) lanternglow(g, 86, foot - 14);
  }
}

const HALLS = {
  house: { w: 41, h: 22, roofKind: 'slate', pitch: 1.15 },
  manor: { w: 57, h: 25, roofKind: 'blue', wings: true, lanterns: true },
  brewery: { w: 47, h: 20, roofKind: 'warm', plaster: '#e7c9a4' },
  loom: { w: 55, h: 22, roofKind: 'olive', plaster: '#e3d0b8', pitch: .81 },
  teahouse: { w: 47, h: 24, roofKind: 'olive', post: '#87664d', lanterns: true, pitch: 1.21 },
  inn: { w: 55, h: 32, roofKind: 'warm', plaster: '#e6cdb1', wings: true, lanterns: true },
  clinic: { w: 45, h: 21, roofKind: 'blue', plaster: '#eee0c2', pitch: .89 },
  school: { w: 55, h: 23, roofKind: 'blue', post: '#8a6b52', wings: true, pitch: 1.18 },
  temple: { w: 46, h: 29, roofKind: 'red', post: '#a45f53', lanterns: true, wings: true, pitch: 1.48 }
};

function drawHall(g, kind, form, season) {
  const style = HALLS[kind], w = style.w + form.pace * 22, h = style.h + form.pace * 4;
  foliage(g, 18, 47, 7 + form.pace * 4, season, kind === 'house' || kind === 'manor');
  if (kind === 'school' || kind === 'temple' || form.stage > 2) foliage(g, 82, 52, 7 + form.pace * 4, season, kind === 'temple');
  if (kind === 'temple') {
    hall(g, { cx: 51, base: 43, w: 27 + 8 * form.pace, h: 14, roofKind: 'red', post: '#a45f53', upper: true }, form, season);
  }
  if (kind === 'school') {
    hall(g, { cx: 69, base: 48 - form.pace * 5, w: 27 + 8 * form.pace, h: 14, roofKind: 'blue', upper: true }, form, season);
  }
  if (kind === 'inn' && form.stage >= 2) {
    hall(g, { cx: 34, base: 32, w: 24 + 5 * form.pace, h: 14, roofKind: 'warm', post: '#925f4b', upper: true, lanterns: true }, form, season);
  }
  if (kind === 'temple' && form.stage >= 2) {
    hall(g, { cx: 22, base: 44, w: 15 + 5 * form.pace, h: 15, roofKind: 'red', post: '#956155', upper: true }, form, season);
    oval(g, 21, 37, 1.9, 2.6, '#c5a365');
  }
  court(g, 49, 70, w, h, form, season, style);
  if (kind === 'house' || kind === 'manor') {
    pottery(g, 21, 72, 2.8, '#b18464');
    if (form.stage >= 1) foliage(g, 84, 70, 5.8, season, true);
  }
  if (kind === 'brewery') {
    for (let i = 0; i < 3 + Math.min(3, form.stage); i++) pottery(g, 17 + i * 10, 72 + i % 2 * 2, 3.5 - i % 2 * .65);
    pottery(g, 76, 67, 5.2 + form.pace * 1.9, '#a7644e');
    pottery(g, 85, 72, 4.6, '#a7644e');
    if (form.stage >= 1) {
      for (const xx of [15, 25]) {
        pottery(g, xx, 67, 5.9, '#a2694f');
        path(g, [[xx - 5, 63.8], [xx + 4.9, 63.8]], null, '#d1aa78', 1.17);
      }
    }
    flag(g, 80, 74, 30 + form.pace * 6, '#bd8258');
  }
  if (kind === 'loom') {
    path(g, [[17, 70], [17, 48], [36, 48], [36, 70]], null, WOOD, .85);
    for (let i = 0; i < 3; i++) {
      const px = 20 + i * 5;
      path(g, [[px, 49], [px + 4, 49], [px + 4.5, 59 + i + form.pace * 3], [px, 60 + i]], ['#c98782', '#d5a96f', '#79a19a'][i]);
    }
  }
  if (kind === 'teahouse') {
    const canopy = ['#9ca875', '#75916d', '#536f58'];
    path(g, [[64, 71], [64, 57], [85, 57], [85, 71]], null, WOOD, .8);
    roof(g, 64, 57, 20, 5.8, canopy, form.stage, false);
    if (form.stage >= 1) {
      path(g, [[12, 73], [12, 57], [33, 57], [33, 73]], null, WOOD, .8);
      path(g, [[10, 59], [15, 51], [30, 51], [35, 59]], '#95a679', '#667f63');
      path(g, [[16, 53], [15, 58], [19, 58], [20, 53]], '#c9cca0');
    }
    flag(g, 82, 72, 31 + 8 * form.pace, '#8aa582');
    oval(g, 21, 72, 5.6, 2, '#a18863');
    oval(g, 20, 70.7, 3.8, 1.4, '#e3ccb0');
    pottery(g, 22, 70, 1.35, '#cba37a');
  }
  if (kind === 'inn') {
    flag(g, 86, 72, 32 + 8 * form.pace, LACQUER);
    const edge = 49 - w * .43, length = w * .86;
    path(g, [[edge - 1, 54], [edge + length + 1, 54]], null, '#916747', 2.6);
    for (let i = 0; i <= 7; i++) path(g, [[edge + i * length / 7, 49], [edge + i * length / 7, 54]], null, '#ad805a', .75);
    path(g, [[edge, 49], [edge + length, 49]], null, '#ad805a', .85);
    lanternglow(g, edge + length + 2, 57);
  }
  if (kind === 'clinic') {
    path(g, [[24, 75], [24, 46], [11, 46]], null, WOOD, .9);
    oval(g, 15.5, 52, 2.5, 3.5, '#c8a157');
    oval(g, 15, 57, 4.2, 4.5, '#c5a35f');
    path(g, [[13, 48.5], [18.2, 48.5]], null, '#86694f', .7);
    for (let i = 0; i < 3; i++) {
      oval(g, 25 + i * 6.8, 74, 3.2, 1.25, '#c3a376');
      oval(g, 25 + i * 6.8, 73.4, 2.7, .65, season.leaves);
    }
    pottery(g, 78, 74, 2.9, '#9baf88');
  }
  if (kind === 'school') {
    path(g, [[38, 71], [51, 71], [57, 76], [39, 76]], '#a2805f', '#896849');
    path(g, [[43, 71], [49, 70], [52, 73], [46, 74]], '#f5e4bc');
    path(g, [[46, 71], [48.2, 73]], null, '#856c55', .52);
  }
  if (kind === 'temple') {
    pottery(g, 50, 73.7, 4.1, '#969074');
    for (const xx of [37, 63]) {
      path(g, [[xx - 1.7, 74], [xx + 1.7, 74], [xx + 1, 64], [xx - 1, 64]], '#b0a487');
      roof(g, xx - 2.1, 64, 4.2, 2.2, ROOFS.slate, form.stage, false);
    }
    path(g, [[50, 69], [49, 65], [50, 63]], null, '#7a878080', .78);
    flag(g, 77, 74, 28 + form.pace * 7, '#c19c59');
  }
}

function crops(g, kind, form, season) {
  const span = 62 + form.pace * 20, extent = 31 + form.pace * 16;
  const front = 72, upper = front - extent, left = (W - span) / 2 - 4, right = left + span;
  const rows = 3 + Math.floor(form.stage / 2), soil = kind === 'paddy' ? season.water : '#cdb783';
  terrace(g, 50, 73, span, form, '#d1b782');
  path(g, [[left, front - 3], [right, front - 3], [right + 10, upper], [left + 12, upper]], soil, '#8e997889', .9);
  for (let row = 0; row < rows; row++) {
    const t = row / rows, y = upper + (t + .56 / rows) * (extent - 3), offset = (1 - t) * 10;
    const green = kind === 'teaGarden' ? '#71967b' : kind === 'paddy' && season === SEASONS[2] ? '#c39f59' : season.leaves;
    const x = left + 3 + offset;
    path(g, [[x, y - 2.5], [right - 3 + offset, y - 2.5]], null, kind === 'paddy' ? '#f4edc9b0' : '#9a8b66', kind === 'paddy' ? .64 : .85);
    const plants = kind === 'mulberry' ? 5 : 10;
    for (let i = 0; i < plants; i++) {
      const px = x + 3 + (span - 15) * (i + .22 * rhythm(i, row)) / (plants - 1.0);
      if (kind === 'mulberry') foliage(g, px, y + 1.3, 2.9, season);
      else if (kind === 'teaGarden') {
        oval(g, px, y, 2.55, 1.85, green, -.12);
        oval(g, px - 1, y - .45, 1.25, .62, season.light);
      } else path(g, [[px - 1.25, y - 2.8], [px, y + .1], [px + .75, y - 3.3]], null, green, .82);
    }
  }
  const bank = upper + 1;
  path(g, [[left + 12, bank], [right + 10, bank], [right, front - 3]], null, '#ead4a0', 1.58);
  if (form.stage >= 1) hall(g, { cx: left + 12, base: bank + 7, w: 15 + form.pace * 5, h: 9, roofKind: 'warm' }, form, season);
  if (form.stage >= 2) {
    path(g, [[right + 7, bank + 3], [right - 3, front - 3]], null, '#72a9a9', 2);
    pottery(g, right - 8, front - 1, 2.2, '#b88c62');
  }
  if (form.stage >= 3) {
    const midst = left + span * .57;
    path(g, [[midst + 11, upper], [midst, front - 3]], null, '#f1d7a0', 2.1);
    path(g, [[midst + 10, upper + 1], [midst - 1, front - 3]], null, '#a99169', .45);
    hall(g, { cx: right - 3, base: bank + 5, w: 13 + form.pace * 5, h: 7, roofKind: 'olive' }, form, season);
  }
}

function stall(g, x, base, w, awning, goods) {
  shade(g, x + w * .5, base + 1, w * .69, 3);
  path(g, [[x + 2, base], [x + 2, base - 19], [x + w - 2, base - 19], [x + w - 2, base]], null, WOOD, 1.15);
  path(g, [[x - 1, base - 14], [x + 4, base - 24], [x + w - 6, base - 24], [x + w + 1, base - 14]], awning, '#825f4e82');
  for (let i = 1; i < 5; i++) {
    const ratio = i / 5;
    path(g, [[x + 3 + (w - 8) * ratio, base - 23.6], [x + w * ratio, base - 14.1]], null, '#f8e7be98', 1.35);
  }
  path(g, [[x + 1, base - 7], [x + w - 1, base - 7], [x + w - 1, base - 3], [x + 1, base - 3]], '#ad8864');
  for (let i = 0; i < 4; i++) oval(g, x + 4 + i * (w - 8) / 3, base - 8 + i % 2 * .4, 1.47, 1.16, goods[i % 2]);
}
function market(g, form, season) {
  const span = 58 + form.pace * 23;
  terrace(g, 50, 75, span, form);
  if (form.stage >= 2) hall(g, { cx: 51, base: 52, w: 35 + form.pace * 14, h: 15, roofKind: 'warm', lanterns: true }, form, season);
  const awnings = ['#c88474', '#c6a675', '#85a19a'];
  const count = form.stage >= 1 ? 3 : 2, w = span / count - 2.5;
  for (let i = 0; i < count; i++) stall(g, 50 - span / 2 + i * (w + 4), 68 + (i % 2) * 3, w, awnings[i], ['#c2a567', '#839878']);
  if (form.stage >= 3) {
    path(g, [[22, 72], [45, 72], [61, 74], [79, 74]], null, '#be9273', 2.7);
    for (const x of [19, 82]) {
      path(g, [[x, 72], [x, 44]], null, WOOD, .85);
      lanternglow(g, x - 1, 49, '#c48067');
    }
  }
  flag(g, 87, 72, 30 + 6 * form.pace, '#9cab8a');
}

function kiln(g, form, season) {
  const span = 64 + form.pace * 24;
  terrace(g, 51, 73, span, form, '#c5af86');
  hall(g, { cx: 28, base: 69, w: 25 + form.pace * 8, h: 16, roofKind: 'warm' }, form, season);
  if (form.stage >= 2) {
    oval(g, 48, 62, 9, 9.8, tone(g, 42, 49, 48, 69, '#dcb68e', '#a97956', '#987154'));
    oval(g, 47, 66, 3.1, 3.2, '#716052');
  }
  const mouth = 61 - form.pace;
  const dome = tone(g, mouth - 15, 38, mouth + 16, 71, '#d6ac81', '#a86f54', '#84624f');
  oval(g, mouth + 1, 58, 18 + form.pace * 5, 13 + form.pace * 4, dome);
  g.fillStyle = '#6d6660';
  const stack = 38 - form.pace * 10 - (form.stage >= 3 ? 6 : 0);
  g.fillRect(mouth + 8, stack, 7.2, 57 - stack);
  oval(g, mouth + 11.8, stack, 4.7, 1.6, '#544f46');
  oval(g, mouth + 11.8, stack - 9, 6.7, 4.2, '#8e8c7d52');
  oval(g, mouth + 14, stack - 13, 8.3, 4.3, '#a19a8346');
  oval(g, mouth - 1, 63, 5.8 + form.pace, 5.9, '#61544d');
  oval(g, mouth - 1, 66, 3.2, 1.72, '#d58b62');
  if (form.stage >= 1) {
    path(g, [[13, 72], [13, 56], [34, 56], [34, 72]], null, WOOD, .82);
    roof(g, 12, 56, 21, 5, ROOFS.olive, form.stage, season === SEASONS[3]);
    path(g, [[14, 69], [36, 69], [36, 73], [14, 73]], '#9e8f72', '#877451');
    for (const x of [17, 22, 27, 32]) pottery(g, x, 69, 2.35, '#b4c0a9');
  }
  for (let i = 0; i < 3 + Math.min(3, form.stage); i++) pottery(g, 43 + i * 7, 75, 2.4, i % 2 ? '#8eafa9' : '#dfd6bc');
}

function dock(g, form, season) {
  const span = 59 + form.pace * 24;
  oval(g, 51, 70, 43, 13, season.water);
  path(g, [[12, 76], [90, 76]], null, '#dfdec19a');
  path(g, [[15, 67], [86, 67]], null, '#dfdec19a');
  terrace(g, 49, 60, span, form, '#b99467');
  for (let i = 0; i < 6; i++) {
    const x = 17 + i * span / 6;
    path(g, [[x, 59], [x + .6, 68]], null, WOOD, .9);
  }
  hall(g, { cx: 31, base: 56, w: 26 + form.pace * 12, h: 14, roofKind: 'blue' }, form, season);
  if (form.stage >= 1) {
    path(g, [[13, 70], [39, 68], [35, 74], [19, 75]], '#a08259', '#876f4d');
    path(g, [[20, 71], [33, 70]], null, '#d1b38b', 1.31);
  }
  if (form.stage >= 2) {
    for (const x of [51, 57, 62]) pottery(g, x, 56 + (x % 3), 3.1);
    path(g, [[50, 62], [50, 46], [68, 46], [68, 62]], null, '#8c7b5a', 1.1);
    path(g, [[48, 46], [52, 40], [65, 40], [70, 46]], '#b88c66', '#8c7b5a', .71);
    path(g, [[53, 41], [52, 45], [56, 44], [57, 41]], '#f0d5a2');
    path(g, [[61, 41], [61, 45], [65, 46], [64, 41]], '#f0d5a2');
  }
  if (form.stage >= 3) {
    hall(g, { cx: 71, base: 53, w: 20 + form.pace * 5, h: 10, roofKind: 'blue', door: false }, form, season);
  }
  const hull = 64 + form.pace * 3;
  path(g, [[hull - 14, 71], [hull + 15, 69], [hull + 12, 75], [hull - 9, 77]], '#987753', '#7c6244');
  path(g, [[hull, 72], [hull, 49 - form.pace * 4]], null, WOOD, .7);
  path(g, [[hull + 1, 50 - form.pace * 4], [hull + 11 + form.pace * 4, 67], [hull + 1, 69]], '#ead6ab', '#a99b76');
}

function theatre(g, form, season) {
  const w = 49 + form.pace * 25;
  terrace(g, 51, 74, w + 6, form);
  if (form.stage >= 2) hall(g, { cx: 48, base: 43, w: w * .6, h: 14, roofKind: 'red', lanterns: true }, form, season);
  const x = 50 - w / 2, top = 44;
  path(g, [[x, top - 4], [x + w, top - 4], [x + w, 66], [x, 66]], '#8f6759', '#785e51');
  path(g, [[x + 3, top + 2], [x + w - 3, top + 2], [x + w - 6, 62], [x + 6, 62]], '#b67565');
  for (const side of [-1, 1]) {
    const outer = 50 + side * (w / 2 - 2);
    path(g, [[outer, top], [outer - side * (w * .25), top], [outer - side * 12, 55], [outer - side * 9, 65], [outer, 65]], '#d69a84', '#a66c5c');
    lanternglow(g, outer, top + 5, '#b2845d');
  }
  const cloth = Math.round(12 * form.pace) + 6;
  path(g, [[49 - cloth / 2, 58], [49 + cloth / 2, 58], [50 + cloth / 2, 66], [48 - cloth / 2, 66]], '#e0c28f', '#ac925d80');
  roof(g, x - 2, top - 1, w + 4, 11 + 3 * form.pace, ROOFS.red, form.stage, season === SEASONS[3]);
  if (form.stage >= 1) {
    path(g, [[x + 1, 66], [x + w - 1, 66], [x + w + 3, 73], [x - 2, 73]], '#b79272', '#877058');
    path(g, [[x - 1, 70], [x + w + 1, 70]], null, '#debf95', .95);
  }
  if (form.stage >= 3) {
    for (const xx of [x + 8, x + w - 8]) {
      path(g, [[xx - 5, 69], [xx - 5, 53], [xx + 5, 53], [xx + 5, 69]], null, '#755b55', .85);
      oval(g, xx, 60, 5.1, 5, '#d3ac6e');
      oval(g, xx, 60, 3.7, 3.7, '#e6c190');
    }
    for (const side of [-1, 1]) {
      const wing = 50 + side * (w * .53 + 3);
      flag(g, wing, 72, 26, '#ae775e');
    }
  }
}
function garden(g, form, season) {
  const rx = 22 + 10 * form.pace, ry = 11 + form.pace * 5;
  terrace(g, 53, 76, 63 + form.pace * 15, form, '#cbc599');
  oval(g, 47, 60, rx + 3, ry + 2, '#a8a17f');
  oval(g, 47, 59, rx, ry, tone(g, 45, 46, 62, 69, '#c2d5ba', season.water, '#6fa098'));
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.52;
    oval(g, 46 + Math.cos(angle) * rx * (.36 + i % 3 * .18), 59 + Math.sin(angle) * ry * .74, 2.2 + i % 2 * .7, 1.2, i % 3 ? '#809e7d' : '#e1afac', angle);
  }
  path(g, [[34, 65], [42, 55], [50, 54], [61, 63]], null, '#e2c596', 3.6);
  path(g, [[34, 63], [42, 53], [50, 52], [61, 61]], null, '#a48967', .78);
  foliage(g, 22, 51, 10 + form.pace * 2, season, true);
  if (form.stage >= 1) hall(g, { cx: 68, base: 43, w: 21 + form.pace * 15, h: 13, roofKind: 'olive', door: false }, form, season);
  if (form.stage >= 2) {
    path(g, [[18, 69], [12, 67], [15, 53], [25, 46], [31, 50], [34, 56], [30, 66], [25, 65], [25, 55], [20, 59]], '#a5a587', '#86917a');
    path(g, [[14, 65], [18, 53], [25, 48], [24, 54]], null, '#cbc3a3', .85);
  }
  if (form.stage >= 3) {
    path(g, [[14, 71], [26, 75], [46, 78], [64, 76], [76, 71]], null, '#e5d9ad', 3.4);
    foliage(g, 84, 51, 9.5, season, true);
    for (const x of [31, 63]) pottery(g, x, 72, 2.65, '#c09878');
  }
  foliage(g, 81, 65, 8 + form.pace * 2, season, true);
}

function pagoda(g, form, season) {
  const w = 30 + form.pace * 17;
  terrace(g, 50, 75, w + 16, form);
  const tiers = 3 + Math.min(form.stage, 3) + Math.floor(Math.max(0, form.stage - 3) / 2);
  const separation = (40 + 12 * form.pace) / tiers;
  for (let i = 0; i < tiers; i++) {
    const width = Math.max(14, w - i * (w / (tiers + 3)));
    const base = 69 - i * separation - form.pace * 1.5;
    hall(g, { cx: 49.5, base, w: width, h: Math.max(5.6, separation * .59), roofKind: i % 2 === 0 ? 'blue' : 'slate', post: '#a47655', upper: i > 0 }, form, season);
  }
  const final = 69 - (tiers - 1) * separation - form.pace * 1.5;
  path(g, [[49.5, final - 8], [49.5, final - 17]], null, GOLD, .9);
  oval(g, 49.5, final - 15, 1.2, 2.2, '#c9a869');
  foliage(g, 22, 69, 5, season);
}

function granary(g, form, season) {
  const span = 58 + form.pace * 26;
  terrace(g, 50, 73, span, form);
  if (form.stage >= 3) hall(g, { cx: 66, base: 54, w: 30, h: 17, roofKind: 'olive', upper: true }, form, season);
  if (form.stage >= 1) {
    oval(g, 22, 66, 9.4, 4.2, '#b69968');
    g.fillStyle = tone(g, 14, 57, 30, 67, '#d6ba86', '#a5865c');
    g.fillRect(13, 54, 18, 12);
    roof(g, 13, 54, 18, 7.5, ROOFS.warm, form.stage, season === SEASONS[3]);
  }
  const x = 49, radius = 16 + form.pace * 8, height = 21 + form.pace * 5;
  g.fillStyle = tone(g, x - radius, 72, x + radius, 63, '#be9a6a', '#e1c697', '#b4966c');
  g.fillRect(x - radius, 69 - height, radius * 2, height);
  oval(g, x, 69, radius, 3.4, '#c2a278');
  oval(g, x, 69 - height, radius, 4.8, '#e4ca96');
  for (let i = 0; i <= 10; i++) {
    const dx = (i - 5) * radius * .18;
    path(g, [[x + dx, 69 - height], [x + dx, 70.5]], null, '#97784e81', i % 3 ? .52 : .75);
  }
  path(g, [[x - radius + 1, 60], [x + radius - 1, 60]], null, '#a58555', 1.2);
  roof(g, x - radius, 69 - height - 3, radius * 2, 13 + form.pace * 3, ROOFS.warm, form.stage, season === SEASONS[3]);
  for (let i = 0; i < 5; i++) oval(g, 34 + i * 6.6, 75 - i % 2 * 1.4, 2.4, 1.63, '#e0c387', -.18);
  if (form.stage >= 2) {
    path(g, [[72, 74], [73, 56], [85, 56], [87, 72]], null, WOOD, .79);
    roof(g, 73, 56, 13, 5.8, ROOFS.olive, form.stage, season === SEASONS[3]);
    oval(g, 82, 72, 3.8, 2.02, '#c0a16d');
  }
}

const SPECIAL = { market, dock, kiln, theatre, garden, pagoda, granary };
const CROPS = new Set(['paddy', 'mulberry', 'teaGarden']);

function tent(g, x, foot, width, height) {
  const ridge = foot - height;
  shade(g, x + width * .4, foot, width * .65, 3.2);
  path(g, [[x + width * .25, ridge], [x + width * .7, ridge - 4], [x + width, foot - 2], [x + width * .62, foot]],
    tone(g, x, ridge, x + width, foot, '#e1cda5', '#967d57'), '#978264', .66);
  path(g, [[x, foot], [x + width * .25, ridge], [x + width * .62, foot]],
    tone(g, x, ridge, x + width * .56, foot, '#e7d6b2', '#bda57e'), '#968362', .65);
  path(g, [[x + width * .19, foot - .1], [x + width * .29, ridge + height * .38], [x + width * .41, foot - .1]], '#7c6e54');
  path(g, [[x + width * .7, ridge - 4], [x + width * .73, foot - .7]], null, '#e9d6ac', .65);
}

function yamen(g, form, season) {
  const width = 53 + form.pace * 7;
  const axial = 52;
  const post = '#8f5c4c';
  shade(g, axial, 76, 50, 10);
  path(g, [[2, 81], [96, 81], [102, 29], [11, 29]], '#c9b790', '#968a71', .66);
  path(g, [[6, 78], [94, 78], [98, 31], [12, 31]], tone(g, 22, 32, 82, 79, '#e9d8b0', '#d6c498'), '#b7aa87', .65);
  const sideWall = '#c9bf9d', coping = '#7e8f83';
  path(g, [[6, 76], [13, 29], [100, 29]], null, sideWall, 4.5);
  path(g, [[6, 73.5], [13, 27], [100, 27]], null, coping, 1.3);
  path(g, [[94, 79], [100, 29]], null, sideWall, 4.1);
  path(g, [[94, 76.5], [100, 26.7]], null, coping, 1.25);
  path(g, [[40, 75], [65, 75], [61, 39], [44, 39]], '#ece1bd', '#c3b58f', .52);
  for (let i = 0; i < 6; i++) {
    path(g, [[41 + i * .52, 71 - i * 5], [64 - i * .53, 71 - i * 5]], null, '#b4a688', .42);
  }
  for (const xx of [29, 78]) {
    foliage(g, xx, 63, 5.5 + form.pace * 2.3, season);
    path(g, [[xx - 5, 67], [xx + 4, 67], [xx + 6, 63], [xx - 3, 63]], '#a9a081', '#a79c7e', .45);
  }
  const side = 16.5 + form.pace * 5;
  hall(g, { cx: 19, base: 60, w: side, h: 12 + form.pace * 2, roofKind: 'slate', post }, form, season);
  hall(g, { cx: 83, base: 59, w: side, h: 12 + form.pace * 2, roofKind: 'slate', post }, form, season);
  if (form.level >= 5) hall(g, { cx: 19, base: 43, w: side + 3, h: 11, roofKind: 'slate', post, upper: true }, form, season);
  if (form.level >= 10) hall(g, { cx: 84, base: 43, w: side + 3, h: 12, roofKind: 'slate', post, upper: true }, form, season);
  if (form.level >= 18) {
    hall(g, { cx: axial, base: 25, w: width * .63, h: 8.7, roofKind: 'blue', post, pitch: 1.24, upper: true }, form, season);
  }
  hall(g, { cx: axial, base: 43, w: width, h: 20, roofKind: 'blue', post, pitch: 1.1, steps: 2 }, form, season);
  if (form.level >= 25) {
    for (const x of [34, 70]) {
      path(g, [[x - 2.8, 56], [x + 2.8, 56], [x + 2.4, 51], [x - 2.4, 51]], '#ada587', '#968c73');
      oval(g, x, 49.6, 2.5, 1.9, '#9b947b');
    }
  }
  for (const [from, to] of [[6, 37], [67, 94]]) {
    path(g, [[from, 78], [to, 78], [to, 70], [from, 70]], '#e4d5b4', '#aa9d7e', .5);
    path(g, [[from, 69], [to, 69]], null, coping, 1.66);
    for (let x = from + 5; x < to; x += 7) path(g, [[x, 70.4], [x, 78]], null, '#9e8b6a65', .55);
  }
  if (form.level >= 50) {
    roof(g, 11, 69, 13, 5, ROOFS.slate, form.stage, season === SEASONS[3]);
    roof(g, 79, 69, 12, 5, ROOFS.slate, form.stage, season === SEASONS[3]);
  }
  if (form.level >= 75) {
    for (const x of [29, 75]) {
      path(g, [[x - 1.6, 81], [x + 1.6, 81], [x + 1.1, 71], [x - 1.1, 71]], '#b2aa92', '#979076', .42);
      oval(g, x, 70.5, 1.9, 1.2, '#cec3a2');
    }
  }
  hall(g, { cx: axial, base: 80, w: 30 + form.pace * 3.4, h: 12, roofKind: 'blue', post, pitch: .96 }, form, season);
  path(g, [[44, 69.6], [60, 69.6], [60, 73.6], [44, 73.6]], '#435254', '#a48a50', .49);
  g.save();
  g.font = '600 3.3px "Noto Serif CJK SC", SimSun, serif';
  g.fillStyle = '#e3c78a';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(YAMEN_SIGN, axial, 71.7, 14.4);
  g.restore();
  oval(g, 35, 81.5, 2.4, 1.2, '#9c8d70');
  oval(g, 68.8, 81.5, 2.4, 1.2, '#9c8d70');
}

function gatehouse(g, form, season) {
  const w = 66 + form.pace * 10, x = 50 - w / 2, y = 74;
  plinth(g, x, y, w, 9.2, 0, '#b6b096');
  path(g, [[x + 3, y - 3], [x + 3, y - 23], [x + w - 3, y - 23], [x + w - 3, y - 3]], '#bcb598', '#948c73');
  for (let i = 0; i < 3; i++) {
    const row = y - 8 - i * 4.5;
    path(g, [[x + 3, row], [x + w - 3, row]], null, '#a79d81', .58);
    for (let j = 1; j <= 5; j++) {
      const joint = x + (j + (i % 2) * .29) * w / 6;
      path(g, [[joint, row], [joint, row - 4.5]], null, '#a79d81', .48);
    }
  }
  g.beginPath();
  g.moveTo(38, y - 3);
  g.lineTo(38, y - 12);
  g.bezierCurveTo(38, y - 23, 62, y - 23, 62, y - 12);
  g.lineTo(62, y - 3);
  g.fillStyle = '#676853';
  g.fill();
  g.strokeStyle = '#d0bf98';
  g.lineWidth = 1.45;
  g.stroke();
  if (form.stage >= 2) {
    hall(g, { cx: 49.5, base: 32, w: w * .46, h: 10, roofKind: 'blue', pitch: 1.18, upper: true }, form, season);
  }
  hall(g, { cx: 50, base: y - 23, w: w * .83, h: 14 + form.pace * 6, roofKind: 'blue', pitch: 1.21, post: '#7d7361', lanterns: true }, form, season);
  for (const xx of [19, 82]) {
    flag(g, xx, y - 3, 21 + form.pace * 11, '#8ba39a');
  }
}

function camp(g, form, season) {
  const size = 55 + form.pace * 17;
  terrace(g, 49, 74, size, form, '#c7b687');
  for (let i = 0; i < 8; i++) {
    const x = 17 + i * (62 + form.pace * 6) / 8;
    path(g, [[x, 55], [x + .8, 43], [x + 1.7, 55]], '#a18b64', '#98835c', .6);
  }
  path(g, [[16, 50], [79, 50]], null, '#987c59', 1.2);
  const tents = form.stage >= 4 ? 3 : 2;
  for (let i = tents - 1; i >= 0; i--) {
    tent(g, 17 + i * 19, 70 - i * 11, 24 + form.pace * 7, 14 + form.pace * 5);
  }
  if (form.stage >= 1) {
    hall(g, { cx: 66, base: 73, w: 25 + form.pace * 8, h: 16 + form.pace * 3, roofKind: 'olive', pitch: 1.11 }, form, season);
  }
  for (const x of [11, 83]) flag(g, x, 68, 31 + form.pace * 11, '#bd785d');
  for (let i = 0; i < 3; i++) {
    const x = 36 + i * 5;
    path(g, [[x, 74], [x + 2, 67]], null, '#8e795a', .8);
    oval(g, x + 1, 69, 1.8, 2.4, i % 2 ? '#ad9065' : '#9b8061');
  }
}

function scenery(g, kind, form, season) {
  const span = 59 + form.pace * 24;
  terrace(g, 50, 73, span, form, '#c7b390');
  if (kind === 'forest') {
    for (let i = 0; i < 6 + Math.floor(form.stage / 2); i++) foliage(g, 21 + i % 5 * 12, 52 + Math.floor(i / 5) * 10 - rhythm(i, 8) * 8, 7 + form.pace * 3, season);
    for (let i = 0; i < 4; i++) path(g, [[30 + i * 6, 70 - i % 2 * 4], [34 + i * 6, 66 - i % 2 * 4]], null, '#997855', 2.1);
  } else if (kind === 'clay') {
    oval(g, 45, 58, 28 + form.pace * 8, 10 + form.pace * 2, '#a68061');
    oval(g, 43.5, 58, 22 + form.pace * 6, 7, '#bd936b');
    oval(g, 42.5, 58, 15 + form.pace * 6, 4.2, '#ab7d5d');
    pottery(g, 35, 69, 3.2);
  } else {
    const iron = kind === 'iron', rock = iron ? '#999c95' : '#bab8a5';
    const ridges = 3 + Math.floor(form.stage / 3);
    for (let i = 0; i < ridges; i++) {
      const x = 16 + i * (54 / ridges);
      const y = 41 + rhythm(i, 3) * 12 - form.pace * 8;
      path(g, [[x, 64], [x + 8, y], [x + 13, y - 2], [x + 21, 63]], rock, '#8b877479');
      path(g, [[x + 10, y], [x + 14, y - 2], [x + 21, 63], [x + 15, 63]], iron ? '#777f7a' : '#a5a38f');
      oval(g, x + 5, 65, 2.3, 1.15, iron ? '#a2765a' : '#ded3ae');
    }
    path(g, [[21, 73], [30, 63]], null, '#a2835d', .78);
    path(g, [[25, 73], [34, 63]], null, '#a2835d', .78);
  }
  hall(g, { cx: 76, base: 68, w: 19 + form.pace * 10, h: 13 + form.pace * 5, roofKind: 'olive' }, form, season);
  if (form.stage >= 3) flag(g, 84, 72, 25 + form.pace * 6, '#9b9b6e');
}

const LANDMARKS = { yamen, gate: gatehouse, camp };

function sprite(kind, level, seasonNumber) {
  const key = `${kind}/${level}/${seasonNumber}`;
  const available = sheets.get(key);
  if (available) {
    sheets.delete(key);
    sheets.set(key, available);
    return available;
  }
  const layer = typeof OffscreenCanvas === 'function'
    ? new OffscreenCanvas(W * DETAIL_SCALE, H * DETAIL_SCALE)
    : Object.assign(document.createElement('canvas'), { width: W * DETAIL_SCALE, height: H * DETAIL_SCALE });
  const g = layer.getContext('2d');
  g.scale(DETAIL_SCALE, DETAIL_SCALE);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const season = SEASONS[seasonNumber] ?? SEASONS[0], form = growth(level);
  if (HALLS[kind]) drawHall(g, kind, form, season);
  else if (CROPS.has(kind)) crops(g, kind, form, season);
  else if (SPECIAL[kind]) SPECIAL[kind](g, form, season);
  else if (LANDMARKS[kind]) LANDMARKS[kind](g, form, season);
  else scenery(g, kind, form, season);
  if (sheets.size === MAX_SPRITES) sheets.delete(sheets.keys().next().value);
  sheets.set(key, layer);
  return layer;
}
function badge(g, rect, level) {
  const wide = level >= 10 ? 18 : 12;
  g.fillStyle = '#f8efcfed';
  g.beginPath();
  g.roundRect(rect.x + 2, rect.y + 1, wide, 11, 4);
  g.fill();
  g.fillStyle = INK;
  g.font = '600 8.5px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(level), rect.x + 2 + wide / 2, rect.y + 6.8);
}
function paint(g, kind, architectureLevel, rect, season, displayLevel) {
  const layer = sprite(kind, architectureLevel, season);
  const aspect = kind === 'yamen' ? 2.95 : kind === 'camp' ? 2.1 : 1.53;
  const w = Math.min(rect.w, rect.h * aspect);
  const h = Math.min(rect.h + (kind === 'yamen' || kind === 'camp' ? 2 : 5), w * .9);
  g.save();
  g.drawImage(layer, rect.x + (rect.w - w) * .5, rect.y + rect.h - h + 1, w, h);
  if (displayLevel > 0) badge(g, rect, displayLevel);
  g.restore();
}

export function paintBuilding(g, kind, level, rect, season) {
  paint(g, kind, Math.max(1, level), rect, season, level);
}
export function paintFacility(g, kind, level, rect, season) {
  const displayLevel = ['yamen', 'gate', 'camp'].includes(kind) ? 0 : level;
  const architectureLevel = kind === 'yamen' ? [1, 5, 10, 18, 25, 50, 75][level] ?? level : level + 1;
  paint(g, kind, architectureLevel, rect, season, displayLevel);
}
export function paintWallDetail(g, rect, level, season, { side = 0 } = {}) {
  if (level <= 0) return;
  const { x, y, w, h } = rect;
  const form = growth(level);
  const horizontal = side === 0 || side === 2 || side === 'north' || side === 'south';
  g.save();
  g.globalAlpha = .79;
  g.translate(horizontal ? x : x + w / 2, horizontal ? y + h * .42 : y);
  if (!horizontal) g.rotate(Math.PI / 2);
  const length = horizontal ? w : h;
  const size = 19 + form.pace * 14;
  path(g, [[3, -1], [length - 3, -1]], null, '#decd9e', 1.2 + form.pace * 1.6);
  path(g, [[3, 2.3 + form.pace * 2], [length - 3, 2.3 + form.pace * 2]], null, '#9e9779', .74);
  const slots = Math.ceil(length / 125);
  for (let i = 0; i < slots; i++) {
    const middle = ((i + .5) / slots) * length;
    if (Math.abs(middle - length / 2) < 76) continue;
    path(g, [[middle - size * .5, -1.2], [middle + size * .5, -1.2], [middle + size * .5, -3.6 - form.pace * 1.8], [middle - size * .5, -3.6 - form.pace * 1.8]],
      level >= 25 ? '#e2c993' : '#c6bc96', '#a39a7a', .42);
    for (let j = 0; j <= form.courses; j++) {
      const xx = middle + (j - 4.5) * size / 14;
      path(g, [[xx, -2.1], [xx, .3]], null, '#767960', .43);
    }
    if (form.stage >= 1 && i % 3 === 0) {
      flag(g, middle - 1, 1.6, 11 + form.pace * 8, season === 3 ? '#879aa3' : '#ac6f5b');
    }
  }
  g.restore();
}
