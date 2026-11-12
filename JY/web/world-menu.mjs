const statLimits = {
  physicalPower: 100, poison: 100, medicine: 100, detoxification: 100, usePoison: 100,
  attack: 100, defence: 100, speed: 100, fist: 100, sword: 100, knife: 100, unusual: 100,
  hiddenWeapon: 100, knowledge: 100, morality: 100, antiPoison: 100, attackWithPoison: 100,
};
const clamp = (value, limit) => Math.min(limit, Math.max(0, value));
const option = (label, value, dataset, icon) => ({ label, value, dataset, icon });
const itemTypes = ['道具', '裝備', '秘籍', '藥品', '暗器'];

export async function showWorldMenu({ menu, signal, game, catalog, actions, bagOnly, canUseGear }) {
  const choose = (title, rows, options) => menu.choose(title, rows, signal, 1, options);
  const role = id => ({ ...catalog.roles[id], ...game.roleState.find(entry => entry.id === id) });
  const roleRows = (people, showHealth = false) => people.map(member => {
    const level = `${member.level} 級`;
    const health = showHealth ? ` · 生命 ${member.hp}/${member.maxHp}` : '';
    const portrait = menu.portraitUrl?.(member.headId) ?? `/art/head/${member.headId}.png`;
    return {
      ...option(`${member.name} · ${level}${health}`, member.id, { menuRole: member.id }, portrait),
      title: member.name, detail: `${level}${health}`, headId: member.headId, portrait: true,
    };
  });
  const command = bagOnly ? 'bag' : await choose('江湖選單', [
    option('查看背包', 'bag', { worldAction: 'bag' }), option('查看隊伍與武學', 'party', { worldAction: 'party' }),
    option('儲存進度', 'save', { worldAction: 'save' }), option('讀取存檔', 'load', { worldAction: 'load' }),
    option('匯入桌面存檔', 'import', { worldAction: 'import' }), option('匯出桌面存檔', 'export', { worldAction: 'export' }),
    option('開始新遊戲', 'new', { worldAction: 'new' }),
    option('返回主選單', 'title', { worldAction: 'title' }),
  ], { variant: 'world' });
  if (['save', 'load', 'import', 'export', 'new', 'title'].includes(command)) return actions[command]();

  if (command === 'party') {
    const id = await choose('隊伍', roleRows(game.party.map(role), true), { variant: 'roster' });
    if (id === undefined) return;
    const member = role(id);
    const gear = [member.weaponId, member.armorId, member.practiceItemId].map(item => catalog.items[item]?.name ?? '無');
    const stats = `生命 ${member.hp}/${member.maxHp} · 內力 ${member.mp}/${member.maxMp}`;
    const label = `${member.name} · ${stats}`;
    const selected = await choose(label, [
      {
        ...option(`兵器 ${gear[0]} · 防具 ${gear[1]} · 修煉 ${gear[2]}`, undefined),
        title: '裝備與修煉',
        detail: `兵器 ${gear[0]} · 防具 ${gear[1]} · 修煉 ${gear[2]}`,
      },
      ...(member.learnedMagics ?? []).map(magic => {
        const name = catalog.magics[magic.id]?.name ?? String(magic.id);
        const level = `${Math.trunc(magic.level / 100) + 1} 級`;
        return { ...option(`${name} · ${level}`, magic.id), title: name, trailing: level };
      }),
      ...(catalog.leaveEvents.has(id) ? [option('請隊友暫時離隊', 'leave', { worldAction: 'leave' })] : []),
    ], { variant: 'member', heading: member.name, detail: stats, member });
    if (selected === undefined) return;
    if (selected === 'leave') return actions.leave(id);
    const slot = await choose('裝備武學', [0, 1, 2, 3].map(index => option(
      `第 ${index + 1} 欄 · ${catalog.magics[member.equippedMagics?.[index]]?.name ?? '空'}`, index,
    )));
    if (slot === undefined) return;
    const equippedMagics = [...member.equippedMagics];
    equippedMagics[slot] = selected;
    return actions.update([{ id, equippedMagics }], game.inventory, '已裝備武學');
  }

  if (command !== 'bag') return;
  const id = await choose('背包', [...game.inventory].filter(([id, count]) => count > 0 && catalog.items[id])
    .map(([id, count]) => {
      const { name, type, description } = catalog.items[id];
      return {
        ...option(`${name} × ${count}`, id, { itemId: id }, menu.itemIconUrl?.(id) ?? `/art/item/${id}.png`),
        title: name, detail: itemTypes[type], trailing: `× ${count}`, itemType: type, description,
      };
    }), { variant: 'inventory' });
  if (id === undefined) return;
  const item = catalog.items[id];
  if (item.type === 0) return actions.useQuestItem(id);
  if (item.type === 4) return actions.message('暗器可以在戰鬥中使用。');
  const field = item.type === 2 ? 'practiceItemId' : item.equipType === 0 ? 'weaponId' : 'armorId';
  const candidates = game.party.map(role).filter(member => item.type === 3 || canUseGear(member, item));
  if (!candidates.length) return actions.message('目前沒有合適的隊友可以使用。');
  const recipient = await choose(`使用 ${item.name}`, roleRows(candidates), { variant: 'roster' });
  if (recipient === undefined) return;
  const member = role(recipient);
  const inventory = new Map(game.inventory);
  if (item.type === 3) {
    const patch = { id: recipient };
    for (const [key, limit] of Object.entries(statLimits)) if (item[key]) patch[key] = clamp((member[key] ?? 0) + item[key], limit);
    for (const [current, maximum] of [['hp', 'maxHp'], ['mp', 'maxMp']]) {
      patch[maximum] = clamp(member[maximum] + (item[maximum] ?? 0), 999);
      patch[current] = clamp(member[current] + (item[current] ?? 0), patch[maximum]);
    }
    if (item.mpType === 2) patch.mpType = 2;
    if (item.attackTwice) patch.attackTwice = 1;
    const remaining = inventory.get(id) - 1;
    if (remaining) inventory.set(id, remaining);
    else inventory.delete(id);
    return actions.update([patch], inventory, `${member.name}使用了${item.name}`);
  }
  const patches = game.party.map(role).filter(other => other.id !== recipient && other[field] === id)
    .map(other => ({ id: other.id, [field]: -1 }));
  patches.push({ id: recipient, [field]: id });
  return actions.update(patches, inventory, `${member.name}${item.type === 2 ? '開始修煉' : '已裝備'}${item.name}`);
}
