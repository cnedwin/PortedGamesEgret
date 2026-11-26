import { play } from '@egret/engine/play';
import { createParagraphCache } from '@egret/engine/paragraph';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createCanvasParagraphProvider } from '@egret/engine/web/paragraph';
import { createBrowserSemantics } from '@egret/engine/web/semantics';

const skin = {
  panel: 0x24332b, panelAlpha: 0.99, text: 0xf1e4c8,
  button: 0x3d4033, buttonText: 0xf9e7bd, disabled: 0x353e38,
  accent: 0xca9d53, track: 0x36483b, radius: 4, size: 15, dim: 0.68
};
const bronze = { color: 0x9c8151, width: 1 };
const tierColors = { common: 0xf1e4c8, fine: 0xbce4b1, rare: 0x9cdbed, epic: 0xe0b6fb, legendary: 0xffd784 };
const paragraph = (size, lines) => ({
  fontFamilies: ['sans-serif'], lineHeight: Math.ceil(size * 1.35), maxLines: lines, locale: 'zh-CN'
});

function createParts(onAction) {
  const bind = {};
  const scrolls = new Set();
  const selected = new Set();
  const action = fn => () => { onAction(); fn(); };
  const text = (name, value, { size = 15, height = 24, lines, ...options } = {}) => ({
    type: 'text', ...(name ? { name } : {}), text: value, size, height, ...options,
    ...(lines ? { paragraph: paragraph(size, lines) } : {})
  });
  const button = (name, value, tap, { size = 15, height = 44, width = 'fill', disabled = false, active = false,
    badge, description, color, ...options } = {}) => {
    if (active) selected.add(name);
    bind[name] = { tap: action(tap), disabled: () => disabled, ...(badge === undefined ? {} : { badge: () => badge }) };
    return {
      type: 'button', name, text: value, height, width, size, ...options,
      border: bronze, color: color ?? (active ? 0x6d5534 : skin.button),
      ...(description ? { description, paragraph: paragraph(size, 2) } : {})
    };
  };
  const toggle = (name, value, checked, tap, { disabled = false, height = 44, width = 'fill', size = 14 } = {}) => {
    bind[name] = { tap: action(tap), disabled: () => disabled };
    return { type: 'toggle', name, text: value, checked, height, width, size };
  };
  const panel = (layout, children, options) => ({ type: 'panel', layout, children, ...options });
  const row = (children, options = {}) => panel('row', children, options);
  const column = (children, options = {}) => panel('column', children, options);
  const image = (name, src, { width = 48, height = 48, label } = {}) => {
    return { type: 'image', ...(name ? { name } : {}), src: String(src), width, height, ...(label ? { label } : {}) };
  };
  const scroll = (name, children, options = {}) => {
    scrolls.add(name);
    return column(children, { name, width: 'fill', gap: 6, scroll: 'vertical', ...options });
  };
  const item = (name, data, { height = 84, width = 'fill' } = {}) => {
    const { name: title, description, art, tier, action: control } = data;
    const detailHeight = height - 33;
    const summaries = [text(name + '-title', title, { height: 19, size: 15, bold: true, color: tierColors[tier] ?? skin.text })];
    if (description) summaries.push(text(name + '-detail', description, {
      height: detailHeight, size: 13, lines: Math.max(1, Math.floor(detailHeight / 18)), color: 0xe1cea6
    }));
    return row([
      ...(art ? [image(name + '-art', art)] : []),
      column(summaries, { width: 'fill', height: 'fill', gap: 2, justify: 'center' }),
      ...(control ? [control] : [])
    ], { height, width, padding: 6, gap: 8, align: 'center', card: true, color: 0x1b2922, border: bronze });
  };
  const bar = (name, value, { height = 6, width = 'fill', color = skin.accent, label } = {}) => ({
    type: 'bar', name, value: Math.max(0, Math.min(1, value || 0)), height, width, color, ...(label ? { label } : {})
  });
  return { bind, scrolls, selected, button, text, toggle, row, column, image, scroll, item, bar };
}

const partName = id => id.slice(id.lastIndexOf(':') + 1);

