#!/usr/bin/env node
// 把部件清单导出成 Spine 骨架 + 美术交付单。
//
//   node FivePhases/tools/spine-export.mjs
//   node FivePhases/tools/spine-export.mjs --id fire --out FivePhases/assets/spine
//
// 出两个文件：
//   <id>.skeleton.json  Spine 4.1 骨架，导入后骨骼、槽位、绘制顺序都是现成的
//   <id>.manifest.json  每个部件要一张多大的 PNG、轴心在哪、挂哪根骨
//
// 不出 atlas：图集是打包器（TexturePacker / Spine 自带打包）按 PNG 出的，
// 手工拼一张假的 atlas 只会让人以为能用。交付单里已经把尺寸定死了。

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { portraits, portraitById } from '../src/portrait/index.mjs';
import { lintPortrait } from '../src/portrait/fire.mjs';
import { toSpineSkeleton, toManifest } from '../src/portrait/spine.mjs';

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

async function exportOne(portrait, outDir) {
  const problems = lintPortrait(portrait);
  if (problems.length) {
    throw new Error(`${portrait.id} 体检不通过，先修清单：\n  ${problems.join('\n  ')}`);
  }

  const skeleton = toSpineSkeleton(portrait);
  const manifest = toManifest(portrait);

  await mkdir(outDir, { recursive: true });
  const skeletonPath = path.join(outDir, `${portrait.id}.skeleton.json`);
  const manifestPath = path.join(outDir, `${portrait.id}.manifest.json`);
  await writeFile(skeletonPath, `${JSON.stringify(skeleton, null, 2)}\n`, 'utf8');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return {
    id: portrait.id,
    bones: skeleton.bones.length,
    slots: skeleton.slots.length,
    skeletonPath,
    manifestPath,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const targets = options.id ? [portraitById(options.id)].filter(Boolean) : portraits;
  if (!targets.length) {
    console.error(`没有这个角色：${options.id}。现有：${portraits.map((p) => p.id).join(' / ')}`);
    process.exit(1);
  }

  for (const portrait of targets) {
    const result = await exportOne(portrait, options.out);
    console.log(`${result.id}  ${result.bones} 骨  ${result.slots} 槽`);
    console.log(`  ${path.relative(process.cwd(), result.skeletonPath)}`);
    console.log(`  ${path.relative(process.cwd(), result.manifestPath)}`);
  }

  console.log(`\n出图时按 manifest 里的 size 一张张导，打包成图集后 Spine 就能直接用。`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
