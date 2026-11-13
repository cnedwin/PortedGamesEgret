// Story chapters for each senior. Chapter 1 is the first meeting; chapters
// 2–4 open as affection and the stat she respects grow (see CHAPTERS in sim.mjs).
//
// A script is a list of steps:
//   ['bg', scene]                    change the background (light follows the time of day)
//   ['in', girl, expression]         bring a senior on screen / change her expression
//   ['out']                          she leaves the screen
//   ['n', 中文, English]             narration
//   ['me', 中文, English]            the hero speaks
//   ['th', 中文, English]            the hero thinks
//   [girl, expression, 中文, English]  she speaks
//   ['fx', 'heart' | 'shake' | 'flash']
//   ['pick', [{ t: [中文, English], fx: { aff, pull, flag }, then: [steps] }, ...]]
export const CHAPTERS_SCRIPT = {
  qingge: {
    1: [
      ['bg', 'library'],
      [
        'n',
        '图书馆安静得能听见翻页声。你抱着一摞书，在转角处脚下一滑——',
        'The library is quiet enough to hear pages turn. Arms full of books, you slip at a corner—',
      ],
      ['fx', 'shake'],
      ['in', 'qingge', 'angry'],
      ['qingge', 'angry', '“这里是自习区。”', '"This is the quiet study area."'],
      [
        'n',
        '黑色长发的学姐合上文件夹，臂章上写着“学生会会长”。',
        'A senior with long black hair closes her folder. Her armband reads "Student Council President".',
      ],
      [
        'pick',
        [
          {
            t: ['“对不起，我马上收拾。”', '"Sorry. I\'ll pick these up right away."'],
            fx: { aff: 4, pull: -4 },
            then: [
              ['qingge', 'normal', '“……知道错就好。书按索书号放回去，别放错层。”', '"...Good. Shelve them by call number. The right shelf, mind."'],
            ],
          },
          {
            t: ['“学姐皱眉的样子也很好看。”', '"You look good even when you frown."'],
            fx: { aff: 1, pull: 12 },
            then: [
              ['qingge', 'surprise', '“……”', '"..."'],
              [
                'qingge',
                'angry',
                '“新生手册第三条：不要对学生会成员说多余的话。”',
                '"Freshman handbook, rule three: no unnecessary remarks to council members."',
              ],
            ],
          },
          {
            t: ['默默把书捡好，顺手扶正她碰歪的台灯。', 'Quietly gather the books, and straighten the lamp she knocked askew.'],
            fx: { aff: 6, pull: -8 },
            then: [
              ['qingge', 'surprise', '“……谢谢。”', '"...Thank you."'],
              ['th', '她的声音，比刚才轻了一点。', 'Her voice is a little softer than before.'],
            ],
          },
        ],
      ],
      [
        'qingge',
        'normal',
        '“我是沈清歌。有事去学生会找我——有正事的话。”',
        '"I\'m Shen Qingge. If you need something, find me at the council. Something that matters."',
      ],
    ],
    2: [
      ['bg', 'library'],
      ['in', 'qingge', 'sad'],
      [
        'n',
        '闭馆铃响过了，清歌还埋在一堆申请表里，手边的茶早就凉了。',
        'The closing bell has rung, but Qingge is still buried in forms. The tea at her elbow went cold long ago.',
      ],
      [
        'qingge',
        'normal',
        '“是你啊。社团经费的表，四十七份，明早要交。”',
        '"Oh, it\'s you. Club budget forms. Forty-seven of them, due in the morning."',
      ],
      [
        'pick',
        [
          {
            t: ['“分我一半，我来核对数字。”', '"Give me half. I\'ll check the figures."'],
            fx: { aff: 6, pull: 2 },
            then: [
              ['qingge', 'surprise', '“……你确定？错一个数字我会全部退回。”', '"...Are you sure? One wrong number and I send them all back."'],
              [
                'n',
                '你们并排坐到了深夜。她偶尔侧过头，确认你没有偷懒。',
                "You work side by side late into the night. Now and then she glances over to make sure you aren't slacking.",
              ],
            ],
          },
          {
            t: ['去换一杯热茶，轻轻放在她手边。', 'Fetch a fresh cup of hot tea and set it down by her hand.'],
            fx: { aff: 7, pull: -6 },
            then: [
              ['qingge', 'smile', '“……伯爵红茶。你怎么知道的。”', '"...Earl Grey. How did you know?"'],
              ['me', '“猜的。”', '"A guess."'],
              ['qingge', 'shy', '“猜得不错。”', '"A good one."'],
            ],
          },
          {
            t: ['“会长也该学会偷懒。”', '"Even a president should learn to slack off."'],
            fx: { aff: 2, pull: 8 },
            then: [['qingge', 'angry', '“这句话我会当作没听见。”', '"I will pretend I didn\'t hear that."']],
          },
        ],
      ],
      ['qingge', 'smile', '“今天……辛苦了。回去路上小心。”', '"Thank you... for today. Get back safely."'],
    ],
    3: [
      ['bg', 'classroom'],
      ['in', 'qingge', 'normal'],
      [
        'n',
        '星空祭的预算会上，清歌的方案被几个社团代表围着质疑。散会后，教室里只剩你们两个。',
        "At the Star Festival budget meeting, club reps picked Qingge's plan apart. Afterwards, only the two of you remain.",
      ],
      ['qingge', 'sad', '“你全程都在。说实话，我的方案有问题吗？”', '"You sat through all of it. Honestly: is there something wrong with my plan?"'],
      [
        'pick',
        [
          {
            t: ['“有。舞台预算压得太低，轻音社撑不起来。”', '"Yes. The stage budget is too tight for the band to manage."'],
            fx: { aff: 9, pull: -4, flag: 'qingge_honest' },
            then: [
              ['qingge', 'surprise', '“……”', '"..."'],
              ['qingge', 'smile', '“很少有人敢当面这么说。”', '"Few people dare say that to my face."'],
              ['qingge', 'smile', '“明天把你的算法给我看。我不保证采纳。”', '"Show me your numbers tomorrow. I promise nothing."'],
            ],
          },
          {
            t: ['“没有问题，是他们不懂。”', '"Nothing. They just don\'t get it."'],
            fx: { aff: 2, pull: 6 },
            then: [
              ['qingge', 'sad', '“……是吗。谢谢你的安慰。”', '"...I see. Thank you for the comfort."'],
              ['th', '她笑了一下，但没有看你的眼睛。', "She smiles, but doesn't meet your eyes."],
            ],
          },
        ],
      ],
    ],
    4: [
      ['bg', 'library'],
      ['in', 'qingge', 'sad'],
      [
        'n',
        '深夜的图书馆只亮着一盏台灯。清歌摘下了臂章，放在桌角。',
        'A single lamp is lit in the library at night. Qingge has taken off her armband and set it on the corner of the desk.',
      ],
      [
        'qingge',
        'sad',
        '“从小到大，我都是‘不会出错的那个人’。有时候我分不清，大家需要的是沈清歌，还是会长。”',
        "\"All my life I've been 'the one who doesn't make mistakes'. Sometimes I can't tell whether people need Shen Qingge, or the president.\"",
      ],
      [
        'pick',
        [
          {
            t: ['“我认识的是那个会把茶放凉的沈清歌。”', '"The one I know is the Shen Qingge who lets her tea go cold."'],
            fx: { aff: 10, pull: 4 },
            then: [
              ['qingge', 'shy', '“……这算什么评价。”', '"...What kind of compliment is that."'],
              ['fx', 'heart'],
              ['qingge', 'smile', '“不过，我不讨厌。”', '"Still. I don\'t dislike it."'],
            ],
          },
          {
            t: ['“你可以出错。出错的时候，我在。”', '"You\'re allowed mistakes. And when you make one, I\'ll be there."'],
            fx: { aff: 12, pull: -2 },
            then: [
              ['qingge', 'surprise', '“……”', '"..."'],
              ['fx', 'heart'],
              ['qingge', 'shy', '“这种话，不许对别人说。”', '"You are not to say that to anyone else."'],
            ],
          },
        ],
      ],
      [
        'qingge',
        'smile',
        '“星空祭那天，学生会的工作九点结束。之后的时间……我还没有安排。”',
        '"On the night of the Star Festival, council duty ends at nine. After that... I have nothing scheduled."',
      ],
    ],
  },

  linxia: {
    1: [
      ['bg', 'field'],
      ['n', '你刚走到跑道边，一阵风就擦着肩膀冲了过去。', "You've barely reached the track when a gust of wind tears past your shoulder."],
      ['fx', 'shake'],
      ['in', 'linxia', 'joy'],
      ['linxia', 'joy', '“抱歉抱歉！没撞到吧？新面孔——大一的？”', '"Sorry, sorry! Didn\'t hit you, did I? New face. First year?"'],
      [
        'linxia',
        'smile',
        '“我是林夏，田径社的。来，跟我跑一圈，输的人请喝运动饮料！”',
        '"I\'m Lin Xia, track team. Come on, one lap. Loser buys the sports drinks!"',
      ],
      [
        'pick',
        [
          {
            t: ['“来就来！”', '"You\'re on!"'],
            fx: { aff: 6, pull: 10 },
            then: [
              [
                'n',
                '你输得毫无悬念，但她在终点等了你整整半圈。',
                'You lose without a shred of doubt, but she waits at the line for the half lap it takes you to arrive.',
              ],
              ['linxia', 'joy', '“哈哈哈！有胆量，我喜欢！”', '"Ha ha! Guts. I like that!"'],
            ],
          },
          {
            t: ['“我直接认输，饮料我请。”', '"I forfeit. Drinks are on me."'],
            fx: { aff: 3, pull: -4 },
            then: [
              ['linxia', 'surprise', '“欸——都还没跑呢！”', '"Hey, we haven\'t even run yet!"'],
              [
                'linxia',
                'smile',
                '“不过饮料我收下啦。下次可不许逃。”',
                '"I\'ll take the drink, though. No running away next time. Well, no NOT running."',
              ],
            ],
          },
        ],
      ],
    ],
    2: [
      ['bg', 'field'],
      ['in', 'linxia', 'smile'],
      ['n', '清晨的操场还带着露水。林夏压着腿，朝你招手。', 'The field still wears its dew. Lin Xia, mid-stretch, waves you over.'],
      [
        'linxia',
        'smile',
        '“你还真来了！我跟你说，跑步最爽的不是冲线，是呼吸刚刚好跟上脚步的那一下。”',
        '"You actually came! Listen, the best part of running isn\'t the finish. It\'s the moment your breath falls in step with your feet."',
      ],
      [
        'pick',
        [
          {
            t: ['“那我今天跟着你的节奏跑。”', '"Then today I\'ll run to your rhythm."'],
            fx: { aff: 7, pull: 8 },
            then: [
              ['linxia', 'joy', '“好！跟不上就喊，我会放慢——只放慢一点点！”', '"Great! Shout if you fall behind and I\'ll slow down. A tiny bit!"'],
            ],
          },
          {
            t: ['“你为什么这么喜欢跑步？”', '"Why do you love running so much?"'],
            fx: { aff: 5, pull: 2 },
            then: [
              ['linxia', 'normal', '“嗯……因为跑起来的时候，烦恼追不上我？”', '"Hmm... because when I run, my worries can\'t keep up?"'],
              ['linxia', 'shy', '“好啦别这么认真看我，怪不好意思的。”', '"Okay, stop looking at me so seriously. It\'s embarrassing."'],
            ],
          },
        ],
      ],
    ],
    3: [
      ['bg', 'field'],
      ['in', 'linxia', 'sad'],
      [
        'n',
        '校运会前三天。你注意到林夏落地时，右脚总是轻轻一顿。',
        "Three days before Sports Day. You notice Lin Xia's right foot hesitating each time it lands.",
      ],
      [
        'linxia',
        'smile',
        '“没事没事！一点小伤，缠上绷带就看不出来了。你可别告诉教练！”',
        '"It\'s nothing! A tiny sprain. Tape it and nobody can tell. Don\'t you dare tell the coach!"',
      ],
      [
        'pick',
        [
          {
            t: [
              '“我不告诉教练。但今天的加练，我陪你改成冰敷。”',
              "\"I won't tell the coach. But today's extra training is now icing, and I'm staying.\"",
            ],
            fx: { aff: 10, pull: 4, flag: 'linxia_rest' },
            then: [
              ['linxia', 'surprise', '“……你这个人，平时那么好说话。”', '"...And here I thought you were easy-going."'],
              ['linxia', 'shy', '“好吧。就今天，听你的。”', '"Fine. Today only, I\'ll do as you say."'],
            ],
          },
          {
            t: ['“你可是王牌，肯定撑得住！”', '"You\'re the ace. You can push through!"'],
            fx: { aff: 2, pull: 6 },
            then: [
              ['linxia', 'smile', '“对吧！……对吧。”', '"Right? ...Right."'],
              ['th', '她笑着转身，脚步却更重了。', 'She turns away smiling, but her steps are heavier.'],
            ],
          },
        ],
      ],
    ],
    4: [
      ['bg', 'field'],
      ['in', 'linxia', 'sad'],
      ['n', '决赛，第二名。人群散去后，你在看台后面找到了她。', 'The final: second place. When the crowd has gone, you find her behind the stands.'],
      ['linxia', 'sad', '“我没哭！是汗……就差零点一秒，零点一秒啊。”', '"I\'m not crying! It\'s sweat... A tenth of a second. One tenth."'],
      [
        'pick',
        [
          {
            t: ['把毛巾盖在她头上，在旁边坐下。', 'Drop a towel over her head and sit down beside her.'],
            fx: { aff: 10, pull: 2 },
            then: [
              ['n', '毛巾下面传来闷闷的声音。', 'A muffled voice comes from under the towel.'],
              ['linxia', 'shy', '“……再借我五分钟。五分钟之后，我就还是林夏。”', '"...Five more minutes. After that I\'ll be Lin Xia again."'],
              ['fx', 'heart'],
            ],
          },
          {
            t: ['“再跑一圈吧。这次不计时，我陪你。”', '"One more lap. No stopwatch. I\'ll run it with you."'],
            fx: { aff: 12, pull: 8 },
            then: [
              ['linxia', 'surprise', '“现在？”', '"Now?"'],
              ['linxia', 'joy', '“……哈。好啊！输的人请喝一辈子运动饮料！”', '"...Ha. Okay! Loser buys sports drinks for life!"'],
              ['fx', 'heart'],
            ],
          },
        ],
      ],
      [
        'linxia',
        'smile',
        '“喂。星空祭那天晚上，别跑太快。我想……跟你并排走。”',
        '"Hey. On the night of the Star Festival, don\'t go too fast. I want to... walk beside you."',
      ],
    ],
  },

  wanqing: {
    1: [
      ['bg', 'artroom'],
      [
        'n',
        '美术室的门半开着，松节油的味道混着午后的阳光。你刚探进头——',
        "The art room door is ajar; turpentine mingles with afternoon sun. You've barely leaned in when—",
      ],
      ['in', 'wanqing', 'surprise'],
      [
        'wanqing',
        'surprise',
        '“啊，请别动！就这个角度……三十秒就好。”',
        '"Oh, please don\'t move! That angle exactly... thirty seconds, that\'s all."',
      ],
      ['n', '戴贝雷帽的学姐飞快地在速写本上落笔，炭笔沙沙作响。', 'The senior in the beret sketches at speed, charcoal whispering across the page.'],
      [
        'pick',
        [
          {
            t: ['一动不动，连呼吸都放轻。', 'Hold perfectly still, breathing as lightly as you can.'],
            fx: { aff: 6, pull: -2 },
            then: [
              [
                'wanqing',
                'smile',
                '“好了。谢谢你，你是我见过最配合的门框模特。”',
                '"Done. Thank you. You\'re the most cooperative doorway model I\'ve ever had."',
              ],
            ],
          },
          {
            t: ['“可以画得帅一点吗？”', '"Could you make me a bit more handsome?"'],
            fx: { aff: 5, pull: 6 },
            then: [
              ['wanqing', 'joy', '“呵呵……我只画看到的东西哦。”', '"Heh... I only draw what I see."'],
              ['wanqing', 'smile', '“不过，现在这样就很好。”', '"But what I see is fine as it is."'],
            ],
          },
        ],
      ],
      [
        'wanqing',
        'smile',
        '“我是苏晚晴，美术社的。美术室随时欢迎你，门框也是。”',
        '"I\'m Su Wanqing, from the art club. You\'re welcome here any time. So is the doorway."',
      ],
    ],
    2: [
      ['bg', 'artroom'],
      ['in', 'wanqing', 'smile'],
      [
        'n',
        '晚晴把速写本摊在窗台上：樱花道、操场的看台、图书馆的拱窗……每一页都是你熟悉的校园。',
        "Wanqing spreads her sketchbook on the sill: the cherry avenue, the stands, the library's arched window... the campus you know, page after page.",
      ],
      ['wanqing', 'normal', '“你觉得哪一张最好？我总是选不出来。”', '"Which is best, do you think? I can never choose."'],
      [
        'pick',
        [
          {
            t: ['“这张天台的。画里没有人，却像有人在等。”', '"The rooftop one. Nobody\'s in it, yet it feels like someone is waiting."'],
            fx: { aff: 8, pull: 2 },
            then: [
              ['wanqing', 'surprise', '“……你看出来了。”', '"...You noticed."'],
              ['wanqing', 'shy', '“很少有人会这样看画。”', '"Hardly anyone looks at pictures that way."'],
            ],
          },
          {
            t: ['“都好。能把日常画得这么温柔的人不多。”', '"All of them. Few people can make the everyday look this gentle."'],
            fx: { aff: 6, pull: 6 },
            then: [['wanqing', 'shy', '“你、你这样说，我会当真的。”', '"I-if you say things like that, I\'ll believe you."']],
          },
        ],
      ],
    ],
    3: [
      ['bg', 'artroom'],
      ['in', 'wanqing', 'sad'],
      [
        'n',
        '画架上盖着布。晚晴握着一封退稿信，指尖沾着没洗干净的群青。',
        'A cloth covers the easel. Wanqing holds a rejection letter, ultramarine still on her fingertips.',
      ],
      [
        'wanqing',
        'sad',
        '“评语只有四个字：‘过于安全’。……也许我只适合画不会出错的东西。”',
        "\"The comment was two words: 'Too safe.' ...Perhaps I'm only suited to painting things that can't go wrong.\"",
      ],
      [
        'pick',
        [
          {
            t: ['“那就画一张会出错的。画坏了，我帮你洗调色盘。”', '"Then paint one that can go wrong. If it does, I\'ll wash your palette."'],
            fx: { aff: 10, pull: 2, flag: 'wanqing_bold' },
            then: [
              ['wanqing', 'surprise', '“……画坏了，也可以吗？”', '"...Even if I ruin it?"'],
              [
                'wanqing',
                'smile',
                '“那……我想画一张很大的。大到这面墙都放不下。”',
                '"Then... I want to paint something huge. Too big for this wall."',
              ],
            ],
          },
          {
            t: ['“安全也没什么不好，我就喜欢你的画。”', '"Nothing wrong with safe. I like your paintings."'],
            fx: { aff: 4, pull: 6 },
            then: [
              ['wanqing', 'smile', '“谢谢你……你总是这么温柔。”', '"Thank you... you\'re always so kind."'],
              ['th', '她把退稿信折好，放回了口袋。', 'She folds the letter and puts it back in her pocket.'],
            ],
          },
        ],
      ],
    ],
    4: [
      ['bg', 'artroom'],
      ['in', 'wanqing', 'shy'],
      [
        'n',
        '傍晚的光把美术室染成了蜂蜜色。晚晴深吸一口气，揭开了画布。',
        'Evening light turns the art room to honey. Wanqing takes a breath and lifts the cloth.',
      ],
      ['n', '画上是一个站在门口的人，光从他背后涌进来。', 'The painting shows someone standing in a doorway, light pouring in behind him.'],
      [
        'wanqing',
        'shy',
        '“第一次见面那天的速写……我把它画完了。这是我第一张不知道会不会出错的画。”',
        '"The sketch from the day we met... I finished it. It\'s the first painting I\'ve made without knowing if it would go wrong."',
      ],
      [
        'pick',
        [
          {
            t: ['“原来在你眼里，我是站在光里的。”', '"So in your eyes, I\'m standing in the light."'],
            fx: { aff: 12, pull: 4 },
            then: [
              ['wanqing', 'shy', '“因为……那天真的很亮。”', '"Because... it really was bright that day."'],
              ['fx', 'heart'],
            ],
          },
          {
            t: ['“它没有出错。一点都没有。”', '"It didn\'t go wrong. Not anywhere."'],
            fx: { aff: 10, pull: -2 },
            then: [
              ['wanqing', 'joy', '“嗯……！”', '"Mm...!"'],
              ['fx', 'heart'],
            ],
          },
        ],
      ],
      [
        'wanqing',
        'smile',
        '“星空祭的晚上，我想带上画具。你……愿意再当一次模特吗？”',
        '"On the night of the Star Festival I\'d like to bring my paints. Would you... model for me once more?"',
      ],
    ],
  },

  xinglan: {
    1: [
      ['bg', 'musicroom'],
      [
        'n',
        '隔音门后漏出一段清唱，沙哑，却干净得让人停下脚步。你推开门，歌声戛然而止。',
        'A voice leaks through the soundproof door: husky, yet clean enough to stop you where you stand. You open it, and the singing cuts off.',
      ],
      ['in', 'xinglan', 'tease'],
      ['xinglan', 'tease', '“听够了？门票，五十。”', '"Heard enough? Admission is fifty."'],
      [
        'pick',
        [
          {
            t: ['“副歌第二句的气口，往后放半拍会更好。”', '"That breath in the chorus, second line. Half a beat later would be better."'],
            fx: { aff: 7, pull: -6 },
            then: [
              ['xinglan', 'surprise', '“……”', '"..."'],
              ['xinglan', 'tease', '“哈。有点意思。门票免了。”', '"Ha. Interesting. Admission waived."'],
            ],
          },
          {
            t: ['“太好听了！学姐可以再唱一遍吗？”', '"That was amazing! Could you sing it again?"'],
            fx: { aff: 2, pull: 12 },
            then: [['xinglan', 'normal', '“不可以。排练不是点歌台。”', '"No. Rehearsal isn\'t a jukebox."']],
          },
          {
            t: ['点点头，带上门离开。', 'Nod, and close the door behind you.'],
            fx: { aff: 5, pull: -12 },
            then: [
              ['xinglan', 'surprise', '“……喂。”', '"...Hey."'],
              ['xinglan', 'tease', '“我没说你可以走。名字留下。”', '"I didn\'t say you could leave. Name."'],
            ],
          },
        ],
      ],
      ['xinglan', 'normal', '“顾星澜。别叫学姐，听着累。”', "\"Gu Xinglan. Skip the 'senior'. It's tiring.\""],
    ],
    2: [
      ['bg', 'musicroom'],
      ['in', 'xinglan', 'normal'],
      ['n', '星澜盘腿坐在音箱上，歌词本上划满了黑线。', 'Xinglan sits cross-legged on an amp, her lyric book a thicket of crossed-out lines.'],
      [
        'xinglan',
        'normal',
        '“新歌卡住了。你，外行。说说看，这段旋律像什么？”',
        '"New song\'s stuck. You, layman. Tell me what this melody sounds like."',
      ],
      ['n', '她拨了几个和弦，像深夜里一盏不肯熄的灯。', 'She plays a few chords, like a lamp that refuses to go out at night.'],
      [
        'pick',
        [
          {
            t: ['“像末班车开走以后的站台。”', '"Like a platform after the last train has gone."'],
            fx: { aff: 8, pull: -4 },
            then: [
              ['xinglan', 'surprise', '“……”', '"..."'],
              [
                'n',
                '她低头写了很久，没再理你。但走的时候，她把拨片弹给了你。',
                'She bends over the page for a long time, ignoring you. But as you leave, she flicks you her pick.',
              ],
            ],
          },
          {
            t: ['“像你。”', '"Like you."'],
            fx: { aff: 3, pull: 12 },
            then: [['xinglan', 'tease', '“撩人之前先交学费。出门左转。”', '"Pay tuition before you flirt. Door\'s on the left."']],
          },
        ],
      ],
    ],
    3: [
      ['bg', 'musicroom'],
      ['in', 'xinglan', 'angry'],
      [
        'n',
        '鼓手在演出前一周退了社。排练室里，星澜一个人在收线。',
        'The drummer quit a week before the show. Xinglan is alone in the rehearsal room, coiling cables.',
      ],
      [
        'xinglan',
        'angry',
        '“看什么。少一个人照样演，我本来就不靠谁。”',
        '"What are you staring at. We play with one fewer. I never relied on anyone anyway."',
      ],
      [
        'pick',
        [
          {
            t: ['什么都不说，蹲下来帮她一起收线。', 'Say nothing. Crouch down and coil cables with her.'],
            fx: { aff: 10, pull: -6, flag: 'xinglan_quiet' },
            then: [
              ['n', '线收完了。她盯着地板看了一会儿。', 'The cables are done. She studies the floor for a while.'],
              ['xinglan', 'normal', '“……演出那天，音箱很重。”', '"...The amps are heavy on show day."'],
              ['me', '“我搬。”', '"I\'ll carry them."'],
              ['xinglan', 'tease', '“我没在求你。”', '"I wasn\'t asking."'],
            ],
          },
          {
            t: ['“别难过，你一定可以的！加油！”', '"Don\'t be sad. You can do it! Go for it!"'],
            fx: { aff: 1, pull: 10 },
            then: [['xinglan', 'angry', '“……我最烦这种话。”', '"...I can\'t stand lines like that."']],
          },
        ],
      ],
    ],
    4: [
      ['bg', 'rooftop'],
      ['in', 'xinglan', 'normal'],
      [
        'n',
        '演出结束，掌声还留在耳朵里。星澜拎着吉他上了天台，丢给你一罐汽水。',
        'The show is over, applause still ringing in your ears. Xinglan climbs to the roof with her guitar and tosses you a soda.',
      ],
      [
        'xinglan',
        'normal',
        '“新歌写完了。写给一个不吵、不黏、但每次都在的家伙。”',
        "\"The new song's finished. It's for someone who isn't loud, isn't clingy, and is somehow always there.\"",
      ],
      [
        'pick',
        [
          {
            t: ['“那家伙很荣幸。”', '"That someone is honoured."'],
            fx: { aff: 11, pull: -2 },
            then: [
              ['xinglan', 'shy', '“……别得意。”', '"...Don\'t get smug."'],
              ['fx', 'heart'],
            ],
          },
          {
            t: ['拉开汽水，靠着栏杆安静地听。', 'Open the soda, lean on the railing, and listen.'],
            fx: { aff: 12, pull: -8 },
            then: [
              ['n', '她唱得很轻，像只唱给一个人听。', 'She sings softly, as if for an audience of one.'],
              ['fx', 'heart'],
              ['xinglan', 'shy', '“……就这样。不许点评。”', '"...That\'s it. No reviews."'],
            ],
          },
        ],
      ],
      [
        'xinglan',
        'tease',
        '“星空祭的压轴是我们。台下第一排左边，给你留了位置——爱来不来。”',
        '"We close the Star Festival. Front row, left side. I saved you a spot. Come or don\'t."',
      ],
    ],
  },

  zhiwei: {
    1: [
      ['bg', 'lab'],
      [
        'n',
        '机房里只有键盘声。你绕过一排机位，脚下被什么绊了一下——屏幕黑了一片。',
        'Only keyboards sound in the lab. Rounding a row of desks, your foot catches on something. A bank of screens goes dark.',
      ],
      ['fx', 'shake'],
      ['in', 'zhiwei', 'angry'],
      [
        'zhiwei',
        'angry',
        '“……你知道 Ctrl+S 是人类文明的结晶吗？我四十分钟的代码！”',
        '"...Do you realise Ctrl+S is the pinnacle of human civilisation? That was forty minutes of code!"',
      ],
      [
        'pick',
        [
          {
            t: ['“对不起！我请你喝珍珠奶茶，再帮你把线理好。”', '"I\'m so sorry! Bubble tea on me, and I\'ll tidy these cables."'],
            fx: { aff: 6, pull: 2 },
            then: [
              ['zhiwei', 'surprise', '“……全糖，加椰果。”', '"...Full sugar. With coconut jelly."'],
              ['zhiwei', 'angry', '“才不是原谅你了，只是糖分有助于重写代码。”', '"That is NOT forgiveness. Sugar simply aids rewriting."'],
            ],
          },
          {
            t: ['“也许可以开个自动保存？”', '"Maybe turn on autosave?"'],
            fx: { aff: 3, pull: -4 },
            then: [
              ['zhiwei', 'angry', '“轮不到踢掉电源的人来教我！”', '"I will not be lectured by the person who kicked out the plug!"'],
              ['zhiwei', 'shy', '“……设置在哪来着。”', '"...Where was that setting again."'],
            ],
          },
        ],
      ],
      ['zhiwei', 'normal', '“叶知微。下次进机房，看、路。”', '"Ye Zhiwei. Next time you enter the lab: watch. Your. Feet."'],
    ],
    2: [
      ['bg', 'lab'],
      ['in', 'zhiwei', 'sad'],
      [
        'n',
        '知微对着屏幕已经半小时没动过了，旁边的奶茶只剩冰块。',
        "Zhiwei hasn't moved from her screen in half an hour. Only ice is left in the cup beside her.",
      ],
      [
        'zhiwei',
        'angry',
        '“这个 Bug 不合逻辑。你，坐下。别说话，听我讲一遍就行。”',
        '"This bug defies logic. You. Sit. Don\'t talk, just listen while I explain it."',
      ],
      [
        'pick',
        [
          {
            t: ['认真听，偶尔问一句“然后呢”。', 'Listen closely, asking "and then?" now and again.'],
            fx: { aff: 8, pull: 0 },
            then: [
              ['zhiwei', 'normal', '“……然后这里把指针传进去——啊。”', '"...and then the pointer gets passed in here and— oh."'],
              ['zhiwei', 'joy', '“找到了！是边界！哈，我果然是天才！”', '"Found it! Off by one! Ha, I truly am a genius!"'],
              ['zhiwei', 'shy', '“……才不是因为你。你只是比小黄鸭大一点。”', '"...Not thanks to you. You\'re merely a slightly larger rubber duck."'],
            ],
          },
          {
            t: ['“要不重启试试？”', '"Have you tried restarting?"'],
            fx: { aff: 2, pull: 4 },
            then: [
              ['zhiwei', 'angry', '“出去。”', '"Out."'],
              ['zhiwei', 'normal', '“……开玩笑的。坐回来。”', '"...Joking. Sit back down."'],
            ],
          },
        ],
      ],
    ],
    3: [
      ['bg', 'lab'],
      ['in', 'zhiwei', 'normal'],
      [
        'n',
        '校园编程赛报名截止前一小时，知微的队友发来消息：不来了。',
        "An hour before sign-ups close for the campus coding contest, Zhiwei's teammate messages: not coming.",
      ],
      [
        'zhiwei',
        'shy',
        '“……规则要求两人组队。我不是在拜托你，只是你刚好在这里。”',
        '"...The rules require a team of two. I am not asking a favour. You simply happen to be here."',
      ],
      [
        'pick',
        [
          {
            t: ['“刚好我也想参加。请多指教，队长。”', '"I happen to want in. Looking forward to it, captain."'],
            fx: { aff: 10, pull: 4, flag: 'zhiwei_team' },
            then: [
              ['zhiwei', 'surprise', '“队、队长……”', '"C-captain..."'],
              ['zhiwei', 'joy', '“哼，算你识相。拖后腿的话我会直说的！”', '"Hmph. Sensible of you. If you drag me down, I\'ll say so!"'],
            ],
          },
          {
            t: ['“说‘拜托’我就答应。”', "\"Say 'please' and I'm in.\""],
            fx: { aff: 5, pull: 10 },
            then: [
              ['zhiwei', 'angry', '“你——！”', '"You—!"'],
              ['zhiwei', 'shy', '“……拜、拜托。就说这一次。”', '"...P-please. I am saying it once."'],
            ],
          },
        ],
      ],
    ],
    4: [
      ['bg', 'lab'],
      ['in', 'zhiwei', 'sad'],
      ['n', '比赛结束的深夜，机房只剩你们的屏幕还亮着。', 'Late on the night the contest ends, only your two screens still glow in the lab.'],
      [
        'zhiwei',
        'sad',
        '“以前的队友都说，跟我组队很累。我说话太直，只会指出哪里错了。”',
        '"My old teammates all said I was exhausting. Too blunt. All I do is point out what\'s wrong."',
      ],
      ['zhiwei', 'shy', '“你为什么……一次都没有生气？”', '"Why haven\'t you... ever got angry?"'],
      [
        'pick',
        [
          {
            t: ['“因为你指出的每个错，后来都变对了。”', '"Because every mistake you pointed out ended up fixed."'],
            fx: { aff: 11, pull: 0 },
            then: [
              ['zhiwei', 'surprise', '“……”', '"..."'],
              ['fx', 'heart'],
              ['zhiwei', 'shy', '“笨蛋。这种回答，没有 Bug。”', '"Idiot. That answer has no bugs."'],
            ],
          },
          {
            t: ['“因为你耳朵红的时候，说的都是反话。”', '"Because when your ears go red, you mean the opposite."'],
            fx: { aff: 12, pull: 8 },
            then: [
              ['zhiwei', 'angry', '“才、才没有红！”', '"Th-they are NOT red!"'],
              ['fx', 'heart'],
              ['zhiwei', 'shy', '“……不许看。”', '"...Don\'t look."'],
            ],
          },
        ],
      ],
      [
        'zhiwei',
        'shy',
        '“星空祭那天，我写了个小程序控制天台的灯。……第一个测试用户，给你留着。”',
        '"For the Star Festival I wrote a little program to run the rooftop lights. ...First test user slot is reserved. For you."',
      ],
    ],
  },

  tangmi: {
    1: [
      ['bg', 'cafe'],
      [
        'n',
        '咖啡店里飘着焦糖的香气。你点的拿铁端上来时，奶泡上画着一颗爱心。',
        'The café smells of caramel. Your latte arrives with a heart drawn in the foam.',
      ],
      ['in', 'tangmi', 'tease'],
      [
        'tangmi',
        'tease',
        '“别误会哦～每位客人都有的。不过学弟这颗，我画得稍微用心了一点点。”',
        '"Don\'t get ideas~ every customer gets one. Though I did try a teeny bit harder on yours."',
      ],
      [
        'pick',
        [
          {
            t: ['“那我也稍微用心地喝。”', '"Then I\'ll drink it a teeny bit harder."'],
            fx: { aff: 7, pull: 10 },
            then: [
              ['tangmi', 'surprise', '“哎呀。”', '"Oh my."'],
              ['tangmi', 'joy', '“会接话嘛！我喜欢会接话的学弟～”', '"He bites back! I like a junior who can banter~"'],
            ],
          },
          {
            t: ['脸红到说不出话。', 'Blush too hard to speak.'],
            fx: { aff: 4, pull: -2 },
            then: [['tangmi', 'joy', '“呵呵呵，好可爱。今天的乐趣达成～”', '"Hee hee, adorable. Today\'s fun: achieved~"']],
          },
          {
            t: ['“谢谢，画得很好看。”', '"Thank you. It\'s nicely drawn."'],
            fx: { aff: 3, pull: -8 },
            then: [['tangmi', 'normal', '“……欸，这么平静？有点不甘心呢。”', '"...Huh, that calm? Now I\'m a little put out."']],
          },
        ],
      ],
      [
        'tangmi',
        'smile',
        '“我叫唐蜜，蜜糖的蜜。记住了的话，下次给你加一份奶油哦。”',
        '"I\'m Tang Mi. Mi as in honey. Remember it and next time you get extra cream."',
      ],
    ],
    2: [
      ['bg', 'cafe'],
      ['in', 'tangmi', 'smile'],
      [
        'n',
        '打烊前，唐蜜端出一只小碟：粉色的慕斯上顶着一颗糖渍樱桃。',
        'Before closing, Tang Mi brings out a small plate: pink mousse crowned with a candied cherry.',
      ],
      [
        'tangmi',
        'smile',
        '“甜品社的新作，你是第一个试吃的。要说实话哦～说谎的人要洗一周杯子。”',
        '"The dessert club\'s newest. You\'re the first taster. Honest opinions only~ liars wash cups for a week."',
      ],
      ['n', '很好看。但是，甜得舌尖发麻。', "It's lovely. It is also sweet enough to numb the tongue."],
      [
        'pick',
        [
          {
            t: [
              '“太甜了。但樱桃的酸很好，慕斯减两成糖会更衬它。”',
              '"Too sweet. But the cherry\'s sharpness is great. Cut the sugar by a fifth and it\'ll shine."',
            ],
            fx: { aff: 8, pull: 4 },
            then: [
              ['tangmi', 'surprise', '“……认真的啊。”', '"...You mean it."'],
              [
                'tangmi',
                'smile',
                '“大家都只会说‘好吃’呢。下一版，还是你来试。”',
                "\"Everyone else just says 'yummy'. You're tasting the next version too.\"",
              ],
            ],
          },
          {
            t: ['“好吃！跟学姐一样甜。”', '"Delicious! As sweet as you."'],
            fx: { aff: 4, pull: 10 },
            then: [
              ['tangmi', 'tease', '“嘴真甜～那杯子就免了。”', '"Smooth talker~ you\'re let off the cups."'],
              ['th', '她笑着收走了碟子，慕斯还剩大半。', 'She takes the plate away smiling. Most of the mousse is still on it.'],
            ],
          },
        ],
      ],
    ],
    3: [
      ['bg', 'cafe'],
      ['in', 'tangmi', 'smile'],
      [
        'n',
        '一位客人为了一杯做错的饮料大声数落了十分钟。唐蜜始终笑着道歉。客人走后，她还在笑。',
        'A customer berates her for ten minutes over a wrong order. Tang Mi apologises, smiling throughout. After he leaves, she is still smiling.',
      ],
      ['tangmi', 'smile', '“没事的～服务业嘛。学弟要再来一杯吗？”', '"It\'s fine~ that\'s service work. Another cup for you?"'],
      [
        'pick',
        [
          {
            t: ['“现在没有客人了。你可以不用笑。”', '"There are no customers now. You don\'t have to smile."'],
            fx: { aff: 10, pull: 6, flag: 'tangmi_mask' },
            then: [
              ['tangmi', 'surprise', '“……”', '"..."'],
              ['tangmi', 'sad', '“……你这个人，偶尔很狡猾。”', '"...You\'re sneaky sometimes, you know."'],
              ['n', '她把脸埋进围裙里，肩膀轻轻抖了一下。', 'She buries her face in her apron. Her shoulders tremble, once.'],
            ],
          },
          {
            t: ['模仿刚才那位客人，夸张地表演了一遍。', 'Do an over-the-top impression of that customer.'],
            fx: { aff: 7, pull: 8 },
            then: [['tangmi', 'joy', '“噗——哈哈哈！才没有那么夸张啦！”', '"Pfft— ha ha! He wasn\'t THAT bad!"']],
          },
        ],
      ],
    ],
    4: [
      ['bg', 'cafe'],
      ['in', 'tangmi', 'normal'],
      [
        'n',
        '打烊后的咖啡店只留了一盏吊灯。唐蜜摘下发饰，端出一块朴素的蛋糕。',
        'After closing, one pendant lamp is left on. Tang Mi takes off her bow and brings out a plain little cake.',
      ],
      [
        'tangmi',
        'normal',
        '“减了两成糖，没有裱花。这是不笑的唐蜜做的。”',
        '"A fifth less sugar. No decoration. Made by the Tang Mi who isn\'t smiling."',
      ],
      ['tangmi', 'sad', '“如果以后我不那么甜了……你还会来吗？”', '"If I stop being so sweet someday... will you still come?"'],
      [
        'pick',
        [
          {
            t: ['“我来这里，本来就不是为了糖。”', '"I never came here for the sugar."'],
            fx: { aff: 12, pull: 8 },
            then: [
              ['tangmi', 'surprise', '“……”', '"..."'],
              ['fx', 'heart'],
              ['tangmi', 'shy', '“犯规。这句话犯规了，学弟。”', '"Foul. That line is a foul, junior."'],
            ],
          },
          {
            t: ['吃一口蛋糕：“这是我吃过最好吃的。”', 'Take a bite: "This is the best thing I\'ve ever eaten."'],
            fx: { aff: 10, pull: 2 },
            then: [
              ['tangmi', 'joy', '“……真的？”', '"...Really?"'],
              ['fx', 'heart'],
              ['tangmi', 'shy', '“那以后，只做给你一个人吃。”', '"Then from now on I\'ll make it for you alone."'],
            ],
          },
        ],
      ],
      [
        'tangmi',
        'tease',
        '“星空祭那天我不排班。所以——要负责把我逗笑哦？真的那种笑。”',
        '"I\'m off shift for the Star Festival. So it\'s your job to make me laugh. For real, this time."',
      ],
    ],
  },

  bailu: {
    1: [
      ['bg', 'rooftop'],
      [
        'n',
        '天台的风很凉。铁门“吱呀”一声，你差点踩到一个躺在地上的人。',
        'The rooftop wind is cool. The iron door creaks, and you nearly step on someone lying on the ground.',
      ],
      ['in', 'bailu', 'normal'],
      ['bailu', 'normal', '“……你挡住猎户座了。”', '"...You\'re blocking Orion."'],
      [
        'pick',
        [
          {
            t: ['让开，在不远处也躺下来。', 'Step aside, and lie down a little way off.'],
            fx: { aff: 7, pull: -4 },
            then: [
              ['n', '很久都没有人说话。星星一颗一颗亮起来。', 'For a long while nobody speaks. The stars come out one by one.'],
              ['bailu', 'smile', '“……你是第一个没有问‘你在干什么’的人。”', '"...You\'re the first person who didn\'t ask what I was doing."'],
            ],
          },
          {
            t: ['“哪个是猎户座？那三颗吗？它们离我们多远？”', '"Which one is Orion? Those three? How far away are they?"'],
            fx: { aff: 3, pull: 8 },
            then: [
              ['bailu', 'normal', '“……问题太多了。星星会被吓跑。”', '"...Too many questions. You\'ll scare the stars."'],
              ['bailu', 'smile', '“开玩笑的。它们跑不掉。”', '"A joke. They can\'t run."'],
            ],
          },
        ],
      ],
      ['bailu', 'normal', '“白露。天文社，社员一名，就是我。”', '"Bai Lu. Astronomy club. One member. Me."'],
    ],
    2: [
      ['bg', 'rooftop'],
      ['in', 'bailu', 'normal'],
      ['n', '白露调好望远镜，往旁边挪了半步，把目镜让给你。', 'Bai Lu adjusts the telescope, then shifts half a step to give you the eyepiece.'],
      ['n', '视野里，一颗小小的、戴着光环的星球悬在黑暗中。', 'In the eyepiece, a tiny ringed planet hangs in the dark.'],
      [
        'bailu',
        'smile',
        '“土星。它的光走了八十分钟才到这里。你现在看见的，是八十分钟以前的它。”',
        '"Saturn. Its light took eighty minutes to get here. What you see is Saturn eighty minutes ago."',
      ],
      [
        'pick',
        [
          {
            t: ['“那你每天晚上，都在看过去。”', '"So every night, you\'re looking at the past."'],
            fx: { aff: 8, pull: 0 },
            then: [
              ['bailu', 'surprise', '“……嗯。”', '"...Mm."'],
              ['bailu', 'smile', '“过去不会离开。所以我喜欢这里。”', '"The past doesn\'t leave. That\'s why I like it here."'],
            ],
          },
          {
            t: ['“好美……谢谢你让我看。”', '"It\'s beautiful... thank you for showing me."'],
            fx: { aff: 6, pull: 4 },
            then: [['bailu', 'smile', '“……不客气。目镜，还可以再借你一会儿。”', '"...You\'re welcome. You may keep the eyepiece a while longer."']],
          },
        ],
      ],
    ],
    3: [
      ['bg', 'rooftop'],
      ['in', 'bailu', 'sad'],
      [
        'n',
        '望远镜旁放着一张通知：社员不足三人的社团，本学期末注销。',
        'A notice lies by the telescope: clubs with fewer than three members will be dissolved at the end of term.',
      ],
      [
        'bailu',
        'sad',
        '“……没关系。星星不需要社团也会亮。只是这台望远镜，要还回去了。”',
        '"...It doesn\'t matter. Stars shine without a club. Only, the telescope will have to go back."',
      ],
      [
        'pick',
        [
          {
            t: ['“入社申请表在哪？我写第二个名字。”', '"Where\'s the membership form? I\'ll be the second name."'],
            fx: { aff: 10, pull: 2, flag: 'bailu_club' },
            then: [
              ['bailu', 'surprise', '“……还差一个人。”', '"...That still leaves one short."'],
              ['me', '“第三个我去找。在那之前，望远镜哪里都不去。”', '"I\'ll find the third. Until then, the telescope stays put."'],
              ['bailu', 'shy', '“……社员二号。你今天，可以多看十分钟。”', '"...Member number two. Today you may look for ten extra minutes."'],
            ],
          },
          {
            t: ['“太不公平了，我去找学生会抗议！”', '"That\'s not fair. I\'ll go and protest to the council!"'],
            fx: { aff: 5, pull: 8 },
            then: [['bailu', 'smile', '“……谢谢。但你生气的样子，比流星还吵。”', '"...Thank you. But angry, you\'re louder than a meteor."']],
          },
        ],
      ],
    ],
    4: [
      ['bg', 'rooftop'],
      ['in', 'bailu', 'normal'],
      [
        'n',
        '流星雨的夜晚。白露没有架望远镜，只是和你并肩坐在毯子上。',
        "The night of the meteor shower. Bai Lu hasn't set up the telescope. She simply sits beside you on a blanket.",
      ],
      [
        'bailu',
        'normal',
        '“我一直以为，等待是一个人的事。等星星，等天晴，等天亮。”',
        '"I always thought waiting was something done alone. For stars, for clear skies, for dawn."',
      ],
      ['bailu', 'shy', '“但是最近……我发现我在等脚步声。”', '"But lately... I\'ve found myself waiting for footsteps."'],
      ['fx', 'flash'],
      [
        'pick',
        [
          {
            t: ['“以后每一次，我都来。不让你等太久。”', '"I\'ll come every time. I won\'t keep you waiting long."'],
            fx: { aff: 12, pull: 4 },
            then: [
              ['bailu', 'shy', '“……嗯。我记下了。”', '"...Mm. I\'ve made a note of it."'],
              ['fx', 'heart'],
            ],
          },
          {
            t: ['不说话，把毯子往她那边拉了拉。', 'Say nothing, and tug the blanket a little further over her.'],
            fx: { aff: 11, pull: -4 },
            then: [
              [
                'n',
                '她的肩膀轻轻靠了过来。一颗流星划过去，谁也没有许愿。',
                'Her shoulder comes to rest against yours. A meteor crosses the sky, and neither of you makes a wish.',
              ],
              ['fx', 'heart'],
            ],
          },
        ],
      ],
      [
        'bailu',
        'smile',
        '“星空祭那晚，是这学期最好的观测条件。……我想让你第一个看见。”',
        '"The night of the Star Festival has the best viewing of the term. ...I want you to be the first to see it."',
      ],
    ],
  },
};
