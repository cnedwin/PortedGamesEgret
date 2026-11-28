# Operation Cutoff · 断流行动

## 简介 · Introduction

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
| 切换武器 · Switch weapon | 1 / 2 / 3 / 滚轮 · wheel | 切枪，或点背包里的武器 · SWAP, or tap a weapon in the backpack |
| 手雷 · Grenade | G | 手雷 · NADE |
| 背包 · Backpack | Tab | 背包 · BAG |
| 绷带 · Bandage | Q | 绷带 · HEAL |
| 跳跃、奔跑、蹲下 · Jump, sprint, crouch | Space，Shift，C / Ctrl | 跳、摇杆推到底、蹲 · JUMP, push the stick fully, DUCK |
| 暂停 · Pause | Esc / P | 暂停 · II |
| 全屏 · Fullscreen | 标题或暂停菜单 · Title or pause menu | 设置 · Settings |

触屏可以一边移动一边开火。摇杆推到底进入奔跑，开火时回到步行。开镜会降低滑动的转向速度。

On touch, you can move and fire together. Pushing the stick all the way starts a sprint, and firing brings you back to a walk. Dragging turns the view more slowly while aiming.

PC 部署和继续时会请求锁定鼠标。锁定后可直接移动鼠标转向。若请求失败，可在暂停菜单重试，或主动选择按住鼠标键拖动视角。设置里的鼠标瞄准倍率用于单独调整右键瞄准时的灵敏度。

On PC, Deploy and Resume request mouse lock so you can turn by moving the mouse. If the request fails, retry from the pause menu or choose to aim by dragging with a mouse button held. The mouse aim multiplier adjusts right-button aim independently.

- 三把武器：全自动突击步枪、备弹无限的手枪，以及带瞄准镜的半自动精确射手步枪；另有手雷和绷带。物资箱里能找到前握把（降低后坐力）和扩容弹匣，捡到即装在步枪上。瞄准时散布更小、后坐力更低，移动、跳跃和连发都会让准星张开。
- 右上角的小地图随视角转动，标出建筑、终端、撤离点、没搜过的物资箱和已经暴露位置的敌人。
- 背包只有十二格。装满后新搜到的贵重物品只能留在原地；按 Tab 查看背包、武器、配件和补给。
- 护甲先吸收大部分伤害；生命只会自行恢复到一小截，其余要靠绷带。
- 三种敌人：保持距离点射的步枪兵、贴脸冲锋的突击兵，以及血厚火力猛的重装兵。爆头伤害更高。他们打空弹匣要换弹，挨打或换弹时会跑到掩体后蹲下，再起身还击。一段时间打不到你，他们会绕到侧面，或者朝你藏身的地方扔手雷——屏幕上会有警告。交火时他们会互相喊话。守卫没发现你时不会开火，枪声会把附近的人都引来。
- 一局预计六到八分钟。每次接入一处终端，按任务栏进度在十二米内守备。每处都有两次链路校准，靠近琥珀色标记、停留两秒即可继续传输。增援分三批接近，完成一处后可从机柜补充护甲、绷带和备用弹药。
- 三处全部完成后，直升机将在六十四秒后抵达东南角的停机坪。沿掩体向撤离点移动，直升机到位后在停机坪站满四秒即可登机。
- 十个物资箱里有弹药、绷带、防弹插板、手雷和按稀有度分色的贵重物品。结算时按用时、命中率、所受伤害和带出物资的总价值评级。

- Three weapons: an automatic assault rifle, a pistol that never runs out of spare rounds, and a semi-automatic marksman rifle with a scope, plus grenades and bandages. Crates can hold a foregrip (less recoil) and an extended magazine; both go straight onto the assault rifle. Aiming tightens the spread and softens the recoil; moving, jumping and long bursts open the crosshair.
- The minimap in the top right turns with the view and shows buildings, terminals, the helipad, crates not yet searched and enemies who have given themselves away.
- The backpack has twelve slots. Once it is full, further valuables stay where they are; Tab shows the backpack, weapons, attachments and supplies.
- Armour takes most of a hit first. Health only comes back a little by itself; the rest takes a bandage.
- Three kinds of enemy: riflemen who keep their distance and fire bursts, assaulters who rush in close, and heavies with thick armour and a machine gun. Headshots hurt more. They run dry and change magazines, and when hit or reloading they run for cover, kneel behind it, and come up shooting. When they cannot hit you for a while they work round to the side, or throw a grenade at where you are hiding — a warning appears on screen. They call out to each other in a fight. Guards do not shoot until they notice you, and gunfire brings everyone nearby.
- Allow six to eight minutes per run. Link one terminal at a time and stay within twelve metres. Stay near each amber relay marker for two seconds to resume the transfer. Reinforcements arrive in three waves. Each completed terminal can replenish armour, bandages and spare ammunition.
- After the third terminal, the helicopter is sixty-four seconds out from the south-east helipad. Use cover on the way and hold on the pad for four seconds once the helicopter is in position.
- Ten supply crates hold ammunition, bandages, armour plates, grenades and valuables coloured by rarity. The debrief grades the run on time, accuracy, damage taken and the total value carried out.

