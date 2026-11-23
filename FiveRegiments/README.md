# 五营争锋 · Five Regiments

## 简介 · Introduction

五营争锋是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的第三人称冷兵器对决游戏 Demo。从五营里选一营：羽林卫（环首刀与圆盾）、虎步（汉剑）、陷阵营（双手斩马刀）、银翎卫（长枪）、武射史（角弓与短刀）。每营带两个职业技能、四个天赋上阵，依次在县城校场、桃林溪畔、竹林古道、雪原关隘单挑另外四营的电脑对手，最后在王城宫前以一敌二，两人都倒下就是「双杀」。

- 鼠标往哪边划就从哪边砍：左劈、右劈、上劈、突刺；右键按同一方向格挡，刚举起的一瞬接住是「弹刀」。
- 踢腿破防，按住左键蓄重击，体力管着每一刀；闪步起步一瞬不吃伤害。
- 人物、兵器和场景物件是 3D 模型，人物骨骼绑定；站、走、跑、侧移、后退用动作捕捉数据，挥砍、格挡、技能是按兵器写的姿态加反向动力学。
- 五个场景各有天空、光照、雾和调色，有阴影、环境光遮蔽、泛光，以及落花、飘雪、竹林薄雾、宫前火星这些天气粒子。

Five Regiments is a third-person cold-steel duelling demo made on its own with
[Egret Rebuild](https://github.com/cnedwin/Egret_rebuild), the new Egret engine. Choose one of five regiments — the
Yulin Guard (ring-pommel sabre and round shield), the Tiger Step (Han sword), the Vanguard (two-handed horse-cutter),
the Silver Plume (long spear) or the Archer (horn bow and short knife) — fit two of its skills and four of its talents,
and fight the computer's man from each of the other four, one at a time, on the county drill ground, in a peach grove,
on a bamboo path and at a snowy pass; then two at once before the palace, where felling both is the "double kill".

- The way the mouse last moved is the way the blow comes: from the left, the right, overhead or a thrust. The right
  button guards the same line, and a guard raised just in time is a deflection.
- A kick breaks a guard, holding the left button winds up a heavy blow, stamina governs every swing, and a step is
  untouchable for an instant.
- The men, their weapons and the buildings are 3D models, the men rigged. Standing, walking, running, side steps and
  backing off are motion capture; cuts, guards and skills are poses written for each weapon, reached with inverse
  kinematics.
- Each of the five places has its own sky, light, fog and grade, with shadows, ambient occlusion and bloom, and
  weather: falling petals, snow, mist among the bamboo, sparks before the palace.

[在线试玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/FiveRegiments/)

## 玩法与操作 · How to play

**一局怎么走 · A run**

1. 选营：五个人站在校场上，左右键或点击切换，看兵器、生命和打法。 · Choose: the five stand on the drill ground; the arrows or a click turn between them.
2. 配技能：从本营技能里选两个，从天赋里选四个（有默认搭配）。 · Fit: two skills and four talents, with a default set.
3. 征途：四场单挑，对手从容易到难排：羽林卫、陷阵营、虎步、银翎卫、武射史里除自己以外的四营，电脑一场比一场反应快。每场赢了满血进下一场，输了可以重打这一场。 · The road: four duels, the foes ordered from plainest to hardest, each quicker to react than the last; a win sends him on at full health, a loss lets him fight that bout again.
4. 终局：王城宫前以一敌二（有弓手时是一近一远）。两人轮流压上，另一个绕侧或放箭；独战两人时伤害 ×1.2、受伤 ×0.7，对手生命七成。 · The last fight: two at once before the palace (one close and one with the bow, when the Archer is among them); they take turns to press. Alone against two he deals 1.2 times and takes 0.7 times, and they start at 70% health.
5. 结算：用时、剩余生命、弹刀、破防、被击中次数折成分数，按甲乙丙丁评等，每营记最好的一次。 · The tally: time, health left, deflections, guards broken and blows taken make the score, marked 甲 乙 丙 丁; the best of each regiment is kept.
6. 自由对决：任选自己和一到两个对手、任选场景。 · Free duel: any regiment against one or two others, in any place.

**手感 · Handling**

- 刀路：出手前鼠标最后一下往哪边划，就从哪边砍；准星的四个刃口亮出当前刀路。设置里可换成「经典」：刀路按右、左、上、刺轮流，格挡自动对准来刀。 · The line is the last way the mouse moved; the crosshair's four edges show it. The classic scheme turns the lines in order and guards the blow coming by itself.
- 格挡：按住右键。方向对上才挡得住；挡偏了只卸一半（盾牌挡偏了漏两成半，且更耗体力）。刚举起的 0.2 秒内接住是弹刀：不耗体力，对方踉跄。双手兵器蓄满的重劈弹不开。 · Guard: hold the right button. Only the right line holds; a wrong one takes half (a shield on a wrong line lets a quarter through and tires him more). Caught in the first 0.2 s it is a deflection. A fully wound two-handed cut cannot be deflected.
- 「格挡辅助」（默认开）：按住右键时自动对准最近的来刀；关掉后全靠自己读刀。 · Guard assist (on by default) turns a held guard to the blow coming; turned off, the reading is all his.
- 踢：F，踢中正在格挡的人破防。 · Kick: F breaks a held guard.
- 重击：按住左键蓄力再松开，更疼、更耗体力。收刀后半段再按一下左键，直接接下一刀。 · Heavy blow: hold and let go. Press again late in the recovery and the next blow follows at once.
- 体力：出手、冲刺、闪步、被挡都耗体力；见底时举不住兵器。 · Stamina: every swing, sprint, step and guarded blow costs it; with none left he cannot hold a guard.
- 弓（武射史）：按住左键拉弓，松开放箭，箭朝准星飞；拉满更准更疼，满弓拉太久会抖。弓在手上时右键不举挡，被贴身按 R 换短刀。 · The bow: hold to draw, let go to loose at the crosshair; held long at full draw it shakes. R changes to the knife.

| | 键盘与鼠标 · Keyboard and mouse | 手柄 · Gamepad | 触屏 · Touch |
|---|---|---|---|
| 移动 · Move | WASD / 方向键 · arrows | 左摇杆 · left stick | 左下摇杆 · stick, lower left |
| 转镜头、定刀路 · Turn, set the line | 移动鼠标（开打时鼠标锁在画面里） · move the mouse (held in the page while fighting) | 右摇杆 · right stick | 右上半屏拖动转镜头；在「出手」上划一下定刀路，不划则刀路轮流 · drag on the upper right to turn; swipe on Strike to set the line, or the lines come in turn |
| 攻击 / 拉弓 · Strike / draw | 左键（按住蓄力） · left button (hold to wind up) | RT | 「出手」，按住不动是蓄力或拉弓 · Strike; held still, a heavy blow or the draw |
| 格挡 · Guard | 右键 · right button | LT | 「格挡」 · Guard |
| 踢 · Kick | F | X | 「踢」 · Kick |
| 闪步 · Step | 空格 · Space | B | 「闪步」 · Step |
| 冲刺 · Sprint | 左 Shift | 按下左摇杆 · L3 | — |
| 技能 · Skills | Q / E | LB / RB | 两个技能键 · two skill buttons |
| 换兵器 · Change arms | R | A | 「换刀」（武射史） · Knife (the Archer) |
| 锁定 · Lock on | Tab / 中键 · middle button | Y / R3 | — |
| 暂停 · Pause | Esc | Start | 「暂停」 · Pause |

设置：画质（低 / 中 / 高，首次按设备自动选）、操作方式（方向 / 经典）、格挡辅助、血雾、声音、上下反转、鼠标灵敏度；中英文在卷首切换。触屏自动用「经典」的轮流刀路和自动对准的格挡；手柄用右摇杆定刀路。 · Settings: picture quality (chosen by the device at first), the control scheme, guard assist, blood, sound, invert Y and mouse sensitivity; the language is switched on the title. Touch uses the classic turn of lines and a guard that turns itself; the gamepad sets the line with the right stick.

**五营 · The five regiments**

| 营 · Regiment | 兵器 · Arms | 生命 · Health | 打法 · Play |
|---|---|---|---|
| 羽林卫 · Yulin Guard | 环首刀、圆盾 · sabre and shield | 1100 | 盾挡左、右、刺三路，格挡反击、圆月斩 · the shield takes left, right and thrusts; counters and a full-moon cut |
| 虎步 · Tiger Step | 汉剑 · Han sword | 1000 | 出手最快，两成暴击，毒瘴、连斩 · quickest, one blow in five critical, poison and chained cuts |
| 陷阵营 · Vanguard | 斩马刀 · horse-cutter | 1250 | 一刀 145，重劈弹不开，跳劈、战吼回血 · 145 a blow, heavy cuts that cannot be deflected, a leap and a healing shout |
| 银翎卫 · Silver Plume | 长枪 · spear | 950 | 够得最远（3 米），枪花、猪突猛进 · the longest reach (3 m), spear flowers and a charge |
| 武射史 · Archer | 角弓、短刀 · bow and knife | 880 | 满弓 92，后撤步、蛛网，远处加伤 · 92 at full draw, a back step, a web, more at range |

每营的技能（三到五个，共二十个）和六个天赋见 [docs/DESIGN.md](docs/DESIGN.md)。 · Every regiment's skills (three to five, twenty in all) and six talents are in docs/DESIGN.md.

## 美术、声音与平衡 · Art, sound and balance

- 人物（五营各一）和二十件场景物件（城门楼、宫门、亭子、烽火台、石桥、桃树、竹、松、旗、兵器架、草靶、鼓、木栅、山石、火盆、石狮、铜鼎等）用 Tripo 生成，人物带标准人形骨架；再用 gltfpack 减面、量化和 meshopt 压缩成高、中、低三档（人物合计 8.9 / 3.5 / 1.2 MB）。 · The five men and twenty props were generated with Tripo, the men rigged to a standard humanoid skeleton, then reduced, quantized and meshopt-compressed with gltfpack into high, medium and low sets (the men 8.9 / 3.5 / 1.2 MB in all).
- 兵器（环首刀、汉剑、斩马刀、长枪及红缨、短刀、角弓及弓弦、圆盾、箭）用代码按尺寸建模，钢刃双面、盾背有握把。 · The weapons are modelled in code to size.
- 站、走、跑、后退、侧移来自 CMU 动作捕捉库，用 `tools/retarget.mjs` 离线重定向到每个人物（对齐静止姿势的骨骼方向、去掉根部转向、截出循环段，侧移的另一边是镜像）。 · Standing, walking, running, backing off and side steps are CMU motion capture, retargeted offline onto each man by `tools/retarget.mjs`.
- 出手、格挡、踢、拉弓、二十个技能和受击、倒地是按兵器写的姿态表（右劈、左劈、上劈、突刺各分起手、出刀、收刀），双臂用两骨反向动力学握住兵器，双手兵器两只手各握一处，腰身扭转、重心下沉和镜头震动跟着节奏走。 · Blows, guards, kicks, the bow, the twenty skills, hits and falls are pose tables per weapon (wind, strike, follow for each line), reached with two-bone IK, both hands on a two-handed weapon.
- 地面、夯土墙、木、瓦、宫墙、石板路、雪、竹墙用 Poly Haven 的 CC0 扫描材质（颜色、法线、AO/粗糙度/金属度三张），天空用 Poly Haven 的 CC0 HDRI 转成色调映射后的 JPEG 全景图，同时做环境光。 · Ground, walls, timber, tiles, flagstones, snow and bamboo are CC0 scanned materials from Poly Haven; the skies are CC0 HDRIs, tone-mapped to JPEG panoramas, which also light the scene.
- 声音全部合成：刀风、金铁相击、弹刀、盾响、中刀、暴击、踢、破防、拉弓放箭、爆炸、毒雾、战吼、倒地、战鼓和铜锣；对决时是战鼓，菜单是拨弦。 · Every sound is synthesized; war drums in a fight, plucked strings in the menus.
- 平衡用 `node tools/trial.mjs` 让电脑和电脑对打。两边强度都是 0.6、每对打 100 场时，五营的总胜率在 41%–57% 之间（羽林卫 54%、虎步 43%、陷阵营 41%、银翎卫 55%、武射史 57%）；强度 0.42 时在 41%–67% 之间。 · Balance is checked by the computer fighting itself: at strength 0.6 and 100 bouts a pair, every regiment wins 41–57% overall; at 0.42, 41–67%.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `@egret/engine/webgpu/world3d` · `createWorld3DApp` | 画布、帧循环、画质档位（自动按设备选高中低）；默认 WebGL2，`?backend=webgpu` 用 WebGPU · the canvas, loop and quality tiers; WebGL2 by default, WebGPU on request | `src/main.mjs` |
| `loadGltf3D`（meshopt、量化） | 五个带骨骼的人物和二十件场景物件，各三档 · five rigged men and twenty props, three sets each | `src/main.mjs`、`src/view/stage.mjs` |
| 骨骼节点（`Object3D` 的位置与旋转） | 每帧把动作捕捉姿态写进骨骼，再叠加反向动力学和腰身扭转 · each frame the captured pose is written to the bones, then IK and the twist laid over it | `src/view/motion.mjs`、`src/view/rig.mjs`、`src/view/figure.mjs` |
| `createGeometry3D`、`createCylinderGeometry3D`、`createStandardMaterial3D` | 按尺寸建模的八种兵器、弓弦、箭，钢刃双面 · the eight weapons, the string and arrows modelled to size | `src/view/weapons.mjs`、`src/view/figure.mjs` |
| `createCubeTextureFromEquirect3D` + `scene.environment` / `background` | 五张天空全景图做背景和基于图像的环境光 · five panoramas as sky and image-based light | `src/view/stage.mjs` |
| `Texture3D`（`repeat`、各向异性、mipmap） | 扫描材质铺在 1600 米的地面和城墙、宫墙上 · scanned materials over the ground and walls | `src/view/stage.mjs` |
| `createDirectionalLight3D`（级联阴影）、`createHemisphereLight3D`、`createPointLight3D` | 太阳和阴影（高画质两级级联）、天光、火盆的火光、命中闪光 · the sun and its shadows, sky light, braziers, the flash of a hit | `src/view/stage.mjs`、`src/view/effects.mjs` |
| `scene.fog`（指数雾） | 每个场景的雾，竹林最浓 · each place's fog, thickest among the bamboo | `src/view/stage.mjs` |
| `renderer.postProcess`、`renderer.exposure` | 泛光、环境光遮蔽（高画质）、FXAA、暗角、饱和度、对比度、亮度，每个场景一套 · bloom, SSAO, FXAA, vignette and a grade per place | `src/view/stage.mjs` |
| `createParticleEmitter3D` | 火花、血雾、尘土、毒雾、火盆的火 · sparks, blood, dust, poison, fire | `src/view/effects.mjs` |
| `createGpuParticles3D` | 落花、飘雪、薄雾里的光尘、宫前的火星 · petals, snow, motes and embers | `src/view/effects.mjs` |
| 动态几何（`Attribute3D` 的 `dynamic` 与 `touch()`）、`createRingGeometry3D`、`createUnlitMaterial3D` | 刀光拖尾、剑气、蛛网、落地冲击波 · blade trails, the flying cut, the web, the ring of a slam | `src/view/effects.mjs` |
| `projectToViewport3D` | 伤害数字和对手头顶的标记 · damage numbers and the marks over the foes | `src/main.mjs` |
| `@egret/engine/input/gamepad` · `createGamepadInput` | 手柄：每个物理帧把浏览器的手柄读进来，按标准布局的按钮名（`a`、`r2`、`l3`……）取键，摇杆去掉死区并拉满行程 · the pad, read each tick, its buttons by the standard layout's names and its sticks with the dead zone taken off | `src/input.mjs` |
| `@egret/engine/kit` · `createSaveStore` + `@egret/engine/web/kit` · `browserSaveStorage` | 设置与每营最好评等；坏档另存后重新开始，写不进时卷首提示 · settings and each regiment's best; a broken save set aside, a refused write said on the title | `src/saves.mjs`、`src/main.mjs` |
| `@egret/engine/kit` · `encodeWav` + `@egret/engine/web/audio` · `createBrowserAudio` | 合成音效和音乐 · synthesized sound and music | `src/audio.mjs` |

## 已验证 · Verified

- `node --test test/*.test.mjs`（Node 22）：25 项全过——对决规则 10 项（轻击与蓄力、刀路对上才挡得住、弹刀、踢和体力见底破防、闪步无敌、箭与盾、毒与蛛网、每个技能都能跑完、任意两营打到分出胜负且同种子同结果、一打二两人都倒下算赢）、存档 6 项（新档、设置和评等写入后再打开、只有更好的评等才替换、坏档另存后重新开始、形状不对或版本过新时重新开始、存储拒绝写入不报错）、征途 2 项、人物与动作资源 3 项、文字 2 项、引擎副本 2 项。 · 25 pass: 10 on the fight rules, 6 on the save, 2 on the road, 3 on the models and motion, 2 on the words, 2 on the engine copy.
- `node test/accept.mjs`（无头 Chromium + SwiftShader，1024×600）：15 项全过——卷首、键盘选营、配技能和天赋、阵前、开打、替身打完、结算、回卷首、设置里关血雾并存档、切英文、地址直接进一场以一敌二并打完、全程无控制台错误、无缺文件。 · 15 pass in headless Chromium, the whole road and a one-against-two fight played out, with no console errors or missing files.
- 电脑对电脑的平衡数字见上节；终局一打二用电脑替身当主角跑过每一营。 · The balance figures above; the last fight was run with a stand-in hero for every regiment.
- 五个场景、五个人物的站立与走路、准备、格挡、出刀、突刺、拉弓姿态都截图看过（高画质与低画质）。 · Every place, and every man standing, walking, ready, guarding, striking, thrusting and drawing, was looked at in screenshots.
- 品质验收见 [QUALITY.md](QUALITY.md)。 · Quality results are in QUALITY.md.

## 已知问题 · Known issues

- 只在无头 Chromium 的软件渲染（SwiftShader）下跑过，帧率很低（约 3–4 帧/秒）；有显卡的电脑、手机上的帧率和手感都**未运行**。 · Run only under software rendering in headless Chromium, at 3–4 frames a second; frame rate and feel on a real graphics card or phone are **not run**.
- 鼠标划向定刀路、指针锁定、按住蓄力的真实手感**未运行**：无头浏览器的指针锁定给出的位移不可信，验收里由替身代打。 · The feel of the mouse lines, pointer lock and held blows is **not run**: headless pointer lock reports unreliable movement, so a stand-in plays in the acceptance walk.
- 触屏摇杆和按键、手柄映射只写好了，没有在真机或真手柄上试过。声音没有用扬声器试听。 · Touch controls and the gamepad are written but not tried on a device; sound not listened to on speakers.
- WebGPU：无头 Chromium 里 `?backend=webgpu` 的界面正常，但 3D 画面是空白的，原因没有查明，所以默认用 WebGL2（ENGINE-NOTES 3）。 · WebGPU: in headless Chromium the interface draws but the 3D scene is blank; the cause is not found, so WebGL2 is the default.
- 终局一打二对电脑替身很难：替身当主角时五营的胜率在 3%–45% 之间（武射史对两个近战最难）。替身不会像人一样拉扯走位，真人的胜率未测。 · The last fight is hard for the stand-in hero (3–45% by regiment, the Archer against two close fighters hardest); a person's rate is not measured.
- 单营对单营有克制：例如替身当陷阵营打第一场的羽林卫只赢三成。征途的对手顺序是固定的，没有按自己的营调整。 · Some matchups are lopsided for the stand-in, and the order of the road does not change with the regiment chosen.
- 出手动作不是动作捕捉，是写出来的姿态，比真人动作硬一些；脚下没有贴地反向动力学，站在台阶和斜坡上会穿插（场地是平的，影响不大）。 · Blows are written poses, stiffer than captured ones; feet are not planted by IK.
- 高画质的人物与物件合计约 23 MB，第一次打开要下载一阵；低画质约 2.8 MB。 · The high set is about 23 MB to download the first time; the low set about 2.8 MB.
- 品质验收未达标 · Quality items failing（[QUALITY.md](QUALITY.md)，2026-11-23，无头 Chromium + SwiftShader · headless, software rendering）：F1 桌面帧时间 p95 ≤ 16.7 ms（p95 266.7 ms over 26 frames）。

## 已解决 · Solved

- **兵器拿反了**：手的坐标系用左手系拼出旋转，得到的四元数是错的，刀从手背穿出来。改成 `basis(cross(along, fingers), along, fingers)` 的右手系后五种兵器都握对。 · **Weapons held wrong**: a left-handed basis made a garbage rotation; a right-handed one fixed all of them.
- **骨骼空间差了一个转身**：求骨骼世界变换时把人物外层的朝向节点也乘了进去。改成沿 `parent` 只走到模型自己的根节点。 · **Bone space off by the holder's turn**: world transforms now stop at the model's own root.
- **弓手一家独大**：箭伤降低、只有 80 以上的箭才打出硬直、后退走得慢；电脑对弓手会之字形走位、满弓时闪步冲刺，盾牌在箭放出后多举 0.5 秒。弓手的总胜率降到 57%。 · **The Archer dominated**: lighter arrows, stagger only from heavy ones, slower backing off, and foes that zigzag and shield after a loose; now 57% overall.
- **羽林卫太强、陷阵营太弱**：盾牌挡偏了漏两成半伤害且更耗体力；双手兵器蓄满的重劈弹不开；陷阵营打盾更伤体力，生命和刀伤重调。 · **Yulin too strong, Vanguard too weak**: a shield on the wrong line lets damage through; full heavy two-handed cuts cannot be deflected.
- **主角转身比电脑快一倍**：主角和电脑原来的转身速度不同。每个人都有自己的转身速度（默认 10，玩家 14）。 · **The hero turned twice as fast**: each man now has his own turn rate.
- **终局打不赢**：加了独战两人的加成、终局对手七成生命、弓手放箭节奏（同伴贴身时放慢），两人用一个令牌轮流压上。 · **The last fight unwinnable**: the lone bonus, foes at 70% health, a slower archer when his friend is close, and a token so they take turns.
- **毒雾里一直中毒**：每团毒雾对每个人只毒一次。 · **Poisoned for ever inside the mist**: each cloud poisons each man once.
- **触屏玩不了弓手、也停不下来**：「出手」只在松手时发一下轻击，拉不了弓；在按钮上划的刀路又被轮流刀路盖掉；没有换刀和暂停按钮；键盘的技能栏压在血条上。现在按住不动就是蓄力或拉弓，划过就按划的方向出刀，弓手多一个「换刀」，左上角有「暂停」，触屏时键盘技能栏让位，技能冷却画在技能按钮上。 · **Touch could not use the bow or pause**: a held press now draws or winds up, a swipe sets the line, the Archer has a knife button, there is a pause button, and the key row gives way to the buttons.
- **按住拉弓却拉不开**：在受击或收招的那一刻按下的左键会被吞掉，一直按着也不会开始拉弓。现在只要按着、人一空下来就开始拉。 · **A held draw that never started**: a press made while staggered or recovering was lost; the draw now starts as soon as he is free.
- **切到后台再回来已经输了**：对决中页面被隐藏时自动暂停，按住的键全部松开（引擎的声音本来就会在后台暂停）。 · **Back from another tab to a lost fight**: hiding the page now pauses the fight and lets go of held keys.
- **刀光像一整张白纸**：拖尾从刀柄铺到刀尖、按叠加混合全亮，技能放多久就铺多久，挥一刀就留下一大片白色平面。现在只拖刀身外侧四成、只在刀尖移动够快时才铺，内缘透明、外缘半亮，按时间在五分之一秒里褪掉。 · **Trails like sheets of paper**: the ribbon ran hilt to tip at full additive brightness for the whole of a skill; it now covers the outer two-fifths of the blade, only while the point moves fast, and fades in a fifth of a second.
- **粒子是方块**：给粒子发射器传了画在小画布上的圆点和花瓣贴图（ENGINE-NOTES 2）。 · **Square particles**: given round dot and petal sprites.
- **盾背面看不见**：车削出来的盾背绕序反了，背面被剔除。 · **The back of the shield invisible**: the lathe winding was reversed.

## 未完成 · Unfinished

- 骑马、攻城、多人联机、捏脸和装备掉落都没有做，这是一个单人对决 Demo。 · No horses, sieges, online play, character making or loot: this is a single-player duelling demo.
- 出手和技能的动作捕捉：目前只有移动是动作捕捉。 · Motion capture for blows and skills; only movement is captured now.
- 按自己的营调整征途顺序和难度；终局对真人的难度还要在真机上调。 · A road that adapts to the regiment chosen, and tuning the last fight against people on real machines.
- 脚下贴地、受击方向的布娃娃式倒地。 · Planted feet and directional falls.

## 目录结构 · Layout

| 路径 · Path | 用途 · What it is for |
|---|---|
| `index.html`、`style.css` | 页面、import map、漆器与青铜风格的界面 · the page, the import map, the lacquer-and-bronze interface |
| `src/main.mjs` | 入口：渲染、场景、人物、征途、对决循环、镜头、存档、地址参数 · the entry |
| `src/sim/fight.mjs` | 对决规则：刀路、格挡、弹刀、踢、闪步、体力、技能、天赋、箭、毒、胜负 · the fight rules |
| `src/sim/regiments.mjs` | 五营的兵器、数值、技能、天赋和默认搭配 · the five regiments |
| `src/sim/brain.mjs` | 电脑对手：读刀、假动作、踢盾、放技能、一打二配合、弓手走位 · the computer's men |
| `src/sim/road.mjs` | 征途：对手顺序、场景、强度、终局、评分 · the road and the marks |
| `src/view/figure.mjs`、`src/view/rig.mjs`、`src/view/motion.mjs` | 人物：动作播放与混合、反向动力学、姿态表、技能动作、弓 · the men in motion |
| `src/view/weapons.mjs` | 按尺寸建模的兵器 · the weapons |
| `src/view/stage.mjs` | 五个场景：天空、光、雾、材质、物件布置、调色 · the five places |
| `src/view/effects.mjs` | 刀光、火花、血雾、箭、剑气、蛛网、天气 · effects and weather |
| `src/view/camera.mjs` | 越肩镜头、锁定、震动、避开柱子 · the camera |
| `src/input.mjs`、`src/hud.mjs`、`src/screens.mjs` | 键鼠手柄触屏、对决界面、各个页面 · input, the HUD, the pages |
| `src/audio.mjs`、`src/i18n.mjs`、`src/saves.mjs` | 合成声音、中英文字、存档（设置与每营最好评等，读不出或写不进时卷首会说明） · sound, words and the save |
| `assets/` | 人物、物件、动作、天空、材质（来源见 [docs/ASSETS.md](docs/ASSETS.md)） · models, motion, skies, materials |
| `docs/DESIGN.md` | 设计：五营、技能、天赋、手感、征途、场景 · the design |
| `docs/ASSETS.md` | 素材来源与许可 · where the assets come from, and their terms |
| `test/` | Node 测试和浏览器验收 · tests and the acceptance walk |
| `tools/trial.mjs` | 电脑对电脑的平衡试验 · the balance trials |
| `tools/retarget.mjs` | 动作捕捉重定向（离线） · offline retargeting |
| `tools/assets/` | 人物和物件的生成描述、打包脚本、天空与材质的转换脚本 · the descriptions the models were made from, and the packing scripts |
| `tools/look.html`、`tools/duel.html` | 看人物动作、定格对决姿态的开发页 · development viewers |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

- 引擎提交 `450bb9eb62fec9d3032b35766817844adc6eba33`（见 `vendor/SOURCE.md`）。 · Engine commit `450bb9e` (see `vendor/SOURCE.md`).
- 生成命令（在引擎仓库里）· Made with, in the engine repository:

```sh
node tools/vendor-game.mjs ../PortedGamesEgret/FiveRegiments @egret/engine @egret/engine/world3d @egret/engine/webgl2/world3d @egret/engine/webgpu/world3d @egret/engine/kit @egret/engine/web/kit @egret/engine/audio @egret/engine/web/audio @egret/engine/input/gamepad
```

- 游戏代码直接用到的入口：`@egret/engine/world3d`、`@egret/engine/webgpu/world3d`（`tools/look.mjs` 用 `@egret/engine/webgl2/world3d`）、`@egret/engine/kit`、`@egret/engine/web/kit`、`@egret/engine/web/audio`、`@egret/engine/input/gamepad`。 · Entries the game imports itself are listed above.
