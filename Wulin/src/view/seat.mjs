// A stronghold seen from above: its buildings laid out round a courtyard and
// its people going about the jobs they were given.
//
// The scene reads the world and never changes it. `refresh` is called when
// the world has moved on; it rebuilds the buildings only if they changed and
// keeps the figures in step with who lives here and what they are doing.
import { InstancedMesh3D, Mesh3D, Object3D, Scene3D, createPerspectiveCamera3D, createStandardMaterial3D, quatFromEuler } from '@egret/engine/world3d';
import { ART_BY_ID, CLASSES } from '../data/arts.mjs';
import { PLACE_BY_ID } from '../data/places.mjs';
import { SECT_BY_ID } from '../data/sects.mjs';
import { PLOT, TREE_KINDS, createBuilding, treeParts } from './buildings.mjs';
import { STRIKE_OF, createFigure } from './figure.mjs';
import { floraGeometry, hasFlora, whenFlora } from './flora.mjs';
import { BALL, BOX, FOLIAGE, ROD, SPIKE, TAPER, TOON, grad, beam, build, glow, heightSurface, hexOf, mix, model, scatter, shade } from './shapes.mjs';
import { lightScene } from './stage.mjs';

/** How many people are shown at once, by picture quality. */
const CROWD = { high: 22, medium: 14, low: 9 };

/** Half the side of the flat ground the buildings stand on. */
const YARD = 42;

/**
 * Where buildings go. The hall is at the back of the courtyard and the gate
 * at the front; the rest fill the plots either side of the path between
 * them, nearest the middle first.
 */
export function plots() {
  const list = [];
  for (const z of [-17, -6, 5, 16]) for (const column of [1, 2, 3]) for (const side of [-1, 1]) list.push({ x: side * (column * (PLOT - 1) - 1), z, column });
  return list.sort((a, b) => a.column - b.column || Math.abs(a.z + 4) - Math.abs(b.z + 4));
}
const HALL_AT = { x: 0, z: -24 },
  GATE_AT = { x: 0, z: YARD - 6 };
/** People and buildings are drawn larger than life so they read from above. */
const FIGURE_SCALE = 1.5;

/** The kinds that want a place of honour or a quiet corner get their plots first. */
const ORDER = ['board', 'yard', 'range', 'library', 'council', 'mess', 'dorm', 'store', 'clinic', 'cell', 'forge', 'loom', 'still', 'tower', 'garden', 'lumber', 'quarry', 'ironPit', 'goldPit'];

/**
 * Where each kind of building would rather stand: the lower the number for a plot, the better.
 * Study and council sit quietly at the back near the hall; the drill yards flank the middle of
 * the avenue; kitchens, beds and stores keep to the east; the workshops, with their smoke and
 * noise, to the west by the gate; and whatever digs or grows goes to the outer edge.
 */
const side = (plot) => Math.sign(plot.x);
const WANTS = {
  board: (p) => Math.abs(p.z - 16) + p.column * 12 + (side(p) > 0 ? 0 : 1),
  yard: (p) => Math.abs(p.z - 5) + p.column * 9 + (side(p) < 0 ? 0 : 4),
  range: (p) => Math.abs(p.z - 5) + p.column * 9 + (side(p) > 0 ? 0 : 4),
  library: (p) => p.z + 17 + p.column * 4 + (side(p) < 0 ? 0 : 2),
  council: (p) => p.z + 17 + p.column * 4 + (side(p) > 0 ? 0 : 2),
  clinic: (p) => Math.abs(p.z + 6) + p.column * 3 + (side(p) < 0 ? 0 : 5),
  cell: (p) => p.z + 17 - p.column * 3,
  mess: (p) => Math.abs(p.z - 5) + p.column * 3 + (side(p) > 0 ? 0 : 9),
  dorm: (p) => Math.abs(p.z + 2) + p.column * 2 + (side(p) > 0 ? 0 : 7),
  store: (p) => Math.abs(p.z - 16) + p.column * 3 + (side(p) > 0 ? 0 : 7),
  forge: (p) => Math.abs(p.z - 16) + p.column * 2 + (side(p) < 0 ? 0 : 9),
  loom: (p) => Math.abs(p.z - 10) + p.column * 2 + (side(p) < 0 ? 0 : 9),
  still: (p) => Math.abs(p.z - 5) + p.column * 2 + (side(p) < 0 ? 0 : 9),
  tower: (p) => -Math.abs(p.z) - p.column * 6,
};
const edgeFirst = (p) => -p.column * 9 + (p.z + 17) * 0.3;

/** Hills round the yard, by how mountainous the place is. */
function ground(spec, random) {
  const steep = spec.resources.stone + spec.resources.iron >= 3 ? 1.5 : 1;
  const bumps = Array.from({ length: 9 }, () => [random() * 6.28, 20 + random() * 30, 0.5 + random()]);
  const height = (x, z) => {
    const far = Math.max(Math.abs(x), Math.abs(z)) - YARD;
    if (far <= 0) return 0;
    const angle = Math.atan2(z, x);
    let lift = 0;
    for (const [at, , tall] of bumps) lift += tall * Math.max(0, Math.cos(angle - at)) ** 6;
    // The front, where the gate is, stays low so the road can leave.
    const front = z > 0 ? Math.max(0.15, 1 - Math.exp(-((x / 26) ** 2))) : 1;
    return Math.min(60, far * far * 0.012 * (0.6 + lift) * steep * front);
  };
  // Pine ink grades into slate along the mountains, with warm clay confined to the court.
  const grass = spec.resources.herb >= 2 ? 0x344d42 : 0x495d49;
  const colour = (x, z, y) => {
    if (y > 26) return mix(0x65747a, 0xdce3e5, Math.min(1, (y - 26) / 16));
    if (y > 0.2) return mix(grass, 0x69756e, Math.min(1, y / 26));
    const inside = Math.abs(x) < YARD - 6 && Math.abs(z) < YARD - 6;
    // The avenue from the gate to the hall is paved in slabs with a darker kerb, and widens into a court before the hall.
    const half = z < HALL_AT.z + 15 && z > HALL_AT.z + 5 ? 9 : 2.8;
    if (Math.abs(x) < half && z > HALL_AT.z && z < 62) return Math.abs(x) > half - 0.35 ? 0x596868 : (Math.round(x / 1.4) + Math.round(z / 1.4)) % 2 ? 0x8b938b : 0x79827c;
    if (inside) {
      // Lanes of beaten earth run between the rows of buildings; the rest is rough grass, worn thin where people walk.
      const lane = [-11.5, -0.5, 10.5].some((row) => Math.abs(z - row) < 1.1);
      if (lane) return (Math.round(x * 1.3) + Math.round(z * 1.3)) % 3 ? 0x827560 : 0x786d59;
      const patch = Math.sin(x * 0.9) * Math.cos(z * 0.8) + Math.sin(x * 0.31 + z * 0.27);
      return patch > 0.5 ? mix(grass, 0x786d59, 0.35) : patch > -0.4 ? 0x7d705e : 0x716759;
    }
    return shade(grass, 0.92 + 0.16 * Math.abs(Math.sin(x * 0.7) * Math.cos(z * 0.6)));
  };
  const mesh = new Mesh3D(heightSurface(360, 360, 144, 144, height, colour), TOON);
  mesh.receiveShadow = true;
  return { mesh, height };
}

const LAMP = glow(0xffb45a, 1.5);

