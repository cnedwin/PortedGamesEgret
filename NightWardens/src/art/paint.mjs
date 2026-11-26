// 战场精灵和粒子纹理绘制在以帧中心为原点的 2D 画布上，由 atlas.mjs 打包。
// Battlefield sprites and particle textures are painted in frame-local coordinates and packed by atlas.mjs.

const TAU = Math.PI * 2;

/** A linear gradient from `stops` ([offset, colour] pairs). */
function linear(g, x0, y0, x1, y1, stops) {
  const gradient = g.createLinearGradient(x0, y0, x1, y1);
  for (const [at, colour] of stops) gradient.addColorStop(at, colour);
  return gradient;
}
function radial(g, x, y, r0, r1, stops) {
  const gradient = g.createRadialGradient(x, y, r0, x, y, r1);
  for (const [at, colour] of stops) gradient.addColorStop(at, colour);
  return gradient;
}
function ellipse(g, x, y, rx, ry, fill, rotation = 0) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rotation, 0, TAU);
  g.fillStyle = fill;
  g.fill();
}
function poly(g, points, fill, stroke, width = 1.5) {
  g.beginPath();
  points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.lineWidth = width;
    g.strokeStyle = stroke;
    g.stroke();
  }
}
/** A soft dark line around a shape, so it reads on any ground. */
function outline(g, draw, colour = 'rgba(8,6,12,0.85)', width = 3) {
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.lineWidth = width;
  g.strokeStyle = colour;
  draw();
  g.stroke();
  g.restore();
}
/** A few strokes that read as a seal script glyph on a talisman. */
function glyph(g, x, y, size, colour) {
  g.save();
  g.strokeStyle = colour;
  g.lineWidth = size * 0.12;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x - size * 0.3, y - size * 0.5);
  g.lineTo(x + size * 0.3, y - size * 0.5);
  g.moveTo(x, y - size * 0.6);
  g.lineTo(x, y + size * 0.55);
  g.moveTo(x - size * 0.35, y - size * 0.1);
  g.quadraticCurveTo(x, y + size * 0.1, x + size * 0.35, y - size * 0.15);
  g.moveTo(x - size * 0.25, y + size * 0.3);
  g.lineTo(x + size * 0.28, y + size * 0.25);
  g.stroke();
  g.restore();
}

// ——— The haunts. Frame `f` is the frame of the walk. ———

/** 纸人: a paper doll with a painted face and rosy cheeks, arms swinging. */
export function paperDoll(g, f) {
  const lift = f === 1 ? -2 : 0,
    arm = f === 1 ? -0.7 : 0.35;
  ellipse(g, 0, 26, 14, 4, 'rgba(0,0,0,0.35)');
  g.save();
  g.translate(0, lift);
  // Robe, a stiff cone of paper with folds.
  const robe = () => {
    g.beginPath();
    g.moveTo(-6, -4);
    g.lineTo(-15, 22);
    g.lineTo(15, 22);
    g.lineTo(6, -4);
    g.closePath();
  };
  outline(g, robe);
  robe();
  g.fillStyle = linear(g, 0, -4, 0, 22, [[0, '#f4efe2'], [1, '#c9c0ac']]);
  g.fill();
  g.strokeStyle = 'rgba(120,100,80,0.45)';
  g.lineWidth = 0.8;
  for (const x of [-7, 0, 7]) {
    g.beginPath();
    g.moveTo(x * 0.4, -2);
    g.lineTo(x, 21);
    g.stroke();
  }
  // A red sash.
  poly(g, [[-9, 7], [9, 7], [10, 10], [-10, 10]], linear(g, -9, 0, 9, 0, [[0, '#6e2028'], [0.5, '#d66349'], [1, '#92283a']]));
  poly(g, [[0, 8], [5, 9], [7, 21], [2, 18]], '#ab3434', '#61202c', 0.65);
  glyph(g, -3, 15, 5, '#92392e');
  // Arms as stiff paper strips.
  for (const side of [-1, 1]) {
    g.save();
    g.translate(side * 6, -1);
    g.rotate(side * arm);
    outline(g, () => g.rect(-2.5, 0, 5, 14), 'rgba(8,6,12,0.8)', 2.5);
    g.fillStyle = '#e8e1cf';
    g.fillRect(-2.5, 0, 5, 14);
    g.restore();
  }
  // Head: a flat paper face, black hair, two red cheeks and a thin smile.
  outline(g, () => g.arc(0, -12, 9, 0, TAU));
  ellipse(g, 0, -12, 9, 9, radial(g, -3, -15, 1, 15, [[0, '#fff4d8'], [0.65, '#e9d6b7'], [1, '#b48d76']]));
  g.beginPath();
  g.arc(0, -14, 9.2, Math.PI * 1.02, Math.PI * 1.98);
  g.lineTo(6, -16);
  g.lineTo(-6, -16);
  g.fillStyle = '#16131c';
  g.fill();
  ellipse(g, -4.5, -9.5, 2.4, 1.6, 'rgba(214,52,64,0.85)');
  ellipse(g, 4.5, -9.5, 2.4, 1.6, 'rgba(214,52,64,0.85)');
  g.fillStyle = '#16131c';
  g.fillRect(-3.6, -13, 1.6, 1.2);
  g.fillRect(2.0, -13, 1.6, 1.2);
  g.strokeStyle = '#8a1c24';
  g.lineWidth = 1;
  g.beginPath();
  g.arc(0, -9, 2.6, 0.2, Math.PI - 0.2);
  g.stroke();
  g.restore();
}

