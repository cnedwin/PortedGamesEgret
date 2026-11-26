# 引擎笔记 · Engine notes

做《千机巧匠》时记下的新白鹭引擎（[Egret_rebuild](https://github.com/cnedwin/Egret_rebuild)）的缺口、别扭处、文档不清处和建议。原则是：引擎有的能力一律用引擎 API 实现；引擎没有的，用引擎已有的部件拼出效果，并在这里写明，不在游戏里另写一套替代品。

Gaps, awkward spots, unclear documentation and suggestions found in the new Egret engine
([Egret_rebuild](https://github.com/cnedwin/Egret_rebuild)) while making *Mechanism City*. The rule is: whatever the
engine offers is done through its API; where it offers nothing, the effect is built from parts the engine does have
and written down here, rather than replaced by code of the game's own.

第 1–17 条最初记于提交 `0e72ffb`。引擎在 `687037a`（PR #419–#422）按这些笔记做了修改，游戏随之升级；每条注明现在的状态和这边的改法。第 18–20 条是升级时新发现的。

Items 1–17 were first written at commit `0e72ffb`. The engine changed after them in `687037a` (PRs #419–#422) and the
game was upgraded with it; each item now says where it stands and what the game does. Items 18–20 were found during
the upgrade.

状态 · Status: **已解决 / resolved** · **部分解决 / partly resolved** · **未解决 / open** · **已写入文档 / documented**

---

## 物理 · Physics 2D

### 1. 关节、绳索和旋转 · Joints, ropes and rotation — 部分解决 / partly resolved

- 原来：没有关节、绳索，刚体不转动，种类建好后不能改。吊着的重物是 kinematic 刚体，绳断时删掉再建一个 dynamic 的。
- 687037a：有了 `world.addJoint({ kind: 'distance' | 'rope', ... })`、`removeJoint` 和 `body.setKind()`。
- 本作现在：吊着的重物一开始就是 dynamic 刚体，由一根 `kind: 'rope'` 的关节拴在锚点上（`point`，锚在重物顶部 `anchorA`），被打中会在绳上摆动；弹丸路径扫过绳子（从锚点到重物顶部的线段）或雷丸炸到时 `removeJoint` 剪断。原来的删建代码和画面上手写的摆动都删掉了。关卡里没有其他"托住"的物体，所以 `setKind` 暂时用不上。12 关的解法在新绳子下全部重新验证通过。
- **仍未提供**：刚体自己转动（角速度、力矩）和会让木板转动的铰链。跷跷板保持原样：kinematic 木板由规则设定角度，再给高起一端上的物体一个冲量；滚石的转动只在画面上。

- Before: no joints or ropes, bodies did not turn, and a body's kind was fixed. A hanging weight was a kinematic body,
  removed and made again as a dynamic one when its rope was cut.
- 687037a: `world.addJoint({ kind: 'distance' | 'rope', ... })`, `removeJoint` and `body.setKind()`.
- This game now: a hanging weight is a dynamic body from the start, held by a joint of `kind: 'rope'` to its anchor
  (`point`, tied to the top of the weight with `anchorA`), and swings on it when struck; a pellet whose path crosses
  the rope (from the anchor to the top of the weight), or a thunder pellet bursting near it, cuts it with
  `removeJoint`. The code that remade the body, and the sway painted by hand, are gone. No level holds anything else, so
  `setKind` is not needed yet. The solutions of all twelve levels were verified again with the new rope.
- **Still missing**: bodies that turn by themselves (angular speed, torque) and a hinge that turns a plank. The seesaw
  stays as it was: a kinematic plank whose angle the rules set, then an impulse to what is on the rising end; a stone's
  roll is only its picture turning.

### 2. 接触回调里能做什么 · What a contact listener may do — 已写入文档 / documented

- 原来：文档没说回调里能否改动世界。本作在回调里只把要做的事记进队列，步完再执行。
- 687037a：文档写明回调里可以增删刚体和关节、施冲量、改种类，改动从下一步生效；不能调用 `step`（`PHYSICS_STEP_REENTRANT`）。
- 本作现在：保留队列。效果和直接改相同（都在下一步生效），队列让碎箱、断绳、开锁的规则按固定顺序执行，读起来集中在一处。

- Before: the documentation did not say whether a listener may change the world; the game queued what should happen
  and ran it after the step.
- 687037a: the documentation says a listener may add and remove bodies and joints, push bodies and change their kind,
  taking effect from the next step, and may not call `step` (`PHYSICS_STEP_REENTRANT`).
- This game now: keeps the queue. It acts at the same moment as a change made in the listener would (the next step),
  and keeps breaking crates, cutting ropes and opening locks in one fixed order, in one place.

---

## 渲染 · Rendering

### 3. 形状遮罩的代价 · The cost of a shape mask — 部分解决 / partly resolved

- 原来：遮罩只要移动或缩放就在 CPU 上重画一张图。从弩机放大到全屏的圆形遮罩转场，在软件渲染下拖了约一分钟。
- 687037a：只移动的遮罩沿用原图；均匀缩放在变化超过约 9% 前沿用原图并拉伸，放大一倍约重画 8 次。文档写明了代价，并建议转场用淡出的色块。
- 本作实测（升级后恢复圆形遮罩转场，无头 Chromium、1280×720、软件渲染）：圆从半径 5 放大到 1200，用时 0.9 秒的动画实际走了 **14 秒**，共 17 帧；其中 7 次重画分别耗时 120、60、203、1001、2704、4697、4683 毫秒，其余帧约 20 毫秒。重画是 JS 在 CPU 上算的，与软件渲染无关，真机快几倍也仍会卡顿一秒左右。
- 本作现在：转场仍用全屏黑幕淡出。遮罩用在不动的小物件上：对白头像的圆框（`mask = sprite`），选关列表的矩形裁剪（`mask = {x, y, width, height}`）。
- 建议：圆、矩形这类简单形状走 GPU 模板或解析式遮罩；或者让遮罩图的尺寸按屏幕上的大小封顶，而不是按被遮节点的两倍。

- Before: a mask was drawn again on the CPU whenever it moved or was scaled; a circle growing from the crossbow to the
  whole screen took about a minute under software rendering.
- 687037a: a mask that only moves keeps its image; one scaled evenly keeps it, stretched, until it has changed by about
  9%, so a growing mask is drawn again some 8 times for each doubling. The documentation states the cost and suggests a
  fading veil for transitions.
- Measured here, with the circle transition restored after the upgrade (headless Chromium, 1280×720, software
  rendering): the circle grew from radius 5 to 1200; an animation of 0.9 s took **14 s** over 17 frames. Seven
  redraws cost 120, 60, 203, 1001, 2704, 4697 and 4683 ms, the other frames about 20 ms. The drawing is JavaScript on
  the CPU, not the software renderer, so a real device a few times faster would still stall for about a second.
- This game now: the transition is still a black veil fading out. Masks are on small things that do not move: the
  round frame of the speaker's portrait (`mask = sprite`) and the clip of the level list (`mask = {x, y, width, height}`).
- Suggestion: a stencil or analytic mask on the GPU for simple shapes such as circles and rectangles, or a cap on the
  mask image at its size on the screen rather than twice the masked node.

### 4. 粒子的混合模式 · The blend mode of particles — 已解决 / resolved

- 原来：发射器没有混合模式选项，只能事后设 `emitter.display.blendMode`。
- 本作现在：创建时传 `blendMode: 'add'`（火花、雷光、锁开的金光、弹丸拖尾）。

- Before: no blend option; `emitter.display.blendMode` was set afterwards.
- This game now: `blendMode: 'add'` is given when the emitter is made (sparks, thunder, the glint of an opened lock,
  the pellet's trail).

### 5. 每帧最多 8 组效果 · At most eight effect groups a frame — 已写入文档 / documented

- 687037a：文档写明第 9 组会让 Host 拒绝这一帧，错误为 "more than 8 effect groups in one frame"。
- 本作现在：不变。任何时刻有效果的节点不超过 8 个（机关锁、标题、选中的卡片、结算星星、头像遮罩）。

- 687037a: the documentation says a ninth group makes the Host refuse the frame, with "more than 8 effect groups in one
  frame".
- This game now: unchanged; never more than eight nodes with effects at once (the locks, the title, the chosen card,
  the stars of a result, the portrait's mask).

### 6. 径向渐变的三角形很多 · Radial gradients cost many triangles — 未解决 / open

- 现象：`beginRadialGradientFill` 为了平滑会细分出很多三角形，每帧重画代价明显。
- 本作：渐变只在形状或状态改变时重画（弩、瞄准线、弹簧、按钮只在状态或焦点变化时重画）。
- 建议：文档提示渐变的细分代价，或对没变的 Graphics 自动缓存。

- What happens: `beginRadialGradientFill` subdivides into many triangles, and painting it every frame is costly.
- This game: gradients are painted again only when a shape or its state changes.
- Suggestion: mention the cost, or cache Graphics that have not changed.

### 7. 代码画的贴图 · Textures painted in code — 已解决 / resolved

- 原来：要 `createImageData2D` → `createTexture` → `createAssetType` → `register` → `acquire` 五步，游戏封装成 `leasePainted()`。
- 本作现在：`await game.textureFromCanvas(canvas)` 一步拿到租约（粒子光点、木屑、位图字体页），`leasePainted()` 已删除。

- Before: five steps, wrapped by the game as `leasePainted()`.
- This game now: `await game.textureFromCanvas(canvas)` gives the lease in one step (the particle dot, the splinter,
  the page of the bitmap font); `leasePainted()` is gone.

### 8. `backend: 'auto'` 的控制台日志 · The console line of `'auto'` — 已写入文档 / documented

- 687037a：文档写明无头浏览器里那条 "No available adapters." 来自浏览器本身，并建议检查控制台错误的场合用 `'webgl2'`。
- 本作现在：保持 `backend: 'webgl2'`（地址加 `?backend=webgpu` 可试 WebGPU）。

- 687037a: the documentation says "No available adapters." in a headless browser comes from the browser itself, and
  suggests `'webgl2'` where console errors are checked.
- This game now: keeps `backend: 'webgl2'` (`?backend=webgpu` tries WebGPU).

---

## 界面 · UI

### 9. 托管界面叶子里的文字 · Labels in managed UI leaves — 已解决 / resolved

- 原来：`game.createLabel()` 的文字属于游戏的 scope，放不进叶子；游戏把文字在提交后按 `localToGlobal` 叠放到叶子上。
- 687037a：`createLabel({ scope })`；`UI_CONTENT_INVALID` 的 cause 写明是哪个叶子、什么原因。
- 本作现在：设置卡每个叶子在 `prepare(context)` 里用 `game.createLabel({ ..., scope: context.scope })` 做文字，作为叶子内容返回；叠放代码已删除。已在浏览器里确认显示正常。

- Before: a label belonged to the game's scope and could not be a leaf's content; the game laid the words over the
  committed leaves with `localToGlobal`.
- 687037a: `createLabel({ scope })`, and the cause of `UI_CONTENT_INVALID` names the leaf and the reason.
- This game now: each leaf of the settings card makes its words in `prepare(context)` with
  `game.createLabel({ ..., scope: context.scope })` and returns them as its content; the overlay code is gone. Checked
  in a browser.

### 10. 从按钮回调里 prepare · Preparing from a button's callback — 已解决，见第 19 条 / resolved, see item 19

- 687037a：输入分发或绘制期间调用的 `root.prepare()` 会等那次结束再开始；每个 `UI_BUSY` 在 cause 里写明原因。
- 本作现在：`setTimeout(0)` 已删除。但设置卡每次打开都新建一个根，而 `createUiRoot()` 本身在分发期间仍被拒绝，见第 19 条。

- 687037a: `root.prepare()` asked for while input is delivered or a frame drawn starts once that is over, and every
  `UI_BUSY` names its reason.
- This game now: the `setTimeout(0)` is gone, but the settings card makes a new root each time it opens, and
  `createUiRoot()` itself is still refused during delivery: see item 19.

### 11. 托管界面的显隐 · Showing and hiding managed UI — 已写入文档 / documented

- 687037a：文档写明可把根注册为图层管理器的浮层，用 `open(id)` / `close(id)` 显隐；每次新建也是预期用法。
- 本作现在：设置卡仍是每次打开新建、关闭时释放。

- 687037a: a root can be an overlay of the layer manager, shown and hidden with `open(id)` and `close(id)`; making one
  each time is also as intended.
- This game now: the settings card is still made on each open and disposed on close.

### 12. 滚轮需要悬停输入 · The wheel needs hover input — 已解决 / resolved

- 原来：要从 `@egret/engine/web/hover` 单独引入并创建 `createBrowserHoverInput`。
- 本作现在：`createBrowserGame({ hover: true })`，滚动控件的 `wheel` 用 `game.hover`；单独的引入已删除。另见第 20 条。

- Before: `createBrowserHoverInput` was imported from `@egret/engine/web/hover` and made by hand.
- This game now: `createBrowserGame({ hover: true })`, and the scroll control's `wheel` takes `game.hover`; the import
  is gone. See also item 20.

### 13. 焦点控件用掉的键 · Keys a focused control took — 已解决 / resolved

- 原来：空格在焦点按钮上既按按钮又发射；游戏读动作前查 `keyboard.getSnapshot()` 来屏蔽。
- 本作现在：`bindBrowserInputActions(actions, { keyTarget: canvas, skipPrevented: true })`，屏蔽判断已删除。已在浏览器里确认：焦点在「设置」上按空格只打开设置、不发射；焦点在力度滑条上按方向键只改力度、不转弩。`keyTarget` 保持为画布即可。

- Before: Space on a focused button also fired; the game checked `keyboard.getSnapshot()` before reading actions.
- This game now: `bindBrowserInputActions(actions, { keyTarget: canvas, skipPrevented: true })`, and the checks are
  gone. Checked in a browser: Space on the focused Settings button only opens the settings, and the arrows on the
  focused power slider only change the power. `keyTarget` can stay the canvas.

### 14. 语义节点的 `range` · The `range` of a semantic node — 已写入文档 / documented

- 687037a：文档写明 `range` 是 `{ now, min, max }`，并列出各角色可用的字段。本作不用改。

- 687037a: the documentation says a `range` is `{ now, min, max }` and lists the fields of each role. Nothing to change.

---

## 存档、声音、视频 · Saves, sound, video

### 15. `save.update` 的返回值 · What `save.update` returns — 已解决，见第 18 条 / resolved, see item 18

- 原来：回调返回非 `undefined` 的值就成为新存档，不经过 `validate`。
- 687037a：返回值和原地修改后的数据都要通过 `validate`；不通过时不写入、返回 `false`。
- 本作现在：所有 `update` 回调都是块体、不返回值；测试覆盖了"返回值被拒、不写入"。

- Before: anything other than `undefined` became the new save, without `validate`.
- 687037a: what is returned, and the data after an edit in place, must pass `validate`; otherwise nothing is written
  and `false` is returned.
- This game now: every `update` callback is a block that returns nothing; the tests cover a returned value being
  refused and not written.

### 16. Web Audio 后端 · A Web Audio backend — 已解决 / resolved

- 687037a：导出了 `createWebAudioBackend`，页面也能用 `createAudioMixer` 自建混音器。
- 本作现在：页面继续用 `createBrowserAudio`（它就是这三步的合并）；测试里用 `createAudioMixer` 加一个只记录调用的后端，验证总线分配和静音。

- 687037a: `createWebAudioBackend` is exported, so a page can make its mixer with `createAudioMixer`.
- This game now: the page keeps `createBrowserAudio`, which is those three steps in one; the tests drive
  `createAudioMixer` with a recording backend to check the buses and muting.

### 17. 视频的多个文件 · A film in several files — 已解决 / resolved

- 原来：`src` 只能给一个地址，游戏用 `canPlayType` 自己挑 mp4 还是 webm。
- 本作现在：`src` 直接给列表 `[{ src: 'intro.webm', type }, { src: 'intro.mp4', type }]`，浏览器播第一个能播的；`canPlayType` 判断已删除。已在 Chrome 和不带 H.264 的 Chromium 里确认播放的是 webm。

- Before: one address only; the game chose between the MP4 and the WebM with `canPlayType`.
- This game now: `src` is the list `[{ src: 'intro.webm', type }, { src: 'intro.mp4', type }]` and the browser plays
  the first it can; the `canPlayType` check is gone. Checked in Chrome and in Chromium without H.264.

---

## 升级时新发现 · Found during the upgrade

### 18. 被拒的 `update` 仍改动了内存里的存档 · A refused `update` still changes the save in memory — 已在 `1e60300` 解决 / resolved in `1e60300`

- 现象：`update(change)` 把实时数据交给回调。像 `data => (data.open = 5)` 这样先原地改、再返回值的回调，会被拒绝且不写盘，但 `save.data.open` 已经是 5 了；文档说的是"内存中保持原样"。原地修改后不通过 `validate` 的情况也一样。
- 本作：回调都是块体，不受影响；测试里记下了现在的行为（不写盘，但内存已变）。
- 建议：把数据的副本交给回调（如 `structuredClone`），通过后再替换；或者改文档，写明被拒时内存可能已被回调改动。

- What happens: `update(change)` gives the callback the live data. A callback that edits in place and then returns a
  value, such as `data => (data.open = 5)`, is refused and nothing is written, yet `save.data.open` is already 5; the
  documentation says the save is left as it was in memory. An edit in place that fails `validate` is the same.
- This game: its callbacks are blocks and are not affected; the tests record the behaviour as it is (not written, but
  changed in memory).
- Suggestion: give the callback a copy (such as `structuredClone`) and take it only once it passes, or say in the
  documentation that a refused change may already have altered the data in memory.
- 状态 · Status：已在 `1e60300` 解决（引擎 #424）：`save.update` 把副本交给回调，被拒时内存里的存档不变。 · Resolved in `1e60300` (engine #424): `save.update` gives the callback a copy, so a refused update leaves the save in memory as it was.

### 19. 输入分发期间不能新建 UI 根 · A UI root cannot be made while input is delivered — 已在 `1e60300` 解决 / resolved in `1e60300`

- 现象：687037a 让 `root.prepare()` 在输入分发期间推迟执行，但 `createUiRoot()` 本身仍调用 `assertIdle()`，在按钮的 `onActivate` 里直接新建根会抛 `UI_BUSY`（cause：input is being delivered）。对"每次打开新建一个根"的用法（第 11 条说这是预期用法）来说，修复没有生效。
- 本作：打开设置前先 `await Promise.resolve()`，等这次分发结束，正如错误信息建议的那样。
- 建议：`createUiRoot()` 也推迟或允许在分发中创建；或在文档里写明只有 `prepare()` 会推迟。

- What happens: 687037a lets `root.prepare()` wait until the delivery is over, but `createUiRoot()` itself still calls
  `assertIdle()`, so making a root straight from a button's `onActivate` throws `UI_BUSY` (cause: input is being
  delivered). For a panel made anew on each open, which item 11 calls intended, the fix does not reach.
- This game: before opening the settings it awaits `Promise.resolve()` so that the delivery is over, as the error
  suggests.
- Suggestion: let `createUiRoot()` be made during delivery as well, or say that only `prepare()` waits.
- 状态 · Status：已在 `1e60300` 解决（引擎 #424）：按钮回调里可以新建 UI 根。 · Resolved in `1e60300` (engine #424): a UI root can be made from a button callback.

### 20. 横向滚动控件不读竖向滚轮 · A sideways scroll control ignores an ordinary wheel — 已在 `1e60300` 解决 / resolved in `1e60300`

- 现象：`createScrollControl({ axis: 'x', wheel })` 只读 `deltaX`。普通鼠标滚轮只有 `deltaY`，所以横向列表只能用触控板或横向滚轮滚动。另外 `wheel.target` 必须是视口本身（滚轮在视口或其子孙上才算），一开始把它设成视口里一块背板时，鼠标落在卡片上就不滚了。
- 本作：`wheel.target` 设为视口容器；再在视口上听 `game.hover` 的滚轮事件，没有 `deltaX` 时把 `deltaY` 交给控件自己的 `scrollBy()`。已在浏览器里确认滚轮能滚动选关列表。
- 建议：给 `wheel` 一个选项（如 `crossAxis: true`），横向控件在没有 `deltaX` 时读 `deltaY`；大多数平台的横向列表都这样做。

- What happens: `createScrollControl({ axis: 'x', wheel })` reads only `deltaX`. An ordinary mouse wheel gives only
  `deltaY`, so a sideways list scrolls only with a trackpad or a sideways wheel. Also, `wheel.target` must be the
  viewport itself (a wheel over it or its descendants counts); set first to a backing sprite inside the viewport, it
  did not scroll while the mouse was over a card.
- This game: `wheel.target` is the viewport container, and a listener on the viewport for the wheel of `game.hover`
  hands `deltaY`, when there is no `deltaX`, to the control's own `scrollBy()`. Checked in a browser.
- Suggestion: an option of `wheel` (such as `crossAxis: true`) so that a sideways control reads `deltaY` when there is
  no `deltaX`, as most platforms do for sideways lists.

---
- 状态 · Status：已在 `1e60300` 解决（引擎 #424）：横向滚动控件读普通的竖向滚轮（`wheel.crossAxis`）。 · Resolved in `1e60300` (engine #424): a sideways scroll control reads the ordinary wheel (`wheel.crossAxis`).

## 用得顺手的地方 · What worked well

- `importTiledMap` + `createTileMap`：Tiled JSON 原样导入，对象层的自定义属性直接变成记录；12 关全由脚本生成 `.tmj`。
- `createCamera2D` 的 `addLayer(display, { factor, zoomFactor })` 一行做出视差，`shake({ trauma })` 手感好。
- `createInputActions` 的绑定字符串（`Key:KeyA`、`Pad:left`）清楚，键盘和手柄一套代码；加上 `skipPrevented` 后和焦点控件不再打架。
- `createBitmapText` 能直接吃 Egret 帧格式的字体描述，配合代码画的字页即可。
- 物理模拟不依赖 DOM，求解器和测试在 Node 里跑同一套代码，12 关的解法都能重放验证；换成绳索关节后无需改关卡即全部通过。

- `importTiledMap` + `createTileMap`: Tiled JSON comes in as it is, custom properties of the object layer become records;
  all twelve levels are written as `.tmj` by a script.
- `addLayer(display, { factor, zoomFactor })` of `createCamera2D` makes parallax in one line, and `shake({ trauma })`
  feels right.
- The binding strings of `createInputActions` (`Key:KeyA`, `Pad:left`) are clear, keyboard and gamepad share one code
  path, and with `skipPrevented` they no longer fight the focused controls.
- `createBitmapText` takes a font description in Egret's frame format, so a page painted in code is enough.
- The physics needs no DOM, so the solver and the tests run the very same simulation in Node, and the solution of every
  level is replayed; the switch to rope joints needed no change to any level.
