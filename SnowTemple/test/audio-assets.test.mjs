import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const directory = new URL('../assets/audio/', import.meta.url);
const names = ['title', 'road', 'yard', 'boss1', 'boss2', 'end', 'wind', 'embers', 'temple', 'foley-intro', 'foley'];

test('the original score, ambience and effects are bounded PCM with valid loop joins and cue regions', async () => {
  const index = JSON.parse(await readFile(new URL('cues.json', directory), 'utf8'));
  const waves = new Map();
  let bytes = 0;
  for (const name of names) {
    const wav = await readFile(new URL(name + '.wav', directory));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF', name);
    assert.equal(wav.toString('ascii', 8, 16), 'WAVEfmt ', name);
    assert.equal(wav.readUInt16LE(20), 1, name);
    assert.equal(wav.readUInt16LE(22), 1, name);
    assert.equal(wav.readUInt32LE(24), index.sampleRate, name);
    assert.equal(wav.readUInt32LE(40), wav.length - 44, name);
    if (name !== 'end') assert.ok(Math.abs(wav.readInt16LE(44) - wav.readInt16LE(wav.length - 2)) < 120, name + ' loop join');
    let peak = 0;
    for (let i = 44; i < wav.length; i += 2) peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
    assert.ok(peak > 9000 && peak < 30500, name + ' audible peaks below clipping');
    waves.set(name, wav);
    bytes += wav.length;
  }
  assert.ok(bytes < 10_000_000, 'total audio budget');
  assert.ok(waves.get('foley-intro').length < 350_000, 'first-touch effects budget');
  assert.ok(Object.keys(index.cues).length >= 60, 'covers combat, movement, items and UI');
  for (const [bank, frame, length] of Object.values(index.cues)) {
    const wav = waves.get(bank);
    const first = 44 + frame * 2;
    const last = first + length * 2 - 2;
    assert.ok(frame >= 0 && length > 0 && last + 2 <= wav.length);
    assert.equal(wav.readInt16LE(first), 0, 'cue has a gentle inset');
    assert.equal(wav.readInt16LE(last), 0, 'cue fades out in its own region');
  }
});
