// A short hold on the drawn contact pose. The actor's travel, action and input
// continue on the combat clock. When that action is interrupted, the new pose wins.
export function createContactAccent() {
  const active = new WeakMap();
  const catchUp = 0.052;

  function hold(actor, duration) {
    const action = actor?.act;
    if (actor?.mounted || (action?.kind !== 'swing' && action?.kind !== 'skill')) return;
    const previous = active.get(actor);
    if (previous?.action === action && previous.time === action.t) return;
    active.set(actor, { action, time: action.t, age: 0, duration });
  }

  function sample(actor, dt) {
    const accent = active.get(actor);
    if (!accent) return null;
    if (actor.mounted || !actor.alive || actor.act !== accent.action || accent.age >= accent.duration + catchUp) {
      active.delete(actor);
      return null;
    }
    const t = Math.max(0, (accent.age - accent.duration) / catchUp);
    const weight = t * t * (3 - 2 * t);
    accent.age += dt;
    return accent.time + (actor.act.t - accent.time) * weight;
  }

  return { hold, sample };
}
