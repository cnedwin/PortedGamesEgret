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
  // Paper.
  const bg = g.createLinearGradient(0, 0, 0, 125);
  bg.addColorStop(0, '#efe4c8');
  bg.addColorStop(1, '#dccba4');
  g.fillStyle = bg;
  g.fillRect(0, 0, 100, 125);
  g.fillStyle = 'rgba(120, 90, 50, 0.08)';
  for (let i = 0; i < 40; i++) g.fillRect(r() * 100, r() * 125, 1, 1);
  // A faint wash behind the head.
  g.fillStyle = 'rgba(150, 130, 100, 0.18)';
  g.beginPath();
  g.arc(50, 48, 36, 0, Math.PI * 2);
  g.fill();
  const skin = tribal ? '#c49a6c' : ['#ecd2aa', '#e6c79c', '#efd8b4', '#dfbf92'][Math.floor(r() * 4)];
  const ink = '#2b241c';
  // Shoulders: armour or robe.
  const robe = ROBE[camp] ?? '#6b5a44';
  g.fillStyle = robe;
  g.beginPath();
  g.moveTo(8, 125);
  g.quadraticCurveTo(12, 90, 34, 84);
  g.lineTo(66, 84);
  g.quadraticCurveTo(88, 90, 92, 125);
  g.closePath();
  g.fill();
  if (martial && !female) {
    // Lamellar plates and shoulder guards.
    g.strokeStyle = 'rgba(20, 16, 10, 0.45)';
    g.lineWidth = 0.8;
    for (let y = 92; y < 125; y += 5)
      for (let x = 18 + ((y / 5) % 2) * 3; x < 84; x += 6) {
        g.beginPath();
        g.arc(x, y, 2.6, 0, Math.PI);
        g.stroke();
      }
    g.fillStyle = '#6d6556';
    for (const side of [-1, 1]) {
      g.beginPath();
      g.ellipse(50 + side * 30, 92, 13, 7, side * 0.35, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#b89a52';
    g.fillRect(44, 86, 12, 6);
  } else {
    // A crossed collar.
    g.strokeStyle = '#efe6d2';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(38, 84);
    g.lineTo(52, 104);
    g.moveTo(62, 84);
    g.lineTo(48, 104);
    g.stroke();
  }
  // Neck and face.
  g.fillStyle = skin;
  g.fillRect(44, 70, 12, 16);
  const wide = martial ? 17 + r() * 3 : 15 + r() * 2;
  g.beginPath();
  g.ellipse(50, 54, wide, 21, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(60, 40, 20, 0.5)';
  g.lineWidth = 0.9;
  g.stroke();
  // Ears.
  g.fillStyle = skin;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.ellipse(50 + side * (wide + 1), 55, 3, 5, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Brows: heavy and slanted for the fierce, fine for the learned.
  const fierce = Math.min(1, Math.max(0, (s.war - 50) / 45));
  g.strokeStyle = ink;
  g.lineCap = 'round';
  g.lineWidth = female ? 1.1 : 1.4 + fierce * 2.2;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(50 + side * 4, 46 + fierce * 1.5);
    g.quadraticCurveTo(50 + side * 9, 43 - fierce * 2, 50 + side * 14, 44 - fierce * 3);
    g.stroke();
  }
  // Eyes.
  g.lineWidth = 1.3;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(50 + side * 5, 51);
    g.quadraticCurveTo(50 + side * 9, 49 - (female ? 1 : 0), 50 + side * 13, 51 - fierce);
    g.stroke();
    g.fillStyle = ink;
    g.beginPath();
    g.arc(50 + side * 9, 51, 1.3, 0, Math.PI * 2);
    g.fill();
  }
  // Nose and mouth.
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(50, 53);
  g.lineTo(48.5, 60);
  g.lineTo(51, 61);
  g.stroke();
  g.strokeStyle = female ? '#a8443a' : 'rgba(60, 30, 20, 0.8)';
  g.lineWidth = female ? 1.8 : 1.1;
  g.beginPath();
  g.moveTo(46, 66);
  g.quadraticCurveTo(50, 67.5, 54, 66);
  g.stroke();
  // Beards: none for the young and for women; long for the old and the dignified.
  if (!female && gen.born < 185) {
    const beard = t.has('wusheng') ? 3 : old ? 2 + Math.floor(r() * 2) : Math.floor(r() * 3);
    const white = gen.born < 145;
    g.fillStyle = white ? 'rgba(220, 220, 210, 0.95)' : 'rgba(30, 24, 18, 0.9)';
    g.strokeStyle = g.fillStyle;
    if (beard >= 1) {
      // Moustache.
      g.lineWidth = 1.8;
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(50, 63.5);
        g.quadraticCurveTo(50 + side * 5, 62, 50 + side * 8, 66);
        g.stroke();
      }
    }
    if (beard >= 2) {
      g.beginPath();
      g.moveTo(43, 68);
      g.quadraticCurveTo(50, beard === 3 ? 104 : 84, 57, 68);
      g.quadraticCurveTo(50, 72, 43, 68);
      g.fill();
    }
    if (beard === 3) {
      // A long, flowing beard down the chest.
      g.beginPath();
      g.moveTo(42, 66);
      g.quadraticCurveTo(46, 100, 50, 112);
      g.quadraticCurveTo(54, 100, 58, 66);
      g.closePath();
      g.fill();
    }
    if (fierce > 0.75 && beard < 3 && r() < 0.6) {
      // A bristling beard along the jaw.
      g.lineWidth = 1;
      for (let a = 0.15; a < Math.PI - 0.15; a += 0.18) {
        const x = 50 + Math.cos(a) * wide * 0.95,
          y = 56 + Math.sin(a) * 19;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
        g.stroke();
      }
    }
  }
  // Hair and headwear.
  g.fillStyle = gen.born < 140 ? '#d8d6cc' : '#1f1a15';
  g.beginPath();
  g.ellipse(50, 38, wide + 1, 12, 0, Math.PI, Math.PI * 2);
  g.fill();
  if (female) {
    // Hair up in buns, with a pin.
    g.fillStyle = '#1f1a15';
    g.beginPath();
    g.ellipse(50, 26, 13, 9, 0, 0, Math.PI * 2);
    g.fill();
    for (const side of [-1, 1]) {
      g.beginPath();
      g.arc(50 + side * 14, 33, 6, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = '#c9a646';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(36, 22);
    g.lineTo(64, 30);
    g.stroke();
    g.fillStyle = '#c0463a';
    g.beginPath();
    g.arc(64, 30, 2.2, 0, Math.PI * 2);
    g.fill();
  } else if (isRuler || t.has('huangzu')) {
    // A crown with a board and hanging beads.
    g.fillStyle = '#1d1812';
    g.fillRect(36, 22, 28, 14);
    g.fillStyle = '#2b241c';
    g.fillRect(28, 18, 44, 5);
    g.fillStyle = '#c9a646';
    for (let x = 30; x <= 70; x += 5) {
      g.fillRect(x, 23, 1, 7);
      g.beginPath();
      g.arc(x + 0.5, 31, 1.2, 0, Math.PI * 2);
      g.fill();
    }
  } else if (turban) {
    g.fillStyle = '#d9b43a';
    g.beginPath();
    g.ellipse(50, 33, wide + 3, 10, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.fillRect(50 - wide - 3, 31, (wide + 3) * 2, 6);
  } else if (tribal) {
    g.fillStyle = '#7a3a24';
    g.fillRect(50 - wide, 30, wide * 2, 6);
    for (let k = -2; k <= 2; k++) {
      g.fillStyle = ['#c9a646', '#3c7d46', '#a8443a'][(k + 3) % 3];
      g.beginPath();
      g.ellipse(50 + k * 7, 18, 2.6, 11, k * 0.22, 0, Math.PI * 2);
      g.fill();
    }
  } else if (martial) {
    // A helmet with a crest and the camp's plume.
    g.fillStyle = '#5f5a4e';
    g.beginPath();
    g.ellipse(50, 36, wide + 4, 15, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.fillRect(50 - wide - 4, 34, (wide + 4) * 2, 4);
    g.fillStyle = '#8a8270';
    g.fillRect(48, 18, 4, 10);
    g.fillStyle = ROBE[camp] ?? '#a8443a';
    g.beginPath();
    g.ellipse(50, 14, 4, 7, 0, 0, Math.PI * 2);
    g.fill();
    // Cheek guards.
    g.fillStyle = '#5f5a4e';
    for (const side of [-1, 1]) g.fillRect(50 + side * (wide + 1) - (side > 0 ? 0 : 4), 36, 4, 18);
  } else if (s.int >= 80 && r() < 0.5) {
    // A scholar's cloth hood.
    g.fillStyle = '#e8e2d2';
    g.beginPath();
    g.moveTo(50 - wide - 2, 38);
    g.quadraticCurveTo(50, 14, 50 + wide + 2, 38);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(60, 50, 40, 0.5)';
    g.stroke();
    g.fillStyle = '#e8e2d2';
    g.fillRect(50 + wide - 2, 34, 6, 18);
  } else {
    // The black cap of an official.
    g.fillStyle = '#1d1812';
    g.beginPath();
    g.moveTo(38, 34);
    g.lineTo(42, 18);
    g.lineTo(60, 16);
    g.lineTo(62, 34);
    g.closePath();
    g.fill();
    g.fillRect(36, 32, 28, 4);
  }
  // A thin ink frame.
  g.strokeStyle = 'rgba(60, 40, 20, 0.55)';
  g.lineWidth = 1.2;
  g.strokeRect(1.5, 1.5, 97, 122);
}
