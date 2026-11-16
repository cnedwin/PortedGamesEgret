// Checks that what was drawn and rigged agrees with the rules, and that the page can find everything it loads.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { BOSS } from '../src/rules/boss.mjs';
import { FOES } from '../src/rules/foes.mjs';
import { ATTACKS } from '../src/rules/hero.mjs';
import { skeletonBones, skeletonOf, timelines } from '../tools/author.mjs';
import { toTiled } from '../tools/level.mjs';
import * as act1 from '../tools/levels/act1.mjs';
import * as archer from '../tools/puppets/archer.mjs';
import * as dummy from '../tools/puppets/dummy.mjs';
import * as nezha from '../tools/puppets/nezha.mjs';
import * as spearman from '../tools/puppets/spearman.mjs';
import * as wukong from '../tools/puppets/wukong.mjs';
import { SCENERY } from '../tools/scenery.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
  read = file => fs.readFileSync(path.join(ROOT, file)),
  PUPPETS = { wukong, dummy, spearman, archer, nezha };

test('each puppet is put together soundly', () => {
  for (const [name, puppet] of Object.entries(PUPPETS)) {
    const seen = new Set();
    for (const [bone, parent, at, to] of puppet.bones) {
      assert.ok(parent === null ? seen.size === 0 : seen.has(parent), `${name}: ${bone} comes before its parent`);
      assert.ok(Math.hypot(to[0] - at[0], to[1] - at[1]) > 1, `${name}: ${bone} has no length`);
      seen.add(bone);
    }
    assert.equal(seen.size, puppet.bones.length, `${name}: a bone is named twice`);
    const pieces = puppet.parts.map(([part]) => part);
    assert.equal(new Set(pieces).size, pieces.length, `${name}: a piece is named twice`);
    for (const [part, bone, art] of puppet.parts) {
      assert.ok(seen.has(bone), `${name}: ${part} hangs on no bone`);
      assert.ok(art.includes('<path') && !art.includes('NaN'), `${name}: ${part} is not drawn`);
    }
    // The standing pose puts each bone back where it was drawn.
    const made = skeletonBones(puppet.bones);
    assert.deepEqual([made[0].x, made[0].y], [0, 0]);
    for (const bone of made) assert.ok([bone.x, bone.y, bone.rotation, bone.length].every(Number.isFinite), `${name}: ${bone.name}`);
  }
});

test('animations move only bones that exist, in order of time, within their length', () => {
  for (const [name, puppet] of Object.entries(PUPPETS)) {
    const bones = new Set(puppet.bones.map(([bone]) => bone));
    for (const [title, animation] of Object.entries(puppet.animations)) {
      assert.ok(animation.seconds > 0 && animation.seconds < 5, `${name}.${title}`);
      for (const [bone, tracks] of Object.entries(animation.bones)) {
        assert.ok(bones.has(bone), `${name}.${title} moves ${bone}, which is not a bone`);
        for (const [kind, keys] of Object.entries(tracks)) {
          assert.ok(kind === 'rot' || kind === 'pos' || kind === 'scale', `${name}.${title}.${bone}.${kind}`);
          assert.equal(keys[0][0], 0, `${name}.${title}.${bone} does not start at 0`);
          assert.ok(keys.at(-1)[0] <= 1, `${name}.${title}.${bone} runs past the end`);
          for (let i = 1; i < keys.length; i++) assert.ok(keys[i][0] > keys[i - 1][0], `${name}.${title}.${bone}: keys out of order`);
        }
      }
      const lines = timelines(animation);
      for (const track of Object.values(lines.bones)) for (const keys of Object.values(track)) for (const key of keys) assert.ok(key.time <= animation.seconds + 1e-9);
    }
  }
});

