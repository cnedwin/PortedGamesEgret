# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（最初为提交 `264e172`，2026-11-21 升级到 `b5628eb`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (first `264e172`, `b5628eb` since 2026-11-21) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. 每帧只有八盏点光源被完整照亮 · Only eight point lights a frame are fully lit — 已在 `e5cc13b` 解决 / resolved in `e5cc13b`
<!-- engine-note: {"id": "FPS#1", "status": "resolved", "topic": "point-light-limit", "workaround": ["src/main.mjs", "src/view.mjs"]} -->

- 现象 · What happens：水电站有十几盏灯，超过八盏后多出来的没有照明效果，哪几盏亮也会随镜头跳变。 · The station has more than a dozen lamps; past eight the extra ones lit nothing, and which ones lit jumped with the camera.
- 游戏里 · In the game：中、高画质下打开 `renderer.tiledLights`，所有灯都亮（每盏有 `range: 20`），第八盏以后由引擎按屏幕分块照亮；低画质或 `?lights=near` 时仍只给离镜头最近的五盏灯强度，其余按距离渐隐（`src/main.mjs` 的 `applyQuality`、`src/view.mjs` 的 `setTiledLamps`）。 · At medium and high quality `renderer.tiledLights` is on and every lamp is lit, those past the eighth by tile; at low quality, or with `?lights=near`, only the nearest five are lit.
- 建议 · Suggestion：引擎在 `e5cc13b` 加了按屏幕分块照亮的点光源（第八盏之后最多再 256 盏，需要 `range`，不投影）。 · Engine `e5cc13b` lights point lights past the eighth by screen tile (they need a `range` and cast no shadow).
- 状态 · Status：引擎已解决，本作 2026-11-21 改用（无头 Chromium 中等画质下 `renderer.info.lightsTiled` 为 2，没有控制台错误） · resolved, and in use here since 2026-11-21 (two lamps lit by tile in a headless run at medium quality, clean console).

### 2. 加色混合的材质不设混合模式就画成不透明方块 · Additive materials draw as opaque squares unless set to blend — 已写入文档 / documented
<!-- engine-note: {"id": "FPS#2", "status": "documented", "topic": "additive-material-blend", "workaround": ["src/view.mjs", "src/gun.mjs", "src/scenery.mjs"]} -->

- 现象 · What happens：太阳光晕、枪口火光、瞄具红点只设了 `blending: 'additive'`，画出来是黑底的方块。 · The sun halo, muzzle flash and sight dot, with only `blending: 'additive'`, drew as squares on black.
- 游戏里 · In the game：这些材质一律写 `alphaMode: 'blend'`、`blending: 'additive'`、`depthWrite: false`（`src/view.mjs`、`src/gun.mjs`、`src/scenery.mjs`）。 · All of them set `alphaMode: 'blend'`, `blending: 'additive'` and `depthWrite: false`.
- 建议 · Suggestion：`blending: 'additive'` 而 `alphaMode` 仍是 `opaque` 时，引擎可以给出警告，或默认改用 `blend`。 · The engine could warn about, or default to `blend` for, an additive material left opaque.
- 状态 · Status：引擎 guide 卡片 `world3d-lights-shadows` 已写明这条规则 · the engine's world3d-lights-shadows card states the rule.

### 3. 某一块显卡上接收阴影的着色器丢失 WebGL 上下文 · The shadow-receiving shader loses the WebGL context on one adapter — 已写入文档 / documented
<!-- engine-note: {"id": "FPS#3", "status": "documented", "topic": "shadow-shader-context-loss", "workaround": ["src/main.mjs"]} -->

- 现象 · What happens：RTX 5090 Laptop GPU（0x00002C58）在 Edge 的 ANGLE Direct3D11 下，开启实时阴影后 WebGL 上下文丢失。 · On an RTX 5090 Laptop GPU under ANGLE Direct3D11 in Edge, the WebGL context was lost with live shadows on.
- 游戏里 · In the game：`src/main.mjs` 读 `WEBGL_debug_renderer_info`，只对这一适配器关闭实时阴影，环境遮蔽、反射和后期处理照常。 · Only that adapter has live shadows switched off; ambient occlusion, reflections and post-processing stay.
- 建议 · Suggestion：查明是哪一段着色器触发的；在引擎里提供按适配器关闭阴影的统一开关，并在上下文丢失时报出是哪条管线。 · Find which shader part causes it; offer an engine-level per-adapter shadow switch and name the pipeline when the context is lost.
- 状态 · Status：原因未查明；guide 卡片 `world3d-lights-shadows` 记录了绕过办法 · cause unknown; the workaround is in the world3d-lights-shadows card.

### 4. 材质变体第一次绘制时链接着色器造成停顿 · The first draw of a material variant stalls while its program links — 部分解决 / partly resolved
<!-- engine-note: {"id": "FPS#4", "status": "partly", "topic": "first-draw-program-link", "workaround": ["src/view.mjs"]} -->

- 现象 · What happens：点击开始后第一次出现普通双面补给箱时，主图和镜面两种材质路径首次链接，出现约 130 ms 的两次停顿。 · When the first ordinary two-sided crate appeared, its main and mirror paths linked for the first time: two stalls of about 130 ms.
- 游戏里 · In the game：`src/view.mjs` 的 `view.warm` 在加载提示下把这两种路径和各种特效在地图下方真实画一遍，不推进游戏时间，再回到标题。 · `view.warm` draws both paths and every effect once below the map under the loading screen, without advancing game time.
- 建议 · Suggestion：引擎在 `ee94fa5` 加了 `renderer.preparePrograms`，本作副本已包含但还没用：`view.warm` 是按实测的两种路径写的，换成描述符需要在真显卡上重新量停顿，2026-11-21 升级引擎时没有动它；可以把 `view.warm` 换成描述符列表。难以描述的变体（实例化与非实例化、镜面通道）最好由引擎从场景里自动收集。 · Engine `ee94fa5` added `renderer.preparePrograms`, which this copy has but does not use yet; variants that are hard to describe could be collected from the scene by the engine.
- 状态 · Status：引擎提供了预编译接口；游戏仍用自己的预绘 · the engine offers a prepare call; the game still draws its own warm-up.

### 5. 引擎没有读取"减少动态效果"的现成办法 · No ready way to read the system's reduced-motion setting — 已在 `1b40619` 解决 / resolved in `1b40619`
<!-- engine-note: {"id": "FPS#5", "status": "resolved", "topic": "reduced-motion-setting", "workaround": ["src/main.mjs", "src/view.mjs"]} -->

- 现象 · What happens：品质验收 A3 不达标：中弹、开火和爆炸时镜头一直在抖，系统打开"减少动态效果"后也一样。 · Quality item A3 failed: the camera shook on hits, shots and blasts even with the system set to reduce motion.
- 游戏里 · In the game：`src/main.mjs` 用 `@egret/engine/web/kit` 的 `prefersReducedMotion()` 读设置、`watchReducedMotion()` 跟随变化；`src/view.mjs` 在 `view.reducedMotion` 为真时不晃镜头，爆炸闪光减弱到三分之一。 · The game reads the setting with `prefersReducedMotion()` and follows changes with `watchReducedMotion()`; with it on, the camera does not shake and blasts flash at a third.
- 建议 · Suggestion：无 · none.
- 状态 · Status：引擎已提供，本作 2026-11-21 起使用 · provided by the engine and used here since 2026-11-21.
