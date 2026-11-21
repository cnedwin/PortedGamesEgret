# 台灣十六張麻將 · Taiwan Sixteen-Tile Mahjong

## 简介 · Introduction

基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild) 独立开发的游戏 Demo：台湾十六张麻将，玩家和三位电脑牌友同桌。补花、吃碰槓、截胡、搶槓、流局连庄，按台湾常见的台数表算台，底加台结算。三位电脑牌友各有性格：阿德稳健，看到危险就收手；小美急攻，能吃就吃、能碰就碰；老陈爱做大牌，凑清一色、混一色和碰碰胡。牌友程度分入门、普通、高手；可以打一圈（东风圈）或一将（四圈）。界面用繁体中文，也有英文；键盘、触屏、鼠标都能玩，有听牌提示、托管、战绩和存档。

An independently developed game demo on [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild): Taiwanese
sixteen-tile mahjong, the player against three computer players. Flowers, chows, pongs and kongs, the nearest winner
on a discard, robbing a kong, the dealer keeping the deal, and payment by base plus tai on a common Taiwanese tai
table. The three computer players have characters of their own: steady Ah-De folds at the first danger, eager Mei
calls whatever helps, and Old Chen chases one-suit and all-pong hands. Opponents come at three levels, and a game is
the East round or a full four rounds. Traditional Chinese or English; keyboard, touch and mouse; ready hints,
auto-play, a record and a save.

[在线试玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/TaiwanMahjong/)

## 玩法与操作 · How to play

**目标 · Goal**：五组面子加一对眼就胡。一圈或一将打完，按分数排名；战绩里记打过几将、几次第一、胡几把、自摸、放槍、最大一把几台和最好的一将。 · Five sets and a pair win. At the end of the round or the game the four are ranked; the record keeps games, firsts, wins, self-draws, deal-ins, the biggest hand and the best game.

**一局 · A hand**：每人 16 张，庄家 17 张先打。摸到花牌自动补花。轮到你时点一张牌把它抬起，再点一次（或按「打出」）打出去。别家打出你能吃、碰、槓或胡的牌时，下方会出现按钮；吃有几种组合时会让你选。自摸和暗槓、加槓的按钮在轮到你时出现。 · Sixteen tiles each, the dealer seventeen and first to discard. Flowers are replaced by themselves. On your turn tap a tile to raise it and tap it again (or press Discard). When another's discard can be chowed, ponged, konged or won, buttons appear; a chow with several ways asks which. Self-draw and concealed or added kongs show on your turn.

**听牌提示 · Ready hints**（设置里可关 · can be turned off）：打哪张能听牌，那张牌底下有金点；选中它时写出会听哪些牌、各还剩几张。已经听牌时一直显示在听的牌。 · A gold dot under each tile whose discard leaves you ready; choosing it shows the waits and how many of each are unseen. When ready, the waits stay shown.

| | 键盘 · Keyboard | 触屏、鼠标 · Touch, mouse |
|---|---|---|
| 选牌、打牌 · Choose, discard | Tab 或 ←→ 移到牌上，Enter 或 Space 选中、再按一次打出 · Tab or ←→ to a tile, Enter or Space to choose, again to discard | 点一下抬起，再点一下打出 · tap to raise, tap again to discard |
| 胡 · Win | H | 「胡」「自摸」· Win, Self-draw |
| 碰、槓、吃 · Pong, kong, chow | P、K、C | 按钮 · buttons |
| 过 · Pass | X、Esc | 「過」· Pass |
| 暂停 · Pause | Esc（没有吃碰可选时也可按 P）· Esc (or P when no pong is offered) | 「暫停」· Pause |
| 托管 · Auto-play | Tab 到「託管」· Tab to Auto | 「託管」· Auto |

横屏时牌桌按屏幕等比放大；竖着拿手机时整张牌桌转 90°，和横屏一样大，把手机横过来就摆正了。切到别的标签页时打开暂停菜单。 · The table scales to the screen; on an upright phone it turns a quarter to stay as large, and turning the phone sets it straight. Switching tabs opens the pause menu.

**设置 · Settings**：音效、配乐、出牌速度（从容、轻快）、听牌提示、减弱动画（系统设了「减少动态效果」时自动减弱）、中英文。 · Sound, music, pace (easy or brisk), ready hints, reduced motion (on when the system asks for it), and the language.

## 规则与台数 · Rules and tai

一副 144 张：萬筒條各 36 张、字牌 28 张、花 8 张。牌尾留 16 张不摸，每开一槓多留一张；摸完没人胡算流局，庄家连庄。只有下家能吃；碰、槓谁打的都行；同一张牌几家能胡时，照出牌顺序离放槍者最近的一家胡（截胡）。放槍由放槍者一家付，自摸三家各付；每把付 300 底加台数 × 100。庄家胡或付钱时另加庄家 1 台，连庄每次再加 2 台（连一拉一）。本作没有天听、地听、嚦咕嚦咕、过水限制。

