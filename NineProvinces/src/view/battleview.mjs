// 战场的画面：底下网页画布画六角格的地形（平原、草地、树林、山、江、城墙、城门、城内、营寨、战船），上面引擎画布画
// 部队——每支一面写着主将姓氏的旗，旗下是兵力、士气和怒气；选中的部队有光圈和射程格，被打时闪一下，混乱、恐惧、
// 定身有标记；着火的格子由引擎的粒子发射器冒火和烟，战法放出时迸出火星。相机可拖动和缩放。
// The view of the battle: the page canvas beneath paints the ground of each hex (plain, grass, woods, hills, river,
// wall, gate, town, camp, ships), and the engine canvas above draws the units — each a banner bearing its general's
// surname, with troops, morale and rage beneath; the chosen unit has a ring and its reach marked, a unit hit flashes,
// confusion, fear and stuns are marked; burning hexes smoke and flame from the engine's particle emitters, and a tactic
// throws sparks. The camera drags and zooms.
import { Bitmap, Sprite } from '@egret/engine';
import { createCamera2D } from '@egret/engine/camera';
import { createParticleEmitter } from '@egret/engine/particles';
import { TERRAIN, UNITS } from '../data/battle.mjs';
import { GENERALS } from '../data/generals.mjs';
import { colOf, distance, FIELD, rowOf } from '../sim/battle.mjs';
import { surname } from '../sim/core.mjs';
import { KAI } from './mapart.mjs';

export const R = 34;
const HW = Math.sqrt(3) * R;
export const hexCentre = (i) => ({ x: HW * (colOf(i) + 0.5 + (rowOf(i) & 1 ? 0.5 : 0)), y: R + rowOf(i) * R * 1.5 });
export const FIELD_SIZE = { width: Math.ceil(HW * (FIELD.cols + 0.5)), height: Math.ceil(R * 1.5 * (FIELD.rows - 1) + R * 2) };

/** The hex at a point of the field (nearest centre). */
export function hexAt(x, y) {
  let best = -1,
    bd = Infinity;
  const r0 = Math.max(0, Math.floor((y - R) / (R * 1.5)) - 1);
  for (let r = r0; r < Math.min(FIELD.rows, r0 + 3); r++)
    for (let c = 0; c < FIELD.cols; c++) {
      const i = r * FIELD.cols + c,
        p = hexCentre(i);
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bd) (bd = d), (best = i);
    }
  return bd < R * R * 1.2 ? best : -1;
}

function hexPath(g, x, y, r) {
  g.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k + Math.PI / 6;
    const px = x + r * Math.cos(a),
      py = y + r * Math.sin(a);
    if (k) g.lineTo(px, py);
    else g.moveTo(px, py);
  }
  g.closePath();
}

const hexColour = (c) => '#' + c.toString(16).padStart(6, '0');

