# 引擎笔记 · Engine notes

做这款游戏时发现的新白鹭引擎（提交 `b5628eb`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。数字都在无头 Chromium 153 + SwiftShader（没有显卡）下量得，不代表真机。

The faults found in the new Egret engine (commit `b5628eb`) while making this game, and suggestions, written as in
part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md). Every number was measured in headless Chromium 153 with
SwiftShader (no GPU), and says nothing of real devices.

### 1. `play` 让页面按钮上的 Tab 和 Space 失灵 · `play` takes Tab and Space from the page's buttons — 未解决 / open

- 现象：与 [CanalWatch 的 ENGINE-NOTES 第 1 条](../CanalWatch/ENGINE-NOTES.md)相同。本作的标题、升级、集市和暂停都是页面按钮，而哪吒又要靠 `play` 的 `game.keys.axis()` 用 WASD 和方向键走，所以不能像 CanalWatch 那样把所有按键都拦下。 · What happens: as CanalWatch's item 1. Here the panels are page buttons while Nezha moves by `game.keys.axis()`, so not every key can be caught.
- 绕过办法：在 `window` 的捕获阶段，只在事件的目标是页面按钮或面板时停止 Tab、Space、Enter 和方向键的传播（`src/main.mjs` 末尾）；焦点在海面上时按键照常交给 `play`。 · Workaround: in the capture phase, Tab, Space, Enter and the arrows are stopped only when their target is a page button or panel; otherwise keys reach `play` as before.
- 建议：同 CanalWatch 第 1 条：焦点在可聚焦的页面元素上时 `play` 不拦这些键。 · Suggestion: as there.
- 状态：未解决。 · Status: open.

### 2. `play({ parent, transparent: true })` 的画布盒子是黑的 · A black holder under a clear canvas — 未解决 / open

- 现象：与 [CanalWatch 的 ENGINE-NOTES 第 2 条](../CanalWatch/ENGINE-NOTES.md)相同，页面画的海面透不出来。 · What happens: as CanalWatch's item 2.
- 绕过办法：`play` 返回后把 `game.canvas.parentElement` 的背景改成透明（`src/main.mjs`）。 · Workaround: the holder made clear.
- 建议：同 CanalWatch 第 2 条。 · Suggestion: as there.
- 状态：未解决。 · Status: open.

### 3. 共用一张贴图的 Bitmap 比矩形精灵贵得多 · Bitmaps sharing one texture cost far more than rectangle sprites — 未解决 / open

- 现象：做画面之前先做了一个原型：`play` 加 540×960 的舞台，N 个精灵每帧移动。一张 48×48 的贴图用 `game.browser.textureFromCanvas` 做出来，N 个 `new Bitmap(lease)` 共用它：100 个时帧时间 p95 33.3 ms，300 个时 p50 33.3 ms，800 个 p50 66.6 ms。同样移动的 `game.rect` 精灵 200 个是 p95 16.7 ms，800 个 p95 33.4 ms；把 300 个矩形每帧重画进一个 Graphics 是 p95 16.7 ms。Bitmap 时每帧只有约 2 次 `drawArrays`，所以不是没合批；CPU 采样里大头是 `(program)`（等 GPU）和 `getError`（4 秒里 582 毫秒）。 · What happens: in a prototype, N moving sprites on a 540 × 960 stage. N `Bitmap`s sharing one 48 × 48 texture from `textureFromCanvas`: 100 at 33.3 ms p95, 300 at 33.3 ms p50, 800 at 66.6 ms p50. N moving `game.rect` sprites: 200 at 16.7 ms p95, 800 at 33.4 ms; 300 rectangles redrawn into one Graphics each frame at 16.7 ms. The Bitmaps drew in about 2 `drawArrays` a frame, so they were batched; the CPU profile was led by `(program)` (waiting for the GPU) and `getError` (582 ms in 4 s).
- 绕过办法：放弃贴图，哪吒、水族兵、法宝和珍珠全用 `drawRect` 拼成剪纸的样子（`src/view.mjs`），精灵按种类放池子反复用。正式游戏里第 9、16 波中途 p95 16.8 ms，兵数顶到上限 140 个时 p95 33.3 ms。 · Workaround: no textures; everything that moves is cut from `drawRect`, with sprites pooled by kind. Mid-game waves run at 16.8 ms p95, and 140 soldiers at 33.3 ms.
- 建议：查一查贴图路径在软件渲染下为什么这么慢（每帧的 `getError` 和同步等待也许可以少一些）；在 Graphics 或浏览器图片的文档里写明，大量移动的小精灵用矩形比用贴图便宜，以及量的环境。 · Suggestion: look into why the texture path is so slow under software rendering (fewer `getError` calls and waits a frame, perhaps), and say in the docs that many small moving sprites are cheaper as rectangles than as textures, with where it was measured.
- 状态：未解决。 · Status: open.