/** One on-demand Play surface for the RPG panels, with the field behind the modal. */
export function createNativeRpgUi({ host, build, backend, onAction, onFailure }) {
  const semantics = createUiSemantics({ maxNodes: 2048 });
  let game, projection, paragraphCache, view, viewKind, uiParts;
  let active = null;
  let requested = null;
  let updating = false;

  function refresh(kind, options = {}) {
    const previous = active;
    active = kind;
    host.classList.toggle('open', Boolean(kind));
    host.inert = !kind;
    const carry = requested?.kind === kind ? requested.options : undefined;
    requested = { kind, options: { ...carry, ...options } };
    if (kind !== previous || !kind) view?.deactivate();
    if (updating) return;
    updating = true;
    queueMicrotask(update);
  }

  async function update() {
    try {
      while (requested) {
        const request = requested;
        requested = null;
        if (!request.kind) {
          closeView();
          game?.browser.loop.stop();
          continue;
        }
        if (!game) await start();
        if (active === request.kind && !requested) {
          if (game.browser.loop.state === 'idle') game.browser.loop.start();
          draw(request);
        }
      }
    } catch (error) {
      requested = null;
      closeView();
      onFailure(error);
    } finally {
      updating = false;
      if (requested) refresh(requested.kind, requested.options);
    }
  }

  async function start() {
    const touch = matchMedia('(pointer: coarse)').matches;
    const landscape = touch ? { width: 780, height: 320 } : { width: 1200, height: 680 };
    game = await play({
      parent: host, ...landscape, portrait: { width: 390, height: 740 },
      fit: 'expand', backend: backend(), transparent: true, audio: false, renderMode: 'on-demand', semantics,
      arrange: () => { if (game && active) refresh(active); },
      onError: onFailure
    });
    game.canvas.tabIndex = 0;
    game.canvas.setAttribute('aria-label', '行囊与交易');
    const provider = createCanvasParagraphProvider({ families: ['sans-serif'] });
    paragraphCache = createParagraphCache(game.engine.assets, { provider });
    game.scope.use(provider);
  }

  function closeView() {
    view?.close();
    view = viewKind = uiParts = undefined;
    projection?.dispose();
    projection = undefined;
    semantics.publish();
  }

  function focusName() {
    const node = semantics.publish().nodes.find(node => node.focused);
    return node ? partName(node.id) : undefined;
  }

  function focusPart(name) {
    const node = semantics.publish().nodes.find(node => partName(node.id) === name && !node.disabled && !node.inert);
    if (node) semantics.perform(node.id, 'focus');
  }

  function draw({ kind, options: { focus, resetScroll } }) {
    const previous = viewKind === kind;
    const priorFocus = previous ? focusName() : undefined;
    const savedOffsets = new Map();
    if (previous && !resetScroll) {
      for (const id of uiParts.scrolls) savedOffsets.set(id, view.scroll(id).offset);
    }
    const safe = game.safe;
    const width = Math.max(260, Math.min(744, Math.floor(safe.width - 18)));
    const height = Math.max(240, Math.min(716, Math.floor(safe.height - 14)));
    const padding = width < 500 ? 10 : 14;
    const contentWidth = width - 2 * padding;
    const contentHeight = height - 2 * padding - 64;
    const parts = createParts(onAction);
    const panel = build(kind, { ui: parts, width: contentWidth, height: contentHeight });
    closeView();
    const close = kind + '-close';
    const header = parts.row([
      parts.column([
        parts.text(kind + '-title', panel.title, { size: 22, bold: true, height: 27, color: 0xffdda1 }),
        parts.text(kind + '-subtitle', panel.subtitle, { size: 14, height: 20, color: 0xe4c887 })
      ], { width: 'fill', height: 48 }),
      parts.button(close, kind === 'inventory' ? '关闭 · Esc' : '离开 · Esc', panel.close, { width: 96 })
    ], { height: 54, gap: 8, align: 'center' });
    view = game.show({
      label: panel.title, modal: true, skin,
      root: parts.column([header, parts.column(panel.children, { width: 'fill', height: contentHeight, gap: 8 })], {
        anchor: 'center', width, height, padding, gap: 10, card: true,
        border: { color: 0xd9b879, width: 2 }
      })
    }, { bind: parts.bind, paragraphCache });
    viewKind = kind;
    uiParts = parts;
    for (const id of parts.scrolls) {
      if (savedOffsets.has(id)) view.scroll(id).scrollTo(savedOffsets.get(id));
    }
    projection = createBrowserSemantics({
      semantics, canvas: game.canvas, width: game.screen.width, height: game.screen.height,
      onError: onFailure
    });
    game.canvas.focus({ preventScroll: true });
    focusPart(focus ?? priorFocus ?? panel.focus ?? close);
  }

  function snapshot() {
    if (!active || !view || viewKind !== active) return [];
    const rect = game.canvas.getBoundingClientRect();
    const sx = rect.width / game.screen.width;
    const sy = rect.height / game.screen.height;
    return semantics.publish().nodes.map(node => {
      const id = partName(node.id);
      const b = node.bounds;
      return {
        id, name: node.name, role: node.role, disabled: node.disabled, inert: node.inert,
        focused: node.focused, checked: node.checked, selected: uiParts.selected.has(id),
        bounds: { x: rect.left + b.x * sx, y: rect.top + b.y * sy, width: b.width * sx, height: b.height * sy }
      };
    });
  }

  return { refresh, snapshot, focusName };
}
