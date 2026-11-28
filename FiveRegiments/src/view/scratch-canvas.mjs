// The game also runs on WebKit hosts without OffscreenCanvas. A detached HTML
// canvas has the same 2D pixel/measurement API and is never added to the DOM.
export function createScratchCanvas(width, height, host = globalThis) {
  if (typeof host.OffscreenCanvas === 'function') return new host.OffscreenCanvas(width, height);
  const canvas = host.document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
