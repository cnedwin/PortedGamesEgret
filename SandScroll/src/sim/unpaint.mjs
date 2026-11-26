// 拆画的规则：画就是一盘沙——一幅山水按颜料分成数万粒沙铺在沙盘里。下面有几列排队的沙桶，每列只有最前面那只能点；
// 点一下，它就上到传送带的空位上，从沙盘最底下一行吸走同色的沙，装满就离开、让出位子；底下的沙被吸走，上面的沙
// 一粒粒落下来补上。传送带上凑齐三只同色的桶会合成一只大桶，腾出两个位子。沙全收完就过关；传送带满了、桶上的
// 颜色底下一粒都没有，又没法合成，僵住一会儿就输了。每种颜料的桶加起来正好装下画里这种颜料的沙。
// 规则只用数组和固定种子的随机数，不碰页面也不碰引擎；画由画面一层（src/view）从画好的山水里取样后交进来。
//
// The rules of unpainting: the painting is a tray of sand — a landscape split by pigment into tens of thousands of
// grains. Below wait a few lanes of buckets; only the front bucket of a lane can be tapped. Tapped, it moves onto a
// free place on the belt and draws sand of its colour from the bottom row of the tray until it is full, then leaves and
// frees its place; as the bottom is drawn away, the sand above falls grain by grain to fill in. Three buckets of one
// colour on the belt merge into one big bucket, freeing two places. Collect all the sand to finish; a full belt whose
// colours are nowhere on the bottom row, with nothing to merge, jams, and a jam that lasts loses. The buckets of each
// pigment together hold exactly that pigment's sand. The rules use only arrays and a seeded random number, never the
// page or the engine; the picture is sampled from the painted landscape by the view (src/view) and handed in.
import { BOARD, TICK, createRandom } from './sand.mjs';

/**
 * The pictures to unpaint: a part of one of the scrolls (`crop`, in the painting's 960 × 240 units), the pigments it
 * is drawn in, how many grains a bucket holds, how many lanes of buckets and how many places on the belt.
 */
export const UNPAINT_LEVELS = Object.freeze([
  Object.freeze({ id: 'peak', painting: 'spring', crop: [470, 0, 200, 240], pigments: [1, 2, 5], bucket: 2000, lanes: 3, belt: 5, shuffle: 80, deal: 7 }),
  Object.freeze({ id: 'blossom', painting: 'spring', crop: [0, 0, 200, 240], pigments: [1, 2, 5, 3], bucket: 1600, lanes: 4, belt: 4, shuffle: 200, deal: 9 }),
  Object.freeze({ id: 'maple', painting: 'autumn', crop: [330, 0, 200, 240], pigments: [1, 2, 5, 3], bucket: 1400, lanes: 4, belt: 3, shuffle: 260, deal: 6 }),
  Object.freeze({ id: 'gorge', painting: 'autumn', crop: [700, 0, 200, 240], pigments: [1, 2, 5, 3, 4], bucket: 1400, lanes: 4, belt: 4, shuffle: 240, deal: 3 }),
  Object.freeze({ id: 'snowpeak', painting: 'snow', crop: [450, 0, 200, 240], pigments: [1, 2, 6, 5], bucket: 1300, lanes: 5, belt: 3, shuffle: 320, deal: 11 }),
  Object.freeze({ id: 'river', painting: 'snow', crop: [100, 0, 200, 240], pigments: [1, 2, 6, 5, 3], bucket: 1200, lanes: 5, belt: 3, shuffle: 360, deal: 3 })
]);

/** The picture fills the tray below this row; the rows above stay open. */
export const PICTURE_TOP = 60;
/**
 * The belt runs left to right under the tray at `speed` grains a second, then back underneath (`back` grains long), so
 * a round trip is `cols + back`. Its places are spread evenly along it. A bucket under the tray draws grains of its
 * colour from the bottom row within `mouth` columns either side, up to `bite` a tick.
 */
export const BELT = Object.freeze({ speed: 70, back: 60, mouth: 2, bite: 3 });

/**
 * Turn RGBA pixels (`width` × `height`, the picture already scaled to the tray's 200 × 240 grains, painted without its
 * silk) into grains: a mostly clear pixel stays empty, and any other takes the nearest of `pigments`, its brightness
 * against that pigment becoming the grain's shade.
 * `palette` is PIGMENTS. Returns { color, tone } for the picture's rows.
 */
