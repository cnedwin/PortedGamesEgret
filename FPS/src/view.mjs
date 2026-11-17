// Everything that is drawn: the station, the soldiers, the weapon in hand and
// the effects. The view only reads the game; it is fed the game's events and
// asked once a frame to bring the scene up to date.
import {
  InstancedMesh3D,
  PlanarReflection3D,
  Mesh3D,
  Object3D,
  createAmbientLight3D,
  createBoxGeometry3D,
  createDirectionalLight3D,
  createHemisphereLight3D,
  createParticleEmitter3D,
  createPointLight3D,
  createQuadGeometry3D,
  createRingGeometry3D,
  createSphereGeometry3D,
  createStandardMaterial3D,
  createUnlitMaterial3D,
  createDecal3D,
  createPhysicsWorld3D,
  createSpotLight3D,
} from '@egret/engine/world3d';
import { addModel } from './asset-models.mjs';
import { createBuilder, orient, rgb } from './build.mjs';
import { ENEMY_BODY, MISSION, PLAYER } from './data.mjs';
import { createGun } from './gun.mjs';
import { setRain } from './grime.mjs';
import { BOXES, PLACES } from './level.mjs';
import { buildScenery } from './scenery.mjs';
import { createSoldierFactory } from './soldier.mjs';
import { canvasTexture, createSurfaces, dotTexture, skyTexture } from './textures.mjs';

