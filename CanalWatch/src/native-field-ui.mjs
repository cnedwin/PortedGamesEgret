// Native control deck and tower picker. The rules and world geometry remain in their own modules.
import { getLanguage, t } from './i18n.mjs';
import { FIELD, PLOTS, REFUND, TOWERS, TOWER_KINDS } from './sim/data.mjs';
import { splitCallWords, splitWaveWords } from './hud-text-gate.mjs';

const INK = 0x142725, JADE = 0x274640, DEEP = 0x1b3330, IVORY = 0xffeed0,
  GOLD = 0xe8c185, DIM = 0xbcc5b4, RED = 0x9b3e2d, MUTE = 0x485650, LINE = 0x657263,
  SELECT = 0x796037, READY = 0x845f30;
const SKIN = { text: IVORY, panel: INK, panelAlpha: 0.96, button: JADE, buttonText: IVORY,
  disabled: MUTE, accent: GOLD, track: DEEP, radius: 7, size: 20 };
const clamp = (lo, hi, n) => Math.max(lo, Math.min(Math.max(lo, hi), n));
const box = (x, y, width, height) => ({ x, y, width: Math.max(1, width), height: Math.max(1, height) });
const panel = (x, y, width, height, color = INK, extra = {}) => ({
  type: 'panel', ...box(x, y, width, height), color, card: true, children: [], ...extra
});
const label = (name, x, y, width, height, text, size = 18, extra = {}) => ({
  type: 'text', ...(name ? { name } : {}), ...box(x, y, width, height), text, size, align: 'center', color: IVORY, ...extra
});
const button = (name, x, y, width, height, text, size = 18, color = JADE) => ({
  type: 'button', name, ...box(x, y, width, height), text, size, color, textColor: IVORY
});
const readColor = (value, fallback = GOLD) =>
  Number.isInteger(value) && value >= 0 && value <= 0xffffff ? value :
    typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? Number.parseInt(value.slice(1), 16) : fallback;

// Egret's ordinary label is a single line. Use a small allocation in game units
// instead of clipping long bilingual guidance when the phone changes shape.
function wrap(value, width, size, count) {
  const limit = Math.max(3, (width - 8) / size), out = [];
  for (const line of String(value ?? '').split(/\r?\n/)) {
    let row = '', weight = 0;
    const words = line.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*|\s+|[^\s]/gu) ?? [];
    function push() { if (row.trim()) out.push(row.trim()); row = ''; weight = 0; }
    for (const word of words) {
      const cost = [...word].reduce((sum, c) => sum + (/\s/.test(c) ? 0.34 : /[\x00-\x7f]/.test(c) ? 0.61 : 1.04), 0);
      if (row && weight + cost > limit && !/^\s+$/.test(word)) push();
      if (!row && /^\s+$/.test(word)) continue;
      row += word; weight += cost;
    }
    push();
  }
  return out.slice(0, count);
}
const description = (layout, parts, title) => ({
  label: title, area: 'screen', root: { type: 'panel', ...box(0, 0, layout.width, layout.height), children: parts }, skin: SKIN
});

// Allocate portions of a row without giving its contents a second coordinate system.
function row(x, y, w, h, gap, names, widths, add) {
  const available = Math.max(1, w - (names.length - 1) * gap);
  const sum = widths.reduce((a, b) => a + b, 0);
  let at = x;
  names.forEach((name, i) => {
    const cw = available * widths[i] / sum;
    add(name, at, y, cw, h);
    at += cw + gap;
  });
}