test("the puppet's blows are as long as the rules say, and strike when the rules say", () => {
  for (const attack of ATTACKS) {
    const animation = wukong.animations[attack.name];
    assert.ok(animation, attack.name);
    assert.equal(animation.seconds, attack.seconds, attack.name);
    const [at] = animation.events.find(([, event]) => event === 'hit');
    assert.ok(Math.abs(at * animation.seconds - attack.hitAt) < 0.02, `${attack.name} strikes at ${at * animation.seconds}, the rules at ${attack.hitAt}`);
  }
  for (const needed of ['idle', 'run', 'jump', 'fall', 'land', 'dash', 'hurt', 'down']) assert.ok(wukong.animations[needed], needed);
  for (const kind of new Set(ATTACKS.map(attack => attack.kind))) assert.ok(dummy.animations[kind], `the post has no way to take a ${kind}`);
  assert.ok(dummy.animations.idle);
});

test('a loop ends as it began, so that it repeats without a jerk', () => {
  for (const [puppet, loops] of [[wukong, ['idle', 'run', 'fall']], [dummy, ['idle']], [spearman, ['idle', 'walk']], [archer, ['idle']], [nezha, ['idle', 'move', 'charge', 'calm', 'wrath', 'held', 'bare']]])
    for (const title of loops)
      for (const [bone, tracks] of Object.entries(puppet.animations[title].bones))
        for (const [kind, keys] of Object.entries(tracks)) {
          assert.equal(keys.at(-1)[0], 1, `${title}.${bone} stops early`);
          // A wheel that has gone round whole turns is where it began.
          const whole = value => (kind === 'rot' ? ((value % 360) + 360) % 360 : value);
          assert.deepEqual(keys.at(-1).slice(1).filter(Number.isFinite).map(whole), keys[0].slice(1).filter(Number.isFinite).map(whole), `${title}.${bone}`);
        }
});

test('the files the tool wrote are the ones the manifest names', () => {
  const manifest = JSON.parse(read('assets/manifest.json'));
  const byId = new Map(manifest.entries.map(entry => [entry.id, entry]));
  for (const name of Object.keys(PUPPETS)) {
    for (const id of [`e_${name}_page`, `e_${name}_atlas`, `e_${name}`]) {
      const entry = byId.get(id);
      assert.ok(entry, id);
      for (const file of [entry.artifact, entry.source]) {
        const bytes = read(path.join('assets', file.path));
        assert.equal(bytes.length, file.byteLength, file.path);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
      }
    }
    // The page is as large as the atlas says, and every piece has its place on it.
    const png = read(`assets/files/${name}.png`),
      atlas = read(`assets/files/${name}.atlas`).toString(),
      [, width, height] = atlas.match(/size: (\d+),(\d+)/).map(Number);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [width, height], name);
    const regions = new Map([...atlas.matchAll(/^(\w+)\nbounds: (\d+),(\d+),(\d+),(\d+)$/gm)].map(match => [match[1], match.slice(2).map(Number)]));
    const skeleton = JSON.parse(read(`assets/files/${name}.json`));
    assert.deepEqual([...regions.keys()].sort(), PUPPETS[name].parts.map(([part]) => part).sort(), name);
    for (const [part, [x, y, w, h]] of regions) assert.ok(x >= 0 && y >= 0 && x + w <= width && y + h <= height, `${name}.${part} is off the page`);
    assert.deepEqual(Object.keys(skeleton.animations).sort(), Object.keys(PUPPETS[name].animations).sort(), name);
    assert.equal(skeleton.bones.length, PUPPETS[name].bones.length);
    // The same description gives the same skeleton again.
    const boxes = Object.fromEntries(Object.entries(skeleton.skins[0].attachments).map(([part, slot]) => [part, { x: 0, y: 0, width: slot[part].width, height: slot[part].height }]));
    assert.deepEqual(JSON.parse(JSON.stringify(skeletonOf(PUPPETS[name], boxes).animations)), skeleton.animations, `${name}: run tools/author.mjs again`);
  }
  for (const piece of SCENERY) assert.ok(fs.existsSync(path.join(ROOT, 'assets/scene', piece.file)), piece.file);
});

