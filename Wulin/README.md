# Wulin · 武林天下

武林天下是为[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的武侠门派经营游戏 Demo。大昭承和年间，朝廷颁《禁武令》，江湖风雨欲来：从十二个门派里择一而掌，建山门、收弟子、排差事、练武学，与各派或战或和，直到一统江湖，或在武林大会上被推为盟主。 [在线试玩](https://cnedwin.github.io/PortedGamesEgret/Wulin/)

Wulin is an independently developed wuxia sect management demo being built for [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). In the Chenghe years of the Zhao dynasty the court bans the carrying of arms, and the martial world stirs. Take charge of one of twelve sects: build its seat, take in disciples, set their work, train them in the arts, and fight or befriend the other sects until you rule them all, or until the Summit names you its leader. [Play online](https://cnedwin.github.io/PortedGamesEgret/Wulin/)

> 目前是开发中的版本：规则、数值、存档和修改器已经可用，山门与战斗已用引擎以 3D 绘制（模型全部由代码生成）；江湖事件、奇人、阵法和人物立绘还在制作。设备画不了 3D 时，游戏以文字面板照常进行。
>
> This is a work in progress. The rules, numbers, saves and the editor work, and the sect's seat and its fights are drawn in 3D with the engine, from models made entirely in code. Events, special characters, formations and character art are still being made. Where a device cannot draw 3D the game carries on with its text panels.

## 玩法 · How to play

- **山门 · Seat**：画面上是本派据点的实景，弟子各按差事行事；拖动转视角，滚轮或双指缩放。兴建和扩建建筑，在招贤榜前收录求见者。收人需要掌门在场，也需要厢房有空铺。
- **弟子 · Disciples**：给每个人派差事：修练一门武学、采集、制造、行侠仗义或欺压良民。练得够了可以晋升，身份从杂役、外门、内门到亲传。
- **江湖 · The world**：与本派据点相邻的无主之地可以开设分舵，相邻的他派据点可以出兵。出兵后双方自动交手，可随时暂停（空格）、调速、点选敌人下令集火、撤退或速决。馈赠能改善关系。
- **时间 · Time**：暂停、行、快、疾四档。每十日一旬，发薪、耗粮、结算忠诚，各派也在这时行动。
- **存档 · Saves**：三个存档位和一个自动存档保存在浏览器里；可以导出为文件，也可以导入文件。
- **修改器 · Editor**：连按两下 F8 打开（没有键盘时，连点五下顶栏的日期）。可改门派、角色和物品数据，并可一键还原到打开之前。

- **Seat**: the picture shows your stronghold with everyone at their work; drag to turn the view, use the wheel or two fingers to zoom. Put up and enlarge buildings, and take in the people waiting at the board. The leader must be present and there must be a free bed.
- **Disciples**: give each one work: practise an art, gather, craft, do good deeds or lean on the locals. Enough practice earns a promotion, from servant to outer, inner and personal disciple.
- **The world**: open ground next to one of your strongholds can be settled, and a neighbour's stronghold can be attacked. The two sides then fight on their own while you pause (space), change speed, tap an enemy to set your whole side on them, break off, or settle it at once. Gifts mend relations.
- **Time**: paused or one of three speeds. Every ten days wages are paid, grain is eaten, loyalty is reckoned and the other sects make their moves.
- **Saves**: three slots and an automatic one are kept in the browser; a save can be exported as a file and imported again.
- **Editor**: press F8 twice (without a keyboard, tap the date in the top bar five times). It changes sect, character and item data, and one button puts everything back as it was.

### 门派 · Sects

| 门派 · Sect | 总舵 · Seat | 掌门 · Leader | 路数 · Style |
|---|---|---|---|
| 少林寺 Shaolin | 嵩山 | 慧灯禅师 | 防御与续战 · defence and staying power |
| 武当派 Wudang | 武当山 | 松鹤真人 | 借力反制 · turning force back |
| 峨嵋派 Emei | 峨嵋山 | 沈清霜 | 快攻 · fast and accurate |
| 华山派 Huashan | 华山 | 陆孤舟 | 单体爆发 · few but deadly |
| 丐帮 Beggars | 应天府 | 贺九斤 | 人多势众 · numbers |
| 明教 Mingjiao | 泉州 | 厉千秋 | 消耗内力 · wearing the enemy down |
| 昆仑派 Kunlun | 昆仑山 | 拓跋烈 | 冲阵 · breaking the front line |
| 漕帮 Canal Guild | 扬州 | 江晚舟 | 机动与经济 · mobility and money |
| 药王谷 Medicine Valley | 长白山 | 白术翁 | 疗伤 · healing |
| 崇圣寺 Chongsheng | 大理 | 昙照上人 | 点穴 · pressure points |
| 全真教 Quanzhen | 终南山 | 归云子 | 团队增益 · lifting the whole side |
| 唐门 Tang Clan | 渝州 | 唐挽月 | 暗器与毒 · hidden weapons and poison |

### 武学与战斗 · Arts and fights

武学分十二类、五阶，共七十二门，每门三招。一至三阶各派通用，四阶和五阶是门派专属。出战最多十人，双方自动接战，按各人的出招顺序交手。拳脚克枪棍，枪棍克刀剑，刀剑克拳脚；从侧面和背后出手伤害更高。

There are seventy-two arts in twelve classes and five tiers, three moves each. Tiers one to three are open to all; tiers four and five belong to one sect. Up to ten fight on each side; the two sides close and trade moves on their own, each fighter in their set order. Bare hands beat poles, poles beat blades, blades beat bare hands, and a blow from the side or from behind lands harder.

## 开发 · Development

```sh
# 在 Wulin 目录下 · from the Wulin folder
node --test                     # 规则与场景测试 · rule and scene tests
node tools/headless.mjs 20 7    # 无界面推演二十年 · play twenty years without a page
node tools/balance.mjs          # 战斗时长与门派胜率 · fight length and sect win rates
node tools/balance.mjs --tune   # 重新校准门派强度 · re-tune the sects' strength
```

用任意静态文件服务器打开本目录即可运行，例如 `npx serve .`。规则都在 `src/core`，数据都在 `src/data`，两处都不依赖页面；`src/view` 是 3D 画面，`tools/models.html` 和 `tools/seat.html` 可单独查看人物动作与山门。地址后加 `?quality=low`（或 `medium`、`high`）可指定画质。

Serve this folder with any static file server to run it, for example `npx serve .`. The rules are in `src/core` and the data in `src/data`; neither needs a page. `src/view` is the 3D picture, and `tools/models.html` and `tools/seat.html` show the figures' actions and a seat on their own. Add `?quality=low` (or `medium`, `high`) to the address to choose the picture quality.

素材来源见 [ASSETS.md](ASSETS.md)。 · Asset sources are listed in [ASSETS.md](ASSETS.md).
