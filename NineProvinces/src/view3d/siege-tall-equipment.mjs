// Original stylized siege equipment. +z is the front, y=0 is the ground.
// Joined geometry stays in the shared timber/iron and faction-cloth batches.
import { siegeBuilder, SIEGE_COLORS as C } from './siege-kit.mjs';

const plank = index => Array.isArray(C.planks) ? C.planks[index % C.planks.length] : C.planks ?? C.timber;

export const CATAPULT_ARM_PIVOT = Object.freeze([0, .91, -.07]);
// The load's centre relative to the arm pivot at pitch=0. Rotate this point
// by the same local X pitch as the arm before placing a released visual stone.
export const CATAPULT_LOAD_POINT = Object.freeze([0, .295, .68]);
export const TOWER_DECK_PIVOT = Object.freeze([0, 1.2, .445]);
export const TOWER_DECK_PITCH = Object.freeze({ idle: Math.PI / 2, deployed: 0 });
const CATAPULT_REAR = [0, .46, -.49];

/** A protected wheeled assault platform with a visible rear climbing ladder. */
export function siegeTower(detail = true) {
  const b = siegeBuilder(detail);
  b.wheels(.4, [-.35, .35], .135);

  // A broad carriage and layered deck leave daylight between the four posts.
  for (const x of [-.3, .3]) b.block(C.darkWood, [x, .235, 0], [.085, .10, .92]);
  for (const z of [-.35, 0, .35]) b.block(C.edgeWood, [0, .25, z], [.73, .075, .075]);
  for (let i = 0; i < 7; i++) b.block(plank(i), [(i - 3) * .095, .31, 0], [.087, .045, .78]);

  for (const x of [-.29, .29]) {
    for (const z of [-.29, .29]) {
      b.block(C.timber, [x, .76, z], [.065, 1.0, .065]);
      b.block(C.iron, [x, .42, z], [.075, .065, .075]);
    }
    b.beam(C.edgeWood, [x, .35, -.29], [x, 1.08, .29], .045);
    b.beam(C.darkWood, [x, .35, .29], [x, 1.08, -.29], .035);
    b.block(C.timber, [x, 1.1, 0], [.085, .09, .79]);
  }
  for (let i = 0; i < 8; i++) b.block(plank(i + 1), [(i - 3.5) * .087, 1.17, 0], [.08, .055, .78]);
  for (const z of [-.32, .32]) b.block(C.edgeWood, [0, 1.11, z], [.72, .08, .065]);

  // The front is a planked and hide-covered shield; openings remain above it.
  for (let i = 0; i < 7; i++) b.block(plank(i + 2), [(i - 3) * .1, 1.31, .375], [.092, .24, .045]);
  b.block(C.darkWood, [0, 1.21, .398], [.75, .045, .055]);
  b.block(C.edgeWood, [0, 1.43, .398], [.75, .045, .055]);
  b.block(C.hide, [0, 1.31, .405], [.43, .14, .018]);
  for (const x of [-.34, -.16, .16, .34]) b.block(C.edgeWood, [x, 1.48, .37], [.035, .15, .045]);
  b.block(C.timber, [0, 1.56, .37], [.75, .055, .065]);

  // Side parapets, with separate narrow faction cloth hanging from their rails.
  for (const x of [-.36, .36]) {
    for (const z of [-.3, 0, .3]) b.block(C.timber, [x, 1.35, z], [.045, .35, .045]);
    b.block(C.edgeWood, [x, 1.52, 0], [.055, .055, .72]);
    b.block(C.darkWood, [x, 1.29, 0], [.04, .08, .69]);
    b.cloth(C.flag, [x * 1.04, 1.34, -.02], [.018, .24, .21]);
    b.cloth(C.flagTrim, [x * 1.05, 1.22, -.02], [.02, .025, .21]);
  }

  // Rear ladder: rungs follow the same incline as the two rails.
  const foot = { y: .2, z: -.52 }, top = { y: 1.2, z: -.33 };
  for (const x of [-.18, .18]) b.beam(C.edgeWood, [x, foot.y, foot.z], [x, top.y, top.z], .035);
  for (let i = 1; i <= 8; i++) {
    const t = i / 9;
    b.block(plank(i), [0, foot.y + (top.y - foot.y) * t, foot.z + (top.z - foot.z) * t], [.39, .028, .035]);
  }
  b.block(C.darkWood, [0, 1.22, -.31], [.42, .045, .07]);

  // A short signal pennant keeps the complete silhouette below 1.65 units.
  b.round(C.darkWood, [-.29, 1.49, -.28], .012, .012, .3, 5);
  b.cloth(C.flag, [-.20, 1.56, -.28], [.16, .12, .018]);
  b.cloth(C.flagTrim, [-.20, 1.5, -.28], [.16, .02, .02]);

  if (detail) {
    for (const x of [-.29, .29]) {
      for (const z of [-.29, .29]) {
        b.block(C.ironEdge, [x, 1.1, z], [.078, .1, .078]);
        b.block(C.bronze, [x, 1.1, z + .045], [.022, .022, .015]);
      }
    }
    for (const x of [-.3, -.1, .1, .3]) b.block(C.ironEdge, [x, 1.31, .426], [.027, .027, .012]);
  }
  return b.finish();
}

