// The opening of the game and its endings, in the same step format as
// src/story/chapters.mjs. ['pf', 中文, English] is a line from Professor Wen.
export const PROLOGUE = [
  ['bg', 'gate'],
  [
    'n',
    '九月，白鹭学院。樱花道两旁挤满了社团招新的摊位，你拖着行李箱，被人流推着往前走。',
    'September at Egret Academy. Club stalls crowd both sides of the cherry avenue, and the stream of people carries you and your suitcase along.',
  ],
  ['th', '大学生活，从今天开始。', 'University life starts today.'],
  ['n', '一张浅粉色的传单被风吹到你脚边。', 'A pale pink flyer blows up against your foot.'],
  [
    'n',
    '《心动选修课》——恋爱心理学实践。2 学分。不考试，不点名。',
    '"Love Elective": Practical Psychology of Romance. 2 credits. No exam. No roll call.',
  ],
  ['bg', 'classroom'],
  [
    'n',
    '好奇心把你带进了阶梯教室。讲台上的教授推了推眼镜。',
    'Curiosity takes you into the lecture hall. At the lectern, the professor pushes up her glasses.',
  ],
  ['pf', '“欢迎来到这门课。我姓温。这门课只有一份作业。”', '"Welcome to this course. My name is Wen. It has exactly one assignment."'],
  [
    'pf',
    '“在学期最后一晚的‘星空祭’之前，真正地去认识一个人——然后，把你的心意亲口告诉对方。”',
    '"Before the Star Festival on the last night of term, truly get to know one person. Then tell them how you feel, in your own words."',
  ],
  ['pf', '“提醒各位三件事。第一，了解一个人，要走到她在的地方去。”', '"Three reminders. One: to know someone, go where she is."'],
  [
    'pf',
    '“第二，每个人心里都有一把尺。有人喜欢你走近，有人需要你留白。太急、太远，都量不准。”',
    '"Two: everyone carries a ruler in their heart. Some like you close; some need room. Too hasty or too distant, and the measure is off."',
  ],
  [
    'pf',
    '“第三，先把自己经营好。学识、体能、才艺、谈吐，还有——得体的穿着。”',
    '"Three: look after yourself first. Learning, fitness, talent, conversation, and yes, dressing well."',
  ],
  [
    'th',
    '三十天。七位各有故事的学姐。还有一份只能自己完成的作业。',
    'Thirty days. Seven seniors, each with a story. And one assignment nobody can do for you.',
  ],
  [
    'n',
    '【提示】在校园地图上选择地点；每天有上午、下午、傍晚、夜晚四段时间。右上角的手机里可以查看好感、任务和背包。',
    '[Tip] Pick a place on the campus map. Each day has four parts: morning, afternoon, evening and night. The phone in the top-right corner shows affection, tasks and your bag.',
  ],
];

/** The last night, before the hero chooses whom to speak to. */
export const FINALE_INTRO = [
  ['bg', 'rooftop'],
  [
    'n',
    '第三十天，星空祭。整座校园熄了灯，只留下摊位的灯笼和头顶的银河。',
    'Day thirty: the Star Festival. The whole campus is dark but for the lanterns on the stalls and the galaxy overhead.',
  ],
  ['pf', '“作业的截止时间到了。去吧，别让那个人等太久。”', '"The assignment is due. Go on. Don\'t keep that person waiting."'],
];

