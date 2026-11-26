// Re-encode the CC0 material maps for the game: diffuse and normal at 1024 px, ARM at 512 px; skies as 2048×1024
// tone-mapped JPEG panoramas.
import sharp from 'sharp';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
const src = process.argv[2], out = process.argv[3];
mkdirSync(out + '/materials', { recursive: true });
mkdirSync(out + '/skies', { recursive: true });
for (const f of readdirSync(src).filter((f) => f.endsWith('.jpg'))) {
  const arm = f.includes('_arm');
  await sharp(`${src}/${f}`).resize(arm ? 512 : 1024).jpeg({ quality: arm ? 82 : f.includes('_nor') ? 88 : 80, mozjpeg: true }).toFile(`${out}/materials/${f}`);
}
function parseHdr(buf) {
  let i = 0, header = '';
  while (true) { const line = []; while (buf[i] !== 10) line.push(buf[i++]); i++; const s = Buffer.from(line).toString(); if (s === '') break; header += s + '\n'; }
  const res = []; while (buf[i] !== 10) res.push(buf[i++]); i++;
  const m = Buffer.from(res).toString().match(/-Y (\d+) \+X (\d+)/);
  const h = +m[1], w = +m[2];
  const data = new Float32Array(w * h * 3);
  const scan = new Uint8Array(w * 4);
  for (let y = 0; y < h; y++) {
    if (buf[i] === 2 && buf[i + 1] === 2) {
      i += 4;
      for (let c = 0; c < 4; c++) {
        let x = 0;
        while (x < w) {
          let n = buf[i++];
          if (n > 128) { n -= 128; const v = buf[i++]; for (let k = 0; k < n; k++) scan[(x++) * 4 + c] = v; }
          else for (let k = 0; k < n; k++) scan[(x++) * 4 + c] = buf[i++];
        }
      }
    } else { for (let x = 0; x < w * 4; x++) scan[x] = buf[i++]; }
    for (let x = 0; x < w; x++) {
      const e = scan[x * 4 + 3];
      const f = e ? Math.pow(2, e - 136) : 0;
      const o = (y * w + x) * 3;
      data[o] = scan[x * 4] * f; data[o + 1] = scan[x * 4 + 1] * f; data[o + 2] = scan[x * 4 + 2] * f;
    }
  }
  return { w, h, data };
}
const exposure = { kloofendal_48d_partly_cloudy_puresky: 0.55, kloppenheim_06_puresky: 0.75, kloofendal_misty_morning_puresky: 0.9, snow_field_2_puresky: 0.8, qwantani_dusk_2_puresky: 0.32 };
for (const f of readdirSync(src).filter((f) => f.endsWith('.hdr'))) {
  const id = f.replace('.hdr', '');
  const { w, h, data } = parseHdr(readFileSync(`${src}/${f}`));
  const px = Buffer.alloc(w * h * 3);
  const k = exposure[id] ?? 0.7;
  for (let i = 0; i < w * h * 3; i++) {
    // A soft shoulder so the sun keeps some shape, then sRGB.
    let v = data[i] * k;
    v = v / (1 + v * 0.18);
    v = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    px[i] = Math.max(0, Math.min(255, Math.round(v * 255)));
  }
  await sharp(px, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 84, mozjpeg: true }).toFile(`${out}/skies/${id}.jpg`);
  console.log(id, w, h);
}
