# 沙画江山 · Sand Scroll

## 简介 · Introduction

沙画江山是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的沙画消除游戏 Demo。

- **作画**：拖动托盘里的积木到沙盘上方松手，积木落下化成数千粒颜料沙，在落点附近塌开、流开。同一种颜色的沙从左墙连到右墙，整片从左往右亮起、消掉，上面的沙塌下来，可能接着连消。消掉的沙飞进上方的手卷，把白描的山水一点点染上颜色。三卷：《春山图》三色、《秋山图》加朱砂四色、《雪山图》加蛤粉，画成一卷开下一卷。
- **无尽沙盘**：没有终点，分数越高颜料越多（三万分加朱砂、九万分加藤黄），三卷画一卷接一卷地染。
- **拆画**：画本身就是一盘沙。下面几列排队的沙桶，点一列最前面那只，它就上传送带，传送带经过哪里，它就收走头顶同色的沙；三只同色的桶合成一只大桶。传送带位子有限，收齐整幅画过关，堵住了就输。六幅画都截自三卷山水。
- **今日试笔**：每天 UTC 00:00 换题。当天所有玩家使用同一卷、同一积木序列，重开仍是同一道题。个人最高分和完成状态记录在此浏览器。

分数每满两万得一个爆竹，点燃后炸开一圈沙，快顶到虚线时用来解围。

Sand Scroll is a sand puzzle demo made on its own with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild), the
new Egret engine.

- **Paint**: drag a piece from the dish over the tray and let go; it falls and breaks into thousands of grains of
  pigment that slump and flow where they land. One colour reaching from the left wall to the right lights up and is
  gone, the sand above slumps and may chain, and the cleared sand colours an ink landscape in the scroll above. Three
  scrolls: Spring Hills in three pigments, Autumn Hills adding cinnabar, Snow Hills adding shell white, each opening
  the next.
- **Endless tray**: no end; more pigments as the score grows (cinnabar at 30,000, gamboge at 90,000), and the three
  paintings coloured one after another.
- **Unpaint**: the painting itself is the sand. Tap the front bucket of a lane and it rides a belt under the tray,
  drawing the sand of its colour straight above it; three buckets of a colour merge into a big one. The belt has few
  places: collect the whole picture to finish, jam it and lose. Six pictures, each cut from the three landscapes.
- **Daily scroll**: a new puzzle at 00:00 UTC. Everyone plays the same scroll and piece sequence for the day, including on a retry. Your best and completion are saved in this browser.

Every 20,000 points earn a firecracker, which blows away a circle of sand when sand is close to the line.

[在线试玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/SandScroll/)

## 玩法与操作 · How to play

**作画、无尽沙盘与今日试笔 · Paint, the endless tray and the daily scroll**

- 托盘里总有三块积木，用掉一块马上补一块；积木由二十粒见方的小块拼成，有九种形状。 · The dish always holds three pieces, refilled as one is used, in nine shapes of blocks twenty grains square.
- 积木落到沙上就化成沙：每粒往下落，下面有沙就往左下或右下滑，每粒最多滑二十六次就压实，所以沙会流开，但不会一路流到两边。 · A piece breaks into sand where it lands; each grain falls, and slides down to a side when blocked, at most twenty-six times before it packs, so sand flows out but does not run to both walls.
- 当前积木下落时，可以再放两块等待。托盘和沙盘上的同色圆点标出等待顺序及落点。暂停后转屏仍保持暂停，继续时按原顺序落下。 · Up to two pieces can wait while one falls. Matching marks on the tray and board show the order and destinations. If you turn the phone while paused, the accepted moves wait for you to resume.
- 同色的沙从左墙连到右墙（八个方向相邻都算连着）就整片消掉；两秒半内再消一片算连消，每多一级多得一半的分，大连消会震屏。 · A colour connected from wall to wall clears; another within two and a half seconds is a chain worth half again more for each step, and big chains shake the tray.
- 沙在虚线上方停留超过两秒半就输。好的打法是把每种颜色平铺成横带；全堆在一处很快就会顶到虚线。 · Sand over the dashed line for two and a half seconds loses. Lay each colour in flat bands; heaping in one place soon reaches the line.

**拆画 · Unpaint**

