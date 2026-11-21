# 镇邪司 · Night Wardens

## 简介 · Introduction

镇邪司是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的竖屏塔防射击 Demo。你是守城门的镇邪人，城楼上只有一把符弩：它会自动瞄准、连发符箭。纸人、鬼火、僵尸、灯笼鬼和鬼新娘从路的尽头一波波压过来。打散它们会掉出魂珠，攒满就升一级，从三道符法里挑一道：连弩、速射、穿心、火符、雷引、寒符、墨斗线、八卦镜……天雷符蓄满后能一次劈遍全场。撑到子时，首领会现身：城隍庙外的纸扎大将、乱葬岗的白无常、鬼市的旱魃。把它打倒、清空路面，这一夜就守住了。三夜各三到五分钟。画面、声音和音乐全部用代码生成，没有图片和音频文件。

Night Wardens is a game demo made on its own with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild), the new
Egret engine: a tower shooter for a phone held upright. You keep the city gate at night, with one talisman crossbow on
the wall that aims and fires by itself. Paper dolls, ghost fire, hopping jiangshi, lantern ghosts and the ghost bride
press down the road in waves. Each one banished drops a soul; enough souls gain a level and a choice of one ward out of
three: volley, haste, pierce, fire talismans, the thunder chain, frost, the ink line, the bagua mirror and more. A
full thunder talisman strikes the whole road at once. At midnight a warden comes: the Paper General on the temple
road, White Impermanence on the graveyard hill, the Drought Fiend in the ghost market. Bring it down and clear the
road, and the night is held. Each of the three nights runs three to five minutes. Every picture, sound and tune is
made in code; the game loads no image or audio file.

[在线试玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/NightWardens/)

## 玩法与操作 · How to play

**目标 · The goal**：别让城墙的血归零，撑到子时首领现身，打倒它并清空路面。守住时按城墙剩下的血给星：七成以上三颗，三成半以上两颗，其余一颗。守住一夜开下一夜，每一夜记最好的星数和最快用时。 · Keep the wall standing until the warden comes at midnight, bring it down and clear the road. A held night earns stars by the wall left: three for seven tenths or more, two for over a third, otherwise one. Holding a night opens the next; each night keeps its best stars and fastest time.

**规则 · Rules**

- 符弩自动瞄准离城墙最近的邪祟；会吐火的灯笼鬼停在半路，算作更近，优先挨打。邪祟走到城墙就咬掉一截血，然后消失；首领会一直趴在墙上咬。 · The crossbow aims by itself at the haunt nearest the wall; lantern ghosts, which stop halfway and spit fire, count as nearer. A haunt that reaches the wall bites it and is gone; a warden stays and keeps biting.
- 魂珠飞回符弩后才算数，攒满升一级，选符法时整夜暂停。每道符法最多叠两到五层，全部叠满后升级改为修补城墙。 · A soul counts once it flies home; a level pauses the night for the choice of wards. Each ward stacks two to five times; once all are full, a level mends the wall instead.
- 天雷符随时间充能（约 22 秒，引雷可缩短），满了以后放出：每个邪祟受 150 点伤害并定身，首领受 320 点。 · The thunder talisman fills over about 22 seconds (less with Storm call); it deals 150 to every haunt and stuns it, 320 to a warden.

| 邪祟 · Haunt | 特点 · What it does |
|---|---|
| 纸人 · Paper doll | 又多又脆，左右摇摆 · many and frail, swaying |
| 鬼火 · Ghost fire | 快，走之字 · fast, zigzags |
| 僵尸 · Jiangshi | 一蹦一停，结实 · hops and stops, tough |
| 灯笼鬼 · Lantern ghost | 停在半路往城墙吐火 · stops halfway and spits fire at the wall |
| 鬼新娘 · Ghost bride | 精英，不时召来纸人 · an elite who calls paper dolls |
| 纸扎大将、白无常、旱魃 · The three wardens | 召唤、吐火、跺地震屏 · summon, spit, stomp |

