// 美术：所有的画都在这里用代码画在 2D 画布上——纸人、鬼火、僵尸、灯笼鬼、鬼新娘、三位首领、符弩、符箭、魂珠，
// 还有三夜的路面。没有图片文件：每帧是一个 draw(g) 函数，在以帧中心为原点、以规则单位为长度的坐标里画。
// atlas.mjs 把它们按 2 倍分辨率排进一张图集，交给引擎做纹理。
// The art: everything is painted here in code on a 2D canvas — paper dolls, ghost fire, jiangshi, lantern ghosts, the
// ghost bride, the three wardens, the crossbow, its bolts, souls, and the road of each night. There are no picture
// files: each frame is a draw(g) function in coordinates centred on the frame, in rule units. atlas.mjs packs them at
// twice that resolution into one atlas and hands it to the engine as a texture.

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
  poly(g, [[-9, 7], [9, 7], [10, 10], [-10, 10]], '#b3242a');
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
  ellipse(g, 0, -12, 9, 9, '#f7f2e6');
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
  // The stock.
  poly(g, [[-6, -30], [6, -30], [8, 26], [-8, 26]], '#6a3e1c', 'rgba(8,6,12,0.95)', 3);
  g.fillStyle = 'rgba(255,220,160,0.18)';
  g.fillRect(-2, -28, 3, 52);
  // The bow arms, lacquered red with gold tips.
  g.lineCap = 'round';
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(8,6,12,0.95)';
  g.beginPath();
  g.moveTo(-34, -6);
  g.quadraticCurveTo(0, -30, 34, -6);
  g.stroke();
  g.lineWidth = 5;
  g.strokeStyle = '#b3242a';
  g.stroke();
  for (const side of [-1, 1]) ellipse(g, side * 34, -6, 3.5, 3.5, '#e3b84a');
  // The string, and a talisman bolt laid in it.
  g.lineWidth = 1.2;
  g.strokeStyle = '#efe6cf';
  g.beginPath();
  g.moveTo(-34, -6);
  g.lineTo(0, 8);
  g.lineTo(34, -6);
  g.stroke();
  poly(g, [[-3, -26], [3, -26], [3, 6], [-3, 6]], '#f1d14a', '#6e4c10', 0.8);
  // A bronze bagua plate at the grip.
  ellipse(g, 0, 16, 9, 9, '#b98a34');
  g.strokeStyle = '#5e4310';
  g.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    g.beginPath();
    g.moveTo(Math.cos(a) * 4, 16 + Math.sin(a) * 4);
    g.lineTo(Math.cos(a) * 8, 16 + Math.sin(a) * 8);
    g.stroke();
  }
  ellipse(g, 0, 16, 3, 3, '#1a1a22');
}

