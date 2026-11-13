// Background painters. Every place is painted as three depth layers in a
// 1280 x 720 space: `far` (sky and distance), `mid` (the place itself) and
// `near` (out-of-focus foreground). The game slides the layers against each
// other to give the flat pictures depth.
import { rgba, shade, mix, rrect, ellipse, poly, smooth, star, seeded } from './draw.mjs';

export const SCENE_W = 1280;
export const SCENE_H = 720;

/** Light for the three times of day. */
const TIMES = {
  day: { sky: ['#6fb7ff', '#bfe6ff', '#f2fbff'], sun: '#fff6d8', wash: null, glow: 0, cloud: '#ffffff', far: '#9fb9dd' },
  dusk: { sky: ['#5560c0', '#f08f8a', '#ffd9a0'], sun: '#ffc27a', wash: '#ff8a5a', dim: 0.24, glow: 0.35, cloud: '#ffc9b0', far: '#8a78b8' },
  night: { sky: ['#0b1030', '#1c2460', '#3a3f8a'], sun: '#dfe6ff', wash: '#10164a', dim: 0.55, glow: 1, cloud: '#3a4390', far: '#2a2f66' },
};

const fill = (g, path, c) => {
  g.fillStyle = c;
  g.fill(path);
};
const box = (g, x, y, w, h, c) => {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
};
function vgrad(g, y0, y1, stops) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
  return gr;
}
function glow(g, x, y, r, c, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(c, a));
  gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Sky with clouds by day, a low sun at dusk, and moon and stars at night. */
function sky(g, tod, horizon = 460) {
  const t = TIMES[tod],
    rnd = seeded(7);
  box(g, 0, 0, SCENE_W, SCENE_H, vgrad(g, 0, horizon, t.sky));
  if (tod === 'night') {
    for (let i = 0; i < 170; i++) {
      const x = rnd() * SCENE_W,
        y = rnd() * horizon * 0.95,
        r = rnd() * 1.5 + 0.3;
      g.fillStyle = rgba('#ffffff', 0.35 + rnd() * 0.65);
      g.fill(i % 17 ? ellipse(x, y, r, r) : star(x, y, r * 3.4, r * 1.2, 4));
    }
    // A pale band of the galaxy.
    g.save();
    g.translate(640, 150);
    g.rotate(-0.35);
    const band = g.createLinearGradient(0, -90, 0, 90);
    band.addColorStop(0, rgba('#b9a8ff', 0));
    band.addColorStop(0.5, rgba('#b9a8ff', 0.16));
    band.addColorStop(1, rgba('#b9a8ff', 0));
    box(g, -900, -90, 1800, 180, band);
    g.restore();
    glow(g, 1010, 110, 150, '#cfd8ff', 0.4);
    fill(g, ellipse(1010, 110, 38, 38), '#f6f8ff');
    fill(g, ellipse(996, 100, 34, 34), rgba(t.sky[0], 0.92));
  } else {
    const sx = tod === 'dusk' ? 900 : 1040,
      sy = tod === 'dusk' ? horizon - 60 : 110;
    glow(g, sx, sy, tod === 'dusk' ? 420 : 300, t.sun, tod === 'dusk' ? 0.85 : 0.75);
    fill(g, ellipse(sx, sy, 34, 34), rgba('#ffffff', 0.92));
  }
  for (let i = 0; i < 7; i++) {
    const x = rnd() * SCENE_W,
      y = 50 + rnd() * (horizon - 220),
      w = 110 + rnd() * 170;
    g.save();
    g.globalAlpha = tod === 'night' ? 0.35 : 0.8;
    for (let k = 0; k < 5; k++) fill(g, ellipse(x + (k - 2) * w * 0.22, y + Math.sin(k * 1.7) * 7, w * 0.22, 15 + (k % 3) * 7), t.cloud);
    g.restore();
  }
}

/** A distant row of campus buildings and trees along the horizon. */
function skyline(g, tod, base = 470, seed = 3, tall = 1) {
  const t = TIMES[tod],
    rnd = seeded(seed);
  for (let x = -20; x < SCENE_W;) {
    const w = 70 + rnd() * 120,
      h = (50 + rnd() * 120) * tall;
    box(g, x, base - h, w, h + 4, mix(t.far, t.sky[1], 0.25 + rnd() * 0.2));
    for (let wy = base - h + 12; wy < base - 14; wy += 20)
      for (let wx = x + 10; wx < x + w - 12; wx += 18) {
        const lit = t.glow && rnd() < 0.3 + t.glow * 0.35;
        box(g, wx, wy, 9, 11, lit ? rgba('#ffe7a0', 0.9) : rgba('#ffffff', 0.22));
      }
    x += w + rnd() * 22;
  }
  for (let x = -30; x < SCENE_W; x += 44 + rnd() * 30) fill(g, ellipse(x, base - 8, 34 + rnd() * 16, 26 + rnd() * 14), mix(t.far, '#3f7a5a', 0.45));
}

/** Tint a finished layer for the time of day. */
function wash(g, tod, strength = 1) {
  const t = TIMES[tod];
  if (!t.wash) return;
  // source-atop keeps the tint off the transparent parts (window openings).
  g.save();
  g.globalCompositeOperation = 'source-atop';
  box(g, 0, 0, SCENE_W, SCENE_H, rgba(t.wash, t.dim * strength));
  g.restore();
}

/** Floor receding to a vanishing point, with board or tile lines. */
function floor(g, y, c, { lines = 14, rows = 7, vx = 640, lineC } = {}) {
  box(g, 0, y, SCENE_W, SCENE_H - y, vgrad(g, y, SCENE_H, [shade(c, -0.12), c, shade(c, 0.1)]));
  g.strokeStyle = lineC ?? rgba(shade(c, -0.5), 0.3);
  g.lineWidth = 1.3;
  g.beginPath();
  for (let i = -lines; i <= lines; i++) {
    g.moveTo(vx + i * 38, y);
    g.lineTo(vx + i * 210, SCENE_H);
  }
  for (let i = 1; i <= rows; i++) {
    const yy = y + (SCENE_H - y) * (i / rows) ** 1.9;
    g.moveTo(0, yy);
    g.lineTo(SCENE_W, yy);
  }
  g.stroke();
}

