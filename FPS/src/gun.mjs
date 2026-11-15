// The weapons as the operator sees them: a rifle and a pistol built from
// boxes, held in front of the camera, with the motion that makes them feel
// held (sway, bob, recoil, aiming down the sight, reloading, switching).
import {
  Mesh3D,
  Object3D,
  createPointLight3D,
  createQuadGeometry3D,
  createStandardMaterial3D,
  createUnlitMaterial3D,
} from '@egret/engine/world3d';
import { SWITCH_TIME } from './data.mjs';
import { createBuilder, orient, rgb } from './build.mjs';
import { createDetails, flashTexture } from './textures.mjs';

const STEEL = rgb(0x43474d),
  DARK = rgb(0x2b2d30),
  TAN = rgb(0x6f6349),
  SLEEVE = rgb(0xb0b0a0),
  GLOVE = rgb(0x4a4a44);

/**
 * The rig is drawn at this fraction of its real size, this much closer to the
 * eye. Seen from the eye that changes nothing, but the barrel no longer pokes
 * through a wall the operator is standing against.
 */
const RIG_SCALE = 0.42;

/** Where each weapon sits (x right, y up, z back) from the hip and when aimed, and where its muzzle is. */
const HOLD = {
  rifle: { hip: [0.17, -0.19, -0.52], aim: [0, -0.0835, -0.34], muzzle: [0, 0.02, -0.62] },
  pistol: { hip: [0.15, -0.17, -0.6], aim: [0, -0.058, -0.5], muzzle: [0, 0.03, -0.14] },
};

/** Tile of the fine surface textures on the weapons, in metres. */
const GRAIN = 0.045;
const part = (tint) => ({ tint, tile: GRAIN });

/** A gloved hand as the operator sees it: a palm, four fingers of two joints and a thumb. `curl` gives each finger's three points. */
function hand(builder, palm, size, fingers, thumb) {
  builder.box(palm[0], palm[1], palm[2], size[0], size[1], size[2], {
    tint: GLOVE,
    tile: GRAIN,
    yaw: palm[3] ?? 0,
    pitch: palm[4] ?? 0,
  });
  for (const [a, b, c] of fingers) {
    builder.limb(a, b, 0.0095, 0.009, { tint: GLOVE, sides: 6 });
    builder.limb(b, c, 0.009, 0.008, { tint: GLOVE, sides: 6 });
    builder.ball(b[0], b[1], b[2], 0.0105, 0.0105, 0.0105, { tint: rgb(0x3a3c40), sides: 6, rings: 4 });
  }
  builder.limb(thumb[0], thumb[1], 0.011, 0.0095, { tint: GLOVE, sides: 6 });
}
/** A sleeve from the wrist back to the elbow, with a cuff and a watch-sized strap. */
function sleeve(builder, wrist, elbow) {
  builder.limb(wrist, elbow, 0.034, 0.05, { tint: SLEEVE, sides: 10 });
  const mid = [0, 1, 2].map((i) => wrist[i] + (elbow[i] - wrist[i]) * 0.06);
  builder.limb(wrist, mid, 0.037, 0.037, { tint: GLOVE, sides: 10 });
}

