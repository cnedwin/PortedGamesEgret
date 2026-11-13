'use strict';

const data = window.WULIN_PREVIEW_DATA;
const $ = (selector, scope = document) => scope.querySelector(selector);
const app = $('#app');
const dialog = $('#dialog');
const announcement = $('#announcement');
const base = new URL('../', location.href);
const scenes = ['title', 'seat', 'world', 'battle'];
const scenePaths = Object.fromEntries(scenes.map(name => [name, `assets/scenes/${name}.webp`]));
let manifest = { portraits: {}, assets: {} };
const sects = Object.fromEntries(data.sects.map(sect => [sect.id, sect]));
const places = Object.fromEntries(data.places.map(place => [place.id, place]));
const number = new Intl.NumberFormat('zh-CN');
const tabs = [
  ['seat', '山门', 'gate'],
  ['disciples', '弟子', 'people'],
  ['world', '江湖', 'map'],
  ['battle', '战阵', 'swords'],
  ['chronicle', '纪事', 'scroll'],
  ['saves', '存档', 'box'],
];
const glyphs = {
  gate: '<path d="M3 10h18L12 3 3 10Zm3 0v10m12-10v10M3 20h18m-12 0v-5h6v5M9 7h6"/>',
  people: '<circle cx="12" cy="7" r="3"/><path d="M6 20v-2a6 6 0 0 1 12 0v2M5 12a3 3 0 0 0-2 3v3m16-6a3 3 0 0 1 2 3v3"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
  swords: '<path d="m3 3 6 1 11 11-4 4L5 8 3 3Zm12 15 3-3m-3 7 7-7M21 3l-6 1-3 3m-5 5-4 4 4 4 4-4M2 15l7 7"/>',
  scroll: '<path d="M6 3h12v16a2 2 0 0 0 2 2H7a3 3 0 0 1-3-3v-3h12v4a2 2 0 0 0 4 0V6a3 3 0 0 0-3-3M8 7h8m-8 4h8"/>',
  box: '<path d="M4 5h16v14H4zM4 9h16m-11 0V5m6 0v4m-5 5h4"/>',
  settings: '<path d="m12 3 2 2 3 .1 1 2.9 2 2v4l-2 2-1 2.9-3 .1-2 2-2-2-3-.1L6 16l-2-2v-4l2-2 1-2.9 3-.1z"/><circle cx="12" cy="12" r="3"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M10 10h4v4h-4z"/>',
  grain: '<path d="M12 21V4m0 4a5 5 0 0 1 5-4c0 3-2 5-5 5m0 4a6 6 0 0 1-6-5c3 0 6 1 6 5m0 4a5 5 0 0 1 5-4c0 3-2 5-5 5"/>',
  banner: '<path d="M5 21V3m0 2h14l-3 4 3 4H5"/>',
  balance: '<path d="M12 4v16M5 20h14M4 8h16M6 8l-3 6h6L6 8Zm12 0-3 6h6l-3-6Z"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6 6-6-6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  frame: '<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>',
  pause: '<path d="M9 5v14m6-14v14"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 3v3m0 12v3m-9-9h3m12 0h3"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5"/>',
  heart: '<path d="M12 20 4.5 12a4.4 4.4 0 0 1 7.5-4 4.4 4.4 0 0 1 7.5 4L12 20Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
};
const icon = (name, css = '') => `<svg class="icon ${css}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[name] || ''}</svg>`;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const attr = escape;
const assetUrl = path => attr(new URL(path, base).href);
const bg = name => `--scene-image: url('${assetUrl(manifest.assets[name] || scenePaths[name])}')`;
const avatarColor = sect => sects[sect]?.color || '#5a5e48';
const startingPeople = [
  { id: 'master', name: '慧灯禅师', title: '掌门', age: 71, job: '主持山门', power: 1280, loyalty: 100, sect: 'shaolin', art: '金刚伏魔掌', health: 100 },
  { id: 'wuyan', portraitId: 'elder-shaolin-teaching', name: '悟砚', title: '传功长老', age: 53, job: '传授武学', power: 685, loyalty: 89, sect: 'shaolin', art: '罗汉拳', health: 96 },
  { id: 'xuzhen', name: '许照', title: '内门弟子', age: 26, job: '修练武学', power: 360, loyalty: 84, sect: 'shaolin', art: '伏虎拳', health: 91 },
  { id: 'shenmu', name: '沈沐', title: '外门弟子', age: 21, job: '巡察山道', power: 227, loyalty: 76, sect: 'shaolin', art: '少林棍法', health: 88 },
  { id: 'ningxiao', name: '宁霄', title: '外门弟子', age: 19, job: '采集药材', power: 153, loyalty: 72, sect: 'shaolin', art: '基础内功', health: 95 },
  { id: 'wenchang', name: '温长青', title: '杂役', age: 24, job: '伐木', power: 78, loyalty: 63, sect: 'shaolin', art: '无', health: 87 },
];
const pageFromUrl = () => {
  const page = new URLSearchParams(location.search).get('view') || 'seat';
  return [...tabs.map(t => t[0]), 'title', 'sects', 'arts'].includes(page) ? page : 'seat';
};
const state = {
  page: pageFromUrl(),
  sect: 'shaolin',
  chosenSect: 'shaolin',
  place: 'songshan',
  day: 28,
  speed: 1,
  silver: 3280,
  grain: 420,
  renown: 76,
  virtue: 38,
  building: 'hall',
  buildings: { hall: 2, yard: 1, dorm: 1, gate: 1, board: 1 },
  people: startingPeople.map(person => ({ ...person })),
  currentPerson: 'master',
  rank: '全部',
  batch: new Set(),
  search: '',
  zoom: 1,
  mapZoom: 1,
  sceneView: 'all',
  target: '',
  fightSpeed: 1,
  fightPaused: false,
  fightTime: 24,
  health: [82, 61],
  battleLog: [],
  logFilter: '全部',
  artTier: '全部',
  artSelected: '',
  quality: '自动',
  succession: false,
  saves: {},
  chronicle: [
    { day: 28, type: '山门', title: '招贤榜前有客来访', text: '临安刀客林见山前来投师，擅刀剑，尚待掌门会见。' },
    { day: 27, type: '修练', title: '内门弟子许照精进', text: '伏虎拳练至第四重，拳脚战力提升。' },
    { day: 26, type: '江湖', title: '恒山传闻', text: '行商来报，恒山古道近来太平，可以派人前往探察。' },
    { day: 24, type: '山门', title: '厢房修缮竣工', text: '西院厢房可再容纳四名弟子。' },
    { day: 21, type: '江湖', title: '武当使者来访', text: '松鹤真人遣使送来书信，盼两派以武会友。' },
  ],
};

