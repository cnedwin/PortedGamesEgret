// The Engine each bound value belongs to. ownership is the only module that writes it; the display
// state reads it here, so it does not import ownership, which imports the display state.
export const engines = new WeakMap();
const readEngine = engines.get.bind(engines);
export function engineOf(value) {
    return readEngine(value);
}
