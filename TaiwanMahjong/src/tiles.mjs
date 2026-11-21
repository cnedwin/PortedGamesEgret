// 牌面图集：42 种牌面、牌背和选中描边，全部在页面的 2D canvas 上一次画好，再交给引擎做成一张贴图，每张牌是这张
// 贴图上的一块（Bitmap 的 sourceRect）。牌是象牙白面、翠绿底的样子；萬子用中文数字加红「萬」，筒子是同心圆，條子
// 是竹节，一條画成一只鸟；字牌和花牌用宋体字。
// The tile atlas: the 42 faces, the back and the selection outline, drawn once on a page 2D canvas and handed to the
// engine as one texture, each tile a rectangle of it (a Bitmap's sourceRect). Ivory faces on a jade base; the
// characters in Chinese numerals with a red 萬, dots as rings, bamboo as jointed sticks with a bird for the one, and the
// honours and flowers in a serif face.

/** One cell of the atlas, in its pixels; the tile drawn inside it leaves a margin for the shadow. */
export const CELL = { width: 128, height: 172 };
export const TILE = { width: 120, height: 164, face: 146 };
const COLUMNS = 8;
/** Kinds 0–41 are faces; then the back. */
export const BACK = 42;
const FRAMES = 43;

const FONT = '"Noto Serif TC", "Noto Serif CJK TC", "Songti TC", "PMingLiU", "MingLiU", "Noto Serif SC", "Songti SC", serif';
const INK = '#212739',
  RED = '#ad222c',
  GREEN = '#176445',
  BLUE = '#23547e';

const NUMERALS = ['一', '二', '三', '四', '伍', '六', '七', '八', '九'];
const HONOURS = ['東', '南', '西', '北', '中', '發', ''];
const FLOWERS = ['春', '夏', '秋', '冬', '梅', '蘭', '竹', '菊'];

/** Where kind `kind` sits in the atlas. */
export function frameOf(kind) {
  return { x: (kind % COLUMNS) * CELL.width, y: Math.floor(kind / COLUMNS) * CELL.height, width: CELL.width, height: CELL.height };
}

/** The atlas as a canvas. */
export function paintAtlas(make = () => document.createElement('canvas')) {
  const canvas = make();
  canvas.width = COLUMNS * CELL.width;
  canvas.height = Math.ceil(FRAMES / COLUMNS) * CELL.height;
  // The single atlas is read back once for Egret. Keep that staging canvas CPU-backed.
  const g = canvas.getContext('2d', { willReadFrequently: true });
  for (let kind = 0; kind < FRAMES; kind++) {
    const { x, y } = frameOf(kind);
    g.save();
    g.translate(x + (CELL.width - TILE.width) / 2, y + 2);
    if (kind === BACK) paintBack(g);
    else {
      paintBody(g);
      paintFace(g, kind);
    }
    g.restore();
  }
  return canvas;
}

