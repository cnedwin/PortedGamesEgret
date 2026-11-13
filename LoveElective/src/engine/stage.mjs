// The game's connection to the Egret engine: one shared-frame 2D engine on a
// WebGL2 (or WebGPU) host, textures made from pictures the game paints in code,
// a display tree of bitmaps, tinting, tweens driven by the engine clock, and
// pointer and keyboard input in the game's 1280 x 720 coordinates.
import {
  Bitmap,
  Sprite,
  DisplayObjectContainer,
  createAssetRef,
  createAssetType,
  createEngineForProfile,
  createImageData2D,
  createTexture,
  isTexture,
  createSharedMaterial2D,
} from '@egret/engine';

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
    failed = false,
    lastTime,
    gameTime = 0;

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
      for (const t of tweens)
        if (t.target === target && Object.keys(to).some(k => k in t.to)) {
          tweens.delete(t);
          t.done();
        }
      return new Promise(done => {
        const from = {};
        const t = { target, to, from, seconds: Math.max(0.0001, seconds), time: -delay, ease: EASE[ease], done, started: false };
        tweens.add(t);
      });
    },

    wait(seconds) {
      return stage.tween({ v: 0 }, { v: 1 }, seconds, { ease: 'linear' });
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
        for (const t of [...tweens]) {
          t.time += dt;
          if (t.time < 0) continue;
          if (!t.started) {
            t.started = true;
            for (const k of Object.keys(t.to)) t.from[k] = t.target[k];
          }
          const p = Math.min(1, t.time / t.seconds),
            e = t.ease(p);
          try {
            for (const k of Object.keys(t.to)) t.target[k] = t.from[k] + (t.to[k] - t.from[k]) * e;
          } catch {
            tweens.delete(t);
            t.done();
            continue;
          }
          if (p >= 1) {
            tweens.delete(t);
            t.done();
          }
        }
        for (const fn of [...tickers]) fn(dt, tick.elapsedSeconds);
        return undefined;
      });
      const loop = now => {
        if (failed) return;
        requestAnimationFrame(loop);
        // The engine clock refuses large jumps, so a slow frame is fed to it as
        // several smaller steps; after a long pause (a hidden tab) time simply resumes.
        let behind = Math.min((now - (lastTime ?? now)) / 1000, 0.5);
        lastTime = now;
        const step = engine.clock.maxDeltaSeconds * 0.9;
        try {
          do {
            gameTime += Math.min(behind, step);
            behind -= step;
            engine.advanceTime(gameTime);
          } while (behind > 0);
          // Submit a frame only when the host has finished the previous one.
          const status = host.getStatus();
          if (status.state === 'failed') throw Object.assign(new Error('The graphics device stopped working.'), { code: status.firstFailure?.code });
          if (status.pendingFrames === 0) engine.renderSharedFrame(frame);
        } catch (error) {
          stage.fail(error);
        }
      };
      requestAnimationFrame(loop);
    },
  };

  // ---- input, converted to game coordinates
  const toGame = event => {
    const r = canvas.getBoundingClientRect();
    return [((event.clientX - r.left) / r.width) * W, ((event.clientY - r.top) / r.height) * H];
  };
  const handlers = { down: new Set(), up: new Set(), move: new Set(), key: new Set() };
  stage.on = (kind, fn) => {
    handlers[kind].add(fn);
    return () => handlers[kind].delete(fn);
  };
  const emit = (kind, ...args) => {
    for (const fn of [...handlers[kind]]) fn(...args);
  };
  canvas.addEventListener('pointerdown', e => {
    const [x, y] = toGame(e);
    Object.assign(stage.pointer, { x, y, down: true });
    canvas.setPointerCapture?.(e.pointerId);
    emit('down', x, y, e);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => {
    const [x, y] = toGame(e);
    Object.assign(stage.pointer, { x, y });
    emit('move', x, y, e);
  });
  canvas.addEventListener('pointerup', e => {
    const [x, y] = toGame(e);
    Object.assign(stage.pointer, { x, y, down: false });
    emit('up', x, y, e);
  });
  canvas.addEventListener('pointercancel', () => {
    stage.pointer.down = false;
    emit('up', -1, -1, null);
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (!e.repeat) emit('key', e.key, e);
  });

  return stage;
}
