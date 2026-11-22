// Small, deterministic painted marks packed into the shared character atlas.
// No live canvas, random particles or simulation state is required at runtime.
const TAU = Math.PI * 2;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p); };

function stroke(g, points, color, width) {
  g.beginPath();
  points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke();
}
function polygon(g, points, fill) {
  g.beginPath();
  points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}
function ribbon(g, index) {
  const shift = index * .35;
  // Unequal inner/outer curves give the strike an actual leading edge.
  g.save();
  g.rotate(shift);
  const wash = g.createLinearGradient(-65, -20, 70, 24);
  wash.addColorStop(0, 'rgba(120,67,30,0)');
  wash.addColorStop(.35, 'rgba(189,117,48,.35)');
  wash.addColorStop(.75, 'rgba(244,206,130,.87)');
  wash.addColorStop(1, 'rgba(255,246,205,0)');
  g.beginPath();
  g.moveTo(-72, 23);
  g.bezierCurveTo(-33, -46, 42, -54, 73, -4);
  g.bezierCurveTo(32, -28, -17, -13, -72, 23);
  g.fillStyle = wash;
  g.fill();
  g.beginPath();
  g.moveTo(-49, 3);
  g.bezierCurveTo(-15, -34, 44, -41, 70, -5);
  g.strokeStyle = '#fff0bc';
  g.lineWidth = index === 2 ? 2 : 1.35;
  g.stroke();
  for (let i = 0; i < 5; i++) {
    g.globalAlpha = .45 - i * .055;
    stroke(g, [[-50 + i * 13, 17 - i * 6], [-20 + i * 12, 6 - i * 7]], '#bb743e', 2.4 - i * .25);
  }
  g.restore();
}
function impact(g, index) {
  const spread = [20, 32, 42][index];
  for (let i = 0; i < 9; i++) {
    const a = i * TAU / 9 + .23;
    const r = spread * (.65 + (i % 3) * .17);
    const side = a + .11;
    polygon(g, [[Math.cos(a) * 5, Math.sin(a) * 5], [Math.cos(a) * r, Math.sin(a) * r],
      [Math.cos(side) * r * .65, Math.sin(side) * r * .65]], i % 3 ? '#e5bb6d' : '#a34831');
    if (i % 2) stroke(g, [[Math.cos(a) * 11, Math.sin(a) * 11], [Math.cos(a) * (r + 5), Math.sin(a) * (r + 5)]], '#ffedbb', 1.2);
  }
  if (index < 2) {
    polygon(g, [[-18, -2], [-4, -5], [-1, -19], [4, -4], [19, 1], [4, 5], [1, 18], [-4, 4]], '#fff5d2');
  }
  stroke(g, [[-12, 9], [7, -10]], '#fff8dc', 2);
}
function brush(g) {
  const color = ['rgba(181,145,83,.1)', 'rgba(184,150,96,.19)', 'rgba(214,182,119,.17)'];
  for (let i = 0; i < 12; i++) {
    const x = Math.sin(i * 2.1) * 28, y = Math.cos(i * 2.7) * 10;
    g.beginPath();
    g.ellipse(x, y, 9 + i % 7, 2 + i % 4, -.15, 0, TAU);
    g.fillStyle = color[i % 3];
    g.fill();
  }
}
function ringTrail(g, returning) {
  const bright = returning ? '#a2c5b8' : '#e5bd72';
  g.save();
  g.scale(1, .65);
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(-7 + i * 5, 0, 24 - i * 3, -.95, 1.13);
    g.strokeStyle = bright;
    g.globalAlpha = .58 - i * .13;
    g.lineWidth = 3 - i * .6;
    g.stroke();
  }
  g.globalAlpha = .8;
  stroke(g, [[-39, -7], [-20, -11], [-6, -10]], bright, 1);
  stroke(g, [[-34, 12], [-15, 15], [2, 13]], bright, 1.3);
  if (returning) {
    polygon(g, [[17, -6], [30, 0], [17, 6], [21, 0]], '#e8ead2');
    stroke(g, [[-30, 0], [-12, 0]], '#95b9ad', 1);
  }
  g.restore();
}
function sigil(g) {
  g.lineCap = 'square';
  for (let i = 0; i < 8; i++) {
    g.save();
    g.rotate(i * TAU / 8);
    stroke(g, [[-8, -37], [8, -37]], '#d8b373', 2.1);
    if (i % 2) {
      stroke(g, [[-8, -42], [-2, -42]], '#c49151', 1.4);
      stroke(g, [[2, -42], [8, -42]], '#c49151', 1.4);
    } else stroke(g, [[-8, -42], [8, -42]], '#c49151', 1.4);
    g.restore();
  }
  stroke(g, [[0, -27], [27, 0], [0, 27], [-27, 0], [0, -27]], '#efd49c', 1.3);
  stroke(g, [[-10, -13], [10, -13], [-3, -4], [11, 3], [-10, 3], [0, 9], [0, 20]], '#edcf88', 2);
}
function talisman(g) {
  polygon(g, [[-8, -25], [8, -26], [7, 17], [3, 25], [-2, 20], [-8, 24]], '#d8b778');
  stroke(g, [[-4, -16], [4, -16], [-2, -10], [5, -5], [-5, -5], [1, 1], [-3, 9], [4, 9]], '#9d4935', 1.7);
  stroke(g, [[-3, 14], [3, 14]], '#a64e36', 1);
}

