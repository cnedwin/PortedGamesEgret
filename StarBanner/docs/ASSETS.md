# 星旗战记 · 素材来源 · Starbanner Tactics · Where the assets come from

本作没有使用任何现成游戏的美术或音乐。全部人物、兵种、建筑和树木山石都是按本作自己写的文字描述生成的原创设计；界面、特效、地形和全部声音由代码生成。

No art or music from any existing game is used. Every person, unit, building, tree and peak is an original design
generated from this game's own written descriptions; the interface, effects, terrain and every sound are made in code.

## 3D 模型 · 3D models

- 流程：每个模型先用文字描述生成一张原创概念图（[Tripo](https://www.tripo3d.ai/) 的 text-to-image，`seedream_v4`；人形用 `t_pose` 模板，每张 5 点），再由概念图生成模型（`tripo-v3.1` image-to-model，贴图 detailed；人形另加几何 detailed）。 · Each model began as an original concept picture drawn from a description (Tripo text-to-image, `seedream_v4`, the `t_pose` template for humanoids), then modelled from that picture (`tripo-v3.1` image-to-model, detailed textures; humanoids detailed geometry too).
- 人形单位和指挥官（剑士、枪兵、弓手、法师、巨人、鱼人、赛琳、埃德蒙、维蕾塔、格伦）用 `rig-v3.0` 绑定人形骨骼，再套用 Tripo 的预设动作：待机、行走、挥砍（弓手、法师、埃德蒙、维蕾塔用射击）、受击、倒下，原地播放。 · Humanoids were rigged with `rig-v3.0` and given Tripo's preset clips in place: idle, walk, slash (shoot for the archer, mage, Edmund and Vireta), hurt, fall.
- 猎犬沿用首发三档原网格、UV 和贴图，用本项目的 [rig-hound.mjs](../tools/assets/rig-hound.mjs) 加入 18 个关节和原创待机、四足行走、扑击、受击、倒地片段。各 GLB 的 `asset.extras.sourceSha256` 记录原文件指纹。可从 `da90234` 取回三档原始 GLB，再把原始模型目录与新输出目录传给该工具重建。 · The hound keeps the original meshes, UVs and textures in all three tiers. The local tool adds 18 joints and original idle, four-legged walk, pounce, hurt and fall clips. Each GLB records its source hash. To rebuild, use the original models from revision `da90234` and a separate output directory.
- 其余单位（骑士、补给马车、弩车、投石车、热气球、狮鹫骑兵、扫帚魔女、飞龙、渡船、战龟、鱼叉船、战舰）和建筑（要塞、兵营、飞羽塔、港口、村庄、风车）、树（橡树、松树）、山岩、礁石都是不带骨骼的整体模型，游戏里用代码驱动颠簸、悬浮、摇摆和前冲。 · The rest of the units, the buildings, trees, peaks and reefs are single meshes moved in code.
- 文字描述全在 [`tools/assets/models.tsv`](../tools/assets/models.tsv)：模型蓝色的衣甲和旗帜在游戏里按阵营换色（`src/view/toon.mjs`），所以描述里统一写「钴蓝 + 金色八角星」。约用 Tripo 2400 点。使用条款见 [Tripo Terms of Service](https://www.tripo3d.ai/terms)。 · The descriptions are in `tools/assets/models.tsv`; the cobalt blue of tabards and banners is turned to each side's colour in the game, so every description asks for cobalt with a gold eight-pointed star. About 2,400 Tripo credits.
- 打包：[`tools/assets/pack.mjs`](../tools/assets/pack.mjs) 用 [glTF-Transform](https://gltf-transform.dev/) 读模型、[sharp](https://sharp.pixelplumbing.com/) 把贴图缩小重压成 JPEG，再用 [gltfpack](https://github.com/zeux/meshoptimizer) 减面、量化、meshopt 压缩，分高、中、低三档：人形 1.6 万 / 8 千 / 3.5 千三角形，整体单位 1.2 万 / 6 千 / 2.5 千，建筑 1.4 万 / 7 千 / 3 千，树木山石 4 千 / 2 千 / 900；贴图 1024 / 512 / 256（树木山石 512 / 256 / 256）。 · Packed by `tools/assets/pack.mjs` (glTF-Transform, sharp, gltfpack) into three sets.
- 依赖与用法：`npm i @gltf-transform/core @gltf-transform/extensions meshoptimizer sharp gltfpack`，`node pack.mjs <model.glb> <out dir> <name> <high tris> <mid tris> <low tris> <high texture>`。 · Needs those packages; run as shown.

| 文件 · Files | 内容 · What |
|---|---|
| `assets/models/{swordsman,pikeman,archer,mage,giant,merfolk}-{high,mid,low}.glb` | 人形兵种，带骨骼和五段动作 · humanoid units, rigged, five clips |
| `assets/models/{seline,edmund,vireta,garron}-*.glb` | 四位指挥官，带骨骼和五段动作 · the four commanders, rigged |
| `assets/models/hound-{high,mid,low}.glb` | 猎犬四足骨骼与五段动作 · quadruped hound rig and five clips |
| `assets/models/{knight,wagon,ballista,trebuchet,balloon,griffin,witch,wyvern,ferry,turtle,harpoonship,warship}-*.glb` | 其余兵种 · the other units |
| `assets/models/{stronghold,barracks,tower,port,village,windmill}-*.glb` | 建筑 · buildings |
| `assets/models/{oak,pine,crag,rocks}-*.glb` | 树、山岩、礁石 · trees, peaks, reefs |

## 头像 · Portraits

[`tools/assets/portraits.mjs`](../tools/assets/portraits.mjs) 从同一批原创概念图里裁出头肩（器械和飞兵取整体），缩到 192×192 存成 WebP：`assets/portraits/*.webp`。 · Cropped from the same concept pictures to 192 × 192 WebP.

## 代码生成的部分 · Made in code

- 地形：沙盘的草地、道路、沙滩、城砖、河床、岸壁和分层的土石侧壁，水面的起伏与反光，桥板、草丛和小花（`src/view/board.mjs`）。 · The board's ground, banks and layered walls, the water's swell and glints, bridge planks, grass and flowers.
- 卡通材质、阵营换色、边缘光（`src/view/toon.mjs`）；范围格、路线和光标（`src/view/overlay.mjs`）；火花、光点、飞行道具和光环（`src/view/effects.mjs`）。 · Toon materials, the team colours and rim; ranges, path and cursor; sparks, motes, missiles and rings.
- 界面（`style.css`、`src/hud.mjs`、`src/screens.mjs`）和地图缩略图。 · The interface and the map thumbnails.
- 声音（`src/audio/synth.mjs`）：铜管、拨弦、弦乐、断奏、低音、钟、笛声七种合成音色和鼓；本作原创的五段曲子——标题的进行曲（C 大调）、我方回合（G 大调）、敌方回合（E 小调）、胜利与败北的短曲；以及光标、确定、取消、脚步、刀剑、长枪、撕咬、弓弦、弩、投石、碎裂、魔法、火焰、水花、暴击、倒下、占领、金币、治疗、诅咒、战意技和回合横幅的音效。 · Sound: seven synthesized voices and drums; this game's own five pieces — the title march (C major), your turn (G major), the enemy's turn (E minor), victory and defeat; and every effect.
