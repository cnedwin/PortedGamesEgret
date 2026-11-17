# 断流行动 · 现状与待办 · Operation Cutoff · Status and backlog

这份文档记录这一版的完成情况：已经解决的问题、还没有验证的部分、已知问题、没做完的功能，以及各个模型做到了什么程度。改动合入后请同步更新。

This document records where this version stands: problems already solved, parts not yet verified, known issues, unfinished features, and how far each model has been taken. Please keep it up to date as changes land.

## 这一版有什么 · What this version contains

| 方面 · Area | 内容 · Content |
| --- | --- |
| 流程 · Flow | 三处终端各有三段传输和两次链路校准，随后守到直升机抵达并登机；预计每局六到八分钟 · three upload stages and two relay checks at each terminal, followed by a helicopter extraction; allow six to eight minutes |
| 武器 · Weapons | 突击步枪、手枪、带瞄准镜的精确射手步枪、手雷；前握把和扩容弹匣两种配件 · assault rifle, pistol, scoped marksman rifle, grenades; two attachments, a foregrip and an extended magazine |
| 敌人 · Enemies | 步枪兵、突击兵、重装兵；会换弹、找掩体、包抄、扔手雷、喊话，中弹后变成布娃娃 · riflemen, assaulters, heavies; they reload, take cover, flank, throw grenades and call out, and go limp when shot |
| 搜集 · Looting | 十个物资箱，十二格背包，按稀有度分色，结算计总价值 · ten crates, a twelve-slot backpack, items coloured by rarity, total value at the debrief |
| 界面 · Interface | 指南针、目标列表、世界标记、小地图、背包面板、瞄准镜视野、受击方向、中英文切换、触屏按钮 · compass, objective list, world markers, minimap, backpack panel, scope view, hit direction, Chinese and English, touch buttons |
| 画面 · Picture | 三级级联阴影、投影探照灯、雨、湿地面镜面反射、掉漆锈蚀、贴花弹孔、景深、受伤调色、大气散射、泛光、环境光遮蔽 · three shadow cascades, shadow-casting floodlights, rain, mirror reflection on wet ground, chipped paint and rust, decal bullet marks, depth of field, hurt grading, atmospheric scattering, bloom, ambient occlusion |
| 声音 · Sound | 全部合成：枪声、脚步、环境循环、两种混响空间、随战况变化的配乐 · all synthesised: gunfire, footsteps, ambience loops, two reverb spaces, a score that follows the fight |

## 验证情况 · What has been verified

- 白鹭运行时固定为 main 的 `264e17227b06298858a06b9fdfe0c4a3a427e13a`。40 项自动测试覆盖规则、输入、模型挂点、共享实例及动态部件。无界面 seed 3 在 357 秒撤离。
- PC 使用 RTX 5090 Laptop 和 Edge 157，在 1440×900、高画质下从正常标题页开始，以实际键鼠事件完成三终端、六次校准和登机结算，用时 360.85 秒。模型首帧加载齐全，无回退。以下整局帧间隔是比例修订前的设备基线。最后一次手套比例微调另做了 PC 瞄准、射击、换弹、切枪和暂停恢复复测。
- 三星 SM-F966U1、Android 17 的 Chrome 真机在原生触屏视口 873×325 下，通过 CDP 触控事件从普通标题页进入并完成完整撤离，用时 384.22 秒，六次校准全部通过。23,164 帧平均约 60.31 FPS，P95/P99 为 16.7 毫秒，最大 33.2 毫秒。另用自动控制模式完成 356.73 秒整局。移动、转向与射击并发、触屏切枪、开镜、暂停恢复另有真机输入检查。
- 本轮 PC 整局 P95 为 4.3 毫秒，最大帧间隔 175.1 毫秒，有两次相邻长任务。缺少对应的性能追踪，原因未定。样本包含约 5.6 秒辅助计算并行，应保留该测量条件。
- 该 PC 的 ANGLE D3D11 阴影路径曾丢失 WebGL 上下文，目前仅对识别到的 RTX 5090 Laptop 适配器关闭实时阴影，SSAO、反射和后处理保留。三星高画质包含实时阴影。

