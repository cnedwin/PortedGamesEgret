// Everything in the map that never moves, turned from the box list in
// level.mjs into a handful of meshes: one per surface, so the whole station
// costs only a few draw calls.
import { Mesh3D, createGeometry3D, createStandardMaterial3D, createUnlitMaterial3D } from '@egret/engine/world3d';
import { createBuilder, rgb } from './build.mjs';
import { BOUNDS, BOXES, PLACES } from './level.mjs';
import { canvasTexture, dotTexture } from './textures.mjs';

const WHITE = [1, 1, 1];
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

/** Build the static scenery into `scene`. `surfaces` come from textures.mjs. */
export function buildScenery(scene, surfaces) {
  // One builder per surface; `plain` has no texture and `glow` is not lit.
  const groups = {};
  for (const name of [...Object.keys(surfaces), 'plain', 'glow']) groups[name] = createBuilder();
  const { concrete, asphalt, container, wall, wood, sandbag, metal, plain, glow } = groups;

  const OLIVE = rgb(0x4d5a3c),
    STEEL = rgb(0x6f757a),
    DARK = rgb(0x24272a),
    RUBBER = rgb(0x151515),
    GLASS = rgb(0x1a2a33),
    YELLOW = rgb(0xd9a520),
    PLANT = rgb(0xa9b3a6),
    OFFICE = rgb(0xcbbf9f);

  // ---- ground ---------------------------------------------------------------------------
  const width = BOUNDS.maxX - BOUNDS.minX,
    depth = BOUNDS.maxZ - BOUNDS.minZ,
    midX = (BOUNDS.maxX + BOUNDS.minX) / 2,
    midZ = (BOUNDS.maxZ + BOUNDS.minZ) / 2;
  asphalt.box(midX, -0.1, midZ, width + 2, 0.2, depth + 2, { tile: 5, skipBottom: true });
  // Concrete aprons in front of the buildings and under the yard.
  concrete.box(4, 0.006, -5.5, 26, 0.012, 5, { tile: 4, tint: shade(WHITE, 0.9), skipBottom: true });
  concrete.box(27, 0.007, 21, 14, 0.014, 14, { tile: 4, tint: shade(WHITE, 0.82), skipBottom: true });
  concrete.box(-24, 0.005, 2, 26, 0.01, 54, { tile: 4, tint: shade(WHITE, 0.78), skipBottom: true });
  // Road lines from the gate to the powerhouse.
  for (let z = 22; z > -4; z -= 3.2) plain.box(1.5, 0.012, z, 0.16, 0.004, 1.6, { tint: shade(WHITE, 0.75), skipBottom: true });
  for (const x of [-1.6, 4.6]) plain.box(x, 0.012, 9, 0.12, 0.004, 28, { tint: shade(YELLOW, 0.8), skipBottom: true });
  // The land outside the wall.
  plain.box(0, -0.3, 0, 900, 0.2, 900, { tint: rgb(0x3a4634), skipBottom: true });

  // ---- the boxes of the map ---------------------------------------------------------------
  const wheels = (cx, cz, along, spots, track) => {
    for (const spot of spots)
      for (const side of [-1, 1]) {
        const x = along === 'x' ? cx + spot : cx + side * track,
          z = along === 'x' ? cz + side * track : cz + spot;
        plain.cylinder(x, 0.5, z, 0.5, 0.32, { axis: along === 'x' ? 'z' : 'x', sides: 12, tint: RUBBER });
      }
  };
  for (const b of BOXES) {
    const top = b.y + b.h / 2,
      tint = b.tint ? rgb(b.tint) : WHITE;
    switch (b.kind) {
      case 'dam': {
        // The foot of the dam: a stepped face with buttresses and three sluice gates.
        concrete.box(b.x, b.y, b.z, b.w, b.h, b.d, { tile: 7, tint: shade(WHITE, 0.82) });
        for (let x = -40; x <= 40; x += 10)
          concrete.box(x, 9, b.z + b.d / 2 + 0.6, 1.6, 18, 1.2, { tile: 5, tint: shade(WHITE, 0.74) });
        concrete.box(b.x, 18.4, b.z + b.d / 2 + 0.9, b.w, 0.8, 1.8, { tile: 5, tint: shade(WHITE, 0.7) });
        for (const x of [-25, -15, 25]) {
          plain.box(x, 5.5, b.z + b.d / 2 + 0.02, 6, 7, 0.05, { tint: rgb(0x10161a) });
          metal.box(x, 7.4, b.z + b.d / 2 + 0.12, 6.2, 3.2, 0.2, { tile: 2.5, tint: rgb(0x566a72) });
          for (const side of [-3.3, 3.3])
            concrete.box(x + side, 5.5, b.z + b.d / 2 + 0.25, 0.6, 7.6, 0.5, { tile: 4, tint: shade(WHITE, 0.7) });
        }
        // Railing along the crest.
        for (let x = -44; x <= 44; x += 4) plain.box(x, 26.6, b.z + b.d / 2 - 0.3, 0.08, 1.1, 0.08, { tint: DARK });
        plain.box(b.x, 27.1, b.z + b.d / 2 - 0.3, b.w, 0.06, 0.06, { tint: DARK });
        break;
      }
      case 'dam-step':
        concrete.box(b.x, b.y, b.z, b.w, b.h, b.d, { tile: 4, tint: shade(WHITE, 0.72) });
        break;
      case 'compound':
        concrete.box(b.x, b.y, b.z, b.w, b.h, b.d, { tile: 3.5, tint: shade(WHITE, 0.66) });
        // A coping stone and a line of razor wire posts on top.
        concrete.box(b.x, top + 0.08, b.z, b.w + 0.2, 0.16, b.d + 0.2, { tile: 2, tint: shade(WHITE, 0.55) });
        break;
      case 'plant':
        wall.box(b.x, b.y, b.z, b.w, b.h, b.d, { tile: 4, tint: PLANT });
        break;
      case 'office':
        wall.box(b.x, b.y, b.z, b.w, b.h, b.d, { tile: 3.2, tint: OFFICE });
        break;
      case 'roof':
        metal.box(b.x, b.y, b.z, b.w, b.h, b.d, { tile: 4, tint: rgb(0x4a5258) });
        break;
      case 'container': {
        container.box(b.x, b.y, b.z, b.w, b.h, b.d, { tile: 2.6, tint });
        // Corner posts and the locking bars on one end.
        const lx = b.w / 2 - 0.06,
          lz = b.d / 2 - 0.06,
          frame = shade(tint, 0.6);
        for (const sx of [-1, 1])
          for (const sz of [-1, 1]) plain.box(b.x + sx * lx, b.y, b.z + sz * lz, 0.14, b.h + 0.02, 0.14, { tint: frame });
        if (b.along === 'x')
          for (const dz of [-0.6, -0.2, 0.2, 0.6])
            plain.box(b.x + b.w / 2 + 0.03, b.y, b.z + dz, 0.04, b.h - 0.3, 0.04, { tint: STEEL });
        else
          for (const dx of [-0.6, -0.2, 0.2, 0.6])
            plain.box(b.x + dx, b.y, b.z + b.d / 2 + 0.03, 0.04, b.h - 0.3, 0.04, { tint: STEEL });
        break;
      }
      case 'crate':
        wood.box(b.x, b.y, b.z, b.w, b.h, b.d, { tile: 1.1, tint: shade(WHITE, 0.95), yaw: (b.x * 7 + b.z * 3) % 0.2 });
        break;
      case 'barrier': {
        // A wide foot and a narrower top with a warning stripe, like a road barrier.
        const alongX = b.w > b.d,
          w = alongX ? b.w : b.w - 0.2,
          d = alongX ? b.d - 0.2 : b.d;
        concrete.box(b.x, b.y, b.z, w, b.h, d, { tile: 1.6, tint: shade(WHITE, 0.95) });
        concrete.box(b.x, 0.2, b.z, b.w, 0.4, b.d, { tile: 1.6, tint: shade(WHITE, 0.85) });
        plain.box(b.x, top - 0.12, b.z, w + 0.01, 0.12, d + 0.01, { tint: shade(YELLOW, 0.7) });
        break;
      }
      case 'sandbag':
        sandbag.box(b.x, b.y, b.z, b.w, b.h, b.d, { tile: 1.15 });
        break;
      case 'booth':
        wall.box(b.x, 0.55, b.z, b.w, 1.1, b.d, { tile: 3, tint: rgb(0x8d9a8e) });
        plain.box(b.x, 1.65, b.z, b.w - 0.04, 1.1, b.d - 0.04, { tint: GLASS });
        for (const sx of [-1, 1])
          for (const sz of [-1, 1]) plain.box(b.x + (sx * b.w) / 2, 1.65, b.z + (sz * b.d) / 2, 0.14, 1.1, 0.14, { tint: DARK });
        metal.box(b.x, top - 0.1, b.z, b.w + 0.8, 0.2, b.d + 0.8, { tile: 2, tint: rgb(0x4a5258) });
        break;
      case 'truck-bed': {
        const lengthX = b.along === 'x';
        metal.box(b.x, 1.08, b.z, b.w, 0.3, b.d, { tile: 2, tint: shade(tint, 0.8) });
        container.box(b.x, 2.05, b.z, b.w - 0.1, 1.65, b.d - 0.1, { tile: 1.3, tint: shade(tint, 1.25) });
        wheels(b.x, b.z, b.along, [-1.3, 1.3], 1.05);
        plain.box(b.x, 0.7, b.z, lengthX ? b.w : 0.5, 0.5, lengthX ? 0.5 : b.d, { tint: DARK });
        break;
      }
      case 'truck-cab': {
        const lengthX = b.along === 'x';
        metal.box(b.x, 1.5, b.z, b.w, 1.8, b.d, { tile: 2.4, tint });
        // Windscreen and side windows.
        if (lengthX) plain.box(b.x + 0.3, 1.9, b.z, b.w - 0.55, 0.7, b.d + 0.03, { tint: GLASS });
        else plain.box(b.x, 1.9, b.z + 0.3, b.w + 0.03, 0.7, b.d - 0.55, { tint: GLASS });
        if (lengthX) plain.box(b.x + b.w / 2, 1.9, b.z, 0.04, 0.72, b.d - 0.3, { tint: GLASS });
        else plain.box(b.x, 1.9, b.z + b.d / 2, b.w - 0.3, 0.72, 0.04, { tint: GLASS });
        plain.box(
          b.x + (lengthX ? b.w / 2 + 0.06 : 0),
          0.7,
          b.z + (lengthX ? 0 : b.d / 2 + 0.06),
          lengthX ? 0.16 : b.w,
          0.3,
          lengthX ? b.d : 0.16,
          { tint: DARK },
        );
        wheels(b.x, b.z, b.along, [0.2], 1.05);
        for (const side of [-0.8, 0.8])
          glow.box(
            b.x + (lengthX ? b.w / 2 + 0.02 : side),
            1.05,
            b.z + (lengthX ? side : b.d / 2 + 0.02),
            lengthX ? 0.04 : 0.3,
            0.16,
            lengthX ? 0.3 : 0.04,
            { tint: [0.6, 0.55, 0.4] },
          );
        break;
      }
      case 'generator':
        concrete.box(b.x, 0.25, b.z, b.w, 0.5, b.d, { tile: 2, tint: shade(WHITE, 0.8) });
        metal.cylinder(b.x, 1.25, b.z, 1.55, 1.5, { tile: 2.4, tint: rgb(0x3f7286), sides: 24 });
        plain.cylinder(b.x, 1.98, b.z, 1.58, 0.08, { tint: YELLOW, sides: 24 });
        metal.cylinder(b.x, 2.45, b.z, 0.75, 0.9, { tile: 2, tint: rgb(0x5f6b70), sides: 16 });
        plain.cylinder(b.x, 3.9, b.z, 0.12, 2, { tint: DARK, sides: 8 });
        break;
      case 'console':
        metal.box(b.x, b.y, b.z, b.w, b.h, b.d, { tile: 2, tint: rgb(0x7a8488) });
        for (let i = -2; i <= 2; i++)
          if (i !== 0)
            glow.box(b.x + i * 0.9, 1.5, b.z + 0.1, 0.7, 0.45, 0.04, { tint: i % 2 ? [0.02, 0.09, 0.12] : [0.02, 0.08, 0.04] });
        break;
      case 'pipe-rack':
        for (const [dy, r] of [
          [0.5, 0.22],
          [1.1, 0.16],
          [1.7, 0.22],
        ])
          metal.cylinder(b.x, dy, b.z, r, b.d, { axis: 'z', sides: 10, tile: 1.5, tint: rgb(0x8a6a2c) });
        for (const dz of [-1.2, 1.2]) plain.box(b.x, 1.1, b.z + dz, b.w, 2.2, 0.1, { tint: DARK });
        break;
      case 'cabinet':
        metal.box(b.x, b.y, b.z, b.w, b.h, b.d, { tile: 1.6, tint: rgb(0x6f7d74) });
        break;
      case 'transformer':
        metal.box(b.x, 1.0, b.z, b.w, 2.0, b.d, { tile: 1.5, tint: rgb(0x5c6a5f) });
        for (const dz of [-0.6, 0, 0.6]) {
          plain.cylinder(b.x, 2.3, b.z + dz, 0.09, 0.6, { tint: rgb(0x8a4b35), sides: 8 });
          plain.cylinder(b.x, 2.65, b.z + dz, 0.05, 0.12, { tint: STEEL, sides: 8 });
        }
        for (let fin = -0.8; fin <= 0.8; fin += 0.2)
          plain.box(b.x + b.w / 2 + 0.12, 1, b.z + fin, 0.22, 1.5, 0.04, { tint: rgb(0x48544b) });
        break;
      case 'server':
        metal.box(b.x, b.y, b.z, b.w, b.h, b.d, { tile: 1.2, tint: rgb(0x2b2f33) });
        for (let row = 0; row < 6; row++)
          for (let col = -3; col <= 3; col++)
            glow.box(b.x - b.w / 2 - 0.01, 0.4 + row * 0.28, b.z + col * 0.32, 0.02, 0.03, 0.12, {
              tint: (row + col) % 3 ? [0.1, 0.7, 0.3] : [0.8, 0.5, 0.1],
            });
        break;
      case 'desk':
        wood.box(b.x, top - 0.03, b.z, b.w, 0.06, b.d, { tile: 1.4, tint: shade(WHITE, 0.8) });
        plain.box(b.x, (top - 0.06) / 2, b.z, b.w - 0.1, top - 0.06, b.d - 0.1, { tint: rgb(0x3a3d40) });
        glow.box(b.x, top + 0.2, b.z, b.w > b.d ? 0.5 : 0.03, 0.3, b.w > b.d ? 0.03 : 0.5, { tint: [0.1, 0.25, 0.35] });
        break;
      case 'sofa':
        plain.box(b.x, 0.25, b.z, b.w, 0.5, b.d, { tint: rgb(0x55402f) });
        plain.box(b.x, 0.6, b.z + b.d / 2 - 0.12, b.w, 0.5, 0.24, { tint: rgb(0x4a3828) });
        break;
      case 'post':
      case 'leg':
        plain.box(b.x, b.y, b.z, b.w, b.h, b.d, { tint: b.kind === 'leg' ? rgb(0x5b6166) : DARK });
        break;
      case 'canopy':
        plain.box(b.x, b.y, b.z, b.w, b.h, b.d, { tint: OLIVE });
        break;
      case 'tank':
        metal.cylinder(b.x, b.y, b.z, 2, b.h, { tile: 3, tint: rgb(0x7f8a8c), sides: 20 });
        plain.box(b.x, b.y - b.h / 2 - 0.1, b.z, 3.4, 0.2, 3.4, { tint: rgb(0x5b6166) });
        break;
      case 'supply':
        // Supply crates open, so the view draws them itself.
        break;
      default:
        plain.box(b.x, b.y, b.z, b.w, b.h, b.d, { tint });
    }
  }

  // ---- lamps: a pole, an arm and a lit head (the lights themselves are added by the view) ---
  for (const [x, y, z] of PLACES.lamps) {
    const outdoors = y > 4.5 && !(x > -8 && x < 16 && z < -8 && z > -26);
    if (outdoors) {
      plain.box(x + 0.9, y / 2, z, 0.14, y, 0.14, { tint: rgb(0x4a4f52) });
      plain.box(x + 0.45, y + 0.05, z, 1, 0.08, 0.1, { tint: rgb(0x4a4f52) });
    } else plain.box(x, y + 0.3, z, 0.04, 0.6, 0.04, { tint: DARK });
    plain.box(x, y + 0.02, z, 0.5, 0.1, 0.3, { tint: DARK });
    glow.box(x, y - 0.04, z, 0.42, 0.04, 0.24, { tint: [1.8, 1.5, 1.0] });
  }

  // ---- the hills beyond the wall ----------------------------------------------------------
  // Rings of ground rising away from the station; the valley narrows towards the dam and
  // opens to the south-east, where the helicopter comes from.
  const hills = (() => {
    const SPOKES = 72,
      RINGS = [58, 95, 150, 230, 340],
      positions = [],
      colors = [],
      indices = [];
    const near = rgb(0x3f4f38),
      far = rgb(0x5d6b5c);
    for (let ring = 0; ring < RINGS.length; ring++)
      for (let i = 0; i < SPOKES; i++) {
        const angle = (i / SPOKES) * Math.PI * 2,
          north = Math.max(0, -Math.cos(angle)),
          open = Math.max(0, Math.cos(angle - 0.9)) ** 6,
          rough = 0.55 + 0.25 * Math.sin(angle * 5 + ring) + 0.2 * Math.sin(angle * 11 + ring * 2.3),
          rise = [0.02, 0.38, 0.8, 1, 0.9][ring],
          height = (16 + north * 58 + rough * 34) * rise * (1 - open * 0.85) + (ring === 0 ? north * 16 : 0),
          reach = RINGS[ring] * (1 + 0.06 * Math.sin(angle * 7 + ring));
        positions.push(Math.sin(angle) * reach, height - 0.25, Math.cos(angle) * reach);
        const haze = ring / (RINGS.length - 1),
          patch = 0.85 + 0.15 * Math.sin(angle * 23 + ring * 5);
        colors.push(
          (near[0] + (far[0] - near[0]) * haze) * patch,
          (near[1] + (far[1] - near[1]) * haze) * patch,
          (near[2] + (far[2] - near[2]) * haze) * patch,
        );
      }
    for (let ring = 0; ring < RINGS.length - 1; ring++)
      for (let i = 0; i < SPOKES; i++) {
        const a = ring * SPOKES + i,
          b = ring * SPOKES + ((i + 1) % SPOKES),
          c = a + SPOKES,
          d = b + SPOKES;
        indices.push(a, b, c, b, d, c);
      }
    return createGeometry3D({ positions, colors, indices }).computeNormals();
  })();
  {
    const mesh = new Mesh3D(
      hills,
      createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 1, flatShading: true }),
    );
    mesh.frustumCulled = false;
    scene.addChild(mesh);
  }

  // ---- trees: dark firs beyond the wall and a few inside it ---------------------------------
  const fir = (x, z, size) => {
    plain.cylinder(x, size * 0.5, z, 0.14 * size, size, { sides: 5, tint: rgb(0x3b2f24) });
    plain.cylinder(x, size * 1.5, z, 1.05 * size, size * 1.6, { top: 0.35 * size, sides: 7, tint: rgb(0x243a26), caps: false });
    plain.cylinder(x, size * 2.5, z, 0.75 * size, size * 1.7, { top: 0.02, sides: 7, tint: rgb(0x2b4530), caps: false });
  };
  for (let i = 0; i < 54; i++) {
    // Spread round the outside of the compound, a little unevenly.
    const angle = (i / 54) * Math.PI * 2 + Math.sin(i * 3.7) * 0.05,
      reach = 50 + ((i * 37) % 11) * 1.6,
      x = Math.sin(angle) * reach * 1.05,
      z = Math.cos(angle) * reach * 0.95 + 2;
    if (z < -24 && Math.abs(x) < 50) continue; // the dam stands there
    fir(x, z, 2.2 + ((i * 13) % 7) * 0.22);
  }
  for (const [x, z, size] of [
    [-35.5, 29.5, 1.5],
    [35, -24.5, 1.7],
    [36, 12.5, 1.4],
    [-10.5, 29.8, 1.3],
  ])
    fir(x, z, size);

  // ---- water falling from the sluice gates ---------------------------------------------------
  const water = createBuilder();
  for (const x of [-25, -15, 25]) {
    water.box(x, 3.4, BOUNDS.minZ + 0.35, 5.4, 6.4, 0.3, { tint: [0.75, 0.85, 0.9] });
    water.box(x, 0.2, BOUNDS.minZ + 1.6, 6.2, 0.5, 1.6, { tint: [0.9, 0.95, 0.97] });
  }

  // ---- puddles: last night's rain, lying in the low spots and mirroring the sky --------------
  const puddles = createBuilder();
  for (const [x, z, w, d, turn] of [
    [-6, 17, 3.2, 2, 0.3],
    [7.5, 5.5, 2.6, 3.6, 1.1],
    [-12, -6.5, 3.8, 2.2, 0.6],
    [15, 19, 2.4, 2.4, 0],
    [-24, 13.2, 2.2, 1.4, 0.2],
    [3, -6.2, 4.2, 1.6, 0],
    [24, 10, 3, 2.2, 0.8],
    [-30, -17.5, 2.6, 1.8, 0.4],
    [20.5, -11, 1.8, 3, 0.1],
    [-3, 27, 2.6, 1.6, 0.5],
  ])
    puddles
      .cylinder(x, 0.016, z, Math.min(w, d) / 2, 0.004, { sides: 14 })
      .cylinder(x + Math.cos(turn) * w * 0.28, 0.016, z + Math.sin(turn) * d * 0.28, Math.min(w, d) * 0.36, 0.004, { sides: 12 })
      .cylinder(x - Math.cos(turn) * w * 0.3, 0.016, z - Math.sin(turn) * d * 0.22, Math.min(w, d) * 0.3, 0.004, { sides: 12 });

  // ---- one mesh per surface ----------------------------------------------------------------
  const add = (builder, material, { shadows = true, tangents = true } = {}) => {
    if (builder.empty) return;
    const mesh = new Mesh3D(builder.finish({ tangents }), material);
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    scene.addChild(mesh);
  };
  const lit = (surface, more) =>
    createStandardMaterial3D({
      color: 0xffffff,
      vertexColors: true,
      map: surface.map,
      normalMap: surface.normalMap,
      roughness: 0.9,
      ...more,
    });
  add(concrete, lit(surfaces.concrete, { roughness: 0.95 }));
  add(asphalt, lit(surfaces.asphalt, { roughness: 0.88 }), { shadows: false });
  add(container, lit(surfaces.container, { roughness: 0.6, metallic: 0.35 }));
  add(wall, lit(surfaces.wall, { roughness: 0.93 }));
  add(wood, lit(surfaces.wood, { roughness: 0.85 }));
  add(sandbag, lit(surfaces.sandbag, { roughness: 1 }));
  add(metal, lit(surfaces.metal, { roughness: 0.5, metallic: 0.6 }));
  add(plain, createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.8 }), { tangents: false });
  add(glow, createUnlitMaterial3D({ color: 0xffffff, vertexColors: true, toneMapped: false }), {
    shadows: false,
    tangents: false,
  });
  add(
    water,
    createUnlitMaterial3D({ color: 0xffffff, vertexColors: true, opacity: 0.6, alphaMode: 'blend', depthWrite: false }),
    {
      shadows: false,
      tangents: false,
    },
  );
  add(
    puddles,
    createStandardMaterial3D({
      color: 0x0b0e11,
      roughness: 0.04,
      opacity: 0.72,
      alphaMode: 'blend',
      depthWrite: false,
      environmentIntensity: 2.2,
    }),
    { shadows: false, tangents: false },
  );

  // ---- the sun, just clear of the ridge: a bright disc inside a wide soft glow ----------------
  {
    const direction = [0.72, 0.4, 0.56],
      halo = createBuilder();
    for (const [size, strength] of [
      [16, 3],
      [70, 0.5],
      [190, 0.16],
    ])
      halo.box(direction[0] * 400, direction[1] * 400, direction[2] * 400, size, size, 0.01, {
        fit: true,
        tint: [strength, strength * 0.78, strength * 0.5],
        yaw: Math.atan2(direction[0], direction[2]),
        pitch: -Math.asin(direction[1]),
      });
    const sun = new Mesh3D(
      halo.finish(),
      createUnlitMaterial3D({
        color: 0xffffff,
        vertexColors: true,
        map: dotTexture(64, 2.2),
        alphaMode: 'blend',
        blending: 'additive',
        depthWrite: false,
        fog: false,
        toneMapped: false,
        side: 'double',
      }),
    );
    sun.frustumCulled = false;
    scene.addChild(sun);
  }

  // ---- stencilled zone letters on the walls beside each terminal ------------------------------
  const stencil = (letter, x, y, z, yaw, size = 2.2) => {
    const texture = canvasTexture(128, 128, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.fillStyle = 'rgba(235, 228, 205, 0.85)';
      c.font = 'bold 112px Impact, "Arial Black", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(letter, w / 2, h / 2 + 6);
      // Stencil bridges and wear.
      c.globalCompositeOperation = 'destination-out';
      c.fillRect(0, h * 0.47, w, 5);
      for (let i = 0; i < 160; i++)
        c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 1 + Math.random() * 2);
    });
    if (!texture) return;
    const sign = new Mesh3D(
      createBuilder().box(x, y, z, size, size, 0.01, { fit: true, yaw }).finish(),
      createStandardMaterial3D({ color: 0xffffff, map: texture, alphaMode: 'blend', depthWrite: false, roughness: 0.9 }),
    );
    scene.addChild(sign);
  };
  stencil('A', -37.96, 2.6, 13, Math.PI / 2);
  stencil('B', -2, 5.6, -7.72, 0, 3);
  stencil('C', 21.76, 2.9, -8.5, -Math.PI / 2);

  // ---- the helipad mark ------------------------------------------------------------------
  const pad = canvasTexture(512, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#e8c63a';
    c.lineWidth = 22;
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2 - 24, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#e9e6dc';
    c.fillRect(w * 0.3, h * 0.26, w * 0.09, h * 0.48);
    c.fillRect(w * 0.61, h * 0.26, w * 0.09, h * 0.48);
    c.fillRect(w * 0.3, h * 0.455, w * 0.4, h * 0.09);
    // Wear: knock some paint off.
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 900; i++) c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 5, 1 + Math.random() * 3);
  });
  if (pad) {
    const mark = createBuilder().box(
      PLACES.helipad.x,
      0.02,
      PLACES.helipad.z,
      PLACES.helipad.radius * 2,
      0.004,
      PLACES.helipad.radius * 2,
      { fit: true, skipBottom: true },
    );
    const mesh = new Mesh3D(
      mark.finish(),
      createStandardMaterial3D({ color: 0xffffff, map: pad, alphaMode: 'blend', depthWrite: false, roughness: 0.9 }),
    );
    mesh.receiveShadow = true;
    scene.addChild(mesh);
  }
}
