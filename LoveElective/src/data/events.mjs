// Small campus events that may happen when the hero walks into a place
// (see rollEvent in src/sim.mjs). Each one is a short script in the same
// step format as the story chapters (src/story/chapters.mjs).
//
//   places   where it can happen
//   slots    parts of the day it can happen in (0 morning … 3 night); any if left out
//   girl     a senior who has to be there, already met
//   from     the first day it can happen
//   money    money the hero needs on him for it to come up
//   again    may happen more than once in a term
//
// Choices may change { aff, pull, stats, money, energy, item }; affection
// and the gauge belong to the event's senior.

export const EVENTS = [
  // ---- without a senior ------------------------------------------------------
  {
    id: 'library-cat',
    places: ['library'],
    script: [
      ['n', '窗台上趴着一只橘猫，正把你的自习座位当成了自己的地盘。', 'A ginger cat is sprawled on the windowsill, treating your study seat as its own.'],
      [
        'pick',
        [
          {
            t: ['挠挠它的下巴', 'Scratch it under the chin'],
            fx: { stats: { eq: 2 }, energy: 6 },
            then: [['n', '它眯起眼睛，发出轻轻的呼噜声。你的心也跟着软了下来。', 'It narrows its eyes and purrs softly. Something in you softens too.']],
          },
          {
            t: ['换个座位，不打扰它', 'Find another seat and let it be'],
            fx: { stats: { intellect: 2 } },
            then: [['n', '你在角落里安静地读了一下午。偶尔抬头，猫还在那里。', 'You read quietly in a corner all afternoon. Each time you look up, the cat is still there.']],
          },
        ],
      ],
    ],
  },
  {
    id: 'pop-quiz',
    places: ['classroom'],
    slots: [0, 1],
    script: [
      ['pf', '“把书合上。突击小测，十分钟。”', '"Close your books. Pop quiz, ten minutes."'],
      ['n', '教室里一片哀嚎。最后一道题，你完全没有头绪。', 'The room groans. The last question leaves you with no idea at all.'],
      [
        'pick',
        [
          {
            t: ['硬着头皮推导到底', 'Grit your teeth and reason it out'],
            fx: { stats: { intellect: 3 }, energy: -6 },
            then: [['pf', '“思路是对的。下课来找我，我们把最后一步补上。”', '"Right approach. Come and see me after class and we\'ll finish the last step."']],
          },
          {
            t: ['写下“这题我想交个朋友”', 'Write "I would like to befriend this question"'],
            fx: { stats: { charm: 1, eq: 1 } },
            then: [['pf', '“……零分。但字写得不错。”', '"...Zero marks. Nice handwriting, though."']],
          },
        ],
      ],
    ],
  },
  {
    id: 'stray-ball',
    places: ['field'],
    script: [
      ['n', '一颗足球从场边呼啸着朝你飞来——', 'A football comes whistling at you from the touchline—'],
      ['fx', 'shake'],
      [
        'pick',
        [
          {
            t: ['一个漂亮的停球，踢回去', 'Trap it neatly and send it back'],
            fx: { stats: { fitness: 2, charm: 1 } },
            then: [['n', '场上响起一片口哨声。“兄弟，来不来踢一场？”', 'Whistles from the pitch. "Mate, fancy a game?"']],
          },
          {
            t: ['抱头蹲下', 'Duck and cover'],
            fx: { stats: { eq: 1 } },
            then: [['n', '球擦着头顶飞过。踢球的人跑过来连声道歉，还塞给你一瓶水。', 'It sails over your head. The player runs over full of apologies and presses a bottle of water on you.']],
          },
        ],
      ],
    ],
  },
  {
    id: 'sudden-rain',
    places: ['gate', 'street'],
    slots: [1, 2],
    script: [
      ['n', '天色说变就变，豆大的雨点砸了下来。', 'The sky turns in an instant, and fat raindrops start to fall.'],
      [
        'pick',
        [
          {
            t: ['在便利店买把伞（¥20）', 'Buy an umbrella at the corner shop (¥20)'],
            fx: { money: -20, stats: { eq: 1 } },
            then: [['n', '回去的路上，你把伞分给了一个同样被淋湿的新生。', 'On the way back you share it with another soaked first-year.']],
          },
          {
            t: ['冒雨跑回去', 'Run for it'],
            fx: { stats: { fitness: 2 }, energy: -10 },
            then: [['n', '你浑身湿透，却莫名其妙地笑出了声。', 'You are soaked to the skin, and for some reason you start laughing.']],
          },
        ],
      ],
    ],
  },
  {
    id: 'busker',
    places: ['street'],
    script: [
      ['n', '街角有人抱着吉他唱歌，看见你停下，笑着朝你招手：“会唱吗？来一段！”', 'Someone is singing on the corner with a guitar. Seeing you stop, they wave you over: "Can you sing? Join in!"'],
      [
        'pick',
        [
          {
            t: ['接过话筒，唱一段', 'Take the microphone'],
            fx: { stats: { charm: 2, art: 1 } },
            then: [['n', '一曲唱完，围观的人鼓起了掌。你的耳朵有点发烫。', 'When the song ends, the little crowd claps. Your ears feel hot.']],
          },
          {
            t: ['在琴盒里放下 ¥10', 'Drop ¥10 in the guitar case'],
            fx: { money: -10, stats: { eq: 2 } },
            then: [['n', '“谢啦！祝你今天遇到喜欢的人。”', '"Thanks! Hope you meet someone you like today."']],
          },
        ],
      ],
    ],
  },
  {
    id: 'lost-wallet',
    places: ['cafe', 'gate'],
    script: [
      ['n', '座位底下躺着一个钱包，里面夹着一张学生证。', 'A wallet lies under a seat, a student card tucked inside.'],
      [
        'pick',
        [
          {
            t: ['按学生证上的信息还给失主', 'Return it using the student card'],
            fx: { stats: { eq: 2 }, money: 30 },
            then: [['n', '失主千恩万谢，硬塞给你一张代金券。“请你喝咖啡！”', 'The owner thanks you over and over and insists you take a voucher. "Coffee\'s on me!"']],
          },
          {
            t: ['交给店员或门卫', 'Hand it to the staff'],
            fx: { stats: { eq: 1 } },
            then: [['n', '你登记了自己的名字，心里踏实了许多。', 'You write down your name, and feel settled.']],
          },
        ],
      ],
    ],
  },
  {
    id: 'club-fair',
    places: ['gate'],
    slots: [0, 1],
    script: [
      ['n', '几个社团还在樱花道上招新，一个学长热情地拦住了你。', 'A few clubs are still recruiting along the cherry walk. An upperclassman bounds over to you.'],
      [
        'pick',
        [
          {
            t: ['去辩论社的摊位坐坐', 'Sit at the debate club stall'],
            fx: { stats: { intellect: 1, eq: 2 } },
            then: [['n', '你们为“甜粽子还是咸粽子”争了整整二十分钟。', 'You argue about sweet versus savoury rice dumplings for twenty full minutes.']],
          },
          {
            t: ['去摄影社的摊位看看', 'Look at the photography club'],
            fx: { stats: { art: 2, charm: 1 } },
            then: [['n', '社长借你相机拍了几张。取景框里的校园，好像比平时更好看。', 'The president lends you a camera. Through the viewfinder, the campus looks better than usual.']],
          },
        ],
      ],
    ],
  },
  {
    id: 'midnight-snack',
    places: ['dorm'],
    slots: [2, 3],
    script: [
      ['n', '室友端着一锅泡面推门进来：“饿不饿？加了两个蛋。”', 'Your roommate shoulders the door open with a pot of noodles. "Hungry? There are two eggs in it."'],
      [
        'pick',
        [
          {
            t: ['一起吃，顺便聊到半夜', 'Eat together and talk till late'],
            fx: { energy: 12, stats: { eq: 2 } },
            then: [['n', '你们聊起各自的家乡，聊到窗外的灯一盏盏熄灭。', 'You talk about home until the lights outside go out one by one.']],
          },
          {
            t: ['婉拒，翻开明天的课本', 'Decline and open tomorrow\'s textbook'],
            fx: { stats: { intellect: 2 } },
            then: [['n', '泡面的香味飘了一整晚。你的意志力，值得表扬。', 'The smell of noodles lingers all night. Your willpower deserves a medal.']],
          },
        ],
      ],
    ],
  },
  {
    id: 'shooting-star',
    places: ['rooftop'],
    slots: [3],
    script: [
      ['n', '夜空中划过一道细长的光。是流星。', 'A thin streak of light crosses the night sky. A shooting star.'],
      ['fx', 'flash'],
      [
        'pick',
        [
          {
            t: ['许愿：期末不挂科', 'Wish: pass every exam'],
            fx: { stats: { intellect: 2 } },
            then: [['th', '……这个愿望，好像得靠自己。', '...I suppose this one is down to me.']],
          },
          {
            t: ['许愿：星空祭那天，不要退缩', 'Wish: not to lose my nerve at the festival'],
            fx: { stats: { charm: 1, eq: 2 } },
            then: [['th', '说出口的瞬间，心跳快了一拍。', 'The moment you say it, your heart skips.']],
          },
        ],
      ],
    ],
  },
  {
    id: 'flyer-rush',
    places: ['gate', 'street'],
    again: true,
    from: 5,
    script: [
      ['n', '一家新开的奶茶店在发传单，店长看你站得笔直，问你愿不愿意帮半小时忙。', 'A new tea shop is handing out flyers. The manager, seeing you standing there, asks if you could help for half an hour.'],
      [
        'pick',
        [
          {
            t: ['帮忙发完这一沓', 'Hand out the whole stack'],
            fx: { money: 45, energy: -8 },
            then: [['n', '“辛苦啦！这是工钱，还有一杯新品。”', '"Thanks a lot! Here\'s your pay, and a cup of the new flavour."']],
          },
          {
            t: ['说自己还有事', 'Say you have somewhere to be'],
            fx: {},
            then: [['n', '店长笑着摆摆手。“下次见！”', 'The manager waves you off with a smile. "Next time!"']],
          },
        ],
      ],
    ],
  },

  // ---- with a senior ---------------------------------------------------------
  {
    id: 'qingge-notes',
    places: ['library'],
    girl: 'qingge',
    script: [
      ['n', '桌上落着一本笔记，页边写满了工整的批注，封面写着“沈清歌”。', 'A notebook lies on the desk, its margins full of neat notes. The cover reads "Shen Qingge".'],
      [
        'pick',
        [
          {
            t: ['立刻还给她', 'Give it back to her at once'],
            fx: { aff: 3, pull: -4 },
            then: [
              ['in', 'qingge', 'surprise'],
              ['qingge', 'smile', '“……我找了一上午。谢谢。”', '"...I\'ve been looking all morning. Thank you."'],
            ],
          },
          {
            t: ['翻开看一页，再还给她', 'Read one page, then return it'],
            fx: { aff: 1, pull: 6, stats: { intellect: 2 } },
            then: [
              ['in', 'qingge', 'angry'],
              ['qingge', 'angry', '“看到第几页了？”', '"How far did you get?"'],
              ['me', '“第三页。学姐的笔记比教材好懂。”', '"Page three. Your notes make more sense than the textbook."'],
              ['qingge', 'shy', '“……下不为例。”', '"...Just this once."'],
            ],
          },
        ],
      ],
    ],
  },
  {
    id: 'linxia-race',
    places: ['field'],
    girl: 'linxia',
    script: [
      ['in', 'linxia', 'joy'],
      ['linxia', 'joy', '“来得正好！一百米，输的人请喝运动饮料！”', '"Perfect timing! A hundred metres, loser buys the sports drinks!"'],
      [
        'pick',
        [
          {
            t: ['全力以赴', 'Give it everything'],
            fx: { aff: 3, pull: 4, stats: { fitness: 2 }, energy: -10 },
            then: [
              ['fx', 'shake'],
              ['linxia', 'smile', '“哈……哈……你比上次快多了嘛！不过还是我赢！”', '"Ha... ha... you\'re way faster than last time! Still, I win!"'],
            ],
          },
          {
            t: ['“我请，不用比了。”', '"Drinks are on me. No race needed."'],
            fx: { aff: 1, pull: -4, money: -25 },
            then: [['linxia', 'sad', '“欸——不比赛有什么意思嘛。……不过饮料我收下了。”', '"Aww, where\'s the fun without a race? ...I\'ll take the drink, though."']],
          },
        ],
      ],
    ],
  },
  {
    id: 'wanqing-model',
    places: ['artroom'],
    girl: 'wanqing',
    script: [
      ['in', 'wanqing', 'shy'],
      ['wanqing', 'shy', '“那个……能请你当我十五分钟的模特吗？只要坐着不动就好。”', '"Um... could you sit for me for fifteen minutes? Just keep still."'],
      [
        'pick',
        [
          {
            t: ['乖乖坐好', 'Sit still like a good model'],
            fx: { aff: 4, stats: { art: 1 } },
            then: [
              ['n', '画室里只有铅笔沙沙的声音。偶尔，她的视线会停得比需要的久一点。', 'Only the scratch of pencil fills the room. Now and then her gaze lingers a little longer than it needs to.'],
              ['wanqing', 'smile', '“好了。……画得比我想的还要好。”', '"Done. ...It came out better than I hoped."'],
            ],
          },
          {
            t: ['“那我也画你。”', '"Then I\'ll draw you too."'],
            fx: { aff: 2, pull: 8, stats: { art: 2 } },
            then: [['wanqing', 'surprise', '“诶？……好、好吧。那我们交换。”', '"Eh? ...O-okay. Then we swap."']],
          },
        ],
      ],
    ],
  },
  {
    id: 'xinglan-string',
    places: ['musicroom'],
    girl: 'xinglan',
    script: [
      ['n', '“啪”的一声，琴弦断了。', 'Twang. A string snaps.'],
      ['in', 'xinglan', 'angry'],
      ['xinglan', 'angry', '“……啧。明天就要排练。”', '"...Tch. Rehearsal\'s tomorrow."'],
      [
        'pick',
        [
          {
            t: ['跑去商业街帮她买一套新弦（¥30）', 'Run to the shops for a new set (¥30)'],
            fx: { aff: 4, pull: 4, money: -30 },
            then: [['xinglan', 'shy', '“……我又没让你去。不过，谢了。”', '"...I didn\'t ask you to. But thanks."']],
          },
          {
            t: ['“断了一根也能弹。摇滚嘛。”', '"You can play with one string short. It\'s rock."'],
            fx: { aff: 3, pull: -6 },
            then: [['xinglan', 'smile', '“……哈。有点道理。”她用五根弦弹完了整首歌。', '"...Huh. Fair point." She plays the whole song on five strings.']],
          },
        ],
      ],
    ],
  },
  {
    id: 'zhiwei-bug',
    places: ['lab'],
    girl: 'zhiwei',
    script: [
      ['in', 'zhiwei', 'angry'],
      ['zhiwei', 'angry', '“别过来，我在跟一个空指针决斗。”', '"Don\'t come over. I\'m duelling a null pointer."'],
      [
        'pick',
        [
          {
            t: ['坐下来一起查', 'Sit down and help track it'],
            fx: { aff: 3, stats: { intellect: 2 }, energy: -10 },
            then: [
              ['n', '两个小时后，屏幕上终于跳出一行绿色的“通过”。', 'Two hours later, a green "passed" finally appears on the screen.'],
              ['zhiwei', 'shy', '“……也就比我慢一点点。还行吧。”', '"...Only a little slower than me. Not bad."'],
            ],
          },
          {
            t: ['给她递一杯热可可', 'Bring her a hot cocoa'],
            fx: { aff: 3, pull: 4, money: -26 },
            then: [['zhiwei', 'smile', '“……糖分摄入，有助于调试。我是说，谢谢。”', '"...Sugar intake helps debugging. I mean, thanks."']],
          },
        ],
      ],
    ],
  },
  {
    id: 'tangmi-prank',
    places: ['cafe'],
    girl: 'tangmi',
    script: [
      ['in', 'tangmi', 'tease'],
      ['tangmi', 'tease', '“新品试喝，免费哦～”', '"Free taste of our new drink~"'],
      ['n', '你喝了一大口。——是咸的。', 'You take a big gulp. It is salty.'],
      ['fx', 'shake'],
      [
        'pick',
        [
          {
            t: ['面不改色地喝完', 'Finish it without blinking'],
            fx: { aff: 4, pull: 6 },
            then: [['tangmi', 'surprise', '“诶？！你、你还真喝完了？……有意思。”', '"Eh?! Y-you actually drank it all? ...Interesting."']],
          },
          {
            t: ['把杯子推回去：“学姐也尝尝？”', 'Push the cup back: "Your turn?"'],
            fx: { aff: 3, pull: 10 },
            then: [['tangmi', 'shy', '“……被将军了呢。好吧，今天的蛋糕算我的。”', '"...Checkmate. Fine, today\'s cake is on me."']],
          },
        ],
      ],
    ],
  },
  {
    id: 'bailu-saturn',
    places: ['rooftop'],
    girl: 'bailu',
    slots: [2, 3],
    script: [
      ['in', 'bailu', 'normal'],
      ['bailu', 'normal', '“……土星。要看吗。”', '"...Saturn. Want to see?"'],
      ['n', '她把望远镜让到一边。目镜里，一颗带着光环的小小星球静静悬着。', 'She steps aside from the telescope. In the eyepiece, a small ringed world hangs quietly.'],
      [
        'pick',
        [
          {
            t: ['安静地看很久', 'Look for a long time, quietly'],
            fx: { aff: 4, pull: -4, stats: { eq: 2 } },
            then: [['bailu', 'smile', '“……你看星星的样子，和我很像。”', '"...You look at stars the way I do."']],
          },
          {
            t: ['“好漂亮！学姐也来看！”', '"It\'s beautiful! You look too!"'],
            fx: { aff: 2, pull: 8 },
            then: [['bailu', 'shy', '“……我看过很多次了。”她还是凑了过来。', '"...I\'ve seen it many times." She leans in anyway.']],
          },
        ],
      ],
    ],
  },
  {
    id: 'qingge-street',
    places: ['street'],
    girl: 'qingge',
    script: [
      ['in', 'qingge', 'surprise'],
      ['n', '你在书店门口撞见了会长。她怀里抱着一本封面很可爱的少女漫画。', 'You run into the president outside the bookshop, a very cute shoujo manga in her arms.'],
      ['qingge', 'angry', '“……这是给妹妹买的。”', '"...This is for my sister."'],
      [
        'pick',
        [
          {
            t: ['“我也在追这一部。”', '"I\'m reading that one too."'],
            fx: { aff: 4, pull: 4 },
            then: [['qingge', 'shy', '“……真的？那、第七卷的结局，你怎么看？”', '"...Really? Then, what did you make of volume seven\'s ending?"']],
          },
          {
            t: ['点点头，什么也不问', 'Nod and ask nothing'],
            fx: { aff: 3, pull: -6 },
            then: [['qingge', 'smile', '“……你很懂分寸。”', '"...You know when not to ask."']],
          },
        ],
      ],
    ],
  },
];
