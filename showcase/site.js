// The showcase page: a strip of every game on the front page, and a page of
// its own for each game at #/<id>. Words come in Chinese and English; the
// choice is remembered in this browser when it can be.
import { GAMES } from './games.js';

const WORDS = {
  zh: {
    brand: '新白鹭引擎游戏 Demo',
    engine: '引擎源码',
    repo: '游戏源码',
    all: '全部游戏',
    langButton: 'EN',
    langLabel: 'Switch to English',
    details: '了解游戏',
    play: '开始游玩',
    back: '全部游戏',
    guide: '玩法与开发说明',
    shots: '游戏截图',
    shotAlt: (name, n) => `${name} 截图 ${n}`,
    ready: '在浏览器里直接打开，无需下载安装。',
    more: '其他游戏',
    close: '关闭',
    prev: '上一张',
    next: '下一张',
    engineTitle: '同一个引擎，六种玩法',
    engineText:
      '这里的每一个游戏都运行在新白鹭引擎 Egret Rebuild 上：从三维射击、赛车和动作生存，到回合制角色扮演、门派经营和二维恋爱养成。打开网页就能玩，电脑和手机都能操作，代码全部开源。',
    engineFacts: [
      ['WebGL2 与 WebGPU', '同一套场景可以交给两种图形接口绘制'],
      ['三维与二维', '实时阴影、后期处理、骨骼动画与分层视差'],
      ['开源', '引擎与每个游戏的源码都在 GitHub 上'],
    ],
    foot: '基于新白鹭引擎 Egret Rebuild 开发的游戏 Demo，仅作引擎展示之用。',
    title: '新白鹭引擎游戏 Demo',
  },
  en: {
    brand: 'Egret Rebuild Game Demos',
    engine: 'Engine source',
    repo: 'Game source',
    all: 'All games',
    langButton: '中文',
    langLabel: '切换到中文',
    details: 'About the game',
    play: 'Play now',
    back: 'All games',
    guide: 'Guide and development notes',
    shots: 'Screenshots',
    shotAlt: (name, n) => `${name} screenshot ${n}`,
    ready: 'Opens right in the browser, with nothing to install.',
    more: 'More games',
    close: 'Close',
    prev: 'Previous',
    next: 'Next',
    engineTitle: 'One engine, six kinds of play',
    engineText:
      'Every game here runs on the new Egret engine, Egret Rebuild: 3D shooting, racing and action survival, turn-based role-playing, sect management and 2D romance. Each one opens in a web page, plays on a computer or a phone, and is open source.',
    engineFacts: [
      ['WebGL2 and WebGPU', 'The same scene can be drawn through either graphics interface'],
      ['3D and 2D', 'Real-time shadows, post-processing, skeletal animation and layered parallax'],
      ['Open source', 'The engine and every game are on GitHub'],
    ],
    foot: 'Game demos built with the new Egret engine, Egret Rebuild, shown to demonstrate the engine.',
    title: 'Egret Rebuild Game Demos',
  },
};

const REPO = 'https://github.com/cnedwin/PortedGamesEgret/blob/main/';
const media = (game, file) => `showcase/media/${game.id}/${file}`;
const $ = (selector, root = document) => root.querySelector(selector);
const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---- language ---------------------------------------------------------------------------------
function storedLanguage() {
  try {
    const saved = localStorage.getItem('egret-demos-lang');
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    /* storage can be unavailable; fall back to the browser's language */
  }
  return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}
let lang = new URLSearchParams(location.search).get('lang') ?? storedLanguage();
if (lang !== 'zh' && lang !== 'en') lang = 'zh';

function setLanguage(next) {
  lang = next;
  try {
    localStorage.setItem('egret-demos-lang', lang);
  } catch {
    /* not remembered this time */
  }
  render();
}

// ---- the front page ---------------------------------------------------------------------------
const home = $('#home');
const strip = $('.strip');
let openId = GAMES[0].id;

