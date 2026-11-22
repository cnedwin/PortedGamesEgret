# 引擎笔记 · Engine notes

本游戏使用的新白鹭引擎版本为 `c1570b0`。以下记录引擎适配和仍保留的项目处理，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

This game uses Egret Rebuild `c1570b0`. The integration notes and remaining game-side handling use the format in part 3 of
[docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

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

- 现象 · What happens：范围攻击一次打中多人，同一帧出现十几个不同的伤害数字，各自调用 `node.prepare()`，部分失败并报 `TEXT_CACHE_BUDGET`，数字不显示。 · An area attack put a dozen distinct damage numbers on screen in one frame; some `prepare()` calls failed with `TEXT_CACHE_BUDGET` and those numbers never showed.
- 游戏里 · In the game：`web/battle-view.mjs` 的 `prepareNumbers` 把数字排队逐个准备，遇到 `TEXT_CACHE_BUDGET` 停下，下一帧再继续（`04313eb`）。 · Numbers are prepared one after another; on `TEXT_CACHE_BUDGET` the queue stops and resumes next frame.
- 建议 · Suggestion：文字节点的 `prepare()` 在缓存忙时排队等待，而不是抛错；或者给出一个"可以重试"的明确标志。 · Let a text node's `prepare()` wait its turn when the cache is busy instead of throwing, or mark the error as retryable.
- 状态 · Status：`c1570b0` 的自动重试在 `createBrowserGame` 的标签封装中。JY 战斗直接使用低层 `TextField.prepare()` 配合 WebGL2 共享帧，仍由游戏排队。固定字符的位图字体可进一步避免逐字栅格化。 · Automatic retry in `c1570b0` belongs to `createBrowserGame` labels. JY prepares low-level text in a shared-frame battle path and still queues the work. A bitmap font could remove runtime rasterization for fixed damage glyphs.

### 2. 预编译着色器要求给出已经存在的网格 · Preparing programs needs meshes that already exist — 未解决 / open

- 现象 · What happens：第一次进入战斗时，战场网格和人物材质的着色器在第一帧才链接，出现卡顿。纸片人（没有 3D 模型的角色）在第一次绘制前没有任何网格，`renderer.preparePrograms` 找不到可以描述的对象。 · The first battle stalled while its programs linked on the first frame. Billboard actors have no mesh before their first draw, so there is nothing to hand to `preparePrograms`.
- 游戏里 · In the game：`web/jyx2/scene/native-battle-view.mjs` 在加载画面里先建好所有角色，遍历场景对每个网格和材质（含阴影通道）调用 `renderer.preparePrograms`；纸片人用接触阴影的平面和贴图做替身材质预编译，然后丢掉（`58783c3`、`e8db2ea`）。 · Under the loading screen every actor is made, every mesh and material (and shadow pass) is prepared, and the billboard actors are prepared with a stand-in material that is then disposed.
- 建议 · Suggestion：提供按材质描述（不需要网格）的预编译，或者 `renderer.prepareScene(scene)` 自动收集场景里的全部变体。 · Allow preparing from a material description without a mesh, or offer `prepareScene(scene)` that gathers every variant.
- 状态 · Status：游戏里已绕过；引擎还没有这样的接口 · worked around here; no such call in the engine.
