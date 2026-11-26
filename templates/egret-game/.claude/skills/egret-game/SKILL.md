---
name: egret-game
description: Build or change this game on the Egret engine, from a brief to a game checked in Node and in a browser, by the standard of this repository. Use for any change to its rules, screens, words, save, input or look, and for engine errors met in it.
---

# Make this game on the Egret engine · 在白鹭引擎上做这款游戏

1. Read AGENTS.md. Find the recipe of the kind of game with `node vendor/egret.mjs list genre` and read it with `node vendor/egret.mjs card genre-<kind>`. Ask the guide before writing engine code: `node vendor/egret.mjs guide "<what you need>"`.
2. Write the rules in `src/sim/` and their tests in `test/`; run `node --test test/*.test.mjs`.
3. Write the screens in `src/screens.mjs` and the words of both languages in `src/i18n.mjs`. Make labels and shapes once and change them after; keys, a gamepad and touch.
4. Run `node vendor/egret.mjs check` and fix every error. For an engine error, `node vendor/egret.mjs explain <CODE>`.
5. Run `node test/accept.mjs` and `node vendor/egret.mjs verify`; look at the pictures and answer each of the `engineWarnings`.
6. Commit each fix on its own. Write a fault of the engine you worked around into `ENGINE-NOTES.md`, with its header line.
7. Fill in `QUALITY.md` and the README, then report what you ran, what passed and what you could not run.

中文：先读 AGENTS.md，用 `list genre` 找到本作类型的配方并用 `card genre-<类型>` 读它；写引擎代码前先问 `guide`。规则写进 `src/sim/`、测试写进 `test/` 并运行；画面写进 `src/screens.mjs`，中英文字写进 `src/i18n.mjs`，文字和形状只建一次。运行 `check` 并修掉所有错误，引擎错误用 `explain` 查。运行 `node test/accept.mjs` 和 `verify`，看截图并处理每条 `engineWarnings`。每个修复单独提交，绕过的引擎问题连同头行写进 `ENGINE-NOTES.md`。最后填好 `QUALITY.md` 和 README，说明运行了什么、什么通过了、什么没能运行。
