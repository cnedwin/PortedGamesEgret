// The scene and its interface share the engine's screen plan, but not their renderers.
import { createWorld3DOverlay } from '@egret/engine/webgl2/world3d';
import { createBrowserHoverInput } from '@egret/engine/web/hover';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { createUiTester } from '@egret/engine/ui/testing';

export const LANDSCAPE = { width: 800, height: 420 };
export const PORTRAIT = { width: 380, height: 680 };

/** The native overlay clamps CSS scale; layout uses ordinary stage units and 48-unit touch controls. */
export function uiMetrics(screen) {
  return { screen, safe: screen.safe, scale: screen.scale, unit: 1, tap: 48, portrait: screen.height > screen.width };
}

export async function createInterfaceHost(canvas, { label, onError = console.error } = {}) {
  const semantics = createUiSemantics();
  let host;
  const overlay = await createWorld3DOverlay(canvas, {
    ...LANDSCAPE, portrait: PORTRAIT, fit: 'expand', blendSpace: 'srgb', passThrough: true,
    // Text raster density follows the overlay pixel ratio, not the stage's later CSS scale.
    // Two samples per logical pixel keep desktop text and borders sharp as expand enlarges the stage.
    pixelRatio: 2, renderMode: 'on-demand', uiScale: { min: 44 / 48, max: 1.35 }, webgl2PageBatching: 'single-page',
    update: (dt) => host?.tick(dt), onError
  });
  const game = overlay.game;
  const projection = createBrowserSemantics({ semantics, canvas: overlay.canvas, width: game.frame.width, height: game.frame.height, label, onError });
  // The overlay currently does not request a hover channel; create the normal browser adapter against its actual stage.
  const hover = game.hover ?? createBrowserHoverInput({ engine: game.engine, scope: game.scope, canvas: overlay.canvas,
    width: game.frame.width, height: game.frame.height, size: () => game.frame, onError });
  const keyboard = game.keyboard, pending = new Set(), layouts = new Set(), painters = new Set(), textures = new Map();
  let dirty = true, closed = false, focusStamp = '', frameCount = 0;
  const requestPublish = () => { dirty = true; };
  function publish() {
    if (closed) return;
    semantics.publish();
    dirty = false;
  }
  function track(promise) {
    const p = Promise.resolve(promise);
    pending.add(p);
    p.then(() => { pending.delete(p); requestPublish(); }, (cause) => { pending.delete(p); if (!closed) onError(cause); });
    return p;
  }
  const focus = () => overlay.canvas.focus({ preventScroll: true });
  const blurToBoard = () => { keyboard?.focus(undefined); canvas.focus({ preventScroll: true }); requestPublish(); };
  const mapKey = { up: ['ArrowUp','ArrowUp'], down: ['ArrowDown','ArrowDown'], left: ['ArrowLeft','ArrowLeft'], right: ['ArrowRight','ArrowRight'], confirm: ['Enter','Enter'] };
  function commandKeys(name, { reverse = false } = {}) {
    if (!keyboard) return false;
    if (name === 'next') { keyboard.moveFocus(reverse ? 'previous' : 'next', true); requestPublish(); return true; }
    const sample = mapKey[name];
    if (!sample) return false;
    if (!keyboard.getSnapshot().focusedId) keyboard.moveFocus('next', true);
    const key = { code: sample[0], key: sample[1] };
    const consumed = keyboard.keyDown(key);
    keyboard.keyUp(key);
    if (!consumed && name !== 'confirm') keyboard.moveFocus(name === 'up' || name === 'left' ? 'previous' : 'next', true);
    requestPublish();
    return true;
  }
  host = {
    game, overlay, semantics, keyboard, hover, canvas,
    tester: createUiTester({ semantics, update: publish }),
    metrics: () => uiMetrics(game.screen),
    /** Translate points projected by World3D from its CSS canvas to the expanded overlay stage. */
    project(x, y) {
      const world = canvas.getBoundingClientRect(), front = overlay.canvas.getBoundingClientRect();
      const scale = game.screen.scale;
      return { x: (x + world.left - front.left) / scale, y: (y + world.top - front.top) / scale };
    },
    track, requestPublish, requestRender: requestPublish, publish, focus, blurToBoard, commandKeys,
    registerLayout(fn) { layouts.add(fn); return () => layouts.delete(fn); },
    registerPainter(fn) { painters.add(fn); return () => painters.delete(fn); },
    async ready() {
      // Opening a native managed screen prepares leaves asynchronously; take a fresh snapshot until they settle.
      for (let n=0; n<80; n++) {
        const batch = [...pending];
        if (!batch.length) { await Promise.resolve(); if (!pending.size) break; }
        else await Promise.allSettled(batch);
      }
      publish();
    },
    texture(source) {
      if (!source) return Promise.resolve(undefined);
      if (!textures.has(source)) {
        // The game's scope retains the lease for the host lifetime. Bitmap needs the lease, not its value.
        const task = typeof source === 'string' || source instanceof URL ? game.loadTexture(String(source)) : game.textureFromCanvas(source);
        textures.set(source, task);
        task.catch(()=>{if(textures.get(source)===task)textures.delete(source);});
      }
      return textures.get(source);
    },
    tick() {
      frameCount++;
      const k = keyboard?.getSnapshot();
      const stamp = k ? String(k.focusedId) + '/' + k.focusVisible : '';
      if (stamp !== focusStamp) { focusStamp = stamp; for (const paint of [...painters]) paint(); dirty = true; }
      if (dirty) publish();
    },
    get frames() { return frameCount; },
    async dispose() {
      if (closed) return; closed = true; stopScreen(); layouts.clear(); painters.clear();
      projection.dispose(); semantics.dispose(); await overlay.dispose();
    }
  };
  const stopScreen = game.onScreenChange(() => {
    // The logical extent really changes when expand turns; update the existing DOM accessibility projection in place.
    projection.sync(game.frame);
    for (const layout of [...layouts]) layout();
    requestPublish();
  });
  return host;
}
