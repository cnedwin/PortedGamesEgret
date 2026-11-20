// The capability matrix page: the same table as CAPABILITIES.md, read from showcase/capabilities.js, which
// tools/capability-matrix.mjs writes. Rows are engine entries and key APIs, columns the games; a mark links the file.
import { MATRIX } from './capabilities.js';
import { GAMES } from './games.js';

const REPO = 'https://github.com/cnedwin/PortedGamesEgret/blob/main/';
const $ = (selector) => document.querySelector(selector);
const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const WORDS = {
  zh: {
    brand: '新白鹭引擎游戏 Demo',
    engine: '引擎源码',
    langButton: 'EN',
    langLabel: 'Switch to English',
    title: '引擎能力矩阵',
    lead: '新白鹭引擎的每个入口和关键 API，在哪个游戏里用到、用在哪个文件。点格子里的标记打开那个文件。只统计游戏自己的代码，不含引擎副本、测试和工具。',
    entries: '入口',
    apis: '关键 API',
    gaps: '缺口',
    gapsLead: '少于两款游戏用到的能力：只有一个例子，或者还没有例子。',
    capability: '能力',
    count: '游戏数',
    none: '还没有游戏用到',
    used: (game, file) => `${game} 在 ${file} 里用到`,
    foot: '由 tools/capability-matrix.mjs 从游戏源码生成。',
    pageTitle: '引擎能力矩阵 · 新白鹭引擎游戏 Demo',
  },
  en: {
    brand: 'Egret Rebuild Game Demos',
    engine: 'Engine source',
    langButton: '中文',
    langLabel: '切换到中文',
    title: 'Engine capability matrix',
    lead: 'Every entry and key API of the new Egret engine, which game uses it and in which file. A mark opens that file. Only each game’s own code is counted, not its engine copy, tests or tools.',
    entries: 'Entries',
    apis: 'Key APIs',
    gaps: 'Gaps',
    gapsLead: 'Capabilities fewer than two games use: one example at most.',
    capability: 'Capability',
    count: 'Games',
    none: 'No game uses it yet',
    used: (game, file) => `${game} uses it in ${file}`,
    foot: 'Made from the games’ source by tools/capability-matrix.mjs.',
    pageTitle: 'Engine capability matrix · Egret Rebuild Game Demos',
  },
};

function storedLanguage() {
  try {
    const saved = localStorage.getItem('egret-demos-lang');
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    /* storage can be unavailable */
  }
  return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}
let lang = new URLSearchParams(location.search).get('lang') ?? storedLanguage();
if (lang !== 'zh' && lang !== 'en') lang = 'zh';

const nameOf = (folder) => {
  const game = GAMES.find((g) => g.folder === folder);
  return game ? game[lang] : folder;
};

function table(rows) {
  const t = WORDS[lang];
  const head = MATRIX.games.map((folder) => `<th scope="col"><span>${escape(nameOf(folder))}</span></th>`).join('');
  const body = rows
    .map((row) => {
      const cells = MATRIX.games
        .map((folder) => {
          const hit = row.games.find((g) => g.game === folder);
          return hit
            ? `<td><a class="mark" href="${REPO}${escape(hit.file)}" title="${escape(t.used(nameOf(folder), hit.file))}" aria-label="${escape(t.used(nameOf(folder), hit.file))}"></a></td>`
            : '<td></td>';
        })
        .join('');
      const thin = row.kind !== 'other' && row.games.length < 2 ? ' class="thin"' : '';
      return `<tr${thin}><th scope="row">${escape(row.label)}</th><td class="count">${row.games.length}</td>${cells}</tr>`;
    })
    .join('');
  return `<table><thead><tr><th scope="col">${t.capability}</th><th scope="col" class="count">${t.count}</th>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function render() {
  const t = WORDS[lang];
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = t.pageTitle;
  for (const node of document.querySelectorAll('[data-t]')) {
    const value = t[node.dataset.t];
    if (typeof value === 'string') node.textContent = value;
  }
  const button = $('.lang');
  button.textContent = t.langButton;
  button.setAttribute('aria-label', t.langLabel);
  $('[data-table="entries"]').innerHTML = table(MATRIX.rows.filter((row) => row.kind !== 'api'));
  $('[data-table="apis"]').innerHTML = table(MATRIX.rows.filter((row) => row.kind === 'api'));
  $('.matrix-gaps').innerHTML = MATRIX.rows
    .filter((row) => row.kind !== 'other' && row.games.length < 2)
    .map((row) => {
      const used = row.games.length ? row.games.map((g) => `<a href="${REPO}${escape(g.file)}">${escape(nameOf(g.game))}</a>`).join('、') : `<em>${t.none}</em>`;
      return `<li><code>${escape(row.label)}</code><span>${used}</span></li>`;
    })
    .join('');
}

$('.lang').addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  try {
    localStorage.setItem('egret-demos-lang', lang);
  } catch {
    /* not remembered this time */
  }
  render();
});
render();
