import { play } from '@egret/engine/play';
import { createParagraphCache } from '@egret/engine/paragraph';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createCanvasParagraphProvider } from '@egret/engine/web/paragraph';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { rpgDensity } from './render-density.mjs';

const skin = {
  panel: 0x24332b, panelAlpha: 0.99, text: 0xf1e4c8,
  button: 0x3d4033, buttonText: 0xf9e7bd, disabled: 0x353e38,
  accent: 0xca9d53, track: 0x36483b, radius: 4, size: 15, dim: 0.68
};
const bronze = { color: 0x9c8151, width: 1 };
const tierColors = { common: 0xf1e4c8, fine: 0xbce4b1, rare: 0x9cdbed, epic: 0xe0b6fb, legendary: 0xffd784 };
function createParts(onAction, density) {
  const paragraph = (size, lines) => ({
    fontFamilies: ['sans-serif'], lineHeight: Math.ceil(size * 1.35), maxLines: lines, locale: 'zh-CN', density
  });
  const bind = {};
  const scrolls = new Set();
  const collections = new Map();
  const selected = new Set();
  const action = fn => () => { onAction(); fn(); };
  const text = (name, value, { size = 15, height = 24, lines, ...options } = {}) => {
    if (name) bind[name] = { text: () => value };
    return { type: 'text', ...(name ? { name } : {}), text: name ? '' : value, size, height, ...options,
      ...(lines ? { paragraph: paragraph(size, lines) } : {}) };
  };
  const button = (name, value, tap, { size = 15, height = 44, width = 'fill', disabled = false, active = false,
    badge, description, color, ...options } = {}) => {
    if (active) selected.add(name);
    const fill = color ?? (active ? 0x6d5534 : skin.button);
    const b = { tap: action(tap), disabled: () => disabled, color: () => disabled ? skin.disabled : fill,
      ...(badge === undefined ? {} : { badge: () => badge }) };
    // Slot controls retain the original title/description arrangement, with
    // bound native text children instead of static description-driven rebuilds.
    if (description) {
      bind[name] = { ...b, label: () => value + '. ' + description };
      const detailTop = Math.min(height, Math.ceil(size + 12));
      return { type: 'panel', role: 'button', name, height, width, ...options,
        layout: 'free', card: true, border: bronze, color: skin.button,
        children: [
          text(name + '-caption', value, { size, height: Math.min(height, size + 12), width: 'fill', align: 'center', bold: true, color: skin.buttonText }),
          { ...text(name + '-description', description, { size, height: height - detailTop, width: '90%', lines: 2, color: skin.buttonText }), x: 8, y: detailTop }
        ] };
    }
    bind[name] = { ...b, text: () => value };
    return {
      type: 'button', name, text: '', height, width, size, ...options,
      border: bronze, color: skin.button
    };
  };
  const toggle = (name, value, checked, tap, { disabled = false, height = 44, width = 'fill', size = 14 } = {}) => {
    bind[name] = { tap: action(tap), disabled: () => disabled, text: () => value, checked: () => checked };
    return { type: 'toggle', name, text: '', checked: false, height, width, size };
  };
  const panel = (layout, children, options) => ({ type: 'panel', layout, children, ...options });
  const row = (children, options = {}) => panel('row', children, options);
  const column = (children, options = {}) => panel('column', children, options);
  const image = (name, src, { width = 48, height = 48, label } = {}) => {
    if (name) bind[name] = { src: () => String(src) };
    // A bound address always takes precedence over this authored fallback.
    return { type: 'image', ...(name ? { name } : {}), src: name ? 'assets/gear/bronze-shield.webp' : String(src), width, height, ...(label ? { label } : {}) };
  };
  const collection = (name, children, options = {}) => {
    const result = column(children, { name, ...options });
    if (children.every(child => child.name)) collections.set(name, result);
    return result;
  };
  const scroll = (name, children, options = {}) => {
    scrolls.add(name);
    return collection(name, children, { width: 'fill', gap: 6, scroll: 'vertical', ...options });
  };
  const item = (name, data, { height = 84, width = 'fill' } = {}) => {
    const { name: title, description, art, tier, action: control } = data;
    const detailHeight = height - 33;
    const summaries = [text(name + '-title', title, { height: 19, size: 15, bold: true, color: tierColors[tier] ?? skin.text })];
    if (description) summaries.push(text(name + '-detail', description, {
      height: detailHeight, size: 13, lines: Math.max(1, Math.floor(detailHeight / 18)), color: 0xe1cea6
    }));
    bind[name] = { label: () => title };
    return row([
      ...(art ? [image(name + '-art', art)] : []),
      column(summaries, { width: 'fill', height: 'fill', gap: 2, justify: 'center' }),
      ...(control ? [control] : [])
    ], { name, height, width, padding: 6, gap: 8, align: 'center', card: true, color: 0x1b2922, border: bronze });
  };
  const bar = (name, value, { height = 6, width = 'fill', color = skin.accent, label } = {}) => {
    bind[name] = { value: () => Math.max(0, Math.min(1, value || 0)), ...(label ? { label: () => label } : {}) };
    return { type: 'bar', name, value: 0, height, width, color };
  };
  return { bind, scrolls, collections, selected, button, text, toggle, row, column, image, scroll, collection, item, bar };
}