function portrait(sectId, name, css = '') {
  const sect = sects[sectId];
  const entries = Object.entries(manifest.portraits);
  const item = manifest.portraits[sectId]
    || manifest.portraits[`leader-${sectId}`]
    || entries.find(([, item]) => item?.name === name)?.[1]
    || entries.find(([, item]) => item?.name === sect?.leader.name)?.[1];
  const path = typeof item === 'string' ? item : (css === 'sect-hero' ? item?.full : item?.bust) || item?.src || `assets/portraits/leader-${sectId}/${css === 'sect-hero' ? 'full' : 'bust'}.webp`;
  return `<span class="portrait ${css}" style="--portrait-base:${avatarColor(sectId)}"><span class="portrait-fallback">${escape(name[0])}</span><img src="${assetUrl(path)}" alt="" onerror="this.hidden=true" decoding="async"></span>`;
}

const activeSect = () => sects[state.sect];
const activePlace = () => places[activeSect().seat];
const currentPerson = () => state.people.find(p => p.id === state.currentPerson) || state.people[0];
const date = () => `承和三年 · ${state.day > 30 ? '四月' : '三月'}${state.day % 30 || 30}日`;
const navButton = ([id, label, glyph]) => `<button class="nav-button ${state.page === id ? 'is-active' : ''}" data-act="page" data-value="${id}" ${state.page === id ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span></button>`;
const btn = (label, action, value = '', kind = '', glyph = '') => `<button type="button" class="button ${kind}" data-act="${action}" data-value="${attr(value)}">${glyph ? icon(glyph) : ''}${escape(label)}</button>`;
const pill = (label, action, value, active) => `<button type="button" class="pill ${active ? 'is-active' : ''}" data-act="${action}" data-value="${attr(value)}" aria-pressed="${active}">${escape(label)}</button>`;
const tag = (label, css = '') => `<span class="tag ${css}">${escape(label)}</span>`;
const scene = (name, extra = '') => `<div class="scene-image ${extra}" style="${bg(name)}"></div>`;
const progress = (value, css = '', title = '') => `<span class="meter ${css}" role="meter" aria-label="${attr(title || '进度')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0, Math.min(100, Math.round(value)))}"><i style="width:${Math.max(0, Math.min(100, value))}%"></i></span>`;
const coin = value => number.format(value);
const resource = (glyph, label, value, suffix) => `<div class="resource">${icon(glyph)}<div><span>${label}</span><b>${coin(value)}${suffix ? `<small>${suffix}</small>` : ''}</b></div></div>`;
const panelTitle = (title, extra = '') => `<div class="panel-title"><h2>${escape(title)}</h2>${extra}</div>`;
const screenHead = (trail, title, desc, actions = '') => `<header class="screen-head"><div><div class="breadcrumb">武林天下 ${icon('arrow')} ${escape(trail)}</div><h1>${escape(title)}</h1><p>${escape(desc)}</p></div><div class="screen-actions">${actions}</div></header>`;

function speedControls() {
  return `<div class="speeds" role="group" aria-label="时间速度">
    ${[[0, '暂停', 'pause'], [1, '行'], [4, '快'], [16, '疾']].map(([value, label, glyph]) =>
      `<button data-act="speed" data-value="${value}" class="${state.speed === value ? 'is-active' : ''}" aria-pressed="${state.speed === value}" title="${label}">${glyph ? icon(glyph) : label}</button>`).join('')}
  </div>`;
}

function shell(content) {
  const sect = activeSect();
  return `<div class="shell">
    <aside class="nav" aria-label="主要功能">
      <button class="nav-logo" data-act="page" data-value="title" aria-label="回到标题"><span class="seal"><span>武</span><span>林</span></span></button>
      <nav class="nav-list">${tabs.map(navButton).join('')}</nav>
      <button class="nav-button nav-bottom" data-act="settings">${icon('settings')}<span>设置</span></button>
    </aside>
    <header class="topbar">
      <div class="top-identity"><span class="sect-stamp">${escape(sect.name[0])}</span><div><strong>${escape(sect.name)}</strong><button class="date-button" data-act="date" title="日期">${date()}</button></div></div>
      <div class="resources">${resource('coin', '银两', state.silver, '两')}${resource('grain', '粮草', state.grain, '石')}${resource('banner', '威望', state.renown)}${resource('balance', '正邪', state.virtue)}</div>
      ${speedControls()}
    </header>
    <main class="main" id="main">${content}</main>
  </div>`;
}

function titleScreen() {
  return `<main class="title-screen" style="${bg('title')}">
    <div class="title-nav"><span class="seal"><span>武</span><span>林</span></span><button class="button on-dark" data-act="page" data-value="seat">查看山门</button></div>
    <div class="title-copy"><p class="title-era">大昭 · 承和三年</p><h1>武林<span>天下</span></h1><p>禁武令既下，江湖风雨欲来。<br>择一门派，兴建山门，教养弟子，问鼎武林。</p>
      <div class="title-actions">${btn('开创新局', 'page', 'sects', 'gold-button', 'arrow')}${btn('载入存档', 'page', 'saves', 'on-dark', 'box')}</div>
    </div>
    <div class="title-coordinate">${icon('pin')} 嵩山 · 少林</div>
  </main>`;
}

