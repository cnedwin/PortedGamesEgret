import { createWebGL2Renderer3D } from '@egret/engine/webgl2/world3d';

export function createWorldRenderer(options) {
  // A low-level renderer does not receive World3DApp's mobile presentation
  // policy automatically. Keep the compositor backing store stable on iOS
  // while native World3D still changes its internal resolution on rotation.
  const nav=globalThis.navigator;
  const agent=nav?.userAgent ?? '';
  const appleMobile=agent.includes('AppleWebKit/') &&
    (/\b(?:iPhone|iPad|iPod)\b/.test(agent) || agent.includes('Macintosh') && (nav.maxTouchPoints ?? 0)>1);
  const renderer = createWebGL2Renderer3D({...options,
    ...('ownerDocument' in options.canvas && appleMobile ? {presentationResize:'stable'} : {})});
  const gl = renderer.context;
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const adapter = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : '';
  // Shadow-receiving skinned meshes can reset this ANGLE/D3D11 GPU context.
  if (/ANGLE .*RTX 5090 Laptop GPU \(0x00002C58\) Direct3D11\b/i.test(adapter)) renderer.shadowsEnabled = false;
  return renderer;
}
