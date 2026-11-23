# 沙画江山 · Sand Scroll

## 简介 · Introduction

沙画江山是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的沙画消除游戏 Demo。拖动托盘里的积木到沙盘上方松手，积木整块落下，碰到沙面就化成数千粒颜料沙，顺着沙堆往两边滑。同一种颜色的沙只要从左墙一路连到右墙，整片就从左往右亮起、消掉，上面的沙塌下来，可能接着连成下一片。消掉的沙化成光点飞进上方的手卷，一卷白描的《春山图》随之从左往右染上石青、石绿和赭石。沙堆过了顶上的虚线太久，这一局就输了。一卷画大约两到四分钟。

Sand Scroll is a sand puzzle demo made on its own with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild), the
new Egret engine. Drag a piece from the dish over the tray and let go: it falls whole, and where it meets the sand it
breaks into a few thousand grains of pigment that slide down the heap. When one colour reaches from the left wall to
the right in one connected run, the run lights up from left to right and is gone; the sand above slumps and may join
into the next run. Cleared sand flies as sparks into the handscroll above, and an ink drawing of spring hills takes on
azurite, malachite and ochre from left to right. Sand that stays over the dashed line at the top too long ends the
round. A scroll takes two to four minutes.

[在线试玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/SandScroll/)

## 玩法与操作 · How to play

**目标 · The goal**：把这一卷画染满（消掉四万八千粒沙），别让沙堆在虚线上方停留超过两秒半。 · Finish the scroll by clearing 48,000 grains, and never let sand stay over the dashed line for more than two and a half seconds.

**规则 · Rules**

- 托盘里总有三块积木，用掉一块马上补一块；积木由二十粒见方的小块拼成，有九种形状、三种颜料（第一卷是石青、石绿、赭石）。 · The dish always holds three pieces and refills as one is used; pieces are made of blocks twenty grains square, in nine shapes and three pigments (azurite, malachite and ochre in the first scroll).
- 积木落到沙上就化成沙：每粒往下落，下面有沙就往左下或右下滑，但每粒只滑十次左右就压实了，所以沙在落点附近塌开，不会一路流到两边。 · A piece breaks into sand where it lands; each grain falls, and slides down to a side when blocked, but only about ten times before it packs, so sand slumps near where it fell and does not run to both walls.
- 同色的沙从左墙连到右墙（八个方向相邻都算连着）就整片消掉。两秒半内接着再消一片算连消，每多一级多得一半的分。 · A colour connected from wall to wall (any of the eight neighbours counts) clears as a whole. Another run within two and a half seconds is a chain, worth half again more for each step.
- 好的打法是把每种颜色平铺成一条条横带：同一层里一块挨一块铺过去，铺满就消。全堆在一处的沙很快就会顶到虚线。 · The good way is to lay each colour in flat bands, piece beside piece across one layer until it reaches. Sand heaped in one place soon reaches the line.

| | 键盘 · Keyboard | 鼠标 · Mouse | 触屏 · Touch | 手柄 · Gamepad |
|---|---|---|---|---|
| 选一块 · Pick a piece | 1 2 3 | 按住托盘里的一块 · press a piece in the dish | 同左 · the same | LB、X、RB |
| 挪动 · Move it | ← → 或 A D | 按住拖到沙盘上方 · drag it over the tray | 手指拖动 · drag with a finger | 十字键 · d-pad |
| 转向 · Turn it | ↑、W 或 Q | 轻点托盘里的一块 · click a piece in the dish | 轻点 · tap | Y |
| 落下 · Drop it | 空格、↓ 或 S · Space, ↓ or S | 在沙盘上方松手 · let go over the tray | 同左 · the same | A |
| 暂停 · Pause | Esc | 「暂停」· Pause | 同左 · the same | B |

拖着积木时，沙盘顶上出现它的影子，一道淡光照到沙面，标出它会落在哪里。设置在卷首：声音、减弱动画（关掉粒子、光点和震动）、中英文，玩法说明也在那里。 · While a piece is held, its shadow shows at the top of the tray with a faint shaft down to where it will land. The settings are on the title: sound, reduced motion (no particles, sparks or vibration), Chinese or English, and how to play.

