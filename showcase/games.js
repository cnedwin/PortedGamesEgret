// Add one entry and a matching media/<id>/ directory when adding a case.
// A feature's source is relative to the game's folder.
export const FEATURED_ID = 'snow';

export const GAMES = [
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
      { zh: "校园地图", en: "Campus map" },
      { zh: "序章对白", en: "Prologue dialogue" },
      { zh: "衣橱与配色", en: "Wardrobe and colours" },
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
];
