# 引擎笔记 · Engine notes

做这款游戏时遇到的新白鹭引擎（提交 `9d801be`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。前五条是第一版（平面天下图、`createBrowserGame`）遇到的，第六到第八条是改用 World3D 之后遇到的；八条都是本作新遇到的。现在的版本已不再用到前五条涉及的接口，记录留着供引擎参考。

The faults in the new Egret engine (commit `9d801be`) met while making this game, and suggestions, written as in part 3
of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md). The first five were met by the first version (a flat realm on
`createBrowserGame`), the sixth to the eighth after the move to World3D; all eight are new here. The game no longer
uses the interfaces of the first five; they are kept for the engine's sake.

### 1. 每个文字标签占一页图片，一百多个地名超出每帧 64 页 · Each label is a page of its own, and a hundred place names pass the 64 pages a frame — 已在 `4de55e8` 解决 / resolved in `4de55e8`
<!-- engine-note: {"id": "NineProvinces#1", "status": "resolved", "topic": "label-pages"} -->

- 现象：`createBrowserGame` 的 `createLabel` 每个标签各自栅格化成一页纹理。天下图有一百二十一处地名，再加上旗号，第一帧就报 `FRAME_IMAGE_BUDGET`（一帧最多 64 页、4,096 个区域）。 · What happens: each label from `createLabel` is rasterized into a texture page of its own. The realm has a hundred and twenty-one place names, and with the banners the first frame fails with `FRAME_IMAGE_BUDGET` (64 pages, 4,096 regions a frame).
- 绕过办法：地名、城的图标和城主的旗号都画在引擎画布下面的网页画布上（`src/view/mapview.mjs` 的 `paintBack`）；军团和战场部队旗上的字从一张共用的字符图集里按 `sourceRect` 取（`bannerAtlas`）。 · Workaround: names, city marks and lords' banners are painted on the page canvas under the engine's; the characters on army and unit banners are cut from one shared character atlas by `sourceRect`.
- 建议：给 `createLabel` 一个把多个标签排进同一页的选项（共享的文字图集），或在文档里写明每个标签一页、一帧 64 页的上限。 · Suggestion: an option for `createLabel` to pack many labels into one page (a shared text atlas), or a line in its documentation that each label is a page and a frame takes 64.
- 状态：已在 `4de55e8` 解决（引擎 #476）：同 InquestScrolls 第 8 条：`createAtlasLabel` 共用页面，一百个短标签只占一两页。 · Resolved in `4de55e8` (engine #476): as InquestScrolls item 8: `createAtlasLabel` shares pages, a hundred short labels taking a page or two.

### 2. `createBrowserGame` 的结果里没有画布，也没有舞台到页面的换算 · The game returned by `createBrowserGame` has no canvas and no stage-to-page conversion — 已写入文档 / documented
<!-- engine-note: {"id": "NineProvinces#2", "status": "documented", "topic": "browser-game-canvas"} -->

- 现象：返回的对象有 `toStage(clientX, clientY)`（页面到舞台），却没有反方向的换算，也没有 `canvas`。本作用 `fit: 'cover'`，画布比窗口大、居中裁掉一部分；网页画布上画的地图要和引擎画布上的军团对齐，就得知道画布在页面上的位置和大小。 · What happens: the object has `toStage(clientX, clientY)` (page to stage) but nothing the other way, and no `canvas`. This game uses `fit: 'cover'`, where the canvas is larger than the window and centred; to keep the map painted on the page canvas aligned with the armies on the engine canvas, the canvas's place and size on the page must be known.
- 绕过办法：自己保留传进去的画布，用它的 `getBoundingClientRect()` 和相机的 `screenToWorld` / `worldToScreen` 换算（`src/view/mapview.mjs`、`src/view/battleview.mjs` 的 `paintBack` 与 `pagePoint`）。 · Workaround: the game keeps the canvas it passed in and converts through its `getBoundingClientRect()` and the camera's `screenToWorld` / `worldToScreen`.
- 建议：在结果上提供 `canvas`，以及 `toClient(stageX, stageY)` 与 `toStage` 成对。 · Suggestion: expose `canvas` on the result, and a `toClient(stageX, stageY)` to pair with `toStage`.
- 状态：已写入文档（引擎 #485，`8637ace`）：同 NightWardens 第 3 条，写进 guide 卡片 camera-page-layer；结果上仍没有画布和成对的换算。 · Documented (engine #485, `8637ace`): as NightWardens item 3, in the camera-page-layer guide card; the result still has no canvas or paired conversion.

