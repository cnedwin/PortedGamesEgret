# 引擎笔记 · Engine notes

本游戏使用的新白鹭引擎版本为 `21297267`。以下记录引擎适配和仍保留的项目处理，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

This game uses Egret Rebuild `21297267`. The integration notes and remaining game-side handling use the format in part 3 of
[docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

2026-11-29：按正式工具生成最新副本 `212972678e633b1f3667f345d0646b0fba907ee1`（包含 WebKit 稳定呈现及共享帧诊断改进），仍使用现有底层宿主。第三批已换原生 Play 2D 宿主，原 3D 渲染器独立拥有上下文。JY#1 手写栅格队列已换引擎图集标签，固定数字与密集战斗验收仍待完成；JY#2 保留；JY#3 原生游戏标签已兼容。 · Native Play now owns the 2D host and clock while the scene renderers keep their own contexts. The legacy text cache queue is replaced with engine atlas labels; fixed glyph/dense encounter evidence remains outstanding.

## 已交给引擎 · Moved to the engine

- **手柄采样 · Controller sampling**：`createBrowserGamepadInput` 负责发现手柄和读取标准按键、摇杆。JY 保留模式键位、回中后再生效和战斗斜向输入。 · The engine reads standard controller buttons and axes. JY retains the per-mode bindings, release-to-rearm behavior, and battle diagonals.
- **大地图 Canvas 贴图 · World-map canvas textures**：地标和船尾浪花直接用 `Texture3D` 上传 Canvas。引擎负责翻转方向，项目移除了从 Canvas 取像素和逐行复制。 · Markers and the boat wake upload canvas sources through `Texture3D`, which handles orientation.
- **剧情与战斗 WAV · Story and battle WAV cues**：通过 `createBrowserAudio` 播放。开场和战斗加载时预解码少量首发音效，同一 WAV 重播时停止前一声。战斗重开或离场时清理该场的排队和正在播放的音效。 · Opening and battle loading warm a small set of clips. Replaying a WAV stops its previous instance. A restart or scene exit cancels pending and playing cues.

## 仍由项目处理 · Remaining game-side handling

| 范围 · Area | 当前处理和后续迁移条件 · Current handling and migration condition |
|---|---|
| 地图 GPU 图层 · GPU map layers | 已用引擎的共享图层。游戏负责分块、重用及截取时暂时隐藏舞台内容。引擎的预备子树捕获会一并捕获同级对象，需先把地图缓存与当前画面隔离，再回归透明度和设备恢复。 · Shared layers are native. The game owns paging and reuse, and temporarily hides stage content for capture. Prepared subtree capture includes siblings, so isolate the cache stage and check alpha and recovery before switching. |
| 音乐 · Music | 原版 MIDI 和 SoundFont 继续由现有合成器负责。剧情和战斗的 WAV 由白鹭音效总线负责。 · The original synthesizer plays MIDI and SoundFont music. The Egret effects bus handles story and combat WAVs. |
| 触控和场景选择 · Touch and picking | 场景已用 `Raycaster3D`。触屏方向键和悬停目前由 DOM 监听处理，可逐步迁到引擎输入入口。格子判定、角色可见区域和路径规则属于游戏层。 · Scene picking uses `Raycaster3D`. Browser pointer input can take over capture and hover in stages. Grid selection, actor visibility rules, and pathfinding remain gameplay logic. |
| 阴影兼容 · Shadow compatibility | 仍对 RTX 5090 Laptop 的指定 ANGLE D3D11 路径关闭阴影。需在原硬件上开启阴影复跑骨骼人物，确认上下文稳定后才移除。 · The driver-specific shadow guard stays until a hardware run with shadowed skinned actors confirms context stability. |

### 1. 同时准备很多文字时超出文字缓存的预算 · Preparing many texts at once passes the text cache's budget — 部分解决 / partly resolved
<!-- engine-note: {"id": "JY#1", "status": "partly", "topic": "text-cache-budget-batch", "workaround": ["web/battle-view.mjs"]} -->

- 现象 · What happens：范围攻击一次打中多人，同一帧出现十几个不同的伤害数字，各自调用 `node.prepare()`，部分失败并报 `TEXT_CACHE_BUDGET`，数字不显示。 · An area attack put a dozen distinct damage numbers on screen in one frame; some `prepare()` calls failed with `TEXT_CACHE_BUDGET` and those numbers never showed.
- 游戏里 · In the game：原手写 `prepareNumbers` 排队已撤除，现用 `game.browser.createAtlasLabel` 的引擎栅格工作与场景作用域；新 Play 的文字缓存是唯一所有者。 · Removed the manual queue. Engine-owned atlas labels and scoped lifetimes now share the browser game text cache.
- 建议 · Suggestion：文字节点的 `prepare()` 在缓存忙时排队等待，而不是抛错；或者给出一个"可以重试"的明确标志。 · Let a text node's `prepare()` wait its turn when the cache is busy instead of throwing, or mark the error as retryable.
- 状态 · Status：引擎队列正式接入，JY 不再创建第二个文字缓存。固定数字位图及密集战斗实测仍待完成，暂保留 partly。 · Public engine queue is integrated; no second cache. Dense battle and fixed digit font qualification remain.

### 2. 预编译着色器要求给出已经存在的网格 · Preparing programs needs meshes that already exist — 未解决 / open
<!-- engine-note: {"id": "JY#2", "status": "open", "topic": "prepare-programs-meshes", "workaround": ["web/jyx2/scene/native-battle-view.mjs"]} -->

- 现象 · What happens：第一次进入战斗时，战场网格和人物材质的着色器在第一帧才链接，出现卡顿。纸片人（没有 3D 模型的角色）在第一次绘制前没有任何网格，`renderer.preparePrograms` 找不到可以描述的对象。 · The first battle stalled while its programs linked on the first frame. Billboard actors have no mesh before their first draw, so there is nothing to hand to `preparePrograms`.
- 游戏里 · In the game：`web/jyx2/scene/native-battle-view.mjs` 在加载画面里先建好所有角色，遍历场景对每个网格和材质（含阴影通道）调用 `renderer.preparePrograms`；纸片人用接触阴影的平面和贴图做替身材质预编译，然后丢掉（`58783c3`、`e8db2ea`）。 · Under the loading screen every actor is made, every mesh and material (and shadow pass) is prepared, and the billboard actors are prepared with a stand-in material that is then disposed.
- 建议 · Suggestion：提供按材质描述（不需要网格）的预编译，或者 `renderer.prepareScene(scene)` 自动收集场景里的全部变体。 · Allow preparing from a material description without a mesh, or offer `prepareScene(scene)` that gathers every variant.
- 状态 · Status：游戏里已绕过；引擎还没有这样的接口 · worked around here; no such call in the engine.

### 3. WebKit 游戏文字读取兼容性 · WebKit game-label raster compatibility — 已解决 / resolved
<!-- engine-note: {"id":"JY#3","status":"resolved","topic":"browser-canvas-text-safari"} -->

- **现象 / Observation**：Windows Playwright WebKit iPhone 15 Pro 配置，公开旧版自动导入/标题正常，实际「開始新遊戲」时低层 Canvas 缺少严格 WC1 状态，691 触发 `TEXT_MEASURE_FAILED / WEB_TEXT_STATE_UNSUPPORTED`。 · Entering the Home scene triggered a strict Canvas text capability refusal even after a normal title.
- **游戏里 / Game use**：[web/main.mjs](web/main.mjs) 的真实游戏文字栅格缓存采用合并引擎 [#570](https://github.com/cnedwin/Egret_rebuild/pull/570) 提供的 `createCanvasTextRasterProvider({compatibility:'game-labels'})`，通过正式工具重新生成引擎副本及模块映射。未伪造 Canvas 状态、未更改文字、规则或存档。 · Use the opt-in game-label mode; strict callers retain their own contract.
- **状态 / Status**：该 Windows WebKit 样本采用正式引擎 `ca9ff2a0` 后 691 首句及 3D 场景实拍通过、Node 76/76。实体 iPhone 尚未验证。 · Resolved in the measured browser configuration; physical iOS remains unverified.

### 4. 屏幕栈关闭模态后焦点恢复 · Screen-stack modal focus return — 未解决 / open
<!-- engine-note: {"id":"JY#4","status":"open","topic":"stack-modal-focus-return","workaround":["web/jyx2/ui/native/front-end.mjs","browser/import-ui.mjs"]} -->

- 现象 · Observation：模态独立的视图焦点与屏幕栈关闭顺序不同，标题恢复后焦点未必落回开启它的按钮；同一视图旋转亦有复现。 · Closing a named modal can leave the underlying title unfocused when view and stack activation complete at different times; this also reproduced after rotation.
- 处理 · Handling：保留原生模态及屏幕栈，待关闭 Promise 完成且标题再次激活后调用公开 `view.focus(opener)`。 · Restore the opener through the public native focus API once the underlying page has been activated.
- 建议 · Suggestion：屏幕栈在重新激活下层页面后，原子恢复原控件焦点，覆盖旋转及多层模态。 · Restore the originating control after reactivating the lower page, including orientation and nested views.
- 状态 · Status：在固定引擎版本上保留此小范围适配，具名回归。 · Narrow adapter retained at the pinned revision with named regression coverage.

### 5. 动态切换 World3D 场景的原生 UI 附着 · Native UI attachment across changing World3D scenes — 未解决 / open
<!-- engine-note: {"id":"JY#5","status":"open","topic":"play-world3d-shared-context","workaround":["web/game-host.mjs","web/main.mjs"]} -->

- 现象 · Observation：`play3dAttached` 可以附着一个已配置的 scene/camera/renderer，现有本游戏会在原场景、独立战场和经典 2D 回退之间切换；Play 不能直接借用旧底层 host 的 3D WebGL2 上下文来挂载声明式视图，也不能一次声明多个可替换渲染器。 · The attached API accepts one configured scene/camera/renderer. The application switches independent field and arena renderers and may fall back to a 2D board; no public single-context attachment exists for this lifecyle.
- 游戏里 · Handling：用公开 `play` 建立 parent-owned 透明画布、expand/portrait、安全区与统一 update 时钟，World3D 保持自身画布和生命周期。`game-host.mjs` 只在 `onFrameTiming` 报 submitted 且 host.whenIdle 后解决呈现请求；保留现有 3D 相机投影到 2D 板面的绘制顺序。 · The public Play host and its update clock coordinate the independently owned 3D scenes, with accepted 2D receipt and board mapping.
- 建议 · Suggestion：支持已存在的 World3D 渲染宿主动态 attach/detach renderer、scene、camera 与共享实际提交回执；提供复用已配置 WebGL2 host 的原生 Play 入口。 · Support dynamic attachment and a shared configured WebGL2 host with explicit frame receipts.
- 状态 · Status：不更改引擎副本；应用只编排公开 API。 · No vendor edits; the adapter orchestrates public APIs only.

### 6. Play 手柄快照没有完整模拟通道 · Play controller snapshot lacks some raw channels — 部分解决 / partly resolved
<!-- engine-note: {"id":"JY#6","status":"partly","topic":"play-gamepad-raw-channels","workaround":["web/main.mjs","web/jyx2/ui/native/native-input.mjs"]} -->

- 现象 · Observation：Play 提供 `pad:a/b/x/y/l1/r1/l2/r2/select/start/dpad` 的原生键状态，但无 `pad:l3/r3`，扳机是二值 pressed，`axis` 使用引擎阈值。原有游戏需要 L3/R3、扳机 0.5 的数值阈值及 0.35 原始轴阈值。 · The high-level keys expose standard buttons but lack stick clicks and exact analog snapshots; the original mappings require raw thresholds.
- 最小复现 · Reproduce：标准 Gamepad API fixture 设置一对 0.49/0.50 的 trigger 值、L3/R3 button 10/11 和 0.34/0.35 stick；对照 Play `game.keys` 与正式 `createBrowserGamepadInput` 的 `value/axis/pressed` 快照。 · Compare those inputs in the two public APIs without running game rules.
- 处理 · Handling：原生 Play claim/down/pressed、stage tap、pointer 和标准 `pad:*` 接入，旧合成键盘及第二 RAF 取消；仅用低阶正式快照补必要的原始通道。 · Native Play input owns navigation and standard controls; the official lower-level snapshot preserves necessary extra raw channels. No synthetic browser key events or separate RAF.
- 建议 · Suggestion：Play 提供标准原始 axis/analog value 与 stick-click 命名通道，允许选择 deadzone；保留键盘重复或明确提供逻辑重复策略。 · Expose the raw standard snapshots, stick clicks and configurable dead zones, and a documented repeat policy.
- 状态 · Status：原生通用浏览器夹具测了主键鼠、触屏、模态和模拟手柄；未测实体手柄。 · Native browser fixture covers keyboard, pointer, touch, modal routing and simulated pad, not a physical controller.
