# 封神 · 西岐战纪 · Fengshen Chronicle

## 简介 · Introduction

基于新白鹭引擎的原创封神题材单机动作 RPG。玄甲、方士和游侠从西岐启程，走过「古道除祟」「铜关回风」「丹霞渡」「朝歌外城」四章。沿途采药、回收旧甲、寻回受困舟人和拆除烽阵，每条支线可选不同的报酬。铜关、丹霞渡、朝歌外城和演武旧营可反复挑战。进度保存在当前浏览器的三个存档位。[新白鹭引擎](https://github.com/cnedwin/Egret_rebuild)

An original single-player action RPG built with Egret Rebuild. Play as a Vanguard, Ritualist, or Ranger through the Qishan Trail, Bronze Pass, Danxia Ford, and Chaoge's outer city. Side quests follow missing ferrymen and siege beacons alongside herb gathering and armored salvage. Three saves live in the current browser.

角色和装备采用原创生成插画。西岐以暖色灯火为主，丹霞渡以赤岩和青水区分地形，朝歌外城用深色城墙衬托火线。角色姿态、刀光、受击、首领预警和乾坤圈往返均在原生 2D 显示树中表现。[首两章素材清单](assets/world/SOURCES.json) · [新场景与职业素材清单](assets/world/CAMPAIGN_SOURCES.json)

Original generated illustrations depict the cast and equipment. Amber stone, timber, and lanterns distinguish Xiqi from the blue-green cliffs and bronze ruins of the trail. Character poses, attacks, strikes, telegraphs, and the returning ring run on Egret's native 2D display list.

[打开网页试玩](https://cnedwin.github.io/PortedGamesEgret/FengshenChronicle/)。设备和版本记录见 [验收记录](QUALITY.md)。

## 玩法与操作 · How to play

新档先选职业，再向姜尚领取任务与乾坤圈。消灭六名邪祟会逼出古道深处的蚀甲邪将。首次击杀必掉当前职业可用的武器，拾取后在行囊中装备。首领倒下后拾取镇邪印，回城向姜尚复命。丹霞断潮君的潮环可以向内躲，也可以跑出外圈。朝歌镇门将的火线与延迟落点须分开躲，集中输出可以打断号令。

Choose a class, speak with Jiang Shang, and take the ring. Six banishments reveal the general, whose first defeat awards a weapon for your class. Collect the seal and return to Jiang Shang. At Danxia, move inside or outside the tide ring. At Chaoge, avoid the crossfire and delayed blasts separately, and concentrate damage to interrupt orders.

| 操作 · Action | 键鼠 · Keyboard and mouse | 触屏 · Touch |
|---|---|---|
| 移动 · Move | WASD、方向键，或点击地面寻路 · keys or click the ground | 左侧摇杆，或点地面 · stick or tap the ground |
| 任务引导 · Quest route | 点「寻路」，靠近后交谈或传送 · Route, then interact when close | 同左 · same |
| 接战 · Engage | 点击敌人追击与普攻 · click an enemy | 点敌人 · tap an enemy |
| 攻击 · Attack | 空格或「攻击」· Space or Attack | 「攻击」· Attack |
| 法宝 · Artifact | Q 或「乾坤圈」· Q or Universe Ring | 「乾坤圈」· Universe Ring |
| 职业技能 · Class skill | X 或职业技能键 · X or the named skill | 「玄甲震阵」「缚雷符阵」或「追星穿云」|
| 怒技 · Rage | R 或「怒技」· R or Rage | 「怒技」· Rage |
| 回血 · Heal | 1 或「回春散」· 1 or Healing Powder | 「回春散」· Healing Powder |
| 交谈、传送、拾取 · Interact and collect | 走近后点对应按钮 · use the nearby action | 对应按钮 · nearby action |
| 行囊 · Bag | B 或「行囊」· B or Bag | 点「行囊」· Tap Bag |
| 暂停与存档 · Pause and save | Esc 或「暂停」· Esc or Pause | 「暂停」· Pause |

行囊分为「装备」「属性」「道具」。点武器、副手、护甲、战靴、戒印或主动法宝栏筛选同部位物品，穿戴前可看属性差值。「属性」展示基础能力与装备加成，「道具」可以指定使用回春散或回春丹，也能查看材料和任务物品。乾坤圈五秒冷却，回风幡有三次近身脉冲与短暂护体，八秒冷却。造成伤害及受击累积怒气，满怒可用有短前摇的范围怒技。按 J 打开札记可切换追踪主任务或支线。

药铺每十二文出售一份回春散，8 级可买恢复 65 气血的回春丹。用药键优先选够用的较小剂量，缺口超过所有持有的规格时使用效果最强的一种。铁铺卖基础兵器和护具，杂货商卖基础战靴与戒环。三家店在 4、8、12 级逐级开放货品。稀有、史诗、传说装备来自战斗，部分装备是剧情固定奖励。铁铺在 3、7、11 级开放精锻、重锻和百炼，以同部位未装备的基础装备、甲片和铜钱合成带随机词条的装备。回城恢复气血并至少补给到三份回春散。力竭回城保留已拾装备与任务进度。

Vendors unlock higher tiers of basic stock at levels 4, 8, and 12. Rare, epic, and legendary items drop in battle, with selected fixed story rewards. At levels 3, 7, and 11, the smith combines unequipped basic gear for the same slot, scrap and coins into gear with random bonuses. Returning to town heals you and tops up healing powder to at least three.

暂停菜单可独立调整配乐和音效，或一键静音。城镇、古道和首领战使用各自的原创曲目。稀有装备穿戴后会发光，重击与乾坤圈命中带有短促震屏。浏览器启用减少动态效果时会关闭震屏。

The bag has Equipment, Attributes, and Items tabs. Filter by equipped slot and compare stats before equipping, inspect base and gear bonuses, or choose the recovery item to use. The returning ring has a five-second cooldown, and the Wind Banner gives three close-range pulses and a brief ward on an eight-second cooldown. Dealing and taking damage fills Rage. Open the journal with J to track a main or side quest. Returning to Xiqi restores health and supplies at least three powders. Saves belong to this browser and site.

The pause menu has separate music and effects controls and a global mute. Three original compositions cover town, the trail, and the boss. Rare gear glows while equipped. Heavy hits and ring impacts briefly shake the camera, with reduced-motion mode disabling the shake.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `createBrowserGame` | 网页中的 2D 舞台与帧循环 · browser 2D stage and frame loop | `src/main.mjs` |
| `play`、`game.show`、`createBrowserSemantics` | 行囊、商店和铁匠铺由原生按需绘制层承载，含滚动、长文换行、焦点和语义树 · native on-demand inventory, shop and forge with scrolling, wrapped text, focus and semantics | `src/native-rpg-ui.mjs`, `src/inventory-ui.mjs`, `src/commerce-ui.mjs` |
| `Bitmap` | 角色动作、场景、掉落与法宝图集 · actors, scenery, loot and artifact atlases | `src/view.mjs` |
| `DisplayObjectContainer` | 地面、预警、按纵深排序的人物与建筑 · ground, warnings and depth-sorted actors/scenery | `src/view.mjs` |
| `Sprite.graphics` | 敌人预警圈、路径与血条 · warnings, paths and health bars | `src/view.mjs` |
| `createSharedMaterial2D` | 受击闪光与法宝着色 · impact flashes and artifact tint | `src/view.mjs` |
| `Scope`、纹理租约 · Scope and texture leases | 界面切换和场景图集的生命周期 · texture and view lifetime | `src/art/paint.mjs`, `src/view.mjs` |

## 验收 · Verification

版本、设备、操作流程和数值验证记录见 [验收记录](QUALITY.md)。

See [Quality](QUALITY.md) for versioned device runs, gameplay routes, and balance checks.

## 已知问题 · Known issues

当前文本与界面以简体中文提供。跨浏览器迁移存档与手柄操作尚未接入。设备画面、触控与帧表现需要按 `QUALITY.md` 中列出的实际环境判定。

The current interface is Simplified Chinese. Save transfer across browsers and gamepad controls are not implemented. Device visuals, touch and frame behaviour require the recorded target environment.

## 已解决 · Solved

移动端的互动和拾取使用固定位置，可以在两者同时出现时直接选择归营或拾取。

On touch screens, interact and pickup stay in their own positions when both actions are available.

点击移动绕开实体矩形，斜向移动保持相同速度。法宝飞行中保存会保留伤害与冷却，拾取后的物品不会因读档重复出现。首次击杀保证获得可见的装备提升。

Click movement routes around solid rectangles and diagonal speed is normalized. Saving during a ring flight retains dealt damage and cooldown. Collected loot stays collected after reload. The first kill guarantees an equipment upgrade.

## 未完成 · Unfinished

故事目前以攻破朝歌外城结束。朝歌城内的剧情和跨设备存档尚未制作。

The current campaign ends at Chaoge's outer city. Its inner-city story and cross-device saves remain future work.

## 目录结构 · Layout

`src/sim/` 保存纯规则与数据，`src/view.mjs` 和 `src/art/` 绘制原生 2D 场景，`src/main.mjs` 连接操作、界面与存档。`assets/` 放自制标题画，`test/rules.test.mjs` 验证规则与存档，`test/accept.mjs` 通过浏览器正常操作验收，`vendor/` 保存本作固定引擎副本。

Simulation and data are separate from the 2D view, art preparation, interface and persistence. The tests cover rules, saves and normal browser controls. All runtime dependencies are vendored.

## 引擎副本 · Engine copy

本作使用 Egret 主干提交 `8e70dcb3a8a0b40c9966483c92cb9f691a1cefd8`。来源、入口和许可证见 `vendor/SOURCE.md`、`vendor/LICENSE` 和 `vendor/NOTICE`。副本由引擎的 `tools/vendor-game.mjs` 生成。

The game vendors Egret main at the commit above. `tools/vendor-game.mjs` retains the imported 2D engine, Play UI and redistribution notices. Gameplay and its three modal panels both use native Egret rendering. Play queues cold equipment images through the native declarative view. · 装备图片冷加载由原生声明式视图排队；面板重建使用引擎原生命名焦点，保留动态物品列表的滚动状态。

在仓库根目录通过静态 HTTP 预览打开 `/FengshenChronicle/`。游戏无需业务后端。ES modules 与 import maps 需要 HTTP 或 HTTPS 页面。

```sh
node --test FengshenChronicle/test/*.test.mjs
node FengshenChronicle/test/accept.mjs
node tools/check-standard.mjs FengshenChronicle --strict
```

Browser acceptance uses the repository's Playwright development dependency. It is outside the shipped game.
