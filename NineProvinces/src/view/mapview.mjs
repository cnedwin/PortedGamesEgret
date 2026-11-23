// 天下大地图的画面：底下一张网页画布（山川、疆域、城关津的图标、地名和城主的旗号），上面一张透明的引擎画布（各地的
// 点按区域、行进中的军团、选中的光圈、行军路线、交战的标记）。两张画布都由引擎的 2D 相机定位：拖动平移、滚轮缩放、
// 方向键移动；鼠标停在城或军团上时由引擎的悬停输入告诉界面显示提示。
// The view of the realm: a page canvas beneath (the land, the powers' borders, the marks of cities, passes and ferries,
// their names and their lords' banners) and a clear engine canvas above (the tap areas of the places, armies on the
// march, the ring of what is chosen, the route of a march, the marks of battles). Both follow the engine's 2D camera:
// drag to pan, the wheel to zoom, the arrow keys to move; when the mouse rests on a place or an army, the engine's hover
// input tells the interface to show its note.
import { Bitmap, Sprite } from '@egret/engine';
import { createCamera2D } from '@egret/engine/camera';
import { UNITS } from '../data/battle.mjs';
import { MAP, NODES } from '../data/map.mjs';
import { getLanguage, nm } from '../i18n.mjs';
import { factionName } from './names.mjs';
import { KAI, landOwnersGrid, paintBase, paintLands, SERIF } from './mapart.mjs';

const rgb = (c) => [c >> 16, (c >> 8) & 255, c & 255];
const css = (c, a = 1) => `rgba(${rgb(c).join(',')},${a})`;

/** A canvas of banner characters: one cell for each power's flag, painted white to be tinted by the banner beneath. */
export async function bannerAtlas(game, chars) {
  const cell = 64,
    cols = 16;
  const canvas = document.createElement('canvas');
  canvas.width = cell * cols;
  canvas.height = cell * Math.ceil(chars.length / cols);
  const g = canvas.getContext('2d');
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const at = {};
  chars.forEach((ch, i) => {
    const x = (i % cols) * cell,
      y = Math.floor(i / cols) * cell;
    g.font = `700 ${ch.length > 1 ? 29 : 46}px ${KAI}`;
    g.fillText(ch, x + cell / 2, y + cell / 2 + 2);
    at[ch] = { x, y, width: cell, height: cell };
  });
  const lease = await game.textureFromCanvas(canvas);
  return { lease, at, cell };
}

