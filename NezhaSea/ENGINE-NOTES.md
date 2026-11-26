# 引擎笔记 · Engine notes

做这款游戏时发现的新白鹭引擎（提交 `b5628eb`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。第 1 至 3 条的历史数据来自无头 Chromium 153 + SwiftShader。第 4、5 条使用带硬件加速的 Chrome。

The faults found in the new Egret engine (commit `b5628eb`) while making this game, and suggestions, written as in
part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md). Sections 1 to 3 describe historical checks in headless Chromium 153 with
SwiftShader. Sections 4 and 5 use Chrome with hardware acceleration.

### 1. 嵌入式 `play` 拦截页面 Tab 和 Space · Embedded `play` intercepts page Tab and Space — 已在 `450bb9e` 解决 / resolved in `450bb9e`
<!-- engine-note: {"id": "NezhaSea#1", "status": "resolved", "topic": "play-page-keys", "workaround": ["src/main.mjs"]} -->

- 现象：`b5628eb` 会拦截旧标题、集市和设置的 HTML 控件按键。同 [CanalWatch 的 ENGINE-NOTES 第 1 条](../CanalWatch/ENGINE-NOTES.md)。 · At `b5628eb`, Play intercepted keys from the old HTML title, market and settings controls, as in CanalWatch item 1.
- 绕过办法：旧版在 window 捕获阶段拦截控件按键的代码已移除。新画布控件的焦点是独立问题，见第 6 条。 · The old window capture shim is removed. Canvas focus is a separate concern, documented in item 6.
- 建议：焦点在可聚焦的页面元素上时 `play` 不拦截上述按键。 · Keep the page's ordinary control keys when focus is on its focusable elements.
- 复核与状态：已在 `450bb9e` 解决（引擎 #457）。仅替换为 `51b6175d`，保留旧版 HTML，移除拦截后原浏览器验收通过。Tab 可选难度，Space 可切换声音，标题与结算截图差异均为 0.00%。 · Resolved in `450bb9e` (engine #457). On `51b6175d`, the legacy HTML acceptance passed with the shim removed, including Tab for difficulty and Space for sound. Both legacy baselines differed by 0.00%.

### 2. 透明画布下方的黑底 · A black holder under a clear canvas — 已在 `450bb9e` 解决 / resolved in `450bb9e`
<!-- engine-note: {"id": "NezhaSea#2", "status": "resolved", "topic": "play-clear-holder", "workaround": ["src/main.mjs"]} -->

- 现象：旧版 `play({ parent, transparent: true })` 给容器铺了黑底，遮住海面。同 [CanalWatch 的 ENGINE-NOTES 第 2 条](../CanalWatch/ENGINE-NOTES.md)。 · The previous embedded transparent canvas still had a black holder that covered the sea, as in CanalWatch item 2.
- 绕过办法：已删除游戏设置 holder 背景的代码。 · The game no longer rewrites the holder background.
- 建议：透明画布使用透明容器。 · Keep the holder clear when a transparent canvas is requested.
- 复核与状态：已在 `450bb9e` 解决（引擎 #457）。`51b6175d` 下取到 `rgba(0, 0, 0, 0)`，保留旧 HTML 复测时海面可见。 · Resolved in `450bb9e` (engine #457). The holder computed as `rgba(0, 0, 0, 0)` at `51b6175d` and the sea was visible with the legacy interface.

### 3. 共用一张贴图的 Bitmap 比矩形精灵贵得多 · Bitmaps sharing one texture cost far more than rectangle sprites — 已写入文档 / documented
<!-- engine-note: {"id": "NezhaSea#3", "status": "documented", "topic": "shared-texture-bitmap-cost", "workaround": ["src/view.mjs"]} -->