/** 鬼火: a will-o'-the-wisp, green flame with a pale core; three flickers. */
export function wisp(g, f) {
  const sway = [-2, 1, 3][f],
    tall = [1, 1.12, 0.94][f];
  g.save();
  g.globalCompositeOperation = 'lighter';
  ellipse(g, 0, 4, 16, 16, radial(g, 0, 4, 0, 18, [[0, 'rgba(120,255,190,0.55)'], [1, 'rgba(40,160,120,0)']]));
  g.restore();
  g.beginPath();
  g.moveTo(0, -18 * tall);
  g.bezierCurveTo(sway + 9, -6, 12, 6, 0, 13);
  g.bezierCurveTo(-12, 6, sway - 8, -4, 0, -18 * tall);
  g.fillStyle = linear(g, 0, -18, 0, 13, [[0, 'rgba(120,255,200,0.2)'], [0.5, '#4fe0a4'], [1, '#1f9a78']]);
  g.fill();
  g.beginPath();
  g.moveTo(sway * 0.7 - 2, -14 * tall);
  g.quadraticCurveTo(sway + 6, -6, 4, 0);
  g.quadraticCurveTo(9, 8, 0, 11);
  g.strokeStyle = 'rgba(196,255,216,0.65)';
  g.lineWidth = 0.8;
  g.stroke();
  ellipse(g, 0, 5, 5.5, 6.5, radial(g, 0, 5, 0, 7, [[0, '#f4fff8'], [1, 'rgba(190,255,225,0.6)']]));
  // Two hollow eyes.
  ellipse(g, -2.2, 3, 1.3, 1.8, '#0c2a22');
  ellipse(g, 2.2, 3, 1.3, 1.8, '#0c2a22');
}

/** 僵尸: a hopping corpse in a Qing official's robe and hat, a yellow talisman on the brow, arms held out. */
export function jiangshi(g, f) {
  const crouch = f === 0 ? 3 : -4;
  ellipse(g, 0, 32, f === 0 ? 17 : 12, f === 0 ? 5 : 3.5, 'rgba(0,0,0,0.38)');
  g.save();
  g.translate(0, crouch);
  // Legs together, boots.
  poly(g, [[-8, 18], [8, 18], [7, 30], [-7, 30]], '#1d1f2a', 'rgba(8,6,12,0.9)', 2);
  poly(g, [[-9, 28], [9, 28], [10, 32], [-10, 32]], '#0c0d12');
  // Robe: dark blue with a square badge.
  const robe = () => {
    g.beginPath();
    g.moveTo(-11, -8);
    g.lineTo(-15, 20);
    g.lineTo(15, 20);
    g.lineTo(11, -8);
    g.closePath();
  };
  outline(g, robe, 'rgba(8,6,12,0.9)', 3.2);
  robe();
  g.fillStyle = linear(g, 0, -8, 0, 20, [[0, '#2c3a68'], [1, '#18203c']]);
  g.fill();
  poly(g, [[-10, -7], [0, -1], [9, -7], [5, -2], [0, 2], [-6, -1]], '#828cab', '#202940', 0.6);
  poly(g, [[-14, 16], [14, 16], [15, 20], [-15, 20]], '#29345a', '#778293', 0.65);
  poly(g, [[-6, 0], [6, 0], [6, 11], [-6, 11]], '#b88a2e', '#5e4310', 1);
  g.strokeStyle = '#e0c06a';
  g.lineWidth = 0.9;
  g.beginPath();
  g.arc(0, 5.5, 3, 0, TAU);
  g.stroke();
  // Arms straight ahead (toward the viewer, slightly down).
  for (const side of [-1, 1]) {
    outline(g, () => g.rect(side * 10 - 3.5, -6, 7, 17), 'rgba(8,6,12,0.9)', 3);
    g.fillStyle = '#26315a';
    g.fillRect(side * 10 - 3.5, -6, 7, 17);
    ellipse(g, side * 10, 13, 3.4, 3, '#a9c2a4');
  }
  // Head: grey-green skin, closed eyes, the hat.
  outline(g, () => g.arc(0, -16, 9, 0, TAU), 'rgba(8,6,12,0.9)', 3);
  ellipse(g, 0, -16, 9, 9.5, linear(g, 0, -26, 0, -6, [[0, '#b9cdb0'], [1, '#88a184']]));
  g.strokeStyle = '#2c3328';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(-5, -14);
  g.lineTo(-1.8, -13.4);
  g.moveTo(1.8, -13.4);
  g.lineTo(5, -14);
  g.stroke();
  poly(g, [[-12, -22], [12, -22], [9, -28], [-9, -28]], '#151827', 'rgba(8,6,12,0.9)', 2);
  ellipse(g, 0, -29, 5, 3.5, '#151827');
  ellipse(g, 0, -32, 2.6, 2.6, '#b3242a');
  // The talisman hangs from the hat over the face.
  poly(g, [[-4, -24], [4, -24], [4.5, -6], [-4.5, -6]], '#f1d14a', 'rgba(110,70,10,0.8)', 0.8);
  glyph(g, 0, -15, 9, '#b3242a');
  g.restore();
}

