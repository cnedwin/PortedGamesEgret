# 九州烽烟 · Nine Provinces Ablaze

## 简介 · Introduction

九州烽烟是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的游戏 Demo：一款东汉末年到三国归晋的即时制大战略游戏。天下是一整片 3D 的六角格山河——起伏的地形、江河湖海、成片的树林、用代码搭起的城池关隘渡口——从中平元年（184 年）黄巾起事开始，你执掌三十四路诸侯之一，在七十六座城、十一处关隘、三十四个渡口之间经营城池、招揽武将、研究科技、合纵连横。军团是一队队小兵和主将的名牌，沿着道路一天天行军；两军相遇或攻城时，仗就在天下图的那片格子上打：镜头飞过去，城墙上站着守军，冲车撞门，箭雨、火攻、战法大字和伤害数字都在地图上。六条演义（曹操、刘备、孙氏、董卓、袁绍和自由书写）各有剧情事件与抉择，一直走到太康元年（280 年）。

Nine Provinces Ablaze is a game demo made on its own on [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild), the
new Egret engine: a real-time grand strategy game from the last years of the Han to the Jin. The realm is one 3D land
of hexes — rising ground, rivers, lakes and the sea, woods, and cities, passes and ferries built in code. It opens in
184 with the Yellow Turbans; you lead one of thirty-four lords among seventy-six cities, eleven passes and thirty-four
ferries, running cities, winning officers, studying inventions and making and breaking alliances. Armies are columns of
small soldiers under their commander's plate, marching day by day along the roads; when two meet, or a city is
stormed, the battle is fought on those very hexes of the map: the camera flies there, defenders stand on the walls,
rams batter the gate, and volleys, fire, tactics written large and the losses all show on the map. Six tales (Cao Cao,
Liu Bei, the Suns, Dong Zhuo, Yuan Shao, and one of your own) each have events and choices of their own, and the age
runs on to 280.

[在线试玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/NineProvinces/)

## 玩法与操作 · How to play

标题页选「新的征程」：先选演义（五条史实演义各自固定势力，「自由书写」可选任何一路诸侯），再定规则——寿命按史实或虚构、战斗亲自指挥或全部委任、难度。开局后时间自动流逝，顶栏可暂停和调五档速度（每秒半天到八天）。 · On the title choose New campaign: first a tale (the five tales of history each come with their power; Write Your Own lets you take any lord), then the rules — lifespans as in history or made up, battles under your command or left to your officers, and the difficulty. Time then runs on its own; the top bar pauses it and sets five speeds (half a day to eight days a second).

