// 第二案「渡口浮尸」：艄公被他物打死后推入水中，初检写成酒醉落水。
// 依据《洗冤集录》卷三「溺死」：被打杀推在水内者，肚皮不胀，口眼耳鼻无水沥，指爪罅缝并无沙泥，两手不拳缩；
// 卷四「验他物及手足伤死」：他物打着其痕方圆，周匝有血荫方是生前打损。
// Case two, "The Body at the Ferry": a ferryman struck dead and pushed into the river, written down as a drunk who fell
// in. From the same book: a man beaten to death and then put in the water has a flat belly, no water at the mouth or
// nose, no sand under the nails and open hands; a blow from a hard object leaves a round mark, and a bruise all
// round it shows it was struck while he lived.

export default {
  id: 'c2',
  scroll: 1,
  title: { zh: '渡口浮尸', en: 'The Body at the Ferry' },
  place: { zh: '白蘋县 · 苇渡', en: 'Baipin County · Reed Ferry' },
  time: { zh: '四月十二，三更', en: 'The twelfth night of the fourth month' },
  intro: {
    zh: [
      '白蘋县申状：苇渡艄公老何，四月十二夜酒醉失足，落水渰死。县尉韦衡初检。',
      '纸坊的案子刚结，这份格目里又出现了杜家纸坊的名字：岸边码着的，正是杜家的纸捆。'
    ],
    en: [
      'Baipin County reports: Old He, the ferryman at Reed Ferry, fell into the river drunk on the night of the twelfth of the fourth month and drowned. First inquest by Wei Heng, sheriff.',
      'The mill case is barely closed, and the Du paper mill turns up again in this form: the bales stacked on the bank are Du paper.'
    ]
  },
  outro: {
    zh: [
      '钱五招认：老何收了他一张会子，答应连夜运纸过河；上了船，老何抽出一张纸对着灯看，看见了暗纹，不肯再运。钱五抡起秤砣，砸在他脑后，又把人推进芦苇丛。',
      '纸是从杜家纸坊运去县城的，交给城里的广裕质库，银子由质库付。那张印色发灰的会子，也是质库支给他的。'
    ],
    en: [
      'Qian Wu confesses. Old He took a note from him and agreed to carry the paper across that night. On the boat Old He drew out a sheet and held it to the lamp, saw the hidden marks, and refused to go on. Qian Wu swung his steelyard weight into the back of his head and pushed him into the reeds.',
      'The paper went from the Du mill to the county town, to the Guangyu pawnshop, which paid in silver. The note with the greyish seal came from the same pawnshop.'
    ]
  },
  words: {
    laohe: { kind: 'person', zh: '老何', en: 'Old He', is: { role: ['victim', 'form', 'body'], alive: ['no', 'body'] } },
    hesao: { kind: 'person', zh: '何嫂', en: 'Mrs He', is: { role: ['wife', 'form'], alive: ['yes', 'hesao'], wetshoes: ['no', 'hesao'] } },
    qianwu: { kind: 'person', zh: '钱五', en: 'Qian Wu', is: { role: ['trader', 'form'], alive: ['yes', 'qianwu'], wetshoes: ['yes', 'qianwu'] } },
    zhangpo: { kind: 'person', zh: '张婆', en: 'Granny Zhang', is: { role: ['teaseller', 'form'], alive: ['yes', 'zhangpo'], wetshoes: ['no', 'zhangpo'] } },
    weiheng: { kind: 'person', zh: '韦衡', en: 'Wei Heng', is: { role: ['sheriff', 'form'], alive: ['yes', 'weiheng'], wetshoes: ['no', 'weiheng'] } },
    weight: { kind: 'thing', zh: '秤砣', en: 'steelyard weight', is: { heavy: ['yes', 'qianwu'], round: ['yes', 'qianwu'], cargo: ['no', 'qianwu'], money: ['no', 'qianwu'] } },
    pole: { kind: 'thing', zh: '竹篙', en: 'punt pole', is: { heavy: ['yes', 'boat'], round: ['no', 'boat'], cargo: ['no', 'boat'], money: ['no', 'boat'] } },
    gourd: { kind: 'thing', zh: '酒葫芦', en: 'wine gourd', is: { heavy: ['no', 'gourd'], cargo: ['no', 'gourd'], money: ['no', 'gourd'] } },
    bales: { kind: 'thing', zh: '纸捆', en: 'paper bales', is: { heavy: ['yes', 'bales'], round: ['no', 'bales'], cargo: ['yes', 'bales'], money: ['no', 'bales'] } },
    fakenote: { kind: 'thing', zh: '假会子', en: 'forged note', is: { heavy: ['no', 'purse'], cargo: ['no', 'purse'], money: ['yes', 'purse'] } },
    headwound: { kind: 'mark', zh: '脑后伤', en: 'head wound', is: { where: ['head', 'body'] } },
    hair: { kind: 'mark', zh: '灰白头发', en: 'grey hairs', is: { where: ['hook', 'qianwu'] } },
    hiddenmark: { kind: 'mark', zh: '暗纹', en: 'hidden marks', is: { where: ['paper', 'bales'] } },
    drowned: { kind: 'cause', zh: '落水渰死', en: 'drowned', is: { claimed: ['yes', 'form'] } },
    struck: { kind: 'cause', zh: '被打后入水', en: 'struck and thrown in', is: { claimed: ['no', 'form'] } },
    boat: { kind: 'place', zh: '渡船', en: 'ferry boat', is: { blood: ['yes', 'boat'] } },
    reeds: { kind: 'place', zh: '芦苇丛', en: 'reed bed', is: { blood: ['no', 'body'] } }
  },
  spots: {
    body: {
      kind: 'body',
      title: { zh: '尸身', en: 'The body' },
      text: {
        zh: '死者[[laohe]]，苇渡艄公，年五十三。卯时被人从[[reeds]]里捞起，停在岸边。那片芦苇丛的水是清的，没有血。\n他肚腹不胀，拍之不响；口鼻里没有水沫；十指甲缝干干净净，没有一粒沙泥；两手散开，不曾拳握。\n脑后有一处[[headwound]]，方圆一寸二分，紫黯微肿，四周有血荫。\n老秦说：“活着落水的，和[[struck]]的，口鼻、指甲、肚腹都不一样。”',
        en: 'The dead man is [[laohe]], the ferryman at Reed Ferry, fifty-three. He was pulled from the [[reeds]] at dawn and laid on the bank. The water there is clear; there is no blood in it.\nHis belly is flat and does not sound when tapped. There is no froth at his mouth or nose. The nails of all ten fingers are clean, without a grain of sand. His hands are open, not clenched.\nOn the back of his head is a [[headwound]], round, an inch across, dark and slightly swollen, with a bruise all round it.\nOld Qin says: "A man who goes into the water alive and a man [[struck]] are not alike at the mouth, the nails or the belly."'
      },
      marks: [
        { side: 'front', x: 0.5, y: 0.105, zh: '口鼻无水沫', en: 'No froth at mouth or nose' },
        { side: 'front', x: 0.5, y: 0.36, zh: '肚腹不胀', en: 'Belly not swollen' },
        { side: 'front', x: 0.08, y: 0.53, zh: '甲缝无沙泥，两手不拳', en: 'No sand under nails; hands open' },
        { side: 'back', x: 0.5, y: 0.05, zh: '脑后方圆伤，周匝血荫', en: 'Round wound at the back of the head, bruised all round' }
      ]
    },
    gourd: {
      kind: 'object',
      title: { zh: '酒葫芦', en: 'The wine gourd' },
      text: {
        zh: '老何的[[gourd]]挂在船头，塞子封着，满满一壶，一口没动。竹皮包着，拎在手里轻飘飘的。',
        en: 'Old He\'s [[gourd]] hangs at the bow, still stoppered and full; not a mouthful has been drunk. It is wrapped in bamboo skin and weighs almost nothing.'
      }
    },
    boat: {
      kind: 'object',
      title: { zh: '渡船', en: 'The ferry boat' },
      text: {
        zh: '老何的[[boat]]系在岸边。船板缝里有一摊擦过的血，上面压着一张新草席。\n[[pole]]好好地插在船头，篙头包铁，是尖的。',
        en: 'Old He\'s [[boat]] is tied at the bank. In the gaps of the planks is a smear of blood that someone has wiped, with a new straw mat laid over it.\nThe [[pole]] stands upright at the bow. Its iron tip is pointed.'
      }
    },
    bales: {
      kind: 'object',
      title: { zh: '纸捆', en: 'The bales' },
      text: {
        zh: '岸边码着六个[[bales]]，方方正正，封条上写着“杜家纸坊”。\n其中一捆的封条被撕开了。抽一张对着天光看，纸里有[[hiddenmark]]，和官府印会子的纸一模一样。',
        en: 'Six [[bales]] are stacked on the bank, square and tight, sealed with slips that read "Du paper mill".\nOne seal has been torn. Hold a sheet up to the sky and there are [[hiddenmark]] in it, exactly like the paper the government prints its notes on.'
      }
    },
    qianwu: {
      kind: 'person',
      title: { zh: '纸商', en: 'The paper trader' },
      text: {
        zh: '穿细绢短袍的年轻人。他说：“我昨夜宿在镇上客店，今早来等船，才知道出了事。”\n他腰间挂着一杆秤，[[weight]]是圆底的铁坨，沉甸甸的；铜钩缝里卡着两根[[hair]]。他的鞋帮湿到脚踝。',
        en: 'A young man in a short coat of fine silk. "I slept at the inn in town last night," he says. "I came to wait for the boat this morning and only then heard what had happened."\nA steelyard hangs at his belt. The [[weight]] is a round-bottomed iron lump, heavy in the hand, and two [[hair]] are caught in the crack of its brass hook. His shoes are wet up to the ankle.'
      }
    },
    zhangpo: {
      kind: 'person',
      title: { zh: '茶摊婆婆', en: 'The tea seller' },
      text: {
        zh: '渡口摆茶摊的老婆婆，鞋是干的。她说：“三更天我起夜，听见渡口‘咚’的一声，有个后生说‘多给你一贯，别多嘴’。后来就是好大的水响。”',
        en: 'The old woman who keeps the tea stall at the ferry. Her shoes are dry. "I got up in the third watch," she says, "and heard a thump down at the ferry, and a young man saying, ‘I\'ll give you a string more. Keep your mouth shut.\' Then a great splash."'
      }
    },
    hesao: {
      kind: 'person',
      title: { zh: '艄公的妻子', en: 'The ferryman\'s wife' },
      text: {
        zh: '眼睛哭肿了的妇人，鞋是干的。她说：“我男人半年前就戒了酒，大夫说他肝不好。昨夜有客要连夜过河，给的钱多，他就去了。”',
        en: 'A woman with eyes swollen from weeping. Her shoes are dry. "My husband gave up drink half a year ago," she says. "The doctor said his liver was bad. Last night a customer wanted to cross after dark and paid well, so he went."'
      }
    },
    weiheng: {
      kind: 'person',
      title: { zh: '县尉', en: 'The sheriff' },
      text: {
        zh: '白蘋县尉，穿绿色官袍，官靴上一点泥也没有。他说：“艄公吃醉了掉进河里，年年都有。提刑大人何必劳神。”',
        en: 'The Baipin sheriff, in a green official robe, his boots without a speck of mud. "Every year some ferryman drinks and falls in," he says. "Your Honour need not trouble yourself."'
      }
    },
    purse: {
      kind: 'object',
      title: { zh: '钱袋', en: 'The purse' },
      text: {
        zh: '老何的钱袋里有几十文铜钱，还有一张新的[[fakenote]]。面额一贯，印色发灰，朱印歪了半分。',
        en: 'Old He\'s purse holds a few dozen copper cash and a new [[fakenote]], one string in value. The ink of its seals is greyish and the red seal sits a little crooked.'
      }
    },
    form: {
      kind: 'doc',
      title: { zh: '初检格目', en: 'The first inquest form' },
      text: {
        zh: '白蘋县尉司初检格目，盈字第十四号。\n死者：艄公[[laohe]]，年五十三。报官：其妻[[hesao]]。\n在场：纸商[[qianwu]]，年三十；茶摊[[zhangpo]]，年六十。\n初检：酒醉失足，[[drowned]]。县尉[[weiheng]]押。书填：押司冯禄。',
        en: 'Baipin sheriff\'s office, first inquest form, number Ying 14.\nDeceased: [[laohe]], ferryman, aged 53. Reported by his wife, [[hesao]].\nPresent: [[qianwu]], paper trader, 30; [[zhangpo]], tea seller, 60.\nFinding: fell in drunk and [[drowned]]. Signed, [[weiheng]], sheriff. Written out by Feng Lu, clerk.'
      }
    }
  },
  pages: [
    {
      id: 'names',
      names: true,
      title: { zh: '人物', en: 'People' },
      portraits: [
        { id: 'hesao', answer: 'hesao', needs: { role: 'wife' }, why: { zh: '报官的是谁？', en: 'Who reported the death?' } },
        { id: 'qianwu', answer: 'qianwu', needs: { role: 'trader' }, why: { zh: '纸捆是谁的货？格目里的纸商叫什么？', en: 'Whose goods are the bales? What does the form call the paper trader?' } },
        { id: 'zhangpo', answer: 'zhangpo', needs: { role: 'teaseller' }, why: { zh: '摆茶摊的是谁？', en: 'Who keeps the tea stall?' } },
        { id: 'weiheng', answer: 'weiheng', needs: { role: 'sheriff' }, why: { zh: '穿官袍的是谁？格目是谁签押的？', en: 'Who wears the official robe, and who signed the form?' } }
      ]
    },
    {
      id: 'p1',
      title: { zh: '他怎么死的', en: 'How he died' },
      text: {
        zh: '{{b1}}不是{{b2}}。他腹不胀、口鼻无沫，十指甲缝没有沙泥，是死后才落的水。他脑后那处方圆的伤，是被{{b3}}砸出来的；他倒下的地方在{{b4}}上，那里还有擦过的血。',
        en: '{{b1}} was not {{b2}}. His belly is flat, there is no froth at his mouth or nose and no sand under his nails: he went into the water dead. The round wound on the back of his head was made with a {{b3}}, and he fell in the {{b4}}, where the blood has been wiped.'
      },
      blanks: {
        b1: { answer: 'laohe', needs: { role: 'victim' }, why: { zh: '死的是谁？', en: 'Who is the dead man?' } },
        b2: { answer: 'drowned', needs: { claimed: 'yes' }, why: { zh: '初检说他是怎么死的？', en: 'How did the first inquest say he died?' } },
        b3: { answer: 'weight', needs: { heavy: 'yes', round: 'yes' }, why: { zh: '伤是方圆的。哪样东西又沉、底又是圆的？', en: 'The wound is round. What is both heavy and round at the bottom?' } },
        b4: { answer: 'boat', needs: { blood: 'yes' }, why: { zh: '哪里有擦过的血？', en: 'Where has blood been wiped away?' } }
      }
    },
    {
      id: 'p2',
      title: { zh: '谁，为什么', en: 'Who, and why' },
      text: {
        zh: '{{b5}}说他昨夜宿在客店，可他的鞋湿到脚踝，秤砣的铜钩里还卡着{{b6}}。他要老何连夜把{{b7}}运过河，塞给老何一张{{b8}}；老何看出纸里有{{b9}}，不肯再运，他便下了手。',
        en: '{{b5}} says he slept at the inn, yet his shoes are wet to the ankle and {{b6}} are caught in the hook of his weight. He wanted Old He to carry the {{b7}} across that night and gave him a {{b8}}. Old He saw the {{b9}} in the paper and would go no further, so he killed him.'
      },
      blanks: {
        b5: { answer: 'qianwu', needs: { alive: 'yes', wetshoes: 'yes' }, why: { zh: '昨夜谁到过水边？看鞋。', en: 'Who was at the water last night? Look at the shoes.' } },
        b6: { answer: 'hair', needs: { where: 'hook' }, why: { zh: '秤钩里卡着什么？', en: 'What is caught in the hook?' } },
        b7: { answer: 'bales', needs: { cargo: 'yes' }, why: { zh: '要连夜运过河的是什么货？', en: 'What cargo had to cross that night?' } },
        b8: { answer: 'fakenote', needs: { money: 'yes' }, why: { zh: '老何身上多出来的那一贯是什么？', en: 'What was the extra string of money on Old He?' } },
        b9: { answer: 'hiddenmark', needs: { where: 'paper' }, why: { zh: '纸对着天光，看得见什么？', en: 'What shows in the paper against the light?' } }
      }
    }
  ]
};
