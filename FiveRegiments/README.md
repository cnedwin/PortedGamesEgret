# 五营争锋 · Five Regiments

## 简介 · Introduction

五营争锋是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的第三人称冷兵器对决游戏 Demo。从五营里选一营：羽林卫（单手刀与盾，重甲）、虎步（单手剑，轻甲）、陷阵营（双手长斧，重甲）、银翎卫（方天戟，骑披甲战马，重甲）、武射史（短弓与狩猎刀，轻甲）。每营带两个职业技能、最多四个天赋上阵，依次在县城校场、桃林溪畔、竹林古道、雪原关隘单挑另外四营的电脑对手，最后在王城宫前以一敌二，两人都倒下就是「双杀」。

- 职业、技能、天赋、战技的名字和数值来自原作的公开版本公告和游戏内物品面板，生命值按原作（羽林卫 18000、虎步 12000、陷阵营 20000、银翎卫 13000、武射史 11000）；公告里没有的数都在 [docs/DESIGN.md](docs/DESIGN.md) 里标明是本作自定。
- 伤害公式按武器面板、重甲轻甲面板和生命值推算：普通一刀掉对方 6%–13% 的血，大招暴击最多三成，不会被一刀秒，一场打四十秒左右、来回好几次。
- 鼠标往哪边划就从哪边砍：左劈、右劈、上劈、突刺；右键按同一方向格挡，刚举起的一瞬接住是「弹刀」。踢腿破防，按住左键蓄重击，体力管着每一刀。
- 武器带战技，怒气满了按 X 放（羽林卫的盾牌战技按 Z）；R、T 放职业技能。
- 银翎卫骑马作战：E 上马下马，U 召唤战马，马上以挥砍为主、也能刺，马跑起来按 X 架枪；职业技能要下马才能放。
- 银翎卫玩家默认下马后按 R 或点「回马枪」侧撤踏定、转身送枪，按 T 或点「猪突猛进」向前冲刺。上步挥砍仍可在征途的配招界面装备。 · On foot, the Silver Wing Guard can sidestep and turn back with Returning Spear (R), or charge with Ferocious Charge (T). Forward Slash can still be equipped on the road.
- 按键和界面按原作 PC 版的布局：顶上罗盘、对手头顶名牌、左下生命体力数值、底部 1–0 物品栏和技能、战技与怒气条。
- 人物、战马、兵器和场景物件是 3D 模型，人物和战马骨骼绑定；人的站、走、跑、侧移、后退用动作捕捉数据，挥砍、格挡、技能是按兵器写的姿态加反向动力学，马的走、小跑、疾驰按落蹄顺序用代码驱动。
- 五个场景各有天空、光照、雾和调色，有阴影、环境光遮蔽、泛光，以及落花、飘雪、竹林薄雾、宫前火星这些天气粒子。

