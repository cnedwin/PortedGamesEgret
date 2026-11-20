# 提灯人 · The Lantern Bearer

## 简介 · Introduction

提灯人是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)的游戏模板：一个能跑的空游戏，有标题画面、开始、一个能走动的角色、存档、设置和中英文切换，Node 测试、浏览器验收脚本和截图基线都已经能通过。用 `npm run create -- <目录名> --title "中文名 · English"` 从它开始一款新游戏，规则写进 `src/sim/`，画面写进 `src/screens.mjs`。

The Lantern Bearer is a game template built on [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild), the new Egret
engine: an empty game that runs, with a title screen, a start, one character who walks, a save, settings and a switch
between Chinese and English, and Node tests, a browser acceptance walk and screenshot baselines that already pass.
Start a new game from it with `npm run create -- <folder> --title "中文名 · English"`, then put the rules in `src/sim/`
and the screens in `src/screens.mjs`.

[在线试玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/templates/egret-game/)

## 玩法与操作 · How to play

在场地上走动，收齐全部光点；用时越短越好，最快的一次存进浏览器。Walk the field and gather every light; the fastest
round is kept in the browser.

| | 键盘 · Keyboard | 手柄 · Gamepad | 触屏 · Touch |
|---|---|---|---|
| 走动 · Walk | 方向键或 WASD · arrows or WASD | 十字键 · d-pad | 屏幕上的四个方向键 · the four arrows on the screen |
| 确认 · Confirm | Enter；焦点在按钮上时 Space · Space on a focused button | A | 点按 · tap |
| 返回 · Back | Esc | B | 「返回」 · Back |
| 换焦点 · Move focus | Tab / Shift+Tab | | |

设置里可以关声音、减弱动画（系统设置了「减少动态效果」时自动减弱）和切换语言。The settings turn the sound off, reduce
motion (reduced already when the system asks for it) and switch the language.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `createBrowserGame`（`@egret/engine/web/game`） | 画布、舞台、帧循环、键盘和指针输入；横屏 960×540、竖屏 540×960，转屏时整块重建 · canvas, stage, loop and input; 960 × 540 wide, 540 × 960 tall, made again when the phone turns | `src/main.mjs` |
| `createInputActions` + `bindBrowserInputActions` | 走动的两个轴（键盘与手柄）、确认、返回；焦点控件用掉的键不再触发动作 · the two walking axes (keys and pad), confirm, back; a key a focused control used presses nothing | `src/main.mjs` |
| `createActionControl` | 所有按钮；触屏的四个方向键（按住算按下） · every button; the four touch arrows, held while pressed | `src/ui/kit.mjs`, `src/screens.mjs` |
| `createToggleControl` + `createSelectionGroup` + `createControlKeys` | 设置里的开关和语言单选，都能用键盘操作 · the switches and the language choice, all working from the keyboard | `src/ui/kit.mjs`, `src/screens.mjs` |
| `createUiSemantics` + `createBrowserSemantics` | 语义树投影到页面，读屏器能读出按钮、开关和单选 · the semantic tree projected into the page for screen readers | `src/main.mjs`, `src/ui/kit.mjs` |
| `createSaveStore` + `browserSaveStorage` | 设置和最好成绩；坏档另存后重新开始，存储拒绝写入时提示 · settings and the best time; a broken save set aside, a refusing storage reported | `src/saves.mjs`, `src/main.mjs` |
| `createBrowserAudio` + `encodeWav` | 合成的按键声和拾取声交给引擎混音器 · synthesized taps and pick-ups through the engine's mixer | `src/audio/sound.mjs` |
| `animate` | 标题上角色的轻微浮动，减弱动画时关闭 · the title figure's slow bob, off when motion is reduced | `src/screens.mjs` |
| `createLabel`（`game.createLabel`） | 所有文字，按当前语言排版 · every word, laid out for the current language | `src/ui/kit.mjs` |

## 已验证 · Verified

- `node --test test/*.test.mjs`：规则（同种子同场地、走速、边界、拾取、通关）、存档（新档、写入、最好成绩、坏档、版本过新、存储拒绝写入）、文字表（中英齐全、界面代码不写死中文）、引擎副本的 import map。Node 24。 · rules, save, words and the engine copy's import map, in Node.
- `node test/accept.mjs`：无头 Chromium（SwiftShader 软件渲染）里走完标题 → 设置 → 开始 → 走动 → 收齐 → 结算 → 返回，坏档恢复，两张截图基线一致，没有控制台错误。 · the whole walk in headless Chromium with software rendering, two baselines matching, a clean console.

## 已知问题 · Known issues

- 真机（手机、桌面显卡）上没有运行过，帧时间等只在无头浏览器里量过。 · Not run on a real device; frame times were measured only in a headless browser.

## 已解决 · Solved

- 存档写入被拒时，`save.update` 返回 `false`（不是对象）；模板据此提示「本次进度不会保留」。 · A refused write makes `save.update` return `false` (not an object); the template says the progress will not be kept.

## 未完成 · Unfinished

- 模板只有一个画面里的玩法；关卡、音乐和更复杂的界面（托管界面 `createUiRoot`）由新游戏自己加，可参考 [CAPABILITIES.md](../../CAPABILITIES.md) 找例子。 · The template has one screen of play; levels, music and managed UI (`createUiRoot`) are for each game to add — [CAPABILITIES.md](../../CAPABILITIES.md) says where to find examples.

## 目录结构 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `index.html`, `style.css` | 页面、import map、全屏舞台（不滚动、不下拉刷新、不双击缩放） · the page, the import map, a full-window stage |
| `src/main.mjs` | 入口：游戏、存档、声音、语义树、键位、画面切换、转屏重建 · the entry |
| `src/sim/world.mjs` | 规则，不碰页面和引擎 · the rules, free of the page and the engine |
| `src/screens.mjs` | 标题、游戏、结算、设置 · the screens |
| `src/ui/kit.mjs` | 界面零件 · the interface parts |
| `src/i18n.mjs` | 中英文文字表 · the words in both languages |
| `src/saves.mjs`, `src/audio/sound.mjs` | 存档、声音 · the save, the sound |
| `test/*.test.mjs` | Node 测试 · Node tests |
| `test/accept.mjs`, `test/baseline/` | 浏览器验收和截图基线 · browser acceptance and baselines |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `687037ac462c48dbfe00523312125b94072ffea4`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit
`687037ac462c48dbfe00523312125b94072ffea4`, copied by the engine's `tools/vendor-game.mjs`; see
[vendor/SOURCE.md](vendor/SOURCE.md).

```sh
node tools/vendor-game.mjs <this folder> @egret/engine @egret/engine/ui @egret/engine/ui/semantics @egret/engine/web/semantics @egret/engine/kit @egret/engine/web/kit @egret/engine/web/game @egret/engine/audio @egret/engine/web/audio @egret/engine/text @egret/engine/web/text
```
