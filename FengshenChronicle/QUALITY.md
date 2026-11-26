# 验收记录 · Quality


## 2026-11-26 · 最新引擎、原生 RPG 界面与清晰度 / Latest engine, RPG views and visual density

- **版本 / Version:** Egret main `8e70dcb3a8a0b40c9966483c92cb9f691a1cefd8`，官方 vendor-game 生成并逐文件校对。引擎原生 image 队列、命名焦点与旋转触控滚动；移除语义焦点查找，动态列表与滚动状态保留。规则、伤害、数值、存档、美术和原截图基线均未修改。 · Official engine copy, native image queue, named focus and rotated scrolling. Rules, saves, art and approved references are unchanged.
- **自动 / Automated:** 当前最终版本 Node 54/54，桌面 Chromium 浏览器 17/17（真实延迟素材的可见加载进度、禁用开始、失败重试、画布物理像素、页签及交易）；标题截图差异 0.24%，西岐城 1.38%，原基线阈值内。引擎定向 Node 42/42、原生 view 浏览器 3/3。项目严格规范通过；独立从主干真实文件构建的展示站校验 24 案例、72 WebP 全过。 · All final automated checks passed without rewriting the baselines.
- **原生 UI 完整首章 / Natural chapter & commerce:** 在视觉密度增量前，实际 PC Edge 158 与 Fold7 Chrome 157 WebGL2 从新档领取姜尚任务，古道实际击败六敌与首领、取得玉符，回城交易、出售、购买两件材料、合成 fine-ranger-1 及保存刷新。PC/手机分别正常结算至游侠 Lv3、攻击 37，真机冷行囊八种独立图标均像素匹配，首次可操作观测上界 PC 153.6 ms / Fold7 139.3 ms。两机古道与首领各 90 rAF，PC p95 4.3 ms、最大 4.5，手机 p95/max 16.7 ms，无 >50 ms 间隔。 · Real input and natural drops/resources; no gameplay fixture was used as a chapter completion.
- **最终加载 / Final startup:** 标题自 HTML 显示进度，按实际原画读取、六页图集及地图纹理完成更新，不以计时器模拟。Fold7 实际冷启动 73 个可见状态，约 25.7 ms 第一次显示、2466.9 ms 就绪，98% 时开始仍禁用。PC 人为延迟一份实际资源 1200 ms 的诊断亦验证 98% 仍禁用、4752.8 ms 真正就绪；该时间不是正常网络启动速度。拒绝素材的自动回归中有可用重试，重新加载可正常开局。 · Real work progress, failure recovery and readiness gating; the delayed-PC measurement is not a natural startup benchmark.
- **最终中文与触屏 / Final Chinese text & touch:** 原生 UI 与地图逻辑尺寸独立于实际显示密度。Fold7 竖屏商店旧/新同构截图的正文笔画明显改善。真实 Android 方向切换 4 次、6 次列表滚动、选配方及判定禁用合成通过，未移动网页、未误交易；PC 原生控件及键盘回归通过。保留已选材料的文字、开关和实际触控目标。 · Same-layout hardware screenshots show sharper Chinese body copy. Physical rotation, scrolling and recipe selection remain usable.
- **最终战场 / Final map backing:** PC 1440×850 CSS、DPR1 由旧约 915×540 提升至 1441×850，实际古道键盘移动 408 帧 p95/max 4.3 ms，>50 ms 0。Fold7 竖屏画布由旧 878×1740 增至 1079×2137，横屏原有 2902×1080 不降低；实际古道触控移动 103 帧 p95/max 16.7 ms，>50 ms 0。两设备静止与移动均有实拍，分辨率恒定，真实受敌攻击，错误/警告/资源失败均零。 · Backing dimensions remain fixed through real movement. These are sampled browser rAF intervals, not direct GPU execution time. A short sample cannot prove that residual motion-only blur never occurs in all scenes.
- **覆盖限制 / Limits:** 最终视觉补丁采用针对性真机回归而非重复整章；未覆盖第四章自然通关、Safari、物理手柄或长时间高密度压测。引擎能力反馈见第 4、5 条笔记。 · Final visual changes were retested on hardware; the complete earlier chapter route and targeted final tests are distinguished.


