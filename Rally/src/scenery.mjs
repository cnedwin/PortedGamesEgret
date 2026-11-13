// The circuit and the land around it: sky and light, the terrain, the road
// with its walls and bridge, the ceremonial gate over the start line, the
// lake, and the pagodas, pavilions, trees, lanterns, grandstand, long wall
// and mountains that dress the view. Everything is built once from the
// track's stations; only the water, the clouds, the crowd and the boost pads
// move afterwards.
import {
  InstancedMesh3D,
  Mesh3D,
  Object3D,
  createAmbientLight3D,
  createConeGeometry3D,
  createCylinderGeometry3D,
  createDirectionalLight3D,
  createGeometry3D,
  createGradientCubeTexture3D,
  createHemisphereLight3D,
  createPlaneGeometry3D,
  createStandardMaterial3D,
  createTorusGeometry3D,
  createUnlitMaterial3D,
  createWater3D,
} from '@egret/engine/world3d';
import {
  BALL,
  BOX,
  CONE,
  CYLINDER,
  PYRAMID,
  ROD,
  SPHERE,
  SPIKE,
  build,
  canvasTexture,
  linear,
  paintTexture,
  rgb,
  scatterSource,
  yawQuat,
} from './shapes.mjs';
import { TRACK } from './track.mjs';

const VERMILION = 0xc8321e,
  GOLD = 0xf2c230,
  TILE = 0x2f4a45, // dark glazed roof tile
  STONE = 0xb9b4a6,
  WOOD = 0x6b4226,
  CREAM = 0xf3ead6;
const OCTAGON = createCylinderGeometry3D({ radiusTop: 0.8, radiusBottom: 1, height: 1, radialSegments: 8 });
const EAVE = createConeGeometry3D({ radius: 1, height: 1, radialSegments: 8 });
const HEX_ROOF = createConeGeometry3D({ radius: 1, height: 1, radialSegments: 6 });

/**
 * A strip of geometry that follows the track. `profileAt(i)` returns the
 * cross-section at station `i` as segments `[lateral0, y0, lateral1, y1,
 * colour]` (offsets from the centre line and the road height), or nothing to
 * leave a gap. Each segment faces the side its points turn toward when
 * walked left to right, so list walls bottom-to-top on the left of the road
 * and top-to-bottom on the right. With `uv`, u runs along each segment and v
 * along the track every `uv` metres.
 */
