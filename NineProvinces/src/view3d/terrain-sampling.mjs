import { project } from '../data/map.mjs';
import { landAt } from '../sim/land.mjs';

// Pure deterministic height and colour sampling. Shared by main-thread fallback
// and the worker; simulation terrain and published mesh colours are unchanged.
export const TILE = 64;
export const COLUMNS = TILE + 1;

const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
/** sRGB 0..255 triple to linear. */
const C = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)];
const PAL = {
  grass: C(83, 115, 78),
  meadow: C(111, 136, 87),
  farm: C(155, 140, 101),
  steppe: C(150, 140, 84),
  sand: C(218, 164, 91),
  sandShade: C(150, 95, 51),
  duneCrest: C(236, 187, 112),
  loess: C(168, 136, 92),
  plateau: C(69, 89, 114),
  scree: C(122, 140, 157),
  basin: C(65, 115, 74),
  basinField: C(118, 143, 83),
  plain: C(184, 161, 103),
  plainField: C(157, 151, 96),
  rock: C(104, 96, 88),
  snow: C(236, 238, 242),
  forest: C(49, 76, 58),
  beach: C(196, 178, 134),
  marsh: C(96, 112, 74),
  bed: C(88, 96, 84),
  town: C(150, 136, 114),
  seabed: C(70, 96, 104)
};
const mix = (out, c, t) => {
  out[0] += (c[0] - out[0]) * t;
  out[1] += (c[1] - out[1]) * t;
  out[2] += (c[2] - out[2]) * t;
};
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const ROCK = C(104, 96, 88);
const SICHUAN = project(105, 30.6);
const NORTH_PLAIN = project(116.35, 35.4);
const GUANZHONG = project(109.05, 34.45);

function zone(x, z, centre, width, depth) {
  const d = ((x - centre.x) / width) ** 2 + ((z - centre.y) / depth) ** 2;
  return 1 - clamp01((d - 0.43) / 0.65);
}

/** The near patterns use world coordinates without changing relief or rules. */
function fieldPattern(x, z) {
  const lane = (x + z * 0.28) / 11;
  const strip = (z - x * 0.1) / 6.5;
  const value = (Math.floor(lane) * 17 + Math.floor(strip) * 13) & 7;
  const furrow = Math.abs(strip - Math.floor(strip) - 0.5) > 0.42;
  return value / 11 + (furrow ? 0.3 : 0);
}

/** The ground colour at a point, linear RGB, from what the land is there and how steep. */
export function groundColour(s, slope, x, z, out) {
  const south = clamp01((z - 900) / 1200);
  out[0] = PAL.farm[0];
  out[1] = PAL.farm[1];
  out[2] = PAL.farm[2];
  mix(out, PAL.grass, 0.35 + south * 0.65);
  // Patches of meadow and field in the lowland.
  const patch = (Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2) + Math.sin(z * 0.13 + x * 0.03)) * 0.25 + 0.5;
  mix(out, patch > 0.55 ? PAL.meadow : PAL.farm, 0.25);
  if (s.steppe > 0) mix(out, PAL.steppe, s.steppe);
  // The loess country west of the Taihang and the plateaux.
  const loess = clamp01((1900 - x) / 500) * (1 - south) * 0.7;
  if (loess > 0) mix(out, PAL.loess, loess * (1 - s.desert));
  const lowland = 1 - clamp01(s.mountain / 7 + s.plateau);
  const basin = zone(x, z, SICHUAN, 192, 166) * lowland;
  const plain = Math.max(zone(x, z, NORTH_PLAIN, 410, 252), zone(x, z, GUANZHONG, 163, 76)) * lowland;
  if (basin > 0) {
    mix(out, PAL.basin, basin * 0.93);
    mix(out, PAL.basinField, basin * (0.15 + 0.68 * fieldPattern(x, z)) * (1 - s.forest));
  } else if (plain > 0) {
    mix(out, PAL.plain, plain * 0.84);
    mix(out, PAL.plainField, plain * fieldPattern(x, z) * 0.83);
  }
  if (s.plateau > 0) {
    const plateau = s.plateau * (1 - s.desert);
    mix(out, PAL.plateau, plateau);
    const band = Math.sin(s.height * 1.3 + Math.sin(z * 0.047 + x * 0.026) * 1.2);
    mix(out, PAL.scree, plateau * (0.13 + 0.23 * Math.max(0, band)));
  }
  if (s.desert > 0) {
    mix(out, PAL.sand, s.desert);
    const dune = Math.sin(x * 0.22 - z * 0.11 + Math.sin(z * 0.024) * 2 + Math.sin((x + z) * 0.013));
    mix(out, dune > 0 ? PAL.duneCrest : PAL.sandShade, s.desert * 0.64 * Math.abs(dune));
  }
  if (s.marsh > 0) mix(out, PAL.marsh, s.marsh * 0.8);
  if (s.forest > 0) mix(out, PAL.forest, s.forest * 0.9);
  // Mountains: bare rock on steep faces, snow on the heights.
  const rock = clamp01((slope - 0.18) * 3.2) * clamp01(s.mountain / 4 + s.plateau);
  if (rock > 0) mix(out, PAL.rock, rock);
  const snow = clamp01((s.height - 25) / 9) * (1 - clamp01((slope - 0.5) * 3)) * (1 - s.desert);
  if (snow > 0) mix(out, PAL.snow, snow);
  // Shores and river beds.
  if (s.water === 1 || s.shore < 2) mix(out, PAL.beach, clamp01(1 - s.shore / 2) * (s.water === 1 ? 0.4 : 0.8));
  if (s.water === 1) mix(out, PAL.seabed, clamp01(-s.height / 3));
  if (s.river < 1.3) mix(out, s.river < 1 ? PAL.bed : PAL.beach, s.river < 1 ? 0.9 : 0.5);
  if (s.water === 2) mix(out, PAL.bed, 0.8);
  if (s.place > 0) mix(out, PAL.town, s.place * 0.85);
  return out;
}

export function sampleTerrainTile(tx,tz){
  const count=COLUMNS*COLUMNS,heights=new Float32Array(count),tint=new Float32Array(count*4);
  const x0=tx*TILE,z0=tz*TILE,sample={},colour=[0,0,0];
  for(let r=0;r<COLUMNS;r++)for(let c=0;c<COLUMNS;c++){
    const i=r*COLUMNS+c,x=x0+c,z=z0+r;
    landAt(x,z,sample);heights[i]=sample.height;groundColour(sample,0,x,z,colour);
    tint[i*3]=colour[0];tint[i*3+1]=colour[1];tint[i*3+2]=colour[2];
    tint[count*3+i]=Math.min(1,sample.mountain/4+sample.plateau)*(1-Math.min(1,Math.max(0,(sample.height-24)/6))*.3);
  }
  return {heights,tint};
}