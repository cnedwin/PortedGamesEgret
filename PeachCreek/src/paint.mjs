// The map is painted at world size. The main view scrolls the painting, hit areas
// and Egret effects together, so a camera move does not rasterize the city again.
import { CORE_WARDS, NODE_SLOTS, PLOT_COLS, PLOTS_PER_DISTRICT, PLOT_ROWS, RIVERSIDE, WARD_POSITIONS, wardRecommendation } from './sim/world.mjs';
import { paintBuilding, paintFacility, paintWallDetail } from './building-art.mjs';

export const STAGE = { width: 1280, height: 720 };
export const MAP = { width: 2960, height: 1620 };
export const CORE_BOUNDS = { x: 560, y: 0, width: 1840, height: 1200 };

const CORE_X = CORE_BOUNDS.x;
const CITY = { left: CORE_X + 145, right: CORE_X + 1695, top: 256, bottom: 1003 };
const CENTER = { x: (CITY.left + CITY.right) / 2, y: (CITY.top + CITY.bottom) / 2 };
const TERRAIN_URL = new URL('../assets/creek-landscape.webp', import.meta.url);
let terrain;

export async function loadTerrain() {
  const image = new Image();
  image.src = TERRAIN_URL.href;
  try {
    await image.decode();
    terrain = image;
  } catch {
    // Drawing by code is also the fallback for unsupported or unavailable art.
  }
}

/** Geometry shared by the map painting, transparent controls, and effects. */
export const LAYOUT = (() => {
  const wards = [], plots = [];
  for (const [col, row] of WARD_POSITIONS) {
    const x = col === -1 ? 52 : col === 3 ? MAP.width - 526 : CORE_X + 193 + col * 490;
    const y = row === 2 ? 1270 : 356 + row * 300;
    wards.push({ x, y, w: 474, h: 45 + PLOT_ROWS * 78, label: { x: x + 12, y: y + 2, w: 160, h: 30 } });
    for (let p = 0; p < PLOTS_PER_DISTRICT; p++) {
      const localCol = p % PLOT_COLS;
      const median = col === 1 && localCol >= PLOT_COLS / 2 ? 13 : 0;
      plots.push({
        x: x + 12 + localCol * 112 + median,
        y: y + 42 + Math.floor(p / PLOT_COLS) * 78,
        w: 102, h: 73
      });
    }
  }
  const nodeRows = [263, 365, 469, 704, 806, 906];
  const nodes = Array.from({ length: NODE_SLOTS }, (_, i) => ({
    x: i % 2 ? CITY.right + 24 : CITY.left - 118,
    y: nodeRows[Math.floor(i / 2)] + (i % 2) * 39,
    w: 94, h: 61
  }));
  const walls = [
    { x: CITY.left, y: CITY.top - 17, w: CITY.right - CITY.left, h: 43 },
    { x: CITY.right - 14, y: CITY.top + 22, w: 34, h: CITY.bottom - CITY.top - 22 },
    { x: CITY.left, y: CITY.bottom - 18, w: CITY.right - CITY.left, h: 48 },
    { x: CITY.left - 20, y: CITY.top + 22, w: 34, h: CITY.bottom - CITY.top - 22 }
  ];
  const gates = [
    { x: CENTER.x - 64, y: CITY.top - 65, w: 128, h: 94 },
    { x: CITY.right - 53, y: CENTER.y - 53, w: 106, h: 106 },
    { x: CENTER.x - 68, y: CITY.bottom - 68, w: 136, h: 101 },
    { x: CITY.left - 53, y: CENTER.y - 53, w: 106, h: 106 }
  ];
  return {
    wards, plots, nodes, walls, gates, towers: gates, wall: walls[0], gate: gates[0],
    camp: { x: CORE_X + 1395, y: 267, w: 185, h: 78 },
    yamen: { x: CORE_X + 783, y: 267, w: 274, h: 81 },
    river: { y: 1060, h: 140 },
    roads: { street: CENTER.x, rows: [343, 641, 945], spines: [CORE_X + 676, CENTER.x, CORE_X + 1165] }
  };
})();

const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
export function hit(x, y) {
  for (const [type, rects] of [
    ['tower', LAYOUT.gates], ['plot', LAYOUT.plots], ['ward', LAYOUT.wards.map(ward => ward.label)],
    ['node', LAYOUT.nodes], ['wall', LAYOUT.walls]
  ]) {
    const key = rects.findIndex((rect) => inside(rect, x, y));
    if (key !== -1) return { type, key };
  }
  if (inside(LAYOUT.yamen, x, y)) return { type: 'yamen' };
  if (inside(LAYOUT.camp, x, y)) return { type: 'camp' };
  return null;
}

// ——— The palette, by season ———
const SEASON = [
  { grass: '#bcdca3', grass2: '#a7cf8f', hill: '#a9cdb3', tree: '#86b98f', bloom: '#f4b8c6', water: '#809c8633' },
  { grass: '#a4d08c', grass2: '#8fc27a', hill: '#94c3a1', tree: '#6faa7e', bloom: '#f6d36b', water: '#408f943d' },
  { grass: '#d8cf93', grass2: '#cdbf7d', hill: '#c9c49a', tree: '#d99a5a', bloom: '#e8794f', water: '#658d8338' },
  { grass: '#e7ecec', grass2: '#d9e2e3', hill: '#dfe6ea', tree: '#9fb7b4', bloom: '#ffffff', water: '#627d974d' }
];
const C = {
  ink: '#4c5a5c',
  zone: { home: '#efe0c4', market: '#f1d9b0', farm: '#cfe3b0', craft: '#d9cfc2', garden: '#d4e8cf' }
};