function ribbon(track, profileAt, uv = 0) {
  const positions = [],
    normals = [],
    colors = [],
    uvs = [],
    indices = [];
  const { count, px, py, pz, tx, tz } = track;
  let previous;
  for (let n = 0; n <= count; n++) {
    const i = n % count,
      profile = profileAt(i);
    if (!profile) {
      previous = undefined;
      continue;
    }
    const base = positions.length / 3,
      rx = -tz[i],
      rz = tx[i];
    for (const [l0, y0, l1, y1, color] of profile) {
      // Normal: the segment's direction crossed with the track's forward direction.
      const dl = l1 - l0,
        dy = y1 - y0,
        nx = dy * tz[i] - 0,
        ny = dl * (rz * tx[i] - rx * tz[i]),
        nz = -dy * tx[i],
        length = Math.hypot(nx, ny, nz) || 1;
      for (const [lateral, y, u] of [
        [l0, y0, 0],
        [l1, y1, 1],
      ]) {
        positions.push(px[i] + rx * lateral, py[i] + y, pz[i] + rz * lateral);
        normals.push(nx / length, ny / length, nz / length);
        colors.push(color[0], color[1], color[2]);
        uvs.push(u, uv ? (n * track.step) / uv : 0);
      }
    }
    if (previous !== undefined && previous.segments === profile.length)
      for (let k = 0; k < profile.length; k++) {
        const a = previous.base + k * 2,
          b = base + k * 2;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    previous = { base, segments: profile.length };
  }
  return createGeometry3D({ positions, normals, colors, uvs, indices });
}

/** A flat disc facing along Z, for the sun. */
const sunShape = () => build([[CYLINDER, [0, 0, 0], [1, 0.01, 1], [1, 1, 1], [Math.PI / 2, 0, 0]]]);

/** Tarmac with edge lines and a dashed centre line; u runs across the road. */
function roadTexture() {
  let seed = 7;
  const noise = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return paintTexture(
    512,
    256,
    (x, y) => {
      // Fine grit, with the faint darker bands that tyres leave either side of the centre.
      const worn = Math.exp(-(((x - 140) / 46) ** 2)) + Math.exp(-(((x - 372) / 46) ** 2)),
        grain = 66 + noise() * 22 - worn * 9,
        edge = x < 12 || x > 499,
        dash = Math.abs(x - 255.5) < 4 && y < 128;
      if (edge) return [236, 232, 220, 255];
      if (dash) return [232, 200, 96, 255];
      return [grain, grain, grain + 4, 255];
    },
    { wrapS: 'clamp', wrapT: 'repeat', anisotropy: 8 },
  );
}

/** Arrows pointing up the texture, for the boost pads. */
function arrowTexture() {
  return paintTexture(
    64,
    64,
    (x, y) => {
      const v = (y + Math.abs(x - 31.5) * 0.9) % 32;
      return v < 12 ? [255, 236, 130, 255] : [255, 120, 20, 150];
    },
    { wrapS: 'clamp', wrapT: 'repeat' },
  );
}

/**
 * Fill `scene` with the circuit. Returns `update(dt, time)` for the moving
 * parts, `renderReflection` and `setReflect` for the lake's mirror image, and
 * the `sun` so the caller can set up shadows.
 */
export function createScenery(scene, track, options = {}) {
  const scenery = {};
  const chance = scatterSource(20260);
  const ground = track.terrainHeight;
  const here = {};
  /** Whether a spot is clear of the road by `margin` metres and out of the lake. */
  const clear = (x, z, margin) => {
    const at = track.locate(x, z, -1, here);
    return Math.abs(at.lateral) > at.limit + margin && track.lakeDistance(x, z) > 1.2;
  };
  /** A point beside the track: `fraction` of the way round, `lateral` metres to the right. */
  const beside = (fraction, lateral) => track.sample(fraction * track.length, lateral, {});

  // ---- sky and light -----------------------------------------------------------------
  const sky = createGradientCubeTexture3D([38, 108, 222], [214, 232, 250], [120, 150, 120], 64);
  scene.background = sky;
  scene.environment = sky;
  scene.environmentIntensity = 0.6;
  scene.fog = { kind: 'linear', color: [linear(0.8), linear(0.88), linear(0.96)], near: 260, far: 1500 };
  scene.addChild(createHemisphereLight3D({ color: 0xcfe4ff, groundColor: 0x86a25e, intensity: 0.5 }));
  scene.addChild(createAmbientLight3D({ intensity: 0.05 }));
  const sun = createDirectionalLight3D({ color: 0xffeccc, intensity: 2.1, castShadow: true });
  Object.assign(sun.shadow, { cascades: 3, cascadeDistance: 110, mapSize: options.shadowSize ?? 2048 });
  scene.addChild(sun);
  scenery.sun = sun;
  /** Keep the sun's shadow box around the point being watched. */
  scenery.aimSun = (x, y, z) => {
    sun.setPosition(x + 60, y + 95, z - 45);
    sun.lookAt(x, y, z);
    // The disc stays far off in the light's direction and faces the watcher.
    if (scenery.sunDisc) {
      scenery.sunDisc.setPosition(x + 60 * 9, y + 95 * 9, z - 45 * 9);
      scenery.sunDisc.lookAt(x, y, z);
    }
  };
  scenery.aimSun(0, 0, 0);

  const lit = (more) => createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.85, ...more });
  const add = (geometry, material, shadow = true) => {
    const mesh = new Mesh3D(geometry, material);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    scene.addChild(mesh);
    return mesh;
  };
  /** Draw `places` copies of a shape; each place is [x, y, z, turn, size, tint?]. */
  const copies = (shape, places, material = lit(), shadow = true) => {
    const mesh = new InstancedMesh3D(shape, material, Math.max(1, places.length));
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    places.forEach(([x, y, z, turn, size, tint], i) => {
      mesh.setTransformAt(i, [x, y, z], yawQuat(turn), size);
      const c = tint ?? [1, 1, 1];
      mesh.setColorAt(i, c[0], c[1], c[2]);
    });
    mesh.count = places.length;
    scene.addChild(mesh);
    return mesh;
  };

  // ---- terrain -----------------------------------------------------------------------
  {
    const x0 = -470,
      x1 = 470,
      z0 = -340,
      z1 = 360,
      cell = 6,
      nx = Math.round((x1 - x0) / cell),
      nz = Math.round((z1 - z0) / cell);
    const positions = [],
      colors = [],
      uvs = [],
      indices = [];
    const grass = rgb(0x86c552),
      meadow = rgb(0x5a9e44),
      rock = rgb(0x8b8f7c),
      sand = rgb(0xd9c79a),
      bed = rgb(0x6d8a7a);
    for (let j = 0; j <= nz; j++)
      for (let i = 0; i <= nx; i++) {
        const x = x0 + i * cell,
          z = z0 + j * cell,
          y = ground(x, z),
          shore = track.lakeDistance(x, z);
        positions.push(x, y, z);
        uvs.push(x / 14, z / 14);
        // Sand round the lake, light grass by the road, darker meadow and rock on the hills.
        let color = y > 15 ? rock : y > 7 ? meadow : grass;
        if (shore < 1.2 && y < 1.6) color = y < TRACK.waterLevel - 0.3 ? bed : sand;
        const speckle = 0.92 + ((i * 7 + j * 13) % 5) * 0.03;
        colors.push(color[0] * speckle, color[1] * speckle, color[2] * speckle);
      }
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i,
          b = a + 1,
          c = a + nx + 1,
          d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    const geometry = createGeometry3D({ positions, colors, uvs, indices });
    geometry.computeNormals();
    // A mottled texture breaks up the flat colour: patches of lighter and darker turf.
    let seed = 99;
    const noise = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const turf = paintTexture(
      256,
      256,
      (x, y) => {
        const patch = Math.sin(x * 0.049) * Math.sin(y * 0.049) * 14 + Math.sin((x + y) * 0.098) * 8,
          v = 214 + patch + noise() * 30;
        return [v - 8, v, v - 20, 255];
      },
      { wrapS: 'repeat', wrapT: 'repeat', anisotropy: 8 },
    );
    add(geometry, lit({ roughness: 0.95, map: turf }), false);
  }

  // ---- road, kerbs, walls and bridge ---------------------------------------------------
  const white = [1, 1, 1];
  const road = add(
    ribbon(track, (i) => [[-track.halfWidth[i], 0.03, track.halfWidth[i], 0.03, white]], 12),
    createStandardMaterial3D({ color: 0xffffff, map: roadTexture(), roughness: 0.9 }),
    false,
  );
  road.renderOrder = 1;
  // Kerbs in vermilion and gold, alternating every few metres.
  const stripes = paintTexture(4, 32, (x, y) => (y < 16 ? [216, 50, 30, 255] : [242, 194, 48, 255]), {
    wrapT: 'repeat',
    magFilter: 'nearest',
  });
  add(
    ribbon(
      track,
      (i) => {
        const w = track.halfWidth[i];
        return [
          [-w - 0.9, 0.01, -w, 0.07, white],
          [w, 0.07, w + 0.9, 0.01, white],
        ];
      },
      5,
    ),
    createStandardMaterial3D({ color: 0xffffff, map: stripes, roughness: 0.7 }),
    false,
  );
  // Whitewashed walls with dark tile caps on land; a stone balustrade on the bridge.
  const wallWhite = rgb(0xf2efe6),
    wallCap = rgb(TILE),
    stone = rgb(STONE),
    stoneDark = rgb(0x8d897c);
  add(
    ribbon(track, (i) => {
      const edge = track.limit[i],
        onBridge = track.bridge[i] === 1,
        height = onBridge ? 1.0 : 1.3,
        face = onBridge ? stone : wallWhite,
        cap = onBridge ? stoneDark : wallCap,
        thick = onBridge ? 0.45 : 0.6;
      return [
        [-edge - thick, -0.4, -edge - thick, height, face],
        [-edge - thick - 0.12, height, -edge + 0.12, height + 0.12, cap],
        [-edge, height, -edge, -0.1, face],
        [edge, -0.1, edge, height, face],
        [edge - 0.12, height + 0.12, edge + thick + 0.12, height, cap],
        [edge + thick, height, edge + thick, -0.4, face],
      ];
    }),
    lit({ side: 'double' }),
  );
  // The bridge deck's sides and underside, and its piers standing in the lake.
  add(
    ribbon(track, (i) => {
      if (!track.bridge[i]) return undefined;
      const edge = track.limit[i] + 0.45;
      return [
        [-edge, -1.3, -edge, -0.05, stone],
        [edge, -0.05, edge, -1.3, stone],
        [edge, -1.3, -edge, -1.3, stoneDark],
      ];
    }),
    lit({ side: 'double' }),
  );
  {
    const piers = [];
    for (let i = 0; i < track.count; i += 6) {
      if (!track.bridge[i]) continue;
      const top = track.py[i] - 1.3,
        bottom = ground(track.px[i], track.pz[i]) - 0.5,
        width = track.limit[i] * 2 - 1;
      piers.push([
        BOX,
        [track.px[i], (top + bottom) / 2, track.pz[i]],
        [width, top - bottom, 2.2],
        STONE,
        [0, track.heading[i], 0],
      ]);
      piers.push([BOX, [track.px[i], top - 0.5, track.pz[i]], [width + 1.6, 1, 3.4], 0xa39f92, [0, track.heading[i], 0]]);
    }
    add(build(piers), lit());
  }

  // ---- start line and gate ---------------------------------------------------------------
  const start = beside(0, 0),
    span = track.limit[0] + 0.9;
  {
    // A chequered strip across the road.
    const checks = paintTexture(
      64,
      8,
      (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? [245, 245, 240, 255] : [28, 28, 32, 255]),
      { magFilter: 'nearest' },
    );
    const line = new Mesh3D(
      createPlaneGeometry3D({ width: track.halfWidth[0] * 2, height: 2.2 }),
      createStandardMaterial3D({ color: 0xffffff, map: checks, roughness: 0.8 }),
    );
    line.setRotation(-Math.PI / 2, 0, 0);
    const holder = new Object3D();
    holder.setPosition(start.x, start.y + 0.05, start.z);
    holder.setRotation(0, start.heading, 0);
    holder.addChild(line);
    line.receiveShadow = true;
    line.castShadow = false;
    line.renderOrder = 2;
    scene.addChild(holder);

    // The gate: two red pillars, painted beams and a tiled roof with upturned eaves.
    const parts = [];
    for (const side of [-1, 1]) {
      parts.push([CYLINDER, [side * span, 5.2, 0], [0.75, 10.4, 0.75], VERMILION]);
      parts.push([BOX, [side * span, 0.5, 0], [2.2, 1, 2.2], STONE]);
      parts.push([BOX, [side * span, 10.1, 0], [1.9, 0.5, 1.9], GOLD]);
      // Eave tips curl up at each end of the roof.
      parts.push([BOX, [side * (span + 3.6), 12.75, 0], [2.6, 0.4, 5.4], TILE, [0, 0, side * 0.42]]);
      parts.push([SPHERE, [side * (span + 4.9), 13.5, 0], 0.4, GOLD]);
      // A lantern under each end of the beam.
      parts.push([CYLINDER, [side * (span - 2.6), 8.3, 0], [0.05, 1.3, 0.05], 0x222222]);
      parts.push([SPHERE, [side * (span - 2.6), 7.2, 0], [0.8, 0.95, 0.8], [1.5, 0.18, 0.12]]);
      parts.push([CYLINDER, [side * (span - 2.6), 8.1, 0], [0.4, 0.2, 0.4], GOLD]);
      parts.push([CYLINDER, [side * (span - 2.6), 6.3, 0], [0.4, 0.2, 0.4], GOLD]);
    }
    parts.push([BOX, [0, 9, 0], [span * 2 + 2.4, 0.9, 1], 0x1f6f8a]);
    parts.push([BOX, [0, 9.55, 0], [span * 2 + 2.4, 0.22, 1.1], GOLD]);
    parts.push([BOX, [0, 10.6, 0], [span * 2 + 3, 1, 1.2], VERMILION]);
    parts.push([BOX, [0, 11.3, 0], [span * 2 + 3.4, 0.4, 1.6], 0x2e8b57]);
    parts.push([BOX, [0, 11.95, 0], [span * 2 + 6, 0.5, 5.6], TILE]);
    parts.push([BOX, [0, 12.45, 0], [span * 2 + 4, 0.5, 3.4], 0x39594f]);
    parts.push([BOX, [0, 13, 0], [span * 2 + 2, 0.6, 0.7], TILE]);
    for (const x of [-span, 0, span]) parts.push([SPHERE, [x, 13.6, 0], [0.5, 0.7, 0.5], GOLD]);
    const gate = new Mesh3D(build(parts), lit({ roughness: 0.6 }));
    gate.castShadow = true;
    gate.receiveShadow = true;
    holder.addChild(gate);

    // The plaque carries the game's name on both faces.
    const plaque = canvasTexture(512, 128, (c, w, h) => {
      c.fillStyle = '#12365a';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#f2c230';
      c.lineWidth = 10;
      c.strokeRect(8, 8, w - 16, h - 16);
      c.fillStyle = '#f7d560';
      c.font = '700 84px "Noto Serif SC", "Songti SC", "SimSun", "KaiTi", serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('锦 绣 飞 车', w / 2, h / 2 + 4);
    });
    for (const facing of [0, Math.PI]) {
      const sign = new Mesh3D(
        createPlaneGeometry3D({ width: 12, height: 3 }),
        createStandardMaterial3D({ color: 0xffffff, map: plaque, roughness: 0.5 }),
      );
      sign.setPosition(0, 9.9, facing ? -0.68 : 0.68);
      sign.setRotation(0, facing, 0);
      sign.castShadow = false;
      holder.addChild(sign);
    }
  }

  // ---- lake --------------------------------------------------------------------------
  const lake = TRACK.lake;
  const water = createWater3D({
    width: lake.rx * 2.5,
    depth: lake.rz * 2.5,
    segments: 64,
    color: 0x3f9fb8,
    deepColor: 0x1f5f7a,
    amplitude: 0.06,
    wavelength: 7,
    clarity: 0.7,
    reflectionSize: options.reflectionSize ?? 512,
  });
  water.setPosition(lake.x, TRACK.waterLevel, lake.z);
  scene.addChild(water);
  const mirror = water.reflection?.texture;
  let reflect = true;
  /** Turn the lake's mirror image on or off. */
  scenery.setReflect = (on) => {
    if (reflect === on) return;
    reflect = on;
    water.material.reflectionMap = on ? mirror : undefined;
    water.material.touch();
  };
  /** Draw the mirror image the lake shows; call before the main view is drawn. */
  scenery.renderReflection = (renderer, camera) => {
    if (reflect && mirror) water.renderReflection(renderer, scene, camera);
  };
  // Lotus leaves and flowers float clear of the bridge.
  {
    const leaf = build([
      [ROD, [0, 0, 0], [1, 0.04, 1], 0x3f8f4a],
      [ROD, [0.3, 0.02, 0.2], [0.55, 0.04, 0.55], 0x57a85c],
    ]);
    const flower = build([
      ...[0, 1, 2, 3, 4, 5].map((k) => [
        BALL,
        [Math.cos(k * 1.05) * 0.22, 0.2, Math.sin(k * 1.05) * 0.22],
        [0.16, 0.26, 0.16],
        0xf7a8c4,
        [Math.sin(k * 1.05) * 0.5, 0, -Math.cos(k * 1.05) * 0.5],
      ]),
      [BALL, [0, 0.22, 0], 0.12, 0xf7d560],
    ]);
    const leaves = [],
      flowers = [];
    for (let n = 0; n < 900 && leaves.length < 150; n++) {
      const x = lake.x + (chance() * 2 - 1) * lake.rx,
        z = lake.z + (chance() * 2 - 1) * lake.rz;
      if (track.lakeDistance(x, z) > 0.86) continue;
      const at = track.locate(x, z, -1, here);
      if (Math.abs(at.lateral) < at.limit + 5) continue;
      const size = 0.7 + chance() * 0.9;
      leaves.push([x, TRACK.waterLevel + 0.06, z, chance() * 6.28, size]);
      if (chance() < 0.3) flowers.push([x + 0.3, TRACK.waterLevel + 0.08, z + 0.2, chance() * 6.28, size * 1.4]);
    }
    copies(leaf, leaves, lit({ roughness: 0.6 }), false);
    copies(flower, flowers, lit({ roughness: 0.5 }), false);
  }

  // ---- buildings -----------------------------------------------------------------------
  /** A pagoda: `tiers` eight-sided storeys, each with a wide tiled roof, and a gold spire. */
  const pagoda = (tiers) => {
    const parts = [[CYLINDER, [0, 0.4, 0], [5.4, 0.8, 5.4], STONE]];
    let y = 0.8;
    for (let k = 0; k < tiers; k++) {
      const r = 3.6 - k * 0.42;
      parts.push([OCTAGON, [0, y + 1.4, 0], [r, 2.8, r], CREAM]);
      parts.push([OCTAGON, [0, y + 2.35, 0], [r + 0.08, 0.5, r + 0.08], VERMILION]);
      parts.push([EAVE, [0, y + 3.35, 0], [r + 2, 1.3, r + 2], TILE]);
      parts.push([CYLINDER, [0, y + 2.78, 0], [r + 2.05, 0.14, r + 2.05], GOLD]);
      // Upturned tips at the eight corners, each with a bell.
      for (let c = 0; c < 8; c++) {
        const a = (c / 8) * Math.PI * 2,
          reach = r + 2.05;
        parts.push([
          SPIKE,
          [Math.cos(a) * reach, y + 3.05, Math.sin(a) * reach],
          [0.22, 0.9, 0.22],
          TILE,
          [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9],
        ]);
        parts.push([BALL, [Math.cos(a) * (reach + 0.1), y + 2.5, Math.sin(a) * (reach + 0.1)], 0.12, GOLD]);
      }
      // Dark window openings on alternate faces.
      for (let c = 0; c < 4; c++) {
        const a = (c / 4) * Math.PI * 2 + Math.PI / 8;
        parts.push([BOX, [Math.cos(a) * r * 0.84, y + 1.3, Math.sin(a) * r * 0.84], [0.7, 1.3, 0.7], 0x3a2a20, [0, -a, 0]]);
      }
      y += 3.5;
    }
    parts.push([CONE, [0, y + 1.6, 0], [0.5, 3.6, 0.5], GOLD]);
    parts.push([SPHERE, [0, y + 3.5, 0], 0.45, GOLD]);
    return build(parts);
  };
  /** A six-sided pavilion with red columns. */
  const pavilionShape = build([
    [CYLINDER, [0, 0.25, 0], [4, 0.5, 4], STONE],
    ...[0, 1, 2, 3, 4, 5].map((k) => [
      CYLINDER,
      [Math.cos(k * 1.047) * 3, 2.1, Math.sin(k * 1.047) * 3],
      [0.22, 3.4, 0.22],
      VERMILION,
    ]),
    [CYLINDER, [0, 3.85, 0], [3.4, 0.3, 3.4], 0x1f6f8a],
    [HEX_ROOF, [0, 4.75, 0], [4.9, 1.5, 4.9], TILE],
    [HEX_ROOF, [0, 5.9, 0], [2.4, 1.6, 2.4], 0x39594f],
    [SPHERE, [0, 6.8, 0], 0.4, GOLD],
  ]);
  /** A building site beside the track, on whichever side is clear of the road and the lake. */
  const site = (fraction, lateral, size = 1) => {
    for (const side of [lateral, -lateral]) {
      const at = beside(fraction, side);
      if (clear(at.x, at.z, 9)) return [[at.x, ground(at.x, at.z) - 0.2, at.z, at.heading, size]];
    }
    return [];
  };
  copies(pagoda(5), [...site(0.03, 46, 1.25), ...site(0.255, -44, 1.1), ...site(0.79, 42)], lit({ roughness: 0.7 }));
  copies(pagoda(3), [...site(0.45, 34, 0.9), ...site(0.9, -40)], lit({ roughness: 0.7 }));
  copies(
    pavilionShape,
    [...site(0.47, -34), ...site(0.66, -34, 1.1), ...site(0.14, 34), ...site(0.37, 36, 0.9)],
    lit({ roughness: 0.7 }),
  );

  // The long wall climbs the eastern hills, a tower every few stretches.
  {
    const stretch = build([
      [BOX, [0, 2, 0], [3.4, 4, 8.2], 0xa39a86],
      ...[-3, -1, 1, 3].flatMap((z) => [
        [BOX, [-1.5, 4.45, z], [0.5, 0.9, 1.1], 0x958c78],
        [BOX, [1.5, 4.45, z], [0.5, 0.9, 1.1], 0x958c78],
      ]),
    ]);
    const tower = build([
      [BOX, [0, 4, 0], [6.5, 8, 6.5], 0x9a917d],
      [BOX, [0, 8.4, 0], [7.3, 0.8, 7.3], 0x8a826f],
      ...[-1, 1].flatMap((x) => [-1, 1].map((z) => [BOX, [x * 3.1, 9.3, z * 3.1], [1.1, 1, 1.1], 0x8a826f])),
      [PYRAMID, [0, 10, 0], [4.6, 1.8, 4.6], TILE, [0, Math.PI / 4, 0]],
    ]);
    const path = [
      [455, -250],
      [405, -170],
      [420, -80],
      [385, 0],
      [410, 90],
      [370, 170],
      [395, 250],
      [340, 320],
    ];
    const stretches = [],
      towers = [];
    for (let k = 0; k + 1 < path.length; k++) {
      const [ax, az] = path[k],
        [bx, bz] = path[k + 1],
        distance = Math.hypot(bx - ax, bz - az),
        steps = Math.round(distance / 8),
        turn = Math.atan2(bx - ax, bz - az);
      for (let n = 0; n < steps; n++) {
        const x = ax + ((bx - ax) * (n + 0.5)) / steps,
          z = az + ((bz - az) * (n + 0.5)) / steps;
        stretches.push([x, ground(x, z) - 1, z, turn, 1]);
      }
      towers.push([ax, ground(ax, az) - 1, az, turn, 1]);
    }
    copies(stretch, stretches, lit({ roughness: 0.95 }));
    copies(tower, towers, lit({ roughness: 0.95 }));
  }

  // ---- trees, bamboo and rocks ---------------------------------------------------------
  const pine = build([
    [ROD, [0, 1.2, 0], [0.28, 2.4, 0.28], WOOD],
    [SPIKE, [0, 3.2, 0], [2.3, 2.6, 2.3], 0x2f6b3f],
    [SPIKE, [0, 4.9, 0], [1.8, 2.3, 1.8], 0x37784a],
    [SPIKE, [0, 6.4, 0], [1.2, 2, 1.2], 0x418654],
  ]);
  const blossom = build([
    [ROD, [0, 1.1, 0], [0.22, 2.2, 0.22], 0x5a3a28, [0, 0, 0.12]],
    [ROD, [0.5, 2.3, 0], [0.12, 1.4, 0.12], 0x5a3a28, [0, 0, -0.7]],
    [ROD, [-0.5, 2.4, 0.2], [0.12, 1.4, 0.12], 0x5a3a28, [0.3, 0, 0.7]],
    [BALL, [0, 3.3, 0], [1.5, 1.1, 1.5], 0xf7b3cb],
    [BALL, [1.2, 2.9, 0.2], [1.1, 0.85, 1.1], 0xf59ab8],
    [BALL, [-1.2, 3, 0.3], [1.15, 0.9, 1.15], 0xfac6d6],
    [BALL, [0.2, 3, -1], [1, 0.8, 1], 0xf7a8c4],
  ]);
  const bamboo = build(
    [0, 1, 2, 3].flatMap((k) => {
      const x = Math.cos(k * 2.4) * 0.5,
        z = Math.sin(k * 2.4) * 0.5,
        h = 5 + (k % 3) * 1.4;
      return [
        [ROD, [x, h / 2, z], [0.09, h, 0.09], 0x6fae4a],
        [SPIKE, [x + 0.45, h * 0.86, z], [0.3, 1.5, 0.5], 0x4f9440, [0, k, -1.1]],
        [SPIKE, [x - 0.45, h * 0.7, z + 0.1], [0.3, 1.4, 0.5], 0x5aa04a, [0, k, 1.1]],
        [SPIKE, [x, h + 0.5, z], [0.35, 1.3, 0.35], 0x4f9440],
      ];
    }),
  );
  const rock = build([
    [BALL, [0, 0.5, 0], [1.3, 0.9, 1], 0x8f8f88],
    [BALL, [0.9, 0.3, 0.4], [0.7, 0.5, 0.6], 0x7f7f78],
  ]);
  const pines = [],
    blossoms = [],
    bamboos = [],
    rocks = [];
  for (let n = 0; n < 2600; n++) {
    const x = -450 + chance() * 900,
      z = -320 + chance() * 660,
      kind = chance(),
      size = 0.8 + chance() * 0.7,
      turn = chance() * 6.28;
    if (!clear(x, z, 2.5)) continue;
    const at = track.locate(x, z, -1, here),
      away = Math.abs(at.lateral) - at.limit,
      y = ground(x, z) - 0.15,
      shadeBy = 0.85 + chance() * 0.3,
      tint = [shadeBy, shadeBy, shadeBy];
    // Blossom and bamboo keep to the roadside; pines take the hills.
    if (away < 28 && kind < 0.34) blossoms.push([x, y, z, turn, size, tint]);
    else if (away < 40 && kind < 0.62) bamboos.push([x, y, z, turn, size * 1.1, tint]);
    else if (kind < 0.94) pines.push([x, y, z, turn, size * (1 + Math.min(1, away / 120)), tint]);
    else rocks.push([x, y, z, turn, size * 1.4, tint]);
  }
  copies(pine, pines.slice(0, 520));
  copies(blossom, blossoms.slice(0, 200));
  copies(bamboo, bamboos.slice(0, 260));
  copies(rock, rocks, lit({ flatShading: true }));

  // ---- lanterns and banners along the road -------------------------------------------------
  {
    const post = build([
      [ROD, [0, 2.4, 0], [0.11, 4.8, 0.11], 0x3a2a20],
      [BOX, [0, 4.7, 0.55], [0.1, 0.1, 1.3], 0x3a2a20],
      [ROD, [0, 4.35, 1.1], [0.02, 0.5, 0.02], 0x222222],
      // The lantern is brighter than white so it glows through the bloom.
      [BALL, [0, 3.75, 1.1], [0.5, 0.58, 0.5], [1.55, 0.2, 0.12]],
      [ROD, [0, 4.28, 1.1], [0.25, 0.1, 0.25], GOLD],
      [ROD, [0, 3.22, 1.1], [0.25, 0.1, 0.25], GOLD],
      [ROD, [0, 2.9, 1.1], [0.05, 0.55, 0.05], [1.3, 0.75, 0.1]],
    ]);
    const posts = [];
    for (let i = 4; i < track.count; i += 9) {
      if (track.bridge[i]) continue;
      const side = (i / 9) % 2 ? 1 : -1,
        at = track.sample(i * track.step, side * (track.limit[i] + 1.4), {});
      // The arm points at the road.
      posts.push([at.x, at.y - 0.1, at.z, at.heading - (side * Math.PI) / 2, 1]);
    }
    copies(post, posts, lit({ roughness: 0.5 }));

    const banner = build([
      [ROD, [0, 3.5, 0], [0.09, 7, 0.09], 0x3a2a20],
      [BOX, [0, 5.2, 0.62], [0.06, 3.2, 1.1], VERMILION],
      [BOX, [0, 5.2, 0.62], [0.07, 2.6, 0.2], GOLD],
      [BALL, [0, 7.05, 0], 0.16, GOLD],
    ]);
    const banners = [];
    for (let k = -6; k <= 14; k++) {
      if (Math.abs(k) < 2) continue;
      for (const side of [-1, 1]) {
        const s = k * 11,
          index = (Math.round(s / track.step) + track.count) % track.count,
          at = track.sample(s, side * (track.limit[index] + 2.6), {});
        banners.push([at.x, at.y, at.z, at.heading, 1]);
      }
    }
    copies(banner, banners, lit({ roughness: 0.6 }));
  }

  // ---- grandstand and crowd ---------------------------------------------------------------
  const fans = [];
  {
    const rows = 5,
      length = 56;
    const parts = [];
    // Steps rise away from the road; the model's +X is the driver's left, the side the stand is on.
    for (let r = 0; r < rows; r++)
      parts.push([BOX, [r * 1.5, 0.6 + r * 0.7, 0], [1.5, 1.2 + r * 1.4, length], r % 2 ? 0xd9d2c0 : 0xc9c2b0]);
    // A tiled canopy on red posts.
    for (let z = -length / 2; z <= length / 2; z += 14)
      parts.push([CYLINDER, [rows * 1.5 - 0.4, 4.6, z], [0.2, 9.2, 0.2], VERMILION]);
    parts.push([BOX, [rows * 0.75 + 0.6, 9.4, 0], [rows * 1.5 + 4, 0.35, length + 3], TILE, [0, 0, 0.12]]);
    parts.push([BOX, [rows * 1.5 - 0.2, 9.95, 0], [0.6, 0.5, length + 3], GOLD]);
    const stand = new Mesh3D(build(parts), lit({ roughness: 0.8 }));
    stand.castShadow = true;
    stand.receiveShadow = true;
    // On the outside of the start straight, facing the road.
    const at = beside(0.012, -(track.limit[0] + 4.5));
    stand.setPosition(at.x, at.y - 0.1, at.z);
    stand.setRotation(0, at.heading, 0);
    scene.addChild(stand);

    const fanShape = build([
      [BALL, [0, 0.45, 0], [0.3, 0.45, 0.26], [1, 1, 1]],
      [BALL, [0, 1.05, 0], 0.22, [1, 0.86, 0.72]],
    ]);
    const outfits = [0xd8262c, 0xf2c230, 0x1f6f8a, 0x2e8b57, 0xf3ead6, 0xf07a1a, 0x8e44ad].map(rgb);
    const crowd = new InstancedMesh3D(fanShape, lit({ roughness: 0.8 }), rows * 46);
    crowd.castShadow = false;
    crowd.frustumCulled = false;
    const fx = Math.sin(at.heading),
      fz = Math.cos(at.heading),
      rx = -fz,
      rz = fx;
    for (let r = 0; r < rows; r++)
      for (let k = 0; k < 46; k++) {
        const along = -length / 2 + 1 + k * 1.2 + (r % 2) * 0.4,
          across = -r * 1.5,
          index = fans.length;
        fans.push({
          x: at.x + fx * along + rx * across,
          y: at.y + 1.1 + r * 1.4,
          z: at.z + fz * along + rz * across,
          phase: chance() * 6.28,
          pace: 5 + chance() * 4,
        });
        const outfit = outfits[Math.floor(chance() * outfits.length)];
        crowd.setColorAt(index, outfit[0], outfit[1], outfit[2]);
      }
    crowd.count = fans.length;
    scene.addChild(crowd);
    scenery.crowd = crowd;
    scenery.crowdTurn = at.heading - Math.PI / 2;
  }

  // ---- mountains and clouds ----------------------------------------------------------------
  {
    // A peak in bands: forest below, bare rock, then snow, with a shoulder to break the outline.
    const cone = (sides) => createConeGeometry3D({ radius: 1, height: 1, radialSegments: sides });
    const peak = build([
      [cone(9), [0, 0.5, 0], [1, 1, 1], 0x4f7f6a],
      [cone(9), [0, 0.62, 0], [0.78, 0.76, 0.78], 0x6f8fa8],
      [cone(9), [0, 0.84, 0], [0.34, 0.33, 0.34], 0xf4f6f8],
      [cone(7), [0.55, 0.3, 0.2], [0.7, 0.6, 0.7], 0x5a8a70],
      [cone(7), [0.6, 0.42, 0.22], [0.42, 0.37, 0.42], 0x7f9cb0],
      [cone(6), [-0.5, 0.22, -0.3], [0.6, 0.44, 0.6], 0x4f7f6a],
    ]);
    // Rounded green foothills stand between the circuit and the peaks.
    const hill = build([
      [BALL, [0, 0, 0], [1, 0.34, 1], 0x5f9c4a],
      [BALL, [0.7, -0.02, 0.3], [0.7, 0.26, 0.7], 0x6aa852],
      [BALL, [-0.6, -0.03, -0.4], [0.8, 0.22, 0.8], 0x528f42],
    ]);
    const foothills = [];
    for (let k = 0; k < 26; k++) {
      const angle = (k / 26) * 6.283 + chance() * 0.2,
        distance = 560 + chance() * 150,
        tone = 0.8 + chance() * 0.35;
      foothills.push([
        Math.cos(angle) * distance,
        -6,
        Math.sin(angle) * distance,
        chance() * 6.28,
        110 + chance() * 90,
        [tone, tone, tone],
      ]);
    }
    copies(hill, foothills, lit({ roughness: 1 }), false);
    const peaks = [];
    for (let k = 0; k < 34; k++) {
      const angle = (k / 34) * 6.283 + chance() * 0.12,
        distance = 820 + chance() * 300,
        height = 110 + chance() * 150,
        tone = 0.75 + chance() * 0.4;
      peaks.push([
        Math.cos(angle) * distance,
        -12,
        Math.sin(angle) * distance,
        chance() * 6.28,
        [height * (0.9 + chance() * 0.5), height, height * (0.9 + chance() * 0.5)],
        [tone, tone, tone],
      ]);
    }
    copies(peak, peaks, lit({ roughness: 1 }), false);

    const cloud = build([
      [SPHERE, [0, 0, 0], [16, 5, 9], [1, 1, 1]],
      [SPHERE, [12, -1, 2], [11, 4, 7], [1, 1, 1]],
      [SPHERE, [-11, -0.6, -1], [12, 4.4, 8], [1, 1, 1]],
      [SPHERE, [3, 3.4, 0], [9, 4, 6], [1, 1, 1]],
    ]);
    const holder = new Object3D();
    scene.addChild(holder);
    const clouds = new InstancedMesh3D(
      cloud,
      createUnlitMaterial3D({
        color: 0xffffff,
        vertexColors: true,
        opacity: 0.9,
        alphaMode: 'blend',
        depthWrite: false,
        fog: false,
      }),
      22,
    );
    clouds.castShadow = false;
    clouds.frustumCulled = false;
    for (let k = 0; k < 22; k++) {
      const angle = (k / 22) * 6.283 + chance(),
        distance = 260 + chance() * 420;
      clouds.setTransformAt(
        k,
        [Math.cos(angle) * distance, 130 + chance() * 90, Math.sin(angle) * distance],
        yawQuat(angle + 1.57),
        1.2 + chance() * 1.8,
      );
    }
    clouds.count = 22;
    holder.addChild(clouds);
    scenery.clouds = holder;
  }

  // ---- boost pads and ramps ------------------------------------------------------------------
  const arrows = arrowTexture();
  for (const pad of track.pads) {
    const strip = new Mesh3D(
      createPlaneGeometry3D({ width: pad.halfWidth * 2, height: pad.halfLength * 2 }),
      createUnlitMaterial3D({ color: [1.5, 1.2, 0.7], map: arrows, alphaMode: 'blend', depthWrite: false }),
    );
    strip.setRotation(-Math.PI / 2, 0, 0);
    strip.castShadow = false;
    strip.renderOrder = 3;
    const holder = new Object3D();
    holder.setPosition(pad.x, pad.y + 0.07, pad.z);
    // The texture's "up" is the direction of travel.
    holder.setRotation(0, pad.heading + Math.PI, 0);
    holder.addChild(strip);
    scene.addChild(holder);
  }
  {
    // A wedge of planks, low at the back and high at the front, with gold chevrons.
    const parts = [];
    for (const ramp of track.ramps) {
      const planks = 8;
      for (let k = 0; k < planks; k++) {
        const t = (k + 0.5) / planks,
          along = -ramp.halfLength + t * ramp.halfLength * 2,
          rise = t * 1.25,
          x = ramp.x + Math.sin(ramp.heading) * along,
          z = ramp.z + Math.cos(ramp.heading) * along;
        parts.push([
          BOX,
          [x, ramp.y + rise / 2, z],
          [ramp.halfWidth * 2, rise + 0.08, (ramp.halfLength * 2) / planks + 0.02],
          k % 2 ? 0xb07a3c : 0xc8904a,
          [-0.19, ramp.heading, 0],
        ]);
        if (k % 2)
          parts.push([BOX, [x, ramp.y + rise + 0.06, z], [ramp.halfWidth * 1.2, 0.05, 0.3], GOLD, [-0.19, ramp.heading, 0]]);
      }
    }
    add(build(parts), lit({ roughness: 0.8 }));
  }

  // ---- cloud gates, mud and stone lions on the road ------------------------------------------
  /** A guardian lion on a plinth; also stands either side of the start gate. */
  const lionShape = build([
    [BOX, [0, 0.3, 0], [1.5, 0.6, 1.9], 0x9a958a],
    [BOX, [0, 0.66, 0], [1.3, 0.14, 1.7], 0xb9b4a6],
    [SPHERE, [0, 1.25, -0.25], [0.52, 0.6, 0.62], STONE],
    [SPHERE, [0, 1.95, 0.25], [0.5, 0.48, 0.48], STONE],
    [SPHERE, [0, 1.86, 0.62], [0.3, 0.24, 0.24], 0xc9c4b6],
    ...[-1, 1].flatMap((side) => [
      [CYLINDER, [side * 0.3, 1.0, 0.42], [0.15, 0.7, 0.15], STONE],
      [SPHERE, [side * 0.3, 0.8, 0.52], [0.18, 0.12, 0.24], 0xc9c4b6],
      [SPHERE, [side * 0.36, 2.34, 0.1], 0.13, STONE],
      [SPHERE, [side * 0.18, 2.03, 0.66], 0.06, 0x2a2a2a],
    ]),
    // Curls of the mane and the ball under one paw.
    ...[0, 1, 2, 3, 4, 5, 6].map((k) => [BALL, [Math.cos(k * 0.9) * 0.44, 2.0 + Math.sin(k * 0.9) * 0.4, -0.05], 0.15, 0xa8a396]),
    [SPHERE, [0.3, 0.86, 0.72], 0.2, [1.3, 0.2, 0.14]],
    [SPHERE, [0, 1.78, 0.84], [0.1, 0.06, 0.06], 0x2a2a2a],
  ]);
  copies(lionShape, [
    ...track.lions.map((lion) => [lion.x, lion.y, lion.z, lion.heading + Math.PI, 0.95]),
    ...[-1, 1].map((side) => {
      const at = beside(0, side * (span + 3.4));
      return [at.x, at.y, at.z, at.heading + Math.PI, 1.5];
    }),
  ]);
  {
    // Mud: a glossy brown pool with a darker rim, lying just above the tarmac.
    const pool = build([
      [CYLINDER, [0, 0.02, 0], [1, 0.03, 1], 0x4a3320],
      [CYLINDER, [0, 0.035, 0], [0.86, 0.03, 0.86], 0x6b4a2c],
      [CYLINDER, [0.2, 0.05, -0.1], [0.5, 0.02, 0.42], 0x7d5a38],
      [BALL, [0.95, 0.03, 0.3], [0.3, 0.05, 0.24], 0x4a3320],
      [BALL, [-0.8, 0.03, -0.6], [0.36, 0.05, 0.3], 0x4a3320],
      [BALL, [-0.3, 0.03, 0.98], [0.26, 0.05, 0.22], 0x4a3320],
    ]);
    const pools = copies(
      pool,
      track.mud.map((mud, k) => [mud.x, mud.y + 0.04, mud.z, k * 1.9, mud.radius]),
      lit({ roughness: 0.18 }),
      false,
    );
    pools.renderOrder = 3;

    // Cloud gates: two red posts and an arch of gold-edged cloud to drive under.
    const arch = createTorusGeometry3D({ radius: 1, tube: 0.09, radialSegments: 8, tubularSegments: 28 });
    const puffs = [];
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * Math.PI,
        x = Math.cos(a) * 2.9,
        y = 0.4 + Math.sin(a) * 3.3;
      puffs.push([BALL, [x, y, 0], [0.62, 0.5, 0.42], [1.25, 1.25, 1.3]]);
      puffs.push([BALL, [x * 1.05, y + 0.25, 0.12], [0.36, 0.3, 0.3], [1.3, 1.3, 1.3]]);
    }
    const gateShape = build([
      ...puffs,
      [arch, [0, 0.4, 0], [2.9, 3.3, 1.6], [1.6, 1.15, 0.3]],
      ...[-1, 1].flatMap((side) => [
        [CYLINDER, [side * 2.95, 0.5, 0], [0.16, 1.2, 0.16], VERMILION],
        [BOX, [side * 2.95, 0.08, 0], [0.6, 0.16, 0.6], STONE],
        [BALL, [side * 2.95, 1.2, 0], 0.26, GOLD],
      ]),
    ]);
    copies(
      gateShape,
      track.gates.map((gate) => [gate.x, gate.y, gate.z, gate.heading, 1]),
      lit({ roughness: 0.6 }),
      false,
    );
  }

  // ---- banners and strings of lanterns over the road ---------------------------------------------
  /** A holder standing on the road at `fraction`, turned to face along it. */
  const astride = (fraction) => {
    const at = beside(fraction, 0),
      holder = new Object3D();
    holder.setPosition(at.x, at.y, at.z);
    holder.setRotation(0, at.heading, 0);
    scene.addChild(holder);
    return { holder, reach: track.limit[at.index] + 1 };
  };
  for (const [fraction, words] of [
    [0.2, '一 路 顺 风'],
    [0.635, '马 到 成 功'],
    [0.885, '风 驰 电 掣'],
  ]) {
    const { holder, reach } = astride(fraction);
    const frame = new Mesh3D(
      build([
        ...[-1, 1].flatMap((side) => [
          [CYLINDER, [side * reach, 4.6, 0], [0.3, 9.2, 0.3], VERMILION],
          [BOX, [side * reach, 0.4, 0], [1.1, 0.8, 1.1], STONE],
          [SPIKE, [side * reach, 9.6, 0], [0.5, 0.9, 0.5], GOLD],
        ]),
        [CYLINDER, [0, 8.7, 0], [0.16, reach * 2 + 1.5, 0.16], 0x3a2a20, [0, 0, Math.PI / 2]],
        [BOX, [0, 7.35, 0], [15, 2.5, 0.08], 0xb81a20],
        [BOX, [0, 8.55, 0], [15.4, 0.18, 0.14], GOLD],
        [BOX, [0, 6.15, 0], [15.4, 0.18, 0.14], GOLD],
        // Tassels along the bottom edge.
        ...[-6, -3, 0, 3, 6].map((x) => [CYLINDER, [x, 5.8, 0], [0.07, 0.6, 0.07], GOLD]),
      ]),
      lit({ roughness: 0.6 }),
    );
    frame.castShadow = true;
    holder.addChild(frame);
    const cloth = canvasTexture(1024, 160, (c, w, h) => {
      c.fillStyle = '#b81a20';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#f7d560';
      c.font = '900 118px "Noto Serif SC", "Songti SC", "SimSun", "KaiTi", serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(words, w / 2, h / 2 + 6);
    });
    for (const facing of [0, Math.PI]) {
      const sign = new Mesh3D(
        createPlaneGeometry3D({ width: 14.4, height: 2.25 }),
        createStandardMaterial3D({ color: 0xffffff, map: cloth, roughness: 0.7 }),
      );
      sign.setPosition(0, 7.35, facing ? -0.06 : 0.06);
      sign.setRotation(0, facing, 0);
      sign.castShadow = false;
      holder.addChild(sign);
    }
  }
  for (const fraction of [0.045, 0.1, 0.33, 0.44, 0.69, 0.81, 0.955]) {
    const { holder, reach } = astride(fraction);
    const parts = [];
    for (const side of [-1, 1])
      parts.push([ROD, [side * reach, 3.7, 0], [0.12, 7.4, 0.12], 0x3a2a20], [BALL, [side * reach, 7.5, 0], 0.2, GOLD]);
    // The rope sags in the middle; a lantern hangs every couple of metres.
    const lanterns = Math.floor(reach / 1.4) * 2 + 1,
      sag = (t) => 7.2 - Math.sin(t * Math.PI) * 1.1;
    for (let k = 0; k < lanterns; k++) {
      const t = k / (lanterns - 1),
        x = (t * 2 - 1) * reach,
        y = sag(t);
      parts.push([BALL, [x, y - 0.5, 0], [0.34, 0.4, 0.34], k % 2 ? [1.6, 0.2, 0.12] : [1.6, 1.0, 0.2]]);
      parts.push([ROD, [x, y - 0.12, 0], [0.16, 0.08, 0.16], GOLD], [ROD, [x, y - 0.88, 0], [0.16, 0.08, 0.16], GOLD]);
      parts.push([ROD, [x, y - 1.12, 0], [0.03, 0.4, 0.03], [1.3, 0.75, 0.1]]);
      if (k) {
        // A length of rope back to the lantern before.
        const before = (k - 1) / (lanterns - 1),
          px = (before * 2 - 1) * reach,
          py = sag(before);
        parts.push([
          ROD,
          [(x + px) / 2, (y + py) / 2, 0],
          [0.025, Math.hypot(x - px, y - py), 0.025],
          0x222222,
          [0, 0, Math.atan2(px - x, y - py)],
        ]);
      }
    }
    const string = new Mesh3D(build(parts), lit({ roughness: 0.5 }));
    string.castShadow = false;
    holder.addChild(string);
  }

  // ---- a hall, willows, maples and the roadside verge ------------------------------------------------
  {
    // A temple hall with a double-eaved roof.
    const hall = build([
      [BOX, [0, 0.6, 0], [22, 1.2, 13], STONE],
      [BOX, [0, 1.3, 5.8], [8, 0.3, 2.4], 0xa8a396],
      [BOX, [0, 3.6, 0], [17, 4.8, 8.5], CREAM],
      ...[-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].flatMap((x) => [
        [CYLINDER, [x, 3.6, 4.6], [0.34, 4.8, 0.34], VERMILION],
        [CYLINDER, [x, 3.6, -4.6], [0.34, 4.8, 0.34], VERMILION],
      ]),
      [BOX, [0, 3.2, 4.3], [2.6, 3.8, 0.2], 0x7a1a14],
      ...[-5.2, 5.2].map((x) => [BOX, [x, 3.6, 4.3], [2.4, 2.2, 0.2], 0x7a1a14]),
      [BOX, [0, 6.2, 0], [18, 0.5, 9.6], 0x1f6f8a],
      [BOX, [0, 6.8, 0], [21.5, 0.5, 13], TILE],
      [BOX, [0, 7.3, 0], [19, 0.6, 10.4], 0x39594f],
      [BOX, [0, 8.4, 0], [13, 1.8, 6], CREAM],
      [BOX, [0, 9.5, 0], [16.5, 0.5, 9.6], TILE],
      [BOX, [0, 10.1, 0], [13.5, 0.7, 6.4], 0x39594f],
      [BOX, [0, 10.8, 0], [10.5, 0.7, 2.6], TILE],
      [BOX, [0, 11.3, 0], [10.8, 0.4, 0.6], GOLD],
      ...[-1, 1].flatMap((sx) => [
        [SPIKE, [sx * 5.6, 11.9, 0], [0.4, 1.1, 0.4], GOLD],
        ...[-1, 1].flatMap((sz) => [
          [SPIKE, [sx * 10.9, 7.5, sz * 6.6], [0.5, 1.8, 0.5], TILE, [sz * 0.8, 0, -sx * 0.8]],
          [SPIKE, [sx * 8.4, 10.2, sz * 4.9], [0.4, 1.4, 0.4], TILE, [sz * 0.8, 0, -sx * 0.8]],
        ]),
      ]),
    ]);
    // Its doors face the road.
    const halls = [...site(0.975, 62, 1), ...site(0.6, 70, 0.8)].map(([x, y, z, turn, size]) => {
      const at = track.locate(x, z, -1, here);
      return [x, y, z, turn + (at.lateral > 0 ? Math.PI / 2 : -Math.PI / 2), size];
    });
    copies(hall, halls, lit({ roughness: 0.65 }));

    // Willows trail their branches by the water; maples add red and gold to the hills.
    const willow = build([
      [ROD, [0, 1.8, 0], [0.3, 3.6, 0.3], 0x5a4a32, [0, 0, 0.08]],
      [BALL, [0.1, 4.3, 0], [2.1, 1.3, 2.1], 0x8fbf5a],
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => {
        const a = k * 0.63,
          r = 1.5 + (k % 3) * 0.35;
        return [
          SPIKE,
          [Math.cos(a) * r, 2.9 - (k % 2) * 0.3, Math.sin(a) * r],
          [0.34, 2.9 + (k % 3) * 0.5, 0.34],
          k % 2 ? 0x9fcf6a : 0x7fb04a,
          [Math.PI, 0, 0],
        ];
      }),
    ]);
    const maple = build([
      [ROD, [0, 1.3, 0], [0.24, 2.6, 0.24], 0x5a3a28],
      [BALL, [0, 3.5, 0], [1.7, 1.4, 1.7], 0xd9542a],
      [BALL, [1.1, 3, 0.3], [1.1, 0.9, 1.1], 0xf2a81d],
      [BALL, [-1, 3.1, -0.4], [1.2, 1, 1.2], 0xc8321e],
      [BALL, [0.2, 4.4, -0.2], [1, 0.8, 1], 0xf07a1a],
    ]);
    const willows = [],
      maples = [];
    for (let n = 0; n < 1400; n++) {
      const x = -450 + chance() * 900,
        z = -320 + chance() * 660,
        shore = track.lakeDistance(x, z),
        size = 0.9 + chance() * 0.6,
        tone = 0.85 + chance() * 0.3;
      if (shore > 1.16 && shore < 1.5 && willows.length < 46 && clear(x, z, 3))
        willows.push([x, ground(x, z) - 0.15, z, chance() * 6.28, size * 1.2, [tone, tone, tone]]);
      else if (shore > 1.5 && chance() < 0.16 && maples.length < 110 && clear(x, z, 12))
        maples.push([x, ground(x, z) - 0.15, z, chance() * 6.28, size * 1.1, [tone, tone, tone]]);
    }
    copies(willow, willows);
    copies(maple, maples);

    // Tufts of grass and wild flowers on the verge between the kerb and the wall.
    // Blades are four-sided so thousands of them stay cheap to draw.
    const tuft = build(
      [0, 1, 2].map((k) => [
        PYRAMID,
        [Math.cos(k * 2.1) * 0.12, 0.22, Math.sin(k * 2.1) * 0.12],
        [0.07, 0.46 + k * 0.1, 0.07],
        [1, 1, 1],
        [Math.sin(k * 2.1) * 0.4, 0, -Math.cos(k * 2.1) * 0.4],
      ]),
    );
    const bloom = build([
      [PYRAMID, [0, 0.16, 0], [0.025, 0.32, 0.025], 0x4f9440],
      ...[0, 1, 2, 3, 4].map((k) => [
        PYRAMID,
        [Math.cos(k * 1.257) * 0.09, 0.34, Math.sin(k * 1.257) * 0.09],
        [0.09, 0.04, 0.09],
        [1, 1, 1],
      ]),
      [PYRAMID, [0, 0.36, 0], [0.05, 0.05, 0.05], 0xf2c230],
    ]);
    const tufts = [],
      blooms = [],
      petals = [0xffffff, 0xf7a8c4, 0xffe08a, 0xc9b6f0, 0xff8a70].map(rgb),
      green = rgb(0x5fa646);
    for (let i = 0; i < track.count; i++) {
      if (track.bridge[i]) continue;
      for (let n = 0; n < 5; n++) {
        const side = chance() < 0.5 ? -1 : 1,
          lateral = side * (track.halfWidth[i] + 1.2 + chance() * (track.limit[i] - track.halfWidth[i] - 1.8)),
          at = track.sample((i + chance()) * track.step, lateral, {}),
          tone = 0.75 + chance() * 0.5;
        if (n < 4)
          tufts.push([
            at.x,
            at.y - 0.05,
            at.z,
            chance() * 6.28,
            0.7 + chance() * 0.8,
            [green[0] * tone, green[1] * tone, green[2] * tone],
          ]);
        else
          blooms.push([
            at.x,
            at.y - 0.05,
            at.z,
            chance() * 6.28,
            1 + chance() * 0.8,
            petals[Math.floor(chance() * petals.length)],
          ]);
      }
    }
    copies(tuft, tufts, lit({ roughness: 0.9 }), false);
    copies(bloom, blooms, lit({ roughness: 0.8 }), false);

    // Piers along the white walls, each under its own little tiled cap.
    const pier = build([
      [BOX, [0, 0.75, 0], [0.9, 1.9, 0.9], 0xf2efe6],
      [PYRAMID, [0, 2.0, 0], [0.85, 0.6, 0.85], TILE, [0, Math.PI / 4, 0]],
      [BALL, [0, 2.36, 0], 0.13, GOLD],
    ]);
    const piers = [];
    for (let i = 0; i < track.count; i += 5) {
      if (track.bridge[i] || track.bridge[(i + 5) % track.count] || track.bridge[(i + track.count - 5) % track.count]) continue;
      for (const side of [-1, 1]) {
        const at = track.sample(i * track.step, side * (track.limit[i] + 0.3), {});
        piers.push([at.x, at.y - 0.2, at.z, at.heading, 1]);
      }
    }
    copies(pier, piers);
  }

  // ---- life: boats, cranes, kites, sky lanterns and the sun -------------------------------------------
  const boats = [],
    cranes = [],
    kites = [],
    skyLanterns = [];
  {
    // Black-awning boats drift on the lake.
    const boat = build([
      [SPHERE, [0, 0.1, 0], [0.9, 0.4, 2.6], 0x5a3a22],
      [BOX, [0, 0.36, 0], [1.5, 0.08, 4.2], 0x7a5230],
      [CYLINDER, [0, 0.75, -0.2], [0.8, 2.2, 0.8], 0x1c1c22, [Math.PI / 2, 0, 0]],
      [ROD, [0.3, 1.4, 1.9], [0.04, 2.6, 0.04], 0x8a6a40, [0.5, 0, 0.1]],
      [BALL, [0, 1.0, 1.6], [0.22, 0.34, 0.2], 0x1f6f8a],
      [SPIKE, [0, 1.42, 1.6], [0.42, 0.22, 0.42], 0xd9c79a],
    ]);
    for (let n = 0; n < 200 && boats.length < 5; n++) {
      const x = lake.x + (chance() * 2 - 1) * lake.rx * 0.8,
        z = lake.z + (chance() * 2 - 1) * lake.rz * 0.8,
        at = track.locate(x, z, -1, here);
      if (track.lakeDistance(x, z) < 0.8 && Math.abs(at.lateral) > at.limit + 12)
        boats.push({ x, z, turn: chance() * 6.28, phase: chance() * 6.28 });
    }
    scenery.boats = copies(
      boat,
      boats.map((b) => [b.x, TRACK.waterLevel, b.z, b.turn, 1]),
      lit({ roughness: 0.7 }),
    );

    // Cranes circle high over the lake.
    const crane = build([
      [SPHERE, [0, 0, 0], [0.22, 0.2, 0.7], 0xfbfbf6],
      [ROD, [0, 0.1, 0.8], [0.05, 0.9, 0.05], 0xfbfbf6, [1.2, 0, 0]],
      [BALL, [0, 0.26, 1.22], [0.09, 0.09, 0.12], 0xd8262c],
      [SPIKE, [0, 0.24, 1.42], [0.03, 0.3, 0.03], 0x3a3a3a, [Math.PI / 2, 0, 0]],
      [ROD, [0, -0.05, -0.95], [0.02, 0.9, 0.02], 0x3a3a3a, [Math.PI / 2, 0, 0]],
      [BOX, [0.9, 0.05, 0], [1.7, 0.03, 0.55], 0xfbfbf6],
      [BOX, [-0.9, 0.05, 0], [1.7, 0.03, 0.55], 0xfbfbf6],
      [BOX, [1.55, 0.05, -0.1], [0.5, 0.035, 0.5], 0x1c1c22],
      [BOX, [-1.55, 0.05, -0.1], [0.5, 0.035, 0.5], 0x1c1c22],
    ]);
    for (let k = 0; k < 9; k++)
      cranes.push({ lag: k * 0.09 + (k % 2) * 0.03, out: (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 2.4, phase: chance() * 6.28 });
    scenery.cranes = copies(
      crane,
      cranes.map(() => [0, 60, 0, 0, 1.6]),
      lit({ roughness: 0.7, side: 'double' }),
      false,
    );

    // Kites fly over the infield and paper lanterns rise in the distance.
    const kite = build([
      [BOX, [0, 0, 0], [2.4, 2.4, 0.04], [1, 1, 1], [0, 0, Math.PI / 4]],
      [BOX, [0, 0, 0.03], [0.1, 3.2, 0.04], 0x3a2a20],
      [BOX, [0, 0, 0.03], [3.2, 0.1, 0.04], 0x3a2a20],
      ...[1, 2, 3, 4, 5].map((k) => [
        BOX,
        [Math.sin(k * 1.3) * 0.25, -1.7 - k * 0.7, 0],
        [0.5, 0.26, 0.03],
        k % 2 ? 0xf2c230 : 0xd8262c,
        [0, 0, Math.sin(k) * 0.5],
      ]),
    ]);
    const kiteColors = [0xd8262c, 0xf2c230, 0x2e8b57, 0x1f6f8a, 0xf07a1a, 0xb9a4e8].map(rgb);
    for (let k = 0; k < 6; k++)
      kites.push({
        x: -60 + chance() * 260,
        z: -110 + chance() * 150,
        y: 55 + chance() * 30,
        phase: chance() * 6.28,
        color: kiteColors[k],
      });
    scenery.kites = copies(
      kite,
      kites.map((k) => [k.x, k.y, k.z, 0, 2.2, k.color]),
      lit({ roughness: 0.7, side: 'double' }),
      false,
    );

    const skyLantern = build([
      [
        createCylinderGeometry3D({ radiusTop: 1, radiusBottom: 0.7, height: 1, radialSegments: 8 }),
        [0, 0, 0],
        [1, 1.5, 1],
        [1.7, 0.9, 0.3],
      ],
      [BALL, [0, -0.6, 0], 0.35, [2.6, 2.0, 0.8]],
    ]);
    for (let k = 0; k < 26; k++)
      skyLanterns.push({
        x: -380 + chance() * 760,
        z: -260 + chance() * 560,
        speed: 1.2 + chance() * 1.6,
        phase: chance() * 120,
        sway: chance() * 6.28,
      });
    scenery.skyLanterns = copies(
      skyLantern,
      skyLanterns.map((l) => [l.x, 40, l.z, 0, 1.6]),
      createUnlitMaterial3D({ color: 0xffffff, vertexColors: true, fog: false }),
      false,
    );

    // The sun: a bright disc on the side the light comes from.
    const disc = new Mesh3D(sunShape(), createUnlitMaterial3D({ color: [3.2, 2.6, 1.7], fog: false, side: 'double' }));
    disc.castShadow = false;
    disc.frustumCulled = false;
    disc.setScale(46);
    scene.addChild(disc);
    scenery.sunDisc = disc;
  }

  // ---- what moves ----------------------------------------------------------------------------
  const position = [0, 0, 0],
    flap = [1, 1, 1];
  /** Advance the water, drift the clouds, scroll the boost pads and let the crowd bounce; `excitement` is 0 to 1. */
  scenery.update = (dt, time, excitement = 0.3) => {
    water.update(dt);
    scenery.clouds.setRotation(0, time * 0.004, 0);
    arrows.offset[1] = -(time * 1.6) % 1;
    // Boats bob and turn slowly; cranes fly a wide circle in a V.
    boats.forEach((boat, i) => {
      position[0] = boat.x + Math.sin(time * 0.05 + boat.phase) * 6;
      position[1] = TRACK.waterLevel + Math.sin(time * 1.1 + boat.phase) * 0.06;
      position[2] = boat.z + Math.cos(time * 0.04 + boat.phase) * 5;
      scenery.boats.setTransformAt(i, position, yawQuat(boat.turn + Math.sin(time * 0.07 + boat.phase) * 0.6), 1);
    });
    cranes.forEach((crane, i) => {
      const a = time * 0.11 - crane.lag,
        radius = 150 + crane.out;
      position[0] = lake.x + 60 + Math.cos(a) * radius;
      position[1] = 62 + Math.sin(time * 0.4 + crane.phase) * 1.5 - Math.abs(crane.out) * 0.2;
      position[2] = lake.z - 120 + Math.sin(a) * radius * 0.8;
      // Wings beat by stretching the model's height.
      flap[0] = 1.6;
      flap[1] = 1.6 * (1 + Math.sin(time * 5 + crane.phase) * 2.5);
      flap[2] = 1.6;
      scenery.cranes.setTransformAt(i, position, yawQuat(-a), flap);
    });
    kites.forEach((kite, i) => {
      position[0] = kite.x + Math.sin(time * 0.5 + kite.phase) * 5;
      position[1] = kite.y + Math.sin(time * 0.8 + kite.phase) * 3;
      position[2] = kite.z + Math.cos(time * 0.37 + kite.phase) * 4;
      scenery.kites.setTransformAt(i, position, yawQuat(0.6 + Math.sin(time * 0.4 + kite.phase) * 0.5), 2.2);
    });
    skyLanterns.forEach((lantern, i) => {
      position[0] = lantern.x + Math.sin(time * 0.2 + lantern.sway) * 4;
      position[1] = 20 + ((time * lantern.speed + lantern.phase) % 130);
      position[2] = lantern.z;
      scenery.skyLanterns.setTransformAt(i, position, yawQuat(lantern.sway), 1.6);
    });
    const turn = yawQuat(scenery.crowdTurn);
    for (let i = 0; i < fans.length; i++) {
      const fan = fans[i];
      position[0] = fan.x;
      position[1] = fan.y + Math.max(0, Math.sin(time * fan.pace + fan.phase)) * (0.12 + excitement * 0.45);
      position[2] = fan.z;
      scenery.crowd.setTransformAt(i, position, turn, 1);
    }
  };

  return scenery;
}