- 每种颜料的桶加起来正好装下画里这种颜料的沙。桶只从沙盘最底下一行、自己头顶左右两粒的范围里收沙；底下的沙被收走，上面的一粒粒落下来。 · The buckets of each pigment hold exactly that pigment's sand. A bucket draws only from the bottom row, within two grains of where it is; the sand above falls down grain by grain.
- 传送带满了、而且整整绕一圈都没有桶收到沙，就算堵住。还露不出来的颜色先别放上去；凑齐三只同色的桶可以腾出位子。 · A full belt on which no bucket draws for a whole trip round is jammed. Hold back colours not yet showing at the bottom; three of a colour free places.
- 盘底色样显示现在能收哪些颜色，带位指示显示传送带用了几格。沙桶上的提示会标出能收沙或能凑成大桶的选择。 · The swatches show which pigments are exposed, the belt meter shows the occupied spaces, and the lane labels mark good matches and possible merges.
- 每一幅的桶都是固定发好的，替身玩家验证过能拆完（见下方平衡表）。 · Each picture's buckets are dealt the same way every time, and the stand-in has finished each one (see the balance table).

| | 键盘 · Keyboard | 鼠标 · Mouse | 触屏 · Touch | 手柄 · Gamepad |
|---|---|---|---|---|
| 选一块积木 · Pick a piece | 1 2 3 | 按住托盘里的一块 · press a piece in the dish | 同左 · the same | L1、X、R1 |
| 挪动 · Move it | ← → 或 A D | 按住拖到沙盘上方 · drag it over the tray | 手指拖动 · drag with a finger | 十字键 · d-pad |
| 转向 · Turn it | ↑、W 或 Q | 轻点托盘里的一块 · click a piece in the dish | 轻点 · tap | Y |
| 落下 · Drop it | 空格、↓ 或 S · Space, ↓ or S | 在沙盘上方松手 · let go over the tray | 同左 · the same | A |
| 爆竹 · Firecracker | F（炸在所选的列上 · over the chosen column） | 点「爆竹」再点沙盘 · click Firecracker, then the sand | 同左 · the same | L2 |
| 拆画：上桶 · Unpaint: board a bucket | 1–5 | 点一列 · click a lane | 点一列 · tap a lane | — |
| 暂停 · Pause | Esc | 「暂停」· Pause | 同左 · the same | B |

拖着积木时，沙盘顶上出现它的影子，一道淡光照到沙面，标出它会落在哪里。设置在卷首：声音、减弱动画（关掉粒子、光点、震屏和震动）、中英文。 · While a piece is held, its shadow shows at the top of the tray with a faint shaft down to where it will land. The settings: sound, reduced motion (no particles, sparks, shake or vibration), Chinese or English.

## 美术、声音与平衡 · Art, sound and balance

- 每一粒沙就是贴图上的一个像素：颜色 = 颜料本色 × 自己的深浅，上面空着的受光、亮一点，越往沙堆里越暗（数头顶压着几粒沙的环境光遮蔽），少数最亮的像晶体一样闪。 · Each grain is one pixel: its pigment times its own shade, lighter where nothing lies above, darker deeper in a heap, a few glinting like crystal.
- 三卷山水全部在 `src/view/scroll.mjs` 里用 Canvas 画出，各有自己的山色、草木（桃花、枫树、积雪）和题字。白描版和设色版用同一串随机数画，线条一一对上。拆画的画从同一幅画里截一段，不画绢底，按透明度决定哪里有沙，按这一关的颜料取最近色，亮度变成每粒的深浅；沙底下垫的是同一块绢，沙收走后露出绢来。 · The three landscapes are painted in code, each with its own hill colours, plants (peach blossom, maples, snow) and title. An unpaint picture is cut from the same painting drawn without its silk: its opacity says where there is sand, the nearest of the level's pigments gives each grain its colour and its brightness the shade; the same silk lies under the sand and shows as the sand goes.
- 配乐和音效均在游戏内合成（`src/audio/sound.mjs`）。作画、无尽和拆画各有独立的五声调式配乐，结合拨弦与竹笛音色。落沙、连消、爆竹、收沙、合桶和满桶各有提示音。配乐按需分批生成，暂停时保留播放进度。 · The game synthesizes its audio. Paint, Endless and Unpaint have separate pentatonic loops with plucked strings and bamboo-flute tones. Drops, clears, fireworks, collection, merges and full buckets get distinct cues. Music is generated in small batches on demand and resumes at its saved position after a pause.
- 规则在 `src/sim/sand.mjs` 和 `src/sim/unpaint.mjs`，不碰页面也不碰引擎。`tools/balance.mjs` 是往前看一步的作画机器人，`tools/unpaint-bot.mjs` 是拆画的替身玩家（谨慎程度可调）。 · The rules are in `src/sim/sand.mjs` and `src/sim/unpaint.mjs`, free of page and engine. `tools/balance.mjs` is a one-move-ahead painting robot and `tools/unpaint-bot.mjs` a stand-in for unpainting with adjustable care.

