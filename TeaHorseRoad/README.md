# Tea Horse Road · 茶马古道

## 简介 · Introduction

茶马古道是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的 3D 越野探索游戏 Demo。你开着马帮车队的头车，带着另外两辆满载茶砖的越野车，从滇南普洱茶山出发，蹚过浅滩、穿过有山匪出没的林子、开过金沙峡谷上的吊桥，翻过飘雪的垭口，把七十二捆茶送到高原驿站。路上有陡坡、溪流、山匪和狼群；三个驿站可以扎营，营地布置会存下来。一趟十分钟上下（扎营另算），有剧情对白和抵达高原的结尾短片。键盘、鼠标、手柄和手机触屏都能玩。

Tea Horse Road is an independently developed 3D off-road demo built with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). You drive the lead truck of a caravan of three, each loaded with bricks of tea, from the tea hills of Pu'er in the south of Yunnan through a ford, a forest where bandits wait, over a rope bridge across the gorge and through a snowy pass, to bring seventy-two bundles of tea to the station on the plateau. The road has steep grades, streams, bandits and wolves; at each of the three stations the crew can make camp, and the camp is kept. A journey takes about ten minutes, more with camps, with dialogue along the way and a closing film of the plateau arrival. Keyboard, mouse, gamepad and touch.

[在线试玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/TeaHorseRoad/)

## 玩法 · How to play

| | 键盘 · Keyboard | 手柄 · Gamepad | 触屏 · Touch |
|---|---|---|---|
| 油门 · Throttle | W / ↑ | RT，或左摇杆向前 · RT or left stick forward | 右下「油门」按住 · hold Throttle |
| 刹车、倒车 · Brake, reverse | S / ↓（停稳后继续按就倒车 · held at a standstill it reverses） | LT | 「刹车」按住 · hold Brake |
| 转向 · Steer | A / D，← / → | 左摇杆 · left stick | 左下方向滑条，松手回中 · the steering slider, centred on release |
| 喇叭 · Horn | H 或 E | Y | 「喇叭」 |
| 视角 · View | C | 右摇杆按下 · R3 | 「视角」 |
| 扶正 · Right the truck | R | Select | 翻车后出现「扶正」 · appears when rolled |
| 手刹 · Handbrake | 空格 · Space | X | |
| 暂停 · Pause | Esc / P | Start | 右上「Ⅱ」 |

手机请横屏游玩。支持的浏览器也可以在竖屏提示里点「横屏全屏」。· Play in landscape on phones. Supported browsers can also enter fullscreen landscape from the rotate prompt.

- **车队**：后两辆车自己沿路跟车、保持车距；掉队太远或翻车会被扶回路上。
- **山匪**（林子、峡口）：在路上横了几根木头逼车队减速（木头是可以推开的刚体，撞得太猛会把车颠起来），再从路边树林里冲出来追车。车速快时撞上会把他撞倒；车慢下来被扒住一秒多，就会被抢走一捆茶——追上把他撞倒，茶还能抢回来。
- **狼群**（垭口）：咬住车会拖慢它、扯开篷布的绑绳。按喇叭能把附近的狼吓跑一阵；高速撞上的狼会跑掉。
- **驿站**：开进驿站就到站存档。可以「扎营布置」：挑帐篷、篝火、驮马、茶箱、经幡杆、马灯放下，用手柄（画面上的变换手柄）拖动或旋转，拖空白处转相机；「保存营地」后，下次路过这里营地还在。
- **结局**：按送到的茶有三种结尾。最好的一趟记在标题画面上。