## 美术、声音与平衡 · Art, sound and balance

- 每一粒沙就是贴图上的一个像素：颜色 = 颜料本色 × 自己的深浅，上面空着的受光、亮一点，越往沙堆里越暗（向下数头顶压着几粒沙，一种便宜的环境光遮蔽），少数最亮的像晶体一样闪。积木在空中时每个小块有亮边和暗边。 · Each grain is one pixel of a texture: its pigment times its own shade, lighter where nothing lies above it, darker deeper in a heap (counting the grains over it, a cheap ambient occlusion), with a few of the brightest glinting like crystal. A piece in the air shows each block with a light edge and a dark one.
- 手卷《春山图》全部在 `src/view/scroll.mjs` 里用 Canvas 画出：绢底、远山、上青绿下赭石的近山、皴笔、松树、桃花、水纹、亭子、小舟、留白的云带和卷尾朱印。白描版和设色版用同一串随机数画，线条一一对上，揭开时按带毛边的阈值从左往右混合。 · The scroll is painted in code in `src/view/scroll.mjs`: silk, far hills, near hills green and blue above and ochre below, texture strokes, pines, peach blossom, water, a pavilion, boats, bands of bare mist and a red seal. The ink and the colour versions are drawn from the same random numbers, line for line, and blended from left to right through a ragged threshold.
- 声音全部合成（`src/audio/sound.mjs`）：沙声是滤过的噪声加颗粒；消除是 Karplus-Strong 拨弦，连消时按五声音阶往上走；背景是二十四秒无缝循环的拨弦小曲。 · All sound is synthesized: sand is filtered noise with grains; a clear is a Karplus-Strong pluck that climbs the pentatonic scale through a chain; behind it a plucked tune twenty-four seconds long loops without a seam.
- 规则在 `src/sim/sand.mjs`，不碰页面也不碰引擎，固定种子能在 Node 里完整重放。`tools/balance.mjs` 是一个往前看一步的机器人：每个候选放法在沙盘副本上落下、沉一秒半，比较同色沙从两墙伸出多远。 · The rules are in `src/sim/sand.mjs`, free of the page and the engine, and replay a whole round from a seed in Node. `tools/balance.mjs` is a robot that looks one move ahead: it drops each candidate on a copy of the tray, lets it settle for a second and a half, and compares how far each colour reaches in from the walls.

平衡（第一卷，2026 年 11 月在 Node 里跑）· Balance (the first scroll, run in Node in November 2026)：

| 打法 · Way of playing | 结果 · Result |
|---|---|
| 往前看一步的机器人，每 1.6 秒一块 · The one-move-ahead robot, a piece every 1.6 s | 3 局都画成，约 56 秒、35 块、9–12 次消除 · all 3 finished, about 56 s, 35 pieces, 9–12 clears |
| 按颜色平铺横带，每 2 秒一块（规则测试里的打法）· Flat bands by colour, a piece every 2 s (the way in the rules test) | 5 局都画成，64–78 秒 · all 5 finished in 64–78 s |
| 每块都放在同一处 · Every piece in the same place | 3 处都在 6–11 秒内输掉，一次也没消 · lost within 6–11 s at all three places, with no clear |