function round(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function blob(g, x, y, r, color, alpha = 1) {
  const opacity = g.globalAlpha;
  g.globalAlpha = opacity * alpha;
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = opacity;
}
function polygon(g, points, fill, stroke) {
  g.beginPath();
  g.moveTo(...points[0]);
  for (const point of points.slice(1)) g.lineTo(...point);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.stroke();
  }
}
function gradient(g, x0, y0, x1, y1, a, b) {
  const paint = g.createLinearGradient(x0, y0, x1, y1);
  paint.addColorStop(0, a);
  paint.addColorStop(1, b);
  return paint;
}

/** A thin pigment wash with uneven edges. */
function wash(g, x, y, w, h, color, seed = 1) {
  let a = seed * 9301 + 49297;
  const rnd = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 14; i++) {
    const px = x + rnd() * w, py = y + rnd() * h, r = Math.min(w, h) * (0.1 + rnd() * 0.29);
    const paint = g.createRadialGradient(px, py, 0, px, py, r);
    paint.addColorStop(0, color);
    paint.addColorStop(1, 'transparent');
    blob(g, px, py, r, paint, 0.15);
  }
}

function tree(g, x, y, r, color, bloom = null) {
  g.fillStyle = 'rgba(84,97,70,.18)';
  g.beginPath();
  g.ellipse(x + r * .58, y + r * .96, r * 1.04, r * .34, -.24, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#82694f';
  g.lineWidth = Math.max(1, r * .1);
  g.beginPath();
  g.moveTo(x, y + r * .95);
  g.quadraticCurveTo(x - r * .14, y + r * .34, x + r * .05, y - r * .68);
  g.moveTo(x, y + r * .53);
  g.lineTo(x - r * .58, y - r * .26);
  g.moveTo(x, y + r * .30);
  g.lineTo(x + r * .45, y - r * .40);
  g.stroke();
  for (let i = 0; i < 14; i++) {
    const angle = i * 2.4, distance = r * (i % 7) / 8;
    const px = x + Math.cos(angle) * distance, py = y + Math.sin(angle) * distance * .68;
    blob(g, px, py, r * (.31 + (i % 4) * .095), i % 4 === 0 ? '#617d68' : color, .57);
  }
  if (bloom) {
    for (let i = 0; i < 15; i++) {
      const a = i * 2.67, rr = r * (.35 + (i % 6) * .12);
      blob(g, x + Math.cos(a) * rr, y + Math.sin(a) * rr * .72, Math.max(1.1, r * (i % 3 + 2) * .039), bloom, .78);
    }
  }
}

function oval(g, x, y, rx, ry, color, tilt = 0) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, tilt, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
}

function meadowTree(g, x, y, r, season, accent = false) {
  if (season === 3) {
    oval(g, x + r * .32, y + r * .84, r * 1.12, r * .30, '#f6faf7d9', -.13);
    if (accent) {
      const foot = y + r * .79;
      strokePath(g, [[x - r * .3, foot], [x, y + r * .18], [x - r * .09, y - r * .76]], '#777873', r * .13);
      for (const [dx, dy] of [[-.55, -.26], [.45, -.45], [-.34, -.72], [.38, -.85]]) {
        strokePath(g, [[x, y + r * Math.abs(dx) * .18], [x + r * dx * .57, y + r * dy * .68], [x + r * dx, y + r * dy]], '#8b8980', r * .066);
        strokePath(g, [[x + r * dx * .61, y + r * dy * .70], [x + r * dx * .93, y + r * dy * .89]], '#e6eee9', r * .059);
      }
      return;
    }
    tree(g, x, y, r, '#859d93');
    for (let i = 0; i < 5; i++) {
      const dx = (i - 2) * r * .30;
      oval(g, x + dx, y - r * (.34 + (i % 3) * .13), r * (.25 + i % 2 * .11), r * .16, '#f4f7eee3', .13);
    }
    return;
  }
  if (season === 2) {
    const amber = accent || Math.floor(x) % 3 === 0;
    tree(g, x, y, r, amber ? '#b76f4d' : '#c59349', amber ? '#d29a57' : '#e7b75e');
    for (let i = 0; i < 8; i++) {
      oval(g, x + r * (i * .28 - .82), y + r * (.73 + i % 3 * .13), r * .079, r * .036, i % 2 ? '#ba784db3' : '#daa44da6', i);
    }
    return;
  }
  const { tree: canopy, bloom } = SEASON[season];
  tree(g, x, y, r, season === 0 && accent ? '#cc949d' : canopy, accent ? bloom : null);
}

function willow(g, x, y, r, season) {
  const wash = season === 2 ? '#ad9756' : season === 3 ? '#8b9484' : '#6d9876';
  const twig = season === 2 ? '#a28b5a' : season === 3 ? '#85867e' : '#698e6e';
  const highlight = season === 2 ? '#d6b571' : season === 3 ? '#dfeae5' : '#adc28a';
  oval(g, x + r * .32, y + r * .69, r * 1.03, r * .24, season === 3 ? '#889e9b22' : '#626f5b38');
  g.beginPath();
  g.moveTo(x - r * .17, y + r * .77);
  g.quadraticCurveTo(x + r * .18, y + r * .43, x - r * .19, y - r * .57);
  g.strokeStyle = '#7e7764';
  g.lineWidth = r * .16;
  g.stroke();
  for (let i = 0; i < 8; i++) {
    const dx = (i - 3.5) * r * .27;
    const anchor = y - r * (.43 + (i % 4) * .1);
    const tip = y + r * (.29 + (i * 5 % 7) * .09);
    if (season !== 3) oval(g, x + dx, anchor + r * .20, r * .27, r * (.29 + i % 2 * .14), wash + '71', i < 4 ? .22 : -.19);
    g.beginPath();
    g.moveTo(x - r * .16, y - r * .25);
    g.quadraticCurveTo(x + dx * 1.19, anchor - r * .39, x + dx, tip);
    g.strokeStyle = twig;
    g.lineWidth = r * .047;
    g.stroke();
    if (season !== 3) {
      const leaf = r * (.06 + (i % 3) * .013);
      for (let j = 0; j < 4; j++) {
        oval(g, x + dx * (.98 + j * .085), tip - r * (j * .14 + .14), leaf, leaf * 2.6, i % 2 ? highlight + 'b2' : wash + 'be', -.33 + j * .12);
      }
    } else if (i % 3 === 0) {
      oval(g, x + dx * .52, anchor + r * .04, r * .25, r * .075, highlight + 'e8', i * .12 - .4);
    }
  }
}

