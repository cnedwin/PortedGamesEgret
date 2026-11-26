// 现场：一幅比屏幕宽得多的宋画长卷，分三层（远景底图、人物与物件、近景与环境动态），拖动、双指或滚轮缩放时三层以不同
// 速度移动。证物是画里的人和物：点中就打开它的卷片。没看过的证物上有一圈朱色的提示，看过但词没收齐的留一个小点。
// 提示的第一、二级让相关的证物亮起来，并把画面移过去。
// The scene: a Song handscroll far wider than the screen, in three layers (the painted ground, the people and things,
// and the near layer with its moving air), which slide at different speeds as the player drags, pinches or scrolls.
// The evidence is the people and things in the picture; a tap opens its card. Evidence not yet seen has a red ring
// on it; seen evidence with words still to collect keeps a small dot. The first two hint levels light the evidence
// they mean and move the view to it.
import { Sprite } from '@egret/engine';
import { VERMILION } from './type.mjs';

const MAX_ZOOM = 2.6;

/**
 * Build the scene of case `c` from its layout `L` into `parent`. `ctx` has game, art(id) → url, artInfo(id), view
 * area { x, y, w, h } (stage units), quality, and callbacks onSpot(id), wordsLeft(id) → number, seen(id) → bool.
 */
export async function buildScene(parent, c, L, ctx) {
  const { game } = ctx;
  const root = new Sprite();
  parent.addChild(root);
  const far = new Sprite(),
    mid = new Sprite(),
    air = new Sprite(),
    near = new Sprite(),
    marks = new Sprite();
  for (const s of [far, mid, air, near, marks]) root.addChild(s);
  const [W, H] = L.size;
  const lowSuffix = ctx.quality === 'low' ? '-low' : '';
  const bg = await ctx.pictures.image(ctx.art(L.bg + lowSuffix), { layer: far, x: W / 2, y: H / 2, width: W, height: H });
  // People and things, back to front by their feet.
  const placed = {};
  const items = [...L.items].sort((a, b) => (a.z ?? a.y) - (b.z ?? b.y));
  await Promise.all(
    items.map(async (it) => {
      const info = ctx.artInfo(it.art);
      const h = it.h,
        w = info ? (info.w / info.h) * h : h * 0.5;
      const holder = new Sprite();
      (it.layer === 'near' ? near : mid).addChild(holder);
      holder.x = it.x;
      holder.y = it.y;
      const pic = await ctx.pictures.image(ctx.art(it.art), { layer: holder, x: 0, y: -h / 2, width: w, height: h });
      if (it.flip) pic.scaleX = -1;
      if (it.rot) pic.rotation = it.rot;
      holder.alpha = it.alpha ?? 1;
      placed[it.spot ?? it.art] = { holder, rect: [it.x - w / 2, it.y - h, w, h], item: it };
    })
  );
  // Keep the drawing order by depth now that all are in.
  for (const it of items) {
    const p = placed[it.spot ?? it.art];
    if (p) p.holder.parent?.addChild(p.holder);
  }

  // Where each piece of evidence can be tapped: its own rectangle in the layout, or the picture of what it names.
  const spots = Object.keys(c.spots).map((id) => {
    const rect = L.spots?.[id] ?? placed[id]?.rect;
    if (!rect) throw Error(`scene ${c.id}: no place for spot ${id}`);
    return { id, rect, area: rect[2] * rect[3] };
  });
  const spotAt = (sx, sy) =>
    spots
      .filter((s) => sx >= s.rect[0] && sx <= s.rect[0] + s.rect[2] && sy >= s.rect[1] && sy <= s.rect[1] + s.rect[3])
      .sort((a, b) => a.area - b.area)[0];

  // The moving air: mist, flame, water, smoke, flies, dust, rain.
  const effects = (L.ambient ?? []).map((a) => makeEffect(air, a, game));

  // The camera: a scale that fits the scene's height to the view at zoom 1, and a centre point in scene units.
  const cam = { x: L.start?.[0] ?? W / 2, y: H / 2, zoom: L.start?.[1] ?? 1 };
  let area = ctx.area;
  const baseScale = () => area.h / H;
  const scale = () => baseScale() * cam.zoom;
  const clamp = () => {
    const s = scale();
    const halfW = area.w / s / 2,
      halfH = area.h / s / 2;
    cam.x = halfW * 2 >= W ? W / 2 : Math.max(halfW, Math.min(W - halfW, cam.x));
    cam.y = halfH * 2 >= H ? H / 2 : Math.max(halfH, Math.min(H - halfH, cam.y));
  };
  const place = () => {
    clamp();
    const s = scale();
    const ox = area.x + area.w / 2,
      oy = area.y + area.h / 2;
    root.scaleX = root.scaleY = s;
    root.x = ox - cam.x * s;
    root.y = oy - cam.y * s;
    // Parallax: the painted ground lags a little, the near layer leads.
    const off = cam.x - W / 2;
    far.x = off * 0.06;
    near.x = -off * 0.08;
  };
  place();

  const toScene = (px, py) => {
    const s = scale();
    return [(px - root.x) / s, (py - root.y) / s];
  };
  const toStage = (sx, sy) => {
    const s = scale();
    return [root.x + sx * s, root.y + sy * s];
  };

  // Markers on evidence: a pulsing ring until seen, then a dot while words remain.
  let pulse = 0;
  const drawMarks = (hover, glow) => {
    const g = marks.graphics;
    g.clear();
    const s = scale();
    const k = 1 / s;
    for (const sp of spots) {
      const [x, y, w, h] = sp.rect;
      const cx = x + w / 2,
        cy = y + Math.min(h * 0.18, 120);
      const lit = glow?.includes(sp.id);
      if (lit) {
        g.lineStyle(5 * k, 0xffd36b, 0.95).drawRect(x - 8 * k, y - 8 * k, w + 16 * k, h + 16 * k);
        g.lineStyle(0, 0, 0);
        g.beginFill(0xffd36b, 0.13 + 0.07 * Math.sin(pulse * 4)).drawRect(x, y, w, h).endFill();
      }
      if (hover === sp.id) {
        g.lineStyle(3 * k, VERMILION, 0.9).drawRect(x - 4 * k, y - 4 * k, w + 8 * k, h + 8 * k);
        g.lineStyle(0, 0, 0);
      }
      if (!ctx.seen(sp.id)) {
        const r = (16 + 4 * Math.sin(pulse * 3)) * k;
        g.lineStyle(3.5 * k, VERMILION, 0.9).drawCircle(cx, cy, r);
        g.lineStyle(0, 0, 0);
        g.beginFill(VERMILION, 0.9).drawCircle(cx, cy, 5 * k).endFill();
      } else if (ctx.wordsLeft(sp.id) > 0) {
        g.beginFill(VERMILION, 0.75).drawCircle(cx, cy, 6 * k).endFill();
      }
    }
  };

  let hover = null,
    glow = null,
    glowUntil = 0,
    moveTo = null;
  return {
    root,
    spots,
    placed,
    size: [W, H],
    cam,
    spotAt,
    toScene,
    toStage,
    setArea(a) {
      area = a;
      place();
    },
    pan(dxStage, dyStage) {
      const s = scale();
      cam.x -= dxStage / s;
      cam.y -= dyStage / s;
      moveTo = null;
      place();
    },
    zoomBy(f, atX, atY) {
      const before = atX === undefined ? null : toScene(atX, atY);
      cam.zoom = Math.max(1, Math.min(MAX_ZOOM, cam.zoom * f));
      place();
      if (before) {
        const after = toScene(atX, atY);
        cam.x += before[0] - after[0];
        cam.y += before[1] - after[1];
        place();
      }
    },
    /** Glide the view to a spot (or a list of spots), and light them for a while. */
    showSpots(ids, { light = true, seconds = 6 } = {}) {
      const rects = ids.map((id) => spots.find((s) => s.id === id)?.rect).filter(Boolean);
      if (!rects.length) return;
      const x0 = Math.min(...rects.map((r) => r[0])),
        x1 = Math.max(...rects.map((r) => r[0] + r[2]));
      moveTo = { x: (x0 + x1) / 2, zoom: Math.min(cam.zoom, Math.max(1, (area.w / baseScale()) / Math.max(400, (x1 - x0) * 1.3))) };
      if (light) {
        glow = ids;
        glowUntil = game.time + seconds;
      }
    },
    setHover(id) {
      hover = id;
    },
    focusSpot(id) {
      hover = id;
      const r = spots.find((s) => s.id === id)?.rect;
      if (r) moveTo = { x: r[0] + r[2] / 2, zoom: cam.zoom };
    },
    update(dt) {
      pulse += dt;
      if (moveTo) {
        const k = Math.min(1, dt * (game.reducedMotion ? 30 : 4));
        cam.x += (moveTo.x - cam.x) * k;
        cam.zoom += (moveTo.zoom - cam.zoom) * k;
        if (Math.abs(moveTo.x - cam.x) < 2 && Math.abs(moveTo.zoom - cam.zoom) < 0.01) moveTo = null;
        place();
      }
      if (glow && game.time > glowUntil) glow = null;
      for (const e of effects) e.update(dt, pulse);
      drawMarks(hover, glow);
    }
  };
}