/** Paint the ground of the battle on a canvas of the field's size (twice, for sharpness). */
export function paintField(b) {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = FIELD_SIZE.width * scale;
  canvas.height = FIELD_SIZE.height * scale;
  const g = canvas.getContext('2d');
  g.scale(scale, scale);
  g.fillStyle = b.night ? '#3a3a40' : '#cbbd94';
  g.fillRect(0, 0, FIELD_SIZE.width, FIELD_SIZE.height);
  let seed = b.setup.seed;
  const r = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  b.tiles.forEach((tile, i) => {
    const { x, y } = hexCentre(i);
    const t = TERRAIN[tile];
    hexPath(g, x, y, R);
    g.fillStyle = hexColour(t.colour);
    g.fill();
    g.strokeStyle = 'rgba(40, 32, 20, 0.22)';
    g.lineWidth = 1;
    g.stroke();
    if (tile === 'forest')
      for (let k = 0; k < 5; k++) {
        const tx = x + (r() - 0.5) * R * 1.2,
          ty = y + (r() - 0.5) * R * 1.1;
        g.fillStyle = 'rgba(40, 70, 40, 0.75)';
        g.beginPath();
        g.moveTo(tx, ty - 10);
        g.lineTo(tx + 7, ty + 5);
        g.lineTo(tx - 7, ty + 5);
        g.closePath();
        g.fill();
        g.fillStyle = '#4a3420';
        g.fillRect(tx - 1, ty + 5, 2, 4);
      }
    if (tile === 'hill' || tile === 'mountain') {
      const h = tile === 'mountain' ? 22 : 13;
      g.fillStyle = 'rgba(110, 90, 60, 0.6)';
      g.beginPath();
      g.moveTo(x - h, y + 8);
      g.quadraticCurveTo(x - h * 0.3, y - h, x, y - h * 0.9);
      g.quadraticCurveTo(x + h * 0.4, y - h * 0.8, x + h, y + 8);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(50, 40, 26, 0.75)';
      g.stroke();
    }
    if (tile === 'water' || tile === 'river' || tile === 'ship') {
      g.strokeStyle = 'rgba(235, 245, 240, 0.4)';
      g.lineWidth = 1.2;
      for (let k = -1; k <= 1; k++) {
        g.beginPath();
        g.arc(x + k * 10, y + k * 5, 6, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
      }
    }
    if (tile === 'ship') {
      g.fillStyle = '#6a4a2c';
      g.fillRect(x - 18, y - 6, 36, 12);
      g.fillStyle = '#d8ccb0';
      g.fillRect(x - 2, y - 20, 4, 14);
      g.fillRect(x + 2, y - 18, 10, 10);
      g.strokeStyle = '#2b241c';
      g.strokeRect(x - 18, y - 6, 36, 12);
    }
    if (tile === 'wall') {
      g.fillStyle = '#7c7266';
      hexPath(g, x, y, R - 3);
      g.fill();
      g.fillStyle = '#5a5248';
      for (let k = -2; k <= 2; k++) g.fillRect(x + k * 9 - 3, y - R + 6, 6, 7);
      g.strokeStyle = 'rgba(30, 24, 16, 0.5)';
      for (let k = -1; k <= 1; k++) {
        g.beginPath();
        g.moveTo(x - R + 6, y + k * 9);
        g.lineTo(x + R - 6, y + k * 9);
        g.stroke();
      }
    }
    if (tile === 'gate') {
      g.fillStyle = '#5c3e26';
      g.fillRect(x - 14, y - 18, 28, 34);
      g.strokeStyle = '#c9a646';
      g.lineWidth = 2;
      g.strokeRect(x - 14, y - 18, 28, 34);
      g.beginPath();
      g.moveTo(x, y - 18);
      g.lineTo(x, y + 16);
      g.stroke();
    }
    if (tile === 'town') {
      g.fillStyle = 'rgba(120, 90, 60, 0.6)';
      g.fillRect(x - 9, y - 4, 18, 12);
      g.fillStyle = 'rgba(60, 40, 28, 0.8)';
      g.beginPath();
      g.moveTo(x - 12, y - 4);
      g.lineTo(x, y - 13);
      g.lineTo(x + 12, y - 4);
      g.closePath();
      g.fill();
    }
    if (tile === 'camp') {
      g.strokeStyle = '#6a4a2c';
      g.lineWidth = 2;
      for (let k = -2; k <= 2; k++) {
        g.beginPath();
        g.moveTo(x + k * 7, y + 14);
        g.lineTo(x + k * 7, y - 10);
        g.stroke();
      }
      g.fillStyle = '#d8b65c';
      g.beginPath();
      g.arc(x, y, 8, 0, Math.PI * 2);
      g.fill();
    }
    if (tile === 'road') {
      g.fillStyle = 'rgba(160, 130, 90, 0.35)';
      g.fillRect(x - R * 0.9, y - 5, R * 1.8, 10);
    }
  });
  // The keep of a town.
  if (b.keep !== null) {
    const { x, y } = hexCentre(b.keep);
    g.fillStyle = '#8a3a2a';
    g.fillRect(x - 16, y - 12, 32, 22);
    g.fillStyle = '#2b241c';
    g.beginPath();
    g.moveTo(x - 22, y - 12);
    g.lineTo(x, y - 28);
    g.lineTo(x + 22, y - 12);
    g.closePath();
    g.fill();
  }
  return canvas;
}

/** A dot texture for the particles: soft white. */
function dotCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return c;
}

/** A soft white dot, for every particle. */
export const dotTexture = (game) => game.textureFromCanvas(dotCanvas());