function drawNode(g, kind, level, found, r, season) {
  if (found) {
    paintFacility(g, kind, level, r, season);
    return;
  }
  const cx = r.x + r.w / 2, y = r.y + r.h - 28;
  blob(g, cx - 14, y, 18, '#e9eef0', .55);
  blob(g, cx + 10, y + 4, 20, '#e9eef0', .55);
  g.fillStyle = C.ink;
  g.font = '600 18px serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('?', cx, y);
}

const FIELDS = new Set(['paddy', 'mulberry', 'teaGarden']);

function strokePath(g, points, color, width) {
  g.beginPath();
  g.moveTo(...points[0]);
  for (const point of points.slice(1)) g.lineTo(...point);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.stroke();
}

function road(g, points, width) {
  g.lineJoin = 'round';
  g.lineCap = 'round';
  strokePath(g, points, 'rgba(136,113,70,.23)', width + 5);
  strokePath(g, points, 'rgba(234,217,177,.84)', width);
  strokePath(g, points, 'rgba(255,248,220,.27)', width * .52);
  g.lineCap = 'butt';
}

function outlyingRoads(g, season) {
  const { wards, roads } = LAYOUT;
  for (const [north, south, verge] of [[wards[6], wards[7], 549], [wards[8], wards[9], MAP.width - 549]]) {
    const x = north.x + north.w / 2;
    road(g, [[x, north.y - 12], [verge, north.y - 12], [verge, south.y + south.h + 19], [x, south.y + south.h + 19]], 15);
    for (let i = 0; i < 7; i++) {
      const px = north.x + 23 + i * 67;
      meadowTree(g, px, 319 - (i % 3) * 11, 10 + (i * 4) % 9, season, i % 3 !== 1);
      if (i % 2 === 0) meadowTree(g, px + 24, 997 - (i % 3) * 6, 12 + (i * 3) % 7, season);
    }
  }
  const west = wards[10], east = wards[11];
  const backRoad = west.y + west.h + 19;
  road(g, [[roads.street, 1202], [roads.street, backRoad]], 25);
  road(g, [[west.x - 28, west.y + 53], [west.x - 28, backRoad], [east.x + east.w + 26, backRoad], [east.x + east.w + 26, east.y + 53]], 17);
  for (const ward of [west, east]) {
    // The wharves meet the river at the front. Goods and foot traffic use the land behind them.
    road(g, [[ward.x - 27, ward.y + 117], [ward.x + ward.w + 26, ward.y + 117], [ward.x + ward.w + 26, backRoad]], 12);
  }
  for (let i = 0; i < 28; i++) {
    const x = 53 + i * 104 + (i % 5) * 7;
    const y = 1583 - (i % 3) * 11;
    if (Math.abs(x - roads.street) > 33) meadowTree(g, x, y, 13 + (i * 3) % 8, season, i % 3 === 0);
  }
}

function waterScenery(g, season) {
  const { width } = MAP;
  const { y, h } = LAYOUT.river;
  g.fillStyle = gradient(g, 0, y + 12, 0, y + h, SEASON[season].water, 'transparent');
  g.fillRect(0, y, width, h);
  const glint = ['#fff2cf72', '#e5f4df91', '#f5dbab8b', '#e2f3fa98'][season];
  for (let i = 0; i < 45; i++) {
    const x = i * 65 + 8;
    const yy = y + 23 + (i * 17) % 94;
    const span = 11 + (i * 13) % 47;
    g.beginPath();
    g.moveTo(x, yy);
    g.quadraticCurveTo(x + span * .63, yy - 3 + i % 4, x + span, yy + .5);
    g.strokeStyle = glint;
    g.lineWidth = i % 4 === 0 ? 1.7 : .9;
    g.stroke();
    if (i % 5 === 0) strokePath(g, [[x + 9, yy + 4], [x + 23, yy + 4.5]], glint, .8);
  }

  // The center of the river stays open for the boats. Snow and ice collect on the shallows.
  if (season === 3) {
    for (let i = 0; i < 37; i++) {
      const x = i * 82 + ((i * 7) % 17);
      const north = i % 3 === 0;
      const yy = north ? y + 3 + (i * 5) % 12 : y + h - 16 + Math.sin(x / 84) * 9;
      const span = 20 + (i * 16) % 31;
      polygon(g, [[x - span, yy - 1], [x - span * .50, yy - 7], [x + span * .52, yy - 8], [x + span, yy - 1],
        [x + span * .47, yy + 4], [x - span * .66, yy + 5]], i % 3 ? '#f0f7f2b8' : '#d2e7e8bf');
      strokePath(g, [[x - span * .45, yy], [x - span * .25, yy - 2], [x + span * .24, yy + .5]], '#94b4bc64', .85);
    }
  }

  for (const [x, offset, size] of [[214, 18, 24], [450, -17, 34], [745, 18, 35], [930, -19, 28], [1120, 18, 32],
    [1314, 19, 22], [1663, 19, 25], [1900, 19, 36], [2181, -18, 30], [2420, 18, 30], [2667, -19, 34], [2830, 18, 27]]) {
    const shore = offset < 0 ? y : y + h;
    const base = shore + offset;
    const waterY = shore + (offset < 0 ? 9 : -15);
    const ripple = season === 3 ? '#c9d5d36b' : '#62846f47';
    for (let i = 0; i < 5; i++) oval(g, x + 4 + i % 3 * 7, waterY + i * 3 - 6, size * (.43 - i * .05), 1.15, ripple, -.04);
    willow(g, x, base - size * .46, size, season);
    if (season === 1 && offset > 0) lotus(g, x - 45, waterY - 14, size % 7);
    if (season === 0 && offset < 0) meadowTree(g, x + size * 1.03, base - 7, size * .55, season, true);
  }
}