平衡（2026 年 11 月在 Node 里跑）· Balance (run in Node in November 2026)：

| 玩法 · Mode | 打法 · Way of playing | 结果 · Result |
|---|---|---|
| 作画第一卷 · Scroll one | 往前看一步的机器人，每 1.6 秒一块 · the robot, a piece every 1.6 s | 3 局都画成，51–56 秒 · all 3 finished, 51–56 s |
| 作画三卷 · All three scrolls | 按颜色平铺横带，每 2 秒一块 · flat bands, a piece every 2 s | 6 局全部画成：第一卷 70–82 秒，第二卷 84–124 秒，第三卷 112–136 秒 · all 6 finished each: 70–82 s, 84–124 s, 112–136 s |
| 作画第一卷 · Scroll one | 每块都放在同一处（左、中、右五个位置） · every piece in one place, five places | 全输，一次也没消 · all lost, no clear |
| 无尽沙盘 · Endless | 平铺横带，危险时用爆竹 · flat bands, firecrackers when in danger | 4–5 分钟、14.7–19.9 万分、画成 2–3 卷、五种颜料全开 · 4–5 minutes, 147,000–199,000 points, 2–3 paintings, all five pigments |
| 拆画六幅 · Six pictures | 谨慎的替身 · careful | 全部拆完，41–94 秒 · all finished, 41–94 s |
| 拆画第三到第六幅 · Pictures 3–6 | 一半随手、全随手各 4 局 · half careless and careless, 4 rounds each | 一半随手赢 2–3 局，全随手赢 0–1 局 · half careless won 2–3, careless 0–1 |

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `@egret/engine/web/game` · `createBrowserGame` | 舞台、帧循环、指针与键盘；有可用的 WebGPU 适配器时用 WebGPU，否则 WebGL2（`?backend=` 可指定） · the stage, the loop, pointer and keys; WebGPU where an adapter is available, WebGL2 otherwise | `src/main.mjs` |
| `game.textureFromPixels` | 沙盘切成十五条贴图，哪条有沙动了只重传哪条；每块积木一张贴图 · the tray as fifteen strip textures, only the strips that changed sent again; one texture a piece | `src/view/board.mjs`、`src/view/play.mjs` |
| `Bitmap`（默认最近点采样 · nearest sampling by default） | 沙粒放大两倍仍然颗颗分明 · grains stay sharp at twice their size | `src/view/board.mjs` |
| `Sprite.graphics` | 落点光柱、警戒线、空中的光点、暂停时的遮罩 · the shaft, the dashed line, the sparks in flight, the shade behind the pause | `src/view/play.mjs`、`src/screens.mjs` |
| `clearAlpha: 0`（透明画布 · a clear canvas） | 紫檀框、碟子、手卷与装裱、卷首和卷尾的画由页面在引擎画布下面画一次，引擎每帧只画会动的东西 · the frame, the dishes, the scroll and its mount, the title and the end are painted once by the page under the engine's canvas, which draws only what moves | `src/main.mjs`（`backdrop`） |
| `@egret/engine/particles` · `createParticleEmitter` | 落沙的扬尘、消除时的颜料迸溅、爆竹的火星（圆形发射）、画成时满盘飞沙、拆画装满时的金光（叠加混合） · dust, the burst of a clear, the firecracker's sparks from a circle, the whole tray bursting when a painting is done, gold as a bucket fills | `src/view/play.mjs`、`src/view/unpaintview.mjs` |
| `game.pointer.observe` | 按住、拖动、松手落下，轻点转向，点沙盘放爆竹，点一列上桶 · hold, drag, let go, tap to turn, tap the sand for a firecracker, tap a lane | `src/view/play.mjs`、`src/view/unpaintview.mjs` |
| `@egret/engine/kit` · `createInputActions`、`createSaveStore`、`encodeWav` | 键盘与手柄动作；存档；合成声音编码 · key and gamepad actions; the save; synthesized sound | `src/main.mjs`、`src/saves.mjs`、`src/audio/sound.mjs` |
| `@egret/engine/web/audio` · `createBrowserAudio` | 音效与音乐两条总线，静音设置 · two buses, effects and music, muted together | `src/audio/sound.mjs` |
| `@egret/engine/ui` · `createActionControl` 等 | 按钮、开关、单选 · buttons, switches, choices | `src/ui/kit.mjs` |
| `@egret/engine/ui/semantics`、`@egret/engine/web/semantics` | 读屏器能读到的按钮和开关 · buttons and switches a screen reader finds | `src/main.mjs`、`src/ui/kit.mjs` |
| `game.createLabel` | 全部文字，中英两套 · every word, in two languages | `src/ui/kit.mjs` |