function rifleShapes() {
  const body = createBuilder();
  // ---- receivers ------------------------------------------------------------------------
  body.box(0, 0.012, -0.03, 0.04, 0.05, 0.27, part(STEEL));
  body.box(0, -0.028, 0.005, 0.036, 0.04, 0.18, part(DARK));
  body.box(0, -0.036, -0.09, 0.034, 0.03, 0.07, part(DARK)); // magazine well
  body.box(0.0215, 0.012, -0.055, 0.004, 0.022, 0.085, part(rgb(0x55595e))); // ejection port cover
  body.box(0.022, -0.004, 0.03, 0.006, 0.012, 0.03, part(rgb(0x55595e))); // brass deflector
  body.limb([0.021, 0.018, 0.07], [0.03, 0.018, 0.085], 0.006, 0.007, { tint: STEEL, sides: 6 }); // forward assist
  body.box(-0.021, -0.012, 0.028, 0.004, 0.016, 0.01, part(rgb(0x8a2a20))); // selector
  body.box(-0.021, -0.006, -0.03, 0.004, 0.02, 0.028, part(STEEL)); // bolt catch
  for (const z of [0.06, -0.12])
    body.limb([-0.021, -0.022, z], [0.021, -0.022, z], 0.004, 0.004, { tint: rgb(0x16171a), sides: 6 }); // takedown pins
  body.box(0, 0.032, 0.115, 0.03, 0.012, 0.045, part(STEEL)); // charging handle
  // ---- handguard: eight-sided, with slots along the sides and a full rail on top -------
  body.limb([0, 0.004, -0.165], [0, 0.004, -0.47], 0.0295, 0.027, { tint: TAN, sides: 8 });
  for (let i = 0; i < 6; i++)
    for (const side of [-1, 1]) {
      body.box(side * 0.0285, 0.004, -0.2 - i * 0.045, 0.004, 0.009, 0.03, { tint: rgb(0x14161a) });
      body.box(side * 0.02, -0.018, -0.2 - i * 0.045, 0.004, 0.008, 0.03, { tint: rgb(0x14161a), roll: side * 0.78 });
    }
  body.box(0, 0.041, -0.19, 0.022, 0.01, 0.56, part(DARK));
  for (let i = 0; i < 26; i++) body.box(0, 0.0485, 0.085 - i * 0.022, 0.024, 0.005, 0.012, { tint: rgb(0x1a1b1e) });
  body.limb([0, 0.004, -0.165], [0, 0.004, -0.178], 0.033, 0.033, { tint: STEEL, sides: 8 }); // barrel nut
  // ---- barrel, gas block, suppressor -------------------------------------------------------
  body.limb([0, 0.006, -0.47], [0, 0.006, -0.56], 0.0092, 0.0092, { tint: DARK, sides: 8 });
  body.box(0, 0.014, -0.49, 0.022, 0.03, 0.03, part(DARK));
  body.limb([0, 0.006, -0.55], [0, 0.006, -0.74], 0.0185, 0.0185, { tint: rgb(0x33363a), sides: 10 });
  for (const z of [-0.565, -0.59, -0.72])
    body.limb([0, 0.006, z], [0, 0.006, z - 0.008], 0.0198, 0.0198, { tint: rgb(0x1c1d20), sides: 10, caps: false });
  body.limb([0, 0.006, -0.74], [0, 0.006, -0.746], 0.012, 0.012, { tint: rgb(0x0c0c0d), sides: 8 });
  // ---- sight: a holographic unit with a hooded window, and a folded front post ---------
  body.box(0, 0.056, -0.05, 0.04, 0.012, 0.085, part(DARK));
  body.box(0, 0.07, 0.0, 0.04, 0.02, 0.03, part(DARK)); // battery housing
  for (const side of [-1, 1]) body.box(side * 0.0205, 0.086, -0.05, 0.004, 0.05, 0.05, part(DARK));
  body.box(0, 0.1125, -0.05, 0.045, 0.005, 0.05, part(DARK));
  body.box(0, 0.0635, -0.05, 0.038, 0.004, 0.05, part(DARK));
  for (const side of [-1, 1]) body.box(side * 0.026, 0.064, -0.04, 0.008, 0.012, 0.012, part(STEEL)); // mount levers
  body.box(0, 0.058, -0.44, 0.02, 0.012, 0.034, part(DARK));
  body.box(0, 0.068, -0.452, 0.012, 0.012, 0.006, part(DARK));
  body.box(0, 0.058, 0.09, 0.02, 0.012, 0.03, part(DARK)); // folded rear sight
  // ---- accessories: a light on the right, an aiming module on top, a foregrip below ---
  body.limb([0.047, 0.006, -0.3], [0.047, 0.006, -0.4], 0.013, 0.013, { tint: DARK, sides: 8 });
  body.limb([0.047, 0.006, -0.4], [0.047, 0.006, -0.425], 0.016, 0.016, { tint: STEEL, sides: 8 });
  body.box(0.036, 0.006, -0.33, 0.012, 0.016, 0.03, part(DARK));
  body.box(0, 0.058, -0.36, 0.036, 0.02, 0.07, part(TAN));
  for (const side of [-1, 1])
    body.limb([side * 0.01, 0.058, -0.395], [side * 0.01, 0.058, -0.401], 0.005, 0.005, { tint: rgb(0x0c0c0d), sides: 6 });
  body.limb([0, -0.028, -0.26], [0, -0.1, -0.245], 0.014, 0.0125, { tint: DARK, sides: 8 });
  // ---- stock: a buffer tube and a sliding stock with a cheek rest and butt pad ---------
  body.limb([0, 0.008, 0.1], [0, 0.008, 0.31], 0.0145, 0.0145, { tint: DARK, sides: 8 });
  body.box(0, 0.006, 0.26, 0.036, 0.04, 0.13, part(TAN));
  body.box(0, -0.035, 0.29, 0.03, 0.075, 0.07, part(TAN));
  body.box(0, -0.02, 0.33, 0.04, 0.115, 0.014, part(rgb(0x18191b)));
  body.box(0, -0.012, 0.215, 0.012, 0.02, 0.04, part(DARK)); // adjustment lever
  // ---- grip, with ridges, and the trigger guard --------------------------------------
  body.box(0, -0.078, 0.075, 0.032, 0.1, 0.04, { tint: DARK, tile: GRAIN, pitch: 0.32 });
  for (let i = 0; i < 5; i++)
    body.box(0, -0.05 - i * 0.014, 0.066 + i * 0.0045, 0.034, 0.004, 0.036, { tint: rgb(0x17181a), pitch: 0.32 });
  body.box(0, -0.056, 0.005, 0.01, 0.006, 0.085, part(DARK));
  body.box(0, -0.046, -0.036, 0.01, 0.022, 0.006, part(DARK));
  body.box(0, -0.042, 0.02, 0.006, 0.02, 0.008, { tint: STEEL, pitch: -0.3 }); // trigger

  // A curved magazine with ribs and a floor plate.
  const magazine = createBuilder();
  magazine.box(0, -0.045, 0, 0.026, 0.09, 0.058, { tint: DARK, tile: GRAIN, pitch: -0.12 });
  magazine.box(0, -0.115, -0.014, 0.026, 0.07, 0.056, { tint: DARK, tile: GRAIN, pitch: -0.3 });
  for (let i = 0; i < 4; i++)
    magazine.box(0, -0.03 - i * 0.022, -0.004 - i * 0.003, 0.0285, 0.006, 0.05, { tint: rgb(0x1b1c1f), pitch: -0.12 - i * 0.05 });
  magazine.box(0, -0.152, -0.026, 0.03, 0.01, 0.062, { tint: rgb(0x3a3c40), pitch: -0.3 });

  // The hands: the right on the grip, the left under the handguard.
  const hands = createBuilder();
  hand(
    hands,
    [0.012, -0.082, 0.092, 0, 0.32],
    [0.05, 0.085, 0.05],
    [0, 1, 2].map((i) => [
      [0.03, -0.058 - i * 0.02, 0.085 + i * 0.006],
      [0.028, -0.062 - i * 0.02, 0.05 + i * 0.006],
      [0.006, -0.064 - i * 0.02, 0.04 + i * 0.006],
    ]),
    [
      [0.02, -0.04, 0.1],
      [-0.014, -0.022, 0.07],
    ],
  );
  // The trigger finger lies along the receiver.
  hands.limb([0.028, -0.04, 0.085], [0.026, -0.036, 0.03], 0.0095, 0.0085, { tint: GLOVE, sides: 6 });
  sleeve(hands, [0.03, -0.11, 0.12], [0.21, -0.32, 0.42]);
  hand(
    hands,
    [-0.004, -0.04, -0.31],
    [0.06, 0.03, 0.085],
    [0, 1, 2, 3].map((i) => [
      [-0.03, -0.04, -0.345 + i * 0.022],
      [-0.04, -0.004, -0.345 + i * 0.022],
      [-0.03, 0.026, -0.345 + i * 0.022],
    ]),
    [
      [0.026, -0.036, -0.29],
      [0.036, 0.004, -0.325],
    ],
  );
  sleeve(hands, [-0.012, -0.066, -0.28], [-0.17, -0.37, -0.1]);
  hands.box(-0.03, -0.092, -0.262, 0.05, 0.012, 0.03, { tint: rgb(0x16171a), yaw: 0.5, pitch: -0.9 }); // watch
  return {
    body: body.finish({ tangents: true }),
    magazine: magazine.finish({ tangents: true }),
    hands: hands.finish({ tangents: true }),
    magazineAt: [0, -0.035, -0.07],
  };
}

