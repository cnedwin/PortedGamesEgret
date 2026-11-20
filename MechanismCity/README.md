# Mechanism City · 千机巧匠

## 简介 · Introduction

千机巧匠是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的 2D 物理弹射解谜游戏 Demo。墨家机关城闭城三十年，城门、水轮、机枢一道道锁死。少年工匠阿巧背着祖父留下的机关弩进城：把弹丸射进去，借木块、绳索、跷跷板、弹簧、踏板和滚石连锁触发，打开每一关的机关锁。三章十二关，每关一到三星；有开场短片和关卡间对白。键盘、鼠标、手机触屏都能玩。

Mechanism City is an independently developed 2D physics puzzle demo built with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). For thirty years the Mohist city of mechanisms has kept its gates shut, its water wheels and its heart locked one behind another. Qiao, a young craftswoman, comes in with the crossbow her grandfather left her: fire pellets into the city and set its blocks, ropes, seesaws, springs, pressure plates and stones going one after another until each level's lock opens. Three chapters, twelve levels, one to three stars each, an opening film and words between the levels. Keyboard, mouse and touch.

[在线试玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/MechanismCity/)

## 玩法 · How to play

| | 键盘 · Keyboard | 鼠标与触屏 · Mouse and touch |
|---|---|---|
| 转弩 · Turn the bow | A / D，← / → | 在画面上按住向后拉，方向与拉弦相反 · press and pull back; it fires the other way |
| 力度 · Power | W / S，↑ / ↓ | 拉得越远越大，或拖左上的「力度」滑条 · pull further, or drag the power slider |
| 发射 · Fire | 空格或 F · Space or F | 松手，或点「发射」 · let go, or tap Fire |
| 全景 · Whole city | Z | 「全景」 |
| 提示 · Hint | H | 「提示」先看机关线索，首发前可再点「对准」 |
| 重来 · Restart | R | 「重来」 |
| 返回 · Back | Esc | 「选关」 |

Tab 在按钮之间移动焦点，空格或回车按下；选关时方向键换关，回车开始。手柄的十字键转弩和调力度，A 发射，Y 全景，B 返回。

Tab moves between the buttons and Space or Enter presses them; on the level list the arrows choose and Enter starts. On a gamepad the d-pad turns the bow and sets the power, A fires, Y shows the whole city and B goes back.

手机竖屏时，可在棋盘下方用大按钮推进对白、发射、看全景、重来和打开设置，也可以直接在棋盘上拉弦。

In portrait on a touch device, use the controls below the board to advance dialogue, fire, zoom out, restart or open settings. Pull back on the board to aim and fire.

- **弹丸**：铁丸（常规）、沉丸（更大更沉，撞得更狠）、雷丸（撞上就炸开，掀开周围的东西、炸断绳子）。每关给的弹丸有限，写在左上角。
- **机关**：木块会被打翻；木箱打得够狠会碎；绳子被弹丸擦过就断，吊着的东西落下；跷跷板一头挨打，另一头上的东西被抛起来；弹簧把落上去的东西弹高；踏板压住时闸门升起。
- **机关锁**：碰到对的东西就开——有的锁认弹丸，有的认石头或木块，「双锁」两把都要开。
- **星级**：在标准发数内开锁得三星，多一发两星，再多一星。
- **连击**：一发弹丸引起的一连串机关动作，间隔不到 1.6 秒就算连击，分数逐级加成。
- **巧解印**：每关有一个独立目标，按提示中的条件触发机关并过关即可收藏。选关页会显示已收集的印，原有星级和最高分继续保存。
- **瞄准**：虚线显示弹丸预计首先碰到的位置，机关移动和后续碰撞会改变实际结果。「对准」仅给出首发参考，仍由玩家发射。

- **Pellets**: iron (the usual), heavy (larger and heavier, it strikes harder) and thunder (bursts where it strikes, throwing what is near aside and cutting ropes). Each level gives a few, shown top left.
- **Mechanisms**: blocks topple; crates break if struck hard enough; a rope a pellet passes through is cut and what hangs from it falls; strike one end of a seesaw and what rests on the other is thrown; springs throw what lands on them; a pressure plate held down lifts its gate.
- **Locks**: each opens to the right thing — some to a pellet, some to a stone or a block; *Twin Locks* needs both.
- **Stars**: open the city within the par number of pellets for three stars, one more for two, more than that for one.
- **Combos**: mechanisms set off one after another less than 1.6 s apart make a combo, and the points rise with it.
- **Craft seals**: each level has an optional mechanism goal. Clear the level after meeting that goal to earn its seal. The level list shows seals alongside the stars.
- **Aiming**: the guide marks the estimated first contact. Moving parts and later collisions can change what follows. A hint can set a suggested first aim before the first shot.

