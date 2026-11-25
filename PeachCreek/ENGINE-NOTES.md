# 引擎笔记 · Engine notes

使用白鹭主干 `51b6175de36aa1e85878d3c6ca9b8e841e405504`。复跑游戏全流程可用 `node test/accept.mjs`。副本和入口见 [vendor/SOURCE.md](vendor/SOURCE.md)。

Measured against Egret main at `51b6175de36aa1e85878d3c6ca9b8e841e405504`. Run `node test/accept.mjs` for the full route. The [vendor record](vendor/SOURCE.md) lists the source and entries.

### 1. 变换和裁剪后语义区域仍停在原位 · Semantic bounds stay at the original coordinates after transforms and clipping — 未解决 / open

- 现象：在 Chromium 中用 `game.show` 建父面板和一个按钮。按钮初始语义区域为 `(620, 430, 120, 42)`。将父面板左移 75 并裁到高度 20 后，位置没有更新。已不可见的按钮仍能被 `tester.press` 激活，`tester.focus` 返回 `UI_TESTER_REFUSED`。 · Reproduced in Chromium with a `game.show` parent panel and button. The button reported `(620, 430, 120, 42)` both before and after the parent was moved left 75 and clipped to height 20. `tester.press` still fired the clipped button. `tester.focus` returned `UI_TESTER_REFUSED`.
- 绕过办法：游戏按显示树的缩放、平移、裁剪交集重建语义区域。地图缩放后，地块仍由原生按钮命中。滚出单子的操作退出语义树。 · The game projects bounds with the scene transforms and clipping. Native buttons continue to handle map hits at all zoom levels. Entries outside the inspector viewport leave the semantic tree.
- 建议：以取景范围与裁剪交集发布语义区域，完全裁掉的项目拒绝激活。提供公开的视图焦点接口，使键盘、读屏和自动化共享焦点。 · Publish the intersection of visible and clipped bounds, and reject activation when fully clipped. Expose view focus so keyboard, assistive technology and test actions share one target.
- 状态：未解决。 · Status: open.

### 2. 单子滚动需要自行组合 · Long inspector sheets require composition — 部分解决 / partly resolved

- 现象：营建、人才和防务单子需要受裁剪的长列表、内容高度变化后的定位、滚轮与触屏滚动和键盘继续到下一行。`game.show` 没有可滚动的布局部件。 · Works, Talents and Defence need clipped lists, preservation of position as content changes, wheel and touch interactions, and keyboard traversal to the next row. The declarative view has no scrollable part.
- 绕过办法：使用引擎 `createScrollControl` 管理范围与偏移，使用 `Sprite.clipRect` 裁剪。游戏把滚轮和触屏位移送入滚动控制器，按滚动窗口挂载可见项。 · Engine `createScrollControl` owns the range and offset, and `Sprite.clipRect` clips the sheet. The game forwards wheel and contact deltas and mounts entries intersecting the viewport.
- 建议：提供可嵌套的 `scroll` 容器，绑定基础手势、惯性、滚动条和语义项目，支持长列表回收并保持键盘焦点。 · Add a nestable `scroll` part with gestures, inertia, a scrollbar and semantic items, including item reuse and retained keyboard focus.
- 状态：部分解决。底层 API 足以交付，数据描述层仍需扩展。 · Status: partly resolved. The low-level APIs support the implementation. The description layer still needs a scroll part.

### 3. 文字和按钮样式需要显示对象补充 · Typography and button styling need display-object extensions — 部分解决 / partly resolved

- 现象：标题字需要字体和行距。建筑按钮需要名称、两行以上的说明、选址得分和资源限制。纯数据部件缺少换行、字体组、富文本按钮、渐变与逐项边框。 · The title needs typeface and leading. Building options need a name, multiple lines of description, site efficiency and resource constraints. Declarative parts lack wrapping, font stacks, rich button content, gradients and per-item outlines.
- 绕过办法：应用换行以保持中英文可读，标题用 `game.browser.createLabel`，卡片用 `Graphics` 描边和渐变。建筑预览用引擎纹理和 Bitmap。按钮保留原生的点击与语义行为。 · The project wraps Chinese and English text locally, uses `game.browser.createLabel` for title typography, draws panel borders and gradients with `Graphics`, and displays building previews as engine bitmaps. Native buttons retain tap and semantic actions.
- 建议：为文字开放字体回退、行距、宽度与截断；为按钮开放带焦点样式的内容节点；为视图增加 image/nine-slice 和逐项皮肤。 · Expose font fallback, leading, width and truncation on text, button content with focus styling, and image/nine-slice parts with per-item skins.
- 状态：部分解决。 · Status: partly resolved.

### 4. 网页语义投影拒绝 CSS 缩放的画布祖先 · Browser semantic projection rejects a CSS-transformed canvas ancestor — 已写入文档 / documented

