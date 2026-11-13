// Everything that can be owned: clothes and accessories (painted by
// src/art/garments.mjs under the same ids), hairstyles, gifts and consumables.
// Text is written as [中文, English].

/** Style tags an outfit can score in. */
export const STYLES = {
  fresh: ['清爽', 'Fresh'],
  preppy: ['学院', 'Preppy'],
  sporty: ['运动', 'Sporty'],
  street: ['街头', 'Street'],
  artsy: ['文艺', 'Artsy'],
  elegant: ['优雅', 'Elegant'],
  cute: ['可爱', 'Cute'],
  cool: ['酷感', 'Cool'],
};

export const SLOTS = {
  hair: ['发型', 'Hair'],
  top: ['上装', 'Top'],
  bottom: ['下装', 'Bottom'],
  dress: ['连衣裙', 'Dress'],
  outer: ['外套', 'Outerwear'],
  shoes: ['鞋子', 'Shoes'],
  legs: ['袜子', 'Legwear'],
  acc: ['饰品', 'Accessories'],
};

/**
 * Clothes. `only: 'f'` pieces cannot be worn by the hero; he buys them as
 * presents, and the heroine who receives one can then be dressed in it.
 * Accessories have a `zone`; only one accessory is worn per zone.
 */
export const CLOTHES = {
  shirt: { name: ['白衬衫', 'White Shirt'], slot: 'top', price: 0, charm: 2, styles: { preppy: 2, fresh: 1, elegant: 1 } },
  tee: { name: ['印花T恤', 'Graphic Tee'], slot: 'top', price: 0, charm: 1, styles: { fresh: 2, street: 1, sporty: 1 } },
  hoodie: { name: ['连帽卫衣', 'Hoodie'], slot: 'top', price: 160, charm: 2, styles: { street: 2, fresh: 1, cute: 1 } },
  sweater: { name: ['针织毛衣', 'Knit Sweater'], slot: 'top', price: 180, charm: 3, styles: { artsy: 2, preppy: 1, elegant: 1 } },
  turtleneck: { name: ['高领衫', 'Turtleneck'], slot: 'top', price: 220, charm: 3, styles: { cool: 2, elegant: 2 } },
  jersey: { name: ['运动球衣', 'Sports Jersey'], slot: 'top', price: 120, charm: 2, styles: { sporty: 3, fresh: 1 } },
  sailor: { name: ['水手服上衣', 'Sailor Top'], slot: 'top', price: 240, charm: 3, styles: { preppy: 2, cute: 2 }, only: 'f' },
  blouse: { name: ['蝴蝶结衬衫', 'Ribbon Blouse'], slot: 'top', price: 220, charm: 3, styles: { cute: 2, elegant: 2 }, only: 'f' },

  slacks: { name: ['修身西裤', 'Slim Slacks'], slot: 'bottom', singleDye: true, price: 0, charm: 2, styles: { preppy: 2, elegant: 1 } },
  jeans: { name: ['水洗牛仔裤', 'Washed Jeans'], slot: 'bottom', price: 0, charm: 1, styles: { fresh: 2, street: 1 } },
  cargo: { name: ['工装裤', 'Cargo Trousers'], slot: 'bottom', price: 190, charm: 2, styles: { street: 3, cool: 1 } },
  shorts: { name: ['运动短裤', 'Track Shorts'], slot: 'bottom', price: 90, charm: 1, styles: { sporty: 3, fresh: 1 } },
  pleated: { name: ['百褶裙', 'Pleated Skirt'], slot: 'bottom', price: 200, charm: 3, styles: { preppy: 2, cute: 2 }, only: 'f' },
  longskirt: { name: ['及踝长裙', 'Long Skirt'], slot: 'bottom', price: 230, charm: 3, styles: { artsy: 3, elegant: 1 }, only: 'f' },

  sundress: { name: ['夏日连衣裙', 'Sundress'], slot: 'dress', price: 320, charm: 5, styles: { cute: 3, fresh: 2 }, only: 'f' },
  gown: { name: ['星夜礼服', 'Starlit Gown'], slot: 'dress', price: 680, charm: 8, styles: { elegant: 5, cool: 1 }, only: 'f' },

  blazer: { name: ['学院西装', 'Academy Blazer'], slot: 'outer', price: 320, charm: 4, styles: { preppy: 3, elegant: 1 } },
  cardigan: { name: ['软糯开衫', 'Soft Cardigan'], slot: 'outer', price: 210, charm: 3, styles: { cute: 2, artsy: 2 } },
  varsity: { name: ['棒球夹克', 'Varsity Jacket'], slot: 'outer', price: 280, charm: 4, styles: { street: 2, sporty: 2 } },
  trench: { name: ['长款风衣', 'Trench Coat'], slot: 'outer', price: 460, charm: 6, styles: { elegant: 3, cool: 2 } },
  denim: { name: ['牛仔外套', 'Denim Jacket'], slot: 'outer', price: 240, charm: 3, styles: { street: 2, fresh: 2 } },

  sneakers: { name: ['小白鞋', 'White Sneakers'], slot: 'shoes', price: 0, charm: 1, styles: { fresh: 1, sporty: 1, street: 1 } },
  loafers: { name: ['乐福鞋', 'Loafers'], slot: 'shoes', price: 180, charm: 2, styles: { preppy: 2, elegant: 1 } },
  boots: { name: ['马丁靴', 'Lace-up Boots'], slot: 'shoes', price: 260, charm: 3, styles: { cool: 2, street: 2 } },
  heels: { name: ['细跟鞋', 'Heels'], slot: 'shoes', price: 260, charm: 3, styles: { elegant: 3 }, only: 'f' },

  socks: { name: ['短袜', 'Ankle Socks'], slot: 'legs', price: 20, charm: 0, styles: { fresh: 1 } },
  kneesocks: { name: ['及膝袜', 'Knee Socks'], slot: 'legs', price: 60, charm: 1, styles: { preppy: 1, cute: 1 }, only: 'f' },
  thighhighs: { name: ['过膝袜', 'Thigh-highs'], slot: 'legs', price: 80, charm: 2, styles: { cute: 2 }, only: 'f' },
  tights: { name: ['连裤袜', 'Tights'], slot: 'legs', singleDye: true, price: 70, charm: 2, styles: { elegant: 2 }, only: 'f' },

  glasses: { zone: 'face', name: ['圆框眼镜', 'Round Glasses'], slot: 'acc', price: 120, charm: 2, styles: { preppy: 1, artsy: 2 } },
  shades: { zone: 'face', name: ['渐变墨镜', 'Gradient Shades'], slot: 'acc', price: 180, charm: 2, styles: { cool: 3 } },
  beret: { zone: 'head', name: ['贝雷帽', 'Beret'], slot: 'acc', price: 140, charm: 2, styles: { artsy: 3 } },
  cap: { zone: 'head', name: ['棒球帽', 'Baseball Cap'], slot: 'acc', price: 110, charm: 1, styles: { street: 2, sporty: 1 } },
  bow: { zone: 'head', name: ['大蝴蝶结', 'Big Bow'], slot: 'acc', price: 90, charm: 2, styles: { cute: 3 }, only: 'f' },
  headphones: { zone: 'head', name: ['头戴耳机', 'Headphones'], slot: 'acc', price: 260, charm: 2, styles: { street: 2, cool: 2 } },
  hairpin: { zone: 'hair', name: ['星星发夹', 'Star Hairpin'], slot: 'acc', price: 70, charm: 1, styles: { cute: 2 } },
  necklace: { zone: 'neck', name: ['星芒项链', 'Starlight Necklace'], slot: 'acc', price: 240, charm: 3, styles: { elegant: 3 } },
  tie: { zone: 'neck', name: ['斜纹领带', 'Striped Tie'], slot: 'acc', price: 90, charm: 2, styles: { preppy: 3 } },
  scarf: { zone: 'wrap', name: ['针织围巾', 'Knit Scarf'], slot: 'acc', price: 130, charm: 2, styles: { artsy: 2, cute: 1 } },
  bag: { zone: 'bag', name: ['邮差包', 'Messenger Bag'], slot: 'acc', price: 200, charm: 2, styles: { artsy: 1, preppy: 1, fresh: 1 } },
};

