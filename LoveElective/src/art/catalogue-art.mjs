// Hand-painted catalogue plates. Cell order mirrors the art delivery, so any
// changes to catalogue order or translation leave illustration IDs intact.
import { GIFTS, SUPPLIES } from '../data/items.mjs';

const TILE = 192;
const atlases = {
  collectibles: [6, [
    'tea', 'pen', 'sportsdrink', 'taiyaki', 'paints', 'bouquet',
    'vinyl', 'picks', 'keycaps', 'bubbletea', 'macaron', 'perfume',
    'starmap', 'cocoa', 'plush', 'novel', 'console', 'musicbox',
    'energydrink', 'logicbook', 'proteinbar', 'sketchbook', 'talkbook', 'magazine',
  ]],
  apparel: [6, [
    'shirt', 'tee', 'hoodie', 'sweater', 'turtleneck', 'jersey',
    'sailor', 'blouse', 'slacks', 'jeans', 'cargo', 'shorts',
    'pleated', 'longskirt', 'sundress', 'gown', 'blazer', 'cardigan',
    'varsity', 'trench', 'denim', 'sneakers', 'loafers', 'boots',
  ]],
  accessories: [4, [
    'heels', 'socks', 'kneesocks', 'thighhighs',
    'tights', 'glasses', 'shades', 'beret',
    'cap', 'bow', 'headphones', 'hairpin',
    'necklace', 'tie', 'scarf', 'bag',
  ]],
};
const entries = new Map();
const images = new Map();
const itemIds = new Map(Object.entries({ ...GIFTS, ...SUPPLIES }).map(([id, def]) => [def.icon.join('/'), id]));
let loading;

for (const [atlas, [columns, ids]] of Object.entries(atlases)) {
  ids.forEach((id, index) => entries.set(id, { atlas, x: index % columns * TILE, y: Math.floor(index / columns) * TILE }));
}

export function loadItemArt() {
  if (typeof Image === 'undefined') return Promise.resolve();
  loading ??= Promise.all(Object.keys(atlases).map(async atlas => {
    const image = new Image();
    image.src = new URL(`../../assets/items/${atlas}.webp`, import.meta.url).href;
    try {
      await image.decode();
      images.set(atlas, image);
    } catch {
      // The vector painters remain available when an illustration is offline.
    }
  }));
  return loading;
}

export function drawCatalogueArt(g, id, x, y, size) {
  const cell = entries.get(id);
  const image = images.get(cell?.atlas);
  if (!image) return false;
  g.save();
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(image, cell.x, cell.y, TILE, TILE, x, y, size, size);
  g.restore();
  return true;
}

export function drawCollectibleArt(g, icon, x, y, size) {
  return drawCatalogueArt(g, itemIds.get(icon.join('/')), x, y, size);
}
