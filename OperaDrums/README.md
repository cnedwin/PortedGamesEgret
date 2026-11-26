# 锣鼓经 · Opera Drums

## 简介 · Introduction

《锣鼓经》是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的京剧节奏游戏 Demo。选一出戏和难度，按板开锣。红方印敲鼓，金菱形敲锣，敲击时机看左侧金线。《起霸》《趟马》《急急风》各有三档难度、原创戏画和独立编配。

Opera Drums is a Peking opera rhythm game demo made independently with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). Choose an act and a difficulty. Strike the drum for vermilion seals and the gongs for gold diamonds as they reach the timing line. The General Arms, Riding Through and Swift Wind each have three difficulties, original portraits and their own arrangements.

[在线试玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/OperaDrums/)

## 玩法与操作 · How to play

**目标 · Goal**：跟着伴奏，在每个音符到达左侧金线时敲对的那一种。曲终时「彩」槽过了金线就算过关（易 60、中和难 70）；一个「失」也没有是「全连」，全部是「好」是「满堂彩」。每首曲子每个难度记最好的一次（先比名次，同名次比分数）。 · Strike the right kind as each note reaches the gold timing line. A song is cleared with the cheer gauge past the gold line at the end (60 on easy, 70 otherwise); no miss is a full combo, every stroke "Bravo" a full house. The best run of each song on each difficulty is kept (rank first, then score).

**音符 · Notes**

| 音符 · Note | 谱字 · Syllables | 怎么敲 · How |
|---|---|---|
| 红色方印 · Red square | 八、大 · ba, da（单皮鼓 · the drum） | 敲鼓 · the drum |
| 金色菱形 · Gold diamond | 才、台、令 · cai, tai, ling（铙钹、小锣 · cymbals, small gong） | 敲锣 · the gongs |
| 大金菱形 · Big gold diamond | 仓 · cang（大锣与铙钹齐响 · big gong with cymbals） | 敲锣；两只手在 50 毫秒内一起敲，得分加倍 · the gongs; both hands within 50 ms for double points |
| 金色长条 · Gold bar | 嘟 · du（滚奏 · a roll） | 条上一直敲，每下 100 分 · strike as often as you can, 100 points each |

**判定 · Judging**：差 45 毫秒以内是「好」，100 毫秒以内是「可」，再远、敲错种类、或者漏掉是「失」。「好」「可」接连击，连击每满 10 加 10 分（最多 100）。 · Within 45 ms is "Bravo", within 100 ms "Good"; further, the wrong kind, or let pass is a "Miss". Bravo and Good build the combo, which adds 10 points for every 10 (up to 100).

| | 键盘 · Keyboard | 触屏 / 鼠标 · Touch / mouse | 手柄 · Gamepad |
|---|---|---|---|
| 敲鼓 · Drum | F、J | 红色的「鼓」区 · the red pads | A、十字键下 · A, d-pad down |
| 敲锣 · Gongs | D、K | 金色的「锣」区 · the gold pads | B、十字键左 · B, d-pad left |
| 暂停 · Pause | P、Esc | 「暂停」· Pause | Start |
| 菜单与设置 · Menus | Tab、Shift+Tab、Enter、Space、Esc 关对话框 · Esc closes a dialog | 点 · tap | 标题和结算页上十字键选、A 确定 · d-pad and A on the title and the curtain call |

横屏时四块敲击区排在台口；竖着拿手机时戏台在上，敲击区占下半屏，上面两块是锣，下面两块是鼓，「暂停」在戏台下面那一行。切到别的标签页时，曲子停在暂停菜单上。 · Across the foot of the stage on a wide screen; on an upright phone the stage is at the top and the pads fill the rest, gongs above and drums below, with Pause in the line under the stage. Switching tabs pauses the song behind the menu.

