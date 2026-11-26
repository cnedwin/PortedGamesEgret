// 工地：搭桥和试通都在这一屏。网格上按住拖动搭杆件（键盘和手柄用光标），点「试通」后桥身和车队由 src/sim/run.mjs
// 一帧一帧地算，这里只把结果画出来：杆件挪到节点的位置、按受力染色，车按轮子的位置摆，断下来的木石跟着物理落水。
// The site: building and test crossings are both on this screen. Press and drag on the grid to lay a member (keys and
// gamepads use a cursor); on Test the frame and the carts are worked out frame by frame by src/sim/run.mjs, and this
// only draws the outcome: members moved to their nodes and washed by their load, carts set by their wheels, broken
// timber and stone falling into the water by the physics.
import { Sprite } from '@egret/engine';
import { createGestures } from '@egret/engine/web/gestures';
import { createBrowserHoverInput } from '@egret/engine/web/hover';
import { GRID, costOf, createHistory, fixedPoints, key, lengthOf, mirrored, pontoonAllowed, sameMember, whyNot } from '../sim/design.mjs';
import { levelById, LEVELS, CHAPTERS } from '../sim/levels.mjs';
import { MATERIALS, memberPrice } from '../sim/materials.mjs';
import { createRun } from '../sim/run.mjs';
import { VEHICLES } from '../sim/vehicles.mjs';
import { designOf, keepDesign, recordCrossing } from '../saves.mjs';
import { C, hitBox } from './kit.mjs';
import { lay, paintBoat, paintDebris, paintGrid, paintMember, paintPart, paintPier, paintPontoon, paintScenery, showStrain } from './paint.mjs';


/** Break text into lines of at most `width` stage units at `size`: Chinese by the character, English by the word. */
export function wrap(text, width, size) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '',
      w = 0;
    const tokens = para.match(/[⺀-鿿＀-￯　-〿]|[^\s⺀-鿿＀-￯　-〿]+\s*|\s+/g) ?? [''];
    for (const tok of tokens) {
      const tw = [...tok].reduce((s, ch) => s + (/[⺀-鿿＀-￯　-〿]/.test(ch) ? size : ch === ' ' ? size * 0.3 : size * 0.55), 0);
      const lead = /^[，。、；：？！）》」』”’,.;:?!)]/.test(tok);
      if (w + tw > width && line && !lead) {
        out.push(line.trimEnd());
        line = tok.trimStart();
        w = tw;
      } else {
        line += tok;
        w += tw;
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}

/** Lines of text one under another, from `wrap`. Returns the height used. */
export function lines(kit, parent, text, { x, y, width, size = 20, lineHeight = Math.round(size * 1.5), color = C.ink, align = 'left' }) {
  const rows = wrap(text, width, size);
  rows.forEach((row, i) => kit.text(parent, row, { x, y: y + i * lineHeight, size, color, align }));
  return rows.length * lineHeight;
}

