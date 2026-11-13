// Everything that moves in 3D: the karts, item boxes, items in flight,
// particles, boost trails and the camera. The view reads the race each frame
// and turns its events into effects; it never changes the race.
import {
  InstancedMesh3D,
  Mesh3D,
  createParticleEmitter3D,
  createRingGeometry3D,
  createStandardMaterial3D,
  createTrail3D,
  createUnlitMaterial3D,
  quatFromEuler,
} from '@egret/engine/world3d';
import { createKartModel } from './racers.mjs';
import { createScenery } from './scenery.mjs';
import { BOX, CONE, CYLINDER, SPHERE, build, dotTexture, yawQuat } from './shapes.mjs';
import { wrapAngle } from './track.mjs';

const GOLD = 0xf2c230,
  RED = 0xd8262c;
/** Spark colours for no charge yet and the three mini-turbo levels. */
const SPARKS = [0xf2f2f2, 0x4fb8ff, 0xff9a2e, 0xc86bff];

/**
 * Build the scene's moving parts on top of the scenery. Options:
 * `shadowSize` and `reflectionSize` are passed to the scenery.
 */
export function createView(scene, camera, track, options = {}) {
  const scenery = createScenery(scene, track, options);
  // `shake` is the camera shake still to play out and `flash` the brightness of the thunder's flash; both fade by themselves.
  const view = { scenery, time: 0, shake: 0, flash: 0, models: [] };

  /** An instanced mesh that starts empty and is refilled every frame. */
  const pool = (shape, capacity, material) => {
    const mesh = new InstancedMesh3D(
      shape,
      material ?? createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.4 }),
      capacity,
    );
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.setColorAt(0, 1, 1, 1);
    scene.addChild(mesh);
    return mesh;
  };

  // ---- item boxes: red lanterns with gold bands ------------------------------------------
  const boxes = pool(
    build([
      [BOX, [0, 0, 0], [1.25, 1.25, 1.25], [1.35, 0.16, 0.1]],
      [BOX, [0, 0.52, 0], [1.34, 0.16, 1.34], GOLD],
      [BOX, [0, -0.52, 0], [1.34, 0.16, 1.34], GOLD],
      ...[-1, 1].flatMap((x) => [-1, 1].map((z) => [BOX, [x * 0.62, 0, z * 0.62], [0.1, 1.2, 0.1], GOLD])),
      [SPHERE, [0, 0, 0.64], [0.28, 0.28, 0.04], GOLD],
      [SPHERE, [0, 0, -0.64], [0.28, 0.28, 0.04], GOLD],
      [SPHERE, [0.64, 0, 0], [0.04, 0.28, 0.28], GOLD],
      [SPHERE, [-0.64, 0, 0], [0.04, 0.28, 0.28], GOLD],
      [CYLINDER, [0, -0.95, 0], [0.07, 0.7, 0.07], [1.3, 0.75, 0.1]],
    ]),
    track.boxes.length,
  );

  // ---- items on the road and in the air ---------------------------------------------------
  const shapes = {
    firecracker: pool(
      build([
        ...[0, 1, 2, 3, 4].flatMap((k) => {
          const x = Math.cos(k * 1.257) * 0.26,
            z = Math.sin(k * 1.257) * 0.26;
          return [
            [CYLINDER, [x, 0.55, z], [0.17, 1, 0.17], RED],
            [CYLINDER, [x, 0.95, z], [0.18, 0.1, 0.18], GOLD],
            [CYLINDER, [x, 0.15, z], [0.18, 0.1, 0.18], GOLD],
          ];
        }),
        [CYLINDER, [0, 1.2, 0], [0.03, 0.4, 0.03], 0x3a2a20, [0.3, 0, 0.2]],
        [SPHERE, [0.05, 1.42, 0.06], 0.09, [2, 1.3, 0.3]],
      ]),
      24,
    ),
    cuju: pool(
      build([
        [SPHERE, [0, 0, 0], 0.62, 0xd9a05a],
        ...[
          [1, 0, 0],
          [-1, 0, 0],
          [0, 1, 0],
          [0, -1, 0],
          [0, 0, 1],
          [0, 0, -1],
        ].map(([x, y, z]) => [
          SPHERE,
          [x * 0.5, y * 0.5, z * 0.5],
          [0.3 - Math.abs(x) * 0.18, 0.3 - Math.abs(y) * 0.18, 0.3 - Math.abs(z) * 0.18],
          0x8a5a2b,
        ]),
      ]),
      16,
    ),
    // A swallow kite: swept wings, a forked tail and ribbons.
    kite: pool(
      build([
        [BOX, [0, 0, 0], [0.3, 0.06, 1.2], 0x1f3fa8],
        [BOX, [0.62, 0, -0.05], [1.2, 0.05, 0.5], 0x2f6fd0, [0, 0.45, 0]],
        [BOX, [-0.62, 0, -0.05], [1.2, 0.05, 0.5], 0x2f6fd0, [0, -0.45, 0]],
        [BOX, [0.2, 0, -0.85], [0.16, 0.05, 0.8], RED, [0, -0.3, 0]],
        [BOX, [-0.2, 0, -0.85], [0.16, 0.05, 0.8], RED, [0, 0.3, 0]],
        [SPHERE, [0, 0.03, 0.55], 0.17, GOLD],
        [SPHERE, [0.5, 0.04, 0], 0.1, GOLD],
        [SPHERE, [-0.5, 0.04, 0], 0.1, GOLD],
      ]),
      12,
    ),
    rocket: pool(
      build([
        [CYLINDER, [0, 0, 0], [0.22, 0.22, 1.5], RED, [Math.PI / 2, 0, 0]],
        [CONE, [0, 0, 1.05], [0.26, 0.6, 0.26], GOLD, [Math.PI / 2, 0, 0]],
        [CYLINDER, [0, 0, 0.45], [0.24, 0.24, 0.1], GOLD, [Math.PI / 2, 0, 0]],
        [CYLINDER, [0, -0.2, -1.3], [0.035, 0.035, 1.7], 0xc8a063, [Math.PI / 2, 0, 0]],
      ]),
      8,
    ),
  };

  // ---- coins and rolling drums ---------------------------------------------------------------
  // An old cash coin: a bright disc with a square hole.
  const coins = pool(
    build([
      [CYLINDER, [0, 0, 0], [0.62, 0.62, 0.1], [1.7, 1.25, 0.3], [Math.PI / 2, 0, 0]],
      [CYLINDER, [0, 0, 0], [0.66, 0.66, 0.05], [1.9, 1.5, 0.5], [Math.PI / 2, 0, 0]],
      [BOX, [0, 0, 0], [0.34, 0.34, 0.14], 0x7a4a10],
      ...[0, 1, 2, 3].map((k) => [BOX, [Math.cos(k * 1.571) * 0.37, Math.sin(k * 1.571) * 0.37, 0], [0.1, 0.1, 0.13], 0xb8860b]),
    ]),
    track.coins.length,
  );
  coins.castShadow = false;
  // A festival drum on its side: red lacquer, hide ends and gold studs.
  const drums = pool(
    build([
      [CYLINDER, [0, 0, 0], [1.25, 2.1, 1.25], 0xc8221e, [Math.PI / 2, 0, 0]],
      [CYLINDER, [0, 0, 0], [1.32, 0.5, 1.32], 0xb01a18, [Math.PI / 2, 0, 0]],
      [CYLINDER, [0, 0, 1.06], [1.18, 0.05, 1.18], 0xf3e6c4, [Math.PI / 2, 0, 0]],
      [CYLINDER, [0, 0, -1.06], [1.18, 0.05, 1.18], 0xf3e6c4, [Math.PI / 2, 0, 0]],
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].flatMap((k) => {
        const a = (k / 12) * Math.PI * 2;
        return [
          [SPHERE, [Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0.86], 0.07, 0xf2c230],
          [SPHERE, [Math.cos(a) * 1.25, Math.sin(a) * 1.25, -0.86], 0.07, 0xf2c230],
        ];
      }),
    ]),
    Math.max(1, track.drums.length),
  );
  // Expanding rings on the ground: the gong's wave, a boost's kick, a hard landing.
  const ringGeometry = createRingGeometry3D({ innerRadius: 0.8, outerRadius: 1, thetaSegments: 48 });
  const rings = Array.from({ length: 8 }, () => {
    const mesh = new Mesh3D(
      ringGeometry,
      createUnlitMaterial3D({
        color: 0xffffff,
        opacity: 0,
        alphaMode: 'blend',
        blending: 'additive',
        depthWrite: false,
        side: 'double',
      }),
    );
    mesh.setRotation(-Math.PI / 2, 0, 0);
    mesh.visible = false;
    mesh.castShadow = false;
    scene.addChild(mesh);
    return { mesh, age: 1, life: 1, from: 0, to: 1 };
  });
  /** Start a ring growing from radius `from` to `to` over `life` seconds, reusing the one nearest its end. */
  const ring = (x, y, z, from, to, life, color) => {
    const slot = rings.reduce((a, b) => (a.age / a.life >= b.age / b.life ? a : b));
    Object.assign(slot, { age: 0, life, from, to });
    slot.mesh.material.setColor(color);
    slot.mesh.setPosition(x, y + 0.15, z);
    slot.mesh.visible = true;
  };
  // Thunderbolts: a jagged column of light that stands on a kart for an instant.
  const boltShape = build(
    [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [
      BOX,
      [Math.sin(k * 2.3) * 0.9, 2 + k * 4, Math.cos(k * 1.7) * 0.9],
      [0.35, 4.6, 0.35],
      [1, 1, 1],
      [Math.cos(k * 1.7) * 0.4, 0, Math.sin(k * 2.3) * 0.4],
    ]),
  );
  const bolts = pool(boltShape, 8, createUnlitMaterial3D({ color: [3, 3, 2.2], fog: false }));
  bolts.castShadow = false;
  let boltTime = 0,
    boltTargets = [];

  // ---- particles -------------------------------------------------------------------------
  const dot = dotTexture();
  /** A particle emitter that only fires in bursts. */
  const emitter = (more) => {
    const node = createParticleEmitter3D({
      capacity: 500,
      rate: 0,
      map: dot,
      space: 'world',
      shape: 'sphere',
      radius: 0.2,
      spread: Math.PI,
      gravity: [0, -9, 0],
      drag: 1,
      lifetime: [0.3, 0.7],
      speed: [2, 6],
      startSize: 0.3,
      endSize: 0.05,
      startOpacity: 1,
      endOpacity: 0,
      blending: 'normal',
      ...more,
    });
    node.frustumCulled = false;
    node.castShadow = false;
    scene.addChild(node);
    return node;
  };
  const sparks = SPARKS.map((color) =>
    emitter({
      startColor: color,
      endColor: color,
      blending: 'additive',
      startSize: 0.28,
      endSize: 0.02,
      lifetime: [0.2, 0.45],
      speed: [3, 8],
      direction: [0, 1, 0],
      spread: 1.1,
      gravity: [0, -14, 0],
    }),
  );
  const flame = emitter({
    capacity: 900,
    startColor: 0xffe08a,
    endColor: 0xff4a12,
    blending: 'additive',
    startSize: 0.5,
    endSize: 0.05,
    lifetime: [0.15, 0.35],
    speed: [1, 3],
    gravity: [0, 2, 0],
    drag: 2,
  });
  const dust = emitter({
    startColor: 0xd8cfa8,
    endColor: 0xb8b08c,
    startSize: 0.5,
    endSize: 1.3,
    startOpacity: 0.5,
    lifetime: [0.5, 1],
    speed: [0.8, 2.5],
    gravity: [0, 1.2, 0],
  });
  const smoke = emitter({
    startColor: 0xffffff,
    endColor: 0xbfbfbf,
    startSize: 0.6,
    endSize: 2.2,
    startOpacity: 0.7,
    lifetime: [0.5, 1.1],
    speed: [1, 5],
    gravity: [0, 2, 0],
    drag: 2,
  });
  const stars = emitter({
    startColor: 0xfff6c0,
    endColor: 0xffc23d,
    blending: 'additive',
    startSize: 0.6,
    endSize: 0.04,
    lifetime: [0.3, 0.7],
    speed: [5, 13],
    gravity: [0, -6, 0],
    drag: 2,
  });
  const fire = emitter({
    capacity: 700,
    startColor: 0xfff0a0,
    endColor: 0xff3b12,
    blending: 'additive',
    startSize: 1.6,
    endSize: 0.2,
    lifetime: [0.3, 0.8],
    speed: [5, 18],
    gravity: [0, -3, 0],
    drag: 2.2,
  });
  // Red and gold paper, for firecrackers and the finish.
  const paper = [0xd8262c, 0xf2c230, 0xff6a4a, 0xfff0c0].map((color) =>
    emitter({
      startColor: color,
      endColor: color,
      startSize: 0.22,
      endSize: 0.14,
      lifetime: [0.8, 1.8],
      speed: [4, 11],
      gravity: [0, -9, 0],
      drag: 1.4,
    }),
  );
  /** Fire `count` particles from a point. */
  const burst = (node, x, y, z, count, radius) => {
    node.setPosition(x, y, z);
    if (radius !== undefined) node.radius = radius;
    node.updateWorldMatrix();
    node.burst(Math.max(1, Math.round(count)));
  };
  const confetti = (x, y, z, count) => paper.forEach((node) => burst(node, x, y, z, count / paper.length, 0.6));
  const mudSpray = emitter({
    startColor: 0x6b4a2c,
    endColor: 0x4a3320,
    startSize: 0.42,
    endSize: 0.18,
    lifetime: [0.4, 0.8],
    speed: [3, 8],
    direction: [0, 1, 0],
    spread: 1,
    gravity: [0, -16, 0],
    drag: 0.6,
  });
  const ink = emitter({
    startColor: 0x111118,
    endColor: 0x111118,
    startSize: 0.7,
    endSize: 0.25,
    lifetime: [0.5, 1.1],
    speed: [2, 7],
    gravity: [0, -8, 0],
    drag: 1.5,
  });
  const puffs = emitter({
    startColor: 0xffffff,
    endColor: 0xf2f6ff,
    startSize: 0.9,
    endSize: 1.9,
    startOpacity: 0.85,
    lifetime: [0.5, 1],
    speed: [1, 4],
    gravity: [0, 0.6, 0],
    drag: 2,
  });
  const exhaust = emitter({
    capacity: 600,
    startColor: 0xe8e8e8,
    endColor: 0x9a9a9a,
    startSize: 0.18,
    endSize: 0.7,
    startOpacity: 0.4,
    lifetime: [0.35, 0.7],
    speed: [0.5, 1.6],
    gravity: [0, 1.4, 0],
    drag: 1.5,
  });
  const jade = emitter({
    startColor: 0x7ff0c0,
    endColor: 0x1f9a6a,
    blending: 'additive',
    startSize: 0.4,
    endSize: 0.05,
    lifetime: [0.4, 0.8],
    speed: [4, 10],
    gravity: [0, -6, 0],
    drag: 2,
  });
  // Streaks of air flowing past a kart in another's tow.
  const wind = emitter({
    startColor: 0xffffff,
    endColor: 0xbfe6ff,
    blending: 'additive',
    startSize: 0.16,
    endSize: 0.03,
    startOpacity: 0.7,
    lifetime: [0.2, 0.4],
    speed: [0.2, 1],
    gravity: [0, 0, 0],
    drag: 0,
  });
  // Fireworks: a shell of sparks high over the grandstand, in festival colours.
  const fireworks = [0xff5a4a, 0xffd23f, 0x7bf08c, 0x6ac8ff, 0xff8ae0].map((color) =>
    emitter({
      capacity: 400,
      startColor: color,
      endColor: color,
      blending: 'additive',
      startSize: 1.5,
      endSize: 0.1,
      lifetime: [0.9, 1.7],
      speed: [10, 22],
      gravity: [0, -7, 0],
      drag: 1.6,
    }),
  );
  let fireworkWait = 2,
    fireworkPick = 0;
  // Blossom drifting on the breeze around the camera.
  const petals = createParticleEmitter3D({
    capacity: 260,
    rate: 26,
    map: dot,
    space: 'world',
    shape: 'box',
    extents: [34, 5, 34],
    direction: [0.6, -1, 0.2],
    spread: 0.5,
    gravity: [0, -0.5, 0],
    drag: 0.4,
    lifetime: [4, 7],
    speed: [1, 2.4],
    startSize: 0.17,
    endSize: 0.12,
    startColor: 0xffd0e0,
    endColor: 0xf7a8c4,
    startOpacity: 0.95,
    endOpacity: 0,
  });
  petals.frustumCulled = false;
  petals.castShadow = false;
  scene.addChild(petals);

  // ---- karts -----------------------------------------------------------------------------
  let trails = [],
    skids = [];
  /** Build the karts of a race, dropping those of the previous one. */
  view.attach = (race) => {
    for (const model of view.models) model.node.removeFromParent();
    for (const pair of trails) for (const trail of pair) trail.removeFromParent();
    for (const pair of skids) for (const trail of pair) trail.removeFromParent();
    view.showcase(undefined);
    view.models = race.karts.map((kart) => {
      const model = createKartModel(kart.racer);
      scene.addChild(model.node);
      return model;
    });
    // Two ribbons from the exhausts while a kart is boosting.
    trails = race.karts.map(() =>
      [0, 1].map(() => {
        const trail = createTrail3D({
          points: 28,
          minDistance: 0.3,
          lifetime: 0.35,
          width: 0.5,
          endWidth: 0.05,
          color: 0xffc23d,
          endColor: 0xff4a12,
          blending: 'additive',
          opacity: 0.85,
          endOpacity: 0,
        });
        trail.frustumCulled = false;
        trail.castShadow = false;
        scene.addChild(trail);
        return trail;
      }),
    );
    // Tyre marks laid down by the rear wheels in a drift.
    skids = race.karts.map(() =>
      [0, 1].map(() => {
        const trail = createTrail3D({
          points: 60,
          minDistance: 0.5,
          lifetime: 2.6,
          width: 0.3,
          endWidth: 0.3,
          color: 0x15151a,
          endColor: 0x15151a,
          blending: 'normal',
          opacity: 0.55,
          endOpacity: 0,
        });
        trail.frustumCulled = false;
        trail.castShadow = false;
        trail.renderOrder = 4;
        scene.addChild(trail);
        return trail;
      }),
    );
    rig.yaw = undefined;
  };

  let shown;
  /** Park one racer's kart in front of the gate for the choosing screen; pass nothing to remove it. */
  view.showcase = (racer) => {
    shown?.node.removeFromParent();
    shown = undefined;
    if (racer === undefined) return;
    shown = createKartModel(racer);
    scene.addChild(shown.node);
    const at = track.sample(14, 0, {});
    shown.still(at.x, at.y, at.z, at.heading + Math.PI);
    shown.at = at;
    for (const model of view.models) model.node.visible = false;
  };

  // ---- camera ----------------------------------------------------------------------------
  // `kick` is a burst of extra field of view when a boost starts; `side` slides the camera out in a drift;
  // `dip` is the bob after a landing.
  const rig = { yaw: undefined, x: 0, y: 0, z: 0, fov: 60, orbit: 0, kick: 0, side: 0, dip: 0, dipSpeed: 0, back: 6.4 };
  function chase(kart, dt, lookBack) {
    if (rig.yaw === undefined) rig.yaw = kart.heading;
    // The camera swings round behind the kart a little late, which shows off the drift.
    rig.yaw += wrapAngle(kart.heading + (kart.drifting ? -kart.driftDir * 0.2 : 0) - rig.yaw) * Math.min(1, dt * 5.5);
    const yaw = lookBack ? rig.yaw + Math.PI : rig.yaw,
      fx = Math.sin(yaw),
      fz = Math.cos(yaw),
      fast = Math.min(1, Math.abs(kart.speed) / 45),
      pushed = kart.boost > 0 || kart.cloud > 0;
    // Under a boost the kart pulls away from the camera, then the camera catches up.
    rig.back += (6.2 + fast * 1.5 + (pushed ? 1.5 : 0) - rig.back) * Math.min(1, dt * (pushed ? 7 : 2.5));
    // In a drift the camera slides to the outside, so the corner opens up ahead.
    rig.side += ((kart.drifting ? kart.driftDir * 1.3 : 0) + kart.steer * 0.5 - rig.side) * Math.min(1, dt * 3);
    rig.dipSpeed += (-rig.dip * 120 - rig.dipSpeed * 12) * dt;
    rig.dip += rig.dipSpeed * dt;
    const height = 3.1 - fast * 0.35 + (kart.cloud > 0 ? 1.4 : 0);
    rig.x = kart.x - fx * rig.back + fz * rig.side;
    rig.z = kart.z - fz * rig.back - fx * rig.side;
    rig.y += (kart.y + height - rig.y) * Math.min(1, dt * 8);
    camera.setPosition(rig.x, Math.max(rig.y + rig.dip, track.terrainHeight(rig.x, rig.z) + 0.6), rig.z);
    camera.lookAt(kart.x + fx * 6, kart.y + 1.3 + rig.dip * 0.5, kart.z + fz * 6);
    rig.kick = Math.max(0, rig.kick - dt * 14);
    rig.fovTarget = 62 + fast * 10 + (pushed ? 8 : 0) + rig.kick;
  }
  /** Circle a point: used on the title, the choosing screen and the sweep before the start. */
  function orbit(x, y, z, angle, distance, height) {
    camera.setPosition(x + Math.sin(angle) * distance, y + height, z + Math.cos(angle) * distance);
    camera.lookAt(x, y + 1.1, z);
    rig.fovTarget = 55;
  }

  // ---- one frame -------------------------------------------------------------------------
  const position = [0, 0, 0],
    turn = [0, 0, 0, 1],
    at = {},
    spot = {};
  let dustTick = 0;
  /**
   * Draw the state of `race`. `shot` picks the camera: 'title' follows a
   * rival from the side, 'select' circles the parked kart, 'intro' sweeps
   * round the player (`sweep` runs 0 to 1) and 'race' chases the player.
   */
  view.update = (dt, race, shot, { lookBack = false, sweep = 0 } = {}) => {
    view.time += dt;
    const time = view.time;
    const watched = race.human ?? race.karts.find((kart) => kart.place === 1) ?? race.karts[0];
    const cheering = race.state === 'race' && race.karts.some((kart) => Math.abs(track.delta(kart.s, 0)) < 90) ? 1 : 0.25;
    scenery.update(dt, time, cheering);
    scenery.aimSun(watched.x, watched.y, watched.z);

    // Karts, their boost trails and the sparks, flames and dust they throw up.
    dustTick += dt;
    const puff = dustTick > 0.05;
    if (puff) dustTick = 0;
    race.karts.forEach((kart, index) => {
      const model = view.models[index];
      if (!model) return;
      model.node.visible = !shown;
      model.pose(kart, dt, time);
      const fx = Math.sin(kart.heading),
        fz = Math.cos(kart.heading);
      trails[index].forEach((trail, side) => {
        const across = side ? 0.24 : -0.24;
        if (kart.boost > 0 || kart.bell > 0)
          trail.push(kart.x - fx * 1.4 - fz * across, kart.y + 0.72, kart.z - fz * 1.4 + fx * across);
        trail.update(dt);
        trail.visible = trail.pointCount > 1 && !shown;
      });
      if (shown || dt <= 0) return;
      if (kart.boost > 0) burst(flame, kart.x - fx * 1.5, kart.y + 0.72, kart.z - fz * 1.5, 2, 0.18);
      if (kart.drifting && !kart.airborne)
        for (const side of [-0.76, 0.76])
          burst(
            sparks[kart.driftLevel],
            kart.x - fx * 0.9 - fz * side,
            kart.y + 0.1,
            kart.z - fz * 0.9 + fx * side,
            kart.driftLevel ? 2 : 1,
            0.1,
          );
      if (puff && kart.grass && !kart.airborne && Math.abs(kart.speed) > 6)
        burst(dust, kart.x - fx, kart.y + 0.2, kart.z - fz, 2, 0.5);
      if (puff && kart.bell > 0) burst(stars, kart.x, kart.y + 1.2, kart.z, 2, 1.2);
      if (puff && kart.cloud > 0) burst(puffs, kart.x - fx * 1.6, kart.y + 0.8, kart.z - fz * 1.6, 2, 0.7);
      if (puff && kart.mud && Math.abs(kart.speed) > 4) burst(mudSpray, kart.x - fx, kart.y + 0.2, kart.z - fz, 3, 0.5);
      if (puff && kart.inked > 0) burst(ink, kart.x, kart.y + 1.7, kart.z, 1, 0.3);
      // A wisp from the exhausts when pulling away.
      if (puff && kart.throttle > 0 && kart.speed < 22 && kart.boost <= 0)
        burst(exhaust, kart.x - fx * 1.55, kart.y + 0.74, kart.z - fz * 1.55, 1, 0.12);
      if (kart.draft > 0.3)
        burst(
          wind,
          kart.x + fx * (2 + Math.random() * 3) + fz * (Math.random() * 3 - 1.5),
          kart.y + 0.4 + Math.random() * 1.2,
          kart.z + fz * (2 + Math.random() * 3) - fx * (Math.random() * 3 - 1.5),
          1,
          0.05,
        );
    });
    // Tyre marks follow the rear wheels while a drift is held.
    race.karts.forEach((kart, index) => {
      const fx = Math.sin(kart.heading),
        fz = Math.cos(kart.heading);
      skids[index]?.forEach((trail, side) => {
        const across = side ? 0.82 : -0.82;
        if (kart.drifting && !kart.airborne && !shown)
          trail.push(kart.x - fx * 0.86 - fz * across, kart.y + 0.05, kart.z - fz * 0.86 + fx * across);
        trail.update(dt);
        trail.visible = trail.pointCount > 1 && !shown;
      });
    });

    // Item boxes turn and bob; taken ones are hidden until they return.
    let n = 0;
    for (const box of race.boxes) {
      if (box.timer > 0) continue;
      position[0] = box.x;
      position[1] = box.y + 1.7 + Math.sin(time * 2.2 + box.index) * 0.18;
      position[2] = box.z;
      boxes.setTransformAt(n++, position, quatFromEuler(turn, 0.3, time * 1.4 + box.index, 0.2), 1);
    }
    boxes.count = n;

    // Coins spin on the spot; drums roll across the road.
    n = 0;
    for (const coin of race.coins) {
      if (coin.timer > 0) continue;
      position[0] = coin.x;
      position[1] = coin.y + 1.05 + Math.sin(time * 3 + coin.index * 0.7) * 0.08;
      position[2] = coin.z;
      coins.setTransformAt(n++, position, yawQuat(time * 3.2 + coin.index * 0.5), 1);
    }
    coins.count = n;
    race.drums.forEach((drum, index) => {
      position[0] = drum.x;
      position[1] = drum.y + drum.radius;
      position[2] = drum.z;
      drums.setTransformAt(index, position, quatFromEuler(turn, 0, drum.heading, -drum.roll), 1);
    });
    drums.count = race.drums.length;

    // Rings widen and fade; thunderbolts flicker out.
    for (const slot of rings) {
      if (!slot.mesh.visible) continue;
      slot.age += dt;
      const k = Math.min(1, slot.age / slot.life);
      slot.mesh.setScale(slot.from + (slot.to - slot.from) * (1 - (1 - k) * (1 - k)));
      slot.mesh.material.opacity = (1 - k) * 0.9;
      if (k >= 1) slot.mesh.visible = false;
    }
    boltTime = Math.max(0, boltTime - dt);
    bolts.count = boltTime > 0 && Math.floor(boltTime * 30) % 2 === 0 ? boltTargets.length : 0;
    boltTargets.forEach((index, slot) => {
      const kart = race.karts[index];
      position[0] = kart.x;
      position[1] = kart.y;
      position[2] = kart.z;
      bolts.setTransformAt(slot, position, yawQuat(index + Math.floor(boltTime * 20)), 1);
    });

    // Blossom drifts where the camera is; fireworks go up over the grandstand on the title and after the flag.
    petals.setPosition(
      camera.position[0] + Math.sin(rig.yaw ?? 0) * 16,
      camera.position[1] + 7,
      camera.position[2] + Math.cos(rig.yaw ?? 0) * 16,
    );
    fireworkWait -= dt;
    if (fireworkWait <= 0 && (shot === 'title' || watched.finished)) {
      fireworkWait = 0.5 + Math.random() * 1.1;
      const at = track.sample(20 + Math.random() * 60, -(26 + Math.random() * 30), spot);
      burst(fireworks[fireworkPick++ % fireworks.length], at.x, at.y + 30 + Math.random() * 16, at.z, 90, 0.5);
    }

    // Items in play.
    const counts = { firecracker: 0, cuju: 0, kite: 0, rocket: 0 };
    for (const thing of race.things) {
      const mesh = shapes[thing.kind],
        slot = counts[thing.kind]++;
      if (slot >= mesh.capacity) continue;
      position[0] = thing.x;
      position[2] = thing.z;
      if (thing.kind === 'firecracker') {
        position[1] = thing.y;
        mesh.setTransformAt(slot, position, yawQuat(thing.age * 0.6), 1 + Math.sin(thing.age * 9) * 0.04);
        if (puff) burst(sparks[2], thing.x + 0.05, thing.y + 1.45, thing.z + 0.06, 1, 0.03);
      } else if (thing.kind === 'cuju') {
        position[1] = thing.y + 0.62 + Math.abs(Math.sin(thing.age * 9)) * 0.5;
        mesh.setTransformAt(slot, position, quatFromEuler(turn, thing.age * 14, Math.atan2(thing.vx, thing.vz), 0), 1);
      } else if (thing.kind === 'kite') {
        position[1] = thing.y + 1.5 + Math.sin(thing.age * 7) * 0.15;
        mesh.setTransformAt(slot, position, quatFromEuler(turn, -0.25, thing.heading, Math.sin(thing.age * 5) * 0.3), 1.2);
      } else {
        position[1] = thing.y + 1;
        mesh.setTransformAt(slot, position, quatFromEuler(turn, thing.dive > 0 ? 1.2 : -0.15, thing.heading, thing.age * 6), 1.3);
        burst(flame, thing.x - Math.sin(thing.heading) * 1.2, position[1], thing.z - Math.cos(thing.heading) * 1.2, 3, 0.2);
        if (puff) burst(smoke, thing.x, position[1], thing.z, 1, 0.2);
      }
    }
    for (const kind in counts) shapes[kind].count = Math.min(counts[kind], shapes[kind].capacity);

    // Camera.
    if (shot === 'select' && shown) orbit(shown.at.x, shown.at.y, shown.at.z, shown.at.heading + 2.6 + time * 0.35, 5.4, 1.9);
    else if (shot === 'title') {
      rig.orbit += dt * 0.12;
      orbit(watched.x, watched.y, watched.z, watched.heading + Math.PI + Math.sin(rig.orbit) * 1.2, 9, 3.2);
    } else if (shot === 'intro') {
      // From high in front of the grid round to the chase position.
      const ease = sweep * sweep * (3 - 2 * sweep);
      orbit(watched.x, watched.y, watched.z, watched.heading + Math.PI * ease, 26 - ease * 19, 13 - ease * 9.9);
      rig.yaw = watched.heading;
      rig.y = camera.position[1];
    } else chase(watched, dt, lookBack);
    rig.fov += (rig.fovTarget - rig.fov) * Math.min(1, dt * 6);
    camera.fov = rig.fov;
    camera.updateProjectionMatrix();
    if (view.shake > 0) {
      const p = camera.position,
        k = view.shake * view.shake * 0.5;
      camera.setPosition(p[0] + (Math.random() - 0.5) * k, p[1] + (Math.random() - 0.5) * k, p[2] + (Math.random() - 0.5) * k);
      view.shake = Math.max(0, view.shake - dt * 2.4);
    }
    view.flash = Math.max(0, view.flash - dt * 2);
    camera.updateWorldMatrix();
    camera.updateViewMatrices();
  };

  /** Turn what just happened in the race into particles and camera shake. */
  view.consume = (events, race) => {
    const mine = race.human?.index;
    for (const event of events) {
      const kart = event.kart === undefined ? undefined : race.karts[event.kart];
      if (event.type === 'hit') {
        burst(stars, kart.x, kart.y + 1, kart.z, 26, 0.5);
        if (event.kart === mine) view.shake = Math.max(view.shake, 0.8);
      } else if (event.type === 'wall') {
        burst(stars, kart.x, kart.y + 0.6, kart.z, 8, 0.4);
        if (event.kart === mine) view.shake = Math.max(view.shake, event.hard ? 0.6 : 0.35);
      } else if (event.type === 'bump') {
        burst(stars, (kart.x + race.karts[event.other].x) / 2, kart.y + 0.7, (kart.z + race.karts[event.other].z) / 2, 6, 0.3);
        if (event.kart === mine || event.other === mine) view.shake = Math.max(view.shake, 0.3);
      } else if (event.type === 'land') {
        burst(dust, kart.x, kart.y + 0.2, kart.z, event.ramp ? 22 : 8, 0.8);
        if (event.ramp) ring(kart.x, kart.y, kart.z, 0.8, 4, 0.4, [1, 0.95, 0.8]);
        if (event.kart === mine) rig.dipSpeed -= event.ramp ? 5 : 2;
      } else if (event.type === 'boost') {
        // A kick of speed: the view widens and a ring flares under the kart.
        if (event.kart === mine) rig.kick = event.source === 'turbo' || event.source === 'draft' ? 7 : 11;
        ring(kart.x, kart.y, kart.z, 0.6, 3.2, 0.35, event.source === 'gate' ? [1.2, 1.2, 1.3] : [1.4, 0.9, 0.3]);
        if (event.source === 'gate') burst(puffs, kart.x, kart.y + 1.6, kart.z, 16, 1.4);
      } else if (event.type === 'coin') {
        const coin = race.coins[event.coin];
        burst(stars, coin.x, coin.y + 1.1, coin.z, 7, 0.2);
      } else if (event.type === 'mud') burst(mudSpray, kart.x, kart.y + 0.3, kart.z, 26, 0.9);
      else if (event.type === 'thud') {
        burst(stars, kart.x, kart.y + 0.8, kart.z, 10, 0.4);
        burst(dust, kart.x, kart.y + 0.4, kart.z, 8, 0.6);
        if (event.kart === mine) view.shake = Math.max(view.shake, event.hard ? 0.7 : 0.4);
      } else if (event.type === 'blocked') {
        burst(jade, kart.x, kart.y + 1, kart.z, 40, 0.8);
        ring(kart.x, kart.y + 0.8, kart.z, 1, 4.5, 0.45, [0.4, 1.3, 0.9]);
      } else if (event.type === 'gong') {
        ring(event.x, event.y, event.z, 1, 14, 0.5, [1.6, 1.2, 0.4]);
        ring(event.x, event.y + 0.6, event.z, 0.5, 10, 0.65, [1.6, 1.4, 0.8]);
        burst(stars, event.x, event.y + 1, event.z, 40, 1.5);
        view.shake = Math.max(
          view.shake,
          Math.hypot(event.x - (race.human?.x ?? 1e6), event.z - (race.human?.z ?? 1e6)) < 30 ? 0.8 : 0,
        );
      } else if (event.type === 'ink') {
        for (const index of event.targets)
          burst(ink, race.karts[index].x, race.karts[index].y + 1.4, race.karts[index].z, 30, 0.8);
      } else if (event.type === 'use' && event.item === 'cloud') burst(puffs, kart.x, kart.y + 0.6, kart.z, 30, 1.2);
      else if (event.type === 'trick') burst(stars, kart.x, kart.y + 1, kart.z, 16, 0.6);
      else if (event.type === 'turbo') burst(sparks[event.level], kart.x, kart.y + 0.4, kart.z, 24, 0.6);
      else if (event.type === 'box') {
        const box = race.boxes[event.box];
        confetti(box.x, box.y + 1.7, box.z, 24);
      } else if (event.type === 'pop') {
        if (event.kind === 'firecracker') {
          confetti(event.x, event.y + 0.8, event.z, 60);
          burst(fire, event.x, event.y + 0.8, event.z, 14, 0.4);
        } else burst(smoke, event.x, event.y + 1, event.z, 14, 0.5);
      } else if (event.type === 'bounce') burst(dust, event.x, event.y + 0.5, event.z, 5, 0.3);
      else if (event.type === 'explosion') {
        burst(fire, event.x, event.y + 1.5, event.z, 120, 2);
        burst(smoke, event.x, event.y + 2, event.z, 40, 2.5);
        confetti(event.x, event.y + 2, event.z, 80);
        view.shake = Math.max(view.shake, 1.1);
      } else if (event.type === 'thunder') {
        boltTime = 0.45;
        boltTargets = race.karts.filter((other) => other.index !== event.kart && other.shrink > 0).map((other) => other.index);
        view.flash = 1;
        view.shake = Math.max(view.shake, 0.7);
      } else if (event.type === 'finish') confetti(kart.x, kart.y + 3, kart.z, event.kart === mine ? 200 : 60);
    }
  };

  return view;
}
