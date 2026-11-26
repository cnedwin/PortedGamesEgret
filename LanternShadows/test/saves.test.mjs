import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACT_GOALS, createRecordBook } from '../src/records.mjs';

function storageWith(initial = {}) {
  const items = new Map(Object.entries(initial));
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value) };
}

test('each act keeps its independently best records and its earned badges', () => {
  assert.deepEqual(ACT_GOALS, { act1: { time: 150, combo: 18 }, act2: { time: 165, combo: 20 }, act3: { time: 180, combo: 22 } });
  const storage = storageWith();
  const book = createRecordBook(storage);
  assert.equal(book.get('act1'), undefined);
  assert.deepEqual(book.record('act1', { rank: 'A', time: 164, best: 18, falls: 1 }).goals, [false, true, false]);
  assert.deepEqual(book.record('act1', { rank: 'B', time: 150, best: 9, falls: 1 }).goals, [true, true, false]);
  const combined = book.record('act1', { rank: 'C', time: 172, best: 7, falls: 0 });
  assert.deepEqual(combined, { rank: 'A', time: 150, combo: 18, noFalls: true, goals: [true, true, true] });
  const next = createRecordBook(storage);
  assert.deepEqual(next.get('act1'), combined);
  assert.equal(next.get('act2'), undefined);
  combined.goals[0] = false;
  assert.deepEqual(book.get('act1').goals, [true, true, true]);
});

test('legacy rank seals survive damaged records without inventing run statistics', () => {
  const storage = storageWith({
    'lantern-shadows-ranks': JSON.stringify({ act1: 'S', act2: 'A', act3: '?' }),
    'lantern-shadows-records': '{',
  });
  const book = createRecordBook(storage);
  assert.deepEqual(book.get('act1'), { rank: 'S', time: undefined, combo: undefined, noFalls: false, goals: [false, false, false] });
  assert.equal(book.get('act3'), undefined);
  book.record('act1', { rank: 'B', time: 176.5, best: 14, falls: 2 });
  const next = createRecordBook(storage);
  assert.deepEqual(next.get('act1'), { rank: 'S', time: 176.5, combo: 14, noFalls: false, goals: [false, false, false] });
  assert.equal(next.get('act2').rank, 'A');
});

test('the book still tracks runs when browser storage is unavailable', () => {
  const refuse = () => { throw new Error('Storage denied'); };
  const book = createRecordBook({ getItem: refuse, setItem: refuse });
  assert.equal(book.record('unknown', { rank: 'S', time: 17, best: 99, falls: 0 }), undefined);
  assert.equal(book.record('act2', { rank: 'garbage', time: 17, best: 99, falls: 0 }), undefined);
  assert.deepEqual(book.record('act2', { rank: 'S', time: 165, best: 20, falls: 0 }), {
    rank: 'S', time: 165, combo: 20, noFalls: true, goals: [true, true, true],
  });
});