export const ENDINGS = {
  qingge: {
    love: [
      ['bg', 'rooftop'],
      ['in', 'qingge', 'shy'],
      [
        'n',
        '九点整。清歌把臂章交给了副会长，一个人走上天台。',
        "Nine o'clock exactly. Qingge hands her armband to the vice president and climbs to the roof alone.",
      ],
      [
        'qingge',
        'shy',
        '“今晚，我不是会长。所以接下来的话，没有任何公事成分。”',
        '"Tonight I am not the president. So nothing I say next is official business."',
      ],
      ['me', '“清歌，我喜欢你。喜欢认真的你，也喜欢把茶放凉的你。”', '"Qingge, I like you. The diligent you, and the you who lets her tea go cold."'],
      ['fx', 'heart'],
      ['qingge', 'joy', '“……批准。这是我签过的，最不需要犹豫的一份申请。”', '"...Approved. No application I have ever signed needed less thought."'],
    ],
    friend: [
      ['bg', 'rooftop'],
      ['in', 'qingge', 'sad'],
      [
        'qingge',
        'sad',
        '“谢谢你告诉我。但现在的我，还没有准备好回应这份心意。”',
        '"Thank you for telling me. But I am not yet ready to answer feelings like these."',
      ],
      [
        'qingge',
        'smile',
        '“下学期……请继续来图书馆。这不是公事。”',
        '"Next term... please keep coming to the library. That is not official business."',
      ],
    ],
  },
  linxia: {
    love: [
      ['bg', 'field'],
      ['in', 'linxia', 'shy'],
      [
        'n',
        '夜晚的操场空无一人。林夏站在起跑线上，难得地安静。',
        'The field is empty at night. Lin Xia stands on the starting line, unusually quiet.',
      ],
      [
        'me',
        '“林夏，我喜欢你。以后你的每一场比赛，我都想站在终点。”',
        '"Lin Xia, I like you. I want to be at the finish line of every race you run."',
      ],
      ['fx', 'heart'],
      [
        'linxia',
        'joy',
        '“笨蛋——！这种话要早点说啊！我、我都准备好自己先说了！”',
        '"You dummy! Say these things sooner! I-I was all set to say it first!"',
      ],
      ['linxia', 'shy', '“那说好了。以后，不许跑出我的视线。”', '"It\'s a deal, then. From now on you don\'t run out of my sight."'],
    ],
    friend: [
      ['bg', 'field'],
      ['in', 'linxia', 'surprise'],
      ['linxia', 'surprise', '“欸、欸欸？！等等，我脑子还在热身……”', '"H-huh?! Wait, my brain\'s still warming up..."'],
      [
        'linxia',
        'smile',
        '“……给我一点时间，好吗？在那之前，继续当我的陪跑搭档！”',
        '"...Give me a little time, okay? Until then, keep being my pacer!"',
      ],
    ],
  },
  wanqing: {
    love: [
      ['bg', 'artroom'],
      ['in', 'wanqing', 'shy'],
      [
        'n',
        '美术室的窗外是漫天星光。画架上，是那张站在光里的人。',
        'Beyond the art room windows the sky is full of stars. On the easel stands the figure in the light.',
      ],
      ['me', '“晚晴，我喜欢你。我想一直待在你的画里，也待在你身边。”', '"Wanqing, I like you. I want to stay in your paintings, and beside you."'],
      ['fx', 'heart'],
      [
        'wanqing',
        'joy',
        '“我也是……我早就把答案画出来了，只是一直不敢给你看。”',
        '"So do I... I painted my answer long ago. I just never dared show you."',
      ],
      ['wanqing', 'shy', '“以后，请让我画更多的你。不只是门框那一张。”', '"From now on, let me paint more of you. Not just the one in the doorway."'],
    ],
    friend: [
      ['bg', 'artroom'],
      ['in', 'wanqing', 'shy'],
      [
        'wanqing',
        'shy',
        '“谢谢你……我很高兴。只是我的心，还像没干的水彩，不敢碰。”',
        '"Thank you... I\'m so glad. But my heart is like wet watercolour. I daren\'t touch it yet."',
      ],
      ['wanqing', 'smile', '“等它干了，我会第一个告诉你。”', '"When it dries, you\'ll be the first to know."'],
    ],
  },
  xinglan: {
    love: [
      ['bg', 'musicroom'],
      ['in', 'xinglan', 'normal'],
      [
        'n',
        '压轴演出结束。后台只剩你们，还有一把没收进琴盒的吉他。',
        'The closing set is over. Backstage, there is only the two of you and a guitar not yet in its case.',
      ],
      ['me', '“星澜，我喜欢你。不吵你，不黏你，但我想一直在。”', '"Xinglan, I like you. I won\'t crowd you or cling. But I want to stay."'],
      ['fx', 'heart'],
      ['xinglan', 'shy', '“……啧。话都让你说完了。”', '"...Tch. You took all the good lines."'],
      [
        'xinglan',
        'smile',
        '“第一排左边的位置，以后是你的固定席。——这是告白，听懂了吗。”',
        '"Front row left is your seat from now on. That\'s a confession. Got it?"',
      ],
    ],
    friend: [
      ['bg', 'musicroom'],
      ['in', 'xinglan', 'normal'],
      ['xinglan', 'normal', '“……我听见了。但我现在给不了你答案。”', '"...I heard you. I can\'t give you an answer right now."'],
      ['xinglan', 'tease', '“不过位置先留着。别弄丢了。”', '"The seat stays saved, though. Don\'t lose it."'],
    ],
  },
  zhiwei: {
    love: [
      ['bg', 'rooftop'],
      ['in', 'zhiwei', 'shy'],
      [
        'n',
        '知微按下回车。天台的灯串依次亮起，拼出了一行字：HELLO, WORLD → HELLO, YOU。',
        'Zhiwei presses Enter. The rooftop lights come on in sequence and spell out: HELLO, WORLD → HELLO, YOU.',
      ],
      [
        'me',
        '“知微，我喜欢你。你说的每一句反话，我都想听一辈子。”',
        '"Zhiwei, I like you. I want to hear you say the opposite of what you mean for the rest of my life."',
      ],
      ['fx', 'heart'],
      [
        'zhiwei',
        'angry',
        '“谁、谁说的是反话！我……我也喜欢你，这句是正的！只说一次！”',
        '"Wh-who says the opposite! I... I like you too. That one\'s true! I\'m saying it once!"',
      ],
      ['zhiwei', 'shy', '“……好吧。可以说两次。”', '"...Fine. Twice is allowed."'],
    ],
    friend: [
      ['bg', 'rooftop'],
      ['in', 'zhiwei', 'surprise'],
      ['zhiwei', 'surprise', '“等、等一下！这个输入不在我的预期范围内！”', '"W-wait! This input is outside my expected range!"'],
      ['zhiwei', 'shy', '“……我需要时间调试。在那之前，你不许换队友。”', '"...I need time to debug. Until then you are not to change teammates."'],
    ],
  },
  tangmi: {
    love: [
      ['bg', 'cafe'],
      ['in', 'tangmi', 'normal'],
      [
        'n',
        '打烊的咖啡店里，唐蜜没有戴发饰，也没有笑。她只是认真地看着你。',
        'In the closed café, Tang Mi wears no bow and no smile. She simply looks at you, in earnest.',
      ],
      ['me', '“唐蜜，我喜欢你。甜的你，不笑的你，我都喜欢。”', '"Tang Mi, I like you. The sweet you and the unsmiling you alike."'],
      ['fx', 'heart'],
      ['tangmi', 'shy', '“……真是的。本来想逗你到最后一刻的。”', '"...Honestly. I meant to tease you right to the end."'],
      [
        'tangmi',
        'joy',
        '“我也喜欢你。这一次没有‘每位客人都有’——只有你有。”',
        '"I like you too. No \'every customer gets one\' this time. Only you do."',
      ],
    ],
    friend: [
      ['bg', 'cafe'],
      ['in', 'tangmi', 'smile'],
      ['tangmi', 'smile', '“哎呀～被学弟抢先了。”', '"Oh my~ the junior got there first."'],
      [
        'tangmi',
        'normal',
        '“……再给我一点时间，好吗？我想用不是玩笑的方式，回答你。”',
        '"...Give me a little longer? I want to answer you in a way that isn\'t a joke."',
      ],
    ],
  },
  bailu: {
    love: [
      ['bg', 'rooftop'],
      ['in', 'bailu', 'smile'],
      [
        'n',
        '银河横过整片夜空。白露把望远镜对准了一颗很暗的星。',
        'The galaxy spans the whole sky. Bai Lu points the telescope at a very faint star.',
      ],
      [
        'bailu',
        'smile',
        '“那颗星的光，走了很多年才到这里。……我的话，也走了很久。”',
        '"That star\'s light travelled for years to get here. ...My words took a long time too."',
      ],
      ['me', '“白露，我喜欢你。以后每一个晴夜，我都陪你等。”', '"Bai Lu, I like you. Every clear night from now on, I\'ll wait with you."'],
      ['fx', 'heart'],
      ['bailu', 'shy', '“……我也喜欢你。从听得出你脚步声的那天起。”', '"...I like you too. Since the day I could tell your footsteps apart."'],
    ],
    friend: [
      ['bg', 'rooftop'],
      ['in', 'bailu', 'normal'],
      [
        'bailu',
        'normal',
        '“……谢谢。这句话，我想多看一会儿，像看一颗新发现的星。”',
        '"...Thank you. I want to look at those words a while longer, like a newly found star."',
      ],
      ['bailu', 'smile', '“明晚，你还来吗？”', '"Will you come again tomorrow night?"'],
    ],
  },
};

/** When the hero confesses to no one. */
export const ENDING_SOLO = [
  ['bg', 'rooftop'],
  ['n', '星空祭的烟火升起又落下。你一个人靠在天台的栏杆上。', 'The festival fireworks rise and fall. You lean on the rooftop railing, alone.'],
  [
    'th',
    '作业没有交。但这三十天里遇见的每一个人，都还在这座校园里。',
    'The assignment was not handed in. But everyone you met in these thirty days is still on this campus.',
  ],
  ['pf', '“这门课允许重修。下学期见。”', '"This course may be retaken. See you next term."'],
];
