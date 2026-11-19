#!/usr/bin/env node
// 从部件清单生成美术参考文档，省得设计文档里的表和代码对不上。
//
//   node FivePhases/tools/parts-table.mjs
//
// 输出 FivePhases/docs/PORTRAIT-PARTS.md：骨骼表 + 部件表 + 换真图的步骤。
// 这份文档是生成的，别手改——要改就改 src/portrait/*.mjs，然后重跑。

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { portraits } from '../src/portrait/index.mjs';
import { drawOrder, lintPortrait } from '../src/portrait/fire.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(here, '..', 'docs', 'PORTRAIT-PARTS.md');

const num = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function table(headers, rows) {
  const head = `| ${headers.join(' | ')} |`;
  const rule = `| ${headers.map(() => '---').join(' | ')} |`;
  return [head, rule, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
}

function section(portrait) {
  const problems = lintPortrait(portrait);
  const status = problems.length ? `**体检不通过**\n\n${problems.map((p) => `- ${p}`).join('\n')}` : '体检通过';

  const boneRows = portrait.bones.map((bone) => [
    `\`${bone.id}\``,
    bone.parent ? `\`${bone.parent}\`` : '—',
    `${bone.x}, ${bone.y}`,
  ]);

  const partRows = drawOrder(portrait).map((part, index) => [
    String(index),
    `\`${part.id}\``,
    `\`${part.bone}\``,
    String(part.layer),
    part.shape === 'path' ? (part.smooth ? 'path·弧' : 'path·直') : part.shape,
    `${num(part.size[0])} × ${num(part.size[1])}`,
    `${part.pivot[0]}, ${part.pivot[1]}`,
    `${num(part.rotation)}°`,
    `${num(part.offset[0])}, ${num(part.offset[1])}`,
  ]);

  return [
    `## ${portrait.title} · ${portrait.name}（${portrait.id}）`,
    '',
    `- 职责：${portrait.role}`,
    `- 画布：${portrait.canvas.width} × ${portrait.canvas.height}`,
    `- 骨骼 **${portrait.bones.length}** 根，部件 **${portrait.parts.length}** 个`,
    `- ${status}`,
    '',
    '### 骨骼',
    '',
    table(['骨骼', '父骨', '画布坐标'], boneRows),
    '',
    '### 部件（按绘制顺序，后面的压前面的）',
    '',
    table(['#', '部件', '挂骨', '层', '形状', '尺寸', '轴心', '旋转', '偏移'], partRows),
    '',
  ].join('\n');
}

function main() {
  const body = [
    '# 立绘部件清单',
    '',
    '> 这份文档由 `FivePhases/tools/parts-table.mjs` 从 `src/portrait/*.mjs` 生成，**不要手改**。',
    '> 要改部件就改清单文件，然后 `node FivePhases/tools/parts-table.mjs` 重跑一遍。',
    '',
    '## 换真美术的步骤',
    '',
    '1. 跑 `node FivePhases/tools/spine-export.mjs`，得到 `assets/spine/<角色>.skeleton.json` 和 `.manifest.json`。',
    '2. 照 manifest 的 `size` 一张张画/生成 PNG，轴心放在 `pivot` 指定的位置。',
    '3. 用 TexturePacker 或 Spine 自带打包器把 PNG 打成图集（atlas 由打包器出，不手拼）。',
    '4. 把图集和 skeleton.json 一起丢进游戏，`image` 字段就算接上了。',
    '',
    '骨骼、槽位、绘制顺序全在 skeleton.json 里，换图不用改它。',
    '',
    '## 坐标约定',
    '',
    '清单用画布坐标（原点左上，y 向下，像素）。转 Spine 时：',
    '',
    '```',
    'spine_x = canvas_x - canvas.width / 2',
    'spine_y = canvas.height - canvas_y',
    'spine_rotation = -canvas_rotation',
    '```',
    '',
    '原点落在画布底边中心，人物正好站在 y = 0 上。附件存的是**图片中心**，',
    '清单里的 `offset` 是**轴心**，两者差一个按部件旋转摆过去的向量——转换脚本负责，别手算。',
    '',
    '## 约定俗成的三件事',
    '',
    '- **四肢从骨骼算，不手填角度**：`limb()` 按两根骨的位置推长度和朝向，骨骼一动胳膊跟着走。',
    '- **关节补一个同色圆**：两根胶囊在肘部交叠，不补就会被掐出一个细腰。',
    '- **绘制顺序即 layer 顺序**：Spine 的槽位顺序就是渲染顺序，导出时按 layer 排，别乱。',
    '',
    ...portraits.map(section),
  ].join('\n');

  return mkdir(path.dirname(outPath), { recursive: true })
    .then(() => writeFile(outPath, body, 'utf8'))
    .then(() => {
      console.log(`写入 ${path.relative(process.cwd(), outPath)}`);
      console.log(`角色 ${portraits.length} 个，共 ${portraits.reduce((n, p) => n + p.parts.length, 0)} 个部件`);
    });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
