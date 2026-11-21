// 桃溪县的地图：720×1280 的竖版画面上，远山与资源点、城墙城门和箭楼、县衙、六个坊的地面与建筑、溪水与码头，按季节
// 和昼夜换颜色。全部用 2D canvas 一笔一笔画，画在引擎画布下面，只在城里有变化或换季、入夜时重画（见 ENGINE-NOTES）。
// The map of Peach Creek on a 720 × 1280 upright page: the far hills and resource points, the wall with its gate
// and towers, the yamen, the six wards with their ground and buildings, the creek and the docks, coloured by season
// and by day or night. All drawn stroke by stroke on a 2D canvas under the engine's, and drawn again only when the
// county changes, the season turns or night falls.
import { NODE_SLOTS, PLOTS_PER_DISTRICT } from './sim/world.mjs';

export const STAGE = { width: 720, height: 1280 };

/** Where everything is. */
export const LAYOUT = (() => {
  const wards = [],
    plots = [];
  const cols = [24, 372],
    rows = [412, 624, 836],
    w = 324,
    h = 196;
  for (let i = 0; i < 6; i++) {
    const x = cols[i % 2],
      y = rows[Math.floor(i / 2)];
    wards.push({ x, y, w, h, label: { x: x + 8, y: y + 4, w: 120, h: 26 } });
    for (let p = 0; p < PLOTS_PER_DISTRICT; p++) {
      const px = x + 6 + (p % 4) * 79,
        py = y + 32 + Math.floor(p / 4) * 82;
      plots.push({ x: px, y: py, w: 75, h: 78 });
    }
  }
  const nodes = [];
  for (let i = 0; i < NODE_SLOTS; i++) {
    const row = Math.floor(i / 6),
      col = i % 6;
    nodes.push({ x: 22 + col * 114 + (row ? 50 : 0), y: 132 + row * 76, w: 84, h: 66 });
  }
  return {
    wards,
    plots,
    nodes,
    wall: { x: 0, y: 286, w: 720, h: 34 },
    gate: { x: 316, y: 270, w: 88, h: 60 },
    towers: [
      { x: 40, y: 262, w: 56, h: 66 },
      { x: 232, y: 262, w: 56, h: 66 },
      { x: 432, y: 262, w: 56, h: 66 },
      { x: 624, y: 262, w: 56, h: 66 }
    ],
    camp: { x: 120, y: 336, w: 110, h: 66 },
    yamen: { x: 280, y: 334, w: 160, h: 72 },
    granaryNote: null,
    river: { y: 1040, h: 76 },
    roads: { street: 360, rows: [618, 830, 1036] }
  };
})();

const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
/** What is at a point of the stage: { type, key } or null. */
export function hit(x, y) {
  let i = LAYOUT.plots.findIndex((r) => inside(r, x, y));
  if (i >= 0) return { type: 'plot', key: i };
  i = LAYOUT.wards.findIndex((w) => inside(w.label, x, y));
  if (i >= 0) return { type: 'ward', key: i };
  i = LAYOUT.nodes.findIndex((r) => inside(r, x, y));
  if (i >= 0) return { type: 'node', key: i };
  if (inside(LAYOUT.yamen, x, y)) return { type: 'yamen' };
  i = LAYOUT.towers.findIndex((r) => inside(r, x, y));
  if (i >= 0) return { type: 'tower', key: i };
  if (inside(LAYOUT.camp, x, y)) return { type: 'camp' };
  if (inside(LAYOUT.wall, x, y) || inside(LAYOUT.gate, x, y)) return { type: 'wall' };
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
  roofLight: '#89a0ab',
  wall: '#f7f1e2',
  wood: '#b78459',
  woodDark: '#8d5f3c',
  lacquer: '#c6584a',
  gold: '#e2b45a',
  water: '#8fc6c8',
  waterLight: '#bfe2dd',
  stone: '#b9b4a8',
  path: '#e9dcc0',
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
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
}
/** A soft watercolour wash: a few overlapping translucent blobs. */
function wash(g, x, y, w, h, color, seed = 1) {
  let a = seed * 9301 + 49297;
  const rnd = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 7; i++) blob(g, x + rnd() * w, y + rnd() * h, Math.max(w, h) * (0.25 + rnd() * 0.25), color, 0.12);
}

