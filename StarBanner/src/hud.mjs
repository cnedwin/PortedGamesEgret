import { createScratchCanvas } from './ui/scratch-canvas.mjs';
// The battle HUD: native Egret controls, atlas labels, portraits and pooled world markers.
// The rules and action order live in play.mjs; this layer only draws them and forwards orders.
import { Sprite } from '@egret/engine';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { t, say } from './i18n.mjs';
import { UNITS, BUILDINGS } from './sim/units.mjs';
import { TERRAIN } from './sim/terrain.mjs';
import { COMMANDERS } from './sim/commanders.mjs';
import { TEAMS } from './view/toon.mjs';
import { createKit, FONT } from './ui/kit.mjs';

import { assetUrl } from './asset-url.mjs';
const PORTRAIT = (id) => assetUrl(`portraits/${id}.webp`).href;
const C = { ink: 0x1b2340, soft: 0x3a4670, paper: 0xf4f7fb, pale: 0xe4ebf5, gold: 0xf5c542, goldDeep: 0x9f6518, green: 0x3fbf6a, white: 0xffffff, blue: 0x3d7bff, red: 0xe8384a, orange: 0xe8642a };
const ICONS = { endTurn: '⚑', next: '➜', cancel: '↩', threat: '◎', turnLeft: '↺', turnRight: '↻', zoomIn: '＋', zoomOut: '－', menu: '☰' };
const TEAM = (color) => typeof color === 'number' ? color : Number.parseInt((color || '#1b2340').slice(1), 16);
const stars = (n) => (n >= 0 ? '★'.repeat(n) + '☆'.repeat(Math.max(0, 4 - n)) : '☠'.repeat(-n));
const rect = (x, y, width, height) => ({ x, y, width, height });
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const now = () => performance.now();
const hintMeasure = typeof document !== 'undefined' || typeof OffscreenCanvas === 'function' ? createScratchCanvas(1, 1).getContext('2d') : null;
function hintGeometry(text, available, unit) {
  if (!text) return { width: 0, height: 0 };
  const size = 12 * unit;
  if (hintMeasure) hintMeasure.font = '800 ' + size + 'px ' + FONT;
  const measured = (words) => hintMeasure?.measureText(words).width ?? Array.from(words).reduce((a, c) => a + (/\p{Script=Han}/u.test(c) ? size : size * 0.64), 0);
  const natural = Math.max(...String(text).split('\n').map(measured));
  const width = Math.min(available, 550 * unit, Math.max(100 * unit, natural + 20 * unit));
  const inner = Math.max(1, width - 12 * unit);
  let lines = 0;
  for (const paragraph of String(text).split('\n')) {
    let row = '', count = 1;
    // The same word/CJK break opportunities as the atlas label, including a long unbroken word.
    const parts = paragraph.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|\s+|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu) ?? [''];
    for (const part of parts) {
      if (row && measured(row + part) > inner) { count++; row = part.trimStart(); }
      else row += part;
      if (row && measured(row) > inner && Array.from(row).length > 1) {
        let head = '';
        for (const ch of Array.from(row)) {
          if (head && measured(head + ch) > inner) { count++; head = ch; } else head += ch;
        }
        row = head;
      }
    }
    lines += count;
  }
  return { width, height: Math.max(24 * unit, lines * size * 1.25 + 8 * unit) };
}

