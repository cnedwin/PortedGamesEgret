// 车队的痕迹和天气：车尘拖尾（createTrail3D）、轮胎在地上压出的车辙（地形的 createDecal）、
// 车斗上的捆绳（createRope3D）和篷布（createCloth3D）、雪山上的飘雪、涉水的水花和撞击扬起的尘土（createGpuParticles3D）。
//
// What the convoy leaves and the weather around it: dust trails (`createTrail3D`), tyre tracks pressed into the ground
// (the terrain's `createDecal`), lashing ropes (`createRope3D`) and a tarp (`createCloth3D`) on each bed, falling snow in the
// mountains, spray at the ford and dust thrown up by knocks (`createGpuParticles3D`).
import {
  Texture3D,
  createCloth3D,
  createDecal3D,
  createGpuParticles3D,
  createRope3D,
  createStandardMaterial3D,
  createTrail3D
} from '@egret/engine/world3d';
import { clothPixels, mudPixels, puffPixels, trackPixels } from '../art/textures.mjs';
import { LAYER } from '../world/land.mjs';

const puff = new Texture3D(puffPixels(), { wrapS: 'clamp', wrapT: 'clamp', mipmaps: true });
const trackMaterial = createStandardMaterial3D({
  map: new Texture3D(trackPixels(), { wrapS: 'clamp', wrapT: 'repeat', mipmaps: true }),
  color: 0xffffff,
  alphaMode: 'blend',
  roughness: 1,
  depthWrite: false
});
const mudMaterial = createStandardMaterial3D({
  map: new Texture3D(mudPixels(), { wrapS: 'clamp', wrapT: 'clamp', mipmaps: true }),
  alphaMode: 'blend',
  roughness: 1,
  depthWrite: false
});
const lashing = createStandardMaterial3D({ color: 0x8b633b, roughness: 0.95 });

function tarpPixels() {
  const cloth = clothPixels(128, [66, 97, 86]);
  const hem = clothPixels(128, [185, 145, 95]);
  for (let y = 0; y < cloth.height; y++) {
    for (let x = 0; x < cloth.width; x++) {
      const edge = Math.min(x, y, cloth.width - 1 - x, cloth.height - 1 - y);
      if (edge < 4 || edge === 7) {
        const i = (y * cloth.width + x) * 4;
        cloth.data.set(hem.data.subarray(i, i + 4), i);
      }
    }
  }
  return cloth;
}

const tarpMaterial = createStandardMaterial3D({
  map: new Texture3D(tarpPixels(), { wrapS: 'clamp', wrapT: 'clamp', mipmaps: true }),
  side: 'double',
  roughness: 0.93
});

/** Rotate a point given in a body's frame into the world. */
function toWorld(body, local, out = [0, 0, 0]) {
  const [qx, qy, qz, qw] = body.quaternion,
    [x, y, z] = local;
  // q * v * q^-1, written out.
  const ix = qw * x + qy * z - qz * y,
    iy = qw * y + qz * x - qx * z,
    iz = qw * z + qx * y - qy * x,
    iw = -qx * x - qy * y - qz * z;
  out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy + body.position[0];
  out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz + body.position[1];
  out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx + body.position[2];
  return out;
}

/** A direction given in a body's frame, turned into the world. */
function turn(body, local) {
  const p = toWorld(body, local);
  return [p[0] - body.position[0], p[1] - body.position[1], p[2] - body.position[2]];
}

