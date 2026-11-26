# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（最初为提交 `c049bc3`，2026-11-21 升级到 `b5628eb`，2026-11-26 升级到 `8e70dcb3`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (first `c049bc3`, `b5628eb` since 2026-11-21, and `8e70dcb3` since 2026-11-26) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. 迟出现的着色器在第一次绘制时链接 · Late programs link on their first draw — 已在 `8b634fe` 解决 / resolved in `8b634fe`
<!-- engine-note: {"id": "SnowTemple#1", "status": "resolved", "topic": "first-draw-program-link", "workaround": ["src/view/view.mjs"]} -->

- 现象 · What happens：淡出的屋顶和松树、法阵、脚印、落枪这些开局后才出现的材质，第一次绘制时链接着色器，打斗中出现停顿。 · Materials that appear after the start (faded roof and pines, the formation, footprints, falling spears) linked their programs on first draw and stalled the fight.
- 游戏里 · In the game：起初在加载画面下把这些网格隐藏着画一帧（`43466ba`、`8e152a4`）；引擎 `8b634fe` 提供 `renderer.preparePrograms` 后，`src/view/view.mjs` 的 `view.preparePrograms` 把它们列成描述符交给引擎（`58554b3`）。 · At first a hidden frame under the loading screen; since engine `8b634fe`, a list of descriptors given to `renderer.preparePrograms`.
- 建议 · Suggestion：描述符要写清雾、阴影、镜像通道等每种变体，容易漏；引擎可以从场景里自动收集。 · Every variant (fog, shadows, the mirror pass) must be named; the engine could gather them from the scene.
- 状态 · Status：原生准备接口已解决，本作已改用。现有 `view.preparePrograms` 以普通弓弦和铜钱网格作为代表，调用 `renderer.preparePrograms(requests, { includeAutoInstancing: true })` 由引擎准备自动实例化伴随程序；保留透明淡出材质、自带实例 RGBA 的足迹、落枪等请求及场景雾、环境、接收阴影标志。分阶段角色模型仍走各自的准备流程。`test/program-warmup.test.mjs` 核查描述符与选项，首帧及首次出现的实际耗时另见 [QUALITY.md](QUALITY.md)。 · The native preparation API is in use. Ordinary bowstring and coin meshes represent automatic batch variants passed with `includeAutoInstancing: true`; translucent fades, authored RGBA instance effects and scene variants remain explicit. Staged character preparation is unchanged. The descriptor test checks the inputs, separate from device first-use timings in QUALITY.md.

### 2. 镜面倒影要来回切换渲染器的色调映射 · The mirror had to switch the renderer's tone mapping back and forth — 已在 `8b634fe` 解决 / resolved in `8b634fe`
<!-- engine-note: {"id": "SnowTemple#2", "status": "resolved", "topic": "mirror-tone-mapping", "workaround": ["src/view/view.mjs"]} -->

- 现象 · What happens：湿石板的平面倒影需要和主画面不同的色调映射，只能在每次镜像绘制前后改渲染器的设置。 · The wet flagstones' planar mirror needed a tone mapping of its own, so the renderer's setting was switched around every mirror draw.
- 游戏里 · In the game：引擎 `8b634fe` 给平面反射通道加了自己的设置，`src/view/view.mjs` 给 `PlanarReflection3D` 单独设色调映射，回到湿石板时立刻刷新一次（`58554b3`）。 · The engine's planar reflection pass now has its own settings; the mirror is given its own tone mapping and refreshed at once on return.
- 建议 · Suggestion：无 · none.
- 状态 · Status：已解决，本作已改用 · resolved and in use.

### 3. 每帧只有八盏点光源 · Eight point lights a frame — 已在 `e5cc13b` 解决 / resolved in `e5cc13b`
<!-- engine-note: {"id": "SnowTemple#3", "status": "resolved", "topic": "point-light-limit"} -->

- 现象 · What happens：庙前和草料场有多盏灯，再加上地上的火和烧着的人，超过八盏点光后多出来的不照亮任何东西。 · With the lamps plus fire on the ground and burning men, lights past the eighth lit nothing.
- 游戏里 · In the game：灯只点亮最近的六盏；火光用引擎 `e5cc13b` 起的分块点光源（`renderer.tiledLights`，最低画质不开），只有被照到的像素付出代价，没有东西烧着时没有开销（`e99e4e4`）。 · The six nearest lamps are lit; fires use the engine's tiled point lights, off at the lowest quality.
- 建议 · Suggestion：分块点光不投影，火光照不出影子；以后可以考虑给少量分块光加阴影。 · Tiled lights cast no shadow; a few shadowed tiled lights would help.
- 状态 · Status：已解决，本作已改用 · resolved and in use.

### 4. Windows ANGLE D3D11 高画质阴影接收导致上下文丢失 · Directional-shadow receivers lose the Windows WebGL2 context — 已在 `bd012daf` 解决 / resolved in `bd012daf`
<!-- engine-note: {"id": "SnowTemple#4", "status": "resolved", "topic": "world3d-directional-shadow-receiver", "workaround": ["src/main.mjs"]} -->

- 现象 · What happens：旧引擎 `c049bc3` 下，Windows RTX 5090 Laptop GPU（ANGLE D3D11）在首次方向光阴影接收绘制时发生 WebGL2 上下文丢失。引擎团队随后在高画质的标准材质场景中复现，并通过仅关闭阴影接收而不是关闭 SSAO 证实触发路径。 · The old engine lost its WebGL2 context on the RTX 5090 Laptop with ANGLE D3D11 during the first directional-shadow receiver. The engine-side high-quality fixture isolated the receiver rather than SSAO.
- 游戏里 · In the game：旧本地验收版本曾识别该显卡／驱动组合并默认禁用阴影。更新引擎后已移除该硬件特例；中、高画质正常开启阴影，`?noshadows` 仅作为同配置的主动对照诊断。 · A former local acceptance build disabled shadows for that exact adapter. The updated Demo removes the hardware exception, keeps normal medium/high shadows and offers an explicit comparison switch only.
- 建议 · Suggestion：保留方向光阴影和 SSAO，不依赖显卡名称绕过故障；修复级联索引、范围和接收路径。 · Fix cascade selection and receiver code while retaining directional shadows and SSAO, without adapter-name exceptions.
- 状态 · Status：引擎 [#375](https://github.com/cnedwin/Egret_rebuild/pull/375) 已在 `bd012daf` 合并，通过四个固定向量分量选择级联及远边界；引擎自身同一硬件复现从一帧后全黑恢复到 120 次回调中 119 次更新、零上下文丢失。该修复已包含在本 Demo 的旧 `b5628eb` 与现 `8e70dcb3` 副本中。以上是引擎用例的结果，不替代本游戏的新版真机验收；游戏实测见 [QUALITY.md](QUALITY.md)。 · Engine #375 (`bd012daf`) uses fixed vector components for cascade selection. Its hardware fixture recovered from a black canvas after one update to 119 updates in 120 callbacks, with no lost contexts. Both the previous `b5628eb` and current `8e70dcb3` copies contain the fix. These are engine fixture results, not a device acceptance claim for the Demo; see [QUALITY.md](QUALITY.md) for game measurements.
