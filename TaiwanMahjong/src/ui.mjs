// The scenery and interface share the table's 1280 × 720 design coordinates.
// The Egret surface runs at three quarters of that size.
const UNIT = 0.75;
const bridges = new WeakMap();
const words = new Set(['text', 'button']);
const read = (value) => typeof value === 'function' ? value() : value;
const styleOf = (item) => item.card !== null && typeof item.card === 'object' ? item.card : null;
const rectangle = (x, y, w, h) => ({ x, y, w, h, width: w, height: h });

/** Adds the focus and accessible names of the table's canvas controls to Egret's semantic tree. */
export function bridgeUiSemantics(tree) {
  let current;
  const bridge = Object.create(tree, {
    add: {
      value(definition) {
        return tree.add(current?.(definition) ?? definition);
      }
    }
  });
  bridges.set(bridge, (describe, build) => {
    const previous = current;
    current = describe;
    try {
      return build();
    } finally {
      current = previous;
    }
  });
  return bridge;
}

function plan({ label, modal = false, items, skin }) {
  const rows = items.map((item, index) => {
    const { type, parent } = item, w = item.w ?? item.width ?? 0, h = item.h ?? item.height ?? 0;
    const x = item.x ?? 0, y = item.y ?? 0;
    const name = item.name ?? (type === 'button' || item.decorate || item.scroll || item.role || styleOf(item) ||
      item.invisible || item.alpha !== undefined ? '_item' + index : undefined);
    const part = { type, x: x * UNIT, y: y * UNIT, width: w * UNIT, height: h * UNIT };
    if (name !== undefined) part.name = name;
    if (type === 'panel') {
      part.children = [];
      if (item.scroll) part.scroll = item.scroll;
    }
    if (words.has(type)) {
      part.text = name === undefined ? read(item.text) ?? '' : '';
      if (item.size !== undefined) part.size = item.size * UNIT;
    }
    if (type === 'text') {
      if (item.align !== undefined) part.align = item.align;
      if (item.bold !== undefined) part.bold = item.bold;
    }
    if (type === 'button' && item.textColor !== undefined) part.textColor = item.textColor;
    if (name === undefined && item.color !== undefined) part.color = read(item.color);
    return { item, name, parent, part, w, h };
  });
  const entries = new Map(), root = { type: 'panel', children: [] };
  for (const row of rows) {
    if (row.name === undefined) continue;
    if (entries.has(row.name)) throw new Error('Duplicate table UI name: ' + row.name);
    entries.set(row.name, row);
  }
  for (const row of rows) {
    const parent = row.parent === undefined ? root : entries.get(row.parent)?.part;
    if (parent?.type !== 'panel') throw new Error('Missing table UI parent: ' + row.parent);
    parent.children.push(row.part);
  }
  const description = { label, modal, area: 'screen', root };
  description.skin = {
    accent: 0x9d7438,
    ...skin,
    ...(skin?.radius === undefined ? {} : { radius: skin.radius * UNIT }),
    ...(skin?.size === undefined ? {} : { size: skin.size * UNIT })
  };
  const signature = JSON.stringify([description, [...entries.values()].map(({ item, name }) => [
    name, !!item.action, !!item.pointerOnly, item.role, !!styleOf(item)
  ])]);
  return { description, entries, signature };
}

