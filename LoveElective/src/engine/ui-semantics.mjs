import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';

/** Existing hand-painted cards carry their names inside their hit rectangles. */
export function describePaintedHit(words, hit, fill) {
  const inside = words.filter(word => word.x + word.w > hit.x && word.x < hit.x + hit.w
    && word.y + word.h > hit.y && word.y < hit.y + hit.h);
  if (inside.length) return [...new Set(inside.map(word => word.text.trim()).filter(Boolean))].join(' · ');
  if (hit.w <= 64 && hit.h <= 40 && /^#[\da-f]{3,8}$/i.test(String(fill))) return `颜色 / Colour ${fill}`;
  if (!hit.hover) return '自定义颜色 / Custom colour';
  return '选项 / Option';
}

/** Canvas keeps pointer input; the official projection exposes the same actions to AT. */
export function createPanelSemantics(ui, stage, { width, height }) {
  const tree = createUiSemantics({ maxNodes: 4096 });
  const projection = createBrowserSemantics({
    semantics: tree, canvas: stage.canvasElement, width, height, onError: error => stage.fail(error),
  });
  const owner = stage.engine.createScope();
  const panelIds = new WeakMap();
  const entries = new Map();
  const returns = new Map();
  let serial = 0, focused, visibleFocus = false, modalStack = [], closed = false, syncing = false;
  let dirty = true, lastSignature;
  const outline = stage.group(ui.layer);
  const edges = Array.from({ length: 4 }, () => stage.rect(outline, 0xf7bd67, 1, 1));
  outline.visible = false;

  function idOf(panel) {
    if (!panelIds.has(panel)) panelIds.set(panel, `love-panel-${++serial}`);
    return panelIds.get(panel);
  }
  // Static panels do no text/tree work and no coordinate queries on a tick.
  // The short signature observes direct game assignments as well as parent
  // transforms used by the existing opening/closing animations.
  function signature() {
    const values = [ui.locked, focused, visibleFocus];
    for (const panel of ui.panels) {
      values.push(idOf(panel), panel.enabled, panel.modal, panel.w, panel.h, panel.paintRevision);
      for (let node = panel.node; node; node = node.parent) {
        values.push(node.visible, node.alpha > .001, node.x, node.y, node.scaleX, node.scaleY,
          node.rotation, node.skewX, node.skewY, node.anchorOffsetX, node.anchorOffsetY);
      }
    }
    return values.join('|');
  }
  function shown(panel) {
    if (!panel.enabled || !ui.panels.includes(panel)) return false;
    for (let node = panel.node; node; node = node.parent) if (!node.visible || node.alpha <= .001) return false;
    return true;
  }
  function box(panel, area = { x: 0, y: 0, w: panel.w, h: panel.h }) {
    try {
      const corners = [[area.x, area.y], [area.x + area.w, area.y], [area.x, area.y + area.h], [area.x + area.w, area.y + area.h]]
        .map(([x, y]) => panel.node.localToGlobal(x, y));
      const x = Math.min(...corners.map(p => p.x)), y = Math.min(...corners.map(p => p.y));
      return { x, y, width: Math.max(...corners.map(p => p.x)) - x, height: Math.max(...corners.map(p => p.y)) - y };
    } catch { return { x: 0, y: 0, width: 0, height: 0 }; }
  }
  function topModal() { return ui.panels.filter(panel => panel.modal && shown(panel)).at(-1); }
  function actionable(entry) {
    return Boolean(entry?.control && shown(entry.panel) && !entry.control.disabled && typeof entry.control.hit.tap === 'function'
      && (!topModal() || entry.panel === topModal()));
  }
  function order() {
    return [...entries.values()].filter(actionable).sort((a, b) =>
      ui.panels.indexOf(a.panel) - ui.panels.indexOf(b.panel)
      || a.control.hit.y - b.control.hit.y || a.control.hit.x - b.control.hit.x);
  }
  function tabOrder() {
    const all = order();
    return all.filter(entry => {
      if (entry.role !== 'tab') return true;
      const tabs = all.filter(other => other.role === 'tab' && other.parent === entry.parent);
      return (tabs.find(other => other.control.selected) ?? tabs[0]) === entry;
    });
  }
  function focus(id, ring = true) {
    const entry = entries.get(id);
    if (!actionable(entry)) return false;
    focused = id; visibleFocus = ring;
    return true;
  }
  function activate(id) {
    const entry = entries.get(id);
    if (ui.locked || !actionable(entry)) return;
    focus(id, visibleFocus);
    const { hit } = entry.control;
    ui.onTap?.();
    hit.tap(hit.w / 2, hit.h / 2);
    sync();
  }
  function add(wanted, id, role, parent, describe, control, panel) {
    wanted.add(id);
    let entry = entries.get(id);
    if (entry && (entry.role !== role || entry.parent !== parent)) {
      entry.node.remove(); entries.delete(id); entry = undefined;
    }
    if (!entry) {
      entry = { id, role, parent, panel, control, describe };
      entry.node = tree.add({
        id, role, parent,
        describe: () => entry.describe(),
        ...(control ? { onActivate: () => activate(id), onFocus: () => { focus(id); sync(); } } : {}),
      });
      entries.set(id, entry);
    }
    Object.assign(entry, { panel, control, describe });
    return entry;
  }
  function paintFocus() {
    const entry = entries.get(focused);
    outline.visible = visibleFocus && !ui.locked && actionable(entry);
    if (!outline.visible) return;
    const r = box(entry.panel, entry.control.hit), pad = 3, line = 2;
    const a = ui.layer.globalToLocal(r.x - pad, r.y - pad);
    const b = ui.layer.globalToLocal(r.x + r.width + pad, r.y + r.height + pad);
    const w = Math.max(1, b.x - a.x), h = Math.max(1, b.y - a.y);
    outline.x = a.x; outline.y = a.y;
    [[0, 0, w, line], [0, h - line, w, line], [0, 0, line, h], [w - line, 0, line, h]]
      .forEach(([x, y, w, h], i) => Object.assign(edges[i], { x, y, scaleX: w, scaleY: h }));
    ui.layer.setChildIndex(outline, ui.layer.numChildren - 1);
  }
  function sync() {
    if (closed || syncing) return;
    if (!dirty && signature() === lastSignature) return;
    syncing = true;
    try {
      const wanted = new Set();
      for (const panel of ui.panels) {
        const id = idOf(panel), name = panel.label || (panel.modal ? '对话框 / Dialog' : '面板 / Panel');
        add(wanted, id, panel.modal ? 'dialog' : 'group', undefined, () => ({
          name, bounds: box(panel), hidden: !shown(panel), ...(panel.modal ? { modal: true } : {}),
        }), undefined, panel);
        const groups = new Map();
        for (const c of panel.controls) if (c.role === 'tab') {
          const key = `${c.hit.y}:${c.hit.h}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(c);
        }
        for (const [key, tabs] of groups) {
          const groupId = `${id}-tabs-${key}`, contentId = `${groupId}-content`;
          add(wanted, groupId, 'tablist', id, () => ({ name: '选项 / Options', bounds: box(panel), orientation: 'horizontal', hidden: !shown(panel) }), undefined, panel);
          add(wanted, contentId, 'tabpanel', id, () => ({ name: tabs.find(c => c.selected)?.label || '内容 / Content', bounds: box(panel), hidden: !shown(panel) }), undefined, panel);
        }
        const occurrences = new Map();
        for (const c of panel.controls) {
          const occurrence = occurrences.get(c.key) ?? 0; occurrences.set(c.key, occurrence + 1);
          const controlId = `${id}-${c.key}-${occurrence}`, group = `${id}-tabs-${c.hit.y}:${c.hit.h}`;
          const tabs = c.role === 'tab' ? groups.get(`${c.hit.y}:${c.hit.h}`) : null;
          add(wanted, controlId, c.role, tabs ? group : id, () => ({
            name: c.label || '选项 / Option', bounds: box(panel, c.hit), hidden: !shown(panel),
            disabled: Boolean(c.disabled || ui.locked || typeof c.hit.tap !== 'function'), focused: focused === controlId,
            ...(tabs ? { selected: c.selected, controls: `${group}-content`, position: { index: tabs.indexOf(c) + 1, size: tabs.length } } : {}),
          }), c, panel);
        }
      }
      for (const [id, entry] of [...entries]) if (!wanted.has(id)) { entry.node.remove(); entries.delete(id); }
      // Closing nested dialogs returns to the exact opener, even after repaint.
      const nextStack = ui.panels.filter(panel => panel.modal && shown(panel)).map(idOf);
      let common = 0;
      while (modalStack[common] && modalStack[common] === nextStack[common]) common++;
      for (let i = modalStack.length - 1; i >= common; i--) {
        const previous = returns.get(modalStack[i]); returns.delete(modalStack[i]);
        if (previous && actionable(entries.get(previous))) focused = previous;
        else focused = undefined;
      }
      for (const id of nextStack.slice(common)) {
        returns.set(id, focused);
        focused = tabOrder().find(entry => idOf(entry.panel) === id)?.id;
      }
      if (nextStack.length > common) visibleFocus = true;
      modalStack = nextStack;
      if (focused && !actionable(entries.get(focused))) focused = undefined;
      // A modal may gain its first buttons after an asynchronous paint.
      if (!focused && nextStack.length) focused = tabOrder()[0]?.id;
      tree.publish();
      paintFocus();
      lastSignature = signature();
      dirty = false;
    } catch (error) { stage.fail(error); }
    finally { syncing = false; }
  }
  function key(key, event) {
    sync();
    const list = tabOrder(), entry = entries.get(focused);
    if (key === 'Tab' && list.length) {
      const backwards = Boolean(event?.payload?.shiftKey ?? event?.shiftKey);
      const at = list.findIndex(item => item.id === focused), next = at < 0 ? (backwards ? list.length - 1 : 0) : at + (backwards ? -1 : 1);
      if (next < 0 || next >= list.length) {
        if (!topModal()) { focused = undefined; visibleFocus = false; sync(); return false; }
        focus(list[(next + list.length) % list.length].id);
      } else focus(list[next].id);
      event?.preventDefault(); sync(); return true;
    }
    if (actionable(entry) && entry.role === 'tab' && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
      const tabs = order().filter(item => item.parent === entry.parent), at = tabs.indexOf(entry);
      const index = key === 'Home' ? 0 : key === 'End' ? tabs.length - 1 : (at + (key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
      event?.preventDefault(); focus(tabs[index].id); tree.publish(); tree.perform(tabs[index].id, 'activate'); return true;
    }
    if (actionable(entry) && (key === 'Enter' || key === ' ')) {
      event?.preventDefault(); tree.perform(entry.id, 'activate'); return true;
    }
    return false;
  }
  const stop = stage.onTick(() => sync());
  function dispose() {
    if (closed) return;
    closed = true; stop(); projection.dispose(); tree.dispose();
    for (const edge of edges) edge.dispose();
    outline.parent?.removeChild(outline); outline.dispose(); entries.clear(); returns.clear();
  }
  owner.use({ dispose });
  return {
    sync, key, dispose,
    invalidate() { dirty = true; sync(); },
    pointerFocus(panel, hit) {
      sync(); const entry = [...entries.values()].find(item => item.panel === panel && item.control?.hit === hit);
      if (entry) { focus(entry.id, false); sync(); }
    },
    snapshot: () => tree.snapshot,
  };
}
