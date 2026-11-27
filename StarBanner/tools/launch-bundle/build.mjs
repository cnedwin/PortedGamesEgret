// Reproducible browser entry from readable game sources and the official vendored engine.
import { build, version } from 'esbuild';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'), out=join(root,'bundle'), manifestFile=join(out,'manifest.json');
const rel=file=>relative(root,file).replaceAll('\\','/');
const safePath=name=>!isAbsolute(name)&&!name.split(/[\\/]/).includes('..');
const read=name=>{if(!safePath(name))throw Error('Outside game: '+name);return readFileSync(join(root,name));};
const hash=bytes=>createHash('sha256').update(bytes.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
const safeOutput=name=>name===basename(name)&&/^(?:main|chunk)-[A-Z0-9]+\.mjs$/.test(name);
if(version!=='0.28.2')throw Error('Build requires esbuild 0.28.2');
if(existsSync(out)&&(!lstatSync(out).isDirectory()||lstatSync(out).isSymbolicLink()))throw Error('Invalid bundle directory');
mkdirSync(out,{recursive:true});
const previous=existsSync(manifestFile)?JSON.parse(readFileSync(manifestFile,'utf8')):{outputs:{}};
for(const name of readdirSync(out)){
  const item=join(out,name);
  if(!lstatSync(item).isFile()||lstatSync(item).isSymbolicLink()||
    (name!=='manifest.json'&&(!safeOutput(name)||!Object.hasOwn(previous.outputs,name))))
    throw Error('Unexpected generated file: '+name);
}
const imports=JSON.parse(read('vendor/importmap.json')).imports;
const buildOptions={format:'esm',platform:'browser',target:'es2022',splitting:true,minify:true,keepNames:true};
const result=await build({
  absWorkingDir:root,entryPoints:['src/main.mjs'],outdir:out,bundle:true,...buildOptions,
  outExtension:{'.js':'.mjs'},entryNames:'[name]-[hash]',chunkNames:'chunk-[hash]',legalComments:'inline',
  banner:{js:'// Generated from StarBanner and vendored Egret sources. See vendor/LICENSE, vendor/NOTICE and third-party licences.'},
  metafile:true,write:false,
  plugins:[{name:'vendor-importmap',setup(builder){
    builder.onResolve({filter:/^(?:@egret\/|#egret-|robust-predicates$)/},args=>{
      const target=imports[args.path];
      if(!target||!safePath(target))return {errors:[{text:'Not in vendored import map: '+args.path}]};
      return {path:resolve(root,target)};
    });
  }}]
});
const generated=result.outputFiles.map(file=>[relative(out,file.path).replaceAll('\\','/'),file.contents])
  .sort(([a],[b])=>a.localeCompare(b,'en'));
for(const [name] of generated)if(!safeOutput(name))throw Error('Unexpected output: '+name);
const outputs=Object.fromEntries(generated.map(([name,bytes])=>[name,hash(Buffer.from(bytes))]));
const graph=Object.fromEntries(Object.entries(result.metafile.outputs).map(([file,meta])=>{
  const name=relative(out,resolve(root,file)).replaceAll('\\','/');
  const targets=meta.imports.map(i=>{
    if(i.external)throw Error('External ESM identity in '+file+': '+i.path);
    const target=relative(out,resolve(root,i.path)).replaceAll('\\','/');
    if(!safeOutput(target)||!Object.hasOwn(outputs,target))throw Error('Unknown chunk: '+i.path);
    return {path:target,kind:i.kind};
  });
  return [name,{entryPoint:meta.entryPoint??null,imports:targets}];
}));
const entryOf=source=>{
  const entries=Object.entries(graph).filter(([,meta])=>meta.entryPoint===source);
  if(entries.length!==1)throw Error('Expected exactly one bundled entry: '+source);
  return entries[0][0];
};
const entry=entryOf('src/main.mjs');
// The default 3D app and its 2D overlay need WebGL2; text raster is needed even for the loading label.
// Modulepreload fetches their shared chunks before JS evaluation, but it never runs or attaches a renderer.
const critical=new Set(),visit=(set,name)=>{
  if(set.has(name))return;
  set.add(name);
  for(const i of graph[name].imports)if(i.kind==='import-statement')visit(set,i.path);
};
for(const name of [entry,entryOf('vendor/engine/dist/web/world3d/WebGL2Renderer3D.js'),
  entryOf('vendor/engine/dist/web/webgl2.js'),entryOf('vendor/engine/dist/web/text.js')])visit(critical,name);
const startupPreloads=[entry,...[...critical].filter(n=>n!==entry).sort()];
const optional=new Set();
visit(optional,entryOf('vendor/engine/dist/web/world3d/WebGPURenderer3D.js'));
const webgpuPreloads=[...optional].filter(n=>!critical.has(n)).sort();
const preloadMarkup=startupPreloads.map(name=>'  <link rel="modulepreload" href="./bundle/'+name+'">').join('\n')+
  '\n  <script>\n'+
  "    if (new URLSearchParams(location.search).get('backend') === 'webgpu') {\n"+
  '      for (const file of '+JSON.stringify(webgpuPreloads)+') {\n'+
  "        const link = document.createElement('link');\n"+
  "        link.rel = 'modulepreload'; link.href = './bundle/' + file; document.head.append(link);\n"+
  '      }\n    }\n  </script>';
const entryMarkup=[
  '  <script type="module">',
  '    try { await import(\'./bundle/'+entry+'\'); }',
  '    catch (cause) {',
  "      const error = document.querySelector('#fatal');",
  "      if (error.hidden) { error.textContent = '游戏加载失败，请刷新重试。 · Could not load the game; reload to retry.'; error.hidden = false; }",
  '      console.error(cause);',
  '    }',
  '  </script>'
].join('\n');
let html=read('index.html').toString('utf8').replace(/\r\n/g,'\n');
function replaceBlock(name,body){
  const start='  <!-- launch-bundle-'+name+':start -->',end='  <!-- launch-bundle-'+name+':end -->';
  const a=html.indexOf(start),b=html.indexOf(end);
  if(a<0||b<a||html.indexOf(start,a+1)!==-1||html.indexOf(end,b+1)!==-1)throw Error('Missing/duplicate HTML marker: '+name);
  html=html.slice(0,a+start.length)+'\n'+body+'\n'+html.slice(b);
}
replaceBlock('preloads',preloadMarkup);
replaceBlock('entry',entryMarkup);
const engine=read('vendor/SOURCE.md').toString('utf8').match(/commit `([0-9a-f]{40})`/)?.[1];
if(!engine)throw Error('Missing engine provenance');
// Write only the known generated outputs; do not rewrite, copy or modify vendor.
for(const [name,bytes] of generated)writeFileSync(join(out,name),bytes);
writeFileSync(join(root,'index.html'),html);
for(const name of Object.keys(previous.outputs)){
  if(!safeOutput(name))throw Error('Unsafe prior bundle file: '+name);
  if(!(name in outputs)&&existsSync(join(out,name)))unlinkSync(join(out,name));
}
const tracked=[...new Set([...Object.keys(result.metafile.inputs).map(name=>rel(resolve(root,name))),
  'vendor/importmap.json','vendor/SOURCE.md','index.html','tools/launch-bundle/build.mjs','tools/launch-bundle/package.json','tools/launch-bundle/package-lock.json'])].sort();
const inputs=Object.fromEntries(tracked.map(name=>[name,hash(read(name))]));
writeFileSync(manifestFile,JSON.stringify({schema:1,engine,esbuild:version,buildOptions,entry,startupPreloads,webgpuPreloads,inputs,outputs,graph},null,2)+'\n');
console.log(`Launch bundle: ${generated.length} files, ${generated.reduce((n,[,bytes])=>n+bytes.length,0)} bytes; ${startupPreloads.length} default startup preloads; engine ${engine}`);
