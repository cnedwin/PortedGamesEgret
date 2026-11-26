const saveTime = new Intl.DateTimeFormat('zh-TW', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function describeSaveSlot(save, scenes, roles) {
  if (!save?.location) return { location: '空槽', detail: '' };
  const place = save.location.id === 'world' ? '江湖大地圖'
    : scenes.find(scene => scene.id === save.location.id)?.name ?? '原作場景';
  const location = save.flags?.finished ? `已通關 · ${place}` : place;
  const stamp = typeof save.savedAt === 'string' ? Date.parse(save.savedAt) : NaN;
  const party = Array.isArray(save.party) ? save.party.filter(id => Number.isInteger(id) && id >= 0) : [];
  const names = party.map(id => roles?.[id]?.name).filter(Boolean);
  const details = [];
  if (Number.isFinite(stamp)) details.push(`儲存於 ${saveTime.format(stamp)}`);
  if (party.length) {
    details.push(`${party.length} 人隊伍`);
    if (names.length) details.push(names.join('、'));
  }
  return { location, detail: details.join(' · ') };
}
