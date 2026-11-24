// 天下：把舞台、地形、水、草木、道路、城池、兵和名牌合成一个画面，按局势每帧摆好军团（行军的沿路走，驻扎的站在城外，
// 围城的围在城墙下），处理拖动、滚轮、双指缩放、点选和悬停，画出所选、行军路线和交战中的城。
// The realm: the stage, land, water, trees, roads, places, troops and name plates as one picture. Each frame the armies
// are set out from the state of the game (marching ones along their road, waiting ones outside their town, besiegers
// under the walls); it handles dragging, the wheel, two-finger zoom, taps and hovering, and shows the choice, the line
// of a march and the places at war.
import { createFatLine3D, createRingGeometry3D, createStandardMaterial3D, linearColor3D, Mesh3D, projectToViewport3D } from '@egret/engine/world3d';
import { createScreenMarkers3D } from '@egret/engine/webgl2/world3d';
import { FACTIONS, LATER } from '../data/factions.mjs';
import { NODES, project } from '../data/map.mjs';
import { nm } from '../i18n.mjs';
import { hexAt, hexCenter } from '../sim/hexgrid.mjs';
import { FOOTPRINTS } from '../sim/land.mjs';
import { speedOf } from '../sim/military.mjs';
import { createPlaces } from './cities.mjs';
import { createFlora } from './flora.mjs';
import { createRoads, along, routeLine } from './routes.mjs';
import { createStage } from './stage.mjs';
import { createLand } from './terrain.mjs';
import { createTroops, figureOf, isSiegeFigure } from './troops.mjs';
import { createWaters } from './water.mjs';
import { createAmbient } from './ambient.mjs';
import { seasonOf } from './seasons.mjs';

export const FAR = 300;
const RELIEF_LABELS = [
  { zh: '四川盆地', en: 'Sichuan Basin', lon: 104.85, lat: 30.76 },
  { zh: '华北平原', en: 'North China Plain', lon: 115.2, lat: 35.15 },
  { zh: '关中平原', en: 'Guanzhong Plain', lon: 108.3, lat: 34.6 },
  { zh: '青藏高原东缘', en: 'Eastern Tibetan Plateau', lon: 99.45, lat: 35.65 },
  { zh: '西北荒漠', en: 'Northwest Desert', lon: 97.15, lat: 41 }
];

/** The colour of a power, as a number, or grey for nobody. */
export function factionColour(state, id) {
  return state?.factions[id]?.colour ?? FACTIONS[id]?.colour ?? LATER[id]?.colour ?? 0x8a8478;
}

/**
 * The 3D realm on `canvas`, with name plates in `plates`. `getState()` gives the game (or the realm of the title),
 * `plateFor` makes and refreshes the page elements of the plates, `on` hears taps and hovering, `tick(seconds)` runs
 * the game's own frame before the picture is drawn.
 */