function rounded(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** A lacquered heel under the ceramic cap, both lit from the upper left. */
function paintHeel(g, w, h) {
  g.fillStyle = 'rgba(4,14,23,0.36)';
  rounded(g, 3, 6, w - 1, h - 2, 15);
  g.fill();
  g.fillStyle = 'rgba(5,13,20,0.52)';
  rounded(g, 2, 4, w, h - 2, 15);
  g.fill();
  const heel = g.createLinearGradient(0, h - 27, w * 0.24, h);
  heel.addColorStop(0, '#347d68');
  heel.addColorStop(0.38, '#276257');
  heel.addColorStop(0.75, '#173d42');
  heel.addColorStop(1, '#0b252c');
  g.fillStyle = heel;
  rounded(g, 1, 1, w - 1, h - 2, 14);
  g.fill();
  const bounce = g.createLinearGradient(7, 0, w - 10, 0);
  bounce.addColorStop(0, 'rgba(153,219,187,0.34)');
  bounce.addColorStop(0.48, 'rgba(153,219,187,0.14)');
  bounce.addColorStop(1, 'rgba(153,219,187,0)');
  g.fillStyle = bounce;
  rounded(g, 9, h - 9, w - 18, 3, 1.5);
  g.fill();
}

/** The glaze has its own bevel and a slender copper joint above the jade heel. */
function paintBody(g) {
  const { width: w, height: h, face } = TILE;
  paintHeel(g, w, h);
  const seam = g.createLinearGradient(3, 0, w - 3, 0);
  seam.addColorStop(0, '#b37856');
  seam.addColorStop(0.29, '#e5b782');
  seam.addColorStop(1, '#795844');
  g.fillStyle = seam;
  rounded(g, 4, face - 4, w - 7, 9, 4);
  g.fill();

  // The lower and right edges show the thickness of the ivory above the seam.
  const edge = g.createLinearGradient(5, 9, w, face);
  edge.addColorStop(0, '#fffef8');
  edge.addColorStop(0.5, '#e9d7ba');
  edge.addColorStop(0.82, '#dac1a0');
  edge.addColorStop(1, '#b89b77');
  g.fillStyle = edge;
  rounded(g, 0, 0, w, face + 2, 15);
  g.fill();

  const faceLight = g.createLinearGradient(15, 1, w * 0.7, face - 7);
  faceLight.addColorStop(0, '#fffef7');
  faceLight.addColorStop(0.36, '#faf4e5');
  faceLight.addColorStop(0.76, '#f4ead5');
  faceLight.addColorStop(1, '#e7d6b7');
  g.fillStyle = faceLight;
  rounded(g, 1, 1, w - 5, face - 8, 14);
  g.fill();
  g.save();
  g.clip();
  const glaze = g.createLinearGradient(10, 4, w * 0.42, 53);
  glaze.addColorStop(0, 'rgba(255,255,255,0.66)');
  glaze.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glaze;
  g.fillRect(0, 0, w, 59);
  g.restore();

  g.strokeStyle = 'rgba(255,255,250,0.84)';
  g.lineWidth = 1.5;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(5, 78);
  g.lineTo(5, 16);
  g.quadraticCurveTo(5, 5, 17, 5);
  g.lineTo(w * 0.64, 5);
  g.stroke();
  g.strokeStyle = 'rgba(115,75,46,0.28)';
  g.beginPath();
  g.moveTo(18, face - 6);
  g.lineTo(w - 18, face - 6);
  g.quadraticCurveTo(w - 4, face - 6, w - 4, face - 20);
  g.stroke();
}

function paintBack(g) {
  const { width: w, height: h } = TILE;
  paintHeel(g, w, h);
  const bevel = g.createLinearGradient(3, 0, w, h - 7);
  bevel.addColorStop(0, '#7eae93');
  bevel.addColorStop(0.66, '#386657');
  bevel.addColorStop(1, '#183641');
  g.fillStyle = bevel;
  rounded(g, 0, 0, w, h - 7, 14);
  g.fill();
  const jade = g.createLinearGradient(0, 0, w, h);
  jade.addColorStop(0, '#408f83');
  jade.addColorStop(0.52, '#1d5c5d');
  jade.addColorStop(1, '#133946');
  g.fillStyle = jade;
  rounded(g, 2, 2, w - 7, h - 19, 13);
  g.fill();

  g.strokeStyle = '#c68e65';
  g.lineWidth = 2.5;
  rounded(g, 7, 7, w - 14, h - 27, 10);
  g.stroke();
  g.strokeStyle = 'rgba(178,211,167,0.49)';
  g.lineWidth = 1.5;
  rounded(g, 13, 13, w - 26, h - 39, 7);
  g.stroke();
  // The back is symmetric so a rotated, concealed tile reads as the same design.
  g.save();
  g.translate(w / 2, (h - 12) / 2);
  g.strokeStyle = '#d3a177';
  g.lineWidth = 2.8;
  g.beginPath();
  g.arc(0, 0, 25, 0, 2 * Math.PI);
  g.stroke();
  for (let i = 0; i < 8; i++) {
    g.rotate(Math.PI / 4);
    g.beginPath();
    g.moveTo(0, -8);
    g.quadraticCurveTo(7, -19, 0, -24);
    g.quadraticCurveTo(-7, -19, 0, -8);
    g.stroke();
  }
  g.fillStyle = '#f0ca8e';
  g.beginPath();
  g.arc(0, 0, 4, 0, 2 * Math.PI);
  g.fill();
  g.restore();
}

function text(g, words, x, y, size, color, weight = 700) {
  g.font = `${weight} ${size}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,251,235,0.63)';
  g.fillText(words, x + 1, y + 1.7);
  g.fillStyle = color;
  g.fillText(words, x, y);
}

function paintFace(g, kind) {
  const cx = TILE.width / 2;
  if (kind < 9) {
    text(g, NUMERALS[kind], cx, 44, 50, INK);
    text(g, '萬', cx, 104, 58, RED);
  } else if (kind < 18) dots(g, kind - 9);
  else if (kind < 27) bamboo(g, kind - 18);
  else if (kind < 34) {
    const honour = kind - 27;
    if (honour === 6) {
      g.strokeStyle = BLUE;
      g.lineWidth = 6;
      rounded(g, 22, 22, TILE.width - 44, TILE.face - 44, 6);
      g.stroke();
      g.lineWidth = 2;
      rounded(g, 31, 31, TILE.width - 62, TILE.face - 62, 3);
      g.stroke();
    } else text(g, HONOURS[honour], cx, TILE.face / 2 + 2, 82, honour === 4 ? RED : honour === 5 ? GREEN : INK, 800);
  } else {
    const flower = kind - 34,
      color = flower < 4 ? [GREEN, RED, '#b86b14', BLUE][flower] : [RED, '#7b3fa0', GREEN, '#b8860b'][flower - 4];
    text(g, String((flower % 4) + 1), 20, 24, 24, color);
    sprig(g, flower, color);
    text(g, FLOWERS[flower], cx + 8, 96, 58, color, 800);
  }
}

/** A small motif above a flower's name. */
function sprig(g, flower, color) {
  g.save();
  g.translate(TILE.width / 2 + 16, 40);
  g.fillStyle = color;
  g.globalAlpha = 0.85;
  const petals = flower < 4 ? 6 : 5;
  for (let i = 0; i < petals; i++) {
    g.rotate((Math.PI * 2) / petals);
    g.beginPath();
    g.ellipse(0, -11, 5, 9, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#f3d36b';
  g.beginPath();
  g.arc(0, 0, 5, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function ring(g, x, y, r, color) {
  // The narrow engraved rim helps low-scale river tiles hold their edges.
  g.fillStyle = '#4b473c';
  g.beginPath();
  g.arc(x, y + 0.65, r + 0.75, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fbf0d9';
  g.beginPath();
  g.arc(x, y, r * 0.68, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r * 0.42, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath();
  g.arc(x - r * 0.12, y - r * 0.12, r * 0.13, 0, Math.PI * 2);
  g.fill();
}

const DOT_LAYOUTS = [
  [[0.5, 0.5]],
  [[0.5, 0.25], [0.5, 0.75]],
  [[0.25, 0.2], [0.5, 0.5], [0.75, 0.8]],
  [[0.28, 0.25], [0.72, 0.25], [0.28, 0.75], [0.72, 0.75]],
  [[0.26, 0.22], [0.74, 0.22], [0.5, 0.5], [0.26, 0.78], [0.74, 0.78]],
  [[0.3, 0.18], [0.7, 0.18], [0.3, 0.55], [0.7, 0.55], [0.3, 0.84], [0.7, 0.84]],
  [[0.22, 0.12], [0.5, 0.24], [0.78, 0.36], [0.3, 0.6], [0.7, 0.6], [0.3, 0.86], [0.7, 0.86]],
  [[0.3, 0.13], [0.7, 0.13], [0.3, 0.38], [0.7, 0.38], [0.3, 0.63], [0.7, 0.63], [0.3, 0.88], [0.7, 0.88]],
  [[0.2, 0.18], [0.5, 0.18], [0.8, 0.18], [0.2, 0.5], [0.5, 0.5], [0.8, 0.5], [0.2, 0.82], [0.5, 0.82], [0.8, 0.82]]
];
const DOT_COLORS = [
  [RED],
  [GREEN, BLUE],
  [BLUE, RED, GREEN],
  [BLUE, GREEN, GREEN, BLUE],
  [BLUE, GREEN, RED, GREEN, BLUE],
  [GREEN, GREEN, RED, RED, RED, RED],
  [GREEN, GREEN, GREEN, RED, RED, RED, RED],
  [BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE],
  [BLUE, BLUE, BLUE, RED, RED, RED, GREEN, GREEN, GREEN]
];

function dots(g, rank) {
  const left = 12,
    top = 12,
    w = TILE.width - 24,
    h = TILE.face - 24;
  if (rank === 0) {
    ring(g, TILE.width / 2, TILE.face / 2, 40, GREEN);
    g.strokeStyle = RED;
    g.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.arc(TILE.width / 2 + Math.cos(a) * 33, TILE.face / 2 + Math.sin(a) * 33, 3, 0, Math.PI * 2);
      g.stroke();
    }
    ring(g, TILE.width / 2, TILE.face / 2, 14, RED);
    return;
  }
  const r = [0, 22, 19, 19, 17, 15, 14, 13, 13][rank];
  DOT_LAYOUTS[rank].forEach(([fx, fy], i) => ring(g, left + fx * w, top + fy * h, r, DOT_COLORS[rank][i]));
}

function stick(g, x, y, height, color, angle = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  const w = 13;
  g.fillStyle = 'rgba(62,49,35,0.56)';
  rounded(g, -w / 2 + 0.6, -height / 2 + 1.1, w, height, 5);
  g.fill();
  g.fillStyle = color;
  rounded(g, -w / 2, -height / 2, w, height, 5);
  g.fill();
  g.fillStyle = 'rgba(251,240,210,0.46)';
  g.fillRect(-w / 2 + 2, -height / 2 + 3, 2.5, height - 6);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (const at of [-0.5, 0, 0.5]) g.fillRect(-w / 2 - 1, at * (height - 8) - 1.5, w + 2, 3);
  g.restore();
}

const BAMBOO_LAYOUTS = [
  null,
  [[0.5, 0.27], [0.5, 0.73]],
  [[0.5, 0.27], [0.3, 0.73], [0.7, 0.73]],
  [[0.32, 0.27], [0.68, 0.27], [0.32, 0.73], [0.68, 0.73]],
  [[0.26, 0.27], [0.74, 0.27], [0.5, 0.5], [0.26, 0.73], [0.74, 0.73]],
  [[0.22, 0.27], [0.5, 0.27], [0.78, 0.27], [0.22, 0.73], [0.5, 0.73], [0.78, 0.73]],
  [[0.5, 0.16], [0.22, 0.5], [0.5, 0.5], [0.78, 0.5], [0.22, 0.84], [0.5, 0.84], [0.78, 0.84]],
  [[0.2, 0.27], [0.4, 0.27], [0.6, 0.27], [0.8, 0.27], [0.2, 0.73], [0.4, 0.73], [0.6, 0.73], [0.8, 0.73]],
  [[0.22, 0.16], [0.5, 0.16], [0.78, 0.16], [0.22, 0.5], [0.5, 0.5], [0.78, 0.5], [0.22, 0.84], [0.5, 0.84], [0.78, 0.84]]
];

function bamboo(g, rank) {
  if (rank === 0) return bird(g);
  const left = 14,
    top = 12,
    w = TILE.width - 28,
    h = TILE.face - 24,
    tall = rank >= 6 ? 34 : 50;
  BAMBOO_LAYOUTS[rank].forEach(([fx, fy], i) => {
    const red = (rank === 4 && i === 2) || (rank === 6 && i === 0) || (rank === 8 && fx === 0.5);
    const tilt = rank === 7 ? (i % 4 === 1 ? 0.35 : i % 4 === 2 ? -0.35 : 0) * (i < 4 ? 1 : -1) : 0;
    stick(g, left + fx * w, top + fy * h, tall, red ? RED : GREEN, tilt);
  });
}

/** The one of bamboo: a Taiwan blue magpie on a branch. */
function bird(g) {
  g.save();
  g.translate(TILE.width / 2, TILE.face / 2);

  g.strokeStyle = '#926143';
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-40, 42);
  g.quadraticCurveTo(-3, 32, 37, 34);
  g.stroke();

  g.fillStyle = '#294d78';
  g.beginPath();
  g.moveTo(-11, 0);
  g.quadraticCurveTo(-27, 18, -45, 51);
  g.quadraticCurveTo(-43, 59, -37, 58);
  g.quadraticCurveTo(-20, 48, 1, 16);
  g.closePath();
  g.fill();
  g.strokeStyle = '#f1e6c9';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(-41, 51);
  g.lineTo(-25, 36);
  g.stroke();

  g.fillStyle = '#3b7199';
  g.beginPath();
  g.ellipse(5, -1, 27, 18, -0.52, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f8ebcf';
  g.beginPath();
  g.ellipse(-1, 3, 12, 4.5, -0.54, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = INK;
  g.beginPath();
  g.arc(25, -23, 13, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffc96f';
  g.beginPath();
  g.arc(28, -26, 3.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#c43c2d';
  g.beginPath();
  g.moveTo(35, -25);
  g.lineTo(48, -21);
  g.lineTo(35, -17);
  g.closePath();
  g.fill();
  g.strokeStyle = '#c43c2d';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(5, 14);
  g.lineTo(13, 33);
  g.lineTo(20, 34);
  g.stroke();
  g.restore();
}
