# JY · 金庸群侠传致敬 Demo

## 简介 · Introduction

JY 是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的武侠网页游戏 Demo，向《金庸群侠传》、智冠公司和金庸先生致敬。游戏包含地图探索、剧情对白、队友招募、经典回合制战斗和浏览器存档。[在线试玩](https://cnedwin.github.io/PortedGamesEgret/JY/)

JY is an independently developed wuxia browser game demo built with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). It pays tribute to *Heroes of Jin Yong*, Soft-World, and Jin Yong. The game features exploration, story dialogue, companion recruitment, classic turn-based combat, and browser saves. [Play online](https://cnedwin.github.io/PortedGamesEgret/JY/)

## 浏览器完整版 · Full browser game

打开试玩页，游戏会自动启动。首次启动会下载并检查约 37.4 MB 的原版运行数据，回访时直接使用浏览器里的数据和存档。如果在线数据不可用，可以导入自备的 4in1 `.7z` 压缩包或其中的 `game` 文件夹。[在线试玩](https://cnedwin.github.io/PortedGamesEgret/JY/)

Open the play page to launch the game automatically. The first launch downloads and validates about 37.4 MB of original runtime data. Returning players use the game data and saves stored in their browser. If hosted data is unavailable, import your own 4in1 `.7z` archive or its `game` folder. [Play online](https://cnedwin.github.io/PortedGamesEgret/JY/)

[原项目的 4in1 资源说明 · Original 4in1 resource information](https://github.com/scarsty/kys-cpp#readme)

## 运行与开发 · Run and develop

游戏使用白鹭原生 World3D 和 WebGL2。角色移动、剧情事件、战斗和存档使用同一套游戏状态。项目内的 `web/` 是浏览器客户端，`src/` 是游戏规则，`tools/` 负责本地资源读取和启动。

The game uses Egret World3D and WebGL2. Movement, story events, combat, and saves share the same game state. The browser client lives in `web/`, the game rules in `src/`, and local launch and data tools in `tools/`.

大地图上点地面或地标即可寻路。路线和终点会显示在画面上，点另一处可以改道。战斗中，手机点高亮格可预览移动路线、武学范围或暗器目标，再按「确定」执行。PC 可悬停预览移动、单击执行，武学和暗器点选后按 Enter 确认。

Select terrain or a landmark on the world map to see your route and destination. Select another point to reroute. In combat, tap a highlighted tile to preview movement, a skill area, or a thrown-weapon target, then confirm. On PC, hover to preview movement and click to move. Select a skill or thrown-weapon target and press Enter to confirm.

大地图的远景镜头使用随高度变化的雾效。

The world map overview uses height-dependent haze.

### 部署在线游戏数据 · Deploy hosted game data

使用有公开分发授权的原版运行数据制作 `.7z`，保留 `game/` 顶层目录。原版需要 `game/` 下的配置、资源、事件脚本、音乐、音效、清单和初始存档 `save/0.zip`。把 `data/full-game.json` 放进 JY 的站点部署产物。下面的 `bytes` 必须填入归档文件的实际字节数，可以用 `node -p "require('node:fs').statSync(process.argv[1]).size" path/to/jy-original.7z` 获取。

Build a `.7z` archive from original game data licensed for public distribution, preserving its top-level `game/` directory. Include the runtime configuration, resources, event scripts, music, sound effects, lists, and the initial save `save/0.zip` within `game/`. Publish `data/full-game.json` with the JY site. Set `bytes` to the exact archive size in bytes, which the command above prints.

```json
{
  "version": 1,
  "enabled": true,
  "archive": "./jy-original.7z",
  "bytes": 37440245
}
```

`archive` 可以是相对于清单的路径，也可以是允许本站跨域读取的 HTTPS 地址。归档地址须直接返回文件，无需登录且无需重定向。将 `enabled` 设为 `false` 时，公开站点使用本机导入。

Set `archive` to a path relative to the manifest or a direct HTTPS URL whose CORS policy allows the game site. The URL must return the file without authentication or redirects. Set `enabled` to `false` for a local-import-only deployment.

### 本地试玩 · Local play

使用支持 WebGL2 的浏览器和 Node.js 24 或更新版本。在 `JY/` 目录中运行下列命令，传入你有权使用的 4in1 `game` 目录。

Use a WebGL2 browser and Node.js 24 or later. Run the following command from `JY/` and pass the path to a 4in1 `game` directory you are entitled to use.

```sh
node tools/launch.mjs /path/to/4in1/game --no-browser
```

打开终端显示的本地地址。存档保存在浏览器中，继续游戏时请使用相同的浏览器和地址。

Open the local URL printed in the terminal. Continue with the same browser and URL to access your saves.

### 测试 · Tests

```sh
node --test
```

## 资源与版权 · Assets and credits

游戏相关原作和美术的权利归各自权利人所有。随项目分发的美术、引擎和第三方组件各自保留版权及许可文件。

Rights to the original works and artwork belong to their respective holders. Distributed artwork, engine files, and third-party components retain their copyright and license notices.

[素材来源与许可 · Asset sources and licenses](ASSETS.md)

## 玩法与操作 · How to play

从小村出发，在大地图和各处场景里走动、和人物对话、触发剧情、招募队友，遇敌后进入经典的回合制格子战斗：轮到己方角色时选择移动、武学、药品或暗器、休息，打倒全部敌人获胜。进度存在浏览器里。

Set out from the village, walk the world map and its places, talk to people, follow the story and recruit companions. Fights are classic turn-based battles on a grid: on each of your turns choose to move, use a martial art, an item or a thrown weapon, or rest, until every enemy is down. Progress is kept in the browser.

| 操作 · Action | 键盘 · Keyboard | 触屏和鼠标 · Touch and mouse | 手柄 · Gamepad |
|---|---|---|---|
| 行走 · Walk | 方向键 / WASD · arrows or WASD | 点地面或地标寻路，点另一处改道 · tap the ground or a landmark; tap again to reroute | 十字键 · d-pad |
| 交谈、确认 · Talk, confirm | Enter / Space | 点人物或按钮 · tap | A |
| 菜单 · Menu | Esc（B 直接打开物品） · Esc (B opens the items) | 菜单按钮 · menu button | B / Start |
| 战斗：移动、武学、状态 · Battle: move, martial art, status | M、I、V | 点高亮格预览，再按「确定」 · tap a highlighted tile to preview, then confirm | 按键映射见 `web/gamepad-input.mjs` · see the mapping |
| 战斗：切换武学、休息、药品暗器、支援 · Battle: change art, rest, items, support | Q / F、L、B、T | 战斗菜单 · the battle menu | |
| 战斗：取消、投降、重开本场 · Battle: cancel, give up, restart | Esc、Esc、R | 战斗菜单 · the battle menu | |

PC 上悬停可预览移动路线，单击执行；武学和暗器选好目标后按 Enter 确认。 · On PC, hover to preview a move and click to make it; confirm a martial art or thrown weapon with Enter.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `@egret/engine` `createEngineForProfile` | 创建引擎、时钟和 2D 舞台 · the engine, its clock and the 2D stage | `web/main.mjs` |
| `@egret/engine/webgl2` `createSharedWebGL2Host` | 2D 界面层和 3D 场景共用一个 WebGL2 上下文 · one WebGL2 context for the 2D layers and the 3D scenes | `web/main.mjs` |
| `@egret/engine/webgl2/world3d` `createWebGL2Renderer3D` | 大地图、场景和战场的 3D 绘制 · drawing the world map, places and battlefields | `web/jyx2/scene/world3d-renderer.mjs` |
| `loadGltfFromUrl3D`、`loadTexture3D` | 载入场景、战场和人物模型与贴图 · loading scenes, battlefields, figures and textures | `web/jyx2/scene/native-battle-view.mjs` |
| `createAtmosphere3D` | 大地图远景随高度变化的雾 · the world map's height haze | `web/jyx2/scene/native-world-view.mjs` |
| `createCustomShader3D`、`createGeometry3D`、`createStandardMaterial3D` | 程序生成的大地图地形 · the world map's generated terrain | `web/jyx2/scene/native-world-terrain.mjs` |
| `AnimationMixer3D`、`Skeleton3D` | 场景人物的骨骼动画 · skinned figures in the places | `web/jyx2/scene/native-scene-actor.mjs` |
| `InstancedMesh3D` | 战场上成片的树木和草 · trees and grass on the battlefields | `web/jyx2/scene/native-battle-generic.mjs` |
| `renderer.preparePrograms` | 进入战斗前在加载画面里预编译战场的着色器 · preparing the battlefield's shaders under the loading screen | `web/jyx2/scene/native-battle-view.mjs` |
| `@egret/engine/text` `createTextField`、`createTextRasterCache` | 对白、战斗伤害数字 · dialogue and battle damage numbers | `web/opening-dialogue.mjs`、`web/battle-view.mjs` |
| `@egret/engine/web/text` `createCanvasTextRasterProvider` | 用浏览器字体栅格化文字 · rasterizing text with the browser's fonts | `web/main.mjs` |
| `@egret/engine/web/keyboard` `createBrowserKeyboardInput` | 大地图和战斗的键盘输入 · keyboard input on the map and in battle | `web/main.mjs` |
| `@egret/engine/web/gamepad` `createBrowserGamepadInput` | 浏览器手柄采样，接入 JY 的行走、菜单和战斗按键 · browser controller sampling feeding JY's movement, menu and battle bindings | `web/main.mjs`、`web/gamepad-input.mjs` |
| `Texture3D(canvas, { flipY: true })` | 直接上传大地图地标和船尾浪花的 Canvas 贴图 · direct canvas uploads for map markers and the boat wake | `web/jyx2/scene/native-world-canvas-texture.mjs` |
| `@egret/engine/web/audio` `createBrowserAudio` | 剧情、出招和受击 WAV 共用一个音效总线 · one effects bus for story, attack and impact WAV cues | `web/wav-effects.mjs` |
| `Bitmap`、`NineSliceBitmap`、`createSharedMaterial2D` | 立绘、对白框和战斗界面 · portraits, the dialogue frame and the battle interface | `web/opening-dialogue.mjs`、`web/battle-view.mjs` |

## 已验证 · Verified

- 2026-11-28：Windows Playwright WebKit iPhone 15 Pro 配置下修复启动兼容问题，标题截图及触摸设置通过，75/75 Node 测试通过；不是 iPhone 真机验收。见 [QUALITY.md](QUALITY.md)。 · Startup, title screenshot and touch Settings pass on Windows Playwright WebKit in an iPhone 15 Pro profile; 75/75 Node tests pass. Not a physical iPhone test. See QUALITY.md.

- 引擎副本 `c1570b0`：59 项 Node 测试通过。Windows Edge 使用同一套原版数据完成 691 开场、692 练功战（战斗 48）与奖励读档；实际 WebGL2 大地图可切换远近、出海和返岸。 · On `c1570b0`, 59 Node tests pass. Windows Edge runs opening 691, training fight 692 (battle 48), rewards and reload from the same original data, plus World3D zoom, sailing and return to shore.
- 2026-11-21 引擎副本升级到 `b5628eb` 后：59 项 Node 测试通过；无头 Chromium 下下载原版数据、开始新游戏、第一个 3D 房间画出并走动，无控制台错误，与升级前相同。 · After the engine update: 59 tests pass, and a new game starts and walks in the first 3D room with a clean console, as before.
- 2026-11-21 在提交 `fc1dacb`、Node 22.23.4 下运行 `node --test test/*.test.mjs`：59 项全部通过（原版数据格式、导航、事件、招募、经典战斗、原版存档、手柄映射）。 · `node --test` at commit `fc1dacb` with Node 22.23.4: all 59 tests pass.
- 2026-11-20 `node tools/quality.mjs JY` 在无头 Chromium + SwiftShader 下测了 16 个自动项，结果见 [QUALITY.md](QUALITY.md)。首屏一项量的是第一次下载并检查约 37.5 MB 原版数据的过程。 · The 16 automatic quality items in headless Chromium; the start-up item measured the first download and check of the original data.
- 没有在真机上做过记录在案的整局验收。 · No recorded whole-game acceptance on a real device.

## 已知问题 · Known issues

- 首次启动必须等约 37.5 MB 原版数据下载并检查完；在线数据不可用时只能导入自备的数据包。 · The first launch waits for about 37.5 MB of data; without hosted data a pack must be imported.
- 没有英文界面。 · No English interface.
- 品质验收未达标 · Quality items failing（[QUALITY.md](QUALITY.md)，2026-11-20，无头 Chromium + SwiftShader · headless, software rendering）：T3 不误触下拉刷新和双击缩放（overscroll free, touch-action auto, double-tap zoom on）；L1 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4）（37.9 s to the first playable screen, 37.5 MB）；I1 中英文全可切换，英文下无中文（no way to choose English found）。

## 已解决 · Solved

- 范围攻击一次出现很多不同的伤害数字，超出文字缓存一次能栅格化的数量，报 `TEXT_CACHE_BUDGET`：数字改为排队逐个准备，缓存忙时下一帧重试（`04313eb`，ENGINE-NOTES 第 1 条）。 · An area attack showed more distinct numbers than the text cache could rasterize at once; they are now prepared in turn (item 1).
- 第一次进战斗时链接着色器卡顿：在加载画面里对战场所有网格调用 `renderer.preparePrograms`；还没有网格的纸片人用替身网格预编译（`58783c3`、`e8db2ea`，ENGINE-NOTES 第 2 条）。 · The first battle stalled on shader links; every battlefield mesh is prepared under the loading screen, with a stand-in for the billboard actors (item 2).
- 经典战斗的结算错误（`04313eb`）；手机横屏下战斗按钮和结算按钮被挤出屏幕、竖屏对白超出短屏（`7e61c85`、`6f33093`、`58783c3`）。 · Classic battle settlement; battle and settlement controls pushed off short landscape screens, and dialogue overflowing short portrait screens.

## 未完成 · Unfinished

- 界面只有中文（繁体为主），没有英文切换。 · The interface is in Chinese only.
- 首次启动要下载约 37.5 MB 原版数据，还没有分段加载或先开始后补下载。 · The first launch downloads about 37.5 MB before play; there is no staged loading yet.
- 真机上的整局验收和帧时间测量。 · A whole-game run and frame-time measurement on real devices.

## 目录结构 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `index.html`、`web/` | 浏览器客户端：页面、界面、场景和战斗画面、输入、音乐 · the browser client |
| `web/jyx2/` | 3D 场景、人物、战场、特效及其美术 · 3D places, figures, battlefields, effects and their art |
| `src/` | 游戏规则：原版数据格式、导航、事件、招募、经典战斗、原版存档，不含绘制 · the rules, with no drawing |
| `browser/` | 在浏览器里导入、解压和检查 4in1 数据包 · importing and checking a 4in1 pack in the browser |
| `play/`、`server.mjs`、`tools/` | 本地启动和数据检查工具 · local launch and data tools |
| `data/` | 在线数据清单 `full-game.json` · the hosted-data manifest |
| `test/` | Node 测试 · Node tests |
| `ASSETS.md`、`licenses/`、`third-party/` | 素材来源和许可 · asset sources and licences |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

引擎副本由 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 主线提交 `c1570b0878d1be8716d06320206f51a62f9e3f32` 通过上游的 `node tools/build.mjs` 构建。浏览器服务工作线程和本地服务按包的导出清单加载，见 [vendor/SOURCE.md](vendor/SOURCE.md)。

The engine copy was built from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) main commit `c1570b0878d1be8716d06320206f51a62f9e3f32` using the upstream `node tools/build.mjs`. The service worker and local server load the package exports. See [vendor/SOURCE.md](vendor/SOURCE.md).

引擎副本、标题入口或小蝦米居渲染器的静态导入变更后，在 `JY/` 下重新生成托管版的模块预载清单。 · Regenerate the hosted title and Home scene module hints after updating the engine copy or either entry's static imports.

```sh
node --experimental-vm-modules tools/generate-startup-preloads.mjs
```