export async function createRealmView({ canvas, plates, getState, plateFor, on, tick, quality, onError }) {
  const stage = await createStage(canvas, { quality, onError });
  const { app, scene, camera, rig } = stage;
  const flora = createFlora(scene, { quality: app.quality });
  const land = createLand(scene, { quality: app.quality, onTile: flora.onTile });
  let territoryVisible = false, territorySource = null, territoryDirty = false;
  function refreshTerritory() {
    if (!territoryVisible || !territoryDirty || !territorySource) return;
    land.setTerritory(territorySource);
    territoryDirty = false;
  }
  rig.setGround((x, z) => Math.max(0, land.heightAt(x, z)));
  const waters = createWaters(scene, { quality: app.quality });
  const ambient = createAmbient(scene, { quality: app.quality });
  const roads = createRoads(scene);
  const ownerColour = (id) => {
    const s = getState();
    const owner = s?.nodes[id]?.owner;
    return owner ? factionColour(s, owner) : null;
  };
  const places = createPlaces(scene, { quality: app.quality, colourOf: ownerColour });
  const troops = createTroops(scene, { quality: app.quality });
  const markers = createScreenMarkers3D({ container: plates, camera });
  let hudHeight = 0;
  const topbar = document.querySelector('#topbar');
  if (topbar) {
    new ResizeObserver(([entry]) => {
      hudHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
    }).observe(topbar);
  }
  const relief = RELIEF_LABELS.map(label => {
    const at = project(label.lon, label.lat);
    const element = document.createElement('span');
    element.className = 'reliefPlate';
    element.textContent = nm(label);
    const marker = markers.add(element, { target: [at.x, land.heightAt(at.x, at.y) + 2, at.y], maxDistance: 560 });
    return { label, element, marker };
  });

  // ——— Name plates ———
  const nodePlates = new Map(),
    armyPlates = new Map();
  for (const n of Object.values(NODES)) {
    const f = FOOTPRINTS[n.id];
    const element = plateFor.node(n.id);
    const marker = markers.add(element, { target: [f.x, (f.level ?? 0.5) + (n.kind === 'city' ? 2.6 : 2.2), f.z - f.halfZ * 0.4], maxDistance: 900 });
    nodePlates.set(n.id, { element, marker, kind: n.kind, size: n.size });
  }
  const armyAnchor = new Map();

  // ——— The choice, the march line ———
  const ringMaterial = createStandardMaterial3D({ color: 0xf3cf6a, emissive: 0xf3cf6a, emissiveIntensity: 1.6, roughness: 1, metallic: 0 });
  ringMaterial.depthWrite = false;
  let ringRadius = 1;
  const ring = new Mesh3D(createRingGeometry3D({ innerRadius: 0.82, outerRadius: 1, thetaSegments: 64 }), ringMaterial);
  ring.setRotation(-Math.PI / 2, 0, 0);
  ring.visible = false;
  ring.pickable = false;
  scene.addChild(ring);
  let routeLineMesh = null;
  // A mode laid over the realm (a battle): its own picking, hovering, hexes and which armies it hides.
  let mode = null;
  let selection = { node: null, army: null },
    route = null,
    routeKey = '';

  // ——— Armies ———
  const shown = new Map();
  const colourCache = new Map();
  const linear = (hex) => {
    let c = colourCache.get(hex);
    if (!c) colourCache.set(hex, (c = linearColor3D(hex)));
    return c;
  };
  /** Where an army stands now: on its road, by its town, or under the walls it besieges. */
  function armyGoal(s, a, frac, slot) {
    if (a.link) {
      const line = routeLine(a.link.from, a.link.to);
      const step = speedOf(s, a, a.link.kind) * frac;
      const p = along(line, Math.min(1, (a.link.done + step) / a.link.length));
      return { x: p.x, z: p.z, heading: p.heading, moving: true };
    }
    const at = a.besieging ?? a.at;
    const f = FOOTPRINTS[at];
    if (!f) return null;
    // Besiegers stand under the wall that faces their home; others wait outside the south gate.
    let dx = 0.3,
      dz = 1;
    const home = NODES[a.home] ?? null;
    if (a.besieging && home && home.id !== at) {
      dx = home.x - f.x;
      dz = home.y - f.z;
    }
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    const reach = Math.max(f.halfX * Math.abs(dx), f.halfZ * Math.abs(dz)) + (a.besieging ? 3.2 : 2.6);
    const side = (slot % 2 ? 1 : -1) * Math.ceil(slot / 2) * 3.2;
    return { x: f.x + dx * reach - dz * side, z: f.z + dz * reach + dx * side, heading: Math.atan2(-dx, -dz), moving: false };
  }
  function layArmies(s, frac, dt, time) {
    if (!s) return;
    const slots = {};
    const seen = new Set();
    const vx = rig.view.x,
      vz = rig.view.z,
      reach = Math.min(FAR * 1.4, rig.view.d * 2 + 90);
    for (const a of Object.values(s.armies)) {
      seen.add(a.id);
      if (mode?.hides(a)) {
        const anchor = armyAnchor.get(a.id);
        if (anchor) anchor.element.hidden = true;
        continue;
      }
      const key = a.link ? null : a.besieging ?? a.at;
      const slot = key ? (slots[key] = (slots[key] ?? -1) + 1) : 0;
      const goal = armyGoal(s, a, frac, slot);
      if (!goal) continue;
      let v = shown.get(a.id);
      if (!v) shown.set(a.id, (v = { x: goal.x, z: goal.z, heading: goal.heading }));
      const k = 1 - Math.exp(-dt * 6);
      v.x += (goal.x - v.x) * k;
      v.z += (goal.z - v.z) * k;
      let dh = goal.heading - v.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      v.heading += dh * k;
      v.moving = goal.moving;
      const y = Math.max(0, land.heightAt(v.x, v.z));
      v.y = y;
      // The plate rides above the standard.
      let anchor = armyAnchor.get(a.id);
      if (!anchor) {
        const element = plateFor.army(a.id);
        anchor = { element, target: [v.x, y + 2.3, v.z] };
        anchor.marker = markers.add(element, { target: anchor.target, maxDistance: 700 });
        armyAnchor.set(a.id, anchor);
      }
      anchor.element.hidden = false;
      anchor.target[0] = v.x;
      anchor.target[1] = y + 3.1;
      anchor.target[2] = v.z;
      anchor.marker.retarget(anchor.target);
      plateFor.army(a.id, anchor.element);
      if (Math.abs(v.x - vx) > reach || Math.abs(v.z - vz) > reach) continue;
      drawArmy(a, v, s, time);
    }
    for (const [id, anchor] of armyAnchor)
      if (!seen.has(id)) {
        anchor.marker.dispose();
        anchor.element.remove();
        armyAnchor.delete(id);
        shown.delete(id);
      }
  }
  function drawArmy(a, v, s, time) {
    const colour = linear(factionColour(s, a.faction));
    const kind = figureOf(a.unit);
    const engine = isSiegeFigure(kind);
    const n = engine ? 1 : Math.max(3, Math.min(12, Math.round(a.troops / 1100)));
    const cols = engine ? 1 : kind === 'boat' ? 2 : n > 9 ? 4 : 3;
    const S = 1.5;
    const gap = (kind === 'horse' || kind === 'horsebow' ? 0.5 : kind === 'boat' ? 1.1 : 0.36) * S;
    const sin = Math.sin(v.heading),
      cos = Math.cos(v.heading);
    for (let i = 0; i < n; i++) {
      const c = (i % cols) - (cols - 1) / 2,
        r = Math.floor(i / cols);
      const lx = c * gap + ((r % 2) * gap) / 3,
        lz = -r * gap * 1.1;
      const x = v.x + lx * cos + lz * sin,
        z = v.z - lx * sin + lz * cos;
      const bob = v.moving && !engine ? Math.abs(Math.sin(time * 7 + i * 1.3)) * 0.05 : 0;
      const y = kind === 'boat' ? v.y + 0.02 : Math.max(0, land.heightAt(x, z));
      troops.add(kind, x, y + bob, z, v.heading, colour, 0, S);
    }
    troops.add('standard', v.x - cos * 0.15, v.y, v.z + sin * 0.15 + 0.2, v.heading, colour, 0, S);
  }

  // ——— Input ———
  const size = () => canvas.getBoundingClientRect();
  const pointers = new Map();
  let pinch = null,
    hovered = null;
  const groundAt = (clientX, clientY) => {
    const r = size();
    return rig.groundOf(clientX - r.left, clientY - r.top, r.width, r.height, (x, z) => land.heightAt(x, z));
  };
  /** What lies under a point of the screen: an army, a place, or bare ground. */
  function pickAt(clientX, clientY) {
    const g = groundAt(clientX, clientY);
    if (!g) return null;
    if (mode) return { ...(mode.pick(g) ?? {}), ground: g, mode: true };
    let best = null,
      bestD = 2.2;
    for (const [id, v] of shown) {
      const d = Math.hypot(v.x - g.x, v.z - g.z);
      if (d < bestD) (bestD = d), (best = { army: id });
    }
    if (best) return { ...best, ground: g };
    for (const f of Object.values(FOOTPRINTS)) {
      if (Math.abs(g.x - f.x) <= f.halfX + 0.8 && Math.abs(g.z - f.z) <= f.halfZ + 0.8) return { node: f.id, ground: g };
    }
    return { ground: g };
  }
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) {
      const hit = pickAt(e.clientX, e.clientY);
      if (mode) {
        mode.hover(hit?.ground ?? null);
        hovered = hit;
        on.move?.(e, hit);
        return;
      }
      const was = hovered;
      hovered = hit;
      if ((was?.node ?? null) !== (hit?.node ?? null) || (was?.army ?? null) !== (hit?.army ?? null)) on.hover?.(hit?.node ? { node: hit.node } : hit?.army ? { army: hit.army } : null, e);
      on.move?.(e, hit);
      return;
    }
    if (pointers.size === 2 && pinch) {
      p.x = e.clientX;
      p.y = e.clientY;
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      view.zoomBy(d / pinch);
      pinch = d;
      return;
    }
    if (!p.moved && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 6) return;
    p.moved = true;
    mode?.release?.();
    const from = groundAt(p.x, p.y),
      to = groundAt(e.clientX, e.clientY);
    p.x = e.clientX;
    p.y = e.clientY;
    if (from && to) {
      rig.panBy(from.x - to.x, from.z - to.z);
      rig.snap();
    }
  });
  const up = (e) => {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (p && !p.moved && e.type === 'pointerup' && pointers.size === 0) {
      const hit = pickAt(e.clientX, e.clientY);
      if (hit?.mode) return mode?.tap(hit);
      if (hit?.army) on.tapArmy?.(hit.army, hit);
      else if (hit?.node) on.tapNode?.(hit.node, hit);
      else on.tapGround?.(hit);
    }
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => {
    if (hovered) on.hover?.(null);
    hovered = null;
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const g = groundAt(e.clientX, e.clientY);
      rig.zoomBy(e.deltaY > 0 ? 1 / 1.18 : 1.18, g);
    },
    { passive: false }
  );

  // ——— The frame ———
  let time = 0,
    frac = 0,
    visible = true,
    drift = null;
  let season = seasonOf(0), seasonDay = -1;
  let reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const extra = new Set();
  function frame(seconds) {
    const dt = Math.min(seconds, 0.1);
    time += dt;
    tick?.(dt);
    // On the title the view drifts slowly over the land.
    if (drift) {
      rig.view.tx += dt * drift.speed;
      rig.view.tz += Math.sin(time * 0.05) * dt * drift.speed * 0.3;
      if (rig.view.tx > drift.to) rig.view.tx = drift.from;
    }
    rig.update(dt);
    const s = getState();
    const day = Math.floor(s?.day ?? 0);
    if (day !== seasonDay) {
      seasonDay = day;
      season = seasonOf(day);
      land.setSeason(season);
      flora.setSeason(season);
      // The stage exposes its existing light/haze arrays; tint them without new lights or sky textures.
      if (stage.haze) {
        stage.haze[0] = 0.56 + season.winter * 0.1 + season.autumn * 0.06;
        stage.haze[1] = 0.62 + season.winter * 0.06 + season.autumn * 0.015;
        stage.haze[2] = 0.66 + season.winter * 0.06 - season.autumn * 0.04;
      }
      if (stage.sun) {
        stage.sun.color[0] = 1 - season.winter * 0.08;
        stage.sun.color[1] = 0.94 - season.autumn * 0.025;
        stage.sun.color[2] = 0.84 + season.winter * 0.12 - season.autumn * 0.07;
      }
    }
    const reach = Math.min(290, rig.view.d * 1.5 + 100);
    land.update(rig.view.x, rig.view.z, reach);
    const battleDetail = Boolean(mode);
    flora.update(rig.view, battleDetail);
    places.update(rig.view.x, rig.view.z, reach, rig.view.d, battleDetail);
    waters.update(dt, rig.view.d, battleDetail);
    roads.update(rig.view.d, battleDetail, rig.view);
    ambient.update(dt, rig.view, reducedMotion);
    troops.begin();
    layArmies(visible ? s : null, frac, dt, time);
    for (const fn of extra) fn(dt, time);
    troops.end();
    // The choice: a ring round the place or the army.
    let target = null;
    if (selection.node && FOOTPRINTS[selection.node]) {
      const f = FOOTPRINTS[selection.node];
      target = { x: f.x, z: f.z, r: Math.hypot(f.halfX, f.halfZ) + 0.8 };
    } else if (selection.army && shown.has(selection.army)) {
      const v = shown.get(selection.army);
      target = { x: v.x, z: v.z, r: 1.6 };
    }
    ring.visible = Boolean(target);
    if (target) {
      // A thin ring whatever its size: remade when the size changes.
      if (Math.abs(target.r - ringRadius) > 0.01) {
        ringRadius = target.r;
        ring.geometry = createRingGeometry3D({ innerRadius: Math.max(0.2, target.r - 0.22), outerRadius: target.r, thetaSegments: 72 });
      }
      ring.setPosition(target.x, Math.max(0, land.heightAt(target.x, target.z)) + 0.15, target.z);
      ringMaterial.emissiveIntensity = 0.7 + Math.sin(time * 4) * 0.3;
    }
    paintRoute();
    // Plates: the small ones give way when the view is far.
    const d = rig.view.d;
    const tint = 0.58 + Math.min(1, Math.max(0, (d - 48) / 120)) * 0.55;
    land.setTerritoryOpacity(territoryVisible && !mode ? tint : 0);
    const showRelief = visible && !mode && d >= 145;
    plates.classList.toggle('relief-labels', showRelief);
    for (const [id, p] of nodePlates) {
      const hide = !visible || (p.kind !== 'city' && d > 150) || (p.kind === 'city' && p.size <= 2 && d > 230);
      if (p.element.hidden !== hide) p.element.hidden = hide;
      if (!hide) plateFor.node(id, p.element);
    }
    plates.classList.toggle('far', d > 170);
    markers.update();
    if (showRelief) for (const { element, marker } of relief) {
      if (element.hidden) continue;
      // Reserve the full label height and a gap below the HUD. Only shift nearby labels.
      const drop = Math.max(0, Math.ceil(hudHeight + 36 - marker.point.y));
      if (drop > 56) element.hidden = true;
      else element.style.setProperty('--relief-drop', drop + 'px');
    }
    if (mode) {
      const m = mode.hexes();
      land.setHexes(m.hover, m.chosen, m.grid);
    } else {
      const hx = hovered?.ground ? hexAt(hovered.ground.x, hovered.ground.z) : null;
      const grid = 0.56 * Math.min(1, Math.max(0, (138 - d) / 64));
      land.setHexes(hx && d < 120 ? hexCenter(hx[0], hx[1]) : null, null, grid);
    }
  }
  function paintRoute() {
    const key = route ? route.join('>') : '';
    if (key === routeKey) return;
    routeKey = key;
    if (routeLineMesh) {
      scene.removeChild(routeLineMesh);
      routeLineMesh.dispose();
      routeLineMesh = null;
    }
    if (!route || route.length < 2) return;
    const pts = [];
    for (let i = 0; i < route.length - 1; i++) {
      const line = routeLine(route[i], route[i + 1]);
      for (let k = 0; k < 40; k++) {
        const p = along(line, k / 40);
        pts.push([p.x, Math.max(0, land.heightAt(p.x, p.z)) + 0.35, p.z]);
      }
    }
    const last = NODES[route[route.length - 1]];
    pts.push([last.x, Math.max(0, land.heightAt(last.x, last.y)) + 0.35, last.y]);
    routeLineMesh = createFatLine3D(pts, { width: 5, screenSpace: true, color: [1, 0.78, 0.3] });
    routeLineMesh.resolutionHeight = canvas.height;
    routeLineMesh.pickable = false;
    scene.addChild(routeLineMesh);
  }

  const view = {
    app,
    scene,
    camera,
    rig,
    land,
    troops,
    places,
    markers,
    stage,
    /** Decorative state, suitable for read-only acceptance probes. */
    get landscape() {
      return { season: { ...season }, ambient: { ...ambient.counts }, lod: { places: { ...places.stats }, flora: { ...flora.stats }, water: { ...waters.stats }, roads: { ...roads.stats } } };
    },
    setTerritorySource(source) {
      territorySource = source;
      territoryDirty = true;
      refreshTerritory();
    },
    setTerritoryVisible(value) {
      territoryVisible = Boolean(value);
      refreshTerritory();
    },
    setReducedMotion(value) {
      reducedMotion = Boolean(value);
    },
    /** Extra work each frame, such as a battle laid over the realm. */
    onFrame(fn) {
      extra.add(fn);
      return () => extra.delete(fn);
    },
    start() {
      app.show(scene, camera, { onUpdate: frame });
    },
    /** How far into the next day the realm is (0..1), for armies between days. */
    setDayShare(v) {
      frac = v;
    },
    select(sel) {
      selection = { node: null, army: null, ...sel };
    },
    showRoute(path) {
      route = path;
    },
    refreshLands() {
      places.recolour();
    },
    redraw() {
      for (const { label, element } of relief) element.textContent = nm(label);
      for (const [id, p] of nodePlates) plateFor.node(id, p.element, true);
      for (const [id, a] of armyAnchor) plateFor.army(id, a.element, true);
    },
    zoomBy(factor) {
      rig.zoomBy(factor);
    },
    /** Pan by a distance in screen pixels. */
    panBy(dx, dy) {
      const k = (2 * rig.view.d * Math.tan((camera.fov * Math.PI) / 360)) / size().height;
      rig.panBy(dx * k, dy * k * 1.3);
    },
    overview() {
      rig.glideTo(2050, 1080, FAR, 1.6);
    },
    focus(nodeId, d = null) {
      const n = NODES[nodeId];
      rig.glideTo(n.x, n.y, d ?? rig.view.td, 0.9);
    },
    jumpTo(nodeId, d) {
      const n = NODES[nodeId];
      rig.jumpTo(n.x, n.y, d);
    },
    /** The page position of a map point (its ground), for tests and notes beside it. */
    pagePoint(x, z, lift = 0.6) {
      camera.updateViewMatrices?.();
      const r = size();
      const p = projectToViewport3D(camera, [x, Math.max(0, land.heightAt(x, z)) + lift, z], r.width, r.height);
      return { x: r.left + p.x, y: r.top + p.y };
    },
    setVisible(on) {
      visible = on;
    },
    /** A slow drift of the view from x `from` to `to` (map units), or null to stop. */
    setDrift(d) {
      drift = d;
    },
    /** Lay a mode over the realm (a battle), or take it away with null. */
    setMode(m) {
      mode = m;
    },
    canvasRect: () => size(),
    /** Whether the land round a point has come in. */
    ready(x, z) {
      return land.ready(x, z, 40);
    }
  };
  return view;
}
