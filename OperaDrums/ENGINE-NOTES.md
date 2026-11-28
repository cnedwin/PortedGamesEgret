# 引擎笔记 · Engine notes

做这款游戏时发现的新白鹭引擎（提交 `b5628eb`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。所有数字都在无头 Chromium 153 + SwiftShader（没有显卡）、1280×720 下量得，不代表真机。

The faults found in the new Egret engine (commit `b5628eb`) while making this game, and suggestions, written as in
part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md). Every number was measured in headless Chromium 153 with
SwiftShader (no GPU) at 1280 × 720, and says nothing of real devices.

游戏后来升级到 `aab331d`，所有界面改用引擎的数据界面（`game.show`）、屏幕栈和语义树重做；第 1、2、5 条写了现在的做法，第 6 条起是这次记下的。

The game later moved to `aab331d` and every screen was made again with the engine's views described as data
(`game.show`), its screen stack and its semantic tree; items 1, 2 and 5 say what the game does now, and items from 6 on
were written during that work.

本轮引擎集成：主干 `94bd70fb26b1f81794c9c6fbbb258c655fcd19df`（#502–#506），按需采用原生能力；下列原先的版本号保留作为问题发生时的历史。

This integration vendors official main `94bd70fb26b1f81794c9c6fbbb258c655fcd19df` (#502–#506), adopting native capabilities where equivalent; older revisions below are historical evidence.

### 1. `play` 让页面按钮上的 Tab 和 Space 失灵 · `play` takes Tab and Space from the page's buttons — 已在 `450bb9e` 解决 / resolved in `450bb9e`
<!-- engine-note: {"id": "OperaDrums#1", "status": "resolved", "topic": "play-page-keys", "workaround": ["src/main.mjs"]} -->

- 现象：与 [CanalWatch 的 ENGINE-NOTES 第 1 条](../CanalWatch/ENGINE-NOTES.md)相同：`play` 在 `window` 上对 Tab、Space 和方向键 `preventDefault`，焦点在页面按钮上时 Tab 不换焦点、Space 不按按钮。本作的曲目、设置、暂停菜单和敲击区都是页面按钮。 · What happens: as CanalWatch's item 1; this game's song list, settings, pause menu and pads are all page buttons.
- 绕过办法：在 `window` 的捕获阶段先接住 `keydown` 并停止传播，敲击键 D、F、J、K 和暂停键都由 `src/main.mjs` 自己读；手柄仍用 `game.keys.pressed('pad:…')`，不受影响。 · Workaround: keys caught first in the capture phase; the gamepad still goes through `game.keys`.
- 建议：同 CanalWatch 第 1 条。 · Suggestion: as there.
- 状态：已在 `450bb9e` 解决（引擎 #457）：同 CanalWatch 第 1 条。 · Resolved in `450bb9e` (engine #457): as CanalWatch item 1.
- 现在：页面按钮都没有了，Tab、Space 和 Esc 归引擎的界面。敲击键 D、F、J、K 仍在 `window` 的捕获阶段读，为的是事件的时间戳，但不再停止传播。 · Now: there are no page buttons; Tab, Space and Escape belong to the engine's views. D, F, J and K are still read in the capture phase for their time stamps, without stopping the event.

### 2. `play({ parent, transparent: true })` 的画布盒子是黑的 · A black holder under a clear canvas — 已在 `450bb9e` 解决 / resolved in `450bb9e`
<!-- engine-note: {"id": "OperaDrums#2", "status": "resolved", "topic": "play-clear-holder", "workaround": ["src/main.mjs"]} -->

- 现象：与 [CanalWatch 的 ENGINE-NOTES 第 2 条](../CanalWatch/ENGINE-NOTES.md)相同：装画布的盒子写死 `background:#000`，页面画的戏台透不出来。 · What happens: as CanalWatch's item 2; the stage the page paints does not show through.
- 绕过办法：`play` 返回后把 `game.canvas.parentElement` 的背景改成透明（`src/main.mjs`）。 · Workaround: the holder made clear once `play` has returned.
- 建议：同 CanalWatch 第 2 条。 · Suggestion: as there.
- 状态：已在 `450bb9e` 解决（引擎 #457）：同 CanalWatch 第 2 条。 · Resolved in `450bb9e` (engine #457): as CanalWatch item 2.
- 现在：`play({ transparent: true })` 铺满窗口，不再给 `parent`；页面在画布下面画静止的戏台图（见第 19 条）。 · Now: a clear `play` fills the window with no `parent`; the page paints the still stage picture under it (item 19).

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
- 现在：本作用 `play({ audio: false })`。 · Now: the game passes `audio: false`.

### 6. 文字部件不按宽度折行 · A text part is not wrapped to its width — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#6", "status": "open", "topic": "view-text-wrap", "workaround": ["src/ui/wrap.mjs"]} -->

- 现象：数据界面的 `text` 是一行字，按 `\n` 分行，但不会按部件的宽度折行；要折行就得给 `paragraph` 和 `paragraphCache`，而段落 SDK 要游戏自己选字体和排版提供者（浏览器里是 CanvasKit 和 Noto 字体，几兆字节）。怎么敲、压轴说明、校准说明和存档提示都是几十字的长句。 · What happens: A view's `text` is one line, broken at `\n` but not to the part's width; wrapping needs `paragraph` with a `paragraphCache`, and the paragraph SDK wants a provider and fonts chosen by the game (CanvasKit and Noto in a browser, a few megabytes). The guide, the encore, the delay and the save notices are sentences of dozens of characters.
- 绕过办法：`src/ui/wrap.mjs` 用页面画布的 `measureText`、按引擎画字时同样的字体（见第 22 条）量字，中文按字、英文按词断行，再把 `\n` 连起来的几行交给文字部件，部件的高度按行数算。 · Workaround: `src/ui/wrap.mjs` measures with the page canvas's `measureText` in the font the engine draws with (item 22), breaks Chinese between characters and English between words, and hands the lines joined by `\n` to the text part, as tall as its lines.
- 建议：文字部件加 `wrap: true`（或 `maxLines`），用引擎自己画字时的量法折到部件宽度，不必带上段落 SDK。 · Suggestion: `wrap: true` (or `maxLines`) on a text part, wrapping to the part's width with the measure the engine already draws with, without the paragraph SDK.
- 状态：未解决 · Open.

### 7. 界面文字不能选字体 · View text has no typeface — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#7", "status": "open", "topic": "ui-typography-styling", "workaround": ["src/ui/screens.mjs"]} -->

- 现象：`text`、`button` 部件没有字体一项，皮肤里也没有，全用 `sans-serif`。原来的标题「锣鼓经」和戏名用宋体一类的衬线字，和京剧的戏单相配。 · What happens: Text and button parts take no typeface, nor does the skin; everything is `sans-serif`. The title and the act names used to be set in a serif face, as a Peking opera playbill is.
- 绕过办法：标题改用粗的无衬线字，靠字号和颜色撑。 · Workaround: The title is set bold in the sans-serif face, carried by size and colour.
- 建议：`text` 和皮肤加 `family`（页面已有的字体或系统字体族），和 `game.text` 底下的标签用同一套。 · Suggestion: A `family` on text parts and in the skin (a face the page has, or a system family), the same as the labels under `game.text`.
- 状态：未解决 · Open.

### 8. 空字的文字部件让语义树发布失败 · An empty text part makes the semantic tree refuse to publish — 已解决 / resolved (#501)
<!-- engine-note: {"id": "OperaDrums#8", "status": "resolved", "topic": "view-empty-text-semantics"} -->

- 现象：有名字的 `text` 部件在语义树里是 `text` 节点，名字必须有非空白的字。绑定一时给出 `''`（校准对话框还没有读数时）时，`publish()` 抛 `UI_SEMANTICS_DESCRIPTION`（cause：`view5:count: name`），每帧末尾的发布也会抛。 · What happens: A named text part is a `text` node of the tree, whose name must have a visible character. When its binding gives `''` for a while (the delay dialog before its count), `publish()` throws `UI_SEMANTICS_DESCRIPTION` (cause `view5:count: name`), the publication at the end of each frame included.
- 已移除的绕过办法：校准读数和可选通知无需仅为语义树追加 visible。 · Removed the visibility shim for optional calibration readout and notice.
- 建议：没有字的文字部件在语义树里当作隐藏，而不是让整棵树拒绝发布。 · Suggestion: Publish a text part with no words as hidden rather than refusing the whole tree.
- 状态：#501 原生处理空文字，严格校验仍适用于控件名称。 · Native blank text handling in #501; control names remain strict.

### 9. 同时载入第五张图片时直接拒绝，不排队 · A fifth image loading at once is refused, not queued — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#9", "status": "open", "topic": "image-job-limit", "workaround": ["src/main.mjs"]} -->

- 现象：浏览器游戏同时最多四个图片任务（`MAX_GAME_IMAGE_JOBS = 4`），第五个抛 `WEB_PNG_JOB_LIMIT`。标题画面有三张戏画，加上乐器图和戏台图就超了；数据界面里 `image` 部件载入失败会让游戏停下，画面整个是黑的。 · What happens: A browser game loads at most four images at once (`MAX_GAME_IMAGE_JOBS = 4`); a fifth throws `WEB_PNG_JOB_LIMIT`. The title's three portraits with the instruments and the stage made five, and an `image` part that fails to load stops the game: the screen stayed black.
- 绕过办法：开场先用 `game.loading` 两个一批载入全部图片并留住租约，界面里的 `image` 用同样的地址，命中已经载好的那份（`src/main.mjs`）。 · Workaround: Every picture is loaded first, two at a time, under `game.loading`, and its lease kept; the views' `image` parts ask for the same addresses and share them.
- 建议：超出的任务排队等前面的完成，而不是失败。 · Suggestion: Queue the jobs past the limit until earlier ones finish, rather than failing them.
- 状态：未解决 · Open.

### 10. `setup` 等着的界面不画 · A view that `setup` awaits is not drawn — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#10", "status": "open", "topic": "view-during-setup", "workaround": ["src/main.mjs"]} -->

- 现象：`setup` 里 `await game.loading(...)` 时，载入条看不见：`play` 只为文字框和菜单（`say`、`menu`）提前开始帧，数据界面（`show`、`loading`、`confirm`）不会。载入失败时 `setup` 里打开的错误界面同样画不出来。 · What happens: While `setup` awaits `game.loading(...)` the bar is not seen: `play` starts the frames early only for boxes of words and menus (`say`, `menu`), not for views (`show`, `loading`, `confirm`). An error screen shown in `setup` after a failed load is not drawn either.
- 绕过办法：`setup` 只留下游戏对象；`play` 返回、帧开始以后再载入，失败时显示带「再试一次」的界面（`src/main.mjs`）。 · Workaround: `setup` only keeps the game; loading starts once `play` has returned and the frames run, with a screen offering to try again when it fails.
- 建议：`setup` 等着的数据界面也提前开始帧，和 `say`、`menu` 一样。 · Suggestion: Start the frames for a view that `setup` awaits, as for `say` and `menu`.
- 状态：未解决 · Open.

### 11. 界面的点按在抬起时才算 · A view's tap counts when the finger lifts — 部分解决 / partly resolved (#499)
<!-- engine-note: {"id": "OperaDrums#11", "status": "partly", "topic": "view-press-down", "workaround": ["src/main.mjs", "src/ui/stage-ui.mjs"]} -->

- 现象：敲击区要的是按下的那一刻：音符判定按的是按下的时间。数据界面的 `tap` 在抬起时才调用，也不带事件的时间戳。 · What happens: A pad wants the moment it goes down: a note is judged by the time of the press. A view's `tap` is called when the contact lifts, and carries no time stamp.
- 绕过办法：敲击区的部件用 `view.get(name)` 取出精灵，直接听引擎指针输入的 `events.begin`，取 `contact.timestamp`；抬起后的 `tap` 不再算一下，按键和读屏软件激活时才由 `tap` 敲（`src/main.mjs` 的 `padBuilt`）。 · Workaround: Each pad's sprite from `view.get(name)` listens to `events.begin` of the engine's pointer input and takes `contact.timestamp`; the `tap` after a press is not counted again, and strikes only when a key or assistive technology activates the pad.
- 建议：绑定加 `press`（按下时调用，带时间戳）和 `release`，供敲击、蓄力和按住的控件用。 · Suggestion: A `press` binding (called as the contact goes down, with its time stamp) and a `release`, for pads, charges and held controls.
- 状态：#499 已提供原生 tap 激活来源，删除 1500 ms 猜测窗口，指针抬起不再重复敲击；保留引擎 begin/end/cancel 与真实时间戳供节奏判定。原生声明式按下/抬起绑定仍待补充。 · #499 activation.source removes the 1500 ms heuristic. Pointer release never strikes twice; engine begin/end/cancel and timestamps are still needed for timing. Declarative press/release remains open.

### 12. 选中状态进不了语义树 · A chosen part cannot say it is chosen — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#12", "status": "open", "topic": "view-selected-state", "workaround": ["src/ui/screens.mjs"]} -->

- 现象：三出戏和三档难度是单选：原来的按钮有 `aria-pressed`。数据界面的按钮和可点的面板没有 `selected` 或 `pressed` 绑定，语义树里看不出哪个被选中。 · What happens: The three acts and three difficulties are each a single choice; the old buttons had `aria-pressed`. Views' buttons and tappable panels have no `selected` or `pressed` binding, so the tree cannot tell which is chosen.
- 绕过办法：选中的戏画右上角有一块「已选」的牌子（是有名字的文字，读屏能读到），选中的难度前面加 ✓。 · Workaround: The chosen act carries a tag reading Chosen (a named text, read by a screen reader), and the chosen difficulty starts with ✓.
- 建议：按钮和可点面板加 `selected` 绑定，语义树里作 `selected`；或者给一组单选一个 `choice` 部件。 · Suggestion: A `selected` binding on buttons and tappable panels, published as `selected`; or a `choice` part for a group of single choices.
- 状态：未解决 · Open.

### 13. 按钮的读屏名字只能是它的字 · A button's accessible name is only its words — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#13", "status": "open", "topic": "view-accessible-label", "workaround": ["src/ui/screens.mjs"]} -->

- 现象：设置里的音量、流速和延迟各有一对「−」「+」按钮，读屏只读出「−」「+」。按钮没有独立的 `label`（只有要段落 SDK 的 `description`）。 · What happens: The volume, note speed and delay each have a − and a + button, and a screen reader says only − and +. Buttons have no `label` of their own (only `description`, which needs the paragraph SDK).
- 绕过办法：每对按钮放在一个以设置名为 `label` 的面板里，语义树里成了「伴奏音量 / −」这样的路径。 · Workaround: Each pair sits in a panel whose `label` is the setting's name, so the tree reads `Backing volume / −`.
- 建议：按钮加 `label`：读屏用它，画面上仍是 `text`。 · Suggestion: A `label` on buttons for assistive technology, with `text` still what is drawn.
- 状态：未解决 · Open.

### 14. 没有把焦点放到某个部件上的调用 · No call to put the focus on a named part — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#14", "status": "open", "topic": "view-focus-call", "workaround": ["src/ui/screens.mjs"]} -->

- 现象：标题打开时焦点应在选中的那出戏上，开演后在鼓上，校准开始后在敲击区上。`PlayView` 有 `get`、`rect`、`shows`，没有 `focus(name)`。 · What happens: The title should open with the focus on the chosen act, a song on the drum pad, the delay on its tap pad. `PlayView` has `get`, `rect` and `shows`, but no `focus(name)`.
- 绕过办法：在语义树的快照里按 id 的结尾（`:名字`）找到节点，`semantics.perform(id, 'focus')`（`src/ui/screens.mjs` 的 `focus`）。这依赖界面内部的 id 写法。 · Workaround: The node is found in the tree's snapshot by the end of its id (`:name`) and given `semantics.perform(id, 'focus')`, which leans on how views write their ids.
- 建议：`view.focus(name)`。 · Suggestion: `view.focus(name)`.
- 状态：未解决 · Open.

### 15. 屏幕栈关掉对话框后焦点落空 · The focus is lost when a dialog of the screen stack closes — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#15", "status": "open", "topic": "stack-modal-focus-return", "workaround": ["src/main.mjs"]} -->

- 现象：文档说模态界面关掉后焦点回到原来的控件。用屏幕栈开关时（`open: () => game.show(...)`），在标题上用 Enter 打开「怎么敲」、Esc 关掉，之后语义树里没有任何节点有焦点，Tab 才能找回来。 · What happens: The documents say a modal view gives the focus back when it closes. Opened and closed through the screen stack (`open: () => game.show(...)`), the guide opened by Enter on the title and closed by Escape left no node of the tree focused until Tab was pressed.
- 绕过办法：打开对话框时记下当时有焦点的部件，关掉后两帧再把焦点放回去（`src/main.mjs` 的 `openModal`）。 · Workaround: The part with the focus is remembered when a dialog opens and given the focus again two frames after it closes.
- 建议：屏幕栈让页面重新 `activate` 时，界面把焦点还给它在模态前记下的控件。 · Suggestion: When the stack activates a page again, return the focus to the control it had before the modal.
- 状态：未解决 · Open.

### 16. 页面投影的逻辑尺寸是固定的 · The page projection's logical size is fixed — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#16", "status": "open", "topic": "semantics-projection-resize", "workaround": ["src/main.mjs"]} -->

- 现象：`createBrowserSemantics` 的 `width`、`height` 建好后不变，而 `fit: 'expand'` 的舞台尺寸随窗口变（`game.screen`），横竖屏一转就不同。 · What happens: `width` and `height` of `createBrowserSemantics` stay as made, while an `expand` stage changes size with the window (`game.screen`), and again when the phone turns.
- 绕过办法：`arrange` 里发现 `game.screen` 的尺寸变了就销毁旧的投影、按新尺寸再建一个。 · Workaround: `arrange` disposes of the projection and makes another at the new size whenever `game.screen` changes.
- 建议：投影接受取尺寸的函数，或者 `play` 直接给出跟着 `game.screen` 走的投影。 · Suggestion: Let the projection take a function for its size, or have `play` offer a projection that follows `game.screen`.
- 状态：未解决 · Open.

### 17. 组的读屏名字不能绑定，隐藏的部件仍占位置 · Group names cannot be bound, and hidden parts keep their room — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#17", "status": "open", "topic": "view-label-binding", "workaround": ["src/main.mjs", "src/ui/screens.mjs"]} -->

- 现象：面板的 `label` 和整个界面的 `label` 写死在描述里，换语言后读屏仍读旧语言，只能把界面关掉重建。另外行和列排版时不看 `visible`：藏起来的部件照样占着位置，结算页上「接打压轴」和存档提示只能在建界面时决定有没有。 · What happens: A panel's `label`, and a view's, are fixed in the description: after a change of language a screen reader still hears the old one until the view is made again. Rows and columns also lay out without `visible`: a hidden part keeps its room, so the curtain call decides when it is made whether it has the encore button and the save notice.
- 绕过办法：换语言时关掉屏幕栈里所有画面，按原来的样子重开（`src/main.mjs` 的 `relabel`）；结算页按结果建。 · Workaround: A change of language closes every screen of the stack and opens them again as they were; the curtain call is described from its result.
- 建议：`label` 可以是函数；行和列加 `collapse: true`，藏起来的部件不占位置。 · Suggestion: Allow a function for `label`; `collapse: true` on rows and columns so hidden parts take no room.
- 状态：未解决 · Open.

### 18. 只有横屏和竖屏两套部件 · Only a wide and a tall set of parts — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#18", "status": "open", "topic": "view-size-classes", "workaround": ["src/ui/screens.mjs"]} -->

- 现象：竖屏部件按手机做，控件都放到 64 个单位以上（390 像素宽的手机上约 46 像素）。横屏部件按桌面 960×680 做；手机横着拿（844×390）时用的也是这一套，缩到 0.57 倍，标题和对话框的按钮只有约 25–30 像素高。原来的网页按钮按 CSS 像素定大小，横着拿也有 44 像素。 · What happens: The tall parts are made for a phone, every control at least 64 units (about 46 pixels on a 390-pixel phone). The wide parts are made for a 960 × 680 desktop; a phone held sideways (844 × 390) uses them too at 0.57, and the title's and dialogs' buttons are about 25–30 pixels tall. The old page buttons were sized in CSS pixels and kept 44 on their side.
- 绕过办法：没有绕过；写进已知问题。 · Workaround: None; it is a known issue.
- 建议：按尺寸分的变体（例如 `compact`：短边小于某个值时用），或者部件尺寸可以写成最小的屏幕像素。 · Suggestion: Variants by size (a `compact` set when the short side is small), or part sizes given as a least size in screen pixels.
- 状态：未解决 · Open.

### 19. 全窗画布加界面，在软件渲染下更贵 · A window-wide canvas with views costs more under software rendering — 已写入文档 / documented
<!-- engine-note: {"id": "OperaDrums#19", "status": "documented", "topic": "still-layer-cache", "workaround": ["src/main.mjs", "style.css"]} -->

- 现象：原来画布只盖戏台（960×540），背景是页面的 CSS。改成铺满窗口的画布、整屏戏台图由引擎每帧画以后，标题画面的帧时间 p50 约 100 ms，演出中的平均帧时间约 26 ms（原来 17.5 ms）。 · What happens: The canvas used to cover only the stage (960 × 540), with the page's CSS behind it. Spread over the window, with the full-screen stage picture drawn by the engine every frame, the title ran at about 100 ms p50 and a performance at about 26 ms mean (17.5 before).
- 绕过办法：照 guide 卡片 still-background：画布透明，静止的戏台图由页面画在下面（菜单后面铺满窗口，演出时在 `stage` 部件的位置下面）；`renderMode: 'on-demand'`；软件渲染时 `pixelRatio: 0.75`。之后标题帧时间 p95 16.7 ms（`tools/quality.mjs` 的 F1），演出中平均约 17.3 ms。 · Workaround: As the still-background card says: a clear canvas with the still picture painted by the page under it (filling the window behind the menus, under the `stage` part in a performance); `renderMode: 'on-demand'`; `pixelRatio: 0.75` under software rendering. After that the title ran at 16.7 ms p95 (F1 of `tools/quality.mjs`) and a performance at about 17.3 ms mean.
- 建议：同 LubanBridge 第 4 条：静止层烘成一张纹理，不变就只合成。 · Suggestion: As LubanBridge item 4: a still layer baked to one texture and only composited while it does not change.
- 状态：已写入文档（引擎 #485，`8637ace`）：guide 卡片 still-background；静止层本身还没有。 · Documented (engine #485, `8637ace`): the still-background guide card; a still layer itself is not there yet.

### 20. `game.burst` 没有图层 · `game.burst` has no layer — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#20", "status": "open", "topic": "burst-layer", "workaround": ["src/view.mjs"]} -->

- 现象：戏台画在一个按屏幕缩放的容器里（竖屏时 0.5625 倍）。`game.burst` 只能放在世界层的坐标上，大小和速度也不随容器缩放。 · What happens: The stage is drawn in a container scaled to the screen (0.5625 on a tall one). `game.burst` takes only world coordinates, and its size and speed do not follow the container.
- 绕过办法：`src/view.mjs` 把判定线的点按容器换成世界坐标，大小和速度乘上容器的缩放。 · Workaround: `src/view.mjs` carries the timing line's point into world coordinates and multiplies size and speed by the container's scale.
- 建议：`burst` 加 `layer`，和 `game.text`、`game.image` 一样。 · Suggestion: A `layer` on `burst`, as `game.text` and `game.image` have.
- 状态：未解决 · Open.

### 21. 没有 `label` 的面板按部件名读出 · A panel without a `label` is read by its part's name — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#21", "status": "open", "topic": "view-group-name-fallback", "workaround": ["src/ui/screens.mjs", "src/ui/stage-ui.mjs"]} -->

- 现象：有 `name` 的面板在语义树里是组，没有 `label` 时组的名字就是部件名。演出页的 `readout-box`、标题上「已选」牌子的 `chosen-qiba` 都这样进了页面投影的 `aria-label`，读屏会念出这些内部名字；发布时不报错，上线后在线上页面里才看到。给面板起名往往只是为了绑定颜色或显隐。 · What happens: a named panel is a group of the tree, and without a `label` its name is the part's name, so `readout-box` and `chosen-qiba` reached the page projection's `aria-label` and a screen reader would say them. Nothing complains at publish time; it was found on the live page. A panel is often named only to bind its colour or visibility.
- 绕过办法：需要绑定的面板都给 `label`；只为排版的面板不起名；装饰性的图片不给 `label`。验收里加了一项：语义树里没有名字等于部件名的组。 · Workaround: every bound panel has a `label`, panels only for layout have no name, and decorative pictures no `label`; the acceptance checks that no group of the tree is named by its part.
- 建议：没有 `label` 的面板发布成没有名字的组（或者只作为容器，不进语义树），而不是拿部件名当名字；或者在开发时对这种组给出警告。 · Suggestion: publish a panel without a `label` as a group with no name, or as a plain container left out of the tree, instead of using the part's name; or warn about it while developing.
- 状态：未解决 · Open.

### 22. 引擎要的字体是带引号的 `"sans-serif"` · The engine asks for `"sans-serif"` in quotes — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#22", "status": "open", "topic": "text-font-quoted-generic", "workaround": ["src/ui/wrap.mjs"]} -->

- 现象：浏览器游戏的 `createLabel` 和 `createAtlasLabel`（`game.text` 和数据界面的字都走后者）默认 `fontFamily: 'sans-serif'`，交给画布文字提供者，提供者为了只给一个字体名，把它写成 `"sans-serif"`（带引号）。按 CSS 的规则，带引号的通用字体名是一个叫这个名字的具体字体，不是通用的无衬线字体族；找不到时用浏览器的默认字体。在无头 Chromium 里量同一句英文，16 px 下 `sans-serif` 是 492.7 px、`"sans-serif"` 是 519.3 px，所以游戏按通用字体族量好、折好的行，引擎画出来会宽出约 5%，超出面板边。默认字体是衬线字（桌面浏览器常见的设置）的电脑上，界面字可能整体画成衬线字；这一点没有在真机上看过。 · What happens: a browser game's `createLabel` and `createAtlasLabel` (which `game.text` and the views' words use) default to `fontFamily: 'sans-serif'` and hand it to the canvas text provider, which writes it as `"sans-serif"` in quotes so as to name one family. By the CSS rules a quoted generic name is a family called that, not the generic sans-serif family, and the browser's default font stands in when there is none. Headless Chromium measured one English sentence at 16 px as 492.7 px in `sans-serif` and 519.3 px in `"sans-serif"`, so lines a game measures and breaks in the generic family come out about 5% wider and cross the panel's edge. Where the default font is a serif (a common desktop setting) the interface may be drawn in a serif; that was not seen on a real machine.
- 绕过办法：`src/ui/wrap.mjs` 量字时也写带引号的 `"sans-serif"`，和引擎画出来的一致。 · Workaround: `src/ui/wrap.mjs` measures in `"sans-serif"` with the quotes too, as the engine draws.
- 建议：通用字体族（`sans-serif`、`serif`、`monospace`、`system-ui` 等）不加引号；再给游戏一个量字的函数（`game.measureText(text, { size, bold })`），用和画字同一套字体。 · Suggestion: leave the generic families (`sans-serif`, `serif`, `monospace`, `system-ui` and the like) unquoted, and give games a measure (`game.measureText(text, { size, bold })`) in the font the engine draws with.
- 状态：未解决 · Open.

