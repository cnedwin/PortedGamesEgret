const byId = id => document.getElementById(id);
const toolbar = byId('toolbar');
const workspace = byId('workspace');
const gamePanel = byId('game-panel');
const sortList = byId('sort-list');
const signIn = byId('sign-in');
const notice = byId('notice');
const workspaceError = byId('workspace-error');
const publishDialog = byId('publish-dialog');
const imagePixelLimit = 1600;
const imageByteLimit = 1024 * 1024;
const pending = new Map();
const cards = new Map();
let state = null;
let recoveryRevision = null;
let games = [];
let busy = '';
let encodingCount = 0;
let drag = null;
const usesGitHub = () => state?.authMode === 'github';

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(label, className, onClick, accessibleName) {
  const node = element('button', className, label);
  node.type = 'button';
  if (accessibleName) node.setAttribute('aria-label', accessibleName);
  if (onClick) node.addEventListener('click', onClick);
  return node;
}

async function request(path, method = 'GET', body) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && path !== '/api/login') headers['X-CSRF-Token'] = state.csrf;
  const response = await fetch(path, {
    method, headers, credentials: 'same-origin', cache: 'no-store',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return {};
  const value = await response.json().catch(() => null);
  if (!response.ok || value === null) {
    const error = new Error(value?.error || ('请求失败（' + response.status + '）'));
    error.status = response.status;
    error.authMode = value?.authMode;
    throw error;
  }
  return value;
}

function message(node, text) {
  node.textContent = text;
  node.hidden = !text;
}

function announce(text, url) {
  message(notice, text);
  if (!url) return;
  const link = safeURL(url);
  if (!link) return;
  const anchor = element('a', '', '查看提交');
  anchor.href = link;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  notice.append(' ', anchor);
}

function safeURL(value, httpsOnly = false) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = httpsOnly ? new URL(value) : new URL(value, location.origin);
    return !url.username && !url.password &&
      (url.protocol === 'https:' || (!httpsOnly && url.protocol === 'http:')) ? url : null;
  } catch {
    return null;
  }
}

function hasLocalChanges() {
  return pending.size > 0 || games.some((game, index) => {
    const saved = state.games[index];
    return game.id !== saved.id || game.summary.zh !== saved.summary.zh || game.summary.en !== saved.summary.en;
  });
}

function updateStatus() {
  if (!state) return;
  const changed = hasLocalChanges();
  const locked = Boolean(busy || encodingCount);
  const editingLocked = locked || Boolean(state.review) || recoveryRevision !== null;
  const nextStep = usesGitHub() ? '提交审核' : '发布';
  const draftStatus = byId('draft-state');
  draftStatus.dataset.state = changed || state.dirty || state.review ? 'changes' : 'clean';
  const label = busy || (encodingCount ? '正在处理截图…'
    : state.review ? '草稿已锁定，等待审核合并'
    : recoveryRevision !== null ? '草稿版本已变化，本页修改还未保存'
    : changed ? '本页有未保存的修改'
    : state.dirty ? '草稿已保存，等待' + nextStep : '当前没有待' + nextStep + '的修改');
  if (draftStatus.textContent !== label) draftStatus.textContent = label;
  byId('save').disabled = editingLocked || !changed;
  byId('publish').disabled = editingLocked || (!changed && !state.dirty);
  byId('refresh').disabled = locked;
  byId('logout').disabled = locked;
  gamePanel.inert = Boolean(busy);
  byId('sort-body').inert = Boolean(busy);
}

function syncSessionView() {
  const github = usesGitHub();
  const actor = github && typeof state.actor?.login === 'string' ? state.actor.login : '';
  message(byId('actor'), actor ? 'GitHub · @' + actor : '');
  byId('publish').textContent = github ? '提交审核' : '发布更新';
  byId('publish-title').textContent = github ? '提交公开站更新审核' : '发布到公开展示站';
  byId('publish-description').textContent = github
    ? '已保存的草稿将生成 GitHub Pull Request。审核合并到主干并完成部署后，公开站才会显示这批改动。'
    : '已保存的草稿将提交到主干，并触发 GitHub Pages 更新。发布完成后，公开站仍需等待部署。';
  byId('confirm-publish').textContent = github ? '确认提交审核' : '确认发布';
  const review = github ? state.review : null;
  const link = byId('review-link');
  const url = safeURL(review?.url, true);
  byId('review-banner').hidden = !review;
  byId('sort-help').textContent = review ? '点选游戏可查看本次提交的内容。'
    : '拖动手柄排序，也可以逐项上移或下移。';
  link.hidden = !url;
  if (url) link.href = url;
  else link.removeAttribute('href');
}

