// Reduce a generated, rigged character to game sets: textures resized and re-encoded as JPEG, then the mesh
// simplified by gltfpack (meshopt) to a triangle budget per set.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const [input, outDir, name] = process.argv.slice(2);
const SETS = { high: { tris: 42000, tex: 2048 }, mid: { tris: 18000, tex: 1024 }, low: { tris: 7000, tex: 512 } };
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
mkdirSync(outDir, { recursive: true });
for (const [set, { tris, tex }] of Object.entries(SETS)) {
  const doc = await io.read(input);
  for (const t of doc.getRoot().listTextures()) {
    const normal = /normal/i.test(t.getName());
    const img = await sharp(Buffer.from(t.getImage())).resize(tex, tex).jpeg({ quality: normal ? 92 : 86, mozjpeg: true }).toBuffer();
    t.setImage(new Uint8Array(img)).setMimeType('image/jpeg');
  }
  const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const total = prim.getIndices().getCount() / 3;
  const tmp = `${outDir}/${name}-${set}.tmp.glb`;
  await io.write(tmp, doc);
  const ratio = Math.min(1, tris / total).toFixed(5);
  execFileSync('npx', ['gltfpack', '-i', tmp, '-o', `${outDir}/${name}-${set}.glb`, '-si', ratio, '-sa', '-c', '-kn'], { stdio: 'inherit' });
  execFileSync('rm', [tmp]);
}
