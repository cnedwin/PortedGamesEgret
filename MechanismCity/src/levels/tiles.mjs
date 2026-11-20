// 地形图块：levels/terrain.png 上每格画的是什么，哪些是实心的。
// The tiles of levels/terrain.png (painted by tools/paint-tiles.py): what each cell holds and which are
// solid. The solid ones carry the Tiled property `solid`, which the game reads to make the physics world's
// tile colliders.

export const TILE = 32;
export const COLUMNS = 8;
export const ROWS = 4;

export const TILES = {
  rockTop: 0,
  rockA: 1,
  rockB: 2,
  rockTopLeft: 3,
  rockTopRight: 4,
  beamTop: 5,
  beam: 6,
  bronze: 7,
  wall: 8,
  wallDark: 9,
  window: 10,
  lantern: 11,
  bannerTop: 12,
  bannerFoot: 13,
  gear: 14
};

const SOLID = [TILES.rockTop, TILES.rockA, TILES.rockB, TILES.rockTopLeft, TILES.rockTopRight, TILES.beamTop, TILES.beam, TILES.bronze];

/** The tileset as a Tiled map embeds it. */
export const TILESET = {
  firstgid: 1,
  name: 'terrain',
  image: 'terrain.png',
  imagewidth: COLUMNS * TILE,
  imageheight: ROWS * TILE,
  tilewidth: TILE,
  tileheight: TILE,
  tilecount: COLUMNS * ROWS,
  columns: COLUMNS,
  margin: 0,
  spacing: 0,
  tiles: SOLID.map((id) => ({ id, properties: [{ name: 'solid', type: 'bool', value: true }] }))
};
