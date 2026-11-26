// Enemy figures use complete authored surfaces with a shared GPU skin template per role.
// Native bone poses drive walking, aiming, recoil, reloads and falls.
// The explicit original-art benchmark retains its procedural jointed figures.
import { Mesh3D, Object3D, createRagdoll3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { addModel } from './asset-models.mjs';
import { createBuilder, orient, rgb } from './build.mjs';
import { createDetails } from './textures.mjs';
import { prepareSoldierSkin, createSoldierSkin, soldierWeaponHold } from './soldier-skin.mjs';

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
    cloth: [0.27, 0.31, 0.2],
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

function shapes(look, separateWeapon) {
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
  // The arms and the weapon are a part of their own, hinged at the shoulders, so they can be raised, lowered and kicked by recoil.
  const arms = createBuilder();
  // Arms: shoulder, elbow pad, glove. The right holds the grip, the left the handguard.
  const arm = (shoulder, elbow, wrist) => {
    arms.ball(shoulder[0], shoulder[1], shoulder[2], 0.086 * k, 0.086 * k, 0.086 * k, { tint: look.cloth, sides: 8, rings: 5 });
    arms.limb(shoulder, elbow, 0.062 * k, 0.053 * k, { tint: look.cloth });
    arms.ball(elbow[0], elbow[1], elbow[2], 0.06 * k, 0.06 * k, 0.06 * k, { tint: look.gear, sides: 7, rings: 4 });
    arms.limb(elbow, wrist, 0.05 * k, 0.04 * k, { tint: look.cloth });
    arms.ball(wrist[0], wrist[1], wrist[2], 0.046, 0.04, 0.052, { tint: BLACK, sides: 7, rings: 4 });
  };
  arm([0.23 * k, 0.5, 0], [0.27 * k, 0.29, -0.13], [0.08, 0.3, -0.33]);
  arm([-0.23 * k, 0.5, 0], [-0.25 * k, 0.28, -0.22], [0.0, 0.32, -0.53]);
  if (look.visor)
    for (const side of [-1, 1]) arms.box(side * 0.25 * k, 0.5, 0, 0.11, 0.13, 0.17, kit(look.vest)); // shoulder armour
  else arms.limb([-0.272 * k, 0.43, 0.0], [-0.276 * k, 0.37, -0.03], 0.068 * k, 0.066 * k, { tint: look.trim, caps: false }); // arm band
  // The weapon: receiver, handguard, barrel with a suppressor, sight, magazine, stock and sling.
  const weapon = separateWeapon ? createBuilder() : arms;
  const big = look.visor ? 1.25 : 1;
  weapon.box(0.05, 0.36, -0.36, 0.046 * big, 0.075 * big, 0.3, { tint: GUN });
  weapon.limb([0.05, 0.365, -0.5], [0.05, 0.365, -0.76], 0.03 * big, 0.027 * big, {
    tint: look.visor ? GUN : rgb(0x514833),
    sides: 8,
  });
  weapon.limb([0.05, 0.365, -0.76], [0.05, 0.365, -0.86], 0.011 * big, 0.011 * big, { tint: GUN, sides: 6 });
  weapon.limb([0.05, 0.365, -0.84], [0.05, 0.365, -1.0], 0.02 * big, 0.02 * big, { tint: rgb(0x1e2023), sides: 8 });
  weapon.box(0.05, 0.425, -0.4, 0.034, 0.045, 0.06, { tint: GUN });
  weapon.box(0.05, 0.408, -0.55, 0.02, 0.012, 0.36, { tint: rgb(0x1e2023) });
  weapon.box(0.05, 0.275, -0.42, 0.03, 0.13, look.visor ? 0.13 : 0.055, { tint: rgb(0x1e2023), pitch: 0.22 });
  weapon.box(0.05, 0.3, -0.27, 0.03, 0.09, 0.04, { tint: rgb(0x1e2023), pitch: -0.3 });
  weapon.limb([0.055, 0.365, -0.2], [0.06, 0.365, -0.04], 0.014, 0.014, { tint: GUN, sides: 6 });
  weapon.box(0.06, 0.35, -0.07, 0.04, 0.085, 0.12, { tint: rgb(0x514833) });
  weapon.limb([0.05, 0.33, -0.7], [0.2 * k, 0.52, 0.02], 0.007, 0.007, { tint: BLACK, sides: 4, caps: false });
  if (look.visor)
    for (const side of [-1, 1])
      weapon.limb([0.05, 0.34, -0.72], [0.05 + side * 0.07, 0.22, -0.8], 0.006, 0.006, { tint: GUN, sides: 4 });

  // ---- head: face, helmet with rails and a mount, headset, eye protection ---------------
  const head = createBuilder();
  head.ball(0, 0.11, 0, 0.09, 0.113, 0.1, { tint: skin, sides: 12, rings: 8 });
  if (!look.mask) {
    head.box(0, 0.105, -0.097, 0.024, 0.03, 0.02, { tint: SKIN }); // nose
    for (const side of [-1, 1]) {
      head.box(side * 0.034, 0.119, -0.0905, 0.022, 0.009, 0.006, { tint: rgb(0xe8e4dc) }); // eye
      head.box(side * 0.034, 0.119, -0.0935, 0.008, 0.008, 0.004, { tint: rgb(0x20160f) }); // pupil
    }
    head.box(0, 0.072, -0.092, 0.04, 0.006, 0.008, { tint: rgb(0x6a4034) }); // mouth
    for (const side of [-1, 1]) head.box(side * 0.034, 0.128, -0.089, 0.024, 0.008, 0.008, { tint: rgb(0x20160f) });
    head.box(0, 0.045, -0.06, 0.1, 0.05, 0.07, { tint: rgb(0x8f6e52) }); // jaw in shadow, a hint of stubble
  } else {
    head.box(0, 0.128, -0.086, 0.13, 0.03, 0.02, { tint: SKIN });
    for (const side of [-1, 1]) {
      head.box(side * 0.033, 0.128, -0.0965, 0.022, 0.009, 0.004, { tint: rgb(0xe8e4dc) });
      head.box(side * 0.033, 0.128, -0.099, 0.008, 0.008, 0.003, { tint: rgb(0x20160f) });
    }
  }
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
    arms: arms.finish({ tangents: true }),
    weapon: separateWeapon ? weapon.finish({ tangents: true }) : undefined,
    head: head.finish({ tangents: true }),
    thighs: [leg(false), leg(true)],
    shin: shin.finish({ tangents: true }),
  };
}

