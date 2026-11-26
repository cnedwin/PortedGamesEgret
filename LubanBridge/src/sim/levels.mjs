// 五章二十五关和一个沙盒。每关给出两岸、水面、锚点、能用的材料、要过的人和车，以及一份参考解。
// 预算由参考解的造价加两成半定下，所以每关都有一种在预算内过得去的搭法（测试会跑一遍确认）。
// Five chapters of five levels, and a sandbox. Each level gives the banks, the water, the anchors, the materials it
// offers, who must cross, and a reference solution. The budget is the reference's cost and a quarter more, so every
// level has a way across within budget (the tests run it to make sure).
import { GRID, costOf } from './design.mjs';
import { along, arch, sketch, suspension, truss } from './plans.mjs';

const g = (m) => Math.round(m / GRID);

/**
 * A level from metres. `span`: the gap between the road's two ends. `left`/`right`: the road heights (y down, 0 the
 * usual). `water` and `bed`: depths. `anchors`: more fixed points, metres. `piers`: places a pier can be built, by x,
 * with the height of its top. `channel`: boats pass between x0 and x1 and need `clear` metres above the water.
 */
function level(o) {
  const left = o.left ?? 0,
    right = o.right ?? 0,
    span = o.span;
  const ground = [
    { x0: -60, x1: 0, y0: left, y1: o.bed + 4 },
    { x0: span, x1: span + 60, y0: right, y1: o.bed + 4 },
    { x0: 0, x1: span, y0: o.bed, y1: o.bed + 4 },
    ...(o.rocks ?? [])
  ];
  const anchors = [
    [0, left],
    [span, right],
    ...(o.anchors ?? [])
  ].map(([x, y]) => [g(x), g(y)]);
  const top = Math.min(left, right, ...(o.anchors ?? []).map((a) => a[1])) - (o.headroom ?? 6);
  const made = {
    id: o.id,
    chapter: o.chapter,
    name: o.name,
    tip: o.tip,
    span,
    water: o.water,
    bed: o.bed,
    gap: { x0: 0, x1: span },
    road: { left: { x: 0, y: left }, right: { x: span, y: right } },
    ground,
    anchors,
    towers: o.towers ?? [],
    piers: (o.piers ?? []).map(([x, t]) => ({ x: g(x), top: g(t) })),
    pontoons: !!o.pontoons,
    channel: o.channel ?? null,
    materials: o.materials,
    vehicles: o.vehicles,
    area: { x0: g(-3), x1: g(span + 3), y0: g(top), y1: g(o.bed) },
    famous: !!o.famous,
    sandbox: !!o.sandbox
  };
  if (o.plan) {
    const s = sketch();
    o.plan(s, made);
    made.reference = s.design;
    made.budget = Math.ceil((costOf(s.design) * 1.25) / 10) * 10;
  } else made.budget = o.budget ?? 99999;
  return made;
}

const W = (zh, en) => ({ zh, en });

export const CHAPTERS = [
  { id: 'jiangnan', name: W('江南', 'Jiangnan'), lesson: W('木梁与三角形', 'Beams and triangles') },
  { id: 'zhaozhou', name: W('赵州', 'Zhaozhou'), lesson: W('石只受压，拱把重量传到两岸', 'Stone only takes a push; an arch carries weight to the banks') },
  { id: 'shudao', name: W('蜀道', 'The Shu Road'), lesson: W('绳和链只受拉', 'Ropes and chains only pull') },
  { id: 'chaozhou', name: W('潮州', 'Chaozhou'), lesson: W('浮舟托桥，给船留路', 'Boats hold the bridge up; leave the boats a way') },
  { id: 'dongxiang', name: W('侗乡', 'Dong country'), lesson: W('在河里立墩，一段一段架过去', 'Piers in the river, and a span from each to the next') }
];

const TIMBER = ['plank', 'wood', 'bamboo'];