/** A low table with a tea set, and a stool on each side of it. */
const teaTable = (x, z) => [[BOX, [x, 0.42, z], [1.2, 0.08, 0.8], 0x6a4428], ...[-0.5, 0.5].flatMap((dx) => [-0.3, 0.3].map((dz) => [ROD, [x + dx, 0.2, z + dz], [0.04, 0.4, 0.04], 0x5a3a22])), [ROD, [x, 0.52, z], [0.1, 0.12, 0.1], 0x8a5a3a], [SPIKE, [x + 0.12, 0.54, z], [0.02, 0.1, 0.02], 0x8a5a3a, [0, 0, -1.2]], ...[-0.28, 0.3].map((dx) => [ROD, [x + dx, 0.49, z + 0.16], [0.045, 0.05, 0.045], 0xe9e1cf]), ...[-0.95, 0.95].map((dx) => [ROD, [x + dx, 0.22, z], [0.2, 0.44, 0.2], 0x7a5632])];
/** A long table with a bench down each side: where a sect eats when the weather is kind. */
const longTable = (x, z) => [[BOX, [x, 0.72, z], [3.2, 0.1, 0.9], 0x7a5632], ...[-1.4, 1.4].flatMap((dx) => [[BOX, [x + dx, 0.36, z], [0.1, 0.7, 0.7], 0x5e4228]]), ...[-0.75, 0.75].flatMap((dz) => [[BOX, [x, 0.42, z + dz], [3.0, 0.07, 0.3], 0x6a4a2e], ...[-1.3, 1.3].map((dx) => [BOX, [x + dx, 0.2, z + dz], [0.08, 0.4, 0.26], 0x5e4228])]), ...[-1, -0.3, 0.5, 1.1].map((dx, i) => [ROD, [x + dx, 0.8, z + (i % 2 ? 0.15 : -0.15)], [0.11, 0.06, 0.11], i % 2 ? 0xe9e1cf : 0x8fa8b0])];
/** A rack of spears and halberds standing upright. */
const armsRack = (x, z) => [[BOX, [x, 0.14, z], [2.2, 0.28, 0.5], 0x5e4228], [BOX, [x, 1.3, z], [2.2, 0.1, 0.16], 0x5e4228], ...[-1, 1].map((dx) => [BOX, [x + dx, 0.75, z], [0.1, 1.5, 0.14], 0x5e4228]), ...[-0.7, -0.35, 0, 0.35, 0.7].flatMap((dx, i) => [[ROD, [x + dx, 1.2, z], [0.025, 2.2, 0.025], 0x7a4f2a], i % 2 ? [SPIKE, [x + dx, 2.42, z], [0.05, 0.3, 0.02], 0xcfd3da] : [BOX, [x + dx, 2.3, z + 0.02], [0.03, 0.3, 0.2], 0xcfd3da], [BALL, [x + dx, 2.2, z], [0.06, 0.05, 0.06], 0xc0282a]])];
/** A great drum on a stand. */
const drum = (x, z) => [[ROD, [x, 1.2, z], [0.7, 0.7, 0.7], 0x8a2f24, [Math.PI / 2, 0, 0]], [ROD, [x, 1.2, z + 0.36], [0.66, 0.02, 0.66], 0xe9dcb6, [Math.PI / 2, 0, 0]], [ROD, [x, 1.2, z - 0.36], [0.66, 0.02, 0.66], 0xe9dcb6, [Math.PI / 2, 0, 0]], ...[-0.6, 0.6].flatMap((dx) => [[BOX, [x + dx, 0.6, z], [0.1, 1.2, 0.5], 0x5e4228], [BOX, [x + dx, 0.06, z], [0.16, 0.12, 0.9], 0x5e4228]])];

/** Tables and benches in the open, a tea table under a shade, a drum and racks of arms. */
function furnishings(x, z) {
  return [...longTable(x - 3, z + 1.5), ...longTable(x + 2.5, z + 1.5), ...teaTable(x - 4, z - 3), ...teaTable(x + 0.5, z - 3.4), ...armsRack(x + 6, z - 3.6), ...drum(x + 6.4, z + 1.6),
    // A shade of oiled paper on a post over the tea tables.
    [ROD, [x - 1.8, 1.5, z - 3.2], [0.05, 3, 0.05], 0x6a4428], [SPIKE, [x - 1.8, 3.0, z - 3.2], [2.6, 0.6, 2.6], 0xb9502a], [ROD, [x - 1.8, 2.74, z - 3.2], [2.6, 0.03, 2.6], 0x8a3a22]];
}

/**
 * The thing a sect is known by, built in the back corner of its seat. Parts that give their own
 * light (flames, lamps) come as `{ lit: part }`.
 */
