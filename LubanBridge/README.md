# 鲁班造桥 · Luban's Bridges

## 简介 · Introduction

《鲁班造桥》是基于[新白鹭引擎](https://github.com/cnedwin/Egret_rebuild)独立开发的 2D 物理造桥解谜游戏 Demo。取自民间「赵州桥，鲁班修」的传说：你是鲁班门下的匠人，走遍江南、赵州、蜀道、潮州和侗乡，在网格上搭木梁、竹架、石拱、悬索和浮桥，让挑夫、花轿、马车和运石车过河。点「试通」后桥身按真实的受力弯曲、变色，太吃力的杆件会拉断或压坏，掉进河里。五章二十五关，每章最后重建一座名桥，另有不限预算的沙盒。画面用界画的笔法和青绿山水，全部用代码画出；声音也全部用代码合成。网页版和微信小游戏版都能完整玩通。[在线试玩](https://cnedwin.github.io/PortedGamesEgret/LubanBridge/)

*Luban's Bridges* is a 2D physics bridge-building puzzle game demo independently developed on the [new Egret engine](https://github.com/cnedwin/Egret_rebuild). It takes the folk saying that the carpenter Lu Ban built the Zhaozhou Bridge: you are one of his apprentices, travelling through Jiangnan, Zhaozhou, the Shu Road, Chaozhou and Dong country, laying timber beams, bamboo frames, stone arches, suspension cables and pontoon bridges on a grid so that porters, a bridal sedan, horse carts and a stone wagon can cross. On Test the bridge bends and colours with its real loads, and a member that works too hard tears or crushes and falls into the river. Five chapters of five levels, each ending with a famous bridge to build again, and a sandbox without a budget. The pictures are ruled-line painting over a blue-and-green landscape, all drawn in code; the sounds are all made in code too. Both the web version and the WeChat mini game can be played through. [Play it online](https://cnedwin.github.io/PortedGamesEgret/LubanBridge/)

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

画面全部用引擎的 `Graphics` 在代码里画，单位是米：杆件、山水、河岸、桥楼、浮舟、车马、碎木都是。声音和音乐用代码合成（拨弦、竹笛、木槌、绳响、断裂、落水），交给引擎的混音器。没有图片、音频或字体文件，也没有用任何第三方素材。

Every picture is drawn in code with the engine's `Graphics`, in metres: members, landscape, banks, gate towers, pontoons, carts and debris alike. Sound and music are made in code (plucked strings, a bamboo flute, a mallet, a thrumming rope, a crack, a splash) and played by the engine's mixer. There are no picture, sound or font files, and nothing made by others.

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
| `@egret/engine` `Sprite`, `Graphics` | 全部画面 · every picture | `src/view/paint.mjs` |
| `game.text({ vertical })` | 标题竖排 · the title set vertically | `src/view/screens.mjs` |

## 已验证 · Verified

- `node --test LubanBridge/test/*.test.mjs`：40 项通过（Node 22）。二十五关的参考解都合规、在预算内、在 Node 里让全部车队过河且一根不断；只铺桥面不加支撑的桥在每一关都过不去；同一张图纸两次结果完全相同；图纸的检查、对称、撤销、造价、读档；存档的印章、最低造价、解锁、坏档；中英文字表齐全；引擎副本与 import map 一致，规则只用引擎的 2D 物理。 · 40 tests pass in Node 22: every level's reference is valid, within budget, and gets every cart across in Node with nothing broken; a bare deck fails on every level; one drawing ends the same way twice; the drawing's checks, mirror, undo, cost and reading back; the save's seals, lowest cost, unlocking and broken saves; the word table; the engine copy and the import map.
- `node LubanBridge/test/accept.mjs`（无头 Chromium + SwiftShader，1280×720 与 720×1280）：全部通过。标题、设置（键盘关声音、切英文）、选关、用鼠标一根根搭出第一关的参考解、Z/Y 撤销重做、右键拆、T 试通拿到三枚印章、回车进下一关、只铺桥面的桥失败、竖屏工地、坏档；三张截图基线一致；控制台无错误。 · All pass in headless Chromium with SwiftShader at 1280 × 720 and 720 × 1280: title, settings (sound off by keyboard, English), levels, the first level's reference laid member by member with the mouse, undo and redo, a right click taking down, T to test with three seals, Enter on to the next level, a bare deck failing, the tall site, a broken save; three screenshot baselines match; the console stayed clean.
- `node LubanBridge/test/minigame.mjs`（引擎的微信替身，844×390）：6 项通过。用鼠标当手指从标题进第一关、拖出一根杆件、点「试通」、过桥并存进微信存储；页面上没有多出元素。导出包 0.92 MB，没有分包。 · 6 checks pass in the engine's WeChat stand-in at 844 × 390: a finger from the title into the first level, one member dragged out, Test tapped, across, saved in WeChat storage; nothing added to the page. The package is 0.92 MB with no subpackage.
- `node tools/quality.mjs LubanBridge`：结果见 [QUALITY.md](QUALITY.md)。 · Results in [QUALITY.md](QUALITY.md).

## 已知问题 · Known issues

- 软件渲染（SwiftShader）下试通时帧时间 p50 约 33–50 ms，因为静止的背景每帧都重画（ENGINE-NOTES 第 4 条）；有显卡的设备没有在这里测过。 · Under software rendering a test crossing runs at a p50 of about 33–50 ms, the still background being drawn every frame (ENGINE-NOTES item 4); devices with a GPU were not measured here.
- 横屏手机（如 844×390）上按钮约 34 CSS 像素高，低于 44；竖屏时达标。 · On a phone held sideways (844 × 390) buttons are about 34 CSS pixels tall, under 44; held upright they meet it.
- 真机、微信开发者工具、真实触屏和扬声器都没有运行过。 · Not run on real devices, in WeChat DevTools, with real touch or with speakers.

## 已解决 · Solved

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
| `src/audio/sound.mjs` | 合成的声音和音乐 · made sounds and music |
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
