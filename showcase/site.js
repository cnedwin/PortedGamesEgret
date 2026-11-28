import { FEATURED_ID, GAMES } from './games.js';
import { ADMIN_URL } from './admin-url.js';

const REPO = 'https://github.com/cnedwin/PortedGamesEgret';
const MEDIA = ['cover.webp', 'detail-1.webp', 'detail-2.webp'];
const LANG_KEY = 'egret-demos-lang';

const WORDS = {
  zh: {
    brand: '白鹭游戏案例', heroEngine: '新白鹭引擎', heroCases: '游戏案例',
    heroLead: '浏览可直接试玩的游戏，查看实机画面和背后的引擎实现。',
    matrix: '能力矩阵', engine: '引擎源码', repo: '游戏源码', admin: '展示站管理', browse: '浏览游戏',
    all: '全部游戏', full: '全部', '3d': '3D', '2d': '2D',
    count: (count) => `${count} 款游戏`, filterLabel: '按渲染类型筛选', featured: '精选案例',
    details: '案例详情', play: '开始试玩', back: '全部游戏', capabilities: '引擎能力',
    gallery: '实机画面', more: '其他游戏', source: '查看实现', skip: '跳到内容',
    navigation: '站点导航', projectLinks: '项目链接', foot: '新白鹭引擎 · 游戏案例',
    langButton: 'EN', langLabel: 'Switch to English',
    close: '关闭', prev: '上一张', next: '下一张',
    genericShot: (name, index) => `${name}实机画面 ${index}`,
    viewShot: (caption) => `查看大图：${caption}`,
    pageTitle: '新白鹭引擎游戏案例',
  },
  en: {
    brand: 'Egret Showcase', heroEngine: 'Egret Rebuild', heroCases: 'Game Showcase',
    heroLead: 'Play the demos, see them in action and explore how they use the engine.',
    matrix: 'Capability matrix', engine: 'Engine source', repo: 'Game source', admin: 'Showcase admin', browse: 'Browse games',
    all: 'All games', full: 'All', '3d': '3D', '2d': '2D',
    count: (count) => `${count} games`, filterLabel: 'Filter by rendering type', featured: 'Featured case',
    details: 'Case study', play: 'Play now', back: 'All games', capabilities: 'Engine capabilities',
    gallery: 'Gameplay gallery', more: 'More games', source: 'View implementation', skip: 'Skip to content',
    navigation: 'Site navigation', projectLinks: 'Project links', foot: 'Egret Rebuild · Game Showcase',
    langButton: '中文', langLabel: '切换到中文',
    close: 'Close', prev: 'Previous image', next: 'Next image',
    genericShot: (name, index) => `${name} gameplay ${index}`,
    viewShot: (caption) => `View larger image: ${caption}`,
    pageTitle: 'Egret Rebuild Game Showcase',
  },
};

const $ = (selector) => document.querySelector(selector);
const escape = (value) => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
const media = (game, index = 0) => `showcase/media/${game.id}/${MEDIA[index]}`;
const caseLink = (game) => `#/${game.id}`;
const playLink = (game) => `${game.folder}/`;
const gameById = new Map(GAMES.map((game) => [game.id, game]));
const filters = ['full', '3d', '2d'];
const home = $('#home');
const article = $('#game');
const viewer = $('.viewer');
let filter = 'full', viewing = null, returnFocus = null, catalogReturn = null;

function initialLanguage() {
  const explicit = new URLSearchParams(location.search).get('lang');
  if (explicit === 'zh' || explicit === 'en') return explicit;
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    // Restricted browsing still supports the language switch.
  }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}
let lang = initialLanguage();

function linkAdminWorkspace() {
  if (typeof ADMIN_URL !== 'string' || !ADMIN_URL.trim()) return;
  try {
    const url = new URL(ADMIN_URL);
    if (url.protocol !== 'https:' || url.username || url.password) return;
    const link = $('.admin-link');
    link.href = url;
    link.hidden = false;
  } catch {
    // Leave the entry hidden until a deployment URL has been configured.
  }
}

function caption(game, index) {
  return game.scenes?.[index]?.[lang] ?? WORDS[lang].genericShot(game[lang], index + 1);
}

