import { Bitmap } from '@egret/engine';

const CHAPTER_ART = ['outer-city.jpg', 'waterworks.jpg', 'citadel.jpg'];

export function createIllustrations(game) {
  const loads = new Map();
  async function decode(path) {
    // The vendored Egret file decoder reads PNG. Keep paintings compact and let the browser decode them.
    const image = new Image();
    image.src = new URL('../../art/' + path, import.meta.url).href;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return game.textureFromCanvas(canvas);
  }
  function load(path) {
    if (!loads.has(path)) {
      const pending = decode(path).catch((cause) => {
        loads.delete(path);
        throw cause;
      });
      loads.set(path, pending);
    }
    return loads.get(path);
  }
  return {
    cover: () => load('illustrations/gate.webp'),
    speakers: () => load('illustrations/speakers.webp'),
    chapter: (index) => load('scenery/' + CHAPTER_ART[index]),
    mechanisms: () => load('mechanisms.png'),
  };
}

/** Place a cropped illustration without stretching it, using the shared texture lease. */
export function placeIllustration(container, scope, texture, { x = 0, y = 0, width = 960, height = 540, focus = 0.5 } = {}) {
  const image = scope.use(new Bitmap(texture));
  const sourceWidth = Math.min(image.naturalWidth, Math.floor(image.naturalHeight * width / height));
  const sourceHeight = Math.min(image.naturalHeight, Math.floor(image.naturalWidth * height / width));
  image.sourceRect = { x: Math.floor((image.naturalWidth - sourceWidth) / 2), y: Math.floor((image.naturalHeight - sourceHeight) * focus),
    width: sourceWidth, height: sourceHeight };
  image.x = x;
  image.y = y;
  image.scaleX = width / sourceWidth;
  image.scaleY = height / sourceHeight;
  return container.addChild(image);
}
