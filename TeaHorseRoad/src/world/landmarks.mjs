// 沿途的地标：起点的牌坊和石碑、三座驿站、峡谷上的吊桥、垭口的白塔和经幡、路边的里程牌。
// 吊桥的桥面是一段段静态碰撞体，缆绳是引擎的 createRope3D；经幡、驿站的旗幡是 createCloth3D，被风吹动。
// 布和绳每帧模拟，只在车队附近才算。
//
// Landmarks along the way: the gateway and stele at the start, the three post stations, the rope bridge over the gorge,
// the white stupa and prayer flags of the pass, and the distance signs by the road. The bridge deck is a row of static
// colliders and its cables the engine's `createRope3D`; prayer flags and the stations' banners are `createCloth3D`,
// moved by the wind. Cloth and rope are simulated each frame, only near the convoy.
import {
  InstancedMesh3D,
  Mesh3D,
  Object3D,
  Texture3D,
  createBoxGeometry3D,
  createCloth3D,
  createRope3D,
  createStandardMaterial3D
} from '@egret/engine/world3d';
import { flagPixels, woodPixels } from '../art/textures.mjs';
import { archGeometry, hall, lanternMesh, maniGeometry, materials, poleGeometry, signBoard, stableGeometry, stele, stupaGeometry } from '../models/buildings.mjs';
import { LAYER } from './land.mjs';
import { BRIDGE, PASS, ROAD_HALF_WIDTH, STATIONS, directionAt, geography, pointAt } from './route.mjs';
import { seeded } from './noise.mjs';

/** The names on the stations' boards and steles, Chinese and English. */
export const STATION_NAMES = {
  start: ['普洱茶山', "PU'ER TEA HILLS"],
  creek: ['溪畔驿', 'CREEK POST'],
  gorge: ['峡口驿', 'GORGE POST'],
  plateau: ['高原驿站', 'PLATEAU STATION']
};

const flagCloth = flagPixels();
/** Each line gets its own material, so the five colours repeat every three metres whatever its length. */
function flagMaterialFor(length) {
  const map = new Texture3D(flagCloth, { wrapS: 'repeat', wrapT: 'clamp', mipmaps: true });
  map.repeat[0] = Math.max(1, Math.round(length / 3));
  return createStandardMaterial3D({ map, side: 'double', alphaMode: 'mask', alphaCutoff: 0.5, roughness: 0.92 });
}
const ropeMaterial = createStandardMaterial3D({ color: 0x7a6040, roughness: 0.95 });
const plankMaterial = createStandardMaterial3D({ map: new Texture3D(woodPixels(), { wrapS: 'repeat', wrapT: 'repeat', mipmaps: true }), color: 0xbfa080, roughness: 0.9 });

/** A frame for standing a thing at a point of the road: at distance `s`, `side` metres to the right, facing `face`. */
function frameAt(s, side = 0, { face = 'road' } = {}) {
  const p = pointAt(s),
    [dx, dz] = directionAt(s),
    // The right of the direction of travel.
    rx = -dz,
    rz = dx,
    x = p[0] + rx * side,
    z = p[2] + rz * side;
  // Facing the road means turning +Z toward the road's centre; facing along means +Z against the travel.
  const yaw = face === 'road' ? Math.atan2(-rx * Math.sign(side || 1), -rz * Math.sign(side || 1)) : Math.atan2(-dx, -dz);
  return { x, z, y: geography.heightAt(x, z), yaw, p, dx, dz, rx, rz };
}

function place(node, frame, lift = 0) {
  node.setPosition(frame.x, frame.y + lift, frame.z);
  node.setRotation(0, frame.yaw, 0);
  return node;
}

/** A line of prayer flags between two points, as cloth pinned along its top edge. */
function flagLine(scene, from, to, { sag = 0.6, rows = 3, seed = 1 } = {}) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]),
    columns = Math.max(8, Math.round(length / 0.6)),
    flagHeight = 0.55;
  const cloth = createCloth3D({
    columns,
    rows,
    origin: from,
    right: [to[0] - from[0], to[1] - from[1], to[2] - from[2]],
    down: [0, -flagHeight, 0],
    damping: 0.04,
    iterations: 6
  });
  // The cord sags between the poles; every point of the top row is tied to it.
  for (let c = 0; c < columns; c++) {
    const t = c / (columns - 1),
      dip = sag * 4 * t * (1 - t),
      i = cloth.indexOf(c, 0);
    cloth.setPoint(i, from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t - dip, from[2] + (to[2] - from[2]) * t);
    cloth.pin(c, 0);
  }
  const random = seeded(seed);
  cloth.wind.set([1.6 + random(), 0, 0.8 + random() * 0.5]);
  const mesh = cloth.createMesh(flagMaterialFor(length));
  mesh.castShadow = false;
  scene.addChild(mesh);
  return { sim: cloth, mesh, x: (from[0] + to[0]) / 2, z: (from[2] + to[2]) / 2, gust: random() * 10 };
}

