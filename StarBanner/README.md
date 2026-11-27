# 星旗战记 · Starbanner Tactics

## 简介 · Introduction

星旗战记是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的斜 45 度 3D 战棋游戏 Demo，日系西幻风格，卡通渲染。晨星王国与夜鸦公国在一块浮空沙盘上对阵：用村庄和要塞的收入在兵营、飞羽塔、港口招兵，派剑士和枪兵去占领村庄，用骑士冲锋、弓手守点、投石车轰城，最后击倒敌方指挥官或攻破敌方要塞取胜。

- 战斗规则：伤害随攻方剩余生命变化，防御星随守方生命打折，河流与沙滩反而加重伤害；每个兵种有自己的暴击条件（骑士整整冲出 6 格、弓手原地不动、枪兵并肩站、猎犬围猎……）；被打的一方若还活着、够得着就会反击；占领、收入、建筑回血、援军、法师治疗、魔女诅咒、运输采用固定数值。详见 [docs/DESIGN.md](docs/DESIGN.md)。
- 四位指挥官（赛琳、埃德蒙、维蕾塔、格伦）、两个阵营、三张地图、全部兵种和建筑的外观与设定都是本作原创；音乐和音效全部由代码合成。
- 遭遇战可选地图、双方指挥官、难度（轻松 / 标准 / 困难）和先后手；每个回合结束自动存档，关掉页面回来能接着打。

