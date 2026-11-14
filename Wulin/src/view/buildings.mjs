// Buildings in the traditional Chinese manner, made from a few rules: a stone
// platform with steps and a balustrade, a row of red columns, walls set back
// behind them with latticed windows and studded doors, a band of painted
// brackets, and a tiled roof whose eaves sweep down and turn up at the
// corners, with ridge beams running to each of them.
//
// `createBuilding(kind, level)` returns a model of one of the game's building
// kinds, sized to fit a plot of `PLOT` metres. Higher levels are taller or
// gain a second roof. Anything that glows (lanterns, a forge's fire) is a
// second mesh in a material that ignores the light, so it shines after dark.
import { Mesh3D, Object3D } from '@egret/engine/world3d';
import { BALL, BOX, ROD, SPIKE, TAPER, beam, glow, grad, heightSurface, model, shade, toon } from './shapes.mjs';

/** The ground one building stands on, in metres; seat.mjs lays plots out in a grid. */
export const PLOT = 11;

/** The palette a building is drawn in. It is set from the sect's style before each building is made. */
let STONE = 0xbdb7a6,
  STONE_DARK = 0x8f8a7c,
  COLUMN = 0x9c2f24,
  WALL = 0xe9e1cf,
  WOOD = 0x6e4a2b,
  TILE = 0x3f4a52,
  TILE_GREEN = 0x3f6a55,
  TILE_GOLD = 0xc49a2c,
  BEAM = 0x2f6f73,
  BEAM_2 = 0x2f4f8f;
const EARTH = 0x9b8a66,
  LEAF = 0x4f7f3f,
  GOLD = 0xd9b04a,
  PAPER = 0xf1e3b8;
/** How the roof is made (see `roof`) and how far its corners turn up. */
let ROOF = 'hip',
  CURL = 1;

/**
 * The manner each sect builds in, after the part of the country it comes from and what it is.
 *   roof   'hip'    curved eaves turned up at the corners, as temples and halls have
 *          'gable'  two straight slopes between end walls, as houses have
 *          'steps'  the same, between end walls that rise in steps above the roof
 *          'thatch' a heavy cap of straw
 *          'flat'   a flat roof behind a parapet, as on the high plateau
 *   curl   how sharply a hipped roof's corners turn up: gentle in the north, sharp in the south
 *   hall   the tiles of the main hall, where they differ from the rest
 */
export const STYLES = {
  // A northern monastery: red-ochre walls, grey tiles, the great hall in imperial yellow.
  shaolin: { wall: 0xb85c40, column: 0x8f2a20, tile: 0x4a4f52, hall: 0xc49a2c, beam: 0x2f6f73, beam2: 0x2f4f8f, curl: 0.7 },
  // A Daoist mountain: deep red walls under dark green glaze.
  wudang: { wall: 0xa8483a, column: 0x7a2a22, tile: 0x2f4a42, hall: 0x2f6a52, beam: 0x24504a, beam2: 0x2a3f6a, curl: 0.9 },
  // Timber halls in the mist of a southern mountain, the summit hall gilded.
  emei: { wall: 0x8a6444, column: 0x6a3a26, tile: 0x4a5052, hall: 0xb99a3a, wood: 0x5e4028, beam: 0x3a5a4a, beam2: 0x6a4a2a, curl: 1.25 },
  // Plain stone and blue-grey tile on a bare peak.
  huashan: { wall: 0xcfd2d0, column: 0x4f5f78, tile: 0x4a5a70, hall: 0x4a5a70, stone: 0xa9aaa4, beam: 0x3f5068, beam2: 0x55627a, curl: 0.8 },
  // Whatever keeps the rain off: mud walls, rough posts, thatch.
  gaibang: { wall: 0xb39a6e, column: 0x6e5236, tile: 0xb59a52, hall: 0xb59a52, stone: 0x9a917c, beam: 0x6e5236, beam2: 0x5a4630, roof: 'thatch' },
  // The red brick and swallow-tailed ridges of the southern coast, with stone below.
  mingjiao: { wall: 0xb5553a, column: 0x8a2f24, tile: 0xb4553a, hall: 0x9a3a2a, stone: 0xb9b3a4, beam: 0x7a2a22, beam2: 0xd9b04a, curl: 1.5 },
  // White walls leaning inwards, a dark red band under a flat roof, gilt on top.
  kunlun: { wall: 0xeeeae0, column: 0x7a2a26, tile: 0x7a2a26, hall: 0xd9b04a, stone: 0xcfcabb, beam: 0x7a2a26, beam2: 0xd9b04a, roof: 'flat' },
  // White walls, black tiles and stepped gables by the water.
  caobang: { wall: 0xf1eee6, column: 0x3a3836, tile: 0x33373a, hall: 0x33373a, wood: 0x4a3a2e, beam: 0x3a3836, beam2: 0x55585a, roof: 'steps' },
  // Log houses under heavy roofs in the northern forest.
  yaowang: { wall: 0x7a5a3c, column: 0x5e4228, tile: 0x5a5046, hall: 0x4f6a4a, wood: 0x6a4a2e, stone: 0x9a968a, beam: 0x5e4228, beam2: 0x6f9a4a, roof: 'gable' },
  // White walls with painted grey borders and soaring eaves in the far south-west.
  chongsheng: { wall: 0xf3efe6, column: 0x8a3a26, tile: 0x5a5f66, hall: 0xc88a34, stone: 0xc9c5b8, beam: 0x55606e, beam2: 0xc88a34, curl: 1.4 },
  // Grey brick and grey tile: a cloister of ascetics.
  quanzhen: { wall: 0x8f9496, column: 0x5a3a36, tile: 0x4f565c, hall: 0x3f4a66, stone: 0xa9aaa6, beam: 0x3f4a66, beam2: 0x55606e, curl: 0.8 },
  // Dark timber frames filled with white, under black tiles, in the river towns of the west.
  tangmen: { wall: 0xe6e0d2, column: 0x3a2a26, tile: 0x2f2f33, hall: 0x4a2f5a, wood: 0x3f2c24, beam: 0x3a2a26, beam2: 0x5a2d6e, roof: 'gable' },
};
const PLAIN = { wall: 0xe9e1cf, column: 0x9c2f24, tile: 0x3f4a52, hall: 0x3f6a55, stone: 0xbdb7a6, wood: 0x6e4a2b, beam: 0x2f6f73, beam2: 0x2f4f8f, roof: 'hip', curl: 1 };
/** Sets the palette and the roof for the buildings that follow. */
function dress(style) {
  const look = { ...PLAIN, ...(STYLES[style] ?? {}) };
  WALL = look.wall;
  COLUMN = look.column;
  TILE = look.tile;
  TILE_GREEN = look.hall;
  TILE_GOLD = look.roof === 'thatch' ? look.hall : 0xc49a2c;
  STONE = look.stone;
  STONE_DARK = shade(look.stone, 0.76);
  WOOD = look.wood;
  BEAM = look.beam;
  BEAM_2 = look.beam2;
  ROOF = look.roof;
  CURL = look.curl;
}

const ROOF_MATERIAL = toon({ grain: 'tiled' });
const LANTERN = glow(0xff7a3a, 1.5),
  FIRE = glow(0xffa040, 1.9),
  WINDOW = glow(0xffd98a, 0.95);