- 现象：做画面之前先做了一个原型：`play` 加 540×960 的舞台，N 个精灵每帧移动。一张 48×48 的贴图用 `game.browser.textureFromCanvas` 做出来，N 个 `new Bitmap(lease)` 共用它：100 个时帧时间 p95 33.3 ms，300 个时 p50 33.3 ms，800 个 p50 66.6 ms。同样移动的 `game.rect` 精灵 200 个是 p95 16.7 ms，800 个 p95 33.4 ms；把 300 个矩形每帧重画进一个 Graphics 是 p95 16.7 ms。Bitmap 时每帧只有约 2 次 `drawArrays`，所以不是没合批；CPU 采样里大头是 `(program)`（等 GPU）和 `getError`（4 秒里 582 毫秒）。 · What happens: in a prototype, N moving sprites on a 540 × 960 stage. N `Bitmap`s sharing one 48 × 48 texture from `textureFromCanvas`: 100 at 33.3 ms p95, 300 at 33.3 ms p50, 800 at 66.6 ms p50. N moving `game.rect` sprites: 200 at 16.7 ms p95, 800 at 33.4 ms; 300 rectangles redrawn into one Graphics each frame at 16.7 ms. The Bitmaps drew in about 2 `drawArrays` a frame, so they were batched; the CPU profile was led by `(program)` (waiting for the GPU) and `getError` (582 ms in 4 s).
- 绕过办法：放弃贴图，哪吒、水族兵、法宝和珍珠全用 `drawRect` 拼成剪纸的样子（`src/view.mjs`），精灵按种类放池子反复用。正式游戏里第 9、16 波中途 p95 16.8 ms，兵数顶到上限 140 个时 p95 33.3 ms。 · Workaround: no textures; everything that moves is cut from `drawRect`, with sprites pooled by kind. Mid-game waves run at 16.8 ms p95, and 140 soldiers at 33.3 ms.
- 建议：查一查贴图路径在软件渲染下为什么这么慢（每帧的 `getError` 和同步等待也许可以少一些）；在 Graphics 或浏览器图片的文档里写明，大量移动的小精灵用矩形比用贴图便宜，以及量的环境。 · Suggestion: look into why the texture path is so slow under software rendering (fewer `getError` calls and waits a frame, perhaps), and say in the docs that many small moving sprites are cheaper as rectangles than as textures, with where it was measured.
- 状态：已写入文档（引擎 #485，`8637ace`）：引擎把这条写成 guide 卡片 sprite-swarm（软件渲染下共用贴图的 Bitmap 的代价和做法）。 · Documented (engine #485, `8637ace`): the engine wrote this up as its sprite-swarm guide card (the cost of Bitmaps sharing a texture under software rendering, and what to do).

### 4. 自带混音器时跳过 `play` 内置音频启动 · Skip built-in audio startup when supplying a custom mixer — 已在 `ff4794b` 解决 / resolved in `ff4794b`
<!-- engine-note: {"id": "NezhaSea#4", "status": "resolved", "topic": "play-own-audio-output"} -->

- 现象：在 Windows Chrome 157、RTX 5090 Laptop GPU、WebGPU、冷浏览器配置下，公开版三次追踪的首段引擎任务为 106、66、68 毫秒。调用栈包含 `BrowserPlay.play → createBrowserAudio → new AudioContext` 和默认音效的合成与解码，发生在应用的 `setup` 之前。用同机同服务端对照，CPU 图集画布消除了 69.9–78.8 毫秒的图集同步读回，标题布局仍约 34 毫秒并独立执行。修改后剩余约 154 毫秒的最长任务来自应用第二次构造音频上下文。 · In three public Chrome 157 WebGPU cold traces on Windows, the first engine task took 106, 66 and 68 ms. Its stack included the native audio context constructor and default effect preparation before application setup. A matched local comparison removed the 69.9–78.8 ms GPU readback and separated title layout. The remaining roughly 154 ms task came from constructing the application's second audio context.
- 绕过办法：Demo 在标题开放前分批初始化图集与音频，并保留自己的配乐、音效和独立静音。 · Initialize the atlas and mixer in separate startup tasks while keeping both ready before Start. Keep the custom score and effects on independent buses.
- 复现：用本游戏随附的 import map，在空页面调用 `await play({ width: 540, height: 960, parent, setup() { performance.mark('setup'); } })`。用全新 Chrome 配置在导航前录制 Performance，检查 `setup` 标记之前的默认音频初始化。拥有自定义声音的应用可在 `setup` 里另外调用一次 `createBrowserAudio`，观察第二个上下文。 · Use this game's import map and call `play` on an empty page with a `setup` mark. Start recording before navigating from a fresh Chrome profile. Call `createBrowserAudio` again inside setup to reproduce the custom-mixer case.
- 建议：支持关闭 `play` 的内置音频初始化，或注入可共享的混音器。验收时确认自定义混音模式只创建一个上下文，`setup` 前不准备默认音效，默认调用、暂停和释放的行为仍正常，并一起测点击到首帧。 · Support skipping built-in audio initialization or injecting a shared mixer. Verify one context, no stock prewarm in the opt-out mode, compatible default/pause/disposal behavior and unchanged click-to-first-frame latency.
- 状态 · Status：已在 `ff4794b` 解决（引擎 #433）：`play({ audio: false })` 不再建内置的声音输出，游戏用自己的混音器。 · Resolved in `ff4794b` (engine #433): `play({ audio: false })` makes no built-in sound output, and the game uses its own mixer.