### 3. `textureFromCanvas` 的纹理只能归游戏本身的作用域 · Textures from `textureFromCanvas` belong to the game's own scope only — 未解决 / open
<!-- engine-note: {"id": "NineProvinces#3", "status": "open", "topic": "texture-from-canvas-scope", "workaround": ["src/main.mjs"]} -->

- 现象：`createLabel` 可以传 `scope`，`textureFromCanvas` 却没有这个选项，纹理一直留到整个游戏结束。每场战斗若各画一张旗字图集，打几十场就留下几十张。 · What happens: `createLabel` takes a `scope`, but `textureFromCanvas` does not, and its textures stay until the whole game ends. A character sheet drawn for each battle would leave dozens behind after dozens of battles.
- 绕过办法：开局时画一张包含所有势力旗号和全部姓氏的图集，天下图和每场战斗共用；粒子的光点也只做一次（`src/main.mjs` 的 `boot`）。每场战斗的显示对象和粒子放进 `engine.createScope()` 建的作用域，打完一起释放。 · Workaround: one atlas with every power's flag and every surname is drawn at the start and shared by the realm and every battle; the particles' dot is made once. Each battle's display objects and emitters go into a scope from `engine.createScope()` and are let go together.
- 建议：`textureFromCanvas(canvas, { scope })`，与 `createLabel` 一致。 · Suggestion: `textureFromCanvas(canvas, { scope })`, as `createLabel` has.
- 状态：未解决。 · Status: open.

### 4. 相机缩放超出范围时抛错而不是夹住 · The camera throws instead of clamping a zoom out of range — 未解决 / open
<!-- engine-note: {"id": "NineProvinces#4", "status": "open", "topic": "camera-zoom-clamp"} -->

- 现象：`createCamera2D` 的 `zoomTo` 和 `setZoom` 在值小于 `minZoom` 或大于 `maxZoom` 时抛 `CAMERA_OPTIONS_INVALID`。滚轮和双指缩放、按窗口算出的"全景"缩放都很容易越界一点点，于是整个帧回调中断。 · What happens: `zoomTo` and `setZoom` throw `CAMERA_OPTIONS_INVALID` for a value under `minZoom` or over `maxZoom`. A wheel or a pinch, or an overview zoom worked out from the window, easily goes a little past, and the frame's callback stops there.
- 绕过办法：每次缩放前自己夹在范围内（`src/view/mapview.mjs` 的 `zoomBy`、`focus`、`overview`；`src/view/battleview.mjs` 的 `zoomBy`、`frame`）。 · Workaround: the game clamps every zoom to the range first.
- 建议：缩放值越界时夹到范围内（只对 NaN、无穷和负数报错），或在文档里写明会抛错。 · Suggestion: clamp an out-of-range zoom (and throw only for NaN, infinities and negatives), or say in the documentation that it throws.
- 状态：未解决。 · Status: open.

### 5. 画面不变时帧循环也每帧整屏合成 · The frame loop composites the whole stage every frame even when nothing changes — 部分解决 / partly resolved
<!-- engine-note: {"id": "NineProvinces#5", "status": "partly", "topic": "on-demand-rendering", "workaround": ["src/main.mjs"]} -->