/**
 * A hipped roof with curved, upturned eaves. `w` by `d` is the footprint of
 * the eaves, `rise` the height of the ridge above them.
 */
function roof(w, d, rise, tile, y) {
  if (ROOF !== 'hip') return plainRoof(w, d, rise, tile, y);
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
    return rise * Math.pow(inward, 0.62) + corner * rise * 0.55 * CURL;
  };
  // Rows of tiles run down the slope: lighter crowns and darker gutters, and a pale line along the eaves.
  const tiles = (x, z, h) => {
    const edge = Math.min(hw - Math.abs(x), hd - Math.abs(z));
    if (edge < 0.16) return shade(tile, 1.5);
    const along = hd - Math.abs(z) < (hw - Math.abs(x)) * (hd / (hw - ridge || hw)) ? x : z;
    return shade(tile, 0.8 + 0.3 * (h / rise) + (Math.round(along * 3.2) % 2 ? 0.1 : -0.04));
  };
  const surface = new Mesh3D(heightSurface(w, d, 22, 16, height, tiles), ROOF_MATERIAL);
  surface.castShadow = true;
  surface.receiveShadow = true;
  surface.setPosition(0, y, 0);
  const node = new Object3D();
  node.addChild(surface);
  const dark = shade(tile, 0.62),
    top = y + rise;
  const parts = [
    // The ridge beam, a finial at each end curling inwards, and a jewel in the middle.
    [BOX, [0, top + 0.1, 0], [ridge * 2 + 0.6, 0.26, 0.34], dark],
    [BOX, [0, top + 0.26, 0], [ridge * 2 + 0.3, 0.08, 0.2], shade(tile, 1.3)],
    [BALL, [0, top + 0.42, 0], [0.16, 0.2, 0.16], GOLD],
    // The underside of the eaves.
    [BOX, [0, y - 0.06, 0], [w * 0.95, 0.1, d * 0.95], shade(WOOD, 0.8)],
  ];
  for (const sx of [-1, 1]) {
    parts.push([BOX, [sx * (ridge + 0.34), top + 0.3, 0], [0.22, 0.5, 0.3], dark], [SPIKE, [sx * (ridge + 0.2), top + 0.66, 0], [0.16, 0.36, 0.16], dark, [0, 0, sx * 0.5]]);
    for (const sz of [-1, 1]) {
      // A ridge runs down to each corner, where a row of small beasts sits and the tip turns up.
      const tip = [sx * hw * 0.985, y + rise * 0.55 * CURL + 0.04, sz * hd * 0.985];
      parts.push(beam([sx * ridge, top + 0.02, 0], tip, 0.065, shade(tile, 0.74)));
      for (const k of [0.7, 0.8, 0.9]) parts.push([BALL, [sx * (ridge + (hw - ridge) * k), top + (tip[1] - top) * k + 0.13, sz * hd * k], [0.07, 0.1, 0.07], dark]);
      parts.push([SPIKE, [tip[0], tip[1] + 0.16, tip[2]], [0.07, 0.34, 0.07], dark, [sz * -0.5, 0, sx * 0.5]]);
    }
  }
  node.addChild(model(parts));
  return node;
}

