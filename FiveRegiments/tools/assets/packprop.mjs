// Pack a generated prop into high, mid and low sets with the given triangle and texture budgets.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { MeshoptDecoder } from 'meshoptimizer';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
// `loose` lets the medium and low sets fall back to aggressive simplification (which may smear textures across seams)
// when the careful one cannot get near the budget: for trees, rocks and small repeated things, never for buildings.
const [input, outDir, name, hi, mid, lo, texHi, loose] = process.argv.slice(2);
const SETS = { high: { tris: +hi, tex: +texHi }, mid: { tris: +mid, tex: +texHi / 2 }, low: { tris: +lo, tex: +texHi / 4 } };
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
mkdirSync(outDir, { recursive: true });
for (const [set, { tris, tex }] of Object.entries(SETS)) {
  const doc = await io.read(input);
  for (const t of doc.getRoot().listTextures()) {
    const normal = /normal/i.test(t.getName());
    const img = await sharp(Buffer.from(t.getImage())).resize(tex, tex).jpeg({ quality: normal ? 90 : 84, mozjpeg: true }).toBuffer();
    t.setImage(new Uint8Array(img)).setMimeType('image/jpeg');
  }
  let total = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) total += p.getIndices().getCount() / 3;
  const tmp = `${outDir}/${name}-${set}.tmp.glb`;
  await io.write(tmp, doc);
  const ratio = Math.min(1, tris / total).toFixed(5);
  const out = `${outDir}/${name}-${set}.glb`;
  execFileSync('npx', ['gltfpack', '-i', tmp, '-o', out, '-si', ratio, '-c'], { stdio: 'ignore' });
  if (loose === 'loose' && set !== 'high') {
    const got = (await io.read(out)).getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + p.getIndices().getCount() / 3, 0), 0);
    if (got > tris * 1.5) execFileSync('npx', ['gltfpack', '-i', tmp, '-o', out, '-si', ratio, '-sa', '-c'], { stdio: 'ignore' });
  }
  execFileSync('rm', [tmp]);
}
console.log(name, 'done');
