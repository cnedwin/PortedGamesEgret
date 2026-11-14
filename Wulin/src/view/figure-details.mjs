import { createGeometry3D } from '@egret/engine/world3d';
import { BALL, BOX, ROD, beam, grad, mix, shade } from './shapes.mjs';

const BRASS = 0xb99a60;
const STEEL = 0xadbfc5;
const EDGE = 0xe4e7de;
const WOOD = 0x735342;
const TAU = Math.PI * 2;

// Flat planes on opposite sides of a convex lozenge form the bevel of weapons,
// and also the angled edge of a hair lock or a projecting cloth fold.
const LOZENGE = createGeometry3D({
  positions: [0, -.5, 0, -.5, -.22, 0, -.42, .26, 0, 0, .5, 0, .42, .26, 0, .5, -.22, 0, 0, -.08, .5, 0, -.08, -.5],
  indices: [0, 6, 1, 1, 6, 2, 2, 6, 3, 3, 6, 4, 4, 6, 5, 5, 6, 0, 0, 1, 7, 1, 2, 7, 2, 3, 7, 3, 4, 7, 4, 5, 7, 5, 0, 7],
  computeNormals: true,
});

export function dressDetails(cloth, rig, style) {
  const { body, chest, armL, armR, legL, legR, clothFront, clothBack } = rig;
  const { w, cut, rank, outer, inner, trim, belt, ink } = style;
  const sash = [
    [ROD, [0, .031, .002], [.169 * w, .073, .131 * w], grad(belt, .76, 1.18)],
    [ROD, [0, .009, .002], [.172 * w, .014, .133 * w], shade(belt, .67)],
    [ROD, [0, .059, .002], [.172 * w, .014, .133 * w], mix(belt, trim, .57)],
    [BALL, [.018 * w, .032, .135 * w], [.034, .027, .019], trim],
    [BALL, [.018 * w, .032, .148 * w], [.017, .013, .012], cut === 'petals' ? 0x6fa697 : ink],
  ];
  const torso = [];
  if (cut === 'kasaya' || cut === 'lotus') {
    // The patched kasaya falls from the left shoulder. Beads frame the two collars.
    const wrap = cut === 'kasaya' ? 0x8d4931 : 0x8e3447;
    torso.push([BOX, [.024 * w, .255, .141 * w], [.128 * w, .347, .013], grad(wrap), [.10, -.13, -.53]]);
    for (let index = 0; index < 5; index++) {
      torso.push([BOX, [(.092 - index * .037) * w, .39 - index * .062, .153 * w], [.092 * w, .046, .010], index % 2 ? wrap : mix(wrap, trim, .53), [.10, -.13, -.53]]);
    }
    const beads = rank >= 4 ? 10 : 7;
    for (let index = 0; index < beads; index++) {
      const angle = .21 + index * (Math.PI - .42) / (beads - 1);
      const x = Math.cos(angle) * .105 * w, y = .456 - Math.sin(angle) * .203;
      torso.push([BALL, [x, y, (.106 + .05 * Math.sin(angle)) * w], rank >= 4 ? .022 : .014, grad(index % 4 === 1 ? 0x815c42 : 0x48302a)]);
    }
    sash.push([BOX, [-.08 * w, -.087, .126 * w], [.032, .20, .012], wrap, [.14, 0, -.16]]);
  }
  if (cut === 'lamellar') {
    // Bright fur picks out the shoulder silhouette over the horizontal armor plates.
    for (const sign of [-1, 1]) {
      torso.push([BALL, [sign * .162 * w, .402, -.034], [.114 * w, .071, .112], grad(inner, .66, 1.15)]);
      for (let i = 0; i < 4; i++) {
        torso.push([LOZENGE, [sign * (.143 + i * .027) * w, .39 + .024 * Math.sin(i), .045], [.075, .156, .04], shade(inner, .87 + i * .08), [-.65, .18 * sign, .31 * sign]]);
      }
    }
    for (let row = 0; row < 3; row++) {
      for (let col = -2; col <= 2; col++) {
        torso.push([BOX, [col * .058 * w, .17 + row * .064, (.149 - Math.abs(col) * .007) * w], [.055 * w, .061, .018], shade(outer, .78 + row * .17), [0, col * .14, 0]]);
      }
    }
  }
  if (cut === 'patchwork' || cut === 'herbal') {
    const gourd = cut === 'patchwork' ? 0xa57639 : 0xb59955;
    sash.push([BALL, [-.182 * w, -.109, .076], [.058, .076, .047], grad(gourd)], [BALL, [-.174 * w, -.045, .076], [.039, .044, .033], grad(gourd)], [ROD, [-.169 * w, -.016, .076], [.019, .024, .016], shade(gourd, .65)]);
    if (cut === 'patchwork') {
      torso.push([BOX, [-.095 * w, .20, .138 * w], [.087, .094, .013], 0x9d8262, [.14, -.17, .17]], [BOX, [-.092 * w, .25, .139 * w], [.082, .009, .013], 0x514438, [.14, -.17, .17]]);
      if (rank >= 4) torso.push([BALL, [.089 * w, .31, -.118 * w], [.195, .205, .046], grad(0x90744a), [.19, .21, 0]], [ROD, [.087 * w, .32, -.146 * w], [.148, .019, .153], 0xa48a59, [Math.PI / 2, .15, .16]]);
    } else {
      torso.push([BOX, [.038 * w, .22, .137 * w], [.047, .32, .015], 0xa28758, [0, -.13, -.55]]);
      sash.push([BOX, [.162 * w, -.103, -.045], [.119, .167, .113], grad(0x8e7345), [0, .15, .17]]);
    }
  }
  if (cut === 'river') {
    for (let index = 0; index < 4; index++) {
      torso.push([BOX, [.021 * w, .17 + .052 * index, .145 * w], [.093, .012, .009], 0xad9170, [0, 0, -.1]], [BALL, [.063 * w, .17 + .052 * index, .146 * w], .012, trim]);
    }
  }
  if (cut === 'hidden' || cut === 'flame') {
    torso.push([BOX, [.002, .209, .141 * w], [.112 * w, .192, .016], grad(shade(ink, 1.2)), [-.14, 0, .12]], [LOZENGE, [.004, .287, .154 * w], [.105, .11, .022], trim]);
    if (cut === 'hidden') for (const sign of [-1, 1]) {
      sash.push([BOX, [sign * .155 * w, -.081, .087], [.073, .18, .032], shade(ink, 1.12), [.1, sign * .28, sign * .24]]);
      for (let index = 0; index < 3; index++) sash.push([LOZENGE, [sign * (.133 + index * .018) * w, -.092, .107], [.022, .127, .012], STEEL, [.1, sign * .28, sign * .17]]);
    }
  }
  if (cut === 'petals' || cut === 'priest') {
    sash.push([BALL, [-.105 * w, -.075, .137 * w], [.029, .039, .016], cut === 'petals' ? 0x679f8f : trim], [BOX, [-.105 * w, -.151, .136 * w], [.019, .12, .012], inner, [.11, 0, .09]]);
  }
  // Across the torso use broad color planes that still read at the arena camera distance.
  const hasMantle = rank >= 4 || cut === 'mantle' || cut === 'flame' || cut === 'lamellar' || cut === 'petals';
  if (hasMantle) {
    const cape = cut === 'mantle' ? mix(outer, inner, .21) : cut === 'lamellar' ? shade(outer, .75) : outer;
    for (const sign of [-1, 1]) {
      torso.push([LOZENGE, [sign * .141 * w, .36, -.025], [.214 * w, .176, .248], grad(cape, .68, 1.17), [.15, .08 * sign, .52 * sign]], [BALL, [sign * .117 * w, .351, .124 * w], [.021, .023, .011], trim]);
      const columns = sign < 0 ? [0, .12, .45, .76, .93, 1] : [1, .93, .76, .45, .12, 0];
      const skirtLine = cut === 'mantle' ? -.064 : cut === 'flame' ? .12 : cut === 'petals' ? -.08 : .035;
      const hem = rank >= 4 ? style.hem + skirtLine : .71;
      const mantleWidth = cut === 'flame' || cut === 'mantle' ? .35 : cut === 'petals' ? .32 : .28;
      cloth.panel([
        [hem, mantleWidth, -.237, [[body, .11], [clothBack, .89]]],
        [hem + .035, mantleWidth, -.241, [[body, .11], [clothBack, .89]]],
        [.86, .257, -.210, [[chest, .24], [body, .26], [clothBack, .50]]],
        [1.22, .228, -.151, [[chest, .94], [clothBack, .06]]],
        [1.42, .162, -.105, [[chest, 1]]],
      ].map(([y, width, depth, shares], row) => columns.map((t) => {
        const wave = row < 3 ? Math.sin(t * TAU * 1.26) * .028 * (1 - row * .22) : 0;
        const x = sign * width * w * t;
        const color = row === 1 || t === .93 ? mix(trim, cape, .45) : shade(cape, t === .45 ? 1.15 : .80 + .21 * t);
        const trailingEdge = row < 2 ? wave * 1.75 + (cut === 'mantle' || cut === 'flame' ? sign * .044 + t * .115 : .044 * t) : 0;
        return [[x, y + trailingEdge, depth + t * t * .057 + wave], color, shares, shade(mix(cape, inner, .48), .66)];
      })), [-1, 1]);
    }
  }
  // Two trailing ends of the belt move on the front cloth joint.
  for (const sign of [-1, 1]) {
    const ribbon = cut === 'river' || cut === 'patchwork' ? belt : trim;
    const width = rank >= 3 ? .037 : .024;
    const mid = sign * .035;
    cloth.panel([
      [.565 + sign * .047, mid + sign * .04, .179 * w, [[body, .15], [clothFront, .85]]],
      [.727, mid + sign * .035, .179 * w, [[body, .24], [clothFront, .76]]],
      [.852, mid * 1.6, .163 * w, [[body, .62], [clothFront, .38]]],
      [.956, .024 + mid * .17, .139 * w, [[body, 1]]],
    ].map(([y, center, z, shares], index) => [
      [[center - width * .55, y, z], shade(ribbon, .68), shares],
      [[center, y + (index ? 0 : .02), z + .013], ribbon, shares],
      [[center + width * .55, y, z - .008], shade(ribbon, .83), shares],
    ]));
  }
  cloth.rigid(body, sash);
  cloth.rigid(chest, torso);
  // Wrist wraps and tall boots also provide distinct rank and school silhouettes.
  for (const { shoulder, elbow } of [armL, armR]) {
    if (cut === 'lamellar' || cut === 'hidden' || cut === 'flame') {
      cloth.rigid(elbow, [[LOZENGE, [0, -.22, -.038], [.089, .17, .034], grad(ink, .81, 1.25)], [LOZENGE, [0, -.218, -.052], [.023, .143, .008], trim]]);
    } else if (cut === 'river' || cut === 'patchwork') {
      cloth.rigid(elbow, [-.29, -.258, -.226].map((y) => [ROD, [0, y, .004], [.041, .014, .042], shade(inner, .74), [0, 0, shoulder.position[0] > 0 ? -.18 : .18]]));
    }
  }
  if (cut === 'lamellar' || cut === 'hidden' || cut === 'flame') for (const { knee } of [legL, legR]) {
    cloth.rigid(knee, [[LOZENGE, [0, -.28, .054], [.09, .204, .03], grad(ink, .74, 1.24)], [LOZENGE, [0, -.275, .069], [.026, .143, .012], trim]]);
  }
}

