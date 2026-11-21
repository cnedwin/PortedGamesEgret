// The map is painted at world size. The main view scrolls the painting, hit areas
// and Egret effects together, so a camera move does not rasterize the city again.
import { DISTRICT_COLS, DISTRICT_ROWS, NODE_SLOTS, PLOT_COLS, PLOTS_PER_DISTRICT, PLOT_ROWS, RIVERSIDE } from './sim/world.mjs';

export const STAGE = { width: 1280, height: 720 };
export const MAP = { width: 1840, height: 1200 };

const CITY = { left: 145, right: 1695, top: 256, bottom: 1003 };
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
  for (let i = 0; i < DISTRICT_COLS * DISTRICT_ROWS; i++) {
    const col = i % DISTRICT_COLS;
    const x = 193 + col * 490;
    const y = 356 + Math.floor(i / DISTRICT_COLS) * 300;
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
    camp: { x: 1395, y: 267, w: 185, h: 78 },
    yamen: { x: 805, y: 267, w: 230, h: 81 },
    river: { y: 1060, h: 140 },
    roads: { street: CENTER.x, rows: [343, 641, 945], spines: [676, CENTER.x, 1165] }
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
  { grass: '#bcdca3', grass2: '#a7cf8f', hill: '#a9cdb3', tree: '#86b98f', bloom: '#f4b8c6', roofCap: null },
  { grass: '#a4d08c', grass2: '#8fc27a', hill: '#94c3a1', tree: '#6faa7e', bloom: '#f6d36b', roofCap: null },
  { grass: '#d8cf93', grass2: '#cdbf7d', hill: '#c9c49a', tree: '#d99a5a', bloom: '#e8794f', roofCap: null },
  { grass: '#e7ecec', grass2: '#d9e2e3', hill: '#dfe6ea', tree: '#9fb7b4', bloom: '#ffffff', roofCap: '#ffffff' }
];
const C = {
  paper: '#f4efe1',
  ink: '#4c5a5c',
  roof: '#5f7481',
  wall: '#f7f1e2',
  wood: '#b78459',
  woodDark: '#8d5f3c',
  lacquer: '#c6584a',
  gold: '#e2b45a',
  water: '#8fc6c8',
  waterLight: '#bfe2dd',
  stone: '#b9b4a8',
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

/** A roof with upturned eaves, from (x, y) its left eave, width w. */
function roof(g, x, y, w, h, color = C.roof, cap = null) {
  const ridge = y - h * 0.66;
  polygon(g, [[x - 4, y + h], [x + w * .19, y], [x + w * .28, ridge], [x + w * .83, ridge], [x + w * .8, y]],
    gradient(g, x, ridge, x, y + h, '#94acaa', color), 'rgba(68,77,71,.44)');
  polygon(g, [[x + w * .8, y], [x + w * .83, ridge], [x + w * 1.05, y + h * .52], [x + w + 4, y + h]],
    '#718582', 'rgba(68,77,71,.48)');
  g.fillStyle = gradient(g, x, y, x, y + h, color, '#516668');
  g.beginPath();
  g.moveTo(x - 4, y + h);
  g.quadraticCurveTo(x + w * 0.1, y + h * 0.7, x + w * 0.2, y);
  g.lineTo(x + w * 0.8, y);
  g.quadraticCurveTo(x + w * 0.9, y + h * 0.7, x + w + 4, y + h);
  g.quadraticCurveTo(x + w / 2, y + h * 0.82, x - 4, y + h);
  g.fill();
  g.strokeStyle = 'rgba(228,236,212,.32)';
  g.lineWidth = 0.65;
  const ribs = Math.max(6, Math.floor(w / 6));
  for (let i = 1; i < ribs; i++) {
    const progress = i / ribs;
    g.beginPath();
    g.moveTo(x + w * (.20 + progress * .60), y + 1);
    g.quadraticCurveTo(x + w * (.12 + progress * .76), y + h * .62, x + w * (.04 + progress * .92), y + h * .89);
    g.stroke();
  }
  g.strokeStyle = 'rgba(40,60,56,.72)';
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(x - 5, y + h - 2);
  g.quadraticCurveTo(x + w / 2, y + h * .95, x + w + 5, y + h - 2);
  g.stroke();
  g.fillStyle = C.ink;
  g.fillRect(x + w * 0.18, y - 2, w * 0.64, 3);
  if (cap) {
    g.fillStyle = cap;
    g.globalAlpha = 0.85;
    g.fillRect(x + w * 0.2, y - 2, w * 0.6, 5);
    g.globalAlpha = 1;
  }
}
/** A hall: walls, pillars, a door, a roof. */
function hall(g, cx, base, w, h, { roofColor = C.roof, wallColor = C.wall, storeys = 1, cap = null, door = true, lantern = false } = {}) {
  const x = cx - w / 2;
  const shade = g.createRadialGradient(cx + 8, base + 2, 0, cx + 8, base + 2, w * .68);
  shade.addColorStop(0, 'rgba(70,82,66,.26)');
  shade.addColorStop(1, 'transparent');
  g.fillStyle = shade;
  g.beginPath();
  g.ellipse(cx + 7, base + 1, w * .64, Math.max(5, h * .28), 0, 0, Math.PI * 2);
  g.fill();
  for (let s = 0; s < storeys; s++) {
    const sw = w * (1 - s * 0.16),
      sx = cx - sw / 2,
      top = base - h * (s + 1) - s * 10;
    const depth = Math.max(5, sw * .12);
    polygon(g, [[sx + sw, top], [sx + sw + depth, top - depth * .55], [sx + sw + depth, top + h - depth * .55], [sx + sw, top + h]],
      gradient(g, sx + sw, top, sx + sw + depth, top, '#aea58a', '#d3c8ac'), 'rgba(86,78,58,.45)');
    g.fillStyle = gradient(g, sx, top, sx + sw, top + h, wallColor, '#e3d6b8');
    g.fillRect(sx, top, sw, h - 3);
    g.fillStyle = '#ac9b82';
    g.fillRect(sx - 1, top + h - 2.5, sw + 2, 3);
    g.fillStyle = C.wood;
    g.fillRect(sx + 1, top, 2, h - 3);
    g.fillRect(sx + sw - 3, top, 2, h - 3);
    g.fillStyle = 'rgba(79,100,97,.62)';
    for (const fraction of [.22, .72]) g.fillRect(sx + sw * fraction, top + h * .29, sw * .10, h * .32);
    if (door && s === 0) {
      g.fillStyle = C.woodDark;
      g.fillRect(cx - 5, base - h * 0.62, 10, h * 0.62);
      g.fillStyle = '#cfab76';
      g.fillRect(cx - 6, base - h * .64, 12, 2);
    }
    roof(g, sx - 3, top - Math.max(11, h * .43), sw + 6, Math.max(12, h * .45), roofColor, cap);
  }
  if (lantern) {
    blob(g, x + 4, base - h + 6, 3.5, C.lacquer);
    blob(g, x + w - 4, base - h + 6, 3.5, C.lacquer);
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

/** Draw a building of `kind` at `level` in plot rect `r`. */
export function drawBuilding(g, kind, level, r, season) {
  const cx = r.x + r.w / 2,
    base = r.y + r.h - 8,
    pal = SEASON[season],
    tier = level >= 25 ? 2 : level >= 10 ? 1 : 0,
    cap = pal.roofCap;
  const shadow = () => {
    g.fillStyle = 'rgba(60,70,60,0.15)';
    g.beginPath();
    g.ellipse(cx, base + 2, r.w * 0.42, 6, 0, 0, Math.PI * 2);
    g.fill();
  };
  switch (kind) {
    case 'house':
      shadow();
      hall(g, cx - 10, base, 34, 20, { cap });
      if (tier >= 1) hall(g, cx + 16, base, 26, 16, { cap });
      if (tier >= 2) hall(g, cx - 8, base - 26, 22, 12, { cap, door: false });
      tree(g, r.x + r.w - 10, base - 34, 7, pal.tree, season === 0 ? pal.bloom : null);
      break;
    case 'manor':
      shadow();
      g.fillStyle = C.wall;
      g.fillRect(r.x + 6, base - 22, r.w - 12, 22);
      hall(g, cx, base - 6, 46, 22, { storeys: tier >= 1 ? 2 : 1, cap, lantern: true });
      break;
    case 'paddy':
    case 'mulberry':
    case 'teaGarden': {
      const green = kind === 'paddy' ? (season === 2 ? '#e2c46a' : season === 3 ? '#e9eeee' : '#8fcf7e') : kind === 'mulberry' ? pal.tree : '#6aa77a';
      g.fillStyle = kind === 'paddy' ? C.waterLight : '#d8c9a5';
      round(g, r.x + 4, r.y + 14, r.w - 8, r.h - 18, 6);
      g.fill();
      const rows = 3 + tier;
      for (let i = 0; i < rows; i++)
        for (let j = 0; j < 5; j++) {
          const x = r.x + 12 + j * ((r.w - 24) / 4),
            y = r.y + 22 + i * ((r.h - 34) / Math.max(1, rows - 1));
          if (kind === 'mulberry') tree(g, x, y - 2, 5, green);
          else if (kind === 'teaGarden') blob(g, x, y, 5, green);
          else (g.fillStyle = green), g.fillRect(x - 1, y - 5, 2, 8), g.fillRect(x - 4, y - 3, 2, 6);
        }
      if (kind === 'paddy' && tier >= 1) hall(g, r.x + 16, r.y + 26, 18, 10, { cap, door: false });
      break;
    }
    case 'brewery':
      shadow();
      hall(g, cx - 6, base, 40, 22, { cap });
      for (let i = 0; i < 2 + tier; i++) blob(g, r.x + r.w - 12 - i * 9, base - 6, 5, '#9a6b45');
      break;
    case 'loom':
      shadow();
      hall(g, cx, base, 48, 22, { cap, storeys: tier >= 2 ? 2 : 1 });
      g.fillStyle = ['#e7a3b0', '#9cc8d8', '#f2d48a'][level % 3];
      g.fillRect(r.x + 6, base - 34, 8, 26);
      g.fillRect(r.x + r.w - 14, base - 34, 8, 26);
      break;
    case 'kiln':
      shadow();
      g.fillStyle = '#c28a62';
      g.beginPath();
      g.ellipse(cx + 8, base - 12, 22, 16, 0, Math.PI, 0);
      g.fill();
      g.fillRect(cx + 22, base - 40, 8, 26);
      hall(g, cx - 18, base, 26, 16, { cap });
      blob(g, cx - 2, base - 6, 4, '#ffffff');
      blob(g, cx + 6, base - 6, 4, '#7fa6c8');
      break;
    case 'market':
      shadow();
      for (let i = 0; i < 2 + Math.min(1, tier); i++) {
        const x = r.x + 6 + i * 24;
        g.fillStyle = C.wood;
        g.fillRect(x + 2, base - 18, 2, 18);
        g.fillRect(x + 18, base - 18, 2, 18);
        g.fillStyle = ['#e78f7c', '#f0c46a', '#8fc2c8'][i % 3];
        g.beginPath();
        g.moveTo(x - 2, base - 16);
        g.lineTo(x + 11, base - 26);
        g.lineTo(x + 24, base - 16);
        g.fill();
        blob(g, x + 7, base - 6, 3, '#f2d48a');
        blob(g, x + 14, base - 6, 3, '#c76b5a');
      }
      if (tier >= 2) hall(g, cx, base - 26, 36, 14, { cap, door: false });
      break;
    case 'teahouse':
    case 'inn':
      shadow();
      hall(g, cx, base, kind === 'inn' ? 52 : 40, 22, { storeys: kind === 'inn' ? (tier >= 1 ? 3 : 2) : tier >= 1 ? 2 : 1, cap, lantern: true });
      g.fillStyle = kind === 'inn' ? C.lacquer : '#7ea87a';
      g.fillRect(r.x + r.w - 14, base - 46, 3, 40);
      g.fillRect(r.x + r.w - 22, base - 46, 9, 14);
      break;
    case 'dock':
      g.fillStyle = C.wood;
      g.fillRect(r.x + 6, base - 10, r.w - 12, 8);
      for (let i = 0; i < 4; i++) g.fillRect(r.x + 10 + i * 18, base - 4, 3, 12);
      hall(g, r.x + 22, base - 10, 26, 14, { cap });
      g.fillStyle = '#8d5f3c';
      g.beginPath();
      g.ellipse(r.x + r.w - 20, base + 6, 16, 4, 0, 0, Math.PI);
      g.fill();
      g.fillStyle = C.wall;
      g.fillRect(r.x + r.w - 22, base - 16, 2, 20);
      g.beginPath();
      g.moveTo(r.x + r.w - 20, base - 16);
      g.lineTo(r.x + r.w - 6, base - 2);
      g.lineTo(r.x + r.w - 20, base - 2);
      g.fill();
      break;
    case 'clinic':
    case 'school':
    case 'temple':
      shadow();
      hall(g, cx, base, 44, 22, { storeys: tier >= 1 ? 2 : 1, cap, roofColor: kind === 'temple' ? '#b4584a' : C.roof, wallColor: kind === 'temple' ? '#f5e2c6' : C.wall });
      if (kind === 'clinic') blob(g, r.x + 10, base - 24, 5, '#e2b45a'), blob(g, r.x + 10, base - 16, 6, '#e2b45a');
      if (kind === 'school') tree(g, r.x + r.w - 10, base - 30, 8, '#7fb48f');
      if (kind === 'temple') blob(g, cx, base - 8, 3, C.gold);
      break;
    case 'theatre':
      shadow();
      g.fillStyle = C.wood;
      g.fillRect(r.x + 8, base - 22, r.w - 16, 22);
      g.fillStyle = C.lacquer;
      g.fillRect(r.x + 14, base - 20, r.w - 28, 14);
      roof(g, r.x + 6, base - 36, r.w - 12, 15, C.roof, cap);
      for (let i = 0; i < 3; i++) blob(g, r.x + 20 + i * 18, base - 12, 3, ['#f2d48a', '#9cc8d8', '#f4b8c6'][i]);
      break;
    case 'garden':
      g.fillStyle = C.waterLight;
      g.beginPath();
      g.ellipse(cx - 6, base - 18, 22, 12, 0, 0, Math.PI * 2);
      g.fill();
      blob(g, cx + 22, base - 12, 6, C.stone);
      tree(g, r.x + 14, base - 40, 10, pal.tree, pal.bloom);
      if (tier >= 1) hall(g, cx + 14, base - 30, 22, 10, { cap, door: false });
      if (tier >= 2) tree(g, r.x + r.w - 12, base - 46, 9, pal.tree, pal.bloom);
      break;
    case 'pagoda': {
      shadow();
      const storeys = 3 + tier * 2;
      for (let s = 0; s < storeys; s++) {
        const w = 34 - s * 3,
          y = base - 12 - s * 11;
        g.fillStyle = C.wall;
        g.fillRect(cx - w / 2 + 3, y, w - 6, 10);
        roof(g, cx - w / 2, y - 5, w, 7, C.roof, cap);
      }
      g.fillStyle = C.gold;
      g.fillRect(cx - 1, base - 18 - storeys * 11, 2, 10);
      break;
    }
    case 'granary':
      shadow();
      g.fillStyle = '#d9bf8e';
      g.beginPath();
      g.ellipse(cx, base - 14, 18, 14, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(cx - 18, base - 14, 36, 14);
      roof(g, cx - 22, base - 34, 44, 12, '#a9874f', cap);
      break;
  }
  // The level, small, in a corner.
  if (level > 0) {
    g.fillStyle = 'rgba(244,239,225,0.9)';
    round(g, r.x + 2, r.y + 2, level >= 10 ? 22 : 16, 14, 7);
    g.fill();
    g.fillStyle = C.ink;
    g.font = '600 10px system-ui, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(String(level), r.x + 6, r.y + 9);
  }
}

function drawNode(g, kind, level, found, r, season) {
  const pal = SEASON[season],
    cx = r.x + r.w / 2,
    base = r.y + r.h - 6;
  if (!found) {
    g.globalAlpha = 0.55;
    blob(g, cx - 14, base - 22, 18, '#e9eef0');
    blob(g, cx + 10, base - 18, 20, '#e9eef0');
    g.globalAlpha = 1;
    g.fillStyle = C.ink;
    g.font = '600 18px serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('?', cx, base - 22);
    return;
  }
  if (kind === 'forest') for (let i = 0; i < 5; i++) tree(g, r.x + 12 + i * 15, base - 20 - (i % 2) * 10, 10, pal.tree);
  else if (kind === 'quarry' || kind === 'iron') {
    g.fillStyle = kind === 'iron' ? '#7d8288' : '#bdb7aa';
    g.beginPath();
    g.moveTo(r.x + 6, base);
    g.lineTo(r.x + 26, base - 44);
    g.lineTo(r.x + 46, base - 26);
    g.lineTo(r.x + 62, base - 50);
    g.lineTo(r.x + r.w - 4, base);
    g.fill();
    if (kind === 'iron') for (let i = 0; i < 4; i++) blob(g, r.x + 24 + i * 10, base - 14, 2.5, '#c86e4a');
  } else {
    g.fillStyle = '#c98f68';
    g.beginPath();
    g.ellipse(cx, base - 10, 30, 12, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#a96c47';
    g.beginPath();
    g.ellipse(cx, base - 11, 18, 6, 0, 0, Math.PI * 2);
    g.fill();
  }
  if (level > 0) {
    hall(g, r.x + r.w - 14, base, 18, 10, { door: false, cap: pal.roofCap });
    g.fillStyle = 'rgba(244,239,225,0.9)';
    round(g, r.x + 2, r.y + 2, level >= 10 ? 22 : 16, 14, 7);
    g.fill();
    g.fillStyle = C.ink;
    g.font = '600 10px system-ui, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(String(level), r.x + 6, r.y + 9);
  }
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

function landscape(g, season) {
  const { width, height } = MAP;
  const pal = SEASON[season];
  if (terrain) {
    g.drawImage(terrain, 0, 0, width, height);
    const tint = ['transparent', 'rgba(111,157,91,.14)', 'rgba(210,143,71,.17)', 'rgba(229,240,240,.56)'][season];
    g.fillStyle = tint;
    g.fillRect(0, 0, width, height);
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
    for (let x = 0; x <= width; x += 17) bank.push([x, LAYOUT.river.y + Math.sin(x / 68) * 8]);
    bank.push([width, height], [0, height]);
    polygon(g, bank, gradient(g, 0, LAYOUT.river.y, 0, height, '#82b6b2', '#aecbc0'));
    for (let i = 0; i < 21; i++) {
      tree(g, ((i * 141) % width) + 18, 137 + (i % 4) * 13, 14 + (i % 7) * 2, pal.tree, season === 0 ? pal.bloom : null);
    }
  }
  for (let i = 0; i < 22; i++) {
    const x = i * 84 + 19;
    const y = LAYOUT.river.y + 25 + (i % 4) * 23;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 18, y - 4, x + 40, y + 1);
    g.strokeStyle = 'rgba(245,244,214,.28)';
    g.lineWidth = 1.1;
    g.stroke();
  }
}

function bridge(g) {
  const x = CENTER.x, y = LAYOUT.river.y - 14;
  polygon(g, [[x - 29, y - 4], [x + 27, y - 4], [x + 33, MAP.height], [x - 35, MAP.height]],
    gradient(g, x, y, x + 35, MAP.height, '#eedbb1', '#b9a582'), 'rgba(110,95,68,.44)');
  for (let yy = y + 10; yy < MAP.height; yy += 13) {
    strokePath(g, [[x - 29, yy], [x + 29, yy + 1]], 'rgba(123,97,67,.34)', 1);
  }
  strokePath(g, [[x - 28, y], [x - 32, MAP.height]], '#897052', 4);
  strokePath(g, [[x + 28, y], [x + 32, MAP.height]], '#897052', 4);
  for (let yy = y + 1; yy < MAP.height; yy += 26) {
    for (const sign of [-1, 1]) {
      g.fillStyle = '#a0855d';
      g.fillRect(x + sign * 30 - 2, yy - 6, 5, 9);
    }
  }
}

function wallPiece(g, x1, y1, x2, y2, level) {
  const width = 17 + Math.min(4, Math.floor(level / 5)) * 2;
  const height = 16 + Math.min(level, 15) * .72;
  const horizontal = y1 === y2;
  const top = level ? '#c9c8b6' : '#cbbfa2';
  const face = level ? '#a9ab9d' : '#aa9c7d';
  g.lineWidth = 1;
  if (horizontal) {
    polygon(g, [[x1, y1], [x2, y2], [x2, y2 + height], [x1, y1 + height]],
      gradient(g, x1, y1, x1, y1 + height, top, face), 'rgba(100,99,77,.46)');
    polygon(g, [[x1, y1 - width], [x2, y2 - width], [x2, y2], [x1, y1]],
      gradient(g, x1, y1 - width, x1, y1, '#ece3ca', top), 'rgba(111,106,81,.46)');
    for (let x = x1 + 4; x < x2 - 8; x += 26) {
      g.fillStyle = top;
      g.fillRect(x, y1 - width - 5, 12, 9);
      g.fillStyle = 'rgba(113,109,88,.5)';
      g.fillRect(x + 11, y1 - width - 5, 2, 9);
      strokePath(g, [[x, y1 + height * .48], [x + 21, y1 + height * .48]], 'rgba(120,114,90,.28)', 1);
    }
  } else {
    polygon(g, [[x1 - width * .48, y1 - 11], [x1 + width * .52, y1 - 11], [x2 + width * .52, y2 - 11], [x2 - width * .48, y2 - 11]],
      gradient(g, x1 - width * .48, y1, x1 + width * .52, y1, '#f0e6cb', top), 'rgba(111,106,81,.50)');
    polygon(g, [[x1 + width * .52, y1 - 11], [x1 + width * .69, y1 + height], [x2 + width * .69, y2 + height], [x2 + width * .52, y2 - 11]],
      face, 'rgba(111,106,81,.40)');
    for (let y = y1; y < y2 - 9; y += 24) {
      g.fillStyle = top;
      g.fillRect(x1 - width * .62, y - 10, 6, 11);
      strokePath(g, [[x1 - width * .16, y], [x1 + width * .49, y + 1]], 'rgba(120,114,90,.36)', 1);
    }
  }
}

function drawSide(g, side, defence, pal, words) {
  const gate = LAYOUT.gates[side];
  const x = gate.x + gate.w / 2;
  const y = gate.y + gate.h / 2;
  const wall = defence.wall[side] ?? 0;
  const tower = defence.tower[side] ?? 0;
  const troops = defence.troops?.[side] ?? 0;
  if (side === 0 || side === 2) {
    const yy = side === 0 ? CITY.top : CITY.bottom;
    wallPiece(g, CITY.left - 6, yy, x - 41, yy, wall);
    wallPiece(g, x + 41, yy, CITY.right + 9, yy, wall);
  } else {
    const xx = side === 1 ? CITY.right : CITY.left;
    wallPiece(g, xx, CITY.top, xx, y - 32, wall);
    wallPiece(g, xx, y + 39, xx, CITY.bottom, wall);
  }

  const foot = gate.y + gate.h - 7;
  const roofWidth = side % 2 ? 75 : 98;
  polygon(g, [[x - roofWidth * .55, foot - 29], [x + roofWidth * .55, foot - 29], [x + roofWidth * .50, foot + 3], [x - roofWidth * .53, foot + 3]],
    gradient(g, x, foot - 30, x, foot + 3, '#d2c5a4', '#8c8974'), 'rgba(95,90,68,.67)');
  hall(g, x, foot - 23, roofWidth, 23, {
    storeys: tower >= 5 ? 2 : 1,
    roofColor: tower ? '#557e73' : '#778c81',
    wallColor: '#eee0b8',
    cap: pal.roofCap,
    lantern: true
  });
  g.beginPath();
  g.moveTo(x - 13, foot + 2);
  g.lineTo(x - 13, foot - 12);
  g.quadraticCurveTo(x, foot - 30, x + 13, foot - 12);
  g.lineTo(x + 13, foot + 2);
  g.fillStyle = '#5a5845';
  g.fill();
  strokePath(g, [[x - 14, foot + 3], [x + 14, foot + 3]], '#bca379', 2);
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

function drawCourtyard(g, state, pal, season) {
  const { yamen, camp } = LAYOUT;
  round(g, yamen.x + 2, yamen.y + 38, yamen.w - 4, yamen.h - 38, 7);
  g.fillStyle = 'rgba(243,229,197,.95)';
  g.fill();
  for (let x = yamen.x + 12; x < yamen.x + yamen.w - 10; x += 14) {
    strokePath(g, [[x, yamen.y + yamen.h - 17], [x + 1, yamen.y + yamen.h - 4]], 'rgba(135,114,77,.24)', 1);
  }
  const base = yamen.y + yamen.h - 6;
  hall(g, CENTER.x, base, 122, 29, { storeys: state.rank >= 3 ? 2 : 1, cap: pal.roofCap, roofColor: '#57746d', lantern: true });
  hall(g, yamen.x + 25, base - 2, 32, 17, { cap: pal.roofCap });
  hall(g, yamen.x + yamen.w - 30, base - 2, 32, 17, { cap: pal.roofCap });
  if (state.defence.camp) {
    for (let i = 0; i < 3; i++) {
      const x = camp.x + 13 + i * 52;
      const y = camp.y + 63;
      polygon(g, [[x - 4, y], [x + 14, y - 34], [x + 36, y], [x + 32, y + 5]],
        '#e6cc9a', 'rgba(133,112,79,.64)');
      polygon(g, [[x + 10, y], [x + 16, y - 17], [x + 22, y]], '#9d8864');
    }
  }
  const plant = season === 0 ? '#edabad' : pal.bloom;
  for (const [dx, dy, size] of [[-190, 282, 26], [-148, 261, 18], [165, 263, 22], [225, 284, 26], [-684, 270, 30], [-620, 267, 20], [610, 276, 24]]) {
    tree(g, CENTER.x + dx, dy + 32, size, season === 0 && Math.abs(dx) < 250 ? '#d79ea0' : pal.tree, plant);
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

function plotGround(g, r, open, hasBuilding, riverside, tone) {
  const x = r.x + 3, y = r.y + 6, w = r.w - 7, h = r.h - 10;
  const fill = hasBuilding ? 'rgba(186,159,107,.33)' :
    riverside ? 'rgba(202,227,203,.38)' : tone;
  polygon(g, [[x + 5, y], [x + w, y + 2], [x + w - 4, y + h], [x, y + h - 1]], fill);
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
export function paintCounty(g, { state, season, night = 0, wardOpen, labels, building }) {
  const pal = SEASON[season];
  g.save();
  landscape(g, season);
  const { left, right, top, bottom } = CITY;
  const roadY = LAYOUT.roads.rows[1];
  road(g, [[0, roadY - 2], [MAP.width, roadY - 2]], 21);
  road(g, [[CENTER.x, 118], [CENTER.x, top + 24]], 33);
  for (const yy of [LAYOUT.roads.rows[0], LAYOUT.roads.rows[2]]) road(g, [[left + 13, yy], [right - 10, yy]], 21);
  for (const x of LAYOUT.roads.spines) road(g, [[x, LAYOUT.roads.rows[0]], [x, LAYOUT.roads.rows[2]]], x === CENTER.x ? 21 : 13);
  road(g, [[CENTER.x, 941], [CENTER.x, LAYOUT.river.y - 10]], 39);
  bridge(g);
  drawSide(g, 0, state.defence, pal, labels.side?.(0));
  drawSide(g, 1, state.defence, pal, labels.side?.(1));
  drawSide(g, 3, state.defence, pal, labels.side?.(3));
  state.nodes.forEach((node, i) => drawNode(g, node.kind, node.level, node.found, LAYOUT.nodes[i], season));
  drawCourtyard(g, state, pal, season);

  LAYOUT.wards.forEach((ward, i) => {
    const open = wardOpen(i);
    const zone = state.districts[i].zone;
    const tone = ['rgba(246,221,178,.22)', 'rgba(252,243,207,.32)', 'rgba(226,227,183,.36)'][i % 3];
    if (!open) {
      g.fillStyle = 'rgba(221,224,201,.36)';
      round(g, ward.x + 6, ward.y + 32, ward.w - 12, ward.h - 35, 15);
      g.fill();
    }
    for (let p = 0; p < PLOTS_PER_DISTRICT; p++) {
      const index = i * PLOTS_PER_DISTRICT + p;
      const plot = state.plots[index];
      const rect = LAYOUT.plots[index];
      plotGround(g, rect, open, plot?.kind, RIVERSIDE.has(index), tone);
      if (plot?.kind) {
        drawBuilding(g, plot.kind, plot.level, rect, season);
        if (building?.has(index)) scaffold(g, rect, plot.level === 0);
      } else if (!open && (p + i) % 3 === 0) {
        tree(g, rect.x + 42, rect.y + 43, 10, pal.tree, season === 0 ? pal.bloom : null);
      }
    }
    if (zone) wash(g, ward.x + 13, ward.y + 9, 155, 16, C.zone[zone], i + 13);
    badge(g, labels.ward(i), ward.label, open);
  });
  for (let i = 0; i < 15; i++) {
    const x = 208 + i * 98;
    if (Math.abs(x - CENTER.x) < 54) continue;
    tree(g, x, bottom - 34, 12 + (i % 4) * 2, pal.tree, season === 0 ? '#edb2aa' : null);
  }
  drawSide(g, 2, state.defence, pal, labels.side?.(2));

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