**设置 · Settings**（标题和暂停菜单里 · on the title and in the pause menu）：声音开关、伴奏音量、音符流速（×1 到 ×3）、延迟校准（±10 毫秒一档，或者「跟着板敲来测」：跟着 16 下板声敲，须跟准至少 8 拍，每拍只计一次，取偏移的中位数）、减弱动画（系统设了「减少动态效果」时自动减弱）、中英文。英文下音符上写拼音（cang、tai…）。 · Sound, backing volume, note speed (×1 to ×3), delay (in steps of 10 ms, or measured with 16 clapper beats, accepting one strike per beat and taking the median of at least eight), reduced motion, and the language. In English the notes show the syllables in pinyin.

## 跟练与压轴 · Lesson and encore

- 「先跟练」沿用正式谱面的判定和击打声。跟板声依次练习单皮鼓、打锣、双手合击和滚奏，击打时会提示早、晚、漏拍或敲错的乐器；结尾可直接点没练成的项目只练该步。练习不写入曲目成绩。 · The lesson uses the same timing and strike sounds, teaches four skills with explicit feedback, and lets you retry an unfinished skill separately. It leaves regular scores alone.
- 《起霸》易通关后可从结算页直接接打「压轴挑战」。压轴是独立的短谱。精准敲击蓄鼓势，蓄满后用双手敲中「仓」开启七秒基础分翻倍。鼓势蓄满时两侧锣键亮起，爆发中显示倒数与加成，漏拍与倒数结束有独立提示。单独保存压轴最好成绩。 · After clearing The General Arms on Easy, start the short encore from the curtain call. Build power with accurate strikes, then hit a big gong with both hands for up to seven seconds of doubled base points. Both gong pads highlight at full power, and the countdown distinguishes a missed note from a completed rally. The encore has its own best score.

## 锣鼓经与曲目 · The score and the songs

曲子由这些点子拼成（`src/sim/songs.mjs`），写法按常见锣鼓经简化改编，不是逐字的传统谱：四击头、急急风、冲头、长锤、夺头、扫头、小锣抽头、撕边、鼓点子，以及京胡奏曲调、单皮鼓守板眼的过门。三首曲子各有固定的五声主旋律。京胡与弹拨声部交替应答，主旋律贯穿演奏并在过门变奏，板鼓用轻重与停顿给玩家击打留出空间。

The songs are made of these patterns (`src/sim/songs.mjs`), simplified from their usual written forms and not
copied stroke for stroke: four strikes, swift wind, rushing head, long hammer, seizing head, sweeping head, the small
gong pull, torn edge, a drum figure, and the bridge. Each piece has a written pentatonic hook, voiced by bowed and plucked parts with room for player hits. The hook returns in varied form through the performance.

| 曲目 · Song | 每分钟拍数 · BPM | 长度 · Length | 易 · Easy | 中 · Normal | 难 · Hard |
|---|---|---|---|---|---|
| 起霸 · The General Arms | 92 | 94 s | 95 音符，1.1/s | 113，1.3/s | 167，1.9/s |
| 趟马 · Riding Through | 120 | 81 s | 112，1.5/s | 169，2.3/s | 223，3.0/s |
| 急急风 · Swift Wind | 152 | 68 s | 126，2.0/s | 215，3.5/s | 250，4.0/s |

