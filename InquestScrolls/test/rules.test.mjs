// 规则：收词、放词、核验（全对盖印，两处以内说"接近"）、提示三级不给答案、判词、解锁。
// The rules: collecting, placing, checking (all right seals, two or fewer wrong is "near"), three hint levels that
// never give the answer, the verdict, and unlocking.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASES, caseById } from '../src/sim/cases/index.mjs';
import { blanksOf } from '../src/sim/audit.mjs';
import {
  caseState, checkPage, collect, currentCase, freshProgress, judgeVerdict, nextHint, pageFull, pagesDone, placeWord,
  seeSpot, submitVerdict, summary, unlocked, wordsOfSpot
} from '../src/sim/rules.mjs';

/** Look at every spot and collect every word, as a thorough player would. */
function gatherAll(st, c) {
  for (const id of Object.keys(c.spots)) {
    seeSpot(st, c, id);
    for (const w of wordsOfSpot(c, id)) collect(st, c, w);
  }
}
/** Fill every blank of a case with its answer and check each page. */
function solve(st, c) {
  for (const b of blanksOf(c)) assert.ok(placeWord(st, c, b.page, b.id, b.answer) || st.place[b.page]?.[b.id] === b.answer);
  return c.pages.map((p) => checkPage(st, c, p.id).result);
}

test('a word is collected only from evidence that has been seen', () => {
  const p = freshProgress(), c = CASES[0], st = caseState(p, c.id);
  assert.equal(collect(st, c, 'sash'), false);
  seeSpot(st, c, 'vat');
  assert.equal(collect(st, c, 'sash'), true);
  assert.equal(collect(st, c, 'sash'), false);
  assert.equal(collect(st, c, 'nonsense'), false);
});

test('a blank takes only a collected word of its own kind', () => {
  const p = freshProgress(), c = CASES[0], st = caseState(p, c.id);
  gatherAll(st, c);
  assert.equal(placeWord(st, c, 'p1', 'b2', 'sunda'), false, 'a person in a thing blank');
  assert.equal(placeWord(st, c, 'p1', 'b2', 'rope'), true);
  assert.equal(placeWord(st, c, 'p1', 'b2', 'rope'), false, 'no change');
  assert.equal(placeWord(st, c, 'p1', 'b9', 'rope'), false, 'no such blank');
  assert.equal(placeWord(st, c, 'p1', 'b2', null), true);
  assert.equal(placeWord(st, c, 'p1', 'b2', null), false);
});

test('a page is checked only when full; all right seals it, two or fewer wrong is near, more is wrong', () => {
  const p = freshProgress(), c = caseById('c3'), st = caseState(p, c.id);
  gatherAll(st, c);
  assert.equal(checkPage(st, c, 'p2').result, 'incomplete');
  const blanks = blanksOf(c).filter((b) => b.page === 'p2');
  for (const b of blanks) placeWord(st, c, 'p2', b.id, b.answer);
  placeWord(st, c, 'p2', 'b6', 'afu');
  assert.deepEqual(checkPage(st, c, 'p2'), { result: 'near', wrong: 1 });
  placeWord(st, c, 'p2', 'b7', 'lu');
  placeWord(st, c, 'p2', 'b9', 'zhengqi');
  assert.deepEqual(checkPage(st, c, 'p2'), { result: 'wrong', wrong: 3 });
  for (const b of blanks) placeWord(st, c, 'p2', b.id, b.answer);
  assert.equal(checkPage(st, c, 'p2').result, 'sealed');
  assert.equal(placeWord(st, c, 'p2', 'b6', 'afu'), false, 'a sealed page does not change');
  assert.equal(st.tries.p2, 3);
});

test('every case can be solved from what its scene offers', () => {
  const p = freshProgress();
  for (const c of CASES) {
    const st = caseState(p, c.id);
    gatherAll(st, c);
    assert.equal(st.found.length, Object.keys(c.words).length, `${c.id}: every word is collectible`);
    assert.ok(solve(st, c).every((r) => r === 'sealed'), c.id);
    assert.ok(pagesDone(st, c));
    if (c.verdict) assert.equal(st.solved, false, 'the last case waits for its verdict');
    else assert.equal(st.solved, true, c.id);
  }
});

test('cases open one after another, and the one to resume is the first not closed', () => {
  const p = freshProgress();
  assert.equal(unlocked(p, 'c1'), true);
  assert.equal(unlocked(p, 'c2'), false);
  assert.equal(currentCase(p), 'c1');
  const st = caseState(p, 'c1');
  gatherAll(st, CASES[0]);
  solve(st, CASES[0]);
  assert.equal(unlocked(p, 'c2'), true);
  assert.equal(currentCase(p), 'c2');
  assert.deepEqual(summary(p, 'c1'), { unlocked: true, solved: true, sealed: 2, pages: 2, found: Object.keys(CASES[0].words).length, words: Object.keys(CASES[0].words).length, hints: 0 });
});

