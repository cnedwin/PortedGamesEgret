# 游戏工程标准 · Game project standard

这个仓库里的每个游戏都是一个独立目录，带着自己的引擎副本，能单独打开、单独测试。本标准规定每个游戏目录必须有什么、每个文件怎么写，让任何人或 AI 都能按同一套骨架、同一张验收表做出品质一致的白鹭游戏，并且知道每项引擎能力去哪个游戏里找完整例子（见 [CAPABILITIES.md](../CAPABILITIES.md)）。

Every game in this repository is one folder with its own copy of the engine, opened and tested on its own. This
standard says what each game folder must hold and how each file is written, so that anyone, person or AI, builds an
Egret game of even quality on the same skeleton and the same acceptance sheet, and knows which game shows each engine
capability in full (see [CAPABILITIES.md](../CAPABILITIES.md)).

- 新游戏从模板开始 · A new game starts from the template: `npm run create -- <目录名 · folder> --title "中文名 · English name"`（见下文 · see below）。
- 检查一个或全部游戏 · Check one game or all: `node tools/check-standard.mjs [目录名 · folder]`，`--strict` 时任何缺项都算失败 · with `--strict` any gap fails.
- 品质验收 · Quality: [QUALITY-CHECKLIST.md](QUALITY-CHECKLIST.md)，`node tools/quality.mjs <目录名 · folder>`。

## 1. 目录里必须有的东西 · What a game folder must hold

| 项 · Item | 要求 · Requirement |
|---|---|
| `README.md` | 固定的九节，见第 2 节 · the nine fixed sections of part 2 |
| `ENGINE-NOTES.md` | 引擎缺陷与建议，格式见第 3 节 · engine faults and suggestions, written as in part 3 |
| `QUALITY.md` | 按 [QUALITY-CHECKLIST.md](QUALITY-CHECKLIST.md) 填写的验收结果 · the acceptance results, filled in from the checklist |
| `test/*.test.mjs` | 能用 `node --test test/*.test.mjs` 跑的 Node 测试，至少覆盖规则和存档（文件名或内容里有 `rules`/`sim` 与 `save`） · Node tests run with `node --test`, covering at least the rules and the save |
| `test/accept.mjs` | 浏览器验收脚本：用 Playwright（`tools/lib/browser.mjs`）打开游戏、走完一段固定流程、断言没有控制台错误，失败时退出码非零 · browser acceptance: opens the game with Playwright, walks a fixed path, asserts a clean console, exits non-zero on failure |
| `test/baseline/*.png` | 截图基线：固定视口、固定随机种子（`?seed=`）、减弱动画下的关键画面；`test/accept.mjs` 用 `matchBaseline` 比对并把差异图写到 `test/baseline/diff/`（不提交） · screenshot baselines at a fixed viewport, a fixed seed and reduced motion, compared by `matchBaseline`, with the difference picture written to `test/baseline/diff/` (not committed) |
| `vendor/` | 引擎副本，由引擎仓库的 `tools/vendor-game.mjs` 生成；`vendor/SOURCE.md` 写着引擎提交号；页面的 import map 与 `vendor/importmap.json` 一致 · the engine copy made by the engine's `tools/vendor-game.mjs`; `vendor/SOURCE.md` names the engine commit; the page's import map matches `vendor/importmap.json` |

规则（`src/sim/` 或同类目录）不碰页面也不碰引擎，能在 Node 里用固定种子跑；画面只读规则的状态。界面上的字一律从文字表取，中英文都有。

The rules (`src/sim/` or the like) touch neither the page nor the engine and run in Node from a fixed seed; the view
only reads their state. Every word on the screen comes from a word table, in Chinese and in English.

## 2. README 的九节 · The nine sections of the README

标题第一行是 `# 中文名 · English name`。各节标题中英并列（`## 中文 · English`），按下面的顺序。后四节的英文标题必须用 verified / known issues / solved / unfinished 这几个词：引擎仓库的 `tools/harvest-games.mjs` 按它们给 README 的说法归类，收成引擎的 guide 卡片。