/**
 * Build every landmark into `scene`, with colliders in `physics`. Returns the stations with their yards, the bridge,
 * and `update(seconds, focus)` to move cloth and rope near `focus`.
 */
export function createLandmarks(scene, physics, { quality = 'medium' } = {}) {
  const animated = [],
    stations = [];
  const stable = stableGeometry(),
    painted = materials.painted;

  // ---- The start: a gateway over the road, the tea house of the hills, and a stele with the name.
  {
    const gate = new Mesh3D(archGeometry(11), painted);
    gate.castShadow = true;
    place(gate, frameAt(STATIONS[0].s + 46, 0, { face: 'along' }));
    scene.addChild(gate);
    const board = signBoard(['茶马古道', 'TEA HORSE ROAD'], { width: 4.6, height: 4.9 });
    place(board, frameAt(STATIONS[0].s + 46, 0, { face: 'along' }), 0.2);
    board.setRotation(0, frameAt(STATIONS[0].s + 46, 0, { face: 'along' }).yaw + Math.PI, 0);
    scene.addChild(board);
  }

  // ---- The stations: a hall facing the road, a stable, lanterns, a banner and a stele with the name.
  for (const station of STATIONS) {
    const side = station.id === 'gorge' ? -1 : 1,
      yard = frameAt(station.s, side * 15),
      back = frameAt(station.s, side * 27),
      node = new Object3D();
    const h = hall({ width: 12, depth: 7 });
    place(h, back);
    scene.addChild(h);
    const stall = new Mesh3D(stable, painted);
    stall.castShadow = true;
    place(stall, frameAt(station.s + 16, side * 22));
    scene.addChild(stall);
    const [name, english] = STATION_NAMES[station.id];
    const marker = stele(name, english);
    place(marker, frameAt(station.s - 12, side * (ROAD_HALF_WIDTH + 2.5)));
    scene.addChild(marker);
    // Lanterns hang either side of the hall's door.
    for (const k of [-1, 1]) {
      const lantern = lanternMesh(),
        f = frameAt(station.s + k * 3.4, side * 21.6);
      lantern.setPosition(f.x, back.y + 4.2, f.z);
      scene.addChild(lantern);
    }
    // A banner on a tall pole by the road, the station's welcome.
    const pole = new Mesh3D(poleGeometry(9), painted),
      at = frameAt(station.s + 10, side * (ROAD_HALF_WIDTH + 3));
    place(pole, at);
    scene.addChild(pole);
    const banner = flagLine(scene, [at.x + 0.15, at.y + 8.6, at.z], [at.x + 0.15 + at.dx * 3.2, at.y + 8.4, at.z + at.dz * 3.2], { rows: 3, sag: 0.05, seed: stations.length + 3 });
    animated.push(banner);
    stations.push({ ...station, name, english, side, yard: { x: yard.x, y: yard.y, z: yard.z, yaw: yard.yaw }, hall: { x: back.x, y: back.y, z: back.z }, node });
    scene.addChild(node);
  }

  // ---- Distance signs: leaving each station, how far the next one is.
  for (let i = 0; i < STATIONS.length - 1; i++) {
    const from = STATIONS[i].s + 70,
      next = STATIONS[i + 1],
      km = ((next.s - from) / 1000).toFixed(1),
      [name] = STATION_NAMES[next.id];
    const board = signBoard([name, `${km} KM`], { width: 3.4, arrow: 1 });
    place(board, frameAt(from, ROAD_HALF_WIDTH + 2.2, { face: 'along' }));
    board.setRotation(0, frameAt(from, 0, { face: 'along' }).yaw + Math.PI + 0.35, 0);
    scene.addChild(board);
  }

  // ---- The rope bridge: towers of logs on both rims, a plank deck, hand cables and the cables it hangs from.
  const bridge = { ...BRIDGE, deck: [] };
  {
    const [dx, dz] = directionAt((BRIDGE.from + BRIDGE.to) / 2),
      rx = -dz,
      rz = dx,
      length = BRIDGE.to - BRIDGE.from,
      halfWidth = 2.6,
      y = BRIDGE.y;
    const a = pointAt(BRIDGE.from - 3),
      b = pointAt(BRIDGE.to + 3);
    // Planks across the deck, each a little uneven.
    const count = Math.round((length + 6) / 0.45),
      random = seeded(5),
      planks = new InstancedMesh3D(createBoxGeometry3D({ width: halfWidth * 2, height: 0.12, depth: 0.4 }), plankMaterial, count),
      yaw = Math.atan2(-dx, -dz);
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1),
        x = a[0] + (b[0] - a[0]) * t,
        z = a[2] + (b[2] - a[2]) * t;
      planks.setTransformAt(i, [x, y - 0.06 + (random() - 0.5) * 0.03, z], [0, Math.sin((yaw + (random() - 0.5) * 0.05) / 2), 0, Math.cos((yaw + (random() - 0.5) * 0.05) / 2)], 1);
    }
    planks.count = count;
    planks.castShadow = true;
    planks.receiveShadow = true;
    scene.addChild(planks);
    // Colliders under the planks, in lengths of ten metres, their tops level with the road at the rims.
    const pieces = Math.ceil((length + 6) / 10);
    for (let i = 0; i < pieces; i++) {
      const t = (i + 0.5) / pieces;
      bridge.deck.push(
        physics.createBody({
          type: 'static',
          shape: { type: 'box', halfExtents: [halfWidth, 0.15, (length + 6) / pieces / 2 + 0.05] },
          position: [a[0] + (b[0] - a[0]) * t, y - 0.15, a[2] + (b[2] - a[2]) * t],
          quaternion: [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)],
          layer: LAYER.ground,
          friction: 0.9,
          userData: { kind: 'bridge' }
        })
      );
    }
    // A kerb of logs along each edge of the deck, under the hand ropes, so a wheel that strays is turned back.
    for (const side of [-1, 1]) {
      const kerb = createBoxGeometry3D({ width: 0.3, height: 0.3, depth: length + 4 }),
        mesh = new Mesh3D(kerb, plankMaterial),
        cx = (a[0] + b[0]) / 2 + rx * side * (halfWidth - 0.15),
        cz = (a[2] + b[2]) / 2 + rz * side * (halfWidth - 0.15);
      mesh.setPosition(cx, y + 0.15, cz);
      mesh.setRotation(0, yaw, 0);
      scene.addChild(mesh);
      bridge.deck.push(
        physics.createBody({
          type: 'static',
          shape: { type: 'box', halfExtents: [0.15, 0.7, (length + 4) / 2] },
          position: [cx, y + 0.55, cz],
          quaternion: [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)],
          layer: LAYER.prop,
          friction: 0.3,
          userData: { kind: 'kerb' }
        })
      );
    }
    // Towers: two log posts and a beam over the deck at each end, hung with flags.
    const towerTops = [];
    for (const [end, sign] of [
      [a, -1],
      [b, 1]
    ]) {
      const node = new Mesh3D(poleGeometry(6.5), painted);
      for (const s of [-1, 1]) {
        const post = node.clone();
        post.setPosition(end[0] + rx * s * (halfWidth + 0.3) + dx * sign * 1.5, y - 0.3, end[2] + rz * s * (halfWidth + 0.3) + dz * sign * 1.5);
        scene.addChild(post);
        towerTops.push([end[0] + rx * s * (halfWidth + 0.3) + dx * sign * 1.5, y + 6.0, end[2] + rz * s * (halfWidth + 0.3) + dz * sign * 1.5]);
      }
      const beam = new Mesh3D(createBoxGeometry3D({ width: halfWidth * 2 + 1.2, height: 0.3, depth: 0.3 }), plankMaterial);
      beam.setPosition(end[0] + dx * sign * 1.5, y + 6.0, end[2] + dz * sign * 1.5);
      beam.setRotation(0, yaw, 0);
      scene.addChild(beam);
      animated.push(flagLine(scene, [end[0] + rx * (halfWidth + 0.3) + dx * sign * 1.5, y + 5.6, end[2] + rz * (halfWidth + 0.3) + dz * sign * 1.5], [end[0] - rx * (halfWidth + 0.3) + dx * sign * 1.5, y + 5.6, end[2] - rz * (halfWidth + 0.3) + dz * sign * 1.5], { sag: 0.5, seed: 11 + sign }));
    }
    // The main cables, tower to tower on each side, a little longer than the span so they dip to just above the hand
    // ropes; and the hand rope along each side of the deck, a run of short ropes from hanger to hanger.
    const span = Math.hypot(towerTops[2][0] - towerTops[0][0], towerTops[2][2] - towerTops[0][2]),
      extra = 0.0028,
      dip = Math.sqrt((3 * span * span * extra) / 8);
    for (const s of [0, 1]) {
      const from = towerTops[s],
        to = towerTops[2 + s];
      const cable = createRope3D({ start: from, end: to, segments: 40, slack: extra, pinStart: true, pinEnd: true, damping: 0.05, iterations: 16 });
      const mesh = cable.createMesh(ropeMaterial, 0.07, 6);
      scene.addChild(mesh);
      animated.push({ sim: cable, mesh, x: (from[0] + to[0]) / 2, z: (from[2] + to[2]) / 2 });
      const side = s ? 1 : -1,
        railAt = (t) => [a[0] + rx * side * halfWidth + (b[0] - a[0]) * t, y + 1.1, a[2] + rz * side * halfWidth + (b[2] - a[2]) * t];
      const hangers = 8;
      for (let k = 0; k < hangers; k++) {
        const t0 = k / hangers,
          t1 = (k + 1) / hangers,
          rail = createRope3D({ start: railAt(t0), end: railAt(t1), segments: 8, slack: 0.01, pinStart: true, pinEnd: true, damping: 0.08, iterations: 8 });
        scene.addChild(rail.createMesh(ropeMaterial, 0.045, 5));
        const r0 = railAt(t0);
        animated.push({ sim: rail, mesh: rail.mesh, x: r0[0], z: r0[2] });
        if (k === 0) continue;
        // A hanger from the rail up to where the cable hangs above it.
        const top = y + 6.0 - 4 * dip * t0 * (1 - t0),
          hanger = new Mesh3D(createBoxGeometry3D({ width: 0.04, height: Math.max(0.2, top - (y + 1.1)), depth: 0.04 }), ropeMaterial);
        hanger.setPosition(r0[0], (top + y + 1.1) / 2, r0[2]);
        scene.addChild(hanger);
      }
    }
  }

  // ---- The pass: a white stupa above the road, mani piles, and lines of prayer flags across the saddle.
  {
    const stupa = new Mesh3D(stupaGeometry(), painted);
    stupa.castShadow = true;
    place(stupa, frameAt(PASS.s, 17), -0.4);
    scene.addChild(stupa);
    for (const [ds, side, seed] of [
      [-10, -11, 2],
      [14, 12, 3],
      [30, -9, 4]
    ]) {
      const pile = new Mesh3D(maniGeometry(seed), painted);
      pile.castShadow = true;
      place(pile, frameAt(PASS.s + ds, side));
      scene.addChild(pile);
    }
    const marker = stele('雪山垭口', 'SNOW PASS');
    place(marker, frameAt(PASS.s - 20, -(ROAD_HALF_WIDTH + 2.5)));
    scene.addChild(marker);
    // Flag lines strung from poles on either side of the road, high enough for the trucks to pass under.
    const lines = quality === 'low' ? 3 : 5;
    for (let i = 0; i < lines; i++) {
      const s = PASS.s - 24 + i * 12,
        left = frameAt(s, -9),
        right = frameAt(s + 4, 9);
      for (const f of [left, right]) {
        const pole = new Mesh3D(poleGeometry(8), painted);
        place(pole, f, -0.1);
        scene.addChild(pole);
      }
      animated.push(flagLine(scene, [left.x, left.y + 7.6, left.z], [right.x, right.y + 7.4, right.z], { sag: 1.6, seed: 20 + i }));
    }
    // Flags fanned down from the stupa's spire to the ground.
    const top = frameAt(PASS.s, 17);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4,
        foot = [top.x + Math.cos(a) * 9, 0, top.z + Math.sin(a) * 9];
      foot[1] = geography.heightAt(foot[0], foot[2]) + 0.6;
      animated.push(flagLine(scene, [top.x, top.y + 9.5, top.z], foot, { sag: 1.2, seed: 40 + i }));
    }
  }

  let time = 0;
  return {
    stations,
    bridge,
    /** Move the flags and ropes within reach of `focus`; the wind gusts. */
    update(seconds, focus) {
      time += seconds;
      for (const item of animated) {
        const near = Math.hypot(item.x - focus[0], item.z - focus[2]) < 320;
        item.mesh.visible = near || Math.hypot(item.x - focus[0], item.z - focus[2]) < 900;
        if (!near) continue;
        if (item.gust !== undefined) {
          const gust = 1 + 0.6 * Math.sin(time * 0.7 + item.gust) + 0.3 * Math.sin(time * 2.3 + item.gust * 2);
          item.sim.wind[0] = 2.2 * gust;
          item.sim.wind[2] = 1.1 * gust;
        }
        item.sim.update(Math.min(seconds, 1 / 30));
      }
    }
  };
}