export function buildFieldUi({ layout, app, uiState, actions }) {
  const parts = [], bind = {}, safe = layout.safe, f = layout.field;
  const isPortrait = layout.mode === 'portrait', isWide = layout.mode === 'wide';
  const pad = clamp(7, 14, Math.min(safe.width, safe.height) * 0.014), gap = Math.max(5, pad * 0.65);
  const gate = name => uiState.gates?.[Number(name.slice(-1))] ?? {};
  const value = name => () => {
    if (name.startsWith('gate-')) {
      const words = gate(name).text ?? '';
      // Shorten only the wide English presentation; the native label
      // keeps the original detailed gate status for accessibility.
      return isWide && getLanguage() === 'en' ? words.replace(/^(Upper|Lower) gate/i, '$1')
        .replace(/: shut it$/, ' · close').replace(/: shut for (\d+) s$/, ' · shut $1s')
        .replace(/: ready in (\d+) s$/, ' · ready $1s') : words;
    }
    if (name === 'landing-preview') return t('landingPreview');
    if (name === 'wave') return uiState.waveText ?? uiState.wave;
    if (name === 'call') return uiState.callText ?? uiState.call;
    return uiState[name] ?? '';
  };
  const gateColor = name => {
    const info = gate(name);
    return info.shut ? 0x754034 : info.near ? READY : info.cooling ? MUTE : JADE;
  };
  const add = (name, x, y, w, h) => {
    const stat = ['silver', 'lives', 'wave'].includes(name);
    const cap = isWide ? (stat ? 24 : 28) : isPortrait ? 22 : 18;
    const size = clamp(13, cap, Math.min(h * (isWide && stat ? 0.52 : 0.43),
      w / (name === 'wave' ? 9.8 : name.startsWith('gate-') ? 10.5 : name === 'landing-preview' ? 10.8 : 7.5)));
    if (name === 'wave') {
      const waiting = () => uiState.callReady, language = getLanguage(), first = language === 'zh';
      const words = () => splitWaveWords(value(name)(), language), countW = (w - 10) * 0.28, captionW = w - 10 - countW;
      parts.push(panel(x, y, w, h, DEEP, { border: { color: LINE, width: 1 } }));
      parts.push(label('wave-caption', x + 5 + (first ? countW : 0), y, captionW, h, words().caption, size,
        { bold: true, visible: waiting() }));
      parts.push(label('wave-time', x + 5 + (first ? 0 : captionW), y, countW, h, words().value, size,
        { bold: true, visible: waiting(), semantic: false }));
      parts.push(label('wave', x + 5, y, w - 10, h, value(name)(), size, { bold: true, visible: !waiting() }));
      bind['wave-caption'] = { text: () => words().caption, visible: waiting, label: () => uiState.wave };
      bind['wave-time'] = { text: () => words().value, visible: waiting };
      bind.wave = { text: value(name), visible: () => !waiting() };
      return;
    }
    if (name === 'call') {
      const waiting = () => uiState.callReady, words = () => splitCallWords(value(name)());
      const captionW = w * 0.68, numberW = w - captionW;
      parts.push(panel(x, y, w, h, RED, { name, role: 'button', alpha: 1, children: [
        label('call-caption', 0, 0, captionW, h, words().caption, size, { bold: true, semantic: false, visible: waiting() }),
        label('call-bonus', captionW, 0, numberW, h, words().value, size, { bold: true, semantic: false, visible: waiting() }),
        label('call-running', 0, 0, w, h, words().caption, size, { bold: true, semantic: false, visible: !waiting() })
      ] }));
      bind.call = { label: () => uiState.call, tap: () => actions.call(), color: () => waiting() ? RED : MUTE };
      bind['call-caption'] = { text: () => words().caption, visible: waiting };
      bind['call-bonus'] = { text: () => words().value, visible: waiting };
      bind['call-running'] = { text: () => words().caption, visible: () => !waiting() };
      return;
    }
    if (stat) {
      parts.push(panel(x, y, w, h, DEEP, { border: { color: LINE, width: 1 } }));
      const color = name === 'silver' ? GOLD : name === 'lives' ? 0xffc2ac : IVORY;
      parts.push(label(name, x + 5, y, w - 10, h, value(name)(), size, { color, bold: true }));
      bind[name] = { text: value(name) };
      return;
    }
    parts.push(button(name, x, y, w, h, value(name)(), size));
    const action = name.startsWith('gate-') ? () => actions.gate(Number(name.slice(-1))) :
      name === 'landing-preview' ? actions.landing : actions[name];
    bind[name] = {
      text: value(name), tap: () => action?.(),
      ...(name.startsWith('gate-') ? { label: () => gate(name).label || value(name)() } :
        name === 'landing-preview' ? { label: () => t('landingPreviewName') } : {}),
      color: () => name.startsWith('gate-') ? gateColor(name) :
        name === 'call' ? (uiState.callReady ? RED : MUTE) :
          name === 'landing-preview' ? (uiState.landingPressed ? SELECT : DEEP) : JADE,
      ...(name === 'landing-preview' ? { visible: () => Boolean(uiState.landingVisible) } : {})
    };
  };
  function guide(x, y, w, h, lines) {
    const size = clamp(13, isWide ? 24 : isPortrait ? 22 : 17, h / Math.max(1, lines) * (isWide ? 0.88 : 0.65));
    const lh = h / Math.max(1, lines);
    for (let i = 0; i < lines; i++) {
      const id = i ? 'guide-' + i : 'guide';
      parts.push(label(id, x + 3, y + i * lh, w - 6, lh, '', size, { align: 'left' }));
      const words = () => wrap(uiState.guide, w, size, lines)[i] ?? '';
      bind[id] = { text: words, visible: () => Boolean(words()), color: () => readColor(uiState.guideColor) };
    }
  }

  if (isWide) {
    // A tall, narrow instrument deck stays to the left of the complete 16:9 map.
    const x = safe.x + pad, y = safe.y + pad, w = Math.max(1, f.x - safe.x - 3 * pad),
      h = safe.height - 2 * pad, inner = w - 2 * pad;
    parts.push(panel(x, y, w, h, INK, { border: { color: LINE, width: 1.5 } }));
    const statH = clamp(29, 42, h * 0.07), waveH = clamp(29, 42, h * 0.07),
      guideHeight = clamp(54, 94, h * 0.13), smallGap = Math.max(4, gap * 0.58),
      rh = clamp(38, 94, (h - 2 * pad - statH - waveH - guideHeight - 6 * smallGap) / 4);
    let top = y + pad;
    const one = (keys, weights, height = rh) => {
      row(x + pad, top, inner, height, smallGap, keys, weights, add); top += height + smallGap;
    };
    one(['silver', 'lives'], [1, 1], statH); one(['wave'], [1], waveH);
    one(['gate-0', 'gate-1'], [1, 1]); one(['call'], [1]);
    one(['speed', 'menu'], [1, 1]); one(['landing-preview'], [1]);
    guide(x + pad, top, inner, Math.max(1, y + h - pad - top), 4);
  } else {
    // Horizontal HUD in the reserved band. Portrait has one additional action row.
    const rim = isPortrait ? 3 : 5, inset = 3, rowGap = isPortrait ? 3 : 4,
      x = safe.x + rim, y = safe.y + rim, w = safe.width - 2 * rim,
      topHeight = Math.max(72, f.y - safe.y - 2 * rim), inner = w - 2 * inset,
      guideHeight = isPortrait ? 30 : 20;
    parts.push(panel(x, y, w, topHeight, INK, { border: { color: LINE, width: 1.5 } }));
    let at = y + inset;
    const one = (keys, weights, height) => {
      row(x + inset, at, inner, height, rowGap, keys, weights, add); at += height + rowGap;
    };
    if (isPortrait) {
      // A compact readout leaves 62 logical units per action in the 204-unit band.
      const available = topHeight - guideHeight - 2 * inset - 3 * rowGap,
        statH = clamp(27, 46, available - 124), rh = Math.max(33, (available - statH) / 2);
      one(['silver', 'lives', 'wave'], [1, 1, 1.65], statH);
      one(['gate-0', 'gate-1', 'call'], [1, 1, 1.25], rh);
      one(['speed', 'menu', 'landing-preview'], [0.7, 1, 1.45], rh);
    } else {
      const rh = Math.max(30, (topHeight - guideHeight - 2 * inset - 2 * rowGap) / 2);
      one(['silver', 'lives', 'wave', 'call', 'speed', 'menu'], [1, 1, 1.6, 1.6, 0.65, 0.9], rh);
      one(['gate-0', 'gate-1', 'landing-preview'], [1, 1, 1.1], rh);
    }
    guide(x + inset, at, inner, Math.max(1, y + topHeight - inset - at), isPortrait ? 2 : 1);
  }
  // The large transparent native target stays on the map coordinate; its art
  // is a separate small badge. A built tower gets only a translucent level
  // marker at its foot, so the tower silhouette and animations remain visible.
  parts.push({ type: 'panel', ...box(f.x, f.y, f.width, f.height), children: [], border: { color: LINE, width: 1 } });
  PLOTS.forEach(([px, py], i) => {
    const name = 'plot-' + i, scaleX = f.width / FIELD.width, scaleY = f.height / FIELD.height,
      scale = f.scale ?? Math.min(scaleX, scaleY);
    const nearest = Math.min(...PLOTS.filter((_, other) => other !== i)
      .map(([x, y]) => Math.max(Math.abs(x - px) * scaleX, Math.abs(y - py) * scaleY)));
    // Leave a small gap between adjacent targets, even when the entire
    // field is scaled down to a portrait screen.
    const hit = Math.min(isPortrait ? 62 : isWide ? 88 : 64, nearest * 0.94);
    const cx = clamp(safe.x + hit / 2, safe.x + safe.width - hit / 2, f.x + px * scaleX),
      cy = clamp(safe.y + hit / 2, safe.y + safe.height - hit / 2, f.y + py * scaleY);
    const emptySize = Math.min(hit * 0.8, clamp(23, 39, 37 * scale)),
      builtSize = Math.min(hit * 0.6, clamp(17, 25, 23 * scale)),
      emptyName = 'plot-mark-' + i, builtName = 'plot-builtmark-' + i, builtWord = 'plot-builtword-' + i;
    const foot = clamp(4, Math.max(4, (hit - builtSize) / 2), 12 * scale);
    const state = () => uiState.plots?.[i] ?? {};
    const emptyBadge = panel((hit - emptySize) / 2, (hit - emptySize) / 2, emptySize, emptySize, DEEP, {
      name: emptyName, alpha: 0.82, border: { color: 0xb59b6c, width: 1 },
      children: [label(null, 0, 0, emptySize, emptySize, '+', Math.max(13, emptySize * 0.50), { bold: true })]
    });
    const builtBadge = panel((hit - builtSize) / 2, (hit - builtSize) / 2 + foot, builtSize, builtSize, JADE, {
      name: builtName, alpha: 0.62, border: { color: 0xa29d7a, width: 1 },
      children: [label(builtWord, 0, 0, builtSize, builtSize, '', Math.max(11, builtSize * 0.63), { bold: true })]
    });
    parts.push({
      type: 'panel', name, role: 'button', ...box(cx - hit / 2, cy - hit / 2, hit, hit),
      label: state().label || t('plotEmpty', { n: i + 1 }),
      children: [emptyBadge, builtBadge]
    });
    bind[name] = { label: () => state().label || t('plotEmpty', { n: i + 1 }), tap: () => actions.plot(i) };
    bind[emptyName] = {
      visible: () => !state().built,
      color: () => state().selected ? SELECT : state().recommended ? READY : DEEP
    };
    bind[builtName] = { visible: () => Boolean(state().built), color: () => state().selected ? SELECT : JADE };
    bind[builtWord] = { text: () => state().built ? String(state().text ?? '') : '' };
  });
  return { description: description(layout, parts, t('stage')), bind };
}

