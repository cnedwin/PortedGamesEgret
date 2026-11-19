// 五行 · 火 — 部件清单
//
// 这份清单是占位图与真实美术之间的合同。每个部件都声明了挂在哪根骨、
// 画在第几层、尺寸、轴心、旋转；将来接真实素材只填 `image`，其余字段不动，
// 骨骼与动画一行都不用改。
//
// 坐标系：画布像素，原点左上，y 向下，1024×1536。
// 转 Spine 时 spine_y = canvas.height - canvas_y（转换脚本负责，不在清单里做）。
//
// 部件的定位用 `bone + offset`，不是绝对坐标——Spine 的 attachment 就是相对
// 骨骼定位的，这样占位与真实骨骼语义一致，转换时不必重新推导。
//
// 形状约定：
//   - `ellipse` / `rect` / `capsule` / `poly` 是四种原始图形，够用的地方就用它们；
//   - `path` + `points` 是任意轮廓，坐标归一化到 [-0.5, 0.5] 的方框内，
//     `smooth: true` 时用二次曲线穿过相邻点的中点，画出布料的弧线；
//   - 四肢用 `limb()` 从骨骼位置算出来，不手填角度——骨骼一动，胳膊自己跟着走。

const CANVAS = { width: 1024, height: 1536 };

const bones = [
  { id: 'hip', parent: null, x: 512, y: 1150 },
  { id: 'spine', parent: 'hip', x: 512, y: 1000 },
  { id: 'chest', parent: 'spine', x: 512, y: 830 },
  { id: 'neck', parent: 'chest', x: 512, y: 700 },
  { id: 'head', parent: 'neck', x: 512, y: 520 },

  // 头发三根：长马尾甩到画面左侧背后，右侧整条留给刀锋，刀压在深色头发上才看得清
  { id: 'hair-tail', parent: 'head', x: 368, y: 486 },
  { id: 'hair-lock-l', parent: 'head', x: 400, y: 430 },
  { id: 'hair-lock-r', parent: 'head', x: 624, y: 430 },

  // 近侧手（画面左）抬到胸前握刀，远侧手（画面右）向外垂开
  { id: 'shoulder-near', parent: 'chest', x: 344, y: 756 },
  { id: 'elbow-near', parent: 'shoulder-near', x: 306, y: 896 },
  { id: 'hand-near', parent: 'elbow-near', x: 356, y: 1000 },
  { id: 'shoulder-far', parent: 'chest', x: 680, y: 756 },
  { id: 'elbow-far', parent: 'shoulder-far', x: 748, y: 886 },
  { id: 'hand-far', parent: 'elbow-far', x: 790, y: 952 },

  { id: 'skirt-l', parent: 'hip', x: 448, y: 1176 },
  { id: 'skirt-r', parent: 'hip', x: 576, y: 1176 },
];

const B = (id) => {
  const bone = bones.find((item) => item.id === id);
  if (!bone) throw new Error(`未知骨骼：${id}`);
  return bone;
};

/** 从 A 指到 B 的朝向。部件按"朝下"画，旋转多少度才指着 B。 */
function aim(a, b) {
  // 画布 y 向下，所以 atan2 的 x 取反，得到的角度才是 ctx.rotate 认的顺时针角。
  return (Math.atan2(-(b.x - a.x), b.y - a.y) * 180) / Math.PI;
}

/** 沿某朝向走 d 像素的偏移量，给挂在手上的刀柄、刀镡定位。 */
function along(rotation, d) {
  const r = (rotation * Math.PI) / 180;
  return [-Math.sin(r) * d, Math.cos(r) * d];
}

/**
 * 一段肢体：从 `from` 骨伸到 `to` 骨，长度和角度都由骨骼算出来。
 * `pad` 是两端各多伸出的比例，用来盖住关节，不让手臂在肘部断开。
 */
function limb(id, from, to, { layer, width, color, pad = 0.3, alpha }) {
  const a = B(from);
  const b = B(to);
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const height = Math.round(length * (1 + pad));
  return {
    id,
    bone: from,
    layer,
    shape: 'capsule',
    size: [width, height],
    rotation: +aim(a, b).toFixed(1),
    offset: [0, 0],
    // 轴心落在"上端多伸出的那一截"之后，整段就正好骑在两个关节上。
    pivot: [0.5, +(pad / (2 * (1 + pad))).toFixed(3)],
    color,
    alpha,
    image: null,
  };
}

