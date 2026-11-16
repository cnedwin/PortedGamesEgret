// Levels are laid out here as a grid of letters and written out as a Tiled map, which the engine draws and the
// rules read. A cell is 48 stage units; the map is stored at twice that, so that its tiles stay sharp.

export const CELL = 48,
  /** Map pixels for each stage unit. */
  DETAIL = 2;

/** The tiles of the set, in order. `solid` stops a body from every side; `ledge` only from above. */
export const TILES = [
  { name: 'top', solid: true },
  { name: 'fill', solid: true },
  { name: 'cloud-left', ledge: true },
  { name: 'cloud', ledge: true },
  { name: 'cloud-right', ledge: true }
];
const GID = Object.fromEntries(TILES.map((tile, index) => [tile.name, index + 1]));

/** What a letter on the grid stands for when it is a thing rather than ground. */
export const THINGS = { S: 'spawn', s: 'spearman', a: 'archer', h: 'guard', k: 'crane', p: 'post', c: 'checkpoint', t: 'tree', o: 'peach', v: 'vent', f: 'furnace', n: 'fanner', d: 'alchemist', G: 'gate', N: 'boss', E: 'erlang', L: 'laozi' };
/** The pictures a level's ground may be drawn from, by the name a level gives. Each holds the tiles of TILES in order. */
export const TILESETS = { terrace: 'tiles.png', orchard: 'orchard.png', palace: 'palace.png' };

/** An empty grid to draw a level on: `fill` lays ground or cloud over a rectangle of cells, `put` stands a thing in one. */
export function grid(columns, rows) {
  const cells = Array.from({ length: rows }, () => Array(columns).fill('.'));
  return {
    columns,
    rows,
    cells,
    fill(letter, column, row, width = 1, height = 1) {
      for (let r = row; r < row + height; r++) for (let c = column; c < column + width; c++) cells[r][c] = letter;
      return this;
    },
    put(letter, column, row) {
      if (cells[row][column] !== '.') throw Error(`Cell ${column},${row} is taken by ${cells[row][column]}`);
      if (!'X-'.includes(cells[row + 1]?.[column] ?? '.')) throw Error(`The ${THINGS[letter]} at ${column},${row} stands on nothing`);
      cells[row][column] = letter;
      return this;
    },
    /** Places a thing that needs nothing under it: what flies, and what hangs from a bough. */
    hang(letter, column, row) {
      if (cells[row][column] !== '.') throw Error(`Cell ${column},${row} is taken by ${cells[row][column]}`);
      cells[row][column] = letter;
      return this;
    },
    text: () => cells.map(row => row.join('')).join('\n')
  };
}

/** The Tiled map of a grid: one layer of terrain, and the things as points where their feet are. */
export function toTiled({ columns, rows, cells }, title, set = 'terrace') {
  const at = (c, r) => cells[r]?.[c] ?? '.';
  const data = [],
    objects = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < columns; c++) {
      const letter = at(c, r);
      // Ground shows its dressed edge only where nothing lies on it; a cloud has an end on each side.
      if (letter === 'X') data.push(at(c, r - 1) === 'X' ? GID.fill : GID.top);
      else if (letter === '-') data.push(at(c - 1, r) !== '-' ? GID['cloud-left'] : at(c + 1, r) !== '-' ? GID['cloud-right'] : GID.cloud);
      else {
        data.push(0);
        if (THINGS[letter]) objects.push({ id: objects.length + 1, name: '', type: THINGS[letter], point: true, x: (c + 0.5) * CELL * DETAIL, y: (r + 1) * CELL * DETAIL, width: 0, height: 0, rotation: 0, visible: true });
      }
    }
  const size = CELL * DETAIL;
  return {
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.2',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    width: columns,
    height: rows,
    tilewidth: size,
    tileheight: size,
    nextlayerid: 3,
    nextobjectid: objects.length + 1,
    properties: [{ name: 'title', type: 'string', value: title }],
    tilesets: [
      {
        firstgid: 1,
        name: set,
        tilewidth: size,
        tileheight: size,
        columns: TILES.length,
        tilecount: TILES.length,
        spacing: 0,
        margin: 0,
        image: '../scene/' + TILESETS[set],
        imagewidth: size * TILES.length,
        imageheight: size,
        tiles: TILES.map((tile, id) => ({ id, type: tile.name, properties: [{ name: tile.solid ? 'solid' : 'ledge', type: 'bool', value: true }] }))
      }
    ],
    layers: [
      { id: 1, type: 'tilelayer', name: 'terrain', width: columns, height: rows, x: 0, y: 0, opacity: 1, visible: true, data },
      { id: 2, type: 'objectgroup', name: 'things', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects }
    ]
  };
}