function landmark(sectId, x, z, random) {
  const stone = 0xa9a69c;
  const stupa = (px, pz, tall) => [[BOX, [px, 0.25, pz], [1.1, 0.5, 1.1], stone], ...Array.from({ length: Math.round(tall) }, (_, i) => [[BOX, [px, 0.75 + i * 0.5, pz], [0.8 - i * 0.07, 0.4, 0.8 - i * 0.07], shade(stone, 1.05)], [BOX, [px, 0.98 + i * 0.5, pz], [1.0 - i * 0.07, 0.08, 1.0 - i * 0.07], shade(stone, 0.8)]]).flat(), [SPIKE, [px, 0.9 + tall * 0.5, pz], [0.2, 0.6, 0.2], shade(stone, 0.8)]];
  const stele = (px, pz, tall, turn = 0) => [[BOX, [px, 0.2, pz], [1.0, 0.4, 0.6], shade(stone, 0.8), [0, turn, 0]], [BOX, [px, 0.4 + tall / 2, pz], [0.7, tall, 0.2], stone, [0, turn, 0]], [BALL, [px, 0.4 + tall, pz], [0.36, 0.18, 0.12], shade(stone, 0.9), [0, turn, 0]]];
  const flame = (px, py, pz, size = 0.4) => [{ lit: [SPIKE, [px, py + size * 0.7, pz], [size * 0.6, size * 1.6, size * 0.6], 0xffffff] }, { lit: [BALL, [px, py, pz], [size * 0.7, size * 0.5, size * 0.7], 0xffffff] }];
  const brazier = (px, pz, size = 1) => [[ROD, [px, 0.5 * size, pz], [0.12 * size, 1.0 * size, 0.12 * size], 0x3a3836], [TAPER, [px, 1.1 * size, pz], [0.5 * size, 0.3 * size, 0.5 * size], 0x4a4744, [Math.PI, 0, 0]], ...flame(px, 1.35 * size, pz, 0.4 * size)];
  const set = {
    // A forest of stone stupas over the ashes of abbots.
    shaolin: () => [[-4, -1, 3], [-1.6, 1.2, 5], [0.6, -1.4, 4], [2.8, 0.8, 6], [5, -0.8, 3], [-2.6, -2.6, 2], [3.6, -2.8, 2]].flatMap(([dx, dz, tall]) => stupa(x + dx, z + dz, tall)),
    // A round terrace laid out as the two fishes of yin and yang, with a bronze censer on it.
    wudang: () => [[ROD, [x, 0.2, z], [4.2, 0.4, 4.2], stone], [ROD, [x, 0.41, z], [3.9, 0.02, 3.9], 0xf1eee6], [ROD, [x - 0.01, 0.42, z + 1.95], [1.95, 0.02, 1.95], 0x2a2a2e], [ROD, [x, 0.43, z - 1.95], [1.95, 0.02, 1.95], 0xf1eee6], [ROD, [x, 0.44, z + 1.95], [0.5, 0.02, 0.5], 0xf1eee6], [ROD, [x, 0.44, z - 1.95], [0.5, 0.02, 0.5], 0x2a2a2e], ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => [BOX, [x + Math.cos(i * 0.785) * 4.6, 0.6, z + Math.sin(i * 0.785) * 4.6], [0.3, 1.2, 0.3], stone])],
    // A bell tower: a great bronze bell under a roof on four posts.
    emei: () => [[BOX, [x, 0.3, z], [5, 0.6, 5], stone], ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => [ROD, [x + sx * 1.9, 2.4, z + sz * 1.9], [0.18, 3.6, 0.18], 0x6a3a26])), [BOX, [x, 4.2, z], [4.6, 0.3, 4.6], 0x5e4028], [SPIKE, [x, 5.2, z], [3.8, 1.8, 3.8], 0xb99a3a, [0, Math.PI / 4, 0]], [BALL, [x, 6.2, z], 0.2, 0xc59e5b], [TAPER, [x, 2.6, z], [0.95, 1.8, 0.95], 0x8a7440], [ROD, [x, 1.72, z], [1.0, 0.1, 1.0], 0x6a5a34], [BALL, [x, 3.5, z], [0.6, 0.3, 0.6], 0x8a7440], beam([x - 2.4, 2.6, z + 1.0], [x - 0.9, 2.6, z + 0.2], 0.1, 0x6a4428)],
    // Swords of stone set point down in a rock, and a tablet cut with the sect's rule.
    huashan: () => [[BALL, [x, 0.7, z], [3.4, 1.4, 2.6], 0x65747a], [BALL, [x + 2.4, 0.4, z + 1.2], [1.6, 0.8, 1.3], 0x7d7a70], ...[[-1.6, 0.2, 0.2], [0, -0.3, -0.12], [1.4, 0.3, 0.16], [0.4, 1.0, -0.3]].flatMap(([dx, dz, lean]) => [[BOX, [x + dx, 3.0, z + dz], [0.16, 3.4, 0.05], 0xcfd3da, [0, 0, lean]], [BOX, [x + dx - Math.sin(lean) * 1.8, 4.75, z + dz], [0.6, 0.1, 0.1], 0x8a7440, [0, 0, lean]], [ROD, [x + dx - Math.sin(lean) * 2.1, 5.1, z + dz], [0.05, 0.6, 0.05], 0x3a2418, [0, 0, lean]]]), ...stele(x - 4.6, z + 1.6, 2.4, 0.3)],
    // A camp: patched tents, a fire with a pot over it, bowls and sticks.
    gaibang: () => [...[[-3.6, -1.4, 0x8a7a5a], [3.4, -1.8, 0x7a6a52], [0.4, -3.4, 0x9a8a62]].flatMap(([dx, dz, cloth]) => [[SPIKE, [x + dx, 1.1, z + dz], [1.9, 2.2, 1.9], cloth, [0, Math.PI / 4, 0]], [BOX, [x + dx + 0.5, 0.9, z + dz + 0.9], [0.5, 0.5, 0.04], shade(cloth, 0.7), [0.6, 0.6, 0]], [ROD, [x + dx, 2.3, z + dz], [0.04, 0.5, 0.04], 0x5e4228]]), [ROD, [x, 0.1, z + 1], [0.9, 0.2, 0.9], 0x5a5653], ...[0, 2.1, 4.2].map((a) => beam([x + Math.cos(a) * 0.9, 0, z + 1 + Math.sin(a) * 0.9], [x, 1.7, z + 1], 0.04, 0x5e4228)), [BALL, [x, 0.95, z + 1], [0.4, 0.34, 0.4], 0x2e2e33], ...flame(x, 0.3, z + 1, 0.45), ...[0, 1, 2, 3].map((i) => [ROD, [x + 1.6 + (i % 2) * 0.4, 0.08, z + 2 + i * 0.3], [0.16, 0.1, 0.16], 0x8a6a48]), ...[0, 1, 2].map((i) => [ROD, [x - 2 + i * 0.25, 0.8, z + 2.6], [0.03, 1.6, 0.03], 0x7a9a4a, [0.2, 0, 0.3 - i * 0.2]])],
    // The sacred fire on a stepped altar of stone, with lesser fires at its corners.
    mingjiao: () => [...[0, 1, 2].map((i) => [BOX, [x, 0.3 + i * 0.6, z], [6 - i * 1.6, 0.6, 6 - i * 1.6], shade(0xb9b3a4, 1 - i * 0.05)]), [TAPER, [x, 2.3, z], [1.1, 0.8, 1.1], 0x8a7440, [Math.PI, 0, 0]], ...flame(x, 2.8, z, 1.5), ...[-1, 1].flatMap((sx) => [-1, 1].flatMap((sz) => brazier(x + sx * 3.6, z + sz * 3.6, 1.2)))],
    // A cairn of carved stones, a tall pole, and lines of prayer flags running out from it.
    kunlun: () => [[ROD, [x, 0.5, z], [2.2, 1.0, 2.2], 0xeeeae0], [ROD, [x, 1.3, z], [1.6, 0.6, 1.6], 0xeeeae0], [BALL, [x, 2.0, z], [1.1, 0.9, 1.1], 0xeeeae0], [ROD, [x, 2.9, z], [0.5, 0.5, 0.5], 0xc59e5b], [SPIKE, [x, 4.0, z], [0.36, 1.8, 0.36], 0xc59e5b], [ROD, [x, 1.02, z], [2.24, 0.14, 2.24], 0x7a2a26], ...[0, 1, 2, 3].flatMap((k) => { const a = k * 1.571 + 0.5, ex = x + Math.cos(a) * 7, ez = z + Math.sin(a) * 5; return [beam([x, 4.6, z], [ex, 1.2, ez], 0.012, 0x3a3836), [ROD, [ex, 0.6, ez], [0.05, 1.2, 0.05], 0x5e4228], ...[0.15, 0.27, 0.39, 0.51, 0.63, 0.75, 0.87].map((t, i) => [BOX, [x + (ex - x) * t, 4.6 + (1.2 - 4.6) * t - 0.2, z + (ez - z) * t], [0.3, 0.36, 0.02], [0x3f6fbf, 0xf1eee6, 0xc0282a, 0x4f9a4a, 0xe8c23a][i % 5], [0, -a, 0]])]; })],
    // A quay with bollards, cargo stacked on it, and a boat hauled out for mending.
    caobang: () => [[BOX, [x, 0.25, z], [9, 0.5, 4], 0x8a7a62], ...[-4, -2, 0, 2, 4].map((dx) => [ROD, [x + dx, 0.75, z + 1.8], [0.14, 0.6, 0.14], 0x4a3a2e]), ...boatParts(x - 1, 0.9, z - 0.4, 1.5, 0.2), ...[[2.6, -1], [3.3, -0.4], [3.0, 0.9], [3.8, 0.6]].flatMap(([dx, dz], i) => [[BOX, [x + dx, 0.8 + (i === 1 ? 0.6 : 0), z + dz], [0.6, 0.6, 0.6], i % 2 ? 0x8a6a48 : 0x7a5632, [0, i * 0.4, 0]]]), ...[0, 1, 2].map((i) => [ROD, [x + 1.7, 0.75 + i * 0.0, z + 1.1 - i * 0.6], [0.28, 0.5, 0.28], 0x7a5632]), beam([x - 4, 1.0, z + 1.8], [x + 4, 1.0, z + 1.8], 0.03, 0xb39a62)],
    // A great cauldron for decoctions, racks of herbs drying, and jars in rows.
    yaowang: () => [[ROD, [x, 0.3, z], [1.8, 0.6, 1.8], stone], [BALL, [x, 1.4, z], [1.3, 1.1, 1.3], 0x6a5a34], [ROD, [x, 2.2, z], [1.34, 0.12, 1.34], 0x8a7440], ...[0, 2.1, 4.2].map((a) => [ROD, [x + Math.cos(a) * 0.9, 0.9, z + Math.sin(a) * 0.9], [0.12, 0.6, 0.12], 0x6a5a34]), ...flame(x, 0.6, z, 0.4), ...[-5, 4].flatMap((dx) => [[ROD, [x + dx, 0.9, z - 1.2], [0.05, 1.8, 0.05], 0x5e4228], [ROD, [x + dx + 1.6, 0.9, z - 1.2], [0.05, 1.8, 0.05], 0x5e4228], ...[0.7, 1.2, 1.7].flatMap((py, i) => [[BOX, [x + dx + 0.8, py, z - 1.2], [1.7, 0.05, 0.8], 0xb39a62], [BALL, [x + dx + 0.8, py + 0.06, z - 1.2], [0.7, 0.06, 0.3], [0x6f9a4a, 0xb9a23a, 0x8a5a3a][i]]])]), ...[0, 1, 2, 3, 4, 5].map((i) => [ROD, [x - 2.4 + i * 0.9, 0.35, z + 2.6], [0.26, 0.7, 0.26], i % 2 ? 0x7a5a3a : 0x5a6a5a])],
    // Three pagodas: one tall in front, two shorter behind.
    chongsheng: () => [[0, 0.6, 1.5], [-3.6, -2.2, 1], [3.6, -2.2, 1]].flatMap(([dx, dz, big]) => [[BOX, [x + dx, 0.3, z + dz], [2.4 * big, 0.6, 2.4 * big], stone], ...Array.from({ length: big > 1 ? 9 : 6 }, (_, i) => [[BOX, [x + dx, 1.0 + i * 0.9 * big * 0.75, z + dz], [(1.5 - i * 0.07) * big, 0.66 * big * 0.75, (1.5 - i * 0.07) * big], 0xf1ece0], [BOX, [x + dx, 1.36 + i * 0.9 * big * 0.75, z + dz], [(1.8 - i * 0.07) * big, 0.1, (1.8 - i * 0.07) * big], 0x9a9488]]).flat(), [SPIKE, [x + dx, 1.3 + (big > 1 ? 9 : 6) * 0.9 * big * 0.75, z + dz], [0.3 * big, 1.4 * big, 0.3 * big], 0xc59e5b]]),
    // A forest of tablets, and cranes of bronze among them.
    quanzhen: () => [...[[-4, -1, 2.6, 0.2], [-2, 1, 2.0, -0.1], [0, -1.6, 3.0, 0], [2, 0.8, 2.2, 0.15], [4, -1.2, 2.6, -0.2], [-0.6, 2.6, 1.6, 0.3]].flatMap(([dx, dz, tall, turn]) => stele(x + dx, z + dz, tall, turn)), ...[[-3, 2.6], [3.4, 2.4]].flatMap(([dx, dz]) => [[ROD, [x + dx, 0.5, z + dz], [0.03, 1.0, 0.03], 0x6a5a34], [BALL, [x + dx, 1.2, z + dz], [0.2, 0.26, 0.4], 0x8a7440], [ROD, [x + dx, 1.7, z + dz + 0.3], [0.03, 0.8, 0.03], 0x8a7440, [0.4, 0, 0]], [SPIKE, [x + dx, 2.06, z + dz + 0.62], [0.03, 0.3, 0.03], 0x8a7440, [1.6, 0, 0]]])],
    // A proving ground for hidden weapons: scaffolds of bamboo, swinging targets and a wall bristling with darts.
    tangmen: () => [[BOX, [x - 4, 1.6, z - 2], [0.4, 3.2, 5], 0x4a3a34], ...Array.from({ length: 14 }, () => [SPIKE, [x - 3.7, 0.6 + random() * 2.4, z - 4 + random() * 4], [0.04, 0.4, 0.04], 0xcfd3da, [0, 0, -Math.PI / 2]]), ...[-1, 1].flatMap((sx) => [beam([x + 1 + sx * 2.6, 0, z - 2.4], [x + 1 + sx * 2.6, 4.4, z - 2.4], 0.07, 0x7aa04a), beam([x + 1 + sx * 2.6, 0, z + 1.6], [x + 1 + sx * 2.6, 4.4, z + 1.6], 0.07, 0x7aa04a)]), beam([x - 1.6, 4.2, z - 2.4], [x + 3.6, 4.2, z - 2.4], 0.06, 0x7aa04a), beam([x - 1.6, 4.2, z + 1.6], [x + 3.6, 4.2, z + 1.6], 0.06, 0x7aa04a), beam([x + 1, 4.2, z - 2.4], [x + 1, 4.2, z + 1.6], 0.06, 0x7aa04a), ...[-1.2, 1, 3].flatMap((dx, i) => [beam([x + dx, 4.2, z - 0.4], [x + dx, 2.4 - i * 0.2, z - 0.4], 0.015, 0x3a3836), [ROD, [x + dx, 2.1 - i * 0.2, z - 0.4], [0.4, 0.06, 0.4], 0xd9c79a, [Math.PI / 2, 0, 0]], [ROD, [x + dx, 2.1 - i * 0.2, z - 0.36], [0.16, 0.06, 0.16], 0x5a2d6e, [Math.PI / 2, 0, 0]]])],
  }[sectId];
  // A place nobody holds has only a tablet to say whose it was.
  return set ? set() : stele(x, z, 2.2);
}