- 现象：旧版按 1280×720 做等比留边，在 960×540 引擎画布外层用 CSS translate/scale。接入 `createBrowserSemantics` 时，浏览器启动抛 `UI_SEMANTICS_SURFACE_INVALID`。 · The 1280×720 letterboxed layout used CSS translate/scale on the 960×540 engine host. Initializing `createBrowserSemantics` threw `UI_SEMANTICS_SURFACE_INVALID`.
- 绕过办法：画布宿主用 CSS left、top、width、height 保留原取景，语义层按画布实际边界布置。地图背景仍是独立绘画层。 · Set the canvas host's CSS left, top, width and height to retain framing. The semantic overlay now follows the canvas bounds. The painted terrain remains on a separate layer.
- 建议：文档给出保留固定渲染分辨率及等比留边的完整示例。若可支持正轴缩放和平移，可让投影接受这种已能计算边界的宿主。 · Add a complete letterbox example with fixed render resolution. If axis-aligned scale and translation can be supported, accept those mappable hosts for projection.
- 状态：限制已记录在白鹭文档。 · Status: documented in the Egret guide.

### 5. 画布像素尺寸与设计尺寸的分离 · Canvas resolution and design dimensions — 未解决 / open

- 现象：县城以 1280×720 设计，软件渲染下需要单独降低画布像素数。 · The county uses 1280×720 design coordinates and needs a separate raster resolution for software rendering.
- 绕过办法：以 960×540 启动 `play`，场景和界面共用 0.75 的换算，网页宿主负责留边。透明画布让下层县城底图可见。 · Start `play` at 960×540, use a shared 0.75 conversion for the scene and controls, and letterbox the browser host. The transparent surface preserves the terrain underneath.
- 建议：为 `play` 提供独立渲染比例，并给布局、输入和语义都保留相同的逻辑尺寸。 · Give `play` a separate render scale while preserving logical dimensions for layout, input and semantics.
- 状态：未解决。 · Status: open.

### 6. 存档更新与预制绘图对象 · Save updates and convenience drawing objects — 未解决 / open

- 现象：存档 `update` 会把意外返回的值用作新数据。`game.rect` 的颜色在构造时写入绘图，季节变化时要重画。`game.burst` 使用世界坐标。 · Save `update` treats an incidental callback return value as replacement data. A `game.rect` stores its colour in its initial drawing. `game.burst` accepts world coordinates.
- 绕过办法：存档原地修改回调不返回值。会变色的天气图形和选框用 Sprite 的 graphics 重画，粒子通过 `toWorld` 传入换算后的坐标。 · In-place save callbacks return nothing. Sprite graphics redraw changing weather and focus visuals. `toWorld` converts coordinates for particles.
- 建议：区分可变更新和全量替换 API，补充可变形状的填充属性和局部坐标版粒子入口。 · Separate mutation from replacement, add mutable fill for convenience shapes, and accept a local coordinate layer for particles.
- 状态：未解决。 · Status: open.

### 7. 浏览器常用图像格式需要另一条加载入口 · The high-level image helper and browser image formats — 部分解决 / partly resolved

- 现象：封面是 WebP。浏览器用该文件调用 `game.image`，得到 `ASSET_LOAD_FAILED`，底层原因为 `WEB_PNG_STRUCTURE_INVALID`。 · In the browser, passing the WebP cover to `game.image` produced `ASSET_LOAD_FAILED` caused by `WEB_PNG_STRUCTURE_INVALID`.
- 绕过办法：用 `@egret/engine/web/kit` 的浏览器图像 provider 加载原文件，再用白鹭 Bitmap 渲染。阻断 WebP 的测试中，标题仍可操作，恢复网络后点重试可补回封面。 · The browser image provider from `@egret/engine/web/kit` loads the original file into an Egret Bitmap. With the WebP request blocked, the title stayed playable. Retry restored the cover after the network was unblocked.
- 建议：给高层入口开放图像 provider，或按格式选择浏览器解码路径，并在 `game.image` 的使用说明中标注默认解码范围。 · Allow the high-level helper to select an image provider or browser decoder by format and document its default decoder.
- 状态：部分解决。 · Status: partly resolved.

### 8. 静止视图持续提交 · Still views keep submitting frames — 部分解决 / partly resolved

- 现象：1280×800 的 Chromium/SwiftShader 品质测试，旧标题页的浏览器帧 P95 为 12.6 ms，迁到白鹭画布并持续重绘的标题为 70.8 ms。独立探针测得标题和打开营建单子时的语义发布 P95 分别为 0.2 ms 和 0.3 ms。此数据无法进一步区分白鹭绘图、软件栅格和浏览器合成的贡献。 · In the 1280×800 Chromium/SwiftShader quality run, browser-frame P95 was 12.6 ms on the original title and 70.8 ms with the continuously drawn new title. A separate probe measured semantic publish P95 of 0.2 ms on the title and 0.3 ms with Works open. The measurements do not split engine drawing, software rasterisation and browser composition.
- 绕过办法：保持最后一次提交的标题画面，按键、点按、尺寸变化和图像或文字就绪时立即恢复循环。县城进入后继续逐帧更新。 · Keep the last submitted title frame and wake the loop immediately for input, resize, or an image or label completing. The county runs every frame after entry.
- 建议：提供可选的按需渲染策略，在显示对象、布局、素材、交互反馈或动画改变时由引擎自动请求下一帧。 · Offer a render-on-demand policy that requests a frame on display, layout, asset, feedback or animation changes.
- 状态：部分解决。 · Status: partly resolved.