/** Hero hairstyles (fringe shapes of the character painter). */
export const HAIRSTYLES = {
  swept: { name: ['清爽侧分', 'Side Sweep'], price: 0 },
  crop: { name: ['利落短发', 'Clean Crop'], price: 80 },
  curtain: { name: ['中分微卷', 'Curtain Fringe'], price: 120 },
  spiky: { name: ['元气刺猬', 'Spiky'], price: 120 },
  messy: { name: ['慵懒碎发', 'Tousled'], price: 150 },
};

/** Presents. `tags` are matched against each heroine's tastes. */
export const GIFTS = {
  tea: { name: ['伯爵红茶', 'Earl Grey Tea'], price: 60, icon: ['cup', '#c9703a'] },
  pen: { name: ['钢笔', 'Fountain Pen'], price: 150, icon: ['pen', '#2f3a63'] },
  sportsdrink: { name: ['运动饮料', 'Sports Drink'], price: 25, icon: ['bottle', '#5ad0ff'] },
  taiyaki: { name: ['鲷鱼烧', 'Taiyaki'], price: 30, icon: ['fish', '#e8a04a'] },
  paints: { name: ['水彩颜料', 'Watercolours'], price: 120, icon: ['palette', '#f4a3bd'] },
  bouquet: { name: ['花束', 'Bouquet'], price: 90, icon: ['flowers', '#ff8fb0'] },
  vinyl: { name: ['黑胶唱片', 'Vinyl Record'], price: 160, icon: ['disc', '#e04a8a'] },
  picks: { name: ['拨片套装', 'Guitar Picks'], price: 50, icon: ['picks', '#b08cff'] },
  keycaps: { name: ['透光键帽', 'Glow Keycaps'], price: 130, icon: ['keys', '#7df0d0'] },
  bubbletea: { name: ['珍珠奶茶', 'Bubble Tea'], price: 28, icon: ['boba', '#d9a36a'] },
  macaron: { name: ['马卡龙礼盒', 'Macaron Box'], price: 70, icon: ['macaron', '#f4a3bd'] },
  perfume: { name: ['香水', 'Perfume'], price: 220, icon: ['perfume', '#ffb3cf'] },
  starmap: { name: ['手绘星图', 'Star Chart'], price: 140, icon: ['chart', '#3a3f8a'] },
  cocoa: { name: ['热可可', 'Hot Cocoa'], price: 26, icon: ['cup', '#7a4d24'] },
  plush: { name: ['小熊玩偶', 'Teddy Bear'], price: 110, icon: ['bear', '#d9a36a'] },
  novel: { name: ['精装小说', 'Hardcover Novel'], price: 80, icon: ['book', '#8a5fb0'] },
  console: { name: ['掌上游戏机', 'Handheld Console'], price: 380, icon: ['console', '#ff6b7a'] },
  musicbox: { name: ['星空八音盒', 'Starry Music Box'], price: 300, icon: ['musicbox', '#8fa6ff'] },
};

