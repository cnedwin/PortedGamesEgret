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
| [sprite-swarm](perf/sprite-swarm.txt) | NezhaSea | ENGINE-NOTES 3（共用贴图的 Bitmap 比矩形精灵贵得多，改用矩形加精灵池）；提交 `9b3d926` | 同上 · the same |
| [play-resolution](perf/play-resolution.txt) | TaiwanMahjong | ENGINE-NOTES 3（play 没有分辨率选项，1280×720 空画布 p95 33 ms；开 960×540 加根节点缩放）；提交 `936d1e6` | 同上 · the same |
| [play-turned-table](input/play-turned-table.txt) | TaiwanMahjong | ENGINE-NOTES 4（外层旋转时 play 拒绝启动；分三层、引擎竖着开）；提交 `936d1e6` | 同上 · the same |
| [sequence-markers](animation/sequence-markers.txt) | NightWardens | ENGINE-NOTES 1（动画控制器的标记名重复时报错不说是哪一条）；帧走路、标记扬尘、随弹层暂停、影子画进帧里；提交 `886c81c` | 草稿，未提交引擎；在引擎 `a778bed` 的临时副本里过了 `tests/guide.test.mjs`（索引放在 World3D 一节末尾，因为索引已贴着 1500 token 的上限）· draft, not sent; passed the engine's guide tests in a scratch copy (indexed at the end of the World3D section, as the index sits at its 1,500-token budget) |
| [two-colour-tints](render/two-colour-tints.txt) | NightWardens | 命中闪白、冰冻、灼烧、雷击定身都用材质的 `light` 和 `dark`，不另做帧；提交 `886c81c` | 同上 · the same |

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
| balance-from-runs | TaiwanMahjong | `TaiwanMahjong/tools/balance.mjs`：四家电脑整圈对打，比较难度（一高手对三入门、一入门对三普通）和三种性格 · whole rounds among four computer players, comparing levels and characters | 草稿，未提交引擎 · draft, not sent |
| save-update-callbacks | TaiwanMahjong | `TaiwanMahjong/src/main.mjs:607`、ENGINE-NOTES 6：表达式箭头的返回值被当成新存档，选择没存上 · an expression arrow's value taken as the new save | 草稿 · draft |
| sprite-swarm（本仓库草稿 · a draft here） | TaiwanMahjong | ENGINE-NOTES 5：两百五十个静止 Bitmap 也慢，静止的牌改画在页面 canvas · still Bitmaps too, moved to a page canvas | 草稿 · draft |
| still-background（本仓库草稿 · a draft here） | TaiwanMahjong | `TaiwanMahjong/src/felt.mjs:87`：牌河、副露、别家手牌画在引擎画布下，变化时重画 · rivers, melds and hands painted under the engine when they change | 草稿 · draft |
| balance-from-runs | NezhaSea | `NezhaSea/tools/balance.mjs`：电脑玩家用三种形态、三档海况各打 12 局，另有「不动」「不买」两种对照 · a bot plays three forms on three dangers, 12 games each, with two controls | 草稿，未提交引擎 · draft, not sent |
| play-page-controls（本仓库草稿 · a draft here） | NezhaSea | `NezhaSea/src/main.mjs:454`、ENGINE-NOTES 1：哪吒仍靠 `game.keys.axis()` 走，只在页面按钮上接住按键 · keys stopped only on page buttons, so play still steers | 草稿 · draft |
| still-background（本仓库草稿 · a draft here） | NezhaSea | `NezhaSea/src/ground.mjs:53`：剪纸海浪由页面画一次，放在透明画布下 · the paper-cut sea painted once under the clear canvas | 草稿 · draft |
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
| NezhaSea | 4（1 张新卡，3 条证据） | 都是草稿，还没提交引擎 · all drafts, not yet sent to the engine |
| TaiwanMahjong | 6（2 张新卡，4 条证据） | 都是草稿，还没提交引擎 · all drafts, not yet sent to the engine |
| FPS、jelly-pandas、Wulin、LanternShadows、LoveElective | 0 | 没有 ENGINE-NOTES 内容，也没有新的引擎相关修复提交；它们的经验已被引擎现有卡片引用（FPS 14 张、jelly-pandas 12 张、Wulin 5 张、LanternShadows 4 张、LoveElective 1 张） · no notes and no new engine-related fixes; already cited by the engine's cards |
| still-background（本仓库草稿 · a draft here） | NightWardens | `NightWardens/src/screens.mjs:55`、ENGINE-NOTES 2：路面是一张图，放在画布下面单独的 `#road` 上（画在 WebGL 画布元素自己的 CSS 背景图在无头 Chromium 里不显示），最忙时 p50 从 66.6 ms 降到 33.3 ms · the road picture on its own `#road` under the canvas (a background picture on the WebGL canvas element itself was not drawn), the busiest frame from p50 66.6 to 33.3 ms | 草稿 · draft |
| sprite-swarm（本仓库草稿 · a draft here） | NightWardens | `NightWardens/src/view/field.mjs:383`：同一图集的位图对象池，十几个邪祟加二十支符箭在 SwiftShader 下 p50 16.7 ms；每个邪祟多一张影子位图时是 33.3 ms，位图的个数就是代价 · pooled Bitmaps of one atlas at p50 16.7 ms with a dozen haunts and twenty bolts; a shadow bitmap per haunt made it 33.3 ms | 草稿 · draft |
| touch-controls | NightWardens | `NightWardens/src/screens.mjs:230`：`pointer.observe` 按触点的 session 记住拖动符弩的那根手指，另一根手指同时按天雷键 · the steering finger kept by its contact's session while another presses the thunder seal | 草稿，未提交引擎 · draft, not sent |
| balance-from-runs | NightWardens | `NightWardens/tools/balance.mjs:29`：`runHeadless` 让替身玩家按两种移动快慢把三夜各跑 12 个种子，结果写进 README · the stand-in at two speeds plays 12 seeds of each night | 草稿，未提交引擎 · draft, not sent |
| save-update-callbacks | NightWardens | `NightWardens/test/saves.test.mjs:88`：测试钉住「表达式箭头的 `update` 被拒、数据不变」 · a test pins the refusal of an expression arrow | 草稿，未提交引擎 · draft, not sent |
| choose-entry | NightWardens | `NightWardens/src/main.mjs:159`：`createBrowserGame` 的后端用 `auto`（有 WebGPU 适配器就用），`?backend=webgl2` 可指定 · `backend: 'auto'` with a `?backend=` override | 草稿，未提交引擎 · draft, not sent |

注意：本目录的新卡草稿若一次全部加进引擎索引，`guide/index.txt` 会超出它的 token 上限（五张一起时 1565 token），提交引擎时需要合并或精简索引行；分批放进去时每批都通过了 `tests/guide.test.mjs`。

Note: added to the engine's index all at once, the new drafts here push `guide/index.txt` past its token budget (1,565 tokens with five together), so sending them needs merged or shorter index lines; added in batches, each batch passed `tests/guide.test.mjs`.

收尾规则见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 6 节：以后每款游戏完成时产出 2–5 张草稿放在这里并登记。

The finishing rule is part 6 of the standard: each game, when finished, adds two to five drafts here and registers them.