2026-11-22 · Egret v7.0.2 · WebGL2

| 真机 · Device | 浏览器 · Browser | 验收输入 · Input |
|---|---|---|
| Windows PC，舞台 1600 × 900 CSS px | Edge 158.0.4370.33 | 前台浏览器键盘和鼠标 · Foreground keyboard and mouse |
| Samsung Galaxy Z Fold7（SM-F966U1），Android 17，横屏 873 × 325 CSS px | Chrome 157.0.8103.78 | 真机浏览器触控事件 · Touch input on the physical handset |

两台设备均从隔离的新存档走完正常流程。玄甲在西岐城走近姜尚接任务，在岐山古道击败六名邪祟。首次掉落「岐山破邪剑」，装备后攻击由 17 升至 26，剑刃有独立外观。首领预警可见，乾坤圈去程、回程分别对首领造成 30、18 点伤害。拾取镇邪印、回城复命后暂停保存，实际刷新并点继续，保留任务、装备和背包。全程通过键鼠或触屏操作，诊断接口仅供读取。两端已核对同一份运行文件，页面异常及失败资源请求均为零。

Both devices completed the same fresh-save route through Jiang Shang's quest, six enemies, earned loot and equipment, the ring's outward and return hits on the boss, the seal, and quest completion. Pause froze play. A real page reload and Continue retained the quest, gear and bag. The two runs used matching runtime file hashes and recorded no page exceptions or failed requests.

## 修改与复测 · Fixes and retest

- 首轮试玩中目标未出现在画面时难找。任务栏增加「寻路」，两端均用它找姜尚并出城。
- Fold7 横屏中，外层 CSS 和白鹭同时居中使画布偏移。用白鹭统一计算位置，舞台宽度随视口设置。复测横向填充 100%，中心误差小于 0.01 CSS px。横屏任务描述默认折叠，真机点按展开和收起均通过。
- 场景资源释放后重复调用更新会访问已释放节点。增加生命周期守卫，独立关闭测试通过。首屏浏览器图标请求也已补齐。

## 帧间隔 · Frame intervals

每段 90 个浏览器 rAF 间隔。入口指首次进入古道后，战斗后指击败首领后的采样。数据为短时浏览器帧节奏，未包含整场呈现或 GPU 耗时追踪。

Each row uses 90 browser rAF intervals per window. These are short cadence samples near trail entry and after the boss, with no whole-session or GPU timing claim.

| 设备 · Device | 古道入口 p95／最大 · Trail entry | 首领后 p95／最大 · After boss | 两段 >50 ms |
|---|---:|---:|---:|
| PC | 4.3 / 4.9 ms | 4.2 / 4.3 ms | 0 |
| Fold7 | 16.7 / 16.7 ms | 16.7 / 16.7 ms | 0 |

## 复跑 · Reproduction

1. 从静态网页打开本目录，选空存档，点「初入西岐」。点「寻路」，靠近后与姜尚交谈，再去古道出口。
2. 正常击倒六名邪祟，拾取破邪剑并在行囊装备。选中蚀甲邪将，施展乾坤圈并留意预警。收起镇邪印后回城复命。
3. 暂停并保存，返回标题，刷新并继续。检查任务完成、装备及背包。
4. 用 `node --test FengshenChronicle/test/*.test.mjs` 运行 14 项规则及存档检查。桌面浏览器烟测在 `test/accept.mjs`，两张对照图在 `test/baseline/`。真机验收用本地静态预览，GitHub Pages 公开部署、Fold7 竖屏整章、WebGPU 和更广设备覆盖不在本次结果内。

## 运行文件 · Runtime identity

PC 与 Fold7 运行文件清单摘要（SHA-256）：`3d483b57453089c044a7f77bad019c3905373d7ce06e248adee2996a6e16baec`。截图保存与帧采样均为实际设备输出。

## 公开首章与美术重做 · Public chapter and art revision

