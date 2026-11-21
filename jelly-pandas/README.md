# Jelly Pandas · 果冻熊猫

## 简介 · Introduction

果冻熊猫是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的 3D 动作生存游戏 Demo。半透明的果冻熊猫要在玩具岛上抵挡越来越多的糖果大军十五分钟：玩具自动开火，软弹的身体本身也是武器，每次升级选一张强化卡，第 5、10、15 分钟各有一个 Boss。 [在线试玩](https://cnedwin.github.io/PortedGamesEgret/jelly-pandas/)

Jelly Pandas is an independently developed 3D action survival demo built with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). See-through jelly pandas hold a toy island for fifteen minutes against a growing candy horde: toys fire on their own, the wobbly body is a weapon too, every level brings an upgrade card, and a boss arrives at 5, 10 and 15 minutes. [Play online](https://cnedwin.github.io/PortedGamesEgret/jelly-pandas/)

## 玩法 · How to play

| | 键盘和鼠标 · Keyboard and mouse | 手柄 · Gamepad | 触屏 · Touch |
|---|---|---|---|
| 移动 · Move | W A S D / ↑ ↓ ← → | 左摇杆 · left stick | 左侧屏幕摇杆 · left on-screen stick |
| 视角 · Look | 鼠标 · mouse | 右摇杆 · right stick | 拖动右侧空白处 · drag an open area on the right |
| 跳跃，长按蓄力大跳 · Jump, hold for a super jump | Space | A | 跳跃 · Jump |
| 空中下砸，地面肚皮撞 · Slam in the air, belly bump on the ground | Ctrl / 左键 left click / Q | B | 下砸 · Slam |
| 翻滚 · Roll | Shift / 右键 right click / E | X | 移动时按住翻滚 · hold Roll while moving |
| 选卡，重抽 · Pick a card, reroll | 1 2 3，R | 方向键 ← ↑ → · direction pad，Y | 点卡片或重抽 · tap the card or Reroll |
| 菜单 · Menu | Esc / P | Start | 暂停 · Pause |

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

## 引擎用法 · How it uses the engine

游戏使用白鹭 World3D，默认以 WebGL2 绘制。各部分对应的引擎功能如下。

The game uses Egret World3D and draws with WebGL2 by default. Each part maps to an engine feature as follows.

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `createCharacterMotor3D` + `PhysicsWorld3D` | 熊猫行走、跳跃、推动道具 · Pandas walking, jumping and pushing props | `src/sim.mjs` |
| 每个敌人一个刚体球，用碰撞层与熊猫分开 · one rigid sphere per enemy, kept apart from pandas by collision layers | 糖果敌群 · The candy horde | `src/sim.mjs` |
| `createMeshShape3D` 静态三角网格 · static triangle mesh | 岛屿碰撞 · Island collision | `src/sim.mjs` |
| 球体与凸包刚体 · sphere and convex-hull rigid bodies | 沙滩球和木桶 · Beach balls and barrels | `src/sim.mjs` |
| `createGlassMaterial3D` + 程序生成的花纹纹理 · generated pattern textures | 果冻身体 · Jelly bodies | `src/panda.mjs` |
| `createJelly3D` | 果冻抖动 · Jelly wobble | `src/panda.mjs` |
| `createTrail3D` | 拖尾 · Trails | `src/view.mjs` |
| `createCustomShader3D` 顶点钩子 · vertex hook | 植被随风摆动、被角色拨开 · Plants swaying in the wind and parting around characters | `src/wind.mjs` |
| `InstancedMesh3D` 逐实例颜色 · per-instance colour | 敌群、弹丸、糖粒、树木 · Horde, shots, sprinkles, trees | `src/view.mjs` |
| `createWater3D` 波浪与倒影 · waves and reflection | 海面 · The sea | `src/view.mjs` |
| `createParticleEmitter3D` | 特效 · Effects | `src/view.mjs` |
| `createFollowCamera3D` | 相机 · Camera | `src/main.mjs` |
| Engine 时钟 · Engine clock，`createWorld3DView`，`startWorld3DLoop` | 帧循环 · Frame loop | `src/main.mjs` |
| 级联阴影、天空环境光、环境遮蔽、泛光、FXAA · cascaded shadows, sky lighting, ambient occlusion, bloom, FXAA | 画面 · Look | `src/view.mjs` |

模型、3D 纹理和音效由代码生成，选角与队伍头像共用一张角色概念图。

3D models, 3D textures and sounds are generated in code. The picker and party portraits share one concept art atlas.

## 已验证 · Verified

- 2026-11-21 在提交 `fc1dacb`、Node 22.23.4 下运行 `node --test test/*.test.mjs`：24 项全部通过（规则、熊猫、输入）。 · `node --test` at commit `fc1dacb` with Node 22.23.4: all 24 tests pass.
- 提交 `ddd18ce` 记录的测量：高画质、约 190 个敌人的忙碌时刻，每帧三角形从 480 万降到 100 万以下，绘制次数从约 500 降到约 340；四只熊猫无页面整局的规则每步从 1.59 ms 降到 1.28 ms。测量的设备和浏览器没有记录。 · Recorded in `ddd18ce`: triangles a frame from 4.8 million to under 1 million and draw calls from about 500 to 340 in a busy moment; a rules step from 1.59 to 1.28 ms. The device used was not recorded.
- 2026-11-20 `node tools/quality.mjs jelly-pandas` 在无头 Chromium + SwiftShader 下测了 16 个自动项，结果见 [QUALITY.md](QUALITY.md)；软件渲染下帧时间一项不代表真机。 · The 16 automatic quality items in headless Chromium; its frame time says nothing of real devices.

## 已知问题 · Known issues

- 海面倒影里不画阴影和小物件（植物、敌群、弹丸、拾取物、粒子），这是为了省绘制而有意去掉的。 · The sea's mirror leaves out shadows and small things on purpose, to save drawing.
- 品质验收未达标 · Quality items failing（[QUALITY.md](QUALITY.md)，2026-11-20，无头 Chromium + SwiftShader · headless, software rendering）：T2 触控区 ≥ 44×44 CSS px（7 of 16 under 44×44: Solo 45×26; +1 friend 72×26; +2 friends 81×26; +3 friends 82×26）；T3 不误触下拉刷新和双击缩放（overscroll held, touch-action auto, double-tap zoom on）；F1 桌面帧时间 p95 ≤ 16.7 ms（p95 783.4 ms over 13 frames）；I1 中英文全可切换，英文下无中文（html lang "en", Chinese left: 果冻熊猫 动作游戏 移动 鼠标转视角 空格跳跃）；E2 资源失败有错误界面和重试（1 files refused; no uncaught error; no error screen with a retry）。

## 已解决 · Solved

- 每帧三角形太多：眼睛、花瓣、草叶、茎和弹丸用更粗的形状，海面倒影不画阴影和小物件，阴影从三级减到两级（`ddd18ce`）。 · Too many triangles; coarser small shapes, a leaner sea mirror and two shadow cascades.
- 第一次出现的特效、倒影里熊猫的脸、宝石和弹丸各自要新编译管线，开局卡顿：在标题画面里先画一遍，并让弹丸、宝石沿用敌群的顶点布局（`f3cbec0`、`d016836`、`e5ca02e`、`13783f8`，ENGINE-NOTES 第 1、2 条）。 · First-use effects, the face in the mirror, gems and shots each compiled a pipeline; they are drawn on the title, and shots and gems share the horde's vertex layout (items 1 and 2).
- 触屏拖动会被别的控件抢走（`e5da770`）；触屏上第二根手指可以暂停（`46a3909`）；启动时设置页面语言（`4a6e4e9`）；升级卡片在触屏上更易读（`94bb21a`）。 · Touch drags stay with the control they began on; a second finger pauses; the page language is set at launch; upgrade cards read better on touch.

## 未完成 · Unfinished

- 英文模式下页面上仍有中文（品质 I1）；选人数的按钮太小（T2）；资源加载失败没有错误界面和重试（E2）。 · Chinese left in English mode, small party buttons, no retry after a failed file.
- 真机上的帧时间和触屏整局验收。 · Frame times and a whole run by touch on real devices.

## 目录 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `index.html`, `style.css` | 页面与界面样式 · the page and interface styles |
| `src/main.mjs` | 启动与每帧流程 · start-up and the frame |
| `src/sim.mjs`, `src/toys.mjs` | 游戏规则，不依赖页面 · the rules, no page needed |
| `src/data.mjs` | 熊猫、玩具、护符、敌人、Boss 和双语文字 · pandas, toys, charms, enemies, bosses and text in both languages |
| `src/island.mjs` | 绘制与碰撞共用的岛屿高度网格 · the island height grid shared by drawing and collision |
| `src/view.mjs`, `src/panda.mjs`, `src/wind.mjs` | 3D 画面与植被的风 · everything drawn in 3D, and the wind in the plants |
| `src/hud.mjs`, `src/input.mjs`, `src/audio.mjs` | 界面、输入、音效 · interface, input, sound |
| `assets/panda-roster.webp` | 角色设定和头像图集 · character concepts and portrait atlas |
| `tools/`, `test/` | 无页面运行与规则测试 · headless run and rule tests |
| `vendor/` | 引擎运行时副本 · the engine runtime copy |

## 引擎与许可 · Engine and license

`vendor/` 中是新白鹭引擎的运行时副本，采用 Apache-2.0 许可，引擎提交 `db9772ee104e77b5c34e4c59bbc6f7dde7e90419`，来源和版本见 [vendor/SOURCE.md](vendor/SOURCE.md)。

`vendor/` holds a copy of the Egret Rebuild runtime under Apache-2.0; engine commit `db9772ee104e77b5c34e4c59bbc6f7dde7e90419`; see [vendor/SOURCE.md](vendor/SOURCE.md) for its source and version.
