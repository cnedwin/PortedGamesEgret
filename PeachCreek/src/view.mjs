// Keep animated townsfolk, effects and selection in the same world coordinates
// as the painting. The engine still renders at three-quarters of viewport size.
import { Bitmap, createSharedMaterial2D } from '@egret/engine';
import { CORE_BOUNDS, LAYOUT, MAP } from './paint.mjs';

const SCALE = 0.75;
const FOLK_MATERIAL = createSharedMaterial2D({ filter: 'linear' });
const FOLK_CELL = { width: 34, height: 44 };
const FOLK_INK = {
  farmer: [['#bec5a1', '#79845e', '#566747'], ['#cfb18b', '#a88355', '#785a3d'], ['#b6bcac', '#779195', '#516e73']],
  merchant: [['#dda58f', '#a86055', '#794542'], ['#e1c48e', '#b79152', '#7e5c46'], ['#c8b2cc', '#91768b', '#624d68']],
  artisan: [['#b2bdc6', '#71849b', '#4c5368'], ['#bbba98', '#7e8966', '#54644c'], ['#c7b4ac', '#926b60', '#684d46']],
  guard: [['#a9b6a7', '#586b66', '#3e5256'], ['#9aa9b4', '#546b81', '#394b63'], ['#ac9c98', '#7d605c', '#59474a']],
  resident: [['#b9c7b2', '#859d82', '#50664e'], ['#d6c2cf', '#a084a5', '#695a73'], ['#d8ada0', '#b47a66', '#754f47']]
};
const AT_WORK = [
  ['farmer', new Set(['paddy', 'mulberry', 'teaGarden', 'granary']), 7],
  ['merchant', new Set(['market', 'teahouse', 'inn', 'dock', 'theatre']), 7],
  ['artisan', new Set(['brewery', 'loom', 'kiln', 'clinic', 'school']), 6]
];
const HOMES = new Set(['house', 'manor']);

function dab(g, x, y, rx, ry, fill) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
}

function inkLine(g, points, color, width = 1) {
  g.beginPath();
  g.moveTo(...points[0]);
  for (const point of points.slice(1)) g.lineTo(...point);
  g.lineWidth = width;
  g.strokeStyle = color;
  g.lineJoin = g.lineCap = 'round';
  g.stroke();
}