- **The convoy**: the two other trucks follow the road by themselves and keep their distance; one that falls far behind or rolls is set back on the road.
- **Bandits** (the forest, the gorge mouth) fell logs across the road to slow the convoy (the logs are bodies a truck can shove aside; hit them hard and they kick), then run out of the trees after the trucks. Hit one at speed and he goes down; slow down and one who holds on for a second takes a bundle of tea — knock him down and it comes back.
- **Wolves** (the pass) hang on to a truck, slow it and tear the ties of its tarp. The horn sends the wolves near you running for a while; one hit at speed gives up.
- **Stations**: driving into one saves the journey. *Make camp*: choose a tent, a fire, a pack horse, tea chests, a flag pole or a lantern, set it down, then drag the transform handles to move or turn it, and drag empty ground to turn the camera. Saved, the camp stands there on later journeys.
- **Endings**: three, by how much tea arrives. The best journey is shown on the title screen.

进度、营地和设置保存在浏览器里。Progress, camps and settings are kept in the browser.

## 引擎能力用在哪里 · Where each engine capability is used

下表每一项都由引擎 API 实现，写明了在游戏里能看到的地方和代码位置。引擎缺的、文档不清的和用着别扭的地方记在 [ENGINE-NOTES.md](ENGINE-NOTES.md)。

Every item below is done through the engine's API; the table says where it shows in the game and where the code is. What the engine lacks, what its documents leave unclear and what is awkward to use is in [ENGINE-NOTES.md](ENGINE-NOTES.md).

