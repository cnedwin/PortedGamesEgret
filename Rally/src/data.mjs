// Everything the game is made of, kept apart from how it behaves: the eight
// racers, the items, the speed classes, the driving numbers and every piece
// of text in both languages.

/** Driving numbers. One unit is one metre; speeds are metres per second. */
export const DRIVE = {
  radius: 1.3, // a kart is a circle this big for walls, other karts and items
  topSpeed: 38,
  reverseSpeed: 11,
  acceleration: 22,
  braking: 46,
  coasting: 8,
  turnRate: 2.15, // radians per second at full lock
  grip: 13, // how fast sideways slip dies away, per second
  driftGrip: 2.6,
  airGrip: 0.4,
  grassFactor: 0.48, // share of the top speed kept on grass
  boostBonus: 15, // extra top speed while boosting
  boostPush: 60, // acceleration while boosting
  gravity: 38,
  driftMinSpeed: 12,
  /** Seconds of drifting needed for a blue, orange and purple mini-turbo. */
  driftLevels: [0.9, 1.9, 3.0],
  /** Length and strength of each mini-turbo. */
  turboSeconds: [0.6, 0.95, 1.4],
  turboStrength: [0.7, 0.85, 1],
  chiliSeconds: 1.3,
  padSeconds: 1.0,
  bellSeconds: 7.5,
  bellBonus: 7,
  spinSeconds: 1.1,
  tumbleSeconds: 1.6,
  shrinkSeconds: 5,
  shrinkSpeed: 0.74,
  countdown: 3,
};

/**
 * The racers. Stats run from 1 to 5: `speed` raises the top speed, `accel`
 * the pick-up, `handling` the turning and drift charge, and `weight` decides
 * who is pushed aside in a bump. `body` is the kart's paint, `trim` its
 * second colour and `seal` the character on the racer's badge.
 */
export const RACERS = [
  {
    id: 'lion',
    seal: '狮',
    name: { zh: '醒狮 · 阿福', en: 'Fu the Lion Dancer' },
    blurb: { zh: '锣鼓一响，样样均衡。', en: 'Drums roll and everything is in balance.' },
    body: 0xd8262c,
    trim: 0xf7c531,
    stats: { speed: 3, accel: 3, handling: 3, weight: 3 },
  },
  {
    id: 'panda',
    seal: '熊',
    name: { zh: '熊猫 · 团团', en: 'Tuan the Panda' },
    blurb: { zh: '看着慢吞吞，起步却不含糊。', en: 'Looks sleepy, leaves the line smartly.' },
    body: 0x4f9d3a,
    trim: 0xf4f1e6,
    stats: { speed: 3, accel: 4, handling: 3, weight: 2 },
  },
  {
    id: 'monkey',
    seal: '猴',
    name: { zh: '美猴王 · 小圣', en: 'Sheng the Monkey King' },
    blurb: { zh: '筋斗云般的过弯。', en: 'Corners like a somersault cloud.' },
    body: 0xf2a81d,
    trim: 0xc62828,
    stats: { speed: 2, accel: 4, handling: 5, weight: 2 },
  },
  {
    id: 'rabbit',
    seal: '兔',
    name: { zh: '玉兔 · 月月', en: 'Yue the Jade Rabbit' },
    blurb: { zh: '身轻如燕，一踩就走。', en: 'Light as a feather and gone in a blink.' },
    body: 0xb9a4e8,
    trim: 0xfdfdfd,
    stats: { speed: 2, accel: 5, handling: 4, weight: 1 },
  },
  {
    id: 'dragon',
    seal: '龙',
    name: { zh: '青龙 · 云起', en: 'Yun the Azure Dragon' },
    blurb: { zh: '起步沉稳，放开了谁也追不上。', en: 'Slow to wake, impossible to catch.' },
    body: 0x0f8f8a,
    trim: 0xf2c94c,
    stats: { speed: 5, accel: 1, handling: 2, weight: 5 },
  },
  {
    id: 'warrior',
    seal: '俑',
    name: { zh: '秦俑 · 老秦', en: 'Qin the Terracotta Warrior' },
    blurb: { zh: '千年陶土，撞谁谁让路。', en: 'Two thousand years of clay; others make way.' },
    body: 0x9a6a48,
    trim: 0x3d5a80,
    stats: { speed: 4, accel: 2, handling: 2, weight: 4 },
  },
  {
    id: 'opera',
    seal: '戏',
    name: { zh: '花脸 · 铁面', en: 'Tie the Opera Mask' },
    blurb: { zh: '一亮相，弯道就是舞台。', en: 'Strikes a pose and owns the corner.' },
    body: 0x1f3fa8,
    trim: 0xffffff,
    stats: { speed: 3, accel: 3, handling: 4, weight: 2 },
  },
  {
    id: 'tiger',
    seal: '虎',
    name: { zh: '虎头娃 · 妞妞', en: 'Niu in the Tiger Hat' },
    blurb: { zh: '戴上虎头帽，灵巧又机灵。', en: 'Tiger hat on, quick and nimble.' },
    body: 0xf07a1a,
    trim: 0xffe08a,
    stats: { speed: 2, accel: 4, handling: 4, weight: 1 },
  },
];

/** What a stat of 1 to 5 does to a driving number. */
const scale = (value, low, high) => low + ((high - low) * (value - 1)) / 4;
/** Driving numbers for one racer. */
export function racerTuning(racer) {
  const { speed, accel, handling, weight } = racer.stats;
  return {
    topSpeed: DRIVE.topSpeed * scale(speed, 0.93, 1.07),
    acceleration: DRIVE.acceleration * scale(accel, 0.8, 1.28),
    turnRate: DRIVE.turnRate * scale(handling, 0.88, 1.14),
    driftCharge: scale(handling, 0.92, 1.1),
    mass: scale(weight, 0.75, 1.4),
  };
}