export function quantize(pixels, width, height, pigments, palette) {
  const color = new Uint8Array(width * height),
    tone = new Uint8Array(width * height);
  const luma = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b + 1;
  for (let i = 0; i < width * height; i++) {
    const r = pixels[i * 4],
      g = pixels[i * 4 + 1],
      b = pixels[i * 4 + 2];
    // Where little is painted (the pixel is mostly clear) there is no sand; the colour seen there is un-premultiplied
    // by its opacity.
    const a = pixels[i * 4 + 3];
    if (a < 110) continue;
    let best = pigments[0],
      bestD = Infinity;
    for (const p of pigments) {
      const [pr, pg, pb] = palette[p].rgb;
      // Hue matters more than brightness: compare colours with their brightness taken out, plus a little of it.
      const k = luma(r, g, b) / luma(pr, pg, pb);
      const d = (r - pr * k) ** 2 + (g - pg * k) ** 2 + (b - pb * k) ** 2 + 0.35 * ((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2);
      if (d < bestD) ((bestD = d), (best = p));
    }
    const [pr, pg, pb] = palette[best].rgb,
      f = luma(r, g, b) / luma(pr, pg, pb);
    color[i] = best;
    tone[i] = Math.max(0, Math.min(255, Math.round(((f - 0.72) / 0.46) * 255)));
  }
  return { color, tone };
}

/**
 * A new unpaint round on level `levelIndex` with `picture` ({ color, tone } of 200 × 240 grains from `quantize`).
 * The game object has the same grid fields as a painting round, so the same view draws its sand.
 */
export function createUnpaint(seed, levelIndex, picture, deal = UNPAINT_LEVELS[levelIndex].deal) {
  const level = UNPAINT_LEVELS[levelIndex],
    { cols, rows } = BOARD,
    cells = cols * rows,
    // The buckets are dealt from the level's own seed, so a picture is the same puzzle every time (and one known to
    // come out); `deal` may be given to try others.
    rng = createRandom(deal ?? seed);
  const game = {
    mode: 'unpaint',
    seed,
    level,
    levelIndex,
    color: new Uint8Array(cells),
    tone: new Uint8Array(cells),
    frozen: new Uint8Array(cells),
    // Nothing sinks until the bottom is drawn: specks over empty silk drift down only once the sand under them moves.
    active: new Uint8Array(rows + 1),
    clearing: [],
    lanes: [],
    belt: new Array(level.belt).fill(null),
    // How far the belt has run, and when a bucket last drew: a belt full of buckets that draw nothing for a whole trip
    // round is jammed.
    phase: 0,
    lastDraw: 0,
    total: 0,
    collected: 0,
    jam: 0,
    time: 0,
    ticks: 0,
    carry: 0,
    serial: 0,
    taps: 0,
    over: false,
    won: false,
    dirtyTop: 0,
    dirtyBottom: rows - 1,
    events: []
  };
  const counts = {};
  for (let y = 0; y < rows - PICTURE_TOP; y++)
    for (let x = 0; x < cols; x++) {
      const k = y * cols + x,
        i = (y + PICTURE_TOP) * cols + x,
        c = picture.color[k];
      if (!c) continue;
      game.color[i] = c;
      game.tone[i] = picture.tone[k];
      counts[c] = (counts[c] ?? 0) + 1;
      game.total++;
    }
  // The buckets: each pigment's sand shared among buckets of about the level's size, then dealt into the lanes in the
  // order the sand comes down to the bottom. A bucket's place in that order is the height in the picture by which the
  // sand it holds has been passed, counted from the bottom, with a little shuffle.
  const byRow = {};
  for (let y = rows - 1; y >= PICTURE_TOP; y--)
    for (let x = 0; x < cols; x++) {
      const c = game.color[y * cols + x];
      if (c) (byRow[c] ??= new Float64Array(rows))[rows - 1 - y]++;
    }
  const buckets = [];
  for (const [c, n] of Object.entries(counts)) {
    const pigment = Number(c),
      many = Math.max(1, Math.round(n / level.bucket)),
      size = Math.floor(n / many),
      rowsOf = byRow[c];
    let passed = 0,
      depth = 0;
    for (let k = 0; k < many; k++) {
      const half = k * size + size / 2;
      while (depth < rows && passed + rowsOf[depth] < half) passed += rowsOf[depth++];
      buckets.push({ pigment, capacity: k === many - 1 ? n - size * (many - 1) : size, order: depth + (rng() - 0.5) * level.shuffle });
    }
  }
  buckets.sort((a, b) => a.order - b.order);
  for (let k = 0; k < level.lanes; k++) game.lanes.push([]);
  buckets.forEach((bucket, k) => game.lanes[k % level.lanes].push({ id: ++game.serial, pigment: bucket.pigment, capacity: bucket.capacity, filled: 0 }));
  return game;
}

/** The share of the picture collected, from 0 to 1. */
export const collectedShare = (game) => (game.total ? game.collected / game.total : 1);

/** Tap the front bucket of lane `lane`: it goes onto the first free place on the belt. Returns whether it went. */
export function tapLane(game, lane) {
  if (game.over) return false;
  const queue = game.lanes[lane],
    place = game.belt.indexOf(null);
  if (!queue?.length || place < 0) return false;
  const bucket = queue.shift();
  game.belt[place] = bucket;
  game.taps++;
  game.events.push({ kind: 'board', lane, place, pigment: bucket.pigment });
  merge(game);
  return true;
}

/** Three buckets of one colour on the belt become one, holding what they held and what they can hold. */
function merge(game) {
  for (;;) {
    const by = {};
    game.belt.forEach((bucket, place) => bucket && (by[bucket.pigment] ??= []).push(place));
    const three = Object.values(by).find((places) => places.length >= 3);
    if (!three) return;
    const [keep, ...gone] = three.slice(0, 3),
      kept = game.belt[keep];
    for (const place of gone) {
      kept.capacity += game.belt[place].capacity;
      kept.filled += game.belt[place].filled;
      game.belt[place] = null;
    }
    kept.big = true;
    game.events.push({ kind: 'merge', place: keep, pigment: kept.pigment, gone });
  }
}

/** Where place `place` of the belt is now, from 0 to a round trip; under the tray while it is below `cols`. */
export function placeAt(game, place) {
  const loop = BOARD.cols + BELT.back;
  return (game.phase + (place * loop) / game.belt.length) % loop;
}

/** One tick of the belt: it moves on, and each bucket under the tray draws its colour from the bottom row above it. */
function draw(game) {
  const { cols, rows } = BOARD,
    bottom = (rows - 1) * cols,
    { color } = game;
  game.phase = (game.phase + BELT.speed * TICK) % (cols + BELT.back);
  let drew = false;
  game.belt.forEach((bucket, place) => {
    if (!bucket) return;
    const at = placeAt(game, place);
    if (at >= cols) return;
    let want = Math.min(BELT.bite, bucket.capacity - bucket.filled);
    for (let x = Math.max(0, Math.floor(at) - BELT.mouth); x <= Math.min(cols - 1, Math.floor(at) + BELT.mouth) && want > 0; x++) {
      const i = bottom + x;
      if (color[i] !== bucket.pigment) continue;
      color[i] = 0;
      bucket.filled++;
      game.collected++;
      want--;
      drew = true;
      // The view shows sand pouring into the buckets that drew this tick.
      bucket.pouring = game.ticks;
    }
    if (bucket.filled >= bucket.capacity) {
      game.belt[place] = null;
      game.events.push({ kind: 'full', place, pigment: bucket.pigment, big: Boolean(bucket.big) });
    }
  });
  if (drew) {
    game.lastDraw = game.time;
    game.active[rows - 2] = 1;
    game.dirtyBottom = rows - 1;
    game.dirtyTop = Math.min(game.dirtyTop, rows - 2);
  }
  return drew;
}

/** The sand falls straight down a row where the cell below is empty: the picture keeps its shape as it sinks. */
function sink(game) {
  const { cols, rows } = BOARD,
    { color, tone, active } = game;
  let moved = false;
  for (let y = rows - 2; y >= 0; y--) {
    if (!active[y] && !active[y + 1]) continue;
    active[y] = 0;
    const row = y * cols;
    for (let x = 0; x < cols; x++) {
      const i = row + x,
        c = color[i];
      if (!c || color[i + cols]) continue;
      color[i + cols] = c;
      tone[i + cols] = tone[i];
      color[i] = 0;
      moved = true;
      active[y] = 1;
      if (y > 0) active[y - 1] = 1;
      if (y < game.dirtyTop) game.dirtyTop = y;
      if (y + 1 > game.dirtyBottom) game.dirtyBottom = y + 1;
    }
  }
  active[rows - 1] = 0;
  return moved;
}

/** Move the round on by `seconds`. What happened is added to `game.events` for the view. */
export function stepUnpaint(game, seconds) {
  if (game.over) return game;
  game.time += seconds;
  game.carry += seconds;
  let ticks = Math.min(16, Math.floor(game.carry / TICK));
  game.carry -= ticks * TICK;
  if (game.carry > TICK) game.carry = 0;
  while (ticks-- > 0) {
    game.ticks++;
    draw(game);
    sink(game);
  }
  // Specks of sand over empty silk wake only when the sand under them moves; now and then, with nothing moving, any
  // grain with nothing under it is woken, so no sand is left hanging out of reach.
  game.sinceLook = (game.sinceLook ?? 0) + seconds;
  if (game.sinceLook > 0.25 && !sinking(game)) {
    game.sinceLook = 0;
    wakeHanging(game);
  }
  if (game.collected >= game.total) {
    game.won = game.over = true;
    game.events.push({ kind: 'won' });
    return game;
  }
  // A jam: every place on the belt taken, and nothing drawn for a whole trip round and a little more.
  const full = game.belt.every(Boolean),
    trip = (BOARD.cols + BELT.back) / BELT.speed;
  game.jam = full ? game.time - Math.max(game.lastDraw, game.fullSince ?? game.time) : 0;
  if (!full) game.fullSince = null;
  else game.fullSince ??= game.time;
  if (full && game.jam >= trip + 0.5 && !sinking(game)) {
    game.over = true;
    game.events.push({ kind: 'lost' });
  }
  return game;
}

/** Wake every row that has a grain over an empty cell. */
function wakeHanging(game) {
  const { cols, rows } = BOARD,
    { color, active } = game;
  for (let y = rows - 2; y >= 0; y--) {
    const row = y * cols;
    for (let x = 0; x < cols; x++)
      if (color[row + x] && !color[row + cols + x]) {
        active[y] = 1;
        break;
      }
  }
}

/** Whether sand is still falling anywhere. */
function sinking(game) {
  for (let y = 0; y < BOARD.rows - 1; y++) if (game.active[y]) return true;
  return false;
}

