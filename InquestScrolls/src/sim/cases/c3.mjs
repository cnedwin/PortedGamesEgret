// 第三案「质库茶毒」：管账先生被砒霜毒死在茶里，初检写成心痛暴卒。
// 依据《洗冤集录》卷四「服毒」：唇紫黑，手足指甲俱青黯，口眼耳鼻间有血出；用银钗以皂角水揩洗过，探入喉内，
// 以纸密封良久取出，作青黑色，再用皂角水揩洗，其色不去。信石即砒霜。
// Case three, "Tea at the Pawnshop": a bookkeeper poisoned with arsenic in his tea, written down as a sudden heart
// attack. From the same book: the lips purple-black, the nails dark, blood at the mouth and nose; a silver pin washed
// in soap-pod water, put into the throat and sealed in with paper, comes out blue-black, and the colour does not wash
// off. "Trust stone" is arsenic.

export default {
  id: 'c3',
  scroll: 2,
  title: { zh: '质库茶毒', en: 'Tea at the Pawnshop' },
  place: { zh: '白蘋县城 · 广裕质库', en: 'Baipin town · the Guangyu pawnshop' },
  time: { zh: '五月初三，午后', en: 'The third day of the fifth month, afternoon' },
  intro: {
    zh: [
      '纸、会子，都指向县城的广裕质库。偏偏质库的管账先生吴伯谦，五月初三午后在后堂吃茶时暴卒。县尉韦衡初检：心痛暴卒，病死。',
      '质库主陆承恩出面料理后事，体面周到。'
    ],
    en: [
      'The paper and the notes both point to the Guangyu pawnshop in the county town. And on the afternoon of the third day of the fifth month, the pawnshop\'s bookkeeper, Wu Boqian, died suddenly over tea in the back room. Wei Heng\'s first inquest: a seizure of the heart, death by illness.',
      'Lu Cheng\'en, who owns the pawnshop, is seeing to the funeral, generously and correctly.'
    ]
  },
  outro: {
    zh: [
      '郑七招认：信石是他买的，药是他抖进黑盏的。吴伯谦的私账记下了重号的会子，郑七说，是“上头”叫他在吴先生告发之前动手。',
      '问他上头是谁，他只说：“质库里的会子，从哪儿来、到哪儿去，都不归我管。”陆承恩那日午后确实在城南收账，轿夫都作了证。'
    ],
    en: [
      'Zheng Qi confesses. He bought the trust stone and shook it into the black bowl. Wu Boqian\'s private ledger had caught the repeated note numbers, and Zheng Qi says "the people above" told him to act before Mr Wu could report it.',
      'Asked who is above him, he will only say: "Where the pawnshop\'s notes come from and where they go is none of my business." Lu Cheng\'en was indeed collecting debts in the south of town that afternoon; his chair-bearers swear to it.'
    ]
  },
  words: {
    wu: { kind: 'person', zh: '吴伯谦', en: 'Wu Boqian', is: { role: ['victim', 'form', 'body'], powder: ['no', 'body'], witness: ['no', 'body'] } },
    zhengqi: { kind: 'person', zh: '郑七', en: 'Zheng Qi', is: { role: ['manager', 'form'], powder: ['yes', 'zhengqi'], witness: ['no', 'liu'] } },
    afu: { kind: 'person', zh: '阿福', en: 'A-Fu', is: { role: ['servant', 'form'], powder: ['no', 'afu'], witness: ['no', 'afu'] } },
    lu: { kind: 'person', zh: '陆承恩', en: 'Lu Cheng\'en', is: { role: ['owner', 'form'], powder: ['no', 'lu'], witness: ['no', 'lu'] } },
    liu: { kind: 'person', zh: '刘娘子', en: 'Mistress Liu', is: { role: ['customer', 'form'], powder: ['no', 'liu'], witness: ['yes', 'liu'] } },
    jianzhan: { kind: 'thing', zh: '黑釉建盏', en: 'black Jian bowl', is: { vessel: ['cup', 'jianzhan'], poisoned: ['yes', 'jianzhan'] } },
    whitecups: { kind: 'thing', zh: '青白瓷盏', en: 'white porcelain cups', is: { vessel: ['cup', 'whitecups'], poisoned: ['no', 'whitecups'] } },
    ewer: { kind: 'thing', zh: '汤瓶', en: 'tea ewer', is: { vessel: ['pot', 'ewer'], poisoned: ['no', 'ewer'] } },
    wrapper: { kind: 'thing', zh: '药包纸', en: 'drug wrapper', is: { vessel: ['wrapper', 'brazier'] } },
    ledger: { kind: 'thing', zh: '私账', en: 'private ledger', is: { vessel: ['book', 'sleeve'] } },
    pin: { kind: 'thing', zh: '银钗', en: 'silver pin', is: { vessel: ['pin', 'body'] } },
    purplelips: { kind: 'mark', zh: '唇紫黑', en: 'purple-black lips', is: { where: ['lips', 'body'] } },
    blackpin: { kind: 'mark', zh: '钗色青黑', en: 'blackened pin', is: { where: ['pin', 'body'] } },
    powder: { kind: 'mark', zh: '白末', en: 'white powder', is: { where: ['sleeve', 'zhengqi'] } },
    illness: { kind: 'cause', zh: '心痛暴卒', en: 'a seizure of the heart', is: { claimed: ['yes', 'form'], true: ['no', 'body'] } },
    arsenic: { kind: 'cause', zh: '信石毒', en: 'arsenic', is: { claimed: ['no', 'form'], true: ['yes', 'body'] } },
    repeats: { kind: 'motive', zh: '重号会子', en: 'repeated note numbers', is: { found: ['ledger', 'sleeve'] } },
    gambling: { kind: 'motive', zh: '赌债', en: 'gambling debts', is: { found: ['rumour', 'lu'] } }
  },
  spots: {
    body: {
      kind: 'body',
      title: { zh: '尸身', en: 'The body' },
      text: {
        zh: '[[wu]]伏在案上，像是睡着了。嘴唇[[purplelips|紫黑]]，十指甲青黯，口鼻里有一线血。袖口干干净净。\n老秦把用皂角水擦过的[[pin]]探进他喉中，以纸密封，良久取出：[[blackpin|钗色青黑]]，再用皂角水洗，洗不掉。',
        en: '[[wu]] lies slumped over the table as if asleep. His lips are [[purplelips|purple-black]], all ten nails are dark, and there is a thread of blood at his mouth and nose. His cuffs are clean.\nOld Qin washes a [[pin]] in soap-pod water, puts it into his throat and seals the mouth with paper. After a long while he draws it out: a [[blackpin]], blue-black, and soap-pod water will not wash it off.'
      },
      marks: [
        { side: 'front', x: 0.5, y: 0.112, zh: '唇紫黑，口鼻出血', en: 'Lips purple-black, blood at mouth and nose' },
        { side: 'front', x: 0.5, y: 0.165, zh: '银钗探喉，青黑不去', en: 'Silver pin in the throat turns blue-black' },
        { side: 'front', x: 0.92, y: 0.53, zh: '十指甲青黯', en: 'All ten nails dark' }
      ]
    },
    jianzhan: {
      kind: 'object',
      title: { zh: '黑盏', en: 'The black bowl' },
      text: {
        zh: '死者面前一只[[jianzhan]]。盏底的残茶浑浊，沉着一层白末。',
        en: 'In front of the dead man is a [[jianzhan]]. The dregs at the bottom are cloudy, with a layer of white powder settled in them.'
      }
    },
    whitecups: {
      kind: 'object',
      title: { zh: '另外三只盏', en: 'The other three cups' },
      text: {
        zh: '另外三只[[whitecups]]，茶喝了一半，盏底干净。喝过的人都好好的。',
        en: 'Three [[whitecups]], half drunk, clean at the bottom. Everyone who drank from them is well.'
      }
    },
    ewer: {
      kind: 'object',
      title: { zh: '汤瓶', en: 'The ewer' },
      text: {
        zh: '[[ewer]]里的茶还温着，倒出来清亮。银钗探之，色不变。四只盏的茶，都是从这一瓶里点的。',
        en: 'The tea in the [[ewer]] is still warm and pours clear. A silver pin dipped in it does not change colour. All four bowls were whisked from this one ewer.'
      }
    },
    brazier: {
      kind: 'object',
      title: { zh: '风炉', en: 'The brazier' },
      text: {
        zh: '风炉灰里压着半张没烧尽的[[wrapper]]，还认得出“信石”二字。\n老秦说：“信石就是砒霜，药铺当鼠药卖。是急病，还是中了[[arsenic]]，验唇甲、验银钗便知。”',
        en: 'Half a [[wrapper]], not quite burned, lies pressed into the ash of the brazier. Two characters can still be read: "trust stone".\nOld Qin says: "Trust stone is arsenic. Apothecaries sell it for rats. Whether it was illness or [[arsenic]], the lips, the nails and a silver pin will tell."'
      }
    },
    sleeve: {
      kind: 'object',
      title: { zh: '死者袖中', en: 'In the dead man\'s sleeve' },
      text: {
        zh: '死者袖中藏着一本[[ledger]]，一笔一笔记着近月收进的会子号。“天字三百二十号”出现了三次。一张会子只该有一个号。\n——[[repeats]]。',
        en: 'Hidden in the dead man\'s sleeve is a [[ledger]], recording, one by one, the numbers of the notes taken in this past month. "Tian 320" appears three times. Every note has its own number.\nThat makes [[repeats]].'
      }
    },
    zhengqi: {
      kind: 'person',
      title: { zh: '二掌柜', en: 'The under-manager' },
      text: {
        zh: '穿褐色长衫的中年人，手里还提着汤瓶。他说：“我只管点茶，盏都是阿福端的。”\n他右手袖口沾着一点[[powder]]。',
        en: 'A middle-aged man in a brown gown, the ewer still in his hand. "I only whisked the tea," he says. "A-Fu carried the bowls."\nOn his right cuff is a smudge of [[powder]].'
      }
    },
    afu: {
      kind: 'person',
      title: { zh: '小伙计', en: 'The serving boy' },
      text: {
        zh: '捧着茶盘的小伙计，十六岁，手上只有水渍。他说：“二掌柜叫我把黑盏端给吴先生，说吴先生爱用建盏。我一直在后头烧水，别的没看见。”',
        en: 'The serving boy with the tray, sixteen. There is nothing on his hands but water. "The under-manager told me to take the black bowl to Mr Wu," he says. "He said Mr Wu liked a Jian bowl. I was boiling water at the back the whole time and saw nothing else."'
      }
    },
    lu: {
      kind: 'person',
      title: { zh: '质库主人', en: 'The pawnshop owner' },
      text: {
        zh: '深蓝缎袍镶着貂边，刚从外面回来，伞上还滴着雨。他说：“吴先生跟了我十年，竟这样走了。我午后去城南收账，轿夫都可作证。”\n又压低了声音：“听人说吴先生在外头欠了[[gambling]]，许是一时想不开……”\n他的手白净，袖口干爽。',
        en: 'A dark blue satin robe trimmed with sable. He has just come in, and his umbrella still drips. "Mr Wu was with me ten years," he says, "and now this. I was collecting debts in the south of town all afternoon. My chair-bearers will tell you."\nThen, more quietly: "People say Mr Wu had [[gambling]] somewhere. Perhaps he could not bear it…"\nHis hands are clean and his cuffs dry.'
      }
    },
    liu: {
      kind: 'person',
      title: { zh: '当客', en: 'The customer' },
      text: {
        zh: '来当银簪的妇人，袖口干净。她说：“我在柜台外等着，从帘缝里看见穿褐衫的那位，往黑盏里抖了些白东西。”',
        en: 'A woman who came to pawn a silver hairpin. Her cuffs are clean. "I was waiting at the counter," she says, "and through the gap in the curtain I saw the one in the brown gown shake something white into the black bowl."'
      }
    },
    form: {
      kind: 'doc',
      title: { zh: '初检格目', en: 'The first inquest form' },
      text: {
        zh: '白蘋县尉司初检格目，盈字第二十一号。\n死者：广裕质库管账[[wu]]，年四十五。\n在场：二掌柜[[zhengqi]]，年三十五；伙计[[afu]]，年十六；当客[[liu]]。质库主[[lu]]事后方归。\n初检：[[illness]]，病死。县尉韦衡押。书填：押司冯禄。',
        en: 'Baipin sheriff\'s office, first inquest form, number Ying 21.\nDeceased: [[wu]], bookkeeper of the Guangyu pawnshop, aged 45.\nPresent: [[zhengqi]], under-manager, 35; [[afu]], serving boy, 16; [[liu]], a customer. The owner, [[lu]], returned afterwards.\nFinding: [[illness]]; death by illness. Signed, Wei Heng, sheriff. Written out by Feng Lu, clerk.'
      }
    }
  },
  pages: [
    {
      id: 'names',
      names: true,
      title: { zh: '人物', en: 'People' },
      portraits: [
        { id: 'zhengqi', answer: 'zhengqi', needs: { role: 'manager' }, why: { zh: '提着汤瓶点茶的，是什么人？', en: 'Who whisks the tea, and what is his place in the shop?' } },
        { id: 'afu', answer: 'afu', needs: { role: 'servant' }, why: { zh: '十六岁的伙计叫什么？', en: 'What is the sixteen-year-old serving boy called?' } },
        { id: 'lu', answer: 'lu', needs: { role: 'owner' }, why: { zh: '刚从外面回来的是谁？', en: 'Who has just come in from outside?' } },
        { id: 'liu', answer: 'liu', needs: { role: 'customer' }, why: { zh: '来当东西的妇人叫什么？', en: 'What is the woman who came to pawn something called?' } }
      ]
    },
    {
      id: 'p1',
      title: { zh: '他怎么死的', en: 'How he died' },
      text: {
        zh: '{{b1}}不是{{b2}}，是中了{{b3}}。毒不在{{b4}}里——那里的茶银钗探过，清亮如常——而在他面前的{{b5}}中。',
        en: '{{b1}} did not die of {{b2}}; he died of {{b3}}. The poison was not in the {{b4}}, whose tea was clear when the pin was dipped in it, but in the {{b5}} in front of him.'
      },
      blanks: {
        b1: { answer: 'wu', needs: { role: 'victim' }, why: { zh: '死的是谁？', en: 'Who is the dead man?' } },
        b2: { answer: 'illness', needs: { claimed: 'yes' }, why: { zh: '初检说他是怎么死的？', en: 'What did the first inquest say killed him?' } },
        b3: { answer: 'arsenic', needs: { true: 'yes' }, why: { zh: '唇甲青黑、钗色不去，说明了什么？', en: 'Dark lips and nails, and a pin that stays black: what does that say?' } },
        b4: { answer: 'ewer', needs: { vessel: 'pot' }, why: { zh: '四盏茶都从哪里倒出来？', en: 'Where did all four bowls of tea come from?' } },
        b5: { answer: 'jianzhan', needs: { vessel: 'cup', poisoned: 'yes' }, why: { zh: '哪一只盏底沉着白末？', en: 'Which bowl has white powder at the bottom?' } }
      }
    },
    {
      id: 'p2',
      title: { zh: '谁，为什么', en: 'Who, and why' },
      text: {
        zh: '下毒的是{{b6}}：{{b7}}从帘缝里看见他往黑盏里抖药，他的袖口还沾着{{b8}}。{{b9}}只是奉命端茶。死者袖中的{{b10}}里记着{{b11}}，有人要他闭嘴。',
        en: 'The poisoner was {{b6}}. {{b7}} saw him through the curtain shaking something into the black bowl, and there is {{b8}} on his cuff still. {{b9}} only carried the tea as he was told. The {{b10}} in the dead man\'s sleeve recorded {{b11}}, and someone wanted him silent.'
      },
      blanks: {
        b6: { answer: 'zhengqi', needs: { powder: 'yes' }, why: { zh: '谁的袖口沾着东西？', en: 'Whose cuff has something on it?' } },
        b7: { answer: 'liu', needs: { witness: 'yes' }, why: { zh: '谁亲眼看见了？', en: 'Who saw it with their own eyes?' } },
        b8: { answer: 'powder', needs: { where: 'sleeve' }, why: { zh: '袖口上沾的是什么？', en: 'What is on the cuff?' } },
        b9: { answer: 'afu', needs: { role: 'servant' }, why: { zh: '茶是谁端过去的？', en: 'Who carried the tea over?' } },
        b10: { answer: 'ledger', needs: { vessel: 'book' }, why: { zh: '死者袖里藏着什么？', en: 'What was hidden in the dead man\'s sleeve?' } },
        b11: { answer: 'repeats', needs: { found: 'ledger' }, why: { zh: '那本账里有什么不对？', en: 'What was wrong in that book?' } }
      }
    }
  ]
};