## 已验证 · Verified
- 2026-11-28: Windows WebKit iPhone 15 Pro 配置的本机候选首屏、触屏代表路径；非物理 iPhone；见 [QUALITY](QUALITY.md)。 · Candidate launch and representative touch route on Windows WebKit with the iPhone 15 Pro profile; not a physical iPhone. See [QUALITY](QUALITY.md).

- `node --test test/*.test.mjs`：35 项通过，覆盖原有规则、存档、双语和引擎副本检查，以及每日题目和独立纪录。 · 35 tests pass, covering the original rules, saves, localization, engine files and the daily seed and record.
- `node test/accept.mjs`：28 项通过，覆盖原有玩法、存档、五张截图基线，另测窄横屏触控区和边缘点按。 · 28 Edge/Chromium checks with SwiftShader, covering gameplay, saves, five visual baselines and the bounds and edges of touch controls in compact landscape.
- `node test/placement-accept.mjs` 与 `node test/pause-resize.mjs`：复测快速落块的顺序、方向与落点，以及转屏后的暂停、音频和继续操作。 · Verify rapid placement order, orientation and columns, as well as pause, audio and resume across viewport changes.
- 上面平衡表里的各种打法都实际跑过。 · Every way of playing in the balance table was run.
- 竖屏 540×960 与横屏 960×540 的卷首、选卷、作画、拆画、暂停、结算画面都截图看过。 · All screens were looked at in screenshots, tall and wide.
- 品质验收见 [QUALITY.md](QUALITY.md)。 · Quality results are in QUALITY.md.

## 已知问题 · Known issues

- 既往软件渲染（无头 Chromium + SwiftShader，两核）在活动沙盘录得约 20–23 ms 帧时间中位数，详见验收记录。真机数据按设备、后端和场景记录。 · Earlier software-rendered gameplay had a median frame time of about 20–23 ms. Device results in the quality log specify the backend and scenario.
- 声音合成、浏览器数字输出、暂停与静音已验证，扬声器听感待试听。 · Synthesis, browser audio output, pause and mute have been checked. Speaker listening is pending.
- 拆画的画是在浏览器里从 Canvas 画取样得来的；替身验证用的是无头 Chromium 画出的画，其他浏览器的抗锯齿略有不同，每种颜料的粒数会差一点，但桶的容量按当场取样的结果分，所以总能装下，只是难度可能略有出入。 · Unpaint pictures are sampled from a Canvas painting in the browser; the stand-in was checked on pictures drawn by headless Chromium. Other browsers anti-alias a little differently, so counts shift slightly; buckets are sized from the picture sampled at the time, so they always add up, though difficulty may differ a little.
- 拆画时沙柱一列列往下沉，画面会被拉出竖向的条纹，这是流沙的样子，但画的形状不再完全保持。 · As columns sink in unpainting the picture streaks vertically: the look of running sand, at the cost of the picture's exact shape.
- 卷首和标题用楷体系列字体，系统没有楷体时退回宋体或黑体。 · Titles ask for a Kai typeface and fall back to a serif or sans one where the system has none.

## 已解决 · Solved

