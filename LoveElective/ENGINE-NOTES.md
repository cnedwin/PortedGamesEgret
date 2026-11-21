# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（提交 `b6a392a`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (commit `b6a392a`) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. 引擎时钟拒绝一次推进太长的时间 · The engine clock refuses a long step — 已写入文档 / documented

- 现象 · What happens：一帧画得慢或标签页被隐藏后回来，把整段时间交给 `engine.advanceTime`，时钟以 `CLOCK_DELTA_LIMIT` 拒绝。 · After a slow frame or a hidden tab, handing the whole gap to `engine.advanceTime` was refused with `CLOCK_DELTA_LIMIT`.
- 游戏里 · In the game：`src/engine/stage.mjs` 把落后的时间截到最多 0.5 秒，再按 `engine.clock.maxDeltaSeconds` 的九成拆成几步推进；隐藏标签页回来后时间直接继续，不补。 · The gap is capped at half a second and fed in steps of nine tenths of `maxDeltaSeconds`; after a hidden tab time simply resumes.
- 建议 · Suggestion：时钟可以提供"超过上限就截断"的选项，而不是只能抛错。 · The clock could offer to clamp instead of only refusing.
- 状态 · Status：引擎的错误码表写明了原因；`@egret/engine/web/loop` 的 `createBrowserFrameLoop`（`6805db7` 起）会自己拆分，本作副本 `b6a392a` 已包含，但游戏还在用自己的循环 · the error table explains it, and `createBrowserFrameLoop` splits the gap itself; this copy has it, but the game keeps its own loop.

### 2. 共享宿主只能积压很少几帧 · A shared host holds only a few unfinished frames — 已写入文档 / documented

- 现象 · What happens：每个 `requestAnimationFrame` 都调用 `renderSharedFrame`，宿主来不及完成时提交失败，原因以 `_BACKPRESSURE` 结尾。 · Calling `renderSharedFrame` on every animation frame fails, with a cause ending in `_BACKPRESSURE`, when the host has not caught up.
- 游戏里 · In the game：`src/engine/stage.mjs` 每帧先看 `host.getStatus()`：`pendingFrames` 为 0 才提交；状态为 `failed` 时报"显卡停止工作"并显示错误。 · A frame is submitted only when `host.getStatus().pendingFrames` is 0; a failed host is reported.
- 建议 · Suggestion：手写 2D 共享宿主的游戏改用引擎的 `createBrowserFrameLoop`，不再各自写这段。 · Games with a hand-made 2D shared host should use the engine's `createBrowserFrameLoop`.
- 状态 · Status：引擎 guide 卡片 `frame-loop-backpressure` 已写明；游戏还没改用引擎的循环 · described in the frame-loop-backpressure card; the game has not moved to the engine's loop.
