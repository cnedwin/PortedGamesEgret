// Everything in the map that never moves, turned from the box list in
// level.mjs into a handful of meshes: one per surface, so the whole station
// costs only a few draw calls.
import { Mesh3D, createGeometry3D, createStandardMaterial3D, createUnlitMaterial3D } from '@egret/engine/world3d';
import { createBuilder, rgb } from './build.mjs';
import { BOUNDS, BOXES, PLACES } from './level.mjs';
import { weather } from './grime.mjs';
import { canvasTexture, dotTexture } from './textures.mjs';

const WHITE = [1, 1, 1];
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

/** Build the static scenery into `scene`. `surfaces` come from textures.mjs. */
export function buildScenery(scene, surfaces) {
  // One builder per surface; `plain` has no texture and `glow` is not lit.
  const groups = {};
  for (const name of [...Object.keys(surfaces), 'plain', 'glow']) groups[name] = createBuilder();
  // Concrete laid flat on the ground is wet like the tarmac, so it is kept apart from the walls.
  const apron = createBuilder();
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
  apron.box(4, 0.006, -5.5, 26, 0.012, 5, { tile: 4, tint: shade(WHITE, 0.9), skipBottom: true });
  apron.box(27, 0.007, 21, 14, 0.014, 14, { tile: 4, tint: shade(WHITE, 0.82), skipBottom: true });
  apron.box(-24, 0.005, 2, 26, 0.01, 54, { tile: 4, tint: shade(WHITE, 0.78), skipBottom: true });
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
        sandbag.box(b.x, b.y, b.z, b.w, b.h, b.d, { tile: 0.95 });
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
      case 'barrel':
        metal.cylinder(b.x, b.y, b.z, 0.29, b.h, { tile: 1.2, tint, sides: 12 });
        for (const ring of [0.28, 0.6])
          plain.cylinder(b.x, ring, b.z, 0.3, 0.03, { tint: shade(tint, 0.6), sides: 12, caps: false });
        break;
      case 'pallet':
        for (const dy of [0.05, 0.37])
          for (let slat = -0.5; slat <= 0.5; slat += 0.25)
            wood.box(b.x + slat, dy, b.z, 0.16, 0.035, b.d, { tile: 0.8, tint: shade(WHITE, 0.8) });
        for (const side of [-0.5, 0, 0.5])
          wood.box(b.x + side, 0.21, b.z, 0.1, 0.28, b.d, { tile: 0.8, tint: shade(WHITE, 0.7) });
        break;
      case 'tyres':
        for (let i = 0; i < 3; i++)
          plain.cylinder(b.x + (i % 2) * 0.05, 0.125 + i * 0.25, b.z, 0.4, 0.24, { tint: RUBBER, sides: 14 });
        break;
      case 'reel':
        for (const side of [-0.4, 0.4])
          wood.cylinder(b.x + side, 0.65, b.z, 0.65, 0.07, { axis: 'x', tile: 1, sides: 16, tint: shade(WHITE, 0.85) });
        plain.cylinder(b.x, 0.65, b.z, 0.36, 0.74, { axis: 'x', sides: 14, tint: rgb(0x1d2022), caps: false });
        break;
      case 'forklift':
        metal.box(b.x, 0.75, b.z + 0.3, 1.15, 0.9, 1.7, { tile: 1.5, tint: rgb(0xc98a1a) });
        plain.box(b.x, 1.75, b.z + 0.5, 1.05, 0.08, 1.2, { tint: DARK });
        for (const sx of [-0.5, 0.5])
          for (const sz of [-0.05, 1.05]) plain.box(b.x + sx, 1.45, b.z + sz, 0.06, 0.6, 0.06, { tint: DARK });
        for (const sx of [-0.3, 0.3]) {
          plain.box(b.x + sx, 1.05, b.z - 0.62, 0.08, 2.1, 0.1, { tint: DARK });
          plain.box(b.x + sx, 0.12, b.z - 1.05, 0.1, 0.05, 0.9, { tint: STEEL });
        }
        for (const sx of [-0.6, 0.6])
          for (const sz of [-0.3, 0.9])
            plain.cylinder(b.x + sx, 0.28, b.z + sz, 0.28, 0.2, { axis: 'x', tint: RUBBER, sides: 12 });
        break;
      case 'penstock':
        metal.cylinder(b.x, b.y, -28.2, 1.05, 3.9, { axis: 'z', tile: 2.2, tint: rgb(0x5f7a84), sides: 20, caps: false });
        for (const dz of [-1.2, 0.6])
          plain.cylinder(b.x, b.y, -28.2 + dz, 1.13, 0.16, { axis: 'z', tint: rgb(0x3a4a50), sides: 20 });
        concrete.box(b.x, 0.7, -28.2, 2.2, 1.4, 1.2, { tile: 2, tint: shade(WHITE, 0.8) });
        break;
      case 'tower': {
        plain.box(b.x, b.y, b.z, 0.22, b.h, 0.22, { tint: rgb(0x5b6166) });
        for (let y = 1; y < b.h; y += 1.6) plain.box(b.x, y, b.z, 0.5, 0.05, 0.5, { tint: rgb(0x5b6166) });
        plain.box(b.x, b.h + 0.1, b.z, 1.6, 0.12, 0.3, { tint: DARK });
        for (const dx of [-0.55, 0, 0.55]) {
          plain.box(b.x + dx, b.h + 0.35, b.z, 0.42, 0.34, 0.2, { tint: DARK });
          glow.box(b.x + dx, b.h + 0.35, b.z + (b.z > 0 ? -0.11 : 0.11), 0.34, 0.26, 0.02, { tint: [2.2, 2, 1.6] });
        }
        break;
      }
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

  // ---- fittings on the buildings: frames, pipes, lamps, vents ---------------------------------
  const FRAME = rgb(0x3b4246);
  /** A steel frame round an opening in a wall that runs along X (`alongX`) or along Z. */
  const frame = (x, z, width, sill, top, alongX, thick = 0.5) => {
    const side = (offset) => (alongX ? [x + offset, z] : [x, z + offset]);
    for (const offset of [-width / 2, width / 2]) {
      const [fx, fz] = side(offset);
      plain.box(fx, (sill + top) / 2, fz, alongX ? 0.1 : thick + 0.08, top - sill, alongX ? thick + 0.08 : 0.1, { tint: FRAME });
    }
    plain.box(x, top + 0.05, z, alongX ? width + 0.2 : thick + 0.08, 0.1, alongX ? thick + 0.08 : width + 0.2, { tint: FRAME });
    if (sill > 0) {
      plain.box(x, sill - 0.03, z, alongX ? width + 0.2 : thick + 0.16, 0.06, alongX ? thick + 0.16 : width + 0.2, {
        tint: FRAME,
      });
      // A window: a bar across and one upright.
      plain.box(x, (sill + top) / 2, z, alongX ? width : 0.05, 0.05, alongX ? 0.05 : width, { tint: FRAME });
      plain.box(x, (sill + top) / 2, z, 0.05, top - sill, 0.05, { tint: FRAME });
    }
  };
  // Powerhouse: doors and windows.
  frame(-2, -8, 3.6, 0, 3.4, true);
  frame(11, -8, 2.2, 0, 2.4, true);
  frame(-8, -16, 2.2, 0, 2.4, false);
  frame(-8, -21.5, 2.4, 1.1, 2.3, false);
  frame(16, -12, 2.2, 0, 2.4, false);
  frame(16, -20, 2.4, 1.1, 2.3, false);
  // Office block.
  frame(32, 2, 2.2, 0, 2.4, true, 0.4);
  frame(26, 2, 2.2, 1, 2.2, true, 0.4);
  frame(22, -3.5, 2.2, 0, 2.4, false, 0.4);
  frame(22, -14, 2.6, 1, 2.2, false, 0.4);
  frame(28.5, -9, 2.2, 0, 2.4, true, 0.3);
  // The roller door's housing, and striped posts either side of it.
  metal.box(-2, 3.75, -7.6, 4.2, 0.6, 0.5, { tile: 2, tint: rgb(0x566067) });
  for (const dx of [-2.2, 2.2])
    for (let band = 0; band < 5; band++)
      plain.cylinder(-2 + dx, 0.13 + band * 0.26, -7.3, 0.11, 0.26, { tint: band % 2 ? rgb(0x18191b) : YELLOW, sides: 8 });
  // A row of high windows along the powerhouse front, lit from inside.
  for (let x = -6; x <= 14; x += 2.5) {
    glow.box(x, 6.4, -7.74, 1.7, 0.8, 0.02, { tint: [0.5, 0.42, 0.26] });
    plain.box(x, 6.4, -7.72, 1.9, 1, 0.04, { tint: FRAME });
  }
  // Eaves, downpipes at the corners, and vents on the roofs.
  plain.box(4, 8.02, -7.55, 25.4, 0.14, 0.5, { tint: rgb(0x3a4146) });
  for (const [px, pz] of [
    [-8.3, -7.7],
    [16.3, -7.7],
    [21.75, 2.25],
    [36.25, 2.25],
  ])
    plain.cylinder(px, pz < 0 ? 4 : 2, pz, 0.07, pz < 0 ? 8 : 4, { tint: rgb(0x4a5258), sides: 8 });
  for (const [vx, vz] of [
    [-3, -14],
    [5, -20],
    [12, -13],
  ]) {
    metal.box(vx, 8.75, vz, 1.6, 0.7, 1.6, { tile: 1.5, tint: rgb(0x6d777c) });
    plain.cylinder(vx, 9.3, vz, 0.55, 0.4, { tint: rgb(0x3a4146), sides: 12 });
  }
  for (const [ax, az] of [
    [26, -17],
    [32, -3],
  ]) {
    metal.box(ax, 4.6, az, 1.3, 0.8, 0.9, { tile: 1.2, tint: rgb(0x8a9094) });
    plain.cylinder(ax, 4.62, az + 0.46, 0.3, 0.03, { axis: 'z', tint: DARK, sides: 12 });
  }
  // A radio mast and dish on the office roof.
  plain.cylinder(34, 7.3, -17.5, 0.05, 6, { tint: rgb(0x8a9094), sides: 6 });
  plain.cylinder(33.6, 5.4, -17.5, 0.55, 0.12, { axis: 'x', top: 0.1, tint: rgb(0xb9bfc2), sides: 14 });
  for (const y of [6.2, 7.8, 9.4]) plain.box(34, y, -17.5, 0.5, 0.03, 0.03, { tint: rgb(0x8a9094) });
  // Wall lamps over the doors (lit heads only; the light comes from the lamps nearby).
  for (const [lx, ly, lz, ax] of [
    [11, 2.9, -7.6, 0],
    [-8.4, 2.9, -16, 1],
    [16.4, 2.9, -12, 1],
    [32, 2.9, 2.35, 0],
    [21.65, 2.9, -3.5, 1],
  ]) {
    plain.box(lx, ly, lz, ax ? 0.2 : 0.36, 0.14, ax ? 0.36 : 0.2, { tint: DARK });
    glow.box(lx, ly - 0.08, lz, ax ? 0.14 : 0.3, 0.03, ax ? 0.3 : 0.14, { tint: [1.6, 1.3, 0.8] });
  }
  // Cable trays and conduit along the powerhouse's inside walls, and a gantry rail overhead.
  plain.box(4, 4.6, -25.6, 23, 0.1, 0.35, { tint: rgb(0x4a5258) });
  plain.box(-7.6, 4.6, -17, 0.35, 0.1, 17, { tint: rgb(0x4a5258) });
  for (const gz of [-12, -22]) metal.box(4, 7.2, gz, 23.4, 0.4, 0.3, { tile: 2, tint: rgb(0xb58a1e) });
  metal.box(6, 7.05, -17, 0.5, 0.5, 10.4, { tile: 2, tint: rgb(0xb58a1e) });
  plain.box(6, 6.3, -17, 0.06, 1.1, 0.06, { tint: DARK });
  plain.box(6, 5.7, -17, 0.3, 0.25, 0.3, { tint: rgb(0x8a2a20) });

  // ---- wire along the top of the compound wall --------------------------------------------
  for (const [x0, z0, x1, z1] of [
    [BOUNDS.minX - 0.5, BOUNDS.minZ, BOUNDS.minX - 0.5, BOUNDS.maxZ],
    [BOUNDS.maxX + 0.5, BOUNDS.minZ, BOUNDS.maxX + 0.5, BOUNDS.maxZ],
    [BOUNDS.minX, BOUNDS.maxZ + 0.5, BOUNDS.maxX, BOUNDS.maxZ + 0.5],
  ]) {
    const length = Math.hypot(x1 - x0, z1 - z0),
      alongX = x0 !== x1;
    for (let d = 0; d <= length; d += 3.5)
      plain.box(x0 + ((x1 - x0) * d) / length, 4.75, z0 + ((z1 - z0) * d) / length, 0.07, 0.8, 0.07, { tint: FRAME });
    for (const y of [4.6, 4.85, 5.1])
      plain.box((x0 + x1) / 2, y, (z0 + z1) / 2, alongX ? length : 0.025, 0.025, alongX ? 0.025 : length, {
        tint: rgb(0x8a9094),
      });
  }

  // ---- power lines leaving the transformers for a pylon beyond the wall ---------------------
  const pylon = (x, z, height) => {
    for (const [dx, dz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      plain.box(x + dx * 0.9, height / 2, z + dz * 0.9, 0.16, height, 0.16, {
        tint: rgb(0x6d777c),
        roll: -dx * 0.045,
        pitch: dz * 0.045,
      });
    for (let y = 3; y < height; y += 3) plain.box(x, y, z, 1.9 - y * 0.05, 0.08, 1.9 - y * 0.05, { tint: rgb(0x6d777c) });
    for (const y of [height - 1, height - 4]) plain.box(x, y, z, 7, 0.14, 0.2, { tint: rgb(0x6d777c) });
  };
  pylon(46, -22, 20);
  pylon(70, 10, 22);
  for (const dx of [-3, 0, 3]) {
    plain.box(32.7 + dx * 0.3, 10.8, -22.3, 27.5, 0.03, 0.03, { tint: DARK, roll: 0.59 });
    plain.box(58 + dx * 0.2, 19.6, -6, 0.03, 0.03, 40, { tint: DARK, yaw: -0.64, pitch: 0.03 });
  }

  // ---- small things on the ground: drain covers, cones, kerbs ------------------------------
  for (const [x, z] of [
    [1.5, 20],
    [-8, 2],
    [14, 12],
    [22, -6],
    [-20, 21],
  ]) {
    plain.cylinder(x, 0.012, z, 0.42, 0.01, { tint: rgb(0x2a2d2f), sides: 14 });
    plain.cylinder(x, 0.016, z, 0.3, 0.006, { tint: rgb(0x1b1d1f), sides: 10 });
  }
  for (const [x, z] of [
    [-1.2, 23.4],
    [4.4, 21],
    [19.5, 17.5],
    [23.5, 14.2],
    [-11, 12.8],
    [8.4, -5.6],
  ]) {
    plain.box(x, 0.02, z, 0.36, 0.04, 0.36, { tint: rgb(0x1b1d1f) });
    plain.cylinder(x, 0.3, z, 0.14, 0.56, { top: 0.03, sides: 10, tint: rgb(0xd4541c) });
    plain.cylinder(x, 0.34, z, 0.105, 0.1, { top: 0.085, sides: 10, tint: rgb(0xe8e4d8), caps: false });
  }
  // Kerbs along the road from the gate.
  for (const x of [-2.4, 5.4]) concrete.box(x, 0.07, 10, 0.3, 0.14, 26, { tile: 1.5, tint: shade(WHITE, 0.9) });

  // ---- weeds and dry grass where walls meet the ground ----------------------------------------
  {
    const blade = (x, z, height, lean, tint) =>
      plain.limb([x, 0, z], [x + lean[0], height, z + lean[1]], 0.018, 0.002, { sides: 3, tint, caps: false });
    const greens = [rgb(0x5a6a34), rgb(0x7a7a3c), rgb(0x8a8246), rgb(0x4a5a2c)];
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const tuft = (x, z) => {
      for (let i = 0; i < 5; i++)
        blade(
          x + (rand() - 0.5) * 0.3,
          z + (rand() - 0.5) * 0.3,
          0.18 + rand() * 0.34,
          [(rand() - 0.5) * 0.22, (rand() - 0.5) * 0.22],
          greens[Math.floor(rand() * 4)],
        );
    };
    // Along the inside of the compound wall and the foot of the dam...
    for (let i = 0; i < 170; i++) {
      const side = Math.floor(rand() * 4),
        along = rand(),
        off = 0.15 + rand() * 0.9;
      if (side === 0) tuft(BOUNDS.minX + off, BOUNDS.minZ + along * depth);
      else if (side === 1) tuft(BOUNDS.maxX - off, BOUNDS.minZ + along * depth);
      else if (side === 2) tuft(BOUNDS.minX + along * width, BOUNDS.maxZ - off);
      else tuft(BOUNDS.minX + along * width, BOUNDS.minZ + 1.3 + off);
    }
    // ...and round the things that have stood longest: containers, barriers, sandbags.
    for (const b of BOXES) {
      if (!['container', 'barrier', 'sandbag', 'crate', 'tyres'].includes(b.kind) || b.y - b.h / 2 > 0.1) continue;
      for (let i = 0; i < (b.kind === 'container' ? 5 : 2); i++) {
        const onX = rand() < b.w / (b.w + b.d),
          sign = rand() < 0.5 ? -1 : 1;
        tuft(
          b.x + (onX ? (rand() - 0.5) * b.w : sign * (b.w / 2 + 0.08)),
          b.z + (onX ? sign * (b.d / 2 + 0.08) : (rand() - 0.5) * b.d),
        );
      }
    }
  }

  // ---- inside the powerhouse: hazard lines, gauges, a workbench, lockers ---------------------
  for (const gx of [-2.5, 4, 10.5])
    for (const [dx, dz, w, d] of [
      [0, -2, 4.2, 0.1],
      [0, 2, 4.2, 0.1],
      [-2.1, 0, 0.1, 4.1],
      [2.1, 0, 0.1, 4.1],
    ])
      plain.box(gx + dx, 0.012, -16.5 + dz, w, 0.004, d, { tint: shade(YELLOW, 0.75), skipBottom: true });
  for (const gx of [-2.5, 4, 10.5]) {
    // A control box on each generator's plinth, with a row of lamps.
    metal.box(gx + 1.2, 1.0, -14.9, 0.6, 1.0, 0.3, { tile: 1, tint: rgb(0x6f7d74) });
    for (const [i, lamp] of [
      [0.7, 0.1, 0.1],
      [0.1, 0.6, 0.15],
      [0.1, 0.6, 0.15],
    ].entries())
      glow.box(gx + 1.05 + i * 0.15, 1.3, -14.74, 0.05, 0.05, 0.01, { tint: lamp });
    plain.cylinder(gx + 1.2, 1.05, -14.74, 0.09, 0.02, { axis: 'z', tint: rgb(0xd8d4c8), sides: 12 });
  }
  wood.box(13.6, 0.86, -9.3, 2.6, 0.08, 0.8, { tile: 1.2, tint: shade(WHITE, 0.75) });
  for (const lx of [-1.2, 1.2])
    for (const lz of [-0.3, 0.3]) plain.box(13.6 + lx, 0.41, -9.3 + lz, 0.07, 0.82, 0.07, { tint: DARK });
  metal.box(13.2, 1.02, -9.3, 0.5, 0.24, 0.3, { tile: 0.6, tint: rgb(0x8a2a20) });
  plain.cylinder(14.3, 0.98, -9.25, 0.07, 0.16, { tint: rgb(0x2f5d7c), sides: 8 });
  for (let i = 0; i < 5; i++) {
    metal.box(-7.35, 1, -9.6 - i * 0.62, 0.5, 2, 0.58, { tile: 1.2, tint: rgb(0x55686f) });
    plain.box(-7.09, 1.5, -9.6 - i * 0.62, 0.02, 0.3, 0.3, { tint: rgb(0x2a3338) });
    plain.box(-7.09, 1.0, -9.42 - i * 0.62, 0.03, 0.08, 0.02, { tint: STEEL });
  }
  // Pipes along the back wall with valve wheels.
  for (const [py, radius, tintHex] of [
    [3.2, 0.16, 0x8a6a2c],
    [3.7, 0.1, 0x2f5d7c],
  ])
    metal.cylinder(4, py, -25.45, radius, 22, { axis: 'x', tile: 1.5, tint: rgb(tintHex), sides: 10 });
  for (const vx of [-4, 1, 8, 13]) {
    plain.cylinder(vx, 3.2, -25.2, 0.2, 0.03, { axis: 'z', tint: rgb(0x8a2a20), sides: 12 });
    plain.cylinder(vx, 3.2, -25.3, 0.03, 0.2, { axis: 'z', tint: DARK, sides: 6 });
  }

  // ---- inside the office: screens, shelves, a map board, bunks ------------------------------
  for (const [x, z, alongX] of [
    [31, -12.6, true],
    [25.1, -17, false],
    [26, -5.6, true],
    [33.6, -4, false],
  ]) {
    plain.box(x, 0.98, z, alongX ? 0.5 : 0.04, 0.32, alongX ? 0.04 : 0.5, { tint: rgb(0x16181a) });
    plain.box(x, 0.8, z, 0.1, 0.06, 0.1, { tint: rgb(0x16181a) });
    plain.box(x + (alongX ? 0.45 : 0.25), 0.8, z + (alongX ? 0.25 : 0.45), 0.3, 0.02, 0.22, { tint: rgb(0xd8d4c8), yaw: 0.3 });
    plain.cylinder(x - (alongX ? 0.5 : 0.2), 0.83, z - (alongX ? 0.2 : 0.5), 0.04, 0.1, { tint: rgb(0xb3302c), sides: 8 });
  }
  for (const [x, z] of [
    [35.55, -11.5],
    [35.55, -13.5],
  ]) {
    for (const y of [0.3, 0.8, 1.3, 1.8]) wood.box(x, y, z, 0.4, 0.04, 1.6, { tile: 1, tint: shade(WHITE, 0.7) });
    for (const dz of [-0.8, 0.8]) plain.box(x, 0.95, z + dz, 0.4, 1.9, 0.04, { tint: rgb(0x3a3d40) });
    for (let i = 0; i < 9; i++)
      plain.box(x - 0.02, 0.95 + (i % 3) * 0.5, z - 0.6 + i * 0.14, 0.26, 0.3, 0.07, {
        tint: [rgb(0x4a5a7a), rgb(0x7a4a3a), rgb(0x6a6a5a)][i % 3],
      });
  }
  // Two bunks along the south room's east wall.
  for (const z of [-7.2, -0.2]) {
    for (const y of [0.4, 1.4]) {
      plain.box(35.1, y, z, 0.9, 0.08, 1.9, { tint: rgb(0x3a3d40) });
      plain.box(35.1, y + 0.1, z, 0.84, 0.12, 1.84, { tint: rgb(0x5a6a4a) });
      plain.box(35.1, y + 0.2, z - 0.72, 0.6, 0.1, 0.34, { tint: rgb(0xc8c4b8) });
    }
    for (const dz of [-0.92, 0.92])
      for (const dx of [-0.42, 0.42]) plain.box(35.1 + dx, 0.95, z + dz, 0.05, 1.9, 0.05, { tint: rgb(0x3a3d40) });
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
  const meshes = {};
  const add = (builder, material, { shadows = true, tangents = true } = {}) => {
    if (builder.empty) return undefined;
    const mesh = new Mesh3D(builder.finish({ tangents }), material);
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    scene.addChild(mesh);
    // Remember the mesh of each surface, so marks can be laid onto whatever a shot hits.
    for (const name of Object.keys(groups)) if (groups[name] === builder) meshes[name] = mesh;
    if (builder === apron) meshes.apron = mesh;
    return mesh;
  };
  /** The wet ground: meshes that show the mirror image, and their materials. */
  const wet = { meshes: [], materials: [] };
  const mirror = (mesh, strength) => {
    wet.meshes.push(mesh);
    wet.materials.push({ material: mesh.material, strength });
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
  add(concrete, weather(lit(surfaces.concrete, { roughness: 0.95 }), { streaks: 0.75, foot: 0.7, stains: 0.6, tone: 0.35 }));
  // Rain-wet ground: smooth enough to mirror, with drops ringing across it.
  mirror(
    add(
      asphalt,
      weather(lit(surfaces.asphalt, { roughness: 0.3 }), { streaks: 0, foot: 0, stains: 0.75, tone: 0.3, rain: true }),
      { shadows: false },
    ),
    0.36,
  );
  mirror(
    add(
      apron,
      weather(lit(surfaces.concrete, { roughness: 0.42 }), { streaks: 0, foot: 0, stains: 0.6, tone: 0.3, rain: true }),
      { shadows: false },
    ),
    0.34,
  );
  add(
    container,
    weather(lit(surfaces.container, { roughness: 0.6, metallic: 0.35 }), {
      streaks: 0.45,
      foot: 0.65,
      stains: 0.3,
      tone: 0.25,
      wear: 0.62,
    }),
  );
  add(wall, weather(lit(surfaces.wall, { roughness: 0.93 }), { streaks: 0.7, foot: 0.75, stains: 0.4, tone: 0.3 }));
  add(wood, weather(lit(surfaces.wood, { roughness: 0.85 }), { streaks: 0.2, foot: 0.5, stains: 0.3, tone: 0.25 }));
  add(sandbag, weather(lit(surfaces.sandbag, { roughness: 1 }), { streaks: 0.2, foot: 0.6, stains: 0.2, tone: 0.3 }));
  add(
    metal,
    weather(lit(surfaces.metal, { roughness: 0.5, metallic: 0.6 }), {
      streaks: 0.55,
      foot: 0.5,
      stains: 0.3,
      tone: 0.2,
      wear: 0.5,
    }),
  );
  add(
    plain,
    weather(createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.8 }), {
      streaks: 0.25,
      foot: 0.4,
      stains: 0.2,
      tone: 0.2,
    }),
    {
      tangents: false,
    },
  );
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
  mirror(
    add(
      puddles,
      createStandardMaterial3D({
        color: 0x0b0e11,
        roughness: 0.03,
        opacity: 0.78,
        alphaMode: 'blend',
        depthWrite: false,
        environmentIntensity: 2.2,
      }),
      {
        shadows: false,
        tangents: false,
      },
    ),
    0.95,
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
  // ---- sign plates and container markings ----------------------------------------------------
  /** A painted plate: `style` is 'plate' (white on green), 'warn' (black on yellow) or 'mark' (white lettering only). */
  const plate = (lines, style, width, height) =>
    canvasTexture(256, Math.round((256 * height) / width), (c, w, h) => {
      c.clearRect(0, 0, w, h);
      if (style !== 'mark') {
        c.fillStyle = style === 'warn' ? '#d9a520' : '#22463a';
        c.fillRect(0, 0, w, h);
        c.strokeStyle = style === 'warn' ? '#141414' : '#e6e2d4';
        c.lineWidth = 6;
        c.strokeRect(7, 7, w - 14, h - 14);
      }
      c.fillStyle = style === 'warn' ? '#141414' : 'rgba(238, 234, 220, 0.92)';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      lines.forEach((line, i) => {
        const size = Math.min((h / lines.length) * (i === 0 ? 0.62 : 0.4), (w * 1.7) / Math.max(4, line.length));
        c.font = `bold ${Math.round(size)}px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", Arial, sans-serif`;
        c.fillText(line, w / 2, (h * (i + 0.5)) / lines.length + (i === 0 ? 4 : -2));
      });
      // Weathering: scratches through the paint.
      c.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 120; i++)
        c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 5, 1 + Math.random() * 2);
    });
  /** Put copies of one painted plate on walls: each place is [x, y, z, yaw]. */
  const signs = (lines, style, width, height, places) => {
    const texture = plate(lines, style, width, height);
    if (!texture) return;
    const builder = createBuilder();
    for (const [x, y, z, yaw] of places) builder.box(x, y, z, width, height, 0.02, { fit: true, yaw });
    const mesh = new Mesh3D(
      builder.finish(),
      createStandardMaterial3D({
        color: 0xffffff,
        map: texture,
        alphaMode: style === 'mark' ? 'blend' : 'opaque',
        depthWrite: style !== 'mark',
        roughness: 0.7,
      }),
    );
    mesh.receiveShadow = true;
    scene.addChild(mesh);
  };
  const EAST = Math.PI / 2,
    WEST = -Math.PI / 2,
    NORTH = Math.PI;
  signs(['发电厂房', 'POWERHOUSE'], 'plate', 2.4, 1, [
    [11, 3.6, -7.72, 0],
    [-8.28, 3.6, -16, WEST],
  ]);
  signs(['管理楼', 'ADMIN BLOCK'], 'plate', 2, 0.85, [
    [32, 3.3, 2.22, 0],
    [21.78, 3.3, -3.5, WEST],
  ]);
  signs(['高压危险', 'DANGER  HIGH VOLTAGE'], 'warn', 1.3, 0.75, [
    [16.28, 1.9, -23.6, EAST],
    [16.28, 1.9, -16.2, EAST],
    [15.72, 1.9, -15.6, WEST],
    [-7.72, 1.9, -12, EAST],
  ]);
  signs(['管制区域  禁止入内', 'RESTRICTED AREA'], 'warn', 2.2, 0.8, [
    [5.5, 2.2, 25.98, NORTH],
    [-37.96, 2.4, 26, EAST],
    [37.96, 2.4, 12, WEST],
  ]);
  signs(['撤离点', 'EXTRACTION'], 'plate', 1.8, 0.8, [[37.96, 2.6, 21, WEST]]);
  signs(['货场', 'CARGO YARD'], 'plate', 2, 0.85, [[-37.96, 4, 13, EAST]]);
  signs(['值班表  DUTY ROSTER', '一班 06:00   二班 14:00   三班 22:00'], 'plate', 1.6, 0.9, [[28.5, 1.9, -8.82, 0]]);
  signs(['当心触电', 'DANGER  ELECTRIC SHOCK'], 'warn', 0.9, 0.6, [
    [-1.3, 1.5, -14.72, 0],
    [5.2, 1.5, -14.72, 0],
    [11.7, 1.5, -14.72, 0],
  ]);
  // Owner codes on the long sides of the containers.
  const codes = ['QLHU 204817 3', 'TKRU 771305 0', 'MSDU 418296 5'].map(() => []);
  let which = 0;
  for (const b of BOXES) {
    if (b.kind !== 'container') continue;
    const list = codes[which++ % codes.length],
      y = b.y + 0.75;
    if (b.along === 'x')
      list.push([b.x + b.w / 2 - 1.3, y, b.z + b.d / 2 + 0.015, 0], [b.x - b.w / 2 + 1.3, y, b.z - b.d / 2 - 0.015, NORTH]);
    else list.push([b.x + b.w / 2 + 0.015, y, b.z - b.d / 2 + 1.3, EAST], [b.x - b.w / 2 - 0.015, y, b.z + b.d / 2 - 1.3, WEST]);
  }
  ['QLHU 204817 3', 'TKRU 771305 0', 'MSDU 418296 5'].forEach((code, i) =>
    signs([code, '22G1   MAX 30480 KG'], 'mark', 1.9, 0.55, codes[i]),
  );

  stencil('A', -37.96, 2.6, 13, Math.PI / 2);
  stencil('B', 4.6, 4.2, -7.72, 0, 2.6);
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
  return { wet, meshes };
}
