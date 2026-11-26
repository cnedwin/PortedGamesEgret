# The Lantern Bearer: how to work on this game · 提灯人：怎样开发这款游戏

A game on the Egret engine, made from the template of this repository. The engine is copied in `vendor/` with its guide; do not edit `vendor/`. The rules of the repository are in [GAME-STANDARD.md](../../docs/GAME-STANDARD.md).

## Ask before you write

- `node vendor/egret.mjs list genre` lists the recipes of each kind of game; read the one for this game first with `node vendor/egret.mjs card genre-<kind>`.
- `node vendor/egret.mjs guide <question>` gives the cards that answer, in English or Chinese, by words, an engine name or an error code. `node vendor/egret.mjs explain <ERROR_CODE>` explains an engine error in both languages.
- Every engine name you use must be one its entry exports: `node vendor/egret.mjs check` says when it is not, and which entry has it.

## The way through

1. The rules in `src/sim/`, apart from the page and the engine, from a fixed seed; `node --test test/*.test.mjs` plays them. The screens in `src/screens.mjs`, the words of both languages in `src/i18n.mjs`, the save in `src/saves.mjs` (its check is `shapeOf` of the kit).
2. The first action within a second of Start, and its result on the screen; then the loop, an end and the way back.
3. Make each label and shape once and change it after; never make them in every frame.
4. Keys, a gamepad and touch, from the first version.

## Before you say it is done

- `node --test test/*.test.mjs` passes, `node vendor/egret.mjs check` gives no error, `node test/accept.mjs` passes against its baselines, and `node vendor/egret.mjs verify` reports no `engineWarnings` you have not answered. Look at the pictures.
- Keep each fix as a commit of its own, with what it fixed in its message: the engine's guide cards point at these commits.
- A fault of the engine you worked around is a note in `ENGINE-NOTES.md` with its header line; after a fix, add a line to the note saying what changed. After an engine refresh, `node vendor/egret.mjs notes` says which notes the engine fixed.
- Fill in `QUALITY.md` and the nine sections of `README.md`, and say what you ran and what you could not run: Node tests, a browser run and a device run are three different claims.

## 中文

这是基于白鹭引擎、从本仓库模板建出的游戏。引擎和它的指南复制在 `vendor/` 里，不要改 `vendor/`。仓库规则见 [GAME-STANDARD.md](../../docs/GAME-STANDARD.md)。

- **写之前先问。** `node vendor/egret.mjs list genre` 列出各类游戏的配方，先用 `node vendor/egret.mjs card genre-<类型>` 读本作那一类；`guide <问题>` 按中英文、引擎名字或错误码给出卡片，`explain <错误码>` 用中英文解释引擎错误；用到的每个引擎名字都必须是所在入口导出的，`check` 会指出不是的，以及哪个入口有它。
- **做法。** 规则放 `src/sim/`，不碰页面和引擎，用固定种子，`node --test test/*.test.mjs` 测；画面在 `src/screens.mjs`，两种语言的文字在 `src/i18n.mjs`，存档在 `src/saves.mjs`（校验用 kit 的 `shapeOf`）。开始后一秒内有第一个动作和它在画面上的结果，再做循环、结局和返回。文字和形状只建一次、之后修改，不要每帧新建。键盘、手柄和触屏从第一版就都要能用。
- **说做完之前。** Node 测试通过，`check` 没有错误，`node test/accept.mjs` 与基线一致，`verify` 的 `engineWarnings` 都已处理，并看过截图。每个修复单独一个提交，提交说明写清修了什么：引擎指南的卡片会引用这些提交。绕过的引擎问题写进 `ENGINE-NOTES.md`，带头行；修好后在那条笔记里加一行写明改了什么。刷新引擎副本后，`notes` 会说明引擎修好了哪些。填好 `QUALITY.md` 和 `README.md` 的九节，并说明运行了什么、什么没能运行：Node 测试、浏览器运行和真机运行是三件不同的事。