const STRAW = toon();
/** The roofs that are not hipped: two straight slopes (plain, or between stepped end walls), thatch, or flat. */
function plainRoof(w, d, rise, tile, y) {
  const hw = w / 2,
    hd = d / 2,
    node = new Object3D();
  const parts = [];
  if (ROOF === 'flat') {
    // A slab behind a parapet with a dark band, and a gilded ornament at each corner and in the middle.
    parts.push([BOX, [0, y + 0.1, 0], [w * 0.86, 0.2, d * 0.86], shade(WALL, 0.9)], [BOX, [0, y + 0.42, 0], [w * 0.9, 0.5, d * 0.9], tile], [BOX, [0, y + 0.72, 0], [w * 0.93, 0.12, d * 0.93], shade(WALL, 1.02)], [BOX, [0, y + 0.2, 0], [w * 0.91, 0.07, d * 0.91], GOLD]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push([ROD, [sx * hw * 0.84, y + 1.1, sz * hd * 0.84], [0.1, 0.7, 0.1], GOLD], [SPIKE, [sx * hw * 0.84, y + 1.6, sz * hd * 0.84], [0.14, 0.34, 0.14], GOLD]);
    if (w > 7) parts.push([ROD, [0, y + 1.1, 0], [0.5, 0.6, 0.5], GOLD], [SPIKE, [0, y + 1.9, 0], [0.5, 1.0, 0.5], GOLD], [BALL, [0, y + 2.5, 0], 0.14, GOLD]);
    node.addChild(model(parts));
    return node;
  }
  const thatch = ROOF === 'thatch';
  const height = (x, z) => {
    const fz = Math.max(0, (hd - Math.abs(z)) / hd);
    // Thatch is thick and rounded and comes down at the ends too; tiles lie in two straight slopes.
    return thatch ? rise * 1.15 * Math.pow(Math.min(fz, Math.max(0, (hw - Math.abs(x)) / (hw * 0.5))), 0.5) : rise * 1.1 * fz;
  };
  const colour = thatch ? (x, z, h) => shade(tile, 0.78 + 0.34 * (h / rise) + (Math.round((x + z * 0.3) * 5) % 2 ? 0.07 : -0.03)) : (x, z, h) => (hd - Math.abs(z) < 0.16 ? shade(tile, 1.45) : shade(tile, 0.82 + 0.28 * (h / rise) + (Math.round(x * 3.2) % 2 ? 0.1 : -0.04)));
  const span = ROOF === 'steps' ? w * 0.9 : w;
  const surface = new Mesh3D(heightSurface(span, d, 18, 14, height, colour), thatch ? STRAW : ROOF_MATERIAL);
  surface.castShadow = true;
  surface.receiveShadow = true;
  surface.setPosition(0, y, 0);
  node.addChild(surface);
  const top = y + rise * 1.1;
  if (thatch) parts.push(beam([-hw * 0.5, top + 0.12, 0], [hw * 0.5, top + 0.12, 0], 0.16, shade(tile, 0.7)), ...[-0.4, 0, 0.4].map((k) => [BOX, [hw * k, top + 0.14, 0], [0.12, 0.2, 0.7], shade(WOOD, 0.9)]));
  else {
    parts.push([BOX, [0, top + 0.06, 0], [span + 0.2, 0.22, 0.3], shade(tile, 0.62)], [BOX, [0, y - 0.06, 0], [span * 0.96, 0.1, d * 0.94], shade(WOOD, 0.8)]);
    for (const sx of [-1, 1]) {
      if (ROOF === 'steps') {
        // The end wall climbs in three steps above the roof, each capped with tiles and tipped up at the front.
        for (let step = 0; step < 3; step++) {
          const reach = hd * (1 - step * 0.3),
            lift = rise * 1.1 * (0.42 + step * 0.34);
          parts.push([BOX, [sx * hw * 0.93, y + lift / 2 - 0.3, 0], [0.3, lift + 0.6, reach * 2], WALL], [BOX, [sx * hw * 0.93, y + lift + 0.06, 0], [0.46, 0.14, reach * 2 + 0.3], tile]);
          for (const sz of [-1, 1]) parts.push([SPIKE, [sx * hw * 0.93, y + lift + 0.3, sz * (reach + 0.1)], [0.1, 0.36, 0.1], tile, [sz * -0.5, 0, 0]]);
        }
      } else {
        // A plain gable: the wall carried up under the slopes, with a timber frame showing.
        for (let k = 0; k < 4; k++) parts.push([BOX, [sx * hw * 0.9, y + rise * 1.1 * (k + 0.5) * 0.24, 0], [0.16, rise * 1.1 * 0.25, d * 0.9 * (1 - (k + 0.5) / 4.2)], WALL]);
        parts.push([BOX, [sx * hw * 0.905, y + rise * 0.5, 0], [0.18, rise, 0.14], WOOD], [BOX, [sx * hw * 0.905, y + rise * 0.36, 0], [0.18, 0.12, d * 0.5], WOOD]);
      }
    }
  }
  node.addChild(model(parts));
  return node;
}

/** A latticed window, its middle at `x, y` on the plane `z`: frame, paper and bars. */
function lattice(x, y, z, w, h) {
  const parts = [[BOX, [x, y, z - 0.02], [w + 0.16, h + 0.16, 0.06], shade(WOOD, 0.8)]];
  for (let i = -1; i <= 1; i++) parts.push([BOX, [x + (i * w) / 3.4, y, z + 0.04], [0.04, h, 0.03], shade(COLUMN, 0.8)]);
  for (const j of [-1, 1]) parts.push([BOX, [x, y + (j * h) / 4, z + 0.04], [w, 0.04, 0.03], shade(COLUMN, 0.8)]);
  return { frame: parts, pane: [BOX, [x, y, z + 0.015], [w, h, 0.02], PAPER] };
}

/**
 * A hall: platform, steps, columns, walls, brackets and a roof.
 * @param spec.storeys   2 stacks a second, smaller hall on top
 * @param spec.open      a workshop: no walls, only posts and a roof
 * @param spec.rail      a balustrade round the platform
 * @param spec.plaque    the colour of the board over the door, or null
 */
function hall({ w, d, h, tile = TILE, storeys = 1, platform = 0.5, open = false, door = COLUMN, rail = false, plaque = null, lamps = true, upper = false }) {
  const node = new Object3D();
  const front = d / 2,
    top = platform + h;
  const parts = [
    [BOX, [0, platform / 2, 0], [w + 1.2, platform, d + 1.2], grad(STONE, 0.78, 1.02)],
    [BOX, [0, platform - 0.04, 0], [w + 1.36, 0.1, d + 1.36], shade(STONE, 1.08)],
  ];
  const glass = [],
    lit = [];
  if (!upper) {
    // A wider foot under the platform, and steps up to the door between two low walls.
    parts.push([BOX, [0, platform * 0.16, 0], [w + 1.9, platform * 0.32, d + 1.9], STONE_DARK]);
    const steps = Math.max(2, Math.round(platform / 0.2));
    for (let i = 0; i < steps; i++) parts.push([BOX, [0, (platform * (steps - i - 0.5)) / steps, front + 0.6 + 0.3 * (i + 0.5)], [2.4, platform / steps, 0.3], i % 2 ? STONE : shade(STONE, 0.93)]);
    for (const side of [-1, 1]) parts.push([BOX, [side * 1.32, platform * 0.5, front + 0.6 + steps * 0.15], [0.2, platform, steps * 0.3], STONE_DARK]);
  }
  if (rail) {
    // Posts with carved heads and a rail between them, left open in front of the steps.
    const run = (ax, az, bx, bz) => {
      const length = Math.hypot(bx - ax, bz - az),
        count = Math.max(1, Math.round(length / 1.3));
      for (let i = 0; i <= count; i++) {
        const x = ax + ((bx - ax) * i) / count,
          z = az + ((bz - az) * i) / count;
        parts.push([BOX, [x, platform + 0.3, z], [0.13, 0.6, 0.13], STONE], [BALL, [x, platform + 0.66, z], [0.09, 0.1, 0.09], shade(STONE, 1.1)]);
      }
      parts.push(beam([ax, platform + 0.48, az], [bx, platform + 0.48, bz], 0.045, shade(STONE, 0.94)), beam([ax, platform + 0.2, az], [bx, platform + 0.2, bz], 0.035, shade(STONE, 0.94)));
    };
    const ex = w / 2 + 0.5,
      ez = d / 2 + 0.5;
    run(-ex, -ez, ex, -ez);
    run(-ex, -ez, -ex, ez);
    run(ex, -ez, ex, ez);
    run(-ex, ez, -1.5, ez);
    run(1.5, ez, ex, ez);
  }
  const cols = Math.max(2, Math.round(w / 2.2)) + 1;
  for (let i = 0; i < cols; i++) {
    const x = (i / (cols - 1) - 0.5) * w;
    for (const z of [front, -front]) parts.push([ROD, [x, platform + h / 2, z], [0.16, h, 0.16], grad(COLUMN, 0.7, 1.08)], [BOX, [x, platform + 0.07, z], [0.44, 0.14, 0.44], STONE_DARK], [BOX, [x, top - 0.34, z], [0.36, 0.1, 0.36], BEAM]);
    // A lantern hangs from the beam between the front columns.
    if (lamps && i > 0 && (cols < 5 || i % 2 === 1) && !(Math.abs(x - w / (cols - 1) / 2) < 1.2 && cols % 2 === 0)) {
      const lx = x - w / (cols - 1) / 2;
      if (Math.abs(lx) > 1) {
        parts.push([ROD, [lx, top - 0.5, front + 0.12], [0.012, 0.36, 0.012], 0x2a2420], [ROD, [lx, top - 0.68, front + 0.12], [0.1, 0.03, 0.1], GOLD], [ROD, [lx, top - 1.06, front + 0.12], [0.1, 0.03, 0.1], GOLD], [SPIKE, [lx, top - 1.22, front + 0.12], [0.03, 0.26, 0.03], 0xc0282a, [Math.PI, 0, 0]]);
        lit.push([BALL, [lx, top - 0.87, front + 0.12], [0.2, 0.19, 0.2], 0xffffff]);
      }
    }
  }
  if (!open) {
    const wallZ = front - 0.8;
    parts.push([BOX, [0, platform + h / 2, -0.25], [w - 0.4, h, d - 1.1], grad(WALL, 0.8, 1.04)], [BOX, [0, platform + 0.3, -0.25], [w - 0.34, 0.6, d - 1.04], shade(STONE, 0.9)]);
    // Where houses are framed in timber, the frame shows dark against the infill.
    if (ROOF === 'gable' || ROOF === 'steps')
      for (let i = 0; i <= Math.round(w / 1.8); i++) parts.push([BOX, [(i / Math.round(w / 1.8) - 0.5) * (w - 0.5), platform + h / 2, front - 0.54], [0.1, h, 0.06], WOOD]);
    // Double doors with a frame, studs and ring handles.
    const dh = h * 0.84;
    parts.push([BOX, [0, platform + dh / 2, wallZ], [1.9, dh + 0.14, 0.1], shade(WOOD, 0.7)]);
    for (const side of [-1, 1]) {
      parts.push([BOX, [side * 0.44, platform + dh / 2, wallZ + 0.04], [0.84, dh, 0.08], door]);
      for (const sx of [-0.2, 0.2]) for (const k of [0.25, 0.5, 0.75]) parts.push([BALL, [side * 0.44 + sx, platform + dh * k, wallZ + 0.09], 0.035, GOLD]);
      parts.push([ROD, [side * 0.12, platform + dh * 0.5, wallZ + 0.1], [0.05, 0.02, 0.05], GOLD, [Math.PI / 2, 0, 0]]);
    }
    if (plaque !== null) parts.push([BOX, [0, top - 0.52, front + 0.14], [1.7, 0.56, 0.08], GOLD], [BOX, [0, top - 0.52, front + 0.17], [1.5, 0.4, 0.06], plaque]);
    // Windows either side of the door, and along the sides of a wide hall.
    const span = (w - 2.6) / 2;
    const count = span > 3.4 ? 2 : span > 1.3 ? 1 : 0;
    for (const side of [-1, 1])
      for (let i = 0; i < count; i++) {
        const made = lattice(side * (1.3 + (span * (i + 0.5)) / count), platform + h * 0.56, wallZ + 0.01, Math.min(1.3, span / count - 0.5), h * 0.36);
        parts.push(...made.frame);
        glass.push(made.pane);
      }
  }
  // The beam over the columns, and the band of painted brackets that carries the eaves.
  for (const z of [front, -front]) parts.push([BOX, [0, top - 0.14, z], [w + 0.3, 0.28, 0.22], BEAM], [BOX, [0, top - 0.02, z], [w + 0.34, 0.05, 0.26], GOLD]);
  for (const x of [w / 2, -w / 2]) parts.push([BOX, [x, top - 0.14, 0], [0.22, 0.28, d + 0.3], BEAM]);
  const brackets = Math.round(w / 0.7);
  for (let i = 0; i <= brackets; i++) for (const z of [front + 0.2, -front - 0.2]) parts.push([BOX, [(i / brackets - 0.5) * (w + 0.2), top + 0.12, z], [0.2, 0.24, 0.34], i % 2 ? BEAM : BEAM_2]);
  node.addChild(model(parts));
  if (glass.length) node.addChild(model(glass, WINDOW, false));
  if (lit.length) node.addChild(model(lit, LANTERN, false));
  node.addChild(roof(w + 2.8, d + 2.8, h * 0.62, tile, top + 0.2));
  if (storeys > 1) {
    const above = hall({ w: w * 0.62, d: d * 0.62, h: h * 0.7, tile, platform: 0.2, door, lamps: false, upper: true });
    above.setPosition(0, top + h * 0.34, 0);
    node.addChild(above);
  }
  return node;
}

/** A fenced yard with something standing in it. */
function yard(inside, floor = EARTH) {
  const half = PLOT / 2 - 1;
  const parts = [[BOX, [0, 0.04, 0], [PLOT - 2, 0.08, PLOT - 2], floor], [BOX, [0, 0.05, 0], [PLOT - 2.6, 0.085, PLOT - 2.6], shade(floor, 1.07)]];
  for (const side of [-1, 1])
    for (let i = -2; i <= 2; i++) {
      parts.push([ROD, [side * half, 0.45, i * 2], [0.07, 0.9, 0.07], WOOD], [BALL, [side * half, 0.93, i * 2], 0.085, shade(WOOD, 1.2)]);
      if (i < 2) parts.push([BOX, [side * half, 0.7, i * 2 + 1], [0.05, 0.06, 2], WOOD], [BOX, [side * half, 0.4, i * 2 + 1], [0.05, 0.06, 2], WOOD]);
    }
  // A back rail, and gateposts with a beam at the front.
  for (let i = -2; i <= 2; i++) parts.push([ROD, [i * 2, 0.45, -half], [0.07, 0.9, 0.07], WOOD]);
  parts.push([BOX, [0, 0.7, -half], [half * 2, 0.06, 0.05], WOOD], [BOX, [0, 0.4, -half], [half * 2, 0.06, 0.05], WOOD]);
  for (const side of [-1, 1]) parts.push([ROD, [side * 1.4, 0.9, half], [0.1, 1.8, 0.1], COLUMN]);
  parts.push([BOX, [0, 1.75, half], [3.4, 0.14, 0.16], BEAM]);
  return model([...parts, ...inside]);
}

const rack = (x, z) => [
  [BOX, [x, 0.5, z], [1.8, 0.06, 0.1], WOOD],
  [BOX, [x, 1.0, z], [1.8, 0.05, 0.08], WOOD],
  [ROD, [x - 0.8, 0.55, z], [0.05, 1.1, 0.05], WOOD],
  [ROD, [x + 0.8, 0.55, z], [0.05, 1.1, 0.05], WOOD],
  ...[-0.55, -0.2, 0.2, 0.55].map((dx, i) => [ROD, [x + dx, 0.95, z + 0.08], [0.025, 1.6, 0.025], i % 2 ? 0xcfd3da : 0x8a6a48, [0.12, 0, 0]]),
  ...[-0.55, 0.2].map((dx) => [SPIKE, [x + dx, 1.82, z + 0.18], [0.05, 0.22, 0.02], 0xcfd3da, [0.12, 0, 0]]),
];
const dummy = (x, z) => [
  [ROD, [x, 0.7, z], [0.12, 1.4, 0.12], WOOD],
  [ROD, [x, 0.05, z], [0.3, 0.1, 0.3], STONE_DARK],
  [ROD, [x, 1.0, z], [0.03, 0.7, 0.03], WOOD, [0, 0, Math.PI / 2]],
  [ROD, [x, 0.75, z + 0.2], [0.03, 0.5, 0.03], WOOD, [Math.PI / 2, 0, 0]],
  [ROD, [x, 0.5, z], [0.03, 0.6, 0.03], WOOD, [0, 0.8, Math.PI / 2]],
  [ROD, [x, 1.2, z], [0.125, 0.12, 0.125], 0xc9b98c],
];
const barrel = (x, z, s = 1) => [[ROD, [x, 0.35 * s, z], [0.26 * s, 0.7 * s, 0.26 * s], 0x7a5632], [ROD, [x, 0.18 * s, z], [0.275 * s, 0.05, 0.275 * s], 0x3a3836], [ROD, [x, 0.52 * s, z], [0.275 * s, 0.05, 0.275 * s], 0x3a3836]];
const crate = (x, z, s = 1, turn = 0) => [[BOX, [x, 0.3 * s, z], [0.6 * s, 0.6 * s, 0.6 * s], 0x8a6a48, [0, turn, 0]], [BOX, [x, 0.3 * s, z], [0.64 * s, 0.08, 0.64 * s], 0x5e4630, [0, turn, 0]]];
const sack = (x, z) => [[BALL, [x, 0.22, z], [0.3, 0.24, 0.24], 0xc9b98c], [BALL, [x, 0.42, z], [0.1, 0.08, 0.1], 0xb3a276]];
const rocks = (colour) => [
  [BALL, [-1, 0.5, 0.4], [1.3, 0.9, 1.1], colour],
  [BALL, [0.9, 0.35, -0.6], [1.0, 0.7, 0.9], shade(colour, 0.85)],
  [BALL, [0.3, 0.25, 1.4], [0.7, 0.45, 0.6], shade(colour, 1.1)],
  [BALL, [-2.1, 0.2, -1.2], [0.5, 0.3, 0.45], shade(colour, 0.92)],
  [BALL, [2.2, 0.16, 1.0], [0.4, 0.24, 0.36], shade(colour, 1.05)],
  // A handcart, a pick and a basket.
  [BOX, [-2.6, 0.5, 1.8], [1.2, 0.5, 0.8], WOOD],
  [ROD, [-2.6, 0.25, 2.24], [0.25, 0.06, 0.25], shade(WOOD, 0.7), [Math.PI / 2, 0, 0]],
  [ROD, [-2.6, 0.25, 1.36], [0.25, 0.06, 0.25], shade(WOOD, 0.7), [Math.PI / 2, 0, 0]],
  [ROD, [-1.7, 0.55, 2.0], [0.03, 0.9, 0.03], WOOD, [0, 0, 1.2]],
  [ROD, [2.4, 0.45, -1.6], [0.03, 0.9, 0.03], WOOD, [0.5, 0, 0.3]],
  [BOX, [2.56, 0.84, -1.42], [0.36, 0.05, 0.06], 0x55585e, [0.5, 0, 0.3]],
  [TAPER, [1.9, 0.2, 2.0], [0.3, 0.4, 0.3], 0xa98a52, [Math.PI, 0, 0]],
];
/** The timber frame at the mouth of a pit. */
const pitMouth = (z) => [[BOX, [-0.8, 1.0, z], [0.22, 2.0, 0.22], WOOD], [BOX, [0.8, 1.0, z], [0.22, 2.0, 0.22], WOOD], [BOX, [0, 2.05, z], [2.1, 0.24, 0.26], WOOD], [BOX, [0, 0.95, z - 0.1], [1.4, 1.9, 0.1], 0x15151a]];

/** How each building kind looks. Level raises a hall or adds a storey. */
const KINDS = {
  hall: (level) => hall({ w: 8.4, d: 5.6, h: 3 + level * 0.15, tile: level >= 4 ? TILE_GOLD : TILE_GREEN, storeys: level >= 3 ? 2 : 1, platform: 1.1, rail: true, plaque: 0x1f2a44 }),
  gate(level) {
    const node = new Object3D();
    const parts = [
      ...[-2.6, 2.6].flatMap((x) => [[ROD, [x, 2.1, 0], [0.26, 4.2, 0.26], COLUMN], [BOX, [x, 0.25, 0], [0.84, 0.5, 0.84], STONE_DARK], [BOX, [x, 3.5, 0], [0.5, 0.14, 0.5], BEAM]]),
      [BOX, [0, 3.72, 0], [6.4, 0.36, 0.32], BEAM],
      [BOX, [0, 3.92, 0], [6.5, 0.06, 0.38], GOLD],
      [BOX, [0, 3.2, 0], [2.6, 0.72, 0.12], GOLD],
      [BOX, [0, 3.2, 0.04], [2.36, 0.52, 0.1], 0x1f2a44],
      // Two heavy leaves stand open, and a stone beast sits either side.
      ...[-1, 1].flatMap((s) => [[BOX, [s * 2.3, 1.7, -0.9], [0.12, 3.3, 1.8], COLUMN, [0, s * 0.12, 0]], ...[0.3, 0.5, 0.7].flatMap((k) => [-0.5, 0.1].map((dz) => [BALL, [s * 2.22, 3.3 * k, -0.9 + dz], 0.05, GOLD]))]),
      ...[-3.9, 3.9].flatMap((x) => [[BOX, [x, 0.35, 1.5], [0.9, 0.7, 0.9], STONE], [BALL, [x, 1.05, 1.5], [0.36, 0.42, 0.44], STONE_DARK], [BALL, [x, 1.5, 1.72], [0.26, 0.26, 0.26], STONE_DARK]]),
      ...[-4.4, 4.4].flatMap((x) => [[BOX, [x, 1.1, 0], [3, 2.2, 0.5], WALL], [BOX, [x, 0.3, 0], [3.06, 0.6, 0.56], shade(STONE, 0.9)], [BOX, [x, 2.32, 0], [3.3, 0.24, 0.9], TILE]]),
    ];
    const steps = [0, 1, 2].map((i) => [BOX, [0, 0.06 + i * 0.0, 1.0 + i * 0.5], [5, 0.12, 0.5], i % 2 ? STONE : shade(STONE, 0.93)]);
    node.addChild(model([...parts, ...steps]));
    node.addChild(model([-2.6, 2.6].map((x) => [BALL, [x, 2.7, 0.5], [0.24, 0.3, 0.24], 0xffffff]), LANTERN, false));
    node.addChild(roof(8.4, 2.8, 0.95 + level * 0.05, TILE, 4.05));
    return node;
  },
  board: () =>
    model([
      [ROD, [-0.9, 0.9, 0], [0.07, 1.8, 0.07], WOOD],
      [ROD, [0.9, 0.9, 0], [0.07, 1.8, 0.07], WOOD],
      [BOX, [0, 1.2, 0], [2.1, 1.1, 0.08], 0xd9c79a],
      [BOX, [0, 1.2, 0.02], [1.9, 0.92, 0.07], 0xefe2bd],
      [BOX, [0, 1.9, 0], [2.7, 0.1, 0.7], TILE],
      [BOX, [0, 1.98, 0], [2.3, 0.08, 0.3], shade(TILE, 0.8)],
      [BOX, [-0.5, 1.25, 0.07], [0.5, 0.7, 0.02], 0xc0282a],
      [BOX, [0.2, 1.3, 0.07], [0.42, 0.56, 0.02], 0xf6f0dc],
      [BOX, [0.68, 1.15, 0.07], [0.3, 0.42, 0.02], 0xf6f0dc],
      [BOX, [0, 0.06, 0], [2.6, 0.12, 0.8], STONE_DARK],
    ]),
  dorm: (level) => hall({ w: 6.4, d: 3.8, h: 2.3 + level * 0.25, tile: TILE, platform: 0.4, door: WOOD }),
  mess(level) {
    const node = hall({ w: 7, d: 4.4, h: 2.6 + level * 0.2, tile: TILE, platform: 0.4, door: WOOD });
    // A chimney at the back, and stores stacked by the door.
    node.addChild(model([[BOX, [2.6, 2.8 + level * 0.2, -1.6], [0.7, 3.4, 0.7], 0x8f8a7c], [BOX, [2.6, 4.56 + level * 0.2, -1.6], [0.9, 0.16, 0.9], 0x5a5653], ...barrel(-4.1, 2.4), ...barrel(-4.7, 2.0, 0.9), ...sack(4.2, 2.6), ...sack(4.6, 2.2), ...sack(4.4, 2.44).map((part) => [part[0], [part[1][0], part[1][1] + 0.3, part[1][2]], part[2], part[3]])]));
    node.smoke = [2.6, 4.8 + level * 0.2, -1.6];
    return node;
  },
  store(level) {
    const node = hall({ w: 5.6, d: 4.6, h: 2.8 + level * 0.2, tile: TILE, platform: 0.6, door: 0x4a3a2a });
    node.addChild(model([...crate(-3.9, 2.6), ...crate(-3.9, 2.6, 0.8, 0.5).map((part) => [part[0], [part[1][0], part[1][1] + 0.6, part[1][2]], part[2], part[3], part[4]]), ...crate(-4.6, 1.9, 0.9, 0.3), ...barrel(3.8, 2.7), ...barrel(4.4, 2.5), ...barrel(4.1, 2.1, 0.85)]));
    return node;
  },
  library: (level) => hall({ w: 5.4, d: 5.4, h: 2.7, tile: TILE_GREEN, storeys: 2, platform: 0.8 + level * 0.05, rail: true, plaque: 0x24402f }),
  clinic(level) {
    const node = hall({ w: 5.6, d: 4, h: 2.5, tile: TILE_GREEN, platform: 0.4, door: 0x3d7a4a, plaque: 0x24402f });
    // Herbs drying on racks in front.
    node.addChild(model([-1, 1].flatMap((s) => [[ROD, [s * 3.6, 0.5, 2.8], [0.04, 1.0, 0.04], WOOD], [ROD, [s * 3.6, 0.5, 3.8], [0.04, 1.0, 0.04], WOOD], [BOX, [s * 3.6, 0.95, 3.3], [0.9, 0.05, 1.3], 0xb39a62], ...[-0.3, 0, 0.3].map((dz, i) => [BALL, [s * 3.6, 1.02, 3.3 + dz], [0.3, 0.06, 0.14], [0x6f9a4a, 0xb9a23a, 0x8a5a3a][(i + level) % 3]])])));
    return node;
  },
  council: () => hall({ w: 7.2, d: 4.8, h: 3, tile: TILE, platform: 0.8, rail: true, plaque: 0x3a1f1f }),
  cell: () => hall({ w: 3, d: 3, h: 2.2, tile: TILE, platform: 0.3, door: WOOD, lamps: false }),
  forge(level) {
    const node = hall({ w: 5.4, d: 4.2, h: 2.6, tile: TILE, platform: 0.3, open: true, lamps: false });
    node.addChild(
      model([
        [BOX, [0, 0.8, -0.6], [1.6, 1.0, 1.2], 0x4a4744],
        [BOX, [0, 1.34, -0.6], [1.2, 0.1, 0.9], 0x2e2c2a],
        [TAPER, [2.3, 2.4 + level * 0.1, -1.6], [0.4, 4.4, 0.4], 0x5a5653],
        // An anvil on a block, a quenching trough, bellows and a rack of tongs and blanks.
        [ROD, [-1.5, 0.52, 0.8], [0.3, 0.44, 0.3], WOOD],
        [BOX, [-1.5, 0.86, 0.8], [0.7, 0.24, 0.3], 0x2e2e33],
        [SPIKE, [-1.98, 0.86, 0.8], [0.12, 0.3, 0.12], 0x2e2e33, [0, 0, Math.PI / 2]],
        [BOX, [1.5, 0.52, 1.0], [1.3, 0.44, 0.5], shade(WOOD, 0.8)],
        [BOX, [1.5, 0.72, 1.0], [1.14, 0.06, 0.36], 0x3d6470],
        [BOX, [1.2, 0.7, -0.5], [0.5, 0.36, 0.8], 0x7a5632, [0, 0, 0.2]],
        ...[-2.4, -2.1, -1.8].map((x) => [ROD, [x, 1.1, -1.7], [0.03, 1.4, 0.03], 0x55585e, [0.1, 0, 0]]),
      ]),
    );
    node.addChild(model([[BOX, [0, 1.42, -0.6], [1.0, 0.1, 0.7], 0xffffff]], FIRE, false));
    node.smoke = [2.3, 4.7 + level * 0.1, -1.6];
    return node;
  },
  loom(level) {
    const node = hall({ w: 5.4, d: 4.2, h: 2.5 + level * 0.05, tile: TILE, platform: 0.3, open: true, lamps: false });
    node.addChild(
      model([
        // A loom with its warp, and dyed cloth hung out on lines.
        [BOX, [0, 0.9, -0.4], [1.8, 0.12, 1.2], WOOD],
        ...[-0.85, 0.85].flatMap((x) => [-0.95, 0.15].map((z) => [ROD, [x, 0.85, z], [0.06, 1.1, 0.06], WOOD])),
        [BOX, [0, 1.4, -0.95], [1.8, 0.08, 0.08], WOOD],
        [BOX, [0, 1.16, -0.4], [1.5, 0.02, 1.0], 0xe9e1cf, [0.42, 0, 0]],
        ...[-1.9, -1.3, 1.3, 1.9].map((x, i) => [BOX, [x, 1.5, 1.2], [0.5, 1.8, 0.04], [0xc0282a, 0x3f6f8f, 0xd9b04a, 0x6f9a4a][i]]),
        beam([-2.3, 2.42, 1.2], [2.3, 2.42, 1.2], 0.02, 0x2a2420),
        ...[-3.6, 3.6].map((x) => [ROD, [x, 0.36, 2.4], [0.4, 0.5, 0.4], 0x4a4744]),
        [ROD, [-3.6, 0.58, 2.4], [0.34, 0.06, 0.34], 0x3f6f8f],
        [ROD, [3.6, 0.58, 2.4], [0.34, 0.06, 0.34], 0xa33a2a],
      ]),
    );
    return node;
  },
  still(level) {
    const node = hall({ w: 4.6, d: 4.6, h: 2.6 + level * 0.05, tile: TILE_GREEN, platform: 0.5, open: true, lamps: false });
    node.addChild(model([[BALL, [0, 1.2, 0], [0.75, 0.8, 0.75], 0x8a6a3a], [ROD, [0, 1.2, 0], [0.77, 0.08, 0.77], GOLD], [ROD, [0, 0.65, 0], [0.5, 0.35, 0.5], 0x4a4744], [SPIKE, [0, 2.15, 0], [0.5, 0.5, 0.5], 0x8a6a3a], [BALL, [0, 2.44, 0], 0.09, GOLD], ...[0, 2.1, 4.2].map((a) => [ROD, [Math.sin(a) * 0.6, 0.45, Math.cos(a) * 0.6], [0.07, 0.4, 0.07], 0x8a6a3a]), ...[-1.5, -1.1, 1.1, 1.5].map((x, i) => [ROD, [x, 0.72, -1.6], [0.14, 0.34, 0.14], [0x7a9a8a, 0xa9a69c, 0x9a7a5a, 0x7a9a8a][i]])]));
    node.addChild(model([[ROD, [0, 0.52, 0], [0.4, 0.06, 0.4], 0xffffff]], FIRE, false));
    node.smoke = [0, 3.4, 0];
    return node;
  },
  yard: () => yard([dummy(-2.2, -1.5), dummy(0, -2.6), dummy(2.2, -1.5), [[BOX, [0, 0.1, 1.2], [4, 0.04, 3], 0xcbbd98], [BOX, [0, 0.105, 1.2], [3.6, 0.04, 2.6], 0xd6c8a2], [ROD, [-3.4, 0.5, 2.8], [0.5, 0.5, 0.5], 0x8a2f24], [ROD, [-3.4, 0.76, 2.8], [0.52, 0.04, 0.52], 0xe9dcb6], ...[0.3, -0.3].map((dx) => [ROD, [-3.4 + dx, 0.2, 2.8], [0.04, 0.5, 0.04], WOOD, [0, 0, dx]])], ...[1.2, 2.0, 2.8].map((z) => [[ROD, [3.3, 0.14, z], [0.2, 0.28, 0.2], STONE_DARK]])].flat()),
  range: () => yard([...rack(-2.2, -3), ...rack(2.2, -3), ...[-1.4, 1.4, 3].map((x) => [[ROD, [x, 0.9, 1.5], [0.6, 0.12, 0.6], 0xd9c79a, [Math.PI / 2, 0, 0]], [ROD, [x, 0.9, 1.57], [0.4, 0.05, 0.4], BEAM_2, [Math.PI / 2, 0, 0]], [ROD, [x, 0.9, 1.6], [0.2, 0.05, 0.2], 0xc0282a, [Math.PI / 2, 0, 0]], [ROD, [x - 0.3, 0.45, 1.3], [0.05, 0.9, 0.05], WOOD, [0.2, 0, 0]], [ROD, [x + 0.3, 0.45, 1.3], [0.05, 0.9, 0.05], WOOD, [0.2, 0, 0]]]).flat()]),
  goldPit: () => model([...rocks(0x9c8a5a), ...pitMouth(-2.2), [BALL, [-0.6, 1.0, 0.7], [0.25, 0.2, 0.25], 0xe8c23a], [BALL, [1.1, 0.75, -0.3], [0.2, 0.16, 0.2], 0xe8c23a], [BALL, [0.2, 0.5, 1.5], [0.14, 0.1, 0.14], 0xe8c23a], [BOX, [3.0, 0.2, -0.4], [1.4, 0.3, 0.5], WOOD, [0, 0.4, 0]], [BOX, [3.0, 0.32, -0.4], [1.2, 0.08, 0.36], 0x5c7f8a, [0, 0.4, 0]]]),
  quarry: () => model([...rocks(0xa9a69c), [BOX, [2.4, 0.3, 1.6], [0.9, 0.6, 0.9], 0xc9c5b8], [BOX, [2.9, 0.75, 1.7], [0.7, 0.5, 0.7], 0xc9c5b8], [BOX, [2.0, 0.26, 0.5], [1.2, 0.5, 0.6], 0xd4d0c2, [0, 0.3, 0]], [BOX, [0, 1.3, -2.6], [5, 2.6, 0.9], 0x9a978d], [BOX, [-1.4, 2.0, -2.2], [1.6, 1.2, 0.5], 0xb3b0a6], [BOX, [1.6, 0.9, -2.1], [1.4, 1.8, 0.5], 0xa5a298]]),
  ironPit: () => model([...rocks(0x5c5a60), ...pitMouth(-2.2), [BOX, [0, 1.3, -2.6], [4.4, 2.6, 0.6], 0x3a3836], beam([-0.4, 0.08, -1.8], [-0.4, 0.08, 3], 0.04, 0x55585e), beam([0.4, 0.08, -1.8], [0.4, 0.08, 3], 0.04, 0x55585e), [BOX, [0, 0.45, 1.6], [0.9, 0.5, 1.2], shade(WOOD, 0.8)], [BALL, [0, 0.76, 1.6], [0.36, 0.2, 0.5], 0x4a4850]]),
  lumber: () =>
    model([
      ...[-0.3, 0, 0.3].map((z, i) => [ROD, [0, 0.3 + (i === 1 ? 0.5 : 0), z * (i === 1 ? 0 : 1.2)], [0.28, 4, 0.28], shade(WOOD, 1 + i * 0.1), [0, 0, Math.PI / 2]]),
      ...[-2, 2].flatMap((x) => [-0.3, 0, 0.3].map((z, i) => [ROD, [x, 0.3 + (i === 1 ? 0.5 : 0), z * (i === 1 ? 0 : 1.2)], [0.285, 0.02, 0.285], 0xd9b98a, [0, 0, Math.PI / 2]])),
      [ROD, [-3, 0.35, 2], [0.4, 0.7, 0.4], WOOD],
      [ROD, [-3, 0.71, 2], [0.38, 0.02, 0.38], 0xd9b98a],
      [BOX, [-3, 0.9, 2], [0.08, 0.5, 0.3], 0xcfd3da, [0, 0, 0.5]],
      [ROD, [-2.7, 1.1, 2], [0.03, 0.8, 0.03], WOOD, [0, 0, -1.0]],
      // A saw-horse with a plank on it, and cut planks stacked.
      ...[1.6, 3.0].flatMap((x) => [[ROD, [x, 0.4, 2.2], [0.04, 0.9, 0.04], WOOD, [0.4, 0, 0]], [ROD, [x, 0.4, 2.6], [0.04, 0.9, 0.04], WOOD, [-0.4, 0, 0]]]),
      [BOX, [2.3, 0.8, 2.4], [2.6, 0.08, 0.4], 0xc9a26a],
      ...[0, 1, 2].map((i) => [BOX, [2.6, 0.08 + i * 0.12, -2.4], [2.4, 0.1, 0.9], shade(0xc9a26a, 1 - i * 0.06), [0, i * 0.05, 0]]),
      ...[[3.4, -2.6], [-3.6, -2.2]].flatMap(([x, z]) => [[TAPER, [x, 1, z], [0.22, 2, 0.22], WOOD], [SPIKE, [x, 3.2, z], [1.3, 3, 1.3], LEAF], [SPIKE, [x, 4.2, z], [0.95, 2.2, 0.95], shade(LEAF, 1.15)]]),
      [ROD, [-3.8, 0.2, -0.4], [0.34, 0.4, 0.34], WOOD],
      [ROD, [-3.8, 0.41, -0.4], [0.32, 0.02, 0.32], 0xd9b98a],
    ]),
  garden: () =>
    model([
      [BOX, [0, 0.05, 0], [PLOT - 2, 0.1, PLOT - 2], 0x7a6242],
      // Raised beds of four crops, a path between them, a trellis at the back, a scarecrow and a water butt.
      ...[-3, -1, 1, 3].flatMap((x, i) => [[BOX, [x, 0.14, 0.4], [1.3, 0.12, PLOT - 4], 0x5e4a30], ...[-3, -2, -1, 0, 1, 2, 3].map((z, j) => (i % 2 ? [BALL, [x, 0.36, z * 1.02 + 0.4], [0.36, 0.26, 0.36], j % 2 ? 0x5f9a4a : 0x7ab85a] : [SPIKE, [x, 0.5, z * 1.02 + 0.4], [0.22, 0.6, 0.22], j % 2 ? 0x6fae52 : 0x8fbf5a])), ...(i === 3 ? [-2, 0, 2].map((z) => [BALL, [x + 0.2, 0.52, z + 0.4], 0.08, 0xd9a23a]) : i === 1 ? [-3, -1, 1, 3].map((z) => [BALL, [x - 0.2, 0.5, z + 0.4], 0.07, 0xc85a8a]) : [])]),
      ...[-4, -2, 0, 2, 4].map((x) => [ROD, [x, 0.9, -4.1], [0.04, 1.8, 0.04], WOOD]),
      beam([-4, 1.7, -4.1], [4, 1.7, -4.1], 0.03, WOOD),
      beam([-4, 1.0, -4.1], [4, 1.0, -4.1], 0.03, WOOD),
      ...[-3, -1, 1, 3].map((x, i) => [BALL, [x, 1.3, -4.1], [0.8, 0.5, 0.2], i % 2 ? 0x4f8a3f : 0x67a04d]),
      [ROD, [4.1, 0.9, 3.9], [0.04, 1.8, 0.04], WOOD],
      [ROD, [4.1, 1.3, 3.9], [0.03, 1.2, 0.03], WOOD, [0, 0, Math.PI / 2]],
      [BALL, [4.1, 1.86, 3.9], 0.16, 0xd9c79a],
      [SPIKE, [4.1, 2.06, 3.9], [0.3, 0.2, 0.3], 0xb39a52],
      [BOX, [4.1, 1.2, 3.9], [0.5, 0.6, 0.1], 0x7a5a8a],
      ...barrel(-4.1, 3.9, 1.1),
    ]),
  tower(level) {
    const node = new Object3D();
    const h = 5 + level;
    node.addChild(
      model([
        [TAPER, [0, h / 2, 0], [1.5, h, 1.5], STONE_DARK],
        ...[0.25, 0.5, 0.75].map((k) => [ROD, [0, h * k, 0], [1.5 - 0.6 * k + 0.03, 0.08, 1.5 - 0.6 * k + 0.03], shade(STONE_DARK, 0.85)]),
        [BOX, [0, h * 0.4, 0.92 + 0.2], [0.5, 0.9, 0.1], 0x15151a],
        [BOX, [0, h + 0.1, 0], [3, 0.2, 3], shade(WOOD, 0.8)],
        ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => [ROD, [sx * 1.3, h + 0.9, sz * 1.3], [0.1, 1.5, 0.1], COLUMN])),
        ...[-1, 1].flatMap((s) => [[BOX, [0, h + 0.6, s * 1.35], [2.7, 0.08, 0.06], WOOD], [BOX, [s * 1.35, h + 0.6, 0], [0.06, 0.08, 2.7], WOOD]]),
        // A signal drum under the roof and a pennant on a pole.
        [ROD, [0, h + 0.6, 0], [0.5, 0.5, 0.5], 0x8a2f24, [Math.PI / 2, 0, 0]],
        [ROD, [1.3, h + 3.4, 1.3], [0.035, 2.4, 0.035], WOOD],
      ]),
    );
    node.addChild(roof(4.6, 4.6, 1.3, TILE, h + 1.7));
    return node;
  },
};

