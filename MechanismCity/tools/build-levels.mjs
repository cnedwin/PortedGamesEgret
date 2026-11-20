// 把 src/levels/designs.mjs 的图纸写成 Tiled 地图：levels/<id>.tmj，以及关卡目录 levels/levels.json。
// Writes the plans of src/levels/designs.mjs as Tiled maps: levels/<id>.tmj, and the list levels/levels.json.
// The maps are in the form Tiled saves (orthogonal, CSV tile layers, an object layer of mechanisms), so they
// can be opened and changed in Tiled; the game reads them with the engine's importer.
//
//   node tools/build-levels.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { HEIGHT, LEVELS, WIDTH } from '../src/levels/designs.mjs';
import { TILE, TILES, TILESET } from '../src/levels/tiles.mjs';

const out = new URL('../levels/', import.meta.url);
// Every plan is drawn below a band of open sky, so a map has the shape of the screen and the whole city
// fits in view when the camera pulls back.
const SKY = 7;
// Rows of foundation under every plan, so the camera can lift the crossbow clear of the controls.
const FOOT = 3;
const ROWS = HEIGHT + SKY + FOOT;
mkdirSync(out, { recursive: true });

/** One level's drawing kit, collecting cells and objects. */
function kit() {
  const terrain = new Array(WIDTH * ROWS).fill(0),
    backdrop = new Array(WIDTH * ROWS).fill(0),
    material = new Array(WIDTH * ROWS).fill(''),
    objects = [],
    tags = new Map();
  let nextId = 1;
  // The plan's rows are below the band of sky.
  const cells = (x0, y0, x1, y1, act) => {
    y0 += SKY;
    y1 += SKY;
    for (let y = Math.max(0, y0); y <= Math.min(ROWS - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(WIDTH - 1, x1); x++) act(x, y, y * WIDTH + x);
  };
  const property = (name, value) => ({ name, type: typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? (Number.isInteger(value) ? 'int' : 'float') : 'string', value });
  const object = (type, x, y, width, height, props = {}, extra = {}) => {
    const entry = { id: nextId++, name: extra.name ?? '', type, x: x * TILE, y: (y + SKY) * TILE, width: width * TILE, height: height * TILE, rotation: 0, visible: true, ...extra.shape, properties: Object.entries(props).map(([name, value]) => property(name, value)) };
    if (entry.properties.length === 0) delete entry.properties;
    objects.push(entry);
    return entry;
  };
  const k = {
    rock: (x0, y0, x1, y1) => cells(x0, y0, x1, y1, (x, y, i) => (material[i] = 'rock')),
    beam: (x0, y0, x1, y1) => cells(x0, y0, x1, y1, (x, y, i) => (material[i] = 'beam')),
    bronze: (x0, y0, x1, y1) => cells(x0, y0, x1, y1, (x, y, i) => (material[i] = 'bronze')),
    // A hall: bays four cells wide between posts, a lattice window high in every other bay.
    hall: (x0, y0, x1, y1) =>
      cells(x0, y0, x1, y1, (x, y, i) => {
        const bay = x - x0,
          window = bay % 8 === 2 && (y - y0) % 4 === 1 && y < y1 - 1;
        backdrop[i] = TILES[window ? 'window' : bay % 4 === 0 ? 'wallDark' : 'wall'] + 1;
      }),
    lantern: (x, y) => (backdrop[(y + SKY) * WIDTH + x] = TILES.lantern + 1),
    banner: (x, y) => {
      backdrop[(y + SKY) * WIDTH + x] = TILES.bannerTop + 1;
      backdrop[(y + SKY + 1) * WIDTH + x] = TILES.bannerFoot + 1;
    },
    gear: (x, y) => (backdrop[(y + SKY) * WIDTH + x] = TILES.gear + 1),
    bow: (x, y) => object('bow', x + 0.5, y + 0.4, 0, 0, { angle: -32, power: 62 }, { shape: { point: true } }),
    block: (x, y, w, h, tag) => remember(tag, object('block', x, y, w, h)),
    crate: (x, y, w, h, tag) => remember(tag, object('crate', x, y, w, h)),
    stone: (cx, cy, r, tag) => remember(tag, object('stone', cx - r, cy - r, r * 2, r * 2, {}, { shape: { ellipse: true } })),
    rope: (x, y, length, held) => object('rope', x, y, 0, length, { holds: held }),
    seesaw: (x, y, w, down) => object('seesaw', x - w / 2, y - 0.16, w, 0.32, { down }),
    spring: (x, y, w, power = 760) => object('spring', x, y + 0.6, w, 0.4, { power }),
    plate: (x, y, w, name, needs = 'any') => object('plate', x, y + 0.7, w, 0.3, { needs }, { name }),
    gate: (x, y, w, h, by, rise = h) => object('gate', x, y, w, h, { by, rise: rise * TILE }),
    lock: (x, y, w, h, needs) => object('lock', x, y, w, h, { needs }),
    ramp: (points) => {
      const [ox, oy] = points[0];
      return object('ramp', ox, oy, 0, 0, {}, { shape: { polygon: points.map(([px, py]) => ({ x: (px - ox) * TILE, y: (py - oy) * TILE })) } });
    }
  };
  function remember(tag, entry) {
    if (tag) tags.set(tag, entry);
    return entry;
  }
  return { k, terrain, backdrop, material, objects, tags };
}

/** A number in [0, 1) for a cell, the same every build, without a pattern the eye picks out. */
function hash(x, y) {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Which tile a solid cell is: its stuff, and whether open sky is above or beside it. */
function dress(material, terrain) {
  const at = (x, y) => (x < 0 || x >= WIDTH || y >= ROWS ? 'rock' : y < 0 ? '' : material[y * WIDTH + x]);
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < WIDTH; x++) {
      const stuff = at(x, y);
      if (!stuff) continue;
      const open = !at(x, y - 1);
      let tile;
      if (stuff === 'beam') tile = open ? TILES.beamTop : TILES.beam;
      else if (stuff === 'bronze') tile = TILES.bronze;
      else if (open && !at(x - 1, y)) tile = TILES.rockTopLeft;
      else if (open && !at(x + 1, y)) tile = TILES.rockTopRight;
      else if (open) tile = TILES.rockTop;
      else tile = hash(x, y) < 0.22 ? TILES.rockB : TILES.rockA;
      terrain[y * WIDTH + x] = tile + 1;
    }
}

const index = [];
for (const [number, design] of LEVELS.entries()) {
  const { k, terrain, backdrop, material, objects, tags } = kit();
  design.plan(k);
  // The walls at both ends of the city rise through the sky band too.
  k.rock(0, -SKY, 0, -1);
  k.rock(WIDTH - 1, -SKY, WIDTH - 1, -1);
  k.rock(0, HEIGHT, WIDTH - 1, HEIGHT + FOOT - 1);
  dress(material, terrain);
  // A rope names what it holds by a tag; in the map it is the id of that object, and the object is held.
  for (const entry of objects)
    if (entry.type === 'rope') {
      const held = tags.get(entry.properties.find((p) => p.name === 'holds').value);
      if (!held) throw new Error(`${design.id}: a rope holds an unknown tag`);
      entry.properties.find((p) => p.name === 'holds').value = held.id;
      entry.properties.find((p) => p.name === 'holds').type = 'int';
      (held.properties ??= []).push({ name: 'held', type: 'bool', value: true });
    }
  const layer = (id, name, data) => ({ id, name, type: 'tilelayer', x: 0, y: 0, width: WIDTH, height: ROWS, opacity: 1, visible: true, data });
  const map = {
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.2',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    width: WIDTH,
    height: ROWS,
    tilewidth: TILE,
    tileheight: TILE,
    nextlayerid: 4,
    nextobjectid: objects.length + 1,
    properties: [
      { name: 'title', type: 'string', value: design.title },
      { name: 'titleEn', type: 'string', value: design.en },
      { name: 'pellets', type: 'string', value: design.pellets },
      { name: 'par', type: 'int', value: design.par },
      { name: 'number', type: 'int', value: number + 1 }
    ],
    tilesets: [TILESET],
    layers: [layer(1, 'backdrop', backdrop), layer(2, 'terrain', terrain), { id: 3, name: 'mechanisms', type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, draworder: 'topdown', objects }]
  };
  writeFileSync(new URL(design.id + '.tmj', out), JSON.stringify(map, null, 1) + '\n');
  index.push({ id: design.id, title: design.title, en: design.en, file: design.id + '.tmj', par: design.par, pellets: design.pellets.split(',').length });
}
writeFileSync(new URL('levels.json', out), JSON.stringify(index, null, 2) + '\n');
console.log(`${index.length} levels written to levels/`);