let inletArt;

function inletTexture(season, span, depth) {
  if (inletArt?.season === season && inletArt.source === terrain) return inletArt.canvas;
  const canvas = document.createElement('canvas');
  canvas.width = span + 224;
  canvas.height = depth + 18;
  const g = canvas.getContext('2d');
  const { width, height } = canvas;
  const shallows = ['#9dc4b5', '#89b6aa', '#b1b897', '#c4dadd'][season];
  const deep = ['#709c96', '#5f9da2', '#859c85', '#829da8'][season];
  g.fillStyle = gradient(g, 0, 0, 0, height, deep, shallows);
  g.fillRect(0, 0, width, height);
  if (terrain) {
    const { naturalWidth: tw, naturalHeight: th } = terrain;
    g.globalAlpha = .74;
    g.drawImage(terrain, tw * .20, th * .881, tw * .59, th * .071, 0, 0, width, height);
    g.globalAlpha = 1;
  }
  g.globalCompositeOperation = 'destination-in';
  const fade = g.createLinearGradient(0, 0, 0, height);
  fade.addColorStop(0, '#0000');
  fade.addColorStop(.17, '#0006');
  fade.addColorStop(.42, '#000f');
  fade.addColorStop(1, '#000f');
  g.fillStyle = fade;
  g.fillRect(0, 0, width, height);
  // Feather the curves within this small tile so their pigment joins the paper behind them.
  g.filter = 'blur(3px)';
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(4, 0);
  g.bezierCurveTo(35, 28, 84, 46, 88, 70);
  g.bezierCurveTo(95, 105, 91, depth - 19, 112, depth - 2);
  g.bezierCurveTo(187, depth + 10, span + 40, depth + 6, span + 112, depth - 3);
  g.bezierCurveTo(span + 124, depth - 13, span + 122, 105, span + 139, 72);
  g.bezierCurveTo(span + 156, 40, span + 166, 39, width - 6, 0);
  g.closePath();
  g.fill();
  inletArt = { source: terrain, season, canvas };
  return canvas;
}

function shoreInlets(g, season) {
  const tide = LAYOUT.river.y + LAYOUT.river.h - 14;
  const mouths = LAYOUT.wards.filter((_, index) => RIVERSIDE.has(index * PLOTS_PER_DISTRICT));
  for (const ward of mouths) {
    const x = ward.x + 8;
    const right = ward.x + ward.w - 13;
    const lip = ward.y + 48;
    const upper = tide - 38;
    g.drawImage(inletTexture(season, right - x, lip - upper), x - 112, upper);
    for (let i = 0; i < 13; i++) {
      const xx = x + 11 + i * 34;
      const yy = lip - 81 + (i * 23) % 59;
      strokePath(g, [[xx, yy], [xx + 11, yy - 1.5], [xx + 31, yy]], '#edf0dba1', .9);
      if (i % 2 === 0) strokePath(g, [[xx + 4, yy + 7], [xx + 19, yy + 6]], '#648a8350', .8);
    }
    for (const [px, side] of [[x, -1], [right, 1]]) {
      for (let i = 0; i < 8; i++) {
        const yy = tide + 17 + i * 14;
        const xx = px + side * (24 - i * 2.1) + (i % 3 - 1) * 6.5;
        const stone = season === 3 ? '#bcc6bb' : '#aba386';
        oval(g, xx + 3, yy + 3, 12 - i * .52, 4, '#65786540', -.14);
        polygon(g, [[xx - 7, yy + 1], [xx - 3, yy - 4], [xx + 4, yy - 3], [xx + 8, yy + 1], [xx + 2, yy + 4]], stone);
        if (i % 3 === 1) {
          for (let j = -1; j <= 1; j++) {
            strokePath(g, [[xx + j * 2, yy], [xx + j * 6 + side * 2, yy - 8 + j]], '#778d64', 1.2);
          }
        }
      }
    }
  }
}

function quayEdge(g, r) {
  const x = r.x + 6, y = r.y + 4, w = r.w - 12;
  strokePath(g, [[x, y], [x + w, y + 1]], '#3d767c', 3.2);
  strokePath(g, [[x + 2, y - 2], [x + w - 2, y - 1]], '#e7f5e9bf', 1.1);
  for (const xx of [x + 5, x + w - 7]) {
    g.fillStyle = '#407d7a';
    g.fillRect(xx, y - 3, 2.4, 6);
  }
}

function mooredBoat(g, x, y, side) {
  oval(g, x + 2, y + 5, 19, 5, '#4d77724f', -.13);
  polygon(g, [[x - 16, y], [x + 17, y - 3], [x + 12, y + 5], [x - 9, y + 6]], '#9f7350', '#765a43');
  strokePath(g, [[x - 10, y + 1], [x + 12, y - 1]], '#d6ac78', 1.15);
  strokePath(g, [[x, y + 1], [x + side, y - 16]], '#80583e', 1.3);
  polygon(g, [[x + side, y - 16], [x + side * 12, y - 4], [x + side, y - 3]], '#e2c898', '#a39575');
  strokePath(g, [[x + 1, y + 7], [x + 14, y + 6]], '#e8ebe39c', 1);
}

