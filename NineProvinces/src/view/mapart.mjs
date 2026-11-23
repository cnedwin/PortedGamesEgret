// 地图的画：在一张和地图一样大的画布上画一次——宣纸底、海与浪纹、高原沙漠草原的设色、山脉的皴笔、江河湖泊、州名，
// 道路与水路、城关津渡的图标；另有一张小画布画各势力的疆域（每块地归最近的城，按城主着色，边界加深），城池易手时
// 重画。画面每次移动时，从这两张画布里截出看得见的一块，再写上地名。
// The art of the map: painted once on a canvas the size of the map — paper, the sea and its waves, the colours of
// plateau, desert and steppe, brushed mountain ranges, rivers and lakes, the names of the provinces, roads and water
// lanes, and the marks of cities, passes and ferries; and a smaller canvas of the powers' lands (each patch of ground
// goes to its nearest place and takes its lord's colour, darker at the borders), painted again when places change
// hands. Each time the view moves, the part in sight is cut from the two and the names are written over it.
import { COAST, ISLANDS, LAKES, PROVINCE_LABELS, RANGES, REGIONS, RIVERS } from '../data/geography.mjs';
import { LINKS, MAP, NODES, PROVINCES, project } from '../data/map.mjs';
import { territoryPixels } from './territory.mjs';

export const SERIF = '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", "Noto Sans CJK SC", serif';
export const KAI = '"KaiTi", "STKaiti", "Kaiti SC", "Noto Serif SC", "Noto Sans CJK SC", serif';

const P = ([lon, lat]) => project(lon, lat);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A path through points, smoothed with quadratic curves. */
function smooth(g, points, close = false, join = false) {
  const pts = points.map(P);
  if (join) g.lineTo(pts[0].x, pts[0].y);
  else g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2,
      my = (pts[i].y + pts[i + 1].y) / 2;
    g.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  g.lineTo(last.x, last.y);
  if (close) g.closePath();
}

/** The land as one closed shape: west of the coast, inside the map. */
function landPath(g) {
  g.beginPath();
  const pts = COAST.map(P);
  g.moveTo(0, 0);
  g.lineTo(pts[0].x, 0);
  smooth(g, COAST, false, true);
  g.lineTo(pts[pts.length - 1].x, MAP.height);
  g.lineTo(0, MAP.height);
  g.closePath();
}

