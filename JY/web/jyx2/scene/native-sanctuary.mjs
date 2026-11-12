import { createBoxGeometry3D, createCylinderGeometry3D } from '@egret/engine/world3d';
import { addBattleGround, battleCellSeed, battleGrid, battlePartBatches } from './native-battle-terrain.mjs';

export function addNativeSanctuary(scene, spec, stone, wood, own) {
  const grid = battleGrid(spec);
  const { width, height, propAt: wallAt } = grid;
  const recess = (x, y) => wallAt(x, y) === 2213;
  const groundTiles = addBattleGround(scene, grid, {
    map: stone, baseColor: 0xe1c49e, tones: [0xbba88e, 0x403b37], repeat: 2.7, accent: recess, extraGround: recess,
  }, own);

  const bases = [], walls = [], tops = [], shelves = [], books = [], pages = [], rails = [], rocks = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const id = wallAt(x, y);
    if (!id || id === 2213) continue;
    if (id >= 2204 && id <= 2212 || id >= 2351 && id <= 2360) {
      const h = wallAt(x, y - 1) !== 2213 && wallAt(x - 1, y) !== 2213 ? .55 : 1.04;
      bases.push([x, .09, y, 1.01, .18, 1.01]);
      walls.push([x, h * .5 + .13, y, .965, h, .965]);
      tops.push([x, h + .2, y, 1.01, .16, 1.01]);
    } else if (id === 2332) {
      shelves.push([x, .35, y, .22, .68, .22], [x, .07, y, .34, .12, .34]);
      books.push([x, .71, y, .64, .07, .48, 0, -.32]);
      pages.push([x - .14, .755, y, .25, .022, .38, 0, -.32], [x + .14, .755, y, .25, .022, .38, 0, -.32]);
    } else if (id === 2031) {
      for (let i = -2; i <= 2; i++) rails.push([x, .61, y + i * .17, .035, 1.22, .035]);
    } else {
      rocks.push([x, .26, y, .67, .52, .67, battleCellSeed(x, y) % 4 * Math.PI / 2]);
    }
  }

  const box = own(createBoxGeometry3D());
  const parts = battlePartBatches(scene, own);
  parts.add(bases, box, 0x8d765d, stone);
  parts.add(walls, box, 0xa99373, stone);
  parts.add(tops, box, 0x6e604e, stone);
  parts.add(books, box, 0x68512d, wood);
  parts.add(pages, box, 0xece2c8);
  parts.add(rails, box, 0x655c48);
  parts.add(shelves, own(createCylinderGeometry3D({ radiusTop: .16, radiusBottom: .4, height: 1, radialSegments: 7 })), 0xb89144);
  parts.add(rocks, own(createCylinderGeometry3D({ radiusTop: .34, radiusBottom: .56, height: 1, radialSegments: 7 })), 0x8b887c, stone);
  return { groundTiles, ...parts.stats };
}