The first line is `# 中文名 · English name`. Each section heading has both languages (`## 中文 · English`), in this
order. The English titles of the four status sections must use the words verified / known issues / solved / unfinished:
the engine's `tools/harvest-games.mjs` sorts a README's claims by them when it gathers guide cards.

| # | 标题 · Heading | 内容 · Content |
|---|---|---|
| 1 | `## 简介 · Introduction` | 一段中文、一段英文的简介，注明基于新白鹭引擎（链接引擎仓库），附 GitHub Pages 试玩链接 · a paragraph in each language, saying it is built on the new Egret engine (linked), with the GitHub Pages link to play |
| 2 | `## 玩法与操作 · How to play` | 目标、规则、键盘/鼠标/手柄/触屏的操作 · the goal, the rules, the controls for keyboard, mouse, gamepad and touch |
| 3 | `## 引擎能力对照表 · Engine capabilities` | 三列表格：`引擎入口 / API · Entry / API` · `在本游戏中的用途 · Use in this game` · `文件 · File`；每行一个引擎 API，用途写可见的效果，文件写相对路径 · a three-column table, one engine API a row, the visible use, the file |
| 4 | `## 已验证 · Verified` | 实际跑过的检查，写明环境（Node、无头 Chromium + SwiftShader、某型号真机）；没跑的不写 · checks that were actually run, with where (Node, headless Chromium with SwiftShader, a named device); nothing that was not run |
| 5 | `## 已知问题 · Known issues` | 现存的问题，包括 QUALITY.md 里不达标的项 · problems that remain, including what fails in QUALITY.md |
| 6 | `## 已解决 · Solved` | 解决过的问题和办法，引擎方面的写明 ENGINE-NOTES 条目 · problems solved and how, naming the ENGINE-NOTES item when it was the engine's |
| 7 | `## 未完成 · Unfinished` | 计划了但还没做的 · planned and not yet done |
| 8 | `## 目录结构 · Layout` | 目录和主要文件的用途 · what each folder and main file is for |
| 9 | `## 引擎副本 · Engine copy` | 引擎提交号（与 `vendor/SOURCE.md` 一致）、生成命令、用到的入口 · the engine commit (as in `vendor/SOURCE.md`), the command that made the copy, the entries used |

其他内容（美术来源、加载、许可、开发命令）放在第 2 与第 3 节之间，或第 9 节之后，用自己的标题。没写内容的节保留标题和一行 `（待补 · To be written）`。

Anything else (where the art comes from, loading, licences, commands) goes between sections 2 and 3, or after
section 9, under its own heading. A section with nothing yet keeps its heading and one line, `（待补 · To be written）`.

## 3. ENGINE-NOTES 的写法 · How ENGINE-NOTES is written

每条一个三级标题：`### <编号>. <中文标题> · <English title> — <状态>`，状态取 `未解决 / open`、`部分解决 / partly resolved`、`已写入文档 / documented`、`已在 <引擎提交> 解决 / resolved in <commit>`。正文至少四项，中英各一遍：

One third-level heading an item: `### <number>. <中文> · <English> — <status>`, the status one of `未解决 / open`,
`部分解决 / partly resolved`, `已写入文档 / documented`, `已在 <commit> 解决 / resolved in <commit>`. The body has at
least these four, in each language:

- **现象 · What happens**：怎么复现、看到了什么、错误码 · how to see it, what is seen, the error code.
- **绕过办法 · Workaround**（或「游戏里 · In the game」）：游戏现在怎么做，用的都是引擎已有的部件 · what the game does now, with the engine's own parts.
- **建议 · Suggestion**：引擎应该怎么改，或文档该怎么写 · what the engine or its documents should change.
- **状态 · Status**：与标题一致；解决时写提交号 · as in the heading; the commit when resolved.

开发中确实没有遇到引擎问题的游戏，不要编条目，写一行 `**没有记录到引擎问题 · No engine issues recorded**`，后面说明查过哪些来源（修复提交、代码注释、README）。

A game that truly met no engine fault invents no item: it writes one line, `**没有记录到引擎问题 · No engine issues recorded**`, followed by what was looked through (fix commits, code comments, the README).

