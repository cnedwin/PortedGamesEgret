import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { GENERALS } from '../src/data/generals.mjs';
import { portrait } from '../src/view/portrait.mjs';

test('every officer ID resolves to a distinct avatar and dossier illustration', async () => {
  for (const size of [40, 220]) {
    const artwork = new Set();
    for (const id of Object.keys(GENERALS)) {
      const url = new URL(portrait(id, size));
      assert.ok(url.pathname.endsWith('/' + id + '.webp'), id);
      const bytes = await readFile(url);
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', id);
      artwork.add(createHash('sha256').update(bytes).digest('hex'));
    }
    assert.equal(artwork.size, Object.keys(GENERALS).length);
  }
});