/** A boat as parts for `build`: a hull that rises at bow and stern, a deck, a cabin with a mat roof, and an oar. */
export function boatParts(x, y, z, size = 1, turn = 0) {
  const c = Math.cos(turn),
    s = Math.sin(turn),
    at = (along, up, side = 0) => [x + s * along * size + c * side * size, y + up * size, z + c * along * size - s * side * size];
  const hull = 0x6a4a30;
  return [
    [BOX, at(0, 0.14), [0.9 * size, 0.28 * size, 2.6 * size], hull, [0, turn, 0]],
    [BOX, at(1.5, 0.26), [0.7 * size, 0.26 * size, 0.7 * size], hull, [-0.4, turn, 0]],
    [BOX, at(-1.5, 0.3), [0.74 * size, 0.3 * size, 0.7 * size], hull, [0.5, turn, 0]],
    [BOX, at(0, 0.3), [0.8 * size, 0.04 * size, 2.5 * size], 0xa9875a, [0, turn, 0]],
    [ROD, at(-0.2, 0.62), [0.4 * size, 1.2 * size, 0.36 * size], 0xb39a62, [Math.PI / 2, turn, 0]],
    [BOX, at(-0.2, 0.38), [0.78 * size, 0.14 * size, 1.2 * size], shade(hull, 0.8), [0, turn, 0]],
    beam(at(-1.2, 0.5, 0.3), at(-2.3, 0.05, 0.6), 0.025 * size, 0x8a6a48),
  ];
}
const WATER = createStandardMaterial3D({ color: 0x3b6d73, roughness: 0.25, metallic: 0, opacity: 0.86, alphaMode: 'blend' });
const SMOKE = createStandardMaterial3D({ color: 0xc4d2ca, roughness: 1, metallic: 0, opacity: 0.26, alphaMode: 'blend' });
const CLOUD = createStandardMaterial3D({ color: 0xffffff, roughness: 1, metallic: 0, opacity: 0.8, alphaMode: 'blend' });
/** Where the pond lies, in the front corner west of the gate. */
const POND = { x: -22, z: 29, rx: 7.5, rz: 3.6 };

/**
 * Everything round the buildings that is not a building: the wall and its corner turrets, the
 * terrace the hall stands on, lanterns down the avenue, a censer, a pond with a bridge, a grove
 * with a stone table, beds of flowers, and the trees, shrubs and rocks inside and outside the wall.
 * @returns `{ node, lamps, banners, censer }`: the model, and the things in it that move or smoke
 */