/** 灯笼鬼: a red paper lantern with one great eye and a ragged tail of flame. */
export function lanternGhost(g, f) {
  const bob = f === 1 ? -2 : 1;
  g.save();
  g.globalCompositeOperation = 'lighter';
  ellipse(g, 0, bob, 24, 24, radial(g, 0, bob, 0, 26, [[0, 'rgba(255,120,60,0.45)'], [1, 'rgba(255,60,30,0)']]));
  g.restore();
  g.save();
  g.translate(0, bob);
  // Tail of flame below.
  g.beginPath();
  g.moveTo(-6, 14);
  g.quadraticCurveTo(-2 + (f ? 3 : -3), 26, 0, 30);
  g.quadraticCurveTo(2 + (f ? -3 : 3), 24, 6, 14);
  g.fillStyle = 'rgba(255,170,80,0.9)';
  g.fill();
  // The lantern body with ribs.
  outline(g, () => g.ellipse(0, 0, 17, 15, 0, 0, TAU), 'rgba(8,6,12,0.9)', 3);
  ellipse(g, 0, 0, 17, 15, radial(g, -4, -5, 2, 20, [[0, '#ff8a5a'], [0.6, '#d0302a'], [1, '#7a1418']]));
  g.strokeStyle = 'rgba(70,10,10,0.6)';
  g.lineWidth = 1;
  for (const x of [-10, -4, 4, 10]) {
    g.beginPath();
    g.ellipse(0, 0, Math.abs(x), 15, 0, 0, TAU);
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,181,121,0.55)';
  g.lineWidth = 0.65;
  for (const x of [7, 13]) {
    g.beginPath();
    g.ellipse(0, 0, x, 14.5, 0, Math.PI * 1.1, Math.PI * 1.88);
    g.stroke();
  }
  poly(g, [[-8, -17], [8, -17], [7, -14], [-7, -14]], '#2a1c12');
  poly(g, [[-7, 14], [7, 14], [8, 17], [-8, 17]], '#2a1c12');
  // One eye, wide open.
  ellipse(g, 0, 1, 8, 6, '#fff7e0');
  ellipse(g, 0, 1, 4, 4.2, '#1a0a08');
  ellipse(g, -1.4, -0.6, 1.3, 1.3, '#ffffff');
  // A torn mouth.
  g.strokeStyle = '#3a0808';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-7, 9);
  g.lineTo(-3, 7);
  g.lineTo(0, 9.5);
  g.lineTo(3, 7);
  g.lineTo(7, 9);
  g.stroke();
  g.restore();
}

