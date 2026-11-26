import { Texture3D } from '@egret/engine/world3d';

const PATH = new URL('../../assets/prop-surfaces/', import.meta.url);
const FILES = [['map', 'color', 'srgb'], ['normalMap', 'normal', 'linear'], ['metallicRoughnessMap', 'metalrough', 'linear']];

/** A disposable map set shared by all sculpted props. A failed optional load leaves vertex colour available. */
export async function loadPropAtlas(level) {
  const size = level === 'low' ? 'low' : 'high';
  const signal = AbortSignal.timeout(8000);
  const ready = await Promise.allSettled(FILES.map(async ([slot, file, colorSpace]) => {
    const response = await fetch(new URL(size + '-' + file + '.png', PATH), { signal });
    if (!response.ok) throw Error('Prop map HTTP ' + response.status);
    const bitmap = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    if (signal.aborted) {
      bitmap.close();
      throw signal.reason;
    }
    try {
      const texture = new Texture3D(bitmap, { colorSpace, mipmaps: true, wrapS: 'clamp', wrapT: 'clamp', anisotropy: 2 });
      return { slot, texture, bitmap };
    } catch (error) {
      bitmap.close();
      throw error;
    }
  }));
  const loaded = ready.filter((item) => item.status === 'fulfilled').map((item) => item.value);
  const dispose = () => {
    for (const { texture, bitmap } of loaded.splice(0)) {
      texture.dispose();
      bitmap.close();
    }
  };
  if (loaded.length !== FILES.length) {
    dispose();
    return null;
  }
  const maps = Object.fromEntries(loaded.map(({ slot, texture }) => [slot, texture]));
  return { maps, dispose };
}
