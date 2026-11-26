// Body measurements and outline builders shared by the character painter and
// the garment painters. All clothing uses the same joints in 400 × 1040 figure space.
import { sym, tube } from './draw.mjs';

export const FIGURE_W = 400;
export const FIGURE_H = 1040;
export const CX = 200;

/** Body measurements (half widths) for the two builds. */
export function metrics(sex) {
  return sex === 'm'
    ? { sex, nw: 13, sh: 75, bust: 70, waist: 61, hip: 63, armU: 16, armL: 12, wrist: 8, thigh: 28, knee: 21, calf: 22, ankle: 12 }
    : { sex, nw: 11, sh: 63, bust: 55, waist: 43, hip: 58, armU: 13, armL: 10, wrist: 7, thigh: 26, knee: 18, calf: 19, ankle: 10 };
}

const PROFILE_Y = [271, 302, 332, 399, 462, 506];

/** Half width of the torso at height y, with `ease` extra room for clothes. */
export function halfWidth(B, y, ease = 0) {
  const w = [B.sh - 4, B.bust + 2, B.bust, B.waist, B.hip, B.hip - 1];
  if (y <= PROFILE_Y[0]) return w[0] + ease * 0.75;
  for (let i = 1; i < PROFILE_Y.length; i++) {
    if (y <= PROFILE_Y[i]) {
      const t = (y - PROFILE_Y[i - 1]) / (PROFILE_Y[i] - PROFILE_Y[i - 1]);
      return w[i - 1] + (w[i] - w[i - 1]) * t + ease * (i === 1 ? 0.6 + 0.4 * t : 1);
    }
  }
  return w[5] + ease;
}

/** Closed outline of the torso from the neck down to `hem`. */
export function torsoPoints(B, { ease = 0, hem = 506, neck = 236, flare = 0 } = {}) {
  const half = [
    [CX - B.nw - ease * 0.2, neck],
    [CX - B.sh * .46, neck + 8],
    [CX - B.sh * .79 - ease * .45, 257],
    [CX - B.sh - ease * .7, 272],
  ];
  for (const y of [302, 332, 399, 462]) if (y < hem - 8) half.push([CX - halfWidth(B, y, ease), y]);
  half.push([CX - halfWidth(B, hem, ease) - flare, hem, 1]);
  return sym(half, CX);
}

/** Centre line of an arm; s = -1 is the left of the picture, +1 the right. */
export function armLine(B, s) {
  const relaxed = s > 0 ? 3 : 0;
  return [
    [CX + s * (B.sh - 17), 254, B.armU * .52],
    [CX + s * (B.sh - 9), 280, B.armU],
    [CX + s * (B.sh + 4 + relaxed), 386, (B.armU + B.armL) / 2],
    [CX + s * (B.sh + relaxed), 514 + relaxed, B.wrist],
  ];
}

/** Sleeve outline covering the arm down to fraction `len` of its length. */
export function sleevePoints(B, s, len, ease = 4, cuff = 0) {
  const line = armLine(B, s),
    out = [line[0], line[1]];
  const a = line[1],
    b = line[2],
    c = line[3];
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  if (len <= 0.5) out.push(lerp(a, b, len / 0.5));
  else out.push(b, lerp(b, c, (len - 0.5) / 0.5));
  const pts = out.map(([x, y, w], i) => [x, y, w + ease + (i === out.length - 1 ? cuff : 0)]);
  return tube(pts);
}

export function legLine(B, s) {
  const relaxed = s > 0 ? 3 : 0;
  return [
    [CX + s * B.hip * .49, 470, B.thigh],
    [CX + s * B.hip * .50, 530, B.thigh],
    [CX + s * (B.hip * .46 + relaxed), 682, B.knee],
    [CX + s * (B.hip * .51 + relaxed), 765, B.calf],
    [CX + s * (B.hip * .54 + relaxed), 895, B.ankle],
  ];
}

// The foot opens away from the centre line in a relaxed stance. Skin, hosiery
// and shoes must use the same ankle and floor line.
export function footAnchor(B, s) {
  const [x, y, ankle] = legLine(B, s).at(-1);
  return { x, y, ankle, ground: 942, toe: (B.sex === 'm' ? 24 : 22) - (s > 0 ? 3 : 0) };
}

export function footOutline(B, s) {
  const { x, y, ankle, ground, toe } = footAnchor(B, s);
  return [
    [-ankle + 1, y - 6], [-ankle + 1, y + 17], [-ankle + 3, ground - 4],
    [3, ground], [toe - 1, ground - 1], [toe + 1, ground - 7],
    [toe - 7, ground - 14], [ankle - 1, y + 13], [ankle - 1, y - 6],
  ].map(([offset, py]) => [x + s * offset, py]);
}