test('the page can find every module it asks for', () => {
  const html = read('index.html').toString(),
    map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for (const [name, target] of Object.entries(map)) assert.ok(fs.existsSync(path.join(ROOT, target)), `${name} → ${target}`);
  const asked = new Set();
  const scan = dir => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) scan(file);
      else if (file.endsWith('.mjs') || file.endsWith('.js')) for (const match of read(file).toString().matchAll(/^\s*(?:import|export)\b[^;'"`]*?\bfrom\s*['"]([^'"\n]+)['"]/gm)) match[1].startsWith('.') ? assert.ok(fs.existsSync(path.join(ROOT, dir, match[1])), `${file} → ${match[1]}`) : asked.add(match[1]);
    }
  };
  scan('src');
  scan('vendor');
  for (const name of asked) assert.ok(map[name], `nothing is mapped for ${name}`);
  for (const pick of html.matchAll(/(?:src|href)="((?!https?:|data:|\.\.\/)[^"#]+)"/g)) assert.ok(fs.existsSync(path.join(ROOT, pick[1])), pick[1]);
});

test("pictures are read by the game's own reader, which every browser allows", () => {
  // The engine's reader of PNG files is refused by the browsers on an iPhone, so nothing here may go through it.
  for (const file of ['src/main.mjs', 'src/puppets.mjs', 'src/pictures.mjs']) {
    const text = read(file).toString();
    assert.ok(!/\bloadTexture\(|@egret\/spine\/web|createManifestSpineContentLoader/.test(text), file);
  }
  assert.ok(!fs.existsSync(path.join(ROOT, 'vendor/engine/dist/web/BrowserTextureProvider.js')) || !read('src/main.mjs').toString().includes('game.loadTexture'));
});

test("the soldiers' blows are as long as the rules say, and strike when the rules say", () => {
  for (const [kind, puppet] of [['spearman', spearman], ['archer', archer]]) {
    const spec = FOES[kind];
    for (const needed of ['idle', 'windup', 'attack', 'hurt', 'down']) assert.ok(puppet.animations[needed], `${kind}.${needed}`);
    assert.equal(puppet.animations.attack.seconds, spec.attack, kind);
    const [at] = puppet.animations.attack.events.find(([, event]) => event === 'hit');
    assert.ok(Math.abs(at * spec.attack - spec.hitAt) < 0.02, `${kind} strikes at ${at * spec.attack}, the rules at ${spec.hitAt}`);
    // The warning is fully shown before the blow begins.
    assert.ok(puppet.animations.windup.seconds <= spec.windup, kind);
    // A blow begins in the pose its warning ends in.
    for (const [bone, tracks] of Object.entries(puppet.animations.attack.bones))
      for (const [track, keys] of Object.entries(tracks)) {
        const before = puppet.animations.windup.bones[bone]?.[track]?.at(-1);
        if (before) assert.deepEqual(keys[0].slice(1).filter(Number.isFinite), before.slice(1).filter(Number.isFinite), `${kind}.${bone}.${track}`);
      }
  }
  assert.ok(spearman.animations.walk);
});

test("Nezha's moves are as long as the rules say, and he has a pose for everything the rules have him do", () => {
  for (const move of ['thrust', 'sweep', 'ring', 'charge']) {
    assert.equal(nezha.animations[move + 'Windup'].seconds, BOSS[move].windup, `${move}: the warning`);
    if (BOSS[move].seconds) assert.equal(nezha.animations[move].seconds, BOSS[move].seconds, move);
  }
  for (const state of ['roar', 'stun', 'flee']) assert.equal(nezha.animations[state].seconds, BOSS[state], state);
  for (const needed of ['idle', 'move', 'calm', 'wrath', 'held', 'bare']) assert.ok(nezha.animations[needed], needed);
  // What is put away is put away from the first moment, and what is shown is whole.
  assert.ok(nezha.animations.calm.bones.aura.scale.every(([, size]) => size < 0.05));
  assert.ok(nezha.animations.bare.bones.ring.scale.every(([, size]) => size < 0.05));
});

test('the level on disk is the one its layout describes', () => {
  const written = JSON.parse(read('assets/levels/act1.tmj'));
  assert.deepEqual(written, JSON.parse(JSON.stringify(toTiled(act1.level, act1.title))), 'run tools/author.mjs again');
  const [set] = written.tilesets,
    png = read('assets/scene/tiles.png');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [set.imagewidth, set.imageheight]);
  assert.equal(set.imagewidth, set.tilewidth * set.columns);
});
