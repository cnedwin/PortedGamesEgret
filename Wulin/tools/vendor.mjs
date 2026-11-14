// Refreshes vendor/ from a built checkout of the engine:
//   node tools/vendor.mjs <path to Egret_rebuild>
// Only the JavaScript files the game can load are copied: everything the
// entries below import, directly or through other files. The source-map
// comment at the end of each file is removed; the code is otherwise unchanged.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const source = path.resolve(process.argv[2] ?? '');
if (!fs.existsSync(path.join(source, 'packages/engine/dist/index.js'))) throw new Error('give the path of a built Egret_rebuild checkout');
const vendor = fileURLToPath(new URL('../vendor/', import.meta.url));
const resolvedVendor = fs.realpathSync(vendor);

/** Bare imports exposed by the game's import map. */
const ENTRIES = {
  '@egret/engine': ['engine', 'index.js'],
  '@egret/engine/world3d': ['engine', 'rendering/world3d/index.js'],
  '@egret/engine/webgl2/world3d': ['engine', 'web/world3d/index.js'],
  '@egret/engine/webgpu/world3d': ['engine', 'web/world3d/webgpu.js'],
  '@egret/engine/web/text-input': ['engine', 'web/textInput.js'],
  '@egret/runtime': ['runtime', 'index.js'],
  '@egret/contracts': ['contracts', 'index.js'],
  '@egret/contracts/resources': ['contracts', 'resources/index.js'],
};

const wanted = new Set();
function follow(pack, file) {
  const key = pack + '/' + file;
  if (wanted.has(key)) return;
  wanted.add(key);
  const text = fs.readFileSync(path.join(source, 'packages', pack, 'dist', file), 'utf8');
  const imports = text.matchAll(/^\s*(?:import|export)\s+(?:[^'";]*?\bfrom\s+)?['"]([^'"\r\n]+)['"]|\bimport\(\s*['"]([^'"\r\n]+)['"]\s*\)/gm);
  for (const [, staticImport, dynamicImport] of imports) {
    const spec = staticImport ?? dynamicImport;
    if (spec.startsWith('.')) follow(pack, path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)));
    else if (Object.hasOwn(ENTRIES, spec)) follow(...ENTRIES[spec]);
    else throw new Error(`unmapped import ${spec} in ${key}`);
  }
}
for (const entry of Object.values(ENTRIES)) follow(...entry);

const commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
// Remove obsolete JavaScript only within the three distribution directories.
for (const pack of new Set(Object.values(ENTRIES).map(([name]) => name))) {
  const dist = path.join(vendor, pack, 'dist');
  if (!fs.existsSync(dist)) continue;
  if (path.relative(resolvedVendor, fs.realpathSync(dist)) !== path.join(pack, 'dist')) throw new Error(`distribution directory outside ${vendor}`);
  for (const file of fs.readdirSync(dist, { recursive: true, withFileTypes: true })) {
    if (!file.isFile() || !file.name.endsWith('.js')) continue;
    const filePath = path.join(file.parentPath, file.name);
    const relative = path.relative(dist, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`file outside ${dist}`);
    if (!wanted.has(pack + '/' + relative.split(path.sep).join('/'))) fs.unlinkSync(filePath);
  }
}
for (const key of wanted) {
  const [pack, ...rest] = key.split('/');
  const to = path.join(vendor, pack, 'dist', ...rest);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, fs.readFileSync(path.join(source, 'packages', pack, 'dist', ...rest), 'utf8').replace(/\n\/\/# sourceMappingURL=.*\s*$/, '\n'));
}
for (const name of ['LICENSE', 'NOTICE']) if (fs.existsSync(path.join(source, name))) fs.copyFileSync(path.join(source, name), path.join(vendor, name));
console.log(`${wanted.size} files from ${commit}`);
