# 引擎 guide 卡片草稿 · Draft guide cards for the engine

这里是从本仓库各游戏的 ENGINE-NOTES 和修复提交里提炼出的引擎 guide 卡片草稿。格式与引擎仓库 `guide/cards/<领域>/<id>.txt` 相同：front matter 写 `id`、`title`、`applies`（play / play3d / engine / world3d / web）、`triggers`、`local`、`evidence`（repo、path、line、commit、pin）和 `engine`，正文是规则、最小示例、从哪个游戏哪次修复学来。每张印出来不超过 800 token、文件不超过 1000 token。引擎已有卡片能覆盖的，不另写新卡，改为给那张卡加证据，列在下面第二张表里。

These are draft guide cards for the engine, drawn from the ENGINE-NOTES and fix commits of the games here. They are in
the engine's own format (`guide/cards/<area>/<id>.txt`): front matter with `id`, `title`, `applies`, `triggers`,
`local`, `evidence` and `engine`, then the rule, a minimal example and the game and fix it was learnt from; at most 800
tokens printed and 1,000 as a file. Where an engine card already covers a lesson, no new card is written: the second
table proposes evidence for that card instead.

去向 · Where they went: 新卡和证据都已提交到引擎仓库 [cnedwin/Egret_rebuild](https://github.com/cnedwin/Egret_rebuild)
的 [PR #423](https://github.com/cnedwin/Egret_rebuild/pull/423)（分支 `claude/guide-cards-from-games`，已合并），通过了 `node tools/egret-guide.mjs` 的检索和 `tests/guide.test.mjs`
的名字、大小、索引、证据检查。下表「状态」一栏写明每条是否已进引擎。 · Both the new cards and the evidence went to an
engine pull request ([#423](https://github.com/cnedwin/Egret_rebuild/pull/423), merged there) and passed its guide checks; the status column says which.

检查一张草稿 · To check a draft: copy it into the engine's `guide/cards/<area>/`, add its line to `guide/index.txt`,
then run `node --test tests/guide.test.mjs` and `node tools/egret-guide.mjs "<question>"` there.

## 新卡 · New cards

| 卡片 · Card | 来源游戏 · Game | ENGINE-NOTES 条目 / 修复 · Item or fix | 状态 · Status |
|---|---|---|---|
| [rope-joints-2d](physics/rope-joints-2d.txt) | MechanismCity | ENGINE-NOTES 1（关节、绳索和旋转）；提交 `9e36464` | 已提交引擎 PR · in the engine PR |
| [save-update-callbacks](game/save-update-callbacks.txt) | MechanismCity | ENGINE-NOTES 15、18（`save.update` 的返回值、被拒的 update 仍改内存）；提交 `9e36464` | 已提交引擎 PR · in the engine PR |
| [ui-callbacks](input/ui-callbacks.txt) | MechanismCity、TeaHorseRoad | 千机巧匠 19；茶马古道 19、20（回调不能返回 Promise、输入分发中不能建 UI 根） | 已提交引擎 PR · in the engine PR |
| [cloth-and-rope](world3d/cloth-and-rope.txt) | TeaHorseRoad | ENGINE-NOTES 1、9、10、11（布绳被剔除、整条边、`slack`、单向钉住） | 已提交引擎 PR · in the engine PR |
| [terrain-stream-tiles](world3d/terrain-stream-tiles.txt) | TeaHorseRoad | ENGINE-NOTES 2、5、6、14（实例 LOD、地块距离、高度场原点、导航网格） | 已提交引擎 PR · in the engine PR |
| [play-page-controls](input/play-page-controls.txt) | CanalWatch | ENGINE-NOTES 1、2、4（`play` 拦下 Tab 和 Space、透明画布的黑底盒子、画布在 `game.canvas`）；提交 `13dcd4b` | 草稿，未提交引擎；在引擎 `b5628eb` 的临时副本里过了 `tests/guide.test.mjs` · draft, not sent; passed the engine's guide tests in a scratch copy |
| [rhythm-clock](audio/rhythm-clock.txt) | OperaDrums | ENGINE-NOTES 4（声部位置比听到的早、换算到页面时间、事件时间戳、延迟校准）；提交 `6e7d5bb` | 草稿，未提交引擎；在引擎 `b5628eb` 的临时副本里过了 `tests/guide.test.mjs` · draft, not sent; passed the engine's guide tests in a scratch copy |
| [moving-shapes](perf/moving-shapes.txt) | OperaDrums | ENGINE-NOTES 3（每帧移动的圆和路径比矩形贵，文字打断合批）；提交 `6e7d5bb` | 同上 · the same |
| [still-background](perf/still-background.txt) | CanalWatch | ENGINE-NOTES 3（静止地图每帧重画让软件渲染帧时间翻倍，改由页面画一次）；提交 `13dcd4b` | 同上 · the same |

## 给已有卡片加证据 · Evidence for existing cards

| 引擎卡片 · Engine card | 来源游戏 · Game | 证据 · Evidence | 状态 · Status |
|---|---|---|---|
| choose-entry | TeaHorseRoad | ENGINE-NOTES 7：哪些 world3d 函数只在浏览器入口 · which world3d functions live only in the browser entry | 已提交引擎 PR |
| world3d-draw-cost | TeaHorseRoad | ENGINE-NOTES 2：草木按地块远近切换，630 万 → 40 万三角形 · plants switched by distance per tile | 已提交引擎 PR |
| synthesized-audio | MechanismCity | ENGINE-NOTES 16：Web Audio 后端 · the Web Audio backend | 已提交引擎 PR |
| keyboard-shortcuts | SnowTemple | 修复 `b26ad51`：组合键松开时按真实按键状态对账（`src/input.mjs`） · chord release reconciled from the real button mask | 已提交引擎 PR |
| touch-controls | Rally | 修复 `ee391d0`：触屏按钮重做（`src/hud.mjs`） · the touch buttons rebuilt | 已提交引擎 PR |
| short-screen-hud | JY | 修复 `58783c3`：手机横屏下背包菜单改两栏（`web/style.css:862`） · the bag menu in two columns on a short landscape phone | 未进引擎：这张卡加上后超过 1000 token 的文件上限 · not added: the card would pass its 1,000-token file budget |
| short-screen-hud | SnowTemple | 修复 `1c47df4`：窄屏和触屏上目标第二行、状态条下一行不再压住角落按钮 · the goal's second line no longer runs into the corner buttons | 未进引擎：同上 · not added, same reason |
| read-engine-errors | FivePhases | README「前期矢量版的引擎测量」第 2 条：极小坐标让 `WEBGL2_GEOMETRY_RANGE` 整帧失败 · tiny coordinates fail the whole frame | 未进引擎：FivePhases 的引擎副本没有 `vendor/SOURCE.md`，证据缺引擎提交号（pin） · not added: no engine pin recorded |
| balance-from-runs | CanalWatch | `CanalWatch/tools/balance.mjs`：电脑玩家按六种打法、两种难度各打 12 局，结果写进 README · a bot plays six ways on two difficulties, 12 games each | 草稿，未提交引擎 · draft, not sent |
| two-languages | CanalWatch | `CanalWatch/src/i18n.mjs:181`：`createTextTable` 加 `missing()` 的测试，英文里不留中文 · the text table with a `missing()` test | 草稿，未提交引擎 · draft, not sent |
| pause-and-overlays | CanalWatch | `CanalWatch/src/main.mjs:492`：切到后台时进行中的一局停在菜单上 · a hidden tab pauses the game behind the menu | 草稿，未提交引擎 · draft, not sent |
| synthesized-audio | OperaDrums | `OperaDrums/src/audio/synth.mjs`：鼓、锣、钹、板、京胡都由数算出，`encodeWav` 后交给混音器 · every instrument computed and handed to the mixer as WAV | 草稿，未提交引擎 · draft, not sent |
| balance-from-runs | OperaDrums | `OperaDrums/tools/balance.mjs`：电脑玩家按五种准度把九张谱各打 10 局 · a bot at five levels of steadiness plays nine charts 10 times each | 草稿，未提交引擎 · draft, not sent |
| play-page-controls（本仓库草稿 · a draft here） | OperaDrums | `OperaDrums/src/main.mjs:112`、ENGINE-NOTES 1：敲击键和页面按钮同在时，捕获阶段接住按键 · keys caught first beside page buttons | 草稿 · draft |
| frame-loop-backpressure | FivePhases | 同上第 3 条：帧循环报错后停在 `failed`，用 `onError` 有限次重启 · the loop stops at `failed`; bounded restarts from `onError` | 未进引擎：同上 · not added, same reason |

## 每个游戏 · By game

| 游戏 · Game | 本次草稿 · Drafts this time | 说明 · Note |
|---|---|---|
| MechanismCity | 4（3 张新卡含共用的 ui-callbacks，1 条证据） | |
| TeaHorseRoad | 5（3 张新卡含共用的 ui-callbacks，2 条证据） | |
| SnowTemple | 2（2 条证据，1 条进引擎） | |
| FivePhases | 2（2 条证据，未进引擎） | 缺引擎提交号 · no engine pin |
| Rally | 1（1 条证据） | 另一个修复 `ee391d0` 的水面倒影已被 world3d-draw-cost 引用 · its reflection fix is already cited |
| JY | 1（1 条证据，未进引擎） | 修复 `04313eb`（经典战斗结算、密集数字）是游戏自己的规则，不是引擎经验 · a fix of the game's own rules |
| OperaDrums | 5（2 张新卡，3 条证据） | 都是草稿，还没提交引擎 · all drafts, not yet sent to the engine |
| CanalWatch | 5（2 张新卡，3 条证据） | 都是草稿，还没提交引擎 · all drafts, not yet sent to the engine |
| FPS、jelly-pandas、Wulin、LanternShadows、LoveElective | 0 | 没有 ENGINE-NOTES 内容，也没有新的引擎相关修复提交；它们的经验已被引擎现有卡片引用（FPS 14 张、jelly-pandas 12 张、Wulin 5 张、LanternShadows 4 张、LoveElective 1 张） · no notes and no new engine-related fixes; already cited by the engine's cards |

收尾规则见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 6 节：以后每款游戏完成时产出 2–5 张草稿放在这里并登记。

The finishing rule is part 6 of the standard: each game, when finished, adds two to five drafts here and registers them.