### 23. 放不下的字不缩小，多行字只能整块居中 · Words that do not fit are not shrunk, and lines are centred only as a block — 未解决 / open
<!-- engine-note: {"id": "OperaDrums#23", "status": "open", "topic": "view-text-fit", "workaround": ["src/ui/wrap.mjs", "src/ui/screens.mjs"]} -->

- 现象：英文下「Opera Drums」、「Take the stage · The General Arms · Easy」、「The General Arms」比部件宽，字直接画出部件外面，压到旁边的戏画和按钮上；引擎不缩字、不截断、也不提示。中文版的截图基线看不出来，上线后在英文页面上才发现。用 `\n` 把按钮的字分成两行时，`align: 'center'` 只把整块字放在中间，每一行都靠左。 · What happens: in English the title, the way in and the act names were wider than their parts and were drawn past them over the paintings and buttons; the engine neither shrinks, cuts nor warns. The Chinese baselines did not show it; it was found on the live English page. With a button's words broken by `\n`, `align: 'center'` centres the block and every line stands flush left.
- 绕过办法：`src/ui/wrap.mjs` 的 `fitWords` 按引擎排版的规则算出每个文字和按钮部件的宽度，量过后把放不下的字号调小；按绑定会变的字（开演按钮、难度、压轴）先量出所有可能的字，取都放得下的字号，太长时在第一个「 · 」处分成两行，短的那行前面补不换行空格让它看起来居中。 · Workaround: `fitWords` works out each text and button part's width as the engine lays them out and makes the size smaller where the words do not fit; for bound words (the way in, the difficulties, the encore) every possible text is measured first, a size taken that fits them all, and a text too long is broken at its first « · », the shorter line led by no-break spaces to stand centred.
- 建议：文字和按钮部件加 `fit: 'shrink'`（缩到放得下，有最小字号）和 `maxLines`；多行字按 `align` 逐行对齐；开发时字超出部件给警告。 · Suggestion: `fit: 'shrink'` (down to a least size) and `maxLines` on text and button parts, lines aligned one by one by `align`, and a warning while developing when words run past their part.
- 状态：未解决 · Open.


### 24. 静止模态框呈现延迟 · Static modal presentation delay — 已在游戏侧绕过 / worked around
<!-- engine-note: {"id":"OperaDrums#24","status":"worked-around","topic":"static-webkit-presentation","files":["src/ui/screens.mjs"]} -->

- 现象：Windows WebKit 上实际点击设置后语义控件已切换，截图仍停留标题。 · In Windows WebKit a real settings tap changed semantics while screenshot retained the title.
- 绕过办法：创建静态界面时合并一次 250 ms 刷新，保持按需绘制。 · Coalesce one delayed invalidation per static view while retaining on-demand drawing.
- 建议：用真实截图验证静止模态框的首帧呈现。 · Verify first presentation of static modals using screenshot pixels.
- 状态：候选版本 WebKit 触屏路线实测通过；未在物理 iPhone 上验证。 · Candidate WebKit touch route tested; no physical iPhone verification.
