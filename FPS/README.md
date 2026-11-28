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

PC 部署和继续时会请求锁定鼠标。默认保留浏览器普通锁定；设置「输入」分类另有可选的「原始锁定」和「拖动」。原始锁定依浏览器与设备支持，拒绝时不会自动改用其他模式：可在暂停菜单重试，或回设置选择普通锁定，也可明确选择拖动。设置里的鼠标瞄准倍率仍独立保存。

On PC, Deploy and Resume request ordinary browser mouse lock by default. The Input preferences add optional Raw lock and Drag modes. Raw lock depends on browser and device support; a denied request never silently substitutes another policy. Retry, choose ordinary Lock in Settings, or explicitly choose Drag. The mouse aim multiplier remains an independent saved preference.

- 三把武器：全自动突击步枪、备弹无限的手枪，以及带瞄准镜的半自动精确射手步枪；另有手雷和绷带。物资箱里能找到前握把（降低后坐力）和扩容弹匣，捡到即装在步枪上。瞄准时散布更小、后坐力更低，移动、跳跃和连发都会让准星张开。
- 右上角的小地图随视角转动，标出建筑、终端、撤离点、没搜过的物资箱和已经暴露位置的敌人。
- 背包只有十二格。装满后新搜到的贵重物品只能留在原地；按 Tab 查看背包、武器、配件和补给；背包内 Tab 用于焦点导航，点关闭或按 Esc 返回游戏。
- 护甲先吸收大部分伤害；生命只会自行恢复到一小截，其余要靠绷带。
- 三种敌人：保持距离点射的步枪兵、贴脸冲锋的突击兵，以及血厚火力猛的重装兵。爆头伤害更高。他们打空弹匣要换弹，挨打或换弹时会跑到掩体后蹲下，再起身还击。一段时间打不到你，他们会绕到侧面，或者朝你藏身的地方扔手雷——屏幕上会有警告。交火时他们会互相喊话。守卫没发现你时不会开火，枪声会把附近的人都引来。
- 一局预计六到八分钟。每次接入一处终端，按任务栏进度在十二米内守备。每处都有两次链路校准，靠近琥珀色标记、停留两秒即可继续传输。增援分三批接近，完成一处后可从机柜补充护甲、绷带和备用弹药。
- 三处全部完成后，直升机将在六十四秒后抵达东南角的停机坪。沿掩体向撤离点移动，直升机到位后在停机坪站满四秒即可登机。
- 十个物资箱里有弹药、绷带、防弹插板、手雷和按稀有度分色的贵重物品。结算时按用时、命中率、所受伤害和带出物资的总价值评级。

- Three weapons: an automatic assault rifle, a pistol that never runs out of spare rounds, and a semi-automatic marksman rifle with a scope, plus grenades and bandages. Crates can hold a foregrip (less recoil) and an extended magazine; both go straight onto the assault rifle. Aiming tightens the spread and softens the recoil; moving, jumping and long bursts open the crosshair.
- The minimap in the top right turns with the view and shows buildings, terminals, the helipad, crates not yet searched and enemies who have given themselves away.
- The backpack has twelve slots. Once it is full, further valuables stay where they are; Tab opens the backpack, weapons, attachments and supplies; inside it Tab navigates focus, while Close or Esc returns to play.
- Armour takes most of a hit first. Health only comes back a little by itself; the rest takes a bandage.
- Three kinds of enemy: riflemen who keep their distance and fire bursts, assaulters who rush in close, and heavies with thick armour and a machine gun. Headshots hurt more. They run dry and change magazines, and when hit or reloading they run for cover, kneel behind it, and come up shooting. When they cannot hit you for a while they work round to the side, or throw a grenade at where you are hiding — a warning appears on screen. They call out to each other in a fight. Guards do not shoot until they notice you, and gunfire brings everyone nearby.
- Allow six to eight minutes per run. Link one terminal at a time and stay within twelve metres. Stay near each amber relay marker for two seconds to resume the transfer. Reinforcements arrive in three waves. Each completed terminal can replenish armour, bandages and spare ammunition.
- After the third terminal, the helicopter is sixty-four seconds out from the south-east helipad. Use cover on the way and hold on the pad for four seconds once the helicopter is in position.
- Ten supply crates hold ammunition, bandages, armour plates, grenades and valuables coloured by rarity. The debrief grades the run on time, accuracy, damage taken and the total value carried out.