/**
 * Items. `chances` is how likely each one is by race position, first place
 * first: leaders get things to defend with, the back of the field gets the
 * means to catch up.
 */
export const ITEMS = {
  chili: {
    icon: '🌶️',
    name: { zh: '辣椒', en: 'Chili' },
    chances: [30, 28, 24, 20, 16, 12, 8, 6],
  },
  chili3: {
    icon: '🌶️',
    count: 3,
    name: { zh: '三连辣椒', en: 'Triple Chili' },
    chances: [0, 4, 8, 12, 16, 20, 22, 22],
  },
  firecracker: {
    icon: '🧨',
    name: { zh: '爆竹', en: 'Firecracker' },
    chances: [38, 26, 18, 12, 8, 4, 2, 0],
  },
  cuju: {
    icon: '⚽',
    name: { zh: '蹴鞠', en: 'Cuju Ball' },
    chances: [32, 26, 20, 16, 12, 8, 6, 4],
  },
  kite: {
    icon: '🪁',
    name: { zh: '纸鸢', en: 'Swallow Kite' },
    chances: [0, 14, 20, 20, 18, 16, 12, 10],
  },
  bell: {
    icon: '🔔',
    name: { zh: '金钟罩', en: 'Golden Bell' },
    chances: [0, 0, 4, 8, 12, 16, 20, 22],
  },
  thunder: {
    icon: '🥁',
    name: { zh: '雷公鼓', en: 'Thunder Drum' },
    chances: [0, 0, 0, 2, 4, 8, 12, 16],
  },
  rocket: {
    icon: '🚀',
    name: { zh: '窜天猴', en: 'Sky Rocket' },
    chances: [0, 2, 6, 10, 14, 16, 18, 20],
  },
};
export const ITEM_KEYS = Object.keys(ITEMS);

/**
 * Speed classes. `speed` scales every kart's top speed, `rivals` scales the
 * rivals on top of that, `skill` is how hard they corner and how often they
 * drift, and `catchUp` is how much they speed up or ease off to stay near
 * the player.
 */
export const CLASSES = [
  { id: 'stroll', name: { zh: '闲庭信步', en: 'Stroll' }, speed: 0.8, rivals: 0.9, skill: 0.55, catchUp: 0.08 },
  { id: 'gallop', name: { zh: '策马奔腾', en: 'Gallop' }, speed: 0.92, rivals: 0.95, skill: 0.75, catchUp: 0.12 },
  { id: 'gale', name: { zh: '追风逐电', en: 'Gale' }, speed: 1, rivals: 1, skill: 0.95, catchUp: 0.15 },
];
export const LAP_CHOICES = [1, 3, 5];

/** Text in both languages; `{name}` style slots are filled in by the page. */
export const TEXT = {
  zh: {
    title: '锦绣飞车',
    subtitle: '山水环道',
    tagline: '基于新白鹭引擎开发的 3D 赛车游戏 Demo',
    start: '开始',
    pressStart: '点击或按回车',
    choose: '选择车手',
    klass: '级别',
    laps: '圈数',
    race: '出发！',
    back: '返回',
    speed: '极速',
    accel: '加速',
    handling: '操控',
    weight: '重量',
    lap: '圈',
    place: ['第一', '第二', '第三', '第四', '第五', '第六', '第七', '第八'],
    go: '出发！',
    finalLap: '最后一圈！',
    wrongWay: '方向反了',
    finish: '完赛！',
    results: '比赛结果',
    time: '用时',
    bestLap: '最快圈',
    again: '再来一局',
    menu: '回到标题',
    paused: '暂停',
    resume: '继续',
    restart: '重新开始',
    quit: '退出比赛',
    you: '你',
    sound: '声音',
    on: '开',
    off: '关',
    quality: '画质',
    qualities: { high: '高', medium: '中', low: '低' },
    language: 'English',
    help: 'W/↑ 油门　S/↓ 刹车　A D/← → 转向　空格 小跳与漂移　E 使用道具　C 回头看　Esc 暂停',
    tip: '漂移时火花由蓝变橙再变紫，松开即可加速；倒数到“2”之后再踩油门可以弹射起步。',
    kmh: '公里/时',
  },
  en: {
    title: 'Jinxiu Rally',
    subtitle: 'Mountain and Water Circuit',
    tagline: 'A 3D kart racing demo built with Egret Rebuild',
    start: 'Start',
    pressStart: 'Click or press Enter',
    choose: 'Choose your racer',
    klass: 'Class',
    laps: 'Laps',
    race: 'Race!',
    back: 'Back',
    speed: 'Speed',
    accel: 'Pick-up',
    handling: 'Handling',
    weight: 'Weight',
    lap: 'Lap',
    place: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'],
    go: 'GO!',
    finalLap: 'Final lap!',
    wrongWay: 'Wrong way',
    finish: 'Finish!',
    results: 'Results',
    time: 'Time',
    bestLap: 'Best lap',
    again: 'Race again',
    menu: 'Back to title',
    paused: 'Paused',
    resume: 'Resume',
    restart: 'Restart',
    quit: 'Quit race',
    you: 'You',
    sound: 'Sound',
    on: 'On',
    off: 'Off',
    quality: 'Quality',
    qualities: { high: 'High', medium: 'Medium', low: 'Low' },
    language: '中文',
    help: 'W/↑ accelerate   S/↓ brake   A D/← → steer   Space hop and drift   E use item   C look back   Esc pause',
    tip: 'Drift sparks turn blue, orange, then purple: let go for a boost. Press the accelerator after the count reaches 2 for a rocket start.',
    kmh: 'km/h',
  },
};
