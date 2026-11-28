# Wulin · 武林天下

## 简介 · Introduction

武林天下是为[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的武侠门派经营游戏 Demo。大昭承和年间，朝廷颁《禁武令》，江湖风雨欲来：从十二个门派里择一而掌，建山门、收弟子、排差事、练武学，与各派或战或和，直到一统江湖，或在武林大会上被推为盟主。 [在线试玩](https://cnedwin.github.io/PortedGamesEgret/Wulin/)

Wulin is an independently developed wuxia sect management demo being built for [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). In the Chenghe years of the Zhao dynasty the court bans the carrying of arms, and the martial world stirs. Take charge of one of twelve sects: build its seat, take in disciples, set their work, train them in the arts, and fight or befriend the other sects until you rule them all, or until the Summit names you its leader. [Play online](https://cnedwin.github.io/PortedGamesEgret/Wulin/)

> 规则、数值、存档和修改器齐备；原生界面使用 `art-handoff/` 的立绘和场景画，山门与战斗用引擎以 3D 绘制（模型由代码生成；人物是带骨骼的蒙皮模型，动作烘成动画片段后经混合器播放）。设备画不了 3D 时，山门以画卷示意，战斗以文字结算。江湖页的大地图是一座 3D 沙盘：山川、两条大河、湖与海、城池与山门、道路、森林、农田和边墙，各派疆域按门派颜色晕染（`tools/realm.html` 可单独查看）。本派据点之间、以及通往友好门派的道路是商路，每旬有进项，沙盘上有商队往来；出兵时队伍沿路行军。十二派各有自己的营造样式（少林红墙黄瓦、武当红墙碧瓦、昆仑白墙平顶、漕帮粉墙黛瓦马头墙、丐帮茅草顶、唐门穿斗黑瓦等），山门东北角各有一处标志物（塔林、太极坛、钟楼、圣火坛、三塔……）；树木花草取自 CC0 模型（见 ASSETS.md）。山门按中轴布局：正殿在高台上，演武场与兵器场夹道，起居在东、作坊在西，院内有池、桥、竹林、灯与花圃；旗幡、炊烟、飞鸟、落花和游鱼会动，天色随时辰从晨到夜流转。材质是哑光的受光材质，表面有程序生成的肌理（灰泥、瓦垄、织物、叶丛），颜色自下而上有明暗过渡；天上有日月星辰，晨昏有薄雾和光束，阴影边缘柔和。沙盘上有村落、宝塔、稻田和五种树木，河水流动、海浪拍岸。界面是一整屏：3D 画面铺满，要务、指令面板和各类名册浮在画面之上，不随页面滚动；空格暂停或继续，数字键 1–3 调速。人物无论在哪里列出都是同一种名牌，点开是同一张人物面板；每季有一份季报，克城、失地、传位、武林大会等大事各有一张告示。标题、江湖和交战各有一首原创古风配乐。序章、战报提示和招式名随游戏提供台湾国语女声，动态消息可用设备的台湾国语语音朗读；山门的风声、鸟鸣和虫鸣随画面时辰变化。江湖沙盘与画卷共享风声和水声，沙盘行军时叠加脚步与行装声，交战时兵器与受击各有声响。播报时会压低配乐、环境声和战斗音效；音乐、环境声、操作与战斗音效、播报各自可静音或调音量。
>
> The rules, numbers, saves and the editor are in place. The native interface uses the portraits and scene paintings in `art-handoff/`, and the sect's seat and its fights are drawn in 3D with the engine from models made in code; people are skinned bodies on a skeleton, their actions baked into animation clips and played through a mixer. Where a device cannot draw 3D, a painting stands in for the seat and fights are settled in writing. The map of the realm is a 3D model: mountains, two great rivers, a lake and the sea, walled cities and mountain seats, roads, forests, farmland and a frontier wall, with each sect's lands tinted in its colour (`tools/realm.html` shows it on its own). Roads between a sect's own strongholds, and to those of friendly sects, are trade routes that bring silver every ten days, with carts on them in the model; a column marches up the road when you attack. Each of the twelve sects builds in its own manner (red walls and yellow tiles for Shaolin, flat roofs and white walls for Kunlun, white walls, black tiles and stepped gables for the Cao Gang, thatch for the Beggars, and so on) and has its own landmark in a corner of its seat; trees and plants come from CC0 model files (see ASSETS.md). The seat is laid out on an axis: the hall on a terrace at the head of an avenue, the drill yards either side of it, living quarters to the east and workshops to the west, with a pond, a bridge, a bamboo grove, lanterns and flower beds inside the wall; banners, smoke, birds, falling petals and carp move, and the light turns with the hour from dawn to night. Surfaces are matt and lit, each with a grain made in code (plaster, courses of tile, weave, clumps of leaves) and colour that shades from foot to top; the sun, the moon and the stars are in the sky, there is mist and shafts of light at dawn and dusk, and shadows have soft edges. The model of the realm has hamlets, pagodas, paddies and five kinds of tree, rivers that run and surf on the shore. The game is one screen: the 3D picture fills it, and the matter in hand, the panel of orders and the lists sit over the picture; nothing scrolls as a page. Space holds or releases time and the keys 1 to 3 set its pace. People are shown on the same name plate wherever they are listed, and open the same panel; each season ends with a report, and great matters (a stronghold taken or lost, a succession, the summit) are each announced on a sheet of their own. The title, realm and battles have separate original scores. The prologue, report cues and martial art names include a Taiwanese Mandarin female voice. The browser can read dynamic details using a Taiwan Mandarin system voice when available. Wind, birds and insects follow the visual clock in the seat. The 3D model and painted map share wind and water, with footfalls and gear during a visible march. Each weapon family and impact has its own sound. Music, ambience and combat effects dip during narration. Music, ambience, effects and narration have separate volume and mute settings.

## 寻艺 · Finding arts

武学要有来历才能学：本派绝学、门中有人练到六重的武学、藏经阁里有抄本的武学。其余的要从书贩手里买、向友好门派求授、从攻下的藏经阁带走，或者由带艺来投的人传下。数值的全局推演见 `tools/audit.mjs` 与 `docs/数据设定.md`。

An art can be learned only where it can be had: a sect's own arts, those one of its people has taken to the sixth level, and those it holds a manual of. The rest are bought from a pedlar of books, asked of a friendly sect, carried off from a fallen library, or brought by someone who joins already knowing them. `tools/audit.mjs` plays whole games forward to check the numbers; the findings are in `docs/数据设定.md`.

## 序章与美术 · Prologue and art

新局从禁武令传抵山门开始。读过三幕序章后，可接掌现有门派或自立门户，再选择传承规则。序章可跳过，存档可从标题画面直接载入。松墨、矿蓝、淡铜和朱砂贯穿人物立绘、场景画、江湖沙盘和战场。战场用同一套门派名牌标识队伍，按武学区分招式形状和颜色。

A new game opens as the edict reaches the mountain gates. The three skippable scenes lead into founding or taking over a sect and choosing a succession rule. Saves load directly from the title screen. Ink, mineral blue, brass and cinnabar carry through the character art, painted scenes, world map and arena. Team markers identify fighters, while attack shapes and colors distinguish martial techniques.

[美术体系 · Art direction](art-handoff/ART-DIRECTION.md)

## 玩法 · How to play

- **山门 · Seat**：拖动转视角，滚轮或双指缩放。点建筑可扩建，点空地可在该处兴建。开局玩家就是总舵掌门，招贤榜已有两名求见者，有空铺便可收录。掌门手札可随时打开，会指向厢房、招贤榜与店铺。
- **立足期**：新局按难度获得 6、5、4、3 年立足期。主动出兵会解除与目标门派的保护。抓紧扩建厢房、延揽门徒并安排一旬收支。
- **首战守备**：掌门手札可查看守军、山门和薪俸。易与寻常新局在立足期后首次无故受袭、且只剩原山门时，战败可退守内院一次，损失两成银粮。
- **弟子 · Disciples**：给每个人派差事：修练一门武学、采集、制造、行侠仗义或欺压良民。练得够了可以晋升，身份从杂役、外门、内门到亲传。
- **江湖 · The world**：与本派据点相邻的无主之地可以开设分舵，相邻的他派据点可以出兵。出兵后双方自动交手，可随时暂停（空格）、调速、点选敌人下令集火、撤退或速决。馈赠能改善关系。
- **时间 · Time**：暂停、行、快、疾四档。每十日一旬，发薪、耗粮、结算忠诚，各派也在这时行动。
- **存档 · Saves**：三个存档位和一个自动存档保存在浏览器里；可以导出为文件，也可以导入文件。
- **修改器 · Editor**：连按两下 F8 打开（没有键盘时，连点五下顶栏的日期）。可改门派、角色和物品数据，并可一键还原到打开之前。

- **Seat**: drag to turn the view, use the wheel or two fingers to zoom. Select a building to upgrade it or an empty plot to build there. You start as the sect's leader at its seat with two candidates already at the board. A free bed is required to take one in. The leader's handbook points you to quarters, recruitment and shops.
- **Opening truce**: new campaigns get 6, 5, 4 or 3 years of protection according to difficulty. Launching an attack lifts it with that opponent. Use this time to make room for new disciples and establish an income.
- **First defense**: the leader's handbook shows the garrison, gate and payroll. On Easy or Normal, a new campaign that loses its first unprovoked defense of its only original seat after the truce can fall back into the inner court once, losing 20% of its silver and grain.
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

### 育徒 · Raising disciples

- **品质 · Grades**：每名弟子按资质分五品——凡品、良品、上品、极品、绝世。评分以最强的一项资质为主、次强与五项均值为辅，资质决定练功快慢，所以品质说的是这个人能被带到多高。名牌、招贤榜与榜单上都标着品质。
- **排行 · Rankings**：弟子页可切到「榜单」，按战力、资质、等级、臂力、腰力、腿力、内力、身法、悟性、暗器、五项资质、忠诚或年龄排行，升降序任选；点表头即可换一项来排。
- **性情与生平 · Tempers and records**：性情不只是数值：弟子会按各自的性情来找掌门说事，怎么答复各有得失。入门、晋升、拜师、武学练到三重、六重、十重、登擂、出征、论剑，都记在各人的生平里；头一回登擂得胜、头一门武学圆满这样的日子，会单独告知。
- **论剑大会 · The Sword Meet**：每三年九月初一开擂，各派遣一名弟子出战，掌门、长老与江湖奇人不得下场。可亲自上场指挥，也可交由弟子应战。夺魁者门派威望大增、得银千两，另赠一部本派所缺的秘笈，本人留名「论剑魁首」。
- **一键安排 · One-step work**：「一键安排差事」按资质给全派（或只给闲着的人）排差事：资质好的修练最合适的武学，资质平平的杂役与外门里抽三成去采集、制造。确认前可逐条过目。弟子页顶上列着待你定夺的事：闲着的、可晋升的、想走的、带伤的。
- **逐步开放 · Affairs open in turn**：新局先只有山门、弟子、纪事与存档；江湖、拜师、店铺、事务、战阵、装备、往来、经脉、卧底随门派立稳依次开放，每开一项有一句说明，掌门手札里列着尚未开放的各项。老手可在设置里一次全开；旧存档不受影响。
- **图鉴 · Collection books**：纪事页另有武学谱、奇人录、神兵谱，记着已得与未得。

- **Grades**: every disciple has one of five grades by aptitude: ordinary, fair, fine, rare and peerless. The score leans on the best aptitude, then the second and the run of all five; aptitude sets how fast an art is learned, so the grade says how far a person can be brought on. It is shown on name plates, at the recruiting board and in the ranking table.
- **Rankings**: the disciples page has a table that ranks the roster by prowess, grade, level, any of the seven stats or five aptitudes, loyalty or age, upward or downward; a column heading re-ranks by that column.
- **Tempers and records**: a temper is more than a number. Disciples bring matters to the leader by their temper, and each answer has its price. Joining, promotion, taking a master, an art reaching its third, sixth and tenth level, the duelling stage, campaigns and the Sword Meet are written into each person's record, and the days worth remembering (a first win on the stage, a first art completed) are told as they happen.
- **The Sword Meet**: on the first of the ninth month every third year each sect sends one disciple; leaders, elders and wanderers stay home. Fight each bout in person or leave it to the disciple. The winner's sect gains renown, a thousand silver and a manual it lacks, and the winner keeps the title.
- **One-step work**: one button sets work for the whole sect, or only for those idle, by aptitude: the gifted practise the art that suits them best, and about a third of the plainer junior disciples gather and craft. Every line can be read before it is applied. The top of the disciples page lists what is waiting on the leader: the idle, those ready for promotion, those thinking of leaving, the wounded.
- **Affairs open in turn**: a new game starts with the seat, the disciples, the chronicle and the saves. The map, masters, shops, sect affairs, the field, gear, diplomacy, meridians and spies open as the sect finds its feet, each with a line on what it is for, and the handbook lists what is still to come. The settings can open everything at once, and saves from before are unaffected.
- **Collection books**: the chronicle keeps books of arts, wanderers and named weapons, held and not yet held.

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
# 引擎副本由引擎仓库的 tools/vendor-game.mjs 生成，见「引擎副本」一节 · the engine copy is made by the engine's tools/vendor-game.mjs, see Engine copy
```

用任意静态文件服务器打开本目录即可运行，例如 `npx serve .`。规则都在 `src/core`，数据都在 `src/data`，两处都不依赖页面；`src/ui` 与 `src/main.mjs` 是界面，`src/view` 是 3D 画面，`art-handoff/` 是立绘、场景画与界面样式，`tools/models.html` 和 `tools/seat.html` 可单独查看人物动作与山门。地址后加 `?quality=low`（或 `medium`、`high`）可指定画质。

Serve this folder with any static file server to run it, for example `npx serve .`. The rules are in `src/core` and the data in `src/data`; neither needs a page. `src/ui` and `src/main.mjs` are the interface, `src/view` is the 3D picture, `art-handoff/` holds the portraits, scene paintings and interface styles, and `tools/models.html` and `tools/seat.html` show the figures' actions and a seat on their own. Add `?quality=low` (or `medium`, `high`) to the address to choose the picture quality.

动作预览可用 `tools/models.html?action=sword&phase=contact` 查看单个招式的命中姿势。去掉 `phase` 参数即可循环演练。 · Use `tools/models.html?action=sword&phase=contact` to inspect a move at its contact frame. Omit `phase` to loop the action.

素材来源见 [ASSETS.md](ASSETS.md)。 · Asset sources are listed in [ASSETS.md](ASSETS.md).

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `@egret/engine` `createEngine`；`createWorld3DHost` | 引擎、时钟和 3D 宿主 · the engine, its clock and the 3D host | `src/view/stage.mjs` |
| `@egret/engine/webgl2/world3d` `createWebGL2Renderer3D`；`@egret/engine/webgpu/world3d` `createWebGPURenderer3D` | 默认 WebGL2，可选 WebGPU；按设备分画质，手机不开阴影和后期 · WebGL2 by default, WebGPU on request; phones get no shadows or post-processing | `src/view/stage.mjs` |
| `@egret/engine/play`、`play`、`createWorld3DView` | 透明原生 UI 与 3D 共用引擎时钟 · native transparent UI and 3D share a clock | `src/main.mjs` |
| `game.show`、`createUiScreenStack`、`game.confirm`、`game.badges`、`game.hints` | 具名数据界面、模态、指引与通知 · named data views, modals, guidance and feedback | `src/ui/native-shell.mjs` |
| `uiScale`、`portrait`、`tablet`、`fit` | 自适应安全区与触控 · safe and adaptive touch layout | `src/ui/native-pages.mjs` |
| `createUiSemantics`、`createBrowserSemantics`、`createUiTester` | 语义树、焦点、浏览器验收 · semantics, focus and browser acceptance | `src/main.mjs` |
| `createSaveStore`、`browserSaveStorage` | 旧档兼容及坏档保留 · legacy save compatibility and quarantine | `src/ui/native-save.mjs` |
| `createTextTable`、`pickLanguage`、`createBrowserTextInput`、`createCanvasParagraphProvider` | 双语、系统输入和段落 · bilingual text, native entry and paragraphs | `src/ui/native-shell.mjs` |
| `createOverlayScreenMarkers3D`、`createGlyphFont` | 场景投影标签及伤害数字池 · projected scene labels and damage pool | `src/view/scene-markers.mjs` |
| `game.gestures`、`preparePrograms`、`createWorld3DStats` | 原生拖动缩放、场景预热和统计 · native camera gestures, scene warmup and stats | `src/view/stage.mjs` |
| `Scene3D`、`createDirectionalLight3D`、`createHemisphereLight3D` | 山门、天下地图和战阵三个场景，日月随时辰转动 · the seat, the realm map and the arena, light turning with the hour | `src/view/stage.mjs`、`src/view/realm.mjs` |
| `InstancedMesh3D`、`createGeometry3D` | 地图上的村落、宝塔、稻田、树木、船只和行军队列 · hamlets, pagodas, paddies, trees, junks and marching columns | `src/view/realm.mjs`、`src/view/flora.mjs` |
| `Raycaster3D` | 在山门里点选建筑和人物 · picking buildings and people in the seat | `src/view/seat.mjs` |
| `Skeleton3D`、`Bone3D`、`AnimationMixer3D` | 人物是骨架上的蒙皮身体，播放烘好的动作 · skinned figures playing baked clips | `src/view/figure.mjs` |
| `createAnimationClip3D` | 招式动作的关键帧 · the keyframes of each move | `src/view/figure-motion.mjs` |
| `createUnlitMaterial3D` | 战阵里的刀光和特效 · blade light and effects in the arena | `src/view/arena-effects.mjs` |

## 已验证 · Verified

- 2026-11-28：原始 80 项规则测试保持通过，新增原生页面、弹出单、存档、手势和本地化测试。 · Original 80 rule tests remain green; added native view, sheet, save, gesture and localization coverage.
- 实际 PC / Fold7 验收包括开场、山门、招募、建造、地图、战斗和旧档；参见 [QUALITY.md](QUALITY.md)。 · Actual PC and Fold7 checks include opening, seat, recruitment, construction, realm, battle and legacy-format saves.
- 无界面十年推演及 200 场各组平衡验证仍可运行；规则和数值未改。 · Ten-year headless and 200-bout balance series still run; the rules and numbers are unchanged.
- 迁移映射和复跑见 [UI-MIGRATION.md](UI-MIGRATION.md)。 · Migration inventory and repeat commands are in UI-MIGRATION.md.

## 已知问题 · Known issues

- 大规模富文本采用分页，音频保留原有混音；详见 [ENGINE-NOTES.md](ENGINE-NOTES.md)。 · Large rich-text lists page within the engine budget; the existing mix is retained.
- 画卷模式以原生列表选择据点；3D 模式可直接点选地标。自定义姓名保持玩家输入，不保证自动翻译。 · Painted map locations use the native list; 3D supports direct selection. Custom names retain player-authored spelling.

## 已解决 · Solved

- 原生滚动裁切多屏报告与键盘语义焦点验收（引擎 #549/#552）：九屏无错误或警告，通用 A1 识别实际原生焦点；矮横屏山门工具避让右侧命令面板，提示不再被顶栏遮挡。 · Correct native clipped-bound reports and keyboard focus verification; the short-landscape seat tools no longer overlap the command panel.
- 开局改成可以直接上手的序章（`e526ab0`）。 · The start became a playable prologue.
- 战斗前预热阵容旁白（`761ea74`）；战斗音效和画面的打击点对齐（`f5a87bd`）。 · Lineup narration is warmed up before combat; combat sounds land with the visible blows.
- 对话框里的操作不再冲掉提示（`3d595cd`）；论剑大会的进度得以保留（`cdc3efd`）。 · Dialog actions keep the feedback; Sword Meet progress is kept.
- 浏览器存储不可用（无痕模式、被禁用）时游戏起不来：改用引擎 `browserSaveStorage()` 探测，不可用时改存在内存里，游戏照常开始（品质 S3 变为达标）。 · The game did not start with storage refused; the engine's `browserSaveStorage()` now probes it, and a memory store stands in.
- 首次守山的改进（`6aa0c59`），鹤翼阵和其他常见阵法拉平（`fd3f8d3`），后期加成叠加设了上限（`b5b0de9`）。 · The first home defense, the crane formation and late-game stacking.

## 未完成 · Unfinished

- 物理手柄、真实读屏、原生中文输入法选词、Safari、Firefox、微信及完整长期战役的验收尚未运行。 · Physical controller, real screen reader, native Chinese IME candidates, Safari, Firefox, WeChat and whole long campaigns remain untested.
- 新 UI 仅在 WebGL2 和当前实际设备路径完成集中回归；本次未重新完成全流程 WebGPU 与扬声器混音实听。 · Full WebGPU and speaker listening are not requalified by this migration.

## 目录结构 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `src/core/` | 规则：门派、弟子、江湖、战斗、论剑、卧底、存档，不依赖页面 · the rules, with no page |
| `src/data/` | 武学、门派、地点、货物、江湖事件等数据 · arts, sects, places, goods and events |
| `src/ui/`、`src/main.mjs` | 界面、序章、配乐、旁白和音效 · the interface, prologue, score, narration and sound |
| `src/view/` | 3D 画面：山门、天下地图、战阵、人物与动作 · the 3D picture: seat, realm, arena, figures and moves |
| `art-handoff/`、`assets/` | 立绘、场景画、界面样式和模型 · portraits, paintings, interface styles and models |
| `tools/` | 无页面推演、平衡、阵法、加成测算、模型查看与引擎副本更新 · headless runs, balance, formations, stacking, viewers and vendoring |
| `docs/数据设定.md` | 数据设计文档 · the data design |
| `test/` | Node 测试 · Node tests |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `39560b3ef608e4dda68c8461f435c279d1eba3d2`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit `39560b3ef608e4dda68c8461f435c279d1eba3d2`, copied by the engine's `tools/vendor-game.mjs`; see [vendor/SOURCE.md](vendor/SOURCE.md).
