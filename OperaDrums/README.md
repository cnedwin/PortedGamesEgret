# 锣鼓经 · Opera Drums

## 简介 · Introduction

锣鼓经是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的游戏 Demo，一款京剧锣鼓的节奏游戏。你坐在鼓师的位置上：谱子上的「仓、才、台、八、大、嘟」变成一枚枚方印和菱形，从右边流向鼓面，在它们到达时敲鼓或打锣。三首曲子《起霸》《趟马》《急急风》由传统锣鼓经的常用点子拼成，各有易、中、难三档；伴奏是板眼和过门里的京胡，击打声是单皮鼓、小锣、铙钹和大锣。所有声音都在代码里算出来，交给引擎的混音器播放，不加载任何声音文件；戏台由页面画一次，会动的部分由引擎画。

Opera Drums is a game demo made on its own with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild), the new
Egret engine: a rhythm game of the Peking opera percussion. You take the drummer's seat: the syllables of the
percussion score — cang, cai, tai, ba, da, du — become seals and diamonds flowing towards the drum face, and you strike
the drum or the gongs as they arrive. Three songs, The General Arms, Riding Through and Swift Wind, are made of common
patterns of the traditional score, each on easy, normal and hard; the backing is the clapper's beat and a jinghu fiddle
in the bridges, and the strokes sound as the single-skin drum, the small gong, the cymbals and the big gong. Every
sound is worked out in code and played through the engine's mixer, with no sound file; the stage is painted once by
the page and what moves is drawn by the engine.

[在线试玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/OperaDrums/)

## 玩法与操作 · How to play

**目标 · Goal**：跟着伴奏，在每个音符到达左边鼓面时敲对的那一种。曲终时「彩」槽过了金线就算过关（易 60、中和难 70）；一个「失」也没有是「全连」，全部是「好」是「满堂彩」。每首曲子每个难度记最好的一次（先比名次，同名次比分数）。 · Strike the right kind as each note reaches the drum face. A song is cleared with the cheer gauge past the gold line at the end (60 on easy, 70 otherwise); no miss is a full combo, every stroke "Bravo" a full house. The best run of each song on each difficulty is kept (rank first, then score).

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
| 暂停 · Pause | P、Esc | 「暂停」· Pause | |
| 菜单与设置 · Menus | Tab、Shift+Tab、Enter、Space | 点 · tap | |

横屏时四块敲击区排在台口；竖着拿手机时戏台在上，敲击区占下半屏，上面两块是锣，下面两块是鼓。切到别的标签页时，曲子停在暂停菜单上。 · Across the foot of the stage on a wide screen; on an upright phone the stage is at the top and the pads fill the rest, gongs above and drums below. Switching tabs pauses the song behind the menu.

**设置 · Settings**（标题和暂停菜单里 · on the title and in the pause menu）：声音开关、伴奏音量、音符流速（×1 到 ×3）、延迟校准（±10 毫秒一档，或者「跟着板敲来测」：跟着 16 下板声敲，取中位数）、减弱动画（系统设了「减少动态效果」时自动减弱）、中英文。英文下音符上写拼音（cang、tai…）。 · Sound, backing volume, note speed (×1 to ×3), delay (in steps of 10 ms, or measured by striking along with 16 clicks of the clapper, taking the median), reduced motion, and the language. In English the notes show the syllables in pinyin.

## 锣鼓经与曲目 · The score and the songs

曲子由这些点子拼成（`src/sim/songs.mjs`），写法按常见锣鼓经简化改编，不是逐字的传统谱：四击头、急急风、冲头、长锤、夺头、扫头、小锣抽头、撕边、鼓点子，以及京胡奏曲调、单皮鼓守板眼的过门。京胡的曲调按 D 宫五声音阶两小节一句随机走出来、句尾落在 D 或 A，每首曲子的种子固定，所以每次都一样。