export const LEVELS = [
  // ---- 江南 · Jiangnan ----
  level({
    id: '1-1',
    chapter: 0,
    name: W('小河', 'A stream'),
    tip: W('先铺桥面，再从岸下的锚点撑两根斜木：三角形不会变形。', 'Lay the deck, then brace it from the anchors under the banks: a triangle keeps its shape.'),
    span: 6,
    water: 2.5,
    bed: 4,
    anchors: [
      [0, 1.5],
      [6, 1.5]
    ],
    materials: TIMBER,
    vehicles: ['porter', 'barrow'],
    plan: (s) => {
      s.path(along([0, 0], [6, 0], 3), 'plank');
      s.line(0, 1.5, 2, 0, 'wood').line(6, 1.5, 4, 0, 'wood');
    }
  }),
  level({
    id: '1-2',
    chapter: 0,
    name: W('石塘', 'The stone pond'),
    tip: W('一排三角形连起来就是桁架，越高越省力。', 'Triangles in a row make a truss; a taller one works less.'),
    span: 8,
    water: 2.5,
    bed: 4.5,
    materials: TIMBER,
    vehicles: ['porter', 'barrow'],
    plan: (s) => truss(s, [0, 0], [8, 0], { panels: 4, depth: 1.5 })
  }),
  level({
    id: '1-3',
    chapter: 0,
    name: W('竹林渡', 'Bamboo ford'),
    tip: W('竹子便宜又轻，可不经压：压着的那几根用短的。', 'Bamboo is cheap and light but crushes easily: keep the struts short.'),
    span: 10,
    water: 2.5,
    bed: 4.5,
    materials: ['plank', 'bamboo'],
    vehicles: ['barrow', 'barrow'],
    plan: (s) => truss(s, [0, 0], [10, 0], { panels: 5, depth: 1.5, chord: 'bamboo' })
  }),
  level({
    id: '1-4',
    chapter: 0,
    name: W('嫁女', 'A bride crosses'),
    tip: W('轿子长，重量分在前后两头；岸下也能借力。', 'A sedan is long, its weight at both ends; the banks below can help too.'),
    span: 12,
    water: 3,
    bed: 5,
    anchors: [
      [0, 2],
      [12, 2]
    ],
    materials: TIMBER,
    vehicles: ['porter', 'sedan', 'porter'],
    plan: (s) => truss(s, [0, 0], [12, 0], { panels: 6, depth: 2 })
  }),
  level({
    id: '1-5',
    chapter: 0,
    name: W('水乡廊桥', 'The covered bridge'),
    tip: W('牛车最重。桥越长，中间越要高。', 'An ox cart is the heaviest yet. The longer the bridge, the taller its middle must be.'),
    span: 15,
    water: 3,
    bed: 5.5,
    anchors: [
      [0, 2],
      [15, 2]
    ],
    materials: TIMBER,
    vehicles: ['ox'],
    famous: true,
    plan: (s) => truss(s, [0, 0], [15, 0], { panels: 6, depth: 2.5 })
  }),

  // ---- 赵州 · Zhaozhou ----
  level({
    id: '2-1',
    chapter: 1,
    name: W('第一块拱石', 'The first arch stone'),
    tip: W('石头拉不得，只能压。从岸下的拱脚起，一块接一块砌成弧形。', 'Stone cannot be pulled, only pushed. From the springings under the banks, lay stones in a curve.'),
    span: 6,
    water: 3,
    bed: 4.5,
    anchors: [
      [0, 2.5],
      [6, 2.5]
    ],
    materials: ['slab', 'stone', 'plank'],
    vehicles: ['barrow', 'porter'],
    plan: (s) => arch(s, [0, 2.5], [6, 2.5], 2, 6, { d0: [0, 0], d1: [6, 0], panels: 3 })
  }),
  level({
    id: '2-2',
    chapter: 1,
    name: W('村口石桥', 'The village bridge'),
    tip: W('桥面压在立柱上，立柱压在拱上，拱压在两岸。', 'The deck pushes on the posts, the posts on the arch, the arch on the banks.'),
    span: 8,
    water: 3.5,
    bed: 5,
    anchors: [
      [0, 3],
      [8, 3]
    ],
    materials: ['slab', 'stone', 'plank'],
    vehicles: ['barrow', 'sedan'],
    plan: (s) => arch(s, [0, 3], [8, 3], 2.5, 8, { d0: [0, 0], d1: [8, 0], panels: 4 })
  }),
  level({
    id: '2-3',
    chapter: 1,
    name: W('运粮道', 'The grain road'),
    tip: W('拱越高，推两岸的力越小；太平的拱会被压塌。', 'The higher the arch, the less it pushes the banks; a flat one is crushed.'),
    span: 10,
    water: 4,
    bed: 5.5,
    anchors: [
      [0, 3.5],
      [10, 3.5]
    ],
    materials: ['slab', 'stone', 'plank'],
    vehicles: ['ox'],
    plan: (s) => arch(s, [0, 3.5], [10, 3.5], 3, 10, { d0: [0, 0], d1: [10, 0], panels: 5 })
  }),
  level({
    id: '2-4',
    chapter: 1,
    name: W('采石场', 'The quarry'),
    tip: W('运石车最重。石板桥面重，可也最经压。', 'The stone wagon is the heaviest of all. Slabs are heavy, but they take the most.'),
    span: 12,
    water: 4,
    bed: 6,
    anchors: [
      [0, 4],
      [12, 4]
    ],
    materials: ['slab', 'stone', 'plank', 'wood'],
    vehicles: ['stones'],
    plan: (s) => arch(s, [0, 4], [12, 4], 3, 12, { d0: [0, 0], d1: [12, 0], panels: 6, ring: 1 })
  }),
  level({
    id: '2-5',
    chapter: 1,
    name: W('赵州桥', 'Zhaozhou Bridge'),
    tip: W('一道大拱跨过整条河。拱肩上的立柱让桥身轻一些。', 'One great arch over the whole river. Posts on its shoulders keep the bridge light.'),
    span: 16,
    water: 4.5,
    bed: 7,
    anchors: [
      [0, 3.5],
      [16, 3.5]
    ],
    materials: ['slab', 'stone', 'plank', 'wood'],
    vehicles: ['ox', 'stones'],
    famous: true,
    plan: (s) => arch(s, [0, 3.5], [16, 3.5], 2.5, 16, { d0: [0, 0], d1: [16, 0], panels: 8, ring: 1 })
  }),

  // ---- 蜀道 · The Shu Road ----
  level({
    id: '3-1',
    chapter: 2,
    name: W('猿声峡', 'Gibbon gorge'),
    tip: W('绳子只能拉，不能撑。从桥楼垂下吊绳，吊住桥面。', 'A rope pulls and never props. Hang ropes from the gate towers to hold the deck.'),
    span: 10,
    water: 9,
    bed: 12,
    anchors: [
      [-1, -5],
      [11, -5]
    ],
    towers: [
      [-1, -5],
      [11, -5]
    ],
    materials: ['plank', 'rope', 'bamboo'],
    vehicles: ['porter', 'porter'],
    plan: (s) => {
      s.path(along([0, 0], [10, 0], 4), 'plank');
      for (const x of [2.5, 5, 7.5]) s.line(x < 5 ? -1 : x > 5 ? 11 : -1, -5, x, 0, 'rope');
      s.line(11, -5, 5, 0, 'rope');
    }
  }),
  level({
    id: '3-2',
    chapter: 2,
    name: W('栈道', 'The plank road'),
    tip: W('主索挂在两座桥楼之间，吊绳从主索垂到桥面。', 'The main cable hangs between the towers, and hangers drop from it to the deck.'),
    span: 15,
    water: 9,
    bed: 12,
    anchors: [
      [-1, -6],
      [16, -6]
    ],
    towers: [
      [-1, -6],
      [16, -6]
    ],
    materials: ['plank', 'rope', 'chain', 'bamboo'],
    vehicles: ['porter', 'barrow', 'porter'],
    plan: (s) => suspension(s, [-1, -6], [16, -6], -1.5, [0, 0], [15, 0], { panels: 6, cable: 'rope' })
  }),
  level({
    id: '3-3',
    chapter: 2,
    name: W('马帮', 'The horse caravan'),
    tip: W('马车快，桥面会晃。主索弯得越深，越省力。', 'Horse carts are quick and the deck sways. The deeper the cable sags, the less it works.'),
    span: 20,
    water: 10,
    bed: 13,
    anchors: [
      [-1, -7],
      [21, -7]
    ],
    towers: [
      [-1, -7],
      [21, -7]
    ],
    materials: ['plank', 'rope', 'chain', 'bamboo', 'wood'],
    vehicles: ['horse', 'porter'],
    plan: (s) => suspension(s, [-1, -7], [21, -7], -1.5, [0, 0], [20, 0], { panels: 8, cable: 'chain' })
  }),
  level({
    id: '3-4',
    chapter: 2,
    name: W('云栈', 'Cloud ledge'),
    tip: W('两岸一高一低。桥面可以斜着走。', 'One bank is higher than the other. The deck may slope.'),
    span: 22,
    left: -1,
    right: 1,
    water: 10,
    bed: 13,
    anchors: [
      [-1, -8],
      [23, -6]
    ],
    towers: [
      [-1, -8],
      [23, -6]
    ],
    materials: ['plank', 'rope', 'chain', 'bamboo', 'wood'],
    vehicles: ['horse', 'barrow', 'porter'],
    plan: (s) => suspension(s, [-1, -8], [23, -6], -1.5, [0, -1], [22, 1], { panels: 11, cable: 'chain' })
  }),
  level({
    id: '3-5',
    chapter: 2,
    name: W('泸定桥', 'Luding Bridge'),
    tip: W('最宽的峡谷，只有铁链拉得住。', 'The widest gorge yet: only iron chains will hold it.'),
    span: 28,
    water: 11,
    bed: 14,
    anchors: [
      [-1, -8],
      [29, -8]
    ],
    towers: [
      [-1, -8],
      [29, -8]
    ],
    materials: ['plank', 'rope', 'chain', 'wood'],
    vehicles: ['horse', 'ox'],
    famous: true,
    plan: (s) => suspension(s, [-1, -8], [29, -8], -1.5, [0, 0], [28, 0], { panels: 12, cable: 'chain' })
  }),

  // ---- 潮州 · Chaozhou ----
  level({
    id: '4-1',
    chapter: 3,
    name: W('渡口', 'The ferry'),
    tip: W('河太宽，就让船托着桥：浮舟放在水面那条线上。', 'When the river is too wide, let boats hold the bridge: pontoons sit on the water line.'),
    span: 14,
    water: 1.5,
    bed: 4,
    materials: ['plank', 'wood', 'bamboo', 'rope'],
    pontoons: true,
    vehicles: ['barrow', 'porter'],
    plan: (s) => pontoonRun(s, 0, 14)
  }),
  level({
    id: '4-2',
    chapter: 3,
    name: W('鱼市', 'The fish market'),
    tip: W('浮舟之间别隔太远，重车压上去会沉。', 'Keep the pontoons close: a heavy cart sinks the ones far apart.'),
    span: 20,
    water: 1.5,
    bed: 4,
    materials: ['plank', 'wood', 'bamboo', 'rope'],
    pontoons: true,
    vehicles: ['ox', 'barrow'],
    plan: (s) => pontoonRun(s, 0, 20)
  }),
  level({
    id: '4-3',
    chapter: 3,
    name: W('让船', 'Make way for boats'),
    tip: W('标出的航道要留给船：浮舟不能放，桥身要高过船桅。', 'Leave the marked channel to the boats: no pontoons in it, and the bridge above their masts.'),
    span: 20,
    water: 1.5,
    bed: 4,
    channel: { x0: 8.5, x1: 11.5, clear: 1.0 },
    materials: ['plank', 'wood', 'bamboo', 'rope'],
    pontoons: true,
    vehicles: ['barrow', 'sedan'],
    plan: (s, l) => pontoonChannel(s, l)
  }),
  level({
    id: '4-4',
    chapter: 3,
    name: W('盐船', 'The salt boats'),
    tip: W('航道更宽了。驼峰两边要用三角形撑住。', 'A wider channel. Triangles must hold the hump on both sides.'),
    span: 26,
    water: 1.5,
    bed: 4,
    channel: { x0: 11.5, x1: 14.5, clear: 1.0 },
    materials: ['plank', 'wood', 'bamboo', 'rope'],
    pontoons: true,
    vehicles: ['ox', 'horse'],
    plan: (s, l) => pontoonChannel(s, l)
  }),
  level({
    id: '4-5',
    chapter: 3,
    name: W('广济桥', 'Guangji Bridge'),
    tip: W('一半是浮舟，一半是桥：船从中间过，车从桥上走。', 'Half pontoons, half bridge: boats pass in the middle, carts go over the top.'),
    span: 32,
    water: 1.5,
    bed: 4,
    channel: { x0: 14.5, x1: 17.5, clear: 1.0 },
    materials: ['plank', 'wood', 'bamboo', 'rope'],
    pontoons: true,
    vehicles: ['ox', 'horse', 'sedan'],
    famous: true,
    plan: (s, l) => pontoonChannel(s, l)
  }),

  // ---- 侗乡 · Dong country ----
  level({
    id: '5-1',
    chapter: 4,
    name: W('第一座墩', 'The first pier'),
    tip: W('点一下河里的墩位，就能立一座石墩，从墩上往两边架。', 'Tap a pier mark in the river to raise a stone pier, then span from it both ways.'),
    span: 16,
    water: 4,
    bed: 7,
    piers: [[8, 0]],
    materials: TIMBER,
    vehicles: ['ox'],
    plan: (s) => {
      s.pier(0);
      truss(s, [0, 0], [8, 0], { panels: 4, depth: 1.5 });
      truss(s, [8, 0], [16, 0], { panels: 4, depth: 1.5 });
    }
  }),
  level({
    id: '5-2',
    chapter: 4,
    name: W('鼓楼前', 'Before the drum tower'),
    tip: W('墩要花钱。少立一座，桁架就得更高。', 'Piers cost silver. One fewer, and the truss must be taller.'),
    span: 20,
    water: 4,
    bed: 7,
    piers: [
      [7, 0],
      [13, 0]
    ],
    materials: TIMBER,
    vehicles: ['ox', 'barrow'],
    plan: (s) => {
      s.pier(0).pier(1);
      truss(s, [0, 0], [7, 0], { panels: 3, depth: 1.5 });
      truss(s, [7, 0], [13, 0], { panels: 3, depth: 1.5 });
      truss(s, [13, 0], [20, 0], { panels: 3, depth: 1.5 });
    }
  }),
  level({
    id: '5-3',
    chapter: 4,
    name: W('挑梁', 'Cantilevers'),
    tip: W('墩上的桁架可以往两边伸出去，中间再接上。', 'A truss on a pier can reach out both ways, and the two reaches meet in the middle.'),
    span: 24,
    water: 4.5,
    bed: 7.5,
    piers: [
      [8, 0],
      [16, 0]
    ],
    materials: TIMBER,
    vehicles: ['horse', 'ox'],
    plan: (s) => {
      s.pier(0).pier(1);
      truss(s, [0, 0], [8, 0], { panels: 4, depth: 2 });
      truss(s, [8, 0], [16, 0], { panels: 4, depth: 2 });
      truss(s, [16, 0], [24, 0], { panels: 4, depth: 2 });
    }
  }),
  level({
    id: '5-4',
    chapter: 4,
    name: W('赶圩', 'Market day'),
    tip: W('一队人车接连过桥，重量叠在一起。', 'A whole line of carts crosses at once: their weights add up.'),
    span: 30,
    water: 5,
    bed: 8,
    piers: [
      [10, 0],
      [20, 0]
    ],
    materials: TIMBER,
    vehicles: ['ox', 'horse', 'barrow', 'porter'],
    plan: (s) => {
      s.pier(0).pier(1);
      truss(s, [0, 0], [10, 0], { panels: 4, depth: 2.5 });
      truss(s, [10, 0], [20, 0], { panels: 4, depth: 2.5 });
      truss(s, [20, 0], [30, 0], { panels: 4, depth: 2.5 });
    }
  }),
  level({
    id: '5-5',
    chapter: 4,
    name: W('程阳风雨桥', 'Chengyang Wind-and-Rain Bridge'),
    tip: W('最长的一座。墩怎么分，桁架多高，全看你。', 'The longest of all. Where the piers go and how tall the trusses are is up to you.'),
    span: 36,
    water: 5,
    bed: 8.5,
    piers: [
      [7, 0],
      [14.5, 0],
      [21.5, 0],
      [29, 0]
    ],
    materials: ['plank', 'wood', 'bamboo', 'slab'],
    vehicles: ['ox', 'sedan', 'stones'],
    famous: true,
    plan: (s) => {
      s.pier(0).pier(1).pier(2).pier(3);
      const at = [0, 7, 14.5, 21.5, 29, 36];
      for (let i = 0; i < 5; i++) truss(s, [at[i], 0], [at[i + 1], 0], { panels: 3, depth: 2.5 });
    }
  })
];

