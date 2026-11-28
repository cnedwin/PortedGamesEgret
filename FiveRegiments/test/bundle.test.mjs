import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { canonicalText } from '../tools/bundle.mjs';

const root = new URL('../', import.meta.url);
const cwd = fileURLToPath(root);
const read = file => readFileSync(new URL(file, root), 'utf8');
const manifest = JSON.parse(read('assets/five-regiments.json'));
const bundle = read('assets/five-regiments.mjs');

test('the hash input is identical for LF and CRLF checkouts', () => {
  const source = 'const bilingual = "帝国竞技场";\n// a source comment\n';
  assert.deepEqual(canonicalText(Buffer.from(source)), canonicalText(Buffer.from(source.replaceAll('\n', '\r\n'))));
  assert.deepEqual(canonicalText(Buffer.from(bundle)), canonicalText(Buffer.from(bundle.replaceAll('\n', '\r\n'))));
});

test('the release has one current ESM bundle from the exact source graph and pinned build tool', () => {
  execFileSync(process.execPath, ['tools/bundle.mjs', '--check'], { cwd, stdio: 'pipe' });
  const html = read('index.html');
  assert.deepEqual([...html.matchAll(/<script type="module" src="([^"]+)"/g)].map(match => match[1]), ['assets/five-regiments.mjs']);
  assert.ok(!html.includes('rel="modulepreload"'));
  assert.deepEqual(JSON.parse(/<script type="importmap">([\s\S]*?)<\/script>/.exec(html)[1]), JSON.parse(read('vendor/importmap.json')));
  assert.ok(manifest.inputs.includes('src/main.mjs') && manifest.inputs.includes('src/view/stage.mjs'));
  assert.ok(manifest.inputs.includes('vendor/engine/dist/web/world3d/WebGL2Renderer3D.js'));
  assert.ok(!manifest.inputs.includes('src/view/sky-worker.mjs'));
  const meta = JSON.parse(read('package.json')), lock = JSON.parse(read('package-lock.json'));
  assert.equal(meta.devDependencies.esbuild, manifest.esbuild);
  assert.equal(lock.packages['node_modules/esbuild'].version, manifest.esbuild);
  // Parse the actual generated ESM; the regular verification does not require installing esbuild.
  execFileSync(process.execPath, ['--experimental-vm-modules', '--input-type=module', '-e',
    "import vm from 'node:vm';import fs from 'node:fs';const m=new vm.SourceTextModule(fs.readFileSync('assets/five-regiments.mjs','utf8'));if((m.moduleRequests??m.dependencySpecifiers).length) throw Error('external static import in browser entry');"
  ], { cwd, stdio: 'pipe' });
});

test('bundled import.meta URLs still lead to the original asset directories and the separate sky worker', () => {
  assert.ok(bundle.includes('../src/main.mjs') && bundle.includes('../src/view/stage.mjs'));
  assert.ok(/import\.meta\.resolve\(["']@egret\/engine\/world3d["']\)/.test(bundle));
  const page = new URL('https://example.invalid/PortedGamesEgret/FiveRegiments/');
  const packed = new URL('assets/five-regiments.mjs', page);
  for (const [original, relative] of [
    ['src/main.mjs', '../assets/characters/hero-mid.glb'],
    ['src/main.mjs', '../assets/motion/hero.bin'],
    ['src/view/stage.mjs', '../../assets/materials/ground_diff.jpg'],
    ['src/view/stage.mjs', './sky-worker.mjs']
  ]) assert.equal(new URL(relative, new URL('../' + original, packed)).href, new URL(relative, new URL(original, page)).href);
  assert.ok(read('src/view/sky-worker.mjs').includes('await import(engine)'));
});
