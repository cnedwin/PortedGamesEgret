// Body measurements and outline builders shared by the character painter and
// the garment painters. Everything is in the 400 x 1000 figure space.
import { sym, tube } from './draw.mjs';

export const FIGURE_W = 400;
export const FIGURE_H = 1040;
export const CX = 200;

/** Body measurements (half widths) for the two builds. */
export function metrics(sex) {
  return sex === 'm'
    ? { sex, nw: 16, sh: 82, bust: 62, waist: 51, hip: 54, armU: 17, armL: 13, wrist: 9, thigh: 27, knee: 18, calf: 19, ankle: 12 }
    : { sex, nw: 13, sh: 64, bust: 48, waist: 35, hip: 53, armU: 13, armL: 10, wrist: 7.5, thigh: 26, knee: 16, calf: 16, ankle: 9.5 };
}

const PROFILE_Y = [254, 292, 320, 396, 462, 506];

/** Half width of the torso at height y, with `ease` extra room for clothes. */
export function halfWidth(B, y, ease = 0) {
  const w = [B.sh, B.bust + 3, B.bust, B.waist, B.hip, B.hip - 1];
  if (y <= PROFILE_Y[0]) return w[0] + ease * 0.6;
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
    [CX - B.sh * 0.62, 243],
    [CX - B.sh - ease * 0.6, 257],
  ];
  for (const y of [292, 320, 396, 462]) if (y < hem - 8) half.push([CX - halfWidth(B, y, ease), y]);
  half.push([CX - halfWidth(B, hem, ease) - flare, hem, 1]);
  return sym(half, CX);
}

/** Centre line of an arm; s = -1 is the left of the picture, +1 the right. */
export function armLine(B, s) {
  return [
    [CX + s * (B.sh - 12), 252, B.armU - 2],
    [CX + s * (B.sh - 5), 268, B.armU],
    [CX + s * (B.sh + 2), 390, (B.armU + B.armL) / 2],
    [CX + s * (B.sh + 4), 512, B.wrist],
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
  return [
    [CX + s * B.hip * 0.5, 470, B.thigh],
    [CX + s * B.hip * 0.5, 520, B.thigh],
    [CX + s * B.hip * 0.47, 700, B.knee],
    [CX + s * B.hip * 0.45, 785, B.calf],
    [CX + s * B.hip * 0.42, 895, B.ankle],
  ];
}