function sectScreen() {
  const sect = sects[state.chosenSect];
  const standing = ['邪', '中立', '正'][sect.standing + 1];
  return `<main class="sect-screen">
    <div class="sect-screen-head">${btn('返回标题', 'page', 'title', 'ghost', 'back')}<span class="seal"><span>武</span><span>林</span></span></div>
    <div class="sect-select-layout">
      <section><h1>择一门派</h1><p class="subtitle">从十二门派中择一执掌。各派据点、武学和经营路数有所不同。</p>
      <div class="sect-grid">${data.sects.map(s => `<button class="sect-choice ${s.id === sect.id ? 'is-active' : ''}" data-act="choose-sect" data-value="${s.id}" aria-pressed="${s.id === sect.id}">
        ${portrait(s.id, s.leader.name, 'sect-thumb')}<span><b>${escape(s.name)}</b><small>${escape(places[s.seat].name)}</small></span>
      </button>`).join('')}</div></section>
      <article class="sect-feature" style="--sect-accent:${sect.color}">
        <div class="sect-feature-art">${scene('title')}${portrait(sect.id, sect.leader.name, 'sect-hero')}<div class="sect-feature-shade"></div></div>
        <div class="sect-feature-copy"><div class="line-between">${tag(standing, standing === '正' ? 'positive' : '')}<span class="caption">${escape(places[sect.seat].name)} · 总舵</span></div>
          <h2>${escape(sect.name)}</h2><p class="sect-master">掌门 · ${escape(sect.leader.name)}</p><p>${escape(sect.role)}</p>
          <label class="check-row"><input type="checkbox" id="succession" ${state.succession ? 'checked' : ''}> 世代更替</label>
          ${btn('入主山门', 'start', sect.id, 'primary', 'arrow')}
        </div>
      </article>
    </div>
  </main>`;
}

const buildingPins = [
  ['hall', 41, 42],
  ['yard', 28, 70],
  ['dorm', 79, 58],
  ['gate', 55, 76],
];

function seatScreen() {
  const place = activePlace();
  const sel = data.buildings[state.building];
  const level = state.buildings[state.building] || 0;
  const terrain = [
    ['药材', place.resources.herb], ['石矿', place.resources.stone], ['木材', place.resources.wood], ['铁矿', place.resources.iron],
  ];
  const used = Object.keys(state.buildings).reduce((total, key) => total + data.buildings[key].cells, 0);
  return `${screenHead('山门', place.name, `${activeSect().name}总舵 · ${place.note}`, btn('兴建建筑', 'build', '', 'primary', 'plus'))}
    <div class="seat-layout">
      <section class="scene-panel seat-panel" aria-label="山门鸟瞰">
        <div class="scene-viewport"><div class="scene-stage" style="--zoom:${state.zoom}">${scene('seat')}
          ${state.sceneView !== 'clean' ? buildingPins.filter(([id]) => state.buildings[id]).map(([id,x,y]) => `<button class="scene-pin ${state.building === id ? 'is-active' : ''}" style="--x:${x}%;--y:${y}%" data-act="building" data-value="${id}">${icon('gate')}<span>${data.buildings[id].name}</span><small>${state.buildings[id]}级</small></button>`).join('') : ''}
        </div></div>
        <div class="scene-top"><div class="scene-chip">${icon('pin')}<span>${escape(place.name)}总舵</span></div><div class="scene-status"><span></span>山门安定</div></div>
        <div class="scene-zoom" role="group" aria-label="山门视角"><button data-act="zoom" data-value="in" aria-label="放大">${icon('plus')}</button><button data-act="zoom" data-value="out" aria-label="缩小">${icon('minus')}</button><button data-act="zoom" data-value="reset" aria-label="恢复全景">${icon('frame')}</button></div>
        <div class="scene-bottom"><span>${icon('layers')} 山门全景</span><button class="scene-overlay-button" data-act="scene-labels">${state.sceneView === 'clean' ? '显示建筑名' : '隐藏建筑名'}</button></div>
      </section>
      <aside class="seat-side">
        <section class="panel leader-panel">
          <div class="leader-visual">${scene('title')}${portrait(state.sect, activeSect().leader.name, 'leader-image')}<div class="leader-shade"></div><div class="leader-copy">${tag('掌门在位', 'dark-tag')}<h2>${escape(activeSect().leader.name)}</h2><p>${escape(activeSect().role.split('，')[0])}</p></div></div>
          <div class="leader-footer"><div><span>忠诚</span><b>100</b></div><div><span>弟子</span><b>${state.people.length}<small> 人</small></b></div><button class="icon-link" data-act="page" data-value="disciples" aria-label="查看弟子">${icon('arrow')}</button></div>
        </section>
        <section class="panel recruit-panel">${panelTitle('招贤榜', tag('1 人求见', 'positive'))}
          <div class="recruit-content"><div class="recruit-avatar">${icon('people')}</div><div><h3>林见山</h3><p>临安 · 22岁 · 刀剑资质 78</p></div></div>
          <div class="recruit-footer">${btn('查看来客', 'recruit', '', 'outline', 'arrow')}</div>
        </section>
      </aside>
    </div>
    <div class="seat-bottom">
      <section class="panel"><div class="panel-title"><h2>据点总览</h2><span class="caption">每旬结算</span></div>
        <div class="stat-grid"><div><span>建筑用地</span><b>${used}<small> / ${place.cells}</small></b></div><div><span>厢房床位</span><b>${state.people.length}<small> / 8</small></b></div><div><span>薪俸开支</span><b>42<small> 两</small></b></div><div><span>朝廷关注</span><b>12</b></div></div>
        <div class="terrain-list">${terrain.map(([name, grade]) => `<span>${name} <strong>${'●'.repeat(grade)}${'<i>○</i>'.repeat(3 - grade)}</strong></span>`).join('')}</div>
      </section>
      <section class="panel building-panel">${panelTitle('建筑管理', tag(`${Object.keys(state.buildings).length} 座`, 'plain'))}
        <div class="building-switch" role="group" aria-label="现有建筑">${Object.keys(state.buildings).map(id => pill(data.buildings[id].name, 'building', id, id === state.building)).join('')}</div>
        <div class="building-detail"><div><h3>${escape(sel.name)} ${tag(`${level}级`, 'plain')}</h3><p>${escape(sel.does)} · 占地 ${sel.cells} 格</p></div>${level < sel.max ? btn(`升至${level + 1}级`, 'upgrade', '', 'outline') : tag('已满级', 'positive')}</div>
      </section>
    </div>`;
}

