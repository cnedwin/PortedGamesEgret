# 引擎缺口总账 · Engine gaps ledger

由 `node tools/engine-notes.mjs --write` 从各游戏的 ENGINE-NOTES 生成，不要手改；`--check` 检查它是否过期。引擎已解决的清单抄自引擎仓库的 `guide/resolved.json`，见 [engine-resolved.json](engine-resolved.json)（15 条）。笔记格式见 [GAME-STANDARD.md](GAME-STANDARD.md) 第 3 节。

Made by `node tools/engine-notes.mjs --write` from the ENGINE-NOTES of the games; do not edit by hand, and `--check` says whether it is out of date. What the engine resolved is copied from the engine's `guide/resolved.json` into [engine-resolved.json](engine-resolved.json) (15 entries). The form of a note is in part 3 of [GAME-STANDARD.md](GAME-STANDARD.md).

24 个游戏、142 条笔记：未解决 26，部分解决 13，游戏侧绕过 2，已写入文档 39，已解决 62。

142 notes from 24 games: 26 open, 13 partly resolved, 2 worked around in the game, 39 documented, 62 resolved.

## 1. 引擎已经解决、游戏还标着未解决 · Resolved by the engine, still open in a game

刷新引擎副本（引擎仓库的 `tools/vendor-game.mjs`），去掉绕过代码，再验一遍游戏，然后改笔记的状态。「副本里有」表示游戏现在的副本已经带着这个修复；在游戏目录里运行 `node vendor/egret.mjs notes` 也会列出这些。