function useState(value) {
  for (const upload of pending.values()) URL.revokeObjectURL(upload.preview);
  pending.clear();
  state = value;
  recoveryRevision = null;
  games = value.games.map(game => ({ ...game, summary: { ...game.summary } }));
  cards.clear();
  gamePanel.replaceChildren(...games.map(gameCard));
  renderSort();
  syncSessionView();
  signIn.hidden = true;
  toolbar.hidden = false;
  workspace.hidden = false;
  byId('boot').hidden = true;
  updateStatus();
}

function openLogin(authMode = state?.authMode) {
  const github = authMode === 'github';
  const preserve = github && state && hasLocalChanges();
  const link = byId('github-login');
  byId('login-form').hidden = github;
  link.hidden = !github;
  byId('github-recheck').hidden = !preserve;
  if (preserve) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '在新标签页使用 GitHub 登录';
  } else {
    link.removeAttribute('target');
    link.removeAttribute('rel');
    link.textContent = '使用 GitHub 登录';
  }
  byId('login-note').textContent = github
    ? '使用有编辑权限的 GitHub 账号登录。'
    : '整理游戏顺序、双语简介和展示截图。';
  byId('boot').hidden = true;
  signIn.hidden = false;
  workspace.hidden = true;
  toolbar.hidden = true;
  (github ? link : byId('username')).focus();
}

function renderSort(focus) {
  byId('sort-count').textContent = games.length + ' 个游戏';
  sortList.replaceChildren(...games.map((game, index) => {
    const row = element('li', 'sort-row');
    row.dataset.sortId = game.id;
    const handle = button('⠿', 'sort-button grip', null, '拖动 ' + game.zh + ' 排序');
    handle.disabled = Boolean(state.review);
    handle.addEventListener('pointerdown', event => startDrag(event, row));
    handle.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      moveGame(game.id, event.key === 'ArrowUp' ? -1 : 1, 'grip');
    });
    const jump = button('', 'sort-jump', () => {
      const card = cards.get(game.id);
      card.scrollIntoView({ block: 'start' });
      card.focus({ preventScroll: true });
    }, '编辑 ' + game.zh);
    jump.append(element('b', '', game.zh), element('small', '', game.en));
    const up = button('↑', 'sort-button up', () => moveGame(game.id, -1, 'up'), '上移 ' + game.zh);
    const down = button('↓', 'sort-button down', () => moveGame(game.id, 1, 'down'), '下移 ' + game.zh);
    up.disabled = Boolean(state.review) || index === 0;
    down.disabled = Boolean(state.review) || index === games.length - 1;
    row.append(handle, jump, up, down);
    if (focus?.id === game.id) queueMicrotask(() => {
      const preferred = row.querySelector('.' + focus.control);
      (preferred?.disabled ? handle : preferred)?.focus({ preventScroll: true });
    });
    return row;
  }));
}

function moveGame(id, delta, control) {
  const index = games.findIndex(game => game.id === id);
  const target = games[index + delta];
  if (target) reorder(id, target.id, delta > 0, control);
}

function reorder(id, destination, after, control) {
  if (id === destination) return;
  const before = games.map(game => game.id).join('\n');
  const index = games.findIndex(game => game.id === id);
  if (index < 0 || !games.some(game => game.id === destination)) return;
  const [game] = games.splice(index, 1);
  const target = games.findIndex(item => item.id === destination) + Number(after);
  games.splice(target, 0, game);
  if (before === games.map(item => item.id).join('\n')) return;
  const scroll = sortList.scrollTop;
  renderSort({ id, control });
  sortList.scrollTop = scroll;
  for (const item of games) gamePanel.append(cards.get(item.id));
  byId('sort-announcement').textContent = game.zh + ' 已移到第 ' + (target + 1) + ' 位';
  updateStatus();
}

function startDrag(event, row) {
  if (drag || busy || state.review || !event.isPrimary || event.button !== 0) return;
  const grip = event.currentTarget;
  grip.setPointerCapture(event.pointerId);
  drag = {
    row, grip, id: row.dataset.sortId, pointer: event.pointerId,
    startX: event.clientX, startY: event.clientY,
    x: event.clientX, y: event.clientY, active: false, target: null, frame: 0,
  };
}

