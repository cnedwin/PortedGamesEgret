# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（最初为提交 `b6a392a`，2026-11-21 升级到 `b5628eb`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (first `b6a392a`, `b5628eb` since 2026-11-21) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. 引擎时钟拒绝一次推进太长的时间 · The engine clock refuses a long step — 已在 `6805db7` 解决 / resolved in `6805db7`
<!-- engine-note: {"id": "LoveElective#1", "status": "resolved", "topic": "clock-long-step", "workaround": ["src/engine/stage.mjs"]} -->

- 现象 · What happens：一帧画得慢或标签页被隐藏后回来，把整段时间交给 `engine.advanceTime`，时钟以 `CLOCK_DELTA_LIMIT` 拒绝。 · After a slow frame or a hidden tab, handing the whole gap to `engine.advanceTime` was refused with `CLOCK_DELTA_LIMIT`.
- 游戏里 · In the game：起初 `src/engine/stage.mjs` 自己把落后的时间截到 0.5 秒、拆成几步推进；2026-11-21 起改用引擎的 `createBrowserFrameLoop`（`maxStepSeconds` 为时钟上限的九成，`catchUpSeconds: 0.5`），做法相同。 · First the game capped and split the gap itself; since 2026-11-21 the engine's `createBrowserFrameLoop` does it with the same numbers.
- 建议 · Suggestion：时钟可以提供"超过上限就截断"的选项，而不是只能抛错。 · The clock could offer to clamp instead of only refusing.
- 状态 · Status：已改用引擎的循环 · now uses the engine's loop.

### 2. 共享宿主只能积压很少几帧 · A shared host holds only a few unfinished frames — 已在 `6805db7` 解决 / resolved in `6805db7`
<!-- engine-note: {"id": "LoveElective#2", "status": "resolved", "topic": "shared-host-pending-frames"} -->

- 现象 · What happens：每个 `requestAnimationFrame` 都调用 `renderSharedFrame`，宿主来不及完成时提交失败，原因以 `_BACKPRESSURE` 结尾。 · Calling `renderSharedFrame` on every animation frame fails, with a cause ending in `_BACKPRESSURE`, when the host has not caught up.
- 游戏里 · In the game：起初每帧先看 `host.getStatus()`，`pendingFrames` 为 0 才提交；2026-11-21 起由 `createBrowserFrameLoop`（`maxPendingFrames: 1`）在宿主忙时跳过这一帧，失败交给 `onError` 显示。 · First the game checked `pendingFrames` itself; now `createBrowserFrameLoop` skips a frame while the host is busy and reports a failure through `onError`.
- 建议 · Suggestion：手写 2D 共享宿主的游戏改用引擎的 `createBrowserFrameLoop`，不再各自写这段。 · Games with a hand-made 2D shared host should use the engine's `createBrowserFrameLoop`.
- 状态 · Status：已改用引擎的循环 · now uses the engine's loop.