function catapultBody(b, detail) {
  b.wheels(.4, [-.43, .4], .14);

  // Long paired runners, heavy cross members and a partially planked bed.
  for (const x of [-.3, .3]) b.block(C.darkWood, [x, .245, 0], [.11, .12, 1.23]);
  for (const z of [-.48, -.08, .45]) b.block(C.edgeWood, [0, .26, z], [.78, .09, .09]);
  for (let i = 0; i < 5; i++) b.block(plank(i), [(i - 2) * .095, .325, -.06], [.087, .045, .91]);
  for (const z of [-.52, .5]) b.block(C.iron, [0, .31, z], [.72, .035, .06]);

  // The two A frames carry the transverse pivot and remain open in side view.
  for (const x of [-.265, .265]) {
    b.beam(C.timber, [x, .29, -.39], [x, .91, -.07], .065, .075);
    b.beam(C.edgeWood, [x, .29, .31], [x, .91, -.07], .065, .075);
    b.block(C.darkWood, [x, .54, -.025], [.07, .055, .43]);
    b.block(C.iron, [x, .9, -.07], [.105, .115, .12]);
  }
  b.round(C.darkWood, [0, .91, -.07], .065, .065, .76, 8, [0, 0, Math.PI / 2]);
  for (const x of [-.39, .39]) b.round(C.bronze, [x, .91, -.07], .074, .074, .025, 8, [0, 0, Math.PI / 2]);

  // Rear winding drum and a bent hand crank suggest how the crew tensions it.
  for (const x of [-.24, .24]) b.block(C.timber, [x, .4, -.49], [.055, .25, .06]);
  b.round(C.rope, [0, .44, -.49], .065, .065, .48, 8, [0, 0, Math.PI / 2]);
  b.beam(C.iron, [.29, .44, -.49], [.29, .57, -.49], .023);
  b.beam(C.edgeWood, [.29, .57, -.49], [.43, .57, -.49], .025);
  b.beam(C.rope, [0, .44, -.49], CATAPULT_REAR, .014);

  for (const x of [-.33, .33]) {
    b.cloth(C.flag, [x, .39, .25], [.017, .13, .19]);
    b.cloth(C.flagTrim, [x, .325, .25], [.019, .022, .19]);
  }
  if (detail) {
    for (const x of [-.3, .3]) {
      for (const z of [-.48, .45]) {
        b.block(C.ironEdge, [x, .29, z], [.125, .045, .13]);
        b.block(C.bronze, [x, .318, z], [.025, .015, .025]);
      }
    }
    b.beam(C.rope, [-.26, .86, -.07], [.26, .86, -.07], .018);
    b.beam(C.rope, [-.26, .94, -.07], [.26, .94, -.07], .018);
  }
}

function movingCatapultArm(b) {
  const tip = [0, 1.28, .47];
  b.beam(C.edgeWood, CATAPULT_REAR, tip, .075, .095);
  b.block(C.darkWood, [0, .48, -.47], [.20, .16, .17], [-.72, 0, 0]);
  b.block(C.iron, [0, .91, -.07], [.11, .09, .13], [-.72, 0, 0]);
  for (const x of [-.085, .085]) b.beam(C.rope, tip, [x, 1.125, .61], .012);
  b.block(C.hide, [0, 1.12, .61], [.21, .035, .19], [.08, 0, 0]);
  for (const x of [-.105, .105]) b.block(C.darkWood, [x, 1.15, .61], [.022, .055, .21]);
}

function loadStone(b, position) {
  b.round(0x77746a, position, .07, .09, .13, 7, [0, .28, 0]);
}

/** Preserve the complete realm model; no moving part is duplicated in it. */
export function catapult(detail = true) {
  const b = siegeBuilder(detail);
  catapultBody(b, detail);
  movingCatapultArm(b);
  loadStone(b, [0, 1.205, .61]);
  return b.finish();
}

export function catapultBase(detail = true) {
  const b = siegeBuilder(detail);
  catapultBody(b, detail);
  return b.finish();
}

/** Arm and empty sling in pivot-local coordinates; positive X pitch lowers it. */
export function catapultArm(detail = true) {
  const b = siegeBuilder(detail);
  const local = point => point.map((value, i) => value - CATAPULT_ARM_PIVOT[i]);
  movingCatapultArm({
    block: (color, position, scale, rotation) => b.block(color, local(position), scale, rotation),
    beam: (color, from, to, width, depth) => b.beam(color, local(from), local(to), width, depth)
  });
  return b.finish();
}

/** A shared visual projectile, centred at its own origin, with no dyed surface. */
export function catapultStone(detail = true) {
  const b = siegeBuilder(detail);
  loadStone(b, [0, 0, 0]);
  return b.finish();
}

/** Short boarding accent, +z unfolded forward; rotate local X using the pitches above. */
export function towerBoardingDeck(detail = true) {
  const b = siegeBuilder(detail);
  const boards = detail ? 7 : 5;
  for (let i = 0; i < boards; i++) {
    const width = .54 / boards;
    b.block(plank(i), [(i + .5) * width - .27, 0, .3], [width - .006, .035, .6]);
  }
  for (const x of [-.225, .225]) b.block(C.darkWood, [x, -.038, .3], [.045, .045, .62]);
  for (const z of [.05, .3, .55]) b.block(C.iron, [0, .025, z], [.54, .018, .027]);
  if (detail) {
    for (const x of [-.225, .225]) {
      for (const z of [.05, .55]) b.block(C.bronze, [x, .038, z], [.018, .012, .018]);
    }
  }
  return b.finish();
}