`node tools/balance.mjs 10` 让电脑玩家在每张谱上各打 10 局。2026-11-21 在 Node 22 里：每下的早晚标准差 20 毫秒和 40 毫秒的玩家九张谱全部 10/10 过关；60 毫秒的玩家易全部过关，中和难只过 0–2 局；每秒乱敲 8 下的一局也过不了。 · The computer player plays each chart 10 times. A player whose strokes spread 20 or 40 ms clears every chart every time; one spreading 60 ms clears every easy chart and 0–2 of 10 on normal and hard; striking at random 8 times a second clears none.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `play`（`@egret/engine/play`）：`fit: 'expand'`、`portrait`、`transparent`、`renderMode: 'on-demand'`、`audio: false` | 铺满窗口的透明画布，横屏按 960×680、竖屏按 540×960 排版；不变就不重画；不建引擎自己的声音输出 · a clear canvas over the window, laid out at 960 × 680 wide or 540 × 960 tall, drawn only when something changes, with no sound output of its own | `src/main.mjs` |
| `game.show`（数据界面 · views described as data）：`panel`、`text`、`button`、`bar`、`toggle`、`image`，绑定 `text`、`color`、`visible`、`disabled`、`value`、`checked`、`tap`，皮肤 · bindings and skin | 标题、怎么敲、压轴说明、设置、延迟校准、暂停、结算、跟练结算、演出页的曲名、进度、得分、跟练提示和四块敲击区，横竖屏各一套部件 · the title, the guide, the encore notes, settings, delay, pause, the curtain calls and the performance page with its HUD, coach and four pads, in a wide and a tall set of parts | `src/ui/screens.mjs`, `src/ui/stage-ui.mjs`, `src/ui/skin.mjs` |
| `view.get`、`view.rect` | 敲击区的精灵听按下；戏台画在 `stage` 部件的位置上 · the pads' sprites hear the press; the stage is drawn where the `stage` part is | `src/main.mjs` |
| `createUiScreenStack`（`@egret/engine/ui`） | 页面和对话框的栈：对话框在页面上面打开、关掉后回到原页 · the stack of pages and dialogs | `src/ui/screens.mjs`, `src/main.mjs` |
| `createUiSemantics` + `createBrowserSemantics` | 语义树和页面投影：读屏读到每个控件的名字，Tab 走焦点，状态行播报判定和结果 · the semantic tree and its page projection, with a status line for results | `src/main.mjs` |
| `game.loading` | 开场两张一批载入戏画和乐器图，失败时可以再试一次 · loading the paintings two at a time, with a retry | `src/main.mjs` |
| `game.browser.pointer.events` | 敲击区按下那一刻的时间戳，和按住、松开 · the time stamp of a pad's press, and its hold and release | `src/main.mjs` |
| `game.sprite` + Graphics | 方印、菱形、滚奏条、判定线、鼓槌、锣面和「彩」槽 · note seals, rolls, timing line, moving mallets, gong and cheer gauge | `src/view.mjs` |
| `game.text` | 音符上的谱字（英文下是拼音）、判定字、连击数 · the syllables on the notes, the judgement and the combo | `src/view.mjs` |
| `game.burst`、`game.shake` | 击打火花、撞击光环和乐器反应，减弱动画时保留静态反馈 · hit sparks, impact rings and instrument reactions, with static cues in reduced motion | `src/view.mjs` |
| `game.pause`、`resume`、`keys.pressed('pad:…')` | 暂停；手柄的四个键 · the pause; the gamepad's buttons | `src/main.mjs` |
| `createBrowserAudio`（`@egret/engine/web/audio`）及其混音器 · and its mixer | 伴奏、击打和校准板声走三个总线，暂停时冻结演奏时钟 · separate backing, effects and calibration buses, with a pauseable backing clock | `src/audio/sound.mjs` |
| `voice.position` | 曲子的时钟：伴奏声部的位置，减去输出延迟后是「耳朵听到的那一秒」 · the song's clock, less the output's delay | `src/audio/sound.mjs` |
| `encodeWav`（`@egret/engine/kit`） | 算出的鼓、锣、钹、板、京胡采样编成 WAV 交给混音器解码 · the computed samples encoded for the mixer to decode | `src/audio/sound.mjs` |
| `createTextTable` + `pickLanguage` | 中英文文字表，`missing()` 检查两种语言齐全，按浏览器语言开局 · the word table, checked complete | `src/i18n.mjs` |
| `createSaveStore` + `browserSaveStorage` | 设置和每张谱的最好成绩；坏档另存后重新开始 · settings and best runs; a broken save set aside | `src/saves.mjs` |
| `browserLanguages`、`prefersReducedMotion` | 开局的语言；关掉「减弱动画」时回到系统设置 · the first language; the system's motion setting | `src/main.mjs` |

## 美术与声音 · Art and audio

