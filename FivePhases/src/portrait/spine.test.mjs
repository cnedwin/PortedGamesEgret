import assert from 'node:assert/strict';
import test from 'node:test';

import { fire, drawOrder, lintPortrait } from './fire.mjs';
import { toSpineSkeleton, fromSpineSkeleton, toManifest } from './spine.mjs';

const CLOSE = 0.02;
const near = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < CLOSE, `${label}: 期望 ${expected}，实际 ${actual}`);

test('部件清单本身先得体检通过', () => {
  assert.deepEqual(lintPortrait(fire), []);
});

test('导出再读回来，骨骼一个不差', () => {
  const back = fromSpineSkeleton(toSpineSkeleton(fire), fire);
  assert.equal(back.bones.length, fire.bones.length);
  for (const [index, bone] of fire.bones.entries()) {
    const other = back.bones[index];
    assert.equal(other.id, bone.id);
    assert.equal(other.parent, bone.parent);
    near(other.x, bone.x, `${bone.id}.x`);
    near(other.y, bone.y, `${bone.id}.y`);
  }
});

test('导出再读回来，部件的挂点、朝向、尺寸一个不差', () => {
  const back = fromSpineSkeleton(toSpineSkeleton(fire), fire);
  assert.equal(back.parts.length, fire.parts.length);
  for (const part of drawOrder(fire)) {
    const other = back.parts.find((item) => item.id === part.id);
    assert.ok(other, `${part.id} 没读回来`);
    assert.equal(other.bone, part.bone, `${part.id} 挂错骨`);
    near(other.offset[0], part.offset[0], `${part.id}.offset.x`);
    near(other.offset[1], part.offset[1], `${part.id}.offset.y`);
    near(other.rotation, part.rotation, `${part.id}.rotation`);
    near(other.size[0], part.size[0], `${part.id}.width`);
    near(other.size[1], part.size[1], `${part.id}.height`);
  }
});

test('绘制顺序按 layer 保住，槽位顺序就是渲染顺序', () => {
  const skeleton = toSpineSkeleton(fire);
  const expected = drawOrder(fire).map((part) => part.id);
  assert.deepEqual(skeleton.slots.map((slot) => slot.name), expected);
});

test('坐标真的翻了 y：头在胯上方，原点落在画布底边中心', () => {
  const skeleton = toSpineSkeleton(fire);
  const bone = (name) => skeleton.bones.find((item) => item.name === name);

  const { width, height } = fire.canvas;
  // 根骨 hip 是 (512, 1150)：x 减半宽，y 从底边往上量
  near(bone('hip').x, 512 - width / 2, 'hip.x');
  near(bone('hip').y, height - 1150, 'hip.y');

  // 头在胯上面，所以 spine y 更大
  const headY = height - 520;
  assert.ok(headY > bone('hip').y, '头必须在胯上方');

  // 子骨存的是相对父骨的偏移，不是绝对坐标
  near(bone('head').y, 700 - 520, 'head 相对 neck 的 y');
  near(bone('head').x, 0, 'head 相对 neck 的 x');
});

test('顺时针的画布旋转到了 Spine 里变成逆时针', () => {
  const skeleton = toSpineSkeleton(fire);
  const blade = skeleton.skins[0].attachments['sword-blade']['sword-blade'];
  const source = fire.parts.find((part) => part.id === 'sword-blade');
  near(blade.rotation, -source.rotation, 'sword-blade.rotation');
  assert.ok(blade.rotation > 0, '刀朝右上，翻到 y 向上之后应该是正角');
});

test('attachment 存的是图片中心，不是轴心', () => {
  const skeleton = toSpineSkeleton(fire);
  const part = fire.parts.find((item) => item.id === 'hair-back');
  const attachment = skeleton.skins[0].attachments['hair-back']['hair-back'];

  // 轴心在 10% 高度处，所以中心比轴心低 40% 的高度（画布方向），翻到 Spine 就是正 y
  const expected = -(part.offset[1] + (0.5 - part.pivot[1]) * part.size[1]);
  near(attachment.y, expected, 'hair-back.y');
  near(attachment.x, part.offset[0], 'hair-back.x');
});

test('槽位都挂在存在的骨骼上，附件尺寸都为正', () => {
  const skeleton = toSpineSkeleton(fire);
  const boneNames = new Set(skeleton.bones.map((bone) => bone.name));
  for (const slot of skeleton.slots) {
    assert.ok(boneNames.has(slot.bone), `${slot.name} 挂在 ${slot.bone}，但没这根骨`);
    const attachment = skeleton.skins[0].attachments[slot.name][slot.attachment];
    assert.equal(attachment.type, 'region');
    assert.ok(attachment.width > 0 && attachment.height > 0, `${slot.name} 尺寸非正`);
  }
});

test('骨架能过 JSON，且过一遍不丢字段', () => {
  const skeleton = toSpineSkeleton(fire);
  const copy = JSON.parse(JSON.stringify(skeleton));
  assert.deepEqual(copy, skeleton);
  assert.equal(copy.skeleton.spine, '4.1.0');
  assert.deepEqual(copy.animations, {});
  assert.equal(copy.events, undefined);
});

test('动作按 Spine 4.1 导出骨骼偏移、片段时长及事件', () => {
  const attack = {
    duration: 0.7,
    tracks: { head: [[0, 0, 0, 0], [0.3, 4, -6, 20]] },
    events: [[0.1, 'windup'], [0.3, 'impact']],
  };
  const skeleton = toSpineSkeleton(fire, { clips: { attack } });
  assert.deepEqual(skeleton.events, { windup: {}, impact: {} });
  assert.deepEqual(skeleton.animations.attack, {
    bones: {
      head: {
        translate: [{ time: 0, x: 0, y: 0 }, { time: 0.3, x: 4, y: 6 }, { time: 0.7, x: 4, y: 6 }],
        rotate: [{ time: 0, value: 0 }, { time: 0.3, value: -20 }, { time: 0.7, value: -20 }],
      },
    },
    events: [{ time: 0.1, name: 'windup' }, { time: 0.3, name: 'impact' }],
  });
});

test('导出时拒绝引用不存在的骨骼', () => {
  const idle = { duration: 1, tracks: { missing: [[0, 0, 0, 0]] } };
  assert.throws(() => toSpineSkeleton(fire, { clips: { idle } }), /fire.*idle.*missing/);
});

test('交付单把每个部件列且只列一次', () => {
  const manifest = toManifest(fire);
  const ids = manifest.parts.map((part) => part.id);
  assert.equal(ids.length, fire.parts.length);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, drawOrder(fire).map((part) => part.id));
  // 顺序编号要和渲染顺序一致，美术按表补图时才不会错层
  manifest.parts.forEach((part, index) => assert.equal(part.order, index));
});

test('改一根骨的位置，挂在它身上的部件跟着走', () => {
  const moved = {
    ...fire,
    bones: fire.bones.map((bone) => (bone.id === 'hand-near' ? { ...bone, x: bone.x + 40 } : bone)),
  };
  const skeleton = toSpineSkeleton(moved);
  const before = toSpineSkeleton(fire);
  const blade = skeleton.skins[0].attachments['sword-blade']['sword-blade'];
  const bladeBefore = before.skins[0].attachments['sword-blade']['sword-blade'];

  // 刀的 attachment 相对手骨没变，变的是手骨的绝对位置——这正是绑定该有的行为
  assert.equal(blade.x, bladeBefore.x);
  const hand = skeleton.bones.find((bone) => bone.name === 'hand-near');
  const handBefore = before.bones.find((bone) => bone.name === 'hand-near');
  assert.equal(hand.x - handBefore.x, 40);
});
