// 规则：看过哪些证物、收了哪些词、每个空放了什么、哪一页盖了印、提示到了第几级、判词对不对。
// 全部是普通数据，能存档、能在 Node 里跑，不碰页面也不碰引擎。
// The rules: which evidence has been seen, which words collected, what sits in each blank, which pages are sealed,
// how far the hints have gone, and whether the verdict holds. All of it is plain data that saves and runs in Node,
// touching neither the page nor the engine.
import { blanksOf, evidenceFor } from './audit.mjs';
import { CASES, caseById } from './cases/index.mjs';
import { wordsIn } from './text.mjs';

/** A page is checked when every blank is filled; this many wrong or fewer earns the "close" answer. */
export const NEAR = 2;
export const HINT_LEVELS = 3;

export function freshProgress() {
  return { prologue: false, cases: {} };
}

export function freshCase() {
  return { opened: false, seen: [], found: [], place: {}, sealed: [], tries: {}, hints: 0, hint: null, notes: '', solved: false, verdict: null };
}

/** The state of one case, made on first use. */
export function caseState(progress, id) {
  return (progress.cases[id] ??= freshCase());
}

/** A case is open to play once the case before it is solved. */
export function unlocked(progress, id) {
  const i = CASES.findIndex((c) => c.id === id);
  return i === 0 || (i > 0 && !!progress.cases[CASES[i - 1].id]?.solved);
}

/** The case to resume: the first one not solved, or the last. */
export function currentCase(progress) {
  return (CASES.find((c) => !progress.cases[c.id]?.solved) ?? CASES.at(-1)).id;
}

/** Look at a spot. Returns true the first time. */
export function seeSpot(st, c, spotId) {
  if (!c.spots[spotId] || st.seen.includes(spotId)) return false;
  st.seen.push(spotId);
  return true;
}

/** Words a spot offers, in either language (both mark the same words). */
export function wordsOfSpot(c, spotId) {
  return [...new Set(wordsIn(c.spots[spotId]?.text?.zh ?? ''))];
}

/** Collect a word shown in a spot that has been seen. Returns true when it is new. */
export function collect(st, c, wordId) {
  if (!c.words[wordId] || st.found.includes(wordId)) return false;
  if (!st.seen.some((s) => wordsOfSpot(c, s).includes(wordId))) return false;
  st.found.push(wordId);
  return true;
}

const pageOf = (c, pageId) => c.pages.find((p) => p.id === pageId);

/** The blanks of a page, in order, with the kind each wants. */
export function blanksOfPage(c, pageId) {
  return blanksOf(c)
    .filter((b) => b.page === pageId)
    .map((b) => ({ ...b, kind: c.words[b.answer].kind }));
}

/**
 * Put a word in a blank, or `null` to empty it. Only a collected word of the blank's kind goes in, and nothing
 * changes on a sealed page. Returns true when the blank changed.
 */
export function placeWord(st, c, pageId, blankId, wordId) {
  if (st.sealed.includes(pageId)) return false;
  const blank = blanksOfPage(c, pageId).find((b) => b.id === blankId);
  if (!blank) return false;
  const filled = (st.place[pageId] ??= {});
  if (wordId === null) {
    if (!(blankId in filled)) return false;
    delete filled[blankId];
    return true;
  }
  if (!st.found.includes(wordId) || c.words[wordId]?.kind !== blank.kind) return false;
  if (filled[blankId] === wordId) return false;
  filled[blankId] = wordId;
  return true;
}

export function pageFull(st, c, pageId) {
  const filled = st.place[pageId] ?? {};
  return blanksOfPage(c, pageId).every((b) => filled[b.id]);
}

/**
 * Check a full page. Every blank right seals it; two or fewer wrong is "near"; more is "wrong". How many are wrong is
 * returned for the rules and tests, never shown as a number beyond "two or fewer".
 */