function paintDrag() {
  if (!drag?.active) return;
  const { left, right, top, bottom } = sortList.getBoundingClientRect();
  drag.target?.removeAttribute('data-drop');
  drag.target = null;
  if (drag.x < left - 30 || drag.x > right + 30 || drag.y < top - 28 || drag.y > bottom + 28) return;
  const speed = drag.y < top + 24 ? -7 : drag.y > bottom - 24 ? 7 : 0;
  if (speed) sortList.scrollTop += speed;
  const x = Math.max(left + 2, Math.min(right - 9, drag.x));
  const y = Math.max(top + 2, Math.min(bottom - 2, drag.y));
  const target = document.elementFromPoint(x, y)?.closest('.sort-row');
  if (!target || target === drag.row) return;
  const rect = target.getBoundingClientRect();
  drag.target = target;
  target.dataset.drop = y < rect.top + rect.height / 2 ? 'before' : 'after';
}

function dragFrame() {
  if (!drag?.active) return;
  paintDrag();
  drag.frame = requestAnimationFrame(dragFrame);
}

function moveDrag(event) {
  if (!drag || drag.pointer !== event.pointerId) return;
  drag.x = event.clientX;
  drag.y = event.clientY;
  if (drag.active || Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return;
  drag.active = true;
  drag.row.classList.add('dragged');
  dragFrame();
}

function finishDrag(event) {
  if (!drag || drag.pointer !== event.pointerId) return;
  if (event.type === 'pointerup') {
    drag.x = event.clientX;
    drag.y = event.clientY;
    paintDrag();
  }
  const { row, id, target, frame } = drag;
  const after = target?.dataset.drop === 'after';
  drag = null;
  cancelAnimationFrame(frame);
  row.classList.remove('dragged');
  target?.removeAttribute('data-drop');
  if (target && event.type === 'pointerup') reorder(id, target.dataset.sortId, after, 'grip');
}

sortList.addEventListener('pointermove', moveDrag);
sortList.addEventListener('pointerup', finishDrag);
sortList.addEventListener('pointercancel', finishDrag);
sortList.addEventListener('lostpointercapture', finishDrag);

function gameCard(game) {
  const card = element('article', 'game-card');
  card.tabIndex = -1;
  cards.set(game.id, card);
  const header = element('div', 'game-heading');
  header.append(element('h2', '', game.zh), element('p', '', game.en));
  const fields = element('div', 'fields');
  for (const [language, title] of [['zh', '中文简介'], ['en', '英文简介']]) {
    const label = element('label', '', title);
    const editor = element('textarea');
    editor.value = game.summary[language];
    editor.readOnly = Boolean(state.review);
    editor.lang = language === 'zh' ? 'zh-CN' : 'en';
    editor.rows = 3;
    editor.maxLength = 1500;
    editor.addEventListener('input', () => {
      game.summary[language] = editor.value;
      updateStatus();
    });
    label.append(editor);
    fields.append(label);
  }
  const galleryHeading = element('h3', 'gallery-heading', '展示截图');
  galleryHeading.append(element('small', '', state.review ? '本次审核版本' : '保留原比例，保存时使用 WebP'));
  const gallery = element('div', 'gallery');
  gallery.append(...[0, 1, 2].map(index => assetCard(game, index)));
  card.append(header, fields, galleryHeading, gallery);
  return card;
}

function assetCard(game, index) {
  const key = game.id + ':' + index;
  const figure = element('figure', 'asset');
  const image = element('img', 'asset-image');
  image.loading = 'lazy';
  image.alt = game.zh + ' 截图 ' + (index + 1);
  const source = safeURL(game.images[index]);
  if (source && source.origin === location.origin) source.searchParams.set('revision', String(state.revision));
  const choose = element('input');
  choose.type = 'file';
  choose.disabled = Boolean(state.review);
  choose.accept = 'image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp';
  choose.hidden = true;
  const replace = button('替换图 ' + (index + 1), 'button secondary', () => choose.click(),
    '替换 ' + image.alt);
  replace.disabled = Boolean(state.review);
  const undo = button('撤销替换', 'button secondary', () => {
    URL.revokeObjectURL(pending.get(key).preview);
    pending.delete(key);
    sync();
    updateStatus();
    replace.focus({ preventScroll: true });
  }, '撤销 ' + image.alt + ' 的替换');
  const status = element('span', 'asset-status');
  status.setAttribute('role', 'status');
  const caption = element('figcaption', 'asset-controls');
  caption.append(replace, undo, status, choose);
  figure.append(image, caption);

  function sync(error = '') {
    const upload = pending.get(key);
    if (upload || source) image.src = upload?.preview ?? source.href;
    else image.removeAttribute('src');
    undo.hidden = !upload;
    figure.toggleAttribute('data-pending', Boolean(upload));
    status.toggleAttribute('data-error', Boolean(error));
    status.textContent = error || (upload
      ? upload.width + ' × ' + upload.height + ' · ' + Math.ceil(upload.bytes / 1024) + ' KB · 待保存'
      : source ? '当前截图' : '暂无截图');
  }

  choose.addEventListener('change', async () => {
    const file = choose.files[0];
    choose.value = '';
    if (!file) return;
    encodingCount++;
    replace.disabled = true;
    undo.disabled = true;
    status.removeAttribute('data-error');
    status.textContent = '正在压缩截图…';
    updateStatus();
    try {
      const upload = await prepareImage(file);
      const previous = pending.get(key);
      if (previous) URL.revokeObjectURL(previous.preview);
      pending.set(key, { id: game.id, index, ...upload });
      sync();
    } catch (error) {
      sync(error.message);
    } finally {
      encodingCount--;
      replace.disabled = false;
      undo.disabled = false;
      updateStatus();
    }
  });

  image.addEventListener('error', () => {
    status.setAttribute('data-error', '');
    status.textContent = '预览载入失败，可尝试重新替换';
  });
  sync();
  return figure;
}

async function rasterType(file) {
  const bytes = new Uint8Array(await file.slice(0, 48).arrayBuffer());
  const string = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes[0] === 137 && string(1, 8) === 'PNG\r\n\x1a\n') return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (string(0, 4) === 'RIFF' && string(8, 12) === 'WEBP') return 'image/webp';
  if (string(0, 6) === 'GIF87a' || string(0, 6) === 'GIF89a') return 'image/gif';
  if (string(0, 2) === 'BM') return 'image/bmp';
  if (string(4, 8) === 'ftyp' && ['avif', 'avis'].some(brand => string(8, 48).includes(brand))) return 'image/avif';
  throw new Error('请选择可以解码的 PNG、JPEG、WebP、AVIF、GIF 或 BMP 位图');
}