function dockJetty(g, r, level, season) {
  const center = r.x + r.w * .49;
  const y = r.y + 8;
  const length = 49 + Math.min(20, level * .55);
  const tip = y - length;
  const width = 10 + Math.min(7, level * .16);
  const rim = season === 3 ? '#d1c8ac' : '#cfad7d';
  const shade = '#81674e';
  polygon(g, [[center - width - 1, y], [center - width + 2, tip], [center + width + 3, tip - 1], [center + width + 5, y + 1]], '#486d674b');
  polygon(g, [[center - width, y], [center - width + 1, tip - 4], [center + width - 3, tip - 5], [center + width, y]], rim, shade);
  for (let i = 0; i < length; i += 6) {
    const yy = tip + i;
    strokePath(g, [[center - width + 1, yy], [center + width - 2, yy - 1.1]], '#987952a1', .8);
  }
  for (const xx of [center - width + 1, center + width - 2]) {
    for (const yy of [tip - 2, y - length * .57, y - 7]) {
      g.fillStyle = shade;
      g.fillRect(xx - 1, yy - 4, 3, 9);
      oval(g, xx + .5, yy - 4, 1.55, .9, '#dcbe90');
    }
  }
  const boatX = center + width + 17;
  const boatY = tip + 13;
  strokePath(g, [[center + width - 2, tip + 2], [boatX - 10, boatY + 2]], '#a68f6a', .9);
  mooredBoat(g, boatX, boatY, 1);
  if (level >= 10) mooredBoat(g, center - width - 15, y - length * .49, -1);
}

function lotus(g, x, y, shift) {
  for (const [dx, dy, r] of [[-19, 3, 15], [5, -6, 11], [24, 4, 13], [38, 11, 10]]) {
    const cx = x + dx + shift;
    const yy = y + dy;
    oval(g, cx + 1.7, yy + 2, r * 1.04, r * .42, '#416c5c46');
    oval(g, cx, yy, r, r * .35, r > 12 ? '#698e68c9' : '#8fa977d6', -.09);
    strokePath(g, [[cx - r * .06, yy - 1], [cx + r * .45, yy - r * .23], [cx + r * .78, yy - r * .17]], '#a1b78dac', .9);
    if (r > 12) {
      oval(g, cx, yy - 4, r * .32, r * .13, '#ca7f93', -.1);
      oval(g, cx - 2, yy - 6, r * .13, r * .23, '#f4c3c5', -.53);
      oval(g, cx + 1.9, yy - 6, r * .13, r * .2, '#f2afbf', .55);
      oval(g, cx, yy - 4.5, r * .08, r * .055, '#e5ba77');
    }
  }
}

function groundDrifts(g, season) {
  const color = season === 3 ? '#e9f0eae8' : '#e2ad648f';
  for (const [x, y, r] of [[238, 1044, 53], [478, 990, 48], [680, 952, 59], [995, 1041, 48], [1253, 1018, 52],
    [1672, 1047, 66], [1980, 1029, 62], [2254, 1051, 51], [2450, 1007, 62], [2733, 1030, 62], [2920, 990, 65],
    [318, 1255, 80], [650, 1260, 52], [990, 1230, 47], [1220, 1260, 52], [1802, 1233, 64], [2210, 1231, 52],
    [2490, 1251, 86], [2855, 1283, 65], [2704, 1534, 58], [367, 1530, 62]]) {
    const paint = g.createRadialGradient(x, y, 2, x, y, r);
    paint.addColorStop(0, color);
    paint.addColorStop(1, 'transparent');
    oval(g, x, y, r, r * .42, paint, -.07);
    if (season === 3) oval(g, x - r * .15, y + 3, r * .32, r * .08, '#f8faf5b4', -.07);
  }
}

function landscape(g, season) {
  const { width, height } = MAP;
  const pal = SEASON[season];
  const { y: riverY, h: riverHeight } = LAYOUT.river;
  if (terrain) {
    const { width: coreWidth, height: coreHeight } = CORE_BOUNDS;
    const { naturalWidth: tw, naturalHeight: th } = terrain;
    const sliceWidth = tw * CORE_X / coreWidth;
    g.drawImage(terrain, CORE_X, 0, coreWidth, coreHeight);
    // Continue the river and mountain wash along the county's edges.
    g.save();
    g.translate(CORE_X, 0);
    g.scale(-1, 1);
    g.drawImage(terrain, 0, 0, sliceWidth, th, 0, 0, CORE_X, coreHeight);
    g.restore();
    g.save();
    g.translate(width, 0);
    g.scale(-1, 1);
    g.drawImage(terrain, tw - sliceWidth, 0, sliceWidth, th, 0, 0, CORE_X, coreHeight);
    g.restore();
    g.drawImage(terrain, tw * .26, th * .41, tw * .5, th * .33, 0, coreHeight, width, height - coreHeight);
  } else {
    g.fillStyle = gradient(g, 0, 0, 0, height, '#f4e8d3', pal.grass);
    g.fillRect(0, 0, width, height);
    for (let layer = 0; layer < 2; layer++) {
      const shore = [[0, 205]];
      for (let x = 0; x <= width; x += 21) {
        shore.push([x, 94 + layer * 39 + Math.sin(x / (88 + layer * 40)) * 33 + Math.sin(x / (39 + layer * 12)) * 14]);
      }
      shore.push([width, 205]);
      polygon(g, shore, layer ? pal.hill : '#aebfc0');
    }
    wash(g, 0, 215, width, 850, pal.grass2, 7);
    const bank = [];
    for (let x = 0; x <= width; x += 20) bank.push([x, riverY + Math.sin(x / 68) * 8]);
    bank.push([width, riverY + riverHeight], [0, riverY + riverHeight]);
    polygon(g, bank, gradient(g, 0, riverY, 0, riverY + riverHeight, '#82b6b2', '#aecbc0'));
    for (let i = 0; i < 21; i++) {
      meadowTree(g, ((i * 141) % width) + 18, 137 + (i % 4) * 13, 14 + (i % 7) * 2, season, i % 3 === 0);
    }
  }
  // Southern sandbanks and reeds mask the transition to cultivable land.
  const bank = [];
  for (let x = 0; x <= width; x += 20) {
    bank.push([x, riverY + riverHeight - 12 + Math.sin(x / 84) * 10 + Math.sin(x / 26) * 3]);
  }
  bank.push([width, riverY + riverHeight + 28], [0, riverY + riverHeight + 28]);
  polygon(g, bank, gradient(g, 0, riverY + riverHeight - 26, 0, riverY + riverHeight + 28, '#708a79', 'rgba(174,172,122,0)'));
  const tint = ['transparent', '#71995f2d', '#cf96473a', '#dbe8ee94'][season];
  g.fillStyle = tint;
  g.fillRect(0, 0, width, height);
  if (season === 2 || season === 3) groundDrifts(g, season);
  shoreInlets(g, season);
  const reeds = ['#5b795985', '#66854d99', '#a086589b', '#a0967a85'][season];
  for (let i = 0; i < 45; i++) {
    const x = 31 + i * 67 + (i % 7) * 9;
    if (Math.abs(x - CENTER.x) < 48) continue;
    const y = riverY + riverHeight - 9 + Math.sin(x / 84) * 10;
    for (let j = -2; j <= 2; j++) {
      strokePath(g, [[x + j * 3, y + 4], [x + j * 8, y - 4 - (j + i) % 10]], reeds, 1.3);
    }
  }
  waterScenery(g, season);
}

