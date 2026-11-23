// 地图上的战斗：战场就是天下图上的那一片格子，镜头飞过去，战场外的地暗下来；各部兵马按所在的格子站阵，走动时平滑
// 地挪过去，接敌就前冲后撤，溃逃时四散；城上的守兵站在城墙顶。头顶是部队的名牌，掉兵时冒出伤害数字，放战法时
// 战法名以大字浮现、火攻点起火焰，弓弩部队射出一阵阵箭雨，城门被攻破时门扇倒下。
// The battle on the map: the field is that stretch of the realm's hexes; the camera flies there and the land outside
// the field dims. Each unit stands in formation on its hex and slides smoothly as it moves, lunges and falls back in a
// melee, scatters when routed; defenders on the walls stand on the wall top. Over each unit is its plate; losses rise as
// numbers, a tactic's name appears in large characters, fire tactics set flames, bows loose volleys of arrows, and the
// gate's leaves fall when it is broken.
import {
  InstancedMesh3D,
  Mesh3D,
  Texture3D,
  createBoxGeometry3D,
  createParticleEmitter3D,
  createRingGeometry3D,
  createStandardMaterial3D,
  linearColor3D,
  mat4Compose,
  projectToViewport3D,
  quatFromEuler
} from '@egret/engine/world3d';
import { UNITS } from '../data/battle.mjs';
import { TACTICS } from '../data/tactics.mjs';
import { nm } from '../i18n.mjs';
import { distance } from '../sim/battle.mjs';
import { HEX_W, hexCenter } from '../sim/hexgrid.mjs';
import { FOOTPRINTS } from '../sim/land.mjs';
import { generalName } from '../view/names.mjs';
import { portrait } from '../view/portrait.mjs';
import { wallTop } from './cities.mjs';
import { figureOf } from './troops.mjs';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');

function softDot() {
  const n = 32,
    data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - n / 2 + 0.5, y - n / 2 + 0.5) / (n / 2);
      const a = Math.max(0, 1 - d) ** 1.6;
      data.set([255, 255, 255, Math.round(a * 255)], (y * n + x) * 4);
    }
  return new Texture3D({ width: n, height: n, data }, { colorSpace: 'srgb' });
}

/**
 * Lay battle `b` over `realm`. `colours` are the two sides' colours, `side` the player's side (or -1), `fx` the page
 * layer for numbers and calligraphy, `plates` the page layer for unit plates, `on` hears taps on units and hexes.
 */