- `assets/stage.webp` 是暖灯下的木构京剧戏台，漆柱、朱帘和雕花沿边布置，中央留给谱面。三张戏画分别是朱金披挂的《起霸》、墨青扬鞭的《趟马》和深靛武生的《急急风》。四张插画使用图像生成制作，打包为 WebP。 · The four original illustrations depict the carved theatre, a vermilion-armoured general, a teal rider and an indigo martial performer. The WebP artwork was created with image generation.
- 京胡、单皮鼓、大小锣、铙钹、鼓板均为原创合成。网页 Worker 负责合成伴奏和音效，白鹭负责解码和混音。击打声即时播放，音符判定继续使用伴奏声部的时间戳。 · The score and acoustic-style percussion are synthesized in a worker and decoded and mixed by Egret. Strikes play immediately, and the backing remains the timing reference.

## 验证 · Verification

- 在游戏目录执行 `node --test test/*.test.mjs`：谱面、判定、声音、存档、中英文字（包括 `src/ui/` 里的界面文字）与引擎入口。2026-11-26 共 38 项全部通过。 · `node --test test/*.test.mjs` checks the charts, judging, sound, saves, both languages (the words in `src/ui/` included) and the engine entries; 38 passed on 2026-11-26.
- 执行 `node test/accept.mjs`：在无头 Chromium 里按控件名字操作，查 Tab、Shift+Tab、Enter、Space、Esc 走完标题、设置、校准、暂停和结算，换语言后读屏名字跟着换，鼠标按住敲击区按按下的时刻判定，暂停和继续，整首曲子按时钟敲（几次跑下来偏差中位数 9–10 毫秒），每次点击后 30 毫秒敲来测延迟（几次量得 39–46 毫秒，页面一帧最多 17 毫秒），竖屏手机上两行两列的敲击区和手指敲击，坏档提示，语义树里没有按部件名读出的组，并比对标题与结算截图。2026-11-26 共 47 项全部通过。 · `node test/accept.mjs` drives headless Chromium by control names through the title, settings, delay, pause and curtain call by keyboard, the language change in the accessible names, a held mouse press judged at its start, pause and resume, a whole song struck by the clock (median 9–10 ms off over several runs), the tap measure with strokes 30 ms after each click (39–46 ms over several runs, a page frame being up to 17 ms), the tall phone layout with finger strikes, the broken-save notice, no group of the tree read by its part's name, and the title and curtain-call baselines; 47 of 47 passed on 2026-11-26.
- 仓库根目录执行 `node tools/quality.mjs OperaDrums` 做自动品质检查，结果写在 [QUALITY.md](QUALITY.md)：自动项全部达标。 · `node tools/quality.mjs OperaDrums` writes [QUALITY.md](QUALITY.md); every automatic item passes.

## 已知问题 · Known issues

- 没有在真机上运行过：手机和带显卡桌面上的触屏手感、帧时间、输出延迟和切回后的声音都「未运行」。延迟只在无头浏览器里量过，真机的耳机、蓝牙耳机延迟会大得多，要靠「跟着板敲来测」校准。 · Not run on a real device; output delay was measured only headless, and real headphones, Bluetooth above all, will be later — the tap measure is there for that.
- 手机横着拿（例如 844×390）时用的是桌面那套部件，缩小以后标题和对话框的按钮只有约 25–30 像素高，比 44 像素的触控建议小（ENGINE-NOTES 18）。竖着拿时控件都在 44 像素以上。 · A phone held sideways (844 × 390, say) gets the desktop parts, and the title's and dialogs' buttons shrink to about 25–30 pixels, under the 44 advised for touch (item 18); held upright every control is above 44.
- 无头环境检测到软件渲染时画布按 0.75 倍像素比画，字和线会略软；有显卡时不受影响。 · Under software rendering the canvas is drawn at a pixel ratio of 0.75 and looks a little soft; a GPU is not affected.
- 界面文字都是无衬线字，没法用衬线字排标题（ENGINE-NOTES 7）。 · Every interface word is sans-serif; the title cannot be set in a serif face (item 7).
- 用浏览器协议发出的按键时刻不是真人的时刻，所以验收只断言真按键「得到了判定」，准不准由页面里按时钟敲的那一段来量。 · Keys sent through the browser protocol do not carry a player's timing, so the acceptance only checks that real keys are judged.
- 手柄的键每帧读一次，时刻会晚到一帧（最多约 17 毫秒）；键盘和触屏用的是事件自己的时间戳。菜单里的手柄操作没有在真手柄上试过。 · Gamepad buttons are read once a frame and may be up to a frame late; keys and touch use their events' own time stamps. The gamepad in the menus was not tried on a real pad.
- 读屏只在无头 Chromium 的无障碍树里查过名字，没有用真的读屏软件听过。 · Screen-reader names were checked only in headless Chromium's accessibility tree, not heard through a real screen reader.