function bridge(g) {
  const x = CENTER.x, y = LAYOUT.river.y - 14;
  const end = LAYOUT.river.y + LAYOUT.river.h + 18;
  polygon(g, [[x - 29, y - 4], [x + 27, y - 4], [x + 33, end], [x - 35, end]],
    gradient(g, x, y, x + 35, end, '#eedbb1', '#b9a582'), 'rgba(110,95,68,.44)');
  for (let yy = y + 10; yy < end; yy += 13) {
    strokePath(g, [[x - 29, yy], [x + 29, yy + 1]], 'rgba(123,97,67,.34)', 1);
  }
  strokePath(g, [[x - 28, y], [x - 32, end]], '#897052', 4);
  strokePath(g, [[x + 28, y], [x + 32, end]], '#897052', 4);
  for (let yy = y + 1; yy < end; yy += 26) {
    for (const sign of [-1, 1]) {
      g.fillStyle = '#a0855d';
      g.fillRect(x + sign * 30 - 2, yy - 6, 5, 9);
    }
  }
}

function wallPiece(g, x1, y1, x2, y2, level, season) {
  const width = 17 + Math.min(4, Math.floor(level / 5)) * 2;
  const height = 16 + Math.min(level, 15) * .72;
  const horizontal = y1 === y2;
  const frost = season === 3;
  const top = frost ? '#dde7e0' : level ? '#c9c8b6' : '#cbbfa2';
  const face = level ? '#a9ab9d' : '#aa9c7d';
  g.lineWidth = 1;
  if (horizontal) {
    polygon(g, [[x1, y1], [x2, y2], [x2, y2 + height], [x1, y1 + height]],
      gradient(g, x1, y1, x1, y1 + height, top, face), 'rgba(100,99,77,.46)');
    polygon(g, [[x1, y1 - width], [x2, y2 - width], [x2, y2], [x1, y1]],
      gradient(g, x1, y1 - width, x1, y1, frost ? '#f1f5ed' : '#ece3ca', top), 'rgba(111,106,81,.46)');
    for (let x = x1 + 4; x < x2 - 8; x += 26) {
      g.fillStyle = top;
      g.fillRect(x, y1 - width - 5, 12, 9);
      g.fillStyle = 'rgba(113,109,88,.5)';
      g.fillRect(x + 11, y1 - width - 5, 2, 9);
      strokePath(g, [[x, y1 + height * .48], [x + 21, y1 + height * .48]], 'rgba(120,114,90,.28)', 1);
    }
  } else {
    polygon(g, [[x1 - width * .48, y1 - 11], [x1 + width * .52, y1 - 11], [x2 + width * .52, y2 - 11], [x2 - width * .48, y2 - 11]],
      gradient(g, x1 - width * .48, y1, x1 + width * .52, y1, frost ? '#f1f5ed' : '#f0e6cb', top), 'rgba(111,106,81,.50)');
    polygon(g, [[x1 + width * .52, y1 - 11], [x1 + width * .69, y1 + height], [x2 + width * .69, y2 + height], [x2 + width * .52, y2 - 11]],
      face, 'rgba(111,106,81,.40)');
    for (let y = y1; y < y2 - 9; y += 24) {
      g.fillStyle = top;
      g.fillRect(x1 - width * .62, y - 10, 6, 11);
      strokePath(g, [[x1 - width * .16, y], [x1 + width * .49, y + 1]], 'rgba(120,114,90,.36)', 1);
    }
  }
}

