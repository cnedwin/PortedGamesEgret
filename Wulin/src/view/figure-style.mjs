import { mix, shade } from './shapes.mjs';

const INK = 0x202629;
const BRASS = 0xb39762;

// Robe, inner layer, binding and the cut of each school. The color of the
// fighting side is still shown independently by the arena HUD and health bar.
const SCHOOL_DRESS = {
  shaolin:    { outer: 0xbb8236, inner: 0xdbccb1, trim: 0xbf9b55, belt: 0x6e3025, cut: 'kasaya', sleeve: 1.14, hem: .27, broad: 1.07 },
  wudang:     { outer: 0x384f78, inner: 0xc4c1bd, trim: 0xb29869, belt: 0x302936, cut: 'priest', sleeve: 1.16, hem: .27 },
  emei:       { outer: 0x6a8d76, inner: 0xe4d6b7, trim: 0xbfb17b, belt: 0x364c43, cut: 'petals', sleeve: 1.02, hem: .24, broad: .95 },
  huashan:    { outer: 0x495971, inner: 0xbbaca0, trim: 0xb49a6c, belt: 0x4a3730, cut: 'mantle', sleeve: .83, hem: .31 },
  gaibang:    { outer: 0x866444, inner: 0xb8a37d, trim: 0xab8659, belt: 0x822f29, cut: 'patchwork', sleeve: .78, hem: .49, broad: 1.12 },
  mingjiao:   { outer: 0xa43f36, inner: 0x303035, trim: 0xc49a53, belt: 0x352a27, cut: 'flame', sleeve: .81, hem: .29, broad: 1.06 },
  kunlun:     { outer: 0x546e88, inner: 0xc6bca8, trim: 0xa59166, belt: 0x463c37, cut: 'lamellar', sleeve: .98, hem: .34, broad: 1.12 },
  caobang:    { outer: 0x3e6d75, inner: 0xb7b29c, trim: 0x93b7b3, belt: 0x763c34, cut: 'river', sleeve: .73, hem: .48, broad: .98 },
  yaowang:    { outer: 0x68743a, inner: 0xe0d2a9, trim: 0xbba575, belt: 0x474f35, cut: 'herbal', sleeve: 1.15, hem: .27 },
  chongsheng: { outer: 0x81384b, inner: 0xc39543, trim: 0xc6a260, belt: 0x4d2e37, cut: 'lotus', sleeve: 1.16, hem: .28 },
  quanzhen:   { outer: 0x48465f, inner: 0xb5b6c0, trim: 0x9ca1bd, belt: 0x3b373b, cut: 'priest', sleeve: 1.2, hem: .29 },
  tangmen:    { outer: 0x674a78, inner: 0x302a37, trim: 0xa4789e, belt: 0x362932, cut: 'hidden', sleeve: .69, hem: .35, broad: .98 },
};

const PORTRAIT_DETAILS = {
  'leader-shaolin': { beard: 'long', hair: 0xdcd3c4 },
  'elder-shaolin-teaching': { beard: 'none', broad: 1.13 },
  'leader-huashan': { beard: 'short', hair: 0x302c34, hairStyle: 'loose' },
  'elder-huashan-teaching': { beard: 'short', hair: 0x999295, hairStyle: 'loose' },
  'leader-wudang': { beard: 'long', hair: 0xd5cbd0 },
  'leader-gaibang': { beard: 'full', broad: 1.18, hairStyle: 'loose' },
  'leader-mingjiao': { beard: 'short', hair: 0x29282d, hairStyle: 'crown' },
  'leader-kunlun': { beard: 'full', broad: 1.18, hairStyle: 'loose' },
  'leader-caobang': { hairStyle: 'braid' },
  'leader-yaowang': { beard: 'long', hair: 0xdad1bd },
  'leader-chongsheng': { beard: 'none' },
  'leader-quanzhen': { beard: 'long', hair: 0x70686d },
  'leader-emei': { hairStyle: 'braid' },
  'leader-tangmen': { hairStyle: 'braid' },
};

export function figureStyle({ color, school, female, rank, monk, age, seed, portraitId }) {
  const dress = SCHOOL_DRESS[school] ?? { outer: color, inner: 0xb7ad98, trim: BRASS, belt: 0x514239, cut: monk ? 'kasaya' : 'mantle', sleeve: .93, hem: .38 };
  const named = PORTRAIT_DETAILS[portraitId];
  const ageYears = age ?? (rank >= 4 ? 51 : 29);
  const grey = Math.max(0, Math.min(1, (ageYears - 44) / 34));
  const outer = mix(dress.outer, rank === 0 ? 0x85796a : (seed % 2 ? 0x262737 : 0x897264), rank === 0 ? .27 : .12);
  const trim = rank >= 4 ? mix(dress.trim, BRASS, .24) : shade(dress.trim, .87);
  const shaved = monk || dress.cut === 'kasaya' || dress.cut === 'lotus';
  return {
    ...dress, outer, trim, female, rank, shaved,
    w: (female ? .88 : 1) * (named?.broad ?? dress.broad ?? 1) * (.95 + (seed % 7) * .015),
    height: (female ? .981 : 1) * (.957 + (seed % 13) * .008),
    skin: mix(seed % 3 === 0 ? 0xc59676 : 0xe3b995, 0xd8ad91, seed % 5 * .12),
    hair: named?.hair ?? mix(seed % 3 === 0 ? 0x332831 : 0x24262d, 0xd4cbc1, grey * .83),
    beard: named?.beard ?? (!female && ageYears >= 43 && (!shaved || ageYears >= 62) ? (ageYears >= 57 ? 'long' : 'short') : 'none'),
    hairStyle: named?.hairStyle ?? (female && seed % 2 ? 'braid' : rank >= 5 ? 'crown' : 'knot'),
    ink: mix(INK, shade(outer, .42), .25),
    seed,
  };
}