星级、解锁和声音设置保存在浏览器里。Stars, unlocked levels and sound settings are kept in the browser.

## 引擎能力用在哪里 · Where each engine capability is used

每一项都由引擎 API 实现，下表写明位置；引擎缺的和不顺手的地方记在 [ENGINE-NOTES.md](ENGINE-NOTES.md)。

Every item is done through the engine's API; the table says where. What the engine lacks or makes awkward is in [ENGINE-NOTES.md](ENGINE-NOTES.md).

| 能力 · Capability | 用在 · Used for | 文件 · File |
|---|---|---|
| `createPhysicsWorld` | 弹丸、木块、木箱、石头、吊着的重物（dynamic）；跷跷板、闸门（kinematic）；锁、踏板、弹簧（sensor）；地形碰撞体；吊绳是 `addJoint({ kind: 'rope' })`，切断用 `removeJoint`；`applyImpulse`、`queryRect`、接触事件 · pellets, blocks, crates, stones and hanging weights (dynamic); seesaws and gates (kinematic); locks, plates, springs (sensors); terrain colliders; ropes are `addJoint({ kind: 'rope' })`, cut with `removeJoint`; impulses, rectangle queries, contact events | `src/sim/sim.mjs` |
| `importTiledMap` + `createTileMap` | 12 关都是 Tiled `.tmj`：背景层、地形层（带 `solid` 属性的瓦片生成碰撞体）、机关对象层；按相机视野 `cull` · twelve Tiled maps: backdrop, terrain (tiles with `solid` become colliders), mechanism objects; culled to the camera's view | `src/play/level.mjs`, `levels/*.tmj`, `tools/build-levels.mjs` |
| `createCamera2D` | 跟随弹丸、按事件震屏、`zoomTo` 缩放到全景、`addLayer` 三层视差（远山、屋檐、雾） · follows the pellet, shakes on impacts, zooms out to the whole city, three parallax layers | `src/play/level.mjs`, `src/play/scenery.mjs` |
| `createParticleEmitter` | 碎木、尘土、火花、雷光、锁开的金光、弹丸拖尾；发光的几种用 `blendMode: 'add'` · splinters, dust, sparks, thunder, the glint of an opened lock, the pellet's trail; the bright ones with `blendMode: 'add'` | `src/play/level.mjs` |
| `blendMode` `add` | 火花、雷光、拖尾和开锁粒子使用加亮混合 · additive sparks, thunder, trail and lock particles | `src/play/level.mjs` |
| `renderEffect` glow / outline | 雷丸发光、选中的关卡卡片描边、结算星星发光 · glowing thunder pellets, outlined selection cards and glowing result stars | `src/play/level.mjs`, `src/screens.mjs` |
| `mask` | 选关列表的矩形裁剪（`mask = {x, y, width, height}`）；对白头像的圆形形状遮罩（`mask = sprite`） · the level strip clipped to a rectangle; the speaker's portrait cut round by a shape mask | `src/screens.mjs` |
| `beginLinearGradientFill` / `beginRadialGradientFill` | 夜空、按钮、面板、滑条、木块与石头的明暗、月亮、开关的旋钮 · the night sky, buttons, panels, the slider, the shading of blocks and stones, the moon, the switch knobs | `src/play/scenery.mjs`, `src/art/shapes.mjs`, `src/ui/kit.mjs` |
| `parseBitmapFont` + `createBitmapText` | 分数、连击、选关卡片上的「第N关」、结算分数；字页由代码画出，经 `game.textureFromCanvas` 成为贴图 · the score, combos, "level N" on the cards, the result's score; the font page is painted in code and becomes a texture through `game.textureFromCanvas` | `src/art/paint.mjs`, `src/ui/hud.mjs`, `src/screens.mjs` |
| `createUiRoot` | 设置卡：一列四个叶子（标题、音效、音乐、关闭）由托管界面排版、提交；每个叶子的文字是 `game.createLabel({ scope: context.scope })` · the settings card: a column of four leaves laid out and committed by the managed UI, each leaf's words a `game.createLabel({ scope: context.scope })` | `src/ui/settings.mjs` |
| `createActionControl` | 所有按钮（开始、选关、发射、重来、下一关……） · every button | `src/ui/kit.mjs` |
| `createRangeControl` | 发射力度滑条 · the power slider | `src/ui/kit.mjs`, `src/ui/hud.mjs` |
| `createSelectionGroup` | 选关：12 张卡片单选，未解锁的不可选 · choosing one of twelve level cards, locked ones disabled | `src/screens.mjs` |
| `createToggleControl` | 音效、音乐开关 · the sound and music switches | `src/ui/settings.mjs` |
| `createScrollControl` | 选关列表横向滚动：拖滚动条、滚轮（`game.hover`） · the level strip scrolls by its bar and the wheel (`game.hover`) | `src/screens.mjs` |
| `createControlKeys` + 键盘焦点 · keyboard focus | 按钮、开关、滑条、关卡列表都能用键盘操作 · buttons, switches, the slider and the level list all work from the keyboard | `src/ui/kit.mjs`, `src/screens.mjs` |
| `createUiSemantics` + `createBrowserSemantics` | 整个游戏一棵语义树，投影到页面供读屏器使用：按钮、开关、滑条、对话框、列表框与选项、状态播报 · one semantic tree for the whole game, projected into the page for screen readers | `src/main.mjs`, `src/ui/*.mjs`, `src/screens.mjs` |
| `createSaveStore` | 星级、最高分、解锁进度、是否看过开场、声音设置 · stars, best scores, progress, whether the film was seen, sound settings | `src/saves.mjs` |
| `createBrowserAudio` / `createAudioMixer` | 页面里：`createBrowserAudio` 的混音器，音乐与音效两条总线、限幅器；测试里：`createAudioMixer` 加记录后端验证总线分配和静音 · in the page, the mixer of `createBrowserAudio` with a music bus and an effects bus and a limiter; in the tests, `createAudioMixer` over a recording backend checks the buses and muting | `src/audio/sound.mjs`, `test/sound.test.mjs` |
| `createBrowserVideo` | 22 秒序章，浏览器从 WebM 与 MP4 中选择可播放的版本 · the 22-second prologue, with WebM and MP4 for the browser to choose | `src/screens.mjs`, `media/`, `tools/make-intro.py` |
| `createBrowserGame` | 画布、帧循环、指针、键盘与悬停输入（`hover: true`）、自适应缩放、文字标签、PNG 贴图、代码画的贴图（`textureFromCanvas`） · the canvas, the loop, pointer, keyboard and hover input (`hover: true`), fitting the page, text labels, PNG textures, textures painted in code (`textureFromCanvas`) | `src/main.mjs` |
| `animate` | 标题入场、对白框淡出、连击数字弹出、结算星星逐个弹出、锁打开时的跳动、入场黑幕 · the title's entrance, dialogue fading, the combo pop, stars one by one, the lock's jump, the fade in | `src/screens.mjs`, `src/ui/hud.mjs`, `src/play/level.mjs` |
| `createInputActions` + `bindBrowserInputActions` | 键盘与手柄的命名动作（转弩、力度、发射、全景、重来、返回）；`skipPrevented` 让焦点控件用掉的键不再触发动作 · named actions over keys and gamepads; with `skipPrevented` a key a focused control took presses no action | `src/main.mjs` |

