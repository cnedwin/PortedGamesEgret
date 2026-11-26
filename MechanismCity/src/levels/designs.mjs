// 十二关的图纸。tools/build-levels.mjs 把它们写成 Tiled 地图（levels/*.tmj），游戏只读那些地图。
// The plans of the twelve levels. tools/build-levels.mjs writes them as Tiled maps (levels/*.tmj); the game
// reads only those maps, through the engine's importer. Units here are tiles: a tile is 32 world units.
//
// A plan is a function given a drawing kit:
//   rock(x0, y0, x1, y1)     solid stone, inclusive cell ranges        beam(...)  a solid wooden beam
//   bronze(...)              solid bronze                               hall(...)  wall behind, not solid
//   bow(x, y)                the crossbow, its pivot in the middle of cell (x, y)
//   block / crate (x, y, w, h)          a loose wooden block or a crate that breaks; top-left cell, size in cells
//   stone(x, y, r)           a round stone, its centre and radius in cells
//   rope(x, y, length, held) a rope from the anchor at the top-left of cell (x, y) holding the object `held`
//   seesaw(x, y, w, down)    a plank turning on a post, its middle at (x, y), `down` the lowered end
//   spring(x, y, w)          a bouncing board on the floor of cell row y
//   plate(x, y, w, name, needs)  a pressure plate on the floor of cell row y, pressed by what `needs` allows
//   gate(x, y, w, h, by)     a gate that rises when plate `by` is pressed
//   lock(x, y, w, h, needs)  the lock: `any`, `pellet`, `stone`, `block` or `weight` (anything but a pellet)
//   ramp([[x, y], ...])      a convex slope through the points, in cells
//   lantern(x, y), banner(x, y), gear(x, y)   decoration

export const WIDTH = 44;
export const HEIGHT = 18;

/** Ground two rows deep along the bottom, and walls of rock at both ends of the city. */
function frame({ rock }) {
  rock(0, 16, WIDTH - 1, 17);
  rock(0, 0, 0, 15);
  rock(WIDTH - 1, 0, WIDTH - 1, 15);
}

