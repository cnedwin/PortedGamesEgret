// Buildings in the traditional Chinese manner, made from a few rules: a stone
// platform, a row of red columns, walls set back behind them, and a tiled
// roof whose eaves sweep down and turn up at the corners.
//
// `createBuilding(kind, level)` returns a mesh for one of the game's building
// kinds, sized to fit a plot of `PLOT` metres. Higher levels are taller or
// gain a second roof.
import { Mesh3D, Object3D } from '@egret/engine/world3d';
import { BALL, BOX, ROD, SPIKE, TAPER, heightSurface, model, shade, toon } from './shapes.mjs';

/** The ground one building stands on, in metres; seat.mjs lays plots out in a grid. */
export const PLOT = 11;

const STONE = 0xbdb7a6,
  STONE_DARK = 0x8f8a7c,
  COLUMN = 0x9c2f24,
  WALL = 0xe9e1cf,
  WOOD = 0x6e4a2b,
  TILE = 0x3f4a52,
  TILE_GREEN = 0x3f6a55,
  TILE_GOLD = 0xc49a2c,
  EARTH = 0x9b8a66,
  LEAF = 0x4f7f3f;

const ROOF_MATERIAL = toon({ steps: 4 });

/**
 * A hipped roof with curved, upturned eaves. `w` by `d` is the footprint of
 * the eaves, `rise` the height of the ridge above them.
 */
function roof(w, d, rise, tile, y) {
  const hw = w / 2,
    hd = d / 2;
  const ridge = Math.max(0, hw - hd) * 0.9;
  const height = (x, z) => {
    // Distance in from the eaves, 0 at the edge and 1 at the ridge.
    const fx = Math.max(0, (hw - Math.abs(x)) / (hw - ridge)),
      fz = (hd - Math.abs(z)) / hd,
      inward = Math.max(0, Math.min(fx, fz));
    // A concave sweep, with the corners lifted.
    const corner = Math.pow(Math.abs(x) / hw, 6) * Math.pow(Math.abs(z) / hd, 6);
    return rise * Math.pow(inward, 0.62) + corner * rise * 0.55;
  };
  const surface = new Mesh3D(
    heightSurface(w, d, 14, 10, height, (x, z, h) => shade(tile, 0.82 + 0.3 * (h / rise) + (Math.round(x * 2.2) % 2 ? 0.05 : 0))),
    ROOF_MATERIAL,
  );
  surface.castShadow = true;
  surface.receiveShadow = true;
  surface.setPosition(0, y, 0);
  const node = new Object3D();
  node.addChild(surface);
  // The ridge beam with an ornament at each end, and the eaves' underside.
  node.addChild(
    model([
      [BOX, [0, y + rise + 0.08, 0], [ridge * 2 + 0.5, 0.22, 0.3], shade(tile, 0.7)],
      [SPIKE, [ridge + 0.3, y + rise + 0.32, 0], [0.16, 0.5, 0.16], shade(tile, 0.7)],
      [SPIKE, [-ridge - 0.3, y + rise + 0.32, 0], [0.16, 0.5, 0.16], shade(tile, 0.7)],
      [BOX, [0, y - 0.06, 0], [w * 0.96, 0.1, d * 0.96], shade(WOOD, 0.8)],
    ]),
  );
  return node;
}

