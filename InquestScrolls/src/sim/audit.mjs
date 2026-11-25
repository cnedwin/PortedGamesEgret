// 案卷的自查：推理游戏的命门是每个空都推得出、而且只有一个答案。每个词带着它的事实（"是什么"，以及哪件证物说明了它），
// 每个空写明它要求的事实。这里逐案检查：
//   1. 每个空的答案满足它的全部要求，而且每条要求都有现场里的证物为据；
//   2. 同类的其他词，每一个都至少有一条要求与之相反，而且这条相反的事实也有证物为据——玩家能凭证据排除它；
//   3. 同一案里，没有一个词能同时满足两个答案不同的空；
//   4. 中英两份文字各自完整：每个空在两种文字里各出现一次，每个词在两种文字里都能收到，同类词的名字不重复。
// A case checks itself. What makes or breaks a deduction game is that every blank can be worked out and has one answer
// only. Each word carries its facts (what it is, and which piece of evidence shows it); each blank names the facts it
// wants. For every case this checks that
//   1. each blank's answer meets every requirement, each backed by evidence in the scene;
//   2. every other word of the same kind fails at least one requirement, and that failing fact is backed by evidence
//      too, so a player can rule it out from what is there;
//   3. no word in the case meets two blanks whose answers differ;
//   4. both languages are whole: each blank appears once in each, each word can be collected in each, and no two
//      words of one kind share a name.
import { KINDS } from './kinds.mjs';
import { blanksIn, wordsIn } from './text.mjs';

const LANGS = ['zh', 'en'];

/** Every blank of a case as one list: the dossier blanks and the name plates, with the page they belong to. */
export function blanksOf(c) {
  const all = [];
  for (const page of c.pages)
    if (page.names) for (const p of page.portraits) all.push({ page: page.id, id: p.id, ...p });
    else for (const [id, b] of Object.entries(page.blanks)) all.push({ page: page.id, id, ...b });
  return all;
}

const meets = (word, needs) => Object.entries(needs).every(([attr, value]) => word.is?.[attr]?.[0] === value);

/** The evidence spots that show a word meets a blank, or (for another word) the spots that rule it out. */
export function evidenceFor(c, blank) {
  const answer = c.words[blank.answer];
  const spots = new Set();
  for (const attr of Object.keys(blank.needs)) for (const s of answer?.is?.[attr]?.slice(1) ?? []) spots.add(s);
  return [...spots];
}

export function auditCase(c) {
  const problems = [];
  const say = (where, what) => problems.push(`${c.id} ${where}: ${what}`);
  const spotIds = new Set(Object.keys(c.spots));
  const backed = (from, where) => {
    if (!from.length) say(where, 'a fact with no evidence');
    for (const s of from) if (!spotIds.has(s)) say(where, `evidence "${s}" is not a spot`);
    return from.length > 0 && from.every((s) => spotIds.has(s));
  };

  // Words: known kinds, facts shaped right, names unique within a kind, collectible in both languages.
  const collectible = { zh: new Set(), en: new Set() };
  for (const [sid, spot] of Object.entries(c.spots))
    for (const lang of LANGS) {
      if (!spot.text?.[lang]) say(sid, `no ${lang} text`);
      if (!spot.title?.[lang]) say(sid, `no ${lang} title`);
      for (const w of wordsIn(spot.text?.[lang] ?? '')) {
        if (!c.words[w]) say(sid, `marks unknown word "${w}" (${lang})`);
        collectible[lang].add(w);
      }
    }
  const names = {};
  for (const [wid, word] of Object.entries(c.words)) {
    if (!KINDS[word.kind]) say(wid, `unknown kind "${word.kind}"`);
    for (const lang of LANGS) {
      if (!word[lang]) say(wid, `no ${lang} name`);
      if (!collectible[lang].has(wid)) say(wid, `cannot be collected in ${lang}`);
      const key = `${word.kind}/${lang}/${word[lang]}`;
      if (names[key]) say(wid, `shares its ${lang} name with "${names[key]}"`);
      names[key] = wid;
    }
    for (const [attr, fact] of Object.entries(word.is ?? {})) {
      if (!Array.isArray(fact) || fact.length < 2) say(wid, `fact "${attr}" needs a value and evidence`);
      else backed(fact.slice(1), `${wid}.${attr}`);
    }
  }

  // Pages: each blank once in each language, no stray blanks; name plates point at people in the scene.
  for (const page of c.pages) {
    for (const lang of LANGS) if (!page.title?.[lang]) say(page.id, `no ${lang} title`);
    if (page.names) {
      for (const p of page.portraits) if (c.spots[p.id]?.kind !== 'person') say(`${page.id}/${p.id}`, 'a name plate whose person is not in the scene');
      continue;
    }
    const ids = Object.keys(page.blanks);
    for (const lang of LANGS) {
      const found = blanksIn(page.text?.[lang] ?? '');
      for (const id of ids) {
        const n = found.filter((f) => f === id).length;
        if (n !== 1) say(`${page.id}/${id}`, `appears ${n} times in ${lang}`);
      }
      for (const f of found) if (!ids.includes(f)) say(`${page.id}/${f}`, `in the ${lang} text but not a blank`);
    }
  }

  // Blanks: answer meets and is backed; every rival of its kind is ruled out by evidence.
  const blanks = blanksOf(c);
  for (const b of blanks) {
    const where = `${b.page}/${b.id}`;
    const answer = c.words[b.answer];
    if (!answer) {
      say(where, `answer "${b.answer}" is not a word`);
      continue;
    }
    for (const lang of LANGS) if (!b.why?.[lang]) say(where, `no ${lang} reasoning for the hint`);
    for (const [attr, value] of Object.entries(b.needs ?? {})) {
      const fact = answer.is?.[attr];
      if (!fact || fact[0] !== value) say(where, `answer "${b.answer}" does not have ${attr}=${value}`);
      else backed(fact.slice(1), `${where} ${attr}`);
    }
    if (!Object.keys(b.needs ?? {}).length) say(where, 'asks for nothing');
    for (const [wid, word] of Object.entries(c.words)) {
      if (wid === b.answer || word.kind !== answer.kind) continue;
      const ruledOut = Object.entries(b.needs ?? {}).some(([attr, value]) => {
        const fact = word.is?.[attr];
        return fact && fact[0] !== value && fact.length > 1 && fact.slice(1).every((s) => spotIds.has(s));
      });
      if (!ruledOut) say(where, `"${wid}" cannot be ruled out from the evidence`);
    }
  }

  // No word fits two blanks of its kind whose answers differ.
  for (let i = 0; i < blanks.length; i++)
    for (let j = i + 1; j < blanks.length; j++) {
      const a = blanks[i],
        b = blanks[j];
      if (a.answer === b.answer) continue;
      const kind = c.words[a.answer]?.kind;
      if (kind !== c.words[b.answer]?.kind) continue;
      for (const [wid, word] of Object.entries(c.words))
        if (word.kind === kind && meets(word, a.needs) && meets(word, b.needs))
          say(`${a.page}/${a.id}+${b.page}/${b.id}`, `"${wid}" fits both`);
    }
  return problems;
}