设置里可以调整画质（高、中、低）、视角和鼠标瞄准灵敏度、视野、音量、鼠标模式、动效偏好、纵轴反转和语言。帧率不足时请调低画质。

Settings cover graphics quality (high, medium, low), look and mouse aim sensitivity, field of view, volume, mouse mode, motion preference, Y inversion and language. Lower the quality if the frame rate drops.

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
| `play3dAttached`（WebGL2 / WebGPU） | 接入现有配置的渲染器、场景与相机；透明 Play UI 与 3D 共享一个引擎时钟和生命周期 · attach the configured renderer, scene and camera to a shared Play clock and lifetime | [src/main.mjs](src/main.mjs) |
| `game.show`，`createUiScreenStack` | 原生标题、设置、暂停、背包、结算、错误，具名屏幕与焦点 · native menus, inventory, results and named focus | `src/ui/menus.mjs` |
| `fit: 'expand'`，`portrait`，`uiScale`，`game.safe` | 横竖屏、安全区及独立 2D 2× 栅格密度 · adaptive safe layout and independent 2× UI raster | `src/main.mjs` |
| `game.keys`，`game.pointer`，`game.touchStick`，`createActionControl` | 键鼠、手柄、原生触点归属、浮动摇杆与按住按钮 · native desktop, pad and touch controls | `src/input.mjs`，`src/ui/touch.mjs` |
| `game.pointer.lock({ unadjustedMovement?, signal? })`，`lockPending`，`buttons` / `pressedButtons` / `releasedButtons` | 原生锁定结果、可选原始锁定与多键状态；锁定触点的所有权及取消由引擎管理 · native lock outcomes, opt-in raw lock and button chords; engine-owned contact lifetime/cancellation | [src/input.mjs](src/input.mjs)，[src/ui/menus.mjs](src/ui/menus.mjs) |
| `game.keys.claim(name, when)` | 游戏模式限定的 Tab 快捷键，菜单焦点与普通页面导航由引擎保留 · scoped gameplay Tab without replacing native menu focus or normal page navigation | [src/input.mjs](src/input.mjs) |
| `game.hints`，`projectToViewport3D`，`Sprite`/`Graphics` | 原生操作提示、世界标记、指南针、准星、小地图 · native hints, markers, compass and minimap | `src/ui/hud.mjs` |
| `createUiSemantics`，`createBrowserSemantics`，`createUiTester` | 具名控件、绑定状态、读屏投影与按名称验收 · named controls, accessibility projection and named testing | `src/main.mjs`，`test/accept.mjs` |
| `registerScreenOccluder`、`verify --screens` | 真实原生控件的裁切、安全区和触控范围；标记实际 HUD 绘制面，检测几何覆盖而非推断不透明像素 · clipped native action bounds and safe targets, with explicitly declared painted HUD faces for coverage diagnostics, not inferred opacity | [src/ui/hud.mjs](src/ui/hud.mjs)，[test/screen-route.mjs](test/screen-route.mjs) |
| `game.loading`，`renderer.preparePrograms` | 原生加载界面及材质预编译 · loading view and program preparation | `src/main.mjs`，`src/view.mjs` |
| `createSaveStore`，`browserSaveStorage` | 向后兼容的设置存储 · backward-compatible settings | `src/native-settings.mjs` |
| `createWorld3DStats` | 区分游戏、视图与提交时间 · frame-stage timing | `src/native-stats.mjs` |
| `createBrowserAudio` | 原生主混音、解锁及限幅，保留游戏合成配乐 · native mixer, unlock and limiter around retained sound recipes | `src/audio.mjs` |
| 级联阴影、环境遮蔽、泛光、FXAA、ACES 色调映射 · cascaded shadows, ambient occlusion, bloom, FXAA, ACES tone mapping | 画面 · Look | `src/main.mjs` |

