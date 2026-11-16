// The games shown on the front page, in the order they appear.
// Each entry names its folder, both titles, a short line for the selection
// strip, a longer introduction in each language, a few facts, and the
// pictures kept in showcase/media/<id>/. `accent` tints that game's page.

export const GAMES = [
  {
    id: 'fps',
    folder: 'FPS',
    zh: '断流行动',
    en: 'Operation Cutoff',
    accent: '#7fe0a8',
    genre: { zh: '第一人称战术射击', en: 'First-person tactical shooter' },
    line: {
      zh: '潜入水电站，守住情报传输，赶在增援合围前登机撤离。',
      en: 'Slip into a hydro station, hold the data uplinks and make the helicopter before the net closes.',
    },
    intro: {
      zh: '黎明时分，一名特勤干员潜入被武装分子占据的青岚水电站。你要在堆场、厂房和办公楼接入三处数据终端，守在终端附近直到情报传完，再顶住一波波增援赶到停机坪登机撤离。敌人会换弹、找掩体、从侧面包抄，也会朝你藏身的地方扔手雷。物资箱里有按稀有度分色的贵重物品、枪械配件和补给，背包却只有十二格。雨里的湿地面映出倒影，探照灯投下阴影，中弹的敌人会软倒在地。整座电站、每个角色、所有贴图和声音都由代码即时生成，不下载任何素材。',
      en: 'At first light an operator slips into the Qinglan hydro station, held by an armed militia. Plug in at three data terminals in the cargo yard, the powerhouse and the office block, stay close while each one sends its data, then fight through the reinforcements to the helipad. Enemies reload, take cover, work round your flank and throw grenades at where you hide. Crates hold valuables coloured by rarity, weapon attachments and supplies, and the backpack only has twelve slots. Wet ground mirrors the floodlights, the lights cast shadows, and soldiers go limp when they fall. The station, every soldier, every texture and every sound is made in code as the page loads.',
    },
    facts: {
      zh: [['画面', '3D，WebGL2 与 WebGPU'], ['操作', '键鼠、触屏'], ['语言', '中文、英文']],
      en: [['Graphics', '3D, WebGL2 and WebGPU'], ['Controls', 'Keyboard and mouse, touch'], ['Languages', 'Chinese, English']],
    },
    cover: 'cover.webp',
    shots: ['1.webp', '2.webp', '3.webp', '4.webp'],
  },
  {
    id: 'jy',
    folder: 'JY',
    zh: '金庸群侠传',
    en: 'A Tribute to Heroes of Jin Yong',
    accent: '#d9a866',
    genre: { zh: '武侠角色扮演', en: 'Wuxia role-playing' },
    line: {
      zh: '走进金庸笔下的江湖，结识书中人物，组队踏上经典回合制征途。',
      en: 'Walk into the world of Jin Yong’s novels, meet its heroes and lead a party through classic turn-based battles.',
    },
    intro: {
      zh: '向《金庸群侠传》、智冠公司与金庸先生致敬的武侠网页游戏。你在小虾米居醒来，一脚踏进金庸笔下的江湖：在三维的江湖大地图上行走，穿过客栈、山门、河岸与海滨，与书中人物交谈，招募队友，组成自己的队伍。战斗沿用经典的回合制格子战，移动路线、武学范围和暗器目标都能先预览再确认。场景、人物和光影由新白鹭引擎的三维渲染实时绘制，带有骨骼动画、实时阴影、环境光遮蔽和随高度变化的雾气。进度保存在浏览器里，电脑、手机和手柄都能操作。',
      en: 'A wuxia browser game paying tribute to Heroes of Jin Yong, Soft-World and Jin Yong. You wake in Xiaoxiami’s house and step into the world of Jin Yong’s novels: walk a three-dimensional world map past inns, sect gates, riverbanks and the coast, talk with characters from the books, recruit companions and build your own party. Battles keep the classic turn-based grid, and every move, skill area and thrown weapon can be previewed before you confirm it. Scenes, characters and light are drawn live by the new Egret engine, with skeletal animation, real-time shadows, ambient occlusion and height-based haze. Progress is kept in the browser, and it plays with a mouse, touch or a gamepad.',
    },
    facts: {
      zh: [['画面', '3D，WebGL2'], ['操作', '鼠标、触屏、键盘、手柄'], ['首次载入', '约 37 MB 游戏数据']],
      en: [['Graphics', '3D, WebGL2'], ['Controls', 'Mouse, touch, keyboard, gamepad'], ['First launch', 'About 37 MB of game data']],
    },
    cover: 'cover.webp',
    shots: ['1.webp', '2.webp', '3.webp'],
  },
  {
    id: 'wulin',
    folder: 'Wulin',
    zh: '武林天下',
    en: 'Wulin',
    accent: '#d6b25e',
    genre: { zh: '武侠门派经营', en: 'Wuxia sect management' },
    line: {
      zh: '执掌一派，建山门、收弟子，在群雄之间或战或和。',
      en: 'Lead a sect, raise its seat and its disciples, and fight or befriend the rest of the martial world.',
    },
    intro: {
      zh: '禁武令已下，山门未闭。你从十二个门派中择一而掌，开局便是总舵掌门：兴建与扩建山门里的建筑，在招贤榜前收录弟子，为每个人安排修练、采集、制造或行侠的差事，让他们从杂役一步步晋升为亲传。新局有数年立足期，抓紧扩建、延揽门徒、理顺收支；之后便要与各派或战或和，开设分舵、出兵攻伐，直到一统江湖或被推为武林盟主。交战时双方自动交手，你可以随时暂停、调速、点选敌人集火或撤退。山门与江湖大地图都由新白鹭引擎以三维绘制，存档可导入导出，还内置修改器。目前仍在持续开发。',
      en: 'The ban on martial arts has been proclaimed, but the sect gates stay open. Take charge of one of twelve sects as the leader at its seat: put up and enlarge buildings, take in disciples at the recruiting board, and give each one work, whether practising an art, gathering, crafting or doing good deeds, until they rise from servant to personal disciple. A new campaign starts with years of truce to grow in; after that you settle new ground, march on your neighbours or make peace, until you rule the martial world or are named its leader. Battles play out on their own while you pause, change speed, pick targets or call a retreat. The seat and the world map are drawn in 3D by the new Egret engine, saves can be exported and imported, and there is a built-in editor. Still in active development.',
    },
    facts: {
      zh: [['画面', '3D 山门、江湖与战斗，WebGL2'], ['操作', '鼠标、触屏、键盘'], ['状态', '开发中']],
      en: [['Graphics', '3D seat, world map and battles, WebGL2'], ['Controls', 'Mouse, touch, keyboard'], ['Status', 'In development']],
    },
    cover: 'cover.webp',
    shots: ['1.webp', '2.webp', '3.webp', '4.webp'],
  },
  {
    id: 'rally',
    folder: 'Rally',
    zh: '锦绣飞车',
    en: 'Jinxiu Rally',
    accent: '#ff5a3c',
    genre: { zh: '3D 卡丁车竞速', en: '3D kart racing' },
    line: {
      zh: '醒狮、熊猫、美猴王同场飙车，漂移、道具、抢第一。',
      en: 'A lion dancer, a panda and the Monkey King race for first place with drifts and items.',
    },
    intro: {
      zh: '八位带着中国元素的车手同场竞速：醒狮、熊猫、美猴王、玉兔、青龙、秦俑、京剧花脸和虎头娃。山水环道穿过牌楼、石桥、宝塔和长城，路上有铜钱可捡、祥云门可穿、尾流可借，也有泥潭、石狮和滚鼓需要绕开。过弯时漂移能攒出加速，再用爆竹、蹴鞠、纸鸢、金钟罩、雷公鼓、筋斗云等十二种道具扭转名次。比赛分三个级别，可选一圈、三圈或五圈，其余七位车手由电脑驾驶。键盘、手柄和触屏都能玩，音乐和音效都由浏览器即时合成。',
      en: 'Eight racers with a Chinese flavour share the grid: a lion dancer, a panda, the Monkey King, the Jade Rabbit, the Azure Dragon, a terracotta warrior, a Peking opera mask and a child in a tiger hat. The Mountain and Water Circuit runs past a ceremonial gate, a stone bridge, pagodas and the long wall, with coins to collect, cloud gates to thread and slipstreams to use, and mud, stone lions and rolling drums to avoid. Drift through corners to build a boost, then turn the race with twelve items, from firecrackers, cuju balls and kites to a golden bell, a thunder drum and a somersault cloud. There are three classes over one, three or five laps, with the other seven drivers run by the computer. It plays with a keyboard, a gamepad or touch, and its music and sound are made live in the browser.',
    },
    facts: {
      zh: [['画面', '3D，WebGL2 与 WebGPU'], ['操作', '键盘、手柄、触屏'], ['语言', '中文、英文']],
      en: [['Graphics', '3D, WebGL2 and WebGPU'], ['Controls', 'Keyboard, gamepad, touch'], ['Languages', 'Chinese, English']],
    },
    cover: 'cover.webp',
    shots: ['1.webp', '2.webp', '3.webp'],
  },
  {
    id: 'pandas',
    folder: 'jelly-pandas',
    zh: '果冻熊猫',
    en: 'Jelly Pandas',
    accent: '#ff8fc4',
    genre: { zh: '3D 动作生存', en: '3D action survival' },
    line: {
      zh: '半透明的果冻熊猫，在玩具岛上顶住糖果大军十五分钟。',
      en: 'See-through jelly pandas hold a toy island against a candy horde for fifteen minutes.',
    },
    intro: {
      zh: '半透明的果冻熊猫被困在玩具岛上，要独自或带着伙伴，在糖果大军的围攻下坚持十五分钟。八只熊猫各带一件看家玩具，十二种会自动开火的玩具可以升级，满级后还能进化；大跳、下砸、肚皮撞和翻滚能把成群的敌人撞飞，每五分钟还有一个首领登场。熊猫的身体是半透明、会晃动的果冻，岛上有水面倒影、实时阴影和环境光遮蔽，糖果敌人成群结队地涌来。可以单人游玩，也能带上最多三位由游戏操控的伙伴，支持键鼠、手柄和触屏。',
      en: 'See-through jelly pandas are stranded on a toy island and must hold out for fifteen minutes against a candy horde, alone or with friends. Each of the eight pandas starts with its own toy, and twelve self-firing toys level up and, at full strength, evolve. Super jumps, slams, belly bumps and rolls send crowds of enemies flying, and a boss arrives every five minutes. The pandas are wobbly, see-through jelly, and the island has water reflections, real-time shadows and ambient occlusion while the candy army pours in. Play alone or bring up to three friends steered by the game, with keyboard and mouse, a gamepad or touch.',
    },
    facts: {
      zh: [['画面', '3D，WebGL2 与 WebGPU'], ['操作', '键鼠、手柄、触屏'], ['语言', '中文、英文']],
      en: [['Graphics', '3D, WebGL2 and WebGPU'], ['Controls', 'Keyboard and mouse, gamepad, touch'], ['Languages', 'Chinese, English']],
    },
    cover: 'cover.webp',
    shots: ['1.webp', '2.webp', '3.webp'],
  },
  {
    id: 'love',
    folder: 'LoveElective',
    zh: '心动选修课',
    en: 'Love Elective',
    accent: '#f28aa8',
    genre: { zh: '校园恋爱养成', en: 'Campus romance and dress-up' },
    line: {
      zh: '三十天后的星空祭之前，真正认识一个人，并把心意告诉她。',
      en: 'Before the Star Festival thirty days away, truly get to know one person and tell her how you feel.',
    },
    intro: {
      zh: '大一新生选了一门只有一份作业的选修课：在三十天后的星空祭之前，真正认识一个人，并把心意告诉她。七位性格各异的学姐，各有四章带分支的故事和两种结局。每天分为四个时段，你可以去上课、训练、打工、接任务、挑礼物，慢慢摸清每个人喜欢的相处距离，太近或太远都会让关系变化。衣橱里有四十件服饰，每一件都能自由染色。每天还有学姐的小心愿、十八种校园偶遇，结局与成就会记进跨学期的回忆册。分层视差的校园场景带来伪 2.5D 的纵深感，支持中英文切换，鼠标和触屏都能操作。',
      en: 'A first-year student signs up for an elective with a single assignment: before the Star Festival thirty days away, truly get to know one person and tell her how you feel. Seven seniors with very different personalities each have four branching story chapters and two endings. Each day has four parts for classes, training, part-time work, tasks and choosing presents, and slowly you learn how close each of them likes you to stand; too close or too far changes things. The wardrobe holds forty pieces, each freely dyeable. Each day brings a senior’s small wish and the chance of one of eighteen campus encounters, and endings and achievements go into an album kept across terms. Layered parallax scenes give the campus a pseudo-2.5D depth, the story switches between Chinese and English, and it plays with a mouse or touch.',
    },
    facts: {
      zh: [['画面', '2D 分层视差，WebGL2 与 WebGPU'], ['操作', '鼠标、触屏'], ['语言', '中文、英文']],
      en: [['Graphics', '2D layered parallax, WebGL2 and WebGPU'], ['Controls', 'Mouse, touch'], ['Languages', 'Chinese, English']],
    },
    cover: 'cover.webp',
    shots: ['1.webp', '2.webp', '3.webp'],
  },
  {
    id: 'lantern',
    folder: 'LanternShadows',
    zh: '灯影·闹天宫',
    en: 'Lantern Shadows',
    accent: '#e0a21a',
    genre: { zh: '皮影横版动作', en: 'Shadow-puppet side-scrolling action' },
    line: {
      zh: '一块幕布、一盏灯，皮影孙悟空打上南天门，一把毫毛变出一百个自己。',
      en: 'One cloth, one lamp, and a shadow-puppet Monkey King storming the gate of heaven, a hundred of him at once.',
    },
    intro: {
      zh: '整出戏演在皮影戏的幕布上：灯在幕后，镂空上色的皮偶贴着幕布，远处的天宫在灯影里是虚的。孙悟空一路打上南天门，平扫、上挑、劈砸三下一套，每一下打中都有一记锣鼓，整台戏跟着定格、震动。第一幕有十名天兵把守：枪兵出枪前先放平枪杆，弓手的箭可以一棍打落，筋斗云能从枪尖里穿过去；五个桃是他的体力，落幕时盖一枚印评定这一场。南天门前哪吒踏风火轮拦路，分三段打：火尖枪，能一棍打回去的乾坤圈，最后现出三头六臂，风火轮碾过的地面会烧起来。打中三十棍可以使一次身外身：一把毫毛吹出一百个小悟空围着敌人打，两千五百多根骨骼同时在动，台口实时写出帧率。第二幕蟠桃园换了布景和地面：持盾的力士要用上挑破盾或者绕到背后，仙鹤从空中沿直线扑下来，枝上的桃子可以打下来吃。皮偶是 Spine 骨骼动画，每片皮都由代码画出，关卡是瓦片地图，锣鼓声是算出来的。第二幕的 Boss 与第三幕还在做。',
      en: 'The whole play is on the cloth of a shadow-puppet booth: a lamp behind it, carved and dyed leather puppets against it, and the halls of heaven out of focus in the distance. The Monkey King fights his way to the Southern Gate with a sweep, a lift and a smash; every blow that lands has its beat of percussion, and the stage holds still and shudders with it. Ten soldiers of heaven hold the first act: a spearman levels his spear before he thrusts, an archer’s arrow can be knocked out of the air, and the cloud roll passes through a spear point. Five peaches are his strength, and a seal is set on the act as the curtain falls. Before the gate Nezha comes down on his wheels of wind and fire and fights in three phases: the fire-tipped spear, the Universe Ring that the staff can send back at him, and at last three heads and six arms, on wheels that leave the ground burning. Thirty blows landed earn the body beyond the body: a tuft of hair blown into a hundred small Monkey Kings who mob whoever is near, more than two and a half thousand bones moving at once, with the frame rate written at the foot of the booth. Act two, the Peach Orchard, changes the scenery and the ground: a shield-bearer has to have his shield lifted aside or be got behind, cranes stoop out of the air along a straight line, and the peaches on the boughs can be knocked down and eaten. The puppets are Spine skeletons drawn by code, the levels are tile maps, and the percussion is worked out from numbers. The second act’s boss and a third act are still to come.',
    },
    facts: {
      zh: [['画面', '2D 骨骼动画，WebGL2 与 WebGPU'], ['操作', '键盘、手柄、触屏'], ['状态', '两幕：南天门与蟠桃园']],
      en: [['Graphics', '2D skeletal animation, WebGL2 and WebGPU'], ['Controls', 'Keyboard, gamepad, touch'], ['Status', 'Two acts: the Southern Gate and the Peach Orchard']],
    },
    cover: 'cover.webp',
    shots: ['1.webp', '2.webp', '3.webp'],
  },
];