function drawSide(g, side, defence, season, words) {
  const gate = LAYOUT.gates[side];
  const x = gate.x + gate.w / 2;
  const y = gate.y + gate.h / 2;
  const wall = defence.wall[side] ?? 0;
  const tower = defence.tower[side] ?? 0;
  const troops = defence.troops?.[side] ?? 0;
  if (side === 0 || side === 2) {
    const yy = side === 0 ? CITY.top : CITY.bottom;
    wallPiece(g, CITY.left - 6, yy, x - 41, yy, wall, season);
    wallPiece(g, x + 41, yy, CITY.right + 9, yy, wall, season);
  } else {
    const xx = side === 1 ? CITY.right : CITY.left;
    wallPiece(g, xx, CITY.top, xx, y - 32, wall, season);
    wallPiece(g, xx, y + 39, xx, CITY.bottom, wall, season);
  }

  paintWallDetail(g, LAYOUT.walls[side], wall, season, { side });
  paintFacility(g, 'gate', tower, gate, season, { side });
  const foot = gate.y + gate.h - 7;
  const roofWidth = side % 2 ? 75 : 98;
  // A cloth banner and visible guard figures respond to actual garrison strength.
  for (const sign of [-1, 1]) {
    const bx = x + sign * (roofWidth * .53);
    strokePath(g, [[bx, foot - 11], [bx, foot - 51]], '#9a7552', 2.2);
    polygon(g, [[bx, foot - 49], [bx + sign * 19, foot - 46], [bx + sign * 14, foot - 40], [bx, foot - 40]],
      troops ? '#bc6654' : '#a3a287');
  }
  for (let i = 0; i < Math.min(8, troops); i++) {
    const xx = x + (i < 4 ? -1 : 1) * (22 + (i % 4) * 6);
    g.fillStyle = '#5f8178';
    g.fillRect(xx - 1.6, foot - 8, 3.3, 7.5);
    blob(g, xx, foot - 9.8, 1.7, '#eacfa3');
  }
  if (words) {
    const textWidth = Math.max(44, Math.min(124, words.length * 7.5 + 13));
    const sign = side === 0
      ? { x: x + roofWidth * .66, y: foot - 33, w: textWidth, h: 23 }
      : { x: x - textWidth / 2, y: foot + 7, w: textWidth, h: 23 };
    badge(g, words, sign, true);
  }
}

function drawCourtyard(g, state, season, words) {
  const { yamen, camp } = LAYOUT;
  round(g, yamen.x + 2, yamen.y + 38, yamen.w - 4, yamen.h - 38, 7);
  g.fillStyle = season === 3 ? '#edf0df' : 'rgba(243,229,197,.95)';
  g.fill();
  for (let x = yamen.x + 12; x < yamen.x + yamen.w - 10; x += 14) {
    strokePath(g, [[x, yamen.y + yamen.h - 17], [x + 1, yamen.y + yamen.h - 4]], 'rgba(135,114,77,.24)', 1);
  }
  paintFacility(g, 'yamen', state.rank, yamen, season);
  if (state.defence.camp) paintFacility(g, 'camp', state.defence.camp, camp, season);
  for (const [dx, dy, size] of [[-190, 282, 26], [-148, 261, 18], [165, 263, 22], [225, 284, 26], [-684, 270, 30], [-620, 267, 20], [610, 276, 24]]) {
    meadowTree(g, CENTER.x + dx, dy + 32, size, season, Math.abs(dx) < 250);
  }
  if (words) {
    const w = Math.min(106, Math.max(51, words.length * 8 + 10));
    badge(g, words, { x: yamen.x + yamen.w - w - 6, y: yamen.y + yamen.h - 22, w, h: 19 }, true);
  }
}

function badge(g, text, rect, open) {
  round(g, rect.x, rect.y, rect.w, rect.h, 5);
  g.fillStyle = open ? 'rgba(253,244,216,.96)' : 'rgba(234,231,209,.84)';
  g.fill();
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(126,111,74,.42)';
  g.stroke();
  g.fillStyle = '#4d5e4c';
  g.font = '600 14px "Noto Serif SC", "Songti SC", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, rect.x + rect.w / 2, rect.y + rect.h / 2 + .5, rect.w - 9);
}

function wardGround(g, ward, access, recommendation, outer, index) {
  if (!outer && access === 'owned') return;
  const x = ward.x + 5, y = ward.y + 33, w = ward.w - 10, h = ward.h - 34;
  const available = access === 'available';
  if (outer) {
    wash(g, x - 22, y - 12, w + 44, h + 24, '#899878', index + 10);
    const line = [[x + 15, y + 1], [x + w - 12, y], [x + w, y + 14], [x + w - 4, y + h - 11],
      [x + w - 16, y + h], [x + 8, y + h - 3], [x, y + h - 17], [x + 3, y + 14]];
    polygon(g, line, available ? 'rgba(237,224,163,.58)' : 'rgba(190,199,155,.32)');
    g.setLineDash(available ? [7, 4] : []);
    strokePath(g, [...line, line[0]], available ? 'rgba(167,120,64,.82)' : 'rgba(117,134,94,.36)', available ? 2.5 : 1.4);
    g.setLineDash([]);
    if (recommendation === 'farm' && access !== 'owned') {
      for (let i = 1; i < 9; i++) {
        const ry = y + 10 + i * 23;
        g.beginPath();
        g.moveTo(x + 19, ry);
        g.quadraticCurveTo(x + w * .50, ry - 12, x + w - 19, ry + 4);
        g.strokeStyle = 'rgba(124,140,84,.35)';
        g.lineWidth = 1.3;
        g.stroke();
      }
    }
  } else {
    g.fillStyle = 'rgba(221,224,201,.36)';
    round(g, x, y, w, h, 15);
    g.fill();
  }
}

function plotGround(g, r, open, hasBuilding, riverside, tone) {
  const x = r.x + 3, y = r.y + 6, w = r.w - 7, h = r.h - 10;
  const fill = hasBuilding ? 'rgba(186,159,107,.33)' :
    riverside ? '#b4d7ccbc' : tone;
  polygon(g, [[x + 5, y], [x + w, y + 2], [x + w - 4, y + h], [x, y + h - 1]], fill);
  if (riverside) quayEdge(g, r);
  if (!open && !hasBuilding) return;
  g.lineWidth = .9;
  g.setLineDash(hasBuilding ? [] : [4, 4]);
  strokePath(g, [[x + 5, y], [x + w, y + 2], [x + w - 4, y + h], [x, y + h - 1], [x + 5, y]], 'rgba(118,108,68,.46)', 1.1);
  g.setLineDash([]);
  if (!hasBuilding) {
    const cx = x + w / 2, cy = y + h / 2 + 1;
    blob(g, cx, cy, 10, '#f6edc9', .57);
    strokePath(g, [[cx - 5, cy], [cx + 5, cy]], 'rgba(119,103,64,.54)', 1.15);
    strokePath(g, [[cx, cy - 5], [cx, cy + 5]], 'rgba(119,103,64,.54)', 1.15);
  }
}