function entry(key, w, h, draw) { return { key, w, h, pivotY: h / 2, draw }; }
export const FX_FRAMES = [
  ...Array.from({ length: 4 }, (_, i) => entry(`fx-cut:${i}`, 160, 96, g => ribbon(g, i))),
  ...Array.from({ length: 3 }, (_, i) => entry(`fx-impact:${i}`, 96, 96, g => impact(g, i))),
  entry('fx-spark', 32, 32, g => {
    polygon(g, [[-13, 0], [-2, -2], [11, 0], [-2, 2]], '#ffecc0');
    stroke(g, [[-7, 0], [7, 0]], '#fff5d8', 1);
  }),
  entry('fx-splinter', 32, 32, g => polygon(g, [[-6, -3], [8, -1], [2, 4], [-5, 2]], '#ac7f4f')),
  entry('fx-brush', 96, 48, brush),
  entry('fx-ringtrail', 92, 64, g => ringTrail(g, false)),
  entry('fx-ringreturn', 92, 64, g => ringTrail(g, true)),
  entry('fx-dust', 96, 48, brush),
  entry('fx-sigil', 104, 104, sigil),
  entry('fx-talisman', 32, 64, talisman)
];

/** Render-only pose. All times are seconds since an observed rule event. */
export function combatPose({ time = 0, step = 0, walking = false, kind = 'hero',
  attackAge = Infinity, hurtAge = Infinity, deathAge = Infinity, windup = 0, dead = false,
  reducedMotion = false } = {}) {
  const wolf = kind === 'wolf', boss = kind === 'boss';
  const pose = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, alpha: 1, action: null, frame: 0 };
  if (walking) {
    pose.frame = Math.floor(((step % TAU) + TAU) % TAU / TAU * 4) % 4;
    pose.y = -Math.abs(Math.sin(step)) * (wolf ? 2.6 : 1.5);
    pose.rotation = Math.sin(step) * (wolf ? 1.2 : 1.4);
    pose.scaleY = 1 + Math.cos(step * 2) * .006;
  } else pose.scaleY = 1 + Math.sin(time * 2.3) * .003;
  if (windup > 0 && !dead) {
    const p = smooth(windup);
    pose.x = -4 * p;
    pose.y = (wolf ? 3 : 1.8) * p;
    pose.rotation = -8 * p;
    pose.scaleY = 1 - .025 * p;
    if (p > .5) pose.action = 'attack';
  }
  if (attackAge >= 0 && attackAge < .38 && !dead) {
    const a = attackAge;
    if (a < .095) {
      const p = smooth(a / .095);
      pose.x = -5 * p;
      pose.rotation = -8 * p;
      pose.y = p * 1.5;
    } else {
      const thrust = a < .14 ? smooth((a - .095) / .045) : 1 - smooth((a - .14) / .24);
      pose.x = thrust * (boss ? 14 : wolf ? 17 : 11);
      pose.y = -Math.sin(thrust * Math.PI) * (wolf ? 6 : 1.8);
      pose.rotation = thrust * (wolf ? 3 : 5);
      pose.scaleX = 1 + thrust * .025;
      pose.action = a < .27 ? 'attack' : null;
    }
  }
  if (hurtAge >= 0 && hurtAge < .25 && !dead) {
    const recoil = Math.sin(Math.min(1, hurtAge / .25) * Math.PI) * (1 - hurtAge / .32);
    pose.x -= recoil * (boss ? 3 : 7);
    pose.rotation -= recoil * 7;
    pose.y += recoil * 1.5;
    pose.action = hurtAge < .17 ? 'hurt' : pose.action;
  }
  if (dead) {
    const a = Number.isFinite(deathAge) ? Math.max(0, deathAge) : 2.5;
    pose.action = a < .12 ? 'hurt' : a < .3 ? 'hurt' : 'fallen';
    const collapse = smooth((a - .08) / .32);
    pose.y = collapse * 5;
    pose.x = -collapse * (boss ? 10 : 6);
    pose.rotation = a < .3 ? -collapse * 18 : 0;
    pose.scaleY = a < .3 ? 1 - collapse * .08 : 1;
    pose.alpha = 1 - smooth((a - 1.1) / 1.5) * .82;
  }
  if (reducedMotion) {
    pose.x *= .35;
    pose.y *= .3;
    pose.rotation *= .3;
    pose.scaleX = 1;
    pose.scaleY = 1;
  }
  return pose;
}
