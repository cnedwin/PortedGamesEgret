// The game's connection to the Egret engine: one shared-frame 2D engine on a
// WebGL2 (or WebGPU) host, textures made from pictures the game paints in code,
// a display tree of bitmaps, tinting, tweens driven by the engine clock, and
// pointer and keyboard input in the game's 1280 x 720 coordinates.
import {
  Bitmap,
  Sprite,
  DisplayObjectContainer,
  after,
  createAssetRef,
  createAssetType,
  createEngineForProfile,
  createImageData2D,
  createTexture,
  isTexture,
  createSharedMaterial2D,
} from '@egret/engine';
import { createBrowserFrameLoop } from '@egret/engine/web/loop';
import { createBrowserHoverInput } from '@egret/engine/web/hover';
import { createBrowserKeyboardInput } from '@egret/engine/web/keyboard';
import { createBrowserPointerInput } from '@egret/engine/web/pointer';

export const W = 1280;
export const H = 720;

/** The engine accepts images of up to this many pixels; pictures are painted smaller to fit. */
export const MAX_IMAGE_PIXELS = 1000000;

const EASE = {
  linear: t => t,
  out: t => 1 - (1 - t) ** 3,
  in: t => t ** 3,
  inOut: t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  back: t => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
};

/** A place in the display tree that shows one painted picture and can swap it for another. */
export class Pic {
  constructor(stage) {
    this.stage = stage;
    this.node = new DisplayObjectContainer();
    this.bitmap = null;
    this.lease = null;
    this.token = 0;
    this.dead = false;
  }

  /**
   * Show a painted canvas. `res` is how many canvas pixels there are per game
   * unit. A `key` names a picture that can be reused; without one the picture is unique.
   */
  async show(canvas, res = 1, key) {
    const token = ++this.token;
    let lease;
    try {
      lease = await this.stage.texture(canvas, key);
    } catch (error) {
      this.stage.fail(error);
      return;
    }
    if (token !== this.token || this.dead) {
      lease.release();
      return;
    }
    const bitmap = new Bitmap(lease);
    bitmap.scaleX = bitmap.scaleY = 1 / res;
    const old = this.bitmap,
      oldLease = this.lease;
    // The picture goes underneath anything else attached to this node.
    this.node.addChildAt(bitmap, 0);
    this.bitmap = bitmap;
    this.lease = lease;
    if (old) {
      this.node.removeChild(old);
      old.dispose();
      oldLease.release();
    }
  }

  /** Paint and show in one step: draw(g) works in game units. */
  paint(w, h, res, draw, key) {
    return this.show(this.stage.canvas(w, h, res, draw), res, key);
  }

  clear() {
    this.token++;
    if (this.bitmap) {
      this.node.removeChild(this.bitmap);
      this.bitmap.dispose();
      this.lease.release();
      this.bitmap = this.lease = null;
    }
  }

  /** Multiply the picture by a colour (linear light) and choose how it blends. */
  tint(r = 1, g = 1, b = 1, a = 1, blend = 'normal') {
    this.node.sharedMaterial = this.stage.material(r, g, b, a, blend);
  }

  destroy() {
    this.dead = true;
    this.clear();
    this.node.parent?.removeChild(this.node);
    this.node.dispose();
  }
}