人比机器人慢、也会放错，按每块三秒估计一卷两到四分钟。 · A person is slower and makes mistakes; at three seconds a piece a scroll should take two to four minutes.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `@egret/engine/web/game` · `createBrowserGame` | 舞台、帧循环、指针与键盘；有可用的 WebGPU 适配器时用 WebGPU，否则 WebGL2（`?backend=` 可指定） · the stage, the loop, pointer and keys; WebGPU where an adapter is available, WebGL2 otherwise | `src/main.mjs` |
| `game.textureFromPixels` | 沙盘切成十五条贴图，哪条有沙动了只重传哪条；每块积木一张贴图 · the tray as fifteen strip textures, only the strips that changed sent again; one texture a piece | `src/view/board.mjs`、`src/view/play.mjs` |
| `Bitmap`（默认最近点采样 · nearest sampling by default） | 沙粒放大两倍仍然颗颗分明 · grains stay sharp at twice their size | `src/view/board.mjs` |
| `Sprite.graphics` | 落点光柱、警戒线、空中的光点、暂停时的遮罩 · the shaft, the dashed line, the sparks in flight, the shade behind the pause | `src/view/play.mjs`、`src/screens.mjs` |
| `clearAlpha: 0`（透明画布 · a clear canvas） | 紫檀框、碟子、手卷与装裱、卷首和卷尾的画由页面在引擎画布下面画一次，引擎每帧只画会动的东西 · the frame, the dishes, the scroll and its mount, the title and the end are painted once by the page under the engine's canvas, which draws only what moves | `src/main.mjs`（`backdrop`） |
| `@egret/engine/particles` · `createParticleEmitter` | 落沙的扬尘、消除时的颜料迸溅（叠加混合） · dust where sand lands and the burst of a clear, added light | `src/view/play.mjs` |
| `game.pointer.observe` | 按住、拖动、松手落下，轻点转向 · hold, drag, let go to drop, tap to turn | `src/view/play.mjs` |
| `@egret/engine/kit` · `createInputActions`、`createSaveStore`、`encodeWav` | 键盘与手柄动作；存档；合成声音编码 · key and gamepad actions; the save; synthesized sound | `src/main.mjs`、`src/saves.mjs`、`src/audio/sound.mjs` |
| `@egret/engine/web/audio` · `createBrowserAudio` | 音效与音乐两条总线，静音设置 · two buses, effects and music, muted together | `src/audio/sound.mjs` |
| `@egret/engine/ui` · `createActionControl` 等 | 按钮、开关、单选 · buttons, switches, choices | `src/ui/kit.mjs` |
| `@egret/engine/ui/semantics`、`@egret/engine/web/semantics` | 读屏器能读到的按钮和开关 · buttons and switches a screen reader finds | `src/main.mjs`、`src/ui/kit.mjs` |
| `game.createLabel` | 全部文字，中英两套 · every word, in two languages | `src/ui/kit.mjs` |

## 已验证 · Verified

- `node --test test/*.test.mjs`（Node 22）：21 项全过——规则 11 项（同种子同结果、转向、积木化沙粒数不差、沙只在落点附近塌开、连通两墙才消、连消、警戒线判负、画成、同一处放必输、平铺横带能画成）、存档 5 项、文字 2 项、引擎副本 2 项。 · 21 pass: 11 on the rules (same seed same end, turning, a piece breaks into exactly its grains, sand slumps near where it lands, only wall-to-wall runs clear, chains, the line loses, the painting finishes, one place loses, flat bands finish), 5 on the save, 2 on the words, 2 on the engine copy.
- `node test/accept.mjs`（无头 Chromium + SwiftShader，960×540）：15 项全过，包括用鼠标拖放、轻点转向、键盘选块落下、整条同色沙消除计分、暂停与继续、画成后存档，以及卷首、设置、作画三张截图基线。 · 15 pass in headless Chromium with SwiftShader, among them a mouse drag and drop, a tap to turn, keys to pick and drop, a wall-to-wall run cleared and scored, pause and resume, the save after a finished scroll, and three screenshot baselines.
- `node tools/balance.mjs`、规则测试里的两种打法：结果见上表。 · The balance robot and the two ways in the rules test: results in the table above.
- 竖屏 540×960 与横屏 960×540 的卷首、作画、暂停、画成、失败画面都截图看过。 · The title, play, pause, finished and lost screens were looked at in screenshots, tall at 540 × 960 and wide at 960 × 540.
- 品质验收见 [QUALITY.md](QUALITY.md)。 · Quality results are in QUALITY.md.

## 已知问题 · Known issues

