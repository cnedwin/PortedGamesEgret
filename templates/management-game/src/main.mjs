import { play } from '@egret/engine/play';
import { translate } from './i18n.mjs';
import { readProgress, SAVE_KEY, writeProgress } from './saves.mjs';
import { beginWorld, buildHome, cancelPreview, PLOTS, selectPlot, supplies } from './sim/world.mjs';

const el = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const languageParam = params.get('lang');
const preferences = {
  language: languageParam === 'en' || languageParam === 'zh' ? languageParam : navigator.language.startsWith('zh') ? 'zh' : 'en',
  muted: false
};
const t = key => translate(key, preferences.language);
const controls = new AbortController();
const listen = (node, event, handler) => node.addEventListener(event, handler, { signal: controls.signal });
const boxes = new Map();
const art = {};
const waitAt = { x: 190, y: 385 };
let world = beginWorld();
let game;
let seconds = null;
let resetPrompt = false;
let closed = false;

function caption() {
  document.documentElement.lang = preferences.language === 'zh' ? 'zh-CN' : 'en';
  document.title = t('title');
  for (const [id, key] of Object.entries({
    title: 'title', chapter: 'chapter', timberLabel: 'timber', peopleLabel: 'residents', language: 'language'
  })) el(id).textContent = t(key);
  el('sound').textContent = t('sound') + ' · ' + t(preferences.muted ? 'soundOff' : 'soundOn');
  el('sound').setAttribute('aria-pressed', String(!preferences.muted));
  el('sites').setAttribute('aria-label', t('scene'));
  for (const plot of PLOTS) {
    const button = boxes.get(plot.id);
    button.querySelector('.name').textContent = t(plot.id);
    button.setAttribute('aria-label', t('pick') + ' · ' + t(plot.id));
  }
}

function refresh() {
  caption();
  const mode = resetPrompt ? 'reset' : seconds !== null ? 'raising' : world.house ? 'complete' : world.selected ? 'preview' : 'select';
  el('village').dataset.state = mode;
  const stock = supplies(world);
  el('timber').textContent = String(stock.timber);
  el('people').textContent = String(mode === 'raising' ? 0 : stock.residents);
  const headline = { reset: 'resetTitle', raising: 'raising', complete: 'complete', preview: 'preview', select: 'select' }[mode];
  const hint = { reset: 'resetHint', raising: 'raisingHint', complete: 'completeHint', preview: 'price', select: 'choose' }[mode];
  const site = world.house ?? world.selected;
  const name = site ? t(site) + ' · ' : '';
  el('objective').textContent = (mode === 'preview' ? name : '') + t(headline);
  el('hint').textContent = (mode === 'complete' ? name : '') + t(hint);
  el('sites').hidden = mode !== 'preview' && mode !== 'select';
  for (const [id, button] of boxes) button.setAttribute('aria-pressed', String(id === world.selected));
  el('confirm').hidden = el('cancel').hidden = mode !== 'reset' && mode !== 'preview';
  el('confirm').textContent = t(resetPrompt ? 'reset' : 'confirm');
  el('cancel').textContent = t('cancel');
  el('again').hidden = mode !== 'complete';
  el('again').textContent = t('again');
}

function draw() {
  const plot = PLOTS.find(p => p.id === (world.house ?? world.selected));
  const progress = seconds === null ? 1 : Math.min(1, seconds / 1.4);
  for (const [image, show] of [[art.preview, world.selected !== null], [art.frame, seconds !== null], [art.house, !!world.house && seconds === null]]) {
    image.visible = show;
    if (plot) { image.x = plot.x; image.y = plot.y - 64; }
  }
  // Residents walk from the ferry to their own doorstep. A resumed save starts at the doorstep.
  const target = world.house && plot ? { x: plot.x + (plot.id === 'ford' ? -40 : 42), y: plot.y + 6 } : waitAt;
  art.people.forEach((person, i) => {
    person.x = waitAt.x + (target.x - waitAt.x) * progress + i * 13;
    person.y = waitAt.y + (target.y - waitAt.y) * progress - 20 + i * 4;
  });
}

function choose(id) {
  if (!game || !selectPlot(world, id)) return;
  game.sfx.play('click', { volume: .34 });
  draw();
  refresh();
  el('confirm').focus({ preventScroll: true });
}

