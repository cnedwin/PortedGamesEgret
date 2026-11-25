import sharp from 'sharp';
import { readdirSync } from 'node:fs';
const T = '../tripo/tripo-out';
const OUT = '/home/claude/portedgamesegret/StarBanner/assets/portraits';
// [id, left, top, size] as fractions of the 2048 concept picture: the head and shoulders of a figure, the whole of a machine.
const CROPS = {
  swordsman: [0.29, 0.02, 0.42], pikeman: [0.29, 0.06, 0.42], archer: [0.27, 0.02, 0.44], mage: [0.31, 0.16, 0.38], giant: [0.25, 0.03, 0.46], merfolk: [0.29, 0.04, 0.42],
  seline: [0.3, 0.03, 0.4], edmund: [0.3, 0.12, 0.4], vireta: [0.29, 0.02, 0.42], garron: [0.28, 0.03, 0.44],
  hound: [0.12, 0.08, 0.74], knight: [0.14, 0.06, 0.72], wagon: [0.1, 0.1, 0.8], ballista: [0.1, 0.1, 0.8], trebuchet: [0.06, 0.06, 0.86], balloon: [0.1, 0.02, 0.8],
  griffin: [0.08, 0.06, 0.84], witch: [0.12, 0.12, 0.76], wyvern: [0.06, 0.04, 0.88], ferry: [0.08, 0.1, 0.82], turtle: [0.04, 0.14, 0.86], harpoonship: [0.04, 0.12, 0.86], warship: [0.06, 0.1, 0.84]
};
for (const [id, [l, t, s]] of Object.entries(CROPS)) {
  const dir = readdirSync(T).filter((d) => d.startsWith(`sb-${id}-img-`)).sort().pop();
  const src = `${T}/${dir}/generated_image.png`;
  const meta = await sharp(src).metadata();
  const size = Math.round(s * meta.width);
  await sharp(src).extract({ left: Math.round(l * meta.width), top: Math.round(t * meta.height), width: size, height: size }).resize(192, 192).webp({ quality: 82 }).toFile(`${OUT}/${id}.webp`);
}
console.log('ok');
