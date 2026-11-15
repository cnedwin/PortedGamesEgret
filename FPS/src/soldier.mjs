// The enemy soldiers: jointed figures put together from boxes, one set of
// shapes per kind, moved by a few lines of procedural animation (a walk
// cycle, an aiming lean, a flinch when hit, and a fall).
import { Mesh3D, Object3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { createBuilder, orient, rgb } from './build.mjs';
import { createDetails } from './textures.mjs';

const SKIN = rgb(0xc9a27e),
  BLACK = rgb(0x1b1c1e),
  GUN = rgb(0x2a2c30);

/**
 * How each kind is dressed. `cloth` tints the camouflage pattern of the
 * uniform; `vest`, `gear` and `helmet` are the load-carrying kit; `trim` is
 * the one bright mark that tells the kinds apart at a glance.
 */
const LOOKS = {
  rifle: {
    cloth: [0.42, 0.47, 0.33],
    vest: rgb(0x4a4f38),
    gear: rgb(0x6f6444),
    helmet: rgb(0x4b5238),
    trim: rgb(0x8a7a4a),
    bulk: 1,
    mask: false,
    visor: false,
  },
  rush: {
    cloth: [0.2, 0.21, 0.24],
    vest: rgb(0x2b2d31),
    gear: rgb(0x3a3d42),
    helmet: rgb(0x202124),
    trim: rgb(0xb3302c),
    bulk: 0.96,
    mask: true,
    visor: false,
  },
  heavy: {
    cloth: [0.34, 0.38, 0.33],
    vest: rgb(0x33382f),
    gear: rgb(0x4d5348),
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
    skin = look.mask ? BLACK : SKIN,
    cloth = { tint: look.cloth, tile: 0.5 },
    kit = (tint) => ({ tint, tile: 0.12 });
  // ---- torso, kit, arms and weapon, modelled around the hip joint, facing -Z ------------
  const upper = createBuilder();
  upper.box(0, 0.05, 0, 0.33 * k, 0.18, 0.2 * k, cloth);
  upper.limb([0, 0.1, 0], [0, 0.52, 0], 0.158 * k, 0.186 * k, { tint: look.cloth, sides: 12 });
  upper.limb([0, 0.105, 0], [0, 0.145, 0], 0.172 * k, 0.172 * k, { tint: BLACK, sides: 12, caps: false }); // belt
  // Plate carrier: plates front and back, a cummerbund round the sides, straps over the shoulders.
  upper.box(0, 0.37, -0.125 * k, 0.29 * k, 0.3, 0.07, kit(look.vest));
  upper.box(0, 0.37, 0.125 * k, 0.29 * k, 0.32, 0.07, kit(look.vest));
  for (const side of [-1, 1]) {
    upper.box(side * 0.165 * k, 0.3, 0, 0.05, 0.15, 0.24 * k, kit(look.vest));
    upper.box(side * 0.105 * k, 0.535, 0, 0.065, 0.03, 0.27 * k, kit(look.vest));
  }
  // Three magazine pouches with the magazines showing, an admin pouch, and a radio with its aerial.
  for (const side of [-0.095, 0, 0.095]) {
    upper.box(side * k, 0.27, -0.175 * k, 0.078, 0.125, 0.05, kit(look.gear));
    upper.box(side * k, 0.345, -0.175 * k, 0.05, 0.035, 0.028, { tint: GUN });
    upper.box(side * k, 0.3, -0.202 * k, 0.07, 0.012, 0.004, { tint: BLACK });
  }
  upper.box(0, 0.45, -0.168 * k, 0.17, 0.085, 0.03, kit(look.gear));
  upper.box(-0.02, 0.45, -0.185 * k, 0.07, 0.03, 0.006, { tint: look.trim });
  upper.box(-0.12 * k, 0.47, -0.16 * k, 0.05, 0.11, 0.04, { tint: BLACK });
  upper.limb([-0.13 * k, 0.52, -0.16 * k], [-0.15 * k, 0.82, -0.1], 0.005, 0.003, { tint: BLACK, sides: 5 });
  // Belt kit: pouches at the hips and a dump pouch behind.
  for (const side of [-1, 1]) upper.box(side * 0.18 * k, 0.11, 0.02, 0.05, 0.11, 0.1, kit(look.gear));
  upper.box(0.1 * k, 0.08, 0.13 * k, 0.12, 0.13, 0.07, kit(look.gear));
  // Pack: a main bag, a roll on top and side pockets.
  upper.box(0, 0.4, 0.215 * k, 0.26 * k, 0.33, 0.12, kit(look.gear));
  upper.limb([-0.13 * k, 0.6, 0.2 * k], [0.13 * k, 0.6, 0.2 * k], 0.05, 0.05, { tint: look.cloth, sides: 8 });
  for (const side of [-1, 1]) upper.box(side * 0.155 * k, 0.33, 0.215 * k, 0.05, 0.17, 0.09, kit(look.vest));
  upper.box(0, 0.42, 0.279 * k, 0.14, 0.012, 0.004, { tint: look.trim });
  upper.limb([0, 0.52, 0], [0, 0.63, 0], 0.055, 0.05, { tint: skin });
  if (look.visor) upper.limb([0, 0.53, 0], [0, 0.6, 0], 0.085, 0.075, { tint: look.vest, sides: 10 }); // collar guard
  // Arms: shoulder, elbow pad, glove. The right holds the grip, the left the handguard.
  const arm = (shoulder, elbow, wrist) => {
    upper.ball(shoulder[0], shoulder[1], shoulder[2], 0.086 * k, 0.086 * k, 0.086 * k, { tint: look.cloth, sides: 8, rings: 5 });
    upper.limb(shoulder, elbow, 0.062 * k, 0.053 * k, { tint: look.cloth });
    upper.ball(elbow[0], elbow[1], elbow[2], 0.06 * k, 0.06 * k, 0.06 * k, { tint: look.gear, sides: 7, rings: 4 });
    upper.limb(elbow, wrist, 0.05 * k, 0.04 * k, { tint: look.cloth });
    upper.ball(wrist[0], wrist[1], wrist[2], 0.046, 0.04, 0.052, { tint: BLACK, sides: 7, rings: 4 });
  };
  arm([0.23 * k, 0.5, 0], [0.27 * k, 0.29, -0.13], [0.08, 0.3, -0.33]);
  arm([-0.23 * k, 0.5, 0], [-0.25 * k, 0.28, -0.22], [0.0, 0.32, -0.53]);
  if (look.visor)
    for (const side of [-1, 1]) upper.box(side * 0.25 * k, 0.5, 0, 0.11, 0.13, 0.17, kit(look.vest)); // shoulder armour
  else upper.limb([-0.272 * k, 0.43, 0.0], [-0.276 * k, 0.37, -0.03], 0.068 * k, 0.066 * k, { tint: look.trim, caps: false }); // arm band
  // The weapon: receiver, handguard, barrel with a suppressor, sight, magazine, stock and sling.
  const big = look.visor ? 1.25 : 1;
  upper.box(0.05, 0.36, -0.36, 0.046 * big, 0.075 * big, 0.3, { tint: GUN });
  upper.limb([0.05, 0.365, -0.5], [0.05, 0.365, -0.76], 0.03 * big, 0.027 * big, {
    tint: look.visor ? GUN : rgb(0x514833),
    sides: 8,
  });
  upper.limb([0.05, 0.365, -0.76], [0.05, 0.365, -0.86], 0.011 * big, 0.011 * big, { tint: GUN, sides: 6 });
  upper.limb([0.05, 0.365, -0.84], [0.05, 0.365, -1.0], 0.02 * big, 0.02 * big, { tint: rgb(0x1e2023), sides: 8 });
  upper.box(0.05, 0.425, -0.4, 0.034, 0.045, 0.06, { tint: GUN });
  upper.box(0.05, 0.408, -0.55, 0.02, 0.012, 0.36, { tint: rgb(0x1e2023) });
  upper.box(0.05, 0.275, -0.42, 0.03, 0.13, look.visor ? 0.13 : 0.055, { tint: rgb(0x1e2023), pitch: 0.22 });
  upper.box(0.05, 0.3, -0.27, 0.03, 0.09, 0.04, { tint: rgb(0x1e2023), pitch: -0.3 });
  upper.limb([0.055, 0.365, -0.2], [0.06, 0.365, -0.04], 0.014, 0.014, { tint: GUN, sides: 6 });
  upper.box(0.06, 0.35, -0.07, 0.04, 0.085, 0.12, { tint: rgb(0x514833) });
  upper.limb([0.05, 0.33, -0.7], [0.2 * k, 0.52, 0.02], 0.007, 0.007, { tint: BLACK, sides: 4, caps: false });
  if (look.visor)
    for (const side of [-1, 1])
      upper.limb([0.05, 0.34, -0.72], [0.05 + side * 0.07, 0.22, -0.8], 0.006, 0.006, { tint: GUN, sides: 4 });

  // ---- head: face, helmet with rails and a mount, headset, eye protection ---------------
  const head = createBuilder();
  head.ball(0, 0.11, 0, 0.09, 0.113, 0.1, { tint: skin, sides: 12, rings: 8 });
  if (!look.mask) {
    head.box(0, 0.105, -0.097, 0.024, 0.03, 0.02, { tint: SKIN }); // nose
    for (const side of [-1, 1]) head.box(side * 0.034, 0.128, -0.089, 0.024, 0.008, 0.008, { tint: rgb(0x20160f) });
    head.box(0, 0.045, -0.06, 0.1, 0.05, 0.07, { tint: rgb(0x8f6e52) }); // jaw in shadow, a hint of stubble
  } else head.box(0, 0.128, -0.086, 0.13, 0.03, 0.02, { tint: SKIN });
  if (look.visor) {
    head.ball(0, 0.15, 0.004, 0.118, 0.105, 0.128, { tint: look.helmet, sides: 12, rings: 7 });
    head.box(0, 0.105, -0.1, 0.19, 0.13, 0.03, { tint: rgb(0x0e1418) });
    head.box(0, 0.045, -0.09, 0.15, 0.06, 0.05, { tint: look.helmet });
  } else if (look.mask) {
    // A watch cap, with ballistic glasses.
    head.ball(0, 0.165, 0.008, 0.096, 0.075, 0.106, { tint: look.helmet, sides: 12, rings: 6 });
    head.box(0, 0.128, -0.098, 0.15, 0.03, 0.012, { tint: rgb(0x23262a) });
    head.box(0.07, 0.19, -0.02, 0.035, 0.02, 0.05, { tint: look.trim });
  } else {
    head.ball(0, 0.16, 0.006, 0.108, 0.088, 0.12, { tint: look.helmet, sides: 12, rings: 7 });
    head.box(0, 0.17, -0.118, 0.045, 0.04, 0.022, { tint: BLACK }); // mount for night vision
    for (const side of [-1, 1]) head.box(side * 0.108, 0.15, 0.01, 0.012, 0.022, 0.11, { tint: BLACK }); // side rails
    head.box(0, 0.2, -0.085, 0.15, 0.036, 0.03, { tint: rgb(0x23262a) }); // goggles pushed up
    head.box(0, 0.2, 0.02, 0.226, 0.016, 0.03, { tint: rgb(0x23262a) });
    head.box(0, 0.16, 0.122, 0.06, 0.03, 0.01, { tint: look.trim });
  }
  // Headset: a cup over each ear, a band, a boom microphone.
  for (const side of [-1, 1]) head.ball(side * 0.098, 0.108, 0.012, 0.03, 0.045, 0.04, { tint: BLACK, sides: 8, rings: 5 });
  head.limb([0.1, 0.085, 0], [0.05, 0.06, -0.095], 0.005, 0.005, { tint: BLACK, sides: 4 });
  head.ball(0.045, 0.06, -0.098, 0.011, 0.011, 0.011, { tint: BLACK, sides: 5, rings: 3 });

  // ---- legs: thigh with a cargo pocket (a holster on the right), knee pad, shin, boot ---
  const leg = (right) => {
    const thigh = createBuilder().limb([0, 0.02, 0], [0, -THIGH, 0], 0.088 * k, 0.07 * k, { tint: look.cloth });
    thigh.box((right ? 0.07 : -0.07) * k, -0.2, 0, 0.045, 0.14, 0.11, cloth);
    if (right) {
      thigh.box(0.085 * k, -0.19, -0.01, 0.045, 0.16, 0.085, { tint: BLACK });
      thigh.box(0.09 * k, -0.11, 0.02, 0.03, 0.05, 0.05, { tint: GUN });
      for (const y of [-0.13, -0.25])
        thigh.limb([0, y, 0], [0, y - 0.025, 0], 0.086 * k, 0.083 * k, { tint: BLACK, caps: false });
    }
    return thigh.finish({ tangents: true });
  };
  const shin = createBuilder().ball(0, -0.01, -0.03, 0.07 * k, 0.078, 0.065 * k, { tint: look.gear, sides: 8, rings: 5 });
  shin.limb([0, 0, 0], [0, -SHIN + 0.13, 0.008], 0.066 * k, 0.052 * k, { tint: look.cloth });
  shin.limb([0, -SHIN + 0.2, 0.008], [0, -SHIN + 0.07, 0.008], 0.056 * k, 0.058 * k, { tint: rgb(0x3a2e22) });
  shin.box(0, -SHIN + 0.075, -0.045, 0.105 * k, 0.085, 0.25, { tint: rgb(0x3a2e22), tile: 0.2 });
  shin.box(0, -SHIN + 0.022, -0.045, 0.112 * k, 0.03, 0.262, { tint: BLACK });
  return {
    upper: upper.finish({ tangents: true }),
    head: head.finish({ tangents: true }),
    thighs: [leg(false), leg(true)],
    shin: shin.finish({ tangents: true }),
  };
}

/** Builds soldiers of every kind; they share shapes and one material. */
export function createSoldierFactory() {
  const details = createDetails();
  const material = createStandardMaterial3D({
    color: 0xffffff,
    vertexColors: true,
    map: details.camo.map,
    normalMap: details.camo.normalMap,
    roughness: 0.86,
  });
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
      const thigh = part(set.thighs[side < 0 ? 0 : 1], body, side * 0.1 * bulk, HIP, 0),
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
