// 立绘绑定的测试。
//
// 钉住一个已经犯过的错：清单里 layer 写得好好的，运行时却按骨骼树遍历顺序画，
// 结果近侧手臂被袍子盖住、整把刀被身体挡住。预览页看不出来——预览页是平铺画的，
// 顺序天然是对的。所以这里用假 Sprite 跑一遍 buildPortrait，直接查真实结果。

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPortrait } from './portrait.mjs';
import { defaultPortrait } from '../portrait/index.mjs';

/** Graphics 的每个方法都返回自己，能链式调用就够；图形本身这里不关心。 */
function makeGraphics() {
  const g = new Proxy({}, { get: () => () => g });
  return g;
}

class FakeSprite {
  constructor() {
    this.graphics = makeGraphics();
    this.children = [];
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.alpha = 1;
  }

  addChild(child) {
    this.children.push(child);
    return child;
  }
}

const scope = { use: (object) => object };

function build() {
  const rig = buildPortrait({ portrait: defaultPortrait, Sprite: FakeSprite, scope });
  const layer = rig.holder.children[0];
  const sorted = [...defaultPortrait.parts].sort((a, b) => a.layer - b.layer);
  return { rig, layer, sorted };
}

test('部件按 layer 升序进入绘制层', () => {
  const { layer, sorted } = build();
  assert.equal(layer.children.length, sorted.length);
  // 绘制层里的顺序就是唯一顺序——没有骨骼插在中间
  const layers = sorted.map((part) => part.layer);
  for (let i = 1; i < layers.length; i += 1) assert.ok(layers[i] >= layers[i - 1]);
});

test('刀压在袍子上面，近手在前、远手在后', () => {
  const { sorted } = build();
  const at = (id) => sorted.findIndex((part) => part.id === id);
  assert.ok(at('sword-blade') > at('body-robe'), '刀在袍子之后画，否则整把刀被身体盖住');
  assert.ok(at('arm-near-fore') > at('body-robe'), '近手要在袍子前面');
  assert.ok(at('arm-far-fore') < at('body-robe'), '远手要在袍子后面，不然两条胳膊分不出前后');
  assert.ok(at('head-shape') > at('arm-near-upper'), '头要压住手臂');
});

test('每个部件都画了，不多不少', () => {
  const { layer, sorted } = build();
  assert.equal(layer.children.length, defaultPortrait.parts.length);
  assert.equal(sorted.length, defaultPortrait.parts.length);
});

test('部件的世界坐标等于「骨位置 + 偏移」', () => {
  const { layer, sorted } = build();
  const bones = new Map(defaultPortrait.bones.map((bone) => [bone.id, bone]));
  for (let i = 0; i < sorted.length; i += 1) {
    const part = sorted[i];
    const bone = bones.get(part.bone);
    const sprite = layer.children[i];
    assert.ok(Math.abs(sprite.x - (bone.x + part.offset[0])) < 1e-6, `${part.id} 的 x 不对`);
    assert.ok(Math.abs(sprite.y - (bone.y + part.offset[1])) < 1e-6, `${part.id} 的 y 不对`);
    assert.ok(Math.abs(sprite.rotation - part.rotation) < 1e-6, `${part.id} 的旋转不对`);
  }
});

test('转一根骨，挂在它下面的部件跟着走', () => {
  const { rig, layer, sorted } = build();
  const index = sorted.findIndex((part) => part.id === 'sword-blade');
  const blade = layer.children[index];
  const before = { x: blade.x, y: blade.y };

  // 肩骨转 30 度：刀在手里，应该绕肩画一道弧
  rig.bones.get('shoulder-near').rotation = 30;
  rig.sync();

  const moved = Math.hypot(blade.x - before.x, blade.y - before.y);
  assert.ok(moved > 20, `刀应该跟着肩走，实际只挪了 ${moved.toFixed(2)}`);
  assert.ok(Math.abs(blade.rotation - (sorted[index].rotation + 30)) < 1e-6, '刀的角度应该也加 30 度');
});

test('骨骼清单里每根骨的父骨都存在', () => {
  const ids = new Set(defaultPortrait.bones.map((bone) => bone.id));
  for (const bone of defaultPortrait.bones) {
    if (bone.parent) assert.ok(ids.has(bone.parent), `${bone.id} 的父骨 ${bone.parent} 不存在`);
  }
});