首次公开版 `97f3b3f` 在 PC、Fold7 横屏和真实竖屏均跑完首章并刷新续档。竖屏为原生 1080 × 2520，Chrome 视口 411 × 813 CSS px。复测发现拾取按钮出现时，原有归营按钮会移动。新布局为两者保留独立位置。

The first public revision passed the full route and reload on PC and the Fold7 in physical landscape and portrait. A newly available pickup could shift the return control. The updated layout assigns the two buttons fixed rows.

美术版的场景、角色、装备、动作与特效使用本地贴图。角色与特效分两张白鹭图集，符合单纹理 4,194,304 像素上限。路线、战斗计算与存档代码均为同一版本。PC 本机静态预览复跑整章和读档，操作和装备数值符合首章基线。

The art revision divides illustrations and effects between two Egret atlases within the engine's per-image pixel limit. Rules and save code match the first public revision. The full local PC route and reload passed on the new art.

视听资源含 3 段独立循环配乐和 16 个事件音效。全部 19 个文件经过完整解码、样本长度和峰值检查，来源及量测见 [音频清单](assets/audio/SOURCES.json)。镜头脉冲由命中触发，峰值位移上限为 9 个舞台像素。震屏的投影与输入使用同一组偏移，减弱动态模式与暂停时停止震动。

Three looped themes and sixteen cues were decoded and checked for length and peaks. Camera shake comes from hit events, uses the same offset for rendering and picking, and is capped at nine stage pixels. Reduced-motion mode and pause suppress the shake.

进一步修整玄甲步态。常服与鳞衣采用前后各四个独立行走姿态，左右脚交替落地，以实际位移推进步态。两套装甲与其他人物、特效分成三张图集，保留画质并符合单张纹理容量。停步回站姿，转向和换装时持刀贴光仍跟随刀刃。32 张原生姿态检查覆盖四种装备组合、两个视角和四个行走相位。

Xuanjia's gait now uses four grounded phases per view. Actual displacement advances the animation, and each pose carries its own blade-glow anchor. Three texture atlases separate the two armor sets and the other actors and effects. Native pose checks covered all 32 combinations of gear, view and gait phase.

## 扩章数值 · Expansion balance

| 项目 | 验证值 |
|---|---|
| 玄甲开局 | 攻击 17，气血 100，24 文，回春散 5 份 |
| 古道与铜关军功 | 分别 100、160 文，各只领一次 |
| 药铺 | 回春散 12 文一份，32 文三份，单份回复 45 气血 |
| 铜关阵主 | 760 气血、28 基础攻击，具有突进、横风和范围砸击 |
| 怒气 | 造成伤害 ×0.25 + 每次命中 2；受伤 ×0.8 + 3；100 怒释放，0.42 秒蓄力 |

25 项规则及存档测试包含普通动作全路线。低配与高配近战实打伤害为 17 和 41，均实战击败阵主。重复演武重生敌军和战利品，主支线奖赏不重复；三店同品买回价高于回收价，购买、出售与金币变化逐项断言。

扩章浏览器验收使用同一份运行文件。Windows PC（Edge 158）以键鼠完成两章、两支线交付、买靴卖旧剑、五部位装备、法宝卸下和更换、怒技、演武旧营以及实际刷新续档。Fold7（Android 17、Chrome 157，真实竖屏 411 × 813 CSS px）以触屏完成古道首章、两支线、买卖、五部位换装、怒技与乾坤圈装卸和刷新续档。铜关完整通关及旧营新系统以 PC 和规则测试结果为准。手机旋转、原标签与设备设置已恢复。

Both browsers used matching runtime files. PC completed the expanded campaign through Bronze Pass and the repeatable camp. The physical Fold7 in portrait completed the first chapter, both side quests, shopping, five equipment slots, rage, artifact equip and removal, and a true reload. Bronze Pass and the camp were covered by PC and rules tests.

## 四章与三职业数值 · Four chapters and three professions