- 状态：`51b6175d` 支持在 `play` 中指定 `audio: false`。本作已改用此选项，并保留原有混音器。历史硬件录音及上下文构造耗时未在本轮重复。 · Play now supports `audio: false` at `51b6175d`. The game enables it and keeps its mixer. This round did not repeat the historical hardware audio trace.

### 5. WebGPU 首次可见的图集可能在连续帧重复上传 · Two consecutive WebGPU frames can upload a cold atlas twice — 未解决 / open
<!-- engine-note: {"id": "NezhaSea#5", "status": "open", "topic": "webgpu-cold-atlas-upload"} -->

- 现象：在三星 Fold7 的 Chrome 157 WebGPU 上，让冷图集在「出海」后首次绘制。连续两帧分别向新纹理写入同一张 1024×1700 RGBA 图集（每次 6,963,200 字节）。同机、同服务器、同一依赖延迟 5 秒的样本中，前两帧同步渲染调用耗时 22.1 和 15.6 毫秒，其中提交前的 Host 准备为 17.7 和 12.0 毫秒。原生 queue.submit 调用不超过 0.1 毫秒。浏览器的帧间隔还包含输入和呈现，另行记录。 · On Fold7 Chrome 157 WebGPU, the same cold 1024×1700 RGBA image was written to two textures over consecutive frames. With the same local dependency delayed five seconds, the first two synchronous render calls took 22.1 and 15.6 ms, including 17.7 and 12.0 ms of pre-submit Host preparation. Native queue.submit took no more than 0.1 ms. Browser transition timings are separate.
- 绕过办法：历史版本在标题前主动预热图集，慢加载样本只预上传一次。原生 UI 迁移后加载页本身也绘制帧，不能再直接提交：`src/view.mjs` 在加载层后临时展示图集，交给常规帧循环，最多等待 120 毫秒。见第 14 条。 · The historical workaround prewarmed the atlas before the title and avoided repeat upload in the slowed sample. The native loading view also submits frames, so the current game keeps a pooled sprite behind it for the ordinary loop and bounds the wait to 120 ms. See item 14.
- 复现：从 PortedGamesEgret 提交 `c72a437` 开始，用本地 HTTP 服务打开 `NezhaSea/`，对 `vendor/robust-predicates/esm/util.js` 可加 5 秒响应延迟。用全新配置打开页面，点「出海」，比较第一次出现 Bitmap 后前两帧的纹理标识、`GPUQueue.writeTexture` 尺寸和待完成帧。 · Serve NezhaSea from commit c72a437, optionally delay the same module response by five seconds, and click Set out from a cold profile. Compare texture identity, native write dimensions and pending frame counts for the first two Bitmap frames.
- 建议：在首份上传提交后、准备完成前，让后续同资源的帧复用已上传的纹理，或提供可等待完成的纹理预热接口。验收时同一图集在连续两帧只产生一个原生分配和一次全量写入，并覆盖待完成帧中的取消、资源释放和设备丢失。 · Allow a subsequent frame to reuse the pending upload safely, or expose an awaitable texture warmup API. Verify one allocation and full write for the same atlas across two frames, including cancellation, release and device loss.

## 原生界面验收 · Native UI findings

以下问题首次在 `51b6175d` 下复现，并在 `95897d78` 复测。按对玩家的影响排列于 [界面迁移验收](UI-MIGRATION.md)。 · These findings were first reproduced at `51b6175d` and rechecked at `95897d78`. See the [migration readout](UI-MIGRATION.md) for priority and evidence.