/** 关节处补一个同色圆，两根胶囊在这里交叠，才不会掐出腰来。 */
function joint(id, bone, layer, { size, color, alpha }) {
  return {
    id,
    bone,
    layer,
    shape: 'ellipse',
    size: [size, size],
    rotation: 0,
    offset: [0, 0],
    pivot: [0.5, 0.5],
    color,
    alpha,
    image: null,
  };
}

// 刀指向的落点：手在 (356,1000)，刀尖落到 (706,500)，刀身横过胸口、
// 从下巴右边穿出去，不挡脸；刀尖压在深色头发上，剪影最清楚。
const SWORD_TIP = { x: 706, y: 500 };
const BLADE_AIM = +aim(B('hand-near'), SWORD_TIP).toFixed(1);

const parts = [
  // ── 背后一层 ────────────────────────────────────────────────
  {
    id: 'hair-back',
    bone: 'head',
    layer: 0,
    shape: 'path',
    smooth: true,
    size: [400, 660],
    rotation: 0,
    offset: [0, -84],
    pivot: [0.5, 0.1],
    color: 'hair',
    // 顶部收窄贴着颅骨，往下放开，末端两撇散开——一整块圆会像蘑菇
    points: [
      [0, -0.5], [0.3, -0.44], [0.45, -0.16], [0.44, 0.18],
      [0.32, 0.5], [0.14, 0.38], [0, 0.46],
      [-0.14, 0.38], [-0.32, 0.5], [-0.44, 0.18], [-0.45, -0.16], [-0.3, -0.44],
    ],
    image: null,
  },
  {
    id: 'hair-tail',
    bone: 'hair-tail',
    layer: 1,
    shape: 'path',
    smooth: true,
    size: [76, 300],
    rotation: 14,
    offset: [0, 0],
    pivot: [0.5, 0.03],
    color: 'ribbon',
    points: [
      [0, -0.5], [0.44, -0.3], [0.34, 0.24], [0.12, 0.5],
      [-0.14, 0.34], [-0.4, 0.06], [-0.44, -0.34],
    ],
    image: null,
  },

  // ── 下裳 ────────────────────────────────────────────────────
  {
    id: 'skirt-under',
    bone: 'hip',
    layer: 2,
    shape: 'path',
    size: [290, 330],
    rotation: 0,
    offset: [0, 0],
    pivot: [0.5, 0.02],
    color: 'deep',
    points: [[-0.4, -0.5], [0.4, -0.5], [0.46, 0.5], [-0.46, 0.5]],
    image: null,
  },
  {
    id: 'skirt-l',
    bone: 'skirt-l',
    layer: 3,
    shape: 'path',
    size: [330, 350],
    rotation: -3,
    offset: [0, 0],
    pivot: [0.5, 0.02],
    color: 'main',
    points: [[-0.14, -0.5], [0.16, -0.5], [0.5, 0.44], [0.4, 0.5], [0, 0.44], [-0.44, 0.5], [-0.5, 0.44]],
    image: null,
  },
  {
    id: 'skirt-r',
    bone: 'skirt-r',
    layer: 4,
    shape: 'path',
    size: [330, 350],
    rotation: 3,
    offset: [0, 0],
    pivot: [0.5, 0.02],
    color: 'main',
    points: [[-0.16, -0.5], [0.14, -0.5], [0.5, 0.44], [0.44, 0.5], [0, 0.44], [-0.4, 0.5], [-0.5, 0.44]],
    image: null,
  },

  // ── 远侧手臂（在身体背后） ──────────────────────────────────
  limb('arm-far-upper', 'shoulder-far', 'elbow-far', { layer: 5, width: 108, color: 'main' }),
  joint('elbow-far-joint', 'elbow-far', 6, { size: 104, color: 'main' }),
  limb('arm-far-fore', 'elbow-far', 'hand-far', { layer: 7, width: 96, color: 'main' }),
  {
    id: 'hand-far',
    bone: 'hand-far',
    layer: 8,
    shape: 'ellipse',
    size: [60, 84],
    rotation: -33,
    offset: [0, -4],
    pivot: [0.5, 0.2],
    color: 'skin',
    image: null,
  },

  // ── 身体 ────────────────────────────────────────────────────
  {
    id: 'body-robe',
    bone: 'spine',
    layer: 9,
    shape: 'path',
    size: [392, 600],
    rotation: 0,
    offset: [0, -30],
    pivot: [0.5, 0.5],
    color: 'main',
    // 肩线要平、腰要收、下摆放开。直线折角是刻意的：平涂二次元的衣料本来就有硬边
    points: [
      [0, -0.5], [0.27, -0.48], [0.4, -0.34], [0.36, -0.1],
      [0.28, 0.08], [0.32, 0.34], [0.4, 0.5], [0, 0.5],
      [-0.4, 0.5], [-0.32, 0.34], [-0.28, 0.08], [-0.36, -0.1],
      [-0.4, -0.34], [-0.27, -0.48],
    ],
    image: null,
  },
  {
    id: 'sash',
    bone: 'hip',
    layer: 10,
    shape: 'rect',
    size: [300, 46],
    rotation: 0,
    offset: [0, -6],
    pivot: [0.5, 0.5],
    color: 'gold',
    image: null,
  },

  // ── 近侧手臂 + 刀 ───────────────────────────────────────────
  {
    id: 'shoulder-near',
    bone: 'shoulder-near',
    layer: 11,
    shape: 'ellipse',
    size: [126, 96],
    rotation: -6,
    offset: [2, 4],
    pivot: [0.5, 0.5],
    color: 'deep',
    image: null,
  },
  limb('arm-near-upper', 'shoulder-near', 'elbow-near', { layer: 12, width: 112, color: 'main' }),
  joint('elbow-near-joint', 'elbow-near', 13, { size: 106, color: 'main' }),
  limb('arm-near-fore', 'elbow-near', 'hand-near', { layer: 14, width: 100, color: 'main' }),
  {
    id: 'sword-grip',
    bone: 'hand-near',
    layer: 15,
    shape: 'capsule',
    size: [44, 138],
    rotation: +(BLADE_AIM + 180).toFixed(1),
    offset: [0, 0],
    pivot: [0.5, 0.03],
    color: 'ribbon',
    image: null,
  },
  {
    id: 'sword-pommel',
    bone: 'hand-near',
    layer: 16,
    shape: 'ellipse',
    size: [52, 52],
    rotation: 0,
    offset: along(BLADE_AIM + 180, 136),
    pivot: [0.5, 0.5],
    color: 'gold',
    image: null,
  },
  {
    id: 'hand-near',
    bone: 'hand-near',
    layer: 17,
    shape: 'ellipse',
    size: [82, 88],
    rotation: 0,
    offset: [0, -4],
    pivot: [0.5, 0.12],
    color: 'skin',
    image: null,
  },
  {
    id: 'sword-flame',
    bone: 'hand-near',
    layer: 18,
    shape: 'path',
    smooth: true,
    size: [84, 516],
    rotation: BLADE_AIM,
    offset: [0, 0],
    pivot: [0.5, 0.06],
    color: 'flame',
    alpha: 0.42,
    // 包住刀身的火舌，比刀身宽，两端收尖
    points: [
      [0, -0.5], [0.3, -0.34], [0.44, 0.02], [0.28, 0.3], [0, 0.5],
      [-0.3, 0.28], [-0.46, 0.0], [-0.32, -0.32],
    ],
    image: null,
  },
  {
    id: 'sword-blade',
    bone: 'hand-near',
    layer: 19,
    shape: 'path',
    size: [40, 470],
    rotation: BLADE_AIM,
    offset: [0, 0],
    pivot: [0.5, 0.05],
    color: 'steel',
    // 平背、斜锋，刀尖收成一个点
    points: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.26], [0, 0.5], [-0.5, 0.26]],
    image: null,
  },
  {
    id: 'sword-guard',
    bone: 'hand-near',
    layer: 20,
    shape: 'rect',
    size: [132, 26],
    rotation: +(BLADE_AIM + 90).toFixed(1),
    offset: [0, 0],
    pivot: [0.5, 0.5],
    color: 'gold',
    image: null,
  },

  // ── 头 ──────────────────────────────────────────────────────
  {
    id: 'neck-part',
    bone: 'neck',
    layer: 21,
    shape: 'path',
    size: [84, 110],
    rotation: 0,
    offset: [0, -34],
    pivot: [0.5, 0.5],
    color: 'skin',
    points: [[-0.5, -0.5], [0.5, -0.5], [0.44, 0.5], [-0.44, 0.5]],
    image: null,
  },
  {
    id: 'collar',
    bone: 'neck',
    layer: 22,
    shape: 'path',
    size: [204, 146],
    rotation: 0,
    offset: [0, -10],
    pivot: [0.5, 0.5],
    color: 'deep',
    // 交领：上宽下尖的 V。它压在脖子上，把长脖子截短，下巴以下才是露出来的部分
    points: [[-0.5, -0.5], [0.5, -0.5], [0.09, 0.5], [-0.09, 0.5]],
    image: null,
  },
  {
    id: 'head-shape',
    bone: 'head',
    layer: 23,
    shape: 'path',
    smooth: true,
    size: [216, 258],
    rotation: 0,
    offset: [0, 0],
    pivot: [0.5, 0.5],
    color: 'skin',
    // 圆额、收腮、尖下巴——尖下巴是二次元脸的关键，椭圆做不出来
    points: [
      [0, -0.5], [0.28, -0.42], [0.45, -0.16], [0.46, 0.1],
      [0.3, 0.36], [0, 0.5], [-0.3, 0.36], [-0.46, 0.1], [-0.45, -0.16], [-0.28, -0.42],
    ],
    image: null,
  },
  {
    id: 'eye-white-l',
    bone: 'head',
    layer: 24,
    shape: 'ellipse',
    size: [62, 50],
    rotation: 0,
    offset: [-46, 4],
    pivot: [0.5, 0.5],
    color: 'light',
    image: null,
  },
  {
    id: 'eye-iris-l',
    bone: 'head',
    layer: 25,
    shape: 'ellipse',
    size: [42, 46],
    rotation: 0,
    offset: [-46, 6],
    pivot: [0.5, 0.5],
    color: 'iris',
    image: null,
  },
  {
    id: 'eye-shine-l',
    bone: 'head',
    layer: 26,
    shape: 'ellipse',
    size: [16, 16],
    rotation: 0,
    offset: [-56, -6],
    pivot: [0.5, 0.5],
    color: 'light',
    image: null,
  },
  {
    id: 'eye-lash-l',
    bone: 'head',
    layer: 27,
    shape: 'capsule',
    size: [70, 12],
    rotation: -7,
    offset: [-46, -18],
    pivot: [0.5, 0.5],
    color: 'ink',
    image: null,
  },
  {
    id: 'eye-white-r',
    bone: 'head',
    layer: 28,
    shape: 'ellipse',
    size: [62, 50],
    rotation: 0,
    offset: [46, 4],
    pivot: [0.5, 0.5],
    color: 'light',
    image: null,
  },
  {
    id: 'eye-iris-r',
    bone: 'head',
    layer: 29,
    shape: 'ellipse',
    size: [42, 46],
    rotation: 0,
    offset: [46, 6],
    pivot: [0.5, 0.5],
    color: 'iris',
    image: null,
  },
  {
    id: 'eye-shine-r',
    bone: 'head',
    layer: 30,
    shape: 'ellipse',
    size: [16, 16],
    rotation: 0,
    offset: [38, -6],
    pivot: [0.5, 0.5],
    color: 'light',
    image: null,
  },
  {
    id: 'eye-lash-r',
    bone: 'head',
    layer: 31,
    shape: 'capsule',
    size: [70, 12],
    rotation: 7,
    offset: [46, -18],
    pivot: [0.5, 0.5],
    color: 'ink',
    image: null,
  },
  {
    id: 'brow-l',
    bone: 'head',
    layer: 32,
    shape: 'rect',
    size: [50, 8],
    rotation: -11,
    offset: [-54, -48],
    pivot: [0.5, 0.5],
    color: 'hair',
    image: null,
  },
  {
    id: 'brow-r',
    bone: 'head',
    layer: 33,
    shape: 'rect',
    size: [50, 8],
    rotation: 11,
    offset: [54, -48],
    pivot: [0.5, 0.5],
    color: 'hair',
    image: null,
  },
  {
    id: 'mouth',
    bone: 'head',
    layer: 34,
    shape: 'ellipse',
    size: [26, 10],
    rotation: 0,
    offset: [0, 76],
    pivot: [0.5, 0.5],
    color: 'ribbon',
    image: null,
  },
  {
    id: 'hair-fringe',
    bone: 'head',
    layer: 35,
    shape: 'path',
    smooth: true,
    size: [312, 140],
    rotation: 0,
    offset: [0, -110],
    pivot: [0.5, 0.5],
    color: 'hair',
    // 齐眉刘海：中间压下来一点，两侧扫开，留出眼睛
    points: [
      [0, -0.5], [0.36, -0.36], [0.5, 0.06], [0.4, 0.5],
      [0.2, 0.2], [0, 0.46], [-0.2, 0.2], [-0.4, 0.5],
      [-0.5, 0.06], [-0.36, -0.36],
    ],
    image: null,
  },
  {
    id: 'hair-lock-l',
    bone: 'hair-lock-l',
    layer: 36,
    shape: 'path',
    smooth: true,
    size: [96, 300],
    rotation: 3,
    offset: [0, 0],
    pivot: [0.5, 0.03],
    color: 'hair',
    points: [[0, -0.5], [0.4, -0.2], [0.34, 0.3], [0, 0.5], [-0.34, 0.3], [-0.4, -0.2]],
    image: null,
  },
  {
    id: 'hair-lock-r',
    bone: 'hair-lock-r',
    layer: 37,
    shape: 'path',
    smooth: true,
    size: [96, 300],
    rotation: -3,
    offset: [0, 0],
    pivot: [0.5, 0.03],
    color: 'hair',
    points: [[0, -0.5], [0.4, -0.2], [0.34, 0.3], [0, 0.5], [-0.34, 0.3], [-0.4, -0.2]],
    image: null,
  },
  {
    id: 'earring-l',
    bone: 'head',
    layer: 38,
    shape: 'ellipse',
    size: [24, 56],
    rotation: 0,
    offset: [-114, 22],
    pivot: [0.5, 0],
    color: 'gold',
    image: null,
  },
  {
    id: 'earring-r',
    bone: 'head',
    layer: 39,
    shape: 'ellipse',
    size: [24, 56],
    rotation: 0,
    offset: [114, 22],
    pivot: [0.5, 0],
    color: 'gold',
    image: null,
  },
];

