import { Mesh3D, Object3D, createBoxGeometry3D, createCylinderGeometry3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { ARMS, createWeapon } from './weapons.mjs';

const colours = { yulin: 0x334652, tiger: 0x934e2c, vanguard: 0x7d3431, plume: 0x514e78, archer: 0x566049 };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Infantry shares the regiment weapons and timing, with rigid articulated armour instead of skinning. */
export function createFootSoldier(regiment, world) {
  const holder = new Object3D(), body = new Object3D();
  holder.name = 'foot-soldier-' + regiment;
  holder.addChild(body);
  world.addChild(holder);
  const coat = createStandardMaterial3D({ color: colours[regiment], roughness: 0.84 });
  const iron = createStandardMaterial3D({ color: 0x454446, roughness: 0.61, metalness: 0.33 });
  const trim = createStandardMaterial3D({ color: 0x9d744d, roughness: 0.67, metalness: 0.23 });
  const skin = createStandardMaterial3D({ color: 0xb88360, roughness: 0.92 });
  const boot = createStandardMaterial3D({ color: 0x292221, roughness: 0.87 });
  const grid = [];
  function part(parent, material, geometry, x, y, z, shadow = false) {
    const node = new Mesh3D(geometry, material);
    node.setPosition(x, y, z);
    node.castShadow = shadow;
    node.receiveShadow = true;
    parent.addChild(node);
    grid.push(geometry);
    return node;
  }
  function box(parent, material, x, y, z, width, height, depth, shadow) {
    return part(parent, material, createBoxGeometry3D({ width, height, depth }), x, y, z, shadow);
  }
  function frustum(parent, material, x, y, z, radiusTop, radiusBottom, height, shadow = false) {
    return part(parent, material, createCylinderGeometry3D({ radiusTop, radiusBottom, height, radialSegments: 8 }), x, y, z, shadow);
  }
  box(body, coat, 0, 1.10, 0, 0.51, 0.55, 0.29, true);
  box(body, iron, 0, 1.22, 0.15, 0.46, 0.27, 0.045);
  box(body, trim, 0, 0.97, 0.045, 0.53, 0.065, 0.32);
  box(body, iron, 0, 0.79, 0.09, 0.45, 0.27, 0.24);
  frustum(body, skin, 0, 1.52, 0.012, 0.108, 0.098, 0.22);
  frustum(body, iron, 0, 1.66, 0, 0.078, 0.152, 0.15, true);
  frustum(body, trim, 0, 1.585, 0, 0.153, 0.16, 0.045);
  box(body, coat, 0, 1.76, -0.025, 0.08, 0.15, 0.09);
  const arms = [-1, 1].map(sign => {
    const pivot = new Object3D();
    pivot.setPosition(sign * 0.30, 1.30, 0.018);
    body.addChild(pivot);
    box(pivot, trim, 0, -0.02, 0.02, 0.17, 0.15, 0.21);
    box(pivot, coat, 0, -0.20, 0.019, 0.115, 0.32, 0.124);
    box(pivot, iron, 0, -0.39, 0.025, 0.12, 0.17, 0.15);
    box(pivot, skin, 0, -0.50, 0.04, 0.10, 0.11, 0.11);
    return pivot;
  });
  const legs = [-1, 1].map(sign => {
    const pivot = new Object3D();
    pivot.setPosition(sign * 0.135, 0.73, 0);
    body.addChild(pivot);
    box(pivot, coat, 0, -0.28, 0, 0.17, 0.52, 0.18);
    box(pivot, boot, 0, -0.60, 0.043, 0.165, 0.25, 0.24);
    return pivot;
  });
  const kit = ARMS[regiment];
  const blade = createWeapon(kit.main);
  blade.node.setPosition(0, -0.49, 0.075);
  arms[1].addChild(blade.node);
  const offhand = kit.bow || kit.off ? createWeapon(kit.bow ?? kit.off) : null;
  if (offhand) {
    offhand.node.setPosition(0, -0.38, 0.12);
    offhand.node.setRotation(kit.bow ? 0 : Math.PI / 2, 0, 0);
    arms[0].addChild(offhand.node);
  }
  let stride = 0, fall = 0, flinch = 0;
  return {
    holder,
    update(man, _game, dt) {
      stride += dt * Math.min(11, man.moving * 3);
      const motion = Math.sin(stride) * Math.min(0.49, man.moving * 0.16);
      legs[0].setRotation(motion, 0, 0);
      legs[1].setRotation(-motion, 0, 0);
      const act = man.act;
      const swing = act?.kind === 'swing';
      const p = swing ? clamp(act.t / act.wind, 0, 1) : 0;
      const r = swing && act.struck ? clamp((act.t - act.strikeAt) / act.recover, 0, 1) : 0;
      const slash = Math.sin(Math.PI * p) * 1.35;
      const guard = man.guard ? 1 : 0;
      const direction = act?.line === 'L' ? -1 : 1;
      const drawn = Boolean(man.draw);
      const bow = kit.bow && !man.knife;
      blade.node.visible = !bow;
      if (offhand) offhand.node.visible = !kit.bow || bow;
      arms[0].setRotation(bow ? (drawn ? -1.44 : -0.64) : -guard * 1.19 - motion * 0.45, 0, bow ? -0.33 : -0.11);
      arms[1].setRotation(drawn ? -1.38 : swing ? -0.30 - (1 - r) * (p * 1.35 + slash)
        : -0.41 - motion * 0.47 - guard * 0.51, drawn ? -0.52 : 0, swing ? direction * 0.62 * (1 - r) : 0.13);
      blade.node.setRotation(swing && act.line === 'T' ? Math.PI / 2 : 0.36, 0, swing ? -direction * 0.21 : 0);
      if (kit.bow) offhand.flex?.(drawn ? clamp(man.draw.t / man.r.bow.draw, 0, 1) : 0);
      fall = Math.min(1, fall + (!man.alive ? dt * 3.4 : 0));
      flinch *= Math.exp(-dt * 10);
      holder.setPosition(man.x, (man.floor ?? 0) + (act?.air ?? 0) + Math.abs(motion) * 0.06 + fall * 0.12, man.z);
      holder.setRotation(fall * -1.52 + flinch * 0.18, man.face, 0);
    },
    blade() {
      if (!blade.node.visible) return null;
      return [0.35, 1].map(part => Array.from(blade.node.localToWorld([0, 0, 0], [0, blade.length * part, 0])));
    },
    struck(heavy) { flinch = 1 + clamp(heavy, 0, 1); },
    dispose() {
      holder.removeFromParent();
      for (const geometry of grid) geometry.dispose?.();
      for (const material of [coat, iron, trim, skin, boot]) material.dispose?.();
    }
  };
}