function pistolShapes() {
  const body = createBuilder();
  // Slide with rear serrations, sights and an ejection port; barrel showing at the muzzle.
  body.box(0, 0.03, -0.03, 0.028, 0.034, 0.2, part(STEEL));
  for (let i = 0; i < 6; i++) body.box(0, 0.03, 0.04 + i * 0.007, 0.0295, 0.028, 0.003, { tint: rgb(0x202225) });
  body.box(0.0145, 0.036, -0.03, 0.002, 0.014, 0.045, { tint: rgb(0x16171a) });
  body.limb([0, 0.03, -0.128], [0, 0.03, -0.136], 0.008, 0.008, { tint: rgb(0x101113), sides: 8 });
  body.box(0, 0.05, 0.058, 0.022, 0.008, 0.01, part(DARK));
  body.box(0, 0.05, -0.12, 0.005, 0.008, 0.008, part(DARK));
  for (const side of [-1, 1]) body.box(side * 0.006, 0.0515, 0.058, 0.003, 0.004, 0.004, { tint: rgb(0xe8e4d8) });
  // Frame with a light rail, trigger guard, trigger and a ridged grip.
  body.box(0, 0.002, -0.02, 0.027, 0.024, 0.165, part(DARK));
  body.box(0, -0.012, -0.085, 0.022, 0.008, 0.05, part(DARK));
  body.box(0, -0.022, -0.02, 0.01, 0.006, 0.06, part(DARK));
  body.box(0, -0.014, -0.048, 0.01, 0.02, 0.006, part(DARK));
  body.box(0, -0.012, -0.01, 0.005, 0.018, 0.007, { tint: STEEL, pitch: -0.25 });
  body.box(0, -0.057, 0.046, 0.029, 0.11, 0.048, { tint: DARK, tile: GRAIN, pitch: 0.2 });
  for (let i = 0; i < 6; i++)
    body.box(0, -0.025 - i * 0.014, 0.04 + i * 0.003, 0.031, 0.004, 0.04, { tint: rgb(0x17181a), pitch: 0.2 });
  body.box(-0.0145, 0.006, 0.02, 0.003, 0.008, 0.02, part(STEEL)); // slide stop
  const magazine = createBuilder()
    .box(0, -0.06, 0, 0.021, 0.11, 0.035, { tint: STEEL, tile: GRAIN, pitch: 0.2 })
    .box(0, -0.118, 0.012, 0.026, 0.01, 0.042, { tint: rgb(0x16171a), pitch: 0.2 });
  // Two hands round the grip.
  const hands = createBuilder();
  hand(
    hands,
    [0.014, -0.06, 0.058, 0, 0.2],
    [0.05, 0.09, 0.055],
    [0, 1, 2].map((i) => [
      [0.03, -0.04 - i * 0.02, 0.06 + i * 0.004],
      [0.028, -0.044 - i * 0.02, 0.022 + i * 0.004],
      [0.004, -0.046 - i * 0.02, 0.014 + i * 0.004],
    ]),
    [
      [0.02, -0.01, 0.07],
      [-0.012, 0.004, 0.03],
    ],
  );
  hands.limb([0.028, -0.014, 0.05], [0.024, -0.008, -0.01], 0.0095, 0.0085, { tint: GLOVE, sides: 6 });
  sleeve(hands, [0.03, -0.09, 0.09], [0.2, -0.3, 0.4]);
  hand(
    hands,
    [-0.02, -0.064, 0.05, 0, 0.2],
    [0.045, 0.085, 0.05],
    [0, 1, 2, 3].map((i) => [
      [-0.036, -0.034 - i * 0.019, 0.05 + i * 0.004],
      [-0.03, -0.038 - i * 0.019, 0.012 + i * 0.004],
      [0.0, -0.04 - i * 0.019, 0.006 + i * 0.004],
    ]),
    [
      [-0.03, -0.006, 0.06],
      [-0.018, 0.012, 0.0],
    ],
  );
  sleeve(hands, [-0.03, -0.1, 0.085], [-0.19, -0.3, 0.38]);
  return {
    body: body.finish({ tangents: true }),
    magazine: magazine.finish({ tangents: true }),
    hands: hands.finish({ tangents: true }),
    magazineAt: [0, -0.005, 0.045],
  };
}