- 软件渲染（无头 Chromium + SwiftShader，两核）下，沙在动时作画画面的帧时间中位数竖屏约 20 ms、横屏约 23 ms（p95 25–31 ms），没到 16.7 ms；游戏脚本只占 0.6–1.2 ms。卷首的 F1 测了四次，三次 16.8 ms 达标、一次 33.4 ms，处在门槛上。有显卡的电脑和手机上没有测过。 · Under software rendering on two cores, a round with sand moving draws at about 20 ms a frame tall and 23 ms wide (median; p95 25–31 ms), short of 16.7 ms; the game's script is 0.6–1.2 ms of it. The title's F1 passed at 16.8 ms in three runs of four and measured 33.4 ms in one: right at the line. Not measured with a graphics card or on a phone.
- WebGPU 后端只在有可用适配器时才会选上；无头环境没有适配器，所以实际跑过的都是 WebGL2。 · The WebGPU backend is chosen only where an adapter is available; the headless browser has none, so everything run here was WebGL2.
- 触屏拖放只用鼠标事件验证过，没有在真机上用手指试过。 · Dragging was checked with the mouse only, not with a finger on a real phone.
- 声音没有用扬声器试听过，只确认了合成和解码不出错。 · The sound was not listened to on speakers; only its making and decoding were checked.
- 卷首和标题用楷体系列字体，系统没有楷体时退回宋体或黑体。 · Titles ask for a Kai typeface and fall back to a serif or sans one where the system has none.

## 已解决 · Solved

- **同一处一直放就能无限消**：最早的沙每粒都能一直往两边滑，在中间堆成一座沙山后，每块新积木都会在整座山上铺一层，碰到两墙就消。现在每粒只能滑十次左右（`LAND_ENERGY`），往下直落一行会补回几次，于是沙在落点附近塌开；规则测试里加了"同一处放必输"。 · **Endless clears from one place**: at first every grain could slide without end, so once the sand made one hill in the middle every new piece coated it down to both walls and cleared. Now a grain slides about ten times (`LAND_ENERGY`) and gets a few back for each row it falls straight down, so sand slumps near where it lands; the rules test now checks that one place loses.
- **积木一落地就整块不动**：给滑动次数设上限后，被压在积木内部、一时动不了的沙粒当场就被清零，积木落地后像砖一样立着。改成动不了时保留次数，等周围的沙让开再滑。 · **Pieces standing like bricks**: with the limit, grains inside a piece that could not move at once lost their slides on the spot. They now keep them until the sand around them moves.
- **画面停住**：两次整局卡死都是一帧里抛出了异常，帧循环随之停下——一次是给粒子 `burst` 传了小数（ENGINE-NOTES 2），一次是放掉了一张还挂在 `Bitmap` 上的贴图（ENGINE-NOTES 3）。 · **The picture froze**: both times a frame threw and the loop stopped with it — once a fraction passed to a particle `burst` (ENGINE-NOTES 2), once a texture let go while a `Bitmap` still showed it (ENGINE-NOTES 3).
- **不会动的东西每帧重画，软件渲染下拖慢一倍**：紫檀框、碟子、手卷和装裱、卷首的字和画、卷尾的面板都改由页面在透明的引擎画布下面画一次（`src/main.mjs` 的 `backdrop`），只在手卷多染一点或换选中的碟子时重画；卷首的沙雨改成 CSS 动画。作画画面帧时间中位数从约 35 ms 降到约 20 ms，卷首 F1 从 33.4 ms 降到 16.8 ms。光柱和警戒线也只在样子变了时重画，游戏脚本每帧从 2.3 ms 降到 0.6 ms（ENGINE-NOTES 7）。 · **Still things drawn every frame, doubling software-drawn frame times**: the frame, the dishes, the scroll and mount, the title's words and picture and the end's panel are painted once by the page under the clear engine canvas, again only when the scroll takes more colour or another dish is chosen; the title's drifting sand is a CSS animation. A round went from about 35 ms to 20 ms a frame (median), the title's F1 from 33.4 ms to 16.8 ms; the shaft and line are redrawn only when they change, and the script went from 2.3 ms to 0.6 ms (ENGINE-NOTES 7).

## 未完成 · Unfinished