/** Cut a window into an already painted wall, with frame, bars and sill. */
function windowHole(g, x, y, w, h, frame = '#f4efe6', bars = 2) {
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fillRect(x, y, w, h);
  g.restore();
  g.fillStyle = rgba('#ffffff', 0.1);
  g.fillRect(x, y, w, h);
  g.strokeStyle = frame;
  g.lineWidth = 9;
  g.strokeRect(x, y, w, h);
  g.lineWidth = 5;
  g.beginPath();
  for (let i = 1; i <= bars; i++) {
    g.moveTo(x + (w * i) / (bars + 1), y);
    g.lineTo(x + (w * i) / (bars + 1), y + h);
  }
  g.moveTo(x, y + h * 0.42);
  g.lineTo(x + w, y + h * 0.42);
  g.stroke();
  box(g, x - 12, y + h, w + 24, 12, shade(frame, -0.1));
}

/** Slanted shafts of light from a window. */
function shafts(g, x, y, w, tod, a = 0.16) {
  if (tod === 'night') return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createLinearGradient(x, y, x + 260, y + 520);
  gr.addColorStop(0, rgba(TIMES[tod].sun, a));
  gr.addColorStop(1, rgba(TIMES[tod].sun, 0));
  fill(
    g,
    poly([
      [x, y],
      [x + w, y],
      [x + w + 420, SCENE_H],
      [x + 200, SCENE_H],
    ]),
    gr,
  );
  g.restore();
}

function lamp(g, x, y, r, tod, c = '#ffd98a') {
  if (TIMES[tod].glow) glow(g, x, y, r, c, 0.25 + TIMES[tod].glow * 0.4);
}

/** A tree with layered blossom or leaf clumps. */
function tree(g, x, y, s, c, rnd, trunk = '#6b4a3a') {
  fill(
    g,
    poly([
      [x - 9 * s, y],
      [x - 5 * s, y - 120 * s],
      [x + 5 * s, y - 120 * s],
      [x + 10 * s, y],
    ]),
    trunk,
  );
  for (let i = 0; i < 16; i++) {
    const a = rnd() * 6.28,
      r = rnd() * 78 * s;
    fill(
      g,
      ellipse(x + Math.cos(a) * r, y - 170 * s + Math.sin(a) * r * 0.62, (40 + rnd() * 26) * s, (30 + rnd() * 20) * s),
      mix(c, i % 3 ? '#ffffff' : shade(c, -0.25), 0.1 + rnd() * 0.25),
    );
  }
}

function books(g, x, y, w, h, rnd) {
  box(g, x, y, w, h, '#5a3d2e');
  const palette = ['#c94f5d', '#3f6fb5', '#e3b04b', '#4f9d7a', '#8a5fb0', '#e7e1d2', '#2f3a63', '#d98aa5'];
  for (let bx = x + 3; bx < x + w - 6;) {
    const bw = 6 + rnd() * 9,
      bh = h * (0.68 + rnd() * 0.26);
    box(g, bx, y + h - bh - 2, bw, bh, palette[Math.floor(rnd() * palette.length)]);
    box(g, bx, y + h - bh + 6, bw, 2, rgba('#ffffff', 0.35));
    bx += bw + 1;
  }
}

/** Soften a foreground layer: paint with a blur filter where the browser has one. */
function blurred(g, px, draw) {
  g.save();
  if ('filter' in g) g.filter = `blur(${px}px)`;
  draw();
  g.restore();
}

// ------------------------------------------------------------------ places