function renderStrip() {
  const t = WORDS[lang];
  strip.setAttribute('aria-label', t.all);
  strip.innerHTML = GAMES.map(
    (game) => `
    <article class="panel${game.id === openId ? ' open' : ''}" data-id="${game.id}" style="--panel-accent:${game.accent}">
      <img class="panel-art" src="${media(game, game.cover)}" alt="" loading="${game.id === openId ? 'eager' : 'lazy'}">
      <button class="panel-banner" type="button" data-act="open" aria-expanded="${game.id === openId}" lang="zh">${escape(game.zh)}</button>
      <span class="panel-genre-v" aria-hidden="true">${escape(game.genre[lang])}</span>
      <div class="panel-body">
        <p class="panel-genre">${escape(game.genre[lang])}</p>
        <h2 class="panel-title" lang="zh">${escape(game.zh)}</h2>
        <p class="panel-en" lang="en">${escape(game.en)}</p>
        <p class="panel-line">${escape(game.line[lang])}</p>
        <div class="btn-row">
          <a class="btn btn-play" href="${game.folder}/">${t.play}</a>
          <a class="btn btn-quiet" href="#/${game.id}">${t.details}</a>
        </div>
      </div>
    </article>`,
  ).join('');
}

function openPanel(id) {
  if (id === openId) return;
  openId = id;
  for (const panel of strip.children) {
    const open = panel.dataset.id === id;
    panel.classList.toggle('open', open);
    $('.panel-banner', panel).setAttribute('aria-expanded', String(open));
    if (open) $('.panel-art', panel).loading = 'eager';
  }
}

// A closed panel opens when it is chosen; with a mouse, resting on it is enough.
strip.addEventListener('click', (event) => {
  const panel = event.target.closest('.panel');
  if (panel && !event.target.closest('a')) openPanel(panel.dataset.id);
});
let hoverTimer = 0;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
strip.addEventListener('pointerover', (event) => {
  if (!finePointer.matches) return;
  const panel = event.target.closest('.panel');
  clearTimeout(hoverTimer);
  if (panel) hoverTimer = setTimeout(() => openPanel(panel.dataset.id), 140);
});
strip.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
strip.addEventListener('focusin', (event) => {
  const panel = event.target.closest('.panel');
  if (panel) openPanel(panel.dataset.id);
});

function renderEngine() {
  const t = WORDS[lang];
  $('.engine h2').textContent = t.engineTitle;
  $('.engine p').textContent = t.engineText;
  $('.engine-facts').innerHTML = t.engineFacts
    .map(([title, text]) => `<li><strong>${escape(title)}</strong><span>${escape(text)}</span></li>`)
    .join('');
}

// ---- one game ---------------------------------------------------------------------------------
const page = $('#game');

function renderGame(game) {
  const t = WORDS[lang];
  const others = GAMES.filter((other) => other !== game);
  page.style.setProperty('--game-accent', game.accent);
  page.innerHTML = `
    <section class="hero">
      <img class="hero-art" src="${media(game, game.cover)}" alt="">
      <a class="back" href="#/">${t.back}</a>
      <div class="hero-inner">
        <p class="hero-genre">${escape(game.genre[lang])}</p>
        <h1 class="hero-title" lang="zh">${escape(game.zh)}</h1>
        <p class="hero-en" lang="en">${escape(game.en)}</p>
        <div class="btn-row">
          <a class="btn btn-play" href="${game.folder}/">${t.play}</a>
          <a class="btn btn-quiet" href="${REPO}${game.folder}/README.md">${t.guide}</a>
        </div>
      </div>
    </section>
    <section class="about">
      <p class="about-text" lang="${lang}">${escape(game.intro[lang])}</p>
      <dl class="facts">
        ${game.facts[lang].map(([name, value]) => `<div><dt>${escape(name)}</dt><dd>${escape(value)}</dd></div>`).join('')}
      </dl>
    </section>
    <section class="gallery">
      <h2>${t.shots}</h2>
      <div class="shots" data-count="${game.shots.length}">
        ${game.shots
          .map(
            (file, index) => `
          <button class="shot" type="button" data-act="view" data-index="${index}">
            <img src="${media(game, file)}" alt="${escape(t.shotAlt(lang === 'zh' ? game.zh : game.en, index + 1))}" loading="lazy">
          </button>`,
          )
          .join('')}
      </div>
    </section>
    <section class="cta">
      <p>${t.ready}</p>
      <div class="btn-row">
        <a class="btn btn-play" href="${game.folder}/">${t.play}</a>
        <a class="btn btn-quiet" href="#/">${t.back}</a>
      </div>
    </section>
    <nav class="more" aria-label="${t.more}">
      <h2>${t.more}</h2>
      <div class="more-list">
        ${others
          .map(
            (other) => `
          <a href="#/${other.id}">
            <img src="${media(other, other.cover)}" alt="" loading="lazy">
            <span lang="zh">${escape(other.zh)}<small lang="en">${escape(other.en)}</small></span>
          </a>`,
          )
          .join('')}
      </div>
    </nav>`;
}

