# 引擎笔记 · Engine notes

做这款游戏时遇到的新白鹭引擎（提交 `b5628eb`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../../docs/GAME-STANDARD.md) 第 3 节。前几条与之前的游戏相同，只写本作怎么绕过；第 5、6 条是本作新发现的。

The faults in the new Egret engine (commit `b5628eb`) met while making this game, and suggestions, written as in part
3 of [docs/GAME-STANDARD.md](../../docs/GAME-STANDARD.md). The first items are the same as in earlier games and say only
how this game works round them; items 5 and 6 are new here.

### 1. `play` 让页面按钮上的 Tab 和 Space 失灵 · `play` takes Tab and Space from the page's buttons — 未解决 / open

- 现象：与 [CanalWatch 的 ENGINE-NOTES 第 1 条](../CanalWatch/ENGINE-NOTES.md)相同。本作的地图上每块地、每处资源点都是页面上的透明按钮，单子和标签页也都是页面按钮。 · What happens: as CanalWatch's item 1; every plot and resource point on the map is a clear page button, and so are the sheets and tabs.
- 绕过办法：本作不读 `play` 的按键，所以在 `window` 的捕获阶段接住所有按键、停止传播，Esc 自己处理（`src/main.mjs` 的「Keys」一节）。 · Workaround: the game reads none of play's keys, so every key is caught in the capture phase and stopped; Escape is handled there.
- 建议：同 CanalWatch 第 1 条。 · Suggestion: as there.
- 状态：未解决。 · Status: open.

### 2. `play({ parent, transparent: true })` 的画布盒子是黑的 · A black holder under a clear canvas — 未解决 / open

- 现象：与 [TaiwanMahjong 第 2 条](../TaiwanMahjong/ENGINE-NOTES.md)相同。本作的县城画在引擎画布下面的页面画布上，盒子一黑就全看不见。 · What happens: as TaiwanMahjong's item 2; the county is painted on a page canvas under the engine's, and a black holder hides it all.
- 绕过办法：启动后把画布的父元素背景设成透明（`src/main.mjs` 的 `boot`）。 · Workaround: the canvas's parent is set transparent after start.
- 建议：同 TaiwanMahjong 第 2 条。 · Suggestion: as there.
- 状态：未解决。 · Status: open.

### 3. `play` 的画布像素只看 `width`，不能降分辨率 · `play`'s canvas follows its width alone, with no lower resolution — 未解决 / open

- 现象：与 [TaiwanMahjong 第 3 条](../TaiwanMahjong/ENGINE-NOTES.md)相同。本作竖屏 720×1280，原尺寸的空画布在 SwiftShader 里每帧就要二十多毫秒。 · What happens: as TaiwanMahjong's item 3; this game stands 720 × 1280, and an empty canvas that size already costs over twenty milliseconds a frame in SwiftShader.
- 绕过办法：用舞台四分之三的尺寸（540×960）建 `play`，自己的根节点缩放 0.75，CSS 把舞台盒子放大 4/3（`src/main.mjs` 的 `fit`，`src/view.mjs`）。静止的县城画在页面画布上，引擎只画会动的：行人、小船、四季的花瓣落叶、铜钱和来敌。 · Workaround: play is made at three quarters (540 × 960), the game's own root scaled 0.75 and the holder scaled 4/3 by CSS. The still county is painted on a page canvas; the engine draws only what moves.
- 建议：同 TaiwanMahjong 第 3 条（给 `play` 一个 `resolution` 选项）。 · Suggestion: as there (a `resolution` option for play).
- 状态：未解决。 · Status: open.

### 4. 存档库的 `update` 把回调的返回值当新数据 · The save store's `update` takes the callback's return value as the new data — 未解决 / open

- 现象：与 [TaiwanMahjong 第 6 条](../TaiwanMahjong/ENGINE-NOTES.md)相同。 · What happens: as TaiwanMahjong's item 6.
- 绕过办法：所有 `update` 的回调都写成花括号函数体，不返回值（`src/main.mjs`）。 · Workaround: every update callback has a block body and returns nothing.
- 建议：同 TaiwanMahjong 第 6 条。 · Suggestion: as there.
- 状态：未解决。 · Status: open.

### 5. `game.rect` 画出来的方块改不了颜色 · A block from `game.rect` cannot change colour — 未解决 / open

- 现象：`game.rect(x, y, w, h, color)` 返回一个 Sprite，颜色在创建时画进了它的 `graphics`，之后没有 `fill`、`color` 之类的属性可改。季节一换，花瓣要变成落叶和雪花，选中框要换位置和大小，都没办法直接改。 · What happens: `game.rect` returns a Sprite with its colour drawn into its graphics when made; there is no `fill` or `color` to change afterwards. When the season turns, petals must become leaves and snow, and the focus frame must move and resize.
- 绕过办法：会变色、变形的东西用 `game.sprite()` 建，变的时候 `graphics.clear()` 再 `beginFill().drawRect().endFill()` 重画（`src/view.mjs` 的 `setWeather` 和 `focus`）。 · Workaround: things that change are made with `game.sprite()` and redrawn through their graphics.
- 建议：`rect` 和 `circle` 返回的节点带一个可写的 `color`（或 `fill`），改了就重画；至少在文档里说明这两个是一次性的。 · Suggestion: give the nodes from `rect` and `circle` a writable `color` that redraws them, or at least say in the docs that they are drawn once.
- 状态：未解决。 · Status: open.

### 6. `game.burst` 用的是世界坐标，不跟着缩放过的图层走 · `game.burst` takes world coordinates, not those of a scaled layer — 未解决 / open

- 现象：本作的东西都放在缩放 0.75 的根节点里（见第 3 条），`game.burst(x, y)` 却把粒子放在世界坐标的 `(x, y)`，于是收税的铜钱和建成的光圈都偏到右下方。`burst` 没有 `into` / `layer` 参数，不像 `sprite`、`rect`、`text` 那样能指定放进哪个节点。 · What happens: everything here sits in a root scaled 0.75 (item 3), but `game.burst(x, y)` puts its pieces at world `(x, y)`, so coins and the ring on a finished building land off to the lower right. Unlike `sprite`, `rect` and `text`, `burst` has no `into` or `layer`.
- 绕过办法：自己把舞台坐标乘 0.75 换成世界坐标再传给 `burst`（`src/view.mjs` 的 `toWorld`）。 · Workaround: stage coordinates are multiplied by 0.75 into world ones before `burst`.
- 建议：`burst` 也接受 `into`，粒子放进那个节点、用它的坐标。 · Suggestion: let `burst` take `into` too, placing its pieces in that node's coordinates.
- 状态：未解决。 · Status: open.