function paintFolk(g, role, palette, variant, stride) {
  const [light, cloth, dark] = palette;
  const foot = stride ? 2.5 : -2.5;
  const skin = ['#edc4a6', '#dfa984', '#c78e72'][variant];
  const stain = g.createRadialGradient(1, 1, 1, 1, 1, 13);
  stain.addColorStop(0, '#4c5c4b56');
  stain.addColorStop(1, '#4c5c4b00');
  dab(g, 1, 1, 12, 4, stain);
  dab(g, -3.2 - foot, -.3, 2.8, 1.35, '#434a4b');
  dab(g, 3.5 + foot * .85, -1.3, 2.6, 1.28, '#51524d');

  const dye = g.createLinearGradient(-8, -26, 8, 0);
  dye.addColorStop(0, light);
  dye.addColorStop(.57, cloth);
  dye.addColorStop(1, dark);
  g.beginPath();
  g.moveTo(-3.7, -26);
  g.quadraticCurveTo(-9, -23, -8.2, -17);
  g.quadraticCurveTo(-6.7, -13, -7.5, -8);
  g.lineTo(-8 + foot * .3, -4);
  g.quadraticCurveTo(-1, -.4, 7.6 + foot * .34, -3.8);
  g.quadraticCurveTo(5.5, -10, 6.2, -16);
  g.quadraticCurveTo(9, -21, 3.7, -25.8);
  g.closePath();
  g.fillStyle = dye;
  g.fill();
  g.strokeStyle = '#514d446e';
  g.lineWidth = .8;
  g.stroke();
  inkLine(g, [[-4.6, -24.2], [-.6, -19.6], [4.6, -23.6]], '#e5d8bc', 1.1);
  inkLine(g, [[-.7, -19.1], [-1.3, -11.2], [-3.3 + foot * .2, -5]], '#ffebc665', .9);
  inkLine(g, [[-6.2, -13], [1.2, -11.6], [5.8, -12.7]], dark, 1.6);
  g.fillStyle = '#d9b986';
  g.fillRect(.4, -13.3, 1.9, 2.3);
  dab(g, 1, -28.1, 4.55, 4.55, skin);
  dab(g, -.8, -30, 3.6, 2.4, '#6a554a');
  dab(g, 3.6, -27.7, .65, .62, '#513d38');
  dab(g, 3.2, -26.3, 1.05, .52, '#c76c5b91');

  if (role === 'farmer') {
    dab(g, .3, -32, 8, 2.05, '#8e724e');
    g.beginPath();
    g.moveTo(-7.6, -32.3);
    g.quadraticCurveTo(-3.8, -37.2, .2, -38);
    g.quadraticCurveTo(4.8, -36.5, 8, -31.9);
    g.quadraticCurveTo(-.6, -30.5, -7.6, -32.3);
    g.fillStyle = '#d4b982';
    g.fill();
    inkLine(g, [[-5, -32.4], [-.9, -35.8], [1.9, -36.2]], '#f1d9a7', 1);
    inkLine(g, [[7.3, -18], [11.8, -14], [11.4 - foot * .5, -4]], '#8a684b', 1.75);
    inkLine(g, [[8.2 - foot * .5, -4.5], [14.4 - foot * .5, -4]], '#6f7057', 2);
  } else if (role === 'merchant') {
    inkLine(g, [[-13, -21], [-3, -24], [9.5, -22.8]], '#896344', 1.65);
    inkLine(g, [[-12, -21], [-13, -15], [-9, -15], [-10, -22]], '#987c5a', .8);
    inkLine(g, [[8.6, -22.6], [8, -16.6], [12, -16.6], [10.5, -22.7]], '#987c5a', .8);
    for (const [x, y] of [[-11, -14], [10, -15.7]]) {
      dab(g, x, y + 1.3, 3.6, 3.4, '#ac7753');
      dab(g, x, y, 3.8, 1.45, '#e0be80');
      inkLine(g, [[x - 2.6, y + 1.5], [x + 2.6, y + 1.8]], '#f1d09a9e', .8);
    }
    inkLine(g, [[-3, -32.7], [4.5, -31.8]], '#63495e', 2.3);
  } else if (role === 'artisan') {
    inkLine(g, [[-2.8, -22.5], [-4.6, -16], [-3.7, -5.1], [4.3, -4.8], [3.9, -15.2], [2.7, -22.7]], '#c8b890', 1.2);
    inkLine(g, [[6.9, -14], [13.2, -15.7]], '#8a624e', 2);
    dab(g, 11.6, -15.2, 2.5, 3.3, '#b78259');
    dab(g, 13.4, -15.6, 1, 1.5, '#debd8b');
    inkLine(g, [[-4.3, -31.1], [2.4, -33], [5, -31.7]], '#eee0ba', 2);
  } else if (role === 'guard') {
    inkLine(g, [[-5.5, -22.2], [1, -20.8], [5.9, -22.8]], '#b0aa88', 2);
    for (const y of [-18, -15.8, -13.5]) inkLine(g, [[-4.5, y], [4, y + 1.1]], '#bdba978f', 1);
    inkLine(g, [[9, -2], [11.1, -31]], '#795d48', 1.55);
    inkLine(g, [[11, -31.1], [12.8, -36]], '#576a6e', 1.85);
    dab(g, -.4, -32.2, 4.9, 2.35, '#536b70');
    inkLine(g, [[.9, -33.4], [2, -36.2], [4.3, -37]], '#ae6d57', 1.25);
  } else if (variant === 0) {
    dab(g, -.9, -33, 2.05, 2.5, '#5c4c45');
    dab(g, 9, -11, 3.1, 3.4, '#b29263');
    inkLine(g, [[7, -13.4], [8.7, -15.6], [10.3, -13.4]], '#7d654d', .85);
  } else if (variant === 1) {
    dab(g, -3.2, -32.4, 2.8, 2.2, '#5a4f49');
    inkLine(g, [[-6, -33.2], [-.2, -33]], '#c2a17b', 1.1);
    dab(g, -4.7, -33.5, 1.3, 1.3, '#d6969a');
  } else {
    inkLine(g, [[-4.1, -32.6], [4.2, -31.7]], '#846649', 2.2);
    inkLine(g, [[1.1, -22], [4.8, -17.6], [7.5, -11.6]], '#ebd0a7', 1.4);
  }
}