| 开局数值 | 玄甲 | 方士 | 游侠 |
|---|---:|---:|---:|
| 气血 | 100 | 91 | 83 |
| 攻击力（含初始武器） | 17 | 20 | 19 |
| 普攻间隔（秒） | 0.48 | 0.90 | 0.60 |
| 普攻距离（地图单位） | 88 | 252 | 232 |
| 基础移速 | 185 | 183 | 205 |
| X 技能冷却（秒） | 7 | 8 | 6 |

玄甲基础普攻约 35.4 点／秒，方士约 22.2 点／秒，游侠约 31.7 点／秒。计算为初装攻击除以普攻间隔，未扣防御，也未计走位和职业技。玄甲以气血、减伤和近战单体输出换取较短攻击距离。方士的迟滞符阵用于聚怪，游侠靠穿透箭和移动保持输出。丹霞断潮君与朝歌镇门将基础气血分别为 1,180 和 1,660，半血后二阶段预警缩短约 12%，安全区仍沿用实际碰撞判定。

用同一固定种子从新档经正常战斗、任务和锻造取得装备。三职业在约 6 级打丹霞，约 8 级打朝歌，均对满血首领接战。下表是规则回放中的显式接战耗时，包含追敌和主动避让。三种职业都通过两战，覆盖了首领的各三种招式。这条避让路线每场无需额外喝药。

| 首领 | 玄甲 | 方士 | 游侠 |
|---|---:|---:|---:|
| 丹霞断潮君 | 11.77 秒 | 16.75 秒 | 10.23 秒 |
| 朝歌镇门将 | 13.63 秒 | 15.05 秒 | 21.40 秒 |

初测时游侠约 4 秒就能击败丹霞首领。后续让同一箭幕的多支箭对同目标伤害依次衰减，分摊符阵多段命中，并调低远程怒技的单体爆发。玄甲可在潮环内继续贴身，游侠保持点杀优势，方士保留最广的群攻区域。不同攻击形状产生不同的优势场合，表内时间会随装备和走位变化。

| 成长节点 | 等级／成本 | 设计用途 |
|---|---|---|
| 基础行装和补给 | 4、8、12 级 | 用铜钱兜住基础战力，8 级增加 65 气血的回春丹 |
| 精锻／重锻／百炼 | 3／7／11 级 | 分别消耗 2／2／3 件同部位基础装、2／3／5 甲片、44／86／135 文，增加 1／1／2 条有上限的随机词条 |
| 稀有装备 | 普通敌人至精英、首领 | 用区域和敌种调整概率；初次任务固定战利品提供可预期的装备成长 |
| 传说装备 | 朝歌镇门将 | 单次掉落表概率 9%，四章通关无需传说装 |

以固定随机序列各抽 20,000 次，普通敌人掉落稀有装备的比例在古道、丹霞渡、朝歌外城分别为 2.83%、5.92%、8.63%，朝歌精英为 30.11%。朝歌镇门将抽样为稀有 46.73%、史诗 31.65%、传说 8.92%。这些是纯规则抽样，不含固定任务道具，也不代表整场实机掉落统计。掉落和锻造共用一条随机序列，序列与物品一起保存，刷新不会重新掷已经完成的结果。

图集与场景纹理在标题阶段分批准备。相同 Windows PC、1280 × 720、无头 Edge SwiftShader、各三次新上下文对照，分批前后最长主线程任务中位数约 4.79 秒与 1.32 秒，标题可操作时间约 5.30 秒与 5.44 秒。#161 标题可操作时间约 3.57 秒。新版增加约 3.3 MB 启动传输，这组数据衡量首屏工作量和阻塞分布，不用于推断手机 GPU 开销。

### 集中实机验收 · Device acceptance

2026-11-22，Windows PC Edge 158 与三星 Galaxy Z Fold7 Chrome 157 使用同一份原生 WebGL2 候选版本。两端文件哈希一致，实际交付的资源全部匹配，无页面异常或资源请求失败。诊断只读取状态和坐标，移动、对话、战斗、交易和存档均由浏览器的键鼠或真机触屏输入完成。