Starbanner Tactics is a 45-degree 3D tactics game demo built independently on the [new Egret engine, Egret
Rebuild](https://github.com/cnedwin/Egret_rebuild), in a toon-shaded Japanese western-fantasy style. The Morningstar
Kingdom and the Nightraven Duchy face each other on a floating diorama: spend the income of villages and strongholds
on troops from barracks, aeries and harbours, send swordsmen and pikemen to take villages, charge with knights, hold
ground with archers, batter walls with trebuchets, and win by felling the enemy commander or breaking their
stronghold.

- Combat rules: damage scales with the attacker's remaining health, cover stars weaken as the
  defender is hurt, rivers and beaches make wounds worse; each unit has its own critical condition (a knight charging
  exactly six tiles, an archer standing still, pikemen side by side, hounds hunting in pairs…); a surviving defender
  within reach strikes back; capture, income, building repair, reinforcing, a mage's healing, a witch's hex and
  carrying use the fixed game values. See [docs/DESIGN.md](docs/DESIGN.md).
- The four commanders (Seline, Edmund, Vireta, Garron), the two factions, the three maps and the look and lore of
  every unit and building are this game's own; all music and sound is synthesized in code.
- A skirmish picks the map, both commanders, the difficulty (easy, normal, hard) and who moves first; the battle is
  saved at the end of every turn and can be resumed later.

试玩 · Play: <https://cnedwin.github.io/PortedGamesEgret/StarBanner/>

## 玩法与操作 · How to play

**目标 · Goal**：击倒敌方指挥官，或把敌方要塞的耐久打到 0。 · Fell the enemy commander, or bring the enemy stronghold to 0.

**一个回合 · A turn**

1. 回合开始，你的要塞和每座村庄各给 100 金；你的建筑回复 10 点耐久，指挥官回复 5 点生命。 · Your stronghold and each village give 100 gold; your buildings mend 10, your commander 5.
2. 选一个还没行动的单位 → 选一个能走到的蓝色格子 → 在菜单里选攻击、占领、援军、治疗、诅咒、登乘、卸下、战意技或待命。每个单位每回合行动一次，行动后变灰。 · Pick a ready unit → a blue tile → an action. Each unit acts once a turn and greys out after.
3. 在自己的兵营、飞羽塔或港口选兵种，再从绿色出兵格中挑一格。触屏第一次点选预览，第二次确认。每座建筑每回合可招募一次，新兵下回合行动。 · Choose a unit at a barracks, aerie or harbour, then select a green deployment tile. On touch, tap once to preview and again to deploy. Each building recruits once per turn. Recruits act on the next turn.
4. 结束回合，电脑行动。 · End the turn; the computer moves.

**战斗 · Fighting**：攻击前的预测面板写着这一击的伤害范围、会不会暴击、对方的反击。单位卡写着每个兵种的暴击条件；指挥官的战意槽满了就能放战意技。 · The forecast shows the damage range, whether it is critical, and the counter. The unit card states each unit's critical condition; a full rally meter lets the commander use their art.

| 输入 · Input | 操作 · Controls |
|---|---|
| 鼠标 · Mouse | 左键点模型选兵或打开兵营，空地只查看。悬停预览路径和伤害，左键确认落点、目标或出兵格。左键或中键拖动平移，滚轮围绕指针缩放，游戏区域内右键取消或返回。 · Click pieces or barracks to select them, and empty ground to inspect. Hover for paths and forecasts, then click a tile or target to confirm. Drag with the left or middle button to pan, scroll to zoom at the pointer, or right-click inside the game to go back. |
| 键盘 · Keys | 方向键 / WASD 移动光标，Enter / 空格 / Z 确定，Esc / X 取消，Q / E 转视角，Tab 下一个待命单位，R 敌方威胁范围，F 结束回合，M 菜单，+ / − 缩放 · arrows or WASD move the cursor, Enter / Space / Z confirm, Esc / X cancel, Q / E turn the view, Tab next ready unit, R enemy threat, F end turn, M menu, + / − zoom |
| 手柄 · Gamepad | 摇杆 / 十字键移动光标，A 确定，B 取消，LB / RB 转视角，Y 下一个单位，X 威胁范围，Start 菜单，Select 结束回合，右摇杆平移 · stick or d-pad move, A confirm, B cancel, LB / RB turn, Y next unit, X threat, Start menu, Select end turn, right stick pans |
| 触屏 · Touch | 点选单位和格子（移动时点一次看路线、再点一次确认），双指缩放，拖动平移，屏幕下方有结束回合、下一个、威胁范围、转视角、缩放按钮 · tap units and tiles (in a move, one tap shows the path, a second goes), pinch to zoom, drag to pan; buttons along the bottom |

网址参数 · URL parameters：`?quality=low|medium|high`、`?backend=webgpu`、`?lang=en`、`?seed=`、`?battle=wheat|coves|spine`（直接开打 · straight into a battle）。

## 战役与迷雾 · Campaign and fog

- 标题页的「星旗战役」从麦浪渡口开打。胜利后解锁双子海湾和龙脊，战果页可进入下一章或重打。战役与遭遇战分别保存，通过战场菜单的「保存并返回标题」可切换。 · Start the campaign at Wheatwater Ford. Victories unlock Twin Coves and Dragonspine. The campaign and skirmishes have separate saves. Use Save and return to title to switch between modes.
- 遭遇战准备页可开关战争迷雾。友军和已占建筑提供视野，雾中的敌兵、归属和战斗情报需侦察后才能看见。电脑也按已观察到的敌情选择目标。 · Toggle fog of war at skirmish setup. Friendly troops and buildings provide sight. Enemy positions, ownership and battle intelligence are hidden outside sight, and the AI targets what it has observed.

## 美术、声音与数值 · Art, sound and numbers

- 兵种、指挥官、建筑和树木山石先由文字描述生成原创的概念图，再用 Tripo 生成 3D 模型；人形单位和指挥官绑定骨骼，带待机、行走、出手、受击、倒下五段动作；再压成高、中、低三档。头像取自同一批概念图。来源和处理见 [docs/ASSETS.md](docs/ASSETS.md)。 · Units, commanders, buildings, trees and peaks were first drawn as original concept pictures from written descriptions, then modelled by Tripo; humanoids are rigged with idle, walk, strike, hurt and fall; all packed into high, medium and low sets. Portraits come from the same concept pictures. See docs/ASSETS.md.
- 卡通渲染：分层明暗、边缘光、阵营换色（模型上的蓝色按阵营换成绯红）、行动后变灰、受击闪白，都在一个自定义片元着色器里；单位和建筑另有后期描边。 · Toon shading: banded light, rim light, the team colour swap, grey once acted and a white flash on a hit live in one custom fragment hook; units and buildings get a post-process ink outline.
- 声音：三段循环曲和两段胜负短曲从原创合成曲谱预先导出为 MP3，按需加载。短音效仍用代码合成。 · The three music loops and two result cues are exported from the original synthesized scores to MP3 and loaded as needed. Short effects are synthesized in the browser.
- 电脑对手按期望伤害、被反击和下回合挨打的风险、占领和地形估值，三档难度的谨慎程度和随机性不同。 · The computer weighs expected damage, the counter and next turn's danger, capture and cover; the three levels differ in caution and noise.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `@egret/engine/webgpu/world3d` · `createWorld3DApp` | 3D 程序、画质档位、帧循环；默认 WebGL2，`?backend=webgpu` 走 WebGPU · the 3D app, quality presets and frame loop; WebGL2 by default, WebGPU with `?backend=webgpu` | [src/view/stage.mjs](src/view/stage.mjs) |
| `@egret/engine/world3d` · `createPerspectiveCamera3D`、`createDirectionalLight3D`、`createHemisphereLight3D`、`createGradientCubeTexture3D` | 斜 45 度镜头、带阴影的日光、天光与渐变天空 · the 45-degree camera, shadowed sun, sky light and gradient sky | [src/view/stage.mjs](src/view/stage.mjs) |
| `renderer.postProcess`（`outlineLayers`、`bloom`、`fxaa`） | 单位与建筑的墨线描边、泛光、抗锯齿 · ink outlines on units and buildings, bloom, antialiasing | [src/view/stage.mjs](src/view/stage.mjs) |
| `createToonMaterial3D`、`createCustomShader3D`（片元钩子） | 卡通分层光照、边缘光、阵营换色、变灰、闪白 · banded toon light, rim, team colour swap, grey and flash | [src/view/toon.mjs](src/view/toon.mjs) |
| `createCustomShader3D`（顶点钩子） | 水面起伏、草花摇摆 · the water's swell, swaying grass and flowers | [src/view/board.mjs](src/view/board.mjs) |
| `createGeometry3D`、`InstancedMesh3D` | 沙盘地面、岸壁和侧壁；树、山、礁石、桥板、草丛按实例批量画 · the board's ground, banks and walls; trees, peaks, reefs, planks and grass as instanced batches | [src/view/board.mjs](src/view/board.mjs) |
| `loadGltf3D`（meshopt）、`computeObjectBounds3D`、`Skeleton3D` | 读压缩后的模型、量尺寸放进格子、每个单位一副独立骨骼 · compressed models loaded, measured to fit a tile, each unit its own bones | [src/view/assets.mjs](src/view/assets.mjs) |
| `AnimationMixer3D` | 人形单位的待机、行走、出手、受击、倒下动作与淡入淡出 · humanoid idle, walk, strike, hurt and fall clips with cross-fades | [src/view/figures.mjs](src/view/figures.mjs) |
| `InstancedMesh3D`、`createUnlitMaterial3D` | 移动、攻击、战意技范围和路线、光标 · move, attack and art ranges, the path, the cursor | [src/view/overlay.mjs](src/view/overlay.mjs) |
| `InstancedMesh3D`、`createRingGeometry3D` | 火花、光点、箭矢弩箭石弹魔弹、占领光环 · sparks, motes, missiles, capture rings | [src/view/effects.mjs](src/view/effects.mjs) |
| `Raycaster3D` | 鼠标和触屏点到的格子 · the tile under the mouse or finger | [src/view/stage.mjs](src/view/stage.mjs) |
| `projectToViewport3D` | 单位头顶的生命数字、伤害飘字、菜单位置 · health badges, damage figures and menu placement | [src/play.mjs](src/play.mjs) |
| `@egret/engine/kit` · `createSaveStore` | 设置、进行中的一局、战绩，带版本和坏档另存 · settings, the battle in progress and the record, versioned, a bad save set aside | [src/saves.mjs](src/saves.mjs) |
| `@egret/engine/web/kit` · `browserSaveStorage` | 浏览器里的存档存储，拒绝写入时不报错 · the browser's save storage, quiet when refused | [src/main.mjs](src/main.mjs) |
| `@egret/engine/kit` · `encodeWav` | 合成好的音效与曲子编码成 WAV 交给混音器 · synthesized effects and pieces encoded for the mixer | [src/audio/sound.mjs](src/audio/sound.mjs) |
| `@egret/engine/web/audio` · `createBrowserAudio` | 音效与音乐两条总线、循环曲、淡入淡出、限幅 · effects and music buses, looping pieces, fades, a limiter | [src/audio/sound.mjs](src/audio/sound.mjs) |
| `@egret/engine/input/gamepad` · `createGamepadInput` | 手柄按键、摇杆、方向连发 · gamepad buttons, sticks and repeat | [src/input.mjs](src/input.mjs) |
| `createWorld3DOverlay` · `fit: 'expand'`、`portrait`、`game.onScreenChange` | 透明 2D 舞台随 3D 画布扩展并原地适配横竖屏，空白手势穿透 · expanded transparent 2D stage above 3D, in-place orientation and empty-area gesture routing | [src/ui/host.mjs](src/ui/host.mjs) |
| `@egret/engine/ui` · `createActionControl`、`createToggleControl`、`createSelectionGroup`、`createControlKeys`、`createHoverControl` | 操作、开关、单选、键盘与鼠标状态 · action, toggle, choice, key and hover state | [src/ui/kit.mjs](src/ui/kit.mjs) |
| `createUiLayerManager`、`createUiScreenStack`、`createUiRoot` | 标题、菜单、设置、准备、战果、模态层与返回顺序 · native pages, modal layers, back and focus restoration | [src/screens.mjs](src/screens.mjs) |
| `createUiSemantics`、`createBrowserSemantics`、`createUiTester` | 发布命名语义树、浏览器辅助功能映射与按名称验收 · named semantic tree, browser accessibility projection and named-control testing | [src/ui/host.mjs](src/ui/host.mjs) |
| `createAtlasLabel`、`loadTexture`、`textureFromCanvas` | 双语文字、头像与沙盘缩略图 · bilingual labels, portraits and map thumbnails | [src/ui/kit.mjs](src/ui/kit.mjs) |

## 已验证 · Verified

- `node --test test/*.test.mjs` 覆盖战斗数值和规则、AI 装卸与迷雾、战役解锁、存档迁移和双语文字。 · Node tests cover battle rules, AI transport and fog, chapter unlocks, save migration and bilingual text.
- `node test/accept.mjs` 覆盖键盘出阵、移动、手选出兵、敌方回合、续档和坏档恢复。随仓库的截图基线来自 Linux 软件渲染，Windows 上需单独核对实际画面。 · The browser acceptance covers keyboard setup, movement, deployment, enemy turns, save resume and damaged save recovery. The bundled reference images use Linux software rendering. Review current images separately on Windows.
- 原生叠加层相关的按名称控件验收、`test/touch-accept.mjs` 的拖动及多触点、`test/art-accept.mjs` 的合法存档战意技与 `test/screen-route.mjs` 的可重放多屏检查，详见 [UI-MIGRATION.md](UI-MIGRATION.md) 和 [QUALITY.md](QUALITY.md)。 · See UI-MIGRATION and QUALITY for native named-control acceptance, multi-touch, legal replay-based rally art and the multi-screen route.
- 品质验收见 [QUALITY.md](QUALITY.md)（`node ../tools/quality.mjs .`）。 · Quality results in QUALITY.md.
- Windows Edge RTX 5090 Laptop 与 Fold7 外屏实际浏览器已验证操作和横竖屏；手柄使用浏览器标准 Gamepad 模拟，未验真手柄、Fold7 内屏或读屏器。 · Actual Windows Edge/RTX and Fold7 outer-screen browser input were tested. The standard Gamepad path was simulated; a physical controller, inner display and screen reader were not tested.

## 已知问题 · Known issues

- 软件渲染下只有每秒几帧，验收截图之外的动画流畅度要在真 GPU 上看。 · Software rendering runs at a few frames a second; smoothness needs a real GPU.
- 骑士、马车、器械、热气球、飞兵和舰船是整体模型，只有颠簸、悬浮、摇摆和前冲，没有分件动画。 · Knights, carts, engines, the balloon, fliers and ships are single meshes with bobbing, hovering, rolling and lunging only.
- 品质验收未达标 · Quality items failing（[QUALITY.md](QUALITY.md)，2026-11-25，无头 Chromium + SwiftShader · headless, software rendering）：F1 桌面帧时间 p95 ≤ 16.7 ms（p95 633.3 ms over 14 frames）。
- World3D 叠加层尚缺独立 `uiScale`、原生屏幕检查的控件采集、并发图片排队、启动阶段计时与按需绘制；见 ENGINE-NOTES 5–10。冷启动有额外等待，小屏 SwiftShader 帧预算未达标，真实 GPU 和软件渲染各自测量见 QUALITY。 · Overlay UI scale, control-report integration, image admission, startup attribution and on-demand rendering are tracked in ENGINE-NOTES 5–10. Cold start is slower and software small-screen cadence regressed; QUALITY separates real GPU and software timing.

## 已解决 · Solved

- 克隆的材质共用同一个自定义着色器参数，一个单位变灰会让同类全变灰：每个单位的材质克隆后重新 `createCustomShader3D`（ENGINE-NOTES 第 1 条）。 · Cloned materials shared custom shader parameters, so greying one unit greyed its kind: each copy gets its own `createCustomShader3D` (ENGINE-NOTES 1).
- 只有顶点钩子的着色器误填进 `glsl` 会编译失败：改用 `glslVertex` / `wgslVertex`（ENGINE-NOTES 第 2 条）。 · A vertex-only hook passed as `glsl` failed to compile; it now goes in `glslVertex` / `wgslVertex` (ENGINE-NOTES 2).
- 软件渲染下镜头插值跟不上，截图前用 `rig.snap()` 直接落位。 · Under software rendering the camera's easing lagged; captures snap it into place first.
- 生成的模型朝向与引擎约定相反：人形单位整体转半圈。 · Generated rigs faced away from the engine's forward; humanoids are turned half round.
- 模型文件读不到时（品质验收 E2）不再只在控制台里警告：画面下方说明哪里出了问题，给出「重试」（重新载入）和「先这样玩」（用代码画的替身继续）。 · When model files fail to arrive (quality item E2) the page now says so and offers to try again or play on with stand-in shapes.
- 英文模式下标题副标和页面标题里还留着中文（品质验收 I1）：都改成英文。 · Chinese left in the English title and page title (quality item I1) is now English.
- 战斗中切换语言时界面按钮仍是旧语言：切换后整套战斗界面按新语言重建；战斗界面不再清空页面上的画面层，设置和战果面板能在战斗中正常弹出。 · Switching the language mid-battle now rebuilds the battle interface, and the HUD no longer wipes the screens' layer, so settings and the result show over a battle.
- 原 DOM 界面的宽屏刘海遮挡、窄屏点击面积和焦点问题，改用引擎 `screen.safe`、原生焦点控件、页面栈和安全区几何验证；转屏保持同一叠加层及战斗实例。 · Replaced DOM notch/target/focus handling with the engine's safe geometry, control focus and screen stack; orientation keeps the same overlay and battle.

## 未完成 · Unfinished

- 天气、本地双人对战、地图编辑器。 · Weather, local two-player, a map editor.
- 更多兵种和指挥官。 · Additional unit types and commanders.
- 骑士和器械的分件动画（马腿、投石车的抛臂）。 · Part animation for knights and engines (horse legs, the trebuchet's arm).

## 目录结构 · Layout

| 路径 · Path | 用途 · What |
|---|---|
| `index.html`、`style.css` | 页面、import map、两套引擎画布宿主样式 · the page, import map and canvas host styles |
| `src/main.mjs` | 入口：舞台、存档、声音、操作、画面切换 · entry: stage, save, sound, input, screens |
| `src/play.mjs` | 一局战斗：操作流程、事件演出、电脑回合、存档 · a battle: the order flow, events played out, computer turns, saving |
| `src/hud.mjs`、`src/screens.mjs` | 战斗界面；标题、准备、设置、玩法、战果 · battle HUD; title, preparation, settings, help, result |
| `src/ui/` | 原生叠加层、绘制、控件、语义与布局 · native overlay, art, controls, semantics and layout |
| `src/input.mjs` | 键盘、鼠标、触屏、手柄 · keys, mouse, touch, gamepad |
| `src/i18n.mjs` | 中英文字表 · the word table |
| `src/saves.mjs` | 存档 · the save |
| `src/sim/` | 规则（不碰页面和引擎）：`terrain.mjs` 地形、`units.mjs` 兵种与建筑、`commanders.mjs` 指挥官与战意技、`maps.mjs` 地图、`rules.mjs` 规则与伤害、`ai.mjs` 电脑 · the rules, free of page and engine |
| `src/view/` | 画面：`stage.mjs` 舞台与镜头、`board.mjs` 沙盘、`toon.mjs` 卡通材质、`figures.mjs` 单位与建筑、`overlay.mjs` 范围与光标、`effects.mjs` 特效、`assets.mjs` 模型载入 · the picture |
| `src/audio/` | `synth.mjs` 合成乐器、原创曲子与音效，`sound.mjs` 接到引擎混音器 · synthesis and the mixer |
| `assets/models/` | 模型的高、中、低三档 · models in three sets |
| `assets/portraits/` | 头像 · portraits |
| `tools/assets/` | 模型描述表、打包和头像脚本 · model descriptions, packing and portrait scripts |
| `docs/DESIGN.md`、`docs/ASSETS.md` | 规则与数值的来源；素材来源 · where the rules and numbers come from; where the assets come from |
| `test/` | Node 测试、浏览器验收和截图基线 · Node tests, browser acceptance and baselines |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

- 引擎提交 · Engine commit：`938a8d206fb3395bbac47be832a374df7b37eed3`（见 · see [vendor/SOURCE.md](vendor/SOURCE.md)）。
- 生成命令 · Made with：`node tools/vendor-game.mjs ../PortedGamesEgret/StarBanner @egret/engine @egret/engine/world3d @egret/engine/webgpu/world3d @egret/engine/webgl2/world3d @egret/engine/kit @egret/engine/web/kit @egret/engine/audio @egret/engine/web/audio @egret/engine/input/gamepad @egret/engine/web/gamepad @egret/engine/input/hover @egret/engine/web/hover @egret/engine/ui/semantics @egret/engine/web/semantics @egret/engine/animation @egret/engine/ui @egret/engine/ui/testing`
- 用到的入口 · Entries used：`@egret/engine/world3d`、`@egret/engine/webgpu/world3d`、`@egret/engine/webgl2/world3d`、`@egret/engine/kit`、`@egret/engine/web/kit`、`@egret/engine/web/audio`、`@egret/engine/input/gamepad`、`@egret/engine/ui`、`@egret/engine/ui/semantics`、`@egret/engine/web/semantics`、`@egret/engine/ui/testing`。