const partName = id => id.slice(id.lastIndexOf(':') + 1);

// Keep current application values separate from authored descriptors. The
// engine can retain stable named row sprites as values and actions change.
const relay = (bind, names = Object.keys(bind)) => Object.fromEntries(
  names.filter(name => Object.hasOwn(bind, name)).map(name => [name, Object.fromEntries(
    Object.entries(bind[name]).map(([field, value]) => [field,
      typeof value === 'function' ? (state, ...args) => state[name][field](...args) : value])
  )])
);
const namesOf = (children, result = new Set()) => {
  for (const child of children ?? []) {
    if (child.name) result.add(child.name);
    namesOf(child.children, result);
  }
  return result;
};
// Prefer a nested collection when the enclosing scroll is also keyed: the
// wide inventory keeps its paper-doll column and independently updates gear.
const innermost = parts => [...parts.collections].filter(([name, panel]) => {
  const descendants = namesOf(panel.children);
  return ![...parts.collections.keys()].some(other => other !== name && descendants.has(other));
});
const maskRows = (part, names) => ({
  ...part, ...(part.children ? { children: names.has(part.name) ? [] : part.children.map(child => maskRows(child, names)) } : {})
});
const signature = (bind, names) => JSON.stringify([...names].filter(name => Object.hasOwn(bind, name)).sort().map(name => [
  name, Object.entries(bind[name]).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, typeof value === 'function' ? 'binding' : value])
]));