export function createBattle3D(realm, b, { colours, side, fx, plates, rulers, on }) {
  const { scene, land, troops, camera, rig } = realm;
  const n = b.tiles.length;
  // Where each hex is on the map, and the height a soldier stands at there.
  const place = b.setup.place?.node ? FOOTPRINTS[b.setup.place.node] : null;
  const top = place && b.setup.kind === 'siege' ? wallTop(place) : null;
  const pos = Array.from({ length: n }, (_, i) => {
    const [wc, wr] = b.world[i];
    const p = hexCenter(wc, wr);
    const ground = Math.max(0, land.heightAt(p.x, p.z));
    const tile = b.tiles[i];
    const water = tile === 'water' || tile === 'ship';
    return { x: p.x, z: p.z, y: tile === 'wall' && top !== null ? top : water ? Math.max(ground, 0) : ground, water };
  });
  let minX = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxZ = -Infinity;
  for (const p of pos) (minX = Math.min(minX, p.x)), (minZ = Math.min(minZ, p.z)), (maxX = Math.max(maxX, p.x)), (maxZ = Math.max(maxZ, p.z));
  const centre = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
  land.setField([minX - HEX_W / 2, minZ - HEX_W / 2, maxX + HEX_W / 2, maxZ + HEX_W / 2]);
  // Look between the two sides where they will meet: the gate, or the middle of the defenders, and the attackers' line.
  const meanOf = (side) => {
    const list = b.units.filter((u) => u.side === side && u.pos >= 0).map((u) => pos[u.pos]);
    if (!list.length) return centre;
    return { x: list.reduce((a, p) => a + p.x, 0) / list.length, z: list.reduce((a, p) => a + p.z, 0) / list.length };
  };
  const front = b.gate ? pos[b.gate.at] : meanOf(1),
    them = meanOf(0);
  rig.glideTo(front.x * 0.8 + them.x * 0.2, front.z * 0.8 + them.z * 0.2 + 3, 40, 1.4);
  const cols = colours.map((c) => linearColor3D(c));

  // ——— Selection ring and the gate ———
  const ringMaterial = createStandardMaterial3D({ color: 0xf3cf6a, emissive: 0xf3cf6a, emissiveIntensity: 1.5, roughness: 1, metallic: 0 });
  ringMaterial.depthWrite = false;
  const ring = new Mesh3D(createRingGeometry3D({ innerRadius: 1.15, outerRadius: 1.32, thetaSegments: 48 }), ringMaterial);
  ring.setRotation(-Math.PI / 2, 0, 0);
  ring.visible = false;
  ring.pickable = false;
  scene.addChild(ring);
  const own = [ring];
  let gateMesh = null;
  if (b.gate) {
    const g = pos[b.gate.at];
    gateMesh = new Mesh3D(createBoxGeometry3D({ width: 0.95, height: 0.95, depth: 0.25 }), createStandardMaterial3D({ color: 0x5a3a22, roughness: 0.8, metallic: 0.1 }));
    gateMesh.setPosition(g.x, (place?.level ?? g.y) + 0.47, g.z);
    const k = place ? Math.atan2(g.x - place.x, g.z - place.z) : 0;
    gateMesh.setRotation(0, k, 0);
    gateMesh.castShadow = true;
    scene.addChild(gateMesh);
    own.push(gateMesh);
  }

  // ——— Fire and dust ———
  const dot = softDot();
  const fires = new Map();
  const fireOptions = { capacity: 160, rate: 34, lifetime: [0.5, 1.1], speed: [0.4, 1.1], direction: [0, 1, 0], spread: 0.5, gravity: [0, 1.2, 0], drag: 0.6, startSize: 0.55, endSize: 0.15, startColor: [1, 0.62, 0.18], endColor: [0.55, 0.12, 0.04], startOpacity: 0.95, endOpacity: 0, shape: 'sphere', radius: 0.7, map: dot, blending: 'additive' };
  const smokeOptions = { capacity: 90, rate: 10, lifetime: [1.4, 2.6], speed: [0.4, 0.9], direction: [0, 1, 0], spread: 0.35, gravity: [0.3, 0.5, 0], drag: 0.3, startSize: 0.6, endSize: 2.2, startColor: [0.25, 0.22, 0.2], endColor: [0.45, 0.43, 0.42], startOpacity: 0.55, endOpacity: 0, shape: 'sphere', radius: 0.6, map: dot };
  function fireAt(i) {
    const p = pos[i];
    const flame = createParticleEmitter3D(fireOptions),
      smoke = createParticleEmitter3D(smokeOptions);
    for (const e of [flame, smoke]) {
      e.setPosition(p.x, p.y + 0.3, p.z);
      e.pickable = false;
      scene.addChild(e);
    }
    fires.set(i, { flame, smoke });
  }
  const bursts = [];
  function burst(i, colour, count = 28) {
    const p = pos[i];
    const e = createParticleEmitter3D({ capacity: count, rate: 0, lifetime: [0.4, 0.9], speed: [1.2, 3], direction: [0, 1, 0], spread: 1.1, gravity: [0, -3, 0], drag: 1.2, startSize: 0.35, endSize: 0.05, startColor: colour, endColor: colour, startOpacity: 1, endOpacity: 0, shape: 'sphere', radius: 0.5, map: dot, blending: 'additive' });
    e.setPosition(p.x, p.y + 0.5, p.z);
    e.pickable = false;
    e.burst(count);
    scene.addChild(e);
    bursts.push({ e, life: 1.2 });
  }

  // ——— Arrows ———
  const arrowCap = 600;
  const arrows = new InstancedMesh3D(createBoxGeometry3D({ width: 0.025, height: 0.025, depth: 0.42 }), createStandardMaterial3D({ color: 0x3a2a1c, roughness: 0.8, metallic: 0 }), arrowCap);
  arrows.count = 0;
  arrows.frustumCulled = false;
  arrows.pickable = false;
  scene.addChild(arrows);
  own.push(arrows);
  const flights = [];
  const volleyAt = new Map();

  // ——— Units as drawn ———
  const shown = b.units.map((u) => {
    const p = pos[u.pos] ?? centre;
    return { x: p.x, z: p.z, y: p.y ?? 0, heading: 0, troops: u.troops, loss: 0, lossAt: 0, lunge: 0 };
  });
  const unitPlates = b.units.map((u, i) => {
    const el = document.createElement('div');
    el.className = 'plate unit' + (u.side === side ? ' mine' : '');
    el.innerHTML = '<span class="ring"><img class="face" alt=""></span><span class="ainfo"><b class="aname"></b><span class="atroops"></span><span class="pbar"><i></i></span><span class="rbar"><i></i></span></span>';
    el.firstChild.style.setProperty('--c', hex(colours[u.side]));
    const img = el.querySelector('img');
    if (u.general) img.src = portrait(u.general, 48, rulers);
    else img.replaceWith(Object.assign(document.createElement('span'), { className: 'face blank', textContent: (nm(UNITS[u.kind]) || '?').slice(0, 1) }));
    el.querySelector('.aname').textContent = u.general ? generalName(u.general) : nm(UNITS[u.kind]);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      on.tapUnit(i);
    });
    plates.append(el);
    const anchor = [0, 0, 0];
    const marker = realm.markers.add(el, { target: anchor, maxDistance: 400 });
    return { el, marker, anchor, key: '' };
  });
  plates.classList.add('battle');

  // ——— Floating numbers and calligraphy ———
  const floaters = [];
  function floatText(x, y, z, text, kind) {
    const el = document.createElement('div');
    el.className = 'floater ' + kind;
    el.textContent = text;
    fx.append(el);
    floaters.push({ el, x, y, z, age: 0, life: kind === 'tactic' ? 1.8 : 1.15 });
  }
  function showTactic(u, tacticId) {
    const tc = TACTICS[tacticId];
    const s = shown[u.id];
    const el = document.createElement('div');
    el.className = 'brush ' + (u.side === side ? 'ours' : 'theirs') + (tc.general ? ' sig' : '');
    el.textContent = nm(tc);
    fx.append(el);
    floaters.push({ el, x: s.x, y: s.y + 2.2, z: s.z, age: 0, life: 1.9, brush: true });
    const target = tc.kind === 'burn' ? [1, 0.5, 0.15] : u.side === side ? [0.95, 0.85, 0.4] : [0.95, 0.35, 0.3];
    burst(u.pos, target, 40);
  }

  // ——— Picking ———
  const nearestHex = (g) => {
    let best = -1,
      bd = HEX_W * 0.62;
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(pos[i].x - g.x, pos[i].z - g.z);
      if (d < bd) (bd = d), (best = i);
    }
    return best;
  };
  let hoverHex = -1,
    selected = null,
    goalHex = -1,
    follow = null;
  realm.setMode({
    hides: (a) => Boolean(a.inBattle),
    pick(g) {
      const i = nearestHex(g);
      if (i < 0) return null;
      const u = b.units.findIndex((o) => !o.gone && o.pos === i);
      return u >= 0 ? { unit: u, hex: i } : { hex: i };
    },
    hover(g) {
      hoverHex = g ? nearestHex(g) : -1;
    },
    hexes() {
      const sel = selected !== null ? b.units[selected] : null;
      const chosen = goalHex >= 0 ? pos[goalHex] : sel && sel.pos >= 0 ? pos[sel.pos] : null;
      return { hover: hoverHex >= 0 ? pos[hoverHex] : null, chosen, grid: 1 };
    },
    /** The player moved the view by hand: stop following a unit. */
    release() {
      follow = null;
    },
    tap(hit) {
      if (!hit) return;
      if (hit.unit !== undefined) on.tapUnit(hit.unit);
      else on.tapHex(hit.hex);
    }
  });

  let time = 0;
  const m = new Float32Array(16),
    q = [0, 0, 0, 1];
  const stop = realm.onFrame((dt) => {
    time += dt;
    // Events since the last frame.
    for (; seenEvents < b.events.length; seenEvents++) {
      const ev = b.events[seenEvents];
      if (ev.kind === 'tactic') showTactic(b.units[ev.unit], ev.tactic);
      if (ev.kind === 'gateOpen' && gateMesh) {
        gateMesh.setRotation(Math.PI / 2.2, gateMesh.rotation?.[1] ?? 0, 0);
        burst(b.gate.at, [0.8, 0.7, 0.5], 50);
      }
      on.event?.(ev);
    }
    // Fires.
    for (const [i, f] of fires) {
      if (!b.fire[i]) {
        f.flame.emitting = false;
        f.smoke.emitting = false;
        if (f.flame.aliveCount === 0) {
          scene.removeChild(f.flame);
          scene.removeChild(f.smoke);
          fires.delete(i);
          continue;
        }
      }
      f.flame.update(dt);
      f.smoke.update(dt);
    }
    for (const i of Object.keys(b.fire)) if (b.fire[i] && !fires.has(+i)) fireAt(+i);
    for (let k = bursts.length - 1; k >= 0; k--) {
      bursts[k].life -= dt;
      bursts[k].e.update(dt);
      if (bursts[k].life <= 0) {
        scene.removeChild(bursts[k].e);
        bursts.splice(k, 1);
      }
    }
    // Units.
    b.units.forEach((u, i) => {
      const s = shown[i],
        plate = unitPlates[i];
      if (u.gone || u.pos < 0) {
        plate.el.hidden = true;
        return;
      }
      const p = pos[u.pos];
      const k = 1 - Math.exp(-dt * 5);
      const dx = p.x - s.x,
        dz = p.z - s.z;
      s.x += dx * k;
      s.z += dz * k;
      s.y += (p.y - s.y) * k;
      const foe = u.target !== null && u.target !== undefined ? b.units[u.target] : null;
      let face = s.heading;
      if (Math.hypot(dx, dz) > 0.2) face = Math.atan2(dx, dz);
      else if (foe && foe.pos >= 0) face = Math.atan2(pos[foe.pos].x - s.x, pos[foe.pos].z - s.z);
      if (u.routed) face += Math.PI;
      let dh = face - s.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      s.heading += dh * Math.min(1, dt * 6);
      // Losses show as rising numbers, gathered over a moment.
      if (u.troops < s.troops - 0.5) {
        s.loss += s.troops - u.troops;
        s.troops = u.troops;
      } else s.troops = u.troops;
      s.lossAt += dt;
      if (s.loss >= 1 && s.lossAt > 0.35) {
        floatText(s.x + (Math.random() - 0.5) * 0.8, s.y + 1.4, s.z, '-' + Math.round(s.loss), u.side === side ? 'hurt' : 'hit');
        s.loss = 0;
        s.lossAt = 0;
      }
      // In melee: a lunge toward the foe and back.
      const melee = foe && foe.pos >= 0 && !foe.gone && distance(u.pos, foe.pos) <= 1;
      s.lunge = melee ? Math.max(0, Math.sin(time * 6 + i)) * 0.35 : s.lunge * 0.9;
      drawUnit(u, s, i);
      // Volleys from bows at their target.
      if (foe && UNITS[u.kind].range > 1 && foe.pos >= 0 && distance(u.pos, foe.pos) <= UNITS[u.kind].range && !u.routed) {
        const last = volleyAt.get(i) ?? -9;
        if (time - last > 1.3) {
          volleyAt.set(i, time);
          const f = pos[foe.pos];
          for (let a = 0; a < 7; a++) flights.push({ fx: s.x + (Math.random() - 0.5), fy: s.y + 0.5, fz: s.z + (Math.random() - 0.5), tx: f.x + (Math.random() - 0.5) * 1.4, ty: f.y + 0.2, tz: f.z + (Math.random() - 0.5) * 1.4, t: -a * 0.05, dur: 0.75 });
        }
      }
      // The plate.
      plate.el.hidden = false;
      plate.anchor[0] = s.x;
      plate.anchor[1] = s.y + 2.9;
      plate.anchor[2] = s.z;
      plate.marker.retarget(plate.anchor);
      const key = [Math.round(u.troops), Math.round(u.rage / 5), u.routed, selected === i].join('|');
      if (key !== plate.key) {
        plate.key = key;
        plate.el.querySelector('.atroops').textContent = Math.round(u.troops).toLocaleString();
        plate.el.querySelector('.pbar i').style.width = Math.round((u.troops / Math.max(1, u.start)) * 100) + '%';
        plate.el.querySelector('.rbar i').style.width = Math.min(100, Math.round(u.rage)) + '%';
        plate.el.classList.toggle('routed', u.routed);
        plate.el.classList.toggle('chosen', selected === i);
        plate.el.classList.toggle('full', u.rage >= 100);
      }
    });
    // Arrows in flight.
    let na = 0;
    for (let k = flights.length - 1; k >= 0; k--) {
      const f = flights[k];
      f.t += dt;
      if (f.t >= f.dur) {
        flights.splice(k, 1);
        continue;
      }
      if (f.t < 0 || na >= arrowCap) continue;
      const t = f.t / f.dur;
      const x = f.fx + (f.tx - f.fx) * t,
        z = f.fz + (f.tz - f.fz) * t,
        y = f.fy + (f.ty - f.fy) * t + Math.sin(t * Math.PI) * 2.4;
      const vy = (f.ty - f.fy) + Math.cos(t * Math.PI) * Math.PI * 2.4;
      const horiz = Math.hypot(f.tx - f.fx, f.tz - f.fz);
      quatFromEuler(q, -Math.atan2(vy, horiz), Math.atan2(f.tx - f.fx, f.tz - f.fz), 0);
      mat4Compose(m, [x, y, z], q, [1, 1, 1]);
      arrows.setMatrixAt(na++, m);
    }
    arrows.count = na;
    // Floating numbers and calligraphy.
    const r = realm.canvasRect();
    for (let k = floaters.length - 1; k >= 0; k--) {
      const f = floaters[k];
      f.age += dt;
      if (f.age >= f.life) {
        f.el.remove();
        floaters.splice(k, 1);
        continue;
      }
      const p = projectToViewport3D(camera, [f.x, f.y + (f.brush ? 0 : f.age * 0.9), f.z], r.width, r.height);
      const fade = f.brush ? Math.min(1, (f.life - f.age) * 2.5) : 1 - Math.max(0, f.age / f.life - 0.5) * 2;
      f.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)` + (f.brush ? ` scale(${(1 + Math.min(0.25, f.age * 0.6)).toFixed(3)})` : '');
      f.el.style.opacity = fade.toFixed(2);
    }
    // The view keeps a unit it was asked to look at in the middle, until the player moves it.
    if (follow !== null) {
      const fu = b.units[follow];
      if (fu.gone || fu.pos < 0) follow = null;
      else {
        rig.view.tx = shown[follow].x;
        rig.view.tz = shown[follow].z + 2;
      }
    }
    // The ring under the chosen unit.
    const su = selected !== null ? b.units[selected] : null;
    ring.visible = Boolean(su && !su.gone && su.pos >= 0);
    if (ring.visible) {
      const s = shown[selected];
      ring.setPosition(s.x, s.y + 0.08, s.z);
      ringMaterial.emissiveIntensity = 1.2 + Math.sin(time * 5) * 0.4;
    }
  });
  let seenEvents = b.events.length;

  function drawUnit(u, s, i) {
    const kind = figureOf(u.kind);
    const colour = cols[u.side];
    const S = 1.75;
    const count = Math.max(1, Math.min(kind === 'boat' ? 2 : kind === 'horse' || kind === 'horsebow' ? 6 : 9, Math.ceil(u.troops / (kind === 'boat' ? 2500 : 700))));
    const per = kind === 'boat' ? 2 : 3;
    const gap = (kind === 'horse' || kind === 'horsebow' ? 0.5 : kind === 'boat' ? 0.75 : 0.4) * S;
    const sin = Math.sin(s.heading),
      cos = Math.cos(s.heading);
    const lungeX = sin * s.lunge,
      lungeZ = cos * s.lunge;
    for (let k = 0; k < count; k++) {
      const c = (k % per) - (per - 1) / 2,
        row = Math.floor(k / per);
      let lx = c * gap + (row % 2) * gap * 0.3,
        lz = (0.5 - row) * gap * 1.1;
      if (u.routed) {
        lx += Math.sin(i * 7 + k * 3.1) * 0.6;
        lz += Math.cos(i * 5 + k * 2.3) * 0.6;
      }
      const x = s.x + lx * cos + lz * sin + lungeX * (k % 2 ? 1 : 0.6),
        z = s.z - lx * sin + lz * cos + lungeZ * (k % 2 ? 1 : 0.6);
      const ground = b.tiles[u.pos] === 'wall' || u.onWall ? s.y : Math.max(0, land.heightAt(x, z));
      const bob = Math.abs(Math.sin(time * (u.routed ? 11 : 7) + k * 1.7 + i)) * (u.path?.length || u.routed ? 0.05 : 0.012);
      troops.add(kind, x, (kind === 'boat' ? Math.max(ground, s.y) : ground) + bob, z, s.heading + (u.routed ? Math.sin(k) * 0.6 : 0), colour, 0, S);
    }
    if (u.general) troops.add('standard', s.x - cos * 0.2 - sin * 0.9, s.y, s.z + sin * 0.2 - cos * 0.9, s.heading, colour, 0, S * 0.9);
  }

  return {
    select(i) {
      selected = i;
      goalHex = -1;
    },
    goal(hexIndex) {
      goalHex = hexIndex;
    },
    lookAtHex(i) {
      if (i < 0) return;
      rig.glideTo(pos[i].x, pos[i].z, Math.min(rig.view.td, 45), 0.6);
      const u = b.units.findIndex((o) => !o.gone && o.pos === i);
      follow = u >= 0 ? u : null;
    },
    destroy() {
      stop();
      realm.setMode(null);
      land.setField(null);
      plates.classList.remove('battle');
      for (const p of unitPlates) {
        p.marker.dispose();
        p.el.remove();
      }
      for (const f of floaters) f.el.remove();
      for (const mesh of own) scene.removeChild(mesh);
      for (const f of fires.values()) {
        scene.removeChild(f.flame);
        scene.removeChild(f.smoke);
      }
      for (const x of bursts) scene.removeChild(x.e);
    }
  };
}
