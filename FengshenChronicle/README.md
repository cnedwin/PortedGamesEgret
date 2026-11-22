# 封神 · 西岐战纪 · Fengshen Chronicle

## 简介 · Introduction

基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)的原创封神题材单机动作 RPG。当前第一章包含西岐城与岐山古道，玄甲受托除祟，拾取装备，施展乾坤圈，击败邪将后回城复命。游戏资源随目录提供，进度保存在当前浏览器的三个存档位。

An original single-player action RPG built with Egret Rebuild. This first chapter connects Xiqi town and the Qishan road. Accept Jiang Shang's commission, equip earned loot, use the returning Universe Ring, defeat the corrupted general and report back. All game resources are local to this folder, with three saves in the current browser.

角色和装备采用原创生成插画，西岐城使用暖赭色石材、木构和灯火，古道使用冷青岩壁和青铜遗迹。角色姿态、刀光、受击、首领预警和乾坤圈往返均在原生 2D 显示树中表现。场景原画来源见 [场景素材清单](assets/world/SOURCES.json)。

Original generated illustrations depict the cast and equipment. Amber stone, timber, and lanterns distinguish Xiqi from the blue-green cliffs and bronze ruins of the trail. Character poses, attacks, strikes, telegraphs, and the returning ring run on Egret's native 2D display list.

