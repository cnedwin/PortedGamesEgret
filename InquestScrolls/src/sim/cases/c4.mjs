// 第四案「刻坊夜火」：刻工先被刺死，再被放火烧铺，初检写成烛火失慎。
// 依据《洗冤集录》卷四「火死」：生前被火烧死者口鼻内有烟灰，死后烧者口内无烟灰；被刃杀死却作火烧死者，
// 于尸首下净地上用酽米醋、酒泼，若是杀死，即有血入地，鲜红色。「杀伤」：生前刃伤皮肉卷凸，有血荫；用手遮截，手上必有伤。
// Case four, "Fire at the Engraver's": an engraver stabbed first and burned after, written down as an accident with a
// candle. From the same book: a man burned alive has ash in his mouth and nose, one burned dead has none; where a man
// was stabbed and then burned, strong vinegar poured on the ground beneath him brings up his blood, bright red; a
// wound made in life gapes with a bruise round it, and a man who fends off a blade is cut on the hand.

export default {
  id: 'c4',
  scroll: 2,
  title: { zh: '刻坊夜火', en: 'Fire at the Engraver\'s' },
  place: { zh: '白蘋县城 · 葛家刻字铺', en: 'Baipin town · the Ge engraving shop' },
  time: { zh: '五月十八，四更', en: 'The eighteenth night of the fifth month' },
  intro: {
    zh: [
      '县城东巷葛家刻字铺夜里起火，烧塌半边。刻工葛三死在灰里。县尉韦衡初检：夜间烛火失慎，烧死。',
      '会子要印，先得有版。刻得出会子版的手艺人，白蘋县只有一个。'
    ],
    en: [
      'In the night the Ge engraving shop in East Lane caught fire and half of it fell in. Ge San, the engraver, died in the ashes. Wei Heng\'s first inquest: a candle left burning at night; burned to death.',
      'To print notes you first need a plate. In all Baipin there is one craftsman who could cut a plate for a note.'
    ]
  },
  outro: {
    zh: [
      '杜明远招认：葛三刻成了会子铜版，却想抽身，要拿着样张去提刑司自首。杜明远奉命去取版灭口，夺刀时被刻刀割了虎口。',
      '可他杀了人，却没拿到版。他放火之前，版架就已经空了——更夫看见的那个穿青色公服、提着灯笼的人，抱走了铜版。杜明远不肯说是谁派他来的，只说：“那人我惹不起。”'
    ],
    en: [
      'Du Mingyuan confesses. Ge San had finished the copper plate for the notes, then wanted out, and meant to take a proof to the intendant\'s office and give himself up. Du Mingyuan was sent to take the plate and silence him, and cut the web of his hand on the engraving knife as they fought for it.',
      'But he killed the man and never got the plate. Before he set the fire the rack was already empty: the man the watchman saw, in a blue-green office robe with a lantern, carried it off. Du will not say who sent him. "That man," he says, "is beyond me."'
    ]
  },
  words: {
    gesan: { kind: 'person', zh: '葛三', en: 'Ge San', is: { role: ['victim', 'form', 'body'], handcut: ['no', 'body'] } },
    xiaoman: { kind: 'person', zh: '小满', en: 'Xiaoman', is: { role: ['apprentice', 'form'], handcut: ['no', 'xiaoman'] } },
    du: { kind: 'person', zh: '杜明远', en: 'Du Mingyuan', is: { role: ['millowner', 'form'], handcut: ['yes', 'du'] } },
    laoguo: { kind: 'person', zh: '老郭', en: 'Old Guo', is: { role: ['watchman', 'form'], handcut: ['no', 'laoguo'] } },
    fenglu: { kind: 'person', zh: '冯禄', en: 'Feng Lu', is: { role: ['clerk', 'form'], handcut: ['no', 'fenglu'] } },
    knife: { kind: 'thing', zh: '刻刀', en: 'engraving knife', is: { weapon: ['yes', 'knives'], clothing: ['no', 'knives'], fits: ['no', 'knives'] } },
    lamp: { kind: 'thing', zh: '油灯', en: 'oil lamp', is: { weapon: ['no', 'lamp'], clothing: ['no', 'lamp'], fits: ['no', 'lamp'] } },
    oiljar: { kind: 'thing', zh: '油罐', en: 'oil jar', is: { weapon: ['no', 'oiljar'], clothing: ['no', 'oiljar'], fits: ['no', 'oiljar'] } },
    plate: { kind: 'thing', zh: '铜版', en: 'copper plate', is: { weapon: ['no', 'rack'], clothing: ['no', 'rack'], fits: ['yes', 'rack'] } },
    proof: { kind: 'thing', zh: '样张', en: 'proof print', is: { weapon: ['no', 'proof'], clothing: ['no', 'proof'], fits: ['no', 'proof'] } },
    robe: { kind: 'thing', zh: '青色公服', en: 'blue-green office robe', is: { weapon: ['no', 'laoguo'], clothing: ['yes', 'laoguo'], fits: ['no', 'laoguo'] } },
    soot: { kind: 'mark', zh: '烟灰', en: 'soot', is: { where: ['mouth', 'body'] } },
    redsoil: { kind: 'mark', zh: '鲜红血土', en: 'bright red earth', is: { where: ['ground', 'ground'] } },
    palmcut: { kind: 'mark', zh: '掌心刀伤', en: 'cut palm', is: { where: ['palm', 'body'] } },
    handcut: { kind: 'mark', zh: '虎口刀口', en: 'cut hand', is: { where: ['hand', 'du'] } },
    fire: { kind: 'cause', zh: '烧死', en: 'burned to death', is: { claimed: ['yes', 'form'] } },
    stabbed: { kind: 'cause', zh: '先刺后烧', en: 'stabbed, then burned', is: { claimed: ['no', 'form'] } },
    corner: { kind: 'place', zh: '墙角油罐处', en: 'corner by the oil jar', is: { firestart: ['yes', 'oiljar'] } },
    desk: { kind: 'place', zh: '案头灯下', en: 'desk by the lamp', is: { firestart: ['no', 'lamp'] } }
  },
  spots: {
    body: {
      kind: 'body',
      title: { zh: '尸身', en: 'The body' },
      text: {
        zh: '死者[[gesan]]，刻工，年四十二，从灰里扒出来，停在门板上。\n老秦撬开口齿看：口鼻里干干净净，没有一点[[soot]]。\n心口有一处刃伤，窄长，两头尖小，皮肉卷凸，四周血荫。左手掌心一道[[palmcut]]，是空手挡刀留下的。\n老秦说：“是[[fire|活活烧死]]，还是[[stabbed]]，看口鼻里有没有烟灰。”',
        en: 'The dead man is [[gesan]], engraver, forty-two, dug out of the ashes and laid on a door.\nOld Qin prises the jaw open: the mouth and nose are clean, without a trace of [[soot]].\nOver the heart is a stab wound, long and narrow and pointed at both ends, the lips of it turned out and bruised all round. Across the left palm is a [[palmcut]], the kind a bare hand takes fending off a blade.\nOld Qin says: "[[fire|Burned alive]], or [[stabbed]]? The mouth and nose will tell, by whether there is soot in them."'
      },
      marks: [
        { side: 'front', x: 0.5, y: 0.105, zh: '口鼻无烟灰', en: 'No soot in mouth or nose' },
        { side: 'front', x: 0.42, y: 0.28, zh: '心口刃伤，窄长，周匝血荫', en: 'Narrow stab wound over the heart, bruised' },
        { side: 'front', x: 0.92, y: 0.53, zh: '左掌挡刀伤', en: 'Left palm cut fending a blade' }
      ]
    },
    ground: {
      kind: 'object',
      title: { zh: '尸首躺过的地', en: 'Where the body lay' },
      text: {
        zh: '老秦把酽米醋泼在尸首躺过的地上。灰土里渐渐渗出[[redsoil]]——人是在这里流的血。',
        en: 'Old Qin pours strong rice vinegar on the ground where the body lay. Slowly [[redsoil]] seeps up through the ash: he bled here.'
      }
    },
    knives: {
      kind: 'object',
      title: { zh: '刻刀', en: 'The knives' },
      text: {
        zh: '案头一卷刻刀，空了一格。那把[[knife]]掉在墙边的水缸里，刃窄而尖，缸底的水泛红。',
        en: 'A roll of engraving knives on the bench, one pocket empty. That [[knife]] lies in the water jar by the wall, narrow and pointed, and the water at the bottom is pink.'
      }
    },
    lamp: {
      kind: 'object',
      title: { zh: '油灯', en: 'The lamp' },
      text: {
        zh: '案头的[[lamp]]好好立着，灯盏里还有半盏油。这一处[[desk]]，是整间屋烧得最轻的地方。',
        en: 'The [[lamp]] on the bench stands upright, still half full of oil. This [[desk]] is the least burned spot in the room.'
      }
    },
    oiljar: {
      kind: 'object',
      title: { zh: '墙角', en: 'The corner' },
      text: {
        zh: '墙角一只[[oiljar]]被砸碎了，地上烧出一大片焦痕，梁柱也是从这里先塌的。火是从这个[[corner]]起的。',
        en: 'In the corner an [[oiljar]] has been smashed. The floor is scorched black in a wide spread, and the beams came down here first. The fire began in this [[corner]].'
      }
    },
    rack: {
      kind: 'object',
      title: { zh: '版架', en: 'The plate rack' },
      text: {
        zh: '版架上一格空着，灰尘围出一个长七寸、阔四寸的方印——原来放着一块[[plate]]。学徒说，这块版谁也不许碰。',
        en: 'One shelf of the rack is empty, and the dust round it outlines a rectangle seven inches by four, where a [[plate]] used to sit. The apprentice says nobody was allowed to touch it.'
      }
    },
    proof: {
      kind: 'object',
      title: { zh: '镇纸下', en: 'Under the paperweight' },
      text: {
        zh: '压在镇纸下的一张[[proof]]，印的是一贯会子的版面，墨色还新。纸边有一行小字：“版成，交青袍。”',
        en: 'Under the paperweight is a [[proof]] of a one-string note, the ink still fresh. In the margin, in small writing: "Plate done. To the blue robe."'
      }
    },
    xiaoman: {
      kind: 'person',
      title: { zh: '少年', en: 'The boy' },
      text: {
        zh: '满脸是灰的少年，两手只有灰，没有伤。他说：“我天亮来上工，铺子已经烧塌了半边。师父这几个月半夜还在刻东西，不许我看。”',
        en: 'A boy with a face full of ash. His hands are grey but unhurt. "I came to work at first light and half the shop had already fallen in," he says. "These last months Master worked at night on something he wouldn\'t let me see."'
      }
    },
    du: {
      kind: 'person',
      title: { zh: '胖子', en: 'The stout man' },
      text: {
        zh: '胖胖的中年人，穿褐色绸袍，坐着自家的小轿来的。他说：“我来取订好的纸版，哪知道……”\n他右手虎口有一道新的[[handcut]]，用帕子裹着。',
        en: 'A stout man in a brown silk robe, come in his own little sedan chair. "I came to collect some printing blocks I had ordered," he says, "and found this…"\nThere is a fresh [[handcut]] across the web of his right hand, wrapped in a handkerchief.'
      }
    },
    laoguo: {
      kind: 'person',
      title: { zh: '提梆子的老人', en: 'The old man with the clapper' },
      text: {
        zh: '提着梆子的老人，手上没有伤。他说：“三更我打梆子经过，铺子门口停着一顶小轿。四更再过，铺子已经起火，有个穿[[robe]]、提着灯笼的人，从后巷走了，怀里抱着个方方的布包。”',
        en: 'An old man with a wooden clapper; his hands are unhurt. "I passed in the third watch, beating the hour," he says, "and a little sedan chair was waiting at the door. In the fourth watch the shop was on fire, and a man in a [[robe]], carrying a lantern, went off down the back lane with something square wrapped in cloth under his arm."'
      }
    },
    fenglu: {
      kind: 'person',
      title: { zh: '押司', en: 'The clerk' },
      text: {
        zh: '押司提着一盏灯笼，替县尉记录。他说：“葛三好酒，夜里点灯刻字，迟早要出事。”\n他手上只有墨，没有伤。',
        en: 'The clerk holds a lantern and takes notes for the sheriff. "Ge San drank," he says. "Carving by lamplight at night, it was bound to happen."\nHis hands have ink on them and no wound.'
      }
    },
    form: {
      kind: 'doc',
      title: { zh: '初检格目', en: 'The first inquest form' },
      text: {
        zh: '白蘋县尉司初检格目，盈字第二十六号。\n死者：刻工[[gesan]]，年四十二。\n在场：学徒[[xiaoman]]，年十五；更夫[[laoguo]]，年六十；纸坊主[[du]]，次日方到。\n初检：夜间烛火失慎，[[fire]]。县尉韦衡押。书填：押司[[fenglu]]。',
        en: 'Baipin sheriff\'s office, first inquest form, number Ying 26.\nDeceased: [[gesan]], engraver, aged 42.\nPresent: [[xiaoman]], apprentice, 15; [[laoguo]], night watchman, 60; [[du]], paper mill owner, arrived the next day.\nFinding: a candle left burning at night; [[fire]]. Signed, Wei Heng, sheriff. Written out by [[fenglu]], clerk.'
      }
    }
  },
  pages: [
    {
      id: 'names',
      names: true,
      title: { zh: '人物', en: 'People' },
      portraits: [
        { id: 'xiaoman', answer: 'xiaoman', needs: { role: 'apprentice' }, why: { zh: '十五岁的是学徒。他叫什么？', en: 'The fifteen-year-old is the apprentice. What is he called?' } },
        { id: 'du', answer: 'du', needs: { role: 'millowner' }, why: { zh: '订纸版的人，是做什么营生的？', en: 'A man who orders printing blocks: what trade is he in?' } },
        { id: 'laoguo', answer: 'laoguo', needs: { role: 'watchman' }, why: { zh: '提梆子打更的，格目里叫什么？', en: 'He beats the watches with a clapper. What does the form call the watchman?' } },
        { id: 'fenglu', answer: 'fenglu', needs: { role: 'clerk' }, why: { zh: '替县尉记录的是谁？', en: 'Who takes notes for the sheriff?' } }
      ]
    },
    {
      id: 'p1',
      title: { zh: '他怎么死的', en: 'How he died' },
      text: {
        zh: '{{b1}}不是{{b2}}的：他口鼻里没有{{b3}}，身下泼醋的地上渗出{{b4}}。他是先被{{b5}}刺中心口，火是后来从{{b6}}烧起来的。',
        en: '{{b1}} was not {{b2}}. There is no {{b3}} in his mouth or nose, and vinegar on the ground beneath him brought up {{b4}}. He was stabbed through the heart with an {{b5}} first; the fire was started later, at the {{b6}}.'
      },
      blanks: {
        b1: { answer: 'gesan', needs: { role: 'victim' }, why: { zh: '死的是谁？', en: 'Who is the dead man?' } },
        b2: { answer: 'fire', needs: { claimed: 'yes' }, why: { zh: '初检说他是怎么死的？', en: 'How did the first inquest say he died?' } },
        b3: { answer: 'soot', needs: { where: 'mouth' }, why: { zh: '活着被烧的人，口鼻里会有什么？', en: 'What would a man burned alive have in his mouth and nose?' } },
        b4: { answer: 'redsoil', needs: { where: 'ground' }, why: { zh: '泼醋之后，地上现出了什么？', en: 'What showed on the ground after the vinegar?' } },
        b5: { answer: 'knife', needs: { weapon: 'yes' }, why: { zh: '伤口窄长、两头尖小。什么刃器？', en: 'The wound is narrow and pointed at both ends. What blade?' } },
        b6: { answer: 'corner', needs: { firestart: 'yes' }, why: { zh: '哪里烧得最重、最先塌？', en: 'Where did it burn worst and fall in first?' } }
      }
    },
    {
      id: 'p2',
      title: { zh: '那一夜的两个人', en: 'Two visitors that night' },
      text: {
        zh: '{{b7}}三更乘轿来过，他右手虎口那道新刀口，是夺刀时割的。四更时，又有一个穿{{b8}}、提着灯笼的人，从后巷抱走了{{b9}}——版架上空出的那一格，正是它的大小。',
        en: '{{b7}} came by chair in the third watch; the fresh cut in the web of his hand came from fighting for the knife. In the fourth watch another man, in a {{b8}} and carrying a lantern, went off down the back lane with the {{b9}}. The empty shelf on the rack is exactly its size.'
      },
      blanks: {
        b7: { answer: 'du', needs: { handcut: 'yes' }, why: { zh: '谁的手上有新刀口？', en: 'Whose hand has a fresh cut?' } },
        b8: { answer: 'robe', needs: { clothing: 'yes' }, why: { zh: '更夫说那人穿着什么？', en: 'What did the watchman say the man was wearing?' } },
        b9: { answer: 'plate', needs: { fits: 'yes' }, why: { zh: '版架上少了什么？', en: 'What is missing from the rack?' } }
      }
    }
  ]
};
