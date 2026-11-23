// 武将画像：每位武将按自己的资料画一张水墨小像——阵营定衣色，武人披甲戴盔、文士着袍戴巾、君主戴冠、黄巾裹黄巾、
// 南蛮插羽、女子挽髻；眉眼看武力与智力，胡须看年纪与性子。同一人每次画出来都一样；画好的存起来不再重画。
// Portraits: each general painted from his own record as a small ink picture — his camp gives the colour of his
// clothes, a warrior wears armour and a helmet, a scholar a robe and a cap, a ruler a crown, a Yellow Turban his yellow
// scarf, a southern chief feathers, a woman her hair up; his brows and eyes follow his war and intellect, his beard his
// age and nature. The same man is painted the same each time, and once painted he is kept.
import { GENERALS } from '../data/generals.mjs';

const ROBE = { W: '#34558f', S: '#3c7d46', U: '#a8443a', H: '#7d6440', Y: '#b8962e', N: '#6e3a28', X: '#5a4a80', J: '#2c3a62' };
const cache = new Map();

function hash(id) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** A data URL of a general's portrait, `size` pixels wide (and 1.25 times as tall). */
export function portrait(id, size = 96, rulerIds = null) {
  const key = id + ':' + size + (rulerIds?.has(id) ? 'r' : '');
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = size * 2;
  canvas.height = Math.round(size * 2.5);
  const g = canvas.getContext('2d');
  g.scale((size * 2) / 100, (size * 2) / 100);
  paint(g, id, rulerIds?.has(id));
  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/** A colour `#rrggbb` made lighter (k > 0) or darker (k < 0), with an alpha. */
function tone(hex, k = 0, a = 1) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k));
  return `rgba(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)}, ${a})`;
}