| 能力 · Capability | 在游戏里 · In the game | 文件 · File |
|---|---|---|
| `createPhysicsWorld3D` + `createVehicle3D` | 三辆车：复合形状车身、六个射线车轮（悬挂、转向、六驱）；地块的三角网碰撞体、路边树干石头、吊桥桥面是静态刚体，山匪横在路上的木头是动态刚体 · three trucks, each a compound chassis on six ray wheels with suspension, steering and six-wheel drive; terrain tiles, trunks and boulders and the bridge deck are static bodies, the logs the bandits fell across the road dynamic ones | `src/play/convoy.mjs`, `src/world/land.mjs`, `src/world/flora.mjs`, `src/world/landmarks.mjs`, `src/play/threats.mjs` |
| `createHeightField3D` + `createTerrain3D` + `createTerrainStream3D` | 4.6 公里的路两侧，192 米一块的地形随车流式加载（高度和图层权重在 Worker 里算），分块按距离换 LOD；四层地面材质（草、土路、岩石、雪）；远处 12 公里的群山是一整块低精度地形 · terrain streamed in 192 m tiles along 4.6 km of road (heights and layer weights computed in workers), chunks switching LOD by distance; a four-layer ground (grass, earth road, rock, snow); the far mountains are one 12 km low-detail terrain | `src/world/land.mjs`, `src/world/geography.mjs`, `src/world/tileWorker.mjs` |
| `createNavMesh3D` + `createNavCrowd3D` | 每处埋伏把那一片地形铺成导航网格，陡坡、河面、树干石头下的三角形关掉；山匪和狼是一群导航体，追最近的车、绕开障碍、彼此让开 · each ambush lays its stretch of ground as a navigation mesh with steep, wet and blocked triangles switched off; bandits and wolves are crowds of agents that run for the nearest truck round the obstacles and out of each other's way | `src/play/threats.mjs` |
| `createRagdoll3D` | 被车撞到的山匪带着车速倒成布娃娃（十一个部件、锥形和铰链关节） · a bandit hit by a truck falls as a ragdoll carrying its speed (eleven parts, cone and hinge joints) | `src/play/threats.mjs`, `src/models/figures.mjs` |
| `Bone3D` + `Skeleton3D` + `createAnimationClip3D` + `AnimationMixer3D` | 山匪和狼是蒙皮网格，跑、站、扑抢的动作是代码写出的关键帧剪辑，交叉淡入淡出 · bandits and wolves are skinned meshes; running, standing and grabbing are key-framed clips written in code, cross-faded | `src/models/figures.mjs` |
| `createCloth3D` | 每辆车的篷布（钉在车上、搭在货堆上，被风和车速吹动，狼能扯开绑绳）；驿站、吊桥、垭口和白塔上的经幡 · each truck's tarp (tied to the truck, lying over the load, lifted by the wind of its going, its ties torn loose by wolves); the prayer flags at the stations, the bridge, the pass and the stupa | `src/play/effects.mjs`, `src/world/landmarks.mjs` |
| `createRope3D` | 捆货的绳子（钉在车身上）；吊桥的主索和扶手索（扶手按吊杆分成短绳） · the lashings over the load, pinned to the truck; the rope bridge's cables and its hand ropes, short runs between hangers | `src/play/effects.mjs`, `src/world/landmarks.mjs` |
| `createDecal3D` | 车轮压过地面留下的车辙（地形的 `createDecal`）；蹚水和在土路上快跑时溅到车身上的泥点（直接对车身网格用 `createDecal3D`） · tyre tracks pressed into the ground (the terrain's `createDecal`); mud flung onto the trucks' bodies through water and at speed on earth (`createDecal3D` on the body mesh) | `src/play/effects.mjs` |
| `Font3D` + `createTextGeometry3D` | 驿站石碑、路牌、牌坊和垭口石碑上的立体字；字形由 `tools/make-glyphs.py` 按笔画画出 · the raised letters of the station steles, the road signs, the gate and the pass; the glyphs are drawn stroke by stroke by `tools/make-glyphs.py` | `src/art/font.mjs`, `src/models/buildings.mjs` |
| `createAudioListener3D` + `createPositionalAudio3D` | 听者挂在相机上；每辆车的发动机（音高随车速）和马铃、浅滩和河谷的水声都在场景里定位；喇叭、狼嚎、吆喝、撞击在发生处响起 · the listener rides on the camera; each truck's engine (pitched by its speed) and bells, and the water at the ford and in the gorge are placed in the scene; the horn, howls, shouts and knocks sound where they happen | `src/audio/soundscape.mjs` |
| `createScreenMarkers3D` | 下一个驿站（带距离）和两辆队友车的屏幕标记，出了画面贴边并用箭头指向 · markers for the next station (with its distance) and the two other trucks, held at the edge with an arrow when off the picture | `src/ui/markers.mjs` |
| `createWorld3DOverlay` | 所有 2D 界面（标题、HUD、触屏控件、卡片）画在 3D 画面上的引擎 2D 舞台里；按在空白处的拖动交给 3D 画布（扎营时转相机、拖手柄） · the whole 2D interface (title, HUD, touch controls, cards) is drawn on the engine's 2D stage over the 3D picture; drags on empty parts go to the 3D canvas (turning the camp camera, dragging the handles) | `src/main.mjs`, `src/ui/*.mjs` |
| `createTransformControls3D`（其手柄即 `TransformGizmo3D` · whose handles are a `TransformGizmo3D`）+ `createOrbitControls3D` | 扎营：移动、旋转营地物件，带吸附；相机绕营地转 · the camp: moving and turning pieces with snapping; the camera circling the yard | `src/play/camp.mjs` |
| `serializeScene3D` + `deserializeScene3D` | 营地写成场景文档存进存档，下次路过时读回来摆好 · the camp is written as a scene document into the save and read back on later journeys | `src/play/camp.mjs`, `src/main.mjs` |
| `createWater3D` | 浅滩、峡谷里的江和高原湖；车轮蹚水时按水深溅起水花、不起车尘；高画质下湖面有倒影 · the ford, the river in the gorge and the plateau lake; wading wheels throw spray by the depth and raise no dust; the lake reflects on High | `src/world/water.mjs`, `src/play/effects.mjs` |
| `createTrail3D` | 后轮扬起的车尘，颜色随地面（土黄、雪白），在水里和慢速时消失 · dust behind the rear wheels, coloured by the ground (earth, snow), gone in water and at low speed | `src/play/effects.mjs` |
| `createGpuParticles3D` | 雪山段的飘雪、涉水的水花、撞倒山匪扬起的尘土 · falling snow in the mountains, spray at the ford, dust when a bandit goes down | `src/play/effects.mjs` |
| `createAtmosphere3D` | 高度雾和光束作为后期，三段路各有雾色和浓度，最后一段渐入黄昏 · height fog and light shafts as a post pass, with each leg's colour and density, and dusk over the last stretch | `src/world/sky.mjs` |
| `createUiRoot` | 设置、暂停、驿站、扎营和结算卡片：一列行由托管界面准备、量高、一步提交 · the settings, pause, station, camp and ending cards: a column of rows prepared, measured and committed by the managed UI | `src/ui/card.mjs` |
| `createActionControl` | 所有按钮；触屏的油门、刹车踏板（按住算踩下） · every button; the touch throttle and brake pedals (held while pressed) | `src/ui/kit.mjs`, `src/ui/hud.mjs` |
| `createRangeControl` | 触屏方向滑条（松手回中）、音量滑条 · the touch steering slider (centred on release), the volume slider | `src/ui/hud.mjs`, `src/ui/kit.mjs` |
| `createSelectionGroup` | 画质选择、触屏按键显示、营地物件和手柄模式的单选 · choosing the picture quality, the touch controls, the camp piece and the handle mode | `src/ui/kit.mjs`, `src/main.mjs` |
| `createToggleControl` + `createControlKeys` | 音乐开关；所有控件可用键盘操作 · the music switch; every control works from the keyboard | `src/ui/kit.mjs` |
| `parseBitmapFont` + `createBitmapText` | 速度表、里程表和车上剩下的茶；字页在画布上画出 · the speedometer, the odometer and the tea aboard; the font page is painted on a canvas | `src/art/hudfont.mjs`, `src/ui/hud.mjs` |
| `createUiSemantics` + `createBrowserSemantics` | 一棵语义树投影到页面：按钮、滑条、开关、单选组、对话框（模态）、状态播报（地名、茶、时速、字幕） · one semantic tree projected into the page: buttons, sliders, switches, radio groups, modal dialogs, and a status with the place, the tea, the speed and the subtitles | `src/main.mjs`, `src/ui/*.mjs` |
| `createSaveStore` | 旅程进度（到了哪站、每辆车的茶、路上的记录）、各驿站的营地文档、设置、最好的一趟 · the journey (station reached, tea on each truck, the record of the road), each station's camp document, settings and the best journey | `src/saves.mjs` |
| `createBrowserVideo` | 结尾短片（21 秒，使用游戏内场景录制，按需加载 WebM 或 MP4）· the closing film (21 s, captured in-game and loaded on demand as WebM or MP4) | `src/ui/screens.mjs`, `media/` |
| `@egret/engine/web/gamepad` | 手柄的扳机、摇杆和按键；撞人时震动 · the pad's triggers, sticks and buttons; rumble on a knock | `src/play/input.mjs` |
| `createInputActions` + `bindBrowserInputActions` | 键盘的命名动作；`skipPrevented` 让焦点控件用掉的键不再开车 · named actions on the keys; with `skipPrevented` a key a focused control used does not drive | `src/play/input.mjs` |
| `createWorld3DApp` | 后端与画质选择（低画质无阴影、无泛光）、色调映射、帧循环 · backend and quality (Low without shadows or bloom), tone mapping, the loop | `src/main.mjs` |
| `createFollowCamera3D` | 跟车相机，碰到地形会拉近；三种距离 · the chase camera, pulled in by the ground; three distances | `src/main.mjs` |
| `CatmullRomCurve3D` | 路的中线：38 个控制点的向心 Catmull-Rom 曲线，每 2 米取样 · the road's centre line, a centripetal Catmull-Rom curve through 38 points sampled every 2 m | `src/world/route.mjs` |
| `InstancedMesh3D` + `createGeometryBuilder3D` | 茶树、松树、冷杉、阔叶树、石头按地块成组实例化，远近两种精度；车、驿站、白塔、营地物件由几何拼装 · tea, pines, firs, broadleaf trees and stones instanced per tile, with a near and a far shape; trucks, stations, the stupa and camp pieces assembled from parts | `src/world/flora.mjs`, `src/models/*.mjs` |

## 素材 · Assets

地形、三辆货车、茶叶和茶砖包装、驿站、吊桥、白塔、人物、狼、树和石头由代码建模。地面、木纹、布和粒子贴图由 `src/art/textures.mjs` 绘制，立体字由 `tools/make-glyphs.py` 生成，音乐和音效由 `src/audio/synth.mjs` 合成。载入画面的茶山插画 `assets/dawn-convoy.webp` 为本项目生成。结尾短片使用游戏内场景录制并用 FFmpeg 编码。

The terrain, trucks, tea leaves and packages, stations, bridge, stupa, people, wolves, trees and rocks are modelled in code. `src/art/textures.mjs` paints the textures, `tools/make-glyphs.py` generates the 3D lettering and `src/audio/synth.mjs` synthesizes the music and sounds. The loading illustration `assets/dawn-convoy.webp` was generated for this demo. The closing film was captured in-game and encoded with FFmpeg.

## 开发 · Development

```sh
python3 -m http.server 8000          # 在仓库根目录 · at the root of the repository
# 打开 http://localhost:8000/TeaHorseRoad/
#   ?quality=low|medium|high   画质 · picture quality
#   ?s=1500                    从路上 1500 米处直接开 · start driving 1500 m along the road
#   ?touch                     显示触屏控件 · show the touch controls
#   ?quiet                     不放开场字卡 · skip the opening cards
#   ?film                      结尾短片的录制模式 · the film's recording mode

node --test test/*.test.mjs                      # 在本目录 · in this folder
node tools/make-ending.mjs http://localhost:8000/TeaHorseRoad/   # 重录结尾短片（需要 Playwright 与 ffmpeg）
python3 tools/make-glyphs.py                     # 重画立体字字形（需要 shapely）
```

测试检查路（长度、坡度、驿站与埋伏的次序、路面高度）、存档（旅程、营地文档、坏档另存）、合成的声音（有限、不削波、循环无缝）和引擎副本的 import map。

The tests check the road (its length, grades, the order of stations and ambushes, the road's height), the save (the journey, camp documents, an unreadable save set aside), the synthesized sound (finite, unclipped, seamless loops) and the import map of the engine copy.

| 目录 · Folder | 内容 · Contents |
|---|---|
| `src/world/` | 路、地形流、草木、水、天空、驿站与吊桥 · the road, terrain stream, plants, water, sky, stations and bridge |
| `src/play/` | 车队、输入、车辙尘土篷布、山匪与狼、营地、剧情 · the convoy, input, traces and cloth, bandits and wolves, the camp, the story |
| `src/models/` | 车、人物与狼、植物、建筑 · trucks, figures, plants, buildings |
| `src/ui/` | 界面零件、卡片、HUD、屏幕标记、整屏画面 · interface parts, cards, the HUD, markers, screens |
| `src/audio/`, `src/art/` | 合成声音；贴图、字形、仪表字体 · synthesized sound; textures, glyphs, the gauge font |
| `media/` | 结尾短片 · the closing film |
| `vendor/` | 引擎副本，见 `vendor/SOURCE.md` · the engine copy |

引擎副本取自 Egret_rebuild 提交 `687037a`，由引擎仓库的 `tools/vendor-game.mjs` 复制。The engine copy is from Egret_rebuild commit `687037a`, copied by the engine's `tools/vendor-game.mjs`.

## 已验证 · Verified

- `node --test test/*.test.mjs`：路（长度、坡度、驿站与埋伏的次序、路面高度）、存档、合成声音、引擎副本的 import map。 · The Node tests: the road, the save, the synthesized sound and the engine copy's import map.
- 无头 Chromium（SwiftShader 软件渲染）：自动驾驶从出发跑到结局，没有控制台错误；手机横屏触屏模拟（844×390）下踏板、方向滑条、喇叭可用，能开到第一个驿站；营地存档后刷新能读回。这些在提交 `0899e4a` 上跑过。 · In headless Chromium with software rendering: an autopilot journey from the start to the ending with a clean console; touch on an emulated phone held sideways (844 × 390) driving to the first station; a saved camp read back after a reload — run at commit `0899e4a`.
- GitHub Pages 上的线上页面在 `0899e4a` 部署后打开、开始并能驾驶。 · The live page on GitHub Pages opened, started and drove after `0899e4a` was deployed.

## 已知问题 · Known issues

- 真显卡和真手机上没有运行过，帧率没有测过。 · Not run on a real GPU or phone; frame rates were not measured.
- 软件渲染下天空盒是黑的（见 ENGINE-NOTES），截图里天顶偏暗。 · Under software rendering the skybox is black (see ENGINE-NOTES), so pictures show a dark zenith.
- 一趟的时长只按自动驾驶估计：全程最快约 4.7 分钟驾驶，真人估计十分钟上下，没有实测。 · A journey's length is estimated from the autopilot alone (about 4.7 minutes of driving at best); no player was timed.
- 品质验收未达标 · Quality items failing（[QUALITY.md](QUALITY.md)，2026-11-20，无头 Chromium + SwiftShader · headless, software rendering）：F1 桌面帧时间 p95 ≤ 16.7 ms（p95 483.2 ms over 19 frames）；I1 中英文全可切换，英文下无中文（no way to choose English found）；E2 资源失败有错误界面和重试（1 files refused; no uncaught error; no error screen with a retry）。

## 已解决 · Solved

- 车上的篷布和捆绳开出几十米后消失：引擎布料与绳子的网格包围球不随顶点更新，被视锥剔除；车上的这几块网格关掉剔除（ENGINE-NOTES「布和绳的网格移动后被视锥剔除掉」）。 · Tarps and lashings vanished a few dozen metres on: the cloth and rope meshes keep stale bounds and are culled; those meshes are no longer culled.
- 吊桥主索在桥下打折、捆绳松垮：`slack` 是多出来的比例，不是长度倍数（ENGINE-NOTES「绳子的 `slack`」）。 · The bridge cables folded under the deck and the lashings hung loose: `slack` is the extra share, not a length factor.
- 篷布和经幡缩成一团：`Cloth3D` 的 `right` / `down` 是整条边。 · The tarps and flags collapsed: `right` and `down` of `Cloth3D` are whole edges.
- 低画质一帧 630 万个三角形：草木改成按地块、按距离切换远近两种精度。 · 6.3 million triangles a frame on Low: plants switch between a near and a far shape by tile and distance.
- 车在吊桥上翻下峡谷后扶正到谷底：桥两边加了路缘，扶正时取路面高度。 · A truck fallen off the bridge was righted at the bottom of the gorge: the deck has kerbs, and righting takes the road's height.

## 未完成 · Unfinished

- 结尾短片等美术提升后再录（`tools/make-ending.mjs`）；没有短片时到站直接进结算。 · The closing film is to be recorded once the art is improved; until then the journey goes straight to its account.
- 真机帧时间、首屏时间的测量。 · Frame-time and start-up measurements on real devices.

## 目录结构 · Layout

见上面「开发 · Development」一节的目录表。 · See the table under Development above.

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `687037ac462c48dbfe00523312125b94072ffea4`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit `687037ac462c48dbfe00523312125b94072ffea4`, copied by the engine's `tools/vendor-game.mjs`; see [vendor/SOURCE.md](vendor/SOURCE.md).

入口 · Entries: `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d`, `@egret/engine/webgpu/world3d`, `@egret/engine/bitmapfont`, `@egret/engine/ui`, `@egret/engine/ui/semantics`, `@egret/engine/web/semantics`, `@egret/engine/kit`, `@egret/engine/web/kit`, `@egret/engine/web/game`, `@egret/engine/web/video`, `@egret/engine/web/gamepad`, `@egret/engine/input/gamepad`, `@egret/engine/text`, `@egret/engine/web/text`.