function cancel() {
  const from = world.selected;
  cancelPreview(world);
  resetPrompt = false;
  draw();
  refresh();
  (from ? boxes.get(from) : el('again')).focus({ preventScroll: true });
}

function confirm() {
  if (resetPrompt) {
    world = beginWorld();
    resetPrompt = false;
    writeProgress(game, world, preferences);
    draw();
    refresh();
    boxes.get(PLOTS[0].id).focus({ preventScroll: true });
    return;
  }
  if (!buildHome(world)) return;
  // Commit the house once before the visual transition. Closing mid-build restores the same home.
  writeProgress(game, world, preferences);
  game.sfx.play('build', { volume: .6 });
  seconds = game.reducedMotion ? null : 0;
  draw();
  refresh();
  if (seconds === null) el('again').focus({ preventScroll: true });
}

for (const [index, plot] of PLOTS.entries()) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'plot';
  button.dataset.plot = plot.id;
  button.style.left = (plot.x / 960 * 100) + '%';
  button.style.top = (plot.y / 540 * 100) + '%';
  const marker = document.createElement('span');
  marker.className = 'marker';
  marker.setAttribute('aria-hidden', 'true');
  marker.textContent = String(index + 1);
  const name = document.createElement('span');
  name.className = 'name';
  button.append(marker, name);
  el('sites').append(button);
  boxes.set(plot.id, button);
  listen(button, 'click', () => choose(plot.id));
}

caption();
el('objective').textContent = t('waiting');
listen(el('cancel'), 'click', cancel);
listen(el('confirm'), 'click', confirm);
listen(el('again'), 'click', () => { resetPrompt = true; refresh(); el('cancel').focus(); });
listen(el('language'), 'click', () => {
  preferences.language = preferences.language === 'en' ? 'zh' : 'en';
  if (game) { writeProgress(game, world, preferences); refresh(); }
  else caption();
});
listen(el('sound'), 'click', () => {
  preferences.muted = !preferences.muted;
  if (game) { game.sfx.muted = preferences.muted; writeProgress(game, world, preferences); }
  caption();
});
listen(el('village'), 'keydown', event => {
  if (event.key === 'Escape' && (world.selected || resetPrompt)) { event.preventDefault(); cancel(); }
});
listen(window, 'pagehide', event => {
  if (event.persisted) return;
  closed = true;
  controls.abort();
  if (game) void game.dispose();
});

try {
  const player = await play({
    parent: el('surface'), width: 960, height: 540, saveKey: SAVE_KEY, seed: params.get('seed') ?? 'ferry',
    ...(params.get('backend') === 'webgl2' || params.get('backend') === 'webgpu' ? { backend: params.get('backend') } : {}),
    async setup(g) {
      const saved = readProgress(g);
      if (saved.language && !['zh', 'en'].includes(languageParam)) preferences.language = saved.language;
      preferences.muted = saved.muted;
      g.sfx.muted = preferences.muted;
      g.sfx.define('build', [
        { wave: 'triangle', from: 125, to: 70, seconds: .09, decay: 6 },
        { wave: 'sine', from: 490, to: 610, seconds: .16, decay: 6 }
      ]);
      world = beginWorld(saved.house);
      const image = (file, width, height) => g.image(new URL('../assets/' + file + '.png', import.meta.url).href,
        { width, height, smooth: false });
      const ground = await image('village', 960, 540);
      ground.x = 480; ground.y = 270;
      [art.preview, art.frame, art.house] = await Promise.all(
        ['house-preview', 'house-frame', 'house-ready'].map(file => image(file, 160, 128))
      );
      art.people = await Promise.all([image('resident', 24, 40), image('resident', 24, 40)]);
      draw();
    },
    update(dt) {
      if (seconds === null) return;
      seconds += dt;
      if (seconds >= 1.4 || game?.reducedMotion) {
        seconds = null;
        refresh();
        if (document.activeElement === document.body) el('again').focus({ preventScroll: true });
      }
      draw();
    }
  });
  if (closed) await player.dispose();
  else {
    game = player;
    el('sound').disabled = el('language').disabled = false;
    refresh();
  }
} catch (error) {
  if (!closed) {
    console.error(error);
    el('village').dataset.state = 'error';
    el('objective').textContent = t('failure');
  }
}