- PC 以方士从新档完成四章及四条支线。丹霞潮环和朝歌十字火线均自然触发，观察到两位首领的第二阶段、打断与迟发爆点。实际合成带「攻击 +3」的镇纹桃木杖，Lv.9 购入门槛为 Lv.8 的回春丹。实际刷新续玩后保留四章进度、装备词条、1 枚回春丹和 1,355 文。
- Fold7 真实竖屏，Chrome 视口 411 × 813 CSS px。游侠打完首章和两条早期支线，触屏使用 X、Q、R、交易并合成带「攻击 +3」的精筋追影弓。实际刷新续玩保留 Lv.4、146 文和装备。手机原标签与系统设置已恢复。
- 另取上一版正常游玩所得旧档状态复核迁移。玄甲装备、铜关进度和演武场状态保留，丹霞任务可接。40 项规则测试全部通过，三职业另用三个独立种子回放四章共 9 条路线。

| 短时战斗取样 | 每窗 rAF 间隔 | p95 | 最大 | 超过 50 ms |
|---|---:|---:|---:|---:|
| PC，四图常规战与首领战，共八窗 | 90 | 4.3 ms | 8.7 ms | 0 |
| Fold7，古道常规战与首领战，共两窗 | 90 | 16.6–16.7 ms | 16.7 ms | 0 |

这组数值是前台浏览器帧回调间隔。最终 PC 取样在手机验收结束后完成，手机取样时主机还在跑前一轮 PC 流程。这些短窗不用于推断 GPU 提交耗时或整局渲染帧率。手机完整流程覆盖首章，铜关、丹霞和朝歌的通关结果来自 PC 与正常动作回放。回春丹的实际操作覆盖购买和存读档，自动选药与回复值由规则测试验证。

## 后三章首领预警复测 · Late campaign warnings

以公开版 `1475123` 为基线。朝歌镇门将的旧十字红区以平头结束，实际判定是两条末端带圆帽的火线。新版红色填充、屋檐上的细描边和蓄力进度沿用同一条圆头十字边界。红区沿轴线伸至离首领 347 地图单位的位置，半径为 18 的角色脚下碰撞圈需整圈离开。伤害、判定、预警时长和冷却沿用原规则。

窄竖屏进入丹霞、朝歌首领的警戒范围后，右上任务栏收紧一行，寻路和详情仍可点。视口 411 × 813 CSS px 的独立布局检查中，任务栏由约 159 px 降到 54 px，高度包含边框。朝歌提示明确引导往斜角空地走，任何离开两道火线的斜角均可避让。

Windows PC Edge 158 从相同的实玩朝歌战前检查点对照旧版和候选。两张截图的主角位置差小于 0.001 地图单位，候选可见圆头和沿轮廓的蓄力进度。实际鼠标斜向移动避开该次十字并正常击败首领。候选还验证了方士攻击随穿脱变化 84 → 35 → 84、回春丹指定消耗、等级锁定、锻造随机词条和实际刷新续档。

三星 Galaxy Z Fold7 Chrome 157 真实竖屏，从公开版首章完成的实玩游侠存档接着打完铜关、丹霞渡与朝歌外城，并刷新到四章完成的 Lv.9 存档。过程覆盖新版行囊穿脱、受伤后指定用药、实际购买解锁的回春丹及锻造。精锻追影弓随机获得「攻击 +3」，消耗所选两件装备、44 文和 2 片甲片。丹霞旧版取样中，外环超出两侧视口，青色内圈清楚可见。随后的截图和读取延迟了摇杆输入，两次尝试均未在招式命中前离开红区。朝歌用真实触控斜离横臂，两次十字均无受伤。

修正版在同一台 Fold7 竖屏读取实战检查点。首领战任务栏实测由 162.15 px 降到 53.52 px。丹霞内圈用实际摇杆进入，开始方向输入时预警剩余约 0.62 秒，该次未受伤。外撤一例在剩约 0.78 秒时开始，到选定外缘点需走约 279 地图单位，结算仍处在红区并受到 21 点伤害。外环在竖屏仍会超出画面，在这次河岸站位，进内圈更直接。

朝歌另从同一份原样战前档分别取预警画面与走位结果。真机画面可辨认左端圆头、青圈和压缩后的任务栏。第二次先用摇杆斜向离开横臂，该次十字结算无受伤。手机的浏览器标签、旋转和常亮设置已恢复。