/** The tower the crossbow stands on: a roofed platform over the gate. */
export function gateTower(g) {
  ellipse(g, 0, 26, 50, 8, 'rgba(0,0,0,0.4)');
  poly(g, [[-44, -4], [44, -4], [40, 24], [-40, 24]], '#5a3022', 'rgba(8,6,12,0.95)', 3);
  for (const x of [-30, -10, 10, 30]) {
    g.fillStyle = '#3e1e14';
    g.fillRect(x - 2, -2, 4, 24);
  }
  poly(g, [[-48, -10], [48, -10], [44, -2], [-44, -2]], '#2a2a32', 'rgba(8,6,12,0.95)', 2);
  for (const side of [-1, 1]) {
    ellipse(g, side * 40, 8, 6, 8, '#c8302a');
    g.save();
    g.globalCompositeOperation = 'lighter';
    ellipse(g, side * 40, 8, 14, 14, radial(g, side * 40, 8, 0, 14, [[0, 'rgba(255,170,90,0.6)'], [1, 'rgba(255,90,40,0)']]));
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

// ——— The roads of the three nights, with the wall at the bottom. In rule units: 540 × 900. ———

/** A small seeded random for the painting, so the road looks the same each time. */
function painterChance(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stonePath(g, r, { tone = [46, 50, 62], width = 300 } = {}) {
  const left = 270 - width / 2;
  g.fillStyle = `rgb(${tone.join(',')})`;
  g.fillRect(left, 0, width, 812);
  for (let y = 0; y < 812; y += 28) {
    const offset = (y / 28) % 2 ? 0 : 20;
    for (let x = left - offset; x < left + width; x += 40) {
      const shade = 0.85 + r() * 0.3;
      g.fillStyle = `rgb(${tone.map((c) => Math.round(c * shade)).join(',')})`;
      g.fillRect(Math.max(left, x + 1), y + 1, Math.min(38, left + width - x - 1), 26);
    }
  }
  // Cracks and moss.
  g.strokeStyle = 'rgba(10,10,14,0.5)';
  g.lineWidth = 1.2;
  for (let i = 0; i < 40; i++) {
    const x = left + r() * width,
      y = r() * 800;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 30, y + r() * 20);
    g.stroke();
  }
  for (let i = 0; i < 30; i++) ellipse(g, left + r() * width, r() * 800, 4 + r() * 8, 2 + r() * 4, 'rgba(60,90,60,0.35)');
  // The edges of the road.
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(left - 6, 0, 6, 812);
  g.fillRect(left + width, 0, 6, 812);
}

function lanternPost(g, x, y, colour = '#c8302a', glowColour = 'rgba(255,150,80,') {
  g.fillStyle = '#2a1c14';
  g.fillRect(x - 2, y - 40, 4, 44);
  g.fillRect(x - 10, y - 42, 20, 3);
  ellipse(g, x, y - 30, 7, 9, colour);
  g.save();
  g.globalCompositeOperation = 'lighter';
  ellipse(g, x, y - 30, 40, 40, radial(g, x, y - 30, 0, 40, [[0, glowColour + '0.45)'], [1, glowColour + '0)']]));
  g.restore();
}

function wallAndGate(g) {
  // The battlements along the bottom: grey brick, crenellations, red lanterns, the gate's roof in the middle.
  g.fillStyle = '#3a3c46';
  g.fillRect(0, 812, 540, 88);
  for (let y = 818; y < 900; y += 12)
    for (let x = ((y - 818) / 12) % 2 ? -14 : 0; x < 540; x += 28) {
      g.fillStyle = `rgba(${70 + ((x * 7 + y) % 18)},${72 + ((x * 3 + y) % 14)},${84 + ((x + y) % 16)},1)`;
      g.fillRect(x + 1, y + 1, 26, 10);
    }
  for (let x = 0; x < 540; x += 36) {
    g.fillStyle = '#4a4c58';
    g.fillRect(x + 4, 798, 22, 18);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(x + 4, 798, 22, 3);
  }
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillRect(0, 812, 540, 4);
  for (const x of [60, 150, 390, 480]) lanternPost(g, x, 842);
}

function fog(g, colour) {
  g.fillStyle = linear(g, 0, 0, 0, 260, [[0, colour.replace('A', '0.75')], [1, colour.replace('A', '0')]]);
  g.fillRect(0, 0, 540, 260);
}

/** 城隍庙外: the road outside the city god's temple — red walls, incense, stone lions. */
function temple(g) {
  const r = painterChance(11);
  g.fillStyle = '#141824';
  g.fillRect(0, 0, 540, 900);
  stonePath(g, r);
  // Red temple walls on both sides with grey tiled tops.
  for (const side of [0, 1]) {
    const x = side ? 425 : 0;
    g.fillStyle = linear(g, x, 0, x + 115, 0, side ? [[0, '#5e1c1c'], [1, '#3a1010']] : [[0, '#3a1010'], [1, '#5e1c1c']]);
    g.fillRect(x, 0, 115, 812);
    g.fillStyle = '#23252e';
    g.fillRect(side ? 425 : 100, 0, 15, 812);
    for (let y = 0; y < 812; y += 10) {
      g.fillStyle = y % 20 ? '#30323c' : '#1c1e26';
      g.fillRect(side ? 425 : 100, y, 15, 6);
    }
  }
  // Incense burner far up the road, stone lions near the gate.
  ellipse(g, 270, 120, 34, 12, '#2a2a30');
  poly(g, [[244, 120], [296, 120], [290, 80], [250, 80]], '#4a3a2a', '#1a140e', 2);
  for (const x of [256, 270, 284]) {
    g.strokeStyle = 'rgba(220,210,200,0.35)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x, 78);
    g.bezierCurveTo(x - 8, 60, x + 8, 40, x, 20);
    g.stroke();
  }
  for (const x of [140, 400]) {
    ellipse(g, x, 760, 20, 8, 'rgba(0,0,0,0.4)');
    poly(g, [[x - 16, 760], [x + 16, 760], [x + 12, 724], [x - 12, 724]], '#5a5c66', '#1c1d24', 2);
    ellipse(g, x, 716, 14, 12, '#686a74');
  }
  for (const y of [180, 380, 580]) {
    lanternPost(g, 118, y);
    lanternPost(g, 422, y);
  }
  fog(g, 'rgba(30,40,70,A)');
  wallAndGate(g);
}

/** 乱葬岗: the graveyard hill — earth, crooked tombstones, bare trees, paper money. */
function graves(g) {
  const r = painterChance(23);
  g.fillStyle = linear(g, 0, 0, 0, 812, [[0, '#16201c'], [1, '#2a2a22']]);
  g.fillRect(0, 0, 540, 900);
  for (let i = 0; i < 400; i++) ellipse(g, r() * 540, r() * 812, 2 + r() * 6, 1 + r() * 3, `rgba(${60 + r() * 30},${56 + r() * 20},${40 + r() * 16},0.6)`);
  // A worn path.
  g.fillStyle = 'rgba(80,70,52,0.55)';
  g.beginPath();
  g.moveTo(190, 0);
  g.bezierCurveTo(140, 300, 400, 500, 200, 812);
  g.lineTo(340, 812);
  g.bezierCurveTo(520, 500, 260, 300, 350, 0);
  g.fill();
  // Tombstones, leaning.
  for (let i = 0; i < 22; i++) {
    const x = r() * 520 + 10,
      y = 60 + r() * 700,
      lean = (r() - 0.5) * 0.4;
    g.save();
    g.translate(x, y);
    g.rotate(lean);
    ellipse(g, 0, 2, 16, 5, 'rgba(0,0,0,0.4)');
    poly(g, [[-10, 0], [10, 0], [10, -26], [0, -32], [-10, -26]], '#5a5e5a', '#1a1c1a', 2);
    g.fillStyle = 'rgba(20,20,20,0.6)';
    g.fillRect(-2, -24, 4, 18);
    g.restore();
  }
  // Bare trees at the sides.
  for (const [x, y, s] of [[40, 200, 1], [500, 340, 1.2], [30, 560, 0.9], [510, 680, 1]]) {
    g.strokeStyle = '#120e0c';
    g.lineCap = 'round';
    const branch = (bx, by, angle, length, width) => {
      if (length < 8) return;
      const ex = bx + Math.cos(angle) * length,
        ey = by + Math.sin(angle) * length;
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(ex, ey);
      g.stroke();
      branch(ex, ey, angle - 0.45 - r() * 0.2, length * 0.68, width * 0.65);
      branch(ex, ey, angle + 0.4 + r() * 0.2, length * 0.62, width * 0.65);
    };
    branch(x, y, -Math.PI / 2, 60 * s, 9 * s);
  }
  // Paper money scattered.
  for (let i = 0; i < 50; i++) {
    g.save();
    g.translate(r() * 540, r() * 800);
    g.rotate(r() * TAU);
    g.fillStyle = r() < 0.5 ? 'rgba(230,220,190,0.7)' : 'rgba(220,180,90,0.7)';
    g.fillRect(-4, -3, 8, 6);
    g.restore();
  }
  fog(g, 'rgba(40,70,60,A)');
  wallAndGate(g);
}

/** 鬼市: the ghost market — a street of shuttered stalls under green lanterns, banners hanging. */
function market(g) {
  const r = painterChance(37);
  g.fillStyle = '#0f1218';
  g.fillRect(0, 0, 540, 900);
  stonePath(g, r, { tone: [40, 44, 50], width: 330 });
  // Stalls on both sides: roofs, counters, banners.
  for (const side of [0, 1])
    for (let y = 40; y < 780; y += 120) {
      const x = side ? 440 : 0;
      g.fillStyle = '#2a1e18';
      g.fillRect(x, y, 100, 96);
      poly(g, side ? [[430, y - 6], [540, y - 6], [540, y + 14], [440, y + 10]] : [[0, y - 6], [110, y - 6], [100, y + 10], [0, y + 14]], '#1e2028', '#0a0a0e', 2);
      g.fillStyle = '#4a3020';
      g.fillRect(side ? 440 : 10, y + 60, 90, 10);
      const banner = side ? 446 : 82;
      g.fillStyle = r() < 0.5 ? '#6a1a1e' : '#1e3a5a';
      g.fillRect(banner, y + 14, 12, 40);
      g.fillStyle = 'rgba(240,220,180,0.75)';
      g.font = 'bold 9px serif';
      g.textAlign = 'center';
      ['當', '茶', '酒', '藥', '燭', '紙'].forEach((c, i) => i === Math.floor(r() * 6) && g.fillText(c, banner + 6, y + 36));
      lanternPost(g, side ? 432 : 108, y + 70, '#2aa070', 'rgba(90,255,170,');
    }
  // Strings of lanterns across the road.
  for (const y of [160, 420, 660]) {
    g.strokeStyle = 'rgba(20,16,14,0.9)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(100, y);
    g.quadraticCurveTo(270, y + 40, 440, y);
    g.stroke();
    for (let i = 1; i < 8; i++) {
      const t = i / 8,
        x = 100 + t * 340,
        yy = y + 4 * 40 * t * (1 - t);
      ellipse(g, x, yy + 8, 5, 6, i % 2 ? '#2aa070' : '#c8302a');
      g.save();
      g.globalCompositeOperation = 'lighter';
      ellipse(g, x, yy + 8, 16, 16, radial(g, x, yy + 8, 0, 16, [[0, i % 2 ? 'rgba(90,255,170,0.35)' : 'rgba(255,140,80,0.35)'], [1, 'rgba(0,0,0,0)']]));
      g.restore();
    }
  }
  fog(g, 'rgba(30,60,50,A)');
  wallAndGate(g);
}

export const GROUNDS = { temple, graves, market };

/** A dark edge around the field, drawn once and laid over everything but the interface. */
export function vignette(g, w, h) {
  g.fillStyle = radial(g, w / 2, h * 0.55, Math.min(w, h) * 0.35, Math.max(w, h) * 0.75, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,8,0.72)']]);
  g.fillRect(0, 0, w, h);
}
