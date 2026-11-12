# Jelly Pandas · 果冻熊猫

果冻熊猫是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的 3D 动作生存游戏 Demo。半透明的果冻熊猫要在玩具岛上抵挡越来越多的糖果大军十五分钟：玩具自动开火，软弹的身体本身也是武器，每次升级选一张强化卡，第 5、10、15 分钟各有一个 Boss。 [在线试玩](https://cnedwin.github.io/PortedGamesEgret/jelly-pandas/)

Jelly Pandas is an independently developed 3D action survival demo built with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). See-through jelly pandas hold a toy island for fifteen minutes against a growing candy horde: toys fire on their own, the wobbly body is a weapon too, every level brings an upgrade card, and a boss arrives at 5, 10 and 15 minutes. [Play online](https://cnedwin.github.io/PortedGamesEgret/jelly-pandas/)

## 玩法 · How to play

| | 键盘和鼠标 · Keyboard and mouse | 手柄 · Gamepad |
|---|---|---|
| 移动 · Move | W A S D / ↑ ↓ ← → | 左摇杆 · left stick |
| 视角 · Look | 鼠标 · mouse | 右摇杆 · right stick |
| 跳跃，长按蓄力大跳 · Jump, hold for a super jump | Space | A |
| 空中下砸，地面肚皮撞 · Slam in the air, belly bump on the ground | Ctrl / 左键 left click / Q | B |
| 翻滚 · Roll | Shift / 右键 right click / E | X |
| 选卡，重抽 · Pick a card, reroll | 1 2 3，R | 方向键 ← ↑ → · direction pad，Y |
| 菜单 · Menu | Esc / P | Start |

- 八只熊猫，颜色、肚皮花纹和初始玩具各不相同。可单人游玩，也可带一到三位由游戏操控的伙伴；站到倒下的熊猫身边可以把它救起。
- 十二种玩具，各有八级和一次进化（升到满级并拥有对应护符）；十二种护符，各有五级。
- 七种糖果敌人、戴皇冠的精英、定时出现的狂潮和三个 Boss。
- 敌人都是物理刚体：会挤成一堆、被打飞、互相撞伤、摔伤、掉进海里；沙滩球和木桶可以推进敌群。

- Eight pandas, each with its own colour, belly pattern and first toy. Play alone or with one to three friends steered by the game; stand next to a fallen panda to revive it.
- Twelve toys with eight levels and an evolution each (reach the top level and own the matching charm), and twelve charms with five levels.
- Seven kinds of candy, crowned elites, timed surges and three bosses.
- Every enemy is a physics body: they pile up, get thrown, hurt each other when they collide, take fall damage and drown in the sea; beach balls and barrels can be shoved into the crowd.

游戏面向桌面浏览器，使用键盘鼠标或手柄；音乐和音效都由 Web Audio 实时生成。标题界面可以切换画质（高、中、低），帧率不足时请调低。

The game is made for desktop browsers with a keyboard and mouse or a gamepad. Music and sound effects are generated with Web Audio. The title screen has a quality setting (high, medium, low); lower it if the frame rate drops.

## 引擎用法 · How it uses the engine

游戏使用白鹭 World3D，默认以 WebGL2 绘制。各部分对应的引擎功能如下。

The game uses Egret World3D and draws with WebGL2 by default. Each part maps to an engine feature as follows.

| 部分 · Part | 引擎功能 · Engine feature |
|---|---|
| 熊猫行走、跳跃、推动道具 · Pandas walking, jumping and pushing props | `createCharacterMotor3D` + `PhysicsWorld3D` |
| 糖果敌群 · The candy horde | 每个敌人一个刚体球，用碰撞层与熊猫分开 · one rigid sphere per enemy, kept apart from pandas by collision layers |
| 岛屿碰撞 · Island collision | `createMeshShape3D` 静态三角网格 · static triangle mesh |
| 沙滩球和木桶 · Beach balls and barrels | 球体与凸包刚体 · sphere and convex-hull rigid bodies |
| 果冻身体 · Jelly bodies | `createGlassMaterial3D` + 程序生成的花纹纹理 · generated pattern textures |
| 果冻抖动 · Jelly wobble | `createJelly3D` |
| 拖尾 · Trails | `createTrail3D` |
| 敌群、弹丸、糖粒、树木 · Horde, shots, sprinkles, trees | `InstancedMesh3D` 逐实例颜色 · per-instance colour |
| 海面 · The sea | `createWater3D` 波浪与倒影 · waves and reflection |
| 特效 · Effects | `createParticleEmitter3D` |
| 相机 · Camera | `createFollowCamera3D` |
| 帧循环 · Frame loop | Engine 时钟 · Engine clock，`createWorld3DView`，`startWorld3DLoop` |
| 画面 · Look | 级联阴影、天空环境光、环境遮蔽、泛光、FXAA · cascaded shadows, sky lighting, ambient occlusion, bloom, FXAA |

所有模型、纹理和音效都由代码生成，项目不含图片或音频文件。

All models, textures and sounds are generated in code; the project contains no image or audio files.

## 目录 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `index.html`, `style.css` | 页面与界面样式 · the page and interface styles |
| `src/main.mjs` | 启动与每帧流程 · start-up and the frame |
| `src/sim.mjs`, `src/toys.mjs` | 游戏规则，不依赖页面 · the rules, no page needed |
| `src/data.mjs` | 熊猫、玩具、护符、敌人、Boss 和双语文字 · pandas, toys, charms, enemies, bosses and text in both languages |
| `src/island.mjs` | 绘制与碰撞共用的岛屿高度网格 · the island height grid shared by drawing and collision |
| `src/view.mjs`, `src/panda.mjs` | 3D 画面 · everything drawn in 3D |
| `src/hud.mjs`, `src/input.mjs`, `src/audio.mjs` | 界面、输入、音效 · interface, input, sound |
| `tools/`, `test/` | 无页面运行与规则测试 · headless run and rule tests |
| `vendor/` | 引擎运行时副本 · the engine runtime copy |

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

## 引擎与许可 · Engine and license

`vendor/` 中是新白鹭引擎的运行时副本，采用 Apache-2.0 许可，来源和版本见 [vendor/SOURCE.md](vendor/SOURCE.md)。

`vendor/` holds a copy of the Egret Rebuild runtime under Apache-2.0; see [vendor/SOURCE.md](vendor/SOURCE.md) for its source and version.
