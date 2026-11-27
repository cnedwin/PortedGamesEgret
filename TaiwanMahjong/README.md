# 島夜雀室 · Island Night Mahjong

## 简介 · Introduction

《島夜雀室》是一款使用[新白鷺引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild) 開發的台灣十六張麻將 Demo。雨夜裡，阿德、小美和老陳等你一起打牌。阿德看牌河、重防守，小美看準時機就吃碰，老陳偏好清一色、混一色與碰碰胡。可打東風圈或一將，支援台灣繁體中文與英文、鍵盤、滑鼠及觸控。

An independently developed game demo on [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild): Taiwanese
sixteen-tile mahjong, the player against three computer players. Flowers, chows, pongs and kongs, the nearest winner
on a discard, robbing a kong, the dealer keeping the deal, and payment by base plus tai on a common Taiwanese tai
table. The three computer players have characters of their own: steady Ah-De folds at the first danger, eager Mei
calls whatever helps, and Old Chen chases one-suit and all-pong hands. Opponents come at three levels, and a game is
the East round or a full four rounds. Traditional Chinese or English; keyboard, touch and mouse; ready hints,
auto-play, a record and a save.

[線上試玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/TaiwanMahjong/)

## 美術與聲音 · Art and sound

封面以台灣雨夜巷弄與鐵窗花為背景。封面、頭像和牌桌上的小立繪是為本 Demo 製作的原創生成插畫，分別收在 `assets/rain-room.webp`、`opponents.webp` 與 `seat-portraits.webp`。牌面圖集描出象牙白釉面、倒角、刻紋與深青牌底。吃、碰、槓、胡和自摸各有不同的印章、光紋和粒子。

大廳、對局和結算各有一首以同一主題改編的原創配樂，以電鋼琴、撥弦、刷鼓和細雨聲營造夜間牌室的氛圍。三首 MP3 收在 `assets/audio/`，可用 `node tools/compose-score.mjs` 搭配 FFmpeg 重建。摸牌、落牌、吃、碰、槓、補花、胡牌與自摸等音效由白鷺合成，配樂與音效可分開關閉。

