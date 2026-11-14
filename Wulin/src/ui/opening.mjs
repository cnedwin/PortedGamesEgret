import { CLASSES } from '../data/arts.mjs';
import { DIFFICULTIES, SCENARIOS } from '../data/extras.mjs';
import { PLACE_BY_ID } from '../data/places.mjs';
import { SECT_BY_ID, SECTS } from '../data/sects.mjs';
import { btn, esc, icon } from './kit.mjs';

export const prologue = [
  { scene: 'decree', speaker: '传令官', portrait: 'prologue-courier', chapter: '禁武令', line: '承和元年，城门未开，官军已封了演武场。铁匠交刀，武师交名册。明日日出前，未交兵刃的山门，一并查封。' },
  { scene: 'gate-night', speaker: '山门信使', portrait: 'prologue-messenger', chapter: '山河未静', line: '山下的渡口封了。我绕了两座山，才把这封信送上来。各派都在问，明日官兵上山，还有谁肯替门中的弟子开门？' },
  { scene: 'seal', speaker: '守印长老', portrait: 'prologue-elder', chapter: '山门待启', line: '这枚印，盖过拜师帖，也盖过送行帖。你若接下，山门里每一个人都要有个去处。若要另立门户，天亮后，便让江湖记住你的旗号。' },
];

const legacyRules = [
  { enabled: false, title: '一代宗师', text: '人物年龄照常增长，年迈不会导致离世。', glyph: 'gate' },
  { enabled: true, title: '世代传承', text: '年迈的门人可能离世，掌门离世后由门中后继者继任。', glyph: 'scroll' },
];

function openingScene(scene, sceneStyle, content, kind = '') {
  return `<main class="opening-stage ${kind}" style="${sceneStyle(scene)}">
    <div class="opening-painting" aria-hidden="true"></div>
    ${content}
  </main>`;
}

export function prologueScreen(index, sceneStyle, portrait) {
  const chapter = prologue[index];
  const last = index === prologue.length - 1;
  return openingScene(chapter.scene, sceneStyle, `<nav class="opening-nav" aria-label="序章操作">
    ${btn('返回标题', 'page', { page: 'title' }, 'on-dark', 'back')}
    ${btn('跳过序章', 'skip-prologue', {}, 'on-dark')}
  </nav>
  <section class="opening-story">
    ${portrait({ portraitId: chapter.portrait, name: chapter.speaker }, 'opening-story-portrait', 'bust')}
    <div class="opening-story-copy">
      <p class="opening-caption">大昭 · 承和元年</p>
      <h1 tabindex="-1">${chapter.chapter}</h1>
      <p class="opening-speaker">${chapter.speaker}</p>
      <p class="opening-line">${chapter.line}</p>
    </div>
    <div class="opening-actions">
      <span class="opening-story-steps" aria-label="第 ${index + 1} 幕，共 ${prologue.length} 幕">${prologue.map((_, i) => `<i class="${i === index ? 'is-current' : ''}"></i>`).join('')}</span>
      ${btn(last ? '踏入江湖' : '继续', 'prologue-next', {}, 'gold-button', 'arrow')}
    </div>
  </section>`, 'opening-cinematic');
}

function choice(act, data, selected, title, detail, decoration = '') {
  return `<button type="button" class="opening-choice" data-act="${act}" ${data} aria-pressed="${selected}">
    ${decoration}<span><b>${esc(title)}</b><small>${esc(detail)}</small></span>
  </button>`;
}

