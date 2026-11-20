#!/usr/bin/env node
// 把部件清单导出成 Spine 骨架 + 美术交付单。
//
//   node FivePhases/tools/spine-export.mjs
//   node FivePhases/tools/spine-export.mjs --id fire --out FivePhases/assets/spine
//
// 导出 Spine 4.1 骨架、部件清单，以及与已存在的 PNG 图集匹配的 .atlas。

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { portraits, portraitById } from '../src/portrait/index.mjs';
import { lintPortrait } from '../src/portrait/fire.mjs';
import { ATLAS_PORTRAITS, portraitFromAtlas } from '../src/portrait/atlas.mjs';
import { toSpineSkeleton, toManifest, toSpineAtlas } from '../src/portrait/spine.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const options = {
    out: path.join(here, '..', 'assets', 'spine'),
    id: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') options.out = path.resolve(argv[++i]);
    else if (arg === '--id') options.id = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('用法: node FivePhases/tools/spine-export.mjs [--id <角色>] [--out <目录>]');
      process.exit(0);
    } else {
      console.error(`不认识的参数：${arg}`);
      process.exit(2);
    }
  }
  return options;
}

async function readPortrait(id) {
  const art = path.join(here, '..', 'assets', 'portraits', id);
  let input;
  try {
    input = await readFile(path.join(art, 'rig.json'), 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { portrait: portraitById(id), art: null };
  }

  const png = await readFile(path.join(art, 'atlas.png'));
  if (png.length < 24 || !png.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ||
      png.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`无效的立绘图集 PNG：${id}`);
  const portrait = portraitFromAtlas(id, JSON.parse(input), png.readUInt32BE(16), png.readUInt32BE(20));
  return { portrait, art };
}

async function exportOne(portrait, art, outDir) {
  const problems = lintPortrait(portrait);
  if (problems.length) {
    throw new Error(`${portrait.id} 体检不通过，先修清单：\n  ${problems.join('\n  ')}`);
  }

  const relative = (file) => path.relative(outDir, file).split(path.sep).join('/');
  const images = art ? `${relative(path.join(art, 'parts'))}/` : './';
  const skeleton = toSpineSkeleton(portrait, { images });
  const manifest = toManifest(portrait);

  await mkdir(outDir, { recursive: true });
  const skeletonPath = path.join(outDir, `${portrait.id}.skeleton.json`);
  const manifestPath = path.join(outDir, `${portrait.id}.manifest.json`);
  await writeFile(skeletonPath, `${JSON.stringify(skeleton, null, 2)}\n`, 'utf8');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const atlasPath = art ? path.join(outDir, `${portrait.id}.atlas`) : null;
  if (atlasPath) await writeFile(atlasPath, toSpineAtlas(portrait, relative(path.join(art, 'atlas.png'))), 'utf8');

  return {
    id: portrait.id,
    bones: skeleton.bones.length,
    slots: skeleton.slots.length,
    skeletonPath,
    manifestPath,
    atlasPath,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const targets = [...new Set([...ATLAS_PORTRAITS, ...portraits.map((p) => p.id)])];
  if (options.id && !targets.includes(options.id)) {
    console.error(`没有这个角色：${options.id}。现有：${targets.join(' / ')}`);
    process.exit(1);
  }

  for (const id of options.id ? [options.id] : targets) {
    const { portrait, art } = await readPortrait(id);
    if (!portrait) {
      if (options.id) throw new Error(`找不到立绘源文件：${id}`);
      continue;
    }
    const result = await exportOne(portrait, art, options.out);
    console.log(`${result.id}  ${result.bones} 骨  ${result.slots} 槽`);
    console.log(`  ${path.relative(process.cwd(), result.skeletonPath)}`);
    console.log(`  ${path.relative(process.cwd(), result.manifestPath)}`);
    if (result.atlasPath) console.log(`  ${path.relative(process.cwd(), result.atlasPath)}`);
  }

  console.log('\n将 skeleton.json 导入 Spine 4.1，图片目录指向对应角色的 parts/。');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
