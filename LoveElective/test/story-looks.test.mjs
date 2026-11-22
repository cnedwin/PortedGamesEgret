import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { storyLook } from '../src/art/story-looks.mjs';
import { portraitDyes } from '../src/art/portrait-dyes.mjs';
import { HEROINES } from '../src/data/cast.mjs';

const assets = new URL('../assets/characters/', import.meta.url);

async function assertWebp(relativePath) {
  const bytes = await readFile(new URL(relativePath, assets));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
}

test('all seven seniors select independent illustrated casual and date costumes', async () => {
  for (const [id, girl] of Object.entries(HEROINES)) {
    for (const [outfit, wear] of Object.entries(girl.outfits)) {
      const name = outfit === 'uniform' ? id : `${id}-${outfit}`;
      assert.equal(storyLook({ id, wear }).name, name);
      await assertWebp(outfit === 'uniform' ? `${name}.webp` : `looks/${name}.webp`);
    }
  }
  await assertWebp('professor.webp');
});

test('activity costumes resolve by the saved clothes, retaining dyed fabric channels', async () => {
  const looks = [
    ['linxia', 'pool', 'dress', 'swim-onepiece', 2],
    ['tangmi', 'pajama', 'top', 'pajama-top', 2],
    ['bailu', 'lounge', 'outer', 'lounge-robe', 2],
    ['bailu', 'stargazing', 'outer', 'cardigan', 1],
  ];
  const colors = ['#d55372', 'hsl(204, 71%, 67%)'];
  for (const [id, activity, slot, garment, channels] of looks) {
    const wear = { ...HEROINES[id].outfits.uniform, [slot]: { id: garment, c: colors } };
    const name = `${id}-${activity}`;
    assert.deepEqual(storyLook({ id, wear }), { name, colors });
    assert.deepEqual(portraitDyes(name, colors), colors.slice(0, channels));
    await assertWebp(`looks/${name}.webp`);
    await assertWebp(`looks/${name}-dye.webp`);
  }
  assert.equal(storyLook({ id: 'tangmi', wear: { top: { id: 'turtleneck' } } }).name, 'tangmi');
});
