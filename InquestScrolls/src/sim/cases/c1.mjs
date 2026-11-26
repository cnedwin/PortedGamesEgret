// 第一案「纸坊悬梁」：教学案。纸工被勒死后吊上梁去，初检写成自缢。
// 依据《洗冤集录》卷三「被打勒死假作自缢」：勒痕平匝、交于项后，死后吊起的痕白色无血荫；卷一：梁上只有一路无尘，不是自缢。
// Case one, "The Beam at the Paper Mill": the teaching case. A papermaker strangled and then hung from a beam, which the
// first inquest wrote down as a hanging. The signs come from the Collected Writings on the Washing Away of Wrongs:
// a strangling cord runs level and crosses at the nape, a cord tied after death leaves a pale mark with no bruise, and
// a beam whose dust is undisturbed but for one line was not climbed by a man hanging himself.

export default {
  id: 'c1',
  scroll: 1,
  title: { zh: '纸坊悬梁', en: 'The Beam at the Paper Mill' },
  place: { zh: '白蘋县 · 杜家纸坊晾纸棚', en: 'Baipin County · the drying shed of the Du paper mill' },
  time: { zh: '三月初九，夜', en: 'The ninth night of the third month' },
  intro: {
    zh: [
      '白蘋县申状：三月初九夜，杜家纸坊纸工阿满在晾纸棚梁上自缢身死。县尉韦衡初检，定作自缢，请免覆检。',
      '画工按格目与口供，重绘了天亮时的晾纸棚。沈砚展开这幅现场图，叫仵作老秦把酒醋摆在手边。'
    ],
    en: [
      "Baipin County reports: on the ninth night of the third month, A-Man, a papermaker at the Du mill, hanged himself from a beam in the drying shed. Wei Heng, the county sheriff, held the first inquest, found it a hanging, and asks that no second inquest be held.",
      'A painter has redrawn the shed as it was at dawn, from the inquest form and the statements. Shen Yan unrolls the scene and has Old Qin, his coroner\'s aide, set the wine and vinegar within reach.'
    ]
  },
  outro: {
    zh: [
      '覆检明白：阿满是被孙大用青布腰带从背后勒死，死后才吊上梁去，伪作自缢。孙大供认，是坊主吩咐他“叫阿满闭嘴”。',
      '阿满撞见纸坊夜里偷偷抄一种带暗纹的纸，要去县里告发。杜明远咬定不知情。初检格目把两道痕只写作一道，书填的是押司冯禄，签押的是县尉韦衡。'
    ],
    en: [
      'The second inquest is clear. Sun Da strangled A-Man from behind with a blue cloth sash and hung him from the beam after he was dead, to pass it off as a hanging. Sun Da confesses that the mill owner told him to "keep A-Man quiet".',
      'A-Man had seen the mill making a paper with hidden marks by night, and meant to report it to the county. Du Mingyuan swears he knew nothing. The first inquest form wrote the two marks as one; Feng Lu, the clerk, filled it in, and Wei Heng, the sheriff, signed it.'
    ]
  },
  // Old Qin teaches the first case, one line at each step.
  teach: {
    start: {
      zh: '提刑，这是按格目重画的现场。点人、点物，看看写了什么。带下划线的字，点一下就收进词囊。',
      en: 'Intendant, this is the scene redrawn from the form. Tap people and things to read about them. Tap an underlined word to put it in your pouch.'
    },
    words: {
      zh: '词收得差不多了，就打开卷宗。把词拖进同色的空位里；一段填满，才能核验。',
      en: 'Once you have some words, open the dossier. Drag each word into a blank of its colour. A passage can be checked once every blank is full.'
    },
    near: {
      zh: '“尚有两处以内不实”：说明大体对了，只错一两处。哪里错，得自己再想。',
      en: '"Two or fewer are wrong" means you are close: one or two blanks are off. Which ones is for you to work out.'
    },
    names: {
      zh: '人物一页，要给每个人对上名字。格目里写着各人的身份，画上看得出谁是谁。',
      en: 'On the people page, give each person a name. The form lists who was there and what they do; the picture shows who is who.'
    }
  },
  words: {
    aman: { kind: 'person', zh: '阿满', en: 'A-Man', is: { role: ['victim', 'form', 'body'], scratched: ['no', 'body'], present: ['yes', 'form'] } },
    sunda: { kind: 'person', zh: '孙大', en: 'Sun Da', is: { role: ['foreman', 'form'], scratched: ['yes', 'sunda'], present: ['yes', 'xiaoqi'] } },
    xiaoqi: { kind: 'person', zh: '小七', en: 'Xiaoqi', is: { role: ['apprentice', 'form'], scratched: ['no', 'xiaoqi'], present: ['yes', 'form'] } },
    du: { kind: 'person', zh: '杜明远', en: 'Du Mingyuan', is: { role: ['owner', 'form'], scratched: ['no', 'du'], present: ['yes', 'form'] } },
    fenglu: { kind: 'person', zh: '冯禄', en: 'Feng Lu', is: { role: ['clerk', 'form'], scratched: ['no', 'fenglu'], present: ['no', 'form'] } },
    weiheng: { kind: 'person', zh: '韦衡', en: 'Wei Heng', is: { role: ['sheriff', 'form'], present: ['no', 'form'] } },
    rope: { kind: 'thing', zh: '麻绳', en: 'hemp rope', is: { ligature: ['yes', 'rope'], width: ['finger', 'rope'] } },
    sash: { kind: 'thing', zh: '青布腰带', en: 'blue sash', is: { ligature: ['yes', 'vat'], width: ['cun', 'vat'] } },
    stool: { kind: 'thing', zh: '矮凳', en: 'low stool', is: { ligature: ['no', 'stool'] } },
    strangle: { kind: 'mark', zh: '勒痕', en: 'strangle mark', is: { where: ['neck', 'body'] } },
    hangmark: { kind: 'mark', zh: '吊痕', en: 'hanging mark', is: { where: ['neck', 'body'] } },
    scratch: { kind: 'mark', zh: '抓痕', en: 'scratches', is: { where: ['hand', 'sunda'] } },
    skin: { kind: 'mark', zh: '皮屑', en: 'shreds of skin', is: { where: ['nails', 'body'] } },
    nightpaper: { kind: 'motive', zh: '夜抄暗纹纸', en: 'the marked night paper', is: {} }
  },
  spots: {
    body: {
      kind: 'body',
      title: { zh: '尸身', en: 'The body' },
      text: {
        zh: '死者[[aman]]，年二十，纸坊纸工，已从梁上解下，停在草席上。\n项下有两道痕。一道[[strangle]]平平绕颈一周，交于项后，紫赤，有血荫；一道[[hangmark]]斜斜起于耳后，色白，没有血荫。\n口眼都开着，两手散垂。身上别无伤损。右手指甲缝里，嵌着带血的[[skin]]。',
        en: 'The dead man is [[aman]], twenty, a papermaker at the mill, cut down from the beam and laid on a straw mat.\nTwo marks cross his neck. A [[strangle]] runs level all the way round and crosses at the nape; it is purple-red and bruised. A [[hangmark]] slants up behind the ears; it is pale, with no bruise at all.\nHis eyes and mouth are open and his hands hang slack. There is no other hurt on him. Under the nails of his right hand are bloody [[skin]].'
      },
      marks: [
        { side: 'front', x: 0.5, y: 0.165, zh: '项下两痕：一平一斜', en: 'Two neck marks: one level, one slanting' },
        { side: 'front', x: 0.08, y: 0.53, zh: '右手甲缝带血皮屑', en: 'Bloody skin under right nails' },
        { side: 'back', x: 0.5, y: 0.135, zh: '勒痕交于项后', en: 'Strangle mark crosses at the nape' },
        { side: 'back', x: 0.36, y: 0.09, zh: '吊痕起于耳后', en: 'Hanging mark rises behind the ears' }
      ]
    },
    beam: {
      kind: 'object',
      title: { zh: '梁上', en: 'The beam' },
      text: {
        zh: '梁上积尘有一分厚，只有绳子勒过的一道印子，四周的灰纹丝未动。\n人若是自己爬上去系绳，手脚总要蹭乱一大片。',
        en: 'Dust lies thick on the beam. There is a single line where a cord ran over it, and the dust around it has not been touched.\nA man who climbed up to tie his own noose would have scuffed it all over.'
      }
    },
    rope: {
      kind: 'object',
      title: { zh: '梁上的绳', en: 'The cord on the beam' },
      text: {
        zh: '从梁上垂下的[[rope]]，粗如小指，下端打着活套。\n可项下那道勒痕，阔约一寸，不是这样细的绳子勒得出来的。',
        en: 'A [[rope]] hangs from the beam, as thick as a little finger, with a running noose at the end.\nThe strangle mark on the neck is a full inch wide. A cord this thin could not have made it.'
      }
    },
    stool: {
      kind: 'object',
      title: { zh: '翻倒的凳子', en: 'The overturned stool' },
      text: {
        zh: '倒在一旁的[[stool]]，高一尺二寸。\n绳套离地五尺有余，死者身长五尺四寸。踩着这张凳子，他的头够不着绳套。',
        en: 'A [[stool]] lies on its side, a foot and two inches high.\nThe noose hangs more than five feet from the floor, and the dead man stood five foot four. Standing on this stool, he could not have put his head in it.'
      }
    },
    vat: {
      kind: 'object',
      title: { zh: '纸槽', en: 'The pulp vat' },
      text: {
        zh: '纸槽里泡着楮皮浆。槽底沉着一条[[sash]]，阔一寸，一头有两点血。',
        en: 'The vat holds soaking mulberry-bark pulp. On the bottom lies a [[sash]], an inch wide, with two spots of blood at one end.'
      }
    },
    sunda: {
      kind: 'person',
      title: { zh: '工头', en: 'The foreman' },
      text: {
        zh: '纸坊的工头，青布裹头。他说：“阿满那小子心窄，前几日挨了我的骂，想不开。”\n他左手背上有三道新鲜的[[scratch]]，袖口湿了半截。腰里只系着一根草绳。',
        en: 'The mill foreman, his head wrapped in a dark cloth. "That boy A-Man took things too hard," he says. "I gave him a scolding the other day and he couldn\'t bear it."\nOn the back of his left hand are three fresh [[scratch]]. His cuff is wet halfway up. He wears only a straw cord for a belt.'
      }
    },
    xiaoqi: {
      kind: 'person',
      title: { zh: '学徒', en: 'The apprentice' },
      text: {
        zh: '提着灯笼的小学徒，两只手冻得通红，干干净净。他说：“天还没亮，我看见晾纸棚里亮着灯。工头从棚里出来，袖子是湿的。”',
        en: 'The young apprentice with the lantern. His hands are red with cold, and clean. "It wasn\'t light yet," he says. "I saw a lamp in the drying shed. The foreman came out of it, and his sleeve was wet."'
      }
    },
    du: {
      kind: 'person',
      title: { zh: '坊主', en: 'The mill owner' },
      text: {
        zh: '纸坊的主人，绸衫，一双手白白净净。他说：“阿满手脚勤快，可惜了。前几日他跟我嘀咕，说夜里抄出来的纸，对着光有暗纹，纹路不对。”\n——[[nightpaper]]。他说完这句，就不肯再往下说了。',
        en: 'The owner of the mill, in silk, with soft clean hands. "A-Man was a good worker. A pity," he says. "A few days ago he muttered to me that the paper made at night had marks in it against the light, marks that were wrong."\nThat is [[nightpaper]]. After that he will say no more.'
      }
    },
    fenglu: {
      kind: 'person',
      title: { zh: '押司', en: 'The clerk' },
      text: {
        zh: '县衙的押司，穿青色公服，夹着一叠格目。握笔的手稳稳当当，指上只有墨。他说：“初检那日小人不在场，格目是照县尉大人口述填的。”',
        en: 'The county clerk, in a blue-green office robe, with a sheaf of forms under his arm. His writing hand is steady; there is nothing on his fingers but ink. "I was not there at the first inquest," he says. "I filled in the form as the sheriff told it to me."'
      }
    },
    form: {
      kind: 'doc',
      title: { zh: '初检格目', en: 'The first inquest form' },
      text: {
        zh: '白蘋县尉司初检格目，盈字第九号。\n死者：纸工[[aman]]，年二十。\n在场：工头[[sunda]]，年四十；学徒[[xiaoqi]]，年十三；坊主[[du]]，年五十。\n三月初十辰时，县尉到场初检：项下一痕，自缢身死。\n县尉[[weiheng]]押。书填：押司[[fenglu]]，次日补填。',
        en: 'Baipin sheriff\'s office, first inquest form, number Ying 9.\nDeceased: [[aman]], papermaker, aged 20.\nPresent: [[sunda]], foreman, 40; [[xiaoqi]], apprentice, 13; [[du]], mill owner, 50.\nThe sheriff came the next morning and found: one mark on the neck; hanged himself.\nSigned, [[weiheng]], sheriff. Written out by [[fenglu]], clerk, the day after.'
      }
    }
  },
  pages: [
    {
      id: 'names',
      names: true,
      title: { zh: '人物', en: 'People' },
      portraits: [
        { id: 'sunda', answer: 'sunda', needs: { role: 'foreman' }, why: { zh: '他是哪一个？格目里谁是工头？', en: 'Which of them is the foreman, and what does the form call the foreman?' } },
        { id: 'xiaoqi', answer: 'xiaoqi', needs: { role: 'apprentice' }, why: { zh: '十三岁的学徒，格目里叫什么？', en: 'The apprentice is thirteen. What does the form call him?' } },
        { id: 'du', answer: 'du', needs: { role: 'owner' }, why: { zh: '穿绸衫的是坊主。格目里的坊主是谁？', en: 'The man in silk owns the mill. Who does the form name as owner?' } },
        { id: 'fenglu', answer: 'fenglu', needs: { role: 'clerk' }, why: { zh: '夹着格目的是押司。格目末尾是谁书填的？', en: 'The man with the forms is a clerk. Who wrote the form out?' } }
      ]
    },
    {
      id: 'p1',
      title: { zh: '晾纸棚里发生了什么', en: 'What happened in the shed' },
      text: {
        zh: '{{b1}}不是自缢。凶手用{{b2}}从背后把他勒死，再吊上梁去。{{b3}}手背上的{{b4}}，是死者挣扎时抓下的。',
        en: '{{b1}} did not hang himself. The killer strangled him from behind with a {{b2}} and then hung him from the beam. The {{b4}} on {{b3}}\'s hand were left by the dead man as he fought.'
      },
      blanks: {
        b1: { answer: 'aman', needs: { role: 'victim' }, why: { zh: '死的是谁？', en: 'Who is the dead man?' } },
        b2: { answer: 'sash', needs: { ligature: 'yes', width: 'cun' }, why: { zh: '勒痕阔一寸。哪样东西勒得出这么宽的痕？', en: 'The strangle mark is an inch wide. What could make a mark that wide?' } },
        b3: { answer: 'sunda', needs: { present: 'yes', scratched: 'yes' }, why: { zh: '死者指甲里有带血的皮。谁的手上有新伤？', en: 'There is bloody skin under the dead man\'s nails. Whose hand is freshly hurt?' } },
        b4: { answer: 'scratch', needs: { where: 'hand' }, why: { zh: '哪一样痕迹长在手背上？', en: 'Which sign is on the back of a hand?' } }
      }
    }
  ]
};
