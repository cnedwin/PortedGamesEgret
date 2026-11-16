// Small reminders at the moment a mechanic becomes relevant. No extra rules or combat pauses.
export function createLessons({ structured = false } = {}) {
  const seen = new Set();
  return (event, counterAvailable = true) => {
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
    }
    if (!id || seen.has(id)) return null;
    seen.add(id);
    return structured ? { text, action } : text;
  };
}