test('hints go area, evidence, question, and never name the answer', () => {
  const p = freshProgress(), c = caseById('c2'), st = caseState(p, c.id);
  const first = nextHint(st, c);
  assert.deepEqual([first.page, first.blank, first.level], ['names', 'hesao', 1]);
  assert.ok(first.spots.length > 0);
  assert.equal(nextHint(st, c).level, 2);
  const third = nextHint(st, c);
  assert.equal(third.level, 3);
  assert.equal(nextHint(st, c).level, 3, 'three is the deepest');
  for (const lang of ['zh', 'en']) assert.ok(!third.why[lang].includes(c.words.hesao[lang]), 'the question does not say the answer');
  for (const page of c.pages)
    for (const b of blanksOf(c).filter((x) => x.page === page.id))
      for (const lang of ['zh', 'en']) assert.ok(!b.why[lang].includes(c.words[b.answer][lang]), `${c.id} ${b.id} ${lang}`);
  gatherAll(st, c);
  placeWord(st, c, 'names', 'hesao', 'hesao');
  assert.equal(nextHint(st, c).blank, 'qianwu', 'aims at the next empty blank');
  assert.equal(nextHint(st, c, 'p2').page, 'p2', 'or at the page being read');
  assert.equal(st.hints, 6);
});

test('no hint question in any case gives its answer away', () => {
  for (const c of CASES)
    for (const b of blanksOf(c))
      for (const lang of ['zh', 'en']) assert.ok(!b.why[lang].includes(c.words[b.answer][lang]), `${c.id} ${b.page}/${b.id} ${lang}`);
});

test('the verdict holds with the right names and two of three charges, in either language', () => {
  const c = caseById('c6');
  assert.equal(judgeVerdict(c, { chief: '陆承恩', partner: '冯禄', crimes: '伪造会子，杀人灭口' }).ok, true);
  assert.equal(judgeVerdict(c, { chief: 'Lu Cheng’en', partner: 'Feng Lu', crimes: 'Counterfeiting notes; false inquest forms.' }).ok, true);
  assert.equal(judgeVerdict(c, { chief: ' lu chengen ', partner: '冯押司', crimes: 'murder and forged notes' }).ok, true);
  assert.equal(judgeVerdict(c, { chief: '韦衡', partner: '冯禄', crimes: '伪造会子，杀人' }).ok, false, 'wrong chief');
  assert.equal(judgeVerdict(c, { chief: '陆承恩冯禄韦衡', partner: '冯禄', crimes: '伪造会子，杀人' }).ok, false, 'every name at once is no answer');
  assert.equal(judgeVerdict(c, { chief: 'Lu Cheng\'en', partner: 'Feng Lu and Wei Heng', crimes: 'murder, forged notes' }).ok, false, 'a second name in English too');
  assert.equal(judgeVerdict(c, { chief: '陆承恩', partner: '冯禄', crimes: '杀人' }).ok, false, 'one charge');
  assert.equal(judgeVerdict(c, { chief: '', partner: '', crimes: '' }).ok, false);
  const p = freshProgress(), st = caseState(p, 'c6');
  assert.equal(submitVerdict(st, c, { chief: '陆承恩', partner: '冯禄', crimes: '伪造会子 杀人' }).ok, false, 'not before every page is sealed');
  gatherAll(st, c);
  solve(st, c);
  assert.equal(submitVerdict(st, c, { chief: '陆承恩', partner: '冯禄', crimes: '伪造会子 杀人' }).ok, true);
  assert.equal(st.solved, true);
});

test('the verdict board holds every character the Chinese answers need', () => {
  const c = caseById('c6');
  const board = c.verdict.board.zh;
  for (const text of ['陆承恩', '冯禄', '伪造会子', '杀人灭口', '格目不实']) for (const ch of text) assert.ok(board.includes(ch), ch);
});

test('a page counts as full only when every blank holds a word', () => {
  const p = freshProgress(), c = CASES[0], st = caseState(p, c.id);
  gatherAll(st, c);
  assert.equal(pageFull(st, c, 'names'), false);
  for (const b of blanksOf(c).filter((x) => x.page === 'names')) placeWord(st, c, 'names', b.id, b.answer);
  assert.equal(pageFull(st, c, 'names'), true);
});