## 已解决 · Solved

- 所有界面从网页按钮和 CSS 改成引擎的数据界面、屏幕栈和语义树（引擎 `aab331d`）。标题、对话框、结算和演出页横竖屏各一套部件；载入失败时有「再试一次」。 · Every screen moved from page buttons and CSS to the engine's views, screen stack and semantic tree (engine `aab331d`), with a wide and a tall set of parts and a retry when loading fails.
- 上线后发现读屏会念出 `readout-box`、`chosen-qiba` 这样的内部名字（ENGINE-NOTES 21）：需要绑定的面板都给了读得懂的名字，戏画当作装饰不进语义树，验收里加了这一项。 · Internal names such as `readout-box` reached screen readers on the live page (item 21): bound panels now have words for a person, the portraits are decoration, and the acceptance checks it.
- 页面按钮上的 Tab 和 Space 失灵（ENGINE-NOTES 1）：引擎已修好；现在没有页面按钮，敲击键只读时间戳、不停止传播。 · Tab and Space on the page's buttons (item 1): fixed in the engine; no page buttons are left.
- 透明画布下面是黑的（ENGINE-NOTES 2）：引擎已修好。 · The black holder (item 2): fixed in the engine.
- 页面上两个音频输出（ENGINE-NOTES 5）：`play({ audio: false })`。 · Two sound outputs (item 5): `play({ audio: false })`.
- 铺满窗口的画布让软件渲染下的帧时间变长（ENGINE-NOTES 19）：静止的戏台图交给页面画在透明画布下面，按需重画。 · The window-wide canvas cost frame time under software rendering (item 19): the still stage is painted by the page under the clear canvas, drawn on demand.
- 最密的谱上帧时间 p95 33 毫秒（ENGINE-NOTES 3）：音符改成方印（鼓）和菱形（锣），只用矩形，回到 16.7 毫秒；形状不同也让分不清红和金的人能区分两种音符。 · 33 ms p95 on the densest chart (item 3): the notes are rectangles now, which also tells them apart without colour.
- 伴奏声部的位置比听到的早约 41 毫秒（ENGINE-NOTES 4）：用 `AudioContext.getOutputTimestamp()` 换算成「正在出声的那一秒」。 · The voice's position ahead of the sound (item 4), turned into what is heard.
- `play` 返回前帧就开始了，入口里还没定义的常量被帧函数读到而报错：帧函数在入口准备好之前什么也不做。 · Frames began before the entry had finished; the frame does nothing until the page is ready.
- 滚奏结束的那一刻正好是下一个音符时，最后几下会被判到下一个音符上：滚奏里的击打先归滚奏，结尾不含端点。 · Strokes at the end of a roll were judged on the next note; inside a roll strokes belong to the roll, and its end is not part of it.
- 京胡曲调原先是随机走出的五声音阶句子：现在每首曲子有固定的主旋律，在过门里变奏。 · The fiddle once walked the scale at random; each song now has a written hook, varied in the bridges.

## 未完成 · Unfinished

- 真机验收（触屏、帧时间、延迟、声音、读屏软件）。 · Checks on real devices, a real screen reader included.
- 手机横屏的大按钮版本，等引擎有按尺寸分的部件（ENGINE-NOTES 18）。 · Larger controls for a phone held sideways, once views have size classes (item 18).
- 更多曲目，以及按真实曲牌写的京胡旋律。 · More songs, and fiddle melodies from real tunes.
- 正式曲目的分段练习和放慢播放（跟练只练四种技巧）。 · Practising a song by section or slowed down; the lesson teaches only four skills.