The songs are made of these patterns (`src/sim/songs.mjs`), simplified from their usual written forms and not
copied stroke for stroke: four strikes, swift wind, rushing head, long hammer, seizing head, sweeping head, the small
gong pull, torn edge, a drum figure, and the bridge where the fiddle plays over the drum keeping the beat. The fiddle's
tune walks the D gong pentatonic in two-bar phrases ending on D or A, from a fixed seed per song, so it is the same
every time.

| 曲目 · Song | 每分钟拍数 · BPM | 长度 · Length | 易 · Easy | 中 · Normal | 难 · Hard |
|---|---|---|---|---|---|
| 起霸 · The General Arms | 92 | 94 s | 95 音符，1.1/s | 113，1.3/s | 167，1.9/s |
| 趟马 · Riding Through | 120 | 81 s | 112，1.5/s | 169，2.3/s | 223，3.0/s |
| 急急风 · Swift Wind | 152 | 68 s | 126，2.0/s | 215，3.5/s | 250，4.0/s |

`node tools/balance.mjs 10` 让电脑玩家在每张谱上各打 10 局。2026-11-21 在 Node 22 里：每下的早晚标准差 20 毫秒和 40 毫秒的玩家九张谱全部 10/10 过关；60 毫秒的玩家易全部过关，中和难只过 0–2 局；每秒乱敲 8 下的一局也过不了。 · The computer player plays each chart 10 times. A player whose strokes spread 20 or 40 ms clears every chart every time; one spreading 60 ms clears every easy chart and 0–2 of 10 on normal and hard; striking at random 8 times a second clears none.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `play`（`@egret/engine/play`） | 一次调用建好戏台框里的透明画布和帧循环 · the clear canvas in the stage's box and the loop, from one call | `src/main.mjs` |
| `game.sprite` + Graphics | 方印与菱形音符、滚奏长条、鼓面、宫灯、「彩」槽，全用矩形和路径画 · the notes, rolls, drum face, lanterns and gauge, drawn in code | `src/view.mjs` |
| `game.text` | 音符上的谱字（英文下是拼音）、判定字、连击数 · the syllables on the notes, the judgement and the combo | `src/view.mjs` |
| `game.burst`、`game.shake` | 敲中时的火花，大音符时一抖、宫灯一晃（减弱动画时不抖不晃） · sparks on a hit, a shake and swinging lanterns on a big note | `src/view.mjs` |
| `game.pause`、`resume`、`keys.pressed('pad:…')` | 暂停；手柄的四个键 · the pause; the gamepad's buttons | `src/main.mjs` |
| `createBrowserAudio`（`@egret/engine/web/audio`）及其混音器 · and its mixer | 伴奏一个声部、击打声，音乐和音效两条音量；暂停时 `suspend` 让曲子的时钟停住 · the backing as one voice, the strokes, two buses; `suspend` stops the song's clock in a pause | `src/audio/sound.mjs` |
| `voice.position` | 曲子的时钟：伴奏声部的位置，减去输出延迟后是「耳朵听到的那一秒」 · the song's clock, less the output's delay | `src/audio/sound.mjs` |
| `encodeWav`（`@egret/engine/kit`） | 算出的鼓、锣、钹、板、京胡采样编成 WAV 交给混音器解码 · the computed samples encoded for the mixer to decode | `src/audio/sound.mjs` |
| `createTextTable` + `pickLanguage` | 中英文文字表，`missing()` 检查两种语言齐全，按浏览器语言开局 · the word table, checked complete | `src/i18n.mjs` |
| `createSaveStore` + `browserSaveStorage` | 设置和每张谱的最好成绩；坏档另存后重新开始 · settings and best runs; a broken save set aside | `src/saves.mjs` |
| `browserLanguages`、`prefersReducedMotion` | 开局的语言；关掉「减弱动画」时回到系统设置 · the first language; the system's motion setting | `src/main.mjs` |

## 已验证 · Verified

