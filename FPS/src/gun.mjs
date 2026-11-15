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
import { flashTexture } from './textures.mjs';

const STEEL = rgb(0x43474d),
  DARK = rgb(0x2b2d30),
  TAN = rgb(0x6f6349),
  SLEEVE = rgb(0x4c543a),
  GLOVE = rgb(0x2a2b2e);

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

function rifleShapes() {
  const body = createBuilder();
  // Receiver, handguard with a rail, barrel and muzzle brake.
  body.box(0, 0, -0.02, 0.044, 0.068, 0.3, { tint: STEEL });
  body.box(0, -0.002, -0.31, 0.046, 0.05, 0.3, { tint: TAN });
  for (let i = 0; i < 5; i++) body.box(0, -0.002, -0.2 - i * 0.055, 0.05, 0.016, 0.03, { tint: DARK });
  body.box(0, 0.04, -0.2, 0.026, 0.012, 0.54, { tint: DARK });
  body.cylinder(0, 0.006, -0.52, 0.01, 0.14, { axis: 'z', sides: 8, tint: DARK });
  body.cylinder(0, 0.006, -0.6, 0.016, 0.06, { axis: 'z', sides: 8, tint: STEEL });
  // Stock with a cheek rest, grip and trigger guard.
  body.box(0, -0.004, 0.2, 0.034, 0.05, 0.18, { tint: DARK });
  body.box(0, -0.03, 0.27, 0.04, 0.1, 0.07, { tint: TAN });
  body.box(0, -0.035, 0.31, 0.044, 0.12, 0.02, { tint: DARK });
  body.box(0, -0.075, 0.075, 0.034, 0.1, 0.042, { tint: DARK, pitch: 0.32 });
  body.box(0, -0.052, 0.005, 0.01, 0.01, 0.085, { tint: DARK });
  // Reflex sight: a base, two posts and a hood; and a front post.
  body.box(0, 0.052, -0.05, 0.038, 0.014, 0.07, { tint: DARK });
  body.box(-0.02, 0.085, -0.05, 0.005, 0.052, 0.045, { tint: DARK });
  body.box(0.02, 0.085, -0.05, 0.005, 0.052, 0.045, { tint: DARK });
  body.box(0, 0.1125, -0.05, 0.045, 0.005, 0.045, { tint: DARK });
  body.box(0, 0.056, -0.44, 0.01, 0.02, 0.01, { tint: DARK });
  // Charging handle, ejection port and selector.
  body.box(0.024, 0.014, -0.02, 0.006, 0.018, 0.07, { tint: rgb(0x6a6e73) });
  body.box(-0.024, -0.012, 0.03, 0.004, 0.012, 0.02, { tint: rgb(0x8a2a20) });
  // A slightly curved magazine: two pieces at different angles.
  const magazine = createBuilder()
    .box(0, -0.045, 0, 0.028, 0.09, 0.058, { tint: DARK, pitch: -0.12 })
    .box(0, -0.115, -0.014, 0.028, 0.07, 0.056, { tint: DARK, pitch: -0.3 });
  // The forearms and gloves that hold it.
  const hands = createBuilder();
  hands.box(0.02, -0.085, 0.085, 0.062, 0.07, 0.08, { tint: GLOVE });
  hands.box(0.085, -0.16, 0.23, 0.07, 0.07, 0.3, { tint: SLEEVE, yaw: -0.36, pitch: -0.45 });
  hands.box(-0.006, -0.04, -0.3, 0.066, 0.05, 0.09, { tint: GLOVE });
  hands.box(-0.115, -0.14, -0.15, 0.062, 0.062, 0.38, { tint: SLEEVE, yaw: 0.56, pitch: -0.42 });
  return { body: body.finish(), magazine: magazine.finish(), hands: hands.finish(), magazineAt: [0, -0.035, -0.07] };
}
function pistolShapes() {
  const body = createBuilder();
  body.box(0, 0.03, -0.03, 0.03, 0.036, 0.2, { tint: STEEL });
  body.box(0, 0.002, -0.02, 0.028, 0.024, 0.16, { tint: DARK });
  body.box(0, -0.055, 0.045, 0.03, 0.11, 0.05, { tint: DARK, pitch: 0.2 });
  body.box(0, 0.052, 0.055, 0.02, 0.008, 0.012, { tint: DARK });
  body.box(0, 0.052, -0.12, 0.006, 0.008, 0.01, { tint: DARK });
  body.box(0, -0.018, -0.02, 0.01, 0.01, 0.06, { tint: DARK });
  const magazine = createBuilder().box(0, -0.06, 0, 0.022, 0.11, 0.036, { tint: STEEL, pitch: 0.2 });
  const hands = createBuilder();
  hands.box(0.012, -0.06, 0.05, 0.075, 0.1, 0.085, { tint: GLOVE });
  hands.box(-0.035, -0.07, 0.035, 0.06, 0.09, 0.08, { tint: GLOVE });
  hands.box(0.09, -0.13, 0.22, 0.085, 0.085, 0.34, { tint: SLEEVE, yaw: -0.3, pitch: -0.3 });
  hands.box(-0.12, -0.13, 0.2, 0.08, 0.08, 0.34, { tint: SLEEVE, yaw: 0.42, pitch: -0.3 });
  return { body: body.finish(), magazine: magazine.finish(), hands: hands.finish(), magazineAt: [0, -0.005, 0.045] };
}

/** Add the weapons under `camera` and return the object that animates them. */
export function createGun(camera) {
  const metal = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.5, metallic: 0.25 });
  const cloth = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.9 });
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
    createUnlitMaterial3D({ color: 0xff2a1a, blending: 'additive', depthWrite: false, toneMapped: false }),
  );
  dot.setPosition(0, 0.0835, -0.05);
  dot.setScale(0.0035);
  dot.frustumCulled = false;
  models.rifle.node.addChild(dot);

  // Muzzle flash: two crossed cards and a brief light.
  const flashMaterial = createUnlitMaterial3D({
    color: 0xffffff,
    map: flashTexture(),
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
