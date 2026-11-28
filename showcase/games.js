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
        title: { zh: "级联阴影与分块灯光", en: "Cascaded shadows and tiled lights" },
        description: { zh: "三级级联阴影覆盖整个厂区；十几盏探照灯和路灯由引擎按屏幕分块照亮，第八盏以后的也照样亮。", en: "Three shadow cascades cover the station, and the engine lights its dozen floodlights and lamps by screen tile, those past the eighth included." },
        source: 'src/view.mjs',
      },
      {
        title: { zh: "蒙皮士兵与布娃娃", en: "Skinned soldiers and ragdolls" },
        description: { zh: "士兵是 16 根骨骼的连续蒙皮网格，持枪、行走和蹲下由代码驱动，中弹后交给引擎的布娃娃倒地。", en: "Soldiers are continuous meshes on sixteen-bone skeletons, posed in code to aim, walk and crouch, and they fall as engine ragdolls when shot." },
        source: 'src/soldier.mjs',
      },
      {
        title: { zh: "雨夜湿地与后期", en: "Wet ground and post-processing" },
        description: { zh: "平面反射映出湿地面，弹孔是贴花；SSAO、景深、泛光和大气散射按三档画质取舍。", en: "A planar reflection mirrors the wet ground and bullet holes are decals; SSAO, depth of field, bloom and atmospheric scattering follow three quality tiers." },
        source: 'src/view.mjs',
      },
      {
        title: { zh: "刚体、导航与角色控制", en: "Physics, navigation and a character motor" },
        description: { zh: "干员由角色控制器在刚体世界里移动；守军在导航网格上寻路，会找掩体、包抄和扔手雷。", en: "The operator moves through a rigid-body world on a character motor, and the militia find their way over a navigation mesh to cover, flank and throw grenades." },
        source: 'src/sim.mjs',
      },
      {
        title: { zh: "WebGL2 与 WebGPU", en: "WebGL2 and WebGPU" },
        description: { zh: "默认用 WebGL2 绘制；在试玩网址里加上参数 backend=webgpu，同一个场景改由 WebGPU 绘制。", en: "WebGL2 draws by default; with backend=webgpu in the address, WebGPU draws the same scene." },
        source: 'src/main.mjs',
      },
    ],
  },
  {
    id: 'snow', folder: 'SnowTemple', kind: '3d',
    imageFocus: '75% center',
    scenes: [
      { zh: "雪夜 · 踏雪上路", en: "Snowy night · The road ahead" },
      { zh: "草料场 · 格挡反击", en: "Fodder yard · Guard and counter" },
      { zh: "山神庙 · 陆谦第二阶段", en: "Mountain temple · Lu Qian's second phase" },
    ],
    zh: "风雪山神庙", en: "Snow at the Mountain Temple",
    genre: { zh: "武侠动作", en: "Wuxia action" },
    summary: { zh: "风雪夜，林冲从草料场一路打到山神庙。", en: "Fight through a snowy night as Lin Chong, from the fodder yard to the mountain temple." },
    features: [
      {
        title: { zh: "glTF 蒙皮角色", en: "Skinned glTF characters" },
        description: { zh: "林冲、陆谦和庄客是引擎载入的 glTF 蒙皮模型，各有一副骨骼，三档精度可由玩家选择。", en: "Lin Chong, Lu Qian and the farmhands are skinned glTF models loaded by the engine, each on its own skeleton, in three levels of detail." },
        source: 'src/view/characters.mjs',
      },
      {
        title: { zh: "风中枯草与着色器特效", en: "Wind-blown grass and shader effects" },
        description: { zh: "成片枯草是实例化网格，随风起伏、被人拨开；枪光、法阵和预警由自定义片元着色器画出。", en: "Fields of dry grass are instanced meshes that sway and part as people pass; the spear light, formations and warnings are custom fragment shaders." },
        source: 'src/view/scenery.mjs',
      },
      {
        title: { zh: "湿石板倒影与分块火光", en: "Wet flagstones and tiled firelight" },
        description: { zh: "最高画质下湿石板有平面倒影；地上的火和着火的人由引擎按屏幕分块照亮。", en: "At the highest quality the wet flagstones carry a planar reflection, and fire on the ground and burning men are lit by screen tile." },
        source: 'src/view/view.mjs',
      },
      {
        title: { zh: "动态分辨率", en: "Dynamic resolution" },
        description: { zh: "自动画质在设备和画质档的上限内，按帧率升降实际绘制分辨率。", en: "Automatic quality raises and lowers the drawing resolution with the frame rate, within the device and preset ceiling." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "原生 2D 叠加界面", en: "Native 2D overlay" },
        description: { zh: "标题、设置、枪谱和战报是 3D 画面上的白鹭 2D 界面，按安全区排版，转屏时不重建场景。", en: "The title, settings, spear manual and battle report are Egret 2D interface over the 3D scene, laid out in the safe area and kept through a turn." },
        source: 'src/ui/host.mjs',
      },
    ],
  },
  {
    id: 'regiments', folder: 'FiveRegiments', kind: '3d',
    scenes: [
      { zh: "卷首 · 五营挺拔列阵与漆木铜饰原生菜单", en: "Title · Five upright regiments and the native lacquer-and-bronze menu" },
      { zh: "竹林古道 · 雾、竹影与原生战斗 HUD", en: "Bamboo path · Layered fog, bamboo shadows and the native combat HUD" },
      { zh: "县城校场 · PC 实机战斗画面", en: "County drill ground · Live PC combat view" },
    ],
    zh: "五营争锋", en: "Five Regiments",
    genre: { zh: "第三人称冷兵器对决", en: "Third-person cold-steel duels" },
    summary: { zh: "从羽林卫、虎步、陷阵营、银翎卫、武射史里选一营，技能、天赋、战技和生命值按原作的公告与物品面板，伤害公式按武器和护甲面板推算，一刀一成血、打得有来有回。在校场、桃林、竹林、雪原单挑另外四营，最后在王城宫前以一敌二；银翎卫骑马作战、马上架枪。", en: "Choose one of five regiments; skills, talents, weapon arts and health follow the original's notes and item cards, and a damage formula worked out from the weapon and armour cards makes each blow take about a tenth of a man's health, so fights go back and forth. Beat the other four, then two at once before the palace; the Silver Wing Guard fights from the saddle and couches his ji." },
    features: [
      {
        title: { zh: "World3D 原生界面与输入", en: "Native Play interface over World3D" },
        description: { zh: "透明原生 UI 与 3D 共用帧时钟，具名控件和多屏布局支持键鼠、触屏及手柄输入。", en: "Transparent native UI and 3D share a frame clock; named controls and screen-aware layouts support mouse, keys, touch and gamepad." },
        source: 'src/screens.mjs',
      },
      {
        title: { zh: "动作捕捉与反向动力学", en: "Motion capture and inverse kinematics" },
        description: { zh: "每帧把动作捕捉姿态写进骨骼，再叠加反向动力学和腰身扭转；骑手按战马脊骨的位置坐稳。", en: "Each frame the captured pose goes into the bones with inverse kinematics and a waist twist on top; riders sit where the horse’s spine puts the saddle." },
        source: 'src/view/figure.mjs',
      },
      {
        title: { zh: "五个场景的光与天气", en: "Light and weather for five places" },
        description: { zh: "全景天空提供背景和环境光，配上级联阴影、指数雾和每个场景一套后期调色。", en: "Sky panoramas give the background and image-based light, with cascaded shadows, exponential fog and a colour grade for each place." },
        source: 'src/view/stage.mjs',
      },
      {
        title: { zh: "刀光、火花与动态几何", en: "Blade trails, sparks and live geometry" },
        description: { zh: "刀光拖尾和剑气是每帧改写的动态几何；火花、血雾、落花和飘雪由 CPU 与 GPU 粒子发出。", en: "Blade trails and flying cuts are geometry rewritten every frame; sparks, blood mist, petals and snow come from CPU and GPU particles." },
        source: 'src/view/effects.mjs',
      },
      {
        title: { zh: "三档 glTF 模型", en: "glTF models in three sets" },
        description: { zh: "五个人物、战马和三十二件物件各有三档 glTF，经 meshopt 压缩，按画质载入。", en: "Five rigged men, the horse and thirty-two props each come as three meshopt-compressed glTF sets, loaded by quality." },
        source: 'src/main.mjs',
      },
    ],
  },
  {
    id: 'starbanner', folder: 'StarBanner', kind: '3d',
    scenes: [
      { zh: "麦浪渡口 · 两军隔着小河对阵，蓝方占下的村庄换上王国的颜色", en: "Wheatwater Ford · The armies face each other across the stream; villages taken by the blue side wear the kingdom's colours" },
      { zh: "双子海湾 · 两军沿着海湾间的窄路推进，双方骑士在中路相遇", en: "Twin Coves · Both armies push along the narrow land between the bays, and the knights meet in the middle" },
      { zh: "龙脊隘口 · 攻击前的战斗预测：双方伤害范围、暴击与反击", en: "Dragonspine Pass · The forecast before a strike: both sides' damage ranges, criticals and the counter" },
    ],
    zh: "星旗战记", en: "Starbanner Tactics",
    genre: { zh: "斜 45 度 3D 卡通渲染战棋", en: "45-degree toon-shaded 3D tactics" },
    summary: { zh: "晨星王国与夜鸦公国在浮空沙盘上对阵：靠村庄收入招兵、占领、推进，击倒敌方指挥官或攻破要塞取胜。伤害、地形、每个兵种的暴击条件、反击、占领、援军、治疗与运输按原作规则还原；十九个兵种、四位原创指挥官与战意技、三张原创地图，全部是原创的卡通渲染 3D 模型，音乐和音效由代码合成。", en: "The Morningstar Kingdom and the Nightraven Duchy meet on a floating diorama: recruit from village income, capture and advance, and fell the enemy commander or break their stronghold. Damage, terrain, each unit's critical condition, counters, capture, reinforcing, healing and carrying follow the original's rules; nineteen units, four original commanders with their rally arts and three original maps, all original toon-shaded 3D models, with music and sound synthesized in code." },
    features: [
      {
        title: { zh: "卡通渲染与墨线描边", en: "Toon shading and ink outlines" },
        description: { zh: "卡通分层光照、边缘光和阵营换色写在着色器钩子里，后期给单位和建筑描上墨线。", en: "Banded toon light, rim light and team colours live in shader hooks, and a post pass inks outlines around units and buildings." },
        source: 'src/view/toon.mjs',
      },
      {
        title: { zh: "骨骼棋子与浮空沙盘", en: "Rigged pieces on a floating diorama" },
        description: { zh: "每个单位一副独立骨骼，动作交叉淡入；树、山、礁石和草丛按实例成批绘制。", en: "Each unit has its own skeleton with cross-faded clips, and trees, peaks, reefs and grass are drawn as instanced batches." },
        source: 'src/view/figures.mjs',
      },
      {
        title: { zh: "战棋规则与电脑对手", en: "Tactics rules and a computer opponent" },
        description: { zh: "移动、攻击和战意技的规则独立于画面，电脑对手在同一套规则里推演每一步。", en: "Movement, attacks and arts follow rules kept apart from the picture, and the computer plans its turns within the same rules." },
        source: 'src/sim/rules.mjs',
      },
      {
        title: { zh: "射线点格与头顶数字", en: "Tile picking and labels over pieces" },
        description: { zh: "鼠标和手指经射线点中格子；单位头顶的生命数字和伤害飘字跟着 3D 位置走。", en: "A ray finds the tile under the mouse or finger, and health badges and damage figures follow the pieces in 3D." },
        source: 'src/play.mjs',
      },
      {
        title: { zh: "原生叠加界面与读屏", en: "Native overlay UI and semantics" },
        description: { zh: "标题到结算都是 3D 画面上的白鹭原生界面，转屏原地重排，控件发布到读屏语义树。", en: "From the title to the results the interface is native Egret UI over the 3D view, reflowed in place on a turn and published to the semantic tree." },
        source: 'src/ui/host.mjs',
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
        title: { zh: "流式六角地形", en: "Streamed hex terrain" },
        description: { zh: "3600×2600 的天下按镜头远近流式加载高度块，地貌颜色、六角格线和选中高亮在一个自定义着色器里画。", en: "A realm 3,600 by 2,600 streams in height tiles around the camera, with ground colours, hex lines and highlights in one custom shader." },
        source: 'src/view3d/terrain.mjs',
      },
      {
        title: { zh: "代码搭出的城池", en: "Cities built in code" },
        description: { zh: "七十六座城的城墙、角楼、城门和里坊由几何构建器拼成，镜头走近才搭建；全城旗帜共用一个实例化网格。", en: "Seventy-six cities of walls, towers, gates and wards are assembled by the geometry builder as the camera nears, their banners sharing one instanced mesh." },
        source: 'src/view3d/cities.mjs',
      },
      {
        title: { zh: "在天下图上开战", en: "Battles on the map itself" },
        description: { zh: "两军相遇处切出 22×14 格的战场，小兵实例化绘制，名牌用屏幕标记跟随，射线拾取六角格。", en: "Where armies meet, a 22 by 14 patch of hexes becomes the field: instanced troops, name plates on screen markers and hexes picked by ray." },
        source: 'src/view3d/battle3d.mjs',
      },
      {
        title: { zh: "海、湖与河", en: "Sea, lakes and rivers" },
        description: { zh: "海是带浪的水面网格，江河沿刻出的河床铺成水带，湖按湖岸铺平；低画质换成不折射的水面。", en: "The sea is one wave mesh, rivers are ribbons along carved beds and lakes level sheets; low quality swaps in water without refraction." },
        source: 'src/view3d/water.mjs',
      },
      {
        title: { zh: "原生叠加界面与统一时钟", en: "Native overlay and shared clock" },
        description: { zh: "play3dAttached 让三维天下图与原生标题、开局、设置、存档、顶栏、小地图共用时钟；界面支持横竖屏、语义树与按名称测试。", en: "play3dAttached shares a clock between the 3D realm and native title, setup, settings, saves, header and minimap, with responsive layout, semantics and named tests." },
        source: 'src/view3d/native-host.mjs',
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
        title: { zh: "2D 与 3D 共用上下文", en: "One WebGL2 context for 2D and 3D" },
        description: { zh: "立绘、对白框和战斗界面的 2D 层，与大地图、场景和战场的 3D 画面共用一个 WebGL2 上下文。", en: "Portraits, the dialogue frame and the battle interface share one WebGL2 context with the 3D world map, places and battlefields." },
        source: 'web/main.mjs',
      },
      {
        title: { zh: "三维场景与模型加载", en: "3D scenes and model loading" },
        description: { zh: "大地图、客栈和战场的模型与贴图由引擎载入，大地图远景加上随高度变化的雾。", en: "Models and textures for the world map, inns and battlefields load through the engine, with height haze over the distant map." },
        source: 'web/jyx2/scene/native-inn-view.mjs',
      },
      {
        title: { zh: "角色骨骼动画", en: "Character skeletal animation" },
        description: { zh: "剧情场景里的人物是蒙皮模型，由骨骼和动画混合器驱动。", en: "Characters in story scenes are skinned models driven by skeletons and animation mixers." },
        source: 'web/jyx2/scene/native-scene-actor.mjs',
      },
      {
        title: { zh: "战场实例化与预编译", en: "Instanced battlefields, programs prepared" },
        description: { zh: "战场上成片的树木和草实例化绘制，进入战斗前在加载画面里预编译着色器。", en: "Trees and grass on the battlefield are instanced, and its shaders are prepared under the loading screen before a fight." },
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
        description: { zh: "湖面波浪来自引擎的水面网格，高画质下每三帧更新一次赛道倒影。", en: "The lake’s waves come from the engine’s water mesh, and on high quality its reflection of the track refreshes every third frame." },
        source: 'src/scenery.mjs',
      },
      {
        title: { zh: "看台合批与实例化", en: "Merged and instanced grandstands" },
        description: { zh: "看台观众合并成一个网格，旗帜、灯笼、花草和群山按实例逐个变换和着色。", en: "The crowd shares one merged mesh, and banners, lanterns, plants and mountains are instanced with their own transforms and colours." },
        source: 'src/grandstand.mjs',
      },
      {
        title: { zh: "glTF 车手与赛道", en: "glTF racers and track" },
        description: { zh: "车手、座驾、地标和道具是内嵌 PBR 贴图的 GLB，由白鹭载入后接进实时场景。", en: "Racers, karts, landmarks and props are GLBs with embedded PBR textures, loaded by Egret into the live scene." },
        source: 'src/track-models.mjs',
      },
      {
        title: { zh: "原生叠加界面与安全区", en: "Native overlay and safe areas" },
        description: { zh: "菜单、计时和小地图画在 3D 画面上的原生界面里，横竖屏原地重排，静止时按需提交。", en: "Menus, timers and the minimap are native UI over the 3D view, reflowed in place on a turn and drawn on demand when still." },
        source: 'src/ui/host.mjs',
      },
      {
        title: { zh: "多指操控与读屏", en: "Multi-touch driving and semantics" },
        description: { zh: "方向、漂移和道具按键各占一个触点；菜单支持焦点导航，控件有给读屏用的名字。", en: "Steering, drift and items each keep their own contact, and menus support focus navigation with accessible names." },
        source: 'src/ui/race-touch.mjs',
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
        title: { zh: "原生 2D 与 WebGL2", en: "Native 2D and WebGL2" },
        description: { zh: "白鹭浏览器游戏统一帧循环和画布缩放，桌面与触屏都能玩。", en: "Egret’s browser game runs the loop and scales the canvas for desktop and touch." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "图集与纵深排序", en: "Atlases and depth sorting" },
        description: { zh: "角色姿态、装备和特效打进位图图集，人物、建筑和道具按脚底位置排出前后。", en: "Poses, gear and effects are packed into texture atlases, and actors and scenery sort by where they stand." },
        source: 'src/view.mjs',
      },
      {
        title: { zh: "动态图形与共享材质", en: "Vector graphics and shared materials" },
        description: { zh: "Graphics 画潮环、交叉火线和安全区，乾坤圈和受击闪光复用共享 2D 材质。", en: "Graphics draws tide rings, crossing fire lines and safe areas, and ring and hit effects reuse shared 2D materials." },
        source: 'src/view.mjs',
      },
      {
        title: { zh: "数据界面的行囊与商店", en: "Inventory and shops as views" },
        description: { zh: "行囊、商店和铁匠铺是按需绘制的白鹭数据界面，有键控列表、图片绑定、滚动和具名焦点。", en: "The pack, shop and forge are on-demand Egret views with keyed rows, bound images, scrolling and named focus." },
        source: 'src/native-rpg-ui.mjs',
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
        title: { zh: "六轮车辆物理", en: "Six-wheel vehicle physics" },
        description: { zh: "三辆车各是复合车身加六个射线车轮，有悬挂、转向和六驱，压过地形、树石和吊桥。", en: "Each truck is a compound chassis on six ray wheels with suspension, steering and six-wheel drive, rolling over terrain, rocks and a rope bridge." },
        source: 'src/play/convoy.mjs',
      },
      {
        title: { zh: "流式地形", en: "Streamed terrain" },
        description: { zh: "4.6 公里的路两侧，地形按 192 米一块随车流式加载、按距离换细节，高度在 Worker 里算。", en: "Terrain streams in 192 m tiles along 4.6 km of road, its detail changing with distance and its heights computed in a worker." },
        source: 'src/world/land.mjs',
      },
      {
        title: { zh: "布、绳与布娃娃", en: "Cloth, rope and ragdolls" },
        description: { zh: "车上的篷布和经幡是引擎布料，捆货绳和吊桥索是绳索，被车撞到的山匪倒成布娃娃。", en: "Tarps and prayer flags are engine cloth, the lashings and bridge cables are ropes, and a bandit hit by a truck falls as a ragdoll." },
        source: 'src/play/effects.mjs',
      },
      {
        title: { zh: "山匪与狼的导航群体", en: "Bandits and wolves as a crowd" },
        description: { zh: "每处埋伏把那片地形铺成导航网格，山匪和狼作为一群导航体追车、绕障、互相让开。", en: "Each ambush lays its ground as a navigation mesh, and bandits and wolves move as a crowd that chases trucks, avoids obstacles and gives way." },
        source: 'src/play/threats.mjs',
      },
      {
        title: { zh: "扎营与场景存档", en: "Camps saved as scenes" },
        description: { zh: "在驿站用移动、旋转手柄摆营地物件，营地写成场景文档存进存档，下次路过原样摆好。", en: "At a station, camp pieces are placed with move and turn handles, written into the save as a scene document and set out again on the next pass." },
        source: 'src/play/camp.mjs',
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
        description: { zh: "村落、宝塔、稻田、树木、船只和行军队列在天下地图上成批实例化绘制。", en: "Hamlets, pagodas, paddies, trees, junks and marching columns are drawn as instanced batches across the realm map." },
        source: 'src/view/realm.mjs',
      },
      {
        title: { zh: "山门射线点选", en: "Ray picking at the seat" },
        description: { zh: "鼠标或手指的位置投进三维场景，点中山门里的建筑、人物和空地。", en: "The cursor or finger is cast into the scene to pick buildings, people and empty plots in the seat." },
        source: 'src/view/seat.mjs',
      },
      {
        title: { zh: "战斗动作骨骼", en: "Battle animation rigs" },
        description: { zh: "人物是骨骼上的蒙皮身体，招式是关键帧动作，由动画混合器播放。", en: "Figures are skinned bodies on skeletons, their moves keyframed clips played by animation mixers." },
        source: 'src/view/figure.mjs',
      },
      {
        title: { zh: "随时辰转动的光", en: "Light that follows the hour" },
        description: { zh: "山门、天下地图和战阵三个场景的日光与天光随时辰转动；手机上不开阴影和后期。", en: "Sun and sky light turn with the hour across the seat, the realm map and the arena; phones skip shadows and post-processing." },
        source: 'src/view/stage.mjs',
      },
      {
        title: { zh: "原生经营界面与三维同钟", en: "Native management UI and shared 3D clock" },
        description: { zh: "原生数据视图覆盖页面、弹出单、长名册、表单、通知与语义焦点，战斗和山门共用引擎时钟。", en: "Native data views drive screens, dialogs, lists, forms, positioned notices and semantic focus on the same engine clock as the 3D world." },
        source: 'src/ui/native-shell.mjs',
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
        description: { zh: "玻璃材质加引擎的果冻形变，蓄力、跳跃、翻滚和受击都让半透明的身体软弹回弹。", en: "Glass materials and the engine’s jelly deformation make the see-through bodies squash and rebound on charges, jumps, rolls and hits." },
        source: 'src/panda.mjs',
      },
      {
        title: { zh: "角色控制与刚体", en: "Character motor and rigid bodies" },
        description: { zh: "熊猫由角色控制器行走跳跃，糖果敌群是刚体球，沙滩球和木桶可以推着走。", en: "Pandas walk and jump on a character motor, the candy horde are rigid spheres, and beach balls and barrels can be pushed around." },
        source: 'src/sim.mjs',
      },
      {
        title: { zh: "实例化敌群与粒子", en: "Instanced horde and particles" },
        description: { zh: "敌群、弹丸、糖粒、树木和范围预警按实例逐个着色，特效由引擎粒子发射。", en: "The horde, shots, sprinkles, trees and hazard telegraphs are instanced with per-instance colour, and effects come from engine particles." },
        source: 'src/view.mjs',
      },
      {
        title: { zh: "原生 3D 叠加界面", en: "Native 3D overlay UI" },
        description: { zh: "HUD、菜单和伤害浮字都由透明原生叠加层绘制，复用引擎字形页，静止时保留上一帧。", en: "HUD, menus and floating damage are drawn by the native overlay, sharing engine glyph pages and retaining static frames." },
        source: 'src/hud.mjs',
      },
      {
        title: { zh: "多指触控与读屏", en: "Multi-touch and semantics" },
        description: { zh: "摇杆和跳跃、翻滚按键各自独占一根手指；控件发布到读屏语义树，并按名字验收。", en: "The stick and the jump and roll buttons each keep their own finger, and controls are published to the semantic tree and tested by name." },
        source: 'src/ui/touch.mjs',
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
        description: { zh: "十种皮偶是 Spine 骨骼动画，悟空 25 根骨骼、24 片皮；鹰与仙鹤共用一套动画。", en: "Ten puppets are Spine skeletons, the Monkey King with 25 bones and 24 pieces of leather; the hawk and the crane share one set of clips." },
        source: 'src/puppets.mjs',
      },
      {
        title: { zh: "多轨动画", en: "Animation tracks" },
        description: { zh: "哪吒同时放三条轨：在做什么、三头六臂和乾坤圈，各管各的骨头，互不打断。", en: "Nezha plays three tracks at once, for what he is doing, his extra arms and his ring, each moving only its own bones." },
        source: 'src/puppets.mjs',
      },
      {
        title: { zh: "Tiled 瓦片地图", en: "Tiled tile maps" },
        description: { zh: "每一幕是一张 Tiled 地图：引擎画地面，规则从同一个文件读实心格和摆放的东西。", en: "Each act is a Tiled map: the engine draws the ground, and the rules read solid cells and placed things from the same file." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "粒子与正片叠底", en: "Particles and multiply blending" },
        description: { zh: "皮偶与布景用正片叠底画在幕布上，像透光的皮；火星、尘土和风火轮的火是 2D 粒子。", en: "Puppets and scenery are multiplied onto the screen like leather against a lamp; sparks, dust and the wheels’ fire are 2D particles." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "原生 UI 与触点会话", en: "Native UI and pointer sessions" },
        description: { zh: "戏单、战斗 HUD、暂停和结算画在同一块白鹭画布上，双指触控各管各的触点，横竖屏都适配。", en: "The playbill, combat HUD, pause and results share the Egret canvas, two-finger touch keeps separate contacts, and both orientations fit." },
        source: 'src/native-ui.mjs',
      },
    ],
  },
  {
    id: 'fivephases', folder: 'FivePhases', kind: '2d',
    portraitGallery: true,
    scenes: [
      { zh: "第一关 · 白鹭原生牌局界面", en: "Stage one · Native Egret battle UI" },
      { zh: "过关奖励 · 原生卡牌三选一", en: "After a stage · Native card reward choices" },
      { zh: "开场 · 原版绘卷与五行纹章", en: "Title · Original artwork and elemental emblems" },
    ],
    zh: "五行牌阵", en: "Five Phases",
    genre: { zh: "卡牌与三消", en: "Cards and match-three" },
    summary: { zh: "用五色消除积攒能量，搭配牌组，连闯三关。", en: "Build elemental energy through matching, then combo your cards across three stages." },
    features: [
      {
        title: { zh: "数据界面与读屏", en: "Views as data, read aloud" },
        description: { zh: "标题、战况、手牌、奖励和结算是 game.show 数据界面，键盘焦点和读屏语义来自引擎。", en: "The title, battle status, hand, rewards and results are game.show views, with keyboard focus and screen-reader semantics from the engine." },
        source: 'src/ui/hud.mjs',
      },
      {
        title: { zh: "段落排版的卡牌", en: "Cards set as paragraphs" },
        description: { zh: "中文卡牌说明和阵法规则由引擎的段落排版自动换行。", en: "Chinese card text and the formation rules wrap through the engine’s paragraph layout." },
        source: 'src/ui/hud.mjs',
      },
      {
        title: { zh: "指针会话", en: "Pointer sessions" },
        description: { zh: "点选和拖格用引擎的指针会话：第一个触点拥有手势，中途取消就不交换。", en: "Tapping and dragging tiles use engine pointer sessions: the first contact owns the gesture, and a cancelled drag swaps nothing." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "纹理图集与位图", en: "Texture atlases and bitmaps" },
        description: { zh: "棋子位图复用纹理图集里的区域，棋盘格子从对象池取用，连锁演出也取自同一张图集。", en: "Tile bitmaps reuse regions of one texture atlas, board cells come from a pool, and the chain effects draw from the same atlas." },
        source: 'src/view/tile-atlas.mjs',
      },
      {
        title: { zh: "立绘分片动画", en: "Layered portrait animation" },
        description: { zh: "立绘拆成部件，用 Sprite 和 Bitmap 组合，播放姿态和出招的关键帧。", en: "Portraits are split into pieces of Sprites and Bitmaps that play pose and attack keyframes." },
        source: 'src/view/portrait.mjs',
      },
    ],
  },
  {
    id: 'love', folder: 'LoveElective', kind: '2d',
    scenes: [
      { zh: "首页 · 星空祭前的校园", en: "Title screen · Campus before the Star Festival" },
      { zh: "男主衣橱 · 衬衫与西装叠穿", en: "Protagonist's wardrobe · Layered shirt and blazer" },
      { zh: "睡衣派对 · 唐蜜与不加糖的可可", en: "Pyjama party · Unsweetened cocoa with Tang Mi" },
    ],
    zh: "心动选修课", en: "Love Elective",
    genre: { zh: "校园恋爱养成", en: "Campus romance and dress-up" },
    summary: { zh: "在星空祭之前认识一个人，也找到自己的穿搭风格。", en: "Get to know someone before the Star Festival while finding your own style." },
    features: [
      {
        title: { zh: "图层视差", en: "Layered parallax" },
        description: { zh: "背景、角色、近景和粒子分层，以不同幅度平移并一起推近，做出伪 2.5D 的纵深。", en: "Background, characters, foreground and particles shift by different amounts and zoom together for a pseudo-2.5D depth." },
        source: 'src/engine/world.mjs',
      },
      {
        title: { zh: "换装分层合成", en: "Layered wardrobe preview" },
        description: { zh: "服饰、配件和每件单品的配色合成为角色贴图，再由白鹭在舞台上画出全身预览。", en: "Garments, accessories and each item’s colours are composited into a character texture that Egret draws as a full-body preview." },
        source: 'src/engine/world.mjs',
      },
      {
        title: { zh: "昼夜染色", en: "Dusk and night tints" },
        description: { zh: "共享材质的线性光色给角色染上黄昏或夜色，和背景的时段一致。", en: "A shared material’s linear light colour tints the characters for dusk and night, matching the time of day behind them." },
        source: 'src/engine/stage.mjs',
      },
      {
        title: { zh: "逐字显示的对话", en: "Dialogue that writes itself" },
        description: { zh: "同一张文字贴图放进两个裁剪容器，一个显示写完的行，一个显示正在出现的行。", en: "One text texture sits in two clipped containers: one shows the finished lines, the other the line still appearing." },
        source: 'src/engine/ui.mjs',
      },
      {
        title: { zh: "读屏与原生输入", en: "Semantics and native input" },
        description: { zh: "画布上的按钮、页签和弹窗有名称、焦点和读屏投影，指针、悬停和键盘由引擎处理。", en: "Canvas buttons, tabs and dialogs have names, focus and an accessibility projection, with pointer, hover and keys handled by the engine." },
        source: 'src/engine/ui-semantics.mjs',
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
        title: { zh: "2D 物理与绳索", en: "2D physics and ropes" },
        description: { zh: "弹丸、木块、闸门和吊着的重物都是引擎刚体，吊绳是关节，切断即移除。", en: "Pellets, blocks, gates and hanging weights are engine bodies; ropes are joints, and cutting one removes it." },
        source: 'src/sim/sim.mjs',
      },
      {
        title: { zh: "Tiled 关卡", en: "Tiled levels" },
        description: { zh: "12 关都是 Tiled 地图，带 solid 属性的瓦片生成碰撞体，按相机视野裁剪绘制。", en: "All twelve levels are Tiled maps; tiles marked solid become colliders, and drawing is culled to the camera." },
        source: 'src/play/level.mjs',
      },
      {
        title: { zh: "相机、视差与粒子", en: "Camera, parallax and particles" },
        description: { zh: "2D 相机跟随弹丸、震屏、缩放到全景，配三层视差；碎木、火花和雷光是加亮混合的粒子。", en: "The 2D camera follows the pellet, shakes and zooms out over three parallax layers; splinters, sparks and thunder are additive particles." },
        source: 'src/play/level.mjs',
      },
      {
        title: { zh: "原生控件与键盘", en: "Native controls and keys" },
        description: { zh: "按钮、力度滑条、选关单选、横向滚动和开关都是引擎控件，全部能用键盘操作。", en: "Buttons, the power slider, the level choice, the scrolling strip and switches are engine controls, all usable from the keyboard." },
        source: 'src/ui/kit.mjs',
      },
      {
        title: { zh: "一棵语义树", en: "One semantic tree" },
        description: { zh: "整个游戏一棵语义树，投影给读屏软件：按钮、开关、滑条、对话框和状态播报。", en: "One semantic tree covers the game and is projected for screen readers: buttons, switches, the slider, dialogs and announcements." },
        source: 'src/main.mjs',
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
        description: { zh: "画布、帧循环、碎片、震屏、提示、加速和暂停都来自引擎的 play。", en: "The canvas, the loop, bursts, shakes, notices, speed and pause all come from the engine’s play." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "数据界面与横竖屏", en: "Views for both orientations" },
        description: { zh: "标题、帮助、设置、操作栏、塔位和结算是 game.show 数据界面，按状态绑定，横竖屏各有布局。", en: "The title, help, settings, command bar, tower picker and results are game.show views bound to state, laid out for both orientations." },
        source: 'src/native-ui.mjs',
      },
      {
        title: { zh: "实时图形与登陆预判", en: "Live graphics and landing preview" },
        description: { zh: "Graphics 绘制器械动作、船桨和命中反馈，也会在纤道上标出选中楼船的预计登陆点。", en: "Graphics animates machinery, oars and impacts, and marks where the crew of a selected junk would land." },
        source: 'src/view.mjs',
      },
      {
        title: { zh: "合成音效与配乐", en: "Synthesized sound and music" },
        description: { zh: "原创配乐和合成音效分总线混音，随备战、交战和旗舰登场切换音乐。", en: "The original score and synthesized effects are mixed on separate buses, the music changing for preparation, combat and the flagship." },
        source: 'src/sound.mjs',
      },
    ],
  },
  {
    id: 'nezha', folder: 'NezhaSea', kind: '2d',
    portraitGallery: true,
    scenes: [
      { zh: "新版标题 · 哪吒的三种形态与选角", en: "Title screen · Three forms of Nezha and character selection" },
      { zh: "第五波 · 乾坤圈迎战龙宫水族", en: "Wave five · The universe ring confronts the sea creatures" },
      { zh: "第十波 · 巡海夜叉首领与法宝特效", en: "Wave ten · The Sea Yaksha boss and treasure effects" },
    ],
    zh: "哪吒闹海", en: "Nezha Stirs the Sea",
    genre: { zh: "割草肉鸽", en: "Survivors-like roguelite" },
    summary: { zh: "操纵哪吒挡住二十波龙宫水族，在集市里买法宝并合成神器。", en: "Steer Nezha through twenty waves of the Dragon King's soldiers, and buy and merge treasures into divine ones." },
    features: [
      {
        title: { zh: "多屏适配与平板布局", en: "Every screen, tablets included" },
        description: { zh: "fit 扩展保住完整战场，uiScale 保持手机上的尺寸，平板有独立的双栏集市和结算布局。", en: "An expanding fit keeps the whole battlefield, uiScale holds phone sizes, and tablets get their own two-column market and results." },
        source: 'src/ui-screens.mjs',
      },
      {
        title: { zh: "数据界面、页签与确认", en: "Views, tabs and confirmations" },
        description: { zh: "标题、设置、暂停、升级和集市是数据界面；页签有选中语义，出售用引擎的确认框。", en: "The title, settings, pause, upgrades and market are views; tabs carry their selected state, and sales ask through the engine’s confirmation." },
        source: 'src/ui-market.mjs',
      },
      {
        title: { zh: "浮动摇杆与拖放合成", en: "Floating stick and drag-to-merge" },
        description: { zh: "移动用引擎的浮动摇杆，独占自己的触点；两件相同的法宝可以拖到一起合成。", en: "Movement uses the engine’s floating stick on its own contact, and two matching treasures can be dragged together to merge." },
        source: 'src/sea-stick.mjs',
      },
      {
        title: { zh: "共享角色图集与战斗特效", en: "Shared actor atlas and combat effects" },
        description: { zh: "哪吒、水族兵、首领和法宝共用一张运行时图集，Graphics 画武器轨迹与首领预警。", en: "Nezha, the sea soldiers, bosses and treasures share one runtime atlas, with Graphics for weapon trails and boss warnings." },
        source: 'src/view.mjs',
      },
      {
        title: { zh: "可由电脑打完的规则", en: "Rules a bot can play" },
        description: { zh: "波次、集市、合成和神器都在不依赖页面的规则里，电脑玩家在 Node 里整局打完来调平衡。", en: "Waves, the market, merging and divine recipes live in page-free rules, played through by a bot in Node to tune the balance." },
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
        title: { zh: "图集帧与动画控制器", en: "Atlas frames and a sequence controller" },
        description: { zh: "邪祟从同一张图集的对象池取用，按年纪取走路帧；首领的步伐由动画控制器在引擎时钟上推动。", en: "Haunts come pooled from one atlas, each on the walk frame of its age, and a warden’s steps run on the engine clock through a sequence controller." },
        source: 'src/view/field.mjs',
      },
      {
        title: { zh: "粒子与双色着色", en: "Particles and two-colour tints" },
        description: { zh: "火星、纸屑、鬼火和雾是粒子发射器；命中闪白、冰冻、灼烧和雷击定身是材质的双色着色。", en: "Sparks, paper, ghost fire and mist are particle emitters; hit flashes, frost, fire and the thunder’s stun are two-colour material tints." },
        source: 'src/view/field.mjs',
      },
      {
        title: { zh: "双指操作与手柄震动", en: "Two fingers and rumble" },
        description: { zh: "一指拖动符弩、另一指按天雷，各管各的触点；手柄在受击、天雷和首领倒下时震动。", en: "One finger steers the crossbow while another presses the thunder seal, each its own contact; the gamepad shakes on hits, thunder and a warden’s fall." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "混音器上的合成音效", en: "Made sounds on the mixer" },
        description: { zh: "音效和配乐在代码里合成，交给引擎混音器；冷却和同时发声上限让满屏击杀也听得清。", en: "Sounds and music are synthesized in code for the engine’s mixer, with cooldowns and voice caps keeping a screen full of kills clear." },
        source: 'src/audio/sound.mjs',
      },
      {
        title: { zh: "替身打完的三夜", en: "Nights a stand-in plays through" },
        description: { zh: "出怪、符法、天雷和首领都在不依赖页面的规则里，替身玩家无页面跑完三夜来调平衡。", en: "Spawns, wards, thunder and wardens live in page-free rules, and a stand-in plays all three nights headless to set the balance." },
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
        description: { zh: "向听数、对局和台数都在不依赖页面的规则里，四家电脑在 Node 里整将对打来比较难度和性格。", en: "Shanten, play and tai live in page-free rules, and four computer players play whole games in Node to compare levels and characters." },
        source: 'src/sim/game.mjs',
      },
      {
        title: { zh: "牌面图集与叫牌演出", en: "Tile atlas and call effects" },
        description: { zh: "42 种牌面共用一张图集，手牌和飞行的牌用 sourceRect 取图；叫牌时引擎画光纹和粒子。", en: "The 42 faces share one atlas cut by sourceRect for hands and flying tiles, and the engine draws light and particles on each call." },
        source: 'src/view.mjs',
      },
      {
        title: { zh: "静态牌桌加引擎动画", en: "A still table under the engine" },
        description: { zh: "桌上静止的牌画在引擎画布下面的页面 canvas 上，只在变化时重画；引擎只画手牌、飞行的牌和大字。", en: "Tiles at rest are painted on a page canvas under the engine’s, only when they change; the engine draws the hand, the flights and the words." },
        source: 'src/felt.mjs',
      },
      {
        title: { zh: "转桌与平板布局", en: "A turned table and tablet layouts" },
        description: { zh: "窄手机把牌桌转九十度、平板直放；座位牌用 game.pin 贴在实际的安全区里。", en: "Narrow phones turn the table a quarter, tablets keep it upright, and seat plates are pinned to the real safe area with game.pin." },
        source: 'src/layout.mjs',
      },
      {
        title: { zh: "数据界面与具名焦点", en: "Views with named focus" },
        description: { zh: "标题、规则、设置、战绩、吃牌组合和结算是数据界面，焦点、弹窗关闭后的复位和列表滚动由引擎管理。", en: "The title, rules, settings, record, chow choices and results are views, with focus, its return after a dialog and list scrolling managed by the engine." },
        source: 'src/screens.mjs',
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
        title: { zh: "数据界面与屏幕栈", en: "Views and the screen stack" },
        description: { zh: "标题、存档、设置、顶栏、标签和单子是数据界面；设置、存档槽和离线收获经屏幕栈开关并还回焦点。", en: "The title, saves, settings, top bar, tabs and sheets are views; settings, save slots and the offline report open through the screen stack and give focus back." },
        source: 'src/screens.mjs',
      },
      {
        title: { zh: "静态县城上的动态层", en: "A live layer over a still county" },
        description: { zh: "县城由页面画布画一次，行人、小船、天气和飘字交给叠在上面的透明引擎画布。", en: "The county is painted once on a page canvas, and people, boats, weather and floating numbers move on a clear engine canvas above it." },
        source: 'src/view.mjs',
      },
      {
        title: { zh: "真实时间和离线补算", en: "Real time and catching up" },
        description: { zh: "规则按真实秒数推进；离开再回来时按仓廪容量补算收成，先看一张收获清单。", en: "The rules move with real seconds; an absence is counted up to the granaries’ capacity, and a return opens with a list of what came in." },
        source: 'src/sim/world.mjs',
      },
      {
        title: { zh: "模拟玩家调出来的节奏", en: "Pacing set by a simulated player" },
        description: { zh: "替身县令按勤快、常来、偶尔来三种作息玩完一整任，测试保证每种作息都不少于三天。", en: "A stand-in magistrate plays whole terms on three daily habits, and the tests hold every habit to three days or more." },
        source: 'tools/pacing.mjs',
      },
      {
        title: { zh: "引擎的存档库和文字表", en: "The engine’s save store and text table" },
        description: { zh: "整座县城存进有版本的存档，坏档另存后重开；换语言时连地图上的坊名一起重画。", en: "The whole county goes into a versioned save, a broken one set aside, and a change of language repaints even the ward names on the map." },
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
        description: { zh: "200×300 的沙盘切成十五条贴图，每帧只重传有沙动过的几条；放大两倍，沙粒仍颗颗分明。", en: "A 200 by 300 tray is cut into fifteen strip textures, and only the strips whose sand moved are uploaded each frame; grains stay sharp at twice their size." },
        source: 'src/view/board.mjs',
      },
      {
        title: { zh: "布景与沙盘分层", en: "Still frame, live sand" },
        description: { zh: "沙框、碟子和装裱画在透明引擎画布下面，只在变化时重画；引擎只画沙粒、积木、粒子和按钮。", en: "The frame, dishes and mount sit under the clear engine canvas and redraw only when they change; the engine draws the sand, pieces, particles and buttons." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "可复跑的沙粒模拟", en: "Replayable sand simulation" },
        description: { zh: "下落、侧滑和同色连通在模拟层里算，同样的种子和操作得到同样结果，可在 Node 中复跑。", en: "Falling, sliding and same-colour connections are computed apart from drawing; the same seed and inputs give the same result, replayable in Node." },
        source: 'src/sim/sand.mjs',
      },
      {
        title: { zh: "从山水里取样的拆画", en: "Pictures to unpaint, sampled from the landscapes" },
        description: { zh: "拆画的画从代码画的山水里截取，按透明度和颜料取沙；每一幅都由替身玩家验证能拆完。", en: "Unpaint pictures are cut from the painted landscapes, sand taken by opacity and pigment, and a stand-in has finished every one." },
        source: 'src/sim/unpaint.mjs',
      },
      {
        title: { zh: "合成配乐与操作反馈", en: "Synthesized music and gameplay cues" },
        description: { zh: "三种模式各一段拨弦与竹笛配乐，落沙、连消和合桶有各自的音效，经引擎混音器分总线播放。", en: "Each mode has a plucked-string and flute theme, and drops, chains and merges have their own cues, played on separate buses of the engine’s mixer." },
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
        title: { zh: "引擎混音器与曲子时钟", en: "The mixer as the song’s clock" },
        description: { zh: "伴奏是引擎混音器里的一个声部，曲子的时间取自它的位置，再扣除输出延迟。", en: "The backing is one voice of the engine’s mixer, and the song’s time is its position less the output delay." },
        source: 'src/audio/sound.mjs',
      },
      {
        title: { zh: "代码合成的锣鼓与京胡", en: "Gongs, drum and fiddle in code" },
        description: { zh: "单皮鼓、小锣、大锣、铙钹、板和京胡都由数算出，编成 WAV 交给引擎。", en: "The drum, gongs, cymbals, clapper and jinghu are computed and handed to the engine as WAV." },
        source: 'src/audio/synth.mjs',
      },
      {
        title: { zh: "按下那一刻判定", en: "Judged at the press" },
        description: { zh: "敲击区听引擎指针的按下事件，按事件自带的时间戳判定，不等手指抬起。", en: "The pads listen for the engine pointer’s press and judge by the event’s own time stamp, without waiting for the finger to lift." },
        source: 'src/main.mjs',
      },
      {
        title: { zh: "判定与谱面", en: "Judging and charts" },
        description: { zh: "锣鼓经的点子按难度排谱，判定、连击和彩槽都能在 Node 里由电脑玩家整首打完。", en: "Patterns become charts by difficulty, judged with combo and gauge, all playable by a bot in Node." },
        source: 'src/sim/judge.mjs',
      },
      {
        title: { zh: "数据界面与读屏", en: "Views as data, read aloud" },
        description: { zh: "标题、设置、校准、暂停、结算和四块敲击区都是数据界面，横竖屏各一套部件，经屏幕栈开关。", en: "The title, settings, delay check, pause, results and the four pads are views with wide and tall layouts, opened through the screen stack." },
        source: 'src/ui/screens.mjs',
      },
    ],
  },
  {
    id: 'inquest', folder: 'InquestScrolls', kind: '2d',
    scenes: [
      { zh: "纸坊悬梁 · 定格在案发瞬间的现场长卷：工头、仵作、坊主和梁上的绳套，红圈是可查的证物", en: "The Beam at the Paper Mill · The scene frozen at the moment of the crime: the foreman, the coroner's aide, the owner and the noose; red rings mark the evidence" },
      { zh: "尸身 · 白描正背人形图上标着伤痕，带下划线的词点一下收进词囊", en: "The body · Wounds marked on the front and back body chart; tap an underlined word to put it in the pouch" },
      { zh: "卷宗 · 把词拖进同色的空位，一页全对，盖上朱印", en: "The dossier · Words dragged into blanks of their colour; a page all right is sealed in red" },
    ],
    zh: "洗冤笔录", en: "The Inquest Scrolls",
    genre: { zh: "宋代刑侦推理", en: "Song-dynasty detective deduction" },
    summary: { zh: "南宋提点刑狱官覆检白蘋县的五份“太干净”的检验格目：在定格的现场长卷里点人、点物、读文书，把人名、器物、痕迹、死因、处所和情由收进词囊，逐页填完卷宗；全对盖印，错两处以内只说“尚有两处以内不实”。六案连成一桩伪造会子的大案，最后亲手写判词。验尸手法依《洗冤集录》，人物与案情原创；网页之外还能导出为微信小游戏。", en: "A Southern Song judicial intendant reopens five inquest forms from Baipin County that are too clean: tap people, things and documents in a frozen handscroll of each scene, gather names, objects, marks, causes, places and motives, and fill the dossier page by page; all right and it is sealed, two or fewer wrong and it says only that. Six cases join into one of forged paper money, and the last verdict is written by hand. The inquest methods follow the Collected Cases of Injustice Rectified; the people and cases are original; it also exports as a WeChat mini game." },
    features: [
      {
        title: { zh: "CanvasKit 段落与文字几何", en: "CanvasKit paragraphs and text geometry" },
        description: { zh: "卷宗和证物由 CanvasKit 段落排版，用文字几何量出空位、找到手指下的词、画下划线。", en: "Dossiers and evidence are CanvasKit paragraphs whose text geometry measures blanks, finds the word under a finger and draws underlines." },
        source: 'src/view/type.mjs',
      },
      {
        title: { zh: "拖词、平移与缩放", en: "Dragging words, panning and pinching" },
        description: { zh: "把词签拖进卷宗空位，空位只收同类的词；现场长卷可拖动平移、双指缩放。", en: "Word slips are dragged into blanks that accept only their kind, and the scene scroll pans by drag and zooms by pinch." },
        source: 'src/view/dossier.mjs',
      },
      {
        title: { zh: "判词与笔录的文字输入", en: "Text input for the verdict and the notes" },
        description: { zh: "判词框放平台文本框，输入法照常可用；笔录是多行编辑器，收起后由段落画出并随存档保留。", en: "The verdict opens a platform text field with input methods, and the notes are a multi-line editor drawn as a paragraph at rest and saved." },
        source: 'src/view/notes.mjs',
      },
      {
        title: { zh: "按案载入与谜题审计", en: "Pictures by case, and the puzzle audit" },
        description: { zh: "每案的图片作为一组载入、一并释放；Node 测试验证每案可解、每个空位只有一个答案。", en: "Each case’s pictures load and unload as one asset group, and Node tests hold that every case is solvable with one answer per blank." },
        source: 'src/sim/audit.mjs',
      },
      {
        title: { zh: "清单载入的子集字体", en: "Subset fonts from a manifest" },
        description: { zh: "宋体与书法两套子集字体按引擎内容工具生成的清单载入，并校验 SHA-256。", en: "A Song face and a calligraphic face, both subset, load from a manifest built by the engine’s content tools and checked by SHA-256." },
        source: 'src/view/type.mjs',
      },
    ],
  },
  {
    id: 'luban', folder: 'LubanBridge', kind: '2d',
    scenes: [
      { zh: "开篇画卷 · 原创水彩蜀道悬索桥，题签和朱砂工坊按钮", en: "Opening scroll · Original painted Shu Road suspension bridge with silk and cinnabar menu" },
      { zh: "赵州桥 · 双层石拱的参考图纸与受力工程网格", en: "Zhaozhou Bridge · A reference double stone arch, drawn in the live engineering grid" },
      { zh: "试通小河 · 玩家搭成木桥后，挑夫与独轮车从左岸出发", en: "First crossing · A porter and wheelbarrow set off toward the player-built timber bridge" },
    ],
    zh: "鲁班造桥", en: "Luban's Bridges",
    genre: { zh: "物理造桥解谜", en: "Physics bridge-building puzzle" },
    summary: { zh: "鲁班门下的匠人走遍江南、赵州、蜀道、潮州和侗乡，在网格上搭木梁、竹架、石拱、悬索和浮桥，让挑夫、花轿、马车和运石车过河。点“试通”后桥身按真实受力弯曲变色，太吃力的杆件拉断、压坏、落水。五章二十五关，每章最后重建一座名桥，三枚印章，另有沙盒。原创青绿水彩原画与实时工程绘制相结合，配有原创古琴、箫与材料拟音；支持触屏、键鼠和横竖屏。", en: "One of Lu Ban's apprentices travels through Jiangnan, Zhaozhou, the Shu Road, Chaozhou and Dong country, laying timber beams, bamboo frames, stone arches, suspension cables and pontoon bridges on a grid so that porters, a bridal sedan, horse carts and a stone wagon can cross. On Test the bridge bends and colours with its real loads, and a member that works too hard tears, crushes and falls in the river. Five chapters of five levels, each ending with a famous bridge, three seals, and a sandbox. Original watercolor scenery accompanies live engineering drawings, with an original guqin-and-xiao score and material foley. Touch and keyboard/mouse, wide and tall." },
    features: [
      {
        title: { zh: "2D 物理与牵引", en: "2D physics and hitches" },
        description: { zh: "车轮、车与牲口之间的杆和绳、跟着桥身走的桥面和落水的碎木石，都是引擎的刚体与关节。", en: "Wheels, the rods and ropes between carts and beasts, deck bodies that follow the frame and falling debris are engine bodies and joints." },
        source: 'src/sim/run.mjs',
      },
      {
        title: { zh: "实时受力绘制", en: "Live load colours" },
        description: { zh: "Graphics 画出杆件、地形、节点和受力颜色；水彩布景按场景载入，失败时换成程序绘图。", en: "Graphics draws members, terrain, joints and load colours, while watercolour scenery loads per scene with a drawn fallback." },
        source: 'src/view/art.mjs',
      },
      {
        title: { zh: "手势、悬停与键盘光标", en: "Gestures, hover and a keyboard cursor" },
        description: { zh: "拖动搭杆、长按拆除、双指缩放、双击复位；悬停显示杆长和造价，键盘和手柄用网格光标搭桥。", en: "Drag to lay, long-press to remove, pinch to zoom and double-tap to fit; hover shows length and cost, and keys or a gamepad build with a grid cursor." },
        source: 'src/view/build.mjs',
      },
      {
        title: { zh: "混音与材料声音", en: "Mixed sound by material" },
        description: { zh: "立体声配乐、流水声和 24 种合成音效经引擎混音器播放，搭建和断裂的声音按材料区分。", en: "Stereo music, river ambience and 24 synthesized cues play on the engine’s mixer, with building and breaking sounds that follow the material." },
        source: 'src/audio/sound.mjs',
      },
      {
        title: { zh: "每关都有参考解", en: "A reference for every level" },
        description: { zh: "每关的参考桥在 Node 里过河、一根不断，造价定下预算；只铺桥面的桥哪一关都过不去。", en: "Every level has a reference bridge that crosses in Node with nothing broken and sets the budget, and a bare deck fails everywhere." },
        source: 'test/rules.test.mjs',
      },
    ],
  },
];
