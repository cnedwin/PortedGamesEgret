// The view descriptions use the logical table's 1280 × 720 coordinates.
// Placement, safe area, and layout variants belong to the native view planner.
const bridges = new WeakMap();
const words = new Set(['text', 'button']);
const read = (value) => typeof value === 'function' ? value() : value;
const styleOf = (item) => item.card !== null && typeof item.card === 'object' ? item.card : null;
const rectangle = (x, y, w, h) => ({ x, y, w, h, width: w, height: h });

/** Adds the focus and accessible names of the table's canvas controls to Egret's semantic tree. */
export function bridgeUiSemantics(tree) {
  let current;
  // The engine retains a view's id when it rebuilds the parts for another form.
  // Keep its descriptor until the game actually closes the view, not when
  // native arrange temporarily removes/registers its semantic subtree.
  const owners = new Map();
  const bridge = Object.create(tree, {
    add: {
      value(definition) {
        const id = definition.id.split(':')[0];
        if (current && !definition.parent) {
          current.id = id;
          owners.set(id, current);
        }
        const owner = current ?? owners.get(id);
        return tree.add(owner?.describe(definition) ?? definition);
      }
    }
  });
  bridges.set(bridge, (describe, build) => {
    const previous = current;
    const owner = { describe, id: null };
    current = owner;
    try {
      const view = build();
      return { view, forget: () => owners.delete(owner.id) };
    } catch (error) {
      owners.delete(owner.id);
      throw error;
    } finally {
      current = previous;
    }
  });
  return bridge;
}

function planParts(items, frame) {
  const rows = items.map((item, index) => {
    const { type, parent } = item, w = item.w ?? item.width ?? 0, h = item.h ?? item.height ?? 0;
    const x = item.x ?? 0, y = item.y ?? 0;
    const name = item.name ?? (type === 'button' || item.decorate || item.scroll || item.role || styleOf(item) ||
      item.invisible || item.alpha !== undefined ? '_item' + index : undefined);
    // A hand uses a stable native button per tile. Its target is placed from
    // the current table geometry in applyParts; changing only the target's
    // hit rectangle on a resize must not replace its native focus or ID.
    const part = item.invisible
      ? { type, x: 0, y: 0, width: 64, height: 96 }
      : { type, x, y, width: w, height: h };
    if (name !== undefined) part.name = name;
    if (type === 'panel') {
      part.children = [];
      if (item.scroll) part.scroll = item.scroll;
    }
    if (words.has(type)) {
      part.text = name === undefined ? read(item.text) ?? '' : '';
      if (item.size !== undefined) part.size = item.size;
    }
    if (type === 'text') {
      if (item.align !== undefined) part.align = item.align;
      if (item.bold !== undefined) part.bold = item.bold;
    }
    if (type === 'button' && item.textColor !== undefined) part.textColor = item.textColor;
    if (name === undefined && item.color !== undefined) part.color = read(item.color);
    return { item, name, parent, part, w, h };
  });
  const entries = new Map(), root = {
    type: 'panel', name: '_layout', anchor: frame.anchor ?? 'center',
    width: frame.width, height: frame.height, children: []
  };
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
  return { root, entries };
}

function plan({ label, modal = false, items, skin, frame, variants = {}, table, area }) {
  const base = planParts(items, frame ?? { width: 1280, height: 720 });
  const description = { label, modal, area: area ?? (table === true ? 'screen' : 'safe'), root: base.root };
  const byVariant = new Map([['landscape', base.entries]]);
  for (const variant of ['portrait', 'tablet', 'tabletPortrait']) {
    if (!variants[variant]) continue;
    const { items: alternative, frame: box } = variants[variant];
    const planned = planParts(alternative, box ?? frame ?? { width: 1280, height: 720 });
    description[variant] = planned.root;
    byVariant.set(variant, planned.entries);
  }
  description.skin = {
    accent: 0x9d7438,
    ...skin,
    ...(skin?.radius === undefined ? {} : { radius: skin.radius }),
    ...(skin?.size === undefined ? {} : { size: skin.size })
  };
  const signature = JSON.stringify([description, [...base.entries.values()].map(({ item, name }) => [
    name, !!item.action, !!item.pointerOnly, item.role, !!styleOf(item)
  ])]);
  return { description, byVariant, signature };
}

