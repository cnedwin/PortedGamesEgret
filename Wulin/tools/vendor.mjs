// Refreshes vendor/ from a built checkout of the engine:
//   node tools/vendor.mjs <path to Egret_rebuild>
// Only the JavaScript files the game can load are copied: everything the
// entries below import, directly or through other files. The source-map
// comment at the end of each file is removed; the code is otherwise unchanged.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve(process.argv[2] ?? '');
if (!fs.existsSync(path.join(source, 'packages/engine/dist/index.js'))) throw new Error('give the path of a built Egret_rebuild checkout');
const vendor = new URL('../vendor/', import.meta.url).pathname;

/** The entries of the page's import map, by package. */
const ENTRIES = {
  engine: ['index.js', 'rendering/world3d/index.js', 'web/world3d/index.js', 'web/world3d/webgpu.js', 'web/textInput.js'],
  runtime: ['index.js'],
  contracts: ['index.js', 'resources/index.js'],
};
/** How a bare import names a file of another package. */
const BARE = { '@egret/runtime': ['runtime', 'index.js'], '@egret/contracts': ['contracts', 'index.js'], '@egret/contracts/resources': ['contracts', 'resources/index.js'] };

const wanted = new Set();
function follow(pack, file) {
  const key = pack + '/' + file;
  if (wanted.has(key)) return;
  wanted.add(key);
  const text = fs.readFileSync(path.join(source, 'packages', pack, 'dist', file), 'utf8');
  for (const [, , spec] of text.matchAll(/(from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    if (spec.startsWith('.')) follow(pack, path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)));
    else if (BARE[spec]) follow(...BARE[spec]);
  }
}
for (const [pack, files] of Object.entries(ENTRIES)) for (const file of files) follow(pack, file);

for (const pack of Object.keys(ENTRIES)) fs.rmSync(path.join(vendor, pack), { recursive: true, force: true });
for (const key of wanted) {
  const [pack, ...rest] = key.split('/');
  const to = path.join(vendor, pack, 'dist', ...rest);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, fs.readFileSync(path.join(source, 'packages', pack, 'dist', ...rest), 'utf8').replace(/\n\/\/# sourceMappingURL=.*\s*$/, '\n'));
}
for (const name of ['LICENSE', 'NOTICE']) if (fs.existsSync(path.join(source, name))) fs.copyFileSync(path.join(source, name), path.join(vendor, name));
const commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
console.log(`${wanted.size} files from ${commit}`);