export function headDetails(cloth, head, style, quality) {
  const { hair, skin, trim, ink, outer, inner, shaved, female, rank, cut, beard, hairStyle } = style;
  const face = [];
  const black = 0x302127;
  for (const sign of [-1, 1]) {
    face.push([BALL, [sign * .09, .119, .003], [.020, .033, .021], grad(skin, .75, 1.04)]);
    face.push([LOZENGE, [sign * .039, .139, .086], [.060, .021, .014], black, [0, sign * .28, sign * .10]]);
    face.push([LOZENGE, [sign * .039, .137, .094], [.037, .010, .006], 0xd9c9b8, [0, sign * .28, sign * .10]]);
    face.push([BOX, [sign * .035, .138, .099], [.014, .013, .006], 0x48312a, [0, sign * .24, 0]]);
    face.push([LOZENGE, [sign * .040, .160, .092], [.061, female ? .015 : .020, .012], shaved ? mix(hair, black, .3) : hair, [0, sign * .28, sign * (female ? -.05 : -.13)]]);
  }
  face.push([LOZENGE, [0, .112, .101], [.034, .064, .030], grad(skin, .83, 1.06), [-.24, 0, 0]], [LOZENGE, [0, .076, .096], [.050, female ? .012 : .010, .01], female ? 0xa86560 : shade(skin, .65)]);
  if (!shaved) {
    const top = [[0, .142, -.039, .095, .070, shade(hair, .66)], [0, .193, -.013, .106, .099, hair], [0, .231, -.018, .084, .084, shade(hair, 1.14)], [0, .259, -.031, .047, .060, shade(hair, 1.27)]];
    cloth.tube(top.map(([x, y, z, rx, rz, color]) => [x, y + 1.52, z, rx, rz, color, [[head, 1]]]), quality === 'low' ? 10 : 14);
    const swept = female || hairStyle === 'loose';
    for (const sign of [-1, 1]) {
      face.push([LOZENGE, [sign * .055, .201, .072], [.094, .115, .064], grad(hair, .72, 1.18), [.23, sign * .47, sign * (swept ? .64 : .34)]]);
      face.push([LOZENGE, [sign * .09, swept ? .128 : .151, .042], [.046, swept ? .159 : .115, .057], grad(hair, .61, 1.17), [-.13, sign * .38, sign * .23]]);
      if (swept) face.push([LOZENGE, [sign * .079, .079, -.061], [.074, .215, .073], grad(hair, .68, 1.12), [.3, sign * .29, sign * .24]]);
    }
    const high = hairStyle === 'crown' ? .289 : .266;
    face.push([BALL, [.011, high, -.059], [.053, .056, .057], grad(hair, .71, 1.17)], [ROD, [.011, high - .023, -.054], [.047, .024, .049], rank >= 3 ? trim : shade(outer, 1.17)]);
    if (rank >= 4 || female) face.push(beam([-.054, high + .004, -.059], [.075, high + .042, -.062], .008, trim), [BALL, [.075, high + .041, -.062], .015, cut === 'petals' ? 0xb3949a : trim]);
    if (hairStyle === 'braid') {
      face.push([LOZENGE, [.060, .065, -.13], [.071, .25, .071], grad(hair, .78, 1.19), [.26, -.07, .3]], [LOZENGE, [.111, -.108, -.124], [.054, .201, .056], grad(hair, .65, 1.15), [-.18, .02, .22]], [BALL, [.121, -.174, -.121], .019, trim]);
    } else if (hairStyle === 'loose') {
      face.push([LOZENGE, [-.044, -.025, -.128], [.122, .284, .07], grad(hair, .67, 1.23), [.44, .04, -.24]]);
    } else if (rank <= 1) face.push([ROD, [0, .176, -.009], [.108, .017, .099], shade(outer, 1.15), [.11, 0, -.05]]);
    if (cut === 'river' && rank >= 3) face.push([LOZENGE, [.02, .108, -.166], [.078, .225, .035], shade(inner, .85), [.27, .16, .32]]);
  } else if (quality !== 'low') {
    for (const x of [-.026, 0, .026]) face.push([BOX, [x, .222, .073], [.01, .009, .008], shade(skin, .58), [.23, 0, 0]]);
  }
  if (beard !== 'none') {
    const long = beard === 'long', full = beard === 'full';
    for (const sign of [-1, 1]) {
      face.push([LOZENGE, [sign * .026, .076, .105], [.069, .024, .017], hair, [0, sign * .30, sign * .38]]);
      face.push([LOZENGE, [sign * .057, .057, .064], [full ? .065 : .050, full ? .10 : .065, .051], grad(hair, .70, 1.13), [.13, sign * .30, sign * .20]]);
    }
    face.push([LOZENGE, [0, long ? -.037 : .038, .090], [long ? .104 : full ? .103 : .069, long ? .235 : full ? .11 : .072, .050], grad(hair, .66, 1.14), [.18, 0, .06]]);
    if (long) face.push([LOZENGE, [.019, -.065, .102], [.058, .222, .024], shade(hair, 1.13), [.20, 0, -.1]]);
  }
  cloth.rigid(head, face);
}