The runtime is pinned to the Egret main commit recorded above. All 40 automated checks pass. The physical PC completed the mission with trusted keyboard/mouse input. The physical Samsung completed a 384.22-second mission using CDP-injected multitouch events from the normal title, plus a separate automatic rendered run. Both completed all three terminals and extraction. PC frame timing includes two unresolved long tasks and a brief interval of auxiliary computation. The adapter-specific PC shadow fallback preserves the other high-quality effects.

### 验收边界 · Test boundaries

- 本轮以 WebGL2 为主，WebGPU 尚待独立真机验收。
- PC 已验证页面全屏与鼠标锁定的状态及恢复。覆盖整块显示屏的原生窗口边界验收未完成。
- 自动输入与自动控制用于可复跑验收，真实玩家的难度和熟练度分布还需要玩家反馈。
- 音乐和声音沿用现有合成实现，本轮未做专门的人工听音验收。
- 角色使用刚性分件和已有动作关节。重装兵采用按自身肩位对齐的生成制服手臂，手指没有逐指骨骼动画。
- 地形、植被、地面、栏杆、标识和灯光等辅助元素沿用既有实现。

This batch focuses on WebGL2. Full-monitor native PC fullscreen, dedicated WebGPU qualification, human difficulty assessment and listening tests remain outside this acceptance pass. Characters use rigid animated sections. The heavy uses generated uniform arm sections aligned to its own shoulders. Terrain, foliage, ground, rails, signs and lighting retain their existing implementation.

## 已知问题 · Known issues

| 问题 · Issue | 影响 · Effect |
| --- | --- |
| 同时只点亮最近的五盏灯 · Only the nearest five lamps are lit | 引擎每帧最多八盏点光源，远处的灯只有发光贴片没有照明 · the engine lights at most eight point lights a frame, so distant lamps glow without lighting anything |
| 杉树在阴影里偏黑 · Firs go nearly black in shade | 背光时层次看不清 · the tiers are hard to read against the light |
| 代打程序不搜物资箱 · The stand-in player never searches crates | 自动演示里看不到搜集和背包 · the automatic demo shows no looting or backpack |
| 阵亡后从头开始 · Death restarts the whole run | 当前没有任务检查点 · the mission currently has no checkpoints |
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

这一版把 Tripo 的角色、枪械外观和场景模型收在 `assets/models/`。清单把 GLB 绑到原有游戏挂点，原地图的行走、碰撞和交互使用现有数据。

This version stores the Tripo character, weapon and scenery models in `assets/models/`. The manifest attaches them to the existing game pivots. Traversal, collision and interaction use the original level data.

| 模型 · Model | 游戏内表现 · In game |
| --- | --- |
| 三类敌人 · Three enemy types | 头、躯干和四肢沿用原有行走、瞄准、蹲伏及布娃娃关节 · head, torso and limbs use the existing locomotion, aim, crouch and ragdoll joints |
| 三件第一人称装备 · Three first-person weapon visuals | 独立外形，沿用瞄准、开火、换弹、切换和光学遮罩 · separate silhouettes with the existing aim, fire, reload and switch animations and scope overlay |
| 场景模型 · Station assets | 原有门洞、可行走地面、流水、实时灯光和交互挂点承载新外观 · new art fitted around existing passages, walkable floors, water, live lights and interaction anchors |
| 撤离直升机 · Extraction helicopter | 贴图机身沿用游戏控制的主旋翼、尾桨和降落路径 · textured hull with game-driven main and tail rotors and landing path |

## 下一步建议 · Suggested next steps

1. 对 WebGPU 后端做单独的真机验收。
2. 找几个人各打三局，记录用时和阵亡位置，据此调整传输时长、增援人数和直升机到达时间。
3. 加一个检查点：每完成一处终端存一次进度。
4. 背包改成物品占不同大小的格子，并允许丢弃。

1. Run a dedicated device test for the WebGPU backend.
2. Have a few people play three runs each, note the time taken and where they died, and tune the transfer length, the size of the reinforcements and the helicopter's arrival from that.
3. Add a checkpoint: save progress as each terminal finishes.
4. Give items different sizes in the backpack and allow dropping them.
