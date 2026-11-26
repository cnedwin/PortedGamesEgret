# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（早期提交 unknown，当前为 f0dfde36（与 8e70dcb3 运行时一致））的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (early commit unknown; current copy f0dfde36, runtime byte-identical to 8e70dcb3) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. 每帧的几何预算连复用的几何也一起算 · The per-frame geometry budget also counts reused geometry — 部分解决 / partly resolved
<!-- engine-note: {"id": "FivePhases#1", "status": "partly", "topic": "geometry-budget-reuse"} -->

- 现象 · What happens：连锁一起来就报 `WEBGL2_GEOMETRY_RANGE`（Geometry preparation budget），整帧失败。每帧预备顶点上限是 1,048,576；输入没变的绘制虽然复用上一帧的几何，但每帧新建的账本把整场的几何从头再算一遍，所以压垮预算的是场景本身的复杂度。静止的一帧就有约 754k，其中 49 格圆角描边约 258k、立绘 40 个部件的描边约 195k。每帧切换几十个特效精灵的 `visible` 也会推高这个数。 · Chains failed the frame with `WEBGL2_GEOMETRY_RANGE`. The limit is 1,048,576 prepared vertices a frame, and reused geometry is charged again every frame, so it is the scene's complexity that breaks it: about 754k for a still frame, mostly outlines.
- 游戏里 · In the game：描边改成"外圈实心 + 内圈实心盖上去"，立绘不描边、改用更深的袖色分出手臂；特效形状只画一次、改动 `alpha` 而不是 `visible`。静止一帧降到约 268k，长跑峰值约 320k（`142ee83`）。 · Outlines became two solid fills, portraits lost theirs, effects are drawn once and animated by alpha: about 268k a still frame, 320k at peak.
- 建议 · Suggestion：复用的几何不要每帧重复记账；`createBrowserGame` 开放这项上限的设置，并在报错时给出这一帧的预备顶点数。 · Do not charge reused geometry again each frame; let `createBrowserGame` set the limit, and report the frame's count with the error.
- 状态 · Status：引擎 `b5628eb` 时共享 WebGL2/WebGPU 宿主有 `maxPreparedVertices` 选项（默认仍为 1,048,576），`createBrowserGame` 没有开放它，复用的几何仍然每帧记账 · at `b5628eb` the shared hosts take `maxPreparedVertices`, but `createBrowserGame` does not pass it on, and reused geometry is still charged.

### 2. 极小但不为零的坐标让整帧失败 · A tiny non-zero coordinate failed the whole frame — 已在 `66f7c59` 解决 / resolved in `66f7c59`
<!-- engine-note: {"id": "FivePhases#2", "status": "resolved", "topic": "tiny-coordinate-frame-failure"} -->

- 现象 · What happens：震屏收尾时偏移按比例衰减到约 `1e-32`，而闪光层的矩形从 `(0,0)` 画起，四个角都落在这样的坐标上。`prepareRectangles2D` 的 `coordinate()` 对 `|v| < 2^-100` 抛 `range`，整帧渲染失败；约十次里出现一次，只在震屏和白闪落在同一帧时发生。 · The shake decayed to about `1e-32`, and `coordinate()` refused magnitudes below `2^-100`, failing the frame about one time in ten.
- 游戏里 · In the game：震屏的余量小于一帧就直接归零（`fa55164`）。 · The shake snaps to zero when less than a frame of it is left.
- 建议 · Suggestion：已由引擎采纳：这种退化的数值当作 0 处理。 · Adopted by the engine: such values are taken as zero.
- 状态 · Status：引擎 `66f7c59` 起把小于 `2^-100` 的值当作 0；2026-11-21 本作的副本升级到 `b5628eb`，已包含这个修复，游戏自己的归零仍保留 · resolved in the engine; the copy has had the fix since 2026-11-21, and the game's own snap stays.

### 3. 帧循环出错后停在 `failed`，画面冻住 · After an error the frame loop stays `failed` and the picture freezes — 未解决 / open
<!-- engine-note: {"id": "FivePhases#3", "status": "open", "topic": "frame-loop-failed-freeze", "workaround": ["src/main.mjs"]} -->

- 现象 · What happens：一帧渲染失败后，`createBrowserGame` 的帧循环停在 `failed`：画面还在，但什么都不动，也没有明显的报错，比崩溃更难查。 · After one failed frame the loop stays `failed`: the picture is still there and nothing moves.
- 游戏里 · In the game：`src/main.mjs` 接 `onError`，把完整的 `cause` 链打出来，`runtime.loop.state === 'failed'` 时最多重启五次。 · `onError` prints the whole cause chain and restarts the loop up to five times.
- 建议 · Suggestion：给 `createBrowserGame` 一个"渲染失败后重试"的选项，每个游戏就不用各写一遍。 · Give `createBrowserGame` a retry-after-failure option.
- 状态 · Status：引擎还没有这个选项 · no such option yet.