| | 键盘 · Keyboard | 鼠标 · Mouse | 触屏 · Touch | 手柄 · Gamepad |
|---|---|---|---|---|
| 移动符弩 · Move the crossbow | ← → 或 A D | 在路面上按住拖动 · hold and drag on the road | 手指在路面上拖动 · drag on the road | 左摇杆或十字键 · left stick or d-pad |
| 天雷符 · Thunder | 空格 · Space | 点「雷」· click the seal | 点「雷」，可以和拖动同时 · tap the seal, while dragging with another finger | A 或 R1 |
| 选符法 · Choose a ward | 1 2 3，或方向键加 Enter · or arrows and Enter | 点卡片 · click a card | 点卡片 · tap a card | 十字键加 A · d-pad and A |
| 暂停与继续 · Pause, go on | Esc 或 P | 「暂停」· Pause | 同左 · the same | Start |

手柄被击中、放天雷和首领倒下时会震动（浏览器和手柄支持时）。设置在标题里：声音、减弱动画（关掉震屏和雾，系统设了「减少动态效果」时自动减弱）、中英文。窗口横过来时，场地居中，两侧显示状态和已得符法；手机竖拿时舞台随屏幕变高，路面下面放天雷键，那里也能拖动。 · The pad shakes on hits, thunder and a warden's fall, where the browser and pad allow. The settings, on the title: sound, reduced motion (no shaking and no mist; on already when the system asks), and the language. On a wide window the road sits in the middle with the bars and the wards held at the sides; on a long upright phone the stage grows with the screen, with the thunder seal under the road, where dragging steers too.

## 美术、声音与加载 · Art, sound and loading

- 所有画面在 `src/art/paint.mjs` 里用 2D 画布画出：五种邪祟的走路帧、三位首领、符弩、符箭、魂珠，以及三夜的路面和城墙。`src/art/atlas.mjs` 按两倍分辨率把它们排进一张图集交给引擎；首领各有一张图集，只在它那一夜载入。路面画一次，做成页面里画布下面那层 `#road` 的背景，引擎只画会动的东西。 · Everything is painted in code on a 2D canvas: the haunts' walks, the wardens, the crossbow, bolts, souls and the three roads. The atlas packs them at twice their size for the engine; each warden's atlas loads only on its night. The road is painted once as the background of the page's `#road` under the canvas, and the engine draws only what moves.
- 音效和配乐在 `src/audio/sound.mjs` 里合成成采样，编码成 WAV 交给引擎的混音器。配乐是 16 秒循环：低沉的弦音、木鱼和五声音阶的拨弦。 · Sounds and music are synthesized as samples and handed to the engine's mixer as WAV; the music is a 16-second loop of a bowed drone, a wooden fish and pentatonic plucks.
- 首屏只载引擎副本和游戏脚本（约 2 MB），在 10 Mbps、CPU 降速 4 倍时 1.5 秒内可以操作（见 QUALITY.md）。 · The first screen loads only the engine copy and the scripts (about 2 MB) and is playable within 1.5 s at 10 Mbps with the CPU slowed four times.

## 规则与平衡 · Rules and balance

规则在 `src/sim/`，不碰页面也不碰引擎，固定种子能在 Node 里完整重放一夜；数字都在 `src/sim/data.mjs`。`src/sim/bot.mjs` 是替身玩家：站到最危险的邪祟下面，按固定的喜好挑符法，人多或首领近了就放天雷。`tools/balance.mjs` 用引擎的 `runHeadless` 让它把三夜各跑一批种子。

The rules are in `src/sim/`, free of the page and the engine, and replay a whole night from one seed in Node; every
number is in `src/sim/data.mjs`. `src/sim/bot.mjs` is a stand-in player: it stands under the worst danger, takes wards
by a fixed liking and uses the thunder when the road is crowded or the warden is near. `tools/balance.mjs` has it
play a batch of seeds on each night through the engine's `runHeadless`.

```sh
node --import ./vendor/node-register.mjs tools/balance.mjs --seeds 12 --skill 0.7
```

2026-11-22 在 Node 22 里各跑 12 个种子（1–12）的结果；`skill` 是替身移动的快慢 · Results of 12 seeds (1–12) each in
Node 22 on 2026-11-22; `skill` is how quickly the stand-in moves:

| 夜 · Night | skill 0.7 守住 · held | 用时中位数 · median length | skill 0.35 守住 · held |
|---|---|---|---|
| 第一夜 · Night one | 12/12，多为三星 · mostly three stars | 3 分 48 秒 · 3:48 | 12/12 |
| 第二夜 · Night two | 9/12，一到两星 · one or two stars | 4 分 04 秒 · 4:04 | 8/12 |
| 第三夜 · Night three | 11/12，多为一星 · mostly one star | 4 分 19 秒 · 4:19 | 9/12 |