export function sectScreen(ui, sceneStyle, portrait, avatar) {
  const sect = SECT_BY_ID[ui.chosen];
  const seat = PLACE_BY_ID[sect.seat];
  const own = ui.founding;
  const accent = CSS.supports('color', sect.color) ? esc(sect.color) : '#bca272';
  return openingScene('world', sceneStyle, `<nav class="opening-nav" aria-label="开局操作">
    ${btn('返回序章', 'page', { page: 'prologue' }, 'on-dark', 'back')}
  </nav>
  <div class="opening-layout">
    <section class="opening-faction">
      <header class="opening-heading"><p class="opening-caption">门派 · 一</p><h1 tabindex="-1">立足江湖</h1></header>
      <div class="opening-paths" role="group" aria-label="选择来历">
        ${choice('choose-founding', 'data-own="false"', !own, '接掌门派', '承接一派武学与山门', icon('gate'))}
        ${choice('choose-founding', 'data-own="true"', own, '自立门户', '亲定门派与掌门名号', icon('banner'))}
      </div>
      ${own ? `<div class="opening-found">
        <label>门派名号<input id="own-name" maxlength="6" required value="${esc(ui.ownName)}" autocomplete="off"></label>
        <label>掌门姓名<input id="own-leader" maxlength="6" required value="${esc(ui.ownLeader)}" autocomplete="off"></label>
      </div><p class="opening-caption opening-seats-label">择一处山门作为起点</p>` : ''}
      <div class="opening-sect-grid" data-region="sect-grid" role="group" aria-label="${own ? '立派地点' : '江湖门派'}">
        ${SECTS.map((s) => choice('choose-sect', `data-sect="${s.id}"`, s.id === sect.id,
          own ? PLACE_BY_ID[s.seat].name : s.name, own ? CLASSES[s.main].name : PLACE_BY_ID[s.seat].name,
          own ? icon('pin') : portrait(s, 'opening-thumb'))).join('')}
      </div>
    </section>
    <section data-region="sect-feature" class="opening-feature">
      <div class="opening-feature-inner" style="--sect-color:${accent}">
        ${own ? avatar({ portraitId: 'founder-male', name: '开山掌门' }, 'opening-hero', 'full') : portrait(sect, 'opening-hero', 'full')}
        <div class="opening-feature-copy">
          <p class="opening-caption">${esc(seat.name)} · ${own ? '立派之地' : '总舵'}</p>
          <h2>${esc(own ? seat.name : sect.name)}</h2>
          ${own ? `<p>以此地的山门和武学为基础，另立门派。</p>` : `<p>掌门 · ${esc(sect.leader.name)}（${sect.leader.age} 岁）</p>`}
          <p>${esc(sect.role)} · 主修${esc(CLASSES[sect.main].name)}，兼修${esc(CLASSES[sect.second].name)}</p>
        </div>
      </div>
    </section>
  </div>
  <div class="opening-footer">${btn('定下传承', 'sect-next', {}, 'gold-button', 'arrow')}</div>`);
}

function options(rows, selected) {
  return rows.map(([value, label]) => `<option value="${esc(value)}"${String(value) === String(selected) ? ' selected' : ''}>${esc(label)}</option>`).join('');
}

export function legacyScreen(ui, sceneStyle) {
  const sect = SECT_BY_ID[ui.chosen];
  const identity = ui.founding ? ui.ownName.trim() : sect.name;
  const master = ui.founding ? ui.ownLeader.trim() : sect.leader.name;
  return openingScene('seat', sceneStyle, `<nav class="opening-nav" aria-label="开局操作">
    ${btn('重择门派', 'sect-back', {}, 'on-dark', 'back')}
  </nav>
  <section class="opening-legacy">
    <header class="opening-heading">
      <p class="opening-caption">传承 · 二</p>
      <h1 tabindex="-1">山门传承</h1>
      <p class="opening-identity">${esc(identity)} · ${esc(master)} · ${esc(PLACE_BY_ID[sect.seat].name)}</p>
    </header>
    <div class="opening-rules" data-region="legacy-rules" role="group" aria-label="世代更替">
      ${legacyRules.map((rule) => choice('succession', `data-enabled="${rule.enabled}"`, ui.succession === rule.enabled,
        rule.title, rule.text, icon(rule.glyph))).join('')}
    </div>
    <details class="opening-conditions">
      <summary>天下局势与对手</summary>
      <label>开局局势<select data-change="scenario">${options(Object.entries(SCENARIOS).map(([id, sc]) => [id, sc.name]), ui.scenario)}</select></label>
      <label>对手强弱<select data-change="difficulty">${options(DIFFICULTIES.map((d, i) => [i, d.name]), ui.difficulty)}</select></label>
      <div data-region="condition-details" class="opening-condition-details">
        <p>${esc(SCENARIOS[ui.scenario].does)}</p><p>开局 ${DIFFICULTIES[ui.difficulty].peace} 年无人来犯。</p>
      </div>
    </details>
    <div class="opening-actions">${btn(ui.founding ? '开山立派' : '入主山门', 'new', {}, 'gold-button', 'arrow')}</div>
  </section>`);
}