/** Paint the base map on a canvas of the map's size (scaled by `scale`). Returns the canvas and a land mask test. */
export function paintBase(scale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(MAP.width * scale);
  canvas.height = Math.round(MAP.height * scale);
  const g = canvas.getContext('2d');
  g.scale(scale, scale);
  const random = rng(184);
  // The sea.
  const sea = g.createLinearGradient(MAP.width, 0, MAP.width * 0.6, MAP.height);
  sea.addColorStop(0, '#9fb7b3');
  sea.addColorStop(1, '#8eaba8');
  g.fillStyle = sea;
  g.fillRect(0, 0, MAP.width, MAP.height);
  // Waves: small arcs in rows.
  g.strokeStyle = 'rgba(240, 245, 236, 0.35)';
  g.lineWidth = 1.4;
  for (let y = 20; y < MAP.height; y += 34)
    for (let x = (y / 34) % 2 ? 0 : 28; x < MAP.width; x += 56) {
      g.beginPath();
      g.arc(x, y, 9, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    }
  // The land: paper, with a soft shadow along the coast.
  g.save();
  g.shadowColor = 'rgba(60, 70, 60, 0.35)';
  g.shadowBlur = 18;
  landPath(g);
  g.fillStyle = '#e3d6b5';
  g.fill();
  for (const island of ISLANDS) {
    g.beginPath();
    smooth(g, island, true);
    g.fill();
  }
  g.restore();
  // The coastline in ink.
  g.strokeStyle = 'rgba(70, 64, 50, 0.65)';
  g.lineWidth = 2.2;
  g.beginPath();
  smooth(g, COAST);
  g.stroke();
  for (const island of ISLANDS) {
    g.beginPath();
    smooth(g, island, true);
    g.stroke();
  }
  // Everything after this stays on the land.
  g.save();
  landPath(g);
  g.clip();
  // Grain of the paper and soft blotches of colour, greener in the south and along the rivers.
  for (let i = 0; i < 5200; i++) {
    const x = random() * MAP.width,
      y = random() * MAP.height,
      r = 14 + random() * 60;
    const south = y / MAP.height;
    g.fillStyle = `rgba(${Math.round(120 - south * 30)}, ${Math.round(130 + south * 20)}, ${Math.round(80 + south * 10)}, ${0.012 + random() * 0.018})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  for (const region of REGIONS) {
    g.beginPath();
    smooth(g, region.line, true);
    g.fillStyle = { plateau: 'rgba(150, 120, 84, 0.16)', desert: 'rgba(214, 186, 128, 0.38)', steppe: 'rgba(170, 176, 104, 0.18)' }[region.kind];
    g.fill();
    if (region.kind === 'desert') {
      g.save();
      g.clip();
      g.fillStyle = 'rgba(150, 120, 70, 0.28)';
      for (let i = 0; i < 1600; i++) g.fillRect(random() * MAP.width, random() * MAP.height * 0.45, 1.6, 1.6);
      g.restore();
    }
  }
  // Fields of the plains: faint hatching near the great rivers.
  // Mountains: ridges of brushed peaks, darker on their east faces.
  for (const range of RANGES) paintRange(g, range, random);
  // Rivers and lakes.
  for (const river of RIVERS) {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(80, 110, 120, 0.9)';
    g.lineWidth = 1.2 + river.width * 2.1;
    g.beginPath();
    smooth(g, river.line);
    g.stroke();
    g.strokeStyle = 'rgba(176, 204, 206, 0.9)';
    g.lineWidth = Math.max(0.8, river.width * 1.2);
    g.beginPath();
    smooth(g, river.line);
    g.stroke();
  }
  for (const lake of LAKES) {
    g.beginPath();
    smooth(g, lake.line, true);
    g.fillStyle = '#a3bfbd';
    g.fill();
    g.strokeStyle = 'rgba(80, 110, 120, 0.8)';
    g.lineWidth = 1.6;
    g.stroke();
  }
  g.restore();
  // Roads and water lanes between places.
  for (const link of LINKS) {
    const a = NODES[link.a],
      b = NODES[link.b];
    g.beginPath();
    g.moveTo(a.x, a.y);
    // A slight bend, so roads do not look ruled.
    const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.06,
      my = (a.y + b.y) / 2 + (b.x - a.x) * 0.06;
    g.quadraticCurveTo(mx, my, b.x, b.y);
    if (link.kind === 'sea') {
      g.setLineDash([3, 9]);
      g.strokeStyle = 'rgba(50, 80, 100, 0.55)';
      g.lineWidth = 2;
    } else if (link.kind === 'river') {
      g.setLineDash([10, 6]);
      g.strokeStyle = 'rgba(52, 92, 108, 0.55)';
      g.lineWidth = 2.2;
    } else {
      g.setLineDash([8, 5]);
      g.strokeStyle = 'rgba(110, 76, 44, 0.55)';
      g.lineWidth = 2.4;
    }
    g.stroke();
  }
  g.setLineDash([]);
  // The names of the provinces, large and faint.
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const [prov, at] of Object.entries(PROVINCE_LABELS)) {
    const p = P(at);
    g.font = `700 64px ${KAI}`;
    g.fillStyle = 'rgba(80, 60, 40, 0.16)';
    const name = PROVINCES[prov][0];
    const w = 72;
    [...name].forEach((ch, i) => g.fillText(ch, p.x + (i - (name.length - 1) / 2) * w, p.y));
  }
  return canvas;
}

function paintRange(g, range, random) {
  const pts = range.line.map(P);
  // A soft ink wash under the ridge, so a range reads as one mass: wide faint strokes inside narrower ones.
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let k = 4; k >= 1; k--) {
    g.strokeStyle = `rgba(96, 84, 60, ${0.035 + range.height * 0.012})`;
    g.lineWidth = 9 * range.height * k;
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
    g.stroke();
  }
  g.restore();
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i],
      b = pts[i + 1],
      len = Math.hypot(b.x - a.x, b.y - a.y);
    const step = 16 + 6 / range.height;
    for (let d = 0; d < len; d += step * (0.6 + random() * 0.6)) {
      const t = d / len;
      const side = (random() - 0.5) * 34 * range.height;
      const nx = -(b.y - a.y) / len,
        ny = (b.x - a.x) / len;
      const x = a.x + (b.x - a.x) * t + nx * side,
        y = a.y + (b.y - a.y) * t + ny * side;
      const h = (12 + random() * 16) * (0.6 + range.height * 0.35) * (1 - Math.abs(side) / (70 * range.height));
      if (h < 5) continue;
      peak(g, x, y, h, random);
    }
  }
}

/** One brushed peak: a lit west face, a shaded east face, an ink outline. */
function peak(g, x, y, h, random) {
  const w = h * (0.8 + random() * 0.5),
      top = x + (random() - 0.5) * w * 0.3;
  g.beginPath();
  g.moveTo(x - w, y);
  g.quadraticCurveTo(top - w * 0.3, y - h * 0.6, top, y - h);
  g.quadraticCurveTo(top + w * 0.35, y - h * 0.55, x + w, y);
  g.closePath();
  g.fillStyle = 'rgba(150, 132, 96, 0.55)';
  g.fill();
  g.beginPath();
  g.moveTo(top, y - h);
  g.quadraticCurveTo(top + w * 0.35, y - h * 0.55, x + w, y);
  g.lineTo(top + w * 0.15, y);
  g.closePath();
  g.fillStyle = 'rgba(92, 84, 62, 0.45)';
  g.fill();
  g.strokeStyle = 'rgba(58, 50, 36, 0.7)';
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(x - w, y);
  g.quadraticCurveTo(top - w * 0.3, y - h * 0.6, top, y - h);
  g.quadraticCurveTo(top + w * 0.35, y - h * 0.55, x + w, y);
  g.stroke();
}

/** Paint the same territorial parcels shared by the minimap and the 3D map. */
export function paintLands(lands, owners, colourOf) {
  const { cols, rows } = lands;
  const canvas = lands.canvas ?? (lands.canvas = Object.assign(document.createElement('canvas'), { width: cols, height: rows }));
  const pixels = territoryPixels(lands, owners, colourOf);
  canvas.getContext('2d').putImageData(new ImageData(pixels, cols, rows), 0, 0);
  return canvas;
}