function paint(g, id, isRuler) {
  const gen = GENERALS[id];
  let h = hash(id);
  const r = () => {
    h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    return h / 4294967296;
  };
  const s = gen.stats,
    t = new Set(gen.traits);
  const female = gen.female;
  const martial = s.war >= s.int + 8 || (s.lead > 80 && s.war > 70);
  const old = gen.born < 158;
  const camp = gen.camp;
  const turban = camp === 'Y';
  const tribal = camp === 'N';
  const robe = ROBE[camp] ?? '#6b5a44';
  const fierce = Math.min(1, Math.max(0, (s.war - 50) / 45));
  const wise = Math.min(1, Math.max(0, (s.int - 55) / 40));

  // The ground: dark, with a glow of the camp's colour behind the head and a wash of ink.
  g.fillStyle = '#14161a';
  g.fillRect(0, 0, 100, 125);
  const glow = g.createRadialGradient(50, 46, 4, 50, 52, 70);
  glow.addColorStop(0, tone(robe, 0.25, 0.55));
  glow.addColorStop(0.55, tone(robe, -0.35, 0.28));
  glow.addColorStop(1, 'rgba(8, 9, 12, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 100, 125);
  g.globalAlpha = 0.07;
  g.strokeStyle = '#e8dcc0';
  for (let i = 0; i < 14; i++) {
    g.lineWidth = 2 + r() * 6;
    g.beginPath();
    const y = r() * 125;
    g.moveTo(-5, y);
    g.bezierCurveTo(30, y + (r() - 0.5) * 30, 70, y + (r() - 0.5) * 30, 105, y + (r() - 0.5) * 20);
    g.stroke();
  }
  g.globalAlpha = 1;

  const skinBase = tribal ? '#b98a5e' : ['#e9caa0', '#e2bf92', '#edd2ae', '#d9b386', '#e4c49a'][Math.floor(r() * 5)];
  const wide = martial ? 16.5 + r() * 3 : 14.5 + r() * 2.2;
  const jaw = martial ? 0.9 + r() * 0.15 : 0.78 + r() * 0.12;

  // Shoulders: armour or a robe, shaded from the upper left.
  const body = g.createLinearGradient(10, 84, 92, 125);
  body.addColorStop(0, tone(robe, 0.18));
  body.addColorStop(0.55, robe);
  body.addColorStop(1, tone(robe, -0.45));
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(4, 125);
  g.bezierCurveTo(6, 98, 22, 88, 36, 84);
  g.lineTo(64, 84);
  g.bezierCurveTo(78, 88, 94, 98, 96, 125);
  g.closePath();
  g.fill();
  if (martial && !female) {
    // Lamellar plates, each lit at its top edge, and rounded shoulder guards.
    const metal = '#6e6a60';
    for (let y = 93; y < 126; y += 4.6)
      for (let x = 14 + ((y / 4.6) % 2) * 3; x < 88; x += 6) {
        const pg = g.createLinearGradient(x, y - 2.5, x, y + 2.5);
        pg.addColorStop(0, tone(metal, 0.35));
        pg.addColorStop(1, tone(metal, -0.45));
        g.fillStyle = pg;
        g.beginPath();
        g.ellipse(x, y, 2.9, 2.4, 0, 0, Math.PI * 2);
        g.fill();
      }
    for (const side of [-1, 1]) {
      const sg = g.createRadialGradient(50 + side * 28, 88, 1, 50 + side * 30, 93, 15);
      sg.addColorStop(0, tone(metal, 0.45));
      sg.addColorStop(1, tone(metal, -0.5));
      g.fillStyle = sg;
      g.beginPath();
      g.ellipse(50 + side * 30, 93, 15, 8, side * 0.35, 0, Math.PI * 2);
      g.fill();
    }
    // A breastplate disc of bronze.
    const disc = g.createRadialGradient(48, 103, 1, 50, 105, 8);
    disc.addColorStop(0, '#f1d792');
    disc.addColorStop(1, '#7a5a22');
    g.fillStyle = disc;
    g.beginPath();
    g.arc(50, 105, 6.5, 0, Math.PI * 2);
    g.fill();
    // The camp's colour as a cloak over one shoulder.
    g.fillStyle = tone(robe, -0.1, 0.9);
    g.beginPath();
    g.moveTo(62, 86);
    g.quadraticCurveTo(90, 92, 96, 125);
    g.lineTo(80, 125);
    g.quadraticCurveTo(76, 100, 62, 86);
    g.fill();
  } else {
    // Folds of the robe and a crossed collar with a pale lining.
    g.strokeStyle = tone(robe, -0.5, 0.55);
    g.lineWidth = 1.2;
    for (const [x1, x2] of [
      [26, 18],
      [36, 32],
      [70, 74],
      [78, 86]
    ]) {
      g.beginPath();
      g.moveTo(x1, 92);
      g.quadraticCurveTo((x1 + x2) / 2 + 3, 108, x2, 125);
      g.stroke();
    }
    g.lineCap = 'round';
    g.strokeStyle = '#efe6d2';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(37, 84);
    g.lineTo(53, 108);
    g.moveTo(63, 84);
    g.lineTo(47, 108);
    g.stroke();
    g.strokeStyle = tone(robe, -0.4);
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(39, 84);
    g.lineTo(53.5, 106);
    g.stroke();
  }

  // Neck, shaded under the jaw.
  const neck = g.createLinearGradient(0, 68, 0, 88);
  neck.addColorStop(0, tone(skinBase, -0.38));
  neck.addColorStop(0.5, tone(skinBase, -0.12));
  neck.addColorStop(1, tone(skinBase, -0.25));
  g.fillStyle = neck;
  g.beginPath();
  g.moveTo(43, 68);
  g.lineTo(57, 68);
  g.lineTo(59, 88);
  g.lineTo(41, 88);
  g.closePath();
  g.fill();

  // The face: an egg narrowing to the jaw, lit from the upper left.
  const face = g.createRadialGradient(44, 48, 3, 50, 55, wide + 10);
  face.addColorStop(0, tone(skinBase, 0.22));
  face.addColorStop(0.6, skinBase);
  face.addColorStop(1, tone(skinBase, -0.3));
  g.fillStyle = face;
  g.beginPath();
  g.moveTo(50 - wide, 50);
  g.bezierCurveTo(50 - wide, 30, 50 + wide, 30, 50 + wide, 50);
  g.bezierCurveTo(50 + wide, 62, 50 + wide * jaw * 0.7, 74, 50, 76);
  g.bezierCurveTo(50 - wide * jaw * 0.7, 74, 50 - wide, 62, 50 - wide, 50);
  g.fill();
  // Ears.
  for (const side of [-1, 1]) {
    g.fillStyle = tone(skinBase, side > 0 ? -0.2 : -0.05);
    g.beginPath();
    g.ellipse(50 + side * (wide + 0.5), 54, 3, 5.5, side * 0.15, 0, Math.PI * 2);
    g.fill();
  }
  // Shadow on the far cheek and a warm cheek.
  g.fillStyle = tone(skinBase, -0.35, 0.35);
  g.beginPath();
  g.ellipse(50 + wide * 0.62, 58, wide * 0.38, 13, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = female ? 'rgba(220, 110, 100, 0.22)' : 'rgba(190, 90, 70, 0.12)';
  for (const side of [-1, 1]) {
    g.beginPath();
    g.ellipse(50 + side * wide * 0.52, 61, 4.5, 3, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Brows: heavy and slanted for the fierce, fine for the learned.
  const ink = '#1c1612';
  g.lineCap = 'round';
  g.strokeStyle = old && gen.born < 145 ? '#cfcac0' : ink;
  for (const side of [-1, 1]) {
    g.lineWidth = female ? 1.1 : 1.4 + fierce * 2.4;
    g.beginPath();
    g.moveTo(50 + side * 3.5, 46.5 + fierce * 1.5);
    g.quadraticCurveTo(50 + side * 9, 43.2 - fierce * 2.2, 50 + side * 14.5, 44.5 - fierce * 3);
    g.stroke();
  }
  // Eyes: the white, the iris with its glint, and the lid.
  for (const side of [-1, 1]) {
    const cx = 50 + side * 8.8,
      cy = 51;
    g.fillStyle = 'rgba(245, 240, 228, 0.95)';
    g.beginPath();
    g.moveTo(cx - 4.2, cy);
    g.quadraticCurveTo(cx, cy - 2.6 + (female ? -0.4 : 0), cx + 4.2, cy - fierce * side * 0.6);
    g.quadraticCurveTo(cx, cy + 1.9, cx - 4.2, cy);
    g.fill();
    g.fillStyle = '#2a1d14';
    g.beginPath();
    g.arc(cx + side * 0.2, cy - 0.2, 1.7, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255, 255, 255, 0.85)';
    g.beginPath();
    g.arc(cx - 0.5, cy - 0.8, 0.5, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = ink;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(cx - 4.4, cy + 0.2);
    g.quadraticCurveTo(cx, cy - 2.9 + (female ? -0.4 : 0), cx + 4.4, cy - fierce * side * 0.6);
    g.stroke();
    // The fold below a wise or old eye.
    if (wise > 0.5 || old) {
      g.strokeStyle = tone(skinBase, -0.4, 0.6);
      g.lineWidth = 0.6;
      g.beginPath();
      g.moveTo(cx - 3, cy + 2.6);
      g.quadraticCurveTo(cx, cy + 3.6, cx + 3, cy + 2.6);
      g.stroke();
    }
  }
  // The nose: a shadow down one side and the nostrils.
  g.fillStyle = tone(skinBase, -0.3, 0.55);
  g.beginPath();
  g.moveTo(51.2, 52);
  g.quadraticCurveTo(53.5, 58, 52.5, 61.5);
  g.lineTo(50.2, 61);
  g.quadraticCurveTo(51.6, 57, 51.2, 52);
  g.fill();
  g.fillStyle = tone(skinBase, -0.5, 0.8);
  for (const side of [-1, 1]) {
    g.beginPath();
    g.ellipse(50 + side * 2.2, 61.6, 1.2, 0.7, 0, 0, Math.PI * 2);
    g.fill();
  }
  // The mouth.
  const lip = female ? '#b44a42' : tone(skinBase, -0.42);
  g.fillStyle = lip;
  g.beginPath();
  g.moveTo(45.5, 66.2);
  g.quadraticCurveTo(50, 64.8 + fierce * 0.6, 54.5, 66.2);
  g.quadraticCurveTo(50, 68.6, 45.5, 66.2);
  g.fill();
  g.strokeStyle = tone(skinBase, -0.6, 0.8);
  g.lineWidth = 0.7;
  g.beginPath();
  g.moveTo(45.5, 66.2);
  g.quadraticCurveTo(50, 66.9 - fierce * 0.8, 54.5, 66.2);
  g.stroke();

  // Beards drawn as strands: none for the young and for women; long for the old and the dignified.
  if (!female && gen.born < 185) {
    const beard = t.has('wusheng') ? 3 : old ? 2 + Math.floor(r() * 2) : Math.floor(r() * 3);
    const white = gen.born < 145;
    const hair = white ? '#dcd8cc' : '#1a1510';
    const strands = (x0, y0, x1, y1, n, spread, width) => {
      for (let i = 0; i < n; i++) {
        const k = i / Math.max(1, n - 1) - 0.5;
        g.strokeStyle = i % 3 ? hair : white ? '#f4f1ea' : '#3a2f24';
        g.lineWidth = width * (0.6 + r() * 0.6);
        g.beginPath();
        g.moveTo(x0 + k * spread, y0);
        g.quadraticCurveTo(x0 + k * spread * 1.3 + (r() - 0.5) * 3, (y0 + y1) / 2, x1 + k * spread * 0.4 + (r() - 0.5) * 2, y1 + r() * 4);
        g.stroke();
      }
    };
    if (beard >= 1)
      for (const side of [-1, 1]) {
        g.strokeStyle = hair;
        g.lineWidth = 1.7;
        g.beginPath();
        g.moveTo(50 + side * 0.5, 63.6);
        g.quadraticCurveTo(50 + side * 5.5, 62.2, 50 + side * 9, 67.5);
        g.stroke();
      }
    if (beard >= 2) strands(50, 68.5, 50, beard === 3 ? 112 : 86, 16, 12, 1.2);
    if (beard === 3) strands(50, 70, 50, 118, 10, 16, 1.3);
    if (fierce > 0.75 && beard < 3 && r() < 0.6) {
      g.strokeStyle = hair;
      g.lineWidth = 1;
      for (let a = 0.2; a < Math.PI - 0.2; a += 0.14) {
        const x = 50 + Math.cos(a) * wide * 0.9,
          y = 58 + Math.sin(a) * 17;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5);
        g.stroke();
      }
    }
  }

  // Hair, then headwear, each with its light and shade.
  const hairTone = gen.born < 140 ? '#d6d3c8' : '#1d1813';
  const hg = g.createLinearGradient(40, 26, 60, 44);
  hg.addColorStop(0, tone(hairTone, 0.25));
  hg.addColorStop(1, hairTone);
  g.fillStyle = hg;
  g.beginPath();
  g.ellipse(50, 39, wide + 1.2, 12.5, 0, Math.PI, Math.PI * 2);
  g.fill();
  g.fillRect(50 - wide - 1.2, 38, 3, 10);
  g.fillRect(50 + wide - 1.8, 38, 3, 10);
  const shaded = (x0, y0, x1, y1, colour) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, tone(colour, 0.3));
    gr.addColorStop(1, tone(colour, -0.35));
    return gr;
  };
  if (female) {
    g.fillStyle = shaded(40, 14, 60, 34, '#221c16');
    g.beginPath();
    g.ellipse(50, 26, 13.5, 9.5, 0, 0, Math.PI * 2);
    g.fill();
    for (const side of [-1, 1]) {
      g.beginPath();
      g.arc(50 + side * 14.5, 33, 6.2, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = '#d6b35a';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(35, 21);
    g.lineTo(65, 30);
    g.stroke();
    g.fillStyle = '#c0463a';
    g.beginPath();
    g.arc(65, 30, 2.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e9d9a8';
    g.beginPath();
    g.arc(42, 22, 1.6, 0, Math.PI * 2);
    g.fill();
  } else if (isRuler || t.has('huangzu')) {
    g.fillStyle = shaded(36, 18, 64, 36, '#231d16');
    g.fillRect(36, 21, 28, 15);
    g.fillStyle = shaded(28, 16, 72, 22, '#3a3024');
    g.fillRect(27, 17, 46, 5);
    for (let x = 29; x <= 71; x += 5) {
      g.fillStyle = '#d9b66b';
      g.fillRect(x, 22, 0.8, 7);
      const bead = g.createRadialGradient(x, 30.4, 0.2, x + 0.4, 31, 1.6);
      bead.addColorStop(0, '#fff1c4');
      bead.addColorStop(1, '#9a7428');
      g.fillStyle = bead;
      g.beginPath();
      g.arc(x + 0.4, 31, 1.4, 0, Math.PI * 2);
      g.fill();
    }
  } else if (turban) {
    g.fillStyle = shaded(32, 22, 66, 40, '#d9b43a');
    g.beginPath();
    g.ellipse(50, 34, wide + 3.5, 11, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.fillRect(50 - wide - 3.5, 31.5, (wide + 3.5) * 2, 6.5);
    g.strokeStyle = 'rgba(120, 90, 20, 0.6)';
    g.lineWidth = 0.8;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.moveTo(50 - wide - 2, 33 + k * 1.4);
      g.lineTo(50 + wide + 2, 32 + k * 1.4);
      g.stroke();
    }
  } else if (tribal) {
    g.fillStyle = shaded(30, 28, 70, 36, '#7a3a24');
    g.fillRect(50 - wide - 1, 30, wide * 2 + 2, 6.5);
    for (let k = -2; k <= 2; k++) {
      g.fillStyle = shaded(50 + k * 7 - 3, 6, 50 + k * 7 + 3, 30, ['#c9a646', '#3c7d46', '#a8443a'][(k + 3) % 3]);
      g.beginPath();
      g.ellipse(50 + k * 7, 18, 2.8, 11.5, k * 0.22, 0, Math.PI * 2);
      g.fill();
    }
  } else if (martial) {
    // A helmet, its bowl lit at the left, with a crest and a plume of the camp's colour.
    const metal = '#5f5b52';
    g.fillStyle = shaded(30, 18, 70, 40, metal);
    g.beginPath();
    g.ellipse(50, 37, wide + 4.5, 16, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.fillStyle = shaded(30, 34, 70, 39, '#8a826e');
    g.fillRect(50 - wide - 4.5, 34.5, (wide + 4.5) * 2, 4);
    g.fillStyle = '#d9b66b';
    g.fillRect(48.6, 17, 2.8, 12);
    g.fillStyle = shaded(44, 4, 56, 22, robe);
    g.beginPath();
    g.moveTo(50, 17);
    g.bezierCurveTo(42, 12, 46, 2, 51, 1);
    g.bezierCurveTo(55, 6, 56, 12, 50, 17);
    g.fill();
    for (const side of [-1, 1]) {
      g.fillStyle = shaded(50 + side * (wide + 2) - 3, 36, 50 + side * (wide + 2) + 3, 56, metal);
      g.beginPath();
      g.moveTo(50 + side * (wide + 4), 37);
      g.lineTo(50 + side * (wide + 1), 37);
      g.lineTo(50 + side * (wide - 1), 56);
      g.lineTo(50 + side * (wide + 3), 54);
      g.closePath();
      g.fill();
    }
  } else if (s.int >= 80 && r() < 0.5) {
    // A scholar's cloth hood falling behind.
    g.fillStyle = shaded(34, 14, 66, 40, '#e6dfcd');
    g.beginPath();
    g.moveTo(50 - wide - 2.5, 39);
    g.bezierCurveTo(50 - wide, 18, 50 + wide, 14, 50 + wide + 2.5, 39);
    g.closePath();
    g.fill();
    g.fillRect(50 + wide - 2, 34, 6.5, 22);
    g.strokeStyle = 'rgba(80, 70, 55, 0.5)';
    g.lineWidth = 0.7;
    g.beginPath();
    g.moveTo(50 - wide + 2, 37);
    g.quadraticCurveTo(50, 22, 50 + wide - 2, 37);
    g.stroke();
  } else {
    // The black cap of an official.
    g.fillStyle = shaded(38, 14, 62, 36, '#26201a');
    g.beginPath();
    g.moveTo(37.5, 35);
    g.lineTo(41.5, 17.5);
    g.lineTo(60.5, 15.5);
    g.lineTo(62.5, 35);
    g.closePath();
    g.fill();
    g.fillRect(35.5, 32.5, 29, 4.5);
    g.fillStyle = 'rgba(255, 255, 255, 0.08)';
    g.fillRect(42, 18, 3, 15);
  }

  // A vignette and a thin gilt frame.
  const vig = g.createRadialGradient(50, 55, 30, 50, 60, 80);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  g.fillStyle = vig;
  g.fillRect(0, 0, 100, 125);
  g.strokeStyle = 'rgba(214, 180, 106, 0.55)';
  g.lineWidth = 1;
  g.strokeRect(1, 1, 98, 123);
}