/** 鬼新娘: a ghost bride in red with a long veil, floating; the veil stirs. */
export function ghostBride(g, f) {
  const flutter = f === 1 ? 3 : 0;
  ellipse(g, 0, 40, 18, 5, 'rgba(0,0,0,0.3)');
  // Long red dress, fading to nothing at the hem.
  const dress = () => {
    g.beginPath();
    g.moveTo(-10, -12);
    g.quadraticCurveTo(-24, 20, -20 - flutter, 38);
    g.lineTo(20 + flutter, 38);
    g.quadraticCurveTo(24, 20, 10, -12);
    g.closePath();
  };
  outline(g, dress, 'rgba(8,6,12,0.85)', 3);
  dress();
  g.fillStyle = linear(g, 0, -12, 0, 38, [[0, '#c32632'], [0.7, '#8c1420'], [1, 'rgba(90,10,20,0.35)']]);
  g.fill();
  // Gold trim and a phoenix hint.
  g.strokeStyle = '#e3b84a';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-14, 6);
  g.quadraticCurveTo(0, 12, 14, 6);
  g.moveTo(-17, 18);
  g.quadraticCurveTo(0, 25, 17, 18);
  g.stroke();
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(side * 8, 15);
    g.quadraticCurveTo(side * 16, 24, side * (17 + flutter), 33);
    g.stroke();
    for (let i = 0; i < 3; i++) ellipse(g, side * (7 + i * 3), 25 + i * 2, 0.85, 0.85, '#edc58a');
  }
  // Pale hands folded.
  ellipse(g, -4, 2, 3.4, 2.6, '#efe3dc');
  ellipse(g, 4, 2, 3.4, 2.6, '#efe3dc');
  // Head under a red veil; only a pale chin shows.
  ellipse(g, 0, -20, 9, 10, '#f2e6e2');
  g.beginPath();
  g.moveTo(-14 - flutter, 4);
  g.quadraticCurveTo(-16, -30, 0, -34);
  g.quadraticCurveTo(16, -30, 14 + flutter, 4);
  g.quadraticCurveTo(0, -6, -14 - flutter, 4);
  g.fillStyle = linear(g, 0, -34, 0, 4, [[0, '#e0353e'], [1, 'rgba(170,20,32,0.8)']]);
  g.fill();
  outline(g, () => {
    g.moveTo(-14 - flutter, 4);
    g.quadraticCurveTo(-16, -30, 0, -34);
    g.quadraticCurveTo(16, -30, 14 + flutter, 4);
  });
  // A gold headdress and tassels.
  poly(g, [[-9, -34], [9, -34], [6, -40], [0, -37], [-6, -40]], '#e3b84a', '#6e4c10', 1);
  for (const x of [-8, -3, 3, 8]) {
    g.strokeStyle = '#e3b84a';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, -33);
    g.lineTo(x + flutter * 0.3, -24);
    g.stroke();
    ellipse(g, x + flutter * 0.3, -23, 1.2, 1.2, '#ffd86a');
  }
}

// ——— The wardens: big, three frames each (two of walking, one of a stomp or a cast). ———

