# 引擎笔记 · Engine notes

做这款游戏时发现的新白鹭引擎（提交 `b5628eb`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。所有数字都在无头 Chromium 153 + SwiftShader（没有显卡）、1280×720 下量得，不代表真机。

The faults found in the new Egret engine (commit `b5628eb`) while making this game, and suggestions, written as in
part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md). Every number was measured in headless Chromium 153 with
SwiftShader (no GPU) at 1280 × 720, and says nothing of real devices.

### 1. `play` 让页面按钮上的 Tab 和 Space 失灵 · `play` takes Tab and Space from the page's buttons — 已在 `450bb9e` 解决 / resolved in `450bb9e`
<!-- engine-note: {"id": "OperaDrums#1", "status": "resolved", "topic": "play-page-keys", "workaround": ["src/main.mjs"]} -->

- 现象：与 [CanalWatch 的 ENGINE-NOTES 第 1 条](../CanalWatch/ENGINE-NOTES.md)相同：`play` 在 `window` 上对 Tab、Space 和方向键 `preventDefault`，焦点在页面按钮上时 Tab 不换焦点、Space 不按按钮。本作的曲目、设置、暂停菜单和敲击区都是页面按钮。 · What happens: as CanalWatch's item 1; this game's song list, settings, pause menu and pads are all page buttons.
- 绕过办法：在 `window` 的捕获阶段先接住 `keydown` 并停止传播，敲击键 D、F、J、K 和暂停键都由 `src/main.mjs` 自己读；手柄仍用 `game.keys.pressed('pad:…')`，不受影响。 · Workaround: keys caught first in the capture phase; the gamepad still goes through `game.keys`.
- 建议：同 CanalWatch 第 1 条。 · Suggestion: as there.
- 状态：已在 `450bb9e` 解决（引擎 #457）：同 CanalWatch 第 1 条。 · Resolved in `450bb9e` (engine #457): as CanalWatch item 1.

### 2. `play({ parent, transparent: true })` 的画布盒子是黑的 · A black holder under a clear canvas — 已在 `450bb9e` 解决 / resolved in `450bb9e`
<!-- engine-note: {"id": "OperaDrums#2", "status": "resolved", "topic": "play-clear-holder", "workaround": ["src/main.mjs"]} -->

- 现象：与 [CanalWatch 的 ENGINE-NOTES 第 2 条](../CanalWatch/ENGINE-NOTES.md)相同：装画布的盒子写死 `background:#000`，页面画的戏台透不出来。 · What happens: as CanalWatch's item 2; the stage the page paints does not show through.
- 绕过办法：`play` 返回后把 `game.canvas.parentElement` 的背景改成透明（`src/main.mjs`）。 · Workaround: the holder made clear once `play` has returned.
- 建议：同 CanalWatch 第 2 条。 · Suggestion: as there.
- 状态：已在 `450bb9e` 解决（引擎 #457）：同 CanalWatch 第 2 条。 · Resolved in `450bb9e` (engine #457): as CanalWatch item 2.

### 3. 每帧移动的圆和路径比矩形贵得多 · Moving circles and paths cost far more than rectangles — 已写入文档 / documented
<!-- engine-note: {"id": "OperaDrums#3", "status": "documented", "topic": "moving-shapes-cost", "workaround": ["src/view.mjs"]} -->

- 现象：最密的谱（《急急风》难，每秒 4 个音符）上同屏约十个音符，每个是 3–4 个 `drawCircle` 叠成的圆盘，每帧移动。帧时间 p95 33.4 ms；把音符那一层设为不可见就是 16.8 ms。逐项试过：去掉文字、去掉阴影和高光、不再每帧 `toFront`、把备用音符移出图层，都还是 33.4 ms；把圆换成 28 边形（`moveTo`/`lineTo` 画的路径）也是 33.4 ms；换成 `drawRect`（转 45° 的也一样）就是 16.7 ms。CPU 采样里排在前面的是 `prepareSharedDraws2D`、`packSharedDraws2D` 和 `getError`。另外，音符和它的字交替排在同一层时每帧约 27 次 `drawArrays`；字挪到单独一层后降到约 7 次。 · What happens: about ten moving notes of 3–4 circles each gave 33.4 ms p95 on the densest chart, and 16.8 ms with their layer hidden. Leaving out the labels, the shading or `toFront` did not help, nor did 28-sided polygons; rectangles, turned 45° or not, gave 16.7 ms. The CPU profile was led by `prepareSharedDraws2D`, `packSharedDraws2D` and `getError`. Labels between notes in one layer made about 27 `drawArrays` a frame, about 7 in a layer of their own.
- 绕过办法：音符只用矩形画——鼓是方印，锣是转 45° 的菱形，大音符是套框（`src/view.mjs` 的 `drawNote`）；字放在音符上面单独的一层。形状不同正好让分不清颜色的人也能区分鼓和锣。 · Workaround: notes of rectangles only — a square for the drum, a diamond for the gongs, a frame inside for a big note — with their labels in a layer of their own.
- 建议：一个不变形状的精灵移动时，只变换它已经剖分好的三角形，而不是每帧重新准备路径；或者在 Graphics 文档里写明哪些形状走矩形的快路径、移动的圆和路径大约多贵、文字会打断合批。 · Suggestion: when a sprite whose shape has not changed moves, transform its triangles as they are rather than preparing its path again each frame; or say in the Graphics docs which shapes take the rectangle path, what moving circles and paths cost, and that text breaks batches.
- 状态：已写入文档（引擎 #485，`8637ace`）：引擎把这条写成 guide 卡片 moving-shapes（实测后写入）。 · Documented (engine #485, `8637ace`): the engine wrote this up, measured again, as its moving-shapes guide card.