function surroundings(height, random, sectColor, sectId = null) {
  const node = new Object3D();
  const parts = [],
    greens = [],
    lit = [];
  const edge = YARD - 6;
  const wall = (x, z, w, d) => parts.push([BOX, [x, 1.3, z], [w, 2.6, d], 0xd1c6ad], [BOX, [x, 0.3, z], [w + 0.12, 0.6, d + 0.12], 0x9f9e92], [BOX, [x, 2.75, z], [w + 0.6, 0.3, d + 0.6], 0x364953], [BOX, [x, 2.96, z], [w + 0.2, 0.16, d + 0.2], 0x293941]);
  wall(0, -edge, edge * 2, 0.7);
  wall(-edge, 0, 0.7, edge * 2);
  wall(edge, 0, 0.7, edge * 2);
  for (const sx of [-1, 1]) wall(sx * (edge / 2 + 3.6), edge, edge - 7.2, 0.7);
  // The avenue and the court before the hall are laid in stone, with a kerb; lanes of beaten earth run between the rows.
  parts.push([BOX, [0, 0.03, 9.5], [5.6, 0.06, 53], 0x7a8582], [BOX, [0, 0.036, 9.5], [4.9, 0.06, 53], 0x929a90], [BOX, [0, 0.03, HALL_AT.z + 10.5], [19, 0.06, 8], 0x7a8582], [BOX, [0, 0.036, HALL_AT.z + 10.5], [18.3, 0.06, 7.3], 0x929a90]);
  for (let z = -16; z < 36; z += 2.6) parts.push([BOX, [0, 0.07, z], [4.9, 0.012, 0.06], 0x79827c]);
  for (const row of [-11.5, -0.5, 10.5]) for (const sx of [-1, 1]) parts.push([BOX, [sx * 18.4, 0.02, row], [31, 0.04, 2.2], 0x857861]);
  // A turret at each corner of the wall.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push([BOX, [sx * edge, 1.9, sz * edge], [2.4, 3.8, 2.4], 0xbdb8a6], [BOX, [sx * edge, 3.9, sz * edge], [3.0, 0.24, 3.0], 0x364953], [SPIKE, [sx * edge, 4.7, sz * edge], [2.0, 1.5, 2.0], 0x364953, [0, Math.PI / 4, 0]], [BALL, [sx * edge, 5.5, sz * edge], 0.16, 0xc59e5b]);
  // The terrace the hall stands on, with broad steps down to the court.
  parts.push([BOX, [0, 0.3, HALL_AT.z - 1], [22, 0.6, 15], 0xa9ad9f], [BOX, [0, 0.58, HALL_AT.z - 1], [22.4, 0.08, 15.4], 0xb9bcb1]);
  for (let i = 0; i < 3; i++) parts.push([BOX, [0, 0.5 - i * 0.2, HALL_AT.z + 6.8 + i * 0.45], [9, 0.2, 0.5], i % 2 ? 0xa2a89d : 0xa9ad9f]);
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) parts.push([BOX, [sx * (5 + i * 1.2), 0.9, HALL_AT.z + 6.4], [0.14, 0.7, 0.14], 0xa9ad9f], [BALL, [sx * (5 + i * 1.2), 1.3, HALL_AT.z + 6.4], 0.1, 0xb9bcb1]);
  for (const sx of [-1, 1]) parts.push(beam([sx * 5, 1.1, HALL_AT.z + 6.4], [sx * 11, 1.1, HALL_AT.z + 6.4], 0.05, 0xa2a89d));
  // A bronze censer in the court before the hall.
  const censer = [0, 0, HALL_AT.z + 11.5];
  parts.push([BOX, [0, 0.2, censer[2]], [1.6, 0.4, 1.6], 0x8f8a7c], [BALL, [0, 1.0, censer[2]], [0.7, 0.55, 0.7], 0x6a5a34], [ROD, [0, 1.36, censer[2]], [0.74, 0.08, 0.74], 0x8a7440], ...[0, 2.1, 4.2].map((a) => [ROD, [Math.sin(a) * 0.5, 0.52, censer[2] + Math.cos(a) * 0.5], [0.07, 0.36, 0.07], 0x6a5a34]), ...[-1, 1].map((sx) => [BOX, [sx * 0.76, 1.3, censer[2]], [0.08, 0.36, 0.3], 0x8a7440]));
  // Stone lanterns down both sides of the avenue.
  const lamps = [];
  for (const z of [-4, 4, 12, 20, 28])
    for (const sx of [-1, 1]) {
      const x = sx * 3.7;
      parts.push([BOX, [x, 0.12, z], [0.6, 0.24, 0.6], 0x8f8a7c], [ROD, [x, 0.7, z], [0.13, 0.95, 0.13], 0xa9a69c], [BOX, [x, 1.22, z], [0.5, 0.1, 0.5], 0xa9a69c], [SPIKE, [x, 1.92, z], [0.5, 0.36, 0.5], 0x5c5a60, [0, Math.PI / 4, 0]], ...[-1, 1].flatMap((a) => [-1, 1].map((b) => [BOX, [x + a * 0.17, 1.5, z + b * 0.17], [0.05, 0.46, 0.05], 0x8f8a7c])));
      lit.push([BOX, [x, 1.5, z], [0.3, 0.4, 0.3], 0xffffff]);
      lamps.push([x, 1.5, z]);
    }
  // Beds of flowers between the lanterns.
  for (const z of [0, 8, 16, 24])
    for (const sx of [-1, 1]) {
      parts.push([BOX, [sx * 4.3, 0.1, z], [1.1, 0.2, 3.2], 0x8f8a7c], [BOX, [sx * 4.3, 0.2, z], [0.86, 0.1, 2.96], 0x5e4a30]);
      for (let i = 0; i < 7; i++) parts.push([BALL, [sx * 4.3 + (random() - 0.5) * 0.6, 0.38, z + (i - 3) * 0.42], [0.2, 0.18, 0.2], [0xbb625f, 0xd4a358, 0xe6dbc7, 0xa2778c, 0x6c8971, 0x849e7a][Math.floor(random() * 6)]]);
    }
  // What the sect is known by stands in the back corner east of the hall; tables and benches are set out in the west one.
  for (const part of landmark(sectId, 24, HALL_AT.z - 5, random)) (part.lit ? lit : parts).push(part.lit ?? part);
  for (const part of furnishings(-24, HALL_AT.z - 5)) parts.push(part);
  // The pond: a rim of rocks, lily pads, reeds, and a bridge arched over its narrow end.
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * 6.283,
      big = 0.5 + random() * 0.6;
    parts.push([BALL, [POND.x + Math.cos(a) * (POND.rx + 0.3), 0.14, POND.z + Math.sin(a) * (POND.rz + 0.3)], [big, 0.3 + random() * 0.4, big * 0.8], shade(0x9a978d, 0.85 + random() * 0.3)]);
  }
  for (let i = 0; i < 9; i++) {
    const a = random() * 6.283,
      r = Math.sqrt(random()) * 0.8;
    const x = POND.x + Math.cos(a) * POND.rx * r,
      z = POND.z + Math.sin(a) * POND.rz * r;
    parts.push([ROD, [x, 0.075, z], [0.34, 0.02, 0.34], i % 3 ? 0x506f5b : 0x698270]);
    if (i % 3 === 0) parts.push([BALL, [x + 0.1, 0.16, z], [0.13, 0.1, 0.13], 0xf2a8c0], [SPIKE, [x + 0.1, 0.22, z], [0.07, 0.12, 0.07], 0xf7d0d8]);
  }
  for (let i = 0; i < 14; i++) {
    const a = 2.4 + random() * 1.6;
    parts.push([ROD, [POND.x + Math.cos(a) * POND.rx * 0.92, 0.6, POND.z + Math.sin(a) * POND.rz * 0.92], [0.025, 1.2 + random() * 0.5, 0.025], 0x7a9a4a, [(random() - 0.5) * 0.2, 0, (random() - 0.5) * 0.2]]);
  }
  for (let i = -4; i <= 4; i++) {
    const lift = 0.95 - (i * i) / 16 * 0.75;
    parts.push([BOX, [POND.x + 3.4, lift, POND.z + i * 0.9], [1.5, 0.12, 0.95], 0xa68255, [(i / 4) * 0.36, 0, 0]]);
    if (i % 2 === 0) for (const sx of [-1, 1]) parts.push([ROD, [POND.x + 3.4 + sx * 0.72, lift + 0.35, POND.z + i * 0.9], [0.05, 0.7, 0.05], 0x9c2f24]);
  }
  for (const sx of [-1, 1]) for (let i = -4; i < 4; i++) parts.push(beam([POND.x + 3.4 + sx * 0.72, 1.55 - (i * i) / 16 * 0.75, POND.z + i * 0.9], [POND.x + 3.4 + sx * 0.72, 1.55 - ((i + 1) * (i + 1)) / 16 * 0.75, POND.z + (i + 1) * 0.9], 0.035, 0x9c2f24));
  const pond = new Mesh3D(build([[ROD, [POND.x, 0.06, POND.z], [POND.rx, 0.02, POND.rz], 0xffffff]]), WATER);
  pond.receiveShadow = true;
  node.addChild(pond);
  // East of the gate: a bamboo grove with a stone table and stools, and a rockery.
  for (let i = 0; i < 9; i++) for (const part of treeParts(15 + random() * 15, 26 + random() * 7, 0.9 + random() * 0.5, 'bamboo')) greens.push(part);
  parts.push([ROD, [20, 0.4, 25.5], [0.9, 0.12, 0.9], 0xa9a69c], [ROD, [20, 0.2, 25.5], [0.3, 0.4, 0.3], 0x8f8a7c], ...[0, 1.57, 3.14, 4.71].map((a) => [ROD, [20 + Math.cos(a) * 1.4, 0.2, 25.5 + Math.sin(a) * 1.4], [0.26, 0.4, 0.26], 0x9a978d]));
  for (let i = 0; i < 5; i++) parts.push([BALL, [10 + i * 0.9 + random(), 0.5 + random() * 0.8, 30 + random() * 2], [0.7 + random() * 0.6, 0.9 + random() * 1.3, 0.6 + random() * 0.5], shade(0x65747a, 0.8 + random() * 0.35)]);
  // Things grown from model files are set out here and drawn together, each kind in one go.
  const planted = new Map();
  const set = (name, variant, x, z, tall, sink = 0) => {
    if (!hasFlora(name)) return false;
    const key = name + '|' + variant;
    if (!planted.has(key)) planted.set(key, []);
    planted.get(key).push([x, height(x, z) - sink, z, tall, random() * 6.283]);
    return true;
  };
  const pick = (stem, count) => `${stem}_${1 + Math.floor(random() * count)}`;
  // Trees inside the wall, along it and in the corners; blossom and maple nearest the hall.
  const plant = (x, z, size, kind) => {
    const modelled = { pine: () => set(pick('pine_tree', 3), 'pine', x, z, size * 5.4, 0.1), round: () => set(pick('common_tree', 3), 'plain', x, z, size * 4.6, 0.1), maple: () => set(pick('common_tree', 3), random() < 0.3 ? 'ginkgo' : 'maple', x, z, size * 4.4, 0.1), blossom: () => set('common_tree_2', 'blossom', x, z, size * 3.3, 0.1) }[kind];
    if (modelled?.()) return;
    const y = height(x, z);
    for (const part of treeParts(x, z, size, kind)) greens.push([part[0], [part[1][0], part[1][1] + y, part[1][2]], part[2], part[3], part[4]]);
  };
  /** Whether a spot in the yard is open ground: not paved, not built on, not water. */
  const open = (x, z) => Math.abs(x) > 3.6 && !(Math.abs(x) < 12 && z < HALL_AT.z + 15) && ![-11.5, -0.5, 10.5].some((row) => Math.abs(z - row) < 1.4) && !plots().some((plot) => Math.abs(x - plot.x) < 5.4 && Math.abs(z - plot.z) < 5.4) && ((x - POND.x) / (POND.rx + 1)) ** 2 + ((z - POND.z) / (POND.rz + 1)) ** 2 > 1;
  // Grass in tufts, wild flowers and leafy plants wherever the yard is left alone, and thicker outside the wall.
  for (let i = 0; i < 520; i++) {
    const x = (random() - 0.5) * 2 * (edge - 1),
      z = (random() - 0.5) * 2 * (edge - 1);
    if (!open(x, z)) continue;
    const roll = random();
    if (roll < 0.72) set(pick('grass', 4), 'plain', x, z, 0.35 + random() * 0.4);
    else if (roll < 0.86) set(pick('flower', 3), ['plain', 'white', 'pink'][Math.floor(random() * 3)], x, z, 0.4 + random() * 0.25);
    else set(pick('plant', 3), 'plain', x, z, 0.45 + random() * 0.4);
  }
  for (let i = 0; i < 380; i++) {
    const angle = random() * 6.283,
      radius = YARD + 1 + random() * 46,
      x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius;
    if ((Math.abs(x) < 4 && z > 0) || height(x, z) > 14) continue;
    const roll = random();
    if (roll < 0.7) set(pick('grass', 4), 'plain', x, z, 0.5 + random() * 0.6);
    else if (roll < 0.9) set(pick('flower', 3), ['plain', 'white', 'pink'][Math.floor(random() * 3)], x, z, 0.5 + random() * 0.3);
    else set(random() < 0.5 ? 'tree_stump_1' : pick('plant', 3), 'plain', x, z, 0.5 + random() * 0.4);
  }
  for (const sx of [-1, 1]) {
    plant(sx * 13.5, HALL_AT.z + 4.5, 1.25, 'blossom');
    plant(sx * 15.5, HALL_AT.z - 6, 1.5, 'maple');
    for (const z of [-30, -12, 0, 12]) plant(sx * (edge - 2.4), z + random() * 3, 1.2 + random() * 0.5, ['pine', 'round', 'willow', 'pine'][Math.floor(random() * 4)]);
  }
  plant(POND.x - 6.5, POND.z + 2.4, 1.5, 'willow');
  plant(POND.x - 1, POND.z - 4.4, 1.1, 'blossom');
  // Shrubs against the walls and tufts of grass in the yard's quiet corners.
  for (let i = 0; i < 60; i++) {
    const along = (random() - 0.5) * 2 * (edge - 2),
      sx = random() < 0.5 ? -1 : 1;
    const [x, z] = random() < 0.6 ? [sx * (edge - 1.2), along] : [along, -(edge - 1.2)];
    if (set(pick('bush', 5), 'plain', x, z, 0.8 + random() * 0.7, 0.05)) continue;
    greens.push([BALL, [x, 0.35, z], [0.6 + random() * 0.5, 0.45 + random() * 0.3, 0.6 + random() * 0.5], grad(shade(0x416450, 0.8 + random() * 0.4), 0.6, 1.15)]);
  }
  // Outside: forest on the slopes, thicker lower down, with rocks and scrub among it.
  for (let i = 0; i < 230; i++) {
    const angle = random() * 6.283,
      radius = YARD + 3 + random() * 90,
      x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius,
      y = height(x, z);
    if (y > 32 || (Math.abs(x) < 7 && z > 0)) continue;
    const kind = y > 16 ? 'pine' : TREE_KINDS[Math.floor(random() * random() * TREE_KINDS.length)];
    plant(x, z, 1.4 + random() * 1.8, kind === 'bamboo' && y > 4 ? 'pine' : kind);
  }
  for (let i = 0; i < 170; i++) {
    const angle = random() * 6.283,
      radius = YARD + 1 + random() * 70,
      x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius,
      y = height(x, z);
    if (Math.abs(x) < 5 && z > 0) continue;
    if (i % 3 === 0 ? set(pick('stone', 5), random() < 0.4 ? 'moss' : 'plain', x, z, 0.7 + random() * 1.9, 0.15) : set(i % 11 === 0 ? 'dead_tree_1' : pick('bush', 5), 'plain', x, z, i % 11 === 0 ? 3 + random() * 2 : 0.9 + random() * 1.1, 0.05)) continue;
    if (i % 3 === 0) parts.push([BALL, [x, y + 0.3, z], [0.8 + random() * 1.6, 0.6 + random() * 1.2, 0.8 + random() * 1.4], shade(0x65747a, 0.8 + random() * 0.4)]);
    else greens.push([BALL, [x, y + 0.4, z], [0.9 + random(), 0.6 + random() * 0.5, 0.9 + random()], grad(shade(0x365b4c, 0.75 + random() * 0.5), 0.6, 1.15)]);
  }
  // Far ranges ring the valley, each paler than the one before it as the haze takes them.
  for (const [radius, tall, tone] of [[210, 60, 0x496362], [265, 88, 0x6c8389], [320, 120, 0x96a8b1]])
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * 6.283 + random() * 0.2,
        wide = 34 + random() * 30,
        high = tall * (0.55 + random() * 0.6);
      parts.push([SPIKE, [Math.cos(a) * radius, high / 2 - 8, Math.sin(a) * radius], [wide, high, wide * (0.7 + random() * 0.5)], grad(tone, 0.82, 1.18), [0, random() * 3, 0]]);
    }
  // The road out of the gate, with milestones.
  for (const z of [44, 54, 64]) for (const sx of [-1, 1]) parts.push([BOX, [sx * 3.4, height(sx * 3.4, z) + 0.4, z], [0.4, 0.8, 0.3], 0x9a978d]);
  // Poles for the banners; the cloth itself is hung separately so that it can move.
  const banners = [];
  const flags = [...[-6, 8, 22].flatMap((z) => [-1, 1].map((sx) => [sx * 5.4, z])), [-6.5, edge + 0.5], [6.5, edge + 0.5]];
  const cloth = build([[BOX, [0.5, 0, 0], [1.0, 2.0, 0.04], sectColor], [BOX, [0.5, 0.86, 0.001], [1.0, 0.16, 0.05], shade(sectColor, 0.6)], [BOX, [0.5, -0.9, 0.001], [1.0, 0.12, 0.05], 0xc59e5b]]);
  for (const [x, z] of flags) {
    parts.push([ROD, [x, 2.6, z], [0.06, 5.2, 0.06], 0x5a4632], [BALL, [x, 5.25, z], 0.11, 0xc59e5b], [BOX, [x, 0.15, z], [0.5, 0.3, 0.5], 0x8f8a7c]);
    const flag = new Mesh3D(cloth, TOON);
    flag.castShadow = true;
    flag.setPosition(x + 0.05, 4.0, z);
    node.addChild(flag);
    banners.push(flag);
  }
  node.addChild(model(parts));
  if (greens.length) node.addChild(model(greens, FOLIAGE));
  const turned = new Float32Array(4);
  for (const [key, spots] of planted) {
    const [name, variant] = key.split('|');
    const grown = new InstancedMesh3D(floraGeometry(name, variant), /stone|stump|dead/.test(name) ? TOON : FOLIAGE, spots.length);
    spots.forEach(([x, y, z, tall, turn], i) => grown.setTransformAt(i, [x, y, z], quatFromEuler(turned, 0, turn, 0), tall));
    // Grass and flowers are too small to be worth a shadow.
    grown.castShadow = !/grass|flower|plant/.test(name);
    grown.receiveShadow = true;
    node.addChild(grown);
  }
  node.addChild(model(lit, LAMP, false));
  return { node, lamps, banners, censer: [censer[0], 1.5, censer[2]] };
}

