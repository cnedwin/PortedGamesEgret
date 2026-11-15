# 断流行动 · 现状与待办 · Operation Cutoff · Status and backlog

这份文档记录这一版的完成情况：已经解决的问题、还没有验证的部分、已知问题、没做完的功能，以及各个模型做到了什么程度。改动合入后请同步更新。

This document records where this version stands: problems already solved, parts not yet verified, known issues, unfinished features, and how far each model has been taken. Please keep it up to date as changes land.

## 这一版有什么 · What this version contains

| 方面 · Area | 内容 · Content |
| --- | --- |
| 流程 · Flow | 三处终端各守约半分钟，随后等直升机约四十秒并登机；一局三到五分钟 · three terminals held for about half a minute each, then about forty seconds until the helicopter, then boarding; a run takes three to five minutes |
| 武器 · Weapons | 突击步枪、手枪、带瞄准镜的精确射手步枪、手雷；前握把和扩容弹匣两种配件 · assault rifle, pistol, scoped marksman rifle, grenades; two attachments, a foregrip and an extended magazine |
| 敌人 · Enemies | 步枪兵、突击兵、重装兵；会换弹、找掩体、包抄、扔手雷、喊话，中弹后变成布娃娃 · riflemen, assaulters, heavies; they reload, take cover, flank, throw grenades and call out, and go limp when shot |
| 搜集 · Looting | 十个物资箱，十二格背包，按稀有度分色，结算计总价值 · ten crates, a twelve-slot backpack, items coloured by rarity, total value at the debrief |
| 界面 · Interface | 指南针、目标列表、世界标记、小地图、背包面板、瞄准镜视野、受击方向、中英文切换、触屏按钮 · compass, objective list, world markers, minimap, backpack panel, scope view, hit direction, Chinese and English, touch buttons |
| 画面 · Picture | 三级级联阴影、投影探照灯、雨、湿地面镜面反射、掉漆锈蚀、贴花弹孔、景深、受伤调色、大气散射、泛光、环境光遮蔽 · three shadow cascades, shadow-casting floodlights, rain, mirror reflection on wet ground, chipped paint and rust, decal bullet marks, depth of field, hurt grading, atmospheric scattering, bloom, ambient occlusion |
| 声音 · Sound | 全部合成：枪声、脚步、环境循环、两种混响空间、随战况变化的配乐 · all synthesised: gunfire, footsteps, ambience loops, two reverb spaces, a score that follows the fight |

## 验证情况 · What has been verified

已验证 · Verified:

- 规则有十五个自动测试（`node --test`），覆盖地图可达性、武器、敌人、传输、撤离和确定性。
- 无界面整局对局（`node tools/headless.mjs`）：代打程序用时约两分四十秒；瞄准放慢到四分之一的代打程序十局通关九局。
- 浏览器内用软件渲染（WebGL 2）逐项截图检查过：标题页、战斗、小地图、背包、瞄准镜、传输进度与信号中断提示、枪口火光、敌人近景、卡车、大坝、结算页，页面无报错。

- Fifteen automated tests for the rules (`node --test`): map reachability, weapons, enemies, transfers, extraction and determinism.
- Whole runs without a page (`node tools/headless.mjs`): the stand-in player takes about two minutes forty; with its aim slowed to a quarter it finishes nine runs out of ten.
- Checked by screenshot in a browser with software rendering (WebGL 2): title, combat, minimap, backpack, scope, transfer progress and the out-of-range warning, muzzle flash, a soldier up close, trucks, the dam, the debrief. No page errors.

尚未验证 · Not yet verified:

| 项目 · Item | 说明 · Note |
| --- | --- |
| 真机帧率 · Frame rate on real hardware | 只在软件渲染下跑过，每帧零点五到三秒，无法代表真实显卡 · only run under software rendering at half a second to three seconds a frame, which says nothing about a real GPU |
| WebGPU 后端 · WebGPU backend | 自定义着色器都写了 WGSL 版本，但 `?backend=webgpu` 从未实际运行过 · every custom shader has a WGSL version, but `?backend=webgpu` has never actually been run |
| 真人难度与时长 · Difficulty and length for a person | 三到五分钟是按代打程序用时推算的，没有真人实测 · three to five minutes is estimated from the stand-in player, not measured with people |
| 鼠标锁定与触屏手感 · Mouse capture and touch feel | 灵敏度、摇杆和按钮布局没有在真机上调过 · sensitivity, the stick and the button layout have not been tuned on a device |
| 声音听感 · How it sounds | 音效和配乐只检查过代码能运行，没有人听过整体混音 · sound and score are known to run; nobody has listened to the mix |
| 敌人的动作 · Enemy animation | 开枪后坐、中弹扭身、蹲在掩体后、换弹、布娃娃倒地都没有截到过画面 · recoil, the flinch when hit, kneeling behind cover, reloading and the ragdoll fall have not been captured in a picture |
| 包抄与扔手雷 · Flanking and grenades | 由规则测试和整局对局覆盖，没有在画面里看过完整过程 · covered by tests and whole runs, never watched from start to finish on screen |
| 线上页面 · The hosted page | 没有确认 GitHub Pages 上的版本已更新 · the copy on GitHub Pages has not been confirmed up to date |

## 已知问题 · Known issues

| 问题 · Issue | 影响 · Effect |
| --- | --- |
| 背包没有触屏按钮 · No touch button for the backpack | 手机上打不开背包面板 · the backpack panel cannot be opened on a phone |
| 触屏只能轮流切枪 · Touch can only cycle weapons | 没有直接选第三把枪的按钮 · no button picks the third weapon directly |
| 同时只点亮最近的五盏灯 · Only the nearest five lamps are lit | 引擎每帧最多八盏点光源，远处的灯只有发光贴片没有照明 · the engine lights at most eight point lights a frame, so distant lamps glow without lighting anything |
| 传输提示可能压在终端屏幕上 · The transfer line can sit over the terminal screen | 站在终端正前方时两者重叠 · they overlap when standing right in front of the terminal |
| 杉树在阴影里偏黑 · Firs go nearly black in shade | 背光时层次看不清 · the tiers are hard to read against the light |
| 代打程序不搜物资箱 · The stand-in player never searches crates | 自动演示里看不到搜集和背包 · the automatic demo shows no looting or backpack |
| 阵亡后从头开始 · Death restarts the whole run | 没有检查点，第三处终端阵亡要重打三分钟 · no checkpoint, so dying at the third terminal costs three minutes |
| 扩容弹匣和前握把只作用于突击步枪 · Attachments fit only the assault rifle | 捡到即装，不能卸下或换到别的枪上 · fitted on pickup, cannot be removed or moved |

## 已经解决的问题 · Problems already solved

- 护甲条的查找会误中受击方向指示，带护甲中弹时界面报错。
- 加色混合的材质没有设为混合模式时会画成不透明方块（太阳光晕、枪口火光、红点）。
- 点光源超过八盏后多出的不生效，改为只点亮最近的几盏。
- 守卫在出生点就能发现干员，增加了未警觉时的视距上限。
- 新增的箱体挡住了守卫、增援入口或物资箱的位置，已挪开并由测试检查可达性。
- 枪在阴影里几乎纯黑，瞄具没有镜片。
- 敌人没有脸、手臂姿势固定。
- 树是单个圆锥，卡车是方盒子，大坝立面是一整块平面，远山是平面着色。
- 通过瞄准镜看时枪身挡住了视野。
- 一局不到一分钟就结束。

- The armour bar lookup could match a hit indicator instead, which raised an error when hit while wearing armour.
- Additive materials drew as opaque squares unless set to blend (sun halo, muzzle flash, red dot).
- Point lights beyond the eighth had no effect; only the nearest few are now lit.
- Guards could spot the operator at the starting point; unalerted guards now see a shorter distance.
- New boxes blocked a guard post, a reinforcement entry or a crate; they were moved and a test now checks they can be reached.
- The rifle was almost pure black in shade and its sight had no lens.
- Soldiers had no faces and their arms were fixed.
- Trees were single cones, trucks were boxes, the dam face was one flat plane and the hills were flat shaded.
- The rifle body blocked the view through the scope.
- A run was over in under a minute.

