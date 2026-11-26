// Small reminders at the moment a mechanic becomes relevant. No extra rules or combat pauses.
// The later ones wait for a quiet moment: asked while another reminder is still up (`busy`), they keep
// for the next occasion.
const LATER = {
  dodge: ['lunge', '闪避后立刻出枪，是一记追身长刺。'],
  glideStart: ['sweep', '踏雪时出枪，回身横扫。'],
  drink: ['wine', '酒意十秒：出枪更重，挨打也更疼。'],
  ignite: ['fire', '把人打进火里，他会烧起来。'],
  arrowStuck: ['cover', '草垛、石头和车能挡箭。']
};

export function createLessons({ structured = false } = {}) {
  const seen = new Set();
  return (event, counterAvailable = true, busy = false) => {
    if (event.type === 'riposte') seen.add('counter');
    let id, text, action = null;
    if (event.type === 'stage' && event.stage === 'yard') {
      id = 'guard'; action = 'guard'; text = '看准抬手，快挨打时格挡可弹反。';
    } else if ((event.type === 'block' || event.type === 'parry') && counterAvailable) {
      id = 'counter'; action = 'attack'; text = '金环亮起，出枪接回马枪。';
    } else if (event.type === 'guardBreak') {
      id = 'stamina'; text = '拉开距离，松开格挡恢复气力。';
    } else if (event.type === 'stage' && event.stage === 'boss') {
      id = 'boss'; action = 'dodge'; text = '斜纹不可挡，闪避离开预警范围。';
    } else if (event.type === 'slash' && event.cut === 2 && !event.form) {
      if (busy) return null;
      id = 'charge'; text = '出枪后按住不放，下一枪蓄成重劈。';
    } else if (LATER[event.type]) {
      if (busy) return null;
      [id, text] = LATER[event.type];
    }
    if (!id || seen.has(id)) return null;
    seen.add(id);
    return structured ? { text, action } : text;
  };
}