### 4. 声部的 `position` 比听到的早，混音器换算不到页面时间 · A voice's `position` is ahead of what is heard, with no way to page time — 已写入文档 / documented
<!-- engine-note: {"id": "OperaDrums#4", "status": "documented", "topic": "audio-output-time", "workaround": ["src/audio/sound.mjs"]} -->

- 现象：音乐游戏要知道「这一下敲下去时，耳朵听到的是曲子的第几秒」。`voice.position` 按输出的时钟（`AudioContext.currentTime`）算，是交给输出的位置，不是正在出声的位置；无头 Chromium 里两者差 40–43 毫秒（中位 41.3 毫秒，`outputLatency` 0.032 s，`baseLatency` 0.01 s）。混音器也没有把它换成页面时间（`performance.now()` 或事件的 `timeStamp`）的办法，所以拿事件时间戳判定时没有对照。 · What happens: `voice.position` runs by `AudioContext.currentTime`, which is what was given to the output, not what is sounding; headless they differed by 40–43 ms (median 41.3). The mixer gives no mapping to page time, so an event's time stamp has nothing to be compared with.
- 绕过办法：`src/audio/sound.mjs` 的 `heardAt(ms)`：用 `createBrowserAudio` 交出的 `context` 调 `getOutputTimestamp()`，得到「此刻正在出声的 contextTime 和它的 performanceTime」，于是 `position − (currentTime − contextTime) + (ms − performanceTime)/1000` 就是页面时刻 `ms` 听到的秒数；浏览器没有这个方法时退回减去 `outputLatency`。量得每帧取的值从不倒退，与页面时间的步差 p95 0.1 毫秒。 · Workaround: `heardAt(ms)` uses `getOutputTimestamp()` on the context to turn the position into the second heard at page time `ms`, falling back to `outputLatency`; it never ran backwards and stepped within 0.1 ms of page time.
- 建议：给声部一个 `heardPosition`，或给混音器一个 `positionAt(voice, pageMs)`，把输出延迟和页面时间的换算做进引擎；音频文档写明 `position` 不含输出延迟。 · Suggestion: a `heardPosition` on a voice, or `positionAt(voice, pageMs)` on the mixer, with the output delay and page time in the engine; say in the audio docs that `position` leaves the output delay out.
- 状态：已写入文档（引擎 #485，`8637ace`）：引擎把这条写成 guide 卡片 rhythm-clock；声部的「听到的位置」仍要游戏自己换算。 · Documented (engine #485, `8637ace`): the engine wrote this up as its rhythm-clock guide card; the heard position of a voice is still worked out by the game.

### 5. `play` 总是自己开一个声音输出 · `play` always opens a sound output of its own — 已在 `ff4794b` 解决 / resolved in `ff4794b`
<!-- engine-note: {"id": "OperaDrums#5", "status": "resolved", "topic": "play-own-audio-output"} -->

- 现象：本作的声音全部走自己用 `createBrowserAudio` 建的混音器（要伴奏的声部位置和两条音量），用不上 `game.sfx` 和 `game.music`。`play` 还是会建它自己的 `AudioContext` 并解码 14 个预设音效，页面上于是有两个音频输出；没有选项关掉。 · What happens: this game plays everything through its own mixer and uses neither `game.sfx` nor `game.music`, yet `play` still makes its own `AudioContext` and decodes its 14 preset effects, so the page has two outputs, with no option to leave it out.
- 绕过办法：`game.sfx.muted = true`，其余不管。 · Workaround: `game.sfx.muted = true`, and nothing else.
- 建议：给 `play` 一个选项，例如 `sound: false` 不建输出，或 `audio: mixer` 用游戏给的混音器做 `sfx` 和 `music`。 · Suggestion: an option such as `sound: false`, or `audio: mixer` to build `sfx` and `music` on the game's own mixer.
- 状态：已在 `ff4794b` 解决（引擎 #433）：`play({ audio: false })` 不建声音输出。 · Resolved in `ff4794b` (engine #433): `play({ audio: false })` makes no sound output.