/** A hall: platform, columns, walls and a roof; `storeys` stacks a second, smaller one on top. */
function hall({ w, d, h, tile = TILE, storeys = 1, platform = 0.5, open = false, door = COLUMN }) {
  const node = new Object3D();
  const parts = [
    [BOX, [0, platform / 2, 0], [w + 1.2, platform, d + 1.2], STONE],
    [BOX, [0, platform * 0.25, d / 2 + 0.9], [2.2, platform * 0.5, 0.7], STONE_DARK],
  ];
  const cols = Math.max(2, Math.round(w / 2.2)) + 1;
  for (let i = 0; i < cols; i++) {
    const x = (i / (cols - 1) - 0.5) * w;
    parts.push([ROD, [x, platform + h / 2, d / 2], [0.16, h, 0.16], COLUMN], [ROD, [x, platform + h / 2, -d / 2], [0.16, h, 0.16], COLUMN]);
    parts.push([BOX, [x, platform + 0.06, d / 2], [0.42, 0.12, 0.42], STONE_DARK]);
  }
  if (!open) {
    parts.push([BOX, [0, platform + h / 2, -0.25], [w - 0.4, h, d - 1.1], WALL]);
    parts.push([BOX, [0, platform + h * 0.42, d / 2 - 0.78], [1.5, h * 0.84, 0.08], door]);
    for (const side of [-1, 1]) if (w > 5) parts.push([BOX, [side * (w * 0.3), platform + h * 0.55, d / 2 - 0.78], [1.1, h * 0.4, 0.06], WOOD]);
  }
  parts.push([BOX, [0, platform + h - 0.12, d / 2], [w + 0.3, 0.24, 0.2], 0x2f6f73], [BOX, [0, platform + h - 0.12, -d / 2], [w + 0.3, 0.24, 0.2], 0x2f6f73]);
  node.addChild(model(parts));
  node.addChild(roof(w + 2.6, d + 2.6, h * 0.62, tile, platform + h));
  if (storeys > 1) {
    const upper = hall({ w: w * 0.62, d: d * 0.62, h: h * 0.7, tile, platform: 0.2, door });
    upper.setPosition(0, platform + h + h * 0.3, 0);
    node.addChild(upper);
  }
  return node;
}

/** A fenced yard with something standing in it. */
function yard(inside, floor = EARTH) {
  const parts = [[BOX, [0, 0.04, 0], [PLOT - 2, 0.08, PLOT - 2], floor]];
  for (const side of [-1, 1])
    for (let i = -2; i <= 2; i++) {
      parts.push([ROD, [side * (PLOT / 2 - 1), 0.45, i * 2], [0.07, 0.9, 0.07], WOOD]);
      if (i < 2) parts.push([BOX, [side * (PLOT / 2 - 1), 0.7, i * 2 + 1], [0.05, 0.06, 2], WOOD]);
    }
  return model([...parts, ...inside]);
}

const rack = (x, z) => [
  [BOX, [x, 0.5, z], [1.8, 0.06, 0.1], WOOD],
  [ROD, [x - 0.8, 0.4, z], [0.05, 0.8, 0.05], WOOD],
  [ROD, [x + 0.8, 0.4, z], [0.05, 0.8, 0.05], WOOD],
  ...[-0.5, 0, 0.5].map((dx) => [ROD, [x + dx, 0.9, z], [0.025, 1.5, 0.025], 0xcfd3da, [0.12, 0, 0]]),
];
const dummy = (x, z) => [
  [ROD, [x, 0.7, z], [0.12, 1.4, 0.12], WOOD],
  [ROD, [x, 1.0, z], [0.03, 0.7, 0.03], WOOD, [0, 0, Math.PI / 2]],
  [ROD, [x, 0.6, z + 0.2], [0.03, 0.5, 0.03], WOOD, [Math.PI / 2, 0, 0]],
];
const rocks = (colour) => [
  [BALL, [-1, 0.5, 0.4], [1.3, 0.9, 1.1], colour],
  [BALL, [0.9, 0.35, -0.6], [1.0, 0.7, 0.9], shade(colour, 0.85)],
  [BALL, [0.3, 0.25, 1.4], [0.7, 0.45, 0.6], shade(colour, 1.1)],
  [BOX, [-2.6, 0.4, 1.8], [1.2, 0.7, 0.8], WOOD],
];

