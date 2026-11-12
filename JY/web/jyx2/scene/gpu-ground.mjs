import { Bitmap, Sprite } from '@egret/engine';

export const groundPageSize = 256;

function groundPages(items, textures) {
  const pages = new Map();
  for (const { id, px, py } of items) {
    const texture = textures.get(id);
    if (!texture) continue;
    const { region, dx, dy } = texture;
    const left = Math.round(px - dx);
    const top = Math.round(py - dy);
    for (let y = Math.floor(top / groundPageSize) * groundPageSize; y < top + region.height; y += groundPageSize) {
      for (let x = Math.floor(left / groundPageSize) * groundPageSize; x < left + region.width; x += groundPageSize) {
        const key = [x, y].join(',');
        if (!pages.has(key)) pages.set(key, { x, y, items: [] });
        pages.get(key).items.push({ id, left, top, texture });
      }
    }
  }
  return pages;
}

function samePage(previous, next) {
  return previous?.items.length === next.items.length && next.items.every((item, index) => {
    const prior = previous.items[index];
    return prior.id === item.id && prior.left === item.left && prior.top === item.top && prior.texture === item.texture;
  });
}

export function createGpuGround({ engine, host, scope, textures, leaseFor }) {
  let pages = new Map();
  let closed = false;
  const totals = { builds: 0, reused: 0, removals: 0 };
  scope.use({ dispose: close });

  function capture(page) {
    const hidden = [];
    const tileScope = engine.createScope();
    try {
      for (let index = 0; index < engine.stage.numChildren; index++) {
        const child = engine.stage.getChildAt(index);
        if (!child.visible) continue;
        hidden.push(child);
        child.visible = false;
      }
      const scratch = engine.stage.addChild(tileScope.use(new Sprite()));
      for (const { id, left, top } of page.items) {
        const tile = scratch.addChild(tileScope.use(new Bitmap(leaseFor(id))));
        tile.x = left - page.x;
        tile.y = top - page.y;
      }
      return engine.captureSharedFrame({ width: groundPageSize, height: groundPageSize, clearAlpha: 0, outputAlpha: 'premultiplied' });
    } finally {
      tileScope.dispose();
      for (const child of hidden) child.visible = true;
    }
  }

  async function update(items) {
    if (closed) throw new Error('Ground cache is closed.');
    const next = groundPages(items, textures);
    const allocated = [];
    const started = performance.now();
    let builds = 0, reused = 0, removals = 0;
    try {
      await host.whenIdle();
      // Retain the previous set until every new page is ready, including during a partial failure.
      for (const [key, page] of next) {
        if (scope.signal.aborted) throw new DOMException('Ground cache is closed.', 'AbortError');
        const previous = pages.get(key);
        if (samePage(previous, page) && previous.layer.state === 'ready') {
          page.layer = previous.layer;
          reused++;
        } else {
          const layer = host.createSharedLayer2D();
          allocated.push(layer);
          page.layer = layer;
          await layer.update(capture(page));
          builds++;
        }
      }
      if (scope.signal.aborted) throw new DOMException('Ground cache is closed.', 'AbortError');
      for (const [key, previous] of pages) {
        if (next.get(key)?.layer === previous.layer) continue;
        if (!next.has(key)) removals++;
        previous.layer.dispose();
      }
      pages = next;
      Object.assign(totals, { builds: totals.builds + builds, reused: totals.reused + reused, removals: totals.removals + removals });
      return { builds, reused, removals, pages: pages.size, elapsedMs: performance.now() - started };
    } catch (error) {
      for (const layer of allocated) layer.dispose();
      throw error;
    }
  }

  function placements(cameraX, cameraY, zoom, width, height) {
    const out = [];
    const size = groundPageSize * zoom;
    for (const page of pages.values()) {
      const x = cameraX + page.x * zoom, y = cameraY + page.y * zoom;
      if (x >= width || y >= height || x + size <= 0 || y + size <= 0) continue;
      out.push({ layer: page.layer, x, y, width: size, height: size });
    }
    return out;
  }

  function close() {
    if (closed) return;
    closed = true;
    for (const page of pages.values()) page.layer.dispose();
    pages.clear();
  }

  return { update, placements, get totals() { return { ...totals }; }, close };
}
