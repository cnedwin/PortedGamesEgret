// 第五案「镰刀聚蝇」：弓手在乡道上被镰刀砍死。提刑亲临初检，收全村镰刀晒于日下，蝇集其一。
// 依据《洗冤集录》卷二「疑难杂说下」：被杀尸在路傍，沿身衣物俱在，遍身镰刀斫伤十余处；"盗只欲人死取财，今物在伤多，
// 非冤仇而何？"令居民各将镰刀呈验，布列地上，时方盛暑，内镰刀一张，蝇子飞集。
// 又「初检」与条令：初、覆检屍格目由提点刑狱司印造，以《千字文》为号凿定，给下州县。
// Case five, "Flies on the Sickle": a constable cut down with a sickle on a country path. The intendant holds the
// inquest himself, has every sickle in the village laid out in the sun, and the flies gather on one. From the same
// book: a man killed by the road, his belongings all on him, cut more than ten times with a sickle; "a robber only
// wants a man dead to take his goods; here the goods remain and the wounds are many, so it was hatred"; the villagers'
// sickles were laid on the ground in high summer, and flies swarmed to one. Also from the rules: the inquest forms are
// printed by the intendant's office and numbered by the Thousand Character Classic.

export default {
  id: 'c5',
  scroll: 3,
  title: { zh: '镰刀聚蝇', en: 'Flies on the Sickle' },
  place: { zh: '白蘋县 · 桑田乡道', en: 'Baipin County · the path through Mulberry Fields' },
  time: { zh: '六月初七，正午', en: 'The seventh day of the sixth month, noon' },
  intro: {
    zh: [
      '沈砚派弓手赵勇暗查县衙的格目。六月初七一早，赵勇被人发现死在桑田乡的田埂边。',
      '这一回不是重画的现场，是沈砚亲临初检。他叫马里正把全村的镰刀都收来，一字排开，摆在正午的日头下。'
    ],
    en: [
      'Shen Yan had set Zhao Yong, a constable, to look quietly into the county\'s inquest forms. Early on the seventh day of the sixth month, Zhao Yong was found dead beside a field path in Mulberry Fields.',
      'This time the scene is no painting. Shen Yan holds the first inquest himself. He has Headman Ma collect every sickle in the village and lay them out in a row under the noon sun.'
    ]
  },
  outro: {
    zh: [
      '屠二招认：有人给了他三十贯新会子，叫他“收拾那个多事的弓手”。给钱的人他没看清脸，只记得那人穿着青色公服，提着县衙的灯笼。',
      '包会子的那张空白格目，编号盈字第三十号。格目由提刑司印造，三纸一副，按千字文编号发到县里，只有县尉司收着。沈砚命人去请县尉韦衡问话。',
      '弓手回来报：县尉昨夜在书房里，悬梁了。'
    ],
    en: [
      'Tu Er confesses. Someone gave him thirty strings in new notes to "deal with that meddling constable". He never saw the man\'s face; he remembers only a blue-green office robe and a county lantern.',
      'The blank form the notes were wrapped in is numbered Ying 30. The forms are printed by the intendant\'s office in sets of three, numbered by the Thousand Character Classic, and sent to the county, where only the sheriff\'s office keeps them. Shen Yan sends for Wei Heng, the sheriff.',
      'The constables come back with word: last night, in his study, the sheriff hanged himself.'
    ]
  },
  words: {
    zhaoyong: { kind: 'person', zh: '赵勇', en: 'Zhao Yong', is: { role: ['victim', 'body', 'roll'], mark: ['none', 'roll'], look: ['dead', 'body'] } },
    zhaosao: { kind: 'person', zh: '赵嫂', en: 'Mrs Zhao', is: { role: ['wife', 'roll'], mark: ['none', 'roll'], look: ['mourning', 'roll'] } },
    tuer: { kind: 'person', zh: '屠二', en: 'Tu Er', is: { role: ['butcher', 'roll'], mark: ['threelines', 'roll'], look: ['scar', 'roll'] } },
    niuda: { kind: 'person', zh: '牛大', en: 'Niu Da', is: { role: ['farmer', 'roll'], mark: ['circle', 'roll'], look: ['hunch', 'roll'] } },
    guisao: { kind: 'person', zh: '桂嫂', en: 'Sister Gui', is: { role: ['widow', 'roll'], mark: ['cross', 'roll'], look: ['osmanthus', 'roll'] } },
    ma: { kind: 'person', zh: '马里正', en: 'Headman Ma', is: { role: ['headman', 'roll'], mark: ['redcord', 'roll'], look: ['whitebeard', 'roll'] } },
    purse: { kind: 'thing', zh: '钱袋', en: 'purse', is: { belongs: ['victim', 'purse'], money: ['yes', 'purse'], found: ['body', 'purse'], paper: ['no', 'purse'] } },
    sickle: { kind: 'thing', zh: '镰刀', en: 'sickle', is: { belongs: ['village', 'sickles'], money: ['no', 'sickles'], paper: ['no', 'sickles'] } },
    notes: { kind: 'thing', zh: '新会子', en: 'new notes', is: { belongs: ['tuer', 'basket'], money: ['yes', 'basket'], found: ['basket', 'basket'], paper: ['huizi', 'basket'] } },
    wrapper: { kind: 'thing', zh: '空白格目', en: 'blank inquest form', is: { belongs: ['sheriff', 'basket'], money: ['no', 'basket'], found: ['basket', 'basket'], paper: ['form', 'basket'] } },
    cuts: { kind: 'mark', zh: '镰刀斫伤', en: 'sickle wounds', is: { where: ['body', 'body'] } },
    flies: { kind: 'mark', zh: '苍蝇', en: 'flies', is: { where: ['blade', 'sickles'] } },
    threelines: { kind: 'mark', zh: '三道横', en: 'three bars', is: { where: ['handle', 'flysickle'] } },
    robbery: { kind: 'motive', zh: '劫财', en: 'robbery', is: { true: ['no', 'purse'] } },
    revenge: { kind: 'motive', zh: '寻仇', en: 'a grudge', is: { true: ['yes', 'purse'] } }
  },
  spots: {
    body: {
      kind: 'body',
      title: { zh: '尸身', en: 'The body' },
      text: {
        zh: '死者[[zhaoyong]]，县衙弓手，年三十二，倒在田埂边，盖着草席。\n身上大小十几处[[cuts]]，伤口两头尖小，弯而不直。腰牌还挂在腰上。',
        en: 'The dead man is [[zhaoyong]], a county constable, thirty-two, fallen beside the field path and covered with a straw mat.\nHe has more than ten [[cuts]], large and small, pointed at both ends and curved, not straight. His constable\'s tag still hangs at his waist.'
      },
      marks: [
        { side: 'front', x: 0.38, y: 0.27, zh: '弯形斫伤', en: 'Curved cuts' },
        { side: 'front', x: 0.6, y: 0.36, zh: '弯形斫伤', en: 'Curved cuts' },
        { side: 'front', x: 0.16, y: 0.42, zh: '臂上挡伤', en: 'Cuts on the arm, fending' },
        { side: 'back', x: 0.5, y: 0.3, zh: '背上斫伤数处', en: 'Several cuts across the back' }
      ]
    },
    purse: {
      kind: 'object',
      title: { zh: '钱袋', en: 'The purse' },
      text: {
        zh: '死者的[[purse]]还系在腰间，里面一贯三百文铜钱，一文不少。\n老秦说：“是[[robbery]]，还是[[revenge]]，看他身上的东西还在不在，看他挨了几刀。劫道的人，只要人死好拿钱。”',
        en: 'The dead man\'s [[purse]] is still tied at his belt, with a string and three hundred cash in it, not a coin missing.\nOld Qin says: "[[robbery|Robbery]] or [[revenge]]? Look at whether his things are still on him, and count the cuts. A highwayman only wants a man dead so he can take what he has."'
      }
    },
    sickles: {
      kind: 'object',
      title: { zh: '一排镰刀', en: 'The row of sickles' },
      text: {
        zh: '马里正把全村的[[sickle]]都收来，七十几把，一字排开晒在日头下。\n正是盛暑，不一会儿，只有一把上头落满了[[flies]]。',
        en: 'Headman Ma has gathered every [[sickle]] in the village, more than seventy, and laid them out in a row in the sun.\nIt is high summer. Before long one of them, and only one, is crawling with [[flies]].'
      }
    },
    flysickle: {
      kind: 'object',
      title: { zh: '聚蝇的那把', en: 'The one with the flies' },
      text: {
        zh: '落满苍蝇的那把镰刀，刃口擦得发亮，可血腥气是擦不掉的。刀柄上刻着[[threelines]]。',
        en: 'The sickle the flies have found. Its edge has been rubbed bright, but the smell of blood does not rub off. Carved on the handle: [[threelines]].'
      }
    },
    roll: {
      kind: 'doc',
      title: { zh: '里正的名册', en: 'The headman\'s roll' },
      text: {
        zh: '桑田乡名册，并各家镰刀记号：\n[[zhaoyong]]，县衙弓手，三十二；妻[[zhaosao]]，头裹白布守丧。家中无镰。\n[[tuer]]，屠户，三十，左颊有疤。镰柄刻三道横。\n[[niuda]]，五十，驼背。镰柄刻一个圈。\n[[guisao]]，寡妇，三十余，鬓插桂花。镰柄刻一个叉。\n[[ma]]，六十，白须。镰柄缠红绳，不刻记。',
        en: 'The Mulberry Fields roll, with each household\'s sickle mark:\n[[zhaoyong]], county constable, 32; his wife, [[zhaosao]], in a white mourning headcloth. No sickle in the house.\n[[tuer]], butcher, 30, a scar on his left cheek. Handle carved with three bars.\n[[niuda]], 50, hunchbacked. Handle carved with a circle.\n[[guisao]], widow, past 30, osmanthus in her hair. Handle carved with a cross.\n[[ma]], 60, white-bearded. Handle bound with red cord, no carving.'
      }
    },
    basket: {
      kind: 'object',
      title: { zh: '灶后的竹筐', en: 'The basket behind the stove' },
      text: {
        zh: '弓手从屠二家灶后搜出一只竹筐，里面一包崭新的[[notes]]，三十贯。会子上的号，又是“天字三百二十号”。\n包着它的是一张[[wrapper]]，印着“白蘋县尉司检验格目”的抬头，千字文编号：盈字第三十号。',
        en: 'From behind Tu Er\'s stove the constables bring out a bamboo basket. In it, a bundle of [[notes]], thirty strings, brand new. The number on them is "Tian 320" again.\nThe bundle is wrapped in a [[wrapper]], headed "Baipin sheriff\'s office: inquest form" and numbered by the Thousand Character Classic: Ying 30.'
      }
    },
    zhaosao: {
      kind: 'person',
      title: { zh: '头裹白布的妇人', en: 'The woman in white' },
      text: {
        zh: '头裹白布的妇人，跪在草席边。她说：“屠二欠我家三贯钱，前日我男人逼他还，他撂下话说‘过几日叫你好看’。我男人这几天在查县衙的格目，说有几份字迹不对。”',
        en: 'A woman with a white cloth over her hair, kneeling by the mat. "Tu Er owes us three strings," she says. "The other day my husband pressed him for it and he said, ‘In a few days you\'ll see.\' And my husband had been looking into the county\'s inquest forms. He said some of the handwriting was wrong."'
      }
    },
    tuer: {
      kind: 'person',
      title: { zh: '疤脸汉子', en: 'The scarred man' },
      text: {
        zh: '左颊一道疤的汉子，眼睛不敢往镰刀那边看。他说：“那把不是我的！我的镰刀前几日就丢了。”',
        en: 'A man with a scar down his left cheek, who will not look at the sickles. "That one isn\'t mine!" he says. "Mine went missing days ago."'
      }
    },
    niuda: {
      kind: 'person',
      title: { zh: '驼背老汉', en: 'The hunchbacked man' },
      text: {
        zh: '驼背的老汉，拄着锄头。他说：“我的镰刀刻着圈，在那头，干干净净的。”',
        en: 'A hunchbacked old man leaning on a hoe. "Mine has a circle on it," he says. "It\'s down at that end, clean as anything."'
      }
    },
    guisao: {
      kind: 'person',
      title: { zh: '鬓插桂花的妇人', en: 'The woman with osmanthus' },
      text: {
        zh: '鬓边插着桂花的妇人。她说：“昨儿傍晚，我看见那个疤脸的往田埂那边去，手里提着家伙。”',
        en: 'A woman with a sprig of osmanthus in her hair. "Yesterday evening," she says, "I saw the scar-faced one going off towards the field path with a blade in his hand."'
      }
    },
    ma: {
      kind: 'person',
      title: { zh: '白须老人', en: 'The white-bearded man' },
      text: {
        zh: '白须的老人，捧着名册。他说：“各家镰刀柄上都有记号，交来之前都登了册，一把也没错。”',
        en: 'A white-bearded old man holding a register. "Every household marks its sickle handle," he says, "and each was written down before it was handed in. Not one is wrong."'
      }
    }
  },
  pages: [
    {
      id: 'names',
      names: true,
      title: { zh: '人物', en: 'People' },
      portraits: [
        { id: 'zhaosao', answer: 'zhaosao', needs: { look: 'mourning' }, why: { zh: '名册里谁头裹白布守丧？', en: 'Who does the roll say wears a white mourning cloth?' } },
        { id: 'tuer', answer: 'tuer', needs: { look: 'scar' }, why: { zh: '名册里谁的脸上有疤？', en: 'Who does the roll say has a scar?' } },
        { id: 'niuda', answer: 'niuda', needs: { look: 'hunch' }, why: { zh: '名册里谁驼背？', en: 'Who does the roll say is hunchbacked?' } },
        { id: 'guisao', answer: 'guisao', needs: { look: 'osmanthus' }, why: { zh: '名册里谁鬓边插着桂花？', en: 'Who does the roll say wears osmanthus?' } },
        { id: 'ma', answer: 'ma', needs: { look: 'whitebeard' }, why: { zh: '名册里谁留着白须？', en: 'Who does the roll say is white-bearded?' } }
      ]
    },
    {
      id: 'p1',
      title: { zh: '劫财还是寻仇', en: 'Robbery or a grudge' },
      text: {
        zh: '{{b1}}身上有十几处{{b2}}，他的{{b3}}却原封未动。劫道的只求人死好拿钱，不会砍这么多刀——这不是{{b4}}，是{{b5}}。',
        en: '{{b1}} has more than ten {{b2}}, yet his {{b3}} is untouched. A highwayman wants a man dead only to take his money, and would not cut him so many times. This was not {{b4}}; it was {{b5}}.'
      },
      blanks: {
        b1: { answer: 'zhaoyong', needs: { role: 'victim' }, why: { zh: '死的是谁？', en: 'Who is the dead man?' } },
        b2: { answer: 'cuts', needs: { where: 'body' }, why: { zh: '他身上是什么伤？', en: 'What wounds are on him?' } },
        b3: { answer: 'purse', needs: { belongs: 'victim' }, why: { zh: '他随身的什么东西还在？', en: 'What of his is still on him?' } },
        b4: { answer: 'robbery', needs: { true: 'no' }, why: { zh: '钱还在，说明不是什么？', en: 'The money is still there. So it was not what?' } },
        b5: { answer: 'revenge', needs: { true: 'yes' }, why: { zh: '伤多而物在，是为了什么？', en: 'Many wounds and nothing taken: why kill him, then?' } }
      }
    },
    {
      id: 'p2',
      title: { zh: '镰刀是谁的', en: 'Whose sickle' },
      text: {
        zh: '七十几把镰刀摆在日头下，只有一把招来了{{b6}}。它的柄上刻着{{b7}}，照里正的登记，那是{{b8}}的记号。他家竹筐里那包{{b9}}，外面裹的是一张{{b10}}。',
        en: 'Seventy-odd sickles in the sun, and only one drew the {{b6}}. Its handle is carved with {{b7}}, which by the headman\'s roll is the mark of {{b8}}. The bundle of {{b9}} in his basket was wrapped in a {{b10}}.'
      },
      blanks: {
        b6: { answer: 'flies', needs: { where: 'blade' }, why: { zh: '日头底下，什么东西会落到沾过血的刃上？', en: 'In the sun, what settles on a blade that has had blood on it?' } },
        b7: { answer: 'threelines', needs: { where: 'handle' }, why: { zh: '那把镰刀的柄上刻着什么？', en: 'What is carved on that sickle\'s handle?' } },
        b8: { answer: 'tuer', needs: { mark: 'threelines' }, why: { zh: '名册里，谁的镰刀刻这个记号？', en: 'Whose sickle carries that mark in the roll?' } },
        b9: { answer: 'notes', needs: { money: 'yes', found: 'basket' }, why: { zh: '竹筐里藏着的是什么钱？', en: 'What money was hidden in the basket?' } },
        b10: { answer: 'wrapper', needs: { paper: 'form' }, why: { zh: '包钱的是一张什么纸？', en: 'What sort of paper was the money wrapped in?' } }
      }
    }
  ]
};