/** Adapts table coordinates and decoration to native views; the engine owns focus. */
export function createUi(game, semantics, { board = () => null } = {}) {
  const layers = new Map();
  const canvas = game.canvas;
  const buildWithSemantics = bridges.get(semantics) ?? ((_describe, build) => ({ view: build(), forget() {} }));
  let nextOrder = 0;
  if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;
  const frontModal = () => [...layers.values()].findLast(record => record.modal);
  const publish = () => semantics?.publish();

  function entriesOf(record) {
    return record.byVariant.get(record.view?.variant ?? record.variant) ?? record.byVariant.get('landscape');
  }

  function bounds(record, entry) {
    const native = record.view.visibleRect(entry.name);
    return native ? rectangle(native.x, native.y, native.width, native.height) : undefined;
  }

  function find(name) {
    for (const record of [...layers.values()].reverse()) {
      const entry = entriesOf(record).get(name);
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
    if (name === '_layout') return {
      ...definition,
      describe: () => ({ ...definition.describe(), name: record.options.label })
    };
    const entry = entriesOf(record).get(name);
    if (!entry) return definition;
    const role = entry.item.role ?? definition.role;
    return {
      ...definition,
      role,
      describe() {
        const current = entriesOf(record).get(name);
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
    for (const [name, { item }] of record.byVariant.get('landscape')) {
      const type = item.type, current = () => entriesOf(record).get(name).item;
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
    record.variant = view.variant;
    for (const [name, { item, w, h }] of entriesOf(record)) {
      const host = view.get(name);
      const style = styleOf(item);
      host.alpha = read(item.alpha) ?? (style && item.type === 'button' && read(item.disabled) ? 0.58 : 1);
      // Keep hit testing and the native focus outline; only the button's fill is hidden over a real tile.
      if (item.invisible) placeInvisible(host, item, view.rect(name));
      if (style || item.decorate) {
        let visual = record.decorations.get(name);
        if (visual?.host !== host) {
          const node = game.sprite(undefined, host);
          host.setChildIndex(node, 0);
          visual = { host, node };
          record.decorations.set(name, visual);
        }
        visual.node.visible = true;
        const rect = rectangle(0, 0, w, h);
        if (style) {
          // Keep the engine hit target and label while replacing its flat background.
          host.graphics.clear();
          const ink = visual.node.graphics.clear();
          if (style.border !== undefined) ink.lineStyle(1, style.border);
          const corner = Math.min(rect.w, rect.h, (style.radius ?? 6) * 2);
          ink.beginFill(read(item.color) ?? 0xfcf8ee).drawRoundRect(0, 0, rect.w, rect.h, corner).endFill();
        }
        item.decorate?.(visual.node, rect, host);
      } else if (record.decorations.get(name)?.host === host) {
        record.decorations.get(name).node.visible = false;
      }
    }
  }

  function placeInvisible(host, item, authored) {
    host.x = item.x;
    host.y = item.y;
    host.scaleX = item.w / authored.width;
    host.scaleY = item.h / authored.height;
    host.graphics.clear();
  }

  function placeTable(record, view) {
    const root = view.get('_layout').parent;
    const follow = record.options.table === true ||
      (record.options.table === 'exceptTabletPortrait' && view.variant !== 'tabletPortrait');
    const at = follow ? board() : null;
    if (!at) {
      root.x = root.y = root.rotation = 0;
      root.scaleX = root.scaleY = 1;
      return;
    }
    // The native view plans its panel in the screen's coordinates. Fold its
    // local origin onto the scene's board (without moving the game UI root).
    const box = view.rect('_layout');
    const angle = at.rotation * Math.PI / 180;
    const scale = at.scale;
    root.rotation = at.rotation;
    root.scaleX = root.scaleY = scale;
    root.x = at.x - (Math.cos(angle) * box.x - Math.sin(angle) * box.y) * scale;
    root.y = at.y - (Math.sin(angle) * box.x + Math.cos(angle) * box.y) * scale;
  }

  function arrange() {
    for (const record of layers.values()) {
      placeTable(record, record.view);
      for (const { name, item } of entriesOf(record).values()) {
        if (item.invisible) placeInvisible(record.view.get(name), item, record.view.rect(name));
        else if (styleOf(item)) record.view.get(name).graphics.clear();
      }
    }
    publish();
  }

  function show(key, options) {
    const { description, byVariant, signature: layoutSignature } = plan(options);
    const signature = JSON.stringify([layoutSignature, options.initialFocus, !!options.dismiss, !!options.resume]);
    const previous = layers.get(key);
    if (previous?.signature === signature) {
      previous.options = options;
      previous.pending = null;
      previous.byVariant = byVariant;
      previous.view.refresh();
      applyParts(previous, previous.view);
      placeTable(previous, previous.view);
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
      for (const [name, { item }] of entriesOf(previous)) {
        if (item.scroll) scrollOffsets.set(name, previous.view.scroll(name).offset);
      }
    }
    const oldIndex = previous === undefined ? undefined : game.ui.getChildIndex(previous.root);
    previous?.view.close();
    previous?.forget();
    const record = {
      key, signature, byVariant, modal: description.modal, order: previous?.order ?? ++nextOrder,
      options, pending: null, decorations: new Map()
    };
    const insertion = game.ui.numChildren;
    const built = buildWithSemantics(definition => semanticPart(record, definition), () => game.show(description, {
      bind: bindParts(record),
      built(view) {
        // This is also called by native arrange when its variant changes.
        applyParts(record, view);
        placeTable(record, view);
      },
      ...(description.modal && options.initialFocus ? { initialFocus: options.initialFocus } : {}),
      ...(description.modal && options.dismiss ? { dismiss: view => record.options.dismiss(view) } : {}),
      ...(description.modal && options.resume ? { resume: view => record.options.resume(view) } : {})
    }));
    record.view = built.view;
    record.forget = built.forget;
    record.root = game.ui.getChildAt(insertion);
    if (oldIndex !== undefined) game.ui.setChildIndex(record.root, oldIndex);
    layers.set(key, record);
    if (oldIndex === undefined && !record.modal && front) {
      game.ui.setChildIndex(record.root, game.ui.getChildIndex(front.root));
    }
    for (const [name, offset] of scrollOffsets) {
      if (entriesOf(record).get(name)?.item.scroll) record.view.scroll(name).scrollTo(offset);
    }
    if (priorFocus && entriesOf(record).has(priorFocus)) record.view.focus(priorFocus);
    if (record.modal && !document.hidden) canvas.focus({ preventScroll: true });
    record.view.refresh();
    applyParts(record, record.view);
    placeTable(record, record.view);
    publish();
    return record.view;
  }

  function hide(key) {
    const record = layers.get(key);
    if (!record) return;
    layers.delete(key);
    record.view.close();
    record.forget();
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
      if (!rect?.w || !rect.h) return undefined;
      const pixels = canvas.getBoundingClientRect();
      const frame = game.browser.frame;
      return { x: pixels.left + (rect.x + rect.w / 2) * pixels.width / frame.width,
        y: pixels.top + (rect.y + rect.h / 2) * pixels.height / frame.height };
    },
    get focused() {
      for (const record of [...layers.values()].reverse()) {
        if (record.view.focused !== undefined) return record.view.focused;
      }
      return null;
    },
    get modal() { return frontModal()?.key ?? null; },
    dispose() {
      for (const record of [...layers.values()].reverse()) {
        record.view.close();
        record.forget();
      }
      layers.clear();
      publish();
    }
  };
}
