// 立绘绑定：把部件清单变成一棵骨骼树 + 一个平铺的绘制层。
//
// 为什么不是"部件直接挂在骨上"？
//
// 因为那样 layer 就失效了。部件挂在各自骨骼下时，真正的绘制顺序是骨骼树的
// 深度优先遍历，sort 只决定同一根骨下几个部件的先后；子骨永远排在父骨自己的
// 部件之前。踩过的结果是：清单里 blade 写着 layer 19、robe 写着 9，屏幕上刀却
// 整把被身体盖住，近侧手臂也藏在袍子里。
//
// 试过"给每根骨算子树里最小的 layer 再合并排序"，也不成立：hair-back 是 0、
// 藏在头骨深处，于是头、颈、胸、脊、胯的子树最小值全被拉到 0，整棵树又平了。
//
// 所以按 Spine 的做法分开：
//   · 骨骼树只管变换（纯数据，不是显示对象）；
//   · 部件全放在一个平层里，按 layer 排序，那是唯一的绘制顺序；
//   · 每个部件记住自己挂在哪根骨上，改完骨骼调一次 sync() 把世界变换写下去。
// 贴图和矢量共用变换，贴图部件从同一张 PNG 图集取像素。

import { PALETTE, tracePart } from './draw.mjs';

const hex = (value) => Number.parseInt(value.replace('#', ''), 16);
const DEG = Math.PI / 180;

/**
 * 造一个立绘。
 * 返回 `{ holder, bones, sync, place, width, height }`：
 * `holder` 是整个立绘的容器，`bones` 是骨骼 id 到变换节点的表，
 * 改完节点调 `sync()` 让部件跟上。
 */
export function buildPortrait({ portrait, Sprite, scope, Bitmap, textureLease }) {
  const palette = Object.fromEntries(Object.entries(portrait.palette ?? {}).map(([key, value]) => [key, hex(value)]));

  // 骨骼：纯变换，不参与绘制
  const bones = new Map();
  for (const bone of portrait.bones) {
    bones.set(bone.id, { id: bone.id, parent: bone.parent ?? null, x: 0, y: 0, rotation: 0, scale: 1 });
  }
  const absolute = new Map(portrait.bones.map((bone) => [bone.id, bone]));
  for (const bone of portrait.bones) {
    const node = bones.get(bone.id);
    // 清单里的坐标是画布绝对坐标，节点存的是相对父骨的偏移。
    // 这里必须查清单里的绝对坐标，不能查 nodes 里已经减过的值——那会连减两层。
    const parent = bone.parent ? absolute.get(bone.parent) : null;
    node.x = bone.x - (parent?.x ?? 0);
    node.y = bone.y - (parent?.y ?? 0);
  }

  // ── 部件：一个平层，按 layer 排 ────────────────────────────────
  const layer = new Sprite();
  scope.use(layer);

  const drawn = [];
  for (const part of [...portrait.parts].sort((a, b) => a.layer - b.layer)) {
    const [w, h] = part.size;
    const [px, py] = part.pivot;
    let sprite;
    if (part.rect) {
      sprite = scope.use(new Bitmap(textureLease));
      const [x, y, width, height] = part.rect;
      sprite.sourceRect = { x, y, width, height };
      sprite.anchorOffsetX = px * w;
      sprite.anchorOffsetY = py * h;
    } else {
      sprite = scope.use(new Sprite());
      // 矢量形状以中心绘制，换算到轴心作为局部原点。
      const fill = palette[part.color] ?? PALETTE.text;
      sprite.graphics.beginFill(fill, 1);
      tracePart(sprite.graphics, part, (0.5 - px) * w, (0.5 - py) * h);
      sprite.graphics.endFill();
    }

    layer.addChild(sprite);
    drawn.push({ sprite, part, offset: part.offset, rotation: part.rotation, bone: part.bone });
  }

  /** 骨骼世界变换：把「父骨 × 本地」一路乘下去，缓存一份。 */
  const world = new Map();
  const worldOf = (id) => {
    const cached = world.get(id);
    if (cached) return cached;
    const node = bones.get(id);
    const local = matrixOf(node.x, node.y, node.rotation, node.scale);
    const parent = node.parent ? worldOf(node.parent) : IDENTITY;
    const result = multiply(parent, local);
    world.set(id, result);
    return result;
  };

  /** 把骨骼的世界变换写到每个部件上。改完骨骼不调这个，画面不会动。 */
  function sync() {
    world.clear();
    for (const item of drawn) {
      const m = worldOf(item.bone);
      item.sprite.x = m.a * item.offset[0] + m.c * item.offset[1] + m.tx;
      item.sprite.y = m.b * item.offset[0] + m.d * item.offset[1] + m.ty;
      item.sprite.rotation = Math.atan2(m.b, m.a) / DEG + item.rotation;
      const scale = Math.hypot(m.a, m.b);
      item.sprite.scaleX = scale;
      item.sprite.scaleY = scale;
    }
  }
  sync();

  const holder = new Sprite();
  scope.use(holder);
  holder.addChild(layer);
  const [anchorX, anchorY] = portrait.anchor ?? [512, 1150];
  const profile = MOTION_PROFILES[portrait.id] ?? [];
  const motion = profile.flatMap(([name, sway, strike, lift = 0], index) => {
    const bone = bones.get(name);
    return bone ? [{ bone, restY: bone.y, sway, strike, lift, phase: index * 0.41 }] : [];
  });

  return {
    holder,
    bones,
    sync,
    width: portrait.canvas.width,
    height: portrait.canvas.height,
    /** 让设定的画布锚点落在 (x, y)。 */
    place(x, y, scale, anchor = { x: anchorX, y: anchorY }) {
      holder.scaleX = holder.scaleY = scale;
      holder.x = x - anchor.x * scale;
      holder.y = y - anchor.y * scale;
    },
    /** attack 和 recoil 分别表示出招、受击的幅度，范围为 0 到 1。 */
    pose(seconds, attack = 0, recoil = 0) {
      const unit = portrait.canvas.height / 1024;
      for (const { bone, restY, sway, strike, lift, phase } of motion) {
        const wave = Math.sin(seconds * 1.9 + phase);
        bone.rotation = wave * sway + (attack - recoil * 0.35) * strike;
        bone.y = restY + wave * lift * unit;
      }
      sync();
    },
  };
}