/** 纸扎大将: a towering paper general with painted armour, banners on his back and a paper glaive. */
export function paperGeneral(g, f) {
  const stomp = f === 2,
    lean = f === 1 ? 2 : 0;
  ellipse(g, 0, 74, 52, 12, 'rgba(0,0,0,0.4)');
  g.save();
  g.translate(lean, stomp ? 4 : 0);
  // Banners behind.
  for (const [x, colour] of [[-30, '#b3242a'], [0, '#1f5a9a'], [30, '#b3242a']]) {
    g.strokeStyle = '#3a2a1a';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(x, -10);
    g.lineTo(x * 1.2, -78);
    g.stroke();
    poly(g, [[x * 1.2, -78], [x * 1.2 + 16, -74], [x * 1.2 + 13, -54], [x * 1.2, -58]], colour, 'rgba(8,6,12,0.8)', 1.5);
    glyph(g, x * 1.2 + 7, -66, 9, '#f2e6c8');
  }
  // Legs.
  for (const side of [-1, 1]) poly(g, [[side * 8, 30], [side * 24, 30], [side * 26, 70], [side * 6, 70]], '#d9cfb8', 'rgba(8,6,12,0.9)', 3);
  // Armoured body of paper: scales painted on.
  const body = () => {
    g.beginPath();
    g.moveTo(-34, -30);
    g.lineTo(-40, 34);
    g.lineTo(40, 34);
    g.lineTo(34, -30);
    g.closePath();
  };
  outline(g, body, 'rgba(8,6,12,0.95)', 4);
  body();
  g.fillStyle = linear(g, 0, -30, 0, 34, [[0, '#e9dfc6'], [1, '#bfb293']]);
  g.fill();
  g.strokeStyle = 'rgba(150,40,40,0.75)';
  g.lineWidth = 1.2;
  for (let row = 0; row < 6; row++)
    for (let col = -3; col <= 3; col++) {
      g.beginPath();
      g.arc(col * 10 + (row % 2) * 5, -22 + row * 9, 5, 0, Math.PI);
      g.stroke();
    }
  poly(g, [[-40, 20], [40, 20], [42, 30], [-42, 30]], '#b3242a', 'rgba(8,6,12,0.8)', 1.5);
  ellipse(g, 0, 4, 11, 11, '#d9a536');
  g.fillStyle = '#7a1418';
  g.font = 'bold 13px serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('將', 0, 5);
  // Shoulder plates.
  for (const side of [-1, 1]) ellipse(g, side * 38, -26, 13, 9, '#c9a248');
  // The glaive in the right hand.
  g.save();
  g.translate(44, -10);
  g.rotate(stomp ? 0.9 : 0.25);
  g.fillStyle = '#5a3a1e';
  g.fillRect(-2, -60, 4, 100);
  poly(g, [[-2, -60], [10, -76], [12, -56], [2, -50]], '#e8e2d4', 'rgba(8,6,12,0.9)', 2);
  g.restore();
  // Head: a painted mask with fierce brows, a helmet with a red plume.
  outline(g, () => g.arc(0, -46, 17, 0, TAU), 'rgba(8,6,12,0.95)', 4);
  ellipse(g, 0, -46, 17, 18, '#f4ecda');
  ellipse(g, -8, -40, 4, 2.5, 'rgba(214,52,64,0.85)');
  ellipse(g, 8, -40, 4, 2.5, 'rgba(214,52,64,0.85)');
  g.fillStyle = '#16131c';
  poly(g, [[-12, -52], [-3, -49], [-4, -47], [-12, -49]], '#16131c');
  poly(g, [[12, -52], [3, -49], [4, -47], [12, -49]], '#16131c');
  ellipse(g, -7, -45, 2, 2, stomp ? '#ff4030' : '#16131c');
  ellipse(g, 7, -45, 2, 2, stomp ? '#ff4030' : '#16131c');
  g.strokeStyle = '#8a1c24';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-6, -36);
  g.quadraticCurveTo(0, stomp ? -30 : -34, 6, -36);
  g.stroke();
  poly(g, [[-18, -56], [18, -56], [12, -68], [-12, -68]], '#c9a248', 'rgba(8,6,12,0.9)', 2);
  g.beginPath();
  g.moveTo(0, -68);
  g.quadraticCurveTo(-10 - lean * 2, -86, -18, -80);
  g.lineWidth = 5;
  g.strokeStyle = '#c3262e';
  g.stroke();
  g.restore();
}

/** 白无常: the white impermanence — tall, white-robed, a tall hat, a long red tongue and an iron chain. */
export function whiteWuchang(g, f) {
  const cast = f === 2,
    sway = f === 1 ? 3 : -1;
  ellipse(g, 0, 84, 34, 9, 'rgba(0,0,0,0.35)');
  g.save();
  g.translate(sway * 0.5, 0);
  // Robe, long and fading.
  const robe = () => {
    g.beginPath();
    g.moveTo(-18, -34);
    g.quadraticCurveTo(-34, 30, -30 - sway, 82);
    g.lineTo(30 + sway, 82);
    g.quadraticCurveTo(34, 30, 18, -34);
    g.closePath();
  };
  outline(g, robe, 'rgba(8,6,12,0.9)', 4);
  robe();
  g.fillStyle = linear(g, 0, -34, 0, 82, [[0, '#f4f3ee'], [0.75, '#cfd3d8'], [1, 'rgba(200,210,220,0.3)']]);
  g.fill();
  g.strokeStyle = 'rgba(120,130,150,0.5)';
  g.lineWidth = 1;
  for (const x of [-16, -6, 6, 16]) {
    g.beginPath();
    g.moveTo(x * 0.6, -20);
    g.quadraticCurveTo(x, 30, x * 1.4, 80);
    g.stroke();
  }
  // A black sash and the iron chain held out.
  poly(g, [[-22, 4], [22, 4], [23, 10], [-23, 10]], '#1a1a22');
  g.save();
  g.translate(26, -4);
  g.rotate(cast ? -0.6 : 0.2);
  g.fillStyle = '#efefe8';
  g.fillRect(-4, -4, 22, 9);
  g.strokeStyle = '#6b6e78';
  g.lineWidth = 2.4;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.ellipse(24 + i * 7, 2 + Math.sin(i + f) * 3, 4, 2.6, 0.4, 0, TAU);
    g.stroke();
  }
  g.restore();
  // Left hand holds a tattered fan.
  poly(g, [[-26, -6], [-46, -24], [-40, -2]], '#e8e4d8', 'rgba(8,6,12,0.8)', 1.5);
  // Head: chalk white, long tongue, the tall hat.
  outline(g, () => g.arc(0, -46, 14, 0, TAU), 'rgba(8,6,12,0.9)', 4);
  ellipse(g, 0, -46, 14, 15, '#fbfbf6');
  ellipse(g, -5, -48, 2.4, 3.2, '#121218');
  ellipse(g, 5, -48, 2.4, 3.2, '#121218');
  g.beginPath();
  g.moveTo(-3, -38);
  g.quadraticCurveTo(-4, cast ? -6 : -16, 0, cast ? 2 : -10);
  g.quadraticCurveTo(4, cast ? -6 : -16, 3, -38);
  g.fillStyle = '#c9283a';
  g.fill();
  poly(g, [[-15, -58], [15, -58], [8, -110], [-8, -110]], '#f6f5ef', 'rgba(8,6,12,0.9)', 3);
  g.fillStyle = '#1a1a22';
  g.font = 'bold 11px serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  ['一', '見', '生', '財'].forEach((c, i) => g.fillText(c, 0, -100 + i * 11));
  if (cast) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    ellipse(g, 60, -10, 22, 22, radial(g, 60, -10, 0, 24, [[0, 'rgba(160,220,255,0.7)'], [1, 'rgba(80,140,220,0)']]));
    g.restore();
  }
  g.restore();
}