角色、枪械外观和水电站道具使用经过减面、贴图压缩和挂点校准的 Tripo GLB。白鹭的 glTF 加载器读取内嵌材质，重复的场景道具共享实例批次。角色关节、换弹、终端交互和撤离演出由游戏驱动。枪声在山谷和厂房使用不同的实时混响，音序器随敌人逼近逐层加入贝斯和鼓。

Characters, weapon visuals and station props use Tripo GLB assets simplified, texture-compressed and fitted to the game's attachment points. Egret loads the embedded materials and draws repeated props as instances. The game drives character joints, reloads, terminal interactions and extraction. Gunfire uses different real-time reverbs in the valley and powerhouse, while a step sequencer brings in bass and drums as enemies close in.

## 已验证 · Verified
- 公网冷启动和实体 Fold7 长帧专项：保留原始几何、画质和玩法，使用扁平索引顶点缓存及原生 HUD 同状态保留绘制。实际PC同路线场景构建长任务约2.9→1.9秒；同引擎Fold7局部A/B界面实际提交比例81.2%→51.9%，平均回调36.03→39.86Hz，P95未改善。98项Node测试通过，结果和限制见 [QUALITY.md](QUALITY.md)。 · Public startup and physical Fold7 pacing: exact geometry and retained native HUD, unchanged quality and rules. Matched PC scene task ~2.9→1.9 s; handset A/B native UI submission share 81.2%→51.9%, callback cadence 36.03→39.86 Hz, unchanged p95. 98 Node tests pass; see QUALITY.md for evidence and limits.

- 本次从 `4f08d2bcd25de3aafa7295f3b349970f8003ed71` 更新到 `d2e28f46182a563fd594cc51847240429ab0a5b5`：官方构建及引擎复制成功；引擎替换前后均通过原有 91 项 Node 测试，新增三项静态模型裁切等价检查后共 94 项通过，原有导入映射无需改动。实际设备复测与限制见 [QUALITY.md](QUALITY.md)。 · The official build and vendor refresh from `4f08d2bcd25de3aafa7295f3b349970f8003ed71` to `d2e28f46182a563fd594cc51847240429ab0a5b5` pass the same 91 Node tests before and after; three new static geometry equivalence checks bring the total to 94, with no import-map change required. Device retests and limits are recorded in QUALITY.md.

