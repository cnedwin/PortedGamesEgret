# Jelly Pandas · 果冻熊猫

## 简介 · Introduction

果冻熊猫是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的 3D 动作生存游戏 Demo。半透明的果冻熊猫要在玩具岛上抵挡越来越多的糖果大军十五分钟：玩具自动开火，软弹的身体本身也是武器，每次升级选一张强化卡，第 5、10、15 分钟各有一个 Boss。 [在线试玩](https://cnedwin.github.io/PortedGamesEgret/jelly-pandas/)

Jelly Pandas is an independently developed 3D action survival demo built with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). See-through jelly pandas hold a toy island for fifteen minutes against a growing candy horde: toys fire on their own, the wobbly body is a weapon too, every level brings an upgrade card, and a boss arrives at 5, 10 and 15 minutes. [Play online](https://cnedwin.github.io/PortedGamesEgret/jelly-pandas/)

## 玩法 · How to play

| | 键盘和鼠标 · Keyboard and mouse | 手柄 · Gamepad | 触屏 · Touch |
|---|---|---|---|
| 移动 · Move | W A S D / ↑ ↓ ← → | 左摇杆 · left stick | 白鹭原生左摇杆 · native Egret left stick |
| 视角 · Look | 鼠标 · mouse | 右摇杆 · right stick | 拖动右侧空白处 · drag an open area on the right |
| 跳跃，长按蓄力大跳 · Jump, hold for a super jump | Space | A | 原生跳跃键（长按）· native Jump (hold) |
| 空中下砸，地面肚皮撞 · Slam in the air, belly bump on the ground | Ctrl / 左键 left click / Q | B | 原生下砸键 · native Slam |
| 翻滚 · Roll | Shift / 右键 right click / E | X | 移动时按住原生翻滚键 · hold native Roll while moving |
| 选卡，重抽 · Pick a card, reroll | 1 2 3，R | 方向键 ← ↑ → · direction pad，Y | 点卡片或重抽 · tap the card or Reroll |
| 菜单 · Menu | Esc / P | Start | 原生暂停键 · native Pause |

- 八只熊猫拥有各自的立绘、脸部表情、肚皮花纹和初始玩具。选角会显示玩具打法。可单人游玩，也可带一到三位由游戏操控的伙伴，站到倒下的熊猫身边可以救起它。[角色设计稿](CHARACTER-DESIGN.md)
- 「果冻三连」奖励尝试三种主动动作。空中下砸、地面肚皮撞和翻滚各命中一次，就能拿到一次共享经验。
- 首轮升级可在强化初始玩具、搭配进化护符和换一种新玩具之间选择。精英和首领掉落的宝箱会给已有装备升级，升满之后仍有经验。
- 十二种玩具，各有八级和一次进化（升到满级并拥有对应护符）；十二种护符，各有五级。
- 七种糖果敌人、戴皇冠的精英、定时出现的狂潮和三个 Boss。
- 敌人都是物理刚体：会挤成一堆、被打飞、互相撞伤、摔伤、掉进海里；沙滩球和木桶可以推进敌群。

- Eight pandas with their own portraits, expressions, belly stamps and starter toys. The picker shows how each toy plays. Go solo or bring one to three AI friends, and stand beside fallen pandas to revive them. [Character designs](CHARACTER-DESIGN.md)
- The Jelly Hat Trick awards shared XP once per run for landing an air slam, a belly bump and a roll.
- Your first upgrade offers a starter upgrade, its evolution charm or a new toy. Elite and boss chests upgrade gear you already own or grant XP when the build is maxed.
- Twelve toys with eight levels and an evolution each (reach the top level and own the matching charm), and twelve charms with five levels.
- Seven kinds of candy, crowned elites, timed surges and three bosses.
- Every enemy is a physics body: they pile up, get thrown, hurt each other when they collide, take fall damage and drown in the sea; beach balls and barrels can be shoved into the crowd.

游戏支持键鼠、手柄和手机触屏。音乐和音效都由 Web Audio 实时生成。标题界面可以切换画质（高、中、低），帧率不足时请调低。

The game supports keyboard and mouse, gamepad, and mobile touch controls. Music and sound effects are generated with Web Audio. The title screen has a quality setting (high, medium, low); lower it if the frame rate drops.

## 运行与开发 · Run and develop

游戏是纯静态页面，无需构建。在本目录启动任意静态文件服务器，然后打开显示的地址：

The game is a static page with no build step. Start any static file server in this folder and open the address it prints:

```sh
npx serve .
```

地址参数 · Address options：

| 参数 · Option | 作用 · Effect |
|---|---|
| `?lang=zh` / `?lang=en` | 界面语言 · interface language |
| `?backend=webgpu` | 使用 WebGPU 绘制 · draw with WebGPU |
| `?jelly=0` | 用普通光泽材质代替透明身体 · plain glossy pandas instead of see-through ones |
| `?post=0` / `?ssao=0` / `?shadows=0` / `?reflect=0` | 关闭后处理、环境遮蔽、阴影、水面倒影 · turn off post-processing, ambient occlusion, shadows, water reflection |
| `?ratio=1` | 限制像素比以提高帧率 · cap the pixel ratio for a higher frame rate |
| `?seed=123` | 固定随机种子 · fix the random seed |
| `?diag=1` | 开启独立的 2D/3D 帧 CPU 与 Host 时序观测，只用于诊断 · opt in to 2D/3D CPU and Host timing diagnostics |
| `?stats=1` | 显示帧率、各阶段耗时、绘制次数与三角形数 · show the frame rate, the time each part of a frame takes, draw calls and triangles |

### 测试 · Tests

使用 Node.js 22 或更新版本，在本目录运行：

Use Node.js 22 or later and run from this folder:

```sh
node --test
```

不开页面打完一整局（参数为队伍人数、种子、分钟数，均可省略），每分钟输出一行，适合检查规则和数值改动：

Play a whole run without a page (party size, seed and minutes are optional). It prints one line per minute and suits checking changes to rules and numbers:

```sh
node tools/headless.mjs 4 7 17
```

原生界面验收、多屏检查与性能对照（需要仓库根目录的 Playwright 依赖）。 · Native UI acceptance, multi-screen verification and performance sampling (requires the repository Playwright dependency):

~~~sh
node --test test/*.test.mjs
node test/accept.mjs
node test/visual-accept.mjs
node vendor/egret.mjs verify
node vendor/egret.mjs verify --screens --play test/screen-route.mjs --out <output>
node test/performance.mjs
~~~

[UI-MIGRATION.md](UI-MIGRATION.md) 记录界面迁移对应表和复跑参数；[QUALITY.md](QUALITY.md) 记录实测结果及限制。 · The migration map and rerun parameters are in UI-MIGRATION; measured results and limitations are in QUALITY.

## 引擎用法 · How it uses the engine

游戏使用白鹭 World3D，默认以 WebGL2 绘制。各部分对应的引擎功能如下。

The game uses Egret World3D and draws with WebGL2 by default. Each part maps to an engine feature as follows.

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `createCharacterMotor3D` + `PhysicsWorld3D` | 熊猫行走、跳跃、推动道具 · Pandas walking, jumping and pushing props | `src/sim.mjs` |
| 每个敌人一个刚体球，用碰撞层与熊猫分开 · one rigid sphere per enemy, kept apart from pandas by collision layers | 糖果敌群 · The candy horde | `src/sim.mjs` |
| `createMeshShape3D` 静态三角网格 · static triangle mesh | 岛屿碰撞 · Island collision | `src/sim.mjs` |
| 球体与凸包刚体 · sphere and convex-hull rigid bodies | 沙滩球和木桶 · Beach balls and barrels | `src/sim.mjs` |
| `createGlassMaterial3D` + 程序生成的花纹纹理 · generated pattern textures | 果冻身体、独立清漆高光、缓存花纹 · Jelly bodies, clearcoat highlights and cached belly stamps | `src/panda.mjs` |
| `createJelly3D` | 蓄力、跳跃、翻滚、受击与回弹 · Charged jump, roll, impact and rebound | `src/panda.mjs` |
| `createTrail3D` | 拖尾 · Trails | `src/view.mjs` |
| `createCustomShader3D` 顶点钩子 · vertex hook | 植被随风摆动、被角色拨开 · Plants swaying in the wind and parting around characters | `src/wind.mjs` |
| `InstancedMesh3D` 逐实例颜色 · per-instance colour | 敌群、弹丸、糖粒、树木和真实范围/方向预警 · Horde, shots, sprinkles, trees and rule-linked hazard telegraphs | `src/view.mjs` |
| `createWater3D` 波浪与倒影 · waves and reflection | 海面、浅滩泡沫与保留式反射 · Shore foam and retained sea reflections | `src/view.mjs` |
| `createParticleEmitter3D` | 特效 · Effects | `src/view.mjs` |
| `createFollowCamera3D` | 相机 · Camera | `src/main.mjs` |
| `createWorld3DOverlay` + `renderMode: 'on-demand'` | 持久透明原生 HUD 和菜单，静止界面保留帧 · Persistent transparent HUD and retained static menus | `src/main.mjs`, `src/hud.mjs` |
| `createUiRoot`, `createUiScreenStack` | 标题、设置、说明、选卡、暂停、结算和加载失败页面与模态 · Managed menu pages and modals | `src/ui/menus.mjs` |
| `createSelectionGroup`, `createActionControl`, `createControlKeys`, `createHoverControl` | 选角、人数、卡片、按键焦点及悬停 · Roster, party, cards, keyboard focus and hover | `src/ui/menus.mjs` |
| `createMovementControl`, `createActionControl` | 固定中心多指摇杆、按住跳跃和翻滚、下砸、原生轻触暂停 · Fixed-centre multi-contact stick, held jump/roll, slam and native tap pause | `src/ui/touch.mjs`, `src/input.mjs` |
| `game.screen.safe`, `game.onScreenChange`, `uiScale` | 九屏安全区和原地转屏排版 · Nine-screen safe layout and in-place orientation changes | `src/hud.mjs`, `src/ui/menus.mjs`, `src/ui/touch.mjs` |
| `createUiSemantics`, `createBrowserSemantics`, `createUiTester` | 非指针辅助语义、原生命中边界和按名称验收 · Accessible semantic projection and named acceptance | `src/hud.mjs`, `test/screen-route.mjs` |
| `createOverlayScreenMarkers3D` | 原生固定池的伤害数字与救援标记，安全区避让 · Pooled native damage and rescue markers with safe-area handling | `src/ui/markers.mjs` |
| `createGlyphFont`, `createBitmapText`, `createParagraphLabel`, `createAtlasLabel`, `Bitmap.sourceRect` | 引擎固定字形、自动换行、文字图集及原生角色头像 · Engine glyph pages, measured paragraphs, atlas text and native portraits | `src/ui/play-hud.mjs`, `src/ui/menus.mjs` |
| `createTextTable` | 画布 UI 与语义同步切换语言 · Shared language table for canvas UI and semantics | `src/hud.mjs` |
| Engine 时钟 · Engine clock，`createWorld3DView`，`startWorld3DLoop` | 帧循环与可选时序观测 · Frame loop and opt-in timing observers | `src/main.mjs` |
| 级联阴影、天空环境光、环境遮蔽、泛光、FXAA · cascaded shadows, sky lighting, ambient occlusion, bloom, FXAA | 画面 · Look | `src/view.mjs` |

模型、3D 纹理和音效由代码生成，选角与队伍头像共用一张角色概念图。

3D models, 3D textures and sounds are generated in code. The picker and party portraits share one concept art atlas.

## 已验证 · Verified

- 2026-11-28：同步引擎 [#545](https://github.com/cnedwin/Egret_rebuild/pull/545) 正式主干 `8424ff2a`。49/49 Node、168/168 浏览器验收、7/7 引擎 verify；旧标题/结算基线仍通过（0.55% / 0.40% 差异），无需更新。原生标记、多指控件、文字和字形替换均保留旧规则/存档。九规格 108 检查点预验收全通过；真实 RTX 5090 PC 与 Fold7 对照数据及最终手机连接限制见 [QUALITY.md](QUALITY.md)。 · The merged engine runtime passed all game unit, functional-browser and basic verify checks. The reviewed existing screenshot baselines still pass. Nine-device-profile prequalification and physical hardware A/B evidence are recorded separately.
- 2026-11-27 独立画质版：44/44 Node、163/163 浏览器及 40/40 视觉专项；同场景 RTX 5090 中/高画质 p95 6.1 ms；Fold7 新版流程 48/48 与标题修正 20/20、密集采样 p95 28.0 ms、RAF p95 16.7 ms；硬件 WebGPU 启动、移动、暂停 smoke 通过，未跑整局。见 [QUALITY.md](QUALITY.md)。 · Separate visual pass: 44 Node, 163 browser and 40 visual assertions, hardware RTX p95 6.1 ms, 48+20 Fold7 physical assertions, dense p95 28.0 ms and RAF p95 16.7 ms; hardware WebGPU startup/movement/pause smoke only.
- 2026-11-27：原生 UI 迁移 34/34 Node 测试、161/161 浏览器验收、引擎 verify 7/7、九屏 108/108 检查点（0 错误/警告），包括横竖屏保留、原生多点、最后一次重抽、完整胜败及旧存档恢复。通用 T2/T3/I1/E2 和 S1–S3 已通过；软件 F1 帧尾问题仍见 QUALITY/ENGINE-NOTES。 · Native migration passed 34 Node, 161 browser assertions, seven basic verify checks and 108 screen checkpoints. Generic targets, English, retry and settings checks pass; software F1 remains an open performance issue.

- 2026-11-27：仅刷新引擎至 `2fbe5563`、保留 DOM 界面。原 24 项 Node 测试全部通过，官方浏览器 verify 7/7；同一种子既有规则推进至首个 Boss，实际选角、移动、暂停、升级重抽和选卡正常，首领在 300 秒生成并击败。SwiftShader 软件浏览器，长路线使用固定输入规则步进，不代表真机自然游玩。 · Engine-only baseline: 24/24 Node, 7/7 browser checks; same-seed rule-step route reached and defeated the first boss, with actual menu and keyboard actions. Headless software Chromium, not physical play.

- 2026-11-21 引擎副本升级到 `b5628eb` 后：24 项 Node 测试和无页面整局通过；无头 Chromium 下开局后移动、跳跃 35 秒无控制台错误。 · After the engine update: 24 tests and a headless run pass, and 35 s of play run clean.
- 2026-11-21 在提交 `fc1dacb`、Node 22.23.4 下运行 `node --test test/*.test.mjs`：24 项全部通过（规则、熊猫、输入）。 · `node --test` at commit `fc1dacb` with Node 22.23.4: all 24 tests pass.
- 提交 `ddd18ce` 记录的测量：高画质、约 190 个敌人的忙碌时刻，每帧三角形从 480 万降到 100 万以下，绘制次数从约 500 降到约 340；四只熊猫无页面整局的规则每步从 1.59 ms 降到 1.28 ms。测量的设备和浏览器没有记录。 · Recorded in `ddd18ce`: triangles a frame from 4.8 million to under 1 million and draw calls from about 500 to 340 in a busy moment; a rules step from 1.59 to 1.28 ms. The device used was not recorded.
- 2026-11-20 `node tools/quality.mjs jelly-pandas` 在无头 Chromium + SwiftShader 下测了 16 个自动项，结果见 [QUALITY.md](QUALITY.md)；软件渲染下帧时间一项不代表真机。 · The 16 automatic quality items in headless Chromium; its frame time says nothing of real devices.

## 已知问题 · Known issues

- 海面倒影里不画阴影和小物件（植物、敌群、弹丸、拾取物、粒子），这是为了省绘制而有意去掉的。 · The sea's mirror leaves out shadows and small things on purpose, to save drawing.
- 品质验收未达标 · Quality items failing（[QUALITY.md](QUALITY.md)，2026-11-28，无头 Chromium + SwiftShader · headless, software rendering）：F1 桌面帧时间 p95 ≤ 16.7 ms（p95 320.8 ms over 27 frames）；L1 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4）（10.4 s to the first playable screen, 3.2 MB）。

## 已解决 · Solved

- 引擎 #545 的固定圆心、Tap、悬停、相对位移、原生世界标记及段落/字形接口已接入；移除额外 DOM 浮字和旧输入、文字适配器。字形模块加载失败也显示原生重试。 · Adopted the native APIs and removed the legacy adapters; native Retry also covers a refused glyph resource.
- 原 DOM/CSS 标题、HUD、升级、暂停、结算及触控已迁移到引擎原生 UI；伙伴选择触控尺寸、英文残留、加载重试修复，原 3D 画布保持全屏。 · Replaced DOM/CSS screens, HUD and controls with native UI; fixed target sizes, untranslated English-mode text and retry.

- 每帧三角形太多：眼睛、花瓣、草叶、茎和弹丸用更粗的形状，海面倒影不画阴影和小物件，阴影从三级减到两级（`ddd18ce`）。 · Too many triangles; coarser small shapes, a leaner sea mirror and two shadow cascades.
- 第一次出现的特效、倒影里熊猫的脸、宝石和弹丸各自要新编译管线，开局卡顿：在标题画面里先画一遍，并让弹丸、宝石沿用敌群的顶点布局（`f3cbec0`、`d016836`、`e5ca02e`、`13783f8`，ENGINE-NOTES 第 1、2 条）。 · First-use effects, the face in the mirror, gems and shots each compiled a pipeline; they are drawn on the title, and shots and gems share the horde's vertex layout (items 1 and 2).
- 触屏拖动会被别的控件抢走（`e5da770`）；触屏上第二根手指可以暂停（`46a3909`）；启动时设置页面语言（`4a6e4e9`）；升级卡片在触屏上更易读（`94bb21a`）。 · Touch drags stay with the control they began on; a second finger pauses; the page language is set at launch; upgrade cards read better on touch.

## 未完成 · Unfinished

- 软件 Chromium 的叠加层帧尾长延迟，见 ENGINE-NOTES 第 8 条；RTX 5090/D3D11 硬件对照 p95 6.0 ms，未复现软件长尾，其他 GPU 与 WebGPU 整局/性能尚待验收。 · Software-overlay tail latency remains open; RTX 5090/D3D11 passed the hardware p95 sample at 6.0 ms; other GPUs and WebGPU whole-run/performance remain unqualified.
- 真机触控整局、物理手柄、实际读屏软件、Safari、Firefox、微信内置浏览器及其他硬件 GPU、WebGPU 整局与性能验收。 · Whole-run physical touch, physical controller, assistive technology, Safari, Firefox, WeChat browser and other GPU and WebGPU whole-run/performance qualification.

## 目录 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `index.html`, `style.css` | 全屏画布与启动失败纯文本；浮字也由引擎绘制 · Full-screen canvas and bootstrap error; the engine also renders floating markers |
| `src/main.mjs` | 启动与每帧流程 · start-up and the frame |
| `src/sim.mjs`, `src/toys.mjs` | 游戏规则，不依赖页面 · the rules, no page needed |
| `src/data.mjs` | 熊猫、玩具、护符、敌人、Boss 和双语文字 · pandas, toys, charms, enemies, bosses and text in both languages |
| `src/island.mjs` | 绘制与碰撞共用的岛屿高度网格 · the island height grid shared by drawing and collision |
| `src/view.mjs`, `src/panda.mjs`, `src/wind.mjs` | 3D 画面与植被的风 · everything drawn in 3D, and the wind in the plants |
| `src/hud.mjs`, `src/ui/` | 原生叠加层、菜单、HUD、标记及触屏 · Native overlay, menus, HUD, markers and touch |
| `src/input.mjs`, `src/audio.mjs`, `src/save.mjs` | 输入、音效及旧设置存档 · Input, sound and compatible settings |
| `assets/panda-roster.webp` | 角色设定和头像图集 · character concepts and portrait atlas |
| `tools/`, `test/` | 无页面运行与规则测试 · headless run and rule tests |
| `vendor/` | 引擎运行时副本 · the engine runtime copy |

## 引擎副本 · Engine copy

`vendor/` 中是新白鹭引擎的运行时副本，采用 Apache-2.0 许可，引擎提交 `82561d6338a805f0e0459a2d5d42a284f9385b30`，来源和版本见 [vendor/SOURCE.md](vendor/SOURCE.md)。

`vendor/` holds a copy of the Egret Rebuild runtime under Apache-2.0; engine commit `82561d6338a805f0e0459a2d5d42a284f9385b30`; see [vendor/SOURCE.md](vendor/SOURCE.md) for its source and version.

由引擎工具生成，不手改副本。 · Generated without local patches:

~~~sh
node tools/vendor-game.mjs <PortedGamesEgret>/jelly-pandas @egret/engine @egret/engine/world3d @egret/engine/webgl2/world3d @egret/engine/webgpu/world3d @egret/engine/ui @egret/engine/ui/semantics @egret/engine/web/semantics @egret/engine/ui/testing @egret/engine/input @egret/engine/bitmapfont @egret/engine/kit
~~~
