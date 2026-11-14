import { Mesh3D, createGeometry3D, createUnlitMaterial3D } from '@egret/engine/world3d';
import { BOX, build, rgb } from './shapes.mjs';

const pigments = {
  fist: { color: 0xeeb068, form: 'wave' }, palm: { color: 0xffbf77, form: 'wave' },
  leg: { color: 0xf7c99b, form: 'slash' }, point: { color: 0x8ad9bf, form: 'needle' },
  sword: { color: 0x95def4, form: 'slash' }, saber: { color: 0xee9376, form: 'slash' },
  spear: { color: 0xe5d38e, form: 'needle' }, staff: { color: 0xf6d394, form: 'wave' },
  dart: { color: 0xcba6f7, form: 'needle' }, heal: { color: 0x9bdfad, form: 'wave' },
};

function stroke(start, end, radius, taper = true, upright = false) {
  const positions = [], indices = [], normals = [];
  const count = 32;
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const angle = start + (end - start) * t;
    const width = taper ? .21 * Math.pow(Math.sin(Math.PI * t), .7) + .013 : .035;
    for (const side of [-1, 1]) {
      const r = radius + side * width;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      positions.push(x, upright ? y : 0, upright ? 0 : y);
      normals.push(0, upright ? 0 : 1, upright ? 1 : 0);
    }
    const a = i * 2;
    if (i < count) indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  return createGeometry3D({ positions, normals, indices });
}

let geometries;
function effectGeometry() {
  return (geometries ??= {
    slash: stroke(-1.28, 1.48, 1.1, true, true),
    wave: stroke(-2.75, 2.85, 1),
    halo: stroke(0, Math.PI * 2, 1, false),
    needle: build([[BOX, [0, 0, 0], [1, .065, .10], 0xffffff]]),
  });
}

function pigment(hex, opacity, brightness = 1.45) {
  return createUnlitMaterial3D({ color: rgb(hex).map(v => v * brightness), opacity, alphaMode: 'blend', depthWrite: false, side: 'double' });
}

export function createFocusHalo() {
  const halo = new Mesh3D(effectGeometry().halo, pigment(0xf4c27e, .88, 1.85));
  halo.visible = false;
  return halo;
}

/** An impact can only occupy a slot in this pool. At speed 4, newer hits replace old traces. */
export function createArenaEffects(scene, quality) {
  const geometry = effectGeometry();
  const slots = Array.from({ length: quality === 'low' ? 5 : 9 }, () => {
    const material = pigment(0xffffff, .85);
    const mesh = new Mesh3D(geometry.slash, material);
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
    } else if (form === 'wave') mesh.setPosition(to.x, klass === 'heal' ? .28 : .27, to.z).setRotation(.18, yaw, .10);
    else mesh.setPosition(to.x, 1.28, to.z).setRotation(.22, yaw, -1.1);
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
        material.opacity = .86 * (1 - progress) ** .9;
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
