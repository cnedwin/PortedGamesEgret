// Generated launch files must correspond exactly to the readable game and official engine copy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assetUrl } from '../src/asset-url.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>{
  assert.ok(!isAbsolute(name)&&!name.split(/[\\/]/).includes('..'),'Owned game path: '+name);
  return readFileSync(join(root,name),'utf8').replace(/\r\n/g,'\n');
};
const hash=text=>createHash('sha256').update(text).digest('hex');
const manifest=JSON.parse(read('bundle/manifest.json'));
const closure=names=>{
  const seen=new Set();
  function visit(name){
    if(seen.has(name))return;
    assert.ok(manifest.graph[name],'Generated module exists: '+name);
    seen.add(name);
    for(const i of manifest.graph[name].imports)if(i.kind==='import-statement')visit(i.path);
  }
  names.forEach(visit);
  return [...seen].sort();
};
const entryOf=source=>{
  const entries=Object.entries(manifest.graph).filter(([,m])=>m.entryPoint===source);
  assert.equal(entries.length,1,'One ESM entry for '+source);
  return entries[0][0];
};

test('launch bundle matches the exact readable inputs, official engine and generated outputs',()=>{
  assert.equal(manifest.schema,1);
  assert.equal(manifest.esbuild,'0.28.2');
  assert.equal(JSON.parse(read('tools/launch-bundle/package-lock.json')).packages['node_modules/esbuild'].version,manifest.esbuild);
  assert.deepEqual(manifest.buildOptions,{format:'esm',platform:'browser',target:'es2022',splitting:true,minify:true,keepNames:true});
  assert.equal(manifest.engine,read('vendor/SOURCE.md').match(/commit `([0-9a-f]{40})`/)?.[1]);
  assert.equal(manifest.entry,entryOf('src/main.mjs'));
  assert.match(manifest.entry,/^main-[A-Z0-9]+\.mjs$/);
  for(const input of ['src/main.mjs','src/asset-url.mjs','src/view/assets.mjs','src/audio/sound.mjs','src/hud.mjs','src/screens.mjs','vendor/importmap.json','vendor/SOURCE.md','index.html','tools/launch-bundle/build.mjs','tools/launch-bundle/package.json','tools/launch-bundle/package-lock.json'])
    assert.ok(manifest.inputs[input],'Tracked build input '+input);
  for(const [name,digest] of Object.entries(manifest.inputs))assert.equal(hash(read(name)),digest,'Rebuild launch bundle for '+name);
  for(const [name,digest] of Object.entries(manifest.outputs))assert.equal(hash(read('bundle/'+name)),digest,'Generated '+name);
  assert.deepEqual(readdirSync(join(root,'bundle')).sort(),['manifest.json',...Object.keys(manifest.outputs)].sort());
  assert.deepEqual(Object.keys(manifest.graph).sort(),Object.keys(manifest.outputs).sort());
  for(const [name,meta] of Object.entries(manifest.graph))for(const target of meta.imports)
    assert.ok(Object.hasOwn(manifest.outputs,target.path),'Bundled ESM dependency '+name+' → '+target.path);
});

test('HTML preloads the real critical native renderer and text chunks, without the unused optional backends',()=>{
  const core=closure([manifest.entry,entryOf('vendor/engine/dist/web/world3d/WebGL2Renderer3D.js'),
    entryOf('vendor/engine/dist/web/webgl2.js'),entryOf('vendor/engine/dist/web/text.js')]);
  assert.deepEqual([...manifest.startupPreloads].sort(),core);
  const gpu=entryOf('vendor/engine/dist/web/world3d/WebGPURenderer3D.js');
  const optional=closure([gpu]).filter(name=>!core.includes(name));
  assert.deepEqual([...manifest.webgpuPreloads].sort(),optional);
  assert.ok(!core.includes(gpu),'default path does not preload the optional 3D WebGPU renderer');
  assert.ok(!core.includes(entryOf('vendor/engine/dist/web/webgpu.js')),'2D overlay remains WebGL2');
  const html=read('index.html');
  assert.deepEqual([...html.matchAll(/<link rel="modulepreload" href="\.\/bundle\/([^"]+)">/g)].map(m=>m[1]),manifest.startupPreloads);
  assert.match(html,/get\('backend'\) === 'webgpu'/);
  assert.ok(html.includes('for (const file of '+JSON.stringify(manifest.webgpuPreloads)+')'),'Optional WebGPU preloads match manifest');
  assert.ok(html.includes("await import('./bundle/"+manifest.entry+"')"),'HTML points to the content-hashed game entry');
  assert.doesNotMatch(html,/<script[^>]*src="src\/main\.mjs"/);
});

test('asset addresses stay game-local from source and the relocated generated entry',()=>{
  const base=new URL('../',import.meta.url);
  for(const name of ['models/swordsman-low.glb','portraits/seline.webp','music/title.mp3']){
    const expected=new URL('assets/'+name,base);
    assert.equal(assetUrl(name).href,expected.href);
    assert.ok(statSync(fileURLToPath(expected)).size>0);
    assert.equal(new URL('assets/'+name,new URL('../',new URL('bundle/'+manifest.entry,base))).href,expected.href);
  }
  // The only remaining runtime import.meta anchor is the same one-level game-root calculation;
  // no generated module may retain the old nested source-relative model/music address.
  const generated=Object.keys(manifest.outputs).map(name=>read('bundle/'+name)).join('\n');
  assert.doesNotMatch(generated,/\.\.\/\.\.\/assets\/(?:models|music)/);
  assert.match(generated,/import\.meta\.url/);
});