/** A roof with upturned eaves, from (x, y) its left eave, width w. */
function roof(g, x, y, w, h, color = C.roof, cap = null) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x - 4, y + h);
  g.quadraticCurveTo(x + w * 0.1, y + h * 0.7, x + w * 0.2, y);
  g.lineTo(x + w * 0.8, y);
  g.quadraticCurveTo(x + w * 0.9, y + h * 0.7, x + w + 4, y + h);
  g.quadraticCurveTo(x + w / 2, y + h * 0.82, x - 4, y + h);
  g.fill();
  g.strokeStyle = C.roofLight;
  g.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    g.beginPath();
    g.moveTo(x + w * (0.2 + i * 0.12), y + 2);
    g.lineTo(x + w * (0.15 + i * 0.14), y + h * 0.85);
    g.stroke();
  }
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
  for (let s = 0; s < storeys; s++) {
    const sw = w * (1 - s * 0.16),
      sx = cx - sw / 2,
      top = base - h * (s + 1) - s * 10;
    g.fillStyle = wallColor;
    g.fillRect(sx, top, sw, h);
    g.fillStyle = C.wood;
    g.fillRect(sx, top, 3, h);
    g.fillRect(sx + sw - 3, top, 3, h);
    if (door && s === 0) {
      g.fillStyle = C.woodDark;
      g.fillRect(cx - 5, base - h * 0.62, 10, h * 0.62);
    }
    roof(g, sx - 3, top - 13, sw + 6, 15, roofColor, cap);
  }
  if (lantern) {
    blob(g, x + 4, base - h + 6, 3.5, C.lacquer);
    blob(g, x + w - 4, base - h + 6, 3.5, C.lacquer);
  }
}
function tree(g, x, y, r, color, bloom = null) {
  g.fillStyle = C.woodDark;
  g.fillRect(x - 1.5, y, 3, r * 0.9);
  blob(g, x, y, r, color);
  blob(g, x - r * 0.5, y + r * 0.2, r * 0.7, color);
  blob(g, x + r * 0.5, y + r * 0.25, r * 0.7, color);
  if (bloom) for (let i = 0; i < 5; i++) blob(g, x + Math.cos(i * 1.3) * r * 0.7, y + Math.sin(i * 1.7) * r * 0.5, 2.2, bloom);
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

/**
 * Paint the county. `view` = { state, season, night (0–1), wardOpen(i), zoneName(z), labels: { ward(i) } , focus }.
 */
const FIELDS = new Set(['paddy', 'mulberry', 'teaGarden']);

export function paintCounty(g, view) {
  const { state, season, night = 0 } = view,
    pal = SEASON[season];
  // Paper and sky.
  g.fillStyle = C.paper;
  g.fillRect(0, 0, STAGE.width, STAGE.height);
  const sky = g.createLinearGradient(0, 100, 0, 300);
  sky.addColorStop(0, '#dfe9ea');
  sky.addColorStop(1, C.paper);
  g.fillStyle = sky;
  g.fillRect(0, 100, STAGE.width, 200);
  // Far hills in two washes.
  g.fillStyle = '#cbdad8';
  g.beginPath();
  g.moveTo(0, 210);
  for (let x = 0; x <= 720; x += 40) g.lineTo(x, 150 + Math.sin(x / 70) * 26 + Math.sin(x / 23) * 6);
  g.lineTo(720, 300);
  g.lineTo(0, 300);
  g.fill();
  g.fillStyle = pal.hill;
  g.beginPath();
  g.moveTo(0, 250);
  for (let x = 0; x <= 720; x += 30) g.lineTo(x, 210 + Math.sin(x / 55 + 1) * 22);
  g.lineTo(720, 300);
  g.lineTo(0, 300);
  g.fill();
  wash(g, 0, 120, 720, 180, pal.hill, 3);
  state.nodes.forEach((node, i) => drawNode(g, node.kind, node.level, node.found, LAYOUT.nodes[i], season));
  // The town ground.
  g.fillStyle = pal.grass;
  g.fillRect(0, 300, STAGE.width, LAYOUT.river.y - 300);
  wash(g, 0, 300, 720, 740, pal.grass2, 7);
  // Streets.
  g.fillStyle = C.path;
  g.fillRect(LAYOUT.roads.street - 12, 320, 24, LAYOUT.river.y - 320);
  for (const y of LAYOUT.roads.rows.slice(0, 2)) g.fillRect(0, y - 7, STAGE.width, 14);
  g.fillRect(0, 404, STAGE.width, 10);
  // The wall, the gate and the towers.
  const d = state.defence;
  g.fillStyle = d.wall > 0 ? '#c9c1b1' : 'rgba(160,150,130,0.35)';
  g.fillRect(0, LAYOUT.wall.y + 6, STAGE.width, d.wall > 0 ? 22 : 8);
  if (d.wall > 0) {
    g.fillStyle = '#b3ab9a';
    for (let x = 0; x < 720; x += 18) g.fillRect(x, LAYOUT.wall.y, 10, 8);
  }
  hall(g, 360, LAYOUT.gate.y + LAYOUT.gate.h - 4, 70, 26, { storeys: d.wall >= 10 ? 2 : 1, cap: pal.roofCap, roofColor: '#56676f', lantern: true });
  LAYOUT.towers.forEach((r, i) => {
    const level = d.tower[i];
    if (level === 0) {
      g.strokeStyle = 'rgba(76,90,92,0.35)';
      g.setLineDash([4, 4]);
      g.strokeRect(r.x + 8, r.y + 20, r.w - 16, r.h - 24);
      g.setLineDash([]);
      return;
    }
    g.fillStyle = C.wood;
    g.fillRect(r.x + 14, r.y + 24, 4, r.h - 26);
    g.fillRect(r.x + r.w - 18, r.y + 24, 4, r.h - 26);
    hall(g, r.x + r.w / 2, r.y + 34, 34, 14, { door: false, cap: pal.roofCap });
  });
  if (d.camp > 0) {
    for (let i = 0; i < 3; i++) {
      g.fillStyle = '#e8dcc0';
      g.beginPath();
      g.moveTo(LAYOUT.camp.x + 10 + i * 32, LAYOUT.camp.y + 56);
      g.lineTo(LAYOUT.camp.x + 24 + i * 32, LAYOUT.camp.y + 30);
      g.lineTo(LAYOUT.camp.x + 38 + i * 32, LAYOUT.camp.y + 56);
      g.fill();
    }
    g.fillStyle = C.lacquer;
    g.fillRect(LAYOUT.camp.x + 100, LAYOUT.camp.y + 14, 3, 40);
    g.fillRect(LAYOUT.camp.x + 103, LAYOUT.camp.y + 14, 12, 9);
  }
  // The yamen.
  const y = LAYOUT.yamen;
  g.fillStyle = 'rgba(60,70,60,0.15)';
  g.fillRect(y.x + 6, y.y + y.h - 6, y.w - 12, 8);
  g.fillStyle = C.wall;
  g.fillRect(y.x + 4, y.y + 30, y.w - 8, y.h - 30);
  hall(g, y.x + y.w / 2, y.y + y.h, 96, 26, { storeys: state.rank >= 3 ? 2 : 1, cap: pal.roofCap, roofColor: '#53646d', lantern: true });
  hall(g, y.x + 20, y.y + y.h, 30, 18, { cap: pal.roofCap });
  hall(g, y.x + y.w - 20, y.y + y.h, 30, 18, { cap: pal.roofCap });
  g.fillStyle = C.lacquer;
  g.fillRect(y.x + y.w / 2 - 14, y.y + 10 - (state.rank >= 3 ? 24 : 0), 28, 12);
  // Wards.
  LAYOUT.wards.forEach((ward, i) => {
    const open = view.wardOpen(i),
      zone = state.districts[i].zone;
    if (!open) {
      g.fillStyle = 'rgba(233,238,240,0.75)';
      round(g, ward.x, ward.y, ward.w, ward.h, 14);
      g.fill();
      wash(g, ward.x, ward.y, ward.w, ward.h, '#ffffff', i + 2);
    } else {
      g.fillStyle = zone ? C.zone[zone] : 'rgba(255,255,255,0.25)';
      g.globalAlpha = zone ? 0.75 : 1;
      round(g, ward.x, ward.y, ward.w, ward.h, 14);
      g.fill();
      g.globalAlpha = 1;
      g.strokeStyle = zone ? 'rgba(140,110,70,0.35)' : 'rgba(76,90,92,0.45)';
      g.setLineDash(zone ? [] : [6, 5]);
      g.lineWidth = 1.5;
      round(g, ward.x, ward.y, ward.w, ward.h, 14);
      g.stroke();
      g.setLineDash([]);
    }
    // The ward's name on a little board.
    g.fillStyle = open ? (zone ? '#fbf6ea' : '#fff7d6') : 'rgba(251,246,234,0.7)';
    round(g, ward.label.x, ward.label.y, ward.label.w, ward.label.h, 8);
    g.fill();
    g.strokeStyle = 'rgba(140,110,70,0.5)';
    g.stroke();
    g.fillStyle = C.ink;
    g.font = '600 14px "Noto Serif SC", "Songti SC", serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(view.labels.ward(i), ward.label.x + 8, ward.label.y + ward.label.h / 2 + 1);
    if (!open) return;
    for (let p = 0; p < PLOTS_PER_DISTRICT; p++) {
      const index = i * PLOTS_PER_DISTRICT + p,
        plot = state.plots[index],
        r = LAYOUT.plots[index];
      if (!plot.kind) {
        g.strokeStyle = 'rgba(120,100,70,0.28)';
        g.setLineDash([3, 4]);
        round(g, r.x + 4, r.y + 6, r.w - 8, r.h - 10, 8);
        g.stroke();
        g.setLineDash([]);
        continue;
      }
      drawBuilding(g, plot.kind, plot.level, r, season);
      if (plot.level === 0) {
        // A new building: a veil and a scaffold over the whole plot.
        g.fillStyle = 'rgba(244,239,225,0.55)';
        round(g, r.x + 4, r.y + 6, r.w - 8, r.h - 10, 8);
        g.fill();
        g.strokeStyle = C.woodDark;
        g.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
          g.beginPath();
          g.moveTo(r.x + 14 + k * 22, r.y + r.h - 10);
          g.lineTo(r.x + 14 + k * 22, r.y + 22);
          g.stroke();
        }
        g.beginPath();
        g.moveTo(r.x + 10, r.y + 40);
        g.lineTo(r.x + r.w - 10, r.y + 40);
        g.stroke();
        g.lineWidth = 1;
      } else if (view.building?.has(index)) {
        // Being raised a level: the building stays in sight, with a bamboo frame and a red pennant at its side.
        const x = r.x + r.w - 14,
          top = r.y + 18,
          foot = r.y + r.h - 10;
        g.strokeStyle = C.woodDark;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(x, foot);
        g.lineTo(x, top);
        g.moveTo(x + 7, foot);
        g.lineTo(x + 7, top + 8);
        for (let y = top + 12; y < foot; y += 12) {
          g.moveTo(x - 1, y);
          g.lineTo(x + 8, y);
        }
        g.stroke();
        g.lineWidth = 1;
        g.fillStyle = '#c6584a';
        g.beginPath();
        g.moveTo(x, top);
        g.lineTo(x + 12, top + 4);
        g.lineTo(x, top + 8);
        g.closePath();
        g.fill();
      }
    }
  });
  // Trees along the street.
  for (let i = 0; i < 6; i++) tree(g, 360, 440 + i * 100, 6, pal.tree, season === 0 ? pal.bloom : null);
  // The creek, a bridge and the far bank.
  const river = LAYOUT.river;
  g.fillStyle = C.water;
  g.beginPath();
  g.moveTo(0, river.y);
  for (let x = 0; x <= 720; x += 20) g.lineTo(x, river.y + Math.sin(x / 60) * 6);
  g.lineTo(720, river.y + river.h);
  for (let x = 720; x >= 0; x -= 20) g.lineTo(x, river.y + river.h + Math.sin(x / 50 + 2) * 5);
  g.fill();
  g.strokeStyle = C.waterLight;
  g.lineWidth = 2;
  for (let k = 0; k < 9; k++) {
    const x = 30 + k * 78,
      yy = river.y + 22 + (k % 3) * 16;
    g.beginPath();
    g.moveTo(x, yy);
    g.quadraticCurveTo(x + 14, yy - 5, x + 28, yy);
    g.stroke();
  }
  g.lineWidth = 1;
  g.fillStyle = '#c9b48f';
  g.beginPath();
  g.moveTo(330, river.y - 4);
  g.quadraticCurveTo(360, river.y + 24, 390, river.y - 4);
  g.lineTo(390, river.y + river.h + 6);
  g.quadraticCurveTo(360, river.y + river.h - 18, 330, river.y + river.h + 6);
  g.fill();
  g.fillStyle = pal.grass2;
  g.fillRect(0, river.y + river.h, 720, 1180 - river.y - river.h);
  for (let i = 0; i < 9; i++) tree(g, 30 + i * 82, river.y + river.h + 26, 9, pal.tree, season === 0 ? pal.bloom : null);
  // Night: a blue wash, and lantern light at every building people live or work in (not over the fields).
  if (night > 0) {
    g.fillStyle = `rgba(32, 44, 84, ${0.48 * night})`;
    g.fillRect(0, 100, STAGE.width, 1080);
    g.globalCompositeOperation = 'lighter';
    const glow = (x, yy, r) => {
      const gr = g.createRadialGradient(x, yy, 0, x, yy, r);
      gr.addColorStop(0, `rgba(255, 196, 110, ${0.55 * night})`);
      gr.addColorStop(1, 'rgba(255, 196, 110, 0)');
      g.fillStyle = gr;
      g.fillRect(x - r, yy - r, r * 2, r * 2);
    };
    state.plots.forEach((plot, i) => {
      if (!plot.kind || plot.level === 0 || FIELDS.has(plot.kind)) return;
      const r = LAYOUT.plots[i];
      glow(r.x + r.w / 2, r.y + r.h - 22, 26);
    });
    glow(360, LAYOUT.yamen.y + 40, 60);
    glow(360, LAYOUT.gate.y + 30, 40);
    g.globalCompositeOperation = 'source-over';
  }
}
