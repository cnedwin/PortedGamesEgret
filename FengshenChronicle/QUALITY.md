# 验收记录 · Quality

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
