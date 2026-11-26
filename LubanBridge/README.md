# 鲁班造桥 · Luban's Bridges

## 简介 · Introduction

《鲁班造桥》是基于[新白鹭引擎](https://github.com/cnedwin/Egret_rebuild)独立开发的 2D 物理造桥解谜游戏 Demo。取自民间「赵州桥，鲁班修」的传说：你是鲁班门下的匠人，走遍江南、赵州、蜀道、潮州和侗乡，在网格上搭木梁、竹架、石拱、悬索和浮桥，让挑夫、花轿、马车和运石车过河。点「试通」后桥身按真实的受力弯曲、变色，太吃力的杆件会拉断或压坏，掉进河里。五章二十五关，每章最后重建一座名桥，另有不限预算的沙盒。画面结合原创青绿水彩原画与实时界画绘制，配乐与拟音均在本作内合成。网页版可直接试玩，并提供微信小游戏导出与替身验收流程。[在线试玩](https://cnedwin.github.io/PortedGamesEgret/LubanBridge/)

*Luban's Bridges* is a 2D physics bridge-building puzzle game demo independently developed on the [new Egret engine](https://github.com/cnedwin/Egret_rebuild). It takes the folk saying that the carpenter Lu Ban built the Zhaozhou Bridge: you are one of his apprentices, travelling through Jiangnan, Zhaozhou, the Shu Road, Chaozhou and Dong country, laying timber beams, bamboo frames, stone arches, suspension cables and pontoon bridges on a grid so that porters, a bridal sedan, horse carts and a stone wagon can cross. On Test the bridge bends and colours with its real loads, and a member that works too hard tears or crushes and falls into the river. Five chapters of five levels, each ending with a famous bridge to build again, and a sandbox without a budget. Original blue-green watercolor plates sit behind ruled-line, real-time engineering drawings. Music and foley are composed and synthesized in the project. Play the web version directly; a WeChat export and stand-in verification workflow is also provided. [Play it online](https://cnedwin.github.io/PortedGamesEgret/LubanBridge/)

## 玩法与操作 · How to play

目标：用预算内的材料搭一座桥，让这一关的车队全部过河。三枚印章：过桥、不超预算（省钱）、一根杆件都没断（无损）。每章教一样新东西——江南是木梁和三角形，赵州是只受压的石拱，蜀道是只受拉的绳和铁链，潮州是浮舟和给船留的航道，侗乡是在河里立石墩。

The goal: a bridge within the budget that gets every cart of the level across. Three seals: across, within budget (thrift), and not one member broken (unbroken). Each chapter teaches one thing — Jiangnan beams and triangles, Zhaozhou stone arches that only take a push, the Shu Road ropes and chains that only pull, Chaozhou pontoons and a channel left for boats, Dong country piers raised in the river.

| 操作 · Action | 鼠标 · Mouse | 触屏 · Touch | 键盘 · Keys | 手柄 · Gamepad |
|---|---|---|---|---|
| 搭一根杆件 · Lay a member | 从一个格点拖到另一个 · drag from point to point | 一指拖 · drag a finger | 方向键移光标，空格/回车定两端 · arrows, then Space/Enter at each end | 十字键 + A · d-pad + A |
| 拆 · Take down | 右键，或「拆」模式点它 · right click, or tap in Take down mode | 长按 · long press | Delete / X | X |
| 换材料 · Change material | 点材料 · tap it | 点材料 · tap it | 1–7，Q / E | LB / RB |
| 缩放、平移 · Zoom, pan | 滚轮；拖空白处 · wheel; drag empty sky | 双指；双击复位 · two fingers; double tap fits | + / − | — |
| 撤销、重做、对称 · Undo, redo, mirror | 按钮 · buttons | 按钮 · buttons | Z / Y / M | — |
| 试通 · Test | 「试通」· Test | 「试通」· Test | T | Y |
| 菜单 · Menu | 「菜单」· Menu | 「菜单」· Menu | Esc | B |

Tab 在按钮之间移动焦点，回车按下；读屏软件能念出每个按钮。 · Tab moves the focus between buttons and Enter presses one; a screen reader names every button.

## 画面与声音 · Pictures and sound

封面、江南、赵州、蜀道、潮州、侗乡五幅远景，以及三种河岸树木，均是为本作创作的原创美术。九张 JPEG/PNG 约 1.73 MB，由白鹭 `game.image` 按当前场景加载；若资源不可用，使用程序绘制的风景，并提供「重试画卷」。桥梁、锚点、岸、桥楼、浮舟、车马、碎木以及施工时的受力颜色仍由引擎 `Graphics` 按米实时绘制。绢帛、墨绿、朱砂与黄铜边框贯穿标题、关卡册、施工台、材料色签及印章。预算条实时反映造价，横屏触控区按实际舞台缩放调整。没有第三方美术素材。

配乐是 48 秒原创立体声循环，古琴拨弦与箫交替；工地使用 12 秒独立的流水环境声。24 种原创拟音区分木、竹、石、绳、铁链、浮舟的搭建和断裂，并覆盖车轮、落水、操作和结算。使用白鹭音频混音器，音乐和音效独立控制，页面隐藏时停止出声。

The nine original pictures include the gorge cover, five regional watercolor plates, and three transparent riverbank tree sprites (JPEG/PNG, about 1.73 MB). Egret `game.image` loads just the current scenery; vector artwork remains playable if a decorative image cannot load, with a retry action. The bridge, anchors, cutaway banks, towers, pontoons, carts, debris and load colors are live vector drawing in metres. Silk, ink green, cinnabar and brass unify the menus and workshop; the budget meter and material swatches convey state, with landscape touch targets scaled for the actual canvas. No third-party artwork.

The original 48-second stereo score alternates plucked guqin and a xiao-like melody. A separate 12-second river loop accompanies the workshop. Twenty-four synthesized cues distinguish timber, bamboo, stone, rope, chain and pontoon placement/removal/fracture, cart movement, water, UI and results. Egret's mixer provides independent music/effect controls and silences the page while hidden.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `@egret/engine/play` `play` | 一次调用建好画布、舞台、按键、按需渲染、横竖屏 · one call for the canvas, stage, keys, on-demand rendering and both orientations | `src/main.mjs` |
| `@egret/engine/physics2d` `createPhysicsWorld`, `addJoint` | 车轮、车与牲口间的杆和绳、跟着桥身走的桥面运动刚体、落水的碎木石 · wheels, the rods and ropes between carts and beasts, kinematic deck bodies following the frame, broken timber and stone | `src/sim/run.mjs` |
| `@egret/engine/web/gestures` `createGestures` | 拖动搭杆、长按拆、双指缩放平移、双击复位 · drag to lay, long press to take down, pinch to zoom and pan, double tap to fit | `src/view/build.mjs` |
| `@egret/engine/web/hover` `createBrowserHoverInput` | 鼠标悬停显示杆长和造价，滚轮按指针缩放 · hover shows a member's length and price, the wheel zooms at the pointer | `src/view/build.mjs` |
| `@egret/engine/web/view` `planView` | 选关的版面：一行一章，横竖屏都排好 · the level choice laid out, a row a chapter, wide or tall | `src/view/screens.mjs` |
| `@egret/engine/web/screen` `planScreen` | 小游戏里按手机的刘海和底部横条算出安全区 · the safe area from the phone's notch and home bar in a mini game | `src/main.mjs` |
| `@egret/engine/ui/testing` `createUiTester` | `?check=1` 时按语义树自检一遍「选关 → 试通 → 过桥」· the `?check=1` self check through the semantic tree | `src/check.mjs` |
| `@egret/engine/ui/semantics`, `@egret/engine/web/semantics` | 每个按钮在语义树里有节点，投影给读屏软件 · every button in the semantic tree, projected for screen readers | `src/view/kit.mjs`, `src/main.mjs` |
| `@egret/engine/audio` `createAudioMixer`, `@egret/engine/web/audio` `createWebAudioBackend` | 合成的音效和音乐在引擎混音器上播放 · the made sounds and music played on the engine's mixer | `src/audio/sound.mjs` |
| `@egret/engine/kit` `createSaveStore`, `createTextTable`, `encodeWav` | 带版本的存档、中英文字表、合成的声音编码 · the versioned save, the word table, encoding the made sounds | `src/saves.mjs`, `src/words.mjs`, `src/audio/sound.mjs` |
| `@egret/engine` `Sprite`, `Graphics` | 工程结构、角色与实时受力绘制 · Engineering geometry, vehicles and live load colors | `src/view/paint.mjs` |
| `game.image` | 按场景加载原创水彩、树木并释放图层资源 · On-demand original paintings and tree sprites with scope cleanup | `src/view/art.mjs` |
| `game.text({ vertical })` | 标题竖排 · the title set vertically | `src/view/screens.mjs` |

## 已验证 · Verified

- `node --test LubanBridge/test/*.test.mjs`：44 项通过（Node 24.22.3）。二十五关的参考解都合规、在预算内、在 Node 里让全部车队过河且一根不断；只铺桥面不加支撑的桥在每一关都过不去；同一张图纸两次结果完全相同；图纸的检查、对称、撤销、造价、读档；存档的印章、最低造价、解锁、坏档；中英文字表齐全；引擎副本与 import map 一致，规则只用引擎的 2D 物理。 · 44 tests pass in Node 24.22.3: every level's reference is valid, within budget, and gets every cart across in Node with nothing broken; a bare deck fails on every level; one drawing ends the same way twice; the drawing's checks, mirror, undo, cost and reading back; the save's seals, lowest cost, unlocking and broken saves; the word table; the engine copy and the import map. Four additional checks cover the stereo score, all material cues, looped river audio, and independent mixer controls.
- 23/23 浏览器自动回归（Windows Chrome / 无头 Chromium，1280×720 与 720×1280）：新版图像、第一关逐根搭建、撤销重做、右键拆、设置、三印结算/失败分支、立即进下一关、坏档、装饰资源故障回退与重试、三张截图基线。 · 23/23 browser checks: original pictures, piece-by-piece construction, undo/redo, removal, settings, three seals/failure, immediate next level, bad save, decorative image fallback and retry, and three screenshot baselines.
- PC 真机（RTX 5090 Laptop，Chrome 硬件 WebGL2 查询到的 ANGLE 渲染器）：实际键鼠搭完 1-1 五根杆件，78 两三印，撤销、重做、下一关、重载存档正常；五章各一张名桥画面检查。试通过程浏览器 rAF P95 4.3 ms，非 GPU 执行时间。 · Physical PC (RTX 5090 Laptop, Chrome ANGLE hardware renderer probe): mouse-built all five members, 78 taels and three seals, undo, redo, next level and reload; reviewed one famous-bridge view per chapter. Crossing browser rAF P95 4.3 ms, not GPU execution time.
- Samsung Galaxy Z Fold7（SM-F966U1，Android 17，Chrome 157，WebGPU）：横屏 873×325、竖屏 411×813 CSS px；CDP 向真实手机注入可信触屏事件，两种方向均逐根建桥获得 78 两三印、撤销重做、长按拆和读档；数字音频验证音乐开关、流水循环及实际音效启动。横屏试通采样 P95 16.7 ms / max 29.6 ms，竖屏 P95 16.7 ms / max 16.8 ms，均无 >50 ms 帧；实际控件高度约 45.14 / 49.09 CSS px。 · Physical Samsung Galaxy Z Fold7 (SM-F966U1, Android 17, Chrome 157, WebGPU), 873×325 landscape and 411×813 portrait CSS px. Trusted CDP touch events on the handset built the bridge to all three seals, 78 taels, undo/redo/long-press and reload in both orientations. Digital audio output verified music toggle, river loop and effect starts. Crossing rAF P95/max 16.7/29.6 ms and 16.7/16.8 ms respectively; no >50 ms sampled frames. Target heights about 45.14/49.09 CSS px.
- 微信替身（844×390）：对 Windows 导出器仅作临时 entry-point 路径放行后，2.59 MB 主包通过 8/8，原创图、触控搭杆、试通、保存及无额外 DOM 均通过；不是真实微信客户端。 · WeChat stand-in, 844×390: with a temporary Windows entry-point workaround, the 2.59 MB main package passed 8/8, including original images, drag, crossing, save and DOM isolation; not a native WeChat client.
- `node tools/quality.mjs LubanBridge`：结果见 [QUALITY.md](QUALITY.md)。 · Results in [QUALITY.md](QUALITY.md).

## 已知问题 · Known issues

- 初版软件渲染（SwiftShader）试通曾测得较高帧时间，静止背景每帧重画（ENGINE-NOTES 第 4 条）；本次实机采样见 QUALITY。本次没有把旧软件渲染数字当作新版实机结果。 · The earlier software-rendered crossing was slower (ENGINE-NOTES item 4); current physical-device samples are in QUALITY, separate from the old software baseline.
- 本次真机覆盖第一关而非 25 关全程；全部关卡的参考解和失败解由 Node 规则测试验证。数字音频不是扬声器实听；人工手指、实体手柄、微信开发者工具和其他型号仍未验收。 · Device coverage is the first level, not all 25 levels; every level's reference and failure are tested in Node. Digital audio is not a speaker-listening test; manual finger play, a physical gamepad, WeChat DevTools and other models are not covered.
- Windows 上引擎微信导出器会把盘符绝对入口路径误认为裸模块（旧版游戏同样复现）；实际打包结果和限制见 QUALITY。 · The engine's WeChat export tool on Windows misclassifies the drive-letter absolute entry path as a bare import; the previous game reproduces it too. See QUALITY for packaging checks and limitations.

## 已解决 · Solved

- 手机横屏控件由 18–26 CSS px 高改为实际约 45 px，设置面板竖屏留出触控间距；立即离开结算时不再访问已销毁的印章节点，装饰资源失败不阻断开工。 · Landscape controls grew from 18–26 CSS px to about 45 px; portrait Settings has separate touch targets, leaving animated results no longer touches disposed objects, and a missing decorative picture does not block play.

- 引擎的距离关节连成桁架太软、受力不对称、读不到力：桥身改由游戏自己的小步长位置约束求解，引擎物理只管刚体（ENGINE-NOTES 第 1 条）。 · Distance joints chained into a truss were soft, lopsided and gave no force: the frame is solved by the game's own small-step constraints, the engine's physics keeping the bodies (ENGINE-NOTES item 1).
- 桥面刚体转不过来、车停在坡前：刚体的 `angle` 是角度不是弧度（ENGINE-NOTES 第 2 条）。 · Deck bodies did not turn and carts stopped at slopes: a body's `angle` is in degrees, not radians (ENGINE-NOTES item 2).
- 只铺桥面的桥两端都固定时像一根绷紧的绳，能把车送过去：右岸的路端改成可以滑动的支座，滑出岸边半米就掉下去。 · A bare deck fixed at both ends acted as a tight rope and carried carts over: the right road end is a sliding bearing, and slides off the bank half a metre past its edge.
- 浮舟一开始就被浮力顶起、把桥面挤断：浮舟在造好的位置正好浮着，多出来的重量才让它下沉。 · Pontoons shot up at the start and crushed the deck: a pontoon floats where it was built, and only added weight sinks it.

## 未完成 · Unfinished

- 开合的吊桥段（绞盘起落）、风和桥面的横向晃动没有做。 · A drawbridge section raised by a winch, and wind with sideways sway, are not made.
- 沙盒里还不能选过桥的车。 · The sandbox does not yet let you choose who crosses.
- 引擎能力 `@egret/engine/input`、`input/hover`、`web/input` 没有用上：鼠标只认左键（ENGINE-NOTES 第 5 条），悬停用的是 `web/hover`。 · `@egret/engine/input`, `input/hover` and `web/input` are not used: mouse input knows only the left button (ENGINE-NOTES item 5), and hover goes through `web/hover`.

## 目录结构 · Layout

| 路径 · Path | 用途 · Purpose |
|---|---|
| `src/main.mjs` | 入口：存档、`play`、画面切换、按键、语义树 · the entry: save, `play`, screens, keys, semantic tree |
| `src/sim/` | 规则：材料、图纸、桥身求解、试通、关卡与参考解（只用引擎的 2D 物理，Node 里能跑）· the rules: materials, drawings, the frame solver, crossings, levels and references (only the engine's 2D physics; runs in Node) |
| `src/view/` | 画面：工地、标题与各种卡片、绘画、界面零件 · the view: the site, title and cards, painting, interface parts |
| `assets/` | 原创封面、五章水彩远景与三种树木 · Original cover, five watercolor plates and three trees |
| `src/audio/sound.mjs` | 原创配乐、环境声和材料拟音 · Original score, ambience and material foley |
| `src/words.mjs`, `src/saves.mjs`, `src/check.mjs` | 文字表、存档、自检 · words, save, self check |
| `test/` | Node 测试、浏览器验收、小游戏验收、截图基线 · Node tests, browser and mini game acceptance, baselines |
| `tools/levels-report.mjs` | 开发用：让每关参考解跑一遍，列出结果、最吃力的杆件和造价 · for development: each reference across, with the hardest-working member and the cost |
| `tools/wechat.mjs` | 导出微信小游戏 · exports the WeChat mini game |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

引擎提交 `a7be833b09ddad1936c79ff148c909cf452bea7f`（见 `vendor/SOURCE.md`），在引擎仓库用 `node tools/vendor-game.mjs ../PortedGamesEgret/LubanBridge <入口…>` 生成。用到的入口：`@egret/engine`、`play`、`kit`、`web/kit`、`ui/semantics`、`web/semantics`、`physics2d`、`web/gestures`、`web/hover`、`web/screen`、`web/view`、`ui/testing`、`audio`、`web/audio`。

Engine commit `a7be833b09ddad1936c79ff148c909cf452bea7f` (see `vendor/SOURCE.md`), made in the engine repository with `node tools/vendor-game.mjs ../PortedGamesEgret/LubanBridge <entries…>`. Entries used: `@egret/engine`, `play`, `kit`, `web/kit`, `ui/semantics`, `web/semantics`, `physics2d`, `web/gestures`, `web/hover`, `web/screen`, `web/view`, `ui/testing`, `audio`, `web/audio`.

## 开发 · Development

```sh
node --test LubanBridge/test/*.test.mjs
node LubanBridge/test/accept.mjs            # --update 重写基线 · writes the baselines again
node --import ./LubanBridge/vendor/node-register.mjs LubanBridge/tools/levels-report.mjs
node LubanBridge/tools/wechat.mjs --engine ../Egret_rebuild --esbuild <esbuild> --out <folder>
node LubanBridge/test/minigame.mjs --engine ../Egret_rebuild --folder <folder>
```