export function buildPicker({ layout, app, uiState, picker, actions }) {
  const safe = layout.safe, f = layout.field, portrait = layout.mode === 'portrait', wide = layout.mode === 'wide',
    margin = clamp(8, 16, Math.min(safe.width, safe.height) * 0.016);
  const tower = picker.tower ?? null, empty = !tower, [px, py] = PLOTS[picker.plot] ?? PLOTS[0];
  const desiredWidth = portrait ? safe.width - 2 * margin :
    wide ? Math.min(520, Math.max(420, safe.width * 0.30)) : Math.min(390, Math.max(310, safe.width * 0.35));
  const w = Math.min(desiredWidth, safe.width - 2 * margin);
  const roomBelow = safe.y + safe.height - (f.y + f.height) - 2 * margin;
  const wantedHeight = empty ? (portrait ? 424 : wide ? 530 : 372) : (portrait ? 245 : wide ? 310 : 205);
  const allowedHeight = portrait ? Math.max(1, roomBelow) : safe.height - 2 * margin;
  const h = Math.max(1, Math.min(wantedHeight, allowedHeight));
  const ratio = clamp(0.5, 1, h / wantedHeight), pad = Math.max(6, 12 * ratio), gap = Math.max(4, 8 * ratio);
  let x, y;
  if (portrait) { x = safe.x + (safe.width - w) / 2; y = f.y + f.height + margin; }
  else if (wide && safe.x + safe.width - f.x - f.width >= w + 2 * margin) {
    x = f.x + f.width + margin; y = safe.y + margin;
  } else if (wide && roomBelow >= h) {
    x = clamp(safe.x + margin, safe.x + safe.width - w - margin, f.x + (f.width - w) / 2); y = f.y + f.height + margin;
  } else {
    const cx = f.x + px / FIELD.width * f.width, cy = f.y + py / FIELD.height * f.height;
    x = clamp(safe.x + margin, safe.x + safe.width - w - margin,
      cx > f.x + f.width * 0.55 ? cx - w - 24 : cx + 24);
    y = clamp(Math.max(safe.y + margin, f.y + margin), safe.y + safe.height - h - margin, cy - h * 0.42);
  }
  const parts = [], bind = {}, inner = w - 2 * pad;
  // Nonmodal so the action deck and other plots keep their own input. This paper
  // absorbs clicks in its blank space without adding a bogus keyboard focus item.
  parts.push(panel(x, y, w, h, INK, { name: 'picker-paper', label: t('plotName', { n: picker.plot + 1 }),
    border: { color: 0xa58b5f, width: 2 } }));
  bind['picker-paper'] = { pointerOnly: true, tap: () => {} };
  const title = empty ? t('plotName', { n: picker.plot + 1 }) : t(tower.kind) + ' · ' + t('level', { n: tower.level + 1 });
  const titleH = Math.max(24, 36 * ratio),
    actionH = portrait ? (h >= (empty ? 320 : 225) ? 62 : Math.max(30, 62 * ratio)) :
      wide ? (h >= (empty ? 420 : 290) ? 88 : Math.max(36, 88 * ratio)) : Math.max(26, 46 * ratio);
  parts.push(label('picker-heading', x + pad, y + pad, inner, titleH, title, Math.max(15, 24 * ratio), { color: GOLD, bold: true, align: 'left' }));
  const affordable = cost => (app.world?.silver ?? 0) >= cost;
  const actionRowY = y + h - pad - actionH;
  const statH = Math.max(23, (empty ? (portrait ? 88 : wide ? 96 : 76) : portrait ? 41 : 48) * ratio),
    statTop = actionRowY - gap - statH, statLines = 2, noteLines = empty ? 2 : 0,
    lineH = statH / (statLines + noteLines),
    statSize = clamp(11, portrait || wide ? 22 : 18, lineH * 0.84);
  parts.push(panel(x + pad, statTop, inner, statH, DEEP, { alpha: 0.95 }));
  const previewLine = (id, index, words, color) => {
    parts.push(label(id, x + pad + 5, statTop + index * lineH, inner - 10,
      lineH, '', statSize, { color, align: 'left' }));
    bind[id] = { text: words, visible: () => Boolean(words()) };
  };
  for (let i = 0; i < statLines; i++) {
    const id = i ? 'picker-stats-1' : 'picker-stats';
    previewLine(id, i, () => wrap(picker.stats, inner - 10, statSize, statLines)[i] ?? '', IVORY);
  }
  // The selected tower's complete description has its own readable preview;
  // avoid tiny incomplete notes underneath all four touch targets.
  for (let i = 0; i < noteLines; i++) {
    const id = i ? 'picker-note-1' : 'picker-note';
    previewLine(id, statLines + i,
      () => wrap(t((picker.previewKind ?? TOWER_KINDS[0]) + 'Note'), inner - 10, statSize, noteLines)[i] ?? '', GOLD);
  }
  const addAction = (name, xx, yy, ww, hh, words, callback, color) => {
    parts.push(button(name, xx, yy, ww, hh, '', Math.max(12, Math.min((wide ? 24 : portrait ? 22 : 19) * ratio, ww / 9))));
    bind[name] = { text: words, color, tap: callback };
  };
  if (empty) {
    const start = y + pad + titleH + gap, area = Math.max(1, statTop - gap - start),
      cardH = Math.max(1, (area - gap) / 2), cardW = (inner - gap) / 2;
    TOWER_KINDS.forEach((kind, i) => {
      const xx = x + pad + i % 2 * (cardW + gap), yy = start + Math.floor(i / 2) * (cardH + gap),
        cost = TOWERS[kind].levels[0].cost, name = 'kind-' + kind, selected = () => picker.previewKind === kind;
      const bh = Math.max(22, Math.min(cardH - Math.max(11, 23 * ratio), actionH + 3)),
        titleSize = clamp(10, (wide ? 24 : portrait ? 22 : 18) * ratio,
          (cardW - 7) / (getLanguage() === 'zh' ? 8 : wide ? 10.6 : 12));
      parts.push(panel(xx, yy, cardW, cardH, 0x243b35, { border: { color: LINE, width: 1 } }));
      parts.push(button(name, xx + 3, yy + 3, cardW - 6, bh - 3, '', titleSize));
      bind[name] = {
        text: () => (i + 1) + ' · ' + (wide && getLanguage() === 'en' ? t(kind).replace(/ tower$/i, '') : t(kind)),
        color: () => !affordable(cost) ? MUTE : selected() ? SELECT : JADE,
        label: () => t('buildFor', { tower: t(kind), cost }) + '. ' + t(kind + 'Note'),
        tap: (_state, activation) => actions.choose(kind, activation)
      };
      const priceTop = yy + bh + 1, available = Math.max(1, cardH - bh - 2),
        costSize = clamp(10, (wide ? 22 : portrait ? 20 : 17) * ratio, available * 0.78);
      parts.push(label(null, xx + 5, priceTop, cardW - 10, available,
        t('silver', { n: cost }), costSize, { color: GOLD, align: 'center', bold: true }));
    });
    row(x + pad, actionRowY, inner, actionH, gap, ['build-confirm', 'cancel'], [1.65, 1], (name, xx, yy, ww, hh) => {
      if (name === 'cancel') addAction(name, xx, yy, ww, hh, () => t('cancel'), actions.cancel, () => DEEP);
      else {
        const cost = () => TOWERS[picker.previewKind ?? TOWER_KINDS[0]].levels[0].cost;
        addAction(name, xx, yy, ww, hh, () => t('confirmBuild', { cost: cost() }), actions.confirm, () => affordable(cost()) ? RED : MUTE);
      }
    });
  } else {
    const next = TOWERS[tower.kind].levels[tower.level + 1],
      at = y + pad + titleH + gap, buttonsH = Math.max(1, statTop - gap - at);
    const names = next ? ['upgrade', 'sell'] : ['sell'];
    if (!next) parts.push(label(null, x + pad, at, inner / 2, buttonsH, t('topLevel'), Math.max(13, 19 * ratio), { color: GOLD }));
    const sx = next ? x + pad : x + pad + inner / 2, sw = next ? inner : inner / 2;
    row(sx, at, sw, buttonsH, gap, names, names.map(() => 1), (name, xx, yy, ww, hh) => {
      if (name === 'upgrade') addAction(name, xx, yy, ww, hh, () => t('upgradeFor', { n: tower.level + 2, cost: next.cost }),
        actions.upgrade, () => affordable(next.cost) ? SELECT : MUTE);
      else addAction(name, xx, yy, ww, hh, () => t('sellFor', { n: Math.floor(tower.paid * REFUND) }), actions.sell, () => JADE);
    });
    addAction('cancel', x + pad, actionRowY, inner, actionH, () => t('cancel'), actions.cancel, () => DEEP);
  }
  return { description: description(layout, parts, title), bind };
}

