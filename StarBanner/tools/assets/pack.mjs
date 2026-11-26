// 把生成的模型压成游戏用的高、中、低三档：贴图缩小并重新压成 JPEG，网格用 gltfpack（meshoptimizer）按三角形预算减面、
// 量化并做 meshopt 压缩。带骨骼和动画的人物照样保留骨骼与动画。
// Packs a generated model into the game's high, medium and low sets: textures resized and re-encoded as JPEG, the
// mesh simplified by gltfpack (meshoptimizer) to a triangle budget, quantized and meshopt-compressed. A rigged,
// animated figure keeps its skeleton and clips.
//
//   node pack.mjs <model.glb> <out dir> <name> <high tris> <mid tris> <low tris> <high texture> [--keep]
//
// Needs @gltf-transform/core, @gltf-transform/extensions, sharp and gltfpack installed beside it.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';

const [input, outDir, name, highTris, midTris, lowTris, highTex] = process.argv.slice(2);
const SETS = {
  high: { tris: Number(highTris), tex: Number(highTex) },
  mid: { tris: Number(midTris), tex: Number(highTex) / 2 },
  low: { tris: Number(lowTris), tex: Math.max(256, Number(highTex) / 4) }
};
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
mkdirSync(outDir, { recursive: true });
for (const [set, { tris, tex }] of Object.entries(SETS)) {
  const doc = await io.read(input);
  for (const t of doc.getRoot().listTextures()) {
    const img = await sharp(Buffer.from(t.getImage())).resize(tex, tex).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    t.setImage(new Uint8Array(img)).setMimeType('image/jpeg');
  }
  let total = 0;
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) total += (prim.getIndices()?.getCount() ?? prim.getAttribute('POSITION').getCount()) / 3;
  const tmp = `${outDir}/${name}-${set}.tmp.glb`;
  await io.write(tmp, doc);
  const ratio = Math.min(1, tris / total).toFixed(5);
  execFileSync('npx', ['gltfpack', '-i', tmp, '-o', `${outDir}/${name}-${set}.glb`, '-si', ratio, '-c', '-kn'], { stdio: 'inherit' });
  rmSync(tmp);
  console.log(name, set, Math.round(total), '→', tris);
}
