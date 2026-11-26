// Derive the card emblems from the existing, licensed board atlas.
// No new art source or third-party dependency is introduced.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ELEMENT_ORDER } from '../src/core/cards.mjs';
const require = createRequire(import.meta.url);
const { PNG } = require('../vendor/egret/third-party/pngjs/lib/png.js');
const atlas = PNG.sync.read(readFileSync(new URL('../assets/art/tiles.png', import.meta.url)));
if (atlas.width !== 768 || atlas.height !== 512) throw Error('Unexpected tile atlas layout');
const folder = new URL('../assets/art/ui/', import.meta.url);
mkdirSync(fileURLToPath(folder), {recursive:true});
for (const [index, element] of ELEMENT_ORDER.entries()) {
  const size=108, offset=10;
  const icon=new PNG({width:size,height:size});
  for(let y=0;y<size;y++){
    const from=((offset+y)*atlas.width+index*128+offset)*4;
    atlas.data.copy(icon.data, y*size*4, from, from+size*4);
  }
  writeFileSync(new URL(element+'.png',folder),PNG.sync.write(icon));
}
console.log('Five original emblems extracted from tiles.png');