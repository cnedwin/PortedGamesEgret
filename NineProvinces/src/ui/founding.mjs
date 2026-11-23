import { BANNER_COLOURS, customFactionOptions } from '../sim/custom-faction.mjs';
import { nm, t } from '../i18n.mjs';
import { factionName } from '../view/names.mjs';
import { h, face, button } from './dom.mjs';
import { pair } from './text.mjs';

export const foundingSubmission = config => ({ ...config, companions: config.companions.filter(Boolean) });

export function freshFounding() {
  return { zh: '新义军', en: '', flag: '义', colour: BANNER_COLOURS[0], town: '', ruler: '', companions: [], search: '' };
}

/** Refresh eligibility after a year/roster change without silently taking a ruler. */
export function reconcileFounding(state, roster, config) {
  const options = customFactionOptions(state, roster);
  const available = new Set(options.officers.map(g => g.ref));
  if (!options.towns.some(n => n.id === config.town)) config.town = options.towns[0]?.id ?? '';
  if (!available.has(config.ruler)) config.ruler = options.officers.find(g => g.source === 'roster')?.ref
    ?? (available.has('history:zhaoyun') ? 'history:zhaoyun' : options.officers[0]?.ref ?? '');
  config.companions = config.companions.map(ref => available.has(ref) && ref !== config.ruler ? ref : '');
  return options;
}

const validationWords = {
  name: ['势力名称须为1–12字，英文名最多48字符。', 'Use a name of 1–12 characters and an English name of at most 48.'],
  flag: ['请填写一个旗号字。', 'Use one banner character.'],
  colour: ['请选择旗帜颜色。', 'Choose a banner colour.'],
  town: ['请选择本年代提供的起家城。', 'Choose a founding town available in this era.'],
  ruler: ['主公须已成年、在世，且不是其他势力的现任君主。', 'The ruler must be living, of age and not already ruling another faction.'],
  companions: ['同行最多三人，不能重复或与主公相同。', 'Choose up to three distinct companions, excluding the ruler.']
};
export const foundingErrorText = errors => errors.map(key => pair(validationWords[key] ?? validationWords.ruler)).join(' ');