/** 旱魃: the drought demon — a crouched, red-skinned fiend wreathed in heat, one eye on its brow. */
export function droughtDemon(g, f) {
  const stomp = f === 2,
    breathe = f === 1 ? 2 : 0;
  ellipse(g, 0, 70, 56, 12, 'rgba(0,0,0,0.42)');
  g.save();
  g.globalCompositeOperation = 'lighter';
  ellipse(g, 0, 0, 70, 70, radial(g, 0, 0, 10, 74, [[0, 'rgba(255,140,40,0.35)'], [1, 'rgba(255,60,0,0)']]));
  g.restore();
  g.save();
  g.translate(0, stomp ? 5 : 0);
  // Legs crouched wide.
  for (const side of [-1, 1]) {
    poly(g, [[side * 14, 20], [side * 40, 34], [side * 34, 68], [side * 18, 66], [side * 22, 40]], '#8e2a1c', 'rgba(8,6,12,0.95)', 3.5);
    poly(g, [[side * 34, 66], [side * 46, 70], [side * 32, 72]], '#2a120c');
  }
  // Body hunched, ribs showing, cracked skin glowing.
  const body = () => {
    g.beginPath();
    g.moveTo(-36, -18);
    g.quadraticCurveTo(-44, 20, -26, 34);
    g.lineTo(26, 34);
    g.quadraticCurveTo(44, 20, 36, -18);
    g.quadraticCurveTo(0, -38 - breathe, -36, -18);
  };
  outline(g, body, 'rgba(8,6,12,0.95)', 4);
  body();
  g.fillStyle = linear(g, 0, -34, 0, 34, [[0, '#c4402a'], [1, '#6e1c12']]);
  g.fill();
  g.strokeStyle = 'rgba(255,200,90,0.85)';
  g.lineWidth = 1.6;
  for (const [x0, y0, x1, y1] of [[-20, -10, -8, 6], [-8, 6, -14, 22], [14, -14, 6, 2], [6, 2, 18, 18], [-2, -20, 2, -6]]) {
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }
  // Long arms with claws, raised in the stomp.
  for (const side of [-1, 1]) {
    g.save();
    g.translate(side * 34, -12);
    g.rotate(side * (stomp ? -1.1 : 0.4));
    poly(g, [[-6, 0], [6, 0], [5, 40], [-5, 40]], '#a0321e', 'rgba(8,6,12,0.95)', 3);
    for (const c of [-4, 0, 4]) poly(g, [[c - 1.5, 40], [c + 1.5, 40], [c, 49]], '#f2e2b0');
    g.restore();
  }
  // Head: horns, a third eye, a mouth of fire.
  outline(g, () => g.arc(0, -36, 18, 0, TAU), 'rgba(8,6,12,0.95)', 4);
  ellipse(g, 0, -36, 18, 17, radial(g, -4, -42, 2, 22, [[0, '#e0563a'], [1, '#8e2414']]));
  for (const side of [-1, 1]) poly(g, [[side * 10, -48], [side * 26, -72], [side * 16, -46]], '#e8d8b0', 'rgba(8,6,12,0.9)', 2);
  ellipse(g, 0, -46, 3.5, 5, '#ffe070');
  ellipse(g, 0, -46, 1.4, 3, '#2a0800');
  ellipse(g, -7, -36, 3, 2.4, '#ffe070');
  ellipse(g, 7, -36, 3, 2.4, '#ffe070');
  g.beginPath();
  g.ellipse(0, -26, 9, stomp ? 7 : 4, 0, 0, Math.PI);
  g.fillStyle = '#ffb030';
  g.fill();
  for (const x of [-6, -2, 2, 6]) poly(g, [[x - 1.4, -26], [x + 1.4, -26], [x, -22]], '#fff4d0');
  g.restore();
}

