import { Texture3D } from '@egret/engine/world3d';

export function createWorldCanvasTexture(canvas) {
  const { width, height } = canvas;
  const { data } = canvas.getContext('2d').getImageData(0, 0, width, height);
  const stride = width * 4;
  const pixels = new Uint8Array(data.length);
  // Preflip the rows so a canvas upload cannot leave the skinning upload's
  // shared WebGL UNPACK_FLIP_Y_WEBGL state enabled.
  for (let y = 0; y < height; y++) {
    pixels.set(data.subarray(y * stride, (y + 1) * stride), (height - y - 1) * stride);
  }
  return new Texture3D({ width, height, data: pixels }, { colorSpace: 'srgb', flipY: false });
}