function personAvatar(person, css = '') {
  if (person.id === 'master') return portrait(person.sect, person.name, css);
  const asset = manifest.portraits[person.portraitId] || Object.values(manifest.portraits).find(item => item?.name === person.name);
  if (asset?.src) return `<span class="portrait ${css}" style="--portrait-base:${avatarColor(person.sect)}"><img src="${assetUrl(asset.bust || asset.src)}" alt="" onerror="this.hidden=true"></span>`;
  return `<span class="person-monogram ${css}">${escape(person.name[0])}</span>`;
}

function disciplesScreen() {
  const matches = state.people.filter(person => (state.rank === '全部' || person.title.includes(state.rank)) && (!state.search || [person.name, person.job, person.art].join(' ').includes(state.search)));
  const person = currentPerson();
  return `${screenHead('弟子', '门中弟子', `在册 ${state.people.length} 人 · 查看弟子、安排差事与武学`, btn('武学名录', 'page', 'arts', 'outline', 'scroll'))}
    <div class="disciple-layout">
      <section class="panel disciple-roster">
        <div class="panel-title roster-header"><div class="button-group">${['全部', '掌门', '长老', '内门', '外门', '杂役'].map(rank => pill(rank, 'rank', rank, state.rank === rank)).join('')}</div><label class="search-wrap"><span class="sr-only">查找弟子</span><input type="search" id="search-person" value="${attr(state.search)}" placeholder="查找弟子" autocomplete="off"></label></div>
        <div class="batch-toolbar"><span>已选 ${state.batch.size} 人</span><button type="button" class="button outline" data-act="batch-job" ${state.batch.size ? '' : 'disabled'}>批量改派</button><button type="button" class="button ghost" data-act="batch-clear" ${state.batch.size ? '' : 'disabled'}>取消选择</button></div>
        <div class="table-scroll">
          <table class="roster-table"><thead><tr><th scope="col"><label class="batch-check"><span class="sr-only">选择当前筛选的弟子</span><input type="checkbox" id="batch-all" ${matches.some(p=>p.id !== 'master') && matches.every(p=>p.id==='master'||state.batch.has(p.id)) ? 'checked' : ''} ${matches.some(p=>p.id!=='master') ? '' : 'disabled'}></label></th><th>姓名</th><th>身份</th><th>所长</th><th>战力</th><th>忠诚</th><th>差事</th></tr></thead>
          <tbody>${matches.map(p => `<tr class="${p.id === person.id ? 'is-active' : ''}"><td><label class="batch-check"><span class="sr-only">选择${escape(p.name)}</span><input type="checkbox" data-batch-person="${p.id}" ${state.batch.has(p.id) ? 'checked' : ''} ${p.id === 'master' ? 'disabled' : ''}></label></td><td><button class="person-row-button" data-act="person" data-value="${p.id}">${personAvatar(p, 'avatar-small')}<span><strong>${escape(p.name)}</strong><small>${p.age}岁</small></span></button></td><td>${tag(p.title, p.id === 'master' ? 'positive' : 'plain')}</td><td>${escape(p.art)}</td><td class="tabular">${p.power}</td><td><span class="loyalty">${p.loyalty}</span></td><td>${escape(p.job)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">暂无符合条件的弟子。</td></tr>'}</tbody></table>
        </div>
      </section>
      <section class="panel person-detail">
        <div class="person-visual">${scene('title')}${personAvatar(person, 'detail-avatar')}<div class="leader-shade"></div><div class="person-caption">${tag(person.title, 'dark-tag')}<h2>${escape(person.name)}</h2><p>${escape(activeSect().name)} · ${person.age} 岁</p></div></div>
        <dl class="person-stats"><div><dt>气血</dt><dd>${progress(person.health, 'health', '气血')} <b>${person.health}%</b></dd></div><div><dt>忠诚</dt><dd>${progress(person.loyalty, 'morale', '忠诚')} <b>${person.loyalty}</b></dd></div><div><dt>差事</dt><dd>${escape(person.job)}</dd></div><div><dt>所长</dt><dd>${escape(person.art)}</dd></div></dl>
        <div class="detail-actions">${btn('改派差事', 'job', '', 'primary', 'scroll')}${person.id !== 'master' ? btn('晋升', 'promote', '', 'outline') : ''}</div>
      </section>
    </div>`;
}

function mapMarkers() {
  const edges = data.places.flatMap(place => place.roads.filter(other => other > place.id).map(other => [place.at, places[other].at]));
  return `<svg class="map-roads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${edges.map(([a,b]) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`).join('')}</svg>
    ${data.places.map(place => `<button class="map-pin ${place.id === state.place ? 'is-active' : ''} ${place.seat === state.sect ? 'is-home' : ''} ${place.seat ? 'has-sect' : ''}" style="--x:${place.at.x}%;--y:${place.at.y}%" aria-pressed="${place.id === state.place}" data-act="place" data-value="${place.id}"><i></i><span>${escape(place.name)}</span></button>`).join('')}`;
}

function worldScreen() {
  const place = places[state.place];
  const owner = sects[place.seat];
  const adjacent = activePlace().roads.includes(place.id);
  const action = place.id === activePlace().id ? btn('返回山门', 'page', 'seat', 'primary', 'gate')
    : owner ? btn(adjacent ? '商议出兵' : '查看门派', adjacent ? 'march' : 'faction', place.id, 'primary', adjacent ? 'swords' : 'banner')
    : btn(adjacent ? '开设分舵' : '查看据点', adjacent ? 'settle' : 'faction', place.id, 'primary', 'pin');
  return `${screenHead('江湖', '天下舆图', '沿道路查看据点、邻派关系与可行的出兵路线。', btn('门派往来', 'diplomacy', '', 'outline', 'banner') + btn('奇遇样板', 'encounter', '', 'outline', 'scroll'))}
    <div class="world-layout">
      <section class="scene-panel map-panel" aria-label="天下舆图"><div class="scene-viewport"><div class="scene-stage map-stage" style="--zoom:${state.mapZoom}">${scene('world')}${mapMarkers()}</div></div>
        <div class="map-label"><span>大昭疆域</span><small>二十据点</small></div>
        <div class="map-key"><span><i class="legend-home"></i> 本派</span><span><i class="legend-faction"></i> 他派</span><span><i></i> 无主</span></div>
        <div class="scene-zoom map-zoom"><button data-act="mapzoom" data-value="in" aria-label="放大舆图">${icon('plus')}</button><button data-act="mapzoom" data-value="out" aria-label="缩小舆图">${icon('minus')}</button><button data-act="mapzoom" data-value="reset" aria-label="重置舆图">${icon('frame')}</button></div>
      </section>
      <aside class="world-side">
        <section class="panel place-card">${panelTitle(place.name, tag(owner?.name || '无主', owner ? 'positive' : 'plain'))}<p>${escape(place.note)}</p>
          <dl class="facts"><div><dt>地块容量</dt><dd>${place.cells} 格</dd></div><div><dt>相邻据点</dt><dd>${place.roads.length} 处</dd></div><div><dt>与本派</dt><dd>${place.id === activePlace().id ? '本派总舵' : adjacent ? '接壤' : '未接壤'}</dd></div></dl>
          <div class="place-actions">${action}</div>
        </section>
        <section class="panel">${panelTitle('通达据点')}<div class="route-list">${place.roads.map(id => `<button data-act="place" data-value="${id}">${icon('pin')}${escape(places[id].name)}${icon('arrow')}</button>`).join('')}</div></section>
      </aside>
    </div>`;
}

function battleScreen() {
  const friendly = activeSect();
  const enemy = sects.huashan;
  const units = [
    ['leader', friendly.leader.name, 27, 57, true, state.health[0]],
    ['xu', '许照', 18, 65, true, 77],
    ['fak', '悟砚', 32, 74, true, 83],
    ['lu', '陆孤舟', 72, 55, false, state.health[1]],
    ['yun', '云不渡', 83, 62, false, 55],
    ['pei', '裴元', 76, 76, false, 47],
  ];
  const fightSide = (sect, index) => `<div class="army army-${index}">${portrait(sect.id, sect.leader.name, 'army-portrait')}<div><div class="army-name"><b>${escape(sect.name)}</b><span>${index ? '4 / 6' : '5 / 6'}</span></div>${progress(state.health[index], index ? 'enemy' : 'health', `${sect.name}兵力`)}</div></div>`;
  return `${screenHead('战阵', '华山古道之战', '点选敌方单位下令集火，随时可暂停、调速或撤退。', btn('返回江湖', 'page', 'world', 'outline', 'back'))}
    <section class="scene-panel battle-panel" aria-label="战斗场景">
      ${scene('battle')}
      <div class="battle-top">${fightSide(friendly, 0)}<div class="fight-clock"><b>00:${String(state.fightTime).padStart(2,'0')}</b><small>${state.fightPaused ? '已暂停' : '交战中'}</small></div>${fightSide(enemy, 1)}</div>
      ${units.map(([id, name, x, y, friend, health]) => `<button class="unit ${friend ? 'ally' : 'hostile'} ${state.target === id ? 'is-target' : ''}" data-act="focus-unit" data-value="${id}" data-name="${attr(name)}" ${friend ? 'disabled' : ''} style="--x:${x}%;--y:${y}%">${state.target === id ? icon('target') : ''}<span>${escape(name)}</span>${progress(health, friend ? 'health' : 'enemy', '气血')}</button>`).join('')}
      <div class="battle-bottom"><span class="battle-hint">${icon(state.target ? 'target' : 'info')} ${state.target ? `集火：${escape(units.find(([id]) => id === state.target)?.[1])}` : '选中敌人下令集火'}</span>
      <div class="battle-orders">${btn(state.fightPaused ? '继续' : '暂停','fight-pause','','on-dark',state.fightPaused ? 'play' : 'pause')}
        <div class="speeds dark-speeds" role="group" aria-label="战斗速度">${[1,2,4].map(s => `<button data-act="fight-speed" data-value="${s}" class="${s === state.fightSpeed && !state.fightPaused ? 'is-active' : ''}" aria-pressed="${s === state.fightSpeed && !state.fightPaused}">${s}×</button>`).join('')}</div>
        ${btn('速决','resolve','','on-dark')}${btn('撤退','retreat','','danger')}</div></div>
    </section>
    <section class="panel battle-report">${panelTitle('交战记录')}${(state.battleLog.length ? state.battleLog : ['少林弟子以罗汉拳破开对方前阵。','华山派换至侧翼，逼近我方长老。']).map(line => `<p>${icon('swords')}${escape(line)}</p>`).join('')}</section>`;
}

function chronicleScreen() {
  const records = state.chronicle.filter(r => state.logFilter === '全部' || r.type === state.logFilter);
  return `${screenHead('纪事', '门派纪事', '山门、修练和江湖往来的记录。')}
    <section class="panel chronicle-panel">${panelTitle('本旬要事', `<div class="button-group">${['全部','山门','修练','江湖'].map(t => pill(t,'log-filter',t,state.logFilter===t)).join('')}</div>`)}
      <ol class="timeline">${records.map(r => `<li><time>三月${r.day}日</time><div>${tag(r.type, 'plain')}<h3>${escape(r.title)}</h3><p>${escape(r.text)}</p></div></li>`).join('') || '<li><p>暂无记录。</p></li>'}</ol>
    </section>`;
}

function artsScreen() {
  const arts = data.arts.filter(art => state.artTier === '全部' || art.tier === Number(state.artTier));
  const chosen = data.arts.find(art => art.id === state.artSelected) || arts[0];
  return `${screenHead('弟子', '武学名录', '十二类武学，五阶七十二门。', btn('返回弟子', 'page', 'disciples', 'outline', 'back'))}
    <div class="arts-layout"><section class="panel">${panelTitle('藏经阁', `<div class="button-group">${['全部',1,2,3,4,5].map(t => pill(t === '全部' ? t : `${t}阶`, 'art-tier', t, String(state.artTier) === String(t))).join('')}</div>`)}
      <div class="arts-grid">${arts.map(art => `<button class="art-button ${art.id === chosen?.id ? 'is-active' : ''}" data-act="art" data-value="${art.id}">${icon('scroll')}<span>${escape(art.name)}<small>${art.tier}阶</small></span></button>`).join('')}</div></section>
      <section class="panel art-detail">${panelTitle(chosen?.name || '武学')}${chosen ? `<dl class="facts"><div><dt>阶位</dt><dd>${chosen.tier}阶</dd></div><div><dt>归属</dt><dd>${escape(sects[chosen.sect]?.name || '通用')}</dd></div><div><dt>招式</dt><dd>三招</dd></div></dl>${btn('安排修练', 'job', '', 'primary', 'scroll')}` : ''}</section></div>`;
}

function savesScreen() {
  return `${screenHead('存档', '江湖卷宗', '三个手动存档位和一个自动存档。', btn('回到标题','page','title','outline','back'))}
    <section class="save-grid">${['1','2','3','auto'].map(slot => {
      const save = state.saves[slot];
      return `<article class="panel save-card"><div class="save-emblem">${icon('box')}</div><h2>${slot === 'auto' ? '自动存档' : `存档位 ${slot}`}</h2><p>${save ? `${escape(sects[save.sect]?.name)} · 第 ${save.day} 日` : '空卷'}</p><div class="button-group">${slot !== 'auto' ? btn('保存','save',slot,'primary') : ''}<button class="button outline" data-act="load" data-value="${slot}" ${!save ? 'disabled' : ''}>读取</button></div></article>`;
    }).join('')}</section>
    <section class="panel save-options">${panelTitle('存档文件')}<p>导出样板中的当前进度，或导入之前导出的样板文件。</p><div class="button-group">${btn('导出存档', 'export', '', 'outline', 'box')}${btn('导入存档', 'import', '', 'outline', 'plus')}<input type="file" id="import-file" accept="application/json,.json" hidden></div></section>`;
}

const pageViews = { seat: seatScreen, disciples: disciplesScreen, world: worldScreen, battle: battleScreen, chronicle: chronicleScreen, saves: savesScreen, arts: artsScreen };

function render() {
  const standalone = state.page === 'title' ? titleScreen : state.page === 'sects' ? sectScreen : null;
  app.innerHTML = standalone ? standalone() : shell(pageViews[state.page]());
}

function page(name, replace = false) {
  if (![...Object.keys(pageViews), 'title', 'sects'].includes(name)) return;
  state.page = name;
  const url = new URL(location.href);
  url.searchParams.set('view', name);
  history[replace ? 'replaceState' : 'pushState']({ view: name }, '', url);
  render();
  window.scrollTo(0, 0);
}

function toast(message) {
  announcement.textContent = message;
  announcement.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { announcement.hidden = true; }, 3800);
}

function openSheet(title, body, footer = '') {
  dialog.innerHTML = `<article class="sheet-inner"><div class="sheet-title"><h2 id="dialog-title">${escape(title)}</h2><button data-act="close" aria-label="关闭">${icon('close')}</button></div><div class="sheet-body">${body}</div>${footer ? `<div class="sheet-footer">${footer}</div>` : ''}</article>`;
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  if (!dialog.open) dialog.showModal();
}
const closeSheet = () => { if (dialog.open) dialog.close(); };
const itemOption = (value, title) => `<option value="${attr(value)}">${escape(title)}</option>`;
const jobs = ['休息','修练武学','巡察山道','采集木材','采集药材','铸造','炼丹','行侠仗义'];
const field = (label, id, value, type = 'number') => `<label class="form-row"><span>${escape(label)}</span><input id="${id}" type="${type}" value="${attr(value)}"></label>`;
const storageKey = 'wulin-art-preview-v1';
const persist = () => {
  try { localStorage.setItem(storageKey, JSON.stringify(state.saves)); } catch { /* file preview may disable storage */ }
};
const snapshot = () => structuredClone(Object.fromEntries(['sect','day','silver','grain','renown','virtue','buildings','people','succession'].map(key => [key, state[key]])));
const restore = save => {
  if (!save || !sects[save.sect] || !Array.isArray(save.people)) return false;
  for (const key of Object.keys(snapshot())) if (key in save) state[key] = structuredClone(save[key]);
  state.place = activeSect().seat;
  state.currentPerson = 'master';
  state.batch.clear();
  state.building = 'hall';
  return true;
};

function showEditor() {
  openSheet('数据修改器', `<div class="editor-grid">
    <section><h3>门派</h3>${field('银两','ed-silver',state.silver)}${field('粮草','ed-grain',state.grain)}${field('威望','ed-renown',state.renown)}${field('正邪','ed-virtue',state.virtue)}</section>
    <section><h3>角色</h3>${field('姓名','ed-name',currentPerson().name,'text')}${field('战力','ed-power',currentPerson().power)}${field('忠诚','ed-loyalty',currentPerson().loyalty)}</section>
    <section><h3>物品</h3><label class="form-row"><span>物品</span><select><option>回气丹</option><option>精钢剑</option><option>布衣</option></select></label>${field('数量','ed-item',3)}</section>
  </div>`, `${btn('关闭', 'close', '', 'outline')}${btn('应用预览', 'edit-apply', '', 'primary')}`);
}

function dispatch(action, value, target) {
  switch (action) {
    case 'page': return page(value);
    case 'choose-sect': state.chosenSect = value; break;
    case 'start': {
      const sect = sects[value];
      state.sect = value;
      state.place = sect.seat;
      state.people[0] = { ...state.people[0], name: sect.leader.name, age: sect.leader.age, sect: sect.id };
      state.currentPerson = 'master';
      return page('seat');
    }
    case 'building': state.building = value; break;
    case 'scene-labels': state.sceneView = state.sceneView === 'clean' ? 'all' : 'clean'; break;
    case 'zoom': case 'mapzoom': {
      const key = action === 'zoom' ? 'zoom' : 'mapZoom';
      state[key] = value === 'reset' ? 1 : Math.max(1, Math.min(1.65, state[key] + (value === 'in' ? .15 : -.15)));
      break;
    }
    case 'speed': state.speed = Number(value); if (state.speed) state.day += 1; break;
    case 'fight-speed': state.fightSpeed = Number(value); state.fightPaused = false; break;
    case 'fight-pause': state.fightPaused = !state.fightPaused; break;
    case 'focus-unit': {
      state.target = state.target === value ? '' : value;
      if (state.target) state.battleLog.unshift(`已下令集火：${target.dataset.name}`);
      break;
    }
    case 'rank': state.rank = value; break;
    case 'person': state.currentPerson = value; break;
    case 'place': state.place = value; break;
    case 'log-filter': state.logFilter = value; break;
    case 'art-tier': state.artTier = value; state.artSelected = ''; break;
    case 'art': state.artSelected = value; break;
    case 'recruit': return openSheet('招贤榜 · 林见山', `<div class="applicant"><span class="person-monogram">林</span><div><h3>林见山</h3><p>临安人士 · 22 岁 · 刀剑资质 78</p></div></div><p>行旅临安与嵩山之间，惯用短刀。愿在门中从外门做起。</p>`, `${btn('暂不收录','close','','outline')}${btn('收录弟子','recruit-confirm','','primary')}`);
    case 'recruit-confirm':
      if (!state.people.some(person => person.id === 'linjianshan')) state.people.push({id:'linjianshan',name:'林见山',title:'外门弟子',age:22,job:'休息',power:194,loyalty:70,sect:state.sect,art:'基础刀法',health:100});
      closeSheet(); toast('已收录林见山。'); break;
    case 'build': return openSheet('兴建建筑', `<label class="form-row"><span>建筑</span><select id="build-type">${Object.entries(data.buildings).map(([id, item]) => itemOption(id, `${item.name} · ${item.cost}两 · ${item.cells}格`)).join('')}</select></label><p class="caption">可建地以所选据点容量为准。</p>`, `${btn('取消','close','','outline')}${btn('兴建','build-confirm','','primary')}`);
    case 'build-confirm': {
      const kind = $('#build-type').value;
      if (state.buildings[kind]) return toast('该建筑已经兴建，可在建筑管理中升级。');
      const cost = data.buildings[kind].cost;
      if (cost > state.silver) return toast('银两不足。');
      state.silver -= cost; state.building = kind; state.buildings[kind] = 1;
      closeSheet(); toast(`${data.buildings[kind].name}已建成。`); break;
    }
    case 'upgrade': {
      const building = data.buildings[state.building];
      const cost = building.cost * (state.buildings[state.building] + 1);
      if (cost > state.silver) return toast(`升级需 ${coin(cost)} 两，当前银两不足。`);
      state.silver -= cost; state.buildings[state.building] += 1; toast(`${building.name}已升至 ${state.buildings[state.building]} 级。`); break;
    }
    case 'batch-clear': state.batch.clear(); break;
    case 'batch-job': return openSheet('批量改派差事', `<p>将为所选 ${state.batch.size} 名弟子统一安排差事。</p><label class="form-row"><span>差事</span><select id="batch-job-select">${jobs.map(j => itemOption(j,j)).join('')}</select></label>`, `${btn('取消','close','','outline')}${btn('确认改派','batch-confirm','','primary')}`);
    case 'batch-confirm': {
      const job = $('#batch-job-select').value;
      state.people.filter(person => state.batch.has(person.id)).forEach(person => { person.job = job; });
      closeSheet(); toast(`已为 ${state.batch.size} 名弟子改派差事。`); state.batch.clear(); break;
    }
    case 'job': return openSheet('改派差事', `<label class="form-row"><span>${escape(currentPerson().name)}</span><select id="job-select">${jobs.map(j => itemOption(j, j)).join('')}</select></label>`, `${btn('取消','close','','outline')}${btn('确认差事','job-confirm','','primary')}`);
    case 'job-confirm': currentPerson().job = $('#job-select').value; closeSheet(); toast('已改派差事。'); break;
    case 'promote': currentPerson().title = '内门弟子'; toast('已调整弟子身份。'); break;
    case 'encounter': {
      const id = 'wanderer-river-cartographer';
      const guest = manifest.portraits[id];
      const name = guest?.name || '宋折汐';
      const art = guest?.full || guest?.src || 'assets/portraits/wanderer-river-cartographer/full.webp';
      return openSheet('江湖奇遇 · 夜渡寻图', `<div class="encounter"><div class="encounter-portrait"><img src="${assetUrl(art)}" alt="${attr(name)}"></div><div>${tag('江湖奇人', 'positive')}<h3>${escape(name)}</h3><p>走了半生水路，倒让一场春汛抹去了渡口。若你愿替我访一访老船户，旧图还可再添一笔。</p></div></div>`, `${btn('辞别','close','','outline')}${btn('应下寻图','encounter-confirm','','primary')}`);
    }
    case 'encounter-confirm': closeSheet(); toast('已记下夜渡寻图。'); return;
    case 'diplomacy': return openSheet('门派往来', `<div class="diplomacy-list">${data.sects.filter(s => s.id !== state.sect).map(s => `<div>${portrait(s.id,s.leader.name,'avatar-small')}<strong>${escape(s.name)}</strong>${tag(['邪','中立','正'][s.standing+1], 'plain')}${btn('馈赠 500 两','gift',s.id,'outline')}</div>`).join('')}</div>`, btn('关闭','close','','outline'));
    case 'gift':
      if (state.silver < 500) return toast('银两不足。');
      state.silver -= 500; toast(`已向${sects[value].name}馈赠。`); render(); return;
    case 'faction': return openSheet(places[value].name, `<p>${escape(places[value].note)}</p><p>通往${escape(places[value].roads.map(id => places[id].name).join('、'))}。</p>`, btn('返回','close','','outline'));
    case 'march': return openSheet('商议出兵', `<p>从${escape(activePlace().name)}出发，进攻${escape(places[value].name)}。</p><p>样板展示战斗视图、集火、调速和战报。</p>`, `${btn('取消','close','','outline')}${btn('进入战阵','march-confirm','','primary','swords')}`);
    case 'march-confirm': closeSheet(); return page('battle');
    case 'settle': return openSheet('开设分舵', `<p>在${escape(places[value].name)}设立分舵需 1,500 两。</p>`, `${btn('取消','close','','outline')}${btn('确认开设','settle-confirm',value,'primary')}`);
    case 'settle-confirm':
      if (state.silver < 1500) return toast('银两不足。');
      state.silver -= 1500; closeSheet(); toast(`已在${places[value].name}开设分舵。`); break;
    case 'resolve': state.fightPaused = true; return openSheet('战报 · 华山古道', `<p class="battle-result">此战告捷</p><dl class="facts"><div><dt>我方存留</dt><dd>5 人</dd></div><div><dt>获得威望</dt><dd>+12</dd></div></dl>`, btn('返回江湖','result-close','','primary','arrow'));
    case 'retreat': return openSheet('确认撤退', '<p>撤退后结算本次交战，剩余弟子返回山门。</p>', `${btn('继续作战','close','','outline')}${btn('确认撤退','result-close','','danger')}`);
    case 'result-close': closeSheet(); return page('world');
    case 'save':
      state.saves[value] = snapshot(); persist(); toast(`已保存到存档位 ${value}。`); break;
    case 'load':
      if (!restore(state.saves[value])) return toast('此卷无可用存档。');
      toast('已读取存档。'); return page('seat');
    case 'export': {
      const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot(), null, 2)], { type:'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'wulin-ui-preview.json'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000); return;
    }
    case 'import': return $('#import-file')?.click();
    case 'settings': return openSheet('游戏设置', `<label class="form-row"><span>画质</span><select id="quality">${['自动','高','中','低（省电）'].map(q => `<option ${q === state.quality ? 'selected' : ''}>${q}</option>`).join('')}</select></label><p>连按两次 F8，或连续点击日期五次，可打开修改器。</p>`, `${btn('修改器样板','editor','','outline')}${btn('完成','close','','primary')}`);
    case 'editor': return showEditor();
    case 'date':
      dispatch.dateClicks = (dispatch.dateClicks || 0) + 1;
      clearTimeout(dispatch.dateTimer);
      dispatch.dateTimer = setTimeout(() => { dispatch.dateClicks = 0; }, 2000);
      if (dispatch.dateClicks >= 5) { dispatch.dateClicks = 0; return showEditor(); }
      return;
    case 'edit-apply': {
      for (const key of ['silver','grain','renown','virtue']) state[key] = Number($(`#ed-${key}`).value);
      Object.assign(currentPerson(), { name: $('#ed-name').value, power: Number($('#ed-power').value), loyalty: Number($('#ed-loyalty').value) });
      closeSheet(); toast('已应用样板数值。'); break;
    }
    case 'close': return closeSheet();
    default: return;
  }
  render();
}

