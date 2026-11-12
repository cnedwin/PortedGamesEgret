import { findTilePath } from './src/kys-navigation.mjs';
import { createMode3Battle } from './src/mode3-battle.mjs';
import { battleData, canWalk, mentor, start, trialRandom } from './trial-data.mjs';
import { createTrialWorld } from './trial-world.mjs';

const byId = id => document.getElementById(id);
const canvas = byId('world'), stage = byId('stage'), objective = byId('objective');
const dialogue = byId('dialogue'), nextButton = byId('next'), marker = byId('mentor');
const storageKey = 'ported-games-egret:jy:mountain-inn:1';
const walkKeys = new Map([
  ['ArrowUp', [0, -1, 0]], ['ArrowRight', [1, 0, 1]], ['ArrowLeft', [-1, 0, 2]], ['ArrowDown', [0, 1, 3]],
  ['KeyW', [0, -1, 0]], ['KeyD', [1, 0, 1]], ['KeyA', [-1, 0, 2]], ['KeyS', [0, 1, 3]],
]);
const combatKeys = new Map([['ArrowUp', 'KeyW'], ['ArrowRight', 'KeyD'], ['ArrowLeft', 'KeyA'], ['ArrowDown', 'KeyS']]);
const held = new Set(), tapped = new Set();
const nearby = [{ x: 16, y: 9 }, { x: 17, y: 8 }, { x: 18, y: 9 }, { x: 17, y: 10 }];
let phase = 'loading', tile = { ...start }, path = [], walk = null, pendingTalk = false, battle;
let conversation, previous = performance.now(), wins = 0, restored = false;

function readProgress() {
  try {
    const save = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (!save || save.version !== 1 || save.wins !== 1 || !Number.isInteger(save.x) || !Number.isInteger(save.y)
      || !Number.isInteger(save.facing) || save.facing < 0 || save.facing > 3 || !canWalk(save.x, save.y)) return;
    tile = { x: save.x, y: save.y, facing: save.facing };
    wins = 1;
    restored = true;
  } catch { /* Browser storage may be unavailable. */ }
}
function saveProgress() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, wins, ...tile }));
    byId('save-status').textContent = '试剑进度已保存。';
  } catch {
    byId('save-status').textContent = '当前浏览器无法保存进度。';
  }
}
function showPhase(value) {
  phase = value;
  stage.dataset.phase = value;
  stage.dataset.wins = String(wins);
  marker.hidden = value !== 'explore';
  byId('talk').hidden = value !== 'explore';
  byId('attack').hidden = byId('guard').hidden = byId('auto').hidden = value !== 'battle';
  byId('battle-hud').hidden = value !== 'battle' && value !== 'result';
  dialogue.hidden = value !== 'talk' && value !== 'result';
  if (value === 'explore') objective.textContent = wins ? '试剑已完成，可以继续探索。' : '过桥，与青衣守驿人交谈。';
  if (value === 'battle') objective.textContent = '山驿切磋';
}
function showDialogue({ title, text, button, action, result = false }) {
  conversation = action;
  byId('speaker').textContent = title;
  byId('speech').textContent = text;
  nextButton.textContent = button;
  showPhase(result ? 'result' : 'talk');
  nextButton.focus({ preventScroll: true });
}
function talk() {
  path = [];
  pendingTalk = false;
  const offset = [mentor.x - tile.x, mentor.y - tile.y];
  tile.facing = offset[0] > 0 ? 1 : offset[0] < 0 ? 2 : offset[1] < 0 ? 0 : 3;
  showDialogue({ title: '青衣守驿人',
    text: wins ? '剑路已熟。要再过几招么？' : '过了这座桥，便是山驿。远道来的客人，要在院中与我试几招么？',
    button: '开始切磋', action: beginBattle });
}
function routeTo(targets, speak = false) {
  if (phase !== 'explore') return;
  const origin = walk?.to ?? tile;
  path = findTilePath(origin, targets, canWalk) ?? [];
  pendingTalk = speak && (path.length > 0 || nearby.some(point => point.x === origin.x && point.y === origin.y));
  if (!walk && pendingTalk && !path.length) talk();
  else canvas.focus({ preventScroll: true });
}
function beginBattle() {
  battle = createMode3Battle(battleData, { rng: trialRandom() });
  held.clear();
  tapped.clear();
  byId('auto').setAttribute('aria-pressed', 'false');
  showPhase('battle');
  canvas.focus({ preventScroll: true });
}
function settleBattle() {
  const won = battle.state.result;
  stage.dataset.outcome = won ? 'win' : 'loss';
  if (won) {
    wins = 1;
    saveProgress();
  }
  objective.textContent = won ? '切磋胜利' : '切磋结束';
  showDialogue({ title: '青衣守驿人', result: true,
    text: won ? '好一记渡风剑。今日就到这里，往后的山路，还长着呢。' : '这一局先到这里。缓一缓，再来过招。',
    button: '返回山驿', action: () => {
      battle = undefined;
      showPhase('explore');
      canvas.focus({ preventScroll: true });
    } });
}
function switchAuto() {
  if (phase !== 'battle') return;
  battle.toggleAutomatic();
  byId('auto').setAttribute('aria-pressed', String(battle.state.auto));
}
function releaseKeys() {
  held.clear();
  tapped.clear();
}
function keyDown(code) {
  if (phase === 'explore' && walkKeys.has(code)) {
    path = [];
    pendingTalk = false;
  }
  held.add(code);
  tapped.add(code);
}
function keyUp(code) {
  held.delete(code);
}
function advanceWalk(now) {
  if (walk && now >= walk.until) {
    tile = walk.to;
    walk = null;
    if (pendingTalk && !path.length) talk();
  }
  if (!walk && phase === 'explore') {
    let target = path.shift();
    if (!target) {
      const key = [...held, ...tapped].find(code => walkKeys.has(code));
      const direction = walkKeys.get(key);
      if (direction) {
        const [dx, dy, facing] = direction;
        if (canWalk(tile.x + dx, tile.y + dy)) target = { x: tile.x + dx, y: tile.y + dy, facing };
        else tile.facing = facing;
      }
    }
    if (target) walk = { from: tile, to: target, start: now, until: now + 127 };
    tapped.clear();
  }
  stage.dataset.x = String(tile.x);
  stage.dataset.y = String(tile.y);
  if (!walk) return tile;
  const ratio = Math.max(0, Math.min(1, (now - walk.start) / (walk.until - walk.start)));
  return { x: tile.x + (walk.to.x - tile.x) * ratio, y: tile.y + (walk.to.y - tile.y) * ratio,
    facing: walk.to.facing, moving: true };
}