设置里可以调整画质（高、中、低）、视角灵敏度、视野、音量、纵轴反转和语言。帧率不足时请调低画质。

Settings cover graphics quality (high, medium, low), look sensitivity, field of view, volume, Y inversion and language. Lower the quality if the frame rate drops.

## 运行与开发 · Running and development

在线游玩只需要支持 WebGL2 的浏览器。本地开发与自动测试需要 Node.js 22 或更新版本。

Online play requires a browser with WebGL2. Local development and automated tests require Node.js 22 or newer.

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
| `?art=original` | 以程序模型作画面对照 · use procedural models for visual comparisons |
| `?stats=1` | 显示帧率、各阶段耗时、绘制次数与三角形数 · show the frame rate, the time each part of a frame takes, draw calls and triangles |

## 许可 · License

引擎运行时副本遵循 Apache-2.0，见 `vendor/LICENSE` 与 `vendor/NOTICE`。

The engine runtime copy is under Apache-2.0; see `vendor/LICENSE` and `vendor/NOTICE`.

模型的生成来源和使用说明见 `assets/models/README.md`。

See `assets/models/README.md` for the model source and usage notes.

## 引擎用法 · How it uses the engine

游戏使用白鹭 World3D，默认以 WebGL2 绘制，加 `?backend=webgpu` 可改用 WebGPU。各部分对应的引擎功能如下。

The game uses Egret World3D and draws with WebGL2 by default; add `?backend=webgpu` to draw with WebGPU. Each part maps to an engine feature as follows.

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `createCharacterMotor3D` + `PhysicsWorld3D` | 干员行走、跳跃、上台阶 · The operator walking, jumping and stepping up | `src/sim.mjs` |
| 每个方块一个静态盒体 · one static box body per block | 地图碰撞 · Map collision | `src/sim.mjs` |
| `PhysicsWorld3D.raycast` | 子弹、视线、爆炸遮挡 · Bullets, sight lines, blast cover | `src/sim.mjs` |
| 带连续碰撞的动态球体 · dynamic spheres with continuous collision | 手雷 · Grenades | `src/sim.mjs` |
| `createNavMesh3D` + `createNavCrowd3D` | 敌人寻路与互相避让 · Enemy path finding and avoidance | `src/sim.mjs` |
| 按表面合并成少量网格，世界尺度纹理坐标 · merged into a few meshes per surface, with world-scale texture coordinates | 场景 · Scenery | `src/scenery.mjs` |
| 程序生成的颜色贴图与法线贴图，`createStandardMaterial3D` · generated colour and normal maps | 表面 · Surfaces | `src/scenery.mjs` |
| `createCustomShader3D` 片元钩子，按世界坐标计算 · fragment hook, worked out from world position | 风化：雨痕、墙脚积尘、地面污渍 · Weathering: rain streaks, dirt at the foot of walls, stains on the ground | `src/grime.mjs` |
| `PlanarReflection3D` + 材质的 `reflectionMap` · the material's `reflectionMap` | 湿地面倒影 · The wet ground's mirror image | `src/view.mjs` |
| `createCustomShader3D` 法线钩子 · normal hook | 雨滴涟漪 · Rings where raindrops land | `src/grime.mjs` |
| `createCustomShader3D` 片元钩子 · fragment hook | 掉漆与锈蚀 · Chipped paint and rust | `src/grime.mjs` |
| 后期处理的景深、饱和度、暗角 · post-processing depth of field, saturation, vignette | 景深与受伤时的画面 · Depth of field and the picture when hurt | `src/main.mjs` |
| `createAtmosphere3D`，接入后期处理的自定义通道 · through the custom post-processing pass | 晨雾与光柱 · Morning mist and light shafts | `src/main.mjs` |
| `InstancedMesh3D` | 曳光弹 · Tracers | `src/view.mjs` |
| `createDecal3D`，贴合被击中的表面 · laid onto the surface that was hit | 弹孔与爆炸焦痕 · Bullet marks and scorch | `src/view.mjs` |
| `createRagdoll3D`，在画面自用的物理世界里 · in a physics world of the view's own | 敌人中弹倒地 · Soldiers falling when shot | `src/soldier.mjs` |
| `createSpotLight3D` 投射阴影，加可见光锥 · casting shadows, with visible beams | 探照灯 · Floodlights | `src/view.mjs` |
| `createParticleEmitter3D`，`createPointLight3D` | 枪口火光、尘土、火花、爆炸、水雾 · Muzzle flash, dust, sparks, blasts, mist | `src/view.mjs` |
| 程序绘制的 `CubeTexture3D`（云、日晕），线性雾 · a painted `CubeTexture3D` (clouds, sun glow), linear fog | 天空与雾 · Sky and haze | `src/textures.mjs` |
| Engine 时钟 · Engine clock，`createWorld3DView`，`startWorld3DLoop` | 帧循环 · Frame loop | `src/main.mjs` |
| 级联阴影、环境遮蔽、泛光、FXAA、ACES 色调映射 · cascaded shadows, ambient occlusion, bloom, FXAA, ACES tone mapping | 画面 · Look | `src/main.mjs` |

