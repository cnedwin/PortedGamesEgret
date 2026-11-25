// 六幅现场的摆放：背景画多大，人物和物件放在哪里（x 是中心，y 是脚底，h 是高度，都用背景的像素），哪件证物
// 点哪里，有什么环境动态。证物默认就是同名人物或物件的画框；画在背景里的东西（梁、纸槽、书架）给一个矩形。
// 位置用 tools/assets/preview.py 合成预览图来调。
// Where everything stands in the six scenes: the size of the painted ground, where each figure and thing goes (x is
// its centre, y its feet, h its height, all in pixels of the ground), where each piece of evidence is tapped, and
// what moves in the air. A piece of evidence is the frame of the figure or thing of the same name unless it is part
// of the painting itself (a beam, a vat, a bookcase), which gets a rectangle. Positions are tuned with the composed
// previews of tools/assets/preview.py.

const SIZE = [3840, 1440];

export const SCENES = {
  c1: {
    bg: 'bg-c1',
    size: SIZE,
    start: [1900, 1],
    items: [
      { art: 'p-noose', spot: 'rope', x: 2420, y: 975, h: 430, z: 900 },
      { art: 'p-stool', spot: 'stool', x: 2130, y: 1230, h: 150 },
      { art: 'p-bodymat', spot: 'body', x: 1350, y: 1355, h: 210 },
      { art: 'f-qin', x: 860, y: 1372, h: 500, flip: true },
      { art: 'f-xiaoqi', spot: 'xiaoqi', x: 470, y: 1410, h: 580 },
      { art: 'f-sunda', spot: 'sunda', x: 1870, y: 1415, h: 680 },
      { art: 'f-du', spot: 'du', x: 3120, y: 1405, h: 680 },
      { art: 'f-fenglu', spot: 'fenglu', x: 3520, y: 1420, h: 700 }
    ],
    spots: {
      beam: [1780, 470, 760, 120],
      vat: [2230, 990, 680, 290],
      form: [3580, 990, 200, 240]
    },
    ambient: [
      { kind: 'mist', rect: [0, 260, 3840, 320], count: 9 },
      { kind: 'water', rect: [3150, 960, 690, 330], count: 18 },
      { kind: 'dust', rect: [1780, 560, 1150, 520], count: 22 }
    ]
  },
  c2: {
    bg: 'bg-c2',
    size: SIZE,
    start: [2600, 1],
    items: [
      { art: 'p-gourd', spot: 'gourd', x: 2560, y: 1085, h: 110, z: 1000 },
      { art: 'p-bodymat', spot: 'body', x: 2050, y: 1428, h: 200 },
      { art: 'f-qin', x: 1700, y: 1432, h: 470, flip: true },
      { art: 'p-forms', spot: 'form', x: 1880, y: 1440, h: 80, z: 1441 },
      { art: 'p-purse', spot: 'purse', x: 2330, y: 1436, h: 100 },
      { art: 'p-bales', spot: 'bales', x: 2680, y: 1330, h: 300 },
      { art: 'f-hesao', spot: 'hesao', x: 2930, y: 1436, h: 640 },
      { art: 'f-qianwu', spot: 'qianwu', x: 3190, y: 1436, h: 680 },
      { art: 'f-zhangpo', spot: 'zhangpo', x: 3440, y: 1400, h: 640 },
      { art: 'f-weiheng', spot: 'weiheng', x: 3690, y: 1438, h: 720 }
    ],
    spots: {
      boat: [2230, 980, 430, 170]
    },
    ambient: [
      { kind: 'mist', rect: [0, 520, 3840, 300], count: 11 },
      { kind: 'water', rect: [0, 820, 2300, 420], count: 32 }
    ]
  },
  c3: {
    bg: 'bg-c3',
    size: SIZE,
    start: [2300, 1],
    items: [
      { art: 'p-teatable', spot: 'body', x: 3400, y: 1330, h: 600 },
      { art: 'p-stove', spot: 'brazier', x: 2960, y: 1340, h: 220 },
      { art: 'p-forms', spot: 'form', x: 2280, y: 1010, h: 100, z: 1010 },
      { art: 'f-lu', spot: 'lu', x: 560, y: 1425, h: 720 },
      { art: 'f-liu', spot: 'liu', x: 1150, y: 1420, h: 650 },
      { art: 'f-afu', spot: 'afu', x: 1650, y: 1420, h: 620 },
      { art: 'f-zhengqi', spot: 'zhengqi', x: 2400, y: 1425, h: 690 },
      { art: 'f-qin', x: 2700, y: 1430, h: 470, flip: true }
    ],
    spots: {
      ewer: [3049, 778, 100, 180],
      whitecups: [3156, 875, 150, 80],
      jianzhan: [3440, 905, 100, 70],
      sleeve: [3480, 1000, 190, 180]
    },
    ambient: [
      { kind: 'rain', rect: [300, 330, 380, 720], count: 40 },
      { kind: 'dust', rect: [1200, 300, 1700, 600], count: 14 }
    ]
  },
  c4: {
    bg: 'bg-c4',
    size: SIZE,
    start: [1900, 1],
    items: [
      { art: 'p-bodymat', spot: 'body', x: 1900, y: 1400, h: 210 },
      { art: 'f-qin', x: 1420, y: 1410, h: 500, flip: true },
      { art: 'p-knives', spot: 'knives', x: 2620, y: 1250, h: 300 },
      { art: 'p-lamp', spot: 'lamp', x: 2700, y: 905, h: 300, z: 850 },
      { art: 'p-oiljar', spot: 'oiljar', x: 3440, y: 1340, h: 180 },
      { art: 'p-rack', spot: 'rack', x: 3640, y: 1180, h: 780, z: 1000 },
      { art: 'p-proof', spot: 'proof', x: 560, y: 880, h: 140, z: 850 },
      { art: 'f-xiaoman', spot: 'xiaoman', x: 420, y: 1420, h: 620 },
      { art: 'f-laoguo', spot: 'laoguo', x: 1000, y: 1415, h: 650 },
      { art: 'f-du', spot: 'du', x: 2250, y: 1430, h: 690 },
      { art: 'f-fenglu', spot: 'fenglu', x: 3120, y: 1435, h: 700 }
    ],
    spots: {
      ground: [1560, 1340, 700, 100],
      form: [3170, 1010, 190, 220]
    },
    ambient: [
      { kind: 'smoke', x: 2050, y: 560, h: 520, count: 10 },
      { kind: 'smoke', x: 3000, y: 1000, h: 380, count: 7 },
      { kind: 'dust', rect: [1700, 100, 900, 700], count: 20 }
    ]
  },
  c5: {
    bg: 'bg-c5',
    size: SIZE,
    start: [1900, 1],
    items: [
      { art: 'p-bodymat', spot: 'body', x: 900, y: 1392, h: 200 },
      { art: 'f-qin', x: 560, y: 1402, h: 470, flip: true },
      { art: 'p-purse', spot: 'purse', x: 1180, y: 1405, h: 100 },
      { art: 'f-zhaosao', spot: 'zhaosao', x: 1400, y: 1402, h: 470, flip: true },
      { art: 'p-sickles', spot: 'sickles', x: 2000, y: 1420, h: 230 },
      { art: 'p-flysickle', spot: 'flysickle', x: 2400, y: 1432, h: 150 },
      { art: 'f-guisao', spot: 'guisao', x: 2560, y: 1330, h: 640, z: 1290 },
      { art: 'p-basket', spot: 'basket', x: 2780, y: 1425, h: 190 },
      { art: 'f-tuer', spot: 'tuer', x: 3060, y: 1428, h: 690 },
      { art: 'f-niuda', spot: 'niuda', x: 3340, y: 1422, h: 600 },
      { art: 'f-ma', spot: 'ma', x: 3650, y: 1428, h: 680 }
    ],
    spots: {
      roll: [3570, 950, 160, 130]
    },
    ambient: [
      { kind: 'flies', x: 2400, y: 1370, count: 14 },
      { kind: 'mist', rect: [0, 360, 3840, 260], count: 6 },
      { kind: 'water', rect: [1350, 860, 1300, 120], count: 14 }
    ]
  },
  c6: {
    bg: 'bg-c6',
    size: SIZE,
    start: [1700, 1],
    items: [
      { art: 'p-noose', spot: 'beamrope', x: 1320, y: 760, h: 340, z: 700 },
      { art: 'p-sqstool', spot: 'bench', x: 1320, y: 1260, h: 300 },
      { art: 'p-bodymat', spot: 'body', x: 880, y: 1420, h: 210 },
      { art: 'f-qin', x: 520, y: 1425, h: 500, flip: true },
      { art: 'f-liuzhong', spot: 'liuzhong', x: 190, y: 1430, h: 640 },
      { art: 'p-confession', spot: 'confessionpaper', x: 1880, y: 925, h: 80, z: 950 },
      { art: 'p-inkstone', spot: 'inkstone', x: 2190, y: 925, h: 120, z: 950 },
      { art: 'p-brazier', spot: 'brazier', x: 2560, y: 1250, h: 260 },
      { art: 'f-fenglu', spot: 'fenglu', x: 2880, y: 1435, h: 700 },
      { art: 'f-weifuren', spot: 'weifuren', x: 3380, y: 1430, h: 680 }
    ],
    spots: {
      beam: [1000, 150, 700, 160],
      desk: [1480, 880, 920, 200],
      shelf: [600, 520, 620, 680],
      gatelog: [130, 1000, 150, 170]
    },
    ambient: [
      { kind: 'flame', x: 1612, y: 820, r: 70 },
      { kind: 'dust', rect: [1300, 500, 1200, 500], count: 16 }
    ]
  }
};