替身不是人：它找出卡死的规则和失控的数值，手感和难度还要真人来试。 · The stand-in is not a person: it finds stuck
rules and runaway numbers, while feel and difficulty still need people to play.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `createBrowserGame`（`@egret/engine/web/game`） | 画布、帧循环、指针和键盘；后端 `auto`：有 WebGPU 适配器就用 WebGPU，否则 WebGL2，`?backend=webgl2` 可指定；`?stats` 显示帧时间面板 · the canvas, loop, pointer and keys; WebGPU where the browser has an adapter, else WebGL2; `?stats` shows the frame panel | `src/main.mjs` |
| `@egret/engine/webgpu`、`@egret/engine/webgl2` | 两个后端都在引擎副本里，由 `createBrowserGame` 按浏览器选用 · both backends are in the copy, chosen by `createBrowserGame` | `vendor/importmap.json` |
| `createSpriteSheet`、`Bitmap`（`@egret/engine`） | 一张图集上的邪祟、影子、符箭、魂珠、裂痕，从对象池取用，合成一批绘制 · haunts, shadows, bolts, souls and cracks from one atlas, pooled and drawn as one batch | `src/view/field.mjs` |
| `createSequenceClip` + `SequencePlayer`（`@egret/engine`） | 每个邪祟按自己的年纪取走路帧；僵尸的帧跟着它的蹦跳 · each haunt's walk frame from its own age; a jiangshi's frame follows its hop | `src/view/field.mjs` |
| `createSequenceController`（`@egret/engine/animation`） | 首领的走路由引擎时钟推动，左右脚两个标记落地时扬起尘土；选符法时暂停 · a warden's walk on the engine's clock, footfall markers raising dust; paused during a choice | `src/view/field.mjs` |
| `createParticleEmitter`（`@egret/engine/particles`） | 火星、纸屑、鬼火、烟、尘土、金光、余烬和路口的雾，一种一个发射器，在需要的地方迸发 · sparks, paper scraps, ghost fire, smoke, dust, gold, embers and the mist, one emitter of each kind | `src/view/field.mjs` |
| `createSharedMaterial2D`（`@egret/engine`） | 双色着色：命中闪白、冰冻发蓝、灼烧发红、雷击定身 · two-colour tints for the hit flash, frost, fire and the thunder's stun | `src/view/field.mjs` |
| `Graphics`、`Sprite`（`@egret/engine`） | 雷链和天雷的折线、八卦镜光柱、墨斗线、血条和天雷键的充能环 · the lightning lines, the mirror's beam, the ink line, the bars and the thunder seal's ring | `src/view/field.mjs`, `src/screens.mjs` |
| `planLinearLayout`（`@egret/engine/layout`） | 三张符法卡片：竖屏上下排、横屏左右排 · the three ward cards, stacked when tall and side by side when wide | `src/screens.mjs` |
| `animate`（`@egret/engine`） | 首领现身的横幅、标题上转动的符弩 · the warden's banner, the turning crossbow on the title | `src/screens.mjs` |
| `pointer.observe`（`createBrowserGame` 的指针输入） | 一根手指拖动符弩，另一根手指同时按天雷键，各管各的触点 · one finger steers while another presses the thunder seal, each its own contact | `src/screens.mjs` |
| `createActionControl`（`@egret/engine/ui`） | 天雷键和所有按钮的按下、松开与键盘激活 · the thunder seal and every button: press, release and keys | `src/screens.mjs`, `src/ui/kit.mjs` |
| `createInputActions` + `bindBrowserInputActions` | 方向键、空格、数字键和手柄摇杆按名字读取 · keys and the pad's stick read by name | `src/main.mjs` |
| `createBrowserGamepadInput`（`@egret/engine/web/gamepad`） | 读手柄并在受击、天雷和首领倒下时震动 · reads the pads and shakes them on hits, thunder and a warden's fall | `src/main.mjs` |
| `bindGamepadKeys`（`@egret/engine/input/gamepad`） | 菜单和弹层里手柄的十字键移动焦点、A 按下、B 返回 · in menus and overlays the d-pad moves the focus, A presses, B goes back | `src/main.mjs` |
| `createAudioMixer`（`@egret/engine/audio`）+ `createWebAudioBackend` | 混音器自己建，接上 Web Audio；限幅器防爆音 · the mixer made by the game on a Web Audio backend, with a limiter | `src/audio/sound.mjs` |
| `createAudioCues` + `encodeWav`（`@egret/engine/kit`） | 合成音效的冷却、同时发声上限和随机音高；配乐循环 · cooldowns, voice caps and pitch spread for the made sounds; the looping music | `src/audio/sound.mjs` |
| `createSaveStore` + `browserSaveStorage` | 设置、开到第几夜、每夜最好星数与用时；坏档另存后重新开始 · settings, nights open, best stars and times; a broken save set aside | `src/saves.mjs` |
| `createUiSemantics` + `createBrowserSemantics` | 读屏能读出按钮、开关和天雷键 · a screen reader finds the buttons, switches and the thunder seal | `src/main.mjs` |
| `runHeadless`（`@egret/engine/kit`） | 替身玩家整夜跑三夜，量时长与胜负 · the stand-in plays whole nights for length and outcome | `tools/balance.mjs` |