角色、枪械外观和水电站道具使用经过减面、贴图压缩和挂点校准的 Tripo GLB。白鹭的 glTF 加载器读取内嵌材质，重复的场景道具共享实例批次。角色关节、换弹、终端交互和撤离演出由游戏驱动。枪声在山谷和厂房使用不同的实时混响，音序器随敌人逼近逐层加入贝斯和鼓。

Characters, weapon visuals and station props use Tripo GLB assets simplified, texture-compressed and fitted to the game's attachment points. Egret loads the embedded materials and draws repeated props as instances. The game drives character joints, reloads, terminal interactions and extraction. Gunfire uses different real-time reverbs in the valley and powerhouse, while a step sequencer brings in bass and drums as enemies close in.

## 已验证 · Verified

- 2026-11-21 引擎副本升级到 `b5628eb` 后：51 项 Node 测试通过；无头 Chromium 下标题画面与升级前逐像素相同，`?auto=1` 自动游玩 40–60 秒无控制台错误，中等画质下 `renderer.info.lightsTiled` 为 2。 · After the engine update on 2026-11-21: 51 tests pass, the title is pixel for pixel as before, and automatic play runs clean.
- 2026-11-21 在提交 `fc1dacb`、Node 22.23.4 下运行 `node --test test/*.test.mjs`：51 项全部通过（规则、输入、美术载入、模型挂点、连续蒙皮、投影代理、启动预绘）。 · `node --test` at commit `fc1dacb` with Node 22.23.4: all 51 tests pass.
- 2026-11-20 `node tools/quality.mjs FPS` 在无头 Chromium + SwiftShader 下测了 16 个自动项，结果见 [QUALITY.md](QUALITY.md)；软件渲染下 3D 场景几乎画不动，帧时间一项不代表真机。 · The 16 automatic quality items in headless Chromium with software rendering, see QUALITY.md; its frame time says nothing of real devices.
- 据 [STATUS.md](STATUS.md) 记录的真机检查：PC（RTX 5090 Laptop、Edge 157）与三星 SM-F966U1（Android 17、Chrome）上检查了三类角色的持枪、步行和蹲姿，第一人称枪械的瞄准、后坐、换弹和近裁切；公开版本的整局与性能复跑见 [PR #82 的验收记录](https://github.com/cnedwin/PortedGamesEgret/pull/82)。STATUS.md 里的两段整局帧率是美术修复前的历史基线。 · Device checks recorded in STATUS.md, on a PC and a Samsung phone; the public-run results are in PR #82. The whole-run frame rates there predate the art repair.

## 已知问题 · Known issues

- 低画质下只点亮离镜头最近的五盏灯（中、高画质下全部点亮）；`?lights=near` 可在任何画质下回到这种做法 · At low quality only the nearest five lamps are lit (all of them at medium and high); `?lights=near` asks for that at any quality.
- 杉树在阴影里偏黑，背光时层次看不清 · Firs go nearly black in shade.
- 代打程序（`?auto=1`）不搜物资箱，自动演示里看不到搜集和背包 · The stand-in player never searches crates.
- 阵亡后从头开始；配件只作用于突击步枪，捡到即装、不能卸下 · Death restarts the run; attachments fit only the assault rifle.
- RTX 5090 Laptop + ANGLE D3D11 上没有实时阴影（为避免丢失上下文而关闭） · No live shadows on that one adapter.
- 品质验收未达标 · Quality items failing（[QUALITY.md](QUALITY.md)，2026-11-21，无头 Chromium + SwiftShader · headless, software rendering）：T2 触控区 ≥ 44×44 CSS px（3 of 3 under 44×44: Deploy 132×43; Settings 132×43; Controls 132×43）；F1 桌面帧时间 p95 ≤ 16.7 ms（p95 7849.7 ms over 2 frames）；I1 中英文全可切换，英文下无中文（html lang "en", Chinese left: 断流行动 第一人称射击 移动 鼠标瞄准 左键开火）。

## 已解决 · Solved

- 第一次出现补给箱时约 130 ms 的两次停顿：启动时在加载提示下把两种材质路径真实预绘一遍（`src/view.mjs` 的 `view.warm`），见 ENGINE-NOTES 第 4 条。 · Two stalls of about 130 ms when the first crate appeared: both material paths are drawn once under the loading screen (ENGINE-NOTES item 4).
- 加色混合的太阳光晕、枪口火光、红点画成不透明方块：材质设 `alphaMode: 'blend'`、`blending: 'additive'`（ENGINE-NOTES 第 2 条）。 · Additive glows drew as opaque squares (item 2).
- 超过八盏的点光源不生效：先是只点亮最近的五盏并按距离渐隐；引擎有了分块照明之后，中、高画质下所有灯都点亮（ENGINE-NOTES 第 1 条）。 · Lights past the eighth had no effect; now every lamp is lit at medium and high quality through the engine's tiled lights (item 1).
- 系统"减少动态效果"打开时镜头仍在晃：改用引擎的 `prefersReducedMotion()` / `watchReducedMotion()`，开启时不晃镜头、爆炸闪光减弱（ENGINE-NOTES 第 5 条）。 · The camera shook even with reduced motion asked for; the engine's reduced-motion helpers now turn the shake off (item 5).
- RTX 5090 Laptop 的 ANGLE D3D11 下接收阴影的着色器丢失 WebGL 上下文：只对这一适配器关闭实时阴影（ENGINE-NOTES 第 3 条）。 · The shadow shader lost the context on one adapter; shadows are off for that adapter only (item 3).
- 带护甲中弹时界面报错、守卫在出生点就发现干员、新增箱体挡路、枪在阴影里纯黑、瞄准镜被枪身挡住、一局不到一分钟等，完整清单见 [STATUS.md](STATUS.md)「已经解决的问题」。 · The rest (an error when hit with armour, guards spotting the start, blocked posts, a black rifle, the scope view, runs under a minute) are listed in STATUS.md.

## 未完成 · Unfinished

- WebGPU 后端没有做过单独的真机验收；覆盖整块显示屏的原生全屏、真人难度评估和专门的听音检查都没做（STATUS.md「验收边界」）。 · No device test of the WebGPU backend, native full-monitor fullscreen, human difficulty assessment or listening test.
- 没有检查点和难度选择，只有一张地图、一个任务；背包是等大的十二格，不能丢弃；只有三把枪、两种配件；敌人没有小队配合，喊话没有语音；没有手柄支持。完整清单与下一步建议见 [STATUS.md](STATUS.md)。 · No checkpoints, difficulty or second map; a twelve-slot backpack; three guns and two attachments; no squad tactics or voiced callouts; no gamepad. See STATUS.md.

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
| `src/soldier.mjs`，`src/soldier-skin.mjs`，`src/gun.mjs` | 连续角色蒙皮与动画、手中的武器 · continuous character skinning and animation, the weapon in hand |
| `assets/models/`，`src/asset-models.mjs` | GLB 美术和角色、道具的挂载清单 · GLB assets and the visual slot manifest |
| `src/build.mjs`，`src/textures.mjs`，`src/grime.mjs` | 几何体拼装、程序纹理、风化着色器 · geometry building, generated textures, the weathering shader |
| `src/hud.mjs`，`src/text.mjs` | 界面与中英文文字 · interface and its Chinese and English text |
| `src/input.mjs`，`src/audio.mjs`，`src/music.mjs` | 键鼠与触屏、合成音效、随战况变化的配乐 · keyboard, mouse and touch; synthesised sound; a score that follows the fight |
| `src/stats.mjs` | `?stats=1` 的性能读数 · the performance readout for `?stats=1` |
| `test/`，`tools/` | 规则测试、无页面整局试玩 · tests of the rules, whole runs without a page |
| `STATUS.md` | 现状与待办：验证情况、已知问题、未完成的功能、模型细节 · status and backlog: what is verified, known issues, unfinished features, model detail |
| `vendor/` | 引擎运行时副本，来源见 `vendor/SOURCE.md` · a copy of the engine runtime, see `vendor/SOURCE.md` |

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `33897768c4f7933d289f083e4f34b3209b0aef31`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit `33897768c4f7933d289f083e4f34b3209b0aef31`, copied by the engine's `tools/vendor-game.mjs`; see [vendor/SOURCE.md](vendor/SOURCE.md).

入口 · Entries: `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d`, `@egret/engine/webgpu/world3d`, `@egret/engine/web/kit`, `@egret/engine/play`, `@egret/engine/kit`, `@egret/engine/ui`, `@egret/engine/ui/semantics`, `@egret/engine/ui/testing`, `@egret/engine/web/semantics`, `@egret/engine/web/audio`, `@egret/engine/input`, `@egret/engine/web/hover`.
