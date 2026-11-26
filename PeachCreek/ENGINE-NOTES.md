# 引擎笔记 · Engine notes

早期适配使用白鹭主干 `95897d78095ae8fda9e34dbc13bbbd15db8eaa12`。复跑游戏全流程可用 `node test/accept.mjs`。副本和入口见 [vendor/SOURCE.md](vendor/SOURCE.md)。

The previous integration used Egret main at `95897d78095ae8fda9e34dbc13bbbd15db8eaa12`. Run `node test/accept.mjs` for the full route. The [vendor record](vendor/SOURCE.md) lists the source and entries.

本轮引擎集成：主干 `94bd70fb26b1f81794c9c6fbbb258c655fcd19df`（#502–#506），按需采用原生能力；下列原先的版本号保留作为问题发生时的历史。

This integration vendors official main `94bd70fb26b1f81794c9c6fbbb258c655fcd19df` (#502–#506), adopting native capabilities where equivalent; older revisions below are historical evidence.

### 1. 变换和裁剪后的语义区域 · Semantic bounds after transforms and clipping — 部分解决 / partly resolved
<!-- engine-note: {"id": "PeachCreek#1", "status": "partly", "topic": "semantic-bounds-transform"} -->

- 现象：在旧版 `51b6175d`，将 `game.show` 父面板左移 75 并裁到高度 20 后，初始区域为 `(620, 430, 120, 42)` 的子按钮仍可被语义测试激活。 · On `51b6175d`, moving a parent left by 75 and clipping it to 20 left its initially reported `(620, 430, 120, 42)` child button accessible and actionable.
- 绕过办法：点选和定位直接使用 `view.visibleRect()` 的原生裁剪矩形，动态名称交给 `binding.label`，点击来源交给原生 activation；不再缓存语义描述函数或使用可变的输入来源代理。仍保留标签页、标题和弹窗的专用语义角色、选中状态与返回焦点策略。 · Hit testing and positioning use native `view.visibleRect()`, dynamic names use `binding.label`, and tap origin uses native activation; the cached semantic bounds and mutable input-origin bridge are removed. Specialized tab, heading and dialog roles, selected state and focus policy remain.
- 建议：开放声明式视图的主动聚焦与角色绑定，供业务设置标签选中、焦点返回和自动化定位。 · Expose programmatic focus and declarative semantic roles for selection, focus return and automation.
- 状态：引擎 #499 已提供裁剪矩形、点击来源、动态名称和装饰排除。本作已接入；特定角色与焦点策略继续保留。 · Engine #499 provides clipped bounds, activation source, dynamic labels and decorative exclusion. The game uses these while retaining specialized roles and focus policy.

### 2. 经营单子的原生滚动 · Native scrolling for county inspectors — 部分解决 / partly resolved
<!-- engine-note: {"id": "PeachCreek#2", "status": "partly", "topic": "native-scrolling"} -->

- 现象：经营单子需要可滚动的长列表、内容刷新后保留偏移和键盘继续到下一行。这些交互曾由 Demo 独立组合。 · County sheets need long scrolling lists, offset retention across refreshes, and keyboard traversal into the next row. The demo formerly composed those interactions itself.
- 绕过办法：使用 `game.show` 的 `scroll: 'vertical'` 面板。引擎负责滚轮、触屏拖动和裁剪，游戏沿用原有滚动指示和键盘导航，并保留资源栏的水平滚动。 · The inspector now uses a `scroll: 'vertical'` panel. The engine handles wheel, touch drag and clipping. The game retains its indicator, keyboard traversal and horizontal resource scrolling.
- 建议：为面板增加原生滚动指示或偏移变化回调，并解决第 9 项的离屏捕获。 · Add a native indicator or a scroll-change callback and address offscreen capture in item 9.
- 状态：原生垂直滚动已通过接入测试。 · Native vertical scrolling passed integration tests.

### 3. 文字和按钮样式需要显示对象补充 · Typography and button styling need display-object extensions — 部分解决 / partly resolved
<!-- engine-note: {"id": "PeachCreek#3", "status": "partly", "topic": "ui-typography-styling"} -->

- 现象：标题字需要字体和行距。建筑按钮需要名称、两行以上的说明、选址得分和资源限制。新版声明式部件有图片与富文字入口。本作仍需既有字距、分行、描边和程序生成的建筑预览。 · The title needs typeface and leading. Building options need a name, multiple lines of description, site efficiency and resource constraints. The current declarative API offers images and rich text. The demo still needs its existing tracking, line breaks, outlines and procedural building previews.
- 绕过办法：应用换行以保持中英文可读，标题用 `game.browser.createLabel`，卡片用 `Graphics` 描边和渐变。建筑预览用引擎纹理和 Bitmap。按钮保留原生的点击与语义行为。 · The project wraps Chinese and English text locally, uses `game.browser.createLabel` for title typography, draws panel borders and gradients with `Graphics`, and displays building previews as engine bitmaps. Native buttons retain tap and semantic actions.
- 建议：为文字开放字体回退、行距、宽度与截断；为按钮开放带焦点样式的内容节点；为视图增加 image/nine-slice 和逐项皮肤。 · Expose font fallback, leading, width and truncation on text, button content with focus styling, and image/nine-slice parts with per-item skins.
- 状态：部分解决。引擎 #499 提供单行字体、字重、斜体和版本就绪接口，以及 UI 图集像素对齐。本作继续使用 `createLabel` 实现多行标题与指定行距，并将其栅格原点对齐实际画布像素。 · Partly resolved. Engine #499 provides short-label typography, revision readiness and UI atlas pixel alignment. The game retains `createLabel` for multiline title and leading, and aligns its raster origin to backing pixels.

- 本轮实测 · Integration evidence：新版空文字语义处理会隐藏美术层单独绘字的离线收益和坏档提示；改用原生 bind.label 保留语义名称，保留美术画字与 tab/heading 角色扩展。完整浏览器验收复测通过。 · Native bound labels now retain the accessible names of artwork-rendered text; the original away report and corrupt-slot checks pass. Visual decoration and tab/heading semantics remain custom.

### 4. 等比留边的网页语义投影 · Browser semantic projection on a letterboxed canvas — 已在 95897d78 解决 / resolved in 95897d78
<!-- engine-note: {"id": "PeachCreek#4", "status": "resolved", "topic": "semantic-letterbox"} -->

- 现象：旧版在 CSS translate/scale 的画布祖先下启动 `createBrowserSemantics`，得到 `UI_SEMANTICS_SURFACE_INVALID`。 · The older adapter rejected a canvas under CSS translate/scale with `UI_SEMANTICS_SURFACE_INVALID`.
- 绕过办法：保留已经验收的宿主位置和尺寸设置。当前白鹭支持正轴缩放和平移并提供定比留边示例。 · The game keeps its verified explicit host dimensions and position. The current engine supports positive axis-aligned scaling and translation and documents a letterboxed example.
- 建议：在新的响应式页面中沿用白鹭的留边示例。 · Use the engine's letterbox example for new responsive hosts.
- 状态：支持范围内的变换以及示例已由引擎提供。 · Supported transforms and the example are available upstream.

### 5. 画布像素尺寸与设计尺寸的分离 · Canvas resolution and design dimensions — 已在 95897d78 解决 / resolved in 95897d78
<!-- engine-note: {"id": "PeachCreek#5", "status": "resolved", "topic": "play-resolution"} -->

- 现象：旧版县城需要单独控制渲染分辨率，统一逻辑画布和输入位置。 · The earlier integration needed a separate raster resolution while retaining its layout and input coordinates.
- 绕过办法：引擎提供 `play({ pixelRatio })`。旧集成默认 DPR 使 1280×720 显示面只有 960×540 背面像素；本轮用 `uiRenderDensity` 按 CSS 适配尺寸和实际 DPR 计算倍率，触屏设备同时预留旋转与浏览器工具栏变化，设定像素预算。逻辑布局仍保持原值。 · `play({ pixelRatio })` separates layout and raster sizing. The old default DPR produced only 960×540 backing pixels for a 1280×720 CSS surface; this integration chooses density from fitted physical viewport pixels, reserves both touch orientations and browser chrome changes, and caps the pixel budget without changing layout.
- 建议：继续建议提供安全的运行时像素倍率更新（当前倍率在宿主创建后固定），以便大幅扩窗或 Fold 更换内外屏时同步调整背面与文字栅格；已有横竖屏通过预留密度覆盖。 · A safe runtime density update would help very large window resizes or switching foldable panels: density is currently fixed at host creation. Both ordinary orientations are covered by the reserved density.
- 状态：引擎已提供独立倍率；本作实测修正显示欠采样，字体、命中与滚动通过回归。 · The independent multiplier is used to correct the measured undersampling, with text, hit testing and scroll regression.

### 6. 存档更新与预制绘图对象 · Save updates and convenience drawing objects — 部分解决 / partly resolved
<!-- engine-note: {"id": "PeachCreek#6", "status": "partly", "topic": "save-update-return"} -->

- 现象：存档 `update` 会把意外返回的值用作新数据。`game.rect` 的颜色在构造时写入绘图，季节变化时要重画。`game.burst` 使用世界坐标。 · Save `update` treats an incidental callback return value as replacement data. A `game.rect` stores its colour in its initial drawing. `game.burst` accepts world coordinates.
- 绕过办法：存档原地修改回调不返回值。会变色的天气图形和选框用 Sprite 的 graphics 重画，粒子通过 `toWorld` 传入换算后的坐标。 · In-place save callbacks return nothing. Sprite graphics redraw changing weather and focus visuals. `toWorld` converts coordinates for particles.
- 建议：区分可变更新和全量替换 API，补充可变形状的填充属性和局部坐标版粒子入口。 · Separate mutation from replacement, add mutable fill for convenience shapes, and accept a local coordinate layer for particles.
- 状态：部分解决（引擎 #424，`1e60300`）：`save.update` 改的是副本，被拒时不动内存；可变形状的填充和局部坐标粒子入口还没有。 · Partly resolved (engine #424, `1e60300`): `save.update` changes a copy and a refused update leaves memory alone; fills for mutable shapes and a local-space particle entry are not there yet.

### 7. 浏览器常用图像格式与封面重试 · Browser image formats and cover retry — 已在 95897d78 解决 / resolved in 95897d78
<!-- engine-note: {"id": "PeachCreek#7", "status": "resolved", "topic": "image-formats"} -->

- 现象：旧版对 WebP 封面报告 `ASSET_LOAD_FAILED`，底层原因为 `WEB_PNG_STRUCTURE_INVALID`。 · The former WebP cover request reported `ASSET_LOAD_FAILED` caused by `WEB_PNG_STRUCTURE_INVALID`.
- 绕过办法：直接使用 `game.browser.loadTexture`。游戏保留原有封面、过滤方式、降级显示和重试按钮。 · The game now uses `game.browser.loadTexture`, retaining the original artwork, filter, fallback and retry button.
- 建议：继续覆盖真实失败和恢复路径。 · Keep the actual failure and recovery path under test.
- 状态：阻断 WebP 请求后，标题仍可交互。解除阻断，实际点击重试恢复原图。 · Blocking the WebP request kept the title interactive. Removing the block and clicking Retry restored the art.

### 8. 静止界面按需提交 · On-demand rendering for a still interface — 已在 95897d78 解决 / resolved in 95897d78
<!-- engine-note: {"id": "PeachCreek#8", "status": "resolved", "topic": "on-demand-rendering"} -->

- 现象：旧版持续重绘的标题在 1280×800 Chromium/SwiftShader 上，浏览器帧间隔 P95 曾达 70.8 ms。Demo 曾自行启停循环。 · The continuously drawn title reached a browser interval P95 of 70.8 ms in the earlier 1280×800 Chromium/SwiftShader run. The demo used to manage loop start and stop itself.
- 绕过办法：使用 `play({ renderMode: 'on-demand' })`。浏览器确认静止期间帧提交计数保持不变，时钟继续推进，输入后图像恢复更新。 · The game now uses `play({ renderMode: 'on-demand' })`. The browser confirmed that submissions stay unchanged while idle, clock steps continue, and input resumes drawing.
- 建议：继续覆盖密度调整、异步图文就绪和后台恢复。 · Keep density changes, asynchronous artwork/text and foreground restoration in coverage.
- 状态：标题旧的启停循环已移除。 · The old title loop controls were removed.

### 9. 滚动裁剪外的文字仍计入帧图片预算 · Clipped labels still debit the frame image budget — 已在 `a7be833` 解决 / resolved in `a7be833`
<!-- engine-note: {"id": "PeachCreek#9", "status": "resolved", "topic": "clipped-image-budget"} -->

- 现象：用白鹭原生垂直滚动面板挂载完整英文建造清单，在 Edge 上打开空地单子会报 `FRAME_IMAGE_BUDGET`。当时视区只显示约六个选项，完全裁掉的内容也进入共享帧捕获的纹理预算。 · In Edge, opening a full English construction list with native vertical scrolling hit `FRAME_IMAGE_BUDGET`. About six actions were visible. Fully clipped descendants still entered the shared-frame image budget.
- 复现：让原生滚动面板保持固定高度，放入足够多的不同文字项以越过 64 个图片页，再在顶部绘制。 · Put enough distinct text items to exceed 64 image pages into a fixed-height native scroll viewport and render at the top.
- 绕过办法：原先捕获前手动将离屏行设为透明。本轮使用已修复的原生裁剪捕获，移除该透明化与恢复逻辑，保留滚动指示和焦点。 · The previous workaround set offscreen rows transparent before capture. This integration removes the workaround and relies on native clip culling, retaining the scrollbar and focus.
- 建议：在纹理计入预算前剔除与裁剪交集为空的显示项，覆盖长列表和滚入视区的首帧。 · Cull empty clipped intersections before charging texture pages, with tests for long lists and the first frame after a row scrolls into view.
- 状态：已在 `a7be833` 解决（引擎 #480）：完全在裁剪区外的位图和文字不计入帧图片预算。 · Resolved in `a7be833` (engine #480): bitmaps and text wholly outside the clip no longer count toward the frame image budget.