/** Colours for the six rarities of loot, common to rarest, as [r, g, b] in 0..1. */
export const RARITY_COLOURS = [
  [0.8, 0.8, 0.8],
  [0.85, 0.85, 0.85],
  [0.35, 0.8, 0.4],
  [0.3, 0.6, 1],
  [0.72, 0.4, 1],
  [1, 0.75, 0.2],
  [1, 0.3, 0.25],
];

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function createView(scene, camera, options = {}) {
  const view = { shake: 0, flash: 0 };
  const models = options.models ?? {};
  function visual(geometry, material, art, placement = {}) {
    if (art) {
      const pivot = new Object3D();
      addModel(pivot, art, geometry.boundingBox, placement);
      return pivot;
    }
    const mesh = new Mesh3D(geometry, material);
    mesh.castShadow = true;
    return mesh;
  }
  const uniformMount = (art, size, axis = 1) => {
    const bounds = art.bounds, scale = size / (bounds[axis + 3] - bounds[axis]);
    return { scale, position: [-(bounds[0] + bounds[3]) * scale / 2, -bounds[1] * scale,
      -(bounds[2] + bounds[5]) * scale / 2] };
  };
  const mountedPoint = (transform, point) => point.map((value, axis) => value * transform.scale + transform.position[axis]);

  // ---- sky and light: first light over the valley ------------------------------------------
  const sky = skyTexture([0.72, 0.4, 0.56]);
  scene.background = sky;
  scene.environment = sky;
  scene.environmentIntensity = 0.34;
  scene.fog = { kind: 'linear', color: [0.5, 0.4, 0.34], near: 60, far: 560 };
  scene.addChild(createHemisphereLight3D({ color: 0xa9c4e8, groundColor: 0x6a6258, intensity: 0.75 }));
  scene.addChild(createAmbientLight3D({ intensity: 0.05 }));
  const sun = createDirectionalLight3D({ color: 0xffd2a0, intensity: 2.1, castShadow: true });
  sun.setPosition(60, 34, 46).lookAt(0, 0, 0);
  Object.assign(sun.shadow, { cascades: 3, cascadeDistance: 70, mapSize: options.shadowSize ?? 2048 });
  scene.addChild(sun);

  const { wet, meshes } = buildScenery(scene, createSurfaces(), models);

  // ---- rain: wet ground that mirrors the scene, and streaks falling round the camera -------
  const GROUND = [0, 1, 0, 0],
    DETAIL = 2;
  const mirror = new PlanarReflection3D({ width: 768, height: 432 });
  mirror.shadows = false;
  mirror.interval = 2;
  mirror.layerMask = ~DETAIL;
  let mirrorOn = true;
  for (const { material } of wet.materials) {
    material.reflectionMap = mirror.texture;
    material.reflectionDistortion = 0.035;
    material.touch();
  }
  /** Switch the mirror image on the wet ground on or off (it costs a second, smaller drawing of the scene). */
  view.setReflections = (on) => {
    mirrorOn = on;
    for (const { material, strength } of wet.materials) material.reflectionStrength = on ? strength : 0;
  };
  view.setReflections(true);
  /** Draw the mirror image; call once a frame before the scene is drawn. */
  view.renderReflection = (renderer) => {
    if (mirrorOn) mirror.render(renderer, scene, camera, GROUND, wet.meshes);
  };
  const DROPS = 420,
    RAIN_BOX = 24,
    RAIN_HEIGHT = 13;
  const rain = new InstancedMesh3D(
    createBoxGeometry3D({ width: 1, height: 1, depth: 1 }),
    createUnlitMaterial3D({ color: 0xc9d4de, opacity: 0.2, alphaMode: 'blend', depthWrite: false, fog: false }),
    DROPS,
  );
  rain.frustumCulled = false;
  rain.layers = DETAIL;
  scene.addChild(rain);
  const drops = Array.from({ length: DROPS }, (_, i) => ({
    x: ((i * 7919) % 1000) / 1000,
    z: ((i * 104729) % 1000) / 1000,
    phase: ((i * 31337) % 1000) / 1000,
    speed: 11 + (i % 7),
  }));
  const dropAt = [0, 0, 0],
    dropSize = [0.005, 0.6, 0.005],
    wrap = (v, around) => around + ((((v - around) % RAIN_BOX) + RAIN_BOX * 1.5) % RAIN_BOX) - RAIN_BOX / 2;
  function updateRain(time, game) {
    const cx = camera.position[0],
      cy = camera.position[1],
      cz = camera.position[2];
    for (let i = 0; i < DROPS; i++) {
      const drop = drops[i];
      // Each streak keeps its place in the world and falls through a box that follows the camera.
      dropAt[0] = wrap(drop.x * RAIN_BOX, cx);
      dropAt[2] = wrap(drop.z * RAIN_BOX, cz);
      dropAt[1] = cy - 4 + RAIN_HEIGHT - ((time * drop.speed + drop.phase * RAIN_HEIGHT) % RAIN_HEIGHT);
      const hidden = dropAt[1] < 0.2 || game.isIndoors(dropAt[0], dropAt[2]);
      rain.setTransformAt(i, dropAt, undefined, hidden ? 0.0001 : dropSize);
    }
    rain.count = DROPS;
    setRain(time, 1);
  }

  // Lamps. Indoors they carry the scene; outdoors they only warm the ground at dawn.
  // The renderer lights with a handful of point lights at a time, so only the
  // ones nearest the camera are lit; the rest fade out.
  const NEAR_LIGHTS = 5,
    managed = [];
  const manage = (light, x, z) => {
    managed.push({ light, x, z, full: light.intensity, share: 0, distance: 0 });
    light.intensity = 0;
    scene.addChild(light);
    return light;
  };
  // Floodlights on the two towers: spotlights that cast shadows, each with a visible beam in the rain.
  const beamMaterial = createUnlitMaterial3D({
    color: 0xfff0cf,
    opacity: 0.026,
    alphaMode: 'blend',
    blending: 'additive',
    depthWrite: false,
    side: 'double',
    toneMapped: false,
    fog: false,
  });
  /** A soft cone of light from `from` towards `to`, `spread` wide at its far end. */
  const lightCone = (from, to, spread) => {
    const cone = new Mesh3D(createBuilder().limb(from, to, 0.12, spread, { sides: 18, caps: false }).finish(), beamMaterial);
    cone.frustumCulled = false;
    cone.layers = 2;
    scene.addChild(cone);
  };
  for (const [x, z, tx, tz] of [
    [-8.5, 26, 2, 12],
    [-36.4, -11, -24, -2],
  ]) {
    const flood = createSpotLight3D({ color: 0xfff0cf, intensity: 60, range: 46, angle: 0.5, penumbra: 0.5, castShadow: true });
    flood.setPosition(x, 9.4, z).lookAt(tx, 0, tz);
    scene.addChild(flood);
    lightCone([x, 9.4, z], [tx, 0.2, tz], 5);
  }
  // Each lamp post throws a fainter cone straight down.
  for (const [x, y, z] of PLACES.lamps)
    if (y > 5 && y < 6.8 && !(x > -8 && x < 16 && z < -8)) lightCone([x, y - 0.1, z], [x, 0.1, z], 3.2);
  for (const [x, y, z, strength] of PLACES.lamps) {
    const lamp = createPointLight3D({ color: 0xffd9a8, intensity: 24 * strength, range: 20 });
    lamp.setPosition(x, y - 0.3, z);
    manage(lamp, x, z);
  }
  function updateLights(dt, cx, cz) {
    for (const item of managed) item.distance = Math.hypot(item.x - cx, item.z - cz);
    managed.sort((a, b) => a.distance - b.distance);
    managed.forEach((item, i) => {
      const want = i < NEAR_LIGHTS && item.full > 0 ? 1 : 0;
      item.share += Math.sign(want - item.share) * Math.min(Math.abs(want - item.share), dt * 2.5);
      item.light.intensity = item.full * item.share;
    });
  }

  // ---- the data terminals ------------------------------------------------------------------
  const plainMaterial = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.6, metallic: 0.3 });
  const screenTexture = (lines, colour) =>
    canvasTexture(256, 160, (c, w, h) => {
      c.fillStyle = '#04090c';
      c.fillRect(0, 0, w, h);
      c.fillStyle = colour;
      c.font = 'bold 22px monospace';
      lines.forEach((line, i) => c.fillText(line, 12, 34 + i * 30));
      c.globalAlpha = 0.5;
      for (let i = 0; i < 9; i++) c.fillRect(12, 104 + i * 6, 40 + ((i * 53) % 180), 2);
    });
  const screenLive = screenTexture(['UPLINK  ONLINE', '> 加密数据', '> SECURE 4/4'], '#58e0ff'),
    screenDone = screenTexture(['DOWNLOAD', 'COMPLETE', '> 已下载'], '#6dff8a');
  // Beacons start above head height so standing at one does not fill the view.
  const beamGeometry = createBuilder().cylinder(0, 24, 0, 0.16, 40, { sides: 8, caps: false }).finish();
  const beam = (x, z, colour) => {
    const mesh = new Mesh3D(
      beamGeometry,
      createUnlitMaterial3D({
        color: colour,
        opacity: 0.2,
        alphaMode: 'blend',
        blending: 'additive',
        depthWrite: false,
        side: 'double',
        toneMapped: false,
        fog: false,
      }),
    );
    mesh.setPosition(x, 0, z);
    mesh.frustumCulled = false;
    scene.addChild(mesh);
    return mesh;
  };
  const terminals = PLACES.terminals.map((place) => {
    const node = new Object3D();
    node.setPosition(place.x, 0, place.z);
    orient(node, place.facing + Math.PI);
    const kit = createBuilder();
    // A rugged case on a stand, with an aerial.
    kit.box(0, 0.45, 0, 0.7, 0.9, 0.5, { tint: rgb(0x3b4238) });
    kit.box(0, 0.93, 0.02, 0.76, 0.06, 0.56, { tint: rgb(0x23262a) });
    kit.box(0, 1.2, -0.2, 0.74, 0.5, 0.05, { tint: rgb(0x23262a), pitch: -0.18 });
    kit.cylinder(0.3, 1.5, -0.22, 0.012, 1.1, { sides: 6, tint: rgb(0x23262a) });
    const terminalArt = models.terminal?.parts.body ?? models.terminal;
    const terminalMount = terminalArt ? uniformMount(terminalArt, 1.85) : undefined;
    const body = visual(kit.finish(), plainMaterial, terminalArt, { transform: terminalMount });
    node.addChild(body);
    const screenMaterial = createUnlitMaterial3D({ color: 0xffffff, map: screenLive, toneMapped: false });
    const screen = new Mesh3D(createQuadGeometry3D(), screenMaterial);
    // Place the status texture over the authored chassis's recessed screen.
    // Both bodies keep the same interactive point and live/done display.
    screen.setPosition(...(terminalMount ? mountedPoint(terminalMount, [0, 0.75, 0.1845]) : [0, 1.2, -0.168]));
    screen.setScale(terminalMount ? 0.202 * terminalMount.scale : 0.66, terminalMount ? 0.135 * terminalMount.scale : 0.42, 1);
    orient(screen, 0, terminalMount ? -0.25 : -0.18);
    node.addChild(screen);
    scene.addChild(node);
    const light = createPointLight3D({ color: 0x58e0ff, intensity: 1.1, range: 4.5 });
    light.setPosition(place.x - Math.sin(place.facing) * 0.4, 1.3, place.z - Math.cos(place.facing) * 0.4);
    manage(light, place.x, place.z);
    return { place, screenMaterial, light, beam: beam(place.x, place.z, 0x58e0ff) };
  });
  const extractBeam = beam(PLACES.helipad.x, PLACES.helipad.z, 0x6dff8a);
  extractBeam.visible = false;

  // The relay marker stays near the floor and can be hidden by walls like other world objects.
  const relayBeacon = new Object3D();
  relayBeacon.name = 'relay-beacon';
  relayBeacon.setPosition(0, 0.045, 0);
  relayBeacon.visible = false;
  const relayGlow = createUnlitMaterial3D({ color: 0xffb347, opacity: 0.65, alphaMode: 'blend', depthWrite: false, toneMapped: false });
  const relayRing = new Mesh3D(createRingGeometry3D({ innerRadius: 0.58, outerRadius: 0.64, thetaSegments: 24 }), relayGlow);
  relayRing.setRotation(-Math.PI / 2, 0, 0);
  const relayPost = new Mesh3D(createBoxGeometry3D({ width: 0.055, height: 0.62, depth: 0.055 }), relayGlow);
  relayPost.setPosition(0, 0.31, 0);
  relayRing.layers = relayPost.layers = DETAIL;
  relayRing.castShadow = relayPost.castShadow = false;
  relayRing.receiveShadow = relayPost.receiveShadow = false;
  relayBeacon.addChild(relayRing);
  relayBeacon.addChild(relayPost);
  scene.addChild(relayBeacon);

  // ---- supply crates: a box, a lid that swings up, and a glow once searched ---------------
  const crateBody = createBuilder()
      .box(0, 0.26, 0, 1.05, 0.52, 0.62, { tint: rgb(0x4b5a3d) })
      .box(0, 0.26, -0.315, 0.22, 0.14, 0.02, { tint: rgb(0xd9a520) })
      .finish(),
    crateLid = createBuilder()
      .box(0, 0.04, -0.31, 1.07, 0.08, 0.64, { tint: rgb(0x55664a) })
      .finish();
  let crates = [];
  const authoredCrate = models['supply-crate'];
  const crateMount = authoredCrate?.parts.body && authoredCrate.parts.lid ? uniformMount(authoredCrate, 1.05, 0) : undefined;
  const hinge = crateMount ? [0, mountedPoint(crateMount, [0, authoredCrate.parts.body.bounds[4], 0])[1],
    mountedPoint(crateMount, [0, 0, authoredCrate.bounds[5]])[2]] : [0, 0.52, 0.31];
  function buildCrates(game) {
    for (const crate of crates) crate.node.removeFromParent();
    crates = game.crates.map((crate) => {
      const node = new Object3D();
      node.setPosition(crate.x, 0, crate.z);
      orient(node, crate.turn);
      const body = visual(crateBody, plainMaterial, models['supply-body'] ?? authoredCrate?.parts.body, { transform: crateMount }),
        lid = visual(crateLid, plainMaterial, models['supply-lid'] ?? authoredCrate?.parts.lid, {
          transform: crateMount && { scale: crateMount.scale, position: crateMount.position.map((value, axis) => value - hinge[axis]) },
        });
      lid.setPosition(...hinge);
      node.addChild(body);
      node.addChild(lid);
      const best = Math.max(...crate.items.map((item) => item.rarity)),
        [r, g, b] = RARITY_COLOURS[best];
      const glow = new Mesh3D(
        createBoxGeometry3D({ width: 0.9, height: 0.03, depth: 0.5 }),
        createUnlitMaterial3D({ color: [r, g, b], toneMapped: false }),
      );
      glow.setPosition(0, hinge[1] - 0.02, 0);
      glow.visible = false;
      node.addChild(glow);
      scene.addChild(node);
      return { crate, node, lid, glow, open: 0 };
    });
  }

  // ---- soldiers ----------------------------------------------------------------------------
  // A physics world of the view's own, holding the map, for things that only need to look right:
  // soldiers going limp when shot. The rules never see it.
  const propWorld = createPhysicsWorld3D({ gravity: [0, -PLAYER.gravity, 0] });
  propWorld.createBody({
    type: 'static',
    shape: { type: 'box', halfExtents: [120, 1, 120] },
    position: [0, -1, 0],
    friction: 0.9,
    layer: 1,
  });
  for (const b of BOXES)
    if (b.solid)
      propWorld.createBody({
        type: 'static',
        shape: { type: 'box', halfExtents: [b.w / 2, b.h / 2, b.d / 2] },
        position: [b.x, b.y, b.z],
        friction: 0.8,
        layer: 1,
      });
  const createSoldier = createSoldierFactory(propWorld, models),
    soldiers = new Map();
  function syncSoldiers(game, dt) {
    const p = game.player;
    for (const enemy of game.enemies) {
      let soldier = soldiers.get(enemy);
      if (!soldier) {
        soldier = createSoldier(enemy.kind);
        soldiers.set(enemy, soldier);
        scene.addChild(soldier.root);
      }
      const distance = Math.hypot(p.x - enemy.x, p.z - enemy.z);
      soldier.update(enemy, dt, Math.atan2(p.y + p.eye - ENEMY_BODY.eye, Math.max(distance, 0.5)));
    }
    if (soldiers.size > game.enemies.length)
      for (const [enemy, soldier] of soldiers)
        if (!game.enemies.includes(enemy)) {
          soldier.dispose();
          soldier.root.removeFromParent();
          soldiers.delete(enemy);
        }
  }

  // ---- effects -----------------------------------------------------------------------------
  const dot = dotTexture(),
    soft = dotTexture(32, 1);
  const emitter = (more) => {
    const node = createParticleEmitter3D({
      capacity: 300,
      rate: 0,
      map: dot,
      space: 'world',
      shape: 'sphere',
      radius: 0.03,
      spread: 0.7,
      gravity: [0, -9, 0],
      drag: 1.5,
      lifetime: [0.3, 0.7],
      speed: [1, 4],
      startSize: 0.1,
      endSize: 0.02,
      startOpacity: 1,
      endOpacity: 0,
      blending: 'normal',
      ...more,
    });
    node.frustumCulled = false;
    scene.addChild(node);
    return node;
  };
  const dust = emitter({
    map: soft,
    startColor: 0xb9b2a6,
    endColor: 0x8d877d,
    startSize: 0.12,
    endSize: 0.7,
    startOpacity: 0.55,
    gravity: [0, 0.4, 0],
    drag: 3,
    lifetime: [0.5, 1.1],
    speed: [0.6, 2.2],
  });
  const chips = emitter({
    startColor: 0x9a958b,
    endColor: 0x6b6760,
    startSize: 0.05,
    endSize: 0.02,
    speed: [2, 6],
    lifetime: [0.3, 0.6],
  });
  const sparks = emitter({
    startColor: 0xfff0b0,
    endColor: 0xff7a20,
    blending: 'additive',
    startSize: 0.07,
    endSize: 0.01,
    speed: [4, 11],
    lifetime: [0.12, 0.35],
    gravity: [0, -6, 0],
  });
  const blood = emitter({
    startColor: 0x7a0f0c,
    endColor: 0x3d0606,
    startSize: 0.09,
    endSize: 0.03,
    speed: [1, 3.5],
    lifetime: [0.25, 0.5],
    spread: 0.9,
  });
  const flashes = emitter({
    capacity: 40,
    startColor: 0xffe2a0,
    endColor: 0xff8a30,
    blending: 'additive',
    startSize: 0.55,
    endSize: 0.2,
    speed: [0, 0.2],
    lifetime: [0.04, 0.07],
    gravity: [0, 0, 0],
    drag: 0,
  });
  const fire = emitter({
    capacity: 200,
    map: soft,
    startColor: 0xffd070,
    endColor: 0xc0300c,
    blending: 'additive',
    startSize: 1.2,
    endSize: 3.4,
    speed: [1, 6],
    lifetime: [0.25, 0.6],
    gravity: [0, 2, 0],
    drag: 2,
    spread: Math.PI,
  });
  const smoke = emitter({
    capacity: 200,
    map: soft,
    startColor: 0x3a3836,
    endColor: 0x7a766f,
    startSize: 1.4,
    endSize: 5,
    startOpacity: 0.7,
    speed: [0.5, 3],
    lifetime: [1.4, 2.8],
    gravity: [0, 1.2, 0],
    drag: 1.5,
    spread: Math.PI,
  });
  const mist = emitter({
    capacity: 48,
    map: soft,
    rate: 5,
    shape: 'box',
    extents: [34, 0.5, 1.5],
    startColor: 0xe8e2da,
    endColor: 0xe8e2da,
    startSize: 4,
    endSize: 10,
    startOpacity: 0.2,
    speed: [0.3, 1.2],
    lifetime: [4, 7],
    gravity: [0, 0.25, 0.25],
    drag: 0.2,
    direction: [0, 0.4, 1],
    spread: 0.6,
  });
  mist.setPosition(-5, 1.2, -27.5);
  const downwash = emitter({
    capacity: 60,
    map: soft,
    rate: 0,
    shape: 'sphere',
    radius: 3,
    startColor: 0xbdb5a8,
    endColor: 0xa9a297,
    startSize: 0.8,
    endSize: 3.5,
    startOpacity: 0.35,
    speed: [3, 7],
    lifetime: [0.7, 1.4],
    gravity: [0, 0.3, 0],
    drag: 1.2,
    direction: [0, 0.05, 0],
    spread: Math.PI / 2,
  });
  downwash.setPosition(PLACES.helipad.x, 0.3, PLACES.helipad.z);

  const burst = (node, x, y, z, count, nx = 0, ny = 1, nz = 0) => {
    node.setPosition(x, y, z);
    node.direction[0] = nx;
    node.direction[1] = ny;
    node.direction[2] = nz;
    node.updateWorldMatrix();
    node.burst(count);
  };

  // Tracers: thin bright streaks that fly from the muzzle to where the shot went.
  const TRACERS = 28;
  const tracerMesh = new InstancedMesh3D(
    createBoxGeometry3D({ width: 1, height: 1, depth: 1 }),
    createUnlitMaterial3D({
      color: 0xffe6a8,
      blending: 'additive',
      depthWrite: false,
      toneMapped: false,
      opacity: 0.85,
      alphaMode: 'blend',
    }),
    TRACERS,
  );
  tracerMesh.frustumCulled = false;
  scene.addChild(tracerMesh);
  const tracers = [];
  const quat = [0, 0, 0, 1];
  /** A rotation that turns the Z axis onto the direction (dx, dy, dz). */
  function aimQuat(dx, dy, dz) {
    const yaw = Math.atan2(dx, dz),
      pitch = -Math.asin(Math.max(-1, Math.min(1, dy)));
    const cy = Math.cos(yaw / 2),
      sy = Math.sin(yaw / 2),
      cp = Math.cos(pitch / 2),
      sp = Math.sin(pitch / 2);
    quat[0] = cy * sp;
    quat[1] = sy * cp;
    quat[2] = -sy * sp;
    quat[3] = cy * cp;
    return quat;
  }
  function tracer(fx, fy, fz, tx, ty, tz, speed) {
    const dx = tx - fx,
      dy = ty - fy,
      dz = tz - fz,
      length = Math.hypot(dx, dy, dz);
    if (length < 2 || tracers.length >= TRACERS) return;
    tracers.push({ fx, fy, fz, dx: dx / length, dy: dy / length, dz: dz / length, length, at: 0, speed });
  }
  const hidden = [0, -100, 0];
  function updateTracers(dt) {
    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i];
      t.at += t.speed * dt;
      if (t.at > t.length) tracers.splice(i, 1);
    }
    for (let i = 0; i < TRACERS; i++) {
      const t = tracers[i];
      if (!t) {
        tracerMesh.setTransformAt(i, hidden, undefined, 0.001);
        continue;
      }
      const streak = Math.min(9, t.length - t.at, t.at + 2),
        middle = t.at + streak / 2 - 1;
      tracerMesh.setTransformAt(
        i,
        [t.fx + t.dx * middle, t.fy + t.dy * middle, t.fz + t.dz * middle],
        aimQuat(t.dx, t.dy, t.dz),
        [0.022, 0.022, Math.max(0.2, streak)],
      );
    }
    tracerMesh.count = TRACERS;
  }

  // Bullet holes: small dark marks, reused in a ring.
  const HOLES = 90;
  const holeMesh = new InstancedMesh3D(
    createQuadGeometry3D(),
    createUnlitMaterial3D({ color: 0x0c0b0a, map: soft, alphaMode: 'blend', depthWrite: false, opacity: 0.85 }),
    HOLES,
  );
  holeMesh.frustumCulled = false;
  holeMesh.count = 0;
  scene.addChild(holeMesh);
  let nextHole = 0;
  // Marks left by shots and blasts, laid onto the surface they hit with the engine's decals so
  // they wrap round edges and corrugations. The oldest are cleared as new ones come.
  const markTexture = (draw) => canvasTexture(128, 128, draw);
  const pit = (c, w, core, ring, cracks) => {
    c.clearRect(0, 0, w, w);
    const glow = c.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w * 0.46);
    glow.addColorStop(0, core);
    glow.addColorStop(0.22, core);
    glow.addColorStop(0.3, ring);
    glow.addColorStop(0.62, ring.replace(/[\d.]+\)$/, '0.35)'));
    glow.addColorStop(1, ring.replace(/[\d.]+\)$/, '0)'));
    c.fillStyle = glow;
    c.fillRect(0, 0, w, w);
    c.strokeStyle = core;
    c.lineWidth = 1.5;
    for (let i = 0; i < cracks; i++) {
      const angle = Math.random() * 6.28,
        reach = w * (0.2 + Math.random() * 0.28);
      c.beginPath();
      c.moveTo(w / 2 + Math.cos(angle) * w * 0.08, w / 2 + Math.sin(angle) * w * 0.08);
      c.lineTo(w / 2 + Math.cos(angle + 0.3) * reach * 0.6, w / 2 + Math.sin(angle + 0.3) * reach * 0.6);
      c.lineTo(w / 2 + Math.cos(angle) * reach, w / 2 + Math.sin(angle) * reach);
      c.stroke();
    }
  };
  const markMaterial = (texture, more) =>
    texture &&
    createStandardMaterial3D({ color: 0xffffff, map: texture, alphaMode: 'blend', depthWrite: false, roughness: 0.9, ...more });
  const markMaterials = {
    // Chipped stone: a dark pit in a pale crater with cracks running out.
    stone: markMaterial(markTexture((c, w) => pit(c, w, 'rgba(18, 16, 14, 0.95)', 'rgba(150, 146, 138, 0.6)', 7))),
    // Punched steel: a black hole ringed with bare bright metal.
    steel: markMaterial(
      markTexture((c, w) => pit(c, w, 'rgba(6, 6, 7, 1)', 'rgba(210, 214, 220, 0.9)', 0)),
      { roughness: 0.35, metallic: 0.8 },
    ),
    // Splintered wood: a dark hole with pale torn fibres.
    wood: markMaterial(markTexture((c, w) => pit(c, w, 'rgba(24, 14, 8, 0.95)', 'rgba(214, 186, 140, 0.7)', 12))),
    scorch: markMaterial(
      markTexture((c, w) => {
        c.clearRect(0, 0, w, w);
        const burn = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        burn.addColorStop(0, 'rgba(8, 7, 6, 0.92)');
        burn.addColorStop(0.45, 'rgba(14, 12, 10, 0.7)');
        burn.addColorStop(1, 'rgba(20, 18, 16, 0)');
        c.fillStyle = burn;
        c.fillRect(0, 0, w, w);
        c.strokeStyle = 'rgba(6, 5, 4, 0.5)';
        for (let i = 0; i < 26; i++) {
          const angle = Math.random() * 6.28;
          c.lineWidth = 1 + Math.random() * 3;
          c.beginPath();
          c.moveTo(w / 2 + Math.cos(angle) * w * 0.12, w / 2 + Math.sin(angle) * w * 0.12);
          c.lineTo(
            w / 2 + Math.cos(angle) * w * (0.3 + Math.random() * 0.2),
            w / 2 + Math.sin(angle) * w * (0.3 + Math.random() * 0.2),
          );
          c.stroke();
        }
      }),
    ),
  };
  /** Which surface mesh each kind of box was built into, and what a shot leaves on it. */
  const SURFACE_OF = {
    ground: ['asphalt', 'stone'],
    dam: ['concrete', 'stone'],
    'dam-step': ['concrete', 'stone'],
    compound: ['concrete', 'stone'],
    barrier: ['concrete', 'stone'],
    plant: ['wall', 'stone'],
    office: ['wall', 'stone'],
    booth: ['wall', 'stone'],
    sandbag: ['sandbag', 'stone'],
    container: ['container', 'steel'],
    'truck-bed': ['container', 'steel'],
    crate: ['wood', 'wood'],
    pallet: ['wood', 'wood'],
    reel: ['wood', 'wood'],
    desk: ['wood', 'wood'],
  };
  const marks = [],
    MARKS = 70;
  function removeMark(mark) {
    mark.removeFromParent();
    // Each projection owns a new geometry. Its material is shared by other marks.
    mark.geometry.dispose();
  }
  function clearMarks() {
    for (const mark of marks.splice(0)) removeMark(mark);
    holeMesh.count = 0;
    nextHole = 0;
  }
  /** Lay a mark where something struck. Returns false when no surface mesh took it. */
  function mark(surface, x, y, z, normal, size, kind) {
    const [first, material] = SURFACE_OF[surface] ?? ['metal', 'steel'],
      using = markMaterials[kind ?? material];
    if (!using) return false;
    // The box list names the likely mesh; a few things are built from more than one surface, so the rest are tried after it.
    for (const name of [first, 'apron', 'metal', 'plain', 'concrete', 'wall']) {
      const target = meshes[name];
      if (!target) continue;
      const decal = createDecal3D(target, using, {
        position: [x, y, z],
        normal,
        width: size,
        height: size,
        depth: 0.12,
        rotation: Math.random() * 6.28,
        offset: 0.004,
      });
      if (!decal) continue;
      decal.receiveShadow = true;
      marks.push(decal);
      if (marks.length > MARKS) removeMark(marks.shift());
      return true;
    }
    return false;
  }
  function hole(x, y, z, normal, size = 0.09) {
    // The quad faces +Z; turn that onto the wall's normal and lift it off the surface a little.
    aimQuat(normal[0], normal[1], normal[2]);
    holeMesh.setTransformAt(
      nextHole,
      [x + normal[0] * 0.012, y + normal[1] * 0.012, z + normal[2] * 0.012],
      quat,
      size * (0.8 + Math.random() * 0.5),
    );
    if (holeMesh.count < HOLES) holeMesh.count++;
    nextHole = (nextHole + 1) % HOLES;
  }

  // Thrown grenades and the light of a blast.
  const grenadeGeometry = createSphereGeometry3D({ radius: 0.07, widthSegments: 8, heightSegments: 6 }),
    grenadeMaterial = createStandardMaterial3D({ color: 0x2f3a2a, roughness: 0.6 }),
    grenadeNodes = [];
  const blast = createPointLight3D({ color: 0xffb060, intensity: 0, range: 30 });
  scene.addChild(blast);

  // ---- the helicopter that comes for the operator ------------------------------------------
  const heli = new Object3D(),
    rotor = new Object3D(),
    tailRotor = new Object3D();
  {
    const hull = createBuilder(),
      olive = rgb(0x3d4733),
      dark = rgb(0x1c1f20);
    hull.box(0, 0, 0, 2, 1.9, 5.2, { tint: olive });
    hull.box(0, 0.2, -3.1, 1.7, 1.4, 1.4, { tint: olive, pitch: 0.25 });
    hull.box(0, 0.45, -3.25, 1.5, 0.7, 1.0, { tint: rgb(0x16242c), pitch: 0.5 });
    hull.box(0, 0.5, 4.6, 0.5, 0.6, 5, { tint: olive });
    hull.box(0, 1.3, 6.8, 0.14, 1.6, 0.9, { tint: olive, pitch: -0.3 });
    hull.box(0, 1.15, 0, 1.2, 0.5, 2.6, { tint: dark });
    for (const side of [-1, 1]) {
      hull.box(side * 1.25, -1.25, 0, 0.12, 0.12, 4.2, { tint: dark });
      for (const z of [-1.2, 1.2]) hull.box(side * 1.12, -0.95, z, 0.08, 0.7, 0.08, { tint: dark, roll: side * 0.35 });
      hull.box(side * 1.02, 0.1, 0.4, 0.04, 1.2, 1.8, { tint: rgb(0x10161a) });
    }
    const authoredHull = models.helicopter?.parts.body ?? models.helicopter;
    const hullMount = authoredHull ? uniformMount(authoredHull, 9, 2) : undefined;
    if (hullMount) {
      hullMount.position[1] -= 1.31;
      hullMount.position[2] = -3.8 - authoredHull.bounds[2] * hullMount.scale;
    }
    const body = visual(hull.finish(), plainMaterial, authoredHull, { transform: hullMount });
    heli.addChild(body);
    const blades = createBuilder();
    for (let i = 0; i < 4; i++)
      blades.box(
        Math.cos((i * Math.PI) / 2) * 3.4,
        0,
        Math.sin((i * Math.PI) / 2) * 3.4,
        i % 2 ? 0.34 : 6.8,
        0.04,
        i % 2 ? 6.8 : 0.34,
        { tint: dark },
      );
    const disc = new Mesh3D(blades.finish(), plainMaterial);
    disc.castShadow = true;
    rotor.addChild(disc);
    rotor.setPosition(...(hullMount ? mountedPoint(hullMount, [0, 0.413, -0.09]) : [0, 1.65, 0]));
    if (hullMount) rotor.setScale(0.935 * hullMount.scale / 13.6);
    heli.addChild(rotor);
    const small = new Mesh3D(
      createBuilder().box(0, 0, 0, 0.05, 1.7, 0.16, { tint: dark }).box(0, 0, 0, 0.05, 0.16, 1.7, { tint: dark }).finish(),
      plainMaterial,
    );
    tailRotor.addChild(small);
    tailRotor.setPosition(...(hullMount ? mountedPoint(hullMount, [-0.028, 0.395, 0.427]) : [0.14, 1.6, 6.9]));
    if (hullMount) tailRotor.setScale(0.13 * hullMount.scale / 1.7);
    heli.addChild(tailRotor);
    heli.visible = false;
    scene.addChild(heli);
  }
  let heliT = 0;
  /** How near the helicopter is, 0 (not called) to 1 (hovering over the pad); the sound follows it. */
  view.helicopter = 0;

  // ---- the weapon in hand ------------------------------------------------------------------
  const gun = createGun(camera, models);
  // The weapon and its flash stay out of the ground's mirror image.
  for (const child of camera.children) child.traverse((node) => void (node.layers = 2));
  view.gun = gun;
  let lastYaw = 0,
    lastPitch = 0,
    fov = options.fov ?? 72,
    spinT = 0;
  view.setFov = (value) => {
    fov = value;
  };
  view.setShadowSize = (size) => {
    sun.shadow.mapSize = size;
  };

  /** Start showing a new run. */
  view.attach = (game) => {
    buildCrates(game);
    for (const soldier of soldiers.values()) {
      soldier.dispose();
      soldier.root.removeFromParent();
    }
    clearMarks();
    soldiers.clear();
    tracers.length = 0;
    for (const terminal of terminals) {
      terminal.screenMaterial.map = screenLive;
      terminal.light.color.set(rgb(0x58e0ff));
      terminal.beam.visible = true;
    }
    extractBeam.visible = false;
    relayBeacon.visible = false;
    heli.visible = false;
    heliT = 0;
    view.helicopter = 0;
    downwash.rate = 0;
    lastYaw = game.player.yaw;
    lastPitch = game.player.pitch;
  };

  /** React to one event from the game. */
  view.handle = (event, game) => {
    const p = game.player;
    switch (event.type) {
      case 'shot': {
        gun.fire(event.weapon, p.aim);
        // Start the streak at the muzzle, not at the eye.
        const off = gun.muzzleOffset(p.aim),
          sin = Math.sin(p.yaw),
          cos = Math.cos(p.yaw);
        const fx = event.fromX + cos * off[0] + sin * off[2],
          fz = event.fromZ - sin * off[0] + cos * off[2];
        tracer(fx, event.fromY + off[1], fz, event.toX, event.toY, event.toZ, 260);
        view.shake = Math.min(1, view.shake + (event.weapon === 'pistol' ? 0.16 : 0.1));
        if (event.enemy)
          burst(
            blood,
            event.toX,
            event.toY,
            event.toZ,
            event.head ? 14 : 8,
            -(event.toX - event.fromX),
            0.3,
            -(event.toZ - event.fromZ),
          );
        else if (event.normal) {
          const [nx, ny, nz] = event.normal,
            hard =
              event.surface === 'container' ||
              event.surface === 'generator' ||
              event.surface === 'roof' ||
              event.surface === 'transformer' ||
              event.surface?.startsWith('truck');
          burst(hard ? sparks : chips, event.toX, event.toY, event.toZ, hard ? 9 : 7, nx, ny + 0.2, nz);
          burst(dust, event.toX, event.toY, event.toZ, 3, nx, ny + 0.2, nz);
          if (!mark(event.surface, event.toX, event.toY, event.toZ, event.normal, hard ? 0.09 : 0.13))
            hole(event.toX, event.toY, event.toZ, event.normal);
        }
        break;
      }
      case 'enemyShot': {
        const e = event.enemy,
          mx = e.x - Math.sin(e.yaw) * 0.9,
          mz = e.z - Math.cos(e.yaw) * 0.9;
        burst(flashes, mx, 1.28, mz, 1);
        tracer(mx, 1.28, mz, event.toX, event.toY, event.toZ, 190);
        if (!event.hit) burst(chips, event.toX, event.toY, event.toZ, 4, 0, 1, 0);
        break;
      }
      case 'playerHit':
        view.shake = Math.min(1.4, view.shake + 0.45);
        break;
      case 'explosion':
        burst(fire, event.x, event.y + 0.4, event.z, 46);
        burst(smoke, event.x, event.y + 0.6, event.z, 30);
        burst(sparks, event.x, event.y + 0.3, event.z, 60, 0, 1, 0);
        burst(chips, event.x, event.y + 0.2, event.z, 40, 0, 1, 0);
        if (!mark('ground', event.x, 0, event.z, [0, 1, 0], 4.2, 'scorch')) hole(event.x, 0.001, event.z, [0, 1, 0], 2.6);
        blast.setPosition(event.x, event.y + 1, event.z);
        view.flash = 1;
        view.shake = Math.min(2, view.shake + 1.6 * clamp01(1.3 - Math.hypot(event.x - p.x, event.z - p.z) / 18));
        break;
      case 'reload':
        gun.reload(event.seconds);
        break;
      case 'land':
        gun.land(event.speed);
        view.shake = Math.min(1, view.shake + event.speed * 0.02);
        break;
      case 'uplink':
        // Amber while the data is going out.
        terminals[event.terminal.index].light.color.set(rgb(0xffb347));
        break;
      case 'terminal': {
        const terminal = terminals[event.terminal.index];
        terminal.screenMaterial.map = screenDone;
        terminal.light.color.set(rgb(0x6dff8a));
        terminal.beam.visible = false;
        if (event.done === event.total) extractBeam.visible = true;
        break;
      }
      default:
    }
  };

  /** Bring the scene up to date. `mode` is 'play' or 'title'; `time` runs on while paused pictures stand still. */
  view.update = (dt, game, mode, time) => {
    const p = game.player,
      playing = mode === 'play';

    // Camera: at the eye when playing, circling the station on the title screen.
    view.shake *= Math.exp(-dt * 9);
    view.flash *= Math.exp(-dt * 12);
    blast.intensity = view.flash * 60;
    if (playing) {
      const s = view.shake,
        jx = (Math.sin(time * 61) + Math.sin(time * 37.7)) * 0.006 * s,
        jy = (Math.sin(time * 53.3) + Math.cos(time * 41.1)) * 0.006 * s;
      camera.setPosition(p.x, p.y + p.eye, p.z);
      const dead = game.state === 'dead' ? Math.min(1, (view.deadFor = (view.deadFor ?? 0) + dt) / 0.8) : ((view.deadFor = 0), 0);
      // When the operator goes down the view slumps sideways to the ground.
      if (dead) camera.setPosition(p.x, p.y + p.eye - dead * (p.eye - 0.35), p.z);
      orient(camera, p.yaw + jx, p.pitch + p.kick + jy - dead * 0.25, jx * 2 + dead * 0.9);
      const aimFov = game.weapons[p.weapon].def.aimFov,
        want = fov * (1 + (aimFov - 1) * p.aim) + (p.sprinting ? 5 : 0);
      camera.fov += (want - camera.fov) * Math.min(1, dt * 12);
    } else {
      spinT += dt * 0.05;
      const cx = Math.sin(spinT) * 44,
        cz = Math.cos(spinT) * 40 + 4;
      camera.setPosition(cx, 15 + Math.sin(spinT * 2.3) * 3, cz);
      orient(camera, Math.atan2(cx - 2, cz + 6), -0.3);
      camera.fov += (50 - camera.fov) * Math.min(1, dt * 4);
    }
    const turn = p.yaw - lastYaw,
      tilt = p.pitch - lastPitch;
    lastYaw = p.yaw;
    lastPitch = p.pitch;
    gun.update(dt, game, turn, tilt, playing && game.state !== 'dead' && game.state !== 'won');

    updateLights(dt, camera.position[0], camera.position[2]);
    if (dt > 0) propWorld.step(Math.min(dt, 0.05));
    updateRain(time, game);
    syncSoldiers(game, dt);
    updateTracers(dt);

    // Supply crates: the lid swings up once searched.
    for (const item of crates) {
      const want = item.crate.opened ? 1 : 0;
      if (item.open !== want) {
        item.open += Math.sign(want - item.open) * Math.min(Math.abs(want - item.open), dt * 4);
        orient(item.lid, 0, item.open * 1.9);
        item.glow.visible = item.open > 0.3;
      }
    }
    // Beacons breathe so they read as signals.
    const pulse = 0.14 + 0.08 * Math.sin(time * 2.4);
    for (const terminal of terminals) terminal.beam.material.opacity = pulse;
    extractBeam.material.opacity = pulse + 0.05;
    const relay = playing && game.state === 'play' ? game.transfer()?.relay : undefined;
    relayBeacon.visible = Boolean(relay);
    if (relay) {
      if (relayBeacon.position[0] !== relay.x || relayBeacon.position[2] !== relay.z) relayBeacon.setPosition(relay.x, 0.045, relay.z);
      relayGlow.opacity = 0.45 + pulse + (relay.inRange ? 0.16 : 0);
    }

    // Grenades in flight.
    while (grenadeNodes.length < game.grenades.length) {
      const node = visual(grenadeGeometry, grenadeMaterial, models.grenade);
      scene.addChild(node);
      grenadeNodes.push(node);
    }
    grenadeNodes.forEach((node, i) => {
      const grenade = game.grenades[i];
      node.visible = Boolean(grenade);
      if (grenade) node.setPosition(grenade.x, grenade.y, grenade.z);
    });

    // The helicopter comes in from the south-east once the last terminal is done.
    if (game.terminalsDone === game.terminals.length) {
      heliT = 1 - game.heliEta / MISSION.heliSeconds;
      const ease = 1 - (1 - heliT) ** 3,
        pad = PLACES.helipad,
        leaving = game.state === 'won' ? Math.min(1, (view.leaveT = (view.leaveT ?? 0) + dt / 5)) : ((view.leaveT = 0), 0);
      heli.visible = true;
      heli.setPosition(
        pad.x + (1 - ease) * 150 + Math.sin(time * 0.7) * 0.25,
        6.3 + (1 - ease) * 46 + Math.sin(time * 1.1) * 0.2 + leaving * leaving * 40,
        pad.z + 2.5 + (1 - ease) * 120,
      );
      orient(heli, -0.9 + (1 - ease) * 0.6, -0.08 * (1 - ease), Math.sin(time * 0.9) * 0.03);
      downwash.rate = ease > 0.85 ? 14 : 0;
      view.helicopter = (0.15 + 0.85 * ease) * (1 - leaving * 0.6);
    }
    orient(rotor, time * 21);
    orient(tailRotor, 0, time * 34);
  };

  /** Draw one sample of each effect off-screen, so first use in a fight does not stall to compile it. */
  view.warm = () => {
    for (const node of [dust, chips, sparks, blood, flashes, fire, smoke]) burst(node, 0, -40, 0, 1);
    tracer(0, -40, 0, 0, -40, 6, 100);
  };

  return view;
}