// 每行是骨名、待机摇摆角、出招角和纵向起伏。缺少的次要骨骼留给对应角色。
const MOTION_PROFILES = {
  fire: [
    ['chest', 0.8, -1.8, 2.8], ['head', 0.7, 1.1, 1.0],
    ['shoulder-near', 1.0, -13], ['elbow-near', 0.6, -6], ['hand-near', 0.35, -5],
    ['shoulder-far', 0.8, 4], ['elbow-far', 0.6, 2],
    ['hair-tail', 2.5, 6], ['hair-lock-l', 1.5, -2], ['hair-lock-r', 1.5, 2],
    ['skirt-l', 1.2, 2], ['skirt-r', 1.2, -2], ['ribbon', 2.5, 7],
  ],
  shanjiao: [
    ['root', 0.5, 1.5, 1.7], ['body', 1.3, -4, 1.8], ['head', 0.18, 0.72],
    ['left-arm', 1.0, -12], ['right-arm', 0.18, 1.26], ['mane', 0.24, 0.64],
  ],
  chijiao: [
    ['root', 0.8, -2.5, 2.7], ['body', 1.8, -4.5, 1.9], ['head', 1.3, -7],
    // 尾骨在外弯的分片接缝。保留尾尖摆动，并把接缝的位移压在覆盖区内。
    ['left-arm', 1.7, -8], ['right-arm', 1.7, 8], ['mane', 2.7, 5], ['tail', 0.8, 3.4],
  ],
  hundun: [
    ['root', 1.0, -2, 3.1], ['body', 0.9, 2.5, 1.6], ['head', 0.8, -4],
    // 后胯随躯干前冲。前爪只在肩甲的覆盖范围内单独转动。
    ['left-arm', 1.3, -10], ['right-arm', 0.26, 2], ['mane', 2.3, 5],
  ],
};

// ── 2D 仿射矩阵 ────────────────────────────────────────────────
// 只用到平移、旋转、等比缩放，所以四元组 + 平移就够了：
//   x' = a·x + c·y + tx
//   y' = b·x + d·y + ty

const IDENTITY = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

function matrixOf(x, y, rotationDeg, scale) {
  const r = rotationDeg * DEG;
  const cos = Math.cos(r) * scale;
  const sin = Math.sin(r) * scale;
  return { a: cos, b: sin, c: -sin, d: cos, tx: x, ty: y };
}

function multiply(p, q) {
  return {
    a: p.a * q.a + p.c * q.b,
    b: p.b * q.a + p.d * q.b,
    c: p.a * q.c + p.c * q.d,
    d: p.b * q.c + p.d * q.d,
    tx: p.a * q.tx + p.c * q.ty + p.tx,
    ty: p.b * q.tx + p.d * q.ty + p.ty,
  };
}
