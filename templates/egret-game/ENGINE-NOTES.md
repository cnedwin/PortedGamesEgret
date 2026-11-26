# 引擎笔记 · Engine notes

做这款游戏时发现的新白鹭引擎（提交 `687037a`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../../docs/GAME-STANDARD.md) 第 3 节。新游戏从模板开始时保留第 1 条作为写法示例，或删掉它从自己的第 1 条写起。

The faults found in the new Egret engine (commit `687037a`) while making this game, and suggestions, written as in
part 3 of [docs/GAME-STANDARD.md](../../docs/GAME-STANDARD.md). A game made from the template keeps item 1 as an example
of the form, or replaces it with its own.

### 1. `save.update` 返回布尔值 · `save.update` returns a boolean — 已写入文档 / documented
<!-- engine-note: {"id": "egret-game#1", "status": "documented", "topic": "save-update-return", "workaround": ["src/main.mjs", "src/screens.mjs"]} -->

- 现象：`createSaveStore` 的 `update(change)` 在存储拒绝写入或数据没通过 `validate` 时返回 `false`，成功返回 `true`，不返回对象；写成 `result.ok === false` 的判断永远不成立，进度丢了也不会提示。 · What happens: `update(change)` returns `false` when the storage refuses or the data fails `validate`, and `true` otherwise — not an object; a check written as `result.ok === false` never holds, and lost progress goes unsaid.
- 绕过办法：直接用返回的布尔值，`false` 时在界面上说「本次进度不会保留」（`src/main.mjs` 的 `setSetting`，`src/screens.mjs` 的结算）。 · Workaround: use the boolean as it is, and say on the screen that the progress will not be kept when it is `false`.
- 建议：引擎文档已写明返回值；可以在 `SaveStore` 的类型里给 `update` 的返回值起名（如 `SaveWriteResult = boolean`），让读类型的人一眼看到。 · Suggestion: the docs already say so; naming the return type would make it plain to anyone reading the types.
- 状态：已写入文档（`packages/engine/src/saveStore.ts` 的注释）。 · Status: documented in the engine's comments.
