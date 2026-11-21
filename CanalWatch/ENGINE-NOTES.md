# 引擎笔记 · Engine notes

做这款游戏时发现的新白鹭引擎（提交 `b5628eb`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。第 1、2 条另用一个最小页面（一个 `play` 加两个页面按钮）在无头 Chromium 里复现过。

The faults found in the new Egret engine (commit `b5628eb`) while making this game, and suggestions, written as in
part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md). Items 1 and 2 were also seen in a minimal page (one `play`
and two page buttons) in headless Chromium.

### 1. `play` 让页面按钮上的 Tab 和 Space 失灵 · `play` takes Tab and Space from the page's buttons — 未解决 / open

- 现象：`play` 在 `window` 上听 `keydown`，对 Tab、Space 和四个方向键一律 `preventDefault`，只放过输入框、文本框、下拉框和可编辑元素。页面上有自己的按钮时（本作的顶栏、建造位、选单都是页面按钮），焦点在按钮上按 Tab 不会移到下一个，按 Space 不会按下按钮。最小页面复现：两个按钮加一个 `play({ parent })`，焦点在按钮 A 上按 Tab，焦点仍在 A；焦点在按钮 B 上按 Space，B 的 `click` 一次也没有。键盘玩家走不动界面，读屏用户也一样。 · What happens: `play` listens for `keydown` on `window` and calls `preventDefault` for Tab, Space and the arrows, sparing only inputs, text areas, selects and editable elements. With buttons of the page's own (this game's bar, plots and picker), Tab on a focused button leaves the focus where it is and Space does not press it. In a minimal page with two buttons and `play({ parent })`, Tab on button A stays on A, and Space on button B never clicks it.
- 绕过办法：在 `window` 的捕获阶段先接住 `keydown` 并 `stopPropagation()`，`play` 在冒泡阶段的监听就收不到；浏览器的默认动作（Tab 换焦点、Space 按按钮）照常发生。代价是 `game.keys` 不再有键，本作的快捷键全部自己处理（`src/main.mjs` 末尾的键位）。 · Workaround: catch `keydown` first, in `window`'s capture phase, and stop it there; `play`'s bubbling listener never hears it and the browser's own actions (Tab moving focus, Space pressing a button) still happen. The cost is that `game.keys` hears nothing, so this game reads all its shortcuts itself.
- 建议：焦点在可聚焦的页面元素上（`button`、`a[href]`、`[tabindex]`，画布自己除外）时不拦 Tab 和 Space；或者只在焦点在画布或 `body` 上时拦。文档的「Input」一节说明 `play` 会拿走这几个键。 · Suggestion: leave Tab and Space alone while a focusable element of the page other than the canvas has the focus, or keep them only when the canvas or the body has it; say in the Input section of the docs that `play` keeps these keys.
- 状态：未解决。 · Status: open.

### 2. `play({ parent, transparent: true })` 的画布下面是黑的 · A black box under a clear canvas with `parent` — 未解决 / open

- 现象：给了 `parent` 时，`play` 把画布放进自己建的盒子，盒子的内联样式写死 `background:#000`。`transparent: true` 让画布清成透明，可透出来的是这块黑底，不是页面——文档说的「what the page has under the canvas shows through」不成立。最小页面里这个盒子的计算背景色是 `rgb(0, 0, 0)`。 · What happens: with `parent`, `play` puts the canvas in a holder of its own whose inline style is `background:#000`; a clear canvas shows that black, not the page, so the documented "what the page has under the canvas shows through" does not hold. In the minimal page the holder's computed background is `rgb(0, 0, 0)`.
- 绕过办法：`play` 返回后把 `game.canvas.parentElement.style.background` 改成 `transparent`（`src/main.mjs`）。 · Workaround: set `game.canvas.parentElement.style.background` to `transparent` once `play` has returned.
- 建议：`transparent: true` 时盒子不写背景色。 · Suggestion: give the holder no background when `transparent` is true.
- 状态：未解决。 · Status: open.

### 3. 静止的大图每帧重画，软件渲染下帧时间翻倍 · A still map drawn again each frame doubles the frame time under software rendering — 未解决 / open

- 现象：整张地图（两层远山、两层水道、纤道、芦苇、柳树、城墙、建造位）画在一个 `game.sprite` 里，只画一次、之后不动。无头 Chromium + SwiftShader、1280×800 下，标题画面帧时间 p95 33.3 ms；把这个精灵设为不可见就回到 16.7 ms。逐项去掉试过：去掉远山或去掉水道中的任何一项都能回到 16.8 ms 左右，说明是大片半透明填充的填充量，而不是三角形数。`play` 里没有把静止图层缓存成一张纹理的办法（`cacheAsBitmap` 在迁移文档里写着「Not there」）。 · What happens: the whole map is one `game.sprite`, drawn once and never changed. In headless Chromium with SwiftShader at 1280 × 800 the title's frame time is 33.3 ms p95, and 16.7 ms with that sprite hidden. Leaving out either the hills or the canal alone brings it to about 16.8 ms, so it is the fill of large translucent areas, not the triangles. `play` has no way to keep a still layer as one texture (`cacheAsBitmap` is "Not there" in the migration notes).
- 绕过办法：地图由 Canvas 2D 绘制，放在白鹭透明画布下，只在地图框尺寸变化时重画（`src/ground.mjs`）。最初验证此方案时，标题帧时间 p95 为 16.7 ms，第十波满屏敌人时为 16.8 ms。 · Workaround: Canvas 2D paints the map beneath Egret's transparent canvas and redraws it when the map changes size. The original test of this arrangement measured 16.7 ms p95 on the title and 16.8 ms during a crowded tenth wave.
- 建议：给 `play` 一个把精灵（及其子精灵）烘成纹理、之后当一张图画的办法，例如 `game.bake(sprite)`，在内容改变时再烘；或者在文档里写明大片半透明填充的代价和「静止背景交给页面」的做法。 · Suggestion: a way for `play` to bake a sprite and its children into a texture drawn as one picture until it changes, say `game.bake(sprite)`; or say in the docs what large translucent fills cost and that a still background can be left to the page.
- 状态：未解决。 · Status: open.

### 4. 画布在 `game.canvas`，文档没写 · The canvas is `game.canvas`, which the docs do not say — 未解决 / open

- 现象：play 文档的「When a game outgrows it」说 `game.browser` 是它建在其上的浏览器游戏，照着写 `game.browser.canvas` 得到 `undefined`，接着读它的 `parentElement` 抛 `TypeError`。画布其实挂在 `game.canvas`。 · What happens: the play docs call `game.browser` the browser game it is built on; `game.browser.canvas` is `undefined`, and reading its `parentElement` throws a `TypeError`. The canvas is on `game.canvas`.
- 绕过办法：用 `game.canvas`（`src/main.mjs`），设置无障碍名、监听点按、找到外面的盒子都靠它。 · Workaround: use `game.canvas`, for its accessible name, its taps and its holder.
- 建议：在 play 文档里列出 `game.canvas`，并说明 `game.browser` 上没有画布。 · Suggestion: list `game.canvas` in the play docs, and say `game.browser` has no canvas.
- 状态：未解决。 · Status: open.
