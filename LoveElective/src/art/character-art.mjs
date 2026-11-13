import { HERO, HEROINES, HEROINE_IDS } from '../data/cast.mjs';

const portraits = new Map();
const heads = new Map();
const headAnchors = {
  "qingge": [228, 494, 0.365],
  "linxia": [326, 517, 0.372],
  "wanqing": [284, 485, 0.384],
  "xinglan": [266, 488, 0.362],
  "zhiwei": [299, 470, 0.375],
  "tangmi": [253, 459, 0.37],
  "bailu": [276, 498, 0.394],
  "hero": [237, 505, 0.367]
};
// Eye centre relative to each neck cutout, measured in the source image.
const eyeOffsets = {
  qingge: -214, linxia: -201, wanqing: -220, xinglan: -214,
  zhiwei: -209, tangmi: -212, bailu: -229, hero: -226,
};
const NECK_Y = 237;
const crownHeights = {
  qingge: 74, linxia: 63, wanqing: 69, xinglan: 77,
  zhiwei: 78, tangmi: 84, bailu: 60, hero: 75,
};

const coverUrl = new URL('../../assets/characters/cover.webp', import.meta.url);
let cover;
let coverPromise;

const faces = {
  qingge: [0.57, 0.28], linxia: [0.56, 0.28], wanqing: [0.58, 0.33],
  xinglan: [0.52, 0.29], zhiwei: [0.56, 0.30], tangmi: [0.48, 0.31],
  bailu: [0.54, 0.30], hero: [0.52, 0.31],
};

function loadImage(url) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(undefined);
    image.src = url.href;
  });
}

export function loadCover() {
  coverPromise ??= loadImage(coverUrl).then(image => (cover = image));
  return coverPromise;
}

export function getCover() {
  return cover;
}

export async function preloadCharacterArt() {
  await Promise.all(['hero', ...HEROINE_IDS, 'professor'].map(async id => {
    const directory = '../../assets/characters/';
    const [image, head] = await Promise.all([
      loadImage(new URL(directory + id + '.webp', import.meta.url)),
      id === 'professor' ? undefined : loadImage(new URL(directory + id + '-head.webp', import.meta.url)),
    ]);
    if (image) portraits.set(id, image);
    if (head) heads.set(id, head);
  }));
}

const hairKeys = ['style', 'bangs', 'color', 'length', 'streak', 'ahoge'];

function sameHair(spec, look) {
  return hairKeys.every(key => spec.hair?.[key] === look.hair[key]);
}

export function hasLayeredHead(spec) {
  if (!heads.has(spec.id)) return false;
  const look = spec.id === 'hero' ? HERO.look : HEROINES[spec.id].look;
  return sameHair(spec, look);
}

function headScale(spec, authoredScale) {
  return authoredScale * (spec.id === 'hero' ? .88 : .91);
}

export function layeredCrownY(spec) {
  return crownHeights[spec.id];
}

export function layeredEyeY(spec) {
  return NECK_Y + eyeOffsets[spec.id] * headScale(spec, headAnchors[spec.id][2]);
}

export function paintLayeredHead(g, spec) {
  const image = heads.get(spec.id);
  const [cx, neck, authoredScale] = headAnchors[spec.id];
  const scale = headScale(spec, authoredScale);
  g.save();
  if (spec.id === 'hero') {
    // The portrait cutout includes part of the old neck. Trim that
    // wider section under the jaw into the continuous neck of the new rig.
    const cut = new Path2D();
    cut.moveTo(0, 0);
    cut.lineTo(400, 0);
    cut.lineTo(400, 211);
    cut.quadraticCurveTo(225, 211, 217, 218);
    cut.quadraticCurveTo(214, 225, 213, 239);
    cut.lineTo(187, 239);
    cut.quadraticCurveTo(186, 225, 183, 218);
    cut.quadraticCurveTo(175, 211, 0, 211);
    cut.closePath();
    g.clip(cut);
  }
  g.drawImage(image, 200 - cx * scale, NECK_Y - neck * scale, image.naturalWidth * scale, image.naturalHeight * scale);
  g.restore();
}

function samePiece(current, base) {
  return current?.id === base?.id
    && current?.c?.[0] === base?.c?.[0]
    && current?.c?.[1] === base?.c?.[1];
}

export function hasStoryPortrait(spec) {
  if (!portraits.has(spec.id)) return false;
  if (spec.id === 'professor') return true;
  const character = spec.id === 'hero' ? HERO : HEROINES[spec.id];
  const look = character.look;
  const wear = character.wear ?? character.outfits.uniform;
  const current = spec.wear ?? {};
  const accessories = current.acc ?? [];
  const baseAccessories = wear.acc ?? [];
  return sameHair(spec, look)
    && accessories.length === baseAccessories.length
    && accessories.every((item, index) => samePiece(item, baseAccessories[index]))
    && ['top', 'bottom', 'dress', 'outer', 'shoes', 'legs'].every(key => samePiece(current[key], wear[key]));
}

/** Frame the portrait into the same visible stage area as the bust rig. */
export function paintStoryCharacter(g, spec) {
  if (!hasStoryPortrait(spec)) return false;
  const image = portraits.get(spec.id);
  const scale = Math.min(392 / image.naturalWidth, 552 / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  g.drawImage(image, (400 - width) / 2, 600 - height, width, height);
  return true;
}

/** Draw a cropped head-and-shoulders card independently of stage scaling. */
export function paintPortrait(g, id, x, y, w, h) {
  const image = portraits.get(id);
  if (!image || !faces[id]) return false;
  const [faceX, faceY] = faces[id];
  const size = Math.min(image.naturalWidth, image.naturalHeight) * .61;
  const sourceWidth = w > h ? size : size * w / h;
  const sourceHeight = h > w ? size : size * h / w;
  const left = Math.min(image.naturalWidth - sourceWidth, Math.max(0, faceX * image.naturalWidth - sourceWidth / 2));
  const top = Math.min(image.naturalHeight - sourceHeight, Math.max(0, faceY * image.naturalHeight - sourceHeight * .42));
  g.drawImage(image, left, top, sourceWidth, sourceHeight, x, y, w, h);
  return true;
}
