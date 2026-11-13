// The campus map: a bird's-eye painting with box-shaped buildings drawn in
// oblique projection, so the map reads as a small model of the school.
import { rgba, shade, mix, poly, ellipse, smooth, seeded } from './draw.mjs';
import { PLACES } from '../data/places.mjs';

const LIGHT = {
  day: { grass: ['#a8e0a0', '#7fcb86'], path: '#f3e9d6', wash: null, lit: 0 },
  dusk: { grass: ['#c9cf8f', '#9bb37a'], path: '#f4d9b8', wash: ['#ff8a5a', 0.16], lit: 0.5 },
  night: { grass: ['#3f6a78', '#2f5564'], path: '#8f9bc0', wash: ['#10164a', 0.38], lit: 1 },
};

/** A building as a box: (x, y) is the middle of its front edge on the ground. */
function block(g, x, y, w, h, d, wall, roof, lit) {
  const sx = d * 0.55,
    sy = d * 0.5; // how far the depth axis leans up and to the right
  g.fillStyle = rgba('#1a2a40', 0.2);
  g.fill(
    poly([
      [x - w / 2 + 10, y + 8],
      [x + w / 2 + 14, y + 8],
      [x + w / 2 + sx + 24, y - sy + 10],
      [x - w / 2 + sx + 20, y - sy + 10],
    ]),
  );
  g.fillStyle = shade(wall, -0.16);
  g.fill(
    poly([
      [x + w / 2, y],
      [x + w / 2 + sx, y - sy],
      [x + w / 2 + sx, y - sy - h],
      [x + w / 2, y - h],
    ]),
  );
  const front = g.createLinearGradient(0, y - h, 0, y);
  front.addColorStop(0, shade(wall, 0.1));
  front.addColorStop(1, wall);
  g.fillStyle = front;
  g.fillRect(x - w / 2, y - h, w, h);
  g.fillStyle = roof;
  g.fill(
    poly([
      [x - w / 2, y - h],
      [x + w / 2, y - h],
      [x + w / 2 + sx, y - h - sy],
      [x - w / 2 + sx, y - h - sy],
    ]),
  );
  g.strokeStyle = rgba('#ffffff', 0.55);
  g.lineWidth = 1.5;
  g.stroke(
    poly([
      [x - w / 2, y - h],
      [x + w / 2, y - h],
      [x + w / 2 + sx, y - h - sy],
      [x - w / 2 + sx, y - h - sy],
    ]),
  );
  // Windows on the front.
  const cols = Math.max(2, Math.floor(w / 26)),
    rows = Math.max(1, Math.floor(h / 30));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      g.fillStyle = lit && (r * 7 + c * 3) % 5 < 3 ? rgba('#ffe7a0', 0.6 + lit * 0.4) : rgba('#ffffff', 0.55);
      g.fillRect(x - w / 2 + 9 + c * ((w - 18) / cols) + 2, y - h + 10 + r * ((h - 14) / rows), (w - 18) / cols - 8, (h - 14) / rows - 9);
    }
}

function treeDot(g, x, y, r, c) {
  g.fillStyle = rgba('#1a2a40', 0.18);
  g.fill(ellipse(x + 4, y + r * 0.5, r, r * 0.45));
  g.fillStyle = shade(c, -0.15);
  g.fill(ellipse(x, y, r, r * 0.9));
  g.fillStyle = c;
  g.fill(ellipse(x - r * 0.2, y - r * 0.25, r * 0.75, r * 0.65));
}

