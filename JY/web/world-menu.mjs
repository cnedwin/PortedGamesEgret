import { createShellWords } from './jyx2/ui/native/words.mjs';
const statLimits = {
  physicalPower: 100, poison: 100, medicine: 100, detoxification: 100, usePoison: 100,
  attack: 100, defence: 100, speed: 100, fist: 100, sword: 100, knife: 100, unusual: 100,
  hiddenWeapon: 100, knowledge: 100, morality: 100, antiPoison: 100, attackWithPoison: 100,
};
const clamp = (value, limit) => Math.min(limit, Math.max(0, value));
const option = (label, value, dataset, icon) => ({ label, value, dataset, icon });
const itemTypes = ['道具', '裝備', '秘籍', '藥品', '暗器'];
const labels = Object.freeze({
  zh: Object.freeze({
  "江湖選單": "江湖選單",
  "查看背包": "查看背包",
  "查看隊伍與武學": "查看隊伍與武學",
  "回看對話": "回看對話",
  "儲存進度": "儲存進度",
  "讀取存檔": "讀取存檔",
  "匯入桌面存檔": "匯入桌面存檔",
  "匯出桌面存檔": "匯出桌面存檔",
  "開始新遊戲": "開始新遊戲",
  "返回主選單": "返回主選單",
  "隊伍": "隊伍",
  "裝備與修煉": "裝備與修煉",
  "請隊友暫時離隊": "請隊友暫時離隊",
  "裝備武學": "裝備武學",
  "已裝備武學": "已裝備武學",
  "背包": "背包",
  "暗器可以在戰鬥中使用。": "暗器可以在戰鬥中使用。",
  "目前沒有合適的隊友可以使用。": "目前沒有合適的隊友可以使用。",
  "道具": "道具",
  "裝備": "裝備",
  "秘籍": "秘籍",
  "藥品": "藥品",
  "暗器": "暗器",
  "無": "無",
  "空": "空",
  "兵器": "兵器",
  "防具": "防具",
  "修煉": "修煉",
  "生命": "生命",
  "內力": "內力",
  "使用": "使用",
  "級": "級",
  "已裝備": "已裝備",
  "開始修煉": "開始修煉",
  "使用了": "使用了"
}),
  en: Object.freeze({
  "江湖選單": "Travel menu",
  "查看背包": "View inventory",
  "查看隊伍與武學": "Party and skills",
  "回看對話": "Dialogue history",
  "儲存進度": "Save progress",
  "讀取存檔": "Load record",
  "匯入桌面存檔": "Import desktop save",
  "匯出桌面存檔": "Export desktop save",
  "開始新遊戲": "New journey",
  "返回主選單": "Return to title",
  "隊伍": "Party",
  "裝備與修煉": "Equipment and training",
  "請隊友暫時離隊": "Dismiss companion",
  "裝備武學": "Equip skill",
  "已裝備武學": "Skill equipped",
  "背包": "Inventory",
  "暗器可以在戰鬥中使用。": "Thrown items can be used during combat.",
  "目前沒有合適的隊友可以使用。": "No eligible party member.",
  "道具": "Quest item",
  "裝備": "Equipment",
  "秘籍": "Manual",
  "藥品": "Medicine",
  "暗器": "Thrown item",
  "無": "None",
  "空": "Empty",
  "兵器": "Weapon",
  "防具": "Armor",
  "修煉": "Training",
  "生命": "HP",
  "內力": "MP",
  "使用": "Use",
  "級": "Lv.",
  "已裝備": "equipped",
  "開始修煉": "began training",
  "使用了": "used"
})
});