- **卷首加了按钮后帧时间回到 33 ms**：五个按钮每帧都要画。卷首、选卷、结算、设置这类静止画面现在在一秒半没有操作后让帧循环停下，任何触摸、按键、滚轮都会唤醒；F1 回到 16.7 ms。 · **Frame time back at 33 ms with more title buttons**: still screens now let the frame loop stop after a second and a half without input, any touch, key or wheel waking it; F1 is back at 16.7 ms.
- **拆画太容易**：最早的规则是桶从整行最底下的沙里随便收，底行几乎总有每种颜色，怎么点都能过。改成传送带载着桶在沙盘下走、只收头顶左右两粒的沙之后，颜色在画里的位置才有意义；再按每关固定的发桶顺序，用替身逐个验证能拆完。 · **Unpainting too easy**: at first a bucket drew from anywhere on the bottom row, which nearly always had every colour, so any taps won. With buckets riding a belt and drawing only straight above them, where a colour sits in the picture matters; each picture's deal is fixed and checked by the stand-in.
- **悬空的沙收不到**：画里的雪花、云带下面是空的绢，开局不让它们落，结果底下收完了它们还挂着，永远收不齐。现在没有沙在动时每隔四分之一秒把悬空的沙唤醒，让它落下来。 · **Hanging sand out of reach**: snowflakes and bands of cloud over empty silk were left hanging once the sand under them was gone; now, when nothing moves, hanging grains are woken every quarter second.
- **沙太"干"**：每粒滑动次数从十次加到二十六次，沙流得更开，同时测过"每块放同一处"在五个位置都还是会输。 · **Sand too dry**: slides per grain went from ten to twenty-six, so sand flows out further; dropping every piece in one place still loses at all five places tested.
- **同一处一直放就能无限消**：最早的沙每粒都能一直往两边滑，在中间堆成一座沙山后，每块新积木都会在整座山上铺一层，碰到两墙就消。现在每粒只能滑十次左右（`LAND_ENERGY`），往下直落一行会补回几次，于是沙在落点附近塌开；规则测试里加了"同一处放必输"。 · **Endless clears from one place**: at first every grain could slide without end, so once the sand made one hill in the middle every new piece coated it down to both walls and cleared. Now a grain slides about ten times (`LAND_ENERGY`) and gets a few back for each row it falls straight down, so sand slumps near where it lands; the rules test now checks that one place loses.
- **积木一落地就整块不动**：给滑动次数设上限后，被压在积木内部、一时动不了的沙粒当场就被清零，积木落地后像砖一样立着。改成动不了时保留次数，等周围的沙让开再滑。 · **Pieces standing like bricks**: with the limit, grains inside a piece that could not move at once lost their slides on the spot. They now keep them until the sand around them moves.
- **画面停住**：两次整局卡死都是一帧里抛出了异常，帧循环随之停下——一次是给粒子 `burst` 传了小数（ENGINE-NOTES 2），一次是放掉了一张还挂在 `Bitmap` 上的贴图（ENGINE-NOTES 3）。 · **The picture froze**: both times a frame threw and the loop stopped with it — once a fraction passed to a particle `burst` (ENGINE-NOTES 2), once a texture let go while a `Bitmap` still showed it (ENGINE-NOTES 3).
- **不会动的东西每帧重画，软件渲染下拖慢一倍**：紫檀框、碟子、手卷和装裱、卷首的字和画、卷尾的面板都改由页面在透明的引擎画布下面画一次（`src/main.mjs` 的 `backdrop`），只在手卷多染一点或换选中的碟子时重画；卷首的沙雨改成 CSS 动画。作画画面帧时间中位数从约 35 ms 降到约 20 ms，卷首 F1 从 33.4 ms 降到 16.8 ms。光柱和警戒线也只在样子变了时重画，游戏脚本每帧从 2.3 ms 降到 0.6 ms（ENGINE-NOTES 7）。 · **Still things drawn every frame, doubling software-drawn frame times**: the frame, the dishes, the scroll and mount, the title's words and picture and the end's panel are painted once by the page under the clear engine canvas, again only when the scroll takes more colour or another dish is chosen; the title's drifting sand is a CSS animation. A round went from about 35 ms to 20 ms a frame (median), the title's F1 from 33.4 ms to 16.8 ms; the shaft and line are redrawn only when they change, and the script went from 2.3 ms to 0.6 ms (ENGINE-NOTES 7).

