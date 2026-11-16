// Pictures, read the way every browser can: fetched as bytes, decoded by the browser's own image element, and
// read back from a canvas as plain pixels for the engine to make a texture of. The engine has a stricter reader
// of its own, but it asks more of a canvas than the browsers on phones all give.
import { createAssetRef, createAssetType, createImageData2D, createTexture, isTexture } from '@egret/engine';

const hex = bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');

/** How many files have been read so far, and who wants to be told when another has. */
let arrived = 0;
const watching = new Set();
/** Calls `tell` with the count each time a file has been read. Returns a function that stops it. */
export function watchReading(tell) {
  watching.add(tell);
  return () => watching.delete(tell);
}

/** The bytes at an address. With `sha256`, they are checked against it where the browser can. */
export async function readBytes(url, sha256) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`${response.status} ${url}`);
  const bytes = await response.arrayBuffer();
  if (sha256 && globalThis.crypto?.subtle && hex(await crypto.subtle.digest('SHA-256', bytes)) !== sha256) throw Error(`The file is not the one the manifest lists: ${url}`);
  arrived++;
  for (const tell of watching) tell(arrived);
  return bytes;
}

/** What a file of text that holds JSON says. */
export const readJson = async (url, sha256) => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readBytes(url, sha256)));

/** A texture from the picture at an address. */
export async function readTexture(url, sha256) {
  const address = URL.createObjectURL(new Blob([await readBytes(url, sha256)], { type: /\.jpe?g$/.test(url) ? 'image/jpeg' : 'image/png' }));
  try {
    const image = new Image();
    image.src = address;
    await image.decode();
    const canvas = document.createElement('canvas'),
      width = (canvas.width = image.naturalWidth),
      height = (canvas.height = image.naturalHeight),
      pen = canvas.getContext('2d', { willReadFrequently: true });
    pen.drawImage(image, 0, 0);
    const texture = createTexture(createImageData2D({ width, height, pixels: new Uint8Array(pen.getImageData(0, 0, width, height).data.buffer) }));
    // The canvas has done its work; an empty one gives its memory back at once.
    canvas.width = canvas.height = 0;
    return texture;
  } finally {
    URL.revokeObjectURL(address);
  }
}

/** Gives a function that loads the picture at an address as something a Bitmap can show. */
export function createPictures(engine, scope) {
  const type = createAssetType('lantern-shadows-picture', isTexture);
  engine.assets.register(type, { load: ref => readTexture(ref.id), dispose: texture => texture.dispose() });
  return async url => scope.use(await engine.assets.acquire(createAssetRef(type, url)));
}
