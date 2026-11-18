import { createWebGL2Renderer3D } from '@egret/engine/webgl2/world3d';

export function createWorldRenderer(options) {
  const renderer = createWebGL2Renderer3D(options);
  const gl = renderer.context;
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const adapter = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : '';
  // Shadow-receiving skinned meshes can reset this ANGLE/D3D11 GPU context.
  if (/ANGLE .*RTX 5090 Laptop GPU \(0x00002C58\) Direct3D11\b/i.test(adapter)) renderer.shadowsEnabled = false;
  return renderer;
}