/** Paint the whole campus for a time of day in a 1280 x 720 space. */
export function drawCampusMap(g, light = 'day') {
  const t = LIGHT[light],
    rnd = seeded(101),
    at = id => PLACES[id].map;
  const lawn = g.createLinearGradient(0, 0, 0, 720);
  lawn.addColorStop(0, t.grass[0]);
  lawn.addColorStop(1, t.grass[1]);
  g.fillStyle = lawn;
  g.fillRect(0, 0, 1280, 720);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = rgba('#ffffff', 0.05 + rnd() * 0.05);
    g.fill(ellipse(rnd() * 1280, rnd() * 720, 60 + rnd() * 120, 30 + rnd() * 50));
  }

  // Paths from the central plaza out to every place.
  const plaza = [640, 470];
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const pass of [
    [26, shade(t.path, -0.18)],
    [20, t.path],
  ]) {
    g.strokeStyle = pass[1];
    g.lineWidth = pass[0];
    for (const id of Object.keys(PLACES)) {
      const [x, y] = at(id);
      g.stroke(
        smooth(
          [
            [plaza[0], plaza[1]],
            [(plaza[0] + x) / 2 + (y - plaza[1]) * 0.12, (plaza[1] + y) / 2 + 14],
            [x, y + 16],
          ],
          false,
        ),
      );
    }
  }
  g.fillStyle = shade(t.path, -0.18);
  g.fill(ellipse(plaza[0], plaza[1] + 3, 96, 50));
  g.fillStyle = t.path;
  g.fill(ellipse(plaza[0], plaza[1], 92, 46));
  // Fountain in the plaza and a pond.
  g.fillStyle = '#dfe9f5';
  g.fill(ellipse(640, 470, 38, 19));
  g.fillStyle = '#7fd3ff';
  g.fill(ellipse(640, 469, 30, 14));
  g.fillStyle = '#ffffff';
  g.fill(ellipse(640, 462, 6, 9));
  g.fillStyle = mix('#6fc3ff', t.grass[1], 0.25);
  g.fill(
    smooth([
      [1130, 660],
      [1190, 640],
      [1262, 652],
      [1270, 700],
      [1200, 716],
      [1140, 706],
    ]),
  );
  g.fillStyle = rgba('#ffffff', 0.35);
  g.fill(ellipse(1200, 672, 34, 7));

  const pink = light === 'night' ? '#c98ab8' : '#ffb7cf',
    green = light === 'night' ? '#3f8a70' : '#5fbf7a';
  for (let i = 0; i < 46; i++) {
    const x = rnd() * 1280,
      y = 60 + rnd() * 640;
    if (Object.keys(PLACES).some(id => Math.abs(at(id)[0] - x) < 120 && Math.abs(at(id)[1] - 40 - y) < 90) || Math.hypot(x - 640, y - 470) < 120)
      continue;
    treeDot(g, x, y, 13 + rnd() * 10, rnd() < 0.3 ? pink : green);
  }

  const lit = t.lit;
  // Buildings from the back of the map to the front so nearer ones overlap farther ones.
  const draw = {
    rooftop() {
      const [x, y] = at('rooftop');
      block(g, x, y, 120, 96, 60, '#e9eef7', '#c5cfe2', lit);
      g.fillStyle = '#f8fafc';
      g.fill(
        smooth(
          [
            [x - 6, y - 126, 1],
            [x + 4, y - 160],
            [x + 40, y - 172],
            [x + 70, y - 154],
            [x + 74, y - 126, 1],
          ],
          true,
          0.5,
        ),
      );
      g.fillStyle = '#2a2f48';
      g.fillRect(x + 28, y - 168, 12, 40);
    },
    library() {
      const [x, y] = at('library');
      block(g, x, y, 170, 70, 70, '#f1e4cf', '#b5524f', lit);
      g.fillStyle = '#b5524f';
      g.fill(
        poly([
          [x - 40, y - 70],
          [x, y - 104],
          [x + 40, y - 70],
        ]),
      );
      g.fillStyle = '#f7f1e3';
      for (const dx of [-24, -8, 8, 24]) g.fillRect(x + dx - 3, y - 64, 6, 64);
    },
    dorm() {
      const [x, y] = at('dorm');
      block(g, x, y, 130, 84, 50, '#dfe9fb', '#7fa3e8', lit);
    },
    street() {
      const [x, y] = at('street');
      const colors = ['#f4a3bd', '#8fd3ff', '#ffd76a', '#b08cff'];
      colors.forEach((c, i) => {
        const bx = x - 78 + i * 52;
        block(g, bx, y + (i % 2) * 6, 46, 44, 34, '#fffaf2', c, lit);
        g.fillStyle = c;
        g.fill(
          poly([
            [bx - 25, y - 26 + (i % 2) * 6],
            [bx + 25, y - 26 + (i % 2) * 6],
            [bx + 29, y - 14 + (i % 2) * 6],
            [bx - 29, y - 14 + (i % 2) * 6],
          ]),
        );
      });
    },
    classroom() {
      const [x, y] = at('classroom');
      block(g, x, y, 190, 80, 56, '#f6eedd', '#d98a6a', lit);
      g.fillStyle = '#f6eedd';
      g.fillRect(x - 16, y - 108, 32, 30);
      g.fillStyle = '#d98a6a';
      g.fill(
        poly([
          [x - 22, y - 108],
          [x, y - 128],
          [x + 22, y - 108],
        ]),
      );
      g.fillStyle = '#fffbea';
      g.fill(ellipse(x, y - 94, 8, 8));
    },
    field() {
      const [x, y] = at('field');
      g.fillStyle = rgba('#1a2a40', 0.18);
      g.fill(ellipse(x + 6, y - 6, 132, 66));
      g.fillStyle = '#d9634f';
      g.fill(ellipse(x, y - 14, 128, 62));
      g.strokeStyle = rgba('#ffffff', 0.8);
      g.lineWidth = 1.5;
      for (const k of [0.9, 0.8, 0.7]) g.stroke(ellipse(x, y - 14, 128 * k, 62 * k));
      g.fillStyle = '#6fba72';
      g.fill(ellipse(x, y - 14, 80, 36));
      g.strokeStyle = '#ffffff';
      g.beginPath();
      g.moveTo(x, y - 50);
      g.lineTo(x, y + 22);
      g.stroke();
    },
    artroom() {
      const [x, y] = at('artroom');
      block(g, x, y, 120, 56, 50, '#f7f3ea', '#7cc47a', lit);
      for (const [dx, c] of [
        [-30, '#e8455f'],
        [0, '#f2c14e'],
        [30, '#6fc3ff'],
      ]) {
        g.fillStyle = c;
        g.fill(ellipse(x + dx + 28, y - 82, 9, 6));
      }
    },
    lab() {
      const [x, y] = at('lab');
      block(g, x, y, 130, 74, 50, '#cfd9ee', '#4a5a8a', lit || 0.6);
      g.fillStyle = '#7df0d0';
      g.fillRect(x - 50, y - 12, 100, 3);
    },
    musicroom() {
      const [x, y] = at('musicroom');
      block(g, x, y, 110, 54, 46, '#e7defa', '#8a6fd0', lit);
      g.fillStyle = '#ffffff';
      g.font = '700 30px serif';
      g.textAlign = 'center';
      g.fillText('♪', x + 24, y - 66);
    },
    cafe() {
      const [x, y] = at('cafe');
      block(g, x, y, 110, 50, 46, '#fff1dc', '#8a5f40', lit || 0.3);
      g.fillStyle = '#e8455f';
      for (let i = 0; i < 5; i++) {
        g.fillStyle = i % 2 ? '#ffffff' : '#e8455f';
        g.fill(
          poly([
            [x - 55 + i * 22, y - 30],
            [x - 33 + i * 22, y - 30],
            [x - 31 + i * 22, y - 16],
            [x - 57 + i * 22, y - 16],
          ]),
        );
      }
    },
    gate() {
      const [x, y] = at('gate');
      for (const s of [-1, 1]) block(g, x + s * 62, y, 28, 70, 20, '#b9584f', '#efe6da', 0);
      g.fillStyle = '#8f3f3b';
      g.fillRect(x - 76, y - 84, 152, 14);
      for (const s of [-1, 1]) for (let i = 1; i <= 3; i++) treeDot(g, x + s * (90 + i * 44), y - 20 - i * 26, 20, pink);
    },
  };
  for (const id of Object.keys(PLACES).sort((a, b) => at(a)[1] - at(b)[1])) draw[id]();

  if (t.wash) {
    g.fillStyle = rgba(t.wash[0], t.wash[1]);
    g.fillRect(0, 0, 1280, 720);
  }
  if (lit)
    for (const id of Object.keys(PLACES)) {
      const [x, y] = at(id),
        gl = g.createRadialGradient(x, y - 30, 4, x, y - 30, 120);
      gl.addColorStop(0, rgba('#ffe7a0', 0.22 * lit));
      gl.addColorStop(1, rgba('#ffe7a0', 0));
      g.fillStyle = gl;
      g.fillRect(x - 120, y - 150, 240, 240);
    }
}
