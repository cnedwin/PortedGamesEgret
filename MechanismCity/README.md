# Mechanism City · 千机巧匠

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
| 重来 · Restart | R | 「重来」 |
| 返回 · Back | Esc | 「选关」 |

Tab 在按钮之间移动焦点，空格或回车按下；选关时方向键换关，回车开始。手柄的十字键转弩和调力度，A 发射，Y 全景，B 返回。

Tab moves between the buttons and Space or Enter presses them; on the level list the arrows choose and Enter starts. On a gamepad the d-pad turns the bow and sets the power, A fires, Y shows the whole city and B goes back.

- **弹丸**：铁丸（常规）、沉丸（更大更沉，撞得更狠）、雷丸（撞上就炸开，掀开周围的东西、炸断绳子）。每关给的弹丸有限，写在左上角。
- **机关**：木块会被打翻；木箱打得够狠会碎；绳子被弹丸擦过就断，吊着的东西落下；跷跷板一头挨打，另一头上的东西被抛起来；弹簧把落上去的东西弹高；踏板压住时闸门升起。
- **机关锁**：碰到对的东西就开——有的锁认弹丸，有的认石头或木块，「双锁」两把都要开。
- **星级**：在标准发数内开锁得三星，多一发两星，再多一星。
- **连击**：一发弹丸引起的一连串机关动作，间隔不到 1.6 秒就算连击，分数逐级加成。

- **Pellets**: iron (the usual), heavy (larger and heavier, it strikes harder) and thunder (bursts where it strikes, throwing what is near aside and cutting ropes). Each level gives a few, shown top left.
- **Mechanisms**: blocks topple; crates break if struck hard enough; a rope a pellet passes through is cut and what hangs from it falls; strike one end of a seesaw and what rests on the other is thrown; springs throw what lands on them; a pressure plate held down lifts its gate.
- **Locks**: each opens to the right thing — some to a pellet, some to a stone or a block; *Twin Locks* needs both.
- **Stars**: open the city within the par number of pellets for three stars, one more for two, more than that for one.
- **Combos**: mechanisms set off one after another less than 1.6 s apart make a combo, and the points rise with it.

星级、解锁和声音设置保存在浏览器里。Stars, unlocked levels and sound settings are kept in the browser.

## 引擎能力用在哪里 · Where each engine capability is used

每一项都由引擎 API 实现，下表写明位置；引擎缺的和不顺手的地方记在 [ENGINE-NOTES.md](ENGINE-NOTES.md)。

Every item is done through the engine's API; the table says where. What the engine lacks or makes awkward is in [ENGINE-NOTES.md](ENGINE-NOTES.md).

