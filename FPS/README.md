# Operation Cutoff · 断流行动

断流行动是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的第一人称战术射击游戏 Demo。黎明时分，一名特勤干员潜入被武装分子占据的水电站：找到堆场、厂房和办公楼里的三处数据终端并下载情报，沿途搜刮物资箱，顶住一波波增援，最后赶到停机坪登上直升机撤离。 [在线试玩](https://cnedwin.github.io/PortedGamesEgret/FPS/)

Operation Cutoff is an independently developed first-person tactical shooter demo built with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). At first light a lone operator slips into a hydropower station held by an armed militia: find the three data terminals in the cargo yard, the powerhouse and the office block and download them, search supply crates along the way, hold off wave after wave of reinforcements, then reach the helipad and board the helicopter. [Play online](https://cnedwin.github.io/PortedGamesEgret/FPS/)

## 玩法 · How to play

| | 键盘和鼠标 · Keyboard and mouse | 触屏 · Touch |
|---|---|---|
| 移动 · Move | W A S D | 左侧摇杆 · left stick |
| 视角 · Look | 鼠标 · mouse | 拖动右侧屏幕 · drag on the right |
| 开火 · Fire | 左键 · left button | 开火 · FIRE |
| 瞄准 · Aim | 右键 · right button | 瞄准 · AIM |
| 换弹 · Reload | R | 换弹 · RLD |
| 接入终端、搜索物资箱 · Plug in at a terminal, search a crate | 按住 F 或 E · hold F or E | 按住“使用” · hold USE |
| 切换武器 · Switch weapon | 1 / 2 / 3 / 滚轮 · wheel | 切枪 · SWAP |
| 手雷 · Grenade | G | 手雷 · NADE |
| 背包 · Backpack | Tab | — |
| 绷带 · Bandage | Q | 绷带 · HEAL |
| 跳跃、奔跑、蹲下 · Jump, sprint, crouch | Space，Shift，C / Ctrl | 跳、摇杆推到底、蹲 · JUMP, push the stick fully, DUCK |
| 暂停 · Pause | Esc / P | 暂停 · II |

- 三把武器：全自动突击步枪、备弹无限的手枪，以及带瞄准镜的半自动精确射手步枪；另有手雷和绷带。物资箱里能找到前握把（降低后坐力）和扩容弹匣，捡到即装在步枪上。瞄准时散布更小、后坐力更低，移动、跳跃和连发都会让准星张开。
- 右上角的小地图随视角转动，标出建筑、终端、撤离点、没搜过的物资箱和已经暴露位置的敌人。
- 背包只有十二格。装满后新搜到的贵重物品只能留在原地；按 Tab 查看背包、武器、配件和补给。
- 护甲先吸收大部分伤害；生命只会自行恢复到一小截，其余要靠绷带。
- 三种敌人：保持距离点射的步枪兵、贴脸冲锋的突击兵，以及血厚火力猛的重装兵。爆头伤害更高。他们打空弹匣要换弹，挨打或换弹时会跑到掩体后蹲下，再起身还击。一段时间打不到你，他们会绕到侧面，或者朝你藏身的地方扔手雷——屏幕上会有警告。交火时他们会互相喊话。守卫没发现你时不会开火，枪声会把附近的人都引来。
- 一局大约三到五分钟。接入终端后数据自行传输，约需半分钟，期间要守在终端十二米内——走远了传输就暂停。传输一开始增援就到，过半时还有第二批。每完成一处，机柜里的补给会补上护甲和绷带。
- 三处全部完成后直升机起飞，约四十秒后抵达，这段时间追兵不断；直升机到位后在停机坪上站满四秒即可撤离。
- 十个物资箱里有弹药、绷带、防弹插板、手雷和按稀有度分色的贵重物品。结算时按用时、命中率、所受伤害和带出物资的总价值评级。

- Three weapons: an automatic assault rifle, a pistol that never runs out of spare rounds, and a semi-automatic marksman rifle with a scope, plus grenades and bandages. Crates can hold a foregrip (less recoil) and an extended magazine; both go straight onto the assault rifle. Aiming tightens the spread and softens the recoil; moving, jumping and long bursts open the crosshair.
- The minimap in the top right turns with the view and shows buildings, terminals, the helipad, crates not yet searched and enemies who have given themselves away.
- The backpack has twelve slots. Once it is full, further valuables stay where they are; Tab shows the backpack, weapons, attachments and supplies.
- Armour takes most of a hit first. Health only comes back a little by itself; the rest takes a bandage.
- Three kinds of enemy: riflemen who keep their distance and fire bursts, assaulters who rush in close, and heavies with thick armour and a machine gun. Headshots hurt more. They run dry and change magazines, and when hit or reloading they run for cover, kneel behind it, and come up shooting. When they cannot hit you for a while they work round to the side, or throw a grenade at where you are hiding — a warning appears on screen. They call out to each other in a fight. Guards do not shoot until they notice you, and gunfire brings everyone nearby.
- A run takes about three to five minutes. Once a terminal is plugged in, the data sends itself in about half a minute, and the operator has to stay within twelve metres — walk away and the transfer waits. Reinforcements arrive as it starts, with a second group at the halfway mark. Each finished terminal hands back armour and bandages from the kit in its cabinet.
- After the third the helicopter sets off and takes about forty seconds, with pursuers coming the whole time; once it arrives, stand on the helipad for four seconds to leave.
- Ten supply crates hold ammunition, bandages, armour plates, grenades and valuables coloured by rarity. The debrief grades the run on time, accuracy, damage taken and the total value carried out.

设置里可以调整画质（高、中、低）、鼠标灵敏度、视野、音量、纵轴反转和语言。帧率不足时请调低画质。

Settings cover graphics quality (high, medium, low), mouse sensitivity, field of view, volume, Y inversion and language. Lower the quality if the frame rate drops.

## 引擎用法 · How it uses the engine

游戏使用白鹭 World3D，默认以 WebGL2 绘制，加 `?backend=webgpu` 可改用 WebGPU。各部分对应的引擎功能如下。

The game uses Egret World3D and draws with WebGL2 by default; add `?backend=webgpu` to draw with WebGPU. Each part maps to an engine feature as follows.

| 部分 · Part | 引擎功能 · Engine feature |
|---|---|
| 干员行走、跳跃、上台阶 · The operator walking, jumping and stepping up | `createCharacterMotor3D` + `PhysicsWorld3D` |
| 地图碰撞 · Map collision | 每个方块一个静态盒体 · one static box body per block |
| 子弹、视线、爆炸遮挡 · Bullets, sight lines, blast cover | `PhysicsWorld3D.raycast` |
| 手雷 · Grenades | 带连续碰撞的动态球体 · dynamic spheres with continuous collision |
| 敌人寻路与互相避让 · Enemy path finding and avoidance | `createNavMesh3D` + `createNavCrowd3D` |
| 场景 · Scenery | 按表面合并成少量网格，世界尺度纹理坐标 · merged into a few meshes per surface, with world-scale texture coordinates |
| 表面 · Surfaces | 程序生成的颜色贴图与法线贴图，`createStandardMaterial3D` · generated colour and normal maps |
| 风化：雨痕、墙脚积尘、地面污渍 · Weathering: rain streaks, dirt at the foot of walls, stains on the ground | `createCustomShader3D` 片元钩子，按世界坐标计算 · fragment hook, worked out from world position |
| 湿地面倒影 · The wet ground's mirror image | `PlanarReflection3D` + 材质的 `reflectionMap` · the material's `reflectionMap` |
| 雨滴涟漪 · Rings where raindrops land | `createCustomShader3D` 法线钩子 · normal hook |
| 掉漆与锈蚀 · Chipped paint and rust | `createCustomShader3D` 片元钩子 · fragment hook |
| 景深与受伤时的画面 · Depth of field and the picture when hurt | 后期处理的景深、饱和度、暗角 · post-processing depth of field, saturation, vignette |
| 晨雾与光柱 · Morning mist and light shafts | `createAtmosphere3D`，接入后期处理的自定义通道 · through the custom post-processing pass |
| 曳光弹 · Tracers | `InstancedMesh3D` |
| 弹孔与爆炸焦痕 · Bullet marks and scorch | `createDecal3D`，贴合被击中的表面 · laid onto the surface that was hit |
| 敌人中弹倒地 · Soldiers falling when shot | `createRagdoll3D`，在画面自用的物理世界里 · in a physics world of the view's own |
| 探照灯 · Floodlights | `createSpotLight3D` 投射阴影，加可见光锥 · casting shadows, with visible beams |
| 枪口火光、尘土、火花、爆炸、水雾 · Muzzle flash, dust, sparks, blasts, mist | `createParticleEmitter3D`，`createPointLight3D` |
| 天空与雾 · Sky and haze | 程序绘制的 `CubeTexture3D`（云、日晕），线性雾 · a painted `CubeTexture3D` (clouds, sun glow), linear fog |
| 帧循环 · Frame loop | Engine 时钟 · Engine clock，`createWorld3DView`，`startWorld3DLoop` |
| 画面 · Look | 级联阴影、环境遮蔽、泛光、FXAA、ACES 色调映射 · cascaded shadows, ambient occlusion, bloom, FXAA, ACES tone mapping |

所有模型、纹理、音效和配乐都由代码生成，项目不含图片或音频文件。枪声经过程序生成的混响（室外山谷、室内厂房各一套），配乐由一个小型音序器实时演奏，敌人逼近时逐层加入贝斯和鼓。

All models, textures, sounds and music are generated in code; the project contains no image or audio files. Gunfire is sent through generated reverbs (one for the open valley, one for indoors), and the score is played live by a small step sequencer that brings in bass and drums as enemies close in.

## 目录 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `index.html`，`style.css` | 页面、界面样式 · the page and interface styles |
| `src/main.mjs` | 入口：启动引擎，驱动每一帧 · entry point: starts the engine and runs each frame |
| `src/sim.mjs` | 规则：干员、武器、敌人、终端、物资、撤离，不含任何绘制 · the rules: operator, weapons, enemies, terminals, loot, extraction, with no drawing in them |
| `src/data.mjs` | 数值 · tuning numbers |
| `src/level.mjs` | 地图方块、关键位置、行走网格 · map blocks, named places, the walking grid |
| `src/bot.mjs` | 代打玩家，用于自动检查和 `?auto=1` · a stand-in player for automated checks and `?auto=1` |
| `src/view.mjs`，`src/scenery.mjs` | 场景、灯光、特效 · scene, lights, effects |
| `src/soldier.mjs`，`src/gun.mjs` | 敌人模型与动画、手中的武器 · enemy models and animation, the weapon in hand |
| `src/build.mjs`，`src/textures.mjs`，`src/grime.mjs` | 几何体拼装、程序纹理、风化着色器 · geometry building, generated textures, the weathering shader |
| `src/hud.mjs`，`src/text.mjs` | 界面与中英文文字 · interface and its Chinese and English text |
| `src/input.mjs`，`src/audio.mjs`，`src/music.mjs` | 键鼠与触屏、合成音效、随战况变化的配乐 · keyboard, mouse and touch; synthesised sound; a score that follows the fight |
| `src/stats.mjs` | `?stats=1` 的性能读数 · the performance readout for `?stats=1` |
| `test/`，`tools/` | 规则测试、无页面整局试玩 · tests of the rules, whole runs without a page |
| `vendor/` | 引擎运行时副本，来源见 `vendor/SOURCE.md` · a copy of the engine runtime, see `vendor/SOURCE.md` |

## 运行与开发 · Running and development

需要 Node.js 22 或更新版本，以及支持 WebGL2 的浏览器。

Requires Node.js 22 or newer and a browser with WebGL2.

```sh
# 在仓库根目录启动任意静态服务器 · serve the repository root with any static server
python3 -m http.server 8080
# 打开 · open  http://localhost:8080/FPS/

# 在 FPS 目录下 · from the FPS folder
node --test                       # 规则测试 · tests of the rules
node tools/headless.mjs 5 1       # 让代打玩家打 5 局，种子从 1 开始 · five runs by the stand-in player, seeds from 1
```

地址栏选项 · Options in the address:

| 选项 · Option | 作用 · Effect |
|---|---|
| `?backend=webgpu` | 用 WebGPU 绘制 · draw with WebGPU |
| `?lang=zh` / `?lang=en` | 界面语言 · interface language |
| `?quality=low` / `medium` / `high` | 画质 · graphics quality |
| `?post=0`，`?ssao=0`，`?shadows=0`，`?reflect=0`，`?dof=0` | 关闭后期处理、环境遮蔽、阴影、地面倒影、景深 · switch off post-processing, ambient occlusion, shadows, the ground's mirror image, depth of field |
| `?ratio=1` | 限制设备像素比（默认 1.5） · cap the device pixel ratio (default 1.5) |
| `?seed=123` | 固定随机种子 · fix the random seed |
| `?auto=1` | 由代打玩家自动游玩 · let the stand-in player play |
| `?stats=1` | 显示帧率、各阶段耗时、绘制次数与三角形数 · show the frame rate, the time each part of a frame takes, draw calls and triangles |

## 许可 · License

引擎运行时副本遵循 Apache-2.0，见 `vendor/LICENSE` 与 `vendor/NOTICE`。

The engine runtime copy is under Apache-2.0; see `vendor/LICENSE` and `vendor/NOTICE`.