// ——— The crossbow, its bolts and what flies about. ———

/** The crossbow seen from behind and above, pointing up (rotation 0 = up). */
export function crossbow(g) {
  const brass = linear(g, -8, 0, 8, 0, [[0, '#724822'], [0.30, '#e2b568'], [0.58, '#f6d297'], [1, '#966738']]);
  const lacquer = linear(g, 0, -18, 0, 8, [[0, '#e77654'], [0.35, '#ad483b'], [1, '#521c26']]);
  ellipse(g, 0, 13, 26, 15, 'rgba(3,6,12,0.32)');
  poly(g, [[-5, -31], [5, -31], [8, 18], [6, 27], [-6, 27], [-8, 18]], linear(g, -8, 0, 8, 0, [[0, '#241517'], [0.4, '#875037'], [0.65, '#5b2d24'], [1, '#2a171b']]), '#0b0b14', 2.5);
  poly(g, [[-5, -29], [5, -29], [4, 11], [-4, 11]], brass, '#4f3222', 0.9);
  poly(g, [[-2.4, -25], [2.4, -25], [2.6, 7], [-2.6, 7]], '#412725');
  // Laminate the swept bow arms with lacquer and bronze fittings.
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-35, -5);
  g.bezierCurveTo(-24, -1, -14, -23, 0, -12);
  g.bezierCurveTo(14, -23, 24, -1, 35, -5);
  g.lineWidth = 9.5;
  g.strokeStyle = '#0e0b16';
  g.stroke();
  g.lineWidth = 6.5;
  g.strokeStyle = lacquer;
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(255,198,140,0.77)';
  g.stroke();
  for (const side of [-1, 1]) {
    ellipse(g, side * 34, -5, 4.2, 3.7, '#c59354');
    ellipse(g, side * 34, -5, 1.4, 1.4, '#ffe5af');
    poly(g, [[side * 13, -16], [side * 18, -14], [side * 18, -9], [side * 13, -11]], '#a67a4a', '#452628', 0.85);
  }
  g.lineWidth = 1.1;
  g.strokeStyle = '#ecdbb7';
  g.beginPath();
  g.moveTo(-34, -5);
  g.lineTo(0, 8);
  g.lineTo(34, -5);
  g.stroke();
  const paper = linear(g, 0, -28, 0, 8, [[0, '#ffe9ad'], [0.5, '#e8ad5b'], [1, '#b67c3f']]);
  poly(g, [[0, -31], [3.2, -25], [3.2, 6], [-3.2, 6], [-3.2, -25]], paper, '#543221', 0.75);
  glyph(g, 0, -16, 6.5, '#a2392b');
  ellipse(g, 0, 17, 10, 10, '#161821');
  ellipse(g, 0, 17, 8.9, 8.9, brass);
  g.strokeStyle = '#513427';
  g.lineWidth = 0.85;
  for (let i = 0; i < 8; i++) {
    const angle = i * TAU / 8;
    const x = Math.cos(angle), y = Math.sin(angle);
    g.beginPath();
    g.moveTo(x * 4.6, 17 + y * 4.6);
    g.lineTo(x * 7.4, 17 + y * 7.4);
    g.stroke();
  }
  ellipse(g, 0, 17, 3.8, 3.8, '#1c2530');
  ellipse(g, -0.8, 16.2, 1.45, 1.45, '#f7d28d');
}