| 能力 · Capability | 用在 · Used for | 文件 · File |
|---|---|---|
| `createPhysicsWorld` | 弹丸、木块、木箱、石头（dynamic）；跷跷板、吊着的重物、闸门（kinematic）；锁、踏板、弹簧（sensor）；地形碰撞体；`applyImpulse`、`queryRect`、接触事件 · pellets, blocks, crates, stones (dynamic); seesaws, hanging weights, gates (kinematic); locks, plates, springs (sensors); terrain colliders; impulses, rectangle queries, contact events | `src/sim/sim.mjs` |
| `importTiledMap` + `createTileMap` | 12 关都是 Tiled `.tmj`：背景层、地形层（带 `solid` 属性的瓦片生成碰撞体）、机关对象层；按相机视野 `cull` · twelve Tiled maps: backdrop, terrain (tiles with `solid` become colliders), mechanism objects; culled to the camera's view | `src/play/level.mjs`, `levels/*.tmj`, `tools/build-levels.mjs` |
| `createCamera2D` | 跟随弹丸、按事件震屏、`zoomTo` 缩放到全景、`addLayer` 三层视差（远山、屋檐、雾） · follows the pellet, shakes on impacts, zooms out to the whole city, three parallax layers | `src/play/level.mjs`, `src/play/scenery.mjs` |
| `createParticleEmitter` | 碎木、尘土、火花、雷光、锁开的金光、弹丸拖尾 · splinters, dust, sparks, thunder, the glint of an opened lock, the pellet's trail | `src/play/level.mjs` |
| `blendMode` `add` / `screen` | 火花、雷光、拖尾、锁的光芒用 add；月晕和夜雾用 screen · sparks, thunder, trail and lock rays in add; the moon's halo and the mist in screen | `src/play/level.mjs`, `src/play/scenery.mjs` |
| `renderEffect` glow / outline | 未开的锁描边、开锁后发光；标题字发光；选中的关卡卡片描边；结算星星发光 · locks outlined while shut and glowing once open; the title; the chosen level card; the stars of a result | `src/play/level.mjs`, `src/screens.mjs` |
| `mask` | 选关列表的矩形裁剪（`mask = {x, y, width, height}`）；对白头像的圆形形状遮罩（`mask = sprite`） · the level strip clipped to a rectangle; the speaker's portrait cut round by a shape mask | `src/screens.mjs` |
| `beginLinearGradientFill` / `beginRadialGradientFill` | 夜空、按钮、面板、滑条、木块与石头的明暗、月亮、开关的旋钮 · the night sky, buttons, panels, the slider, the shading of blocks and stones, the moon, the switch knobs | `src/play/scenery.mjs`, `src/art/shapes.mjs`, `src/ui/kit.mjs` |
| `parseBitmapFont` + `createBitmapText` | 分数、连击、选关卡片上的「第N关」、结算分数；字页由代码画出 · the score, combos, "level N" on the cards, the result's score; the font page is painted in code | `src/art/paint.mjs`, `src/ui/hud.mjs`, `src/screens.mjs` |
| `createUiRoot` | 设置卡：一列四个叶子（标题、音效、音乐、关闭）由托管界面排版、提交 · the settings card: a column of four leaves laid out and committed by the managed UI | `src/ui/settings.mjs` |
| `createActionControl` | 所有按钮（开始、选关、发射、重来、下一关……） · every button | `src/ui/kit.mjs` |
| `createRangeControl` | 发射力度滑条 · the power slider | `src/ui/kit.mjs`, `src/ui/hud.mjs` |
| `createSelectionGroup` | 选关：12 张卡片单选，未解锁的不可选 · choosing one of twelve level cards, locked ones disabled | `src/screens.mjs` |
| `createToggleControl` | 音效、音乐开关 · the sound and music switches | `src/ui/settings.mjs` |
| `createScrollControl` | 选关列表横向滚动：拖滚动条、滚轮 · the level strip scrolls by its bar and the wheel | `src/screens.mjs` |
| `createControlKeys` + 键盘焦点 · keyboard focus | 按钮、开关、滑条、关卡列表都能用键盘操作 · buttons, switches, the slider and the level list all work from the keyboard | `src/ui/kit.mjs`, `src/screens.mjs` |
| `createUiSemantics` + `createBrowserSemantics` | 整个游戏一棵语义树，投影到页面供读屏器使用：按钮、开关、滑条、对话框、列表框与选项、状态播报 · one semantic tree for the whole game, projected into the page for screen readers | `src/main.mjs`, `src/ui/*.mjs`, `src/screens.mjs` |
| `createSaveStore` | 星级、最高分、解锁进度、是否看过开场、声音设置 · stars, best scores, progress, whether the film was seen, sound settings | `src/saves.mjs` |
| `createBrowserAudio` / `createAudioMixer` | 页面里：`createBrowserAudio` 的混音器，音乐与音效两条总线、限幅器；测试里：`createAudioMixer` 加记录后端验证总线分配和静音 · in the page, the mixer of `createBrowserAudio` with a music bus and an effects bus and a limiter; in the tests, `createAudioMixer` over a recording backend checks the buses and muting | `src/audio/sound.mjs`, `test/sound.test.mjs` |
| `createBrowserVideo` | 开场短片（22 秒，代码生成） · the opening film (22 s, made in code) | `src/screens.mjs`, `media/`, `tools/make-intro.py` |
| `createBrowserGame` | 画布、帧循环、指针与键盘输入、自适应缩放、文字标签、PNG 贴图 · the canvas, the loop, pointer and keyboard input, fitting the page, text labels, PNG textures | `src/main.mjs` |
| `animate` | 标题入场、对白框淡出、连击数字弹出、结算星星逐个弹出、锁打开时的跳动、入场黑幕 · the title's entrance, dialogue fading, the combo pop, stars one by one, the lock's jump, the fade in | `src/screens.mjs`, `src/ui/hud.mjs`, `src/play/level.mjs` |
| `createInputActions` + `bindBrowserInputActions` | 键盘与手柄的命名动作（转弩、力度、发射、全景、重来、返回） · named actions over keys and gamepads | `src/main.mjs` |
| `createBrowserHoverInput` | 选关列表的滚轮 · the wheel on the level list | `src/main.mjs` |

## 素材 · Assets

全部原创或由代码生成：瓦片图由 `tools/paint-tiles.py` 画出；机关、弩、界面全部用 Graphics 现画；粒子贴图和位图字体页在画布上画；音效和两段音乐由 `src/audio/synth.mjs` 合成（拨弦、噪声、振荡器）；开场短片由 `tools/make-intro.py` 逐帧画出再编码成 MP4 与 WebM。

Everything is original or made in code: the tiles are painted by `tools/paint-tiles.py`; the mechanisms, the crossbow and the interface are drawn with Graphics as the game runs; the particle textures and the font page are painted on canvases; the effects and both pieces of music are synthesized by `src/audio/synth.mjs` (plucked strings, noise, oscillators); the opening film is drawn frame by frame by `tools/make-intro.py` and encoded as MP4 and WebM.

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

引擎副本取自 Egret_rebuild 提交 `0e72ffb`，由引擎仓库的 `tools/vendor-game.mjs` 复制。The engine copy is from Egret_rebuild commit `0e72ffb`, copied by the engine's `tools/vendor-game.mjs`.
