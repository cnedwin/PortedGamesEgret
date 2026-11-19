// 立绘绑定：把部件清单变成一棵真骨骼树。
//
// 每个骨骼一个 Sprite 当容器，子骨挂在父骨里，位置是相对父骨的偏移。
// 部件挂在骨上，轴心落在自己的原点。于是转一根骨，挂在它下面的东西跟着走——
// 这就是 Spine 在做的事，也是"将来换成 Spine 不用重做动画"的原因。
//
// 占位图形用 Graphics 画；接真美术时把 beginFill/tracePart 换成 Bitmap 即可，
// 骨骼、轴心、层序一个都不用动。

import { PALETTE, tracePart } from './draw.mjs';

const hex = (value) => Number.parseInt(value.replace('#', ''), 16);

/**
 * 造一个立绘。
 * 返回 `{ holder, bones, height, width }`：holder 是整个立绘的容器，
 * `bones` 是骨骼 id 到节点的表，动画直接改节点。
 */
export function buildPortrait({ portrait, Sprite, scope }) {
  const palette = Object.fromEntries(Object.entries(portrait.palette).map(([key, value]) => [key, hex(value)]));
  const byId = new Map(portrait.bones.map((bone) => [bone.id, bone]));
  const nodes = new Map();

  for (const bone of portrait.bones) {
    const node = new Sprite();
    scope.use(node);
    nodes.set(bone.id, node);
  }

  let root = null;
  for (const bone of portrait.bones) {
    const node = nodes.get(bone.id);
    if (bone.parent) {
      const parent = byId.get(bone.parent);
      node.x = bone.x - parent.x;
      node.y = bone.y - parent.y;
      nodes.get(bone.parent).addChild(node);
    } else {
      node.x = bone.x;
      node.y = bone.y;
      root = node;
    }
  }

  const ordered = [...portrait.parts].sort((a, b) => a.layer - b.layer);
  for (const part of ordered) {
    const sprite = new Sprite();
    scope.use(sprite);
    const [w, h] = part.size;
    const [px, py] = part.pivot;
    sprite.x = part.offset[0];
    sprite.y = part.offset[1];
    sprite.rotation = part.rotation;
    sprite.alpha = part.alpha ?? 1;

    // 轴心落到原点：图形整体挪一个「轴心到中心」的反向量
    const shiftX = -(px - 0.5) * w;
    const shiftY = -(py - 0.5) * h;

    const fill = palette[part.color] ?? PALETTE.text;
    sprite.graphics.beginFill(fill, 1);
    tracePart(sprite.graphics, part, shiftX, shiftY);
    sprite.graphics.endFill();
    // 描边把相邻部件分开，否则同色的头发和衣服会糊成一片
    sprite.graphics.lineStyle(2, 0x1a1210, 0.35);
    tracePart(sprite.graphics, part, shiftX, shiftY);

    nodes.get(part.bone).addChild(sprite);
  }

  const holder = new Sprite();
  scope.use(holder);
  holder.addChild(root);

  return {
    holder,
    root,
    bones: nodes,
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