## 丹霞渡河岸撤离 · Danxia riverbank retreat

以公开版 `787078b` 为基线。Windows Edge 和三星 Fold7 Chrome 分别用上一轮实机保存的同一丹霞战前档，角色起点为约 (1087.54, 512.63)，以首发潮环复跑。Fold7 的 411 × 813 CSS px 竖屏里，外圈左右约投影到 x = −80 和 x = 488，完整外圈超出了画面。从此站位直往下会被河道挡住。

窄竖屏的提示在角色附近画撤离箭头，并在可走地面标出安全落点。指引沿用游戏的地形检查，并按剩余时间和移速筛方向。此站位的落点为左下桥头约 (932.32, 629.62)，标记在屏内。外撤来不及时，已有可走内圈路线可以提示。镜头、潮环判定、伤害及两阶段预警时长沿用原规则。

PC 候选在同一站位进入内圈和退外缘，气血均为 116 → 116。原地对照在旧版与候选均为 116 → 95，实受 21 点伤害，宽屏的 16 个外缘投影点保持一致。

Fold7 候选的内圈测试用真实触控摇杆，方向输入送达时距结算约 0.817 秒，气血 116 → 116。同站位原地承受潮环仍为 21 点。另一次外撤的方向输入到达时只剩约 0.750 秒，该次受 21 点伤害，此时屏内指引已切换为进内圈。

Fold7 另从同一个战前档和站位重跑，首发预警总长为 1.35 秒。在剩 1.15 秒时用摇杆沿屏内箭头向左下外撤，气血 116 → 116，无受击事件。测试后的设备与浏览器设置顺利恢复。

## 原生行囊、商店与铁匠铺 · Native inventory, shop and forge

2026-11-26。Demo 基线为 `b0e1fba2`，引擎主干副本为 `a7be833b`。游戏规则、存档读写和资源文件与基线逐字节一致。 · Demo baseline `b0e1fba2`, refreshed to Egret `a7be833b`. Simulation, save code and art assets match the original files.

- PC 实机 · Windows Edge 158.0.4370.33，WebGL2，1440 × 850 CSS px。新档游侠从首章开场打到古道首领并拾取镇邪印。用原生行囊换装、查看属性、核对药品数量，回城买卖并合成精筋追影弓。用 Tab 和 Shift+Tab 改页签，Esc 关行囊，面板内战斗计时静止。锻造实扣 44 文、2 片甲片和选中的两件装备，得到「移速 +5」。实际刷新后保留 125 文和新武器。控制台与失败请求均为零。 · Fresh Ranger run on physical Windows PC, keyboard and mouse in Edge WebGL2. It completed the boss, gear, shop, forge and real reload. The forge charged 44 coins and two scraps and consumed both selected gear pieces, then rolled movement speed +5. No console or request errors.
- Fold7 实机 · Android 17、Chrome 157.0.8103.78、WebGL2，横屏 873 × 325 CSS px。游侠从新档打到古道首领，拾取镇邪印、回西岐复命、执行原生换装和药铺购买。装备首领掉落后攻击 33 → 37。战斗短采样两窗各 90 帧，P95 均为 16.7 ms，最高为 49.6 ms。 · The physical Fold7 completed the opening, boss, loot, town hand-in, native gear and medicine purchase. The boss drop raised attack from 33 to 37. Two 90-frame samples had a 16.7 ms P95 and a 49.6 ms maximum.
- 设备占用 · Fold7 后续商店出售、实际锻造和刷新续档待真机确认。同一运行文件在 873 × 325 的触屏模拟内跑通完整流程，也从本次 Fold7 实玩所得进度单独跑通剩余步骤。 · The Fold7 became unavailable before selling, crafting and reloading on device. Touch emulation passed both the full route and a separate continuation from the state earned on the real phone.
- 旧档 · 同一 PC 读取旧发行版 `1475123a` 的实际游玩存档并打开原生行囊，保留游侠 Lv.4、146 文与原武器。 · A genuine earlier-version save loaded and retained the Ranger, level, coins and weapon.
- 窄屏压力检查 · 411 × 813 的 Chromium 触屏模拟从独立测试存档载入 30 件装备，滚动至末行、切换页签和关闭均成功，控制台与资源请求零错误。 · A separate 411 × 813 Chromium touch emulation with 30 seeded items reached the last row, switched tabs and closed without errors.
- 自动回归 · 50 项 Node 测试通过，桌面浏览器回归 13 项通过，原截图基线沿用。测试查询原生控件坐标，经实际浏览器输入走了页签、换装、属性对比、滚动、出售限制、商店购买、锻造配方限制和续档。 · 50 Node and 13 browser checks passed, with the existing screenshot baselines. The browser tests use actual control input.

