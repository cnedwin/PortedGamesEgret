# 锣鼓经 · Opera Drums

## 简介 · Introduction

《锣鼓经》是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)开发的京剧节奏游戏。选一出戏和难度，按板开锣。红方印敲鼓，金菱形敲锣，敲击时机看左侧金线。《起霸》《趟马》《急急风》各有三档难度、原创戏画和独立编配。

Opera Drums is a Peking opera rhythm game built with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). Choose an act and a difficulty. Strike the drum for vermilion seals and the gongs for gold diamonds as they reach the timing line. The General Arms, Riding Through and Swift Wind each have three difficulties, original portraits and their own arrangements.

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
| 暂停 · Pause | P、Esc | 「暂停」· Pause | |
| 菜单与设置 · Menus | Tab、Shift+Tab、Enter、Space | 点 · tap | |

横屏时四块敲击区排在台口；竖着拿手机时戏台在上，敲击区占下半屏，上面两块是锣，下面两块是鼓。切到别的标签页时，曲子停在暂停菜单上。 · Across the foot of the stage on a wide screen; on an upright phone the stage is at the top and the pads fill the rest, gongs above and drums below. Switching tabs pauses the song behind the menu.

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
| `play`（`@egret/engine/play`） | 一次调用建好戏台框里的透明画布和帧循环 · the clear canvas in the stage's box and the loop, from one call | `src/main.mjs` |
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

- 在游戏目录执行 `node --test test/*.test.mjs` 检查谱面、判定、声音、存档、中英文字与引擎入口。
- 执行 `node test/accept.mjs` 复跑浏览器键盘演奏、按键越界释放、暂停恢复、结算存档和节拍校准，并比对标题与结算截图。
- 仓库根目录可以运行 `node tools/quality.mjs OperaDrums --no-write` 做自动品质检查。[QUALITY.md](QUALITY.md) 记录初版自动检查。

## 文件 · Files

| 路径 · Path | 用途 · Purpose |
|---|---|
| `index.html`, `style.css` | 页面、import map、戏台框、敲击区、标题 / 暂停 / 结算 / 校准 · the page, the stage's box, the pads and the panels |
| `src/main.mjs` | 入口：存档、语言、`play`、声音、击打、画面切换、校准 · the entry |
| `src/view.mjs` | 高对比音符、节拍标线、乐器动画和判定 · moving notes, beat guides, instruments and judgement |
| `assets/`, `src/stage-drawing.mjs` | 戏台与原创戏画、引擎绘制的谱字印章和器乐 · theatre paintings, note seals and instrument artwork |
| `src/audio/synth.mjs`, `src/audio/render-audio.mjs` | 音乐与器乐合成、后台生成 · score and percussion synthesis and its worker |
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