// ---- picture viewer ---------------------------------------------------------------------------
const viewer = $('.viewer');
let viewing = { game: null, index: 0 };

function showPicture(game, index) {
  const count = game.shots.length;
  viewing = { game, index: (index + count) % count };
  const img = $('img', viewer);
  img.src = media(game, game.shots[viewing.index]);
  img.alt = WORDS[lang].shotAlt(lang === 'zh' ? game.zh : game.en, viewing.index + 1);
  if (!viewer.open) viewer.showModal();
}
page.addEventListener('click', (event) => {
  const shot = event.target.closest('[data-act="view"]');
  if (shot) showPicture(currentGame(), Number(shot.dataset.index));
});
viewer.addEventListener('click', (event) => {
  const act = event.target.closest('button')?.dataset.act;
  if (act === 'close' || event.target === viewer) viewer.close();
  else if (act === 'prev') showPicture(viewing.game, viewing.index - 1);
  else if (act === 'next') showPicture(viewing.game, viewing.index + 1);
});
viewer.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') showPicture(viewing.game, viewing.index - 1);
  if (event.key === 'ArrowRight') showPicture(viewing.game, viewing.index + 1);
});

// ---- addresses and words ----------------------------------------------------------------------
function currentGame() {
  const id = location.hash.replace(/^#\/?/, '');
  return GAMES.find((game) => game.id === id);
}

function renderChrome() {
  const t = WORDS[lang];
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  for (const node of document.querySelectorAll('[data-t]')) {
    const value = t[node.dataset.t];
    if (typeof value === 'string') node.textContent = value;
  }
  const button = $('.lang');
  button.textContent = t.langButton;
  button.setAttribute('aria-label', t.langLabel);
  $('.brand').setAttribute('aria-label', t.all);
  $('.viewer-close').setAttribute('aria-label', t.close);
  $('.viewer-step.prev').setAttribute('aria-label', t.prev);
  $('.viewer-step.next').setAttribute('aria-label', t.next);
}

let lastHomeScroll = 0;
function render() {
  renderChrome();
  const game = currentGame();
  const t = WORDS[lang];
  if (game) {
    home.hidden = true;
    page.hidden = false;
    renderGame(game);
    document.title = `${game.zh} ${game.en} · ${t.title}`;
  } else {
    page.hidden = true;
    home.hidden = false;
    renderStrip();
    renderEngine();
    document.title = t.title;
  }
}

let wasGame = Boolean(currentGame());
addEventListener('hashchange', () => {
  const game = currentGame();
  if (!wasGame) lastHomeScroll = scrollY;
  if (game) openId = game.id;
  render();
  // A game's page starts at the top; coming back restores the front page with that game open.
  scrollTo(0, game ? 0 : lastHomeScroll);
  wasGame = Boolean(game);
});
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-act="lang"]')) setLanguage(lang === 'zh' ? 'en' : 'zh');
});

if (currentGame()) openId = currentGame().id;
render();

// The top bar turns solid once the page scrolls under it.
const bar = $('.bar');
const settleBar = () => bar.classList.toggle('solid', scrollY > 40);
addEventListener('scroll', settleBar, { passive: true });
settleBar();