/** Each role shares its prepared geometry and materials; every actor owns its pose. */
/**
 * `world` is a physics world holding the map, used only for bodies falling:
 * a soldier who is shot goes limp and drops as jointed rigid bodies. Without
 * one, the fall is a simple tip backwards.
 */
export function createSoldierFactory(world, models = {}) {
  const details = createDetails();
  const material = createStandardMaterial3D({
    color: 0xffffff,
    vertexColors: true,
    map: details.camo.map,
    normalMap: details.camo.normalMap,
    roughness: 0.86,
  });
  const sets = {};
  for (const kind of Object.keys(LOOKS)) {
    const model = models['soldier-' + kind];
    const art = { ...model?.parts };
    // Share the uniform's prepared arms when the heavy torso has no dedicated pair.
    if (kind === 'heavy' && art.upper && !art.arms) art.arms = models['soldier-rifle']?.parts.arms;
    const held = models['enemy-' + kind] ?? models['weapon-rifle'];
    const skin = model && !Object.keys(art).length ? prepareSoldierSkin(model, kind) : undefined;
    const scale = model && art.upper ? 1.78 / (model.bounds[4] - model.bounds[1]) : undefined;
    const hold=skin && held ? soldierWeaponHold(held) : undefined;
    sets[kind] = { ...(skin ? {} : shapes(LOOKS[kind], Boolean(art.arms || held))), art, held, hold, skin, scale, ground: model?.bounds[1] ?? 0 };
  }

  return function createSoldier(kind) {
    const set = sets[kind] ?? sets.rifle,
      bulk = (LOOKS[kind] ?? LOOKS.rifle).bulk;
    const part = (geometry, parent, x, y, z, art, slot = geometry.boundingBox, anchor) => {
      const pivot = art ? new Object3D() : new Mesh3D(geometry, material);
      if (art) {
        // Every slice retains one full-body scale. Subtract only the native joint's rest position.
        const transform = anchor && set.scale ? { scale: set.scale,
          position: [-anchor[0], -set.ground * set.scale - anchor[1], -anchor[2]] } : undefined;
        addModel(pivot, art, slot, { fit: 'depth', transform });
      }
      else pivot.castShadow = pivot.receiveShadow = true;
      pivot.setPosition(x, y, z);
      parent.addChild(pivot);
      return pivot;
    };
    const skin = set.skin ? createSoldierSkin(set.skin, bulk, set.hold?.palms) : undefined;
    const root = skin?.root ?? new Object3D(),
      body = skin?.body ?? new Object3D();
    if (!skin) root.addChild(body);
    const torsoSlot = skin ? undefined : Array.from(set.upper.boundingBox);
    // The stock bounds include the radio antenna above the fabric.
    if (torsoSlot) torsoSlot[4] = 0.64;
    const upper = skin?.upper ?? part(set.upper, body, 0, HIP, 0, set.art.upper, torsoSlot, [0, HIP, 0]),
      head = skin?.head ?? part(set.head, upper, 0, 0.62, 0, set.art.head, undefined, [0, HIP + 0.62, 0]),
      shoulders = skin?.shoulders ?? new Object3D();
    if (!skin) {
      shoulders.setPosition(0, 0.5, 0);
      upper.addChild(shoulders);
      part(set.arms, shoulders, 0, -0.5, 0, set.art.arms, undefined, [0, HIP, 0]);
    }
    if (skin && set.held) {
      const weapon = new Object3D();
      addModel(weapon, set.held, undefined, { transform:set.hold.transform });
      shoulders.addChild(weapon);
    } else if (set.weapon) part(set.weapon, shoulders, 0, -0.5, 0, set.held);
    const legs = skin?.legs ?? [-1, 1].map((side) => {
      const which = side < 0 ? 'left' : 'right';
      const thigh = part(set.thighs[side < 0 ? 0 : 1], body, side * 0.1 * bulk, HIP, 0, set.art[which + '-thigh'], undefined, [side * 0.1 * bulk, HIP, 0]),
        shin = part(set.shin, thigh, 0, -THIGH, 0, set.art[which + '-shin'], undefined, [side * 0.1 * bulk, HIP - THIGH, 0]);
      return { thigh, shin };
    });
    let ragdoll;
    /** Go limp: hand the figure's joints to rigid bodies, thrown the way the killing shot was travelling. */
    function drop(enemy) {
      root.updateWorldMatrices(true);
      const hinge = { type: 'hinge', axis: [1, 0, 0], limits: [-2.3, 0.05] };
      const leg = (index, parent) => [
        {
          bone: legs[index].thigh,
          shape: { type: 'capsule', radius: 0.08 * bulk, halfHeight: 0.14 },
          offset: [0, -0.22, 0],
          mass: 9,
          parent,
          joint: { type: 'point', coneLimit: 1.1 },
        },
      ];
      const parts = [
        { bone: upper, shape: { type: 'box', halfExtents: [0.19 * bulk, 0.3, 0.13 * bulk] }, offset: [0, 0.3, 0], mass: 32 },
        {
          bone: head,
          shape: { type: 'sphere', radius: 0.115 },
          offset: [0, 0.12, 0],
          mass: 5,
          parent: 0,
          joint: { type: 'point', coneLimit: 0.6 },
        },
        ...leg(0, 0),
        {
          bone: legs[0].shin,
          shape: { type: 'capsule', radius: 0.065 * bulk, halfHeight: 0.15 },
          offset: [0, -0.23, 0],
          mass: 5,
          parent: 2,
          joint: hinge,
        },
        ...leg(1, 0),
        {
          bone: legs[1].shin,
          shape: { type: 'capsule', radius: 0.065 * bulk, halfHeight: 0.15 },
          offset: [0, -0.23, 0],
          mass: 5,
          parent: 4,
          joint: hinge,
        },
      ];
      ragdoll = createRagdoll3D(world, root, parts, {
        layer: 4,
        mask: 1,
        friction: 0.9,
        linearDamping: 0.25,
        angularDamping: 0.7,
      });
      // `fallYaw` looks along the shot; push that way and tip the top of the body over.
      const dx = -Math.sin(enemy.fallYaw),
        dz = -Math.cos(enemy.fallYaw);
      ragdoll.activate([dx * 2.4, 1, dz * 2.4], [dz * 2.5, (Math.random() - 0.5) * 3, -dx * 2.5]);
    }
    let phase = Math.random() * 6,
      flinch = 0,
      lean = 0,
      aim = 0,
      carry = -0.5,
      recoil = 0,
      twist = 0;
    return {
      root,
      /** Give back what the fall used. */
      dispose() {
        ragdoll?.dispose();
        ragdoll = undefined;
      },
      /** Place and pose the figure for this frame. `pitchToPlayer` is how far up or down its target is. */
      update(enemy, dt, pitchToPlayer) {
        if (enemy.dead && world) {
          if (!ragdoll) drop(enemy);
          ragdoll.update();
          return;
        }
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
        const pace = Math.min(1, enemy.speed / 3.2),
          down = enemy.crouch,
          loading = enemy.reloading > 0 ? 1 : 0;
        phase += dt * (3 + enemy.speed * 2.1);
        const swing = Math.sin(phase) * 0.75 * pace;
        root.setPosition(enemy.x, 0, enemy.z);
        orient(root, enemy.yaw);
        // Kneeling drops the hips and folds the legs under them.
        body.setPosition(0, Math.abs(Math.cos(phase)) * 0.045 * pace - 0.02 * pace - down * 0.4, 0);
        for (const [i, leg] of legs.entries()) {
          const s = i === 0 ? swing : -swing;
          orient(leg.thigh, 0, s * (1 - down) + down * (i === 0 ? 1.45 : 0.35));
          // The knee bends as the leg comes through.
          orient(leg.shin, 0, (-Math.max(0, -s) * 1.1 - 0.12 * pace) * (1 - down) - down * (i === 0 ? 1.5 : 1.85));
        }
        if (enemy.hurtAgo < 0.05 && flinch < 0.5) {
          flinch = 1;
          // A hit spins the shoulders one way or the other.
          twist = Math.random() < 0.5 ? -0.55 : 0.55;
        }
        flinch *= Math.exp(-dt * 9);
        lean += ((enemy.speed > 3.6 ? -0.22 : -0.05) - lean) * Math.min(1, dt * 6);
        aim += ((enemy.sees ? pitchToPlayer : 0) - aim) * Math.min(1, dt * 8);
        const shake = enemy.firedAgo < 0.06 ? 0.03 : 0;
        // The weapon: low across the body on guard, up at the shoulder in a fight, tipped down to reload; each shot kicks it.
        if (enemy.firedAgo < 0.03) recoil = 1;
        recoil *= Math.exp(-dt * 16);
        const want = loading ? -0.75 : enemy.sees ? aim * 0.35 : enemy.aware ? (enemy.speed > 3.6 ? -0.4 : -0.15) : -0.6;
        carry += (want - carry) * Math.min(1, dt * 7);
        orient(shoulders, flinch * twist * 0.4, carry + recoil * 0.09, loading * 0.35 + flinch * twist * 0.2);
        // Changing magazines: the weapon tips down and to one side, and the head follows the hands.
        const fiddle = loading * Math.sin(phase * 2.2) * 0.05;
        orient(
          upper,
          Math.sin(phase) * 0.08 * pace + loading * 0.25,
          lean + aim * 0.7 * (1 - loading) + flinch * 0.3 + shake - down * 0.12 - loading * 0.32,
          flinch * 0.12 + loading * 0.18 + fiddle,
        );
        upper.rotateOnAxis([0, 1, 0], flinch * twist);
        orient(
          head,
          enemy.sees || loading ? -loading * 0.3 : Math.sin(phase * 0.13 + enemy.id) * 0.5,
          aim * 0.3 * (1 - loading) - lean - loading * 0.3,
        );
      },
    };
  };
}
