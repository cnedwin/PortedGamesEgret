// 故事：三城十二关，关前的对白和结局。
// The story: three wards of the city, the lines spoken before levels, and the end.
//
// 墨家机关城闭城三十年。城心的「机枢」卡死了，城门、水闸、粮仓都锁着，山下的谷地也断了水。
// 守城老钜子在城里各处留了传声铜管，等一个会用机关弩的人来。阿巧是木匠的徒弟，带着祖父的弩，进城了。
//
// The Mohist city of mechanisms has been shut for thirty years. The Heart at its centre jammed, and with it
// every gate, sluice and granary; the valley below has had no water since. The old master who kept the city
// left speaking tubes of bronze through it, waiting for someone who could use a mechanical crossbow. Qiao, a
// carpenter's apprentice, comes with her grandfather's bow.

export const CHAPTERS = [
  { name: '外城 · 木坊', en: 'The Outer Ward · Joinery', levels: [0, 1, 2, 3] },
  { name: '中城 · 水轮', en: 'The Middle Ward · Water Wheels', levels: [4, 5, 6, 7] },
  { name: '内城 · 机枢', en: 'The Inner Ward · The Heart', levels: [8, 9, 10, 11] }
];

export const chapterOf = (index) => CHAPTERS.findIndex((chapter) => chapter.levels.includes(index));

/** Who speaks: a name and the colours of a small portrait drawn for them. */
export const SPEAKERS = {
  qiao: { name: '阿巧', robe: 0x3f6f8a, trim: 0xe6b65c, hair: 0x1b1712 },
  master: { name: '老钜子', robe: 0x5a4a3a, trim: 0xa8322a, hair: 0xd8d2c4 },
  tube: { name: '传声铜管', robe: 0x3f7a6e, trim: 0x86c2a6, hair: 0x3f7a6e }
};

/** Lines before a level, by its index. */
export const BEFORE = {
  0: [
    ['qiao', '城门锁得死死的……祖父说，墨家的锁，要用墨家的弩来开。'],
    ['tube', '（铜管里传出苍老的声音）来者听着：机关锁要被「打中」才会松。'],
    ['master', '拖拽拉弦，松手发射。看准了，一发就够。']
  ],
  1: [
    ['master', '木坊里的东西都是活的。锁要木块压着才开，那就把木块请下来。'],
    ['qiao', '推它一把……让它自己掉进槽里。']
  ],
  2: [
    ['qiao', '石头吊在绳子上，锁在它正下方。'],
    ['master', '弹丸穿过绳子，绳就断。别打石头，打绳。']
  ],
  3: [
    ['master', '跷板：一头落下，另一头就把东西抛起来。'],
    ['qiao', '打翘起的那一头，木块就会飞上高台。']
  ],
  4: [
    ['tube', '——中城到了。水轮停了三十年，箱子也都朽了。'],
    ['master', '朽箱一碰就碎。箱子碎了，压在上面的石头就落下去。']
  ],
  5: [
    ['qiao', '锁在高台上，顶上压着横梁，直接打不进去。'],
    ['master', '地上有弹簧板。让弹丸弹起来，从下面钻进去。']
  ],
  6: [
    ['master', '闸门由踏板管着。木块压上踏板，闸就抬起来。'],
    ['qiao', '先开闸，再打锁——要两发。']
  ],
  7: [
    ['master', '两把锁，一把要石，一把要木。'],
    ['qiao', '一发不够，那就两发……或者，一发同时撞开两边？']
  ],
  8: [
    ['tube', '——内城。这里存着雷丸，炸开时周围的箱子和绳子都会被冲断。'],
    ['qiao', '祖父的弩匣里正好有一颗。省着用。']
  ],
  9: [
    ['master', '机关连着机关：绳断，石落，跷板起，木块落到踏板上，闸门开。'],
    ['qiao', '一环扣一环。第一发打绳子，第二发进锁。']
  ],
  10: [
    ['qiao', '锁在城楼顶上，木块却在下面。'],
    ['master', '沉丸更重，推得动木块。弹簧板会把它送上去。']
  ],
  11: [
    ['master', '机枢之心有三把锁：石锁、木锁，还有闸门后的那一把。'],
    ['qiao', '三十年了。今天把它打开。']
  ]
};

/** Words shown when the last lock of the heart opens. */
export const ENDING = [
  ['master', '咔哒——机枢转起来了。'],
  ['tube', '水闸一道道抬起，水声从城心一直流到山下的谷地。'],
  ['qiao', '祖父，城开了。'],
  ['master', '墨家的机关，本就是给人用的。孩子，这座城交给你了。']
];

/** The film at the opening, as lines with the second at which each is shown: the film carries them too. */
export const INTRO_LINES = [
  [0.5, '三十年前，墨家机关城闭城自守'],
  [5, '城心「机枢」卡死，千门俱锁，山下的谷地断了水'],
  [10, '守城的老钜子在城中留下传声铜管'],
  [14.5, '等一个会用机关弩的人'],
  [18.5, '千机巧匠 · Mechanism City']
];
