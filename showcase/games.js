// Add one entry and a matching media/<id>/ directory when adding a case.
// A feature's source is relative to the game's folder.
export const FEATURED_ID = 'snow';

export const GAMES = [
  {
    id: 'fps', folder: 'FPS', kind: '3d',
    scenes: [
      { zh: "青岚水电站 · 堆场交锋", en: "Qinglan station · Cargo yard encounter" },
      { zh: "水电站 · 第一人称视角", en: "Hydro station · First-person view" },
      { zh: "厂区 · 情报终端", en: "Power station · Intelligence terminal" },
    ],
    zh: "断流行动", en: "Operation Cutoff",
    genre: { zh: "第一人称射击", en: "First-person shooter" },
    summary: { zh: "穿越青岚水电站的堆场与厂房，完成任务后撤离。", en: "Cross a hydro station’s yard and powerhouse, finish the objective and extract." },
    features: [
      {
        title: { zh: "WebGL2 与 WebGPU", en: "WebGL2 and WebGPU" },
        description: { zh: "默认使用 WebGL2。在支持 WebGPU 的设备和浏览器上，可在试玩网址加上 ?backend=webgpu，启用白鹭 World3D 的 WebGPU 后端。", en: "WebGL2 is the default. On supported devices and browsers, add ?backend=webgpu to the game URL to enable Egret’s World3D WebGPU backend." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "glTF 场景资产", en: "glTF scene assets" },
        description: { zh: "角色和场景模型由引擎加载，重复道具可以实例复用。", en: "The engine loads characters and props, including repeated instances." },
        source: 'src/asset-models.mjs',
      },
      {
        title: { zh: "角色骨骼蒙皮", en: "Skeletal skinning" },
        description: { zh: "士兵骨骼驱动上身、手臂和腿部姿态。", en: "Skinned skeletons drive the soldiers’ upper bodies, arms and legs." },
        source: 'src/soldier-skin.mjs',
      },
    ],
  },
  {
    id: 'snow', folder: 'SnowTemple', kind: '3d',
    imageFocus: '75% center',
    scenes: [
      { zh: "雪路 · 林冲执枪", en: "Snow road · Lin Chong" },
      { zh: "草料场 · 近身交锋", en: "Fodder yard · Close combat" },
      { zh: "山神庙 · 林冲与陆谦对峙", en: "Mountain temple · Lin Chong faces Lu Qian" },
    ],
    zh: "风雪山神庙", en: "Snow at the Mountain Temple",
    genre: { zh: "武侠动作", en: "Wuxia action" },
    summary: { zh: "风雪夜，林冲从草料场一路打到山神庙。", en: "Fight through a snowy night as Lin Chong, from the fodder yard to the mountain temple." },
    features: [
      {
        title: { zh: "动态分辨率", en: "Dynamic resolution" },
        description: { zh: "自动画质下，雪路与战斗会随帧率调整 3D 绘制分辨率。", en: "On auto quality, the 3D render scale follows frame rate on the snowy road and in combat." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "glTF 角色模型", en: "glTF characters" },
        description: { zh: "用白鹭加载林冲、陆谦等角色的网格与贴图，服务近景武打。", en: "Egret loads textured meshes for Lin Chong, Lu Qian and the other fighters." },
        source: 'src/view/characters.mjs',
      },
      {
        title: { zh: "实例化战斗特效", en: "Instanced combat effects" },
        description: { zh: "用实例批次绘制部分粒子、脚印与落枪演出。", en: "Instance batches draw effects such as particles, footprints and falling spears." },
        source: 'src/view/effects.mjs',
      },
    ],
  },
  {
    id: 'regiments', folder: 'FiveRegiments', kind: '3d',
    scenes: [
      { zh: "王城宫前 · 黄昏以一敌二：陷阵营抡起长斧，迎着骑马冲来的银翎卫，武射史在后", en: "Before the palace · One against two at dusk: the Berserker Battalion raises his long axe at the charging Silver Wing Guard, the Archer behind" },
      { zh: "竹林古道 · 薄雾里银翎卫骑马冲向武射史", en: "Bamboo path · The Silver Wing Guard rides at the Archer through the mist" },
      { zh: "卷首 · 五营列阵县城校场", en: "Title · The five regiments drawn up on the county drill ground" },
    ],
    zh: "五营争锋", en: "Five Regiments",
    genre: { zh: "第三人称冷兵器对决", en: "Third-person cold-steel duels" },
    summary: { zh: "从羽林卫、虎步、陷阵营、银翎卫、武射史里选一营，技能、天赋、战技和生命值按原作的公告与物品面板，伤害公式按武器和护甲面板推算，一刀一成血、打得有来有回。在校场、桃林、竹林、雪原单挑另外四营，最后在王城宫前以一敌二；银翎卫骑马作战、马上架枪。", en: "Choose one of five regiments; skills, talents, weapon arts and health follow the original's notes and item cards, and a damage formula worked out from the weapon and armour cards makes each blow take about a tenth of a man's health, so fights go back and forth. Beat the other four, then two at once before the palace; the Silver Wing Guard fights from the saddle and couches his ji." },
    features: [
      {
        title: { zh: "骨骼人物、动作捕捉与反向动力学", en: "Rigged men, motion capture and inverse kinematics" },
        description: { zh: "五个生成的骨骼人物和一匹四足骨骼的披甲战马由 loadGltf3D 载入，站走跑和侧移是重定向过的动作捕捉，按速度混合，马的步态按落蹄顺序用代码驱动；出刀、格挡、二十一个技能和战技是按兵器写的姿态，用两骨反向动力学让双手握住兵器，再叠加腰身扭转、受击和倒地。", en: "Five generated, rigged men and a rigged armoured horse are loaded with loadGltf3D; standing, walking, running and side steps are retargeted motion capture blended by speed and the horse's gaits are driven in code by their footfalls, while blows, guards, twenty-one skills and the weapon arts are poses written for each weapon, the hands brought onto it by two-bone IK, with the twist of the body, hits and falls laid over them." },
        source: 'src/view/figure.mjs',
      },
      {
        title: { zh: "五个场景的光与天气", en: "Light and weather for five places" },
        description: { zh: "每个场景一张天空全景图经 createCubeTextureFromEquirect3D 做背景和环境光，扫描材质铺地，太阳级联阴影、指数雾，后处理里的泛光、环境光遮蔽、暗角和调色各有一套，落花、飘雪、薄雾和火星用 GPU 粒子。", en: "Each place's sky panorama becomes its background and image-based light through createCubeTextureFromEquirect3D, over scanned ground materials, with cascaded sun shadows, exponential fog, a grade of bloom, ambient occlusion and vignette of its own, and GPU particles for petals, snow, mist and embers." },
        source: 'src/view/stage.mjs',
      },
      {
        title: { zh: "刀路、格挡、伤害公式与读刀的电脑", en: "Lines, guards, a damage formula and a computer that reads them" },
        description: { zh: "规则层按每秒六十次的固定步长算四路刀路、格挡、弹刀、踢、体力、技能、战技与怒气、护甲与偏斜、骑马与架枪；伤害公式的推算表和实测在 Node 里跑。电脑对手有反应时间，会读刀路、假动作、踢盾，一打二时用一个令牌轮流压上。同一种子同一结果。", en: "The rules run at a fixed sixty ticks a second: four lines, guards, deflections, kicks, stamina, skills, weapon arts and rage, armour and deflection, riding and the couched lance; the damage formula's table and its measurement run in Node. The computer's men have a reaction time, read your line, feint and kick shields, and take turns with a token when two fight you. One seed gives one result." },
        source: 'src/sim/fight.mjs',
      },
      {
        title: { zh: "刀光、火花与动态几何", en: "Blade trails, sparks and live geometry" },
        description: { zh: "刀光拖尾每帧改写一条动态几何的顶点，剑气、蛛网和落地冲击波用环形几何与无光照材质，火花、血雾、尘土和毒雾用粒子发射器，命中时一盏点光一闪。", en: "Blade trails rewrite the vertices of a live geometry each frame; the flying cut, the web and the ring of a slam use ring geometry and unlit materials; sparks, blood, dust and poison come from particle emitters, and a point light flashes on a hit." },
        source: 'src/view/effects.mjs',
      },
    ],
  },
  {
    id: 'nine', folder: 'NineProvinces', kind: '3d',
    scenes: [
      { zh: "天下图 · 洛阳城墙、河道渡桥与连接各城的道路", en: "The realm · Luoyang's walls, river crossings and roads linking the cities" },
      { zh: "南皮之战 · 关羽率枪兵攻城，战场上实时显示城门耐久", en: "The siege of Nanpi · Guan Yu leads his spearmen to the gate as its remaining strength updates live" },
      { zh: "演武沙盘 · 鹤翼拒骑，黄忠选择百步穿杨的施策目标", en: "Tactical sandbox · In Crane Wing Defense, Huang Zhong selects a target for his Hundred-Pace Shot" },
    ],
    zh: "九州烽烟", en: "Nine Provinces Ablaze",
    genre: { zh: "三国即时大战略", en: "Three Kingdoms real-time grand strategy" },
    summary: { zh: "从中平元年黄巾起事到太康元年：执掌三十四路诸侯之一，经营城池、招揽五百多位武将、研究科技树、合纵连横；整个天下是一张可以缩放旋转的三维六角地图，军团按天行军，交兵时就在地图上那片地方亲自指挥即时战斗，攻城要先破城门；六条演义各有剧情树与抉择。", en: "From the Yellow Turbans in 184 to the Jin in 280: lead one of thirty-four lords, run cities, win over five hundred officers, climb a tree of inventions and make alliances. The whole realm is one 3D map of hexes to zoom and turn; armies march day by day, battles are commanded in real time on the very ground where they meet, and a siege must break the gate first; six tales branch with events and choices." },
    features: [
      {
        title: { zh: "流式加载的六角地形", en: "Streamed terrain of hexes" },
        description: { zh: "三千六百乘两千六百的天下由地形流按镜头远近加载高度块，每块的山、水、林、路颜色在着色器里混合，六角格线、悬停和选中的高亮也在同一个自定义着色器里画，远看渐隐。", en: "A realm 3,600 by 2,600 across is loaded by a terrain stream in height tiles around the camera; each tile's colours of hill, water, wood and road are mixed in a shader, and the hex lines, hover and chosen highlights are drawn in the same custom shader, fading out far away." },
        source: 'src/view3d/terrain.mjs',
      },
      {
        title: { zh: "代码搭出的城池", en: "Cities built in code" },
        description: { zh: "七十六座城按规模搭出城墙、角楼、城门、屋顶和里坊，用几何构建器拼成，城墙用砖面材质；镜头走近才搭建，各城的旗帜共用一个实例化网格，换主时只改颜色。", en: "Seventy-six cities raise walls, corner towers, gates, roofs and wards by their size, put together with the geometry builder, walls in a brick surface material; each is built as the camera comes near, and all their banners share one instanced mesh, recoloured when a city changes hands." },
        source: 'src/view3d/cities.mjs',
      },
      {
        title: { zh: "在天下图上开战", en: "Battles on the map itself" },
        description: { zh: "交兵时把交战处二十二乘十四格的那片地切成战场，部队是实例化的小兵，头顶的名牌用屏幕标记跟随，点选靠射线拾取六角格，战法和火攻用粒子发射器。", en: "When armies meet, a 22 by 14 window of hexes where they stand becomes the field; troops are instanced figures, their plates follow through screen markers, taps pick hexes by ray casting, and tactics and fire come from particle emitters." },
        source: 'src/view3d/battle3d.mjs',
      },
      {
        title: { zh: "海、湖与河", en: "Sea, lakes and rivers" },
        description: { zh: "海是一整片带浪的水面网格；河道沿地形里刻出的河床铺成水带、湖按湖岸铺成平面，共用一种水材质，时间推动波纹；低画质换成不折射的简单水面。", en: "The sea is one wide water mesh with waves; rivers are ribbons laid along beds carved into the terrain and lakes level sheets within their shores, sharing one water material with ripples driven by time; low quality swaps in simple water without refraction." },
        source: 'src/view3d/water.mjs',
      },
      {
        title: { zh: "代码合成的声音与两段配乐", en: "Sound and two themes made in code" },
        description: { zh: "十七个音效和天下、战场两段无缝循环的配乐都在代码里合成，经 encodeWav 交给引擎混音器，playMusic 在两段之间交叉淡入淡出。", en: "Seventeen effects and the seamless themes of the realm and the field are made in code, handed to the engine's mixer through encodeWav, and playMusic crossfades between the two." },
        source: 'src/audio/sound.mjs',
      },
    ],
  },
  {
    id: 'jy', folder: 'JY', kind: '3d',
    scenes: [
      { zh: "3D 江湖地图 · 河洛客栈外乘船寻路", en: "3D world map · Sailing near Heluo Inn" },
      { zh: "小虾米居 · 序章对白", en: "Xiaoxiami’s house · Prologue dialogue" },
      { zh: "密集战斗 · 移动格预览", en: "Crowded battle · Movement grid preview" },
    ],
    zh: "金庸群侠传", en: "A Tribute to Heroes of Jin Yong",
    genre: { zh: "武侠角色扮演", en: "Wuxia role-playing" },
    summary: { zh: "走江湖、访客栈、招募同伴，体验经典回合制战斗。向《金庸群侠传》、智冠公司与金庸先生致敬。", en: "Explore inns, recruit companions and fight classic turn-based battles. A tribute to Heroes of Jin Yong, Soft-World and Jin Yong." },
    features: [
      {
        title: { zh: "三维场景与模型加载", en: "3D scenes and model loading" },
        description: { zh: "客栈用原生 World3D 场景加载 glTF 角色和环境模型。", en: "Inns load character and environment models through native World3D." },
        source: 'web/jyx2/scene/native-inn-view.mjs',
      },
      {
        title: { zh: "角色骨骼动画", en: "Character skeletal animation" },
        description: { zh: "骨骼绑定与动画混合驱动原生剧情角色。", en: "Skinning and animation mixers bring native scene characters to life." },
        source: 'web/jyx2/scene/native-scene-actor.mjs',
      },
      {
        title: { zh: "战场实例化", en: "Instanced battle terrain" },
        description: { zh: "重复地形与布景共享实例，服务于回合制战场。", en: "Repeated terrain and scenery share instances on the turn-based battlefield." },
        source: 'web/jyx2/scene/native-battle-terrain.mjs',
      },
    ],
  },
  {
    id: 'rally', folder: 'Rally', kind: '3d',
    scenes: [
      { zh: "山水环道 · 牌楼下起跑", en: "Circuit · Starting under the gate" },
      { zh: "红旗赛段 · 追赶前车", en: "Red-banner section · Chasing the kart ahead" },
      { zh: "灯笼路段 · 加速冲刺", en: "Lantern section · Boosting through" },
    ],
    zh: "锦绣飞车", en: "Jinxiu Rally",
    genre: { zh: "卡丁车竞速", en: "Kart racing" },
    summary: { zh: "绕过牌楼、石桥和长城，用漂移、尾流和道具争抢第一。", en: "Drift past gates, bridges and the Great Wall, using items and slipstreams to race for first." },
    features: [
      {
        title: { zh: "赛道水面倒影", en: "Track water reflections" },
        description: { zh: "高画质下，湖面每隔三帧更新一次赛道倒影。", en: "On high quality, the lake updates its track reflection every third frame." },
        source: 'src/scenery.mjs',
      },
      {
        title: { zh: "看台合批与实例化", en: "Merged and instanced grandstands" },
        description: { zh: "看台观众合并成网格，挥动的旗帜以实例绘制。", en: "Spectators share a merged mesh, and their waving flags are instanced." },
        source: 'src/grandstand.mjs',
      },
      {
        title: { zh: "glTF 赛道模型", en: "glTF track models" },
        description: { zh: "白鹭加载赛道资产，并将它们接入实时场景。", en: "Egret loads track assets and places them in the live scene." },
        source: 'src/track-models.mjs',
      },
    ],
  },
  {
    id: 'fengshen', folder: 'FengshenChronicle', kind: '2d',
    scenes: [
      { zh: '丹霞渡 · 断潮君的空心潮环', en: 'Danxia Ford · The Tidebreaker’s ring' },
      { zh: '西岐 · 玄甲、方士、游侠择业', en: 'Xiqi · Choose Vanguard, Ritualist, or Ranger' },
      { zh: '朝歌外城 · 镇门将的十字火线', en: 'Chaoge outer city · The Marshal’s crossfire' },
    ],
    zh: '封神 · 西岐战纪', en: 'Fengshen Chronicle',
    genre: { zh: '单机动作角色扮演', en: 'Single-player action RPG' },
    summary: { zh: '操纵玄甲、方士或游侠，打过四章与多阶段首领，刷取战利品并精锻行装。', en: 'Fight four chapters and multi-phase bosses as a Vanguard, Ritualist, or Ranger. Find rare loot and forge better gear.' },
    features: [
      {
        title: { zh: '原生 2D 与 WebGL2', en: 'Native 2D and WebGL2' },
        description: { zh: '以白鹭浏览器游戏容器统一游戏循环和画布缩放，支持 PC 及触屏。', en: 'Egret’s browser game host drives the loop and scales the canvas for desktop and touch.' },
        source: 'src/main.mjs',
      },
      {
        title: { zh: '分图集与遮挡排序', en: 'Packed atlases and depth sorting' },
        description: { zh: '角色姿态、不同装备和特效打包进白鹭位图图集，人物、建筑和道具按脚底纵坐标排列。', en: 'Egret texture atlases pack character poses, equipped variants and effects. Sprites and scenery sort by their ground position.' },
        source: 'src/view.mjs',
      },
      {
        title: { zh: '动态图形与共享材质', en: 'Vector graphics and shared materials' },
        description: { zh: '白鹭 Graphics 绘制潮环、交叉火线和安全区，乾坤圈和命中反馈复用共享 2D 材质。', en: 'Egret Graphics draws tide rings, intersecting fire lines and safe areas. Ring and hit effects reuse shared 2D materials.' },
        source: 'src/view.mjs',
      },
    ],
  },
  {
    id: 'teahorse', folder: 'TeaHorseRoad', kind: '3d',
    scenes: [
      { zh: "滇南茶山 · 车队驶向牌坊", en: "Tea hills · Convoy approaching the gate" },
      { zh: "浅滩 · 车队涉水", en: "Ford · Convoy crossing" },
      { zh: "金沙峡谷 · 木吊桥", en: "Gorge · Timber suspension bridge" },
    ],
    zh: "茶马古道", en: "Tea Horse Road",
    genre: { zh: "车队穿越", en: "Convoy driving" },
    summary: { zh: "护送七十二捆茶，穿过浅滩、吊桥和高原山路。", en: "Escort 72 bundles of tea through a ford, over a rope bridge and along highland roads." },
    features: [
      {
        title: { zh: "流式地形", en: "Streamed terrain" },
        description: { zh: "按距离载入地块并切换细节，工作线程准备碰撞树与植被布置。", en: "Distance-based tiles and terrain detail use collision trees and planting data prepared in workers." },
        source: 'src/world/land.mjs',
      },
      {
        title: { zh: "六轮车辆物理", en: "Six-wheel vehicle physics" },
        description: { zh: "车身与射线车轮模拟悬挂、驱动与地面接触。", en: "Rigid chassis and raycast wheels simulate suspension, drive and road contact." },
        source: 'src/play/convoy.mjs',
      },
      {
        title: { zh: "动态水面", en: "Dynamic water" },
        description: { zh: "浅滩和峡谷使用三维水面，高画质下更新镜面倒影。", en: "World3D animates the ford and river, with planar reflections at high quality." },
        source: 'src/world/water.mjs',
      },
    ],
  },
  {
    id: 'wulin', folder: 'Wulin', kind: '3d',
    scenes: [
      { zh: "华山 · 山门与建筑布局", en: "Mount Hua · Sect grounds and building layout" },
      { zh: "江湖大地图", en: "Realm map" },
      { zh: "华山 · 掌门陆孤舟档案", en: "Mount Hua · Sect leader Lu Guzhou’s dossier" },
    ],
    zh: "武林天下", en: "Wulin",
    genre: { zh: "武侠门派经营", en: "Wuxia sect management" },
    summary: { zh: "执掌山门、经营产业、招徒布阵，在江湖大地图上决定和战。", en: "Build a sect, run its businesses and train disciples before choosing war or peace." },
    features: [
      {
        title: { zh: "大地图实例化", en: "Instanced realm map" },
        description: { zh: "房屋等重复地标在三维江湖大地图上成批绘制。", en: "Repeating landmarks are instanced across the 3D realm map." },
        source: 'src/view/realm.mjs',
      },
      {
        title: { zh: "山门射线点选", en: "Ray picking at the seat" },
        description: { zh: "将鼠标或触屏位置投到三维场景，选中建筑和空地。", en: "Projects cursor or touch positions into the scene to select buildings and empty plots." },
        source: 'src/view/seat.mjs',
      },
      {
        title: { zh: "战斗动作骨骼", en: "Battle animation rigs" },
        description: { zh: "角色骨骼与动画混合器驱动交战姿态。", en: "Skeletons and animation mixers drive the combat figures." },
        source: 'src/view/figure.mjs',
      },
    ],
  },
  {
    id: 'pandas', folder: 'jelly-pandas', kind: '3d',
    scenes: [
      { zh: "玩具岛 · 下砸击退糖果群", en: "Toy island · Slamming into the candy horde" },
      { zh: "果冻熊猫 · 角色与初始玩具", en: "Jelly Pandas · Panda selection and starter toys" },
      { zh: "玩具岛 · 蓄力跃起", en: "Toy island · Charged jump" },
    ],
    zh: "果冻熊猫", en: "Jelly Pandas",
    genre: { zh: "动作生存", en: "Action survival" },
    summary: { zh: "用会回弹的果冻熊猫下砸、翻滚、升级玩具，顶住糖果大军。", en: "Slam, roll and upgrade toys as a jiggly panda holding off a candy horde." },
    features: [
      {
        title: { zh: "果冻形变", en: "Jelly deformation" },
        description: { zh: "Jelly3D 表现跳跃、落地和撞击时的挤压回弹。", en: "Jelly3D adds squash and rebound to jumps, landings and impacts." },
        source: 'src/panda.mjs',
      },
      {
        title: { zh: "实例化与粒子", en: "Instancing and particles" },
        description: { zh: "成群敌人和攻击演出采用实例网格与 3D 粒子。", en: "Crowds and attacks use instanced meshes and 3D particles." },
        source: 'src/view.mjs',
      },
      {
        title: { zh: "双图形后端", en: "Dual graphics backends" },
        description: { zh: "默认使用 WebGL2。在支持 WebGPU 的设备和浏览器上，可在试玩网址加上 ?backend=webgpu 来启用 WebGPU。", en: "WebGL2 is the default. On supported devices and browsers, add ?backend=webgpu to the game URL to enable WebGPU." },
        source: 'src/main.mjs',
      },
    ],
  },
  {
    id: 'lantern', folder: 'LanternShadows', kind: '2d',
    scenes: [
      { zh: "蟠桃园 · 悟空以身外身迎战天兵", en: "Peach Orchard · Sun Wukong and his doubles battle the heavenly guards" },
      { zh: "南天门 · 悟空对阵脚踏风火轮的哪吒", en: "Southern Gate · Sun Wukong faces Nezha on his Wind-Fire Wheels" },
      { zh: "兜率宫 · 炉火旁迎战太上老君", en: "Tushita Palace · Sun Wukong faces Laozi by the flames" },
    ],
    zh: "灯影·闹天宫", en: "Lantern Shadows",
    genre: { zh: "皮影横版动作", en: "Shadow-puppet action" },
    summary: { zh: "在皮影幕布上挥棍、上挑、召分身，闯过南天门、蟠桃园和兜率宫。", en: "Sweep, lift and summon doubles on the shadow-puppet screen across three heavenly stages." },
    features: [
      {
        title: { zh: "Spine 皮偶骨骼", en: "Spine puppet rigs" },
        description: { zh: "加载 Spine 骨骼和附件，驱动分片皮偶和分身动作。", en: "Spine skeletons and attachments animate the segmented puppets and their doubles." },
        source: 'src/puppets.mjs',
      },
      {
        title: { zh: "Tiled 瓦片地图", en: "Tiled tile maps" },
        description: { zh: "以瓦片地图组织三幕布景，配合横向卷轴。", en: "Tile maps organise the three stages as the camera scrolls." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "2D 粒子效果", en: "2D particles" },
        description: { zh: "粒子发射器表现命中与舞台演出。", en: "Particle emitters drive hits and stage effects." },
        source: 'src/main.mjs',
      },
    ],
  },
  {
    id: 'fivephases', folder: 'FivePhases', kind: '2d',
    portraitGallery: true,
    scenes: [
      { zh: "第二关 · 赤蛟施展翻浪", en: "Stage two · Chijiao unleashes a wave" },
      { zh: "第一关 · 山魈战中的消除连锁", en: "Stage one · Chain matches against Shanjiao" },
      { zh: "第三关 · 焚心命中混沌", en: "Stage three · Burning Heart strikes Hundun" },
    ],
    zh: "五行牌阵", en: "Five Phases",
    genre: { zh: "卡牌与三消", en: "Cards and match-three" },
    summary: { zh: "用五色消除积攒能量，搭配牌组，连闯三关。", en: "Build elemental energy through matching, then combo your cards across three stages." },
    features: [
      {
        title: { zh: "2D 显示列表", en: "2D display lists" },
        description: { zh: "棋盘、角色与战斗界面放在独立显示层。", en: "Board, portraits and combat UI live on separate display layers." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "纹理图集与位图", en: "Texture atlases and bitmaps" },
        description: { zh: "棋子位图复用纹理图集区域，为连锁演出提供贴图。", en: "Tile bitmaps reuse atlas regions for the match effects." },
        source: 'src/view/tile-atlas.mjs',
      },
      {
        title: { zh: "立绘分片动画", en: "Layered portrait animation" },
        description: { zh: "通过白鹭 Sprite 与 Bitmap 组合分片，播放姿态与出招关键帧。", en: "Egret Sprites and Bitmaps assemble separate pieces for pose and attack keyframes." },
        source: 'src/view/portrait.mjs',
      },
    ],
  },
  {
    id: 'love', folder: 'LoveElective', kind: '2d',
    scenes: [
      { zh: "首页 · 星空祭前的校园", en: "Title screen · Campus before the Star Festival" },
      { zh: "男主衣橱 · 衬衫与西装叠穿", en: "Protagonist's wardrobe · Layered shirt and blazer" },
      { zh: "唐蜜衣橱 · 蝴蝶结衬衫与长袜配色", en: "Tang Mi's wardrobe · Bow blouse and stocking colours" },
    ],
    zh: "心动选修课", en: "Love Elective",
    genre: { zh: "校园恋爱养成", en: "Campus romance and dress-up" },
    summary: { zh: "在星空祭之前认识一个人，也找到自己的穿搭风格。", en: "Get to know someone before the Star Festival while finding your own style." },
    features: [
      {
        title: { zh: "图层视差", en: "Layered parallax" },
        description: { zh: "远景、人物和前景以不同幅度移动，形成校园的纵深。", en: "Layers move by different amounts to give campus scenes depth." },
        source: 'src/engine/world.mjs',
      },
      {
        title: { zh: "2D 位图与染色", en: "2D bitmaps and tinting" },
        description: { zh: "白鹭舞台负责位图绘制、颜色变化和基于引擎时钟的过渡。", en: "The Egret stage handles bitmaps, tinting and transitions on the engine clock." },
        source: 'src/engine/stage.mjs',
      },
      {
        title: { zh: "换装分层合成", en: "Layered wardrobe preview" },
        description: { zh: "游戏把服饰、配件和每件单品的配色合成角色贴图，再由白鹭在舞台上绘制全身预览。", en: "The game composites garments, accessories and per-item colours into a character texture. Egret draws the resulting full-body preview on stage." },
        source: 'src/engine/world.mjs',
      },
    ],
  },
  {
    id: 'mechanism', folder: 'MechanismCity', kind: '2d',
    scenes: [
      { zh: "初试机弩 · 月下瞄准", en: "First ballista · Aiming by moonlight" },
      { zh: "弹簧高台 · 预览弹簧板落点", en: "Spring Board · Previewing the landing point on the spring" },
      { zh: "机枢之心 · 配重与杠杆", en: "Heart of the Machine · Counterweights and levers" },
    ],
    zh: "千机巧匠", en: "Mechanism City",
    genre: { zh: "物理解谜", en: "Physics puzzles" },
    summary: { zh: "摆好机关，预判弹道，用反弹和绳索解开关卡。", en: "Arrange mechanisms, track the trajectory and use rebounds and ropes to solve each room." },
    features: [
      {
        title: { zh: "2D 物理与关节", en: "2D physics and joints" },
        description: { zh: "绳索等机关接入刚体与关节，和弹射路径联动。", en: "Ropes and mechanisms use rigid bodies and joints alongside shot trajectories." },
        source: 'src/sim/sim.mjs',
      },
      {
        title: { zh: "Tiled 关卡与粒子", en: "Tiled levels and particles" },
        description: { zh: "导入瓦片地图组织关卡，用粒子展示机关触发与破坏。", en: "Imported tile maps organise levels; particles show trigger and impact effects." },
        source: 'src/play/level.mjs',
      },
      {
        title: { zh: "托管菜单布局", en: "Managed menu layout" },
        description: { zh: "设置菜单通过引擎托管 UI 排列开关和操作。", en: "The settings menu uses the engine’s managed UI to lay out controls and toggles." },
        source: 'src/ui/settings.mjs',
      },
    ],
  },
  {
    id: 'canal', folder: 'CanalWatch', kind: '2d',
    scenes: [
      { zh: "双闸截漕 · 上闸关闭，水陆交锋", en: "Sluice Intercept · Upper gate shut during a mixed attack" },
      { zh: "楼船 · 预判船员上岸的位置", en: "Raider junk · Previewing the crew’s landing point" },
      { zh: "雨夜汴河 · 标题与模式选择", en: "The Bian Canal in the rain · Title and mode selection" },
    ],
    zh: "漕河守闸", en: "Canal Watch",
    genre: { zh: "塔防", en: "Tower defence" },
    summary: { zh: "在北宋汴河建塔与关闸，守住十二波水陆来敌，或在五波截漕挑战中提前布防登陆点。", en: "Build towers and operate sluices on the Northern Song canal. Hold all twelve waves or cover crew landing points in a five-wave challenge." },
    features: [
      {
        title: { zh: "一次调用的 play", en: "One call to play" },
        description: { zh: "画布、帧循环、碎片、震屏、提示和加速暂停都来自引擎的 play。", en: "The canvas, the loop, bursts, shakes, notices, speed and pause all come from the engine's play." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "实时图形与登陆预判", en: "Live graphics and landing preview" },
        description: { zh: "Graphics 绘制器械动作、船桨和命中反馈，也会在纤道上标出选中楼船的预计登陆点。", en: "Graphics animates machinery, oars and impacts, and marks where the crew of a selected junk would land." },
        source: 'src/view.mjs',
      },
      {
        title: { zh: "合成音效与配乐", en: "Synthesized sound and music" },
        description: { zh: "白鹭分别混合原创配乐与合成音效，随备战、交战和旗舰登场切换音乐。", en: "Egret mixes the original score and synthesized effects independently. Music changes for preparation, combat and the flagship." },
        source: 'src/sound.mjs',
      },
    ],
  },
  {
    id: 'nezha', folder: 'NezhaSea', kind: '2d',
    portraitGallery: true,
    scenes: [
      { zh: "第十四波 · 海面上的乾坤圈与火尖枪", en: "Wave fourteen · Ring and spear at sea" },
      { zh: "龙宫集市 · 买宝、锁定与合成", en: "The Dragon Palace market · Buying, locking and merging" },
      { zh: "第二十波 · 敖丙（英文）", en: "Wave twenty · Ao Bing (in English)" },
    ],
    zh: "哪吒闹海", en: "Nezha Stirs the Sea",
    genre: { zh: "割草肉鸽", en: "Survivors-like roguelite" },
    summary: { zh: "操纵哪吒挡住二十波龙宫水族，在集市里买法宝并合成神器。", en: "Steer Nezha through twenty waves of the Dragon King's soldiers, and buy and merge treasures into divine ones." },
    features: [
      {
        title: { zh: "一次调用的 play", en: "One call to play" },
        description: { zh: "白鹭 play 提供透明画布、帧循环、键盘和手柄输入，以及战斗粒子、震屏和暂停接口。", en: "Egret play provides the transparent canvas, game loop, keyboard and gamepad input, combat particles, screen shake and pause." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "共享角色图集与战斗特效", en: "Shared actor atlas and combat effects" },
        description: { zh: "白鹭 Bitmap 共用运行时图集绘制哪吒、水族兵、首领和法宝，Graphics 绘制武器轨迹与首领预警。", en: "Egret Bitmap draws Nezha, sea soldiers, bosses and treasures from a shared runtime atlas, with Graphics for weapon trails and boss telegraphs." },
        source: 'src/view.mjs',
      },
      {
        title: { zh: "可由电脑打完的规则", en: "Rules a bot can play" },
        description: { zh: "波次、集市、合成和神器全在不依赖页面的规则里，电脑玩家在 Node 里整局打完来调平衡。", en: "Waves, the market, merging and divine recipes live in page-free rules, played through by a bot in Node to tune the balance." },
        source: 'src/sim/world.mjs',
      },
    ],
  },
  {
    id: 'wardens', folder: 'NightWardens', kind: '2d',
    portraitGallery: true,
    scenes: [
      { zh: "首页 · 月下城楼", en: "Title screen · The moonlit city gate" },
      { zh: "鬼市 · 子时旱魃现身", en: "Ghost market · The Drought Fiend arrives at midnight" },
      { zh: "天雷符 · 雷电击中成群邪祟", en: "Thunder talisman · Lightning strikes a crowd of haunts" },
    ],
    zh: "镇邪司", en: "Night Wardens",
    genre: { zh: "竖屏塔防射击", en: "Tall-screen tower shooter" },
    summary: { zh: "一把会自己瞄准的符弩守城门，三夜挡住纸人、僵尸和鬼新娘，升级时挑符法，子时打倒首领。", en: "One self-aiming talisman crossbow keeps the gate for three nights against paper dolls, jiangshi and the ghost bride; pick a ward at each level and bring down the warden at midnight." },
    features: [
      {
        title: { zh: "图集帧动画与动画控制器", en: "Atlas frames and a sequence controller" },
        description: { zh: "邪祟从同一张图集的对象池里取用，按自己的年纪取走路帧；首领的走路由 animation 入口的控制器在引擎时钟上推动，脚步标记扬起尘土。", en: "Haunts come pooled from one atlas, each showing the walk frame of its own age; a warden walks on the engine's clock through the animation entry's controller, its footfall markers raising dust." },
        source: 'src/view/field.mjs',
      },
      {
        title: { zh: "粒子与双色着色", en: "Particles and two-colour tints" },
        description: { zh: "火星、纸屑、鬼火、烟、尘土和雾是粒子发射器；命中闪白、冰冻、灼烧和雷击定身是材质的双色着色。", en: "Sparks, paper scraps, ghost fire, smoke, dust and mist are particle emitters; the hit flash, frost, fire and the thunder's stun are two-colour material tints." },
        source: 'src/view/field.mjs',
      },
      {
        title: { zh: "自建混音器上的合成音效", en: "Made sounds on the game's own mixer" },
        description: { zh: "音效和配乐在代码里合成，交给游戏自建的引擎混音器，冷却和同时发声上限让满屏击杀也清楚。", en: "Sounds and music are synthesized in code and played on an engine mixer the game makes itself; cooldowns and voice caps keep a road full of kills clear." },
        source: 'src/audio/sound.mjs',
      },
      {
        title: { zh: "替身能整夜打完的规则", en: "Rules a stand-in plays through" },
        description: { zh: "出怪、符法、天雷和首领全在不依赖页面的规则里，替身玩家用 runHeadless 把三夜各跑一批种子来调平衡。", en: "Spawns, wards, the thunder and the wardens live in page-free rules; a stand-in plays batches of seeds on every night through runHeadless to set the balance." },
        source: 'src/sim/world.mjs',
      },
    ],
  },
  {
    id: 'mahjong', folder: 'TaiwanMahjong', kind: '2d',
    scenes: [
      { zh: "島夜雀室 · 三位牌友等你入座", en: "Island Night Mahjong · Three players await" },
      { zh: "牌局 · 胡牌金印與十六張牌面", en: "At the table · Win seal and sixteen-tile hand" },
      { zh: "結算 · 胡牌台數與四家分數", en: "Settlement · Winning tai and scores for all four players" },
    ],
    zh: "島夜雀室", en: "Island Night Mahjong",
    genre: { zh: "台灣十六張麻將", en: "Taiwanese Mahjong" },
    summary: { zh: "到雨夜巷弄裡的牌室，和三位有台灣國語配音的牌友打十六張，補花、吃碰槓、算台數。", en: "Play Taiwanese sixteen-tile mahjong with three voiced opponents in a rain-soaked neighborhood parlor." },
    features: [
      {
        title: { zh: "可由电脑打完的规则", en: "Rules a computer can play" },
        description: { zh: "向听数、对局和台数都在不依赖页面的规则里，四家电脑在 Node 里整将对打来比较难度和性格。", en: "Shanten, play and tai live in page-free rules; four computer players play whole games in Node to compare levels and characters." },
        source: 'src/sim/game.mjs',
      },
      {
        title: { zh: "牌面圖集與叫牌演出", en: "Tile atlas and call effects" },
        description: { zh: "42 種牌面共用一張圖集，手牌和飛行中的牌使用 Bitmap 的 sourceRect 取圖。叫牌由引擎繪製光紋和粒子。", en: "The 42 faces share one bitmap atlas via sourceRect. The engine animates flying tiles and draws the call effects and particles." },
        source: 'src/view.mjs',
      },
      {
        title: { zh: "静态牌桌加引擎动画", en: "A still table under the engine" },
        description: { zh: "桌上静止的牌画在引擎画布下面的页面 canvas 上，只在变化时重画；引擎只画手牌、飞行的牌和大字。", en: "Tiles at rest are painted on a page canvas under the engine's, only when they change; the engine draws the hand, the flights and the words." },
        source: 'src/felt.mjs',
      },
    ],
  },
  {
    id: 'peach', folder: 'PeachCreek', kind: '2d',
    scenes: [
      { zh: "横屏县城 · 水彩溪流与十二坊", en: "County panorama · Watercolour creek and twelve wards" },
      { zh: "营建 · 当前建筑与下一级预览", en: "Construction · Current building and next level preview" },
      { zh: "民情 · 在两项决策之间取舍", en: "Petition · Weighing two decisions for the county" },
    ],
    zh: "桃溪县令", en: "Magistrate of Peach Creek",
    genre: { zh: "宋代放置经营", en: "Song-dynasty idle city-builder" },
    summary: { zh: "从下县县令做起，规划坊区、开产业链、勘探访贤、守城升格，一任三天以上把桃溪治成一州；离开时县城照常运转。", en: "Start as magistrate of a lesser county: plan wards, open trade chains, survey and call on worthies, hold the walls and rise rank by rank to a prefecture over three days or more; the county goes on while you are away." },
    features: [
      {
        title: { zh: "页面画布上的县城，引擎画会动的", en: "The county on a page canvas, the engine for what moves" },
        description: { zh: "静止的坊区、建筑和四季配色画在引擎画布下面的页面画布上；play 以四分之三分辨率建，只画行人、小船、花瓣雪花、铜钱和攻城小戏。", en: "The still wards, buildings and seasonal colours are painted on a page canvas under the engine; play, made at three-quarter resolution, draws only the walkers, boats, petals and snow, coins and the raid." },
        source: 'src/view.mjs',
      },
      {
        title: { zh: "真实时间和离线补算", en: "Real time and catching up" },
        description: { zh: "规则按真实秒数推进；离开再回来时只按仓廪的容量补算收成，税银攒在县衙等你来收，回来先看一张收获清单。", en: "The rules move with real seconds; an absence is counted only up to the granaries' capacity, the taxes wait at the yamen, and a return opens with a list of what came in." },
        source: 'src/sim/world.mjs',
      },
      {
        title: { zh: "模拟玩家调出来的节奏", en: "Pacing set by a simulated player" },
        description: { zh: "替身县令按勤快、常来、偶尔来三种作息玩完一整任，测试保证三种都不少于三天，第二任也一样。", en: "A stand-in magistrate plays whole terms on three daily habits; the tests hold every habit to three days or more, the second term too." },
        source: 'tools/pacing.mjs',
      },
      {
        title: { zh: "引擎的存档库和文字表", en: "The engine's save store and text table" },
        description: { zh: "整座县城存进有版本的存档，坏档另存后重新开始；中英文文字表切换时连地图上的坊名一起重画。", en: "The whole county goes into a versioned save, a broken one set aside; switching the text table repaints even the ward names on the map." },
        source: 'src/saves.mjs',
      },
    ],
  },
  {
    id: 'sand', folder: 'SandScroll', kind: '2d',
    scenes: [
      { zh: "作画 · 同色沙连通两壁，消掉的颜料为手卷上色", en: "Paint · Connect matching sand from wall to wall to colour the scroll" },
      { zh: "拆画 · 看盘底露出的颜色，挑沙桶上带收沙", en: "Unpaint · Match a bucket to an exposed pigment and collect sand along the belt" },
      { zh: "卷首 · 作画、拆画、无尽沙盘与今日试笔", en: "Title · Paint, Unpaint, Endless Tray and Daily Scroll" },
    ],
    zh: "沙画江山", en: "Sand Scroll",
    genre: { zh: "沙画消除", en: "Sand puzzle" },
    summary: { zh: "铺开彩沙，为三卷白描山水上色。也可用传送带上的沙桶逐层拆画，在无尽沙盘挑战更多颜料，或在今日试笔里用当天固定的盘面和积木刷新个人最高分。", en: "Spread coloured sand to paint three ink landscapes. Collect the pigments one layer at a time in Unpaint, take on more colours in the Endless Tray, or try for a personal best on the Daily Scroll's fixed board and piece sequence." },
    features: [
      {
        title: { zh: "一粒沙一个像素", en: "One grain, one pixel" },
        description: { zh: "两百乘三百粒的沙盘切成十五条贴图，每帧只把有沙动了的几条用 textureFromPixels 重新上传；每粒按颜料、深浅、受光和压在上面的沙着色，放大两倍仍颗颗分明。", en: "A tray of 200 by 300 grains is cut into fifteen strip textures, and each frame only the strips whose sand moved are sent again with textureFromPixels; each grain is shaded by its pigment, its shade, the light and the sand above it, and stays sharp at twice its size." },
        source: 'src/view/board.mjs',
      },
      {
        title: { zh: "静态布景与动态沙盘分层", en: "Separate layers for scenery and live sand" },
        description: { zh: "沙框、碟子和装裱画在透明白鹭画布下方的独立画布上，只有变化时才重绘。白鹭绘制沙粒、积木、粒子和按钮，静态菜单空闲时暂停帧循环。", en: "The frame, dishes and scroll mount sit on a canvas behind the transparent Egret stage and redraw only when they change. Egret draws the sand, pieces, particles and controls. The frame loop rests when static menus are idle." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "独立模拟沙粒沉降", en: "Sand simulation independent of rendering" },
        description: { zh: "沙粒下落、侧滑和同色连通由模拟层计算。相同种子和操作会得到相同结果，可在 Node 中复跑平铺、堆高和消除。", en: "The simulation handles falling, sideways movement, and connections between grains of the same colour. The same seed and inputs produce the same result, so spreading, stacking and clearing can be replayed in Node." },
        source: 'src/sim/sand.mjs',
      },
      {
        title: { zh: "从山水里取样的拆画", en: "Pictures to unpaint, sampled from the landscapes" },
        description: { zh: "拆画的画从代码画的山水里截一段，不画绢底，按透明度决定哪里有沙、按颜料取最近色；桶按沙从底下露出来的先后发进各列，每一幅都由替身玩家验证能拆完。", en: "An unpaint picture is cut from the painted landscape drawn without its silk: opacity says where sand is and the nearest pigment its colour; buckets are dealt in the order their sand reaches the bottom, and a stand-in has finished every picture." },
        source: 'src/sim/unpaint.mjs',
      },
      {
        title: { zh: "合成配乐与操作反馈", en: "Synthesized music and gameplay cues" },
        description: { zh: "作画、无尽和拆画各用一段拨弦与竹笛配乐。落沙、连消、收沙和合桶有独立音效，经 encodeWav 交给白鹭混音器，由音乐和音效总线分别控制。", en: "Paint, Endless Tray and Unpaint each have a plucked-string and bamboo flute theme. Sand drops, chains, collection and bucket merges have distinct cues. Audio reaches the Egret mixer through encodeWav and plays through separate music and effects buses." },
        source: 'src/audio/sound.mjs',
      },
    ],
  },
  {
    id: 'drums', folder: 'OperaDrums', kind: '2d',
    scenes: [
      { zh: "急急风 · 难", en: "Swift Wind · Hard" },
      { zh: "起霸 · 撕边的滚奏", en: "The General Arms · The opening roll" },
      { zh: "趟马 · 英文下的拼音谱字", en: "Riding Through · Pinyin syllables in English" },
    ],
    zh: "锣鼓经", en: "Opera Drums",
    genre: { zh: "京剧锣鼓节奏", en: "Opera percussion rhythm" },
    summary: { zh: "坐上京剧鼓师之位，跟着锣鼓经敲鼓打锣。", en: "Take the drummer's seat of a Peking opera band and strike the percussion score." },
    features: [
      {
        title: { zh: "引擎混音器与曲子时钟", en: "The mixer as the song's clock" },
        description: { zh: "伴奏是混音器里的一个声部，曲子的时间取自它的位置并扣除输出延迟。", en: "The backing is one voice of the engine's mixer; the song's time is its position less the output delay." },
        source: 'src/audio/sound.mjs',
      },
      {
        title: { zh: "代码合成的锣鼓与京胡", en: "Gongs, drum and fiddle in code" },
        description: { zh: "单皮鼓、小锣、大锣、铙钹、板和京胡都由数算出，编成 WAV 交给引擎。", en: "The drum, gongs, cymbals, clapper and jinghu are computed and handed to the engine as WAV." },
        source: 'src/audio/synth.mjs',
      },
      {
        title: { zh: "判定与谱面", en: "Judging and charts" },
        description: { zh: "锣鼓经的点子按难度排谱，判定、连击和彩槽都能在 Node 里由电脑玩家整首打完。", en: "Patterns become charts by difficulty, judged with combo and gauge, all playable by a bot in Node." },
        source: 'src/sim/judge.mjs',
      },
    ],
  },
];