## 已验证 · Verified

- `node --test test/*.test.mjs`（Node 22，24 项全部通过）：规则——同种子同结果、符弩移动不出墙、瞄准离墙最近和会吐火的、击杀与魂珠计数、邪祟咬墙后消失、升级时给出三道不同的符法且整夜暂停、天雷充满前不能放和放出后全场受伤定身、首领按时现身并在倒下且清场后守住、城墙破了失守、星数、每道符法的效果（连弩、速射、朱砂、穿心、固城、火符、寒符、墨斗线、八卦镜）、全部叠满后升级改为修墙、替身玩家三夜各三个种子都在三到五分钟里结束且第一夜都守住；存档——新档只开第一夜、守住后记星数和最快用时并开下一夜、失守只记一次游玩、坏档另存、夜数越界重新开始、存储拒绝写入不报错、表达式箭头的 `update` 被拒；文字——两种语言齐全且占位符一致、每道符法每位首领每一夜都有名字、界面代码不写死中文；引擎副本——import map 一致、用到的入口都在副本里、规则文件不碰页面和引擎。 · All 24 Node tests pass: the rules, the save, the words and the engine copy.
- `node test/accept.mjs`（无头 Chromium 153，SwiftShader 软件渲染，540×960 与 960×540）：只用键盘——标题 Enter 到选夜，新档只开第一夜，Enter 开第一夜；→ 键移动符弩；符弩自己射击并击杀；鼠标在路面上按住把符弩领过去；Esc 暂停时整夜不动，再按 Esc 继续；升级时按 2 选第二道符法；天雷充满后空格放出；替身快进到首领将至量帧时间；整夜守住后结算、存档记星并开第二夜；切到英文后按钮读英文；Esc 回选夜；存档改坏后标题提示并重新开始；横屏窗口进入宽舞台。标题和选夜两张截图基线一致，控制台没有错误。 · The whole path by keyboard plus a mouse drag in headless Chromium, two baselines matching and a clean console.
- `node ../tools/quality.mjs NightWardens`：自动项全部达标，见 [QUALITY.md](QUALITY.md)。桌面帧时间 p95 16.8 ms（标题，无头 SwiftShader）；最忙的场景（第一夜首领将至）p95 33.4 ms，第三夜 190 秒 p50 16.7 ms，同一环境。 · Every automatic item passes; p95 16.8 ms on the title, 33.4 ms p95 in the busiest scene and 16.7 ms p50 on night three at 190 s, headless and software-drawn.
- `tools/balance.mjs`：结果见上一节 · results in the section above.

## 已知问题 · Known issues