export function createHud(host, { onButton, touch = false }) {
  const root = host.game.scope.use(new Sprite());
  host.game.stage.addChildAt(root, 0);
  const groups = new Map();
  // Independent passive and interactive layers. A badge can move every frame without rebuilding a HUD card.
  for (const key of ['markers', 'top', 'tile', 'unit', 'hint', 'forecast', 'bar', 'toast', 'banner', 'menu']) {
    const layer = new Sprite();
    root.addChild(layer);
    groups.set(key, { layer, kit: null });
  }

  let disposed = false, busy = false, cancelShown = false, menu = null, menuSerial = 0, bannerState = null;
  let topState = null, tileState = null, unitState = null, hintState = null, forecastState = null, layout;
  let topKey, tileKey, unitKey, forecastKey;
  const buttons = {};
  const timers = new Set();
  const badgeActive = new Map(), badgeFree = [], floatPool = [], toastQueue = [];
  let badgeCount = 0, badgeSerial = 0;

  function after(ms, task) {
    const timer = setTimeout(() => { timers.delete(timer); if (!disposed) task(); }, ms);
    timers.add(timer);
    return timer;
  }
  function clearTimer(timer) {
    if (timer == null) return;
    clearTimeout(timer);
    timers.delete(timer);
  }
  function resetGroup(key, suffix = '') {
    const group = groups.get(key);
    group.kit?.dispose();
    group.kit = createKit(host, group.layer, { prefix: 'hud-' + key + suffix });
    return group.kit;
  }
  function clearGroup(key) {
    const group = groups.get(key);
    group.kit?.dispose();
    group.kit = null;
  }
  function card(kit, box, team, { fill = C.paper, radius = 13, block = false } = {}) {
    const u = layout.unit;
    // The offset ink outline is the same sticker-like visual language as the title.
    const shadow = kit.panel({ ...box, y: box.y + 3 * u, fill: C.ink, radius: radius * u, alpha: 0.85 });
    const surface = kit.panel({ ...box, fill, alpha: 0.97, radius: radius * u, border: { color: team ?? C.ink, width: (team == null ? 2 : 3) * u }, block });
    surface.shadow = shadow;
    return surface;
  }
  function label(kit, text, box, size = 15, color = C.ink, options = {}) {
    const { semanticId, semanticRole = 'text', ...art } = options;
    const handle = kit.label({ ...box, text, size: size * layout.unit, color, weight: 800, align: 'left', ...art });
    if (semanticId) {
      kit.own(host.semantics.add({
        id: 'hud-label-' + semanticId,
        role: semanticRole,
        describe: () => ({
          name: String(text),
          bounds: semanticBoundsOf(handle.root),
          hidden: !root.visible || !handle.root.visible
        })
      }));
    }
    return handle;
  }
  function face(kit, model, box, team) {
    kit.panel({ ...box, fill: C.pale, border: { color: team, width: 2 * layout.unit }, radius: 9 * layout.unit });
    if (model) {
      const edge = 3 * layout.unit;
      kit.image({ source: PORTRAIT(model), ...rect(box.x + edge, box.y + edge, box.width - 2 * edge, box.height - 2 * edge) });
    } else label(kit, '♜', box, 25, C.ink, { align: 'center' });
  }
  function meter(kit, box, fraction, fill, fromRight = false) {
    const u = layout.unit, q = clamp(fraction || 0, 0, 1);
    kit.panel({ ...box, fill: 0xd6dde9, border: { color: C.ink, width: u }, radius: box.height / 2 });
    const inner = Math.max(0, box.width - 4 * u) * q;
    if (inner > 0) kit.panel({ ...rect(box.x + 2 * u + (fromRight ? Math.max(0, box.width - 4 * u - inner) : 0), box.y + u, inner, Math.max(1, box.height - 2 * u)), fill, radius: Math.max(1, (box.height - 2 * u) / 2) });
  }

  function measure() {
    const metrics = host.metrics();
    const safe = metrics.safe, unit = metrics.unit, tap = metrics.tap;
    const margin = 8 * unit, gap = 5 * unit;
    const keys = Object.keys(ICONS).filter((key) => (key !== 'cancel' || cancelShown) && (key !== 'next' || !touch || !cancelShown) && (touch || !['zoomIn', 'zoomOut'].includes(key)));
    const maxWidth = Math.max(tap, safe.width - 2 * margin);
    const textWidth = (key) => Math.max(tap, (32 + Array.from(t(key)).reduce((width, ch) => width + (/\p{Script=Han}/u.test(ch) ? 15 : 8.4), 0)) * unit);
    const fullWidth = keys.reduce((a, k) => a + textWidth(k), 0) + gap * (keys.length - 1);
    const compact = fullWidth > maxWidth;
    const rows = [[]];
    let width = 0;
    for (const key of keys) {
      const w = compact ? Math.max(tap, 52 * unit) : textWidth(key);
      if (rows.at(-1).length && width + gap + w > maxWidth) { rows.push([]); width = 0; }
      if (width) width += gap;
      rows.at(-1).push({ key, width: w });
      width += w;
    }
    const barHeight = rows.length * tap + (rows.length - 1) * gap;
    const barTop = safe.y + safe.height - margin - barHeight;
    const narrow = safe.width < 530 * unit;
    const { width: hintW, height: hintH } = hintGeometry(hintState, maxWidth, unit);
    const cardsBottom = barTop - gap - (hintH ? hintH + gap : 0);
    return { ...metrics, safe, unit, tap, margin, gap, narrow, compact, rows, barTop, cardsBottom, hintW, hintH, keys };
  }

  function drawBar(keepFocus = false) {
    const prev = keepFocus ? host.keyboard.getSnapshot().focusedId : null;
    let oldFocus;
    for (const [key, b] of Object.entries(buttons)) if (b.id === prev) oldFocus = key;
    const kit = resetGroup('bar');
    for (const key of Object.keys(buttons)) delete buttons[key];
    const { safe, unit: u, tap, gap, rows, compact, barTop } = layout;
    rows.forEach((row, index) => {
      const w = row.reduce((sum, item) => sum + item.width, 0) + (row.length - 1) * gap;
      let x = safe.x + (safe.width - w) / 2;
      for (const { key, width } of row) {
        const name = t(key);
        buttons[key] = kit.button({
          id: key, name, text: compact ? ICONS[key] : `${ICONS[key]} ${name}`,
          ...(compact ? { sub: name, subSize: Math.max(7, 10 * u), size: 17 * u } : { size: Math.min(17 * u, 15 / layout.scale) }),
          ...rect(x, barTop + index * (tap + gap), width, tap),
          primary: key === 'endTurn',
          enabled: !menu && (!busy || !['endTurn', 'next'].includes(key)),
          onActivate: () => onButton(key)
        });
        x += width + gap;
      }
    });
    // Keep every former HUD button handle available, even when its platform-specific control is hidden.
    for (const key of Object.keys(ICONS)) {
      if (buttons[key]) continue;
      const b = kit.button({ id: key, name: t(key), text: ICONS[key], ...rect(safe.x, safe.y, tap, tap), enabled: false, onActivate: () => onButton(key) });
      b.setVisible(false);
      buttons[key] = b;
    }
    if (oldFocus && layout.keys.includes(oldFocus) && !menu) buttons[oldFocus].focus();
  }
  function refreshButtonState() {
    for (const [key, b] of Object.entries(buttons)) b.setEnabled(layout.keys.includes(key) && !menu && (!busy || !['endTurn', 'next'].includes(key)));
  }

  function drawTop() {
    if (!topState) return clearGroup('top');
    const { turn, current, players, human } = topState;
    const kit = resetGroup('top');
    const { safe, margin: m, unit: u, narrow } = layout;
    const y = safe.y + m;
    const turnW = narrow ? Math.min(172 * u, safe.width - 2 * m) : 126 * u;
    const turnH = narrow ? 30 * u : 45 * u;
    const cardY = narrow ? y + turnH + 4 * u : y;
    const cardW = narrow
      ? (safe.width - 3 * m) / 2
      : Math.min(205 * u, Math.max(145 * u, (safe.width - turnW - 4 * m) / 2));
    const cardH = narrow ? 84 * u : 77 * u;
    const color = TEAM(TEAMS[current].css);
    const turnBox = rect(safe.x + (safe.width - turnW) / 2, y, turnW, turnH);
    card(kit, turnBox, color, { fill: C.ink, block: true });
    if (narrow) label(kit, `${t('turn', { n: turn })} · ${current === human ? t('yourTurn') : t('foeTurn')}`, turnBox, 13, C.white, { align: 'center', semanticId: 'turn' });
    else {
      label(kit, t('turn', { n: turn }), rect(turnBox.x, y + 4 * u, turnW, 19 * u), 16, C.white, { align: 'center', semanticId: 'turn' });
      label(kit, current === human ? t('yourTurn') : t('foeTurn'), rect(turnBox.x, y + 23 * u, turnW, 17 * u), 12, color, { align: 'center', semanticId: 'turn-side' });
    }
    players.forEach((p, side) => {
      const spec = COMMANDERS[p.commander], team = TEAM(TEAMS[side].css);
      const x = side ? safe.x + safe.width - m - cardW : safe.x + m;
      const box = rect(x, cardY, cardW, cardH);
      card(kit, box, current === side ? team : undefined, { block: true });
      const edge = 6 * u, portraitW = (narrow ? 29 : 43) * u;
      face(kit, p.commander, rect(side ? x + cardW - edge - portraitW : x + edge, cardY + edge, portraitW, portraitW), team);
      const infoX = side ? x + edge : x + 2 * edge + portraitW;
      const infoW = cardW - 3 * edge - portraitW;
      const align = side ? 'right' : 'left';
      label(kit, `${say(spec)}${side === human ? ` · ${t('you')}` : ''}`, rect(infoX, cardY + 3 * u, infoW, 17 * u), narrow ? 12 : 15, team, { align, semanticId: 'commander-' + side });
      label(kit, t('gold', { n: p.unknown ? '—' : p.gold }), rect(infoX, cardY + 20 * u, infoW, 13 * u), 11, C.goldDeep, { align, semanticId: 'commander-gold-' + side });
      label(kit, `♥ ${p.unknown ? '—' : p.hp ?? '—'}`, rect(infoX, cardY + 33 * u, infoW, 13 * u), 11, C.ink, { align, semanticId: 'commander-hp-' + side });
      const meterX = x + edge;
      const meterW = cardW - 2 * edge;
      const rallyText = p.unknown ? t('fogUnknown') : `${t('meter')} ${p.meter}/${spec.meter} · ${say(spec.art)}`;
      label(kit, rallyText, rect(meterX, cardY + (narrow ? 46 : 48) * u, meterW, (narrow ? 27 : 19) * u), narrow ? 10 : 9.5, C.soft, { align, wrap: true, semanticId: 'commander-rally-' + side });
      meter(kit, rect(meterX, cardY + cardH - 8 * u, meterW, 5 * u), p.unknown ? 0 : p.meter / spec.meter, C.gold, side === 1);
    });
    layout.topBottom = cardY + cardH + 3 * u;
  }

  function drawTile() {
    if (!tileState) { layout.tileTop = null; return clearGroup('tile'); }
    const info = tileState, kit = resetGroup('tile');
    const { safe, margin: m, unit: u, narrow, cardsBottom } = layout;
    const w = Math.min((narrow ? 126 : 145) * u, (safe.width - 3 * m) * 0.38);
    let rows = [];
    const name = info.building ? say(BUILDINGS[info.building.kind]) : say(TERRAIN[info.terrain]);
    const def = info.building ? 0 : TERRAIN[info.terrain].defence;
    if (info.unknown) rows = [[t('fogUnknown'), C.soft]];
    else if (info.building) {
      const b = info.building;
      if (b.owner === -2) rows = [[t('destroyed'), C.soft]];
      else {
        const who = b.owner < 0 ? t('neutral') : b.owner === info.human ? t('you') : t('foe');
        rows.push([`${t('owner')}：${who}${b.owner >= 0 ? ` · ${t('hp')} ${b.hp}` : ''}`, b.owner >= 0 ? TEAM(TEAMS[b.owner].css) : C.soft]);
        if (BUILDINGS[b.kind].income) rows.push([t('income', { n: BUILDINGS[b.kind].income }), C.goldDeep]);
      }
    }
    const h = (42 + rows.length * 23) * u, x = safe.x + m, y = cardsBottom - h;
    layout.tileTop = y;
    card(kit, rect(x, y, w, h));
    label(kit, name, rect(x + 8 * u, y + 4 * u, w - 16 * u, 18 * u), 14, C.ink, { semanticId: 'terrain' });
    label(kit, stars(def), rect(x + 8 * u, y + 23 * u, w - 16 * u, 16 * u), 13, def < 0 ? 0x8a2f6b : C.goldDeep, { semanticId: 'terrain-defence' });
    rows.forEach(([text, color], i) => label(kit, text, rect(x + 8 * u, y + (40 + i * 23) * u, w - 16 * u, 23 * u), 11, color, { wrap: true, semanticId: 'terrain-detail-' + i }));
  }

  function drawUnit() {
    if (!unitState) { layout.unitTop = null; return clearGroup('unit'); }
    const unit = unitState.unit, spec = UNITS[unit.type], kit = resetGroup('unit');
    const team = TEAM(TEAMS[unit.owner].css);
    const { safe, margin: m, gap, cardsBottom, unit: u, narrow } = layout;
    const w = Math.min((narrow ? 215 : 267) * u, (safe.width - 2 * m - gap) * 0.62);
    const title = unit.type === 'commander' ? say(COMMANDERS[unit.commander]) : say(spec);
    const critical = spec.crit ? `${t('critRule')}：${t('rule_' + spec.crit.rule)}（×${spec.crit.power}）`
      : unit.type === 'commander' ? `${t('art')}：${say(COMMANDERS[unit.commander].art)}` : '';
    const cargo = unit.cargo?.length ? unit.cargo.map((entry) => say(UNITS[entry.type])).join('、') : '';
    const range = spec.weapon ? `${t('range')} ${spec.weapon.min === spec.weapon.max ? spec.weapon.max : spec.weapon.min + '-' + spec.weapon.max}` : '';
    const stats = `♥ ${unit.hp}   ${t('move')} ${spec.steps}${range ? (narrow ? '\n' : '   ') + range : ''}`;
    const h = (critical ? 99 : 63) * u + (cargo ? 19 * u : 0);
    const x = safe.x + safe.width - m - w, y = cardsBottom - h;
    layout.unitTop = y;
    card(kit, rect(x, y, w, h), team);
    const p = (narrow ? 43 : 51) * u, contentX = x + p + 13 * u, contentW = w - p - 20 * u;
    face(kit, unit.type === 'commander' ? unit.commander : unit.type, rect(x + 6 * u, y + 6 * u, p, p), team);
    label(kit, title, rect(contentX, y + 4 * u, contentW, 17 * u), 14, team, { semanticId: 'unit' });
    meter(kit, rect(contentX, y + 22 * u, contentW, 7 * u), unit.hp / 100, C.green);
    label(kit, stats, rect(contentX, y + 30 * u, contentW, 25 * u), 11, C.ink, { wrap: true, semanticId: 'unit-stats' });
    if (critical) label(kit, critical, rect(x + 8 * u, y + 57 * u, w - 16 * u, 36 * u), 11, C.soft, { wrap: true, semanticId: 'unit-critical' });
    if (cargo) label(kit, cargo, rect(x + 8 * u, y + h - 19 * u, w - 16 * u, 15 * u), 11, C.soft, { wrap: true, semanticId: 'unit-cargo' });
  }

  function drawHint() {
    if (!hintState) return clearGroup('hint');
    const kit = resetGroup('hint'), { safe, gap, barTop, hintW: w, hintH, unit: u } = layout;
    const box = rect(safe.x + (safe.width - w) / 2, barTop - gap - hintH, w, hintH);
    kit.panel({ ...box, fill: C.ink, alpha: 0.94, radius: 12 * u, border: { color: C.gold, width: 1.5 * u } });
    label(kit, hintState, rect(box.x + 6 * u, box.y + 1 * u, box.width - 12 * u, box.height - 2 * u), 12, C.white, { align: 'center', wrap: true, semanticId: 'hint', semanticRole: 'status' });
  }

  function drawForecast() {
    if (!forecastState) return clearGroup('forecast');
    const f = forecastState, kit = resetGroup('forecast');
    const { safe, unit: u, margin: m, narrow } = layout;
    const w = Math.min((narrow ? 334 : 420) * u, safe.width - 2 * m), h = (narrow ? 84 : 87) * u;
    const x = safe.x + (safe.width - w) / 2, y = (layout.topBottom ?? safe.y + 72 * u) + 5 * u;
    card(kit, rect(x, y, w, h));
    const vsW = 32 * u, sideW = (w - vsW - 18 * u) / 2;
    function side(who, dmg, crit, teamValue, damageLabel, sx, role) {
      const team = TEAM(teamValue), p = (narrow ? 31 : 35) * u;
      face(kit, who.model, rect(sx, y + 6 * u, p, p), team);
      label(kit, who.name, rect(sx + p + 5 * u, y + 5 * u, sideW - p - 7 * u, 19 * u), 12, team, { semanticId: 'forecast-' + role });
      label(kit, `♥ ${who.hp}`, rect(sx + p + 5 * u, y + 22 * u, sideW - p - 7 * u, 15 * u), 12, C.ink, { semanticId: 'forecast-hp-' + role });
      label(kit, damageLabel, rect(sx, y + 39 * u, sideW, 16 * u), 11, C.soft, { semanticId: 'forecast-label-' + role });
      label(kit, dmg, rect(sx, y + 54 * u, sideW * 0.62, 24 * u), narrow ? 18 : 20, crit ? C.orange : C.ink, { semanticId: role === 'attacker' ? 'forecast-deal' : 'forecast-counter' });
      if (crit) label(kit, t('critical'), rect(sx + sideW * 0.68, y + 54 * u, sideW * 0.32, 24 * u), 11, C.orange, { align: 'right', semanticId: 'forecast-critical-' + role });
    }
    side(f.attacker, `${f.min}-${f.max}%`, f.critical, f.attackerTeam, t('deal'), x + 8 * u, 'attacker');
    label(kit, 'VS', rect(x + 8 * u + sideW, y, vsW, h), 17, C.goldDeep, { align: 'center' });
    side(f.defender, f.counter ? `${f.counter.min}-${f.counter.max}%` : '—', f.counterCritical && !!f.counter, f.defenderTeam, f.counter ? t('take') : t('noCounter'), x + 8 * u + sideW + vsW, 'defender');
  }

  function drawMenu({ forceIndex, focus = true } = {}) {
    if (!menu) return;
    const current = menu;
    const kit = resetGroup('menu', '-' + current.serial);
    const { safe, unit: u, tap, margin: m, gap, narrow } = layout;
    const titleH = current.title ? 26 * u : 0;
    const rowH = Math.max(tap, 48 * u), inset = 6 * u, spacing = 4 * u;
    const recruiting = current.items.some((item) => item.icon);
    const portraitMenu = recruiting && layout.portrait && safe.width < 650 * u;
    const middleTop = (layout.topBottom ?? safe.y + 110 * u) + gap;
    const middleBottom = Math.min(layout.unitTop ?? layout.cardsBottom - 104 * u, layout.cardsBottom - 104 * u) - gap;
    const room = middleBottom - middleTop;
    const protectPortrait = portraitMenu && room >= (rowH + spacing) * 3 + titleH + 2 * inset;
    const minY = protectPortrait ? middleTop : safe.y + m;
    const maxY = protectPortrait ? middleBottom : safe.y + safe.height - m;
    const availableH = maxY - minY - 2 * inset - titleH;
    const oneColumn = Math.max(1, Math.floor((availableH + spacing) / (rowH + spacing)));
    const cols = !narrow && current.items.length > oneColumn && safe.width >= 560 * u ? 2 : 1;
    const paged = current.items.length > oneColumn * cols;
    const rowCount = paged
      ? Math.max(1, Math.floor((availableH - rowH + spacing - gap) / (rowH + spacing)))
      : Math.max(1, Math.ceil(current.items.length / cols));
    const capacity = rowCount * cols, pageCount = Math.max(1, Math.ceil(current.items.length / capacity));
    const index = forceIndex ?? current.focusIndex;
    current.page = index == null ? clamp(current.page, 0, pageCount - 1) : Math.floor(index / capacity);
    current.page = clamp(current.page, 0, pageCount - 1);
    const start = current.page * capacity;
    const entries = current.items.slice(start, start + capacity);
    const rows = Math.ceil(entries.length / cols);
    const width = Math.min(safe.width - 2 * m, ((cols === 2 ? 540 : 278) + (current.items.some((item) => item.icon) ? 26 : 0)) * u);
    const height = 2 * inset + titleH + rows * rowH + Math.max(0, rows - 1) * spacing + (paged ? rowH + gap : 0);
    const anchor = current.at ? host.project(current.at.x, current.at.y) : null;
    const preferred = anchor ? (anchor.x + 20 * u + width <= safe.x + safe.width - m ? anchor.x + 20 * u : anchor.x - width - 20 * u) : safe.x + (safe.width - width) / 2;
    let rightLimit = safe.x + safe.width - m - width;
    // Keep the recruited unit's miniature and statistics visible while inspecting options.
    if (recruiting && !portraitMenu) {
      const reserveW = Math.min((narrow ? 215 : 267) * u, (safe.width - 2 * m - gap) * 0.62);
      const beforeUnit = safe.x + safe.width - m - reserveW - gap - width;
      if (beforeUnit >= safe.x + m) rightLimit = Math.min(rightLimit, beforeUnit);
    }
    const x = clamp(preferred, safe.x + m, rightLimit);
    const y = clamp((anchor?.y ?? (minY + maxY) / 2) - height / 2, minY, maxY - height);
    card(kit, rect(x, y, width, height), undefined, { block: true });
    if (current.title) label(kit, current.title, rect(x + inset, y + inset, width - 2 * inset, titleH), 13, C.soft, { align: 'center', semanticId: 'menu-title' });
    const columnW = (width - 2 * inset - (cols - 1) * spacing) / cols;
    const itemsByIndex = new Map();
    const first = entries.findIndex((item) => !item.disabled);
    const inspect = entries.findIndex((item) => !item.disabled || item.focusable);
    const defaultIndex = start + Math.max(0, first >= 0 ? first : inspect);
    current.handles = itemsByIndex;
    entries.forEach((item, offset) => {
      const i = start + offset, row = Math.floor(offset / cols), column = offset % cols;
      const inspectable = !item.disabled || item.focusable;
      const b = kit.button({
        id: 'row-' + i, name: item.label, text: item.label, sub: item.note, icon: item.icon ? PORTRAIT(item.icon) : undefined,
        ...rect(x + inset + column * (columnW + spacing), y + inset + titleH + row * (rowH + spacing), columnW, rowH),
        enabled: inspectable, primary: false,
        muted: !!item.disabled && !!item.focusable,
        onActivate: () => {
          if (item.disabled) { item.onRefuse?.(); return; }
          closeMenu(item.key ?? null);
        },
        onFocus: () => {
          if (menu !== current) return;
          current.focusIndex = i;
          item.onFocus?.();
        }
      });
      if (item.disabled && item.focusable) b.root.alpha = 0.66;
      itemsByIndex.set(i, b);
    });
    function changePage(page) {
      if (menu !== current || page < 0 || page >= pageCount) return;
      current.page = page;
      current.focusIndex = null;
      drawMenu({ focus: true });
      host.requestPublish?.();
    }
    if (paged) {
      const pagerY = y + height - inset - rowH, pagerW = (width - 2 * inset - spacing) / 2;
      const prev = kit.button({ id: 'previous-page', text: '‹ ' + (current.page + 1) + '/' + pageCount, name: t('previousPage'), ...rect(x + inset, pagerY, pagerW, rowH), enabled: current.page > 0, onActivate: () => changePage(current.page - 1) });
      const next = kit.button({ id: 'next-page', text: (current.page + 1) + '/' + pageCount + ' ›', name: t('nextPage'), ...rect(x + inset + pagerW + spacing, pagerY, pagerW, rowH), enabled: current.page + 1 < pageCount, onActivate: () => changePage(current.page + 1) });
      current.pagers = [prev, next];
    } else current.pagers = [];
    const nextIndex = index != null && itemsByIndex.has(index) && (!current.items[index].disabled || current.items[index].focusable) ? index : defaultIndex;
    if (focus && itemsByIndex.has(nextIndex)) {
      current.focusIndex = nextIndex;
      itemsByIndex.get(nextIndex).focus();
    }
  }
  function closeMenu(value = null) {
    if (!menu) return;
    const previous = menu;
    menu = null;
    clearGroup('menu');
    refreshButtonState();
    host.blurToBoard?.();
    previous.resolve(value);
    host.requestPublish?.();
  }

  function createMarker(parent, prefix) {
    const sprite = new Sprite();
    parent.addChild(sprite);
    return { sprite, kit: createKit(host, sprite, { prefix }), active: false };
  }
  const markerLayer = groups.get('markers').layer;
  const MAX_BADGES = 320; // the largest board has 20 × 16 positions, one visible unit per tile.
  function borrowBadge(team) {
    let free = badgeFree.findIndex((entry) => entry.team === team);
    if (free < 0 && badgeCount >= MAX_BADGES && badgeFree.length) {
      const old = badgeFree.pop();
      old.kit.dispose();
      markerLayer.removeChild(old.sprite);
      badgeCount--;
    }
    if (free >= 0) return badgeFree.splice(free, 1)[0];
    if (badgeCount >= MAX_BADGES) return null;
    const marker = createMarker(markerLayer, 'hud-badge-' + badgeSerial++);
    badgeCount++;
    marker.team = team;
    const background = marker.kit.panel({ ...rect(-15, -13, 30, 20), fill: TEAM(team), radius: 8, border: { color: C.ink, width: 2 } });
    const dot = marker.kit.panel({ ...rect(-6, -6, 12, 12), fill: TEAM(team), radius: 12, border: { color: C.ink, width: 1.5 } });
    const text = marker.kit.label({ text: '—', ...rect(-17, -13, 34, 20), size: 12, color: C.white, weight: 800, align: 'center' });
    marker.background = background;
    marker.dot = dot;
    marker.text = text;
    marker.last = undefined;
    return marker;
  }
  function releaseBadge(marker) {
    marker.sprite.visible = false;
    badgeFree.push(marker);
  }
  function updateBadges(list) {
    const seen = new Set();
    for (const b of list) {
      seen.add(b.id);
      let marker = badgeActive.get(b.id);
      if (marker && marker.team !== b.team) {
        badgeActive.delete(b.id);
        releaseBadge(marker);
        marker = null;
      }
      if (!marker) {
        marker = borrowBadge(b.team);
        if (!marker) continue;
        badgeActive.set(b.id, marker);
      }
      const p = host.project(b.x, b.y), { safe, unit: u } = layout;
      // All projected marker geometry stays in the native safe area, and never invents a DOM target.
      const visible = b.visible !== false && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= safe.x + 18 * u && p.x <= safe.x + safe.width - 18 * u && p.y >= safe.y + 14 * u && p.y <= safe.y + safe.height;
      marker.sprite.visible = visible;
      if (!visible) continue;
      marker.sprite.x = p.x;
      marker.sprite.y = p.y;
      marker.sprite.scaleX = marker.sprite.scaleY = u;
      marker.sprite.alpha = b.done ? 0.58 : 1;
      const text = (b.hp < 100 ? String(b.hp) : '') + (b.cargo ? '▣' : '');
      if (marker.last !== text) {
        marker.last = text;
        marker.background.setVisible(!!text);
        marker.dot.setVisible(!text);
        marker.text.setVisible(!!text);
        if (text) marker.text.setText(text);
      }
    }
    for (const [id, marker] of badgeActive) {
      if (!seen.has(id)) { releaseBadge(marker); badgeActive.delete(id); }
    }
    tickEffects();
  }

  const floatColors = { dmg: 0xffe9e4, big: 0xffd37a, heal: 0xb7ffbf, crit: 0xffb25a };
  const MAX_FLOATS = 40;
  function borrowFloat() {
    let slot = floatPool.find((entry) => !entry.active);
    if (!slot && floatPool.length >= MAX_FLOATS) slot = floatPool.reduce((a, b) => a.start <= b.start ? a : b);
    if (slot) { clearTimer(slot.timer); return slot; }
    slot = createMarker(markerLayer, 'hud-float-' + floatPool.length);
    slot.back = slot.kit.panel({ ...rect(-32, -15, 64, 30), fill: C.ink, alpha: 0.82, radius: 14 });
    slot.text = slot.kit.label({ text: '—', ...rect(-45, -15, 90, 30), size: 23, color: C.white, weight: 800, align: 'center' });
    floatPool.push(slot);
    return slot;
  }
  function startFloat(text, x, y, kind) {
    const slot = borrowFloat();
    slot.active = true;
    slot.start = now();
    slot.duration = kind === 'crit' ? 900 : 1100;
    slot.x = x; slot.y = y; slot.kind = kind;
    slot.text.setText(text, { color: floatColors[kind] ?? C.white, size: kind === 'big' ? 29 : kind === 'crit' ? 20 : 22 });
    const width = Math.max(44, Array.from(text).length * (kind === 'big' ? 19 : 15) + 10);
    slot.back.setRect(rect(-width / 2, -15, width, 30));
    slot.text.setRect(rect(-width / 2, -15, width, 30));
    slot.sprite.visible = true;
    slot.timer = after(slot.duration, () => { slot.active = false; slot.sprite.visible = false; host.requestPublish?.(); });
    tickEffects();
  }

  function drawToasts() {
    if (!toastQueue.length) return clearGroup('toast');
    const kit = resetGroup('toast');
    const { safe, margin: m, unit: u } = layout;
    for (const notice of toastQueue) notice.parts = null;
    const forecastWidth = Math.min((layout.narrow ? 334 : 420) * u, safe.width - 2 * m);
    const besideForecast = forecastState && (safe.width - forecastWidth) / 2 - m >= 180 * u;
    let maxW = Math.min(330 * u, safe.width - 2 * m);
    if (besideForecast) maxW = Math.min(maxW, (safe.width - forecastWidth) / 2 - m - 5 * u);
    let y = (layout.topBottom ?? safe.y + 76 * u) + (forecastState && !besideForecast ? 98 * u : 6 * u);
    const bottom = Math.min(layout.tileTop ?? layout.cardsBottom, layout.unitTop ?? layout.cardsBottom) - 5 * u;
    const notices = [...toastQueue].reverse();
    for (const [i, notice] of notices.entries()) {
      const width = Math.min(maxW, Math.max(112 * u, notice.text.length * 8.4 * u + 16 * u));
      const height = notice.text.length > 35 || notice.text.length * 7 * u > width - 12 * u ? 42 * u : 29 * u;
      // If the target forecast occupies the last strip, keep the newest notice above the lower cards.
      if (y + height > bottom) {
        if (i > 0) break;
        y = Math.max((layout.topBottom ?? safe.y + 76 * u) + 5 * u, bottom - height);
      }
      const box = rect(safe.x + safe.width - m - width, y, width, height);
      const pane = card(kit, box, notice.kind === 'good' ? C.blue : notice.kind === 'bad' ? C.red : undefined, { fill: notice.kind === 'gold' ? C.gold : C.paper, radius: 11 });
      const words = label(kit, notice.text, rect(box.x + 6 * u, box.y, box.width - 12 * u, box.height), 13, C.ink, { align: 'center', wrap: true, semanticId: 'toast-' + i, semanticRole: 'status' });
      notice.parts = [pane.root, pane.shadow.root, words.root].map(node => ({ node, x: node.x }));
      y += height + 6 * u;
    }
  }
  function startToast(text, kind) {
    const notice = { text, kind, start: now(), parts: null };
    const limit = 5;
    if (toastQueue.length === limit) {
      clearTimer(toastQueue.shift().timer);
    }
    toastQueue.push(notice);
    notice.timer = after(2700, () => {
      const i = toastQueue.indexOf(notice);
      if (i >= 0) toastQueue.splice(i, 1);
      drawToasts();
      host.requestPublish?.();
    });
    drawToasts();
    host.requestPublish?.();
  }
  function drawBanner() {
    if (!bannerState) return clearGroup('banner');
    const kit = resetGroup('banner');
    const { safe, unit: u, narrow } = layout;
    const height = (narrow ? 82 : 98) * u, width = safe.width;
    const box = rect(safe.x, safe.y + (safe.height - height) * 0.42, width, height);
    kit.panel({ ...box, fill: C.ink, alpha: 0.96, border: { color: TEAM(bannerState.team), width: 3 * u } });
    label(kit, bannerState.title, rect(box.x + 12 * u, box.y + 6 * u, width - 24 * u, height * 0.55), narrow ? 28 : 34, C.white, { align: 'center', wrap: true, semanticId: 'banner-title', semanticRole: 'status' });
    label(kit, bannerState.sub ?? '', rect(box.x + 10 * u, box.y + height * 0.58, width - 20 * u, height * 0.34), 16, TEAM(bannerState.team), { align: 'center', wrap: true, ...(bannerState.sub ? { semanticId: 'banner-sub', semanticRole: 'status' } : {}) });
  }
  function finishBanner() {
    if (!bannerState) return;
    const state = bannerState;
    bannerState = null;
    clearTimer(state.timer);
    groups.get('banner').layer.x = 0;
    groups.get('banner').layer.alpha = 1;
    clearGroup('banner');
    state.resolve();
    host.requestPublish?.();
  }
  function tickEffects() {
    const time = now(), { safe, unit: u } = layout;
    for (const slot of floatPool) {
      if (!slot.active) continue;
      const p = host.project(slot.x, slot.y), elapsed = clamp((time - slot.start) / slot.duration, 0, 1);
      slot.sprite.x = clamp(p.x, safe.x + 45 * u, safe.x + safe.width - 45 * u);
      slot.sprite.y = clamp(p.y - ((elapsed * 50) + (slot.kind === 'crit' ? 24 : 0)) * u, safe.y + 20 * u, safe.y + safe.height - 20 * u);
      const scale = u * (elapsed < 0.15 ? 0.65 + elapsed * 3.33 : 1.15 - 0.15 * (elapsed - 0.15) / 0.85);
      slot.sprite.scaleX = slot.sprite.scaleY = scale;
      slot.sprite.alpha = elapsed < 0.12 ? elapsed / 0.12 : clamp((1 - elapsed) / 0.74, 0, 1);
    }
    for (const notice of toastQueue) {
      if (!notice.parts) continue;
      const fade = clamp((time - notice.start - 2200) / 500, 0, 1);
      for (const { node, x } of notice.parts) {
        if (!node.isDisposed) { node.alpha = 1 - fade; node.x = x + 20 * u * fade; }
      }
    }
    if (bannerState) {
      const p = clamp((time - bannerState.start) / bannerState.duration, 0, 1), layer = groups.get('banner').layer;
      layer.x = p < 0.18 ? -safe.width * 0.60 * (1 - p / 0.18) : p > 0.80 ? safe.width * 0.6 * (p - 0.8) / 0.2 : 0;
      layer.alpha = clamp(Math.min(p / 0.18, (1 - p) / 0.2), 0, 1);
    }
  }

  function arrange() {
    if (disposed) return;
    layout = measure();
    drawBar(true);
    drawTop();
    drawTile();
    drawUnit();
    drawHint();
    drawForecast();
    drawToasts();
    drawBanner();
    // Stage geometry changed; old CSS-space world projections are stale until the next World3D frame.
    for (const marker of badgeActive.values()) marker.sprite.visible = false;
    if (menu) drawMenu();
    tickEffects();
    host.requestPublish?.();
  }
  const api = {
    top(data) {
      const key = JSON.stringify([data.turn, data.current, data.human, data.players.map(p => [p.commander, p.gold, p.hp, p.meter, p.unknown, p.alive])]);
      if (key === topKey) return;
      topKey = key; topState = data; drawTop(); drawForecast(); drawToasts(); host.requestPublish?.();
    },
    tile(info) {
      const b = info?.building;
      const key = info ? JSON.stringify([info.terrain, info.unknown, info.human, b?.kind, b?.owner, b?.hp]) : '';
      if (key === tileKey) return;
      tileKey = key; tileState = info; drawTile(); if (toastQueue.length) drawToasts(); host.requestPublish?.();
    },
    unit(info) {
      const u = info?.unit;
      const key = u ? JSON.stringify([u.type, u.owner, u.hp, u.commander, u.cargo?.map(c => c.type)]) : '';
      if (key === unitKey) return;
      unitKey = key; unitState = info; drawUnit(); if (toastQueue.length) drawToasts(); host.requestPublish?.();
    },
    hint(text) {
      if (hintState === text) return;
      hintState = text;
      layout = { ...measure(), topBottom: layout.topBottom };
      drawTile(); drawUnit(); drawHint(); host.requestPublish?.();
    },
    setCancel(show) {
      if (cancelShown === !!show) return;
      cancelShown = !!show;
      arrange();
    },
    menu(items, at, { title } = {}) {
      closeMenu();
      if (!items.length || disposed) return Promise.resolve(null);
      return new Promise((resolve) => {
        const first = items.findIndex((item) => !item.disabled);
        menu = { items, at, title, resolve, serial: ++menuSerial, page: 0, focusIndex: first >= 0 ? first : null, handles: new Map() };
        refreshButtonState();
        host.focus?.();
        drawMenu();
        host.requestPublish?.();
      });
    },
    get menuOpen() { return !!menu; },
    menuCommand(command) {
      if (!menu) return false;
      if (command === 'cancel') closeMenu();
      else if (['up', 'left', 'down', 'right', 'confirm', 'next'].includes(command)) host.commandKeys(command);
      return true;
    },
    closeMenu() { closeMenu(); },
    forecast(data) {
      const key = JSON.stringify(data);
      if (key === forecastKey) return;
      forecastKey = key; forecastState = data; drawForecast(); drawToasts(); host.requestPublish?.();
    },
    banner(title, sub, team, seconds = 1.3) {
      finishBanner();
      return new Promise((resolve) => {
        if (disposed) { resolve(); return; }
        bannerState = { title, sub, team, resolve, start: now(), duration: seconds * 1000 };
        bannerState.timer = after(bannerState.duration, finishBanner);
        drawBanner(); tickEffects(); host.requestPublish?.();
      });
    },
    toast: startToast,
    float: startFloat,
    badges: updateBadges,
    get poolStats() { return { badges: badgeCount, activeBadges: badgeActive.size, floats: floatPool.length, toasts: toastQueue.length }; },
    buttons,
    setBusy(value) { busy = !!value; refreshButtonState(); host.requestPublish?.(); },
    relabel: arrange,
    dispose() {
      if (disposed) return;
      closeMenu();
      finishBanner();
      disposed = true;
      unlayout?.();
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      for (const group of groups.values()) group.kit?.dispose();
      for (const entry of [...badgeActive.values(), ...badgeFree, ...floatPool]) entry.kit.dispose();
      badgeActive.clear(); badgeFree.length = floatPool.length = toastQueue.length = 0;
      root.dispose();
      host.requestPublish?.();
    }
  };
  const unlayout = host.registerLayout?.(arrange);
  arrange();
  return api;
}