/**
 * A building of one of the game's kinds at a level, standing on the origin and facing +z.
 * `style` is the sect whose manner it is built in (see STYLES); without one it is built plainly.
 * A building with a fire burning in it carries `smoke`: where its smoke rises from, as [x, y, z].
 */
export function createBuilding(kind, level = 1, style = null) {
  dress(style);
  return (KINDS[kind] ?? KINDS.dorm)(level);
}

const TREES = {
  pine: (x, z, s) => [[TAPER, [x, 0.7 * s, z], [0.18 * s, 1.4 * s, 0.18 * s], grad(WOOD)], [SPIKE, [x, 2.0 * s, z], [1.15 * s, 2.0 * s, 1.15 * s], grad(shade(LEAF, 0.78))], [SPIKE, [x, 2.9 * s, z], [0.9 * s, 1.8 * s, 0.9 * s], grad(shade(LEAF, 0.9))], [SPIKE, [x, 3.7 * s, z], [0.62 * s, 1.5 * s, 0.62 * s], grad(LEAF)]],
  round: (x, z, s) => [[TAPER, [x, 0.9 * s, z], [0.2 * s, 1.8 * s, 0.2 * s], grad(WOOD)], [BALL, [x, 2.5 * s, z], [1.3 * s, 1.2 * s, 1.3 * s], grad(LEAF)], [BALL, [x + 0.5 * s, 3.1 * s, z + 0.2], [0.9 * s, 0.8 * s, 0.9 * s], grad(shade(LEAF, 1.15))], [BALL, [x - 0.6 * s, 2.9 * s, z - 0.3 * s], [0.8 * s, 0.7 * s, 0.8 * s], grad(shade(LEAF, 0.9))]],
  maple: (x, z, s) => [[TAPER, [x, 0.9 * s, z], [0.18 * s, 1.8 * s, 0.18 * s], grad(shade(WOOD, 0.8))], [BALL, [x, 2.4 * s, z], [1.2 * s, 1.0 * s, 1.2 * s], grad(0xc2552a)], [BALL, [x + 0.5 * s, 2.9 * s, z], [0.8 * s, 0.7 * s, 0.8 * s], grad(0xd9792a)], [BALL, [x - 0.5 * s, 2.8 * s, z + 0.3 * s], [0.7 * s, 0.6 * s, 0.7 * s], grad(0xa8402a)]],
  blossom: (x, z, s) => [[TAPER, [x, 0.7 * s, z], [0.14 * s, 1.4 * s, 0.14 * s], grad(0x4a3428)], [ROD, [x + 0.3 * s, 1.5 * s, z], [0.05 * s, 0.9 * s, 0.05 * s], 0x4a3428, [0, 0, -0.7]], [BALL, [x, 2.0 * s, z], [1.0 * s, 0.8 * s, 1.0 * s], grad(0xf2b8c6)], [BALL, [x + 0.6 * s, 2.2 * s, z + 0.2 * s], [0.7 * s, 0.55 * s, 0.7 * s], grad(0xf7d0d8)], [BALL, [x - 0.5 * s, 2.3 * s, z - 0.2 * s], [0.6 * s, 0.5 * s, 0.6 * s], grad(0xe89ab0)]],
  willow: (x, z, s) => [[TAPER, [x, 1.0 * s, z], [0.22 * s, 2.0 * s, 0.22 * s], grad(0x5a4632)], [BALL, [x, 2.5 * s, z], [1.3 * s, 0.8 * s, 1.3 * s], grad(0x7fae5a)], ...[0, 1, 2, 3, 4, 5].map((i) => [TAPER, [x + Math.cos(i * 1.05) * 1.05 * s, 1.75 * s, z + Math.sin(i * 1.05) * 1.05 * s], [0.3 * s, 1.5 * s, 0.3 * s], grad(i % 2 ? 0x8fbf66 : 0x7fae5a), [Math.PI, 0, 0]])],
  bamboo: (x, z, s) => [0, 1, 2, 3, 4].flatMap((i) => { const dx = Math.cos(i * 2.4) * 0.35 * s, dz = Math.sin(i * 2.4) * 0.35 * s, h = (3 + (i % 3) * 0.7) * s; return [[ROD, [x + dx, h / 2, z + dz], [0.05 * s, h, 0.05 * s], 0x7aa04a, [dz * 0.1, 0, -dx * 0.1]], [BALL, [x + dx * 1.3, h * 0.92, z + dz * 1.3], [0.45 * s, 0.5 * s, 0.45 * s], grad(i % 2 ? 0x5f9a3f : 0x79b04f)]]; }),
};
/** The kinds of tree there are to plant. */
export const TREE_KINDS = Object.keys(TREES);
/** A tree for the edges of a place. `kind` is one of TREE_KINDS; true and false stand for a round tree and a pine. */
export const treeParts = (x, z, size = 1, kind = false) => (TREES[kind === true ? 'round' : kind || 'pine'] ?? TREES.pine)(x, z, size);