export function limbDetails(cloth, rig, { skin, ink, trim, cut }, weapon) {
  const { armL, armR, legL, legR } = rig;
  for (const arm of [armL, armR]) {
    const hand = arm === armR && weapon ? -.319 : -.342;
    cloth.rigid(arm.elbow, [[BALL, [0, hand, .007], [.038, .046, .032], grad(skin, .78, 1.02)], [LOZENGE, [arm === armL ? .028 : -.028, hand - .007, .021], [.026, .065, .027], grad(skin, .80, 1.05), [0, 0, arm === armL ? .48 : -.48]]]);
  }
  const wrap = cut === 'kasaya' || cut === 'lotus';
  const boot = wrap ? 0x675444 : shade(ink, .76);
  for (const { knee } of [legL, legR]) {
    const parts = [[LOZENGE, [0, -.421, .039], [.103, .209, .081], grad(boot, .66, 1.18), [Math.PI / 2, 0, 0]], [BOX, [0, -.44, .045], [.102, .02, .175], wrap ? 0xb4a283 : shade(ink, .52)], [LOZENGE, [0, -.399, .088], [.084, .112, .032], wrap ? 0x9a8468 : shade(boot, 1.23), [Math.PI / 2, 0, 0]]];
    const binding = wrap ? 0xbdae91 : shade(trim, .72);
    for (const [i, y] of [-.32, -.28, -.24].entries()) parts.push([BOX, [0, y, .047], [.093, .012, .019], binding, [0, 0, i % 2 ? .23 : -.23]]);
    cloth.rigid(knee, parts);
  }
}