A set of 144: 36 each of characters, dots and bamboo, 28 honours, 8 flowers. The last 16 tiles are never drawn, one
more for each kong; an exhausted wall is a drawn hand and the dealer keeps the deal. Only the next seat may chow; any
seat may pong or kong; when several could win on one discard, the nearest after the discarder takes it. A discard
win is paid by the discarder alone, a self-draw by all three; each payment is 300 base plus tai × 100. When the dealer
wins or pays, add 1 tai for the dealer and 2 for each hand it has kept the deal. Not in this game: ready-on-the-deal,
the seven pairs hand, the passed-tile rule.

| 台 · Tai | 牌型 · Hands |
|---|---|
| 16 | 天胡、地胡、人胡（单独计，只另加花）、大四喜 · heavenly, earthly, human (alone, with flowers only), big four winds |
| 8 | 八仙过海、七抢一、小四喜、大三元、字一色、清一色、五暗刻 · eight flowers, seven rob one, small four winds, big three dragons, all honours, pure one suit, five hidden pongs |
| 5 | 四暗刻 · four hidden pongs |
| 4 | 小三元、混一色、碰碰胡 · small three dragons, mixed one suit, all pongs |
| 3 | 门清一摸三（门清、自摸、不求合计）· concealed self-draw |
| 2 | 平胡、全求人、三暗刻、花槓 · plain hand, all called on a discard, three hidden pongs, a flower set |
| 1 | 门清、自摸、半求人、独听、三元牌（每组）、门风、圈风、正花（每张）、海底捞月、河底捞鱼、槓上开花、抢槓 · concealed, self-drawn, all called self-drawn, single wait, each dragon pong, seat wind, round wind, each own flower, last tile, last discard, a win on a replacement, robbing a kong |

规则在 `src/sim`（`hand.mjs` 向听数和拆牌、`game.mjs` 对局、`score.mjs` 台数），不碰页面和引擎，`test/rules.test.mjs` 用固定的牌型逐类核对台数。 · The rules live in `src/sim`, free of the page and the engine, and `test/rules.test.mjs` checks each kind of tai on set hands.

## 电脑牌友 · The computer players

打哪张看向听数和有效牌（还没见到、能让向听数下降的牌有几张），再按性格加减：稳健的人在别家看起来快听牌时打安全牌（三张已现的字牌、别家打过的牌、幺九牌）；急攻的人只要能让牌变快就吃碰；爱做大牌的人在一门花色加字牌够多时专做混一色或清一色，对子多时专做碰碰胡，别家快听而自己还远时放弃。入门会随手打错（四分之一的牌不是最好的那张）、几乎不防守；高手防守更重。

A discard is chosen by shanten and by how many unseen tiles would lower it, then shaded by character: the steady one
plays safe once another seat looks ready (an honour with three showing, a tile that seat discarded, a terminal); the
eager one calls whenever it speeds the hand; the grand one goes for one suit when enough of its tiles fit, for all
pongs with many pairs, and gives it up when another seat looks ready and its own hand is far. Beginners slip (a
quarter of their discards are not the best) and hardly defend; experts defend harder.

`node tools/balance.mjs 60` 让电脑整圈对打。2026-11-21 在 Node 22 里各 60 圈：一位高手对三位入门，高手平均每圈 +732 分，入门平均 −244；一位入门对三位普通，入门 −403，普通平均 +134，三位普通各自都比入门高。同为普通时：小美每局吃碰 1.6 次、阿德 0.9 次、老陈 1.3 次；阿德门清胡最多；老陈的胡牌里 6–13% 是清一色、混一色或碰碰胡，平均台数最高（2.0），但放槍也最多，分数最低。流局率 16–22%，平均每圈 6–7 局。 · `node tools/balance.mjs 60` has the computer play whole rounds. On 2026-11-21, 60 rounds each: one expert against three beginners averaged +732 a round to their −244; one beginner against three regulars averaged −403 to their +134, below each of them. At one level: Mei calls 1.6 times a hand, Ah-De 0.9 and Old Chen 1.3; Ah-De wins concealed most; 6–13% of Old Chen's wins are one-suit or all-pong hands, with the most tai a win (2.0), though he deals in most and scores lowest. 16–22% of hands are drawn; a round runs 6–7 hands.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `play`（`@egret/engine/play`） | 透明画布、帧循环、暂停；宽屏和竖屏各开一种 · the clear canvas, the loop and pause; made wide or tall | `src/main.mjs` |
| `game.browser.textureFromCanvas` + `Bitmap.sourceRect` | 42 种牌面画在一张图集上，手牌和飞行的牌各取一块 · one atlas of 42 faces, each hand or flying tile a rectangle of it | `src/view.mjs`, `src/tiles.mjs` |
| `game.tween`（缓动 · easing `cubicOut`、`backOut`） | 牌打出、摸进的飞行，选中时抬起，吃碰胡的大字弹出 · tiles flying, rising when chosen, the call words popping | `src/view.mjs` |
| `game.text`、`game.burst`、`game.flash`、`game.shake` | 吃、碰、槓、胡、补花的大字和火花；胡牌时闪光和震动 · the words and sparks of calls and wins; flash and shake on a win | `src/view.mjs` |
| `game.rect`、`game.sprite` | 听牌提示的金点；分层的容器 · the gold ready dots; the layers | `src/view.mjs` |
| `game.sfx.define` / `play` | 落牌、摸牌、吃碰、槓、胡、补花和按钮声，全部合成 · every sound synthesised | `src/sound.mjs` |
| `game.music` | 从容的配乐，胡牌时换成欢庆的一段 · calm music, triumphant after a win | `src/sound.mjs` |
| `game.pause`、`resume`、`reducedMotion` | 暂停菜单；减弱动画 · the pause menu; reduced motion | `src/main.mjs` |
| `createTextTable` + `pickLanguage` | 繁体中文和英文文字表，开局按浏览器语言 · the words, by the browser's language | `src/i18n.mjs` |
| `createSaveStore` + `browserSaveStorage` | 设置、上次的选择和战绩；坏档另存后重开 · settings, the last setup and the record; a broken save set aside | `src/saves.mjs` |

