import { Texture3D } from '@egret/engine/world3d';

export function createWorldCanvasTexture(canvas) {
  // World3D can upload the painted canvas with its bottom row at V = 0.
  return new Texture3D(canvas, { colorSpace: 'srgb', flipY: true });
}