document.addEventListener('click', event => {
  const target = event.target.closest('button[data-act]');
  if (target && !target.disabled) dispatch(target.dataset.act, target.dataset.value, target);
});
document.addEventListener('input', event => {
  if (event.target.id !== 'search-person') return;
  const search = event.target;
  const caret = search.value.length;
  state.search = search.value;
  render();
  const next = $('#search-person');
  next.focus();
  if (caret !== null) try { next.setSelectionRange(caret, caret); } catch { /* search fields may restrict selection */ }
});
document.addEventListener('change', async event => {
  const target = event.target;
  if (target.dataset.batchPerson) {
    if (target.checked) state.batch.add(target.dataset.batchPerson); else state.batch.delete(target.dataset.batchPerson);
    render();
    return;
  }
  if (target.id === 'batch-all') {
    for (const checkbox of document.querySelectorAll('[data-batch-person]:not(:disabled)')) {
      if (target.checked) state.batch.add(checkbox.dataset.batchPerson); else state.batch.delete(checkbox.dataset.batchPerson);
    }
    render();
    return;
  }
  if (target.id === 'succession') state.succession = target.checked;
  if (target.id === 'quality') state.quality = target.value;
  if (target.id !== 'import-file' || !target.files[0]) return;
  try {
    const save = JSON.parse(await target.files[0].text());
    if (!restore(save)) throw new Error('invalid');
    toast('已导入样板存档。'); page('seat');
  } catch { toast('此文件无法作为样板存档读取。'); }
});
document.addEventListener('keydown', event => {
  if (event.key === 'F8') {
    event.preventDefault();
    const now = performance.now();
    if (now - (dispatch.editorTime || -2000) < 1000) showEditor();
    dispatch.editorTime = now;
  }
  if (event.code === 'Space' && state.page === 'battle' && event.target === document.body && !dialog.open) {
    event.preventDefault();
    dispatch('fight-pause');
  }
});
window.addEventListener('popstate', () => { state.page = pageFromUrl(); render(); });
try { state.saves = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { /* preview storage unavailable */ }
state.saves.auto ??= snapshot();
render();
fetch(new URL('manifest.json', base))
  .then(response => response.ok ? response.json() : null)
  .then(value => { if (value) { manifest = { ...manifest, ...value }; render(); } })
  .catch(() => { /* conventional local asset paths still work */ });