- `node --test test/*.test.mjs`（Node 22，26 项全部通过）：点子都是整小节、谱字都认识；谱面按时间排好、难度越高越密、易只在正拍、中不比半拍碎；判定窗口、敲错种类、太早、漏打、大音符双手（同一只手不算）、滚奏不误判下一个音符、连击加分、「彩」槽、名次；稳的电脑玩家九张谱都过关、乱敲的都过不了；每种合成声音不爆音没有坏数、伴奏和曲子一样长、板声每一下落在拍上、京胡的音都在过门里和五声音阶上、校准用的板声在说好的位置；存档（新档、写入、名次先比再比分数、超出范围的设置不保存、坏档、版本过新、存储拒绝写入）；文字齐全、英文里没有中文；引擎副本的 import map。 · All 26 Node tests pass.
- `node test/accept.mjs`（无头 Chromium 153，SwiftShader 软件渲染，1280×720）：标题第一个按钮有焦点；Tab 和 Space 关、开声音并存档；切到英文后所有按钮读英文；Shift+Tab 到《急急风》易、Enter 开演；用真按键 F、D 在前四个音符到时敲，四个都得到判定；点一下鼓区不出错；P 暂停后曲子的时钟不走、Esc 后从原处继续；余下的音符由页面里的自动击打按曲子的时钟敲完，过关，判定偏差的中位数 9–12 毫秒；最好成绩写进存档、曲目单上显示；跟着板声每下晚 30 毫秒敲，校准结果在 38–45 毫秒（页面一帧最多 17 毫秒）；坏档提示。标题和结算两张截图基线一致，控制台没有错误。 · The whole walk in headless Chromium with software rendering, two baselines matching and a clean console.
- `node ../tools/quality.mjs OperaDrums`：自动项全部达标，见 [QUALITY.md](QUALITY.md)。标题帧时间 p95 16.8 ms；另外在同一环境里量了最密的《急急风》难：p95 16.7 ms（音符改成矩形以前是 33.4 ms，见 ENGINE-NOTES 3）。 · Every automatic item passes; the densest chart runs at 16.7 ms p95, headless and software-drawn.
- 曲子的时钟：无头 Chromium 里每帧取的曲子秒数从不倒退，相邻两帧的增量与页面时间之差 p95 0.1 毫秒；伴奏声部的位置比耳朵听到的早 41 毫秒左右（ENGINE-NOTES 4）。 · The song's clock never ran backwards and stepped within 0.1 ms of page time; the voice's position ran about 41 ms ahead of what was heard.

## 已知问题 · Known issues

- 没有在真机上运行过：手机和带显卡桌面上的触屏手感、帧时间、输出延迟和切回后的声音都「未运行」。延迟只在无头浏览器里量过，真机的耳机、蓝牙耳机延迟会大得多，要靠「跟着板敲来测」校准。 · Not run on a real device; output delay was measured only headless, and real headphones, Bluetooth above all, will be later — the tap measure is there for that.
- 用浏览器协议发出的按键时刻不是真人的时刻，所以验收只断言真按键「得到了判定」，准不准由页面里按时钟敲的那一段来量。 · Keys sent through the browser protocol do not carry a player's timing, so the acceptance only checks that real keys are judged.
- 手柄的键每帧读一次，时刻会晚到一帧（最多约 17 毫秒）；键盘和触屏用的是事件自己的时间戳。 · Gamepad buttons are read once a frame and may be up to a frame late; keys and touch use their events' own time stamps.
- 京胡曲调是随机走出来的五声音阶句子，不是传统曲牌。 · The fiddle's tune is a walk on the pentatonic scale, not a traditional melody.
- 读屏只在无头 Chromium 的无障碍树里查过名字。 · Screen-reader names were checked only in headless Chromium's accessibility tree.

## 已解决 · Solved