function scaffold(g, r, newBuild) {
  if (newBuild) {
    g.fillStyle = 'rgba(253,242,213,.47)';
    g.fillRect(r.x + 5, r.y + 5, r.w - 10, r.h - 9);
  }
  const x = newBuild ? r.x + 24 : r.x + r.w - 17;
  const foot = r.y + r.h - 7, top = r.y + 20, width = newBuild ? 44 : 9;
  strokePath(g, [[x, foot], [x, top], [x + width, top + 6], [x + width, foot]], '#9e7852', 1.8);
  for (let y = top + 12; y < foot; y += 13) {
    strokePath(g, [[x - 1, y], [x + width + 2, y + 3]], '#8f6845', 1.2);
  }
  polygon(g, [[x, top], [x + 13, top + 3], [x + 1, top + 9]], '#bf6e58');
}

/** Draw the county at its full world extent. The camera only changes the layer transforms. */
export function paintCounty(g, { state, season, night = 0, wardOpen, labels, building, wardState }) {
  if (!Number.isInteger(season) || season < 0 || season >= SEASON.length) season = 0;
  g.save();
  landscape(g, season);
  const { left, right, top, bottom } = CITY;
  const roadY = LAYOUT.roads.rows[1];
  road(g, [[0, roadY - 2], [MAP.width, roadY - 2]], 21);
  road(g, [[CENTER.x, 118], [CENTER.x, top + 24]], 33);
  for (const yy of [LAYOUT.roads.rows[0], LAYOUT.roads.rows[2]]) road(g, [[left + 13, yy], [right - 10, yy]], 21);
  for (const x of LAYOUT.roads.spines) road(g, [[x, LAYOUT.roads.rows[0]], [x, LAYOUT.roads.rows[2]]], x === CENTER.x ? 21 : 13);
  road(g, [[CENTER.x, 941], [CENTER.x, LAYOUT.river.y - 10]], 39);
  outlyingRoads(g, season);
  bridge(g);
  drawSide(g, 0, state.defence, season, labels.side?.(0));
  drawSide(g, 1, state.defence, season, labels.side?.(1));
  drawSide(g, 3, state.defence, season, labels.side?.(3));
  state.nodes.forEach((node, i) => drawNode(g, node.kind, node.level, node.found, LAYOUT.nodes[i], season));
  drawCourtyard(g, state, season, labels.yamen?.());

  LAYOUT.wards.forEach((ward, i) => {
    const access = wardState?.(i) ?? (wardOpen(i) ? 'owned' : 'locked');
    const open = access === 'owned';
    const recommendation = wardRecommendation(i);
    const zone = state.districts[i]?.zone;
    const farmland = ['#d3e2ac66', '#c2d79c72', '#e0bc7980', '#e6eee273'];
    const tone = recommendation === 'market' ? 'rgba(248,219,167,.36)' :
      recommendation === 'farm' ? farmland[season] : 'rgba(247,234,196,.30)';
    wardGround(g, ward, access, recommendation, i >= CORE_WARDS, i);
    for (let p = 0; p < PLOTS_PER_DISTRICT; p++) {
      const index = i * PLOTS_PER_DISTRICT + p;
      const plot = state.plots[index];
      const rect = LAYOUT.plots[index];
      const riverfront = RIVERSIDE.has(index);
      plotGround(g, rect, open, plot?.kind, riverfront, tone);
      if (plot?.kind) {
        if (riverfront && plot.kind === 'dock' && plot.level > 0) dockJetty(g, rect, plot.level, season);
        if (plot.level > 0) paintBuilding(g, plot.kind, plot.level, rect, season);
        if (building?.has(index)) scaffold(g, rect, plot.level === 0);
      } else if (!open && (p + i) % 3 === 0) {
        meadowTree(g, rect.x + 42, rect.y + 43, 10, season, (p + i) % 2 === 0);
      }
    }
    if (zone) wash(g, ward.x + 13, ward.y + 9, 155, 16, C.zone[zone], i + 13);
    badge(g, labels.ward(i), ward.label, access !== 'locked');
  });
  for (let i = 0; i < 15; i++) {
    const x = CORE_X + 208 + i * 98;
    if (Math.abs(x - CENTER.x) < 54) continue;
    meadowTree(g, x, bottom - 34, 12 + (i % 4) * 2, season, i % 4 !== 1);
  }
  drawSide(g, 2, state.defence, season, labels.side?.(2));

  if (night > 0) {
    g.fillStyle = `rgba(45,61,91,${night * .35})`;
    g.fillRect(0, 0, MAP.width, MAP.height);
    g.globalCompositeOperation = 'lighter';
    const glow = (x, y, radius) => {
      const light = g.createRadialGradient(x, y, 0, x, y, radius);
      light.addColorStop(0, `rgba(251,173,94,${.44 * night})`);
      light.addColorStop(1, 'rgba(255,196,110,0)');
      g.fillStyle = light;
      g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    };
    state.plots.forEach((plot, i) => {
      if (!plot.kind || !plot.level || FIELDS.has(plot.kind)) return;
      const r = LAYOUT.plots[i];
      glow(r.x + r.w / 2, r.y + r.h - 24, 28);
    });
    glow(CENTER.x, LAYOUT.yamen.y + 54, 52);
    for (const gate of LAYOUT.gates) glow(gate.x + gate.w / 2, gate.y + gate.h - 30, 33);
  }
  g.restore();
}