/** What someone with a job does on screen: where they stand and which actions they cycle through. */
function routine(person, sites) {
  const job = person.job ?? { kind: 'rest' };
  const near = (kinds, fallback) => kinds.map((kind) => sites[kind]).find(Boolean) ?? fallback;
  const court = { x: 0, z: 6, spread: 9 };
  if (job.kind === 'train') {
    const klass = ART_BY_ID[job.art]?.klass;
    if (klass === 'inner') return { at: near(['cell', 'library'], court), actions: ['sit'], spread: 3 };
    if (klass === 'light') return { at: court, actions: ['run'], spread: 14, roam: true };
    const strike = STRIKE_OF[klass] ?? 'punch';
    return { at: near(CLASSES[klass]?.family === 'hand' ? ['yard', 'range'] : ['range', 'yard'], court), actions: [strike, 'guard', strike, strike === 'slash' ? 'thrust' : 'guard'], spread: 3.6 };
  }
  if (job.kind === 'seclude') return { at: near(['cell'], { x: -8, z: -12 }), actions: ['sit'], spread: 2 };
  if (job.kind === 'gather') return { at: near([{ gold: 'goldPit', wood: 'lumber', stone: 'quarry', iron: 'ironPit', herb: 'garden' }[job.res]], { x: 26, z: 20 }), actions: ['work'], spread: 3.4 };
  if (job.kind === 'craft') return { at: near([{ weapon: 'forge', armor: 'loom', pill: 'still' }[job.make]], court), actions: ['work'], spread: 2.6, front: true };
  if (job.kind === 'patrol' || job.kind === 'extort') return { at: { x: 0, z: 14 }, actions: ['walk'], spread: 9, roam: true };
  return { at: near(['mess', 'dorm'], court), actions: ['idle', 'walk'], spread: 4, roam: true, front: true };
}

