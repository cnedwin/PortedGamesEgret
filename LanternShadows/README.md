# Lantern Shadows · 灯影·闹天宫

灯影·闹天宫是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的 2D 横版动作游戏 Demo，整出戏演在一块皮影戏的幕布上：灯在幕后，镂空上色的皮偶贴着幕布，孙悟空一路打上南天门。目前有**第一幕**：一关一两分钟，十名天兵把守；后面的两幕与 Boss 还在做。

Lantern Shadows is an independently developed 2D side-scrolling action demo built with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild), played as a shadow-puppet show: a lamp behind a cloth, carved and dyed leather puppets against it, and the Monkey King fighting his way to the Southern Gate of Heaven. **Act one** is here: a stage of a minute or two, held by ten soldiers of heaven. Two more acts and a boss are still to come.

## 玩法 · How to play

| | 键盘 · Keyboard | 手柄 · Gamepad | 触屏 · Touch |
|---|---|---|---|
| 走 · Move | A D，或方向键 · A D or the arrow keys | 左摇杆、十字键 · left stick, D-pad | ◀ ▶ |
| 跳 · Jump | K，或空格 · K or Space | A | 跳 · Jump |
| 棍 · Staff | J | X | 棍 · Staff |
| 筋斗云 · Cloud roll | L，或 Shift · L or Shift | B | 云 · Roll |

- 连按三下棍是一套连击：平扫、上挑、劈砸，一下比一下重。每一下打中都有一记锣鼓：平扫是梆子，上挑是小锣，劈砸是大锣。
- 跳键按得久跳得高，轻点是小跳；云朵可以从下面跳上去，石台要跳上去。
- 筋斗云贴地翻出一段，空中可以用一次；翻滚途中什么都伤不到他，枪尖和箭都能穿过去。一棍打中之后可以用它收招。
- **枪兵**先把枪放平后撤（这是预警），再一步刺出。预警时打他能打断；已经刺出就只有重击才拦得住，最好翻过去。
- **弓手**站着不动，拉满弓后放箭。箭可以跳过、翻过，也可以一棍打落。
- 五个桃是他的体力，挨一下少一个；吃完就倒，随后在上一面红旗（歇脚处）重新站起来。
- 把十名天兵全部击退，南天门才开。落幕时按用时、受伤和倒地次数盖一枚印：S、A、B、C。
- P 或 Esc 暂停。

- Three presses of the staff make a combination: a level sweep, a lift, and a smash, each heavier than the last. Every blow that lands has its beat: clappers for the sweep, the small gong for the lift, the great gong for the smash.
- Hold jump to go higher; a tap is a hop. Clouds can be jumped onto from below; a stone step has to be jumped up.
- The cloud roll carries him a set distance along the ground, and may be used once in the air. Nothing can hurt him while he rolls: it goes through a spear point and through an arrow. After a blow has landed it may cut the blow short.
- A **spearman** levels his spear and draws it back, which is the warning, and then steps into a thrust. Struck during the warning he is stopped; once he is thrusting only the heaviest blow stops him, and it is better to roll through.
- An **archer** stands where he is, draws, and looses. An arrow can be jumped, rolled through, or knocked out of the air with the staff.
- Five peaches are his strength, and each blow he takes eats one. When they are gone he falls, and is stood up again at the last red pennant he passed.
- The gate opens only when all ten soldiers are down. As the curtain falls a seal is set on the act for its time, his wounds and his falls: S, A, B or C.
- P or Esc pauses.

地址参数 · Address options：默认用 WebGL2，`?backend=webgpu` 改用 WebGPU，`?stats` 显示帧率与骨骼数，`?slow=0.25` 以四分之一速度播放（看动作用），`?lang=en` 以英文开始。
WebGL2 is the default and `?backend=webgpu` draws with WebGPU instead, `?stats` shows the frame rate and bone count, `?slow=0.25` plays at quarter speed (to watch the motion), `?lang=en` starts in English.

## 用到的引擎能力 · What it uses of the engine