readProgress();
if (restored) byId('save-status').textContent = '已恢复试剑进度。';

try {
  const world = createTrialWorld(canvas);
  canvas.dataset.engine = 'egret-world3d';
  showPhase('explore');
  function frame(now) {
    const delta = Math.min(85, now - previous);
    previous = now;
    let player, opponent;
    if (phase === 'battle') {
      const input = new Set([...held, ...tapped].map(code => combatKeys.get(code) ?? code));
      const tick = battle.state.frame;
      battle.step(delta, input);
      if (battle.state.frame !== tick) tapped.clear();
      const enemy = battle.state.roles.find(role => role.side === 1);
      byId('hero-hp').max = battle.state.player.maxHp;
      byId('hero-hp').value = battle.state.player.hp;
      byId('mentor-hp').max = enemy?.maxHp ?? 1;
      byId('mentor-hp').value = enemy?.hp ?? 0;
      stage.dataset.battleTick = String(battle.state.frame);
      if (battle.state.result !== null) settleBattle();
    }
    if (battle) {
      player = battle.state.player;
      opponent = battle.state.roles.find(role => role.side === 1) ?? mentor;
    } else player = advanceWalk(now);
    world.draw(player, opponent, battle?.state, now);
    const [x, y] = world.screen(mentor.x, 1.52, mentor.y);
    marker.style.left = x * 100 + '%';
    marker.style.top = y * 100 + '%';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  canvas.addEventListener('pointerup', event => {
    if (phase !== 'explore') return;
    const bounds = canvas.getBoundingClientRect();
    const target = world.tileAt((event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height);
    if (target?.x === mentor.x && target.y === mentor.y) routeTo(nearby, true);
    else if (target && canWalk(target.x, target.y)) routeTo([target]);
  });
  marker.addEventListener('click', () => routeTo(nearby, true));
  byId('talk').addEventListener('click', () => routeTo(nearby, true));
  byId('auto').addEventListener('click', switchAuto);
  nextButton.addEventListener('click', () => conversation?.());
  byId('reset').addEventListener('click', () => {
    try { localStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
    battle = undefined;
    tile = { ...start };
    wins = 0;
    path = [];
    walk = null;
    pendingTalk = false;
    delete stage.dataset.outcome;
    releaseKeys();
    byId('save-status').textContent = '进度保存在当前浏览器。';
    showPhase('explore');
    canvas.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', event => {
    if (event.code === 'Enter' && phase === 'explore' && !event.repeat
      && (event.target === canvas || event.target === document.body)) {
      event.preventDefault();
      routeTo(nearby, true);
    } else if (event.code === 'Tab' && phase === 'battle' && event.target === canvas && !event.repeat) {
      event.preventDefault();
      switchAuto();
    } else if ((phase === 'explore' && walkKeys.has(event.code))
      || (phase === 'battle' && (walkKeys.has(event.code) || ['KeyI', 'KeyE'].includes(event.code)))) {
      event.preventDefault();
      if (!event.repeat) keyDown(event.code);
    }
  });
  document.addEventListener('keyup', event => keyUp(event.code));
  window.addEventListener('blur', releaseKeys);
  for (const button of document.querySelectorAll('[data-key]')) {
    const code = button.dataset.key;
    button.addEventListener('pointerdown', event => {
      button.setPointerCapture(event.pointerId);
      keyDown(code);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, () => keyUp(code));
    }
    button.addEventListener('click', event => {
      if (event.detail === 0) tapped.add(code);
    });
  }
} catch (error) {
  byId('error').textContent = '无法启动白鹭 World3D。请使用支持 WebGL2 的浏览器。';
  byId('error').hidden = false;
  objective.textContent = '画面启动失败';
  stage.dataset.phase = 'failed';
  console.error(error);
}