export async function buildScreen(app, layer, levelId) {
  const { game, kit, sound } = app;
  const level = levelById(levelId);
  const W = game.width,
    H = game.height,
    tall = H > W;
  const say = (k, v) => app.say(k, v);
  const lang = app.lang();
  const TOP = tall ? 104 : 58;
  const bottomH = tall ? 292 : 132;
  const viewRect = { x: 0, y: TOP, w: W, h: H - TOP - bottomH - 30 };

  // ---- the drawing and its history ----
  const startDesign = app.params.get('ref') === '1' && level.reference ? level.reference : designOf(app.data(), level.id);
  const history = createHistory(startDesign);
  let material = level.materials[0],
    mode = 'draw',
    mirror = false,
    running = null,
    slow = false,
    result = null;

  // ---- the world: a container in metres, panned and zoomed ----
  const cam = new Sprite();
  layer.addChild(cam);
  const scenery = paintScenery(level);
  cam.addChild(scenery);
  const grid = paintGrid(level);
  cam.addChild(grid);
  const piersLayer = new Sprite(),
    membersLayer = new Sprite(),
    pontoonLayer = new Sprite(),
    cartsLayer = new Sprite(),
    debrisLayer = new Sprite(),
    overLayer = new Sprite();
  const boat = level.channel ? paintBoat() : null;
  if (boat) {
    boat.x = (level.channel.x0 + level.channel.x1) / 2;
    boat.y = level.water - 0.1;
    boat.alpha = 0.85;
    cam.addChild(boat);
  }
  for (const l of [piersLayer, pontoonLayer, membersLayer, cartsLayer, debrisLayer, overLayer]) cam.addChild(l);

  const bounds = {
    x0: -3,
    x1: level.span + 3,
    y0: Math.min(level.area.y0 * GRID + 3, ...level.towers.map((t) => t[1] - 1.2)) - 0.5,
    y1: level.bed + 0.3
  };
  let zoom = 1;
  const fit = () => {
    zoom = Math.min(70, viewRect.w / (bounds.x1 - bounds.x0), viewRect.h / (bounds.y1 - bounds.y0));
    cam.scaleX = cam.scaleY = zoom;
    cam.x = viewRect.x + (viewRect.w - (bounds.x1 - bounds.x0) * zoom) / 2 - bounds.x0 * zoom;
    cam.y = viewRect.y + (viewRect.h - (bounds.y1 - bounds.y0) * zoom) / 2 - bounds.y0 * zoom;
  };
  fit();
  const fitZoom = zoom;
  const zoomAt = (factor, sx, sy) => {
    const next = Math.max(fitZoom * 0.7, Math.min(fitZoom * 4, zoom * factor));
    const p = layer.globalToLocal(sx, sy);
    const mx = (p.x - cam.x) / zoom,
      my = (p.y - cam.y) / zoom;
    zoom = next;
    cam.scaleX = cam.scaleY = zoom;
    cam.x = p.x - mx * zoom;
    cam.y = p.y - my * zoom;
    game.invalidate?.();
  };
  /** Stage point to metres. */
  const toWorld = (sx, sy) => {
    const p = layer.globalToLocal(sx, sy);
    return { x: (p.x - cam.x) / zoom, y: (p.y - cam.y) / zoom };
  };
  const snap = (m) => ({ gx: Math.round(m.x / GRID), gy: Math.round(m.y / GRID) });
  const toStageOf = (mx, my) => cam.localToGlobal(mx, my);

  // ---- members drawn ----
  let memberSprites = [];
  const pierSprites = new Map();
  function drawDesign() {
    for (const s of memberSprites) game.remove(s);
    memberSprites = [];
    const d = history.design;
    for (const m of d.members) {
      const s = paintMember(m[4], lengthOf(m));
      lay(s, m[0] * GRID, m[1] * GRID, m[2] * GRID, m[3] * GRID);
      membersLayer.addChild(s);
      memberSprites.push(s);
    }
    while (pontoonLayer.numChildren) game.remove(pontoonLayer.getChildAt(0));
    for (const [gx, gy] of d.pontoons) {
      const p = paintPontoon();
      p.x = gx * GRID;
      p.y = gy * GRID;
      pontoonLayer.addChild(p);
    }
    for (const [i, s] of pierSprites) if (!d.piers.includes(i)) (game.remove(s), pierSprites.delete(i));
    for (const i of d.piers)
      if (!pierSprites.has(i)) {
        const p = level.piers[i];
        const s = paintPier(p.x * GRID, p.top * GRID, level.bed);
        piersLayer.addChild(s);
        pierSprites.set(i, s);
      }
    updateCost();
    game.invalidate?.();
  }

  // ---- the interface ----
  const ui = new Sprite();
  layer.addChild(ui);
  const bar = new Sprite();
  // The bars reach past the stage's sides, for a mini game whose screen is wider than the design.
  bar.graphics.beginFill(C.silk, 0.96).drawRect(-600, -600, W + 1200, TOP + 600).endFill();
  bar.graphics.lineStyle(1.5, C.inkSoft, 0.7).moveTo(0, TOP - 1).lineTo(W, TOP - 1);
  ui.addChild(bar);
  const chapter = CHAPTERS[level.chapter];
  const title = level.sandbox ? level.name[lang] : `${say('level', { id: level.id })} · ${level.name[lang]}`;
  kit.spoken(ui, title, { x: 20, y: tall ? 32 : TOP / 2, size: tall ? 22 : 24, baseline: 'middle', bold: true }, 'heading');
  const costText = kit.spoken(ui, '', { x: tall ? 20 : W / 2, y: tall ? 76 : TOP / 2, size: 20, baseline: 'middle', align: tall ? 'left' : 'center' }, 'status');
  const menuButton = kit.button(ui, say('menu'), { x: W - (tall ? 64 : 70), y: TOP / 2, w: tall ? 100 : 110, h: 40, size: 18 }, () => app.pauseMenu(screen));
  const helpButton = kit.button(ui, say('help'), { x: W - (tall ? 184 : 200), y: TOP / 2, w: tall ? 124 : 130, h: 40, size: 18 }, () => app.overlay('help'));

  const tray = new Sprite();
  tray.y = H - bottomH;
  tray.graphics.beginFill(C.silk, 0.97).drawRect(-600, 0, W + 1200, bottomH + 600).endFill();
  tray.graphics.lineStyle(1.5, C.inkSoft, 0.7).moveTo(0, 1).lineTo(W, 1);
  ui.addChild(tray);
  const info = kit.spoken(ui, '', { x: 20, y: H - bottomH - 16, size: 18, baseline: 'middle', color: C.inkSoft }, 'status');

  // Materials, in one row.
  const mats = level.materials;
  const mw = Math.min(150, (W - 40) / Math.max(mats.length, 5) - 8);
  const matButtons = mats.map((m, i) => {
    const b = kit.button(
      tray,
      `${say('m_' + m)} ${MATERIALS[m].price}`,
      { x: 20 + mw / 2 + i * (mw + 8), y: tall ? 52 : 34, w: mw, h: 48, size: tall ? 16 : 17, kind: 'quiet', name: say('material', { name: say('m_' + m), price: MATERIALS[m].price }) },
      () => pickMaterial(m)
    );
    b.material = m;
    return b;
  });
  // Tools, in the row below (or beside, when wide enough).
  const tools = [
    ['draw', say('draw'), () => setMode('draw')],
    ['erase', say('erase'), () => setMode('erase')],
    ...(level.pontoons ? [['pontoon', say('pontoon'), () => setMode('pontoon')]] : []),
    ...(level.piers.length ? [['pier', say('pier'), () => setMode('pier')]] : []),
    ['mirror', say('mirrorOff'), () => setMirror(!mirror)],
    ['undo', say('undo'), () => change(() => history.undo())],
    ['redo', say('redo'), () => change(() => history.redo())],
    ['clear', say('clear'), () => app.confirm(say('clearAsk'), () => change(() => history.change((d) => ((d.members = []), (d.pontoons = []), (d.piers = [])))))]
  ];
  const tw = tall ? Math.min(82, (W - 36) / tools.length - 4) : Math.min(120, (W - 40 - 180) / tools.length - 8);
  const toolButtons = new Map(
    tools.map(([id, words, fn], i) => [id, kit.button(tray, words, { x: (tall ? 18 : 20) + tw / 2 + i * (tw + (tall ? 4 : 8)), y: tall ? 146 : 92, w: tw, h: 44, size: tall ? (lang === 'zh' ? 17 : 13) : 17 }, fn)])
  );
  const testButton = kit.button(tray, say('test'), { x: tall ? W - 140 : W - 100, y: tall ? 240 : 92, w: tall ? 240 : 160, h: 50, size: 22, kind: 'primary' }, () => (running ? stopTest() : startTest()));
  const slowButton = kit.button(tray, say('slow'), { x: tall ? 140 : W - 100, y: tall ? 240 : 34, w: tall ? 240 : 160, h: 44, size: 18 }, () => {
    slow = !slow;
    slowButton.setOn(slow);
    slowButton.setText(slow ? say('fast') : say('slow'));
  });
  slowButton.visible = false;

  function pickMaterial(m) {
    material = m;
    for (const b of matButtons) b.setOn(b.material === m);
    if (mode !== 'draw') setMode('draw');
    say('d_' + m) && info.say(`${say('m_' + m)}：${say('d_' + m)}`);
  }
  function setMode(m) {
    mode = m;
    for (const [id, b] of toolButtons) if (['draw', 'erase', 'pontoon', 'pier'].includes(id)) b.setOn(id === m);
    start = null;
    clearGhost();
  }
  function setMirror(on) {
    mirror = on;
    const b = toolButtons.get('mirror');
    b.setOn(on);
    b.setText(on ? say('mirrorOn') : say('mirrorOff'));
  }
  function updateCost() {
    const cost = costOf(history.design);
    const over = Number.isFinite(level.budget) && cost > level.budget;
    costText.say(`${say(over ? 'costOver' : 'cost', { cost })}  ·  ${Number.isFinite(level.budget) ? say('budget', { budget: level.budget }) : say('noBudget')}`);
    costText.color = over ? C.cinnabar : C.ink;
    toolButtons.get('undo').setEnabled(history.canUndo);
    toolButtons.get('redo').setEnabled(history.canRedo);
  }
  function change(fn) {
    if (running) return false;
    const ok = fn();
    if (ok === false) return false;
    app.update((data) => keepDesign(data, level.id, history.design));
    drawDesign();
    return true;
  }

  // ---- laying and taking down ----
  let start = null,
    ghost = null;
  const cursor = new Sprite();
  overLayer.addChild(cursor);
  let cur = { gx: 0, gy: level.anchors[0][1] };
  cursor.visible = false;
  const drawCursor = () => {
    const g = cursor.graphics;
    g.clear();
    g.lineStyle(0.05, C.cinnabar, 1).moveTo(-0.35, 0).lineTo(0.35, 0).moveTo(0, -0.35).lineTo(0, 0.35);
    g.drawCircle(0, 0, 0.2);
    g.lineStyle(0, 0, 0);
    cursor.x = cur.gx * GRID;
    cursor.y = cur.gy * GRID;
  };
  const startMark = new Sprite();
  overLayer.addChild(startMark);
  function clearGhost() {
    if (ghost) game.remove(ghost);
    ghost = null;
    startMark.graphics.clear();
    game.invalidate?.();
  }
  function showGhost(a, b) {
    if (ghost) game.remove(ghost);
    ghost = null;
    startMark.graphics.clear();
    startMark.graphics.beginFill(C.cinnabar, 0.9).drawCircle(a.gx * GRID, a.gy * GRID, 0.14).endFill();
    if (!b || (a.gx === b.gx && a.gy === b.gy)) return game.invalidate?.();
    const why = whyNot(level, history.design, a.gx, a.gy, b.gx, b.gy, material);
    const m = [a.gx, a.gy, b.gx, b.gy, material];
    ghost = paintMember(material, Math.max(0.05, lengthOf(m)), { ghost: true, bad: !!why });
    lay(ghost, a.gx * GRID, a.gy * GRID, b.gx * GRID, b.gy * GRID);
    overLayer.addChild(ghost);
    info.say(why ? whySaid(why) : say('length', { len: lengthOf(m).toFixed(1), price: memberPrice(material, lengthOf(m)) }));
    game.invalidate?.();
  }
  const whySaid = (why) => say('why_' + why, { name: say('m_' + material), max: MATERIALS[material].maxLength });
  /** Lay a member from a to b, and its mirror when mirroring. */
  function layMember(a, b) {
    const why = whyNot(level, history.design, a.gx, a.gy, b.gx, b.gy, material);
    if (why) {
      sound.play('deny');
      info.say(whySaid(why));
      return false;
    }
    const ok = change(() =>
      history.change((d) => {
        d.members.push([a.gx, a.gy, b.gx, b.gy, material]);
        if (mirror) {
          const mid = (level.gap.x0 + level.gap.x1) / GRID;
          const n = [mid - a.gx, a.gy, mid - b.gx, b.gy];
          if (!whyNot(level, d, n[0], n[1], n[2], n[3], material)) d.members.push([...n, material]);
        }
      })
    );
    if (ok) sound.play('knock', { rate: 0.9 + Math.random() * 0.2 });
    return ok;
  }
  /** The member nearest a point (metres), within reach. */
  function memberAt(m, reach = 0.35) {
    let best = -1,
      bestD = reach;
    history.design.members.forEach((mem, i) => {
      const ax = mem[0] * GRID,
        ay = mem[1] * GRID,
        bx = mem[2] * GRID,
        by = mem[3] * GRID,
        dx = bx - ax,
        dy = by - ay,
        t = Math.max(0, Math.min(1, ((m.x - ax) * dx + (m.y - ay) * dy) / (dx * dx + dy * dy || 1))),
        d = Math.hypot(m.x - ax - dx * t, m.y - ay - dy * t);
      if (d < bestD) (bestD = d), (best = i);
    });
    return best;
  }
  function eraseAt(m) {
    const i = memberAt(m, 0.45);
    if (i < 0) return false;
    const mem = history.design.members[i];
    change(() =>
      history.change((d) => {
        d.members.splice(i, 1);
        if (mirror) {
          const mid = (level.gap.x0 + level.gap.x1) / GRID;
          const j = d.members.findIndex((o) => sameMember(o, mid - mem[0], mem[1], mid - mem[2], mem[3]));
          if (j >= 0) d.members.splice(j, 1);
        }
      })
    );
    sound.play('pull');
    return true;
  }
  function togglePontoon(p) {
    if (!pontoonAllowed(level, p.gx, p.gy)) {
      sound.play('deny');
      info.say(say('why_pontoon'));
      return;
    }
    change(() =>
      history.change((d) => {
        const i = d.pontoons.findIndex(([x, y]) => x === p.gx && y === p.gy);
        if (i >= 0) d.pontoons.splice(i, 1);
        else d.pontoons.push([p.gx, p.gy]);
      })
    );
    sound.play('knock', { rate: 0.7 });
  }
  function togglePier(m) {
    const i = level.piers.findIndex((p) => Math.abs(p.x * GRID - m.x) < 1 && m.y > p.top * GRID - 1);
    if (i < 0) return false;
    change(() =>
      history.change((d) => {
        const k = d.piers.indexOf(i);
        if (k >= 0) {
          // Members standing on the pier's top go with it.
          d.piers.splice(k, 1);
        } else d.piers.push(i);
      })
    );
    sound.play('knock', { rate: 0.6 });
    return true;
  }
  /** A tap at a stage point, in the current mode. */
  let rightAt = -1;
  function tapAt(sx, sy) {
    // The right button takes down; its press is no tap.
    if (running || result || game.time - rightAt < 0.4) return;
    const m = toWorld(sx, sy),
      p = snap(m);
    if (mode === 'erase') return void (eraseAt(m) || sound.play('deny'));
    if (mode === 'pontoon') return togglePontoon(p);
    if (mode === 'pier') return void (togglePier(m) || sound.play('deny'));
    // Two taps also lay a member: the first marks an end, the second lays it.
    if (!start) {
      start = p;
      showGhost(p, null);
    } else {
      layMember(start, p);
      start = null;
      clearGhost();
    }
  }

  // Pointer gestures over the world: drag lays a member (or pans from empty sky with two fingers), pinch zooms, a
  // long press takes down, a double tap fits the view again.
  const pad = new Sprite();
  hitBox(pad, 0, TOP, W, H - TOP - bottomH);
  pad.touchEnabled = true;
  layer.addChildAt(pad, 1);
  let dragging = null;
  const scope = game.engine.createScope();
  if (game.browser?.pointer)
    scope.use(
      createGestures({
        engine: game.engine,
        scope,
        input: game.browser.pointer,
        target: pad,
        onTap: (at) => tapAt(at.x, at.y),
        onDoubleTap: () => {
          fit();
          game.invalidate?.();
        },
        onHold: (at) => {
          if (running) return;
          eraseAt(toWorld(at.x, at.y));
        },
        onDrag: (d) => {
          if (running || result) return;
          if (d.phase === 'start') {
            const from = toWorld(d.x - d.totalX, d.y - d.totalY);
            const p = snap(from);
            const near = Math.hypot(p.gx * GRID - from.x, p.gy * GRID - from.y) < 0.45;
            dragging = mode === 'draw' && near && !panning ? { kind: 'lay', from: p } : { kind: 'pan' };
            start = null;
          }
          if (!dragging) return;
          if (dragging.kind === 'pan') {
            cam.x += d.dx;
            cam.y += d.dy;
            game.invalidate?.();
          } else showGhost(dragging.from, snap(toWorld(d.x, d.y)));
          if (d.phase === 'end') {
            if (dragging.kind === 'lay') {
              const to = snap(toWorld(d.x, d.y));
              if (to.gx !== dragging.from.gx || to.gy !== dragging.from.gy) layMember(dragging.from, to);
              clearGhost();
            }
            dragging = null;
          } else if (d.phase === 'cancel') {
            clearGhost();
            dragging = null;
          }
        },
        onPinch: (p) => {
          panning = p.phase !== 'end' && p.phase !== 'cancel';
          if (p.phase === 'start') pinchFrom = { zoom, x: p.x, y: p.y };
          else if (pinchFrom) {
            zoomAt((pinchFrom.zoom * p.scale) / zoom, p.x, p.y);
            cam.x += p.x - pinchFrom.x;
            cam.y += p.y - pinchFrom.y;
            pinchFrom.x = p.x;
            pinchFrom.y = p.y;
          }
        }
      })
    );
  let panning = false,
    pinchFrom = null;
  // A mouse: hovering shows a member's length and price; the wheel zooms where it points; the right button takes down.
  if (game.canvas?.addEventListener && !app.miniGame) {
    try {
      scope.use(
        createBrowserHoverInput({
          engine: game.engine,
          scope,
          canvas: game.canvas,
          width: game.width,
          height: game.height,
          size: () => ({ width: game.width, height: game.height }),
          onHover: (n) => {
            if (running || dragging || n.kind === 'leave') return;
            const m = toWorld(n.point.globalX, n.point.globalY),
              i = memberAt(m);
            hoverMember(i);
            if (mode === 'draw' && start) showGhost(start, snap(m));
          },
          onWheel: (n) => {
            zoomAt(n.point.deltaY < 0 ? 1.12 : 1 / 1.12, n.point.globalX, n.point.globalY);
            return true;
          }
        })
      );
    } catch (cause) {
      console.warn('hover', cause);
    }
    const contextMenu = (e) => e.preventDefault();
    const rightDown = (e) => {
      if (e.button !== 2 || running) return;
      rightAt = game.time;
      const r = game.canvas.getBoundingClientRect(),
        sx = ((e.clientX - r.left) / r.width) * game.width,
        sy = ((e.clientY - r.top) / r.height) * game.height;
      eraseAt(toWorld(sx, sy));
    };
    game.canvas.addEventListener('contextmenu', contextMenu);
    game.canvas.addEventListener('pointerdown', rightDown);
    scope.use({ dispose: () => (game.canvas.removeEventListener('contextmenu', contextMenu), game.canvas.removeEventListener('pointerdown', rightDown)) });
  }
  let hovered = -1;
  function hoverMember(i) {
    if (i === hovered) return;
    if (hovered >= 0 && memberSprites[hovered]) memberSprites[hovered].alpha = 1;
    hovered = i;
    if (i >= 0 && memberSprites[i]) {
      memberSprites[i].alpha = 0.7;
      const m = history.design.members[i];
      info.say(`${say('m_' + m[4])} · ${say('length', { len: lengthOf(m).toFixed(1), price: memberPrice(m[4], lengthOf(m)) })}`);
    }
    game.invalidate?.();
  }

  // ---- test crossings ----
  let partSprites = [],
    debrisSprites = new Map(),
    endAt = 0,
    frameDebt = 0,
    creakAt = 0;
  function startTest() {
    if (running || result) return;
    start = null;
    clearGhost();
    hoverMember(-1);
    running = createRun(level, history.design, { seed: app.seed, vehicles: level.sandbox ? app.sandboxVehicles() : level.vehicles });
    // Members follow the frame: the same sprites, in the frame's order (that of the drawing).
    for (const s of memberSprites) s.visible = true;
    partSprites = [];
    for (const cart of running.carts)
      for (const part of cart.parts) {
        const s = paintPart(part);
        cartsLayer.addChild(s);
        partSprites.push({ s, part });
      }
    testButton.setText(say('stop'));
    slowButton.visible = true;
    grid.visible = false;
    cursor.visible = false;
    for (const b of [...matButtons, ...toolButtons.values()]) b.setEnabled(false);
    info.say(say('crossing'));
    endAt = 0;
    app.sound.play('roll', { volume: 0.5 });
    game.invalidate?.();
  }
  function stopTest() {
    if (!running) return;
    running.dispose();
    running = null;
    for (const { s } of partSprites) game.remove(s);
    partSprites = [];
    for (const s of debrisSprites.values()) game.remove(s);
    debrisSprites.clear();
    testButton.setText(say('test'));
    slowButton.visible = false;
    grid.visible = true;
    for (const b of [...matButtons, ...toolButtons.values()]) b.setEnabled(true);
    updateCost();
    drawDesign();
    if (boat) boat.x = (level.channel.x0 + level.channel.x1) / 2;
    if (app.keyboardUsed) cursor.visible = true;
  }
  function stepTest(dt) {
    if (!running) return;
    // One crossing frame each 1/60 s of play (a quarter as many when slowed).
    frameDebt += Math.min(dt, 0.1) * 60 * (slow ? 0.25 : 1);
    let steps = 0;
    while (frameDebt >= 1 && steps < 3 && !running.outcome) {
      frameDebt -= 1;
      steps++;
      for (const e of running.step()) onEvent(e);
    }
    if (running.outcome && !endAt) endAt = game.time + 1.4;
    drawRun();
    if (endAt && game.time > endAt) finish();
  }
  function onEvent(e) {
    const p = toStageOf(e.x ?? 0, e.y ?? 0),
      w = game.world.globalToLocal(p.x, p.y);
    if (e.type === 'break') {
      sound.play('crack', { rate: 0.8 + Math.random() * 0.4 });
      if (!game.reducedMotion) {
        game.burst(w.x, w.y, { color: MATERIALS[e.material].colour, count: 14, speed: 120, life: 0.6, size: 3, gravity: 400 });
        game.shake(3, 0.2);
      }
    } else if (e.type === 'splash') {
      sound.play('splash', { volume: Math.min(1, 0.4 + e.size * 0.4) });
      if (!game.reducedMotion) game.burst(w.x, w.y, { color: 0xdde8e4, count: Math.round(8 + e.size * 10), speed: 90, life: 0.7, size: 3, gravity: 300 });
    } else if (e.type === 'arrive') sound.play('seal', { volume: 0.6 });
  }
  function drawRun() {
    const t = running.truss;
    t.members.forEach((m, i) => {
      const s = memberSprites[i];
      if (!s) return;
      if (m.broken) {
        s.visible = false;
        return;
      }
      const a = t.nodes[m.a],
        b = t.nodes[m.b];
      lay(s, a.x, a.y, b.x, b.y);
      showStrain(s, t.strain(m));
    });
    // Creaking when the frame works hard.
    const peak = running.peak();
    if (peak > 0.7 && game.time > creakAt) {
      creakAt = game.time + 1.2;
      sound.play(level.materials.includes('rope') || level.materials.includes('chain') ? 'thrum' : 'creak', { volume: Math.min(1, peak) * 0.7 });
    }
    // Pontoons follow their nodes.
    let k = 0;
    for (const n of t.nodes)
      if (n.pontoon) {
        const s = pontoonLayer.getChildAt(k++);
        if (s) (s.x = n.x), (s.y = n.y);
      }
    for (const { s, part } of partSprites) {
      const [front, rear] = part.wheels;
      if (front.state === 'removed') {
        s.visible = false;
        continue;
      }
      s.x = (front.x + rear.x) / 2;
      s.y = (front.y + rear.y) / 2;
      s.rotation = (Math.atan2(front.y - rear.y, front.x - rear.x) * 180) / Math.PI;
    }
    const alive = new Set();
    for (const d of running.debris) {
      alive.add(d);
      let s = debrisSprites.get(d);
      if (!s) {
        s = paintDebris(d.material, d.length, d.thick);
        debrisLayer.addChild(s);
        debrisSprites.set(d, s);
      }
      s.x = d.body.x;
      s.y = d.body.y;
      s.rotation = d.body.angle;
      s.alpha = Math.max(0, Math.min(1, 9 - d.life));
    }
    for (const [d, s] of debrisSprites)
      if (!alive.has(d)) {
        game.remove(s);
        debrisSprites.delete(d);
      }
    if (boat && running.time > 2 && running.time < 8) {
      boat.x = level.channel.x0 + ((running.time - 2) / 6) * (level.channel.x1 - level.channel.x0);
      boat.y = level.water - 0.1 + Math.sin(running.time * 2) * 0.05;
    }
    game.invalidate?.();
  }
  function finish() {
    const outcome = running.outcome;
    const cost = costOf(history.design);
    let fresh = {};
    if (!level.sandbox) app.update((data) => (fresh = recordCrossing(data, level, { won: outcome.won, cost, broken: outcome.broken ?? 0 })));
    sound.play(outcome.won ? 'won' : 'lost');
    result = app.showResult(screen, { level, outcome, cost, fresh });
    endAt = 0;
  }

  // ---- keys and gamepad ----
  const held = { left: 0, right: 0, up: 0, down: 0 };
  function moveCursor(dx, dy) {
    app.keyboardUsed = true;
    cursor.visible = true;
    const a = level.area;
    cur = { gx: Math.max(a.x0, Math.min(a.x1, cur.gx + dx)), gy: Math.max(a.y0, Math.min(a.y1, cur.gy + dy)) };
    drawCursor();
    info.say(say('cursor', { x: (cur.gx * GRID).toFixed(1), y: (-cur.gy * GRID).toFixed(1) }));
    if (start) showGhost(start, cur);
    game.invalidate?.();
  }
  const keyActions = {
    place() {
      if (running || result) return;
      app.keyboardUsed = true;
      cursor.visible = true;
      drawCursor();
      const m = { x: cur.gx * GRID, y: cur.gy * GRID };
      if (mode === 'erase') return void (eraseAt(m) || sound.play('deny'));
      if (mode === 'pontoon') return togglePontoon(cur);
      if (mode === 'pier') return void (togglePier(m) || sound.play('deny'));
      if (!start) {
        start = { ...cur };
        showGhost(start, null);
      } else {
        if (layMember(start, cur)) start = { ...cur };
        else start = null;
        if (start) showGhost(start, null);
        else clearGhost();
      }
    },
    erase() {
      if (!running) eraseAt({ x: cur.gx * GRID, y: cur.gy * GRID });
    },
    cancel() {
      if (start) {
        start = null;
        clearGhost();
        return true;
      }
      return false;
    },
    material(step) {
      const i = mats.indexOf(material);
      pickMaterial(mats[(i + step + mats.length) % mats.length]);
    }
  };
  function update(dt) {
    if (running) stepTest(dt);
    if (result || app.overlayOpen()) return;
    const k = game.keys;
    for (const [dir, [dx, dy]] of Object.entries({ left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] })) {
      const down = k.down(dir, 'pad:' + dir);
      if (!down) held[dir] = 0;
      else {
        if (held[dir] === 0 || held[dir] > 0.35) moveCursor(dx, dy);
        held[dir] += dt;
        if (held[dir] > 0.35) held[dir] -= 0.07;
      }
    }
    if (k.pressed('space', 'enter', 'pad:a')) keyActions.place();
    if (k.pressed('Delete', 'Backspace', 'x', 'pad:x')) keyActions.erase();
    if (k.pressed('t', 'pad:y')) running ? stopTest() : startTest();
    if (k.pressed('m')) setMirror(!mirror);
    if (k.pressed('z')) change(() => history.undo());
    if (k.pressed('y')) change(() => history.redo());
    if (k.pressed('pad:l1', 'q')) keyActions.material(-1);
    if (k.pressed('pad:r1', 'e')) keyActions.material(1);
    if (k.pressed('Equal', 'NumpadAdd')) zoomAt(1.2, W / 2, (TOP + H - bottomH) / 2);
    if (k.pressed('Minus', 'NumpadSubtract')) zoomAt(1 / 1.2, W / 2, (TOP + H - bottomH) / 2);
    for (let i = 0; i < mats.length; i++) if (k.pressed(`Digit${i + 1}`)) pickMaterial(mats[i]);
  }

  const screen = {
    name: 'build',
    level,
    update,
    focus: [...matButtons, ...toolButtons.values(), testButton, helpButton, menuButton].map((b) => b.focusRecord),
    focusStart: matButtons.length,
    back() {
      if (keyActions.cancel()) return;
      if (running) return stopTest();
      app.pauseMenu(screen);
    },
    get running() {
      return running;
    },
    get design() {
      return history.design;
    },
    /** Where a grid point is on the stage (global units): for the mini game walk. */
    stagePoint(gx, gy) {
      return toStageOf(gx * GRID, gy * GRID);
    },
    get testRecord() {
      return testButton.focusRecord;
    },
    /** Where a grid point is on the page, in CSS pixels: for the acceptance walk, which lays members with the mouse. */
    pagePoint(gx, gy) {
      const p = toStageOf(gx * GRID, gy * GRID),
        r = game.canvas.getBoundingClientRect();
      return { x: r.left + (p.x / game.width) * r.width, y: r.top + (p.y / game.height) * r.height };
    },
    startTest,
    stopTest,
    /** The result card closed: back to the drawing. */
    closeResult() {
      result = null;
      stopTest();
    },
    /** The same crossing again: it ends the same way, so it can be watched once more. */
    replay() {
      result = null;
      stopTest();
      startTest();
    },
    dispose() {
      running?.dispose();
      running = null;
      scope.dispose();
    }
  };
  pickMaterial(material);
  setMode('draw');
  setMirror(false);
  drawDesign();
  drawCursor();
  info.say(level.tip[lang]);
  if (!level.sandbox && !app.tipSeen.has(level.id) && !app.tipSeen.has('*')) {
    app.tipSeen.add(level.id);
    app.showTip(screen, level);
  }
  return screen;
}

/** Who crosses, by name, for a level's card. */
export const crossingList = (app, level) => level.vehicles.map((v) => app.say('v_' + v)).join('、');
export { LEVELS, VEHICLES, fixedPoints, key };
