// 案卷自查：六案每个空都推得出、只有一个答案，中英两份完整；再故意弄坏几处，确认自查能发现。
// The cases check themselves: every blank in all six can be worked out and has one answer, both languages are whole;
// then a few things are broken on purpose to show the check notices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditCase, blanksOf } from '../src/sim/audit.mjs';
import { CASES, SCROLLS } from '../src/sim/cases/index.mjs';
import { parseEvidence, fillDossier } from '../src/sim/text.mjs';

test('every case passes its own audit', () => {
  for (const c of CASES) assert.deepEqual(auditCase(c), [], c.id);
});

test('six cases in three scrolls of two', () => {
  assert.equal(CASES.length, 6);
  assert.deepEqual(SCROLLS.flatMap((s) => s.cases), CASES.map((c) => c.id));
  for (const s of SCROLLS) assert.equal(s.cases.length, 2);
});

test('the audit notices an unprovable rival, a missing blank, a word fitting two blanks and a word missing in one language', () => {
  const broken = [
    [0, (c) => delete c.words.xiaoqi.is.scratched, /cannot be ruled out/],
    [1, (c) => (c.pages[1].text.en = c.pages[1].text.en.replace('{{b3}}', '')), /appears 0 times in en/],
    [4, (c) => (c.words.purse.is.found = ['basket', 'purse']), /fits both/],
    [5, (c) => (c.spots.fenglu.text.en = c.spots.fenglu.text.en.replace('[[inkfingers]]', 'ink')), /cannot be collected in en/],
    [2, (c) => (c.words.ewer.is.vessel = ['pot']), /needs a value and evidence/],
    [3, (c) => (c.words.knife.is.weapon = ['yes', 'nowhere']), /not a spot/]
  ];
  for (const [i, breakIt, expected] of broken) {
    const c = structuredClone(CASES[i]);
    breakIt(c);
    assert.match(auditCase(c).join('\n'), expected);
  }
});

test('every case asks enough: a name page and at least four blanks, the later cases more', () => {
  const counts = CASES.map((c) => blanksOf(c).filter((b) => b.page !== 'names').length);
  for (const c of CASES) assert.ok(c.pages[0].names, `${c.id} opens with its people`);
  assert.ok(counts.every((n) => n >= 4), counts.join());
  assert.ok(counts.slice(1).every((n) => n >= 9), counts.join());
});

test('evidence words and dossier blanks come apart into text and positions', () => {
  const c = CASES[0];
  const ev = parseEvidence(c.spots.rope.text.zh, c.words, 'zh');
  assert.equal(ev.plain.slice(ev.runs[0].start, ev.runs[0].end), '麻绳');
  const doc = fillDossier(c.pages[1].text.zh, { b2: 'sash' }, c.words, 'zh', '　　　');
  assert.equal(doc.blanks.length, 4);
  assert.equal(doc.plain.slice(doc.blanks[1].start, doc.blanks[1].end), '青布腰带');
  assert.equal(doc.plain.slice(doc.blanks[0].start, doc.blanks[0].end), '　　　');
});