function renderWords() {
  const words = WORDS[lang];
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  for (const node of document.querySelectorAll('[data-t]')) node.textContent = words[node.dataset.t];
  for (const node of document.querySelectorAll('[data-t-label]')) node.setAttribute('aria-label', words[node.dataset.tLabel]);
  for (const link of document.querySelectorAll('.matrix-link')) link.href = `capabilities.html?lang=${lang}`;
  $('.lang').textContent = words.langButton;
  $('.lang').setAttribute('aria-label', words.langLabel);
}

function renderFeatured() {
  const game = gameById.get(FEATURED_ID) ?? GAMES[0];
  const words = WORDS[lang];
  $('.featured').innerHTML = `
    <a class="featured-link" href="${caseLink(game)}" style="--image-focus: ${escape(game.imageFocus ?? 'center')}">
      <img src="${media(game)}" alt="" width="1600" height="900" fetchpriority="high">
      <span class="featured-info">
        <span><span class="featured-kicker">${words.featured}</span><strong>${escape(game[lang])}</strong></span>
        <span class="feature-arrow" aria-hidden="true">↗</span>
      </span>
    </a>`;
}

function gameCard(game, index) {
  const words = WORDS[lang];
  return `
    <article class="game-card">
      <a class="card-art" href="${caseLink(game)}" aria-label="${escape(game[lang])} · ${words.details}" style="--image-focus: ${escape(game.imageFocus ?? 'center')}">
        <img src="${media(game)}" alt="" ${index < 3 ? '' : 'loading="lazy"'} width="1600" height="900">
      </a>
      <div class="card-info">
        <p class="case-meta">${escape(game.genre[lang])} <span aria-hidden="true">·</span> ${words[game.kind]}</p>
        <h3><a href="${caseLink(game)}">${escape(game[lang])}</a></h3>
        <p class="card-summary">${escape(game.summary[lang])}</p>
        <ul class="feature-tags" aria-label="${words.capabilities}">
          ${game.features.slice(0, 2).map((feature) => `<li>${escape(feature.title[lang])}</li>`).join('')}
        </ul>
        <div class="card-links">
          <a class="text-link" href="${playLink(game)}" aria-label="${escape(game[lang])} · ${words.play}">${words.play} <span aria-hidden="true">↗</span></a>
          <a class="case-link" href="${caseLink(game)}" aria-label="${escape(game[lang])} · ${words.details}">${words.details} <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </article>`;
}

function renderCatalog() {
  const words = WORDS[lang];
  const games = filter === 'full' ? GAMES : GAMES.filter((game) => game.kind === filter);
  $('.filters').innerHTML = filters.map((value) =>
    `<button type="button" data-filter="${value}" aria-pressed="${filter === value}">${words[value]}</button>`).join('');
  $('.catalog-count').textContent = words.count(games.length);
  $('.game-grid').innerHTML = games.map(gameCard).join('');
}

function renderCase(game) {
  const words = WORDS[lang];
  const title = escape(game[lang]);
  article.innerHTML = `
    <nav class="case-path" aria-label="${words.navigation}"><a href="#/">← ${words.back}</a></nav>
    <section class="case-hero">
      <div class="case-intro">
        <p class="case-meta">${escape(game.genre[lang])} <span aria-hidden="true">·</span> ${words[game.kind]}</p>
        <h1 tabindex="-1">${title}</h1>
        <p>${escape(game.summary[lang])}</p>
        <div class="actions">
          <a class="btn btn-primary" href="${playLink(game)}">${words.play} <span aria-hidden="true">↗</span></a>
          <a class="btn btn-secondary" href="${REPO}/tree/main/${game.folder}">${words.repo}</a>
        </div>
      </div>
      <button class="case-cover" type="button" data-view="0" aria-label="${escape(words.viewShot(caption(game, 0)))}" style="--image-focus: ${escape(game.imageFocus ?? 'center')}">
        <img src="${media(game)}" alt="${escape(caption(game, 0))}" fetchpriority="high" width="1600" height="900">
      </button>
    </section>
    <section class="case-section" aria-labelledby="features-title">
      <h2 id="features-title">${words.capabilities}</h2>
      <div class="capability-grid" data-count="${game.features.length}">
        ${game.features.map((feature) => `
          <div class="capability">
            <h3>${escape(feature.title[lang])}</h3>
            <p>${escape(feature.description[lang])}</p>
            <a class="text-link" href="${REPO}/blob/main/${game.folder}/${escape(feature.source)}" aria-label="${escape(feature.title[lang])} · ${words.source}">${words.source} <span aria-hidden="true">↗</span></a>
          </div>`).join('')}
      </div>
    </section>
    <section class="case-section" aria-labelledby="gallery-title">
      <h2 id="gallery-title">${words.gallery}</h2>
      <div class="gallery${game.portraitGallery ? ' gallery-portrait' : ''}">
        ${MEDIA.slice(1).map((_, idx) => {
          const index = idx + 1;
          const label = escape(caption(game, index));
          return `<figure>
            <button type="button" data-view="${index}" aria-label="${escape(words.viewShot(caption(game, index)))}">
              <img src="${media(game, index)}" alt="${label}" loading="lazy">
            </button>
            <figcaption>${label}</figcaption>
          </figure>`;
        }).join('')}
      </div>
    </section>
    <nav class="case-section related" aria-labelledby="related-title">
      <h2 id="related-title">${words.more}</h2>
      <div>${GAMES.filter((other) => other !== game).map((other) =>
        `<a href="${caseLink(other)}">${escape(other[lang])} <span aria-hidden="true">→</span></a>`).join('')}</div>
    </nav>`;
}

