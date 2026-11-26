/** Small registry over the public play view handles. No independent drawing or input layer. */
export function createCanalUi(game, app, semantics) {
  const views = new Map();
  const partNames = root => {
    const result = [];
    const walk = part => {
      if (part.name) result.push(part.name);
      for (const child of part.children ?? []) walk(child);
    };
    walk(root);
    return result;
  };
  function close(id) {
    const entry = views.get(id);
    if (!entry) return;
    views.delete(id);
    entry.view.close();
  }
  function show(id, built, options = {}) {
    close(id);
    const { description, bind, initialFocus } = built;
    const { focus, ...native } = options;
    const view = game.show(description, { state: app, bind, ...(initialFocus ? { initialFocus } : {}), ...native });
    views.set(id, { view, names: new Set(partNames(description.root)), bind: bind ?? {} });
    if (focus) view.focus(focus);
    return view;
  }
  function find(name) {
    for (const { view, names } of [...views.values()].reverse()) {
      if (!view.visible || !names.has(name) || !view.shows(name)) continue;
      return view;
    }
    return null;
  }
  function rect(name) { return find(name)?.rect(name) ?? null; }
  function point(name) {
    if (!find(name)) return null;
    // Authored view.rect does not include scrolling or ancestor transforms.
    // Semantic bounds are already clipped and in actual stage coordinates.
    const snapshot = semantics.publish();
    const node = [...snapshot.nodes].reverse().find(n => n.id.endsWith(':' + name) && !n.hidden && !n.inert && n.bounds.width > 0 && n.bounds.height > 0);
    if (!node) return null;
    const r = node.bounds, box = game.canvas.getBoundingClientRect(), screen = game.screen;
    return { x: box.left + (r.x + r.width * .5) * box.width / screen.width,
      y: box.top + (r.y + r.height * .5) * box.height / screen.height };
  }
  function hit(x, y, except) {
    for (const [id, { view, names, bind }] of [...views].reverse()) {
      if (!view.visible || id === except) continue;
      for (const name of names) {
        if (!bind[name]?.tap || !view.shows(name)) continue;
        const r = view.rect(name);
        if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) return name;
      }
    }
    return null;
  }
  return {
    show, close, rect, point, hit,
    view: id => views.get(id)?.view,
    get: name => find(name)?.get(name) ?? null,
    focus: name => find(name)?.focus(name) ?? false,
    get focused() {
      return [...views.values()].reverse().find(({ view }) => view.visible && view.focused)?.view.focused ?? null;
    },
    refresh() { for (const { view } of views.values()) if (view.visible) view.refresh(); },
    clear() { for (const id of [...views.keys()].reverse()) close(id); }
  };
}

/** Keep the small plot icon separate from its richer screen-reader description.
 * The public semantic definition provides the live name without injecting DOM buttons.
 */
export function describeCanalUi(semantics, nameFor) {
  return Object.create(semantics, {
    add: { value(definition) {
      const describe = definition.describe;
      if (typeof describe !== 'function') return semantics.add(definition);
      const part = definition.id.split(':').at(-1);
      const decoration = /^plot-(mark|word|builtmark|builtword)-\d+$/.test(part);
      return semantics.add({ ...definition, ...(/^plot-\d+$/.test(part) ? {role: 'button'} : {}),
        ...(decoration ? {parent: definition.id.split(':')[0]} : {}), describe: () => {
        const data = describe();
        if (decoration) return {...data, hidden: true};
        const name = nameFor(part);
        return name ? { ...data, name } : data;
      } });
    } }
  });
}
