// 第六案「县尉书房」：县尉确是自缢，桌上的认罪书却是别人替他写的。最后一卷要玩家亲手写判词。
// 依据《洗冤集录》卷三「自缢」：真自缢者痕起耳后，八字不交，舌抵齿或出，胸前有涎沫；所缢处楣梁尘土滚乱至多方是；
// 若经泥雨，须看踏上处有无印下脚迹。卷一：凡检验，须问其家，体访事因，不可凭一二人口说。
// Case six, "The Sheriff's Study": the sheriff truly hanged himself, but the confession on his desk was written by
// someone else. The last scroll asks the player to write the verdict in their own words. From the same book: a true
// hanging leaves a mark rising behind the ears that does not cross, the tongue pressed to the teeth or out, froth on
// the chest; the beam's dust is scuffed all over; after rain, look for footprints on what he stood on.

export default {
  id: 'c6',
  scroll: 3,
  title: { zh: '县尉书房', en: 'The Sheriff\'s Study' },
  place: { zh: '白蘋县 · 县尉司书房', en: 'Baipin County · the sheriff\'s study' },
  time: { zh: '六月初七，夜', en: 'The night of the seventh day of the sixth month' },
  intro: {
    zh: [
      '县尉韦衡死在自己的书房里，吊在梁上。押司冯禄三更来送公文，第一个发现。书案上摊着一份认罪书。',
      '五份格目，五个死人，都是这个人签的押。如今他也死了。'
    ],
    en: [
      'Wei Heng, the sheriff, is dead in his own study, hanging from the beam. Feng Lu, the clerk, came with papers in the third watch and found him. On the desk lies a confession.',
      'Five forms, five dead, every one of them signed by this man. Now he is dead too.'
    ]
  },
  outro: {
    zh: [
      '冯禄进书房时，韦衡已经死了。他把那半封真遗书丢进火盆，照着自己代填格目的笔路，写了一份认罪书，好让所有罪名都落在一个死人身上。',
      '他没想到，一个人的砚台干了，是写不出一份墨迹未干的信的。'
    ],
    en: [
      'When Feng Lu came into the study, Wei Heng was already dead. He threw the half of the real letter into the brazier and wrote a confession in the same hand he used for the forms, so that every crime would fall on a dead man.',
      'He did not think that a man whose inkstone is dry cannot write a letter whose ink is wet.'
    ]
  },
  ending: {
    zh: [
      '沈砚连夜带弓手围了广裕质库，在后堂夹壁里起出会子铜版两块、楮纸三百张、未用的假会子一千二百贯。陆承恩、冯禄下狱，依律论罪。',
      '六份覆检格目，连同韦衡那半封残信的抄本，一并呈送朝省。格目末尾，沈砚添了一行：初检不实，致冤者五。',
      '洗冤笔录，至此合卷。'
    ],
    en: [
      'That night Shen Yan surrounds the Guangyu pawnshop with constables. From behind a false wall in the back hall they bring out two copper note plates, three hundred sheets of mulberry paper and twelve hundred strings in forged notes never spent. Lu Cheng\'en and Feng Lu go to prison, to be judged by the law.',
      'The six second-inquest forms, with a copy of Wei Heng\'s half-burned letter, go up to the court. At the foot of the forms Shen Yan adds one line: The first inquests were false, and five were wronged by them.',
      'The Inquest Scrolls are rolled up.'
    ]
  },
  // The verdict is written, not filled in. A name counts if any of its spellings appears; the charges need two of
  // the three groups. Matching ignores case, spaces and punctuation.
  verdict: {
    title: { zh: '判词', en: 'The verdict' },
    prompt: {
      zh: '亲手写下判词：主使者是谁，同谋是谁，犯的是什么罪。',
      en: 'Write the verdict in your own words: who was behind it, who helped, and what they did.'
    },
    fields: [
      { id: 'chief', label: { zh: '主使', en: 'Behind it' }, accept: ['陆承恩', '承恩', 'luchengen', 'lucheng\'en', "lucheng'en", 'chengen'] },
      { id: 'partner', label: { zh: '同谋', en: 'Helped by' }, accept: ['冯禄', '冯押司', 'fenglu'] },
      {
        id: 'crimes',
        label: { zh: '罪名', en: 'Crimes' },
        multiline: true,
        groups: [
          ['伪造会子', '假会子', '私造会子', '造会子', '伪钞', 'counterfeit', 'forgednote', 'forgingnote', 'fakenote', 'forgery'],
          ['杀人', '灭口', '谋杀', '指使', '害命', '杀', 'murder', 'kill', 'silenc'],
          ['格目', '检验', '初检', '验尸', '不实', 'inquest', 'form', 'record', 'report', 'coverup', 'cover']
        ],
        need: 2
      }
    ],
    // Characters for the board a player taps when the platform has no text field (a mini game): every character the
    // answers need, and as many that lead nowhere.
    board: {
      zh: '陆承恩冯禄韦衡杜明远郑七钱五孙大屠二伪造会子杀人灭口格目不实检验谋财私铸铜版纸坊质库押司县尉',
      en: ['Lu Cheng\'en', 'Feng Lu', 'Wei Heng', 'Du Mingyuan', 'Zheng Qi', 'counterfeit notes', 'murder', 'false inquests', 'bribery', 'smuggling']
    },
    wrong: { zh: '判词尚有不实之处。再看看你收集的证据。', en: 'Something in the verdict is not true. Look again at what you have found.' }
  },
  words: {
    weiheng: { kind: 'person', zh: '韦衡', en: 'Wei Heng', is: { role: ['victim', 'body'], present: ['yes', 'gatelog'], inkfingers: ['no', 'body'], mastermind: ['no', 'brazier'] } },
    fenglu: { kind: 'person', zh: '冯禄', en: 'Feng Lu', is: { role: ['clerk', 'gatelog'], present: ['yes', 'gatelog'], inkfingers: ['yes', 'fenglu'], mastermind: ['no', 'brazier'] } },
    weifuren: { kind: 'person', zh: '韦夫人', en: 'Lady Wei', is: { role: ['wife', 'gatelog'], present: ['yes', 'gatelog'], inkfingers: ['no', 'weifuren'], mastermind: ['no', 'brazier'] } },
    liuzhong: { kind: 'person', zh: '刘忠', en: 'Liu Zhong', is: { role: ['gatekeeper', 'gatelog'], present: ['yes', 'gatelog'], inkfingers: ['no', 'liuzhong'], mastermind: ['no', 'brazier'] } },
    lu: { kind: 'person', zh: '陆承恩', en: 'Lu Cheng\'en', is: { role: ['pawnbroker', 'brazier'], present: ['no', 'gatelog'], mastermind: ['yes', 'brazier'] } },
    confession: { kind: 'thing', zh: '认罪书', en: 'confession', is: { use: ['writing', 'desk'], wet: ['yes', 'desk'] } },
    inkstone: { kind: 'thing', zh: '砚台', en: 'inkstone', is: { use: ['grinding', 'inkstone'], wet: ['no', 'inkstone'] } },
    letter: { kind: 'thing', zh: '残信', en: 'half-burned letter', is: { use: ['writing', 'brazier'], wet: ['no', 'brazier'] } },
    forms: { kind: 'thing', zh: '格目副本', en: 'copies of the forms', is: { use: ['record', 'shelf'], wet: ['no', 'shelf'] } },
    eightsplay: { kind: 'mark', zh: '八字不交', en: 'not crossing', is: { where: ['neck', 'body'] } },
    dust: { kind: 'mark', zh: '尘土滚乱', en: 'scuffed dust', is: { where: ['beam', 'beam'] } },
    footprint: { kind: 'mark', zh: '泥鞋印', en: 'muddy footprints', is: { where: ['bench', 'bench'] } },
    inkfingers: { kind: 'mark', zh: '指上新墨', en: 'fresh ink on the fingers', is: { where: ['fingers', 'fenglu'] } },
    wetink: { kind: 'mark', zh: '墨迹未干', en: 'wet ink', is: { where: ['paper', 'desk'] } },
    hanged: { kind: 'cause', zh: '自缢', en: 'hanged himself', is: { true: ['yes', 'body'] } },
    strangled: { kind: 'cause', zh: '被勒死', en: 'strangled', is: { true: ['no', 'body'] } },
    brazier: { kind: 'place', zh: '火盆', en: 'brazier', is: { burnt: ['yes', 'brazier'] } },
    desk: { kind: 'place', zh: '书案', en: 'desk', is: { burnt: ['no', 'desk'] } },
    counterfeit: { kind: 'motive', zh: '伪造会子', en: 'forging notes', is: {} }
  },
  spots: {
    body: {
      kind: 'body',
      title: { zh: '尸身', en: 'The body' },
      text: {
        zh: '县尉[[weiheng]]，年四十六，从梁上解下，停在榻前。\n项下一道痕，斜起耳后，[[eightsplay]]，紫赤，有血荫。舌尖抵齿，面带紫赤，胸前有涎沫。两手握拳，指甲干净，指上没有墨。\n项后没有交匝的痕，身上也没有抓伤。',
        en: 'Sheriff [[weiheng]], forty-six, cut down from the beam and laid before the couch.\nOne mark on the neck, slanting up behind the ears and [[eightsplay]], purple-red and bruised. The tip of his tongue presses his teeth, his face is flushed purple, there is froth on his chest. His hands are clenched, his nails clean, no ink on his fingers.\nThere is no mark crossing at the nape, and no scratch on him anywhere.'
      },
      marks: [
        { side: 'front', x: 0.5, y: 0.16, zh: '痕起耳后，八字不交', en: 'Mark rises behind the ears, does not cross' },
        { side: 'front', x: 0.5, y: 0.1, zh: '舌抵齿，面紫赤', en: 'Tongue to teeth, face flushed' },
        { side: 'front', x: 0.5, y: 0.27, zh: '胸前涎沫', en: 'Froth on the chest' },
        { side: 'back', x: 0.5, y: 0.13, zh: '项后无交匝', en: 'Nothing crosses at the nape' }
      ]
    },
    beam: {
      kind: 'object',
      title: { zh: '梁上', en: 'The beam' },
      text: {
        zh: '梁上的灰蹭得[[dust|滚乱一片]]，好几道绳痕叠在一起，是人自己踩上去、攀着梁系绳留下的。',
        en: 'The dust on the beam is [[dust|scuffed everywhere]], several rope lines laid over one another: the marks of a man who climbed up himself and tied the cord to the beam.'
      }
    },
    bench: {
      kind: 'object',
      title: { zh: '梁下的方凳', en: 'The stool under the beam' },
      text: {
        zh: '梁下一张方凳，高二尺。凳面上留着两个[[footprint]]，泥色与县尉靴底的一样。他二更从渡口回来，靴上有泥。',
        en: 'A square stool under the beam, two feet high. On its seat are two [[footprint]], the same mud as on the sheriff\'s boots. He came back from the ferry in the second watch with mud on them.'
      }
    },
    desk: {
      kind: 'object',
      title: { zh: '书案', en: 'The desk' },
      text: {
        zh: '[[desk]]上摊着一份[[confession]]，小楷工整：“罪官韦衡，独自[[counterfeit]]，杀人灭口，与他人无涉。”\n[[wetink]]，指头一按就花。末尾没有押字——县尉签过的每一份格目，都押着一个飞鹤样的押字。',
        en: 'On the [[desk]] lies a [[confession]] in a neat small hand: "I, Wei Heng, alone was guilty of [[counterfeit]] and of murder to keep it hidden. No one else had a part."\nThe [[wetink]] smears under a fingertip. There is no signature mark at the end. Every form the sheriff ever signed bears his mark, a flying crane.'
      }
    },
    inkstone: {
      kind: 'object',
      title: { zh: '砚台', en: 'The inkstone' },
      text: {
        zh: '县尉的[[inkstone]]早就干透了，墨锭也是干的，笔架上的笔毫硬结。今夜他没有写过一个字。',
        en: 'The sheriff\'s [[inkstone]] is dry through, the inkstick dry too, and the brushes on the rack stiff. He wrote nothing tonight.'
      }
    },
    brazier: {
      kind: 'object',
      title: { zh: '火盆', en: 'The brazier' },
      text: {
        zh: '[[brazier]]里压着半封没烧完的[[letter|信]]，是县尉的笔迹，押着飞鹤：\n“……吾受[[lu]]质库之债，许其所为……冯禄代填格目，受陆驱使……孙大、钱五、郑七、杜明远、屠二，皆其所使……会子铜版今藏陆氏质库夹壁……家人皆不知……吾悔之无及……”\n后半截烧没了。',
        en: 'In the [[brazier]] lies [[letter|half a letter]], not burned through, in the sheriff\'s hand and signed with the flying crane:\n"… in debt to [[lu]]\'s pawnshop, I let him do as he would … Feng Lu filled in the forms, at Lu\'s bidding … Sun Da, Qian Wu, Zheng Qi, Du Mingyuan, Tu Er, all his creatures … the note plates are hidden behind a false wall in Lu\'s pawnshop … my household knows nothing … my regret is past mending …"\nThe rest has burned.'
      }
    },
    shelf: {
      kind: 'object',
      title: { zh: '书架', en: 'The shelf' },
      text: {
        zh: '书架上一摞[[forms]]，五起案子的格目都在。字迹一模一样，都是押司的手笔；押字却是县尉的飞鹤。',
        en: 'On the shelf is a stack of [[forms]], all five cases. The writing is the same throughout, the clerk\'s hand; the signature mark is the sheriff\'s flying crane.'
      }
    },
    gatelog: {
      kind: 'doc',
      title: { zh: '门簿', en: 'The gate book' },
      text: {
        zh: '县尉司门簿，门子[[liuzhong]]记：\n二更：县尉[[weiheng]]自渡口回，靴上有泥，入书房，闩门。\n三更：押司[[fenglu]]提灯笼入，称送公文。门闩着，押司在窗外喊人。\n三更二点：门子撞门。押司先入。门子去请夫人[[weifuren]]。\n本夜再无外人出入。',
        en: 'Gate book of the sheriff\'s office, kept by the gatekeeper, [[liuzhong]]:\nSecond watch: the sheriff, [[weiheng]], back from the ferry, mud on his boots; into the study; bars the door.\nThird watch: the clerk, [[fenglu]], comes in with a lantern, saying he brings papers. The door is barred; the clerk calls for help at the window.\nThird watch, second mark: the gatekeeper breaks the door. The clerk goes in first. The gatekeeper fetches the lady, [[weifuren]].\nNo one else came in or out that night.'
      }
    },
    fenglu: {
      kind: 'person',
      title: { zh: '押司', en: 'The clerk' },
      text: {
        zh: '押司，青色公服。他说：“小人三更来送公文，门闩着，从窗缝看见大人吊在梁上，这才喊人。桌上有大人的认罪书……大人是[[hanged|畏罪自缢]]。”\n他右手食指、中指上沾着[[inkfingers|新墨]]，还没干。',
        en: 'The clerk, in his blue-green office robe. "I came with papers in the third watch," he says. "The door was barred, and through the window I saw His Honour hanging from the beam, so I called for help. His confession is on the desk … he [[hanged]], for fear of what he had done."\nThe first two fingers of his right hand have [[inkfingers]] on them, not yet dry.'
      }
    },
    weifuren: {
      kind: 'person',
      title: { zh: '夫人', en: 'The lady' },
      text: {
        zh: '县尉夫人，泪流满面，手上干干净净。她说：“老爷这几日吃不下饭，前夜对着火盆坐了半宿，说‘对不住那几个人’……可他不会寻短见！一定是有人把他[[strangled|勒死]]了！”',
        en: 'The sheriff\'s wife, in tears; her hands are clean. "He hasn\'t eaten for days," she says. "The night before last he sat up half the night staring into the brazier and said, ‘I have wronged those men.\' … But he would never take his own life! Someone [[strangled]] him!"'
      }
    },
    liuzhong: {
      kind: 'person',
      title: { zh: '门子', en: 'The gatekeeper' },
      text: {
        zh: '年近六十的门子，手上只有老茧。他说：“我撞开门，押司先进去，叫我去请夫人。我和夫人回来时，押司正站在书案边，火盆里的火也比先前旺了。”',
        en: 'The gatekeeper, nearly sixty, with nothing on his hands but calluses. "I broke the door, and the clerk went in first and sent me for the lady," he says. "When the lady and I came back, the clerk was standing by the desk, and the brazier was burning higher than before."'
      }
    }
  },
  pages: [
    {
      id: 'names',
      names: true,
      title: { zh: '人物', en: 'People' },
      portraits: [
        { id: 'fenglu', answer: 'fenglu', needs: { role: 'clerk' }, why: { zh: '门簿里，三更进来送公文的是谁？', en: 'In the gate book, who came with papers in the third watch?' } },
        { id: 'weifuren', answer: 'weifuren', needs: { role: 'wife' }, why: { zh: '门子去请的是谁？', en: 'Who did the gatekeeper go to fetch?' } },
        { id: 'liuzhong', answer: 'liuzhong', needs: { role: 'gatekeeper' }, why: { zh: '门簿是谁记的？', en: 'Who keeps the gate book?' } }
      ]
    },
    {
      id: 'p1',
      title: { zh: '他是怎么死的', en: 'How he died' },
      text: {
        zh: '{{b1}}确是{{b2}}：项下的痕起于耳后，{{b3}}；梁上{{b4}}；凳面上留着他自己的{{b5}}。',
        en: '{{b1}} truly {{b2}}. The mark on his neck rises behind the ears, {{b3}}; the beam shows {{b4}}; and on the stool are his own {{b5}}.'
      },
      blanks: {
        b1: { answer: 'weiheng', needs: { role: 'victim' }, why: { zh: '死的是谁？', en: 'Who is the dead man?' } },
        b2: { answer: 'hanged', needs: { true: 'yes' }, why: { zh: '痕在哪里交？有没有抓伤？验出来是哪一种死法？', en: 'Where does the mark cross, and is he scratched? Which death do the signs show?' } },
        b3: { answer: 'eightsplay', needs: { where: 'neck' }, why: { zh: '颈上的痕是什么样子？', en: 'What does the neck mark look like?' } },
        b4: { answer: 'dust', needs: { where: 'beam' }, why: { zh: '梁上的灰怎么了？', en: 'What has happened to the dust on the beam?' } },
        b5: { answer: 'footprint', needs: { where: 'bench' }, why: { zh: '凳面上留下了什么？', en: 'What is left on the stool?' } }
      }
    },
    {
      id: 'p2',
      title: { zh: '两封信', en: 'Two letters' },
      text: {
        zh: '桌上那份{{b6}}墨迹未干，却没有县尉的押字，他自己的{{b7}}早已干透。三更进过书房、指上沾着新墨的{{b8}}，才是写它的人。真正的遗书被丢进了{{b9}}，残页上写着：主使这一切的，是{{b10}}。',
        en: 'The {{b6}} on the desk is still wet and bears no signature mark, while the sheriff\'s own {{b7}} is bone dry. The one who wrote it is {{b8}}, who came into the study in the third watch and has fresh ink on his fingers. The real last letter went into the {{b9}}, and what remains of it says the man behind all of this is {{b10}}.'
      },
      blanks: {
        b6: { answer: 'confession', needs: { use: 'writing', wet: 'yes' }, why: { zh: '桌上哪一份东西的墨还是湿的？', en: 'Which paper on the desk still has wet ink?' } },
        b7: { answer: 'inkstone', needs: { use: 'grinding' }, why: { zh: '一个人要写字，先得磨什么？它是湿是干？', en: 'What must a man wet before he can write, and is it wet?' } },
        b8: { answer: 'fenglu', needs: { present: 'yes', inkfingers: 'yes' }, why: { zh: '谁的手指上有没干的墨？', en: 'Whose fingers have ink that is not yet dry?' } },
        b9: { answer: 'brazier', needs: { burnt: 'yes' }, why: { zh: '那半封信是从哪里找到的？', en: 'Where was the half letter found?' } },
        b10: { answer: 'lu', needs: { mastermind: 'yes' }, why: { zh: '残信里，县尉说自己欠了谁的债？', en: 'In the letter, whom does the sheriff say he was in debt to?' } }
      }
    }
  ]
};