- 正式接口适配（`4f08d2bcd25de3aafa7295f3b349970f8003ed71`，引擎 [PR #549](https://github.com/cnedwin/Egret_rebuild/pull/549)）：91/91 Node、实体 Windows Edge/RTX 桌面 33/33、同机宽屏模拟 17/17、Fold7 物理设备原生触摸与五状态双向旋转、9 种屏幕 × 10 个状态均通过；WebGPU 硬件初段检查通过。 · Formal API adoption at `4f08d2bcd25de3aafa7295f3b349970f8003ed71` (engine PR #549): 91/91 Node tests, 33/33 on physical Windows Edge/RTX desktop, 17/17 on the same PC in wide touch emulation, real Fold7 native touch and five bidirectional state rotations, 9 screen profiles × 10 checkpoints passed; hardware WebGPU initial-play smoke passed. 实际设备、版本、复跑条件和未覆盖范围另见 [QUALITY.md](QUALITY.md)；引擎侧功能用例不等同于本游戏验收。 · Device, revision, repeat conditions and remaining limits are in QUALITY.md; engine fixtures are not game-device acceptance.

- 2026-11-28：更新引擎至 `33897768`，先独立通过原 51 项测试和 PC 基线，再迁移透明 Play 原生 UI；真显卡的布局、键鼠、指针锁定、全屏、高画质阴影、资源失败重试及旧设置兼容见 [QUALITY.md](QUALITY.md)。迁移架构、界面对应关系和复跑方法见 [UI-MIGRATION.md](UI-MIGRATION.md)。 · On 2026-11-28 the engine is refreshed to `33897768`; the standalone upgrade passed all 51 existing tests and the hardware baseline before the native interface migration. Hardware measurements and test boundaries are in QUALITY.md; architecture and reproduction are in UI-MIGRATION.md.

- 2026-11-21 引擎副本升级到 `b5628eb` 后：51 项 Node 测试通过；无头 Chromium 下标题画面与升级前逐像素相同，`?auto=1` 自动游玩 40–60 秒无控制台错误，中等画质下 `renderer.info.lightsTiled` 为 2。 · After the engine update on 2026-11-21: 51 tests pass, the title is pixel for pixel as before, and automatic play runs clean.
- 2026-11-21 在提交 `fc1dacb`、Node 22.23.4 下运行 `node --test test/*.test.mjs`：51 项全部通过（规则、输入、美术载入、模型挂点、连续蒙皮、投影代理、启动预绘）。 · `node --test` at commit `fc1dacb` with Node 22.23.4: all 51 tests pass.
- 2026-11-20 `node tools/quality.mjs FPS` 在无头 Chromium + SwiftShader 下测了 16 个自动项，结果见 [QUALITY.md](QUALITY.md)；软件渲染下 3D 场景几乎画不动，帧时间一项不代表真机。 · The 16 automatic quality items in headless Chromium with software rendering, see QUALITY.md; its frame time says nothing of real devices.
- 据 [STATUS.md](STATUS.md) 记录的真机检查：PC（RTX 5090 Laptop、Edge 157）与三星 SM-F966U1（Android 17、Chrome）上检查了三类角色的持枪、步行和蹲姿，第一人称枪械的瞄准、后坐、换弹和近裁切；公开版本的整局与性能复跑见 [PR #82 的验收记录](https://github.com/cnedwin/PortedGamesEgret/pull/82)。STATUS.md 里的两段整局帧率是美术修复前的历史基线。 · Device checks recorded in STATUS.md, on a PC and a Samsung phone; the public-run results are in PR #82. The whole-run frame rates there predate the art repair.

## 已知问题 · Known issues
- 高负载移动端仍有偶发长帧，公网模块发现、模型传输及正式宿主着色程序准备仍波动；详见 [QUALITY.md](QUALITY.md)。 · Mobile heavy-load hitches and public startup variability remain; see QUALITY.md. The Fold7 lacks a supported GPU timer query; CPU and callback metrics are not GPU or presentation times.

- 软件渲染下复杂 3D 场景可能低于验收器的动画回调门槛；真实标题已显示时仍可能报告等待帧循环超时，这不是首屏黑图误判或真实硬件性能结论。 · Complex 3D under software rendering can fall below the verifier's animation-callback threshold even after the real title is visible; this is neither a premature black screenshot nor a hardware performance measurement.

- 杉树在阴影里偏黑，背光时层次看不清 · Firs go nearly black in shade.
- 代打程序（`?auto=1`）不搜物资箱，自动演示里看不到搜集和背包 · The stand-in player never searches crates.
- 阵亡后从头开始；配件只作用于突击步枪，捡到即装、不能卸下 · Death restarts the run; attachments fit only the assault rifle.
- 原生数据视图的连续滑杆、调用方 canvas 的自适应和完整数据式 hold/touchButton 接口仍有缺口；设置保留原生步进按钮，触屏使用原生动作控件。原始锁定仅在浏览器支持和授权时生效，不承诺任何环境都可获得。见 [ENGINE-NOTES.md](ENGINE-NOTES.md) 第 7–10 条。 · Declarative sliders, caller-owned canvas fitting and complete data-view hold/touch controls remain gaps; native steppers and action controls are retained. Raw lock remains browser-dependent and permission-dependent. See ENGINE-NOTES 7–10.

## 已解决 · Solved

- 通用 verify 在启动就绪前过早保存第一张图的问题由引擎 [PR #555](https://github.com/cnedwin/Egret_rebuild/pull/555) 修复；现在先等可见画布、有效画面和动画回调，超时会明确报告原因而不提前操作。具名功能路线仍保留，见 ENGINE-NOTES 第 15 条。 · PR #555 fixes premature generic verification by waiting for a visible canvas, nonblank picture and advancing animation callbacks before input; bounded timeouts report why readiness was not established. Named functional routes remain (ENGINE-NOTES 15).

- 原生 World3D 宿主、鼠标锁定与双键、快捷键声明、实际控件裁切及遮挡检测已使用正式接口；删除游戏自写指针事件、锁定确认和 Tab 监听桥接，见 ENGINE-NOTES 第 6、7、11–14 条。 · Formal World3D attachment, mouse locking/chords, scoped key claims, clipped controls and occlusion detection replace the previous compatibility bridges (ENGINE-NOTES 6, 7, 11–14).

- 第一次出现补给箱时约 130 ms 的两次停顿：启动时在加载提示下把两种材质路径真实预绘一遍（`src/view.mjs` 的 `view.warm`），见 ENGINE-NOTES 第 4 条。 · Two stalls of about 130 ms when the first crate appeared: both material paths are drawn once under the loading screen (ENGINE-NOTES item 4).
- 加色混合的太阳光晕、枪口火光、红点画成不透明方块：材质设 `alphaMode: 'blend'`、`blending: 'additive'`（ENGINE-NOTES 第 2 条）。 · Additive glows drew as opaque squares (item 2).
- 超过八盏的点光源不生效：三个画质档使用引擎分块照明，仅显式 `?lights=near` 留作性能历史对照（ENGINE-NOTES 第 1 条）。 · All three presets now use the native tiled lighting; `?lights=near` remains an explicit historical comparison (item 1).
- 系统"减少动态效果"打开时镜头仍在晃：改用引擎的 `prefersReducedMotion()` / `watchReducedMotion()`，开启时不晃镜头、爆炸闪光减弱（ENGINE-NOTES 第 5 条）。 · The camera shook even with reduced motion asked for; the engine's reduced-motion helpers now turn the shake off (item 5).
- 历史 RTX 5090 Laptop 的 ANGLE D3D11 阴影上下文丢失：新版中画质硬件浏览器通过，恢复正常阴影开关，详见 ENGINE-NOTES 第 3 条与 QUALITY。 · The historical adapter-specific shadow switch was removed after actual medium-quality hardware verification; see item 3 and QUALITY.
- 标题、设置、操作、暂停、背包、结算和 HUD 全部改为原生 Play，删除旧 DOM/CSS 界面和第二套输入监听，设置通过兼容旧数据的引擎存储。 · The native Play interface and compatible engine save store replace the old DOM UI and its parallel input path.
- 带护甲中弹时界面报错、守卫在出生点就发现干员、新增箱体挡路、枪在阴影里纯黑、瞄准镜被枪身挡住、一局不到一分钟等，完整清单见 [STATUS.md](STATUS.md)「已经解决的问题」。 · The rest (an error when hit with armour, guards spotting the start, blocked posts, a black rifle, the scope view, runs under a minute) are listed in STATUS.md.

## 未完成 · Unfinished

- WebGPU 后端已通过 RTX PC 标题至初段移动检查，未跑完整局及手机 WebGPU；覆盖整块显示屏的原生全屏、真人难度评估和专门的听音检查都没做（STATUS.md「验收边界」）。 · Initial WebGPU title and movement passed on the RTX PC; no whole WebGPU mission or handset WebGPU, native full-monitor fullscreen, human difficulty assessment or listening test.
- 没有检查点和难度选择，只有一张地图、一个任务；背包是等大的十二格，不能丢弃；只有三把枪、两种配件；敌人没有小队配合，喊话没有语音；未做真手柄验收。完整清单与下一步建议见 [STATUS.md](STATUS.md)。 · No checkpoints, difficulty or second map; a twelve-slot backpack; three guns and two attachments; no squad tactics or voiced callouts; physical gamepad not yet qualified. See STATUS.md.

## 目录 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `index.html`，`style.css` | 页面、仅页面宿主样式 · page host styles only |
| `src/main.mjs` | 入口：启动引擎，驱动每一帧 · entry point: starts the engine and runs each frame |
| `src/sim.mjs` | 规则：干员、武器、敌人、终端、物资、撤离，不含任何绘制 · the rules: operator, weapons, enemies, terminals, loot, extraction, with no drawing in them |
| `src/data.mjs` | 数值 · tuning numbers |
| `src/level.mjs` | 地图方块、关键位置、行走网格 · map blocks, named places, the walking grid |
| `src/bot.mjs` | 代打玩家，用于自动检查和 `?auto=1` · a stand-in player for automated checks and `?auto=1` |
| `src/view.mjs`，`src/scenery.mjs` | 场景、灯光、特效 · scene, lights, effects |
| `src/soldier.mjs`，`src/soldier-skin.mjs`，`src/gun.mjs` | 连续角色蒙皮与动画、手中的武器 · continuous character skinning and animation, the weapon in hand |
| `assets/models/`，`src/asset-models.mjs` | GLB 美术和角色、道具的挂载清单 · GLB assets and the visual slot manifest |
| `src/build.mjs`，`src/textures.mjs`，`src/grime.mjs` | 几何体拼装、程序纹理、风化着色器 · geometry building, generated textures, the weathering shader |
| `src/ui/menus.mjs`，`src/ui/hud.mjs`，`src/ui/hud-state.mjs`，`src/text.mjs` | 原生数据菜单、状态 HUD、图形与双语文字 · native data menus, HUD state/graphics and bilingual text |
| `src/ui/touch.mjs`，`src/input.mjs` | 原生触屏控件、按键与指针适配 · native touch, keyboard and pointer adapter |
| `src/audio.mjs`，`src/music.mjs` | 原生混音及合成音效、随游戏状态变化的配乐 · native mixer and retained synthesised audio |
| `src/native-stats.mjs`，`src/native-settings.mjs` | 原生 World3D 统计、兼容历史设置 · native World3D statistics and compatible settings |
| `test/`，`tools/` | 规则、原生界面验收、多屏截图及无页面整局试玩 · rules, native UI acceptance, multi-screen screenshots and whole runs without a page |
| `STATUS.md` | 现状与待办：验证情况、已知问题、未完成的功能、模型细节 · status and backlog: what is verified, known issues, unfinished features, model detail |
| `vendor/` | 引擎运行时副本，来源见 `vendor/SOURCE.md` · a copy of the engine runtime, see `vendor/SOURCE.md` |

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `d2e28f46182a563fd594cc51847240429ab0a5b5`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit `d2e28f46182a563fd594cc51847240429ab0a5b5`, copied by the engine's `tools/vendor-game.mjs`; see [vendor/SOURCE.md](vendor/SOURCE.md).

入口 · Entries: `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d`, `@egret/engine/webgpu/world3d`, `@egret/engine/web/kit`, `@egret/engine/play`, `@egret/engine/kit`, `@egret/engine/ui`, `@egret/engine/ui/semantics`, `@egret/engine/ui/testing`, `@egret/engine/web/semantics`, `@egret/engine/web/audio`, `@egret/engine/input`, `@egret/engine/web/hover`, `@egret/engine/web/view`.