- 没有在真机（手机、带显卡的桌面）上运行过；触屏走完一局、中端手机帧时间、切回后台后的声音和计时都「未运行」。帧时间只在 2 核容器的软件渲染里量过：最忙时 p95 33 ms、p50 16.7 ms，标题画面 p95 在 16.8 ms 和 33.3 ms 之间来回（模板自己的标题在这里也一样）。 · Not run on a real phone or a desktop with a GPU; touch play, phone frame times and sound after coming back are not run. Frame times come only from software rendering on a two-core container: p95 33 ms and p50 16.7 ms at the busiest, and 16.8 or 33.3 ms on the title from run to run (as with the template's own title there).
- WebGPU 后端只在代码里选用，没有在有 WebGPU 的浏览器里跑过；无头 Chromium 没有适配器，所以以上结果全是 WebGL2。 · The WebGPU backend is chosen in code but has not been run in a browser that has it; headless Chromium has no adapter, so every result above is WebGL2.
- 手柄只在代码里接上了：十字键、摇杆、A、B、Start 和震动没有用真手柄试过。 · The gamepad is wired in code only; the d-pad, stick, A, B, Start and the rumble have not been tried with a real pad.
- 读屏只在无头 Chromium 的无障碍树里查过名字，没有用真读屏器走过。 · Screen-reader names were checked only in headless Chromium's accessibility tree, not with a real screen reader.
- 平衡只来自替身玩家；真人的难度感受还没有试过。 · The balance comes only from the stand-in; how hard it feels to people has not been tried.

## 已解决 · Solved

- 首领一出场就报 `ANIMATION_OPTIONS_INVALID`：同一个动画控制器的两个标记都叫 `step`，引擎要求标记名各不相同，但错误信息没有说是哪一条（ENGINE-NOTES 1）。改成 `stepLeft` 和 `stepRight`。 · The warden's arrival raised `ANIMATION_OPTIONS_INVALID`: two markers of one controller were both named `step`, which the engine refuses without saying so (ENGINE-NOTES 1). Renamed `stepLeft` and `stepRight`.
- 最忙时软件渲染只有 12–15 帧：路面、暗角、雾和闪光层是几张整屏的半透明图，每张约 16 ms（ENGINE-NOTES 2）。暗角画进路面，路面改由页面画一次（`#road`），雾的粒子减到 24 个，闪光不用时隐藏：同类场景 p50 从 66.6 ms 降到 33.3 ms；再去掉和帧图里画好的影子重复的一层影子位图，降到 16.7 ms。 · At its busiest the game ran at 12–15 frames a second under software rendering: the road, the dark edge, the mist and the flash were full-screen translucent layers of about 16 ms each (ENGINE-NOTES 2). The edge went into the road, the road is drawn once by the page (#road), the mist is down to 24 particles and the flash hides when unused: a like scene went from p50 66.6 ms to 33.3 ms, and to 16.7 ms once a layer of shadow bitmaps, repeating the shadows painted into the frames, was gone.
- 画布下的 CSS 背景图不显示：给 WebGL 画布元素自己设的背景图在无头 Chromium 里画不出来（纯色和渐变可以）。改成画布下面单独一个 `#road`，大小随画布（ENGINE-NOTES 2）。 · A CSS background picture on the WebGL canvas element itself was not drawn in headless Chromium (colours and gradients were); the road is now its own element under the canvas, sized with it (ENGINE-NOTES 2).
- `createBrowserGame` 返回的对象是冻结的，也没有 `canvas`：游戏把画布留在自己的 `app.canvas` 上（ENGINE-NOTES 3）。 · The object `createBrowserGame` returns is frozen and has no `canvas`; the game keeps its canvas as `app.canvas` (ENGINE-NOTES 3).
- 灯笼鬼停在半路吐火，符弩只打离墙最近的，替身玩家第二、三夜全输：会吐火的算作近 260，优先挨打。 · Lantern ghosts stopped halfway and spat fire while the crossbow shot only the nearest to the wall, so the stand-in lost every second and third night; a spitter now counts as 260 nearer.
- 开局四五秒没有一箭：射程 620 够不着刚出现的纸人，改成 760，覆盖整条可见的路。 · No shot for the first few seconds: a reach of 620 did not cover newly come paper dolls; 760 covers the whole road in view.
- 选完符法后空格放不出天雷：键盘焦点还停在已隐藏的卡片上，空格被它接走；弹层关闭时清掉焦点。 · After a ward was chosen Space did not call the thunder: the focus stayed on a hidden card, which took the key; closing an overlay now clears the focus.
- 390×844 的手机竖屏上画面上下有黑边，英文夜名压住进度条：竖屏舞台的高度改为随屏幕比例（960–1170），多出的高度放在路面下面，天雷键落在拇指的位置，这块也能拖动符弩；状态栏重新排位。 · On a 390 × 844 phone the picture had bands above and below, and the English night name ran into the progress bar: the tall stage now takes the screen's shape (960 to 1170 high), the extra room sits under the road with the thunder seal under the thumb and steering there too, and the bars were laid out again.
- 暂停后按 Esc 不能继续：Esc 绑的是「暂停」，而暂停时再暂停什么也不做；改成按一下切换。 · Escape did not resume, as it was bound to pause, which did nothing when paused; it now toggles.

## 未完成 · Unfinished

- 真机上的触屏、帧时间、后台切回和 WebGPU 后端 · touch, frame time, coming back and the WebGPU backend on real devices.
- 无尽模式和每日挑战（固定种子） · an endless mode and a daily challenge on a fixed seed.
- 更多邪祟和首领的招式（白无常的锁链拉人、旱魃的火圈） · more haunts and warden moves (White Impermanence's chain, the Drought Fiend's ring of fire).
- 符法组合的专属效果（例如火符加雷引） · effects for combinations of wards, such as fire with the thunder chain.

## 目录结构 · Layout

| 路径 · Path | 用途 · What it is for |
|---|---|
| `index.html`、`style.css` | 页面、import map、画布下的 `#road` · the page, the import map, `#road` under the canvas |
| `src/main.mjs` | 建游戏、存档、声音、手柄、语义树和键位，在画面之间切换 · makes the game, save, sound, pads, semantics and keys; moves between screens |
| `src/screens.mjs` | 标题、选夜、守城（状态栏、三选一、暂停）、结算、设置 · title, nights, the watch (bars, ward choice, pause), end, settings |
| `src/view/field.mjs` | 战场画面：对象池、帧动画、首领动画控制器、粒子、着色、震屏 · the battlefield: pools, frames, the warden's controller, particles, tints, shake |
| `src/art/paint.mjs`、`src/art/atlas.mjs` | 用代码画的全部美术，以及图集、精灵表和帧片段 · every picture, painted in code; the atlases, sheet and clips |
| `src/sim/` | 规则（`world.mjs`）、数字（`data.mjs`）、随机数、替身玩家 · the rules, the numbers, chance and the stand-in |
| `src/audio/sound.mjs` | 合成的音效和配乐，混音器与音效提示 · made sounds and music, the mixer and cues |
| `src/ui/kit.mjs` | 按钮、开关、面板和文字 · buttons, switches, panels and words |
| `src/i18n.mjs`、`src/saves.mjs` | 文字表；存档 · the word table; the save |
| `tools/balance.mjs` | 替身玩家整夜跑三夜 · whole nights by the stand-in |
| `test/` | Node 测试、浏览器验收和截图基线 · Node tests, browser acceptance and baselines |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

- 引擎提交 · Engine commit：`a778bed53ecdbf9c65e9abc5624d4b3751a4331d`（与 `vendor/SOURCE.md` 一致 · as in `vendor/SOURCE.md`）。
- 生成命令 · Made with（在引擎仓库里 · in the engine repository）：

```sh
node tools/vendor-game.mjs ../PortedGamesEgret/NightWardens @egret/engine @egret/engine/ui @egret/engine/ui/semantics \
  @egret/engine/web/semantics @egret/engine/kit @egret/engine/web/kit @egret/engine/web/game @egret/engine/audio \
  @egret/engine/web/audio @egret/engine/text @egret/engine/web/text @egret/engine/particles @egret/engine/animation \
  @egret/engine/layout @egret/engine/input/gamepad @egret/engine/web/gamepad @egret/engine/webgpu @egret/engine/webgl2
```

- 用到的入口 · Entries used：`@egret/engine`、`@egret/engine/web/game`、`@egret/engine/animation`、`@egret/engine/particles`、`@egret/engine/layout`、`@egret/engine/ui`、`@egret/engine/ui/semantics`、`@egret/engine/web/semantics`、`@egret/engine/kit`、`@egret/engine/web/kit`、`@egret/engine/audio`、`@egret/engine/web/audio`、`@egret/engine/input/gamepad`、`@egret/engine/web/gamepad`；`@egret/engine/webgpu` 和 `@egret/engine/webgl2` 由 `createBrowserGame` 按浏览器载入 · loaded by `createBrowserGame` as the browser allows.
- 在 Node 里跑规则和工具 · In Node：`node --import ./vendor/node-register.mjs tools/balance.mjs`。