function selectedCase() {
  return location.hash.startsWith('#/') ? gameById.get(location.hash.slice(2)) : null;
}

function renderRoute({ focus = false } = {}) {
  const game = selectedCase();
  home.hidden = Boolean(game);
  article.hidden = !game;
  if (game) renderCase(game);
  else {
    renderFeatured();
    renderCatalog();
  }
  document.title = game ? `${game[lang]} · ${WORDS[lang].pageTitle}` : WORDS[lang].pageTitle;
  if (!focus) return;
  if (game) {
    article.querySelector('h1').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } else {
    const link = catalogReturn?.featured
      ? $('.featured-link')
      : $(`.card-art[href="${catalogReturn?.href}"]`);
    const target = link ?? $('#home-title');
    target.focus({ preventScroll: true });
    window.scrollTo(0, link ? catalogReturn.scroll : 0);
  }
}

function showPicture(game, index) {
  index = (index + MEDIA.length) % MEDIA.length;
  viewing = { game, index };
  const label = caption(game, index);
  const image = viewer.querySelector('img');
  image.src = media(game, index);
  image.alt = label;
  $('.viewer-caption').textContent = `${label} · ${index + 1}/${MEDIA.length}`;
  if (!viewer.open) viewer.showModal();
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('a, button');
  if (!target) return;
  const act = target.dataset.act;
  if (act === 'lang') {
    lang = lang === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* This tab still switches. */ }
    const url = new URL(location.href);
    url.searchParams.set('lang', lang);
    history.replaceState(null, '', url);
    renderWords();
    renderRoute();
  } else if (act === 'browse' || act === 'skip') {
    event.preventDefault();
    const section = act === 'browse' ? $('#catalog-title') : $('#content');
    section.focus({ preventScroll: true });
    section.scrollIntoView();
  } else if (target.dataset.filter && filters.includes(target.dataset.filter)) {
    filter = target.dataset.filter;
    renderCatalog();
    $(`[data-filter="${filter}"]`).focus();
  } else if (target.dataset.view !== undefined && selectedCase()) {
    returnFocus = target;
    showPicture(selectedCase(), Number(target.dataset.view));
  } else if (act === 'close') {
    viewer.close();
  } else if (viewing && (act === 'prev' || act === 'next')) {
    showPicture(viewing.game, viewing.index + (act === 'prev' ? -1 : 1));
  }
  const href = target.getAttribute('href');
  if (!home.hidden && href?.startsWith('#/') && href !== '#/') {
    catalogReturn = { href, scroll: window.scrollY, featured: target.matches('.featured-link') };
  } else if (target.matches('.brand')) {
    catalogReturn = null;
  }
});

viewer.addEventListener('click', (event) => { if (event.target === viewer) viewer.close(); });
viewer.addEventListener('close', () => {
  viewing = null;
  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
});
viewer.addEventListener('keydown', (event) => {
  if (!viewing || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  showPicture(viewing.game, viewing.index + (event.key === 'ArrowLeft' ? -1 : 1));
});
window.addEventListener('hashchange', () => {
  if (viewer.open) viewer.close();
  renderRoute({ focus: true });
});
linkAdminWorkspace();
renderWords();
renderRoute();