/** Ropes over the cargo and a short canvas over its leading row, moved by the wind of the truck. */
function dressCargo(scene, physics, truck) {
  const body = truck.chassis,
    dressing = [];
  // The canvas and ropes rest on this invisible proxy for the two layers of wraps.
  const loadCenter = [0, 0.68, 1.04];
  const bale = physics.createBody({
    type: 'kinematic',
    shape: { type: 'box', halfExtents: [1.0, 0.386, 1.4] },
    position: toWorld(body, loadCenter),
    quaternion: body.quaternion,
    layer: 0,
    mask: 0
  });
  for (const z of [0.77, 2.02]) {
    const left = toWorld(body, [-1.12, 0.8, z]);
    const right = toWorld(body, [1.12, 0.8, z]);
    const rope = createRope3D({ start: left, end: right, segments: 12, slack: 0.04, damping: 0.26, iterations: 8, colliders: [bale], thickness: 0.024 });
    for (let i = 0; i <= 12; i++) {
      const edge = i / 6 - 1;
      rope.setPoint(i, ...toWorld(body, [1.12 * edge, 0.8 + 0.312 * (1 - edge ** 8), z]));
    }
    // A keeper over the load holds the lashing across the same row as the truck accelerates.
    for (const i of [0, 1, 6, 11, 12]) rope.pinPoint(i, body);
    // The mesh's bounds are cached where it was made and not refreshed as it travels (see ENGINE-NOTES), so it is
    // never culled; it is a handful of triangles.
    const mesh = rope.createMesh(lashing, 0.022, 5);
    mesh.frustumCulled = false;
    scene.addChild(mesh);
    dressing.push(rope);
  }
  // The tarp's grid, laid out in the truck's frame: across the bed, and back along it.
  const tarp = createCloth3D({
    columns: 9,
    rows: 6,
    origin: toWorld(body, [-1.16, 1.135, -0.18]),
    right: turn(body, [2.32, 0, 0]),
    down: turn(body, [0, 0, 0.82]),
    colliders: [bale],
    thickness: 0.05,
    damping: 0.24,
    iterations: 8
  });
  for (let row = 0; row < tarp.rows; row++) {
    for (let col = 0; col < tarp.columns; col++) {
      const edge = (2 * col) / (tarp.columns - 1) - 1;
      const z = -0.18 + (0.82 * row) / (tarp.rows - 1);
      tarp.setPoint(tarp.indexOf(col, row), ...toWorld(body, [1.16 * edge, 1.135 - 0.255 * edge ** 8, z]));
    }
  }
  // Tied at its front edge and at the two back corners; the rest lies loose on the load.
  for (let c = 0; c < 9; c++) tarp.pin(c, 0, body);
  tarp.pin(0, 5, body);
  tarp.pin(8, 5, body);
  // A wolf's teeth work the tarp loose, one tie at a time.
  const ties = [[8, 5], [0, 5], [8, 0], [0, 0], [4, 0]];
  truck.tearTarp = () => {
    const tie = ties.shift();
    if (tie) tarp.unpin(tie[0], tie[1]);
  };
  const mesh = tarp.createMesh(tarpMaterial);
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  scene.addChild(mesh);
  dressing.push(tarp);
  return {
    dressing,
    bale,
    update(seconds) {
      const p = toWorld(body, loadCenter);
      bale.setPosition(p[0], p[1], p[2]);
      bale.setQuaternion(...body.quaternion);
      // The air of the truck's going lifts the loose cloth.
      const v = body.linearVelocity;
      tarp.wind[0] = -v[0] * 0.4;
      tarp.wind[1] = Math.min(3, Math.hypot(v[0], v[2]) * 0.08);
      tarp.wind[2] = -v[2] * 0.4;
      for (const item of dressing) item.update(seconds);
    }
  };
}

/**
 * The convoy's traces and the weather. `land` provides the stream of tiles to print tracks on, `water` the depth of
 * water at a point. Call `update(seconds, camera, biome)` once a frame after the physics step.
 */