/** Adapts table coordinates and decoration to native views; the engine owns focus. */
export function createUi(game, semantics) {
  const layers = new Map();
  const canvas = game.canvas;
  const buildWithSemantics = bridges.get(semantics) ?? ((_describe, build) => build());
  let nextOrder = 0;
  if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;
  const frontModal = () => [...layers.values()].findLast(record => record.modal);
  const publish = () => semantics?.publish();

  function bounds(record, entry) {
    const native = record.describe.get(entry.name)?.().bounds;
    if (!native) return rectangle(0, 0, 0, 0);
    const a = game.ui.globalToLocal(native.x, native.y);
    const b = game.ui.globalToLocal(native.x + native.width, native.y + native.height);
    return rectangle(Math.min(a.x, b.x) / UNIT, Math.min(a.y, b.y) / UNIT,
      Math.abs(b.x - a.x) / UNIT, Math.abs(b.y - a.y) / UNIT);
  }

  function find(name) {
    for (const record of [...layers.values()].reverse()) {
      const entry = record.entries.get(name);
      if (entry) return { record, entry };
    }
    return null;
  }

  function focus(name) {
    const record = find(name)?.record;
    if (!record?.view.focus(name)) return false;
    canvas.focus({ preventScroll: true });
    publish();
    return true;
  }

  function semanticPart(record, definition) {
    if (!definition.parent) return {
      ...definition,
      describe: () => ({ ...definition.describe(), order: record.order })
    };
    const name = definition.id.slice(definition.id.indexOf(':') + 1);
    const entry = record.entries.get(name);
    if (!entry) return definition;
    record.describe.set(name, definition.describe);
    const role = entry.item.role ?? definition.role;
    return {
      ...definition,
      role,
      describe() {
        const current = record.entries.get(name);
        const initial = definition.describe();
        const item = current.item, rect = initial.bounds;
        const label = String(read(item.label) ?? (words.has(item.type) ? read(item.text) : initial.name) ?? '');
        return {
          ...(role === definition.role ? initial : {}),
          ...(role === 'tab' ? { selected: read(item.selected) === true } : {}),
          ...(role === 'radio' ? { checked: read(item.checked) === true } : {}),
          ...(role === 'heading' ? { level: item.level ?? 2 } : {}),
          ...(item.type === 'button' ? { disabled: read(item.disabled) === true } : {}),
          name: label || (role === 'button' || role === 'switch' || role === 'tab' ? name : ''),
          hidden: item.decorative === true || initial.hidden || !rect?.width || !rect.height ||
            ((role === 'text' || role === 'heading') && !label.trim()),
          focused: initial.focused,
          bounds: rect
        };
      }
    };
  }

  function bindParts(record) {
    const bindings = {};
    for (const [name, { item }] of record.entries) {
      const type = item.type, current = () => record.entries.get(name).item;
      const binding = {
        color: () => styleOf(current()) ? undefined : read(current().color)
      };
      if (words.has(type)) binding.text = () => current().invisible ? '' : read(current().text) ?? '';
      if (type === 'button') binding.disabled = () => read(current().disabled) === true;
      if (item.action) {
        if (type === 'panel' && item.pointerOnly) binding.pointerOnly = true;
        binding.tap = () => {
          const part = current();
          if (read(part.disabled) !== true) part.action?.();
        };
      }
      bindings[name] = binding;
    }
    return bindings;
  }

  function applyParts(record, view) {
    for (const [name, { item, w, h }] of record.entries) {
      const host = view.get(name);
      const style = styleOf(item);
      host.alpha = read(item.alpha) ?? (style && item.type === 'button' && read(item.disabled) ? 0.58 : 1);
      // Keep hit testing and the native focus outline; only the button's fill is hidden over a real tile.
      if (item.invisible) host.graphics.clear();
      if (style || item.decorate) {
        let visual = record.decorations.get(name);
        if (visual?.host !== host) {
          const node = game.sprite(undefined, host);
          host.setChildIndex(node, 0);
          visual = { host, node };
          record.decorations.set(name, visual);
        }
        visual.node.visible = true;
        const rect = rectangle(0, 0, w * UNIT, h * UNIT);
        if (style) {
          // Keep the engine hit target and label while replacing its flat background.
          host.graphics.clear();
          const ink = visual.node.graphics.clear();
          if (style.border !== undefined) ink.lineStyle(UNIT, style.border);
          const corner = Math.min(rect.w, rect.h, (style.radius ?? 6) * UNIT * 2);
          ink.beginFill(read(item.color) ?? 0xfcf8ee).drawRoundRect(0, 0, rect.w, rect.h, corner).endFill();
        }
        item.decorate?.(visual.node, rect, host);
      } else if (record.decorations.get(name)?.host === host) {
        record.decorations.get(name).node.visible = false;
      }
    }
  }

  function arrange() {
    for (const record of layers.values()) {
      for (const { name, item } of record.entries.values()) {
        if (styleOf(item) || item.invisible) record.view.get(name).graphics.clear();
      }
    }
  }

  function show(key, options) {
    const { description, entries, signature: layoutSignature } = plan(options);
    const signature = JSON.stringify([layoutSignature, options.initialFocus, !!options.dismiss, !!options.resume]);
    const previous = layers.get(key);
    if (previous?.signature === signature) {
      previous.options = options;
      previous.pending = null;
      previous.entries = entries;
      previous.view.refresh();
      applyParts(previous, previous.view);
      publish();
      return previous.view;
    }
    const front = frontModal();
    if (previous && front && front !== previous) {
      // A covered view keeps its existing engine handle until it can restore the modal's original opener.
      previous.pending = options;
      return previous.view;
    }

    const priorFocus = previous?.view.focused;
    const scrollOffsets = new Map();
    if (previous) {
      for (const [name, { item }] of previous.entries) {
        if (item.scroll) scrollOffsets.set(name, previous.view.scroll(name).offset);
      }
    }
    const oldIndex = previous === undefined ? undefined : game.ui.getChildIndex(previous.root);
    previous?.view.close();
    const record = {
      key, signature, entries, modal: description.modal, order: previous?.order ?? ++nextOrder,
      options, pending: null, decorations: new Map(), describe: new Map()
    };
    const insertion = game.ui.numChildren;
    record.view = buildWithSemantics(definition => semanticPart(record, definition), () => game.show(description, {
      bind: bindParts(record),
      built: view => applyParts(record, view),
      ...(description.modal && options.initialFocus ? { initialFocus: options.initialFocus } : {}),
      ...(description.modal && options.dismiss ? { dismiss: view => record.options.dismiss(view) } : {}),
      ...(description.modal && options.resume ? { resume: view => record.options.resume(view) } : {})
    }));
    record.root = game.ui.getChildAt(insertion);
    if (oldIndex !== undefined) game.ui.setChildIndex(record.root, oldIndex);
    layers.set(key, record);
    if (oldIndex === undefined && !record.modal && front) {
      game.ui.setChildIndex(record.root, game.ui.getChildIndex(front.root));
    }
    for (const [name, offset] of scrollOffsets) {
      if (entries.get(name)?.item.scroll) record.view.scroll(name).scrollTo(offset);
    }
    if (priorFocus && entries.has(priorFocus)) record.view.focus(priorFocus);
    if (record.modal && !document.hidden) canvas.focus({ preventScroll: true });
    record.view.refresh();
    applyParts(record, record.view);
    publish();
    return record.view;
  }

  function hide(key) {
    const record = layers.get(key);
    if (!record) return;
    layers.delete(key);
    record.view.close();
    const front = frontModal();
    for (const layer of [...layers.values()]) {
      if (layer.pending && (!front || layer === front)) show(layer.key, layer.pending);
    }
    publish();
  }

  return {
    show, hide, focus, arrange,
    view(key) { return layers.get(key)?.view; },
    get(name) {
      return find(name)?.record.view.get(name);
    },
    rect(name) {
      const found = find(name);
      return found ? bounds(found.record, found.entry) : undefined;
    },
    point(name) {
      const found = find(name);
      if (!found) return undefined;
      const rect = bounds(found.record, found.entry);
      if (!rect.w || !rect.h) return undefined;
      const anchor = game.ui.localToGlobal((rect.x + rect.w / 2) * UNIT, (rect.y + rect.h / 2) * UNIT);
      const pixels = canvas.getBoundingClientRect();
      return { x: pixels.left + anchor.x * pixels.width / game.width, y: pixels.top + anchor.y * pixels.height / game.height };
    },
    get focused() {
      for (const record of [...layers.values()].reverse()) {
        if (record.view.focused !== undefined) return record.view.focused;
      }
      return null;
    },
    get modal() { return frontModal()?.key ?? null; },
    dispose() {
      for (const record of [...layers.values()].reverse()) record.view.close();
      layers.clear();
      publish();
    }
  };
}