/** One kind of moving air, drawn in code each frame. */
function makeEffect(layer, a, game) {
  const s = new Sprite();
  layer.addChild(s);
  const g = s.graphics;
  const rnd = (() => {
    let seed = Math.floor((a.x ?? 1) * 13 + (a.y ?? 7) * 7) || 1;
    return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  })();
  const parts = Array.from({ length: a.count ?? 12 }, () => ({ x: rnd(), y: rnd(), p: rnd() * 6.28, v: 0.4 + rnd() }));
  const still = () => game.reducedMotion;
  const kinds = {
    mist(t) {
      const [x, y, w, h] = a.rect;
      for (const q of parts) {
        const px = x + ((q.x * w + (still() ? 0 : t * 18 * q.v)) % w);
        g.beginFill(0xffffff, 0.05 + 0.05 * q.v).drawEllipse(px - 260, y + q.y * h, 520, 60 + 40 * q.v).endFill();
      }
    },
    flame(t) {
      const f = still() ? 1 : 1 + 0.12 * Math.sin(t * 13 + parts[0].p) + 0.06 * Math.sin(t * 29);
      for (let i = 4; i > 0; i--) g.beginFill(0xffc15e, 0.05 * i).drawCircle(a.x, a.y, (a.r ?? 60) * f * (i / 2.2)).endFill();
    },
    water(t) {
      const [x, y, w, h] = a.rect;
      for (const q of parts) {
        const px = x + q.x * w + (still() ? 0 : Math.sin(t * q.v + q.p) * 30);
        const py = y + q.y * h;
        g.beginFill(0xffffff, 0.16 + 0.1 * Math.sin(t * 2 + q.p)).drawRect(px, py, 60 + 80 * q.v, 3).endFill();
      }
    },
    smoke(t) {
      for (const q of parts) {
        const life = still() ? q.y : (q.y + t * 0.05 * q.v) % 1;
        g.beginFill(0x2b2622, 0.18 * (1 - life)).drawCircle(a.x + (q.x - 0.5) * 140 + life * 60, a.y - life * (a.h ?? 500), 30 + life * 90).endFill();
      }
    },
    flies(t) {
      for (const q of parts) {
        const ang = still() ? q.p : t * (2 + 3 * q.v) + q.p;
        const r = 20 + 50 * q.x;
        g.beginFill(0x111111, 0.85).drawCircle(a.x + Math.cos(ang) * r, a.y + Math.sin(ang * 1.3) * r * 0.5, 3.4).endFill();
      }
    },
    dust(t) {
      const [x, y, w, h] = a.rect;
      for (const q of parts) {
        const py = y + ((q.y * h + (still() ? 0 : t * 10 * q.v)) % h);
        g.beginFill(0xfff3c8, 0.35 + 0.3 * Math.sin(t * 2 + q.p)).drawCircle(x + q.x * w + Math.sin(t + q.p) * 12, py, 2.5).endFill();
      }
    },
    rain(t) {
      const [x, y, w, h] = a.rect;
      for (const q of parts) {
        const py = y + ((q.y * h + (still() ? 0 : t * 420 * q.v)) % h);
        g.lineStyle(2, 0xdde6ee, 0.5).moveTo(x + q.x * w, py).lineTo(x + q.x * w - 8, py + 34);
      }
      g.lineStyle(0, 0, 0);
    }
  };
  const draw = kinds[a.kind] ?? (() => {});
  return {
    update(dt, t) {
      g.clear();
      draw(t);
    }
  };
}