预定静态部署路径为 [FengshenChronicle](https://cnedwin.github.io/PortedGamesEgret/FengshenChronicle/)。本地开发结果与线上部署状态分别记录在 `QUALITY.md`。

## 玩法与操作 · How to play

先向姜尚领取任务与乾坤圈，再经城东传送阵出城。击败六名邪祟可逼出古道深处的蚀甲邪将。首次击杀必掉破邪剑，拾取后在行囊中装备。乾坤圈去程、回程各可命中一次，五秒冷却。敌人脚下的预警圈标出即将落下的攻击，移动可避开。首领倒下后拾取镇邪印，经古道归营阵回城，向姜尚复命。

Speak with Jiang Shang, take the ring and leave through the eastern portal. Six banishments reveal the general. The first kill guarantees a stronger sword. Equip it in the bag. The ring can hit once outward and once returning, with a five-second cooldown. Enemy warning circles mark their future strikes. Collect the general's seal, return through the camp portal and finish the commission.

| 操作 · Action | 键鼠 · Keyboard and mouse | 触屏 · Touch |
|---|---|---|
| 移动 · Move | WASD、方向键，或点击地面寻路 · keys or click the ground | 左侧摇杆，或点地面 · stick or tap the ground |
| 任务引导 · Quest route | 点「寻路」，靠近后交谈或传送 · Route, then interact when close | 同左 · same |
| 接战 · Engage | 点击敌人追击与普攻 · click an enemy | 点敌人 · tap an enemy |
| 攻击 · Attack | 空格或「攻击」· Space or Attack | 「攻击」· Attack |
| 法宝 · Artifact | Q 或「乾坤圈」· Q or Universe Ring | 「乾坤圈」· Universe Ring |
| 回血 · Heal | 1 或「回春散」· 1 or Healing Powder | 「回春散」· Healing Powder |
| 交谈、传送、拾取 · Interact and collect | 走近后点对应按钮 · use the nearby action | 对应按钮 · nearby action |
| 装备 · Equip | B 或「行囊」，再点装备 · B or Bag, then Equip | 「行囊」内装备 · Equip in Bag |
| 暂停与存档 · Pause and save | Esc 或「暂停」· Esc or Pause | 「暂停」· Pause |

军需官每十二文出售一份回春散。回城恢复气血并至少补给到三份。力竭可返回西岐，保留已拾取装备和任务进度。存档位属于当前浏览器和站点，清除站点数据也会清除存档。

暂停菜单可独立调整配乐和音效，或一键静音。城镇、古道和首领战使用各自的原创曲目。稀有装备穿戴后会发光，重击与乾坤圈命中带有短促震屏。浏览器启用减少动态效果时会关闭震屏。

The quartermaster sells healing powder for twelve coins. Returning to town restores health and supplies at least three powders. On defeat, return to Xiqi with collected equipment and quest progress. Saves belong to this browser and site. Clearing site data removes them. Gamepad controls are outside this chapter's implemented controls.

The pause menu has separate music and effects controls and a global mute. Three original compositions cover town, the trail, and the boss. Rare gear glows while equipped. Heavy hits and ring impacts briefly shake the camera, with reduced-motion mode disabling the shake.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `createBrowserGame` | 网页中的 2D 舞台与帧循环 · browser 2D stage and frame loop | `src/main.mjs` |
| `Bitmap` | 角色动作、场景、掉落与法宝图集 · actors, scenery, loot and artifact atlases | `src/view.mjs` |
| `DisplayObjectContainer` | 地面、预警、按纵深排序的人物与建筑 · ground, warnings and depth-sorted actors/scenery | `src/view.mjs` |
| `Sprite.graphics` | 敌人预警圈、路径与血条 · warnings, paths and health bars | `src/view.mjs` |
| `createSharedMaterial2D` | 受击闪光与法宝着色 · impact flashes and artifact tint | `src/view.mjs` |
| `Scope`、纹理租约 · Scope and texture leases | 界面切换和场景图集的生命周期 · texture and view lifetime | `src/art/paint.mjs`, `src/view.mjs` |

## 已验证 · Verified

14 项规则与存档测试通过。Windows PC（Edge）与三星 Fold7 横屏（Chrome）均使用 WebGL2，从新档正常玩到复命，并刷新网页续档，保留任务、装备和背包。完整操作和帧间隔见 [验收记录](QUALITY.md)。

Fourteen rule and persistence tests passed. Windows PC (Edge) and a physical Galaxy Z Fold7 in landscape (Chrome) completed the quest from a fresh save on WebGL2 and restored their quest, gear and bag after reloading the page. See [Quality](QUALITY.md) for the route and frame cadence.

## 已知问题 · Known issues

当前文本与界面以简体中文提供。跨浏览器迁移存档与手柄操作尚未接入。设备画面、触控与帧表现需要按 `QUALITY.md` 中列出的实际环境判定。

The current interface is Simplified Chinese. Save transfer across browsers and gamepad controls are not implemented. Device visuals, touch and frame behaviour require the recorded target environment.

## 已解决 · Solved

移动端的互动和拾取使用固定位置，可以在两者同时出现时直接选择归营或拾取。

On touch screens, interact and pickup stay in their own positions when both actions are available.

点击移动绕开实体矩形，斜向移动保持相同速度。法宝飞行中保存会保留伤害与冷却，拾取后的物品不会因读档重复出现。首次击杀保证获得可见的装备提升。

Click movement routes around solid rectangles and diagonal speed is normalized. Saving during a ring flight retains dealt damage and cooldown. Collected loot stays collected after reload. The first kill guarantees an equipment upgrade.

## 未完成 · Unfinished

本章之外的剧情、其他修行路线与后续地图尚未制作。当前交付目标为两张地图的一条完整单机任务流程。

Later chapters, additional cultivation paths and further maps are future work. This delivery targets one complete single-player quest across two maps.

## 目录结构 · Layout

`src/sim/` 保存纯规则与数据，`src/view.mjs` 和 `src/art/` 绘制原生 2D 场景，`src/main.mjs` 连接操作、界面与存档。`assets/` 放自制标题画，`test/rules.test.mjs` 验证规则与存档，`test/accept.mjs` 通过浏览器正常操作验收，`vendor/` 保存本作固定引擎副本。

Simulation and data are separate from the 2D view, art preparation, interface and persistence. The tests cover rules, saves and normal browser controls. All runtime dependencies are vendored.

## 引擎副本 · Engine copy

本作使用 Egret v7.0.2，提交 `60991a46eb2252e5c0e7790b90b51517e3cbd14c`。来源及许可证见 `vendor/SOURCE.md`、`vendor/LICENSE` 和 `vendor/NOTICE`。副本由引擎的 `tools/vendor-game.mjs` 生成，入口包括 `@egret/engine`、`@egret/engine/web/game`、`@egret/engine/webgl2` 与 `@egret/engine/webgpu`。

The game vendors Egret v7.0.2 at the commit above. `tools/vendor-game.mjs` retains the imported engine modules and their redistribution notices. Gameplay uses the native Egret 2D display list. The renderer runs in the browser.

在仓库根目录通过静态 HTTP 预览打开 `/FengshenChronicle/`。游戏无需业务后端。ES modules 与 import maps 需要 HTTP 或 HTTPS 页面。

```sh
node --test FengshenChronicle/test/*.test.mjs
node FengshenChronicle/test/accept.mjs
node tools/check-standard.mjs FengshenChronicle --strict
```

Browser acceptance uses the repository's Playwright development dependency. It is outside the shipped game.
