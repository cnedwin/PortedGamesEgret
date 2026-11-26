// Translate the engine's pointer session into the established tap / drag / preview rules.
// Owning a session until its terminal event prevents an extra finger or a cancelled gesture
// from selecting a tile or swapping twice. All board math and battle state stay with the caller.
export function createBoardInput({cellAt, acceptTarget, locked, selected, select, clear, neighbour, adjacent, preview, swap, unlock, reach}) {
  let owner = null;
  function cancel() {
    if (owner && !owner.consumed) clear();
    owner = null;
  }
  function contact({kind, contact: point, target}) {
    const id = point.session.pointerId;
    const x = point.globalX, y = point.globalY;
    if (kind === 'begin') {
      if (owner || locked() || !acceptTarget(target)) return;
      const cell = cellAt(x, y);
      if (cell < 0) return;
      owner = {id, cell, x, y, consumed: false, previewed: -1};
      const previous = selected();
      if (previous >= 0) {
        owner.consumed = true;
        if (previous === cell) clear();
        else if (adjacent(previous, cell)) swap(previous, cell);
        else select(cell);
      }
      return;
    }
    if (!owner || owner.id !== id) return;
    if (kind === 'cancel') {
      cancel();
      return;
    }
    if (kind === 'end') {
      unlock();
      const current = owner;
      owner = null;
      if (!current.consumed && !locked()) select(current.cell);
      else if (!current.consumed) clear();
      return;
    }
    if (kind !== 'move' || owner.consumed) return;
    if (locked()) {
      owner.consumed = true;
      clear();
      return;
    }
    const dx = x - owner.x, dy = y - owner.y;
    const next = neighbour(owner.cell, dx, dy);
    if (next < 0) return;
    if (Math.abs(dx) < reach && Math.abs(dy) < reach) {
      if (owner.previewed !== next && (dx || dy)) {
        owner.previewed = next;
        clear();
        preview(owner.cell, next);
      }
    } else {
      owner.consumed = true;
      swap(owner.cell, next);
    }
  }
  return {contact,cancel};
}