/** The sandbox: every material, pontoons, piers, no budget, and the carts chosen. */
export const SANDBOX = level({
  id: 'sandbox',
  chapter: -1,
  name: W('沙盒', 'Sandbox'),
  tip: W('随便搭。材料、浮舟、石墩都能用，不限预算。', 'Build anything. Every material, pontoons and piers, and no budget.'),
  span: 24,
  water: 3,
  bed: 7,
  anchors: [
    [0, 2.5],
    [24, 2.5],
    [-1, -7],
    [25, -7]
  ],
  towers: [
    [-1, -7],
    [25, -7]
  ],
  piers: [
    [8, 0],
    [16, 0]
  ],
  pontoons: true,
  materials: ['plank', 'slab', 'wood', 'bamboo', 'stone', 'rope', 'chain'],
  vehicles: ['porter', 'barrow', 'ox'],
  budget: Infinity,
  sandbox: true
});

/** Pontoons every two and a half metres from `x0` to `x1`, with ramps down from the banks. */
function pontoonRun(s, x0, x1, { from = true, to = true } = {}) {
  const y = 1;
  const first = from ? x0 + 2 : x0,
    last = to ? x1 - 2 : x1;
  const n = Math.max(1, Math.ceil((last - first) / 2.5 - 1e-9));
  const pts = along([first, y], [last, y], n);
  if (from) s.line(x0, 0, first, y, 'plank');
  s.path(pts, 'plank');
  if (to) s.line(last, y, x1, 0, 'plank');
  for (const [x] of pts) s.pontoon(x, y);
  return s;
}

/** Pontoons up to the channel, a braced hump of timber over it, and pontoons on from there. */
function pontoonChannel(s, l) {
  const { x0, x1 } = l.channel,
    a = x0 - 1.5,
    e = x1 + 1.5,
    m = (x0 + x1) / 2;
  pontoonRun(s, 0, a, { to: false });
  pontoonRun(s, e, l.span, { from: false });
  // The hump: up from the last pontoon to the road's height over the channel, and down again, braced from above.
  s.path(
    [
      [a, 1],
      [x0, 0],
      [m, 0],
      [x1, 0],
      [e, 1]
    ],
    'plank'
  );
  const top = -1.5;
  s.line(a, 1, x0, top, 'wood').line(x0, top, x0, 0, 'wood').line(x0, top, m, 0, 'wood').line(x0, top, m, top, 'wood');
  s.line(m, top, m, 0, 'wood').line(m, top, x1, top, 'wood').line(x1, top, m, 0, 'wood').line(x1, top, x1, 0, 'wood').line(x1, top, e, 1, 'wood');
  return s;
}

/** A level by its id; the sandbox by 'sandbox'. */
export const levelById = (id) => (id === 'sandbox' ? SANDBOX : LEVELS.find((l) => l.id === id));