/** The tower the crossbow stands on: a roofed platform over the gate. */
export function gateTower(g) {
  ellipse(g, 0, 18, 48, 4, 'rgba(0,0,0,0.46)');
  poly(g, [[-43, -6], [43, -6], [39, 17], [-39, 17]], linear(g, 0, -6, 0, 18, [[0, '#653738'], [0.52, '#41252b'], [1, '#231a22']]), '#0b0d16', 2);
  for (const x of [-30, -10, 10, 30]) {
    g.fillStyle = '#271c24';
    g.fillRect(x - 2, -2, 4, 17);
    g.fillStyle = '#825747';
    g.fillRect(x - 2, 0, 1, 14);
  }
  poly(g, [[-50, -12], [-36, -9], [36, -9], [50, -12], [43, -1], [-43, -1]], linear(g, 0, -12, 0, 0, [[0, '#74727a'], [0.48, '#3d4653'], [1, '#20232f']]), '#0c101a', 1.6);
  g.strokeStyle = '#b08a61';
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(-48, -11);
  g.quadraticCurveTo(0, -4, 48, -11);
  g.stroke();
  for (let x = -36; x <= 36; x += 8) {
    g.beginPath();
    g.moveTo(x, -7);
    g.lineTo(x, -2);
    g.strokeStyle = '#202532';
    g.stroke();
  }
  poly(g, [[-6, 1], [6, 1], [6, 13], [-6, 13]], '#d9a563', '#502d22', 1.1);
  glyph(g, 0, 7, 6, '#9d302c');
  for (const side of [-1, 1]) {
    ellipse(g, side * 39, 7, 5.5, 7, radial(g, side * 39, 6, 0, 7, [[0, '#ffd186'], [0.36, '#ea7147'], [1, '#9d312e']]));
    g.save();
    g.globalCompositeOperation = 'lighter';
    ellipse(g, side * 39, 7, 13, 13, radial(g, side * 39, 7, 0, 13, [[0, 'rgba(255,170,90,0.42)'], [1, 'rgba(255,90,40,0)']]));
    g.restore();
  }
}

/** A talisman bolt in flight, pointing up; `kind` 'gold' or the blue of the thunder chain. */
export function bolt(g, kind = 'gold') {
  const blue = kind === 'blue';
  g.save();
  g.globalCompositeOperation = 'lighter';
  ellipse(g, 0, 4, 7, 16, radial(g, 0, 4, 0, 16, [[0, blue ? 'rgba(140,200,255,0.8)' : 'rgba(255,210,110,0.75)'], [1, 'rgba(255,160,60,0)']]));
  g.restore();
  poly(g, [[-3.5, -13], [3.5, -13], [3.5, 11], [-3.5, 11]], blue ? '#cfe6ff' : '#f4d65a', blue ? '#2a5a9a' : '#7a5010', 0.8);
  g.strokeStyle = blue ? '#1d4a9a' : '#b3242a';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(0, -10);
  g.lineTo(0, 8);
  g.moveTo(-2, -5);
  g.lineTo(2, -3);
  g.moveTo(-2, 1);
  g.lineTo(2, 3);
  g.stroke();
  poly(g, [[-3.5, -13], [0, -17], [3.5, -13]], blue ? '#ffffff' : '#fff2c0');
}

/** A gob of ghost fire spat at the wall. */
export function spitFire(g) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  ellipse(g, 0, 0, 11, 11, radial(g, 0, 0, 0, 11, [[0, 'rgba(255,255,210,0.95)'], [0.4, 'rgba(120,255,170,0.85)'], [1, 'rgba(40,180,110,0)']]));
  g.restore();
}

/** A soul: a small blue flame flying home. */
export function soul(g) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  ellipse(g, 0, 0, 9, 9, radial(g, 0, 0, 0, 9, [[0, 'rgba(230,248,255,1)'], [0.45, 'rgba(110,190,255,0.85)'], [1, 'rgba(60,110,255,0)']]));
  g.restore();
}

/** A crack in the wall's face where something bit it. */
export function crack(g) {
  g.strokeStyle = 'rgba(10,8,12,0.85)';
  g.lineWidth = 2;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-14, -6);
  g.lineTo(-4, -1);
  g.lineTo(-8, 6);
  g.moveTo(-4, -1);
  g.lineTo(6, -4);
  g.lineTo(14, 3);
  g.moveTo(6, -4);
  g.lineTo(9, -10);
  g.stroke();
}

// ——— Small pictures for particles: each is a texture of its own. ———

export const PARTICLES = {
  /** A soft round glow. */
  glow: (g, s) => ellipse(g, s / 2, s / 2, s / 2, s / 2, radial(g, s / 2, s / 2, 0, s / 2, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']])),
  /** A thin bright streak, for sparks. */
  spark: (g, s) => ellipse(g, s / 2, s / 2, s / 2, s / 9, radial(g, s / 2, s / 2, 0, s / 2, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']])),
  /** A scrap of paper. */
  scrap: (g, s) => {
    poly(g, [[s * 0.15, s * 0.2], [s * 0.85, s * 0.1], [s * 0.8, s * 0.9], [s * 0.2, s * 0.8]], '#ffffff');
  },
  /** A puff of smoke, lumpy. */
  smoke: (g, s) => {
    for (const [x, y, r] of [[0.4, 0.5, 0.3], [0.6, 0.45, 0.28], [0.5, 0.62, 0.25]])
      ellipse(g, s * x, s * y, s * r, s * r, radial(g, s * x, s * y, 0, s * r, [[0, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]));
  }
};
