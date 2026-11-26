# 引擎笔记 · Engine notes

做这款游戏时发现的新白鹭引擎（提交 `b5628eb`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。第 1 至 3 条的历史数据来自无头 Chromium 153 + SwiftShader。第 4、5 条使用带硬件加速的 Chrome。

The faults found in the new Egret engine (commit `b5628eb`) while making this game, and suggestions, written as in
part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md). Sections 1 to 3 describe historical checks in headless Chromium 153 with
SwiftShader. Sections 4 and 5 use Chrome with hardware acceleration.

### 1. `play` 让页面按钮上的 Tab 和 Space 失灵 · `play` takes Tab and Space from the page's buttons — 已在 `450bb9e` 解决 / resolved in `450bb9e`
<!-- engine-note: {"id": "NezhaSea#1", "status": "resolved", "topic": "play-page-keys", "workaround": ["src/main.mjs"]} -->

- 现象：与 [CanalWatch 的 ENGINE-NOTES 第 1 条](../CanalWatch/ENGINE-NOTES.md)相同。本作的标题、升级、集市和暂停都是页面按钮，而哪吒又要靠 `play` 的 `game.keys.axis()` 用 WASD 和方向键走，所以不能像 CanalWatch 那样把所有按键都拦下。 · What happens: as CanalWatch's item 1. Here the panels are page buttons while Nezha moves by `game.keys.axis()`, so not every key can be caught.
- 绕过办法：在 `window` 的捕获阶段，只在事件的目标是页面按钮或面板时停止 Tab、Space、Enter 和方向键的传播（`src/main.mjs` 末尾）；焦点在海面上时按键照常交给 `play`。 · Workaround: in the capture phase, Tab, Space, Enter and the arrows are stopped only when their target is a page button or panel; otherwise keys reach `play` as before.
- 建议：同 CanalWatch 第 1 条：焦点在可聚焦的页面元素上时 `play` 不拦这些键。 · Suggestion: as there.
- 状态：已在 `450bb9e` 解决（引擎 #457）：同 CanalWatch 第 1 条。 · Resolved in `450bb9e` (engine #457): as CanalWatch item 1.

### 2. `play({ parent, transparent: true })` 的画布盒子是黑的 · A black holder under a clear canvas — 已在 `450bb9e` 解决 / resolved in `450bb9e`
<!-- engine-note: {"id": "NezhaSea#2", "status": "resolved", "topic": "play-clear-holder", "workaround": ["src/main.mjs"]} -->

- 现象：与 [CanalWatch 的 ENGINE-NOTES 第 2 条](../CanalWatch/ENGINE-NOTES.md)相同，页面画的海面透不出来。 · What happens: as CanalWatch's item 2.
- 绕过办法：`play` 返回后把 `game.canvas.parentElement` 的背景改成透明（`src/main.mjs`）。 · Workaround: the holder made clear.
- 建议：同 CanalWatch 第 2 条。 · Suggestion: as there.
- 状态：已在 `450bb9e` 解决（引擎 #457）：同 CanalWatch 第 2 条。 · Resolved in `450bb9e` (engine #457): as CanalWatch item 2.

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

### 5. WebGPU 首次可见的图集可能在连续帧重复上传 · Two consecutive WebGPU frames can upload a cold atlas twice — 未解决 / open
<!-- engine-note: {"id": "NezhaSea#5", "status": "open", "topic": "webgpu-cold-atlas-upload"} -->

- 现象：在三星 Fold7 的 Chrome 157 WebGPU 上，让冷图集在「出海」后首次绘制。连续两帧分别向新纹理写入同一张 1024×1700 RGBA 图集（每次 6,963,200 字节）。同机、同服务器、同一依赖延迟 5 秒的样本中，前两帧同步渲染调用耗时 22.1 和 15.6 毫秒，其中提交前的 Host 准备为 17.7 和 12.0 毫秒。原生 queue.submit 调用不超过 0.1 毫秒。浏览器的帧间隔还包含输入和呈现，另行记录。 · On Fold7 Chrome 157 WebGPU, the same cold 1024×1700 RGBA image was written to two textures over consecutive frames. With the same local dependency delayed five seconds, the first two synchronous render calls took 22.1 and 15.6 ms, including 17.7 and 12.0 ms of pre-submit Host preparation. Native queue.submit took no more than 0.1 ms. Browser transition timings are separate.
- 绕过办法：标题可操作前，在隐藏的画布提交一个使用同一图集的帧。只在常规帧循环启动前等该帧退役，最多等 100 毫秒。慢加载样本中只预上传一次，进入游戏前四帧无需再上传角色图集。 · Submit one frame using the atlas on a hidden canvas before making the title interactive, and wait at most 100 ms for retirement before starting the ordinary frame loop. The slowed comparison moved the sole upload before the title.
- 复现：从 PortedGamesEgret 提交 `c72a437` 开始，用本地 HTTP 服务打开 `NezhaSea/`，对 `vendor/robust-predicates/esm/util.js` 可加 5 秒响应延迟。用全新配置打开页面，点「出海」，比较第一次出现 Bitmap 后前两帧的纹理标识、`GPUQueue.writeTexture` 尺寸和待完成帧。 · Serve NezhaSea from commit c72a437, optionally delay the same module response by five seconds, and click Set out from a cold profile. Compare texture identity, native write dimensions and pending frame counts for the first two Bitmap frames.
- 建议：在首份上传提交后、准备完成前，让后续同资源的帧复用已上传的纹理，或提供可等待完成的纹理预热接口。验收时同一图集在连续两帧只产生一个原生分配和一次全量写入，并覆盖待完成帧中的取消、资源释放和设备丢失。 · Allow a subsequent frame to reuse the pending upload safely, or expose an awaitable texture warmup API. Verify one allocation and full write for the same atlas across two frames, including cancellation, release and device loss.