export async function createMapView({ game, canvas = null, back, width, height, getState, on, atlas: given = null }) {
  const scope = game.scope;
  const world = game.stage.addChild(scope.use(new Sprite()));
  const hitLayer = world.addChild(scope.use(new Sprite()));
  const routeLayer = world.addChild(scope.use(new Sprite()));
  const armyLayer = world.addChild(scope.use(new Sprite()));
  const ringLayer = world.addChild(scope.use(new Sprite()));
  const fitZoom = Math.max(width / MAP.width, height / MAP.height);
  const camera = scope.use(createCamera2D({ world, width, height, bounds: { x: 0, y: 0, width: MAP.width, height: MAP.height }, minZoom: fitZoom, maxZoom: 2.6, center: { x: NODES.luoyang.x, y: NODES.luoyang.y }, zoom: Math.max(fitZoom, 0.55) }));

  // ——— The painted land ———
  const base = paintBase(1);
  // A half-size copy for when the map is far out: drawing from it costs a quarter as much, and looks the same there.
  const half = document.createElement('canvas');
  half.width = Math.round(base.width / 2);
  half.height = Math.round(base.height / 2);
  half.getContext('2d').drawImage(base, 0, 0, half.width, half.height);
  const lands = landOwnersGrid(base, 6);
  let landCanvas = null,
    ownersKey = '';
  function refreshLands(force = false) {
    const s = getState();
    if (!s) return;
    const key = Object.keys(s.nodes)
      .map((id) => s.nodes[id].owner ?? '-')
      .join(',');
    if (!force && key === ownersKey) return false;
    ownersKey = key;
    landCanvas = paintLands(
      lands,
      (id) => s.nodes[id].owner,
      (f) => rgb(s.factions[f].colour)
    );
    dirty = true;
    return true;
  }

  // ——— Tap and hover areas of the places ———
  const hits = {};
  for (const n of Object.values(NODES)) {
    const hit = hitLayer.addChild(scope.use(new Sprite()));
    hit.x = n.x;
    hit.y = n.y;
    const r = n.kind === 'city' ? 20 + NODES[n.id].size * 2 : 15;
    hit.hitArea = { x: -r, y: -r, width: r * 2, height: r * 2 };
    hit.touchEnabled = true;
    hit.on(game.pointer.events.tap, () => on.tapNode(n.id));
    if (game.hover) {
      hit.on(game.hover.events.enter, () => on.hover({ node: n.id }));
      hit.on(game.hover.events.leave, () => on.hover(null));
    }
    hits[n.id] = hit;
  }

  // ——— Armies ———
  const chars = given ? Object.keys(given.at) : [...new Set(['汉', '晋', '魏', '蜀', '吴', '吕', '叛', ...Object.values(getState()?.factions ?? {}).map((f) => f.flag)])];
  let atlas = given ?? (await bannerAtlas(game, chars));
  const armies = new Map();
  async function ensureChars(list) {
    const missing = list.filter((c) => !atlas.at[c]);
    if (!missing.length) return;
    chars.push(...missing);
    atlas = await bannerAtlas(game, chars);
    for (const [, view] of armies) view.flag.textureLease = atlas.lease;
  }
  function armyView(a, s) {
    const box = armyLayer.addChild(scope.use(new Sprite()));
    const banner = box.addChild(scope.use(new Sprite()));
    const flag = box.addChild(scope.use(new Bitmap(atlas.lease)));
    const bar = box.addChild(scope.use(new Sprite()));
    box.touchEnabled = true;
    box.hitArea = { x: -20, y: -46, width: 40, height: 50 };
    box.on(game.pointer.events.tap, () => on.tapArmy(a.id));
    if (game.hover) {
      box.on(game.hover.events.enter, () => on.hover({ army: a.id }));
      box.on(game.hover.events.leave, () => on.hover(null));
    }
    const view = { box, banner, flag, bar, key: '', x: 0, y: 0 };
    paintArmy(view, a, s);
    return view;
  }
  function paintArmy(view, a, s) {
    const f = s.factions[a.faction];
    const key = f.colour + f.flag + Math.round(a.troops / 500) + a.unit + (a.besieging ? 's' : '');
    if (view.key === key) return;
    view.key = key;
    const g = view.banner.graphics;
    g.clear();
    // A pole and a swallow-tailed banner in the power's colour.
    g.beginFill(0x3a2a1a).drawRect(-1.5, -44, 3, 46).endFill();
    g.beginFill(0x1e1810, 0.35).drawEllipse(-12, -2, 24, 7).endFill();
    g.beginFill(f.colour).drawRect(1, -44, 26, 30).endFill();
    g.beginFill(0x1e1810, 0.6).drawRect(1, -44, 26, 2).drawRect(1, -16, 26, 2).endFill();
    const cell = atlas.at[f.flag] ?? atlas.at['汉'];
    view.flag.sourceRect = cell;
    view.flag.scaleX = view.flag.scaleY = 22 / atlas.cell;
    view.flag.x = 3;
    view.flag.y = -42;
    // Troops: a bar under the banner, longer for more men.
    const b = view.bar.graphics;
    b.clear();
    const w = Math.min(40, 8 + a.troops / 1000);
    b.beginFill(0x1e1810, 0.75).drawRect(-w / 2 - 1, 3, w + 2, 6).endFill();
    b.beginFill(UNITS[a.unit].group === 'cav' ? 0xe8c060 : UNITS[a.unit].group === 'navy' ? 0x7fb0c8 : 0xe8e0c8).drawRect(-w / 2, 4, w, 4).endFill();
    if (a.besieging) b.beginFill(0xc0463a).drawRect(-w / 2, 9, w, 2).endFill();
  }
  function armyPlace(a, frac) {
    if (a.link) {
      const A = NODES[a.link.from],
        B = NODES[a.link.to];
      const t = Math.min(1, (a.link.done + frac * 30) / a.link.length);
      return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t };
    }
    const n = NODES[a.besieging ?? a.at];
    if (!n) return null;
    // Armies at one place stand a little apart.
    return { x: n.x + 16, y: n.y - 6 };
  }
  function syncArmies(s, frac) {
    const seen = new Set();
    // Banners keep a readable size on screen: larger in the world when the map is far out.
    const size = Math.min(2, Math.max(1, 1.05 / camera.snapshot().zoom));
    const stack = {};
    for (const a of Object.values(s.armies)) {
      seen.add(a.id);
      let v = armies.get(a.id);
      if (!v) armies.set(a.id, (v = armyView(a, s)));
      paintArmy(v, a, s);
      const p = armyPlace(a, frac);
      if (!p) continue;
      const k = a.link ? null : a.besieging ?? a.at;
      const n = k ? (stack[k] = (stack[k] ?? -1) + 1) : 0;
      const tx = p.x + n * 14 * size,
        ty = p.y;
      // Ease towards where the day puts it.
      v.x = v.x ? v.x + (tx - v.x) * 0.25 : tx;
      v.y = v.y ? v.y + (ty - v.y) * 0.25 : ty;
      v.box.x = v.x;
      v.box.y = v.y;
      v.box.scaleX = v.box.scaleY = size;
    }
    for (const [id, v] of armies)
      if (!seen.has(id)) {
        v.box.parent?.removeChild(v.box);
        armies.delete(id);
      }
  }

  // ——— Selection, routes, battles ———
  let selection = { node: null, army: null },
    route = null;
  function paintRings(s, time) {
    const g = ringLayer.graphics;
    g.clear();
    const pulse = 0.6 + Math.sin(time * 4) * 0.25;
    if (selection.node) {
      const n = NODES[selection.node];
      g.lineStyle(3, 0xf0d070, pulse).drawCircle(n.x, n.y, n.kind === 'city' ? 26 : 18);
    }
    if (selection.army && armies.has(selection.army)) {
      const v = armies.get(selection.army);
      g.lineStyle(3, 0xf0d070, pulse).drawCircle(v.x, v.y - 18, 30);
    }
    // Places under siege flash red.
    for (const a of Object.values(s.armies))
      if (a.besieging) {
        const n = NODES[a.besieging];
        g.lineStyle(2.5, 0xc0463a, 0.4 + Math.abs(Math.sin(time * 3)) * 0.5).drawCircle(n.x, n.y, 30);
      }
    g.lineStyle(0);
  }
  function paintRoute(s) {
    const g = routeLayer.graphics;
    g.clear();
    const lines = [];
    const a = selection.army && s.armies[selection.army];
    if (a && a.path.length) {
      const pts = [];
      const start = armies.get(a.id);
      if (start) pts.push({ x: start.x, y: start.y });
      for (const id of a.path) pts.push(NODES[id]);
      lines.push({ pts, colour: 0xf0d070 });
    }
    if (route) lines.push({ pts: route.map((id) => NODES[id]), colour: 0xffffff });
    for (const { pts, colour } of lines) {
      // Dashes along the way.
      for (let i = 0; i < pts.length - 1; i++) {
        const A = pts[i],
          B = pts[i + 1],
          len = Math.hypot(B.x - A.x, B.y - A.y);
        for (let d = 0; d < len; d += 18) {
          const t0 = d / len,
            t1 = Math.min(1, (d + 10) / len);
          g.lineStyle(4, colour, 0.85).moveTo(A.x + (B.x - A.x) * t0, A.y + (B.y - A.y) * t0).lineTo(A.x + (B.x - A.x) * t1, A.y + (B.y - A.y) * t1);
        }
      }
      const end = pts[pts.length - 1];
      g.lineStyle(0).beginFill(colour, 0.9).drawCircle(end.x, end.y, 7).endFill();
    }
  }

  // ——— The page canvas: land, borders, marks and names ———
  let dirty = true,
    lastView = '';
  const bg = back.getContext('2d');
  function screenRect() {
    return (canvas ?? game.canvas)?.getBoundingClientRect?.() ?? { left: 0, top: 0, width: back.clientWidth, height: back.clientHeight };
  }
  function paintBack(s) {
    const v = camera.snapshot();
    const r = screenRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = Math.round(back.clientWidth * dpr),
      H = Math.round(back.clientHeight * dpr);
    const key = `${v.center.x.toFixed(1)},${v.center.y.toFixed(1)},${v.zoom.toFixed(4)},${W},${H},${r.left},${r.width}`;
    if (!dirty && key === lastView) return;
    lastView = key;
    dirty = false;
    if (back.width !== W || back.height !== H) {
      back.width = W;
      back.height = H;
    }
    // Page pixels to world: the back canvas covers the frame; the engine canvas sits at r.
    const backRect = back.getBoundingClientRect();
    const toWorld = (px, py) => {
      const sx = ((px / dpr + backRect.left - r.left) * width) / r.width,
        sy = ((py / dpr + backRect.top - r.top) * height) / r.height;
      return camera.screenToWorld(sx, sy);
    };
    const a = toWorld(0, 0),
      b = toWorld(W, H);
    const k = W / (b.x - a.x);
    bg.setTransform(1, 0, 0, 1, 0, 0);
    bg.fillStyle = '#8eaba8';
    bg.fillRect(0, 0, W, H);
    bg.imageSmoothingEnabled = true;
    const k0 = W / (b.x - a.x);
    if (k0 < 0.6) bg.drawImage(half, a.x / 2, a.y / 2, (b.x - a.x) / 2, (b.y - a.y) / 2, 0, 0, W, H);
    else bg.drawImage(base, a.x, a.y, b.x - a.x, b.y - a.y, 0, 0, W, H);
    if (landCanvas) {
      const sx = landCanvas.width / MAP.width;
      bg.drawImage(landCanvas, a.x * sx, a.y * sx, (b.x - a.x) * sx, (b.y - a.y) * sx, 0, 0, W, H);
    }
    // Marks and names, at a steady size on screen.
    bg.setTransform(k, 0, 0, k, -a.x * k, -a.y * k);
    const unit = 1 / k;
    const zoomed = k / dpr;
    const en = getLanguage() === 'en';
    for (const n of Object.values(NODES)) {
      if (n.x < a.x - 80 || n.x > b.x + 80 || n.y < a.y - 80 || n.y > b.y + 80) continue;
      const node = s?.nodes[n.id],
        owner = node?.owner ? s.factions[node.owner] : null;
      const size = (n.kind === 'city' ? 8 + n.size * 1.6 : 7) * dpr * unit;
      if (n.kind === 'city') {
        // A walled square with battlements.
        bg.fillStyle = owner ? css(owner.colour, 0.95) : 'rgba(230,222,200,0.95)';
        bg.strokeStyle = '#2b241c';
        bg.lineWidth = 1.6 * dpr * unit;
        bg.fillRect(n.x - size, n.y - size, size * 2, size * 2);
        bg.strokeRect(n.x - size, n.y - size, size * 2, size * 2);
        bg.fillStyle = '#2b241c';
        for (let i = -1; i <= 1; i++) bg.fillRect(n.x + i * size * 0.66 - size * 0.18, n.y - size - size * 0.35, size * 0.36, size * 0.35);
        bg.fillStyle = owner ? '#fff8e8' : '#2b241c';
        bg.font = `700 ${size * 1.35}px ${KAI}`;
        bg.textAlign = 'center';
        bg.textBaseline = 'middle';
        if (owner) bg.fillText(owner.flag, n.x, n.y + size * 0.08);
      } else if (n.kind === 'pass') {
        bg.fillStyle = owner ? css(owner.colour, 0.95) : 'rgba(230,222,200,0.95)';
        bg.strokeStyle = '#2b241c';
        bg.lineWidth = 1.4 * dpr * unit;
        bg.beginPath();
        bg.moveTo(n.x - size, n.y + size * 0.7);
        bg.lineTo(n.x - size, n.y - size * 0.4);
        bg.lineTo(n.x, n.y - size);
        bg.lineTo(n.x + size, n.y - size * 0.4);
        bg.lineTo(n.x + size, n.y + size * 0.7);
        bg.closePath();
        bg.fill();
        bg.stroke();
        bg.fillStyle = '#2b241c';
        bg.fillRect(n.x - size * 0.3, n.y - size * 0.1, size * 0.6, size * 0.8);
      } else {
        // A ferry: a small boat.
        bg.fillStyle = owner ? css(owner.colour, 0.95) : 'rgba(230,222,200,0.95)';
        bg.strokeStyle = '#2b241c';
        bg.lineWidth = 1.3 * dpr * unit;
        bg.beginPath();
        bg.moveTo(n.x - size, n.y);
        bg.lineTo(n.x + size, n.y);
        bg.lineTo(n.x + size * 0.6, n.y + size * 0.6);
        bg.lineTo(n.x - size * 0.6, n.y + size * 0.6);
        bg.closePath();
        bg.fill();
        bg.stroke();
        bg.beginPath();
        bg.moveTo(n.x, n.y);
        bg.lineTo(n.x, n.y - size);
        bg.lineTo(n.x + size * 0.7, n.y - size * 0.2);
        bg.closePath();
        bg.fillStyle = '#efe6d2';
        bg.fill();
        bg.stroke();
      }
      // The name: cities always; passes and ferries once the map is near enough.
      if (n.kind !== 'city' && zoomed < 0.85) continue;
      if (zoomed < 0.5 && n.size < 3) continue;
      const fs = (n.kind === 'city' ? (en ? 12 : 14) + Math.min(4, n.size) : en ? 10 : 12) * dpr * unit;
      bg.font = `${n.kind === 'city' ? 700 : 500} ${fs}px ${SERIF}`;
      bg.textAlign = 'center';
      bg.textBaseline = 'top';
      const label = nm(n);
      bg.lineWidth = 3.5 * dpr * unit;
      bg.strokeStyle = 'rgba(240, 232, 210, 0.92)';
      bg.strokeText(label, n.x, n.y + size + 3 * dpr * unit);
      bg.fillStyle = '#2b241c';
      bg.fillText(label, n.x, n.y + size + 3 * dpr * unit);
    }
    // The names of the powers over their seats when the map is far out: the great ones first, and none over another.
    if (zoomed < 0.62 && s) {
      const placed = [];
      const big = Object.values(s.factions)
        .filter((f) => f.alive && s.nodes[f.capital]?.owner === f.id)
        .map((f) => ({ f, n: Object.values(s.nodes).filter((x) => x.owner === f.id).length }))
        .filter(({ n }) => n >= 3)
        .sort((a, b) => b.n - a.n);
      for (const { f, n } of big) {
        const at = NODES[f.capital];
        const fs = (15 + Math.min(9, n)) * dpr * unit;
        const name = factionName(s, f.id);
        bg.font = `700 ${fs}px ${KAI}`;
        const w = bg.measureText(name).width;
        const box = { x: at.x - w / 2, y: at.y - 18 * dpr * unit - fs, w, h: fs };
        if (placed.some((p) => box.x < p.x + p.w && p.x < box.x + box.w && box.y < p.y + p.h && p.y < box.y + box.h)) continue;
        placed.push(box);
        bg.textAlign = 'center';
        bg.textBaseline = 'bottom';
        bg.lineWidth = 4 * dpr * unit;
        bg.strokeStyle = 'rgba(30, 24, 16, 0.75)';
        bg.strokeText(name, at.x, at.y - 18 * dpr * unit);
        bg.fillStyle = css(f.colour, 1);
        bg.fillText(name, at.x, at.y - 18 * dpr * unit);
      }
    }
    bg.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ——— Moving the camera ———
  let zoomGoal = camera.snapshot().zoom;
  const zoomBy = (factor) => {
    zoomGoal = Math.min(2.6, Math.max(fitZoom, zoomGoal * factor));
    camera.zoomTo(zoomGoal, 0.25);
  };
  const panBy = (dx, dy) => {
    const v = camera.snapshot();
    camera.lookAt(v.center.x + dx / v.zoom, v.center.y + dy / v.zoom);
  };
  let time = 0,
    visible = true;
  return {
    camera,
    world,
    update(dt, frac) {
      time += dt;
      const s = getState();
      if (!s || !visible) return;
      camera.update(dt);
      refreshLands();
      syncArmies(s, frac);
      paintRings(s, time);
      paintRoute(s);
      paintBack(s);
    },
    redraw() {
      dirty = true;
    },
    refreshLands,
    ensureChars,
    select(sel) {
      selection = { node: null, army: null, ...sel };
      route = null;
    },
    showRoute(path) {
      route = path;
    },
    zoomBy,
    panBy,
    overview(zoom = null) {
      zoomGoal = Math.min(2.6, Math.max(fitZoom, zoom ?? fitZoom));
      camera.zoomTo(zoomGoal, 0.6);
      camera.panTo(MAP.width * 0.56, MAP.height * 0.42, 0.6);
    },
    focus(nodeId, zoom = null) {
      const n = NODES[nodeId];
      camera.panTo(n.x, n.y, 0.4);
      if (zoom) {
        zoomGoal = Math.min(2.6, Math.max(fitZoom, zoom));
        camera.zoomTo(zoomGoal, 0.4);
      }
    },
    /** The page position of a place, for placing notes beside it. */
    pagePoint(x, y) {
      const p = camera.worldToScreen(x, y),
        r = screenRect();
      return { x: r.left + (p.x * r.width) / width, y: r.top + (p.y * r.height) / height };
    },
    /** Show or hide the realm; while hidden the page canvas is left to the battlefield. */
    setVisible(on) {
      visible = on;
      world.visible = on;
      if (on) {
        dirty = true;
        lastView = '';
      }
    }
  };
}
