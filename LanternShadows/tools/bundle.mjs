// Packs the game for the page: everything src/main.mjs asks for, the engine runtime in vendor/ included, as one
// small file, build/lantern.js; and lists in index.html the files the page should start fetching at once.
//
//   node tools/bundle.mjs
//
// It needs esbuild (set ESBUILD to its module path if it is not installed here). Run it again after any change
// under src/ or vendor/, or to the assets: a test fails until it has been.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)),
  ROOT = path.join(HERE, '..'),
  PAGE = path.join(ROOT, 'index.html');
const read = file => fs.readFileSync(path.join(ROOT, file));

/** The page's import map: what each bare name the code asks for stands for. */
export const importMap = () => JSON.parse(read('index.html').toString().match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;

/** Every file under a folder whose name ends as given, in order. */
function filesUnder(folder, ending) {
  const found = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const file = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith(ending)) found.push(file);
    }
  };
  walk(folder);
  return found;
}

/** A number that changes whenever anything the bundle is made from does. */
export function inputsHash() {
  const hash = createHash('sha256');
  for (const file of [...filesUnder('src', '.mjs'), ...filesUnder('vendor', '.js')]) hash.update(file).update(read(file));
  return hash.update(JSON.stringify(importMap())).digest('hex');
}

/**
 * The manifest, maps and pictures read before Begin is enabled. The list stays validated even when the page
 * does not request these ahead of the native engine entry.
 */
export function startupAssets() {
  const manifest = JSON.parse(read('assets/manifest.json'));
  const files = [...manifest.entries.map(entry => 'assets/' + entry.artifact.path), ...filesUnder('assets/scene', '').filter(file => /\.(png|jpg)$/.test(file)), ...filesUnder('assets/ui', '.png')];
  const bySize = files.map(file => [file, fs.statSync(path.join(ROOT, file)).size]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return ['assets/manifest.json', ...filesUnder('assets/levels', '.tmj'), ...bySize.map(([file]) => file)];
}
/** Native title should paint first: avoid competing with its modulepreload. All startup assets still load before Begin. */
export const preloads = () => [];
/** The generated asset preload block in index.html. */
export const preloadLines = () => preloads().map(file => `  <link rel="preload" as="fetch" crossorigin href="${file}">`).join('\n');
const MARKS = ['  <!-- Asset preload policy: engine entry first. Written by tools/bundle.mjs. -->', '  <!-- End of asset preloads. -->'];
export const preloadBlock = html => html.slice(html.indexOf(MARKS[0]) + MARKS[0].length + 1, html.indexOf(MARKS[1]) - 1);

async function main() {
  const esbuild = await import(process.env.ESBUILD ?? 'esbuild'),
    map = importMap();
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/main.mjs')],
    outfile: path.join(ROOT, 'build/lantern.js'),
    bundle: true,
    format: 'esm',
    target: 'es2022',
    minify: true,
    // Some of the engine's messages name the class they are about.
    keepNames: true,
    legalComments: 'none',
    metafile: true,
    banner: { js: '/*! Lantern Shadows, with the Egret Rebuild runtime (Apache-2.0) and spine-core (Spine Runtimes License Agreement). Sources: src/ and vendor/; notices: vendor/NOTICE, vendor/SOURCE.md. Packed by tools/bundle.mjs. */' },
    plugins: [
      {
        // Bare names are found as the page's import map finds them.
        name: 'import-map',
        setup(build) {
          build.onResolve({ filter: /^[^./]/ }, args => (args.kind === 'entry-point' ? undefined : map[args.path] ? { path: path.join(ROOT, map[args.path]) } : { errors: [{ text: `Nothing is mapped for ${args.path}` }] }));
        }
      }
    ]
  });
  const bytes = fs.statSync(path.join(ROOT, 'build/lantern.js')).size;
  fs.writeFileSync(path.join(ROOT, 'build/lantern.json'), JSON.stringify({ inputs: inputsHash(), esbuild: esbuild.version, modules: Object.keys(result.metafile.inputs).length, bytes }, null, 2) + '\n');
  const html = fs.readFileSync(PAGE, 'utf8'),
    from = html.indexOf(MARKS[0]),
    to = html.indexOf(MARKS[1]);
  if (from < 0 || to < 0) throw Error('index.html has lost the marks around what is fetched at once.');
  fs.writeFileSync(PAGE, html.slice(0, from) + MARKS[0] + '\n' + preloadLines() + '\n' + html.slice(to));
  console.log(`build/lantern.js: ${Object.keys(result.metafile.inputs).length} modules, ${Math.round(bytes / 1024)} KB; ${preloads().length} eager asset preloads`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
