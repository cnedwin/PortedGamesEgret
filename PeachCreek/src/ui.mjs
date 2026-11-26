// The scenery and interface share the county's 1280 × 720 design coordinates.
// The Egret surface runs at three quarters of that size.
const UNIT = 0.75;
const bridges = new WeakMap();
const words = new Set(['text', 'button', 'toggle']);
const switches = new Set(['button', 'toggle']);
const colored = new Set(['panel', 'text', 'button', 'bar']);
const badged = new Set(['panel', 'text', 'button', 'toggle']);
const read = (value) => typeof value === 'function' ? value() : value;
const styleOf = (item) => item.card !== null && typeof item.card === 'object' ? item.card : null;
const rectangle = (x, y, w, h) => ({ x, y, w, h, width: w, height: h });

/** Adds the focus and accessible names of the county's canvas controls to Egret's semantic tree. */
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
    const name = item.name ?? (switches.has(type) || item.action || item.decorate || item.clip || item.scroll || item.role || styleOf(item) ||
      item.intercept || item.invisible || item.hideText || item.visible !== undefined || item.alpha !== undefined ? '_item' + index : undefined);
    const part = { type, x: x * UNIT, y: y * UNIT, width: w * UNIT, height: h * UNIT };
    if (name !== undefined) part.name = name;
    if (type === 'panel') {
      part.children = [];
      if (item.card === true) part.card = true;
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
    if (name === undefined && colored.has(type) && item.color !== undefined) part.color = read(item.color);
    if (name === undefined && type === 'bar') part.value = read(item.value) ?? 0;
    return { item, name, parent, part, x, y, w, h };
  });
  const entries = new Map(), root = { type: 'panel', children: [] };
  for (const row of rows) {
    if (row.name === undefined) continue;
    if (entries.has(row.name)) throw new Error('Duplicate county UI name: ' + row.name);
    entries.set(row.name, row);
  }
  for (const row of rows) {
    const parent = row.parent === undefined ? root : entries.get(row.parent)?.part;
    if (parent?.type !== 'panel') throw new Error('Missing county UI parent: ' + row.parent);
    parent.children.push(row.part);
  }
  const description = { label, modal, area: 'screen', root };
  if (skin !== undefined) description.skin = {
    ...skin,
    ...(skin.radius === undefined ? {} : { radius: skin.radius * UNIT }),
    ...(skin.size === undefined ? {} : { size: skin.size * UNIT })
  };
  const signature = JSON.stringify([description, [...entries.values()].map(({ item, name }) => [
    name, !!item.action, !!item.intercept, !!item.focusable, !!item.onDisabledTap, item.badge !== undefined, item.role, !!styleOf(item)
  ])]);
  return { description, entries, signature };
}