const SCENES = {
  gate: {
    far(g, tod) {
      sky(g, tod, 430);
      skyline(g, tod, 430, 5, 1.2);
      // Main hall with a clock tower.
      const c = mix(TIMES[tod].far, '#f1e6da', 0.55);
      box(g, 470, 250, 340, 190, c);
      box(g, 600, 150, 80, 110, c);
      fill(
        g,
        poly([
          [590, 150],
          [640, 96],
          [690, 150],
        ]),
        mix(c, '#b5524f', 0.6),
      );
      fill(g, ellipse(640, 196, 22, 22), '#fffbea');
      g.strokeStyle = '#5a4a4a';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(640, 196);
      g.lineTo(640, 181);
      g.moveTo(640, 196);
      g.lineTo(651, 200);
      g.stroke();
      for (let x = 490; x < 800; x += 34)
        for (let y = 276; y < 420; y += 44) box(g, x, y, 18, 26, TIMES[tod].glow ? rgba('#ffe7a0', 0.85) : rgba('#ffffff', 0.4));
    },
    mid(g, tod) {
      const rnd = seeded(11);
      box(g, 0, 430, SCENE_W, 290, vgrad(g, 430, 720, ['#8ccf8a', '#6fb873']));
      fill(
        g,
        poly([
          [590, 430],
          [690, 430],
          [1010, 720],
          [270, 720],
        ]),
        vgrad(g, 430, 720, ['#e9dfd2', '#d8c9b6']),
      );
      g.strokeStyle = rgba('#ffffff', 0.5);
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(640, 430);
      g.lineTo(640, 720);
      g.stroke();
      const pink = tod === 'night' ? '#d99ac0' : '#ffc1d6';
      for (let i = 5; i >= 0; i--) {
        const k = 0.34 + i * 0.2,
          y = 446 + i * 46;
        tree(g, 640 - 150 * k - i * 62, y, k, pink, rnd);
        tree(g, 640 + 150 * k + i * 62, y, k, pink, rnd);
      }
      for (const s of [-1, 1]) {
        const x = 640 + s * 330;
        box(g, x - 34, 300, 68, 420, vgrad(g, 300, 720, ['#b9584f', '#8f3f3b']));
        box(g, x - 44, 286, 88, 22, '#efe6da');
        box(g, x - 22, 340, 44, 120, '#3a2f38');
        g.fillStyle = '#f6e7b8';
        g.font = '700 26px serif';
        g.textAlign = 'center';
        for (const [n, ch] of [...(s < 0 ? '白鹭学院' : '明德致远')].entries()) g.fillText(ch, x, 366 + n * 28);
        lamp(g, x, 270, 150, tod);
        fill(g, ellipse(x, 270, 15, 18), TIMES[tod].glow ? '#fff3c0' : '#ffffff');
      }
      wash(g, tod, 0.8);
    },
    near(g, tod) {
      const rnd = seeded(23),
        pink = tod === 'night' ? '#c98ab8' : '#ffb3cf';
      blurred(g, 5, () => {
        for (const [bx, by] of [
          [90, 30],
          [1180, 10],
          [300, -20],
        ])
          for (let i = 0; i < 20; i++)
            fill(g, ellipse(bx + (rnd() - 0.5) * 380, by + rnd() * 130, 34 + rnd() * 30, 24 + rnd() * 18), mix(pink, '#ffffff', rnd() * 0.3));
      });
    },
  },

  classroom: {
    far(g, tod) {
      sky(g, tod, 430);
      skyline(g, tod, 440, 9);
    },
    mid(g, tod) {
      box(g, 0, 0, SCENE_W, 470, vgrad(g, 0, 470, ['#f6eedd', '#eadfc9']));
      for (const x of [60, 330, 600]) windowHole(g, x, 90, 230, 290);
      // Blackboard with chalk writing.
      box(g, 880, 110, 370, 230, '#7a5a3c');
      box(g, 892, 122, 346, 206, vgrad(g, 122, 328, ['#2f5d50', '#274c42']));
      g.strokeStyle = rgba('#ffffff', 0.75);
      g.lineWidth = 2;
      g.font = '26px "Comic Sans MS", cursive';
      g.fillStyle = rgba('#ffffff', 0.85);
      g.textAlign = 'left';
      g.fillText('心动选修课', 912, 166);
      g.font = '17px "Comic Sans MS", cursive';
      g.fillText('Lesson 1: 认识一个人', 912, 200);
      g.beginPath();
      g.moveTo(912, 216);
      g.lineTo(1150, 216);
      g.stroke();
      fill(g, star(1190, 160, 16, 7), rgba('#ffe58a', 0.9));
      box(g, 892, 328, 346, 10, '#a98863');
      box(g, 0, 440, SCENE_W, 30, '#d4c3a3');
      floor(g, 470, '#d9b98c', { lines: 12, rows: 6 });
      // Rows of desks in perspective.
      for (let r = 0; r < 3; r++) {
        const y = 500 + r * 70,
          k = 0.62 + r * 0.24;
        for (let i = -3; i <= 3; i++) {
          const x = 640 + i * 190 * k;
          fill(
            g,
            poly([
              [x - 62 * k, y],
              [x + 62 * k, y],
              [x + 70 * k, y + 22 * k],
              [x - 70 * k, y + 22 * k],
            ]),
            '#e9cfa3',
          );
          box(g, x - 70 * k, y + 22 * k, 140 * k, 7 * k, '#b99668');
          box(g, x - 62 * k, y + 29 * k, 5 * k, 60 * k, '#8d8f9a');
          box(g, x + 57 * k, y + 29 * k, 5 * k, 60 * k, '#8d8f9a');
        }
      }
      shafts(g, 80, 90, 700, tod);
      wash(g, tod, 0.7);
      if (tod === 'night') for (const x of [320, 640, 960]) glow(g, x, 10, 260, '#fff2c8', 0.5);
    },
    near(g) {
      blurred(g, 6, () => {
        fill(
          g,
          poly([
            [0, 640],
            [420, 610],
            [470, 720],
            [0, 720],
          ]),
          '#c9a876',
        );
        box(g, 60, 560, 90, 70, '#e87a8c');
        box(g, 150, 580, 70, 46, '#6f9be0');
      });
    },
  },

  library: {
    far(g, tod) {
      sky(g, tod, 430);
      skyline(g, tod, 450, 14);
    },
    mid(g, tod) {
      const rnd = seeded(31);
      box(g, 0, 0, SCENE_W, 480, vgrad(g, 0, 480, ['#efe3cc', '#dfcfb0']));
      // Tall arched window in the middle.
      g.save();
      g.globalCompositeOperation = 'destination-out';
      g.fill(
        smooth(
          [
            [520, 430, 1],
            [520, 190],
            [640, 90],
            [760, 190],
            [760, 430, 1],
          ],
          true,
          0.6,
        ),
      );
      g.restore();
      g.strokeStyle = '#f7f1e3';
      g.lineWidth = 10;
      g.stroke(
        smooth(
          [
            [520, 430, 1],
            [520, 190],
            [640, 90],
            [760, 190],
            [760, 430, 1],
          ],
          true,
          0.6,
        ),
      );
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(640, 92);
      g.lineTo(640, 430);
      g.moveTo(520, 250);
      g.lineTo(760, 250);
      g.stroke();
      // Shelves on both sides, converging towards the window.
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++) {
          const x0 = 640 + s * (150 + i * 170),
            x1 = 640 + s * (310 + i * 170),
            top = 110 - i * 34,
            bot = 470 + i * 30;
          const xa = Math.min(x0, x1),
            w = Math.abs(x1 - x0) - 16;
          box(g, xa, top, w + 8, bot - top, '#6b4a36');
          const rows = 6;
          for (let r = 0; r < rows; r++) books(g, xa + 6, top + 8 + (r * (bot - top - 12)) / rows, w - 4, (bot - top - 12) / rows - 6, rnd);
        }
      floor(g, 480, '#b98a5e', { lines: 10, rows: 5 });
      fill(g, ellipse(640, 620, 330, 62), rgba('#7a3f4a', 0.55));
      fill(g, ellipse(640, 620, 300, 52), rgba('#a65a66', 0.5));
      // Reading table and a green lamp.
      fill(
        g,
        poly([
          [380, 560],
          [900, 560],
          [960, 610],
          [320, 610],
        ]),
        '#8a5f40',
      );
      box(g, 320, 610, 640, 14, '#6b4a36');
      box(g, 800, 520, 8, 44, '#c9a13e');
      fill(
        g,
        smooth(
          [
            [770, 520, 1],
            [790, 494],
            [826, 494],
            [846, 520, 1],
          ],
          true,
          0.4,
        ),
        '#3f9d7a',
      );
      lamp(g, 808, 540, 170, tod, '#ffe9a8');
      shafts(g, 520, 100, 240, tod, 0.2);
      wash(g, tod, 0.75);
    },
    near(g) {
      blurred(g, 7, () => {
        for (let i = 0; i < 6; i++) box(g, 1010 + (i % 2) * 10, 690 - i * 26, 230, 24, ['#c94f5d', '#3f6fb5', '#e3b04b', '#4f9d7a'][i % 4]);
        box(g, 0, 0, 70, 720, '#5a3d2e');
      });
    },
  },

  field: {
    far(g, tod) {
      sky(g, tod, 400);
      skyline(g, tod, 400, 21, 0.8);
      box(g, 120, 330, 1040, 74, mix(TIMES[tod].far, '#ffffff', 0.5));
      for (let x = 130; x < 1150; x += 26) box(g, x, 342, 18, 54, rgba('#5f7ac0', 0.35));
    },
    mid(g, tod) {
      box(g, 0, 400, SCENE_W, 320, vgrad(g, 400, 720, ['#7cc47a', '#5fae68']));
      for (let i = 0; i < 7; i++) {
        g.strokeStyle = i ? '#ffffff' : '#d9634f';
        g.lineWidth = i ? 3 : 0;
        if (!i) {
          fill(g, ellipse(640, 880, 1180, 420), '#d9634f');
          fill(g, ellipse(640, 900, 800, 300), '#6fba72');
          continue;
        }
        g.beginPath();
        g.ellipse(640, 880 + i * 3, 1180 - i * 54, 420 - i * 17, 0, Math.PI, Math.PI * 2);
        g.stroke();
      }
      for (let x = 60; x < SCENE_W; x += 120) box(g, x, 440, 60, 280, rgba('#ffffff', 0.05));
      // Goal and floodlights.
      g.strokeStyle = '#ffffff';
      g.lineWidth = 5;
      g.strokeRect(560, 446, 160, 62);
      g.lineWidth = 1;
      g.strokeStyle = rgba('#ffffff', 0.5);
      for (let x = 570; x < 720; x += 12) {
        g.beginPath();
        g.moveTo(x, 446);
        g.lineTo(x, 508);
        g.stroke();
      }
      for (const x of [150, 1130]) {
        box(g, x - 4, 170, 8, 270, '#8f96a8');
        box(g, x - 34, 150, 68, 30, '#c9cfdc');
        lamp(g, x, 165, 260, tod, '#f4f8ff');
      }
      wash(g, tod, 0.8);
    },
    near(g) {
      blurred(g, 4, () => {
        g.strokeStyle = rgba('#dfe6f0', 0.75);
        g.lineWidth = 3;
        for (let x = -720; x < SCENE_W; x += 54) {
          g.beginPath();
          g.moveTo(x, 720);
          g.lineTo(x + 200, 520);
          g.moveTo(x + 200, 720);
          g.lineTo(x, 520);
          g.stroke();
        }
        box(g, 0, 512, SCENE_W, 10, '#c9cfdc');
        g.globalCompositeOperation = 'destination-out';
        box(g, 0, 0, SCENE_W, 505, '#000');
      });
    },
  },

  artroom: {
    far(g, tod) {
      sky(g, tod, 430);
      skyline(g, tod, 450, 27);
    },
    mid(g, tod) {
      const rnd = seeded(41);
      box(g, 0, 0, SCENE_W, 480, vgrad(g, 0, 480, ['#f3f0ea', '#e2ddd2']));
      windowHole(g, 90, 70, 420, 330, '#ffffff', 3);
      floor(g, 480, '#cdb89a', { lines: 11, rows: 6 });
      for (let i = 0; i < 40; i++)
        fill(
          g,
          ellipse(rnd() * SCENE_W, 500 + rnd() * 210, 4 + rnd() * 14, 2 + rnd() * 5),
          rgba(['#e8455f', '#3f6fb5', '#e3b04b', '#4f9d7a', '#8a5fb0'][i % 5], 0.5),
        );
      // Easels with canvases.
      const easel = (x, y, k, paintIt) => {
        g.strokeStyle = '#8a6a48';
        g.lineWidth = 7 * k;
        g.beginPath();
        g.moveTo(x - 60 * k, y + 220 * k);
        g.lineTo(x, y - 60 * k);
        g.lineTo(x + 60 * k, y + 220 * k);
        g.moveTo(x, y - 60 * k);
        g.lineTo(x + 8 * k, y + 230 * k);
        g.stroke();
        box(g, x - 78 * k, y - 40 * k, 156 * k, 190 * k, '#fbf8f0');
        g.strokeStyle = '#c9b89a';
        g.lineWidth = 3;
        g.strokeRect(x - 78 * k, y - 40 * k, 156 * k, 190 * k);
        g.save();
        g.beginPath();
        g.rect(x - 74 * k, y - 36 * k, 148 * k, 182 * k);
        g.clip();
        paintIt(x, y, k);
        g.restore();
      };
      easel(720, 300, 1, (x, y) => {
        box(g, x - 80, y - 40, 160, 110, '#9fd0ff');
        fill(g, ellipse(x + 30, y - 4, 22, 22), '#fff3c0');
        fill(
          g,
          poly([
            [x - 80, y + 70],
            [x - 20, y + 10],
            [x + 30, y + 60],
            [x + 80, y + 30],
            [x + 80, y + 150],
            [x - 80, y + 150],
          ]),
          '#7cc47a',
        );
      });
      easel(980, 330, 0.86, (x, y, k) => {
        for (let i = 0; i < 9; i++)
          fill(g, ellipse(x + (rnd() - 0.5) * 120 * k, y + rnd() * 130 * k, 26, 20), ['#f4a3bd', '#ffd76a', '#b08cff', '#8fd3ff'][i % 4]);
      });
      // Plaster bust on a stand, shelves of jars.
      box(g, 1120, 380, 90, 120, '#a98863');
      fill(g, ellipse(1165, 320, 34, 40), '#f1eee8');
      fill(
        g,
        smooth(
          [
            [1128, 384, 1],
            [1140, 346],
            [1190, 346],
            [1202, 384, 1],
          ],
          true,
          0.4,
        ),
        '#e6e2da',
      );
      box(g, 560, 120, 620, 10, '#a98863');
      for (let x = 580; x < 1160; x += 46) {
        box(g, x, 84, 26, 36, ['#e8455f', '#3f6fb5', '#e3b04b', '#4f9d7a', '#8a5fb0', '#f4a3bd'][Math.floor(rnd() * 6)]);
        box(g, x + 4, 76, 18, 8, '#ded6c6');
      }
      shafts(g, 90, 70, 420, tod, 0.2);
      wash(g, tod, 0.75);
      if (tod === 'night') glow(g, 640, 0, 500, '#fff2c8', 0.45);
    },
    near(g) {
      blurred(g, 6, () => {
        box(g, 80, 600, 110, 120, '#8fb6c9');
        for (let i = 0; i < 6; i++) {
          g.strokeStyle = ['#8a6a48', '#c9a13e', '#5a3d2e'][i % 3];
          g.lineWidth = 9;
          g.beginPath();
          g.moveTo(100 + i * 15, 610);
          g.lineTo(60 + i * 30, 430);
          g.stroke();
        }
      });
    },
  },

  musicroom: {
    far(g, tod) {
      sky(g, tod, 430);
      skyline(g, tod, 450, 33);
    },
    mid(g, tod) {
      box(g, 0, 0, SCENE_W, 470, vgrad(g, 0, 470, ['#3d3552', '#4f4468']));
      for (let x = 30; x < SCENE_W; x += 104) for (let y = 30; y < 250; y += 104) if ((x + y) % 208 < 104) box(g, x, y, 92, 92, rgba('#6a5d8c', 0.6));
      windowHole(g, 930, 110, 260, 250, '#2c2640', 1);
      floor(g, 470, '#8a5f40', { lines: 12, rows: 6, lineC: rgba('#3a2418', 0.45) });
      fill(g, ellipse(520, 610, 360, 74), rgba('#b23a4a', 0.75));
      // Drum kit.
      fill(g, ellipse(520, 520, 70, 70), '#e9e2d6');
      g.strokeStyle = '#c9a13e';
      g.lineWidth = 8;
      g.stroke(ellipse(520, 520, 70, 70));
      fill(g, star(520, 520, 30, 13), '#e04a8a');
      for (const [x, y, r] of [
        [420, 470, 34],
        [620, 470, 34],
        [380, 560, 40],
      ]) {
        fill(g, ellipse(x, y, r, r * 0.42), '#d8d2e6');
        box(g, x - r, y, r * 2, r * 0.9, '#7b58c9');
        fill(g, ellipse(x, y + r * 0.9, r, r * 0.42), '#6a4ab0');
      }
      for (const [x, y] of [
        [330, 400],
        [700, 390],
      ]) {
        box(g, x - 2, y, 4, 190, '#aeb4c4');
        fill(g, ellipse(x, y, 52, 11), '#e8c25a');
      }
      // Amplifier, keyboard and guitar.
      box(g, 110, 400, 150, 190, '#2a2533');
      box(g, 122, 446, 126, 132, '#3d3648');
      fill(g, ellipse(185, 512, 48, 48), '#1d1a24');
      for (let i = 0; i < 5; i++) fill(g, ellipse(132 + i * 26, 424, 7, 7), '#e8c25a');
      box(g, 780, 470, 300, 22, '#22202c');
      for (let x = 786; x < 1076; x += 12) box(g, x, 474, 10, 14, '#f4f4f8');
      box(g, 800, 492, 6, 110, '#8d8f9a');
      box(g, 1054, 492, 6, 110, '#8d8f9a');
      g.save();
      g.translate(1160, 520);
      g.rotate(-0.12);
      box(g, -5, -190, 10, 190, '#8a5f40');
      fill(
        g,
        smooth([
          [-44, 0],
          [-34, 60],
          [-48, 110],
          [0, 136],
          [48, 110],
          [34, 60],
          [44, 0],
          [0, -14],
        ]),
        '#e04a5f',
      );
      fill(g, ellipse(0, 60, 14, 14), '#2a2533');
      g.restore();
      for (let i = 0; i < 16; i++) {
        const x = 40 + i * 80,
          y = 22 + Math.sin(i * 1.1) * 12;
        glow(g, x, y, 34, ['#ffd76a', '#ff8fb0', '#8fd3ff', '#b08cff'][i % 4], 0.8);
        fill(g, ellipse(x, y, 5, 5), '#ffffff');
      }
      wash(g, tod, 0.5);
    },
    near(g) {
      blurred(g, 6, () => {
        box(g, 1040, 250, 9, 470, '#9a9fb0');
        fill(g, rrect(1012, 190, 66, 84, 26), '#4a4658');
        fill(g, ellipse(1044, 212, 30, 30), '#6d6880');
      });
    },
  },

  lab: {
    far(g, tod) {
      sky(g, tod, 430);
      skyline(g, tod, 450, 39, 1.3);
    },
    mid(g, tod) {
      const rnd = seeded(47);
      box(g, 0, 0, SCENE_W, 470, vgrad(g, 0, 470, ['#25304a', '#32405e']));
      windowHole(g, 70, 90, 330, 250, '#1d2538', 2);
      g.fillStyle = rgba('#1d2538', 0.55);
      for (let y = 96; y < 340; y += 18) g.fillRect(74, y, 322, 8);
      floor(g, 470, '#3a4560', { lines: 12, rows: 6, lineC: rgba('#7df0d0', 0.14) });
      // Server rack with status lights.
      box(g, 1040, 90, 180, 400, '#161b2a');
      for (let y = 104; y < 470; y += 30) {
        box(g, 1052, y, 156, 22, '#222a40');
        for (let i = 0; i < 9; i++)
          fill(
            g,
            ellipse(1064 + i * 15, y + 11, 3, 3),
            [rgba('#7df0d0', 0.95), rgba('#ffd76a', 0.9), rgba('#ff6b7a', 0.9), '#2c3552'][Math.floor(rnd() * 4)],
          );
      }
      // Two rows of desks with glowing monitors.
      for (let r = 0; r < 2; r++) {
        const y = 430 + r * 110,
          k = 0.8 + r * 0.3;
        box(g, 80, y + 70 * k, 900 * k + 100, 12 * k, '#56617c');
        for (let i = 0; i < 5 - r; i++) {
          const x = 180 + i * 200 * k + r * 40;
          box(g, x - 6 * k, y + 40 * k, 12 * k, 32 * k, '#1b2030');
          box(g, x - 66 * k, y - 44 * k, 132 * k, 88 * k, '#10131e');
          const sc = g.createLinearGradient(0, y - 40 * k, 0, y + 40 * k);
          sc.addColorStop(0, '#1f4f7a');
          sc.addColorStop(1, '#123050');
          box(g, x - 60 * k, y - 38 * k, 120 * k, 76 * k, sc);
          g.fillStyle = rgba('#7df0d0', 0.85);
          for (let l = 0; l < 6; l++) g.fillRect(x - 52 * k, y - 30 * k + l * 11 * k, (30 + rnd() * 70) * k, 3 * k);
          glow(g, x, y, 130 * k, '#5ad0ff', 0.22);
        }
      }
      box(g, 480, 120, 420, 200, '#f4f6fb');
      g.strokeStyle = '#3f6fb5';
      g.lineWidth = 2.5;
      g.beginPath();
      for (let i = 0; i < 4; i++) {
        g.rect(510 + i * 96, 160 + (i % 2) * 70, 70, 36);
        if (i) {
          g.moveTo(580 + (i - 1) * 96, 178 + ((i - 1) % 2) * 70);
          g.lineTo(510 + i * 96, 178 + (i % 2) * 70);
        }
      }
      g.stroke();
      wash(g, tod, 0.4);
    },
    near(g) {
      blurred(g, 7, () => {
        box(g, -40, 520, 300, 200, '#10131e');
        box(g, -30, 530, 270, 170, '#1f4f7a');
        glow(g, 110, 610, 260, '#5ad0ff', 0.3);
      });
    },
  },

  cafe: {
    far(g, tod) {
      sky(g, tod, 430);
      skyline(g, tod, 450, 51);
    },
    mid(g, tod) {
      const rnd = seeded(53);
      box(g, 0, 0, SCENE_W, 480, vgrad(g, 0, 480, ['#f7e4c8', '#efd2ab']));
      box(g, 0, 300, SCENE_W, 180, vgrad(g, 300, 480, ['#7fae96', '#6c9c85']));
      windowHole(g, 60, 80, 470, 330, '#6b4a36', 3);
      floor(g, 480, '#c99a6b', { lines: 12, rows: 6 });
      // Counter, espresso machine, shelves of cups, menu board.
      box(g, 640, 380, 640, 210, vgrad(g, 380, 590, ['#8a5f40', '#6b4a36']));
      box(g, 620, 366, 660, 22, '#f1e6d6');
      for (let x = 660; x < 1270; x += 64) box(g, x, 404, 50, 170, rgba('#000000', 0.08));
      box(g, 700, 290, 130, 78, '#c9cfdc');
      box(g, 712, 302, 106, 26, '#3a3340');
      box(g, 730, 336, 12, 30, '#8d8f9a');
      box(g, 788, 336, 12, 30, '#8d8f9a');
      fill(g, ellipse(765, 284, 40, 10), '#e8455f');
      for (const y of [150, 220]) {
        box(g, 880, y, 360, 9, '#6b4a36');
        for (let x = 896; x < 1230; x += 38) {
          const c = ['#ffffff', '#f4a3bd', '#8fd3ff', '#ffd76a'][Math.floor(rnd() * 4)];
          fill(g, rrect(x, y - 26, 24, 26, 5), c);
          g.strokeStyle = c;
          g.lineWidth = 3;
          g.beginPath();
          g.arc(x + 26, y - 14, 7, -1.2, 1.2);
          g.stroke();
        }
      }
      box(g, 660, 110, 180, 150, '#2f3a33');
      g.fillStyle = '#fff6e0';
      g.font = '700 22px Georgia, serif';
      g.textAlign = 'left';
      g.fillText('MENU', 678, 142);
      g.font = '15px Georgia, serif';
      ['Latte  ¥18', 'Mocha  ¥22', 'Parfait ¥26', 'Cake   ¥20'].forEach((s, i) => g.fillText(s, 678, 170 + i * 22));
      for (const x of [240, 520, 860, 1120]) {
        box(g, x - 1.5, 0, 3, 110, '#3a3340');
        fill(
          g,
          smooth(
            [
              [x - 34, 150, 1],
              [x - 16, 110],
              [x + 16, 110],
              [x + 34, 150, 1],
            ],
            true,
            0.4,
          ),
          '#e8a04a',
        );
        glow(g, x, 160, 150, '#ffd98a', 0.3 + TIMES[tod].glow * 0.3);
      }
      // Round table.
      fill(g, ellipse(300, 600, 150, 30), '#f1e6d6');
      box(g, 292, 600, 16, 120, '#6b4a36');
      fill(g, rrect(270, 566, 34, 28, 6), '#ffffff');
      fill(g, ellipse(345, 590, 26, 8), '#f4a3bd');
      shafts(g, 60, 80, 470, tod, 0.2);
      wash(g, tod, 0.7);
    },
    near(g) {
      const rnd = seeded(8);
      blurred(g, 7, () => {
        box(g, 1130, 610, 90, 110, '#b9584f');
        for (let i = 0; i < 12; i++)
          fill(g, ellipse(1175 + (rnd() - 0.5) * 170, 560 - rnd() * 170, 44, 18, rnd() * 3), mix('#4f9d7a', '#7cc47a', rnd()));
      });
    },
  },

  rooftop: {
    far(g, tod) {
      sky(g, tod, 520);
      skyline(g, tod, 520, 61, 1.5);
    },
    mid(g, tod) {
      floor(g, 520, '#aab0bf', { lines: 10, rows: 5 });
      // Observatory dome with a slit and telescope.
      box(g, 820, 330, 300, 200, vgrad(g, 330, 530, ['#eef1f6', '#cfd5e2']));
      fill(
        g,
        smooth(
          [
            [810, 334, 1],
            [830, 220],
            [970, 150],
            [1110, 220],
            [1130, 334, 1],
          ],
          true,
          0.5,
        ),
        vgrad(g, 150, 334, ['#f8fafc', '#c5ccdb']),
      );
      fill(
        g,
        poly([
          [940, 160],
          [1000, 160],
          [1010, 334],
          [930, 334],
        ]),
        '#2a2f48',
      );
      g.save();
      g.translate(970, 250);
      g.rotate(-0.7);
      box(g, -12, -110, 24, 130, '#dfe6f5');
      box(g, -16, -122, 32, 16, '#8fa6ff');
      g.restore();
      box(g, 930, 430, 60, 100, '#5f6b8a');
      box(g, 840, 380, 50, 40, '#9fb9dd');
      // Water tank and railing.
      box(g, 130, 300, 180, 150, '#8f96a8');
      fill(g, ellipse(220, 300, 90, 20), '#a9b0c0');
      for (const x of [150, 280]) box(g, x, 450, 10, 80, '#6b7286');
      g.strokeStyle = '#e7eaf2';
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(0, 440);
      g.lineTo(SCENE_W, 440);
      g.moveTo(0, 480);
      g.lineTo(SCENE_W, 480);
      for (let x = 20; x < SCENE_W; x += 90) {
        g.moveTo(x, 440);
        g.lineTo(x, 530);
      }
      g.stroke();
      wash(g, tod, 0.85);
      if (tod === 'night') {
        glow(g, 970, 330, 220, '#8fa6ff', 0.35);
        for (let x = 60; x < SCENE_W; x += 180) glow(g, x, 530, 60, '#ffe7a0', 0.5);
      }
    },
    near(g) {
      blurred(g, 5, () => {
        g.strokeStyle = '#dfe3ee';
        g.lineWidth = 16;
        g.beginPath();
        g.moveTo(-20, 690);
        g.lineTo(1300, 660);
        g.stroke();
        for (let x = 60; x < SCENE_W; x += 260) box(g, x, 670, 14, 60, '#dfe3ee');
      });
    },
  },

  dorm: {
    far(g, tod) {
      sky(g, tod, 430);
      skyline(g, tod, 450, 67);
    },
    mid(g, tod) {
      box(g, 0, 0, SCENE_W, 480, vgrad(g, 0, 480, ['#e8eef9', '#d6e0f2']));
      windowHole(g, 470, 90, 340, 270, '#ffffff', 1);
      for (const s of [-1, 1])
        fill(
          g,
          smooth(
            [
              [640 + s * 160, 70, 1],
              [640 + s * 250, 70, 1],
              [640 + s * 240, 240],
              [640 + s * 262, 400, 1],
              [640 + s * 186, 400, 1],
              [640 + s * 196, 240],
            ],
            true,
            0.35,
          ),
          rgba('#8fb6ff', 0.85),
        );
      floor(g, 480, '#d7b98e', { lines: 10, rows: 5 });
      fill(g, ellipse(640, 620, 300, 56), rgba('#8fb6ff', 0.6));
      fill(g, ellipse(640, 620, 250, 44), rgba('#ffffff', 0.5));
      // Bed.
      box(g, 40, 430, 400, 150, '#f6f8fd');
      box(g, 40, 560, 400, 50, '#8a5f40');
      box(g, 30, 360, 20, 250, '#8a5f40');
      fill(g, rrect(64, 404, 130, 50, 20), '#ffd9e2');
      box(g, 200, 440, 240, 130, vgrad(g, 440, 570, ['#7fa3e8', '#5f85d0']));
      // Desk with laptop, shelf and posters.
      box(g, 860, 420, 380, 18, '#b98a5e');
      box(g, 876, 438, 12, 160, '#8a5f40');
      box(g, 1212, 438, 12, 160, '#8a5f40');
      fill(
        g,
        poly([
          [960, 420],
          [1090, 420],
          [1080, 346],
          [970, 346],
        ]),
        '#2a2f48',
      );
      fill(
        g,
        poly([
          [976, 412],
          [1076, 412],
          [1070, 354],
          [980, 354],
        ]),
        '#7fd3ff',
      );
      glow(g, 1026, 384, 110, '#7fd3ff', 0.25);
      fill(g, rrect(1130, 380, 40, 40, 8), '#ff8a5c');
      box(g, 1146, 350, 6, 34, '#4f9d7a');
      fill(g, ellipse(1140, 344, 16, 9, -0.5), '#7cc47a');
      fill(g, ellipse(1160, 340, 16, 9, 0.5), '#7cc47a');
      box(g, 880, 150, 330, 10, '#b98a5e');
      books(g, 890, 96, 190, 54, seeded(71));
      fill(g, ellipse(1160, 126, 24, 24), '#ffd76a');
      box(g, 130, 110, 120, 160, '#ffcfdc');
      fill(g, star(190, 190, 40, 17), '#ffffff');
      box(g, 280, 140, 110, 130, '#bfe6ff');
      fill(g, ellipse(335, 205, 34, 34), '#ffd76a');
      shafts(g, 470, 90, 340, tod, 0.18);
      wash(g, tod, 0.7);
      if (tod === 'night') glow(g, 640, 0, 520, '#fff2c8', 0.5);
    },
    near(g) {
      blurred(g, 6, () => {
        box(g, 0, 640, 260, 80, '#7fa3e8');
        fill(g, rrect(40, 600, 150, 70, 30), '#ffd9e2');
      });
    },
  },

  street: {
    far(g, tod) {
      sky(g, tod, 420);
      skyline(g, tod, 420, 73, 1.6);
    },
    mid(g, tod) {
      fill(
        g,
        poly([
          [540, 420],
          [740, 420],
          [1280, 720],
          [0, 720],
        ]),
        vgrad(g, 420, 720, ['#d9d2c8', '#c2b8aa']),
      );
      g.strokeStyle = rgba('#ffffff', 0.35);
      g.lineWidth = 2;
      for (let i = 1; i < 7; i++) {
        const y = 420 + 300 * (i / 7) ** 1.8,
          w = (y - 420) * 2.14 + 100;
        g.beginPath();
        g.moveTo(640 - w, y);
        g.lineTo(640 + w, y);
        g.stroke();
      }
      // Shop fronts shrinking towards the end of the street.
      const fronts = [
        ['#f4a3bd', '花漾衣橱', '#fff5f8'],
        ['#8fd3ff', '礼物小铺', '#f2fbff'],
        ['#ffd76a', '便利店', '#fffaf0'],
        ['#b08cff', '发型屋', '#f7f2ff'],
      ];
      for (const s of [-1, 1])
        for (let i = 3; i >= 0; i--) {
          const k = 1 - i * 0.2,
            x0 = 640 + s * (640 - i * 140),
            x1 = 640 + s * (500 - i * 140),
            top = 420 - 330 * k,
            bot = 420 + 300 * (1 - i * 0.26);
          const [aw, name, wall] = fronts[(i + (s > 0 ? 2 : 0)) % 4];
          fill(
            g,
            poly([
              [x0, top],
              [x1, top + 60 * k],
              [x1, bot - 70 * k],
              [x0, bot],
            ]),
            wall,
          );
          fill(
            g,
            poly([
              [x0, top + 150 * k],
              [x1, top + 190 * k],
              [x1 - s * 30 * k, top + 236 * k],
              [x0, top + 210 * k],
            ]),
            aw,
          );
          fill(
            g,
            poly([
              [x0 - s * 20 * k, top + 250 * k],
              [x1 + s * 14 * k, top + 262 * k],
              [x1 + s * 14 * k, bot - 100 * k],
              [x0 - s * 20 * k, bot - 50 * k],
            ]),
            TIMES[tod].glow ? rgba('#ffe7a0', 0.9) : rgba('#bfe6ff', 0.7),
          );
          g.save();
          g.translate((x0 + x1) / 2, top + 112 * k);
          g.transform(1, -s * 0.2, 0, 1, 0, 0);
          g.fillStyle = shade(aw, -0.5);
          g.font = `800 ${Math.round(30 * k)}px sans-serif`;
          g.textAlign = 'center';
          g.fillText(name, 0, 0);
          g.restore();
          if (TIMES[tod].glow) glow(g, (x0 + x1) / 2, bot - 120 * k, 170 * k, '#ffe7a0', 0.35);
        }
      // Bunting across the street and lamp posts.
      for (let r = 0; r < 3; r++) {
        const y = 150 + r * 62,
          w = 520 - r * 130;
        for (let i = 0; i <= 14; i++) {
          const t = i / 14,
            x = 640 - w + t * w * 2,
            yy = y + Math.sin(t * Math.PI) * 30;
          fill(
            g,
            poly([
              [x - 9, yy],
              [x + 9, yy],
              [x, yy + 20],
            ]),
            ['#ff8fb0', '#ffd76a', '#8fd3ff', '#b08cff'][i % 4],
          );
        }
      }
      for (const s of [-1, 1]) {
        const x = 640 + s * 380;
        box(g, x - 4, 330, 8, 300, '#3a3340');
        fill(g, rrect(x - 16, 300, 32, 40, 10), TIMES[tod].glow ? '#fff3c0' : '#f4f6fb');
        lamp(g, x, 320, 160, tod);
      }
      wash(g, tod, 0.75);
    },
    near(g) {
      blurred(g, 6, () => {
        fill(g, rrect(-30, 60, 240, 110, 20), '#ff8fb0');
        g.fillStyle = '#ffffff';
        g.font = '800 54px sans-serif';
        g.textAlign = 'center';
        g.fillText('SALE', 90, 136);
        box(g, 84, 170, 10, 550, '#3a3340');
      });
    },
  },
};

export const SCENE_IDS = Object.keys(SCENES);

/** Paint one layer ('far' | 'mid' | 'near') of a place at a time of day ('day' | 'dusk' | 'night'). */
export function drawScene(g, id, layer, tod = 'day') {
  const scene = SCENES[id] ?? SCENES.gate;
  scene[layer]?.(g, tod);
}

/** The colour that ambient light takes at each time of day, for tinting characters to match. */
export function ambient(tod) {
  return tod === 'dusk' ? [1, 0.9, 0.84] : tod === 'night' ? [0.72, 0.76, 0.98] : [1, 1, 1];
}
