// The release entry is built from readable game sources and the official vendored engine.
import { build, version } from 'esbuild';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = join(root, 'bundle');
const manifestPath = join(out, 'manifest.json');
const relativePath = path => relative(root, path).replaceAll('\\', '/');
const hash = bytes => createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');
const read = name => {
  if (isAbsolute(name) || name.split(/[\\/]/).includes('..')) throw new Error('Outside game: ' + name);
  return readFileSync(join(root, name));
};
const safeOutput = name => name === basename(name) && /^(?:main|audio-render|chunk-[A-Z0-9]+)\.mjs$/.test(name);
if (version !== '0.28.2') throw new Error('Build requires esbuild 0.28.2');
if (existsSync(out) && (!lstatSync(out).isDirectory() || lstatSync(out).isSymbolicLink())) throw new Error('Invalid bundle directory');
mkdirSync(out, { recursive: true });
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { outputs: {} };
for (const name of readdirSync(out)) {
  if (name !== 'manifest.json' && (!safeOutput(name) || !Object.hasOwn(previous.outputs, name))) {
    throw new Error('Unexpected file in generated bundle: ' + name);
  }
}
const imports = JSON.parse(read('vendor/importmap.json')).imports;
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/main.mjs', 'src/audio-render.mjs'],
  outdir: out,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  splitting: true,
  minify: true,
  outExtension: { '.js': '.mjs' },
  entryNames: '[name]',
  chunkNames: 'chunk-[hash]',
  legalComments: 'inline',
  banner: { js: '// Generated from NezhaSea and vendored Egret sources. See vendor/LICENSE, vendor/NOTICE and third-party licences.' },
  metafile: true,
  write: false,
  plugins: [{
    name: 'vendor-importmap',
    setup(builder) {
      builder.onResolve({ filter: /^(?:@egret\/|#egret-|robust-predicates$)/ }, args => {
        const target = imports[args.path];
        if (!target) return { errors: [{ text: 'Not in vendored import map: ' + args.path }] };
        return { path: join(root, target) };
      });
    }
  }]
});
const entries = result.outputFiles.map(file => [relative(out, file.path), file.contents])
  .sort(([a], [b]) => a.localeCompare(b, 'en'));
for (const [name] of entries) if (!safeOutput(name)) throw new Error('Unexpected generated path: ' + name);
const outputs = Object.fromEntries(entries.map(([name, bytes]) => [name, hash(Buffer.from(bytes))]));
const tracked = [...new Set([
  ...Object.keys(result.metafile.inputs).map(name => relativePath(resolve(root, name))),
  'vendor/importmap.json', 'vendor/SOURCE.md', 'index.html',
  'tools/launch-bundle/build.mjs', 'tools/launch-bundle/package.json', 'tools/launch-bundle/package-lock.json'
])].sort();
const inputs = Object.fromEntries(tracked.map(name => [name, hash(read(name))]));
for (const [name, bytes] of entries) writeFileSync(join(out, name), bytes);
for (const name of Object.keys(previous.outputs)) {
  if (!safeOutput(name)) throw new Error('Unexpected prior bundle file: ' + name);
  if (!(name in outputs) && existsSync(join(out, name))) unlinkSync(join(out, name));
}
const engine = read('vendor/SOURCE.md').toString('utf8').match(/commit `([0-9a-f]{40})`/)?.[1];
if (!engine) throw new Error('Missing engine provenance');
writeFileSync(manifestPath, JSON.stringify({ schema: 1, esbuild: version, engine, inputs, outputs }, null, 2) + '\n');
console.log('Launch bundle: ' + entries.length + ' files, ' + entries.reduce((n, [, bytes]) => n + bytes.length, 0) + ' bytes, engine ' + engine);