- **天下**：3D 的六角格山河，格宽约三个地图单位，地形、江河、湖泊、海岸、山脉、高原、沙漠、草原和树林都由同一套地理数据算出。七十六城有城墙、角楼、城门楼、街巷民居和官署大殿，关隘是横在路上的关墙，渡口有码头和船；城头的旗帜和名牌按城主着色，被围的城名牌泛红。军团是一队小兵加主将的圆形头像牌，沿道路行军。右上角的小地图显示各家疆域和镜头所见，点一下飞过去。 · **The realm**: a 3D land of hexes about three map units across, its ground, rivers, lakes, coast, ranges, plateau, desert, steppe and woods all worked out from one set of geographic data. The seventy-six cities have walls, corner towers, gate towers, streets of houses and a hall of office; passes are walls across the road, and ferries have piers and boats; banners and name plates take the holder's colour, and a besieged city's plate glows red. Armies are columns of soldiers under a round plate with the commander's face, marching along the roads. The minimap at the top right shows each power's land and what the camera sees; tap it to fly there.
- **内政**：每城有人口、民心、治安、守军和训练，四项营建（农田、市场、城墙、官署）各有上限。每月一号结算钱粮，八月秋收；税率轻重影响民心。征兵每月以人口的二十分之一为限，会降低民心和训练。太守由政治和统率最高的武将担任，影响营建、产出与征兵。 · **Running the realm**: each city has people, support, order, a garrison and its training, and four works (fields, markets, walls, offices) up to their limits. Coin and grain come in on the first of each month, with the harvest in the eighth; taxes trade coin for support. Conscription is limited to a twentieth of the people each month and lowers support and training. The best administrator posted there governs, and raises works, income and recruits.
- **武将**：五百六十六位史实人物（统率、武力、智力、政治、魅力，以及由能力和特性算出的第六项"机动"和步、骑、弓、械、水五个兵种的适性 S 到 C；二百一十三种特性，一百三十二个专属战法，一百零八件宝物），按史实年份成年登场、按寿命谢世；每年还有新人出仕或在野。派武将寻访本城的在野人才和宝物，登用在野、俘虏或敌将，颁布招贤令吸引附近的人才。 · **Officers**: five hundred and sixty-six figures of history (command, war, intellect, politics and charm, with a sixth, mobility, and an aptitude from S to C for each of foot, horse, bows, engines and ships, both worked out from the abilities and traits; two hundred and thirteen traits; one hundred and thirty-two signature tactics; one hundred and eight treasures), coming of age in their own years and dying in theirs; each year new men take service or wait unattached. Send officers to search a city for talent and treasures, persuade the unattached, captives and enemy officers, and issue the order for talent to draw in those nearby.
- **出征**：选主将和最多两名副将、兵力、二十六种兵种（枪、戟、刀盾、弓、弩、骑、器械、水军，以及虎豹骑、白马义从、陷阵营、藤甲兵、象兵等专属兵种）和八种阵型，再在地图上点目的地。敌城会被围攻，守军断粮后每天减员；军粮随军，在己方城池补给。 · **War**: choose a commander and up to two deputies, the troops, one of twenty-six kinds (spears, halberds, shields, bows, crossbows, horse, engines, ships, and corps of their own such as the Tiger and Leopard Riders, the White Horse Volunteers, the Formation Breakers, rattan armour and war elephants) and one of eight formations, then tap the destination on the map. Enemy places are besieged, and a garrison cut off loses men each day; an army carries its grain and takes on more in friendly places.
- **战场**：就是天下图上那一片二十二乘十四的六角格，每格的地形取自地图——平原、草地、树林、山地、浅滩（道路过河处是渡口）、江面、沼泽，城的格子就是城墙、城门和城内，城门开在朝向来敌的一面。枪克骑、骑克弓、弓克戟、戟克枪；攻城要撞开城门或占据本营，守方坚持到日落即胜。怒气满时放战法——直线、周围一圈或两圈、自身或身边友军；火计会点燃树林和战船，顺风蔓延。乌巢夜袭与赤壁火攻是两场特别的战斗。 · **The field**: that stretch of twenty-two by fourteen hexes of the map itself, each hex the ground the map has there — plain, grass, woods, hills, shallows (a ford where a road meets a river), open water, marsh — and the city's hexes its walls, gate and town, the gate on the side facing the enemy. Spears beat horse, horse beats bows, bows beat halberds, halberds beat spears; a siege is won by breaking the gate or holding the keep, and the defenders win by lasting till sunset. With full rage a general unleashes a tactic — along a line, round the target in one ring or two, on himself or on allies near him; fire sets woods and ships alight and spreads with the wind. The night raid on Wuchao and the fire at the Red Cliffs are battles of their own.
- **科技**：三十三项，分根基、霸道、王道三路，五层，画成一棵树：圆章、名称、效果、进度条，连线从前置指向后续；第四、五层两条路线互相排斥。 · **Inventions**: thirty-three in three ways (foundations, dominance, benevolence) and five tiers, drawn as a tree — a medallion, the name, its effect and a bar of progress, lines from each to what it opens; the fourth and fifth tiers of the two ways shut each other out.
- **外交**：好感、赠礼、同盟（两年）、停战（一年）、毁约、劝降、请盟友出兵；电脑君主也会结盟、遣使，并联手对付独大的一方。 · **Diplomacy**: regard, gifts, alliances (two years), truces (a year), breaking them, demanding submission and asking an ally to march; the computer's lords make alliances, send envoys and turn together on any power grown too great.
- **演义**：四十一个事件，二十三个由你抉择（十常侍、董卓入京、讨董联军、迁都、连环计、桃园结义、三顾茅庐、官渡、赤壁、白衣渡江……）；记录里有本条演义的演义树，已发生的点亮，错过的划掉，未到的灰着；名士来投时（荀彧、三顾茅庐）大幅画像旁列出他的六维与适性。结局有一统天下、鼎足一方、存续至终和败亡。 · **The tale**: forty-one events, twenty-three of them yours to decide (the Ten Attendants, Dong Zhuo in the capital, the coalition, the move to Chang'an, the chain stratagem, the peach garden, the thrice-visited cottage, Guandu, the Red Cliffs, the crossing in white…); the chronicle holds the tree of your tale, what has happened lit, what was missed struck through, what is to come in grey; when a great man comes over (Xun Yu, the thrice-visited cottage) his portrait stands large beside his abilities and aptitudes. The endings are the realm united, one leg of the tripod, enduring to the end, and the fall.

| | 键盘 · Keyboard | 鼠标与触屏 · Mouse and touch |
|---|---|---|
| 平移镜头 · Pan the camera | 方向键 / WASD · arrows / WASD | 拖动，或点小地图 · drag, or tap the minimap |
| 缩放（拉近时镜头放低） · Zoom (the camera lowers as it nears) | + / - | 滚轮、双指 · wheel, two fingers |
| 暂停、速度 · Pause, speed | 空格，1–5（战场上 1–3） · Space, 1–5 (1–3 on the field) | 顶栏按钮 · the top bar |
| 选城、军团、部队 · Choose a place, army or unit | Tab，Enter | 点按 · tap |
| 行军目的地、部队移动或进攻 · March, move or attack | — | 选中后点地图或格子 · tap the map or a hex after choosing |
| 关对话框、取消 · Close, cancel | Esc | 「关闭」· Close |

设置里可以关音效、关配乐、减弱动画（系统设置了「减少动态效果」时自动减弱，标题页的镜头也不再漂移）和切换语言；地址加 `?quality=low|medium|high` 可指定画质（默认按设备自动选：软件渲染和触屏为低，内存小的为中）。三个存档位加一个每月自动存档，也能导出成文件再导入。 · The settings turn off the sound or the music, reduce motion (reduced already when the system asks, and then the title's camera holds still) and switch the language; `?quality=low|medium|high` in the address sets the picture quality (chosen by the device otherwise: low for software rendering and touch, medium for little memory). There are three slots and a monthly autosave, and a game can be exported to a file and imported again.

## 数值与节奏 · Numbers and pace

规则全在 `src/sim/`（不碰页面和引擎，可在 Node 里跑；天下的地形 `land.mjs` 和六角格 `hexgrid.mjs` 也在这里，所以战斗和画面看的是同一片地），数据在 `src/data/`。`node tools/balance.mjs [种子] [演义]` 让三十四路诸侯全由电脑执掌，从 184 年推到 280 年，每十年记一笔。玩家参与的战斗打在天下图的格子上；电脑之间、看不见的战斗用按地点山水生成的战场，节奏和以前一致。下表是种子 7、曹魏演义的一次推演：

The rules live in `src/sim/` (free of the page and the engine, so they run in Node; the land of `land.mjs` and the hexes
of `hexgrid.mjs` are there too, so battles and the picture read the same ground), the data in `src/data/`.
`node tools/balance.mjs [seed] [tale]` puts all thirty-four lords in the computer's hands and runs from 184 to 280,
with a line every ten years. Battles of the player are fought on the hexes of the realm; the computer's among
themselves, unseen, on ground made from the place's lie of the land, which keeps the old pace. One run, seed 7,
Cao Cao's tale:

| 年 · Year | 势力 · Powers | 最大的三家（城） · The three greatest (cities) | 史实事件 · Events |
| --- | --- | --- | --- |
| 184 | 34 | 汉室 3、刘焉 3、刘表 3 | — |
| 190 | 19 | 董卓 19、刘焉 9、袁绍 8 | turbansFall, eunuchs, dongEnters, lvbuTurns, c_chenliu, coalition |
| 200 | 8 | 袁绍 29、董卓 12、刘焉 10 | moveCapital |
| 210 | 7 | 袁绍 34、袁术 11、刘焉 11 | — |
| 220 | 5 | 袁绍 37、刘焉 24、袁术 7 | — |
| 230 | 5 | 袁绍 38、刘焉 26、严白虎 5 | — |
| 240 | 3 | 袁绍 46、刘焉 27、袁术 2 | — |
| 250 | 3 | 袁绍 44、刘焉 25、袁术 6 | — |
| 260 | 3 | 袁绍 44、刘焉 25、袁术 6 | — |
| 270 | 3 | 袁绍 44、刘焉 25、袁术 6 | — |
| 280 | 3 | 袁绍 44、刘焉 25、袁术 6 | — |
tally {"siegeWon":386,"ratio":9511.089951404658,"taken":464,"takenNeutral":61,"fieldWon":221,"fieldLost":447,"siegeLost":831}

开局各城钱粮按势力大小给，电脑在难度「难」时多三成。电脑在开局前三百天（易 540 天、难 120 天）不打玩家；在史实演义里，汉室、丁原、董卓等要在剧情里出场的势力在各自的事件之前不被电脑吞并。百年推演一天约 2 毫秒（Node）。 · Each power starts with coin and grain by its size, and the computer's with a third more on hard. The computer leaves the player be for the first three hundred days (540 on easy, 120 on hard); in the tales of history the powers the story needs — the court, Ding Yuan, Dong Zhuo and others — are not swallowed by the computer before their events. A century takes about 2 ms a day in Node.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `createWorld3DApp`（`@egret/engine/webgl2/world3d`） | 起 3D 程序：按设备选画质（低：无阴影无后期；中高：阴影、泛光、FXAA，高画质加环境光遮蔽）、帧慢时自动降分辨率；`app.stop` / `start` 随页面隐藏与显示 · starts the 3D app: quality by device (low without shadows or post; medium and high with shadows, bloom and FXAA, high with ambient occlusion), resolution lowered when frames are slow; stopped and started as the page is hidden and shown | `src/view3d/stage.mjs`, `src/main.mjs` |
| `createTerrainStream3D` + `createHeightField3D` + `colorAt` | 天下的地形按镜头远近一块块加载（64 单位见方，每单位一个采样），高度和颜色都来自 `sim/land.mjs`，远处的块自动降低细节 · the land comes in tiles around the view (64 units square, a sample a unit), heights and colours from `sim/land.mjs`, far tiles at lower detail | `src/view3d/terrain.mjs` |
| `createCustomShader3D`（片元钩子） | 地面：像素级的草土细纹、六角格细线（按像素大小淡出）、鼠标所指与选中的格子、战场以外变暗；屋顶：瓦垄与瓦行 · the ground: grass and earth grain per pixel, the thin hex lines (fading with the pixel size), the hex under the pointer and the chosen hex, the land outside a battlefield dimmed; roofs: rows and courses of tiles | `src/view3d/terrain.mjs`, `src/view3d/cities.mjs` |
| `createWater3D`、`createWaterMaterial3D` | 有浪、折射、岸边泡沫的海；江河是顺着河道铺的水带，水位从源头到入海逐段降低；湖面 · the sea with waves, refraction and foam at the shore; rivers as ribbons along their beds, falling from source to mouth; lakes | `src/view3d/water.mjs` |
| `createGeometryBuilder3D` + 基本体 | 七十六座城（城墙、垛口、角楼、城门楼、重檐大殿、街巷民居）、关隘、渡口、树木、九种兵模（步卒、刀盾、弓弩、骑兵、弓骑、冲车、器械、战船、帅旗）全用代码搭成 · seventy-six cities (walls, battlements, corner towers, gate towers, a double-eaved hall, streets of houses), passes, ferries, trees and nine kinds of soldier (foot, shield, bow, horse, mounted bow, ram, engine, ship, standard) all built in code | `src/view3d/cities.mjs`, `src/view3d/troops.mjs`, `src/view3d/flora.mjs` |
| `createSurfaceMaterial3D({ surface: 'brick' })` | 城墙与城楼的砖面，按世界坐标画在像素上，不用贴图 · the brick face of walls and towers, drawn per pixel from the world position with no texture | `src/view3d/cities.mjs` |
| `InstancedMesh3D` + 每实例颜色 | 每块地的树林；所有兵模每帧重排（行军起伏、交战前冲、溃逃四散），战袍和旗按势力着色；城头旗帜易主换色；箭雨 · the woods of each tile; every soldier laid out each frame (bobbing on the march, lunging in melee, scattering in a rout), coats and flags dyed by power; banners on the walls change colour with the holder; arrows in flight | `src/view3d/flora.mjs`, `src/view3d/troops.mjs`, `src/view3d/cities.mjs`, `src/view3d/battle3d.mjs` |
| `createScreenMarkers3D` + `projectToViewport3D` | 城关津和军团、战场部队头顶的网页名牌（旗号印、名字、兵力条、主将头像）；伤害数字和战法大字跟着 3D 位置走 · page plates over places, armies and battle units (the seal, the name, a bar of strength, the commander's face); losses and tactics written large follow their 3D place | `src/view3d/realm.mjs`, `src/view3d/battle3d.mjs` |
| `Raycaster3D.setFromCamera` | 屏幕上的点换成地上的点：拖动平移、朝指针缩放、点城、点军团、点战场格子 · a point of the screen to a point of the ground: dragging, zooming toward the pointer, tapping places, armies and hexes | `src/view3d/stage.mjs`, `src/view3d/realm.mjs` |
| `createParticleEmitter3D` | 战场上着火的格子冒火冒烟，战法和城门被破时迸火星与尘土 · fire and smoke on burning hexes, sparks and dust when a tactic is unleashed or the gate breaks | `src/view3d/battle3d.mjs` |
| `createFatLine3D`、`createRingGeometry3D` | 选目的地时贴地的行军路线；选中的城、军团和部队脚下的光环 · the march line on the ground while choosing a destination; the ring under the chosen place, army or unit | `src/view3d/realm.mjs`, `src/view3d/battle3d.mjs` |
| 半球光、平行光（级联阴影）、渐变天空、线性雾、后期 · hemisphere and directional light (cascaded shadows), gradient sky, linear fog, post | 日光随镜头移动让阴影罩住所见；雾随拉远而推远 · the sun follows the view so its shadows cover what is seen; the haze moves out as the camera draws back | `src/view3d/stage.mjs` |
| `createBrowserAudio` + 混音器（`@egret/engine/web/audio`） | 音效和配乐两条总线；天下与战场两段无缝循环的配乐交叉淡入淡出；同一音效限三个声部 · two buses for effects and music; the realm's and the field's seamless themes crossfade; at most three voices of one effect | `src/audio/sound.mjs` |
| `encodeWav`（`@egret/engine/kit`） | 十七个音效和两段配乐都在代码里合成后编码 · seventeen effects and two themes made in code and encoded | `src/audio/sound.mjs` |
| `createSaveStore` + `browserSaveStorage`（`@egret/engine/kit`、`web/kit`） | 设置一处、三个存档位和自动存档各一处：有版本号，坏档另放一边，浏览器拒绝写入时提示 · settings in one place, three slots and the autosave each in their own: versioned, a broken save set aside, a refusing browser told | `src/saves.mjs`, `src/main.mjs` |

## 已验证 · Verified

- `node --test test/*.test.mjs`：28 项全过——规则 15 项（天下图连通、数据互相对得上、同一种子同一段历史、钱粮征兵营建、科技与两路互斥、出征行军围城取城、回城驻守、战场相克与冲车破门与赤壁火攻与关羽的「武圣」、外交与使者、寻访登用招贤令、俘虏的处置、演义抉择、开局宽限、新人出仕、一统天下的结局）、存档 7 项、文字 4 项、引擎副本 2 项（含 `src/sim/` 全部模块不碰页面和引擎）。 · All 28 Node tests pass: 15 for the rules, 7 for saves, 4 for words, 2 for the engine copy (including that every module of `src/sim/` stays free of the page and the engine).
- `node test/accept.mjs`：无头 Chromium（SwiftShader 软件渲染）里 24 项全过——标题、设置和战场与截图基线一致；音效开关存进设置；标题切英文；新征程选季汉春秋，桃园结义的画轴展开；在 3D 天下里点平原城、出征、点南皮，军团上路围城；攻城时亲自指挥：布阵、开战、四倍速、选中部队（镜头跟着它），仗打在南皮城下的格子上，打完看到战果；存进存档位一，刷新后从标题读回同一天；游戏里切英文；手机竖屏下城池详情从底部升起、舞台竖排；坏掉的自动存档另放一边并在标题提示；控制台无错误。 · In headless Chromium with software rendering, all 24 checks of the walk pass, the battle fought on the hexes below Nanpi, with a clean console.
- `node tools/quality.mjs NineProvinces`：除 F1 外的自动项全部达标，见 [QUALITY.md](QUALITY.md)。 · Every automatic quality item but F1 passes; see QUALITY.md.
- `node tools/balance.mjs`：上面「数值与节奏」的表就是它的输出。 · The table above is its output.
- 截图核对过：标题（中英）、开局、天下图与城池详情、小地图、出征、布阵、城下攻战（战法大字、伤害数字、箭雨）、三顾茅庐的来投画面、武将详情（六维与适性）、科技树、演义树、设置，以及手机竖屏的天下图和城池详情。 · Screenshots checked: the title in both languages, setup, the realm and a city's details, the minimap, mustering, deployment, an assault below the walls (tactics written large, losses, volleys), the newcomer of the thrice-visited cottage, an officer's sheet with six abilities and aptitudes, the trees of inventions and of the tale, the settings, and on a phone held upright the realm and a city's details.
- 地形在 Node 里算一个采样点约 1.3 微秒，一块地（65×65）约 6 毫秒。 · The land takes about 1.3 µs a sample in Node, about 6 ms a tile of 65 × 65.

## 已知问题 · Known issues

- 只在软件渲染（SwiftShader）下跑过：低画质下标题约 230–280 ms 一帧（p95），主要花在逐像素的地面着色上；有显卡的电脑和手机实机未运行，中、高画质的阴影、泛光和水面折射也只在软件渲染下看过截图。 · Run only under software rendering (SwiftShader): at low quality the title takes about 230–280 ms a frame (p95), mostly the per-pixel shading of the ground; machines with a GPU and real phones were not run, and the shadows, bloom and refracting water of medium and high quality were seen only as screenshots under software rendering.
- 地块在主线程上生成，快速拖过大片地图时每帧最多生成两块（各约 6 ms），会有轻微卡顿。 · Tiles of land are made on the main thread, at most two a frame (about 6 ms each), so a fast drag across the map can stutter slightly.
- 城的模型只在镜头靠近时才搭建，第一次飞到远处时城会在一两帧后出现。 · A city's model is built when the camera first comes near, so on a first flight far away it appears a frame or two late.
- 江河按史料粗略的经纬度画成，和城的相对位置与实际地理有出入；碰到城墙的河段会绕开城池。 · Rivers follow rough longitudes and latitudes, so where they run relative to the cities is not exact; a river that met the walls bows round the city.
- 电脑之间的战斗不在地图格子上打（见「数值与节奏」）；在地图上打时城小，守城弓手集中，强攻比以前难。 · The computer's own battles are not fought on the map's hexes (see Numbers and pace); on the map a town is small and its archers close together, so an assault is harder than it was.
- 只在无头环境里听过合成的波形，没有用扬声器听过。 · The synthesized sound was checked as waveforms only, never through a speaker.
- 连环计等少数史实事件要求的人物若先在战斗中阵亡或被俘，事件就会错过。 · A few events of history, such as the chain stratagem, are missed when the men they need have already fallen or been taken in battle.
- 平衡只靠电脑对电脑的百年推演调过，没有真人玩满一局的记录。 · The balance was tuned only by the computer playing itself for a century; no person has played a whole game.
- 品质验收未达标 · Quality items failing（[QUALITY.md](QUALITY.md)，2026-11-23，无头 Chromium + SwiftShader · headless, software rendering）：F1 桌面帧时间 p95 ≤ 16.7 ms（p95 233.3 ms over 25 frames）。

## 已解决 · Solved

- 第一版的天下图是一张平面手绘图加网页面板，像网页不像游戏：表现层改用引擎的 World3D 重做——3D 六角格地形、代码搭的城池与兵模、仗在地图上打、深色铜边的游戏界面、带光影的画像、科技树和演义树。 · The first version's realm was a flat painted map with web panels, more a page than a game: the presentation was rebuilt on the engine's World3D — a 3D land of hexes, cities and soldiers made in code, battles on the map, a dark interface edged in bronze, lit portraits, and trees of inventions and of the tale.
- 战场取自地图后，攻城部队会被河挡住：道路过河的格子是渡口（浅滩），可以涉水。 · Once the field came from the map, besiegers could be cut off by a river: where a road crosses a river the hex is a ford and can be waded.
- 城墙偶尔落在战场边外：战场的位置夹在让整座城都在格内、离边一格的范围里。 · The walls sometimes fell off the edge of the field: the field is placed so the whole city lies within it, a hex from its edges.
- 小城里守军见敌军到了城门就出城迎战，被围城部队包围歼灭：城门未破时守军只对付进了城的敌人。 · In a small town the garrison came out as soon as the enemy reached the gate: while the gate holds, it meets only those inside the walls.
- 河流穿过城池：河道在城附近平滑地绕开城墙。 · Rivers ran through cities: near a city the course bows smoothly round its walls.
- 地形块的颜色和高度要各算一遍：一次算出、按块记下，建网格时直接读。 · Each tile's colours and heights were worked out twice: once now, kept by tile and read as its meshes are built.
- 英文界面里势力印章仍是汉字：英文下印章写势力英文名的首字母。 · In English the powers' seals still showed Chinese: they show the initial of the English name.
- 同一种子两局结果不同、战斗太慢、守军只守城墙、新人留在名册里、玩家开局即被吞并、后期大国囤兵不出：见此前的修正（复制后排序、距离表、回防本营、清名册、开局宽限与史实保护、兵力上限与断粮）。 · Earlier fixes still stand: copying before sorting, the distance table, turning to the keep, clearing the roll, the grace at the start with protection for history, and caps on troops with starving sieges.
- 引擎方面见 [ENGINE-NOTES.md](ENGINE-NOTES.md)。 · On the engine side see ENGINE-NOTES.md.

## 未完成 · Unfinished

- 只有 184 年一个剧本，没有 190、200、208 等后期开局。 · Only the scenario of 184; none starting in 190, 200 or 208.
- 没有武将单挑和舌战，特性里的「单挑」效果暂时只影响战斗攻击。 · No duels or debates; the duel effect of traits counts only in battle for now.
- 没有官职、爵位和婚姻；武将忠诚只随赏赐、俘虏和君主更替变化。 · No offices, titles or marriages; loyalty moves only with gifts, captivity and a change of lord.
- 天下没有天气、昼夜和季节变化；战场的夜战只有乌巢一场。 · No weather, day and night or seasons on the realm; the only night battle is Wuchao.
- 兵模是固定姿势的小件，靠整体起伏与前冲表现动作，没有骨骼动画。 · Soldiers are rigid figures that move as a whole, bobbing and lunging, with no skeletal animation.
- 武将五百六十六位，其余靠每年生成的新人补足；没有自建武将。 · Five hundred and sixty-six officers, the rest made up by new men each year; no officers of your own making.

## 目录结构 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `index.html`, `style.css` | 页面、import map、3D 画布与名牌层、界面的全部样式 · the page, the import map, the 3D canvas and its layer of plates, and the styles of the interface |
| `src/main.mjs` | 入口：3D 天下、时间推进、收件箱、玩家的每个操作、存档、按键 · the entry: the 3D realm, time, the inbox, every action of the player, saves, keys |
| `src/data/` | 天下图与地理、势力、武将（五个分表）、特性、战法、宝物、兵种阵型地形、科技 · the map and its land, powers, officers (in five tables), traits, tactics, treasures, troops, formations and ground, inventions |
| `src/sim/` | 规则：世界与经济、军事与行军围城、六角战场、人物、外交、电脑君主、演义、新人；天下的地形 `land.mjs`、六角格 `hexgrid.mjs`、路线 `ways.mjs`、机动与适性 `aptitude.mjs` · the rules: the world and its economy, armies, marches and sieges, the hex field, people, diplomacy, the computer's lords, the tale, new officers; the land, the hexes, the ways and aptitude |
| `src/view3d/` | 3D 画面：舞台与镜头、地形、水、树、城池关隘渡口、道路、兵模、天下、地图上的战斗 · the 3D picture: the stage and camera, the land, water, trees, cities, passes and ferries, roads, soldiers, the realm, the battle on the map |
| `src/view/` | 平面画法（小地图底图）、武将画像、徽章、名字 · painting on the flat (the minimap's land), portraits, medallions, names |
| `src/ui/` | 顶栏与详情、名牌、小地图、对话框（含科技树和演义树）、战斗界面、标题与开局 · the top bar and details, plates, the minimap, dialogs (with the trees), the battle interface, the title and setup |
| `src/audio/sound.mjs`, `src/i18n.mjs`, `src/saves.mjs` | 合成的声音与配乐、中英文、存档 · sound and themes made in code, both languages, saves |
| `tools/balance.mjs` | 百年推演 · the century run |
| `test/*.test.mjs`, `test/accept.mjs`, `test/baseline/` | Node 测试、浏览器验收和截图基线 · Node tests, browser acceptance and baselines |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `9d801beb0667dac833a57ae20a09b552e862b275`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。用到的入口：`@egret/engine`、`@egret/engine/world3d`、`@egret/engine/webgl2/world3d`、`@egret/engine/kit`、`@egret/engine/web/kit`、`@egret/engine/audio`、`@egret/engine/web/audio`。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit
`9d801beb0667dac833a57ae20a09b552e862b275`, copied by the engine's `tools/vendor-game.mjs`; see
[vendor/SOURCE.md](vendor/SOURCE.md). Entries used are listed above.

```sh
node tools/vendor-game.mjs <this folder> @egret/engine @egret/engine/web/kit @egret/engine/kit @egret/engine/audio @egret/engine/web/audio @egret/engine/world3d @egret/engine/webgl2/world3d
```
