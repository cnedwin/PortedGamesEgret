// 部件清单 ⇄ Spine 骨架 的双向转换
//
// 清单里的坐标是画布坐标（原点左上，y 向下，单位像素），Spine 的坐标是
// y 向上的。这份文件只做两件事：把清单翻成 Spine 4.1 的 JSON，以及把它翻回来。
//
// 翻回来这一步不是为了好玩：`spine.test.mjs` 用它做往返测试。导出的骨架再读回来
// 必须和原清单逐字段相等，否则说明转换里丢了东西——而丢的那点东西，等到美术
// 交付真图、动画师开始 K 帧的时候才会暴露，那时候改起来是灾难。
//
// 坐标约定（原点取画布底部中心，人物正好站在 y = 0 上）：
//   spine_x = canvas_x - canvas.width / 2
//   spine_y = canvas.height - canvas_y
//   spine_rotation = -canvas_rotation      （y 翻转，顺时针变逆时针）

const r3 = (n) => {
  const v = Math.round(n * 1000) / 1000;
  return Object.is(v, -0) ? 0 : v;
};

const rad = (deg) => (deg * Math.PI) / 180;

/** 绕原点把 (x, y) 旋转 deg 度，画布方向（顺时针为正）。 */
function spin(x, y, deg) {
  const a = rad(deg);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
}

/**
 * 把部件清单导出成 Spine 4.1 骨架。
 *
 * 注意 attachment 的 (x, y) 在 Spine 里是**图片中心**，而清单里的 offset 是**轴心**。
 * 两者差一个「轴心到中心」的向量，得按部件自己的旋转摆过去，不能直接照抄。
 */
export function toSpineSkeleton(portrait, { images = './' } = {}) {
  const { width, height } = portrait.canvas;
  const halfW = width / 2;
  const sx = (x) => x - halfW;
  const sy = (y) => height - y;

  const byId = new Map(portrait.bones.map((bone) => [bone.id, bone]));

  const bones = portrait.bones.map((bone) => {
    const parent = bone.parent ? byId.get(bone.parent) : null;
    return {
      name: bone.id,
      ...(bone.parent ? { parent: bone.parent } : {}),
      x: r3(sx(bone.x) - (parent ? sx(parent.x) : 0)),
      y: r3(sy(bone.y) - (parent ? sy(parent.y) : 0)),
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    };
  });

  const ordered = [...portrait.parts].sort((a, b) => a.layer - b.layer);

  const slots = ordered.map((part) => ({
    name: part.id,
    bone: part.bone,
    attachment: part.id,
  }));

  const skinAttachments = {};
  for (const part of ordered) {
    const [w, h] = part.size;
    const [px, py] = part.pivot;
    const [dx, dy] = part.offset;

    // 轴心 → 中心，在部件自己的坐标系里
    const [rx, ry] = spin((0.5 - px) * w, (0.5 - py) * h, part.rotation);

    skinAttachments[part.id] = {
      [part.id]: {
        type: 'region',
        x: r3(dx + rx),
        y: r3(-(dy + ry)),
        rotation: r3(-part.rotation),
        width: r3(w),
        height: r3(h),
        scaleX: 1,
        scaleY: 1,
      },
    };
  }

  return {
    skeleton: {
      hash: `${portrait.id}-portrait`,
      spine: '4.1.0',
      x: 0,
      y: 0,
      width,
      height,
      images,
      audio: '',
    },
    bones,
    slots,
    skins: [{ name: 'default', attachments: skinAttachments }],
    animations: {},
  };
}

/**
 * 从 Spine 骨架还原出部件清单，用于往返校验。
 *
 * Spine 只存渲染几何：size 和 pivot 都被烘进了 attachment 的 x/y 和 width/height。
 * 所以要传原清单进来提供这两样，才能把「中心」反解回「轴心」。
 * 形状、颜色、路径点这些 Spine 不管的东西，原样带回去。
 */
