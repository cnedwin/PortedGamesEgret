// 案卷文字的两种标记：证物文字里的 [[词]] 或 [[词|显示的字]] 是可以收进词囊的词；卷宗里的 {{空}} 是要填的空。
// 这里把它们拆成纯文字和位置，画面据此排版、点词、画空位。
// The two marks in the case texts. In evidence, [[word]] or [[word|shown text]] is a word a player can collect; in the
// dossier, {{blank}} is a blank to fill. Both are taken apart here into plain text and positions, which the view uses
// to lay out the text, find the word under a finger, and draw the blanks.

const WORD = /\[\[([a-z0-9]+)(?:\|([^\]]+))?\]\]/g;
const BLANK = /\{\{([a-z0-9]+)\}\}/g;

/**
 * Evidence text in one language: the plain text and, for each collectible word, where it sits in that text (UTF-16
 * offsets, end exclusive).
 */
export function parseEvidence(text, words, lang) {
  let plain = '',
    last = 0;
  const runs = [];
  for (const m of text.matchAll(WORD)) {
    plain += text.slice(last, m.index);
    const word = words[m[1]];
    const shown = m[2] ?? (word ? word[lang] : m[1]);
    runs.push({ start: plain.length, end: plain.length + shown.length, word: m[1] });
    plain += shown;
    last = m.index + m[0].length;
  }
  plain += text.slice(last);
  return { plain, runs };
}

/** The word ids an evidence text offers, in order. */
export function wordsIn(text) {
  return [...text.matchAll(WORD)].map((m) => m[1]);
}

/** The blank ids a dossier text holds, in order. */
export function blanksIn(text) {
  return [...text.matchAll(BLANK)].map((m) => m[1]);
}

/**
 * A dossier text with its blanks filled as far as they are: the plain text and where each blank sits in it. An empty
 * blank is drawn as `gap` (spaces wide enough to drop a word on).
 */
export function fillDossier(text, filled, words, lang, gap) {
  let plain = '',
    last = 0;
  const blanks = [];
  for (const m of text.matchAll(BLANK)) {
    plain += text.slice(last, m.index);
    const word = filled[m[1]];
    const shown = word && words[word] ? words[word][lang] : gap;
    blanks.push({ id: m[1], start: plain.length, end: plain.length + shown.length, word: word ?? null });
    plain += shown;
    last = m.index + m[0].length;
  }
  plain += text.slice(last);
  return { plain, blanks };
}

/** Plain text with every mark replaced by what it shows: for measuring and for the characters a font must hold. */
export function plainOf(text, words, lang) {
  return parseEvidence(text, words, lang).plain.replace(BLANK, '');
}
