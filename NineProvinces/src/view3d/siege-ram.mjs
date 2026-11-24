import { siegeBuilder, SIEGE_COLORS as C } from './siege-kit.mjs';

const FORWARD = [Math.PI / 2, 0, 0];
const AXLE = [0, 0, Math.PI / 2];
const ROOF_PITCH = .41;

function striker({ block, round, cloth }, detail) {
  round(C.timber, [0, .35, .18], .07, .07, 1.08, detail ? 10 : 8, FORWARD);
  round(C.darkWood, [0, .35, -.36], .066, .075, .06, 8, FORWARD);
  for (const z of [-.245, .45]) {
    round(C.rope, [0, .35, z], .077, .077, .052, 8, FORWARD);
    if (detail) round(C.hide, [0, .35, z + .022], .08, .08, .008, 8, FORWARD);
  }
  // Faceted collar and silver face read against the dark opening under the roof.
  round(C.iron, [0, .35, .67], .108, .08, .13, 8, FORWARD);
  round(C.ironEdge, [0, .35, .748], .09, .108, .035, 8, FORWARD);
  round(C.iron, [0, .35, .781], .06, .093, .055, 8, FORWARD);
  for (const side of [-1, 1]) {
    if (detail) round(C.bronze, [side * .094, .35, .676], .016, .016, .015, 5, AXLE);
    cloth(C.flagTrim, [side * .068, .348, -.105], [.014, .043, .075]);
    block(C.darkWood, [side * .052, .398, .495], [.018, .018, .22]);
  }
}

/** Covered ram with a separate timber and metal striker for the battle animation. */
export function siegeRam(detail, includeStriker) {
  const rig = siegeBuilder(detail);
  const { block, round, beam, cloth, wheels } = rig;

  wheels(.33, [-.32, .32], .15);
  for (const side of [-1, 1]) {
    block(C.darkWood, [side * .234, .172, 0], [.106, .115, 1.05]);
    block(C.edgeWood, [side * .235, .237, 0], [.134, .035, 1.045]);
    for (const end of [-1, 1]) {
      const z = end * .399;
      block(C.timber, [side * .239, .411, z], [.076, .415, .076]);
      block(C.iron, [side * .24, .243, z], [.088, .061, .092]);
      block(C.iron, [side * .24, .57, z], [.088, .055, .092]);
      beam(C.darkWood, [side * .243, .27, z], [side * .243, .57, end * .092], .044);
      if (detail) for (const y of [.247, .575]) {
        round(C.bronze, [side * .287, y, z], .013, .013, .014, 5, AXLE);
      }
      beam(C.edgeWood, [side * .285, .624, end * .539], [0, .752, end * .539], .035, .045);
    }
    block(C.darkWood, [side * .238, .601, 0], [.077, .072, 1.015]);
    for (let row = 0; row < 2; row++) {
      block(C.planks[row * 2], [side * .255, .32 + row * .059, -.062], [.037, .052, .52]);
    }

    const slope = [0, 0, -side * ROOF_PITCH];
    block(C.darkWood, [side * .144, .685, 0], [.329, .055, 1.131], slope);
    const panels = detail ? 6 : 3;
    for (let i = 0; i < panels; i++) {
      const z = (i + .5) * 1.11 / panels - .555;
      const material = i % 3 === 1 ? C.linen : i % 3 === 2 ? 0xb3966a : C.hide;
      block(material, [side * .147, .719, z], [.327, .027, 1.11 / panels - .004], slope);
    }
    block(C.edgeWood, [side * .31, .646, 0], [.032, .051, 1.174]);
    cloth(C.flag, [side * .311, .58, -.035], [.016, .117, .49]);
    cloth(C.flagTrim, [side * .313, .52, -.035], [.018, .026, .49]);
    // Rolled canvas ties at the ends, above the wheels.
    for (const z of [-.275, .205]) {
      round(C.rope, [side * .309, .626, z], .02, .02, .145, 6);
    }
  }
  block(C.edgeWood, [0, .781, 0], [.069, .044, 1.175]);
  for (const z of [-.464, .464]) block(C.darkWood, [0, .18, z], [.6, .105, .072]);
  if (includeStriker) striker(rig, detail);
  return rig.finish();
}

export function siegeRamBeam(detail) {
  const rig = siegeBuilder(detail);
  striker(rig, detail);
  return rig.finish();
}