export function fromSpineSkeleton(skeleton, portrait) {
  const { width, height } = skeleton.skeleton;
  const halfW = width / 2;

  const spineBones = new Map(skeleton.bones.map((bone) => [bone.name, bone]));
  const shapeById = new Map(portrait.parts.map((part) => [part.id, part]));

  // 骨骼的 x/y 是相对父骨的，累加回绝对坐标
  const absolute = new Map();
  const absOf = (name) => {
    if (absolute.has(name)) return absolute.get(name);
    const bone = spineBones.get(name);
    if (!bone) throw new Error(`骨架里没有骨骼 ${name}`);
    const parent = bone.parent ? absOf(bone.parent) : { x: 0, y: 0 };
    const point = { x: parent.x + (bone.x ?? 0), y: parent.y + (bone.y ?? 0) };
    absolute.set(name, point);
    return point;
  };

  const bones = skeleton.bones.map((bone) => {
    const abs = absOf(bone.name);
    return {
      id: bone.name,
      parent: bone.parent ?? null,
      x: r3(abs.x + halfW),
      y: r3(height - abs.y),
    };
  });

  const skin = skeleton.skins[0].attachments;
  const parts = skeleton.slots.map((slot, index) => {
    const attachment = skin[slot.name][slot.attachment];
    const shape = shapeById.get(slot.name);
    if (!shape) throw new Error(`清单里没有部件 ${slot.name}`);

    const rotation = r3(-attachment.rotation);
    const [px, py] = shape.pivot;
    // 中心 → 轴心：把「轴心到中心」的向量按同一个旋转摆回去
    const [rx, ry] = spin((0.5 - px) * attachment.width, (0.5 - py) * attachment.height, rotation);

    return {
      ...shape,
      bone: slot.bone,
      layer: index,
      offset: [r3(attachment.x - rx), r3(-attachment.y - ry)],
      rotation,
      size: [r3(attachment.width), r3(attachment.height)],
    };
  });

  return { bones, parts, canvas: { width, height } };
}

/**
 * 清单体检通过后，给美术的交付单：每个部件要一张多大的图、挂在哪儿、画在第几层。
 * 这张表就是「换真图」时唯一需要照着做的东西。
 */
export function toManifest(portrait) {
  const ordered = [...portrait.parts].sort((a, b) => a.layer - b.layer);
  return {
    portrait: portrait.id,
    name: portrait.name,
    canvas: portrait.canvas,
    format: 'PNG, RGBA8888, 像素尺寸与 size 完全一致，透明底',
    note: portrait.atlas
      ? '独立 PNG 保持原尺寸。offset 是骨骼到轴心的偏移，rect 是图集取样矩形。'
      : '每张图按 size 输出，轴心在 pivot 指定的位置。换成真美术后 skeleton.json 不用改。',
    ...(portrait.atlas ? { atlas: portrait.atlas, anchor: portrait.anchor } : {}),
    bones: portrait.bones.map((bone) => ({
      id: bone.id,
      parent: bone.parent,
      at: [bone.x, bone.y],
    })),
    parts: ordered.map((part, index) => ({
      order: index,
      id: part.id,
      file: `${part.id}.png`,
      bone: part.bone,
      layer: part.layer,
      size: part.size,
      pivot: part.pivot,
      rotation: part.rotation,
      offset: part.offset,
      ...(part.rect ? { rect: part.rect } : {}),
    })),
  };
}

/** Spine 4.1 图集，部件名与 JSON 中的 region 附件名一致。 */
export function toSpineAtlas(portrait, page = 'atlas.png') {
  const { width, height } = portrait.atlas;
  const regions = portrait.parts.map((part) => `${part.id}\n  bounds: ${part.rect.join(',')}`);
  return [page, `size: ${width},${height}`, 'format: RGBA8888', 'filter: Linear,Linear',
    'repeat: none', 'pma: false', ...regions, ''].join('\n');
}