## 素材 · Assets

封面、对白肖像、三章远景和序章分镜为本项目制作，见 `art/`。瓦片由 `tools/paint-tiles.py` 生成，机关、弩和界面用白鹭 Graphics 绘制，粒子和位图字体在画布上生成。序章由 `tools/make-intro.py` 将插画剪成带字幕的 MP4 与 WebM。配乐和音效继续使用 `src/audio/synth.mjs` 中的合成音源。

The cover, portraits, chapter panoramas and prologue illustrations were made for this game and live in `art/`. The tiles are generated by `tools/paint-tiles.py`. Egret Graphics draws the mechanisms, the crossbow and the interface, while canvases provide particle textures and the bitmap font. `tools/make-intro.py` cuts the illustrations into captioned MP4 and WebM video. Music and effects are synthesized in `src/audio/synth.mjs`.

## 开发 · Development

```sh
python3 -m http.server 8000          # 在仓库根目录 · at the root of the repository
# 打开 http://localhost:8000/MechanismCity/
#   ?level=5        直接进第 5 关 · straight into level 5
#   ?level=5&quiet  不放对白 · without the words
#   ?screen=select  直接到选关 · straight to the level list

node --test test/*.test.mjs          # 在本目录 · in this folder
node tools/build-levels.mjs          # 由 src/levels/designs.mjs 重新生成 levels/*.tmj
node tools/solve.mjs [l03 …]         # 求解关卡，写 src/levels/solutions.json
python3 tools/paint-tiles.py         # 重画 levels/terrain.png
node tools/bake-mechanisms.mjs       # 将机关画法烘焙到 art/mechanisms.png
python3 tools/make-intro.py          # 重做开场短片（需要 ffmpeg）
```