export function weaponDetails(slot, { trim, ink, outer, cut }) {
  const grip = 0x3e3333;
  const copper = mix(trim, BRASS, .58);
  switch (slot) {
    case 'sword':
      return [[LOZENGE, [0, .486, 0], [.065, .86, .037], grad(STEEL, .71, 1.25)], [LOZENGE, [0, .51, .015], [.025, .79, .016], EDGE], [LOZENGE, [0, .115, 0], [.19, .059, .054], copper], [ROD, [0, 0, 0], [.024, .175, .024], grip], [BALL, [0, -.092, 0], .036, copper]];
    case 'saber':
      return [[LOZENGE, [0, .436, .018], [.046, .75, .136], grad(STEEL, .69, 1.19), [.08, 0, 0]], [LOZENGE, [0, .58, .05], [.026, .59, .108], EDGE, [-.14, 0, 0]], [ROD, [0, .093, 0], [.078, .031, .083], copper], [ROD, [0, 0, 0], [.026, .18, .026], grip], [BALL, [0, -.09, 0], .035, copper]];
    case 'spear':
      return [[ROD, [0, .49, 0], [.021, 1.91, .021], grad(WOOD)], [ROD, [0, 1.36, 0], [.034, .22, .033], copper], [LOZENGE, [0, 1.613, 0], [.092, .38, .044], grad(STEEL, .7, 1.2)], [LOZENGE, [0, 1.61, .018], [.025, .29, .013], EDGE], [LOZENGE, [.044, 1.337, .01], [.13, .35, .04], outer, [.30, 0, .28]], [ROD, [0, -.431, 0], [.028, .078, .028], copper]];
    case 'staff': {
      const parts = [[ROD, [0, .445, 0], [.027, 1.91, .027], grad(WOOD)], [ROD, [0, 1.36, 0], [.041, .098, .041], copper], [ROD, [0, -.48, 0], [.041, .099, .041], copper], [ROD, [0, .052, 0], [.032, .195, .031], grip]];
      if (cut === 'kasaya' || cut === 'lotus') {
        parts.push([LOZENGE, [0, 1.53, 0], [.137, .30, .046], copper], [BALL, [0, 1.54, .015], [.044, .053, .026], shade(outer, 1.2)]);
      }
      return parts;
    }
    case 'stylus':
      return [[ROD, [0, .108, 0], [.022, .32, .022], ink], [LOZENGE, [0, .28, 0], [.046, .11, .042], STEEL], [ROD, [0, .059, 0], [.026, .038, .026], copper]];
    case 'dart':
      return [[LOZENGE, [0, .118, .009], [.073, .258, .026], grad(STEEL, .71, 1.22)], [BOX, [0, .029, .019], [.041, .072, .021], grip]];
    default:
      return [];
  }
}
