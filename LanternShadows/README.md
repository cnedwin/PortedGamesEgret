# Lantern Shadows · 灯影·闹天宫

灯影·闹天宫是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的 2D 横版动作游戏 Demo，整出戏演在一块皮影戏的幕布上：灯在幕后，镂空上色的皮偶贴着幕布，孙悟空在南天门外练棍。目前是**试演**：一个场地、一套连击，用来确定手感与画面；关卡与 Boss 在后面。

Lantern Shadows is an independently developed 2D side-scrolling action demo built with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild), played as a shadow-puppet show: a lamp behind a cloth, carved and dyed leather puppets against it, and the Monkey King practising with his staff before the Southern Gate of Heaven. This is the **rehearsal**: one yard and one combination, to settle how it feels and looks. The stages and the boss come after.

## 玩法 · How to play

| | 键盘 · Keyboard | 手柄 · Gamepad | 触屏 · Touch |
|---|---|---|---|
| 走 · Move | A D，或方向键 · A D or the arrow keys | 左摇杆、十字键 · left stick, D-pad | ◀ ▶ |
| 跳 · Jump | K，或空格 · K or Space | A | 跳 · Jump |
| 棍 · Staff | J | X | 棍 · Staff |
| 筋斗云 · Cloud roll | L，或 Shift · L or Shift | B | 云 · Roll |

- 连按三下棍是一套连击：平扫、上挑、劈砸，一下比一下重。每一下打中都有一记锣鼓：平扫是梆子，上挑是小锣，劈砸是大锣。
- 跳键按得久跳得高，轻点是小跳；云朵可以从下面跳上去。
- 筋斗云贴地翻出一段，空中可以用一次；一棍打中之后可以用它收招。
- 三个木人桩，一个在云上。木人桩走不过去，筋斗云可以穿到它身后。连着打中会累计连击数，停手一会儿就清零。
- P 或 Esc 暂停。

- Three presses of the staff make a combination: a level sweep, a lift, and a smash, each heavier than the last. Every blow that lands has its beat: clappers for the sweep, the small gong for the lift, the great gong for the smash.
- Hold jump to go higher; a tap is a hop. Clouds can be jumped onto from below.
- The cloud roll carries him a set distance along the ground, and may be used once in the air. After a blow has landed it may cut the blow short.
- There are three practice posts, one of them on a cloud. A post cannot be walked through, but the cloud roll passes behind it. Blows landed one after another are counted; the count lapses when he rests.
- P or Esc pauses.

地址参数 · Address options：`?backend=webgl2` 或 `webgpu` 指定渲染后端，`?stats` 显示帧率与骨骼数，`?slow=0.25` 以四分之一速度播放（看动作用），`?lang=en` 以英文开始。
`?backend=webgl2` or `webgpu` chooses the renderer, `?stats` shows the frame rate and bone count, `?slow=0.25` plays at quarter speed (to watch the motion), `?lang=en` starts in English.

## 用到的引擎能力 · What it uses of the engine

| 能力 · Capability | 用在哪里 · Where |
|---|---|
| Spine 骨骼动画 · Spine skeletal animation (`@egret/spine`) | 悟空 25 根骨骼、24 片皮、9 段动画；木人桩 8 根骨骼、4 段动画。动画之间有混合，受击时整台戏定格几帧。 · The Monkey King has 25 bones, 24 pieces and 9 animations; a post has 8 bones and 4. Animations blend into one another, and the whole stage holds still for a few frames when a blow lands. |
| 资源清单 · Resource manifest | 骨骼、图集和贴图由清单登记，带校验和加载。 · Skeletons, atlases and their pages are listed in a manifest and loaded with their checksums. |
| 混合模式 · Blend modes | 皮偶与布景用正片叠底画在幕布上：皮只会让透过它的光变暗，两片叠着的地方更暗；火星用相加。 · Puppets and scenery are multiplied onto the cloth, since leather only darkens the light that passes through it, and where two pieces overlap it is darker still. Sparks are added. |
| 2D 摄像机 · 2D camera | 跟随、前瞻、边界、多层视差、受击震动与重击时的推近。 · Following with a lead, bounds, parallax layers, a shake when a blow lands and a push-in on the heaviest. |
| 粒子 · Particles | 火星、稻草屑、脚下的尘。 · Sparks, straw, and dust underfoot. |
| 混音器 · Audio mixer | 七种锣鼓声都由代码合成为 WAV 再交给混音器，仓库里没有录音文件。 · All seven percussion sounds are worked out in code as WAV bytes and handed to the mixer; the repository holds no recordings. |
| 输入 · Input | 键盘、手柄（带震动）、触屏。 · Keyboard, gamepad with rumble, and touch. |
| 渲染后端 · Renderers | WebGPU 可用时用 WebGPU，否则 WebGL2。 · WebGPU where the browser offers it, WebGL2 otherwise. |

## 美术是怎么来的 · Where the art comes from

没有一张手绘位图。每片皮的轮廓、染色和镂空花纹都写在 `tools/puppets/` 里，由 `tools/author.mjs` 画成矢量图、拼成图集，并写出把它们重新连起来的 Spine 骨骼与动画；幕布、戏台和布景出自 `tools/scenery.mjs`。皮影本来就是关节相连的平面偶，所以骨骼动画在这里就是它本来的动法。

No picture here was painted by hand. The outline, dye and carving of every piece of leather is written in `tools/puppets/`; `tools/author.mjs` draws them as vectors, packs them into an atlas, and writes the Spine skeleton and animations that join them again. The cloth, the booth and the scenery come from `tools/scenery.mjs`. A shadow puppet is a flat figure jointed at the limbs, so skeletal animation is simply how it moves.

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
src/rules/hero.mjs      悟空的移动与连击（不含绘制）· how he moves and fights, with no drawing
src/rules/yard.mjs      练武场、木人桩与连击计数 · the yard, its posts and the count of blows
src/puppets.mjs         加载并操纵皮偶 · loads and plays the puppets
src/input.mjs           键盘、手柄、触屏 · keyboard, gamepad, touch
src/sound.mjs           合成的锣鼓 · the synthesised percussion
tools/                  画皮、绑骨、出图集与布景 · drawing, rigging, atlases and scenery
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
