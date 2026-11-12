function enhancedVisuals() {
  return document.body.dataset.visual !== 'classic';
}

const inventoryFilters = [['全部', undefined], ['道具', 0], ['裝備', 1], ['經書', 2], ['消耗品', 3], ['暗器', 4]];

export function createBattleMenu(panel, canvas, { portraitUrl: enhancedPortrait, itemIconUrl: themedItemIcon } = {}) {
  let menu;

  function portraitUrl(head) {
    const classic = `/art/head/${head}.png`;
    if (!enhancedVisuals()) return classic;
    return enhancedPortrait?.(head) ?? `/art/portrait/${head}.png`;
  }

  function itemIconUrl(id) {
    return (document.body.dataset.art === 'jyx2' && themedItemIcon?.(id)) || `/art/item/${id}.png`;
  }

  function close() {
    menu = undefined;
    panel.hidden = true;
    panel.removeAttribute('aria-labelledby');
    panel.replaceChildren();
    canvas.removeAttribute('aria-activedescendant');
  }

  function focus(index) {
    menu.index = index;
    menu.buttons.forEach((button, position) => button.classList.toggle('current', index === position));
    const button = menu.buttons[index];
    if (button) canvas.setAttribute('aria-activedescendant', button.id);
    else canvas.removeAttribute('aria-activedescendant');
    button?.scrollIntoView({ block: 'nearest' });
    menu.onFocus?.(index);
  }

  function open(title, rows, footer, columns, onCancel, options = {}) {
    const enhanced = enhancedVisuals();
    const jyx2 = document.body.dataset.art === 'jyx2';
    const inventory = jyx2 && options.variant === 'inventory';
    if (inventory) columns = 5;
    else if (jyx2 && options.variant === 'roster') columns = 2;
    panel.dataset.menuVariant = options.variant ?? 'choice';
    const heading = document.createElement('h2');
    heading.id = 'battle-menu-title';
    heading.textContent = enhanced ? options.heading ?? title : title;
    panel.setAttribute('aria-labelledby', heading.id);
    const header = document.createElement('header');
    header.className = 'battle-menu-header';
    header.append(heading);
    if (enhanced && options.detail) {
      const detail = document.createElement('p');
      detail.textContent = options.detail;
      header.append(detail);
    }
    const list = document.createElement('div');
    list.className = 'battle-menu-options';
    list.style.setProperty('--columns', columns);
    const buttons = rows.map((row, index) => {
      const button = document.createElement('button');
      button.id = `battle-option-${index}`;
      button.type = 'button';
      button.tabIndex = -1;
      Object.assign(button.dataset, row.dataset);
      if (row.icon) {
        const icon = document.createElement('img');
        icon.src = row.icon;
        icon.alt = '';
        if (enhanced && row.portrait) {
          icon.className = 'menu-portrait';
          if (row.headId !== undefined) {
            const fallback = `/art/head/${row.headId}.png`;
            if (row.icon !== fallback) {
              icon.addEventListener('error', () => { icon.src = fallback; }, { once: true });
            }
          }
        }
        if (inventory && row.dataset?.itemId !== undefined) {
          const fallback = `/art/item/${row.dataset.itemId}.png`;
          if (row.icon !== fallback) icon.addEventListener('error', () => { icon.src = fallback; }, { once: true });
        }
        button.append(icon);
      }
      const label = document.createElement('span');
      if (enhanced && row.title) {
        label.className = 'menu-option-copy';
        const name = document.createElement('span');
        name.className = 'menu-option-name';
        name.textContent = row.title;
        label.append(name);
        if (row.detail) {
          const detail = document.createElement('span');
          detail.className = 'menu-option-detail';
          detail.textContent = row.detail;
          label.append(detail);
        }
        button.setAttribute('aria-label', row.label);
      } else label.textContent = row.label;
      button.append(label);
      if (enhanced && row.trailing) {
        const trailing = document.createElement('span');
        trailing.className = 'menu-option-trailing';
        trailing.textContent = row.trailing;
        trailing.setAttribute('aria-hidden', 'true');
        button.append(trailing);
      }
      button.addEventListener('click', () => {
        focus(index);
        row.select();
        canvas.focus({ preventScroll: true });
      });
      if (inventory) button.addEventListener('pointerenter', () => focus(index));
      list.append(button);
      return button;
    });
    const controls = document.createElement('p');
    controls.className = 'battle-menu-controls';
    controls.textContent = footer;
    menu = { buttons, index: 0, columns, onCancel, keys: new Set() };
    if (inventory) {
      const filters = document.createElement('nav');
      filters.className = 'jyx2-bag-filters';
      filters.setAttribute('aria-label', '道具分類');
      const grid = document.createElement('div');
      grid.className = 'jyx2-bag-grid';
      grid.append(filters, list);
      const sidebar = document.createElement('div');
      sidebar.className = 'jyx2-bag-details';
      const itemName = document.createElement('strong');
      const itemInfo = document.createElement('p');
      const use = document.createElement('button');
      use.type = 'button';
      use.className = 'jyx2-bag-use';
      use.textContent = '使用';
      use.addEventListener('click', () => buttons[menu.index]?.click());
      sidebar.append(itemName, itemInfo, use);
      const content = document.createElement('div');
      content.className = 'jyx2-bag-content';
      content.append(sidebar, grid);
      const tabs = inventoryFilters.map(([label, type], index) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.textContent = label;
        tab.dataset.menuFilter = type === undefined ? 'all' : type;
        tab.addEventListener('click', () => setFilter(index));
        filters.append(tab);
        return tab;
      });
      function setFilter(index) {
        menu.filterIndex = index;
        const type = inventoryFilters[index][1];
        tabs.forEach((tab, position) => tab.setAttribute('aria-pressed', String(position === index)));
        buttons.forEach((button, position) => {
          const row = rows[position];
          button.hidden = row.dataset?.itemId !== undefined && type !== undefined && row.itemType !== type;
        });
        focus(buttons.findIndex(button => !button.hidden && button.dataset.itemId !== undefined));
        canvas.focus({ preventScroll: true });
      }
      menu.onFocus = index => {
        const row = rows[index];
        itemName.textContent = row?.title ?? (row?.label || '沒有符合分類的道具');
        itemInfo.textContent = [row?.detail, row?.trailing, row?.description].filter(Boolean).join('\n');
        use.disabled = row?.dataset?.itemId === undefined;
      };
      menu.cycleFilter = offset => setFilter((menu.filterIndex + offset + tabs.length) % tabs.length);
      controls.textContent += ' · [ / ] 分類';
      panel.replaceChildren(header, content, controls);
      panel.hidden = false;
      setFilter(0);
    } else {
      if (jyx2 && options.member) {
        const content = document.createElement('div');
        content.className = 'jyx2-member-content';
        const portrait = document.createElement('img');
        portrait.alt = '';
        portrait.className = 'jyx2-member-portrait';
        portrait.src = portraitUrl(options.member.headId);
        portrait.addEventListener('error', () => { portrait.src = `/art/head/${options.member.headId}.png`; }, { once: true });
        content.append(portrait, list);
        panel.replaceChildren(header, content, controls);
      } else if (jyx2 && options.variant === 'team') {
        const actions = document.createElement('div');
        actions.className = 'jyx2-team-actions';
        actions.append(...buttons.slice(-2));
        panel.replaceChildren(header, list, actions, controls);
      } else panel.replaceChildren(header, list, controls);
      panel.hidden = false;
      focus(0);
    }
    return buttons;
  }

  function chooseTeam(roles, signal) {
    return new Promise((resolve, reject) => {
      signal.throwIfAborted();
      const selected = new Set([0]);
      const abort = () => { close(); reject(signal.reason); };
      const rows = roles.map(role => ({
        label: `${role.name} · ${role.level} 級${role.id === 0 ? '（必選）' : ''}`,
        title: role.name,
        detail: [`${role.level} 級`, Number.isFinite(role.hp) ? `生命 ${role.hp}/${role.maxHp}` : '', role.id === 0 ? '必選' : '']
          .filter(Boolean).join(' · '),
        icon: portraitUrl(role.headId), headId: role.headId, portrait: true, dataset: { roleId: role.id },
        select() {
          if (role.id !== 0 && !selected.delete(role.id)) selected.add(role.id);
          refresh();
        },
      }));
      rows.push({ label: '全選 / 取消', dataset: { teamAll: '' }, select() {
        const all = roles.every(role => selected.has(role.id));
        for (const role of roles) if (role.id !== 0) {
          if (all) selected.delete(role.id);
          else selected.add(role.id);
        }
        refresh();
      } });
      rows.push({ label: '確定出戰', dataset: { teamConfirm: '' }, select() {
        signal.removeEventListener('abort', abort);
        close();
        resolve(selected);
      } });
      const buttons = open('選擇出戰隊友', rows, '方向鍵選擇 · Enter 確認選項 · A 全選 · O 出戰', 2, undefined, { variant: 'team' });
      menu.team = true;
      function refresh() {
        roles.forEach((role, index) => buttons[index].setAttribute('aria-pressed', String(selected.has(role.id))));
      }
      refresh();
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  function showItems(items, use, cancel) {
    const rows = items.map(item => ({
      label: `${item.name} × ${item.count}`, icon: itemIconUrl(item.id), dataset: { itemId: item.id },
      title: item.name, trailing: `× ${item.count}`, itemType: item.type, description: item.description,
      select() { use(item.id); },
    }));
    rows.push({ label: '返回戰鬥', select: cancel });
    open('藥品與暗器', rows, '方向鍵選擇 · Enter 使用 · Esc 返回', 1, cancel, { variant: 'inventory' });
  }

  function choose(title, choices, signal, columns = 1, options) {
    return new Promise((resolve, reject) => {
      signal.throwIfAborted();
      const abort = () => { close(); reject(signal.reason); };
      function answer(value) {
        signal.removeEventListener('abort', abort);
        close();
        resolve(value);
      }
      const rows = choices.map(row => ({ ...row, select: () => answer(row.value) }));
      if (!rows.length) rows.push({ label: '返回', select: () => answer(undefined) });
      open(title, rows, '方向鍵選擇 · Enter 確認 · Esc 取消', columns, () => answer(undefined), options);
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  function askJoin(signal, title = '是否要求加入？') {
    return choose(title, [
      { label: '是', dataset: { recruitChoice: 'yes' }, value: true },
      { label: '否', dataset: { recruitChoice: 'no' }, value: false },
    ], signal, 2);
  }

  function handleKey(code, release) {
    if (!menu) return false;
    const { buttons, index, columns, onCancel, keys } = menu;
    if (!release) {
      keys.add(code);
      const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
      if (code in offsets) {
        const visible = buttons.flatMap((button, position) => button.hidden ? [] : [position]);
        const next = Math.max(0, Math.min(visible.length - 1, visible.indexOf(index) + offsets[code]));
        focus(visible[next] ?? -1);
      }
    } else if (!keys.delete(code)) return true;
    else if (code === 'Enter' || code === 'Space') buttons[index]?.click();
    else if (code === 'KeyA' && menu.team) buttons.at(-2).click();
    else if (code === 'KeyO' && menu.team) buttons.at(-1).click();
    else if (code === 'BracketLeft') menu.cycleFilter?.(-1);
    else if (code === 'BracketRight') menu.cycleFilter?.(1);
    else if (code === 'Escape') onCancel?.();
    return true;
  }

  return { chooseTeam, showItems, choose, askJoin, close, handleKey, portraitUrl, itemIconUrl, get active() { return !!menu; } };
}
