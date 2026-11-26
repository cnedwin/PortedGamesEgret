# 五行牌阵立绘部件

角色原画先按关节和层序裁成带透明度的区域。清单使用左上为原点的画布坐标，骨骼的局部变换和渲染层序分别保存。拼贴后以一个共享 PNG 图集渲染每个角色，单片 PNG 用于美术返修。

在 Spine 4.1 导入对应的 `*.skeleton.json`，图像目录选择角色的 `parts/`。外部运行时可配合同名 `*.atlas` 和 `atlas.png` 使用。浏览器中打开 `tools/portrait-preview.html?id=fire` 可检查拼接、关节和轴心。四套骨架各带待机、出招、受击、胜利和失败五段动作。白鹭播放与 Spine 导出共享的关键帧，出招段的 windup 提示起手，impact 同步受击动作、血量、护盾、特效和音效。

更新切片时保留骨骼和部件的 ID。重新打包 `atlas.png`，在 `rig.json` 更新图集矩形和画布位置，再运行 `node FivePhases/tools/spine-export.mjs` 与 `node FivePhases/tools/parts-table.mjs`。

## 焰

635 × 952 的绑定画布，12 根骨与 11 个部件。画面锚点 `264, 601`。

[立绘原画](../assets/portraits/fire/master.webp) · [绑定清单](../assets/portraits/fire/rig.json) · [Spine 骨架](../assets/spine/fire.skeleton.json) · [Atlas 数据](../assets/spine/fire.atlas)

| 图层 | 部件 | 父骨 | 画布左上位置 |
| --- | --- | --- | --- |
| 0 | [ponytail](../assets/portraits/fire/parts/ponytail.png) | `hair-tail` | `11, 9` |
| 1 | [boots](../assets/portraits/fire/parts/boots.png) | `root` | `104, 824` |
| 2 | [robe](../assets/portraits/fire/parts/robe.png) | `skirt-r` | `6, 308` |
| 3 | [far-sleeve](../assets/portraits/fire/parts/far-sleeve.png) | `shoulder-far` | `73, 166` |
| 4 | [far-bracer](../assets/portraits/fire/parts/far-bracer.png) | `elbow-far` | `3, 307` |
| 5 | [torso](../assets/portraits/fire/parts/torso.png) | `chest` | `114, 22` |
| 6 | [near-sleeve](../assets/portraits/fire/parts/near-sleeve.png) | `shoulder-near` | `287, 174` |
| 7 | [near-bracer](../assets/portraits/fire/parts/near-bracer.png) | `elbow-near` | `388, 237` |
| 8 | [sword-hand](../assets/portraits/fire/parts/sword-hand.png) | `hand-near` | `452, 15` |
| 9 | [face](../assets/portraits/fire/parts/face.png) | `head` | `193, 29` |
| 10 | [waist-sash](../assets/portraits/fire/parts/waist-sash.png) | `sash` | `292, 299` |

## 山魈

777 × 777 的绑定画布，8 根骨与 7 个部件。画面锚点 `391, 739`。

[立绘原画](../assets/portraits/shanjiao/master.webp) · [绑定清单](../assets/portraits/shanjiao/rig.json) · [Spine 骨架](../assets/spine/shanjiao.skeleton.json) · [Atlas 数据](../assets/spine/shanjiao.atlas)

| 图层 | 部件 | 父骨 | 画布左上位置 |
| --- | --- | --- | --- |
| 0 | [left-leg](../assets/portraits/shanjiao/parts/left-leg.png) | `left-leg` | `75, 443` |
| 1 | [right-leg](../assets/portraits/shanjiao/parts/right-leg.png) | `right-leg` | `410, 453` |
| 2 | [left-forearm](../assets/portraits/shanjiao/parts/left-forearm.png) | `left-arm` | `5, 193` |
| 3 | [torso](../assets/portraits/shanjiao/parts/torso.png) | `body` | `79, 67` |
| 4 | [right-gauntlet](../assets/portraits/shanjiao/parts/right-gauntlet.png) | `right-arm` | `484, 118` |
| 5 | [stone-mane](../assets/portraits/shanjiao/parts/stone-mane.png) | `mane` | `257, 2` |
| 6 | [mask-and-beard](../assets/portraits/shanjiao/parts/mask-and-beard.png) | `head` | `167, 75` |

## 赤蛟

777 × 777 的绑定画布，7 根骨与 6 个部件。画面锚点 `388, 745`。

[立绘原画](../assets/portraits/chijiao/master.webp) · [绑定清单](../assets/portraits/chijiao/rig.json) · [Spine 骨架](../assets/spine/chijiao.skeleton.json) · [Atlas 数据](../assets/spine/chijiao.atlas)

| 图层 | 部件 | 父骨 | 画布左上位置 |
| --- | --- | --- | --- |
| 0 | [tide-tail](../assets/portraits/chijiao/parts/tide-tail.png) | `tail` | `529, 416` |
| 1 | [far-claw](../assets/portraits/chijiao/parts/far-claw.png) | `left-arm` | `54, 324` |
| 2 | [sea-mane](../assets/portraits/chijiao/parts/sea-mane.png) | `mane` | `293, 84` |
| 3 | [coiled-body](../assets/portraits/chijiao/parts/coiled-body.png) | `body` | `50, 131` |
| 4 | [horned-head](../assets/portraits/chijiao/parts/horned-head.png) | `head` | `15, 6` |
| 5 | [front-claw](../assets/portraits/chijiao/parts/front-claw.png) | `right-arm` | `87, 419` |

## 混沌

777 × 777 的绑定画布，7 根骨与 6 个部件。画面锚点 `397, 733`。

[立绘原画](../assets/portraits/hundun/master.webp) · [绑定清单](../assets/portraits/hundun/rig.json) · [Spine 骨架](../assets/spine/hundun.skeleton.json) · [Atlas 数据](../assets/spine/hundun.atlas)

| 图层 | 部件 | 父骨 | 画布左上位置 |
| --- | --- | --- | --- |
| 0 | [ink-mane](../assets/portraits/hundun/parts/ink-mane.png) | `mane` | `203, 39` |
| 1 | [rear-haunch](../assets/portraits/hundun/parts/rear-haunch.png) | `tail` | `595, 301` |
| 2 | [obsidian-body](../assets/portraits/hundun/parts/obsidian-body.png) | `body` | `89, 139` |
| 3 | [left-grip](../assets/portraits/hundun/parts/left-grip.png) | `left-arm` | `13, 312` |
| 4 | [ritual-mask](../assets/portraits/hundun/parts/ritual-mask.png) | `head` | `82, 51` |
| 5 | [right-grip](../assets/portraits/hundun/parts/right-grip.png) | `right-arm` | `327, 257` |