## 没做完的功能 · Unfinished features

搜集与背包 · Looting and backpack:

- 背包是等大的十二格，物品不占不同大小的格子，不能丢弃、整理或使用。
- 带出的物资只计总价值，没有仓库，也不能带进下一局。
- 物资箱只有一种，没有保险箱、电脑、尸体等其他可搜的容器，搜索时也不是逐件显示。

- The backpack is twelve equal slots; items do not take different amounts of room and cannot be dropped, sorted or used.
- What is carried out only adds to a total; there is no stash and nothing carries into the next run.
- There is one kind of crate, no safes, computers or bodies to search, and a search does not reveal items one by one.

武器 · Weapons:

- 只有三把枪，没有冲锋枪、霰弹枪、机枪。
- 配件只有两种，没有改装界面，没有消音器、不同倍率的瞄具。
- 没有近战、探身、翻越、趴下。
- 弹药不分种类和穿透等级，护甲也不分等级。

- Three guns only; no submachine gun, shotgun or machine gun.
- Two attachments only, no fitting screen, no suppressor and no choice of sights.
- No melee, leaning, vaulting or going prone.
- Ammunition has no types or penetration grades, and armour has no grades.

敌人 · Enemies:

- 没有小队配合：包抄和扔手雷是每个人各自决定的，不会一人压制一人绕后。
- 没有首领、狙击手、盾兵。
- 不会翻越、不会进出窗户，不会捡起同伴的武器。
- 喊话只有文字和一个提示音，没有语音。

- No squad play: flanking and grenades are each soldier's own decision, not one pinning while another goes round.
- No boss, sniper or shield bearer.
- They do not vault, use windows or pick up a fallen weapon.
- Callouts are text and a tone, not speech.

流程与界面 · Flow and interface:

- 只有一张地图、一个任务、一个撤离点、一个时间和天气。
- 没有难度选择、检查点、战前配装。
- 小地图没有放大的全图，不显示枪声方向。
- 没有手柄支持。

- One map, one mission, one way out, one time of day and weather.
- No difficulty choice, checkpoint or loadout before a run.
- The minimap has no full-size view and does not show where gunfire came from.
- No gamepad support.

## 模型细节 · Model detail

所有模型都由 `src/build.mjs` 的方块、圆柱、锥形肢体和椭球在代码里拼成，没有外部模型文件。

Every model is put together in code from the boxes, cylinders, tapered limbs and ellipsoids in `src/build.mjs`; there are no model files.