### 6. 声明式控件的键盘与手柄导航 · Keyboard and gamepad navigation for declarative controls — 已在 `95897d78` 解决 / resolved in `95897d78`
<!-- engine-note: {"id": "NezhaSea#6", "status": "resolved", "topic": "play-view-input-focus", "workaround": ["src/ui-input.mjs"]} -->

- 现象：`51b6175d` 的声明式视图需要应用维护 Tab 导航、焦点框和暂停手柄轮询。 · At `51b6175d`, the application managed Tab navigation, the focus indicator and polling in the paused game.
- 绕过办法：在 `95897d78` 删掉这些绕过。白鹭接管焦点、原生焦点框和模态的 Escape、B、Start。重建后的初始焦点在 0728eccc 中使用原生 view.focus；仅原生确认框的取消按钮仍使用语义焦点适配。 · The engine owns navigation, focus indication and modal Escape, B and Start. On 0728eccc the app uses native view.focus for rebuilt views; semantic focus remains for the cancel action in the built-in confirmation.
- 建议：保留这套输入仲裁与按住 Start 恢复的回归覆盖。 · Keep coverage for the input arbitration and resume while Start remains held.
- 状态：`0728eccc` 的键盘、模拟手柄导航及暂停恢复浏览器验收通过。 · Native keyboard, simulated gamepad navigation and pause recovery pass on `0728eccc`.

### 7. 浮动摇杆要从整块战场任意点起手 · Floating stick needs the full battlefield as its start area — 已在 `253bd197` 解决 / resolved in `253bd197`
<!-- engine-note: {"id": "NezhaSea#7", "status": "resolved", "topic": "play-floating-stick", "workaround": ["src/sea-stick.mjs"]} -->

