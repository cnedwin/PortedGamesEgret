// The enemy soldiers: jointed figures put together from boxes, one set of
// shapes per kind, moved by a few lines of procedural animation (a walk
// cycle, an aiming lean, a flinch when hit, and a fall).
import { Mesh3D, Object3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { createBuilder, orient, rgb } from './build.mjs';

const SKIN = rgb(0xc9a27e),
  BLACK = rgb(0x17181a),
  GUN = rgb(0x26282c);

/** How each kind is dressed: uniform, vest, headgear, trim, and build. */
const LOOKS = {
  rifle: {
    cloth: rgb(0x5d6444),
    vest: rgb(0x8b7b57),
    helmet: rgb(0x555c3f),
    trim: rgb(0x3b3f2c),
    bulk: 1,
    mask: false,
    visor: false,
  },
  rush: {
    cloth: rgb(0x2c2f35),
    vest: rgb(0x40444b),
    helmet: rgb(0x1c1d20),
    trim: rgb(0xb3302c),
    bulk: 0.96,
    mask: true,
    visor: false,
  },
  heavy: {
    cloth: rgb(0x343a31),
    vest: rgb(0x4d5348),
    helmet: rgb(0x2a2e28),
    trim: rgb(0xc08a2a),
    bulk: 1.18,
    mask: true,
    visor: true,
  },
};

const HIP = 0.9,
  THIGH = 0.44,
  SHIN = 0.46;

function shapes(look) {
  const k = look.bulk,
    skin = look.mask ? BLACK : SKIN;
  // Hips, chest, vest, pack, both arms and the weapon, modelled around the hip joint, facing -Z.
  const upper = createBuilder();
  upper.box(0, 0.05, 0, 0.34 * k, 0.18, 0.2 * k, { tint: look.cloth });
  upper.limb([0, 0.1, 0], [0, 0.52, 0], 0.16 * k, 0.19 * k, { tint: look.cloth, sides: 10 });
  // The vest: front and back plates, a belt of pouches, a pack.
  upper.box(0, 0.36, -0.1 * k, 0.33 * k, 0.34, 0.1, { tint: look.vest });
  upper.box(0, 0.36, 0.1 * k, 0.33 * k, 0.36, 0.1, { tint: look.vest });
  for (const side of [-0.11, 0, 0.11]) upper.box(side * k, 0.2, -0.17 * k, 0.085, 0.13, 0.06, { tint: look.trim });
  upper.box(0, 0.4, 0.2 * k, 0.27 * k, 0.32, 0.11, { tint: look.trim });
  upper.box(0.1 * k, 0.47, -0.16 * k, 0.09, 0.06, 0.03, { tint: BLACK });
  upper.limb([0, 0.52, 0], [0, 0.63, 0], 0.055, 0.05, { tint: skin });
  // Shoulders, then the right arm back to the grip and the left arm out to the handguard.
  const arm = (shoulder, elbow, hand) => {
    upper.ball(shoulder[0], shoulder[1], shoulder[2], 0.085 * k, 0.085 * k, 0.085 * k, { tint: look.cloth, sides: 8, rings: 5 });
    upper.limb(shoulder, elbow, 0.062 * k, 0.052 * k, { tint: look.cloth });
    upper.limb(elbow, hand, 0.05 * k, 0.04 * k, { tint: look.cloth });
    upper.ball(hand[0], hand[1], hand[2], 0.045, 0.045, 0.05, { tint: BLACK, sides: 6, rings: 4 });
  };
  arm([0.23 * k, 0.5, 0], [0.27 * k, 0.29, -0.13], [0.08, 0.3, -0.33]);
  arm([-0.23 * k, 0.5, 0], [-0.25 * k, 0.28, -0.22], [0.0, 0.32, -0.53]);
  if (!look.visor)
    upper.limb([-0.27 * k, 0.44, 0], [-0.275 * k, 0.37, -0.03], 0.068 * k, 0.066 * k, { tint: look.trim, caps: false });
  // The weapon across the chest: receiver, handguard, barrel, sight, magazine, stock.
  const big = look.visor ? 1.25 : 1;
  upper.box(0.05, 0.36, -0.36, 0.05 * big, 0.08 * big, 0.34, { tint: GUN });
  upper.box(0.05, 0.36, -0.62, 0.042 * big, 0.055 * big, 0.26, { tint: look.visor ? GUN : rgb(0x4a4233) });
  upper.limb([0.05, 0.365, -0.74], [0.05, 0.365, -0.95], 0.013 * big, 0.013 * big, { tint: GUN, sides: 6 });
  upper.box(0.05, 0.415, -0.4, 0.02, 0.03, 0.08, { tint: GUN });
  upper.box(0.05, 0.27, -0.4, 0.035, 0.14, look.visor ? 0.14 : 0.06, { tint: GUN, pitch: 0.2 });
  upper.box(0.06, 0.35, -0.12, 0.045, 0.09, 0.2, { tint: GUN });
  if (look.visor) upper.box(0.05, 0.25, -0.66, 0.02, 0.2, 0.02, { tint: GUN });

  const head = createBuilder();
  head.ball(0, 0.11, 0, 0.092, 0.115, 0.102, { tint: skin });
  // Helmet or cap, sitting low over the brow.
  head.ball(0, 0.155, 0.006, 0.112, 0.092, 0.122, { tint: look.helmet, rings: 6 });
  if (look.visor) head.box(0, 0.115, -0.092, 0.17, 0.11, 0.035, { tint: rgb(0x0e1418) });
  else if (look.mask) {
    head.box(0, 0.125, -0.092, 0.15, 0.04, 0.02, { tint: SKIN });
    head.box(0, 0.165, -0.105, 0.17, 0.045, 0.03, { tint: rgb(0x23262a) });
  } else {
    head.box(0, 0.168, -0.11, 0.17, 0.02, 0.07, { tint: look.helmet });
    head.box(0, 0.19, 0.0, 0.24, 0.025, 0.04, { tint: look.trim });
  }
  for (const side of [-1, 1]) head.box(side * 0.1, 0.11, 0.01, 0.03, 0.07, 0.06, { tint: look.helmet });

  const thigh = createBuilder().limb([0, 0.02, 0], [0, -THIGH, 0], 0.088 * k, 0.07 * k, { tint: look.cloth });
  thigh.box(0.06 * k, -0.2, 0, 0.05, 0.14, 0.11, { tint: look.trim });
  const shin = createBuilder().ball(0, -0.01, -0.02, 0.072 * k, 0.075, 0.075 * k, { tint: look.trim, sides: 8, rings: 5 });
  shin.limb([0, 0, 0], [0, -SHIN + 0.1, 0.01], 0.066 * k, 0.052 * k, { tint: look.cloth });
  shin.box(0, -SHIN + 0.06, -0.035, 0.12 * k, 0.12, 0.27, { tint: BLACK });
  return { upper: upper.finish(), head: head.finish(), thigh: thigh.finish(), shin: shin.finish() };
}

/** Builds soldiers of every kind; they share shapes and one material. */
export function createSoldierFactory() {
  const material = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.82 });
  const sets = {};
  for (const kind of Object.keys(LOOKS)) sets[kind] = shapes(LOOKS[kind]);

  return function createSoldier(kind) {
    const set = sets[kind] ?? sets.rifle,
      bulk = (LOOKS[kind] ?? LOOKS.rifle).bulk;
    const part = (geometry, parent, x, y, z) => {
      const mesh = new Mesh3D(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.setPosition(x, y, z);
      parent.addChild(mesh);
      return mesh;
    };
    const root = new Object3D(),
      body = new Object3D();
    root.addChild(body);
    const upper = part(set.upper, body, 0, HIP, 0),
      head = part(set.head, upper, 0, 0.62, 0);
    const legs = [-1, 1].map((side) => {
      const thigh = part(set.thigh, body, side * 0.1 * bulk, HIP, 0),
        shin = part(set.shin, thigh, 0, -THIGH, 0);
      return { thigh, shin };
    });
    let phase = Math.random() * 6,
      flinch = 0,
      lean = 0,
      aim = 0;
    return {
      root,
      /** Place and pose the figure for this frame. `pitchToPlayer` is how far up or down its target is. */
      update(enemy, dt, pitchToPlayer) {
        if (enemy.dead) {
          // Fall onto the back, away from the shot, then sink out of the way.
          const t = Math.min(1, enemy.deadFor / 0.5),
            fall = (1 - (1 - t) * (1 - t)) * 1.5;
          root.setPosition(enemy.x, enemy.deadFor > 7 ? -(enemy.deadFor - 7) * 0.4 : 0, enemy.z);
          orient(root, enemy.fallYaw + Math.PI, fall);
          body.setPosition(0, 0, 0);
          orient(upper, 0, -0.15 * t, 0.2 * t);
          orient(head, 0.5 * t, 0.2 * t);
          orient(legs[0].thigh, 0, 0.25 * t, -0.12 * t);
          orient(legs[1].thigh, 0, -0.1 * t, 0.18 * t);
          orient(legs[0].shin, 0, -0.5 * t);
          orient(legs[1].shin, 0, -0.15 * t);
          return;
        }
        const pace = Math.min(1, enemy.speed / 3.2);
        phase += dt * (3 + enemy.speed * 2.1);
        const swing = Math.sin(phase) * 0.75 * pace;
        root.setPosition(enemy.x, 0, enemy.z);
        orient(root, enemy.yaw);
        body.setPosition(0, Math.abs(Math.cos(phase)) * 0.045 * pace - 0.02 * pace, 0);
        for (const [i, leg] of legs.entries()) {
          const s = i === 0 ? swing : -swing;
          orient(leg.thigh, 0, s);
          // The knee bends as the leg comes through.
          orient(leg.shin, 0, -Math.max(0, -s) * 1.1 - 0.12 * pace);
        }
        if (enemy.hurtAgo < 0.05) flinch = 1;
        flinch *= Math.exp(-dt * 9);
        lean += ((enemy.speed > 3.6 ? -0.22 : -0.05) - lean) * Math.min(1, dt * 6);
        aim += ((enemy.sees ? pitchToPlayer : 0) - aim) * Math.min(1, dt * 8);
        const shake = enemy.firedAgo < 0.06 ? 0.03 : 0;
        orient(upper, Math.sin(phase) * 0.08 * pace, lean + aim * 0.7 + flinch * 0.3 + shake, flinch * 0.12);
        orient(head, enemy.sees ? 0 : Math.sin(phase * 0.13 + enemy.id) * 0.5, aim * 0.3 - lean);
      },
    };
  };
}