| 模型 · Model | 已有 · Has | 还粗的地方 · Still coarse |
| --- | --- | --- |
| 突击步枪 · Assault rifle | 机匣、八面护木与导轨、枪管、导气箍与消音器、带镜片的全息瞄具、战术灯、瞄准模块、前握把、带托腮的伸缩枪托、防滑握把、弧形弹匣；开火、换弹、落地、切枪动作 · receiver, eight-sided handguard with rails, barrel with gas block and suppressor, holographic sight with a lens, light, aiming module, foregrip, sliding stock with a cheek rest, ridged grip, curved magazine; firing, reload, landing and switching motion | 没有拉机柄动作和抛壳口细节，弹匣只是下落再装回，表面磨损靠一张通用金属贴图 · no charging handle motion or ejection port detail, the magazine only drops and returns, wear comes from one shared metal texture |
| 精确射手步枪 · Marksman rifle | 在步枪基础上换成更长更重的枪管，加装带镜环、调节旋钮和镀膜镜片的瞄准镜 · the rifle's base with a longer, heavier barrel and a telescopic sight on rings with turrets and coated lenses | 与突击步枪共用大部分零件，外形区别不大；镜内是界面遮罩，不是真实的镜片画面 · shares most parts with the assault rifle and looks similar; the scope view is an overlay, not a rendered lens |
| 手枪 · Pistol | 带防滑纹和抛壳口的套筒、照门准星、带导轨的握把座、扳机与护圈 · slide with serrations and an ejection port, sights, frame with a rail, trigger and guard | 套筒不后坐，没有空仓挂机 · the slide does not cycle and does not lock back when empty |
| 手与袖子 · Hands and sleeves | 五指手套、迷彩袖子、袖口、手表 · gloved fingers, camouflage sleeves, cuffs, a watch | 手指不随动作弯曲，换弹时左手不离开护木 · fingers do not move, and the left hand stays on the handguard during a reload |
| 敌人 · Soldiers | 头盔或绒线帽、风镜或护目镜、耳机与麦克风、脸（眼睛、瞳孔、鼻子、嘴）、防弹背心与弹匣袋、电台、腰带、背包、迷彩服、护肘护膝、靴子、枪；肩部关节带持枪、后坐、扭身；走、瞄、蹲、换弹姿态；布娃娃 · helmet or watch cap, goggles or glasses, headset with microphone, face (eyes, pupils, nose, mouth), plate carrier with magazine pouches, radio, belt kit, pack, camouflage, elbow and knee pads, boots, weapon; a shoulder joint for carrying, recoil and flinching; walking, aiming, kneeling and reloading poses; ragdoll | 肘和手腕不单独活动，没有骨骼蒙皮，三种兵只靠颜色和装备区分，没有死亡以外的受击倒地动作 · elbows and wrists do not move on their own, no skinned skeleton, the three kinds differ only in colour and gear, no knock-down short of death |
| 卡车 · Trucks | 驾驶室、篷布货厢与骨架、格栅、保险杠、后视镜、排气管、轮拱、尾板、挡泥板、车灯 · cab, canvas bed with hoops, grille, bumper, mirrors, exhaust, wheel arches, tailgate, mud flaps, lamps | 车窗不透明，没有内饰，轮胎没有花纹 · windows are opaque, no interior, tyres have no tread |
| 大坝 · Dam | 施工缝、加厚坝脚、三座闸房与钢索、检修楼梯、排水口、坝顶栏杆 · lift joints, a thicker foot, three gate houses with hoist ropes, a maintenance stair, drain outlets, a crest railing | 没有泄水的水流，立面仍是直壁，没有弧度 · no water coming through, and the face is still a straight wall with no curve |
| 树 · Trees | 六层枝叶的杉树、分叉树干加叶团的阔叶树 · firs in six tiers, broad-leaved trees with a forked trunk and leaf masses | 没有单片叶子和随风摆动，背光时偏黑 · no individual leaves or sway, and too dark against the light |
| 远山 · Hills | 一圈平滑着色的山体，顶点着色 · a ring of smooth-shaded hills with vertex colour | 没有贴图和植被，近看只有大色块 · no texture or vegetation, only broad patches of colour up close |
| 厂房与办公楼 · Powerhouse and office | 门窗、室内设备、标牌、喷字、灯具 · doors and windows, equipment inside, signs, stencils, lamps | 窗户没有玻璃反射，室内陈设较少 · no reflection in the glass, and little furniture |
| 直升机 · Helicopter | 机身、旋翼、尾桨、起落橇、舱门 · fuselage, rotor, tail rotor, skids, door | 机身由几个方块拼成，没有驾驶员，舱内是空的，登机没有动作 · the hull is a few boxes, with no pilot, an empty cabin and no boarding motion |

## 下一步建议 · Suggested next steps

1. 在真机上跑一遍，记录帧率，并把 WebGPU 后端跑通。
2. 找几个人各打三局，记录用时和阵亡位置，据此调整传输时长、增援人数和直升机到达时间。
3. 给触屏加上背包按钮和直接选枪的按钮。
4. 加一个检查点：每完成一处终端存一次进度。
5. 背包改成物品占不同大小的格子，并允许丢弃。

1. Run it on real hardware, record the frame rate, and get the WebGPU backend running.
2. Have a few people play three runs each, note the time taken and where they died, and tune the transfer length, the size of the reinforcements and the helicopter's arrival from that.
3. Add touch buttons for the backpack and for picking a weapon directly.
4. Add a checkpoint: save progress as each terminal finishes.
5. Give items different sizes in the backpack and allow dropping them.