## 原生装备图片冷加载 · Native equipment image cold load

引擎 [PR #482](https://github.com/cnedwin/Egret_rebuild/pull/482) 合入主干 `5d7a0a92a7fcecba8a857a0d8c901272995f6fd4`。游戏使用官方工具重新复制引擎，拆除原生行囊面板的临时分批预热代码。原本装备图片的显示、游戏规则、存档及美术资产保留。 · Refreshed the game to the merged engine commit and removed its temporary native equipment image warm-up. Equipment art, simulation and save code are preserved.

- 主干引擎 · Merged engine: Chromium 157 软件 WebGL2 的三个 Play UI 浏览器用例全部通过。六张冷 WebP 全部挂载，读取并发峰值为四，关闭视图的未开始请求被跳过，真实 404 错误正常上报。 · All three Play UI browser cases passed on the merged commit. Six cold WebP images attached, peak reads were four, a closed view's queued read was skipped, and a genuine 404 remained visible.
- 游戏自动回归 · Demo regression: 50 项 Node 测试、13 项桌面浏览器检查及严格项目标准全部通过。标题和西岐城与原截图基线差异分别为 0.24% 和 0.91%，无需更换基线。测试先走新档开场、接受姜尚任务和使用法宝，再首次开启行囊、卸下和重新装备武器，核对攻击属性变化，继续验证商店、锻造入口与存读档。 · All 50 Node tests and 13 browser checks passed; title and city changed 0.24% and 0.91% respectively against the untouched reference images. The browser used actual controls to open the first bag, unequip and equip the weapon, check attack, shop, forge gating and reload.
- PC 与 Fold7 实机 · Physical devices: Windows Edge 158（1440 × 850）与 Galaxy Z Fold7、Android 17、Chrome 157（横屏 873 × 325）均使用同一个旧发行版实际游玩存档，独立新页面加载游戏并禁用该页 HTTP 缓存。首次点击行囊后每台设备都完成八种图标的独立 HTTP 200 读取，无缓存命中，网络读取重叠峰值四。逐项滚动至可见区拍摄，八种图标均通过原资源像素匹配。地图美术启动时也会请求部分相同 URL，因此这里的“冷”指首次原生面板纹理加载。 · Both devices reopened a real earlier-version save in a new document with the HTTP cache disabled. The first bag requested eight unique gear images (HTTP 200, not cached), peaked at four overlapping transfers, and all eight matched the original art in screenshots. The field artwork path may request those URLs during startup, so this is a cold native panel load.
- 首开与换装 · First opening and equipment: 从点击行囊到观察到可用的控件，旧版 PC 上限观测 585.7 ms，新版 PC 149.3 ms，Fold7 135.5 ms。该对照使用相同存档、相同 PC 浏览器，只是单次配对观测，计时不代表全部图标绘制结束。两台设备的攻击值均从 41 卸装至 13、穿回恢复 41、换另一件武器后变为 39，常规保存及实际刷新续档仍为 39。控制台错误、警告及请求失败均为零。 · The observed upper bound from the trusted click to actionable controls was 585.7 ms on the previous PC build, 149.3 ms on the updated PC and 135.5 ms on the Fold7. This is one matched PC pair, not complete icon rendering time. Both devices recorded the attack sequence 41 → 13 → 41 → 39, and normal save/reload preserved 39. There were no console errors, warnings or failed requests.