## 未完成 · Unfinished

- 关卡编辑器与分享码（会用到引擎的文字输入框和段落排版）。 · A level editor with share codes (which will use the engine's text input and paragraphs).
- 用 WebGPU 计算着色器跑沙的模拟：引擎现在还没有开放计算通道（ENGINE-NOTES 5），沙的规则在主线程上跑。 · Running the sand on WebGPU compute: the engine has no compute pass yet (ENGINE-NOTES 5); the rules run on the main thread.
- 每日一卷、更多拆画关卡和卷轴收藏。 · A scroll of the day, more unpaint pictures and a shelf of finished scrolls.
- 沙盘本身（十五条贴图）在软件渲染下仍是主要开销；引擎有了可局部更新的贴图（ENGINE-NOTES 4）后可以合成一张。 · The tray's fifteen strips are still the main cost under software drawing; a texture updatable in part (ENGINE-NOTES 4) would make them one.

## 目录结构 · Layout

| 路径 · Path | 用途 · What it is for |
|---|---|
| `index.html`、`style.css` | 页面、import map、紫檀桌面、页面画布和卷首沙雨 · the page, the import map, the rosewood desk, the page canvas and the title's drifting sand |
| `src/main.mjs` | 入口：游戏、存档、声音、键位、画面切换、横竖屏重建 · the entry: game, save, sound, keys, screens, rebuilding on a turn |
| `src/screens.mjs` | 卷首、选卷、作画、拆画、暂停、卷尾、设置 · title, choosing, painting, unpainting, pause, end, settings |
| `src/sim/sand.mjs` | 作画规则：沙盘、积木、落沙、连通消除、连消、警戒线、爆竹、无尽沙盘 · the painting rules |
| `src/sim/unpaint.mjs` | 拆画规则：取样成沙、发桶、传送带、合成、堵住 · the unpaint rules |
| `src/view/unpaintview.mjs`、`src/view/unpaintart.mjs` | 拆画的画面、从山水取样成沙 · the unpaint view and sampling the picture |
| `src/view/board.mjs` | 沙盘的像素着色与分条上传 · shading the grains and sending strips |
| `src/view/play.mjs` | 一局的画面：布局、托盘、拖放、光柱、特效、手卷 · the round's view |
| `src/view/scroll.mjs` | 用代码画的三卷山水和揭开合成 · the three painted scrolls and their uncovering |
| `src/audio/sound.mjs` | 合成音效与背景音乐 · synthesized sound and music |
| `src/ui/kit.mjs`、`src/i18n.mjs`、`src/saves.mjs` | 界面零件、中英文字、存档 · interface parts, words, save |
| `test/` | Node 测试、浏览器验收和截图基线 · Node tests, browser acceptance and baselines |
| `tools/balance.mjs`、`tools/unpaint-bot.mjs` | 作画的往前看一步机器人、拆画的替身玩家 · the painting robot and the unpaint stand-in |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

- 引擎提交 `82561d6338a805f0e0459a2d5d42a284f9385b30`（见 `vendor/SOURCE.md`）。 · Engine commit `450bb9e` (see `vendor/SOURCE.md`).
- 生成命令（在引擎仓库里）· Made with, in the engine repository:

```sh
node tools/vendor-game.mjs ../PortedGamesEgret/SandScroll @egret/engine @egret/engine/ui @egret/engine/ui/semantics @egret/engine/web/semantics @egret/engine/kit @egret/engine/web/kit @egret/engine/web/game @egret/engine/audio @egret/engine/web/audio @egret/engine/text @egret/engine/web/text @egret/engine/particles @egret/engine/webgpu @egret/engine/webgl2 @egret/engine/web/pointer
```

- 游戏代码直接用到的入口：`@egret/engine`、`@egret/engine/ui`、`@egret/engine/ui/semantics`、`@egret/engine/web/semantics`、`@egret/engine/kit`、`@egret/engine/web/kit`、`@egret/engine/web/game`、`@egret/engine/web/audio`、`@egret/engine/particles`；WebGPU 与 WebGL2 后端由 `createBrowserGame` 按需加载。 · Entries the game imports itself are listed above; the WebGPU and WebGL2 backends are loaded by `createBrowserGame` as needed.