Five Regiments is a third-person cold-steel duelling demo made on its own with
[Egret Rebuild](https://github.com/cnedwin/Egret_rebuild), the new Egret engine. Choose one of five regiments — the
Imperial Guard (sabre and shield, heavy armour), the Tiger Step (sword, light armour), the Berserker Battalion
(two-handed long axe, heavy armour), the Silver Wing Guard (fangtian ji on an armoured horse, heavy armour) or the
Martial Archery Expert (short bow and hunting knife, light armour) — fit two of its skills and up to four talents, and
fight the computer's man from each of the other four, one at a time; then two at once before the palace, where felling
both is the "double kill".

- The professions, skills, talents and weapon arts, their names and numbers, come from the original's published notes
  and in-game item cards, the health from the original; whatever the notes do not give is marked as this demo's own
  in docs/DESIGN.md.
- The damage formula is worked out from the weapon and armour cards and the health: an ordinary blow takes 6–13% of a
  man's health, the biggest art with a crit about 30%; no one falls to one blow, and a fight lasts about forty seconds
  with the lead changing hands.
- The way the mouse last moved is the way the blow comes; the right button guards the same line, and a guard raised
  just in time is a deflection. A kick breaks a guard, a held button winds up a heavy blow, stamina governs every swing.
- A weapon art goes with X when the rage is full (the shield's with Z); R and T are the profession skills.
- The Silver Wing Guard fights from the saddle, mostly cutting and sometimes thrusting, and couches the ji with X once
  the horse is running; his profession skills need his feet on the ground.
- The keys and the panels follow the original's PC layout.
- The men, the horse, the weapons and the buildings are 3D models, the men and the horse rigged. The men's standing,
  walking, running, side steps and backing off are motion capture; cuts, guards and skills are poses written for each
  weapon, reached with inverse kinematics; the horse's walk, trot and gallop move its legs in code by their footfalls.
- Each of the five places has its own sky, light, fog and grade, with shadows, ambient occlusion and bloom, and
  weather: falling petals, snow, mist among the bamboo, sparks before the palace.

[在线试玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/FiveRegiments/)

## 玩法与操作 · How to play

**一局怎么走 · A run**

1. 选营：五个人站在校场上，左右键或点击切换，看兵器、生命和打法。 · Choose: the five stand on the drill ground; the arrows or a click turn between them.
2. 配技能：从本营技能里选两个，天赋最多四个（有默认搭配）；同一页列出本营的战技。 · Fit: two skills and up to four talents, with a default set; the weapon arts are listed on the same page.
3. 征途：四场单挑，对手按电脑对电脑的胜率从易到难：虎步、武射史、陷阵营、银翎卫、羽林卫里除自己以外的四营，电脑一场比一场反应快。每场赢了满血进下一场，输了可以重打这一场。 · The road: four duels, the foes ordered by how often each wins, each quicker to react than the last; a win sends him on at full health, a loss lets him fight that bout again.
4. 终局：王城宫前以一敌二（有弓手时是一近一远）。两人轮流压上，另一个绕侧或放箭；独战两人时伤害 ×1.5、受伤 ×0.5，对手生命六成五（本作的难度设定）。 · The last fight: two at once before the palace; they take turns to press. Alone against two he deals 1.5 times and takes half, and they start at 65% health (this demo's settings).
5. 结算：用时、剩余生命、弹刀、破防、被击中次数折成分数，按甲乙丙丁评等，每营记最好的一次。 · The tally: time, health left, deflections, guards broken and blows taken make the score, marked 甲 乙 丙 丁; the best of each regiment is kept.
6. 自由对决：任选自己和一到两个对手、任选场景。 · Free duel: any regiment against one or two others, in any place.

**手感 · Handling**

- 刀路：鼠标最后一下往哪边划，就选哪一向。单击模式下，按住左键锁定刀路和架势，准星外侧显示该方向。松开才挥出，蓄满也会继续等候。按住时可用右键收招。经典模式的格挡方向随来招。 · Flick the mouse to pick a line. In single-attack mode, hold the left button to lock in the line and ready the weapon. The crosshair highlights the held direction. Release to strike, even at full charge. Right click to feint while readying. Classic guard follows the incoming blow.
- 格挡：按住右键。方向对上才挡得住；挡偏了只卸一半（盾牌挡偏了漏两成半，且更耗体力）。刚举起的 0.2 秒内接住是弹刀：不耗体力，对方踉跄。双手兵器蓄满的重劈弹不开。 · Guard: hold the right button. Only the right line holds; a wrong one takes half (a shield on a wrong line lets a quarter through and tires him more). Caught in the first 0.2 s it is a deflection. A fully wound two-handed cut cannot be deflected.
- 「格挡辅助」（默认开）：按住右键时自动对准最近的来刀；关掉后全靠自己读刀。 · Guard assist (on by default) turns a held guard to the blow coming; turned off, the reading is all his.
- 虎步回旋击挥过后，准星的虚线环或手机格挡键的亮边提示可接格挡。此时新按右键或触屏格挡，松开后可接已装备的挥砍。 · After Tiger Step's Spin, the dashed reticle ring or outlined touch button signals a fresh guard press. Release guard to follow with Triple Cut if equipped.
- 踢：F，踢中正在格挡的人破防。 · Kick: F breaks a held guard.
- 重击：按住左键蓄力再松开，更疼、更耗体力。收刀后半段再按一下左键，直接接下一刀。 · Heavy blow: hold and let go. Press again late in the recovery and the next blow follows at once.
- 体力：出手、冲刺、跳、被挡都耗体力；见底时举不住兵器。 · Stamina: every swing, sprint, jump and guarded blow costs it; with none left he cannot hold a guard.
- 战技与怒气：打中、挨打、格挡、弹刀都会涨怒气；战技框下面是怒气条，满了框就亮，按 X 放（羽林卫的盾牌战技按 Z）。 · Rage builds as blows land, are taken, guarded and deflected; the bar under an art fills and the art lights when it can go: X (the Imperial Guard's shield art Z).
- 护甲：重甲挡得多、跑得慢；轻甲挡得少，但有三成三的几率偏斜、这一下只吃一半，跑得快。 · Armour: heavy takes more off and is slower; light takes less but deflects a third of blows to half, and is quicker.
- 弓（武射史）：按住左键拉弓，松开放箭，箭朝准星飞；拉满更准更疼，满弓拉太久会抖。弓在手上时右键不举挡，被贴身按 2 换狩猎刀、1 换回弓。 · The bow: hold to draw, let go to loose at the crosshair; held long at full draw it shakes. 2 takes up the knife, 1 the bow.
- 骑马（银翎卫）：开局在马上。E 上马/下马（各一秒左右，期间不能出手），U 把马叫过来。马上 WASD 驭马：马朝你指的方向转，越快转得越慢；Shift 疾驰（耗马的体力，HUD 左下有马的血和体力）。马上以挥砍为主、也能刺，马越快越疼；马跑起来按 X 架枪，戟尖斜指马头右前方，敌人在马的右侧最好打。马上不能踢、不能跳、不能放职业技能。砍在骑手身上的伤害马和人各担一半，马被砍倒或被蛮牛冲击撞中，人落马倒地。 · Riding: he starts in the saddle; E gets on or off, U calls the horse; WASD steers, Shift gallops on the horse's wind. From the saddle he mostly cuts and sometimes thrusts, harder at speed; with the horse running X couches the ji toward the horse's right front. No kick, jump or profession skill on horseback. Blows on a rider are shared with the horse; a horse cut down, or a Bull Charge, unhorses him.
- 绷带：按 3，一秒半包好，回两成生命，一场两卷。 · Bandage: 3, a second and a half, a fifth of his health back, two a fight.
- 连击（B）：开着时按住左键就一刀接一刀，不再蓄力。 · Continuous attack (B): while on, a held button strikes blow after blow instead of winding up.

| | 键盘与鼠标 · Keyboard and mouse | 手柄 · Gamepad | 触屏 · Touch |
|---|---|---|---|
| 移动 · Move | WASD / 方向键 · arrows | 左摇杆 · left stick | 左下摇杆 · stick, lower left |
| 转镜头、定刀路 · Turn, set the line | 移动鼠标（开打时鼠标锁在画面里） · move the mouse (held in the page while fighting) | 右摇杆 · right stick | 右上半屏拖动转镜头；在「出手」上划一下定刀路，不划则刀路轮流 · drag on the upper right to turn; swipe on Strike to set the line, or the lines come in turn |
| 攻击 / 拉弓 · Strike / draw | 左键按住预备，松开出手 · hold left button to ready, release to strike | RT | 「出手」，按住不动是蓄力或拉弓 · Strike; held still, a heavy blow or the draw |
| 格挡 · Guard | 右键 · right button | LT | 「格挡」 · Guard |
| 踢 · Kick | F | X | 「踢」 · Kick |
| 跳 · Jump | 空格 · Space | B | 「跳」 · Jump |
| 冲刺 · Sprint | 左 Shift | 按下左摇杆 · L3 | — |
| 职业技能 · Profession skills | R / T | LB / RB | 两个技能键 · two skill buttons |
| 战技 · Weapon art | X（羽林卫的盾牌战技 Z） · X (the shield's: Z) | Y（盾牌战技 十字右） · Y (shield: d-pad right) | 「战技」「盾牌战技」 · Art, Shield art |
| 出手方向 · Strike on a line | 小键盘 8 上劈、2 突刺、4 6 左右（7 1 9 3 同侧） · keypad 8 overhead, 2 thrust, 4 6 left and right | — | — |
| 单击 / 连击 · Single or continuous | B | — | — |
| 物品栏 · The bar | 1 2 兵器、3 绷带 · 1 2 weapons, 3 bandage | A 换兵器、十字下 绷带 · A weapons, d-pad down bandage | 「换刀」「绷带」 · Knife, Bandage |
| 上马 / 下马 · Mount or dismount | E | 十字上 · d-pad up | 「上马」「下马」 · Mount, Dismount |
| 召唤战马 · Call the horse | U | 十字左 · d-pad left | — |
| 视角 · View | V 第一/第三人称，滚轮远近 · V first or third person, wheel nearer or further | — | — |
| 锁定 · Lock on | 中键 · middle button | Y / R3 | 默认锁定单个对手 · on by default against one foe |
| 界面 · Panels | Tab 隐藏，Ctrl+H 按键提示 · Tab hides them, Ctrl+H key hints | — | — |
| 菜单 · Menu | Esc | Start | 「暂停」 · Pause |

设置：画质（低 / 中 / 高，首次按设备自动选）、操作方式（方向 / 经典）、格挡辅助、血雾、声音、上下反转、鼠标灵敏度；中英文在卷首切换。触屏自动用「经典」的轮流刀路和自动对准的格挡；手柄用右摇杆定刀路。 · Settings: picture quality (chosen by the device at first), the control scheme, guard assist, blood, sound, invert Y and mouse sensitivity; the language is switched on the title. Touch uses the classic turn of lines and a guard that turns itself; the gamepad sets the line with the right stick.

**五营 · The five regiments**

| 营 · Regiment | 兵器 · Arms | 护甲 · Armour | 生命 · Health | 默认技能（R、T） · Default skills | 战技 · Weapon arts |
|---|---|---|---|---|---|
| 羽林卫 · Imperial Guard | 环首刀（单手利刃）、盾 · sabre, shield | 重甲 · heavy | 18000 | 冲锋突刺、蛮牛冲击 | X 终结打击，Z 盾牌猛击 |
| 虎步 · Tiger Step | 汉剑（单手利刃） · sword | 轻甲 · light | 12000 | 回旋击、挥砍 | X 终结打击 |
| 陷阵营 · Berserker Battalion | 长斧（双手斧钺） · long axe | 重甲 · heavy | 20000 | 下劈、剑气斩 | X 斧钺猛击 |
| 银翎卫 · Silver Wing Guard | 方天戟（长杆斧钺）、披甲战马 · fangtian ji, horse | 重甲 · heavy | 13000 | 回马枪、猪突猛进（下马） | 步战 X 斧钺猛击，马上 X 架枪 |
| 武射史 · Martial Archery Expert | 短弓、狩猎刀 · bow, knife | 轻甲 · light | 11000 | 扇形射击、飓风箭 | X 多重射击 |

每营的全部技能（共二十一个）、天赋、战技、伤害公式和每个数的出处见 [docs/DESIGN.md](docs/DESIGN.md)。 · All the skills (twenty-one), talents, weapon arts, the damage formula and where every number comes from are in docs/DESIGN.md.

## 美术、声音与平衡 · Art, sound and balance

- 人物（五营各一）、披甲战马和三十二件场景物件用 Tripo 生成：城门楼、宫门、亭子、烽火台、石桥、桃树、竹、松、旗、兵器架、草靶、鼓、木栅、山石、火盆、石狮、铜鼎，以及营寨和关城的城墙段、木寨门、箭楼、营帐、拒马、投石车、床弩、茅草土屋、马厩、篝火、粮车、军需堆。人物带标准人形骨架，战马带四足骨骼；再用 gltfpack 减面、量化和 meshopt 压缩成高、中、低三档（人物和马合计 10.6 / 4.3 / 2.3 MB，每个场景只载入自己用到的物件）。 · The five men, the armoured horse and thirty-two props — among them the camp and fort pieces: crenellated wall sections, a stockade gate, arrow towers, tents, cheval-de-frise, a trebuchet, bed crossbows, a thatched hut, a stable, a campfire, a cart and supplies — were generated with Tripo, the men rigged to a humanoid skeleton and the horse to a four-legged one, then reduced, quantized and meshopt-compressed into high, medium and low sets (men and horse 10.6 / 4.3 / 2.3 MB; each place loads only its own props).
- 兵器（环首刀、汉剑、双手长斧、方天戟及两侧月牙和红缨、狩猎刀、角弓及弓弦、圆盾、箭）用代码按尺寸建模，钢刃双面、盾背有握把。 · The weapons, the fangtian ji with its two crescents and the long axe among them, are modelled in code to size.
- 战马的步态用代码驱动：走是四拍、小跑是对角两拍、疾驰是旋转式，各有自己的落蹄顺序、步幅和摆幅，按马速混合；身体随步态起伏俯仰，头随之点动；受重击人立，被砍倒侧翻。骑手按马鞍的位置坐上去，大腿分开夹住马腹，上身朝鼠标方向扭转。 · The horse's gaits are driven in code: a four-beat walk, a two-beat trot and a rotary gallop, each with its own footfalls, stride and swing, blended by speed; the body rises and pitches over them and the head nods; it rears at a hard blow and goes down on its side when killed. The rider sits where the saddle is, legs astride, his chest turning toward where the mouse looks.
- 站、走、跑、后退、侧移来自 CMU 动作捕捉库，用 `tools/retarget.mjs` 离线重定向到每个人物（对齐静止姿势的骨骼方向、去掉根部转向、截出循环段，侧移的另一边是镜像）。 · Standing, walking, running, backing off and side steps are CMU motion capture, retargeted offline onto each man by `tools/retarget.mjs`.
- 左右劈、上劈和突刺按兵器使用独立姿态。蓄力保持蓄势，放手时腰身与手臂接续发力，重兵器有更明显的随势收招。近战站姿用脚掌作落地参考，双手兵器按实际掌心调整握点。 · Side cuts, overhead and thrust use per-weapon poses. A charge holds its wind-up until release, with torso-led motion and a longer follow-through for heavier weapons. Grounded poses reference the ball of the foot, and the second hand follows the weapon at its palm grip.
- 刀风对齐出手时刻。格挡、弹刀、护甲命中和重击有各自的声画反馈，火花按当前帧的兵器与防守者位置绘制。 · Swing audio follows the release, and blocks, parries, armour hits and heavy blows have distinct cues. Contact effects use the current frame's weapon and defender positions.
- 地面、夯土墙、木、瓦、宫墙、石板路、雪、竹墙用 Poly Haven 的 CC0 扫描材质（颜色、法线、AO/粗糙度/金属度三张），天空用 Poly Haven 的 CC0 HDRI 转成色调映射后的 JPEG 全景图，同时做环境光。 · Ground, walls, timber, tiles, flagstones, snow and bamboo are CC0 scanned materials from Poly Haven; the skies are CC0 HDRIs, tone-mapped to JPEG panoramas, which also light the scene.
- 声音全部合成：刀风、金铁相击、弹刀、盾响、中刀、暴击、踢、破防、拉弓放箭、爆炸、毒雾、战吼、倒地、战鼓和铜锣；对决时是战鼓，菜单是拨弦。 · Every sound is synthesized; war drums in a fight, plucked strings in the menus.
- 伤害公式用 `node tools/formula.mjs` 推算和实测：它列出每对营之间普通一刀、蓄力一刀、最大技能或战技暴击各掉对方多少血，再让电脑对电脑打 200 场，量每一下实际掉多少（中位数 7.8%，最大 28.8%）、一场多长（平均 41 秒）、领先方换手几次（平均 2.3 次）。 · The damage formula is worked out and checked with `node tools/formula.mjs`: the table of what each blow takes, then 200 bouts measured (a landed blow a median 7.8% of health, the biggest 28.8%, 41 s a bout, the lead changing hands 2.3 times).
- 平衡用 `node tools/trial.mjs` 让电脑和电脑在 18 米的场地上对打。两边强度都是 0.6、每对打 60 场时，五营的总胜率在 35%–63% 之间（羽林卫 53%、虎步 49%、陷阵营 63%、银翎卫 51%、武射史 35%）；强度 0.42 时在 40%–65% 之间。调的只是本作自定的数（出手快慢、箭本身的伤害、电脑的打法），官方和面板上的数没动。克制关系明显：穿轻甲、跑得快的虎步几乎压死武射史。 · Balance by the computer fighting itself: at strength 0.6 every regiment wins 35–63% overall, at 0.42, 40–65%. Only this demo's own numbers were tuned. The quick, light-armoured Tiger Step all but always beats the Archer.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `@egret/engine/webgpu/world3d` · `createWorld3DApp` | 画布、帧循环、画质档位（自动按设备选高中低）；默认 WebGL2，`?backend=webgpu` 用 WebGPU · the canvas, loop and quality tiers; WebGL2 by default, WebGPU on request | `src/main.mjs` |
| `loadGltf3D`（meshopt、量化） | 五个带骨骼的人物、带四足骨骼的战马和三十二件场景物件，各三档 · five rigged men, the rigged horse and thirty-two props, three sets each | `src/main.mjs`、`src/view/stage.mjs` |
| 骨骼节点（`Object3D` 的位置与旋转） | 每帧把动作捕捉姿态写进人的骨骼，再叠加反向动力学和腰身扭转；战马的腿骨按步态逐帧转动 · each frame the captured pose is written to the men's bones with IK and the twist laid over it; the horse's leg bones are turned by its gait | `src/view/motion.mjs`、`src/view/rig.mjs`、`src/view/figure.mjs`、`src/view/horse.mjs` |
| `Object3D.localToWorld` | 从战马的脊骨取马鞍位置，骑手每帧坐上去；第一人称取人物头部位置 · the saddle's place from the horse's spine for the rider each frame; the head's place for the first-person view | `src/view/horse.mjs`、`src/view/figure.mjs` |
| `createGeometry3D`、`createCylinderGeometry3D`、`createStandardMaterial3D` | 按尺寸建模的八种兵器、弓弦、箭，钢刃双面 · the eight weapons, the string and arrows modelled to size | `src/view/weapons.mjs`、`src/view/figure.mjs` |
| `createCubeTextureFromEquirect3D` + `scene.environment` / `background` | 五张天空全景图做背景和基于图像的环境光 · five panoramas as sky and image-based light | `src/view/stage.mjs` |
| `Texture3D`（`repeat`、各向异性、mipmap） | 扫描材质铺在 1600 米的地面和城墙、宫墙上 · scanned materials over the ground and walls | `src/view/stage.mjs` |
| `createDirectionalLight3D`（级联阴影）、`createHemisphereLight3D`、`createPointLight3D` | 太阳和阴影（高画质两级级联）、天光、火盆的火光、命中闪光 · the sun and its shadows, sky light, braziers, the flash of a hit | `src/view/stage.mjs`、`src/view/effects.mjs` |
| `scene.fog`（指数雾） | 每个场景的雾，竹林最浓 · each place's fog, thickest among the bamboo | `src/view/stage.mjs` |
| `renderer.postProcess`、`renderer.exposure` | 泛光、环境光遮蔽（高画质）、FXAA、暗角、饱和度、对比度、亮度，每个场景一套 · bloom, SSAO, FXAA, vignette and a grade per place | `src/view/stage.mjs` |
| `createParticleEmitter3D` | 火花、血雾、尘土、毒雾、火盆的火 · sparks, blood, dust, poison, fire | `src/view/effects.mjs` |
| `createGpuParticles3D` | 落花、飘雪、薄雾里的光尘、宫前的火星 · petals, snow, motes and embers | `src/view/effects.mjs` |
| 动态几何（`Attribute3D` 的 `dynamic` 与 `touch()`）、`createRingGeometry3D`、`createUnlitMaterial3D` | 刀光拖尾、剑气、蛛网、落地冲击波 · blade trails, the flying cut, the web, the ring of a slam | `src/view/effects.mjs` |
| `projectToViewport3D` | 伤害数字，对手头顶的名牌和血条 · damage numbers, the nameplates and health over the foes | `src/main.mjs`、`src/hud.mjs` |
| `@egret/engine/input/gamepad` · `createGamepadInput` | 手柄：每个物理帧把浏览器的手柄读进来，按标准布局的按钮名（`a`、`r2`、`l3`……）取键，摇杆去掉死区并拉满行程 · the pad, read each tick, its buttons by the standard layout's names and its sticks with the dead zone taken off | `src/input.mjs` |
| `@egret/engine/kit` · `createSaveStore` + `@egret/engine/web/kit` · `browserSaveStorage` | 设置与每营最好评等；坏档另存后重新开始，写不进时卷首提示 · settings and each regiment's best; a broken save set aside, a refused write said on the title | `src/saves.mjs`、`src/main.mjs` |
| `@egret/engine/kit` · `encodeWav` + `@egret/engine/web/audio` · `createBrowserAudio` | 合成音效和音乐 · synthesized sound and music | `src/audio.mjs` |

## 已验证 · Verified

- `node --test test/*.test.mjs`（Node 22）：32 项全过——对决规则 17 项（轻击与蓄力、刀路对上才挡得住、弹刀、踢和体力见底破防、蛮牛冲击让人 4 秒不能攻防并撞人落马、箭与盾、毒瘴按秒掉血并传给身边同伴再免疫、每个战技要够怒气才能放并打中后进入冷却、盾牌猛击击倒、终结打击击杀后刷新、每个职业技能都能跑完、任意两营打到分出胜负且同种子同结果、一打二两人都倒下算赢、骑马加速疾驰和大弯、马跑起来才能架枪而职业技能要下马、架枪打马头右前方而不打正前方、骑手与马分担伤害和战马被砍倒落马、金戈铁马与龙精虎猛、伤害公式里普通一击掉 4%–20% 而最大一击也打不到 40%、绷带），存档 6 项、征途 2 项、人物与动作资源 3 项、文字 2 项、引擎副本 2 项。 · 32 pass, 17 of them on the fight rules: the Bull Charge, the poison, every weapon art and its rage, the couched ji taking a man off the horse's right front, the talents, and the damage formula's promise that an ordinary blow takes 4–20% and no single blow reaches 40%.
- `node test/accept.mjs`（无头 Chromium + SwiftShader，1024×600）：21 项全过——卷首、键盘选营、配技能（虎步的两个天赋可去可回、战技列在同页）、阵前、开打、替身打完、结算、回卷首、设置里关血雾并存档、切英文、地址直接进一场以一敌二并打完、三张截图基线，全程无控制台错误、无缺文件。 · 21 pass in headless Chromium, the whole road and a one-against-two fight played out, with no console errors or missing files.
- 电脑对电脑的平衡数字见上节；终局一打二用电脑替身当主角跑过每一营。 · The balance figures above; the last fight was run with a stand-in hero for every regiment.
- 五个场景、五个人物的站立与走路、准备、格挡、出刀、突刺、拉弓姿态都截图看过（高画质与低画质）。 · Every place, and every man standing, walking, ready, guarding, striking, thrusting and drawing, was looked at in screenshots.
- 品质验收见 [QUALITY.md](QUALITY.md)。 · Quality results are in QUALITY.md.

## 已知问题 · Known issues

- 只在无头 Chromium 的软件渲染（SwiftShader）下跑过，帧率很低（约 3–4 帧/秒）；有显卡的电脑、手机上的帧率和手感都**未运行**。 · Run only under software rendering in headless Chromium, at 3–4 frames a second; frame rate and feel on a real graphics card or phone are **not run**.
- 鼠标划向定刀路、指针锁定、按住蓄力的真实手感**未运行**：无头浏览器的指针锁定给出的位移不可信，验收里由替身代打。 · The feel of the mouse lines, pointer lock and held blows is **not run**: headless pointer lock reports unreliable movement, so a stand-in plays in the acceptance walk.
- 触屏摇杆和按键、手柄映射只写好了，没有在真机或真手柄上试过。声音没有用扬声器试听。 · Touch controls and the gamepad are written but not tried on a device; sound not listened to on speakers.
- WebGPU：无头 Chromium 里 `?backend=webgpu` 的界面正常，但 3D 画面是空白的，原因没有查明，所以默认用 WebGL2（ENGINE-NOTES 3）。 · WebGPU: in headless Chromium the interface draws but the 3D scene is blank; the cause is not found, so WebGL2 is the default.
- 终局一打二对电脑替身仍然难：替身当主角时，虎步约六成、羽林卫和陷阵营约三成、银翎卫约一成七、武射史不到一成。替身不会拉扯走位，真人的胜率未测；终局已经降到强度 0.36、对手生命六成五，独战两人伤害 ×1.5、受伤 ×0.5。 · The last fight is still hard for the stand-in hero: the Tiger Step wins about three in five, the Imperial Guard and the Berserker Battalion about a third, the Silver Wing Guard a sixth, the Archer under a tenth. A person's rate is not measured. It is already eased (strength 0.36, foes at 65% health, the lone fighter dealing 1.5 times and taking half).
- 伤害公式是本作推算的（原作没有公布）：等级与熟练度加成 2.8、护甲常数 6000、单次上限曲线 0.4 都是为手感定的；武器、护甲、生命和技能百分比用的是原作的数。只拿到一套百炼重甲、一套百炼轻甲和每种武器一件的面板，锤锻词条（如「抵挡挥砍伤害」）没有算进去。 · The damage formula is this demo's (the original does not publish one): its three constants are set for the feel, while the weapon, armour, health and skill numbers are the original's. Only one high-quality armour set of each kind and one weapon of each kind were on cards, and their forged extras are left out.
- 原作的战技来自武器的锤锻属性，同一种武器可能锤出别的战技；本作每种武器只用截图里的那一个。双手利刃（如斩马刀）等没有截图的武器种类，战技没做。 · In the original a weapon's art comes from its forging and may differ; each weapon here has the one on its card.
- 一部分官方技能、天赋没做，因为公告只有名字或只写了改动（列在 DESIGN）。 · Some official skills and talents are left out because the notes give only their names or changes (listed in DESIGN).
- 单营对单营有克制：例如替身当陷阵营打第一场的羽林卫只赢三成。征途的对手顺序是固定的，没有按自己的营调整。 · Some matchups are lopsided for the stand-in, and the order of the road does not change with the regiment chosen.
- 出手动作不是动作捕捉，是写出来的姿态，比真人动作硬一些；脚下没有贴地反向动力学，站在台阶和斜坡上会穿插（场地是平的，影响不大）。 · Blows are written poses, stiffer than captured ones; feet are not planted by IK.
- 高画质下进一场要下载人物、战马和这个场景的物件，大约 10–15 MB；低画质约 2–4 MB。 · At high quality a fight downloads the men, the horse and that place's props, about 10–15 MB; at low quality about 2–4 MB.
- 界面布局和按键按公开的按键表和沙盒战争类 PC 游戏的常见布局做，没有对着原作截图逐像素比对；手上没有截图可对，罗盘、名牌、物品栏的样式是自己画的。 · The panels and keys follow published key lists and the usual layout of sandbox-war PC games, not a pixel comparison with screenshots; the compass, nameplates and bar are drawn here.
- 战马的骨骼里右后腿只有一节骨头，跑起来那条腿只能整条摆动、不能弯膝。马上不能跳、没有马上弓射。 · The horse's rig has a single bone for the right hind leg, so that leg swings without bending. No jumping on horseback, and no mounted archery.
- 刀路只有四个方向；原作武器面板上的八个方向没有做全。 · Four lines of cut; the original's eight directions are not all made.
- 品质验收未达标 · Quality items failing（[QUALITY.md](QUALITY.md)，2026-11-24，无头 Chromium + SwiftShader · headless, software rendering）：F1 桌面帧时间 p95 ≤ 16.7 ms（p95 383.4 ms over 23 frames）。

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
- **中低画质的建筑贴图被拉花**：gltfpack 的激进简化（`-sa`）会合并贴图接缝，城门楼、烽火台在中、低画质下像融化了一样。建筑和人物改成不用激进简化重新打包；树木、山石这类重复很多次的小物件仍在中低两档允许激进简化，否则一片竹林有一百多万个三角形。 · **Buildings smeared at medium and low quality**: gltfpack's aggressive simplification merged texture seams; buildings and men are packed without it now, while trees, rocks and small repeated things still use it in the lower sets.
- **对决截图基线不稳**：骑马的银翎卫跑得快，截图早一两帧晚一两帧画面就差 3%，超过 2% 的门槛。页面加了 `holdAt(秒)`，验收时把战斗停在第 2.5 秒再截。 · **An unsteady fight baseline**: the galloping rider moved enough in a tick or two to differ by 3%; the page now offers `holdAt(seconds)` and the walk stands the fight still at 2.5 s before the capture.
- **毒瘴从来没掉过血**：中毒每一帧扣的血不到 1 点，四舍五入成 0。现在零头攒够一点才扣，测试里核对毒瘴掉的总血。 · **Poison never hurt**: each tick's share rounded to nothing; the fractions are now carried until they make a whole point.
- **有的天赋和机制不是原作的**：第一版的大部分天赋、跳起一瞬无敌、金疮药都不是原作里的。现在技能、天赋、战技一律按公告和物品面板，查不到的不收；回血道具换成原作有的绷带。 · **Talents and rules not from the original**: most of the first version's talents, the untouchable jump and the wound dressing were not the original's; skills, talents and arts now follow the notes and item cards, what cannot be found is left out, and the mending item is the original's bandage.
- **骑兵太强**：第一版骑马的银翎卫总胜率 86%：马挡一半伤害、轻击打不晃、马上横扫又宽又疼，步兵还一路冲刺追马把体力耗光。马的生命降到 420，马上出手和冲锋的伤害下调；步兵不再追马，站定等马过来、预判马速出手、看准冲锋侧闪；弓手被贴身时会侧跳躲横扫。总胜率降到 57%。 · **Cavalry too strong**: at first the mounted Silver Plume won 86%; the horse's health and the saddle blows came down, men on foot stopped chasing the horse and learned to stand, time their blow to its speed and sidestep a charge; now 57%.
- **粒子是方块**：给粒子发射器传了画在小画布上的圆点和花瓣贴图（ENGINE-NOTES 2）。 · **Square particles**: given round dot and petal sprites.
- **盾背面看不见**：车削出来的盾背绕序反了，背面被剔除。 · **The back of the shield invisible**: the lathe winding was reversed.

## 未完成 · Unfinished

- 攻城、多人联机、捏脸、装备掉落和建造都没有做，这是一个单人对决 Demo；营寨、投石车、床弩只是场景。 · No sieges, online play, character making, loot or building: this is a single-player duelling demo; the camps and siege engines are scenery.
- 马上弓射、马的跳跃、八方向刀路。 · Mounted archery, jumping on horseback, eight lines of cut.
- 出手和技能的动作捕捉：目前只有移动是动作捕捉。 · Motion capture for blows and skills; only movement is captured now.
- 按自己的营调整征途顺序和难度；终局对真人的难度还要在真机上调。 · A road that adapts to the regiment chosen, and tuning the last fight against people on real machines.
- 脚下贴地、受击方向的布娃娃式倒地。 · Planted feet and directional falls.

## 目录结构 · Layout

| 路径 · Path | 用途 · What it is for |
|---|---|
| `index.html`、`style.css` | 页面、import map、漆器与青铜风格的界面 · the page, the import map, the lacquer-and-bronze interface |
| `src/main.mjs` | 入口：渲染、场景、人物、征途、对决循环、镜头、存档、地址参数 · the entry |
| `src/sim/fight.mjs` | 对决规则：刀路、格挡、弹刀、踢、跳、体力、伤害公式、技能、战技与怒气、天赋、箭、毒、骑马、胜负 · the fight rules |
| `src/sim/regiments.mjs` | 五营的兵器、护甲、生命、技能、天赋、战技、伤害公式的常数和每个数的出处 · the five regiments and where their numbers come from |
| `src/sim/brain.mjs` | 电脑对手：读刀、假动作、踢盾、放技能、一打二配合、弓手走位 · the computer's men |
| `src/sim/road.mjs` | 征途：对手顺序、场景、强度、终局、评分 · the road and the marks |
| `src/view/figure.mjs`、`src/view/rig.mjs`、`src/view/motion.mjs` | 人物：动作播放与混合、反向动力学、姿态表、技能动作、弓、骑乘坐姿 · the men in motion, and in the saddle |
| `src/view/horse.mjs` | 战马：步态、起伏、人立、倒地、马鞍位置 · the horse: gaits, rearing, falling, the saddle |
| `src/view/weapons.mjs` | 按尺寸建模的兵器 · the weapons |
| `src/view/stage.mjs` | 五个场景：天空、光、雾、材质、物件布置、调色 · the five places |
| `src/view/effects.mjs` | 刀光、火花、血雾、箭、剑气、蛛网、天气 · effects and weather |
| `src/view/camera.mjs` | 越肩镜头、锁定、震动、避开柱子 · the camera |
| `src/input.mjs`、`src/hud.mjs`、`src/screens.mjs` | 键鼠（沙盒战争 PC 键位）、手柄、触屏；罗盘、名牌、物品栏、技能栏、按键提示；各个页面 · input, the HUD, the pages |
| `src/audio.mjs`、`src/i18n.mjs`、`src/saves.mjs` | 合成声音、中英文字、存档（设置与每营最好评等，读不出或写不进时卷首会说明） · sound, words and the save |
| `assets/` | 人物、物件、动作、天空、材质（来源见 [docs/ASSETS.md](docs/ASSETS.md)） · models, motion, skies, materials |
| `docs/DESIGN.md` | 设计：数值出处、五营、伤害公式、技能、战技、天赋、手感、征途、场景 · the design, and where every number comes from |
| `docs/ASSETS.md` | 素材来源与许可 · where the assets come from, and their terms |
| `test/` | Node 测试和浏览器验收 · tests and the acceptance walk |
| `tools/trial.mjs` | 电脑对电脑的平衡试验 · the balance trials |
| `tools/formula.mjs` | 伤害公式的推算表和实测 · the damage formula's table, and what happens in play |
| `tools/retarget.mjs` | 动作捕捉重定向（离线） · offline retargeting |
| `tools/assets/` | 人物和物件的生成描述、打包脚本、天空与材质的转换脚本 · the descriptions the models were made from, and the packing scripts |
| `tools/look.html`、`tools/duel.html`、`tools/horse.html` | 看人物动作、定格对决姿态、看战马步态和任一模型的开发页 · development viewers |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

- 引擎提交 `450bb9eb62fec9d3032b35766817844adc6eba33`（见 `vendor/SOURCE.md`）。 · Engine commit `450bb9e` (see `vendor/SOURCE.md`).
- 生成命令（在引擎仓库里）· Made with, in the engine repository:

```sh
node tools/vendor-game.mjs ../PortedGamesEgret/FiveRegiments @egret/engine @egret/engine/world3d @egret/engine/webgl2/world3d @egret/engine/webgpu/world3d @egret/engine/kit @egret/engine/web/kit @egret/engine/audio @egret/engine/web/audio @egret/engine/input/gamepad
```

- 游戏代码直接用到的入口：`@egret/engine/world3d`、`@egret/engine/webgpu/world3d`（`tools/look.mjs` 用 `@egret/engine/webgl2/world3d`）、`@egret/engine/kit`、`@egret/engine/web/kit`、`@egret/engine/web/audio`、`@egret/engine/input/gamepad`。 · Entries the game imports itself are listed above.