- 现象：`createBrowserGame` 的帧循环每帧都渲染并提交整张画布。在 SwiftShader 软件渲染下，一张 1600×900、像素比 0.75 的透明画布，什么都不动时每帧也要十几毫秒，标题页的帧时间 p95 因此在 33 ms 左右。 · What happens: the frame loop renders and presents the whole canvas every frame. Under SwiftShader, a clear 1600 × 900 canvas at three-quarter pixels costs over ten milliseconds a frame with nothing moving, and the title's p95 frame time sat near 33 ms.
- 绕过办法：软件渲染时像素比降到 0.75；标题改成静止画面，地图停稳后 `game.loop.stop()`，开局或进入开局设置时再 `start()`（`src/main.mjs` 的 `toTitle` 与 `wake`），标题的 p95 降到 16.7 ms。 · Workaround: three-quarter pixels under software rendering; the title is a still picture, with `game.loop.stop()` once the map has settled and `start()` again for the game or its setup; the title's p95 is 16.7 ms now.
- 建议：舞台没有变化（没有显示对象、纹理、相机改动）时跳过渲染和提交，或给帧循环一个"按需渲染"的模式。 · Suggestion: skip rendering and presenting when the stage has not changed (no display object, texture or camera touched), or give the frame loop a render-on-demand mode.
- 状态：部分解决（引擎 #470，`9f61336`）：`play` 有了 `renderMode: 'on-demand'`，画面不变时不提交；`createBrowserGame` 还没有。 · Partly resolved (engine #470, `9f61336`): `play` has `renderMode: 'on-demand'`, which submits nothing while the picture is unchanged; `createBrowserGame` does not yet.

### 6. 地形流的 `colorAt` 只给地块内的坐标，不知道是哪一块 · The terrain stream's `colorAt` is given coordinates within a tile, and no way to tell which tile — 未解决 / open
<!-- engine-note: {"id": "NineProvinces#6", "status": "open", "topic": "terrain-color-tile", "workaround": ["src/view3d/terrain.mjs"]} -->

- 现象：`createTerrainStream3D` 的 `terrain.colorAt(height, slope, x, z, out)` 对所有地块是同一个函数，`x`、`z` 是地块高度场内以中心为原点的坐标；地块的颜色要按天下的位置算（江河、沙漠、林地），函数里却拿不到地块的位置。 · What happens: `terrain.colorAt(height, slope, x, z, out)` of `createTerrainStream3D` is one function for every tile, and `x` and `z` are coordinates in the tile's own field, centred on it; the colours depend on where on the realm the tile is (rivers, desert, woods), but the function cannot learn the tile's place.
- 绕过办法：在 `load` 里算高度时一并算出这块的颜色，按高度场对象存进 `WeakMap`；`colorAt` 用普通函数写，靠调用时的 `this`（地块的 `Terrain3D`）取 `this.field` 查表（`src/view3d/terrain.mjs`）。这依赖引擎以 `this.#colorAt(...)` 的方式调用，属于未写进文档的行为。 · Workaround: the tile's colours are worked out with its heights in `load` and kept in a `WeakMap` by field; `colorAt` is a plain function and reads `this.field` from the `Terrain3D` it is called on. This leans on the engine calling it as `this.#colorAt(...)`, which is not documented.
- 建议：给 `colorAt` 加一个参数传地块（或地块原点的世界坐标），或者让流的 `terrain` 选项也能是 `(x, z, field) => TerrainOptions3D` 的函数，和 `material` 一样。 · Suggestion: pass the tile (or its world origin) to `colorAt`, or let the stream's `terrain` option be a function `(x, z, field) => TerrainOptions3D`, as `material` already may be.
- 状态：未解决。 · Status: open.

### 7. `app.stop()` 之后隔一阵再 `app.start()`，第一帧抛 `CLOCK_DELTA_LIMIT` · After `app.stop()`, `app.start()` a while later throws `CLOCK_DELTA_LIMIT` on its first frame — 已在 `5ef2b03` 解决 / resolved in `5ef2b03`
<!-- engine-note: {"id": "NineProvinces#7", "status": "resolved", "topic": "world3d-restart-clock", "workaround": ["src/main.mjs"]} -->