export const fire = {
  id: 'fire',
  name: '焰',
  title: '五行 · 火',
  role: '爆发直伤',
  canvas: CANVAS,

  // 取自 AI 参考图的配色，占位图按这套画，风格不会跑偏。
  palette: {
    main: '#e24b4a', // 朱红短打
    deep: '#8f2320', // 深红内衬
    gold: '#f0b45a', // 金线滚边
    skin: '#f6d9c6',
    hair: '#3a2a28',
    ribbon: '#b3302c', // 红绸
    flame: '#ffb347',
    steel: '#dfe6f0',
    ink: '#2a1a18', // 睫毛、眉毛压深一档
    iris: '#ff8a3d', // 琥珀色瞳，一眼看出是火
    light: '#fdf3e7', // 高光、眼白
  },

  bones,
  parts,
};

/** 部件按绘制顺序排好，layer 小的在背后。 */
export function drawOrder(portrait) {
  return [...portrait.parts].sort((a, b) => a.layer - b.layer);
}

/** 骨骼查表，预览和将来的绑定代码都用它。 */
export function boneIndex(portrait) {
  return new Map(portrait.bones.map((bone) => [bone.id, bone]));
}

/** 部件清单体检：返回问题列表，空数组表示可以交给 Spine。 */
export function lintPortrait(portrait) {
  const problems = [];
  const ids = new Set();
  const boneIds = new Set(portrait.bones.map((bone) => bone.id));
  const layers = new Map();

  for (const part of portrait.parts) {
    if (ids.has(part.id)) problems.push(`部件 id 重复：${part.id}`);
    ids.add(part.id);

    if (!boneIds.has(part.bone)) problems.push(`${part.id} 挂在不存在的骨骼 ${part.bone} 上`);
    if (layers.has(part.layer)) problems.push(`layer ${part.layer} 被 ${layers.get(part.layer)} 和 ${part.id} 共用`);
    layers.set(part.layer, part.id);

    if (part.shape === 'path' && !Array.isArray(part.points)) problems.push(`${part.id} 声明了 path 却没给 points`);
    if (part.shape === 'path') {
      for (const [x, y] of part.points) {
        if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) problems.push(`${part.id} 的路径点越出 [-0.5, 0.5]：${x},${y}`);
      }
    }
    if (!Array.isArray(part.size) || part.size.some((n) => !(n > 0))) problems.push(`${part.id} 的 size 不合法`);
    if (!Array.isArray(part.pivot) || part.pivot.some((n) => n < 0 || n > 1)) problems.push(`${part.id} 的 pivot 不在 0..1`);
  }

  for (const bone of portrait.bones) {
    if (bone.parent && !boneIds.has(bone.parent)) problems.push(`骨骼 ${bone.id} 的父骨 ${bone.parent} 不存在`);
  }

  return problems;
}