export const LEVELS = [
  // ── 外城 · 木坊 · The Outer Ward: the Joinery ────────────────────────────────────────────
  {
    id: 'l01',
    title: '初试机弩',
    en: 'First Bolt',
    pellets: 'iron,iron,iron',
    par: 1,
    plan(k) {
      frame(k);
      k.hall(16, 6, 42, 15);
      k.rock(20, 12, 23, 15);
      k.rock(30, 10, 42, 15);
      k.lock(34, 8, 2, 2, 'any');
      k.bow(3, 15);
      k.lantern(26, 9);
      k.banner(38, 6);
    }
  },
  {
    id: 'l02',
    title: '推木入槽',
    en: 'Into the Slot',
    pellets: 'iron,iron,iron',
    par: 1,
    plan(k) {
      frame(k);
      k.hall(14, 3, 42, 15);
      k.rock(22, 9, 30, 15);
      k.rock(35, 12, 42, 15);
      k.lock(31, 13, 4, 3, 'block');
      k.block(29.6, 7.6, 1.4, 1.4);
      k.bow(3, 15);
      k.gear(36, 7);
      k.lantern(18, 6);
    }
  },
  {
    id: 'l03',
    title: '断绳落石',
    en: 'Cut the Rope',
    pellets: 'iron,iron,iron',
    par: 1,
    plan(k) {
      frame(k);
      k.hall(18, 1, 42, 15);
      k.rock(24, 1, 42, 2);
      k.rock(22, 6, 24, 15);
      k.rock(34, 6, 42, 15);
      k.stone(29.5, 7.5, 1.1, 'hang');
      k.rope(29.5, 3, 3.4, 'hang');
      k.lock(28, 14, 3, 2, 'stone');
      k.rock(25, 15, 27, 15);
      k.rock(31, 15, 33, 15);
      k.bow(3, 15);
      k.banner(36, 4);
    }
  },
  {
    id: 'l04',
    title: '跷板飞木',
    en: 'The Seesaw',
    pellets: 'iron,iron,iron',
    par: 1,
    plan(k) {
      frame(k);
      k.hall(16, 3, 42, 15);
      k.seesaw(24, 14.4, 7, 'left');
      k.block(20.6, 12.6, 1.2, 1.2);
      k.rock(30, 9, 42, 15);
      k.lock(32, 7, 3, 2, 'block');
      k.bow(3, 15);
      k.gear(38, 5);
    }
  },

  // ── 中城 · 水轮 · The Middle Ward: the Water Wheels ─────────────────────────────────────
  {
    id: 'l05',
    title: '破箱滚石',
    en: 'Splinters',
    pellets: 'iron,iron,iron',
    par: 1,
    plan(k) {
      frame(k);
      k.hall(12, 4, 42, 15);
      k.rock(14, 13, 15, 15);
      k.crate(19.2, 10.4, 1.6, 5.6);
      k.stone(20, 9.5, 0.9);
      k.rock(16, 14, 16, 15);
      k.rock(24, 14, 24, 15);
      k.lock(17, 13, 7, 3, 'stone');
      k.rock(28, 7, 42, 15);
      k.ramp([[28, 7], [34, 3.5], [34, 7]]);
      k.bow(3, 15);
      k.lantern(13, 8);
      k.banner(35, 3);
    }
  },
  {
    id: 'l06',
    title: '弹簧高台',
    en: 'Spring Board',
    pellets: 'iron,iron,iron',
    par: 1,
    plan(k) {
      frame(k);
      k.hall(14, 2, 42, 15);
      k.rock(14, 0, 42, 2);
      k.rock(22, 3, 42, 5);
      k.rock(30, 9, 42, 15);
      k.beam(19, 15, 19, 15);
      k.spring(24, 15, 3);
      k.lock(31, 6, 5, 3, 'pellet');
      k.bow(3, 15);
      k.gear(16, 6);
      k.lantern(28, 7);
    }
  },
  {
    id: 'l07',
    title: '踏板开闸',
    en: 'The Floodgate',
    pellets: 'iron,iron,iron,iron',
    par: 2,
    plan(k) {
      frame(k);
      k.hall(12, 3, 42, 15);
      k.rock(17, 10, 23, 15);
      k.block(22.4, 8.6, 1.4, 1.4);
      k.rock(24, 13, 27, 15);
      k.plate(24, 12, 3, 'sluice', 'weight');
      k.rock(33, 3, 42, 8);
      k.gate(33, 9, 1, 7, 'sluice');
      k.lock(36, 13, 3, 3, 'pellet');
      k.bow(3, 15);
      k.banner(14, 5);
      k.gear(38, 6);
    }
  },
  {
    id: 'l08',
    title: '双锁',
    en: 'Twin Locks',
    pellets: 'iron,iron,iron,iron',
    par: 2,
    plan(k) {
      frame(k);
      k.hall(12, 1, 42, 15);
      k.rock(14, 1, 26, 2);
      k.stone(19.5, 6.6, 0.9, 'hang');
      k.rope(19.5, 3, 2.7, 'hang');
      k.rock(16, 14, 16, 15);
      k.rock(22, 14, 22, 15);
      k.lock(17, 13, 5, 3, 'stone');
      k.seesaw(30, 14.4, 7, 'left');
      k.block(26.6, 12.6, 1.2, 1.2);
      k.rock(36, 9, 42, 15);
      k.lock(37, 7, 3, 2, 'block');
      k.bow(3, 15);
      k.lantern(25, 5);
    }
  },

  // ── 内城 · 机枢 · The Inner Ward: the Heart of the Machine ──────────────────────────────
  {
    id: 'l09',
    title: '雷丸',
    en: 'Thunder Pellet',
    pellets: 'thunder,iron,iron',
    par: 1,
    plan(k) {
      frame(k);
      k.hall(16, 1, 42, 15);
      k.rock(20, 1, 42, 2);
      k.crate(22, 11.6, 1.6, 4.4);
      k.crate(23.6, 11.6, 1.6, 4.4);
      k.crate(22.8, 8.4, 1.6, 3.2);
      k.stone(28.5, 7, 0.9, 'hang');
      k.rope(28.5, 3, 3.1, 'hang');
      k.rock(26, 14, 26, 15);
      k.rock(31, 14, 31, 15);
      k.lock(27, 13, 4, 3, 'stone');
      k.rock(32, 4, 42, 15);
      k.bow(3, 15);
      k.banner(36, 6);
      k.gear(18, 5);
    }
  },
  {
    id: 'l10',
    title: '连环机',
    en: 'Chain Reaction',
    pellets: 'iron,iron,iron,iron',
    par: 2,
    plan(k) {
      frame(k);
      k.hall(12, 1, 42, 15);
      k.rock(18, 1, 30, 2);
      k.stone(20, 6, 1, 'hang');
      k.rope(20, 3, 2, 'hang');
      k.seesaw(22.5, 14.4, 7, 'right');
      k.block(24.6, 12.6, 1.2, 1.2);
      k.rock(14, 8, 16, 15);
      k.plate(14, 7, 3, 'wheel', 'block');
      k.rock(33, 3, 42, 8);
      k.gate(33, 9, 1, 7, 'wheel');
      k.lock(36, 13, 3, 3, 'pellet');
      k.bow(3, 15);
      k.gear(38, 6);
      k.lantern(29, 6);
    }
  },
  {
    id: 'l11',
    title: '登高',
    en: 'The Tower',
    pellets: 'heavy,iron,iron',
    par: 1,
    plan(k) {
      frame(k);
      k.hall(14, 1, 42, 15);
      k.rock(16, 10, 23, 15);
      k.block(22.2, 8.6, 1.4, 1.4);
      k.spring(26, 15, 4, 860);
      k.rock(33, 6, 42, 15);
      k.lock(35, 3, 5, 3, 'block');
      k.bow(3, 15);
      k.banner(19, 4);
      k.gear(37, 3);
    }
  },
  {
    id: 'l12',
    title: '机枢之心',
    en: 'Heart of the Machine',
    pellets: 'thunder,heavy,iron,iron,iron',
    par: 3,
    plan(k) {
      frame(k);
      k.hall(9, 1, 42, 15);
      k.rock(13, 1, 22, 2);
      k.crate(13.4, 11.6, 1.6, 4.4);
      k.stone(18, 6.6, 0.9, 'hang');
      k.rope(18, 3, 2.7, 'hang');
      k.rock(15, 14, 15, 15);
      k.rock(21, 14, 21, 15);
      k.lock(16, 13, 5, 3, 'stone');
      k.seesaw(27, 14.4, 6, 'left');
      k.block(24.2, 12.6, 1.2, 1.2);
      k.rock(29, 11, 31, 15);
      k.plate(29, 10, 3, 'heart', 'block');
      k.rock(35, 3, 42, 8);
      k.gate(35, 9, 1, 7, 'heart');
      k.lock(37, 13, 3, 3, 'pellet');
      k.bow(3, 15);
      k.lantern(11, 6);
      k.gear(39, 6);
    }
  }
];