/** Start the engine on a canvas. backend is 'webgl2' or 'webgpu'. */
export async function createStage(canvas, { backend = 'webgl2', pixelRatio = 1, onError } = {}) {
  let host;
  if (backend === 'webgpu') {
    const { createSharedWebGPUHost } = await import('@egret/engine/webgpu');
    host = createSharedWebGPUHost({ canvas, pixelRatio, outputAlpha: 'opaque' });
  } else {
    const { createSharedWebGL2Host } = await import('@egret/engine/webgl2');
    host = createSharedWebGL2Host({ canvas, pixelRatio, outputAlpha: 'opaque' });
  }
  const engine = await createEngineForProfile({ host }, 'egret.shared-frame2d/1');
  const scope = engine.createScope();
  const frame = { width: W, height: H, clearColor: 0x14122a, clearAlpha: 1, outputAlpha: 'opaque' };

  // Painted canvases reach the engine as textures through its asset manager.
  const type = createAssetType('love-elective-picture', isTexture);
  const waiting = new Map();
  engine.assets.register(type, {
    async load(ref) {
      const source = waiting.get(ref.id);
      waiting.delete(ref.id);
      const g = source.getContext('2d');
      const pixels = new Uint8Array(g.getImageData(0, 0, source.width, source.height).data.buffer);
      return createTexture(createImageData2D({ width: source.width, height: source.height, pixels }));
    },
    dispose(texture) {
      texture.dispose();
    },
  });

  const materials = new Map();
  const tweens = new Set();
  const tickers = new Set();
  const kept = [];
  let serial = 0,
    failed = false;

  const stage = {
    engine,
    host,
    backend,
    canvasElement: canvas,
    root: engine.stage,
    pointer: { x: W / 2, y: H / 2, down: false },

    /** A new offscreen canvas of w x h game units at `res` pixels per unit, already scaled for drawing. */
    canvas(w, h, res, draw) {
      // Stay inside the engine's per-image pixel limit.
      const fit = Math.min(1, Math.sqrt(MAX_IMAGE_PIXELS / (w * h * res * res)));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * res * fit));
      c.height = Math.max(1, Math.round(h * res * fit));
      const g = c.getContext('2d', { willReadFrequently: true });
      g.scale(c.width / w, c.height / h);
      draw(g);
      c.res = c.width / w;
      return c;
    },

    /** Turn a canvas into a texture lease. Pictures with the same key share one texture. */
    texture(source, key) {
      const id = key ?? 'p' + ++serial;
      if (!waiting.has(id)) waiting.set(id, source);
      return engine.assets.acquire(createAssetRef(type, id)).finally(() => waiting.delete(id));
    },

    /** Keep a keyed picture loaded for a while so returning to it is instant. */
    async keep(source, key, limit = 10) {
      if (kept.some(k => k.key === key)) return;
      const entry = { key, lease: null };
      kept.push(entry);
      entry.lease = await stage.texture(source, key);
      while (kept.length > limit) kept.shift().lease?.release();
    },

    material(r, g, b, a, blend) {
      const key = [r, g, b, a].map(v => Math.round(v * 100)).join(',') + blend;
      let m = materials.get(key);
      if (!m) materials.set(key, (m = createSharedMaterial2D({ light: [r, g, b, a], blend, filter: 'linear' })));
      return m;
    },

    pic(parent) {
      const p = new Pic(stage);
      (parent ?? stage.root).addChild(p.node);
      return p;
    },

    group(parent) {
      return (parent ?? stage.root).addChild(new DisplayObjectContainer());
    },

    /** A solid rectangle, for fades and bars; costs no texture. */
    rect(parent, color, w = W, h = H) {
      const s = (parent ?? stage.root).addChild(new Sprite());
      s.graphics.beginFill(color).drawRect(0, 0, w, h).endFill();
      return s;
    },

    /**
     * Animate numeric properties of a display object (or any object).
     * Returns a promise that resolves when the tween ends or is replaced.
     */
    tween(target, to, seconds, { ease = 'out', delay = 0 } = {}) {
      const properties = Object.keys(to);
      for (const active of tweens) {
        if (active.target === target && properties.some(key => key in active.to)) active.cancel();
      }
      return new Promise(resolve => {
        let deferred, motion;
        const finish = () => {
          tweens.delete(entry);
          resolve();
        };
        const entry = { target, to, cancel() {
          deferred?.cancel();
          motion?.dispose();
          finish();
        } };
        const start = () => {
          const from = properties.map(key => target[key]);
          // The engine owns the time and lifecycle. Retain the game's existing easing curves.
          motion = engine.createTween(scope, {
            from: 0,
            to: 1,
            durationSeconds: Math.max(0.0001, seconds),
            onUpdate(progress) {
              const value = EASE[ease](progress);
              try {
                for (const [index, key] of properties.entries()) {
                  target[key] = progress === 1 ? to[key] : from[index] + (to[key] - from[index]) * value;
                }
              } catch {
                // A screen may dispose a display object before its transition completes.
                queueMicrotask(entry.cancel);
              }
              return undefined;
            },
            onComplete: finish,
          });
          motion.start();
        };
        tweens.add(entry);
        if (delay > 0) deferred = after(engine, scope, delay, start);
        else start();
      });
    },

    wait(seconds) {
      return new Promise(resolve => after(engine, scope, seconds, resolve));
    },

    /** Call fn(dt, time) every frame until the returned function is called. */
    onTick(fn) {
      tickers.add(fn);
      return () => tickers.delete(fn);
    },

    fail(error) {
      if (failed) return;
      failed = true;
      onError?.(error);
    },

    start() {
      // Every picture is drawn with smooth filtering unless a Pic sets its own tint.
      stage.root.sharedMaterial = stage.material(1, 1, 1, 1, 'normal');
      engine.clock.onTick(scope, tick => {
        const dt = Math.min(0.05, tick.deltaSeconds);
        for (const fn of [...tickers]) fn(dt, tick.elapsedSeconds);
        return undefined;
      });
      // The engine's frame loop steps the clock in pieces it accepts (a slow frame is played back for up to half a
      // second; after a hidden tab time simply resumes) and draws only when the host has finished the last frame.
      const loop = createBrowserFrameLoop({
        engine,
        host,
        frame,
        maxPendingFrames: 1,
        maxStepSeconds: engine.clock.maxDeltaSeconds * 0.9,
        catchUpSeconds: 0.5,
        onError: error => stage.fail(error),
      });
      scope.use(loop);
      loop.start();
    },
  };

  // The painted panels still own hit regions and modal order. Egret owns native input and coordinate mapping.
  const handlers = { down: new Set(), up: new Set(), move: new Set(), key: new Set() };
  stage.on = (kind, fn) => {
    handlers[kind].add(fn);
    return () => handlers[kind].delete(fn);
  };
  const emit = (kind, ...args) => {
    for (const fn of [...handlers[kind]]) fn(...args);
  };
  const keyboard = createBrowserKeyboardInput({ engine, scope });
  // The artwork is a composite bitmap. A non-rendering hit area keeps hover
  // tracking across the whole stage, including the empty space between panels.
  const inputSurface = stage.root.addChild(new Sprite());
  inputSurface.touchEnabled = true;
  inputSurface.hitArea = { x: 0, y: 0, width: W, height: H };
  keyboard.registerTarget({ id: 'campus-shortcuts', target: inputSurface, tabIndex: -1 });
  keyboard.focus('campus-shortcuts');
  inputSurface.on(keyboard.events.keyDown, event => {
    const key = event.payload;
    if (!key.repeat) emit('key', key.key, event);
  });
  if (document.activeElement === document.body) canvas.focus({ preventScroll: true });

  let activeContact = null;
  createBrowserPointerInput({
    engine, scope, width: W, height: H,
    onContact({ kind, contact }) {
      const { globalX: x, globalY: y, session, buttons } = contact;
      const { pointerType } = session;
      if (kind === 'begin') {
        if (activeContact || (pointerType !== 'touch' && !(buttons & 1))) return;
        activeContact = session;
        canvas.focus({ preventScroll: true });
        Object.assign(stage.pointer, { x, y, down: true });
        emit('down', x, y);
        return;
      }
      if (activeContact !== session) return;
      if (kind === 'move') {
        Object.assign(stage.pointer, { x, y });
        emit('move', x, y, session);
        return;
      }
      activeContact = null;
      stage.pointer.down = false;
      if (kind === 'cancel') emit('up', -1, -1, session);
      else {
        Object.assign(stage.pointer, { x, y });
        emit('up', x, y, session);
      }
    },
  });
  createBrowserHoverInput({
    canvas, engine, scope, width: W, height: H, onError: stage.fail,
    onHover({ kind, point, reason }) {
      if (activeContact) return;
      if (kind === 'leave') {
        if (reason !== 'target') emit('move', -1, -1, point);
        return;
      }
      const { globalX: x, globalY: y } = point;
      Object.assign(stage.pointer, { x, y });
      emit('move', x, y, point);
    },
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  return stage;
}