export function createBattleView({ game, canvas, back, width, height, battle, colours, atlas, dot, on }) {
  // The battle's own scope: everything it makes goes when the battle is over.
  const scope = game.engine.createScope();
  const world = game.stage.addChild(scope.use(new Sprite()));
  const field = world.addChild(scope.use(new Sprite()));
  const markLayer = world.addChild(scope.use(new Sprite()));
  const fireLayer = world.addChild(scope.use(new Sprite()));
  const unitLayer = world.addChild(scope.use(new Sprite()));
  const fxLayer = world.addChild(scope.use(new Sprite()));
  field.hitArea = { x: -200, y: -200, width: FIELD_SIZE.width + 400, height: FIELD_SIZE.height + 400 };
  field.touchEnabled = true;
  field.on(game.pointer.events.tap, (event) => {
    const p = field.globalToLocal(event.payload.globalX, event.payload.globalY);
    on.tapHex(hexAt(p.x, p.y));
  });
  // The whole field in view below the top bar (about 64 units of it), with room to pan when zoomed in; `frame` fits it
  // again between the interface's columns once they are drawn.
  let fit = Math.min(width / (FIELD_SIZE.width + 40), (height - 70) / (FIELD_SIZE.height + 20));
  const camera = scope.use(createCamera2D({ world, width, height, bounds: { x: -FIELD_SIZE.width, y: -FIELD_SIZE.height, width: FIELD_SIZE.width * 3, height: FIELD_SIZE.height * 3 }, minZoom: 0.2, maxZoom: 2.4, zoom: fit, center: { x: FIELD_SIZE.width / 2, y: FIELD_SIZE.height / 2 - 32 / fit } }));

  // Banners: the surname of each unit's general, from the shared atlas of characters.
  const names = battle.units.map((u) => (u.general ? surname(u.general) : '兵'));
  const views = battle.units.map((u, i) => {
    const box = unitLayer.addChild(scope.use(new Sprite()));
    const badge = box.addChild(scope.use(new Sprite()));
    const flag = box.addChild(scope.use(new Bitmap(atlas.lease)));
    flag.sourceRect = atlas.at[names[i]] ?? atlas.at['兵'];
    flag.scaleX = flag.scaleY = 26 / atlas.cell;
    flag.x = -13;
    flag.y = -39;
    const bars = box.addChild(scope.use(new Sprite()));
    box.touchEnabled = true;
    box.hitArea = { x: -R * 0.8, y: -R * 0.8, width: R * 1.6, height: R * 1.6 };
    box.on(game.pointer.events.tap, () => on.tapUnit(i));
    if (game.hover) {
      box.on(game.hover.events.enter, () => on.hover(i));
      box.on(game.hover.events.leave, () => on.hover(null));
    }
    const p = hexCentre(Math.max(0, u.pos));
    box.x = p.x;
    box.y = p.y;
    return { box, badge, bars, flag, shown: '', troops: u.troops, flash: 0 };
  });

  // Fire and sparks, from the engine's particle emitters.
  const flames = new Map();
  function flameAt(h) {
    const p = hexCentre(h);
    const e = scope.use(createParticleEmitter({ texture: dot, rate: 26, lifetime: [0.4, 0.9], speed: [20, 50], angle: [250, 290], gravity: { x: 0, y: -30 }, size: 18, endScale: 0.3, startColor: 0xffc040, endColor: 0xc0301a, endAlpha: 0, blendMode: 'add', shape: { kind: 'circle', radius: R * 0.6 }, seed: h + 1, maxParticles: 64 }));
    fireLayer.addChild(e.display);
    e.x = p.x;
    e.y = p.y + 8;
    return e;
  }
  const sparks = scope.use(createParticleEmitter({ texture: dot, rate: 0, running: false, lifetime: [0.3, 0.8], speed: [60, 180], size: 10, endScale: 0.2, startColor: 0xfff0a0, endColor: 0xff6020, endAlpha: 0, blendMode: 'add', maxParticles: 400 }));
  fxLayer.addChild(sparks.display);
  const dust = scope.use(createParticleEmitter({ texture: dot, rate: 0, running: false, lifetime: [0.4, 1], speed: [10, 40], size: 22, endScale: 1.6, startColor: 0xd8c8a0, endColor: 0x8a7a5a, startAlpha: 0.5, endAlpha: 0, maxParticles: 300 }));
  fxLayer.addChild(dust.display);

  let selected = null;
  let ground = paintField(battle),
    groundKey = battle.tiles.join(',');
  const bg = back.getContext('2d');
  let seenEvents = 0;

  // Where the soldiers of a unit stand round its banner: up to nine figures, front rank first.
  const SLOTS = [
    [-8, 8],
    [8, 8],
    [-20, 2],
    [20, 2],
    [0, 16],
    [-14, 17],
    [14, 17],
    [-26, 12],
    [26, 12]
  ];
  function soldier(g, x, y, group, face, colour, dark) {
    const skin = 0xe8c8a0;
    if (group === 'cav') {
      // A horse and rider.
      g.beginFill(0x5a3e28).drawEllipse(x - 7, y - 3, 14, 7).endFill();
      g.beginFill(0x5a3e28).drawRect(x + face * 5 - 1.5, y - 7, 3, 5).endFill();
      g.beginFill(colour).drawRect(x - 2, y - 10, 4, 6).endFill();
      g.beginFill(skin).drawCircle(x, y - 12, 2).endFill();
      g.lineStyle(1.2, dark, 1).moveTo(x, y - 10).lineTo(x + face * 9, y - 16).lineStyle(0);
    } else if (group === 'siege') {
      g.beginFill(0x6a4a2c).drawRect(x - 7, y - 6, 14, 8).endFill();
      g.beginFill(0x2a1e12).drawCircle(x - 4, y + 3, 2.2).drawCircle(x + 4, y + 3, 2.2).endFill();
      g.lineStyle(1.5, 0x3a2a1a, 1).moveTo(x - 5, y - 6).lineTo(x + face * 7, y - 12).lineStyle(0);
    } else if (group === 'navy') {
      g.beginFill(0x6a4a2c).drawRect(x - 8, y - 2, 16, 5).endFill();
      g.beginFill(0xe8dcc0).drawRect(x - 1, y - 11, 6, 8).endFill();
      g.beginFill(colour).drawRect(x - 1, y - 12, 1.5, 10).endFill();
    } else {
      g.beginFill(colour).drawRect(x - 2.5, y - 7, 5, 8).endFill();
      g.beginFill(dark).drawRect(x - 2.5, y + 1, 2, 3).drawRect(x + 0.5, y + 1, 2, 3).endFill();
      g.beginFill(skin).drawCircle(x, y - 9.5, 2.3).endFill();
      if (group === 'bow') g.lineStyle(1.2, 0x3a2a1a, 1).drawArc(x + face * 3, y - 5, 5, face > 0 ? -1.3 : Math.PI - 1.3, face > 0 ? 1.3 : Math.PI + 1.3).lineStyle(0);
      else g.lineStyle(1.2, 0x3a2a1a, 1).moveTo(x + face * 3, y + 2).lineTo(x + face * 7, y - 15).lineStyle(0);
    }
  }
  function paintUnit(v, u) {
    const side = u.side;
    const colour = colours[side];
    const figures = u.troops > 0 ? Math.max(1, Math.min(9, Math.ceil(u.troops / 700))) : 0;
    const key = [figures, u.routed, side, u.onWall, Math.round((u.troops / u.start) * 20), Math.round(u.morale / 5), Math.floor(u.rage / 10), Object.keys(u.status).join(), selected === u.id, v.flash > 0].join('|');
    if (key === v.shown) return;
    v.shown = key;
    const g = v.badge.graphics;
    g.clear();
    const group = UNITS[u.kind].group;
    const naval = u.afloat && group !== 'navy';
    const face = side === 0 ? 1 : -1;
    const tint = v.flash > 0 ? 0xfff4da : u.routed ? 0x8a8276 : colour;
    const dark = 0x2a1e12;
    // The ground the unit stands on: a soft disc of its side's colour, gold when chosen.
    if (selected === u.id) g.lineStyle(3, 0xf0d070, 1).drawEllipse(-R * 0.9, -R * 0.35, R * 1.8, R * 1.05).lineStyle(0);
    g.beginFill(colour, 0.28).drawEllipse(-R * 0.8, -R * 0.12, R * 1.6, R * 0.8).endFill();
    if (naval) g.beginFill(0x5a3e24).drawRect(-28, 10, 56, 9).endFill();
    // The banner on its pole, behind the ranks.
    g.beginFill(dark).drawRect(-1.5, -40, 3, 44).endFill();
    g.beginFill(tint).drawRect(-15, -40, 30, 28).endFill();
    g.beginFill(dark, 0.7).drawRect(-15, -40, 30, 2).drawRect(-15, -14, 30, 2).endFill();
    // The ranks: one figure for every seven hundred men, up to nine.
    for (let k = 0; k < figures; k++) soldier(g, SLOTS[k][0], SLOTS[k][1], group, u.routed ? -face : face, tint, dark);
    v.flag.alpha = u.routed ? 0.55 : 1;
    const b = v.bars.graphics;
    b.clear();
    const share = Math.max(0, u.troops / u.start);
    b.beginFill(0x1e1810, 0.8).drawRect(-21, 22, 42, 10).endFill();
    b.beginFill(share > 0.5 ? 0x8fd06a : share > 0.25 ? 0xe8c060 : 0xe05a40).drawRect(-20, 23, 40 * share, 3).endFill();
    b.beginFill(0x7fb0e0).drawRect(-20, 27, 40 * Math.max(0, u.morale / 100), 2).endFill();
    b.beginFill(u.rage >= 100 ? 0xff7040 : 0xc0503a).drawRect(-20, 29.5, 40 * Math.min(1, u.rage / 100), 2).endFill();
    // Marks for confusion, fear and stuns.
    const marks = Object.keys(u.status);
    marks.forEach((m, k) => b.beginFill({ confuse: 0xb070e0, fear: 0x5070c0, stun: 0xf0e070 }[m] ?? 0xffffff).drawCircle(20 - k * 8, -44, 3.5).endFill());
  }

  function paintMarks() {
    const g = markLayer.graphics;
    g.clear();
    const u = selected !== null ? battle.units[selected] : null;
    if (!u || u.gone) return;
    const reach = UNITS[u.kind].range;
    for (let i = 0; i < battle.tiles.length; i++) {
      if (distance(i, u.pos) > reach) continue;
      const p = hexCentre(i);
      g.beginFill(0xf0d070, 0.16).drawCircle(p.x, p.y, R * 0.7).endFill();
    }
    if (u.goal !== null && u.goal !== undefined) {
      const p = hexCentre(u.goal);
      g.lineStyle(3, 0xffffff, 0.8).drawCircle(p.x, p.y, R * 0.5).lineStyle(0);
    }
    if (u.target && !u.target.gone) {
      const p = hexCentre(u.target.pos);
      g.lineStyle(3, 0xe05a40, 0.9).drawCircle(p.x, p.y, R * 0.75).lineStyle(0);
    }
  }

  function paintBack() {
    const key = battle.tiles.join(',');
    if (key !== groundKey) {
      ground = paintField(battle);
      groundKey = key;
    }
    const r = canvas.getBoundingClientRect(),
      backRect = back.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = Math.round(back.clientWidth * dpr),
      H = Math.round(back.clientHeight * dpr);
    if (back.width !== W || back.height !== H) {
      back.width = W;
      back.height = H;
    }
    const toWorld = (px, py) => camera.screenToWorld(((px / dpr + backRect.left - r.left) * width) / r.width, ((py / dpr + backRect.top - r.top) * height) / r.height);
    const a = toWorld(0, 0),
      bb = toWorld(W, H);
    bg.setTransform(1, 0, 0, 1, 0, 0);
    bg.fillStyle = battle.night ? '#24242a' : '#7a6e52';
    bg.fillRect(0, 0, W, H);
    const k = W / (bb.x - a.x);
    bg.setTransform(k, 0, 0, k, -a.x * k, -a.y * k);
    bg.drawImage(ground, 0, 0, FIELD_SIZE.width, FIELD_SIZE.height);
    // Night: a dark veil, lifted a little round each of our units.
    if (battle.night) {
      bg.fillStyle = 'rgba(10, 14, 30, 0.35)';
      bg.fillRect(0, 0, FIELD_SIZE.width, FIELD_SIZE.height);
    }
    bg.setTransform(1, 0, 0, 1, 0, 0);
  }

  let zoomGoal = fit;
  return {
    camera,
    update(dt) {
      camera.update(dt);
      battle.units.forEach((u, i) => {
        const v = views[i];
        if (u.troops < v.troops - 1) {
          v.flash = 0.12;
          if (u.troops < v.troops - u.start * 0.02) {
            const p = hexCentre(u.pos);
            dust.x = p.x;
            dust.y = p.y;
            dust.burst(4);
          }
        }
        v.troops = u.troops;
        v.flash = Math.max(0, v.flash - dt);
        v.box.visible = !u.gone;
        if (u.pos < 0) return;
        const p = hexCentre(u.pos);
        v.box.x += (p.x - v.box.x) * Math.min(1, dt * 10);
        v.box.y += (p.y - v.box.y) * Math.min(1, dt * 10);
        paintUnit(v, u);
      });
      // Flames where the ground burns.
      for (const key of Object.keys(battle.fire)) if (!flames.has(+key)) flames.set(+key, flameAt(+key));
      for (const [h, e] of flames)
        if (!battle.fire[h]) {
          e.stop();
          if (e.alive === 0) {
            e.display.parent?.removeChild(e.display);
            e.dispose?.();
            flames.delete(h);
          }
        }
      for (const [, e] of flames) e.update(dt);
      // A burst of sparks for each tactic.
      while (seenEvents < battle.events.length) {
        const ev = battle.events[seenEvents++];
        if (ev.kind === 'tactic' || ev.kind === 'gateOpen' || ev.kind === 'depotBurnt') {
          const at = ev.target !== null && ev.target !== undefined ? battle.units[ev.target].pos : ev.kind === 'gateOpen' ? battle.gate?.at : battle.depot?.at ?? battle.units[ev.unit]?.pos;
          if (at !== undefined && at >= 0) {
            const p = hexCentre(at);
            sparks.x = p.x;
            sparks.y = p.y;
            sparks.burst(60);
          }
        }
        on.event(ev);
      }
      sparks.update(dt);
      dust.update(dt);
      paintMarks();
      paintBack();
    },
    select(id) {
      selected = id;
    },
    zoomBy(f) {
      zoomGoal = Math.min(2.4, Math.max(fit * 0.9, zoomGoal * f));
      camera.zoomTo(zoomGoal, 0.2);
    },
    /** Fit the field into the part of the stage the interface leaves free: margins in stage units. */
    frame({ left = 0, right = 0, top = 0, bottom = 0 }) {
      const w = Math.max(200, width - left - right),
        hgt = Math.max(160, height - top - bottom);
      fit = Math.max(0.25, Math.min(w / (FIELD_SIZE.width + 20), hgt / (FIELD_SIZE.height + 20)));
      zoomGoal = fit;
      camera.zoomTo(fit, 0);
      camera.lookAt(FIELD_SIZE.width / 2 + (width / 2 - (left + w / 2)) / fit, FIELD_SIZE.height / 2 + (height / 2 - (top + hgt / 2)) / fit);
    },
    panBy(dx, dy) {
      const v = camera.snapshot();
      camera.lookAt(v.center.x + dx / v.zoom, v.center.y + dy / v.zoom);
    },
    /** Bring a hex into view: only when zoomed in, since the whole field is in view otherwise. */
    lookAtHex(h) {
      if (zoomGoal <= fit * 1.15) return;
      const p = hexCentre(h);
      camera.panTo(p.x, p.y, 0.3);
    },
    pagePoint(x, y) {
      const p = camera.worldToScreen(x, y),
        r = canvas.getBoundingClientRect();
      return { x: r.left + (p.x * r.width) / width, y: r.top + (p.y * r.height) / height };
    },
    destroy() {
      world.parent?.removeChild(world);
      bg.setTransform(1, 0, 0, 1, 0, 0);
      scope.dispose();
    },
    unitName: (i) => (battle.units[i].general ? GENERALS[battle.units[i].general] : null)
  };
}
