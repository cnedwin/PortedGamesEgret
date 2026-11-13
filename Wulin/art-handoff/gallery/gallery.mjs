import { artUrl, loadArt } from '../assets.mjs';

const manifest = await loadArt();
const roleLabels = { all: '全部', ...manifest.roles };
const portraits = Object.entries(manifest.portraits).map(([id, row]) => ({ id, ...row, affiliation: manifest.sects[row.sect]?.name ?? '江湖' }));
const moods = { full: '全身', bust: '半身', happy: '欣然', determined: '坚定', worried: '忧虑' };
const byId = id => document.getElementById(id);
const tabs = byId('roles');
const search = byId('search');
const cards = byId('cards');
const dialog = byId('portrait-dialog');
const content = byId('dialog-content');
let active = 'all';

function node(tag, { className, text, attrs } = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  for (const [key, value] of Object.entries(attrs ?? {})) el.setAttribute(key, value);
  return el;
}
function label(row) {
  if (row.role === 'wanderer') return roleLabels.wanderer;
  return row.affiliation + ' · ' + roleLabels[row.role];
}
function portraitUrl(row, version) {
  return artUrl(row.expressions[version] ?? row[version]);
}
function show(row) {
  const wrap = node('section', { className: 'detail' });
  wrap.style.setProperty('--sect', manifest.sects[row.sect]?.color ?? '#9b8c72');
  const art = node('div', { className: 'detail-art' });
  const picture = node('img', { attrs: { alt: row.name + '全身立绘' } });
  const copy = node('div', { className: 'detail-copy' });
  const tag = node('small', { text: label(row) });
  const heading = node('h2', { text: row.name });
  const path = node('small', { text: row.id });
  const buttons = node('div', { className: 'moods', attrs: { role: 'group', 'aria-label': '切换立绘' } });
  const link = node('a', { className: 'file-link', text: '打开 WebP 文件', attrs: { target: '_blank', rel: 'noopener' } });
  const pick = key => {
    const url = portraitUrl(row, key);
    picture.src = url;
    picture.alt = row.name + ' · ' + moods[key];
    link.href = url;
    for (const button of buttons.children) button.setAttribute('aria-pressed', String(button.dataset.key === key));
  };
  for (const key of ['full', 'bust', ...Object.keys(row.expressions)]) {
    const button = node('button', { text: moods[key] ?? key, attrs: { type: 'button', 'data-key': key } });
    button.addEventListener('click', () => pick(key));
    buttons.append(button);
  }
  art.append(picture);
  copy.append(tag, heading, path, buttons, link);
  wrap.append(art, copy);
  content.replaceChildren(wrap);
  pick('full');
  dialog.showModal();
}
function render() {
  const term = search.value.trim().toLowerCase();
  const selected = portraits.filter(row => (active === 'all' || row.role === active) &&
    [row.name, row.affiliation, row.id].some(value => value.toLowerCase().includes(term)));
  byId('status').textContent = selected.length + ' 位角色';
  cards.replaceChildren(...selected.map(row => {
    const button = node('button', { className: 'card', attrs: { type: 'button' } });
    button.style.setProperty('--sect', manifest.sects[row.sect]?.color ?? '#9b8c72');
    const art = node('div', { className: 'art' });
    art.append(node('img', { attrs: { src: portraitUrl(row, 'bust'), alt: '', loading: 'lazy', width: '448', height: '512' } }));
    const info = node('div', { className: 'card-text' });
    info.append(node('strong', { text: row.name }), node('small', { text: label(row) }));
    button.append(art, info);
    button.addEventListener('click', () => show(row));
    return button;
  }));
  if (!selected.length) cards.append(node('p', { text: '没有找到符合条件的角色。' }));
}
for (const [key, title] of Object.entries(roleLabels)) {
  const button = node('button', { text: title, attrs: { type: 'button', 'aria-pressed': String(key === active) } });
  button.addEventListener('click', () => {
    active = key;
    for (const item of tabs.children) item.setAttribute('aria-pressed', String(item === button));
    render();
  });
  tabs.append(button);
}
for (const id of ['full-count','bust-count']) byId(id).textContent = portraits.length;
byId('expression-count').textContent = portraits.reduce((sum, row) => sum + Object.keys(row.expressions).length, 0);
search.addEventListener('input', render);
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
render();