const weaponSlotOf = (person) => person.gear?.weapon?.slot ?? null;

/**
 * @param stage  the stage from stage.mjs
 * @param world  the world; read, never changed
 * @param placeId which stronghold to show
 * @param options.layer   an element over the canvas for the buildings' name tags
 * @param options.nameOf  gives a building kind its name
 */
export function createSeat(stage, world, placeId, { layer = null, nameOf = (kind) => kind, onHour = () => {} } = {}) {
  const spec = PLACE_BY_ID[placeId];
  const random = scatter(spec.id.length * 7919 + spec.at.x * 31 + spec.at.y);
  const scene = new Scene3D();
  const camera = createPerspectiveCamera3D({ fov: 42, near: 0.5, far: 700 });
  scene.addChild(camera);
  const light = lightScene(scene, 'day', stage.quality);
  light.aim(0, 0, 0);
  // The day turns in about four minutes; it begins at a different hour in every place.
  let hour = 7 + ((spec.at.x * 7 + spec.at.y * 3) % 9);
  const land = ground(spec, random);
  scene.addChild(land.mesh);

  let dressing = null,
    built = new Object3D(),
    signature = '',
    owner = null;
  scene.addChild(built);
  /** Where smoke rises from: chimneys, fires and the censer. */
  let smokes = [];
  const PUFFS = 6;
  const smoke = new InstancedMesh3D(BALL, SMOKE, 8 * PUFFS);
  smoke.castShadow = false;
  scene.addChild(smoke);
  // Clouds drift across; birds wheel over the yard; petals fall from the trees by the hall; carp swim in the pond.
  const clouds = Array.from({ length: stage.quality === 'low' ? 5 : 11 }, () => {
    const cloud = new Mesh3D(build([0, 1, 2, 3].map((i) => [BALL, [(i - 1.5) * 9 + random() * 4, random() * 2.5, random() * 5], [8 + random() * 7, 2.6 + random() * 2, 5 + random() * 4], 0xffffff])), CLOUD);
    cloud.castShadow = false;
    scene.addChild(cloud);
    return { node: cloud, x: (random() - 0.5) * 420, y: 62 + random() * 30, z: -150 + random() * 240, pace: 1.2 + random() * 1.6 };
  });
  const birdShape = build([[BALL, [0, 0, 0], [0.16, 0.12, 0.34], 0x2c2c30], [SPIKE, [0, 0, 0.38], [0.05, 0.12, 0.05], 0xd9a23a, [Math.PI / 2, 0, 0]]]),
    wingShape = build([[BOX, [0.42, 0, 0], [0.84, 0.03, 0.3], 0x3a3a40]]);
  const birds = Array.from({ length: stage.quality === 'low' ? 3 : 7 }, (_, i) => {
    const node = new Object3D(),
      wings = [new Mesh3D(wingShape, TOON), new Mesh3D(wingShape, TOON)];
    node.addChild(new Mesh3D(birdShape, TOON));
    wings[1].setScale(-1, 1, 1);
    wings.forEach((wing) => node.addChild(wing));
    scene.addChild(node);
    return { node, wings, radius: 16 + i * 5 + random() * 8, height: 15 + random() * 12, pace: (0.25 + random() * 0.2) * (i % 2 ? 1 : -1), phase: random() * 6.283, cx: (random() - 0.5) * 20, cz: (random() - 0.5) * 24 };
  });
  const PETALS = stage.quality === 'low' ? 24 : 70;
  const petals = new InstancedMesh3D(build([[BOX, [0, 0, 0], [0.16, 0.012, 0.1], 0xffffff]]), TOON, PETALS);
  petals.castShadow = false;
  scene.addChild(petals);
  const drift = Array.from({ length: PETALS }, (_, i) => ({ x: (i % 2 ? 1 : -1) * 13.5 + (random() - 0.5) * 9, z: HALL_AT.z + 4.5 + (random() - 0.5) * 9, y: random() * 5, spin: random() * 6.283, pace: 0.5 + random() * 0.5 }));
  drift.forEach((petal, i) => petals.setColorAt(i, ...(i % 3 ? [0.93, 0.56, 0.66] : [0.97, 0.82, 0.86])));
  const carp = new InstancedMesh3D(build([[BALL, [0, 0, 0], [0.09, 0.05, 0.3], 0xffffff], [SPIKE, [0, 0, -0.36], [0.1, 0.16, 0.02], 0xffffff, [-Math.PI / 2, 0, 0]]]), TOON, 5);
  carp.castShadow = false;
  scene.addChild(carp);
  for (let i = 0; i < 5; i++) carp.setColorAt(i, ...[[0.9, 0.22, 0.05], [0.95, 0.9, 0.85], [0.9, 0.45, 0.05]][i % 3]);
  const turned = new Float32Array(4);
  let clock = random() * 100;

  /** Where each kind of building ended up, for sending people to work. */
  let sites = {};
  /** Name tags over the buildings: the element, the spot it marks and the building's place in the list. */
  let tags = [];
  const clearTags = () => (tags.forEach((tag) => tag.element.remove()), (tags = []));
  /** Figures by person id. */
  const cast = new Map();

  function layBuildings(place) {
    scene.removeChild(built);
    built = new Object3D();
    scene.addChild(built);
    sites = {};
    clearTags();
    // Buildings the player has placed keep their plots; the rest take what is left, the busiest kinds nearest the path.
    const all = plots();
    const sorted = place.buildings.map((b, index) => ({ ...b, index })).sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
    const taken = new Set(sorted.filter((b) => all[b.plot] && b.kind !== 'hall' && b.kind !== 'gate').map((b) => b.plot));
    const free = all.filter((_, i) => !taken.has(i));
    smokes = [];
    /** The plot a kind likes best of those still free. */
    const choose = (kind) => {
      if (!free.length) return undefined;
      const want = WANTS[kind] ?? edgeFirst;
      let best = 0;
      for (let i = 1; i < free.length; i++) if (want(free[i]) < want(free[best])) best = i;
      return free.splice(best, 1)[0];
    };
    for (const building of sorted) {
      const at = building.kind === 'hall' ? HALL_AT : building.kind === 'gate' ? GATE_AT : all[building.plot] && taken.delete(building.plot) ? all[building.plot] : choose(building.kind);
      if (!at) continue;
      const node = createBuilding(building.kind, building.level, place.owner);
      // The hall stands on its terrace. Buildings beside the avenue face it; those behind them face south.
      const turn = at.column === 1 ? -Math.sign(at.x) * (Math.PI / 2) : 0,
        scale = building.kind === 'hall' ? 1.35 : 1;
      node.setPosition(at.x, building.kind === 'hall' ? 0.6 : 0, at.z);
      node.setRotation(0, turn, 0);
      node.setScale(scale);
      built.addChild(node);
      const fx = Math.sin(turn),
        fz = Math.cos(turn);
      if (node.smoke) smokes.push([at.x + (node.smoke[0] * fz + node.smoke[2] * fx) * scale, node.smoke[1] * scale, at.z + (-node.smoke[0] * fx + node.smoke[2] * fz) * scale]);
      sites[building.kind] ??= { x: at.x + (building.kind === 'hall' ? 0 : 0), z: at.z + (building.kind === 'hall' ? 8 : 0), fx, fz };
      if (layer) {
        const element = document.createElement('button');
        element.className = 'scene-pin seat-tag';
        element.dataset.act = 'building';
        element.dataset.index = building.index;
        element.textContent = `${nameOf(building.kind)}${building.level > 1 ? ' ' + building.level : ''}`;
        tags.push({ element, x: at.x, y: building.kind === 'hall' ? 9 : building.kind === 'tower' ? 9 : 5, z: at.z });
      }
    }
  }

  function refresh() {
    const place = world().places[placeId];
    if (place.owner !== owner) {
      owner = place.owner;
      if (dressing) scene.removeChild(dressing.node);
      dressing = surroundings(land.height, scatter(spec.at.x * 131 + spec.at.y), owner ? hexOf(SECT_BY_ID[owner].color) : 0x8a8474, owner);
      scene.addChild(dressing.node);
    }
    const now = place.buildings.map((b) => b.kind + b.level + (b.plot ?? '')).join();
    if (now !== signature) (signature = now), layBuildings(place);

    // Leaders and elders are always shown; the rest fill the remaining places.
    const here = Object.values(world().persons)
      .filter((person) => person.place === placeId && person.school === place.owner)
      .sort((a, b) => b.rank - a.rank || a.id - b.id)
      .slice(0, CROWD[stage.quality] ?? 12);
    const wanted = new Set(here.map((person) => person.id));
    for (const [id, actor] of cast) if (!wanted.has(id)) scene.removeChild(actor.figure.node), cast.delete(id);
    for (const person of here) {
      const jobKey = JSON.stringify([person.job?.kind, person.job?.art, person.job?.res, person.job?.make, person.rank, weaponSlotOf(person)]);
      let actor = cast.get(person.id);
      if (actor && actor.gearKey !== `${person.rank}|${weaponSlotOf(person)}`) scene.removeChild(actor.figure.node), (actor = null);
      if (!actor) {
        const figure = createFigure({ color: hexOf(SECT_BY_ID[person.school].color), school: person.school, female: person.female, rank: person.rank, weapon: weaponSlotOf(person), seed: person.id, portraitId: person.portraitId, age: person.age, quality: stage.quality });
        actor = { figure, gearKey: `${person.rank}|${weaponSlotOf(person)}`, x: (random() - 0.5) * 8, z: GATE_AT.z + random() * 4, heading: Math.PI, wait: random() * 2, step: 0 };
        scene.addChild(figure.node);
        cast.set(person.id, actor);
      }
      if (actor.jobKey !== jobKey) {
        actor.jobKey = jobKey;
        // The head of the sect stands before the hall; everyone else follows their job.
        actor.routine = person.rank >= 5 ? { at: { x: 0, z: HALL_AT.z + 9 }, actions: ['idle'], spread: 1.5 } : routine(person, sites);
        actor.goal = null;
      }
    }
  }

  /** Walks an actor to a spot near their station, then has them act there for a while. */
  function direct(actor, dt) {
    const { figure, routine: plan } = actor;
    if (!actor.goal) {
      const angle = random() * 6.28,
        radius = Math.sqrt(random()) * plan.spread;
      // Someone working at a building stands in front of it, spread along its face.
      const fx = plan.front ? (plan.at.fx ?? 0) : 0,
        fz = plan.front ? (plan.at.fz ?? 1) : 0,
        out = plan.front ? PLOT / 2 + 0.5 : 0,
        across = Math.cos(angle) * radius,
        deep = Math.sin(angle) * radius * (plan.front ? 0.35 : 1);
      actor.goal = plan.front ? { x: plan.at.x + fx * (out + deep) + fz * across, z: plan.at.z + fz * (out + deep) - fx * across } : { x: plan.at.x + across, z: plan.at.z + deep };
    }
    const dx = actor.goal.x - actor.x,
      dz = actor.goal.z - actor.z,
      gap = Math.hypot(dx, dz);
    if (gap > 0.25) {
      const running = plan.actions[0] === 'run',
        pace = running ? 5 : 1.7;
      actor.heading = Math.atan2(dx, dz);
      actor.x += (dx / gap) * Math.min(gap, pace * dt);
      actor.z += (dz / gap) * Math.min(gap, pace * dt);
      if (figure.action !== (running ? 'run' : 'walk')) figure.play(running ? 'run' : 'walk');
    } else if (plan.roam) {
      actor.wait -= dt;
      if (figure.action !== 'idle') figure.play('idle');
      if (actor.wait <= 0) (actor.goal = null), (actor.wait = 1 + random() * 4);
    } else if (!figure.busy) {
      actor.wait -= dt;
      if (actor.wait <= 0) {
        const next = plan.actions[actor.step++ % plan.actions.length];
        figure.play(next, { base: next === 'sit' || next === 'work' ? next : 'guard' });
        actor.wait = 0.5 + random() * 1.2;
        // Now and then they shift to a new spot.
        if (random() < 0.06 && next !== 'sit') actor.goal = null;
      }
    }
    figure.node.setPosition(actor.x, 0, actor.z);
    figure.node.setRotation(0, actor.heading, 0);
    figure.node.setScale(FIGURE_SCALE);
    figure.update(dt);
  }

  refresh();
  // When the model files arrive, the grounds are planted again from them.
  whenFlora(() => ((owner = undefined), (signature = ''), refresh()));
  const scene3 = {
    showTags: true,
    /** The light of this place, for whoever wants to know the hour. */
    light,
    /** Sets the hour of the day, 0 to 24, for looking at the place in a given light. */
    setHour: (value) => (hour = value),
    scene,
    camera,
    placeId,
    refresh,
    enter() {
      stage.orbit.set({ target: [0, 1, -2], yaw: 0.45, pitch: 0.55, distance: 50, minDistance: 14, maxDistance: 120, minPitch: 0.2, maxPitch: 1.3, reach: 38, drift: 0.02 });
    },
    update(dt) {
      for (const actor of cast.values()) direct(actor, dt);
      stage.orbit.apply(camera, dt);
      clock += dt;
      // The day moves on, quicker through the night; shadows follow whatever the camera is looking at.
      hour = (hour + dt * (light.night ? 0.3 : 0.075)) % 24;
      light.setHour(hour);
      onHour(light.hour);
      light.aim(stage.orbit.target?.[0] ?? 0, 0, stage.orbit.target?.[2] ?? 0);
      // Banners stir in the wind.
      dressing?.banners.forEach((flag, i) => flag.setRotation(0, 0.35 * Math.sin(clock * 1.7 + i * 1.3) + 0.12 * Math.sin(clock * 4.1 + i), 0.05 * Math.sin(clock * 2.3 + i)));
      // Smoke rises from every fire and from the censer, thinning as it goes.
      const sources = [...smokes, ...(dressing ? [dressing.censer] : [])].slice(0, 8);
      smoke.count = sources.length * PUFFS;
      sources.forEach((from, s) => {
        for (let k = 0; k < PUFFS; k++) {
          const age = (clock * 0.22 + k / PUFFS + s * 0.37) % 1,
            thin = s === sources.length - 1 && dressing ? 0.45 : 1;
          smoke.setTransformAt(s * PUFFS + k, [from[0] + Math.sin(age * 5 + s) * age * 1.2 + age * 1.6, from[1] + age * 6.5 * thin, from[2] + Math.cos(age * 4 + s) * age * 0.6], quatFromEuler(turned, 0, age * 3, 0), (0.2 + age * 0.9) * thin * (1 - age * 0.4));
        }
      });
      clouds.forEach((cloud) => {
        cloud.x += cloud.pace * dt;
        if (cloud.x > 230) cloud.x = -230;
        cloud.node.setPosition(cloud.x, cloud.y, cloud.z);
      });
      birds.forEach((bird) => {
        const a = bird.phase + clock * bird.pace;
        bird.node.setPosition(bird.cx + Math.cos(a) * bird.radius, bird.height + Math.sin(clock * 0.6 + bird.phase) * 1.5, bird.cz + Math.sin(a) * bird.radius);
        bird.node.setRotation(0, -a + (bird.pace > 0 ? 0 : Math.PI), Math.sign(bird.pace) * 0.25);
        bird.node.setScale(1.6);
        const flap = Math.sin(clock * 9 + bird.phase) * 0.7;
        bird.wings[0].setRotation(0, 0, flap);
        bird.wings[1].setRotation(0, 0, -flap);
      });
      drift.forEach((petal, i) => {
        petal.y -= petal.pace * dt;
        if (petal.y < 0.05) petal.y = 4 + (i % 5) * 0.5;
        petals.setTransformAt(i, [petal.x + Math.sin(clock * 0.8 + petal.spin) * 1.2 + clock * 0.0, petal.y, petal.z + Math.cos(clock * 0.6 + petal.spin) * 0.9], quatFromEuler(turned, clock * 1.3 + petal.spin, clock + i, petal.spin), 1);
      });
      for (let i = 0; i < 5; i++) {
        const a = clock * (0.25 + i * 0.04) * (i % 2 ? 1 : -1) + i * 1.3,
          r = 0.35 + (i % 3) * 0.22;
        carp.setTransformAt(i, [POND.x + Math.cos(a) * POND.rx * r, 0.03, POND.z + Math.sin(a) * POND.rz * r], quatFromEuler(turned, 0, -a + (i % 2 ? 0 : Math.PI), 0), 1.1);
      }
      // The name tags follow their buildings; they are shown only while `showTags` is on.
      for (const tag of tags) {
        const at = scene3.showTags ? stage.orbit.project(tag.x, tag.y, tag.z) : null;
        if (!at) {
          tag.element.remove();
          continue;
        }
        if (!tag.element.isConnected) layer.append(tag.element);
        tag.element.style.left = at.x.toFixed(1) + 'px';
        tag.element.style.top = at.y.toFixed(1) + 'px';
      }
    },
    leave: () => tags.forEach((tag) => tag.element.remove()),
  };
  return scene3;
}