/** The art that pictures a spot: the figure or thing placed for it, or (for painted spots) nothing. */
export function pictureOf(caseId, spotId) {
  const L = SCENES[caseId];
  const own = L?.items.find((it) => it.spot === spotId);
  if (own) return own.art;
  // Documents and painted parts borrow the nearest fitting picture.
  return { form: 'p-forms', gatelog: 'p-forms', shelf: 'p-forms', sleeve: 'p-forms', desk: 'p-confession', beam: 'p-noose', vat: null, ground: null, roll: 'p-forms', boat: null, jianzhan: 'p-teatable', whitecups: 'p-teatable', ewer: 'f-zhengqi' }[spotId] ?? null;
}

/**
 * Every picture case `caseId` shows: its background (the smaller one when `low`), the figures and things in the scene,
 * the pictures on its evidence cards and the body charts. Loaded together as one group when the case opens.
 */
export function caseArt(caseId, low = false) {
  const L = SCENES[caseId];
  if (!L) return [];
  const ids = new Set([L.bg + (low ? '-low' : ''), 'p-chart-front', 'p-chart-back', 'f-qin']);
  for (const it of L.items) ids.add(it.art);
  for (const id of Object.keys(L.spots ?? {})) {
    const pic = pictureOf(caseId, id);
    if (pic) ids.add(pic);
  }
  return [...ids];
}