function folkAtlas(game) {
  const { width, height } = FOLK_CELL;
  const atlas = document.createElement('canvas');
  const roles = Object.keys(FOLK_INK);
  atlas.width = width * 6;
  atlas.height = height * roles.length;
  const g = atlas.getContext('2d');
  roles.forEach((role, row) => {
    FOLK_INK[role].forEach((palette, variant) => {
      for (const stride of [0, 1]) {
        g.save();
        g.translate((variant * 2 + stride + .5) * width, (row + 1) * height - 4);
        paintFolk(g, role, palette, variant, stride);
        g.restore();
      }
    });
  });
  return game.browser.textureFromCanvas(atlas);
}

export function createView(game) {
  const root = game.sprite(() => {}, game.world);
  root.scaleX = root.scaleY = SCALE;
  const walkLayer = game.sprite(() => {}, root),
    skyLayer = game.sprite(() => {}, root),
    fxLayer = game.sprite(() => {}, root);
  const random = Math.random;
  function setCamera(x, y, zoom = 1) {
    root.scaleX = root.scaleY = SCALE * zoom;
    root.x = -x * root.scaleX;
    root.y = -y * root.scaleY;
  }

  // ——— People ———
  const walkers = new Map();
  const roles = Object.keys(FOLK_INK);
  let activityKey = '', activity = [], atlas, atlasPending;
  const rows = LAYOUT.roads.rows;
  function streetRoute(start) {
    const toRow = rows[Math.floor(random() * rows.length)];
    const street = LAYOUT.roads.spines[Math.floor(random() * LAYOUT.roads.spines.length)];
    const lane = (random() - .5) * 7;
    const x2 = CORE_BOUNDS.x + 182 + random() * (CORE_BOUNDS.width - 364);
    const [x1, fromY] = start ?? [CORE_BOUNDS.x + 182 + random() * (CORE_BOUNDS.width - 364), rows[Math.floor(random() * rows.length)] + lane];
    return [
      [x1, fromY], [street, fromY], [street, toRow + lane], [x2, toRow + lane]
    ];
  }

  function localRoute(home, role) {
    if (!home) return streetRoute();
    const a = home.x + (role === 'guard' ? 11 : 16);
    const b = home.x + home.w - 12;
    const y = home.y + home.h - 4 + (random() - .35) * 7;
    const depth = role === 'farmer' ? 18 : 7;
    return [[a, y], [b, y + 3], [b - 7, y - depth], [a + 8, y - depth + 4], [a, y]];
  }

  function stepFrame(walker, frame) {
    if (walker.frame === frame) return;
    walker.frame = frame;
    const { width, height } = FOLK_CELL;
    walker.picture.sourceRect = { x: (walker.variant * 2 + frame) * width, y: walker.row * height, width, height };
  }

  function createWalker(entry) {
    const { role, home, variant } = entry;
    const body = game.sprite(undefined, walkLayer);
    const picture = game.scope.use(new Bitmap(atlas));
    picture.sharedMaterial = FOLK_MATERIAL;
    picture.x = -FOLK_CELL.width / 2;
    picture.y = -FOLK_CELL.height + 4;
    body.addChild(picture);
    const pace = role === 'guard' ? 1.16 : 1;
    const path = localRoute(home, role);
    const w = { body, picture, role, home, row: roles.indexOf(role), variant, path, leg: 0, frame: -1,
      gait: random() * .54, speed: (13 + random() * 9) * pace, wait: 0 };
    const along = random() * .94;
    body.x = path[0][0] + (path[1][0] - path[0][0]) * along;
    body.y = path[0][1] + (path[1][1] - path[0][1]) * along;
    stepFrame(w, 0);
    return w;
  }

  function syncWalkers() {
    const desired = new Set(activity.map((entry) => entry.key));
    for (const [key, walker] of walkers) {
      if (desired.has(key)) continue;
      game.remove(walker.picture);
      game.remove(walker.body);
      walkers.delete(key);
    }
    for (const entry of activity) {
      if (!walkers.has(entry.key)) walkers.set(entry.key, createWalker(entry));
    }
  }

  function setCountyActivity(state) {
    const pop = Math.max(0, state.pop || 0);
    const count = Math.min(28, Math.floor(Math.sqrt(pop)) + 5, Math.ceil(pop));
    const anchors = AT_WORK.map(([role, kinds, limit]) => [role, [], limit, kinds]);
    const homes = [];
    state.plots.forEach(({ kind, level }, index) => {
      if (!kind || level < 1) return;
      if (HOMES.has(kind)) homes.push(index);
      for (const [, ids, , kinds] of anchors) {
        if (kinds.has(kind)) ids.push(index);
      }
    });
    const guards = [];
    for (const [side, strength] of state.defence.troops.entries()) {
      if (strength) guards.push(side);
    }
    if (state.defence.camp) guards.push(4);
    anchors.push(['guard', guards, 5]);
    const wants = [];
    // Give each trade a visible worker before assigning a second to a busier street.
    for (let pass = 0; pass < 7 && wants.length < count * .68; pass++) {
      for (const [role, ids, limit] of anchors) {
        if (pass >= ids.length || pass >= limit || wants.length >= count * .68) continue;
        const id = ids[pass];
        const home = role !== 'guard' ? LAYOUT.plots[id] : id === 4 ? LAYOUT.camp : LAYOUT.gates[id];
        wants.push({ role, home, key: role + id, variant: (id + pass) % 3 });
      }
    }
    for (let i = 0; wants.length < count; i++) {
      const id = i % 3 === 0 ? homes[Math.floor(i / 3)] : undefined;
      wants.push({ role: 'resident', home: LAYOUT.plots[id], key: 'resident' + i + ':' + (id ?? ''), variant: i % 3 });
    }
    const key = wants.map((entry) => entry.key).join('|');
    if (key === activityKey) return;
    activityKey = key;
    activity = wants;
    if (atlas) {
      syncWalkers();
    } else if (!atlasPending && activity.length) {
      atlasPending = folkAtlas(game).then((lease) => {
        atlas = lease;
        syncWalkers();
      }).catch((error) => console.error('County people:', error));
    }
  }

  function countyActivity() {
    const counts = Object.fromEntries(roles.map((role) => [role, 0]));
    for (const walker of walkers.values()) counts[walker.role]++;
    return { total: walkers.size, ...counts };
  }

  // ——— Boats ———
  const boats = [0, 1].map((i) => {
    const hull = game.sprite((g) => {
      g.beginFill(0xb8d6c8, .55).drawEllipse(-29, 2, 57, 6).endFill();
      g.beginFill(0x8c674c).moveTo(-22, -5).curveTo(-15, 5, 19, 2).lineTo(26, -5)
        .curveTo(15, -1, -22, -5).endFill();
      g.beginFill(0x574c3f).drawRect(-1, -21, 1.5, 19).endFill();
      g.beginFill(0xf2e9ca).moveTo(.5, -22).curveTo(12, -18, 17, -7).lineTo(.5, -8)
        .curveTo(4, -13, .5, -22).endFill();
    }, walkLayer);
    hull.x = CORE_BOUNDS.x + 260 + i * 850;
    hull.y = LAYOUT.river.y + 48 + i * 36;
    hull.scaleX = i ? -1 : 1;
    return { hull, speed: (i ? -1 : 1) * (10 + i * 4) };
  });

  // ——— Weather ———
  const flakes = [];
  let weather;
  function paintWeather(g, kind, shade) {
    if (kind === 'petal') {
      const color = shade ? 0xe5a1ac : 0xf5c4cb;
      g.beginFill(color).moveTo(-5, 0).curveTo(-1, -5, 4, -4).curveTo(4, 1, 1, 2).curveTo(-2, 4, -5, 0).endFill();
    } else if (kind === 'leaf') {
      const color = shade ? 0xa85e3f : 0xd5954e;
      g.beginFill(color).moveTo(-6, -1).curveTo(-1, -5, 6, -1).curveTo(2, 3, -3, 3).lineTo(-6, -1).endFill();
      g.beginFill(0xe9b984, .9).moveTo(-3, 0).lineTo(3, -1.3).lineTo(3, -.55).lineTo(-3, .5).endFill();
    } else if (kind === 'snow') {
      g.beginFill(0x98afb8, .54).drawCircle(1, 1, shade ? 2.4 : 3.5).endFill();
      g.beginFill(0xf8f9f4, .95).drawCircle(0, 0, shade ? 2.2 : 3.5).endFill();
    } else if (kind === 'firefly') {
      g.beginFill(0xc5d988, .17).drawCircle(0, 0, 7).endFill();
      g.beginFill(0xe7ebaa, .60).drawCircle(0, 0, 3.6).endFill();
      g.beginFill(0xffebac, .94).drawCircle(0, 0, 1.8).endFill();
    } else {
      g.beginFill(0xd9e9d1, .75).drawEllipse(-14, 0, 28, 2.6).endFill();
      g.beginFill(0xffffea, .9).drawEllipse(-4.5, 0, 9, 1.6).endFill();
    }
  }
  function placeWeather(flake, kind, index) {
    const { y, h } = LAYOUT.river;
    if (kind === 'ripple') {
      flake.s.x = random() * MAP.width;
      flake.s.y = y + 23 + random() * (h - 45);
    } else if (kind === 'firefly') {
      flake.s.x = index % 3 === 0 ? CORE_BOUNDS.x + random() * CORE_BOUNDS.width : random() * MAP.width;
      flake.s.y = index % 3 === 0 ? 291 + random() * 670 : y - 58 + random() * (h + 130);
    } else {
      flake.s.x = index % 3 === 0 ? random() * MAP.width : CORE_BOUNDS.x + random() * CORE_BOUNDS.width;
      flake.s.y = 110 + random() * (MAP.height - 110);
    }
    flake.s.rotation = 0;
    flake.s.scaleX = 1;
    flake.s.alpha = 1;
  }
  function setWeather(nextSeason, nextNight) {
    const kind = ['petal', nextNight > .5 ? 'firefly' : 'ripple', 'leaf', 'snow'][nextSeason] ?? 'petal';
    const want = game.reducedMotion ? 0 : kind === 'ripple' ? 16 : 22;
    if (weather === kind && flakes.length === want) return;
    weather = kind;
    while (flakes.length < want) {
      const s = game.sprite(() => {}, skyLayer);
      flakes.push({ s, phase: random() * 6 });
    }
    while (flakes.length > want) game.remove(flakes.pop().s);
    flakes.forEach((flake, index) => {
      flake.s.graphics.clear();
      paintWeather(flake.s.graphics, kind, index % 2);
      placeWeather(flake, kind, index);
    });
  }

  // ——— Focus ———
  const outline = game.sprite(() => {}, fxLayer);
  function focus(rect) {
    outline.visible = Boolean(rect);
    if (!rect) return;
    outline.x = rect.x;
    outline.y = rect.y;
    const g = outline.graphics;
    g.clear();
    // Four bars, a frame round the plot.
    for (const [x, y, w, h] of [[0, 0, rect.w, 3], [0, rect.h - 3, rect.w, 3], [0, 0, 3, rect.h], [rect.w - 3, 0, 3, rect.h]]) g.beginFill(0xe2b45a).drawRect(x, y, w, h).endFill();
  }

  // ——— Each frame ———
  function update(dt) {
    for (const w of walkers.values()) {
      if (w.wait > 0) {
        w.wait -= dt;
        continue;
      }
      const target = w.path[w.leg + 1];
      if (!target) {
        if (!w.home) w.path = streetRoute([w.body.x, w.body.y]);
        w.leg = 0;
        [w.body.x, w.body.y] = w.path[0];
        continue;
      }
      const dx = target[0] - w.body.x,
        dy = target[1] - w.body.y,
        d = Math.hypot(dx, dy),
        step = w.speed * dt;
      if (Math.abs(dx) > 1) w.body.scaleX = Math.sign(dx);
      if (d <= step) {
        [w.body.x, w.body.y] = target;
        w.leg++;
        if (w.home) w.wait = .24 + random() * .72;
      } else {
        w.body.x += (dx / d) * step;
        w.body.y += (dy / d) * step;
        if (!game.reducedMotion) {
          w.gait = (w.gait + dt * (w.speed / 18)) % .56;
          stepFrame(w, w.gait < .28 ? 0 : 1);
        }
      }
    }
    for (const b of boats) {
      b.hull.x += b.speed * dt;
      if (b.hull.x > MAP.width + 30) b.hull.x = -30;
      if (b.hull.x < -30) b.hull.x = MAP.width + 30;
      // The static bridge is in front of boats crossing its shadow.
      b.hull.alpha = Math.min(1, Math.max(0, (Math.abs(b.hull.x - LAYOUT.roads.street) - 20) / 35));
    }
    for (const f of flakes) {
      f.phase += dt;
      if (weather === 'firefly') {
        f.s.alpha = .12 + .86 * Math.pow(Math.abs(Math.sin(f.phase * 1.35)), 3);
        f.s.x += Math.sin(f.phase * .75) * dt * 12;
        f.s.y += Math.cos(f.phase) * dt * 8;
      } else if (weather === 'ripple') {
        f.s.alpha = .14 + .54 * Math.pow(Math.abs(Math.sin(f.phase * .78)), 2);
        f.s.scaleX = .56 + .62 * Math.abs(Math.sin(f.phase * .78));
        f.s.x += dt * 4;
      } else {
        const drift = weather === 'leaf' ? 23 : 11;
        f.s.x += (Math.sin(f.phase * 1.7) * 13 + drift) * dt;
        f.s.y += (weather === 'snow' ? 32 : weather === 'leaf' ? 18 : 14) * dt;
        f.s.rotation += (weather === 'snow' ? 11 : 46) * dt;
      }
      if (f.s.y > MAP.height) {
        f.s.y = 110;
        f.s.x = random() * MAP.width;
      }
      if (f.s.x > MAP.width) f.s.x = 0;
    }
  }

  // ——— Moments ———
  /** Words rising from a stage point. */
  function float(words, x, y, { color = 0xe2b45a, size = 26 } = {}) {
    const label = game.text(words, { x, y, size, color, align: 'center', baseline: 'middle', bold: true, layer: fxLayer });
    if (game.reducedMotion) {
      game.after(1, () => game.remove(label));
      return;
    }
    game.tween(label).to({ y: y - 60, alpha: 0 }, 1.4, 'quadOut').call(() => game.remove(label));
  }
  function scatter(x, y, count, color, span) {
    if (game.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.4, distance = span * (.42 + .58 * random());
      const dot = game.sprite((g) => g.beginFill(color, .84).drawCircle(0, 0, 2 + i % 3).endFill(), fxLayer);
      dot.x = x;
      dot.y = y;
      game.tween(dot).to({
        x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance - span * .28, alpha: 0
      }, .64 + random() * .24, 'quadOut').call(() => game.remove(dot));
    }
  }
  function coins(x, y, count = 16) {
    scatter(x, y, count, 0xe2b45a, 66);
  }
  function built(rect) {
    scatter(rect.x + rect.w / 2, rect.y + rect.h / 2, 18, 0xfff1c8, 45);
  }
  /** A small raid on the gate, won or lost; resolves when it is over. */
  async function raid(won, side = 0) {
    if (game.reducedMotion) return;
    const gate = LAYOUT.gates[side] ?? LAYOUT.gates[0];
    const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][side] ?? [0, -1];
    const x = gate.x + gate.w / 2, y = gate.y + gate.h / 2;
    const foes = [];
    for (let i = 0; i < 9; i++) {
      const f = game.rect(0, -6, 8, 12, 0x3d3f46, fxLayer);
      game.rect(4, -8, 2, 14, 0xc6584a, f);
      const stagger = (i - 4) * 16;
      f.x = x + dx * 116 - dy * stagger;
      f.y = y + dy * 116 + dx * stagger;
      foes.push(f);
      game.tween(f).to({ x: x + dx * 26 - dy * stagger * .5, y: y + dy * 26 + dx * stagger * .5 }, 2.2 + random() * 0.6, 'quadInOut');
    }
    for (let k = 0; k < 10; k++) {
      game.after(0.6 + k * 0.18, () => {
        const arrow = game.rect(0, 0, 12, 2, 0x4c5a5c, fxLayer);
        const offset = (random() - .5) * 57;
        arrow.x = x - dy * offset;
        arrow.y = y + dx * offset;
        arrow.rotation = Math.atan2(dy, dx) * 180 / Math.PI;
        game.tween(arrow).to({ x: arrow.x + dx * 78, y: arrow.y + dy * 78 }, 0.5).call(() => game.remove(arrow));
      });
    }
    await game.wait(3);
    scatter(x, y, 30, won ? 0xe2b45a : 0xc6584a, 80);
    if (!won) game.flash(0xc6584a, 0.2);
    const travel = won ? 115 : -105;
    for (const f of foes) game.tween(f).to({ x: f.x + dx * travel, y: f.y + dy * travel, alpha: 0 }, 1.2, 'quadIn').call(() => game.remove(f));
    await game.wait(1.3);
  }

  return { update, setCamera, setCountyActivity, activity: countyActivity, setWeather, focus, float, coins, built, raid };
}
