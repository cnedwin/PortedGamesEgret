import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ATLAS_PORTRAITS, loadPortraitAtlas, portraitFromAtlas } from './atlas.mjs';
import { MOTION_CLIPS } from './motion-clips.mjs';
import { toManifest, toSpineAtlas, toSpineSkeleton } from './spine.mjs';

const authored = () => ({
  name: '山魈',
  canvas: { width: 100, height: 140 },
  anchor: [50, 90],
  bones: [
    { id: 'head', parent: 'root', x: 65, y: 36 },
    { id: 'root', parent: null, x: 50, y: 90 },
  ],
  parts: [
    { id: 'back', bone: 'root', rect: [2, 2, 20, 40], at: [35, 77] },
    { id: 'face', bone: 'head', rect: [24, 2, 46, 40], at: [40, 11], pivot: [0.25, 0.75] },
  ],
});

test('slices keep their authored positions and Spine parents precede children', () => {
  const portrait = portraitFromAtlas('shanjiao', authored(), 80, 48);
  assert.deepEqual(portrait.bones.map((bone) => bone.id), ['root', 'head']);
  const skeleton = toSpineSkeleton(portrait, { images: '../portraits/shanjiao/parts/' });
  assert.equal(skeleton.skeleton.images, '../portraits/shanjiao/parts/');
  assert.deepEqual(skeleton.slots.map((slot) => slot.name), ['back', 'face']);
  const face = skeleton.skins[0].attachments.face.face;
  assert.deepEqual([face.width, face.height, face.x, face.y], [46, 40, -2, 5]);
  assert.deepEqual(toManifest(portrait).parts[1].rect, [24, 2, 46, 40]);
  assert.match(toSpineAtlas(portrait, '../portraits/shanjiao/atlas.png'),
    /^\.\.\/portraits\/shanjiao\/atlas\.png\nsize: 80,48[\s\S]*face\n  bounds: 24,2,46,40\n$/);
});

test('invalid crops, missing sockets and cyclic bone graphs fail during loading', () => {
  const wrongCrop = authored();
  wrongCrop.parts[1].rect[0] = 48;
  assert.throws(() => portraitFromAtlas('shanjiao', wrongCrop, 80, 48), /越出图集/);
  const badBone = authored();
  badBone.bones[0].parent = 'missing';
  assert.throws(() => portraitFromAtlas('shanjiao', badBone, 80, 48), /未知父骨/);
  const cycle = authored();
  cycle.bones[0].parent = 'head';
  assert.throws(() => portraitFromAtlas('shanjiao', cycle, 80, 48), /循环/);
});

test('runtime requests one engine texture lease for a complete portrait', async () => {
  const calls = [];
  const manifest = async (url) => {
    calls.push(url.href);
    return { ok: true, json: async () => authored() };
  };
  const textureLease = { value: { width: 80, height: 48 } };
  const game = { loadTexture: async (url) => { calls.push(url); return textureLease; } };
  const rig = await loadPortraitAtlas(game, 'shanjiao', manifest);
  assert.equal(rig.textureLease, textureLease);
  assert.equal(rig.portrait.parts.length, 2);
  assert.deepEqual(calls.map((url) => url.split('/').slice(-2)), [['shanjiao', 'rig.json'], ['shanjiao', 'atlas.png']]);
});

test('checked-in Spine files have the current motion tracks and cues for all portraits', async () => {
  for (const id of ATLAS_PORTRAITS) {
    const asset = (file) => readFile(new URL(`../../assets/${file}`, import.meta.url));
    const [rig, png, exported] = await Promise.all([
      asset(`portraits/${id}/rig.json`),
      asset(`portraits/${id}/atlas.png`),
      asset(`spine/${id}.skeleton.json`),
    ]);
    const portrait = portraitFromAtlas(id, JSON.parse(rig), png.readUInt32BE(16), png.readUInt32BE(20));
    const images = `../portraits/${id}/parts/`;
    const actual = JSON.parse(exported);
    assert.deepEqual(Object.keys(actual.animations).sort(), ['attack', 'hit', 'idle', 'lose', 'win'], id);
    assert.deepEqual(actual, toSpineSkeleton(portrait, { images, clips: MOTION_CLIPS[id] }), id);
  }
});
