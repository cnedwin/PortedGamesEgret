// The seven seniors and the hero: how they look, what they wear, where they
// spend their days, and what wins them over. Text is [中文, English].

const wear = (top, bottom, extra = {}) => ({ top, bottom, ...extra });
const p = (id, c1, c2) => (c1 ? { id, c: [c1, c2] } : { id });

/**
 * pace: the range of the push-and-pull gauge (-50 distant … +50 forward) in
 *       which she warms to the hero fastest.
 * stat: the quality she respects; her later story chapters need it.
 * home: the place where her story chapters happen.
 * week / weekend: where she is in the morning, afternoon, evening and night
 *       (null = off campus).
 */
export const HEROINES = {
  qingge: {
    name: ['沈清歌', 'Shen Qingge'],
    role: ['学生会会长 · 大三', 'Student council president, year 3'],
    color: '#5a6fd8',
    home: 'library',
    bio: [
      '成绩与气场都无可挑剔的会长。不习惯被人靠得太近，却会记住每个人说过的话。',
      "A president flawless in grades and bearing. She keeps people at arm's length, yet remembers everything they say.",
    ],
    look: { sex: 'f', skin: '#ffe9dc', eye: '#5a6fd8', hair: { style: 'long', bangs: 'hime', color: '#2c3152', length: 470 } },
    outfits: {
      uniform: wear(p('shirt'), p('pleated'), { outer: p('blazer'), shoes: p('loafers'), legs: p('tights'), acc: [p('tie')] }),
      casual: wear(p('turtleneck', '#f4f1ea', '#c9c2b5'), p('longskirt', '#3c4563', '#e8c25a'), {
        shoes: p('boots', '#2b2f48', '#8a7f94'),
        acc: [p('necklace')],
      }),
      date: { dress: p('gown'), shoes: p('heels', '#2b2d52', '#fff'), acc: [p('necklace')] },
    },
    likes: ['preppy', 'elegant'],
    stat: 'intellect',
    pace: [-25, 10],
    gifts: { love: ['tea', 'pen'], like: ['novel', 'cocoa', 'starmap'], hate: ['console', 'plush'] },
    week: ['classroom', 'library', 'library', null],
    weekend: ['library', 'cafe', 'street', null],
  },
  linxia: {
    name: ['林夏', 'Lin Xia'],
    role: ['田径社王牌 · 大二', 'Track team ace, year 2'],
    color: '#ff8a5c',
    home: 'field',
    bio: [
      '像盛夏的风一样直来直去。输了会不甘心，赢了会第一个冲过来击掌。',
      'As direct as a summer breeze. She hates losing, and is the first to run over for a high five when she wins.',
    ],
    look: { sex: 'f', skin: '#ffdcc2', eye: '#e0843a', hair: { style: 'pony', bangs: 'side', color: '#c9703a' } },
    outfits: {
      uniform: wear(p('jersey'), p('shorts'), { shoes: p('sneakers'), legs: p('socks') }),
      casual: wear(p('tee', '#ffffff', '#ff8a5c'), p('jeans'), {
        outer: p('varsity', '#ff8a5c', '#fff6ea'),
        shoes: p('sneakers'),
        acc: [p('cap', '#ff8a5c', '#fff')],
      }),
      date: { dress: p('sundress', '#ffffff', '#ff8a5c'), shoes: p('sneakers'), acc: [p('hairpin')] },
    },
    likes: ['sporty', 'fresh'],
    stat: 'fitness',
    pace: [5, 38],
    gifts: { love: ['sportsdrink', 'taiyaki'], like: ['bubbletea', 'console', 'plush'], hate: ['perfume', 'novel'] },
    week: ['field', 'classroom', 'field', null],
    weekend: ['field', 'street', 'gate', 'cafe'],
  },
  wanqing: {
    name: ['苏晚晴', 'Su Wanqing'],
    role: ['美术社社长 · 大三', 'Art club president, year 3'],
    color: '#7cc47a',
    home: 'artroom',
    bio: [
      '说话轻声细语，画笔却很大胆。喜欢把重要的人悄悄画进速写本里。',
      'Soft-spoken, but bold with a brush. She quietly sketches the people who matter to her.',
    ],
    look: { sex: 'f', skin: '#ffeee4', eye: '#7a9a5a', hair: { style: 'wavy', bangs: 'wispy', color: '#b98a66', length: 430 } },
    outfits: {
      uniform: wear(p('sweater'), p('longskirt'), { shoes: p('boots', '#6b4a36', '#c9a77a'), acc: [p('beret')] }),
      casual: wear(p('blouse', '#fffaf0', '#7cc47a'), p('jeans', '#8fb0d8', '#fff'), {
        outer: p('cardigan', '#e9f2dc', '#7cc47a'),
        shoes: p('loafers'),
        acc: [p('glasses', '#8a6a48', '#fff')],
      }),
      date: {
        dress: p('sundress', '#e9f2dc', '#7cc47a'),
        outer: p('cardigan', '#fffaf0', '#c9a77a'),
        shoes: p('heels', '#c9a77a', '#fff'),
        acc: [p('beret', '#7cc47a', '#4f9d7a')],
      },
    },
    likes: ['artsy', 'cute'],
    stat: 'art',
    pace: [-10, 25],
    gifts: { love: ['paints', 'bouquet'], like: ['novel', 'tea', 'musicbox', 'macaron'], hate: ['console', 'sportsdrink'] },
    week: ['classroom', 'artroom', 'artroom', null],
    weekend: ['artroom', 'gate', 'cafe', 'rooftop'],
  },
  xinglan: {
    name: ['顾星澜', 'Gu Xinglan'],
    role: ['轻音社主唱 · 大二', 'Band vocalist, year 2'],
    color: '#b05ad8',
    home: 'musicroom',
    bio: [
      '舞台上光芒四射，舞台下懒得解释。讨厌黏人的家伙，却会给认可的人留一个位置。',
      "Dazzling on stage, wordless off it. She can't stand clingy people, but keeps a seat for those she respects.",
    ],
    look: { sex: 'f', skin: '#fbe6dc', eye: '#b05ad8', hair: { style: 'short', bangs: 'messy', color: '#8f8fb4', streak: '#e04a8a' } },
    outfits: {
      uniform: wear(p('tee', '#26242f', '#e04a8a'), p('cargo', '#3a3a48', '#22222c'), {
        outer: p('denim', '#3b3b4a', '#b08cff'),
        shoes: p('boots'),
        acc: [p('headphones')],
      }),
      casual: wear(p('hoodie', '#2c2a38', '#e04a8a'), p('pleated', '#2c2a38', '#e04a8a'), {
        shoes: p('boots'),
        legs: p('thighhighs', '#2c2a38', '#e04a8a'),
        acc: [p('shades')],
      }),
      date: wear(p('turtleneck', '#26242f', '#555'), p('pleated', '#7a2a4a', '#fff'), {
        outer: p('trench', '#2c2a38', '#e04a8a'),
        shoes: p('boots'),
        legs: p('tights'),
        acc: [p('necklace', '#d8d8e8', '#e04a8a')],
      }),
    },
    likes: ['street', 'cool'],
    stat: 'art',
    pace: [-42, -6],
    gifts: { love: ['vinyl', 'picks'], like: ['cocoa', 'console', 'bubbletea'], hate: ['plush', 'bouquet'] },
    week: [null, 'musicroom', 'musicroom', 'street'],
    weekend: ['musicroom', 'street', 'musicroom', 'rooftop'],
  },
  zhiwei: {
    name: ['叶知微', 'Ye Zhiwei'],
    role: ['计算机系王牌 · 大二', 'Computer science ace, year 2'],
    color: '#3ea6c9',
    home: 'lab',
    bio: [
      '计算机系的王牌，凌晨三点机房的常客。嘴上从不饶人，被夸奖时耳朵会先红。',
      'The ace of the computer science department and a regular in the lab at 3 a.m. Her tongue is merciless; her ears turn red at praise.',
    ],
    look: { sex: 'f', skin: '#ffeadf', eye: '#3ea6c9', hair: { style: 'twin', bangs: 'part', color: '#7fa3c7', length: 440 } },
    outfits: {
      uniform: wear(p('hoodie', '#f2f4ff', '#3ea6c9'), p('pleated', '#34384f', '#3ea6c9'), {
        shoes: p('sneakers', '#fff', '#3ea6c9'),
        legs: p('kneesocks'),
        acc: [p('glasses')],
      }),
      casual: wear(p('tee', '#ffffff', '#3ea6c9'), p('shorts', '#34384f', '#3ea6c9'), {
        outer: p('varsity', '#34384f', '#dfe9ff'),
        shoes: p('sneakers'),
        legs: p('thighhighs', '#fff', '#3ea6c9'),
        acc: [p('glasses'), p('headphones', '#f2f4ff', '#3ea6c9')],
      }),
      date: wear(p('sailor', '#ffffff', '#34507c'), p('pleated', '#34507c', '#fff'), {
        shoes: p('loafers'),
        legs: p('kneesocks', '#fff', '#34507c'),
        acc: [p('glasses'), p('bow', '#3ea6c9', '#fff')],
      }),
    },
    likes: ['fresh', 'cool'],
    stat: 'intellect',
    pace: [-18, 18],
    gifts: { love: ['keycaps', 'bubbletea'], like: ['console', 'taiyaki', 'macaron'], hate: ['bouquet', 'perfume'] },
    week: ['lab', 'classroom', 'lab', 'lab'],
    weekend: ['lab', 'cafe', 'lab', 'street'],
  },
  tangmi: {
    name: ['唐蜜', 'Tang Mi'],
    role: ['甜品社 · 咖啡店店员 · 大二', 'Dessert club and café barista, year 2'],
    color: '#e0507a',
    home: 'cafe',
    bio: [
      '笑起来像加了双份糖浆。最擅长把人逗得面红耳赤，然后装作什么都没发生。',
      'Her smile is a double shot of syrup. She loves making people blush, then acting as if nothing happened.',
    ],
    look: { sex: 'f', skin: '#fff0e6', eye: '#e0507a', hair: { style: 'buns', bangs: 'wispy', color: '#f4a3bd' } },
    outfits: {
      uniform: wear(p('blouse'), p('pleated', '#7a4d3a', '#fff'), {
        outer: p('cardigan'),
        shoes: p('loafers', '#7a4d3a', '#e8c25a'),
        legs: p('thighhighs'),
        acc: [p('bow')],
      }),
      casual: { dress: p('sundress'), shoes: p('heels'), legs: p('thighhighs'), acc: [p('bow'), p('bag', '#f4a3bd', '#c95f85')] },
      date: { dress: p('gown', '#c9406a', '#ffe1ea'), shoes: p('heels'), acc: [p('bow', '#fff', '#fff'), p('necklace')] },
    },
    likes: ['cute', 'elegant'],
    stat: 'charm',
    pace: [14, 46],
    gifts: { love: ['macaron', 'perfume'], like: ['plush', 'bouquet', 'bubbletea', 'musicbox'], hate: ['sportsdrink', 'keycaps'] },
    week: ['classroom', 'cafe', 'cafe', 'street'],
    weekend: ['street', 'cafe', 'cafe', 'cafe'],
  },
  bailu: {
    name: ['白露', 'Bai Lu'],
    role: ['天文社 · 大三', 'Astronomy club, year 3'],
    color: '#c9a13e',
    home: 'rooftop',
    bio: [
      '总在天台等星星的学姐。话很少，但每一句都像是认真想过才说出口。',
      'The senior who waits for stars on the roof. She says little, and means every word.',
    ],
    look: { sex: 'f', skin: '#fff3ee', eye: '#c9a13e', hair: { style: 'long', bangs: 'curtain', color: '#e6e6f2', length: 560, ahoge: true } },
    outfits: {
      uniform: wear(p('sailor'), p('longskirt', '#2b2f48', '#c9a13e'), { shoes: p('loafers'), acc: [p('hairpin'), p('necklace')] }),
      casual: wear(p('sweater', '#e6e9f7', '#fff'), p('longskirt', '#8fa6d8', '#fff'), {
        shoes: p('boots', '#4a4f6a', '#c9d0e8'),
        acc: [p('hairpin'), p('scarf', '#c9d0f0', '#fff')],
      }),
      date: { dress: p('gown', '#1c2460', '#ffe9a8'), shoes: p('heels', '#1c2460', '#fff'), acc: [p('hairpin'), p('necklace')] },
    },
    likes: ['artsy', 'elegant'],
    stat: 'eq',
    pace: [-15, 15],
    gifts: { love: ['starmap', 'cocoa'], like: ['musicbox', 'tea', 'novel'], hate: ['console', 'perfume'] },
    week: ['library', 'classroom', 'rooftop', 'rooftop'],
    weekend: ['artroom', 'library', 'rooftop', 'rooftop'],
  },
};

export const HEROINE_IDS = Object.keys(HEROINES);

/** The hero on his first day. */
export const HERO = {
  look: { sex: 'm', skin: '#ffe3cf', eye: '#4a7a6a', hair: { style: 'm', bangs: 'swept', color: '#3a3440' } },
  wear: { top: { id: 'tee' }, bottom: { id: 'jeans' }, shoes: { id: 'sneakers' }, acc: [] },
  owned: ['tee', 'shirt', 'jeans', 'slacks', 'sneakers'],
};

/** Affection needed for each stage of a relationship. */
export const LEVELS = [
  { at: 0, name: ['陌生人', 'Stranger'] },
  { at: 15, name: ['点头之交', 'Acquaintance'] },
  { at: 35, name: ['朋友', 'Friend'] },
  { at: 55, name: ['暧昧', 'Something More'] },
  { at: 75, name: ['心动', 'Heart Aflutter'] },
  { at: 90, name: ['两情相悦', 'Mutual'] },
];

export const STATS = {
  intellect: ['学识', 'Intellect'],
  fitness: ['体能', 'Fitness'],
  art: ['才艺', 'Art'],
  charm: ['魅力', 'Charm'],
  eq: ['情商', 'Empathy'],
};
