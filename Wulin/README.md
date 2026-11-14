# Wulin · 武林天下

武林天下是为[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的武侠门派经营游戏 Demo。大昭承和年间，朝廷颁《禁武令》，江湖风雨欲来：从十二个门派里择一而掌，建山门、收弟子、排差事、练武学，与各派或战或和，直到一统江湖，或在武林大会上被推为盟主。 [在线试玩](https://cnedwin.github.io/PortedGamesEgret/Wulin/)

Wulin is an independently developed wuxia sect management demo being built for [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). In the Chenghe years of the Zhao dynasty the court bans the carrying of arms, and the martial world stirs. Take charge of one of twelve sects: build its seat, take in disciples, set their work, train them in the arts, and fight or befriend the other sects until you rule them all, or until the Summit names you its leader. [Play online](https://cnedwin.github.io/PortedGamesEgret/Wulin/)

> 规则、数值、存档和修改器齐备；界面、立绘和场景画来自 `art-handoff/`，山门与战斗用引擎以 3D 绘制（模型由代码生成；人物是带骨骼的蒙皮模型，动作烘成动画片段后经混合器播放）。设备画不了 3D 时，山门以画卷示意，战斗以文字结算。江湖页的大地图是一座 3D 沙盘：山川、两条大河、湖与海、城池与山门、道路、森林、农田和边墙，各派疆域按门派颜色晕染（`tools/realm.html` 可单独查看）。本派据点之间、以及通往友好门派的道路是商路，每旬有进项，沙盘上有商队往来；出兵时队伍沿路行军。山门按中轴布局：正殿在高台上，演武场与兵器场夹道，起居在东、作坊在西，院内有池、桥、竹林、灯与花圃；旗幡、炊烟、飞鸟、落花和游鱼会动，天色随时辰从晨到夜流转。材质是哑光的受光材质，表面有程序生成的肌理（灰泥、瓦垄、织物、叶丛），颜色自下而上有明暗过渡；天上有日月星辰，晨昏有薄雾和光束，阴影边缘柔和。沙盘上有村落、宝塔、稻田和五种树木，河水流动、海浪拍岸。界面是一整屏：3D 画面铺满，要务、指令面板和各类名册浮在画面之上，不随页面滚动；空格暂停或继续，数字键 1–3 调速。人物无论在哪里列出都是同一种名牌，点开是同一张人物面板；每季有一份季报，克城、失地、传位、武林大会等大事各有一张告示。配音由设备自带的中文语音合成：旁白念奇遇、来犯与战报，交战中打出重手的人喊出武学的名字，男女老少嗓音各不相同；可在设置里关闭或调音量。没有录制的人声。
>
> The rules, numbers, saves and the editor are in place. The interface, portraits and scene paintings come from `art-handoff/`, and the sect's seat and its fights are drawn in 3D with the engine from models made in code; people are skinned bodies on a skeleton, their actions baked into animation clips and played through a mixer. Where a device cannot draw 3D, a painting stands in for the seat and fights are settled in writing. The map of the realm is a 3D model: mountains, two great rivers, a lake and the sea, walled cities and mountain seats, roads, forests, farmland and a frontier wall, with each sect's lands tinted in its colour (`tools/realm.html` shows it on its own). Roads between a sect's own strongholds, and to those of friendly sects, are trade routes that bring silver every ten days, with carts on them in the model; a column marches up the road when you attack. The seat is laid out on an axis: the hall on a terrace at the head of an avenue, the drill yards either side of it, living quarters to the east and workshops to the west, with a pond, a bridge, a bamboo grove, lanterns and flower beds inside the wall; banners, smoke, birds, falling petals and carp move, and the light turns with the hour from dawn to night. Surfaces are matt and lit, each with a grain made in code (plaster, courses of tile, weave, clumps of leaves) and colour that shades from foot to top; the sun, the moon and the stars are in the sky, there is mist and shafts of light at dawn and dusk, and shadows have soft edges. The model of the realm has hamlets, pagodas, paddies and five kinds of tree, rivers that run and surf on the shore. The game is one screen: the 3D picture fills it, and the matter in hand, the panel of orders and the lists sit over the picture; nothing scrolls as a page. Space holds or releases time and the keys 1 to 3 set its pace. People are shown on the same name plate wherever they are listed, and open the same panel; each season ends with a report, and great matters (a stronghold taken or lost, a succession, the summit) are each announced on a sheet of their own. Voices come from the device's own Chinese speech: a narrator reads events, sieges and battle reports, and whoever lands a telling blow calls out the art, each speaker with a pitch of their own; settings turn it off or down. There are no recorded voices.

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

- **江湖事件与奇人 · Events and wanderers**：时有事端找上门来，各有几种应对，后果不同；三十位江湖奇人会来访，延揽入门后各带一项惠及全派的天赋。
- **阵法、门规与店铺 · Formations, house rules and shops**：出兵前择阵，本派阵法需长老或掌门在阵中；门规在修练、忠诚、攻势与制造之间取舍；山下可开店铺，每旬入银。
- **朝廷 · The court**：《禁武令》之下，与朝廷交恶会招来官兵，交好则另有一条结局：朝廷关系至八十、威望至五百，年终受封。

- **Events and wanderers**: matters come to the leader's door with several answers and different ends. Thirty wanderers may visit; one who joins brings a talent that helps the whole sect.
- **Formations, house rules and shops**: pick a formation before a fight (a sect's own needs an elder or the leader in the party); a house rule trades training, loyalty, attack and craft against each other; shops in the town below bring silver every ten days.
- **The court**: under the ban on arms, a sect at odds with the court is raided, and one in its favour has a third way to win: standing of eighty with the court and renown of five hundred at a year's end.

- **更多可做的事 · More to do**：为弟子打造兵甲、赐予神兵、炼丹服药；任命舵主、堂主与长老；著写秘笈、自创武学、打通经脉、下山历练；给分舵定专精、迁建建筑；安插卧底；登擂单挑。他派来犯时可亲自守城，交手中可下号令、换攻守。开局可选四种局面、对手强弱，也可自立门户另起名号。设置里可装载数据包（MOD）。

- **More to do**: fit disciples out, hand down named weapons, make and take pills; appoint wardens, hall masters and elders; write manuals, found an art, open meridians, send someone travelling; give a branch a speciality and move its buildings; plant a spy; fight on the duelling stage. An attack on you can be met in person, and in a fight you can call a rally and lean to attack or defence. A game can begin in four ways, against weaker or stronger sects, or under a name of your own, and a data pack can be loaded from the settings.

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
node tools/formations.mjs        # 各阵法对长蛇阵的胜率 · each formation's win rate against a plain line
node tools/stacking.mjs          # 装备、神兵、经脉、加成各值几级 · what gear, named weapons, meridians and bonuses are worth in levels
node tools/vendor.mjs <path>    # 从引擎仓库更新 vendor/ · refresh vendor/ from an engine checkout
```

用任意静态文件服务器打开本目录即可运行，例如 `npx serve .`。规则都在 `src/core`，数据都在 `src/data`，两处都不依赖页面；`src/ui` 与 `src/main.mjs` 是界面，`src/view` 是 3D 画面，`art-handoff/` 是立绘、场景画与界面样式，`tools/models.html` 和 `tools/seat.html` 可单独查看人物动作与山门。地址后加 `?quality=low`（或 `medium`、`high`）可指定画质。

Serve this folder with any static file server to run it, for example `npx serve .`. The rules are in `src/core` and the data in `src/data`; neither needs a page. `src/ui` and `src/main.mjs` are the interface, `src/view` is the 3D picture, `art-handoff/` holds the portraits, scene paintings and interface styles, and `tools/models.html` and `tools/seat.html` show the figures' actions and a seat on their own. Add `?quality=low` (or `medium`, `high`) to the address to choose the picture quality.

素材来源见 [ASSETS.md](ASSETS.md)。 · Asset sources are listed in [ASSETS.md](ASSETS.md).