| 能力 · Capability | 用在哪里 · Where |
|---|---|
| Spine 骨骼动画 · Spine skeletal animation (`@egret/spine`) | 四种皮偶：悟空 25 根骨骼、24 片皮、11 段动画；枪兵与弓手各 18 根骨骼；木人桩 8 根。一幕里同台 13 个，只推进镜头附近的。动画之间有混合，受击时整台戏定格几帧。 · Four puppets: the Monkey King with 25 bones, 24 pieces and 11 animations, a spearman and an archer with 18 bones each, and a post with 8. Thirteen share the stage in an act, and only those near the camera are moved on. Animations blend into one another, and the whole stage holds still for a few frames when a blow lands. |
| 瓦片地图 · Tile map (`@egret/engine/tilemap`) | 关卡是一张 Tiled 地图：引擎用它画地面，规则读同一个文件里的实心格、云格和摆放的东西。 · The level is a Tiled map: the engine draws the ground from it, and the rules read the solid cells, the cloud cells and the things placed in the same file. |
| 资源清单 · Resource manifest | 骨骼、图集和贴图由清单登记，按清单里的校验和核对后加载。图片由浏览器自带的图片解码读入（`src/pictures.mjs`），这条路在各家手机浏览器上都走得通。 · Skeletons, atlases and their pages are listed in a manifest and checked against its checksums as they load. Pictures are decoded by the browser's own image element (`src/pictures.mjs`), a way that works in every phone browser. |
| 混合模式 · Blend modes | 皮偶与布景用正片叠底画在幕布上：皮只会让透过它的光变暗，两片叠着的地方更暗；火星用相加。 · Puppets and scenery are multiplied onto the cloth, since leather only darkens the light that passes through it, and where two pieces overlap it is darker still. Sparks are added. |
| 2D 摄像机 · 2D camera | 跟随、前瞻、边界、多层视差、受击震动与重击时的推近。 · Following with a lead, bounds, parallax layers, a shake when a blow lands and a push-in on the heaviest. |
| 粒子 · Particles | 火星、稻草屑、脚下的尘。 · Sparks, straw, and dust underfoot. |
| 混音器 · Audio mixer | 七种锣鼓声都由代码合成为 WAV 再交给混音器，仓库里没有录音文件。 · All seven percussion sounds are worked out in code as WAV bytes and handed to the mixer; the repository holds no recordings. |
| 输入 · Input | 键盘、手柄（带震动）、触屏。 · Keyboard, gamepad with rumble, and touch. |
| 渲染后端 · Renderers | 默认 WebGL2，可选 WebGPU。 · WebGL2 by default, WebGPU on request. |

## 美术是怎么来的 · Where the art comes from

没有一张手绘位图。每片皮的轮廓、染色和镂空花纹都写在 `tools/puppets/` 里，由 `tools/author.mjs` 画成矢量图、拼成图集，并写出把它们重新连起来的 Spine 骨骼与动画；幕布、戏台、布景和地面的瓦片出自 `tools/scenery.mjs`；关卡在 `tools/levels/` 里用字母格子摆出来，写成 Tiled 地图。皮影本来就是关节相连的平面偶，所以骨骼动画在这里就是它本来的动法。

No picture here was painted by hand. The outline, dye and carving of every piece of leather is written in `tools/puppets/`; `tools/author.mjs` draws them as vectors, packs them into an atlas, and writes the Spine skeleton and animations that join them again. The cloth, the booth, the scenery and the tiles of the ground come from `tools/scenery.mjs`, and a level is laid out as a grid of letters in `tools/levels/` and written as a Tiled map. A shadow puppet is a flat figure jointed at the limbs, so skeletal animation is simply how it moves.

```
node tools/author.mjs                重新生成 assets/ · rebuilds assets/
node tools/author.mjs --sheet        另在 tools/out/ 输出每个皮偶的站姿与全部动作的姿势表 · also writes each puppet standing and in every pose
node tools/author.mjs --sheet=attack 只画名字以 attack 开头的动作，取更多时刻 · only the animations whose names begin so, at more moments
```

绘制需要带 Chromium 的 Playwright（不在本目录时用环境变量 `PLAYWRIGHT` 指向它的模块路径）。
Drawing needs Playwright with Chromium (set `PLAYWRIGHT` to its module path if it is not installed here).

## 目录 · Layout

```
index.html, style.css   页面、幕布前的字与触屏按钮 · the page, the words in front of the cloth, the touch buttons
src/main.mjs            搭台、加载、每一帧 · sets the stage, loads, runs each frame
src/rules/act.mjs       一幕戏：地面、悟空、天兵、箭与计数 · an act: the ground, the hero, the soldiers, arrows and the count
src/rules/hero.mjs      悟空的移动、连击与受伤（不含绘制）· how he moves, fights and is hurt, with no drawing
src/rules/foes.mjs      枪兵与弓手 · the spearman and the archer
src/rules/level.mjs     地面与碰撞，读自关卡地图 · the ground and what stops a body, read from the level's map
src/puppets.mjs         加载并操纵皮偶 · loads and plays the puppets
src/pictures.mjs        读入图片 · reads pictures in
src/input.mjs           键盘、手柄、触屏 · keyboard, gamepad, touch
src/sound.mjs           合成的锣鼓 · the synthesised percussion
tools/                  画皮、绑骨、出图集、布景与关卡 · drawing, rigging, atlases, scenery and levels
assets/                 tools/author.mjs 的产物 · what tools/author.mjs writes
vendor/                 引擎运行库，见 vendor/SOURCE.md · the engine runtime, see vendor/SOURCE.md
test/                   规则与资源的检查 · checks of the rules and the assets
```

## 运行与测试 · Run and test

```
python3 -m http.server 4180        在仓库根目录执行，然后打开 /LanternShadows/ · from the repository root, then open /LanternShadows/
node --test test/*.test.mjs        在本目录执行 · from this folder
```

## 许可 · Licences

游戏代码与生成的美术以 Apache-2.0 发布。引擎运行库与其依赖的许可见 `vendor/NOTICE`；其中 Spine 运行库按 Spine Runtimes License Agreement 使用，要求使用者持有 Spine 编辑器授权。

The game's code and its generated art are released under Apache-2.0. The engine runtime and its dependencies are listed in `vendor/NOTICE`; the Spine runtime among them is used under the Spine Runtimes License Agreement, which requires a Spine Editor license of whoever uses it.
