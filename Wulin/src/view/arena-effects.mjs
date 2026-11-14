import { InstancedMesh3D, Mesh3D, createGeometry3D, createUnlitMaterial3D } from '@egret/engine/world3d';
import { rgb } from './shapes.mjs';

const pigments = {
  fist: { color: 0xeeb068, form: 'wave' }, palm: { color: 0xffbf77, form: 'wave' },
  leg: { color: 0xf7c99b, form: 'slash' }, point: { color: 0x8ad9bf, form: 'needle' },
  sword: { color: 0x66d9ff, form: 'slash' }, saber: { color: 0xee9376, form: 'slash' },
  spear: { color: 0xffbf63, form: 'needle' }, staff: { color: 0xf6d394, form: 'wave' },
  dart: { color: 0xbf75ff, form: 'needle' }, heal: { color: 0x74eba2, form: 'wave' },
};

// Ink gathers on the inside of the cut and breaks into fine, translucent edges.
function stroke(start, end, radius, { taper = true, upright = false } = {}) {
  const positions = [], indices = [], colors = [];
  const count = 24;
  const bands = [-1, -.58, -.24, .15, .73, 1];
  const alpha = [0, .74, 1, .66, .22, 0];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const angle = start + (end - start) * t;
    const envelope = taper ? Math.sin(Math.PI * t) ** .64 : 1;
    const width = (taper ? .025 + .36 * envelope : .065) * (1 + .07 * Math.sin(i * 2.31));
    for (let j = 0; j < bands.length; j++) {
      const r = radius + bands[j] * width;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      positions.push(x, upright ? y : 0, upright ? 0 : y);
      const light = j === 2 ? 1.22 : .8;
      colors.push(light, light, light, alpha[j] * Math.min(1, envelope * 1.65));
    }
    if (i < count) for (let j = 0; j < bands.length - 1; j++) {
      const a = i * bands.length + j;
      const b = a + bands.length;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  return createGeometry3D({ positions, colors, indices });
}

function needle() {
  const positions = [], colors = [], indices = [];
  // Two intersecting brush ribbons read from overhead as well as from the side.
  const spine = [[-.55, 0, 0], [-.32, .055, .55], [.24, .083, .96], [.39, .094, 1], [.55, 0, 0]];
  for (const upright of [false, true]) {
    const base = positions.length / 3;
    for (const [x, radius, strength] of spine) for (const band of [-1, 0, 1]) {
      positions.push(x, upright ? radius * band : 0, upright ? 0 : radius * band);
      colors.push(1.12, 1.12, 1.12, band === 0 ? strength : 0);
    }
    for (let i = 0; i < spine.length - 1; i++) for (let j = 0; j < 2; j++) {
      const a = base + i * 3 + j;
      indices.push(a, a + 1, a + 3, a + 1, a + 4, a + 3);
    }
  }
  return createGeometry3D({ positions, colors, indices });
}

function shadowDisc() {
  const positions = [0, 0, 0], colors = [1, 1, 1, 1], indices = [];
  const steps = 18;
  for (const [radius, opacity] of [[.43, .82], [.73, .36], [1, 0]]) for (let i = 0; i < steps; i++) {
    const angle = (i * Math.PI * 2) / steps;
    positions.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    colors.push(1, 1, 1, opacity);
  }
  for (let i = 0; i < steps; i++) {
    const j = (i + 1) % steps;
    indices.push(0, 1 + i, 1 + j);
    for (let ring = 0; ring < 2; ring++) {
      const a = 1 + ring * steps;
      indices.push(a + i, a + j, a + steps + i, a + j, a + steps + j, a + steps + i);
    }
  }
  return createGeometry3D({ positions, colors, indices });
}

let geometries;
function effectGeometry() {
  return (geometries ??= {
    slash: stroke(-1.35, 1.64, 1.04, { upright: true }),
    wave: stroke(-2.72, 2.83, 1),
    halo: stroke(0, Math.PI * 2, 1, { taper: false }),
    needle: needle(),
    shadow: shadowDisc(),
  });
}

function pigment(hex, opacity, brightness = 1.45) {
  return createUnlitMaterial3D({ color: rgb(hex).map(v => v * brightness), vertexColors: true, opacity, alphaMode: 'blend', depthWrite: false, side: 'double' });
}

export function createFocusHalo() {
  const halo = new Mesh3D(effectGeometry().halo, pigment(0xf4c27e, .88, 1.85));
  halo.castShadow = false;
  halo.visible = false;
  return halo;
}

/** A single, soft contact pass on devices where directional shadows are off. */
export function createContactShadows(scene, capacity) {
  if (!capacity) return null;
  const mesh = new InstancedMesh3D(effectGeometry().shadow, pigment(0x18201b, .46, 1), capacity);
  const rotation = [0, 0, 0, 1];
  const cached = new Float64Array(capacity * 3).fill(NaN);
  mesh.castShadow = false;
  mesh.visible = false;
  scene.addChild(mesh);
  return {
    update(cast) {
      let count = 0;
      for (const { unit, x, z } of cast) {
        if (unit.fled) continue;
        const index = count++ * 3;
        const width = unit.down ? .97 : .62;
        if (cached[index] === x && cached[index + 1] === z && cached[index + 2] === width) continue;
        cached[index] = x;
        cached[index + 1] = z;
        cached[index + 2] = width;
        mesh.setTransformAt(index / 3, [x, .024, z], rotation, [width, 1, .66]);
      }
      // Count changes affect instance bounds even if the remaining positions did not move.
      if (mesh.count !== count) mesh.instanceVersion++;
      mesh.count = count;
      mesh.visible = count > 0;
    },
  };
}

/** An impact can only occupy a slot in this pool. At speed 4, newer hits replace old traces. */
export function createArenaEffects(scene, quality) {
  const geometry = effectGeometry();
  const slots = Array.from({ length: quality === 'low' ? 5 : 9 }, () => {
    const material = pigment(0xffffff, .85);
    const mesh = new Mesh3D(geometry.slash, material);
    mesh.castShadow = false;
    mesh.visible = false;
    scene.addChild(mesh);
    return { material, mesh, time: 0, duration: 0, size: 1, form: 'slash' };
  });
  let cursor = 0;
  let spawned = 0;
  const forms = new Set();

  function emit(klass, from, to, critical = false) {
    const { color, form } = pigments[klass] ?? pigments.fist;
    const slot = slots[cursor++ % slots.length];
    const { mesh, material } = slot;
    slot.form = form;
    slot.time = 0;
    slot.duration = critical ? .49 : .32;
    slot.size = critical ? 1.48 : 1;
    mesh.geometry = geometry[form];
    material.setColor(rgb(color).map(v => v * (critical ? 2.0 : 1.5)));
    material.opacity = .9;
    const dx = from ? to.x - from.x : 1;
    const dz = from ? to.z - from.z : 0;
    const distance = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dz, dx);
    if (form === 'needle') {
      slot.size = Math.max(1, Math.min(distance, 7));
      mesh.setPosition(to.x - Math.cos(yaw) * slot.size * .42, 1.26, to.z + Math.sin(yaw) * slot.size * .42).setRotation(0, yaw, .05);
    } else if (form === 'wave') {
      mesh.setPosition(to.x, klass === 'heal' ? .28 : .43, to.z).setRotation(klass === 'staff' ? .08 : .18, yaw, .10);
    } else {
      const angle = klass === 'saber' ? -.28 : klass === 'leg' ? -.6 : -1.1;
      mesh.setPosition(to.x, 1.28, to.z).setRotation(.22, yaw, angle);
    }
    mesh.visible = true;
    mesh.setScale(slot.size);
    spawned++;
    forms.add(form);
  }

  return {
    emit,
    update(dt) {
      for (const slot of slots) {
        const { mesh, material, duration, size, form } = slot;
        if (!mesh.visible) continue;
        const progress = (slot.time += dt) / duration;
        if (progress >= 1) { mesh.visible = false; continue; }
        material.opacity = .94 * (1 - progress) ** .85;
        if (form === 'wave') mesh.setScale(size * (.52 + 1.58 * progress), 1, size * (.52 + 1.58 * progress));
        else if (form === 'needle') mesh.setScale(size, 1.45 - progress, 1.45 - progress);
        else mesh.setScale(size * (.85 + .45 * progress));
      }
    },
    clear() {
      for (const { mesh } of slots) mesh.visible = false;
    },
    get spawned() { return spawned; },
    get forms() { return [...forms]; },
    get capacity() { return slots.length; },
  };
}