/** One on-demand Play surface for the RPG panels, with the field behind the modal. */
export function createNativeRpgUi({ host, build, backend, onAction, onFailure }) {
  const semantics = createUiSemantics({ maxNodes: 2048 });
  let game, projection, projectionSize, paragraphCache, view, viewKind, uiParts, uiDescription, paragraphDensity = 1;
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
    const portrait = { width: 390, height: 740 };
    const density = rpgDensity(landscape, portrait, host.getBoundingClientRect(), devicePixelRatio);
    paragraphDensity = density.paragraphDensity;
    game = await play({
      parent: host, ...landscape, portrait,
      pixelRatio: density.pixelRatio,
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
    view = viewKind = uiParts = uiDescription = undefined;
    projection?.dispose();
    projection = projectionSize = undefined;
    semantics.publish();
  }

  function focusName() {
    return view?.focused;
  }

  function focusPart(name) {
    // Named native focus reveals scrollable controls and avoids a semantic-tree scan.
    // A removed item may no longer have an authored part in the rebuilt view.
    return Boolean(name && view && uiParts && Object.hasOwn(uiParts.bind, name) && view.focus(name));
  }

  function updateCollections(parts, description) {
    const before = new Map(innermost(uiParts)), after = new Map(innermost(parts));
    if (before.size !== after.size || [...before.keys()].some(key => !after.has(key))) return false;
    const keys = new Set(after.keys());
    if (JSON.stringify({ ...uiDescription, root: maskRows(uiDescription.root, keys) }) !==
        JSON.stringify({ ...description, root: maskRows(description.root, keys) })) return false;
    const outside = (source, lists) => {
      const rowNames = new Set();
      for (const panel of lists.values()) namesOf(panel.children, rowNames);
      return Object.keys(source.bind).filter(name => !rowNames.has(name));
    };
    if (signature(uiParts.bind, outside(uiParts, before)) !== signature(parts.bind, outside(parts, after))) return false;
    const replacements = [];
    for (const [name, panel] of after) {
      const old = before.get(name);
      const oldNames = namesOf(old.children), newNames = namesOf(panel.children);
      if (JSON.stringify(old.children) !== JSON.stringify(panel.children) ||
          signature(uiParts.bind, oldNames) !== signature(parts.bind, newNames)) {
        replacements.push([name, panel.children, relay(parts.bind, [...newNames])]);
      }
    }
    // All unchanged controls read current values through their retained bindings.
    uiParts = parts;
    for (const [name, children, bind] of replacements) view.replaceChildren(name, children, bind);
    uiDescription = description;
    view.refresh();
    return true;
  }

  function project() {
    const key = game.screen.width + ':' + game.screen.height;
    if (projection && projectionSize === key) return;
    projection?.dispose();
    projection = createBrowserSemantics({
      semantics, canvas: game.canvas, width: game.screen.width, height: game.screen.height,
      onError: onFailure
    });
    projectionSize = key;
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
    const parts = createParts(onAction, paragraphDensity);
    const panel = build(kind, { ui: parts, width: contentWidth, height: contentHeight });
    const close = kind + '-close';
    const header = parts.row([
      parts.column([
        parts.text(kind + '-title', panel.title, { size: 22, bold: true, height: 27, color: 0xffdda1 }),
        parts.text(kind + '-subtitle', panel.subtitle, { size: 14, height: 20, color: 0xe4c887 })
      ], { width: 'fill', height: 48 }),
      parts.button(close, kind === 'inventory' ? '关闭 · Esc' : '离开 · Esc', panel.close, { width: 96 })
    ], { height: 54, gap: 8, align: 'center' });
    const root = parts.column([header, parts.column(panel.children, { width: 'fill', height: contentHeight, gap: 8 })], {
      anchor: 'center', width, height, padding, gap: 10, card: true,
      border: { color: 0xd9b879, width: 2 }
    });
    const description = { label: panel.title, modal: true, skin, root };
    const retained = previous && updateCollections(parts, description);
    if (!retained) {
      closeView();
      uiParts = parts;
      uiDescription = description;
      view = game.show(description, { state: () => uiParts.bind, bind: relay(parts.bind), paragraphCache });
      viewKind = kind;
      for (const id of parts.scrolls) if (savedOffsets.has(id)) view.scroll(id).scrollTo(savedOffsets.get(id));
    } else if (resetScroll) {
      for (const id of parts.scrolls) view.scroll(id).scrollTo(0);
    }
    project();
    game.canvas.focus({ preventScroll: true });
    for (const name of [focus, retained ? view.focused : priorFocus, panel.focus, close]) {
      if (focusPart(name)) break;
    }
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
        id, semanticId: node.id, name: node.name, role: node.role, disabled: node.disabled, inert: node.inert,
        focused: node.focused, checked: node.checked, selected: uiParts.selected.has(id),
        bounds: { x: rect.left + b.x * sx, y: rect.top + b.y * sy, width: b.width * sx, height: b.height * sy }
      };
    });
  }

  return { refresh, snapshot, focusName };
}