function webP(canvas, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob?.type === 'image/webp') resolve(blob);
    else reject(new Error('当前浏览器无法编码 WebP，请用新版 Chrome 或 Edge 重试'));
  }, 'image/webp', quality));
}

function base64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result.split(',', 2)[1]), { once: true });
    reader.addEventListener('error', () => reject(new Error('读取压缩截图失败')), { once: true });
    reader.readAsDataURL(blob);
  });
}

async function prepareImage(file) {
  const type = await rasterType(file);
  const source = URL.createObjectURL(file.slice(0, file.size, type));
  const image = new Image();
  try {
    image.src = source;
    await image.decode().catch(() => { throw new Error('无法解码这张截图，请重新选择'); });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法准备截图，请重试');
    let scale = Math.min(1, imagePixelLimit / Math.max(image.naturalWidth, image.naturalHeight));
    for (let round = 0; round < 5; round++, scale *= .78) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [.88, .76, .62]) {
        const blob = await webP(canvas, quality);
        if (blob.size > imageByteLimit) continue;
        const data = await base64(blob);
        return { data, preview: URL.createObjectURL(blob), width: canvas.width, height: canvas.height, bytes: blob.size };
      }
    }
    throw new Error('这张截图无法压缩到 1 MiB 以内，请重新选择');
  } finally {
    URL.revokeObjectURL(source);
  }
}

async function runAction(label, operation) {
  if (busy || encodingCount) return false;
  busy = label;
  message(workspaceError, '');
  announce('');
  updateStatus();
  try {
    await operation();
    return true;
  } catch (error) {
    if (error.status === 401) {
      openLogin(error.authMode ?? state?.authMode);
      message(byId('login-error'), '登录会话已失效。当前修改仍在页面中，请重新登录后重试。');
    } else message(workspaceError, error.message);
    return false;
  } finally {
    busy = '';
    updateStatus();
  }
}

function saveDraft() {
  return runAction('正在保存草稿…', async () => {
    const next = await request('/api/draft', 'PUT', {
      revision: state.revision,
      order: games.map(game => game.id),
      summaries: Object.fromEntries(games.map(game => [game.id, game.summary])),
      uploads: [...pending.values()].map(({ id, index, data }) => ({ id, index, data })),
    });
    useState(next);
    announce('草稿已保存');
  });
}