## 目录结构 · Layout

| 路径 · Path | 用途 · Purpose |
|---|---|
| `index.html`, `style.css` | 页面、import map、画布下面的戏台图和开场的「载入中」 · the page, the import map, the stage picture under the canvas and the boot line |
| `src/main.mjs` | 入口：存档、语言、`play`、载入、声音、击打、画面切换、校准、语义树 · the entry |
| `src/ui/screens.mjs` | 标题、怎么敲、压轴、设置、校准、暂停、结算的数据界面和屏幕栈 · the views of the title, dialogs and curtain calls, and the screen stack |
| `src/ui/stage-ui.mjs` | 演出页：曲名、进度、得分、跟练提示、读数和四块敲击区 · the performance page and its pads |
| `src/ui/skin.mjs`, `src/ui/wrap.mjs` | 配色和皮肤；长句折行 · colours and skin; wrapping long sentences |
| `src/view.mjs` | 高对比音符、节拍标线、乐器动画和判定 · moving notes, beat guides, instruments and judgement |
| `src/encore-stage.mjs` | 压轴挑战的鼓势、爆发和倒数画面 · the encore's power, burst and countdown |
| `assets/`, `src/stage-drawing.mjs` | 戏台与原创戏画、引擎绘制的谱字印章和器乐 · theatre paintings, note seals and instrument artwork |
| `src/audio/synth.mjs`, `src/audio/render-audio.mjs` | 音乐与器乐合成、后台生成 · score and percussion synthesis and its worker |
| `src/audio/sound.mjs` | 交给引擎混音器；曲子的时钟 · the engine's mixer; the song's clock |
| `src/sim/songs.mjs` | 锣鼓经的点子和三首曲子 · the patterns and the songs |
| `src/sim/chart.mjs` | 按难度排谱面 · charts by difficulty |
| `src/sim/judge.mjs` | 判定、连击、得分、「彩」槽、名次 · the judging |
| `src/sim/lesson.mjs`, `src/sim/feedback.mjs` | 跟练的四步和早、晚、漏、敲错的提示 · the lesson's steps and its feedback |
| `src/sim/encore.mjs` | 压轴挑战的谱面与计分 · the encore's chart and scoring |
| `src/sim/bot.mjs`, `tools/balance.mjs` | 电脑玩家和谱面检查 · the computer player and the chart check |
| `src/i18n.mjs`, `src/saves.mjs` | 文字表、存档 · the words, the save |
| `test/` | Node 测试、浏览器验收和截图基线 · tests, acceptance and baselines |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `aab331d617241c967e71c323775cb3006c6ea5a2`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。用到的入口：`@egret/engine/play`、`@egret/engine/kit`、`@egret/engine/web/kit`、`@egret/engine/web/audio`（连同它的混音器 `@egret/engine/audio`）、`@egret/engine/ui`、`@egret/engine/ui/semantics`、`@egret/engine/web/semantics`、`@egret/engine/web/view`。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit
`aab331d617241c967e71c323775cb3006c6ea5a2`, copied by the engine's `tools/vendor-game.mjs`; see
[vendor/SOURCE.md](vendor/SOURCE.md). Entries used: `@egret/engine/play`, `@egret/engine/kit`, `@egret/engine/web/kit`,
`@egret/engine/web/audio` with its mixer `@egret/engine/audio`, `@egret/engine/ui`, `@egret/engine/ui/semantics`,
`@egret/engine/web/semantics` and `@egret/engine/web/view`.

```sh
node tools/vendor-game.mjs ../PortedGamesEgret/OperaDrums @egret/engine @egret/engine/play @egret/engine/kit @egret/engine/web/kit @egret/engine/audio @egret/engine/web/audio @egret/engine/ui @egret/engine/ui/semantics @egret/engine/web/semantics @egret/engine/web/view
```