三位牌友各有開局招呼、牌局短句和吃、碰、槓、胡、自摸的台灣國語。語音由 [PrimeTTS v2.1](https://huggingface.co/Luigi/PrimeTTS/tree/main/v21_mbistft_16k) 合成，讀音使用 [PrismVoice-TW](https://huggingface.co/PrismLive/PrismVoice-TW) 的注音詞典與麻將讀音校訂。21 段預錄音訊打包在 `assets/audio/voices.json`，用 `tools/compose-voices.py` 製作。遊玩時直接播放內建音訊。語音、音效與配樂各有獨立開關。

The cover, headshots and table portraits are original generated illustrations. The hand uses a drawn tile atlas with glazed ivory faces and jade backs. Three original scores and 21 bundled Taiwan Mandarin clips accompany the game. Music, effects and speech can be muted independently.

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

橫放手機時牌桌置中、兩側延伸絨布，手牌善用安全區寬度。直放小手機時牌桌轉 90° 橫著打，標題、規則與設定則正向閱讀；平板直放時整桌保持正向，上下顯示座位資料及工具。轉向不中斷對局、動畫或語音。切到其他分頁時開啟暫停選單。 · The table is centred on wide phones with extra baize and a wider usable hand. On upright small phones the table turns a quarter while menus read upright; upright tablets keep the table straight with information and tools above and below. Resizing keeps the match, motion and audio alive. Switching tabs opens the pause menu.

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
| `play`（`@egret/engine/play`）、`pixelRatio` | 透明畫布、按需畫面、單一實例，1280×720 原生設計單位，獨立渲染密度預算 · clear canvas, on-demand rendering, one instance and independent raster budget at the native 1280×720 design | [src/main.mjs](src/main.mjs), [src/layout.mjs](src/layout.mjs) |
| `fit: 'expand'`、`planScreen`（`@egret/engine/web/screen`） | 牌桌完整、畫布填滿視口、寬手機延伸絨布；只用原生 screen plan 選擇初始像素密度 · entire design stays visible, canvas fills the viewport, extra baize, initial density derives from the engine plan | [src/main.mjs](src/main.mjs), [src/felt.mjs](src/felt.mjs) |
| `portrait`、`arrange`、`game.screen`、`game.safe`、`game.toStage` / `fromStage` | 窄手機轉桌、平板直放不轉、靜態頁面 canvas 與原生牌張共用幾何，轉向不重建 play · quarter-turned phone table, upright tablet, static canvas and native tiles share engine geometry without rebuilding play | [src/layout.mjs](src/layout.mjs), [src/main.mjs](src/main.mjs), [src/felt.mjs](src/felt.mjs), [src/view.mjs](src/view.mjs) |
| `game.pin` | 座位牌及平板局數資訊以實際安全區定位 · seat plates and tablet round information are pinned to the actual safe area | [src/hud.mjs](src/hud.mjs) |
| `game.show` 的 `tablet` / `tabletPortrait` / `portrait`（`@egret/engine/web/view`） | 手機、桌面及平板採用獨立原生部件，保留具名焦點及捲動 · separate native layouts for phones, desktop and tablets, keeping named focus and scroll | [src/ui.mjs](src/ui.mjs), [src/screens.mjs](src/screens.mjs), [src/round-ui.mjs](src/round-ui.mjs) |
| `verify --screens` | 8 種視口的引擎檢查，另由真實輸入測試叫牌、出牌、選吃及結算 · native eight-screen verification supplemented with real-input call, discard, chow and settlement states | [test/screens.mjs](test/screens.mjs) |
| `game.browser.textureFromCanvas` + `Bitmap.sourceRect` | 42 种牌面画在一张图集上，手牌和飞行的牌各取一块 · one atlas of 42 faces, each hand or flying tile a rectangle of it | `src/view.mjs`, `src/tiles.mjs` |
| `game.tween`（缓动 · easing `cubicOut`、`backOut`） | 牌打出、摸进的飞行，选中时抬起，吃碰胡的大字弹出 · tiles flying, rising when chosen, the call words popping | `src/view.mjs` |
| `game.text`、`game.burst`、`Graphics` | 吃、碰、槓、胡、自摸的印章、震圈、牌形與粒子 · call stamps, impact rings, tile silhouettes and particles | `src/view.mjs` |
| `game.rect`、`game.sprite` | 听牌提示的金点；分层的容器 · the gold ready dots; the layers | `src/view.mjs` |
| `game.sfx.define` / `play` | 合成落牌、摸牌、吃、碰、槓、胡及補花等音效，依座位區分左右聲道 · synthesized table sounds with seat-based stereo placement | `src/sound.mjs` |
| `game.pause`、`resume`、`reducedMotion` | 暂停菜单；减弱动画 · the pause menu; reduced motion | `src/main.mjs` |
| `game.show`、原生視圖綁定、`initialFocus`、`view.focus`、`view.focused`、`view.scroll` | 標題、規則、設定、戰績、暫停、牌局按鈕、吃牌組合與結算；由引擎管理焦點、彈窗關閉復位與旋轉列表捲動 · declaration, binding, named focus and viewport-local scrolling in the title, rules, settings, records, pause, calls, chow choices and settlements | `src/ui.mjs`, `src/screens.mjs`, `src/round-ui.mjs` |
| `createUiSemantics` + `createBrowserSemantics` | 畫布控件的名稱、角色、選取狀態與引擎原生焦點；瀏覽器語意樹同步 · names, roles and selection states, with native focus projected into the browser semantic tree | `src/ui.mjs`, `src/main.mjs` |
| `createTextTable` + `pickLanguage` | 繁体中文和英文文字表，开局按浏览器语言 · the words, by the browser's language | `src/i18n.mjs` |
| `createSaveStore` + `browserSaveStorage` | 设置、上次的选择和战绩；坏档另存后重开 · settings, the last setup and the record; a broken save set aside | `src/saves.mjs` |


選用 `expand`：`contain` 會留黑邊；`fixedWidth` 在極寬手機會截去上下牌桌，`fixedHeight` 在 4:3 平板可能裁掉左右，`fixedWide` 會裁去一軸；`fixedNarrow` 相當於 `expand`，因此選語意更清楚的後者。非像素風，不使用 `wholeScale`。

`expand` keeps the entire table. `contain` leaves bars, `fixedWidth` can crop the top or bottom on wide phones, `fixedHeight` can crop the sides on 4:3 tablets, and `fixedWide` can crop one axis. `fixedNarrow` is equivalent to expand. No wholeScale (not pixel art). Global `uiScale` is intentionally off: table-aligned hit regions must share the tiles’ transform; see ENGINE-NOTES 9.

## 已验证 · Verified

- `node --test test/*.test.mjs` 通過 34 項（含原生設計密度、安全區與手牌幾何），規則、台數、存檔和雙語詞表不變。 · 34 Node tests cover native density and safe hand geometry, with unchanged rules, tai, saves and localization.
- `node test/accept.mjs` 69/69 通過，涵蓋原生控件的键盘和语义树、横竖屏触控、吃牌有多个组合、碰、槓、荣和、自摸、暂停、四家结算和战绩。标题和规则有截图基线。 · All 69 browser assertions passed, covering native keyboard controls and semantics, touch in both orientations, multiple chow options, pong, kong, discard win, self-draw, pause, settlement, and records, with title and rules screenshot baselines.
- 本輪原生螢幕檢查：`node vendor/egret.mjs verify --screens` 標題八種 0 錯誤；`node test/screens.mjs --mode screens` 七種狀態、八個 profile 共 56/56 無錯誤，所有殘留 touchTarget 警告已於 QUALITY 逐類記錄。 · Native verification: eight clean CLI title screens; 56 state/profile combinations through the native checker with no errors. Remaining target-size warnings are documented.
- `node test/screens.mjs --mode rounds` 六種指定尺寸合法打完整一局、碰／槓／兩組吃牌候選／自摸、轉向、暫停、語音／飛牌及戰績讀回。Windows RTX 5090 Laptop 硬體 WebGPU 完整一局 11/11、Fold7 外螢幕實機橫直轉向 10/10；折疊內螢幕為模擬，不能視為真機驗收。 · Six full legal hands via browser inputs, with claims, rotation, pause, voice/tile continuity and persisted records. The physical Windows WebGPU hand passed 11/11 and physical Fold7 external-display rotation passed 10/10; the unfolded profile is emulated.
- 真机对局、帧时间、断网插画恢复及自动检查的限制见 [QUALITY.md](QUALITY.md)。新版驗收腳本另包含原生彈窗焦點、巢狀選單語言切換、兩次 Enter 出牌及 0°／90° 捲動位移檢查。 · See [QUALITY.md](QUALITY.md) for device play, frame timings, recovery from missing title art, and automated check limits. The updated acceptance script additionally checks native modal focus, nested language changes, two-press discard and 0°/90° scroll displacement.

## 已知问题 · Known issues

- 裝置上的音效驗證涵蓋播放事件、聲音訊號和設定。仍待使用手機喇叭實聽整局的混音。 · Device checks covered playback, signal and settings. The complete mix through phone speakers still needs a listening pass.
- 寬手機的手牌使用安全區長度；852×393 的模擬劉海僅留下 734 CSS 像素，17 張各 44 像素至少需 748，故最滿手牌無法全達 44，但不重疊。 · A simulated notch leaves 734 CSS px at 852×393; seventeen disjoint 44 px targets need at least 748 px, so the full hand cannot quite meet the recommendation. See QUALITY.md for measurements.
- 渲染密度與設計座標分離，初始依原生 screen plan 與 DPR 選擇；緊湊螢幕使用獨立光柵預算。極高密度螢幕可能仍需放大，且 play 尚無執行時 pixelRatio 設定器。 · Initial render density follows the native screen plan and device ratio, with a compact-screen raster budget. Very dense screens may still upscale; play has no runtime density setter.
- 全域 uiScale 暫不啟用：手牌的原生語意與鍵盤焦點不能為了介面放大而犧牲。瀏覽器語意投影目前需在 stage frame 尺寸變動時重接；原語意樹及焦點不重建。 · Global uiScale stays off to preserve hand alignment and keyboard/semantic focus. The browser semantics projection is reattached when frame extent changes; the semantic tree and focus stay alive. See ENGINE-NOTES 9–10.
- 台数表是台湾常见的一种，各地牌桌的规矩不尽相同（例如天地人胡的台数、花槓算法）；没有天听、地听、嚦咕嚦咕和过水。 · The tai table is one common Taiwanese table; tables differ, and some hands are left out.
- 电脑牌友不读别家的牌河推理听什么，防守只看危险程度的粗略估计；老陈为做大牌放槍偏多。 · The computer players do not read rivers for waits; defence is a rough danger estimate, and Old Chen deals in more for his big hands.
- 已在 Chromium 中检查语义树。真实读屏播报仍待验证。 · The semantic tree was checked in Chromium. Actual screen-reader speech is pending.

- 暫停時 world 的 expand 偏移可能滯後；牌桌不使用相機，故採原生固定舞台 UI 層，詳見 ENGINE-NOTES 11。 · A paused world can retain its prior expand offset; the stage-fixed table uses native ui instead (ENGINE-NOTES 11).

- 多螢幕 CLI 目前只檢查啟動狀態；牌局及選單狀態使用相同 checker 由測試腳本操作（ENGINE-NOTES 12）。 · Multi-screen CLI checks launch only; browser test actions supplement it with the same checker (ENGINE-NOTES 12).

## 已解决 · Solved

- 牌局按鈕使用白鷺原生視圖與語意樹。引擎 #488 新增具名彈窗初始焦點、原生焦點查詢與設定；標題、吃牌組合、結算及巢狀暫停選單不再另設焦點控制器。Tab、Enter 和 Space 的一般介面操作交由引擎接管。 · Native views expose control names and keyboard activation. Engine #488 supplies named initial modal focus and native focus access; the Demo removes its separate focus controller.
- 透明画布与静止牌桌分层合成。暂停、规则与结算在引擎中统一处理前景遮罩。 · The clear canvas combines with the static table, while the engine draws the pause, rules and result scrims.
- 移除 0.75 中間舞台倍率與 CSS 手寫 fit。`play` 的 expand、portrait、arrange 負責畫布適配；桌面採用原本完整 1280×720，直向畫面只移動牌桌專屬根節點。 · Removed the 0.75 intermediary and handwritten CSS fit. Native expand, portrait and arrange own the canvas; only the board-specific roots move or turn.
- 轉向不銷毀 play、對局、場景或語意樹。直立手機的牌桌轉 90°、選單正向閱讀，平板保持正向；規則及結算使用原生捲動。 · Rotation retains game, match, scene and semantics; a phone turns only the game table, upright menus and tablets use native scrolling and layouts.
- 两百多张静止的牌做成 Bitmap 太慢（ENGINE-NOTES 5）：静止的牌画在页面 canvas 上，只在变化时重画。 · Two hundred still Bitmaps too slow (item 5): still tiles painted on a page canvas when they change.
- 选圈数和难度没存上（ENGINE-NOTES 6）：`update` 的回调返回了赋值的结果，被当成新存档；改成不返回值。 · The setup not saved (item 6): the update callback returned its assignment; now it returns nothing.
- 结算时牌桌上已经显示下一局的庄家和门风：每局开始时把庄家、圈风、连庄记在这一局里，显示都读这一局的。 · The result showed the next hand's dealer: each hand now keeps its own dealer, wind and streak for display.
- 老陈的「爱做大牌」起初没有效果（清一色、碰碰胡 0%）：改成凑够一门就专做，别家快听时放弃。 · Old Chen's big hands at first never came (0%); he now commits when enough tiles fit and gives up under threat.

## 未完成 · Unfinished

- Fold7 實體內螢幕橫直、實體平板、真實瀏海、Safari／Firefox／微信、真人讀屏、手柄及未輔助手指操作仍待驗收；手機喇叭實聽、低階手機幀率也未完成。 · Physical unfolded Fold7, tablets, real cutouts, Safari/Firefox/WeChat, live screen readers, controllers and unaided finger input remain untested, as do phone speaker listening and lower-end frame pacing.
- 牌河推理（别家可能在听什么）和更细的防守。 · Reading rivers for waits, and finer defence.
- 可选的规则：天听、地听、嚦咕嚦咕、过水、不同的台数表。 · Optional rules and other tai tables.
- 牌局回放和每一手的复盘。 · Replays and a review of each hand.

## 目录结构 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `index.html`, `style.css` | 頁面、import map、靜態底圖與載入狀態 · page shell, import map, static table canvas and loading state |
| `src/main.mjs` | 引擎启动、牌局流程、输入和存档 · engine startup, round flow, input and saves |
| `src/screens.mjs`, `src/round-ui.mjs` | 大厅与牌局的白鹭原生界面 · native Egret lobby and game views |
| `src/ui.mjs` | 設計座標、客製裝飾、原生視圖綁定與語意角色；焦點和捲動交由引擎 · design coordinates, decoration, native view binding and semantic roles; focus and scrolling are owned by the engine |
| `src/tiles.mjs` | 牌面图集（2D canvas 画） · the tile atlas |
| `src/layout.mjs` | 桌上每張牌的位置、方向及自適應像素密度 · where each tile sits and adaptive render density |
| `src/felt.mjs` | 靜止的牌桌（頁面 canvas）及引擎座標投影 · still table and projection from engine geometry |
| `src/hud.mjs` | 原生座位牌、中框、聽牌提示、安全區 pins · native seats, centre, hints and safe-area pins |
| `src/view.mjs` | 引擎画的手牌、飞行的牌、大字和火花 · the engine's part |
| `src/sound.mjs`, `src/voice.mjs`, `assets/audio/` | 音效合成、配樂、牌友語音與獨立靜音 · synthesized effects, music, table voices and independent mute |
| `src/sim/hand.mjs`, `game.mjs`, `score.mjs` | 向听数、对局规则、台数 · shanten, the game, tai |
| `src/sim/bot.mjs`, `tools/balance.mjs` | 电脑牌友和对局统计 · the computer players and their numbers |
| `src/i18n.mjs`, `src/saves.mjs` | 文字表、存档 · the words, the save |
| `test/` | Node 测试、浏览器验收和截图基线 · tests, acceptance and baselines |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `13d70b73904266c11b23de4c09c239240a7162db`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。用到的入口见下方命令。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit
`13d70b73904266c11b23de4c09c239240a7162db`, copied by the engine's `tools/vendor-game.mjs`; see
[vendor/SOURCE.md](vendor/SOURCE.md) and the entries below.

```sh
node tools/vendor-game.mjs <this folder> @egret/engine @egret/engine/play @egret/engine/kit @egret/engine/web/kit @egret/engine/ui @egret/engine/ui/semantics @egret/engine/ui/testing @egret/engine/web/semantics @egret/engine/web/screen @egret/engine/web/view
```
