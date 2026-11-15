// Lets Node find the engine copy in vendor/ under the same names the page's
// import map uses, so the rules in src/ run unchanged outside a browser.
const VENDOR = new URL('../vendor/', import.meta.url);
const ENTRIES = {
  '@egret/engine': 'engine/dist/index.js',
  '@egret/engine/world3d': 'engine/dist/rendering/world3d/index.js',
  '@egret/runtime': 'runtime/dist/index.js',
  '@egret/contracts': 'contracts/dist/index.js',
  '@egret/contracts/resources': 'contracts/dist/resources/index.js',
};

export function resolve(specifier, context, nextResolve) {
  const entry = ENTRIES[specifier];
  return entry ? { url: new URL(entry, VENDOR).href, shortCircuit: true } : nextResolve(specifier, context);
}
