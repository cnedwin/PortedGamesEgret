// Small reminders at the moment a mechanic becomes relevant. No extra rules or combat pauses.
export function createLessons() {
  const seen = new Set();
  return (event, counterAvailable = true) => {
    if (event.type === 'riposte') seen.add('counter');
    let id, text;
    if (event.type === 'stage' && event.stage === 'yard') {
      id = 'guard'; text = '先看抬手，再举枪格挡。快要中招时举枪，可弹反。';
    } else if ((event.type === 'block' || event.type === 'parry') && counterAvailable) {
      id = 'counter'; text = '接住了！金环亮起时再出枪，使出回马枪。';
    } else if (event.type === 'guardBreak') {
      id = 'stamina'; text = '气力耗尽会破防。松开格挡、拉开距离，让气力恢复。';
    } else if (event.type === 'stage' && event.stage === 'boss') {
      id = 'boss'; text = '留意陆谦的起手。砸地和火焰不可格挡，要闪避离开落点。';
    }
    if (!id || seen.has(id)) return null;
    seen.add(id);
    return text;
  };
}