export function foundingFields(app, state, roster, config, change, register) {
  const options = customFactionOptions(state, roster);
  const selected = options.officers.find(g => g.ref === config.ruler);
  const field = (label, control) => h('label.foundingField', h('span', label), control);
  const input = (name, value, limit, action) => h('input', {
    name, value, maxLength: limit, autocomplete: 'off', dataset: { setupKey: name },
    oninput: ({ target }) => { action(target.value); change(false); }
  });
  const choose = (name, entries, value, action) => {
    const select = h('select', { name, dataset: { setupKey: name }, onchange: ({ target }) => { action(target.value); change(true); } },
      entries.map(([key, label]) => h('option', { value: key }, label)));
    select.value = value;
    return select;
  };
  const labelOfficer = g => nm(g) + ' · ' + g.age + ' · ' + (g.source === 'roster'
    ? pair(['名册人物', 'Registered']) : g.formerFaction ? factionName(state, g.formerFaction) : pair(['在野', 'Unattached']));
  const townEntries = options.towns.map(n => [n.id, nm(n) + (n.recommended ? pair(['（推荐起点）', ' (recommended)']) : '') + ' · ' + (n.formerOwner
    ? pair(['架空据点，原属', 'Alternate site, formerly ']) + factionName(state, n.formerOwner) : pair(['无主城', 'Vacant town']))]);
  const root = h('section.foundingFields',
    h('p.note', pair(['从一座空城起家。可用登录人物或历史人物为主公，携最多三位同行；本局采用自由推演，不补播历史演义。', 'Found a new banner in one town. Lead with a registered or historical officer and up to three companions. This is a free campaign without scripted historical events.'])),
    h('div.foundingIdentity',
      field(pair(['势力名称', 'Faction name']), input('founding-name', config.zh, 12, value => config.zh = value)),
      field(pair(['英文名称（可留空）', 'English name (optional)']), input('founding-english', config.en, 48, value => config.en = value)),
      field(pair(['旗号字', 'Banner character']), input('founding-flag', config.flag, 2, value => config.flag = value))
    ),
    h('div.foundingColours', { role: 'group', 'aria-label': pair(['旗帜颜色', 'Banner colour']) },
      BANNER_COLOURS.map((colour, i) => h('button.foundingColour', {
        type: 'button', 'aria-label': pair(['旗色 ', 'Banner colour ']) + (i + 1), 'aria-pressed': config.colour === colour ? 'true' : 'false',
        style: { '--banner-colour': '#' + colour.toString(16).padStart(6, '0') },
        onclick: () => { config.colour = colour; change(true); }
      }, config.colour === colour ? '✓' : ''))),
    field(pair(['起家城', 'Founding town']), choose('founding-town', townEntries, config.town, value => config.town = value)),
    options.alternateHistory ? h('p.foundingFork', pair(['本年代没有原生空城。仅最终选中的非首府边城会在架空分支中转为中立：原守军与驻将撤回原首府，其他候选城不变。与原领主停战540日，可按正常外交规则到期或毁约，其他敌人不受限制。', 'This era has no vacant city. Only your chosen non-capital border town becomes neutral: its former garrison and officers return to their capital. A 540-day withdrawal truce with that power follows normal expiry and treaty-breaking rules; third powers remain unrestricted.'])) : null,
    h('h4', pair(['选择主公', 'Choose the ruler'])),
    h('p.dim.small', pair(['列表按本年代筛选：未成年、已故、现任君主与不在场人物不参与。离开原势力的武将和宝物只转移一次，不会复制。', 'The list excludes the underage, deceased, active rulers and unavailable officers. Leaving officers and their equipment transfer once, without duplication.'])),
    field(pair(['搜索主公与同行姓名', 'Find a ruler or companion by name']), h('input', {
      name: 'founding-search', type: 'search', value: config.search ?? '', autocomplete: 'off',
      placeholder: pair(['输入中文名、英文名或拼音', 'Chinese name, English name or pinyin']),
      oninput: ({ target }) => { config.search = target.value; updateFilter(); }
    })),
    h('p.foundingSearchCount', { role: 'status' }),
    field(pair(['主公', 'Ruler']), choose('founding-ruler', options.officers.map(g => [g.ref, labelOfficer(g)]), config.ruler, value => {
      config.ruler = value;
      config.companions = config.companions.map(ref => ref === value ? '' : ref);
    })),
    selected ? h('div.foundingRuler', selected.source === 'history' ? face(selected.id, 96) : h('img.face', {
      src: new URL(`../../assets/portraits/panel/type-${selected.portrait}.webp`, import.meta.url).href, alt: nm(selected), width: 96, height: 128, draggable: false
    }), h('div', h('b', nm(selected)), h('p', labelOfficer(selected)), h('p.small', ['lead', 'war', 'int', 'pol', 'cha'].map(key => t(key) + ' ' + selected.stats[key]).join(' · ')))) : null,
    button(pair(['登录／管理新武将', 'Register / manage officers']), register),
    h('h4', pair(['携带同行（最多三人）', 'Companions (up to three)'])),
    h('div.foundingCompanions', Array.from({ length: 3 }, (_, i) => {
      const taken = new Set(config.companions.filter((ref, index) => index !== i));
      const entries = [['', pair(['不携带', 'None'])], ...options.officers.filter(g => g.ref !== config.ruler && !taken.has(g.ref)).map(g => [g.ref, labelOfficer(g)])];
      return field(pair(['同行 ', 'Companion ']) + (i + 1), choose('founding-companion-' + i, entries, config.companions[i] ?? '', value => config.companions[i] = value));
    })),
    h('p.note', pair(['起家提供6000以上守军、6500钱和初始粮秣。离任人员会退出原任职，与原势力略有嫌隙；开局宽限规则保持一致。', 'Start with at least 6,000 troops, 6,500 coin and grain. Departing officers leave their former posts, mildly straining relations. The normal starting grace applies.']))
  );
  function updateFilter() {
    const query = (config.search ?? '').trim().toLocaleLowerCase();
    const matches = g => !query || [g.zh, g.en, g.id].some(value => String(value).toLocaleLowerCase().includes(query));
    const controls = [root.querySelector('[name="founding-ruler"]'), ...Array.from({ length: 3 }, (_, i) => root.querySelector('[name="founding-companion-' + i + '"]'))];
    controls.forEach((select, index) => {
      const current = index === 0 ? config.ruler : config.companions[index - 1] ?? '';
      const taken = new Set(index === 0 ? [] : [config.ruler, ...config.companions.filter((_, i) => i !== index - 1)]);
      const rows = options.officers.filter(g => !taken.has(g.ref) && (g.ref === current || matches(g)));
      select.replaceChildren(...(index === 0 ? [] : [h('option', { value: '' }, pair(['不携带', 'None']))]), ...rows.map(g => h('option', { value: g.ref }, labelOfficer(g))));
      select.value = current;
    });
    const count = options.officers.filter(matches).length;
    root.querySelector('.foundingSearchCount').textContent = pair(['匹配 ', 'Matches: ']) + count + pair([' 人；当前选择始终保留。', ' officers. Current selections stay available.']);
  }
  updateFilter();
  return root;
}
