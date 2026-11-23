# 引擎笔记 · Engine notes

最初记录使用的引擎提交为 `b5628eb`。当前副本见 [vendor/SOURCE.md](vendor/SOURCE.md)，反馈格式见 [游戏规范](../docs/GAME-STANDARD.md)。

The original observations used engine revision `b5628eb`. The [source record](vendor/SOURCE.md) identifies the engine shipped now. See the [game standard](../docs/GAME-STANDARD.md) for the feedback format.

### 1. 页面控件的键盘焦点 · Keyboard focus on page controls — 已解决 / resolved

原来地图地块、存档和设置上的 HTML 按钮会被引擎拦截 Tab 和 Space。现在嵌入的 `play` 会把按键留给已聚焦的页面控件。本作已移除窗口捕获阶段的拦截，保留存档弹窗的焦点循环、Escape 与地图平移。只负责绘图的舞台标为 `inert`，Tab 可直接在游戏的实际控件间移动。

Previously the engine intercepted Tab and Space on the native buttons for map plots, save slots and settings. Embedded `play` now leaves keyboard input with the focused page control. The game dropped its window capture guard and keeps its save-dialog focus loop, Escape handling and map panning. The display-only stage is `inert`, so Tab moves between the controls players use.

### 2. 透明画布下的县城底图 · The painted county beneath a transparent canvas — 已解决 / resolved

原来画布容器的黑色背景会盖住县城底图。本作使用 `play({ parent, transparent: true })` 显示下方的底图，启动代码已移除修改容器背景的步骤。

Previously the black wrapper obscured the county map beneath the engine canvas. With `play({ parent, transparent: true })`, the terrain shows through. Startup no longer patches the wrapper background.

在 Windows 的无头 Chrome 157 中，Tab 与 Shift+Tab 可在「赴任」和「设置」之间往返；Space 打开设置一次，Escape 返回，Enter 打开存档槽并进入县城。方向键平移地图后，将焦点移到设置并松键，再回地图即可继续操作。以隐藏引擎层时的底图为对照，同一画面中 13,990 个受黑底影响的采样点有 13,957 个与底图相符（每个 RGB 通道容差 2）。游戏原有的标题及设置截图基线均通过。

In headless Chrome 157 on Windows, Tab and Shift+Tab moved between Take Office and Settings. Space opened Settings once, Escape returned, and Enter opened the slots and entered the county. The map still responded after panning with an arrow, moving focus to Settings, releasing the key and returning. Of 13,990 sample points sensitive to an opaque black wrapper, 13,957 matched the underlying map with the engine layer hidden (RGB tolerance 2 per channel). The existing title and settings screenshot baselines passed.

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