## 已验证 · Verified

- `node --test test/*.test.mjs`（Node 22，29 项全部通过）：向听数、听牌和拆牌；台数表的每一类（平胡、门清一摸三、独听、暗刻是否算、碰碰胡、清混字一色、大小三元和四喜、全求半求、正花和花槓、海底河底槓上开花抢槓、天地人胡）；只有下家能吃、碰优先于吃、截胡、抢槓、补花从牌尾、流局连庄、换庄、一将打满四圈；每把收支和为零；存档（新档、写入再读、坏档、版本过新、不合法的设置、存储拒绝写入、战绩怎么记）；文字（两种语言齐全、占位符一致、42 种牌和每类台都有名字、英文里没有中文、界面代码不写死中文）；引擎副本的 import map 和规则不碰页面。 · All 29 Node tests pass.
- `node test/accept.mjs`（无头 Chromium 153，SwiftShader，1280×720）：标题第一个按钮有焦点；Tab 和 Enter、Space 选一将、高手再改回东风圈并存档；设置里关音效存档、Esc 关闭后焦点回去；规则面板列出台数和截胡；切英文后标题按钮全是英文、再切回；Enter 开局后用真按键 Enter 选中一张牌（它被抬起）、再按 Enter 打进牌河，轮到吃碰时按 Esc 过；暂停后 1.5 秒内牌局没有任何事件、Esc 继续；托管打到一局结算（收支和为零、有台数或流局）、战绩记下一局；托管打完一圈看到四家排名、战绩记下一将；回首页；坏档提示。标题和规则两张截图基线一致，控制台没有错误。 · The whole walk in headless Chromium, two baselines matching and a clean console.
- `node ../tools/quality.mjs TaiwanMahjong`：自动项全部达标，见 [QUALITY.md](QUALITY.md)。另外量了牌局中：轮到玩家时和托管打到一局中段，帧时间 p95 都是 16.8 ms（无头、软件渲染）。 · Every automatic item passes; in play, 16.8 ms p95 both waiting on the player and mid-hand.
- 竖屏（390×844）截图检查过：牌桌转 90° 后和横屏一样大，手牌由竖着开的引擎画出。 · Checked in a 390 × 844 screenshot: the table turned and as large as when wide.

## 已知问题 · Known issues

- 没有在真机上运行过：手机和带显卡桌面上的触屏手感、帧时间、声音都「未运行」。 · Not run on a real device.
- 手机横屏（高 390 像素）时一张手牌约 35×52 CSS 像素，比 44 像素的触控建议窄；十七张牌要排在一行里，宽不了更多。 · On a phone held sideways (390 px tall) a hand tile is about 35 × 52 CSS px, narrower than the 44 px advice; seventeen tiles must fit one row.
- 像素比 1 的屏幕上，手牌（引擎画，四分之三分辨率）比桌上静止的牌（页面画，全分辨率）稍软（ENGINE-NOTES 3）。 · On a ratio-1 screen the hand, drawn by the engine at three-quarter resolution, is slightly softer than the still tiles (item 3).
- 屏幕方向一变就重开引擎，正在飞的那张牌会直接落到位，配乐从头开始（ENGINE-NOTES 4）。 · Turning the screen makes the engine again: a tile in flight lands at once and the music starts over (item 4).
- 台数表是台湾常见的一种，各地牌桌的规矩不尽相同（例如天地人胡的台数、花槓算法）；没有天听、地听、嚦咕嚦咕和过水。 · The tai table is one common Taiwanese table; tables differ, and some hands are left out.
- 电脑牌友不读别家的牌河推理听什么，防守只看危险程度的粗略估计；老陈为做大牌放槍偏多。 · The computer players do not read rivers for waits; defence is a rough danger estimate, and Old Chen deals in more for his big hands.
- 读屏只在无头 Chromium 的无障碍树里查过名字。 · Screen-reader names were checked only in headless Chromium's accessibility tree.