export function createEffects(scene, physics, convoy, { land, water, quality = 'medium' }) {
  const cargo = convoy.trucks.map((truck) => dressCargo(scene, physics, truck));

  // Dust behind the rear wheels of each truck: a ribbon whose colour and strength follow the ground and the speed.
  const trails = [];
  for (const truck of convoy.trucks)
    for (const wheel of [truck.model.wheels[4], truck.model.wheels[5]]) {
      const trail = createTrail3D({ target: wheel.node, lifetime: 1.6, points: 48, minDistance: 0.6, width: 1.6, endWidth: 5, color: 0xb59a72, endColor: 0xc8b496, opacity: 0, endOpacity: 0, map: puff, blending: 'normal' });
      trail.material.depthWrite = false;
      scene.addChild(trail);
      trails.push({ trail, truck, wheel });
    }

  // Tracks: prints of the lead truck's rear wheels, laid every metre and a half, the oldest taken up first.
  const tracks = [],
    lastPrint = new Map(),
    maxTracks = quality === 'low' ? 60 : 180;
  function print(wheelIndex) {
    const lead = convoy.lead,
      wheel = lead.vehicle.wheels[wheelIndex];
    if (!wheel.grounded || wheel.ground?.userData?.kind !== 'ground') return;
    const c = wheel.contact,
      last = lastPrint.get(wheelIndex);
    if (last && Math.hypot(c[0] - last[0], c[2] - last[2]) < 1.5) return;
    const tile = land.stream.tileAt(c[0], c[2]);
    if (!tile) return;
    lastPrint.set(wheelIndex, [c[0], c[1], c[2]]);
    const heading = convoy.heading();
    const decal = tile.terrain.createDecal(trackMaterial, { position: [c[0], c[1], c[2]], normal: [0, 1, 0], width: 0.42, height: 1.7, depth: 1.2, rotation: heading, offset: 0.02 });
    if (!decal) return;
    tracks.push(decal);
    while (tracks.length > maxTracks) {
      const old = tracks.shift();
      old.removeFromParent();
      old.geometry.dispose();
    }
  }

  // Snow falling round the camera in the mountains.
  const snow = createGpuParticles3D({
    count: quality === 'low' ? 1200 : quality === 'medium' ? 3000 : 6000,
    lifetime: [6, 9],
    speed: [0.8, 1.6],
    direction: [0.2, -1, 0.1],
    spread: 0.5,
    startSize: [0.05, 0.11],
    startColor: 0xffffff,
    startOpacity: 0.9,
    endOpacity: 0.9,
    fadeIn: 0.1,
    fadeOut: 0.2,
    shape: 'box',
    extents: [45, 22, 45],
    map: puff,
    blending: 'normal',
    seed: 3
  });
  snow.visible = false;
  scene.addChild(snow);

  // Bursts: spray where a wheel runs through water, dust where something is knocked.
  const sprays = [0, 1].map((i) => {
    const spray = createGpuParticles3D({ count: 160, lifetime: [0.5, 1.0], speed: [2, 5], direction: [0, 1, 0], spread: 0.9, gravity: [0, -9, 0], startSize: [0.12, 0.3], endScale: 2, startColor: 0xdfeef0, startOpacity: 0.85, endOpacity: 0, shape: 'sphere', radius: 0.4, loop: false, duration: 0.25, map: puff, seed: 10 + i, space: 'world' });
    scene.addChild(spray);
    return spray;
  });
  const dusts = [0, 1, 2].map((i) => {
    const dust = createGpuParticles3D({ count: 90, lifetime: [0.8, 1.6], speed: [1, 3.5], direction: [0, 1, 0], spread: 1.2, gravity: [0, -1.2, 0], drag: 1.2, startSize: [0.4, 0.9], endScale: 3, startColor: 0xb8a483, startOpacity: 0.6, endOpacity: 0, shape: 'sphere', radius: 0.6, loop: false, duration: 0.15, map: puff, seed: 20 + i, space: 'world' });
    scene.addChild(dust);
    return dust;
  });
  let nextSpray = 0,
    nextDust = 0,
    sprayTimer = 0;

  // Mud flung up onto the trucks' sides and mudguards, cut onto the body with createDecal3D; a few per truck.
  const muddy = new Map(),
    mudTimer = new Map();
  function splatter(truck) {
    const list = muddy.get(truck) ?? [];
    muddy.set(truck, list);
    if (list.length >= 10) list.shift().removeFromParent();
    const body = truck.chassis,
      side = Math.random() < 0.5 ? -1 : 1,
      local = [side * 1.15, -0.05 + Math.random() * 0.45, -2.6 + Math.random() * 5.4],
      at = toWorld(body, local),
      normal = turn(body, [side, 0, 0]);
    const decal = createDecal3D(truck.model.body, mudMaterial, { position: at, normal, width: 0.5 + Math.random() * 0.5, height: 0.4 + Math.random() * 0.4, depth: 0.6, rotation: Math.random() * Math.PI });
    if (decal) list.push(decal);
  }

  return {
    snow,
    cargo,
    trails,
    tracks,
    /** Throw up dust at a point, as when a bandit is knocked down or a truck lands hard. */
    burst(x, y, z, color = 0xb8a483) {
      const dust = dusts[nextDust++ % dusts.length];
      dust.setPosition(x, y, z);
      dust.material.color.set(colorOf(color));
      dust.restart();
    },
    update(seconds, camera, biome) {
      for (const item of cargo) item.update(seconds);
      // Dust shows on dry ground at speed; white powder in the snow, nothing in water.
      for (const { trail, truck, wheel } of trails) {
        const speed = Math.abs(truck.vehicle.speed),
          w = truck.vehicle.wheels[truck.model.wheels.indexOf(wheel)],
          wet = water.depthAt(w.contact[0], w.contact[1], w.contact[2]) > 0.05;
        const target = w.grounded && !wet ? Math.min(0.55, Math.max(0, (speed - 3) / 14)) : 0;
        trail.opacity += (target - trail.opacity) * Math.min(1, seconds * 3);
        trail.endOpacity = 0;
        const snowy = biome[2];
        trail.color.set([0.45 + 0.4 * snowy, 0.36 + 0.48 * snowy, 0.24 + 0.62 * snowy]);
        trail.endColor.set([0.55 + 0.35 * snowy, 0.48 + 0.42 * snowy, 0.36 + 0.56 * snowy]);
        trail.update(seconds);
      }
      print(4);
      print(5);
      // Spray from the lead truck's wheels while it wades.
      sprayTimer -= seconds;
      const lead = convoy.lead;
      if (sprayTimer <= 0 && Math.abs(lead.vehicle.speed) > 1.5)
        for (const index of [0, 1]) {
          const w = lead.vehicle.wheels[index],
            depth = water.depthAt(w.contact[0], w.contact[1], w.contact[2]);
          if (depth > 0.05) {
            const spray = sprays[nextSpray++ % sprays.length];
            spray.setPosition(w.contact[0], w.contact[1] + depth, w.contact[2]);
            spray.restart();
            sprayTimer = 0.18;
          }
        }
      // Mud: through water and at speed on bare earth the sides of each truck get dirtier.
      for (const truck of convoy.trucks) {
        const w = truck.vehicle.wheels[0],
          wet = water.depthAt(w.contact[0], w.contact[1], w.contact[2]) > 0.05,
          speed = Math.abs(truck.vehicle.speed),
          dirt = wet ? 2.5 : w.grounded && speed > 9 && biome[2] < 0.5 ? 0.25 : 0;
        const t = (mudTimer.get(truck) ?? 0) + seconds * dirt * (speed > 2 ? 1 : 0);
        mudTimer.set(truck, t >= 1 ? 0 : t);
        if (t >= 1) splatter(truck);
      }
      for (const spray of sprays) spray.update(seconds);
      for (const dust of dusts) dust.update(seconds);
      // Snow round the camera in the mountains.
      snow.visible = biome[2] > 0.25;
      if (snow.visible) {
        snow.setPosition(camera.position[0], camera.position[1] + 4, camera.position[2]);
        snow.material.opacity = Math.min(1, (biome[2] - 0.25) * 2);
        snow.update(seconds);
      }
    }
  };
}

/** A hex colour as linear RGB, as the materials hold it. */
function colorOf(hex) {
  const c = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => v / 255);
  return c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
}

export { LAYER };
