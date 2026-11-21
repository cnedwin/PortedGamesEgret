# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（提交 `6643755`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (commit `6643755`) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. 同时准备很多文字时超出文字缓存的预算 · Preparing many texts at once passes the text cache's budget — 部分解决 / partly resolved

- 现象 · What happens：范围攻击一次打中多人，同一帧出现十几个不同的伤害数字，各自调用 `node.prepare()`，部分失败并报 `TEXT_CACHE_BUDGET`，数字不显示。 · An area attack put a dozen distinct damage numbers on screen in one frame; some `prepare()` calls failed with `TEXT_CACHE_BUDGET` and those numbers never showed.
- 游戏里 · In the game：`web/battle-view.mjs` 的 `prepareNumbers` 把数字排队逐个准备，遇到 `TEXT_CACHE_BUDGET` 停下，下一帧再继续（`04313eb`）。 · Numbers are prepared one after another; on `TEXT_CACHE_BUDGET` the queue stops and resumes next frame.
- 建议 · Suggestion：文字节点的 `prepare()` 在缓存忙时排队等待，而不是抛错；或者给出一个"可以重试"的明确标志。 · Let a text node's `prepare()` wait its turn when the cache is busy instead of throwing, or mark the error as retryable.
- 状态 · Status：引擎在 `d614c7f` 让 `createBrowserGame` 的标签排队，本作的副本 `6643755` 已包含；World3D 战斗画面里的文字节点是否也已排队，没有复测，游戏仍保留自己的队列。 · Engine `d614c7f` queues `createBrowserGame` labels, and this copy has it; whether these text nodes now queue too was not tested again, and the game keeps its own queue.

### 2. 预编译着色器要求给出已经存在的网格 · Preparing programs needs meshes that already exist — 未解决 / open

- 现象 · What happens：第一次进入战斗时，战场网格和人物材质的着色器在第一帧才链接，出现卡顿。纸片人（没有 3D 模型的角色）在第一次绘制前没有任何网格，`renderer.preparePrograms` 找不到可以描述的对象。 · The first battle stalled while its programs linked on the first frame. Billboard actors have no mesh before their first draw, so there is nothing to hand to `preparePrograms`.
- 游戏里 · In the game：`web/jyx2/scene/native-battle-view.mjs` 在加载画面里先建好所有角色，遍历场景对每个网格和材质（含阴影通道）调用 `renderer.preparePrograms`；纸片人用接触阴影的平面和贴图做替身材质预编译，然后丢掉（`58783c3`、`e8db2ea`）。 · Under the loading screen every actor is made, every mesh and material (and shadow pass) is prepared, and the billboard actors are prepared with a stand-in material that is then disposed.
- 建议 · Suggestion：提供按材质描述（不需要网格）的预编译，或者 `renderer.prepareScene(scene)` 自动收集场景里的全部变体。 · Allow preparing from a material description without a mesh, or offer `prepareScene(scene)` that gathers every variant.
- 状态 · Status：游戏里已绕过；引擎还没有这样的接口 · worked around here; no such call in the engine.
