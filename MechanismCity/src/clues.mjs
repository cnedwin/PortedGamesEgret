export const CLUES = {
  l01: '拉得越远，弹丸越快。试着从高处越过石台。',
  l02: '这把锁认木块。让木块从高处滑进槽里。',
  l03: '别追着石头打。弹丸擦过绳索，重物会落下。',
  l04: '打跷板翘起的一头，让另一头的木块飞起来。',
  l05: '看石头压在哪个箱子上。箱子一碎，石头就能滚下。',
  l06: '从上面进不去。先把弹丸送到下方的弹簧板。',
  l07: '木块压住踏板，闸门才会给下一发留出通道。',
  l08: '两把锁认不同的材料。先看清石头和木块的位置。',
  l09: '雷丸撞击时会引爆，在绳索和箱子附近落下。',
  l10: '先断绳，看看落石能带动哪一头的跷板。',
  l11: '用沉丸把重物撞上弹簧，试试从下方送它上楼。',
  l12: '先让上方的石头落到跷板，再看踏板和闸门。',
};

let solutions;

/** Load the existing solution card on demand. Only an untouched board can use its first shot. */
export async function firstShot(id) {
  solutions ??= fetch(new URL('./levels/solutions.json', import.meta.url))
    .then((response) => {
      if (!response.ok) throw new Error('Could not load reference aims');
      return response.json();
    });
  try {
    return (await solutions)[id]?.shots[0];
  } catch {
    solutions = undefined;
    return undefined;
  }
}