测试会把每一关记下的解法在 Node 里用页面同一套模拟重放，确认 12 关都能通；也检查存档、合成的声音、混音总线和引擎副本的 import map。

The tests replay the recorded solution of every level in Node through the same simulation the page runs, so all twelve are known to be winnable; they also check the save, the synthesized sound, the mixer's buses and the import map of the engine copy.

| 目录 · Folder | 内容 · Contents |
|---|---|
| `src/sim/` | 不依赖 DOM 的关卡模拟（物理、机关、计分、星级） · the level simulation, free of the DOM |
| `src/play/` | 关卡画面：瓦片地图、相机、粒子、瞄准 · the level on screen |
| `src/ui/`, `src/screens.mjs` | 界面零件、关内界面、设置卡、各个画面 · interface parts, the HUD, settings, the screens |
| `src/levels/` | 12 关的图纸与解法 · plans and solutions of the levels |
| `src/audio/`, `src/art/` | 合成声音、画图 · synthesized sound, drawing |
| `levels/`, `media/` | 生成的地图、瓦片图、开场短片 · generated maps, tiles and film |
| `vendor/` | 引擎副本，见 `vendor/SOURCE.md` · the engine copy |

引擎副本取自 Egret_rebuild 提交 `687037a`，由引擎仓库的 `tools/vendor-game.mjs` 复制。The engine copy is from Egret_rebuild commit `687037a`, copied by the engine's `tools/vendor-game.mjs`.

## 已验证 · Verified

- `node --test test/*.test.mjs`：关卡（每关的机关和锁都在、能被解开）、挑战、存档、合成声音、弹道预测、引擎副本的 import map。 · The Node tests: levels, challenges, the save, sound, the aiming trajectory and the engine copy's import map.
- GitHub Pages 上的线上页面在 PR #95、#96 合并后打开并玩过第一关（无头 Chromium）。 · The live page was opened and its first level played after PRs #95 and #96 (headless Chromium).

## 已知问题 · Known issues

- 真显卡和真手机上没有测过帧时间。 · Frame times were not measured on a real GPU or phone.
- 引擎方面仍未解决的见 [ENGINE-NOTES.md](ENGINE-NOTES.md) 中标为「未解决 / open」的条目（径向渐变的三角形、被拒的 `update` 仍改内存、输入分发中不能建 UI 根、横向滚动控件不读竖向滚轮）。 · The engine's open items are those marked open in ENGINE-NOTES.

## 已解决 · Solved

见 [ENGINE-NOTES.md](ENGINE-NOTES.md) 中标为「已解决 / resolved」的条目：吊绳用 `rope` 关节、切断用 `removeJoint`；粒子 `blendMode: 'add'`；代码画的贴图用 `textureFromCanvas`；滚轮用悬停输入；焦点控件用掉的键用 `skipPrevented`；Web Audio 后端；视频的多个文件。 · See the items marked resolved in ENGINE-NOTES.

## 未完成 · Unfinished

- 真机帧时间、首屏时间的测量。 · Frame-time and start-up measurements on real devices.

## 目录结构 · Layout

见上面「开发 · Development」一节。 · See Development above.

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `687037ac462c48dbfe00523312125b94072ffea4`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit `687037ac462c48dbfe00523312125b94072ffea4`, copied by the engine's `tools/vendor-game.mjs`; see [vendor/SOURCE.md](vendor/SOURCE.md).

入口 · Entries: `@egret/engine`, `@egret/engine/physics2d`, `@egret/engine/tilemap`, `@egret/engine/camera`, `@egret/engine/particles`, `@egret/engine/bitmapfont`, `@egret/engine/ui`, `@egret/engine/ui/semantics`, `@egret/engine/web/semantics`, `@egret/engine/kit`, `@egret/engine/web/kit`, `@egret/engine/audio`, `@egret/engine/web/audio`, `@egret/engine/web/video`, `@egret/engine/web/game`, `@egret/engine/web/hover`, `@egret/engine/text`, `@egret/engine/web/text`.
