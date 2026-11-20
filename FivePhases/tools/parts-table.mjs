#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';

import { ATLAS_PORTRAITS } from '../src/portrait/atlas.mjs';

const assets = new URL('../assets/portraits/', import.meta.url);
const sections = [];

for (const id of ATLAS_PORTRAITS) {
  const manifest = await readFile(new URL(`${id}/rig.json`, assets), 'utf8');
  const { name, bones, parts, canvas, anchor } = JSON.parse(manifest);
  const directory = `../assets/portraits/${id}`;
  sections.push([
    `## ${name}`,
    '',
    `${canvas.width} × ${canvas.height} 的绑定画布，${bones.length} 根骨与 ${parts.length} 个部件。画面锚点 \`${anchor.join(', ')}\`。`,
    '',
    `[立绘原画](${directory}/master.webp) · [绑定清单](${directory}/rig.json) · [Spine 骨架](../assets/spine/${id}.skeleton.json) · [Atlas 数据](../assets/spine/${id}.atlas)`,
    '',
    '| 图层 | 部件 | 父骨 | 画布左上位置 |',
    '| --- | --- | --- | --- |',
    ...parts.map(({id: part, bone, at}, index) =>
      `| ${index} | [${part}](${directory}/parts/${part}.png) | \`${bone}\` | \`${at.join(', ')}\` |`),
    '',
  ].join('\n'));
}

const guide = `# 五行牌阵立绘部件

角色原画先按关节和层序裁成带透明度的区域。清单使用左上为原点的画布坐标，骨骼的局部变换和渲染层序分别保存。拼贴后以一个共享 PNG 图集渲染每个角色，单片 PNG 用于美术返修。

在 Spine 4.1 导入对应的 \`*.skeleton.json\`，图像目录选择角色的 \`parts/\`。外部运行时可配合同名 \`*.atlas\` 和 \`atlas.png\` 使用。浏览器中打开 \`tools/portrait-preview.html?id=fire\` 可检查拼接、关节和轴心。游戏的待机、出招和受击曲线由白鹭端播放。

更新切片时保留骨骼和部件的 ID。重新打包 \`atlas.png\`，在 \`rig.json\` 更新图集矩形和画布位置，再运行 \`node FivePhases/tools/spine-export.mjs\` 与 \`node FivePhases/tools/parts-table.mjs\`。

`;
await writeFile(new URL('../docs/PORTRAIT-PARTS.md', import.meta.url), guide + sections.join('\n'));