### 4. Play 手势入口未覆盖棋盘按下即预览的完整会话 · High-level Play gestures omit the whole press-to-preview session — 未解决 / open
<!-- engine-note: {"id":"FivePhases#4","status":"open","topic":"play-gesture-session","workaround":["src/view/board-input.mjs","src/main.mjs"]} -->

- 现象 · What happens：本作需要从触点按下时获得原格，拖动不足 0.4 格时预览，超过阈值只交换一次，取消不选择，第二根手指不抢占。新版 game.gestures 的公开配置提供 drag/hold/doubleTap/swipe/pinch，但不开放 onTap、slop 或原始 begin/session。 · The board needs the initial cell, a preview below 0.4 cell, exactly one swap and per-contact cancellation. Play's convenience gesture API does not expose the tap/slop or raw begin/session contract.
- 绕过办法 · Workaround：使用引擎自己的 game.browser.pointer.observe 原生 PointerNotification 及 session.pointerId，无 HTML 触控覆盖层。输入控制器由 Node 测试覆盖。 · The native lower-level pointer observer, not DOM, owns the contact and drives the existing rules.
- 建议 · Suggestion：在 Play 高层增加可选 tap/slop 及 begin/end/cancel 会话接口，或在指南中明确此类棋盘应使用 pointer.observe。 · Expose the complete contact lifecycle in Play, or document the lower-level route.
- 状态 · Status：高层接口缺口，底层可以实现；非规则缺陷 · open capability gap, with a native lower-level route.

### 5. 可选文本成为空字符串时语义发布中断帧循环 · Empty optional text stops the semantic frame — 未解决 / open
<!-- engine-note: {"id":"FivePhases#5","status":"open","topic":"ui-empty-bound-text","workaround":["src/ui/hud.mjs"]} -->

- 现象 · What happens：新版 8e70dcb3 的 game.show 命名文本绑定从非空敌招变为 ""（Boss 被击败）时，PC Edge 与三星 Fold7 上均出现 UI_SEMANTICS_DESCRIPTION ← view1:enemy-intent: name，BrowserPlay.endFrame 失败并阻塞战斗结算。 · A named text part bound to the upcoming attack changes from non-empty text to an empty string when the boss dies. On physical Edge and Fold7, semantic publication throws and the frame stops before settlement.
- 最小复现 · Minimal reproduction：声明命名 text 部件，通过 bind.text 读 state.intent；state.intent 初始为 "4 步后 扑击"，运行后赋值 ""，不重建 view。 · Bind a named text to a state string, show it non-empty, then set it to an empty string while the view remains mounted.
- 绕过办法 · Workaround：可空文本统一提供非空兜底名称并在内容为空时通过 visible 隐藏，保持原视觉意图。 · Supply a nonempty fallback for optional text and hide the part when it has no content.
- 建议 · Suggestion：声明式 UI 对合法的空字符串应将语义节点隐藏或省略，而不是令渲染帧失败；保留严谨校验但让可选文本/动态提示自然工作。加 visible/empty 过渡的无头回归。 · Omit/hide the semantic node for empty optional bound text without failing the render loop. Add a transition regression.
- 状态 · Status：本作适配，待引擎改进 · worked around in the game, engine change not made.

### 6. 卡牌需要富内容操作容器与动态列表复用 · Rich actionable cards and keyed list reuse — 未解决 / open
<!-- engine-note: {"id":"FivePhases#6","status":"open","topic":"ui-rich-action-content","workaround":["src/ui/hud.mjs"]} -->

- 现象 · What happens：原生 button 仅支持标题、描述与段落，不允许图标/费用徽章/子部件。复合卡牌需要带 tap 的 panel；panel 原生可激活与焦点，但语义角色为 group，且不能单个绑定 disabled。当前视图绑定也没有 keyed children、动态 image.src 或 description。 · A card needs an icon, cost badge, title and effect; the native button cannot contain parts. A tappable panel is focusable but has group semantics and no individual disabled binding. The view does not yet reconcile keyed child lists.
- 绕过办法 · Workaround：使用复合原生 panel、完整语义名称、整手牌视图 activate/deactivate 与动作锁；仅在卡牌 UID 或费用改变时重建手牌，使用共享段落缓存。 · Use native composite panels, accessible names, activation gating and identity-based hand rebuilds with a shared paragraph cache.
- 建议 · Suggestion：提供原生复合按钮/可选角色和禁用绑定、keyed/repeat 列表以复用同一个卡牌精灵、焦点、图标和段落。 · Add rich buttons with explicit role/disabled, and keyed repeat/reconciliation to retain focus, content and image/paragraph borrows.
- 状态 · Status：可使用原生组合实现；未改引擎 · native workaround, engine unchanged.