Refresh the engine copy (the engine's `tools/vendor-game.mjs`), take the workaround out, check the game again, then change the note's status. "In the copy" means the game's present copy already has the fix; `node vendor/egret.mjs notes` in the game's folder lists these too.

（没有 · None）

## 2. 两个以上游戏遇到的未解决缺口：在引擎里修 · Open faults that two or more games met: fix them in the engine

同一个绕过办法出现在两个以上游戏里，说明问题在引擎的接口上，应该改引擎，而不是再写一张卡片。

The same workaround in two or more games means the fault is in the engine's interface: change the engine rather than write another card.

| Topic | 游戏数 · Games | 笔记 · Notes |
|---|:-:|---|
| `first-draw-program-link` | 2 | FPS#4 材质变体第一次绘制时链接着色器造成停顿 · The first draw of a material variant stalls while its program links (partly)<br>jelly-pandas#2 倒影通道和第一次出现的特效在第一次绘制时编译 · The mirror pass and first-use effects compile on first draw (partly) |
| `vertex-layout-program` | 2 | jelly-pandas#1 顶点布局不同就要另编一条管线 · A different vertex layout needs a pipeline of its own (open)<br>Rally#2 少一个顶点色属性就是另一个着色器 · A missing vertex-colour attribute makes another program (open) |

## 3. 只有一个游戏遇到的未解决缺口 · Open faults one game met

先把教训写成引擎指南的卡片（引擎仓库 `guide/cards`），引擎能顺手修的就修；第二个游戏遇到时移到第 2 节。

Write the lesson as a card of the engine's guide (`guide/cards` in the engine repository) first, and fix it in the engine where that is easy; when a second game meets it, it moves to part 2.

| Topic | 笔记 · Note | 状态 · Status |
|---|---|---|
| `animation-retarget-rigs` | FiveRegiments#4 `retargetAnimationClip3D` 不处理朝向不同的骨架，也不能截段、去根转、镜像 · `retargetAnimationClip3D` takes no account of rigs facing different ways, and cannot cut, still the root or mirror | 未解决 · open |
| `body-angle-degrees` | LubanBridge#2 刚体的 `angle` 是角度，文档和类型都没说 · A body's `angle` is in degrees, which neither the documents nor the types say | 未解决 · open |
| `camera-zoom-clamp` | NineProvinces#4 相机缩放超出范围时抛错而不是夹住 · The camera throws instead of clamping a zoom out of range | 未解决 · open |
| `decal-changes-material` | TeaHorseRoad#8 `createDecal3D` 改写传入的材质 · `createDecal3D` changes the material it is given | 未解决 · open |
| `frame-loop-failed-freeze` | FivePhases#3 帧循环出错后停在 `failed`，画面冻住 · After an error the frame loop stays `failed` and the picture freezes | 未解决 · open |
| `geometry-budget-reuse` | FivePhases#1 每帧的几何预算连复用的几何也一起算 · The per-frame geometry budget also counts reused geometry | 部分解决 · partly |
| `gltf-webp-texture` | FiveRegiments#1 `loadGltf3D` 不认 `EXT_texture_webp` · `loadGltf3D` does not take `EXT_texture_webp` | 未解决 · open |
| `instanced-lod` | TeaHorseRoad#2 实例网格没有距离剔除和 LOD · No distance culling or LOD for instanced meshes | 部分解决 · partly |
| `managed-editor-focus` | InquestScrolls#12 笔录托管编辑器创建和失焦 · Managed editor creation and blur | 已在游戏侧绕过 · worked around |
| `mouse-right-button` | LubanBridge#5 `web/input` 的鼠标输入只认左键 · The mouse input of `web/input` knows only the left button | 未解决 · open |
| `native-scrolling` | PeachCreek#2 经营单子的原生滚动 · Native scrolling for county inspectors | 部分解决 · partly |
| `on-demand-rendering` | NineProvinces#5 画面不变时帧循环也每帧整屏合成 · The frame loop composites the whole stage every frame even when nothing changes | 部分解决 · partly |
| `paragraph-image-size-limit` | InquestScrolls#11 段落图像超过尺寸上限 · Paragraph image exceeds the size limit | 已在游戏侧绕过 · worked around |
| `particle-burst-fraction` | SandScroll#2 粒子 `burst` 传小数时报"选项无效"，并让整个帧循环停下 · A fractional `burst` count reports invalid options and stops the frame loop | 未解决 · open |
| `particles-without-map` | FiveRegiments#2 粒子不给贴图时是方块 · Particles without a map are squares | 未解决 · open |
| `physics2d-hinge-motor` | LubanBridge#3 刚体不会自己转，没有铰链和马达 · Bodies do not spin by themselves, and there is no hinge or motor | 未解决 · open |
| `physics2d-joints-ropes` | MechanismCity#1 关节、绳索和旋转 · Joints, ropes and rotation | 部分解决 · partly |
| `physics2d-truss-joints` | LubanBridge#1 距离关节连成桁架又软又偏，也读不到杆件受了多大的力 · Distance joints chained into a truss are soft and lopsided, and give no member force | 未解决 · open |
| `prepare-programs-meshes` | JY#2 预编译着色器要求给出已经存在的网格 · Preparing programs needs meshes that already exist | 未解决 · open |
| `radial-gradient-triangles` | MechanismCity#6 径向渐变的三角形很多 · Radial gradients cost many triangles | 未解决 · open |
| `rotated-view-scrolling` | TaiwanMahjong#7 旋转界面上的纵向列表无法顺着内容拖动 · Vertical scrolling inside a rotated view | 未解决 · open |
| `save-update-return` | PeachCreek#6 存档更新与预制绘图对象 · Save updates and convenience drawing objects | 部分解决 · partly |
| `semantic-bounds-transform` | PeachCreek#1 变换和裁剪后的语义区域 · Semantic bounds after transforms and clipping | 部分解决 · partly |
| `shape-mask-cost` | MechanismCity#3 形状遮罩的代价 · The cost of a shape mask | 部分解决 · partly |
| `skybox-black-software` | TeaHorseRoad#4 软件渲染下天空盒是黑的 · The skybox is black under software rendering | 未解决 · open |
| `spine-instance-limit` | LanternShadows#3 同一份骨骼数据最多 128 个 Spine 实例 · At most 128 Spine instances of one skeleton | 未解决 · open |
| `terrain-color-tile` | NineProvinces#6 地形流的 `colorAt` 只给地块内的坐标，不知道是哪一块 · The terrain stream's `colorAt` is given coordinates within a tile, and no way to tell which tile | 未解决 · open |
| `terrain-view-distance-budget` | NineProvinces#8 地形流视距稍大就抛 `WORLD3D_BUDGET` · The terrain stream throws `WORLD3D_BUDGET` for a view distance a little too large | 未解决 · open |
| `text-cache-budget-batch` | JY#1 同时准备很多文字时超出文字缓存的预算 · Preparing many texts at once passes the text cache's budget | 部分解决 · partly |
| `texture-from-canvas-scope` | NineProvinces#3 `textureFromCanvas` 的纹理只能归游戏本身的作用域 · Textures from `textureFromCanvas` belong to the game's own scope only | 未解决 · open |
| `two-bone-ik` | FiveRegiments#5 引擎没有现成的两骨反向动力学 · No two-bone IK in the engine | 未解决 · open |
| `ui-typography-styling` | PeachCreek#3 文字和按钮样式需要显示对象补充 · Typography and button styling need display-object extensions | 部分解决 · partly |
| `vertex-hook-error` | StarBanner#2 只有顶点钩子的着色器写进 `glsl` 时报错不直观 · A vertex-only hook given as `glsl` fails with an unhelpful error | 未解决 · open |
| `vertical-text` | InquestScrolls#1 段落不支持竖排 · Paragraphs cannot set text vertically | 部分解决 · partly |
| `webgpu-cold-atlas-upload` | NezhaSea#5 WebGPU 首次可见的图集可能在连续帧重复上传 · Two consecutive WebGPU frames can upload a cold atlas twice | 未解决 · open |
| `webgpu-compute` | SandScroll#5 WebGPU 没有开放计算通道 · No compute pass on WebGPU | 未解决 · open |
| `webgpu-headless-3d` | FiveRegiments#3 无头 Chromium 里 WebGPU 后端画不出 3D 画面 · The WebGPU backend draws no 3D scene in headless Chromium | 未解决 · open |

## 4. 各游戏 · By game

| 游戏 · Game | 笔记 · Notes | 未解决 · Open | 部分 · Partly | 绕过 · Worked around | 文档 · Documented | 已解决 · Resolved | 引擎已解决待去掉 · To take out | 引擎副本 · Engine pin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| [CanalWatch](../CanalWatch/ENGINE-NOTES.md) | 4 | 0 | 0 | 0 | 2 | 2 | 0 | `b5628eb` |
| [FengshenChronicle](../FengshenChronicle/ENGINE-NOTES.md) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | `60991a4` |
| [FivePhases](../FivePhases/ENGINE-NOTES.md) | 3 | 1 | 1 | 0 | 0 | 1 | 0 | `b5628eb` |
| [FiveRegiments](../FiveRegiments/ENGINE-NOTES.md) | 5 | 5 | 0 | 0 | 0 | 0 | 0 | `5792d80` |
| [FPS](../FPS/ENGINE-NOTES.md) | 5 | 0 | 1 | 0 | 2 | 2 | 0 | `b5628eb` |
| [InquestScrolls](../InquestScrolls/ENGINE-NOTES.md) | 12 | 0 | 1 | 2 | 1 | 8 | 0 | `95897d7` |
| [jelly-pandas](../jelly-pandas/ENGINE-NOTES.md) | 2 | 1 | 1 | 0 | 0 | 0 | 0 | `b5628eb` |
| [JY](../JY/ENGINE-NOTES.md) | 2 | 1 | 1 | 0 | 0 | 0 | 0 | `c1570b0` |
| [LanternShadows](../LanternShadows/ENGINE-NOTES.md) | 3 | 1 | 0 | 0 | 1 | 1 | 0 | `b5628eb` |
| [LoveElective](../LoveElective/ENGINE-NOTES.md) | 2 | 0 | 0 | 0 | 0 | 2 | 0 | `c1570b0` |
| [LubanBridge](../LubanBridge/ENGINE-NOTES.md) | 5 | 4 | 0 | 0 | 1 | 0 | 0 | `a7be833` |
| [MechanismCity](../MechanismCity/ENGINE-NOTES.md) | 20 | 1 | 2 | 0 | 5 | 12 | 0 | `687037a` |
| [NezhaSea](../NezhaSea/ENGINE-NOTES.md) | 5 | 1 | 0 | 0 | 1 | 3 | 0 | `b5628eb` |
| [NightWardens](../NightWardens/ENGINE-NOTES.md) | 3 | 0 | 0 | 0 | 3 | 0 | 0 | `a778bed` |
| [NineProvinces](../NineProvinces/ENGINE-NOTES.md) | 8 | 4 | 1 | 0 | 1 | 2 | 0 | `9d801be` |
| [OperaDrums](../OperaDrums/ENGINE-NOTES.md) | 5 | 0 | 0 | 0 | 2 | 3 | 0 | `b5628eb` |
| [PeachCreek](../PeachCreek/ENGINE-NOTES.md) | 9 | 0 | 4 | 0 | 0 | 5 | 0 | `95897d7` |
| [Rally](../Rally/ENGINE-NOTES.md) | 4 | 1 | 0 | 0 | 2 | 1 | 0 | `b5628eb` |
| [SandScroll](../SandScroll/ENGINE-NOTES.md) | 7 | 2 | 0 | 0 | 5 | 0 | 0 | `450bb9e` |
| [SnowTemple](../SnowTemple/ENGINE-NOTES.md) | 3 | 0 | 0 | 0 | 0 | 3 | 0 | `b5628eb` |
| [StarBanner](../StarBanner/ENGINE-NOTES.md) | 4 | 1 | 0 | 0 | 3 | 0 | 0 | `b3b5943` |
| [TaiwanMahjong](../TaiwanMahjong/ENGINE-NOTES.md) | 7 | 1 | 0 | 0 | 3 | 3 | 0 | `2e53f45` |
| [TeaHorseRoad](../TeaHorseRoad/ENGINE-NOTES.md) | 24 | 2 | 1 | 0 | 7 | 14 | 0 | `687037a` |
| [Wulin](../Wulin/ENGINE-NOTES.md) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | `b5628eb` |