- 现象：`game.touchStick` 只接受预置控件区域。手势拖动有识别阈值，无法保留按下瞬间的原点与 5 CSS 像素死区。 · The built-in stick starts in a fixed region. Gesture recognition alone cannot preserve the immediate origin and 5 CSS pixel dead zone.
- 游戏里：[`src/sea-stick.mjs`](src/sea-stick.mjs) 使用 `game.touchStick({ floating })` 的战场区域、排除函数及 5 CSS 像素死区。应用根据画布比例换算原位移幅度，触屏捕获、越界、取消和暂停清理交给引擎。保留鼠标及触控笔的原有拖动入口。 · Native Play owns the touch capture, exclusion, dead zone, outside motion and pause/cancel lifecycle. The app converts the previous CSS travel radius to game units and retains mouse and pen dragging.
- 状态：引擎 [#473](https://github.com/cnedwin/Egret_rebuild/pull/473) 已随主干进入本作。在 Chromium 157 的 390×844 样本中，4 CSS px 位移仍为零、18 px 位移为 0.2622；越界拖动时幅度达到 1，第二触点未接管，松开原控制触点后立即归零，页面没有移动。浮动圆环只在按住时出现。 · The native integration passes the browser dead-zone, capture, second-contact, termination and pause cases. The ring is visible during an owned touch.

### 8. 密集集市中的文字缓存 · Dense market text cache — 已在 `95897d78` 解决 / resolved in `95897d78`
<!-- engine-note: {"id": "NezhaSea#8", "status": "resolved", "topic": "text-cache-budget-batch", "workaround": ["src/ui-market.mjs"]} -->

- 现象：`51b6175d` 中超过 32 个占用槽时，集市会留下可点击但缺字的按钮。 · At `51b6175d`, exceeding 32 occupied slots left market controls active with blank labels.
- 绕过办法：`95897d78` 的原生文字接管集市，已删除离屏位图替代。刷新货架时先释放旧视图，合并属于同一控件的多行说明。不同法宝的动态无障碍长名称仍通过语义映射维护。 · The offscreen bitmap fallback is removed. The market uses native text, combines lines within a control and releases the prior view before replacing stock. A semantic mapping keeps the distinct dynamic names that describe each relic.
- 建议：继续覆盖反复更新文字的高密度场景。768×1024 的测试录到 3 次缓存拒绝，最终显示恢复；保留预算观察与回收验收。 · Keep coverage for densely changing copy and budget recovery. The 768×1024 fixture reported three refusals, with all text ready at the final check.
- 状态：`253bd197` 下集市原生文字、购买、刷新及合成的自动流程仍通过。 · The market's native labels, purchase, restocking and merging still pass the browser flow at `253bd197`.

### 9. 确认框按舞台单位固定大小 · Confirmation sizes are fixed in design units — 未解决 / open
<!-- engine-note: {"id": "NezhaSea#9", "status": "open", "topic": "play-confirm-css-targets", "workaround": ["src/ui-market.mjs"]} -->

- 现象：`game.confirm` 的按钮高 48 舞台单位。在 844×390 中约 19.5 CSS 像素。长标签和确认说明也不能自动换行。 · Native confirmation uses 48 design-unit buttons, about 19.5 CSS pixels at 844×390. Long labels and the question cannot wrap automatically.
- 绕过办法：[`src/ui-market.mjs`](src/ui-market.mjs) 在原生按钮尺寸和文案能放下时走 `game.confirm`，其余用有明确焦点、可 Esc 取消的白鹭模态。 · Use `game.confirm` when its targets and copy fit, otherwise a measured Egret modal with explicit focus and Escape cancellation.
- 建议：确认框支持主题、换行和 CSS 像素级最小点击区。 · Accept a theme, wrapping and a minimum target in CSS pixels.
- 状态：当前原生 `game.confirm` 仍使用固定设计单位，保留适配。 · The current native confirm still uses fixed design units, so the measured modal remains.

### 10. 声明式视图的集市组件 · Market building blocks in declarative views — 部分解决 / partly resolved
<!-- engine-note: {"id": "NezhaSea#10", "status": "partly", "topic": "play-view-market-building-blocks", "workaround": ["src/ui-market.mjs"]} -->

- 现象：`95897d78` 已支持声明式滚动区、段落和静态图片。市场仍需要应用组织货架、动态法宝格和语义页签。 · At `95897d78`, declarative scroll, paragraphs and static images are available. The market still arranges its stock, dynamic loadout and semantic tabs itself.
- 绕过办法：[`src/ui-market.mjs`](src/ui-market.mjs) 按安全区生成货架和法宝格位，短屏分页查看属性、宝物和配方，合成、出售与下一波固定可用。画布图标和逐行排版保留原本信息。 · Generate bounded offer and gear positions from the safe area and paginate stats, items and recipes on short screens. Keep the next-wave action available. Canvas icons and measured lines retain the original information.
- 建议：提供可变行数的数据源、可绑定的图片与具有语义的页签。 · Add data-driven rows, bound images and semantic tabs.
- 状态：原生标签绑定与叶子按钮面板（引擎 #499）已接管集市语义名称、多行法宝格和强化卡片；不再包裹语义树或逐个添加自绘文字 Sprite。#506 提供键控集合和图片地址绑定。本作固定数量货架及法宝槽保留原有数据绑定，不需要反复增删行。仍需原生选中语义页签及小屏确认布局能力；拖放合成和分页保留各自逻辑。 · Native labels and leaf button panels (#499) now own market accessible names, the multiline relic cells and upgrade cards; the semantic wrapper and custom caption sprites are removed. #506 adds keyed collections and bound image addresses. Fixed-size offer and equipment slots keep ordinary bindings instead of churning rows. Selected tab semantics and responsive confirmation layout remain requests; paging and drag merging retain their game behavior.

### 11. 默认纹理加载器支持 WebP · WebP in the default texture loader — 已在 `95897d78` 解决 / resolved in `95897d78`
<!-- engine-note: {"id": "NezhaSea#11", "status": "resolved", "topic": "play-webp-loader", "workaround": ["src/ui-screens.mjs"]} -->

- 现象：`51b6175d` 的 `loadTexture` 对原 WebP 立绘报 `WEB_PNG_STRUCTURE_INVALID`。 · At `51b6175d`, loading the WebP portraits through the default loader returned `WEB_PNG_STRUCTURE_INVALID`.
- 绕过办法：`95897d78` 直接用 `game.browser.loadTexture` 读取 WebP。已删除浏览器画布解码和二次像素上传。 · The game now loads the original WebP files with the Egret loader. The extra decoding canvas and its upload are removed.
- 建议：给声明式图片增加铺满裁切和焦点坐标。现有立绘继续在 Bitmap 上指定裁切区域。 · Add cover crop and a focal point to declarative image parts. The portrait layout retains a Bitmap crop.
- 状态：`253bd197` 下 WebP 原生加载及立绘拒绝后重新加载通过。引擎 [#482](https://github.com/cnedwin/Egret_rebuild/pull/482) 新增声明式图片并发队列，本作的三张立绘仍需要 Bitmap 裁切。 · Direct WebP loading and portrait failure recovery pass. The new declarative image queue is available; the three cropped portraits retain Bitmap cropping.

### 12. 提示换行、首领入场与启动失败 · Hint wrapping, Boss entry and boot recovery — 未解决 / open
<!-- engine-note: {"id": "NezhaSea#12", "status": "open", "topic": "play-hints-wrapping", "workaround": ["src/ui-hud.mjs", "index.html", "src/ui-screens.mjs"]} -->

- 现象：长的 `game.hints` 提示在 390 宽度下被裁切。Boss 入场可通过命名控件精灵做淡入。若引擎模块尚未加载，白鹭无法绘制加载失败页。 · The long native device hint clipped at 390 px. A named sprite supports the Boss fade. Egret cannot draw failure before its module loads.
- 绕过办法：[`src/ui-hud.mjs`](src/ui-hud.mjs) 用短原生设备提示配一块自动换行的战斗说明，Boss 文字尊重减弱动效。[`index.html`](index.html) 仅保留引擎启动前的加载提示和可重试错误界面。引擎已启动的加载和资源失败在白鹭内部绘制。 · Use short native device hints, a wrapped tutorial card and a reduced-motion-aware Boss fade. The bootstrap HTML only handles startup before Egret exists. Once initialized, loading and failure are drawn in Egret.
- 建议：`game.hints` 支持换行和自定义放置，保留当前命名精灵的动画扩展能力。 · Add wrapping and placement to hints, keeping animation access to named sprites.
- 状态：首领与提示验收通过，提示换行仍由游戏控制。通用资源拒绝 5 件时，标题可继续使用并出现立绘重试；定向图集失败的引擎错误界面也可重载。 · Boss and hint checks pass, while wrapped hints remain application-managed. Refusing five files now produces an actionable retry without an exception; the forced atlas failure also remains recoverable.

### 13. 静止视图重复提交，首屏依赖在后段串行加载 · Repeated static frames and late startup dependencies — 部分解决 / partly resolved
<!-- engine-note: {"id": "NezhaSea#13", "status": "partly", "topic": "play-startup-dependencies", "workaround": ["src/main.mjs", "index.html"]} -->

- 现象：每帧提交不变化的标题时，同机软件渲染 F1 为 33.4 ms。限速样本里主模块约 2.7 s 完成载入和执行入口，随后启动图形后端、文字与角色图集，首屏仍约 3.6 s。 · Continuous redraws of the settled title measured 33.4 ms p95 on the software renderer. One throttled startup reached the app entry at about 2.7 s, then initialized graphics, text and the actor atlas. The quality startup remains around 3.6 s.
- 绕过办法：`95897d78` 由 [Play 的 `renderMode: 'on-demand'`](src/main.mjs) 跳过静止标题重复提交。保留输入轮询，无需 Demo 启停循环或自行监听手柄唤醒。限速首屏另测。 · Native on-demand Play skips redundant title submissions while retaining input polling. The demo's loop suspension and controller wake code are removed. Cold startup is measured separately.
- 建议：保留按需绘制的输入回归。冷启动仍可继续优化模块依赖调度。 · Retain on-demand input regressions and continue profiling startup dependency scheduling.
- 状态：原生按需绘制已生效；`0728eccc` 下由本作的可复现入口包将 L1 从同机 3.7 s / 2.6 MB 降至 2.0 s / 1.4 MB。F1 静置标题 p95 4.3 ms，均达标。引擎仍未提供可直接部署的入口打包方案。 · On-demand drawing works. The reproducible app bundle improves the matched L1 sample from 3.7 s / 2.6 MB to 2.0 s / 1.4 MB. Idle title F1 is 4.3 ms p95; both pass. A deployment bundling recipe would still help.

### 14. WebGPU 加载页与主动预热共享存储竞争 · WebGPU loading and manual warm-up compete for shared storage — 已在游戏侧绕过 / worked around
<!-- engine-note: {"id": "NezhaSea#14", "status": "worked-around", "topic": "webgpu-loading-atlas-prewarm", "workaround": ["src/main.mjs", "src/view.mjs"]} -->

- 现象：Fold7（SM-F966U1、Android 17、Chrome 157、Adreno 830）使用 `0728eccc` WebGPU 冷启动，所有资源请求成功，但在白鹭原生加载视图提交帧时主动调用 `engine.renderSharedFrame`，抛出 `FRAME_RENDER_FAILED`，cause 为 `WEBGPU_BACKPRESSURE: Shared storage backpressure`。加载页因此进入错误界面。重复真机采样定位到调用点。 · On a Fold7 cold start, all resources loaded, but a direct frame submission while the native loading view was rendering raised FRAME_RENDER_FAILED with cause WEBGPU_BACKPRESSURE. The loading flow treated it as an asset failure; device capture identified the call site.
- 绕过办法：`src/main.mjs` 与 `src/view.mjs` 使用已有浏览器帧循环展示预热用的临时角色，最多 120 ms；不存在独立帧提交。普通启动不依赖预热完成。 · Use the existing browser frame loop to show the warm-up actor under the loading layer, for at most 120 ms. Do not submit directly or make successful startup depend on optional warm-up.
- 建议：提供可安全排队的无显示纹理预热接口，等待 GPU 资源可用、提交和退役，支持超时、取消和设备丢失。不要将可恢复的共享存储压力报告为资源下载失败。 · Provide an awaitable, cancellable off-screen texture warm-up, coordinated with normal frame reservations and retirement. Distinguish recoverable shared-storage pressure from a resource-load error.
- 状态：Demo 修复后同一 Fold7 WebGPU 冷启动、标题与竖屏出海均通过；引擎未改动。 · Demo fix passes a cold start, title and portrait battle on the same Fold7. No engine change.

### 15. 嵌入画布仅缩放时未触发 arrange · CSS-only canvas resize does not notify arrange — 已解决 / resolved
<!-- engine-note: {"id": "NezhaSea#15", "status": "resolved", "topic": "play-css-scale-arrange"} -->

- 现象：将运行中的战斗从 540×960 浏览器视口改成 844×320，画布物理 CSS 尺寸变为 180×320，但舞台仍为 540×960。BrowserGame 的屏幕变化判断只比较设计宽高、安全区及逻辑方向，不比较 scale，造成 Play 的 arrange 未触发。暂停仍是 44 设计单位，相当于 14.7 CSS px。横屏上旧单行 HUD 的倒计时也可能盖住英文波次。 · Resize the active battle from 540×960 to 844×320. The canvas measures 180×320 CSS px while its stage stays 540×960. BrowserGame does not include scale in the screen-change condition, leaving the Pause button at about 14.7 CSS px. A narrow single-row HUD can also obscure English wave digits.
- 绕过办法：旧版 `src/main.mjs` 额外观察实际画布 CSS 尺寸，触发重排。引擎 #503 已修复 scale 变化通知，删除该 ResizeObserver，仅保留原生 arrange。游戏自身的狭窄布局策略仍将计时置于波次下方，并维持独立 44 CSS px 暂停目标。 · The old game additionally observed physical canvas size. Engine #503 supplies scale-change notification directly, so only the native arrange hook remains. The game's narrow HUD still stacks the timer and keeps a separate 44-CSS-pixel Pause target.
- 建议：当 `screen.scale` 或实际可见 CSS 尺寸发生变化但设计范围保持不变时，也发出屏幕变化事件；避免重复回调。用固定比例嵌入画布跑动态缩小、放大、旋转测试，确保 44 CSS px 控件尺寸、输入比例与焦点一致。 · Include scale or visible CSS size changes in screen notifications even when stage bounds stay fixed. Verify embed resizing, rotation, 44-CSS-pixel targets, input scaling and focus without redundant events.
- 状态：旧版绕过的历史 Fold7 战斗转屏中暂停为 65×44、52×44、65×44 CSS px。新主干删除观察器后 Chromium 实时缩放回归再次通过，完整两位数波次及独立 44 CSS px Pause 保留；Fold7 新版集市两种实机方向及下一波入口通过。 · The earlier workaround measured a live Fold7 Pause target of 65×44, 52×44, and 65×44 CSS px. With the observer removed, the new main passed the Chromium live-resize regression, including two-digit waves and independent 44 CSS px Pause; actual Fold7 market orientation and next-wave controls also pass.
