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
const INK = '#1d2a44',
  RED = '#b8261f',
  GREEN = '#1f7a4a',
  BLUE = '#1f4f9a';

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
  const g = canvas.getContext('2d');
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

/** The tile's body: a jade base under an ivory face. */
function paintBody(g) {
  const { width: w, height: h, face } = TILE;
  g.fillStyle = 'rgba(0,0,0,0.28)';
  rounded(g, 3, 5, w - 2, h - 2, 14);
  g.fill();
  const jade = g.createLinearGradient(0, face - 20, 0, h);
  jade.addColorStop(0, '#3f9a6c');
  jade.addColorStop(1, '#1d5f3f');
  g.fillStyle = jade;
  rounded(g, 0, 0, w, h - 2, 14);
  g.fill();
  const ivory = g.createLinearGradient(0, 0, 0, face);
  ivory.addColorStop(0, '#fffdf6');
  ivory.addColorStop(0.7, '#f6efdc');
  ivory.addColorStop(1, '#e8dcbf');
  g.fillStyle = ivory;
  rounded(g, 0, 0, w, face, 14);
  g.fill();
  g.strokeStyle = 'rgba(120,98,60,0.35)';
  g.lineWidth = 1.5;
  rounded(g, 1, 1, w - 2, face - 2, 13);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.7)';
  rounded(g, 6, 4, w - 12, 8, 4);
  g.fill();
}

function paintBack(g) {
  const { width: w, height: h } = TILE;
  g.fillStyle = 'rgba(0,0,0,0.28)';
  rounded(g, 3, 5, w - 2, h - 2, 14);
  g.fill();
  const jade = g.createLinearGradient(0, 0, w, h);
  jade.addColorStop(0, '#47a676');
  jade.addColorStop(1, '#1b5a3b');
  g.fillStyle = jade;
  rounded(g, 0, 0, w, h - 2, 14);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineWidth = 3;
  rounded(g, 10, 10, w - 20, h - 24, 9);
  g.stroke();
  // A lattice of small diamonds.
  g.fillStyle = 'rgba(255,255,255,0.12)';
  for (let row = 0; row < 7; row++)
    for (let col = 0; col < 4; col++) {
      const cx = 26 + col * 23 + (row % 2) * 11,
        cy = 28 + row * 17;
      g.beginPath();
      g.moveTo(cx, cy - 6);
      g.lineTo(cx + 6, cy);
      g.lineTo(cx, cy + 6);
      g.lineTo(cx - 6, cy);
      g.fill();
    }
  g.fillStyle = 'rgba(255,255,255,0.5)';
  rounded(g, 6, 4, w - 12, 6, 3);
  g.fill();
}

function text(g, words, x, y, size, color, weight = 700) {
  g.fillStyle = color;
  g.font = `${weight} ${size}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
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
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fbf6e7';
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
  const w = 11;
  g.fillStyle = color;
  rounded(g, -w / 2, -height / 2, w, height, 5);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)';
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

/** The one of bamboo: a bird on a branch. */
function bird(g) {
  g.save();
  g.translate(TILE.width / 2, TILE.face / 2 + 4);
  // Tail.
  for (let i = -2; i <= 2; i++) {
    g.fillStyle = i % 2 ? BLUE : GREEN;
    g.beginPath();
    g.ellipse(-20 + i * 2, 22, 9, 30, -0.5 + i * 0.25, 0, Math.PI * 2);
    g.fill();
  }
  // Body and wing.
  g.fillStyle = GREEN;
  g.beginPath();
  g.ellipse(6, -2, 26, 18, -0.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = RED;
  g.beginPath();
  g.ellipse(0, 2, 14, 9, -0.6, 0, Math.PI * 2);
  g.fill();
  // Head, eye, beak and crest.
  g.fillStyle = BLUE;
  g.beginPath();
  g.arc(24, -24, 12, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(27, -26, 3.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#d99a1e';
  g.beginPath();
  g.moveTo(34, -24);
  g.lineTo(46, -20);
  g.lineTo(34, -18);
  g.fill();
  g.fillStyle = RED;
  g.beginPath();
  g.ellipse(18, -38, 4, 8, -0.4, 0, Math.PI * 2);
  g.fill();
  // Branch.
  g.strokeStyle = '#7a4a22';
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-40, 44);
  g.lineTo(36, 30);
  g.stroke();
  g.restore();
}