function useLoginState(next) {
  if (!state || !hasLocalChanges()) {
    useState(next);
    return;
  }
  const sameDraft = next.revision === state.revision && !next.review;
  if (!sameDraft && confirm('服务器草稿已变化。确定放弃本页未保存的修改并载入最新草稿？')) {
    useState(next);
    return;
  }
  if (sameDraft) {
    state = next;
    recoveryRevision = null;
    message(workspaceError, '');
  } else {
    state.csrf = next.csrf;
    recoveryRevision = next.revision;
    message(workspaceError, '服务器草稿已变化，本页修改仍在。请先复制需要保留的内容，再同步主干。');
  }
  signIn.hidden = true;
  toolbar.hidden = workspace.hidden = false;
  syncSessionView();
  updateStatus();
}

byId('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const submit = byId('login-submit');
  if (submit.disabled) return;
  const errorBox = byId('login-error');
  message(errorBox, '');
  submit.disabled = true;
  submit.textContent = '登录中…';
  try {
    useLoginState(await request('/api/login', 'POST', {
      username: byId('username').value, password: byId('password').value,
    }));
  } catch (error) {
    message(errorBox, error.message);
  } finally {
    byId('password').value = '';
    submit.textContent = '登录';
    submit.disabled = false;
  }
});

byId('github-recheck').addEventListener('click', async event => {
  const control = event.currentTarget;
  const errorBox = byId('login-error');
  message(errorBox, '');
  control.disabled = true;
  try {
    useLoginState(await request('/api/state'));
  } catch (error) {
    message(errorBox, error.status === 401 ? '请先在新标签页完成 GitHub 登录。' : error.message);
  } finally {
    control.disabled = false;
  }
});

byId('save').addEventListener('click', () => saveDraft());
byId('publish').addEventListener('click', async () => {
  if (state.review) return;
  if (hasLocalChanges() && !await saveDraft()) return;
  if (!state.dirty) {
    announce(usesGitHub() ? '没有需要提交审核的修改' : '没有需要发布的修改');
    return;
  }
  publishDialog.returnValue = '';
  publishDialog.showModal();
});
publishDialog.addEventListener('close', () => {
  if (publishDialog.returnValue !== 'publish' || state.review) return;
  runAction(usesGitHub() ? '正在创建审核 PR…' : '正在提交到主干…', async () => {
    const result = await request('/api/publish', 'POST', { revision: state.revision });
    useState(result.state);
    if (result.pending) announce('已提交审核。');
    else announce('已提交到主干。请等待公开站部署。', result.url);
  });
});

byId('refresh').addEventListener('click', () => {
  const question = state.review
    ? '同步主干会检查审核状态。合并后将载入新版并解锁编辑。确定同步？'
    : hasLocalChanges()
      ? '同步主干会放弃本页未保存的修改以及尚未发布的草稿。建议先取消，保留本页修改。仍要同步？'
      : state.dirty ? '同步主干会放弃已保存但尚未发布的草稿。确定同步？' : '';
  if (question && !confirm(question)) return;
  runAction('正在同步主干…', async () => {
    useState(await request('/api/refresh', 'POST', { revision: recoveryRevision ?? state.revision }));
    announce('已同步主干');
  });
});

byId('logout').addEventListener('click', () => {
  if (hasLocalChanges() && !confirm('退出登录会放弃本页未保存的修改。确定退出？')) return;
  runAction('正在退出…', async () => {
    const authMode = state.authMode;
    await request('/api/logout', 'POST', {});
    for (const upload of pending.values()) URL.revokeObjectURL(upload.preview);
    pending.clear();
    cards.clear();
    state = null;
    recoveryRevision = null;
    games = [];
    gamePanel.replaceChildren();
    sortList.replaceChildren();
    openLogin(authMode);
  });
});

window.addEventListener('beforeunload', event => {
  if (!state || !hasLocalChanges()) return;
  event.preventDefault();
  event.returnValue = '';
});

const currentURL = new URL(location.href);
const loginDenied = currentURL.searchParams.get('login') === 'denied';
if (loginDenied) {
  currentURL.searchParams.delete('login');
  history.replaceState(history.state, '', currentURL);
}

try {
  useState(await request('/api/state'));
} catch (error) {
  openLogin(error.authMode);
  if (loginDenied && error.authMode === 'github') {
    message(byId('login-error'), 'GitHub 登录未完成，或此账号无编辑权限。请确认账号后重试。');
  } else if (error.status !== 401) message(byId('login-error'), error.message);
}