已解决或已写入文档的条目可以不再写建议；也可以按「原来 / 引擎提交 / 本作现在」三段写（见 MechanismCity）。`tools/check-standard.mjs` 按这些字样检查每一条。

An item the engine has resolved or documented may drop its suggestion, and an item may be written as "before / the engine commit / this game now" (as in MechanismCity). `tools/check-standard.mjs` looks for these words in every item.

## 4. 引擎副本 · The engine copy

```sh
# 在引擎仓库 · in the engine repository (cnedwin/Egret_rebuild), built at the commit you pin
node tools/vendor-game.mjs ../PortedGamesEgret/<目录 · folder> @egret/engine @egret/engine/ui ...
```

生成后把 `vendor/importmap.json` 贴进 `index.html` 的 import map。`vendor/` 只由这个工具改，游戏不手改引擎副本；引擎的问题写进 ENGINE-NOTES。

Then paste `vendor/importmap.json` into the import map of `index.html`. `vendor/` is changed only by that tool; a game
never edits its engine copy by hand, and writes the engine's faults into ENGINE-NOTES instead.

## 5. 从模板开始 · Starting from the template

经营游戏可从“落下第一栋房子”起步。默认模板仍提供通用标题、设置与游走样例。

For a management game, start with placing the first house. The default starter retains its general menu and movement example.

    npm run create -- MyVillage --template management --title "溪边小镇 · Riverside Town"

[Play the opening](https://cnedwin.github.io/PortedGamesEgret/templates/management-game/) · [Authoring guide](en/management-first-playable.md) · [中文创作指引](Cns/management-first-playable.md)

```sh
npm run create -- MyGame --title "我的游戏 · My Game"
# 或 · or
node tools/create-game.mjs MyGame --title "我的游戏 · My Game" [--engine ../Egret_rebuild]
```

它复制 [`templates/egret-game/`](../templates/egret-game/)，换掉名字、存档键和标题，然后生成引擎副本：给了 `--engine`（或旁边有 `../Egret_rebuild`）时用那里的 `tools/vendor-game.mjs` 按模板的入口重新复制，否则沿用模板自带的副本。之后在新目录里跑：

It copies [`templates/egret-game/`](../templates/egret-game/), renames the game, its save key and its title, then makes
the engine copy: with `--engine` (or `../Egret_rebuild` beside this repository) it copies again with that engine's
`tools/vendor-game.mjs` for the template's entries; otherwise it keeps the template's copy. Then, in the new folder:

```sh
node --test test/*.test.mjs
node test/accept.mjs --update    # 第一次写下自己的截图基线 · the first run writes its own baselines
node test/accept.mjs
node ../tools/quality.mjs .
```

`npm create egret-game` 这个名字留给将来发布到 npm 的版本；现在不发布，只有仓库里的 `npm run create`。

The name `npm create egret-game` is kept for a version published to npm later; nothing is published now, there is
only `npm run create` in this repository.

## 6. 完成时的收尾 · Finishing a game

一款游戏算完成，要同时做到 · A game is finished when all of these hold:

1. `node tools/check-standard.mjs <目录> --strict` 通过 · passes.
2. `QUALITY.md` 填完，自动项都量过，真机项写明「未运行」或真机结果；不达标的写进 README 的「已知问题」· `QUALITY.md` is filled in, every automatic item measured, device items either run or marked not run; failures are in Known issues.
3. **产出 2–5 张引擎 guide 卡片草稿**，放进 [`guide-cards/`](../guide-cards/)，并在 `guide-cards/README.md` 登记来源游戏和 ENGINE-NOTES 条目；引擎已有卡片能覆盖的，改为建议给那张卡加证据 · **two to five draft guide cards** go into `guide-cards/`, registered in its README with the game and ENGINE-NOTES item; where an engine card already covers it, propose evidence for that card instead.
4. `node tools/capability-matrix.mjs` 重新生成能力矩阵 · the capability matrix is generated again.
5. 根目录 README 与展示站（`showcase/games.js`）加上这款游戏 · the root README and the showcase list the game.
