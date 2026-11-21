# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（提交 `c049bc3`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (commit `c049bc3`) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. 迟出现的着色器在第一次绘制时链接 · Late programs link on their first draw — 已在 `8b634fe` 解决 / resolved in `8b634fe`

- 现象 · What happens：淡出的屋顶和松树、法阵、脚印、落枪这些开局后才出现的材质，第一次绘制时链接着色器，打斗中出现停顿。 · Materials that appear after the start (faded roof and pines, the formation, footprints, falling spears) linked their programs on first draw and stalled the fight.
- 游戏里 · In the game：起初在加载画面下把这些网格隐藏着画一帧（`43466ba`、`8e152a4`）；引擎 `8b634fe` 提供 `renderer.preparePrograms` 后，`src/view/view.mjs` 的 `view.preparePrograms` 把它们列成描述符交给引擎（`58554b3`）。 · At first a hidden frame under the loading screen; since engine `8b634fe`, a list of descriptors given to `renderer.preparePrograms`.
- 建议 · Suggestion：描述符要写清雾、阴影、镜像通道等每种变体，容易漏；引擎可以从场景里自动收集。 · Every variant (fog, shadows, the mirror pass) must be named; the engine could gather them from the scene.
- 状态 · Status：已解决，本作已改用 · resolved and in use.

### 2. 镜面倒影要来回切换渲染器的色调映射 · The mirror had to switch the renderer's tone mapping back and forth — 已在 `8b634fe` 解决 / resolved in `8b634fe`

- 现象 · What happens：湿石板的平面倒影需要和主画面不同的色调映射，只能在每次镜像绘制前后改渲染器的设置。 · The wet flagstones' planar mirror needed a tone mapping of its own, so the renderer's setting was switched around every mirror draw.
- 游戏里 · In the game：引擎 `8b634fe` 给平面反射通道加了自己的设置，`src/view/view.mjs` 给 `PlanarReflection3D` 单独设色调映射，回到湿石板时立刻刷新一次（`58554b3`）。 · The engine's planar reflection pass now has its own settings; the mirror is given its own tone mapping and refreshed at once on return.
- 建议 · Suggestion：无 · none.
- 状态 · Status：已解决，本作已改用 · resolved and in use.

### 3. 每帧只有八盏点光源 · Eight point lights a frame — 已在 `e5cc13b` 解决 / resolved in `e5cc13b`

- 现象 · What happens：庙前和草料场有多盏灯，再加上地上的火和烧着的人，超过八盏点光后多出来的不照亮任何东西。 · With the lamps plus fire on the ground and burning men, lights past the eighth lit nothing.
- 游戏里 · In the game：灯只点亮最近的六盏；火光用引擎 `e5cc13b` 起的分块点光源（`renderer.tiledLights`，最低画质不开），只有被照到的像素付出代价，没有东西烧着时没有开销（`e99e4e4`）。 · The six nearest lamps are lit; fires use the engine's tiled point lights, off at the lowest quality.
- 建议 · Suggestion：分块点光不投影，火光照不出影子；以后可以考虑给少量分块光加阴影。 · Tiled lights cast no shadow; a few shadowed tiled lights would help.
- 状态 · Status：已解决，本作已改用 · resolved and in use.
