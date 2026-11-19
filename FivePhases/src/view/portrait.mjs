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
// 接真美术时把 Graphics 换成 Bitmap，这一套一行都不用改。

import { PALETTE, tracePart } from './draw.mjs';

const hex = (value) => Number.parseInt(value.replace('#', ''), 16);
const DEG = Math.PI / 180;

/**
 * 造一个立绘。
 * 返回 `{ holder, bones, sync, place, width, height }`：
 * `holder` 是整个立绘的容器，`bones` 是骨骼 id 到变换节点的表，
 * 改完节点调 `sync()` 让部件跟上。
 */
export function buildPortrait({ portrait, Sprite, scope }) {
  const palette = Object.fromEntries(Object.entries(portrait.palette).map(([key, value]) => [key, hex(value)]));

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
    const sprite = new Sprite();
    scope.use(sprite);
    const [w, h] = part.size;
    const [px, py] = part.pivot;

    // 轴心落到原点：图形整体挪一个「轴心到中心」的反向量
    const shiftX = -(px - 0.5) * w;
    const shiftY = -(py - 0.5) * h;

    const fill = palette[part.color] ?? PALETTE.text;
    sprite.graphics.beginFill(fill, 1);
    tracePart(sprite.graphics, part, shiftX, shiftY);
    sprite.graphics.endFill();
    // 描边把相邻部件分开，否则同色的头发和衣服会糊成一片。
    // 2px 在缩到 0.33 之后只剩半个像素，等于没有；3px 是能看见的下限。
    // (描边暂时关掉，量一下代价)

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

  return {
    holder,
    bones,
    sync,
    width: portrait.canvas.width,
    height: portrait.canvas.height,
    /** 让立绘的某一点（默认胯部）落在 (x, y)，并按 scale 缩放。 */
    place(x, y, scale, anchor = { x: 512, y: 1150 }) {
      holder.scaleX = holder.scaleY = scale;
      holder.x = x - anchor.x * scale;
      holder.y = y - anchor.y * scale;
    },
  };
}

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
