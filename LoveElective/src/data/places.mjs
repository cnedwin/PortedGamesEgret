// Campus locations: where they sit on the map (and how far above that point
// their label floats), which painted scene they use,
// when they are open and what can be done there. Text is [中文, English].

/** The four parts of a day and the light each one uses. */
export const SLOTS_OF_DAY = [
  { name: ['上午', 'Morning'], light: 'day' },
  { name: ['下午', 'Afternoon'], light: 'day' },
  { name: ['傍晚', 'Evening'], light: 'dusk' },
  { name: ['夜晚', 'Night'], light: 'night' },
];

export const DAYS_IN_TERM = 30;
export const WEEKDAYS = [
  ['周一', 'Mon'],
  ['周二', 'Tue'],
  ['周三', 'Wed'],
  ['周四', 'Thu'],
  ['周五', 'Fri'],
  ['周六', 'Sat'],
  ['周日', 'Sun'],
];

/**
 * Activities. `gain` raises stats, `energy` is spent (negative) or restored,
 * `pay` earns money scaled by a stat, `cost` is paid up front.
 * `special` opens a screen instead of spending the time slot.
 */
export const PLACES = {
  gate: {
    name: ['校门 · 樱花道', 'Main Gate'],
    scene: 'gate',
    map: [640, 668],
    pin: 96,
    night: true,
    acts: [
      { id: 'board', name: ['查看公告栏', 'Read the notice board'], special: 'quests' },
      { id: 'flyers', name: ['发传单打工', 'Hand out flyers'], energy: -18, pay: [50, 'fitness', 0.5], gain: { fitness: 1 }, work: true },
    ],
  },
  classroom: {
    name: ['教学楼', 'Lecture Hall'],
    scene: 'classroom',
    map: [330, 440],
    pin: 150,
    night: false,
    acts: [{ id: 'lecture', name: ['认真听课', 'Attend a lecture'], energy: -15, gain: { intellect: 2, eq: 1 } }],
  },
  library: {
    name: ['图书馆', 'Library'],
    scene: 'library',
    map: [520, 300],
    pin: 126,
    night: false,
    acts: [{ id: 'study', name: ['自习', 'Study'], energy: -18, gain: { intellect: 3 } }],
  },
  field: {
    name: ['操场', 'Sports Field'],
    scene: 'field',
    map: [960, 440],
    pin: 96,
    night: false,
    acts: [{ id: 'train', name: ['跑步训练', 'Run laps'], energy: -22, gain: { fitness: 3 } }],
  },
  artroom: {
    name: ['美术室', 'Art Room'],
    scene: 'artroom',
    map: [180, 590],
    pin: 118,
    night: false,
    acts: [{ id: 'sketch', name: ['练习素描', 'Practise sketching'], energy: -15, gain: { art: 3 } }],
  },
  musicroom: {
    name: ['音乐室', 'Music Room'],
    scene: 'musicroom',
    map: [430, 600],
    pin: 110,
    night: false,
    acts: [{ id: 'sing', name: ['练歌', 'Vocal practice'], energy: -15, gain: { art: 2, charm: 2 } }],
  },
  lab: {
    name: ['机房', 'Computer Lab'],
    scene: 'lab',
    map: [840, 600],
    pin: 128,
    night: true,
    acts: [
      { id: 'code', name: ['接个小外包', 'Take a small coding job'], energy: -20, pay: [40, 'intellect', 1.2], gain: { intellect: 2 }, work: true },
    ],
  },
  cafe: {
    name: ['咖啡店', 'Café'],
    scene: 'cafe',
    map: [1090, 590],
    pin: 108,
    night: true,
    acts: [
      { id: 'barista', name: ['咖啡店打工', 'Work a café shift'], energy: -20, pay: [60, 'charm', 1], gain: { eq: 1, charm: 1 }, work: true },
      { id: 'coffee', name: ['点一杯咖啡', 'Order a coffee'], cost: 18, energy: 20, free: true },
    ],
  },
  rooftop: {
    name: ['天台 · 天文台', 'Rooftop Observatory'],
    scene: 'rooftop',
    map: [790, 310],
    pin: 214,
    night: true,
    acts: [{ id: 'gaze', name: ['吹风发呆', 'Watch the sky'], energy: 6, gain: { eq: 3 } }],
  },
  street: {
    name: ['商业街', 'Shopping Street'],
    scene: 'street',
    map: [1090, 300],
    pin: 104,
    night: true,
    acts: [
      { id: 'boutique', name: ['花漾衣橱 · 服装', 'Bloom Boutique: clothes'], special: 'shop:boutique' },
      { id: 'giftshop', name: ['礼物小铺 · 礼物', 'The Gift Nook: presents'], special: 'shop:giftshop' },
      { id: 'mart', name: ['便利店 · 补给', 'Corner Mart: supplies'], special: 'shop:mart' },
      { id: 'salon', name: ['发型屋 · 发型', 'Hair Studio: hairstyles'], special: 'shop:salon' },
    ],
  },
  dorm: {
    name: ['宿舍', 'Dormitory'],
    scene: 'dorm',
    map: [170, 310],
    pin: 148,
    night: true,
    acts: [
      { id: 'wardrobe', name: ['打开衣橱', 'Open the wardrobe'], special: 'wardrobe' },
      { id: 'nap', name: ['小憩一会儿', 'Take a nap'], energy: 40 },
      { id: 'sleep', name: ['睡到明天', 'Sleep until morning'], special: 'sleep' },
    ],
  },
};

export const PLACE_IDS = Object.keys(PLACES);

/** Places a couple can go on a date, with what the outing costs. */
export const DATE_SPOTS = [
  { id: 'cafe', name: ['咖啡店小坐', 'Coffee together'], cost: 50 },
  { id: 'street', name: ['逛商业街', 'Stroll the shops'], cost: 80 },
  { id: 'gate', name: ['樱花道散步', 'Walk under the cherry trees'], cost: 0 },
  { id: 'rooftop', name: ['天台看风景', 'Rooftop view'], cost: 0 },
];