/** Things the hero uses himself. `use` is applied by the rules in src/sim.mjs. */
export const SUPPLIES = {
  energydrink: { name: ['能量饮料', 'Energy Drink'], price: 30, icon: ['bottle', '#ffd76a'], use: { energy: 35 }, desc: ['体力 +35', 'Energy +35'] },
  logicbook: {
    name: ['《逻辑学入门》', 'Intro to Logic'],
    price: 90,
    icon: ['book', '#3f6fb5'],
    use: { intellect: 3 },
    desc: ['学识 +3', 'Intellect +3'],
  },
  proteinbar: { name: ['蛋白棒', 'Protein Bar'], price: 60, icon: ['bar', '#c9703a'], use: { fitness: 3 }, desc: ['体能 +3', 'Fitness +3'] },
  sketchbook: { name: ['速写本', 'Sketchbook'], price: 80, icon: ['book', '#e3b04b'], use: { art: 3 }, desc: ['才艺 +3', 'Art +3'] },
  talkbook: { name: ['《沟通的艺术》', 'The Art of Talking'], price: 90, icon: ['book', '#4f9d7a'], use: { eq: 3 }, desc: ['情商 +3', 'Empathy +3'] },
  magazine: { name: ['穿搭杂志', 'Style Magazine'], price: 70, icon: ['book', '#e04a8a'], use: { charm: 3 }, desc: ['魅力 +3', 'Charm +3'] },
};

/** Which shop sells what. */
export const SHOPS = {
  boutique: { name: ['花漾衣橱', 'Bloom Boutique'], kind: 'clothes', stock: Object.keys(CLOTHES).filter(id => CLOTHES[id].price > 0) },
  giftshop: { name: ['礼物小铺', 'The Gift Nook'], kind: 'gifts', stock: Object.keys(GIFTS).filter(id => id !== 'musicbox') },
  mart: { name: ['便利店', 'Corner Mart'], kind: 'supplies', stock: Object.keys(SUPPLIES) },
  salon: { name: ['发型屋', 'Hair Studio'], kind: 'hair', stock: Object.keys(HAIRSTYLES) },
};

/** Dye swatches offered in the wardrobe; any colour can also be mixed with the sliders. */
export const DYES = [
  '#ffffff',
  '#f4f6fb',
  '#2b2f48',
  '#3a3340',
  '#b23a4a',
  '#e8455f',
  '#ff8a5c',
  '#ffd76a',
  '#f5e1c4',
  '#7cc47a',
  '#4f9d7a',
  '#7df0d0',
  '#8fd3ff',
  '#5b7fb8',
  '#2f3a63',
  '#b08cff',
  '#8a5fb0',
  '#f4a3bd',
  '#ffb3cf',
  '#c98a4b',
  '#7a4d24',
  '#8d8f9a',
];

export const HAIR_DYES = [
  '#2a2a36',
  '#3a3440',
  '#5a4638',
  '#8a5a3a',
  '#c9703a',
  '#e3b04b',
  '#e6e6f2',
  '#8f8fb4',
  '#7fa3c7',
  '#3f6fb5',
  '#4f9d7a',
  '#f4a3bd',
  '#b23a4a',
  '#8a5fb0',
];
