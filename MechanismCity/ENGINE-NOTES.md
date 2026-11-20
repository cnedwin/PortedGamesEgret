# 引擎笔记 · Engine notes

做《千机巧匠》时记下的新白鹭引擎（[Egret_rebuild](https://github.com/cnedwin/Egret_rebuild)，提交 `0e72ffb`）的缺口、别扭处、文档不清处和建议。原则是：引擎有的能力一律用引擎 API 实现；引擎没有的，用引擎已有的部件拼出效果，并在这里写明，不在游戏里另写一套替代品。

Gaps, awkward spots, unclear documentation and suggestions found in the new Egret engine
([Egret_rebuild](https://github.com/cnedwin/Egret_rebuild), commit `0e72ffb`) while making *Mechanism City*. The
rule was: whatever the engine offers is done through its API; where it offers nothing, the effect is built from
parts the engine does have and written down here, rather than replaced by code of the game's own.

每条按「现象 → 本作怎么做 → 建议」写；标了 **重要** 的是最影响使用的。
Each item is written as what happens → what this game does → a suggestion; those marked **important** mattered most.

---

## 物理 · Physics 2D

### 1. 没有关节、绳索和旋转 · No joints, ropes or rotation — **重要 / important**

- 现象：`createPhysicsWorld` 只有轴对齐盒子、圆和静态多边形；刚体不转动（没有角速度），没有铰链、距离约束或绳索；`moveAndSlide` 不处理斜坡。弹射解谜最常用的跷跷板、吊绳、滚动的石头都没法直接搭出来。
- 本作：跷跷板是一块 kinematic 木板，由游戏按受击一侧设定角度，再给压在高起一端上的物体一个冲量（`applyImpulse`）；吊绳是一个 kinematic 重物，绳子被弹丸路径切断时移除，换成同位置的 dynamic 刚体（刚体种类建好后不能改，只能删了重建）；石头"滚动"只是画面上的旋转。斜面用静态多边形做装饰和挡板，不参与滑动。
- 建议：至少提供转动刚体与铰链（revolute）、距离约束（rope/distance）；或者给 `setKind(body, 'dynamic')` 这样的切换，免得删建刚体时丢失接触状态。

- What happens: `createPhysicsWorld` has axis-aligned boxes, circles and static polygons; bodies do not turn (no angular
  velocity), there are no hinges, distance constraints or ropes, and `moveAndSlide` does not handle slopes. The seesaw,
  the hanging rope and the rolling stone that a physics puzzle reaches for first cannot be built directly.
- This game: the seesaw is a kinematic plank whose angle the game sets toward the side that was struck, then gives what
  lies on the rising end an impulse (`applyImpulse`); a hanging weight is a kinematic body that, when the pellet's path
  cuts its rope, is removed and replaced by a dynamic body in the same place (a body's kind cannot change once made, so
  it is removed and made again); a stone's "roll" is only its picture turning. Ramps are static polygons, for show and
  as stops, not slid along.
- Suggestion: turning bodies with a revolute hinge and a distance (rope) constraint, at least; or a way to change a
  body's kind, so that remaking it does not lose its contacts.

### 2. 接触在步后统一给出 · Contacts arrive after the step

- 现象：`begin`/`end` 接触在每个固定步之后给出，回调里改世界（删刚体、施冲量）要很小心；文档没说回调里能不能改。
- 本作：接触回调里只把要做的事记进队列，步完再执行（碎箱、断绳、开锁）。
- 建议：文档写清楚回调中允许的操作，或者提供"步后执行"的钩子。

- What happens: `begin` and `end` contacts are told after each fixed step, and changing the world inside the callback
  (removing a body, applying an impulse) needs care; the documentation does not say whether it is allowed.
- This game: the callbacks only queue what should happen, and the queue runs after the step (breaking a crate, cutting
  a rope, opening a lock).
- Suggestion: say in the documentation what a callback may do, or offer an "after the step" hook.

---

## 渲染 · Rendering

### 3. 形状遮罩在 CPU 上逐次光栅化 · Shape masks are rasterized on the CPU each time — **重要 / important**

- 现象：`node.mask = sprite` 的形状遮罩每当遮罩的变换或缩放变化，就在 CPU 上重新算一张图（最大 2048 边、每像素 4×4 采样）。本作最初用一个从弩机处放大的圆形遮罩做开场转场，放大到全屏时在软件渲染下单帧要 3.6 秒，转场被拖成了一分钟。文档里没有提醒遮罩的代价。
- 本作：遮罩改用在不动的小物件上——对白头像的圆框（画一次、只算一次图）；选关列表用矩形 `mask = {x,y,width,height}`（走裁剪矩形，没有这个代价）。转场改为全屏黑幕淡出。
- 建议：文档注明"动画中的形状遮罩会每帧重算"；长远可走 GPU 模板缓冲或遮罩纹理复用。

- What happens: a shape mask (`node.mask = sprite`) is drawn again into an image on the CPU whenever its transform or
  scale changes (up to 2048 pixels a side, 4×4 samples a pixel). This game first opened a level with a circle mask
  growing out of the crossbow; grown to the whole screen it cost 3.6 seconds a frame under software rendering, and the
  transition took a minute. The documentation gives no warning of the cost.
- This game: masks are now used on small things that do not move — the round frame of the speaker's portrait (drawn
  once, its image made once); the list of levels uses a rectangle, `mask = {x, y, width, height}`, which is a clip and
  costs nothing of the kind. The transition is a black veil fading out.
- Suggestion: say in the documentation that an animated shape mask is made again every frame; in time, a stencil path
  on the GPU or reuse of the mask's image.

### 4. 粒子发射器没有混合模式选项 · The particle emitter has no blend option

- 现象：`createParticleEmitter` 的选项里没有混合模式。
- 本作：发射器返回的 `display` 是普通显示对象，设 `emitter.display.blendMode = 'add'` 即可（火花、雷光、拖尾）。
- 建议：在选项里加 `blendMode`，或者在文档里写明这种用法。

- What happens: `createParticleEmitter` takes no blend mode.
- This game: the emitter's `display` is an ordinary display object, and `emitter.display.blendMode = 'add'` works
  (sparks, thunder, the trail).
- Suggestion: a `blendMode` option, or this use written in the documentation.

### 5. 每帧最多 8 组效果 · At most eight effect groups a frame

- 现象：`renderEffect`（glow / outline）需要 `effects: true`，每帧最多 8 组。超出时的表现文档没写。
- 本作：只给关键物件加：机关锁（未开 outline，开后 glow）、标题字、选中的关卡卡片、结算星星，任何时刻不超过 8 组。
- 建议：文档写明超出上限时是报错、忽略还是合批。

- What happens: `renderEffect` (glow, outline) needs `effects: true` and allows eight groups a frame; the documentation
  does not say what happens past that.
- This game: only the things that matter carry an effect — the locks (outlined while shut, glowing once open), the
  title, the chosen level card and the stars of a result — never more than eight at a time.
- Suggestion: say whether going over is an error, ignored, or batched.

### 6. 径向渐变的三角形很多 · Radial gradients cost many triangles

- 现象：`beginRadialGradientFill` 为了平滑会细分出成千上万个三角形；每帧重画（`graphics.clear()` 后再填）代价明显。
- 本作：渐变只在形状改变时重画（弩、瞄准线、弹簧、按钮只在状态或焦点变化时重画），不每帧重画。
- 建议：文档提示渐变填充的细分代价，或者对不变的 Graphics 自动缓存。

- What happens: `beginRadialGradientFill` subdivides into thousands of triangles to stay smooth; painting it again every
  frame (`graphics.clear()` then fill) is costly.
- This game: gradients are painted again only when the shape changes (the bow, the aim, the springs and the buttons
  only when their state or the focus changes).
- Suggestion: mention the cost in the documentation, or cache Graphics that have not changed.

### 7. 用画布画的贴图要好几步 · A texture painted on a canvas takes several steps

- 现象：`game.loadTexture(url)` 一步就能拿到 PNG 贴图，但代码画出来的贴图（粒子点、碎木片、位图字体页）要 `createImageData2D` → `createTexture` → `createAssetType` → `engine.assets.register` → `acquire(createAssetRef(...))` 一串。
- 本作：封装在 `src/art/paint.mjs` 的 `leasePainted()`。
- 建议：`game.textureFromCanvas(canvas)` 或 `game.textureFromPixels(...)` 一类的一步接口。

- What happens: `game.loadTexture(url)` gives a PNG texture in one step, but a texture painted in code (the particle dot,
  the splinter, the page of the bitmap font) takes `createImageData2D` → `createTexture` → `createAssetType` →
  `engine.assets.register` → `acquire(createAssetRef(...))`.
- This game: wrapped once as `leasePainted()` in `src/art/paint.mjs`.
- Suggestion: a one-step `game.textureFromCanvas(canvas)` or `textureFromPixels(...)`.

### 8. `backend: 'auto'` 在没有 WebGPU 的环境里会打一条控制台错误 · `'auto'` logs a console error without WebGPU

- 现象：`createBrowserGame` 的 `backend: 'auto'` 会先请求 WebGPU 适配器；在无头浏览器等没有适配器的环境里，浏览器会在控制台打出 "No available adapters."，验收"无控制台错误"会因此不过。
- 本作：显式用 `backend: 'webgl2'`（URL 加 `?backend=webgpu` 可试 WebGPU）。
- 建议：探测前先看 `navigator.gpu` 的可用性提示，或在文档中说明这条日志来自浏览器本身。

- What happens: `backend: 'auto'` asks for a WebGPU adapter first; where there is none (a headless browser, for one) the
  browser writes "No available adapters." to the console, which fails a "no console errors" check.
- This game: `backend: 'webgl2'` is given (`?backend=webgpu` in the address tries WebGPU).
- Suggestion: a quieter probe, or a note that the line comes from the browser itself.

---

## 界面 · UI

### 9. 托管界面的叶子装不下游戏的文字标签 · Managed UI leaves cannot hold the game's labels — **重要 / important**

- 现象：`createUiRoot` 只挂载属于叶子 `context.scope` 的节点；`game.createLabel()` 做出的文字属于游戏自己的 scope，也没有 scope 参数，所以放进叶子会报 `UI_CONTENT_INVALID`（错误里不说是哪个节点、为什么）。想自己用 `createTextField` 做文字，又因为每个引擎只能有一个文字缓存（`TEXT_CACHE_ALREADY_CREATED`），而 `createLabel` 的缓存拿不到。
- 本作：设置卡的布局、按压区域和开关仍由 `createUiRoot` 排出并提交；文字在提交后按各叶子的全局位置（`localToGlobal`）叠放在上面（见 `src/ui/settings.mjs`）。
- 建议：`createLabel({ scope })`，或公开 `game.textCache`；`UI_CONTENT_INVALID` 的 cause 里带上出问题的节点和原因。

- What happens: `createUiRoot` mounts only nodes owned by the leaf's `context.scope`; a label from `game.createLabel()`
  belongs to the game's own scope and takes no scope, so putting it in a leaf fails with `UI_CONTENT_INVALID` (which
  does not say which node or why). Making the words with `createTextField` instead runs into the one text cache an
  engine may have (`TEXT_CACHE_ALREADY_CREATED`), and the cache of `createLabel` is not reachable.
- This game: the settings card's layout, pressable areas and switches are still laid out and committed by
  `createUiRoot`; the words are laid over the committed leaves at their global positions (`localToGlobal`) afterwards
  (see `src/ui/settings.mjs`).
- Suggestion: `createLabel({ scope })`, or `game.textCache` made public; and the node and the reason in the cause of
  `UI_CONTENT_INVALID`.

### 10. 在按钮回调里打开托管界面会 `UI_BUSY` · Opening managed UI from a button's callback fails with `UI_BUSY`

- 现象：在 `createActionControl` 的 `onActivate` 里直接 `root.prepare()`，因为此时引擎正在分发输入，报 `UI_BUSY: The UI is still busy with an earlier request.`——这句话会让人以为是上一次 prepare 没完成。
- 本作：打开设置时先 `setTimeout(0)` 离开这次输入分发。
- 建议：错误信息区分"正在分发输入/正在渲染帧"和"上一次请求未完成"；或让 `prepare()` 自动排到分发之后。

- What happens: calling `root.prepare()` straight from the `onActivate` of `createActionControl` fails while the engine
  is still delivering that input, with `UI_BUSY: The UI is still busy with an earlier request.` — which reads as if an
  earlier prepare had not finished.
- This game: opening the settings first leaves the delivery with `setTimeout(0)`.
- Suggestion: tell "input is being delivered / a frame is being drawn" apart from "an earlier request is pending", or
  let `prepare()` wait until the delivery is over.

### 11. 托管界面没有显隐 · No visibility for managed UI

- 现象：`createUiRoot` 没有隐藏/显示的 API，只能每次打开时新建、关闭时 dispose。
- 本作：设置卡每次打开新建一个 root。
- 建议：`root.setVisible()`，或在文档里说明"新建即显示"是推荐用法。

- What happens: `createUiRoot` has no way to hide and show; it is made on each open and disposed on each close.
- This game: the settings card makes a new root each time it opens.
- Suggestion: `root.setVisible()`, or a note that making one each time is the intended use.

### 12. 滚动控件的滚轮要单独建悬停输入 · The scroll control's wheel needs a hover input made separately

- 现象：`createScrollControl` 的 `wheel` 需要 `HoverInput`，但 `createBrowserGame` 只建了 `pointer` 和 `keyboard`，没有 hover；要另外从 `@egret/engine/web/hover` 引入 `createBrowserHoverInput`，并记得把它加进 vendor 入口。
- 本作：`src/main.mjs` 里单独建了 hover 输入，选关列表可以用滚轮滚。
- 建议：`createBrowserGame({ hover: true })`，返回 `game.hover`。

- What happens: the `wheel` of `createScrollControl` needs a `HoverInput`, but `createBrowserGame` makes only `pointer`
  and `keyboard`; `createBrowserHoverInput` has to be imported from `@egret/engine/web/hover`, and that entry added to
  the vendored copy.
- This game: `src/main.mjs` makes the hover input, and the list of levels scrolls with the wheel.
- Suggestion: `createBrowserGame({ hover: true })`, giving `game.hover`.

### 13. 键盘焦点控件与输入动作会同时收到同一个键 · A focused control and the input actions both get the same key

- 现象：`createControlKeys` 绑在画布上的键盘焦点控件和 `bindBrowserInputActions` 的动作是两套独立监听，空格在焦点按钮上时既按下按钮又触发"发射"动作；方向键在焦点滑条上时既调滑条又转弩。
- 本作：读动作前检查 `keyboard.getSnapshot()`：焦点可见并停在按钮上时不发射，停在滑条上时方向键不转弩。
- 建议：键被焦点控件消费后，在动作系统里标记为已消费（或提供 `consumedByFocus` 查询）。

- What happens: keys bound to a focused control by `createControlKeys` and the actions of `bindBrowserInputActions` listen
  separately, so Space on a focused button both presses it and fires; the arrows on a focused slider both move it and
  turn the bow.
- This game: before reading the actions it looks at `keyboard.getSnapshot()`: with a visible focus on a button it does
  not fire, and on the slider the arrows do not turn the bow.
- Suggestion: mark a key that a focused control used as consumed for the actions, or offer a way to ask.

### 14. 语义节点的取值字段 · The value field of a semantic node

- 现象：`slider` 的 `range` 字段是 `{ now, min, max }`；第一次按直觉写成 `value` 被拒，好在错误的 cause 写明了节点 id 和字段名 `range`，很快能改。各角色允许哪些字段只在 `semanticTree.js` 的表里，文档里没有。
- 建议：把每个角色允许的字段列进文档。

- What happens: the `range` of a `slider` is `{ now, min, max }`; written as `value` by instinct the first time, it was
  refused — the cause named the node and the field, so it was quick to fix. Which fields each role allows is only in the
  table in `semanticTree.js`, not in the documentation.
- Suggestion: list the fields of each role in the documentation.

---

## 存档、声音、视频 · Saves, sound, video

### 15. `save.update` 的返回值会替换整个存档 · What `save.update` returns replaces the whole save — **重要 / important**

- 现象：`createSaveStore(...).update(change)` 中，`change` 返回非 `undefined` 的值就当成新存档。箭头函数 `data => (data.x = 1)` 返回 `1`，于是整个存档被换成了 `1`；而且这次替换没有经过 `validate`。本作就因此把一次结算的统计对象写成了存档。
- 本作：所有 `update` 回调都写成块体、不返回值；测试里覆盖。
- 建议：替换后的数据也走 `validate`；或把"返回新数据"和"原地修改"分成两个方法。

- What happens: in `createSaveStore(...).update(change)`, anything `change` returns other than `undefined` becomes the new
  save. An arrow `data => (data.x = 1)` returns `1`, and the whole save becomes `1` — without passing `validate`. This
  game once saved a result's summary object as its whole save this way.
- This game: every `update` callback is a block that returns nothing, and the tests cover it.
- Suggestion: pass the replacement through `validate` too, or split "return new data" and "change in place" into two
  methods.

### 16. 浏览器里拿不到单独的 Web Audio 后端 · No separate Web Audio backend for the browser

- 现象：`createAudioMixer({ backend })` 需要一个后端，但引擎没有导出 Web Audio 后端；浏览器里只能用 `createBrowserAudio()`，它内部自己建 mixer。
- 本作：页面里用 `createBrowserAudio` 给出的 `mixer`；游戏的声音编排（`soundBoard`）只依赖 `AudioMixer` 接口，测试里用 `createAudioMixer` 加一个只记录调用的后端验证"事件进音效总线、音乐进音乐总线、设置能分别静音"。
- 建议：导出 `createWebAudioBackend(context)`，让页面也能直接用 `createAudioMixer`。

- What happens: `createAudioMixer({ backend })` needs a backend, but no Web Audio backend is exported; in a page the only
  way is `createBrowserAudio()`, which makes its mixer inside.
- This game: the page uses the `mixer` of `createBrowserAudio`; the game's sound board (`soundBoard`) depends only on the
  `AudioMixer` interface, and the tests drive it on `createAudioMixer` with a backend that only records what it is asked,
  to check that events reach the effects bus, music its own bus, and that each setting mutes its bus.
- Suggestion: export `createWebAudioBackend(context)`, so a page can use `createAudioMixer` directly.

### 17. 视频只能给一个地址 · Video takes one address only

- 现象：`createBrowserVideo({ src })` 只接受一个地址，没有 `<source>` 那样的备选列表；Chromium 系的无头测试浏览器没有 H.264，Safari 旧版本没有 VP9。
- 本作：片子同时有 `intro.mp4`（H.264）和 `intro.webm`（VP9），用 `canPlayType` 自己挑。
- 建议：`src` 接受数组，按顺序取第一个能播的。

- What happens: `createBrowserVideo({ src })` takes one address, with no list of alternatives as `<source>` gives; headless
  Chromium has no H.264 and older Safari no VP9.
- This game: the film is in both `intro.mp4` (H.264) and `intro.webm` (VP9), and `canPlayType` picks.
- Suggestion: let `src` be a list, the first that plays being used.

---

## 用得顺手的地方 · What worked well

- `importTiledMap` + `createTileMap`：Tiled JSON 原样导入，对象层的自定义属性直接变成记录；12 关全由脚本生成 `.tmj`。
- `createCamera2D` 的 `addLayer(display, { factor, zoomFactor })` 一行做出视差，`shake({ trauma })` 手感好。
- `createInputActions` 的绑定字符串（`Key:KeyA`、`Pad:left`）清楚，键盘和手柄一套代码。
- `createBitmapText` 能直接吃 Egret 帧格式的字体描述，配合代码画的字页即可。
- 物理模拟不依赖 DOM，求解器和测试在 Node 里跑同一套代码，12 关的解法都能重放验证。

- `importTiledMap` + `createTileMap`: Tiled JSON comes in as it is, custom properties of the object layer become records;
  all twelve levels are written as `.tmj` by a script.
- `addLayer(display, { factor, zoomFactor })` of `createCamera2D` makes parallax in one line, and `shake({ trauma })`
  feels right.
- The binding strings of `createInputActions` (`Key:KeyA`, `Pad:left`) are clear; keyboard and gamepad share one code path.
- `createBitmapText` takes a font description in Egret's frame format, so a page painted in code is enough.
- The physics needs no DOM, so the solver and the tests run the very same simulation in Node, and the solution of every
  level is replayed.