export async function showWorldMenu({ menu, signal, game, catalog, actions, bagOnly, canUseGear }) {
  const words = createShellWords({language:game.language,languages:labels});
  const tr = key => words.text(key);
  const en = words.language === 'en';
  const choose = (title, rows, options) => menu.choose(title, rows, signal, 1, options);
  const role = id => ({ ...catalog.roles[id], ...game.roleState.find(entry => entry.id === id) });
  const roleRows = (people, showHealth = false) => people.map(member => {
    const level = en ? `Lv. ${member.level}` : `${member.level} 級`;
    const health = showHealth ? ` · ${tr('生命')} ${member.hp}/${member.maxHp}` : '';
    const portrait = menu.portraitUrl?.(member.headId) ?? `/art/head/${member.headId}.png`;
    return {
      ...option(`${member.name} · ${level}${health}`, member.id, { menuRole: member.id }, portrait),
      title: member.name, detail: `${level}${health}`, headId: member.headId, portrait: true,
    };
  });
  const command = bagOnly ? 'bag' : await choose(tr('江湖選單'), [
    option(tr('查看背包'), 'bag', { worldAction: 'bag' }), option(tr('查看隊伍與武學'), 'party', { worldAction: 'party' }),
    ...(actions.history ? [option(tr('回看對話'), 'history', { worldAction: 'history' })] : []),
    option(tr('儲存進度'), 'save', { worldAction: 'save' }), option(tr('讀取存檔'), 'load', { worldAction: 'load' }),
    option(tr('匯入桌面存檔'), 'import', { worldAction: 'import' }), option(tr('匯出桌面存檔'), 'export', { worldAction: 'export' }),
    option(tr('開始新遊戲'), 'new', { worldAction: 'new' }),
    option(tr('返回主選單'), 'title', { worldAction: 'title' }),
  ], { variant: 'world' });
  if (['save', 'load', 'import', 'export', 'new', 'title', 'history'].includes(command)) return actions[command]();

  if (command === 'party') {
    const id = await choose(tr('隊伍'), roleRows(game.party.map(role), true), { variant: 'roster' });
    if (id === undefined) return;
    const member = role(id);
    const gear = [member.weaponId, member.armorId, member.practiceItemId].map(item => catalog.items[item]?.name ?? tr('無'));
    const stats = `${tr('生命')} ${member.hp}/${member.maxHp} · ${tr('內力')} ${member.mp}/${member.maxMp}`;
    const label = `${member.name} · ${stats}`;
    const selected = await choose(label, [
      {
        ...option(`${tr('兵器')} ${gear[0]} · ${tr('防具')} ${gear[1]} · ${tr('修煉')} ${gear[2]}`, undefined),
        title: tr('裝備與修煉'),
        detail: `${tr('兵器')} ${gear[0]} · ${tr('防具')} ${gear[1]} · ${tr('修煉')} ${gear[2]}`,
      },
      ...(member.learnedMagics ?? []).map(magic => {
        const name = catalog.magics[magic.id]?.name ?? String(magic.id);
        const rank = Math.trunc(magic.level / 100) + 1;
        const level = en ? `Lv. ${rank}` : `${rank} 級`;
        return { ...option(`${name} · ${level}`, magic.id), title: name, trailing: level };
      }),
      ...(catalog.leaveEvents.has(id) ? [option(tr('請隊友暫時離隊'), 'leave', { worldAction: 'leave' })] : []),
    ], { variant: 'member', heading: member.name, detail: stats, member });
    if (selected === undefined) return;
    if (selected === 'leave') return actions.leave(id);
    const slot = await choose(tr('裝備武學'), [0, 1, 2, 3].map(index => option(
      `${en ? `Slot ${index + 1}` : `第 ${index + 1} 欄`} · ${catalog.magics[member.equippedMagics?.[index]]?.name ?? tr('空')}`, index,
    )));
    if (slot === undefined) return;
    const equippedMagics = [...member.equippedMagics];
    equippedMagics[slot] = selected;
    return actions.update([{ id, equippedMagics }], game.inventory, tr('已裝備武學'));
  }

  if (command !== 'bag') return;
  const id = await choose(tr('背包'), [...game.inventory].filter(([id, count]) => count > 0 && catalog.items[id])
    .map(([id, count]) => {
      const { name, type, description } = catalog.items[id];
      return {
        ...option(`${name} × ${count}`, id, { itemId: id }, menu.itemIconUrl?.(id) ?? `/art/item/${id}.png`),
        title: name, detail: itemTypes[type] ? tr(itemTypes[type]) : undefined, trailing: `× ${count}`, itemType: type, description,
      };
    }), { variant: 'inventory' });
  if (id === undefined) return;
  const item = catalog.items[id];
  if (item.type === 0) return actions.useQuestItem(id);
  if (item.type === 4) return actions.message(tr('暗器可以在戰鬥中使用。'));
  const field = item.type === 2 ? 'practiceItemId' : item.equipType === 0 ? 'weaponId' : 'armorId';
  const candidates = game.party.map(role).filter(member => item.type === 3 || canUseGear(member, item));
  if (!candidates.length) return actions.message(tr('目前沒有合適的隊友可以使用。'));
  const recipient = await choose(`${tr('使用')} ${item.name}`, roleRows(candidates), { variant: 'roster' });
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
    return actions.update([patch], inventory, en ? `${member.name} ${tr('使用了')} ${item.name}` : `${member.name}使用了${item.name}`);
  }
  const patches = game.party.map(role).filter(other => other.id !== recipient && other[field] === id)
    .map(other => ({ id: other.id, [field]: -1 }));
  patches.push({ id: recipient, [field]: id });
  return actions.update(patches, inventory, en ? `${member.name} ${tr(item.type === 2 ? '開始修煉' : '已裝備')} ${item.name}` : `${member.name}${item.type === 2 ? '開始修煉' : '已裝備'}${item.name}`);
}