- 页面按钮上的 Tab 和 Space 失灵（ENGINE-NOTES 1）：捕获阶段先接住按键并停止传播。 · Tab and Space on the page's buttons (item 1): keys caught first.
- 透明画布下面是黑的（ENGINE-NOTES 2）：开局后把 `play` 的盒子改成透明。 · The black holder (item 2), made clear.
- 最密的谱上帧时间 p95 33 毫秒（ENGINE-NOTES 3）：圆形音符每帧移动太贵，改成方印（鼓）和菱形（锣），只用矩形，回到 16.7 毫秒；形状不同也让分不清红和金的人能区分两种音符。 · 33 ms p95 on the densest chart (item 3): the notes are rectangles now, square for the drum and diamond for the gongs, which also tells them apart without colour.
- 伴奏声部的位置比听到的早约 41 毫秒（ENGINE-NOTES 4）：用 `AudioContext.getOutputTimestamp()` 换算成「正在出声的那一秒」。 · The voice's position ahead of the sound (item 4), turned into what is heard.
- `play` 返回前帧就开始了，入口里还没定义的常量被帧函数读到而报错：帧函数在入口准备好之前什么也不做。 · Frames began before the entry had finished, and read a constant not yet defined; the frame does nothing until the page is ready.
- 滚奏结束的那一刻正好是下一个音符时，最后几下会被判到下一个音符上：滚奏里的击打先归滚奏，结尾不含端点。 · Strokes at the very end of a roll were judged on the next note; inside a roll strokes belong to the roll, and its end is not part of it.

## 未完成 · Unfinished

- 真机验收（触屏、帧时间、延迟、声音）。 · Checks on real devices.
- 更多曲目，以及按真实曲牌写的京胡旋律。 · More songs, and fiddle melodies from real tunes.
- 练习模式（从某一段开始、放慢）。 · A practice mode (from a section, slowed down).

## 目录结构 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `index.html`, `style.css` | 页面、import map、戏台框、敲击区、标题 / 暂停 / 结算 / 校准 · the page, the stage's box, the pads and the panels |
| `src/main.mjs` | 入口：存档、语言、`play`、声音、击打、画面切换、校准 · the entry |
| `src/view.mjs` | 音符、鼓面、判定、连击、「彩」槽、宫灯 · what moves on the stage |
| `src/ground.mjs` | 戏台背景（只画一次） · the stage, painted once |
| `src/audio/synth.mjs` | 鼓、锣、钹、板、京胡的合成和整首伴奏 · the synthesis and the backing |
| `src/audio/sound.mjs` | 交给引擎混音器；曲子的时钟 · the engine's mixer; the song's clock |
| `src/sim/songs.mjs` | 锣鼓经的点子和三首曲子 · the patterns and the songs |
| `src/sim/chart.mjs` | 按难度排谱面 · charts by difficulty |
| `src/sim/judge.mjs` | 判定、连击、得分、「彩」槽、名次 · the judging |
| `src/sim/bot.mjs`, `tools/balance.mjs` | 电脑玩家和谱面检查 · the computer player and the chart check |
| `src/i18n.mjs`, `src/saves.mjs` | 文字表、存档 · the words, the save |
| `test/` | Node 测试、浏览器验收和截图基线 · tests, acceptance and baselines |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `b5628eb9997b67cf6163a388f5aa06f321f3833a`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。用到的入口：`@egret/engine/play`、`@egret/engine/kit`、`@egret/engine/web/kit`、`@egret/engine/web/audio`；`@egret/engine/audio` 是后者的混音器，一起复制。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit
`b5628eb9997b67cf6163a388f5aa06f321f3833a`, copied by the engine's `tools/vendor-game.mjs`; see
[vendor/SOURCE.md](vendor/SOURCE.md). Entries used: `@egret/engine/play`, `@egret/engine/kit`, `@egret/engine/web/kit` and
`@egret/engine/web/audio`, whose mixer, `@egret/engine/audio`, is copied with it.

```sh
node tools/vendor-game.mjs ../PortedGamesEgret/OperaDrums @egret/engine @egret/engine/play @egret/engine/kit @egret/engine/web/kit @egret/engine/audio @egret/engine/web/audio
```