export function checkPage(st, c, pageId) {
  if (!pageOf(c, pageId)) return { result: 'none', wrong: 0 };
  if (st.sealed.includes(pageId)) return { result: 'sealed', wrong: 0 };
  if (!pageFull(st, c, pageId)) return { result: 'incomplete', wrong: 0 };
  const filled = st.place[pageId];
  const wrong = blanksOfPage(c, pageId).filter((b) => filled[b.id] !== b.answer).length;
  st.tries[pageId] = (st.tries[pageId] ?? 0) + 1;
  if (wrong === 0) {
    st.sealed.push(pageId);
    if (st.hint?.page === pageId) st.hint = null;
    if (!c.verdict && c.pages.every((p) => st.sealed.includes(p.id))) st.solved = true;
    return { result: 'sealed', wrong };
  }
  return { result: wrong <= NEAR ? 'near' : 'wrong', wrong };
}

/** Every page sealed: the case is closed, or (for the last case) the verdict can be written. */
export const pagesDone = (st, c) => c.pages.every((p) => st.sealed.includes(p.id));

/**
 * The next hint. It aims at the first blank of the first unsealed page that is still empty (or, when all are full,
 * the first blank there), and each further ask about the same blank goes one level deeper: 1 points at the area to
 * look, 2 names the evidence, 3 asks the question that leads to the answer. The answer itself is never given.
 */
export function nextHint(st, c, focusPage) {
  const page = (focusPage && !st.sealed.includes(focusPage) ? pageOf(c, focusPage) : null) ?? c.pages.find((p) => !st.sealed.includes(p.id));
  if (!page) return null;
  const blanks = blanksOfPage(c, page.id);
  const filled = st.place[page.id] ?? {};
  const blank = blanks.find((b) => !filled[b.id]) ?? blanks[0];
  const same = st.hint?.page === page.id && st.hint?.blank === blank.id;
  const level = same ? Math.min(HINT_LEVELS, st.hint.level + 1) : 1;
  st.hint = { page: page.id, blank: blank.id, level };
  st.hints++;
  return { page: page.id, blank: blank.id, level, spots: evidenceFor(c, blank), why: blank.why };
}

const squash = (s) => String(s ?? '').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');

/** Every person's name in the book, in both languages, squashed: no name field may hold someone else's as well. */
const NAMES = [...new Set(CASES.flatMap((c) => Object.values(c.words).filter((w) => w.kind === 'person').flatMap((w) => [squash(w.zh), squash(w.en)])))];

/**
 * Judge a written verdict. A named field holds if one of its accepted spellings appears in what was written and no
 * other person's name does (writing every name is not an answer); the crimes hold if enough of the groups each have
 * one of their words. Only "holds" or "does not" goes back to the player.
 */
export function judgeVerdict(c, answers) {
  const v = c.verdict;
  const fields = {};
  for (const f of v.fields) {
    const said = squash(answers?.[f.id]);
    if (f.groups) fields[f.id] = f.groups.filter((g) => g.some((w) => said.includes(squash(w)))).length >= f.need;
    else {
      const accepted = f.accept.map(squash);
      const others = NAMES.filter((n) => !accepted.some((a) => a.includes(n) || n.includes(a)));
      fields[f.id] = said.length > 0 && accepted.some((a) => said.includes(a)) && !others.some((n) => said.includes(n));
    }
  }
  return { ok: Object.values(fields).every(Boolean), fields };
}

/** Submit the verdict. The case closes when it holds. */
export function submitVerdict(st, c, answers) {
  if (!c.verdict || !pagesDone(st, c)) return { ok: false, fields: {} };
  const judged = judgeVerdict(c, answers);
  st.verdict = { answers: { ...answers }, ok: judged.ok };
  if (judged.ok) st.solved = true;
  return judged;
}

/** How far a case has gone, for its card on the case list. */
export function summary(progress, id) {
  const c = caseById(id),
    st = progress.cases[id];
  return {
    unlocked: unlocked(progress, id),
    solved: !!st?.solved,
    sealed: st?.sealed.length ?? 0,
    pages: c.pages.length,
    found: st?.found.length ?? 0,
    words: Object.keys(c.words).length,
    hints: st?.hints ?? 0
  };
}