- 这一版是"样板关"：只有第一卷《春山图》。后面计划加更多卷（四种、五种颜料，朱砂、藤黄、蛤粉），以及卷轴收藏。 · This is the sample scroll only. More scrolls are planned (four and five pigments: cinnabar, gamboge, shell white) and a shelf of finished scrolls.
- 关卡编辑器与分享码（会用到引擎的文字输入框和段落排版）。 · A level editor with share codes (which will use the engine's text input and paragraphs).
- 用 WebGPU 计算着色器跑沙的模拟：引擎现在还没有开放计算通道（ENGINE-NOTES 5），沙的规则目前在主线程上跑，每帧约 0.5 ms。 · Running the sand on WebGPU compute: the engine does not yet offer a compute pass (ENGINE-NOTES 5); the rules run on the main thread at about 0.5 ms a frame.
- 沙盘本身（十五条贴图，每条都是整块透明贴图）在软件渲染下仍是主要开销；引擎有了可局部更新的贴图（ENGINE-NOTES 4）后可以合成一张。 · The tray itself (fifteen strips, each a whole transparent texture) is still the main cost under software drawing; with a texture that can be updated in part (ENGINE-NOTES 4) it could be one.

## 目录结构 · Layout

| 路径 · Path | 用途 · What it is for |
|---|---|
| `index.html`、`style.css` | 页面、import map、紫檀桌面、页面画布和卷首沙雨 · the page, the import map, the rosewood desk, the page canvas and the title's drifting sand |
| `src/main.mjs` | 入口：游戏、存档、声音、键位、画面切换、横竖屏重建 · the entry: game, save, sound, keys, screens, rebuilding on a turn |
| `src/screens.mjs` | 卷首、作画、暂停、卷尾、设置 · title, play, pause, end, settings |
| `src/sim/sand.mjs` | 规则：沙盘、积木、落沙、连通消除、连消、警戒线、进度 · the rules |
| `src/view/board.mjs` | 沙盘的像素着色与分条上传 · shading the grains and sending strips |
| `src/view/play.mjs` | 一局的画面：布局、托盘、拖放、光柱、特效、手卷 · the round's view |
| `src/view/scroll.mjs` | 用代码画的《春山图》和揭开合成 · the painted scroll and its uncovering |
| `src/audio/sound.mjs` | 合成音效与背景音乐 · synthesized sound and music |
| `src/ui/kit.mjs`、`src/i18n.mjs`、`src/saves.mjs` | 界面零件、中英文字、存档 · interface parts, words, save |
| `test/` | Node 测试、浏览器验收和截图基线 · Node tests, browser acceptance and baselines |
| `tools/balance.mjs` | 往前看一步的平衡机器人 · the one-move-ahead balance robot |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

- 引擎提交 `450bb9eb62fec9d3032b35766817844adc6eba33`（见 `vendor/SOURCE.md`）。 · Engine commit `450bb9e` (see `vendor/SOURCE.md`).
- 生成命令（在引擎仓库里）· Made with, in the engine repository:

```sh
node tools/vendor-game.mjs ../PortedGamesEgret/SandScroll @egret/engine @egret/engine/ui @egret/engine/ui/semantics @egret/engine/web/semantics @egret/engine/kit @egret/engine/web/kit @egret/engine/web/game @egret/engine/audio @egret/engine/web/audio @egret/engine/text @egret/engine/web/text @egret/engine/particles @egret/engine/webgpu @egret/engine/webgl2 @egret/engine/web/pointer
```

- 游戏代码直接用到的入口：`@egret/engine`、`@egret/engine/ui`、`@egret/engine/ui/semantics`、`@egret/engine/web/semantics`、`@egret/engine/kit`、`@egret/engine/web/kit`、`@egret/engine/web/game`、`@egret/engine/web/audio`、`@egret/engine/particles`；WebGPU 与 WebGL2 后端由 `createBrowserGame` 按需加载。 · Entries the game imports itself are listed above; the WebGPU and WebGL2 backends are loaded by `createBrowserGame` as needed.
