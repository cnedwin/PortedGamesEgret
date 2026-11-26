// The horizontal control has one session owner. The visual displacement and movement are independent:
// the first follows the finger while movement preserves the original 16% dead zone.
export function stickAmount(offset, travel) {
  const position = Math.max(-1, Math.min(1, offset / travel));
  const deadZone = 0.16;
  return Math.sign(position) * Math.max(0, (Math.abs(position) - deadZone) / (1 - deadZone)) || 0;
}

export function createStick() {
  let grip, move = 0, shift = 0;
  const track = (owner, x) => {
    if (!grip || grip.owner !== owner) return;
    const offset = x - grip.center;
    move = stickAmount(offset, grip.travel);
    shift = Math.max(-1, Math.min(1, offset / grip.travel));
  };
  const clear = () => { grip = undefined; move = shift = 0; };
  return {
    get move() { return move; },
    get shift() { return shift; },
    get held() { return !!grip; },
    begin(owner, x, bounds) {
      if (grip || !bounds?.width) return false;
      grip = { owner, center: bounds.x + bounds.width / 2, travel: bounds.width * 0.27 };
      track(owner, x);
      return true;
    },
    track,
    end(owner) { if (grip?.owner === owner) clear(); },
    clear
  };
}