## 已解决 · Solved

- 页面按钮上的 Tab 和 Space 失灵（ENGINE-NOTES 1）：捕获阶段接住所有按键、自己处理。 · Tab and Space on the page's buttons (item 1): every key caught first.
- 透明画布下面是黑的（ENGINE-NOTES 2）：开局后把 `play` 的盒子改成透明。 · The black holder (item 2), made clear.
- 1280×720 的引擎画布帧时间 p95 33 ms（ENGINE-NOTES 3）：引擎开成 960×540、根节点缩放 0.75，标题和牌局都回到 16.8 ms。 · 33 ms p95 from a 1280 × 720 engine canvas (item 3): the engine at 960 × 540 with its root scaled, 16.8 ms.
- 竖屏转牌桌时引擎拒绝启动（ENGINE-NOTES 4）：拆成三层，引擎竖着开、自己转。 · The engine refusing a turned table (item 4): three layers, the engine made tall and turning itself.
- 两百多张静止的牌做成 Bitmap 太慢（ENGINE-NOTES 5）：静止的牌画在页面 canvas 上，只在变化时重画。 · Two hundred still Bitmaps too slow (item 5): still tiles painted on a page canvas when they change.
- 选圈数和难度没存上（ENGINE-NOTES 6）：`update` 的回调返回了赋值的结果，被当成新存档；改成不返回值。 · The setup not saved (item 6): the update callback returned its assignment; now it returns nothing.
- 结算时牌桌上已经显示下一局的庄家和门风：每局开始时把庄家、圈风、连庄记在这一局里，显示都读这一局的。 · The result showed the next hand's dealer: each hand now keeps its own dealer, wind and streak for display.
- 老陈的「爱做大牌」起初没有效果（清一色、碰碰胡 0%）：改成凑够一门就专做，别家快听时放弃。 · Old Chen's big hands at first never came (0%); he now commits when enough tiles fit and gives up under threat.

## 未完成 · Unfinished

- 真机验收（触屏、帧时间、声音）。 · Checks on real devices.
- 牌河推理（别家可能在听什么）和更细的防守。 · Reading rivers for waits, and finer defence.
- 可选的规则：天听、地听、嚦咕嚦咕、过水、不同的台数表。 · Optional rules and other tai tables.
- 牌局回放和每一手的复盘。 · Replays and a review of each hand.

## 目录结构 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `index.html`, `style.css` | 页面、import map、三层牌桌、名牌、按钮和各面板 · the page, the three layers, plates, buttons and panels |
| `src/main.mjs` | 入口：存档、语言、引擎（宽或竖）、牌局流程、玩家操作、面板 · the entry |
| `src/tiles.mjs` | 牌面图集（2D canvas 画） · the tile atlas |
| `src/layout.mjs` | 桌上每张牌的位置和方向 · where each tile sits |
| `src/felt.mjs` | 静止的牌桌（页面 canvas） · the still table |
| `src/view.mjs` | 引擎画的手牌、飞行的牌、大字和火花 · the engine's part |
| `src/sound.mjs` | 合成音效和配乐 · sound |
| `src/sim/hand.mjs`, `game.mjs`, `score.mjs` | 向听数、对局规则、台数 · shanten, the game, tai |
| `src/sim/bot.mjs`, `tools/balance.mjs` | 电脑牌友和对局统计 · the computer players and their numbers |
| `src/i18n.mjs`, `src/saves.mjs` | 文字表、存档 · the words, the save |
| `test/` | Node 测试、浏览器验收和截图基线 · tests, acceptance and baselines |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `b5628eb9997b67cf6163a388f5aa06f321f3833a`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。用到的入口：`@egret/engine`、`@egret/engine/play`、`@egret/engine/kit`、`@egret/engine/web/kit`。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit
`b5628eb9997b67cf6163a388f5aa06f321f3833a`, copied by the engine's `tools/vendor-game.mjs`; see
[vendor/SOURCE.md](vendor/SOURCE.md). Entries used: `@egret/engine`, `@egret/engine/play`, `@egret/engine/kit` and
`@egret/engine/web/kit`.

```sh
node tools/vendor-game.mjs <this folder> @egret/engine @egret/engine/play @egret/engine/kit @egret/engine/web/kit
```