/** How each building kind looks. Level raises a hall or adds a storey. */
const KINDS = {
  hall: (level) => hall({ w: 8.4, d: 5.6, h: 3 + level * 0.15, tile: level >= 4 ? TILE_GOLD : TILE_GREEN, storeys: level >= 3 ? 2 : 1, platform: 0.9 }),
  gate(level) {
    const node = new Object3D();
    node.addChild(
      model([
        ...[-2.6, 2.6].flatMap((x) => [[ROD, [x, 2.1, 0], [0.26, 4.2, 0.26], COLUMN], [BOX, [x, 0.2, 0], [0.8, 0.4, 0.8], STONE_DARK]]),
        [BOX, [0, 3.7, 0], [6.4, 0.35, 0.3], 0x2f6f73],
        [BOX, [0, 3.2, 0], [2.4, 0.6, 0.12], 0x1f2a44],
        ...[-4.4, 4.4].map((x) => [BOX, [x, 1.1, 0], [3, 2.2, 0.5], WALL]),
      ]),
    );
    node.addChild(roof(8.2, 2.6, 0.9 + level * 0.05, TILE, 4.0));
    return node;
  },
  board: () => model([[ROD, [-0.9, 0.9, 0], [0.07, 1.8, 0.07], WOOD], [ROD, [0.9, 0.9, 0], [0.07, 1.8, 0.07], WOOD], [BOX, [0, 1.2, 0], [2.1, 1.1, 0.08], 0xd9c79a], [BOX, [0, 1.85, 0], [2.5, 0.12, 0.5], TILE], [BOX, [-0.3, 1.25, 0.05], [0.5, 0.7, 0.02], 0xc0282a]]),
  dorm: (level) => hall({ w: 6.4, d: 3.8, h: 2.3 + level * 0.25, tile: TILE, platform: 0.3, door: WOOD }),
  mess: (level) => hall({ w: 7, d: 4.4, h: 2.6 + level * 0.2, tile: TILE, platform: 0.4, door: WOOD }),
  store: (level) => hall({ w: 5.6, d: 4.6, h: 2.8 + level * 0.2, tile: TILE, platform: 0.6, door: 0x4a3a2a }),
  library: (level) => hall({ w: 5.4, d: 5.4, h: 2.7, tile: TILE_GREEN, storeys: 2, platform: 0.7 + level * 0.05 }),
  clinic: () => hall({ w: 5.6, d: 4, h: 2.5, tile: TILE_GREEN, platform: 0.4, door: 0x3d7a4a }),
  council: () => hall({ w: 7.2, d: 4.8, h: 3, tile: TILE, platform: 0.7 }),
  cell: () => hall({ w: 3, d: 3, h: 2.2, tile: TILE, platform: 0.3, door: WOOD }),
  forge(level) {
    const node = hall({ w: 5.4, d: 4.2, h: 2.6, tile: TILE, platform: 0.3, open: true });
    node.addChild(model([[BOX, [0, 0.8, -0.6], [1.6, 1.0, 1.2], 0x4a4744], [BOX, [0, 1.36, -0.6], [1.0, 0.14, 0.7], 0xe2622a], [TAPER, [2.3, 2.4 + level * 0.1, -1.6], [0.4, 4.4, 0.4], 0x5a5653], [BOX, [-1.5, 0.75, 0.8], [0.6, 0.5, 0.35], 0x2e2e33]]));
    return node;
  },
  loom(level) {
    const node = hall({ w: 5.4, d: 4.2, h: 2.5 + level * 0.05, tile: TILE, platform: 0.3, open: true });
    node.addChild(model([[BOX, [0, 1.0, -0.4], [1.8, 1.3, 1.0], WOOD], ...[-1.9, -1.3, 1.3, 1.9].map((x, i) => [BOX, [x, 1.5, 1.2], [0.5, 1.8, 0.04], [0xc0282a, 0x3f6f8f, 0xd9b04a, 0x6f9a4a][i]])]));
    return node;
  },
  still(level) {
    const node = hall({ w: 4.6, d: 4.6, h: 2.6 + level * 0.05, tile: TILE_GREEN, platform: 0.5, open: true });
    node.addChild(model([[BALL, [0, 1.2, 0], [0.75, 0.8, 0.75], 0x8a6a3a], [ROD, [0, 0.65, 0], [0.5, 0.35, 0.5], 0x4a4744], [SPIKE, [0, 2.15, 0], [0.5, 0.5, 0.5], 0x8a6a3a], ...[0, 2.1, 4.2].map((a) => [ROD, [Math.sin(a) * 0.6, 0.45, Math.cos(a) * 0.6], [0.07, 0.4, 0.07], 0x8a6a3a])]));
    return node;
  },
  yard: () => yard([dummy(-2.2, -1.5), dummy(0, -2.6), dummy(2.2, -1.5), [[BOX, [0, 0.1, 1.2], [4, 0.04, 3], 0xcbbd98]]].flat()),
  range: () => yard([rack(-2.2, -3), rack(2.2, -3), [[ROD, [3, 0.9, 1.5], [0.6, 0.12, 0.6], 0xd9c79a, [Math.PI / 2, 0, 0]], [ROD, [3, 0.9, 1.57], [0.25, 0.05, 0.25], 0xc0282a, [Math.PI / 2, 0, 0]], [ROD, [3, 0.45, 1.4], [0.05, 0.9, 0.05], WOOD]]].flat()),
  goldPit: () => model([...rocks(0x9c8a5a), [BALL, [-0.6, 1.0, 0.7], [0.25, 0.2, 0.25], 0xe8c23a], [BALL, [1.1, 0.75, -0.3], [0.2, 0.16, 0.2], 0xe8c23a]]),
  quarry: () => model([...rocks(0xa9a69c), [BOX, [2.4, 0.3, 1.6], [0.9, 0.6, 0.9], 0xc9c5b8], [BOX, [2.9, 0.75, 1.7], [0.7, 0.5, 0.7], 0xc9c5b8]]),
  ironPit: () => model([...rocks(0x5c5a60), [BOX, [0, 1.2, -2.2], [2.6, 2.2, 0.3], 0x3a3836], [BOX, [0, 1.0, -2.05], [1.4, 1.8, 0.1], 0x15151a]]),
  lumber: () =>
    model([
      ...[-0.3, 0, 0.3].map((z, i) => [ROD, [0, 0.3 + (i === 1 ? 0.5 : 0), z * (i === 1 ? 0 : 1.2)], [0.28, 4, 0.28], shade(WOOD, 1 + i * 0.1), [0, 0, Math.PI / 2]]),
      [ROD, [-3, 0.35, 2], [0.4, 0.7, 0.4], WOOD],
      [BOX, [-3, 0.9, 2], [0.08, 0.5, 0.3], 0xcfd3da, [0, 0, 0.5]],
      ...[[3.4, -2.6], [-3.6, -2.2]].flatMap(([x, z]) => [[TAPER, [x, 1, z], [0.22, 2, 0.22], WOOD], [SPIKE, [x, 3.2, z], [1.3, 3, 1.3], LEAF], [SPIKE, [x, 4.2, z], [0.95, 2.2, 0.95], shade(LEAF, 1.15)]]),
    ]),
  garden: () =>
    model([
      [BOX, [0, 0.05, 0], [PLOT - 2, 0.1, PLOT - 2], 0x7a6242],
      ...[-3, -1, 1, 3].flatMap((x) => [-3, -1.5, 0, 1.5, 3].map((z, j) => [BALL, [x, 0.3, z], [0.4, 0.3, 0.4], j % 2 ? 0x5f9a4a : 0x7ab85a])),
      ...[-2, 0, 2].map((x) => [BOX, [x, 0.12, 0], [0.3, 0.06, PLOT - 2.4], 0x5e4a30]),
    ]),
  tower(level) {
    const node = new Object3D();
    const h = 5 + level;
    node.addChild(model([[TAPER, [0, h / 2, 0], [1.5, h, 1.5], STONE_DARK], [BOX, [0, h + 0.6, 0], [2.6, 1.2, 2.6], WOOD], [BOX, [0, h + 0.1, 0], [3, 0.2, 3], shade(WOOD, 0.8)]]));
    node.addChild(roof(4.4, 4.4, 1.3, TILE, h + 1.2));
    return node;
  },
};

/** A building of one of the game's kinds at a level, standing on the origin and facing +z. */
export function createBuilding(kind, level = 1) {
  return (KINDS[kind] ?? KINDS.dorm)(level);
}

/** A conifer or a round tree, for the edges of a place. */
export const treeParts = (x, z, size = 1, round = false) =>
  round
    ? [[TAPER, [x, 0.9 * size, z], [0.2 * size, 1.8 * size, 0.2 * size], WOOD], [BALL, [x, 2.5 * size, z], [1.3 * size, 1.2 * size, 1.3 * size], LEAF], [BALL, [x + 0.5 * size, 3.1 * size, z + 0.2], [0.9 * size, 0.8 * size, 0.9 * size], shade(LEAF, 1.15)]]
    : [[TAPER, [x, 0.7 * size, z], [0.18 * size, 1.4 * size, 0.18 * size], WOOD], [SPIKE, [x, 2.4 * size, z], [1.1 * size, 2.6 * size, 1.1 * size], shade(LEAF, 0.85)], [SPIKE, [x, 3.5 * size, z], [0.8 * size, 2 * size, 0.8 * size], LEAF]];