/** Renders county screens with Egret views and keeps their pointer, keyboard and assistive actions aligned. */
export function createUi(game, semantics, onVisualChange = () => {}) {
  const layers = new Map();
  const canvas = game.canvas;
  const outline = game.sprite(undefined, game.ui);
  const buildWithSemantics = bridges.get(semantics) ?? ((_describe, build) => build());
  let nextOrder = 0, selected = null, modal = null, origin = 'pointer', keyboard = true;
  outline.touchEnabled = false;
  outline.visible = false;
  if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;

  function bounds(record, entry) {
    const native = record.describe.get(entry.name)?.().bounds;
    if (!native) return rectangle(0, 0, 0, 0);
    return rectangle((native.x - game.ui.x) / UNIT, (native.y - game.ui.y) / UNIT,
      native.width / UNIT, native.height / UNIT);
  }
  const control = ({ item }) => item.focusable || (switches.has(item.type) && !!item.action);

  function eligible(record, entry) {
    if (!entry || !record.view.shows(entry.name) || (modal !== null && record.key !== modal) ||
      read(entry.item.disabled) === true) return false;
    const rect = bounds(record, entry);
    return rect.w > 0 && rect.h > 0;
  }

  function find(name, active = false) {
    for (const record of [...layers.values()].reverse()) {
      const entry = record.entries.get(name);
      if (entry && (!active || eligible(record, entry))) return { record, entry };
    }
    return null;
  }

  function paintFocus() {
    onVisualChange();
    const record = layers.get(selected?.key), entry = record?.entries.get(selected?.name);
    if (!keyboard || !entry || !eligible(record, entry)) {
      if (outline.visible) outline.graphics.clear();
      outline.visible = false;
      return;
    }
    outline.visible = true;
    const { x, y, w, h } = bounds(record, entry);
    outline.graphics.clear()
      .lineStyle(2.25, 0x9d7438)
      .drawRoundRect((x - 2) * UNIT, (y - 2) * UNIT, (w + 4) * UNIT, (h + 4) * UNIT, 6);
    game.ui.setChildIndex(outline, game.ui.numChildren - 1);
  }

  function focus(name, { via } = {}) {
    const found = find(name, true);
    if (!found || !control(found.entry)) return false;
    selected = { key: found.record.key, name };
    if (via !== undefined) keyboard = via !== 'pointer';
    canvas.focus({ preventScroll: true });
    paintFocus();
    return true;
  }

  function activate(name, via = 'keyboard') {
    const found = find(name, true);
    const action = found?.entry.item.action;
    if (!action) return false;
    action({ via });
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
    const config = {
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
          ...(role === 'heading' ? { level: item.level ?? 2 } : {}),
          ...(switches.has(item.type) ? { disabled: read(item.disabled) === true } : {}),
          name: label || (role === 'button' || role === 'switch' || role === 'tab' ? name : ''),
          hidden: item.decorative === true || initial.hidden || !rect?.width || !rect.height ||
            ((role === 'text' || role === 'heading') && !label.trim()),
          focused: selected?.key === record.key && selected.name === name,
          bounds: rect
        };
      }
    };
    if (control(entry)) config.onFocus = () => { focus(name, { via: 'semantics' }); };
    if (definition.onActivate !== undefined) config.onActivate = () => {
      const previous = origin;
      origin = 'semantics';
      try {
        definition.onActivate();
      } finally {
        origin = previous;
      }
    };
    return config;
  }

  function bindParts(record) {
    const bindings = {};
    for (const [name, { item }] of record.entries) {
      const type = item.type, current = () => record.entries.get(name).item;
      const binding = { visible: () => read(current().visible) !== false };
      if (words.has(type)) {
        binding.text = () => {
          const part = current();
          return part.invisible || part.hideText ? '' : read(part.text) ?? '';
        };
        // The artwork may draw its own lettering. A blank engine raster is not
        // an empty accessible name when those words are present in the artwork.
        binding.label = () => {
          const part = current();
          return String(read(part.label) ?? read(part.text) ?? '');
        };
      }
      if (colored.has(type)) binding.color = () => {
        const part = current();
        if (styleOf(part)) return undefined;
        if (type === 'button' && part.onDisabledTap && read(part.disabled) === true) return record.disabledColor;
        return read(part.color);
      };
      if (switches.has(type)) binding.disabled = () => read(current().disabled) === true && !current().onDisabledTap;
      if (type === 'toggle') binding.checked = () => read(current().checked) === true;
      if (type === 'bar') binding.value = () => read(current().value);
      if (badged.has(type) && item.badge !== undefined) binding.badge = () => read(current().badge);
      if (item.action || item.intercept || item.onDisabledTap) binding.tap = () => {
        const part = current();
        if (read(part.disabled) !== true) part.action?.({ via: origin });
        else if (origin === 'pointer') part.onDisabledTap?.({ via: origin });
      };
      bindings[name] = binding;
    }
    return bindings;
  }

  function applyParts(record, view) {
    for (const [name, { item, w, h }] of record.entries) {
      const host = view.get(name);
      const style = styleOf(item);
      if (item.clip) host.clipRect = { x: 0, y: 0, width: w * UNIT, height: h * UNIT };
      else if (!item.scroll && host.clipRect !== undefined) host.clipRect = undefined;
      host.alpha = item.invisible ? 0 : read(item.alpha) ?? (style && item.type === 'button' && read(item.disabled) ? 0.58 : 1);
      if (words.has(item.type)) {
        const old = record.decorations.get(name);
        const text = host.getChildAt(old?.host === host ? 1 : 0);
        text.visible = !item.hideText;
      }
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

  function applyTransform(record, name) {
    const host = record.view.get(name), entry = record.entries.get(name);
    const { x = entry.x, y = entry.y, scale = 1 } = record.transforms.get(name) ?? {};
    host.x = x * UNIT;
    host.y = y * UNIT;
    host.scaleX = host.scaleY = scale;
  }

  function arrange() {
    for (const record of layers.values()) {
      for (const name of record.transforms.keys()) applyTransform(record, name);
      for (const { name, item } of record.entries.values()) {
        if (styleOf(item)) record.view.get(name).graphics.clear();
      }
    }
    paintFocus();
  }

  function sync() {
    const records = [...layers.values()];
    modal = records.findLast(record => record.modal)?.key ?? null;
    for (const record of records) {
      if (modal !== null && modal !== record.key) record.view.deactivate();
      else record.view.activate();
    }
    const record = layers.get(selected?.key), entry = record?.entries.get(selected?.name);
    if (!entry || !eligible(record, entry) || !control(entry)) selected = null;
    paintFocus();
    semantics?.publish();
  }

  function show(key, options) {
    const { description, entries, signature } = plan(options);
    const previous = layers.get(key);
    if (previous?.signature === signature) {
      previous.entries = entries;
      previous.view.refresh();
      applyParts(previous, previous.view);
      if (selected?.key === key && !eligible(previous, entries.get(selected.name))) selected = null;
      paintFocus();
      return previous.view;
    }
    const oldIndex = previous === undefined ? undefined : game.ui.getChildIndex(previous.root);
    previous?.view.close();
    const record = {
      key, signature, entries, modal: description.modal, order: previous?.order ?? ++nextOrder,
      disabledColor: description.skin?.disabled ?? 0x64748b,
      transforms: previous?.transforms ?? new Map(), decorations: new Map(), describe: new Map(),
      returnFocus: previous?.returnFocus ?? selected
    };
    for (const name of record.transforms.keys()) {
      if (!entries.has(name)) record.transforms.delete(name);
    }
    const insertion = game.ui.numChildren;
    record.view = buildWithSemantics(definition => semanticPart(record, definition), () => game.show(description, {
      bind: bindParts(record),
      built: view => applyParts(record, view)
    }));
    record.root = game.ui.getChildAt(insertion);
    if (oldIndex !== undefined) game.ui.setChildIndex(record.root, oldIndex);
    layers.set(key, record);
    if (oldIndex === undefined && !record.modal && modal !== null) {
      game.ui.setChildIndex(record.root, game.ui.getChildIndex(layers.get(modal).root));
    }
    record.view.refresh();
    applyParts(record, record.view);
    for (const name of record.transforms.keys()) applyTransform(record, name);
    sync();
    return record.view;
  }

  function hide(key) {
    const record = layers.get(key);
    if (!record) return;
    record.view.close();
    layers.delete(key);
    if (selected?.key === key || (selected === null && record.modal)) {
      selected = record.modal ? record.returnFocus : null;
    }
    sync();
  }

  function keydown(event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Tab') {
      keyboard = true;
      const controls = [...layers.values()].flatMap(record =>
        [...record.entries.values()].filter(entry => control(entry) && eligible(record, entry))
          .map(entry => ({ key: record.key, name: entry.name })));
      if (!controls.length) return;
      event.preventDefault();
      const from = controls.findIndex(({ key, name }) => selected?.key === key && selected.name === name);
      const next = event.shiftKey ? (from < 0 ? controls.length - 1 : from + controls.length - 1) : from + 1;
      focus(controls[next % controls.length].name, { via: 'keyboard' });
    } else if (event.key === 'Enter' || event.key === ' ') {
      keyboard = true;
      if (selected === null) return;
      event.preventDefault();
      if (!event.repeat) activate(selected.name);
      paintFocus();
    }
  }

  function pointerdown() {
    keyboard = false;
    paintFocus();
  }

  // The embedded engine takes Space in its target listener. Route focused UI controls first.
  canvas.addEventListener('keydown', keydown, true);
  canvas.addEventListener('pointerdown', pointerdown);
  return {
    show, hide, focus, activate, arrange, refreshFocus: paintFocus,
    get(name) {
      const found = find(name);
      return found?.record.view.get(name);
    },
    rect(name) {
      const found = find(name);
      return found ? bounds(found.record, found.entry) : undefined;
    },
    transform(name, transform) {
      const found = find(name);
      if (!found) return false;
      found.record.transforms.set(name, transform);
      applyTransform(found.record, name);
      paintFocus();
      return true;
    },
    blur() {
      selected = null;
      paintFocus();
    },
    get focused() { return selected?.name ?? null; },
    get modal() { return modal; },
    dispose() {
      canvas.removeEventListener('keydown', keydown, true);
      canvas.removeEventListener('pointerdown', pointerdown);
      for (const record of layers.values()) record.view.close();
      layers.clear();
      game.remove(outline);
      semantics?.publish();
    }
  };
}