/** Add the weapons under `camera` and return the object that animates them. */
export function createGun(camera) {
  // The weapon is often in a wall's shadow; extra sky light keeps its shape readable there.
  const details = createDetails();
  // The weapon is often in a wall's shadow; extra sky light keeps its shape readable there.
  const metal = createStandardMaterial3D({
    color: 0xffffff,
    vertexColors: true,
    map: details.gunmetal.map,
    normalMap: details.gunmetal.normalMap,
    roughness: 0.46,
    metallic: 0.35,
    environmentIntensity: 2.4,
  });
  const cloth = createStandardMaterial3D({
    color: 0xffffff,
    vertexColors: true,
    map: details.camo.map,
    normalMap: details.camo.normalMap,
    roughness: 0.92,
    environmentIntensity: 2,
  });
  const rig = new Object3D();
  rig.setScale(RIG_SCALE);
  camera.addChild(rig);

  const models = {};
  for (const [key, set] of Object.entries({ rifle: rifleShapes(), pistol: pistolShapes() })) {
    const node = new Object3D(),
      body = new Mesh3D(set.body, metal),
      magazine = new Mesh3D(set.magazine, metal),
      hands = new Mesh3D(set.hands, cloth);
    magazine.setPosition(...set.magazineAt);
    for (const mesh of [body, magazine, hands]) {
      mesh.frustumCulled = false;
      mesh.receiveShadow = true;
      node.addChild(mesh);
    }
    node.visible = false;
    rig.addChild(node);
    models[key] = { node, magazine, magazineAt: set.magazineAt };
  }
  // The red dot of the rifle's sight.
  const dot = new Mesh3D(
    createQuadGeometry3D(),
    createUnlitMaterial3D({ color: 0xff2a1a, alphaMode: 'blend', blending: 'additive', depthWrite: false, toneMapped: false }),
  );
  dot.setPosition(0, 0.0835, -0.05);
  dot.setScale(0.0035);
  dot.frustumCulled = false;
  models.rifle.node.addChild(dot);

  // Muzzle flash: two crossed cards and a brief light.
  const flashMaterial = createUnlitMaterial3D({
    color: 0xffffff,
    map: flashTexture(),
    alphaMode: 'blend',
    blending: 'additive',
    depthWrite: false,
    side: 'double',
    toneMapped: false,
  });
  const flash = new Object3D(),
    cards = [0, 1].map((i) => {
      const card = new Mesh3D(createQuadGeometry3D(), flashMaterial);
      card.frustumCulled = false;
      flash.addChild(card);
      if (i) orient(card, Math.PI / 2);
      return card;
    });
  flash.visible = false;
  rig.addChild(flash);
  const light = createPointLight3D({ color: 0xffc27a, intensity: 0, range: 14 });
  camera.addChild(light);
  light.setPosition(0.1, -0.05, -0.9);

  const state = {
    weapon: 'rifle',
    kickBack: 0,
    kickUp: 0,
    swayX: 0,
    swayY: 0,
    bob: 0,
    sprint: 0,
    lower: 1, // starts lowered and comes up
    reload: 0,
    reloadTime: 1,
    flashLeft: 0,
    landing: 0,
  };
  const ease = (t) => t * t * (3 - 2 * t);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  return {
    /** Offset from the eye, in the camera's own axes, of the muzzle (for tracers). */
    muzzleOffset(aim) {
      const hold = HOLD[state.weapon];
      return [0, 1, 2].map((i) => (hold.hip[i] + (hold.aim[i] - hold.hip[i]) * aim + hold.muzzle[i]) * 1);
    },
    fire(weapon, aim) {
      state.kickBack += weapon === 'pistol' ? 0.03 : 0.022 - 0.008 * aim;
      state.kickUp += weapon === 'pistol' ? 0.09 : 0.035 - 0.015 * aim;
      state.flashLeft = 0.045;
      const size = (weapon === 'pistol' ? 0.16 : 0.26) * (0.8 + Math.random() * 0.5);
      for (const card of cards) card.setScale(size);
      orient(flash, 0, 0, Math.random() * 6.28);
      flash.setPosition(...this.muzzleOffset(aim).map((v, i) => v + (i === 2 ? -0.06 : 0)));
    },
    reload(seconds) {
      state.reload = seconds;
      state.reloadTime = seconds;
    },
    land(speed) {
      state.landing = Math.min(0.08, speed * 0.008);
    },
    /** Animate for this frame. `turn` and `tilt` are how far the view moved since the last one. */
    update(dt, game, turn, tilt, visible) {
      const p = game.player,
        weapon = game.weapons[p.weapon],
        model = models[p.weapon],
        hold = HOLD[p.weapon];
      if (state.weapon !== p.weapon) {
        state.weapon = p.weapon;
        state.reload = 0;
      }
      for (const key of Object.keys(models)) models[key].node.visible = visible && key === p.weapon;
      if (weapon.reloading <= 0) state.reload = 0;
      else state.reload = weapon.reloading;

      // Springs: recoil settles, sway trails the view, the bob follows the stride.
      state.kickBack *= Math.exp(-dt * 16);
      state.kickUp *= Math.exp(-dt * 13);
      state.swayX += (Math.max(-0.05, Math.min(0.05, turn * 0.9)) - state.swayX) * Math.min(1, dt * 9);
      state.swayY += (Math.max(-0.05, Math.min(0.05, -tilt * 0.9)) - state.swayY) * Math.min(1, dt * 9);
      state.bob += dt * (p.sprinting ? 13 : 9) * Math.min(1, p.speed / 3);
      state.sprint += ((p.sprinting ? 1 : 0) - state.sprint) * Math.min(1, dt * 8);
      state.landing *= Math.exp(-dt * 10);
      const lowered = p.healing > 0 || !visible ? 1 : clamp01(p.drawing / SWITCH_TIME);
      state.lower += (lowered - state.lower) * Math.min(1, dt * 14);

      const aim = ease(p.aim),
        moving = Math.min(1, p.speed / 4) * (p.grounded ? 1 : 0),
        bobSize = (1 - aim * 0.85) * moving * (p.sprinting ? 0.016 : 0.008);
      let x = hold.hip[0] + (hold.aim[0] - hold.hip[0]) * aim,
        y = hold.hip[1] + (hold.aim[1] - hold.hip[1]) * aim,
        z = hold.hip[2] + (hold.aim[2] - hold.hip[2]) * aim;
      x += state.swayX + Math.sin(state.bob) * bobSize;
      y += state.swayY - Math.abs(Math.cos(state.bob)) * bobSize - state.landing - state.lower * 0.32;
      z += state.kickBack;
      let yaw = state.swayX * 1.5,
        pitch = state.kickUp * (1 - aim * 0.5) + state.swayY - state.lower * 0.9,
        roll = -state.swayX * 2;
      // Sprinting carries the weapon low across the body.
      x -= state.sprint * 0.07;
      y -= state.sprint * 0.05;
      yaw += state.sprint * 0.75;
      roll += state.sprint * 0.35;
      // Reloading: tip the weapon, drop the magazine, bring a new one up.
      let magazineDrop = 0;
      if (state.reload > 0) {
        const t = 1 - state.reload / state.reloadTime,
          tip = ease(clamp01(t / 0.15)) * (1 - ease(clamp01((t - 0.8) / 0.2)));
        y -= tip * 0.05;
        pitch += tip * 0.32;
        roll += tip * 0.55;
        yaw += tip * 0.12;
        magazineDrop = t < 0.45 ? ease(clamp01((t - 0.12) / 0.2)) : 1 - ease(clamp01((t - 0.5) / 0.2));
      }
      model.magazine.setPosition(model.magazineAt[0], model.magazineAt[1] - magazineDrop * 0.3, model.magazineAt[2]);
      model.magazine.visible = magazineDrop < 0.98;
      model.node.setPosition(x, y, z);
      orient(model.node, yaw, pitch, roll);
      dot.visible = p.weapon === 'rifle';

      state.flashLeft -= dt;
      flash.visible = visible && state.flashLeft > 0;
      light.intensity = state.flashLeft > 0 ? 9 : 0;
    },
  };
}