- 现象：页面隐藏时调用 `createWorld3DApp` 返回的 `app.stop()`，显示时再 `app.start()`，控制台报 `EgretError: CLOCK_DELTA_LIMIT`，循环停住。新起的 `startWorld3DLoop` 第一帧 `previous` 是空的，不做"间隔太长就重新锚定"的判断，直接把离上次很远的时间交给 `engine.advanceTime`。 · What happens: calling `app.stop()` of `createWorld3DApp` when the page is hidden and `app.start()` when it is shown logs `EgretError: CLOCK_DELTA_LIMIT` and the loop stops. The new `startWorld3DLoop` has no `previous` on its first frame, so it skips its re-anchoring for a long gap and hands `engine.advanceTime` a time far from the last.
- 绕过办法：隐藏时 `app.stop()` 后 `engine.clock.pause()`，显示时先 `engine.clock.resume()` 再 `app.start()`（`src/main.mjs`）。 · Workaround: `engine.clock.pause()` after `app.stop()` when hidden, and `engine.clock.resume()` before `app.start()` when shown.
- 建议：`app.start()` 时先让时钟丢掉旧锚点（`pause()` 再 `resume()`），或让循环第一帧也做重新锚定。 · Suggestion: have `app.start()` drop the clock's old anchor (`pause()` then `resume()`), or let the loop's first frame re-anchor too.
- 状态：已在 `5ef2b03` 解决（引擎 #479）：同一引擎上重启 World3D 显示循环时，过大的第一帧会重新锚定时钟。 · Resolved in `5ef2b03` (engine #479): restarting the World3D display loop on the same engine re-anchors an oversized first frame.

### 8. 地形流视距稍大就抛 `WORLD3D_BUDGET` · The terrain stream throws `WORLD3D_BUDGET` for a view distance a little too large — 未解决 / open
<!-- engine-note: {"id": "NineProvinces#8", "status": "open", "topic": "terrain-view-distance-budget", "workaround": ["src/view3d/terrain.mjs"]} -->

- 现象：`stream.viewDistance` 设得大一些（64 单位的地块、视距 380 左右），`update` 时保留范围超过 256 块，抛 `WORLD3D_BUDGET: terrain stream tile range`，整个帧回调中断。保留范围是视距的 1.25 倍加四分之一块，文档写了上限，但离抛错还差多少要自己算。 · What happens: with a larger `stream.viewDistance` (tiles of 64 units, a view distance near 380), the retained range in `update` passes 256 tiles and it throws `WORLD3D_BUDGET: terrain stream tile range`, stopping the frame's callback. The range is 1.25 times the view distance plus a quarter tile; the limit is documented, but how close one is to it must be worked out by hand.
- 绕过办法：视距随镜头远近变化，但夹在 290 以内（`src/view3d/terrain.mjs`）。 · Workaround: the view distance follows the camera but is clamped to 290.
- 建议：超出时把视距夹到上限并给一次警告，或提供 `maxViewDistance` 只读值。 · Suggestion: clamp the view distance to the limit with one warning, or expose a read-only `maxViewDistance`.
- 状态：未解决。 · Status: open.

### 9. 移动 Apple WebKit 动态分辨率后画面不可见 · Mobile Apple WebKit loses the composited World3D surface after dynamic resizing — 未解决 / open
<!-- engine-note: {"id": "NineProvinces#9", "status": "open", "topic": "world3d-webkit-dynamic-resize-presentation", "workaround": ["src/view3d/canvas-policy.mjs", "src/view3d/stage.mjs"]} -->

- **现象 · What happens**：Windows Playwright WebKit 26.6 iPhone 15 Pro 配置下，Renderer frame 递增且 draw calls 非零，但自适应缩至 235×395 后 3D 不可见、只剩界面。 · Renderer frames and draw calls advance, yet the composited 3D surface is absent after adapting down to 235×395.
- **最小复现 · Reproduce**：从公开页沿 New campaign → start → city map 进入 393×659 CSS 尺寸的实际场景，查看截图而非仅检查语义或渲染器计数。 · Enter the actual scene at 393×659 CSS px and compare screenshots, not only semantics or submission statistics.
- **绕过 · Workaround**：移动 Apple WebKit 通过官方 `dynamicResolution:false` 固定背缓冲；同条件 393×659 可见。 · Request the official option only on mobile Apple WebKit, restoring visible pixels with stable backing dimensions.
- **建议 · Proposal**：引擎验证动态尺寸变化后在 WebKit 中的浏览器呈现，提供诊断及无需关闭动态分辨率的修复。 · Validate browser presentation after backing-buffer changes and supply a diagnostic and a fix without requiring dynamic resolution to be disabled.
- **状态 · Status**：游戏侧已通过关键截图复测，保留原质量选择。固定 backing buffer 可能增加像素渲染开销；未进行实体 iPhone 性能或其他 Safari 版本验收。 · Game workaround passes visible screenshots and preserves quality options. Fixed backing may increase pixel cost; physical iPhone performance and other Safari versions remain untested.
